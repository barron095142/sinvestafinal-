<?php
/** Emails a new enquiry with the server's own mail (Bluehost sendmail). Never throws. */
declare(strict_types=1);

function sv_mail_enabled(): bool
{
    return function_exists('mail') && (sv_config()['mail_enabled'] ?? true) !== false;
}

function sv_email_inquiry(array $inq, string $to, string $adminUrl): bool
{
    if (!sv_mail_enabled() || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;

    $host = preg_replace('/^www\./', '', strtolower((string) ($_SERVER['HTTP_HOST'] ?? 'localhost')));
    $from = (string) (sv_config()['mail_from'] ?? '') ?: "noreply@$host";
    $oneLine = fn (string $s) => trim(preg_replace('/[\r\n]+/', ' ', $s)); // no header injection

    $rows = [
        'Name' => $inq['name'], 'Phone' => $inq['phone'], 'Email' => $inq['email'], 'Suburb / postcode' => $inq['suburb'],
        'Property' => $inq['property'], 'Interested in' => $inq['system'], 'Quarterly bill' => $inq['bill'],
        'Source' => $inq['source'] === 'promo-popup' ? 'Quote pop-up' : 'Contact form',
    ];
    $table = '';
    foreach ($rows as $k => $v) {
        if ($v === '') continue;
        $table .= '<tr><td style="padding:6px 12px 6px 0;color:#64748B;white-space:nowrap">' . $k . '</td><td style="padding:6px 0;color:#0F172A"><strong>' . sv_h($v) . '</strong></td></tr>';
    }
    $html = '<div style="font-family:system-ui,sans-serif;max-width:560px"><h2 style="color:#0F172A;margin:0 0 12px">New solar enquiry — ' . sv_h($inq['name']) . '</h2>'
        . '<table style="border-collapse:collapse;width:100%">' . $table . '</table>'
        . ($inq['message'] !== '' ? '<p style="white-space:pre-wrap;background:#F1F5F9;padding:12px;border-radius:8px">' . sv_h($inq['message']) . '</p>' : '')
        . '<p><a href="' . sv_h($adminUrl) . '" style="color:#0052FF">Open in the admin dashboard →</a></p></div>';

    $subject = 'Solar enquiry — ' . $oneLine($inq['name']) . ($inq['system'] !== '' ? ' (' . $oneLine($inq['system']) . ')' : '');
    $headers = [
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/html; charset=UTF-8',
        'From' => 'Sinvesta Website <' . $oneLine($from) . '>',
    ];
    if (filter_var($inq['email'], FILTER_VALIDATE_EMAIL)) $headers['Reply-To'] = $oneLine($inq['email']);

    try {
        return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers, '-f' . $oneLine($from));
    } catch (Throwable) {
        return false;
    }
}
