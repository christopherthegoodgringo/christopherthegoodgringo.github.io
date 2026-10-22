#!/usr/bin/env python3
"""Draws a cartoon portrait for each country team member (18 countries x 6 roles), in the same
illustrated style as the executive team portraits. Output: assets/team/country/<country>-<role>.svg

Run from the repository root:  python3 scripts/make_country_avatars.py
Each portrait is chosen deterministically from the country and role, so re-running gives the same faces."""
import hashlib, os, re

COUNTRIES = ['Argentina', 'Belize', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Dominican Republic', 'Ecuador',
             'El Salvador', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'Uruguay']
ROLES = ['Marketing', 'Social Media', 'Content Creator', 'Web Design', 'Local Research', 'Partnerships']

SKIN = [('#f1c7a5', '#c98f6c'), ('#e7b58e', '#b77958'), ('#dca17b', '#a8694c'), ('#c98a62', '#94583c'),
        ('#a96d48', '#7a462c'), ('#8a5534', '#5f3720')]
HAIR = ['#2a1d18', '#3a241e', '#4b2b22', '#6b3f26', '#a8743f', '#1c1c1f']
SHIRT = ['#263c50', '#1f5a4a', '#7a3b2e', '#3d3b6e', '#5a4632', '#2f4f6f']
COLLAR = ['#f6f0e4', '#fbf5e8', '#f5bd3e', '#e8d9c4']
BG = [('#174b3b', '#09291e'), ('#1b4f44', '#0b2c22'), ('#163f36', '#082319')]

# The GG logo badge, as in the executive portraits.
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
icon = open(os.path.join(root, 'assets', 'cgg-home-emblem.svg')).read()
ICON_INNER = re.search(r'</title>\s*(.*)</svg>', icon, re.S).group(1).strip()

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def pick(seq, h, shift):
    return seq[(h >> shift) % len(seq)]

def avatar(country, role):
    h = int(hashlib.sha256(f'{country}|{role}'.encode()).hexdigest(), 16)
    skin, shade = pick(SKIN, h, 0)
    hair = pick(HAIR, h, 8)
    shirt = pick(SHIRT, h, 16)
    collar = pick(COLLAR, h, 24)
    bg1, bg2 = pick(BG, h, 32)
    long_hair = (h >> 40) % 2 == 0
    beard = (not long_hair) and (h >> 44) % 3 == 0
    glasses = (h >> 48) % 4 == 0
    earrings = long_hair and (h >> 52) % 2 == 0
    curly = (h >> 56) % 3 == 0
    smile = pick(['M42 71 Q52 79 63 70', 'M43 70 Q52 77 62 70', 'M41 70 Q52 81 64 70'], h, 60)

    parts = []
    parts.append(f'<path d="M11 112 Q15 83 36 82 L72 82 Q97 87 101 112Z" fill="{shirt}"/>')
    parts.append(f'<path d="M39 82 L51 94 L64 82 L70 112 L32 112Z" fill="{collar}"/>')
    parts.append(f'<path d="M43 75 L43 86 Q51 94 59 86 L59 75Z" fill="{skin}"/>')
    if long_hair:
        parts.append(f'<path d="M24 67 Q18 25 52 20 Q91 19 88 65 L91 111 L21 111Z" fill="{hair}"/>')
    parts.append(f'<path d="M28 45 Q28 29 51 28 Q75 29 76 47 L72 65 Q69 79 52 82 Q35 78 31 65Z" fill="{skin}"/>')
    if curly:
        parts.append(f'<path d="M26 50 Q20 36 30 27 Q34 15 48 17 Q58 10 69 18 Q84 20 82 36 Q88 44 79 51 Q74 40 64 37 Q52 44 38 41 Q32 46 26 50Z" fill="{hair}"/>')
    else:
        parts.append(f'<path d="M28 48 Q25 26 45 20 Q70 14 82 39 L77 49 Q69 36 57 34 Q45 43 28 48Z" fill="{hair}"/>')
    parts.append('<path d="M35 52 Q40 49 45 52 M59 52 Q64 49 69 52" fill="none" stroke="#5b382b" stroke-width="1.8" stroke-linecap="round"/>')
    parts.append('<ellipse cx="41" cy="57" rx="2.2" ry="2.8" fill="#263d39"/><ellipse cx="63" cy="57" rx="2.2" ry="2.8" fill="#263d39"/>')
    if glasses:
        parts.append('<circle cx="41" cy="57" r="6.5" fill="none" stroke="#1f2a28" stroke-width="1.6"/><circle cx="63" cy="57" r="6.5" fill="none" stroke="#1f2a28" stroke-width="1.6"/><path d="M47.5 57 L56.5 57" stroke="#1f2a28" stroke-width="1.6"/>')
    parts.append(f'<path d="M51 57 L48 66 L53 67" fill="none" stroke="{shade}" stroke-width="1.5" stroke-linecap="round"/>')
    parts.append(f'<path d="{smile}" fill="none" stroke="#8e433b" stroke-width="2" stroke-linecap="round"/>')
    if beard:
        parts.append(f'<path d="M31 65 Q34 83 51 87 Q69 83 72 65 L68 76 Q52 91 36 76Z" fill="{hair}"/>')
    if earrings:
        parts.append('<circle cx="28" cy="62" r="2.2" fill="#f5bd3e"/><circle cx="75" cy="62" r="2.2" fill="#f5bd3e"/>')
    parts.append('<path d="M10 111 Q17 87 36 84 M76 84 Q95 88 102 111" fill="none" stroke="#f5bd3e" stroke-width="1.4"/>')

    label = f'Cartoon portrait: AI persona, {role}, {country}'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" role="img" aria-label="{label}">'
            f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient></defs>'
            f'<rect width="112" height="112" rx="10" fill="url(#bg)"/>'
            f'<svg x="70" y="7" width="28" height="28" viewBox="0 0 400 400">{ICON_INNER}</svg>'
            + ''.join(parts) +
            '<rect x="1" y="1" width="110" height="110" rx="10" fill="none" stroke="#f5bd3e" stroke-opacity=".65"/></svg>\n')

out = os.path.join(root, 'assets', 'team', 'country')
os.makedirs(out, exist_ok=True)
n = 0
for c in COUNTRIES:
    for r in ROLES:
        open(os.path.join(out, f'{slug(c)}-{slug(r)}.svg'), 'w').write(avatar(c, r)); n += 1
print(n, 'portraits written to assets/team/country/')
