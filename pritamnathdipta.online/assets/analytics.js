var v = () => {
  window.va || (window.va = function(...i) {
    window.vaq || (window.vaq = []), window.vaq.push(i);
  });
}, w = "@vercel/analytics", m = "2.0.1";
function u() {
  return typeof window < "u";
}
function f() {
  try {
    const e = process.env.NODE_ENV;
    if (e === "development" || e === "test")
      return "development";
  } catch {
  }
  return "production";
}
function h(e = "auto") {
  if (e === "auto") {
    window.vam = f();
    return;
  }
  window.vam = e;
}
function b() {
  return (u() ? window.vam : f()) || "production";
}
function c() {
  return b() === "development";
}
function y(e) {
  return e.scriptSrc ? o(e.scriptSrc) : c() ? "https://va.vercel-scripts.com/v1/script.debug.js" : e.basePath ? o(`${e.basePath}/insights/script.js`) : "/_vercel/insights/script.js";
}
function E(e, i) {
  var r;
  let n = e;
  if (i)
    try {
      n = {
        ...(r = JSON.parse(i)) == null ? void 0 : r.analytics,
        ...e
      };
    } catch {
    }
  h(n.mode);
  const t = {
    sdkn: w + (n.framework ? `/${n.framework}` : ""),
    sdkv: m
  };
  return n.disableAutoTrack && (t.disableAutoTrack = "1"), n.viewEndpoint && (t.viewEndpoint = o(n.viewEndpoint)), n.eventEndpoint && (t.eventEndpoint = o(n.eventEndpoint)), n.sessionEndpoint && (t.sessionEndpoint = o(n.sessionEndpoint)), c() && n.debug === !1 && (t.debug = "false"), n.dsn && (t.dsn = n.dsn), n.endpoint ? t.endpoint = n.endpoint : n.basePath && (t.endpoint = o(`${n.basePath}/insights`)), {
    beforeSend: n.beforeSend,
    src: y(n),
    dataset: t
  };
}
function o(e) {
  return e.startsWith("http://") || e.startsWith("https://") || e.startsWith("/") ? e : `/${e}`;
}
function g(e = {
  debug: !0
}, i) {
  var r;
  if (!u()) return;
  const { beforeSend: n, src: t, dataset: p } = E(e, i);
  if (v(), n && ((r = window.va) == null || r.call(window, "beforeSend", n)), document.head.querySelector(`script[src*="${t}"]`)) return;
  const s = document.createElement("script");
  s.src = t;
  for (const [a, l] of Object.entries(p))
    s.dataset[a] = l;
  s.defer = !0, s.onerror = () => {
    const a = c() ? "Please check if any ad blockers are enabled and try again." : "Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.";
    console.log(
      `[Vercel Web Analytics] Failed to load script from ${t}. ${a}`
    );
  }, document.head.appendChild(s);
}
const d = window.location.hostname;
(d === "www.pritamnathdipta.online" || d === "pritamnathdipta.online" || d.endsWith(".vercel.app")) && g({ mode: "production" });
