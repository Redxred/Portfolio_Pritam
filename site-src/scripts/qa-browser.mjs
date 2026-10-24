import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4173';
const artifacts = fileURLToPath(new URL('../../qa-chrome-audit/', import.meta.url));
await mkdir(artifacts, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9231',
  `--user-data-dir=${artifacts}/browser-profile`, '--window-size=1440,900', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
const errors = [];
const consoleErrors = [];
const requests = [];
const downloads = [];
let send;
async function check(name, fn) {
  try { await fn(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(name, error.message); }
}
try {
  let target;
  for (let i = 0; i < 40; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9231/json/list')).json()).find(t => t.type === 'page'); if (target) break; } catch {}
    await wait(200);
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 1;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') consoleErrors.push(message.params.entry.text);
    if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, method: message.params.request.method });
    if (message.method === 'Browser.downloadWillBegin') downloads.push(message.params);
    if (!message.id) return;
    const promise = pending.get(message.id); if (!promise) return;
    pending.delete(message.id);
    message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result);
  };
  send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const settleScroll = async id => {
    let stable = 0;
    for (let i = 0; i < 80; i++) {
      await wait(100);
      const top = await evaluate(`document.getElementById('${id}').getBoundingClientRect().top`);
      stable = top >= 80 && top <= 112 ? stable + 1 : 0;
      if (stable >= 2) return;
    }
    throw new Error(`Scroll did not reach ${id}`);
  };
  const screenshot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${artifacts}/${name}.png`, Buffer.from(r.data, 'base64')); };
  const go = async path => { await send('Page.navigate', { url: `${origin}${path}` }); await wait(3800); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__qaCsp=[]; document.addEventListener('securitypolicyviolation',e=>window.__qaCsp.push(e.effectiveDirective)); try { if(!localStorage.theme) localStorage.theme='dark'; } catch {}" });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Network.setBlockedURLs', { urls: [`${origin}/assets/index-motion.js`] });
  await send('Page.navigate', { url: `${origin}/` });
  await wait(600);
  await check('Crawlable startup text stays hidden when JavaScript is enabled', async () => {
    assert.equal(await evaluate("document.documentElement.classList.contains('js')"), true);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.seo-fallback')).display"), 'none');
  });
  await send('Network.setBlockedURLs', { urls: [] });
  errors.length = 0; consoleErrors.length = 0; requests.length = 0;
  await go('/');
  await check('Homepage and original sections render', async () => {
    assert.deepEqual(await evaluate("[...document.querySelectorAll('main section[id]')].map(s=>s.id)"), ['about', 'projects', 'services', 'facts', 'research', 'testimonials', 'contact']);
    assert.equal(await evaluate('document.querySelector("main section:first-child").querySelectorAll("img").length'), 1);
    assert.equal(await evaluate("document.querySelector('.hero-backdrop').getAttribute('aria-hidden')"), 'true');
  });
  await check('Homepage CV buttons point to the download', async () => {
    const links = await evaluate("[...document.querySelectorAll('a[download]')].filter(a=>a.textContent.includes('Download CV')).map(a=>({pathname:new URL(a.href).pathname,filename:a.download,target:a.target}))");
    assert.ok(links.length >= 2);
    assert.ok(links.every(link => link.pathname === '/download/Pritam_Nath_Dipta_CV.pdf' && link.filename === 'Pritam_Nath_Dipta_CV.pdf' && !link.target));
  });
  await check('Theme initialization is allowed by CSP', async () => { assert.deepEqual(await evaluate('window.__qaCsp'), []); });
  await check('Hidden header cannot receive keyboard focus', async () => { assert.equal(await evaluate("document.querySelector('header').inert"), true); });
  await check('Keyboard skip link', async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate('document.activeElement.textContent'), 'Skip to content');
  });
  await screenshot('desktop-hero');
  await check('Hero background follows mouse movement', async () => {
    const rect = await evaluate("(()=>{const r=document.querySelector('main section:first-child').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()");
    assert.equal(await evaluate("document.querySelector('.hero-flow-canvas').getContext('webgl2') !== null"), true);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.left + rect.width * .2, y: rect.top + rect.height * .5 });
    await wait(650);
    await screenshot('hero-pointer-left');
    const leftPointer = Number(await evaluate("document.querySelector('.hero-flow-canvas').dataset.pointerX"));
    const hit = await evaluate(`(()=>{const e=document.elementFromPoint(${rect.left + rect.width * .2},${rect.top + rect.height * .5});return {element:e?.tagName,section:e?.closest('section')?.id,canvas:document.querySelector('.hero-flow-canvas').dataset.motionState}})()`);
    assert.ok(leftPointer > .17 && leftPointer < .23, `Left pointer position did not update: ${JSON.stringify({ leftPointer, rect, hit })}`);
    assert.notEqual(hit.element, 'CANVAS');
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.left + rect.width * .8, y: rect.top + rect.height * .5 });
    await wait(650);
    const rightPointer = Number(await evaluate("document.querySelector('.hero-flow-canvas').dataset.pointerX"));
    assert.ok(rightPointer > .77 && rightPointer < .83, `Pointer glow did not follow to the right: ${rightPointer}`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
  });
  await check('Welcome message opens after five seconds and quick reply works', async () => {
    for (let i = 0; i < 20 && await evaluate("document.querySelector('.welcome-chat-card')?.hidden"); i++) await wait(250);
    assert.equal(await evaluate("document.querySelector('.welcome-chat-card').hidden"), false);
    assert.match(await evaluate("document.querySelector('.welcome-chat-card').textContent"), /How are you finding it so far/);
    await wait(500);
    await screenshot('welcome-chat');
    await evaluate("document.querySelector('[data-reply=love]').click()");
    assert.match(await evaluate("document.querySelector('.welcome-chat-bubble-answer').textContent"), /thank you/);
    assert.equal(await evaluate("document.querySelector('.welcome-chat-replies').hidden"), true);
    assert.equal(await evaluate("document.querySelector('.welcome-chat-action').getAttribute('href')"), '#contact');
    await screenshot('welcome-chat-reply');
    await evaluate("document.querySelector('.welcome-chat-close').click()");
    assert.equal(await evaluate("document.querySelector('.welcome-chat-launcher').hidden"), false);
    await evaluate("document.querySelector('.welcome-chat-launcher').click()");
    assert.equal(await evaluate("document.querySelector('.welcome-chat-menu').hidden"), false);
    assert.equal(await evaluate("document.querySelector('.welcome-chat-launcher').getAttribute('aria-expanded')"), 'true');
    assert.equal(await evaluate("document.querySelector('.welcome-chat-menu a[href^=\"https://wa.me/\"]').getAttribute('href')"), 'https://wa.me/8801318882755');
    assert.equal(await evaluate("document.querySelector('.welcome-chat-menu a[href^=\"mailto:\"]').getAttribute('href')"), 'mailto:redxpritam@gmail.com');
    await wait(300);
    await screenshot('contact-menu');
    await evaluate("document.querySelector('[data-contact=message]').click()");
    assert.equal(await evaluate("document.querySelector('.welcome-chat-card').hidden"), false);
    assert.equal(await evaluate("document.querySelector('.welcome-chat-menu').hidden"), true);
    await evaluate("document.querySelector('.welcome-chat-close').click()");
  });
  await check('Hero work action reaches projects', async () => {
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Explore My Work').click()"); await settleScroll('projects');
    const top = await evaluate("document.querySelector('#projects').getBoundingClientRect().top");
    assert.ok(top >= 72 && top < 180, `Projects ended at ${top}px`);
  });
  for (const [id, label] of [['about', 'About'], ['projects', 'Projects'], ['services', 'Services'], ['research', 'Research'], ['contact', 'Contact']]) {
    await check(`Navigation tracks ${id}`, async () => {
      await evaluate(`[...document.querySelectorAll('header button')].find(b=>b.textContent==='${label}').click()`); await settleScroll(id);
      assert.ok((await evaluate("[...document.querySelectorAll('header button.text-primary')].map(b=>b.textContent)")).includes(label));
      const top = await evaluate(`document.getElementById('${id}').getBoundingClientRect().top`);
      assert.ok(top >= 72, `${id} ended at ${top}px`);
    });
  }
  await check('Project details create a contact request', async () => {
    await evaluate("document.querySelector('button[aria-label^=\"Ask about\"]').click()"); await wait(300);
    assert.match(await evaluate("document.querySelector('#contact-message').value"), /Enterprise Security Audit Platform/);
  });
  await check('Unpublished papers request a copy instead of opening an empty URL', async () => {
    await evaluate("[...document.querySelectorAll('#research a')].find(a=>a.textContent.includes('Request Paper')).click()"); await wait(200);
    assert.match(await evaluate("document.querySelector('#contact-message').value"), /Malware Detection/);
    assert.equal(await evaluate("document.querySelectorAll('a[href=\"\"], a[href=\"#\"]').length"), 0);
  });
  await check('Footer ownership and unused social links', async () => {
    assert.equal(await evaluate("document.querySelectorAll('a[aria-label=Twitter]').length"), 0);
    const footerText = await evaluate("document.querySelector('footer').textContent");
    assert.match(footerText, /HacknFix\. All rights reserved\./);
    assert.match(footerText, /Developed by Pritam/);
    assert.doesNotMatch(footerText, /blackX/);
  });
  await check('Project and publication actions open real destinations', async () => {
    const opened = await evaluate(`(()=>{const original=window.open,urls=[];window.open=(...args)=>urls.push(args);for(const text of ['View All Projects','View All Publications']){[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text)).click()}window.open=original;return urls})()`);
    assert.match(opened[0][0], /^https:\/\/github\.com\/Redxred/);
    assert.match(opened[1][0], /^https:\/\/ieeexplore\.ieee\.org\/search/);
    assert.equal(opened.every(args => args[2].includes('noopener')), true);
  });
  await check('No nested interactive WhatsApp controls', async () => { assert.equal(await evaluate("document.querySelectorAll('a button, button a').length"), 0); });
  await check('Form labels, validation, and bounded input', async () => {
    assert.equal(await evaluate("[...document.querySelectorAll('#contact input,#contact textarea')].every(e=>e.labels.length&&e.name&&e.maxLength>0)"), true);
    assert.equal(await evaluate("(()=>{const i=document.querySelector('#contact-email');i.value='not-an-email';return i.checkValidity()})()"), false);
  });
  await check('Contact draft safely encodes input without sending a message', async () => {
    const before = requests.filter(r => r.method === 'POST').length;
    await evaluate(`(()=>{
      const values=['Tester &subject=changed', 'qa@example.org', '<svg onload="window.__qaXss=1"> &body=changed'];
      document.querySelectorAll('#contact input,#contact textarea').forEach((e,i)=>{
        Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,values[i]);
        e.dispatchEvent(new Event('input',{bubbles:true}));
      });
      document.querySelector('#contact form').requestSubmit();
    })()`);
    const draft = await evaluate("document.querySelector('#contact-status a')?.href");
    assert.ok(draft, 'Email draft was not created');
    const url = new URL(draft);
    assert.equal(url.protocol, 'mailto:'); assert.equal(url.pathname, 'redxpritam@gmail.com');
    assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
    assert.match(url.searchParams.get('body'), /<svg onload=/);
    assert.equal(requests.filter(r => r.method === 'POST').length, before);
    assert.equal(await evaluate('window.__qaXss||0'), 0);
    assert.match(await evaluate("document.querySelector('#contact-status').textContent"), /has not been sent/);
  });
  await check('Changing form input invalidates an old draft', async () => {
    await evaluate("document.querySelector('#contact-message').dispatchEvent(new Event('input',{bubbles:true}))");
    assert.equal(await evaluate("document.querySelector('#contact-status a')"), null);
  });
  await check('Review filtering and navigation', async () => {
    await evaluate("document.querySelector('#testimonials').scrollIntoView({behavior:'instant'})"); await wait(1000);
    await evaluate("document.querySelector('#testimonials button[title=\"Pause auto-scroll\"]')?.click()");
    await evaluate("[...document.querySelectorAll('#testimonials button')].find(b=>b.textContent==='Clients').click()"); await wait(650);
    const visibleQuote = "[...document.querySelectorAll('#testimonials .italic')].find(p=>{const r=p.getBoundingClientRect();return r.left<=innerWidth/2&&r.right>=innerWidth/2}).textContent";
    const before = await evaluate(visibleQuote);
    await evaluate("[...document.querySelectorAll('#testimonials button[aria-label=\"Next review\"]')].find(b=>b.getBoundingClientRect().width).click()"); await wait(650);
    assert.notEqual(await evaluate(visibleQuote), before);
  });
  await check('Footer-only back-to-top button returns to the start', async () => {
    assert.equal(await evaluate("document.querySelectorAll('.legacy-footer-back-to-top').length"), 1);
    assert.equal(await evaluate("document.querySelector('.legacy-footer-back-to-top').closest('footer')!==null"), true);
    assert.equal(await evaluate("document.querySelectorAll('button:has(.lucide-arrow-up)').length"), 0);
    await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');
    await wait(250);
    await evaluate("document.querySelector('.legacy-footer-back-to-top').click()");
    for (let i = 0; i < 30 && await evaluate('window.scrollY > 12'); i++) await wait(200);
    const scrollY = await evaluate('window.scrollY');
    assert.ok(scrollY <= 12, `Back-to-top stopped at ${scrollY}px`);
  });

  const axeCode = await readFile(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
  for (const theme of ['light', 'dark']) {
    await check(`${theme} theme and hero motion switch together`, async () => {
      await evaluate(`(()=>{const b=[...document.querySelectorAll('header button[aria-label="Switch to ${theme} mode"]')].find(e=>e.getBoundingClientRect().width);if(b)b.click()})()`);
      await wait(500);
      assert.equal(await evaluate(`document.documentElement.classList.contains('${theme}')`), true);
      assert.equal(await evaluate("document.querySelector('.hero-flow-canvas').dataset.motionTheme"), theme);
      assert.equal(await evaluate("document.querySelector('.hero-flow-canvas').dataset.motionEngine"), 'threejs');
      assert.equal(await evaluate("document.querySelector('.hero-backdrop').contains(document.querySelector('canvas'))"), true);
      assert.equal(await evaluate("document.querySelectorAll('canvas').length"), 1);
    });
    await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)'); await wait(500);
    await screenshot(`${theme}-footer`);
    if (theme === 'dark') await check('Footer artwork and orbit animation render', async () => {
      assert.equal(await evaluate("document.querySelector('.legacy-footer-visual img').complete"), true);
      assert.equal(await evaluate("document.querySelector('.legacy-footer-visual img').naturalWidth > 0"), true);
      const signal = "getComputedStyle(document.querySelector('.legacy-footer-orbit')).transform";
      const first = await evaluate(signal);
      await wait(230);
      assert.notEqual(first, await evaluate(signal));
      assert.equal(await evaluate("[...document.querySelectorAll('.security-atmosphere,.security-card-signal,.security-action-sheen')].every(e=>getComputedStyle(e).pointerEvents==='none')"), true);
    });
    if (theme === 'dark') for (const section of ['about', 'services', 'projects']) {
      await evaluate(`document.getElementById('${section}').scrollIntoView({behavior:'instant'})`);
      await wait(850);
      await screenshot(`motion-${section}`);
      if (section === 'about') {
        await evaluate("document.querySelector('.core-technologies').scrollIntoView({behavior:'instant',block:'center'})");
        await wait(550);
        await screenshot('core-technologies');
      }
    }
    // Trigger every reveal once before auditing all of the page's content.
    const height = await evaluate('document.documentElement.scrollHeight');
    for (let y = 0; y < height; y += 650) { await evaluate(`window.scrollTo(0,${y})`); await wait(65); }
    await wait(950);
    await evaluate(axeCode);
    const audit = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>({violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:r.passes.length,incomplete:r.incomplete.map(v=>v.id)}))");
    await writeFile(`${artifacts}/axe-${theme}.json`, JSON.stringify(audit, null, 2));
    await check(`${theme} accessibility audit`, async () => { assert.equal(audit.violations.length, 0, JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.length })))); });
  }
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 768 });
    await send('Emulation.setTouchEmulationEnabled', { enabled: width < 768 });
    await wait(200);
    if (width === 320) {
      await go('/'); await wait(1400);
      await check('Mobile welcome stays compact until opened', async () => {
        assert.equal(await evaluate("document.querySelector('.welcome-chat-card').hidden"), true);
        assert.equal(await evaluate("document.querySelector('.welcome-chat-launcher').hidden"), false);
      });
      await check('Small screen header name stays on one line', async () => {
        const layout = await evaluate("(()=>{const brand=document.querySelector('#root header .container > button:first-child').getBoundingClientRect();const theme=[...document.querySelectorAll('#root header button[aria-label^=\"Switch to\"]')].map(e=>e.getBoundingClientRect()).find(r=>r.width);return {height:brand.height,right:brand.right,themeLeft:theme?.left}})()");
        assert.ok(layout.height < 30 && layout.right + 4 < layout.themeLeft, JSON.stringify(layout));
      });
    }
    await check(`Responsive width ${width}`, async () => {
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
      assert.equal(await evaluate("(()=>{const r=document.querySelector('.legacy-footer-showcase').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()"), true);
    });
    if (width === 320 || width === 430) {
      await evaluate('window.scrollTo(0,0)'); await wait(250);
      await screenshot(`mobile-${width}-hero`);
      await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)'); await wait(900);
      await screenshot(`mobile-${width}-footer`);
      if (width === 320) await check('Floating contact control clears footer links', async () => {
        const overlap = await evaluate("(()=>{const a=[...document.querySelectorAll('.legacy-footer-socials a')].find(e=>e.getAttribute('aria-label')==='Email').getBoundingClientRect();const b=document.querySelector('.welcome-chat-launcher').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top})()");
        assert.equal(overlap, false);
      });
    }
    if (width === 390) {
      await evaluate('window.scrollTo(0,0)'); await wait(300);
      await screenshot('mobile-hero');
      await evaluate("document.querySelector('.welcome-chat-launcher').click()");
      await wait(300);
      await screenshot('mobile-contact-menu');
      await evaluate("document.querySelector('[data-contact=message]').click()");
      await wait(500);
      await screenshot('mobile-welcome-chat');
      await evaluate("document.querySelector('.welcome-chat-close').click()");
      await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)'); await wait(200);
      await screenshot('mobile-footer');
      for (const sectionId of ['about', 'projects', 'services', 'research', 'testimonials', 'contact']) {
        await evaluate(`document.getElementById('${sectionId}').scrollIntoView({behavior:'instant'})`);
        await wait(200);
        await screenshot(`mobile-${sectionId}`);
      }
      await check('Mobile menu opens and Escape closes it', async () => {
        await evaluate("document.querySelector('button[aria-label=\"Open menu\"]').click()"); await wait(100);
        assert.equal(await evaluate("document.querySelector('button[aria-expanded=true]')!==null"), true);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await wait(100);
        assert.equal(await evaluate("document.querySelector('button[aria-expanded=true]')"), null);
      });
      await check('Mobile navigation closes the menu and reaches the section', async () => {
        await evaluate("document.querySelector('button[aria-label=\"Open menu\"]').click()"); await wait(100);
        await evaluate("[...document.querySelectorAll('#mobile-navigation button')].find(b=>b.textContent==='Services').click()"); await settleScroll('services');
        assert.equal(await evaluate("document.querySelector('#mobile-navigation')"), null);
        assert.ok(Math.abs(await evaluate("document.querySelector('#services').getBoundingClientRect().top") - 96) < 5);
      });
    }
  }
  await check('Reduced motion stops rendering and footer animation', async () => {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await wait(450);
    assert.equal(await evaluate("document.querySelector('.hero-flow-canvas').dataset.motionState"), 'paused');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.legacy-footer-orbit')).animationName"), 'none');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.legacy-footer-visual img')).animationName"), 'none');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.security-atmosphere'),'::after').animationName"), 'none');
  });
  await check('Reduced motion skips the hero animation download on reload', async () => {
    await go('/');
    assert.equal(await evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('hero-flow.js'))"), false);
    assert.match(await evaluate('document.querySelector("h1").textContent'), /Pritam Nath Dipta/);
  });
  await check('Reduced-motion navigation scrolls without animation', async () => {
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Explore My Work').click()");
    const top = await evaluate("document.getElementById('projects').getBoundingClientRect().top");
    assert.ok(top >= 80 && top <= 112);
  });
  await check('DOM injection is blocked by CSP', async () => {
    await evaluate("window.__qaInjected=0;let s=document.createElement('script');s.textContent='window.__qaInjected=1';document.body.append(s)"); await wait(100);
    assert.equal(await evaluate('window.__qaInjected'), 0);
    assert.ok((await evaluate('window.__qaCsp')).some(d => d.startsWith('script-src')));
  });
  await check('Query/hash payload does not execute', async () => {
    await go('/?q=%3Csvg%20onload%3Dwindow.__qaXss%3D1%3E#%3Cimg%20src%3Dx%20onerror%3Dwindow.__qaXss%3D1%3E');
    assert.equal(await evaluate('window.__qaXss||0'), 0);
    assert.equal(await evaluate("document.querySelectorAll('[onerror],[onload]').length"), 0);
  });
  await go('/cv.html');
  await check('CV download saves the supplied PDF', async () => {
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts, eventsEnabled: true });
    const links = await evaluate("({download:document.querySelector('.cv-toolbar a[download]')?.getAttribute('href'),view:document.querySelector('.cv-pdf-view a')?.getAttribute('href')})");
    assert.equal(links.download, '/download/Pritam_Nath_Dipta_CV.pdf');
    assert.equal(links.view, '/Pritam_Nath_Dipta_CV.pdf');
    await evaluate("document.querySelector('.cv-toolbar a[download]').click()");
    for (let i = 0; i < 30 && downloads.length === 0; i++) await wait(100);
    assert.equal(downloads[0]?.suggestedFilename, 'Pritam_Nath_Dipta_CV.pdf');
    const expected = await readFile(new URL('../legacy/assets/Pritam_Nath_Dipta_CV_Updated.pdf', import.meta.url));
    const savedPath = `${artifacts}/Pritam_Nath_Dipta_CV.pdf`;
    for (let i = 0; i < 50 && (await stat(savedPath).catch(() => ({ size: 0 }))).size !== expected.length; i++) await wait(100);
    assert.deepEqual(await readFile(savedPath), expected);
    assert.equal(await evaluate('new URL(location.href).pathname'), '/cv.html');
  });
  await evaluate(axeCode);
  const cvAudit = await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>({violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}))");
  await writeFile(`${artifacts}/axe-cv.json`, JSON.stringify(cvAudit, null, 2));
  await check('CV accessibility audit', async () => { assert.equal(cvAudit.violations.length, 0, JSON.stringify(cvAudit.violations.map(v => ({ id: v.id, nodes: v.nodes.length })))); });
  await check('CV layout and print output', async () => {
    assert.equal(await evaluate('document.querySelectorAll(".cv-section").length>5'), true);
    const pdf = await send('Page.printToPDF', { printBackground: true });
    assert.ok(Buffer.from(pdf.data, 'base64').length > 1000);
    await writeFile(`${artifacts}/cv-validated.pdf`, Buffer.from(pdf.data, 'base64'));
  });
  await check('CV mobile layout', async () => {
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(200);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  });
  await check('No JavaScript runtime errors', async () => { assert.deepEqual(errors, []); });
  await check('No unexpected application console errors', async () => { assert.deepEqual(consoleErrors.filter(text => !text.startsWith('Executing inline script violates')), []); });
  // The deliberate inline-script attack above is expected to generate one CSP error.
  await writeFile(`${artifacts}/browser-console.json`, JSON.stringify({ runtime: errors, console: consoleErrors, localRequests: requests.filter(r => r.url.startsWith(origin)) }, null, 2));
  await send('Browser.close'); ws.close();
} catch (error) {
  results.push({ name: 'Browser test runner', passed: false, error: error.stack });
  if (send) await send('Browser.close').catch(() => {});
} finally {
  chrome.kill();
  await writeFile(`${artifacts}/browser-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed) }, null, 2));
  if (results.some(r => !r.passed)) process.exitCode = 1;
}
