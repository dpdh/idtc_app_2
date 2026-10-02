const app = document.querySelector('#app');
const nav = document.querySelector('.bottom-nav');
const backButton = document.querySelector('[data-back]');
import { adminPanel, bindAdmin } from './admin-cms.js?v=6';
import { shopPage, bindShop } from './shop.js?v=3';
import { hashPassword, verifyPassword } from './auth-security.js?v=1';
import { bindImageZoom } from './image-zoom.js?v=2';
import { bubbleFieldMarkup } from './ambient-bubbles.js?v=1';
bindImageZoom();
let data;
let databaseAuthMode = false;
let databaseBootstrapRequired = false;
let databaseRegistrationEnabled = false;
let databaseSession = null;
let registrationCompleted = false;
const IDTC_API_BASE = String(window.IDTC_API_BASE_URL || '').trim().replace(/\/+$/, '');
let ecosystemAdTimer = null;
let ecosystemAdDismissed = false;
let ecosystemAdBound = false;
function userApi(path, options = {}) {
  return fetch(`${IDTC_API_BASE}/api/${path}`, { credentials: 'include', ...options });
}
let completeAppLoad;
const appReady = new Promise(resolve => { completeAppLoad = resolve; });
function startLaunchExperience() {
  const screen = document.querySelector('[data-launch-screen]');
  if (!screen) return;
  const splashStartedAt = Date.now();
  const splashDurationMs = 5000;
  const fadeDurationMs = 550;
  screen.querySelector('[data-launch-bubbles]').innerHTML = bubbleFieldMarkup(16, 1);
  const splashDelay = new Promise(resolve => setTimeout(() => {
    screen.classList.add('is-logo');
    screen.setAttribute('aria-label', 'Indonesia Digital Twin Community');
    resolve();
  }, 350));
  Promise.all([splashDelay, appReady]).then(() => setTimeout(() => {
    screen.classList.add('is-leaving');
    setTimeout(() => { screen.hidden = true; }, fadeDurationMs);
  }, Math.max(0, splashDurationMs - (Date.now() - splashStartedAt) - fadeDurationMs)));
}
function getCurrentSession() {
  if (databaseAuthMode) return databaseSession;
  try { return JSON.parse(localStorage.getItem('idtc-session') || 'null'); } catch { return null; }
}
function getLocalUsers() {
  try { const users = JSON.parse(localStorage.getItem('idtc-users') || '[]'); return Array.isArray(users) ? users : []; } catch { return []; }
}
async function migrateLegacyPasswords() {
  const users = getLocalUsers();
  let changed = false;
  try {
    for (const user of users) {
      if (typeof user.password !== 'string') continue;
      Object.assign(user, await hashPassword(user.password));
      delete user.password;
      changed = true;
    }
  } catch { return;   }
  if (changed) localStorage.setItem('idtc-users', JSON.stringify(users));
}
function initialRoute() {
  if (!localStorage.getItem('idtc-onboarding-seen')) return 'onboarding';
  return getCurrentSession() ? 'home' : 'auth';
}
const routeHistory = [location.hash.slice(1) || initialRoute()];
let homeCarouselTimer = null;
const onboardingSlides = [
  { kicker: 'INDONESIA DIGITAL TWIN COMMUNITY', title: 'Satu data.<br>Satu masa depan.', text: 'Ruang kolaborasi untuk membangun ekosistem Digital Twin Indonesia.', image: 'assets/img/dni/ITDC_icon.png', alt: 'Ikon Indonesia Digital Twin Community' },
  { kicker: 'TWini MERCHANDISE', title: 'Selamat datang di TwiniShop.', text: 'Jelajahi merchandise dan koleksi komunitas Digital Twin Indonesia.', image: 'assets/img/dni/twini-shop-onboarding.png', alt: 'Maskot TwiniShop' },
  ...Array.from({ length: 16 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return { kicker: `CERITA IDTC ${number} / 16`, title: 'Kolaborasi untuk masa depan digital.', text: `Dokumentasi komunitas dan perjalanan IDTC ${number}.`, image: `assets/img/dni/ITDC_${number}.jpeg`, alt: `Dokumentasi IDTC ${number}` };
  })
];
const HERO_SLIDES = [
  { image: 'assets/img/pokja/hero-maskot.jpg', alt: 'Visual kota dan maskot IDTC', kicker: 'KONSEP DASAR', title: 'Apa itu Digital Twin?', text: 'Representasi virtual yang terhubung dengan kondisi nyata melalui data.' },
  { image: 'assets/img/pokja/sapujagad.jpg', alt: 'Proyek ekosistem Digital Twin Indonesia', kicker: 'KONTEKS INDONESIA', title: 'Indonesia dalam model digital', text: 'Hubungkan data, tempat, dan sistem untuk memahami kondisi secara menyeluruh.' },
  { image: 'assets/img/pokja/pokja1.jpg', alt: 'Kolaborasi standar dan kebijakan Digital Twin', kicker: 'STANDAR TERBUKA', title: 'Sistem yang saling terhubung', text: 'Standar dan interoperabilitas membantu Digital Twin bekerja lintas platform.' },
  { image: 'assets/img/pokja/pokja2.jpg', alt: 'Kelompok kerja pilot project IDTC', kicker: 'PILOT PROJECT', title: 'Mulai dari masalah nyata', text: 'Uji manfaat Digital Twin melalui pilot yang terukur dan dapat direplikasi.' },
  { image: 'assets/img/pokja/pokja3.jpg', alt: 'Pengembangan SDM dan ekosistem Digital Twin', kicker: 'SDM & EKOSISTEM', title: 'Teknologi tumbuh bersama talenta', text: 'Bangun kemampuan lintas disiplin untuk merancang dan mengelola Digital Twin.' },
  { image: 'assets/img/pokja/sekretariatan.jpg', alt: 'Komunitas IDTC berkolaborasi', kicker: 'KOLABORASI', title: 'Banyak sektor, satu ekosistem', text: 'Pemerintah, akademisi, industri, dan komunitas bergerak bersama.' },
  { image: 'assets/img/produk/dt-f-01.jpg', alt: 'Kerangka klasifikasi standar Digital Twin Indonesia', kicker: 'KERANGKA KERJA', title: 'Bangun fondasi yang konsisten', text: 'Terminologi, arsitektur, data, dan tata kelola memberi arah implementasi.' },
  { image: 'assets/img/struktur-kepengurusan.jpeg', alt: 'Struktur kepengurusan IDTC', kicker: 'TATA KELOLA', title: 'Peran yang jelas, dampak terarah', text: 'Tata kelola menjaga tujuan, tanggung jawab, dan penggunaan data.' },
  { image: 'assets/img/profil-anggota.jpeg', alt: 'Profil anggota ekosistem IDTC', kicker: 'EKOSISTEM DATA', title: 'Data memberi konteks', text: 'Data yang berkualitas membantu model digital merefleksikan dunia nyata.' },
  { image: 'assets/img/struktur-grup-whatsapp.jpeg', alt: 'Ruang komunikasi komunitas IDTC', kicker: 'MASA DEPAN DIGITAL', title: 'Belajar, berbagi, membangun', text: 'Kolaborasi berkelanjutan mengubah wawasan menjadi solusi nyata.' }
];

const esc = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[char]));
const photoSrc = value => value ? `${value}?v=4` : '';
const percent = (value, total) => Math.round(value / total * 100);
const colorClass = color => color === 'orange' ? 'orange' : color === 'purple' ? 'purple' : '';
const sectionHead = (label, title, note = '') => `<div class="section-head"><div><p class="section-label">${label}</p><h2>${title}</h2>${note ? `<p class="section-note">${note}</p>` : ''}</div></div>`;
const PROFILE_AVATARS = [
  { id: 'student', label: 'Mahasiswa', icon: '🎓' },
  { id: 'educator', label: 'Pendidik', icon: '📚' },
  { id: 'researcher', label: 'Peneliti', icon: '🔬' },
  { id: 'technology', label: 'Teknologi', icon: '💻' },
  { id: 'policy', label: 'Kebijakan', icon: '🏛️' },
  { id: 'geospatial', label: 'Geospasial', icon: '🌍' }
];
function profileAvatarId(value) {
  return PROFILE_AVATARS.some(avatar => avatar.id === value) ? value : 'student';
}
function profilePhotoUrl(session) {
  const source = session.avatarSource || (session.avatarPhoto ? 'upload' : 'google');
  if (source === 'preset') return '';
  const candidate = source === 'upload' ? session.avatarPhoto : session.picture || session.photoURL || session.avatarUrl || '';
  return /^(https:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(candidate) ? candidate : '';
}
function profileAvatarMarkup(session) {
  const avatar = PROFILE_AVATARS.find(item => item.id === profileAvatarId(session.avatar)) || PROFILE_AVATARS[0];
  const photo = profilePhotoUrl(session);
  return photo ? `<img src="${esc(photo)}" alt="" data-profile-avatar-image />` : `<span aria-label="Avatar ${avatar.label}">${avatar.icon}</span>`;
}
function profileAccountMarkup(session) {
  if (!session) return '<div class="card account-card"><h3>Akun</h3><p>Kamu belum masuk ke IDTC.</p><a class="button primary profile-signin" href="#auth">Masuk / Daftar</a></div>';
  const selectedAvatar = profileAvatarId(session.avatar);
  const background = PROFILE_AVATARS.find(item => item.id === selectedAvatar).label;
  const avatarSource = session.avatarSource || (session.avatarPhoto ? 'upload' : session.provider === 'google' ? 'google' : 'preset');
  const googleAvatarOption = avatarSource !== 'google' && session.provider === 'google' && profilePhotoUrl({ ...session, avatarSource: 'google' })
    ? '<button type="button" data-profile-google-avatar>Foto Google</button>'
    : '';
  return `<div class="card account-card"><div class="account-card-heading"><div class="account-avatar" data-profile-avatar>${profileAvatarMarkup(session)}</div><div class="account-identity"><p class="section-label">Akun</p><h3 data-profile-name>${esc(session.name || 'Anggota IDTC')}</h3><p data-profile-email>${esc(session.email || '')}</p><small class="account-background" data-profile-background>${background}</small></div><span class="role-badge">${esc(session.role || 'member')}</span></div><p class="account-photo-note">${session.provider === 'google' ? 'Foto akun Google ditampilkan bila tersedia dari layanan autentikasi.' : 'Login Google belum terhubung. Pilih avatar pendidikan atau unggah foto profil.'}</p><div class="account-actions"><button class="button ghost" type="button" data-profile-edit-toggle>Sesuaikan profil</button>${['admin', 'super_admin'].includes(session.role) ? '<a class="button ghost" href="#admin">Buka CMS admin →</a>' : ''}<button class="button account-logout" type="button" data-profile-logout>Keluar akun</button></div><form class="profile-edit-form" data-profile-edit-form hidden><label>Nama lengkap<input name="name" autocomplete="name" required value="${esc(session.name || '')}" /></label><label>Email<input name="email" type="email" autocomplete="email" required value="${esc(session.email || '')}" /></label><label>Latar pendidikan atau bidang<select name="background">${PROFILE_AVATARS.map(avatar => `<option value="${avatar.id}" ${selectedAvatar === avatar.id ? 'selected' : ''}>${avatar.label}</option>`).join('')}</select></label><input type="hidden" name="avatarSource" value="${avatarSource}" /><fieldset class="avatar-picker"><legend>Pilih avatar</legend><div class="avatar-options" role="group" aria-label="Avatar sesuai bidang">${PROFILE_AVATARS.map(avatar => `<button type="button" data-profile-avatar-choice="${avatar.id}" aria-pressed="${selectedAvatar === avatar.id}"><span>${avatar.icon}</span><small>${avatar.label}</small></button>`).join('')}${googleAvatarOption}</div></fieldset><label>Foto profil<input type="file" accept="image/jpeg,image/png,image/webp" data-profile-photo-input /><small>Pilih foto JPG, PNG, atau WebP hingga 5 MB. Foto disimpan di perangkat ini.</small></label><button class="button primary" type="submit">Simpan profil</button><p class="profile-edit-status" data-profile-edit-status role="status"></p></form></div>`;
}

function onboarding() {
  const slides = onboardingSlides.map((slide, index) => `<article class="onboarding-slide" data-slide="${index}"><div class="onboarding-visual"><img ${index === 0 ? `src="${slide.image}" loading="eager" fetchpriority="high"` : `data-src="${slide.image}" loading="lazy"`} decoding="async" alt="${esc(slide.alt)}" /><i class="orbit orbit-a"></i><i class="orbit orbit-b"></i></div><div class="onboarding-copy"><p class="onboarding-kicker">${slide.kicker}</p><h1>${slide.title}</h1><p>${slide.text}</p><small class="onboarding-count">${index + 1} / ${onboardingSlides.length}</small></div></article>`).join('');
  return `<section class="onboarding" aria-label="Pengenalan IDTC">${bubbleFieldMarkup(12, 1.35)}<button class="onboarding-skip" type="button" data-onboarding-skip>Lewati</button><div class="onboarding-track">${slides}</div><div class="onboarding-footer"><div class="onboarding-dots" data-onboarding-dots>${onboardingSlides.map((_, index) => `<button type="button" data-slide-dot="${index}" aria-label="Tampilkan slide ${index + 1} dari ${onboardingSlides.length}"></button>`).join('')}</div><div class="onboarding-actions"><button class="onboarding-back" type="button" data-onboarding-back>←</button><button class="button primary onboarding-next" type="button" data-onboarding-next>Berikutnya <span>→</span></button></div></div></section>`;
}

function idtcAppAboutMarkup() {
  return `<details class="idtc-about"><summary class="about-ribbon"><span><small>TENTANG APLIKASI</small><strong>IDTC Mobile</strong></span><span class="about-ribbon-icon" aria-hidden="true">+</span></summary><div class="about-content"><p class="idtc-about-description">Aplikasi komunitas Indonesia Digital Twin Community untuk belajar, berkolaborasi, mengenal Pokja, dan menjelajahi karya serta merchandise IDTC.</p><div class="idtc-about-grid"><article><h3>Fitur aplikasi</h3><ul><li>Materi dan jalur belajar Digital Twin</li><li>Informasi pengurus dan tiga Pokja</li><li>Profil anggota dan pengaturan aplikasi</li><li>TwiniAI dan katalog TwiniShop</li></ul></article><article><h3>Tujuan & manfaat</h3><ul><li>Menghubungkan pemerintah, akademisi, industri, dan komunitas</li><li>Mendukung literasi serta kolaborasi Digital Twin</li><li>Membantu gagasan berkembang menjadi pilot yang nyata</li></ul></article></div><article class="developer-card">${bubbleFieldMarkup(8, 0.35)}<div class="developer-card-copy"><p class="section-label">DEVELOPER IT</p><h3>Dani Hamdani</h3><p>Pengembang aplikasi IDTC Mobile.</p></div><img class="developer-photo" src="assets/img/dni/aink.jpg" alt="Foto Dani Hamdani, pengembang aplikasi IDTC Mobile" loading="lazy" decoding="async" /></article></div></details>`;
}

function bindOnboarding() {
  const root = app.querySelector('.onboarding');
  if (!root) return;
  let current = 0;
  const slides = [...root.querySelectorAll('.onboarding-slide')];
  const dots = [...root.querySelectorAll('[data-slide-dot]')];
  const next = root.querySelector('[data-onboarding-next]');
  const update = index => { current = Math.max(0, Math.min(index, slides.length - 1)); slides.forEach((slide, i) => slide.classList.toggle('is-visible', i === current)); const image = slides[current].querySelector('img'); image.loading = 'eager'; if (!image.hasAttribute('src')) image.src = image.dataset.src; dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current)); dots[current].scrollIntoView({ block: 'nearest', inline: 'nearest' }); next.innerHTML = current === slides.length - 1 ? 'Mulai menjelajah <span>→</span>' : 'Berikutnya <span>→</span>'; };
  const finish = () => { localStorage.setItem('idtc-onboarding-seen', 'true'); location.hash = 'auth'; };
  next.addEventListener('click', () => current === slides.length - 1 ? finish() : update(current + 1));
  root.querySelector('[data-onboarding-back]').addEventListener('click', () => update(current - 1));
  root.querySelector('[data-onboarding-skip]').addEventListener('click', finish);
  dots.forEach(dot => dot.addEventListener('click', () => update(Number(dot.dataset.slideDot))));
  root.addEventListener('keydown', event => { if (event.key === 'ArrowRight') update(current + 1); if (event.key === 'ArrowLeft') update(current - 1); });
  let startX = 0;
  root.addEventListener('touchstart', event => { startX = event.changedTouches[0].screenX; }, { passive: true });
  root.addEventListener('touchend', event => { const distance = event.changedTouches[0].screenX - startX; if (Math.abs(distance) > 45) update(current + (distance < 0 ? 1 : -1)); }, { passive: true });
  root.tabIndex = 0; root.focus(); update(0);
}

function auth() {
  return `<section class="auth-page"><div class="auth-backdrop" aria-hidden="true"><span></span><span></span><span></span></div><div class="auth-card"><a class="auth-mark" href="#home" aria-label="Kembali ke Home"><img src="assets/img/emblem-white.png" alt="" /><span>IDTC</span></a><p class="auth-kicker">INDONESIA DIGITAL TWIN COMMUNITY</p><h1 data-auth-title>Selamat datang kembali</h1><p class="auth-intro" data-auth-intro>Masuk untuk melanjutkan perjalananmu di ekosistem Digital Twin Indonesia.</p><div class="auth-tabs"><button type="button" class="is-active" data-auth-mode="login">Masuk</button><button type="button" data-auth-mode="register">Daftar Member</button></div><form class="auth-form" data-auth-form><label class="auth-name-field" hidden>Nama lengkap<input name="name" type="text" placeholder="Nama sesuai identitas" autocomplete="name" maxlength="120" /></label><label>Email<input name="email" type="email" placeholder="nama@institusi.id" autocomplete="email" required /></label><label>Kata sandi<input name="password" type="password" placeholder="Minimal 6 karakter" autocomplete="current-password" minlength="6" required /></label><label class="auth-password-confirm" hidden>Konfirmasi kata sandi<input name="passwordConfirm" type="password" placeholder="Ulangi kata sandi" autocomplete="new-password" /></label><div class="auth-registration-fields" data-auth-registration-fields hidden><label>Nomor WhatsApp<input name="phone" type="tel" placeholder="+62 812 3456 7890" autocomplete="tel" maxlength="24" required /></label><label>Institusi / organisasi<input name="organization" type="text" placeholder="Nama institusi atau komunitas" autocomplete="organization" maxlength="160" required /></label><label>Jabatan / profesi<input name="position" type="text" placeholder="Contoh: GIS Analyst" autocomplete="organization-title" maxlength="120" required /></label><label>Provinsi<input name="province" type="text" placeholder="Provinsi domisili" autocomplete="address-level1" maxlength="80" required /></label><label>Kota / kabupaten<input name="city" type="text" placeholder="Kota atau kabupaten" autocomplete="address-level2" maxlength="80" required /></label><label>Bidang minat<select name="interest" required><option value="">Pilih bidang minat</option><option>Standar & interoperabilitas</option><option>Infrastruktur & lingkungan</option><option>Data & teknologi</option><option>Pengembangan SDM</option><option>Kebijakan & tata kelola</option><option>Lainnya</option></select></label><label class="auth-profile-wide">LinkedIn <span>(opsional)</span><input name="linkedin" type="url" placeholder="https://linkedin.com/in/namamu" autocomplete="url" maxlength="240" /></label><label class="auth-profile-wide">Tentang kamu <span>(opsional)</span><textarea name="bio" placeholder="Ceritakan pengalaman atau minatmu pada Digital Twin" maxlength="500" rows="3"></textarea></label><div class="auth-photo-field auth-profile-wide"><label for="auth-profile-photo">Foto profil <span>(opsional)</span></label><div class="auth-photo-control"><div class="auth-photo-preview" data-photo-preview aria-hidden="true">ID</div><div><input id="auth-profile-photo" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG, atau WebP. Ukuran maksimum 2 MB.</small></div></div></div></div><button class="button primary auth-submit" type="submit" data-auth-submit>Masuk ke IDTC <span>→</span></button></form><div class="auth-divider"><span>atau lanjutkan dengan</span></div><button class="google-button" type="button" data-google-auth><span class="google-g">G</span> Lanjutkan dengan Google</button><p class="auth-status" data-auth-status role="status"></p><p class="auth-legal">Dengan melanjutkan, kamu menyetujui ruang kolaborasi terbuka IDTC.</p></div>${idtcAppAboutMarkup()}</section>`;
}

function registrationSuccess() {
  if (!registrationCompleted) {
    location.hash = getCurrentSession() ? 'home' : 'auth';
    return '';
  }
  document.body.classList.add('auth-mode');
  const message = databaseAuthMode
    ? 'Pendaftaran Anda berhasil. Data sudah tersimpan di database IDTC.'
    : 'Pendaftaran berhasil, tetapi data tersimpan di perangkat ini dan belum masuk ke database IDTC.';
  return `<section class="auth-page"><div class="auth-card"><a class="auth-mark" href="#home" aria-label="Kembali ke Home"><img src="assets/img/emblem-white.png" alt="" /><span>IDTC</span></a><p class="auth-kicker">PENDAFTARAN IDTC</p><h1>Pendaftaran berhasil</h1><p class="auth-intro">${message}</p><p class="auth-local-notice">${esc(getCurrentSession()?.name || 'Anggota IDTC')} · ${esc(getCurrentSession()?.email || '')}</p><a class="button primary" href="#home">Masuk ke IDTC <span>→</span></a></div></section>`;
}

function bindAuth() {
  const root = app.querySelector('.auth-page');
  if (!root) return;
  root.querySelector('input[name="linkedin"]')?.closest('label')?.remove();
  let mode = 'login';
  const title = root.querySelector('[data-auth-title]');
  const intro = root.querySelector('[data-auth-intro]');
  const nameField = root.querySelector('.auth-name-field');
  const passwordField = root.querySelector('input[name="password"]');
  const passwordConfirmField = root.querySelector('.auth-password-confirm');
  const registrationFields = root.querySelector('[data-auth-registration-fields]');
  const photoInput = root.querySelector('input[name="profilePhoto"]');
  const photoPreview = root.querySelector('[data-photo-preview]');
  const submit = root.querySelector('[data-auth-submit]');
  const status = root.querySelector('[data-auth-status]');
  const registerTab = root.querySelector('[data-auth-mode="register"]');
  const bootstrapField = document.createElement('label');
  bootstrapField.className = 'auth-bootstrap-field';
  bootstrapField.hidden = true;
  bootstrapField.append(document.createTextNode('Token bootstrap Super Admin'));
  const bootstrapInput = document.createElement('input');
  bootstrapInput.name = 'bootstrapToken';
  bootstrapInput.type = 'password';
  bootstrapInput.autocomplete = 'off';
  bootstrapField.append(bootstrapInput);
  nameField.after(bootstrapField);
  registerTab.hidden = databaseAuthMode && !databaseRegistrationEnabled && !databaseBootstrapRequired;
  const localNotice = document.createElement('p');
  localNotice.className = 'auth-local-notice';
  localNotice.textContent = databaseAuthMode
    ? 'Akun dikelola di server PostgreSQL. Pendaftaran baru menjadi Member; bootstrap token hanya diperlukan untuk Super Admin pertama.'
    : 'Pendaftaran pertama pada perangkat ini menjadi Super Admin lokal. Akun dan CMS tersimpan di perangkat ini dan belum tersinkron ke server.';
  root.querySelector('.auth-legal').insertAdjacentElement('beforebegin', localNotice);
  const updateMode = nextMode => { mode = nextMode; const register = mode === 'register'; title.textContent = register ? 'Daftar sebagai member' : 'Selamat datang kembali'; intro.textContent = register ? 'Lengkapi profil untuk bergabung dengan Indonesia Digital Twin Community.' : 'Masuk untuk melanjutkan perjalananmu di ekosistem Digital Twin Indonesia.'; nameField.hidden = !register; nameField.querySelector('input').required = register; registrationFields.hidden = !register; registrationFields.querySelectorAll('input:not([type="file"]), select').forEach(field => { field.required = register && !field.closest('label')?.querySelector('span'); }); passwordConfirmField.hidden = !register; passwordConfirmField.querySelector('input').required = register; root.classList.toggle('is-registering', register); bootstrapField.hidden = !register || !databaseAuthMode || !databaseBootstrapRequired; root.querySelector('[data-auth-form] button[data-auth-submit]').hidden = databaseAuthMode && register && !databaseRegistrationEnabled; passwordField.minLength = register ? 12 : 6; passwordField.placeholder = register ? 'Minimal 12 karakter' : 'Kata sandi'; passwordField.autocomplete = register ? 'new-password' : 'current-password'; submit.innerHTML = register ? 'Daftar sebagai member <span>→</span>' : 'Masuk ke IDTC <span>→</span>'; root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.authMode === mode)); status.textContent = ''; };
  updateMode('login');
  root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.addEventListener('click', () => updateMode(tab.dataset.authMode)));
  const registrationDisclosure = document.createElement('details');
  registrationDisclosure.className = 'auth-registration-disclosure';
  registrationDisclosure.hidden = true;
  const registrationSummary = document.createElement('summary');
  registrationSummary.innerHTML = 'Info profil tambahan <span>Opsional</span>';
  registrationFields.before(registrationDisclosure);
  registrationDisclosure.append(registrationSummary, registrationFields);
  root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.addEventListener('click', () => {
    const registering = tab.dataset.authMode === 'register';
    registrationDisclosure.hidden = !registering;
    registrationDisclosure.open = false;
    registrationFields.hidden = false;
    registrationFields.querySelectorAll('input:not([type="file"]), select').forEach(field => { field.required = false; });
    passwordConfirmField.hidden = true;
    passwordConfirmField.querySelector('input').required = false;
    if (registering) intro.textContent = 'Daftar dengan nama, email, dan kata sandi. Info profil lainnya bisa dilewati.';
  }));
  photoInput.addEventListener('change', () => {
    const photo = photoInput.files[0];
    if (!photo) { photoPreview.replaceChildren(document.createTextNode('ID')); photoPreview.setAttribute('aria-hidden', 'true'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 2 * 1024 * 1024) {
      status.textContent = photo.size > 2 * 1024 * 1024 ? 'Ukuran foto melebihi batas 2 MB.' : 'Format foto harus JPG, PNG, atau WebP.';
      photoInput.value = '';
      return;
    }
    status.textContent = '';
    const preview = document.createElement('img');
    preview.alt = 'Pratinjau foto profil';
    preview.src = URL.createObjectURL(photo);
    photoPreview.replaceChildren(preview);
    photoPreview.setAttribute('aria-hidden', 'false');
  });
  root.querySelector('[data-auth-form]').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));
    const users = getLocalUsers();
    const submitButton = root.querySelector('[data-auth-submit]');
    const profilePhotoFile = photoInput.files[0];
    if (mode === 'register' && profilePhotoFile && profilePhotoFile.size > 2 * 1024 * 1024) { status.textContent = 'Ukuran foto melebihi batas 2 MB.'; return; }
    const profile = mode === 'register' ? {
      phone: String(form.get('phone')).trim(),
      organization: String(form.get('organization')).trim(),
      position: String(form.get('position')).trim(),
      province: String(form.get('province')).trim(),
      city: String(form.get('city')).trim(),
      interest: String(form.get('interest')).trim(),
      bio: String(form.get('bio')).trim(),
    } : null;
    submitButton.disabled = true;
    status.textContent = '';
    try {
      let profilePhoto = null;
      if (profilePhotoFile) profilePhoto = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
        reader.readAsDataURL(profilePhotoFile);
      });
      if (databaseAuthMode) {
        const endpoint = mode === 'register' ? 'auth/register' : 'auth/login';
        const response = await userApi(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: form.get('name'), email, password, bootstrapToken: form.get('bootstrapToken'), profile, profilePhoto }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { status.textContent = result.error || 'Permintaan akun gagal.'; return; }
        databaseSession = result.user;
        localStorage.removeItem('idtc-session');
        if (mode === 'register') {
          registrationCompleted = true;
          location.hash = 'registration-success';
        } else location.hash = 'home';
        return;
      }
      if (mode === 'register') {
        const name = String(form.get('name')).trim();
        if (users.some(user => user.email === email)) { status.textContent = 'Email ini sudah terdaftar. Silakan masuk.'; return; }
        const role = users.some(user => user.role === 'super_admin') ? 'member' : 'super_admin';
        const passwordRecord = await hashPassword(password);
        users.push({ name, email, ...passwordRecord, role, profile, profilePhoto, createdAt: new Date().toISOString() });
        localStorage.setItem('idtc-users', JSON.stringify(users));
        localStorage.setItem('idtc-session', JSON.stringify({ name, email, role }));
        registrationCompleted = true;
        location.hash = 'registration-success';
        return;
      }
      const user = users.find(item => item.email === email);
      const authorized = user ? await verifyPassword(password, user) : false;
      if (!user || !authorized) { status.textContent = 'Email atau kata sandi belum sesuai.'; return; }
      let role = user.role || 'member';
      if (!users.some(item => item.role === 'super_admin')) {
        role = 'super_admin';
        user.role = role;
        localStorage.setItem('idtc-users', JSON.stringify(users));
      }
      localStorage.setItem('idtc-session', JSON.stringify({ name: user.name, email, role }));
      location.hash = 'home';
    } catch {
      status.textContent = mode === 'register' && profilePhotoFile ? 'Foto tidak dapat dibaca atau dikirim. Coba gunakan file gambar lain.' : databaseAuthMode ? 'Server akun tidak dapat dijangkau. Coba lagi saat koneksi tersedia.' : 'Penyimpanan sandi aman tidak tersedia di browser ini. Perbarui Android System WebView atau gunakan browser modern.';
    } finally {
      submitButton.disabled = false;
    }
  });
  root.querySelector('[data-google-auth]').addEventListener('click', () => { status.textContent = 'Login Google siap digunakan setelah Google Client ID dikonfigurasi.'; });
}

function home() {
  const { anggota, struktur, produk } = data;
  const map = '<div class="hero-map" aria-hidden="true"><img src="assets/img/indonesia-map.svg?v=2" alt="" loading="lazy" decoding="async" /></div>';
  return `<section class="hero">${map}<div class="hero-content"><p class="eyebrow">Connect · Collaborate · Innovate</p><h1>Satu Data, Satu Visi, <em>Satu Masa Depan</em></h1><p>Wadah kolaborasi pemerintah, akademisi, BUMN, dan swasta untuk membangun ekosistem Digital Twin Indonesia melalui pilot project nyata.</p><div class="hero-actions"><a class="button primary" href="#pokja">Jelajahi Pokja ↗</a><a class="button ghost" href="https://github.com/idtc-id" target="_blank" rel="noreferrer">Berkontribusi</a></div><img class="hero-art" src="assets/img/pokja/hero-maskot.jpg" alt="Maskot IDTC dan model digital twin kota" /></div></section><section class="section">${sectionHead('Snapshot komunitas','Kolaborasi yang bergerak','Data terbaru dari komunitas IDTC')}<div class="stat-grid"><div class="stat"><strong>${anggota.respons}</strong><span>Responden anggota</span></div><div class="stat"><strong>3</strong><span>Kelompok kerja</span></div><div class="stat"><strong>${produk.length}</strong><span>Produk terbaru</span></div></div>${sectionHead('Fokus kerja','Dari standar ke dampak')}<div class="card"><h3>Indonesia Digital Twin Community</h3><p>Netral platform, data sesuai izin, terbuka dan terdokumentasi. Semua kontribusi diarahkan untuk infrastruktur, lingkungan, dan masyarakat yang lebih baik.</p><div class="chips"><span class="chip">Standar terbuka</span><span class="chip orange">Pilot nyata</span><span class="chip purple">SDM & ekosistem</span></div></div></section>`;
}
function heroCarouselMarkup() {
  const slides = HERO_SLIDES.map((slide, index) => `<article class="hero-slide${index === 0 ? ' is-active' : ''}" data-carousel-slide role="group" aria-roledescription="slide" aria-label="${index + 1} dari ${HERO_SLIDES.length}" aria-hidden="${index !== 0}"><img class="hero-slide-image" src="${esc(slide.image)}" alt="${esc(slide.alt)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} /><div class="hero-slide-shade" aria-hidden="true"></div><div class="hero-slide-copy"><p class="hero-slide-kicker">${esc(slide.kicker)}</p><h2>${esc(slide.title)}</h2><p>${esc(slide.text)}</p></div></article>`).join('');
  const indicators = HERO_SLIDES.map((slide, index) => `<button class="hero-carousel-dot${index === 0 ? ' is-active' : ''}" type="button" data-carousel-to="${index}" aria-label="Tampilkan slide ${index + 1}: ${esc(slide.title)}" aria-pressed="${index === 0}"></button>`).join('');
  return `<section class="hero-carousel" data-home-carousel role="region" aria-roledescription="carousel" aria-label="Digital Twin dalam 10 cerita"><div class="hero-carousel-track">${slides}</div><div class="hero-carousel-footer"><div class="hero-carousel-dots">${indicators}</div><div class="hero-carousel-controls"><span class="hero-carousel-count" data-carousel-count aria-live="polite">01 / 10</span><button class="hero-carousel-arrow" type="button" data-carousel-prev aria-label="Slide sebelumnya">←</button><button class="hero-carousel-arrow" type="button" data-carousel-next aria-label="Slide berikutnya">→</button></div></div></section>`;
}
function stopHomeCarousel() {
  if (homeCarouselTimer !== null) clearInterval(homeCarouselTimer);
  homeCarouselTimer = null;
}
function bindHomeCarousel() {
  const carousel = app.querySelector('[data-home-carousel]');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
  const dots = [...carousel.querySelectorAll('[data-carousel-to]')];
  const count = carousel.querySelector('[data-carousel-count]');
  let activeIndex = 0;
  const showSlide = index => {
    activeIndex = (index + slides.length) % slides.length;
    const activeImage = slides[activeIndex].querySelector('img');
    if (activeImage) activeImage.loading = 'eager';
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === activeIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
    count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  };
  const startAuto = () => {
    stopHomeCarousel();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    homeCarouselTimer = setInterval(() => showSlide(activeIndex + 1), 4800);
  };
  carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => { showSlide(activeIndex - 1); startAuto(); });
  carousel.querySelector('[data-carousel-next]').addEventListener('click', () => { showSlide(activeIndex + 1); startAuto(); });
  dots.forEach(dot => dot.addEventListener('click', () => { showSlide(Number(dot.dataset.carouselTo)); startAuto(); }));
  carousel.addEventListener('mouseenter', stopHomeCarousel);
  carousel.addEventListener('mouseleave', startAuto);
  carousel.addEventListener('focusin', stopHomeCarousel);
  carousel.addEventListener('focusout', event => { if (!carousel.contains(event.relatedTarget)) startAuto(); });
  let touchStartX = null;
  carousel.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; stopHomeCarousel(); }, { passive: true });
  carousel.addEventListener('touchend', event => {
    if (touchStartX !== null) {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 40) showSlide(activeIndex + (distance < 0 ? 1 : -1));
    }
    touchStartX = null;
    startAuto();
  }, { passive: true });
  carousel.addEventListener('touchcancel', () => { touchStartX = null; startAuto(); }, { passive: true });
  startAuto();
}
function handbookInlineMarkup(text, sourceUrl) {
  const inlineToken = /\[([^\]]+)\]\(([^)]+)\)|<((?:https?:\/\/)[^>]+)>|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let html = '';
  let lastIndex = 0;
  for (const match of text.matchAll(inlineToken)) {
    html += esc(text.slice(lastIndex, match.index));
    if (match[1] !== undefined || match[3] !== undefined) {
      const label = match[1] ?? match[3];
      let href = match[2] ?? match[3];
      try {
        href = new URL(href, sourceUrl).href;
      } catch {
        html += esc(label);
        lastIndex = match.index + match[0].length;
        continue;
      }
      if (!/^https?:$/.test(new URL(href).protocol)) {
        html += esc(label);
      } else {
        html += `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
      }
    } else if (match[4] !== undefined) {
      html += `<code>${esc(match[4])}</code>`;
    } else if (match[5] !== undefined) {
      html += `<strong>${esc(match[5])}</strong>`;
    } else {
      html += `<em>${esc(match[6])}</em>`;
    }
    lastIndex = match.index + match[0].length;
  }
  return html + esc(text.slice(lastIndex));
}
function handbookMarkdown(markdown, sourceUrl) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  const inline = text => handbookInlineMarkup(text, sourceUrl);
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const isTableDivider = line => /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
  const tableCells = line => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim());

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }
    if (line.startsWith('```')) {
      flushParagraph();
      index += 1;
      const code = [];
      while (index < lines.length && !lines[index].trim().startsWith('```')) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1].length + 2, 6);
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      flushParagraph();
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) quote.push(lines[index++].trim().slice(2));
      blocks.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
      continue;
    }
    if (/^(?:---+|___+|\*\*\*+)$/.test(line)) {
      flushParagraph();
      blocks.push('<hr />');
      index += 1;
      continue;
    }
    if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1].trim())) {
      flushParagraph();
      const headers = tableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().includes('|')) rows.push(tableCells(lines[index++].trim()));
      blocks.push(`<div class="pokja-handbook-table-wrap"><table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${inline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^(?:[-*+]\s+|\d+\.\s+)/.test(line)) {
      flushParagraph();
      const ordered = /^\d+\.\s+/.test(line);
      const items = [];
      while (index < lines.length && /^(?:[-*+]\s+|\d+\.\s+)/.test(lines[index].trim())) {
        items.push(lines[index++].trim().replace(/^(?:[-*+]\s+|\d+\.\s+)/, ''));
      }
      const tag = ordered ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }
    paragraph.push(line);
    index += 1;
  }
  flushParagraph();
  return blocks.join('');
}
function pokjaHandbookMarkup(handbook, chapters = [], pokjaNumber = 1) {
  if (!handbook) return '';
  const handbookTitle = handbook.judul || `Handbook Pokja ${pokjaNumber}`;
  const targetTitle = handbook.targetTitle || `Target Pokja ${pokjaNumber}`;
  const chaptersMarkup = handbook.documents.map((document, index) => {
    const chapter = chapters[index];
    if (!chapter) return '';
    return `<details class="pokja-handbook-chapter"><summary><span>${esc(document.judul)}</span><span class="pokja-handbook-toggle" aria-hidden="true">+</span></summary><article class="pokja-handbook-article">${handbookMarkdown(chapter.content, chapter.url)}<p class="pokja-handbook-attribution">Sumber: <a href="${esc(chapter.url)}" target="_blank" rel="noopener noreferrer">${esc(handbookTitle)} — Bab ${String(index + 1).padStart(2, '0')}</a> · <a href="${esc(handbook.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(handbook.license)}</a></p></article></details>`;
  }).join('');
  const targets = handbook.target?.length ? `<h5>${esc(targetTitle)}</h5><ul class="pokja-handbook-targets">${handbook.target.map(target => `<li>${esc(target)}</li>`).join('')}</ul>` : '';
  const contributions = handbook.kontribusi?.length ? `<h5>Cara terlibat</h5><div class="pokja-handbook-actions">${handbook.kontribusi.map(item => `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.judul)} <span aria-hidden="true">↗</span></a>`).join('')}</div>` : '';
  const repositoryLinks = `<a class="button primary pokja-handbook-repo" href="${esc(handbook.repoUrl)}" target="_blank" rel="noopener noreferrer">Buka Handbook Pokja ${pokjaNumber} ↗</a>${handbook.standarUrl ? `<a class="button ghost pokja-handbook-repo" href="${esc(handbook.standarUrl)}" target="_blank" rel="noopener noreferrer">Lihat standar & panduan ↗</a>` : ''}`;
  return `<details class="pokja-handbook"><summary><span><strong>${esc(handbookTitle)}</strong><small>${handbook.documents.length} bab · materi lengkap</small></span><span class="pokja-handbook-toggle" aria-hidden="true">+</span></summary><div class="pokja-handbook-content"><p>${esc(handbook.ringkasan)}</p>${targets}<h5>Materi per bab</h5><div class="pokja-handbook-chapters">${chaptersMarkup}</div>${contributions}${repositoryLinks}</div></details>`;
}
function pokja() {
  const cards = data.struktur.pokja.map(item => {
    const program = item.arahProgram ? `<section class="pokja-program" aria-label="Arahan program kerja POKJA ${item.nomor}"><div class="pokja-program-intro"><p class="section-label">Arahan program kerja</p><h4>Blueprint Digital Twin Indonesia</h4><p>${esc(item.arahProgram.ringkasan)}</p></div><h5>Bidang kerja</h5><ol class="pokja-program-workstreams">${item.arahProgram.bidangKerja.map((workstream, index) => `<li><span class="pokja-program-number">${String(index + 1).padStart(2, '0')}</span><div><strong>${esc(workstream.judul)}</strong><p>${esc(workstream.cakupan)}</p></div></li>`).join('')}</ol><section class="pokja-program-outputs"><h5>Keluaran konkret</h5>${item.arahProgram.keluaran.map(output => `<div><strong>${esc(output.judul)}</strong><p>${esc(output.cakupan)}</p></div>`).join('')}</section><section class="pokja-program-distinction"><h5>Pembeda model 3D dan Digital Twin</h5>${item.arahProgram.pembeda.map(point => `<div><strong>${esc(point.judul)}</strong><p>${esc(point.cakupan)}</p></div>`).join('')}</section></section>` : '';
    const handbook = item.handbook ? pokjaHandbookMarkup(item.handbook, data.handbooks[item.id]?.chapters || [], item.nomor) : '';
    return `<article class="card pokja-card"><div class="color-bar ${colorClass(item.warna)}"></div><img class="pokja-image" src="${esc(item.banner)}" alt="${esc(item.nama)}" onerror="this.style.display='none'" /><div class="card-body"><p class="role ${colorClass(item.warna)}">POKJA ${item.nomor}</p><h3>${esc(item.nama)}</h3><p>${esc(item.slogan)}</p><div class="chips">${item.fokus.slice(0,4).map(tag => `<span class="chip ${colorClass(item.warna)}">${esc(tag)}</span>`).join('')}</div><p style="margin-top:13px"><b>Ketua:</b> ${esc(item.ketua.nama)}</p>${handbook}${program}</div></article>`;
  }).join('');
  return `<section class="section">${sectionHead('Kelompok kerja','Tiga jalur dampak','Setiap Pokja mengubah gagasan menjadi kontribusi yang terukur.')} ${cards}</section>`;
}

function pilotProjectPage() {
  const pilot = data.struktur.pokja.find(item => item.id === 'pokja2');
  if (!pilot) return `<section class="section"><h1>Data pilot project belum tersedia</h1></section>`;
  const program = pilot.arahProgram || {};
  const stages = pilot.fokus || [];
  const workstreams = program.bidangKerja || [];
  const outputs = program.keluaran || pilot.output || [];
  const distinction = program.pembeda || [];
  return `<section class="section pilot-project-page">${sectionHead('POKJA 2 · IMPLEMENTASI','Pilot Project Digital Twin','Dari kebutuhan nyata menuju implementasi yang dapat diuji, diukur, dan direplikasi.')}<div class="pilot-project-intro"><p>${esc(program.ringkasan || pilot.slogan)}</p><p>Pilot dimulai dari masalah dan keputusan yang perlu didukung, bukan dari pemilihan platform atau pembuatan model 3D semata.</p></div><section class="pilot-project-block" aria-labelledby="pilot-stages-title"><p class="section-label">Siklus implementasi</p><h2 id="pilot-stages-title">Dari seleksi hingga replikasi</h2><ol class="pilot-stage-list">${stages.map((stage, index) => `<li><span class="pilot-stage-number">${String(index + 1).padStart(2, '0')}</span><strong>${esc(stage)}</strong></li>`).join('')}</ol></section><section class="pilot-project-block" aria-labelledby="pilot-workstreams-title"><p class="section-label">Ruang lingkup</p><h2 id="pilot-workstreams-title">Area kerja blueprint</h2><div class="pilot-workstream-list">${workstreams.map((item, index) => `<article class="pilot-workstream"><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(item.judul)}</h3><p>${esc(item.cakupan)}</p></div></article>`).join('')}</div></section><section class="pilot-project-block" aria-labelledby="pilot-output-title"><p class="section-label">Hasil yang dituju</p><h2 id="pilot-output-title">Keluaran pilot</h2><div class="pilot-output-list">${outputs.map((item, index) => `<article><span class="pilot-stage-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(item.judul || item)}</h3><p>${esc(item.cakupan || '')}</p></div></article>`).join('')}</div></section>${distinction.length ? `<section class="pilot-project-block pilot-distinction" aria-labelledby="pilot-distinction-title"><p class="section-label">Kriteria substansi</p><h2 id="pilot-distinction-title">Bukan hanya model 3D</h2><div class="pilot-output-list">${distinction.map(item => `<article><div><h3>${esc(item.judul)}</h3><p>${esc(item.cakupan)}</p></div></article>`).join('')}</div></section>` : ''}<a class="button ghost pilot-project-link" href="#pokja">Lihat struktur dan program POKJA 2 <span aria-hidden="true">↗</span></a></section>`;
}

const ASSESSMENT_STAGES = {
  design: {
    label: 'Design Recognition',
    description: 'Menilai kesiapan rancangan sebelum pilot diimplementasikan.',
    threshold: 70,
    criteria: [
      { id: 'decision-use-case', title: 'Use case dan keputusan target', evidence: 'Tujuan, pengguna keputusan, aset/proses, dan batas masalah terdefinisi.', weight: 2 },
      { id: 'system-boundary', title: 'Batas sistem dan pemangku kepentingan', evidence: 'Pemilik aset/data, operator, integrasi sistem, dan tanggung jawab dicatat.', weight: 1 },
      { id: 'data-readiness', title: 'Kesiapan dan kualitas data', evidence: 'Sumber, pemilik, kualitas, frekuensi, akses, serta kesenjangan data telah dinilai.', weight: 2 },
      { id: 'architecture-interoperability', title: 'Arsitektur dan interoperabilitas', evidence: 'Aliran data, identitas aset, API/format pertukaran, dan integrasi digambarkan.', weight: 2 },
      { id: 'governance-security', title: 'Tata kelola dan keamanan', evidence: 'Klasifikasi data, hak akses, privasi, keamanan, retensi, dan risiko ditinjau.', weight: 2 },
      { id: 'baseline-acceptance', title: 'Baseline KPI dan kriteria penerimaan', evidence: 'KPI awal, metode pengukuran, target pilot, dan bukti penerimaan ditetapkan.', weight: 2 },
    ],
  },
  final: {
    label: 'Final Assessment',
    description: 'Menilai bukti implementasi, hasil operasional, dan manfaat pilot.',
    threshold: 80,
    criteria: [
      { id: 'asset-data-link', title: 'Keterhubungan aset dan data aktual', evidence: 'Identitas aset/representasi terhubung dengan data historis atau operasional yang relevan.', weight: 2 },
      { id: 'data-quality-freshness', title: 'Kualitas dan kemutakhiran data', evidence: 'Validasi kualitas, timestamp, kelengkapan, dan keterlambatan dibuktikan.', weight: 2 },
      { id: 'workflow-use', title: 'Penggunaan dalam workflow', evidence: 'Pengguna sasaran memakai informasi untuk pemantauan atau keputusan yang ditentukan.', weight: 2 },
      { id: 'kpi-evidence', title: 'Hasil KPI terhadap baseline', evidence: 'Hasil dibandingkan dengan baseline dan metode pengukuran dapat ditelusuri.', weight: 3 },
      { id: 'security-operation', title: 'Keamanan dan operasi', evidence: 'Hak akses, audit, pemulihan, pemeliharaan, dan penanganan insiden diuji.', weight: 2 },
      { id: 'replication', title: 'Dokumentasi dan replikasi', evidence: 'Arsitektur, asumsi, batasan, biaya/operasi, dan langkah replikasi didokumentasikan.', weight: 1 },
    ],
  },
};

const PILOT_CATEGORY_ASSESSMENTS = [
  { id: 'kota-mobilitas', name: 'Kota & mobilitas', design: [
    { id: 'mobility-scope', title: 'Cakupan jaringan dan layanan', evidence: 'Koridor, simpang, rute, wilayah, dan periode puncak yang dinilai dipetakan.', weight: 2 },
    { id: 'mobility-baseline', title: 'Baseline mobilitas', evidence: 'Sumber data dan baseline waktu tempuh, antrean, headway, atau insiden direncanakan.', weight: 2 },
  ], final: [
    { id: 'mobility-coverage', title: 'Validasi cakupan operasional', evidence: 'Data lalu lintas/armada terhubung pada lokasi dan interval waktu yang ditetapkan.', weight: 2 },
    { id: 'mobility-outcome', title: 'Hasil layanan dan respons', evidence: 'Perubahan KPI mobilitas dibanding baseline dibuktikan pada periode evaluasi.', weight: 3 },
  ] },
  { id: 'infrastruktur-gedung', name: 'Infrastruktur & gedung', design: [
    { id: 'asset-register', title: 'Inventaris dan identitas aset', evidence: 'Aset BIM/GIS, identitas, kondisi, dan sistem pemeliharaan yang terlibat dipetakan.', weight: 2 },
    { id: 'maintenance-baseline', title: 'Baseline pemeliharaan/energi', evidence: 'Riwayat inspeksi, gangguan, atau konsumsi energi dan metode pembanding tersedia.', weight: 2 },
  ], final: [
    { id: 'asset-state-validation', title: 'Validasi kondisi aset', evidence: 'Data inspeksi, BIM/GIS, BMS, atau sensor ditautkan dan diverifikasi pada aset.', weight: 2 },
    { id: 'asset-outcome', title: 'Hasil pemeliharaan/energi', evidence: 'Prioritas perbaikan, downtime, atau energi per luas dibanding baseline.', weight: 3 },
  ] },
  { id: 'lingkungan-bencana', name: 'Lingkungan & kebencanaan', design: [
    { id: 'hazard-coverage', title: 'Cakupan bahaya dan wilayah', evidence: 'Area risiko, elevasi/tutupan lahan, drainase atau lokasi sensor ditentukan.', weight: 2 },
    { id: 'alert-design', title: 'Rancangan peringatan dan respons', evidence: 'Ambang, sumber data, latensi, penerima peringatan, dan prosedur respons dirancang.', weight: 2 },
  ], final: [
    { id: 'environment-data-quality', title: 'Kualitas dan cakupan observasi', evidence: 'Kalibrasi, lokasi, ketersediaan data, dan akurasi observasi diuji.', weight: 2 },
    { id: 'environment-outcome', title: 'Kinerja peringatan/dampak', evidence: 'Waktu peringatan, respons, atau perubahan kondisi dibanding baseline dicatat.', weight: 3 },
  ] },
  { id: 'air-energi', name: 'Air & energi', design: [
    { id: 'utility-network', title: 'Topologi dan aset jaringan', evidence: 'Jaringan pipa/kabel, zona layanan, meter, dan titik operasi memiliki identitas.', weight: 2 },
    { id: 'utility-baseline', title: 'Baseline kehilangan/gangguan', evidence: 'Kehilangan air/energi, tekanan, gangguan, atau waktu pemulihan dapat diukur.', weight: 2 },
  ], final: [
    { id: 'utility-telemetry', title: 'Validasi telemetri jaringan', evidence: 'Data meter/tekanan/status cocok dengan aset dan rentang waktu operasional.', weight: 2 },
    { id: 'utility-outcome', title: 'Hasil keandalan utilitas', evidence: 'Anomali, kehilangan, frekuensi gangguan, atau waktu pemulihan dibanding baseline.', weight: 3 },
  ] },
  { id: 'pertanian', name: 'Pertanian', design: [
    { id: 'farm-context', title: 'Konteks lahan dan budidaya', evidence: 'Batas petak, komoditas, fase tanam, kalender, dan sumber cuaca ditentukan.', weight: 2 },
    { id: 'farm-baseline', title: 'Baseline air dan hasil', evidence: 'Pemakaian air, metode irigasi, kondisi tanah, dan hasil per area tersedia.', weight: 2 },
  ], final: [
    { id: 'farm-observation', title: 'Validasi data lahan', evidence: 'Sensor/citra/cuaca diselaraskan dengan lokasi dan fase tanaman.', weight: 2 },
    { id: 'farm-outcome', title: 'Hasil irigasi dan produktivitas', evidence: 'Kecukupan irigasi, penggunaan air, atau hasil panen dibanding baseline.', weight: 3 },
  ] },
  { id: 'industri-manufaktur', name: 'Industri & manufaktur', design: [
    { id: 'factory-scope', title: 'Cakupan lini dan aset produksi', evidence: 'Mesin, lini, sensor, sistem produksi, dan perawatan yang terlibat dipetakan.', weight: 2 },
    { id: 'factory-baseline', title: 'Baseline operasi dan kualitas', evidence: 'Downtime, alarm, OEE, jadwal produksi, atau kualitas produk dapat diukur.', weight: 2 },
  ], final: [
    { id: 'factory-telemetry', title: 'Validasi telemetry dan alarm', evidence: 'Data kondisi mesin, timestamp, kualitas, dan alarm diverifikasi terhadap operasi.', weight: 2 },
    { id: 'factory-outcome', title: 'Hasil operasi dan perawatan', evidence: 'Downtime, OEE, kualitas, atau manfaat perawatan dibanding baseline.', weight: 3 },
  ] },
];

const ASSESSMENT_SCORE_LABELS = [
  'Belum tersedia',
  'Konsep awal',
  'Terdefinisi',
  'Diterapkan/diuji',
  'Terukur dan terbukti',
];

function pilotBenchmarkMarkup(categoryName) {
  const category = PILOT_CATEGORY_ASSESSMENTS.find(item => item.name === categoryName);
  if (!category) return '';
  const renderStage = (stage, title) => `<section><h5>${title}</h5><ul>${category[stage].map(item => `<li><strong>${esc(item.title)}</strong><span>${esc(item.evidence)}</span></li>`).join('')}</ul></section>`;
  return `<details class="pilot-category-benchmark"><summary>Tolok ukur kategori <span>Design Recognition · Final Assessment</span></summary><div class="pilot-benchmark-stages">${renderStage('design','Design Recognition')}${renderStage('final','Final Assessment')}</div></details>`;
}

function ratingTool() {
  queueMicrotask(bindRatingTool);
  return `<section class="section rating-tool-page">${sectionHead('PENILAIAN DIGITAL TWIN','Rating Tool DT','Ukur kesiapan rancangan dan bukti hasil pilot dengan tolok ukur internal per kategori.')}<p class="rating-tool-disclaimer">Skala ini adalah alat penilaian mandiri IDTC, bukan sertifikasi atau keputusan pengakuan resmi. Nilai perlu didukung bukti yang dapat diverifikasi.</p><div class="rating-tool-controls"><label>Pilih kategori<select data-rating-category>${PILOT_CATEGORY_ASSESSMENTS.map(category => `<option value="${esc(category.id)}">${esc(category.name)}</option>`).join('')}</select></label><div class="rating-stage-tabs" role="group" aria-label="Tahap assessment"><button type="button" data-rating-stage="design" aria-pressed="true">Design Recognition</button><button type="button" data-rating-stage="final" aria-pressed="false">Final Assessment</button></div></div><section class="rating-summary" data-rating-summary aria-live="polite"></section><div class="rating-criteria" data-rating-criteria></div><button class="button ghost rating-reset" type="button" data-rating-reset>Reset nilai tahap ini</button><p class="rating-storage-note">Nilai disimpan lokal per akun di perangkat ini; belum tersinkron ke database/server.</p></section>`;
}

function collaborationPage() {
  const partners = [
    { number: '01', sector: 'SEKTOR PUBLIK', name: 'Instansi Pemerintah', description: 'Dukungan kebijakan, tantangan kota, data publik yang layak dibagikan, dan penerapan solusi Digital Twin.', organizations: [
      ['PU','Kementerian Pekerjaan Umum','pu.go.id'],['KIPK','Kemenko Infrastruktur & Pembangunan Kewilayahan','kemenkoinfra.go.id'],['PKP','Kementerian Perumahan & Kawasan Permukiman','pkp.go.id'],['HUB','Kementerian Perhubungan','dephub.go.id'],['ATR','Kementerian Agraria & Tata Ruang','atrbpn.go.id'],['KD','Kementerian Komunikasi & Digital','komdigi.go.id'],['BIG','Badan Informasi Geospasial','big.go.id'],
    ], support: ['Kementerian dan lembaga terkait','Pemerintah daerah dan dinas teknis','Program transformasi digital dan kota cerdas'] },
    { number: '02', sector: 'BUMN & BUMD', name: 'Perusahaan Milik Negara/Daerah', description: 'Kolaborasi studi kasus aset, infrastruktur, energi, transportasi, air, dan fasilitas publik.', organizations: [
      ['ADHI','ADHI KARYA','adhi.co.id'],['PP','PT PP','ptpp.co.id'],['WK','WASKITA KARYA','www.waskita.co.id'],['WIKA','WIJAYA KARYA (WIKA)','wika.co.id'],['HK','HUTAMA KARYA','hutamakarya.com'],['BA','BRANTAS ABIPRAYA','brantas-abipraya.co.id'],
    ], support: ['Tantangan industri berbasis aset','Mentoring dan kunjungan belajar','Hadiah apresiasi untuk pencapaian peserta'] },
    { number: '03', sector: 'TEKNOLOGI & INDUSTRI', name: 'Perusahaan Terkait', description: 'Peluang dukungan perangkat lunak, lisensi edukasi, pelatihan, perangkat, dan keahlian teknis.', organizations: [
      ['ESRI','Esri Indonesia','esri.com'],['AD','Autodesk','autodesk.com'],['TR','Trimble','trimble.com'],['LG','Leica Geosystems','leica-geosystems.com'],['AS','ASABA','asaba.co.id'],['AP','Aptella','aptella.com'],['GS','Graphisoft','graphisoft.com'],['SE','Schneider Electric','se.com'],['AU','PT Autonics Indonesia','autonics.com'],['KY','PT Keyence Indonesia','keyence.com'],['TDK','PT TDK Electronics Indonesia','tdk.com'],['SSD','PT Surya Sarana Dinamika'],['AFU','PT Alfa Fikrindo Utama'],['FM','FM Software'],['TSI','Toyo Sensing Indonesia'],
    ], support: ['Dukungan perangkat lunak dan lisensi edukasi','Pelatihan, perangkat uji, dan keahlian teknis','Transfer pengetahuan dan mentoring implementasi'] },
    { number: '04', sector: 'RISET & TALENTA', name: 'Kampus Pendukung', description: 'Kolaborasi pada kurikulum, riset, proyek mahasiswa, validasi materi, dan mentor.', organizations: [
      ['ITB','ITB','itb.ac.id'],['UI','UI','ui.ac.id'],['UGM','UGM','ugm.ac.id'],['ITS','ITS','its.ac.id'],['IPB','IPB University','ipb.ac.id'],['ITN','ITENAS','itenas.ac.id'],['BINUS','BINUS University','binus.ac.id'],['UNJ','UNJANI','unjani.ac.id'],['TEL-U','Telkom University','telkomuniversity.ac.id'],
    ], support: ['Riset terapan dan validasi materi','Proyek mahasiswa, mentor, dan pengembangan kurikulum','Evaluasi independen dan penguatan talenta Digital Twin'] },
  ];
  queueMicrotask(() => {
    const logoDomains = new Map(partners.flatMap(partner => partner.organizations
      .filter(([, , domain]) => domain)
      .map(([, name, domain]) => [name, domain])));
    const disclaimer = app.querySelector('.collaboration-partner-disclaimer');
    if (disclaimer) disclaimer.textContent = 'Organisasi di bawah relevan untuk dijajaki, bukan mitra terkonfirmasi. Logo hanya untuk identifikasi dan tidak menyatakan dukungan atau afiliasi.';
    app.querySelectorAll('.collaboration-category .partner-brand').forEach(card => {
      const mark = card.querySelector('span');
      const name = card.querySelector('strong')?.textContent;
      const domain = logoDomains.get(name);
      if (!domain) return;
      const link = document.createElement('a');
      link.className = card.className;
      link.href = `https://${domain}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${name} (situs resmi)`);
      const image = document.createElement('img');
      image.className = 'partner-brand__logo';
      image.alt = '';
      image.loading = 'lazy';
      const logoFile = name === 'Aptella' ? 'Aptella.png' : `${domain.replace(/[^a-z0-9]+/gi, '-')}.png`;
      image.src = `assets/img/mitra/${logoFile}`;
      image.addEventListener('load', () => { if (mark) mark.hidden = true; }, { once: true });
      image.addEventListener('error', () => image.remove(), { once: true });
      link.append(image, ...card.childNodes);
      card.replaceWith(link);
    });
  });
  const steps = ['Tentukan masalah dan keputusan yang ingin dibantu.', 'Pilih aset, data, pemilik, dan mitra yang dapat terlibat.', 'Sepakati ruang lingkup pilot, KPI, tata kelola, dan kriteria sukses.', 'Jalankan bersama, evaluasi bukti, lalu dokumentasikan peluang replikasi.'];
  const supportOptions = ['Pendanaan program','Voucher data & belanja','Merchandise IDTC','Lisensi dan perangkat','Mentor & pelatihan','Studi kasus & data'];
  return `<section class="section collaboration-page">${sectionHead('PARTNER EKOSISTEM','Kolaborasi & Dukungan','Ruang kerja sama Digital Twin lintas sektor, dari dukungan kebijakan hingga riset dan talenta.')}<p class="collaboration-intro">Kolaborasi dimulai dari kebutuhan nyata, pembagian peran yang jelas, dan penggunaan data sesuai izin. Dukungan dapat berupa keahlian, testbed, riset, perangkat, pendanaan, atau pengembangan talenta.</p><p class="collaboration-partner-disclaimer">Daftar organisasi di bawah adalah pihak yang relevan untuk dijajaki, bukan pernyataan bahwa mereka telah menjadi mitra atau menyetujui dukungan. Monogram hanya penanda teks; logo resmi belum tersedia pada asset aplikasi.</p><div class="collaboration-category-grid">${partners.map(partner => `<article class="collaboration-category"><p class="collaboration-sector">${esc(partner.sector)}</p><div class="collaboration-category-heading"><span>${partner.number}</span><div><h3>${esc(partner.name)}</h3><p>${esc(partner.description)}</p></div></div><div class="partner-brand-grid" aria-label="Organisasi yang relevan untuk dijajaki">${partner.organizations.map(([mark,name]) => `<div class="partner-brand"><span aria-hidden="true">${esc(mark)}</span><strong>${esc(name)}</strong></div>`).join('')}</div><h4>Bentuk dukungan</h4><ul>${partner.support.map(item => `<li>${esc(item)}</li>`).join('')}</ul></article>`).join('')}</div><section class="collaboration-support-options"><p class="section-label">BENTUK DUKUNGAN</p><h2>Kontribusi yang dapat dikolaborasikan</h2><div>${supportOptions.map((option,index) => `<span><b>${String(index + 1).padStart(2,'0')}</b>${esc(option)}</span>`).join('')}</div></section><section class="collaboration-steps"><p class="section-label">Langkah awal</p><h2>Dari kebutuhan ke pilot bersama</h2><ol>${steps.map((step, index) => `<li><span>${String(index + 1).padStart(2,'0')}</span><p>${esc(step)}</p></li>`).join('')}</ol></section><div class="collaboration-actions"><a class="button primary" href="#pokja">Lihat kelompok kerja <span aria-hidden="true">→</span></a><a class="button ghost" href="https://github.com/idtc-id" target="_blank" rel="noopener noreferrer">Kanal GitHub IDTC ↗</a></div><p class="collaboration-note">Rincian proposal, kontak resmi, dan mekanisme sponsorship perlu ditetapkan pengelola IDTC sebelum publikasi atau aktivasi program.</p></section>`;
}

function ratingStorageKey(category, stage, criterion) {
  const session = getCurrentSession();
  const account = String(session?.id || session?.email || 'guest').trim().toLowerCase();
  return `idtc-rating:${encodeURIComponent(account)}:${category}:${stage}:${criterion}`;
}

function bindRatingTool() {
  const root = app.querySelector('.rating-tool-page');
  if (!root) return;
  const categorySelect = root.querySelector('[data-rating-category]');
  const stageButtons = [...root.querySelectorAll('[data-rating-stage]')];
  const criteriaContainer = root.querySelector('[data-rating-criteria]');
  const summary = root.querySelector('[data-rating-summary]');
  let activeStage = 'design';

  const selectedCategory = () => PILOT_CATEGORY_ASSESSMENTS.find(category => category.id === categorySelect.value) || PILOT_CATEGORY_ASSESSMENTS[0];
  const currentCriteria = () => [...ASSESSMENT_STAGES[activeStage].criteria, ...selectedCategory()[activeStage]];
  const savedScore = criterion => localStorage.getItem(ratingStorageKey(selectedCategory().id, activeStage, criterion.id));
  const renderSummary = criteria => {
    const totalWeight = criteria.reduce((total, item) => total + item.weight, 0);
    const rated = criteria.filter(item => savedScore(item) !== null);
    const ratedWeight = rated.reduce((total, item) => total + item.weight, 0);
    const earned = rated.reduce((total, item) => total + Number(savedScore(item)) * item.weight, 0);
    const score = ratedWeight ? Math.round(earned / (ratedWeight * 4) * 100) : null;
    const coverage = totalWeight ? Math.round(ratedWeight / totalWeight * 100) : 0;
    const threshold = ASSESSMENT_STAGES[activeStage].threshold;
    const status = !rated.length ? 'Belum dinilai' : coverage < 100 ? 'Penilaian belum lengkap' : score >= threshold ? 'Ambang internal tercapai' : 'Perlu perbaikan';
    summary.innerHTML = `<div><small>Nilai tertimbang</small><strong>${score === null ? '—' : `${score}%`}</strong></div><div><small>Cakupan kriteria</small><strong>${coverage}%</strong></div><span class="rating-status">${status}</span>`;
  };
  const renderCriteria = () => {
    const criteria = currentCriteria();
    criteriaContainer.innerHTML = criteria.map((item, index) => {
      const key = ratingStorageKey(selectedCategory().id, activeStage, item.id);
      const saved = localStorage.getItem(key);
      return `<article class="rating-criterion"><div class="rating-criterion-copy"><div class="rating-criterion-heading"><span>${String(index + 1).padStart(2,'0')}</span><h3>${esc(item.title)}</h3><small>Bobot ${item.weight}</small></div><p>${esc(item.evidence)}</p></div><label class="rating-score-select">Nilai<select data-rating-score data-rating-key="${esc(key)}"><option value=""${saved === null ? ' selected' : ''}>Belum dinilai</option>${ASSESSMENT_SCORE_LABELS.map((label, score) => `<option value="${score}"${saved === String(score) ? ' selected' : ''}>${score} · ${label}</option>`).join('')}</select></label></article>`;
    }).join('');
    renderSummary(criteria);
  };

  categorySelect.addEventListener('change', renderCriteria);
  stageButtons.forEach(button => button.addEventListener('click', () => {
    activeStage = button.dataset.ratingStage;
    stageButtons.forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    renderCriteria();
  }));
  criteriaContainer.addEventListener('change', event => {
    const select = event.target.closest('[data-rating-score]');
    if (!select) return;
    if (select.value === '') localStorage.removeItem(select.dataset.ratingKey);
    else localStorage.setItem(select.dataset.ratingKey, select.value);
    renderSummary(currentCriteria());
  });
  root.querySelector('[data-rating-reset]').addEventListener('click', () => {
    currentCriteria().forEach(item => localStorage.removeItem(ratingStorageKey(selectedCategory().id, activeStage, item.id)));
    renderCriteria();
  });
  renderCriteria();
}

function pilotProjectCategoriesMarkup() {
  const categories = [
    {
      name: 'Kota & mobilitas',
      projects: [
        { title: 'Koridor lalu lintas terpadu', summary: 'Menguji skenario pengaturan koridor untuk mengurangi kemacetan dan mempercepat respons insiden.', data: 'Hitung lalu lintas, GPS, pengendali lampu, kondisi jalan, cuaca.', indicators: 'Waktu tempuh, panjang antrean, waktu respons insiden.' },
        { title: 'Angkutan umum terhubung', summary: 'Menghubungkan operasi armada dan jaringan halte untuk memperbaiki keteraturan layanan.', data: 'GPS armada, jadwal, rute, jumlah penumpang, gangguan layanan.', indicators: 'Ketepatan waktu, headway, waktu tunggu, cakupan layanan.' },
      ],
    },
    {
      name: 'Infrastruktur & gedung',
      projects: [
        { title: 'Jembatan dan jaringan jalan', summary: 'Memprioritaskan inspeksi dan pemeliharaan aset berdasarkan kondisi serta tingkat risiko.', data: 'Inventaris GIS/BIM, riwayat inspeksi, lalu lintas, sensor bila tersedia.', indicators: 'Kondisi aset, prioritas perbaikan, waktu penanganan temuan.' },
        { title: 'Operasi gedung hemat energi', summary: 'Membandingkan kondisi operasional gedung dengan baseline untuk menemukan peluang efisiensi.', data: 'BIM/as-built, BMS, meter energi, okupansi, cuaca.', indicators: 'Energi per luas, jam gangguan, kenyamanan ruang.' },
      ],
    },
    {
      name: 'Lingkungan & kebencanaan',
      projects: [
        { title: 'Kawasan rawan banjir', summary: 'Menguji skenario genangan dan alur respons berdasarkan kondisi hujan serta kapasitas drainase.', data: 'Curah hujan, tinggi muka air, drainase, elevasi, tutupan lahan.', indicators: 'Waktu peringatan, luas genangan, waktu respons.' },
        { title: 'Pemantauan kualitas udara', summary: 'Memetakan tren kualitas udara dan membantu menentukan area yang perlu ditindaklanjuti.', data: 'Sensor kualitas udara, cuaca, lalu lintas, lokasi aktivitas.', indicators: 'Tren konsentrasi, cakupan sensor, ketersediaan data.' },
      ],
    },
    {
      name: 'Air & energi',
      projects: [
        { title: 'Jaringan distribusi air', summary: 'Membantu operator mengidentifikasi anomali tekanan dan menentukan prioritas pemeriksaan jaringan.', data: 'Jaringan pipa GIS, meter aliran/tekanan, pemakaian, pekerjaan perbaikan.', indicators: 'Anomali aliran, kehilangan air, waktu penanganan.' },
        { title: 'Keandalan utilitas energi', summary: 'Menyatukan status aset dan gangguan untuk mendukung perencanaan pemeliharaan jaringan.', data: 'Inventaris aset, meter, status operasi, histori gangguan, cuaca.', indicators: 'Durasi/frekuensi gangguan, waktu pemulihan, kondisi aset.' },
      ],
    },
    {
      name: 'Pertanian',
      projects: [
        { title: 'Irigasi presisi', summary: 'Menguji penjadwalan irigasi yang mempertimbangkan kebutuhan tanaman dan kondisi lahan.', data: 'Kelembapan tanah, cuaca, fase tanaman, jaringan irigasi, citra lahan.', indicators: 'Pemakaian air, kecukupan irigasi, hasil panen per area.' },
      ],
    },
    {
      name: 'Industri & manufaktur',
      projects: [
        { title: 'Pemeliharaan prediktif lini produksi', summary: 'Menghubungkan kondisi mesin dan histori perawatan untuk menguji deteksi dini potensi gangguan.', data: 'Telemetri mesin, alarm, jadwal produksi, perawatan, kualitas produk.', indicators: 'Downtime, efektivitas peralatan, akurasi peringatan.' },
      ],
    },
  ];
  return `<details class="pilot-project-block pilot-catalog" data-pilot-catalog>
    <summary class="pilot-catalog-ribbon"><span class="pilot-catalog-eyebrow">Ide use case</span><span class="pilot-catalog-ribbon-title">Proyek berdasarkan kategori</span><span class="pilot-catalog-count">${categories.length} kategori</span></summary>
    <div class="pilot-catalog-content">
      <p class="pilot-catalog-note">Contoh berikut adalah opsi untuk dirumuskan menjadi pilot bersama mitra; bukan daftar proyek yang sudah berjalan.</p>
      <label class="pilot-category-select-label">Pilih kategori<select data-pilot-category-select>${categories.map((category, index) => `<option value="${index}">${esc(category.name)}</option>`).join('')}</select></label>
      <div class="pilot-category-list">${categories.map((category, categoryIndex) => {
        const benchmarks = pilotBenchmarkMarkup(category.name);
        return `<section class="pilot-category" data-pilot-category="${categoryIndex}" aria-labelledby="pilot-category-${categoryIndex}"${categoryIndex ? ' hidden' : ''}><div class="pilot-category-heading"><span>${String(categoryIndex + 1).padStart(2, '0')}</span><h3 id="pilot-category-${categoryIndex}">${esc(category.name)}</h3></div><div class="pilot-project-type-grid">${category.projects.map(project => `<article class="pilot-project-type"><h4>${esc(project.title)}</h4><p>${esc(project.summary)}</p><dl><div><dt>Data awal</dt><dd>${esc(project.data)}</dd></div><div><dt>Indikator</dt><dd>${esc(project.indicators)}</dd></div></dl></article>`).join('')}</div>${benchmarks}</section>`;
      }).join('')}</div>
    </div>
  </details>`;
}

document.addEventListener('change', event => {
  const select = event.target.closest('[data-pilot-category-select]');
  if (!select) return;
  const catalog = select.closest('[data-pilot-catalog]');
  catalog?.querySelectorAll('[data-pilot-category]').forEach(category => { category.hidden = category.dataset.pilotCategory !== select.value; });
});

function pilotProjectPageWithCategories() {
  const page = pilotProjectPage();
  const marker = '<section class="pilot-project-block" aria-labelledby="pilot-stages-title">';
  const insertAt = page.indexOf(marker);
  return insertAt < 0 ? page : `${page.slice(0, insertAt)}${pilotProjectCategoriesMarkup()}${page.slice(insertAt)}`;
}

function pengurus() {
  const { dewanPembina, pengurus, pokja } = data.struktur;
  const leader = item => `<div class="list-item"><div class="person-avatar">${item.foto ? `<img src="${esc(photoSrc(item.foto))}" alt="Foto ${esc(item.nama || 'pengurus')}" onerror="this.hidden=true;this.parentElement.classList.add('photo-missing')" />` : esc((item.nama || '—').slice(0, 1))}</div><div><strong>${esc(item.nama || 'Belum diisi')}</strong><small>${esc(item.peran)}</small></div></div>`;
  const featured = item => `<div class="featured-person"><div class="featured-avatar">${item.foto ? `<img src="${esc(photoSrc(item.foto))}" alt="Foto ${esc(item.nama)}" onerror="this.hidden=true;this.parentElement.classList.add('photo-missing')" />` : esc(item.nama.slice(0, 1))}</div><div><h3>${esc(item.nama)}</h3><p class="role">${esc(item.peran)}</p></div></div>`;
  const pokjaTeams = pokja.map(item => `<section class="pokja-team-unit"><p class="role ${colorClass(item.warna)}">POKJA ${item.nomor}</p><h4>${esc(item.nama)}</h4>${featured(item.ketua)}${item.wakil.map(leader).join('')}</section>`).join('');
  return `<section class="section">${sectionHead('Struktur organisasi','Pengurus IDTC 2026–2029','Kepemimpinan, koordinasi, dan pelaksanaan program.')}<div class="card"><h3>${esc(dewanPembina.title)}</h3>${featured(dewanPembina.ketua)}<p>${esc(dewanPembina.desc)}</p>${dewanPembina.unit.map(unit => `<div class="list-item"><span class="index">◈</span><div><strong>${esc(unit.nama)}</strong><small>${esc(unit.desc)}</small></div></div>`).join('')}</div><div class="card"><h3>${esc(pengurus.title)}</h3>${featured(pengurus.ketua)}${pengurus.wakil.map(leader).join('')}</div><div class="card"><h3>Tim sekretariat</h3>${pengurus.sekjen.map(leader).join('')}</div><div class="card"><h3>Tim Pokja</h3><p>Jajaran ketua dan wakil dari tiga Pokja utama.</p>${pokjaTeams}</div></section>`;
}
function profile() {
  const principles = [
    ['Netral platform', 'Mengutamakan standar terbuka dan interoperabilitas antar sistem dan sektor.'],
    ['Data sesuai izin', 'Data mitra digunakan sesuai kesepakatan dan kebijakan yang berlaku.'],
    ['Terbuka & terdokumentasi', 'Hasil dan pembelajaran dibagikan agar dapat direplikasi.'],
    ['Setara & konstruktif', 'Semua anggota memiliki ruang untuk berkontribusi dan berkembang.']
  ];
  return `<section class="section profile-page">${sectionHead('Profile IDTC','Akun, tentang, dan pengaturan','People · Data · Places · A Brighter Indonesia')}${profileAccountMarkup(getCurrentSession())}<div class="profile-principles">${principles.map(([title, description]) => `<div class="card"><h3>${title}</h3><p>${description}</p></div>`).join('')}</div><div class="card settings-card"><h3>Pengaturan tampilan</h3><p>Sesuaikan mode dan tema aplikasi.</p><div class="setting-row"><div><strong>Mode gelap</strong><small>Gunakan tampilan gelap yang lebih nyaman.</small></div><button type="button" class="setting-switch" data-setting-mode aria-pressed="false"><span></span></button></div><div class="setting-row"><div><strong>Tema biru futuristik</strong><small>Aktifkan aksen cyan dan navy pada aplikasi.</small></div><button type="button" class="setting-switch" data-setting-theme aria-pressed="false"><span></span></button></div></div><button class="button primary profile-onboarding" type="button" data-open-onboarding>↗ Lihat kembali Onboarding</button><a class="button profile-github" href="https://github.com/idtc-id" target="_blank" rel="noreferrer">Kunjungi GitHub IDTC ↗</a>${idtcAppAboutMarkup()}</section>`;
}

function regulationEntry(item) {
  return `<article class="regulation-entry"><div class="regulation-entry-meta"><span>${item.type}</span><span>${item.year}</span></div><h3>${item.title}</h3><p>${item.description}</p><a href="${item.url}" target="_blank" rel="noopener noreferrer">Buka sumber resmi <span aria-hidden="true">↗</span></a></article>`;
}

function regulasi() {
  const nationalRules = [
    { type: 'UNDANG-UNDANG', year: '2022', title: 'UU No. 27 Tahun 2022 · Pelindungan Data Pribadi', description: 'Rujukan untuk tata kelola data pribadi yang mungkin diproses oleh platform, model, sensor, atau layanan Digital Twin.', url: 'https://peraturan.bpk.go.id/Details/229798' },
    { type: 'PERATURAN PEMERINTAH', year: '2019', title: 'PP No. 71 Tahun 2019 · Penyelenggaraan Sistem dan Transaksi Elektronik', description: 'Konteks bagi penyelenggaraan sistem elektronik, termasuk keandalan dan keamanan layanan yang mendukung solusi Digital Twin.', url: 'https://peraturan.bpk.go.id/Details/122030' },
    { type: 'PERATURAN PRESIDEN', year: '2018', title: 'Perpres No. 95 Tahun 2018 · Sistem Pemerintahan Berbasis Elektronik', description: 'Rujukan transformasi layanan pemerintahan digital ketika Digital Twin diterapkan pada sistem atau layanan sektor publik.', url: 'https://peraturan.bpk.go.id/Details/96913' },
  ];
  const technicalStandards = [
    { type: 'STANDAR INTERNASIONAL', year: '2021', title: 'ISO 23247-1:2021 · Digital twin framework for manufacturing', description: 'Kerangka umum dan prinsip Digital Twin untuk manufaktur. Cakupannya spesifik manufaktur dan dokumennya merupakan standar teknis, bukan peraturan Indonesia.', url: 'https://www.iso.org/standard/75066.html' },
  ];
  return `<section class="section regulation-page">${sectionHead('Pusat regulasi','Regulasi & standar Digital Twin','Kumpulan rujukan lintas aspek untuk membantu memahami tata kelola Digital Twin.')}<p class="regulation-note">Digital Twin dapat bersinggungan dengan pengelolaan data, sistem elektronik, layanan publik, dan standar teknis. Sumber di bawah relevan pada aspek tersebut; halaman ini bukan daftar lengkap, nasihat hukum, atau klaim bahwa semua dokumen secara khusus mengatur Digital Twin.</p><section class="regulation-group" aria-labelledby="regulation-national-title"><div class="regulation-group-heading"><p class="section-label">Indonesia</p><h2 id="regulation-national-title">Regulasi terkait</h2></div><div class="regulation-grid">${nationalRules.map(regulationEntry).join('')}</div></section><section class="regulation-group" aria-labelledby="regulation-technical-title"><div class="regulation-group-heading"><p class="section-label">Referensi teknis</p><h2 id="regulation-technical-title">Standar Digital Twin</h2></div><div class="regulation-grid">${technicalStandards.map(regulationEntry).join('')}</div></section><p class="regulation-source-note">Periksa dokumen dan status terbarunya langsung di <a href="https://peraturan.bpk.go.id/" target="_blank" rel="noopener noreferrer">Database Peraturan BPK ↗</a> dan <a href="https://jdihn.go.id/" target="_blank" rel="noopener noreferrer">JDIHN ↗</a>.</p></section>`;
}

function bindProfile() {
  const root = app.querySelector('.profile-page');
  const mode = app.querySelector('[data-setting-mode]');
  const theme = app.querySelector('[data-setting-theme]');
  const session = getCurrentSession();
  const accountCard = root?.querySelector('.account-card');
  if (accountCard) accountCard.insertAdjacentHTML('afterend', learningAchievementMarkup(session));
  const editToggle = root?.querySelector('[data-profile-edit-toggle]');
  const editForm = root?.querySelector('[data-profile-edit-form]');
  const status = root?.querySelector('[data-profile-edit-status]');
  const avatarElement = root?.querySelector('[data-profile-avatar]');
  const backgroundSelect = editForm?.elements.background;
  const avatarSourceInput = editForm?.elements.avatarSource;
  const avatarChoices = [...(root?.querySelectorAll('[data-profile-avatar-choice]') || [])];
  editToggle?.addEventListener('click', () => { editForm.hidden = !editForm.hidden; if (!editForm.hidden) editForm.elements.name.focus(); });
  const updateAvatarDisplay = nextSession => {
    avatarElement.innerHTML = profileAvatarMarkup(nextSession);
    const image = avatarElement.querySelector('[data-profile-avatar-image]');
    image?.addEventListener('error', () => {
      const fallback = PROFILE_AVATARS.find(item => item.id === profileAvatarId(nextSession.avatar));
      image.replaceWith(document.createTextNode(fallback.icon));
    }, { once: true });
  };
  const persistProfile = changes => {
    const users = getLocalUsers();
    const userIndex = users.findIndex(user => user.email === session.email);
    if (userIndex < 0 && session.provider !== 'google') {
      status.textContent = 'Data akun lokal tidak ditemukan. Keluar lalu masuk kembali.';
      return false;
    }
    const updatedSession = { ...session, ...changes };
    try {
      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...changes };
        localStorage.setItem('idtc-users', JSON.stringify(users));
      }
      localStorage.setItem('idtc-session', JSON.stringify(updatedSession));
      Object.assign(session, updatedSession);
      return true;
    } catch {
      status.textContent = 'Profil tidak dapat disimpan. Ruang penyimpanan perangkat mungkin penuh.';
      return false;
    }
  };
  avatarChoices.forEach(choice => choice.addEventListener('click', () => {
    const avatar = profileAvatarId(choice.dataset.profileAvatarChoice);
    backgroundSelect.value = avatar;
    avatarSourceInput.value = 'preset';
    avatarChoices.forEach(option => option.setAttribute('aria-pressed', String(option === choice)));
    updateAvatarDisplay({ ...session, avatar, avatarPhoto: '', avatarSource: 'preset' });
    status.textContent = '';
  }));
  root?.querySelector('[data-profile-google-avatar]')?.addEventListener('click', () => {
    avatarSourceInput.value = 'google';
    updateAvatarDisplay({ ...session, avatarSource: 'google' });
    status.textContent = '';
  });
  backgroundSelect?.addEventListener('change', () => {
    const avatar = profileAvatarId(backgroundSelect.value);
    avatarSourceInput.value = 'preset';
    avatarChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.profileAvatarChoice === avatar)));
    updateAvatarDisplay({ ...session, avatar, avatarPhoto: '', avatarSource: 'preset' });
  });
  root?.querySelector('[data-profile-photo-input]')?.addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      status.textContent = 'Pilih foto JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.';
      input.value = '';
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
        image.src = objectUrl;
      });
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      if (persistProfile({ avatarPhoto: canvas.toDataURL('image/jpeg', 0.82), avatarSource: 'upload' })) {
        avatarSourceInput.value = 'upload';
        updateAvatarDisplay(session);
        status.textContent = 'Foto profil tersimpan di perangkat ini.';
      }
    } catch {
      status.textContent = 'Foto tidak dapat diproses. Coba pilih gambar lain.';
    } finally {
      URL.revokeObjectURL(objectUrl);
      input.value = '';
    }
  });
  editForm?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(editForm);
    const name = String(form.get('name')).trim();
    const email = String(form.get('email')).trim().toLowerCase();
    const users = getLocalUsers();
    const userIndex = users.findIndex(user => user.email === session.email);
    if (users.some((user, index) => index !== userIndex && user.email === email)) { status.textContent = 'Email tersebut sudah digunakan akun lain.'; return; }
    const avatar = profileAvatarId(String(form.get('background')));
    const avatarSource = String(form.get('avatarSource'));
    const avatarPhoto = avatarSource === 'upload' ? session.avatarPhoto : '';
    if (!persistProfile({ name, email, avatar, avatarSource, avatarPhoto })) return;
    root.querySelector('[data-profile-name]').textContent = name;
    root.querySelector('[data-profile-email]').textContent = email;
    root.querySelector('[data-profile-background]').textContent = PROFILE_AVATARS.find(item => item.id === avatar).label;
    updateAvatarDisplay(session);
    status.textContent = 'Profil berhasil diperbarui di perangkat ini.';
  });
  root?.querySelector('[data-profile-logout]')?.addEventListener('click', async () => {
    if (databaseAuthMode) {
      await userApi('auth/logout', { method: 'POST' }).catch(() => {});
      databaseSession = null;
    }
    localStorage.removeItem('idtc-session');
    location.hash = 'auth';
  });
  const sync = () => { const dark = localStorage.getItem('idtc-mode') === 'dark'; const future = localStorage.getItem('idtc-theme') === 'future'; mode.classList.toggle('is-on', dark); mode.setAttribute('aria-pressed', String(dark)); theme.classList.toggle('is-on', future); theme.setAttribute('aria-pressed', String(future)); };
  mode.addEventListener('click', () => { localStorage.setItem('idtc-mode', mode.classList.contains('is-on') ? 'light' : 'dark'); applyPreferences(); sync(); });
  theme.addEventListener('click', () => { localStorage.setItem('idtc-theme', theme.classList.contains('is-on') ? 'default' : 'future'); applyPreferences(); sync(); });
  app.querySelector('[data-open-onboarding]').addEventListener('click', () => { localStorage.removeItem('idtc-onboarding-seen'); location.hash = 'onboarding'; });
  sync();
}

function applyPreferences() { document.body.classList.toggle('mode-dark', localStorage.getItem('idtc-mode') === 'dark'); document.body.classList.toggle('theme-future', localStorage.getItem('idtc-theme') === 'future'); }
function bindEcosystemAd(organizations) {
  if (ecosystemAdBound) return;
  const root = document.querySelector('[data-ecosystem-ad]');
  const track = root?.querySelector('[data-ecosystem-ad-track]');
  if (!root || !track || !Array.isArray(organizations) || !organizations.length) return;
  const validOrganizations = organizations.filter(item => item?.nama && item.logo && /^[a-z0-9.-]+$/i.test(item.domain || '') && /^[a-z0-9.-]+\.png$/i.test(item.logo));
  if (!validOrganizations.length) return;
  ecosystemAdBound = true;
  let previousIndex = -1;
  const stop = () => {
    if (ecosystemAdTimer !== null) clearTimeout(ecosystemAdTimer);
    ecosystemAdTimer = null;
    root.hidden = true;
    root.classList.remove('is-flying');
    track.replaceChildren();
    root.querySelector('.ecosystem-ad-close')?.remove();
  };
  const chooseOrganization = () => {
    const available = validOrganizations.map((_, index) => index).filter(index => index !== previousIndex);
    const index = available[Math.floor(Math.random() * available.length)];
    previousIndex = index;
    return validOrganizations[index];
  };
  const schedule = delay => {
    if (ecosystemAdTimer !== null) clearTimeout(ecosystemAdTimer);
    if (ecosystemAdDismissed) return;
    ecosystemAdTimer = setTimeout(show, delay);
  };
  const show = () => {
    ecosystemAdTimer = null;
    const route = location.hash.slice(1) || 'home';
    if (document.hidden || ['auth', 'onboarding', 'registration-success', 'shop', 'admin'].includes(route) || route.startsWith('pembelajaran/')) {
      schedule(8000);
      return;
    }
    const organization = chooseOrganization();
    const card = document.createElement('div');
    card.className = 'ecosystem-ad-card';
    card.style.setProperty('--ad-drift', `${Math.round(Math.random() * 104 - 52)}px`);
    card.style.setProperty('--ad-duration', `${(6 + Math.random() * 2).toFixed(2)}s`);
    const link = document.createElement('a');
    link.className = 'ecosystem-ad-link';
    link.href = `https://${organization.domain}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Iklan: Kenali ${organization.nama}, organisasi yang relevan untuk dijajaki dalam ekosistem Digital Twin. Bukan mitra atau pendukung resmi IDTC.`);
    const badge = document.createElement('span');
    badge.className = 'ecosystem-ad-badge';
    badge.textContent = 'IKLAN';
    const image = document.createElement('img');
    image.className = 'ecosystem-ad-logo';
    image.src = `assets/img/mitra/${organization.logo}`;
    image.alt = organization.nama;
    image.decoding = 'async';
    image.addEventListener('error', stop, { once: true });
    const copy = document.createElement('span');
    copy.className = 'ecosystem-ad-copy';
    copy.innerHTML = `<strong></strong><small></small>`;
    copy.querySelector('strong').textContent = organization.nama;
    copy.querySelector('small').textContent = `${organization.sektor} · organisasi untuk dijajaki, bukan mitra terkonfirmasi`;
    const close = document.createElement('button');
    close.className = 'ecosystem-ad-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Tutup iklan');
    close.textContent = '×';
    close.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      ecosystemAdDismissed = true;
      stop();
    }, { once: true });
    link.append(badge, image, copy);
    card.append(link);
    track.replaceChildren(card);
    root.append(close);
    root.hidden = false;
    root.classList.remove('is-flying');
    void card.offsetWidth;
    root.classList.add('is-flying');
    schedule(+(card.style.getPropertyValue('--ad-duration').replace('s', '')) * 1000 + 9000 + Math.random() * 9000);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!ecosystemAdDismissed) schedule(1200 + Math.random() * 2200);
  });
  window.addEventListener('hashchange', () => {
    const route = location.hash.slice(1);
    if (['auth', 'onboarding', 'registration-success', 'shop', 'admin'].includes(route) || route.startsWith('pembelajaran/')) stop();
    else if (!ecosystemAdDismissed) schedule(900 + Math.random() * 1900);
  });
  schedule(2500 + Math.random() * 2500);
}
function learningRoute(path, moduleIndex) { return `#pembelajaran/${path.id}/${moduleIndex}`; }
function learningChecklistKey(path, module) {
  const session = getCurrentSession();
  const account = String(session?.id || session?.email || 'guest').trim().toLowerCase();
  const moduleKey = encodeURIComponent(module.judul);
  const key = `idtc-learning-checklist:${encodeURIComponent(account)}:${path.id}:${moduleKey}`;
  if (session && !localStorage.getItem(key)) {
    const legacyKey = `idtc-learning-checklist:${path.id}:${moduleKey}`;
    const legacyProgress = localStorage.getItem(legacyKey);
    if (legacyProgress !== null) {
      try { localStorage.setItem(key, legacyProgress); localStorage.removeItem(legacyKey); } catch { /* Keep the legacy record if migration storage is unavailable. */ }
    }
  }
  return key;
}
function lessonChecklistHeadings(module) {
  const headings = [];
  const visit = block => {
    if (block.judul) headings.push(block.judul);
    (block.subbagian || []).forEach(visit);
  };
  (module.konten || []).forEach(visit);
  return headings;
}
function lessonChecklistParagraphs(module) {
  const paragraphs = [];
  const visit = (block, parentTitle = '') => {
    const title = [parentTitle, block.judul].filter(Boolean).join(' · ') || 'Materi inti';
    (block.paragraf || []).forEach((_, index) => paragraphs.push({ title, paragraphNumber: index + 1 }));
    (block.subbagian || []).forEach(item => visit(item, title));
  };
  (module.konten || []).forEach(block => visit(block));
  return paragraphs;
}
function checklistBaseItems(module) {
  return [
    'Baca ringkasan dan tujuan pembelajaran',
    ...(module.fokus || []).map(item => `Pelajari: ${item}`),
    ...lessonChecklistHeadings(module).map(title => `Selesaikan subbab: ${title}`),
  ];
}
function checklistItems(module) {
  return [...checklistBaseItems(module), ...lessonChecklistParagraphs(module).map(item => `Pahami paragraf ${item.paragraphNumber} · ${item.title}`)];
}
function checklistKum(module, index) {
  if (index === 0) return 2;
  const focusEnd = 1 + (module.fokus || []).length;
  if (index < focusEnd) return 3;
  const headingEnd = focusEnd + lessonChecklistHeadings(module).length;
  return index < headingEnd ? 5 : 2;
}
function learningPathProgress(path) {
  let earnedKum = 0;
  let totalKum = 0;
  let completedModules = 0;
  path.modul.forEach(module => {
    const items = checklistItems(module);
    const checked = savedChecklist(learningChecklistKey(path, module));
    const moduleTotal = items.reduce((total, _, index) => total + checklistKum(module, index), 0);
    const moduleEarned = items.reduce((total, _, index) => total + (checked[index] ? checklistKum(module, index) : 0), 0);
    totalKum += moduleTotal;
    earnedKum += moduleEarned;
    if (items.every((_, index) => checked[index])) completedModules += 1;
  });
  return { earnedKum, totalKum, completedModules, percent: totalKum ? Math.round(earnedKum / totalKum * 100) : 0 };
}
function learningOverallProgress() {
  const paths = data.materi.jalur.map(learningPathProgress);
  const earnedKum = paths.reduce((total, path) => total + path.earnedKum, 0);
  const totalKum = paths.reduce((total, path) => total + path.totalKum, 0);
  const completedModules = paths.reduce((total, path) => total + path.completedModules, 0);
  const moduleCount = data.materi.jalur.reduce((total, path) => total + path.modul.length, 0);
  return { earnedKum, totalKum, completedModules, moduleCount, percent: totalKum ? Math.round(earnedKum / totalKum * 100) : 0 };
}
function learningAchievementMarkup(session) {
  if (!session) return `<section class="learning-achievement" aria-labelledby="learning-achievement-title"><div class="learning-achievement-heading"><div><p class="section-label">Belajar Digital Twin</p><h2 id="learning-achievement-title">Pencapaian pembelajaran</h2></div></div><p>Masuk ke akun untuk melihat level, KUM, dan progres belajarmu.</p><a class="button primary" href="#auth">Masuk / Daftar</a></section>`;
  const progress = learningOverallProgress();
  const levels = [
    { minimum: 0, name: 'Penjelajah' },
    { minimum: 50, name: 'Pembelajar' },
    { minimum: 200, name: 'Praktisi' },
    { minimum: 450, name: 'Mahir' },
    { minimum: 750, name: 'Ahli Digital Twin' },
  ];
  const levelIndex = levels.reduce((current, level, index) => progress.earnedKum >= level.minimum ? index : current, -1);
  const level = levels[Math.max(0, levelIndex)];
  const nextLevel = levels[levelIndex + 1];
  const levelProgress = nextLevel ? Math.round((progress.earnedKum - level.minimum) / (nextLevel.minimum - level.minimum) * 100) : 100;
  return `<section class="learning-achievement" aria-labelledby="learning-achievement-title"><div class="learning-achievement-heading"><div><p class="section-label">Belajar Digital Twin</p><h2 id="learning-achievement-title">Pencapaian pembelajaran</h2></div><span class="learning-achievement-level">${esc(level.name)}</span></div><div class="learning-achievement-metrics"><div><small>Nilai KUM</small><strong>${progress.earnedKum}<span>/${progress.totalKum}</span></strong></div><div><small>Progres berbobot</small><strong>${progress.percent}%</strong></div><div><small>Modul selesai</small><strong>${progress.completedModules}<span>/${progress.moduleCount}</span></strong></div></div><div class="progress learning-achievement-progress" role="progressbar" aria-label="Progres belajar Digital Twin" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><i style="width:${progress.percent}%"></i></div><div class="learning-level-progress"><span>${nextLevel ? `${nextLevel.minimum - progress.earnedKum} KUM menuju ${esc(nextLevel.name)}` : 'Level tertinggi tercapai'}</span><small>${levelProgress}% menuju level berikutnya</small></div><p class="learning-achievement-note">Progres dihitung dari bobot checklist dan disimpan per akun di perangkat ini; belum tersinkron ke perangkat lain.</p></section>`;
}
function savedChecklist(key) {
  try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; }
}
function renderLessonBlock(block, depth = 0, paragraphChecklist = null) {
  const heading = depth === 0 ? 'h3' : 'h4';
  const title = block.judul ? `<${heading}>${esc(block.judul)}</${heading}>` : '';
  const paragraphs = (block.paragraf || []).map(paragraph => {
    if (!paragraphChecklist) return `<p>${esc(paragraph)}</p>`;
    const index = paragraphChecklist.index++;
    const points = checklistKum(paragraphChecklist.module, index);
    const weight = paragraphChecklist.totalKum ? (points / paragraphChecklist.totalKum * 100).toFixed(1).replace(/\.0$/, '') : '0';
    return `<label class="lesson-paragraph-check"><input type="checkbox" data-learning-check data-check-index="${index}" aria-label="Tandai paragraf selesai" ${paragraphChecklist.checked[index] ? 'checked' : ''}><span>${esc(paragraph)}</span><strong><span>+${points} KUM</span><small>${weight}% bobot</small></strong></label>`;
  }).join('');
  const points = (block.poin || []).length ? `<ul>${block.poin.map(point => `<li>${esc(point)}</li>`).join('')}</ul>` : '';
  const steps = (block.langkah || []).length ? `<ol>${block.langkah.map(step => `<li>${esc(step)}</li>`).join('')}</ol>` : '';
  const flow = (block.alur || []).length ? `<ol class="lesson-flow">${block.alur.map(step => `<li>${esc(step)}</li>`).join('')}</ol>` : '';
  const quote = block.kutipan ? `<blockquote>${esc(block.kutipan)}</blockquote>` : '';
  const note = block.catatan ? `<aside class="lesson-note"><strong>Catatan</strong><p>${esc(block.catatan)}</p></aside>` : '';
  const table = block.tabel ? `<div class="lesson-table-wrap"><table><thead><tr>${block.tabel.kolom.map(cell => `<th scope="col">${esc(cell)}</th>`).join('')}</tr></thead><tbody>${block.tabel.baris.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const subsections = (block.subbagian || []).map(item => renderLessonBlock(item, depth + 1, paragraphChecklist)).join('');
  return `<section class="lesson-block ${depth ? 'lesson-subsection' : ''}">${title}${paragraphs}${points}${steps}${flow}${table}${quote}${note}${subsections}</section>`;
}
function belajar() {
  const paths = data.materi.jalur.map(path => { const progress = learningPathProgress(path); return `<article class="card"><div style="display:flex;justify-content:space-between;gap:12px"><div><p class="role ${colorClass(path.warna)}">JALUR ${path.kode}</p><h3>${esc(path.nama)}</h3><p>${esc(path.sasaran)}</p></div><div class="learning-path-score"><strong>${progress.percent}%</strong><small>${progress.earnedKum}/${progress.totalKum} KUM</small></div></div><div class="progress" role="progressbar" aria-label="Progres jalur ${esc(path.nama)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><i style="width:${progress.percent}%"></i></div><p class="learning-path-modules">${progress.completedModules}/${path.modul.length} modul selesai</p><div>${path.modul.map((m,i) => `<details class="module-detail"><summary><span class="index">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(m.judul)}</strong><small>${esc(m.tingkat)} · ${esc(m.status)}</small></span><b>Lihat materi</b></summary><div class="module-content"><p>${esc(m.ringkasan || 'Materi pembelajaran akan segera tersedia.')}</p><div class="chips">${(m.fokus || []).map(tag => `<span class="chip ${colorClass(path.warna)}">${esc(tag)}</span>`).join('')}</div><p class="module-result"><strong>Hasil belajar:</strong> ${esc(m.hasil || 'Memahami topik modul dan kaitannya dengan Digital Twin.')}</p><a class="button primary module-start" href="${learningRoute(path, i)}">Mulai Belajar</a>${m.tautan ? `<a href="${esc(m.tautan)}" target="_blank" rel="noreferrer">Buka modul ↗</a>` : ''}</div></details>`).join('')}</div></article>`; }).join('');
  const introPath = data.materi.jalur.find(path => path.kode === 'A') || data.materi.jalur[0];
  const introModuleIndex = introPath?.modul.findIndex(module => module.judul.startsWith('Pengantar Digital Twin')) ?? -1;
  const startLink = introModuleIndex >= 0 ? `<a class="button primary learning-start" href="${learningRoute(introPath, introModuleIndex)}">Mulai Belajar <span aria-hidden="true">→</span></a>` : '';
  return `<section class="section">${sectionHead('Materi belajar','Peta belajar Digital Twin','Pilih jalur yang sesuai dengan peran dan kebutuhanmu.')} ${startLink}${paths}</section>`;
}
function halamanPembelajaran(route) {
  const [, pathId, moduleValue] = route.split('/');
  const pathIndex = data.materi.jalur.findIndex(item => item.id === pathId);
  const path = data.materi.jalur[pathIndex];
  const moduleIndex = Number(moduleValue);
  const module = path?.modul[moduleIndex];
  if (!path || !Number.isInteger(moduleIndex) || !module) return belajar();
  const checklist = checklistItems(module);
  const baseChecklist = checklistBaseItems(module);
  const key = learningChecklistKey(path, module);
  const checked = savedChecklist(key);
  const completed = checklist.reduce((total, _, index) => total + (checked[index] ? 1 : 0), 0);
  const totalKum = checklist.reduce((total, _, index) => total + checklistKum(module, index), 0);
  const earnedKum = checklist.reduce((total, _, index) => total + (checked[index] ? checklistKum(module, index) : 0), 0);
  const progress = totalKum ? Math.round(earnedKum / totalKum * 100) : 0;
  const paragraphChecklist = { module, index: baseChecklist.length, checked, totalKum };
  const lessonContent = module.konten?.map(block => renderLessonBlock(block, 0, paragraphChecklist)).join('') || '';
  const previous = moduleIndex > 0 ? `<a class="button ghost" href="${learningRoute(path, moduleIndex - 1)}">← Sebelumnya</a>` : '<span></span>';
  const next = moduleIndex < path.modul.length - 1 ? `<a class="button primary" href="${learningRoute(path, moduleIndex + 1)}">Berikutnya →</a>` : '<a class="button primary" href="#belajar">Selesai</a>';
  return `<section class="section learning-page"><a class="learning-back" href="#belajar">← Kembali ke semua jalur</a>${sectionHead(`JALUR ${path.kode} · MODUL ${String(moduleIndex + 1).padStart(2, '0')}`, esc(module.judul), `${esc(path.nama)} · ${esc(module.tingkat)}`)}<article class="card learning-card"><p class="section-label">Materi inti</p><p class="learning-summary">${esc(module.ringkasan || 'Materi pembelajaran akan segera tersedia.')}</p><div class="chips">${(module.fokus || []).map(item => `<span class="chip ${colorClass(path.warna)}">${esc(item)}</span>`).join('')}</div>${lessonContent ? `<div class="learning-content">${lessonContent}</div>` : ''}<p class="learning-outcome"><strong>Hasil belajar</strong>${esc(module.hasil || 'Memahami topik modul dan kaitannya dengan Digital Twin.')}</p><section class="learning-checklist" data-checklist-key="${esc(key)}" aria-labelledby="learning-checklist-title"><div class="learning-checklist-heading"><h3 id="learning-checklist-title">Checklist pembelajaran</h3><span data-checklist-count aria-live="polite">${completed}/${checklist.length} selesai · ${progress}% · ${earnedKum}/${totalKum} KUM</span></div><p class="learning-kum-note">KUM adalah bobot progres internal aplikasi, bukan nilai akademik resmi.</p><div class="progress learning-checklist-progress" role="progressbar" aria-label="Progres checklist berbobot KUM" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div><div class="learning-checklist-items">${baseChecklist.map((item, index) => { const points = checklistKum(module, index); const weight = totalKum ? (points / totalKum * 100).toFixed(1).replace(/\.0$/, '') : '0'; return `<label class="learning-check-item"><input type="checkbox" data-learning-check data-check-index="${index}" ${checked[index] ? 'checked' : ''}><span>${esc(item)}</span><strong class="learning-check-points"><span>+${points} KUM</span><small>${weight}% bobot</small></strong></label>`; }).join('')}</div></section></article><nav class="learning-pagination" aria-label="Navigasi pembelajaran">${previous}${next}</nav></section>`;
}
function bindLearningChecklist() {
  const checklist = app.querySelector('[data-checklist-key]');
  if (!checklist) return;
  const key = checklist.dataset.checklistKey;
  const checkboxes = [...app.querySelectorAll('[data-learning-check]')];
  const [, pathId, moduleValue] = location.hash.slice(1).split('/');
  const path = data.materi.jalur.find(item => item.id === pathId);
  const module = path?.modul[Number(moduleValue)];
  if (!module) return;
  const items = checklistItems(module);
  const totalKum = items.reduce((total, _, index) => total + checklistKum(module, index), 0);
  const progressBar = checklist.querySelector('[role="progressbar"]');
  const updateProgress = () => {
    const checked = Array(items.length).fill(false);
    checkboxes.forEach(checkbox => { const index = Number(checkbox.dataset.checkIndex); if (index >= 0 && index < checked.length) checked[index] = checkbox.checked; });
    const completed = checked.filter(Boolean).length;
    const earnedKum = checked.reduce((total, isChecked, index) => total + (isChecked ? checklistKum(module, index) : 0), 0);
    const progress = totalKum ? Math.round(earnedKum / totalKum * 100) : 0;
    localStorage.setItem(key, JSON.stringify(checked));
    checklist.querySelector('[data-checklist-count]').textContent = `${completed}/${items.length} selesai · ${progress}% · ${earnedKum}/${totalKum} KUM`;
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', String(progress));
    progressBar.querySelector('i').style.width = `${progress}%`;
  };
  checkboxes.forEach(checkbox => checkbox.addEventListener('change', updateProgress));
  updateProgress();
}
function profil() {
  const { anggota } = data; const max = anggota.ekosistem[0].jumlah;
  const bars = anggota.ekosistem.map(item => `<div class="bar-row"><div class="bar-label"><span>${esc(item.nama)}</span><span>${item.jumlah}</span></div><div class="progress"><i style="width:${percent(item.jumlah,max)}%"></i></div></div>`).join('');
  const sectors = anggota.sektor.slice(0,6).map(item => `<div class="list-item"><span class="index">${item.jumlah}</span><div><strong>${esc(item.nama)}</strong><small>Anggota yang bergerak di sektor ini</small></div></div>`).join('');
  return `<section class="section">${sectionHead('Profil anggota','Satu ekosistem, banyak perspektif','Gambaran anggota IDTC dari database pendaftaran.')}<div class="profile-intro"><strong>${anggota.namaUnik}</strong><p>nama unik dari ${anggota.respons} responden</p></div><div class="card"><h3>Komposisi ekosistem</h3>${bars}</div><div class="card"><h3>Sektor teratas</h3>${sectors}</div><div class="card"><h3>Institusi dengan anggota terbanyak</h3>${anggota.topInstitusi.slice(0,5).map((item,i) => `<div class="list-item"><span class="index">${i+1}</span><div><strong>${esc(item.nama)}</strong><small>${item.jumlah} anggota</small></div></div>`).join('')}</div></section>`;
}
function hasCmsAccess(session = getCurrentSession()) { return ['admin', 'super_admin'].includes(session?.role); }
const views = { home, pengurus, profile, regulasi, pokja, 'pilot-project': pilotProjectPageWithCategories, 'rating-tool': ratingTool, kolaborasi: collaborationPage, belajar, onboarding, auth, 'registration-success': registrationSuccess, shop: () => shopPage(), admin: () => adminPanel(getCurrentSession(), esc) };
const TWINIAI_STOP_WORDS = new Set(['apa', 'apakah', 'bagaimana', 'mengapa', 'kenapa', 'siapa', 'kapan', 'dimana', 'di', 'ke', 'dari', 'dan', 'atau', 'yang', 'itu', 'ini', 'adalah', 'untuk', 'pada', 'dengan', 'tentang', 'saya', 'aku', 'tolong', 'bisa', 'dapat', 'kah', 'nya']);
const TWINIAI_COMMON_WORDS = new Set(['digital', 'twin', 'data']);
const TWINIAI_FALLBACK = 'Saya belum menemukan jawaban yang cukup cocok di basis pengetahuan TwiniAI. Coba tanyakan tentang konsep, data, standar, arsitektur, keamanan, penerapan, biaya, atau langkah pilot.';
const TWINIAI_API_BASE = String(window.IDTC_API_BASE_URL || '').trim().replace(/\/+$/, '');
const twiniApiUrl = path => `${TWINIAI_API_BASE}/api/${path}`;
function normalizeTwiniText(value) {
  return String(value || '').toLocaleLowerCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function twiniTokens(value) {
  return normalizeTwiniText(value).split(/\s+/).filter(token => token.length > 1 && !TWINIAI_STOP_WORDS.has(token));
}
function expandTwiniKnowledge(knowledge, additionalEntries = []) {
  const entries = Array.isArray(knowledge?.entries) ? [...knowledge.entries, ...additionalEntries] : [...additionalEntries];
  const topics = (knowledge?.questionBanks?.topics || []).slice(0, 50);
  const intents = knowledge?.questionBanks?.intents || [];
  topics.forEach(topic => intents.forEach(intent => {
    const replace = value => String(value).replaceAll('{topic}', topic.label).replaceAll('{context}', topic.context);
    entries.push({
      id: `bank-${topic.id}-${intent.id}`,
      category: topic.category,
      question: replace(intent.q),
      keywords: [topic.label, topic.id, ...(intent.k || [])],
      answer: replace(intent.a),
    });
  }));
  return { ...knowledge, entries };
}
function sensorFaqEntries(sensorFaq) {
  return (sensorFaq?.categories || []).flatMap(category => category.items.map((item, index) => ({
    id: `sensor-${category.id}-${index + 1}`,
    category: `Sensor: ${category.name}`,
    question: item.q,
    keywords: [...(category.keywords || []), item.brands].filter(Boolean),
    answer: `${item.a}${item.brands ? `\n\nContoh merek/produk sejenis: ${item.brands}.` : ''}`,
  })));
}
function bimFaqEntries(bimFaq) {
  const references = bimFaq?.references || {};
  return (bimFaq?.categories || []).flatMap(category => category.items.map((item, index) => {
    const referenceIds = item.references || category.references || [];
    const citedReferences = referenceIds.map(id => `[${id}] ${references[id] || id}`);
    return {
      id: `bim-${category.id}-${index + 1}`,
      category: `BIM: ${category.name}`,
      question: item.q,
      keywords: [...(category.keywords || []), ...referenceIds],
      answer: `${item.a}${citedReferences.length ? `\n\nReferensi pada materi: ${citedReferences.join('; ')}.` : ''}`,
    };
  }));
}
function mergeLessonContent(curriculum, savedCurriculum) {
  if (!Array.isArray(savedCurriculum?.jalur)) return curriculum;
  const savedPaths = new Map(savedCurriculum.jalur.map(path => [path.id, path]));
  return {
    ...curriculum,
    ...savedCurriculum,
    jalur: curriculum.jalur.map(path => {
      const savedPath = savedPaths.get(path.id);
      if (!savedPath) return path;
      const modules = Array.isArray(savedPath.modul) ? savedPath.modul.map(savedModule => {
        const currentModule = path.modul.find(module => module.judul === savedModule.judul);
        return currentModule?.konten?.length ? { ...currentModule, ...savedModule, konten: currentModule.konten } : savedModule;
      }) : path.modul;
      return { ...path, ...savedPath, modul: modules };
    }),
  };
}
function matchTwiniQuestion(question) {
  const entries = data?.twini?.entries || [];
  const normalizedQuestion = normalizeTwiniText(question);
  const exactMatch = entries.find(entry => [entry.question, ...(entry.keywords || [])].some(phrase => normalizeTwiniText(phrase) === normalizedQuestion));
  if (exactMatch) return exactMatch;
  const queryTokens = twiniTokens(question);
  if (!entries.length) return null;
  if (!queryTokens.length) return entries.find(entry => entry.id === 'definisi') || null;
  const ranked = entries.map(entry => {
    const questionText = normalizeTwiniText(entry.question);
    const questionTokens = new Set(twiniTokens(entry.question));
    const keywordTokens = new Set([...(entry.keywords || []), entry.category || ''].flatMap(twiniTokens));
    const phrases = [entry.question, ...(entry.keywords || [])].map(normalizeTwiniText);
    let matchedWeight = 0;
    let totalWeight = 0;
    let matchedCount = 0;
    queryTokens.forEach(token => {
      const weight = TWINIAI_COMMON_WORDS.has(token) ? 0.35 : 1;
      totalWeight += weight;
      if (questionTokens.has(token)) {
        matchedWeight += weight;
        matchedCount += 1;
      } else if (keywordTokens.has(token)) {
        matchedWeight += weight * 0.3;
        matchedCount += 1;
      } else if ([...questionTokens, ...keywordTokens].some(candidate => candidate.length >= 6 && token.length >= 6 && candidate.slice(0, 5) === token.slice(0, 5))) {
        matchedWeight += weight * 0.3;
        matchedCount += 1;
      }
    });
    let score = totalWeight ? matchedWeight / totalWeight : 0;
    if (questionText === normalizedQuestion || phrases.some(phrase => phrase === normalizedQuestion)) score = 2;
    else if (questionText.length > 5 && normalizedQuestion.includes(questionText)) score = Math.max(score, 1.1);
    return { entry, score, matchedCount };
  }).sort((left, right) => right.score - left.score || right.matchedCount - left.matchedCount);
  const best = ranked[0];
  return best && best.matchedCount > 0 && best.score >= 0.42 ? best.entry : null;
}
function initTwiniWidget() {
  const panel = document.querySelector('[data-twini-panel]');
  const toggle = document.querySelector('[data-twini-toggle]');
  const messages = document.querySelector('[data-twini-messages]');
  const form = document.querySelector('[data-twini-form]');
  const input = document.querySelector('[data-twini-input]');
  const providerSelect = document.querySelector('[data-twini-provider]');
  const providerStatus = document.querySelector('[data-twini-status]');
  if (!panel || !toggle || !messages || !form || !input) return;
  const sendButton = form.querySelector('.twini-send');
  const conversation = [];
  let busy = false;
  const appendMessage = (role, text, state = '') => {
    const message = document.createElement('div');
    message.className = `twini-message${role === 'user' ? ' is-user' : ''}${state ? ` ${state}` : ''}`;
    const label = document.createElement('span');
    label.className = 'twini-message-label';
    label.textContent = role === 'user' ? 'Anda' : 'TwiniAI';
    const content = document.createElement('p');
    content.className = 'twini-message-text';
    content.textContent = text;
    message.append(label, content);
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  };
  const updateProviderStatus = () => {
    if (!providerStatus || !providerSelect) return;
    const option = providerSelect.selectedOptions[0];
    providerStatus.textContent = providerSelect.value === 'local' ? 'Basis lokal' : `AI: ${option?.textContent || providerSelect.value}`;
  };
  const configureProviders = async () => {
    if (!providerSelect) return;
    try {
      const response = await fetch(twiniApiUrl('providers'));
      if (!response.ok) throw new Error('Provider list unavailable');
      const result = await response.json();
      providerSelect.replaceChildren(new Option('Basis lokal', 'local'));
      (result.providers || []).forEach(provider => {
        const option = new Option(`${provider.label}${provider.configured ? '' : ' (belum dikonfigurasi)'}`, provider.id);
        option.disabled = !provider.configured;
        providerSelect.add(option);
      });
      const saved = localStorage.getItem('idtc-twini-provider');
      const preferred = [saved, result.defaultProvider].find(id => id && [...providerSelect.options].some(option => option.value === id && !option.disabled));
      providerSelect.value = preferred || 'local';
    } catch {
      providerSelect.replaceChildren(new Option('Basis lokal', 'local'));
      providerSelect.value = 'local';
    }
    updateProviderStatus();
  };
  providerSelect?.addEventListener('change', () => {
    localStorage.setItem('idtc-twini-provider', providerSelect.value);
    updateProviderStatus();
  });
  void configureProviders();
  const submitQuestion = async value => {
    const question = String(value || '').trim().slice(0, 3000);
    if (!question || busy) return;
    appendMessage('user', question);
    const requestMessages = [...conversation, { role: 'user', content: question }].slice(-12);
    const provider = providerSelect?.value || 'local';
    busy = true;
    input.disabled = true;
    if (sendButton) sendButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    const pending = appendMessage('assistant', 'TwiniAI sedang mencari informasi…', 'is-loading');
    let answer;
    try {
      if (provider === 'local') {
        const entry = matchTwiniQuestion(question);
        answer = entry ? `${entry.answer}\n\nTopik: ${entry.category}` : TWINIAI_FALLBACK;
      } else {
        const response = await fetch(twiniApiUrl('chat'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ provider, messages: requestMessages }),
          signal: AbortSignal.timeout(35_000),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Provider AI tidak tersedia.');
        answer = String(result.answer || '').trim() || TWINIAI_FALLBACK;
      }
    } catch (error) {
      const entry = matchTwiniQuestion(question);
      const localAnswer = entry ? `${entry.answer}\n\nTopik: ${entry.category}` : TWINIAI_FALLBACK;
      answer = `${localAnswer}\n\nProvider AI belum tersedia; jawaban ini berasal dari basis pengetahuan lokal.`;
      if (providerStatus) providerStatus.textContent = 'Fallback: basis lokal';
    }
    pending.remove();
    appendMessage('assistant', answer);
    conversation.push({ role: 'user', content: question }, { role: 'assistant', content: answer });
    while (conversation.length > 10) conversation.splice(0, 2);
    busy = false;
    input.disabled = false;
    if (sendButton) sendButton.disabled = false;
    form.removeAttribute('aria-busy');
    input.value = '';
    input.style.height = '';
    input.focus();
  };
  const setOpen = (open, restoreFocus = true) => {
    panel.hidden = !open;
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup TwiniAI' : 'Buka TwiniAI');
    if (open) {
      if (!messages.childElementCount) appendMessage('assistant', 'Halo, saya TwiniAI. Ada yang ingin kamu ketahui tentang Digital Twin?');
      input.focus();
    } else if (restoreFocus) toggle.focus();
  };
  const syncRouteVisibility = () => {
    const route = location.hash.slice(1) || initialRoute();
    const visible = route === 'home';
    document.body.classList.toggle('twini-visible-mode', visible);
    if (!visible && !panel.hidden) setOpen(false, false);
  };
  let viewportBaseHeight = Math.max(window.innerHeight, window.visualViewport?.height || 0);
  const updatePanelViewport = () => {
    const viewport = window.visualViewport;
    const viewportHeight = viewport?.height || window.innerHeight;
    const viewportTop = viewport?.offsetTop || 0;
    const keyboardOpen = document.activeElement === input && (viewportBaseHeight - viewportHeight > 120 || viewportHeight < 480);
    document.documentElement.style.setProperty('--twini-viewport-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--twini-viewport-top', `${Math.max(0, viewportTop)}px`);
    document.body.classList.toggle('twini-keyboard-open', keyboardOpen);
    if (!keyboardOpen && document.activeElement !== input) viewportBaseHeight = Math.max(window.innerHeight, viewportHeight);
  };
  input.addEventListener('focus', () => {
    viewportBaseHeight = Math.max(viewportBaseHeight, window.innerHeight, window.visualViewport?.height || 0);
    requestAnimationFrame(updatePanelViewport);
  });
  input.addEventListener('blur', () => requestAnimationFrame(updatePanelViewport));
  window.visualViewport?.addEventListener('resize', updatePanelViewport);
  window.visualViewport?.addEventListener('scroll', updatePanelViewport);
  window.addEventListener('resize', updatePanelViewport);
  window.addEventListener('hashchange', syncRouteVisibility);
  syncRouteVisibility();
  updatePanelViewport();
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.querySelector('[data-twini-close]')?.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', event => { event.preventDefault(); void submitQuestion(input.value); });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 96)}px`; });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.querySelectorAll('[data-twini-prompt]').forEach(button => button.addEventListener('click', () => { void submitQuestion(button.dataset.twiniPrompt); }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) setOpen(false); });
}
async function load() {
  const [anggota, materi, struktur, produk, merch, twini, sensorFaq, bimFaq, authStatus, pokja1Handbook, pokja2Handbook, pokja3Handbook, ecosystemOrganizations] = await Promise.all([
    ...['anggota', 'materi', 'struktur', 'produk'].map(name => fetch(`data/${name}.json?v=${name === 'struktur' ? 27 : 22}`).then(response => response.json())),
    fetch('data/merch.json?v=22').then(response => response.json()),
    fetch('data/twini-ai.json?v=3').then(response => response.json()),
    fetch('data/twini-ai-sensors.json?v=1').then(response => response.json()),
    fetch('data/twini-ai-bim.json?v=1').then(response => response.json()),
    userApi('auth/status', { signal: AbortSignal.timeout(2500) }).then(response => response.ok ? response.json() : { database: false }).catch(() => ({ database: false })),
    fetch('data/pokja1-handbook.json?v=1').then(response => response.json()),
    fetch('data/pokja2-handbook.json?v=1').then(response => response.json()),
    fetch('data/pokja3-handbook.json?v=1').then(response => response.json()),
    fetch('data/iklan-ekosistem.json?v=1').then(response => response.json()),
  ]);
  databaseAuthMode = authStatus.database === true;
  databaseBootstrapRequired = authStatus.bootstrapRequired === true;
  databaseRegistrationEnabled = authStatus.registrationEnabled !== false;
  if (databaseAuthMode) {
    try {
      const response = await userApi('auth/me', { signal: AbortSignal.timeout(2500) });
      const result = response.ok ? await response.json() : { user: null };
      databaseSession = result.user || null;
    } catch { databaseSession = null; }
    localStorage.removeItem('idtc-session');
    if (databaseSession && (!location.hash || location.hash === '#auth')) location.hash = 'home';
  } else {
    databaseSession = null;
    await migrateLegacyPasswords();
  }
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('idtc-cms-content') || '{}') || {}; } catch { overrides = {}; }
  data = { anggota, materi: mergeLessonContent(materi, overrides.materi), struktur, handbooks: { pokja1: pokja1Handbook, pokja2: pokja2Handbook, pokja3: pokja3Handbook }, produk: overrides.produk || produk, twini: expandTwiniKnowledge(overrides.twini || twini, [...sensorFaqEntries(sensorFaq), ...bimFaqEntries(bimFaq)]), merch };
  bindEcosystemAd(ecosystemOrganizations);
  render();
}
function addHomeFeatures() { const actions = app.querySelector('.hero-actions'); if (!actions || app.querySelector('.feature-actions')) return; actions.insertAdjacentHTML('afterend', '<div class="feature-actions" aria-label="Fitur utama"><a href="#belajar" class="feature-button feature-literasi"><span>◫</span>Literasi</a><a href="#regulasi" class="feature-button feature-regulasi"><span>◇</span>Regulasi</a><a href="#pilot-project" class="feature-button feature-pilot"><span>◈</span>Pilot Project</a><a href="#rating-tool" class="feature-button feature-rating"><span>◉</span>Rating Tool DT</a><a href="#kolaborasi" class="feature-button feature-collaboration"><span>↔</span>Kolaborasi & Dukungan</a></div>'); }
function render() { stopHomeCarousel(); const route = location.hash.slice(1) || initialRoute(); if (route === 'admin' && !hasCmsAccess()) { location.hash = getCurrentSession() ? 'profile' : 'auth'; return; } document.body.classList.toggle('home-mode', route === 'home'); document.body.classList.toggle('onboarding-mode', route === 'onboarding'); document.body.classList.toggle('auth-mode', route === 'auth'); document.body.classList.toggle('shop-mode', route === 'shop'); applyPreferences(); app.innerHTML = route.startsWith('pembelajaran/') ? halamanPembelajaran(route) : views[route]?.() || home(); app.querySelectorAll('img:not([loading])').forEach(image => { image.loading = 'lazy'; image.decoding = 'async'; }); nav.querySelectorAll('a').forEach(link => link.classList.toggle('active', link.dataset.route === route || (route.startsWith('pembelajaran/') && link.dataset.route === 'belajar'))); if (route === 'onboarding') bindOnboarding(); if (route === 'auth') bindAuth(); if (route === 'profile') bindProfile(); if (route.startsWith('pembelajaran/')) bindLearningChecklist(); if (route === 'admin') bindAdmin({ root: app.querySelector('.cms-page'), data, session: getCurrentSession(), getUsers: getLocalUsers, escapeHtml: esc, databaseMode: databaseAuthMode, apiRequest: userApi }); if (route === 'shop') bindShop({ root: app.querySelector('.twini-shop'), catalog: data.merch, escapeHtml: esc }); if (route === 'home') { const heroImage = app.querySelector('.hero-art'); if (heroImage) heroImage.outerHTML = heroCarouselMarkup(); addHomeFeatures(); bindHomeCarousel(); } window.scrollTo(0,0); }
window.addEventListener('hashchange', () => { const route = location.hash.slice(1) || 'home'; if (routeHistory.length > 1 && routeHistory[routeHistory.length - 2] === route) routeHistory.pop(); else if (routeHistory[routeHistory.length - 1] !== route) routeHistory.push(route); render(); });
backButton.addEventListener('click', () => { if (routeHistory.length > 1) history.back(); else if (location.hash.slice(1) !== 'home') location.hash = 'home'; });
nav.addEventListener('click', event => { const link = event.target.closest('a[data-route]'); if (!link) return; link.classList.remove('nav-bounce'); void link.offsetWidth; link.classList.add('nav-bounce'); setTimeout(() => link.classList.remove('nav-bounce'), 750); });
startLaunchExperience();
initTwiniWidget();
load().catch(() => { app.innerHTML = '<div class="empty">Data belum dapat dimuat. Jalankan aplikasi melalui server lokal, bukan dengan membuka file langsung.</div>'; }).finally(completeAppLoad);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
