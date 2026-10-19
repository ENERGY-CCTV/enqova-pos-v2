// Dashboard JS
document.addEventListener('DOMContentLoaded', () => loadDashboard());

async function loadDashboard() {
  const data = await apiFetch('/reports/dashboard');
  if (!data?.success) return;
  const d = data.data;

  // Stat cards
  document.getElementById('todaySales').textContent = formatCurrency(d.today_sales?.total || 0);
  document.getElementById('todayCount').textContent = `${d.today_sales?.count || 0} invoices`;
  document.getElementById('monthSales').textContent = formatCurrency(d.month_sales?.total || 0);
  document.getElementById('monthCount').textContent = `${d.month_sales?.count || 0} invoices`;
  document.getElementById('stockAlerts').textContent = d.stock_alerts || 0;
  document.getElementById('pendingWarranties').textContent = d.pending_warranties || 0;
  document.getElementById('totalProducts').textContent = d.total_products || 0;
  document.getElementById('totalCustomers').textContent = d.total_customers || 0;

  // Recent invoices
  const tbody = document.getElementById('recentInvoicesTbody');
  if (tbody) {
    tbody.innerHTML = d.recent_invoices?.map(i => `<tr>
      <td style="color:var(--accent);font-weight:600;">${i.invoice_number}</td>
      <td>${i.customer_name || 'Walk-in'}</td>
      <td style="font-size:12px;">${i.branch_name}</td>
      <td class="text-bold">${formatCurrency(i.total)}</td>
      <td><span class="badge badge-${i.payment_status === 'paid' ? 'success' : i.payment_status === 'partial' ? 'warning' : 'danger'}">${i.payment_status}</span></td>
      <td style="font-size:12px;">${formatDate(i.invoice_date)}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted" style="padding:20px;">No invoices today</td></tr>';
  }

  // Low stock
  const lowStockEl = document.getElementById('lowStockList');
  if (lowStockEl) {
    lowStockEl.innerHTML = d.low_stock_items?.map(s => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
      <img src="${s.image_path || '/img/no-img.svg'}" onerror="this.src='/img/no-img.svg'" style="width:32px;height:32px;border-radius:4px;object-fit:cover;">
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;">${s.name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${s.branch_name}</div>
      </div>
      <span class="badge badge-${s.quantity <= 0 ? 'danger' : 'warning'}" style="font-size:11px;">Stock: ${s.quantity}</span>
    </div>`).join('') || '<div class="text-center text-muted" style="padding:20px;">✅ All stock levels OK</div>';
  }

  // Sales chart (last 7 days)
  const ctx = document.getElementById('salesChart');
  if (ctx && d.last_7_days?.length) {
    new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: d.last_7_days.map(x => formatDate(x.date)),
        datasets: [{
          label: 'Revenue', data: d.last_7_days.map(x => x.total),
          borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.08)',
          borderWidth: 2, pointBackgroundColor: '#00d4ff', fill: true, tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8892a4', callback: v => 'Rs.' + Number(v).toLocaleString() } }
        }
      }
    });
  }
}
