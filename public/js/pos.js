/* ════════════════════════════════════
   ENQOVA POS - POS Screen Logic
   ════════════════════════════════════ */

let cart = [];
let selectedCustomer = null;
let currentInvoiceId = null;
let currentDraftId = null;
let editingInvoiceId = null;
let vatRate = 18;
let customerType = 'wholesale';
let payMethod = 'cash';
let currentSerialIdx = -1;
let _searchResults = []; // Stores last search results
let isQuotationMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  await loadPOSSettings();
  updateBranchLabel();
  renderCart();
  const preCustomerId = localStorage.getItem('pos_customer_id');
  if (preCustomerId) { localStorage.removeItem('pos_customer_id'); await loadCustomerById(preCustomerId); }
  
  const loadJobSheetId = localStorage.getItem('pos_load_jobsheet_id');
  if (loadJobSheetId) {
    localStorage.removeItem('pos_load_jobsheet_id');
    await loadJobSheetToPOS(loadJobSheetId);
  }

  document.getElementById('productSearch')?.focus();
  loadEzvizQuickAdd();

  // Check if print query parameter is present
  const urlParams = new URLSearchParams(window.location.search);
  const printId = urlParams.get('print');
  if (printId) {
    await printInvoice(printId);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Check if edit query parameter is present
  const editId = urlParams.get('edit');
  if (editId) {
    await loadInvoiceForEditing(editId);
  }

  // Check if quotation mode
  if (urlParams.get('mode') === 'quote') {
    enableQuotationMode();
  }

  // Barcode Scanner listener
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) return;
        
        clearTimeout(searchTimer);
        const user = getUser();
        
        // 1. Try to find by Exact Serial Number First
        const serialData = await apiFetch(`/products/serial/${encodeURIComponent(q)}`);
        if (serialData?.success && serialData.data && serialData.data.status === 'available') {
          const sData = serialData.data;
          // Check if it belongs to this branch
          if (sData.branch_id == user.branch_id || !user.branch_id) {
            // Add product to cart with this serial number pre-selected
            addProductToCart({
              id: sData.product_id,
              name: sData.product_name,
              brand: sData.brand,
              sku: sData.sku,
              image_path: sData.image_path,
              retail_price: sData.retail_price,
              wholesale_price: sData.wholesale_price,
              vat_applicable: sData.vat_applicable,
              warranty_months: sData.warranty_months
            });
            
            // The item is now at the end of the cart array. Let's automatically add the serial.
            const cartItem = cart[cart.length - 1];
            cartItem.serial_numbers = [sData.serial_number];
            renderCart();
            closeModal('serialModal'); // close it since addProductToCart opens it
            showToast(`${sData.product_name} added via Serial! ✓`, 'success', 1500);
            
            searchInput.value = '';
            hideResults();
            return;
          }
        }

        // 2. Fallback to normal product search (SKU/Name)
        const data = await apiFetch(`/products/search/${encodeURIComponent(q)}?branch_id=${user.branch_id || ''}`);
        if (data?.success && data.data.length) {
          const match = data.data.find(p => p.sku && p.sku.toLowerCase() === q.toLowerCase()) || data.data[0];
          addProductToCart(match);
          searchInput.value = '';
          hideResults();
        }
      }
    });
  }
});

let _ezvizProducts = [];
async function loadEzvizQuickAdd() {
  const user = getUser();
  const data = await apiFetch(`/products/ezviz-quick?branch_id=${user.branch_id || ''}`);
  const container = document.getElementById('ezvizQuickAdd');
  if (!container) return;
  if (!data?.success || !data.data.length) {
    container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted);">No Quick Add products found.</div>';
    return;
  }
  _ezvizProducts = data.data;
  container.innerHTML = _ezvizProducts.map((p, idx) => {
    const price = customerType === 'wholesale' ? (p.wholesale_price || 0) : (p.retail_price || 0);
    const stock = p.branch_stock != null ? p.branch_stock : '?';
    const stockColor = stock === 0 ? 'var(--red)' : stock <= 5 ? 'var(--orange)' : 'var(--green)';
    return `<div class="pos-quick-card" onclick="addEzvizProduct(${idx})" style="cursor:pointer; flex: 0 0 auto; width: 140px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 6px; transition: 0.2s;">
      <div style="display:flex; justify-content:center; margin-bottom: 4px;">
        <img src="${p.image_path || '/img/no-img.svg'}" onerror="this.src='/img/no-img.svg'" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
      </div>
      <div style="font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);" title="${p.name}">${p.name}</div>
      <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--accent);">Rs.${Number(price).toLocaleString()}</div>
        <div style="font-size: 9px; color: ${stockColor};">📦 ${stock}</div>
      </div>
    </div>`;
  }).join('');
}

function addEzvizProduct(idx) {
  if (_ezvizProducts[idx]) addProductToCart(_ezvizProducts[idx]);
}

async function loadPOSSettings() {
  const data = await apiFetch('/settings');
  if (data?.success) { vatRate = parseFloat(data.data.vat_rate || 18); }
}

function updateBranchLabel() {
  const user = getUser();
  const el = document.getElementById('headerBranch');
  if (el) el.textContent = user.branch_name || 'Branch';
  const bl = document.getElementById('cartBranchLabel');
  if (bl) bl.textContent = user.branch_name || '';
}

// ─── PRODUCT SEARCH ───
let searchTimer;
function searchProducts(query) {
  clearTimeout(searchTimer);
  const q = (query || '').trim();
  if (!q) { hideResults(); return; }
  searchTimer = setTimeout(() => doSearch(q), 280);
}

async function doSearch(q) {
  const user = getUser();
  const data = await apiFetch(`/products/search/${encodeURIComponent(q)}?branch_id=${user.branch_id || ''}`);
  const container = document.getElementById('productResults');
  if (!container) return;

  if (!data?.success || !data.data.length) {
    _searchResults = [];
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No products found for "${q}"</div>`;
    container.classList.remove('hidden');
    return;
  }

  _searchResults = data.data;

  container.innerHTML = _searchResults.map((p, idx) => {
    const price = customerType === 'wholesale' ? (p.wholesale_price || 0) : (p.retail_price || 0);
    const stock = p.branch_stock != null ? p.branch_stock : '?';
    const stockColor = stock === 0 ? 'var(--red)' : stock <= 5 ? 'var(--orange)' : 'var(--green)';
    return `<div class="pos-product-card" data-idx="${idx}" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);">
      <img src="${p.image_path || '/img/no-img.svg'}" onerror="this.src='/img/no-img.svg'" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border);flex-shrink:0;" alt="">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:14px;line-height:1.3;">${p.name}</div>
        <div style="font-size:11px;color:var(--text-muted);margin:2px 0;">${p.brand || ''} ${p.model || ''} <span style="margin-left:5px; color:var(--text-secondary); font-family:monospace;">${p.sku ? '['+p.sku+']' : ''}</span></div>
        <div style="font-size:15px;font-weight:700;color:var(--accent);">Rs. ${Number(price).toLocaleString()}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:${stockColor};font-weight:600;">📦 ${stock}</div>
    </div>`;
  }).join('');

  // Attach click listeners via JS (avoids HTML escaping issues)
  container.querySelectorAll('.pos-product-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx);
      if (!isNaN(idx) && _searchResults[idx]) addProductToCart(_searchResults[idx]);
    });
    card.addEventListener('mouseover', () => { card.style.background = 'rgba(0,212,255,0.05)'; });
    card.addEventListener('mouseout', () => { card.style.background = ''; });
  });

  container.classList.remove('hidden');
}

function hideResults() {
  const c = document.getElementById('productResults');
  if (c) c.classList.add('hidden');
}

// Hide results on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#productResults') && !e.target.closest('#productSearch')) hideResults();
});

// ─── QUOTATION MODE ───
function enableQuotationMode() {
  isQuotationMode = true;
  document.title = 'New Quotation - ENQOVA POS';
  const titleEl = document.querySelector('.header-title');
  if (titleEl) titleEl.innerHTML = '📄 <span style="color:#f0a500;">Quotation Mode</span> — New Price Quote';

  const posLayout = document.querySelector('.pos-layout');
  if (posLayout && !document.getElementById('quoteModeBanner')) {
    const banner = document.createElement('div');
    banner.id = 'quoteModeBanner';
    banner.style.cssText = 'background: rgba(240, 165, 0, 0.12); border: 1px solid rgba(240, 165, 0, 0.4); border-radius: 8px; padding: 12px 18px; margin: 0 20px 16px 20px; color: #f0a500; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">📄</span>
        <span><b>Quotation Mode Active:</b> Serial numbers are NOT required. Products added will be saved directly into Quotations.</span>
      </div>
      <a href="/quotations.html" class="btn btn-sm btn-ghost" style="border: 1px solid #f0a500; color: #f0a500; text-decoration: none;">← Back to Quotations List</a>`;
    posLayout.parentElement.insertBefore(banner, posLayout);
  }

  const createInvBtn = document.getElementById('createInvBtn');
  if (createInvBtn) createInvBtn.style.display = 'none';

  const saveQuoteBtn = document.getElementById('saveQuoteBtn');
  if (saveQuoteBtn) {
    saveQuoteBtn.style.background = 'linear-gradient(135deg, #f0a500, #ff7b00)';
    saveQuoteBtn.style.color = '#000';
    saveQuoteBtn.style.fontSize = '15px';
    saveQuoteBtn.style.padding = '12px';
    saveQuoteBtn.style.fontWeight = '700';
  }
}

// ─── ADD TO CART ───
function addProductToCart(p) {
  hideResults();
  const searchEl = document.getElementById('productSearch');
  if (searchEl) searchEl.value = '';

  cart.push({
    product_id: p.id,
    name: p.name || '',
    brand: p.brand || '',
    sku: p.sku || '',
    image_path: p.image_path || '',
    unit_price: p.retail_price || 0,
    retail_price: p.retail_price || 0,
    wholesale_price: p.wholesale_price || 0,
    is_wholesale: true,
    quantity: 1,
    discount_percent: 0,
    vat_applicable: p.vat_applicable != null ? p.vat_applicable : 1,
    warranty_months: p.warranty_months || 0,
    serial_numbers: []
  });

  renderCart();
  showToast(`${p.name} added to cart ✓`, 'success', 1500);
  if (!isQuotationMode) {
    openSerialModal(cart.length - 1);
  }
}

// ─── CART RENDER ───
function renderCart() {
  const cartBody = document.getElementById('cartBody');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartTableWrap = document.getElementById('cartTableWrap');
  const cartCount = document.getElementById('cartCount');
  const createBtn = document.getElementById('createInvBtn');

  if (!cartBody) return;
  if (cartCount) cartCount.textContent = `(${cart.length})`;
  if (createBtn) createBtn.disabled = cart.length === 0;
  const quoteBtn = document.getElementById('saveQuoteBtn');
  if (quoteBtn) quoteBtn.disabled = cart.length === 0;
  const draftBtn = document.getElementById('saveDraftBtn');
  if (draftBtn) draftBtn.disabled = cart.length === 0;
  const proformaBtn = document.getElementById('saveProformaBtn');
  if (proformaBtn) proformaBtn.disabled = cart.length === 0;

  if (!cart.length) {
    if (cartEmpty) cartEmpty.style.display = 'flex';
    if (cartTableWrap) cartTableWrap.style.display = 'none';
    recalcTotals();
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  if (cartTableWrap) cartTableWrap.style.display = 'block';

  cartBody.innerHTML = cart.map((item, idx) => {
    const lineBase = item.unit_price * item.quantity;
    let discAmt = lineBase * ((item.discount_percent||0) / 100);
    let wholesaleDiff = 0;
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) {
        wholesaleDiff = diff * item.quantity;
        discAmt += wholesaleDiff;
      }
    }
    const lineTotal = lineBase - discAmt;
    const serialsOk = item.serial_numbers.length >= item.quantity;

    return `<tr>
      <td><img src="${item.image_path || '/img/no-img.svg'}" onerror="this.src='/img/no-img.svg'" style="width:36px;height:36px;border-radius:6px;object-fit:cover;border:1px solid var(--border);"></td>
      <td>
        <div style="font-weight:600;font-size:13px;">${item.name}</div>
        <div style="font-size:10px;color:var(--text-muted);">${item.brand || ''} ${item.sku || ''}</div>
        <button onclick="openSerialModal(${idx})" style="margin-top:4px;font-size:10px;padding:2px 8px;background:rgba(0,212,255,${serialsOk ? '0.15' : '0.05'});border:1px solid rgba(0,212,255,${serialsOk ? '0.5' : '0.2'});color:var(--accent);border-radius:4px;cursor:pointer;">
          📟 ${item.serial_numbers.length}/${item.quantity} serials
        </button>
      </td>
      <td style="max-width:100px;font-size:10px;font-family:monospace;color:var(--text-secondary);">${item.serial_numbers.slice(0,3).join(', ')}${item.serial_numbers.length > 3 ? '…' : ''}</td>
      <td>
        <div style="display:flex;align-items:center;gap:3px;">
          <button onclick="changeQty(${idx},-1)" style="width:26px;height:26px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text-primary);font-size:15px;">−</button>
          <input type="number" min="1" value="${item.quantity}" onchange="setQty(${idx},this.value)" style="width:46px;text-align:center;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:3px;font-size:13px;">
          <button onclick="changeQty(${idx},1)" style="width:26px;height:26px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text-primary);font-size:15px;">+</button>
        </div>
      </td>
      <td style="font-weight:600;font-size:13px;">Rs.${item.unit_price.toLocaleString()}</td>
      <td>
        <div style="display:flex;align-items:center;gap:3px;">
          <input type="number" min="0" max="100" step="any" value="${Number(item.discount_percent.toFixed(2))}" onchange="setDiscount(${idx},this.value)" style="width:55px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:3px;text-align:center;font-size:12px;">
          <span style="font-size:10px;color:var(--text-muted);">%</span>
        </div>
        ${ wholesaleDiff > 0 ? `<div style="font-size:10px;color:var(--green);margin-top:4px;">Wholesale: Rs.${wholesaleDiff.toLocaleString()}</div>` : '' }
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:3px;">
          <span style="font-size:11px;color:var(--text-secondary);font-weight:700;">Rs.</span>
          <input type="number" min="0" step="any" value="${lineTotal.toFixed(2)}" onchange="setLineTotal(${idx},this.value)" style="width:95px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--accent);border-radius:4px;padding:3px;font-size:13px;font-weight:700;text-align:right;">
        </div>
      </td>
      <td><button onclick="removeItem(${idx})" style="background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.3);color:var(--red);border-radius:4px;padding:4px 9px;cursor:pointer;">✕</button></td>
    </tr>`;
  }).join('');

  recalcTotals();
}

function changeQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].quantity = Math.max(1, cart[idx].quantity + delta);
  renderCart();
}
function setQty(idx, val) {
  if (!cart[idx]) return;
  cart[idx].quantity = Math.max(1, parseInt(val) || 1);
  renderCart();
}
function setDiscount(idx, val) {
  if (!cart[idx]) return;
  cart[idx].discount_percent = Math.min(100, Math.max(0, parseFloat(val) || 0));
  renderCart();
}
function setLineTotal(idx, val) {
  if (!cart[idx]) return;
  const item = cart[idx];
  const targetLineTotal = Math.max(0, parseFloat(val) || 0);
  
  // Set is_wholesale to false when overriding the total price,
  // so the discount percent represents the entire discount from the unit price.
  item.is_wholesale = false;
  
  const lineBase = item.unit_price * item.quantity;
  if (lineBase > 0) {
    const calculatedDiscountPct = (1 - (targetLineTotal / lineBase)) * 100;
    item.discount_percent = Math.min(100, Math.max(0, calculatedDiscountPct));
  } else {
    item.discount_percent = 0;
  }
  renderCart();
}


function removeItem(idx) { cart.splice(idx, 1); renderCart(); }
function clearCart() {
  cart = []; selectedCustomer = null;
  const cs = document.getElementById('customerSearch'); if (cs) cs.value = '';
  const sc = document.getElementById('selectedCustomer'); if (sc) sc.style.display = 'none';
  const ap = document.getElementById('amountPaid'); if (ap) ap.value = '';
  const cd = document.getElementById('changeDisplay'); if (cd) cd.style.display = 'none';
  const dp = document.getElementById('discountPct'); if (dp) dp.value = '';
  const da = document.getElementById('discountAmt'); if (da) da.value = '';
  renderCart();
}

// ─── TOTALS ───
function recalcTotals() {
  const discPct = parseFloat(document.getElementById('discountPct')?.value) || 0;
  const discFixed = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  let subtotal = 0, vatAmount = 0;
  cart.forEach(item => {
    const lineBase = item.unit_price * item.quantity;
    let discAmt = lineBase * ((item.discount_percent || 0) / 100);
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) {
        discAmt += diff * item.quantity;
      }
    }
    const line = lineBase - discAmt;
    subtotal += line;
    if (item.vat_applicable) vatAmount += line * vatRate / 100;
  });
  const discountApplied = discFixed > 0 ? discFixed : subtotal * discPct / 100;
  
  let kokoCharge = 0;
  if (typeof payMethod !== 'undefined' && payMethod === 'koko') {
    kokoCharge = parseFloat(document.getElementById('kokoChargeAmt')?.value) || 0;
  }
  
  const grandTotal = subtotal - discountApplied + vatAmount + kokoCharge;
  const fmt = v => 'Rs. ' + v.toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = fmt(v); };
  setEl('subtotal', subtotal);
  setEl('totalDiscount', discountApplied);
  setEl('totalVat', vatAmount);
  setEl('grandTotal', grandTotal);
  calcChange();
}

function calcChange() {
  const grandEl = document.getElementById('grandTotal');
  const total = parseFloat((grandEl?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
  const paid = parseFloat(document.getElementById('amountPaid')?.value) || 0;
  const change = paid - total;
  const cd = document.getElementById('changeDisplay');
  const ca = document.getElementById('changeAmount');
  if (paid > 0) {
    if (cd) cd.style.display = 'flex';
    if (ca) { ca.textContent = 'Rs. ' + Math.abs(change).toLocaleString('en-LK', { minimumFractionDigits: 2 }); ca.style.color = change >= 0 ? 'var(--green)' : 'var(--red)'; }
  } else {
    if (cd) cd.style.display = 'none';
  }
}

// ─── CUSTOMER SEARCH ───
let custTimer;
function searchCustomers(q) {
  clearTimeout(custTimer);
  const el = document.getElementById('customerResults');
  if (!q || q.length < 2) { if (el) el.innerHTML = ''; return; }
  custTimer = setTimeout(() => doCustomerSearch(q), 300);
}

async function doCustomerSearch(q) {
  const data = await apiFetch(`/customers?search=${encodeURIComponent(q)}&limit=6`);
  const el = document.getElementById('customerResults');
  if (!el) return;
  if (!data?.success || !data.data.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="background:var(--bg-card,#12182b);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:4px;z-index:100;position:relative;">` +
    data.data.map(c => `<div onclick='selectCustomer(${JSON.stringify(JSON.stringify(c))})' style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''">
      <div><div style="font-weight:600;font-size:13px;">${c.name}</div><div style="font-size:11px;color:var(--text-muted);">${c.phone || ''} ${c.nic ? '| ' + c.nic : ''}</div></div>
      <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(0,212,255,0.1);color:var(--accent);">${c.customer_type}</span>
    </div>`).join('') + '</div>';
}

function selectCustomer(cStr) {
  const c = typeof cStr === 'string' ? JSON.parse(cStr) : cStr;
  selectedCustomer = c;
  const cs = document.getElementById('customerSearch'); if (cs) cs.value = c.name;
  const cr = document.getElementById('customerResults'); if (cr) cr.innerHTML = '';
  const sc = document.getElementById('selectedCustomer'); if (sc) sc.style.display = 'block';
  const sn = document.getElementById('selCustName'); if (sn) sn.textContent = c.name;
  const si = document.getElementById('selCustInfo'); if (si) si.textContent = `${c.customer_code || ''} | ${c.phone || ''} | ${c.customer_type} | Balance: Rs.${(c.outstanding_balance || 0).toLocaleString()}`;
  setCustomerType(c.customer_type || 'retail');
}

async function loadCustomerById(id) {
  const data = await apiFetch(`/customers/${id}`);
  if (data?.success) selectCustomer(data.data);
}

function clearCustomer() {
  selectedCustomer = null;
  const cs = document.getElementById('customerSearch'); if (cs) cs.value = '';
  const sc = document.getElementById('selectedCustomer'); if (sc) sc.style.display = 'none';
}

function setCustomerType(type) {
  customerType = 'wholesale';
  cart.forEach(item => { 
    item.unit_price = item.retail_price; 
    item.is_wholesale = true; 
  });
  renderCart();
}

// ─── PAYMENT ───
function setPayMethod(method) {
  payMethod = method;
  document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`pm-${method}`); if (el) el.classList.add('active');
  
  const kg = document.getElementById('kokoChargeGroup');
  if (kg) kg.style.display = method === 'koko' ? 'block' : 'none';
  recalcTotals(); // Recalculate to include/exclude koko charge

  if (['card', 'online', 'koko'].includes(method)) {
    const g = document.getElementById('grandTotal');
    const ap = document.getElementById('amountPaid');
    if (ap && g) { ap.value = (g.textContent || '').replace(/[^0-9.]/g, ''); calcChange(); }
  }
  if (method === 'credit') { const ap = document.getElementById('amountPaid'); if (ap) ap.value = '0'; calcChange(); }
}

// ─── SERIAL MODAL ───
function openSerialModal(idx) {
  currentSerialIdx = idx;
  const item = cart[idx];
  if (!item) return;
  const content = document.getElementById('serialModalContent');
  if (!content) return;
  content.innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">📟 ${item.name}</div>
      <div style="font-size:12px;color:var(--text-muted);">Qty: ${item.quantity} — Enter Serial Number</div>
    </div>
    <input type="text" id="serialsInput" class="form-control" style="font-family:monospace;font-size:14px;letter-spacing:0.5px;" placeholder="Enter Serial Number" value="${item.serial_numbers[0] || ''}">
    <div id="serialCountLabel" style="font-size:11px;margin-top:6px;"></div>`;
  const ta = document.getElementById('serialsInput');
  if (ta) {
    ta.addEventListener('input', updateSerialCount);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveSerials();
      }
    });
  }
  updateSerialCount();
  openModal('serialModal');
  setTimeout(() => {
    const input = document.getElementById('serialsInput');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

function updateSerialCount() {
  const raw = document.getElementById('serialsInput')?.value || '';
  const count = raw.trim() ? 1 : 0;
  const item = cart[currentSerialIdx];
  const qty = item?.quantity || 0;
  const el = document.getElementById('serialCountLabel');
  if (el) { el.textContent = `${count} entered / ${qty} required`; el.style.color = count >= qty ? 'var(--green)' : 'var(--orange)'; }
}

async function saveSerials() {
  if (currentSerialIdx < 0 || !cart[currentSerialIdx]) { closeModal('serialModal'); return; }
  const raw = document.getElementById('serialsInput')?.value || '';
  const serialNumber = raw.trim();
  
  if (!serialNumber) {
    cart[currentSerialIdx].serial_numbers = [];
    closeModal('serialModal');
    renderCart();
    return;
  }

  const user = getUser();
  const currentItem = cart[currentSerialIdx];

  // Show a loading state on the Save button
  const saveBtn = document.querySelector("#serialModal .btn-primary");
  const originalText = saveBtn ? saveBtn.textContent : "Save Serials";
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Verifying...";
  }

  try {
    const res = await apiFetch(`/products/serial/${encodeURIComponent(serialNumber)}`);
    if (!res || !res.success || !res.data) {
      showToast("❌ මෙම Serial Number එක පද්ධතියේ නැත (Not GRN-ed). කරුණාකර වෙනත් එකක් භාවිතා කරන්න.", "error", 4000);
      return;
    }

    const serialData = res.data;

    // Check status
    if (serialData.status !== 'available') {
      showToast("❌ මෙම Serial Number එක දැනටමත් විකුණා හෝ වෙනත් අවශ්‍යතාවයකට භාවිතා කර ඇත.", "error", 4000);
      return;
    }

    // Check if it matches this product
    if (parseInt(serialData.product_id) !== parseInt(currentItem.product_id)) {
      showToast(`❌ මෙම Serial Number එක වෙනත් භාණ්ඩයකට අයත් වේ (${serialData.product_name}).`, "error", 4000);
      return;
    }

    // Check if it belongs to this branch
    if (user.branch_id && serialData.branch_id && parseInt(serialData.branch_id) !== parseInt(user.branch_id)) {
      showToast("❌ මෙම Serial Number එක වෙනත් ශාඛාවකට (Branch) අයත් වේ.", "error", 4000);
      return;
    }

    // If all checks pass, save it
    currentItem.serial_numbers = [serialNumber];
    closeModal('serialModal');
    renderCart();
    showToast(`✅ Serial Number ${serialNumber} සුරැකින ලදී.`, 'success', 1500);

  } catch (err) {
    console.error(err);
    showToast("❌ Serial Number එක පරීක්ෂා කිරීමේදී දෝෂයක් සිදු විය.", "error", 3000);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
}

// ─── QUICK ADD CUSTOMER ───
function openAddCustomer() { openModal('addCustomerModal'); }
async function saveNewCustomer() {
  const name = document.getElementById('nc_name')?.value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const phone = document.getElementById('nc_phone')?.value;
  const nic = document.getElementById('nc_nic')?.value;
  const type = document.getElementById('nc_type')?.value || 'retail';
  const data = await apiFetch('/customers', { method: 'POST', body: { name, phone, nic, customer_type: type, branch_id: getUser().branch_id } });
  if (data?.success) {
    showToast('Customer added!', 'success');
    closeModal('addCustomerModal');
    selectCustomer({ id: data.data.id, name, phone, nic, customer_type: type, customer_code: data.data.customer_code, outstanding_balance: 0 });
    ['nc_name','nc_phone','nc_nic'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  } else showToast(data?.message || 'Failed', 'error');
}

function getGroupedCartItems() {
  const grouped = {};
  cart.forEach(item => {
    const key = item.product_id;
    const lineBase = item.unit_price * item.quantity;
    let discAmt = lineBase * ((item.discount_percent || 0) / 100);
    if (item.is_wholesale && item.wholesale_price && item.unit_price === item.retail_price) {
      const diff = item.retail_price - item.wholesale_price;
      if (diff > 0) discAmt += (diff * item.quantity);
    }
    const lineTotal = lineBase - discAmt;

    if (!grouped[key]) {
      grouped[key] = {
        product_id: item.product_id,
        name: item.name,
        brand: item.brand,
        model: item.model || '',
        sku: item.sku || '',
        image_path: item.image_path || '',
        unit_price: item.unit_price,
        retail_price: item.retail_price,
        wholesale_price: item.wholesale_price,
        quantity: 0,
        discount_amount: 0,
        line_total: 0,
        vat_applicable: item.vat_applicable,
        warranty_months: item.warranty_months,
        serial_numbers: [],
        is_wholesale: item.is_wholesale
      };
    }

    grouped[key].quantity += item.quantity;
    grouped[key].discount_amount += discAmt;
    grouped[key].line_total += lineTotal;
    grouped[key].serial_numbers = grouped[key].serial_numbers.concat(item.serial_numbers || []);
  });

  return Object.values(grouped).map(g => {
    const lineBase = g.unit_price * g.quantity;
    g.discount_percent = lineBase > 0 ? (g.discount_amount / lineBase) * 100 : 0;
    return g;
  });
}

// ─── CREATE INVOICE ───
async function createInvoice() {
  if (!cart.length) { showToast('Cart is empty!', 'error'); return; }
  const user = getUser();
  if (!user.branch_id) { showToast('Your account has no branch assigned. Contact admin.', 'error'); return; }

  const missing = cart.filter(i => i.warranty_months > 0 && i.serial_numbers.length < i.quantity);
  if (missing.length) {
    showToast(`Warning: Serial numbers required! Please add serials for ${missing[0].name}`, 'error');
    return;
  }

  const discPct = parseFloat(document.getElementById('discountPct')?.value) || 0;
  const discFixed = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  const amountPaid = parseFloat(document.getElementById('amountPaid')?.value) || 0;
  const notes = document.getElementById('invoiceNotes')?.value || '';

  const groupedItems = getGroupedCartItems();
  let subtotal = 0;
  const items = groupedItems.map(item => {
    subtotal += item.line_total;
    return { product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, discount_percent: item.discount_percent, discount_amount: item.discount_amount, line_total: item.line_total, vat_applicable: item.vat_applicable, serial_numbers: item.serial_numbers };
  });
  const discountApplied = discFixed > 0 ? discFixed : subtotal * discPct / 100;

  const btn = document.getElementById('createInvBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating...'; }

  const kokoCharge = payMethod === 'koko' ? (parseFloat(document.getElementById('kokoChargeAmt')?.value) || 0) : 0;

  const result = await apiFetch('/invoices', { method: 'POST', body: {
    customer_id: selectedCustomer?.id || null,
    branch_id: user.branch_id,
    invoice_date: new Date().toISOString().split('T')[0],
    discount_percent: discPct,
    discount_amount: discountApplied,
    koko_charge: kokoCharge,
    vat_rate: vatRate,
    payment_method: payMethod,
    amount_paid: amountPaid,
    notes, items
  }});

  if (btn) { btn.disabled = false; btn.textContent = '✅ Create Invoice'; }

  if (result?.success) {
    currentInvoiceId = result.data.invoiceId;
    window.lastInvoiceDetails = {
      invoiceNumber: result.data.invoiceNumber,
      total: result.data.total,
      customerPhone: selectedCustomer?.phone || ''
    };
    const sin = document.getElementById('successInvNumber'); if (sin) sin.textContent = result.data.invoiceNumber;
    const st = document.getElementById('successTotal'); if (st) st.textContent = formatCurrency(result.data.total);
    openModal('successModal');
  } else {
    showToast(result?.message || 'Failed to create invoice', 'error');
  }
}

function sendWhatsAppInvoice() {
  if (!window.lastInvoiceDetails) {
    showToast('No recent invoice found to send.', 'error');
    return;
  }
  const { invoiceNumber, total, customerPhone } = window.lastInvoiceDetails;
  if (!customerPhone) {
    showToast('No phone number associated with this invoice.', 'error');
    return;
  }
  
  let phone = customerPhone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '94' + phone.substring(1);
  else if (!phone.startsWith('94')) phone = '94' + phone;

  const msg = `Hello! Your invoice (${invoiceNumber}) for Rs. ${Number(total).toLocaleString()} has been generated by ENQOVA SMART LIFE. Thank you for your business!`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ─── INVOICE DRAFT ───
async function saveDraft() {
  if (!cart.length) { showToast('Cart is empty!', 'error'); return; }
  const user = getUser();
  if (!user.branch_id) { showToast('No branch assigned', 'error'); return; }

  const discPct = parseFloat(document.getElementById('discountPct')?.value) || 0;
  const discFixed = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  const notes = document.getElementById('invoiceNotes')?.value || '';

  const groupedItems = getGroupedCartItems();
  let subtotal = 0;
  const items = groupedItems.map(item => {
    subtotal += item.line_total;
    return { product_id: item.product_id, name: item.name, brand: item.brand, quantity: item.quantity,
      unit_price: item.unit_price, discount_percent: item.discount_percent, discount_amount: item.discount_amount,
      line_total: item.line_total, vat_applicable: item.vat_applicable, warranty_months: item.warranty_months,
      serial_numbers: item.serial_numbers, retail_price: item.retail_price, wholesale_price: item.wholesale_price };
  });
  const discountApplied = discFixed > 0 ? discFixed : subtotal * discPct / 100;

  const btn = document.getElementById('saveDraftBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const kokoCharge = payMethod === 'koko' ? (parseFloat(document.getElementById('kokoChargeAmt')?.value) || 0) : 0;

  let result;
  if (currentDraftId) {
    // Update existing draft
    result = await apiFetch(`/invoices/${currentDraftId}`, { method: 'PUT', body: {
      customer_id: selectedCustomer?.id || null, discount_percent: discPct, discount_amount: discountApplied, koko_charge: kokoCharge,
      vat_rate: vatRate, payment_method: payMethod, notes, items
    }});
    if (result?.success) showToast('💾 Draft updated!', 'success', 2000);
  } else {
    // Create new draft
    result = await apiFetch('/invoices', { method: 'POST', body: {
      customer_id: selectedCustomer?.id || null, branch_id: user.branch_id,
      invoice_date: new Date().toISOString().split('T')[0],
      discount_percent: discPct, discount_amount: discountApplied, koko_charge: kokoCharge, vat_rate: vatRate,
      payment_method: payMethod, notes, items, invoice_status: 'draft'
    }});
    if (result?.success) {
      currentDraftId = result.data.invoiceId;
      showToast(`💾 Draft ${result.data.invoiceNumber} saved!`, 'success', 3000);
    }
  }

  if (btn) { btn.disabled = false; btn.textContent = '💾 Save Draft'; }
  if (!result?.success) showToast(result?.message || 'Failed to save draft', 'error');
}

async function loadDrafts() {
  const data = await apiFetch('/invoices?status=draft&limit=50');
  const el = document.getElementById('draftList');
  if (!el) return;

  if (!data?.success || !data.data.length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted);">No saved drafts found</div>';
  } else {
    el.innerHTML = data.data.map(d => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-weight:600;color:var(--accent);">${d.invoice_number}</div>
          <div style="font-size:12px;color:var(--text-muted);">${d.customer_name || 'No customer'} | ${formatDate(d.created_at)}</div>
          <div style="font-size:13px;font-weight:700;">${formatCurrency(d.total)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary btn-sm" onclick="loadDraftIntoCart(${d.id})">📂 Load</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDraft(${d.id})">🗑</button>
        </div>
      </div>`).join('');
  }
  openModal('draftModal');
}

async function loadDraftIntoCart(draftId) {
  const data = await apiFetch(`/invoices/${draftId}`);
  if (!data?.success) { showToast('Failed to load draft', 'error'); return; }
  const inv = data.data;
  const items = inv.items || [];

  // Rebuild cart from draft
  cart = items.map(item => ({
    product_id: item.product_id,
    name: item.product_name || item.name,
    brand: item.brand || '',
    sku: item.sku || '',
    image_path: item.image_path || '',
    unit_price: item.unit_price,
    retail_price: item.retail_price || item.unit_price,
    wholesale_price: item.wholesale_price || item.unit_price,
    quantity: item.quantity,
    discount_percent: item.discount_percent || 0,
    vat_applicable: 1,
    warranty_months: item.warranty_months || 0,
    serial_numbers: item.serial_numbers || []
  }));

  // Restore customer
  if (inv.customer_id) {
    selectedCustomer = { id: inv.customer_id, name: inv.customer_name, phone: inv.customer_phone };
    const cs = document.getElementById('customerSearch'); if (cs) cs.value = inv.customer_name || '';
    const sc = document.getElementById('selectedCustomer'); if (sc) sc.style.display = 'block';
    const sn = document.getElementById('selCustName'); if (sn) sn.textContent = inv.customer_name || '';
    const si = document.getElementById('selCustInfo'); if (si) si.textContent = inv.customer_phone || '';
  }

  // Restore discount
  if (inv.discount_percent > 0) { const dp = document.getElementById('discountPct'); if (dp) dp.value = inv.discount_percent; }
  if (inv.discount_amount > 0) { const da = document.getElementById('discountAmt'); if (da) da.value = inv.discount_amount; }
  if (inv.notes) { const nt = document.getElementById('invoiceNotes'); if (nt) nt.value = inv.notes; }

  currentDraftId = draftId;
  closeModal('draftModal');
  renderCart();
  showToast(`Draft ${inv.invoice_number} loaded! Make changes then create invoice.`, 'info', 4000);

  // Update save draft button
  const draftBtn = document.getElementById('saveDraftBtn');
  if (draftBtn) draftBtn.textContent = '💾 Update Draft';
}

async function deleteDraft(id) {
  const ok = await confirmDialog('Delete this draft? This cannot be undone.');
  if (!ok) return;
  const data = await apiFetch(`/invoices/${id}`, { method: 'DELETE' });
  if (data?.success) { showToast('Draft deleted', 'success'); if (currentDraftId === id) { currentDraftId = null; } loadDrafts(); }
  else showToast(data?.message || 'Failed', 'error');
}

// ─── SAVE AS QUOTATION ───
async function saveAsQuotation() {
  if (!cart.length) { showToast('Cart is empty!', 'error'); return; }
  const user = getUser();
  const branchId = user?.branch_id || 1;

  const discPct = parseFloat(document.getElementById('discountPct')?.value) || 0;
  const discFixed = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  const notes = document.getElementById('invoiceNotes')?.value || '';

  const groupedItems = getGroupedCartItems();
  let subtotal = 0;
  const items = groupedItems.map(item => {
    subtotal += item.line_total;
    return {
      product_id: item.product_id, name: item.name, brand: item.brand, model: item.model || '',
      quantity: item.quantity, unit_price: item.unit_price, discount_percent: item.discount_percent,
      discount_amount: item.discount_amount, line_total: item.line_total, vat_applicable: item.vat_applicable,
      warranty_months: item.warranty_months
    };
  });
  const discountApplied = discFixed > 0 ? discFixed : subtotal * discPct / 100;

  const btn = document.getElementById('saveQuoteBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const custName = selectedCustomer?.name || (document.getElementById('customerSearch')?.value.trim() || null);
  const custPhone = selectedCustomer?.phone || null;
  const custAddress = selectedCustomer?.address || null;

  const result = await apiFetch('/quotations', { method: 'POST', body: {
    customer_id: selectedCustomer?.id || null,
    customer_name: custName,
    customer_phone: custPhone,
    customer_address: custAddress,
    branch_id: branchId,
    quotation_date: new Date().toISOString().split('T')[0],
    discount_percent: discPct,
    discount_amount: discountApplied,
    vat_rate: vatRate, notes, items
  }});

  if (btn) { btn.disabled = false; btn.textContent = '📄 Save as Quotation'; }

  if (result?.success) {
    showToast(`✅ Quotation ${result.data.quotation_number} saved!`, 'success', 5000);
    // Offer to go to Quotations page or print
    const go = confirm(`Quotation ${result.data.quotation_number} created!\nGo to Quotations page to view / print?`);
    if (go) location.href = '/quotations.html';
    else clearCart();
  } else {
    showToast(result?.message || 'Failed to save quotation', 'error');
  }
}

// ─── SAVE AS PROFORMA ───
async function saveAsProforma() {
  if (!cart.length) { showToast('Cart is empty!', 'error'); return; }
  const user = getUser();
  if (!user.branch_id) { showToast('No branch assigned', 'error'); return; }

  const missing = cart.filter(i => i.serial_numbers.length > 0 && i.serial_numbers.length < i.quantity);
  if (missing.length) {
    const ok = await confirmDialog(`Some items have fewer serials than quantity. Continue anyway?`);
    if (!ok) return;
  }

  const discPct = parseFloat(document.getElementById('discountPct')?.value) || 0;
  const discFixed = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  const notes = document.getElementById('invoiceNotes')?.value || '';

  const groupedItems = getGroupedCartItems();
  let subtotal = 0;
  const items = groupedItems.map(item => {
    subtotal += item.line_total;
    return { product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, discount_percent: item.discount_percent, discount_amount: item.discount_amount, line_total: item.line_total, vat_applicable: item.vat_applicable, serial_numbers: item.serial_numbers };
  });
  const discountApplied = discFixed > 0 ? discFixed : subtotal * discPct / 100;

  const btn = document.getElementById('saveProformaBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const result = await apiFetch('/invoices', { method: 'POST', body: {
    customer_id: selectedCustomer?.id || null,
    branch_id: user.branch_id,
    invoice_date: new Date().toISOString().split('T')[0],
    discount_percent: discPct,
    discount_amount: discountApplied,
    vat_rate: vatRate,
    payment_method: payMethod,
    amount_paid: 0,
    notes, items,
    invoice_status: 'proforma'
  }});

  if (btn) { btn.disabled = false; btn.textContent = '📄 Save as Proforma'; }

  if (result?.success) {
    currentInvoiceId = result.data.invoiceId;
    window.lastInvoiceDetails = {
      invoiceNumber: result.data.invoiceNumber,
      total: result.data.total,
      customerPhone: selectedCustomer?.phone || ''
    };
    const sin = document.getElementById('successInvNumber'); if (sin) sin.textContent = result.data.invoiceNumber;
    const st = document.getElementById('successTotal'); if (st) st.textContent = formatCurrency(result.data.total);
    const modalTitle = document.querySelector('#successModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Proforma Created!';
    openModal('successModal');
  } else {
    showToast(result?.message || 'Failed to save proforma', 'error');
  }
}

// ─── PRINT ───
async function printCurrentInvoice() {
  closeModal('successModal');
  if (currentInvoiceId) await printInvoice(currentInvoiceId);
}
async function printLastInvoice() {
  if (currentInvoiceId) await printInvoice(currentInvoiceId);
  else showToast('No invoice to print', 'warning');
}

async function printInvoice(id) {
  const data = await apiFetch(`/invoices/${id}/print`);
  if (!data?.success) { showToast('Could not load invoice data', 'error'); return; }
  const inv = data.data;
  const s = inv.settings || {};

  const itemsHtml = inv.items.map(i => `
    <tr>
      <td style="padding:7px 8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${i.image_path || '/img/no-img.svg'}" onerror="this.src='/img/no-img.svg'" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #eee;flex-shrink:0;">
          <div>
            <div style="font-weight:bold;">${i.product_name}${i.brand ? ' - ' + i.brand : ''} ${i.model || ''}</div>
            ${i.description ? `<div style="font-size:11px;color:#666;margin-top:2px;">${i.description}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="padding:7px 8px;font-family:monospace;font-size:11px;text-align:center;">${(i.serial_numbers || []).join(', ') || '-'}</td>
      <td style="padding:7px 8px;text-align:center;">${i.quantity}</td>
      <td style="padding:7px 8px;text-align:right;">Rs.${Number(i.unit_price).toFixed(2)}</td>
      ${inv.payment_method === 'koko' ? '' : `<td style="padding:7px 8px;text-align:right;">${i.discount_amount > 0 ? 'Rs.' + Number(i.discount_amount).toFixed(2) : '-'}</td>`}
      <td style="padding:7px 8px;text-align:right;font-weight:bold;">Rs.${Number(i.line_total).toFixed(2)}</td>
    </tr>
    ${i.warranty_months > 0 ? `<tr><td colspan="${inv.payment_method === 'koko' ? 5 : 6}" style="padding:2px 8px;font-size:10px;color:#666;">⚙ Warranty: ${i.warranty_months} months | S/N: ${(i.serial_numbers || []).join(', ') || 'N/A'}</td></tr>` : ''}`).join('');

  const win = window.open('', '_blank', 'width=820,height=650');
  if (!win) { showToast('Please allow popups to print', 'warning'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;padding:20px;color:#000;}
.hdr{text-align:center;border-bottom:2px solid #003366;padding-bottom:12px;margin-bottom:14px;}.co-name{font-size:24px;font-weight:bold;color:#003366;}.co-sub{font-size:11px;color:#555;margin-top:3px;}
.meta{display:flex;justify-content:space-between;margin-bottom:12px;}.meta-box{background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:8px 14px;font-size:12px;}
table{width:100%;border-collapse:collapse;margin-bottom:14px;}thead th{background:#003366;color:#fff;padding:8px;font-size:11px;text-align:left;}
tbody tr:nth-child(even){background:#f9f9f9;}tbody td{border-bottom:1px solid #eee;}
.totals{margin-left:auto;width:260px;}.totals td{padding:5px 10px;font-size:12px;}.totals tr:last-child{background:#003366;color:#fff;font-weight:bold;font-size:15px;}
.footer{text-align:center;border-top:1px solid #ccc;margin-top:20px;padding-top:10px;font-size:11px;color:#666;}
.sig{display:flex;justify-content:space-between;margin-top:30px;}.sig div{border-top:1px solid #333;padding-top:4px;min-width:160px;text-align:center;font-size:12px;}
@media print{.no-print{display:none} @page { margin: 0; } body { padding: 10mm; } }
</style></head><body>
<div class="hdr" style="border-bottom:none; padding-bottom:0;"><img src="/img/INV%202.jpg" style="width:100%; max-height:220px; object-fit:contain; margin-bottom:8px;" alt="ENQOVA"></div>
<div class="meta">
  <div class="meta-box"><b>Invoice:</b> ${inv.invoice_number}<br><b>Date:</b> ${inv.invoice_date}<br><b>Branch:</b> ${inv.branch_name}</div>
  <div class="meta-box"><b>Cashier:</b> ${inv.cashier_name || '-'}<br><b>Payment:</b> ${inv.payment_method}${inv.payment_status && inv.payment_status.toLowerCase() === 'credit' ? '' : '<br><b>Status:</b> ' + (inv.payment_status || '').toUpperCase()}</div>
</div>
${inv.customer_name ? `<div style="border:1px solid #ddd;border-radius:6px;padding:8px 14px;font-size:12px;margin-bottom:12px;"><b>Customer:</b> ${inv.customer_name} &nbsp;|&nbsp; <b>Phone:</b> ${inv.customer_phone || '-'} &nbsp;|&nbsp; <b>NIC:</b> ${inv.customer_nic || '-'}</div>` : ''}
<table><thead><tr><th>Product</th><th style="text-align:center;">Serial No(s)</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th>${inv.payment_method === 'koko' ? '' : '<th style="text-align:right;">Discount</th>'}<th style="text-align:right;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
<table class="totals">

  ${inv.payment_method !== 'koko' && inv.discount_amount > 0 ? `<tr><td>Discount</td><td style="text-align:right;">Rs.${Number(inv.discount_amount).toFixed(2)}</td></tr>` : ''}
  ${inv.payment_method === 'koko' && inv.koko_charge > 0 ? `<tr><td>Promotional Discount Removal</td><td style="text-align:right;">Rs.${Number(inv.koko_charge).toFixed(2)}</td></tr>` : ''}
  ${inv.vat_amount > 0 ? `<tr><td>VAT (${inv.vat_rate}%)</td><td style="text-align:right;">Rs.${Number(inv.vat_amount).toFixed(2)}</td></tr>` : ''}
  <tr><td>GRAND TOTAL</td><td style="text-align:right;">Rs.${Number(inv.total).toFixed(2)}</td></tr>
</table>
<div class="sig"><div>Customer Signature</div><div>Authorized Signature</div></div>

<div class="terms-container" style="margin-top: 25px; font-size: 10px; line-height: 1.4; border-top: 1px solid #ccc; padding-top: 10px;">
  <div style="display:flex; justify-content: space-between;">
    <div style="flex: 1; padding-right: 20px;">
      <div style="font-weight: bold; margin-bottom: 5px; text-decoration: underline;">TERMS AND CONDITIONS</div>
      <ol style="margin-left: 15px; margin-bottom: 10px;">
        <li>Ownership of goods remains with ENQOVA SMART LIFE until full payment is received.</li>
        <li>Installation and wiring charges may vary based on site conditions and distance.</li>

        <li>Late payments may be charged 18% annual interest.</li>
        <li>Returned cheques will incur additional bank charges.</li>
        <li>All disputes are subject to the jurisdiction of Colombo courts.</li>
        <li>Warranty claims require the original invoice and warranty sticker.</li>
        <li>No warranty will be given for chip burnt, physical damages, corroded, misuse, Negligence or improper operations, power Fluctuations, lightning strikes, Item loss or any other natural disasters sabotage or accidents.</li>
        <li>Warranty does not include onsite service. Onsite service will be charged for per visit basis.</li>
        <li>Repairs or replacements may take 14–30 working days.</li>
        <li>Goods sold are non-refundable and non-exchangeable.</li>
        <li>Warranty becomes void if repaired or modified by unauthorized persons.</li>
        <li>The terms and conditions of this Invoice shall be limited in this Document and no other representations, terms, conditions or provisions either written or otherwise shall be accepted as adding to or subtracting form these terms or conditions.</li>
        <li>Customers are responsible for account passwords and login details.</li>
      </ol>
    </div>

  </div>

  <div style="font-weight: bold; font-style: italic; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 5px;">
    I have clearly understood that the warranty is not valid due to the above instances & terms and conditions. I have received the abovementioned Goods in good condition with all the accessories & I agree to pay the amount in the Invoice value.
  </div>
</div>

<div class="footer" style="margin-top: 15px;">${s.footer_text || 'Thank you for choosing ENQOVA!'}</div>
<script>setTimeout(()=>{window.print();},500);<\/script>
</body></html>`);
  win.document.close();
}

const jobsheetItemMapping = {
  left_vid_cable_kelani: { search: "Kelani Cable", label: "Kelani Video Cable" },
  left_vid_cable_hang: { search: "Hang Cable", label: "Hang Video Cable" },
  left_vid_cable_hvn: { search: "Hikvision Cable", label: "Hikvision Video Cable" },
  left_vid_cable_gen: { search: "Video Cable", label: "Video Cable" },
  left_tt_wire: { search: "TT Wire", label: "TT Wire" },
  left_3pin_power: { search: "Power Cable", label: "3 Pin Power Cable" },
  left_dc_male: { search: "DC Male", label: "DC Male Connector" },
  left_dc_female: { search: "DC Female", label: "DC Female Connector" },
  left_ip_box: { search: "IP Box", label: "IP Box" },
  left_sunk_box: { search: "Sunk Box", label: "Sunk Box" },
  left_router: { search: "Router", label: "Router" },
  left_sim: { search: "SIM", label: "SIM Card" },
  left_dvr_rack: { search: "Rack", label: "DVR Rack" },
  left_bnc: { search: "BNC", label: "BNC Connector" },
  left_bnc_mx: { search: "BNC MX", label: "BNC MX Connector" },
  left_rj45: { search: "RJ 45", label: "RJ45 Connector" },
  left_battery_ps: { search: "Battery", label: "Battery" },
  left_switch_nun: { search: "Switch", label: "Non-POE Switch" },
  left_switch_poe: { search: "POE Switch", label: "POE Switch" },
  left_wifi_ext: { search: "WiFi Extender", label: "WiFi Extender" },
  left_wall_mount: { search: "Wall Mount", label: "Wall Mount Bracket" },
  left_mon_hvn: { search: "Monitor", label: "Hikvision Monitor" },
  left_mon_len: { search: "Monitor", label: "Lenovo Monitor" },
  left_ups: { search: "UPS", label: "UPS" },
  left_dvr: { search: "DVR", label: "DVR" },
  left_hard_disk: { search: "Surveillance Hard Disk", label: "Hard Disk" },
  left_memory_card: { search: "Micro SD Card", label: "Memory Card" },
  right_cable_05: { search: "Cable", label: "Cable Size 0.5" },
  right_cable_15: { search: "Cable", label: "Cable Size 1.5" },
  right_cable_3: { search: "Cable", label: "Cable Size 3m" },
  right_cable_5: { search: "Cable", label: "Cable Size 5m" },
  right_cable_10: { search: "Cable", label: "Cable Size 10m" },
  right_usb_buy: { search: "USB", label: "USB Buy" },
  right_usb_rtn: { search: "USB", label: "USB Rtn" },
  right_vga_15: { search: "VGA", label: "VGA Size 1.5" },
  right_vga_3: { search: "VGA", label: "VGA Size 3m" },
  right_vga_5: { search: "VGA", label: "VGA Size 5m" },
  right_net_1_buy: { search: "Network", label: "Network Cable Size 1 (BUY)" },
  right_net_1_rtn: { search: "Network", label: "Network Cable Size 1 (RTN)" },
  right_net_2_buy: { search: "Network", label: "Network Cable Size 2 (BUY)" },
  right_net_2_rtn: { search: "Network", label: "Network Cable Size 2 (RTN)" },
  right_net_5_buy: { search: "Network", label: "Network Cable Size 5 (BUY)" },
  right_net_5_rtn: { search: "Network", label: "Network Cable Size 5 (RTN)" },
  right_net_10_buy: { search: "Network", label: "Network Cable Size 10 (BUY)" },
  right_net_10_rtn: { search: "Network", label: "Network Cable Size 10 (RTN)" },
  right_hdmi_1_buy: { search: "HDMI", label: "HDMI Cable 1m (BUY)" },
  right_hdmi_1_rtn: { search: "HDMI", label: "HDMI Cable 1m (RTN)" },
  right_hdmi_15_buy: { search: "HDMI", label: "HDMI Cable 1.5m (BUY)" },
  right_hdmi_15_rtn: { search: "HDMI", label: "HDMI Cable 1.5m (RTN)" },
  right_hdmi_3_buy: { search: "HDMI", label: "HDMI Cable 3m (BUY)" },
  right_hdmi_3_rtn: { search: "HDMI", label: "HDMI Cable 3m (RTN)" },
  right_hdmi_5_buy: { search: "HDMI", label: "HDMI Cable 5m (BUY)" },
  right_hdmi_5_rtn: { search: "HDMI", label: "HDMI Cable 5m (RTN)" },
  right_hdmi_10_buy: { search: "HDMI", label: "HDMI Cable 10m (BUY)" },
  right_hdmi_10_rtn: { search: "HDMI", label: "HDMI Cable 10m (RTN)" },
  right_power_25: { search: "Power Supply", label: "Power S Size 2.5" },
  right_power_5a: { search: "Power Supply", label: "Power S Size 5A" },
  right_power_10a: { search: "Power Supply", label: "Power S Size 10A" },
  right_power_20a: { search: "Power Supply", label: "Power S Size 20A" },
  right_power_30a: { search: "Power Supply", label: "Power S Size 30A" },
  right_bracket_25: { search: "Bracket", label: "Bracket Size 25" },
  right_bracket_32: { search: "Bracket", label: "Bracket Size 32" },
  right_bracket_40: { search: "Bracket", label: "Bracket Size 40" },
  right_bracket_50: { search: "Bracket", label: "Bracket Size 50" },
  right_bracket_l: { search: "L Bracket", label: "L Bracket" },
  right_bracket_i: { search: "I Bracket", label: "I Bracket" },
  right_pl_bracket_qty: { search: "PL Bracket", label: "PL Bracket (QTY)" },
  right_pl_bracket_use: { search: "PL Bracket", label: "PL Bracket (USE)" },
  right_dome_b: { search: "Dome", label: "Dome / B" },
  right_fingerprint_sn: { search: "Fingerprint", label: "Fingerprint Terminal" },
  right_alarm_sn: { search: "Alarm", label: "Alarm System" },
  right_video_dphone: { search: "Doorphone", label: "Video D/Phone" }
};

async function loadJobSheetToPOS(id) {
  showToast('Loading Job Sheet items...', 'info');
  const data = await apiFetch(`/jobsheets/${id}`);
  if (!data?.success) {
    showToast('Failed to load Job Sheet data', 'error');
    return;
  }
  const j = data.data;
  
  // 1. Load customer if details are available
  if (j.customer_phone || j.customer_name) {
    const custSearchQuery = j.customer_phone || j.customer_name;
    const custData = await apiFetch(`/customers?search=${encodeURIComponent(custSearchQuery)}`);
    if (custData?.success && custData.data.length > 0) {
      const customer = custData.data.find(c => c.phone === j.customer_phone) || custData.data[0];
      selectCustomer(customer);
    } else {
      const csInput = document.getElementById('customerSearch');
      if (csInput) {
        csInput.value = j.customer_name;
      }
    }
  }

  // 2. Map and load items
  const items = j.items_data || {};
  const user = getUser();
  const branchId = user.branch_id || '';
  
  for (const [key, itemVal] of Object.entries(items)) {
    if (!itemVal) continue;
    const qty = typeof itemVal === 'object' ? itemVal.qty : parseInt(itemVal);
    const serials = typeof itemVal === 'object' ? itemVal.serials : [];
    if (!qty || qty <= 0) continue;

    const mapping = jobsheetItemMapping[key];
    const searchTerm = mapping ? mapping.search : null;
    const itemLabel = mapping ? mapping.label : key;

    if (!searchTerm) {
      showToast(`No database product mapped for '${itemLabel}'`, 'warning');
      continue;
    }

    // Search for product in database
    const pData = await apiFetch(`/products/search/${encodeURIComponent(searchTerm)}?branch_id=${branchId}`);
    if (pData?.success && pData.data.length > 0) {
      const product = pData.data[0];
      
      // Add product to cart with custom quantity and serials
      cart.push({
        product_id: product.id,
        name: product.name || '',
        brand: product.brand || '',
        sku: product.sku || '',
        image_path: product.image_path || '',
        unit_price: customerType === 'wholesale' ? (product.wholesale_price || 0) : (product.retail_price || 0),
        retail_price: product.retail_price || 0,
        wholesale_price: product.wholesale_price || 0,
        is_wholesale: customerType === 'wholesale',
        quantity: qty,
        discount_percent: 0,
        vat_applicable: product.vat_applicable != null ? product.vat_applicable : 1,
        warranty_months: product.warranty_months || 0,
        serial_numbers: (serials || []).filter(sn => sn.trim())
      });
      showToast(`Added ${qty} x ${product.name} to cart`, 'success', 1000);
    } else {
      showToast(`Could not find database product for '${itemLabel}' (${searchTerm})`, 'warning', 3000);
    }
  }

  renderCart();
}

// ─── EDIT MODE FUNCTIONS ───
async function loadInvoiceForEditing(id) {
  try {
    const res = await apiFetch(`/invoices/${id}`);
    if (!res || !res.success) {
      showToast('Failed to load invoice details.', 'error');
      return;
    }
    const inv = res.data;
    const currentUser = getUser();
    
    // Check if it's confirmed and user is not admin
    if (inv.invoice_status === 'confirmed' && currentUser.role !== 'admin') {
      showToast('Only admins can edit confirmed invoices.', 'error');
      setTimeout(() => window.location.href = '/dashboard.html', 2000);
      return;
    }

    editingInvoiceId = id;
    
    // Change page title to Edit Invoice
    const titleEl = document.querySelector('.header-title');
    if (titleEl) titleEl.textContent = `✏️ Edit Invoice: ${inv.invoice_number}`;
    
    // Change Create Invoice button text
    const createBtn = document.getElementById('createInvBtn');
    if (createBtn) {
      if (inv.invoice_status === 'proforma') {
        createBtn.textContent = '✏️ Update Proforma';
      } else {
        createBtn.textContent = '✏️ Update Invoice';
      }
      createBtn.onclick = updateInvoice;
      createBtn.disabled = false;
    }

    // Hide quotation, draft, print, wa buttons during editing
    const saveQuoteBtn = document.getElementById('saveQuoteBtn');
    if (saveQuoteBtn) saveQuoteBtn.style.display = 'none';
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) saveDraftBtn.style.display = 'none';
    const saveProformaBtn = document.getElementById('saveProformaBtn');
    if (saveProformaBtn) saveProformaBtn.style.display = 'none';
    const loadDraftBtn = document.querySelector('button[onclick="loadDrafts()"]');
    if (loadDraftBtn) loadDraftBtn.style.display = 'none';
    const printLastBtn = document.getElementById('printLastBtn');
    if (printLastBtn) printLastBtn.style.display = 'none';
    const waBtn = document.getElementById('waBtn');
    if (waBtn) waBtn.style.display = 'none';

    // Set notes
    const notesEl = document.getElementById('invoiceNotes');
    if (notesEl) notesEl.value = inv.notes || '';

    // Set discount fixed or percent
    const discPctEl = document.getElementById('discountPct');
    const discFixedEl = document.getElementById('discountAmt');
    if (discPctEl) discPctEl.value = inv.discount_percent || '';
    if (discFixedEl) discFixedEl.value = inv.discount_amount || '';

    // Select customer
    if (inv.customer_id) {
      await loadCustomerById(inv.customer_id);
    } else {
      clearCustomer();
    }

    // Set payment method and amount paid
    setPayMethod(inv.payment_method || 'cash');
    const paidEl = document.getElementById('amountPaid');
    if (paidEl) paidEl.value = inv.amount_paid || '0.00';

    // Populate cart
    cart = inv.items.map(item => ({
      product_id: item.product_id,
      name: item.product_name,
      brand: item.brand || '',
      sku: item.sku || '',
      image_path: item.image_path || '',
      unit_price: item.unit_price,
      retail_price: item.retail_price || item.unit_price,
      wholesale_price: item.wholesale_price || item.unit_price,
      is_wholesale: inv.customer_type === 'wholesale',
      quantity: item.quantity,
      discount_percent: item.discount_percent || 0,
      vat_applicable: item.vat_applicable != null ? item.vat_applicable : 1,
      warranty_months: item.warranty_months || 0,
      serial_numbers: item.serial_numbers || []
    }));

    renderCart();
    recalcTotals();
    showToast('Invoice loaded for editing.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error loading invoice: ' + err.message, 'error');
  }
}

async function updateInvoice() {
  if (!editingInvoiceId) return;
  if (!cart.length) { showToast('Cart is empty!', 'error'); return; }

  const missing = cart.filter(i => i.serial_numbers.length > 0 && i.serial_numbers.length < i.quantity);
  if (missing.length) {
    const ok = await confirmDialog(`Some items have fewer serials than quantity. Continue anyway?`);
    if (!ok) return;
  }

  const discPct = parseFloat(document.getElementById('discountPct')?.value) || 0;
  const discFixed = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  const amountPaid = parseFloat(document.getElementById('amountPaid')?.value) || 0;
  const notes = document.getElementById('invoiceNotes')?.value || '';

  const groupedItems = getGroupedCartItems();
  let subtotal = 0;
  const items = groupedItems.map(item => {
    subtotal += item.line_total;
    return { 
      product_id: item.product_id, 
      quantity: item.quantity, 
      unit_price: item.unit_price, 
      discount_percent: item.discount_percent, 
      discount_amount: item.discount_amount, 
      line_total: item.line_total, 
      vat_applicable: item.vat_applicable, 
      serial_numbers: item.serial_numbers 
    };
  });
  const discountApplied = discFixed > 0 ? discFixed : subtotal * discPct / 100;

  const btn = document.getElementById('createInvBtn');
  const isProformaEdit = btn && btn.textContent.includes('Proforma');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Updating...'; }

  const result = await apiFetch(`/invoices/${editingInvoiceId}`, { 
    method: 'PUT', 
    body: {
      customer_id: selectedCustomer?.id || null,
      discount_percent: discPct,
      discount_amount: discountApplied,
      vat_rate: vatRate,
      payment_method: payMethod,
      amount_paid: amountPaid,
      notes, 
      items
    }
  });

  if (btn) { btn.disabled = false; btn.textContent = isProformaEdit ? '✏️ Update Proforma' : '✏️ Update Invoice'; }

  if (result?.success) {
    showToast('Invoice updated successfully!', 'success');
    setTimeout(() => window.location.href = '/invoices.html', 1500);
  } else {
    showToast(result?.message || 'Failed to update invoice', 'error');
  }
}
