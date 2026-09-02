'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const controller = require('./controller');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'acla-dev-session-secret-change-me';

const app = express();

// Define base URL prefix (e.g., '/Compliance' in production, '' locally)
const BASE_URL = process.env.BASE_URL || '';

app.disable('x-powered-by');
app.use(cookieParser());
app.use(
  session({
    name: 'acla.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Static CSS delivery
app.use('/public', express.static(path.join(__dirname, 'public')));

// Make baseUrl accessible in all requests/views
app.locals.baseUrl = BASE_URL;

// Catalog Route
app.get('/', controller.getCatalog);

// PayPal Success Redirect Route
app.get('/paypal/success/:sku', controller.paypalSuccess);
app.get('/paypal/success', controller.paypalSuccess);

// Brief Readers / Paywalls
app.get('/preview', controller.getBrief);
app.get('/full', controller.getBrief);
app.get('/brief/:sku', controller.getBrief);

// Checkout & PDF File serving
app.post('/buy/:sku', controller.buySku);
app.get('/files/:file', controller.getFile);

// Auth / Session Reset
app.get('/logout', controller.clearSession);
app.get('/clear', controller.clearSession);

app.listen(PORT, () => {
  console.log(`ACLA briefs app listening on http://localhost:${PORT}`);
});