const fs = require('fs');

let html = fs.readFileSync('public/dashboard.html', 'utf8');

const oldPageBody = `
    <div class="page-body">
      <!-- Stats -->
      <div class="stats-grid" id="statsGrid">
        <div class="stat-card hover-card" onclick="location.href='/reports.html?tab=sales'" style="cursor:pointer;"><div class="stat-icon blue">💰</div><div><div class="stat-value" id="todaySales">Rs. 0</div><div class="stat-label">Today's Sales</div><div class="stat-change up" id="todayCount">0 invoices</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/reports.html?tab=sales'" style="cursor:pointer;"><div class="stat-icon green">📅</div><div><div class="stat-value" id="monthSales">Rs. 0</div><div class="stat-label">This Month</div><div class="stat-change" id="monthCount">0 invoices</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/products.html?filter=lowstock'" style="cursor:pointer;"><div class="stat-icon orange">⚠️</div><div><div class="stat-value" id="stockAlerts">0</div><div class="stat-label">Stock Alerts</div><div class="stat-change" style="color:var(--orange)">Low stock items</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/warranties.html?filter=pending'" style="cursor:pointer;"><div class="stat-icon red">🔧</div><div><div class="stat-value" id="pendingWarranties">0</div><div class="stat-label">Pending Warranty</div><div class="stat-change" style="color:var(--red)">Claims pending</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/customers.html'" style="cursor:pointer;"><div class="stat-icon purple">👥</div><div><div class="stat-value" id="totalCustomers">0</div><div class="stat-label">Total Customers</div></div></div>
        <div class="stat-card hover-card" onclick="location.href='/products.html'" style="cursor:pointer;"><div class="stat-icon blue">📦</div><div><div class="stat-value" id="totalProducts">0</div><div class="stat-label">Active Products</div></div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 360px;gap:20px;margin-bottom:20px;">
        <!-- Sales Chart -->
        <div class="card">
          <div class="card-header"><div class="card-title">Sales - Last 7 Days</div></div>
          <canvas id="salesChart" height="120"></canvas>
        </div>
        <!-- Low Stock -->
        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ Low Stock Alert</div><a href="/products.html" class="btn btn-ghost btn-sm">View All</a></div>
          <div id="lowStockList"><div class="empty-state"><div class="empty-icon">✅</div><p>All stock levels OK</p></div></div>
        </div>
      </div>

      <style>
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      </style>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <!-- Recent Invoices -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Recent Invoices</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm" onclick="location.href='/pos.html'">+ New Invoice</button>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="data-table" id="recentTable">
              <thead><tr><th>Invoice #</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody id="recentInvoicesTbody"><tr><td colspan="4" class="text-center text-muted" style="padding:30px;">Loading...</td></tr></tbody>
            </table>
          </div>
        </div>

        <!-- Recent Quotations -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Recent Quotations</div>
            <div style="display:flex;gap:8px;">
              <a href="/quotations.html" class="btn btn-ghost btn-sm">View All</a>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="data-table" id="recentQuoTable">
              <thead><tr><th>Quotation #</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody id="recentQuotationsTbody"><tr><td colspan="4" class="text-center text-muted" style="padding:30px;">Loading...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
`;

// Replace the new branches structure with oldPageBody
html = html.replace(/<div class="page-body">[\s\S]*?(?=<div class="ai-panel">)/, oldPageBody);

// We also need to add <span class="branch-badge" id="headerBranch">Branch</span> back to header-actions if it's missing.
if(!html.includes('headerBranch')) {
  html = html.replace(/<div class="header-actions">/, '<div class="header-actions">\n        <span class="branch-badge" id="headerBranch">Branch</span>');
}

const jsLogic = `
  async function loadDashboardData() {
    try {
      const res = await fetch('/api/reports/dashboard', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('enqova_token') } });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (!data.success) return;
      
      const d = data.data;

      const headerBranch = document.getElementById('headerBranch');
      if (headerBranch && d.current_branch_name) headerBranch.textContent = d.current_branch_name;

      if(document.getElementById('todaySales')) document.getElementById('todaySales').textContent = 'Rs. ' + Number(d.today_sales?.total || 0).toLocaleString(undefined, {minimumFractionDigits:2});
      if(document.getElementById('todayCount')) document.getElementById('todayCount').textContent = (d.today_sales?.count || 0) + ' invoices';
      
      if(document.getElementById('monthSales')) document.getElementById('monthSales').textContent = 'Rs. ' + Number(d.month_sales?.total || 0).toLocaleString(undefined, {minimumFractionDigits:2});
      if(document.getElementById('monthCount')) document.getElementById('monthCount').textContent = (d.month_sales?.count || 0) + ' invoices';

      if(document.getElementById('stockAlerts')) document.getElementById('stockAlerts').textContent = d.stock_alerts || 0;
      if(document.getElementById('pendingWarranties')) document.getElementById('pendingWarranties').textContent = d.pending_warranties || 0;
      if(document.getElementById('totalCustomers')) document.getElementById('totalCustomers').textContent = d.total_customers || 0;
      if(document.getElementById('totalProducts')) document.getElementById('totalProducts').textContent = d.total_products || 0;

      const tb = document.getElementById('recentInvoicesTbody');
      if(tb) {
        if(!d.recent_invoices || d.recent_invoices.length === 0) tb.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent invoices</td></tr>';
        else tb.innerHTML = d.recent_invoices.map(i => \`<tr><td>\${i.invoice_number}</td><td>\${i.customer_name||'Walk-in'}</td><td>Rs.\${Number(i.total).toFixed(2)}</td><td><span class="status-\${i.invoice_status}">\${i.invoice_status}</span></td></tr>\`).join('');
      }

      const qb = document.getElementById('recentQuotationsTbody');
      if(qb) {
        if(!d.recent_quotations || d.recent_quotations.length === 0) qb.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent quotations</td></tr>';
        else qb.innerHTML = d.recent_quotations.map(q => \`<tr><td>\${q.quotation_number}</td><td>\${q.customer_name||'Walk-in'}</td><td>Rs.\${Number(q.total).toFixed(2)}</td><td><span class="status-\${q.status}">\${q.status}</span></td></tr>\`).join('');
      }

      const ls = document.getElementById('lowStockList');
      if(ls) {
        if(!d.low_stock_items || d.low_stock_items.length === 0) ls.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>All stock levels OK</p></div>';
        else ls.innerHTML = d.low_stock_items.map(i => \`
          <div style="display:flex;align-items:center;padding:10px;border-bottom:1px solid var(--border);">
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;">\${i.name}</div>
              <div style="font-size:11px;color:var(--muted);">\${i.branch_name} | Min: \${i.min_quantity}</div>
            </div>
            <div style="color:var(--red);font-weight:700;">\${i.quantity} left</div>
          </div>
        \`).join('');
      }

      if (window.salesChartInstance) window.salesChartInstance.destroy();
      const ctx = document.getElementById('salesChart');
      if (ctx && d.last_7_days && window.Chart) {
        window.salesChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: d.last_7_days.map(x => x.invoice_date.substring(5)),
            datasets: [{
              label: 'Sales (Rs)',
              data: d.last_7_days.map(x => x.total),
              borderColor: '#00d4ff',
              backgroundColor: 'rgba(0, 212, 255, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }

    } catch(e) { console.error(e); }
  }

  document.addEventListener('DOMContentLoaded', loadDashboardData);
`;

html = html.replace(/async function loadDashboardData\(\) \{[\s\S]*?(?=\/\/ Setup AI Chat)/, jsLogic + '\n\n  // Setup AI Chat\n');

fs.writeFileSync('public/dashboard.html', html);
console.log('Successfully reverted dashboard.html');
