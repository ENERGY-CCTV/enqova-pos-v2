/* ═══════════════════════════════════════════════
   ENQOVA POS - Global App Utilities
   All pages include this script
   ═══════════════════════════════════════════════ */

const API_BASE = '/api';

// ─── THEME INIT ───
(function initTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  if (theme === 'light') document.documentElement.classList.add('light-theme');
})();

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// ─── AUTH ───
const TOKEN_KEY = 'enqova_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getUser() { try { return JSON.parse(atob(getToken().split('.')[1])); } catch { return {}; } }
function requireAuth() { if (!getToken()) { location.href = '/index.html'; return false; } return true; }
function logout() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('enqova_user'); location.href = '/index.html'; }

// Alias functions used by older HTML pages
function initUserInfo() { updateSidebarUser(); }
function setActiveNav() { setActiveSidebarItem(); }

// ─── API FETCH ───
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  try {
    const resp = await fetch(API_BASE + endpoint, {
      method: options.method || 'GET',
      headers,
      body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined
    });
    const data = await resp.json();
    if (resp.status === 401) { logout(); return null; }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    showToast('Network error. Please check connection.', 'error');
    return null;
  }
}

// ─── TOAST ───
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ─── MODAL ───
function openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('active'); m.setAttribute('aria-hidden', 'false'); } }
function closeModal(id) { const m = document.getElementById(id); if (m) { m.classList.remove('active'); m.setAttribute('aria-hidden', 'true'); } }

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});
// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id)); }
});

// ─── FORMAT ───
function formatCurrency(amount) {
  const n = parseFloat(amount) || 0;
  return 'Rs. ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

// ─── CONFIRM DIALOG ───
function confirmDialog(message) {
  return new Promise(resolve => {
    // Remove existing dialog
    const existing = document.getElementById('confirm-dialog');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'confirm-dialog';
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;text-align:center;">
        <div style="font-size:28px;margin-bottom:12px;">⚠️</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Confirm Action</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:24px;line-height:1.5;">${message}</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="confirm-no" class="btn btn-secondary">Cancel</button>
          <button id="confirm-yes" class="btn btn-danger">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
    document.getElementById('confirm-no').onclick = () => { overlay.remove(); resolve(false); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

// ─── PAGINATION ───
function createPagination(total, current, limit, fnName) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return '';
  let html = '';
  if (current > 1) html += `<button class="page-btn" onclick="${fnName}(${current - 1})">‹</button>`;
  const start = Math.max(1, current - 2);
  const end = Math.min(pages, current + 2);
  if (start > 1) html += `<button class="page-btn" onclick="${fnName}(1)">1</button>${start > 2 ? '<span style="color:var(--text-muted);padding:0 4px;">…</span>' : ''}`;
  for (let i = start; i <= end; i++) html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${fnName}(${i})">${i}</button>`;
  if (end < pages) html += `${end < pages - 1 ? '<span style="color:var(--text-muted);padding:0 4px;">…</span>' : ''}<button class="page-btn" onclick="${fnName}(${pages})">${pages}</button>`;
  if (current < pages) html += `<button class="page-btn" onclick="${fnName}(${current + 1})">›</button>`;
  html += `<span style="font-size:11px;color:var(--text-muted);margin-left:8px;">${total} total</span>`;
  return html;
}

// ─── CSV EXPORT ───
function exportTableToCSV(tbodyId, filename) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const table = tbody.closest('table');
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
  const rows = Array.from(tbody.querySelectorAll('tr')).map(tr =>
    Array.from(tr.querySelectorAll('td')).map(td => `"${td.textContent.trim().replace(/"/g, '""')}"`)
  );
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!', 'success');
}

// ─── SIDEBAR ACTIVE STATE ───
function setActiveSidebarItem() {
  const page = location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href.includes(page) || (page === '' && href === 'dashboard.html')) {
      item.classList.add('active');
    }
  });
}

// ─── SIDEBAR USER INFO ───
function updateSidebarUser() {
  const user = getUser();
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  const branchEl = document.getElementById('headerBranch');
  if (nameEl) nameEl.textContent = user.full_name || user.username || 'User';
  if (roleEl) roleEl.textContent = user.role || 'staff';
  if (avatarEl) avatarEl.textContent = (user.full_name || user.username || 'U')[0].toUpperCase();
  if (branchEl) branchEl.textContent = user.branch_name || 'All Branches';
  // Hide admin-only elements for non-admins
  if (user.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
}

// ─── AI CHAT PANEL ───
let aiMessages = [];
function toggleAIPanel() {
  const w = document.getElementById('aiChatWindow');
  if (w) w.classList.toggle('open');
}

async function sendAIMessage(event) {
  if (event && event.key !== 'Enter') return;
  const input = document.getElementById('aiInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  addAIMsg(msg, 'user');
  const data = await apiFetch('/ai/chat', { method: 'POST', body: { message: msg } });
  if (data?.success) addAIMsg(data.data.reply, 'assistant');
  else addAIMsg(data?.message || 'AI unavailable. Configure Gemini API key in Settings.', 'assistant');
}

function addAIMsg(text, role) {
  const container = document.getElementById('aiMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendAIQuick(text) {
  const input = document.getElementById('aiInput');
  if (input) { input.value = text; sendAIMessage(null); }
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  const isLoginPage = path === '/' || path === '/index.html' || path.endsWith('index.html');
  if (!isLoginPage) requireAuth();
  setActiveSidebarItem();
  updateSidebarUser();
  if (!isLoginPage) startIdleTimer();
});

// ─── AUTO LOGOUT (5 min inactivity) ───
const IDLE_TIMEOUT_MS  = 5 * 60 * 1000;   // 5 minutes
const IDLE_WARN_MS     = 30 * 1000;        // warn 30 s before logout
let idleTimer, warnTimer, warnToastEl;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  // Remove warning toast if it was shown
  if (warnToastEl) { warnToastEl.remove(); warnToastEl = null; }

  // Set warning at (IDLE_TIMEOUT_MS - IDLE_WARN_MS)
  warnTimer = setTimeout(() => {
    let secs = IDLE_WARN_MS / 1000;
    // Create persistent warning toast
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    warnToastEl = document.createElement('div');
    warnToastEl.className = 'toast warning';
    warnToastEl.style.cssText = 'opacity:1;transform:none;transition:none;background:rgba(255,71,87,0.95);';
    warnToastEl.innerHTML = `<span>⚠️</span><span id="idleCountdown">Logging out in ${secs}s due to inactivity...</span>`;
    container.appendChild(warnToastEl);
    const countdown = setInterval(() => {
      secs--;
      const el = document.getElementById('idleCountdown');
      if (el) el.textContent = `Logging out in ${secs}s due to inactivity...`;
      if (secs <= 0) clearInterval(countdown);
    }, 1000);
  }, IDLE_TIMEOUT_MS - IDLE_WARN_MS);

  // Auto-logout after full idle time
  idleTimer = setTimeout(() => {
    logout();
  }, IDLE_TIMEOUT_MS);
}

function startIdleTimer() {
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  events.forEach(ev => document.addEventListener(ev, resetIdleTimer, { passive: true }));
  resetIdleTimer(); // start immediately
}
