const fs = require('fs');

let html = fs.readFileSync('public/dashboard.html', 'utf8');

const newPageBody = `
    <div class="page-body">
      <!-- Global Stats -->
      <div class="stats-grid" id="globalStatsGrid" style="margin-bottom:30px;">
        <div class="stat-card hover-card" onclick="location.href='/customers.html'" style="cursor:pointer;"><div class="stat-icon purple">👥</div><div><div class="stat-value" id="totalCustomers">0</div><div class="stat-label">Total Customers</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/products.html'" style="cursor:pointer;"><div class="stat-icon blue">📦</div><div><div class="stat-value" id="totalProducts">0</div><div class="stat-label">Active Products</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/products.html?filter=lowstock'" style="cursor:pointer;"><div class="stat-icon orange">⚠️</div><div><div class="stat-value" id="globalLowStock">0</div><div class="stat-label">Total Low Stock Alerts</div></div></div>
      </div>

      <!-- Branches Container -->
      <div id="branchesContainer" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:20px;">
        <!-- Dynamically injected by JS -->
      </div>
    </div>
`;

// Replace page-body
html = html.replace(/<div class="page-body">[\s\S]*?(?=<div class="ai-panel">)/, newPageBody);

// Replace headerBranch if exists to be removed or hidden
html = html.replace(/<span class="branch-badge" id="headerBranch">Branch<\/span>/, '');

const jsLogic = `
  async function loadDashboardData() {
    try {
      const res = await fetch('/api/reports/dashboard', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('enqova_token') } });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (!data.success) return;
      
      const d = data.data;

      // Update Global Stats
      if (document.getElementById('totalCustomers')) document.getElementById('totalCustomers').textContent = d.global.total_customers || 0;
      if (document.getElementById('totalProducts')) document.getElementById('totalProducts').textContent = d.global.total_products || 0;
      if (document.getElementById('globalLowStock')) document.getElementById('globalLowStock').textContent = d.global.low_stock_items?.length || 0;

      // Render Branches
      const bContainer = document.getElementById('branchesContainer');
      if (bContainer) {
        bContainer.innerHTML = d.branches.map(b => \`
          <div class="card" style="padding:0; overflow:hidden;">
            <div class="card-header" style="background:var(--card-bg); border-bottom:1px solid var(--border); padding:15px 20px;">
              <h2 style="margin:0; font-size:18px; color:var(--accent);">🏢 \${b.name} Branch</h2>
            </div>
            <div style="padding:20px;">
              
              <!-- Branch Stats -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                <div class="stat-card hover-card" style="padding:15px;"><div class="stat-icon blue" style="width:36px;height:36px;font-size:18px;">💰</div><div><div class="stat-value" style="font-size:20px;">Rs. \${b.todaySales.total.toLocaleString(undefined,{minimumFractionDigits:2})}</div><div class="stat-label">Today's Sales (\${b.todaySales.count})</div></div></div>
                <div class="stat-card hover-card" style="padding:15px;"><div class="stat-icon green" style="width:36px;height:36px;font-size:18px;">📅</div><div><div class="stat-value" style="font-size:20px;">Rs. \${b.monthSales.total.toLocaleString(undefined,{minimumFractionDigits:2})}</div><div class="stat-label">Month's Sales (\${b.monthSales.count})</div></div></div>
              </div>

              <!-- Branch Alerts -->
              <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1; background:rgba(255,71,87,0.1); border:1px solid rgba(255,71,87,0.2); padding:10px; border-radius:8px; display:flex; align-items:center; gap:10px;">
                  <span style="font-size:20px;">🔧</span>
                  <div><div style="font-weight:bold; color:var(--red);">\${b.pendingWarranties}</div><div style="font-size:11px; color:var(--muted);">Pending Warranties</div></div>
                </div>
                <div style="flex:1; background:rgba(240,165,0,0.1); border:1px solid rgba(240,165,0,0.2); padding:10px; border-radius:8px; display:flex; align-items:center; gap:10px;">
                  <span style="font-size:20px;">⚠️</span>
                  <div><div style="font-weight:bold; color:var(--orange);">\${b.stockAlerts}</div><div style="font-size:11px; color:var(--muted);">Low Stock Alerts</div></div>
                </div>
              </div>

              <!-- Recent Invoices -->
              <h3 style="font-size:14px; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:5px;">Recent Invoices</h3>
              <div class="table-wrapper" style="margin-bottom:20px;">
                <table class="data-table" style="font-size:12px;">
                  <thead><tr><th>Inv #</th><th>Customer</th><th>Amount</th></tr></thead>
                  <tbody>
                    \${b.recentInvoices.length ? b.recentInvoices.slice(0,5).map(i => \`<tr><td>\${i.invoice_number}</td><td>\${i.customer_name || 'Walk-in'}</td><td>Rs. \${i.total.toFixed(2)}</td></tr>\`).join('') : '<tr><td colspan="3" class="text-center text-muted">No recent invoices</td></tr>'}
                  </tbody>
                </table>
              </div>

              <!-- Recent Quotations -->
              <h3 style="font-size:14px; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:5px;">Recent Quotations</h3>
              <div class="table-wrapper">
                <table class="data-table" style="font-size:12px;">
                  <thead><tr><th>Quo #</th><th>Customer</th><th>Amount</th></tr></thead>
                  <tbody>
                    \${b.recentQuotations.length ? b.recentQuotations.slice(0,5).map(q => \`<tr><td>\${q.quotation_number}</td><td>\${q.customer_name || 'Walk-in'}</td><td>Rs. \${q.total.toFixed(2)}</td></tr>\`).join('') : '<tr><td colspan="3" class="text-center text-muted">No recent quotations</td></tr>'}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        \`).join('');
      }

    } catch(e) { console.error(e); }
  }

  document.addEventListener('DOMContentLoaded', loadDashboardData);
`;

html = html.replace(/async function loadDashboardData\(\) \{[\s\S]*?(?=\/\/ Setup AI Chat)/, jsLogic + '\n\n  // Setup AI Chat\n');

fs.writeFileSync('public/dashboard.html', html);
console.log('Successfully updated dashboard.html');
