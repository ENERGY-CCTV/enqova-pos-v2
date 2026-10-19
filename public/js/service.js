// Service Center & Job Cards Javascript Controller
if (!requireAuth()) {
  // Guarded by app.js requireAuth
}

let activeTechs = [];
let selectedSpares = [];

document.addEventListener('DOMContentLoaded', () => {
  loadTechnicians();
  loadJobs();
});

async function loadTechnicians() {
  const data = await apiFetch('/service/technicians');
  if (data?.success) {
    activeTechs = data.data;
    const filter = document.getElementById('techFilter');
    const select = document.getElementById('jc_tech_select');
    
    const techOptions = activeTechs.map(t => `<option value="${t.id}">${t.full_name} (${t.role})</option>`).join('');
    
    if (filter) filter.innerHTML = '<option value="">All Technicians</option>' + techOptions;
    if (select) select.innerHTML = '<option value="">Select Technician</option>' + techOptions;
  }
}

async function loadJobs(page = 1) {
  const status = document.getElementById('statusFilter')?.value || '';
  const tech = document.getElementById('techFilter')?.value || '';
  const search = document.getElementById('jobSearch')?.value.trim() || '';
  
  const query = `?status=${status}&assigned_to=${tech}&search=${encodeURIComponent(search)}&page=${page}&limit=30`;
  const data = await apiFetch(`/service/jobs${query}`);
  
  const tbody = document.getElementById('jobsTbody');
  if (!data?.success) return;
  
  if (!data.data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center empty-state" style="padding:30px;">No repair job cards found</td></tr>';
    return;
  }
  
  const statusColors = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    delivered: 'primary',
    cancelled: 'danger'
  };
  
  tbody.innerHTML = data.data.map(j => `
    <tr>
      <td style="color:var(--accent); font-weight:700;">${j.job_number}</td>
      <td>
        <div style="font-weight:600;">${j.customer_name}</div>
        <div style="font-size:11px; color:var(--text-muted);">${j.customer_phone}</div>
      </td>
      <td>${j.device_details}</td>
      <td style="font-family:monospace; font-size:12px;">${j.serial_number || '-'}</td>
      <td>${j.technician_name || '<em style="color:var(--text-muted)">Unassigned</em>'}</td>
      <td style="font-size:12px;">${formatDate(j.created_at)}</td>
      <td><span class="badge badge-${statusColors[j.status] || 'secondary'}">${j.status.replace('_', ' ').toUpperCase()}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn btn-secondary btn-sm" onclick="viewJob(${j.id})">👁 View</button>
          ${j.status === 'pending' || j.status === 'in_progress' ? `
            <button class="btn btn-success btn-sm" onclick="openCompleteModal(${j.id})">✅ Complete</button>
          ` : ''}
          ${j.status === 'completed' ? `
            <button class="btn btn-primary btn-sm" onclick="deliverJob(${j.id})">🚪 Deliver</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
  
  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 30, 'loadJobs');
}

const debounceLoadJobs = debounce(() => loadJobs(1), 300);

function openNewJobModal() {
  document.getElementById('jc_cust_name').value = '';
  document.getElementById('jc_cust_phone').value = '';
  document.getElementById('jc_device').value = '';
  document.getElementById('jc_serial').value = '';
  document.getElementById('jc_issue').value = '';
  document.getElementById('jc_est_cost').value = '0';
  document.getElementById('jc_advance').value = '0';
  document.getElementById('jc_tech_select').value = '';
  openModal('newJobModal');
}

async function submitNewJob() {
  const customer_name = document.getElementById('jc_cust_name').value.trim();
  const customer_phone = document.getElementById('jc_cust_phone').value.trim();
  const device_details = document.getElementById('jc_device').value.trim();
  const serial_number = document.getElementById('jc_serial').value.trim();
  const issue_description = document.getElementById('jc_issue').value.trim();
  const estimated_cost = parseFloat(document.getElementById('jc_est_cost').value || 0);
  const advance_paid = parseFloat(document.getElementById('jc_advance').value || 0);
  const assigned_to = document.getElementById('jc_tech_select').value;
  
  if (!customer_name || !customer_phone || !device_details || !issue_description) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  const payload = {
    customer_name,
    customer_phone,
    device_details,
    serial_number,
    issue_description,
    estimated_cost,
    advance_paid,
    assigned_to: assigned_to ? parseInt(assigned_to) : null,
    branch_id: getUser().branch_id
  };
  
  const data = await apiFetch('/service/jobs', {
    method: 'POST',
    body: payload
  });
  
  if (data?.success) {
    showToast('Job card created successfully!', 'success');
    closeModal('newJobModal');
    loadJobs();
    
    // Automatically offer to print
    if (confirm('Do you want to print the Job Card receipt?')) {
      printJobCard(data.data.id);
    }
  } else {
    showToast(data?.message || 'Failed to create job card', 'error');
  }
}

async function viewJob(id) {
  const data = await apiFetch(`/service/jobs/${id}`);
  if (!data?.success) return;
  
  const j = data.data;
  const statusColors = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    delivered: 'primary',
    cancelled: 'danger'
  };
  
  document.getElementById('jobDetailTitle').innerHTML = `🛠️ Job Card: <span style="color:var(--accent)">${j.job_number}</span>`;
  
  let sparesHtml = '';
  if (j.spare_parts && j.spare_parts.length) {
    sparesHtml = `
      <div style="margin-top:16px;">
        <div class="form-label" style="margin-bottom:8px">Spare Parts Installed</div>
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr><th>Part Name</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${j.spare_parts.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${p.quantity}</td>
                <td>${formatCurrency(p.unit_price)}</td>
                <td>${formatCurrency(p.unit_price * p.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  document.getElementById('jobDetailContent').innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
      <div class="card">
        <div class="form-label">Customer Info</div>
        <div class="text-bold" style="font-size:15px;">${j.customer_name}</div>
        <div style="font-size:12px; color:var(--text-muted)">📞 Phone: ${j.customer_phone}</div>
      </div>
      <div class="card">
        <div class="form-label">Device Info</div>
        <div class="text-bold" style="font-size:15px;">${j.device_details}</div>
        <div style="font-size:12px; font-family:monospace; color:var(--accent);">Serial/IMEI: ${j.serial_number || '-'}</div>
      </div>
      <div class="card">
        <div class="form-label">Job Assignment</div>
        <div>Tech Assigned: <strong>${j.technician_name || '<em style="color:var(--text-muted)">Unassigned</em>'}</strong></div>
        <div style="font-size:12px; color:var(--text-muted)">Created: ${formatDate(j.created_at)}</div>
      </div>
      <div class="card">
        <div class="form-label">Financial Status</div>
        <div>Est. Cost: <strong style="color:var(--accent)">${formatCurrency(j.estimated_cost)}</strong></div>
        <div>Advance Paid: <strong style="color:var(--green)">${formatCurrency(j.advance_paid)}</strong></div>
        ${j.status === 'completed' || j.status === 'delivered' ? `
          <div>Final Cost: <strong style="color:var(--accent)">${formatCurrency(j.final_cost)}</strong></div>
          <div>Balance Due: <strong style="color:var(--red)">${formatCurrency(j.final_cost - j.advance_paid)}</strong></div>
        ` : ''}
      </div>
      <div class="card" style="grid-column: 1 / -1">
        <div class="form-label">Issue / Fault Description</div>
        <div style="line-height:1.5; white-space:pre-wrap;">${j.issue_description}</div>
      </div>
      ${j.notes ? `
        <div class="card" style="grid-column: 1 / -1; background:rgba(0,255,157,0.03); border-color:rgba(0,255,157,0.15);">
          <div class="form-label" style="color:var(--green)">Work Resolution / Repair Notes</div>
          <div style="line-height:1.5; white-space:pre-wrap;">${j.notes}</div>
        </div>
      ` : ''}
    </div>
    ${sparesHtml}
  `;
  
  const footer = document.getElementById('jobDetailFooter');
  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal('jobDetailModal')">Close</button>
    <button class="btn btn-primary" onclick="printJobCard(${j.id})">🖨️ Print Job Card</button>
  `;
  
  if (j.status === 'pending') {
    footer.innerHTML += `<button class="btn btn-info" onclick="updateJobStatus(${j.id}, 'in_progress')">🔧 Start Work</button>`;
  }
  if (j.status === 'in_progress') {
    footer.innerHTML += `<button class="btn btn-success" onclick="openCompleteModal(${j.id})">✅ Resolve & Complete</button>`;
  }
  if (j.status === 'completed') {
    footer.innerHTML += `<button class="btn btn-primary" onclick="deliverJob(${j.id})">🚪 Mark Delivered</button>`;
  }
  
  openModal('jobDetailModal');
}

async function updateJobStatus(id, status) {
  const data = await apiFetch(`/service/jobs/${id}/status`, {
    method: 'PUT',
    body: { status }
  });
  if (data?.success) {
    showToast(`Job status updated successfully`, 'success');
    closeModal('jobDetailModal');
    loadJobs();
  } else {
    showToast(data?.message || 'Failed to update status', 'error');
  }
}

async function deliverJob(id) {
  if (confirm('Are you sure you want to mark this device as delivered? This completes the repair cycle.')) {
    const data = await apiFetch(`/service/jobs/${id}/deliver`, {
      method: 'PUT'
    });
    if (data?.success) {
      showToast('Device delivered to customer!', 'success');
      closeModal('jobDetailModal');
      loadJobs();
    } else {
      showToast(data?.message || 'Failed', 'error');
    }
  }
}

async function openCompleteModal(id) {
  const data = await apiFetch(`/service/jobs/${id}`);
  if (!data?.success) return;
  const j = data.data;
  
  document.getElementById('comp_job_id').value = id;
  document.getElementById('comp_notes').value = '';
  document.getElementById('comp_est_cost_lbl').value = formatCurrency(j.estimated_cost);
  document.getElementById('comp_final_cost').value = j.estimated_cost;
  document.getElementById('spareSearch').value = '';
  document.getElementById('spareSuggestions').style.display = 'none';
  selectedSpares = [];
  renderSelectedSpares();
  
  closeModal('jobDetailModal');
  openModal('completeJobModal');
}

// Spare parts lookup logic
async function searchSpares() {
  const search = document.getElementById('spareSearch').value.trim();
  const sugBox = document.getElementById('spareSuggestions');
  if (search.length < 2) {
    sugBox.style.display = 'none';
    return;
  }
  
  // Search products
  const data = await apiFetch(`/products?search=${encodeURIComponent(search)}&limit=5`);
  if (data?.success && data.data.length) {
    sugBox.innerHTML = data.data.map(p => `
      <div onclick="addSparePart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.retail_price})" 
           style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #23304a;" 
           class="sug-item">
        <div style="font-weight:600; font-size:12px; color:var(--text-primary)">${p.name}</div>
        <div style="font-size:11px; color:var(--accent)">Stock: ${p.branch_stocks?.[0]?.quantity || 0} | Price: ${formatCurrency(p.retail_price)}</div>
      </div>
    `).join('');
    sugBox.style.display = 'block';
  } else {
    sugBox.innerHTML = '<div style="padding:8px; font-size:12px; color:var(--text-muted)">No items found</div>';
    sugBox.style.display = 'block';
  }
}

function addSparePart(id, name, price) {
  // Check if already exists in selected spares
  const existingIndex = selectedSpares.findIndex(s => s.product_id === id);
  if (existingIndex > -1) {
    selectedSpares[existingIndex].quantity += 1;
  } else {
    selectedSpares.push({
      product_id: id,
      name: name,
      quantity: 1,
      unit_price: price
    });
  }
  
  document.getElementById('spareSearch').value = '';
  document.getElementById('spareSuggestions').style.display = 'none';
  renderSelectedSpares();
  recalculateFinalCost();
}

function removeSparePart(index) {
  selectedSpares.splice(index, 1);
  renderSelectedSpares();
  recalculateFinalCost();
}

function updateSpareQty(index, qty) {
  selectedSpares[index].quantity = parseInt(qty) || 1;
  recalculateFinalCost();
}

function recalculateFinalCost() {
  const estCost = parseFloat(document.getElementById('comp_final_cost').value || 0);
  let partsTotal = 0;
  selectedSpares.forEach(s => { partsTotal += s.quantity * s.unit_price; });
  // Set default recommendation
  // Wait, does the user want the final cost to auto-increment with parts? We can let them edit it but it's helpful to show the parts cost.
}

function renderSelectedSpares() {
  const container = document.getElementById('selectedSparesContainer');
  if (!selectedSpares.length) {
    container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:12px;">No spare parts added</div>';
    return;
  }
  
  container.innerHTML = selectedSpares.map((s, idx) => `
    <div class="spare-part-row" style="display:grid; grid-template-columns: 2fr 1fr 1fr 40px; gap:8px;">
      <div style="font-size:12px; font-weight:500;">${s.name}</div>
      <div><input type="number" class="form-control" value="${s.quantity}" min="1" onchange="updateSpareQty(${idx}, this.value)" style="padding:4px 8px; height:auto;"></div>
      <div style="font-size:12px;">${formatCurrency(s.unit_price)}</div>
      <div><button class="btn btn-danger btn-sm" onclick="removeSparePart(${idx})" style="padding:4px 8px; font-size:11px;">✕</button></div>
    </div>
  `).join('');
}

async function submitCompleteJob() {
  const id = document.getElementById('comp_job_id').value;
  const notes = document.getElementById('comp_notes').value.trim();
  const final_cost = parseFloat(document.getElementById('comp_final_cost').value || 0);
  
  if (!notes) {
    showToast('Please enter resolution work notes', 'error');
    return;
  }
  
  const payload = {
    final_cost,
    resolution_notes: notes,
    spare_parts: selectedSpares
  };
  
  const data = await apiFetch(`/service/jobs/${id}/complete`, {
    method: 'PUT',
    body: payload
  });
  
  if (data?.success) {
    showToast('Repair job completed successfully!', 'success');
    closeModal('completeJobModal');
    loadJobs();
  } else {
    showToast(data?.message || 'Failed to complete repair', 'error');
  }
}

async function printJobCard(id) {
  const data = await apiFetch(`/service/jobs/${id}`);
  if (!data?.success) return;
  
  const j = data.data;
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Job Card - ${j.job_number}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 20px; line-height: 1.4; font-size: 14px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .logo-section { display: flex; flex-direction: column; }
        .logo-title { font-size: 24px; font-weight: bold; color: #0a0e1a; }
        .job-title { font-size: 20px; font-weight: bold; text-align: right; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .card { border: 1px solid #ccc; padding: 15px; border-radius: 6px; background: #fafafa; }
        .card-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 8px; font-size: 12px; color: #666; text-transform: uppercase; }
        .text-bold { font-weight: bold; }
        .field { margin-bottom: 6px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .footer { border-top: 1px solid #ddd; margin-top: 40px; padding-top: 20px; font-size: 11px; text-align: center; color: #666; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 50px; }
        .sig-line { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 5px; font-size: 12px; }
        @media print {
          body { margin: 10px; font-size: 12px; }
          .card { background: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          <span class="logo-title">ENQOVA</span>
          <span style="font-size:11px; color:#555">Camera & Security Solutions</span>
        </div>
        <div class="job-title">
          REPAIR JOB CARD<br>
          <span style="font-size:14px; color:#c00">${j.job_number}</span>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Customer Details</div>
          <div class="field"><span class="text-bold">Customer:</span> ${j.customer_name}</div>
          <div class="field"><span class="text-bold">Phone:</span> ${j.customer_phone}</div>
          <div class="field"><span class="text-bold">Branch:</span> ${j.branch_name}</div>
        </div>
        
        <div class="card">
          <div class="card-title">Device & Job Status</div>
          <div class="field"><span class="text-bold">Device:</span> ${j.device_details}</div>
          <div class="field"><span class="text-bold">Serial/IMEI:</span> ${j.serial_number || 'N/A'}</div>
          <div class="field"><span class="text-bold">Date Received:</span> ${new Date(j.created_at).toLocaleDateString()}</div>
          <div class="field"><span class="text-bold">Assigned Tech:</span> ${j.technician_name || 'Unassigned'}</div>
        </div>
      </div>
      
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-title">Fault Description / Reported Problem</div>
        <div style="font-size:15px; white-space:pre-wrap; font-style:italic;">${j.issue_description}</div>
      </div>
      
      <div class="grid-2" style="grid-template-columns: 2fr 1fr;">
        <div class="card">
          <div class="card-title">Terms & Conditions</div>
          <div style="font-size:10px; color:#555; line-height: 1.3;">
            1. Estimated costs are subject to change if additional faults are found.<br>
            2. Devices not claimed within 60 days of completion are subject to disposal.<br>
            3. No warranty on physical damage, burn cases, or lightning damage repairs.<br>
            4. Original Job Card receipt must be produced to collect the device.
          </div>
        </div>
        <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
          <div class="field"><span class="text-bold">Est. Repair Cost:</span> Rs. ${parseFloat(j.estimated_cost).toFixed(2)}</div>
          <div class="field"><span class="text-bold">Advance Paid:</span> Rs. ${parseFloat(j.advance_paid).toFixed(2)}</div>
          <div class="field" style="border-top:1px solid #ddd; padding-top:6px; margin-top:6px; font-size:15px; color:#c00">
            <span class="text-bold">Estimated Bal:</span> Rs. ${parseFloat(j.estimated_cost - j.advance_paid).toFixed(2)}
          </div>
        </div>
      </div>
      
      <div class="sig-section">
        <div class="sig-line">Customer Signature</div>
        <div class="sig-line">Received By / Technician</div>
      </div>
      
      <div class="footer">
        ENQOVA • No. 45, Galle Road, Colombo 03, Sri Lanka • 0112345678 • info@enqova.lk
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          // window.close();
        }
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(printHtml);
  printWindow.document.close();
}
