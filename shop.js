import { bubbleFieldMarkup } from './ambient-bubbles.js?v=1';

const CART_KEY = 'idtc-shop-cart';
const ORDER_KEY = 'idtc-shop-orders';
const MONEY = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    return cart && typeof cart === 'object' && !Array.isArray(cart) ? cart : {};
  } catch {
    return {};
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function shopPage() {
  return `<section class="section twini-shop">
    <section class="shop-welcome" data-shop-welcome aria-label="Selamat datang di Twini Merchant Shop">
      ${bubbleFieldMarkup(32, 0.65)}
      <div class="shop-welcome-content"><img src="assets/img/dni/twini-shop-icon.png" alt="Maskot TwiniShop" /><p class="section-label">IDTC MERCHANDISE</p><h1>Selamat Berbelanja di Twini Merchant Shop</h1><p>Temukan koleksi dan merchandise komunitas Digital Twin Indonesia.</p><button class="button primary shop-welcome-button" type="button" data-shop-start>Mulai Belanja <span aria-hidden="true">→</span></button></div>
    </section>
    <div class="shop-shopping-content" data-shop-content hidden>
    <button class="shop-back-welcome" type="button" data-shop-welcome-back>← Sambutan TwiniShop</button>
    <div class="twini-bubbles" aria-hidden="true">${Array.from({ length: 18 }, () => '<i></i>').join('')}</div>
    <header class="shop-heading"><div><p class="section-label">IDTC MERCHANDISE</p><h1>TwiniShop</h1><p class="section-note">Koleksi untuk komunitas Digital Twin Indonesia.</p></div><span class="shop-stamp" aria-hidden="true">IDTC<br />STORE</span></header>
    <p class="shop-pricing-note">Harga di bawah adalah harga contoh katalog. Pesanan dan pembayaran belum terhubung ke sistem penjual.</p>
    <nav class="shop-filters" aria-label="Kategori merchandise">${['Semua', 'Aksesori', 'Pakaian', 'Publikasi'].map((category, index) => `<button type="button" data-shop-filter="${category}" aria-pressed="${index === 0}">${category}</button>`).join('')}</nav>
    <div class="shop-layout">
      <section class="shop-catalog" aria-label="Daftar merchandise"><div class="shop-grid" data-shop-products></div></section>
      <aside class="shop-cart" aria-label="Keranjang belanja">
        <header class="shop-cart-heading"><div><p class="section-label">PESANAN</p><h2>Keranjang <span data-shop-count>0</span></h2></div><span class="shop-cart-mark" aria-hidden="true">▱</span></header>
        <div class="shop-cart-lines" data-shop-cart-lines></div>
        <div class="shop-cart-totals" data-shop-cart-totals></div>
        <button class="button primary shop-checkout-toggle" type="button" data-shop-checkout-toggle hidden>Lanjut ke checkout</button>
        <form class="shop-checkout-form" data-shop-checkout hidden>
          <h3>Data pemesan</h3>
          <label>Nama lengkap<input name="name" autocomplete="name" required maxlength="120" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="180" /></label>
          <label>Nomor WhatsApp<input name="phone" type="tel" autocomplete="tel" required maxlength="30" /></label>
          <label class="shop-address-row" data-shop-address-row>Alamat pengiriman<textarea name="address" autocomplete="street-address" rows="3" maxlength="500"></textarea></label>
          <p class="shop-payment-notice">Tombol ini hanya mencatat pesanan lokal. Payment gateway belum terhubung; tidak ada pembayaran yang ditagih.</p>
          <button class="button primary shop-pay-button" type="submit">Bayar sekarang</button>
        </form>
        <p class="shop-feedback" data-shop-feedback role="status"></p>
      </aside>
    </div>
    </div>
  </section>`;
}

export function bindShop({ root, catalog, escapeHtml }) {
  if (!root || !catalog?.items) return;
  const welcome = root.querySelector('[data-shop-welcome]');
  const shopContent = root.querySelector('[data-shop-content]');
  root.querySelector('[data-shop-start]')?.addEventListener('click', () => {
    welcome.hidden = true;
    shopContent.hidden = false;
    root.scrollIntoView({ block: 'start' });
  });
  root.querySelector('[data-shop-welcome-back]')?.addEventListener('click', () => {
    shopContent.hidden = true;
    welcome.hidden = false;
    root.scrollIntoView({ block: 'start' });
  });
  const productList = root.querySelector('[data-shop-products]');
  const cartLines = root.querySelector('[data-shop-cart-lines]');
  const cartTotals = root.querySelector('[data-shop-cart-totals]');
  const countLabel = root.querySelector('[data-shop-count]');
  const checkoutToggle = root.querySelector('[data-shop-checkout-toggle]');
  const checkoutForm = root.querySelector('[data-shop-checkout]');
  const addressRow = root.querySelector('[data-shop-address-row]');
  const feedback = root.querySelector('[data-shop-feedback]');
  let cart = readCart();
  let activeCategory = 'Semua';

  const isPhysicalInCart = () => catalog.items.some(item => item.type === 'physical' && (Number(cart[item.id]) || 0) > 0);
  const selectedItems = () => catalog.items.filter(item => (Number(cart[item.id]) || 0) > 0).map(item => ({ ...item, quantity: Math.max(1, Math.min(99, Number(cart[item.id]) || 1)) }));
  const subtotal = () => selectedItems().reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = () => isPhysicalInCart() ? catalog.estimatedShipping : 0;

  const renderProducts = () => {
    const items = activeCategory === 'Semua' ? catalog.items : catalog.items.filter(item => item.category === activeCategory);
    productList.innerHTML = items.map(item => `<article class="shop-item">
      <div class="shop-product-visual shop-visual--${escapeHtml(item.visual)}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : `<span class="shop-product-mockup" aria-hidden="true"><img src="assets/img/emblem-white.png" alt="" /><small>IDTC</small></span>`}
        <span class="shop-product-type">${item.type === 'digital' ? 'DIGITAL' : 'MERCH'}</span>
      </div>
      <div class="shop-item-copy"><p class="shop-item-category">${escapeHtml(item.category)}</p><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p><div class="shop-item-bottom"><strong>${MONEY.format(item.price)}</strong><button type="button" data-shop-add="${escapeHtml(item.id)}" aria-label="Tambah ${escapeHtml(item.name)} ke keranjang">Tambah</button></div></div>
    </article>`).join('');
    productList.querySelectorAll('[data-shop-add]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.shopAdd;
      cart[id] = Math.min(99, (Number(cart[id]) || 0) + 1);
      writeCart(cart);
      feedback.textContent = `${catalog.items.find(item => item.id === id)?.name || 'Produk'} ditambahkan ke keranjang.`;
      renderCart();
    }));
  };

  const renderCart = () => {
    const items = selectedItems();
    const physicalItems = isPhysicalInCart();
    countLabel.textContent = String(items.reduce((total, item) => total + item.quantity, 0));
    checkoutToggle.hidden = items.length === 0;
    addressRow.hidden = !physicalItems;
    checkoutForm.elements.address.required = physicalItems;
    if (!physicalItems) checkoutForm.elements.address.value = '';
    if (!items.length) {
      cartLines.innerHTML = '<p class="shop-cart-empty">Keranjang masih kosong. Pilih merchandise untuk memulai.</p>';
      cartTotals.innerHTML = '';
      checkoutForm.hidden = true;
      checkoutToggle.textContent = 'Keranjang kosong';
      return;
    }
    checkoutToggle.textContent = checkoutForm.hidden ? 'Lanjut ke checkout' : 'Tutup checkout';
    cartLines.innerHTML = items.map(item => `<article class="shop-cart-line"><div><strong>${escapeHtml(item.name)}</strong><small>${MONEY.format(item.price)} · ${item.type === 'digital' ? 'Digital' : 'Fisik'}</small></div><div class="shop-quantity"><button type="button" data-cart-minus="${escapeHtml(item.id)}" aria-label="Kurangi ${escapeHtml(item.name)}">−</button><span>${item.quantity}</span><button type="button" data-cart-plus="${escapeHtml(item.id)}" aria-label="Tambah ${escapeHtml(item.name)}">+</button><button type="button" data-cart-remove="${escapeHtml(item.id)}" aria-label="Hapus ${escapeHtml(item.name)}">×</button></div></article>`).join('');
    cartTotals.innerHTML = `<div><span>Subtotal</span><strong>${MONEY.format(subtotal())}</strong></div><div><span>Estimasi ongkir</span><strong>${shipping() ? MONEY.format(shipping()) : 'Gratis'}</strong></div><div class="shop-grand-total"><span>Total contoh</span><strong>${MONEY.format(subtotal() + shipping())}</strong></div><small>Ongkir adalah estimasi katalog dan perlu dikonfirmasi penjual.</small>`;
    cartLines.querySelectorAll('[data-cart-minus]').forEach(button => button.addEventListener('click', () => changeQuantity(button.dataset.cartMinus, -1)));
    cartLines.querySelectorAll('[data-cart-plus]').forEach(button => button.addEventListener('click', () => changeQuantity(button.dataset.cartPlus, 1)));
    cartLines.querySelectorAll('[data-cart-remove]').forEach(button => button.addEventListener('click', () => { delete cart[button.dataset.cartRemove]; writeCart(cart); renderCart(); }));
  };

  const changeQuantity = (id, delta) => {
    const next = (Number(cart[id]) || 0) + delta;
    if (next <= 0) delete cart[id]; else cart[id] = Math.min(99, next);
    writeCart(cart);
    renderCart();
  };

  root.querySelectorAll('[data-shop-filter]').forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.shopFilter;
    root.querySelectorAll('[data-shop-filter]').forEach(filter => { const active = filter === button; filter.classList.toggle('is-active', active); filter.setAttribute('aria-pressed', String(active)); });
    renderProducts();
  }));
  checkoutToggle.addEventListener('click', () => {
    if (!selectedItems().length) return;
    checkoutForm.hidden = !checkoutForm.hidden;
    checkoutToggle.textContent = checkoutForm.hidden ? 'Lanjut ke checkout' : 'Tutup checkout';
    if (!checkoutForm.hidden) checkoutForm.elements.name.focus();
  });
  checkoutForm.addEventListener('submit', event => {
    event.preventDefault();
    const items = selectedItems();
    if (!items.length) { feedback.textContent = 'Keranjang kosong.'; return; }
    const values = new FormData(checkoutForm);
    const order = {
      id: `TW-${Date.now().toString(36).toUpperCase()}`,
      status: 'menunggu_pembayaran',
      createdAt: new Date().toISOString(),
      customer: { name: String(values.get('name')).trim(), email: String(values.get('email')).trim().toLowerCase(), phone: String(values.get('phone')).trim(), address: isPhysicalInCart() ? String(values.get('address')).trim() : '' },
      items: items.map(({ id, name, type, price, quantity }) => ({ id, name, type, price, quantity })),
      subtotal: subtotal(),
      shipping: shipping(),
      total: subtotal() + shipping(),
    };
    let orders = [];
    try { const stored = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); orders = Array.isArray(stored) ? stored : []; } catch { orders = []; }
    orders.push(order);
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
    cart = {};
    writeCart(cart);
    checkoutForm.reset();
    checkoutForm.hidden = true;
    renderCart();
    feedback.textContent = `Pesanan ${order.id} tersimpan lokal dengan total ${MONEY.format(order.total)}. Pembayaran belum diproses; payment gateway belum terhubung.`;
  });

  renderProducts();
  renderCart();
}