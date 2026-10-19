const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
files.forEach(f => {
  const p = path.join(publicDir, f);
  let c = fs.readFileSync(p, 'utf8');
  // Remove <span class="nav-icon">...</span>
  c = c.replace(/<span class="nav-icon">.*?<\/span>\s*/g, '');
  fs.writeFileSync(p, c);
  console.log('Removed icons from ' + f);
});
