// Products JS
let currentPage = 1, currentProductId = null;

document.addEventListener('DOMContentLoaded', () => { loadCategories(); loadProducts(); loadBranchesForFilter(); });

async function loadBranchesForFilter() {
  const data = await apiFetch('/users/branches/all');
  if (data?.success) {
    const sel = document.getElementById('serialBranchFilter');
    if (sel) sel.innerHTML = '<option value="">All Branches</option>' + data.data.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  }
}

async function loadCategories() {
  const data = await apiFetch('/products/categories/all');
  if (!data?.success) return;
  const sel = document.getElementById('filterCat');
  const psel = document.getElementById('p_category');
  const opts = data.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (sel) sel.innerHTML = '<option value="">All Categories</option>' + opts;
  if (psel) psel.innerHTML = '<option value="">-- Select Category --</option>' + opts;
}

async function loadProducts(page = 1) {
  currentPage = page;
  const search = document.getElementById('searchInput')?.value || '';
  const cat = document.getElementById('filterCat')?.value || '';
  const data = await apiFetch(`/products?search=${encodeURIComponent(search)}&category_id=${cat}&page=${page}&limit=20`);
  if (!data?.success) return;
  const tbody = document.getElementById('productsTbody');
  if (!data.data.length) { tbody.innerHTML = '<tr><td colspan="10" class="text-center empty-state"><div class="empty-icon">📦</div><p>No products found</p></td></tr>'; return; }

  tbody.innerHTML = data.data.map(p => {
    const b1 = p.branch_stocks?.find(s => s.branch_id == 1)?.quantity || 0;
    const b2 = p.branch_stocks?.find(s => s.branch_id == 2)?.quantity || 0;
    return `<tr>
      <td><img class="product-thumb" src="${p.image_path || ''}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23162030%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2218%22 fill=%22%234a5568%22>📷</text></svg>'" style="cursor:pointer;" onclick="openEditProduct(${p.id})"></td>
      <td><div style="font-weight:600;">${p.name}</div><div style="font-size:11px;color:var(--text-muted);font-family:monospace;">${p.sku}</div></td>
      <td><div style="font-size:13px;">${p.brand || '-'}</div><div style="font-size:11px;color:var(--text-muted);">${p.model || ''}</div></td>
      <td><span class="badge badge-secondary">${p.category_name || '-'}</span></td>
      <td class="text-bold text-accent">${formatCurrency(p.retail_price)}</td>
      <td style="color:var(--green);">${formatCurrency(p.wholesale_price)}</td>
      <td><span style="font-weight:700;color:${b1<=5?'var(--red)':'var(--text-primary)'};">${b1}</span></td>
      <td><span style="font-weight:700;color:${b2<=5?'var(--red)':'var(--text-primary)'};">${b2}</span></td>
      <td style="font-size:12px;color:var(--text-secondary);">${p.warranty_months}m ${p.vat_applicable ? '<span class="badge badge-info" style="font-size:9px;">VAT</span>' : ''}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-secondary btn-sm" onclick="openEditProduct(${p.id})" title="Edit">✏️</button>
          <button class="btn btn-secondary btn-sm" onclick="viewSerials(${p.id},'${p.name}')" title="Serials">📟</button>
          <button class="btn btn-secondary btn-sm" onclick="openBarcodeModal(${p.id}, '${p.name.replace(/'/g, "\\'")}', '${p.sku}', ${p.retail_price})" title="Barcode">🏷️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})" title="Deactivate">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('pagination').innerHTML = createPagination(data.total, page, 20, 'loadProducts');
}

function openAddProduct() {
  selectedFile = null;
  currentProductId = null;
  document.getElementById('productModalTitle').textContent = 'Add New Product';
  ['p_name','p_sku','p_brand','p_model','p_desc','p_cost','p_retail','p_wholesale'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p_warranty').value = 12;
  document.getElementById('p_vat').checked = false;
  document.getElementById('p_quickAdd').checked = false;
  document.getElementById('p_id').value = '';
  document.getElementById('p_imgPath').value = '';
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('imgPlaceholder').style.display = 'block';
  openModal('productModal');
}

async function openEditProduct(id) {
  selectedFile = null;
  currentProductId = id;
  const data = await apiFetch(`/products/${id}`);
  if (!data?.success) return;
  const p = data.data;
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('p_name').value = p.name || '';
  document.getElementById('p_sku').value = p.sku || '';
  document.getElementById('p_brand').value = p.brand || '';
  document.getElementById('p_model').value = p.model || '';
  document.getElementById('p_desc').value = p.description || '';
  document.getElementById('p_cost').value = p.cost_price || 0;
  document.getElementById('p_retail').value = p.retail_price || 0;
  document.getElementById('p_wholesale').value = p.wholesale_price || 0;
  document.getElementById('p_warranty').value = p.warranty_months !== null && p.warranty_months !== undefined ? p.warranty_months : 12;
  document.getElementById('p_vat').checked = !!p.vat_applicable;
  document.getElementById('p_quickAdd').checked = !!p.is_quick_add;
  document.getElementById('p_id').value = p.id;
  document.getElementById('p_imgPath').value = p.image_path || '';
  document.getElementById('p_category').value = p.category_id || '';
  if (p.image_path) { document.getElementById('imgPreview').src = p.image_path; document.getElementById('imgPreview').style.display = 'block'; document.getElementById('imgPlaceholder').style.display = 'none'; }
  else { document.getElementById('imgPreview').style.display = 'none'; document.getElementById('imgPlaceholder').style.display = 'block'; }
  openModal('productModal');
}

let selectedFile = null;

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => { document.getElementById('imgPreview').src = e.target.result; document.getElementById('imgPreview').style.display = 'block'; document.getElementById('imgPlaceholder').style.display = 'none'; };
  reader.readAsDataURL(file);
}

async function saveProduct() {
  const name = document.getElementById('p_name').value.trim();
  if (!name) { showToast('Product name required', 'error'); return; }
  
  const saveBtn = document.querySelector('#productModal .btn-primary');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  let image_path = document.getElementById('p_imgPath').value || null;
  if (selectedFile) {
    const formData = new FormData();
    formData.append('image', selectedFile);
    const data = await apiFetch('/products/upload-image', { method: 'POST', body: formData });
    if (data?.success) {
      image_path = data.data.image_path;
    } else {
      showToast(data?.message || 'Failed to upload image', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
      return;
    }
  }

  const body = {
    name, sku: document.getElementById('p_sku').value.trim(),
    brand: document.getElementById('p_brand').value.trim(), model: document.getElementById('p_model').value.trim(),
    category_id: document.getElementById('p_category').value || null,
    description: document.getElementById('p_desc').value.trim(),
    cost_price: parseFloat(document.getElementById('p_cost').value) || 0,
    retail_price: parseFloat(document.getElementById('p_retail').value) || 0,
    wholesale_price: parseFloat(document.getElementById('p_wholesale').value) || 0,
    warranty_months: document.getElementById('p_warranty').value !== '' ? parseInt(document.getElementById('p_warranty').value) : 12,
    vat_applicable: document.getElementById('p_vat').checked ? 1 : 0,
    is_quick_add: document.getElementById('p_quickAdd').checked ? 1 : 0,
    image_path
  };
  const id = document.getElementById('p_id').value;
  const data = id ? await apiFetch(`/products/${id}`, { method: 'PUT', body }) : await apiFetch('/products', { method: 'POST', body });
  
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Product';
  
  if (data?.success) { 
    showToast('Product saved!', 'success'); 
    closeModal('productModal'); 
    loadProducts(currentPage); 
  } else {
    showToast(data?.message || 'Failed to save', 'error');
  }
}

async function deleteProduct(id) {
  if (!await confirmDialog('Deactivate this product?')) return;
  const data = await apiFetch(`/products/${id}`, { method: 'DELETE' });
  if (data?.success) { showToast('Product deactivated', 'success'); loadProducts(currentPage); }
  else showToast(data?.message || 'Failed', 'error');
}

let currentSerialProductId = null;
async function viewSerials(id, name) {
  currentSerialProductId = id;
  document.getElementById('serialsModalTitle').textContent = `📟 Serials - ${name}`;
  await loadProductSerials();
  openModal('serialsModal');
}

async function loadProductSerials() {
  const status = document.getElementById('serialStatusFilter')?.value || '';
  const branch = document.getElementById('serialBranchFilter')?.value || '';
  const data = await apiFetch(`/products/${currentSerialProductId}/serials?status=${status}&branch_id=${branch}`);
  const tbody = document.getElementById('serialsTbody');
  if (!data?.success || !data.data.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:20px;">No serials found</td></tr>'; return; }
  const statusColors = { available: 'success', sold: 'info', warranty: 'warning', transferred: 'secondary', damaged: 'danger' };
  tbody.innerHTML = data.data.map(s => `<tr>
    <td style="font-family:monospace;font-weight:600;">${s.serial_number}</td>
    <td><span class="badge badge-${statusColors[s.status] || 'secondary'}">${s.status}</span></td>
    <td style="font-size:12px;">${s.branch_name || '-'}</td>
    <td style="font-size:12px;color:var(--text-muted);">${formatDate(s.created_at)}</td>
  </tr>`).join('');
}

function openCatModal() { openModal('catModal'); }
async function saveCategory() {
  const name = document.getElementById('catName').value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const data = await apiFetch('/products/categories', { method: 'POST', body: { name } });
  if (data?.success) { showToast('Category added!', 'success'); closeModal('catModal'); document.getElementById('catName').value = ''; loadCategories(); }
  else showToast(data?.message || 'Failed', 'error');
}

function exportCSV() { exportTableToCSV('productsTbody', 'enqova_products.csv'); }

// ─── BARCODE PRINTING ───
let currentBarcodeSku = '';
let currentBarcodeName = '';
let currentBarcodePrice = 0;

function openBarcodeModal(id, name, sku, price) {
  currentBarcodeSku = sku;
  currentBarcodeName = name;
  currentBarcodePrice = price;

  document.getElementById('bc_prod_name').textContent = name;
  document.getElementById('bc_price_lbl').textContent = formatCurrency(price);
  
  try {
    JsBarcode("#barcodeSvg", sku, {
      format: "CODE128",
      lineColor: "#000",
      width: 1.5,
      height: 40,
      displayValue: true,
      fontSize: 10,
      margin: 4
    });
  } catch (err) {
    console.error("Barcode generation failed:", err);
    showToast("Error generating barcode", "error");
  }
  
  openModal('barcodeModal');
}

function printBarcodeLabel() {
  const win = window.open('', '_blank', 'width=300,height=300');
  if (!win) {
    showToast('Allow popups to print barcode', 'warning');
    return;
  }
  const svgHtml = document.getElementById('barcodeSvg').outerHTML;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcode - ${currentBarcodeSku}</title>
      <style>
        body {
          margin: 0;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          background: white;
          color: black;
          width: 200px;
        }
        .title {
          font-size: 8px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 2px;
        }
        .name {
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 2px;
        }
        .price {
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          margin-top: 2px;
        }
        svg {
          width: 100%;
          max-height: 50px;
        }
        @media print {
          body { margin: 0; padding: 5px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="title">ENQOVA</div>
      <div class="name">${currentBarcodeName}</div>
      ${svgHtml}
      <div class="price">${formatCurrency(currentBarcodePrice)}</div>
      <script>
        setTimeout(() => {
          window.print();
          window.close();
        }, 500);
      </script>
    </body>
    </html>
  `);
  win.document.close();
}
