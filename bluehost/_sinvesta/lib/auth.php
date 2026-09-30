<?php
/**
 * Admin sign-in. PHP session in an HttpOnly, SameSite=Strict cookie scoped to
 * /admin (Secure on HTTPS), stored in the private data folder, 8-hour limit.
 */
declare(strict_types=1);

const SV_SESSION_TTL = 8 * 3600;

function sv_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = sv_data_dir() . '/sessions';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    session_save_path($dir);
    session_name('sv_admin');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) SV_SESSION_TTL);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/admin',
        'secure' => sv_is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function sv_admin_email(): string
{
    return strtolower(trim((string) (sv_config()['admin_email'] ?? '')));
}

/** Signed-in admin's email, or null. */
function sv_current_admin(): ?string
{
    if (!isset($_COOKIE['sv_admin'])) return null; // don't create sessions for anonymous visitors
    sv_session_start();
    $email = $_SESSION['email'] ?? null;
    $at = $_SESSION['login_at'] ?? 0;
    if (!$email || $email !== sv_admin_email() || time() - $at > SV_SESSION_TTL) {
        return null;
    }
    return $email;
}

function sv_login(string $email, string $password): bool
{
    $hash = (string) (sv_config()['admin_password_hash'] ?? '');
    $emailOk = hash_equals(sv_admin_email(), strtolower(trim($email)));
    // Always run a bcrypt check so a wrong email takes as long as a wrong password.
    $passOk = password_verify($password, $emailOk && $hash ? $hash : '$2y$12$yslkL8EsQGGqxvO/f1FvfuD6yYXb3.b5SSmPKe77FqC5JcybzVWGi');
    if (!$emailOk || !$passOk || $hash === '') return false;

    sv_session_start();
    session_regenerate_id(true);
    $_SESSION = ['email' => sv_admin_email(), 'login_at' => time()];
    return true;
}

function sv_logout(): void
{
    if (!isset($_COOKIE['sv_admin'])) return;
    sv_session_start();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Strict']);
    session_destroy();
}

/** State-changing requests must come from our own pages (on top of SameSite=Strict). */
function sv_same_origin(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return false;
    $host = parse_url($origin, PHP_URL_HOST);
    $port = parse_url($origin, PHP_URL_PORT);
    $originHost = $host . ($port ? ":$port" : '');
    return $originHost !== '' && strcasecmp($originHost, (string) ($_SERVER['HTTP_HOST'] ?? '')) === 0;
}
