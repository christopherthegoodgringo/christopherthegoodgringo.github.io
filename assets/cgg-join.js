/*
 * "Become a free member" popup for travelers.
 * Shows once per browser, right after the visitor's first search in a Finder (any page with <form class="filters">).
 * Joining saves name + email to the members table (Supabase function join_members), then shows confetti.
 * All text is in English; assets/cgg-i18n.js translates it when the visitor uses Spanish (entries in i18n/es.json).
 * Members are managed in the admin page, Mailing list tab.
 */
(function () {
  if (window.CGGJoin) return;
  var URL = 'https://dhkyyhbfybbxczveyvfw.supabase.co/rest/v1/rpc/join_members';
  var KEY = 'sb_publishable_1gTur2LlYvXmRBPWW4D2HQ_TcgRM7c9';
  var STORE = 'gg-member';
  function seen() { try { return !!localStorage.getItem(STORE); } catch (e) { return true; } }
  function mark(v) { try { localStorage.setItem(STORE, v); } catch (e) {} }
  function lang() { return (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en'; }
  function source() { return (location.pathname.replace(/^\/|\.html$/g, '') || 'home').slice(0, 60); }
  function el(tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(typeof arguments[i] === 'string' ? document.createTextNode(arguments[i]) : arguments[i]);
    return n;
  }

  var css = '.ggj-wrap{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(9,41,30,.62)}' +
    '.ggj-card{position:relative;width:min(430px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fffdf8;color:#17271f;border:2px solid #f5bd3e;border-radius:18px;padding:26px 22px 22px;text-align:center;box-shadow:0 25px 90px rgba(0,0,0,.35);font-family:"DM Sans",system-ui,sans-serif;animation:ggjPop .4s cubic-bezier(.2,1.3,.4,1)}' +
    '.ggj-card img{width:170px;max-width:60%;height:auto;margin:0 auto 10px;display:block}' +
    '.ggj-card h2{margin:0 0 6px;font:800 1.5rem/1.15 "Bricolage Grotesque","DM Sans",system-ui,sans-serif;color:#09291e;letter-spacing:-.02em}' +
    '.ggj-card p{margin:0 0 16px;color:#4d5a51;font-size:.95rem;line-height:1.5}' +
    '.ggj-card form{display:grid;gap:10px;text-align:left}' +
    '.ggj-card label{font-weight:700;font-size:.85rem;color:#09291e}' +
    '.ggj-card input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #c9cfc6;border-radius:10px;font:inherit;font-size:16px;background:#fff;color:#17271f}' +
    '.ggj-card input:focus{outline:2px solid #f5bd3e;outline-offset:1px;border-color:#103e2f}' +
    '.ggj-btn{display:block;width:100%;margin-top:6px;padding:13px 16px;border:0;border-radius:10px;background:#103e2f;color:#fffdf8;font:800 1rem/1.2 inherit;font-family:inherit;cursor:pointer;border:1px solid #f5bd3e}' +
    '.ggj-btn:disabled{opacity:.6;cursor:wait}' +
    '.ggj-skip{display:inline-block;margin-top:12px;background:none;border:0;color:#657268;font:600 .9rem inherit;font-family:inherit;text-decoration:underline;cursor:pointer}' +
    '.ggj-x{position:absolute;top:8px;right:10px;width:36px;height:36px;border:0;background:none;color:#657268;font-size:1.5rem;line-height:1;cursor:pointer;border-radius:50%}' +
    '.ggj-x:hover{background:#f1ece0}' +
    '.ggj-fine{margin:12px 0 0!important;font-size:.78rem!important;color:#7a857d!important;text-align:center}' +
    '.ggj-fine a{color:#103e2f}' +
    '.ggj-err{margin:4px 0 0!important;color:#b3261e!important;font-size:.88rem!important;font-weight:600}' +
    '.ggj-icon{font-size:2.6rem;line-height:1;margin-bottom:4px}' +
    '.ggj-confetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}' +
    '@keyframes ggjPop{from{transform:scale(.75);opacity:0}to{transform:scale(1);opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.ggj-card{animation:none}}';

  function confetti(host) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return function () {};
    var canvas = el('canvas', { 'class': 'ggj-confetti', 'aria-hidden': 'true' });
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

  function open() {
    if (document.querySelector('.ggj-wrap')) return;
    if (!document.getElementById('ggj-css')) { var st = el('style', { id: 'ggj-css' }); st.textContent = css; document.head.appendChild(st); }
    var lastFocus = document.activeElement, stopConfetti = function () {};
    var wrap = el('div', { 'class': 'ggj-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ggjTitle' });
    var card = el('div', { 'class': 'ggj-card' });
    wrap.appendChild(card);
    function close() { stopConfetti(); wrap.remove(); document.removeEventListener('keydown', onKey); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
    function onKey(e) { if (e.key === 'Escape') { if (!seen()) mark('dismissed'); close(); } }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) { if (!seen()) mark('dismissed'); close(); } });

    var name = el('input', { id: 'ggjName', type: 'text', autocomplete: 'name', required: 'required', maxlength: '120', placeholder: 'Your name' });
    var email = el('input', { id: 'ggjEmail', type: 'email', autocomplete: 'email', required: 'required', maxlength: '254', placeholder: 'you@example.com', inputmode: 'email' });
    var err = el('p', { 'class': 'ggj-err', role: 'alert', hidden: 'hidden' });
    var btn = el('button', { 'class': 'ggj-btn', type: 'submit', text: 'Join for free' });
    var form = el('form', { novalidate: 'novalidate' },
      el('label', { 'for': 'ggjName', text: 'Name' }), name,
      el('label', { 'for': 'ggjEmail', text: 'Email' }), email, err, btn);
    var x = el('button', { 'class': 'ggj-x', type: 'button', 'aria-label': 'Close', text: '×' });
    var skip = el('button', { 'class': 'ggj-skip', type: 'button', text: 'No thanks, keep searching' });
    x.addEventListener('click', function () { mark('dismissed'); close(); });
    skip.addEventListener('click', function () { mark('dismissed'); close(); });
    card.appendChild(x);
    card.appendChild(el('img', { src: '/assets/cgg-wordmark.svg', alt: 'Christopher the Good Gringo' }));
    card.appendChild(el('h2', { id: 'ggjTitle', text: 'Become a free member' }));
    card.appendChild(el('p', { text: "Get Christopher's favorite independent places, new finds and travel tips for Latin America by email. It's free." }));
    card.appendChild(form);
    card.appendChild(el('p', { 'class': 'ggj-fine' }, 'We only email you about Christopher the Good Gringo, and you can unsubscribe any time. ', el('a', { href: '/privacy-policy.html', target: '_blank', text: 'Privacy Policy' })));
    card.appendChild(skip);
    document.body.appendChild(wrap);
    setTimeout(function () { name.focus({ preventScroll: true }); }, 50);

    function showErr(t) { err.textContent = t; err.hidden = false; }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true;
      var n = name.value.trim(), m = email.value.trim();
      if (!n) { name.focus(); return showErr('Please enter your name.'); }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { email.focus(); return showErr('Please enter a valid email address.'); }
      btn.disabled = true;
      fetch(URL, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_name: n, p_email: m, p_language: lang(), p_source: source() }) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (res) { mark('joined'); success(res === 'existing'); })
        .catch(function () { btn.disabled = false; showErr('Something went wrong. Please try again.'); });
    });

    function success(already) {
      card.replaceChildren(
        el('div', { 'class': 'ggj-icon', 'aria-hidden': 'true', text: '🎉' }),
        el('h2', { id: 'ggjTitle', text: already ? "You're already a member!" : 'Congratulations!' }),
        el('p', { text: already ? 'Good to see you again. Happy exploring!' : "You're now a free Good Gringo member. Watch your inbox for Christopher's best finds." }));
      var go = el('button', { 'class': 'ggj-btn', type: 'button', text: 'Keep exploring' });
      go.addEventListener('click', close);
      card.appendChild(go);
      go.focus({ preventScroll: true });
      if (!already) stopConfetti = confetti(wrap);
    }
  }

  // Wait for the visitor's first search: a country/city pick, a typed search, or the search button.
  function watch() {
    if (seen()) return;
    var forms = document.querySelectorAll('form.filters');
    if (!forms.length) return;
    var timer = null, fired = false;
    function trigger() {
      if (fired || seen()) return;
      fired = true;
      setTimeout(open, 1500); // let the results show first
    }
    forms.forEach(function (f) {
      f.addEventListener('change', function (e) { if (e.target && e.target.value) trigger(); });
      f.addEventListener('submit', trigger);
      f.addEventListener('input', function (e) {
        if (!e.target || e.target.type !== 'search') return;
        clearTimeout(timer);
        if (e.target.value.trim().length >= 3) timer = setTimeout(trigger, 1200);
      });
    });
  }
  window.CGGJoin = { open: open };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
