/**
 * Copy dist/index.html to dist/404.html for GitHub Pages.
 * When a route like /funk-brokers/begin-sale is requested directly (or refreshed),
 * the server returns 404 and serves 404.html. Using the SPA as 404 makes the app load
 * and React Router can render the correct route from the URL.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist', 'index.html');
const dest = path.join(__dirname, '..', 'dist', '404.html');

if (!fs.existsSync(src)) {
  console.warn('copy-404: dist/index.html not found, skipping');
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log('copy-404: copied index.html → 404.html');
