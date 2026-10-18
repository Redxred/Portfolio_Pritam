// Decorative security/QA motion; existing content, controls and layout keep ownership.
export function initSecurityMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  document.documentElement.classList.toggle('security-save-data', saveData);
  const labels = {
    about: '01 / expertise', services: '02 / capabilities', projects: '03 / fieldwork',
    research: '04 / research', testimonials: '05 / feedback', contact: '06 / connect',
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('security-in-view', entry.isIntersecting);
    }
  }, { threshold: 0, rootMargin: '40px' });

  document.querySelectorAll('main > section, main section[id]').forEach(section => {
    if (section.classList.contains('security-section')) return;
    section.classList.add('security-section');
    observer.observe(section);
    const atmosphere = document.createElement('div');
    atmosphere.className = 'security-atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'security-coordinate';
    label.textContent = labels[section.id] || '00 / security · quality · reliability';
    atmosphere.append(label);
    if (section.classList.contains('legacy-motion-hero')) {
      const code = document.createElement('span');
      code.className = 'security-code';
      code.textContent = '// think like an attacker\n// test like a user\n\n> explore(edge_cases)\n> question(assumptions)\n> build(confidence)';
      atmosphere.append(code);
      // Hero already owns a backdrop; insert this texture above its canvas.
      section.querySelector('.hero-backdrop')?.append(atmosphere);
    } else section.prepend(atmosphere);
  });

  document.querySelectorAll('main h2').forEach(heading => heading.classList.add('security-heading'));
  const technologyHeading = [...document.querySelectorAll('#about h3')]
    .find(heading => heading.textContent.trim() === 'Core Technologies');
  const technologies = technologyHeading?.parentElement;
  if (technologies) {
    technologies.classList.add('core-technologies');
    technologies.querySelectorAll(':scope > .grid > div').forEach((card, index) => {
      card.classList.add('core-tech-card');
      card.style.setProperty('--tech-phase', `${index * -.48}s`);
    });
    observer.observe(technologies);
  }
  document.querySelectorAll('.legacy-motion-card, .portfolio-specialty-card').forEach(card => {
    card.classList.add('security-card');
    const signal = document.createElement('span');
    signal.className = 'security-card-signal';
    signal.setAttribute('aria-hidden', 'true');
    card.append(signal);
  });

  document.querySelectorAll('header :is(a, button), main :is(a, button), footer :is(a, button)').forEach(control => {
    if (!control.textContent.trim() || control.closest('#testimonials, .welcome-chat-panel')) return;
    const display = getComputedStyle(control).display;
    if (!['flex', 'inline-flex'].includes(display) && control.tagName !== 'BUTTON') return;
    control.classList.add('security-action');
    const sheen = document.createElement('span');
    sheen.className = 'security-action-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    control.append(sheen);
  });

  // A single brief reveal per heading, with no text replacement or layout shift.
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal.unobserve(entry.target);
      if (reduced.matches || saveData || !entry.target.animate) continue;
      const animation = entry.target.animate([
        { opacity: .55, filter: 'blur(2px)', transform: 'translateY(7px)' },
        { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' },
      ], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
      const stop = () => animation.cancel();
      reduced.addEventListener('change', stop, { once: true });
      animation.finished.then(() => reduced.removeEventListener('change', stop), () => reduced.removeEventListener('change', stop));
    }
  }, { threshold: .5 });
  document.querySelectorAll('.security-heading').forEach(heading => reveal.observe(heading));
}
