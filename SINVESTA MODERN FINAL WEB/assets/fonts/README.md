# Fonts

All self-hosted from this folder. Nothing to install — the files ship with the site.

| Where | Font | Weight |
|---|---|---|
| Headings (h1–h4) | **DM Sans** | 600 SemiBold |
| Body, nav, labels | **Switzer** | 500 Medium |
| Buttons, strong text | Switzer | 600 Semibold / 700 Bold |
| Numbers (kWh, kW, $) | IBM Plex Mono | 400–600 |

Body text is **16–17px fluid**, not the 9pt from the print guideline. 9pt is roughly
12px, which fails WCAG readability and triggers iOS auto-zoom on form fields. The
typeface and weight follow the guideline; the size is scaled for screen.

## Files here

```
DMSans-Variable.woff2         36 KB   ← headings (one file, whole weight axis)
DMSans-Italic-Variable.woff2  39 KB   ← the "SINVESTA Group" wordmark
Switzer-Medium.woff2          19 KB   ← body
Switzer-Semibold.woff2        19 KB   ← buttons, labels
Switzer-Bold.woff2            19 KB   ← strong emphasis
Switzer-Italic.woff2          15 KB   ← the "Solar Investment Australia" line
Switzer-MediumItalic.woff2    15 KB   ← spare italic weight
Switzer-Regular.woff2         16 KB   ← fallback only, not downloaded in practice
```

**The brand wordmark is set in true italic** to match the SINVESTA logo — bold italic
name over a gold rule, with the company line in italic title case beneath. These are
real italic cuts, not browser-slanted fakes, which is why the italic files are here.

DM Sans is a **variable font** — a single file covers every weight from 100 to 1000,
so there's no separate SemiBold file to fetch. The Switzer files also have `.woff`
twins for older browsers; modern browsers only take the `.woff2`.

Typical first load pulls **~56 KB** of font (DM Sans + Switzer Medium), both preloaded
in each page's `<head>` so headings don't flash unstyled.

## Licences

Both are free for commercial use, and self-hosting is permitted for both.

- **DM Sans** — Colophon Foundry / Google Fonts, [SIL Open Font Licence 1.1](https://fonts.google.com/specimen/DM+Sans)
- **Switzer** — [Indian Type Foundry](https://www.fontshare.com/fonts/switzer), ITF Free Font Licence

No payment, no account, no attribution required on the site itself.

## Why self-hosted

The files sit in this folder rather than loading from Fontshare's CDN, which means:

- No third-party request on every page load — faster, and one less thing to break
- Works offline and on a local preview
- No visitor data sent to a font CDN
- The site can't break if the CDN changes a URL

They're preloaded in each page's `<head>` so headings don't flash unstyled.

## Where the fonts are set

`assets/css/styles.css`:

- **Section 0** — the four `@font-face` blocks (file paths and weights)
- **Section 1** — `--font-display`, `--font-body`, `--font-mono` in `:root`
- **Section 2** — `body { font-weight: 500 }` and `h1–h4 { font-weight: 400 }`

## If you later license Universal Sans (the Tesla font)

Tesla's site uses **Universal Sans Display** — a commercial typeface from
[Newglyph](https://newglyph.com/typefaces/universal-sans/). Switzer was chosen as the
free equivalent. To switch over if you ever buy it:

1. Buy a **Web** licence for *Universal Sans Text Medium* and *Universal Sans Display Regular*.
2. Drop the `.woff2` files in this folder.
3. In `styles.css` section 0, add `@font-face` blocks pointing at them.
4. In section 1, change the two tokens to:
   ```css
   --font-display: "Universal Sans Display", "Switzer", system-ui, sans-serif;
   --font-body:    "Universal Sans Text", "Switzer", system-ui, sans-serif;
   ```

Switzer then becomes the fallback and nothing else needs touching.

## Changing to a different font entirely

Swap the `@font-face` blocks and the two tokens. If you pick a Google font instead,
delete the `@font-face` blocks and add the Google `<link>` back into each page's `<head>` —
but self-hosting is faster, so prefer downloading the files here.
