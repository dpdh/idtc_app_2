export function bubbleFieldMarkup(count = 24, speed = 1) {
  return `<div class="color-bubbles" aria-hidden="true">${Array.from({ length: count }, (_, index) => {
    const size = Math.round(5 + Math.random() * 13);
    const duration = (3.4 + Math.random() * 4.6) * speed;
    const hue = Math.round(Math.random() * 360);
    const delay = (Math.random() * duration).toFixed(2);
    const drift = Math.round(-34 + Math.random() * 68);
    return `<i style="--bubble-left:${(Math.random() * 100).toFixed(2)}%;--bubble-size:${size}px;--bubble-duration:${duration.toFixed(2)}s;--bubble-delay:-${delay}s;--bubble-hue:${hue};--bubble-drift:${drift}px;--bubble-bounce:${(0.7 + Math.random() * 1.5).toFixed(2)}"></i>`;
  }).join('')}</div>`;
}
