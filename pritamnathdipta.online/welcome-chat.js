// A small, local welcome conversation. Quick replies never leave the browser.
export function initWelcomeChat() {
  if (document.querySelector('.welcome-chat')) return;

  const widget = document.createElement('div');
  widget.className = 'welcome-chat';
  widget.innerHTML = `
    <nav class="welcome-chat-menu" id="welcome-chat-menu" aria-label="Contact options" hidden>
      <button class="welcome-chat-menu-item" type="button" data-contact="message">
        <span class="welcome-chat-menu-icon welcome-chat-menu-icon-message" aria-hidden="true">✦</span>
        <span>Message</span>
      </button>
      <a class="welcome-chat-menu-item" href="https://wa.me/8801318882755" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (opens in a new tab)">
        <span class="welcome-chat-menu-icon welcome-chat-menu-icon-whatsapp" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.2 11.5a8.2 8.2 0 0 1-12 7.2L4 20l1.3-4.1a8.2 8.2 0 1 1 14.9-4.4Z"/><path d="M9 8.8c.4 2.4 2.1 4.1 4.5 5l1.4-1.1 2 1.1c-.4 1.5-1.4 2.2-2.8 2.1-3.9-.4-6.8-3.3-7.1-7.1-.1-1.4.7-2.4 2.1-2.7Z"/></svg>
        </span>
        <span>WhatsApp</span>
      </a>
      <a class="welcome-chat-menu-item" href="mailto:redxpritam@gmail.com" aria-label="Send an email">
        <span class="welcome-chat-menu-icon welcome-chat-menu-icon-mail" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
        </span>
        <span>Email</span>
      </a>
    </nav>
    <button class="welcome-chat-launcher" type="button" aria-label="Open contact options" aria-expanded="false" aria-controls="welcome-chat-menu" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8c-1.3 0-2.5-.3-3.6-.8L4 20l1.3-4.4A8 8 0 1 1 20 11.5Z"/><path stroke-linecap="round" d="M8.5 11.5h.01m3.49 0h.01m3.49 0h.01" stroke-width="3"/></svg>
    </button>
    <section class="welcome-chat-card" role="region" aria-label="Welcome message from Pritam" hidden>
      <div class="welcome-chat-header">
        <span class="welcome-chat-avatar" aria-hidden="true"><span class="welcome-chat-online"></span></span>
        <div class="welcome-chat-identity">
          <strong>Pritam Nath Dipta</strong>
          <span>Automated welcome</span>
        </div>
        <span class="welcome-chat-now">just now</span>
        <button class="welcome-chat-close" type="button" aria-label="Close welcome message">×</button>
      </div>
      <div class="welcome-chat-body">
        <div class="welcome-chat-messages" aria-live="polite">
          <p class="welcome-chat-bubble">Hi there! 👋</p>
          <p class="welcome-chat-bubble">I really appreciate you exploring my site.</p>
          <p class="welcome-chat-bubble">How are you finding it so far?</p>
        </div>
        <div class="welcome-chat-replies">
          <span class="welcome-chat-prompt">↪ Pick a quick reply</span>
          <div class="welcome-chat-options">
            <button type="button" data-reply="love">Loving it</button>
            <button type="button" data-reply="nice">It’s nice</button>
            <button type="button" data-reply="browse">Just looking around</button>
          </div>
        </div>
      </div>
    </section>`;
  document.body.append(widget);

  const card = widget.querySelector('.welcome-chat-card');
  const launcher = widget.querySelector('.welcome-chat-launcher');
  const menu = widget.querySelector('.welcome-chat-menu');
  const messageOption = widget.querySelector('[data-contact="message"]');
  const closeButton = widget.querySelector('.welcome-chat-close');
  const messages = widget.querySelector('.welcome-chat-messages');
  const options = widget.querySelector('.welcome-chat-replies');
  const replies = {
    love: {
      label: 'Loving it',
      answer: 'That means a lot—thank you! Have a project or an idea you’d like to discuss?',
      action: 'Get in touch',
      target: 'contact',
    },
    nice: {
      label: 'It’s nice',
      answer: 'Thanks for taking a look! I’d be glad to hear your thoughts or questions.',
      action: 'Get in touch',
      target: 'contact',
    },
    browse: {
      label: 'Just looking around',
      answer: 'Enjoy exploring! My projects are a good place to start.',
      action: 'View projects',
      target: 'projects',
    },
  };

  const open = (focusClose = false) => {
    menu.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.hidden = true;
    card.hidden = false;
    if (focusClose) closeButton.focus();
  };
  const close = () => {
    card.hidden = true;
    menu.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.hidden = false;
    launcher.focus();
  };

  const closeMenu = () => {
    menu.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
  };
  launcher.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    launcher.setAttribute('aria-expanded', String(!menu.hidden));
  });
  messageOption.addEventListener('click', () => open(true));
  closeButton.addEventListener('click', close);
  widget.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!card.hidden) close();
    else if (!menu.hidden) {
      closeMenu();
      launcher.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!widget.contains(event.target)) closeMenu();
  });
  options.addEventListener('click', event => {
    const button = event.target.closest('button[data-reply]');
    if (!button || options.hidden) return;
    const reply = replies[button.dataset.reply];
    if (!reply) return;

    const visitor = document.createElement('p');
    visitor.className = 'welcome-chat-bubble welcome-chat-bubble-user';
    visitor.textContent = reply.label;
    const answer = document.createElement('p');
    answer.className = 'welcome-chat-bubble welcome-chat-bubble-answer';
    answer.tabIndex = -1;
    answer.textContent = reply.answer;
    const action = document.createElement('a');
    action.className = 'welcome-chat-action';
    action.href = `#${reply.target}`;
    action.textContent = `${reply.action} →`;
    messages.append(visitor, answer, action);
    options.hidden = true;
    answer.focus({ preventScroll: true });
    card.querySelector('.welcome-chat-body').scrollTop = card.querySelector('.welcome-chat-body').scrollHeight;
  });
  messages.addEventListener('click', event => {
    const action = event.target.closest('.welcome-chat-action');
    if (!action) return;
    const section = document.querySelector(action.getAttribute('href'));
    if (!section) return;
    event.preventDefault();
    const reveal = section.parentElement;
    if (reveal.tagName !== 'MAIN') {
      Object.assign(reveal.style, { transition: 'none', transform: 'none', opacity: '1', filter: 'none' });
    }
    section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    close();
  });

  const showWelcome = () => {
    // Keep the first mobile view clear; the contact options remain one tap away.
    if (matchMedia('(max-width: 480px)').matches) launcher.hidden = false;
    else open();
  };
  setTimeout(() => {
    if (!document.hidden) showWelcome();
    else document.addEventListener('visibilitychange', function showWhenVisible() {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', showWhenVisible);
      showWelcome();
    });
  }, 5000);
}
