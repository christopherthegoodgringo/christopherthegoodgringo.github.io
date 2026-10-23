/* Full listing editor with photo uploads, used by the owner portal and the admin page.
   Owners see what their level includes (locked items show what upgrading adds);
   admins can change everything, including the level. */
(function () {
  var P = window.CGGPortal, el = P.el, cfg = window.CGG_PORTAL;
  var RANK = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
  var NAMES = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
  var GALLERY_MAX = 8;

  function foodField(type) { return type === 'bars' ? 'drinks' : 'cuisine'; }
  function foodLabel(type) { return type === 'bars' ? 'Drinks you are known for' : type === 'hotels' || type === 'hostels' ? 'Category or style' : 'Cuisine or food'; }

  var SECTIONS = [
    { title: 'Basics', tier: 'bronze', note: 'Bronze shows your name, city and address in the Finder.', fields: [
      ['address', 'Street address']] },
    { title: 'Your card and information page', tier: 'silver', note: 'Adds a photo, star rating, description, contact details, website and booking buttons, plus your own More Information page.', fields: [
      ['photo', 'Main photo', 'photo'], ['description', 'Description', 'area'], ['priceRange', 'Price range', 'text', 'e.g. $$–$$$'],
      ['phone', 'Phone'], ['whatsapp', 'WhatsApp number'], ['email', 'Business email', 'email'],
      ['website', 'Website or booking link', 'url'], ['hours', 'Opening hours', 'area'],
      ['__food', ''], ['features', 'Highlights', 'text', 'Separate with commas, e.g. Rooftop, Live music, Ocean view']] },
    { title: 'Photo gallery', tier: 'platinum', note: 'Rotating photos on your Finder card and information page.', fields: [['photos', 'Gallery photos', 'gallery']] }
  ];
  var ADMIN_FIELDS = [['name', 'Business name'], ['city', 'City']];
  var RATED_ADMIN_FIELDS = [['rating', 'Rating (0–5)', 'number'], ['ratingSource', 'Rating source']];

  function resize(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('Please choose a photo (JPG, PNG or WebP).'));
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Could not read that photo.')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that photo. Try a JPG or PNG.')); };
      img.src = url;
    });
  }

  P.uploadPhoto = function (file, folder, listingKey) {
    var sb = P.client();
    return resize(file).then(function (blob) {
      var path = folder + '/' + String(listingKey).replace(/[^a-z0-9-]+/gi, '-').slice(0, 80) + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      return sb.storage.from('listing-photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }).then(function (r) {
        if (r.error) throw new Error(/row-level|not authorized|policy/i.test(r.error.message) ? 'Photo uploads open once your business is verified.' : r.error.message);
        return sb.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
      });
    });
  };

  // opts: { mode: 'owner'|'admin', tier, folder, onSubmit(changes, note) -> Promise, onUpgrade(), submitLabel }
  P.listingEditor = function (h, opts) {
    var type = h.__type, admin = opts.mode === 'admin';
    var tier = opts.tier || P.tierOf(h), key = type + '-' + (h.id || h.name);
    var state = { photo: h.photo || '', photos: (Array.isArray(h.photos) ? h.photos : []).filter(function (u) { return typeof u === 'string' && u; }) };
    var form = el('form', { className: 'listing-editor' });
    var msg = el('div');
    var inputs = {};

    function input(k, label, kind, ph) {
      var val = P.show(h[k]);
      var node = kind === 'area' ? el('textarea', { name: k, value: val, maxLength: 1500, placeholder: ph || '' })
        : el('input', { name: k, value: val, maxLength: 300, placeholder: ph || '', type: kind === 'email' ? 'email' : kind === 'number' ? 'number' : 'text',
            inputMode: kind === 'url' ? 'url' : null, autocapitalize: (kind === 'url' || kind === 'email') ? 'off' : null,
            step: kind === 'number' ? '0.1' : null, min: kind === 'number' ? '0' : null, max: kind === 'number' ? '5' : null });
      if (kind === 'url' && !ph) node.placeholder = 'e.g. mybusiness.com';
      inputs[k] = node;
      return [el('label', {}, label), node];
    }

    function photoBox() {
      var wrap = el('div', { className: 'photo-box' });
      function draw() {
        wrap.replaceChildren();
        if (state.photo) wrap.appendChild(el('img', { src: state.photo, alt: 'Main photo', className: 'photo-main' }));
        else wrap.appendChild(el('div', { className: 'photo-empty' }, 'No main photo yet'));
        var file = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
        var btn = el('button', { type: 'button', className: 'btn light', onclick: function () { file.click(); } }, state.photo ? 'Replace photo' : 'Upload photo');
        file.addEventListener('change', function () {
          if (!file.files[0]) return;
          btn.disabled = true; btn.textContent = 'Uploading…';
          P.uploadPhoto(file.files[0], opts.folder, key).then(function (u) { state.photo = u; draw(); })
            .catch(function (e) { btn.disabled = false; btn.textContent = 'Upload photo'; P.msg(msg, 'err', e.message); });
        });
        wrap.appendChild(el('div', { className: 'actions', style: 'margin-top:8px' }, btn,
          state.photo ? el('button', { type: 'button', className: 'btn light', onclick: function () { state.photo = ''; draw(); } }, 'Remove') : null, file));
      }
      draw();
      return wrap;
    }

    function galleryBox() {
      var wrap = el('div', { className: 'photo-box' });
      function draw() {
        wrap.replaceChildren();
        var grid = el('div', { className: 'gallery-grid' });
        state.photos.forEach(function (u, i) {
          grid.appendChild(el('div', { className: 'gallery-item' }, el('img', { src: u, alt: 'Gallery photo ' + (i + 1) }),
            el('button', { type: 'button', className: 'gallery-x', attrs: { 'aria-label': 'Remove photo ' + (i + 1) }, onclick: function () { state.photos.splice(i, 1); draw(); } }, '✕')));
        });
        if (!state.photos.length) grid.appendChild(el('div', { className: 'photo-empty' }, 'No gallery photos yet'));
        wrap.appendChild(grid);
        var file = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
        var left = GALLERY_MAX - state.photos.length;
        var btn = el('button', { type: 'button', className: 'btn light', disabled: left <= 0, onclick: function () { file.click(); } }, left > 0 ? 'Add photos (' + left + ' left)' : 'Gallery is full');
        file.addEventListener('change', function () {
          var files = [].slice.call(file.files, 0, GALLERY_MAX - state.photos.length);
          if (!files.length) return;
          btn.disabled = true; btn.textContent = 'Uploading ' + files.length + '…';
          files.reduce(function (p, f) { return p.then(function () { return P.uploadPhoto(f, opts.folder, key).then(function (u) { state.photos.push(u); }); }); }, Promise.resolve())
            .then(draw).catch(function (e) { draw(); P.msg(msg, 'err', e.message); });
        });
        wrap.appendChild(el('div', { className: 'actions', style: 'margin-top:8px' }, btn, file));
      }
      draw();
      return wrap;
    }

    var sectionEls = [];
    if (admin) {
      var lvl = el('select', { name: 'membershipTier' });
      ['platinum', 'gold', 'silver', 'bronze'].forEach(function (t) { lvl.appendChild(el('option', { value: t, selected: tier === t }, NAMES[t])); });
      inputs.membershipTier = lvl;
      form.appendChild(el('div', { className: 'editor-section level-pick', style: 'background:#fff8e6;border-color:#d6a84f' },
        el('label', { style: 'margin-top:0' }, 'Level'), lvl,
        el('p', { className: 'meta', style: 'margin:6px 0 0' }, 'The fields below match this level. To edit more, change the level here first.')));
      var sec = el('fieldset', { className: 'editor-section' }, el('legend', {}, 'Admin details'));
      ADMIN_FIELDS.forEach(function (f) { input(f[0], f[1], f[2]).forEach(function (n) { sec.appendChild(n); }); });
      form.appendChild(sec);
      var ratedSec = el('fieldset', { className: 'editor-section' }, el('legend', {}, 'Rating (Silver and above)'));
      RATED_ADMIN_FIELDS.forEach(function (f) { input(f[0], f[1], f[2]).forEach(function (n) { ratedSec.appendChild(n); }); });
      form.appendChild(ratedSec);
      sectionEls.push({ el: ratedSec, tier: 'silver' });
    }

    // Only the sections the level includes are shown. Owners never see higher-level sections;
    // admins see the sections for the level picked in the editor, updating as it changes.
    SECTIONS.forEach(function (s) {
      if (!admin && RANK[tier] < RANK[s.tier]) return;
      var sec = el('fieldset', { className: 'editor-section' }, el('legend', {}, s.title));
      sec.appendChild(el('p', { className: 'meta', style: 'margin:0 0 4px' }, s.note));
      sectionEls.push({ el: sec, tier: s.tier });
      s.fields.forEach(function (f) {
        if (f[0] === '__food') { input(foodField(type), foodLabel(type)).forEach(function (n) { sec.appendChild(n); }); return; }
        if (f[2] === 'photo') { sec.appendChild(el('label', {}, f[1])); sec.appendChild(photoBox()); return; }
        if (f[2] === 'gallery') { sec.appendChild(el('label', {}, f[1] + ' (up to ' + GALLERY_MAX + ')')); sec.appendChild(galleryBox()); return; }
        input(f[0], f[1], f[2], f[3]).forEach(function (n) { sec.appendChild(n); });
      });
      form.appendChild(sec);
    });
    function applyLevel(t) { sectionEls.forEach(function (x) { x.el.hidden = RANK[t] < RANK[x.tier]; }); }
    if (admin) { applyLevel(tier); inputs.membershipTier.addEventListener('change', function () { applyLevel(inputs.membershipTier.value); }); }
    if (!admin && tier !== 'platinum' && opts.onUpgrade) {
      var nextUp = tier === 'bronze' ? 'Silver adds a main photo, description and your own information page.' : 'Platinum adds a rotating photo gallery and the top spot.';
      form.appendChild(el('p', { className: 'meta', style: 'margin:0 0 14px' }, 'Want more? ' + nextUp + ' ',
        el('a', { href: '#', style: 'color:var(--green);font-weight:700', onclick: function (e) { e.preventDefault(); opts.onUpgrade(); } }, 'See upgrade options')));
    }

    var note = null;
    if (!admin) { form.appendChild(el('label', {}, 'Anything else we should know?')); note = el('textarea', { maxLength: 2000 }); form.appendChild(note); }
    var submit = el('button', { className: 'btn', type: 'submit' }, opts.submitLabel || 'Save and publish');
    form.appendChild(el('div', { className: 'actions' }, submit, opts.onCancel ? el('button', { type: 'button', className: 'btn light', onclick: opts.onCancel }, 'Cancel') : null));
    form.appendChild(msg);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var changes = {};
      Object.keys(inputs).forEach(function (k) {
        var fs = inputs[k].closest && inputs[k].closest('fieldset');
        if (fs && fs.hidden) return;
        var raw = inputs[k].value.trim();
        if (k === 'membershipTier') { if (raw !== tier) changes.membershipTier = raw; return; }
        if (raw === P.show(h[k]).trim()) return;
        if (k === 'features') changes[k] = raw ? raw.split(/\s*[·,;]\s*/).filter(Boolean).slice(0, 8) : null;
        else if (k === 'website') changes[k] = P.normalizeUrl(raw) || null;
        else if (k === 'rating') changes[k] = raw === '' ? null : Math.max(0, Math.min(5, Number(raw)));
        else changes[k] = raw || null;
      });
      var level = admin ? inputs.membershipTier.value : tier;
      if (RANK[level] >= RANK.silver && (state.photo || '') !== (h.photo || '')) changes.photo = state.photo || null;
      var before = (Array.isArray(h.photos) ? h.photos : []).join('|');
      if (RANK[level] >= RANK.platinum && state.photos.join('|') !== before) changes.photos = state.photos.length ? state.photos.slice() : null;
      var n = note ? note.value.trim() : '';
      if (!Object.keys(changes).length && !n) return P.msg(msg, 'info', "You haven't changed anything yet.");
      submit.disabled = true;
      Promise.resolve(opts.onSubmit(changes, n)).then(function (r) {
        submit.disabled = false;
        if (r && r.error) return P.msg(msg, 'err', (r.error.message || r.error));
        P.msg(msg, 'ok', 'Saved. Your changes are live.');
        if (note) note.value = '';
      }).catch(function (err) { submit.disabled = false; P.msg(msg, 'err', err.message || String(err)); });
    });
    return form;
  };

  // Small thumbnail strip for showing photo changes (admin review).
  P.photoThumbs = function (v) {
    var list = Array.isArray(v) ? v : v ? [v] : [];
    if (!list.length) return el('span', { className: 'old' }, '—');
    var box = el('span', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
    list.forEach(function (u) { box.appendChild(el('a', { href: u, target: '_blank', rel: 'noopener' }, el('img', { src: u, alt: '', style: 'width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #ddd' }))); });
    return box;
  };
})();
