/* =========================================================
   EMI CALCULATOR — CORE SCRIPT
   No external libraries. Pure DOM + Canvas.
   ========================================================= */

/* ---------- Utilities ---------- */
function formatCurrency(num) {
  if (isNaN(num)) return "₹0";
  return "₹" + Math.round(num).toLocaleString("en-IN");
}

function formatNumberIN(num) {
  return Math.round(num).toLocaleString("en-IN");
}

/* ---------- Core EMI math ----------
   EMI = P × r × (1+r)^n / ((1+r)^n − 1)
   P = principal, r = monthly interest rate, n = tenure in months
*/
function calculateEMI(principal, annualRatePct, months) {
  const r = annualRatePct / 12 / 100;
  if (r === 0) {
    const emi = principal / months;
    return { emi, totalPayment: principal, totalInterest: 0 };
  }
  const factor = Math.pow(1 + r, months);
  const emi = (principal * r * factor) / (factor - 1);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;
  return { emi, totalPayment, totalInterest };
}

function buildAmortizationSchedule(principal, annualRatePct, months) {
  const r = annualRatePct / 12 / 100;
  const { emi } = calculateEMI(principal, annualRatePct, months);
  let balance = principal;
  const rows = [];
  for (let m = 1; m <= months; m++) {
    const interestPortion = r === 0 ? 0 : balance * r;
    let principalPortion = emi - interestPortion;
    if (m === months) principalPortion = balance; // clear rounding drift on last row
    balance = Math.max(0, balance - principalPortion);
    rows.push({
      month: m,
      emi: m === months ? principalPortion + interestPortion : emi,
      interest: interestPortion,
      principal: principalPortion,
      balance: balance
    });
  }
  return rows;
}

/* ---------- Canvas doughnut chart (no libraries) ---------- */
function drawDoughnutChart(canvas, segments) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 220;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.62;
  let startAngle = -Math.PI / 2;

  segments.forEach(seg => {
    const slice = total > 0 ? (seg.value / total) * Math.PI * 2 : 0;
    const endAngle = startAngle + slice;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle = endAngle;
  });

  // punch the doughnut hole
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // thin outline for an editorial / printed-report feel
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(27,31,39,0.12)";
  ctx.stroke();
}

/* ---------- Calculator page wiring ---------- */
function initCalculator() {
  const form = document.getElementById("emi-form");
  if (!form) return;

  const amountInput = document.getElementById("loan-amount");
  const amountRange = document.getElementById("loan-amount-range");
  const rateInput = document.getElementById("interest-rate");
  const rateRange = document.getElementById("interest-rate-range");
  const tenureInput = document.getElementById("loan-tenure");
  const tenureRange = document.getElementById("loan-tenure-range");
  const tenureToggle = document.querySelectorAll("[data-tenure-unit]");
  const resetBtn = document.getElementById("reset-btn");

  const emiOut = document.getElementById("out-emi");
  const totalInterestOut = document.getElementById("out-total-interest");
  const totalPaymentOut = document.getElementById("out-total-payment");
  const principalOut = document.getElementById("out-principal-share");
  const interestOut = document.getElementById("out-interest-share");
  const chartCanvas = document.getElementById("emi-chart");

  const tableBody = document.getElementById("amort-body");
  const tableToggleBtn = document.getElementById("toggle-amort");
  const printBtn = document.getElementById("print-amort");
  const amortSection = document.getElementById("amortization-section");

  let tenureUnit = "years";

  function syncPair(numberEl, rangeEl) {
    numberEl.addEventListener("input", () => { rangeEl.value = numberEl.value; recalc(); });
    rangeEl.addEventListener("input", () => { numberEl.value = rangeEl.value; recalc(); });
  }
  syncPair(amountInput, amountRange);
  syncPair(rateInput, rateRange);
  syncPair(tenureInput, tenureRange);

  tenureToggle.forEach(btn => {
    btn.addEventListener("click", () => {
      tenureToggle.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tenureUnit = btn.dataset.tenureUnit;
      if (tenureUnit === "years") {
        tenureInput.max = 30; tenureRange.max = 30;
        tenureInput.value = Math.min(tenureInput.value, 30) || 20;
      } else {
        tenureInput.max = 360; tenureRange.max = 360;
        tenureInput.value = Math.min(tenureInput.value * 12 || tenureInput.value, 360);
      }
      tenureRange.value = tenureInput.value;
      recalc();
    });
  });

  function getMonths() {
    const val = parseFloat(tenureInput.value) || 0;
    return tenureUnit === "years" ? Math.round(val * 12) : Math.round(val);
  }

  function recalc() {
    const principal = parseFloat(amountInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const months = getMonths();

    if (principal <= 0 || rate < 0 || months <= 0) return;

    const { emi, totalPayment, totalInterest } = calculateEMI(principal, rate, months);

    animateValue(emiOut, emi);
    totalInterestOut.textContent = formatCurrency(totalInterest);
    totalPaymentOut.textContent = formatCurrency(totalPayment);

    const principalPct = Math.round((principal / totalPayment) * 100);
    const interestPct = 100 - principalPct;
    if (principalOut) principalOut.textContent = principalPct + "%";
    if (interestOut) interestOut.textContent = interestPct + "%";

    if (chartCanvas) {
      drawDoughnutChart(chartCanvas, [
        { value: principal, color: "#123a63" },
        { value: totalInterest, color: "#2f8f5b" }
      ]);
    }

    if (tableBody) renderAmortization(principal, rate, months);
  }

  function animateValue(el, target) {
    if (!el) return;
    el.textContent = formatCurrency(target);
    el.classList.remove("updated");
    void el.offsetWidth;
    el.classList.add("updated");
  }

  function renderAmortization(principal, rate, months) {
    const rows = buildAmortizationSchedule(principal, rate, months);
    const frag = document.createDocumentFragment();
    rows.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.month + "</td>" +
        "<td>" + formatNumberIN(row.emi) + "</td>" +
        "<td>" + formatNumberIN(row.interest) + "</td>" +
        "<td>" + formatNumberIN(row.principal) + "</td>" +
        "<td>" + formatNumberIN(row.balance) + "</td>";
      frag.appendChild(tr);
    });
    tableBody.innerHTML = "";
    tableBody.appendChild(frag);
  }

  if (tableToggleBtn && amortSection) {
    tableToggleBtn.addEventListener("click", () => {
      const isHidden = amortSection.hasAttribute("hidden");
      if (isHidden) {
        amortSection.removeAttribute("hidden");
        tableToggleBtn.textContent = "Hide amortization schedule";
        amortSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        amortSection.setAttribute("hidden", "");
        tableToggleBtn.textContent = "View full amortization schedule";
      }
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      amountInput.value = 2500000;
      rateInput.value = 8.5;
      tenureInput.value = 20;
      tenureUnit = "years";
      tenureToggle.forEach(b => b.classList.toggle("active", b.dataset.tenureUnit === "years"));
      tenureInput.max = 30; tenureRange.max = 30;
      amountRange.value = amountInput.value;
      rateRange.value = rateInput.value;
      tenureRange.value = tenureInput.value;
      recalc();
    });
  }

  form.addEventListener("submit", e => { e.preventDefault(); recalc(); });

  recalc();
  window.addEventListener("resize", () => {
    clearTimeout(window.__emiResizeT);
    window.__emiResizeT = setTimeout(recalc, 200);
  });
}

/* ---------- Home page hero preview (lightweight, static-ish calc) ---------- */
function initHeroPreview() {
  const el = document.getElementById("hero-preview-emi");
  if (!el) return;
  const { emi, totalInterest, totalPayment } = calculateEMI(2500000, 8.5, 240);
  el.textContent = formatCurrency(emi);
  const ti = document.getElementById("hero-preview-interest");
  const tp = document.getElementById("hero-preview-total");
  if (ti) ti.textContent = formatCurrency(totalInterest);
  if (tp) tp.textContent = formatCurrency(totalPayment);
}

/* ---------- Mobile nav toggle ---------- */
function initNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  if (!header || !toggle) return;
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (!isOpen) header.querySelectorAll(".has-dropdown.expanded").forEach(item => item.classList.remove("expanded"));
  });

  header.querySelectorAll(".has-dropdown > a").forEach(link => {
    link.setAttribute("aria-expanded", "false");
    link.addEventListener("click", event => {
      if (!window.matchMedia("(max-width: 1024px)").matches) return;
      event.preventDefault();
      const item = link.parentElement;
      const willOpen = !item.classList.contains("expanded");
      header.querySelectorAll(".has-dropdown.expanded").forEach(other => {
        other.classList.remove("expanded");
        other.querySelector("a").setAttribute("aria-expanded", "false");
      });
      if (willOpen) { item.classList.add("expanded"); link.setAttribute("aria-expanded", "true"); }
    });
  });
}

/* ---------- Site identity ---------- */
function applyBrandIdentity() {
  document.title = document.title
    .replace(/EMI Compass/g, "Finura")
    .replace(/ — EMI Calculator/g, " — Finura")
    .replace(/\| EMI Calculator/g, "| Finura");
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/svg+xml";
    document.head.appendChild(favicon);
  }
  document.querySelectorAll('link[rel="icon"]').forEach(link => link.remove());
  const currentFavicon = document.createElement("link");
  currentFavicon.rel = "icon";
  currentFavicon.type = "image/svg+xml";
  currentFavicon.href = "favicon.svg?v=2";
  document.head.appendChild(currentFavicon);
  document.querySelectorAll('a[href="sitemap.html"]').forEach(link => {
    if (link.textContent.trim() === "All Articles") link.setAttribute("href", "all-articles.html");
  });
  document.querySelectorAll(".brand").forEach(brand => {
    brand.removeAttribute("style");
    brand.innerHTML = '<img class="brand-logo" src="brand-mark.svg" alt="Finura"> Finura';
  });
  document.querySelectorAll(".footer-bottom").forEach(footer => {
    footer.innerHTML = footer.innerHTML
      .replace(/EMI Compass/g, "Finura")
      .replace(/EMI Calculator\. All figures/g, "Finura. All figures");
  });
}

/* ---------- AdSense account metadata ---------- */
function addAdSenseAccountMetadata() {
  if (!document.querySelector('meta[name="google-adsense-account"]')) {
    const accountMeta = document.createElement("meta");
    accountMeta.name = "google-adsense-account";
    accountMeta.content = "ca-pub-7598871729388798";
    document.head.appendChild(accountMeta);
  }
  if (!document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
    const adsScript = document.createElement("script");
    adsScript.async = true;
    adsScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7598871729388798";
    adsScript.crossOrigin = "anonymous";
    document.head.appendChild(adsScript);
  }
}

/* ---------- Contact form (frontend-only validation) ---------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const successBox = document.getElementById("form-success");

  form.addEventListener("submit", e => {
    e.preventDefault();
    let valid = true;

    const fields = [
      { id: "cf-name", check: v => v.trim().length > 1 },
      { id: "cf-email", check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
      { id: "cf-subject", check: v => v.trim().length > 2 },
      { id: "cf-message", check: v => v.trim().length > 9 }
    ];

    fields.forEach(f => {
      const input = document.getElementById(f.id);
      const wrapper = input.closest(".field");
      if (!f.check(input.value)) {
        wrapper.classList.add("invalid");
        valid = false;
      } else {
        wrapper.classList.remove("invalid");
      }
    });

    if (valid) {
      form.reset();
      successBox.classList.add("show");
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => successBox.classList.remove("show"), 6000);
    }
  });
}

/* ---------- FAQ client-side search ---------- */
function initFaqSearch() {
  const input = document.getElementById("faq-search-input");
  const items = document.querySelectorAll(".faq-item");
  const emptyState = document.getElementById("faq-empty-state");
  if (!input || !items.length) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    let visibleCount = 0;
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const match = text.includes(q);
      item.style.display = match ? "" : "none";
      if (match) visibleCount++;
    });
    if (emptyState) emptyState.style.display = visibleCount === 0 ? "block" : "none";
  });
}

/* ---------- Article search (used on sitemap/articles listing) ---------- */
function initArticleSearch() {
  const input = document.getElementById("article-search-input");
  const cards = document.querySelectorAll("[data-article-card]");
  if (!input || !cards.length) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    cards.forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ---------- Shared chrome for guide pages ----------
   These pages use the same navigation and footer as the original site pages.
   Keeping the markup here prevents the guide template from drifting over time.
*/
function normalizeGuidePageChrome() {
  const header = document.querySelector(".site-header");
  if (!header || header.querySelector(".nav-toggle")) return;

  header.innerHTML =
    '<div class="container nav">' +
      '<a href="index.html" class="brand">' +
        '<img class="brand-logo" src="brand-mark.svg" alt="Finura"> Finura' +
      '</a>' +
      '<nav aria-label="Primary"><ul class="nav-links">' +
        '<li><a href="index.html">Home</a></li>' +
        '<li><a href="calculator.html">Calculator</a></li>' +
        '<li class="has-dropdown"><a href="home-loan-guide.html" aria-haspopup="true">Loan Guides</a><ul class="dropdown">' +
          '<li><a href="home-loan-guide.html">Home Loan EMI</a></li><li><a href="personal-loan-guide.html">Personal Loan EMI</a></li>' +
          '<li><a href="car-loan-guide.html">Car Loan EMI</a></li><li><a href="education-loan-guide.html">Education Loan EMI</a></li>' +
        '</ul></li>' +
        '<li class="has-dropdown"><a href="all-articles.html" aria-haspopup="true">Articles</a><ul class="dropdown">' +
          '<li><a href="how-to-calculate-emi.html">How EMI Is Calculated</a></li><li><a href="fixed-vs-floating.html">Fixed vs Floating Rates</a></li>' +
          '<li><a href="reduce-emi-guide.html">How to Reduce Your EMI</a></li><li><a href="loan-prepayment-guide.html">Loan Prepayment Explained</a></li>' +
          '<li><a href="credit-score-guide.html">Understanding Credit Score</a></li><li><a href="all-articles.html">All Articles</a></li>' +
        '</ul></li>' +
        '<li><a href="faq.html">FAQ</a></li><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li>' +
      '</ul></nav>' +
      '<div class="nav-cta"><a href="about.html" class="btn btn-secondary">About Us</a><a href="calculator.html" class="btn btn-primary">Open Calculator</a></div>' +
      '<button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false"><span></span></button>' +
    '</div>';

  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  footer.innerHTML =
    '<div class="container"><div class="footer-grid">' +
      '<div class="footer-brand"><div class="brand">' +
        '<img class="brand-logo" src="brand-mark.svg" alt="Finura"> Finura' +
      '</div><p>Independent, free loan planning tools for Indian borrowers. Not a bank, lender or financial advisor.</p></div>' +
      '<div><h4>Calculators</h4><ul><li><a href="calculator.html">EMI Calculator</a></li><li><a href="home-loan-guide.html">Home Loan</a></li><li><a href="car-loan-guide.html">Car Loan</a></li><li><a href="personal-loan-guide.html">Personal Loan</a></li></ul></div>' +
      '<div><h4>Guides</h4><ul><li><a href="how-to-calculate-emi.html">How EMI Works</a></li><li><a href="fixed-vs-floating.html">Fixed vs Floating</a></li><li><a href="reduce-emi-guide.html">Reduce Your EMI</a></li><li><a href="credit-score-guide.html">Credit Score</a></li></ul></div>' +
      '<div><h4>Company</h4><ul><li><a href="about.html">About Us</a></li><li><a href="contact.html">Contact</a></li><li><a href="faq.html">FAQ</a></li><li><a href="all-articles.html">All Articles</a></li><li><a href="sitemap.html">Sitemap</a></li></ul></div>' +
      '<div><h4>Legal</h4><ul><li><a href="privacy-policy.html">Privacy Policy</a></li><li><a href="terms-and-conditions.html">Terms of Use</a></li><li><a href="disclaimer.html">Disclaimer</a></li><li><a href="cookies.html">Cookie Policy</a></li></ul></div>' +
    '</div><div class="footer-bottom"><span>\u00A9 <span data-current-year></span> Finura. All figures are indicative estimates only.</span><div class="footer-links"><a href="privacy-policy.html">Privacy</a><a href="terms-and-conditions.html">Terms</a><a href="disclaimer.html">Disclaimer</a></div></div></div>';
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  normalizeGuidePageChrome();
  applyBrandIdentity();
  addAdSenseAccountMetadata();
  initNav();
  initCalculator();
  initHeroPreview();
  initContactForm();
  initFaqSearch();
  initArticleSearch();

  // Set current year in footer
  document.querySelectorAll("[data-current-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});
