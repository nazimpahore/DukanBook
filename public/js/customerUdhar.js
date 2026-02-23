/* ═══════════════════════════════════════════════════════
   customerUdhar.js - Customer Credit Records Module
   ═══════════════════════════════════════════════════════ */

let cuPage = 1, cuFilters = {};

async function renderCustomerUdhar() {
  const content = document.getElementById('pageContent');
  cuPage = 1; cuFilters = {};

  // Fetch customers for dropdown
  let customers = [];
  try { const r = await apiFetch('/customers'); customers = r.data; } catch {}

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="font-size:1.1rem;font-weight:700"><i class="fas fa-credit-card"></i> Customer Udhar Records</h2>
      <div class="flex-gap">
        <button class="btn btn-outline btn-sm" onclick="exportToPDF('customer-udhar')"><i class="fas fa-file-pdf"></i> Export PDF</button>
        <button class="btn btn-primary" onclick="openAddUdharModal(${JSON.stringify(customers).replace(/"/g,'&quot;')})"><i class="fas fa-plus"></i> Add Udhar</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label>Status</label>
        <select id="cuStatusFilter" onchange="applyCUFilters()">
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>
      <div class="form-group">
        <label>Customer</label>
        <select id="cuCustomerFilter" onchange="applyCUFilters()">
          <option value="">All Customers</option>
          ${customers.map(c => `<option value="${c._id}">${escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>From Date</label>
        <input type="date" id="cuStartDate" onchange="applyCUFilters()" />
      </div>
      <div class="form-group">
        <label>To Date</label>
        <input type="date" id="cuEndDate" onchange="applyCUFilters()" />
      </div>
      <button class="btn btn-outline btn-sm" onclick="resetCUFilters()">↺ Reset</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div id="cuTableWrapper"><div class="loading-spinner"><div class="spinner"></div></div></div>
      <div id="cuPagination" style="padding:16px;border-top:1px solid var(--border-color);"></div>
    </div>`;

  await loadCURecords(customers);
}

// ─── Status badge with partial-paid support ─────────────
function getCUStatusBadge(r) {
  const status = r.status;
  const pct = r.totalAmount > 0 ? Math.round(((r.paidAmount || 0) / r.totalAmount) * 100) : 0;
  if (status === 'Paid') return '<span class="status-badge status-paid"><i class="fas fa-circle-check"></i> Paid</span>';
  if (status === 'PartialPaid') return `<span class="status-badge status-partial"><i class="fas fa-money-bill-wave"></i> Partial (${pct}%)</span>`;
  if (status === 'Overdue') return '<span class="status-badge status-overdue"><i class="fas fa-triangle-exclamation"></i> Overdue</span>';
  return '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>';
}

async function loadCURecords(customers) {
  const wrapper = document.getElementById('cuTableWrapper');
  if (!wrapper) return;

  const params = new URLSearchParams({ page: cuPage, limit: 10, ...cuFilters });
  try {
    const data = await apiFetch(`/customer-udhar?${params}`);
    const records = data.data;

    if (records.length === 0) {
      wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-credit-card"></i></span><h3>No udhar records found</h3><p>Add a new udhar record to get started.</p></div>`;
      document.getElementById('cuPagination').innerHTML = '';
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td>${((cuPage - 1) * 10) + i + 1}</td>
                <td>
                  <strong>${r.customer?.name || 'Unknown'}</strong><br>
                  <small style="color:var(--text-muted)">${r.customer?.phone || ''}</small>
                  ${r.carriedForwardFrom ? '<br><span class="cu-badge-cf">↩ Carried Fwd</span>' : ''}
                </td>
                <td>
                  <span title="${r.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}" style="cursor:pointer;color:var(--accent);">
                    ${r.items.length} item(s) <i class="fas fa-circle-info"></i>
                  </span>
                </td>
                <td><strong>${formatCurrency(r.totalAmount)}</strong></td>
                <td style="color:var(--green);font-weight:600">${formatCurrency(r.paidAmount || 0)}</td>
                <td style="color:${(r.remainingAmount || 0) > 0 ? 'var(--red)' : 'var(--green)'};font-weight:700">${formatCurrency(r.remainingAmount || 0)}</td>
                <td>${formatDate(r.dueDate)}</td>
                <td>${getCUStatusBadge(r)}</td>
                <td>
                  <div class="action-btns">
                    ${r.status !== 'Paid' ? `<button class="btn btn-success btn-sm" onclick="openPaymentModal('${r._id}', ${r.totalAmount}, ${r.paidAmount || 0}, '${encodeURIComponent(r.customer?.name || '')}')"><i class="fas fa-money-bill-wave"></i> Pay</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="viewUdharSlip('${r._id}')"><i class="fas fa-print"></i> Slip</button>
                    <button class="btn btn-outline btn-sm" onclick="openEditUdharModal(${encodeRecord(r)}, ${JSON.stringify(customers || []).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCURecord('${r._id}')"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    // Pagination
    renderPagination('cuPagination', data.page, data.pages, (p) => { cuPage = p; loadCURecords(customers); });

  } catch (err) {
    wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>${err.message}</h3></div>`;
  }
}

function applyCUFilters() {
  cuFilters = {};
  const status = document.getElementById('cuStatusFilter')?.value;
  const customer = document.getElementById('cuCustomerFilter')?.value;
  const start = document.getElementById('cuStartDate')?.value;
  const end = document.getElementById('cuEndDate')?.value;
  if (status) cuFilters.status = status;
  if (customer) cuFilters.customerId = customer;
  if (start) cuFilters.startDate = start;
  if (end) cuFilters.endDate = end;
  cuPage = 1;
  loadCURecords();
}

function resetCUFilters() {
  cuFilters = {}; cuPage = 1;
  ['cuStatusFilter','cuCustomerFilter','cuStartDate','cuEndDate'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  loadCURecords();
}

// ─── Item Row Builder ─────────────────────────────────────
function buildItemRows(items = [{ itemName: '', quantity: 1, pricePerItem: 0 }]) {
  return items.map((item, i) => `
    <div class="item-row" id="itemRow_${i}">
      <div class="form-group"><label>${i === 0 ? 'Item Name' : ''}</label><input type="text" name="itemName" value="${escHtml(item.itemName || '')}" placeholder="Item name" required /></div>
      <div class="form-group"><label>${i === 0 ? 'Qty' : ''}</label><input type="number" name="quantity" value="${item.quantity || 1}" min="1" required oninput="recalcTotal()" /></div>
      <div class="form-group"><label>${i === 0 ? 'Price/Unit' : ''}</label><input type="number" name="pricePerItem" value="${item.pricePerItem || 0}" min="0" step="0.01" required oninput="recalcTotal()" /></div>
      <button type="button" class="remove-item-btn" onclick="removeItemRow(this)"><i class="fas fa-xmark"></i></button>
    </div>`).join('');
}

function addItemRow() {
  const container = document.getElementById('itemsContainer');
  const idx = container.querySelectorAll('.item-row').length;
  const div = document.createElement('div');
  div.innerHTML = buildItemRows([{ itemName: '', quantity: 1, pricePerItem: 0 }]).replace(/id="itemRow_0"/, `id="itemRow_${idx}"`);
  container.appendChild(div.firstElementChild);
}

function removeItemRow(btn) {
  const rows = document.querySelectorAll('.item-row');
  if (rows.length <= 1) { showToast('At least one item required', 'warning'); return; }
  btn.closest('.item-row').remove();
  recalcTotal();
}

function recalcTotal() {
  let total = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('[name="quantity"]')?.value) || 0;
    const price = parseFloat(row.querySelector('[name="pricePerItem"]')?.value) || 0;
    total += qty * price;
  });
  const el = document.getElementById('totalDisplay');
  if (el) el.textContent = formatCurrency(total);
}

function collectItems() {
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const itemName = row.querySelector('[name="itemName"]')?.value.trim();
    const quantity = parseFloat(row.querySelector('[name="quantity"]')?.value) || 0;
    const pricePerItem = parseFloat(row.querySelector('[name="pricePerItem"]')?.value) || 0;
    if (itemName) items.push({ itemName, quantity, pricePerItem, subtotal: quantity * pricePerItem });
  });
  return items;
}

// ─── Add Udhar Modal ──────────────────────────────────────
function openAddUdharModal(customers) {
  if (!customers || customers.length === 0) {
    showToast('Please add a customer first!', 'warning');
    navigate('customers');
    return;
  }
  openModal('Add Customer Udhar', `
    <form onsubmit="saveUdharRecord(event)">
      <div class="form-group">
        <label>Select Customer *</label>
        <select id="udharCustomer" required>
          <option value="">-- Select Customer --</option>
          ${customers.map(c => `<option value="${c._id}">${escHtml(c.name)} (${c.phone})</option>`).join('')}
        </select>
      </div>
      <label style="font-weight:600;font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;display:block;">Items *</label>
      <div id="itemsContainer">${buildItemRows()}</div>
      <button type="button" class="add-item-btn" onclick="addItemRow()">+ Add Item</button>
      <div class="total-display"><span class="label">Total Amount</span><span class="value" id="totalDisplay">Rs. 0</span></div>
      <div class="form-group">
        <label>Return Due Date *</label>
        <input type="date" id="udharDueDate" required min="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea id="udharNotes" rows="2" placeholder="Any notes..."></textarea>
      </div>
      <div class="flex-gap mt-16">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Save Record</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>`);
}

async function saveUdharRecord(e) {
  e.preventDefault();
  const items = collectItems();
  if (!items.length) { showToast('Add at least one item', 'warning'); return; }
  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
  const payload = {
    customer: document.getElementById('udharCustomer').value,
    items,
    totalAmount,
    dueDate: document.getElementById('udharDueDate').value,
    notes: document.getElementById('udharNotes')?.value || ''
  };
  try {
    await apiFetch('/customer-udhar', { method: 'POST', body: JSON.stringify(payload) });
    closeModal();
    showToast('Udhar record added!', 'success');
    await renderCustomerUdhar();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Edit Udhar Modal ─────────────────────────────────────
function encodeRecord(r) {
  return `'${encodeURIComponent(JSON.stringify(r))}'`;
}

function openEditUdharModal(encodedRecord, customers) {
  const r = JSON.parse(decodeURIComponent(encodedRecord));
  openModal('Edit Udhar Record', `
    <form onsubmit="updateUdharRecord(event,'${r._id}')">
      <div class="form-group">
        <label>Customer</label>
        <select id="udharCustomer" required>
          ${customers.map(c => `<option value="${c._id}" ${c._id === (r.customer?._id || r.customer) ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <label style="font-weight:600;font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;display:block;">Items *</label>
      <div id="itemsContainer">${buildItemRows(r.items)}</div>
      <button type="button" class="add-item-btn" onclick="addItemRow()">+ Add Item</button>
      <div class="total-display"><span class="label">Total</span><span class="value" id="totalDisplay">${formatCurrency(r.totalAmount)}</span></div>
      <div class="form-group">
        <label>Return Due Date *</label>
        <input type="date" id="udharDueDate" value="${r.dueDate?.split('T')[0] || ''}" required />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="udharNotes" rows="2">${r.notes || ''}</textarea>
      </div>
      <div class="flex-gap mt-16">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Update</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>`);
}

async function updateUdharRecord(e, id) {
  e.preventDefault();
  const items = collectItems();
  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
  const payload = {
    customer: document.getElementById('udharCustomer').value,
    items, totalAmount,
    dueDate: document.getElementById('udharDueDate').value,
    notes: document.getElementById('udharNotes')?.value || ''
  };
  try {
    await apiFetch(`/customer-udhar/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    closeModal(); showToast('Record updated!', 'success'); await renderCustomerUdhar();
  } catch (err) { showToast(err.message, 'error'); }
}

async function markCUPaid(id) {
  if (!confirm('Mark entire remaining balance as Paid?')) return;
  try {
    await apiFetch(`/customer-udhar/${id}/paid`, { method: 'PATCH' });
    showToast('Marked as Paid ✅', 'success');
    closeModal();
    await renderCustomerUdhar();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Payment Modal ────────────────────────────────────────
function openPaymentModal(id, totalAmount, paidAmount, encodedName) {
  const customerName = decodeURIComponent(encodedName);
  const remaining = Math.max(0, totalAmount - paidAmount);

  openModal('💰 Record Payment', `
    <div class="pay-summary">
      <div class="pay-summary-row">
        <span>Customer</span>
        <strong>${escHtml(customerName)}</strong>
      </div>
      <div class="pay-summary-row">
        <span>Total Udhar</span>
        <strong>${formatCurrency(totalAmount)}</strong>
      </div>
      <div class="pay-summary-row">
        <span>Already Paid</span>
        <strong style="color:var(--green)">${formatCurrency(paidAmount)}</strong>
      </div>
      <div class="pay-summary-row pay-summary-remaining">
        <span>Remaining Balance</span>
        <strong style="color:var(--red)">${formatCurrency(remaining)}</strong>
      </div>
    </div>

    <form onsubmit="submitPartialPayment(event, '${id}', ${totalAmount}, ${remaining})">
      <div class="form-group">
        <label>Payment Amount (Rs.) *</label>
        <input type="number" id="payAmountInput" min="1" max="${remaining}" step="0.01"
          value="${remaining}" required
          oninput="updatePaymentPreview(${remaining})" />
      </div>
      <div id="paymentPreview" class="pay-preview"></div>
      <div class="form-group">
        <label>Note (optional)</label>
        <input type="text" id="payNoteInput" placeholder="e.g. Cash received" />
      </div>

      <!-- Carry Forward toggle (shown only when partial) -->
      <div class="pay-cf-wrap" id="payCFWrap" style="display:none">
        <label class="pay-cf-label">
          <input type="checkbox" id="payCarryForward" />
          <span>📆 Carry forward remaining balance to next month</span>
        </label>
        <div class="form-group" id="payCFDateWrap" style="display:none;margin-top:8px">
          <label>New Due Date</label>
          <input type="date" id="payCFDate" />
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:14px;">
        <button type="submit" class="btn btn-primary" id="paySubmitBtn" style="flex:1"><i class="fas fa-floppy-disk"></i> Save Payment</button>
        <button type="button" class="btn btn-success btn-sm" style="flex:0 0 auto;padding:0 16px"
          onclick="markCUPaid('${id}')"><i class="fas fa-circle-check"></i> Mark Fully Paid</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()" style="flex:0 0 auto;padding:0 14px">Cancel</button>
      </div>
    </form>
  `);

  // set up checkbox interaction
  setTimeout(() => {
    const input = document.getElementById('payAmountInput');
    const cfWrap = document.getElementById('payCFWrap');
    const cfCheck = document.getElementById('payCarryForward');
    const cfDateWrap = document.getElementById('payCFDateWrap');
    if (input) input.addEventListener('input', () => {
      const val = parseFloat(input.value) || 0;
      cfWrap.style.display = val < remaining ? 'block' : 'none';
    });
    if (cfCheck) cfCheck.addEventListener('change', () => {
      cfDateWrap.style.display = cfCheck.checked ? 'block' : 'none';
    });
    updatePaymentPreview(remaining);
  }, 50);
}

function updatePaymentPreview(remaining) {
  const input = document.getElementById('payAmountInput');
  const preview = document.getElementById('paymentPreview');
  const cfWrap = document.getElementById('payCFWrap');
  if (!input || !preview) return;
  const val = Math.min(parseFloat(input.value) || 0, remaining);
  const leftOver = Math.max(0, remaining - val);
  preview.innerHTML = leftOver > 0
    ? `<div class="pay-preview-row"><span>After this payment:</span> <strong style="color:var(--red)">${formatCurrency(leftOver)} still remaining</strong></div>`
    : `<div class="pay-preview-row" style="color:var(--green)"><span><i class="fas fa-circle-check"></i> This will fully clear the balance!</span></div>`;
  if (cfWrap) cfWrap.style.display = leftOver > 0 ? 'block' : 'none';
}

async function submitPartialPayment(e, id, totalAmount, remaining) {
  e.preventDefault();
  const btn = document.getElementById('paySubmitBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const amount = parseFloat(document.getElementById('payAmountInput').value);
  const note = document.getElementById('payNoteInput')?.value.trim() || '';
  const carryForward = document.getElementById('payCarryForward')?.checked;
  const newDueDate = document.getElementById('payCFDate')?.value;

  try {
    // 1. Record the partial payment
    const res = await apiFetch(`/customer-udhar/${id}/partial-payment`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, note })
    });
    showToast(res.message, 'success');

    // 2. If carry-forward was selected, create the new record
    if (carryForward && res.data.remainingAmount > 0) {
      const cfRes = await apiFetch(`/customer-udhar/${id}/carry-forward`, {
        method: 'POST',
        body: JSON.stringify({ newDueDate: newDueDate || '', note: `Carried forward. ${note}`.trim() })
      });
      showToast(cfRes.message, 'info');
    }

    closeModal();
    await renderCustomerUdhar();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Payment'; }
  }
}

async function deleteCURecord(id) {
  if (!confirm('Delete this udhar record?')) return;
  try {
    await apiFetch(`/customer-udhar/${id}`, { method: 'DELETE' });
    showToast('Record deleted', 'success');
    await renderCustomerUdhar();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Print Slip ─────────────────────────────────────────
function viewUdharSlip(id) {
  apiFetch(`/customer-udhar?page=1&limit=1000`).then(data => {
    const r = data.data.find(x => x._id === id);
    if (!r) { showToast('Record not found', 'error'); return; }
    const remaining = Math.max(0, r.totalAmount - (r.paidAmount || 0));
    const paymentsHTML = (r.payments && r.payments.filter(p => p.amount > 0).length)
      ? `<h3 style="margin-top:18px;border-bottom:1px solid #ccc;padding-bottom:6px">Payment History</h3>
         <table>
           <thead><tr><th>#</th><th>Amount</th><th>Date</th><th>Note</th></tr></thead>
           <tbody>
             ${r.payments.filter(p => p.amount > 0).map((p, i) =>
               `<tr><td>${i+1}</td><td style="color:green">Rs.${p.amount}</td><td>${new Date(p.date).toLocaleDateString()}</td><td>${p.note || '-'}</td></tr>`
             ).join('')}
           </tbody>
         </table>`
      : '';
    const slipWin = window.open('', '_blank', 'width=500,height=780');
    slipWin.document.write(`<!DOCTYPE html><html><head><title>Udhar Slip</title>
      <style>body{font-family:Arial;padding:30px;max-width:420px;margin:0 auto}h2{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}h3{font-size:14px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:8px;font-size:13px}th{background:#f0f0f0}.total{background:#e8f5e9;font-weight:bold}.remain{background:#fff3cd;font-weight:bold}.footer{text-align:center;margin-top:20px;font-size:12px;color:#666}.cf-tag{background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:10px;font-size:11px;display:inline-block;margin-bottom:8px}.shop-icon{font-size:1.6rem;color:#6366f1;vertical-align:middle;margin-right:6px;}</style></head>
      <body>
        <h2><span class="shop-icon">&#9962;</span> Udhar Slip</h2>
        ${r.carriedForwardFrom ? '<div style="text-align:center"><span class="cf-tag">↩ Carried Forward Balance</span></div>' : ''}
        <p><strong>Customer:</strong> ${r.customer?.name || 'N/A'}</p>
        <p><strong>Phone:</strong> ${r.customer?.phone || 'N/A'}</p>
        <p><strong>Date:</strong> ${formatDate(r.createdAt)} | <strong>Due:</strong> ${formatDate(r.dueDate)}</p>
        <p><strong>Status:</strong> ${r.status}</p>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
        <tbody>${r.items.map(it => `<tr><td>${it.itemName}</td><td>${it.quantity}</td><td>Rs.${it.pricePerItem}</td><td>Rs.${it.subtotal || it.quantity * it.pricePerItem}</td></tr>`).join('')}
        </tbody><tfoot>
          <tr class="total"><td colspan="3">TOTAL</td><td>Rs.${r.totalAmount}</td></tr>
          ${(r.paidAmount || 0) > 0 ? `<tr><td colspan="3" style="color:green;font-weight:bold">PAID</td><td style="color:green;font-weight:bold">Rs.${r.paidAmount}</td></tr>` : ''}
          ${remaining > 0 ? `<tr class="remain"><td colspan="3">REMAINING</td><td>Rs.${remaining}</td></tr>` : ''}
        </tfoot></table>
        ${r.notes ? `<p><strong>Notes:</strong> ${r.notes}</p>` : ''}
        ${paymentsHTML}
        <div class="footer"><p>Thank you for your business!</p></div>
        <script>window.print();window.onafterprint=()=>window.close();<\/script>
      </body></html>`);
    slipWin.document.close();
  }).catch(err => showToast(err.message, 'error'));
}

// ─── Export PDF ───────────────────────────────────────────
async function exportToPDF(type) {
  showToast('Preparing PDF preview...', 'info');
  try {
    const endpoint = type === 'customer-udhar' ? '/customer-udhar?limit=1000' : '/shop-borrow?limit=1000';
    const data = await apiFetch(endpoint);
    const records = data.data;
    const title = type === 'customer-udhar' ? 'Customer Udhar Records' : 'Shop Borrow Records';
    const pdfWin = window.open('', '_blank', 'width=900,height=700');
    pdfWin.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:Arial;padding:30px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #ccc;padding:7px;text-align:left}th{background:#6366f1;color:#fff}.paid{color:green}.pending{color:orange}.overdue{color:red}</style></head>
      <body><h1>${title}</h1><p>Generated: ${formatDateTime(new Date())}</p>
      <table><thead><tr>
        <th>#</th>${type === 'customer-udhar' ? '<th>Customer</th><th>Phone</th>' : '<th>From</th><th>Phone</th>'}
        <th>Items</th><th>Total</th><th>Date</th><th>Due Date</th><th>Status</th>
      </tr></thead><tbody>
        ${records.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${type === 'customer-udhar' ? (r.customer?.name || '') : r.fromName}</td>
          <td>${type === 'customer-udhar' ? (r.customer?.phone || '') : r.phone}</td>
          <td>${r.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}</td>
          <td>Rs.${r.totalAmount}</td>
          <td>${formatDate(r.createdAt)}</td>
          <td>${formatDate(r.dueDate)}</td>
          <td class="${r.status.toLowerCase()}">${r.status}</td>
        </tr>`).join('')}
      </tbody></table>
      <script>window.print();window.onafterprint=()=>window.close();<\/script></body></html>`);
    pdfWin.document.close();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Pagination Helper ────────────────────────────────────
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
  let html = `<div class="pagination">
    <button class="pagination-btn" onclick="(${onPageChange.toString()})(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>← Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="(${onPageChange.toString()})(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span style="color:var(--text-muted);padding:8px 4px">...</span>`;
    }
  }
  html += `<button class="pagination-btn" onclick="(${onPageChange.toString()})(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button></div>`;
  container.innerHTML = html;
}
