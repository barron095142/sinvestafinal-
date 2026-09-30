# Sinvesta: website + admin on Bluehost

Everything runs on your Bluehost hosting at **www.sinvesta.com.au**:

| URL | What |
|---|---|
| `www.sinvesta.com.au` | The public website (same design, plain HTML) |
| `www.sinvesta.com.au/admin` | The private admin: enquiries, page content, SEO, sitemap, Google tags |

There are no links to `/admin` anywhere on the site. Type it in to reach it.

---

## 1. Build the upload file (on your Mac, ~1 minute)

In VS Code: **Terminal → New Terminal**, then:

```bash
cd ~/Desktop/Sinvesta/sinvestawebsolar/admin
npm install
npm run bluehost -- --email phong@sinvesta.com.au
```

- Use the email you want to sign in with.
- When asked, type the **admin password** you want (at least 12 characters). Nothing
  shows while you type; that's normal.

You get **`dist/sinvesta-bluehost.zip`** (in the `sinvestawebsolar` folder).
Your login is remembered for later builds (in `bluehost/config.local.php`, never
uploaded to GitHub). Next time, just `npm run bluehost`.

## 2. Upload to Bluehost (~5 minutes)

1. Log in to Bluehost → **Websites → Settings → cPanel** (or *Advanced → cPanel*).
2. **MultiPHP Manager** → select sinvesta.com.au → choose **PHP 8.1 or newer** → Apply.
3. **File Manager** → open **public_html**.
   - Top-right **Settings** → tick **Show Hidden Files (dotfiles)** → Save.
   - If there's an old website in here, select everything and **Compress** it to a
     backup zip first, then delete the old files (keep the backup and `cgi-bin`).
4. **Upload** → choose `sinvesta-bluehost.zip` → wait for 100% → back to public_html.
5. Right-click the zip → **Extract** → into `/public_html` → Extract files. Then delete the zip.
6. Check that `public_html` now has `index.html`, `admin/`, `assets/`, `_sinvesta/`,
   `uploads/` and a `.htaccess` file.

## 3. Free HTTPS (SSL)

Bluehost → **Websites → Security → SSL** → make sure the free SSL is **Active** for
sinvesta.com.au. The site forces `https://www.` automatically once it is.

## 4. Enquiry emails

Enquiries are sent from **noreply@sinvesta.com.au** to the address in Global Settings
(default **PVEnergy.au@gmail.com**).

1. cPanel → **Email Accounts** → create `noreply@sinvesta.com.au` (any password; it
   only needs to exist so Gmail trusts the sender).
2. Send a test from the website's contact page. If it lands in Gmail's spam folder,
   mark it **Not spam** once.

Every enquiry is also saved in **/admin → Quote Enquiries**, even if an email fails.

## 5. First sign-in

Open **https://www.sinvesta.com.au/admin**, sign in, then:

1. **Integrations & Scripts:** check the GA4 ID and Google verification tags are yours → Save.
2. **Sitemap & Robots → Submit in Search Console**, and submit `sitemap.xml`.
3. Send yourself a test enquiry from the Contact page.

---

## Updating the website later

Change files on your Mac, then `npm run bluehost` again and repeat step 2
(upload + extract, overwrite files when asked). **Your saved settings, enquiries and
uploaded images are not in the zip and are never overwritten.** They live in
`~/sinvesta-data` and `public_html/uploads` on the server.

## Changing the admin password

`npm run bluehost -- --email phong@sinvesta.com.au` (enter the new password), then
upload just the new `_sinvesta/config.php`, or the whole zip again.

## Backups

cPanel → File Manager → compress **`sinvesta-data`** (next to public_html) and
**`public_html/uploads`**. That's everything the admin has saved.

---

## How it works (for developers)

```
public_html/
├── index.html, packages.html, …   the static site (source of truth for layout)
├── assets/                        CSS, JS, images, fonts
├── admin/                         the admin UI: Next.js 16 static export (React, Tailwind)
├── _sinvesta/                     PHP 8.1+ back end (not directly reachable)
│   ├── api.php                    JSON API for the admin  ← /admin/api/*
│   ├── render.php                 serves pages with admin edits applied ← /, *.html
│   ├── seo.php                    sitemap.xml, robots.txt
│   ├── lib/                       storage, auth, validation, page transform
│   ├── defaults.json              generated from the admin's TypeScript
│   └── config.php                 admin email + bcrypt hash
├── uploads/                       media library images (scripts can't run here)
└── .htaccess                      HTTPS/www, rewrites, security headers, caching
~/sinvesta-data/                   settings, enquiries, sessions, cache (outside public_html)
```

- **Page edits:** editable elements carry `data-cms="…"` in the HTML. `render.php`
  swaps only the values changed in the admin, and caches the result until a setting
  or the file changes. If anything goes wrong it serves the original file, so the
  site never goes down.
- **Security:** bcrypt password; PHP session in an `HttpOnly; Secure; SameSite=Strict`
  cookie on `/admin` with an 8-hour limit. Login is limited to 5 attempts per 15 min.
  Every save is re-validated in PHP. Uploads are checked by their bytes (no SVG, no
  scripts). `/admin` is `noindex` and blocked in robots.txt.
- **Local preview** of a build:
  `php -S 127.0.0.1:8080 -t dist/bluehost/public_html bluehost/dev-router.php`
- **More editable content:** add `data-cms` to the HTML, add the field in
  `src/lib/content-schema.ts`, then run `npm run sync-content`.
