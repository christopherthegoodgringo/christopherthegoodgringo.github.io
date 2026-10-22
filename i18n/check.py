#!/usr/bin/env python3
"""Lists English text on the site that has no Spanish translation yet.

Usage (from the repository root):
    python3 i18n/check.py                # checks every page
    python3 i18n/check.py bars.html      # checks only the pages named

It serves the site locally, opens each page in a headless browser (needs:
pip install playwright && playwright install chromium) and prints every piece
of English text, placeholder or label that has no Spanish version. Add each one to i18n/es.json ("English": "Spanish"), or to
i18n/keep.json if it should stay the same in both languages (names,
addresses, brand names), then run python3 i18n/build.py.
"""
import glob, json, os, re, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
KEEP = set(json.load(open('i18n/keep.json', encoding='utf-8')))

pages = sys.argv[1:] or sorted(
    [p for p in glob.glob('*.html')] + [os.path.dirname(p) + '/' for p in glob.glob('*/index.html')])

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

port = free_port()
server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

JS = r"""() => {
  const out = [], L = window.CGGI18N && window.CGGI18N.lookup;
  if (!L) return ['(language script missing on this page)'];
  const bad = e => { for (; e && e.nodeType === 1; e = e.parentElement) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/i.test(e.tagName) || e.hasAttribute('data-no-translate') ||
          e.getAttribute('translate') === 'no' || e.classList.contains('en') || e.classList.contains('es')) return true; } return false; };
  const add = v => { v = (v || '').replace(/\s+/g, ' ').trim(); if (v && /[A-Za-z]{2}/.test(v) && L(v) == null) out.push(v); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (!bad(n.parentElement)) add(n.nodeValue);
  document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(e => { if (bad(e)) return;
    for (const a of ['placeholder', 'aria-label', 'title', 'alt']) add(e.getAttribute(a)); });
  add(document.title);
  return out;
}"""

ES_VALUES = set(json.load(open('i18n/es.json', encoding='utf-8')).values())
missing = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for width in (1280,):
            ctx = b.new_context(viewport={'width': width, 'height': 900})
            ctx.add_init_script("try{localStorage.setItem('gg-lang','en');localStorage.setItem('gg-lang-chosen','1')}catch(e){}")
            pg = ctx.new_page()
            for u in pages:
                pg.goto(f'http://127.0.0.1:{port}/{u}')
                pg.wait_for_timeout(1500)
                for t in pg.evaluate(JS):
                    if t in KEEP: continue
                    missing.setdefault(t, set()).add(u)
        b.close()
finally:
    server.terminate()

for t, us in sorted(missing.items(), key=lambda x: (sorted(x[1])[0], x[0])):
    print(f'{sorted(us)[0]:28} {t}')
print(f'\n{len(missing)} untranslated strings', file=sys.stderr)
