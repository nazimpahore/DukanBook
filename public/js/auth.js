/* ═══════════════════════════════════════════════════════
   auth.js - Login & Register Handlers
   ═══════════════════════════════════════════════════════ */

function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
  document.getElementById('registerTabBtn').classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(data.token);
    setUser(data.user);

    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    populateUserUI(data.user);

    showToast(`Welcome back, ${data.user.name}! 🎉`, 'success');
    navigate('dashboard');
    refreshNotifBadge();
    setInterval(refreshNotifBadge, 60000);

  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login to Dashboard →';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const payload = {
    name: document.getElementById('regName').value.trim(),
    shopName: document.getElementById('regShopName').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    password: document.getElementById('regPassword').value
  };

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setToken(data.token);
    setUser(data.user);

    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    populateUserUI(data.user);

    showToast('Account created! Welcome 🎉', 'success');
    navigate('dashboard');
    refreshNotifBadge();
    setInterval(refreshNotifBadge, 60000);

  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account →';
  }
}
