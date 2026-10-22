#!/usr/bin/env python3
"""Builds assets/cgg-i18n.js from i18n/cgg-i18n.template.js and i18n/es.json.

Every English string shown on the site needs a Spanish entry in i18n/es.json
("English text": "Spanish text"). After editing es.json or the template, run:
    python3 i18n/build.py
"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
d = json.load(open(os.path.join(here, 'es.json'), encoding='utf-8'))
d = {re.sub(r'\s+', ' ', k).strip(): v for k, v in d.items() if k.strip()}
tpl = open(os.path.join(here, 'cgg-i18n.template.js'), encoding='utf-8').read()
out = tpl.replace('/*__DICT__*/{}', json.dumps(d, ensure_ascii=False, separators=(',', ':')))
out = out.replace(' * DO NOT EDIT assets/cgg-i18n.js BY HAND.', ' * GENERATED FILE. DO NOT EDIT BY HAND.')
open(os.path.join(root, 'assets', 'cgg-i18n.js'), 'w', encoding='utf-8').write(out)
print('assets/cgg-i18n.js built with', len(d), 'Spanish entries')
