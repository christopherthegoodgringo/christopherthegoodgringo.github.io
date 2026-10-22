/* Owner portal link for listing-information.html. (The public "suggest an update" form was removed:
   only a listing's verified owner can change it, and their changes go live automatically.) */
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
    '<h2>Own this business?</h2>' +
    '<p>Claim this listing for free to keep it up to date. Your changes go live as soon as you save them.</p>' +
    '<div class="cgg-row"><a class="cgg-btn" href="' + ownerUrl + '">Manage your listing</a></div>';

  function mount() {
    var main = document.querySelector('main') || document.body;
    main.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
