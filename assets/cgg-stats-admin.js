/*
 * Statistics tab in the admin page: page views, visitors, Finder searches, clicks through to businesses,
 * app installs and new members, with a daily chart and top lists. Data: public.site_stats() (supabase/015_site_stats.sql),
 * collected by assets/cgg-app.js on every page. Christopher's own visits aren't counted (localStorage gg-no-stats).
 * Countries are approximate: they come from the visitor's device time zone (no IP addresses are stored).
 * All text is English; assets/cgg-i18n.js translates it (i18n/es.json).
 */
(function () {
  var P = window.CGGPortal, el = P.el, sb = P.client();
  var $ = function (id) { return document.getElementById(id); };
  var days = 30, data = null, busy = false, ebooks = null;

  var PAGES = {
    '/': 'Home', '/index.html': 'Home', '/hostels.html': 'Hostel Finder', '/hotels.html': 'Hotel Finder',
    '/restaurants.html': 'Restaurant Finder', '/bars.html': 'Bar Finder', '/street-food-finder.html': 'Street Food Finder',
    '/premium-listings.html': 'Platinum, Gold & Silver Listings', '/team/': 'Meet the Team', '/social-media.html': 'Social Media & Contact',
    '/owner/': 'Business Owner Portal', '/get-featured/': 'Get Featured', '/business-sponsorship.html': 'Business Sponsorship',
    '/claim-hostel.html': 'Claim your hostel', '/ebooks.html': 'Ebooks', '/merch.html': 'Merch', '/privacy-policy.html': 'Privacy Policy',
    '/terms-of-use.html': 'Terms of Use', '/porthos-platinum.html': 'Porthos Steakhouse & Pub', '/offline.html': 'Offline'
  };
  var CODES = { AR: 'Argentina', BO: 'Bolivia', BR: 'Brazil', BZ: 'Belize', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba',
    DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', MX: 'Mexico', NI: 'Nicaragua',
    PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', UY: 'Uruguay', VE: 'Venezuela' };
  var TZ = {
    Bogota: 'Colombia', Lima: 'Peru', Guatemala: 'Guatemala', Costa_Rica: 'Costa Rica', El_Salvador: 'El Salvador', Tegucigalpa: 'Honduras',
    Managua: 'Nicaragua', Panama: 'Panama', Santo_Domingo: 'Dominican Republic', Puerto_Rico: 'Puerto Rico', Havana: 'Cuba',
    Guayaquil: 'Ecuador', Galapagos: 'Ecuador', La_Paz: 'Bolivia', Santiago: 'Chile', Punta_Arenas: 'Chile', Easter: 'Chile',
    Montevideo: 'Uruguay', Asuncion: 'Paraguay', Caracas: 'Venezuela', Belize: 'Belize',
    Mexico_City: 'Mexico', Cancun: 'Mexico', Merida: 'Mexico', Monterrey: 'Mexico', Matamoros: 'Mexico', Chihuahua: 'Mexico',
    Ciudad_Juarez: 'Mexico', Ojinaga: 'Mexico', Mazatlan: 'Mexico', Bahia_Banderas: 'Mexico', Hermosillo: 'Mexico', Tijuana: 'Mexico',
    Sao_Paulo: 'Brazil', Bahia: 'Brazil', Fortaleza: 'Brazil', Recife: 'Brazil', Manaus: 'Brazil', Belem: 'Brazil', Cuiaba: 'Brazil',
    Campo_Grande: 'Brazil', Porto_Velho: 'Brazil', Boa_Vista: 'Brazil', Rio_Branco: 'Brazil', Maceio: 'Brazil', Araguaina: 'Brazil',
    Santarem: 'Brazil', Noronha: 'Brazil',
    New_York: 'United States', Chicago: 'United States', Denver: 'United States', Los_Angeles: 'United States', Phoenix: 'United States',
    Anchorage: 'United States', Detroit: 'United States', Boise: 'United States', Honolulu: 'United States', Juneau: 'United States',
    Toronto: 'Canada', Vancouver: 'Canada', Edmonton: 'Canada', Winnipeg: 'Canada', Halifax: 'Canada', St_Johns: 'Canada', Regina: 'Canada',
    Montreal: 'Canada', London: 'United Kingdom', Madrid: 'Spain', Paris: 'France', Berlin: 'Germany', Amsterdam: 'Netherlands',
    Rome: 'Italy', Lisbon: 'Portugal', Zurich: 'Switzerland', Dublin: 'Ireland', Brussels: 'Belgium', Vienna: 'Austria',
    Stockholm: 'Sweden', Oslo: 'Norway', Copenhagen: 'Denmark', Sydney: 'Australia', Melbourne: 'Australia', Brisbane: 'Australia',
    Perth: 'Australia', Auckland: 'New Zealand', Tel_Aviv: 'Israel', Jerusalem: 'Israel'
  };
  var TARGETS = { website: 'Website', booking: 'Booking', whatsapp: 'WhatsApp', email: 'Email', phone: 'Phone call', map: 'Map', details: 'More information', other: 'Other' };
  var DEVICES = { phone: 'Phone', tablet: 'Tablet', computer: 'Computer' };
  var LANGS = { en: 'English', es: 'Spanish' };

  function lang() { return (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en'; }
  function num(n) { try { return Number(n || 0).toLocaleString(lang() === 'es' ? 'es-CO' : 'en-US'); } catch (e) { return String(n || 0); } }
  function country(tz) {
    if (!tz) return 'Unknown';
    var parts = tz.split('/'), city = parts[parts.length - 1];
    if (parts[0] === 'America' && parts[1] === 'Argentina') return 'Argentina';
    if (parts[0] === 'America' && (parts[1] === 'Indiana' || parts[1] === 'Kentucky' || parts[1] === 'North_Dakota')) return 'United States';
    return TZ[city] || null;
  }
  function pageName(p) {
    if (!p) return { t: 'Unknown' };
    if (PAGES[p]) return { t: PAGES[p] };
    if (/listing-information/.test(p)) { var id = (p.match(/[?&]id=([^&]+)/) || [])[1]; return { t: 'Business page', d: id ? decodeURIComponent(id) : '' }; }
    return { d: p };
  }
  function searchText(q) {
    var tr = window.CGGI18N && window.CGGI18N.t ? window.CGGI18N.t : function (x) { return x; };
    return String(q || '').split(' · ').map(function (x) { return CODES[x] ? tr(CODES[x]) : x; }).join(' · ');
  }
  function noStats(v) { try { if (v === undefined) return localStorage.getItem('gg-no-stats') === '1'; if (v) localStorage.setItem('gg-no-stats', '1'); else localStorage.removeItem('gg-no-stats'); } catch (e) { return true; } }

  // A row label: English text that gets translated (t) and/or data that stays as is (d: names, cities, websites).
  function label(o) {
    var s = el('span', { className: 'so-bar-label' });
    if (o.t) s.appendChild(el('span', { textContent: o.t }));
    if (o.t && o.d) s.appendChild(document.createTextNode(': '));
    if (o.d) s.appendChild(el('span', { textContent: o.d, attrs: { 'data-no-translate': '' } }));
    s.title = (o.t || '') + (o.t && o.d ? ': ' : '') + (o.d || '');
    return s;
  }
  function bars(rows, empty) {
    var box = el('div');
    if (!rows.length) { box.appendChild(el('p', { className: 'muted', textContent: empty || 'Nothing yet for this period.' })); return box; }
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; })) || 1;
    rows.forEach(function (r) {
      var row = el('div', { className: 'so-bar' });
      row.appendChild(label(r));
      var track = el('span', { className: 'so-bar-track' }), fill = el('span', { className: 'so-bar-fill' });
      fill.style.width = Math.max(2, Math.round(r.n / max * 100)) + '%';
      track.appendChild(fill); row.appendChild(track);
      row.appendChild(el('span', { className: 'so-bar-value', textContent: num(r.n) }));
      box.appendChild(row);
      if (r.sub) box.appendChild(r.sub);
    });
    return box;
  }
  function card(title, note, body) {
    var c = el('div', { className: 'item st-card' });
    c.appendChild(el('h3', { textContent: title }));
    if (note) c.appendChild(el('p', { className: 'meta', textContent: note }));
    c.appendChild(body);
    return c;
  }

  function tiles(t, prev) {
    var box = el('div', { className: 'st-tiles' });
    [['views', 'Page views'], ['visitors', 'Visitors'], ['searches', 'Searches'], ['clicks', 'Clicks to businesses'],
     ['installs', 'App installs'], ['members', 'New members']].forEach(function (x) {
      var tile = el('div', { className: 'so-tile' });
      tile.appendChild(el('strong', { textContent: num(t[x[0]]) }));
      tile.appendChild(el('span', { textContent: x[1] }));
      var a = Number(t[x[0]] || 0), b = Number(prev[x[0]] || 0);
      var cmp = el('small', { className: 'st-cmp ' + (a > b ? 'up' : a < b ? 'down' : '') });
      cmp.appendChild(el('span', { textContent: 'Period before' }));
      cmp.appendChild(document.createTextNode(': '));
      cmp.appendChild(el('span', { textContent: num(b), attrs: { 'data-no-translate': '' } }));
      tile.appendChild(cmp);
      box.appendChild(tile);
    });
    return box;
  }

  function chart(daily) {
    var box = el('div', { className: 'st-chart' });
    // Fill in the days (or hours, for Today) with no visits so the chart reads as a timeline.
    var map = {}; daily.forEach(function (d) { map[d.d] = d; });
    var keys = [];
    if (days === 1) { var h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Chicago' }).format(new Date())); for (var i = 0; i <= h; i++) keys.push((i < 10 ? '0' : '') + i); }
    else {
      var now = new Date();
      for (var k = days - 1; k >= 0; k--) {
        var dt = new Date(now.getTime() - k * 864e5);
        keys.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt));
      }
    }
    // Long ranges: group days into weeks so the bars stay readable.
    var groups = [], size = days > 120 ? 7 : 1;
    for (var g = 0; g < keys.length; g += size) {
      var slice = keys.slice(g, g + size), v = 0, u = 0;
      slice.forEach(function (key) { if (map[key]) { v += map[key].views; u += map[key].visitors; } });
      groups.push({ k: slice[0], views: v, visitors: u });
    }
    var max = Math.max.apply(null, groups.map(function (x) { return x.views; }).concat([1]));
    var W = 720, H = 180, gap = groups.length > 60 ? 1 : 3, bw = Math.max(2, (W - gap * groups.length) / groups.length);
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 4)); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Page views over time');
    svg.setAttribute('preserveAspectRatio', 'none');
    groups.forEach(function (x, i) {
      var hv = Math.round(x.views / max * H), hu = Math.round(x.visitors / max * H);
      var r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', i * (bw + gap)); r.setAttribute('y', H - hv); r.setAttribute('width', bw); r.setAttribute('height', Math.max(hv, x.views ? 2 : 0));
      r.setAttribute('rx', Math.min(3, bw / 2)); r.setAttribute('fill', '#cfe0d4');
      var r2 = document.createElementNS(ns, 'rect');
      r2.setAttribute('x', i * (bw + gap)); r2.setAttribute('y', H - hu); r2.setAttribute('width', bw); r2.setAttribute('height', Math.max(hu, x.visitors ? 2 : 0));
      r2.setAttribute('rx', Math.min(3, bw / 2)); r2.setAttribute('fill', '#103e2f');
      var t = document.createElementNS(ns, 'title'); t.textContent = when(x.k) + ': ' + num(x.views) + ' / ' + num(x.visitors);
      var gg = document.createElementNS(ns, 'g'); gg.appendChild(r); gg.appendChild(r2); gg.appendChild(t); svg.appendChild(gg);
    });
    var base = document.createElementNS(ns, 'line'); base.setAttribute('x1', 0); base.setAttribute('x2', W); base.setAttribute('y1', H + 1); base.setAttribute('y2', H + 1);
    base.setAttribute('stroke', '#d8d2c2'); base.setAttribute('stroke-width', 2); svg.appendChild(base);
    box.appendChild(svg);
    var axis = el('div', { className: 'st-axis', attrs: { 'data-no-translate': '' } });
    axis.appendChild(el('span', { textContent: when(groups[0].k) })); axis.appendChild(el('span', { textContent: when(groups[groups.length - 1].k) }));
    box.appendChild(axis);
    var key = el('div', { className: 'st-key' });
    var k1 = el('span'); k1.appendChild(el('i', { className: 'st-dot', attrs: { style: 'background:#cfe0d4' } })); k1.appendChild(el('span', { textContent: 'Page views' }));
    var k2 = el('span'); k2.appendChild(el('i', { className: 'st-dot', attrs: { style: 'background:#103e2f' } })); k2.appendChild(el('span', { textContent: 'Visitors' }));
    key.appendChild(k1); key.appendChild(k2); box.appendChild(key);
    return box;
  }
  function when(k) {
    if (days === 1) return k + ':00';
    try { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(lang() === 'es' ? 'es-CO' : 'en-US', { month: 'short', day: 'numeric' }); } catch (e) { return k; }
  }


  // Ebook sales (Stripe Payment Links -> stripe-webhook -> ebook_orders), read through the ebook-delivery function (admins only).
  function ebookCard() {
    if (!ebooks || !ebooks.orders) return null;
    var titles = {}; (ebooks.books || []).forEach(function (b) { titles[b.id] = b.title; });
    var paid = ebooks.orders.filter(function (o) { return o.amount_cents > 0; });
    var total = paid.reduce(function (a, o) { return a + o.amount_cents; }, 0);
    var body = el('div');
    var sum = el('p', { className: 'meta' });
    sum.appendChild(el('span', { textContent: 'Ebooks sold' })); sum.appendChild(document.createTextNode(': ' + num(paid.length) + ' · '));
    sum.appendChild(el('span', { textContent: 'Total' })); sum.appendChild(document.createTextNode(': $' + (total / 100).toFixed(2)));
    body.appendChild(sum);
    if (!paid.length) body.appendChild(el('p', { className: 'st-note', textContent: 'No ebook sales yet. Each sale shows here automatically, and the buyer gets the download link by email.' }));
    var counts = {}; paid.forEach(function (o) { counts[o.ebook_id] = (counts[o.ebook_id] || 0) + 1; });
    if (paid.length) body.appendChild(bars(Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (k) { return { d: titles[k] || k, n: counts[k] }; })));
    paid.slice(0, 25).forEach(function (o) {
      var row = el('p', { className: 'meta st-sub' });
      row.appendChild(document.createTextNode(when(String(o.created_at).slice(0, 10)) + ' · '));
      row.appendChild(el('span', { textContent: titles[o.ebook_id] || o.ebook_id }));
      row.appendChild(document.createTextNode(' · $' + (o.amount_cents / 100).toFixed(2) + ' · ' + (o.email || '')));
      if (o.email_error) { row.appendChild(document.createTextNode(' · ')); row.appendChild(el('span', { textContent: 'Email not sent' })); }
      body.appendChild(row);
    });
    return card('Ebook sales', 'All time. Paid by card through Stripe.', body);
  }
  function loadEbooks() {
    sb.auth.getSession().then(function (r) {
      var tok = r.data && r.data.session && r.data.session.access_token; if (!tok) return;
      fetch('https://dhkyyhbfybbxczveyvfw.supabase.co/functions/v1/ebook-delivery', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ action: 'sales' }) })
        .then(function (x) { return x.json(); }).then(function (j) { if (j && j.orders) { ebooks = j; if (data) render(); } }).catch(function () {});
    });
  }

  function render() {
    var out = $('stOut'); out.replaceChildren();
    if (!data) return;
    var t = data.totals || {}, prev = data.previous || {};
    out.appendChild(tiles(t, prev));
    if (!t.views && !t.searches && !t.clicks) out.appendChild(el('p', { className: 'st-note', textContent: 'Counting started when this tab was added. Visits will show here as people use the site.' }));
    var ec = ebookCard(); if (ec) out.appendChild(ec);
    out.appendChild(card('Visits over time', days === 1 ? 'Today, by hour (Chicago time).' : days > 120 ? 'By week.' : 'By day.', chart(data.daily || [])));
    var grid = el('div', { className: 'st-grid' });
    grid.appendChild(card('Most visited pages', 'Page views.', bars((data.pages || []).map(function (r) { var o = pageName(r.k); o.n = r.n; return o; }))));
    var countries = {};
    (data.tz || []).forEach(function (r) { var c = country(r.k); var key = c || ('~' + (r.k.split('/').pop() || '').replace(/_/g, ' ')); countries[key] = (countries[key] || 0) + r.n; });
    grid.appendChild(card('Where visitors are', 'Visitors, by country (from their phone or computer\'s time zone).',
      bars(Object.keys(countries).sort(function (a, b) { return countries[b] - countries[a]; }).slice(0, 15).map(function (k) {
        return k.charAt(0) === '~' ? { d: k.slice(1) || '?', n: countries[k] } : { t: k, n: countries[k] };
      }))));
    grid.appendChild(card('How they found the site', 'Visitors, by the website that sent them.',
      bars((data.refs || []).map(function (r) { return r.k ? { d: r.k, n: r.n } : { t: 'Typed the address, a saved link or the app', n: r.n }; }))));
    grid.appendChild(card('Devices', 'Visitors.', bars((data.devices || []).map(function (r) { return { t: DEVICES[r.k] || r.k, n: r.n }; }))));
    grid.appendChild(card('Language', 'Visitors, by the language they used.', bars((data.langs || []).map(function (r) { return { t: LANGS[r.k] || r.k, n: r.n }; }))));
    grid.appendChild(card('Top searches', 'What people picked or typed in the Finders.', bars((data.searches || []).map(function (r) { return { d: searchText(r.k), n: r.n }; }))));
    grid.appendChild(card('Businesses people contacted', 'Clicks to a business\'s website, booking page, WhatsApp, email or phone.',
      bars((data.listings || []).map(function (r) {
        var sub = el('p', { className: 'meta st-sub' });
        Object.keys(r.t || {}).sort(function (a, b) { return r.t[b] - r.t[a]; }).forEach(function (k, i) {
          if (i) sub.appendChild(document.createTextNode(' · '));
          sub.appendChild(el('span', { textContent: TARGETS[k] || k })); sub.appendChild(document.createTextNode(' ' + num(r.t[k])));
        });
        return { d: r.k, n: r.n, sub: sub };
      }))));
    grid.appendChild(card('Clicks by type', '', bars((data.targets || []).map(function (r) { return { t: TARGETS[r.k] || r.k, n: r.n }; }))));
    out.appendChild(grid);
    if (t.app_views) {
      var p = el('p', { className: 'meta' });
      p.appendChild(el('span', { textContent: 'Page views from inside the app' })); p.appendChild(document.createTextNode(': ' + num(t.app_views)));
      out.appendChild(p);
    }
  }

  function load() {
    if (busy) return;
    busy = true; $('stRefresh').disabled = true;
    if (!data) $('stOut').replaceChildren(el('p', { className: 'muted', textContent: 'Loading…' }));
    loadEbooks();
    sb.rpc('site_stats', { p_days: days }).then(function (r) {
      busy = false; $('stRefresh').disabled = false;
      if (r.error) { $('stOut').replaceChildren(); P.msg($('stOut'), 'err', 'The statistics couldn\'t be loaded. Try again in a moment.'); return; }
      data = r.data; render();
    });
  }

  function init() {
    document.querySelectorAll('#stRange button').forEach(function (b) {
      b.addEventListener('click', function () {
        days = Number(b.dataset.days);
        document.querySelectorAll('#stRange button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        load();
      });
    });
    $('stRefresh').addEventListener('click', load);
    var mine = $('stMine');
    mine.checked = !noStats();
    mine.addEventListener('change', function () { noStats(!mine.checked); });
    document.addEventListener('cgg:language', function () { if (data && !$('tab-stats').hidden) render(); });
  }
  // Signing in to the admin page turns off counting for this phone or computer (can be turned back on in the tab).
  function adminSignedIn() { try { if (localStorage.getItem('gg-no-stats-set') !== '1') { localStorage.setItem('gg-no-stats', '1'); localStorage.setItem('gg-no-stats-set', '1'); } } catch (e) {} }

  window.CGGStats = { show: load, init: init, adminSignedIn: adminSignedIn };
})();
