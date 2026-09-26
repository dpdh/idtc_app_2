const app = document.querySelector('#app');
const nav = document.querySelector('.bottom-nav');
let data;

const esc = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[char]));
const photoSrc = value => value ? `${value}?v=4` : '';
const percent = (value, total) => Math.round(value / total * 100);
const colorClass = color => color === 'orange' ? 'orange' : color === 'purple' ? 'purple' : '';
const sectionHead = (label, title, note = '') => `<div class="section-head"><div><p class="section-label">${label}</p><h2>${title}</h2>${note ? `<p class="section-note">${note}</p>` : ''}</div></div>`;

const onboardingSlides = [
  { kicker: 'INDONESIA DIGITAL TWIN COMMUNITY', title: 'Satu data.<br>Satu masa depan.', text: 'Ruang kolaborasi untuk membangun ekosistem Digital Twin Indonesia.', type: 'cover' },
  { kicker: '01 / TENTANG', title: 'Menghubungkan<br>yang berdampak.', text: 'IDTC mempertemukan pemerintah, akademisi, industri, BUMN, dan komunitas dalam satu ekosistem terbuka.', type: 'network' },
  { kicker: '02 / PENGURUS', title: 'Digerakkan oleh<br>kolaborasi.', text: 'Kenali pengurus dan tim yang mengoordinasikan arah strategis IDTC 2026–2029.', type: 'people' },
  { kicker: '03 / POKJA', title: 'Tiga jalur.<br>Satu tujuan.', text: 'Standar & Kebijakan, Pilot Project, serta SDM & Ekosistem mengubah gagasan menjadi dampak.', type: 'work' },
  { kicker: '04 / BELAJAR', title: 'Tumbuh sesuai<br>peranmu.', text: 'Temukan peta belajar Digital Twin untuk pengambil keputusan, praktisi data, dan pengembang sistem.', type: 'learn' },
  { kicker: '05 / PRODUK', title: 'Ide yang menjadi<br>artefak nyata.', text: 'Jelajahi framework, handbook, dan template yang lahir dari kerja bersama komunitas.', type: 'product' },
  { kicker: '06 / EKOSISTEM', title: 'Banyak perspektif.<br>Satu ekosistem.', text: 'Lihat profil anggota dan sektor yang ikut membentuk masa depan Digital Twin Indonesia.', type: 'ecosystem' },
  { kicker: '07 / MULAI', title: 'Masa depan<br>dimulai bersama.', text: 'Masuk ke IDTC, temukan jalur kontribusimu, dan ikut membangun dampak yang bisa direplikasi.', type: 'start' }
];

function onboarding() {
  const slides = onboardingSlides.map((slide, index) => `<article class="onboarding-slide onboarding-slide--${slide.type}" data-slide="${index}"><div class="onboarding-visual" aria-hidden="true">${index === 0 ? '<img src="assets/img/emblem-white.png" alt="" /><span class="logo-wordmark">IDTC</span><i class="orbit orbit-a"></i><i class="orbit orbit-b"></i>' : `<span class="visual-number">0${index}</span><span class="visual-line"></span><span class="visual-node node-a"></span><span class="visual-node node-b"></span>`}</div><div class="onboarding-copy"><p class="onboarding-kicker">${slide.kicker}</p><h1>${slide.title}</h1><p>${slide.text}</p></div></article>`).join('');
  return `<section class="onboarding" aria-label="Pengenalan IDTC"><button class="onboarding-skip" type="button" data-onboarding-skip>Lewati</button><div class="onboarding-track">${slides}</div><div class="onboarding-footer"><div class="onboarding-dots">${onboardingSlides.map((_, index) => `<button type="button" data-slide-dot="${index}" aria-label="Slide ${index + 1}"></button>`).join('')}</div><div class="onboarding-actions"><button class="onboarding-back" type="button" data-onboarding-back>←</button><button class="button primary onboarding-next" type="button" data-onboarding-next>Berikutnya <span>→</span></button></div></div></section>`;
}

function bindOnboarding() {
  const root = app.querySelector('.onboarding');
  if (!root) return;
  let current = 0;
  const slides = [...root.querySelectorAll('.onboarding-slide')];
  const dots = [...root.querySelectorAll('[data-slide-dot]')];
  const next = root.querySelector('[data-onboarding-next]');
  const update = index => { current = Math.max(0, Math.min(index, slides.length - 1)); slides.forEach((slide, i) => slide.classList.toggle('is-visible', i === current)); dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current)); next.innerHTML = current === slides.length - 1 ? 'Mulai menjelajah <span>→</span>' : 'Berikutnya <span>→</span>'; };
  const finish = () => { localStorage.setItem('idtc-onboarding-seen', 'true'); location.hash = 'home'; };
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
  return `<section class="auth-page"><div class="auth-backdrop" aria-hidden="true"><span></span><span></span><span></span></div><div class="auth-card"><a class="auth-mark" href="#home" aria-label="Kembali ke Home"><img src="assets/img/emblem-white.png" alt="" /><span>IDTC</span></a><p class="auth-kicker">MEMBERS AREA</p><h1 data-auth-title>Selamat datang kembali</h1><p class="auth-intro" data-auth-intro>Masuk untuk melanjutkan perjalananmu di ekosistem Digital Twin Indonesia.</p><div class="auth-tabs"><button type="button" class="is-active" data-auth-mode="login">Masuk</button><button type="button" data-auth-mode="register">Daftar</button></div><form class="auth-form" data-auth-form><label class="auth-name-field" hidden>Nama lengkap<input name="name" type="text" placeholder="Nama lengkap" autocomplete="name" /></label><label>Email<input name="email" type="email" placeholder="nama@institusi.id" autocomplete="email" required /></label><label>Kata sandi<input name="password" type="password" placeholder="Minimal 6 karakter" autocomplete="current-password" minlength="6" required /></label><button class="button primary auth-submit" type="submit" data-auth-submit>Masuk ke IDTC <span>→</span></button></form><div class="auth-divider"><span>atau lanjutkan dengan</span></div><button class="google-button" type="button" data-google-auth><span class="google-g">G</span> Lanjutkan dengan Google</button><p class="auth-status" data-auth-status role="status"></p><p class="auth-legal">Dengan melanjutkan, kamu menyetujui ruang kolaborasi terbuka IDTC.</p></div></section>`;
}

function bindAuth() {
  const root = app.querySelector('.auth-page');
  if (!root) return;
  let mode = 'login';
  const title = root.querySelector('[data-auth-title]');
  const intro = root.querySelector('[data-auth-intro]');
  const nameField = root.querySelector('.auth-name-field');
  const submit = root.querySelector('[data-auth-submit]');
  const status = root.querySelector('[data-auth-status]');
  const updateMode = nextMode => { mode = nextMode; const register = mode === 'register'; title.textContent = register ? 'Buat ruang kontribusimu' : 'Selamat datang kembali'; intro.textContent = register ? 'Bergabung dengan komunitas yang membangun masa depan Digital Twin Indonesia.' : 'Masuk untuk melanjutkan perjalananmu di ekosistem Digital Twin Indonesia.'; nameField.hidden = !register; submit.innerHTML = register ? 'Buat akun IDTC <span>→</span>' : 'Masuk ke IDTC <span>→</span>'; root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.authMode === mode)); status.textContent = ''; };
  root.querySelectorAll('[data-auth-mode]').forEach(tab => tab.addEventListener('click', () => updateMode(tab.dataset.authMode)));
  root.querySelector('[data-auth-form]').addEventListener('submit', event => { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get('email')).trim().toLowerCase(); const password = String(form.get('password')); const users = JSON.parse(localStorage.getItem('idtc-users') || '[]'); if (mode === 'register') { if (users.some(user => user.email === email)) { status.textContent = 'Email ini sudah terdaftar. Silakan masuk.'; return; } users.push({ name: String(form.get('name')).trim(), email, password }); localStorage.setItem('idtc-users', JSON.stringify(users)); localStorage.setItem('idtc-session', JSON.stringify({ name: String(form.get('name')).trim(), email })); location.hash = 'home'; return; } const user = users.find(item => item.email === email && item.password === password); if (!user) { status.textContent = 'Email atau kata sandi belum sesuai.'; return; } localStorage.setItem('idtc-session', JSON.stringify({ name: user.name, email: user.email })); location.hash = 'home'; });
  root.querySelector('[data-google-auth]').addEventListener('click', () => { status.textContent = 'Login Google siap digunakan setelah Google Client ID dikonfigurasi.'; });
}

function home() {
  const { anggota, struktur, produk } = data;
  const map = '<div class="hero-map" data-map-placeholder aria-hidden="true"></div>';
  return `<section class="hero">${map}<div class="hero-content"><p class="eyebrow">Connect · Collaborate · Innovate</p><h1>Satu Data, Satu Visi, <em>Satu Masa Depan</em></h1><p>Wadah kolaborasi pemerintah, akademisi, BUMN, dan swasta untuk membangun ekosistem Digital Twin Indonesia melalui pilot project nyata.</p><div class="hero-actions"><a class="button primary" href="#pokja">Jelajahi Pokja ↗</a><a class="button ghost" href="https://github.com/idtc-id" target="_blank" rel="noreferrer">Berkontribusi</a></div><img class="hero-art" src="assets/img/pokja/hero-maskot.jpg" alt="Maskot IDTC dan model digital twin kota" /></div></section><section class="section">${sectionHead('Snapshot komunitas','Kolaborasi yang bergerak','Data terbaru dari komunitas IDTC')}<div class="stat-grid"><div class="stat"><strong>${anggota.respons}</strong><span>Responden anggota</span></div><div class="stat"><strong>3</strong><span>Kelompok kerja</span></div><div class="stat"><strong>${produk.length}</strong><span>Produk terbaru</span></div></div>${sectionHead('Fokus kerja','Dari standar ke dampak')}<div class="card"><h3>Indonesia Digital Twin Community</h3><p>Netral platform, data sesuai izin, terbuka dan terdokumentasi. Semua kontribusi diarahkan untuk infrastruktur, lingkungan, dan masyarakat yang lebih baik.</p><div class="chips"><span class="chip">Standar terbuka</span><span class="chip orange">Pilot nyata</span><span class="chip purple">SDM & ekosistem</span></div></div></section>`;
}
function pokja() {
  const cards = data.struktur.pokja.map(item => `<article class="card pokja-card"><div class="color-bar ${colorClass(item.warna)}"></div><img class="pokja-image" src="${esc(item.banner)}" alt="${esc(item.nama)}" onerror="this.style.display='none'" /><div class="card-body"><p class="role ${colorClass(item.warna)}">POKJA ${item.nomor}</p><h3>${esc(item.nama)}</h3><p>${esc(item.slogan)}</p><div class="chips">${item.fokus.slice(0,4).map(tag => `<span class="chip ${colorClass(item.warna)}">${esc(tag)}</span>`).join('')}</div><p style="margin-top:13px"><b>Ketua:</b> ${esc(item.ketua.nama)}</p></div></article>`).join('');
  return `<section class="section">${sectionHead('Kelompok kerja','Tiga jalur dampak','Setiap Pokja mengubah gagasan menjadi kontribusi yang terukur.')} ${cards}</section>`;
}
function pengurus() {
  const { dewanPembina, pengurus } = data.struktur;
  const leader = item => `<div class="list-item"><div class="person-avatar">${item.foto ? `<img src="${esc(photoSrc(item.foto))}" alt="Foto ${esc(item.nama || 'pengurus')}" onerror="this.hidden=true;this.parentElement.classList.add('photo-missing')" />` : esc((item.nama || '—').slice(0, 1))}</div><div><strong>${esc(item.nama || 'Belum diisi')}</strong><small>${esc(item.peran)}</small></div></div>`;
  const featured = item => `<div class="featured-person"><div class="featured-avatar">${item.foto ? `<img src="${esc(photoSrc(item.foto))}" alt="Foto ${esc(item.nama)}" onerror="this.hidden=true;this.parentElement.classList.add('photo-missing')" />` : esc(item.nama.slice(0, 1))}</div><div><h3>${esc(item.nama)}</h3><p class="role">${esc(item.peran)}</p></div></div>`;
  return `<section class="section">${sectionHead('Struktur organisasi','Pengurus IDTC 2026–2029','Kepemimpinan, koordinasi, dan pelaksanaan program.')}<div class="card">${featured(pengurus.ketua)}${pengurus.wakil.map(leader).join('')}</div><div class="card"><h3>Tim sekretariat</h3>${pengurus.sekjen.map(leader).join('')}</div><div class="card">${featured(dewanPembina.ketua)}<p>${esc(dewanPembina.desc)}</p>${dewanPembina.unit.map(unit => `<div class="list-item"><span class="index">◈</span><div><strong>${esc(unit.nama)}</strong><small>${esc(unit.desc)}</small></div></div>`).join('')}</div></section>`;
}
function tentang() {
  const principles = [
    ['Netral platform', 'Mengutamakan standar terbuka dan interoperabilitas antar sistem dan sektor.'],
    ['Data sesuai izin', 'Data mitra digunakan sesuai kesepakatan dan kebijakan yang berlaku.'],
    ['Terbuka & terdokumentasi', 'Hasil dan pembelajaran dibagikan agar dapat direplikasi.'],
    ['Setara & konstruktif', 'Semua anggota memiliki ruang untuk berkontribusi dan berkembang.']
  ];
  return `<section class="section">${sectionHead('Tentang IDTC','Membangun ekosistem Digital Twin','People · Data · Places · A Brighter Indonesia')}<div class="card"><h3>Indonesia Digital Twin Community</h3><p>IDTC menghubungkan pemerintah, akademisi, BUMN, industri, dan komunitas untuk berbagi pengetahuan serta membangun Digital Twin Indonesia melalui kolaborasi nyata.</p><div class="chips"><span class="chip">Kolaborasi</span><span class="chip orange">Inovasi</span><span class="chip purple">Dampak nyata</span></div></div>${principles.map(([title, description]) => `<div class="card"><h3>${title}</h3><p>${description}</p></div>`).join('')}<a class="button primary" href="https://github.com/idtc-id" target="_blank" rel="noreferrer">Kunjungi GitHub IDTC ↗</a></section>`;
}
function belajar() {
  const paths = data.materi.jalur.map(path => { const ready = path.modul.filter(m => m.tautan).length; return `<article class="card"><div style="display:flex;justify-content:space-between;gap:12px"><div><p class="role ${colorClass(path.warna)}">JALUR ${path.kode}</p><h3>${esc(path.nama)}</h3><p>${esc(path.sasaran)}</p></div><strong style="font:700 22px 'Space Grotesk';color:var(--teal)">${ready}/${path.modul.length}</strong></div><div class="progress"><i style="width:${percent(ready,path.modul.length)}%"></i></div><div>${path.modul.map((m,i) => `<div class="list-item"><span class="index">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(m.judul)}</strong><small>${esc(m.tingkat)} · ${esc(m.status)}</small></div></div>`).join('')}</div></article>`; }).join('');
  return `<section class="section">${sectionHead('Materi belajar','Peta belajar Digital Twin','Pilih jalur yang sesuai dengan peran dan kebutuhanmu.')} ${paths}</section>`;
}
function profil() {
  const { anggota } = data; const max = anggota.ekosistem[0].jumlah;
  const bars = anggota.ekosistem.map(item => `<div class="bar-row"><div class="bar-label"><span>${esc(item.nama)}</span><span>${item.jumlah}</span></div><div class="progress"><i style="width:${percent(item.jumlah,max)}%"></i></div></div>`).join('');
  const sectors = anggota.sektor.slice(0,6).map(item => `<div class="list-item"><span class="index">${item.jumlah}</span><div><strong>${esc(item.nama)}</strong><small>Anggota yang bergerak di sektor ini</small></div></div>`).join('');
  return `<section class="section">${sectionHead('Profil anggota','Satu ekosistem, banyak perspektif','Gambaran anggota IDTC dari database pendaftaran.')}<div class="profile-intro"><strong>${anggota.namaUnik}</strong><p>nama unik dari ${anggota.respons} responden</p></div><div class="card"><h3>Komposisi ekosistem</h3>${bars}</div><div class="card"><h3>Sektor teratas</h3>${sectors}</div><div class="card"><h3>Institusi dengan anggota terbanyak</h3>${anggota.topInstitusi.slice(0,5).map((item,i) => `<div class="list-item"><span class="index">${i+1}</span><div><strong>${esc(item.nama)}</strong><small>${item.jumlah} anggota</small></div></div>`).join('')}</div></section>`;
}
const views = { home, pengurus, tentang, pokja, belajar, onboarding, auth };
async function load() {
  const [anggota, materi, struktur, produk] = await Promise.all(['anggota','materi','struktur','produk'].map(name => fetch(`data/${name}.json`).then(response => response.json())));
  data = { anggota, materi, struktur, produk }; render();
}
async function loadHomeMap() { const target = app.querySelector('[data-map-placeholder]'); if (!target) return; try { const response = await fetch('assets/img/indonesia-map.svg?v=2'); target.innerHTML = await response.text(); target.querySelector('svg')?.setAttribute('aria-hidden', 'true'); } catch { target.classList.add('map-fallback'); } }
function render() { const route = location.hash.slice(1) || (localStorage.getItem('idtc-onboarding-seen') ? 'home' : 'onboarding'); document.body.classList.toggle('onboarding-mode', route === 'onboarding'); document.body.classList.toggle('auth-mode', route === 'auth'); app.innerHTML = views[route]?.() || home(); nav.querySelectorAll('a').forEach(link => link.classList.toggle('active', link.dataset.route === route)); if (route === 'onboarding') bindOnboarding(); if (route === 'auth') bindAuth(); if (route === 'home') loadHomeMap(); window.scrollTo(0,0); }
window.addEventListener('hashchange', render);
nav.addEventListener('click', event => { const link = event.target.closest('a[data-route]'); if (!link) return; link.classList.remove('nav-bounce'); void link.offsetWidth; link.classList.add('nav-bounce'); setTimeout(() => link.classList.remove('nav-bounce'), 750); });
load().catch(() => { app.innerHTML = '<div class="empty">Data belum dapat dimuat. Jalankan aplikasi melalui server lokal, bukan dengan membuka file langsung.</div>'; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
