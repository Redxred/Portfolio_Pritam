// Lightweight canvas motion for phones; the Three.js scene stays on larger screens.
export function initHeroFlow(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || navigator.connection?.saveData) return;
  const hero = canvas.closest('section');
  const context = canvas.getContext('2d', { alpha: true });
  if (!hero || !context) return;

  let width = 1;
  let height = 1;
  let frame = 0;
  let lastFrame = 0;
  let visible = true;
  let light = false;
  let disposed = false;
  const stars = Array.from({ length: 18 }, (_, index) => {
    const fraction = value => {
      const n = Math.sin(value * 71.13) * 43758.5453;
      return n - Math.floor(n);
    };
    return [fraction(index + 1), fraction(index + 31), fraction(index + 91)];
  });

  const ribbon = (index, time, upper) => {
    const base = upper ? height * (.13 + index * .023) : height * (.78 + index * .016);
    const color = index % 3 === 0
      ? (light ? '98, 72, 157' : '151, 110, 237')
      : (light ? '0, 116, 142' : '39, 214, 230');
    const alpha = upper ? (light ? .07 : .09) : (light ? .13 : .17);
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, `rgba(${color}, 0)`);
    gradient.addColorStop(.18, `rgba(${color}, ${alpha})`);
    gradient.addColorStop(.82, `rgba(${color}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    context.beginPath();
    for (let x = 0; x <= width + 24; x += 24) {
      const progress = x / width;
      const y = base + Math.sin(progress * 5 - time * .55 + index * .28) * (upper ? 4 : 7)
        + Math.sin(progress * 8 + time * .23 - index * .17) * 2;
      if (!x) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = gradient;
    context.lineWidth = 1;
    context.stroke();
  };

  const draw = time => {
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < 3; i++) ribbon(i, time, true);
    for (let i = 0; i < 8; i++) ribbon(i, time, false);
    stars.forEach(([x, y, phase], index) => {
      const starY = index < 13 ? height * (.13 + y * .16) : height * (.75 + y * .14);
      context.fillStyle = index % 3 === 0
        ? `rgba(165, 123, 238, ${.2 + .12 * Math.sin(time + phase * 6)})`
        : `rgba(48, 213, 232, ${.2 + .12 * Math.sin(time + phase * 6)})`;
      context.fillRect(x * width, starY, 2, 2);
    });
  };

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    // A single device pixel keeps the drawing cost predictable on dense screens.
    canvas.width = width;
    canvas.height = height;
    draw(performance.now() / 1000);
  };
  const tick = now => {
    if (disposed || document.hidden || !visible || reduced.matches) {
      frame = 0;
      canvas.dataset.motionState = 'paused';
      return;
    }
    frame = requestAnimationFrame(tick);
    if (now - lastFrame < 1000 / 18) return;
    lastFrame = now;
    draw(now / 1000);
  };
  const syncPlayback = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    const playing = !disposed && !document.hidden && visible && !reduced.matches;
    canvas.dataset.motionState = playing ? 'running' : 'paused';
    if (playing) frame = requestAnimationFrame(tick);
  };
  const syncTheme = () => {
    light = document.documentElement.classList.contains('light');
    canvas.dataset.motionTheme = light ? 'light' : 'dark';
    draw(performance.now() / 1000);
  };

  canvas.dataset.motionEngine = 'canvas2d-mobile';
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  });
  visibilityObserver.observe(hero);
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncPlayback);
  reduced.addEventListener('change', syncPlayback);
  syncTheme();
  resize();
  syncPlayback();

  addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener('visibilitychange', syncPlayback);
    reduced.removeEventListener('change', syncPlayback);
  }, { once: true });
}
