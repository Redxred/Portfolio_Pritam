const form = document.querySelector('#connect-form');
const message = document.querySelector('#connect-message');
const status = new URLSearchParams(location.search).get('status');
const messages = {
  connected: 'LinkedIn connected. Your public posts are now synced to the Blog.',
  'sync-error': 'LinkedIn connected, but the first post sync failed. Check the app permissions and person URN, then run the scheduled sync again.',
  denied: 'LinkedIn authorization was cancelled. You can try again.',
  error: 'The connection could not be completed. Check the LinkedIn app configuration and try again.',
};
if (messages[status]) message.textContent = messages[status];

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = 'Opening LinkedIn…';
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/api/linkedin/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: form.elements.key.value }),
    });
    const result = await response.json();
    if (!response.ok || !/^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization\?/.test(result.url)) throw new Error(result.error || 'Connection failed.');
    location.assign(result.url);
  } catch (error) {
    message.textContent = error.message || 'Connection failed.';
    button.disabled = false;
  }
});
