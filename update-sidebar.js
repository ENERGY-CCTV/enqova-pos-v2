const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
files.forEach(f => {
  const p = path.join(publicDir, f);
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('invoices.html') && c.includes('quotations.html')) {
    c = c.replace(
      /(<a href="\/quotations\.html".*?>)/,
      '<a href="/invoices.html" class="nav-item"><span class="nav-icon">📄</span> Invoice</a>\n      $1'
    );
    fs.writeFileSync(p, c);
    console.log('Updated ' + f);
  }
});
