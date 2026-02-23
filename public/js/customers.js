/* ═══════════════════════════════════════════════════════
   customers.js - Customer Management Module
   ═══════════════════════════════════════════════════════ */

let customerSearchTimeout;

async function renderCustomers() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-users"></i> Customer List</h3>
        <button class="btn btn-primary btn-sm" onclick="openAddCustomerModal()"><i class="fas fa-plus"></i> Add Customer</button>
      </div>
      <div class="filter-bar" style="margin-bottom:0;border:none;padding:0 0 16px 0;background:transparent;box-shadow:none;">
        <div class="form-group" style="max-width:380px;margin-bottom:0;">
          <label>Search</label>
          <input type="text" id="customerSearch" placeholder="Search by name or phone..." oninput="debounceCustomerSearch()" />
        </div>
      </div>
      <div id="customerTableWrapper">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
    </div>`;

  await loadCustomers();
}

async function loadCustomers(search = '') {
  const wrapper = document.getElementById('customerTableWrapper');
  if (!wrapper) return;

  try {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await apiFetch(`/customers${params}`);
    const customers = data.data;

    if (customers.length === 0) {
      wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-users"></i></span><h3>No customers found</h3><p>Add your first customer to get started.</p></div>`;
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Added On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <strong>${escHtml(c.name)}</strong>
                </td>
                <td>${c.phone}</td>
                <td>
                  ${c.email
                    ? `<a href="mailto:${escHtml(c.email)}" style="color:var(--brand-1);font-size:0.82rem;">${escHtml(c.email)}</a>`
                    : `<span style="color:var(--text-300);font-size:0.78rem;">No email</span>`}
                </td>
                <td>${escHtml(c.address) || '—'}</td>
                <td>${formatDate(c.createdAt)}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn btn-outline btn-sm" onclick="openEditCustomerModal('${c._id}','${escHtml(c.name)}','${c.phone}','${escHtml(c.address || '')}','${escHtml(c.email || '')}')"><i class="fas fa-pen"></i> Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c._id}','${escHtml(c.name)}')"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    wrapper.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>${err.message}</h3></div>`;
  }
}

function debounceCustomerSearch() {
  clearTimeout(customerSearchTimeout);
  customerSearchTimeout = setTimeout(() => {
    const val = document.getElementById('customerSearch')?.value || '';
    loadCustomers(val);
  }, 400);
}

// ─── Add Customer Modal ───────────────────────────────────
function openAddCustomerModal() {
  openModal('Add New Customer', `
    <form onsubmit="saveCustomer(event)">
      <div class="form-row">
        <div class="form-group">
          <label>Customer Name *</label>
          <input type="text" id="custName" required placeholder="Customer Name" />
        </div>
        <div class="form-group">
          <label>Phone Number *</label>
          <input type="tel" id="custPhone" required placeholder="Customer Phone" />
        </div>
      </div>
      <div class="form-group">
        <label>Email Address <span style="color:var(--green);font-size:0.7rem;font-weight:600;background:var(--green-bg);padding:2px 8px;border-radius:10px;margin-left:6px;">For Reminders</span></label>
        <input type="email" id="custEmail" placeholder="customer@email.com" autocomplete="email" />
        <small style="color:var(--text-300);font-size:0.75rem;margin-top:4px;display:block;"><i class="fas fa-envelope" style="margin-right:4px;"></i>We'll send payment due-date reminders to this email</small>
      </div>
      <div class="form-group">
        <label>Address (optional)</label>
        <input type="text" id="custAddress" placeholder="House #12, Main Bazar" />
      </div>
      <div class="flex-gap mt-16">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Save Customer</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>`);
}

// ─── Edit Customer Modal ──────────────────────────────────
function openEditCustomerModal(id, name, phone, address, email) {
  openModal('Edit Customer', `
    <form onsubmit="updateCustomer(event,'${id}')">
      <div class="form-row">
        <div class="form-group">
          <label>Customer Name *</label>
          <input type="text" id="custName" required value="${escHtml(name)}" />
        </div>
        <div class="form-group">
          <label>Phone Number *</label>
          <input type="tel" id="custPhone" required value="${phone}" />
        </div>
      </div>
      <div class="form-group">
        <label>Email Address <span style="color:var(--green);font-size:0.7rem;font-weight:600;background:var(--green-bg);padding:2px 8px;border-radius:10px;margin-left:6px;">For Reminders</span></label>
        <input type="email" id="custEmail" value="${escHtml(email || '')}" placeholder="customer@email.com" />
        <small style="color:var(--text-300);font-size:0.75rem;margin-top:4px;display:block;"><i class="fas fa-envelope" style="margin-right:4px;"></i>Reminders are sent here on due dates</small>
      </div>
      <div class="form-group">
        <label>Address</label>
        <input type="text" id="custAddress" value="${escHtml(address)}" />
      </div>
      <div class="flex-gap mt-16">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Update</button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      </div>
    </form>`);
}

// ─── Save / Update / Delete ───────────────────────────────
async function saveCustomer(e) {
  e.preventDefault();
  const payload = {
    name:    document.getElementById('custName').value.trim(),
    phone:   document.getElementById('custPhone').value.trim(),
    email:   document.getElementById('custEmail').value.trim(),
    address: document.getElementById('custAddress').value.trim()
  };
  try {
    await apiFetch('/customers', { method: 'POST', body: JSON.stringify(payload) });
    closeModal();
    showToast('Customer added! 🎉', 'success');
    loadCustomers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function updateCustomer(e, id) {
  e.preventDefault();
  const payload = {
    name:    document.getElementById('custName').value.trim(),
    phone:   document.getElementById('custPhone').value.trim(),
    email:   document.getElementById('custEmail').value.trim(),
    address: document.getElementById('custAddress').value.trim()
  };
  try {
    await apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    closeModal();
    showToast('Customer updated!', 'success');
    loadCustomers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Delete customer "${name}"?\nThis does not delete their udhar records.`)) return;
  try {
    await apiFetch(`/customers/${id}`, { method: 'DELETE' });
    showToast('Customer deleted', 'success');
    loadCustomers();
  } catch (err) { showToast(err.message, 'error'); }
}
