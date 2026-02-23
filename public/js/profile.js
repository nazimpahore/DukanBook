/* ═══════════════════════════════════════════════════════
   profile.js - Owner Profile Page
   ═══════════════════════════════════════════════════════ */

// ─── Render Profile Page ──────────────────────────────
async function renderProfile() {
  const content = document.getElementById('pageContent');

  // Always fetch fresh data from server
  let user;
  try {
    const data = await apiFetch('/auth/me');
    user = data.user;
    // Keep localStorage in sync
    setUser(user);
  } catch (err) {
    user = getUser();
    if (!user) {
      content.innerHTML = `<div class="empty-state"><span class="empty-icon"><i class="fas fa-triangle-exclamation"></i></span><h3>Could not load profile</h3><p>${err.message}</p></div>`;
      return;
    }
  }

  const avatarHTML = user.profilePicture
    ? `<img src="${user.profilePicture}" alt="Profile" class="profile-avatar-img" />`
    : `<div class="profile-avatar-initials">${getInitials(user.name)}</div>`;

  content.innerHTML = `
    <div class="profile-page">

      <!-- ── Profile Card ─────────────────────────────── -->
      <div class="profile-card">
        <div class="profile-card-bg"></div>

        <div class="profile-avatar-wrap" id="profileAvatarWrap">
          ${avatarHTML}
        </div>

        <div class="profile-info">
          <h2 class="profile-name">${escHtml(user.name)}</h2>
          <span class="profile-role-badge"><i class="fas fa-store"></i> Shop Owner</span>
          <p class="profile-shop">${escHtml(user.shopName || '—')}</p>
        </div>

        <button class="btn btn-primary profile-edit-btn" onclick="openEditProfileModal()">
          <i class="fas fa-pen"></i> Edit Profile
        </button>
      </div>

      <!-- ── Details Grid ─────────────────────────────── -->
      <div class="profile-details-grid">
        <div class="profile-detail-card">
          <span class="detail-icon"><i class="fas fa-user"></i></span>
          <div class="detail-content">
            <span class="detail-label">Full Name</span>
            <span class="detail-value" id="pdName">${escHtml(user.name)}</span>
          </div>
        </div>
        <div class="profile-detail-card">
          <span class="detail-icon"><i class="fas fa-store"></i></span>
          <div class="detail-content">
            <span class="detail-label">Shop Name</span>
            <span class="detail-value" id="pdShopName">${escHtml(user.shopName || '—')}</span>
          </div>
        </div>
        <div class="profile-detail-card">
          <span class="detail-icon"><i class="fas fa-envelope"></i></span>
          <div class="detail-content">
            <span class="detail-label">Email</span>
            <span class="detail-value" id="pdEmail">${escHtml(user.email)}</span>
          </div>
        </div>
        <div class="profile-detail-card">
          <span class="detail-icon"><i class="fas fa-mobile-screen"></i></span>
          <div class="detail-content">
            <span class="detail-label">Phone</span>
            <span class="detail-value" id="pdPhone">${escHtml(user.phone || '—')}</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ─── Open Edit Modal ──────────────────────────────────
function openEditProfileModal() {
  const user = getUser() || {};

  const body = `
    <form id="editProfileForm" onsubmit="handleProfileSave(event)" enctype="multipart/form-data">

      <!-- Profile Picture Preview & Upload -->
      <div class="ep-avatar-section">
        <div class="ep-avatar-preview" id="epAvatarPreview">
          ${user.profilePicture
            ? `<img src="${user.profilePicture}" id="epAvatarImg" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
            : `<span id="epAvatarInitials" class="ep-initials">${getInitials(user.name)}</span>`}
        </div>
        <label class="ep-upload-label" for="epPicInput">
          <i class="fas fa-camera"></i> Change Photo
          <input type="file" id="epPicInput" accept="image/*" style="display:none;" onchange="previewProfilePic(event)" />
        </label>
        <p class="ep-upload-hint">JPG, PNG, GIF or WebP · Max 5 MB</p>
      </div>

      <!-- Fields -->
      <div class="form-row">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="epName" value="${escHtml(user.name || '')}" placeholder="Your Name" required />
        </div>
        <div class="form-group">
          <label>Shop Name</label>
          <input type="text" id="epShopName" value="${escHtml(user.shopName || '')}" placeholder="Shop Name" required />
        </div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="epEmail" value="${escHtml(user.email || '')}" placeholder="you@example.com" required />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="tel" id="epPhone" value="${escHtml(user.phone || '')}" placeholder="03001234567" />
      </div>

      <div style="display:flex;gap:10px;margin-top:8px;">
        <button type="submit" class="btn btn-primary" id="epSaveBtn" style="flex:1;">
          <i class="fas fa-floppy-disk"></i> Save Changes
        </button>
        <button type="button" class="btn btn-outline-danger" onclick="document.getElementById('modalOverlay').classList.add('hidden');document.body.style.overflow='';" style="flex:0 0 auto;padding:0 18px;">
          Cancel
        </button>
      </div>
    </form>
  `;

  openModal('<i class="fas fa-pen" style="margin-right:6px;"></i> Edit Profile', body);
}

// ─── Live image preview ───────────────────────────────
function previewProfilePic(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('epAvatarPreview');
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
  };
  reader.readAsDataURL(file);
}

// ─── Save Profile ─────────────────────────────────────
async function handleProfileSave(e) {
  e.preventDefault();
  const btn = document.getElementById('epSaveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const formData = new FormData();
    formData.append('name',     document.getElementById('epName').value.trim());
    formData.append('shopName', document.getElementById('epShopName').value.trim());
    formData.append('email',    document.getElementById('epEmail').value.trim());
    formData.append('phone',    document.getElementById('epPhone').value.trim());

    const fileInput = document.getElementById('epPicInput');
    if (fileInput.files[0]) {
      formData.append('profilePicture', fileInput.files[0]);
    }

    // Use fetch directly so we can send FormData (not JSON)
    const token = getToken();
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Update failed');

    // Update local storage and refresh UI
    setUser(data.user);
    populateUserUI(data.user);

    // Close modal
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';

    showToast('Profile updated successfully!', 'success');

    // Re-render the profile page with updated data
    renderProfile();

  } catch (err) {
    showToast(err.message || 'Failed to update profile', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
    }
  }
}
