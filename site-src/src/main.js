import './style.css';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.header');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');
const progress = document.querySelector('.scroll-progress');
const year = document.querySelector('#year');

if (year) year.textContent = String(new Date().getFullYear());

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  nav.classList.toggle('open', !isOpen);
});
nav?.addEventListener('click', (event) => {
  if (!event.target.closest('a')) return;
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open menu');
  nav.classList.remove('open');
});

let scrollQueued = false;
function updateScrollState() {
  scrollQueued = false;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
  progress.style.transform = `scaleX(${ratio})`;
  header.classList.toggle('scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(updateScrollState);
}, { passive: true });
updateScrollState();

if (!reducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-enhanced');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.09, rootMargin: '0px 0px -35px 0px' });
  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
}

if (!reducedMotion && 'IntersectionObserver' in window) {
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const numberNode = element.firstChild;
      const target = Number(element.dataset.count);
      const start = performance.now();
      const duration = 1050;
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        numberNode.nodeValue = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      observer.unobserve(element);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((element) => countObserver.observe(element));
}

if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--rotate-x', `${(-y * 3.5).toFixed(2)}deg`);
      card.style.setProperty('--rotate-y', `${(x * 3.5).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
    });
  });

  const footer = document.querySelector('.footer');
  footer?.addEventListener('pointermove', (event) => {
    const rect = footer.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    footer.style.setProperty('--footer-x', `${(x * 28).toFixed(1)}px`);
  });
  footer?.addEventListener('pointerleave', () => footer.style.setProperty('--footer-x', '0px'));
}

async function initNetworkScene() {
  const canvas = document.querySelector('#hero-canvas');
  const host = document.querySelector('.hero-art');
  if (!canvas || !host) return;
  const THREE = await import('three');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch {
    host.classList.add('webgl-unavailable');
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.4 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 8.8);
  const rig = new THREE.Group();
  scene.add(rig);

  const coreGeometry = new THREE.IcosahedronGeometry(1.65, 2);
  const core = new THREE.Mesh(coreGeometry, new THREE.MeshPhysicalMaterial({
    color: 0x2e9f87, metalness: 0.42, roughness: 0.27,
    transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    depthWrite: false, flatShading: true
  }));
  rig.add(core);
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(coreGeometry),
    new THREE.LineBasicMaterial({ color: 0x9bf3b5, transparent: true, opacity: 0.39, depthWrite: false })
  );
  rig.add(wire);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.91, 1),
    new THREE.MeshBasicMaterial({ color: 0x90e7cf, wireframe: true, transparent: true, opacity: 0.2 })
  );
  rig.add(inner);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x95f5b4, transparent: true, opacity: 0.58,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const rings = [
    new THREE.Mesh(new THREE.TorusGeometry(2.17, 0.007, 3, 160), ringMaterial),
    new THREE.Mesh(new THREE.TorusGeometry(2.43, 0.005, 3, 160), ringMaterial.clone()),
    new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.004, 3, 160), ringMaterial.clone())
  ];
  rings[0].rotation.set(0.5, 0.28, 0.2);
  rings[1].rotation.set(1.08, -0.2, -0.22);
  rings[2].rotation.set(0.23, 1.1, 0.38);
  rings[1].material.opacity = 0.3;
  rings[2].material.opacity = 0.2;
  rings.forEach((ring) => rig.add(ring));

  const nodeCount = window.innerWidth < 700 ? 95 : 150;
  const positions = new Float32Array(nodeCount * 3);
  const seeds = [];
  for (let i = 0; i < nodeCount; i++) {
    const a = i * 2.399963229728653;
    const z = 1 - 2 * (i + 0.5) / nodeCount;
    const radius = 2.75 + (i % 7) * 0.11;
    const planar = Math.sqrt(1 - z * z);
    const point = new THREE.Vector3(
      Math.cos(a) * planar * radius,
      z * radius,
      Math.sin(a) * planar * radius
    );
    positions.set([point.x, point.y, point.z], i * 3);
    seeds.push(point);
  }
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({
    color: 0xc7fa70, size: window.innerWidth < 700 ? 0.035 : 0.043,
    sizeAttenuation: true, transparent: true, opacity: 0.87,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  rig.add(points);

  const links = [];
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length && j < i + 17; j++) {
      if (seeds[i].distanceToSquared(seeds[j]) < 1.18) {
        links.push(seeds[i].x, seeds[i].y, seeds[i].z, seeds[j].x, seeds[j].y, seeds[j].z);
      }
    }
  }
  const linksGeometry = new THREE.BufferGeometry();
  linksGeometry.setAttribute('position', new THREE.Float32BufferAttribute(links, 3));
  const networkLines = new THREE.LineSegments(linksGeometry, new THREE.LineBasicMaterial({
    color: 0x83dcca, transparent: true, opacity: 0.21, depthWrite: false
  }));
  rig.add(networkLines);

  const glow = new THREE.PointLight(0xb6f687, 14, 12);
  glow.position.set(2.8, 2.1, 4);
  scene.add(glow);
  scene.add(new THREE.AmbientLight(0x7db5a0, 1.1));

  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let visible = true;
  let lastFrame = 0;
  const clock = new THREE.Clock();

  host.addEventListener('pointermove', (event) => {
    if (reducedMotion) return;
    const rect = host.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  }, { passive: true });
  host.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 420 ? 10.3 : 8.8;
    camera.updateProjectionMatrix();
    if (reducedMotion) renderer.render(scene, camera);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  function frame(time) {
    if (!visible) return;
    if (time - lastFrame < (window.innerWidth < 700 ? 30 : 16)) return;
    lastFrame = time;
    const t = clock.getElapsedTime();
    currentX += (pointerX - currentX) * 0.035;
    currentY += (pointerY - currentY) * 0.035;
    rig.rotation.y = t * 0.10 + currentX * 0.42;
    rig.rotation.x = Math.sin(t * 0.22) * 0.06 + currentY * 0.27;
    rig.rotation.z = Math.cos(t * 0.17) * 0.025;
    inner.rotation.y = -t * 0.15;
    rings[0].rotation.z = 0.2 + t * 0.075;
    rings[1].rotation.x = 1.08 - t * 0.05;
    rings[2].rotation.y = 1.1 + t * 0.032;
    rig.position.y = Math.sin(t * 0.65) * 0.075;
    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting && !document.hidden;
      renderer.setAnimationLoop(visible ? frame : null);
    }, { threshold: 0.01 });
    visibilityObserver.observe(host);
    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden && host.getBoundingClientRect().bottom > 0 &&
        host.getBoundingClientRect().top < window.innerHeight;
      renderer.setAnimationLoop(visible ? frame : null);
    });
  }

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    coreGeometry.dispose();
    wire.geometry.dispose();
    inner.geometry.dispose();
    inner.material.dispose();
    pointsGeometry.dispose();
    points.material.dispose();
    linksGeometry.dispose();
    networkLines.material.dispose();
    rings.forEach((ring) => { ring.geometry.dispose(); ring.material.dispose(); });
    core.material.dispose();
    wire.material.dispose();
    renderer.dispose();
  }, { once: true });
}

if ('IntersectionObserver' in window) {
  const heroArt = document.querySelector('.hero-art');
  const bootObserver = new IntersectionObserver((entries, observer) => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    initNetworkScene();
  }, { rootMargin: '250px' });
  if (heroArt) bootObserver.observe(heroArt);
} else {
  initNetworkScene();
}
