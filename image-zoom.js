const interactiveImageSelector = 'img[alt]:not([alt=""])';

export function bindImageZoom() {
  if (document.querySelector('[data-image-viewer]')) return;

  const viewer = document.createElement('div');
  viewer.className = 'image-viewer';
  viewer.dataset.imageViewer = '';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Pratinjau gambar');
  viewer.tabIndex = -1;
  viewer.innerHTML = `
    <button class="image-viewer-close" type="button" aria-label="Tutup pratinjau">×</button>
    <p class="image-viewer-hint">Cubit untuk zoom · Geser untuk melihat detail</p>
    <div class="image-viewer-stage">
      <img class="image-viewer-image" alt="" draggable="false" />
    </div>
    <div class="image-viewer-controls" aria-label="Kontrol zoom">
      <button type="button" data-image-zoom-out aria-label="Perkecil gambar">−</button>
      <button type="button" data-image-zoom-reset aria-label="Reset zoom">Reset</button>
      <button type="button" data-image-zoom-in aria-label="Perbesar gambar">+</button>
    </div>`;
  document.body.append(viewer);

  const image = viewer.querySelector('.image-viewer-image');
  const closeButton = viewer.querySelector('.image-viewer-close');
  const stage = viewer.querySelector('.image-viewer-stage');
  let previousFocus = null;
  let previousBodyOverflow = '';
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let lastTap = 0;
  let gestureUsedPinch = false;
  const pointers = new Map();
  let gesture = null;

  const clampOffset = () => {
    const rect = image.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width - window.innerWidth * 0.94) / 2);
    const maxY = Math.max(0, (rect.height - window.innerHeight * 0.88) / 2);
    offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
    offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
  };

  const applyTransform = () => {
    clampOffset();
    image.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    stage.classList.toggle('is-zoomed', scale > 1);
  };

  const setScale = (nextScale, anchorX = window.innerWidth / 2, anchorY = window.innerHeight / 2) => {
    const next = Math.max(1, Math.min(5, nextScale));
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const imageX = (anchorX - centerX - offsetX) / scale;
    const imageY = (anchorY - centerY - offsetY) / scale;
    offsetX = anchorX - centerX - imageX * next;
    offsetY = anchorY - centerY - imageY * next;
    scale = next;
    if (scale === 1) offsetX = offsetY = 0;
    applyTransform();
  };

  const reset = () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    applyTransform();
  };

  const close = () => {
    viewer.hidden = true;
    image.removeAttribute('src');
    pointers.clear();
    gesture = null;
    gestureUsedPinch = false;
    document.body.style.overflow = previousBodyOverflow;
    if (previousFocus?.isConnected) previousFocus.focus();
  };

  document.addEventListener('click', event => {
    if (!(event.target instanceof HTMLImageElement) || !event.target.matches(interactiveImageSelector)) return;
    if (event.target.closest('[data-image-viewer]')) return;
    if (event.target.closest('.fab-icon-stage, .brand-mark')) return;
    if (event.target.closest('[aria-hidden="true"]')) return;
    event.preventDefault();
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    image.alt = event.target.alt;
    image.src = event.target.currentSrc || event.target.src;
    viewer.setAttribute('aria-label', event.target.alt ? `Pratinjau gambar: ${event.target.alt}` : 'Pratinjau gambar');
    viewer.hidden = false;
    reset();
    closeButton.focus();
  });

  closeButton.addEventListener('click', close);
  viewer.addEventListener('click', event => {
    if (event.target === viewer || event.target === stage) close();
  });
  viewer.querySelector('[data-image-zoom-in]').addEventListener('click', () => setScale(scale + 0.5));
  viewer.querySelector('[data-image-zoom-out]').addEventListener('click', () => setScale(scale - 0.5));
  viewer.querySelector('[data-image-zoom-reset]').addEventListener('click', reset);

  viewer.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === '+' || event.key === '=') setScale(scale + 0.5);
    if (event.key === '-') setScale(scale - 0.5);
    if (event.key === '0') reset();
  });

  image.addEventListener('wheel', event => {
    event.preventDefault();
    setScale(scale + (event.deltaY < 0 ? 0.25 : -0.25), event.clientX, event.clientY);
  }, { passive: false });

  const distanceBetween = ([first, second]) => Math.hypot(second.x - first.x, second.y - first.y);
  const midpointBetween = ([first, second]) => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });

  image.addEventListener('pointerdown', event => {
    event.preventDefault();
    image.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      gestureUsedPinch = true;
      const points = [...pointers.values()].slice(0, 2);
      const midpoint = midpointBetween(points);
      gesture = {
        kind: 'pinch',
        distance: distanceBetween(points),
        scale,
        anchorX: (midpoint.x - window.innerWidth / 2 - offsetX) / scale,
        anchorY: (midpoint.y - window.innerHeight / 2 - offsetY) / scale,
      };
    } else {
      gesture = { kind: 'pan', x: event.clientX, y: event.clientY, offsetX, offsetY };
    }
  });

  image.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && gesture?.kind === 'pinch') {
      const points = [...pointers.values()].slice(0, 2);
      const midpoint = midpointBetween(points);
      scale = Math.max(1, Math.min(5, gesture.scale * distanceBetween(points) / Math.max(1, gesture.distance)));
      offsetX = midpoint.x - window.innerWidth / 2 - gesture.anchorX * scale;
      offsetY = midpoint.y - window.innerHeight / 2 - gesture.anchorY * scale;
      applyTransform();
    } else if (pointers.size === 1 && gesture?.kind === 'pan' && scale > 1) {
      offsetX = gesture.offsetX + event.clientX - gesture.x;
      offsetY = gesture.offsetY + event.clientY - gesture.y;
      applyTransform();
    }
  });

  const endPointer = event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      gesture = { kind: 'pan', x: remaining.x, y: remaining.y, offsetX, offsetY };
    } else if (pointers.size === 0) {
      gesture = null;
      const now = Date.now();
      if (!gestureUsedPinch && event.pointerType === 'touch') {
        if (now - lastTap < 300) setScale(scale > 1 ? 1 : 2);
        lastTap = now;
      }
      gestureUsedPinch = false;
    }
  };
  image.addEventListener('pointerup', endPointer);
  image.addEventListener('pointercancel', endPointer);

  image.addEventListener('dblclick', event => {
    event.preventDefault();
    setScale(scale > 1 ? 1 : 2, event.clientX, event.clientY);
  });

  window.addEventListener('resize', applyTransform);
}
