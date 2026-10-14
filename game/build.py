#!/usr/bin/env python3
"""Costruisce index.html (gioco offline completo, file unico) da src/ e dal database nazionale."""
import json
from pathlib import Path
P = Path(__file__).resolve().parent
db = json.loads((P / 'database-nazionale-2026-27.json').read_text(encoding='utf-8-sig'))
view = {k: db[k] for k in ['clubs', 'players', 'regions', 'regional_competitions']}
view['season'] = db['season']
data = json.dumps(view, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
css = (P / 'src' / 'style.css').read_text(encoding='utf-8')
engine = (P / 'src' / 'engine.js').read_text(encoding='utf-8')
ui = (P / 'src' / 'ui.js').read_text(encoding='utf-8')
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&display=swap">'
HEAD = f'''<title>FM del Valdarno</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Manageriale di calcio: dalla Terza Categoria alla Serie A">
<meta name="theme-color" content="#1a1c23"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="FM Valdarno">
{FONTS}
<style>{css}</style>'''
BODY = f'''<div id="root"><div style="padding:40px;color:#a3a9b5;font-family:system-ui">Caricamento…</div></div>
<script>const FM_NATIONAL={data};</script>
<script>{engine}</script>
<script>{ui}</script>'''
html = f'''<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{HEAD}</head>
<body>{BODY}
</body></html>
'''
(P / 'index.html').write_text(html, encoding='utf-8')
# versione per la pubblicazione come pagina web (lo scheletro html/head/body lo aggiunge la piattaforma)
(P / 'app-telefono.html').write_text(HEAD + '\n' + BODY + '\n', encoding='utf-8')
print(f'index.html generato: {len(html)//1024} KB, {len(view["clubs"])} club, {len(view["players"])} giocatori pubblicati')
