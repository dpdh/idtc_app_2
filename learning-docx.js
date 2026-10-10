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

export async function downloadLearningDocx(curriculum, getModuleProgress) {
  const library = globalThis.docx;
  if (typeof library?.Document !== 'function' || typeof library?.Packer?.toBlob !== 'function') {
    throw new Error('Generator Microsoft Word tidak berhasil dimuat.');
  }
  if (!Array.isArray(curriculum?.jalur) || curriculum.jalur.length === 0) {
    throw new Error('Data jalur belajar belum tersedia untuk dibuat menjadi dokumen Word.');
  }

  const { Document, HeadingLevel, Paragraph, Packer, TextRun } = library;
  const children = [];
  let moduleCount = 0;
  let sectionCount = 0;
  const addParagraph = (text, options = {}) => {
    if (text === undefined || text === null || text === '') return;
    const { bold, italics, ...paragraphOptions } = options;
    children.push(new Paragraph({
      children: [new TextRun({ text: String(text), bold, italics })],
      ...paragraphOptions,
    }));
  };
  const addHeading = (text, level, pageBreakBefore = false) => {
    children.push(new Paragraph({
      text: String(text),
      heading: level,
      ...(pageBreakBefore ? { pageBreakBefore: true } : {}),
    }));
  };
  const addList = (items, label, numbered = false) => {
    if (!items?.length) return;
    addParagraph(label, { keepNext: true });
    items.forEach((item, index) => addParagraph(`${numbered ? `${index + 1}.` : '-'} ${item}`, { indent: { left: 360, hanging: 180 } }));
  };
  const formatTableRows = (section, index) => {
    if (!section.tabel) return;
    const columns = section.tabel.kolom || [];
    addParagraph(`Tabel ${index}: ${columns.join(' | ')}`, { keepNext: true });
    (section.tabel.baris || []).forEach((row, rowIndex) => {
      addParagraph(`${rowIndex + 1}. ${columns.map((column, columnIndex) => `${column}: ${row[columnIndex] || ''}`).join(' | ')}`, {
        indent: { left: 360, hanging: 180 },
      });
    });
  };

  addParagraph('INDONESIA DIGITAL TWIN COMMUNITY', { style: 'Subtitle' });
  addHeading('Rangkuman Pembelajaran Digital Twin', HeadingLevel.TITLE);
  addParagraph('Panduan jalur belajar, seluruh modul, penjelasan section, dan checklist pembelajaran.');
  const detailedModules = curriculum.jalur.reduce((total, path) => total + path.modul.filter(module => module.konten?.length).length, 0);
  const totalModules = curriculum.jalur.reduce((total, path) => total + path.modul.length, 0);
  addParagraph(`Tanggal dokumen: ${new Date().toLocaleDateString('id-ID')}`);
  addParagraph(`Cakupan: ${curriculum.jalur.length} jalur, ${totalModules} modul, ${detailedModules} modul dengan uraian section terperinci.`);
  addHeading('Cara membaca dokumen', HeadingLevel.HEADING_1);
  addParagraph('Setiap jalur menjelaskan sasaran peserta. Setiap modul memuat ringkasan, fokus, hasil belajar, status, section yang tersedia, serta checklist dan bobot KUM. Setiap section dilengkapi penjelasan berdasarkan data pembelajaran; pokok bahasan, langkah, alur, tabel, kutipan, dan catatan juga dicantumkan jika tersedia.');
  addHeading('Kelengkapan materi', HeadingLevel.HEADING_1);
  addParagraph(`${totalModules - detailedModules} modul saat ini belum memiliki uraian section lengkap di data aplikasi. Ringkasan, fokus, hasil belajar, status, dan checklist modul tersebut tetap dimasukkan; ketiadaan materi rinci ditandai secara jelas.`);

  addHeading('Peta jalur belajar', HeadingLevel.HEADING_1);
  curriculum.jalur.forEach(path => {
    addHeading(`Jalur ${path.kode} - ${path.nama}`, HeadingLevel.HEADING_2);
    addParagraph(`Sasaran peserta: ${path.sasaran}`);
    path.modul.forEach((module, index) => {
      addParagraph(`${index + 1}. ${module.judul}`, { bold: true });
      addParagraph(module.ringkasan || 'Ringkasan modul belum tersedia.', { indent: { left: 360 } });
    });
  });

  curriculum.jalur.forEach(path => {
    addHeading(`Jalur ${path.kode} - ${path.nama}`, HeadingLevel.HEADING_1, true);
    addParagraph(`Sasaran peserta: ${path.sasaran}`);
    path.modul.forEach((module, moduleIndex) => {
      moduleCount += 1;
      addHeading(`Modul ${moduleIndex + 1}: ${module.judul}`, HeadingLevel.HEADING_2);
      addParagraph(`Tingkat: ${module.tingkat || 'Belum ditentukan'} | Status: ${module.status || 'Belum ditentukan'}`);
      addParagraph('Ringkasan modul', { bold: true });
      addParagraph(module.ringkasan || 'Ringkasan modul belum tersedia.');
      addParagraph('Fokus pembelajaran', { bold: true });
      if (module.fokus?.length) addList(module.fokus);
      else addParagraph('Fokus pembelajaran belum ditentukan.');
      addParagraph('Hasil belajar', { bold: true });
      addParagraph(module.hasil || 'Hasil belajar belum ditentukan.');
      if (module.tautan) addParagraph(`Tautan modul: ${module.tautan}`);

      const progress = getModuleProgress?.(path, module) || {};
      const checklist = progress.items || [];
      if (checklist.length) {
        addParagraph(`Checklist pembelajaran (${progress.completed || 0}/${checklist.length} selesai; ${progress.earnedKum || 0}/${progress.totalKum || 0} KUM)`, { bold: true });
        checklist.forEach(item => addParagraph(`${item.done ? '[Selesai]' : '[Belum selesai]'} ${item.title} - ${item.kum} KUM`, {
          indent: { left: 360, hanging: 180 },
        }));
      }

      if (!module.konten?.length) {
        addParagraph('Uraian section terperinci untuk modul ini belum tersedia di data aplikasi. Ringkasan, fokus pembelajaran, hasil belajar, dan checklist di atas adalah seluruh informasi modul yang tersedia saat dokumen dibuat.', { italics: true });
        return;
      }

      addParagraph('Penjelasan section pembelajaran', { bold: true });
      const renderSection = (section, sectionNumber, depth = 0) => {
        sectionCount += 1;
        addHeading(`${sectionNumber} ${section.judul || 'Materi inti'}`, depth === 0 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4);
        addParagraph('Penjelasan', { bold: true });
        addParagraph(sectionExplanation(section));
        (section.paragraf || []).slice(1).forEach(paragraph => addParagraph(paragraph));
        addList(section.poin, 'Pokok bahasan');
        addList(section.langkah, 'Langkah', true);
        addList(section.alur, 'Alur', true);
        formatTableRows(section, sectionNumber);
        if (section.kutipan) addParagraph(`Kutipan: ${section.kutipan}`, { italics: true, indent: { left: 360 } });
        if (section.catatan) {
          addParagraph('Catatan', { bold: true });
          addParagraph(section.catatan);
        }
        (section.subbagian || []).forEach((subsection, index) => {
          renderSection(subsection, `${sectionNumber}.${index + 1}`, depth + 1);
        });
      };
      module.konten.forEach((section, index) => renderSection(section, `${moduleIndex + 1}.${index + 1}`));
    });
  });

  const wordDocument = new Document({
    creator: 'Indonesia Digital Twin Community',
    title: 'Rangkuman Pembelajaran Digital Twin - IDTC',
    description: 'Seluruh jalur, modul, section, penjelasan, hasil belajar, dan checklist pembelajaran Digital Twin.',
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children,
    }],
  });
  const blob = await Packer.toBlob(wordDocument);
  const date = new Date().toISOString().slice(0, 10);
  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = window.document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = `IDTC-Rangkuman-Pembelajaran-Digital-Twin-${date}.docx`;
  downloadLink.rel = 'noopener';
  window.document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return { moduleCount, sectionCount, size: blob.size };
}
