// Small, checked patches preserve the original compiled UI. A changed upstream
// bundle fails the build instead of silently applying a patch to the wrong code.
export function applyQaFixes(code) {
  const once = (before, after, label) => {
    if (code.split(before).length !== 2) throw new Error(`Expected one original ${label} fragment`);
    code = code.replace(before, after);
  };
  // The homepage's Download CV controls use a dedicated attachment URL.
  const cvLink = 'href:"/Pritam_Nath_Dipta_CV.pdf",download:"Pritam_Nath_Dipta_CV.pdf",target:"_blank",rel:"noopener noreferrer"';
  if (code.split(cvLink).length !== 4) throw new Error('Expected three original CV download links');
  code = code.replaceAll(cvLink, 'href:"/download/Pritam_Nath_Dipta_CV.pdf",download:"Pritam_Nath_Dipta_CV.pdf"');
  once('{label:"Research",href:"#research",id:"research"},{label:"Contact",href:"#contact",id:"contact"}',
    '{label:"Research",href:"#research",id:"research"},{label:"Blog",href:"/blog.html",id:"blog"},{label:"Contact",href:"#contact",id:"contact"}', 'blog navigation');
  // Replace only the decorative hero backdrop; preserve every foreground element.
  once('c.jsxs("div",{className:"absolute inset-0 z-0",children:[c.jsx("img",{src:gk,alt:"Cyber background",className:"w-full h-full object-cover opacity-30"}),c.jsx("div",{className:"absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"})]})',
    'c.jsxs("div",{className:"hero-backdrop","aria-hidden":!0,children:[c.jsx("div",{className:"hero-flow-glow hero-flow-glow-cyan"}),c.jsx("div",{className:"hero-flow-glow hero-flow-glow-violet"}),c.jsx("canvas",{className:"hero-flow-canvas"})]})', 'hero backdrop');
  once('const b=Bi.map(w=>document.getElementById(w.id)),v=window.scrollY+150;for(let w=b.length-1;w>=0;w--){const g=b[w];if(g&&g.offsetTop<=v){i(Bi[w].id);return}}i("")',
    'const b=Bi.map(w=>document.getElementById(w.id)),v=window.scrollY+150;let best=-Infinity,current="";for(let w=0;w<b.length;w++){const g=b[w];if(!g)continue;const top=g.getBoundingClientRect().top+window.scrollY;if(top<=v&&top>=best){best=top;current=Bi[w].id}}i(current)', 'navigation position');
  once('document.getElementById("about")', 'document.getElementById("projects")', 'hero destination');
  once('c.jsx(Vk,{})', 'null', 'old floating back-to-top control');
  once('const f=m=>{const d=document.querySelector(m);d==null||d.scrollIntoView({behavior:"smooth"}),r(!1)}',
    'const f=m=>{if(m[0]==="/"){window.location.assign(m);r(!1);return}const d=document.querySelector(m);if(d){const p=d.parentElement;if(p.tagName!=="MAIN"){p.style.transition="none";p.style.transform="none";p.style.opacity="1";p.style.filter="none"}d.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}r(!1)}', 'navigation reveal timing');
  once('p=()=>{a(s==="dark"?"light":"dark")}', 'p=()=>{a(document.documentElement.classList.contains("dark")?"light":"dark")}', 'theme toggle');
  code = code.replaceAll('s==="dark"?c.jsx(Jd', 'document.documentElement.classList.contains("dark")?c.jsx(Jd');
  once('n=r=>{r.preventDefault(),tw.success("Message sent! I\'ll get back to you soon."),t({name:"",email:"",message:""})}',
    'n=r=>{r.preventDefault(),window.dispatchEvent(new CustomEvent("portfolio:contact-submit"))}', 'contact handler');
  once('c.jsxs("form",{onSubmit:n,className:"space-y-6"', 'c.jsxs("form",{onSubmit:n,method:"post",action:"#contact",className:"space-y-6"', 'contact form');
  once('"Send Message"]', '"Prepare email draft"]', 'contact action label');

  const iconClass = 'p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors';
  once(`c.jsx("button",{className:"${iconClass}",children:c.jsx(cc,{className:"w-4 h-4"})})`,
    `c.jsx("a",{href:"https://github.com/Redxred?tab=repositories",target:"_blank",rel:"noopener noreferrer","aria-label":"Browse GitHub repositories",title:"Browse GitHub repositories",className:"${iconClass}",children:c.jsx(cc,{className:"w-4 h-4"})})`, 'project source action');
  once(`c.jsx("button",{className:"${iconClass}",children:c.jsx(js,{className:"w-4 h-4"})})`,
    `c.jsx("button",{type:"button","aria-label":"Ask about "+n.title,title:"Ask about this project",onClick:()=>window.dispatchEvent(new CustomEvent("portfolio:request-project",{detail:n.title})),className:"${iconClass}",children:c.jsx(js,{className:"w-4 h-4"})})`, 'project detail action');
  once('children:["View All Projects",', 'onClick:()=>window.open("https://github.com/Redxred?tab=repositories","_blank","noopener,noreferrer"),title:"Browse projects on GitHub",children:["View All Projects",', 'all projects action');
  once('children:["View All Publications",', 'onClick:()=>window.open("https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=Pritam%20Nath%20Dipta","_blank","noopener,noreferrer"),title:"Search publications on IEEE Xplore",children:["View All Publications",', 'all publications action');
  once('href:n.link,target:"_blank",rel:"noopener noreferrer"',
    'href:n.link||"#contact",target:n.link?"_blank":void 0,rel:"noopener noreferrer",onClick:n.link?void 0:r=>{r.preventDefault();window.dispatchEvent(new CustomEvent("portfolio:request-paper",{detail:n.title}))}', 'paper destination');
  once(',"View Paper"]', ',n.link?"View Paper":"Request Paper"]', 'paper action label');
  const unusedTwitter = ',{icon:Bh,href:"#",label:"Twitter"}';
  if (code.split(unusedTwitter).length !== 3) throw new Error('Expected two unconfigured Twitter links');
  code = code.replaceAll(unusedTwitter, '');
  once('" Pritam Nath Dipta. All rights reserved."', '" HacknFix. All rights reserved."', 'footer copyright');
  once('c.jsxs("p",{className:"text-xs sm:text-sm font-mono order-3",children:[c.jsx("span",{className:"text-primary",children:"<"}),c.jsx("span",{className:"text-muted-foreground",children:"built with"}),c.jsx("span",{className:"text-secondary",children:" blackX"}),c.jsx("span",{className:"text-primary",children:" />"})]})',
    'c.jsx("p",{className:"legacy-footer-credit text-xs sm:text-sm font-mono order-3",children:"Developed by Pritam"})', 'footer developer credit');

  const whatsapp = 'c.jsx("a",{href:"https://wa.me/8801318882755",target:"_blank",rel:"noopener noreferrer",children:c.jsxs(xe,{className:"w-full bg-[#25D366] hover:bg-[#20BD5A] text-white",children:[c.jsx(Ux,{className:"w-5 h-5 mr-2"}),"Chat on WhatsApp"]})})';
  once(whatsapp, 'c.jsx(xe,{asChild:!0,className:"w-full bg-[#25D366] hover:bg-[#20BD5A] text-white",children:c.jsxs("a",{href:"https://wa.me/8801318882755",target:"_blank",rel:"noopener noreferrer",children:[c.jsx(Ux,{className:"w-5 h-5 mr-2"}),"Chat on WhatsApp"]})})', 'WhatsApp markup');
  once('const S=setInterval(()=>{g()},5e3)', 'const S=setInterval(()=>{!document.hidden&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&g()},5e3)', 'review autoplay');
  // The typewriter remains static for visitors requesting reduced motion.
  const hookStart = code.indexOf('hk=({words:');
  const hookEnd = code.indexOf(',gk=', hookStart);
  if (hookStart < 0 || hookEnd < 0) throw new Error('Original typewriter was not found');
  const hook = code.slice(hookStart, hookEnd);
  const updatedHook = hook.replace('x.useEffect(()=>{const p=e[i]', 'x.useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const p=e[i]')
    .replace('{text:a,isTyping:', '{text:window.matchMedia("(prefers-reduced-motion: reduce)").matches?e[0]:a,isTyping:');
  if (!updatedHook.includes('matches?e[0]:a')) throw new Error('Typewriter patch was not applied');
  code = code.replaceAll('window.scrollTo({top:0,behavior:"smooth"})', 'window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})');
  code = code.replaceAll('scrollIntoView({behavior:"smooth"})', 'scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})');
  // Recompute boundaries after patching the earlier navigation functions.
  const currentHookStart = code.indexOf('hk=({words:');
  const currentHookEnd = code.indexOf(',gk=', currentHookStart);
  return code.slice(0, currentHookStart) + updatedHook + code.slice(currentHookEnd);
}
