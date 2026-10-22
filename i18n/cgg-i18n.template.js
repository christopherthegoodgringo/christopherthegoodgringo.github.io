/*
 * Christopher The Good Gringo: English / Spanish switcher for every page.
 *
 * - First visit: a popup asks English or Español.
 * - Every page: a toggle in the footer switches back and forth.
 * - The choice is remembered in this browser (localStorage "gg-lang").
 * - Pages are written in English. In Spanish mode, every piece of text is
 *   swapped for its Spanish version from i18n/es.json, including text the
 *   page adds later (search results, messages, forms).
 *
 * DO NOT EDIT assets/cgg-i18n.js BY HAND. Edit this template or i18n/es.json,
 * then run:  python3 i18n/build.py
 * To find English text that is missing a translation, run:
 *   python3 i18n/check.py
 */
(function () {
  'use strict';
  if (window.CGGI18N) return;

  var KEY = 'gg-lang';
  var ES = /*__DICT__*/{};

  // Shorter Spanish labels for the top menu, where space is tight.
  var ES_HEADER = {
    'Hotel Finder': 'Hoteles', 'Hostel Finder': 'Hostales', 'Restaurant Finder': 'Restaurantes',
    'Bar Finder': 'Bares', 'Street Food Finder': 'Comida callejera', 'Meet the Team': 'Equipo',
    'Social Media & Contact': 'Redes y contacto', 'Ebooks': 'Libros', 'Business & Sponsorship': 'Negocios'
  };

  // Countries and cities that appear inside longer phrases.
  var PLACES = {
    'Belize': 'Belice', 'Dominican Republic': 'República Dominicana', 'Mexico': 'México',
    'Panama': 'Panamá', 'Peru': 'Perú', 'Brazil': 'Brasil',
    'Mexico City': 'Ciudad de México', 'Panama City': 'Ciudad de Panamá',
    'Guatemala City': 'Ciudad de Guatemala', 'Belize City': 'Ciudad de Belice', 'Havana': 'La Habana',
    'Latin America': 'Latinoamérica'
  };
  function place(s) {
    return String(s).split(', ').map(function (p) { return PLACES[p] || ES[p] || p; }).join(', ');
  }
  function plural(n, one, many) { return String(n) + ' ' + (Number(String(n).replace(/[^0-9]/g, '')) === 1 ? one : many); }
  function tr(s) { return lookup(s) || s; }

  // Text that contains numbers or names: matched by pattern.
  var PATTERNS = [
    [/^([\d,]+) bars? found$/, function (m) { return plural(m[1], 'bar encontrado', 'bares encontrados'); }],
    [/^([\d,]+) stays? found$/, function (m) { return plural(m[1], 'alojamiento encontrado', 'alojamientos encontrados'); }],
    [/^([\d,]+) restaurants? found$/, function (m) { return plural(m[1], 'restaurante encontrado', 'restaurantes encontrados'); }],
    [/^([\d,]+) places? found$/, function (m) { return plural(m[1], 'lugar encontrado', 'lugares encontrados'); }],
    [/^([\d,]+) hostels? found$/, function (m) { return plural(m[1], 'hostal encontrado', 'hostales encontrados'); }],
    [/^([\d,]+) hotels? found$/, function (m) { return plural(m[1], 'hotel encontrado', 'hoteles encontrados'); }],
    [/^([\d,]+) listings? found$/, function (m) { return plural(m[1], 'listado encontrado', 'listados encontrados'); }],
    [/^([\d,]+) results? found$/, function (m) { return plural(m[1], 'resultado encontrado', 'resultados encontrados'); }],
    [/^([\d,]+) of ([\d,]+) hostels? found$/, function (m) { return m[1] + ' de ' + m[2] + ' hostales encontrados'; }],
    [/^([\d,]+) of ([\d,]+) (\w+) found$/, function (m) { return m[1] + ' de ' + m[2] + ' ' + (tr(m[3][0].toUpperCase() + m[3].slice(1)).toLowerCase()) + ' encontrados'; }],
    [/^Showing ([\d,]+) of ([\d,]+)(.*)$/, function (m) { return 'Mostrando ' + m[1] + ' de ' + m[2] + (m[3] ? ' ' + tr(m[3].trim()).toLowerCase() : ''); }],
    [/^Showing ([\d,]+) AI personas?$/, function (m) { return 'Mostrando ' + plural(m[1], 'perfil de IA', 'perfiles de IA'); }],
    [/^Showing ([\d,]+) (.+)$/, function (m) { return 'Mostrando ' + m[1] + ' ' + tr(m[2]).toLowerCase(); }],
    [/^Load more (.+)$/, function (m) { return 'Ver más ' + tr(m[1][0].toUpperCase() + m[1].slice(1)).toLowerCase(); }],
    [/^Hostels in (.+)$/, function (m) { return 'Hostales en ' + place(m[1]); }],
    [/^Hotels in (.+)$/, function (m) { return 'Hoteles en ' + place(m[1]); }],
    [/^Restaurants in (.+)$/, function (m) { return 'Restaurantes en ' + place(m[1]); }],
    [/^Independent bars in (.+)$/, function (m) { return 'Bares independientes en ' + place(m[1]); }],
    [/^Independent restaurants in (.+)$/, function (m) { return 'Restaurantes independientes en ' + place(m[1]); }],
    [/^Boutique & independent hotels in (.+)$/, function (m) { return 'Hoteles boutique e independientes en ' + place(m[1]); }],
    [/^Street food in (.+)$/, function (m) { return 'Comida callejera en ' + place(m[1]); }],
    [/^Street food markets & local bites in (.+)$/, function (m) { return 'Mercados y comida callejera en ' + place(m[1]); }],
    [/^More information about (.+)$/, function (m) { return 'Más información sobre ' + m[1]; }],
    [/^Rating source: (.+)$/, function (m) { return 'Fuente de la calificación: ' + tr(m[1]); }],
    [/^Google, ([\d,.]+) reviews? \(checked (\w+) (\d{4})\)$/, function (m) { return 'Google, ' + m[1] + ' reseñas (consultado en ' + month(m[2]) + ' de ' + m[3] + ')'; }],
    [/^Hostelworld ([\d.]+\/10) from ([\d,.]+) reviews? \(checked (\w+) (\d{4})\)$/, function (m) { return 'Hostelworld ' + m[1] + ' con ' + m[2] + ' reseñas (consultado en ' + month(m[3]) + ' de ' + m[4] + ')'; }],
    [/^([\d,.]+) reviews?$/, function (m) { return m[1] + ' reseñas'; }],
    [/^Virtual base: (.+)$/, function (m) { return 'Base virtual: ' + place(m[1]); }],
    [/^Illustrated portrait of (.+)$/, function (m) { return 'Retrato ilustrado de ' + m[1]; }],
    [/^AI persona: (.+)$/, function (m) { return 'Perfil de IA: ' + tr(m[1]); }],
    [/^(.+) — AI persona: (.+)$/, function (m) { return m[1] + ' — Perfil de IA: ' + tr(m[2]); }],
    [/^(Marketing|Social Media|Content Creator|Web Design|Local Research|Partnerships) — (.+)$/, function (m) { return tr(m[1]) + ' — ' + place(m[2]); }],
    [/^(.+) — (Marketing|Social Media|Content Creator|Web Design|Local Research|Partnerships) — (.+)$/, function (m) { return m[1] + ' — ' + tr(m[2]) + ' — ' + place(m[3]); }],
    [/^All (\d+) countries$/, function (m) { return 'Los ' + m[1] + ' países'; }],
    [/^Signed in as (.+)$/, function (m) { return 'Sesión iniciada como ' + m[1]; }],
    [/^Level requested: (.+)$/, function (m) { return 'Nivel solicitado: ' + tr(m[1]); }],
    [/^Current tier: (.+)$/, function (m) { return 'Nivel actual: ' + tr(m[1]); }],
    [/^Wants (.+)$/, function (m) { return 'Quiere ' + tr(m[1]); }],
    [/^Approve (bronze|silver|gold|platinum)$/i, function (m) { return 'Aprobar ' + tr(m[1]); }],
    [/^This claim was not approved\. Note: (.+)$/, function (m) { return 'Esta solicitud no fue aprobada. Nota: ' + tr(m[1]); }],
    [/^Last contacted (.+?)(?: \((\d+) times\))?$/, function (m) { return 'Último contacto: ' + m[1] + (m[2] ? ' (' + m[2] + ' veces)' : ''); }],
    [/^(\d+) of (\d+) businesses · (\d+) WhatsApped · (\d+) emailed · (\d+) both · (\d+) replied · (\d+) claimed$/, function (m) { return m[1] + ' de ' + m[2] + ' negocios · ' + m[3] + ' por WhatsApp · ' + m[4] + ' por correo · ' + m[5] + ' por ambos · ' + m[6] + ' respondieron · ' + m[7] + ' reclamados'; }],
    [/^Switch to (Bronze|Silver|Gold|Platinum)$/, function (m) { return 'Cambiar a ' + tr(m[1]); }],
    [/^Upgrade (.+)$/, function (m) { return m[1] === 'your listing' ? 'Sube de nivel tu listado' : 'Subir de nivel: ' + m[1]; }],
    [/^Request (Bronze|Silver|Gold|Platinum)$/, function (m) { return 'Solicitar ' + tr(m[1]); }],
    [/^Choose (Bronze|Silver|Gold|Platinum)$/, function (m) { return 'Elegir ' + tr(m[1]); }],
    [/^(Bronze|Silver|Gold|Platinum) · (.+)$/, function (m) { return tr(m[1]) + ' · ' + tr(m[2]); }],
    [/^([●♛★◆]\s*)(.+)$/, function (m) { var t = lookup(m[2]); return t ? m[1] + t : null; }],
    [/^Gallery photo (\d+)$/, function (m) { return 'Foto de la galería ' + m[1]; }],
    [/^Remove photo (\d+)$/, function (m) { return 'Quitar foto ' + m[1]; }],
    [/^Add photos \((.+)\)$/, function (m) { return 'Agregar fotos (' + m[1].replace(/\bleft\b/, 'disponibles').replace(/\bof\b/, 'de') + ')'; }],
    [/^Verify by WhatsApp: (.+)$/, function (m) { return 'Verificar por WhatsApp: ' + m[1]; }],
    [/^Verify by email: (.+)$/, function (m) { return 'Verificar por correo: ' + m[1]; }],
    [/^Could not load your businesses: (.+)$/, function (m) { return 'No se pudieron cargar tus negocios: ' + m[1]; }],
    [/^Could not request the upgrade: (.+)$/, function (m) { return 'No se pudo solicitar el cambio de nivel: ' + m[1]; }],
    [/^Could not send your business: (.+)$/, function (m) { return 'No se pudo enviar tu negocio: ' + m[1]; }],
    [/^Could not submit your claim: (.+)$/, function (m) { return 'No se pudo enviar tu solicitud: ' + m[1]; }],
    [/^(.+) is now linked to your account at Bronze\. You can manage it or upgrade any time from My businesses\.$/, function (m) { return m[1] + ' ya está vinculado a tu cuenta como Bronce. Puedes administrarlo o subir de nivel cuando quieras desde Mis negocios.'; }],
    [/^New business · (.+)$/, function (m) { return 'Negocio nuevo · ' + m[1]; }],
    [/^(.+) \| Christopher [Tt]he Good Gringo(™?)$/, function (m) { var t = lookup(m[1]); return t ? t + ' | Christopher The Good Gringo' + m[2] : null; }],
    [/^(.+) \((\d+)\)$/, function (m) { var t = lookup(m[1]); return t ? t + ' (' + m[2] + ')' : null; }],
    [/^(.+):$/, function (m) { var t = lookup(m[1]); return t ? t + ':' : null; }]
  ];
  var MONTHS = { January: 'enero', February: 'febrero', March: 'marzo', April: 'abril', May: 'mayo', June: 'junio', July: 'julio', August: 'agosto', September: 'septiembre', October: 'octubre', November: 'noviembre', December: 'diciembre' };
  function month(m) { return MONTHS[m] || m; }

  var depth = 0;
  function lookup(s) {
    if (!s) return null;
    if (Object.prototype.hasOwnProperty.call(ES, s)) return ES[s];
    if (depth > 3) return null;
    depth++;
    try {
      for (var i = 0; i < PATTERNS.length; i++) {
        var m = PATTERNS[i][0].exec(s);
        if (m) { var r = PATTERNS[i][1](m); if (r) return r; }
      }
    } finally { depth--; }
    return null;
  }

  // ---------- language state ----------
  function stored() { try { var v = localStorage.getItem(KEY); return v === 'es' || v === 'en' ? v : null; } catch (e) { return null; } }
  // The language popup shows on the home page every time (arriving or clicking Home), and on the
  // first page of a visit when someone enters the site somewhere else.
  function isHome() { return location.pathname === '/' || location.pathname === '/index.html'; }
  function chosenThisVisit() { try { return sessionStorage.getItem('gg-lang-session') === '1'; } catch (e) { return false; } }
  var lang = stored() === 'es' ? 'es' : 'en';
  // A link with ?lang=es or ?lang=en (e.g. from an outreach message) opens the site in that language.
  try {
    var urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang === 'es' || urlLang === 'en') {
      lang = urlLang;
      localStorage.setItem(KEY, urlLang); localStorage.setItem('gg-lang-chosen', '1'); sessionStorage.setItem('gg-lang-session', '1');
    }
  } catch (e) {}
  document.documentElement.lang = lang;

  // ---------- translating the page ----------
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, svg: 1, SVG: 1 };
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var textOrig = new WeakMap(), textMine = new WeakMap(), attrOrig = new WeakMap();
  var touched = new Set(), attrTouched = new Set();
  var titleOrig = null;

  function skipped(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (SKIP_TAGS[e.tagName]) return true;
      if (e.hasAttribute('data-no-translate') || e.getAttribute('translate') === 'no' || e.isContentEditable) return true;
      var c = e.classList;
      if (c && (c.contains('en') || c.contains('es'))) return true;
    }
    return false;
  }

  function doText(node) {
    var cur = node.nodeValue;
    if (textMine.get(node) === cur) return;          // our own Spanish text
    if (!cur || !/[A-Za-z]/.test(cur)) return;
    var core = cur.replace(/\s+/g, ' ').trim();
    var es = null, p = node.parentElement;
    if (ES_HEADER[core] && p && p.closest && p.closest('header')) es = ES_HEADER[core];
    if (es == null) es = lookup(core);
    textOrig.set(node, cur);
    touched.add(node);
    if (es == null) { textMine.delete(node); return; }
    var lead = /^\s*/.exec(cur)[0], trail = /\s*$/.exec(cur)[0];
    var out = lead + es + trail;
    textMine.set(node, out);
    if (out !== cur) node.nodeValue = out;
  }

  function doAttrs(el) {
    var saved = attrOrig.get(el) || {};
    var list = ATTRS.slice();
    if (el.tagName === 'INPUT' && /^(submit|button|reset)$/i.test(el.type)) list.push('value');
    for (var i = 0; i < list.length; i++) {
      var a = list[i], v = el.getAttribute(a);
      if (!v || !/[A-Za-z]/.test(v)) continue;
      if (saved[a] && saved[a].mine === v) continue;
      var es = lookup(v.replace(/\s+/g, ' ').trim());
      saved[a] = { orig: v, mine: es != null ? es : v };
      if (es != null && es !== v) el.setAttribute(a, es);
    }
    attrOrig.set(el, saved);
    attrTouched.add(el);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && skipped(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (SKIP_TAGS[n.tagName] || n.hasAttribute('data-no-translate') || n.getAttribute('translate') === 'no' ||
              (n.classList && (n.classList.contains('en') || n.classList.contains('es')))) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    if (root.nodeType === 1) doAttrs(root);
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }

  function doTitle() {
    var t = document.title;
    if (titleOrig === null || (t !== titleOrig && t !== lookup(titleOrig))) titleOrig = t;
    var es = lookup(titleOrig.replace(/\s+/g, ' ').trim());
    if (es && document.title !== es) document.title = es;
  }

  function toSpanish() { walk(document.body); doTitle(); }

  function toEnglish() {
    touched.forEach(function (n) {
      var o = textOrig.get(n);
      if (o != null && textMine.get(n) === n.nodeValue && n.nodeValue !== o) n.nodeValue = o;
      textMine.delete(n);
    });
    touched.clear();
    attrTouched.forEach(function (el) {
      var saved = attrOrig.get(el) || {};
      Object.keys(saved).forEach(function (a) { if (el.getAttribute(a) === saved[a].mine) el.setAttribute(a, saved[a].orig); });
      attrOrig.delete(el);
    });
    attrTouched.clear();
    if (titleOrig !== null) { document.title = titleOrig; titleOrig = null; }
  }

  var observer = new MutationObserver(function (muts) {
    if (lang !== 'es') return;
    observer.disconnect();
    try {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { if (!skipped(m.target.parentElement)) doText(m.target); }
        else if (m.type === 'attributes') { if (!skipped(m.target)) doAttrs(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) {
          var a = m.addedNodes[j];
          if (a.nodeType === 3 ? !skipped(a.parentElement) : true) walk(a);
        }
      }
      doTitle();
    } finally { observe(); }
  });
  function observe() {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value']) });
    var t = document.querySelector('title');
    if (t) observer.observe(t, { childList: true, characterData: true, subtree: true });
  }

  // ---------- switching ----------
  function setLang(l, remember) {
    l = l === 'es' ? 'es' : 'en';
    try { localStorage.setItem(KEY, l); if (remember) { localStorage.setItem('gg-lang-chosen', '1'); sessionStorage.setItem('gg-lang-session', '1'); } } catch (e) {}
    var changed = l !== lang;
    lang = l;
    document.documentElement.lang = l;
    observer.disconnect();
    if (l === 'es') toSpanish(); else if (changed) toEnglish();
    observe();
    syncToggles();
    try { document.dispatchEvent(new CustomEvent('cgg:language', { detail: { lang: l } })); } catch (e) {}
  }

  // ---------- footer toggle ----------
  var CSS = '' +
    '.cgg-lang-toggle{display:inline-flex;align-items:center;gap:2px;padding:3px;border:1px solid #f5bd3e99;border-radius:999px;background:#f5bd3e12;vertical-align:middle;font-family:inherit}' +
    '.cgg-lang-toggle button{border:0;margin:0;background:transparent;color:#fffdf8;font:700 .78rem/1 inherit;font-family:inherit;padding:6px 12px;border-radius:999px;cursor:pointer;opacity:.75}' +
    '.cgg-lang-toggle button:hover{opacity:1}' +
    '.cgg-lang-toggle button[aria-pressed="true"]{background:#f5bd3e;color:#09291e;opacity:1}' +
    '.cgg-lang-toggle button:focus-visible{outline:2px solid #f5bd3e;outline-offset:2px}' +
    '.cgg-lang-footer{background:#09291e;color:#cbd8cf;padding:18px 16px;text-align:center;font:.84rem/1.6 "DM Sans",system-ui,sans-serif}' +
    '.cgg-lang-row{display:flex;justify-content:center;width:100%;margin-top:4px}' +
    '.cgg-lang-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(9,41,30,.82);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}' +
    '.cgg-lang-card{width:min(420px,100%);background:#fffdf8;color:#17271f;border-radius:18px;padding:28px 22px 24px;text-align:center;box-shadow:0 25px 90px rgba(0,0,0,.35);border:1px solid #f5bd3e;font-family:"DM Sans",system-ui,sans-serif}' +
    '.cgg-lang-card img{width:190px;max-width:70%;height:auto;margin:0 auto 12px;display:block}' +
    '.cgg-lang-card h2{margin:0 0 4px;font:800 1.45rem/1.15 "Bricolage Grotesque","DM Sans",system-ui,sans-serif;letter-spacing:-.02em;color:#09291e}' +
    '.cgg-lang-card p{margin:0 0 20px;color:#657268;font-size:.95rem}' +
    '.cgg-lang-choices{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.cgg-lang-choices button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:16px 10px;border-radius:14px;border:2px solid #e6ddca;background:#fff;color:#09291e;font:800 1.05rem/1.2 "DM Sans",system-ui,sans-serif;cursor:pointer;transition:border-color .15s,background .15s,transform .15s}' +
    '.cgg-lang-choices button span{font-weight:600;font-size:.8rem;color:#657268}' +
    '.cgg-lang-choices button:hover,.cgg-lang-choices button:focus-visible{border-color:#f5bd3e;background:#fff8df;outline:none;transform:translateY(-1px)}' +
    '@media(max-width:360px){.cgg-lang-choices{grid-template-columns:1fr}}';

  function makeToggle() {
    var g = document.createElement('div');
    g.className = 'cgg-lang-toggle';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Language / Idioma');
    g.setAttribute('data-no-translate', '');
    [['en', 'English'], ['es', 'Español']].forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button'; b.lang = p[0]; b.textContent = p[1];
      b.setAttribute('data-lang', p[0]);
      b.addEventListener('click', function () { setLang(p[0], true); });
      g.appendChild(b);
    });
    return g;
  }
  function syncToggles() {
    var bs = document.querySelectorAll('.cgg-lang-toggle button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-lang') === lang ? 'true' : 'false');
  }
  function placeToggle() {
    if (document.querySelector('.cgg-lang-toggle')) return;
    var footers = document.querySelectorAll('footer');
    var footer = footers[footers.length - 1];
    if (!footer) {
      footer = document.createElement('footer');
      footer.className = 'cgg-lang-footer';
      document.body.appendChild(footer);
    }
    var row = document.createElement('div');
    row.className = 'cgg-lang-row';
    row.setAttribute('data-no-translate', '');
    row.appendChild(makeToggle());
    var host = footer.querySelector('.wrap') || footer;
    host.appendChild(row);
    syncToggles();
  }

  // ---------- first-visit popup ----------
  function showChooser() {
    if (document.querySelector('.cgg-lang-overlay')) return;
    if (!isHome() && chosenThisVisit()) return;
    try { if (/^(es|en)$/.test(new URLSearchParams(location.search).get('lang') || '')) return; } catch (e) {}
    var o = document.createElement('div');
    o.className = 'cgg-lang-overlay';
    o.setAttribute('data-no-translate', '');
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-labelledby', 'cggLangTitle');
    o.innerHTML = '<div class="cgg-lang-card">' +
      '<img src="/assets/cgg-wordmark.svg?v=1" alt="" onerror="this.remove()">' +
      '<h2 id="cggLangTitle">Choose your language<br>Elige tu idioma</h2>' +
      '<p>You can change it any time at the bottom of the page.<br>Puedes cambiarlo cuando quieras al final de la página.</p>' +
      '<div class="cgg-lang-choices">' +
      '<button type="button" lang="en" data-lang="en">English<span>Continue in English</span></button>' +
      '<button type="button" lang="es" data-lang="es">Español<span>Continuar en español</span></button>' +
      '</div></div>';
    o.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang'), true); o.remove(); });
    });
    document.body.appendChild(o);
    var pick = stored() || (navigator.language && /^es\b/i.test(navigator.language) ? 'es' : 'en');
    var first = o.querySelector('button[data-lang="' + pick + '"]');
    if (first) first.focus();
  }

  function start() {
    var st = document.createElement('style');
    st.id = 'cgg-i18n-style';
    st.textContent = CSS;
    document.head.appendChild(st);
    placeToggle();
    if (lang === 'es') toSpanish();
    observe();
    showChooser();
    // Pages that set the language themselves on load must not override the visitor's choice.
    setTimeout(function () { if (document.documentElement.lang !== lang) document.documentElement.lang = lang; }, 0);
  }

  window.CGGI18N = {
    get lang() { return lang; },
    set: function (l) { setLang(l, true); },
    t: function (s) { return lang === 'es' ? (lookup(String(s).replace(/\s+/g, ' ').trim()) || s) : s; },
    lookup: lookup
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
