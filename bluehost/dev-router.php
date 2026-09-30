<?php
// Local preview of the Bluehost build with PHP's built-in server. It applies
// the same rules as root.htaccess:
//   php -S 127.0.0.1:8080 -t dist/bluehost/public_html bluehost/dev-router.php
$root = $_SERVER['DOCUMENT_ROOT'];
$path = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('#^/_sinvesta(/|$)#', $path)) { http_response_code(403); exit('Forbidden'); }
if (preg_match('#^/uploads/.*\.(php\d?|phtml|html?|svg|js)$#i', $path)) { http_response_code(403); exit('Forbidden'); }
if (preg_match('#^/admin/api(/|$)#', $path)) { require "$root/_sinvesta/api.php"; return true; }
if ($path === '/sitemap.xml' || $path === '/robots.txt') { require "$root/_sinvesta/seo.php"; return true; }
if ($path === '/' || preg_match('#^/(index|packages|rebates|projects|about|contact)\.html$#', $path)) {
    require "$root/_sinvesta/render.php";
    return true;
}
$file = $root . $path;
if (is_dir($file)) {
    if (!str_ends_with($path, '/')) { header("Location: $path/", true, 301); return true; }
    if (is_file("$file/index.html")) { header('Content-Type: text/html; charset=utf-8'); readfile("$file/index.html"); return true; }
}
return false; // let the built-in server serve the static file
