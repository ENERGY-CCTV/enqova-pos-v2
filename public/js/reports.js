// Reports JS
let salesChart = null, productsChart = null, cashflowChart = null, currentTab = 'sales';

document.addEventListener('DOMContentLoaded', () => {
  const today = todayISO();
  const firstDay = today.substring(0,8)+'01';
  document.getElementById('startDate').value = firstDay;
  document.getElementById('endDate').value = today;
  loadBranchFilter();
  loadSalesReport();
  // Hide profit and cashflow for non-admin
  if (getUser().role !== 'admin') {
    document.getElementById('profitTab')?.remove();
    document.getElementById('cashflowTab')?.remove();
  }
});

async function loadBranchFilter() {
  const data = await apiFetch('/users/branches/all');
  if (!data?.success) return;
  const sel = document.getElementById('branchFilter');
  sel.innerHTML = '<option value="">All Branches</option>' + data.data.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
}

function setDateRange(range) {
  const now = new Date();
  let start = new Date(), end = new Date();
  if (range === 'today') { start = end = now; }
  else if (range === 'week') { start = new Date(now); start.setDate(now.getDate() - 6); }
  else if (range === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (range === 'year') { start = new Date(now.getFullYear(), 0, 1); }
  document.getElementById('startDate').value = start.toISOString().split('T')[0];
  document.getElementById('endDate').value = end.toISOString().split('T')[0];
  loadCurrentReport();
}

function loadCurrentReport() {
  if (currentTab === 'sales') loadSalesReport();
  else if (currentTab === 'stock') loadStockReport();
  else if (currentTab === 'products') loadTopProducts();
  else if (currentTab === 'customers') loadCustomersReport();
  else if (currentTab === 'product-history') {
    if (window.currentPhProductId) loadProductHistory(window.currentPhProductId);
  }
  else if (currentTab === 'profit') loadProfitReport();
  else if (currentTab === 'cashflow') loadCashFlowReport();
}

function switchTab(name, btn) {
  currentTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');
  const searchInput = document.getElementById('reportSearch');
  if (searchInput) searchInput.value = ''; // clear search
  loadCurrentReport();
}

function filterCurrentReport() {
  const query = document.getElementById('reportSearch').value.toLowerCase();
  const panel = document.getElementById('tab-' + currentTab);
  if (!panel) return;
  const tbody = panel.querySelector('tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    // If it's an empty state row, always show it unless we're searching
    if (row.querySelector('.empty-state')) return;
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

async function loadSalesReport() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const branch = document.getElementById('branchFilter').value;
  const data = await apiFetch(`/reports/sales?start_date=${start}&end_date=${end}&branch_id=${branch}`);
  if (!data?.success) return;
  const d = data.data;

  // Summary cards
  document.getElementById('salesSummary').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">💰</div><div><div class="stat-value">${formatCurrency(d.summary.total_revenue)}</div><div class="stat-label">Total Revenue</div></div></div>
    <div class="stat-card"><div class="stat-icon green">🧾</div><div><div class="stat-value">${d.summary.total_invoices}</div><div class="stat-label">Total Invoices</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">💳</div><div><div class="stat-value">${formatCurrency(d.summary.total_vat)}</div><div class="stat-label">VAT Collected</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">📊</div><div><div class="stat-value">${formatCurrency(d.summary.avg_invoice)}</div><div class="stat-label">Avg Invoice Value</div></div></div>`;

  // Chart
  const ctx = document.getElementById('salesChart').getContext('2d');
  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.chart.map(x=>x.date),
      datasets: [{ label:'Revenue (Rs.)', data: d.chart.map(x=>x.total), backgroundColor:'rgba(0,212,255,0.15)', borderColor:'#00d4ff', borderWidth:2, borderRadius:6 }]
    },
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8892a4',font:{size:10}}}, y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8892a4',callback:v=>'Rs.'+Number(v).toLocaleString()}} } }
  });

  // Table
  const tbody = document.getElementById('salesTbody');
  if (!d.invoices.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No invoices in this period</td></tr>'; return; }
  tbody.innerHTML = d.invoices.map(i=>`<tr>
    <td style="color:var(--accent);font-weight:600;">${i.invoice_number}</td>
    <td style="font-size:12px;">${formatDate(i.invoice_date)}</td>
    <td>${i.customer_name||'Walk-in'}</td>
    <td style="font-size:12px;">${i.branch_name}</td>
    <td class="text-bold">${formatCurrency(i.total)}</td>
    <td style="text-transform:capitalize;">${i.payment_method}</td>
    <td><span class="badge badge-${i.payment_status==='paid'?'success':i.payment_status==='partial'?'warning':'danger'}">${i.payment_status}</span></td>
  </tr>`).join('');
}

async function loadStockReport() {
  const lowOnly = document.getElementById('lowStockOnly')?.checked;
  const branch = document.getElementById('branchFilter').value;
  const data = await apiFetch(`/reports/stock?branch_id=${branch}&low_stock_only=${lowOnly?1:0}`);
  if (!data?.success) return;
  const tbody = document.getElementById('stockTbody');
  if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">No stock data</td></tr>'; return; }
  tbody.innerHTML = data.data.map(s=>`<tr>
    <td><div style="font-weight:600;">${s.product_name}</div></td>
    <td style="font-family:monospace;font-size:11px;">${s.sku}</td>
    <td style="font-size:12px;">${s.category_name||'-'}</td>
    <td style="font-size:12px;">${s.branch_name}</td>
    <td style="font-weight:700;color:${s.quantity<=s.min_quantity?'var(--red)':'var(--text-primary)'};">${s.quantity}</td>
    <td style="color:var(--text-muted);">${s.min_quantity}</td>
    <td>${formatCurrency(s.retail_price)}</td>
    <td><span class="badge badge-${s.quantity<=0?'danger':s.quantity<=s.min_quantity?'warning':'success'}">${s.quantity<=0?'Out of Stock':s.quantity<=s.min_quantity?'Low Stock':'OK'}</span></td>
  </tr>`).join('');
}

async function loadTopProducts() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const branch = document.getElementById('branchFilter').value;
  const data = await apiFetch(`/reports/products?start_date=${start}&end_date=${end}&branch_id=${branch}`);
  if (!data?.success) return;
  const d = data.data;

  const ctx = document.getElementById('productsChart').getContext('2d');
  if (productsChart) productsChart.destroy();
  productsChart = new Chart(ctx, {
    type: 'bar', indexAxis: 'y',
    data: { labels: d.slice(0,10).map(p=>p.product_name.substring(0,30)), datasets: [{ label:'Qty Sold', data:d.slice(0,10).map(p=>p.total_qty), backgroundColor:'rgba(0,255,157,0.2)', borderColor:'#00ff9d', borderWidth:2, borderRadius:4 }] },
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8892a4'}}, y:{grid:{display:false},ticks:{color:'#8892a4',font:{size:11}}} } }
  });

  document.getElementById('topProductsTbody').innerHTML = d.map((p,i)=>`<tr>
    <td><span style="font-size:18px;">${['🥇','🥈','🥉'][i]||'#'+(i+1)}</span></td>
    <td><div style="font-weight:600;">${p.product_name}</div><div style="font-size:11px;color:var(--text-muted);">${p.brand||''}</div></td>
    <td style="font-weight:700;">${p.total_qty}</td>
    <td style="font-weight:700;color:var(--accent);">${formatCurrency(p.total_revenue)}</td>
  </tr>`).join('');
}

async function loadCustomersReport() {
  const data = await apiFetch('/reports/customers');
  if (!data?.success) return;
  document.getElementById('customersTbody').innerHTML = data.data.map(c=>`<tr>
    <td style="font-family:monospace;color:var(--accent);">${c.customer_code}</td>
    <td style="font-weight:600;">${c.name}</td>
    <td>${c.phone||'-'}</td>
    <td><span class="badge badge-${c.customer_type==='wholesale'?'success':'info'}">${c.customer_type}</span></td>
    <td>${c.invoice_count||0}</td>
    <td style="font-weight:700;color:var(--accent);">${formatCurrency(c.total_spent)}</td>
    <td style="color:${c.outstanding_balance>0?'var(--red)':'var(--green)'};">${formatCurrency(c.outstanding_balance)}</td>
  </tr>`).join('');
}

async function loadProfitReport() {
  if (getUser().role !== 'admin') { showToast('Admin access required', 'error'); return; }
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const branch = document.getElementById('branchFilter').value;
  const data = await apiFetch(`/reports/profit?start_date=${start}&end_date=${end}&branch_id=${branch}`);
  if (!data?.success) return;
  const d = data.data;
  document.getElementById('profitSummary').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">💰</div><div><div class="stat-value">${formatCurrency(d.summary.revenue)}</div><div class="stat-label">Revenue</div></div></div>
    <div class="stat-card"><div class="stat-icon red">🧾</div><div><div class="stat-value">${formatCurrency(d.summary.total_cost)}</div><div class="stat-label">Total Cost</div></div></div>
    <div class="stat-card"><div class="stat-icon green">📈</div><div><div class="stat-value">${formatCurrency(d.summary.gross_profit)}</div><div class="stat-label">Gross Profit</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">%</div><div><div class="stat-value">${d.summary.margin?.toFixed(1)}%</div><div class="stat-label">Profit Margin</div></div></div>`;
  document.getElementById('profitTbody').innerHTML = d.products.map(p=>`<tr>
    <td style="font-weight:600;">${p.product_name}</td>
    <td>${p.total_qty}</td>
    <td>${formatCurrency(p.total_cost)}</td>
    <td>${formatCurrency(p.revenue)}</td>
    <td style="font-weight:700;color:${p.gross_profit>=0?'var(--green)':'var(--red)'};">${formatCurrency(p.gross_profit)}</td>
    <td style="color:${p.margin>=0?'var(--green)':'var(--red)'};">${p.margin?.toFixed(1)}%</td>
  </tr>`).join('');
}

async function loadCashFlowReport() {
  if (getUser().role !== 'admin') { showToast('Admin access required', 'error'); return; }
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const data = await apiFetch(`/reports/cashflow?start_date=${start}&end_date=${end}`);
  if (!data?.success) return;
  const d = data.data;

  // Summarize totals
  let totalInflow = 0;
  let totalOutflow = 0;
  
  // Parse date maps to make alignment easy
  const dateMap = {};
  d.inflows.forEach(x => {
    const val = parseFloat(x.inflow || 0);
    const dt = formatDate(x.date);
    dateMap[dt] = dateMap[dt] || { inflow: 0, outflow: 0 };
    dateMap[dt].inflow = val;
    totalInflow += val;
  });
  d.outflows.forEach(x => {
    const val = parseFloat(x.outflow || 0);
    const dt = formatDate(x.date);
    dateMap[dt] = dateMap[dt] || { inflow: 0, outflow: 0 };
    dateMap[dt].outflow = val;
    totalOutflow += val;
  });

  const sortedDates = Object.keys(dateMap).sort();
  const inflowsData = sortedDates.map(dt => dateMap[dt].inflow);
  const outflowsData = sortedDates.map(dt => dateMap[dt].outflow);

  document.getElementById('cfTotalInflows').textContent = formatCurrency(totalInflow);
  document.getElementById('cfTotalOutflows').textContent = formatCurrency(totalOutflow);
  
  const netFlow = totalInflow - totalOutflow;
  const netFlowEl = document.getElementById('cfNetFlow');
  netFlowEl.textContent = formatCurrency(netFlow);
  netFlowEl.style.color = netFlow >= 0 ? 'var(--green)' : 'var(--red)';

  // Chart
  const ctx = document.getElementById('cashflowChart').getContext('2d');
  if (cashflowChart) cashflowChart.destroy();
  
  cashflowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [
        {
          label: 'Inflows (Sales Receipts)',
          data: inflowsData,
          borderColor: '#00ff9d',
          backgroundColor: 'rgba(0,255,157,0.05)',
          fill: true,
          tension: 0.2
        },
        {
          label: 'Outflows (Purchase Costs)',
          data: outflowsData,
          borderColor: '#ff0055',
          backgroundColor: 'rgba(255,0,85,0.05)',
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', callback: v => 'Rs.' + Number(v).toLocaleString() } }
      }
    }
  });
}

function exportReport() {
  if (currentTab === 'cashflow') {
    showToast('Cash flow is a chart-based report. Table export is not available.', 'info');
    return;
  }
  const tableMap = { sales:'salesTbody', stock:'stockTbody', products:'topProductsTbody', customers:'customersTbody', profit:'profitTbody', 'product-history':'phTbody' };
  exportTableToCSV(tableMap[currentTab], `enqova_${currentTab}_report.csv`);
}

// --- Product History Search ---
async function searchProductHistory() {
  const q = document.getElementById('phSearchInput').value.trim();
  if (!q) return;
  const data = await apiFetch(`/products/search/${encodeURIComponent(q)}`);
  const resDiv = document.getElementById('phSearchResults');
  if (!data?.success || !data.data.length) {
    resDiv.style.display = 'block';
    resDiv.innerHTML = '<div style="padding:12px; color:var(--text-muted);">No products found</div>';
    return;
  }
  resDiv.style.display = 'block';
  resDiv.innerHTML = data.data.map(p => `
    <div style="padding:12px; border-bottom:1px solid var(--border); cursor:pointer;" onclick="selectPhProduct(${p.id})">
      <div style="font-weight:600;">${p.name}</div>
      <div style="font-size:11px; color:var(--text-muted);">Brand: ${p.brand||'-'} | SKU: ${p.sku||'-'}</div>
    </div>
  `).join('');
}

function selectPhProduct(id) {
  document.getElementById('phSearchResults').style.display = 'none';
  document.getElementById('phSearchInput').value = '';
  window.currentPhProductId = id;
  loadProductHistory(id);
}

async function loadProductHistory(productId) {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const branch = document.getElementById('branchFilter').value;
  const data = await apiFetch(`/reports/product-history?product_id=${productId}&start_date=${start}&end_date=${end}&branch_id=${branch}`);
  
  if (!data?.success) return;
  const { history, product } = data.data;
  
  document.getElementById('phReportContent').style.display = 'block';
  
  const totalSold = history.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = history.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0);
  
  document.getElementById('phProductDetails').innerHTML = `
    <h3 style="margin-top:0; margin-bottom:8px;">${product.name}</h3>
    <div style="display:flex; gap:20px; font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
      <span><strong>Brand:</strong> ${product.brand || '-'}</span>
      <span><strong>Model:</strong> ${product.model || '-'}</span>
      <span><strong>SKU:</strong> ${product.sku || '-'}</span>
    </div>
    <div style="display:flex; gap:16px;">
      <div style="background:var(--bg-lighter); padding:8px 16px; border-radius:6px; font-weight:600;">Total Quantity Sold: <span style="color:var(--accent);">${totalSold}</span></div>
      <div style="background:var(--bg-lighter); padding:8px 16px; border-radius:6px; font-weight:600;">Total Revenue: <span style="color:var(--green);">${formatCurrency(totalRevenue)}</span></div>
    </div>
  `;
  
  const tbody = document.getElementById('phTbody');
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No sales for this product in the selected period.</td></tr>';
    return;
  }
  
  tbody.innerHTML = history.map(h => {
    let orderInfo = h.customer_name || 'Walk-in';
    if (h.notes) {
      if (h.notes.toLowerCase().includes('online')) {
         orderInfo += ' <span class="badge badge-info">Online Order</span>';
      }
      else if (h.notes) {
         orderInfo += ` <small style="color:var(--text-muted)">(${h.notes})</small>`;
      }
    }
    return `<tr>
      <td style="font-size:12px;">${formatDate(h.invoice_date)}</td>
      <td style="color:var(--accent);font-weight:600;">${h.invoice_number}</td>
      <td>${orderInfo}</td>
      <td style="font-size:12px;">${h.branch_name}</td>
      <td style="font-weight:700;">${h.quantity}</td>
      <td>${formatCurrency(h.unit_price)}</td>
      <td style="font-weight:700;color:var(--green);">${formatCurrency(h.line_total)}</td>
    </tr>`;
  }).join('');
}

