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

  /* ---------- 7. SAVINGS CALCULATOR ----------
     Assumptions are shown to the user in the UI, not hidden here:
       · Sydney yield 4.1 kWh per kW of panels per day (CEC zone 3)
       · Self-consumption 35% without a battery, 78% with one
       · Grid import 35c/kWh, feed-in 5c/kWh (NSW retail, 2026)
       · Grid emissions factor 0.68 kg CO2 per kWh (NSW)
     These drive an estimate only — a real quote depends on the roof.
  ------------------------------------------------------------ */
  var calc = document.getElementById("calc");
  if (calc) {
    var YIELD = 4.1, SC_NO_BAT = 0.35, SC_BAT = 0.78;
    var RATE = 0.35, FIT = 0.05, CO2 = 0.68;

    var sizeEl = document.getElementById("calc-size");
    var billEl = document.getElementById("calc-bill");
    var batBtns = calc.querySelectorAll("[data-battery]");

    var outSize = document.getElementById("out-size");
    var outBill = document.getElementById("out-bill");
    var outSaving = document.getElementById("out-saving");
    var outGen = document.getElementById("out-gen");
    var outOffset = document.getElementById("out-offset");
    var outTen = document.getElementById("out-ten");
    var outCo2 = document.getElementById("out-co2");

    var hasBattery = false;

    var money = new Intl.NumberFormat("en-AU", {
      style: "currency", currency: "AUD", maximumFractionDigits: 0
    });

    function recalc() {
      var kw = parseFloat(sizeEl.value);
      var bill = parseFloat(billEl.value);              // quarterly bill, $

      var annualGen = kw * YIELD * 365;                 // kWh/yr
      var scRate = hasBattery ? SC_BAT : SC_NO_BAT;
      var selfUsed = annualGen * scRate;
      var exported = annualGen - selfUsed;

      var annualBill = bill * 4;
      // Can't save more on imports than the bill actually is.
      var importSaving = Math.min(selfUsed * RATE, annualBill);
      var exportCredit = exported * FIT;
      var saving = importSaving + exportCredit;

      var offset = annualBill > 0 ? Math.min(Math.round((saving / annualBill) * 100), 100) : 0;

      outSize.textContent = kw.toFixed(2).replace(/\.?0+$/, "") + " kW";
      outBill.textContent = money.format(bill);
      outSaving.textContent = money.format(saving);
      outGen.textContent = Math.round(annualGen).toLocaleString("en-AU") + " kWh";
      outOffset.textContent = offset + "%";
      outTen.textContent = money.format(saving * 10);
      outCo2.textContent = (annualGen * CO2 / 1000).toFixed(1) + " t";
    }

    sizeEl.addEventListener("input", recalc);
    billEl.addEventListener("input", recalc);

    batBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        hasBattery = btn.getAttribute("data-battery") === "yes";
        batBtns.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        recalc();
      });
    });

    recalc();
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
})();
