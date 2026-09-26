(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const ICONS = {
    compass:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></svg>',
    academic:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4 9 4.5-9 4.5-9-4.5L12 4Z"/><path d="M6.5 10.8V15c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.2"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    arrow:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h11M11 5l5 5-5 5"/></svg>',
  };

  /* =======================================================
     Navigation + scroll behaviour
     ======================================================= */
  const header = $("#header");
  const navToggle = $("#navToggle");
  const mainNav = $("#main-nav");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  });

  $$("a", mainNav).forEach((a) =>
    a.addEventListener("click", () => {
      mainNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  const navLinks = $$('.main-nav a[href^="#"]');
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    toTop.classList.toggle("is-visible", y > 600);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

    const mark = y + window.innerHeight * 0.3;
    let current = null;
    sections.forEach((s) => {
      if (s.offsetTop <= mark) current = s.id;
    });
    navLinks.forEach((a) =>
      a.classList.toggle("is-current", a.getAttribute("href") === "#" + current)
    );
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  $("#year").textContent = String(new Date().getFullYear());

  /* =======================================================
     Reveal on scroll
     ======================================================= */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  const REVEAL_SELECTORS = [
    ".section-head",
    ".principle-card",
    ".quote-band",
    ".struktur-tabs",
    ".struktur-panel",
    ".subsection-title",
    ".pokja-card",
    ".unit-card",
    ".gallery-filters",
    ".gallery-card",
    ".gallery-note",
    ".kpi",
    ".viz-card",
    ".viz-source",
    ".materi-card",
    ".materi-cta",
    ".step",
    ".repo-card",
    ".poster-link",
  ];

  // Content must never stay stuck at opacity 0: anything already on screen is
  // shown at once, and a timer releases the rest if the observer never fires.
  function revealAllPending() {
    $$(".reveal:not(.is-visible)").forEach((n) => n.classList.add("is-visible"));
  }

  function applyReveal(root) {
    REVEAL_SELECTORS.forEach((sel) => {
      $$(sel, root).forEach((node, i) => {
        if (node.classList.contains("reveal")) return;
        node.classList.add("reveal");
        if (node.getBoundingClientRect().top < window.innerHeight) {
          node.classList.add("is-visible");
          return;
        }
        node.style.transitionDelay = Math.min(i * 70, 280) + "ms";
        revealObserver.observe(node);
      });
    });
    setTimeout(revealAllPending, 2500);
  }
  applyReveal(document);

  /* =======================================================
     Lightbox
     ======================================================= */
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lightboxImg.src = "";
  }
  $("#lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  });

  $("#openPosterStruktur").addEventListener("click", () =>
    openLightbox(
      "assets/img/struktur-kepengurusan.jpeg",
      "Poster struktur kepengurusan IDTC 2026–2029"
    )
  );
  $("#openPosterWA").addEventListener("click", () =>
    openLightbox(
      "assets/img/struktur-grup-whatsapp.jpeg",
      "Poster struktur grup dan fungsi tiap unit IDTC"
    )
  );
  $("#openPosterAnggota").addEventListener("click", () =>
    openLightbox(
      "assets/img/profil-anggota.jpeg",
      "Infografik profil anggota IDTC berdasarkan database pendaftaran"
    )
  );

  /* =======================================================
     Struktur organisasi
     ======================================================= */
  const strukturPanel = $("#strukturPanel");
  let strukturData = null;

  function photoCard(p, opts) {
    const o = opts || {};
    const cls = ["person-card", o.lead ? "is-lead" : "", o.unit ? "is-unit" : ""]
      .filter(Boolean)
      .join(" ");
    const warna = o.warna ? ` data-warna="${esc(o.warna)}"` : "";

    const media = o.icon
      ? `<div class="person-photo">${ICONS[o.icon] || ""}</div>`
      : `<div class="person-photo"><img src="${esc(p.foto)}" alt="Foto ${esc(p.nama)}" loading="lazy" width="96" height="96"></div>`;

    return `
      <article class="${cls}"${warna}>
        ${o.badge ? `<span class="person-badge">${esc(o.badge)}</span>` : ""}
        ${media}
        <h4 class="person-name">${esc(p.nama)}</h4>
        <p class="person-role">${esc(p.peran || p.desc || "")}</p>
        ${o.extra || ""}
      </article>`;
  }

  const level = (cards) => `<div class="org-level">${cards.join("")}</div>`;
  const link = '<div class="org-connector"></div>';

  function renderPembina(d) {
    const p = d.dewanPembina;
    return `<div class="org-tree">
      ${level([photoCard(p.ketua, { lead: true })])}
      ${link}
      ${level(p.unit.map((u) => photoCard(u, { unit: true, icon: u.icon })))}
    </div>`;
  }

  function renderPengurus(d) {
    const p = d.pengurus;
    return `<div class="org-tree">
      ${level([photoCard(p.ketua, { lead: true })])}
      ${link}
      ${level(p.wakil.map((w) => photoCard(w)))}
      ${link}
      ${level(p.sekjen.map((s) => photoCard(s)))}
    </div>`;
  }

  function renderPokjaStruktur(d) {
    const cards = d.pokja.map((pk) => {
      const deputies = pk.wakil.filter((w) => w.nama);
      const extra = deputies.length
        ? `<div class="person-deputies">${deputies
            .map(
              (w) => `<div class="person-deputy">
                ${w.foto ? `<img src="${esc(w.foto)}" alt="Foto ${esc(w.nama)}" loading="lazy">` : ""}
                <span><b>${esc(w.nama)}</b><span>${esc(w.peran)}</span></span>
              </div>`
            )
            .join("")}</div>`
        : "";
      return photoCard(pk.ketua, {
        warna: pk.warna,
        badge: `Pokja ${pk.nomor} · ${pk.nama}`,
        extra,
      });
    });
    return `<div class="org-tree">${level(cards)}</div>`;
  }

  const TAB_RENDERERS = {
    pembina: renderPembina,
    pengurus: renderPengurus,
    "pokja-struktur": renderPokjaStruktur,
  };

  function renderStrukturTab(tab) {
    if (!strukturData) return;
    strukturPanel.innerHTML = (TAB_RENDERERS[tab] || renderPembina)(strukturData);
  }

  const tabButtons = $$(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      renderStrukturTab(btn.dataset.tab);
    });
  });

  /* =======================================================
     Pokja + unit pendukung
     ======================================================= */
  const pokjaGrid = $("#pokjaGrid");
  const unitGrid = $("#unitPendukungGrid");

  function renderPokjaCards(d) {
    pokjaGrid.innerHTML = d.pokja
      .map(
        (pk) => `
      <article class="pokja-card" data-warna="${esc(pk.warna)}">
        <div class="pokja-banner">
          <img src="${esc(pk.banner)}" alt="Ilustrasi Pokja ${pk.nomor} ${esc(pk.nama)}" loading="lazy">
          <div class="pokja-banner__label">
            <span class="pokja-chip">Pokja ${pk.nomor}</span>
            <h3>${esc(pk.nama)}</h3>
            <p>${esc(pk.slogan)}</p>
          </div>
        </div>
        <div class="pokja-body">
          <div class="pokja-lead">
            <img src="${esc(pk.ketua.foto)}" alt="Foto ${esc(pk.ketua.nama)}" loading="lazy">
            <span>
              <b>${esc(pk.ketua.nama)}</b>
              <span>${esc(pk.ketua.peran)}</span>
            </span>
          </div>
          <button class="pokja-toggle" aria-expanded="false" aria-controls="detail-${esc(pk.id)}">
            <span class="pokja-toggle__text">Lihat fokus &amp; output</span>
            ${ICONS.chevron}
          </button>
          <div class="pokja-detail" id="detail-${esc(pk.id)}">
            <p class="detail-label">Fokus pembahasan</p>
            <ul class="chip-list">${pk.fokus.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
            <p class="detail-label">Output utama</p>
            <ul class="output-list">${pk.output.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
          </div>
        </div>
      </article>`
      )
      .join("");

    $$(".pokja-card", pokjaGrid).forEach((card) => {
      const btn = $(".pokja-toggle", card);
      const detail = $(".pokja-detail", card);
      const label = $(".pokja-toggle__text", card);
      btn.addEventListener("click", () => {
        const open = detail.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(open));
        label.textContent = open ? "Sembunyikan detail" : "Lihat fokus & output";
      });
    });
  }

  function renderUnitPendukung(d) {
    unitGrid.innerHTML = d.unitPendukung
      .map(
        (u) => `
      <article class="unit-card">
        <div class="unit-card__media">
          <img src="${esc(u.banner)}" alt="Ilustrasi ${esc(u.nama)}" loading="lazy">
        </div>
        <div class="unit-card__body">
          <h4>${esc(u.nama)}</h4>
          <p class="unit-slogan">${esc(u.slogan)}</p>
          <ul class="chip-list">${u.fokus.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          ${u.tujuan ? `<p class="unit-goal"><strong>Tujuan:</strong> ${esc(u.tujuan)}</p>` : ""}
        </div>
      </article>`
      )
      .join("");
  }

  /* =======================================================
     Galeri produk
     ======================================================= */
  const galleryGrid = $("#galleryGrid");
  const galleryFilters = $("#galleryFilters");
  let produkData = [];

  const POKJA_LABEL = {
    pokja1: "Pokja 1 · Standar & Kebijakan",
    pokja2: "Pokja 2 · Pilot Project",
    pokja3: "Pokja 3 · SDM & Ekosistem",
    umum: "Lintas Pokja",
  };
  const GLYPH = { book: "📘", template: "🧩", dataset: "📊", guide: "🧭", video: "🎬" };
  const POKJA_BANNER = {
    pokja1: "assets/img/pokja/pokja1.jpg",
    pokja2: "assets/img/pokja/pokja2.jpg",
    pokja3: "assets/img/pokja/pokja3.jpg",
    umum: "assets/img/pokja/hero-maskot.jpg",
  };

  function renderGallery(filter) {
    const items = filter === "all" ? produkData : produkData.filter((p) => p.pokja === filter);

    if (!items.length) {
      galleryGrid.innerHTML = `
        <div class="gallery-empty">
          <strong>Belum ada produk untuk kategori ini</strong>
          <p>Jadilah yang pertama menambahkan — kirim pull request ke <code>data/produk.json</code>.</p>
        </div>`;
      return;
    }

    galleryGrid.innerHTML = items
      .map(
        (it, i) => `
      <article class="gallery-card" style="animation-delay:${Math.min(i * 60, 300)}ms">
        <div class="gallery-thumb" data-pokja="${esc(it.pokja)}"${it.gambar ? ' data-custom="1"' : ""}>
          <img src="${esc(it.gambar || POKJA_BANNER[it.pokja] || POKJA_BANNER.umum)}"
               alt="${esc(it.judul)}" loading="lazy">
          <span class="gallery-badge">${GLYPH[it.icon] || "✨"} ${esc(it.kategori || "Produk")}</span>
        </div>
        <div class="gallery-body">
          <span class="gallery-kicker">${esc(POKJA_LABEL[it.pokja] || it.pokja)}</span>
          <h3>${esc(it.judul)}</h3>
          <p>${esc(it.deskripsi)}</p>
          <ul class="gallery-tags">${(it.tag || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          <a class="gallery-link" href="${esc(it.tautan)}" target="_blank" rel="noopener">
            Lihat produk ${ICONS.arrow}
          </a>
        </div>
      </article>`
      )
      .join("");
  }

  galleryFilters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    $$(".filter-btn", galleryFilters).forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderGallery(btn.dataset.filter);
  });

  /* =======================================================
     Profil anggota — visualisasi data
     ======================================================= */
  const SERIES = ["#1e6fd9", "#e8622c", "#0f9b8e", "#6b4fd6"];
  const nf = new Intl.NumberFormat("id-ID");
  const nf1 = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const pf = (n) => nf1.format(n) + "%";

  function renderAnggota(d) {
    // Persentase selalu diturunkan dari jumlah, tidak ditulis manual di JSON —
    // supaya pemutakhiran data cukup mengubah angka jumlahnya saja.
    const totalEko = d.ekosistem.reduce((n, e) => n + e.jumlah, 0);
    const totalInst = d.institusi.reduce((n, i) => n + i.jumlah, 0);
    const share = (n, total) => (total ? (n / total) * 100 : 0);

    // --- KPI ---
    const pemerintahBumn = d.ekosistem[0];
    $("#kpiRow").innerHTML = [
      { v: nf.format(d.respons), l: "Respons pendaftaran", n: "" },
      { v: nf.format(d.namaUnik), l: "Nama unik", n: "setelah duplikat disaring" },
      {
        v: pf(share(pemerintahBumn.jumlah, totalEko)),
        l: "Dari ekosistem pemerintah & BUMN",
        n: nf.format(pemerintahBumn.jumlah) + " orang",
      },
      { v: nf.format(d.sektor.length), l: "Sektor keahlian", n: "boleh lebih dari satu" },
    ]
      .map(
        (k) => `<li class="kpi">
          <span class="kpi-value">${esc(k.v)}</span>
          <span class="kpi-label">${esc(k.l)}</span>
          ${k.n ? `<span class="kpi-note">${esc(k.n)}</span>` : ""}
        </li>`
      )
      .join("");

    // --- Stacked bar ekosistem ---
    $("#ekosistemBar").innerHTML = d.ekosistem
      .map((e, i) => {
        const p = share(e.jumlah, totalEko);
        return `<span style="width:${p}%;background:${SERIES[i]}" title="${esc(e.nama)}: ${nf.format(e.jumlah)} orang (${esc(pf(p))})"></span>`;
      })
      .join("");

    $("#ekosistemLegend").innerHTML = d.ekosistem
      .map(
        (e, i) => `<li>
          <span class="swatch" style="background:${SERIES[i]}"></span>
          <span>
            <b>${esc(e.nama)}</b>
            <span class="legend-val">${nf.format(e.jumlah)} orang · ${esc(pf(share(e.jumlah, totalEko)))}</span>
            <span class="legend-note">${esc(e.rincian)}</span>
          </span>
        </li>`
      )
      .join("");

    // --- Bar list ---
    function barlist(target, rows, satuan, total) {
      const max = Math.max(...rows.map((r) => r.jumlah));
      $(target).innerHTML = rows
        .map((r) => {
          const persen = total ? ` · ${esc(pf(share(r.jumlah, total)))}` : "";
          return `<li title="${esc(r.nama)}: ${nf.format(r.jumlah)} ${satuan}">
            <span class="bar-label">${esc(r.nama)}</span>
            <span class="bar-value">${nf.format(r.jumlah)}${persen}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${(r.jumlah / max) * 100}%"></span></span>
          </li>`;
        })
        .join("");
    }
    // Sektor tanpa persentase: responden boleh memilih lebih dari satu,
    // sehingga persentase terhadap total responden akan menyesatkan.
    barlist("#institusiChart", d.institusi, "orang", totalInst);
    barlist("#sektorChart", d.sektor, "orang", null);

    // --- Tabel institusi terbanyak ---
    $("#topInstitusi tbody").innerHTML = d.topInstitusi
      .map(
        (t, i) => `<tr>
          <td class="rank">${i + 1}</td>
          <td>${esc(t.nama)}</td>
          <td class="num">${nf.format(t.jumlah)}</td>
        </tr>`
      )
      .join("");

    $("#anggotaSumber").textContent =
      `Sumber: ${d.sumber} (${nf.format(d.respons)} respons). ${d.catatan}`;
  }

  /* =======================================================
     Materi belajar
     ======================================================= */
  const materiGrid = $("#materiGrid");
  const materiRingkas = $("#materiRingkas");

  const STATUS_LABEL = {
    rencana: "Rencana",
    draf: "Draf",
    "siap-uji": "Siap uji",
    teruji: "Teruji",
  };

  function renderMateri(d) {
    materiGrid.innerHTML = d.jalur
      .map((j) => {
        const tersedia = j.modul.filter((m) => m.tautan).length;
        const persen = j.modul.length ? Math.round((tersedia / j.modul.length) * 100) : 0;

        const items = j.modul
          .map((m, i) => {
            const judul = m.tautan
              ? `<a href="${esc(m.tautan)}" target="_blank" rel="noopener">${esc(m.judul)}</a>`
              : esc(m.judul);
            return `<li>
              <span class="materi-num">${i + 1}</span>
              <span class="materi-modul">
                ${judul}
                <span class="materi-meta">${esc(m.tingkat)}<span class="materi-status" data-status="${esc(m.status)}">${esc(STATUS_LABEL[m.status] || m.status)}</span></span>
              </span>
            </li>`;
          })
          .join("");

        return `
        <article class="materi-card" data-warna="${esc(j.warna)}">
          <div class="materi-card__head">
            <span class="materi-kode">${esc(j.kode)}</span>
            <span>
              <h3>${esc(j.nama)}</h3>
              <p class="materi-sasaran">${esc(j.sasaran)}</p>
            </span>
          </div>
          <ul class="materi-list">${items}</ul>
          <div class="materi-card__foot">
            <div class="materi-progress"><span style="width:${persen}%"></span></div>
            ${tersedia} dari ${j.modul.length} modul tersedia
          </div>
        </article>`;
      })
      .join("");

    const total = d.jalur.reduce((n, j) => n + j.modul.length, 0);
    const siap = d.jalur.reduce((n, j) => n + j.modul.filter((m) => m.tautan).length, 0);
    materiRingkas.textContent =
      siap === 0
        ? `Kurikulum ${total} modul sudah dirancang, penyusunan materinya baru dimulai. Pokja 3 membuka kesempatan bagi anggota yang ingin menyusun modul atau menjadi pemateri.`
        : `${siap} dari ${total} modul sudah tersedia. Sisanya sedang disusun — kontribusi anggota terbuka lebar.`;

    if (d.repo) $("#materiRepoLink").href = d.repo;
    if (d.handbook) $("#materiHandbookLink").href = d.handbook;
  }

  /* =======================================================
     Load data
     ======================================================= */
  Promise.all([
    fetch("data/struktur.json").then((r) => r.json()),
    fetch("data/produk.json").then((r) => r.json()),
    fetch("data/materi.json").then((r) => r.json()),
    fetch("data/anggota.json").then((r) => r.json()),
  ])
    .then(([struktur, produk, materi, anggota]) => {
      strukturData = struktur;
      produkData = produk;

      renderStrukturTab("pembina");
      renderPokjaCards(struktur);
      renderUnitPendukung(struktur);
      renderGallery("all");
      renderMateri(materi);
      renderAnggota(anggota);

      applyReveal(document);
      onScroll();
    })
    .catch((err) => {
      console.error("Gagal memuat data IDTC:", err);
      const msg =
        '<p style="color:#c0392b">Gagal memuat data. Jalankan situs lewat server (bukan buka berkas langsung), lalu muat ulang halaman.</p>';
      strukturPanel.innerHTML = msg;
      pokjaGrid.innerHTML = msg;
      galleryGrid.innerHTML = msg;
      materiGrid.innerHTML = msg;
    });
})();
