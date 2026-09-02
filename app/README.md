# ACLA Account Brief

Server-rendered Express host for ACLA account brief PDFs with a stub paywall.
Healthcare / HIPAA, September 2026, prepared for Nashville MSPs.

## Start

Working directory is /workspace/acla-briefs-app.
Use the package start script. Bind address uses PORT or 3000.
SESSION_SECRET may be set; otherwise a development secret is used.

## Public URLs

- Catalog: http://localhost:3000/ — two cards, Preview ($29) and Full ($149). Separate pages; both PDFs are not on one page.
- Preview: http://localhost:3000/preview — paywall until purchased, then the preview PDF iframe.
- Full: http://localhost:3000/full — paywall until purchased, then the full PDF iframe.

Protected file routes:

- http://localhost:3000/files/preview.pdf
- http://localhost:3000/files/full.pdf

## Stub paywall

The product is paywalled. Unpurchased visitors to /preview or /full see a checkout page for that SKU, not the PDF iframe.

- Session uses express-session with an httpOnly cookie named acla.sid.
- Purchase is a form post to /buy/:sku (preview or full). The button is labeled "Checkout stub -- payment processing comes later." Access is granted without charging.
- Buying full also unlocks preview. Buying preview does not unlock full.
- Unauthorized /files/*.pdf requests return 402 Payment Required.
- GET /logout (or /clear) destroys the session so the paywall can be re-tested.

briefs/ is never mounted as static files. Reader iframes load the /files routes after access is granted.

## Where real payments plug in

lib/payments.js is the single module:

- grantAccess(req, sku)
- hasAccess(req, sku)

A later Stripe charge would replace the stub grant on the buy route, then call grantAccess. This app does not implement Stripe.

## Source PDFs

Copied originals (not regenerated):

- briefs/preview.pdf from /workspace/ACLA-Account-Brief-Preview.pdf
- briefs/full.pdf from /workspace/ACLA-Account-Brief-Full.pdf
