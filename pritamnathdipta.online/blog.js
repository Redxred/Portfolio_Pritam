const filters = [...document.querySelectorAll('.blog-filters button')];
const cards = [...document.querySelectorAll('.blog-card')];
const empty = document.querySelector('#blog-empty');

filters.forEach(button => button.addEventListener('click', () => {
  const selected = button.dataset.filter;
  filters.forEach(filter => {
    const active = filter === button;
    filter.classList.toggle('is-active', active);
    filter.setAttribute('aria-pressed', String(active));
  });
  let visible = 0;
  cards.forEach(card => {
    const show = selected === 'all' || card.dataset.category === selected;
    card.hidden = !show;
    if (show) visible++;
  });
  empty.hidden = visible > 0;
}));

const liveSection = document.querySelector('#live-posts');
const liveGrid = document.querySelector('#live-grid');
const updated = document.querySelector('#live-updated');
const make = (tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value) element.textContent = value;
  return element;
};

fetch('/api/linkedin/posts', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(7000) })
  .then(response => response.ok ? response.json() : null)
  .then(feed => {
    if (!Array.isArray(feed?.posts) || !feed.posts.length) return;
    const fragment = document.createDocumentFragment();
    for (const post of feed.posts) {
      if (!/^https:\/\/www\.linkedin\.com\/feed\/update\//.test(post.url)) continue;
      const card = make('article', 'blog-card');
      const art = make('div', 'blog-card-art');
      art.setAttribute('aria-hidden', 'true');
      art.append(make('span', '', 'in'));
      const content = make('div', 'blog-card-content');
      const meta = make('div', 'blog-card-meta');
      meta.append(make('span', '', 'LinkedIn'), make('span', '', post.date ? new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Post'));
      content.append(meta, make('h3', '', post.title), make('p', '', post.summary));
      const link = make('a', 'blog-card-link', 'Read on LinkedIn ↗');
      link.href = post.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Read ${post.title} on LinkedIn`);
      content.append(link);
      card.append(art, content);
      fragment.append(card);
    }
    if (!fragment.childElementCount) return;
    liveGrid.append(fragment);
    if (feed.updatedAt) updated.textContent = `Synced ${new Date(feed.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} from LinkedIn.`;
    liveSection.hidden = false;
  }).catch(() => {});
