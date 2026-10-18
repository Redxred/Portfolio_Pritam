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
  closing.className = 'legacy-footer-content';
  closing.innerHTML = `
    <div class="legacy-footer-message">
      <p class="legacy-footer-eyebrow">The next step</p>
      <h2>Thanks for exploring my work.</h2>
      <p>If your next project needs thoughtful security, reliable testing, or practical IT support, let's talk.</p>
      <div class="legacy-footer-actions">
        <a class="legacy-footer-cta" href="#contact">Let's connect <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a>
        <a class="legacy-footer-secondary" href="/cv.html">View my CV <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
      </div>
    </div>
    <nav class="legacy-footer-nav" aria-label="Footer navigation">
      <p>Explore</p>
      <div class="legacy-footer-nav-links">
        <a href="#about"><span>01</span> About</a>
        <a href="#services"><span>02</span> Services</a>
        <a href="#projects"><span>03</span> Projects</a>
        <a href="#research"><span>04</span> Research</a>
        <a href="#contact"><span>05</span> Contact</a>
      </div>
    </nav>`;
  const name = document.createElement('p');
  name.className = 'legacy-footer-name';
  const accessibleName = document.createElement('span');
  accessibleName.className = 'sr-only';
  accessibleName.textContent = 'PRITAM';
  const letters = document.createElement('span');
  letters.className = 'legacy-footer-letters';
  letters.setAttribute('aria-hidden', 'true');
  [...'PRITAM'].forEach((letter, index) => {
    const span = document.createElement('span');
    span.className = 'legacy-footer-letter';
    span.style.setProperty('--letter', index);
    span.textContent = letter;
    letters.append(span);
  });
  const outline = letters.cloneNode(true);
  outline.className = 'legacy-footer-outline';
  outline.querySelectorAll('span').forEach(letter => { letter.className = 'legacy-footer-outline-letter'; });
  const subtitle = document.createElement('span');
  subtitle.className = 'legacy-footer-subtitle';
  subtitle.textContent = 'Security · Software QA · IT Support';
  name.append(accessibleName, outline, letters, subtitle);

  const sequence = document.createElement('div');
  sequence.className = 'security-footer-sequence';
  sequence.setAttribute('role', 'group');
  sequence.setAttribute('aria-label', 'My approach');
  ['Think', 'Test', 'Harden', 'Ship'].forEach((step, index) => {
    const item = document.createElement('span');
    item.style.setProperty('--step', index);
    const number = document.createElement('small');
    number.textContent = `0${index + 1}`;
    number.setAttribute('aria-hidden', 'true');
    item.append(number, document.createTextNode(step));
    sequence.append(item);
  });

  const topRow = document.createElement('div');
  topRow.className = 'legacy-footer-top-row';
  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'legacy-footer-back-to-top';
  backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 14 6-6 6 6"/><path d="M12 8v11"/></svg><span>Back to top</span>';
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  topRow.append(backToTop);
  container.prepend(closing, topRow, name, sequence);

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
  let pointerActive = false;
  let footerWidth = footer.clientWidth;
  let footerHeight = footer.clientHeight;

  const settleGlow = () => {
    if (document.hidden || reducedMotion.matches) { frame = 0; return; }
    currentX += (targetX - currentX) * .15;
    currentY += (targetY - currentY) * .15;
    footer.style.setProperty('--motion-x', `${currentX.toFixed(1)}px`);
    footer.style.setProperty('--motion-y', `${currentY.toFixed(1)}px`);
    letters.style.setProperty('--name-rx', `${pointerActive ? (0.5 - currentY / footerHeight) * 2 : 0}deg`);
    letters.style.setProperty('--name-ry', `${pointerActive ? (currentX / footerWidth - .5) * 3 : 0}deg`);
    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .5) {
      frame = requestAnimationFrame(settleGlow);
    } else {
      frame = 0;
    }
  };
  const queueGlow = () => { if (!frame) frame = requestAnimationFrame(settleGlow); };

  footer.addEventListener('pointerenter', () => {
    pointerActive = true;
    footer.classList.add('is-pointer-active');
  });
  footer.addEventListener('pointermove', event => {
    const bounds = footer.getBoundingClientRect();
    footerWidth = bounds.width;
    footerHeight = bounds.height;
    targetX = event.clientX - bounds.left;
    targetY = event.clientY - bounds.top;
    queueGlow();
  }, { passive: true });
  footer.addEventListener('pointerleave', () => {
    pointerActive = false;
    footer.classList.remove('is-pointer-active');
    targetX = footer.clientWidth / 2;
    targetY = 0;
    queueGlow();
  });

}

function scheduleHeroMotion(hero) {
  if (reducedMotion.matches || saveData) return;
  const load = () => {
    const start = () => {
      if (reducedMotion.matches || saveData) return;
      const canvas = hero.querySelector('.hero-flow-canvas');
      if (!canvas) return;
      import('./assets/hero-flow.js').then(module => module.initHeroFlow(canvas)).catch(() => {});
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
