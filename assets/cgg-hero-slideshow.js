// Finder pages: the hero photo cycles through five photos, two per second.
// Each page sets data-slides on this script tag: "url|alt;;url|alt;;..." (the first photo is the one already in the page).
// Visitors who ask their device for reduced motion see the first photo only.
(function () {
  var me = document.currentScript;
  var list = (me && me.getAttribute('data-slides') || '').split(';;').filter(Boolean).map(function (s) {
    var p = s.split('|'); return { src: p[0].trim(), alt: (p[1] || '').trim() };
  });
  function start() {
    var box = document.querySelector('.hero-image');
    if (!box || list.length < 2) return;
    var first = box.querySelector('img');
    box.style.position = 'relative';
    var imgs = [first];
    list.slice(1).forEach(function (s) {
      var im = document.createElement('img');
      im.src = s.src; im.alt = s.alt; im.loading = 'eager'; im.decoding = 'async';
      im.className = 'cgg-hero-slide';
      im.setAttribute('aria-hidden', 'true');
      box.appendChild(im);
      imgs.push(im);
    });
    var css = document.createElement('style');
    css.textContent = '.hero-image .cgg-hero-slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}' +
      '.hero-image .cgg-hero-slide.on{opacity:1}';
    document.head.appendChild(css);
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      var next = (i + 1) % imgs.length;
      if (next !== 0 && !(imgs[next].complete && imgs[next].naturalWidth)) next = 0; // skip a photo that hasn't loaded yet
      imgs.forEach(function (im, k) { if (k > 0) im.classList.toggle('on', k === next); });
      i = next;
    }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
