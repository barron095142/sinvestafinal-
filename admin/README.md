# Sinvesta Admin (`/admin`)

The private control centre for sinvesta.com.au: quote enquiries, page content,
SEO, sitemap/robots, analytics and tracking scripts. It is not linked from
anywhere on the site. Type `/admin` after the domain to reach it.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Netlify Blobs storage.

---

## How it fits together

```
visitor ──► www.sinvesta.com.au  (static HTML, unchanged)
              │
              ├─ edge function netlify/edge-functions/cms.ts
              │     on every page: applies content edits, SEO tags, JSON-LD,
              │     analytics / verification / custom scripts, new contact details
              ├─ edge function seo-files.ts → /sitemap.xml, /robots.txt
              │
              └─ /admin/*  ──proxy──►  this app (its own Netlify site)
                                         ├─ admin UI (login required)
                                         ├─ /admin/api/public/*  site-config, sitemap,
                                         │                       robots, enquiry intake
                                         └─ Netlify Blobs: settings, content, SEO,
                                                           enquiries, uploaded images
```

- **The static HTML stays the source of truth for layout.** Editable spots carry a
  `data-cms="…"` attribute. The CMS only overrides fields you have actually changed;
  everything else is served exactly as written.
- **If the admin is ever down**, the edge function serves the untouched static page and
  a built-in sitemap/robots, so the public site never breaks.
- **Quote forms** post to `/admin/api/public/inquiries`. The enquiry is saved to the
  dashboard and emailed to the address in Global Settings (default
  `PVEnergy.au@gmail.com`). If that fails (e.g. opening the HTML from disk), the form
  falls back to opening the visitor's email app, as before.

---

## Deploy (one-time, about 15 minutes)

### 1. Create the admin site on Netlify

1. Netlify → **Add new site → Import an existing project** → pick this repository.
2. **Base directory:** `admin` (build settings come from `admin/netlify.toml`).
3. Before the first deploy, add **environment variables** (Site configuration →
   Environment variables):

   | Variable | Value |
   |---|---|
   | `ADMIN_EMAIL` | The email you'll sign in with |
   | `ADMIN_PASSWORD_HASH` | Output of `npm run hash-password -- 'your-password'` (use the "Netlify" line) |
   | `AUTH_SECRET` | 48+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `RESEND_API_KEY` | From [resend.com](https://resend.com) to email enquiries (recommended) |
   | `RESEND_FROM` | e.g. `Sinvesta Website <quotes@sinvesta.com.au>` (domain verified in Resend) |

4. Deploy. Note the site's address, e.g. `https://sinvesta-admin.netlify.app`.

### 2. Point the public site at it

In the **repository root** `netlify.toml`, replace both occurrences of
`https://sinvesta-admin.netlify.app` with your admin site's address, then commit.
The public site redeploys, and `https://www.sinvesta.com.au/admin` opens the login screen.

### 3. Tell Google

1. **Integrations & Scripts →** check the Search Console verification tags and GA4 ID
   (both pre-filled from your old admin). Save.
2. **Sitemap & Robots → Submit in Search Console**, then submit `sitemap.xml`.

---

## Security

- **Login:** bcrypt-hashed password (cost 12), constant-time checks, 5 attempts per
  15 min per IP, with a delay on failure.
- **Session:** signed JWT (HS256) in an `HttpOnly; Secure; SameSite=Strict` cookie scoped
  to `/admin`. It lasts 8 hours. Changing `AUTH_SECRET` or `ADMIN_EMAIL` signs everyone out.
- **Every route** is checked twice: `src/proxy.ts` blocks unauthenticated API calls,
  and each page and route handler verifies the session itself.
- **State-changing requests** must come from your own domain (Origin check), on top of
  the SameSite cookie.
- **Validation:** every save is checked on the server (Zod). Headlines allow only
  `<em>`, `<strong>`, `<br>`. Uploads are identified by their bytes (PNG/JPG/WebP/AVIF/GIF;
  SVG refused) and limited to 8 MB.
- **Hidden from search:** `X-Robots-Tag: noindex`, `Disallow: /admin` in robots.txt,
  and no links from the public site.
- **Enquiry intake:** origin-checked, rate-limited, with a honeypot field.
- Custom scripts on the Integrations page run on every public page. Only paste code
  from providers you trust.

To change the password, generate a new hash, update `ADMIN_PASSWORD_HASH` in Netlify
and redeploy.

---

## Local development

```bash
cd admin
npm install
cp .env.example .env.local        # fill in; escape each $ in the hash as \$
npm run dev                       # http://localhost:3001/admin
```

Locally, data is stored in `admin/.data/` (git-ignored). Set
`NEXT_PUBLIC_SITE_ORIGIN=http://127.0.0.1:8899` and run the static site
(`START-WEBSITE.bat` or `python -m http.server 8899`) to see image previews.

To try the edge-function transform against the real pages, run the admin locally,
save some edits, then import `netlify/edge-functions/lib/transform.ts` from Node 24
(it runs TypeScript directly) and feed it `/admin/api/public/site-config`.

---

## Making more of the site editable

1. Add `data-cms="page.section.field"` to the element in the HTML (use
   `data-cms-src` for an `<img>`).
2. Add the field to `CONTENT_GROUPS` in `src/lib/content-schema.ts`.
3. Run `npm run sync-content` to capture the current text as the default.

If you edit hooked text directly in the HTML, run `npm run sync-content` again so
the admin shows the new wording.

---

## Where things live

| Path | What |
|---|---|
| `src/app/login/` | Login screen |
| `src/app/(dashboard)/` | Dashboard, Enquiries, Content, Media, Settings, SEO, Sitemap, Integrations |
| `src/app/api/` | Admin API (`cms/[section]`, `media`, `inquiries`, `auth`) and `public/*` |
| `src/lib/schemas.ts` | Every setting's shape, validation and default |
| `src/lib/content-schema.ts` | Which parts of which pages are editable |
| `src/lib/public-config.ts` | What the edge function receives |
| `src/lib/seo.ts` | JSON-LD, sitemap, robots, SEO checks |
| `../netlify/edge-functions/` | Applies it all to the live pages |
