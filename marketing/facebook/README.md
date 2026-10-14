# Facebook cover & profile picture

Brand assets for the Sinvesta Group Facebook page, built from the website's own logo, fonts, colours and photos (`SINVESTA MODERN FINAL WEB/assets`).

| File | Size | Use |
|---|---|---|
| `export/Sinvesta-FB-cover-a.png` | 1640×624 | Cover — "Golden Hour" (install photo, navy) |
| `export/Sinvesta-FB-cover-c.png` | 1640×624 | Cover — "Clean System" (battery kits, light) |
| `export/*-HD.png` | 3280×1248 | Sharper uploads of the covers |
| `export/Sinvesta-FB-avatar.png` | 1080×1080 | Profile picture (circle-safe) |

Text is kept inside Facebook's mobile crop and clear of the profile-picture overlap.

## Edit & re-render
Change copy/layout in `cover-a.html`, `cover-c.html`, `avatar.html` (shared tokens in `base.css`), then:

```bash
pip install playwright pillow && playwright install chromium
python3 marketing/facebook/render.py
```
