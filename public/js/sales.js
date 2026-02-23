/* ═══════════════════════════════════════════════════════
   sales.js – Cash Sales & Receipt Module
   ═══════════════════════════════════════════════════════ */

let salesPage = 1, salesFilters = {};

// ─── Main Page ────────────────────────────────────────────
async function renderSales() {
  const content = document.getElementById('pageContent');
  salesPage = 1; salesFilters = {};

  // Fetch customers for dropdown
  let customers = [];
  try { const r = await apiFetch('/customers'); customers = r.data; } catch {}

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2 style="font-size:1.1rem;font-weight:800;"><i class="fas fa-receipt"></i> Sales & Receipts</h2>
        <p style="font-size:0.78rem;color:var(--text-300);margin-top:2px;">Record hand-payment purchases and print receipts instantly</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-outline btn-sm" onclick="exportSalesPDF()"><i class="fas fa-file-pdf"></i> Export PDF</button>
        <button class="btn btn-primary" onclick="openNewSaleModal(${JSON.stringify(customers).replace(/"/g,'&quot;')})"><i class="fas fa-plus"></i> New Sale</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label>Customer</label>
        <select id="saleCustomerFilter" onchange="applySalesFilters()">
          <option value="">All Customers</option>
          ${customers.map(c => `<option value="${c._id}">${escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>From Date</label>
        <input type="date" id="saleStartDate" onchange="applySalesFilters()" />
      </div>
      <div class="form-group">
        <label>To Date</label>
        <input type="date" id="saleEndDate" onchange="applySalesFilters()" />
      </div>
      <button class="btn btn-outline btn-sm" onclick="resetSalesFilters()">↺ Reset</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div id="salesTableWrapper"><div class="loading-spinner"><div class="spinner"></div></div></div>
      <div id="salesPagination" style="padding:16px;border-top:1px solid var(--border);"></div>
    </div>`;

  await loadSales(customers);
}

async function loadSales(customers) {
  const wrapper = document.getElementById('salesTableWrapper');
  if (!wrapper) return;

  const params = new URLSearchParams({ page: salesPage, limit: 15, ...salesFilters });
  try {
    const data = await apiFetch(`/sales?${params}`);
    const sales = data.data;

    if (!sales.length) {
      wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-receipt"></i></span><h3>No sales recorded yet</h3><p>Click "+ New Sale" to record your first sale.</p></div>`;
      document.getElementById('salesPagination').innerHTML = '';
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Receipt</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Received</th>
              <th>Change</th>
              <th>Method</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map((s, i) => {
              const name = s.customer?.name || s.walkInName || 'Walk-in';
              const phone = s.customer?.phone || '—';
              return `
              <tr>
                <td>${((salesPage - 1) * 15) + i + 1}</td>
                <td><span class="receipt-num">${s.receiptNumber || '—'}</span></td>
                <td>
                  <strong>${escHtml(name)}</strong><br>
                  <small style="color:var(--text-300)">${escHtml(phone)}</small>
                </td>
                <td>
                  <span title="${s.items.map(it => `${it.itemName} x${it.quantity}`).join(', ')}"
                        style="cursor:pointer;color:var(--brand-1)">
                    ${s.items.length} item(s) <i class="fas fa-circle-info"></i>
                  </span>
                </td>
                <td><strong>${formatCurrency(s.totalAmount)}</strong>${s.discount > 0 ? `<br><small style="color:var(--green);font-size:0.72rem">-${formatCurrency(s.discount)} disc.</small>` : ''}</td>
                <td style="color:var(--green);font-weight:600">${formatCurrency(s.amountReceived)}</td>
                <td style="color:${s.changeReturned > 0 ? 'var(--yellow)' : 'var(--text-300)'};font-weight:600">${formatCurrency(s.changeReturned)}</td>
                <td><span class="sale-method-badge">${s.paymentMethod}</span></td>
                <td>${formatDateTime(s.createdAt)}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn btn-success btn-sm" onclick="viewReceipt('${s._id}')"><i class="fas fa-receipt"></i> Receipt</button>
                    <button class="btn btn-outline btn-sm" onclick="openEditSaleModal('${s._id}', ${JSON.stringify(customers).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSale('${s._id}')"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    renderSalesPagination(data.page, data.pages, customers);
  } catch (err) {
    wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>${err.message}</h3></div>`;
  }
}

function applySalesFilters() {
  salesFilters = {};
  const cust  = document.getElementById('saleCustomerFilter')?.value;
  const start = document.getElementById('saleStartDate')?.value;
  const end   = document.getElementById('saleEndDate')?.value;
  if (cust)  salesFilters.customerId = cust;
  if (start) salesFilters.startDate  = start;
  if (end)   salesFilters.endDate    = end;
  salesPage = 1;
  loadSales();
}

function resetSalesFilters() {
  salesFilters = {}; salesPage = 1;
  ['saleCustomerFilter','saleStartDate','saleEndDate'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  loadSales();
}

function renderSalesPagination(current, total, customers) {
  const container = document.getElementById('salesPagination');
  if (!container || total <= 1) { if (container) container.innerHTML = ''; return; }
  let html = `<div class="pagination">
    <button class="pagination-btn" onclick="salesPage=${current-1};loadSales()" ${current<=1?'disabled':''}>← Prev</button>`;
  for (let i = 1; i <= total; i++) {
    if (i===1||i===total||(i>=current-1&&i<=current+1))
      html += `<button class="pagination-btn ${i===current?'active':''}" onclick="salesPage=${i};loadSales()">${i}</button>`;
    else if (i===current-2||i===current+2)
      html += `<span style="padding:8px 4px;color:var(--text-300)">…</span>`;
  }
  html += `<button class="pagination-btn" onclick="salesPage=${current+1};loadSales()" ${current>=total?'disabled':''}>Next →</button></div>`;
  container.innerHTML = html;
}

// ─── Item Row Helpers (sale-specific) ─────────────────────
function buildSaleItemRows(items = [{ itemName:'', quantity:1, pricePerItem:0 }]) {
  return items.map((item, i) => `
    <div class="item-row" id="saleItemRow_${i}">
      <div class="form-group"><label>${i===0?'Item Name':''}</label>
        <input type="text" name="saleItemName" value="${escHtml(item.itemName||'')}" placeholder="Item name" required /></div>
      <div class="form-group"><label>${i===0?'Qty':''}</label>
        <input type="number" name="saleQty" value="${item.quantity||1}" min="1" required oninput="recalcSaleTotal()" /></div>
      <div class="form-group"><label>${i===0?'Price/Unit':''}</label>
        <input type="number" name="salePricePerItem" value="${item.pricePerItem||0}" min="0" step="0.01" required oninput="recalcSaleTotal()" /></div>
      <button type="button" class="remove-item-btn" onclick="removeSaleItemRow(this)"><i class="fas fa-xmark"></i></button>
    </div>`).join('');
}

function addSaleItemRow() {
  const container = document.getElementById('saleItemsContainer');
  const idx = container.querySelectorAll('.item-row').length;
  const div = document.createElement('div');
  div.innerHTML = buildSaleItemRows([{itemName:'',quantity:1,pricePerItem:0}]).replace(/id="saleItemRow_0"/,`id="saleItemRow_${idx}"`);
  container.appendChild(div.firstElementChild);
}

function removeSaleItemRow(btn) {
  const rows = document.querySelectorAll('#saleItemsContainer .item-row');
  if (rows.length <= 1) { showToast('At least one item required','warning'); return; }
  btn.closest('.item-row').remove();
  recalcSaleTotal();
}

function recalcSaleTotal() {
  let gross = 0;
  document.querySelectorAll('#saleItemsContainer .item-row').forEach(row => {
    const qty   = parseFloat(row.querySelector('[name="saleQty"]')?.value) || 0;
    const price = parseFloat(row.querySelector('[name="salePricePerItem"]')?.value) || 0;
    gross += qty * price;
  });
  const disc  = parseFloat(document.getElementById('saleDiscount')?.value) || 0;
  const total = Math.max(0, gross - disc);
  const el = document.getElementById('saleTotalDisplay');
  if (el) el.textContent = formatCurrency(total);
  recalcChange();
}

function recalcChange() {
  const totalEl = document.getElementById('saleTotalDisplay');
  const total   = parseCurrency(totalEl?.textContent) || 0;
  const recv    = parseFloat(document.getElementById('saleAmountReceived')?.value) || 0;
  const change  = Math.max(0, recv - total);
  const el = document.getElementById('saleChangeDisplay');
  if (el) {
    el.textContent = formatCurrency(change);
    el.style.color = change > 0 ? 'var(--yellow)' : 'var(--text-300)';
  }
}

function parseCurrency(str) {
  return parseFloat((str || '').replace(/[^0-9.]/g,'')) || 0;
}

function collectSaleItems() {
  const items = [];
  document.querySelectorAll('#saleItemsContainer .item-row').forEach(row => {
    const itemName    = row.querySelector('[name="saleItemName"]')?.value.trim();
    const quantity    = parseFloat(row.querySelector('[name="saleQty"]')?.value) || 0;
    const pricePerItem = parseFloat(row.querySelector('[name="salePricePerItem"]')?.value) || 0;
    if (itemName) items.push({ itemName, quantity, pricePerItem, subtotal: quantity * pricePerItem });
  });
  return items;
}

// ─── New Sale Modal ───────────────────────────────────────
function openNewSaleModal(customers) {
  openModal('<i class="fas fa-receipt" style="margin-right:6px;"></i> New Sale', buildSaleForm(null, customers));
}

function buildSaleForm(sale, customers) {
  const isEdit = !!sale;
  return `
    <form onsubmit="${isEdit ? `submitEditSale(event,'${sale?._id}')` : 'submitNewSale(event)'}" id="saleForm">

      <!-- Customer row -->
      <div class="form-row">
        <div class="form-group">
          <label>Customer (optional)</label>
          <select id="saleCustomer" onchange="toggleWalkIn()">
            <option value="">— Walk-in / No record —</option>
            ${(customers||[]).map(c => `<option value="${c._id}" ${isEdit && (sale?.customer?._id||sale?.customer)===c._id ? 'selected':''}>${escHtml(c.name)} (${c.phone})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="walkInWrap">
          <label>Walk-in Name</label>
          <input type="text" id="saleWalkInName" placeholder="Customer name (optional)"
            value="${isEdit ? escHtml(sale?.walkInName||'') : ''}" />
        </div>
      </div>

      <!-- Items -->
      <label class="sale-section-label">Items *</label>
      <div id="saleItemsContainer">${buildSaleItemRows(isEdit ? sale?.items : undefined)}</div>
      <button type="button" class="add-item-btn" onclick="addSaleItemRow()">+ Add Item</button>

      <!-- Discount + Total -->
      <div class="form-row" style="align-items:flex-end;">
        <div class="form-group">
          <label>Discount (Rs.)</label>
          <input type="number" id="saleDiscount" min="0" step="0.01"
            value="${isEdit ? (sale?.discount||0) : 0}"
            placeholder="0" oninput="recalcSaleTotal()" />
        </div>
        <div class="total-display">
          <span class="label">Total Amount</span>
          <span class="value" id="saleTotalDisplay">${isEdit ? formatCurrency(sale?.totalAmount) : 'Rs. 0'}</span>
        </div>
      </div>

      <!-- Payment -->
      <div class="form-row">
        <div class="form-group">
          <label>Payment Method *</label>
          <select id="salePaymentMethod">
            ${['Cash','Card','JazzCash','EasyPaisa','Bank Transfer','Other'].map(m =>
              `<option value="${m}" ${isEdit && sale?.paymentMethod===m ? 'selected':''}>${m}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Amount Received (Rs.) *</label>
          <input type="number" id="saleAmountReceived" min="0" step="0.01" required
            value="${isEdit ? (sale?.amountReceived||'') : ''}"
            placeholder="e.g. 1000" oninput="recalcChange()" />
        </div>
      </div>

      <!-- Change -->
      <div class="sale-change-row">
        <span>Change Returned:</span>
        <strong id="saleChangeDisplay" style="color:var(--text-300)">Rs. 0</strong>
      </div>

      <div class="form-group" style="margin-top:4px;">
        <label>Notes (optional)</label>
        <textarea id="saleNotes" rows="2" placeholder="Any remarks...">${isEdit ? escHtml(sale?.notes||'') : ''}</textarea>
      </div>

      <div style="display:flex;gap:10px;margin-top:14px;">
        <button type="submit" class="btn btn-primary" id="saleSaveBtn" style="flex:1;">
          ${isEdit ? '<i class="fas fa-floppy-disk"></i> Update Sale' : '<i class="fas fa-floppy-disk"></i> Save & Print Receipt'}
        </button>
        <button type="button" class="btn btn-outline" onclick="closeModal()" style="flex:0 0 auto;padding:0 16px;">Cancel</button>
      </div>
    </form>`;
}

function toggleWalkIn() {
  const sel  = document.getElementById('saleCustomer');
  const wrap = document.getElementById('walkInWrap');
  if (wrap) wrap.style.opacity = sel?.value ? '0.4' : '1';
}

// ─── Save New Sale ────────────────────────────────────────
async function submitNewSale(e) {
  e.preventDefault();
  const btn = document.getElementById('saleSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const items = collectSaleItems();
  if (!items.length) { showToast('Add at least one item','warning'); btn.disabled=false; btn.innerHTML='<i class="fas fa-floppy-disk"></i> Save & Print Receipt'; return; }

  const disc  = parseFloat(document.getElementById('saleDiscount')?.value) || 0;
  const recv  = parseFloat(document.getElementById('saleAmountReceived').value);
  if (!recv || recv < 0) { showToast('Enter amount received','warning'); btn.disabled=false; btn.innerHTML='<i class="fas fa-floppy-disk"></i> Save & Print Receipt'; return; }

  const payload = {
    customer:       document.getElementById('saleCustomer').value || null,
    walkInName:     document.getElementById('saleWalkInName').value.trim(),
    items,
    amountReceived: recv,
    discount:       disc,
    paymentMethod:  document.getElementById('salePaymentMethod').value,
    notes:          document.getElementById('saleNotes')?.value.trim() || ''
  };

  try {
    const res = await apiFetch('/sales', { method:'POST', body: JSON.stringify(payload) });
    closeModal();
    showToast('Sale recorded! 🎉', 'success');
    // Auto-print receipt
    printReceipt(res.data);
    await renderSales();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-floppy-disk"></i> Save & Print Receipt'; }
  }
}

// ─── Edit Sale Modal ──────────────────────────────────────
async function openEditSaleModal(id, customers) {
  try {
    const res = await apiFetch(`/sales/${id}`);
    openModal('<i class="fas fa-pen" style="margin-right:6px;"></i> Edit Sale', buildSaleForm(res.data, customers));
    setTimeout(recalcSaleTotal, 50);
  } catch (err) { showToast(err.message,'error'); }
}

async function submitEditSale(e, id) {
  e.preventDefault();
  const btn = document.getElementById('saleSaveBtn');
  btn.disabled=true; btn.textContent='Saving…';

  const items = collectSaleItems();
  const payload = {
    customer:       document.getElementById('saleCustomer').value || null,
    walkInName:     document.getElementById('saleWalkInName').value.trim(),
    items,
    amountReceived: parseFloat(document.getElementById('saleAmountReceived').value),
    discount:       parseFloat(document.getElementById('saleDiscount')?.value) || 0,
    paymentMethod:  document.getElementById('salePaymentMethod').value,
    notes:          document.getElementById('saleNotes')?.value.trim() || ''
  };

  try {
    await apiFetch(`/sales/${id}`, { method:'PUT', body: JSON.stringify(payload) });
    closeModal();
    showToast('Sale updated!','success');
    await renderSales();
  } catch (err) {
    showToast(err.message,'error');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-floppy-disk"></i> Update Sale'; }
  }
}

// ─── Delete Sale ──────────────────────────────────────────
async function deleteSale(id) {
  if (!confirm('Delete this sale record? This cannot be undone.')) return;
  try {
    await apiFetch(`/sales/${id}`, { method:'DELETE' });
    showToast('Sale deleted','success');
    await renderSales();
  } catch (err) { showToast(err.message,'error'); }
}

// ─── View Receipt ─────────────────────────────────────────
async function viewReceipt(id) {
  try {
    const res = await apiFetch(`/sales/${id}`);
    printReceipt(res.data);
  } catch (err) { showToast(err.message,'error'); }
}

// ─── Print Receipt ────────────────────────────────────────
function printReceipt(sale) {
  const user       = getUser() || {};
  const shopName   = user.shopName || 'My Shop';
  const ownerName  = user.name     || '';
  const custName   = sale.customer?.name || sale.walkInName || 'Walk-in Customer';
  const custPhone  = sale.customer?.phone || '—';
  const custAddr   = sale.customer?.address || '';

  const gross  = sale.items.reduce((s,i) => s + (i.subtotal || i.quantity*i.pricePerItem), 0);
  const disc   = sale.discount || 0;
  const total  = sale.totalAmount;
  const recv   = sale.amountReceived;
  const change = sale.changeReturned || 0;

  const itemsHTML = sale.items.map((it, idx) => `
    <tr>
      <td style="padding:7px 6px;border-bottom:1px solid #eee;">${idx+1}. ${it.itemName}</td>
      <td style="padding:7px 6px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
      <td style="padding:7px 6px;border-bottom:1px solid #eee;text-align:right;">Rs.${it.pricePerItem.toLocaleString('en-PK')}</td>
      <td style="padding:7px 6px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">Rs.${(it.subtotal||it.quantity*it.pricePerItem).toLocaleString('en-PK')}</td>
    </tr>`).join('');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'});
  const timeStr = now.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});

  const win = window.open('','_blank','width=480,height=760,scrollbars=yes');
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt – ${sale.receiptNumber || ''}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px; color: #111;
      background: #fff;
      padding: 0;
      max-width: 360px;
      margin: 0 auto;
    }
    .receipt-wrap { padding: 24px 20px 32px; }

    /* ── Header ── */
    .r-header { text-align:center; border-bottom: 2px dashed #ccc; padding-bottom: 14px; margin-bottom: 14px; }
    .r-shop-icon { font-size: 2.2rem; display:block; margin-bottom: 4px; color:#6366f1; }
    .r-shop-name { font-size: 1.2rem; font-weight:700; letter-spacing:0.04em; }
    .r-owner     { font-size: 0.78rem; color: #555; margin-top: 2px; }
    .r-slogan    { font-size: 0.72rem; color: #888; margin-top: 3px; }

    /* ── Receipt meta ── */
    .r-meta { display:flex; justify-content:space-between; font-size:0.75rem;
              color:#555; margin-bottom:12px; flex-wrap:wrap; gap:4px; }
    .r-receipt-num { font-weight:700; color:#111; font-size:0.82rem; }

    /* ── Customer ── */
    .r-customer {
      background: #f8f8f8; border-radius: 6px;
      padding: 9px 12px; margin-bottom: 14px;
      font-size: 0.82rem;
    }
    .r-customer-name { font-weight:700; font-size:0.95rem; margin-bottom:3px; }
    .r-customer-detail { color:#555; }

    /* ── Items table ── */
    table.r-items { width:100%; border-collapse:collapse; margin-bottom:10px; }
    table.r-items thead th {
      font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em;
      color:#888; padding:6px 6px; border-bottom:1px solid #ddd;
      font-weight:600;
    }
    table.r-items thead th:last-child,
    table.r-items thead th:nth-child(2),
    table.r-items thead th:nth-child(3) { text-align:right; }
    table.r-items thead th:nth-child(2) { text-align:center; }

    /* ── Totals ── */
    .r-totals { border-top:1px dashed #ccc; padding-top:10px; margin-top:2px; }
    .r-total-row {
      display:flex; justify-content:space-between;
      padding: 4px 0; font-size:0.82rem; color:#444;
    }
    .r-total-row.discount span:last-child { color: #16a34a; }
    .r-total-row.grand {
      font-size:1.05rem; font-weight:800; color:#111;
      border-top:2px solid #111; margin-top:6px; padding-top:8px;
    }
    .r-total-row.received { color:#16a34a; font-weight:600; }
    .r-total-row.change   { color:#d97706; font-weight:600; }

    /* ── Payment method ── */
    .r-payment-method {
      text-align:center; margin:12px 0 10px;
      font-size:0.78rem; background:#f0fdf4;
      border:1px solid #bbf7d0; border-radius:6px;
      padding:6px 12px; color:#166534; font-weight:700;
    }

    /* ── Notes ── */
    .r-notes { font-size:0.75rem; color:#666; margin:8px 0;
               padding:7px 10px; background:#fafafa; border-radius:4px;
               border:1px solid #e5e5e5; }

    /* ── Footer ── */
    .r-footer {
      border-top: 2px dashed #ccc; margin-top:16px; padding-top:14px;
      text-align:center; font-size:0.75rem; color:#888;
    }
    .r-footer .thanks { font-size:0.95rem; font-weight:700; color:#111; margin-bottom:4px; }
    .r-sig-line {
      display:flex; justify-content:space-between;
      margin-top:28px; font-size:0.72rem; color:#aaa;
    }
    .r-sig-box { text-align:center; flex:1; }
    .r-sig-box div { border-top:1px solid #ccc; padding-top:4px; margin-top:20px; }

    @media print {
      body { max-width:100%; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
<div class="receipt-wrap">

  <!-- Header -->
  <div class="r-header">
    <span class="r-shop-icon"><i class="fas fa-store"></i></span>
    <div class="r-shop-name">${escHtml(shopName)}</div>
    ${ownerName ? `<div class="r-owner">Owner: ${escHtml(ownerName)}</div>` : ''}
    <div class="r-slogan">Thank you for shopping with us!</div>
  </div>

  <!-- Meta -->
  <div class="r-meta">
    <span class="r-receipt-num">Receipt: ${sale.receiptNumber || 'N/A'}</span>
    <span>${dateStr} ${timeStr}</span>
  </div>

  <!-- Customer -->
  <div class="r-customer">
    <div class="r-customer-name"><i class="fas fa-user" style="margin-right:5px;color:#6366f1;"></i>${escHtml(custName)}</div>
    <div class="r-customer-detail"><i class="fas fa-mobile-screen" style="margin-right:4px;"></i>${escHtml(custPhone)}${custAddr ? ` &nbsp;|&nbsp; <i class="fas fa-location-dot" style="margin-right:4px;"></i>${escHtml(custAddr)}` : ''}</div>
  </div>

  <!-- Items -->
  <table class="r-items">
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <!-- Totals -->
  <div class="r-totals">
    <div class="r-total-row">
      <span>Sub-total</span>
      <span>Rs.${gross.toLocaleString('en-PK')}</span>
    </div>
    ${disc > 0 ? `<div class="r-total-row discount"><span>Discount</span><span>- Rs.${disc.toLocaleString('en-PK')}</span></div>` : ''}
    <div class="r-total-row grand">
      <span>TOTAL</span>
      <span>Rs.${total.toLocaleString('en-PK')}</span>
    </div>
    <div class="r-total-row received">
      <span>Amount Received</span>
      <span>Rs.${recv.toLocaleString('en-PK')}</span>
    </div>
    ${change > 0 ? `<div class="r-total-row change"><span>Change Returned</span><span>Rs.${change.toLocaleString('en-PK')}</span></div>` : ''}
  </div>

  <!-- Payment method -->
  <div class="r-payment-method"><i class="fas fa-circle-check" style="margin-right:5px;"></i>Paid via ${sale.paymentMethod || 'Cash'}</div>

  ${sale.notes ? `<div class="r-notes"><i class="fas fa-note-sticky" style="margin-right:5px;"></i>${escHtml(sale.notes)}</div>` : ''}

  <!-- Footer -->
  <div class="r-footer">
    <div class="thanks">Thank You! Please Come Again &#9829;</div>
    <div>Keep this receipt for your records.</div>
    <div class="r-sig-line">
      <div class="r-sig-box"><div>Customer Signature</div></div>
      <div style="width:20px;"></div>
      <div class="r-sig-box"><div>Shop Owner</div></div>
    </div>
    <div style="margin-top:18px;font-size:0.68rem;color:#bbb;">
      Generated by DukanBook
    </div>
  </div>

  <!-- Print button (hidden during print) -->
  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()"
      style="padding:10px 32px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px;">
      🖨️ Print Receipt
    </button>
    <button onclick="window.close()"
      style="padding:10px 20px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;cursor:pointer;">
      Close
    </button>
  </div>

</div>
<script>
  // Auto-print on open
  window.onload = () => { setTimeout(() => window.print(), 400); };
  window.onafterprint = () => window.close();
<\/script>
</body>
</html>`);
  win.document.close();
}

// ─── Export Sales PDF ─────────────────────────────────────
async function exportSalesPDF() {
  showToast('Preparing export…','info');
  try {
    const data = await apiFetch('/sales?limit=1000');
    const sales = data.data;
    const user  = getUser() || {};
    const win   = window.open('','_blank','width=960,height=700');
    win.document.write(`<!DOCTYPE html><html><head><title>Sales Report</title>
      <style>body{font-family:Arial;padding:28px}h1{text-align:center;margin-bottom:4px}
      .sub{text-align:center;color:#666;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:7px 8px;text-align:left}
      th{background:#6366f1;color:#fff}
      tr:nth-child(even){background:#f9f9f9}
      .total-row{font-weight:bold;background:#ecfdf5!important}
      </style></head>
      <body>
        <h1>🧾 Sales Report – ${escHtml(user.shopName||'My Shop')}</h1>
        <div class="sub">Generated: ${formatDateTime(new Date())} &nbsp;|&nbsp; Total Records: ${sales.length}</div>
        <table>
          <thead><tr>
            <th>#</th><th>Receipt</th><th>Customer</th>
            <th>Items</th><th>Discount</th><th>Total</th>
            <th>Received</th><th>Change</th><th>Method</th><th>Date</th>
          </tr></thead>
          <tbody>
            ${sales.map((s,i) => `<tr>
              <td>${i+1}</td>
              <td>${s.receiptNumber||'—'}</td>
              <td>${escHtml(s.customer?.name||s.walkInName||'Walk-in')}</td>
              <td>${s.items.map(it=>`${it.itemName} x${it.quantity}`).join(', ')}</td>
              <td>${s.discount>0?'Rs.'+s.discount:'—'}</td>
              <td style="font-weight:600">Rs.${s.totalAmount.toLocaleString('en-PK')}</td>
              <td style="color:green">Rs.${s.amountReceived.toLocaleString('en-PK')}</td>
              <td>${s.changeReturned>0?'Rs.'+s.changeReturned:'—'}</td>
              <td>${s.paymentMethod}</td>
              <td>${formatDateTime(s.createdAt)}</td>
            </tr>`).join('')}
            <tr class="total-row">
              <td colspan="5">TOTAL REVENUE</td>
              <td colspan="5">Rs.${sales.reduce((s,r)=>s+r.totalAmount,0).toLocaleString('en-PK')}</td>
            </tr>
          </tbody>
        </table>
        <script>window.print();window.onafterprint=()=>window.close();<\/script>
      </body></html>`);
    win.document.close();
  } catch (err) { showToast(err.message,'error'); }
}
