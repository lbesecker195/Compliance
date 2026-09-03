'use strict';

const layout = require('./layout');

module.exports = function readerView(item) {
  return layout({
    title: `${item.title} (${item.editionLabel}) · ACLA Account Brief`,
    baseUrl: process.env.BASE_URL || '',
    chrome: true,
    body: `
<div class="reader">
  <header class="reader-chrome">
    <div class="reader-title">
      <span class="version-label">${item.title} — ${item.editionLabel} Edition</span>
      <strong>ACLA Account Brief</strong>
    </div>
    <nav>
      <a href="/">Catalog</a>
      &nbsp;·&nbsp;
      <a href="/logout">Clear session</a>
    </nav>
  </header>
  <iframe title="${item.title} ${item.editionLabel} PDF" src="/files/${item.sku}.pdf"></iframe>
</div>`,
  });
};