// Animated light ribbons stay inside the hero and stop when it is not visible.
export function initHeroFlow(canvas) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || navigator.connection?.saveData) return;
  const context = canvas.getContext('2d', { alpha: true });
  const hero = canvas.closest('section');
  if (!context || !hero) return;

  let width = 1;
  let height = 1;
  let frame = 0;
  let lastFrame = 0;
  let visible = true;
  let light = false;
  let disposed = false;
  let pointerX = .5;
  let pointerY = .5;
  let pointerTargetX = .5;
  let pointerTargetY = .5;
  let pointerStrength = 0;
  let pointerTargetStrength = 0;

  const lineY = (x, index, time, upper = false) => {
    const progress = (x + (pointerX - .5) * 55 * pointerStrength) / width;
    const base = upper ? height * (.11 + index * .026) : height * (.75 + index * .011);
    const wave = Math.sin(progress * 5.1 - time * .46 + index * .22) * (upper ? 12 : 18);
    const ripple = Math.sin(progress * 9.2 + time * .27 - index * .16) * (upper ? 5 : 7);
    const distance = (x - pointerX * width) / Math.min(320, Math.max(160, width * .32));
    const influence = Math.exp(-distance * distance * 1.5) * pointerStrength;
    const pull = Math.max(-34, Math.min(34, (pointerY * height - base) * .14)) * influence;
    return base + wave + ripple + (progress - .5) * (upper ? -52 : 52) +
      (pointerY - .5) * (upper ? 15 : 22) * pointerStrength + pull;
  };

  const drawPointerGlow = () => {
    if (pointerStrength < .01) return;
    const x = pointerX * width;
    const y = pointerY * height;
    const radius = Math.min(340, Math.max(180, width * .28));
    const color = light ? '0, 120, 149' : '36, 218, 233';
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${color}, ${(light ? .14 : .21) * pointerStrength})`);
    glow.addColorStop(.45, `rgba(${color}, ${(light ? .06 : .09) * pointerStrength})`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = glow;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  const drawLine = (index, total, time, upper = false) => {
    const color = upper ? (light ? '46, 88, 142' : '45, 172, 217') :
      index < total * .55 ? (light ? '0, 120, 149' : '36, 218, 233') :
        (light ? '104, 76, 173' : '148, 105, 238');
    const opacity = upper ? (light ? .11 : .13) : (light ? .18 : .27);
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, `rgba(${color}, 0)`);
    gradient.addColorStop(.16, `rgba(${color}, ${opacity * .7})`);
    gradient.addColorStop(.5, `rgba(${color}, ${opacity})`);
    gradient.addColorStop(.84, `rgba(${color}, ${opacity * .8})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    context.beginPath();
    for (let x = 0; x <= width + 10; x += 10) {
      const y = lineY(x, index, time, upper);
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = gradient;
    context.lineWidth = index % 6 === 0 ? 1.35 : .75;
    context.stroke();
  };

  const drawPulse = (index, time) => {
    const x = (((time * .055 + index * .31) % 1.45) - .2) * width;
    if (x < 0 || x > width) return;
    const start = Math.max(0, x - 95);
    const end = Math.min(width, x + 95);
    const color = index === 1 ? (light ? '102, 77, 181' : '153, 122, 255') :
      (light ? '0, 125, 150' : '47, 238, 246');
    const glow = context.createLinearGradient(start, 0, end, 0);
    glow.addColorStop(0, `rgba(${color}, 0)`);
    glow.addColorStop(.5, `rgba(${color}, ${light ? .48 : .7})`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    context.beginPath();
    for (let point = start; point <= end + 5; point += 5) {
      const y = lineY(point, 4 + index * 8, time);
      if (point === start) context.moveTo(point, y);
      else context.lineTo(point, y);
    }
    context.strokeStyle = glow;
    context.lineWidth = 2;
    context.shadowBlur = 13;
    context.shadowColor = `rgba(${color}, .7)`;
    context.stroke();
    context.shadowBlur = 0;
  };

  const drawCircuit = time => {
    if (width < 760) return;
    const color = light ? '0, 120, 149' : '36, 218, 233';
    for (const side of [0, 1]) {
      for (let lane = 0; lane < 3; lane++) {
        const edge = side ? width : 0;
        const direction = side ? -1 : 1;
        const reach = Math.min(215, width * .17);
        const y = height * (.25 + lane * .16);
        const points = [[edge, y], [edge + direction * reach * .5, y],
          [edge + direction * reach * .5, y + 30], [edge + direction * reach, y + 30]];
        context.beginPath();
        points.forEach(([x, py], i) => i ? context.lineTo(x, py) : context.moveTo(x, py));
        context.strokeStyle = `rgba(${color}, ${light ? .13 : .17})`;
        context.lineWidth = 1;
        context.stroke();
        let distance = ((time * 14 + lane * 62 + side * 39) % (reach + 30));
        for (let i = 1; i < points.length; i++) {
          const [x1, y1] = points[i - 1];
          const [x2, y2] = points[i];
          const length = Math.hypot(x2 - x1, y2 - y1);
          if (distance <= length) {
            const ratio = distance / length;
            context.fillStyle = `rgba(${color}, .55)`;
            context.fillRect(x1 + (x2 - x1) * ratio - 1.5, y1 + (y2 - y1) * ratio - 1.5, 3, 3);
            break;
          }
          distance -= length;
        }
        const [endX, endY] = points.at(-1);
        context.strokeRect(endX - 3, endY - 3, 6, 6);
      }
    }
  };

  const draw = time => {
    context.clearRect(0, 0, width, height);
    pointerX += (pointerTargetX - pointerX) * .3;
    pointerY += (pointerTargetY - pointerY) * .3;
    pointerStrength += (pointerTargetStrength - pointerStrength) * .32;
    drawPointerGlow();
    drawCircuit(time);
    const mobile = width < 640;
    for (let i = 0; i < (mobile ? 4 : 9); i++) drawLine(i, 9, time, true);
    for (let i = 0; i < (mobile ? 14 : 23); i++) drawLine(i, mobile ? 14 : 23, time);
    for (let i = 0; i < (mobile ? 1 : 3); i++) drawPulse(i, time);
  };

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(performance.now() / 1000);
  };

  const tick = now => {
    if (disposed || document.hidden || !visible || preference.matches) {
      frame = 0;
      canvas.dataset.motionState = 'paused';
      return;
    }
    frame = requestAnimationFrame(tick);
    if (now - lastFrame < 1000 / (width < 640 ? 24 : 30)) return;
    lastFrame = now;
    draw(now / 1000);
  };
  const syncPlayback = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    const playing = !disposed && !document.hidden && visible && !preference.matches;
    canvas.dataset.motionState = playing ? 'running' : 'paused';
    if (playing) frame = requestAnimationFrame(tick);
  };
  const syncTheme = () => {
    light = document.documentElement.classList.contains('light');
    canvas.dataset.motionTheme = light ? 'light' : 'dark';
    draw(performance.now() / 1000);
  };
  const onPointer = event => {
    if (event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    pointerTargetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    pointerTargetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    pointerTargetStrength = 1;
  };
  const onPointerLeave = () => {
    pointerTargetX = .5;
    pointerTargetY = .5;
    pointerTargetStrength = 0;
  };

  canvas.dataset.motionEngine = 'canvas2d';
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  });
  visibilityObserver.observe(hero);
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  hero.addEventListener('pointermove', onPointer, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', syncPlayback);
  preference.addEventListener('change', syncPlayback);
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
    hero.removeEventListener('pointermove', onPointer);
    hero.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', syncPlayback);
    preference.removeEventListener('change', syncPlayback);
  }, { once: true });
}
