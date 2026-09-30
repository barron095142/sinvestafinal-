<?php
/**
 * Shared plumbing: config, data directory, JSON storage, section defaults.
 *
 * Layout on Bluehost:
 *   ~/public_html/_sinvesta/      this code (direct web access blocked by .htaccess)
 *   ~/sinvesta-data/              all saved data: settings, enquiries, sessions, cache
 *                                 (outside public_html, so never downloadable)
 *   ~/public_html/uploads/        images uploaded in the admin
 */
declare(strict_types=1);

// The _sinvesta folder. dirname() (not __DIR__.'/..') so parent lookups work.
define('SV_DIR', dirname(__DIR__));
const SV_SECTIONS = ['settings', 'content', 'seo', 'integrations', 'indexing'];

function sv_config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = SV_DIR . '/config.php';
        $cfg = is_file($file) ? (array) require $file : [];
    }
    return $cfg;
}

function sv_public_root(): string
{
    return dirname(SV_DIR); // public_html
}

function sv_data_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;
    $configured = sv_config()['data_dir'] ?? '';
    $candidates = $configured ? [$configured] : [dirname(sv_public_root()) . '/sinvesta-data', SV_DIR . '/data'];
    foreach ($candidates as $c) {
        if ((is_dir($c) || @mkdir($c, 0750, true)) && is_writable($c)) {
            // Fallback inside the web root: make sure Apache never serves it.
            if (str_starts_with(realpath($c) ?: $c, realpath(sv_public_root()) ?: sv_public_root())
                && !is_file($c . '/.htaccess')) {
                @file_put_contents($c . '/.htaccess', "Require all denied\n");
            }
            return $dir = rtrim($c, '/');
        }
    }
    throw new RuntimeException('No writable data directory. Create ~/sinvesta-data or set data_dir in config.php.');
}

function sv_path(string $rel): string
{
    if (!preg_match('#^[a-z0-9/_.-]+$#i', $rel) || str_contains($rel, '..')) {
        throw new InvalidArgumentException('Bad storage key');
    }
    return sv_data_dir() . '/' . $rel;
}

function sv_read_json(string $rel, mixed $fallback = null): mixed
{
    $file = sv_path($rel);
    if (!is_file($file)) return $fallback;
    $raw = file_get_contents($file);
    $val = $raw === false ? null : json_decode($raw, true);
    return $val ?? $fallback;
}

/** Atomic write: temp file + rename, so a reader never sees half a file. */
function sv_write_json(string $rel, mixed $value): void
{
    $file = sv_path($rel);
    if (!is_dir(dirname($file))) mkdir(dirname($file), 0750, true);
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, sv_json($value), LOCK_EX);
    rename($tmp, $file);
}

function sv_json(mixed $value): string
{
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
}

/** Built from the admin's TypeScript at build time: every default + content field types. */
function sv_defaults(): array
{
    static $d = null;
    return $d ??= json_decode((string) file_get_contents(SV_DIR . '/defaults.json'), true, 512, JSON_THROW_ON_ERROR);
}

function sv_is_assoc(mixed $v): bool
{
    return is_array($v) && ($v === [] || !array_is_list($v));
}

/** Stored values win; anything added to the defaults since then is filled in. */
function sv_merge(mixed $defaults, mixed $stored): mixed
{
    if (!sv_is_assoc($defaults) || $defaults === []) return $stored ?? $defaults;
    if (!is_array($stored)) return $defaults;
    $out = $defaults;
    foreach ($stored as $k => $v) {
        $out[$k] = array_key_exists($k, $out) ? sv_merge($out[$k], $v) : $v;
    }
    return $out;
}

function sv_section(string $name): array
{
    $rec = sv_read_json("cms/$name.json");
    return [
        'data' => sv_merge(sv_defaults()[$name], $rec['data'] ?? null),
        'updatedAt' => $rec['updatedAt'] ?? null,
        'updatedBy' => $rec['updatedBy'] ?? null,
    ];
}

function sv_save_section(string $name, array $data, string $by): string
{
    $at = gmdate('Y-m-d\TH:i:s.v\Z');
    sv_write_json("cms/$name.json", ['data' => $data, 'updatedAt' => $at, 'updatedBy' => $by]);
    $labels = ['settings' => 'Global settings', 'content' => 'Page content', 'seo' => 'SEO', 'integrations' => 'Integrations & scripts', 'indexing' => 'Sitemap & robots'];
    sv_log_activity($by, 'Updated ' . $labels[$name]);
    return $at;
}

/** Changes whenever anything that affects the public pages is saved. */
function sv_config_version(): string
{
    $v = '';
    foreach (['settings', 'content', 'seo', 'integrations'] as $s) {
        $f = sv_path("cms/$s.json");
        $v .= is_file($f) ? md5_file($f) : '0'; // content, not mtime: two saves in one second still count
        $v .= '|';
    }
    return substr(sha1($v . filemtime(SV_DIR . '/defaults.json')), 0, 12);
}

/* ---------------- Activity log ---------------- */
function sv_log_activity(string $by, string $action): void
{
    $line = sv_json(['at' => gmdate('Y-m-d\TH:i:s\Z'), 'by' => $by, 'action' => $action]) . "\n";
    $file = sv_path('activity.log');
    if (!is_dir(dirname($file))) mkdir(dirname($file), 0750, true);
    file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
}

function sv_recent_activity(int $limit = 7): array
{
    $file = sv_path('activity.log');
    if (!is_file($file)) return [];
    $lines = array_slice(file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [], -$limit);
    return array_values(array_filter(array_map(fn ($l) => json_decode($l, true), array_reverse($lines))));
}

/* ---------------- Small helpers ---------------- */
function sv_h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function sv_is_safe_image_src(string $src): bool
{
    return (bool) preg_match('#^assets/img/[\w./-]+\.(png|jpe?g|webp|avif|gif)$#i', $src)
        || (bool) preg_match('#^/uploads/[0-9a-f-]{36}\.(png|jpg|webp|avif|gif)$#', $src);
}

function sv_client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function sv_is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

/** Fixed-window limiter stored on disk (works across PHP workers). */
function sv_rate_limit(string $key, int $limit, int $windowSeconds): array
{
    $rel = 'ratelimit/' . sha1($key) . '.json';
    $now = time();
    $e = sv_read_json($rel, ['count' => 0, 'reset' => 0]);
    if ($e['reset'] < $now) $e = ['count' => 0, 'reset' => $now + $windowSeconds];
    $e['count']++;
    sv_write_json($rel, $e);
    return ['ok' => $e['count'] <= $limit, 'retryAfter' => max(0, $e['reset'] - $now)];
}

function sv_rate_limit_reset(string $key): void
{
    @unlink(sv_path('ratelimit/' . sha1($key) . '.json'));
}
