const formatText = value => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—−]/g, '-')
  .replace(/…/g, '...')
  .replace(/→/g, '->')
  .replace(/←/g, '<-')
  .replace(/×/g, 'x')
  .replace(/÷/g, '/')
  .replace(/≥/g, '>=')
  .replace(/≤/g, '<=')
  .replace(/±/g, '+/-')
  .replace(/•/g, '-')
  .replace(/[^\x20-\x7e]/g, '?')
  .replace(/\s+/g, ' ')
  .trim();

function sectionExplanation(section) {
  const paragraphs = section.paragraf || [];
  if (paragraphs.length) return paragraphs[0];
  const details = [];
  if (section.poin?.length) details.push(`${section.poin.length} pokok bahasan`);
  if (section.langkah?.length) details.push(`${section.langkah.length} langkah`);
  if (section.alur?.length) details.push(`${section.alur.length} tahap alur`);
  if (section.tabel) details.push(`tabel ${section.tabel.baris?.length || 0} baris`);
  if (section.kutipan) details.push('kutipan inti');
  if (section.catatan) details.push('catatan penerapan');
  return details.length
    ? `Bagian ini menyajikan ${details.join(', ')}${section.judul ? ` untuk memperjelas ${section.judul.toLocaleLowerCase('id-ID')}` : ''}.`
    : 'Bagian ini menjadi bagian dari materi inti pada modul ini.';
}

export function downloadLearningPdf(curriculum, getModuleProgress) {
  const JsPdf = globalThis.jspdf?.jsPDF;
  if (typeof JsPdf !== 'function') throw new Error('Generator PDF tidak berhasil dimuat.');
  if (!Array.isArray(curriculum?.jalur) || curriculum.jalur.length === 0) {
    throw new Error('Data jalur belajar belum tersedia untuk dibuat menjadi PDF.');
  }

  const pdf = new JsPdf({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 54;
  let y = 64;
  let sectionCount = 0;
  let moduleCount = 0;

  const startPage = () => {
    pdf.addPage();
    y = 64;
  };
  const ensureSpace = height => {
    if (y + height > bottomLimit) startPage();
  };
  const addText = (value, { size = 10, style = 'normal', color = [49, 66, 70], indent = 0, gap = 5 } = {}) => {
    const text = formatText(value);
    if (!text) return;
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentWidth - indent);
    const lineHeight = size * 1.42;
    ensureSpace(lines.length * lineHeight + gap);
    pdf.text(lines, margin + indent, y, { lineHeightFactor: 1.42 });
    y += lines.length * lineHeight + gap;
  };
  const addHeading = (value, level = 2) => {
    const settings = level === 1
      ? { size: 20, style: 'bold', color: [16, 47, 58], gap: 10 }
      : level === 2
        ? { size: 14, style: 'bold', color: [13, 112, 105], gap: 7 }
        : { size: 11, style: 'bold', color: [40, 75, 79], gap: 4 };
    ensureSpace(settings.size * 2 + 13);
    y += level === 1 ? 8 : 5;
    addText(value, settings);
  };
  const addLabel = value => addText(value, { size: 8, style: 'bold', color: [13, 112, 105], gap: 3 });
  const addList = (items, numbered = false) => {
    (items || []).forEach((item, index) => addText(`${numbered ? `${index + 1}.` : '-'} ${item}`, { indent: 12, gap: 4 }));
  };

  pdf.setProperties({
    title: 'Rangkuman Materi Belajar Digital Twin - IDTC',
    subject: 'Seluruh jalur, modul, section, dan hasil belajar Digital Twin',
    author: 'Indonesia Digital Twin Community',
    creator: 'IDTC Mobile',
  });

  addText('INDONESIA DIGITAL TWIN COMMUNITY', { size: 9, style: 'bold', color: [13, 112, 105], gap: 12 });
  addText('Rangkuman Pembelajaran\\nDigital Twin', { size: 27, style: 'bold', color: [16, 47, 58], gap: 14 });
  addText('Panduan lengkap jalur belajar, ringkasan modul, penjelasan setiap section, dan checklist pembelajaran.', { size: 12, color: [86, 108, 111], gap: 16 });
  const detailedModules = curriculum.jalur.reduce((total, path) => total + path.modul.filter(module => module.konten?.length).length, 0);
  const totalModules = curriculum.jalur.reduce((total, path) => total + path.modul.length, 0);
  addText(`Cakupan: ${curriculum.jalur.length} jalur, ${totalModules} modul, ${detailedModules} modul dengan uraian section terperinci.`, { size: 10, style: 'bold', gap: 8 });
  addText('Cara membaca dokumen', { size: 13, style: 'bold', color: [13, 112, 105], gap: 5 });
  addText('Setiap jalur menjelaskan sasaran peserta. Setiap modul memuat ringkasan, fokus, hasil belajar, status, materi section yang tersedia, serta checklist dan bobot KUM. Pada section terperinci, uraian penjelasan diambil dari materi pembelajaran yang tersedia; tabel, daftar, langkah, alur, kutipan, dan catatan disertakan jika ada.', { size: 10, gap: 8 });
  addText('Kelengkapan materi', { size: 13, style: 'bold', color: [13, 112, 105], gap: 5 });
  addText(`${totalModules - detailedModules} modul saat ini belum memiliki uraian section lengkap di data aplikasi. Ringkasan, fokus, hasil belajar, status, dan checklist modul tersebut tetap dimasukkan; bagian yang belum tersedia ditandai agar tidak disalahartikan sebagai materi lengkap.`, { size: 10, gap: 10 });

  addHeading('Peta jalur belajar', 1);
  curriculum.jalur.forEach(path => {
    addHeading(`Jalur ${path.kode} - ${path.nama}`, 2);
    addText(`Sasaran peserta: ${path.sasaran}`);
    path.modul.forEach((module, index) => {
      addText(`${index + 1}. ${module.judul}`, { style: 'bold', size: 10, gap: 3 });
      addText(module.ringkasan || 'Ringkasan modul belum tersedia.', { indent: 12, size: 9, gap: 3 });
    });
  });

  curriculum.jalur.forEach(path => {
    startPage();
    addHeading(`Jalur ${path.kode} - ${path.nama}`, 1);
    addText(`Sasaran peserta: ${path.sasaran}`, { size: 10, gap: 10 });
    path.modul.forEach((module, moduleIndex) => {
      if (moduleIndex > 0) y += 10;
      moduleCount += 1;
      addHeading(`Modul ${moduleIndex + 1}: ${module.judul}`, 2);
      addText(`Tingkat: ${module.tingkat || 'Belum ditentukan'} | Status: ${module.status || 'Belum ditentukan'}`, { size: 9, color: [86, 108, 111] });
      addLabel('Ringkasan modul');
      addText(module.ringkasan || 'Ringkasan modul belum tersedia.');
      addLabel('Fokus pembelajaran');
      if (module.fokus?.length) addList(module.fokus);
      else addText('Fokus pembelajaran belum ditentukan.');
      addLabel('Hasil belajar');
      addText(module.hasil || 'Hasil belajar belum ditentukan.');
      if (module.tautan) {
        addLabel('Tautan modul');
        addText(module.tautan, { size: 9 });
      }

      const progress = getModuleProgress?.(path, module) || {};
      const checklist = progress.items || [];
      if (checklist.length) {
        addLabel(`Checklist pembelajaran (${progress.completed || 0}/${checklist.length} selesai · ${progress.earnedKum || 0}/${progress.totalKum || 0} KUM)`);
        checklist.forEach(item => addText(`${item.done ? '[x]' : '[ ]'} ${item.title} - ${item.kum} KUM`, { size: 8.5, indent: 10, gap: 3 }));
      }

      if (!module.konten?.length) {
        addText('Uraian section terperinci untuk modul ini belum tersedia di data aplikasi. Ringkasan, fokus pembelajaran, hasil belajar, dan checklist di atas merupakan seluruh informasi modul yang tersedia saat dokumen dibuat.', { size: 9, style: 'italic', color: [105, 105, 96], gap: 7 });
        return;
      }

      addLabel('Penjelasan section pembelajaran');
      const renderSection = (section, sectionNumber, depth = 0) => {
        sectionCount += 1;
        addHeading(`${sectionNumber} ${section.judul || 'Materi inti'}`, depth === 0 ? 3 : 3);
        const paragraphs = section.paragraf || [];
        addLabel('Penjelasan');
        addText(sectionExplanation(section), { size: 9.5 });
        paragraphs.slice(1).forEach(paragraph => addText(paragraph, { size: 9.5 }));
        if (section.poin?.length) {
          addLabel('Pokok bahasan');
          addList(section.poin);
        }
        if (section.langkah?.length) {
          addLabel('Langkah');
          addList(section.langkah, true);
        }
        if (section.alur?.length) {
          addLabel('Alur');
          addList(section.alur, true);
        }
        if (section.tabel) {
          addLabel(`Tabel: ${(section.tabel.kolom || []).join(' | ')}`);
          (section.tabel.baris || []).forEach((row, rowIndex) => {
            const cells = (section.tabel.kolom || []).map((column, columnIndex) => `${column}: ${row[columnIndex] || ''}`);
            addText(`${rowIndex + 1}. ${cells.join(' | ')}`, { size: 8.5, indent: 8, gap: 3 });
          });
        }
        if (section.kutipan) addText(`Kutipan: ${section.kutipan}`, { size: 9, style: 'italic', indent: 10 });
        if (section.catatan) {
          addLabel('Catatan');
          addText(section.catatan);
        }
        (section.subbagian || []).forEach((subsection, index) => {
          renderSection(subsection, `${sectionNumber}.${index + 1}`, depth + 1);
        });
      };
      module.konten.forEach((section, index) => renderSection(section, `${moduleIndex + 1}.${index + 1}`));
    });
  });

  for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(215, 225, 222);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 38, pageWidth - margin, pageHeight - 38);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110, 131, 135);
    pdf.text('IDTC Mobile - Rangkuman Pembelajaran Digital Twin', margin, pageHeight - 24);
    pdf.text(`${page} / ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
  }

  const date = new Date().toISOString().slice(0, 10);
  const blobUrl = URL.createObjectURL(pdf.output('blob'));
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = `IDTC-Rangkuman-Pembelajaran-Digital-Twin-${date}.pdf`;
  downloadLink.rel = 'noopener';
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return { moduleCount, sectionCount, pageCount: pdf.getNumberOfPages() };
}
