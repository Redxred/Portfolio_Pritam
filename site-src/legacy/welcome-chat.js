// A small, local welcome conversation. Quick replies never leave the browser.
export function initWelcomeChat() {
  if (document.querySelector('.welcome-chat')) return;

  const widget = document.createElement('div');
  widget.className = 'welcome-chat';
  widget.innerHTML = `
    <button class="welcome-chat-launcher" type="button" aria-label="Open welcome message" hidden>
      <span class="welcome-chat-launcher-icon" aria-hidden="true">✦</span>
      <span>Message</span>
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
    launcher.hidden = true;
    card.hidden = false;
    if (focusClose) closeButton.focus();
  };
  const close = () => {
    card.hidden = true;
    launcher.hidden = false;
    launcher.focus();
  };

  launcher.addEventListener('click', () => open(true));
  closeButton.addEventListener('click', close);
  card.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
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

  setTimeout(() => {
    if (!document.hidden) open();
    else document.addEventListener('visibilitychange', function showWhenVisible() {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', showWhenVisible);
      open();
    });
  }, 5000);
}
