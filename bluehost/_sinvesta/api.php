<?php
/**
 * JSON API behind /admin/api/* (Apache rewrites those URLs here).
 * The route comes from the request path, never from the query string.
 */
declare(strict_types=1);

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/mail.php';

final class SvHttp extends Exception
{
    public function __construct(public int $status, string $message, public array $details = [])
    {
        parent::__construct($message);
    }
}

function sv_out(mixed $body, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo sv_json($body);
    exit;
}

function sv_body(): mixed
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 2_000_000) throw new SvHttp(413, 'Request too large');
    return json_decode($raw, true);
}

function sv_require_admin(): string
{
    $email = sv_current_admin();
    if (!$email) throw new SvHttp(401, 'Not signed in');
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !sv_same_origin()) throw new SvHttp(403, 'Cross-origin request blocked');
    return $email;
}

/* ---------------- Enquiries ---------------- */
function sv_inquiry_ids(): array
{
    $files = glob(sv_data_dir() . '/inquiries/*.json') ?: [];
    $ids = array_map(fn ($f) => basename($f, '.json'), $files);
    rsort($ids); // ids start with a time stamp, so this is newest first
    return $ids;
}
function sv_list_inquiries(int $limit = 500): array
{
    return array_values(array_filter(array_map(fn ($id) => sv_read_json("inquiries/$id.json"), array_slice(sv_inquiry_ids(), 0, $limit))));
}
function sv_valid_inquiry_id(string $id): bool
{
    return (bool) preg_match('/^[a-z0-9]{9}-[a-f0-9]{8}$/', $id);
}

/* ---------------- Media ---------------- */
const SV_MAX_UPLOAD = 8 * 1024 * 1024;

function sv_uploads_dir(): string
{
    $d = sv_public_root() . '/uploads';
    if (!is_dir($d)) mkdir($d, 0755, true);
    return $d;
}
/** Trust the bytes, not the name. SVG is refused: it can carry script. */
function sv_sniff_image(string $head): ?array
{
    if (str_starts_with($head, "\x89PNG")) return ['image/png', 'png'];
    if (str_starts_with($head, "\xFF\xD8\xFF")) return ['image/jpeg', 'jpg'];
    if (str_starts_with($head, 'GIF8')) return ['image/gif', 'gif'];
    if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') return ['image/webp', 'webp'];
    if (substr($head, 4, 4) === 'ftyp' && preg_match('/avif|avis/', substr($head, 8, 4))) return ['image/avif', 'avif'];
    return null;
}
function sv_uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
    $b[8] = chr(ord($b[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
function sv_media_list(): array
{
    $items = [];
    foreach (glob(sv_data_dir() . '/media/*.json') ?: [] as $f) {
        $m = json_decode((string) file_get_contents($f), true);
        if ($m) $items[] = $m;
    }
    usort($items, fn ($a, $b) => strcmp($b['uploadedAt'], $a['uploadedAt']));
    return $items;
}

/* ---------------- Router ---------------- */
try {
    $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (!preg_match('#^/admin/api/(.+?)/?$#', $path, $m)) throw new SvHttp(404, 'Not found');
    $route = $m[1];
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // --- auth ---
    if ($route === 'auth/login' && $method === 'POST') {
        if (!sv_same_origin()) throw new SvHttp(403, 'Cross-origin request blocked');
        $ip = sv_client_ip();
        $limit = sv_rate_limit("login:$ip", 5, 15 * 60);
        if (!$limit['ok']) throw new SvHttp(429, 'Too many attempts. Try again in ' . max(1, (int) ceil($limit['retryAfter'] / 60)) . ' min.');
        $b = sv_body();
        $email = is_array($b) && is_string($b['email'] ?? null) ? $b['email'] : '';
        $pass = is_array($b) && is_string($b['password'] ?? null) ? $b['password'] : '';
        if ($email === '' || $pass === '' || strlen($pass) > 200) throw new SvHttp(400, 'Enter your email and password.');
        if (!sv_login($email, $pass)) {
            usleep(random_int(400_000, 800_000));
            throw new SvHttp(401, 'Email or password is incorrect.');
        }
        sv_rate_limit_reset("login:$ip");
        sv_log_activity(sv_admin_email(), 'Signed in');
        sv_out(['ok' => true]);
    }
    if ($route === 'auth/logout' && $method === 'POST') {
        sv_logout();
        sv_out(['ok' => true]);
    }
    if ($route === 'auth/me' && $method === 'GET') {
        $email = sv_require_admin();
        $new = 0;
        foreach (sv_list_inquiries() as $i) if ($i['status'] === 'new') $new++;
        sv_out(['email' => $email, 'newInquiries' => $new, 'emailConfigured' => sv_mail_enabled()]);
    }

    // --- public enquiry intake (quote forms) ---
    if ($route === 'public/inquiries' && $method === 'POST') {
        if (!sv_same_origin()) throw new SvHttp(403, 'Origin not allowed');
        if (!sv_rate_limit('inq:' . sv_client_ip(), 5, 10 * 60)['ok']) throw new SvHttp(429, 'Too many enquiries — please call us instead.');
        $b = sv_body();
        if (!is_array($b)) throw new SvHttp(422, 'Please check the form and try again.');
        $f = fn (string $k, int $max) => is_string($b[$k] ?? null) ? mb_substr(trim($b[$k]), 0, $max) : '';
        if (!empty($b['website'])) sv_out(['ok' => true, 'emailed' => true], 201); // honeypot: pretend it worked
        $inq = [
            'id' => str_pad(base_convert((string) (int) (microtime(true) * 1000), 10, 36), 9, '0', STR_PAD_LEFT) . '-' . bin2hex(random_bytes(4)),
            'createdAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'status' => 'new', 'emailed' => false, 'notes' => '',
            'name' => $f('name', 120), 'phone' => $f('phone', 40), 'email' => $f('email', 160), 'suburb' => $f('suburb', 120),
            'property' => $f('property', 80), 'system' => $f('system', 120), 'bill' => $f('bill', 40), 'message' => $f('message', 3000),
            'source' => ($b['source'] ?? '') === 'promo-popup' ? 'promo-popup' : 'contact-form', 'page' => $f('page', 200),
        ];
        if ($inq['name'] === '' || strlen(preg_replace('/\D/', '', $inq['phone'])) < 8) throw new SvHttp(422, 'Please enter your name and phone number.');
        if ($inq['email'] !== '' && !filter_var($inq['email'], FILTER_VALIDATE_EMAIL)) throw new SvHttp(422, 'Please check your email address.');
        $s = sv_section('settings')['data'];
        $scheme = sv_is_https() ? 'https' : 'http';
        $inq['emailed'] = sv_email_inquiry($inq, $s['notificationEmail'], "$scheme://{$_SERVER['HTTP_HOST']}/admin/inquiries/?id={$inq['id']}");
        sv_write_json("inquiries/{$inq['id']}.json", $inq);
        sv_out(['ok' => true, 'emailed' => $inq['emailed']], 201);
    }

    // Everything below needs a signed-in admin.
    $admin = sv_require_admin();

    if (preg_match('#^cms/([a-z]+)$#', $route, $mm) && in_array($mm[1], SV_SECTIONS, true)) {
        $section = $mm[1];
        if ($method === 'GET') sv_out(sv_section($section));
        if ($method === 'PUT') {
            [$clean, $errors] = sv_validate_section($section, sv_body());
            if ($errors) throw new SvHttp(422, 'Some fields need fixing.', $errors);
            sv_out(['ok' => true, 'updatedAt' => sv_save_section($section, $clean, $admin)]);
        }
    }

    if ($route === 'dashboard' && $method === 'GET') {
        $out = ['inquiries' => sv_list_inquiries(), 'activity' => sv_recent_activity(7), 'emailConfigured' => sv_mail_enabled()];
        foreach (SV_SECTIONS as $s) $out[$s] = ['data' => sv_section($s)['data']];
        sv_out($out);
    }

    if ($route === 'inquiries' && $method === 'GET') {
        sv_out(['items' => sv_list_inquiries(), 'notificationEmail' => sv_section('settings')['data']['notificationEmail'], 'emailConfigured' => sv_mail_enabled()]);
    }
    if (preg_match('#^inquiries/([^/]+)$#', $route, $mm) && $method === 'PATCH') {
        $id = $mm[1];
        $inq = sv_valid_inquiry_id($id) ? sv_read_json("inquiries/$id.json") : null;
        if (!$inq) throw new SvHttp(404, 'Enquiry not found');
        $b = sv_body();
        $statuses = ['new', 'contacted', 'quoted', 'won', 'lost'];
        if (isset($b['status'])) {
            if (!in_array($b['status'], $statuses, true)) throw new SvHttp(422, 'Invalid status');
            if ($b['status'] !== $inq['status']) sv_log_activity($admin, "Marked {$inq['name']}'s enquiry as {$b['status']}");
            $inq['status'] = $b['status'];
        }
        if (isset($b['notes'])) {
            if (!is_string($b['notes']) || mb_strlen($b['notes']) > 5000) throw new SvHttp(422, 'Notes are too long');
            $inq['notes'] = $b['notes'];
        }
        sv_write_json("inquiries/$id.json", $inq);
        sv_out(['item' => $inq]);
    }

    if ($route === 'media' && $method === 'GET') sv_out(['items' => sv_media_list()]);
    if ($route === 'media' && $method === 'POST') {
        $file = $_FILES['file'] ?? null;
        if (!$file || ($file['error'] ?? 1) !== UPLOAD_ERR_OK) {
            $tooBig = in_array($file['error'] ?? 0, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
            throw new SvHttp($tooBig ? 413 : 400, $tooBig ? 'That image is larger than the server allows (8 MB).' : 'No file received.');
        }
        if ($file['size'] > SV_MAX_UPLOAD) throw new SvHttp(413, 'Images must be 8 MB or smaller.');
        $type = sv_sniff_image((string) file_get_contents($file['tmp_name'], false, null, 0, 16));
        if (!$type) throw new SvHttp(415, 'Only PNG, JPG, WebP, AVIF or GIF images can be uploaded.');
        $id = sv_uuid();
        $name = "$id.{$type[1]}";
        if (!move_uploaded_file($file['tmp_name'], sv_uploads_dir() . "/$name")) throw new SvHttp(500, 'Could not save the file.');
        @chmod(sv_uploads_dir() . "/$name", 0644);
        $item = ['id' => $id, 'name' => mb_substr(basename((string) $file['name']), 0, 160), 'contentType' => $type[0], 'size' => (int) $file['size'],
            'uploadedAt' => gmdate('Y-m-d\TH:i:s.v\Z'), 'url' => "/uploads/$name"];
        sv_write_json("media/$id.json", $item);
        sv_log_activity($admin, "Uploaded {$item['name']}");
        sv_out(['item' => $item], 201);
    }
    if (preg_match('#^media/([0-9a-f-]{36})$#', $route, $mm) && $method === 'DELETE') {
        $meta = sv_read_json("media/{$mm[1]}.json");
        if ($meta) {
            @unlink(sv_public_root() . $meta['url']);
            @unlink(sv_path("media/{$mm[1]}.json"));
            sv_log_activity($admin, 'Deleted an image from the media library');
        }
        sv_out(['ok' => true]);
    }

    throw new SvHttp(404, 'Not found');
} catch (SvHttp $e) {
    sv_out(['error' => $e->getMessage()] + ($e->details ? ['details' => $e->details] : []), $e->status);
} catch (Throwable $e) {
    error_log('[sinvesta api] ' . $e);
    sv_out(['error' => 'Something went wrong on the server.'], 500);
}
