const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const p = path.join(publicDir, f);
  let c = fs.readFileSync(p, 'utf8');
  let changed = false;

  // For login.html
  if (f === 'index.html' || f === 'login.html') {
    const oldLoginLogo = `<div class="logo-area">
        <div class="logo-icon">📹</div>
        <div class="logo-name">ENQOVA</div>
        <div class="logo-sub">Point of Sale System</div>
      </div>`;
    const newLoginLogo = `<div class="logo-area">
        <img src="/img/logo.png" style="max-width:280px; max-height:90px; margin:0 auto 10px; display:block;" alt="ENQOVA Logo">
        <div class="logo-sub">Point of Sale System</div>
      </div>`;
    if (c.includes(oldLoginLogo)) {
      c = c.replace(oldLoginLogo, newLoginLogo);
      changed = true;
    }
    
    // Some might be single line
    const oldLoginLogoLine = `<div class="logo-area"><div class="logo-icon">📹</div><div class="logo-name">ENQOVA</div><div class="logo-sub">Point of Sale System</div></div>`;
    if (c.includes(oldLoginLogoLine)) {
      c = c.replace(oldLoginLogoLine, newLoginLogo);
      changed = true;
    }
  } else {
    // For sidebar logos (multi-line)
    const oldSidebarLogoMulti = `<div class="sidebar-logo">
      <div class="logo-icon">📹</div>
      <div class="logo-text"><div class="logo-name">ENQOVA</div><div class="logo-sub">POS System</div></div>
    </div>`;
    const newSidebarLogo = `<div class="sidebar-logo" style="display:flex; justify-content:center; align-items:center; padding: 20px 10px; height: auto;">
      <img src="/img/logo.png" style="max-width:100%; max-height:45px;" alt="ENQOVA">
    </div>`;
    if (c.includes(oldSidebarLogoMulti)) {
      c = c.replace(oldSidebarLogoMulti, newSidebarLogo);
      changed = true;
    }
    
    // For sidebar logos (single-line)
    const oldSidebarLogoSingle = `<div class="sidebar-logo"><div class="logo-icon">📹</div><div class="logo-text"><div class="logo-name">ENQOVA</div><div class="logo-sub">POS System</div></div></div>`;
    if (c.includes(oldSidebarLogoSingle)) {
      c = c.replace(oldSidebarLogoSingle, newSidebarLogo);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(p, c);
    console.log('Updated logo in ' + f);
  }
});
