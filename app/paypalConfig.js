'use strict';

const paypalConfig = {
  // Merchant PayPal account email address
  email: process.env.PAYPAL_EMAIL || 'lbesecker195@gmail.com',

  // Operating mode: 'sandbox' or 'live'
  mode: process.env.PAYPAL_MODE || 'sandbox',

  // Currency code
  currency: process.env.PAYPAL_CURRENCY || 'USD',

  // Optional REST API credentials for Future Smart Buttons / SDK integrations
  clientId: process.env.PAYPAL_CLIENT_ID || 'ASKRz0h-xZX4xGM30iiQEegGl88pfQlLOkBJZJ3iUZHGvSwW1nTUw1MRzYXrbFECIE4_XVRxRku3AP4f',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'EDeZ7Hi5k2cvx9RFxOkjJn9ycJpKIW3ooD7ejlw4rTaMyvVxK4DyPANmB82kFvan4yd0X0Wgh9qA5YHy',

  /**
   * Resolves the PayPal checkout endpoint based on the active mode
   */
  getBaseUrl() {
    return this.mode === 'live'
      ? 'https://www.paypal.com'
      : 'https://www.sandbox.paypal.com';
  },
};

module.exports = paypalConfig;