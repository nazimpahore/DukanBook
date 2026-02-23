/* ═══════════════════════════════════════════════════════
   notifications.js - Notifications Module
   ═══════════════════════════════════════════════════════ */

async function renderNotifications() {
  const content = document.getElementById('pageContent');

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-bell"></i> Notifications & Reminders</h3>
        <button class="btn btn-outline btn-sm" onclick="markAllNotifsRead()"><i class="fas fa-check"></i> Mark All Read</button>
      </div>
      <div id="notifList"><div class="loading-spinner"><div class="spinner"></div></div></div>
    </div>`;

  await loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  try {
    const data = await apiFetch('/notifications');
    const notifications = data.data;

    if (notifications.length === 0) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-bell"></i></span><h3>No notifications yet</h3><p>Reminder notifications will appear here when payments are due.</p></div>`;
      return;
    }

    const typeIcons = {
      DueToday: '<i class="fas fa-triangle-exclamation"></i>',
      Overdue:  '<i class="fas fa-circle-xmark"></i>',
      Reminder: '<i class="fas fa-bell"></i>'
    };

    list.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.isRead ? '' : 'unread'}" onclick="markNotifRead('${n._id}',this)">
        <div class="notif-icon">${typeIcons[n.type] || '<i class="fas fa-bell"></i>'}</div>
        <div class="notif-content">
          <div class="notif-message">${n.message}</div>
          <div class="notif-time">
            ${formatDateTime(n.createdAt)}
            ${!n.isRead ? '<span style="color:var(--accent);font-weight:700;margin-left:8px;">● New</span>' : ''}
          </div>
        </div>
        ${n.recordType === 'CustomerUdhar' ? `<a href="#customer-udhar" style="color:var(--accent);font-size:0.8rem;white-space:nowrap;padding:4px 8px;border-radius:6px;border:1px solid var(--border-color);">View</a>` : ''}
        ${n.recordType === 'ShopBorrow' ? `<a href="#shop-borrow" style="color:var(--accent);font-size:0.8rem;white-space:nowrap;padding:4px 8px;border-radius:6px;border:1px solid var(--border-color);">View</a>` : ''}
      </div>`).join('');

  } catch (err) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>${err.message}</h3></div>`;
  }
}

async function markNotifRead(id, el) {
  if (el && !el.classList.contains('unread')) return;
  try {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    if (el) el.classList.remove('unread');
    refreshNotifBadge();
  } catch {}
}

async function markAllNotifsRead() {
  try {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    showToast('All notifications marked as read', 'success');
    await loadNotifications();
    refreshNotifBadge();
  } catch (err) { showToast(err.message, 'error'); }
}
