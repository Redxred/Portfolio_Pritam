const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function enhanceSite() {
  const main = document.querySelector('main');
  main.id = 'main-content';
  main.tabIndex = -1;
  document.querySelector('footer')?.setAttribute('role', 'contentinfo');
  const skip = document.createElement('a');
  skip.className = 'portfolio-skip-link';
  skip.href = '#main-content';
  skip.textContent = 'Skip to content';
  document.body.prepend(skip);

  const header = document.querySelector('header');
  const labelControls = () => {
    const hidden = header.classList.contains('opacity-0');
    header.inert = hidden;
    header.setAttribute('aria-hidden', String(hidden));
    const menu = header.querySelector('button:has(.lucide-menu), button:has(.lucide-x)');
    const panel = header.querySelector('nav > div[class~="border-t"]');
    if (panel) panel.id = 'mobile-navigation';
    if (menu) {
      menu.setAttribute('aria-label', panel ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-expanded', String(Boolean(panel)));
      if (panel) menu.setAttribute('aria-controls', 'mobile-navigation');
      else menu.removeAttribute('aria-controls');
    }
    document.querySelectorAll('button').forEach(button => {
      if (button.querySelector('.lucide-play, .lucide-pause') && button.title) button.setAttribute('aria-label', button.title);
      if (button.getAttribute('aria-label') || button.textContent.trim()) return;
      let label = button.title;
      if (button.querySelector('.lucide-chevron-down')) label = 'Scroll to projects';
      if (button.querySelector('.lucide-arrow-up')) label = 'Back to top';
      if (button.closest('#testimonials')) {
        if (button.querySelector('.lucide-chevron-left')) label = 'Previous review';
        if (button.querySelector('.lucide-chevron-right')) label = 'Next review';
        if (!button.querySelector('svg')) {
          const dots = [...document.querySelectorAll('#testimonials button')].filter(b => !b.querySelector('svg') && !b.textContent.trim());
          label = `Go to review ${dots.indexOf(button) + 1}`;
        }
      }
      if (label) button.setAttribute('aria-label', label);
    });
    document.querySelectorAll('a[aria-label="Twitter"]:not([href])').forEach(link => {
      link.setAttribute('role', 'link');
      link.setAttribute('aria-disabled', 'true');
      link.tabIndex = -1;
      link.title = 'Twitter profile is not configured';
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => link.removeAttribute('target'));
  };
  const observer = new MutationObserver(labelControls);
  observer.observe(header, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  observer.observe(document.querySelector('#testimonials'), { childList: true, subtree: true });
  labelControls();
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = header.querySelector('button[aria-expanded="true"]');
    if (menu) { menu.click(); menu.focus(); }
  });
  enhanceContact();
}

function enhanceContact() {
  const form = document.querySelector('#contact form');
  const fields = [...form.querySelectorAll('input, textarea')];
  const settings = [
    { name: 'name', autocomplete: 'name', maxLength: 80 },
    { name: 'email', autocomplete: 'email', maxLength: 254 },
    { name: 'message', autocomplete: 'off', maxLength: 2000 },
  ];
  fields.forEach((field, index) => {
    Object.assign(field, settings[index]);
    field.id = `contact-${settings[index].name}`;
    field.parentElement.querySelector('label').htmlFor = field.id;
    field.addEventListener('input', () => field.setCustomValidity(''));
  });
  const status = document.createElement('p');
  status.className = 'text-sm text-muted-foreground';
  status.id = 'contact-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const notice = 'Prepare a draft, then send it from your email app. This form does not send messages directly.';
  status.textContent = notice;
  form.append(status);
  form.setAttribute('aria-describedby', status.id);
  fields.forEach(field => field.addEventListener('input', () => { status.textContent = notice; }));

  addEventListener('portfolio:contact-submit', () => {
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const name = values.name.trim().replace(/[\u0000-\u001f\u007f]/g, ' ');
    const email = values.email.trim();
    const message = values.message.trim();
    if (email.length > 254) {
      fields[1].setCustomValidity('Enter an email address within 254 characters.');
      fields[1].reportValidity();
      return;
    }
    for (const [value, index] of [[name, 0], [message, 2]]) {
      if (!value || value.length > settings[index].maxLength) {
        fields[index].setCustomValidity(`Enter ${index === 0 ? 'your name' : 'a message'} within ${settings[index].maxLength} characters.`);
        fields[index].reportValidity();
        return;
      }
    }
    // No form values are inserted as HTML or sent to a server. Fixed scheme and
    // recipient plus encoded subject/body prevent URL and header injection.
    const subject = `Website message from ${name}`;
    const body = `Name: ${name}\nReply email: ${email}\n\n${message}`;
    const draft = document.createElement('a');
    draft.href = `mailto:redxpritam@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    draft.className = 'text-primary underline';
    draft.textContent = 'Open email draft';
    status.replaceChildren(document.createTextNode('Your draft is ready. '), draft, document.createTextNode(' and send it from your email app. Your message has not been sent yet.'));
  });

  for (const [eventName, kind] of [['portfolio:request-project', 'project'], ['portfolio:request-paper', 'paper']]) {
    addEventListener(eventName, event => {
      if (typeof event.detail !== 'string') return;
      const title = event.detail.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300);
      const field = fields[2];
      const request = `I'd like more information about the ${kind}: ${title}.`;
      const value = [field.value.trim(), request].filter(Boolean).join('\n\n').slice(0, 2000);
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.setCustomValidity('');
      const section = document.querySelector('#contact');
      Object.assign(section.parentElement.style, { transition: 'none', transform: 'none', opacity: '1', filter: 'none' });
      section.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      field.focus({ preventScroll: true });
    });
  }
}
