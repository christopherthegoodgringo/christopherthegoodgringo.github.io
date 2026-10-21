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
  var el = P.el;

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

  // ---------- Sign-in box: password, create account, forgot password, email link ----------
  function friendly(err) {
    var m = (err && err.message) || String(err || 'Something went wrong');
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password. Try again, or use "Forgot password?".';
    if (/email not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the confirmation link.';
    if (/already registered|already been registered/i.test(m)) return 'An account with this email already exists. Sign in instead, or use "Forgot password?".';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a few minutes and try again.';
    if (/password/i.test(m) && /(weak|short|least|characters)/i.test(m)) return 'Please choose a stronger password (at least 8 characters, mixing letters and numbers).';
    return m;
  }
  P.friendly = friendly;

  function pwField(id, label, autocomplete) {
    return [el('label', { htmlFor: id }, label), el('input', { id: id, type: 'password', required: true, minLength: 8, maxLength: 72, autocomplete: autocomplete })];
  }
  function goodPassword(p) { return p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p); }

  P.mountAuth = function (box, opts) {
    var sb = P.client(), redirect = opts.redirect, view = 'signin';
    function link(text, to) { return el('button', { type: 'button', className: 'btn light', onclick: function () { view = to; render(); } }, text); }
    function render() {
      box.replaceChildren();
      var out = el('div');
      var emailInput = el('input', { id: 'authEmail', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@yourbusiness.com', value: (P._lastEmail || '') });
      emailInput.addEventListener('input', function () { P._lastEmail = emailInput.value; });
      var form = el('form');
      var title, sub, fields = [el('label', { htmlFor: 'authEmail' }, 'Email address'), emailInput], btnText, extra = [];
      if (view === 'signin') {
        title = 'Sign in'; sub = 'Use your email and password.';
        fields = fields.concat(pwField('authPw', 'Password', 'current-password'));
        btnText = 'Sign in';
        extra = [link('Forgot password?', 'forgot')];
        if (opts.allowSignup) extra.unshift(link('New here? Create an account', 'signup'));
      } else if (view === 'signup') {
        title = 'Create your account'; sub = 'Choose a password with at least 8 characters, including a number. We will email you a link to confirm your address.';
        fields = fields.concat(pwField('authPw', 'Password', 'new-password'), pwField('authPw2', 'Confirm password', 'new-password'));
        btnText = 'Create account'; extra = [link('I already have an account', 'signin')];
      } else if (view === 'forgot') {
        title = 'Reset your password'; sub = "Enter your email and we'll send you a link to choose a new password.";
        btnText = 'Email me a reset link'; extra = [link('Back to sign in', 'signin')];
      } else {
        title = 'Sign in with an email link'; sub = "No password needed. We'll email you a one-time sign-in link.";
        btnText = 'Email me a sign-in link'; extra = [link('Back to sign in', 'signin')];
      }
      fields.forEach(function (f) { form.appendChild(f); });
      var submit = el('button', { className: 'btn', type: 'submit' }, btnText);
      form.appendChild(el('div', { className: 'actions' }, submit));
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = emailInput.value.trim(), pw = form.querySelector('#authPw'), pw2 = form.querySelector('#authPw2');
        if (view === 'signup') {
          if (!goodPassword(pw.value)) return P.msg(out, 'err', 'Please use at least 8 characters, including a letter and a number.');
          if (pw.value !== pw2.value) return P.msg(out, 'err', "The two passwords don't match.");
        }
        submit.disabled = true;
        var job;
        if (view === 'signin') job = sb.auth.signInWithPassword({ email: email, password: pw.value });
        else if (view === 'signup') job = sb.auth.signUp({ email: email, password: pw.value, options: { emailRedirectTo: redirect } });
        else if (view === 'forgot') job = sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        else job = sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect, shouldCreateUser: !!opts.allowSignup } });
        job.then(function (r) {
          submit.disabled = false;
          if (r.error) return P.msg(out, 'err', friendly(r.error));
          if (view === 'signup') {
            if (r.data && r.data.session) return; // signed in right away
            P.msg(out, 'ok', 'Almost done! Check your inbox and click the link to confirm your email, then sign in.');
          } else if (view === 'forgot') P.msg(out, 'ok', 'If that email has an account, a reset link is on its way. Check your spam folder too.');
          else if (view === 'link') P.msg(out, 'ok', 'Check your inbox for a sign-in link. It may take a minute.');
        });
      });
      box.appendChild(el('h2', {}, title));
      box.appendChild(el('p', { className: 'sub' }, sub));
      box.appendChild(form);
      box.appendChild(el.apply(null, ['div', { className: 'actions' }].concat(extra)));
      box.appendChild(out);
    }
    render();
    return { show: function (v) { view = v || 'signin'; render(); } };
  };

  // "Set or change password" panel for signed-in users (also used after a reset link).
  P.mountSetPassword = function (box, opts) {
    var sb = P.client();
    box.replaceChildren();
    var out = el('div'), form = el('form');
    pwField('newPw', 'New password', 'new-password').concat(pwField('newPw2', 'Confirm new password', 'new-password')).forEach(function (f) { form.appendChild(f); });
    var submit = el('button', { className: 'btn', type: 'submit' }, 'Save password');
    form.appendChild(el('div', { className: 'actions' }, submit,
      el('button', { className: 'btn light', type: 'button', onclick: function () { box.hidden = true; } }, 'Cancel')));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = form.querySelector('#newPw').value, b = form.querySelector('#newPw2').value;
      if (!goodPassword(a)) return P.msg(out, 'err', 'Please use at least 8 characters, including a letter and a number.');
      if (a !== b) return P.msg(out, 'err', "The two passwords don't match.");
      submit.disabled = true;
      sb.auth.updateUser({ password: a }).then(function (r) {
        submit.disabled = false;
        if (r.error) return P.msg(out, 'err', friendly(r.error));
        form.reset(); P.msg(out, 'ok', 'Password saved. Next time you can sign in with your email and this password.');
        if (opts && opts.onDone) opts.onDone();
      });
    });
    box.appendChild(el('h2', {}, (opts && opts.title) || 'Set your password'));
    box.appendChild(el('p', { className: 'sub' }, 'At least 8 characters, including a letter and a number.'));
    box.appendChild(form);
    box.appendChild(out);
    box.hidden = false;
  };
})();
