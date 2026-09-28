const app = document.querySelector('#app');
const nav = document.querySelector('.bottom-nav');
const backButton = document.querySelector('[data-back]');
import { adminPanel, bindAdmin } from './admin-cms.js?v=3';
import { shopPage, bindShop } from './shop.js?v=3';
import { hashPassword, verifyPassword } from './auth-security.js?v=1';
import { bindImageZoom } from './image-zoom.js?v=2';
import { bubbleFieldMarkup } from './ambient-bubbles.js?v=1';
bindImageZoom();
let data;
let completeAppLoad;
const appReady = new Promise(resolve => { completeAppLoad = resolve; });
function startLaunchExperience() {
  const screen = document.querySelector('[data-launch-screen]');
  if (!screen) return;
  screen.querySelector('[data-launch-bubbles]').innerHTML = bubbleFieldMarkup(16, 1);
  const splashDelay = new Promise(resolve => setTimeout(() => {
    screen.classList.add('is-logo');
    screen.setAttribute('aria-label', 'Indonesia Digital Twin Community');
    resolve();
  }, 1000));
  Promise.all([splashDelay, appReady]).then(() => setTimeout(() => {
    screen.classList.add('is-leaving');
    setTimeout(() => { screen.hidden = true; }, 550);
  }, 1800));
}
function getCurrentSession() {
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
  return `<section class="auth-page"><div class="auth-backdrop" aria-hidden="true"><span></span><span></span><span></span></div><div class="auth-card"><a class="auth-mark" href="#home" aria-label="Kembali ke Home"><img src="assets/img/emblem-white.png" alt="" /><span>IDTC</span></a><p class="auth-kicker">MEMBERS AREA</p><h1 data-auth-title>Selamat datang kembali</h1><p class="auth-intro" data-auth-intro>Masuk untuk melanjutkan perjalananmu di ekosistem Digital Twin Indonesia.</p><div class="auth-tabs"><button type="button" class="is-active" data-auth-mode="login">Masuk</button><button type="button" data-auth-mode="register">Daftar</button></div><form class="auth-form" data-auth-form><label class="auth-name-field" hidden>Nama lengkap<input name="name" type="text" placeholder="Nama lengkap" autocomplete="name" /></label><label>Email<input name="email" type="email" placeholder="nama@institusi.id" autocomplete="email" required /></label><label>Kata sandi<input name="password" type="password" placeholder="Minimal 6 karakter" autocomplete="current-password" minlength="6" required /></label><button class="button primary auth-submit" type="submit" data-auth-submit>Masuk ke IDTC <span>→</span></button></form><div class="auth-divider"><span>atau lanjutkan dengan</span></div><button class="google-button" type="button" data-google-auth><span class="google-g">G</span> Lanjutkan dengan Google</button><p class="auth-status" data-auth-status role="status"></p><p class="auth-legal">Dengan melanjutkan, kamu menyetujui ruang kolaborasi terbuka IDTC.</p></div>${idtcAppAboutMarkup()}</section>`;
}

function bindAuth() {
  const root = app.querySelector('.auth-page');
  if (!root) return;
  let mode = 'login';
  const title = root.querySelector('[data-auth-title]');
  const intro = root.querySelector('[data-auth-intro]');
  const nameField = root.querySelector('.auth-name-field');
  const passwordField = root.querySelector('input[name="password"]');
  const submit = root.querySelector('[data-auth-submit]');
  const status = root.querySelector('[data-auth-status]');
  const localNotice = document.createElement('p');
  localNotice.className = 'auth-local-notice';
  localNotice.textContent = 'Pendaftaran pertama pada perangkat ini menjadi Super Admin lokal. Akun dan CMS tersimpan di perangkat ini dan belum tersinkron ke server.';
  root.querySelector('.auth-legal').insertAdjacentElement('beforebegin', localNotice);
  const updateMode = nextMode => { mode = nextMode; const register = mode === 'register'; title.textContent = register ? 'Buat ruang kontribusimu' : 'Selamat datang kembali'; intro.textContent = register ? 'Bergabung dengan komunitas yang membangun masa depan Digital Twin Indonesia.' : 'Masuk untuk melanjutkan perjalananmu di ekosistem Digital Twin Indonesia.'; nameField.hidden = !register; passwordField.minLength = register ? 12 : 0; passwordField.placeholder = register ? 'Minimal 12 karakter' : 'Kata sandi'; passwordField.autocomplete = register ? 'new-password' : 'current-password'; submit.innerHTML = register ? 'Buat akun IDTC <span>→</span>' : 'Masuk ke IDTC <span>→</span>'; root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.authMode === mode)); status.textContent = ''; };
  updateMode('login');
  root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.addEventListener('click', () => updateMode(tab.dataset.authMode)));
  root.querySelector('[data-auth-form]').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));
    const users = getLocalUsers();
    const submitButton = root.querySelector('[data-auth-submit]');
    submitButton.disabled = true;
    status.textContent = '';
    try {
      if (mode === 'register') {
        const name = String(form.get('name')).trim();
        if (users.some(user => user.email === email)) { status.textContent = 'Email ini sudah terdaftar. Silakan masuk.'; return; }
        const role = users.some(user => user.role === 'super_admin') ? 'member' : 'super_admin';
        const passwordRecord = await hashPassword(password);
        users.push({ name, email, ...passwordRecord, role, createdAt: new Date().toISOString() });
        localStorage.setItem('idtc-users', JSON.stringify(users));
        localStorage.setItem('idtc-session', JSON.stringify({ name, email, role }));
        location.hash = 'home';
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
      status.textContent = 'Penyimpanan sandi aman tidak tersedia di browser ini. Perbarui Android System WebView atau gunakan browser modern.';
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
function pokja() {
  const cards = data.struktur.pokja.map(item => {
    const program = item.arahProgram ? `<section class="pokja-program" aria-label="Arahan program kerja POKJA ${item.nomor}"><div class="pokja-program-intro"><p class="section-label">Arahan program kerja</p><h4>Blueprint Digital Twin Indonesia</h4><p>${esc(item.arahProgram.ringkasan)}</p></div><h5>Bidang kerja</h5><ol class="pokja-program-workstreams">${item.arahProgram.bidangKerja.map((workstream, index) => `<li><span class="pokja-program-number">${String(index + 1).padStart(2, '0')}</span><div><strong>${esc(workstream.judul)}</strong><p>${esc(workstream.cakupan)}</p></div></li>`).join('')}</ol><section class="pokja-program-outputs"><h5>Keluaran konkret</h5>${item.arahProgram.keluaran.map(output => `<div><strong>${esc(output.judul)}</strong><p>${esc(output.cakupan)}</p></div>`).join('')}</section><section class="pokja-program-distinction"><h5>Pembeda model 3D dan Digital Twin</h5>${item.arahProgram.pembeda.map(point => `<div><strong>${esc(point.judul)}</strong><p>${esc(point.cakupan)}</p></div>`).join('')}</section></section>` : '';
    return `<article class="card pokja-card"><div class="color-bar ${colorClass(item.warna)}"></div><img class="pokja-image" src="${esc(item.banner)}" alt="${esc(item.nama)}" onerror="this.style.display='none'" /><div class="card-body"><p class="role ${colorClass(item.warna)}">POKJA ${item.nomor}</p><h3>${esc(item.nama)}</h3><p>${esc(item.slogan)}</p><div class="chips">${item.fokus.slice(0,4).map(tag => `<span class="chip ${colorClass(item.warna)}">${esc(tag)}</span>`).join('')}</div><p style="margin-top:13px"><b>Ketua:</b> ${esc(item.ketua.nama)}</p>${program}</div></article>`;
  }).join('');
  return `<section class="section">${sectionHead('Kelompok kerja','Tiga jalur dampak','Setiap Pokja mengubah gagasan menjadi kontribusi yang terukur.')} ${cards}</section>`;
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

function bindProfile() {
  const root = app.querySelector('.profile-page');
  const mode = app.querySelector('[data-setting-mode]');
  const theme = app.querySelector('[data-setting-theme]');
  const session = getCurrentSession();
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
  root?.querySelector('[data-profile-logout]')?.addEventListener('click', () => {
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
function learningRoute(path, moduleIndex) { return `#pembelajaran/${path.id}/${moduleIndex}`; }
function learningChecklistKey(path, module) { return `idtc-learning-checklist:${path.id}:${encodeURIComponent(module.judul)}`; }
function checklistItems(module) { return ['Baca ringkasan dan tujuan pembelajaran', ...(module.fokus || []).map(item => `Pelajari: ${item}`)]; }
function savedChecklist(key) {
  try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; }
}
function renderLessonBlock(block, depth = 0) {
  const heading = depth === 0 ? 'h3' : 'h4';
  const title = block.judul ? `<${heading}>${esc(block.judul)}</${heading}>` : '';
  const paragraphs = (block.paragraf || []).map(paragraph => `<p>${esc(paragraph)}</p>`).join('');
  const points = (block.poin || []).length ? `<ul>${block.poin.map(point => `<li>${esc(point)}</li>`).join('')}</ul>` : '';
  const steps = (block.langkah || []).length ? `<ol>${block.langkah.map(step => `<li>${esc(step)}</li>`).join('')}</ol>` : '';
  const flow = (block.alur || []).length ? `<ol class="lesson-flow">${block.alur.map(step => `<li>${esc(step)}</li>`).join('')}</ol>` : '';
  const quote = block.kutipan ? `<blockquote>${esc(block.kutipan)}</blockquote>` : '';
  const note = block.catatan ? `<aside class="lesson-note"><strong>Catatan</strong><p>${esc(block.catatan)}</p></aside>` : '';
  const table = block.tabel ? `<div class="lesson-table-wrap"><table><thead><tr>${block.tabel.kolom.map(cell => `<th scope="col">${esc(cell)}</th>`).join('')}</tr></thead><tbody>${block.tabel.baris.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const subsections = (block.subbagian || []).map(item => renderLessonBlock(item, depth + 1)).join('');
  return `<section class="lesson-block ${depth ? 'lesson-subsection' : ''}">${title}${paragraphs}${points}${steps}${flow}${table}${quote}${note}${subsections}</section>`;
}
function belajar() {
  const paths = data.materi.jalur.map(path => { const completed = path.modul.filter(module => checklistItems(module).every((_, index) => savedChecklist(learningChecklistKey(path, module))[index])).length; return `<article class="card"><div style="display:flex;justify-content:space-between;gap:12px"><div><p class="role ${colorClass(path.warna)}">JALUR ${path.kode}</p><h3>${esc(path.nama)}</h3><p>${esc(path.sasaran)}</p></div><strong style="font:700 22px 'Space Grotesk';color:var(--teal)">${completed}/${path.modul.length}</strong></div><div class="progress"><i style="width:${percent(completed,path.modul.length)}%"></i></div><div>${path.modul.map((m,i) => `<details class="module-detail"><summary><span class="index">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(m.judul)}</strong><small>${esc(m.tingkat)} · ${esc(m.status)}</small></span><b>Lihat materi</b></summary><div class="module-content"><p>${esc(m.ringkasan || 'Materi pembelajaran akan segera tersedia.')}</p><div class="chips">${(m.fokus || []).map(tag => `<span class="chip ${colorClass(path.warna)}">${esc(tag)}</span>`).join('')}</div><p class="module-result"><strong>Hasil belajar:</strong> ${esc(m.hasil || 'Memahami topik modul dan kaitannya dengan Digital Twin.')}</p><a class="button primary module-start" href="${learningRoute(path, i)}">Mulai Belajar</a>${m.tautan ? `<a href="${esc(m.tautan)}" target="_blank" rel="noreferrer">Buka modul ↗</a>` : ''}</div></details>`).join('')}</div></article>`; }).join('');
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
  const key = learningChecklistKey(path, module);
  const checked = savedChecklist(key);
  const completed = checklist.reduce((total, _, index) => total + (checked[index] ? 1 : 0), 0);
  const progress = checklist.length ? Math.round(completed / checklist.length * 100) : 0;
  const previous = moduleIndex > 0 ? `<a class="button ghost" href="${learningRoute(path, moduleIndex - 1)}">← Sebelumnya</a>` : '<span></span>';
  const next = moduleIndex < path.modul.length - 1 ? `<a class="button primary" href="${learningRoute(path, moduleIndex + 1)}">Berikutnya →</a>` : '<a class="button primary" href="#belajar">Selesai</a>';
  return `<section class="section learning-page"><a class="learning-back" href="#belajar">← Kembali ke semua jalur</a>${sectionHead(`JALUR ${path.kode} · MODUL ${String(moduleIndex + 1).padStart(2, '0')}`, esc(module.judul), `${esc(path.nama)} · ${esc(module.tingkat)}`)}<article class="card learning-card"><p class="section-label">Materi inti</p><p class="learning-summary">${esc(module.ringkasan || 'Materi pembelajaran akan segera tersedia.')}</p><div class="chips">${(module.fokus || []).map(item => `<span class="chip ${colorClass(path.warna)}">${esc(item)}</span>`).join('')}</div>${module.konten?.length ? `<div class="learning-content">${module.konten.map(block => renderLessonBlock(block)).join('')}</div>` : ''}<p class="learning-outcome"><strong>Hasil belajar</strong>${esc(module.hasil || 'Memahami topik modul dan kaitannya dengan Digital Twin.')}</p><section class="learning-checklist" data-checklist-key="${esc(key)}" aria-labelledby="learning-checklist-title"><div class="learning-checklist-heading"><h3 id="learning-checklist-title">Checklist pembelajaran</h3><span data-checklist-count aria-live="polite">${completed} dari ${checklist.length} selesai</span></div><div class="progress learning-checklist-progress" role="progressbar" aria-label="Progres checklist" aria-valuemin="0" aria-valuemax="${checklist.length}" aria-valuenow="${completed}"><i style="width:${progress}%"></i></div><div class="learning-checklist-items">${checklist.map((item, index) => `<label class="learning-check-item"><input type="checkbox" data-learning-check ${checked[index] ? 'checked' : ''}><span>${esc(item)}</span></label>`).join('')}</div></section></article><nav class="learning-pagination" aria-label="Navigasi pembelajaran">${previous}${next}</nav></section>`;
}
function bindLearningChecklist() {
  const checklist = app.querySelector('[data-checklist-key]');
  if (!checklist) return;
  const key = checklist.dataset.checklistKey;
  const checkboxes = [...checklist.querySelectorAll('[data-learning-check]')];
  checkboxes.forEach(checkbox => checkbox.addEventListener('change', () => {
    const completed = checkboxes.filter(item => item.checked).length;
    const progress = checkboxes.length ? Math.round(completed / checkboxes.length * 100) : 0;
    localStorage.setItem(key, JSON.stringify(checkboxes.map(item => item.checked)));
    checklist.querySelector('[data-checklist-count]').textContent = `${completed} dari ${checkboxes.length} selesai`;
    const progressBar = checklist.querySelector('[role="progressbar"]');
    progressBar.setAttribute('aria-valuenow', String(completed));
    progressBar.querySelector('i').style.width = `${progress}%`;
  }));
}
function profil() {
  const { anggota } = data; const max = anggota.ekosistem[0].jumlah;
  const bars = anggota.ekosistem.map(item => `<div class="bar-row"><div class="bar-label"><span>${esc(item.nama)}</span><span>${item.jumlah}</span></div><div class="progress"><i style="width:${percent(item.jumlah,max)}%"></i></div></div>`).join('');
  const sectors = anggota.sektor.slice(0,6).map(item => `<div class="list-item"><span class="index">${item.jumlah}</span><div><strong>${esc(item.nama)}</strong><small>Anggota yang bergerak di sektor ini</small></div></div>`).join('');
  return `<section class="section">${sectionHead('Profil anggota','Satu ekosistem, banyak perspektif','Gambaran anggota IDTC dari database pendaftaran.')}<div class="profile-intro"><strong>${anggota.namaUnik}</strong><p>nama unik dari ${anggota.respons} responden</p></div><div class="card"><h3>Komposisi ekosistem</h3>${bars}</div><div class="card"><h3>Sektor teratas</h3>${sectors}</div><div class="card"><h3>Institusi dengan anggota terbanyak</h3>${anggota.topInstitusi.slice(0,5).map((item,i) => `<div class="list-item"><span class="index">${i+1}</span><div><strong>${esc(item.nama)}</strong><small>${item.jumlah} anggota</small></div></div>`).join('')}</div></section>`;
}
function hasCmsAccess(session = getCurrentSession()) { return ['admin', 'super_admin'].includes(session?.role); }
const views = { home, pengurus, profile, pokja, belajar, onboarding, auth, shop: () => shopPage(), admin: () => adminPanel(getCurrentSession(), esc) };
const TWINIAI_STOP_WORDS = new Set(['apa', 'apakah', 'bagaimana', 'mengapa', 'kenapa', 'siapa', 'kapan', 'dimana', 'di', 'ke', 'dari', 'dan', 'atau', 'yang', 'itu', 'ini', 'adalah', 'untuk', 'pada', 'dengan', 'tentang', 'saya', 'aku', 'tolong', 'bisa', 'dapat', 'kah', 'nya']);
const TWINIAI_COMMON_WORDS = new Set(['digital', 'twin', 'data']);
const TWINIAI_FALLBACK = 'Saya belum menemukan jawaban yang cukup cocok di basis pengetahuan TwiniAI. Coba tanyakan tentang konsep, data, standar, arsitektur, keamanan, penerapan, biaya, atau langkah pilot.';
function normalizeTwiniText(value) {
  return String(value || '').toLocaleLowerCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function twiniTokens(value) {
  return normalizeTwiniText(value).split(/\s+/).filter(token => token.length > 1 && !TWINIAI_STOP_WORDS.has(token));
}
function expandTwiniKnowledge(knowledge) {
  const entries = Array.isArray(knowledge?.entries) ? [...knowledge.entries] : [];
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
  const queryTokens = twiniTokens(question);
  if (!entries.length) return null;
  if (!queryTokens.length) return entries.find(entry => entry.id === 'definisi') || null;
  const ranked = entries.map(entry => {
    const questionText = normalizeTwiniText(entry.question);
    const phrases = [entry.question, ...(entry.keywords || [])].map(normalizeTwiniText);
    const entryTokens = new Set(phrases.flatMap(phrase => phrase.split(' ')));
    let matchedWeight = 0;
    let totalWeight = 0;
    let matchedCount = 0;
    queryTokens.forEach(token => {
      const weight = TWINIAI_COMMON_WORDS.has(token) ? 0.35 : 1;
      totalWeight += weight;
      if (entryTokens.has(token)) {
        matchedWeight += weight;
        matchedCount += 1;
      } else if ([...entryTokens].some(candidate => candidate.length >= 6 && token.length >= 6 && candidate.slice(0, 5) === token.slice(0, 5))) {
        matchedWeight += weight * 0.55;
        matchedCount += 1;
      }
    });
    let score = totalWeight ? matchedWeight / totalWeight : 0;
    if (questionText === normalizedQuestion || phrases.some(phrase => phrase === normalizedQuestion)) score = 2;
    else if (phrases.some(phrase => phrase.length > 5 && normalizedQuestion.includes(phrase))) score = Math.max(score, 1.1);
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
  if (!panel || !toggle || !messages || !form || !input) return;
  const appendMessage = (role, text) => {
    const message = document.createElement('div');
    message.className = `twini-message${role === 'user' ? ' is-user' : ''}`;
    const label = document.createElement('span');
    label.className = 'twini-message-label';
    label.textContent = role === 'user' ? 'Anda' : 'TwiniAI';
    const content = document.createElement('p');
    content.className = 'twini-message-text';
    content.textContent = text;
    message.append(label, content);
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  };
  const submitQuestion = value => {
    const question = String(value || '').trim().slice(0, 500);
    if (!question) return;
    appendMessage('user', question);
    const entry = matchTwiniQuestion(question);
    appendMessage('assistant', entry ? `${entry.answer}\n\nTopik: ${entry.category}` : TWINIAI_FALLBACK);
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
  form.addEventListener('submit', event => { event.preventDefault(); submitQuestion(input.value); });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 96)}px`; });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.querySelectorAll('[data-twini-prompt]').forEach(button => button.addEventListener('click', () => submitQuestion(button.dataset.twiniPrompt)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) setOpen(false); });
}
async function load() {
  const [anggota, materi, struktur, produk, merch, twini] = await Promise.all([
    ...['anggota', 'materi', 'struktur', 'produk'].map(name => fetch(`data/${name}.json?v=22`).then(response => response.json())),
    fetch('data/merch.json?v=22').then(response => response.json()),
    fetch('data/twini-ai.json?v=3').then(response => response.json()),
  ]);
  await migrateLegacyPasswords();
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('idtc-cms-content') || '{}') || {}; } catch { overrides = {}; }
  data = { anggota, materi: mergeLessonContent(materi, overrides.materi), struktur, produk: overrides.produk || produk, twini: expandTwiniKnowledge(overrides.twini || twini), merch };
  render();
}
function addHomeFeatures() { const actions = app.querySelector('.hero-actions'); if (!actions || app.querySelector('.feature-actions')) return; actions.insertAdjacentHTML('afterend', '<div class="feature-actions" aria-label="Fitur utama"><a href="#belajar" class="feature-button feature-literasi"><span>◫</span>Literasi</a><a href="#profile" class="feature-button feature-regulasi"><span>◇</span>Regulasi</a><a href="#pokja" class="feature-button feature-pilot"><span>◈</span>Pilot Project</a></div>'); }
function render() { stopHomeCarousel(); const route = location.hash.slice(1) || initialRoute(); if (route === 'admin' && !hasCmsAccess()) { location.hash = getCurrentSession() ? 'profile' : 'auth'; return; } document.body.classList.toggle('home-mode', route === 'home'); document.body.classList.toggle('onboarding-mode', route === 'onboarding'); document.body.classList.toggle('auth-mode', route === 'auth'); document.body.classList.toggle('shop-mode', route === 'shop'); applyPreferences(); app.innerHTML = route.startsWith('pembelajaran/') ? halamanPembelajaran(route) : views[route]?.() || home(); app.querySelectorAll('img:not([loading])').forEach(image => { image.loading = 'lazy'; image.decoding = 'async'; }); nav.querySelectorAll('a').forEach(link => link.classList.toggle('active', link.dataset.route === route || (route.startsWith('pembelajaran/') && link.dataset.route === 'belajar'))); if (route === 'onboarding') bindOnboarding(); if (route === 'auth') bindAuth(); if (route === 'profile') bindProfile(); if (route.startsWith('pembelajaran/')) bindLearningChecklist(); if (route === 'admin') bindAdmin({ root: app.querySelector('.cms-page'), data, session: getCurrentSession(), getUsers: getLocalUsers, escapeHtml: esc }); if (route === 'shop') bindShop({ root: app.querySelector('.twini-shop'), catalog: data.merch, escapeHtml: esc }); if (route === 'home') { const heroImage = app.querySelector('.hero-art'); if (heroImage) heroImage.outerHTML = heroCarouselMarkup(); addHomeFeatures(); bindHomeCarousel(); } window.scrollTo(0,0); }
window.addEventListener('hashchange', () => { const route = location.hash.slice(1) || 'home'; if (routeHistory.length > 1 && routeHistory[routeHistory.length - 2] === route) routeHistory.pop(); else if (routeHistory[routeHistory.length - 1] !== route) routeHistory.push(route); render(); });
backButton.addEventListener('click', () => { if (routeHistory.length > 1) history.back(); else if (location.hash.slice(1) !== 'home') location.hash = 'home'; });
nav.addEventListener('click', event => { const link = event.target.closest('a[data-route]'); if (!link) return; link.classList.remove('nav-bounce'); void link.offsetWidth; link.classList.add('nav-bounce'); setTimeout(() => link.classList.remove('nav-bounce'), 750); });
startLaunchExperience();
initTwiniWidget();
load().catch(() => { app.innerHTML = '<div class="empty">Data belum dapat dimuat. Jalankan aplikasi melalui server lokal, bukan dengan membuka file langsung.</div>'; }).finally(completeAppLoad);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
