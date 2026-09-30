<?php
// Created by `npm run bluehost` in admin/ (it fills in the password hash).
// To change the password later: run the build again, or replace the hash with
// the output of  php -r "echo password_hash('new-password', PASSWORD_BCRYPT);"
return [
    'admin_email' => 'you@sinvesta.com.au',
    'admin_password_hash' => '',
    // Enquiry emails are sent from this address. Create it in cPanel → Email
    // Accounts so Gmail etc. accept the mail.
    'mail_from' => 'noreply@sinvesta.com.au',
    // Where settings and enquiries are stored. Default: ~/sinvesta-data
    // (next to public_html, not reachable from the web).
    'data_dir' => '',
];
