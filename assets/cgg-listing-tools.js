/* CGG listing tools: share links, genuine ratings, and listing-view analytics. */
(function () {
  'use strict';
  var cfg = window.CGG_PORTAL || {};
  var seen = Object.create(null);
  var visitorKey = 'gg-visitor';
  function visitorId() {
    try {
      var id = localStorage.getItem(visitorKey);
      if (!id) {
        id = 'v-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem(visitorKey, id);
      }
      return id;
    } catch (_) { return 'session-' + Math.random().toString(36).slice(2); }
  }
  function trackView(listing, path) {
    if (!cfg.supabaseUrl || !cfg.supabaseKey || !listing || seen[listing]) return;
    seen[listing] = true;
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
    var ua = navigator.userAgent || '';
    var device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|iphone|android/i.test(ua) ? 'phone' : 'computer';
    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/track_event', {
      method: 'POST',
      headers: { apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: { kind: 'view', visitor: visitorId(), path: location.pathname, listing: listing, target: 'details', tz: tz, device: device, lang: 'en', app: false } }),
      keepalive: true
    }).catch(function () {});
  }
  function slug(s) { return String(s || 'listing').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'listing'; }
  function makeButton(label, symbol, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cgg-listing-tool ' + cls;
    b.innerHTML = '<span aria-hidden="true">' + symbol + '</span> <span>' + label + '</span>';
    return b;
  }
  function addTools(card) {
    if (!card || card.dataset.cggToolsAdded === '1') return;
    var title = card.querySelector('h3');
    if (!title) return;
    card.dataset.cggToolsAdded = '1';
    var name = (title.textContent || '').trim();
    var id = card.getAttribute('data-listing-id') || card.id || slug(name);
    var canonical = new URL(location.pathname + '?listing=' + encodeURIComponent(id), location.origin).href;
    trackView(id, location.pathname);
    var row = document.createElement('div');
    row.className = 'cgg-listing-tools';
    row.setAttribute('aria-label', 'Listing tools');

    var share = makeButton('Share', '↗', 'cgg-share-listing');
    share.setAttribute('aria-label', 'Share ' + name);
    share.addEventListener('click', function () {
      var payload = { title: name + ' | Christopher the Good Gringo™', text: 'Take a look at ' + name, url: canonical };
      if (navigator.share) {
        navigator.share(payload).catch(function (err) { if (err && err.name !== 'AbortError') copyLink(canonical, share); });
      } else copyLink(canonical, share);
    });
    row.appendChild(share);

    var rating = card.querySelector('.hotel-rating, .restaurant-rating, .listing-rating, .bar-rating');
    if (rating) {
      rating.style.removeProperty('display');
      rating.style.removeProperty('visibility');
      rating.classList.add('cgg-genuine-rating');
      row.appendChild(rating);
    }
    var reviewCount = card.getAttribute('data-review-count');
    if (reviewCount && /^\d+$/.test(reviewCount)) {
      var reviews = document.createElement('span');
      reviews.className = 'cgg-review-count';
      reviews.textContent = reviewCount + (Number(reviewCount) === 1 ? ' review' : ' reviews');
      row.appendChild(reviews);
    }
    card.appendChild(row);
  }
  function copyLink(url, button) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { button.lastElementChild.textContent = 'Link copied'; }).catch(function () { window.prompt('Copy this listing link:', url); });
    } else window.prompt('Copy this listing link:', url);
  }
  function installStyles() {
    if (document.getElementById('cgg-listing-tools-style')) return;
    var style = document.createElement('style');
    style.id = 'cgg-listing-tools-style';
    style.textContent = '.cgg-listing-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #e2e8e3;font:500 .82rem/1.3 "DM Sans",sans-serif}.cgg-listing-tool{display:inline-flex;align-items:center;gap:5px;border:1px solid #d5dfd7;border-radius:8px;padding:7px 10px;background:#f7faf7;color:#103e2f;font:700 .82rem/1.2 "DM Sans",sans-serif;cursor:pointer}.cgg-listing-tool:hover{background:#eaf2eb}.cgg-genuine-rating{display:inline-flex!important;align-items:center;gap:5px;flex-wrap:wrap;margin:0!important;font-size:.82rem!important}.cgg-genuine-rating .rating-source{flex-basis:100%;font-size:.7rem}.cgg-review-count{color:#52645a;font-size:.78rem}';
    document.head.appendChild(style);
  }
  function scan() {
    installStyles();
    document.querySelectorAll('article.hotel-card, article.hostel-card, article.restaurant-card, article.bar-card, article[class*="-card"]').forEach(addTools);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();