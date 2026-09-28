/* ============================================================
   SINVESTA GROUP — site behaviour
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. THEME ---------- */
  var THEME_KEY = "sinvesta-theme";
  var root = document.documentElement;

  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* private mode */ }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  });
  setTheme(currentTheme());

  // Follow the OS only while the user has not chosen explicitly.
  var stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (!stored) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      root.setAttribute("data-theme", e.matches ? "dark" : "light");
    });
  }

  /* ---------- 2. STICKY HEADER ---------- */
  var header = document.querySelector(".header");
  if (header && !header.classList.contains("header--solid")) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 3. MOBILE DRAWER ---------- */
  var drawer = document.getElementById("drawer");
  var openBtn = document.querySelector("[data-drawer-open]");
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var first = drawer.querySelector("button, a");
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  if (openBtn) openBtn.addEventListener("click", openDrawer);
  document.querySelectorAll("[data-drawer-close]").forEach(function (el) {
    el.addEventListener("click", closeDrawer);
  });
  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeDrawer);
    });
    // Keep focus inside the drawer while it is open.
    drawer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      var items = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) closeDrawer();
  });

  /* ---------- 4. REVEAL ON SCROLL ---------- */
  var revealables = document.querySelectorAll(".reveal");
  if (revealables.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

      revealables.forEach(function (el, i) {
        // Stagger siblings by up to 5 steps so grids cascade rather than pop.
        if (!el.style.getPropertyValue("--d")) {
          el.style.setProperty("--d", (i % 5) * 70 + "ms");
        }
        io.observe(el);
      });
    }
  }

  /* ---------- 5. COUNT-UP STATS ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) { el.textContent = formatCount(el); });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          cio.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  function formatCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    return (el.getAttribute("data-prefix") || "") +
      target.toLocaleString("en-AU") +
      (el.getAttribute("data-suffix") || "");
  }

  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1500, start = performance.now();

    function frame(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      var val = Math.round(target * eased);
      el.textContent = prefix + val.toLocaleString("en-AU") + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + target.toLocaleString("en-AU") + suffix;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 6. RANGE SLIDER FILL ---------- */
  function paintRange(input) {
    var min = parseFloat(input.min) || 0;
    var max = parseFloat(input.max) || 100;
    var pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--pct", pct + "%");
  }
  document.querySelectorAll('input[type="range"]').forEach(function (input) {
    paintRange(input);
    input.addEventListener("input", function () { paintRange(input); });
  });

  /* ---------- 7. SAVINGS ESTIMATOR ----------
     Sizing follows the coefficients in our written proposals (OpenSolar):
       · Usage = bill ÷ 33c/kWh (effective rate incl. supply on a typical proposal)
       · Array sized to generate 87% of annual usage ("consumption offset")
       · Sydney yield 4.1 kWh per kW of panels per day, shaped by month
       · Battery ≈ 0.558 × average daily generation, in 9 kWh usable modules
         (Sigen BAT 10.0). This reproduces the 18 / 27 / 36 kWh packages.
       · 83% of generation used on site; exports earn 5c/kWh
     The monthly shapes are the generation and consumption profiles from a
     proposal's System Performance chart, normalised to an average of 1.
  ------------------------------------------------------------ */
  var se = document.getElementById("se");
  if (se) {
    var M = {
      rate: 0.33, fit: 0.05, offset: 0.87, yieldKwDay: 4.1, selfUse: 0.83,
      batPerDailyGen: 0.558, moduleKwh: 9, panelW: 475, m2PerPanel: 2.14,
      minPanels: 14, maxPanels: 211,   // 6.6 kW starter up to the 100 kW commercial tier
      co2: 0.68,
      // Recommended system by quarterly bill. Bills under $600 use the entry tier
      // (the brief left $400–$599 unassigned). Battery = modules × 9 kWh.
      tiers: [
        { upTo: 599.99,   label: "6.6", panels: 14, modules: 2, note: "Matches entry-level residential energy needs." },
        { upTo: 800,      label: "10",  panels: 21, modules: 3, note: "Ideal mid-size balance for typical family home usage." },
        { upTo: 1000,     label: "13",  panels: 28, modules: 4, note: "High-capacity setup for heavy energy consumers." },
        { upTo: 1500,     label: "15",  panels: 32, modules: 5, note: "Premium large-scale residential or light commercial setup." },
        // Over $1,500 a quarter: no standard package; the card asks them to talk to us.
        // panels/modules only keep the chart's model running; nothing sized is shown.
        { upTo: Infinity, custom: true, panels: 32, modules: 5 }
      ],
      afterMaxFactor: 0.10,            // chart: after-solar line is 0–10% of before
      barFactor: [0.80, 0.92],         // chart: solar bars are 80–92% of before
      days: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      genShape: [214, 198, 159, 139, 98.8, 98.7, 103, 132, 174, 205, 210, 216],
      useShape: [198, 197, 165, 155, 180, 228, 215, 195, 152, 175, 183, 193]
    };
    var norm = function (a) {
      var avg = a.reduce(function (s, v) { return s + v; }, 0) / a.length;
      return a.map(function (v) { return v / avg; });
    };
    M.genShape = norm(M.genShape);
    M.useShape = norm(M.useShape);
    var PACKAGES = [
      { kw: 6.65, label: "6.6kW + 18kWh", id: "p66" }, { kw: 10.45, label: "10.45kW + 27kWh", id: "p1045" },
      { kw: 13.3, label: "13.28kW + 36kWh", id: "p1328" }, { kw: 30, label: "30kW commercial", id: "p30" },
      { kw: 50, label: "50kW commercial", id: "p50" }, { kw: 100, label: "100kW commercial", id: "p100" }
    ];

    var seState = { billQ: 1450, period: "quarter", storey: "single" };
    var billEl2 = document.getElementById("se-bill");
    var aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
    var num = function (v) { return Math.round(v).toLocaleString("en-AU"); };
    var byId = function (id) { return document.getElementById(id); };

    function model() {
      var annualUse = seState.billQ * 4 / M.rate;
      // Size comes from the bill bracket; everything below (savings, chart) follows it
      var tier = M.tiers.find(function (t) { return seState.billQ <= t.upTo; });
      var panels = tier.panels;
      var kw = panels * M.panelW / 1000;
      var modules = tier.modules;
      var dailyUse = annualUse / 365;
      var gen = [], use = [], shortfall = [], y = { gen: 0, use: 0, self: 0, exp: 0 };
      for (var i = 0; i < 12; i++) {
        var g = kw * M.yieldKwDay * M.genShape[i];
        var u = dailyUse * M.useShape[i];
        var self = Math.min(g * M.selfUse, u);
        gen.push(g); use.push(u); shortfall.push((u - self) / u);
        y.gen += g * M.days[i]; y.use += u * M.days[i];
        y.self += self * M.days[i]; y.exp += (g - self) * M.days[i];
      }
      // Chart line "consumption after solar" = before × factor, factor bounded to
      // 0–0.10. Each month's factor keeps the model's seasonal shape (the
      // month with the largest shortfall gets the full 0.10), so the line sits
      // along the bottom of the chart and still rises slightly in winter.
      var worst = Math.max.apply(null, shortfall);
      var grid = use.map(function (u, i) {
        var factor = worst > 0 ? M.afterMaxFactor * shortfall[i] / worst : 0;
        return u * Math.min(M.afterMaxFactor, Math.max(0, factor));
      });
      // Chart bars "solar generation" = before × factor, factor 0.80–0.92 by
      // season: the month where modelled solar best matches usage gets 0.92,
      // the weakest gets 0.80, so every bar sits just under the red line.
      var match = gen.map(function (g, i) { return g / use[i]; });
      var lo = Math.min.apply(null, match), hi = Math.max.apply(null, match);
      var bars = use.map(function (u, i) {
        var t = hi > lo ? (match[i] - lo) / (hi - lo) : 1;
        return u * (M.barFactor[0] + (M.barFactor[1] - M.barFactor[0]) * t);
      });
      var saving = Math.min(y.self * M.rate + y.exp * M.fit, seState.billQ * 4);
      return { kw: kw, panels: panels, modules: modules, kwh: modules * M.moduleKwh, tier: tier,
               gen: gen, bars: bars, use: use, grid: grid, y: y, saving: saving };
    }

    function closestPackage(kw) {
      return PACKAGES.reduce(function (best, p) {
        return Math.abs(p.kw - kw) < Math.abs(best.kw - kw) ? p : best;
      });
    }

    // Over $1,500 a quarter: swap the card to the expert-contact state and blank
    // the savings column, since there's no standard system to quote figures for.
    var recEl = byId("se-rec"), customShown = false;
    function setCustom(on, billShown, perQ) {
      if (on !== customShown) {
        customShown = on;
        byId("se-rec-std").hidden = on;
        byId("se-rec-custom").hidden = !on;
        recEl.classList.toggle("is-custom", on);
        // Replay the fade so the swap reads as a transition, not a jump
        recEl.classList.remove("is-swapping"); void recEl.offsetWidth; recEl.classList.add("is-swapping");
      }
      if (!on) return;
      var billText = aud.format(billShown) + (perQ ? " a quarter" : " a month");
      byId("se-expert").href = "contact.html?system=" + encodeURIComponent("Not sure") + "&note=" +
        encodeURIComponent("My electricity bill is about " + billText + ". I'd like a custom high-capacity solar proposal.") + "#quote-form";
      byId("se-save-q").textContent = "Custom";
      byId("se-save-sub").textContent = "Tailored proposal for bills over $1,500 a quarter";
      byId("se-before").textContent = aud.format(billShown);
      byId("se-after").textContent = "—";
      byId("se-bar-after").style.setProperty("--w", "0%");
      ["se-save-y", "se-sc", "se-cover", "se-gen", "se-roof"].forEach(function (id) { byId(id).textContent = "—"; });
      byId("se-storey-note").textContent = "Our engineers size larger systems from your roof plan and twelve months of usage data.";
    }

    function renderSummary(r) {
      var perQ = seState.period === "quarter";
      var div = perQ ? 1 : 3;
      var billShown = seState.billQ / div;
      byId("se-bill-out").textContent = aud.format(billShown);
      setCustom(!!r.tier.custom, billShown, perQ);
      if (r.tier.custom) return;
      byId("se-kw").textContent = r.tier.label;
      byId("se-kwh").textContent = r.kwh;
      // Module count is always capacity ÷ 9 kWh
      byId("se-rec-detail").textContent = r.panels + " × " + M.panelW + "W Jinko panels · " + (r.kwh / M.moduleKwh) +
        " × " + M.moduleKwh + " kWh Sigenergy module" + (r.modules > 1 ? "s" : "");
      byId("se-rec-note").textContent = r.tier.note;
      var pkg = closestPackage(r.kw);
      var link = byId("se-rec-link");
      link.href = "#" + pkg.id;
      link.textContent = (Math.abs(pkg.kw - r.kw) < 0.01 ? "Matches our " : "Closest package: ") + pkg.label + " →";

      var before = billShown, after = Math.max(0, seState.billQ * 4 - r.saving) / 4 / div;
      byId("se-save-q").textContent = aud.format(r.saving / 4 / div);
      byId("se-save-sub").textContent = (perQ ? "per quarter" : "per month") + " · " +
        Math.round(r.saving / (seState.billQ * 4) * 100) + "% of your bill";
      byId("se-before").textContent = aud.format(before);
      byId("se-after").textContent = aud.format(after);
      byId("se-bar-after").style.setProperty("--w", Math.max(2, after / before * 100) + "%");
      byId("se-save-y").textContent = aud.format(r.saving);
      byId("se-sc").textContent = Math.round(r.y.self / r.y.gen * 100) + "%";
      byId("se-cover").textContent = Math.round(r.y.self / r.y.use * 100) + "%";
      byId("se-gen").textContent = num(r.y.gen) + " kWh/yr";
      byId("se-roof").textContent = "~" + num(r.panels * M.m2PerPanel) + " m²";
      byId("se-storey-note").textContent = seState.storey === "double"
        ? "Double storey: the install needs edge protection or scaffolding, which we'll price after a site check. Upper roofs are often smaller, so we'll confirm the ~" + num(r.panels * M.m2PerPanel) + " m² fits."
        : "Single storey: a standard roof install, usually the simplest and quickest.";
    }

    /* Chart: hand-drawn SVG so the site stays dependency-free. Values tween
       from the previous state to the new one on every input change. */
    var chartEl = byId("se-chart");
    // The viewBox matches the element's real size, so the chart fills its card
    // at any width without stretching the text.
    var W = 360, H = 250, P = { t: 12, r: 8, b: 26, l: 46 };   // l fits "8,000"
    var shown = null, anim = 0, hoverIdx = -1;
    function niceStep(raw) {
      var mag = Math.pow(10, Math.floor(Math.log10(raw)));
      var f = [1, 2, 2.5, 5, 10].find(function (m) { return m * mag >= raw; });
      return f * mag;
    }
    function drawChart(d) {
      W = Math.max(260, chartEl.clientWidth);
      H = Math.max(220, Math.min(420, chartEl.clientHeight || 250));
      // ~30% headroom above the tallest value ("zoomed out") so the top of the
      // chart breathes; the step rounding then lands on a clean tick.
      var peak = Math.max.apply(null, d.gen.concat(d.use)) * 1.3;
      var step = niceStep(peak / 4);
      var max = step * Math.ceil(peak / step);   // 3–4 gridlines, no empty band on top
      var cw = (W - P.l - P.r) / 12;
      var x = function (i) { return P.l + cw * i + cw / 2; };
      var y = function (v) { return P.t + (H - P.t - P.b) * (1 - v / max); };
      var line = function (a) { return a.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); }).join(" "); };
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">';
      for (var t = 0; t * step <= max + 1e-9; t++) {
        var tv = step * t, ty = y(tv).toFixed(1);
        svg += '<line class="se-grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + ty + '" y2="' + ty + '"/>' +
               '<text class="se-tick" x="' + (P.l - 6) + '" y="' + ty + '" dy="3" text-anchor="end">' + num(tv) + "</text>";
        // Unit label on the top gridline so the axis reads in kWh
        if ((t + 1) * step > max + 1e-9) svg += '<text class="se-tick se-tick--unit" x="' + P.l + '" y="' + ty + '" dy="-6">kWh / month</text>';
      }
      // Monotone cubic smoothing (Fritsch–Carlson): curves never overshoot a
      // month's value or dip below zero, unlike a plain Catmull-Rom spline.
      var smooth = function (a) {
        var px = a.map(function (v, i) { return x(i); }), py = a.map(y), n = a.length;
        var dx = [], m = [], t = [];
        for (var i = 0; i < n - 1; i++) { dx[i] = px[i + 1] - px[i]; m[i] = (py[i + 1] - py[i]) / dx[i]; }
        t[0] = m[0]; t[n - 1] = m[n - 2];
        for (i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
        for (i = 0; i < n - 1; i++) {
          if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
          var al = t[i] / m[i], be = t[i + 1] / m[i], h = al * al + be * be;
          if (h > 9) { var k = 3 / Math.sqrt(h); t[i] = k * al * m[i]; t[i + 1] = k * be * m[i]; }
        }
        var d = "M" + px[0].toFixed(1) + "," + py[0].toFixed(1);
        for (i = 0; i < n - 1; i++) {
          d += " C" + (px[i] + dx[i] / 3).toFixed(1) + "," + (py[i] + t[i] * dx[i] / 3).toFixed(1) + " " +
               (px[i + 1] - dx[i] / 3).toFixed(1) + "," + (py[i + 1] - t[i + 1] * dx[i] / 3).toFixed(1) + " " +
               px[i + 1].toFixed(1) + "," + py[i + 1].toFixed(1);
        }
        return d;
      };
      var base = (H - P.b).toFixed(1);
      // The chart redraws on every hover; a negative delay tied to the clock keeps
      // the lines' flow animation continuous instead of restarting each redraw.
      var flowPhase = "animation-delay:-" + (performance.now() % 1400).toFixed(0) + "ms";
      var area = function (a) { return smooth(a) + " L" + x(11).toFixed(1) + "," + base + " L" + x(0).toFixed(1) + "," + base + " Z"; };
      svg += '<defs>' +
        '<linearGradient id="se-g-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86EFAC"/><stop offset="1" stop-color="#4ADE80"/></linearGradient>' +
        '<linearGradient id="se-g-before" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5484D" stop-opacity=".28"/><stop offset="1" stop-color="#E5484D" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="se-g-after" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FA6F2" stop-opacity=".55"/><stop offset="1" stop-color="#4FA6F2" stop-opacity=".04"/></linearGradient>' +
        '</defs>';
      // Bars: solar generation
      d.gen.forEach(function (v, i) {
        var bw = cw * 0.5, top = y(v);
        svg += '<rect class="se-bar' + (i === hoverIdx ? " is-hover" : "") + '" x="' + (x(i) - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) +
               '" width="' + bw.toFixed(1) + '" height="' + (H - P.b - top).toFixed(1) + '" rx="3"/>';
        svg += '<text class="se-tick" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + M.months[i].charAt(0) + "</text>";
      });
      // Areas under the lines, then the lines on top
      svg += '<path class="se-area" fill="url(#se-g-before)" d="' + area(d.use) + '"/>' +
             '<path class="se-area" fill="url(#se-g-after)" d="' + area(d.grid) + '"/>' +
             '<path class="se-line se-line--before" style="' + flowPhase + '" d="' + smooth(d.use) + '"/>' +
             '<path class="se-line se-line--after" style="' + flowPhase + '" d="' + smooth(d.grid) + '"/>';
      d.use.forEach(function (v, i) { svg += '<circle class="se-dot se-dot--before" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (i === hoverIdx ? 4.5 : 0) + '"/>'; });
      d.grid.forEach(function (v, i) { svg += '<circle class="se-dot se-dot--after" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (i === hoverIdx ? 4.5 : 0) + '"/>'; });
      if (hoverIdx >= 0) {
        svg += '<line class="se-hover" x1="' + x(hoverIdx).toFixed(1) + '" x2="' + x(hoverIdx).toFixed(1) + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/>';
      }
      chartEl.innerHTML = svg + "</svg>" + tooltip(d, x, cw);
      // Keep the tooltip inside the chart: measure it, then shift it back in
      // from whichever edge it overflows (on phones it's wider than half the chart).
      var tip = chartEl.querySelector(".se-tip");
      if (tip) {
        var box = chartEl.getBoundingClientRect(), tb = tip.getBoundingClientRect();
        var shift = tb.right > box.right ? box.right - tb.right : (tb.left < box.left ? box.left - tb.left : 0);
        if (shift) tip.style.transform += " translateX(" + shift + "px)";
      }
      chartEl.setAttribute("aria-label", "Monthly power bought falls from " + num(Math.min.apply(null, d.use)) + "–" +
        num(Math.max.apply(null, d.use)) + " kWh a month before solar to " + num(Math.min.apply(null, d.grid)) + "–" +
        num(Math.max.apply(null, d.grid)) + " after. Solar generates " + num(Math.min.apply(null, d.gen)) + "–" +
        num(Math.max.apply(null, d.gen)) + " kWh a month across the year.");
    }
    function tooltip(d, x, cw) {
      if (hoverIdx < 0) return "";
      // Open away from the nearer edge so the wider monthly figures never clip
      var left = x(hoverIdx) / W * 100, flip = left > 50;
      return '<div class="se-tip" style="left:' + left + '%;' + (flip ? "transform:translateX(calc(-100% - 10px))" : "transform:translateX(10px)") + '">' +
        "<strong>" + M.months[hoverIdx] + " · kWh per month</strong>" +
        '<span><i class="se-key se-key--before"></i>' + num(d.use[hoverIdx]) + " consumption before</span>" +
        '<span><i class="se-key se-key--gen"></i>' + num(d.gen[hoverIdx]) + " solar generation</span>" +
        '<span><i class="se-key se-key--after"></i>' + num(d.grid[hoverIdx]) + " consumption after</span></div>";
    }
    function animateTo(target) {
      cancelAnimationFrame(anim);
      if (!shown || reduceMotion) { shown = target; drawChart(shown); return; }
      var from = shown, start = performance.now(), dur = 450;
      (function step(now) {
        var k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
        var mix = function (a, b) { return a.map(function (v, i) { return v + (b[i] - v) * e; }); };
        shown = { gen: mix(from.gen, target.gen), use: mix(from.use, target.use), grid: mix(from.grid, target.grid) };
        drawChart(shown);
        if (k < 1) anim = requestAnimationFrame(step);
      })(start);
    }
    chartEl.addEventListener("pointermove", function (e) {
      var r = chartEl.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * W;
      var i = Math.floor((px - P.l) / ((W - P.l - P.r) / 12));
      i = i >= 0 && i < 12 ? i : -1;
      if (i !== hoverIdx) { hoverIdx = i; if (shown) drawChart(shown); }
    });
    chartEl.addEventListener("pointerleave", function () { hoverIdx = -1; if (shown) drawChart(shown); });
    var seResize;
    window.addEventListener("resize", function () {
      clearTimeout(seResize);
      seResize = setTimeout(function () { if (shown) drawChart(shown); }, 150);
    });

    function update() {
      var r = model();
      renderSummary(r);
      // Chart shows monthly totals: each daily figure × that month's days
      var perMonth = function (a) { return a.map(function (v, i) { return v * M.days[i]; }); };
      animateTo({ gen: perMonth(r.bars), use: perMonth(r.use), grid: perMonth(r.grid) });
    }

    billEl2.addEventListener("input", function () {
      seState.billQ = parseFloat(billEl2.value) * (seState.period === "quarter" ? 1 : 3);
      update();
    });
    // Switching period keeps the same bill and rescales the slider around it
    se.querySelectorAll("[data-se-period]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        seState.period = btn.getAttribute("data-se-period");
        se.querySelectorAll("[data-se-period]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        var q = seState.period === "quarter";
        billEl2.min = q ? 200 : 70; billEl2.max = q ? 6000 : 2000; billEl2.step = q ? 25 : 10;
        billEl2.value = seState.billQ / (q ? 1 : 3);
        // The slider snaps to its step, so read the snapped value back
        seState.billQ = parseFloat(billEl2.value) * (q ? 1 : 3);
        paintRange(billEl2);
        update();
      });
    });
    se.querySelectorAll("[data-se-storey]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        seState.storey = btn.getAttribute("data-se-storey");
        se.querySelectorAll("[data-se-storey]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        update();
      });
    });
    update();
  }

  /* ---------- 8. QUOTE FORM ---------- */
  var form = document.getElementById("quote-form");
  if (form) {
    var status = document.getElementById("form-status");

    // Product pages link here as contact.html?system=13.28kW — preselect that option
    // so the visitor doesn't have to find it again in the dropdown.
    (function prefillSystem() {
      var wanted = new URLSearchParams(window.location.search).get("system");
      if (!wanted) return;
      var select = document.getElementById("f-system");
      if (!select) return;

      var needle = wanted.toLowerCase().replace(/\s+/g, "");
      var match = Array.prototype.find.call(select.options, function (opt) {
        return opt.text.toLowerCase().replace(/\s+/g, "").indexOf(needle) !== -1;
      });
      if (match) {
        select.value = match.value || match.text;
        select.closest(".input-group").style.setProperty("--flash", "1");
      }
    })();

    // The rebate estimator's CTA passes its summary as ?note= so the visitor
    // doesn't have to retype the figures. Never overwrite something they typed.
    (function prefillNote() {
      var note = new URLSearchParams(window.location.search).get("note");
      var message = document.getElementById("f-message");
      if (note && message && !message.value) message.value = note.slice(0, 600);
    })();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;

      form.querySelectorAll("[required]").forEach(function (field) {
        var group = field.closest(".input-group");
        var valid = field.value.trim() !== "";

        if (valid && field.type === "email") {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
        }
        if (valid && field.type === "tel") {
          valid = field.value.replace(/[^\d]/g, "").length >= 8;
        }

        group.classList.toggle("has-error", !valid);
        if (!valid && ok) { field.focus(); ok = false; }
      });

      if (!ok) return;

      // No backend is wired up yet — hand the enquiry to the user's mail client
      // so the form is genuinely usable on a static host.
      var data = new FormData(form);
      var body = [
        "Name: " + (data.get("name") || ""),
        "Phone: " + (data.get("phone") || ""),
        "Email: " + (data.get("email") || ""),
        "Suburb / postcode: " + (data.get("suburb") || ""),
        "Property type: " + (data.get("property") || ""),
        "Interested in: " + (data.get("system") || ""),
        "Quarterly bill: " + (data.get("bill") || ""),
        "",
        "Message:",
        (data.get("message") || "")
      ].join("\n");

      status.textContent = "Thanks — opening your email app so you can send this through to Phong. If nothing opens, call 0415 301 979 or email phong@sinvesta.com.au directly.";
      status.classList.add("is-visible");
      status.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });

      window.location.href = "mailto:phong@sinvesta.com.au" +
        "?subject=" + encodeURIComponent("Solar enquiry — " + (data.get("name") || "Website")) +
        "&body=" + encodeURIComponent(body);

      form.reset();
      document.querySelectorAll('input[type="range"]').forEach(paintRange);
    });

    // Clear the error as soon as the user starts fixing the field.
    form.querySelectorAll("[required]").forEach(function (field) {
      field.addEventListener("input", function () {
        field.closest(".input-group").classList.remove("has-error");
      });
    });
  }

  /* ---------- 9. HERO CURVE ---------- */
  // Set the dash length from the real path so the draw-on animation is exact.
  var curve = document.querySelector(".curve-line");
  if (curve && curve.getTotalLength) {
    var len = curve.getTotalLength();
    curve.style.setProperty("--len", len);
  }

  /* ---------- 10. FOOTER YEAR ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- 11. CONTACT WIDGET (Quote + WhatsApp) ----------
     Dismissing hides it for the rest of the browser tab session
     (sessionStorage) rather than forever, so it's back next visit.
  ------------------------------------------------------------ */
  var contactWidget = document.querySelector("[data-contact-widget]");
  if (contactWidget) {
    var WIDGET_KEY = "sinvesta-widget-dismissed";
    var widgetDismiss = contactWidget.querySelector("[data-widget-dismiss]");

    try {
      if (sessionStorage.getItem(WIDGET_KEY)) contactWidget.classList.add("is-hidden");
    } catch (e) { /* private mode */ }

    if (widgetDismiss) {
      widgetDismiss.addEventListener("click", function () {
        contactWidget.classList.add("is-hidden");
        try { sessionStorage.setItem(WIDGET_KEY, "1"); } catch (e) {}
      });
    }
  }

  /* ---------- 12. PARTNER MARQUEE ----------
     To add a partner, drop the file in assets/img/partners/ and add a line here.
     w/h are the file's pixel size; tall marks stacked logos that need more height.
  ------------------------------------------------------------ */
  var PARTNER_LOGOS = [
    { src: "brighte.png",              alt: "Brighte Logo",                       w: 731, h: 189 },
    { src: "plenti.png",               alt: "Plenti Logo",                        w: 468, h: 146 },
    { src: "saa.png",                  alt: "Solar Accreditation Australia Logo", w: 481, h: 139 },
    { src: "smart-ease.png",           alt: "Smart Ease Logo",                    w: 488, h: 78 },
    { src: "smart-energy-council.png", alt: "Smart Energy Council Logo",          w: 354, h: 264, tall: true }
  ];
  // Narrowest a tile can be: 168px min-width plus the 1rem minimum margin.
  var PARTNER_TILE_MIN = 184;
  // Same pace as the brand strip below (38s for its 6 tiles).
  var PARTNER_SECS_PER_TILE = 38 / 6;

  var partnerStrip = document.querySelector("[data-partner-strip]");
  var partnerTrack = document.querySelector("[data-partner-track]");
  if (partnerStrip && partnerTrack && PARTNER_LOGOS.length) {
    var partnerRepeats = 0;

    function partnerTile(logo, decorative) {
      var tile = document.createElement("div");
      tile.className = "brand-logo" + (logo.tall ? " brand-logo--tall" : "");
      if (decorative) tile.setAttribute("aria-hidden", "true");
      var img = document.createElement("img");
      img.src = "assets/img/partners/" + logo.src;
      img.alt = decorative ? "" : logo.alt;
      img.width = logo.w;
      img.height = logo.h;
      img.decoding = "async";
      tile.appendChild(img);
      return tile;
    }

    // One half of the track must be at least as wide as the viewport, or a gap
    // shows before the loop resets. Tile widths are only known after the images
    // load, so size against the minimum tile width — the real half is never narrower.
    function buildPartnerTrack() {
      partnerStrip.hidden = false;
      var viewport = partnerTrack.parentNode.clientWidth;
      var repeats = Math.max(1, Math.ceil(viewport / (PARTNER_LOGOS.length * PARTNER_TILE_MIN)));
      if (repeats === partnerRepeats) return;
      partnerRepeats = repeats;

      var frag = document.createDocumentFragment();
      // Two identical halves; only the very first set is exposed to screen readers.
      for (var copy = 0; copy < repeats * 2; copy++) {
        PARTNER_LOGOS.forEach(function (logo) {
          frag.appendChild(partnerTile(logo, copy > 0));
        });
      }
      partnerTrack.replaceChildren(frag);
      partnerTrack.style.animationDuration =
        (repeats * PARTNER_LOGOS.length * PARTNER_SECS_PER_TILE) + "s";
    }

    buildPartnerTrack();
    var partnerResize;
    window.addEventListener("resize", function () {
      clearTimeout(partnerResize);
      partnerResize = setTimeout(buildPartnerTrack, 200);
    });
  }

  /* ---------- 13. PACKAGE CARD TILT ----------
     CSS does the lift; this only feeds the pointer position in. Mouse and
     trackpad only — on touch the hover state would stick after a tap.
  ------------------------------------------------------------ */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".pkg-tilt").forEach(function (card) {
      var maxDeg = card.classList.contains("pkg-tilt--wide") ? 1.5 : 6;
      var frame = 0;
      card.addEventListener("pointermove", function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = 0;
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width;
          var y = (e.clientY - r.top) / r.height;
          card.classList.add("is-tilting");
          card.style.setProperty("--ry", ((x - 0.5) * 2 * maxDeg).toFixed(2) + "deg");
          card.style.setProperty("--rx", ((0.5 - y) * 2 * maxDeg).toFixed(2) + "deg");
          card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
          card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        });
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- 14. REBATE ESTIMATOR ----------
     All policy figures live in REBATE so they can be updated in one place.
     Check them every January and July: the battery STC factor steps down on
     both dates, and the solar deeming period drops by one year each January.
     Sources: Clean Energy Regulator and DCCEEW (Cheaper Home Batteries Program),
     state program pages. Rates as at September 2026.
  ------------------------------------------------------------ */
  var REBATE = {
    installYear: 2026,
    nextStepDown: new Date(2027, 0, 1),   // battery factor falls again
    stcPrice: 38,                          // $ per STC after trading fees (~$37–$40)
    schemeEnd: 2030,                       // deeming period = years left to 2030, inclusive
    zoneRating: { 1: 1.622, 2: 1.536, 3: 1.382, 4: 1.185 },
    battery: {
      factor: 6.8,                         // STCs per usable kWh, 1 May – 31 Dec 2026
      // [upper kWh bound, share of factor] — tapered since 1 May 2026
      tiers: [[14, 1], [28, 0.6], [50, 0.15]]
    },
    // Typical installed prices used only until the visitor types their own quote
    typical: { perKw: 950, perKwh: 900 },
    states: {
      NSW: { zone: 3, label: "NSW VPP incentive (PDRS)", vpp: true,
             value: function (kwh, o) { return o.vpp ? Math.min(kwh, 28) * 37 : 0; },
             note: function (o) {
               return o.vpp
                 ? "NSW Peak Demand Reduction Scheme: paid when you join a virtual power plant, on the first 28 kWh. Providers set the amount, so we've assumed about $37/kWh after their fees."
                 : "NSW adds a VPP incentive on the first 28 kWh if you join a virtual power plant. Tick the box above to include it.";
             } },
      WA:  { zone: 3, label: "WA Residential Battery Scheme", vpp: true,
             value: function (kwh, o) { return o.vpp ? Math.min(kwh, 10) * (o.waNet === "horizon" ? 380 : 130) : 0; },
             note: function (o) {
               return o.vpp
                 ? "WA Residential Battery Scheme: $130/kWh for Synergy customers or $380/kWh for Horizon Power, up to 10 kWh, and you must join an eligible VPP. Interest-free loans of up to $10,000 are also available to eligible households."
                 : "The WA rebate needs you to join an eligible VPP. Tick the box above to include it.";
             } },
      VIC: { zone: 4, note: "Victoria's state battery rebate and loan have closed, so only the federal discounts are counted." },
      QLD: { zone: 3, note: "Queensland's Battery Booster has closed, so only the federal discounts are counted." },
      SA:  { zone: 3, note: "South Australia's Home Battery Scheme closed in 2022. Some retailers pay VPP sign-up credits, which aren't counted here." },
      TAS: { zone: 4, note: "Tasmania has no state battery rebate open, so only the federal discounts are counted." },
      ACT: { zone: 3, note: "The ACT offers Sustainable Household Scheme loans at 3% rather than a rebate, so they aren't counted as a subsidy." },
      NT:  { zone: 1, note: "The Northern Territory has no battery rebate open, so only the federal discounts are counted." }
    }
  };

  var money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
  var deeming = function (year) { return Math.max(0, REBATE.schemeEnd - year + 1); };
  var solarStcs = function (kw, zone, year) {
    return Math.floor(kw * REBATE.zoneRating[zone] * deeming(year));
  };
  // Returns the kWh counted in each tier, so the UI can show the taper
  function batteryTierKwh(kwh) {
    var from = 0;
    return REBATE.battery.tiers.map(function (t) {
      var inTier = Math.max(0, Math.min(kwh, t[0]) - from);
      from = t[0];
      return inTier;
    });
  }
  function batteryStcs(kwh) {
    var weighted = batteryTierKwh(kwh).reduce(function (sum, k, i) {
      return sum + k * REBATE.battery.tiers[i][1];
    }, 0);
    return Math.floor(weighted * REBATE.battery.factor);
  }

  // Hero ticker and countdown (the static HTML carries the same figures as a fallback)
  var tickSolar = document.querySelector('[data-rb-ticker="solar"]');
  if (tickSolar) {
    tickSolar.textContent = "~" + money0.format(solarStcs(6.65, 3, REBATE.installYear) * REBATE.stcPrice);
    document.querySelector('[data-rb-ticker="battery"]').textContent =
      "~" + money0.format(REBATE.battery.factor * REBATE.stcPrice) + "/kWh";
    var countdown = document.querySelector("[data-rb-countdown]");
    var days = Math.ceil((REBATE.nextStepDown - new Date()) / 86400000);
    if (countdown && days > 0) {
      countdown.textContent = days + (days === 1 ? " day" : " days");
      countdown.nextElementSibling.textContent = "until the battery rate falls on 1 January 2027";
    }
  }

  var rb = document.getElementById("rebate-calc");
  if (rb) {
    var $ = function (id) { return document.getElementById(id); };
    var st = { type: "battery", kw: 10.45, kwh: 27, preset: "10.45,27", state: "NSW",
               zone: 3, vpp: true, waNet: "synergy", customPrice: null };

    var kwEl = $("rb-kw"), kwhEl = $("rb-kwh"), stateEl = $("rb-state"), zoneEl = $("rb-zone");
    var vppEl = $("rb-vpp"), priceEl = $("rb-price"), priceTag = $("rb-price-tag");
    var priceReset = rb.querySelector("[data-rb-price-reset]");
    var presetBtns = rb.querySelectorAll("[data-rb-preset]");
    var typeBtns = rb.querySelectorAll("[data-rb-type]");
    var waBtns = rb.querySelectorAll("[data-rb-wa-net]");

    function press(btns, active) {
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b === active ? "true" : "false"); });
    }
    function setRange(el, v) { el.value = v; paintRange(el); }
    function typicalPrice() {
      var p = st.kw * REBATE.typical.perKw + (st.type === "battery" ? st.kwh * REBATE.typical.perKwh : 0);
      return Math.round(p / 100) * 100;
    }
    function sizeLabel(kw) { return kw === 13.3 ? "13.28" : kw === 6.65 ? "6.6" : String(+kw.toFixed(2)); }

    function render() {
      var hasBat = st.type === "battery";
      var rule = REBATE.states[st.state];
      var stcS = solarStcs(st.kw, st.zone, REBATE.installYear);
      var solar = stcS * REBATE.stcPrice;
      var stcB = hasBat ? batteryStcs(st.kwh) : 0;
      var battery = stcB * REBATE.stcPrice;
      var stateVal = hasBat && rule.value ? Math.round(rule.value(st.kwh, st)) : 0;
      var total = solar + battery + stateVal;
      var gross = st.customPrice != null ? st.customPrice : typicalPrice();
      var net = Math.max(0, gross - total);

      if (st.customPrice == null) priceEl.value = gross.toLocaleString("en-AU");
      priceTag.textContent = st.customPrice != null ? "your quote" : "typical estimate";
      priceTag.classList.toggle("is-custom", st.customPrice != null);
      priceReset.hidden = st.customPrice == null;

      $("rb-kw-out").textContent = sizeLabel(st.kw) + " kW";
      $("rb-kwh-out").textContent = st.kwh + " kWh";
      $("rb-total").textContent = money0.format(total);
      $("rb-share").textContent = gross > 0 ? Math.min(100, Math.round(total / gross * 100)) + "%" : "—";
      $("rb-solar").textContent = money0.format(solar);
      $("rb-battery").textContent = money0.format(battery);
      $("rb-state-val").textContent = money0.format(stateVal);
      $("rb-state-name").textContent = rule.label || "State incentive";
      $("rb-gross").textContent = money0.format(gross);
      $("rb-net").textContent = money0.format(net);

      // Show only what applies: no battery rows for solar-only, no state row where nothing is open
      rb.querySelector("[data-rb-battery-field]").hidden = !hasBat;
      rb.querySelector("[data-rb-battery-row]").hidden = !hasBat;
      rb.querySelector("[data-rb-state-row]").hidden = !hasBat || !rule.value;
      rb.querySelector("[data-rb-wa]").hidden = !(hasBat && st.state === "WA");
      rb.querySelector("[data-rb-vpp-field]").hidden = !(hasBat && rule.vpp);
      $("rb-state-note").textContent = hasBat
        ? (typeof rule.note === "function" ? rule.note(st) : rule.note)
        : "State incentives here are for batteries. Switch to Solar + battery to see them.";

      // Stacked bar: each slice as a share of the gross price
      var base = Math.max(gross, total) || 1;
      var segs = { solar: solar, battery: battery, state: stateVal, net: net };
      Object.keys(segs).forEach(function (k) {
        rb.querySelector('[data-rb-seg="' + k + '"]').style.width = (segs[k] / base * 100) + "%";
      });
      $("rb-bar").setAttribute("aria-label", "Of " + money0.format(gross) + ": " + money0.format(total) +
        " in rebates and " + money0.format(net) + " paid by you");

      // Tier meter under the battery slider
      batteryTierKwh(st.kwh).forEach(function (k, i) {
        var t = REBATE.battery.tiers[i], span = t[0] - (i ? REBATE.battery.tiers[i - 1][0] : 0);
        rb.querySelector('[data-rb-tier="' + i + '"]').style.setProperty("--fill", (k / span * 100) + "%");
      });

      // Working, in words and numbers
      var zr = REBATE.zoneRating[st.zone], d = deeming(REBATE.installYear);
      $("rb-work-solar").textContent = "Solar: " + sizeLabel(st.kw) + " kW × " + zr + " (zone " + st.zone + ") × " + d +
        " years = " + stcS + " STCs × $" + REBATE.stcPrice + " = " + money0.format(solar);
      if (hasBat) {
        var parts = batteryTierKwh(st.kwh).map(function (k, i) {
          return k ? k + " kWh × " + Math.round(REBATE.battery.tiers[i][1] * 100) + "%" : "";
        }).filter(Boolean);
        $("rb-work-battery").textContent = "Battery: (" + parts.join(" + ") + ") × " + REBATE.battery.factor +
          " = " + stcB + " STCs × $" + REBATE.stcPrice + " = " + money0.format(battery);
      } else {
        $("rb-work-battery").textContent = "";
      }

      // CTA carries the estimate into the quote form
      var sys = st.preset !== "custom" ? sizeLabel(st.kw) + "kW" : "";
      var note = "Rebate estimate (" + st.state + ", zone " + st.zone + "): " + sizeLabel(st.kw) + " kW solar" +
        (hasBat ? " + " + st.kwh + " kWh battery" : "") + ". Solar STCs " + money0.format(solar) +
        (hasBat ? ", federal battery discount " + money0.format(battery) : "") +
        (stateVal ? ", state incentive " + money0.format(stateVal) : "") +
        ". Total " + money0.format(total) + "; price before rebates " + money0.format(gross) +
        (st.customPrice != null ? " (my quote)" : " (typical)") + ", after " + money0.format(net) + ".";
      $("rb-cta").href = "contact.html?" + (sys ? "system=" + encodeURIComponent(sys) + "&" : "") +
        "note=" + encodeURIComponent(note);

      renderYears();
    }

    // Timing section: this system's solar STC value by install year
    var yearsEl = document.getElementById("rb-years");
    function renderYears() {
      if (!yearsEl) return;
      var rows = [], first = solarStcs(st.kw, st.zone, REBATE.installYear) * REBATE.stcPrice || 1;
      for (var y = REBATE.installYear; y <= REBATE.schemeEnd + 1; y++) {
        var v = solarStcs(st.kw, st.zone, y) * REBATE.stcPrice;
        rows.push('<div class="rb-year' + (y === REBATE.installYear ? " is-now" : "") + (v ? "" : " is-closed") + '">' +
          '<span class="rb-year-k">' + y + '</span>' +
          '<span class="rb-year-bar"><i style="--w:' + (v / first * 100) + '%"></i></span>' +
          '<span class="rb-year-v">' + (v ? money0.format(v) : "Scheme closed") + "</span></div>");
      }
      yearsEl.innerHTML = rows.join("");
    }

    typeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        st.type = btn.getAttribute("data-rb-type");
        press(typeBtns, btn);
        render();
      });
    });
    presetBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        st.preset = btn.getAttribute("data-rb-preset");
        press(presetBtns, btn);
        if (st.preset !== "custom") {
          var v = st.preset.split(",");
          st.kw = parseFloat(v[0]); st.kwh = parseInt(v[1], 10);
          setRange(kwEl, st.kw); setRange(kwhEl, st.kwh);
        } else {
          kwEl.focus();
        }
        render();
      });
    });
    // Moving a slider by hand turns the package into a custom system
    function toCustom() {
      st.preset = "custom";
      press(presetBtns, rb.querySelector('[data-rb-preset="custom"]'));
    }
    kwEl.addEventListener("input", function () { st.kw = parseFloat(kwEl.value); toCustom(); render(); });
    kwhEl.addEventListener("input", function () { st.kwh = parseInt(kwhEl.value, 10); toCustom(); render(); });
    stateEl.addEventListener("change", function () {
      st.state = stateEl.value;
      st.zone = REBATE.states[st.state].zone;
      zoneEl.value = String(st.zone);
      render();
    });
    zoneEl.addEventListener("change", function () { st.zone = parseInt(zoneEl.value, 10); render(); });
    vppEl.addEventListener("change", function () { st.vpp = vppEl.checked; render(); });
    waBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        st.waNet = btn.getAttribute("data-rb-wa-net");
        press(waBtns, btn);
        render();
      });
    });
    priceEl.addEventListener("input", function () {
      var digits = priceEl.value.replace(/[^\d]/g, "");
      st.customPrice = digits ? parseInt(digits, 10) : null;
      render();
    });
    priceEl.addEventListener("blur", function () {
      if (st.customPrice != null) priceEl.value = st.customPrice.toLocaleString("en-AU");
    });
    priceReset.addEventListener("click", function () { st.customPrice = null; render(); });

    render();
  }
})();
