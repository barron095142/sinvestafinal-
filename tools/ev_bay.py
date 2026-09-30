"""
Builds the SVG for the homepage "EV charging bay" visual (light theme).

    python3 tools/ev_bay.py > /tmp/ev-bay.svg

The scene is modelled in metres (x to the right-rear, y to the left-front,
z up) and projected isometrically, so every face, cable and label anchor lines
up in true 3D. Paste the output over the <svg class="evx-scene"> block in
index.html. Animation hooks are plain class names styled in styles.css
(section 36); the energy lines reuse the battery view's .ef-line / .ef-dots.
"""
import math

S = 40
COS, SIN = math.cos(math.radians(30)), math.sin(math.radians(30))
OX, OY = 282, 166
W, H = 640, 496


def p(x, y, z=0.0):
    return ((x - y) * COS * S + OX, (x + y) * SIN * S - z * S + OY)


def pts(q):
    return " ".join("%.1f,%.1f" % p(*a) for a in q)


def d(q, close=False):
    (x, y), *rest = [p(*a) for a in q]
    return "M%.1f,%.1f " % (x, y) + " ".join("L%.1f,%.1f" % r for r in rest) + (" Z" if close else "")


def bez(a, b, c, e, n=18):
    """3D cubic bezier sampled into points."""
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(tuple((1 - t) ** 3 * a[k] + 3 * (1 - t) ** 2 * t * b[k] + 3 * (1 - t) * t * t * c[k] + t ** 3 * e[k]
                         for k in range(3)))
    return out


def ring(cx, cy, r, z=0.0, n=48):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n), z) for i in range(n)]


o = []
add = o.append


def poly(q, fill, extra=""):
    add('<polygon points="%s" fill="%s"%s/>' % (pts(q), fill, extra))


def box(x0, x1, y0, y1, z0, z1, top, fx, fy, extra=""):
    poly([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], top, extra)
    poly([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], fx, extra)
    poly([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], fy, extra)


# ------------------------------------------------------------------ platform
PX0, PX1, PY0, PY1, T = -0.6, 8.6, -0.9, 6.5, 0.28
add('<g class="evx-platform">')
poly([(PX1, PY0, 0), (PX1, PY1, 0), (PX1, PY1, -T), (PX1, PY0, -T)], "url(#evx-slab-x)")
poly([(PX0, PY1, 0), (PX1, PY1, 0), (PX1, PY1, -T), (PX0, PY1, -T)], "url(#evx-slab-y)")
poly([(PX0, PY0, 0), (PX1, PY0, 0), (PX1, PY1, 0), (PX0, PY1, 0)], "url(#evx-deck)")
grid = []
for gx in range(0, 9):
    grid.append(d([(gx, PY0, 0), (gx, PY1, 0)]))
for gy in range(0, 7):
    grid.append(d([(PX0, gy, 0), (PX1, gy, 0)]))
add('<path class="evx-grid" d="%s"/>' % " ".join(grid))
# lit front edges of the deck
add('<path class="evx-edge" d="%s"/>' % d([(PX0, PY1, 0), (PX1, PY1, 0), (PX1, PY0, 0)]))
add('</g>')

# ------------------------------------------------------------------ bay ring under the car
CAR_X0, CAR_X1, CY0, CY1 = 1.3, 5.9, 3.3, 5.2
ccx, ccy = (CAR_X0 + CAR_X1) / 2, (CY0 + CY1) / 2
add('<path class="evx-ring" d="%s"/>' % d(ring(ccx, ccy, 2.9), close=True))
add('<path class="evx-ring evx-ring--pulse" d="%s"/>' % d(ring(ccx, ccy, 2.9), close=True))
poly([(CAR_X0 - 0.1, CY0 + 0.1, 0), (CAR_X1 + 0.1, CY0 + 0.1, 0), (CAR_X1 + 0.25, CY1 + 0.3, 0), (CAR_X0, CY1 + 0.3, 0)],
     "url(#evx-carglow)")

# ------------------------------------------------------------------ energy sources
# home battery (back-left)
add('<g class="evx-node">')
poly([(0.0, 0.2, 0), (0.95, 0.2, 0), (1.1, 1.25, 0), (0.1, 1.25, 0)], "rgba(15,23,42,.08)")
box(0.1, 0.8, 0.3, 1.05, 0, 1.55, "#FFFFFF", "url(#evx-obs-x)", "url(#evx-obs-y)")
for i in range(4):   # stacked module seams + level LEDs on the front face
    z = 0.3 + i * 0.3
    add('<path d="%s" stroke="rgba(15,23,42,.08)" stroke-width="1"/>' % d([(0.1, 1.05, z), (0.8, 1.05, z)]))
    poly([(0.2, 1.05, z - 0.2), (0.45, 1.05, z - 0.2), (0.45, 1.05, z - 0.14), (0.2, 1.05, z - 0.14)],
         "#2DD4BF", ' class="evx-led" style="--i:%d"' % i)
add('</g>')

# solar array on a stand (back-centre)
add('<g class="evx-node">')
SP = [(2.4, -0.2, 1.75), (5.0, -0.2, 1.75), (5.0, 1.0, 0.95), (2.4, 1.0, 0.95)]
for lx, ly, lz in ((2.6, 0.95, 0.95), (4.8, 0.95, 0.95), (2.6, -0.1, 1.7), (4.8, -0.1, 1.7)):
    add('<path d="%s" stroke="#94A3B8" stroke-width="2.4"/>' % d([(lx, ly, 0), (lx, ly, lz)]))
poly([(2.4, -0.2, 0), (5.0, -0.2, 0), (5.1, 1.1, 0), (2.5, 1.1, 0)], "rgba(15,23,42,.07)")
poly(SP, "url(#evx-panel)", ' stroke="#93C5FD" stroke-width="1"')


def on_panel(u, v):
    a, b, c, e = SP
    top = [a[k] + (b[k] - a[k]) * u for k in range(3)]
    bot = [e[k] + (c[k] - e[k]) * u for k in range(3)]
    return tuple(top[k] + (bot[k] - top[k]) * v for k in range(3))


cells = [d([on_panel(i / 6, 0), on_panel(i / 6, 1)]) for i in range(1, 6)]
cells += [d([on_panel(0, v / 3), on_panel(1, v / 3)]) for v in (1, 2)]
add('<path d="%s" stroke="rgba(160,190,235,.28)" stroke-width=".8"/>' % " ".join(cells))
poly([on_panel(0.05, 0.05), on_panel(0.45, 0.05), on_panel(0.3, 0.95), on_panel(0.05, 0.95)], "url(#evx-sheen)",
     ' class="evx-sheen"')
add('</g>')

# ------------------------------------------------------------------ floor energy lines (under everything else)
floor_bat = [(0.8, 1.2, 0.02), (0.8, 1.8, 0.02), (6.8, 1.8, 0.02), (6.8, 1.62, 0.02)]
floor_sun = [(3.7, 1.0, 0.02), (3.7, 1.8, 0.02)]
add('<path class="evx-conduit" d="%s"/>' % d(floor_bat))
add('<path class="evx-conduit" d="%s"/>' % d(floor_sun))

# ------------------------------------------------------------------ charger pillar (back-right)
CX0, CX1, CYa, CYb, CH = 6.35, 7.25, 1.05, 1.55, 2.15
poly([(CX0 - 0.1, CYa, 0), (CX1 + 0.3, CYa, 0), (CX1 + 0.35, CYb + 0.45, 0), (CX0, CYb + 0.4, 0)], "rgba(15,23,42,.1)")
box(CX0 - 0.12, CX1 + 0.12, CYa - 0.1, CYb + 0.12, 0, 0.12, "#F1F5F9", "#CBD5E1", "#E2E8F0")   # plinth
box(CX0, CX1, CYa, CYb, 0.12, CH, "url(#evx-pillar-top)", "url(#evx-obs-x)", "url(#evx-obs-y)")
# glass visor on the front face
poly([(CX0 + 0.06, CYb + 0.002, 1.25), (CX1 - 0.06, CYb + 0.002, 1.25), (CX1 - 0.06, CYb + 0.002, 1.95),
      (CX0 + 0.06, CYb + 0.002, 1.95)], "url(#evx-screen)", ' stroke="#7DD3FC" stroke-width="1"')
# LED light strip up the front edge
add('<path class="evx-strip" d="%s"/>' % d([(CX1 - 0.02, CYb + 0.01, 0.25), (CX1 - 0.02, CYb + 0.01, CH - 0.1)]))
add('<path class="evx-strip evx-strip--run" d="%s"/>' % d([(CX1 - 0.02, CYb + 0.01, 0.25), (CX1 - 0.02, CYb + 0.01, CH - 0.1)]))
# holster
box(CX0 + 0.18, CX0 + 0.42, CYb, CYb + 0.14, 0.78, 1.0, "#F1F5F9", "#CBD5E1", "#E2E8F0")
# on-screen reading, drawn in the plane of the front face (y = CYb)
sx, sy = p((CX0 + CX1) / 2, CYb, 1.6)
add('<g transform="matrix(%.4f,%.4f,0,1,%.1f,%.1f)">' % (COS, SIN, sx, sy)
    + '<text class="evx-screen-v" x="0" y="0" text-anchor="middle">7.4</text>'
    + '<text class="evx-screen-k" x="0" y="9" text-anchor="middle">kW</text></g>')

# ------------------------------------------------------------------ holographic EV (wireframe)
profile = [(CAR_X0, 0.34), (CAR_X0, 0.74), (CAR_X0 + 0.3, 0.95), (2.45, 1.04), (3.2, 1.52), (4.55, 1.52),
           (5.55, 1.1), (CAR_X1, 0.98), (CAR_X1, 0.36)]
add('<g class="evx-car">')
far = [(x, CY0, z) for x, z in profile]
near = [(x, CY1, z) for x, z in profile]
# wheels on the far side first
WHEELS = (2.15, 5.05)


def wheel(cx, y, r):
    return [(cx + r * math.cos(t), y, 0.37 + r * math.sin(t)) for t in (2 * math.pi * i / 32 for i in range(32))]


for wx in WHEELS:
    add('<path class="evx-wire evx-wire--dim" d="%s"/>' % d(wheel(wx, CY0 + 0.05, 0.37), close=True))
add('<path class="evx-body" d="%s"/>' % d(far, close=True))
# battery pack in the floor: 8 cells that light up in sequence
for i in range(8):
    x0 = 1.95 + i * 0.44
    add('<g class="evx-cell">')
    box(x0, x0 + 0.38, CY0 + 0.3, CY1 - 0.3, 0.22, 0.4, "url(#evx-cell-top)", "url(#evx-cell-x)", "url(#evx-cell-y)")
    add('</g>')
# roof + glass strips and cross members
for i in range(len(profile) - 1):
    (xa, za), (xb, zb) = profile[i], profile[i + 1]
    glass = 3 <= i <= 5
    poly([(xa, CY0, za), (xb, CY0, zb), (xb, CY1, zb), (xa, CY1, za)],
         "url(#evx-glass)" if glass else "rgba(14,165,233,.05)")
    add('<path class="evx-wire evx-wire--dim" d="%s"/>' % d([(xa, CY0, za), (xa, CY1, za)]))
add('<path class="evx-wire evx-wire--dim" d="%s"/>' % d(far, close=True))
add('<path class="evx-body" d="%s"/>' % d(near, close=True))
add('<path class="evx-wire" d="%s"/>' % d(near, close=True))
# side glass outline + belt line + wheel arches on the near side
add('<path class="evx-wire" d="%s"/>' % d([(2.6, CY1, 1.07), (3.25, CY1, 1.46), (4.5, CY1, 1.46), (5.3, CY1, 1.12)], close=True))
add('<path class="evx-wire evx-wire--dim" d="%s"/>' % d([(3.9, CY1, 1.46), (3.9, CY1, 1.1)]))
for wx in WHEELS:
    add('<path class="evx-tyre" d="%s"/>' % d(wheel(wx, CY1 + 0.01, 0.37), close=True))
    add('<path class="evx-wire" d="%s"/>' % d(wheel(wx, CY1 + 0.01, 0.37), close=True))
    add('<path class="evx-wire evx-wire--dim" d="%s"/>' % d(wheel(wx, CY1 + 0.01, 0.22), close=True))
# light bars
add('<path class="evx-head" d="%s"/>' % d([(CAR_X0 + 0.02, CY0 + 0.15, 0.7), (CAR_X0 + 0.02, CY1 - 0.15, 0.7)]))
add('<path class="evx-tail" d="%s"/>' % d([(CAR_X1, CY0 + 0.15, 0.86), (CAR_X1, CY1 - 0.15, 0.86)]))
# scan sheet sweeping nose to tail (animated along the car's x axis in CSS)
add('<polygon class="evx-scan" points="%s"/>' % pts([(CAR_X0, CY0 - 0.1, 0.05), (CAR_X0, CY1 + 0.1, 0.05),
                                                     (CAR_X0, CY1 + 0.1, 1.62), (CAR_X0, CY0 - 0.1, 1.62)]))
add('</g>')

# ------------------------------------------------------------------ charge cable (drawn over the car's far side)
port = (CAR_X1 - 0.35, CY0, 0.88)
cable = bez((CX0 + 0.3, CYb + 0.12, 0.85), (CX0 + 0.1, CYb + 1.0, 0.0), (CAR_X1 + 0.3, CY0 - 0.4, 0.15), port)
add('<path class="evx-cable" d="%s"/>' % d(cable))
add('<circle class="evx-port" cx="%.1f" cy="%.1f" r="6"/>' % p(*port))
into_pack = [port, (CAR_X1 - 0.6, CY0 + 0.6, 0.45), (2.1, CY0 + 0.6, 0.45)]

# ------------------------------------------------------------------ animated energy (reuses the battery view's classes)
paths = {"evx-f-bat": floor_bat, "evx-f-sun": floor_sun, "evx-f-cable": cable, "evx-f-pack": into_pack}
add('<g class="evx-energy">')
for pid, q in paths.items():
    add('<path id="%s" d="%s" fill="none"/>' % (pid, d(q)))
add('<g class="ef-line"><use href="#evx-f-bat"/><use href="#evx-f-sun"/></g>')
add('<g class="ef-line evx-line--hot"><use href="#evx-f-cable"/><use href="#evx-f-pack"/></g>')
add('<g class="ef-dots">')
for pid, dur, begins in (("evx-f-bat", 3.2, (0, 1.6)), ("evx-f-sun", 1.2, (0,)), ("evx-f-cable", 1.4, (0, 0.7)),
                         ("evx-f-pack", 1.6, (0.4, 1.2))):
    for b in begins:
        cls = ' class="evx-dot--hot"' if pid in ("evx-f-cable", "evx-f-pack") else ""
        add('<circle r="4"%s><animateMotion dur="%ss" begin="%ss" repeatCount="indefinite"><mpath href="#%s"/></animateMotion></circle>'
            % (cls, dur, b, pid))
add('</g></g>')

DEFS = """<defs>
  <linearGradient id="evx-deck" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF5FC"/></linearGradient>
  <linearGradient id="evx-slab-x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2E8F0"/><stop offset="1" stop-color="#CBD5E1"/></linearGradient>
  <linearGradient id="evx-slab-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1F5F9"/><stop offset="1" stop-color="#DCE4EE"/></linearGradient>
  <linearGradient id="evx-obs-x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2E8F0"/><stop offset="1" stop-color="#CBD5E1"/></linearGradient>
  <linearGradient id="evx-obs-y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F8FAFC"/><stop offset="1" stop-color="#EEF2F7"/></linearGradient>
  <linearGradient id="evx-pillar-top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1F5F9"/></linearGradient>
  <linearGradient id="evx-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0F9FF"/><stop offset="1" stop-color="#E0F2FE"/></linearGradient>
  <linearGradient id="evx-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4F83C9"/><stop offset=".6" stop-color="#2B5597"/><stop offset="1" stop-color="#1E3F76"/></linearGradient>
  <linearGradient id="evx-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="evx-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BAE6FD" stop-opacity=".55"/><stop offset="1" stop-color="#E0F2FE" stop-opacity=".25"/></linearGradient>
  <linearGradient id="evx-cell-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#86EFAC"/><stop offset="1" stop-color="#22C55E"/></linearGradient>
  <linearGradient id="evx-cell-x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22C55E"/><stop offset="1" stop-color="#15803D"/></linearGradient>
  <linearGradient id="evx-cell-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ADE80"/><stop offset="1" stop-color="#16A34A"/></linearGradient>
  <radialGradient id="evx-carglow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#38BDF8" stop-opacity=".2"/><stop offset="1" stop-color="#38BDF8" stop-opacity="0"/></radialGradient>
  <linearGradient id="evx-scan-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#38BDF8" stop-opacity="0"/><stop offset=".5" stop-color="#38BDF8" stop-opacity=".3"/><stop offset="1" stop-color="#38BDF8" stop-opacity="0"/></linearGradient>
</defs>"""

# the scan sheet travels along +x: one metre = (COS*S, SIN*S) on screen
scan = (CAR_X1 - CAR_X0) * COS * S, (CAR_X1 - CAR_X0) * SIN * S
print('<svg class="evx-scene" viewBox="0 0 %d %d" aria-hidden="true" focusable="false" style="--scan-x:%.1fpx;--scan-y:%.1fpx">'
      % (W, H, *scan))
print(DEFS)
print("\n".join(o))
print("</svg>")

import sys
anchors = {"solar": p(3.7, 0.4, 1.75), "battery": p(0.45, 0.65, 1.55), "charger": p(6.85, 1.3, CH),
           "car": p(3.9, CY1, 1.5)}
for k, (x, y) in anchors.items():
    print("anchor %-8s %.1f,%.1f  (%.1f%%, %.1f%%)" % (k, x, y, x / W * 100, y / H * 100), file=sys.stderr)
