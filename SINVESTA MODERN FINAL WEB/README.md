# Sinvesta Group — Website

Static website for **Solar Investment Australia Pty Ltd** (Sinvesta Group), Castle Hill NSW.

No build step, no dependencies, no npm. Every file here is the finished site.

---

## Run it yourself

**Easiest — double-click `START-WEBSITE.bat`.**

It starts a local server and opens the site in your browser automatically.
A black window appears — **leave it open** while you're browsing. Close it (or press
Ctrl+C) to stop. If nothing opens, go to <http://127.0.0.1:8899> yourself.

**Or just double-click `index.html`** — the site is static, so it opens straight in a
browser with no server at all. Everything works; the only quirk is that some browsers
don't let a `file://` page remember your dark/light choice between visits.

**Or from a terminal**, if you prefer:

```bash
python -m http.server 8899
```

Then open <http://127.0.0.1:8899>.

> **Seeing an old version?** Browsers cache the stylesheet hard. Press **Ctrl+Shift+R**
> to force a fresh load after any change.
>
> **"Port already in use"?** Another preview is still running — close its black window
> and try again, or change `8899` to another number in the .bat file.

---

## Publishing

The whole `sinvesta-site` folder is the website. Upload its **contents** to your host's web root.

| Host | How |
|---|---|
| **Bluehost (current)** | Build with the admin: see [`../admin/README.md`](../admin/README.md). Uploading only these files works, but without the admin. |
| **Netlify** | Drag the `sinvesta-site` folder onto <https://app.netlify.com/drop> |
| **Vercel** | `vercel deploy` from this folder, or drag-and-drop in the dashboard |
| **cPanel / shared hosting** | Upload contents to `public_html/` via FTP or File Manager |
| **Cloudflare Pages** | Connect a repo, or upload the folder directly |

`index.html` must sit at the web root so it loads as the home page.

---

## Files

```
sinvesta-site/
├── index.html          Home — hero, stats, packages, savings estimator, batteries,
│                       EV, monitoring, process, gallery, FAQ
├── packages.html       All 6 solar systems, comparison table, what's included
├── batteries.html      Powerwall 3 / Sungrow / SigEnergy, off-grid, EV charging
├── projects.html       Photo gallery of real installs + monitoring proof
├── about.html          Company story, mission, vision, partners, service area
├── contact.html        Quote form, contact details, Google map
└── assets/
    ├── css/styles.css  Complete design system (one file)
    ├── js/main.js      Theme toggle, nav, calculator, form (one file, no libraries)
    └── img/            23 photos, all from your own installs
```

---

## Editing common things

**Phone number** — search for `0415301979` and `0415 301 979` across the `.html` files.

**Email** — search for `phong@sinvesta.com.au`.

**Address** — search for `107 Gilbert Rd`.

**Colours** — top of `assets/css/styles.css`, in the `:root` block (light mode) and the
`[data-theme="dark"]` block. Every colour on the site comes from those two blocks.

**Fonts** — headings in **DM Sans SemiBold (600)**, body in **Switzer Medium (500)**,
figures in IBM Plex Mono. All self-hosted in `assets/fonts/`, all free for commercial
use. Nothing to install — the files ship with the site. See
[`assets/fonts/README.md`](assets/fonts/README.md), which also covers switching to
Universal Sans (the Tesla font) if you ever license it.

**Savings estimator assumptions** — `assets/js/main.js`, section 7. The four numbers are:

```js
var YIELD = 4.1,      // kWh generated per kW of panels per day (Sydney)
    SC_NO_BAT = 0.35, // share of solar used directly, no battery
    SC_BAT = 0.78,    // share used directly, with a battery
    RATE = 0.35,      // grid import, $/kWh
    FIT  = 0.05,      // feed-in tariff, $/kWh
    CO2  = 0.68;      // kg CO2 per kWh of grid power (NSW)
```

If you change these, also update the visible "How this is worked out" note in
`index.html` so the page still matches the maths.

---

## The contact form

Both quote forms (contact page and pop-up) send enquiries to the **admin dashboard**
at `/admin`, which saves them and emails them to the address set in Global Settings.
See [`../admin/README.md`](../admin/README.md).

When the admin can't be reached (for example when you open the HTML straight from
disk or preview it with `START-WEBSITE.bat`), the form falls back to opening the
visitor's email app, addressed to `phong@sinvesta.com.au`, as it always has.

## Editing through the admin

Text marked with `data-cms="…"` in the HTML (hero headlines, package prices and
descriptions, product renders, project photos), plus every page's SEO tags, analytics
and verification codes, can be changed at `/admin` without touching these files.
If you change hooked text here by hand, run `npm run sync-content` in `admin/`.

---

## Before you go live

- [ ] Add real customer reviews — there is no testimonials section yet, deliberately.
      Fake reviews breach Australian Consumer Law, so I left it out rather than invent any.
- [ ] Add your ABN and CEC accreditation number to the footer (both build trust and are
      commonly expected on Australian trade sites).
- [ ] Add business hours if you want them shown.
- [ ] Replace the favicon if you'd like something other than the logo mark.
- [ ] Point `https://www.sinvesta.com.au` at the new host and check the canonical URLs in
      each page's `<head>`.

---

## Notes on your old site

Three things I found on <https://www.sinvesta.com.au> that you'll want fixed either way:

1. **Leftover template text on the homepage.** Under "Affordable Prices" it currently reads
   *"Quality gardening and landscaping services at competitive, fair rates."* — text from
   the theme's demo content. It has been live on your solar site.
2. **Typo in the footer** — "Main Ofice" should be "Main Office".
3. **Inconsistent system size** — the footer lists a **10.45kW** system, the services page
   lists **10.38kW**. I used **10.45kW** throughout, per your brief. Worth settling on one.

None of these were carried across to the new site.

---

## Accuracy

Company facts (founded 2016 by Dr. Phong Vo, three-person team in Top Ryde, 9 years,
2,300+ clients, 2,500+ projects, 30-year panel warranty, 440W Tier 1 modules, Solis
inverter configurations, battery capacities) were taken from your existing site.

Estimated annual generation figures are calculated, not quoted — 4.1 kWh/kW/day for
Sydney. They are labelled as estimates wherever they appear.

## Pricing

Residential prices come from your own pricing cards in `D:\Website\WEB CHÚ PHONG\6.6\`:

| System | Panels | Inverter / storage | Was | Now |
|---|---|---|---|---|
| 6.6kW | 14 × 475W Jinko Tiger NEO | 5kW Fronius Primo | $5,500 | **$4,500** |
| 10.45kW | 22 × 475W | 8kW Sungrow + 20kWh battery | $17,500 | **$15,500** |
| 13.28kW | 28 × 475W | 10kW Sungrow + 25kWh battery | $20,500 | **$18,500** |

The 10.45kW and 13.28kW prices **include storage** — the site says so explicitly on each
card, because quoting a bundle price against a solar-only package would misrepresent it.

Commercial systems (20/30/50kW) show "Request quote". Your cards 5, 6 and 7 are labelled
20kW and 50kW but still contain the 13kW card's content verbatim — same 28 panels, same
Powerwall, same $18,500 — so they look unfinished and I did not use them.

**Two things to check before you publish:**

1. **Substantiate the struck-through prices.** Under Australian Consumer Law a "was/now"
   comparison must reflect a price the goods were actually sold at for a reasonable period.
   If $5,500 isn't a real prior price, switch to "From $4,500" — one line per card in the HTML.
2. **Keep prices current.** They're written into `index.html` and `packages.html`; search for
   `pkg-price` to find all six places.
