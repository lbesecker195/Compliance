'use strict';

module.exports = function layout({ title, body, baseUrl = '', chrome }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="${baseUrl}/public/styles.css">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TJDDRBWMC5"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-TJDDRBWMC5');
  </script>
</head>
<body class="${chrome ? 'reader-body' : ''}">
${body}
</body>
</html>`;
};