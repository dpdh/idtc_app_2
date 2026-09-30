import { hashPassword } from './auth-security.js?v=1';

const CONTENT_TYPES = {
  products: { title: 'Produk', singular: 'produk' },
  materials: { title: 'Materi', singular: 'materi' },
  faq: { title: 'FAQ TwiniAI', singular: 'FAQ' },
};

export function adminPanel(session, esc, databaseMode = false) {
  if (!session || !['admin', 'super_admin'].includes(session.role)) {
    return '<section class="section"><h1>Akses CMS dibatasi</h1><p>Masuk dengan akun Admin atau Super Admin.</p></section>';
  }
  const isSuperAdmin = session.role === 'super_admin';
  return `<section class="section cms-page">
    <div class="cms-page-heading"><div><p class="section-label">CMS IDTC</p><h1>Panel administrasi</h1><p class="section-note">Kelola konten aplikasi pada perangkat ini.</p></div><span class="role-badge">${esc(isSuperAdmin ? 'Super Admin' : 'Admin')}</span></div>
    <p class="cms-notice">${databaseMode ? 'Akun dan role disimpan di PostgreSQL dan diperiksa server. Perubahan konten CMS tetap tersimpan lokal pada perangkat ini.' : 'Penyimpanan lokal: perubahan dan akun hanya tersimpan di perangkat/browser ini, belum tersinkron ke server. Ini bukan kontrol keamanan produksi.'}</p>
    <nav class="cms-tabs" aria-label="Bagian CMS">
      <button type="button" class="is-active" data-cms-tab="products" aria-selected="true">Produk</button>
      <button type="button" data-cms-tab="materials" aria-selected="false">Materi</button>
      <button type="button" data-cms-tab="faq" aria-selected="false">FAQ TwiniAI</button>
      ${isSuperAdmin ? '<button type="button" data-cms-tab="users" aria-selected="false">Akun Admin</button>' : ''}
    </nav>
    <section class="cms-content" data-cms-content>
      <header class="cms-toolbar"><div><h2 data-cms-title>Produk</h2><small data-cms-count></small></div><button class="button primary" type="button" data-cms-add>Tambah produk</button></header>
      <div class="cms-list" data-cms-list></div>
      <form class="cms-editor" data-cms-editor hidden>
        <h3 data-cms-editor-title>Tambah konten</h3>
        <label data-cms-row="path">Jalur materi<select name="path"><option value="0">Jalur A</option><option value="1">Jalur B</option><option value="2">Jalur C</option></select></label>
        <label data-cms-row="title">Judul / pertanyaan<input name="title" maxlength="180" required /></label>
        <label data-cms-row="category">Kategori / tingkat<input name="category" maxlength="80" /></label>
        <label data-cms-row="description">Deskripsi / jawaban<textarea name="description" rows="4" maxlength="4000"></textarea></label>
        <label data-cms-row="result">Hasil belajar<textarea name="result" rows="2" maxlength="1200"></textarea></label>
        <label data-cms-row="keywords">Tag / kata kunci<textarea name="keywords" rows="2" placeholder="Pisahkan dengan koma"></textarea></label>
        <label data-cms-row="image">Path gambar<input name="image" placeholder="assets/img/produk/contoh.jpg" /></label>
        <label data-cms-row="link">Tautan sumber<input name="link" type="url" placeholder="https://..." /></label>
        <div class="cms-editor-actions"><button class="button primary" type="submit">Simpan</button><button class="button ghost" type="button" data-cms-cancel>Batal</button></div>
        <p class="cms-status" data-cms-editor-status role="status"></p>
      </form>
    </section>
    ${isSuperAdmin ? `<section class="cms-users" data-cms-users hidden>
      <header class="cms-toolbar"><div><h2>Akun dan role</h2><small>${databaseMode ? 'Dikelola pada PostgreSQL.' : 'Hanya untuk perangkat lokal ini.'}</small></div></header>
      <form class="cms-user-form" data-cms-user-form><label>Nama<input name="name" autocomplete="name" required /></label><label>Email<input name="email" type="email" autocomplete="email" required /></label><label>Kata sandi awal<input name="password" type="password" autocomplete="new-password" minlength="12" required /></label><label>Role<select name="role"><option value="member">Member</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label><button class="button primary" type="submit">Tambah akun</button><p class="cms-status" data-cms-user-status role="status"></p></form>
      <div class="cms-list" data-cms-user-list></div>
    </section>` : ''}
  </section>`;
}

function recordsFor(type, data) {
  if (type === 'products') return data.produk.map((item, index) => ({ key: String(index), title: item.judul, subtitle: item.kategori, item }));
  if (type === 'faq') return data.twini.entries.map((item, index) => ({ key: String(index), title: item.question, subtitle: item.category, item }));
  return data.materi.jalur.flatMap((path, pathIndex) => path.modul.map((item, moduleIndex) => ({ key: `${pathIndex}:${moduleIndex}`, title: item.judul, subtitle: `${path.nama} · ${item.tingkat}`, item, pathIndex, moduleIndex })));
}

function validWebLink(value) {
  const link = String(value || '').trim();
  if (!link) return null;
  try {
    const parsed = new URL(link);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function commaList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

export function bindAdmin({ root, data, session, getUsers, escapeHtml, databaseMode = false, apiRequest }) {
  if (!root || !session || !['admin', 'super_admin'].includes(session.role)) return;
  const isSuperAdmin = session.role === 'super_admin';
  const editor = root.querySelector('[data-cms-editor]');
  const list = root.querySelector('[data-cms-list]');
  const contentPanel = root.querySelector('[data-cms-content]');
  const usersPanel = root.querySelector('[data-cms-users]');
  let activeType = 'products';
  let editingKey = null;

  const persistContent = () => localStorage.setItem('idtc-cms-content', JSON.stringify({ produk: data.produk, materi: data.materi, twini: data.twini }));
  const renderList = () => {
    const records = recordsFor(activeType, data);
    root.querySelector('[data-cms-count]').textContent = `${records.length} item`;
    list.innerHTML = records.map(record => `<article class="cms-entry"><div class="cms-entry-copy"><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.subtitle || 'Belum dikategorikan')}</small></div><div class="cms-entry-actions"><button type="button" class="cms-icon-button" data-cms-edit="${escapeHtml(record.key)}">Edit</button><button type="button" class="cms-icon-button is-danger" data-cms-delete="${escapeHtml(record.key)}">Hapus</button></div></article>`).join('');
    list.querySelectorAll('[data-cms-edit]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.cmsEdit)));
    list.querySelectorAll('[data-cms-delete]').forEach(button => button.addEventListener('click', () => deleteRecord(button.dataset.cmsDelete)));
  };

  const visibleFields = type => {
    const fields = type === 'products' ? ['title', 'category', 'description', 'keywords', 'image', 'link'] : type === 'faq' ? ['title', 'category', 'description', 'keywords'] : ['path', 'title', 'category', 'description', 'result', 'keywords', 'link'];
    editor.querySelectorAll('[data-cms-row]').forEach(row => { row.hidden = !fields.includes(row.dataset.cmsRow); });
    root.querySelector('[data-cms-title]').textContent = CONTENT_TYPES[type].title;
    root.querySelector('[data-cms-add]').textContent = `Tambah ${CONTENT_TYPES[type].singular}`;
  };

  function openEditor(key = null) {
    editingKey = key;
    editor.reset();
    const record = key === null ? null : recordsFor(activeType, data).find(item => item.key === key);
    const item = record?.item || {};
    editor.elements.path.value = String(record?.pathIndex ?? 0);
    editor.elements.title.value = activeType === 'faq' ? item.question || '' : item.judul || '';
    editor.elements.category.value = activeType === 'materials' ? item.tingkat || '' : activeType === 'faq' ? item.category || '' : item.kategori || '';
    editor.elements.description.value = activeType === 'faq' ? item.answer || '' : activeType === 'materials' ? item.ringkasan || '' : item.deskripsi || '';
    editor.elements.result.value = item.hasil || '';
    editor.elements.keywords.value = (activeType === 'faq' ? item.keywords || [] : activeType === 'materials' ? item.fokus || [] : item.tag || []).join(', ');
    editor.elements.image.value = item.gambar || '';
    editor.elements.link.value = item.tautan || '';
    root.querySelector('[data-cms-editor-title]').textContent = key === null ? `Tambah ${CONTENT_TYPES[activeType].singular}` : 'Edit konten';
    root.querySelector('[data-cms-editor-status]').textContent = '';
    visibleFields(activeType);
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    editor.elements.title.focus();
  }

  function deleteRecord(key) {
    if (!window.confirm('Hapus konten ini dari perangkat?')) return;
    if (activeType === 'products') data.produk.splice(Number(key), 1);
    else if (activeType === 'faq') data.twini.entries.splice(Number(key), 1);
    else { const [pathIndex, moduleIndex] = key.split(':').map(Number); data.materi.jalur[pathIndex].modul.splice(moduleIndex, 1); }
    persistContent();
    renderList();
  }

  editor.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(editor);
    const title = String(values.get('title') || '').trim();
    const category = String(values.get('category') || '').trim();
    const description = String(values.get('description') || '').trim();
    const status = root.querySelector('[data-cms-editor-status]');
    if (!title || !description) { status.textContent = 'Judul dan deskripsi/jawaban wajib diisi.'; return; }
    const link = validWebLink(values.get('link'));
    if (link === undefined) { status.textContent = 'Tautan harus menggunakan alamat HTTP atau HTTPS yang valid.'; return; }
    const tags = commaList(values.get('keywords'));
    if (activeType === 'products') {
      const index = editingKey === null ? -1 : Number(editingKey);
      const previous = index < 0 ? {} : data.produk[index];
      const image = String(values.get('image') || '').trim();
      const item = { ...previous, id: previous.id || `cms-product-${Date.now()}`, pokja: previous.pokja || 'pokja1', judul: title, kategori: category || 'Dokumen', deskripsi: description, gambar: image || null, tautan: link || '', tag: tags, tanggal: previous.tanggal || new Date().toISOString().slice(0, 7) };
      if (index < 0) data.produk.unshift(item); else data.produk[index] = item;
    } else if (activeType === 'faq') {
      const index = editingKey === null ? -1 : Number(editingKey);
      const previous = index < 0 ? {} : data.twini.entries[index];
      const item = { ...previous, id: previous.id || `cms-faq-${Date.now()}`, category: category || 'Umum', question: title, answer: description, keywords: tags };
      if (index < 0) data.twini.entries.unshift(item); else data.twini.entries[index] = item;
    } else {
      const pathIndex = Number(values.get('path'));
      const previousModule = editingKey === null ? {} : data.materi.jalur[Number(editingKey.split(':')[0])].modul[Number(editingKey.split(':')[1])];
      const module = { ...previousModule, judul: title, tingkat: category || 'Dasar', status: previousModule.status || 'rencana', tautan: link, ringkasan: description, fokus: tags, hasil: String(values.get('result') || '').trim() };
      if (editingKey === null) data.materi.jalur[pathIndex].modul.push(module);
      else { const [oldPath, moduleIndex] = editingKey.split(':').map(Number); if (oldPath === pathIndex) data.materi.jalur[pathIndex].modul[moduleIndex] = module; else { data.materi.jalur[oldPath].modul.splice(moduleIndex, 1); data.materi.jalur[pathIndex].modul.push(module); } }
    }
    persistContent();
    editor.hidden = true;
    renderList();
  });

  root.querySelector('[data-cms-add]').addEventListener('click', () => openEditor());
  root.querySelector('[data-cms-cancel]').addEventListener('click', () => { editor.hidden = true; });
  root.querySelectorAll('[data-cms-tab]').forEach(button => button.addEventListener('click', () => {
    activeType = button.dataset.cmsTab;
    root.querySelectorAll('[data-cms-tab]').forEach(tab => { const active = tab === button; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); });
    const showUsers = activeType === 'users';
    contentPanel.hidden = showUsers;
    if (usersPanel) usersPanel.hidden = !showUsers;
    if (!showUsers) { editor.hidden = true; visibleFields(activeType); renderList(); }
  }));

  if (isSuperAdmin && usersPanel) bindUserManagement(usersPanel, session, getUsers, escapeHtml, databaseMode, apiRequest);
  visibleFields(activeType);
  renderList();
}

function bindUserManagement(panel, session, getUsers, escapeHtml, databaseMode = false, apiRequest) {
  if (databaseMode && apiRequest) { bindPostgresUserManagement(panel, session, apiRequest, escapeHtml); return; }
  const list = panel.querySelector('[data-cms-user-list]');
  const passwordInput = panel.querySelector('input[name="password"]');
  passwordInput.minLength = 12;
  passwordInput.placeholder = 'Minimal 12 karakter';
  const status = panel.querySelector('[data-cms-user-status]');
  const normalizedSessionEmail = String(session.email || '').trim().toLowerCase();
  const renderUsers = () => {
    const users = getUsers();
    const superAdminCount = users.filter(user => user.role === 'super_admin').length;
    list.innerHTML = users.map(user => {
      const email = String(user.email || '').trim().toLowerCase();
      const isCurrentUser = email === normalizedSessionEmail;
      const isLastSuperAdmin = user.role === 'super_admin' && superAdminCount <= 1;
      const roleControl = isCurrentUser
        ? '<span class="role-badge">Super Admin · Sesi ini</span>'
        : `<select data-cms-user-role="${escapeHtml(email)}" aria-label="Role ${escapeHtml(email)}"><option value="member"${(user.role || 'member') === 'member' ? ' selected' : ''}>Member</option><option value="admin"${user.role === 'admin' ? ' selected' : ''}>Admin</option><option value="super_admin"${user.role === 'super_admin' ? ' selected' : ''}>Super Admin</option></select>`;
      const removeTitle = isCurrentUser ? 'Akun yang sedang digunakan tidak dapat dihapus.' : isLastSuperAdmin ? 'Pertahankan minimal satu Super Admin.' : 'Hapus akun lokal';
      return `<article class="cms-entry"><div class="cms-entry-copy"><strong>${escapeHtml(user.name || 'Anggota')}</strong><small>${escapeHtml(email)}</small></div><div class="cms-entry-actions">${roleControl}<button type="button" class="cms-icon-button is-danger" data-cms-user-remove="${escapeHtml(email)}" title="${removeTitle}"${isCurrentUser || isLastSuperAdmin ? ' disabled' : ''}>Hapus</button></div></article>`;
    }).join('');
    list.querySelectorAll('[data-cms-user-role]').forEach(select => select.addEventListener('change', () => {
      const users = getUsers();
      const target = users.find(user => String(user.email || '').trim().toLowerCase() === select.dataset.cmsUserRole);
      if (!target || String(target.email || '').trim().toLowerCase() === normalizedSessionEmail || !['member', 'admin', 'super_admin'].includes(select.value)) { renderUsers(); return; }
      const superAdminCount = users.filter(user => user.role === 'super_admin').length;
      if (target.role === 'super_admin' && select.value !== 'super_admin' && superAdminCount <= 1) {
        status.textContent = 'Pertahankan minimal satu Super Admin.';
        renderUsers();
        return;
      }
      if (select.value === 'super_admin' && target.role !== 'super_admin' && !window.confirm(`Jadikan ${target.email} sebagai Super Admin?`)) { renderUsers(); return; }
      target.role = select.value;
      localStorage.setItem('idtc-users', JSON.stringify(users));
      status.textContent = 'Role akun berhasil diperbarui pada perangkat ini.';
      renderUsers();
    }));
    list.querySelectorAll('[data-cms-user-remove]').forEach(button => button.addEventListener('click', () => {
      const users = getUsers();
      const target = users.find(user => String(user.email || '').trim().toLowerCase() === button.dataset.cmsUserRemove);
      if (!target || String(target.email || '').trim().toLowerCase() === normalizedSessionEmail || (target.role === 'super_admin' && users.filter(user => user.role === 'super_admin').length <= 1)) return;
      if (!window.confirm('Hapus akun lokal ini?')) return;
      localStorage.setItem('idtc-users', JSON.stringify(users.filter(user => String(user.email || '').trim().toLowerCase() !== button.dataset.cmsUserRemove)));
      status.textContent = 'Akun lokal berhasil dihapus.';
      renderUsers();
    }));
  };
  renderUsers();
  panel.querySelector('[data-cms-user-form]').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get('email')).trim().toLowerCase();
    const users = getUsers();
    const name = String(values.get('name') || '').trim();
    const password = String(values.get('password') || '');
    const role = String(values.get('role') || 'member');
    if (users.some(user => user.email === email)) { status.textContent = 'Email sudah terdaftar.'; return; }
    if (!name || !email || password.length < 12) { status.textContent = 'Nama, email, dan kata sandi minimal 12 karakter wajib diisi.'; return; }
    if (!['member', 'admin', 'super_admin'].includes(role)) { status.textContent = 'Role tidak valid.'; return; }
    if (role === 'super_admin' && !window.confirm(`Buat ${email} sebagai Super Admin?`)) return;
    let passwordRecord;
    try { passwordRecord = await hashPassword(password); }
    catch { status.textContent = 'Penyimpanan sandi aman tidak tersedia di browser ini.'; return; }
    users.push({ name, email, ...passwordRecord, role, createdAt: new Date().toISOString() });
    try { localStorage.setItem('idtc-users', JSON.stringify(users)); }
    catch { status.textContent = 'Akun gagal disimpan. Ruang penyimpanan lokal tidak tersedia.'; return; }
    form.reset();
    status.textContent = 'Akun lokal berhasil dibuat pada perangkat ini.';
    renderUsers();
  });
}

function bindPostgresUserManagement(panel, session, apiRequest, escapeHtml) {
  const list = panel.querySelector('[data-cms-user-list]');
  const form = panel.querySelector('[data-cms-user-form]');
  const status = panel.querySelector('[data-cms-user-status]');
  const passwordInput = form.querySelector('input[name="password"]');
  passwordInput.minLength = 12;
  passwordInput.placeholder = 'Minimal 12 karakter';
  let users = [];

  const request = async (path, options = {}) => {
    const response = await apiRequest(path, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Permintaan user gagal.');
    return result;
  };

  const renderUsers = () => {
    const superAdminCount = users.filter(user => user.role === 'super_admin' && !user.disabled).length;
    list.innerHTML = users.map(user => {
      const isCurrentUser = user.id === session.id;
      const isLastSuperAdmin = user.role === 'super_admin' && superAdminCount <= 1;
      const roleControl = isCurrentUser
        ? `<span class="role-badge">${escapeHtml(user.role === 'super_admin' ? 'Super Admin · Sesi ini' : user.role)}</span>`
        : `<select data-pg-user-role="${escapeHtml(user.id)}" aria-label="Role ${escapeHtml(user.email)}"><option value="member"${user.role === 'member' ? ' selected' : ''}>Member</option><option value="admin"${user.role === 'admin' ? ' selected' : ''}>Admin</option><option value="super_admin"${user.role === 'super_admin' ? ' selected' : ''}>Super Admin</option></select>`;
      const disabledNote = user.disabled ? ' · Dinonaktifkan' : '';
      const removeTitle = isCurrentUser ? 'Akun yang sedang digunakan tidak dapat dihapus.' : isLastSuperAdmin ? 'Pertahankan minimal satu Super Admin.' : 'Hapus akun PostgreSQL';
      return `<article class="cms-entry"><div class="cms-entry-copy"><strong>${escapeHtml(user.name || 'Anggota')}${disabledNote}</strong><small>${escapeHtml(user.email)}</small></div><div class="cms-entry-actions">${roleControl}<button type="button" class="cms-icon-button is-danger" data-pg-user-remove="${escapeHtml(user.id)}" title="${removeTitle}"${isCurrentUser || isLastSuperAdmin || user.disabled ? ' disabled' : ''}>Hapus</button></div></article>`;
    }).join('');

    list.querySelectorAll('[data-pg-user-role]').forEach(select => select.addEventListener('change', async () => {
      const target = users.find(user => user.id === select.dataset.pgUserRole);
      if (!target || target.id === session.id) { renderUsers(); return; }
      if (target.role === 'super_admin' && select.value !== 'super_admin' && superAdminCount <= 1) {
        status.textContent = 'Pertahankan minimal satu Super Admin.';
        renderUsers();
        return;
      }
      if (select.value === 'super_admin' && target.role !== 'super_admin' && !window.confirm(`Jadikan ${target.email} sebagai Super Admin?`)) { renderUsers(); return; }
      try {
        await request(`admin/users/${encodeURIComponent(target.id)}/role`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: select.value }) });
        status.textContent = 'Role akun berhasil diperbarui di PostgreSQL.';
        await refreshUsers();
      } catch (error) { status.textContent = error.message; await refreshUsers(); }
    }));

    list.querySelectorAll('[data-pg-user-remove]').forEach(button => button.addEventListener('click', async () => {
      const target = users.find(user => user.id === button.dataset.pgUserRemove);
      if (!target || target.id === session.id || (target.role === 'super_admin' && superAdminCount <= 1)) return;
      if (!window.confirm(`Hapus akun ${target.email} dan sesi-sesinya dari PostgreSQL?`)) return;
      try {
        await request(`admin/users/${encodeURIComponent(target.id)}`, { method: 'DELETE' });
        status.textContent = 'Akun dan sesi berhasil dihapus.';
        await refreshUsers();
      } catch (error) { status.textContent = error.message; }
    }));
  };

  async function refreshUsers() {
    try {
      const result = await request('admin/users');
      users = result.users || [];
      renderUsers();
    } catch (error) { status.textContent = error.message; }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = new FormData(form);
    const payload = {
      name: String(values.get('name') || '').trim(),
      email: String(values.get('email') || '').trim().toLowerCase(),
      password: String(values.get('password') || ''),
      role: String(values.get('role') || 'member'),
    };
    if (!payload.name || !payload.email || payload.password.length < 12) { status.textContent = 'Nama, email, dan kata sandi minimal 12 karakter wajib diisi.'; return; }
    if (payload.role === 'super_admin' && !window.confirm(`Buat ${payload.email} sebagai Super Admin?`)) return;
    try {
      await request('admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      form.reset();
      status.textContent = 'Akun berhasil dibuat di PostgreSQL.';
      await refreshUsers();
    } catch (error) { status.textContent = error.message; }
  });

  void refreshUsers();
}

