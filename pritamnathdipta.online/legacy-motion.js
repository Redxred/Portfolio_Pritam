// Enhancements around the original layout; the compiled site's content stays intact.
import { enhanceSite } from './site-fixes.js';
import { initWelcomeChat } from './welcome-chat.js';
import { initSecurityMotion } from './security-motion.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const saveData = navigator.connection?.saveData;
initWelcomeChat();

function enhanceExistingSite() {
  const hero = document.querySelector('main section:first-child');
  const footer = document.querySelector('footer');
  if (!hero || !footer || hero.classList.contains('legacy-motion-hero')) return false;

  hero.classList.add('legacy-motion-hero');
  const heroObserver = new IntersectionObserver(([entry]) => {
    hero.classList.toggle('is-in-view', entry.isIntersecting);
  });
  heroObserver.observe(hero);
  footer.classList.add('legacy-motion-footer');
  enhanceFooter(footer);
  enhanceThemeControls();
  enhanceSite();

  document.querySelectorAll('#projects .grid > .group, #services .grid > .group, #research .space-y-6 > .group')
    .forEach(card => card.classList.add('legacy-motion-card'));
  enhanceSpecialtyCards();
  enhanceProjectCards();
  enhanceServiceCards();
  initSecurityMotion();

  scheduleHeroMotion(hero);
  return true;
}

function enhanceSpecialtyCards() {
  const grid = document.querySelector('#about .grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll(':scope > .group')];
  cards.forEach((card, index) => {
    card.classList.add('portfolio-specialty-card');
    card.style.setProperty('--specialty-order', index);
  });
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;

  const revealed = new WeakSet();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const card = entry.target;
      card.classList.toggle('is-in-view', entry.isIntersecting);
      if (!entry.isIntersecting || revealed.has(card)) continue;
      revealed.add(card);
      if (reducedMotion.matches || !card.animate) {
        card.classList.remove('specialty-waiting');
        continue;
      }
      const animation = card.animate([
        { opacity: 0, transform: 'translate3d(0, 24px, 0) scale(.975)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ], {
        duration: 720,
        delay: (Number(card.style.getPropertyValue('--specialty-order')) % 2) * 110,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'both',
      });
      card.classList.remove('specialty-waiting');
      animation.finished.then(() => animation.cancel(), () => animation.cancel());
    }
  }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
  cards.forEach(card => {
    card.classList.add('specialty-waiting');
    observer.observe(card);
  });
}

function enhanceServiceCards() {
  document.querySelectorAll('#services .grid > .group').forEach((card, index) => {
    const title = card.querySelector('h3');
    if (!title) return;
    card.classList.add('portfolio-service-card');
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    title.id = `service-option-${index + 1}`;
    card.setAttribute('aria-labelledby', title.id);
  });
}

function enhanceProjectCards() {
  const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('#projects .grid > .group').forEach(card => {
    card.classList.add('portfolio-project-card');
    if (!precisePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    let point;
    card.addEventListener('pointermove', event => {
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (reducedMotion.matches || !precisePointer.matches) return;
        const bounds = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height));
        card.style.setProperty('--project-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--project-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--project-tilt-x', `${((.5 - y) * 5).toFixed(2)}deg`);
        card.style.setProperty('--project-tilt-y', `${((x - .5) * 5).toFixed(2)}deg`);
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      card.style.removeProperty('--project-x');
      card.style.removeProperty('--project-y');
      card.style.removeProperty('--project-tilt-x');
      card.style.removeProperty('--project-tilt-y');
    });
  });
}

function enhanceThemeControls() {
  const header = document.querySelector('header');
  const sync = () => {
    const light = document.documentElement.classList.contains('light');
    header?.querySelectorAll('button').forEach(button => {
      if (!button.querySelector('.lucide-sun, .lucide-moon')) return;
      const label = `Switch to ${light ? 'dark' : 'light'} mode`;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f8fafc' : '#14181f');
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  if (header) observer.observe(header, { childList: true, subtree: true });
  sync();
}

function enhanceFooter(footer) {
  const container = footer.firstElementChild;
  const row = container.firstElementChild;
  row.classList.add('legacy-footer-row');
  const socials = row.children[1];
  socials?.classList.add('legacy-footer-socials');
  socials?.querySelectorAll('a[aria-label]').forEach(link => {
    const label = document.createElement('span');
    label.className = 'legacy-footer-social-label';
    label.textContent = link.getAttribute('aria-label');
    link.append(label);
  });

  const closing = document.createElement('div');
  closing.className = 'legacy-footer-showcase';
  closing.innerHTML = `
    <div class="legacy-footer-copy">
      <p class="legacy-footer-kicker"><span aria-hidden="true"></span> WHAT'S NEXT?</p>
      <h2>Let's make your next <em>move count.</em></h2>
      <p>Security, software quality, and dependable tech support for the things you're building.</p>
      <div class="legacy-footer-actions">
        <a class="legacy-footer-cta" href="mailto:pritamnathdipta@gmail.com?subject=Let%27s%20work%20together">Start a conversation <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a>
        <a class="legacy-footer-secondary" href="/cv.html">Explore my CV <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
      </div>
    </div>
    <div class="legacy-footer-visual" aria-hidden="true">
      <div class="legacy-footer-orbit"></div>
      <div class="legacy-footer-orbit legacy-footer-orbit-inner"></div>
      <span class="legacy-footer-spark legacy-footer-spark-one"></span>
      <span class="legacy-footer-spark legacy-footer-spark-two"></span>
      <img src="/assets/footer-hacker-cartoon.png" width="415" height="362" loading="lazy" alt="">
      <span class="legacy-footer-visual-caption">IDEAS INTO IMPACT <span>↗</span></span>
    </div>`;
  const lower = document.createElement('div');
  lower.className = 'legacy-footer-lower';
  lower.innerHTML = `
    <div class="legacy-footer-brand"><span class="legacy-footer-monogram" aria-hidden="true">PN<span>.</span></span><span><strong>Pritam Nath Dipta</strong><small>Cybersecurity · Software QA · IT Support</small></span></div>
    <nav class="legacy-footer-nav" aria-label="Footer navigation"><a href="#about">About</a><a href="#projects">Projects</a><a href="#research">Research</a><a href="/blog.html">Blog</a><a href="#contact">Contact</a></nav>`;
  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'legacy-footer-back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 14 6-6 6 6"/><path d="M12 8v11"/></svg><span>Back to top</span>';
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  lower.append(backToTop);
  const signature = document.createElement('div');
  signature.className = 'legacy-footer-signature';
  signature.setAttribute('role', 'img');
  signature.setAttribute('aria-label', 'Pritam Nath Dipta');
  signature.innerHTML = `
    <svg viewBox="0 0 1100 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="footer-signature-colors" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1100" y2="0">
          <stop offset="0%" stop-color="#eab308"/><stop offset="25%" stop-color="#ef4444"/>
          <stop offset="50%" stop-color="#3b82f6"/><stop offset="75%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <radialGradient id="footer-signature-reveal" gradientUnits="userSpaceOnUse" cx="550" cy="140" r="220">
          <stop offset="0%" stop-color="white"/><stop offset="65%" stop-color="white"/>
          <stop offset="100%" stop-color="black"/>
        </radialGradient>
        <mask id="footer-signature-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" mask-type="luminance" x="0" y="0" width="1100" height="280">
          <rect width="1100" height="280" fill="url(#footer-signature-reveal)"/>
        </mask>
      </defs>
      <g class="footer-signature-base"><text x="550" y="111">Pritam Nath</text><text x="550" y="245">Dipta</text></g>
      <g class="footer-signature-trace"><text x="550" y="111">Pritam Nath</text><text x="550" y="245">Dipta</text></g>
      <g class="footer-signature-color" mask="url(#footer-signature-mask)"><text x="550" y="111">Pritam Nath</text><text x="550" y="245">Dipta</text></g>
    </svg>`;
  container.prepend(closing, signature, lower);
  initFooterSignature(signature);

  const entranceObserver = new IntersectionObserver(([entry]) => {
    footer.classList.toggle('is-in-view', entry.isIntersecting);
    if (entry.intersectionRatio >= .15) footer.classList.add('is-visible');
  }, { threshold: [0, .15] });
  entranceObserver.observe(footer);

  if (reducedMotion.matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let currentX = footer.clientWidth / 2;
  let currentY = 0;
  let targetX = currentX;
  let targetY = currentY;
  let frame = 0;

  const settleGlow = () => {
    if (document.hidden || reducedMotion.matches) { frame = 0; return; }
    currentX += (targetX - currentX) * .15;
    currentY += (targetY - currentY) * .15;
    footer.style.setProperty('--motion-x', `${currentX.toFixed(1)}px`);
    footer.style.setProperty('--motion-y', `${currentY.toFixed(1)}px`);
    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .5) {
      frame = requestAnimationFrame(settleGlow);
    } else {
      frame = 0;
    }
  };
  const queueGlow = () => { if (!frame) frame = requestAnimationFrame(settleGlow); };

  footer.addEventListener('pointerenter', () => {
    footer.classList.add('is-pointer-active');
  });
  footer.addEventListener('pointermove', event => {
    const bounds = footer.getBoundingClientRect();
    targetX = event.clientX - bounds.left;
    targetY = event.clientY - bounds.top;
    queueGlow();
  }, { passive: true });
  footer.addEventListener('pointerleave', () => {
    footer.classList.remove('is-pointer-active');
    targetX = footer.clientWidth / 2;
    targetY = 0;
    queueGlow();
  });

}

function initFooterSignature(signature) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    signature.classList.add('is-visible');
    observer.disconnect();
  }, { threshold: .2 });
  observer.observe(signature);

  if (reducedMotion.matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const reveal = signature.querySelector('#footer-signature-reveal');
  let x = 550;
  let y = 140;
  let targetX = x;
  let targetY = y;
  let frame = 0;
  const move = () => {
    if (document.hidden || reducedMotion.matches) { frame = 0; return; }
    x += (targetX - x) * .24;
    y += (targetY - y) * .24;
    reveal.setAttribute('cx', x.toFixed(1));
    reveal.setAttribute('cy', y.toFixed(1));
    frame = Math.abs(targetX - x) + Math.abs(targetY - y) > .5 ? requestAnimationFrame(move) : 0;
  };
  const pointAt = event => {
    const rect = signature.querySelector('svg').getBoundingClientRect();
    targetX = Math.max(0, Math.min(1100, (event.clientX - rect.left) * 1100 / rect.width));
    targetY = Math.max(0, Math.min(280, (event.clientY - rect.top) * 280 / rect.height));
    if (!frame) frame = requestAnimationFrame(move);
  };
  signature.addEventListener('pointerenter', event => {
    signature.classList.add('is-hovered');
    pointAt(event);
  });
  signature.addEventListener('pointermove', pointAt, { passive: true });
  signature.addEventListener('pointerleave', () => {
    signature.classList.remove('is-hovered');
    targetX = 550;
    targetY = 140;
    if (!frame) frame = requestAnimationFrame(move);
  });
}

function scheduleHeroMotion(hero) {
  if (reducedMotion.matches || saveData) return;
  const load = () => {
    const start = () => {
      if (reducedMotion.matches || saveData) return;
      const canvas = hero.querySelector('.hero-flow-canvas');
      if (!canvas) return;
      const scene = matchMedia('(max-width: 767px)').matches
        ? './assets/hero-flow-mobile.js'
        : './assets/hero-flow.js';
      import(scene).then(module => module.initHeroFlow(canvas)).catch(() => {});
    };
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 100);
  };
  const app = hero.closest('.min-h-screen.transition-opacity');
  if (!app?.classList.contains('opacity-0')) { load(); return; }
  const observer = new MutationObserver(() => {
    if (app.classList.contains('opacity-0')) return;
    observer.disconnect();
    load();
  });
  observer.observe(app, { attributes: true, attributeFilter: ['class'] });
}

const syncPageVisibility = () => document.documentElement.classList.toggle('legacy-page-hidden', document.hidden);
document.addEventListener('visibilitychange', syncPageVisibility);
syncPageVisibility();

if (!enhanceExistingSite()) {
  const observer = new MutationObserver(() => {
    if (enhanceExistingSite()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
