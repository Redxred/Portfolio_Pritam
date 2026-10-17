// Enhancements around the original layout; the compiled site's content stays intact.
import { enhanceSite } from './site-fixes.js';
import { initWelcomeChat } from './welcome-chat.js';
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

  scheduleHeroMotion(hero);
  return true;
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
  container.firstElementChild.classList.add('legacy-footer-row');
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
  name.append(accessibleName, letters);
  container.prepend(name);

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
    letters.style.setProperty('--name-rx', `${pointerActive ? (0.5 - currentY / footerHeight) * 5 : 0}deg`);
    letters.style.setProperty('--name-ry', `${pointerActive ? (currentX / footerWidth - .5) * 8 : 0}deg`);
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

  footer.querySelectorAll('a').forEach(link => {
    link.addEventListener('pointermove', event => {
      const bounds = link.getBoundingClientRect();
      link.style.setProperty('--link-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 4}px`);
      link.style.setProperty('--link-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 4}px`);
    }, { passive: true });
    link.addEventListener('pointerleave', () => {
      link.style.removeProperty('--link-x');
      link.style.removeProperty('--link-y');
    });
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
