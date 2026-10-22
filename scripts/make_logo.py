"""Run: python3 scripts/make_logo.py "<path to Fredoka[wdth,wght].ttf from Google Fonts>" assets
Builds the #4 "Sticker Wordmark" logo files with the lettering converted to shapes,
so they look the same on every device (no font needed)."""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = sys.argv[1]
OUT = sys.argv[2]
GREEN, CREAM, GOLD, CORAL, WHITE = '#103E2F', '#FBF5E8', '#F5BD3E', '#E66A4B', '#FFFFFF'

_cache = {}
def font(weight):
    if weight not in _cache:
        f = TTFont(FONT)
        _cache[weight] = instancer.instantiateVariableFont(f, {'wght': weight, 'wdth': 100})
    return _cache[weight]

def text_path(text, size, cx, baseline, weight=700, spacing=0, anchor='middle'):
    f = font(weight)
    cmap = f.getBestCmap(); gs = f.getGlyphSet(); hmtx = f['hmtx']; upm = f['head'].unitsPerEm
    s = size / upm
    names = [cmap[ord(c)] for c in text]
    width = sum(hmtx[n][0] * s for n in names) + spacing * (len(names) - 1)
    x = cx - width / 2 if anchor == 'middle' else (cx - width if anchor == 'end' else cx)
    pen = SVGPathPen(gs)
    for n in names:
        tp = TransformPen(pen, (s, 0, 0, -s, x, baseline))
        gs[n].draw(tp)
        x += hmtx[n][0] * s + spacing
    return pen.getCommands(), x

def wordmark():
    # Full sticker logo with the trademark symbol, 520 x 380.
    good, _ = text_path('Good', 88, 248, 190)
    gringo, gend = text_path('Gringo', 88, 248, 280)
    tm, _ = text_path('TM', 15, gend + 4, 238, 600, 1, 'start')
    ribbon, _ = text_path('CHRISTOPHER THE', 20, 248, 88, 600, 4)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 380" role="img" aria-labelledby="t"><title id="t">Christopher The Good Gringo</title>
<g transform="rotate(-4 260 200)">
<rect x="58" y="96" width="404" height="230" rx="46" fill="{GOLD}"/>
<rect x="46" y="84" width="404" height="230" rx="46" fill="{GREEN}" stroke="{CREAM}" stroke-width="10"/>
<path d="{good}" fill="{CREAM}"/>
<path d="{gringo}" fill="{GOLD}"/>
<path d="{tm}" fill="{CREAM}"/>
<rect x="120" y="56" width="256" height="48" rx="24" fill="{CORAL}" stroke="{CREAM}" stroke-width="6"/>
<path d="{ribbon}" fill="{WHITE}"/>
</g>
<g transform="translate(446 92)">
<circle r="46" fill="{GOLD}" stroke="{CREAM}" stroke-width="8"/>
<path d="M-20 -6 q7 -9 14 0 M6 -6 q7 -9 14 0" fill="none" stroke="{GREEN}" stroke-width="5" stroke-linecap="round"/>
<path d="M-16 10 q16 16 32 0" fill="none" stroke="{GREEN}" stroke-width="5" stroke-linecap="round"/>
</g>
</svg>
'''

def icon(sun=True):
    # Square "GG" sticker icon for headers, avatars and the browser tab.
    gg, _ = text_path('GG', 190, 200, 268, 700, -4)
    sun_svg = (f'<circle cx="318" cy="88" r="44" fill="{GOLD}" stroke="{CREAM}" stroke-width="14"/>' if sun else '')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-labelledby="t"><title id="t">Christopher The Good Gringo</title>
<rect x="18" y="18" width="364" height="364" rx="96" fill="{GREEN}" stroke="{CREAM}" stroke-width="20"/>
<path d="{gg}" fill="{CREAM}"/>
{sun_svg}
</svg>
'''

open(f'{OUT}/cgg-wordmark.svg', 'w').write(wordmark())
open(f'{OUT}/cgg-home-emblem.svg', 'w').write(icon())
open(f'{OUT}/cgg-logo.svg', 'w').write(icon())
open(f'{OUT}/favicon.svg', 'w').write(icon())
print('written')
