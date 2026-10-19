// Settings JS
document.addEventListener('DOMContentLoaded', () => loadSettings());

async function loadSettings() {
  const data = await apiFetch('/settings');
  if (!data?.success) return;
  const s = data.data;
  document.getElementById('s_company_name').value = s.company_name || 'ENQOVA';
  document.getElementById('s_company_phone').value = s.company_phone || '';
  document.getElementById('s_company_address').value = s.company_address || '';
  document.getElementById('s_company_email').value = s.company_email || '';
  document.getElementById('s_footer_text').value = s.footer_text || 'Thank you for your business!';
  document.getElementById('s_vat_rate').value = s.vat_rate || 18;
  document.getElementById('s_currency').value = s.currency || 'Rs.';
  document.getElementById('s_gemini_api_key').value = s.gemini_api_key || '';
}

async function saveSettings(section) {
  let body = {};
  if (section === 'company') {
    body = { company_name: document.getElementById('s_company_name').value, company_phone: document.getElementById('s_company_phone').value, company_address: document.getElementById('s_company_address').value, company_email: document.getElementById('s_company_email').value, footer_text: document.getElementById('s_footer_text').value };
  } else if (section === 'tax') {
    body = { vat_rate: document.getElementById('s_vat_rate').value, currency: document.getElementById('s_currency').value };
  } else if (section === 'ai') {
    body = { gemini_api_key: document.getElementById('s_gemini_api_key').value };
  }
  const data = await apiFetch('/settings', { method: 'PUT', body });
  if (data?.success) showToast('Settings saved!', 'success');
  else showToast(data?.message || 'Failed to save', 'error');
}

function toggleApiKeyVis() {
  const input = document.getElementById('s_gemini_api_key');
  const eye = document.getElementById('apiKeyEye');
  if (input.type === 'password') { input.type = 'text'; eye.textContent = '🙈'; }
  else { input.type = 'password'; eye.textContent = '👁'; }
}

async function testAI() {
  const key = document.getElementById('s_gemini_api_key').value.trim();
  if (!key) { showToast('Enter Gemini API key first', 'warning'); return; }
  // Save key first then test
  await apiFetch('/settings', { method: 'PUT', body: { gemini_api_key: key } });
  const resultEl = document.getElementById('aiTestResult');
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<span style="color:var(--text-muted);">Testing connection...</span>';
  const data = await apiFetch('/ai/chat', { method: 'POST', body: { message: 'Say: AI connection test successful!' } });
  if (data?.success && data.data?.reply) {
    resultEl.innerHTML = `<span style="color:var(--green);">✅ Connected! Response: "${data.data.reply.substring(0,80)}..."</span>`;
  } else {
    resultEl.innerHTML = `<span style="color:var(--red);">❌ Failed: ${data?.message || 'Could not connect to Gemini API'}</span>`;
  }
}

async function downloadBackup() {
  const token = getToken();
  const a = document.createElement('a');
  a.href = `/api/backup/download?token=${token}`;
  a.download = `enqova_backup_${todayISO()}.db`;
  a.click();
  showToast('Backup downloading...', 'success');
}

async function exportJSON() {
  const data = await apiFetch('/backup/export-json');
  if (!data?.success) { showToast('Export failed', 'error'); return; }
  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `enqova_export_${todayISO()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('JSON export ready', 'success');
}

async function restoreBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!await confirmDialog('⚠️ Restore will REPLACE all data. Are you sure?')) return;
  const formData = new FormData();
  formData.append('backup', file);
  const data = await apiFetch('/backup/restore', { method: 'POST', body: formData, headers: {} });
  if (data?.success) { showToast('Database restored! Please refresh.', 'success'); setTimeout(() => window.location.reload(), 2000); }
  else showToast(data?.message || 'Restore failed', 'error');
}

async function changePassword() {
  const current = document.getElementById('cp_current').value;
  const newPw = document.getElementById('cp_new').value;
  const confirm = document.getElementById('cp_confirm').value;
  if (!current || !newPw) { showToast('All fields required', 'error'); return; }
  if (newPw !== confirm) { showToast('Passwords do not match', 'error'); return; }
  if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  const data = await apiFetch('/auth/change-password', { method: 'POST', body: { current_password: current, new_password: newPw } });
  if (data?.success) { showToast('Password changed!', 'success'); document.getElementById('cp_current').value = ''; document.getElementById('cp_new').value = ''; document.getElementById('cp_confirm').value = ''; }
  else showToast(data?.message || 'Failed', 'error');
}
