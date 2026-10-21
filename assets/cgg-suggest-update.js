/* "Suggest an update" form and owner portal link for listing-information.html. */
(function () {
  var cfg = window.CGG_PORTAL;
  var params = new URLSearchParams(location.search), type = params.get('type') || '', id = params.get('id') || '';
  if (!cfg || !cfg.sources[type] || !id) return;

  var css = '.cgg-suggest{max-width:1000px;margin:22px auto 0;background:#fffdf8;border:1px solid #e2dccb;border-radius:20px;padding:clamp(20px,4vw,34px);font-family:"DM Sans",Arial,sans-serif;color:#203027}'
    + '.cgg-suggest h2{font-family:"Bricolage Grotesque",Arial,sans-serif;color:#103e2f;margin:0 0 6px;font-size:1.4rem}'
    + '.cgg-suggest p{margin:0 0 12px;color:#5f6d64}.cgg-suggest .cgg-row{display:flex;gap:10px;flex-wrap:wrap}'
    + '.cgg-suggest a.cgg-btn,.cgg-suggest button{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:10px;border:1px solid #f5bd3e;background:#103e2f;color:#fffdf8;font:800 .95rem "DM Sans",Arial,sans-serif;cursor:pointer;text-decoration:none}'
    + '.cgg-suggest .cgg-light,.cgg-suggest a.cgg-light{background:#fff;color:#103e2f;border-color:#c3cbc2}'
    + '.cgg-suggest label{display:block;font-weight:700;font-size:.9rem;margin:12px 0 5px;color:#103e2f}'
    + '.cgg-suggest input,.cgg-suggest textarea{width:100%;box-sizing:border-box;font:inherit;padding:11px 13px;border:1px solid #c9cfc6;border-radius:10px;background:#fff}'
    + '.cgg-suggest textarea{min-height:90px}.cgg-suggest .cgg-two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}@media(max-width:620px){.cgg-suggest .cgg-two{grid-template-columns:1fr}}'
    + '.cgg-suggest .cgg-msg{margin-top:12px;padding:11px 14px;border-radius:10px}.cgg-ok{background:#e4f3ea;color:#174d31}.cgg-err{background:#fbe7e2;color:#7a2413}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  var ownerUrl = '/owner/?type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(id);
  var box = document.createElement('section');
  box.className = 'cgg-suggest';
  box.innerHTML =
    '<h2>Is something out of date?</h2>' +
    '<p>Tell us what has changed and our team will review it. Business owners can also claim this listing to manage it directly.</p>' +
    '<div class="cgg-row"><button type="button" class="cgg-open">Suggest an update</button><a class="cgg-btn cgg-light" href="' + ownerUrl + '">Own this business? Manage your listing</a></div>' +
    '<form class="cgg-form" hidden>' +
    '<label for="sgWhat">What should we change?</label><textarea id="sgWhat" maxlength="2000" required placeholder="e.g. New opening hours, new phone number, closed permanently…"></textarea>' +
    '<div class="cgg-two"><div><label for="sgPhone">Correct phone <small>(optional)</small></label><input id="sgPhone" maxlength="60"></div>' +
    '<div><label for="sgSite">Correct website <small>(optional)</small></label><input id="sgSite" type="text" inputmode="url" autocapitalize="off" spellcheck="false" maxlength="300" placeholder="e.g. mybar.com"></div></div>' +
    '<label for="sgHours">Correct opening hours <small>(optional)</small></label><input id="sgHours" maxlength="300">' +
    '<div class="cgg-two"><div><label for="sgName">Your name <small>(optional)</small></label><input id="sgName" maxlength="120" autocomplete="name"></div>' +
    '<div><label for="sgEmail">Your email <small>(optional, so we can follow up)</small></label><input id="sgEmail" type="email" maxlength="200" autocomplete="email"></div></div>' +
    '<input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">' +
    '<div class="cgg-row" style="margin-top:16px"><button type="submit">Send update</button><button type="button" class="cgg-light cgg-close">Cancel</button></div>' +
    '<div class="cgg-out" role="status"></div></form>';

  function mount() {
    var main = document.querySelector('main') || document.body;
    main.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  var form = box.querySelector('.cgg-form'), out = box.querySelector('.cgg-out');
  box.querySelector('.cgg-open').addEventListener('click', function () { form.hidden = false; box.querySelector('#sgWhat').focus(); });
  box.querySelector('.cgg-close').addEventListener('click', function () { form.hidden = true; });

  function say(kind, text) { out.replaceChildren(); var p = document.createElement('p'); p.className = 'cgg-msg ' + kind; p.textContent = text; out.appendChild(p); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.company.value) return; // spam trap
    var v = function (sel) { return box.querySelector(sel).value.trim(); };
    var changes = {};
    if (v('#sgPhone')) changes.phone = v('#sgPhone');
    if (v('#sgSite')) { var site = v('#sgSite'); changes.website = /^https?:\/\//i.test(site) ? site : 'https://' + site.replace(/^\/+/, ''); }
    if (v('#sgHours')) changes.hours = v('#sgHours');
    var heading = document.querySelector('#content h1');
    var body = {
      listing_type: type, listing_id: id, listing_name: heading ? heading.textContent.trim().slice(0, 200) : null,
      proposed_changes: changes, note: v('#sgWhat'), contact_name: v('#sgName') || null, contact_email: v('#sgEmail') || null
    };
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    fetch(cfg.supabaseUrl + '/rest/v1/listing_edit_requests', {
      method: 'POST',
      headers: { apikey: cfg.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body)
    }).then(function (r) {
      btn.disabled = false;
      if (r.ok) { form.reset(); say('cgg-ok', 'Thank you! Your update was sent to our team for review.'); }
      else say('cgg-err', 'Sorry, we could not send that right now. Please try again later.');
    }).catch(function () { btn.disabled = false; say('cgg-err', 'Sorry, we could not send that right now. Please check your connection.'); });
  });
})();
