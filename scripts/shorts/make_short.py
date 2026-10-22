#!/usr/bin/env python3
"""Makes a vertical YouTube Short (1080x1920, 30 fps, H.264 + AAC) from a JSON spec, in the site's brand style.

    python3 scripts/shorts/make_short.py spec.json out.mp4

Needs: the site served at http://localhost:8765 (python3 -m http.server 8765 from the repo root), Playwright
with Chromium, ffmpeg, numpy. The music is generated here (simple original chords, no copyright issues).

Spec: {"url": "...", "scenes": [{"dur": 4, "icon": "pin|mountain|coffee|bed|question", "kicker": "...",
        "title": "... <em>gold words</em> ...", "text": "...", "count": 33, "end": true, "endText": "..."}]}
"""
import json, math, os, subprocess, sys, tempfile, urllib.parse, wave
import numpy as np
from playwright.sync_api import sync_playwright

FPS, SR = 30, 44100


def music(seconds, path):
    """Soft, bright loop: I-V-vi-IV pads, a plucked arpeggio and a light shaker at 100 bpm."""
    n = int(seconds * SR); t = np.arange(n) / SR; out = np.zeros(n)
    beat = 60 / 100; bar = beat * 4
    chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]  # C G Am F
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    for b in range(int(seconds / bar) + 1):
        ch = chords[b % 4]; s0 = int(b * bar * SR); s1 = min(n, int((b + 1) * bar * SR))
        if s0 >= n: break
        tt = t[s0:s1] - b * bar
        env = np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.4)
        for m in ch:
            out[s0:s1] += 0.05 * env * (np.sin(2 * np.pi * f(m) * tt) + 0.3 * np.sin(2 * np.pi * f(m) * 2 * tt))
        for k in range(8):  # plucked eighth-note arpeggio, an octave up
            m = ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12; p0 = s0 + int(k * beat / 2 * SR); p1 = min(n, p0 + int(0.5 * SR))
            if p0 >= n: break
            pt = t[p0:p1] - t[p0]
            out[p0:p1] += 0.06 * np.exp(-pt * 7) * np.sin(2 * np.pi * f(m) * pt)
    rng = np.random.default_rng(7)
    for k in range(int(seconds / (beat / 2))):  # shaker on eighths
        p0 = int(k * beat / 2 * SR); p1 = min(n, p0 + int(0.06 * SR))
        if p0 >= n: break
        pt = t[p0:p1] - t[p0]
        out[p0:p1] += (0.02 if k % 2 else 0.035) * np.exp(-pt * 60) * rng.uniform(-1, 1, p1 - p0)
    for k in range(int(seconds / beat)):  # soft kick on each beat
        p0 = int(k * beat * SR); p1 = min(n, p0 + int(0.25 * SR))
        if p0 >= n: break
        pt = t[p0:p1] - t[p0]
        out[p0:p1] += 0.12 * np.exp(-pt * 18) * np.sin(2 * np.pi * (55 + 60 * np.exp(-pt * 30)) * pt)
    fade = int(1.5 * SR); out[-fade:] *= np.linspace(1, 0, fade); out[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
    out = out / max(1e-9, np.max(np.abs(out))) * 0.6
    pcm = (np.stack([out, out], 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main(spec_path, out_path):
    spec = json.load(open(spec_path, encoding='utf-8'))
    work = tempfile.mkdtemp(prefix='short-')
    url = 'http://localhost:8765/scripts/shorts/template.html?spec=' + urllib.parse.quote(json.dumps(spec))
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1080, 'height': 1920})
        pg.goto(url); pg.wait_for_timeout(1200)
        total = pg.evaluate('window.TOTAL')
        frames = int(math.ceil(total * FPS))
        for i in range(frames):
            pg.evaluate('t => window.seek(t)', i / FPS)
            pg.screenshot(path=os.path.join(work, 'f%05d.jpg' % i), type='jpeg', quality=92)
        b.close()
    music(total, os.path.join(work, 'music.wav'))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(work, 'f%05d.jpg'),
                    '-i', os.path.join(work, 'music.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out_path], check=True)
    print(out_path, round(total, 1), 's', os.path.getsize(out_path) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
