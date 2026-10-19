// Job Sheets - Client Side Script
requireAuth();

let currentPage = 1;
let debounceTimer;

const leftItemsConfig = [
  { type: 'header', label: 'VIDEO CABLE' },
  { type: 'item', id: 'left_vid_cable_kelani', label: 'KELANI', sub: true },
  { type: 'item', id: 'left_vid_cable_hang', label: 'HANG', sub: true },
  { type: 'item', id: 'left_vid_cable_hvn', label: 'HIKVISION', sub: true },
  { type: 'item', id: 'left_vid_cable_gen', label: 'VIDEO CABLE (General)' },
  { type: 'item', id: 'left_tt_wire', label: '(TT) WIRE MTR' },
  { type: 'item', id: 'left_3pin_power', label: '3 PIN POWER CABLE' },
  { type: 'item', id: 'left_dc_male', label: 'DC MALE' },
  { type: 'item', id: 'left_dc_female', label: 'DC FEMALE' },
  { type: 'item', id: 'left_ip_box', label: 'IP BOX' },
  { type: 'item', id: 'left_sunk_box', label: 'SUNK BOX' },
  { type: 'item', id: 'left_router', label: 'ROUTER' },
  { type: 'item', id: 'left_sim', label: 'SIM' },
  { type: 'item', id: 'left_dvr_rack', label: 'DVR RACK (3U RACK)' },
  { type: 'item', id: 'left_bnc', label: 'BNC' },
  { type: 'item', id: 'left_bnc_mx', label: 'BNC MX' },
  { type: 'item', id: 'left_rj45', label: 'RJ 45' },
  { type: 'item', id: 'left_battery_ps', label: 'BATTERY - PS' },
  { type: 'header', label: 'SWITCH' },
  { type: 'item', id: 'left_switch_nun', label: 'NUN-P', sub: true },
  { type: 'item', id: 'left_switch_poe', label: 'POE', sub: true },
  { type: 'item', id: 'left_wifi_ext', label: 'WIFI EXTENDER' },
  { type: 'item', id: 'left_wall_mount', label: 'WALL MOUNT' },
  { type: 'item', id: 'left_mon_hvn', label: 'HIKVISION MONITOR' },
  { type: 'item', id: 'left_mon_len', label: 'LENOVO MONITOR' },
  { type: 'item', id: 'left_ups', label: 'UPS' },
  { type: 'item', id: 'left_dvr', label: 'DVR' },
  { type: 'item', id: 'left_hard_disk', label: 'HARD DISK' },
  { type: 'item', id: 'left_memory_card', label: 'MEMORY CARD' }
];

const rightItemsConfig = [
  { type: 'header', label: 'CABLE M' },
  { type: 'item', id: 'right_cable_05', label: 'Size 0.5', sub: true },
  { type: 'item', id: 'right_cable_15', label: 'Size 1.5', sub: true },
  { type: 'item', id: 'right_cable_3', label: 'Size 3m', sub: true },
  { type: 'item', id: 'right_cable_5', label: 'Size 5m', sub: true },
  { type: 'item', id: 'right_cable_10', label: 'Size 10m', sub: true },
  { type: 'header', label: 'USB' },
  { type: 'item', id: 'right_usb_buy', label: 'USB BUY', sub: true },
  { type: 'item', id: 'right_usb_rtn', label: 'USB RTN', sub: true },
  { type: 'header', label: 'VGA' },
  { type: 'item', id: 'right_vga_15', label: 'Size 1.5', sub: true },
  { type: 'item', id: 'right_vga_3', label: 'Size 3m', sub: true },
  { type: 'item', id: 'right_vga_5', label: 'Size 5m', sub: true },
  { type: 'header', label: 'NETWORK (BUY / RTN)' },
  { type: 'item', id: 'right_net_1_buy', label: 'Size 1 (BUY)', sub: true },
  { type: 'item', id: 'right_net_1_rtn', label: 'Size 1 (RTN)', sub: true },
  { type: 'item', id: 'right_net_2_buy', label: 'Size 2 (BUY)', sub: true },
  { type: 'item', id: 'right_net_2_rtn', label: 'Size 2 (RTN)', sub: true },
  { type: 'item', id: 'right_net_5_buy', label: 'Size 5 (BUY)', sub: true },
  { type: 'item', id: 'right_net_5_rtn', label: 'Size 5 (RTN)', sub: true },
  { type: 'item', id: 'right_net_10_buy', label: 'Size 10 (BUY)', sub: true },
  { type: 'item', id: 'right_net_10_rtn', label: 'Size 10 (RTN)', sub: true },
  { type: 'header', label: 'HDMI (BUY / RTN)' },
  { type: 'item', id: 'right_hdmi_1_buy', label: 'HDMI 1m (BUY)', sub: true },
  { type: 'item', id: 'right_hdmi_1_rtn', label: 'HDMI 1m (RTN)', sub: true },
  { type: 'item', id: 'right_hdmi_15_buy', label: 'HDMI 1.5m (BUY)', sub: true },
  { type: 'item', id: 'right_hdmi_15_rtn', label: 'HDMI 1.5m (RTN)', sub: true },
  { type: 'item', id: 'right_hdmi_3_buy', label: 'HDMI 3m (BUY)', sub: true },
  { type: 'item', id: 'right_hdmi_3_rtn', label: 'HDMI 3m (RTN)', sub: true },
  { type: 'item', id: 'right_hdmi_5_buy', label: 'HDMI 5m (BUY)', sub: true },
  { type: 'item', id: 'right_hdmi_5_rtn', label: 'HDMI 5m (RTN)', sub: true },
  { type: 'item', id: 'right_hdmi_10_buy', label: 'HDMI 10m (BUY)', sub: true },
  { type: 'item', id: 'right_hdmi_10_rtn', label: 'HDMI 10m (RTN)', sub: true },
  { type: 'header', label: 'POWER /S' },
  { type: 'item', id: 'right_power_25', label: 'Size 2.5', sub: true },
  { type: 'item', id: 'right_power_5a', label: 'Size 5A', sub: true },
  { type: 'item', id: 'right_power_10a', label: 'Size 10A', sub: true },
  { type: 'item', id: 'right_power_20a', label: 'Size 20A', sub: true },
  { type: 'item', id: 'right_power_30a', label: 'Size 30A', sub: true },
  { type: 'header', label: 'BRACKET' },
  { type: 'item', id: 'right_bracket_25', label: 'Size 25', sub: true },
  { type: 'item', id: 'right_bracket_32', label: 'Size 32', sub: true },
  { type: 'item', id: 'right_bracket_40', label: 'Size 40', sub: true },
  { type: 'item', id: 'right_bracket_50', label: 'Size 50', sub: true },
  { type: 'item', id: 'right_bracket_l', label: 'L BRACKET' },
  { type: 'item', id: 'right_bracket_i', label: 'I BRACKET' },
  { type: 'header', label: 'PL BRACKET' },
  { type: 'item', id: 'right_pl_bracket_qty', label: 'PL BRACKET (QTY)', sub: true },
  { type: 'item', id: 'right_pl_bracket_use', label: 'PL BRACKET (USE)', sub: true },
  { type: 'item', id: 'right_dome_b', label: 'DOME / B' },
  { type: 'header', label: 'SERIALIZED ACCESSORIES' },
  { type: 'item', id: 'right_fingerprint_sn', label: 'FINGERPRINT (Serial No)' },
  { type: 'item', id: 'right_alarm_sn', label: 'ALARM SYSTEM (Serial No)' },
  { type: 'item', id: 'right_video_dphone', label: 'VIDEO D/PHONE' }
];

const leftFields = leftItemsConfig.filter(i => i.type === 'item').map(i => i.id);
const rightFields = rightItemsConfig.filter(i => i.type === 'item').map(i => i.id);
const allFields = [...leftFields, ...rightFields];

document.addEventListener('DOMContentLoaded', () => {
  renderGridTables();
  loadTechnicians();
  loadSheets();
});

function renderGridTables() {
  const renderList = (config, tbodyId) => {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = config.map(c => {
      if (c.type === 'header') {
        return `<tr><td colspan="2" class="grid-section-hdr">${c.label}</td></tr>`;
      }
      return `
        <tr>
          <td class="${c.sub ? 'sub-label' : 'cell-lbl'}">${c.label}</td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" id="${c.id}" min="0" placeholder="0" style="width:45px;" oninput="renderSerialInputs('${c.id}', this.value)">
              <button class="btn btn-secondary btn-sm" onclick="toggleSerials('${c.id}')" style="padding: 2px 4px; font-size:10px;" title="Serials">🔑</button>
            </div>
            <div id="serials_container_${c.id}" class="serial-row-container" style="display:none;"></div>
          </td>
        </tr>
      `;
    }).join('');
  };
  renderList(leftItemsConfig, 'leftGridTbody');
  renderList(rightItemsConfig, 'rightGridTbody');
}

function renderSerialInputs(id, qty, prefilledSerials = []) {
  const container = document.getElementById(`serials_container_${id}`);
  if (!container) return;
  const num = parseInt(qty) || 0;
  
  // Keep existing values unless prefilled is provided
  let values = [];
  if (prefilledSerials.length > 0) {
    values = prefilledSerials;
  } else {
    const currentInputs = container.querySelectorAll('input');
    currentInputs.forEach(inp => values.push(inp.value));
  }
  
  let html = '';
  for (let i = 0; i < num; i++) {
    const val = values[i] || '';
    html += `
      <div>
        <span style="font-size:9px; color:var(--text-muted);">#${i+1}:</span>
        <input type="text" data-serial-index="${i}" value="${val}" placeholder="Serial/IMEI" style="width:100%; font-size:10px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:2px 4px;">
      </div>
    `;
  }
  container.innerHTML = html;
  if (num > 0) {
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
  }
}

function toggleSerials(id) {
  const container = document.getElementById(`serials_container_${id}`);
  if (!container) return;
  if (container.style.display === 'none') {
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
  }
}

function debounceLoadSheets() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadSheets(1), 350);
}

async function loadTechnicians() {
  const data = await apiFetch('/service/technicians');
  if (data?.success) {
    const sel = document.getElementById('sh_tech_select');
    sel.innerHTML = '<option value="">-- Select Lead Tech --</option>' + 
      data.data.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('');
  }
}

async function loadSheets(page = 1) {
  currentPage = page;
  const search = document.getElementById('sheetSearch').value.trim();
  const data = await apiFetch(`/jobsheets?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  
  const tbody = document.getElementById('sheetsTbody');
  if (!data?.success || !data.data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:30px;">No Job Sheets found</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = data.data.map(j => `<tr>
    <td style="color:var(--accent);font-weight:600;cursor:pointer;" onclick="viewJobSheet(${j.id})">${j.job_sheet_number}</td>
    <td>${formatDate(j.job_date)}</td>
    <td>${j.technician_names || j.technician_name || '-'}</td>
    <td>${j.customer_name || '-'}</td>
    <td>${j.quotation_number || '-'}</td>
    <td>${j.customer_phone || '-'}</td>
    <td>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="viewJobSheet(${j.id})">👁 View</button>
        <button class="btn btn-ghost btn-sm" onclick="invoiceJobSheet(${j.id})">🛒 Invoice</button>
        <button class="btn btn-ghost btn-sm" style="color:#f0a500;" onclick="openReturnModal(${j.id})">↩ Return</button>
        <button class="btn btn-ghost btn-sm" onclick="editJobSheet(${j.id})">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="printJobSheet(${j.id})">🖨 Print</button>
        <button class="btn btn-danger btn-sm" onclick="deleteJobSheet(${j.id})">🗑</button>
      </div>
    </td>
  </tr>`).join('');

  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 20, 'loadSheets');
}

function openNewSheetModal() {
  document.getElementById('sheet_id').value = '';
  document.getElementById('sheetModalTitle').textContent = '📋 Create New Job Sheet';
  
  // Clear general info
  document.getElementById('sh_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('sh_tech_names').value = '';
  document.getElementById('sh_cust_name').value = '';
  document.getElementById('sh_cust_phone').value = '';
  document.getElementById('sh_cust_address').value = '';
  document.getElementById('sh_quat_no').value = '';
  document.getElementById('sh_tech_select').value = '';

  // Clear all grid inputs & container HTMLs
  allFields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
    const container = document.getElementById(`serials_container_${f}`);
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  });

  openModal('sheetModal');
}

async function saveJobSheet() {
  const date = document.getElementById('sh_date').value;
  const techNames = document.getElementById('sh_tech_names').value.trim();
  const custName = document.getElementById('sh_cust_name').value.trim();
  const custPhone = document.getElementById('sh_cust_phone').value.trim();
  const custAddress = document.getElementById('sh_cust_address').value.trim();
  const quatNo = document.getElementById('sh_quat_no').value.trim();
  const techId = document.getElementById('sh_tech_select').value || null;

  if (!date || !techNames || !custName) {
    showToast('Date, Technician names, and Customer name are required.', 'error');
    return;
  }

  // Construct JSON items data
  const items_data = {};
  allFields.forEach(id => {
    const qtyInput = document.getElementById(id);
    if (qtyInput) {
      const qty = parseInt(qtyInput.value) || 0;
      const serialContainer = document.getElementById(`serials_container_${id}`);
      const serials = [];
      if (serialContainer) {
        const serialInputs = serialContainer.querySelectorAll('input');
        serialInputs.forEach(inp => {
          serials.push(inp.value.trim());
        });
      }
      items_data[id] = { qty, serials };
    }
  });

  const body = {
    technician_id: techId,
    technician_names: techNames,
    job_date: date,
    customer_name: custName,
    customer_address: custAddress,
    customer_phone: custPhone,
    quotation_number: quatNo,
    items_data
  };

  const id = document.getElementById('sheet_id').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/jobsheets/${id}` : '/jobsheets';

  const data = await apiFetch(url, { method, body });
  if (data?.success) {
    showToast(id ? 'Job Sheet updated!' : 'Job Sheet created!', 'success');
    closeModal('sheetModal');
    loadSheets(currentPage);
  } else {
    showToast(data?.message || 'Failed to save', 'error');
  }
}

async function editJobSheet(id) {
  const data = await apiFetch(`/jobsheets/${id}`);
  if (!data?.success) return;
  const j = data.data;

  document.getElementById('sheet_id').value = j.id;
  document.getElementById('sheetModalTitle').textContent = `✏️ Edit Job Sheet ${j.job_sheet_number}`;
  
  // Populate general info
  document.getElementById('sh_date').value = j.job_date.split('T')[0];
  document.getElementById('sh_tech_names').value = j.technician_names || '';
  document.getElementById('sh_cust_name').value = j.customer_name || '';
  document.getElementById('sh_cust_phone').value = j.customer_phone || '';
  document.getElementById('sh_cust_address').value = j.customer_address || '';
  document.getElementById('sh_quat_no').value = j.quotation_number || '';
  document.getElementById('sh_tech_select').value = j.technician_id || '';

  // Populate grid inputs
  const grid = j.items_data || {};
  allFields.forEach(id => {
    const qtyInput = document.getElementById(id);
    if (qtyInput) {
      const itemVal = grid[id] || { qty: 0, serials: [] };
      const qty = (typeof itemVal === 'object') ? (itemVal.qty || 0) : (parseInt(itemVal) || 0);
      const serials = (typeof itemVal === 'object') ? (itemVal.serials || []) : [];
      
      qtyInput.value = qty > 0 ? qty : '';
      renderSerialInputs(id, qty, serials);
    }
  });

  openModal('sheetModal');
}

async function viewJobSheet(id) {
  const data = await apiFetch(`/jobsheets/${id}`);
  if (!data?.success) return;
  const j = data.data;
  const grid = j.items_data || {};

  document.getElementById('sheetViewTitle').textContent = `📄 Job Sheet - ${j.job_sheet_number}`;

  // Helper to format values and unit serial badges dynamically
  const val = key => {
    const itemVal = grid[key];
    if (!itemVal) return '-';
    const qty = typeof itemVal === 'object' ? itemVal.qty : parseInt(itemVal);
    const serials = typeof itemVal === 'object' ? itemVal.serials : [];
    if (!qty) return '-';
    
    let res = `<span style="font-weight:700; color:var(--accent);">${qty}</span>`;
    const filledSerials = (serials || []).filter(sn => sn.trim());
    if (filledSerials.length > 0) {
      const serialBadges = filledSerials.map((sn, idx) => `
        <span class="badge badge-info" style="font-size:9px; font-family:monospace; margin-top:2px; display:inline-block; margin-right:4px;">#${idx+1}: ${sn}</span>
      `).join('');
      res += `<div style="margin-top:4px;">${serialBadges}</div>`;
    }
    return res;
  };

  let html = `
    <!-- Top Details -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; padding:12px;">
      <div><b>Job Sheet #:</b> ${j.job_sheet_number}</div>
      <div><b>Date:</b> ${formatDate(j.job_date)}</div>
      <div><b>Technicians:</b> ${j.technician_names || '-'}</div>
      <div><b>Customer:</b> ${j.customer_name || '-'}</div>
      <div><b>Phone:</b> ${j.customer_phone || '-'}</div>
      <div><b>Address:</b> ${j.customer_address || '-'}</div>
      <div style="grid-column: 1 / -1;"><b>Quotation No:</b> ${j.quotation_number || '-'}</div>
    </div>

    <!-- Dual Column Grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
      
      <!-- Left Column -->
      <div>
        <table class="grid-table">
          <thead>
            <tr>
              <th style="width: 60%;">ITEMS (LEFT)</th>
              <th style="width: 40%; text-align:center;">QTY & SERIALS</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="2" class="grid-section-hdr">VIDEO CABLE</td></tr>
            <tr><td class="sub-label">KELANI</td><td style="text-align:center;">${val('left_vid_cable_kelani')}</td></tr>
            <tr><td class="sub-label">HANG</td><td style="text-align:center;">${val('left_vid_cable_hang')}</td></tr>
            <tr><td class="sub-label">HIKVISION</td><td style="text-align:center;">${val('left_vid_cable_hvn')}</td></tr>
            <tr><td class="cell-lbl">VIDEO CABLE (General)</td><td style="text-align:center;">${val('left_vid_cable_gen')}</td></tr>
            <tr><td class="cell-lbl">(TT) WIRE MTR</td><td style="text-align:center;">${val('left_tt_wire')}</td></tr>
            <tr><td class="cell-lbl">3 PIN POWER CABLE</td><td style="text-align:center;">${val('left_3pin_power')}</td></tr>
            <tr><td class="cell-lbl">DC MALE</td><td style="text-align:center;">${val('left_dc_male')}</td></tr>
            <tr><td class="cell-lbl">DC FEMALE</td><td style="text-align:center;">${val('left_dc_female')}</td></tr>
            <tr><td class="cell-lbl">IP BOX</td><td style="text-align:center;">${val('left_ip_box')}</td></tr>
            <tr><td class="cell-lbl">SUNK BOX</td><td style="text-align:center;">${val('left_sunk_box')}</td></tr>
            <tr><td class="cell-lbl">ROUTER</td><td style="text-align:center;">${val('left_router')}</td></tr>
            <tr><td class="cell-lbl">SIM</td><td style="text-align:center;">${val('left_sim')}</td></tr>
            <tr><td class="cell-lbl">DVR RACK (3U RACK)</td><td style="text-align:center;">${val('left_dvr_rack')}</td></tr>
            <tr><td class="cell-lbl">BNC</td><td style="text-align:center;">${val('left_bnc')}</td></tr>
            <tr><td class="cell-lbl">BNC MX</td><td style="text-align:center;">${val('left_bnc_mx')}</td></tr>
            <tr><td class="cell-lbl">RJ 45</td><td style="text-align:center;">${val('left_rj45')}</td></tr>
            <tr><td class="cell-lbl">BATTERY - PS</td><td style="text-align:center;">${val('left_battery_ps')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">SWITCH</td></tr>
            <tr><td class="sub-label">NUN-P</td><td style="text-align:center;">${val('left_switch_nun')}</td></tr>
            <tr><td class="sub-label">POE</td><td style="text-align:center;">${val('left_switch_poe')}</td></tr>
            
            <tr><td class="cell-lbl">WIFI EXTENDER</td><td style="text-align:center;">${val('left_wifi_ext')}</td></tr>
            <tr><td class="cell-lbl">WALL MOUNT</td><td style="text-align:center;">${val('left_wall_mount')}</td></tr>
            <tr><td class="cell-lbl">HIKVISION MONITOR</td><td style="text-align:center;">${val('left_mon_hvn')}</td></tr>
            <tr><td class="cell-lbl">LENOVO MONITOR</td><td style="text-align:center;">${val('left_mon_len')}</td></tr>
            <tr><td class="cell-lbl">UPS</td><td style="text-align:center;">${val('left_ups')}</td></tr>
            <tr><td class="cell-lbl">DVR</td><td style="text-align:center;">${val('left_dvr')}</td></tr>
            <tr><td class="cell-lbl">HARD DISK</td><td style="text-align:center;">${val('left_hard_disk')}</td></tr>
            <tr><td class="cell-lbl">MEMORY CARD</td><td style="text-align:center;">${val('left_memory_card')}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Right Column -->
      <div>
        <table class="grid-table">
          <thead>
            <tr>
              <th style="width: 60%;">ITEMS (RIGHT)</th>
              <th style="width: 40%; text-align:center;">QTY & SERIALS</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="2" class="grid-section-hdr">CABLE M</td></tr>
            <tr><td class="sub-label">Size 0.5</td><td style="text-align:center;">${val('right_cable_05')}</td></tr>
            <tr><td class="sub-label">Size 1.5</td><td style="text-align:center;">${val('right_cable_15')}</td></tr>
            <tr><td class="sub-label">Size 3m</td><td style="text-align:center;">${val('right_cable_3')}</td></tr>
            <tr><td class="sub-label">Size 5m</td><td style="text-align:center;">${val('right_cable_5')}</td></tr>
            <tr><td class="sub-label">Size 10m</td><td style="text-align:center;">${val('right_cable_10')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">USB</td></tr>
            <tr><td class="sub-label">USB BUY</td><td style="text-align:center;">${val('right_usb_buy')}</td></tr>
            <tr><td class="sub-label">USB RTN</td><td style="text-align:center;">${val('right_usb_rtn')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">VGA</td></tr>
            <tr><td class="sub-label">Size 1.5</td><td style="text-align:center;">${val('right_vga_15')}</td></tr>
            <tr><td class="sub-label">Size 3m</td><td style="text-align:center;">${val('right_vga_3')}</td></tr>
            <tr><td class="sub-label">Size 5m</td><td style="text-align:center;">${val('right_vga_5')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">NETWORK (BUY / RTN)</td></tr>
            <tr><td class="sub-label">Size 1 (BUY)</td><td style="text-align:center;">${val('right_net_1_buy')}</td></tr>
            <tr><td class="sub-label">Size 1 (RTN)</td><td style="text-align:center;">${val('right_net_1_rtn')}</td></tr>
            <tr><td class="sub-label">Size 2 (BUY)</td><td style="text-align:center;">${val('right_net_2_buy')}</td></tr>
            <tr><td class="sub-label">Size 2 (RTN)</td><td style="text-align:center;">${val('right_net_2_rtn')}</td></tr>
            <tr><td class="sub-label">Size 5 (BUY)</td><td style="text-align:center;">${val('right_net_5_buy')}</td></tr>
            <tr><td class="sub-label">Size 5 (RTN)</td><td style="text-align:center;">${val('right_net_5_rtn')}</td></tr>
            <tr><td class="sub-label">Size 10 (BUY)</td><td style="text-align:center;">${val('right_net_10_buy')}</td></tr>
            <tr><td class="sub-label">Size 10 (RTN)</td><td style="text-align:center;">${val('right_net_10_rtn')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">HDMI (BUY / RTN)</td></tr>
            <tr><td class="sub-label">HDMI 1m (BUY)</td><td style="text-align:center;">${val('right_hdmi_1_buy')}</td></tr>
            <tr><td class="sub-label">HDMI 1m (RTN)</td><td style="text-align:center;">${val('right_hdmi_1_rtn')}</td></tr>
            <tr><td class="sub-label">HDMI 1.5m (BUY)</td><td style="text-align:center;">${val('right_hdmi_15_buy')}</td></tr>
            <tr><td class="sub-label">HDMI 1.5m (RTN)</td><td style="text-align:center;">${val('right_hdmi_15_rtn')}</td></tr>
            <tr><td class="sub-label">HDMI 3m (BUY)</td><td style="text-align:center;">${val('right_hdmi_3_buy')}</td></tr>
            <tr><td class="sub-label">HDMI 3m (RTN)</td><td style="text-align:center;">${val('right_hdmi_3_rtn')}</td></tr>
            <tr><td class="sub-label">HDMI 5m (BUY)</td><td style="text-align:center;">${val('right_hdmi_5_buy')}</td></tr>
            <tr><td class="sub-label">HDMI 5m (RTN)</td><td style="text-align:center;">${val('right_hdmi_5_rtn')}</td></tr>
            <tr><td class="sub-label">HDMI 10m (BUY)</td><td style="text-align:center;">${val('right_hdmi_10_buy')}</td></tr>
            <tr><td class="sub-label">HDMI 10m (RTN)</td><td style="text-align:center;">${val('right_hdmi_10_rtn')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">POWER /S</td></tr>
            <tr><td class="sub-label">Size 2.5</td><td style="text-align:center;">${val('right_power_25')}</td></tr>
            <tr><td class="sub-label">Size 5A</td><td style="text-align:center;">${val('right_power_5a')}</td></tr>
            <tr><td class="sub-label">Size 10A</td><td style="text-align:center;">${val('right_power_10a')}</td></tr>
            <tr><td class="sub-label">Size 20A</td><td style="text-align:center;">${val('right_power_20a')}</td></tr>
            <tr><td class="sub-label">Size 30A</td><td style="text-align:center;">${val('right_power_30a')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">BRACKET</td></tr>
            <tr><td class="sub-label">Size 25</td><td style="text-align:center;">${val('right_bracket_25')}</td></tr>
            <tr><td class="sub-label">Size 32</td><td style="text-align:center;">${val('right_bracket_32')}</td></tr>
            <tr><td class="sub-label">Size 40</td><td style="text-align:center;">${val('right_bracket_40')}</td></tr>
            <tr><td class="sub-label">Size 50</td><td style="text-align:center;">${val('right_bracket_50')}</td></tr>
            
            <tr><td class="cell-lbl">L BRACKET</td><td style="text-align:center;">${val('right_bracket_l')}</td></tr>
            <tr><td class="cell-lbl">I BRACKET</td><td style="text-align:center;">${val('right_bracket_i')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">PL BRACKET</td></tr>
            <tr><td class="sub-label">PL BRACKET (QTY)</td><td style="text-align:center;">${val('right_pl_bracket_qty')}</td></tr>
            <tr><td class="sub-label">PL BRACKET (USE)</td><td style="text-align:center;">${val('right_pl_bracket_use')}</td></tr>
            
            <tr><td class="cell-lbl">DOME / B</td><td style="text-align:center;">${val('right_dome_b')}</td></tr>
            
            <tr><td colspan="2" class="grid-section-hdr">SERIALIZED ACCESSORIES</td></tr>
            <tr><td class="cell-lbl">FINGERPRINT (Serial No)</td><td style="text-align:center;">${val('right_fingerprint_sn')}</td></tr>
            <tr><td class="cell-lbl">ALARM SYSTEM (Serial No)</td><td style="text-align:center;">${val('right_alarm_sn')}</td></tr>
            <tr><td class="cell-lbl">VIDEO D/PHONE</td><td style="text-align:center;">${val('right_video_dphone')}</td></tr>
          </tbody>
        </table>
      </div>

    </div>
  `;

  document.getElementById('sheetViewContent').innerHTML = html;
  
  document.getElementById('sheetViewFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal('sheetViewModal')">Close</button>
    <button class="btn btn-success" onclick="invoiceJobSheet(${j.id})">🛒 Invoice</button>
    <button class="btn btn-warning" onclick="closeModal('sheetViewModal'); openReturnModal(${j.id})" style="background:#f0a500;color:#000;border:none;">↩ Return Items</button>
    <button class="btn btn-ghost" onclick="printJobSheet(${j.id})">🖨 Print</button>
    <button class="btn btn-primary" onclick="closeModal('sheetViewModal'); editJobSheet(${j.id})">✏️ Edit</button>
  `;

  openModal('sheetViewModal');
}

async function deleteJobSheet(id) {
  const ok = await confirmDialog('Delete this Job Sheet? This cannot be undone.');
  if (!ok) return;
  const data = await apiFetch(`/jobsheets/${id}`, { method: 'DELETE' });
  if (data?.success) {
    showToast('Job Sheet deleted successfully!', 'success');
    loadSheets(currentPage);
  } else {
    showToast(data?.message || 'Failed to delete', 'error');
  }
}

async function printJobSheet(id) {
  const data = await apiFetch(`/jobsheets/${id}`);
  if (!data?.success) {
    showToast('Failed to load job sheet', 'error');
    return;
  }
  const j = data.data;
  const grid = j.items_data || {};

  // Formatter helpers for printing
  const val = key => {
    const itemVal = grid[key];
    if (!itemVal) return '';
    const qty = typeof itemVal === 'object' ? itemVal.qty : parseInt(itemVal);
    const serials = typeof itemVal === 'object' ? itemVal.serials : [];
    if (!qty) return '';
    
    let res = `<span style="font-weight:bold;">${qty}</span>`;
    const filledSerials = (serials || []).filter(sn => sn.trim());
    if (filledSerials.length > 0) {
      res += `<div style="font-size:8px; color:#555; margin-top:2px; font-family:monospace; line-height:1.2;">`;
      filledSerials.forEach((sn, idx) => {
        res += `<div>#${idx+1}: ${sn}</div>`;
      });
      res += `</div>`;
    }
    return res;
  };

  const renderPrintGrid = (config) => {
    let html = '';
    let pendingHeaderHtml = '';
    
    config.forEach(c => {
      if (c.type === 'header') {
        pendingHeaderHtml = `<tr class="sect-hdr"><td colspan="2">${c.label}</td></tr>`;
      } else if (c.type === 'item') {
        const itemVal = val(c.id);
        if (itemVal) {
          if (pendingHeaderHtml) {
            html += pendingHeaderHtml;
            pendingHeaderHtml = '';
          }
          if (c.sub) {
            html += `<tr><td class="sub-lbl">${c.label}</td><td style="text-align:center;">${itemVal}</td></tr>`;
          } else {
            html += `<tr class="bold-lbl"><td>${c.label}</td><td style="text-align:center;">${itemVal}</td></tr>`;
          }
        }
      }
    });
    return html;
  };

  const leftHtml = renderPrintGrid(leftItemsConfig);
  const rightHtml = renderPrintGrid(rightItemsConfig);

  const win = window.open('', '_blank', 'width=850,height=1100');
  if (!win) {
    showToast('Allow popups to print job sheet', 'warning');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Job Sheet - ${j.job_sheet_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; color: black; background: white; }
        .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .header-tbl td { border: 1px solid black; padding: 6px 8px; vertical-align: middle; }
        .title-row { background: #f0f0f0; text-align: center; font-weight: bold; font-size: 15px; }
        .grid-container { display: flex; gap: 15px; }
        .grid-col { width: 50%; }
        table.grid-tbl { width: 100%; border-collapse: collapse; }
        table.grid-tbl th { background: #ffd700; color: black; font-weight: bold; border: 1px solid black; padding: 5px 6px; text-align: left; }
        table.grid-tbl td { border: 1px solid black; padding: 4px 6px; }
        .sect-hdr { background: #00d4ff; color: black; font-weight: bold; }
        .sub-lbl { padding-left: 12px; }
        .bold-lbl { font-weight: bold; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 30px; font-weight: bold; }
        .sig-box { border-top: 1px solid black; min-width: 180px; text-align: center; padding-top: 4px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      
      <!-- Top Job Sheet Header -->
      <table class="header-tbl">
        <tr>
          <td colspan="4" class="title-row" style="font-size: 20px; font-family: 'Arial Black', sans-serif;">JOB SHEET</td>
          <td style="font-weight: bold; text-align: center; background: #e0e0e0;">${j.job_sheet_number || ''}</td>
        </tr>
        <tr>
          <td style="width: 12%; font-weight: bold;">${formatDate(j.job_date)}</td>
          <td colspan="4" style="font-weight: bold;">Technician - ${j.technician_names || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Name -</td>
          <td colspan="4">${j.customer_name || ''}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Address :-</td>
          <td colspan="4">${j.customer_address || ''}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; width: 15%;">Qutation No: -</td>
          <td style="width: 35%;">${j.quotation_number || ''}</td>
          <td colspan="2" style="font-weight: bold; width: 20%;">Phone Number :-</td>
          <td style="width: 30%;">${j.customer_phone || ''}</td>
        </tr>
      </table>

      <!-- Two Column Materials List -->
      <div class="grid-container">
        
        <!-- Left Side Column -->
        <div class="grid-col">
          <table class="grid-tbl">
            <thead>
              <tr>
                <th style="width: 65%;">ITEMS</th>
                <th style="width: 35%; text-align: center;">QTY & SERIALS</th>
              </tr>
            </thead>
            <tbody>
              ${leftHtml || '<tr><td colspan="2" style="text-align:center;color:#888;font-style:italic;">No items</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Right Side Column -->
        <div class="grid-col">
          <table class="grid-tbl">
            <thead>
              <tr>
                <th style="width: 65%;">ITEMS</th>
                <th style="width: 35%; text-align: center;">QTY & SERIALS</th>
              </tr>
            </thead>
            <tbody>
              ${rightHtml || '<tr><td colspan="2" style="text-align:center;color:#888;font-style:italic;">No items</td></tr>'}
            </tbody>
          </table>
        </div>

      </div>

      <!-- Signatures footer -->
      <div class="sig-row">
        <div class="sig-box">Technician Signature</div>
        <div class="sig-box">Authorized Signature</div>
      </div>

      <script>
        setTimeout(() => { window.print(); }, 500);
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

function invoiceJobSheet(id) {
  localStorage.setItem('pos_load_jobsheet_id', id);
  window.location.href = '/pos.html';
}

// ─── RETURN ITEMS ───
// Mapping from job sheet field IDs to product search terms
const returnItemMapping = {
  left_vid_cable_kelani: { search: 'Kelani Cable', label: 'Kelani Video Cable' },
  left_vid_cable_hang: { search: 'Hang Cable', label: 'Hang Video Cable' },
  left_vid_cable_hvn: { search: 'Hikvision Cable', label: 'Hikvision Video Cable' },
  left_vid_cable_gen: { search: 'Video Cable', label: 'Video Cable' },
  left_tt_wire: { search: 'TT Wire', label: 'TT Wire' },
  left_3pin_power: { search: 'Power Cable', label: '3 Pin Power Cable' },
  left_dc_male: { search: 'DC Male', label: 'DC Male Connector' },
  left_dc_female: { search: 'DC Female', label: 'DC Female Connector' },
  left_ip_box: { search: 'IP Box', label: 'IP Box' },
  left_sunk_box: { search: 'Sunk Box', label: 'Sunk Box' },
  left_router: { search: 'Router', label: 'Router' },
  left_sim: { search: 'SIM', label: 'SIM Card' },
  left_dvr_rack: { search: 'Rack', label: 'DVR Rack' },
  left_bnc: { search: 'BNC', label: 'BNC Connector' },
  left_bnc_mx: { search: 'BNC MX', label: 'BNC MX Connector' },
  left_rj45: { search: 'RJ 45', label: 'RJ45 Connector' },
  left_battery_ps: { search: 'Battery', label: 'Battery' },
  left_switch_nun: { search: 'Switch', label: 'Non-POE Switch' },
  left_switch_poe: { search: 'POE Switch', label: 'POE Switch' },
  left_wifi_ext: { search: 'WiFi Extender', label: 'WiFi Extender' },
  left_wall_mount: { search: 'Wall Mount', label: 'Wall Mount Bracket' },
  left_mon_hvn: { search: 'Monitor', label: 'Hikvision Monitor' },
  left_mon_len: { search: 'Monitor', label: 'Lenovo Monitor' },
  left_ups: { search: 'UPS', label: 'UPS' },
  left_dvr: { search: 'DVR', label: 'DVR' },
  left_hard_disk: { search: 'Surveillance Hard Disk', label: 'Hard Disk' },
  left_memory_card: { search: 'Micro SD Card', label: 'Memory Card' },
  right_cable_05: { search: 'Cable', label: 'Cable Size 0.5' },
  right_cable_15: { search: 'Cable', label: 'Cable Size 1.5' },
  right_cable_3: { search: 'Cable', label: 'Cable Size 3m' },
  right_cable_5: { search: 'Cable', label: 'Cable Size 5m' },
  right_cable_10: { search: 'Cable', label: 'Cable Size 10m' },
  right_usb_buy: { search: 'USB', label: 'USB Buy' },
  right_usb_rtn: { search: 'USB', label: 'USB Rtn' },
  right_vga_15: { search: 'VGA', label: 'VGA Size 1.5' },
  right_vga_3: { search: 'VGA', label: 'VGA Size 3m' },
  right_vga_5: { search: 'VGA', label: 'VGA Size 5m' },
  right_net_1_buy: { search: 'Network', label: 'Network Cable Size 1 (BUY)' },
  right_net_1_rtn: { search: 'Network', label: 'Network Cable Size 1 (RTN)' },
  right_net_2_buy: { search: 'Network', label: 'Network Cable Size 2 (BUY)' },
  right_net_2_rtn: { search: 'Network', label: 'Network Cable Size 2 (RTN)' },
  right_net_5_buy: { search: 'Network', label: 'Network Cable Size 5 (BUY)' },
  right_net_5_rtn: { search: 'Network', label: 'Network Cable Size 5 (RTN)' },
  right_net_10_buy: { search: 'Network', label: 'Network Cable Size 10 (BUY)' },
  right_net_10_rtn: { search: 'Network', label: 'Network Cable Size 10 (RTN)' },
  right_hdmi_1_buy: { search: 'HDMI', label: 'HDMI Cable 1m (BUY)' },
  right_hdmi_1_rtn: { search: 'HDMI', label: 'HDMI Cable 1m (RTN)' },
  right_hdmi_15_buy: { search: 'HDMI', label: 'HDMI Cable 1.5m (BUY)' },
  right_hdmi_15_rtn: { search: 'HDMI', label: 'HDMI Cable 1.5m (RTN)' },
  right_hdmi_3_buy: { search: 'HDMI', label: 'HDMI Cable 3m (BUY)' },
  right_hdmi_3_rtn: { search: 'HDMI', label: 'HDMI Cable 3m (RTN)' },
  right_hdmi_5_buy: { search: 'HDMI', label: 'HDMI Cable 5m (BUY)' },
  right_hdmi_5_rtn: { search: 'HDMI', label: 'HDMI Cable 5m (RTN)' },
  right_hdmi_10_buy: { search: 'HDMI', label: 'HDMI Cable 10m (BUY)' },
  right_hdmi_10_rtn: { search: 'HDMI', label: 'HDMI Cable 10m (RTN)' },
  right_power_25: { search: 'Power Supply', label: 'Power S Size 2.5' },
  right_power_5a: { search: 'Power Supply', label: 'Power S Size 5A' },
  right_power_10a: { search: 'Power Supply', label: 'Power S Size 10A' },
  right_power_20a: { search: 'Power Supply', label: 'Power S Size 20A' },
  right_power_30a: { search: 'Power Supply', label: 'Power S Size 30A' },
  right_bracket_25: { search: 'Bracket', label: 'Bracket Size 25' },
  right_bracket_32: { search: 'Bracket', label: 'Bracket Size 32' },
  right_bracket_40: { search: 'Bracket', label: 'Bracket Size 40' },
  right_bracket_50: { search: 'Bracket', label: 'Bracket Size 50' },
  right_bracket_l: { search: 'L Bracket', label: 'L Bracket' },
  right_bracket_i: { search: 'I Bracket', label: 'I Bracket' },
  right_pl_bracket_qty: { search: 'PL Bracket', label: 'PL Bracket (QTY)' },
  right_pl_bracket_use: { search: 'PL Bracket', label: 'PL Bracket (USE)' },
  right_dome_b: { search: 'Dome', label: 'Dome / B' },
  right_fingerprint_sn: { search: 'Fingerprint', label: 'Fingerprint Terminal' },
  right_alarm_sn: { search: 'Alarm', label: 'Alarm System' },
  right_video_dphone: { search: 'Doorphone', label: 'Video D/Phone' }
};

let _returnSheetId = null;
let _returnItemsData = []; // { key, label, issuedQty, productId, productName }

async function openReturnModal(sheetId) {
  _returnSheetId = sheetId;
  _returnItemsData = [];
  const listEl = document.getElementById('returnItemsList');
  listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">⏳ Loading items and matching products...</div>';
  openModal('returnModal');

  // Load job sheet data
  const data = await apiFetch(`/jobsheets/${sheetId}`);
  if (!data?.success) {
    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#ff4757;">Failed to load Job Sheet data</div>';
    return;
  }
  const grid = data.data.items_data || {};
  const user = getUser();
  const branchId = user.branch_id || '';

  // Collect items that have qty > 0
  const itemsWithQty = [];
  for (const [key, itemVal] of Object.entries(grid)) {
    const qty = typeof itemVal === 'object' ? (itemVal.qty || 0) : (parseInt(itemVal) || 0);
    if (qty <= 0) continue;
    const mapping = returnItemMapping[key];
    if (!mapping) continue;
    itemsWithQty.push({ key, label: mapping.label, searchTerm: mapping.search, issuedQty: qty });
  }

  if (!itemsWithQty.length) {
    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">This Job Sheet has no items to return.</div>';
    return;
  }

  // Search for matching products in DB
  for (const item of itemsWithQty) {
    try {
      const pData = await apiFetch(`/products/search/${encodeURIComponent(item.searchTerm)}?branch_id=${branchId}`);
      if (pData?.success && pData.data.length > 0) {
        item.productId = pData.data[0].id;
        item.productName = pData.data[0].name;
      } else {
        item.productId = null;
        item.productName = null;
      }
    } catch {
      item.productId = null;
      item.productName = null;
    }
  }

  _returnItemsData = itemsWithQty;

  // Render the return items table
  listEl.innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:rgba(255,255,255,0.05);">
          <th style="padding:8px; text-align:left; border-bottom:1px solid var(--border);">Item</th>
          <th style="padding:8px; text-align:center; border-bottom:1px solid var(--border);">Matched Product</th>
          <th style="padding:8px; text-align:center; border-bottom:1px solid var(--border);">Issued Qty</th>
          <th style="padding:8px; text-align:center; border-bottom:1px solid var(--border);">Return Qty</th>
        </tr>
      </thead>
      <tbody>
        ${itemsWithQty.map((item, idx) => `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:6px 8px; font-weight:600;">${item.label}</td>
            <td style="padding:6px 8px; text-align:center; font-size:11px; color:${item.productId ? 'var(--green)' : '#ff4757'};">
              ${item.productId ? item.productName : '⚠️ Not found'}
            </td>
            <td style="padding:6px 8px; text-align:center; font-weight:700; color:var(--accent);">${item.issuedQty}</td>
            <td style="padding:6px 8px; text-align:center;">
              ${item.productId ? `<input type="number" id="return_qty_${idx}" min="0" max="${item.issuedQty}" value="0" style="width:60px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:#fff; border-radius:4px; padding:4px 6px; text-align:center; font-size:12px;">` : '<span style="color:#ff4757;">-</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function confirmReturnItems() {
  if (!_returnSheetId || !_returnItemsData.length) {
    showToast('No items to return', 'error');
    return;
  }

  const user = getUser();
  const returns = [];

  _returnItemsData.forEach((item, idx) => {
    if (!item.productId) return;
    const qtyEl = document.getElementById(`return_qty_${idx}`);
    const qty = parseInt(qtyEl?.value) || 0;
    if (qty > 0) {
      returns.push({ product_id: item.productId, qty, label: item.label });
    }
  });

  if (!returns.length) {
    showToast('Return qty එකක් ලියන්න - return items නැත', 'warning');
    return;
  }

  const ok = await confirmDialog(`${returns.length} item type(s) stock එකට return කරනවාද?`);
  if (!ok) return;

  const btn = document.getElementById('confirmReturnBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Processing...'; }

  const result = await apiFetch(`/jobsheets/${_returnSheetId}/return-items`, {
    method: 'POST',
    body: { returns, branch_id: user.branch_id }
  });

  if (btn) { btn.disabled = false; btn.textContent = '↩️ Confirm Return'; }

  if (result?.success) {
    showToast(result.message || 'Items returned to stock!', 'success');
    closeModal('returnModal');
  } else {
    showToast(result?.message || 'Failed to return items', 'error');
  }
}

// Technician Profiles Logic
async function openTechSummaryModal() {
  const data = await apiFetch('/jobsheets/technicians/summary');
  if (!data?.success) return showToast('Failed to load technicians', 'error');
  
  const tbody = document.getElementById('techSummaryTbody');
  if (data.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding:20px;">No jobs assigned to any technician.</td></tr>';
  } else {
    tbody.innerHTML = data.data.map(t => `
      <tr>
        <td style="font-weight:600;">${t.name}</td>
        <td>${t.total_jobs}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewTechProfile(${t.id})">👁 View Profile</button></td>
      </tr>
    `).join('');
  }
  openModal('techSummaryModal');
}

async function viewTechProfile(id) {
  const data = await apiFetch(`/jobsheets/technicians/${id}/profile`);
  if (!data?.success) return showToast('Failed to load profile', 'error');
  
  const p = data.data;
  document.getElementById('techProfileName').textContent = p.technician.full_name;
  document.getElementById('techProfileTotalJobs').textContent = p.total_jobs;
  
  // Render Taken
  const takenTbody = document.getElementById('techProfileTakenTbody');
  if (!p.issued_items.length) {
    takenTbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No items taken</td></tr>';
  } else {
    takenTbody.innerHTML = p.issued_items.map(i => `
      <tr>
        <td>${i.name}</td>
        <td style="font-weight:bold; color:var(--orange);">${i.qty}</td>
      </tr>
    `).join('');
  }
  
  // Render Returned
  const returnedTbody = document.getElementById('techProfileReturnedTbody');
  if (!p.returned_items.length) {
    returnedTbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No items returned</td></tr>';
  } else {
    returnedTbody.innerHTML = p.returned_items.map(i => `
      <tr>
        <td>${i.name}</td>
        <td style="font-weight:bold; color:var(--green);">${i.qty}</td>
      </tr>
    `).join('');
  }
  
  // Render Jobs
  const jobsTbody = document.getElementById('techProfileJobsTbody');
  if (!p.jobs.length) {
    jobsTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No jobs</td></tr>';
  } else {
    jobsTbody.innerHTML = p.jobs.map(j => `
      <tr>
        <td style="color:var(--accent); font-weight:600; cursor:pointer;" onclick="viewJobSheet(${j.id})">${j.job_sheet_number}</td>
        <td>${formatDate(j.job_date)}</td>
        <td>${j.customer_name || '-'}</td>
      </tr>
    `).join('');
  }
  
  closeModal('techSummaryModal');
  openModal('techProfileModal');
}
