/* ═══════════════════════════════════════════════════════
   shopBorrow.js - Shop Borrow Records Module
   ═══════════════════════════════════════════════════════ */

let sbPage = 1, sbFilters = {};

async function renderShopBorrow() {
  const content = document.getElementById('pageContent');
  sbPage = 1; sbFilters = {};

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="font-size:1.1rem;font-weight:700"><i class="fas fa-box"></i> Shop Borrow Records</h2>
      <div class="flex-gap">
        <button class="btn btn-outline btn-sm" onclick="exportToPDF('shop-borrow')"><i class="fas fa-file-pdf"></i> Export PDF</button>
        <button class="btn btn-primary" onclick="openAddBorrowModal()"><i class="fas fa-plus"></i> Add Borrow</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label>Status</label>
        <select id="sbStatusFilter" onchange="applySBFilters()">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>
      <div class="form-group">
        <label>Search (Name/Phone)</label>
        <input type="text" id="sbSearch" placeholder="Search..." oninput="debounceSBSearch()" />
      </div>
      <div class="form-group">
        <label>From Date</label>
        <input type="date" id="sbStartDate" onchange="applySBFilters()" />
      </div>
      <div class="form-group">
        <label>To Date</label>
        <input type="date" id="sbEndDate" onchange="applySBFilters()" />
      </div>
      <button class="btn btn-outline btn-sm" onclick="resetSBFilters()">↺ Reset</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div id="sbTableWrapper"><div class="loading-spinner"><div class="spinner"></div></div></div>
      <div id="sbPagination" style="padding:16px;border-top:1px solid var(--border-color)"></div>
    </div>`;

  await loadSBRecords();
}

let sbSearchTimeout;
function debounceSBSearch() {
  clearTimeout(sbSearchTimeout);
  sbSearchTimeout = setTimeout(applySBFilters, 400);
}

function applySBFilters() {
  sbFilters = {};
  const status = document.getElementById('sbStatusFilter')?.value;
  const search = document.getElementById('sbSearch')?.value;
  const start = document.getElementById('sbStartDate')?.value;
  const end = document.getElementById('sbEndDate')?.value;
  if (status) sbFilters.status = status;
  if (search) sbFilters.search = search;
  if (start) sbFilters.startDate = start;
  if (end) sbFilters.endDate = end;
  sbPage = 1;
  loadSBRecords();
}

function resetSBFilters() {
  sbFilters = {}; sbPage = 1;
  ['sbStatusFilter','sbSearch','sbStartDate','sbEndDate'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  loadSBRecords();
}

async function loadSBRecords() {
  const wrapper = document.getElementById('sbTableWrapper');
  if (!wrapper) return;

  const params = new URLSearchParams({ page: sbPage, limit: 10, ...sbFilters });
  try {
    const data = await apiFetch(`/shop-borrow?${params}`);
    const records = data.data;

    if (records.length === 0) {
      wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-box"></i></span><h3>No borrow records found</h3><p>Start by adding a borrow record.</p></div>`;
      document.getElementById('sbPagination').innerHTML = '';
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>From (Lender)</th>
              <th>Phone</th>
              <th>Items</th>
              <th>Total</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td>${((sbPage - 1) * 10) + i + 1}</td>
                <td><strong>${r.fromName}</strong></td>
                <td>${r.phone}</td>
                <td>
                  <span title="${r.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}" style="cursor:pointer;color:var(--accent);">
                    ${r.items.length} item(s) <i class="fas fa-circle-info"></i>
                  </span>
                </td>
                <td><strong>${formatCurrency(r.totalAmount)}</strong></td>
                <td>${formatDate(r.createdAt)}</td>
                <td>${formatDate(r.dueDate)}</td>
                <td>${getStatusBadge(r.status)}</td>
                <td>
                  <div class="action-btns">
                    ${r.status !== 'Paid' ? `<button class="btn btn-success btn-sm" onclick="markSBPaid('${r._id}')"><i class="fas fa-circle-check"></i> Paid</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="openEditBorrowModal(${encodeRecord(r)})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSBRecord('${r._id}')"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    renderPagination('sbPagination', data.page, data.pages, (p) => { sbPage = p; loadSBRecords(); });

  } catch (err) {
    wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>${err.message}</h3></div>`;
  }
}

// ─── Add Borrow Modal ─────────────────────────────────────
function openAddBorrowModal() {
  openModal('Add Shop Borrow Record', `
    <form onsubmit="saveBorrowRecord(event)">
      <div class="form-row">
        <div class="form-group"><label>Lender Name *</label><input type="text" id="sbFromName" required placeholder="Ahmed Khan" /></div>
        <div class="form-group"><label>Lender Phone *</label><input type="tel" id="sbPhone" required placeholder="03001234567" /></div>
      </div>
      <label style="font-weight:600;font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;display:block;">Items *</label>
      <div id="itemsContainer">${buildItemRows()}</div>
      <button type="button" class="add-item-btn" onclick="addItemRow()">+ Add Item</button>
      <div class="total-display"><span class="label">Total Amount</span><span class="value" id="totalDisplay">Rs. 0</span></div>
      <div class="form-group">
        <label>Return Due Date *</label>
        <input type="date" id="sbDueDate" required min="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea id="sbNotes" rows="2" placeholder="Any notes..."></textarea>
      </div>
      <div class="flex-gap mt-16">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Save Record</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>`);
}

async function saveBorrowRecord(e) {
  e.preventDefault();
  const items = collectItems();
  if (!items.length) { showToast('Add at least one item', 'warning'); return; }
  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
  const payload = {
    fromName: document.getElementById('sbFromName').value.trim(),
    phone: document.getElementById('sbPhone').value.trim(),
    items, totalAmount,
    dueDate: document.getElementById('sbDueDate').value,
    notes: document.getElementById('sbNotes')?.value || ''
  };
  try {
    await apiFetch('/shop-borrow', { method: 'POST', body: JSON.stringify(payload) });
    closeModal(); showToast('Borrow record added!', 'success'); await renderShopBorrow();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Edit Borrow Modal ────────────────────────────────────
function openEditBorrowModal(encodedRecord) {
  const r = JSON.parse(decodeURIComponent(encodedRecord));
  openModal('Edit Borrow Record', `
    <form onsubmit="updateBorrowRecord(event,'${r._id}')">
      <div class="form-row">
        <div class="form-group"><label>Lender Name *</label><input type="text" id="sbFromName" value="${escHtml(r.fromName)}" required /></div>
        <div class="form-group"><label>Lender Phone *</label><input type="tel" id="sbPhone" value="${r.phone}" required /></div>
      </div>
      <label style="font-weight:600;font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;display:block;">Items *</label>
      <div id="itemsContainer">${buildItemRows(r.items)}</div>
      <button type="button" class="add-item-btn" onclick="addItemRow()">+ Add Item</button>
      <div class="total-display"><span class="label">Total</span><span class="value" id="totalDisplay">${formatCurrency(r.totalAmount)}</span></div>
      <div class="form-group">
        <label>Return Due Date *</label>
        <input type="date" id="sbDueDate" value="${r.dueDate?.split('T')[0] || ''}" required />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="sbNotes" rows="2">${r.notes || ''}</textarea>
      </div>
      <div class="flex-gap mt-16">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Update</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>`);
}

async function updateBorrowRecord(e, id) {
  e.preventDefault();
  const items = collectItems();
  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
  const payload = {
    fromName: document.getElementById('sbFromName').value.trim(),
    phone: document.getElementById('sbPhone').value.trim(),
    items, totalAmount,
    dueDate: document.getElementById('sbDueDate').value,
    notes: document.getElementById('sbNotes')?.value || ''
  };
  try {
    await apiFetch(`/shop-borrow/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    closeModal(); showToast('Record updated!', 'success'); await renderShopBorrow();
  } catch (err) { showToast(err.message, 'error'); }
}

async function markSBPaid(id) {
  if (!confirm('Mark this borrow as Paid?')) return;
  try {
    await apiFetch(`/shop-borrow/${id}/paid`, { method: 'PATCH' });
    showToast('Marked as Paid <i class="fas fa-circle-check"></i>', 'success'); await renderShopBorrow();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteSBRecord(id) {
  if (!confirm('Delete this borrow record?')) return;
  try {
    await apiFetch(`/shop-borrow/${id}`, { method: 'DELETE' });
    showToast('Record deleted', 'success'); await renderShopBorrow();
  } catch (err) { showToast(err.message, 'error'); }
}
