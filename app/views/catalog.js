'use strict';

const layout = require('./layout');

function slugify(text) {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');
}

function formatPrice(price) {
  if (!price) return '';
  const priceStr = String(price);
  if (priceStr.includes('1500') || priceStr.includes('1,500')) {
    return `<span style="text-decoration: line-through; opacity: 0.7; font-size: 0.85em; margin-right: 6px;">$10,000</span>${priceStr}`;
  }
  return priceStr;
}

module.exports = function catalogView(briefsMap) {
  const stubs = Object.keys(briefsMap);

  const accordionHtml = stubs.map((stub) => {
    const brief = briefsMap[stub];
    const anchorId = slugify(brief.title || stub);

    const previewCard = brief.preview ? `
      <div class="card">
        <span class="badge">Preview Edition</span>
        <div class="price">${formatPrice(brief.preview.price)}</div>
        <p>${brief.preview.description}</p>
        <a class="btn" href="brief/${brief.preview.sku}">Open Preview Edition</a>
      </div>` : '';

    const fullCard = brief.full ? `
      <div class="card">
        <span class="badge">Full Report</span>
        <div class="price">${formatPrice(brief.full.price)}</div>
        <p>${brief.full.description}</p>
        <a class="btn" href="brief/${brief.full.sku}">Open Full Report</a>
      </div>` : '';

    return `
      </br>
      <details class="accordion" id="${anchorId}">
        <summary class="accordion-summary">
          <strong>${brief.title}</strong>
          <a class="anchor-link" href="#${anchorId}" title="Direct Link">#</a>
        </summary>
        <div class="accordion-content cards">
          ${previewCard}
          ${fullCard}
        </div>
      </details>`;
  }).join('');

  return layout({
    title: 'Incident Report Briefs — Catalog',
    baseUrl: process.env.BASE_URL || '',
    body: `
<header class="site-header">
  <div class="brand">Incident Report Briefs</div>
  <div class="brand-sub">Incident Response & Intelligence</div>
</header>
<main class="wrap">
  <div class="banner discount-banner" style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; padding:12px; margin-bottom:20px; border-radius:4px; text-align:center;">
    <strong>Limited Time Offer: <span style="text-decoration: line-through; opacity: 0.7; margin-right: 4px;">$10,000</span> $1,500</strong> — Discount expires in <span id="discount-timer" style="font-weight:bold; color:#d9534f;">10:00:00</span>
  </div>
  <div class="hero">
    <div class="kicker">Security Operations</div>
    <h1>Incident Report Briefs</h1>
    <p>Available incident report briefs detected in <code>/briefs</code>.</p>
  </div>
  <div class="accordion-list">
    ${accordionHtml || '<p>No incident report briefs found in <code>/briefs</code> directory.</p>'}
  </div>
</main>
<footer class="site-footer">
  <span>Incident Response & Security Operations</span>
  <a href="/logout">Clear session</a>
</footer>
<script>
  (function initDiscountTimer() {
    const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
    let endTime = localStorage.getItem('catalog_offer_end');

    if (!endTime || Date.now() > parseInt(endTime, 10)) {
      endTime = Date.now() + TEN_HOURS_MS;
      localStorage.setItem('catalog_offer_end', endTime);
    } else {
      endTime = parseInt(endTime, 10);
    }

    function updateDisplay() {
      const remaining = Math.max(0, endTime - Date.now());
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      const formatted = [hours, minutes, seconds]
        .map(v => String(v).padStart(2, '0'))
        .join(':');

      const el = document.getElementById('discount-timer');
      if (el) el.textContent = formatted;

      if (remaining <= 0) {
        endTime = Date.now() + TEN_HOURS_MS;
        localStorage.setItem('catalog_offer_end', endTime);
      }
    }

    updateDisplay();
    setInterval(updateDisplay, 1000);
  })();

  (function autoExpandHashAccordion() {
    function handleHash() {
      const hash = window.location.hash;
      if (!hash) return;
      const target = document.getElementById(hash.substring(1));
      if (target) {
        if (target.tagName.toLowerCase() === 'details') {
          target.open = true;
        } else {
          const parentDetails = target.closest('details');
          if (parentDetails) parentDetails.open = true;
        }
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
    window.addEventListener('DOMContentLoaded', handleHash);
    window.addEventListener('hashchange', handleHash);
  })();
</script>`,
  });
};