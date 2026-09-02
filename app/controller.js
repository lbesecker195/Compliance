'use strict';

const BriefModel = require('./model');
const paypalConfig = require('./paypalConfig');
const catalogView = require('./views/catalog');
const paywallView = require('./views/paywall');
const readerView = require('./views/reader');

function buildPaypalUrl(req, item, returnUrl) {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;
  const cancelUrl = encodeURIComponent(`${baseUrl}/brief/${item.sku}`);
  const encodedReturnUrl = encodeURIComponent(returnUrl);

  const paypalHost = paypalConfig.getBaseUrl();
  const businessEmail = encodeURIComponent(paypalConfig.email);
  const itemName = encodeURIComponent(`${item.title} - ${item.editionLabel}`);

  return `${paypalHost}/cgi-bin/webscr?cmd=_xclick&business=${businessEmail}&item_name=${itemName}&amount=${item.amount}&currency_code=${paypalConfig.currency}&return=${encodedReturnUrl}&cancel_return=${cancelUrl}`;
}

exports.getCatalog = (req, res) => {
  const briefs = BriefModel.getAllBriefs();
  res.status(200).type('html').send(catalogView(briefs));
};

exports.getBrief = (req, res) => {
  const sku = req.params.sku || req.path.replace('/', '');
  const item = BriefModel.getSkuInfo(sku);

  if (!item) {
    res.status(404).type('text').send('Brief not found');
    return;
  }

  if (!BriefModel.checkAccess(req, item.sku)) {
    const host = req.get('host');
    const protocol = req.protocol;
    const successReturnUrl = `${protocol}://${host}/paypal/success/${item.sku}`;
    const paypalUrl = buildPaypalUrl(req, item, successReturnUrl);

    res.status(200).type('html').send(paywallView(item, paypalUrl, successReturnUrl));
    return;
  }

  res.status(200).type('html').send(readerView(item));
};

exports.paypalSuccess = (req, res) => {
  const sku = req.params.sku || req.query.sku;
  const item = BriefModel.getSkuInfo(sku);

  if (!item) {
    res.status(404).type('text').send('Unknown SKU');
    return;
  }

  BriefModel.grantAccess(req, item.sku);

  req.session.save((err) => {
    if (err) console.error('Session save error:', err);
    res.redirect(303, `/brief/${item.sku}`);
  });
};

exports.buySku = (req, res) => {
  const rawSku = req.params.sku;
  const item = BriefModel.getSkuInfo(rawSku);

  if (!item) {
    res.status(404).type('text').send('Unknown SKU');
    return;
  }

  BriefModel.grantAccess(req, item.sku);

  req.session.save((err) => {
    if (err) console.error('Session save error:', err);
    res.redirect(303, `/brief/${item.sku}`);
  });
};

exports.getFile = async (req, res) => {
  const filename = req.params.file;
  const sku = BriefModel.getSkuFromFilename(filename);

  if (!sku) {
    res.status(404).type('text').send('Not found');
    return;
  }

  if (!BriefModel.checkAccess(req, sku)) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.status(402).type('text').send('Payment Required');
    return;
  }

  try {
    const pdfBuffer = await BriefModel.generatePdf(sku);

    res.status(200);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${sku}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'X-Content-Type-Options': 'nosniff',
    });

    res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).type('text').send(`Error generating PDF: ${error.message}`);
  }
};

exports.clearSession = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('acla.sid');
    res.redirect(303, '/');
  });
};