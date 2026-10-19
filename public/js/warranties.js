// Warranties JS
document.addEventListener('DOMContentLoaded', () => { loadWarranties(); document.getElementById('wc_date').value = todayISO(); });

async function loadWarranties(page = 1) {
  const status = document.getElementById('statusFilter')?.value || '';
  const data = await apiFetch(`/warranties?status=${status}&page=${page}&limit=30`);
  const tbody = document.getElementById('warrantiesTbody');
  if (!data?.success) return;
  if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center empty-state" style="padding:30px;">No warranty claims found</td></tr>'; return; }
  const statusColors = { pending:'warning', in_repair:'info', completed:'success', rejected:'danger' };
  tbody.innerHTML = data.data.map(w => `<tr>
    <td style="color:var(--accent);font-weight:700;">${w.claim_number}</td>
    <td style="font-family:monospace;font-size:12px;">${w.serial_number}</td>
    <td><div style="font-weight:600;">${w.product_name}</div><div style="font-size:11px;color:var(--text-muted);">${w.brand||''} ${w.model||''}</div></td>
    <td>${w.customer_name || '-'}</td>
    <td style="font-size:12px;">${formatDate(w.claim_date)}</td>
    <td><span class="badge badge-${statusColors[w.status]||'secondary'}">${w.status.replace('_',' ')}</span></td>
    <td>
      <div class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewClaim(${w.id})">👁 View</button>
        ${w.status!=='completed'&&w.status!=='rejected' ? `<button class="btn btn-success btn-sm" onclick="openResolve(${w.id})">✅ Resolve</button>` : ''}
      </div>
    </td>
  </tr>`).join('');
  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 30, 'loadWarranties');
}

function openNewClaim() { document.getElementById('wc_serial').value = ''; document.getElementById('wc_issue').value = ''; document.getElementById('serialLookupResult').style.display = 'none'; openModal('newClaimModal'); }

async function lookupSerial() {
  const serial = document.getElementById('wc_serial').value.trim();
  if (!serial) { showToast('Enter serial number', 'warning'); return; }
  const data = await apiFetch(`/serials/${encodeURIComponent(serial)}`);
  if (!data?.success) { showToast('Serial not found', 'error'); return; }
  const s = data.data;
  const result = document.getElementById('serialLookupResult');
  const warrantyEnd = s.invoice_date ? new Date(new Date(s.invoice_date).getTime() + (s.warranty_months||0)*30*24*3600*1000) : null;
  const inWarranty = warrantyEnd ? new Date() < warrantyEnd : false;
  document.getElementById('slrProductName').textContent = `${s.product_name} ${s.brand||''} ${s.model||''}`;
  document.getElementById('slrCustomer').textContent = s.customer_name ? `Customer: ${s.customer_name} | Sold: ${formatDate(s.invoice_date)}` : 'No customer linked';
  document.getElementById('slrWarranty').innerHTML = s.warranty_months ? `🔧 ${s.warranty_months}m warranty | Expires: ${formatDate(warrantyEnd)} | <strong style="color:${inWarranty?'var(--green)':'var(--red)'};">${inWarranty?'✅ VALID':'❌ EXPIRED'}</strong>` : 'No warranty info';
  result.style.display = 'block';
}

async function submitClaim() {
  const serial = document.getElementById('wc_serial').value.trim();
  const issue = document.getElementById('wc_issue').value.trim();
  if (!serial || !issue) { showToast('Serial number and issue description required', 'error'); return; }
  const data = await apiFetch('/warranties', { method: 'POST', body: { serial_number: serial, claim_date: document.getElementById('wc_date').value, issue_description: issue, branch_id: getUser().branch_id } });
  if (data?.success) { showToast('Warranty claim created!', 'success'); closeModal('newClaimModal'); loadWarranties(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function viewClaim(id) {
  const data = await apiFetch(`/warranties/${id}`);
  if (!data?.success) return;
  const w = data.data;
  const statusColors = { pending:'warning', in_repair:'info', completed:'success', rejected:'danger' };
  document.getElementById('claimDetailTitle').textContent = `🔧 ${w.claim_number}`;
  document.getElementById('claimDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div class="card"><div class="form-label">Product</div><div class="text-bold">${w.product_name}</div></div>
      <div class="card"><div class="form-label">Serial Number</div><div style="font-family:monospace;font-weight:700;color:var(--accent);">${w.serial_number}</div></div>
      <div class="card"><div class="form-label">Customer</div><div class="text-bold">${w.customer_name||'-'}</div></div>
      <div class="card"><div class="form-label">Status</div><span class="badge badge-${statusColors[w.status]}">${w.status.replace('_',' ')}</span></div>
      <div class="card" style="grid-column:1/-1;"><div class="form-label">Issue Description</div><div style="color:var(--text-primary);line-height:1.6;">${w.issue_description}</div></div>
      ${w.resolution_notes ? `<div class="card" style="grid-column:1/-1;background:rgba(0,255,157,0.05);border-color:rgba(0,255,157,0.2);"><div class="form-label">Resolution</div><div>${w.resolution_notes}</div></div>` : ''}
      ${w.replacement_serial ? `<div class="card"><div class="form-label">Replacement Serial</div><div style="font-family:monospace;color:var(--accent);">${w.replacement_serial}</div></div>` : ''}
    </div>`;
  const footer = document.getElementById('claimDetailFooter');
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal('claimDetailModal')">Close</button>`;
  if (w.status === 'completed') {
    footer.innerHTML += `<button class="btn btn-primary" onclick="printWarrantyInvoice(${id})">🖨️ Print Warranty Invoice</button>`;
  }
  if (w.status !== 'completed' && w.status !== 'rejected') {
    if (w.status === 'pending') footer.innerHTML += `<button class="btn btn-warning" onclick="updateClaimStatus(${id},'in_repair')">🔧 Mark In Repair</button>`;
    footer.innerHTML += `<button class="btn btn-danger" onclick="updateClaimStatus(${id},'rejected')">✕ Reject</button>`;
    footer.innerHTML += `<button class="btn btn-success" onclick="openResolve(${id})">✅ Resolve</button>`;
  }
  openModal('claimDetailModal');
}

async function updateClaimStatus(id, status) {
  const data = await apiFetch(`/warranties/${id}/status`, { method: 'PUT', body: { status } });
  if (data?.success) { showToast(`Status updated to ${status}`, 'success'); closeModal('claimDetailModal'); loadWarranties(); }
  else showToast(data?.message || 'Failed', 'error');
}

async function printWarrantyInvoice(id) {
  const data = await apiFetch(`/warranties/${id}/print`);
  if (!data?.success) { showToast(data?.message || 'Print failed', 'error'); return; }
  const w = data.data;
  
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Warranty Replacement Invoice</title><style>
    body{font-family:'Courier New',Courier,monospace;padding:20px;max-width:800px;margin:0 auto;color:#333;font-size:13px;}
    .hdr{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:15px;margin-bottom:20px;}
    .title{font-size:22px;font-weight:bold;margin:10px 0;}
    .subtitle{font-size:16px;font-weight:bold;margin:5px 0;background:#000;color:#fff;display:inline-block;padding:4px 10px;}
    .meta{display:flex;justify-content:space-between;margin-bottom:20px;}
    .meta-box{background:#f9f9f9;border:1px solid #ddd;padding:10px;width:48%;}
    table{width:100%;border-collapse:collapse;margin-top:20px;margin-bottom:20px;}
    th,td{border:1px solid #ddd;padding:10px;text-align:left;}
    th{background:#f5f5f5;}
    .signature{display:flex;justify-content:space-between;margin-top:60px;}
    .sig-line{border-top:1px solid #000;padding-top:5px;width:200px;text-align:center;}
    @media print{.no-print{display:none}}
  </style></head><body>
    <div class="hdr">
      <img src="/img/INV%202.jpg" style="width:100%; max-height:200px; object-fit:contain; margin-bottom:10px;">
      <div class="subtitle">WARRANTY REPLACEMENT INVOICE</div>
    </div>
    <div class="meta">
      <div class="meta-box">
        <b>Claim Number:</b> ${w.claim_number}<br>
        <b>Claim Date:</b> ${new Date(w.claim_date).toLocaleDateString()}<br>
        <b>Resolved Date:</b> ${new Date(w.resolved_date).toLocaleDateString()}<br>
        <b>Branch:</b> ${w.branch_name || '-'}
      </div>
      <div class="meta-box">
        <b>Customer:</b> ${w.customer_name || 'Walk-in'}<br>
        <b>Phone:</b> ${w.customer_phone || '-'}<br>
        <b>Original Invoice:</b> ${w.invoice_number || '-'}<br>
        <b>Original Date:</b> ${w.invoice_date ? new Date(w.invoice_date).toLocaleDateString() : '-'}
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Product Details</th>
          <th>Original Serial</th>
          <th>Replacement Serial</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${w.product_name}</strong><br>
            <span style="font-size:11px;color:#666;">Brand: ${w.brand || '-'} | Model: ${w.model || '-'}</span><br><br>
            <em>Issue: ${w.issue_description}</em><br>
            <em>Resolution: ${w.resolution_notes}</em>
          </td>
          <td style="vertical-align:top;font-family:monospace;font-weight:bold;color:#d32f2f;">${w.serial_number}</td>
          <td style="vertical-align:top;font-family:monospace;font-weight:bold;color:#388e3c;">${w.replacement_serial || 'PENDING'}</td>
        </tr>
      </tbody>
    </table>
    
    <div style="font-size:11px; color:#555; border:1px dashed #ccc; padding:10px; background:#fefefe; margin-bottom:40px;">
      <b>Note:</b> This document certifies that the original item has been replaced under warranty. The remainder of the original warranty period continues to apply from the original invoice date. This is not a new sale.
    </div>
    
    <div class="signature">
      <div class="sig-line">Customer Signature</div>
      <div class="sig-line">Authorized Signature</div>
    </div>
    <script>setTimeout(() => window.print(), 500);</script>
  </body></html>`);
  win.document.close();
}

function openResolve(id) { document.getElementById('res_claim_id').value = id; document.getElementById('res_notes').value = ''; document.getElementById('res_serial').value = ''; closeModal('claimDetailModal'); openModal('resolveModal'); }

async function submitResolve() {
  const id = document.getElementById('res_claim_id').value;
  const notes = document.getElementById('res_notes').value.trim();
  if (!notes) { showToast('Resolution notes required', 'error'); return; }
  const data = await apiFetch(`/warranties/${id}/resolve`, { method: 'PUT', body: { resolution_notes: notes, replacement_serial: document.getElementById('res_serial').value.trim() || null } });
  if (data?.success) { showToast('Claim resolved!', 'success'); closeModal('resolveModal'); loadWarranties(); }
  else showToast(data?.message || 'Failed', 'error');
}
