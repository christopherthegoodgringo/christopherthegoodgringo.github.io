/* Installable app: registers the service worker and adds an "Install the app" button to the footer,
   under the language toggle. Android / computer (Chrome, Edge, Samsung): the browser's own install prompt.
   iPhone / iPad: a short "Share -> Add to Home Screen" guide. Hidden when the site is already open as the app.
   Also: confetti + "Congratulations!" when the app is installed (Android/computer) or first opened from the home
   screen (iPhone/iPad, which doesn't tell the site when it's added), and the site statistics shown in the admin
   page's Statistics tab (page views, Finder searches, clicks through to businesses, installs; no names or emails).
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
    '.cgg-app-card button{width:100%;border:0;border-radius:12px;background:#103e2f;color:#fffdf8;font:800 1rem/1 "DM Sans",system-ui,sans-serif;padding:14px;cursor:pointer}' +
    '.cgg-app-yay{text-align:center}.cgg-app-yay img{width:200px;max-width:70%;height:auto;display:block;margin:0 auto 12px}' +
    '.cgg-app-yay h2{font-size:1.6rem;margin-bottom:6px}.cgg-app-yay p{font-size:1rem;color:#4d5a51}' +
    '.cgg-app-confetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}' +
    '@keyframes cggAppPop{from{transform:scale(.75);opacity:0}to{transform:scale(1);opacity:1}}.cgg-app-yay{animation:cggAppPop .4s cubic-bezier(.2,1.3,.4,1)}';


  CSS +=
    '.cgg-agent-recruit-overlay{position:fixed;inset:0;z-index:2147482999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;background:rgba(9,41,30,.76)}' +
    '.cgg-agent-recruit-card{position:relative;width:min(510px,100%);padding:30px 30px 26px;border:1px solid #f5bd3e;border-radius:18px;background:#fbf5e8;color:#17271f;box-shadow:0 24px 80px #0005;text-align:center;font:16px/1.6 "DM Sans",system-ui,sans-serif}' +
    '.cgg-agent-recruit-close{position:absolute;top:10px;right:12px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#103e2f;font:400 1.8rem/1 "DM Sans",sans-serif;cursor:pointer}' +
    '.cgg-agent-recruit-logo{display:block;width:190px;max-width:72%;height:auto;max-height:70px;object-fit:contain;margin:2px auto 20px}' +
    '.cgg-agent-recruit-eyebrow{color:#9a6a0b;font-size:.7rem;font-weight:800;letter-spacing:.16em}' +
    '.cgg-agent-recruit-card h2{margin:9px 0 12px;color:#103e2f;font:700 clamp(1.8rem,5vw,2.35rem)/1.12 "Bricolage Grotesque","DM Sans",sans-serif;letter-spacing:-.03em}' +
    '.cgg-agent-recruit-rule{height:2px;width:64px;background:#f5bd3e;margin:0 auto 16px}' +
    '.cgg-agent-recruit-card p{margin:0 auto 22px;max-width:410px;color:#657268;font-size:.98rem}' +
    '.cgg-agent-recruit-actions{display:flex;flex-direction:column;align-items:center;gap:10px}' +
    '.cgg-agent-recruit-join{display:flex;align-items:center;justify-content:center;width:100%;padding:14px 18px;border:1px solid #103e2f;border-radius:10px;background:#103e2f;color:#fbf5e8;font-weight:800;text-decoration:none}' +
    '.cgg-agent-recruit-join:hover{background:#09291e;color:#f5bd3e}' +
    '.cgg-agent-recruit-later{border:0;background:transparent;padding:7px 12px;color:#657268;font:600 .9rem "DM Sans",sans-serif;cursor:pointer}' +
    '@media(max-width:480px){.cgg-agent-recruit-card{padding:28px 20px 22px;border-radius:14px}.cgg-agent-recruit-logo{width:165px;margin-bottom:15px}}' ;

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
    var row = el('div', 'cgg-app-row');
    var b = el('button', 'cgg-app-btn'); b.type = 'button';
    b.innerHTML = ICON; b.appendChild(el('span', '', LABEL));
    b.addEventListener('click', install);
    row.appendChild(b);
    var lang = document.querySelector('.cgg-lang-row');
    if (lang && lang.parentNode) lang.parentNode.insertBefore(row, lang.nextSibling);
    else { var f = document.querySelectorAll('footer'); f = f[f.length - 1]; (f ? (f.querySelector('.wrap') || f) : document.body).appendChild(row); }
  }

  // ---------- Congratulations ----------
  var YAY = {
    install: { site: 'The Christopher The Good Gringo app is installed. You\'ll find it on your home screen.',
               owner: 'The Christopher The Good Gringo business app is installed. You\'ll find it on your home screen.',
               admin: 'The Christopher The Good Gringo admin app is installed. You\'ll find it on your home screen.' },
    open: { site: 'Welcome to the Christopher The Good Gringo app! It\'s on your home screen now, one tap away.',
            owner: 'Welcome to the Christopher The Good Gringo business app! Your listing is one tap away now.',
            admin: 'Welcome to the Christopher The Good Gringo admin app! Your admin page is one tap away now.' }
  };
  function celebrated() { try { return localStorage.getItem('gg-app-celebrated-' + area) === '1'; } catch (e) { return true; } }
  function markCelebrated() { try { localStorage.setItem('gg-app-celebrated-' + area, '1'); } catch (e) {} }

  function confetti(host) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return function () {};
    var canvas = el('canvas', 'cgg-app-confetti'); canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext('2d'), W, H, dpr = window.devicePixelRatio || 1, stop = false;
    function size() { W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    var colors = ['#f5bd3e', '#103e2f', '#e85d3f', '#2f9e6e', '#fffdf8', '#5aa9e6'], bits = [];
    for (var i = 0; i < 180; i++) bits.push({ x: W / 2 + (Math.random() - .5) * 80, y: H * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[i % colors.length] });
    var t0 = performance.now();
    (function frame(t) {
      if (stop) return;
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      bits.forEach(function (b) {
        b.vy += .35; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        if (b.y < H + 20) alive = true;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)) + 1); ctx.restore();
      });
      if (alive && t - t0 < 6000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
    return function () { stop = true; removeEventListener('resize', size); };
  }

  function congratulate(kind) {
    markCelebrated();
    if (document.querySelector('.cgg-app-overlay')) document.querySelector('.cgg-app-overlay').remove();
    var o = el('div', 'cgg-app-overlay'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.style.alignItems = 'center';
    var c = el('div', 'cgg-app-card cgg-app-yay');
    var img = el('img'); img.src = '/assets/cgg-wordmark.svg?v=1'; img.alt = '';
    c.appendChild(img);
    c.appendChild(el('h2', '', 'Congratulations!'));
    c.appendChild(el('p', '', YAY[kind][area]));
    var go = el('button', '', 'Let\'s go'); go.type = 'button';
    var stop = function () {};
    function close() { stop(); o.remove(); }
    go.addEventListener('click', close);
    o.addEventListener('click', function (ev) { if (ev.target === o) close(); });
    c.appendChild(go); o.appendChild(c); document.body.appendChild(o);
    stop = confetti(o); go.focus();
  }


  // ---------- Agent recruitment popup (public site only) ----------
  function maybeRecruitAgents() {
    if (area !== 'site' || standalone() || /\/agents\.html$|\/admin\/|\/owner\//i.test(path)) return;
    var key = 'cgg-agent-recruit-dismissed';
    var preview = new URLSearchParams(location.search).get('recruit') === '1';
    try {
      var dismissed = Number(localStorage.getItem(key) || 0);
      if (!preview && dismissed && Date.now() - dismissed < 7 * 864e5) return;
    } catch (e) {}
    // Preview link forces the popup immediately, even if it was dismissed earlier.
    setTimeout(function () {
      if (!document.body || document.querySelector('.cgg-agent-recruit-overlay')) return;
      try {
        var last = Number(localStorage.getItem(key) || 0);
        if (!preview && last && Date.now() - last < 7 * 864e5) return;
      } catch (e) {}
      var es = (document.documentElement.lang || 'en').toLowerCase().indexOf('es') === 0;
      var overlay = el('div', 'cgg-agent-recruit-overlay');
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'cgg-agent-recruit-title');
      var card = el('section', 'cgg-agent-recruit-card');
      var close = el('button', 'cgg-agent-recruit-close', '×');
      close.type = 'button'; close.setAttribute('aria-label', es ? 'Cerrar' : 'Close');
      var logo = el('img', 'cgg-agent-recruit-logo');
      logo.src = '/assets/cgg-wordmark.svg?v=1'; logo.alt = 'Christopher the Good Gringo';
      var eyebrow = el('div', 'cgg-agent-recruit-eyebrow', es ? 'ÚNETE A NUESTRO EQUIPO' : 'JOIN OUR TEAM');
      var heading = el('h2', '', es ? 'Conviértete en agente' : 'Become a CGG Agent');
      heading.id = 'cgg-agent-recruit-title';
      var rule = el('div', 'cgg-agent-recruit-rule');
      var copy = el('p', '', es
        ? 'Ayuda a los viajeros a descubrir excelentes negocios independientes en Latinoamérica y gana comisiones elegibles.'
        : 'Help travelers discover outstanding independent businesses across Latin America and earn eligible commissions.');
      var actions = el('div', 'cgg-agent-recruit-actions');
      var join = el('a', 'cgg-agent-recruit-join', es ? 'Conviértete en agente' : 'Become an Agent');
      join.href = '/agents.html';
      var later = el('button', 'cgg-agent-recruit-later', es ? 'Quizás más tarde' : 'Maybe later');
      later.type = 'button';
      function dismiss() {
        try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
        overlay.remove();
      }
      close.addEventListener('click', dismiss);
      later.addEventListener('click', dismiss);
      overlay.addEventListener('click', function (ev) { if (ev.target === overlay) dismiss(); });
      function esc(ev) { if (ev.key === 'Escape' && document.body.contains(overlay)) { dismiss(); document.removeEventListener('keydown', esc); } }
      document.addEventListener('keydown', esc);
      actions.appendChild(join); actions.appendChild(later);
      card.appendChild(close); card.appendChild(logo); card.appendChild(eyebrow);
      card.appendChild(heading); card.appendChild(rule); card.appendChild(copy); card.appendChild(actions);
      overlay.appendChild(card); document.body.appendChild(overlay);
      join.focus();
    }, preview ? 500 : 10000);
  }

  // ---------- Statistics (admin page, Statistics tab) ----------
  var API = 'https://dhkyyhbfybbxczveyvfw.supabase.co/rest/v1/rpc/track_event';
  var KEY = 'sb_publishable_1gTur2LlYvXmRBPWW4D2HQ_TcgRM7c9';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function statsOff() {
    if (ls('gg-stats-test') === '1') return false; // lets the site's own tests run on a local copy
    if (area === 'admin' || ls('gg-no-stats') === '1') return true; // Christopher's own visits don't count
    if (navigator.webdriver || /bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(ua)) return true;
    return !/(^|\.)christopherthegoodgringo\.(com|github\.io)$/.test(location.hostname);
  }
  function visitor() {
    var v = ls('gg-visitor');
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12); ls('gg-visitor', v); }
    return v;
  }
  function device() {
    if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'tablet';
    return /Mobi|iPhone|iPod|Android/.test(ua) ? 'phone' : 'computer';
  }
  function pagePath() {
    return (/listing-information/.test(path) ? path + location.search : path).slice(0, 200);
  }
  function referrer() {
    var u = new URLSearchParams(location.search).get('utm_source');
    if (u) return u.slice(0, 100);
    try {
      var h = new URL(document.referrer).hostname;
      if (!h || h === location.hostname) return '';
      return h.replace(/^(www|m|l|lm|mobile)\./, '').slice(0, 100);
    } catch (e) { return ''; }
  }
  function track(kind, extra) {
    if (statsOff()) return;
    var body = { kind: kind, visitor: visitor(), path: pagePath(), lang: (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en',
      device: device(), app: standalone() };
    try { body.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    for (var k in extra || {}) body[k] = extra[k];
    try {
      fetch(API, { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: body }) }).catch(function () {});
    } catch (e) {}
  }

  function listingName(a) {
    var h1 = /listing-information/.test(path) && document.querySelector('main h1, h1');
    for (var n = a, i = 0; n && n !== document.body && i < 8; n = n.parentElement, i++) {
      var h = n.querySelector && n.querySelector('h2, h3, h4');
      if (h && h.textContent.trim()) return h.textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
    }
    return h1 ? h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '';
  }
  function clickTarget(href) {
    if (/^mailto:/i.test(href)) return 'email';
    if (/^tel:/i.test(href)) return 'phone';
    if (/wa\.me|whatsapp\.com/i.test(href)) return 'whatsapp';
    if (/hostelworld|booking\.com|airbnb|expedia|agoda/i.test(href)) return 'booking';
    if (/google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|waze\.com/i.test(href)) return 'map';
    if (/listing-information\.html/i.test(href)) return 'details';
    if (/^https?:/i.test(href)) { try { if (new URL(href).hostname !== location.hostname) return 'website'; } catch (e) {} }
    return '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.closest('header, footer, nav')) return;
    var t = clickTarget(a.getAttribute('href') || '');
    if (t) track('click', { target: t, listing: listingName(a) });
  }, true);

  function watchSearches() {
    var last = '', timer = null;
    document.querySelectorAll('form.filters').forEach(function (f) {
      function record() {
        var parts = [];
        f.querySelectorAll('select').forEach(function (s) { if (s.value) parts.push(s.value); });
        f.querySelectorAll('input[type=search], input[type=text]').forEach(function (i) { var v = i.value.trim(); if (v) parts.push(v.slice(0, 60)); });
        var q = parts.join(' · ').slice(0, 160);
        if (!q || q === last) return;
        last = q; track('search', { q: q });
      }
      function soon() { clearTimeout(timer); timer = setTimeout(record, 2500); }
      f.addEventListener('change', soon); f.addEventListener('input', soon);
      f.addEventListener('submit', function () { clearTimeout(timer); record(); });
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () {
    hide(); track('install');
    if (!celebrated()) congratulate('install');
  });
  // Commission agents: remember the agent whose link brought this visitor (first agent wins for 90 days).
  // The owner portal credits the business owner's account to that agent when they sign in.
  try {
    var ag = new URLSearchParams(location.search).get('agent');
    if (ag && /^[A-Za-z0-9]{3,20}$/.test(ag)) {
      var prevAg = JSON.parse(localStorage.getItem('gg-agent') || 'null');
      if (!prevAg || Date.now() - prevAg.at > 90 * 864e5) localStorage.setItem('gg-agent', JSON.stringify({ code: ag.toUpperCase(), at: Date.now() }));
    }
  } catch (e) {}

  function start() {
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    setTimeout(place, 0);
    maybeRecruitAgents();
    // The language popup comes first if it's showing; the welcome waits until it's closed.
    if (standalone() && !celebrated()) {
      track('app_open');
      (function wait(n) { if (document.querySelector('.cgg-lang-overlay') && n < 600) setTimeout(function () { wait(n + 1); }, 500); else setTimeout(function () { congratulate('open'); }, 400); })(0);
    }
    setTimeout(function () { track('view', { ref: referrer() }); watchSearches(); }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.CGGApp = { install: install, guide: guide, congratulate: congratulate, track: track };
})();
