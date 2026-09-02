'use strict';

/**
 * Stub payment/access module.
 *
 * grantAccess() currently records a purchase on the session with no charge.
 * When real payments land, replace the stub grant inside POST /buy/:sku
 * (after a successful Stripe PaymentIntent / Checkout Session) with:
 *
 *   // const payment = await stripe.paymentIntents.create({ ... });
 *   // if (payment.status !== 'succeeded') throw new Error('payment failed');
 *   grantAccess(req, sku);
 *
 * Do not implement Stripe in this stub.
 */

const SKUS = {
  preview: {
    id: 'preview',
    title: 'Preview',
    price: '$29',
    filename: 'preview.pdf',
    description: 'Condensed ACLA account brief — Healthcare / HIPAA overview.',
  },
  full: {
    id: 'full',
    title: 'Full',
    price: '$149',
    filename: 'full.pdf',
    description: 'Complete ACLA account brief with full HIPAA coverage and MSP recommendations.',
  },
};

function normalizeSku(sku) {
  return sku === 'preview' || sku === 'full' ? sku : null;
}

/**
 * Grant session access for a SKU.
 * Buying `full` also unlocks `preview`. Buying `preview` does not unlock `full`.
 *
 * STRIPE HOOK: call this only after a successful Stripe charge. This function
 * itself must remain charge-free; it only mutates the session entitlements.
 */
function grantAccess(req, sku) {
  const id = normalizeSku(sku);
  if (!id || !req.session) return false;

  if (!req.session.purchases) {
    req.session.purchases = {};
  }

  req.session.purchases[id] = true;

  if (id === 'full') {
    req.session.purchases.preview = true;
  }

  return true;
}

/**
 * Whether this session may read the given SKU's PDF.
 * Full purchase implies preview access.
 */
function hasAccess(req, sku) {
  const id = normalizeSku(sku);
  if (!id) return false;

  const purchases = (req.session && req.session.purchases) || {};

  if (id === 'full') {
    return purchases.full === true;
  }

  return purchases.preview === true || purchases.full === true;
}

module.exports = {
  SKUS,
  normalizeSku,
  grantAccess,
  hasAccess,
};
