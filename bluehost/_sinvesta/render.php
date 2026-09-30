<?php
/**
 * Serves the public pages with the admin's edits applied. Apache rewrites
 * /, /index.html, /packages.html … here. The .html files in public_html stay
 * the source of truth for layout; this only swaps what the CMS owns.
 *
 * Results are cached per page until the page file or any setting changes, so
 * most requests are a single file read. If anything fails, the original page
 * is served untouched: the site never goes down because of the CMS.
 */
declare(strict_types=1);

$root = dirname(__DIR__);
$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$slug = preg_replace('/\.html$/', '', trim($path, '/'));
$file = $slug === '' ? 'index' : $slug;
// Only the known pages; anything else is a 404 (never a path from the URL).
$allowed = ['index', 'packages', 'rebates', 'projects', 'about', 'contact'];
if (!in_array($file, $allowed, true) || !is_file("$root/$file.html")) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Not found');
}
$source = "$root/$file.html";

function sv_send(string $html, string $etag): never
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache'); // always revalidate, so edits show up immediately
    header("ETag: \"$etag\"");
    if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '', '" ') === $etag) {
        http_response_code(304);
        exit;
    }
    echo $html;
    exit;
}

try {
    require __DIR__ . '/lib/core.php';
    require __DIR__ . '/lib/public.php';

    $etag = substr(sha1($file . '|' . filemtime($source) . '|' . filesize($source) . '|' . sv_config_version()), 0, 20);
    $cache = sv_path("cache/pages/$file-$etag.html");
    if (is_file($cache)) sv_send((string) file_get_contents($cache), $etag);

    $html = sv_transform((string) file_get_contents($source), "/$file.html", sv_public_config());

    // Keep only the current version of this page in the cache.
    if (!is_dir(dirname($cache))) mkdir(dirname($cache), 0750, true);
    foreach (glob(dirname($cache) . "/$file-*.html") ?: [] as $old) @unlink($old);
    file_put_contents($cache, $html, LOCK_EX);
    sv_send($html, $etag);
} catch (Throwable $e) {
    error_log('[sinvesta render] ' . $e);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    readfile($source);
}
