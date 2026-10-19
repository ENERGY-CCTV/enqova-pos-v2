// Transfers JS
document.addEventListener('DOMContentLoaded', () => { loadTransfers(); loadBranchesForTransfer(); });

async function loadBranchesForTransfer() {
  const data = await apiFetch('/users/branches/all');
  if (!data?.success) return;
  const branches = data.data;
  ['t_from','t_to'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  });
  if (document.getElementById('t_to') && branches.length > 1) document.getElementById('t_to').value = branches[1].id;
}

async function loadTransfers(page = 1) {
  const status = document.getElementById('statusFilter')?.value || '';
  const data = await apiFetch(`/transfers?status=${status}&page=${page}&limit=30`);
  const tbody = document.getElementById('transfersTbody');
  if (!data?.success) return;
  if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center empty-state" style="padding:30px;">No transfers found</td></tr>'; return; }
  const statusColors = { pending:'warning', approved:'info', completed:'success', rejected:'danger' };
  tbody.innerHTML = data.data.map(t => `<tr>
    <td style="color:var(--accent);font-weight:700;">${t.transfer_number}</td>
    <td>${t.from_branch_name}</td>
    <td>${t.to_branch_name}</td>
    <td style="font-size:12px;">${formatDate(t.transfer_date)}</td>
    <td><span class="badge badge-${statusColors[t.status]||'secondary'}">${t.status}</span></td>
    <td style="font-size:12px;">${t.requested_by_name}</td>
    <td>
      <div class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewTransfer(${t.id})">👁 View</button>
        ${t.status==='pending' && getUser().role!=='cashier' ? `<button class="btn btn-success btn-sm" onclick="approveTransfer(${t.id})">✅ Approve</button><button class="btn btn-danger btn-sm" onclick="rejectTransfer(${t.id})">✕ Reject</button>` : ''}
        ${t.status==='approved' ? `<button class="btn btn-primary btn-sm" onclick="completeTransfer(${t.id})">📦 Complete</button>` : ''}
        ${getUser().role==='admin' ? `<button class="btn btn-secondary btn-sm" onclick="openEditTransfer(${t.id})">✏️ Edit</button><button class="btn btn-danger btn-sm" onclick="deleteTransfer(${t.id},'${t.transfer_number}')">🗑</button>` : ''}
      </div>
    </td>
  </tr>`).join('');
  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 30, 'loadTransfers');
}

function openCreateTransfer() {
  document.getElementById('edit_transfer_id').value = '';
  document.getElementById('transferModalTitle').textContent = '🔄 New Branch Transfer';
  document.getElementById('transferSubmitBtn').textContent = '📤 Submit Transfer Request';
  document.getElementById('t_notes').value = '';
  document.getElementById('t_date').value = todayISO();
  document.getElementById('transferItemsTbody').innerHTML = '';
  loadBranchesForTransfer();
  addTransferRow();
  openModal('transferModal');
}

function addTransferRow() {
  const idx = document.getElementById('transferItemsTbody').rows.length;
  const row = document.createElement('tr');
  row.id = `tRow_${idx}`;
  row.innerHTML = `
    <td style="min-width:200px;position:relative;">
      <input type="text" class="form-control" id="t_prod_name_${idx}" placeholder="Search product..." oninput="searchProductInlineT(this,'t_prod_id_${idx}')" autocomplete="off">
      <input type="hidden" id="t_prod_id_${idx}">
    </td>
    <td id="t_avail_${idx}" style="font-size:13px;color:var(--text-secondary);">-</td>
    <td><input type="number" class="form-control" id="t_qty_${idx}" min="1" value="1" style="width:70px;"></td>
    <td><textarea class="form-control" id="t_serials_${idx}" placeholder="Serial numbers&#10;(one per line)" rows="3" style="font-family:monospace;font-size:11px;"></textarea></td>
    <td><button class="btn btn-danger btn-sm" onclick="removeTRow(${idx})">✕</button></td>`;
  document.getElementById('transferItemsTbody').appendChild(row);
}

async function searchProductInlineT(inputEl, productIdEl) {
  const q = inputEl.value;
  if (q.length < 2) return;
  const fromBranch = document.getElementById('t_from')?.value;
  const data = await apiFetch(`/products/search/${encodeURIComponent(q)}?branch_id=${fromBranch}`);
  if (!data?.success) return;
  let list = inputEl.nextElementSibling?.nextElementSibling;
  if (!list || !list.classList.contains('inline-sr')) {
    list = document.createElement('div');
    list.className = 'inline-sr';
    list.style.cssText = 'position:absolute;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;z-index:100;width:300px;max-height:200px;overflow-y:auto;top:100%;left:0;';
    inputEl.parentElement.style.position = 'relative';
    inputEl.after(document.createElement('span'), list);
  }
  const idx = productIdEl.split('_').pop();
  list.innerHTML = data.data.map(p => `<div style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);" 
    onmousedown="selectTransferProduct('${inputEl.id}','${productIdEl}',${p.id},'${p.name}',${p.branch_stock||0},this)">
    ${p.name} <span style="color:var(--text-muted);font-size:11px;">${p.brand||''}</span>
    <span style="float:right;color:${(p.branch_stock||0)>0?'var(--green)':'var(--red)'};font-size:11px;">Stock: ${p.branch_stock||0}</span>
  </div>`).join('');
}

function selectTransferProduct(inputId, productIdField, id, name, stock, el) {
  const idx = productIdField.split('_').pop();
  document.getElementById(inputId).value = name;
  document.getElementById(productIdField).value = id;
  document.getElementById(`t_avail_${idx}`).textContent = `Available: ${stock}`;
  el.parentElement.remove();
}

function removeTRow(idx) { const r = document.getElementById(`tRow_${idx}`); if (r) r.remove(); }

async function submitTransfer() {
  const rows = document.getElementById('transferItemsTbody').rows;
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const idx = rows[i].id.split('_')[1];
    const pid = document.getElementById(`t_prod_id_${idx}`)?.value;
    const qty = parseInt(document.getElementById(`t_qty_${idx}`)?.value) || 0;
    const serialsRaw = document.getElementById(`t_serials_${idx}`)?.value || '';
    const serials = serialsRaw.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    if (!pid) { showToast('Select product for all rows', 'error'); return; }
    items.push({ product_id: parseInt(pid), quantity: qty, serial_numbers: serials });
  }
  const from = document.getElementById('t_from').value;
  const to = document.getElementById('t_to').value;
  if (from === to) { showToast('From and To branches must be different', 'error'); return; }
  const editId = document.getElementById('edit_transfer_id')?.value;
  const body = { from_branch_id: parseInt(from), to_branch_id: parseInt(to), transfer_date: document.getElementById('t_date').value, notes: document.getElementById('t_notes').value, items };
  const data = await apiFetch(editId ? `/transfers/${editId}` : '/transfers', { method: editId ? 'PUT' : 'POST', body });
  if (data?.success) { showToast(editId ? 'Transfer updated successfully' : 'Transfer created! Awaiting approval.', 'success'); closeModal('transferModal'); loadTransfers(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function viewTransfer(id) {
  const data = await apiFetch(`/transfers/${id}`);
  if (!data?.success) return;
  const t = data.data;
  const statusColors = { pending:'warning', approved:'info', completed:'success', rejected:'danger' };
  document.getElementById('viewTransferTitle').textContent = `🔄 ${t.transfer_number}`;
  document.getElementById('viewTransferContent').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div class="card"><div class="form-label">From</div><div class="text-bold">${t.from_branch_name}</div></div>
      <div class="card"><div class="form-label">To</div><div class="text-bold">${t.to_branch_name}</div></div>
      <div class="card"><div class="form-label">Status</div><span class="badge badge-${statusColors[t.status]}">${t.status}</span></div>
      <div class="card"><div class="form-label">Requested By</div><div class="text-bold">${t.requested_by_name}</div></div>
      <div class="card"><div class="form-label">Date</div><div class="text-bold">${formatDate(t.transfer_date)}</div></div>
      ${t.notes ? `<div class="card"><div class="form-label">Notes</div><div>${t.notes}</div></div>` : ''}
    </div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Product</th><th>Qty</th><th>Serial Numbers</th></tr></thead>
    <tbody>${t.items.map(i=>`<tr>
      <td><div style="font-weight:600;">${i.product_name}</div><div style="font-size:11px;color:var(--text-muted);">${i.brand||''} ${i.model||''}</div></td>
      <td>${i.quantity}</td>
      <td style="font-family:monospace;font-size:11px;">${i.serial_numbers.join(', ')||'-'}</td>
    </tr>`).join('')}</tbody></table></div>`;

  const footer = document.getElementById('viewTransferFooter');
  const user = getUser();
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal('viewTransferModal')">Close</button>`;
  if (t.status === 'pending' && user.role !== 'cashier') {
    footer.innerHTML += `<button class="btn btn-danger" onclick="rejectTransfer(${id})">✕ Reject</button><button class="btn btn-success" onclick="approveTransfer(${id})">✅ Approve</button>`;
  }
  if (t.status === 'approved') {
    footer.innerHTML += `<button class="btn btn-primary" onclick="completeTransfer(${id})">📦 Mark Complete</button>`;
  }
  if (user.role === 'admin') {
    footer.innerHTML += `<button class="btn btn-danger" onclick="deleteTransfer(${id},'${t.transfer_number}')">🗑 Delete</button><button class="btn btn-secondary" onclick="openEditTransfer(${id})">✏️ Edit</button>`;
  }
  openModal('viewTransferModal');
}

async function approveTransfer(id) {
  if (!await confirmDialog('Approve this transfer?')) return;
  const data = await apiFetch(`/transfers/${id}/approve`, { method: 'PUT' });
  if (data?.success) { showToast('Transfer approved!', 'success'); closeModal('viewTransferModal'); loadTransfers(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function rejectTransfer(id) {
  if (!await confirmDialog('Reject this transfer?')) return;
  const data = await apiFetch(`/transfers/${id}/reject`, { method: 'PUT' });
  if (data?.success) { showToast('Transfer rejected', 'success'); closeModal('viewTransferModal'); loadTransfers(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function completeTransfer(id) {
  if (!await confirmDialog('Mark transfer as completed? Stock will be updated.')) return;
  const data = await apiFetch(`/transfers/${id}/complete`, { method: 'PUT' });
  if (data?.success) { showToast('Transfer completed! Stock updated.', 'success'); closeModal('viewTransferModal'); loadTransfers(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function openEditTransfer(id) {
  closeModal('viewTransferModal');
  const data = await apiFetch(`/transfers/${id}`);
  if (!data?.success) return;
  const t = data.data;

  // Wait for branches to load if needed
  if (!document.getElementById('t_from').options.length) {
    await loadBranchesForTransfer();
  }

  document.getElementById('edit_transfer_id').value = t.id;
  document.getElementById('transferModalTitle').textContent = `✏️ Edit Transfer - ${t.transfer_number}`;
  document.getElementById('transferSubmitBtn').textContent = '💾 Update Transfer Request';
  document.getElementById('t_from').value = t.from_branch_id;
  document.getElementById('t_to').value = t.to_branch_id;
  document.getElementById('t_date').value = t.transfer_date ? t.transfer_date.substring(0, 10) : todayISO();
  document.getElementById('t_notes').value = t.notes || '';

  document.getElementById('transferItemsTbody').innerHTML = '';
  t.items.forEach((item, idx) => {
    addTransferRow();
    document.getElementById(`t_prod_name_${idx}`).value = item.product_name;
    document.getElementById(`t_prod_id_${idx}`).value = item.product_id;
    document.getElementById(`t_qty_${idx}`).value = item.quantity;
    document.getElementById(`t_serials_${idx}`).value = item.serial_numbers.join('\n');
    document.getElementById(`t_avail_${idx}`).textContent = `From DB`;
  });
  
  openModal('transferModal');
}

async function deleteTransfer(id, trnNumber) {
  const ok = await confirmDialog(`Delete transfer request ${trnNumber}?\nThis cannot be undone.`);
  if (!ok) return;

  const data = await apiFetch(`/transfers/${id}`, { method: 'DELETE' });
  if (data?.success) {
    showToast('Transfer request deleted', 'success');
    closeModal('viewTransferModal');
    loadTransfers();
  } else {
    showToast(data?.message || 'Delete failed', 'error');
  }
}
