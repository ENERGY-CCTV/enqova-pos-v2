// Users JS
document.addEventListener('DOMContentLoaded', () => { loadUsers(); loadBranchesForSelect(); });

async function loadBranchesForSelect() {
  const data = await apiFetch('/users/branches/all');
  if (!data?.success) return;
  const sel = document.getElementById('u_branch');
  if (sel) sel.innerHTML = '<option value="">All Branches</option>' + data.data.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
}

async function loadUsers() {
  const data = await apiFetch('/users');
  const tbody = document.getElementById('usersTbody');
  if (!data?.success) return;
  const roleColors = { admin:'danger', manager:'warning', cashier:'info', accountant:'success', sales_executive:'primary', technician:'secondary' };
  
  const showInactive = document.getElementById('showInactive')?.checked || false;
  const filteredUsers = data.data.filter(u => showInactive || u.is_active);

  tbody.innerHTML = filteredUsers.map(u=>`<tr>
    <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#0066ff);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;">${(u.full_name||u.username)[0].toUpperCase()}</div><div style="font-weight:600;${!u.is_active?'text-decoration:line-through;color:var(--text-muted);':''}">${u.full_name}</div></div></td>
    <td style="font-family:monospace;color:var(--accent);">${u.username}</td>
    <td><span class="badge badge-${roleColors[u.role]||'secondary'}">${u.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></td>
    <td style="font-size:12px;">${u.branch_name||'All'}</td>
    <td style="font-size:12px;color:var(--text-muted);">${u.last_login?formatDateTime(u.last_login):'Never'}</td>
    <td><span class="badge badge-${u.is_active?'success':'danger'}">${u.is_active?'Active':'Inactive'}</span></td>
    <td>
      <div class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditUser(${u.id})">✏️ Edit</button>
        ${u.username!=='admin' && u.is_active ? `<button class="btn btn-danger btn-sm" onclick="deactivateUser(${u.id},'${u.full_name}')" title="Deactivate">🗑</button>` : ''}
        ${u.username!=='admin' && !u.is_active ? `<button class="btn btn-success btn-sm" onclick="reactivateUser(${u.id},'${u.full_name}')" title="Reactivate">♻️</button>` : ''}
      </div>
    </td>
  </tr>`).join('');
}

async function reactivateUser(id, name) {
  if (!confirm(`Are you sure you want to reactivate ${name}?`)) return;
  const data = await apiFetch(`/users/${id}/reactivate`, { method: 'PUT' });
  if (data?.success) { showToast('User reactivated', 'success'); loadUsers(); }
  else showToast(data?.message || 'Failed', 'error');
}

function openAddUser() {
  document.getElementById('userModalTitle').textContent = 'Add New User';
  ['u_name','u_username','u_email','u_password'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('u_role').value = 'cashier';
  document.getElementById('u_id').value = '';
  document.getElementById('passLabel').textContent = 'Password *';
  document.querySelectorAll('input[name="u_perms"]').forEach(cb => cb.checked = false);
  loadBranchesForSelect();
  openModal('userModal');
}

async function openEditUser(id) {
  const data = await apiFetch(`/users/${id}`);
  if (!data?.success) return;
  const u = data.data;
  document.getElementById('userModalTitle').textContent = 'Edit User';
  document.getElementById('u_name').value = u.full_name||'';
  document.getElementById('u_username').value = u.username||'';
  document.getElementById('u_email').value = u.email||'';
  document.getElementById('u_role').value = u.role||'cashier';
  document.getElementById('u_password').value = '';
  document.getElementById('u_id').value = u.id;
  document.getElementById('passLabel').textContent = 'New Password (leave blank to keep)';
  
  const perms = (u.permissions || '').split(',').map(p=>p.trim());
  document.querySelectorAll('input[name="u_perms"]').forEach(cb => {
    cb.checked = perms.includes(cb.value);
  });

  await loadBranchesForSelect();
  document.getElementById('u_branch').value = u.branch_id||'';
  openModal('userModal');
}

async function saveUser() {
  const name = document.getElementById('u_name').value.trim();
  const username = document.getElementById('u_username').value.trim();
  if (!name || !username) { showToast('Name and username required', 'error'); return; }
  const id = document.getElementById('u_id').value;
  const password = document.getElementById('u_password').value;
  if (!id && !password) { showToast('Password required for new user', 'error'); return; }
  
  const perms = Array.from(document.querySelectorAll('input[name="u_perms"]:checked')).map(cb => cb.value).join(',');

  const body = { 
    full_name:name, 
    username, 
    email:document.getElementById('u_email').value, 
    role:document.getElementById('u_role').value, 
    branch_id:document.getElementById('u_branch').value||null,
    permissions: perms 
  };
  if (password) body.password = password;
  const data = id ? await apiFetch(`/users/${id}`, {method:'PUT',body}) : await apiFetch('/users', {method:'POST',body});
  if (data?.success) { showToast('User saved!','success'); closeModal('userModal'); loadUsers(); }
  else showToast(data?.message||'Failed','error');
}

async function deactivateUser(id, name) {
  if (!await confirmDialog(`Deactivate user "${name}"?`)) return;
  const data = await apiFetch(`/users/${id}`, {method:'DELETE'});
  if (data?.success) { showToast('User deactivated','success'); loadUsers(); }
  else showToast(data?.message||'Failed','error');
}

// Branches
async function loadBranches() {
  const data = await apiFetch('/users/branches/all');
  const tbody = document.getElementById('branchesTbody');
  if (!data?.success) return;
  tbody.innerHTML = data.data.map(b=>`<tr>
    <td style="font-weight:700;">${b.name}</td>
    <td style="font-size:12px;">${b.address||'-'}</td>
    <td>${b.phone||'-'}</td>
    <td>${b.manager_name||'-'}</td>
    <td><span class="badge badge-${b.is_active?'success':'danger'}">${b.is_active?'Active':'Inactive'}</span></td>
    <td><button class="btn btn-secondary btn-sm" onclick="openEditBranch(${b.id})">✏️ Edit</button></td>
  </tr>`).join('');
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('tab-'+name);
  if (panel) panel.classList.add('active');
  if (name==='branches') loadBranches();
  else loadUsers();
}

function openAddBranch() {
  ['b_name','b_address','b_phone','b_email','b_manager'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('b_id').value='';
  document.getElementById('branchModalTitle').textContent='Add Branch';
  openModal('branchModal');
}

async function openEditBranch(id) {
  const data = await apiFetch(`/users/branches/${id}`);
  if (!data?.success) return;
  const b = data.data;
  document.getElementById('branchModalTitle').textContent='Edit Branch';
  document.getElementById('b_name').value=b.name||'';
  document.getElementById('b_address').value=b.address||'';
  document.getElementById('b_phone').value=b.phone||'';
  document.getElementById('b_email').value=b.email||'';
  document.getElementById('b_manager').value=b.manager_name||'';
  document.getElementById('b_id').value=b.id;
  openModal('branchModal');
}

async function saveBranch() {
  const name = document.getElementById('b_name').value.trim();
  if (!name) { showToast('Branch name required','error'); return; }
  const body = { name, address:document.getElementById('b_address').value, phone:document.getElementById('b_phone').value, email:document.getElementById('b_email').value, manager_name:document.getElementById('b_manager').value };
  const id = document.getElementById('b_id').value;
  const data = id ? await apiFetch(`/users/branches/${id}`,{method:'PUT',body}) : await apiFetch('/users/branches',{method:'POST',body});
  if (data?.success) { showToast('Branch saved!','success'); closeModal('branchModal'); loadBranches(); }
  else showToast(data?.message||'Failed','error');
}
