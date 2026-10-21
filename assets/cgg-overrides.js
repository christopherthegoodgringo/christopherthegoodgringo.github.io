/* Applies owner changes that you approved in the admin page to the site's listing data.
   Load after cgg-portal-config.js and before a page's own script. If Supabase is slow or down,
   the page simply shows the normal listing data. */
(function () {
  var cfg = window.CGG_PORTAL;
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey || !window.fetch) return;
  var files = {
    'hotels.json': ['hotels', 'hotels'],
    'restaurants.json': ['restaurants', 'restaurants'],
    'bars.json': ['bars', 'bars'],
    'street-food.json': ['street-food', 'streetFood'],
    'paid-listings.json': ['hostels', 'hostels'],
    'hostels-clean.json': ['hostels', 'hostels']
  };
  var allowed = cfg.editableFields.concat(['membershipTier', 'photos']);
  var cache = {};
  var nativeFetch = window.fetch.bind(window);

  function overridesFor(type) {
    if (!cache[type]) {
      var url = cfg.supabaseUrl + '/rest/v1/published_listing_overrides?select=listing_id,changes&listing_type=eq.' + encodeURIComponent(type);
      var request = nativeFetch(url, { headers: { apikey: cfg.supabaseKey, Accept: 'application/json' }, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
      var timeout = new Promise(function (resolve) { setTimeout(function () { resolve([]); }, 1500); });
      cache[type] = Promise.race([request, timeout]);
    }
    return cache[type];
  }

  // Businesses added by owners and approved in the admin page.
  var newCache = {};
  function newListingsFor(type) {
    if (!newCache[type]) {
      var url = cfg.supabaseUrl + '/rest/v1/published_new_listings?select=listing_id,data&listing_type=eq.' + encodeURIComponent(type);
      var request = nativeFetch(url, { headers: { apikey: cfg.supabaseKey, Accept: 'application/json' }, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
      var timeout = new Promise(function (resolve) { setTimeout(function () { resolve([]); }, 1500); });
      newCache[type] = Promise.race([request, timeout]);
    }
    return newCache[type];
  }
  function withNewListings(type, list) {
    return newListingsFor(type).then(function (rows) {
      if (!Array.isArray(rows) || !rows.length) return list;
      var have = {};
      list.forEach(function (h) { if (h && h.id) have[h.id] = 1; });
      var added = rows.map(function (r) { return Object.assign({}, r.data || {}, { id: r.listing_id }); })
        .filter(function (h) { return h.name && !have[h.id]; });
      return list.concat(added);
    });
  }
  // The hostel page loads two files; add new hostels to only one of them.
  var addTo = { 'hostels-clean.json': false, 'paid-listings.json': true };

  function clean(changes) {
    var out = {};
    Object.keys(changes || {}).forEach(function (k) {
      if (allowed.indexOf(k) === -1) return;
      var v = changes[k];
      if (v === null || v === undefined || v === '') return;
      if (k === 'membershipTier' && ['platinum', 'gold', 'silver', 'bronze'].indexOf(String(v)) === -1) return;
      out[k] = v;
    });
    return out;
  }

  window.cggApplyOverrides = function (type, list) {
    return overridesFor(type).then(function (rows) {
      if (!Array.isArray(rows) || !rows.length || !Array.isArray(list)) return list;
      var byId = {};
      rows.forEach(function (r) { byId[r.listing_id] = clean(r.changes); });
      return list.map(function (item) {
        var o = item && byId[String(item.id || item.name)];
        return o ? Object.assign({}, item, o) : item;
      });
    });
  };

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var m = url.match(/\/data\/([a-z-]+\.json)(\?|$)/);
    var hit = m && files[m[1]];
    if (!hit) return nativeFetch(input, init);
    return nativeFetch(input, init).then(function (res) {
      if (!res.ok) return res;
      return res.clone().json().then(function (data) {
        if (!data || !Array.isArray(data[hit[1]])) return res;
        // Practice listings (sample: true) only show in the owner portal, admin and their own information page.
        if (!/^\/(owner|admin)\/|^\/listing-information\.html/.test(location.pathname)) {
          data[hit[1]] = data[hit[1]].filter(function (h) { return !(h && h.sample); });
        }
        var base = (addTo[m[1]] === false) ? Promise.resolve(data[hit[1]]) : withNewListings(hit[0], data[hit[1]]);
        return base.then(function (merged) { return window.cggApplyOverrides(hit[0], merged); }).then(function (list) {
          data[hit[1]] = list;
          return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      }).catch(function () { return res; });
    });
  };
})();
