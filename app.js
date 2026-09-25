const { createClient } = supabase;

const appState = { supabase: null, user: null, profile: null, currentNovel: null, currentChapters: [] };
const config = window.supabaseConfig || { url: '', anonKey: '' };

function isConfigured() {
  return Boolean(config.url && config.url !== 'https://TU-PROYECTO.supabase.co' && config.anonKey && config.anonKey !== 'TU_ANON_KEY_PUBLICA');
}

function setStatus(message, type = 'info') {
  const status = document.getElementById('auth-status') || document.getElementById('access-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
  if (status.classList) status.className = `form-status ${type}`;
}

function getEmailRedirectUrl() { return new URL('acceso.html', window.location.href).href; }
function getHomeUrl(reason = '') { return new URL(`index.html${reason ? `?${reason}=1` : ''}`, window.location.href).href; }
function getUserLabel(user = appState.user) {
  return appState.profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Autor';
}
function getUserInitial(user = appState.user) { return getUserLabel(user).trim().charAt(0).toUpperCase(); }

function showHomeMessage() {
  if (!document.body || document.getElementById('account-message')) return;
  const params = new URLSearchParams(window.location.search);
  const message = params.get('confirmed') === '1' ? 'Correo confirmado correctamente. Tu cuenta ya está activa.' : params.get('welcome') === '1' ? 'Sesión iniciada correctamente. Bienvenido/a a Editorial Acuario.' : '';
  if (!message) return;
  const banner = document.createElement('div');
  banner.id = 'account-message'; banner.setAttribute('role', 'status'); banner.textContent = message;
  banner.style.cssText = 'position:fixed;top:92px;right:20px;z-index:1000;max-width:420px;padding:14px 18px;border-radius:14px;background:#1b9a70;color:#fff;font-weight:800;box-shadow:0 12px 30px #0002';
  document.body.appendChild(banner);
  window.history.replaceState({}, document.title, window.location.pathname);
  window.setTimeout(() => banner.remove(), 7000);
}

function closeAccountMenu() {
  const menu = document.getElementById('account-menu');
  const button = document.getElementById('account-menu-button');
  if (menu) menu.hidden = true;
  if (button) button.setAttribute('aria-expanded', 'false');
}

function createAccountMenu(accessLink) {
  if (document.getElementById('account-menu')) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'account-menu-wrapper';
  wrapper.style.cssText = 'position:relative;display:inline-block';
  accessLink.parentNode.insertBefore(wrapper, accessLink);
  wrapper.appendChild(accessLink);
  accessLink.id = 'account-menu-button';
  accessLink.href = '#';
  accessLink.setAttribute('aria-haspopup', 'menu');
  accessLink.setAttribute('aria-expanded', 'false');
  accessLink.addEventListener('click', (event) => {
    event.preventDefault();
    const menu = document.getElementById('account-menu');
    const open = menu.hidden;
    menu.hidden = !open;
    accessLink.setAttribute('aria-expanded', String(open));
  });
  const menu = document.createElement('div');
  menu.id = 'account-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  menu.style.cssText = 'position:absolute;right:0;top:calc(100% + 10px);width:245px;padding:8px;background:#fff;border:1px solid #e9e2ff;border-radius:16px;box-shadow:0 18px 40px #5142b52b;z-index:100;';
  wrapper.appendChild(menu);
  document.addEventListener('click', (event) => { if (!wrapper.contains(event.target)) closeAccountMenu(); });
}

function renderHomeUserState() {
  const accessLink = document.querySelector('header a.btn[href="acceso.html"]') || document.querySelector('header a.btn');
  if (!accessLink) return;
  if (!appState.user) {
    accessLink.id = '';
    accessLink.href = 'acceso.html';
    accessLink.textContent = 'Iniciar sesión / Registrarse';
    const wrapper = document.getElementById('account-menu-wrapper');
    if (wrapper) wrapper.replaceWith(accessLink);
    return;
  }
  createAccountMenu(accessLink);
  accessLink.setAttribute('aria-label', `Abrir menú de ${getUserLabel()}`);
  accessLink.innerHTML = `<span style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#fff;color:#684df0;font-weight:900;margin-right:8px">${getUserInitial()}</span><span>${getUserLabel()}</span><span aria-hidden="true" style="margin-left:8px">⌄</span>`;
  const menu = document.getElementById('account-menu');
  menu.innerHTML = `<div style="padding:10px 12px;border-bottom:1px solid #e9e2ff;margin-bottom:6px"><strong>${getUserLabel()}</strong><small style="display:block;color:#625d72;margin-top:3px">${appState.user.email}</small></div><a role="menuitem" href="acceso.html#perfil" style="display:block;padding:11px 12px;border-radius:10px;color:#211d31;font-weight:700">👤 Mi perfil</a><a role="menuitem" href="panel-autores.html" style="display:block;padding:11px 12px;border-radius:10px;color:#211d31;font-weight:700">✍️ Panel de autor</a><a role="menuitem" href="acceso.html#configuracion" style="display:block;padding:11px 12px;border-radius:10px;color:#211d31;font-weight:700">⚙️ Configuración</a><button id="menu-signout" type="button" style="display:block;width:100%;text-align:left;padding:11px 12px;border:0;border-top:1px solid #e9e2ff;margin-top:6px;background:#fff;border-radius:10px;color:#c43f55;font:inherit;font-weight:700;cursor:pointer">↪ Cerrar sesión</button>`;
  document.getElementById('menu-signout').addEventListener('click', handleSignOut);
}

function renderUserState() {
  const authBox = document.getElementById('auth-box');
  const userInfo = document.getElementById('user-info');
  renderHomeUserState();
  if (!authBox || !userInfo) return;
  if (!appState.user) { authBox.hidden = false; userInfo.hidden = true; return; }
  authBox.hidden = true; userInfo.hidden = false;
  const userName = document.getElementById('user-name');
  if (userName) userName.textContent = `${getUserLabel()} (${appState.user.email})`;
}

async function loadProfile() {
  if (!appState.supabase || !appState.user) return;
  const { data } = await appState.supabase.from('profiles').select('display_name,username,avatar_url,role').eq('id', appState.user.id).maybeSingle();
  appState.profile = data || null;
  renderUserState();
}

async function initSupabase() {
  if (!isConfigured()) { setStatus('Configura tus claves de Supabase en config.js antes de continuar.', 'warning'); return; }
  appState.supabase = createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  appState.supabase.auth.onAuthStateChange((event, session) => {
    appState.user = session?.user || null; appState.profile = null; renderUserState();
    if (appState.user) loadProfile();
    if (event === 'SIGNED_IN' && (window.location.hash.includes('access_token') || new URLSearchParams(window.location.search).has('code'))) window.location.replace(getHomeUrl('confirmed'));
  });
  const { data: { session }, error } = await appState.supabase.auth.getSession();
  if (error) { console.error('Error mirando sesión', error); setStatus('No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.', 'error'); return; }
  appState.user = session?.user || null; renderUserState();
  if (appState.user) await loadProfile();
  setStatus(session ? 'Sesión activa' : 'Lista para iniciar sesión', session ? 'success' : 'info');
}

async function handleSignUp(event) {
  event.preventDefault(); if (!appState.supabase || !isConfigured()) return;
  const email = document.getElementById('signup-email').value.trim(); const password = document.getElementById('signup-password').value; const submitButton = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
  if (!email || password.length < 6) { setStatus('Introduce un email válido y una contraseña con al menos 6 caracteres.', 'warning'); return; }
  if (submitButton) submitButton.disabled = true; setStatus('Creando la cuenta y enviando el correo de confirmación…', 'info');
  const { error } = await appState.supabase.auth.signUp({ email, password, options: { emailRedirectTo: getEmailRedirectUrl() } });
  if (submitButton) submitButton.disabled = false; if (error) { setStatus(error.message, 'error'); return; }
  setStatus('Registro correcto. Revisa tu correo y pulsa el enlace para confirmar la cuenta.', 'success');
}

async function handleSignIn(event) {
  event.preventDefault(); if (!appState.supabase || !isConfigured()) return;
  const email = document.getElementById('signin-email').value.trim(); const password = document.getElementById('signin-password').value; const submitButton = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true; setStatus('Comprobando tus datos…', 'info');
  const { data, error } = await appState.supabase.auth.signInWithPassword({ email, password });
  if (submitButton) submitButton.disabled = false; if (error) { setStatus(error.message, 'error'); return; }
  appState.user = data?.user || null; renderUserState(); window.location.replace(getHomeUrl('welcome'));
}

async function handleSignOut() {
  if (!appState.supabase) return; const { error } = await appState.supabase.auth.signOut();
  if (error) { setStatus(error.message, 'error'); return; }
  appState.user = null; appState.profile = null; closeAccountMenu(); renderUserState(); setStatus('Sesión cerrada.', 'info');
}

async function handleAccessibilityRequest(event) {
  event.preventDefault(); const form = event.currentTarget; const fields = form.querySelectorAll('input, select, textarea'); const [nameInput, emailInput] = fields; const name = nameInput?.value.trim() || ''; const email = emailInput?.value.trim() || ''; const need = form.querySelector('select')?.value || ''; const message = form.querySelector('textarea')?.value.trim() || '';
  if (!name || !email || !emailInput.checkValidity()) { setStatus('Escribe tu nombre y un correo electrónico válido.', 'warning'); return; }
  if (!appState.supabase || !isConfigured()) { setStatus('El formulario todavía no está conectado a Supabase.', 'error'); return; }
  const submitButton = form.querySelector('button[type="submit"]'); if (submitButton) submitButton.disabled = true; setStatus('Enviando tu solicitud…', 'info');
  const { error } = await appState.supabase.from('access_requests').insert({ name, email, need: need || null, message: message || null }); if (submitButton) submitButton.disabled = false;
  if (error) { console.error(error); setStatus('No se pudo enviar. Ejecuta primero supabase/access_requests.sql en Supabase.', 'error'); return; }
  form.reset(); setStatus('Solicitud enviada correctamente. Te contactaremos por correo.', 'success');
}

async function loadPublicNovels() {
  if (!appState.supabase) return; const { data, error } = await appState.supabase.from('novels').select('*').eq('status', 'published').order('created_at', { ascending: false }); if (error) { console.error('No se pudieron cargar las novelas:', error); return; }
  const grid = document.getElementById('novelGrid'); if (!grid) return; grid.innerHTML = '';
  data.forEach((novel) => { const card = document.createElement('article'); card.className = 'card'; card.innerHTML = `<div class="cover-card cc${(Math.abs(novel.title.length) % 4) + 1}">${novel.title}</div><div class="card-body"><div class="meta-row"><span>${novel.genre || 'General'}</span><span>${novel.status || 'Publicado'}</span></div><span class="tag">Obra publicada</span><h3>${novel.title}</h3><p>${(novel.synopsis || 'Sin sinopsis disponible todavía.').slice(0, 120)}${(novel.synopsis || '').length > 120 ? '…' : ''}</p><div class="card-actions"><div class="reaction"><span>❤ 0</span><span>💬 0</span></div><a href="capitulos.html?novel=${novel.id}" style="font-weight:800;color:var(--primary-dark);">Leer</a></div></div>`; grid.appendChild(card); });
}

async function loadLatestChapters() { if (!appState.supabase) return; const { data, error } = await appState.supabase.from('chapters').select('*').eq('status', 'published').order('chapter_number', { ascending: true }).limit(3); if (error || !data) return; const list = document.getElementById('latest-chapters'); if (!list) return; list.innerHTML = data.map((chapter) => `<div class="feature-box"><div class="icon">📖</div><h3>Capítulo ${chapter.chapter_number}</h3><p>${chapter.title || 'Nuevo capítulo'} · ${chapter.content ? chapter.content.slice(0, 100) : 'Disponible en la lectura completa.'}</p></div>`).join(''); }

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form'); const signinForm = document.getElementById('signin-form'); const logoutButton = document.getElementById('logout-button'); const accessibilityForm = document.querySelector('.access-form form');
  if (signupForm) signupForm.addEventListener('submit', handleSignUp); if (signinForm) signinForm.addEventListener('submit', handleSignIn); if (logoutButton) logoutButton.addEventListener('click', handleSignOut); if (accessibilityForm) accessibilityForm.addEventListener('submit', handleAccessibilityRequest);
  showHomeMessage(); renderUserState(); initSupabase(); loadPublicNovels(); loadLatestChapters();
});
