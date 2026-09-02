'use strict';

const layout = require('./layout');

function slugify(text) {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');
}

module.exports = function catalogView(briefsMap) {
  const stubs = Object.keys(briefsMap);

  const accordionHtml = stubs.map((stub) => {
    const brief = briefsMap[stub];
    const anchorId = slugify(brief.title || stub);

    const previewCard = brief.preview ? `
      <div class="card">
        <span class="badge">Preview Edition</span>
        <div class="price">${brief.preview.price}</div>
        <p>${brief.preview.description}</p>
        <a class="btn" href="/brief/${brief.preview.sku}">Open Preview</a>
      </div>` : '';

    const fullCard = brief.full ? `
      <div class="card">
        <span class="badge">Full Edition</span>
        <div class="price">${brief.full.price}</div>
        <p>${brief.full.description}</p>
        <a class="btn" href="/brief/${brief.full.sku}">Open Full</a>
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
    title: 'ACLA Account Brief — Catalog',
    body: `
<header class="site-header">
  <div class="brand">ACLA Account Brief</div>
  <div class="brand-sub">Healthcare / HIPAA · September 2026</div>
</header>
<main class="wrap">
  <div class="hero">
    <div class="kicker">Prepared for Nashville MSPs</div>
    <h1>ACLA Account Briefs</h1>
    <p>Available healthcare / HIPAA account briefs detected in <code>/briefs</code>.</p>
  </div>
  <div class="accordion-list">
    ${accordionHtml || '<p>No briefs found in <code>/briefs</code> directory.</p>'}
  </div>
</main>
<footer class="site-footer">
  <span>ACLA · Healthcare / HIPAA · September 2026 · Nashville MSPs</span>
  <a href="/logout">Clear session</a>
</footer>
<script>
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