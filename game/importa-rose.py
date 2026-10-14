#!/usr/bin/env python3
"""Importa rose di giocatori da elenchi PUBBLICATI (CSV con ; : squadra;nome;ruolo;anno_nascita).

Uso:
  python importa-rose.py FILE.csv --categoria "Seconda Categoria" --fonte https://... [--dry-run]

- Associa ogni squadra a un club del database (nome esatto, alias o somiglianza).
- Per i club presenti nel file SOSTITUISCE i giocatori precedenti (rosa più recente).
- Ruoli accettati: P/D/C/A oppure POR/DIF/CEN/ATT.
- Non certifica tesseramenti: i nomi restano marcati come "elenco pubblicato".
Poi rigenera index.html (build.py), aggiorna legacy-8.6.html e i CSV dei giocatori.
"""
import argparse, csv, difflib, json, re, subprocess, sys, unicodedata
from pathlib import Path
P = Path(__file__).resolve().parent
D = P / 'database-nazionale-2026-27.json'
ROLE = {'P': 'POR', 'D': 'DIF', 'C': 'CEN', 'A': 'ATT', 'POR': 'POR', 'DIF': 'DIF', 'CEN': 'CEN', 'ATT': 'ATT'}
# nome sul sito -> nome nel database
ALIAS = {
    'arezzo fa': 'Arezzo Academy', 'subbiano': 'Marino Mercato Subbiano', 'atletico levane': 'Atletico Levane Leona',
    'olmoponte sf': 'Olmoponte', 'ag dicomano': 'A.G. Dicomano', 'audace galluzzo': 'Audace Galluzzo Oltrarno',
    'centro storico lebowski': 'C.S. Lebowski', 'incisa': 'I.C. Incisa', 'figline': 'Figline 1965',
    'v. mazzola siena': 'Valentino Mazzola', 'pestello': 'Pestello', 'fratticciola': 'Fratticciola',
}
# correzioni di nomi club nel database (verificati sulle fonti)
RENAME = {('Seconda Categoria', 'Postello'): 'Pestello', ('Seconda Categoria', 'Fratticola'): 'Fratticciola'}

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s.casefold()) if not unicodedata.combining(c)).strip()

def main():
    a = argparse.ArgumentParser(); a.add_argument('csv'); a.add_argument('--categoria', required=True); a.add_argument('--fonte', default='')
    a.add_argument('--stato', default='elenco_mercato_da_confermare'); a.add_argument('--dry-run', action='store_true'); args = a.parse_args()
    if args.fonte and not re.match(r'https://\S+$', args.fonte): raise ValueError('La fonte deve essere un URL https')
    db = json.loads(D.read_text(encoding='utf-8-sig'))
    for c in db['clubs']:
        new = RENAME.get((c['category'], c['name']))
        if new: c['name'] = new
    clubs = [c for c in db['clubs'] if c['category'] == args.categoria]
    if not clubs: raise ValueError('Categoria senza club nel database: ' + args.categoria)
    by_norm = {norm(c['name']): c['name'] for c in clubs}
    rows, unknown, seen_all = {}, set(), set()
    with open(args.csv, encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f, delimiter=';'):
            team = r['squadra'].strip(); name = re.sub(r'\s+', ' ', r['nome'].strip()); role = ROLE.get(r['ruolo'].strip().upper())
            if not team or not name or not role: continue
            target = ALIAS.get(norm(team)) or by_norm.get(norm(team))
            if not target:
                m = difflib.get_close_matches(norm(team), list(by_norm), n=1, cutoff=0.8)
                target = by_norm[m[0]] if m else None
            if not target or norm(target) not in by_norm: unknown.add(team); continue
            yr = r.get('anno_nascita', '').strip(); yr = int(yr) if yr.isdigit() and 1960 < int(yr) < 2015 else None
            src = (r.get('fonte') or '').strip() or args.fonte
            if not re.match(r'https://\S+$', src): raise ValueError('Manca una fonte https per ' + name)
            if norm(name) in seen_all: continue  # stesso nome in due squadre del file: tengo la prima
            seen_all.add(norm(name))
            rows.setdefault(target, []).append({'name': name, 'role': role, 'birth_year': yr, 'source': src})
    if unknown: print('ATTENZIONE, squadre non trovate nel database (ignorate):', ', '.join(sorted(unknown)))
    tot = sum(len(v) for v in rows.values())
    print(f'{len(rows)} club, {tot} giocatori da {args.csv}')
    if args.dry_run: print('DRY-RUN: nessuna modifica.'); return
    db['players'] = [p for p in db['players'] if not (p['category'] == args.categoria and p['club'] in rows)]
    nxt = max(int(p['id'][1:]) for p in db['players'] if re.fullmatch(r'r\d+', p['id'])) + 1
    for team, lst in rows.items():
        for x in lst:
            db['players'].append({'id': f'r{nxt:05d}', 'name': x['name'], 'club': team, 'category': args.categoria, 'birth_year': x['birth_year'], 'role': x['role'],
                                  'status': args.stato, 'source': x['source'], 'source_verified': 'elenco_pubblicato_non_tesseramento'}); nxt += 1
    for c in db['clubs']:
        n = sum(1 for p in db['players'] if p['club'] == c['name'] and p['category'] == c['category'])
        c['known_player_count'] = n
        if n: c['roster_status'] = 'rosa_parziale_da_elenco_pubblicato'
    D.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding='utf-8')
    with (P / 'giocatori-censiti-2026-27.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['id', 'name', 'club', 'category', 'birth_year', 'role', 'status', 'source', 'source_verified']); w.writeheader(); w.writerows(db['players'])
    with (P / 'giocatori_rose_2026-27.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['categoria', 'squadra', 'nome', 'anno_nascita', 'ruolo', 'stagione', 'stato', 'fonte'])
        for p in db['players']: w.writerow([p['category'], p['club'], p['name'], p['birth_year'] or '', p['role'], '2026/27', p['status'], p['source']])
    view = {k: db[k] for k in ['clubs', 'players', 'regions', 'regional_competitions']}; view['season'] = db['season']
    leg = P / 'legacy-8.6.html'
    if leg.exists():
        s = leg.read_text(encoding='utf-8'); st = s.index('const FM_NATIONAL=') + len('const FM_NATIONAL='); _, n = json.JSONDecoder().raw_decode(s[st:])
        leg.write_text(s[:st] + json.dumps(view, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + s[st + n:], encoding='utf-8')
    subprocess.run([sys.executable, str(P / 'build.py')], check=True)
    print(f'IMPORTATO. Giocatori pubblicati nel database: {len(db["players"])}')

if __name__ == '__main__':
    try: main()
    except (OSError, ValueError, KeyError) as e: print('ERRORE:', e, file=sys.stderr); sys.exit(1)
