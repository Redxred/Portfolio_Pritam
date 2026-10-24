// Aceternity-inspired falling beams with a collision burst at the hero floor.
// Motion uses transforms, pauses offscreen, and keeps the mobile scene sparse.
export function initHeroBeams(hero) {
  const backdrop = hero.querySelector('.hero-backdrop');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!backdrop || backdrop.querySelector('.hero-beams-layer') || reducedMotion.matches || navigator.connection?.saveData) return;

  const compact = matchMedia('(max-width: 767px)').matches;
  const lowMemory = Number(navigator.deviceMemory || 4) <= 2;
  const beams = compact
    ? [{ x: 16, duration: 6600, delay: 600, gap: 2400 }, { x: 83, duration: 8200, delay: 2300, gap: 3000 }]
    : [
        { x: 8, duration: 5800, delay: 400, gap: 2600 },
        { x: 22, duration: 7600, delay: 2400, gap: 1800 },
        { x: 36, duration: 6800, delay: 4100, gap: 3100 },
        { x: 65, duration: 8300, delay: 1300, gap: 2200 },
        { x: 79, duration: 5400, delay: 3300, gap: 2900 },
        { x: 93, duration: 9200, delay: 5000, gap: 1900 },
      ];
  const layer = document.createElement('div');
  layer.className = 'hero-beams-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.motionEngine = 'beams-collision';
  layer.dataset.collisions = '0';
  backdrop.append(layer);

  let active = false;
  const players = [];
  const timers = new Set();
  const floorY = () => layer.clientHeight * (compact ? .89 : .86);

  function explode(x, y, index) {
    if (!active) return;
    const burst = document.createElement('div');
    burst.className = 'hero-beam-impact';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    burst.style.setProperty('--burst-hue', index % 2 ? '270' : '185');
    const ring = document.createElement('span');
    ring.className = 'hero-beam-impact-ring';
    burst.append(ring);
    const count = compact || lowMemory ? 5 : 10;
    for (let part = 0; part < count; part++) {
      const spark = document.createElement('span');
      spark.className = 'hero-beam-impact-spark';
      const angle = (Math.PI * 2 * part / count) + index * .38;
      const distance = compact ? 18 + part % 3 * 8 : 24 + part % 4 * 11;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance * .65 - 15}px`);
      spark.style.setProperty('--spark-delay', `${part % 3 * 24}ms`);
      burst.append(spark);
    }
    layer.append(burst);
    layer.dataset.collisions = String(Number(layer.dataset.collisions) + 1);
    const cleanup = setTimeout(() => { timers.delete(cleanup); burst.remove(); }, 850);
    timers.add(cleanup);
  }

  beams.forEach((settings, index) => {
    const beam = document.createElement('span');
    beam.className = 'hero-collision-beam';
    beam.style.left = `${settings.x}%`;
    beam.style.setProperty('--beam-hue', index % 2 ? '270' : '185');
    layer.append(beam);
    const player = { beam, animation: null };
    players.push(player);

    const fall = (delay = 0) => {
      const length = compact ? 75 : 120;
      const travel = Math.max(0, floorY() - length);
      const animation = beam.animate([
        { transform: `translate3d(0, ${-length}px, 0)`, opacity: 0 },
        { transform: `translate3d(0, ${Math.min(travel, 45)}px, 0)`, opacity: .7, offset: .2 },
        { transform: `translate3d(0, ${travel}px, 0)`, opacity: 1 },
      ], { duration: settings.duration, delay, easing: 'linear', fill: 'both' });
      player.animation = animation;
      if (!active) animation.pause();
      animation.finished.then(() => {
        const bounds = layer.getBoundingClientRect();
        explode(bounds.width * settings.x / 100, floorY(), index);
        const timer = setTimeout(() => { timers.delete(timer); fall(); }, settings.gap);
        timers.add(timer);
      }).catch(() => {});
    };
    fall(settings.delay);
  });

  const sync = () => {
    active = !document.hidden && !reducedMotion.matches && hero.classList.contains('is-in-view');
    for (const { animation } of players) {
      if (!animation || animation.playState === 'finished') continue;
      if (active && animation.playState === 'paused') animation.play();
      if (!active && animation.playState === 'running') animation.pause();
    }
    layer.dataset.motionState = active ? 'running' : 'paused';
  };
  const visibility = new IntersectionObserver(sync, { threshold: .05 });
  visibility.observe(hero);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  const classObserver = new MutationObserver(sync);
  classObserver.observe(hero, { attributes: true, attributeFilter: ['class'] });
  sync();
}
