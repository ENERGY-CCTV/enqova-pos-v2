const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');

const navHtml = `    <nav class="sidebar-nav">
      <div class="nav-section-label">Main</div>
      <a href="/dashboard.html" class="nav-item{DASHBOARD_ACTIVE}"><span class="nav-icon">📊</span> Dashboard</a>
      <a href="/pos.html" class="nav-item{POS_ACTIVE}"><span class="nav-icon">🛒</span> POS / Billing</a>
      <a href="/invoices.html" class="nav-item{INVOICES_ACTIVE}"><span class="nav-icon">📄</span> Invoice</a>
      <a href="/quotations.html" class="nav-item{QUOTATIONS_ACTIVE}"><span class="nav-icon">📄</span> Quotations</a>
      <div class="nav-section-label">Inventory</div>
      <a href="/products.html" class="nav-item{PRODUCTS_ACTIVE}"><span class="nav-icon">📦</span> Products</a>
      <a href="/grn.html" class="nav-item{GRN_ACTIVE}"><span class="nav-icon">📋</span> GRN</a>
      <a href="/transfers.html" class="nav-item{TRANSFERS_ACTIVE}"><span class="nav-icon">🔄</span> Transfers</a>
      <div class="nav-section-label">CRM</div>
      <a href="/customers.html" class="nav-item{CUSTOMERS_ACTIVE}"><span class="nav-icon">👥</span> Customers</a>
      <a href="/warranties.html" class="nav-item{WARRANTIES_ACTIVE}"><span class="nav-icon">🔧</span> Warranty <span class="nav-badge" id="navWarrantyBadge" style="display:none">0</span></a>
      <a href="/service.html" class="nav-item{SERVICE_ACTIVE}"><span class="nav-icon">🛠️</span> Service Center</a>
      <a href="/jobsheets.html" class="nav-item{JOBSHEETS_ACTIVE}"><span class="nav-icon">📋</span> Job Sheets</a>
      <div class="nav-section-label">Business</div>
      <a href="/reports.html" class="nav-item{REPORTS_ACTIVE}"><span class="nav-icon">📈</span> Reports</a>
      <a href="/users.html" class="nav-item{USERS_ACTIVE}" id="navUsers"><span class="nav-icon">👤</span> Users</a>
      <a href="/settings.html" class="nav-item{SETTINGS_ACTIVE}"><span class="nav-icon">⚙️</span> Settings</a>
    </nav>`;

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const p = path.join(publicDir, f);
  let c = fs.readFileSync(p, 'utf8');

  // Skip if no sidebar
  if (!c.includes('<nav class="sidebar-nav">')) return;

  // Determine active item
  let renderedNav = navHtml;
  renderedNav = renderedNav.replace('{DASHBOARD_ACTIVE}', f === 'dashboard.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{POS_ACTIVE}', f === 'pos.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{INVOICES_ACTIVE}', f === 'invoices.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{QUOTATIONS_ACTIVE}', f === 'quotations.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{PRODUCTS_ACTIVE}', f === 'products.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{GRN_ACTIVE}', f === 'grn.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{TRANSFERS_ACTIVE}', f === 'transfers.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{CUSTOMERS_ACTIVE}', f === 'customers.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{WARRANTIES_ACTIVE}', f === 'warranties.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{SERVICE_ACTIVE}', f === 'service.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{JOBSHEETS_ACTIVE}', f === 'jobsheets.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{REPORTS_ACTIVE}', f === 'reports.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{USERS_ACTIVE}', f === 'users.html' ? ' active' : '');
  renderedNav = renderedNav.replace('{SETTINGS_ACTIVE}', f === 'settings.html' ? ' active' : '');

  // Regex to replace everything between <nav class="sidebar-nav"> and </nav>
  c = c.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/, renderedNav);
  
  fs.writeFileSync(p, c);
  console.log('Unified sidebar in ' + f);
});
