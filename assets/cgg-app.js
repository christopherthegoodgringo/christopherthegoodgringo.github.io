/* Installable app: registers the service worker and adds an "Install the app" button to the footer,
   under the language toggle. Android / computer (Chrome, Edge, Samsung): the browser's own install prompt.
   iPhone / iPad: a short "Share -> Add to Home Screen" guide. Hidden when the site is already open as the app.
   All text is English here; assets/cgg-i18n.js shows it in Spanish when the visitor picks Español. */
(function () {
  if (window.CGGApp) return;
  var path = location.pathname;
  var area = /^\/owner\//.test(path) ? 'owner' : /^\/admin\//.test(path) ? 'admin' : 'site';
  var LABEL = { site: 'Install the Christopher The Good Gringo app', owner: 'Install the Christopher The Good Gringo business app', admin: 'Install the Christopher The Good Gringo admin app' }[area];
  var deferred = null;

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }

  function standalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  var CSS = '' +
    '.cgg-app-row{display:flex;justify-content:center;width:100%;margin-top:10px}' +
    '.cgg-app-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid #f5bd3e;border-radius:999px;background:#f5bd3e;color:#09291e;font:800 .82rem/1 "DM Sans",system-ui,sans-serif;padding:9px 16px;cursor:pointer}' +
    '.cgg-app-btn:hover{background:#ffd36b}.cgg-app-btn:focus-visible{outline:2px solid #fffdf8;outline-offset:2px}' +
    '.cgg-app-btn svg{width:16px;height:16px;flex:none}' +
    '.cgg-app-overlay{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(9,41,30,.75)}' +
    '@media(min-width:700px){.cgg-app-overlay{align-items:center}}' +
    '.cgg-app-card{width:min(420px,100%);background:#fffdf8;color:#17271f;border-radius:18px;padding:24px 22px 20px;box-shadow:0 25px 90px rgba(0,0,0,.35);border:1px solid #f5bd3e;font:15px/1.5 "DM Sans",system-ui,sans-serif}' +
    '.cgg-app-card .cgg-app-top{display:flex;align-items:center;gap:12px;margin-bottom:14px}' +
    '.cgg-app-card .cgg-app-top img{width:52px;height:52px;border-radius:12px;flex:none}' +
    '.cgg-app-card h2{margin:0;font:800 1.25rem/1.2 "Bricolage Grotesque","DM Sans",system-ui,sans-serif;color:#09291e}' +
    '.cgg-app-card ol{margin:0 0 14px;padding-left:22px}.cgg-app-card li{margin:6px 0}' +
    '.cgg-app-card p{margin:0 0 16px;color:#657268;font-size:.9rem}' +
    '.cgg-app-card button{width:100%;border:0;border-radius:12px;background:#103e2f;color:#fffdf8;font:800 1rem/1 "DM Sans",system-ui,sans-serif;padding:14px;cursor:pointer}';

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function guide() {
    if (document.querySelector('.cgg-app-overlay')) return;
    var o = el('div', 'cgg-app-overlay'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    var c = el('div', 'cgg-app-card');
    var top = el('div', 'cgg-app-top');
    var img = el('img'); img.src = '/assets/app/icon-any-192.png'; img.alt = '';
    var h = el('h2', '', isIOS ? 'Add Christopher The Good Gringo to your home screen' : LABEL);
    top.appendChild(img); top.appendChild(h); c.appendChild(top);
    var ol = el('ol');
    (isIOS
      ? ['Tap the Share button (the square with an arrow).', 'Scroll down and tap “Add to Home Screen”.', 'Tap “Add”.']
      : ['Open your browser menu (⋮ or ⋯).', 'Choose “Install app” or “Add to Home screen”.', 'Confirm.']
    ).forEach(function (s) { ol.appendChild(el('li', '', s)); });
    c.appendChild(ol);
    c.appendChild(el('p', '', 'It opens full screen like any other app, and pages you have already opened still work without internet.'));
    var close = el('button', '', 'Close'); close.type = 'button';
    close.addEventListener('click', function () { o.remove(); });
    o.addEventListener('click', function (ev) { if (ev.target === o) o.remove(); });
    c.appendChild(close); o.appendChild(c); document.body.appendChild(o); close.focus();
  }

  function install() {
    if (deferred) {
      var d = deferred; deferred = null;
      d.prompt();
      if (d.userChoice) d.userChoice.then(function (r) { if (r && r.outcome === 'accepted') hide(); }).catch(function () {});
      return;
    }
    guide();
  }

  function hide() { var r = document.querySelector('.cgg-app-row'); if (r) r.remove(); }

  function place() {
    if (standalone() || document.querySelector('.cgg-app-row')) return;
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var row = el('div', 'cgg-app-row');
    var b = el('button', 'cgg-app-btn'); b.type = 'button';
    b.innerHTML = ICON; b.appendChild(el('span', '', LABEL));
    b.addEventListener('click', install);
    row.appendChild(b);
    var lang = document.querySelector('.cgg-lang-row');
    if (lang && lang.parentNode) lang.parentNode.insertBefore(row, lang.nextSibling);
    else { var f = document.querySelectorAll('footer'); f = f[f.length - 1]; (f ? (f.querySelector('.wrap') || f) : document.body).appendChild(row); }
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', hide);
  function start() { setTimeout(place, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.CGGApp = { install: install, guide: guide };
})();
