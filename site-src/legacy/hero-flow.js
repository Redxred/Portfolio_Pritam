// A small Three.js scene frames the hero copy with depth, without owning its controls.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group,
  Line, LineBasicMaterial, PerspectiveCamera, Points, PointsMaterial, Scene,
  Sprite, SpriteMaterial, SRGBColorSpace, TorusGeometry, SphereGeometry, Mesh, MeshBasicMaterial,
  WebGLRenderer,
} from 'three';

export function initHeroFlow(canvas) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || navigator.connection?.saveData) return;
  const hero = canvas.closest('section');
  if (!hero) return;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    canvas.dataset.motionEngine = 'static';
    return;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  canvas.dataset.motionEngine = 'threejs';

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, .1, 60);
  camera.position.z = 12;
  const ribbons = [];
  const ribbonGroup = new Group();
  scene.add(ribbonGroup);
  const orb = new Group();
  scene.add(orb);

  for (let i = 0; i < 2; i++) {
    const geometry = new TorusGeometry(i ? 1.19 : 1.04, i ? .007 : .011, 3, 128);
    const material = new MeshBasicMaterial({
      color: i ? 0xa177f8 : 0x39e5ef, transparent: true, opacity: i ? .24 : .32,
      depthWrite: false, blending: AdditiveBlending,
    });
    const ring = new Mesh(geometry, material);
    ring.rotation.set(i ? -.53 : .67, i ? -.44 : .27, i ? -.32 : .18);
    orb.add(ring);
  }
  const satellites = [];
  for (let i = 0; i < 3; i++) {
    const satellite = new Mesh(
      new SphereGeometry(.045, 8, 8),
      new MeshBasicMaterial({
        color: i === 1 ? 0xa177f8 : 0x39e5ef, transparent: true,
        opacity: .8, depthWrite: false, blending: AdditiveBlending,
      }),
    );
    orb.add(satellite);
    satellites.push(satellite);
  }

  const particleCount = 120;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const seeds = Array.from({ length: particleCount }, (_, i) => {
    const hash = n => {
      const value = Math.sin(n * 127.1 + 43.7) * 43758.5453;
      return value - Math.floor(value);
    };
    return [hash(i + 1), hash(i + 71), hash(i + 241)];
  });
  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new BufferAttribute(particleColors, 3));
  const particleMaterial = new PointsMaterial({
    size: 2.5, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: .6, depthWrite: false, blending: AdditiveBlending,
  });
  const particles = new Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  scene.add(particles);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d');
  const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,.7)');
  gradient.addColorStop(.3, 'rgba(255,255,255,.24)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  glowContext.fillStyle = gradient;
  glowContext.fillRect(0, 0, 128, 128);
  const glowTexture = new CanvasTexture(glowCanvas);
  const glowMaterial = new SpriteMaterial({
    map: glowTexture, color: 0x43e9f2, transparent: true, opacity: 0,
    depthWrite: false, blending: AdditiveBlending,
  });
  const pointerGlow = new Sprite(glowMaterial);
  pointerGlow.scale.set(4.5, 4.5, 1);
  pointerGlow.position.z = -1;
  scene.add(pointerGlow);

  let width = 1;
  let height = 1;
  let halfX = 1;
  let halfY = 1;
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

  const makeRibbon = (index, upper) => {
    const count = width < 640 ? 46 : 84;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(count * 3), 3));
    const material = new LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: upper ? .09 : .23,
      depthWrite: false, blending: AdditiveBlending,
    });
    const line = new Line(geometry, material);
    line.frustumCulled = false;
    ribbonGroup.add(line);
    ribbons.push({ geometry, material, index, upper, count });
  };
  for (let i = 0; i < (innerWidth < 640 ? 11 : 19); i++) makeRibbon(i, false);
  for (let i = 0; i < (innerWidth < 640 ? 3 : 7); i++) makeRibbon(i, true);

  const recolor = () => {
    const cyan = new Color(light ? 0x087a90 : 0x21e1ee);
    const violet = new Color(light ? 0x7452b6 : 0xa177f8);
    const mix = new Color();
    for (const ribbon of ribbons) {
      const colors = ribbon.geometry.getAttribute('color');
      for (let point = 0; point < ribbon.count; point++) {
        mix.copy(cyan).lerp(violet, point / (ribbon.count - 1));
        colors.setXYZ(point, mix.r, mix.g, mix.b);
      }
      colors.needsUpdate = true;
      ribbon.material.opacity = ribbon.upper ? (light ? .075 : .09) : (light ? .16 : .23);
    }
    for (let i = 0; i < particleCount; i++) {
      mix.copy(cyan).lerp(violet, seeds[i][0]);
      particleColors.set([mix.r, mix.g, mix.b], i * 3);
    }
    particleGeometry.getAttribute('color').needsUpdate = true;
    particleMaterial.opacity = light ? .42 : .6;
    orb.children[0].material.color.copy(cyan);
    orb.children[1].material.color.copy(violet);
    orb.children[0].material.opacity = light ? .2 : .32;
    orb.children[1].material.opacity = light ? .17 : .24;
    satellites.forEach((satellite, index) => {
      satellite.material.color.copy(index === 1 ? violet : cyan);
      satellite.material.opacity = light ? .7 : .8;
    });
    glowMaterial.color.copy(cyan);
  };

  const draw = time => {
    pointerX += (pointerTargetX - pointerX) * .14;
    pointerY += (pointerTargetY - pointerY) * .14;
    pointerStrength += (pointerTargetStrength - pointerStrength) * .16;
    camera.position.x = (pointerX - .5) * .28 * pointerStrength;
    camera.position.y = (.5 - pointerY) * .18 * pointerStrength;
    camera.lookAt(0, 0, 0);
    pointerGlow.position.x = (pointerX - .5) * halfX * 2;
    pointerGlow.position.y = (.5 - pointerY) * halfY * 2;
    glowMaterial.opacity = pointerStrength * (light ? .13 : .2);

    for (const ribbon of ribbons) {
      const position = ribbon.geometry.getAttribute('position');
      const base = ribbon.upper
        ? halfY * (.71 + ribbon.index * .052)
        : -halfY * (.62 + ribbon.index * .023);
      for (let point = 0; point < ribbon.count; point++) {
        const u = point / (ribbon.count - 1);
        const x = (u - .5) * halfX * 2.25;
        const wave = Math.sin(x * .7 - time * .52 + ribbon.index * .2) * (ribbon.upper ? .09 : .17);
        const ripple = Math.sin(x * 1.45 + time * .3 - ribbon.index * .15) * .04;
        const y = base + wave + ripple + (u - .5) * (ribbon.upper ? -.28 : .38);
        position.setXYZ(point, x, y, -1 - ribbon.index * .09);
      }
      position.needsUpdate = true;
    }

    for (let i = 0; i < particleCount; i++) {
      const [a, b, c] = seeds[i];
      const lower = i < particleCount * .77;
      const x = (a - .5) * halfX * 2.04;
      const y = lower
        ? -halfY * (.55 + b * .38) + Math.sin(time * .5 + c * 9) * .07
        : halfY * (.55 + b * .36) + Math.sin(time * .42 + a * 11) * .05;
      particlePositions.set([x, y, -1.3 - c * 2], i * 3);
    }
    particleGeometry.getAttribute('position').needsUpdate = true;
    orb.rotation.z = time * .035;
    orb.rotation.y = Math.sin(time * .32) * .1 + (pointerX - .5) * .17 * pointerStrength;
    satellites.forEach((satellite, index) => {
      const angle = time * (index === 1 ? -.42 : .36) + index * Math.PI * 2 / 3;
      satellite.position.set(Math.cos(angle) * 1.22, Math.sin(angle) * .96, Math.sin(angle) * .34);
    });
    orb.position.y = halfY * (width < 640 ? .48 : .38) + Math.sin(time * .45) * .035;
    orb.scale.setScalar(width < 640 ? .75 : 1);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    halfY = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
    halfX = halfY * camera.aspect;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 640 ? 1.15 : 1.5));
    renderer.setSize(width, height, false);
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
    recolor();
    draw(performance.now() / 1000);
  };
  const onPointer = event => {
    if (event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    pointerTargetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    pointerTargetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    pointerTargetStrength = 1;
    canvas.dataset.pointerX = pointerTargetX.toFixed(2);
  };
  const onPointerLeave = () => {
    pointerTargetX = pointerTargetY = .5;
    pointerTargetStrength = 0;
  };

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
    ribbons.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
    orb.children.forEach(ring => { ring.geometry.dispose(); ring.material.dispose(); });
    particleGeometry.dispose();
    particleMaterial.dispose();
    glowTexture.dispose();
    glowMaterial.dispose();
    renderer.dispose();
  }, { once: true });
}
