/* ═══════════════════════════════════════════════════════
   app.js - Core App: Router, API Wrapper, Utilities
   ═══════════════════════════════════════════════════════ */

// ─── Constants ────────────────────────────────────────────
const API_BASE = '/api';

// ─── Token & User Management ──────────────────────────────
const getToken = () => localStorage.getItem('udhar_token');
const setToken = (t) => localStorage.setItem('udhar_token', t);
const removeToken = () => localStorage.removeItem('udhar_token');
const getUser = () => { try { return JSON.parse(localStorage.getItem('udhar_user')); } catch { return null; } };
const setUser = (u) => localStorage.setItem('udhar_user', JSON.stringify(u));
const removeUser = () => localStorage.removeItem('udhar_user');

// ─── API Fetch Wrapper ────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
  const icons = {
    success: '<i class="fas fa-circle-check"></i>',
    error:   '<i class="fas fa-circle-xmark"></i>',
    warning: '<i class="fas fa-triangle-exclamation"></i>',
    info:    '<i class="fas fa-circle-info"></i>'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '<i class="fas fa-comment"></i>'}</span><span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.35s ease';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ─── Modal Helpers ────────────────────────────────────────
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').innerHTML = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── Format Helpers ───────────────────────────────────────
const formatDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const formatDateTime = (d) => d
  ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';
const formatCurrency = (n) => `Rs. ${(n || 0).toLocaleString('en-PK')}`;

// Escape HTML to prevent XSS
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Status badge builder
function getStatusBadge(status) {
  const cls = { Paid: 'status-paid', Pending: 'status-pending', Overdue: 'status-overdue' };
  const icons = {
    Paid:    '<i class="fas fa-circle-check"></i>',
    Pending: '<i class="fas fa-clock"></i>',
    Overdue: '<i class="fas fa-circle-exclamation"></i>'
  };
  return `<span class="status-badge ${cls[status] || ''}">${icons[status] || ''} ${status}</span>`;
}

// Get initials from name for avatar
function getInitials(name) {
  if (!name) return 'S';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Sidebar ──────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
  document.body.style.overflow = '';
}
// Legacy alias for any existing click handlers
function toggleSidebar() {
  const isOpen = document.getElementById('sidebar').classList.contains('open');
  isOpen ? closeSidebar() : openSidebar();
}

// ─── Dark Mode ────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeIcon').innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  localStorage.setItem('udhar_theme', isDark ? 'light' : 'dark');
}

function applyTheme() {
  const saved = localStorage.getItem('udhar_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

// ─── Hash-based Client Router ─────────────────────────────
const routes = {
  dashboard: () => renderDashboard(),
  customers: () => renderCustomers(),
  'customer-udhar': () => renderCustomerUdhar(),
  'shop-borrow': () => renderShopBorrow(),
  sales: () => renderSales(),
  notifications: () => renderNotifications(),
  profile: () => renderProfile()
};

const pageTitles = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  'customer-udhar': 'Customer Udhar',
  'shop-borrow': 'Shop Borrow',
  sales: 'Sales & Receipts',
  notifications: 'Notifications',
  profile: 'My Profile'
};

async function navigate(page) {
  if (!page || !routes[page]) page = 'dashboard';

  // Update active nav link
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // Update page title
  document.getElementById('pageTitle').textContent = pageTitles[page] || 'Dashboard';


  // Show loading state
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';

  // Render page
  try {
    await routes[page]();
  } catch (err) {
    console.error('Page render error:', err);
    content.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>Error loading page</h3><p>${err.message}</p></div>`;
  }

  // Close sidebar on mobile after navigation
  closeSidebar();
}

// Handle hash changes
window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#', '') || 'dashboard';
  navigate(page);
});

// ─── Logout ───────────────────────────────────────────────
function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  removeToken(); removeUser();
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authOverlay').classList.remove('hidden');
  location.hash = '';
  showToast('Logged out successfully', 'info');
}

// ─── Notification Badge ───────────────────────────────────
async function refreshNotifBadge() {
  try {
    const data = await apiFetch('/notifications');
    const badge = document.getElementById('notifBadge');
    if (data.unreadCount > 0) {
      badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

// ─── Populate User UI ─────────────────────────────────────
function populateUserUI(user) {
  const initials = getInitials(user.name);
  const shopName = user.shopName || user.name || 'My Shop';

  // Helper: build avatar HTML (picture or initials)
  function avatarHTML(size) {
    if (user.profilePicture) {
      return `<img src="${user.profilePicture}" alt="Avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;" />`;
    }
    return initials;
  }

  // Sidebar
  const shopNameEl = document.getElementById('sidebarShopName');
  if (shopNameEl) shopNameEl.textContent = shopName;
  const sidebarUserName = document.getElementById('sidebarUserName');
  if (sidebarUserName) sidebarUserName.textContent = user.name;
  const sidebarAvatar = document.getElementById('sidebarUserAvatar');
  if (sidebarAvatar) {
    if (user.profilePicture) {
      sidebarAvatar.innerHTML = avatarHTML(36);
      sidebarAvatar.style.padding = '0';
      sidebarAvatar.style.background = 'transparent';
    } else {
      sidebarAvatar.textContent = initials;
      sidebarAvatar.style.padding = '';
      sidebarAvatar.style.background = '';
    }
  }

  // Header
  const greeting = document.getElementById('userGreeting');
  if (greeting) greeting.innerHTML = `<i class="fas fa-circle-user" style="margin-right:4px;"></i>${user.name.split(' ')[0]}`;
  const headerAvatar = document.getElementById('headerUserAvatar');
  if (headerAvatar) {
    if (user.profilePicture) {
      headerAvatar.innerHTML = avatarHTML(36);
      headerAvatar.style.padding = '0';
      headerAvatar.style.background = 'transparent';
    } else {
      headerAvatar.textContent = initials;
      headerAvatar.style.padding = '';
      headerAvatar.style.background = '';
    }
  }
}

// ─── App Init ─────────────────────────────────────────────
function initApp() {
  applyTheme();
  const token = getToken();
  const user = getUser();

  if (token && user) {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    populateUserUI(user);

    const page = location.hash.replace('#', '') || 'dashboard';
    navigate(page);
    refreshNotifBadge();
    setInterval(refreshNotifBadge, 60000);
  } else {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
