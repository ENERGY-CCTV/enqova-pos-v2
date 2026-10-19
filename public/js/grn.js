// GRN JS
let grnItems = [], suppliers = [], products = [], branches = [];
document.addEventListener('DOMContentLoaded', () => { loadGRNList(); loadSuppliers(); loadBranchList(); });

async function loadGRNList(page = 1) {
  const data = await apiFetch(`/grn?page=${page}&limit=30`);
  const tbody = document.getElementById('grnTbody');
  if (!data?.success) return;
  if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center empty-state" style="padding:30px;"><div>No GRNs yet</div></td></tr>'; return; }
  tbody.innerHTML = data.data.map(g => `<tr>
    <td style="color:var(--accent);font-weight:700;">${g.grn_number}</td>
    <td style="font-size:12px;color:var(--text-secondary);">${g.reference_no || '-'}</td>
    <td>${formatDate(g.grn_date)}</td>
    <td>${g.supplier_name || 'N/A'}</td>
    <td>${g.branch_name}</td>
    <td>
      <div style="font-weight:600;">${g.item_count} product${g.item_count != 1 ? 's' : ''}</div>
      <div style="font-size:11px;color:var(--text-muted);">${g.total_qty} unit${g.total_qty != 1 ? 's' : ''} received</div>
    </td>
    <td class="text-bold">${formatCurrency(g.total_amount)}</td>
    <td style="font-size:12px;">${g.created_by}</td>
    <td><div class="td-actions">
      <button class="btn btn-secondary btn-sm" onclick="viewGRN(${g.id})">👁 View</button>
    </div></td>
  </tr>`).join('');
  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 30, 'loadGRNList');
}

async function loadSuppliers() {
  const data = await apiFetch('/grn/suppliers/all');
  if (!data?.success) return;
  suppliers = data.data;
  const sel = document.getElementById('grn_supplier');
  if (sel) sel.innerHTML = '<option value="">-- No Supplier --</option>' + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function loadBranchList() {
  const data = await apiFetch('/users/branches/all');
  if (!data?.success) return;
  branches = data.data;
  const sel = document.getElementById('grn_branch');
  if (sel) { sel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join(''); const u = getUser(); if (u.branch_id) sel.value = u.branch_id; }
}

async function searchProductInline(inputEl, productIdEl) {
  const q = inputEl.value;
  if (q.length < 2) return;
  const data = await apiFetch(`/products/search/${encodeURIComponent(q)}`);
  if (!data?.success) return;
  let list = inputEl.nextElementSibling;
  if (!list || !list.classList.contains('inline-search-results')) {
    list = document.createElement('div');
    list.className = 'inline-search-results';
    list.style.cssText = 'position:absolute;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;z-index:100;width:100%;max-height:200px;overflow-y:auto;';
    inputEl.parentElement.style.position = 'relative';
    inputEl.after(list);
  }
  list.innerHTML = data.data.map(p => `<div style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);" 
    onmousedown="selectInlineProduct(this,'${p.name}',${p.id},'${inputEl.id}','${productIdEl}')">${p.name} <span style="color:var(--text-muted);font-size:11px;">${p.brand||''} ${p.sku}</span></div>`).join('');
}

function selectInlineProduct(el, name, id, inputId, productIdField) {
  document.getElementById(inputId).value = name;
  document.getElementById(productIdField).value = id;
  el.parentElement.remove();
}

function openCreateGRN() {
  grnItems = [];
  const elEditId = document.getElementById('edit_grn_id');
  if (elEditId) elEditId.value = '';
  const elTitle = document.getElementById('grnModalTitle');
  if (elTitle) elTitle.textContent = '📋 Create GRN - Goods Received';
  document.getElementById('grn_notes').value = '';
  document.getElementById('grn_reference_no').value = '';
  document.getElementById('grn_date').value = todayISO();
  document.getElementById('grnItemsTbody').innerHTML = '';
  document.getElementById('grnGrandTotal').textContent = 'Rs. 0.00';
  loadSuppliers();
  loadBranchList();
  addGRNRow();
  openModal('grnModal');
}

function addGRNRow() {
  const idx = document.getElementById('grnItemsTbody').rows.length;
  const row = document.createElement('tr');
  row.id = `grnRow_${idx}`;
  row.innerHTML = `
    <td style="min-width:200px;position:relative;">
      <input type="text" class="form-control" id="grn_prod_name_${idx}" placeholder="Search product..." oninput="searchProductInline(this,'grn_prod_id_${idx}')" autocomplete="off">
      <input type="hidden" id="grn_prod_id_${idx}">
    </td>
    <td><input type="number" class="form-control" id="grn_qty_${idx}" min="1" value="1" style="width:70px;" oninput="updateGRNTotal(${idx})"></td>
    <td><input type="number" class="form-control" id="grn_cost_${idx}" min="0" placeholder="0.00" step="0.01" style="width:110px;" oninput="updateGRNTotal(${idx})"></td>
    <td id="grn_line_${idx}" style="font-weight:700;color:var(--accent);">Rs. 0.00</td>
    <td style="min-width:180px;"><textarea class="form-control" id="grn_serials_${idx}" placeholder="S/N001&#10;S/N002&#10;..." rows="3" style="font-family:monospace;font-size:11px;"></textarea><div id="grn_serial_count_${idx}" style="font-size:10px;color:var(--text-muted);margin-top:2px;"></div></td>
    <td><button class="btn btn-danger btn-sm" onclick="removeGRNRow(${idx})">✕</button></td>`;
  document.getElementById('grnItemsTbody').appendChild(row);

  document.getElementById(`grn_serials_${idx}`).addEventListener('input', function() {
    const qty = parseInt(document.getElementById(`grn_qty_${idx}`).value) || 0;
    const count = this.value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).length;
    const el = document.getElementById(`grn_serial_count_${idx}`);
    el.textContent = `${count} serials entered (need ${qty})`;
    el.style.color = count >= qty ? 'var(--green)' : 'var(--orange)';
  });
}

function removeGRNRow(idx) { const r = document.getElementById(`grnRow_${idx}`); if (r) r.remove(); updateGRNGrandTotal(); }

function updateGRNTotal(idx) {
  const qty = parseFloat(document.getElementById(`grn_qty_${idx}`)?.value) || 0;
  const cost = parseFloat(document.getElementById(`grn_cost_${idx}`)?.value) || 0;
  const line = qty * cost;
  const el = document.getElementById(`grn_line_${idx}`);
  if (el) el.textContent = formatCurrency(line);
  updateGRNGrandTotal();
}

function updateGRNGrandTotal() {
  let total = 0;
  document.querySelectorAll('[id^="grn_line_"]').forEach(el => { total += parseFloat(el.textContent.replace(/[^0-9.]/g,'')) || 0; });
  document.getElementById('grnGrandTotal').textContent = formatCurrency(total);
}

async function submitGRN() {
  const rows = document.getElementById('grnItemsTbody').rows;
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const idx = rows[i].id.split('_')[1];
    const pid = document.getElementById(`grn_prod_id_${idx}`)?.value;
    const qty = parseInt(document.getElementById(`grn_qty_${idx}`)?.value) || 0;
    const cost = parseFloat(document.getElementById(`grn_cost_${idx}`)?.value) || 0;
    const serialsRaw = document.getElementById(`grn_serials_${idx}`)?.value || '';
    const serials = serialsRaw.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    if (!pid) { showToast('Select product for all rows', 'error'); return; }
    if (!qty) { showToast('Quantity must be > 0', 'error'); return; }
    items.push({ product_id: parseInt(pid), quantity: qty, unit_cost: cost, serial_numbers: serials });
  }
  if (!items.length) { showToast('Add at least one item', 'error'); return; }
  const body = { supplier_id: document.getElementById('grn_supplier').value || null, branch_id: parseInt(document.getElementById('grn_branch').value), grn_date: document.getElementById('grn_date').value, notes: document.getElementById('grn_notes').value, reference_no: document.getElementById('grn_reference_no').value, items };
  const editId = document.getElementById('edit_grn_id')?.value;
  const data = await apiFetch(editId ? `/grn/${editId}` : '/grn', { method: editId ? 'PUT' : 'POST', body });
  if (data?.success) { showToast(editId ? 'GRN updated! Stock adjusted.' : 'GRN created! Stock updated.', 'success'); closeModal('grnModal'); loadGRNList(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function viewGRN(id) {
  const data = await apiFetch(`/grn/${id}`);
  if (!data?.success) return;
  const g = data.data;
  document.getElementById('viewGRNTitle').textContent = `📋 ${g.grn_number}`;
  document.getElementById('viewGRNContent').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div class="card"><div class="form-label">Date</div><div class="text-bold">${formatDate(g.grn_date)}</div></div>
      <div class="card"><div class="form-label">Supplier</div><div class="text-bold">${g.supplier_name||'N/A'}</div></div>
      <div class="card"><div class="form-label">Branch</div><div class="text-bold">${g.branch_name}</div></div>
      <div class="card"><div class="form-label">Reference No</div><div class="text-bold">${g.reference_no||'-'}</div></div>
      <div class="card"><div class="form-label">Created By</div><div class="text-bold">${g.created_by}</div></div>
      <div class="card"><div class="form-label">Total Amount</div><div class="text-bold text-accent">${formatCurrency(g.total_amount)}</div></div>
    </div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Serial Numbers</th></tr></thead>
    <tbody>${g.items.map(i=>`<tr>
      <td><div style="font-weight:600;">${i.product_name}</div><div style="font-size:11px;color:var(--text-muted);">${i.brand||''} ${i.model||''}</div></td>
      <td style="font-family:monospace;font-size:12px;">${i.sku}</td>
      <td>${i.quantity}</td>
      <td>${formatCurrency(i.unit_cost)}</td>
      <td class="text-bold">${formatCurrency(i.total_cost)}</td>
      <td style="font-family:monospace;font-size:11px;">${i.serial_numbers.join(', ')||'-'}</td>
    </tr>`).join('')}</tbody></table></div>`;
    
  const btnEdit = document.getElementById('btnEditGRN');
  const btnDelete = document.getElementById('btnDeleteGRN');
  const isAdmin = getUser().role === 'admin';
  if (btnEdit) {
    btnEdit.style.display = isAdmin ? 'inline-block' : 'none';
    btnEdit.onclick = () => openEditGRN(g.id);
  }
  if (btnDelete) {
    btnDelete.style.display = isAdmin ? 'inline-block' : 'none';
    btnDelete.onclick = () => deleteGRN(g.id, g.grn_number);
  }
  openModal('viewGRNModal');
}

async function openEditGRN(id) {
  closeModal('viewGRNModal');
  const data = await apiFetch(`/grn/${id}`);
  if (!data?.success) return;
  const g = data.data;
  
  await loadSuppliers();
  await loadBranchList();
  
  const elEditId = document.getElementById('edit_grn_id');
  if (elEditId) elEditId.value = g.id;
  
  const elTitle = document.getElementById('grnModalTitle');
  if (elTitle) elTitle.textContent = `✏️ Edit GRN - ${g.grn_number}`;
  
  document.getElementById('grn_supplier').value = g.supplier_id || '';
  document.getElementById('grn_branch').value = g.branch_id || '';
  document.getElementById('grn_date').value = g.grn_date ? g.grn_date.substring(0, 10) : todayISO();
  document.getElementById('grn_notes').value = g.notes || '';
  document.getElementById('grn_reference_no').value = g.reference_no || '';
  
  document.getElementById('grnItemsTbody').innerHTML = '';
  g.items.forEach((item, idx) => {
    addGRNRow();
    document.getElementById(`grn_prod_name_${idx}`).value = item.product_name;
    document.getElementById(`grn_prod_id_${idx}`).value = item.product_id;
    document.getElementById(`grn_qty_${idx}`).value = item.quantity;
    document.getElementById(`grn_cost_${idx}`).value = item.unit_cost;
    document.getElementById(`grn_serials_${idx}`).value = item.serial_numbers.join('\n');
    updateGRNTotal(idx);
    
    const count = item.serial_numbers.length;
    const el = document.getElementById(`grn_serial_count_${idx}`);
    if(el) {
      el.textContent = `${count} serials entered (need ${item.quantity})`;
      el.style.color = count >= item.quantity ? 'var(--green)' : 'var(--orange)';
    }
  });
  
  openModal('grnModal');
}

function openAddSupplier() { openModal('supplierModal'); }
async function saveSupplier() {
  const name = document.getElementById('sup_name').value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const data = await apiFetch('/grn/suppliers', { method: 'POST', body: { name, phone: document.getElementById('sup_phone').value, email: document.getElementById('sup_email').value } });
  if (data?.success) { showToast('Supplier added!', 'success'); closeModal('supplierModal'); loadSuppliers(); document.getElementById('sup_name').value=''; }
  else showToast(data?.message||'Failed', 'error');
}

async function deleteGRN(id, grnNumber) {
  // Step 1: Confirm
  const ok = await confirmDialog(`Delete ${grnNumber}?\nThis will revert all stock changes and cannot be undone.`);
  if (!ok) return;

  // Step 2: Ask admin password
  const existing = document.getElementById('grn-delete-pw-dialog');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'grn-delete-pw-dialog';
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width:380px;text-align:center;">
      <div style="font-size:28px;margin-bottom:12px;">&#128273;</div>
      <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Admin Password Required</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">Enter admin password to delete <b>${grnNumber}</b></div>
      <input type="password" id="grnDelPw" class="form-control" placeholder="Admin password" style="margin-bottom:16px;text-align:center;">
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="grnDelCancel" class="btn btn-secondary">Cancel</button>
        <button id="grnDelConfirm" class="btn btn-danger">&#128465; Delete</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('grnDelCancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('grnDelConfirm').onclick = async () => {
    const pw = document.getElementById('grnDelPw').value;
    if (!pw) { showToast('Enter admin password', 'error'); return; }
    overlay.remove();
    const data = await apiFetch(`/grn/${id}`, { method: 'DELETE', body: { password: pw } });
    if (data?.success) {
      showToast('GRN deleted & stock reverted ✓', 'success');
      closeModal('viewGRNModal');
      loadGRNList();
    } else {
      showToast(data?.message || 'Delete failed', 'error');
    }
  };
  setTimeout(() => document.getElementById('grnDelPw')?.focus(), 100);
}
