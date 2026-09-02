'use strict';

module.exports = function layout({ title, body, baseUrl = '', chrome }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="${baseUrl}/public/styles.css">
</head>
<body class="${chrome ? 'reader-body' : ''}">
${body}
</body>
</html>`;
};