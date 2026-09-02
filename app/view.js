'use strict';

function layout({ title, body, chrome }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body class="${chrome ? 'reader-body' : ''}">
${body}
</body>
</html>`;
}

function catalogPage() {
  return layout({
    title: 'ACLA Account Brief — Catalog',
    body: `
<header class="site-header">
  <div class="brand">ACLA Account Brief</div>
  <div class="brand-sub">Healthcare / HIPAA · September 2026</div>
</header>
<main class="wrap">
  <div class="hero">
    <div class="kicker">Prepared for Nashville MSPs</div>
    <h1>ACLA Account Brief</h1>
    <p>Two editions of the September 2026 healthcare / HIPAA brief. Each version has its own reader — choose Preview or Full.</p>
  </div>
  <div class="cards">
    <article class="card">
      <span class="badge">Edition</span>
      <h2>Preview</h2>
      <div class="price">$29</div>
      <p>Condensed account brief: ACLA positioning, HIPAA surface area, and what Nashville MSPs need to know before a first conversation.</p>
      <a class="btn" href="/preview">Open Preview</a>
    </article>
    <article class="card">
      <span class="badge">Edition</span>
      <h2>Full</h2>
      <div class="price">$149</div>
      <p>Complete brief with full HIPAA coverage, recommended MSP motions, and the unredacted account narrative. Buying Full also unlocks Preview.</p>
      <a class="btn" href="/full">Open Full</a>
    </article>
  </div>
</main>
<footer class="site-footer">
  <span>ACLA · Healthcare / HIPAA · September 2026 · Nashville MSPs</span>
  <a href="/logout">Clear session</a>
</footer>`,
  });
}

function paywallPage(item, sku) {
  return layout({
    title: `Checkout — ${item.title} · ACLA Account Brief`,
    body: `
<header class="site-header">
  <div class="brand">ACLA Account Brief</div>
  <div class="brand-sub">Healthcare / HIPAA · September 2026</div>
</header>
<main class="paywall">
  <div class="kicker">Stub paywall · ${item.title} edition</div>
  <h1>Unlock the ${item.title} brief</h1>
  <div class="price">${item.price}</div>
  <p>${item.description} Prepared for Nashville MSPs, September 2026.</p>
  <p class="stub-note">Checkout stub — payment processing comes later. This form grants access without charging a card. Real Stripe charges will replace the stub grant in <code>lib/payments.js</code>.</p>
  <form method="post" action="/buy/${item.id}">
    <button class="btn" type="submit">Checkout stub — payment processing comes later</button>
  </form>
  <p style="margin-top:1.4rem;font-size:0.9rem;color:var(--muted)">
    <a href="/">Back to catalog</a>
    ${sku === 'full' ? '' : ' · <a href="/full">See Full edition ($149)</a>'}
  </p>
</main>
<footer class="site-footer">
  <span>No charge in this stub. Session access only.</span>
  <a href="/logout">Clear session</a>
</footer>`,
  });
}

function readerPage(item) {
  return layout({
    title: `${item.title} · ACLA Account Brief`,
    chrome: true,
    body: `
<div class="reader">
  <header class="reader-chrome">
    <div class="reader-title">
      <span class="version-label">${item.title} edition</span>
      <strong>ACLA Account Brief</strong>
    </div>
    <nav>
      <a href="/">Catalog</a>
      &nbsp;·&nbsp;
      <a href="/logout">Clear session</a>
    </nav>
  </header>
  <iframe title="ACLA Account Brief ${item.title} PDF" src="/files/${item.filename}"></iframe>
</div>`,
  });
}

module.exports = {
  catalogPage,
  paywallPage,
  readerPage,
};