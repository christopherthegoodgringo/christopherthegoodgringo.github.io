/* Shared helpers for the owner portal and admin pages. */
(function () {
  var cfg = window.CGG_PORTAL;
  var P = window.CGGPortal = {};

  P.client = function () {
    if (!P._client) P._client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return P._client;
  };

  // Build an element safely: el('p', {className:'x'}, 'text', child, ...)
  P.el = function (tag, props) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'dataset') Object.assign(node.dataset, props[k]);
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), props[k]);
      else if (k === 'attrs') Object.keys(props[k]).forEach(function (a) { node.setAttribute(a, props[k][a]); });
      else node[k] = props[k];
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  };

  P.msg = function (target, kind, text) {
    target.replaceChildren(P.el('p', { className: 'msg ' + kind, attrs: { role: kind === 'err' ? 'alert' : 'status' } }, text));
  };

  P.tierOf = function (h) {
    var t = String((h && h.membershipTier) || '').toLowerCase();
    if (!t) t = ({ premium: 'platinum', featured: 'gold', silver: 'silver' })[String((h && h.listingPlan) || '').toLowerCase()] || 'bronze';
    return t;
  };

  P.fmtDate = function (iso) {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso || ''; }
  };

  // Loads every listing the site shows, with approved owner changes applied.
  P.loadListings = function () {
    if (P._listings) return P._listings;
    var jobs = [];
    Object.keys(cfg.sources).forEach(function (type) {
      cfg.sources[type].forEach(function (src) {
        jobs.push(fetch(src[0] + '?portal=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : {}; })
          .then(function (d) { return (Array.isArray(d[src[1]]) ? d[src[1]] : []).map(function (h) { return Object.assign({ __type: type }, h); }); })
          .catch(function () { return []; }));
      });
    });
    P._listings = Promise.all(jobs).then(function (lists) {
      var seen = {}, out = [];
      [].concat.apply([], lists).forEach(function (h) {
        if (!h || !h.name) return;
        var key = h.__type + '|' + (h.id || h.name);
        if (seen[key]) return; seen[key] = 1; out.push(h);
      });
      return out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    });
    return P._listings;
  };

  P.findListing = function (list, type, id) {
    return list.find(function (h) { return h.__type === type && String(h.id || h.name) === String(id); });
  };

  P.fieldLabels = {
    description: 'Description', address: 'Address', phone: 'Phone', email: 'Email', website: 'Website',
    whatsapp: 'WhatsApp', instagram: 'Instagram', hours: 'Opening hours', priceRange: 'Price range',
    cuisine: 'Cuisine / food', drinks: 'Drinks', features: 'Highlights', photo: 'Main photo link',
    membershipTier: 'Tier'
  };

  P.show = function (v) { return Array.isArray(v) ? v.join(' · ') : (v === undefined || v === null ? '' : String(v)); };
})();
