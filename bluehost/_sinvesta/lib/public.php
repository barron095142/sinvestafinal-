<?php
/**
 * Turns saved settings into what the public pages need: SEO head tags,
 * JSON-LD, content overrides, contact-detail swaps, tracking scripts,
 * sitemap.xml and robots.txt. Ported from the admin's TypeScript
 * (src/lib/public-config.ts and seo.ts in the Netlify version).
 */
declare(strict_types=1);

function sv_e164(string $display): string
{
    $d = preg_replace('/\D/', '', $display);
    if (str_starts_with($d, '61')) return '+' . $d;
    if (str_starts_with($d, '0')) return '+61' . substr($d, 1);
    return '+' . $d;
}

function sv_absolute(string $siteUrl, string $src): string
{
    if ($src === '') return '';
    if (preg_match('#^https?://#', $src)) return $src;
    return rtrim($siteUrl, '/') . '/' . ltrim($src, '/');
}

function sv_page_url(string $siteUrl, string $id): string
{
    foreach (sv_defaults()['pages'] as $p) if ($p['id'] === $id) return rtrim($siteUrl, '/') . $p['path'];
    return rtrim($siteUrl, '/') . '/';
}

/** Headline HTML: escape everything, then re-allow <em>, <strong>, <br>, <em class="hl"> and entities. */
function sv_sanitize_rich(string $in): string
{
    $s = sv_h($in);
    $s = preg_replace('/&amp;(#\d+|#x[0-9a-f]+|[a-z]+);/i', '&$1;', $s);
    $s = preg_replace_callback('#&lt;(/?)(em|strong|br)\s*/?&gt;#i', fn ($m) => '<' . $m[1] . strtolower($m[2]) . '>', $s);
    return preg_replace('#&lt;em class=(?:&quot;|&\#039;)hl(?:&quot;|&\#039;)&gt;#i', '<em class="hl">', $s);
}

/* ---------------- Structured data ---------------- */
function sv_local_business_ld(array $s, array $i): array
{
    $days = ['mon' => 'Monday', 'tue' => 'Tuesday', 'wed' => 'Wednesday', 'thu' => 'Thursday', 'fri' => 'Friday', 'sat' => 'Saturday', 'sun' => 'Sunday'];
    $site = rtrim($s['siteUrl'], '/');
    $ld = [
        '@context' => 'https://schema.org',
        '@type' => 'ElectricalContractor',
        '@id' => "$site/#business",
        'name' => $s['businessName'],
    ];
    if ($s['legalName']) $ld['legalName'] = $s['legalName'];
    if ($s['abn']) $ld['taxID'] = preg_replace('/\s/', '', $s['abn']);
    $ld['url'] = "$site/";
    if ($s['branding']['logo']) $ld['logo'] = sv_absolute($site, $s['branding']['logo']);
    if ($s['branding']['ogDefaultImage']) $ld['image'] = sv_absolute($site, $s['branding']['ogDefaultImage']);
    $ld['description'] = 'Solar, battery storage and EV charging installer serving Sydney and NSW' . ($s['foundingYear'] ? ' since ' . $s['foundingYear'] : '') . '.';
    if ($s['foundingYear']) $ld['foundingDate'] = $s['foundingYear'];
    if ($s['founder']) $ld['founder'] = ['@type' => 'Person', 'name' => $s['founder']];
    $ld['telephone'] = sv_e164($s['phoneDisplay']);
    $ld['email'] = $s['email'];
    $ld['address'] = [
        '@type' => 'PostalAddress',
        'streetAddress' => $s['address']['street'],
        'addressLocality' => $s['address']['locality'],
        'addressRegion' => $s['address']['region'],
        'postalCode' => $s['address']['postcode'],
        'addressCountry' => $s['address']['country'],
    ];
    if ($i['map']['lat'] !== '' && $i['map']['lng'] !== '') {
        $ld['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => (float) $i['map']['lat'], 'longitude' => (float) $i['map']['lng']];
    }
    $ld['openingHoursSpecification'] = [];
    foreach ($s['hours'] as $d => $h) {
        if ($h['open']) $ld['openingHoursSpecification'][] = ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => $days[$d], 'opens' => $h['from'], 'closes' => $h['to']];
    }
    $sameAs = array_values(array_filter($s['social']));
    if ($sameAs) $ld['sameAs'] = $sameAs;
    $ld['areaServed'] = ['@type' => 'State', 'name' => 'New South Wales'];
    $ld['priceRange'] = '$$';
    return $ld;
}

function sv_json_ld(string $id, array $p, array $s, array $i): ?array
{
    $sc = $p['schema'];
    $site = rtrim($s['siteUrl'], '/');
    switch ($sc['type']) {
        case 'LocalBusiness':
            return sv_local_business_ld($s, $i);
        case 'Product':
            $pr = $sc['product'];
            $ld = ['@context' => 'https://schema.org', '@type' => 'Product', 'name' => $pr['name'] ?: $p['title'], 'description' => $pr['description'] ?: $p['description']];
            if ($pr['brand']) $ld['brand'] = ['@type' => 'Brand', 'name' => $pr['brand']];
            if ($pr['sku']) $ld['sku'] = $pr['sku'];
            if ($pr['image']) $ld['image'] = sv_absolute($site, $pr['image']);
            if ($pr['price'] > 0) {
                $ld['offers'] = ['@type' => 'Offer', 'price' => number_format((float) $pr['price'], 2, '.', ''), 'priceCurrency' => 'AUD',
                    'availability' => 'https://schema.org/InStock', 'url' => sv_page_url($site, $id), 'seller' => ['@type' => 'Organization', 'name' => $s['businessName']]];
            }
            return $ld;
        case 'Service':
            $sv = $sc['service'];
            $ld = ['@context' => 'https://schema.org', '@type' => 'Service', 'serviceType' => $sv['serviceType'], 'description' => $sv['description'] ?: $p['description'],
                'provider' => ['@type' => 'ElectricalContractor', 'name' => $s['businessName'], 'telephone' => sv_e164($s['phoneDisplay']), '@id' => "$site/#business"]];
            if ($sv['areaServed']) $ld['areaServed'] = ['@type' => 'State', 'name' => $sv['areaServed']];
            $ld['url'] = sv_page_url($site, $id);
            return $ld;
        case 'FAQPage':
            $q = [];
            foreach ($sc['faq'] as $f) if ($f['q'] !== '' && $f['a'] !== '') $q[] = ['@type' => 'Question', 'name' => $f['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a']]];
            return ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $q];
        case 'custom':
            $c = trim($sc['custom']);
            return $c === '' ? null : json_decode($c, true);
        default:
            return null;
    }
}

/* ---------------- Page config (what render.php splices in) ---------------- */
function sv_public_config(): array
{
    $s = sv_section('settings')['data'];
    $content = sv_section('content')['data'];
    $seo = sv_section('seo')['data'];
    $i = sv_section('integrations')['data'];

    $pages = [];
    foreach (sv_defaults()['pages'] as $pg) {
        $ps = $seo['pages'][$pg['id']];
        $ogTitle = $ps['ogTitle'] ?: $ps['title'];
        $ogDesc = $ps['ogDescription'] ?: $ps['description'];
        $ogImage = sv_absolute($s['siteUrl'], $ps['ogImage'] ?: $s['branding']['ogDefaultImage']);
        $robots = ($ps['noindex'] ? 'noindex' : 'index') . ', ' . ($ps['nofollow'] ? 'nofollow' : 'follow');
        $meta = array_filter([
            '<title>' . sv_h($ps['title']) . '</title>',
            '<meta name="description" content="' . sv_h($ps['description']) . '">',
            $ps['keywords'] ? '<meta name="keywords" content="' . sv_h(implode(', ', $ps['keywords'])) . '">' : '',
            '<meta name="robots" content="' . $robots . '">',
            $ps['canonical'] ? '<link rel="canonical" href="' . sv_h($ps['canonical']) . '">' : '',
            '<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="' . sv_h($s['businessName']) . '">',
            '<meta property="og:title" content="' . sv_h($ogTitle) . '">',
            '<meta property="og:description" content="' . sv_h($ogDesc) . '">',
            $ps['canonical'] ? '<meta property="og:url" content="' . sv_h($ps['canonical']) . '">' : '',
            $ogImage ? '<meta property="og:image" content="' . sv_h($ogImage) . '">' : '',
            '<meta property="og:locale" content="en_AU">',
            '<meta name="twitter:card" content="summary_large_image">',
            '<meta name="twitter:title" content="' . sv_h($ogTitle) . '">',
            '<meta name="twitter:description" content="' . sv_h($ogDesc) . '">',
            $ogImage ? '<meta name="twitter:image" content="' . sv_h($ogImage) . '">' : '',
        ]);
        $ld = sv_json_ld($pg['id'], $ps, $s, $i);
        $pages[$pg['id']] = [
            'headHtml' => implode("\n", $meta),
            // "</" inside JSON would end the <script> early
            'jsonLd' => $ld ? '<script type="application/ld+json">' . str_replace('</', '<\/', sv_json($ld)) . '</script>' : null,
        ];
    }

    return ['pages' => $pages, 'overrides' => sv_content_overrides($content), 'replacements' => sv_contact_replacements($s),
        'mapSrc' => sv_map_src($i)] + sv_integration_html($i);
}

function sv_aud(float $n): string
{
    return '$' . number_format(round($n));
}

function sv_content_overrides(array $content): array
{
    $defaults = sv_defaults()['content'];
    $types = sv_defaults()['contentFields'];
    $html = $src = $aria = [];
    $priced = [];
    foreach ($content as $key => $value) {
        $t = $types[$key] ?? null;
        if ($t === null || $value === ($defaults[$key] ?? null)) continue;
        if ($t === 'text') $html[$key] = sv_h((string) $value);
        elseif ($t === 'rich') $html[$key] = sv_sanitize_rich((string) $value);
        elseif ($t === 'image' && is_string($value) && sv_is_safe_image_src($value)) $src[$key] = $value;
        elseif ($t === 'price') $priced[explode('.', $key)[1]] = true;
    }
    // A price change rewrites the whole badge so "Save $X" never goes stale.
    foreach (array_keys($priced) as $id) {
        $now = (float) ($content["pkg.$id.now"] ?? 0);
        $was = (float) ($content["pkg.$id.was"] ?? 0);
        $saving = $was > $now ? $was - $now : 0;
        $html["pkg.$id.now"] = sv_aud($now);
        $html["pkg.$id.was"] = $saving ? sv_aud($was) : '';
        $html["pkg.$id.save"] = $saving ? 'Save ' . sv_aud($saving) : '';
        $aria["pkg.$id.aria"] = sv_aud($now) . ' incl. GST' . ($saving ? ', was ' . sv_aud($was) . ', save ' . sv_aud($saving) : '');
    }
    return ['html' => $html, 'src' => $src, 'aria' => $aria];
}

/** The static HTML hard-codes the original contact details; swap them if they changed. */
function sv_contact_replacements(array $s): array
{
    $d = sv_defaults()['settings'];
    $out = [];
    $add = function (string $from, string $to) use (&$out) {
        if ($from !== $to && $to !== '') $out[] = [$from, $to];
    };
    $loc = fn ($x) => $x['address']['locality'] . ' ' . $x['address']['region'] . ' ' . $x['address']['postcode'];
    $q = fn ($x, $sep) => str_replace(' ', '+', $x['address']['street'] . $sep . $loc($x));
    $enc = fn ($x) => str_replace(['%2B', '%2C'], ['+', ','], rawurlencode($x));

    $add($d['phoneDisplay'], sv_h($s['phoneDisplay']));
    $add(sv_e164($d['phoneDisplay']), sv_e164($s['phoneDisplay']));
    $add('wa.me/' . substr(sv_e164($d['phoneDisplay']), 1), 'wa.me/' . substr(sv_e164($s['phoneDisplay']), 1));
    $add($d['email'], sv_h($s['email']));
    $add($q($d, '+'), $enc($q($s, '+')));
    $add($q($d, ',+'), $enc($q($s, ',+')));
    $add($d['address']['street'], sv_h($s['address']['street']));
    $add($loc($d), sv_h($loc($s)));
    $add('name="theme-color" content="' . $d['branding']['themeColor'] . '"', 'name="theme-color" content="' . $s['branding']['themeColor'] . '"');
    return $out;
}

function sv_map_src(array $i): string
{
    if ($i['map']['embedSrc'] !== '') return $i['map']['embedSrc'];
    if ($i['map']['lat'] !== '' && $i['map']['lng'] !== '') return "https://www.google.com/maps?q={$i['map']['lat']},{$i['map']['lng']}&z={$i['map']['zoom']}&output=embed";
    return '';
}

function sv_integration_html(array $i): array
{
    $head = $bodyStart = [];
    foreach ($i['verification'] as $v) $head[] = '<meta name="' . sv_h($v['name']) . '" content="' . sv_h($v['content']) . '">';
    if ($i['analytics']['mode'] === 'id' && $i['analytics']['measurementId'] !== '') {
        $id = $i['analytics']['measurementId'];
        $head[] = "<script async src=\"https://www.googletagmanager.com/gtag/js?id=$id\"></script>";
        $head[] = "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','$id');</script>";
    } elseif ($i['analytics']['mode'] === 'snippet' && trim($i['analytics']['snippet']) !== '') {
        $head[] = trim($i['analytics']['snippet']);
    }
    if ($i['gtmId'] !== '') {
        $g = $i['gtmId'];
        $head[] = "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','$g');</script>";
        $bodyStart[] = "<noscript><iframe src=\"https://www.googletagmanager.com/ns.html?id=$g\" height=\"0\" width=\"0\" style=\"display:none;visibility:hidden\"></iframe></noscript>";
    }
    if (trim($i['customHead']) !== '') $head[] = trim($i['customHead']);
    if (trim($i['customBodyStart']) !== '') $bodyStart[] = trim($i['customBodyStart']);
    return ['headHtml' => implode("\n", $head), 'bodyStartHtml' => implode("\n", $bodyStart), 'bodyEndHtml' => trim($i['customBodyEnd'])];
}

/* ---------------- sitemap.xml / robots.txt ---------------- */
function sv_sitemap_xml(): string
{
    $s = sv_section('settings')['data'];
    $seo = sv_section('seo');
    $idx = sv_section('indexing')['data'];
    $content = sv_section('content');
    $dates = array_filter([$seo['updatedAt'], $content['updatedAt']]);
    $lastmod = $dates ? substr(max($dates), 0, 10) : gmdate('Y-m-d');
    $x = fn ($v) => htmlspecialchars($v, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $urls = [];
    foreach (sv_defaults()['pages'] as $pg) {
        $e = $idx['sitemap'][$pg['id']];
        $ps = $seo['data']['pages'][$pg['id']];
        if (!$e['include'] || $ps['noindex']) continue;
        $loc = $ps['canonical'] ?: sv_page_url($s['siteUrl'], $pg['id']);
        $urls[] = "  <url>\n    <loc>{$x($loc)}</loc>\n    <lastmod>$lastmod</lastmod>\n    <changefreq>{$e['changefreq']}</changefreq>\n    <priority>" . number_format((float) $e['priority'], 1) . "</priority>\n  </url>";
    }
    foreach ($idx['extraUrls'] as $u) $urls[] = "  <url>\n    <loc>{$x($u)}</loc>\n  </url>";
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" . implode("\n", $urls) . "\n</urlset>\n";
}

function sv_robots_txt(): string
{
    $s = sv_section('settings')['data'];
    $idx = sv_section('indexing')['data'];
    $lines = ['User-agent: *', $idx['robots']['blockAll'] ? 'Disallow: /' : 'Allow: /', 'Disallow: /admin', 'Disallow: /admin/', 'Disallow: /_sinvesta/'];
    if (trim($idx['robots']['extraRules']) !== '') array_push($lines, '', trim($idx['robots']['extraRules']));
    array_push($lines, '', 'Sitemap: ' . rtrim($s['siteUrl'], '/') . '/sitemap.xml');
    return implode("\n", $lines) . "\n";
}

/* ---------------- HTML transform ---------------- */
function sv_page_id_for(string $path): string
{
    $slug = preg_replace('/\.html$/', '', trim($path, '/'));
    return ($slug === '' || $slug === 'index') ? 'home' : $slug;
}

function sv_attr(string $s): string
{
    return str_replace(['&', '"', '<'], ['&amp;', '&quot;', '&lt;'], $s);
}

/** Replace the inner HTML of every element carrying data-cms="$key" (nesting-aware). */
function sv_replace_inner(string $html, string $key, string $inner): string
{
    $re = '/<([a-z0-9]+)\b[^>]*\sdata-cms="' . preg_quote($key, '/') . '"[^>]*>/i';
    $out = '';
    $cursor = 0;
    $offset = 0;
    while (preg_match($re, $html, $m, PREG_OFFSET_CAPTURE, $offset)) {
        $openEnd = $m[0][1] + strlen($m[0][0]);
        $tag = $m[1][0];
        $depth = 1;
        $pos = $openEnd;
        $innerEnd = null;
        while (preg_match('/<(\/?)' . $tag . '\b[^>]*>/i', $html, $t, PREG_OFFSET_CAPTURE, $pos)) {
            $depth += $t[1][0] === '/' ? -1 : 1;
            $pos = $t[0][1] + strlen($t[0][0]);
            if ($depth === 0) {
                $innerEnd = $t[0][1];
                break;
            }
        }
        if ($innerEnd === null) {
            $offset = $openEnd;
            continue;
        }
        $out .= substr($html, $cursor, $openEnd - $cursor) . $inner;
        $cursor = $innerEnd;
        $offset = $innerEnd;
    }
    return $out . substr($html, $cursor);
}

function sv_replace_attr(string $html, string $hook, string $key, string $attr, callable $fn): string
{
    $re = '/<[a-z0-9]+\b[^>]*\s' . $hook . '="' . preg_quote($key, '/') . '"[^>]*>/i';
    return preg_replace_callback($re, fn ($m) => preg_replace_callback(
        '/(\s' . $attr . '=")([^"]*)(")/i',
        fn ($a) => $a[1] . $fn($a[2]) . $a[3],
        $m[0],
        1
    ), $html);
}

function sv_transform(string $html, string $path, array $cfg): string
{
    $page = $cfg['pages'][sv_page_id_for($path)] ?? null;

    // 1. Page content (data-cms hooks)
    foreach ($cfg['overrides']['html'] as $k => $inner) $html = sv_replace_inner($html, $k, $inner);
    foreach ($cfg['overrides']['src'] as $k => $src) $html = sv_replace_attr($html, 'data-cms-src', $k, 'src', fn () => sv_attr($src));
    foreach ($cfg['overrides']['aria'] as $k => $phrase) {
        $html = sv_replace_attr($html, 'data-cms-aria', $k, 'aria-label', fn ($old) => preg_replace_callback(
            '/\$[\d,]+ incl\. GST(, was \$[\d,]+, save \$[\d,]+)?/',
            fn () => sv_attr($phrase),
            $old,
            1
        ));
    }

    // 2. Contact map
    if ($cfg['mapSrc'] !== '') {
        $html = preg_replace_callback('/(<iframe\b[^>]*\ssrc=")https:\/\/www\.google\.[^"]*\/maps[^"]*(")/i', fn ($m) => $m[1] . sv_attr($cfg['mapSrc']) . $m[2], $html, 1);
    }

    // 3. SEO head: drop what the CMS owns, insert the CMS version
    if ($page) {
        $html = preg_replace('/<title>[\s\S]*?<\/title>\s*/i', '', $html, 1);
        $html = preg_replace('/<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/i', '', $html);
        $html = preg_replace('/<link\s+rel="canonical"[^>]*>\s*/i', '', $html);
        if ($page['jsonLd']) $html = preg_replace('/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/i', '', $html);
    }
    $head = implode("\n", array_filter([$page['headHtml'] ?? '', $page['jsonLd'] ?? '', $cfg['headHtml']]));
    if ($head !== '') $html = preg_replace_callback('/<\/head>/i', fn () => "$head\n</head>", $html, 1);

    // 4. Body scripts
    if ($cfg['bodyStartHtml'] !== '') $html = preg_replace_callback('/<body\b[^>]*>/i', fn ($m) => $m[0] . "\n" . $cfg['bodyStartHtml'], $html, 1);
    if ($cfg['bodyEndHtml'] !== '') {
        $at = strripos($html, '</body>');
        if ($at !== false) $html = substr($html, 0, $at) . $cfg['bodyEndHtml'] . "\n" . substr($html, $at);
    }

    // 5. Changed phone / email / address (last, so the SEO text above picks it up too)
    foreach ($cfg['replacements'] as [$from, $to]) $html = str_replace($from, $to, $html);

    return $html;
}
