<?php
/**
 * Server-side check of every save. The admin validates first (with the same
 * rules, via zod) for friendly field errors; this is the security boundary:
 * shape and types follow the defaults exactly, unknown keys are dropped, and
 * anything that ends up in an attribute, URL or <img> is checked.
 */
declare(strict_types=1);

final class SvValidator
{
    public array $errors = [];

    private function fail(string $path, string $msg): void
    {
        $this->errors[] = ['path' => $path, 'message' => $msg];
    }

    /** Make $input match the shape of $default. */
    public function conform(mixed $default, mixed $input, string $path = ''): mixed
    {
        if (sv_is_assoc($default) && $default !== []) {
            if (!is_array($input) || (array_is_list($input) && $input !== [])) {
                $this->fail($path, 'Invalid value');
                return $default;
            }
            $out = [];
            foreach ($default as $k => $d) {
                $out[$k] = $this->conform($d, array_key_exists($k, $input) ? $input[$k] : $d, $path === '' ? (string) $k : "$path.$k");
            }
            return $out;
        }
        if (is_array($default)) { // list
            if (!is_array($input) || !array_is_list($input)) {
                $this->fail($path, 'Invalid list');
                return $default;
            }
            if (count($input) > 200) {
                $this->fail($path, 'Too many items');
                return $default;
            }
            $template = $default[0] ?? self::listTemplate($path);
            return array_map(fn ($v, $i) => $this->conform($template, $v, "$path.$i"), $input, array_keys($input));
        }
        if (is_bool($default)) {
            if (!is_bool($input)) $this->fail($path, 'Must be on or off');
            return is_bool($input) ? $input : $default;
        }
        if (is_int($default) || is_float($default)) {
            if (!is_int($input) && !is_float($input)) {
                $this->fail($path, 'Must be a number');
                return $default;
            }
            return $input;
        }
        // string
        if (!is_string($input)) {
            $this->fail($path, 'Must be text');
            return $default;
        }
        if (mb_strlen($input) > 20000) $this->fail($path, 'Too long');
        return $input;
    }

    private static function listTemplate(string $path): mixed
    {
        if (str_ends_with($path, 'faq')) return ['q' => '', 'a' => ''];
        if (str_ends_with($path, 'verification')) return ['name' => '', 'content' => ''];
        return '';
    }

    /* ---------- field rules ---------- */
    public function max(string $path, string $v, int $n): void
    {
        if (mb_strlen($v) > $n) $this->fail($path, "At most $n characters");
    }
    public function email(string $path, string $v): void
    {
        if (!filter_var($v, FILTER_VALIDATE_EMAIL)) $this->fail($path, 'Enter a valid email address');
    }
    public function url(string $path, string $v, bool $optional = true, bool $httpsOnly = false): void
    {
        if ($v === '' && $optional) return;
        $ok = filter_var($v, FILTER_VALIDATE_URL) && preg_match($httpsOnly ? '#^https://#i' : '#^https?://#i', $v);
        if (!$ok) $this->fail($path, $httpsOnly ? 'Enter a full https:// address' : 'Enter a full web address');
    }
    public function image(string $path, string $v): void
    {
        if ($v !== '' && !sv_is_safe_image_src($v)) $this->fail($path, 'Pick an image from the media library');
    }
    public function match(string $path, string $v, string $re, string $msg, bool $optional = true): void
    {
        if ($v === '' && $optional) return;
        if (!preg_match($re, $v)) $this->fail($path, $msg);
    }
    public function oneOf(string $path, mixed $v, array $allowed): void
    {
        if (!in_array($v, $allowed, true)) $this->fail($path, 'Invalid choice');
    }
}

/** Returns [cleanData, errors]. */
function sv_validate_section(string $name, mixed $input): array
{
    $v = new SvValidator();
    $d = sv_conform_root($v, $name, $input);

    switch ($name) {
        case 'settings':
            $v->max('businessName', $d['businessName'], 120);
            if (trim($d['businessName']) === '') $v->errors[] = ['path' => 'businessName', 'message' => 'Required'];
            $v->url('siteUrl', $d['siteUrl'], false, true);
            $v->email('email', $d['email']);
            $v->email('notificationEmail', $d['notificationEmail']);
            $v->match('abn', $d['abn'], '/^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/', 'An ABN is 11 digits');
            $v->match('foundingYear', $d['foundingYear'], '/^(19|20)\d{2}$/', 'A year, e.g. 2016');
            $v->match('address.postcode', $d['address']['postcode'], '/^\d{4}$/', '4-digit postcode', false);
            $v->match('branding.themeColor', $d['branding']['themeColor'], '/^#[0-9a-f]{6}$/i', 'A colour like #0B5FA5', false);
            foreach ($d['social'] as $k => $url) $v->url("social.$k", $url);
            $v->image('branding.logo', $d['branding']['logo']);
            $v->image('branding.ogDefaultImage', $d['branding']['ogDefaultImage']);
            foreach ($d['hours'] as $day => $h) {
                $v->match("hours.$day.from", $h['from'], '/^([01]\d|2[0-3]):[0-5]\d$/', 'Use 24-hour HH:MM', false);
                $v->match("hours.$day.to", $h['to'], '/^([01]\d|2[0-3]):[0-5]\d$/', 'Use 24-hour HH:MM', false);
            }
            break;

        case 'seo':
            foreach ($d['pages'] as $id => $p) {
                $b = "pages.$id";
                $v->max("$b.title", $p['title'], 120);
                $v->max("$b.description", $p['description'], 320);
                $v->url("$b.canonical", $p['canonical']);
                $v->image("$b.ogImage", $p['ogImage']);
                $v->oneOf("$b.schema.type", $p['schema']['type'], ['none', 'LocalBusiness', 'Product', 'Service', 'FAQPage', 'custom']);
                $v->image("$b.schema.product.image", $p['schema']['product']['image']);
                foreach ($p['keywords'] as $i => $k) $v->max("$b.keywords.$i", $k, 60);
                $c = trim($p['schema']['custom']);
                if ($c !== '') {
                    json_decode($c);
                    if (json_last_error() !== JSON_ERROR_NONE) $v->errors[] = ['path' => "$b.schema.custom", 'message' => 'Must be valid JSON'];
                }
            }
            break;

        case 'integrations':
            $v->oneOf('analytics.mode', $d['analytics']['mode'], ['off', 'id', 'snippet']);
            $v->match('analytics.measurementId', $d['analytics']['measurementId'], '/^G-[A-Z0-9]{4,16}$/', 'Looks like G-XXXXXXXXXX');
            $v->match('gtmId', $d['gtmId'], '/^GTM-[A-Z0-9]{4,12}$/', 'Looks like GTM-XXXXXXX');
            foreach ($d['verification'] as $i => $t) {
                $v->oneOf("verification.$i.name", $t['name'], ['google-site-verification', 'msvalidate.01', 'facebook-domain-verification', 'p:domain_verify', 'yandex-verification']);
                $v->match("verification.$i.content", $t['content'], '/^[\w.:-]{4,200}$/', 'Invalid verification code', false);
            }
            $v->match('map.embedSrc', $d['map']['embedSrc'], '#^https://(www\.)?google\.[a-z.]+/maps(/embed)?\?[^"<>\s]*$#', 'Paste a Google Maps embed link or <iframe> code');
            $v->match('map.lat', $d['map']['lat'], '/^-?\d{1,2}(\.\d+)?$/', 'Latitude like -33.73');
            $v->match('map.lng', $d['map']['lng'], '/^-?\d{1,3}(\.\d+)?$/', 'Longitude like 151.00');
            if (!is_int($d['map']['zoom']) || $d['map']['zoom'] < 3 || $d['map']['zoom'] > 21) $v->errors[] = ['path' => 'map.zoom', 'message' => 'Zoom 3–21'];
            break;

        case 'indexing':
            foreach ($d['sitemap'] as $id => $e) {
                $v->oneOf("sitemap.$id.changefreq", $e['changefreq'], ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);
                if ($e['priority'] < 0 || $e['priority'] > 1) $v->errors[] = ['path' => "sitemap.$id.priority", 'message' => '0 to 1'];
            }
            foreach ($d['extraUrls'] as $i => $u) $v->url("extraUrls.$i", $u, false, true);
            $v->max('robots.extraRules', $d['robots']['extraRules'], 5000);
            break;

        case 'content':
            $types = sv_defaults()['contentFields'];
            foreach ($d as $key => $val) {
                $t = $types[$key] ?? 'text';
                if ($t === 'price' && (!is_int($val) && !is_float($val) || $val < 0 || $val > 10000000)) $v->errors[] = ['path' => $key, 'message' => 'Enter a price'];
                if ($t === 'image') $v->image($key, (string) $val);
                if (($t === 'text' || $t === 'rich') && is_string($val)) $v->max($key, $val, 5000);
            }
            break;
    }
    return [$d, $v->errors];
}

function sv_conform_root(SvValidator $v, string $name, mixed $input): array
{
    $defaults = sv_defaults()[$name];
    if ($name === 'content') {
        // Flat map: keep only known fields; prices must stay numbers, the rest text.
        $out = $defaults;
        if (is_array($input)) {
            foreach ($input as $k => $val) {
                if (!array_key_exists($k, $defaults)) continue;
                $isPrice = (sv_defaults()['contentFields'][$k] ?? '') === 'price';
                $out[$k] = $isPrice
                    ? ((is_int($val) || is_float($val)) ? $val : $defaults[$k])
                    : (is_string($val) ? $val : $defaults[$k]);
            }
        }
        return $out;
    }
    return $v->conform($defaults, $input);
}
