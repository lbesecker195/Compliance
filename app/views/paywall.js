'use strict';

const layout = require('./layout');

module.exports = function paywallView(item, paypalUrl, successReturnUrl) {
  return layout({
    title: `Checkout — ${item.title} (${item.editionLabel}) · ACLA Account Brief`,
    body: `
<header class="site-header">
  <div class="brand">ACLA Account Brief</div>
  <div class="brand-sub">Healthcare / HIPAA · September 2026</div>
</header>
<main class="paywall">
  <div class="kicker">Paywall · ${item.title} (${item.editionLabel})</div>
  <h1>Unlock ${item.title} (${item.editionLabel})</h1>
  <div class="price">${item.price}</div>
  <p>${item.description}</p>

  <div style="margin: 2rem 0;">
    <a class="btn" style="background-color: #0070ba; color: white; text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 4px; display: inline-block; font-weight: bold;" href="${paypalUrl}">
      Pay ${item.price} with PayPal
    </a>
  </div>

  <p class="stub-note">
    <strong>Dev Test Bypass:</strong> Simulate PayPal completion directly without logging in to PayPal:<br>
    <a href="${successReturnUrl}">[Simulate PayPal Success Redirect]</a>
  </p>

  <p style="margin-top:1.4rem;font-size:0.9rem;color:var(--muted)">
    <a href="/">Back to catalog</a>
  </p>
</main>
<footer class="site-footer">
  <span>ACLA · Healthcare / HIPAA · September 2026</span>
  <a href="/logout">Clear session</a>
</footer>`,
  });
};