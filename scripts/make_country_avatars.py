#!/usr/bin/env python3
"""Draws a lifelike cartoon portrait for each country team member (18 countries x 6 roles).
Every portrait is different: face shape, skin tone, hairstyle and color, eyes, brows, mouth, outfit,
accessories and background are combined so no two people share the same look.
Output: assets/team/country/<country>-<role>.svg, plus the virtual executive team: assets/team/<name>.svg

Run from the repository root:  python3 scripts/make_country_avatars.py
Women and men match the names in team/country-names.js (scripts/make_country_names.py)."""
import hashlib, os, random, re

COUNTRIES = ['Argentina', 'Belize', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Dominican Republic', 'Ecuador',
             'El Salvador', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'Uruguay']
ROLES = ['Marketing', 'Social Media', 'Content Creator', 'Web Design', 'Local Research', 'Partnerships']
# Colombia's six already have names on the site: Valentina, Santiago, Camila, Andrés, Isabella, Mateo.
COLOMBIA_WOMEN = {'Marketing', 'Content Creator', 'Local Research'}

# (light, base, shadow, lip)
SKINS = [('#f8dcc6', '#f1c7a5', '#d9a07c', '#c7766a'), ('#f2cfb0', '#e7b58e', '#c98d66', '#b96a5e'),
         ('#e9bf97', '#dca17b', '#b97b55', '#a85f52'), ('#dcab82', '#c98a62', '#a3663f', '#94503f'),
         ('#c99068', '#b07448', '#8b5531', '#7d4234'), ('#b07a52', '#93603b', '#6e4325', '#6a3729'),
         ('#946344', '#7a4c30', '#57331d', '#58301f'), ('#7d5236', '#633d26', '#452815', '#4a2819')]
HAIR_COLORS = [('#1b1513', '#3a2c26'), ('#2a1d18', '#4a352b'), ('#3a241e', '#5e3d30'), ('#4b2b22', '#734634'),
               ('#6b3f26', '#94603e'), ('#8a5a33', '#b8834f'), ('#b48a52', '#d9b37a'), ('#77757a', '#a4a2a6')]
IRIS = ['#3b2418', '#4e2f1c', '#5c3a22', '#6e4a2a', '#7a5a2e', '#4f6b3a', '#3f6077']
OUTFIT_COLORS = ['#1f3a52', '#25584a', '#7a3b2e', '#3d3b6e', '#5a4632', '#2f4f6f', '#8a6d2b', '#5b2e4f',
                 '#2e5e6e', '#6b6b6b', '#a14d3a', '#355c3a', '#c8b89a', '#e9e2d4']
BGS = [('#dfe9e1', '#c4d8c9'), ('#dde8f2', '#bfd3e6'), ('#f2e6d3', '#e3cfae'), ('#f1ddd3', '#e2bfae'),
       ('#d8ebe8', '#b5d6d1'), ('#e6e0ef', '#cdc2df'), ('#efe9d8', '#ddd2b4'), ('#e2e6d5', '#c9d0b2')]

FACES = {
    'oval': 'M66 86 C66 58 82 46 100 46 C118 46 134 58 134 86 C134 112 120 134 100 136 C80 134 66 112 66 86 Z',
    'round': 'M63 90 C63 60 80 48 100 48 C120 48 137 60 137 90 C137 116 121 134 100 135 C79 134 63 116 63 90 Z',
    'square': 'M66 84 C66 58 82 47 100 47 C118 47 134 58 134 84 C134 108 129 124 117 131 C110 135 90 135 83 131 C71 124 66 108 66 84 Z',
    'heart': 'M65 84 C65 57 82 46 100 46 C118 46 135 57 135 84 C135 106 122 128 100 137 C78 128 65 106 65 84 Z',
}
WOMEN_HAIR = ['long', 'wavy', 'bob', 'bun', 'ponytail', 'curly', 'pixie', 'braid']
MEN_HAIR = ['crop', 'sidepart', 'buzz', 'curlyshort', 'bald', 'swept', 'quiff', 'waves']
WOMEN_OUTFITS = ['blouse', 'tee', 'blazer', 'turtleneck', 'cardigan']
MEN_OUTFITS = ['tee', 'blazer', 'polo', 'shirt', 'sweater']

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
logo = open(os.path.join(root, 'assets', 'cgg-wordmark.svg')).read()
LOGO_INNER = re.search(r'</title>\s*(.*)</svg>', logo, re.S).group(1).strip()

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def is_woman(country, role):
    if country == 'Colombia':
        return role in COLOMBIA_WOMEN
    h = int(hashlib.sha256(f'{country}|{role}'.encode()).hexdigest(), 16)
    return (h >> 40) % 2 == 0   # same rule as scripts/make_country_names.py

def curls(cx, cy, rx, ry, start, end, n, r, color, jitter=0):
    out = []
    import math
    for i in range(n):
        a = math.radians(start + (end - start) * i / max(1, n - 1))
        x = cx + rx * math.cos(a); y = cy + ry * math.sin(a)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r + (i % 3 - 1) * jitter:.1f}" fill="{color}"/>')
    return ''.join(out)

def hair_back(style, c, hi):
    if style == 'long':
        return f'<path d="M58 92 C54 50 78 34 100 34 C124 34 146 50 142 92 L146 170 C130 178 70 178 54 170 Z" fill="{c}"/>'
    if style == 'wavy':
        return (f'<path d="M57 92 C52 50 78 34 100 34 C124 34 148 50 143 92 L148 150 C152 160 140 168 144 178 '
                f'C126 184 74 184 56 178 C60 168 48 160 52 150 Z" fill="{c}"/>')
    if style == 'bob':
        return f'<path d="M58 92 C55 52 78 37 100 37 C122 37 145 52 142 92 L142 128 C134 136 121 136 117 129 L83 129 C79 136 66 136 58 128 Z" fill="{c}"/>'
    if style == 'ponytail':
        return f'<path d="M126 66 C152 74 160 116 146 156 C140 136 138 104 128 86 Z" fill="{c}"/>'
    if style == 'braid':
        return (f'<path d="M124 70 C140 86 140 112 132 130" fill="none" stroke="{c}" stroke-width="13" stroke-linecap="round"/>'
                + ''.join(f'<ellipse cx="{132 - i*1.2:.1f}" cy="{132 + i*10}" rx="7" ry="6" fill="{c}"/>' for i in range(4)))
    if style == 'curly':
        return (f'<path d="M56 96 C50 50 78 32 100 32 C124 32 152 50 144 96 L148 150 C126 162 74 162 52 150 Z" fill="{c}"/>'
                + curls(100, 100, 50, 56, 160, 380, 18, 10, c, 1.5))
    if style == 'bun':
        return f'<circle cx="100" cy="34" r="17" fill="{c}"/><path d="M90 30 Q100 22 110 30" fill="none" stroke="{hi}" stroke-width="2" opacity=".5"/>'
    return ''

def hair_front(style, c, hi):
    if style in ('long', 'wavy'):
        return (f'<path d="M64 94 C60 54 80 40 100 40 C120 40 141 54 136 94 C133 72 125 60 112 55 C100 64 80 70 64 94 Z" fill="{c}"/>'
                f'<path d="M84 52 Q104 46 122 56" fill="none" stroke="{hi}" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>')
    if style == 'bob':
        return (f'<path d="M64 90 C62 54 80 42 100 42 C120 42 138 54 136 90 C134 74 130 67 124 64 L76 64 C70 67 66 74 64 90 Z" fill="{c}"/>'
                f'<path d="M80 52 Q100 46 120 52" fill="none" stroke="{hi}" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>')
    if style in ('bun', 'ponytail', 'braid'):
        return (f'<path d="M65 84 C63 52 80 40 100 40 C120 40 137 52 135 84 C130 64 118 56 100 56 C82 56 70 64 65 84 Z" fill="{c}"/>'
                f'<path d="M82 50 Q100 44 118 50" fill="none" stroke="{hi}" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>')
    if style == 'curly':
        return curls(100, 70, 34, 26, 190, 350, 11, 9, c, 1.5)
    if style == 'pixie':
        return (f'<path d="M64 86 C60 50 82 38 102 38 C124 38 140 52 136 84 C132 70 126 62 118 60 C108 66 96 70 84 66 C76 70 68 76 64 86 Z" fill="{c}"/>'
                f'<path d="M90 48 Q108 44 124 56" fill="none" stroke="{hi}" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>')
    if style == 'crop':
        return (f'<path d="M64 84 C62 52 80 40 100 40 C122 40 138 52 136 84 C132 70 126 61 116 58 C104 62 88 62 76 58 C70 64 66 72 64 84 Z" fill="{c}"/>'
                f'<path d="M84 48 Q100 44 116 48" fill="none" stroke="{hi}" stroke-width="2" opacity=".4" stroke-linecap="round"/>')
    if style == 'sidepart':
        return (f'<path d="M64 86 C60 50 82 38 102 38 C124 38 140 54 136 86 C132 66 122 56 104 55 C96 60 86 63 76 63 C70 69 66 77 64 86 Z" fill="{c}"/>'
                f'<path d="M88 42 C92 48 94 52 96 58" fill="none" stroke="{hi}" stroke-width="1.6" opacity=".55"/>')
    if style == 'buzz':
        return f'<path d="M66 80 C66 54 82 44 100 44 C118 44 134 54 134 80 C128 64 116 56 100 56 C84 56 72 64 66 80 Z" fill="{c}" opacity=".88"/>'
    if style == 'curlyshort':
        return curls(100, 66, 36, 24, 180, 360, 13, 8, c, 1.2)
    if style == 'swept':
        return (f'<path d="M62 92 C56 52 80 34 104 36 C130 38 142 58 138 92 C134 72 128 60 110 54 C100 64 80 66 66 72 Z" fill="{c}"/>'
                f'<path d="M80 50 Q104 40 128 58" fill="none" stroke="{hi}" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>')
    if style == 'quiff':
        return (f'<path d="M65 84 C62 54 76 34 104 32 C128 32 140 50 135 84 C131 68 124 60 114 58 C112 50 104 46 94 50 C84 54 72 62 65 84 Z" fill="{c}"/>'
                f'<path d="M92 38 Q110 34 124 46" fill="none" stroke="{hi}" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>')
    if style == 'waves':
        return (f'<path d="M65 82 C64 54 81 42 100 42 C119 42 136 54 135 82 C130 66 118 58 100 58 C82 58 70 66 65 82 Z" fill="{c}"/>'
                f'<path d="M76 56 Q82 52 88 56 Q94 60 100 56 Q106 52 112 56 Q118 60 124 56" fill="none" stroke="{hi}" stroke-width="1.6" opacity=".55"/>')
    if style == 'bald':
        return '<path d="M84 54 Q96 48 108 52" fill="none" stroke="#ffffff" stroke-width="3" opacity=".25" stroke-linecap="round"/>'
    return ''

def outfit(kind, color, skin, shadow, accent):
    shoulders = 'M28 200 C30 168 56 152 86 146 L114 146 C144 152 170 168 172 200 Z'
    out = [f'<path d="{shoulders}" fill="{color}"/>']
    if kind == 'tee':
        out.append(f'<path d="M86 146 C91 157 109 157 114 146" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3"/>')
    elif kind == 'blazer':
        out.append(f'<path d="M86 146 L100 178 L114 146 Z" fill="{accent}"/>')
        out.append(f'<path d="M84 147 L100 180 L92 200 L66 200 L74 162 Z M116 147 L100 180 L108 200 L134 200 L126 162 Z" fill="#000" fill-opacity=".14"/>')
        out.append(f'<path d="M84 147 L96 172 M116 147 L104 172" stroke="#000" stroke-opacity=".25" stroke-width="1.6"/>')
    elif kind == 'polo':
        out.append(f'<path d="M86 146 L95 162 L100 150 Z M114 146 L105 162 L100 150 Z" fill="#000" fill-opacity=".16"/>')
        out.append(f'<path d="M100 150 L100 172" stroke="#000" stroke-opacity=".2" stroke-width="1.6"/><circle cx="100" cy="160" r="1.4" fill="#fff" opacity=".6"/>')
    elif kind == 'shirt':
        out.append(f'<path d="M86 146 L100 166 L114 146 Z" fill="{skin}"/>')
        out.append(f'<path d="M84 146 L98 166 L90 170 Z M116 146 L102 166 L110 170 Z" fill="#fff" opacity=".85"/>')
        out.append(f'<path d="M100 166 L100 200" stroke="#000" stroke-opacity=".15" stroke-width="1.6"/>')
    elif kind == 'sweater':
        out.append(f'<path d="M84 146 C90 160 110 160 116 146" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="6"/>')
    elif kind == 'blouse':
        out.append(f'<path d="M88 146 L100 168 L112 146 Z" fill="{skin}"/><path d="M88 146 L100 168 L112 146" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="2"/>')
    elif kind == 'turtleneck':
        out.append(f'<path d="M84 136 L116 136 L118 152 C108 158 92 158 82 152 Z" fill="{color}"/><path d="M84 142 L116 142 M84 148 L117 148" stroke="#000" stroke-opacity=".12" stroke-width="1.5"/>')
    elif kind == 'cardigan':
        out.append(f'<path d="M88 146 L100 170 L112 146 Z" fill="{accent}"/><path d="M86 146 L98 200 M114 146 L102 200" stroke="#000" stroke-opacity=".2" stroke-width="2"/>')
        out.append('<circle cx="99" cy="182" r="1.6" fill="#fff" opacity=".6"/><circle cx="98" cy="194" r="1.6" fill="#fff" opacity=".6"/>')
    return ''.join(out)

def draw(woman, a):
    light, skin, shadow, lip = a['skin']
    hc, hhi = a['hair_color']
    p = []
    p.append(f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{a["bg"][0]}"/><stop offset="1" stop-color="{a["bg"][1]}"/></linearGradient>'
             f'<radialGradient id="sk" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="{light}"/><stop offset=".6" stop-color="{skin}"/><stop offset="1" stop-color="{shadow}"/></radialGradient>'
             f'<linearGradient id="nk" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{shadow}"/><stop offset=".55" stop-color="{skin}"/></linearGradient></defs>')
    p.append('<rect width="200" height="200" rx="18" fill="url(#bg)"/>')
    p.append(f'<circle cx="{a["bokeh"][0]}" cy="{a["bokeh"][1]}" r="26" fill="#fff" opacity=".35"/><circle cx="{200 - a["bokeh"][0]}" cy="{a["bokeh"][1] + 70}" r="16" fill="#fff" opacity=".22"/>')
    p.append(hair_back(a['hair'], hc, hhi))
    p.append(outfit(a['outfit'], a['outfit_color'], skin, shadow, a['accent']))
    if a['necklace']:
        p.append('<path d="M88 148 Q100 164 112 148" fill="none" stroke="#d9b45a" stroke-width="1.6"/><circle cx="100" cy="158" r="2.4" fill="#d9b45a"/>')
    p.append('<path d="M86 122 L86 146 C92 153 108 153 114 146 L114 122 Z" fill="url(#nk)"/>')
    face = FACES[a['face']]
    p.append(f'<ellipse cx="65" cy="93" rx="7" ry="11" fill="{skin}"/><ellipse cx="135" cy="93" rx="7" ry="11" fill="{skin}"/>')
    p.append(f'<path d="M64 89 Q61 94 65 99 M136 89 Q139 94 135 99" fill="none" stroke="{shadow}" stroke-width="1.6" opacity=".7"/>')
    p.append(f'<path d="{face}" fill="url(#sk)"/>')
    if a['facial'] == 'stubble':
        p.append(f'<path d="M72 108 C76 128 88 136 100 136 C112 136 124 128 128 108 C120 120 112 124 100 124 C88 124 80 120 72 108 Z" fill="{hc}" opacity=".22"/>')
    elif a['facial'] == 'beard':
        p.append(f'<path d="M68 100 C70 126 86 140 100 140 C114 140 130 126 132 100 C128 114 118 122 100 122 C82 122 72 114 68 100 Z" fill="{hc}"/>')
    elif a['facial'] == 'goatee':
        p.append(f'<path d="M92 126 C94 134 106 134 108 126 C104 128 96 128 92 126 Z" fill="{hc}"/>')
    # brows
    bw = a['brow_w']; lift = a['brow_lift']
    p.append(f'<path d="M76 {82 + lift} Q86 {76 + lift} 95 {80 + lift}" fill="none" stroke="{hc}" stroke-width="{bw}" stroke-linecap="round"/>'
             f'<path d="M105 {80 + lift} Q114 {76 + lift} 124 {82 + lift}" fill="none" stroke="{hc}" stroke-width="{bw}" stroke-linecap="round"/>')
    # eyes
    for cx in (86, 114):
        p.append(f'<path d="M{cx-9} 93 Q{cx} 85 {cx+9} 93 Q{cx} 98 {cx-9} 93 Z" fill="#ffffff"/>')
        p.append(f'<circle cx="{cx}" cy="92.5" r="4.4" fill="{a["iris"]}"/><circle cx="{cx}" cy="92.5" r="2.1" fill="#120c09"/><circle cx="{cx + 1.5}" cy="91" r="1.1" fill="#fff"/>')
        p.append(f'<path d="M{cx-9.5} 93 Q{cx} 84.2 {cx+9.5} 93" fill="none" stroke="#2a1a14" stroke-width="{1.9 if woman else 1.5}" stroke-linecap="round"/>')
        if woman:
            p.append(f'<path d="M{cx+8} 90.5 l3 -2" stroke="#2a1a14" stroke-width="1.4" stroke-linecap="round"/>')
    # nose
    p.append(f'<path d="M100 96 C98 104 95 108 96 111 C98 114 102 114 104 111" fill="none" stroke="{shadow}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>')
    p.append(f'<ellipse cx="96" cy="110" rx="2" ry="1.2" fill="{shadow}" opacity=".5"/><ellipse cx="104" cy="110" rx="2" ry="1.2" fill="{shadow}" opacity=".5"/>')
    # mouth
    if a['mouth'] == 'teeth':
        p.append(f'<path d="M88 119 Q100 132 112 119 Q100 122 88 119 Z" fill="#fff"/><path d="M88 119 Q100 132 112 119" fill="none" stroke="{lip}" stroke-width="2.4" stroke-linecap="round"/><path d="M88 119 Q100 122 112 119" fill="none" stroke="{lip}" stroke-width="1.4"/>')
    elif a['mouth'] == 'soft':
        p.append(f'<path d="M89 120 Q100 116 111 120 Q100 128 89 120 Z" fill="{lip}"/><path d="M89 120 Q100 123 111 120" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1"/>')
    else:
        p.append(f'<path d="M88 119 Q100 129 112 119" fill="none" stroke="{lip}" stroke-width="2.6" stroke-linecap="round"/>')
    p.append('<circle cx="78" cy="108" r="6" fill="#e66a4b" opacity=".12"/><circle cx="122" cy="108" r="6" fill="#e66a4b" opacity=".12"/>')
    if a['facial'] == 'mustache':
        p.append(f'<path d="M88 116 C94 112 98 114 100 116 C102 114 106 112 112 116 C106 118 94 118 88 116 Z" fill="{hc}"/>')
    p.append(hair_front(a['hair'], hc, hhi))
    if a['earrings']:
        p.append('<circle cx="65" cy="106" r="2.6" fill="#d9b45a"/><circle cx="135" cy="106" r="2.6" fill="#d9b45a"/>')
    if a['glasses'] == 'round':
        p.append('<circle cx="86" cy="93" r="11" fill="none" stroke="#2b2b2b" stroke-width="2"/><circle cx="114" cy="93" r="11" fill="none" stroke="#2b2b2b" stroke-width="2"/><path d="M97 92 Q100 90 103 92 M75 92 L66 89 M125 92 L134 89" fill="none" stroke="#2b2b2b" stroke-width="2"/>')
    elif a['glasses'] == 'rect':
        p.append('<rect x="74" y="85" width="23" height="15" rx="4" fill="none" stroke="#3b2a20" stroke-width="2.2"/><rect x="103" y="85" width="23" height="15" rx="4" fill="none" stroke="#3b2a20" stroke-width="2.2"/><path d="M97 91 Q100 89 103 91 M74 90 L66 88 M126 90 L134 88" fill="none" stroke="#3b2a20" stroke-width="2"/>')
    p.append(f'<svg x="140" y="6" width="56" height="41" viewBox="0 0 520 380">{LOGO_INNER}</svg>')
    return ''.join(p)

# The virtual executive team (name, woman?).
EXECUTIVES = [('Sofía Reyes', True), ('Diego Navarro', False), ('Valentina Cruz', True), ('Andrés Molina', False),
              ('Camila Torres', True), ('Mateo Rojas', False), ('Lucía Fernández', True), ('Javier Castillo', False),
              ('Isabella Méndez', True), ('Elena Vargas', True)]

def ascii_slug(name):
    import unicodedata
    return slug(unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode())

def main():
    out = os.path.join(root, 'assets', 'team', 'country')
    os.makedirs(out, exist_ok=True)
    rng = random.Random(20261022)
    seen = set()
    n = 0
    people = [(c, r, is_woman(c, r)) for c in COUNTRIES for r in ROLES] + [(None, name, w) for name, w in EXECUTIVES]
    for c, r, woman in people:
        if True:
            for attempt in range(500):
                a = {
                    'skin': rng.choice(SKINS), 'hair_color': rng.choice(HAIR_COLORS[:6] if rng.random() < .8 else HAIR_COLORS),
                    'face': rng.choice(list(FACES)), 'hair': rng.choice(WOMEN_HAIR if woman else MEN_HAIR),
                    'outfit': rng.choice(WOMEN_OUTFITS if woman else MEN_OUTFITS), 'outfit_color': rng.choice(OUTFIT_COLORS),
                    'accent': rng.choice(['#f6f0e4', '#ffffff', '#dfe8f0', '#f3e3c3']), 'iris': rng.choice(IRIS),
                    'bg': rng.choice(BGS), 'bokeh': (rng.randint(28, 60), rng.randint(30, 60)),
                    'brow_w': rng.choice([2.6, 3.2, 3.8] if not woman else [2.2, 2.6, 3.0]), 'brow_lift': rng.choice([-1, 0, 1]),
                    'mouth': rng.choice(['smile', 'teeth', 'soft']),
                    'glasses': rng.choice(['none'] * 6 + ['round', 'rect']),
                    'facial': 'none' if woman else rng.choice(['none', 'none', 'stubble', 'beard', 'mustache', 'goatee']),
                    'earrings': woman and rng.random() < .55, 'necklace': woman and rng.random() < .3,
                }
                if a['hair'] == 'bald' and a['facial'] == 'none':
                    a['facial'] = 'beard'
                # No two people share the same overall look.
                sig = (woman, a['skin'][1], a['hair'], a['hair_color'][0], a['outfit'], a['outfit_color'])
                look = (woman, a['hair'], a['hair_color'][0], a['skin'][1])
                if sig in seen or look in seen:
                    continue
                seen.add(sig); seen.add(look)
                break
            label = f'Cartoon portrait: AI persona, {r}, {c}' if c else f'Cartoon portrait: AI persona {r}'
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="{label}">'
                   + draw(woman, a) + '</svg>\n')
            path = os.path.join(out, f'{slug(c)}-{slug(r)}.svg') if c else os.path.join(root, 'assets', 'team', f'{ascii_slug(r)}.svg')
            open(path, 'w', encoding='utf-8').write(svg)
            n += 1
    print(n, 'portraits written (108 country team + 10 executives)')

main()
