const { createClient } = supabase;

const appState = {
  supabase: null,
  user: null,
  currentNovel: null,
  currentChapters: [],
};

const config = window.supabaseConfig || {
  url: '',
  anonKey: '',
};

function isConfigured() {
  return Boolean(config.url && config.url !== 'https://TU-PROYECTO.supabase.co' && config.anonKey && config.anonKey !== 'TU_ANON_KEY_PUBLICA');
}

function setStatus(message, type = 'info') {
  const status = document.getElementById('auth-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

function showAuthForms(visible) {
  const forms = document.querySelectorAll('[data-auth-panel]');
  forms.forEach((el) => {
    el.hidden = !visible;
  });
}

function renderUserState() {
  const authBox = document.getElementById('auth-box');
  const userInfo = document.getElementById('user-info');
  if (!authBox || !userInfo) return;

  if (!appState.user) {
    authBox.hidden = false;
    userInfo.hidden = true;
    return;
  }

  authBox.hidden = true;
  userInfo.hidden = false;
  document.getElementById('user-name').textContent = appState.user.email || 'Autor';
}

function getEmailRedirectUrl() {
  return new URL('acceso.html', window.location.href).href;
}

async function initSupabase() {
  if (!isConfigured()) {
    setStatus('Configura tus claves de Supabase en config.js antes de continuar.', 'warning');
    return;
  }

  appState.supabase = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  appState.supabase.auth.onAuthStateChange((event, session) => {
    appState.user = session?.user || null;
    renderUserState();

    if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
      setStatus('Correo confirmado. Tu cuenta ya está activa.', 'success');
      window.history.replaceState({}, document.title, getEmailRedirectUrl());
    }
  });

  const { data: { session }, error } = await appState.supabase.auth.getSession();
  if (error) {
    console.error('Error mirando sesión', error);
    setStatus('No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.', 'error');
    return;
  }

  appState.user = session?.user || null;
  renderUserState();
  setStatus(session ? 'Sesión activa' : 'Lista para iniciar sesión', session ? 'success' : 'info');
}

async function handleSignUp(event) {
  event.preventDefault();
  if (!appState.supabase || !isConfigured()) return;

  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const submitButton = event.submitter || event.currentTarget.querySelector('button[type="submit"]');

  if (!email || password.length < 6) {
    setStatus('Introduce un email válido y una contraseña con al menos 6 caracteres.', 'warning');
    return;
  }

  if (submitButton) submitButton.disabled = true;
  setStatus('Creando la cuenta y enviando el correo de confirmación…', 'info');

  const { error } = await appState.supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getEmailRedirectUrl() },
  });

  if (submitButton) submitButton.disabled = false;

  if (error) {
    setStatus(error.message, 'error');
    return;
  }

  appState.user = null;
  renderUserState();
  setStatus('Registro correcto. Revisa tu correo y pulsa el enlace para confirmar la cuenta.', 'success');
}

async function handleSignIn(event) {
  event.preventDefault();
  if (!appState.supabase || !isConfigured()) return;

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const { data, error } = await appState.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus(error.message, 'error');
    return;
  }

  appState.user = data?.user || null;
  renderUserState();
  setStatus('Sesión iniciada correctamente.', 'success');
}

async function handleSignOut() {
  if (!appState.supabase) return;
  const { error } = await appState.supabase.auth.signOut();
  if (error) {
    setStatus(error.message, 'error');
    return;
  }

  appState.user = null;
  renderUserState();
  setStatus('Sesión cerrada.', 'info');
}

async function handleAccessibilityRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const fields = form.querySelectorAll('input, select, textarea');
  const [nameInput, emailInput] = fields;
  const needInput = form.querySelector('select');
  const messageInput = form.querySelector('textarea');
  const name = nameInput?.value.trim() || '';
  const email = emailInput?.value.trim() || '';
  const need = needInput?.value || '';
  const message = messageInput?.value.trim() || '';

  if (!name || !email || !emailInput.checkValidity()) {
    setStatus('Escribe tu nombre y un correo electrónico válido.', 'warning');
    return;
  }

  if (!appState.supabase || !isConfigured()) {
    setStatus('El formulario todavía no está conectado a Supabase.', 'error');
    return;
  }

  if (submitButton) submitButton.disabled = true;
  setStatus('Enviando tu solicitud…', 'info');

  const { error } = await appState.supabase.from('access_requests').insert({
    name,
    email,
    need: need || null,
    message: message || null,
  });

  if (submitButton) submitButton.disabled = false;
  if (error) {
    console.error('No se pudo enviar la solicitud de accesibilidad:', error);
    setStatus('No se pudo enviar. Ejecuta primero supabase/access_requests.sql en Supabase.', 'error');
    return;
  }

  form.reset();
  setStatus('Solicitud enviada correctamente. Te contactaremos por correo.', 'success');
}

async function loadPublicNovels() {
  if (!appState.supabase) return;

  const { data, error } = await appState.supabase
    .from('novels')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('No se pudieron cargar las novelas:', error);
    return;
  }

  const grid = document.getElementById('novelGrid');
  if (!grid) return;
  grid.innerHTML = '';

  data.forEach((novel) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="cover-card cc${(Math.abs(novel.title.length) % 4) + 1}">${novel.title}</div>
      <div class="card-body">
        <div class="meta-row"><span>${novel.genre || 'General'}</span><span>${novel.status || 'Publicado'}</span></div>
        <span class="tag">Obra publicada</span>
        <h3>${novel.title}</h3>
        <p>${(novel.synopsis || 'Sin sinopsis disponible todavía.').slice(0, 120)}${(novel.synopsis || '').length > 120 ? '…' : ''}</p>
        <div class="card-actions">
          <div class="reaction"><span>❤ 0</span><span>💬 0</span></div>
          <a href="capitulos.html?novel=${novel.id}" style="font-weight:800; color: var(--primary-dark);">Leer</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function loadLatestChapters() {
  if (!appState.supabase) return;
  const { data, error } = await appState.supabase
    .from('chapters')
    .select('*')
    .eq('status', 'published')
    .order('chapter_number', { ascending: true })
    .limit(3);

  if (error || !data) return;
  const list = document.getElementById('latest-chapters');
  if (!list) return;
  list.innerHTML = data.map((chapter) => `
    <div class="feature-box">
      <div class="icon">📖</div>
      <h3>Capítulo ${chapter.chapter_number}</h3>
      <p>${chapter.title || 'Nuevo capítulo'} · ${chapter.content ? chapter.content.slice(0, 100) : 'Disponible en la lectura completa.'}</p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  const signinForm = document.getElementById('signin-form');
  const logoutButton = document.getElementById('logout-button');
  const accessibilityForm = document.querySelector('.access-form form');

  if (signupForm) signupForm.addEventListener('submit', handleSignUp);
  if (signinForm) signinForm.addEventListener('submit', handleSignIn);
  if (logoutButton) logoutButton.addEventListener('click', handleSignOut);
  if (accessibilityForm) accessibilityForm.addEventListener('submit', handleAccessibilityRequest);

  initSupabase();
  loadPublicNovels();
  loadLatestChapters();
});
