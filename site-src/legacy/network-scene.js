import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DynamicDrawUsage, NormalBlending,
  LineBasicMaterial, LineSegments, PerspectiveCamera, Points, PointsMaterial, Scene, WebGLRenderer,
} from 'three';

// One bounded scene replaces both previous particle loops. All coordinates are
// screen pixels so the existing background retains its scale and density.
export function initNetwork(canvas) {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference.matches || navigator.connection?.saveData) return;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    canvas.dataset.motionState = 'unavailable';
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 1, 8000);
  const maxCount = 60;
  const maxSegments = maxCount * 4;
  const positions = new Float32Array(maxCount * 3);
  const velocities = new Float32Array(maxCount * 2);
  const linePositions = new Float32Array(maxSegments * 6);
  const lineColors = new Float32Array(maxSegments * 6);
  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new BufferAttribute(linePositions, 3).setUsage(DynamicDrawUsage));
  lineGeometry.setAttribute('color', new BufferAttribute(lineColors, 3).setUsage(DynamicDrawUsage));

  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 16;
  const context = dotCanvas.getContext('2d');
  const glow = context.createRadialGradient(8, 8, 1, 8, 8, 8);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(.45, '#ffffff');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 16, 16);
  const dotTexture = new CanvasTexture(dotCanvas);
  const pointMaterial = new PointsMaterial({
    color: 0x00e6ed, map: dotTexture, size: 3.2, sizeAttenuation: false,
    transparent: true, opacity: .57, depthWrite: false, blending: AdditiveBlending,
  });
  const lineMaterial = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .24, depthWrite: false });
  const points = new Points(pointGeometry, pointMaterial);
  const lines = new LineSegments(lineGeometry, lineMaterial);
  points.frustumCulled = lines.frustumCulled = false;
  scene.add(points, lines);

  let width = 1;
  let height = 1;
  let count = 16;
  let frameDuration = 1000 / 30;
  let frame = 0;
  let lastRender = 0;
  let disposed = false;
  const pointer = { x: 0, y: 0, active: false };
  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    const smallScreen = width < 768;
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    count = Math.min(smallScreen || lowPower ? 30 : maxCount, Math.max(16, Math.floor(width * height / 26000)));
    frameDuration = 1000 / (smallScreen || lowPower ? 24 : 30);
    canvas.dataset.particleCount = String(count);
    camera.aspect = width / height;
    camera.position.z = height / (2 * Math.tan(25 * Math.PI / 180));
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - .5) * width;
      positions[i * 3 + 1] = (Math.random() - .5) * height;
      positions[i * 3 + 2] = (Math.random() - .5) * 70;
      velocities[i * 2] = (Math.random() - .5) * 19;
      velocities[i * 2 + 1] = (Math.random() - .5) * 19;
    }
    pointGeometry.setDrawRange(0, count);
  };
  resize();

  let lightTheme;
  const networkColor = new Color();
  const pointerColor = new Color();
  const writeSegment = (offset, a, b, strength, purple = false) => {
    for (let k = 0; k < 3; k++) {
      linePositions[offset + k] = a[k];
      linePositions[offset + 3 + k] = b[k];
    }
    const color = purple ? pointerColor : networkColor;
    // Fade into the current surface instead of putting neon lines on white.
    const fade = lightTheme ? 1 - strength : 0;
    lineColors[offset] = lineColors[offset + 3] = color.r * strength + fade;
    lineColors[offset + 1] = lineColors[offset + 4] = color.g * strength + fade;
    lineColors[offset + 2] = lineColors[offset + 5] = color.b * strength + fade;
  };
  // Reuse these vectors and buffers each frame instead of allocating objects.
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const drawFrame = (dt = 0) => {
    for (let i = 0; i < count; i++) {
      const p = i * 3;
      positions[p] += velocities[i * 2] * dt;
      positions[p + 1] += velocities[i * 2 + 1] * dt;
      if (Math.abs(positions[p]) > width / 2) velocities[i * 2] *= -1;
      if (Math.abs(positions[p + 1]) > height / 2) velocities[i * 2 + 1] *= -1;
    }
    let segments = 0;
    let pointerLinks = 0;
    for (let i = 0; i < count; i++) {
      const p = i * 3;
      a[0] = positions[p]; a[1] = positions[p + 1]; a[2] = positions[p + 2];
      let connections = 0;
      for (let j = i + 1; j < count && connections < 3; j++) {
        const q = j * 3;
        const dx = a[0] - positions[q];
        const dy = a[1] - positions[q + 1];
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > 22500) continue;
        b[0] = positions[q]; b[1] = positions[q + 1]; b[2] = positions[q + 2];
        writeSegment(segments++ * 6, a, b, 1 - Math.sqrt(distanceSquared) / 150);
        connections++;
      }
      if (pointer.active && pointerLinks < 5) {
        const dx = a[0] - pointer.x;
        const dy = a[1] - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 40000) {
          b[0] = pointer.x; b[1] = pointer.y; b[2] = 0;
          writeSegment(segments++ * 6, a, b, 1 - Math.sqrt(distanceSquared) / 200, true);
          pointerLinks++;
        }
      }
    }
    scene.rotation.y += ((pointer.active ? pointer.x / width * .025 : 0) - scene.rotation.y) * .06;
    scene.rotation.x += ((pointer.active ? -pointer.y / height * .025 : 0) - scene.rotation.x) * .06;
    pointGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;
    lineGeometry.setDrawRange(0, segments * 2);
    renderer.render(scene, camera);
  };

  const render = time => {
    if (disposed || document.hidden || motionPreference.matches) {
      frame = 0;
      canvas.dataset.motionState = 'paused';
      return;
    }
    frame = requestAnimationFrame(render);
    if (time - lastRender < frameDuration) return;
    const dt = Math.min((time - (lastRender || time)) / 1000, .065);
    lastRender = time;
    drawFrame(dt);
  };

  const syncTheme = () => {
    const nextLight = document.documentElement.classList.contains('light');
    if (nextLight === lightTheme) return;
    lightTheme = nextLight;
    networkColor.set(lightTheme ? 0x0a7182 : 0x00edf5);
    pointerColor.set(lightTheme ? 0x643ba4 : 0xb466ff);
    pointMaterial.color.set(lightTheme ? 0x0a7182 : 0x00e6ed);
    pointMaterial.blending = lightTheme ? NormalBlending : AdditiveBlending;
    pointMaterial.opacity = lightTheme ? .42 : .57;
    pointMaterial.needsUpdate = true;
    lineMaterial.opacity = lightTheme ? .16 : .24;
    canvas.dataset.motionTheme = lightTheme ? 'light' : 'dark';
    if (!document.hidden) drawFrame();
  };
  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  syncTheme();

  const syncPlayback = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastRender = 0;
    const playing = !document.hidden && !motionPreference.matches && !disposed;
    canvas.dataset.motionState = playing ? 'running' : 'paused';
    if (playing) frame = requestAnimationFrame(render);
  };
  const onPointer = event => {
    if (event.pointerType === 'touch') return;
    pointer.x = event.clientX - width / 2;
    pointer.y = height / 2 - event.clientY;
    pointer.active = true;
  };
  const leavePointer = () => { pointer.active = false; };
  canvas.dataset.motionEngine = 'threejs';
  canvas.dataset.particleLimit = String(maxCount);
  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', leavePointer);
  document.addEventListener('visibilitychange', syncPlayback);
  motionPreference.addEventListener('change', syncPlayback);
  syncPlayback();

  addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(frame);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onPointer);
    document.documentElement.removeEventListener('pointerleave', leavePointer);
    document.removeEventListener('visibilitychange', syncPlayback);
    motionPreference.removeEventListener('change', syncPlayback);
    themeObserver.disconnect();
    pointGeometry.dispose(); lineGeometry.dispose();
    pointMaterial.dispose(); lineMaterial.dispose(); dotTexture.dispose();
    renderer.dispose();
  }, { once: true });
}
