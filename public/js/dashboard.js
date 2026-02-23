/* ═══════════════════════════════════════════════════════
   dashboard.js - Dashboard Stats & Recent Transactions
   ═══════════════════════════════════════════════════════ */

async function renderDashboard() {
  const content = document.getElementById('pageContent');

  try {
    const result = await apiFetch('/dashboard/stats');
    const { totalCustomers, customerUdhar: cu, shopBorrow: sb, dueToday, recentTransactions } = result.data;

    const totalPendingAmt = (cu.Pending?.total || 0) + (sb.Pending?.total || 0);
    const totalPaidAmt   = (cu.Paid?.total   || 0) + (sb.Paid?.total   || 0);
    const totalOverdueAmt= (cu.Overdue?.total || 0) + (sb.Overdue?.total|| 0);
    const shopUnpaid     = (sb.Pending?.total || 0) + (sb.Overdue?.total || 0);

    const summaryItems = [
      { label: 'Customer Pending', val: cu.Pending?.count  || 0, amt: cu.Pending?.total  || 0, color: '#f59e0b' },
      { label: 'Customer Paid',    val: cu.Paid?.count     || 0, amt: cu.Paid?.total     || 0, color: '#10b981' },
      { label: 'Customer Overdue', val: cu.Overdue?.count  || 0, amt: cu.Overdue?.total  || 0, color: '#ef4444' },
      { label: 'Shop Pending',     val: sb.Pending?.count  || 0, amt: sb.Pending?.total  || 0, color: '#f59e0b' },
      { label: 'Shop Paid',        val: sb.Paid?.count     || 0, amt: sb.Paid?.total     || 0, color: '#10b981' },
      { label: 'Shop Overdue',     val: sb.Overdue?.count  || 0, amt: sb.Overdue?.total  || 0, color: '#ef4444' },
    ];

    content.innerHTML = `
      ${dueToday > 0 ? `
        <div class="alert-banner warning" style="margin-bottom:16px;">
          <i class="fas fa-triangle-exclamation"></i> <strong>${dueToday} payment(s) due today!</strong> Please check your records and remind customers.
        </div>` : ''}

      <!-- ── STATS GRID ── -->
      <div class="stats-grid" style="margin-bottom:20px;">

        <div class="stat-card c-blue">
          <div class="stat-card-inner">
            <div class="stat-info">
              <div class="stat-value">${totalCustomers}</div>
              <div class="stat-label">Total Customers</div>
            </div>
            <div class="stat-icon-wrap"><i class="fas fa-users"></i></div>
          </div>
        </div>

        <div class="stat-card c-yellow">
          <div class="stat-card-inner">
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(totalPendingAmt)}</div>
              <div class="stat-label">Total Pending</div>
              <div class="stat-sub">${(cu.Pending?.count || 0) + (sb.Pending?.count || 0)} records</div>
            </div>
            <div class="stat-icon-wrap"><i class="fas fa-clock"></i></div>
          </div>
        </div>

        <div class="stat-card c-green">
          <div class="stat-card-inner">
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(totalPaidAmt)}</div>
              <div class="stat-label">Total Recovered</div>
              <div class="stat-sub">${(cu.Paid?.count || 0) + (sb.Paid?.count || 0)} records</div>
            </div>
            <div class="stat-icon-wrap"><i class="fas fa-circle-check"></i></div>
          </div>
        </div>

        <div class="stat-card c-red">
          <div class="stat-card-inner">
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(totalOverdueAmt)}</div>
              <div class="stat-label">Total Overdue</div>
              <div class="stat-sub">${(cu.Overdue?.count || 0) + (sb.Overdue?.count || 0)} records</div>
            </div>
            <div class="stat-icon-wrap"><i class="fas fa-circle-exclamation"></i></div>
          </div>
        </div>

        <div class="stat-card c-purple">
          <div class="stat-card-inner">
            <div class="stat-info">
              <div class="stat-value">${formatCurrency(shopUnpaid)}</div>
              <div class="stat-label">Shop Borrowed</div>
              <div class="stat-sub">Unpaid amount</div>
            </div>
            <div class="stat-icon-wrap"><i class="fas fa-box"></i></div>
          </div>
        </div>

        <div class="stat-card c-pink">
          <div class="stat-card-inner">
            <div class="stat-info">
              <div class="stat-value">${dueToday}</div>
              <div class="stat-label">Due Today</div>
              <div class="stat-sub">Across all records</div>
            </div>
            <div class="stat-icon-wrap"><i class="fas fa-calendar-day"></i></div>
          </div>
        </div>

      </div>

      <!-- ── BOTTOM GRID ── -->
      <div class="dashboard-grid">

        <!-- Recent Transactions -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-clock-rotate-left"></i> Recent Transactions</h3>
            <a href="#customer-udhar" class="btn btn-outline btn-sm">View All →</a>
          </div>
          ${recentTransactions.length === 0
            ? `<div class="empty-state"><span class="empty-icon"><i class="fas fa-inbox"></i></span><p>No transactions yet</p></div>`
            : `<div class="table-responsive">
                <table>
                  <thead><tr><th>Name</th><th>Type</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
                  <tbody>
                    ${recentTransactions.map(t => `
                      <tr>
                        <td>
                          <strong style="color:var(--text-900);font-weight:600;">${escHtml(t.name)}</strong>
                          ${t.phone ? `<br><small style="color:var(--text-300)">${t.phone}</small>` : ''}
                        </td>
                        <td><span style="font-size:0.78rem;color:var(--text-500);font-weight:600;background:var(--bg-raised);padding:2px 7px;border-radius:5px;">${t.type}</span></td>
                        <td><strong>${formatCurrency(t.amount)}</strong></td>
                        <td style="white-space:nowrap;">${formatDate(t.dueDate)}</td>
                        <td>${getStatusBadge(t.status)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>`}
        </div>

        <!-- Quick Summary -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-pie"></i> Quick Summary</h3>
          </div>
          <div>
            ${summaryItems.map(item => `
              <div class="summary-row">
                <span class="summary-label">
                  <span class="summary-dot" style="background:${item.color}"></span>
                  ${item.label}
                </span>
                <div class="summary-val">
                  <strong>${formatCurrency(item.amt)}</strong>
                  <span class="count">${item.val} record${item.val !== 1 ? 's' : ''}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>

      </div>`;

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>${err.message}</h3></div>`;
  }
}
