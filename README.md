# Sinvesta Group website

Website for **Solar Investment Australia Pty Ltd** (Sinvesta Group), hosted on Bluehost
at [www.sinvesta.com.au](https://www.sinvesta.com.au), with a private admin at `/admin`.

| Folder | What |
|---|---|
| `SINVESTA MODERN FINAL WEB/` | The public website: plain HTML, CSS and JavaScript |
| `admin/` | The admin dashboard (Next.js, built as static files) |
| `bluehost/` | PHP back end for the admin, plus the `.htaccess` rules |
| `tools/` | Helper script that draws the EV-charging illustration |

**Deploying:** see [`admin/README.md`](admin/README.md). One command builds
`dist/sinvesta-bluehost.zip`, which you upload and extract in cPanel.
