#!/usr/bin/env python3
"""Build a Christopher The Good Gringo ebook PDF from Markdown.

Usage: python3 scripts/ebooks/build.py SRC_DIR OUT_DIR BOOK_ID LANG
  SRC_DIR/<BOOK_ID>.<LANG>.md  ->  OUT_DIR/<BOOK_ID>/<LANG>.pdf

The manuscripts and PDFs are NOT kept in this public repo (they're sold): they live in the private
Supabase storage bucket "ebooks" (<id>/en.pdf, <id>/es.pdf, src/<id>.<lang>.md).
Markdown front matter (first lines until a blank line):  title: ... / subtitle: ... / color: #hex / accent: #hex / icon: emoji
Needs pandoc and Playwright (Chromium).
"""
import json, os, re, subprocess, sys, html, pathlib, datetime

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
src_dir, out_dir, book, lang = sys.argv[1:5]
md = pathlib.Path(src_dir, f"{book}.{lang}.md").read_text(encoding="utf-8")
meta, _, body = md.partition("\n\n")
m = dict(re.findall(r"^(\w+):\s*(.+)$", meta, re.M))
title, subtitle = m["title"], m.get("subtitle", "")
color, accent, icon = m.get("color", "#103e2f"), m.get("accent", "#f5bd3e"), m.get("icon", "")
ink = "#103e2f" if color.lower() in ("#f5bd3e", "#d9822b") else "#fffdf8"

frag = subprocess.run(["pandoc", "-f", "markdown-auto_identifiers+auto_identifiers", "-t", "html5", "--toc", "--toc-depth=1",
                       "--template", str(HERE / "toc.tpl")], input=body, capture_output=True, text=True, check=True).stdout
toc, _, content = frag.partition("<!--TOC-END-->")
wordmark = (REPO / "assets/cgg-wordmark.svg").read_text(encoding="utf-8")
wordmark = re.sub(r"<title[^>]*>.*?</title>", "", wordmark)
fonts = (HERE / "fonts").as_uri()
year = datetime.date.today().year
T = {
  "en": {"by": "By Christopher The Good Gringo", "contents": "Contents", "edition": f"First edition, {year}",
         "rights": f"© {year} Christopher The Good Gringo™. All rights reserved. This ebook is for the personal use of the person who bought it. Please don’t share or resell it.",
         "disclaimer": "Prices, schedules, entry rules and businesses change. Everything here was checked when we wrote it, but always confirm important details (visas, tickets, safety advice) with official sources before you travel. Prices are rough guides in US dollars.",
         "more": "Find hotels, hostels, restaurants, bars and street food across Latin America at christopherthegoodgringo.com"},
  "es": {"by": "Por Christopher The Good Gringo", "contents": "Contenido", "edition": f"Primera edición, {year}",
         "rights": f"© {year} Christopher The Good Gringo™. Todos los derechos reservados. Este ebook es para uso personal de quien lo compró. Por favor no lo compartas ni lo revendas.",
         "disclaimer": "Los precios, horarios, requisitos de entrada y negocios cambian. Todo lo revisamos al escribirlo, pero siempre confirma los detalles importantes (visas, entradas, consejos de seguridad) con fuentes oficiales antes de viajar. Los precios son aproximados y en dólares estadounidenses.",
         "more": "Encuentra hoteles, hostales, restaurantes, bares y comida callejera en toda Latinoamérica en christopherthegoodgringo.com"},
}[lang]

page = f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>
@font-face{{font-family:Brico;src:url({fonts}/BricolageGrotesque-Bold.ttf);font-weight:700 900}}
@font-face{{font-family:Brico;src:url({fonts}/BricolageGrotesque-Regular.ttf);font-weight:400 600}}
@page{{size:A5;margin:16mm 15mm 18mm}}
@page:first{{margin:0}}
:root{{--c:{color};--a:{accent};--green:#103e2f;--gold:#f5bd3e;--coral:#e66a4b;--cream:#fbf5e8;--ink:#1d2a23;--muted:#5f6c64}}
*{{box-sizing:border-box}}
body{{margin:0;font-family:Inter,'DejaVu Sans',sans-serif;font-size:10.2pt;line-height:1.55;color:var(--ink)}}
.cover{{width:148mm;height:210mm;background:var(--c);color:{ink};position:relative;overflow:hidden;padding:22mm 16mm 18mm 20mm;display:flex;flex-direction:column;page-break-after:always}}
.cover:before{{content:"";position:absolute;left:0;top:0;bottom:0;width:5mm;background:#0000002e}}
.cover .ring{{position:absolute;right:-40mm;bottom:-40mm;width:120mm;height:120mm;border-radius:50%;border:1.2mm solid var(--a);opacity:.45}}
.cover .ring2{{position:absolute;left:-30mm;top:-46mm;width:90mm;height:90mm;border-radius:50%;border:.6mm solid var(--a);opacity:.3}}
.cover .logo{{width:52mm;transform:rotate(-3deg)}} .cover .logo svg{{width:100%;height:auto;display:block}}
.cover .icon{{position:absolute;right:16mm;top:20mm;font-size:30pt}}
.cover .rule{{height:1.2mm;width:100%;background:var(--a);border-radius:1mm;margin:auto 0 9mm}}
.cover h1{{font-family:Brico;font-weight:800;font-size:31pt;line-height:1.02;letter-spacing:-.02em;margin:0 0 5mm}}
.cover .sub{{font-size:12.5pt;line-height:1.35;opacity:.92;margin:0 0 9mm}}
.cover .by{{font-family:Brico;font-weight:700;font-size:9pt;letter-spacing:.14em;text-transform:uppercase;color:var(--a)}}
.front{{page-break-after:always;font-size:8.6pt;color:var(--muted);display:flex;flex-direction:column;justify-content:flex-end;height:176mm}}
.front .logo{{width:36mm;margin-bottom:6mm}} .front .logo svg{{width:100%;height:auto}}
.front p{{margin:0 0 3.5mm}}
.toc{{page-break-after:always}}
.toc h2{{font-family:Brico;font-weight:800;font-size:20pt;color:var(--green);margin:0 0 4mm}}
.toc ol,.toc ul{{list-style:none;padding:0;margin:0;counter-reset:ch}}
.toc li{{counter-increment:ch;padding:1.7mm 0;border-bottom:.25mm solid #e6ddca;font-size:10.5pt}}
.toc li:before{{content:counter(ch,decimal-leading-zero);display:inline-block;width:10mm;font-family:Brico;font-weight:700;color:var(--coral)}}
.toc a{{color:var(--ink);text-decoration:none}}
.content h1{{font-family:Brico;font-weight:800;font-size:21pt;line-height:1.08;color:var(--green);margin:0 0 5mm;padding-top:2mm;page-break-before:always;letter-spacing:-.015em}}
.content h1:before{{content:"";display:block;width:16mm;height:1.3mm;background:var(--c);border-radius:1mm;margin-bottom:5mm}}
.content h2{{font-family:Brico;font-weight:700;font-size:13.5pt;color:var(--green);margin:6mm 0 2mm;page-break-after:avoid}}
.content h3{{font-weight:700;font-size:10.6pt;margin:4.5mm 0 1.5mm;color:var(--ink);page-break-after:avoid}}
.content p{{margin:0 0 3mm}}
.content ul,.content ol{{margin:0 0 3.5mm;padding-left:5.5mm}} .content li{{margin:0 0 1.4mm}}
.content strong{{color:#0d2f23}}
.content blockquote{{margin:4mm 0;padding:3.5mm 4.5mm;background:#fbf5e8;border-left:1.2mm solid var(--gold);border-radius:0 2mm 2mm 0;page-break-inside:avoid}}
.content blockquote p{{margin:0 0 1.5mm}} .content blockquote p:last-child{{margin:0}}
.content table{{width:100%;border-collapse:collapse;margin:2mm 0 4.5mm;font-size:8.9pt;page-break-inside:avoid}}
.content th{{background:var(--green);color:#fffdf8;text-align:left;padding:2mm 2.4mm;font-weight:700}}
.content td{{padding:1.8mm 2.4mm;border-bottom:.25mm solid #e6ddca;vertical-align:top}}
.content tr:nth-child(even) td{{background:#fbf8f0}}
.content hr{{border:0;border-top:.3mm solid #e6ddca;margin:5mm 0}}
.content a{{color:var(--green)}}
.endnote{{margin-top:10mm;padding:5mm;border-radius:3mm;background:var(--green);color:#fbf5e8;font-size:9.5pt;page-break-inside:avoid}}
.endnote b{{color:var(--gold)}}
</style></head><body>
<section class="cover"><div class="ring"></div><div class="ring2"></div><div class="logo">{wordmark}</div><div class="icon">{icon}</div>
<div class="rule"></div><h1>{html.escape(title)}</h1><p class="sub">{html.escape(subtitle)}</p><div class="by">{T['by']}</div></section>
<section class="front"><div class="logo">{wordmark}</div><p><b style="color:#103e2f">{html.escape(title)}</b><br>{html.escape(subtitle)}</p>
<p>{T['edition']}</p><p>{T['disclaimer']}</p><p>{T['rights']}</p><p>{T['more']}</p></section>
<section class="toc"><h2>{T['contents']}</h2>{toc}</section>
<main class="content">{content}<div class="endnote"><b>Christopher The Good Gringo</b><br>{T['more']}</div></main>
</body></html>"""

out = pathlib.Path(out_dir, book); out.mkdir(parents=True, exist_ok=True)
tmp = out / f"{lang}.html"; tmp.write_text(page, encoding="utf-8")
node = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto({json.dumps(tmp.as_uri())}); await p.waitForTimeout(400);
  await p.pdf({{ path: {json.dumps(str(out / f'{lang}.pdf'))}, format: 'A5', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Inter,sans-serif;font-size:7px;color:#8a948d;padding:0 15mm;display:flex;justify-content:space-between"><span>{html.escape(title).replace("'", "&#39;")}</span><span class="pageNumber"></span></div>',
    margin: {{ top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' }}, preferCSSPageSize: true }});
  await p.pdf({{ path: {json.dumps(str(out / f'{lang}.cover.pdf'))}, format: 'A5', printBackground: true, pageRanges: '1', preferCSSPageSize: true }});
  await b.close();
}})();"""
subprocess.run(["node", "-e", node], check=True, env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
# Swap in a cover page without the page-number footer.
import pypdf
full = pypdf.PdfReader(str(out / f"{lang}.pdf")); cover = pypdf.PdfReader(str(out / f"{lang}.cover.pdf"))
w = pypdf.PdfWriter(); w.add_page(cover.pages[0])
for pg in full.pages[1:]: w.add_page(pg)
w.add_metadata({"/Title": title, "/Author": "Christopher The Good Gringo", "/Subject": subtitle})
with open(out / f"{lang}.pdf", "wb") as f: w.write(f)
(out / f"{lang}.cover.pdf").unlink(); tmp.unlink()
print(out / f"{lang}.pdf", len(full.pages), "pages")
