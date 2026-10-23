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
  // Owner edits are limited by the database; admin edits may also change these.
  var allowed = cfg.editableFields.concat(['membershipTier', 'photos', 'name', 'city', 'rating', 'ratingSource', 'hidden']);
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
      if (k === 'hidden') { if (v === true) out.hidden = true; return; }
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

  window.cggClearOverrideCache = function () { cache = {}; newCache = {}; };

  // ---------- Level limits ----------
  // Every public page gets each listing trimmed to exactly what its level includes, so a listing
  // can never show more than it pays for, whatever is in the data file or saved from the portal.
  // Fields not named here are dropped, so new fields stay hidden until added on purpose.
  // Instagram links are not shown on any level.
  var LEVEL_FIELDS = {
    // Bronze: listed in the Finder with name, city and address.
    bronze: ['id', 'name', 'city', 'address', 'countryCode', 'countryName', 'country', 'membershipTier', 'verifiedOn', 'sample', 'hidden'],
    // Silver, Gold and Platinum: star rating, More Information page,
    // website, booking and contact details. Price range, opening hours, category/style and highlights are hidden.
    silver: ['rating', 'ratingSource',
      'operator', 'featured', 'website', 'officialWebsite', 'bookingUrl', 'affiliateUrl', 'affiliateBookingUrl', 'bookingAffiliateUrl',
      'bookingUrlAffiliate', 'phone', 'email', 'whatsapp'],
    // Gold and Platinum: main photo. Platinum also gets rotating photo gallery.
    gold: ['photo'],
    platinum: ['photos', 'photoUrls', 'images']
  };
  var PLAN_TO_LEVEL = { premium: 'platinum', featured: 'gold', silver: 'silver', free: 'bronze' };
  function levelOf(h) {
    var t = String((h && h.membershipTier) || '').toLowerCase();
    if (!LEVEL_RANK.hasOwnProperty(t)) t = PLAN_TO_LEVEL[String((h && h.listingPlan) || '').toLowerCase()] || 'bronze';
    return t;
  }
  var LEVEL_RANK = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
  function firstPhoto(h) {
    var all = [h.photo].concat(Array.isArray(h.photoUrls) ? h.photoUrls : [], Array.isArray(h.images) ? h.images : [], Array.isArray(h.photos) ? h.photos : []);
    for (var i = 0; i < all.length; i++) if (typeof all[i] === 'string' && /^https?:\/\//i.test(all[i])) return all[i];
    return '';
  }
  window.cggLimitToLevel = function (h) {
    if (!h || typeof h !== 'object') return h;
    var level = levelOf(h), rank = LEVEL_RANK[level];
    var keep = LEVEL_FIELDS.bronze.slice();
    if (rank >= LEVEL_RANK.silver) keep = keep.concat(LEVEL_FIELDS.silver);
    if (rank >= LEVEL_RANK.platinum) keep = keep.concat(LEVEL_FIELDS.platinum);
    var out = {};
    keep.forEach(function (k) { if (h[k] !== undefined) out[k] = h[k]; });
    // Silver and Gold get one main photo, even if the listing only has a photo list.
    if (rank >= LEVEL_RANK.silver && rank < LEVEL_RANK.platinum && !out.photo) {
      var p = firstPhoto(h);
      if (p) out.photo = p;
    }
    // Finders only list businesses that have a real website or booking page. Bronze cards
    // don't show the link, so pass along just the fact that one exists.
    if (rank < LEVEL_RANK.silver && ['website', 'officialWebsite', 'bookingUrl'].some(function (k) { return typeof h[k] === 'string' && /^https?:\/\//i.test(h[k]); })) out.hasWebsite = true;
    if (rank < LEVEL_RANK.silver && ['website', 'bookingUrl'].some(function (k) { return typeof h[k] === 'string' && /hostelworld\.com/i.test(h[k]); })) out.hasHostelworld = true;
    out.membershipTier = level;
    return out;
  };
  window.cggLevelOf = levelOf;

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
        var isAdmin = /^\/admin\//.test(location.pathname);
        if (!/^\/(owner|admin)\/|^\/listing-information\.html/.test(location.pathname)) {
          data[hit[1]] = data[hit[1]].filter(function (h) { return !(h && h.sample); });
        }
        var base = (addTo[m[1]] === false) ? Promise.resolve(data[hit[1]]) : withNewListings(hit[0], data[hit[1]]);
        return base.then(function (merged) { return window.cggApplyOverrides(hit[0], merged); }).then(function (list) {
          // Businesses removed from the site by the admin stay visible only on the admin page.
          data[hit[1]] = isAdmin ? list : list.filter(function (h) { return !(h && h.hidden); });
          // Public pages only ever receive what each listing's level includes.
          if (!/^\/(owner|admin)\//.test(location.pathname)) data[hit[1]] = data[hit[1]].map(window.cggLimitToLevel);
          return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      }).catch(function () { return res; });
    });
  };
})();
