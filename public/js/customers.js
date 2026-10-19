// Customers JS
let currentPage = 1;
document.addEventListener('DOMContentLoaded', () => loadCustomers());

async function loadCustomers(page = 1) {
  currentPage = page;
  const search = document.getElementById('searchInput')?.value || '';
  const type = document.getElementById('typeFilter')?.value || '';
  const data = await apiFetch(`/customers?search=${encodeURIComponent(search)}&customer_type=${type}&page=${page}&limit=30`);
  const tbody = document.getElementById('customersTbody');
  if (!data?.success) return;
  if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center empty-state"><div class="empty-icon">👥</div><p>No customers found</p></td></tr>'; return; }
  tbody.innerHTML = data.data.map(c => `<tr>
    <td style="font-family:monospace;font-weight:600;color:var(--accent);">${c.customer_code}</td>
    <td><div style="font-weight:600;">${c.name}</div></td>
    <td>${c.phone || '-'}</td>
    <td style="font-family:monospace;font-size:12px;">${c.nic || '-'}</td>
    <td><span class="badge badge-${c.customer_type==='wholesale'?'success':'info'}">${c.customer_type}</span></td>
    <td style="color:${c.outstanding_balance>0?'var(--red)':'var(--green)'};font-weight:700;">${formatCurrency(c.outstanding_balance)}</td>
    <td style="font-size:12px;color:var(--text-muted);">${formatDate(c.created_at)}</td>
    <td>
      <div class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditCustomer(${c.id})" title="Edit">✏️</button>
        <button class="btn btn-secondary btn-sm" onclick="viewCustomerDetail(${c.id},'${c.name.replace(/'/g,"\\'")}')">📋</button>
        <button class="btn btn-primary btn-sm" onclick="billCustomer(${c.id})">🛒</button>
      </div>
    </td>
  </tr>`).join('');
  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 30, 'loadCustomers');
}

function openAddCustomer() {
  document.getElementById('custModalTitle').textContent = 'Add New Customer';
  ['c_name','c_phone','c_nic','c_email','c_address','c_notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('c_credit').value = 0;
  document.getElementById('c_type').value = 'retail';
  document.getElementById('c_id').value = '';
  openModal('customerModal');
}

async function openEditCustomer(id) {
  const data = await apiFetch(`/customers/${id}`);
  if (!data?.success) return;
  const c = data.data;
  document.getElementById('custModalTitle').textContent = 'Edit Customer';
  document.getElementById('c_name').value = c.name || '';
  document.getElementById('c_phone').value = c.phone || '';
  document.getElementById('c_nic').value = c.nic || '';
  document.getElementById('c_email').value = c.email || '';
  document.getElementById('c_address').value = c.address || '';
  document.getElementById('c_notes').value = c.notes || '';
  document.getElementById('c_credit').value = c.credit_limit || 0;
  document.getElementById('c_type').value = c.customer_type || 'retail';
  document.getElementById('c_id').value = c.id;
  openModal('customerModal');
}

async function saveCustomer() {
  const name = document.getElementById('c_name').value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const body = { name, phone: document.getElementById('c_phone').value, nic: document.getElementById('c_nic').value, email: document.getElementById('c_email').value, address: document.getElementById('c_address').value, customer_type: document.getElementById('c_type').value, credit_limit: parseFloat(document.getElementById('c_credit').value) || 0, notes: document.getElementById('c_notes').value };
  const id = document.getElementById('c_id').value;
  const data = id ? await apiFetch(`/customers/${id}`, { method: 'PUT', body }) : await apiFetch('/customers', { method: 'POST', body });
  if (data?.success) { showToast('Customer saved!', 'success'); closeModal('customerModal'); loadCustomers(currentPage); }
  else showToast(data?.message || 'Failed', 'error');
}

async function viewCustomerDetail(id, name) {
  document.getElementById('custDetailTitle').textContent = `📋 ${name}`;
  document.getElementById('custDetailContent').innerHTML = '<div style="text-align:center;padding:20px;"><div class="spinner" style="margin:auto;"></div></div>';
  openModal('customerDetailModal');
  const [custData, invoices, warranties] = await Promise.all([
    apiFetch(`/customers/${id}`), apiFetch(`/customers/${id}/invoices`), apiFetch(`/customers/${id}/warranties`)
  ]);
  const c = custData?.data || {};
  const invList = invoices?.data || [];
  const wList = warranties?.data || [];
  document.getElementById('custDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card"><div class="form-label">Customer Code</div><div style="font-weight:700;color:var(--accent);">${c.customer_code}</div></div>
      <div class="card"><div class="form-label">Phone</div><div style="font-weight:700;">${c.phone || '-'}</div></div>
      <div class="card"><div class="form-label">NIC</div><div style="font-weight:700;">${c.nic || '-'}</div></div>
      <div class="card"><div class="form-label">Outstanding Balance</div><div style="font-weight:700;color:${c.outstanding_balance>0?'var(--red)':'var(--green)'};">${formatCurrency(c.outstanding_balance)}</div></div>
    </div>
    <div style="font-weight:700;margin-bottom:8px;">Purchase History (${invList.length})</div>
    <div class="table-wrapper" style="max-height:200px;overflow-y:auto;margin-bottom:16px;">
      <table class="data-table"><thead><tr><th>Invoice#</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${invList.map(i=>`<tr><td style="color:var(--accent);">${i.invoice_number}</td><td>${formatDate(i.invoice_date)}</td><td class="text-bold">${formatCurrency(i.total)}</td><td>${i.payment_status}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted">No invoices</td></tr>'}</tbody></table>
    </div>
    <div style="font-weight:700;margin-bottom:8px;">Warranty Claims (${wList.length})</div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Claim#</th><th>Product</th><th>Date</th><th>Status</th></tr></thead>
    <tbody>${wList.map(w=>`<tr><td>${w.claim_number}</td><td>${w.product_name}</td><td>${formatDate(w.claim_date)}</td><td><span class="badge badge-${w.status==='completed'?'success':'warning'}">${w.status}</span></td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted">No claims</td></tr>'}</tbody></table></div>`;
}

function billCustomer(id) { localStorage.setItem('pos_customer_id', id); location.href = '/pos.html'; }
function exportCSV() { exportTableToCSV('customersTbody', 'enqova_customers.csv'); }
