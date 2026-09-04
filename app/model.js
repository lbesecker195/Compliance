'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const { grantAccess, hasAccess } = require('./lib/payments');

const BRIEFS_DIR = path.join(__dirname, 'briefs');

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    browserInstance.on('disconnected', () => {
      browserInstance = null;
    });
  }
  return browserInstance;
}

class BriefModel {
  static scanBriefs() {
    const briefsMap = {};

    if (!fs.existsSync(BRIEFS_DIR)) {
      return briefsMap;
    }

    const files = fs.readdirSync(BRIEFS_DIR);

    files.forEach((file) => {
      if (!file.toLowerCase().endsWith('.md')) return;

      const filename = file;
      const match = file.match(/^(.*?)(?:[-_.\s]*(preview|full))?\.md$/i);
      if (!match) return;

      const rawStub = match[1];
      const specifiedEdition = match[2] ? match[2].toLowerCase() : null;

      let stub = rawStub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!stub) stub = 'default';

      const displayTitle = rawStub
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      if (!briefsMap[stub]) {
        briefsMap[stub] = {
          stub,
          title: displayTitle || 'Account Brief',
          preview: null,
          full: null,
        };
      }

      const createEditionObj = (edition) => {
        const isPreview = edition === 'preview';
        const sku = `${stub}-${edition}`;
        return {
          sku,
          stub,
          edition,
          filepath: path.join(BRIEFS_DIR, filename),
          filename: `${sku}.pdf`,
          title: displayTitle,
          editionLabel: isPreview ? 'Wimpy' : 'Full',
          price: isPreview ? '$50' : '$10,000',
          amount: isPreview ? '50.00' : '10000.00',
          description: isPreview
            ? 'Condensed account brief positioning and surface area.'
            : 'Complete brief with full coverage, unredacted narrative, and recommended motions.',
        };
      };

      if (specifiedEdition) {
        briefsMap[stub][specifiedEdition] = createEditionObj(specifiedEdition);
      } else {
        briefsMap[stub].preview = createEditionObj('preview');
        briefsMap[stub].full = createEditionObj('full');
      }
    });

    return briefsMap;
  }

  static getAllBriefs() {
    return this.scanBriefs();
  }

  static getSkuInfo(skuKey) {
    if (!skuKey) return null;
    const briefs = this.scanBriefs();
    for (const stub in briefs) {
      const b = briefs[stub];
      if (b.preview && (b.preview.sku === skuKey || skuKey === 'preview')) return b.preview;
      if (b.full && (b.full.sku === skuKey || skuKey === 'full')) return b.full;
    }
    return null;
  }

  static getSkuFromFilename(filename) {
    if (!filename) return null;
    const skuKey = filename.replace(/\.pdf$/i, '');
    return this.getSkuInfo(skuKey) ? skuKey : null;
  }

  static async generatePdf(skuKey) {
    const item = this.getSkuInfo(skuKey);
    if (!item || !fs.existsSync(item.filepath)) {
      throw new Error(`Markdown file not found for SKU: ${skuKey}`);
    }

    const isPreview = item.edition === 'preview';

    let markdownContent = fs.readFileSync(item.filepath, 'utf8');

    const editionLabel = isPreview ? 'WIMPY_EDITION' : 'Full Edition';

    markdownContent = markdownContent
      .replace(/WIMPY_EDITION/g, editionLabel)
      .replace(/FULL_EDITION/g, editionLabel)
      .replace(/\{\{\s*EDITION\s*\}\}/g, editionLabel)
      .replace(/\[EDITION\]/gi, editionLabel);

    const rawHtmlContent = await marked.parse(markdownContent);

    const redactionStyles = isPreview
      ? `
        .redacted {
          background-color: #1a1a1a;
          color: transparent;
          user-select: none;
          border-radius: 3px;
          padding: 0 4px;
        }
      `
      : `
        .redacted {
          background-color: transparent;
          color: inherit;
        }
      `;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1, h2, h3 { color: #111; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
    ${redactionStyles}
  </style>
</head>
<body>
  ${rawHtmlContent}
</body>
</html>`;

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  static checkAccess(req, sku) {
    if (!sku) return false;
    const item = this.getSkuInfo(sku);
    const edition = item ? item.edition : (sku.includes('full') ? 'full' : 'preview');

    return (
      hasAccess(req, sku) ||
      hasAccess(req, edition) ||
      (req.session && req.session.grantedSkus && (req.session.grantedSkus[sku] || req.session.grantedSkus[edition]))
    );
  }

  static grantAccess(req, sku) {
    if (!sku) return;
    const item = this.getSkuInfo(sku);
    const edition = item ? item.edition : (sku.includes('full') ? 'full' : 'preview');

    try { grantAccess(req, sku); } catch (e) {}
    try { grantAccess(req, edition); } catch (e) {}

    if (req.session) {
      if (!req.session.grantedSkus) req.session.grantedSkus = {};
      req.session.grantedSkus[sku] = true;
      req.session.grantedSkus[edition] = true;
    }
  }
}

module.exports = BriefModel;