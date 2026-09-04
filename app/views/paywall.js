'use strict';

const layout = require('./layout');

function formatPrice(price) {
  if (!price) return '';
  const priceStr = String(price);
  if (priceStr.includes('1500') || priceStr.includes('1,500')) {
    return `<span style="text-decoration: line-through; opacity: 0.7; font-size: 0.85em; margin-right: 6px;">$10,000</span>${priceStr}`;
  }
  return priceStr;
}

module.exports = function paywallView(item, paypalUrl, successReturnUrl) {
  const isLive = process.env.PAYPAL_MODE === 'live';

  const devBypassHtml = isLive
    ? `<!--
  <p class="stub-note">
    <strong>Dev Test Bypass:</strong> Simulate PayPal completion directly without logging in to PayPal:<br>
    <a href="${successReturnUrl}">[Simulate PayPal Success Redirect]</a>
  </p>
  -->`
    : `
  <p class="stub-note">
    <strong>Dev Test Bypass:</strong> Simulate PayPal completion directly without logging in to PayPal:<br>
    <a href="${successReturnUrl}">[Simulate PayPal Success Redirect]</a>
  </p>`;

  const formattedPrice = formatPrice(item.price);

  return layout({
    title: `Checkout — ${item.title} (${item.editionLabel}) · ACLA Account Brief`,
    baseUrl: process.env.BASE_URL || '',
    body: `
<header class="site-header">
  <div class="brand">ACLA Account Brief</div>
  <div class="brand-sub">Healthcare / HIPAA · September 2026</div>
</header>
<main class="paywall">
  <div class="banner discount-banner" style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; padding:12px; margin-bottom:20px; border-radius:4px; text-align:center;">
    <strong>Limited Time Offer: <span style="text-decoration: line-through; opacity: 0.7; margin-right: 4px;">$10,000</span> $1,500</strong> — Discount expires in <span id="discount-timer" style="font-weight:bold; color:#d9534f;">10:00:00</span>
  </div>
  <div class="kicker">Paywall · ${item.title} (${item.editionLabel})</div>
  <h1>Unlock ${item.title} (${item.editionLabel})</h1>
  <div class="price">${formattedPrice}</div>
  <p>${item.description}</p>

  <div style="margin: 2rem 0;">
    <a class="btn" style="background-color: #0070ba; color: white; text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 4px; display: inline-block; font-weight: bold;" href="${paypalUrl}">
      Pay ${formattedPrice} with PayPal
    </a>
  </div>

  ${devBypassHtml}

  <p style="margin-top:1.4rem;font-size:0.9rem;color:var(--muted)">
    <a href="${process.env.BASE_URL || ''}/">Back to catalog</a>
  </p>
</main>
<footer class="site-footer">
  <span>ACLA · Healthcare / HIPAA · September 2026</span>
  <a href="${process.env.BASE_URL || ''}/logout">Clear session</a>
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
</script>`,
  });
};