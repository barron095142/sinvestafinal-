<?php
/** /sitemap.xml and /robots.txt, generated from the admin's Sitemap & Robots page. */
declare(strict_types=1);

$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$isSitemap = $path === '/sitemap.xml';

try {
    require __DIR__ . '/lib/core.php';
    require __DIR__ . '/lib/public.php';
    $body = $isSitemap ? sv_sitemap_xml() : sv_robots_txt();
} catch (Throwable $e) {
    error_log('[sinvesta seo] ' . $e);
    // Safe fallback so crawlers never see an error.
    $site = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'www.sinvesta.com.au');
    $pages = ['/', '/packages.html', '/rebates.html', '/projects.html', '/about.html', '/contact.html'];
    $body = $isSitemap
        ? "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
          . implode("\n", array_map(fn ($p) => "  <url><loc>$site$p</loc></url>", $pages)) . "\n</urlset>\n"
        : "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\n\nSitemap: $site/sitemap.xml\n";
}

header('Content-Type: ' . ($isSitemap ? 'application/xml' : 'text/plain') . '; charset=utf-8');
header('Cache-Control: public, max-age=300');
echo $body;
