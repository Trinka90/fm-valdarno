/* FM del Valdarno 9.0 — interfaccia */
(function () {
'use strict';
const FM = window.FM;
const $ = s => document.querySelector(s);
const ROOT = () => { let r = document.getElementById('root'); if (!r) { r = document.createElement('div'); r.id = 'root'; document.body.appendChild(r); } return r; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = x => FM.eur(x);
const R = Math.round;
let S = null, view = 'home', turn = null, live = null, ui = { squadSort: 'pos', squadRole: '', mk: { tab: 'cerca', role: '', age: 40, fee: '', scope: 'tutti', q: '', minEst: 0 }, fxOpen: null, staffRole: '', inboxOpen: null };
const SAVE_AUTO = 'fmv9:auto', SLOT = n => 'fmv9:slot' + n;

/* ---------- storage ---------- */
function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function sset(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function sdel(k) { try { localStorage.removeItem(k); } catch (e) {} }
function autosave() { if (!S) return; if (!sset(SAVE_AUTO, FM.serialize())) toast('Salvataggio automatico non riuscito (memoria del browser piena o bloccata). Usa Esporta.'); }

/* ---------- helpers grafici ---------- */
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h >>> 0; }
/* --- identità dei club: colori sociali, stemmi a scudo, maglie --- */
const KNOWN = {
  Inter: ['#0a2a7a', '#111111', 'stripes'], Milan: ['#c8102e', '#111111', 'stripes'], Juventus: ['#f4f4f4', '#111111', 'stripes'], Roma: ['#8e1f2f', '#f0bc42', 'plain'],
  Lazio: ['#87c4ea', '#ffffff', 'plain'], Fiorentina: ['#5b2c83', '#ffffff', 'plain'], Napoli: ['#1d8fd8', '#ffffff', 'plain'], Torino: ['#7a1f2b', '#ffffff', 'plain'],
  Atalanta: ['#1b3f94', '#111111', 'stripes'], Bologna: ['#a51d2d', '#1c2c5b', 'halves'], Genoa: ['#a51d2d', '#1c2c5b', 'halves'], Sampdoria: ['#1b4aa0', '#ffffff', 'hoops'],
  Parma: ['#ffd100', '#1b3f94', 'band'], 'Hellas Verona': ['#1b3f94', '#ffd100', 'plain'], Udinese: ['#f4f4f4', '#111111', 'stripes'], Venezia: ['#111111', '#f47b20', 'band'],
  Lecce: ['#ffd100', '#c8102e', 'stripes'], Cagliari: ['#a51d2d', '#1c2c5b', 'halves'], Como: ['#1b4aa0', '#ffffff', 'plain'], Monza: ['#c8102e', '#ffffff', 'band'],
  Sassuolo: ['#111111', '#00843d', 'stripes'], Frosinone: ['#ffd100', '#1b3f94', 'plain'], Empoli: ['#1d6fd8', '#ffffff', 'plain'], Pisa: ['#111111', '#1b3f94', 'stripes'],
  Arezzo: ['#7a1f2b', '#ffffff', 'plain'], Livorno: ['#7a1f2b', '#ffffff', 'plain'], Perugia: ['#c8102e', '#ffffff', 'plain'], Palermo: ['#f4a6c1', '#111111', 'plain'],
  Bari: ['#ffffff', '#c8102e', 'band'], Catania: ['#c8102e', '#87c4ea', 'stripes'], Spezia: ['#f4f4f4', '#111111', 'band'], Siena: ['#f4f4f4', '#111111', 'stripes'],
  Triestina: ['#c8102e', '#ffffff', 'plain'], Pistoiese: ['#f47b20', '#ffffff', 'plain'], Lucchese: ['#c8102e', '#111111', 'stripes'], Prato: ['#87c4ea', '#ffffff', 'plain'],
  Grosseto: ['#ffffff', '#c8102e', 'sash'], Sangiovannese: ['#1d8fd8', '#ffffff', 'plain'], 'Aquila Montevarchi': ['#a51d2d', '#1c2c5b', 'stripes'], 'Figline 1965': ['#1c2c5b', '#ffd100', 'stripes'],
  Cremonese: ['#c8102e', '#9aa3a8', 'stripes'], Modena: ['#ffd100', '#1b3f94', 'plain'], Padova: ['#ffffff', '#c8102e', 'band'], Cesena: ['#ffffff', '#111111', 'band'], Catanzaro: ['#ffd100', '#c8102e', 'halves'],
  Reggiana: ['#8e1f2f', '#ffffff', 'plain'], Pescara: ['#1d8fd8', '#ffffff', 'stripes'], Ternana: ['#00843d', '#c8102e', 'stripes'], Salernitana: ['#7a1f2b', '#ffffff', 'plain'], Foggia: ['#c8102e', '#111111', 'stripes'],
};
const KIT = [['#c8102e', '#ffffff'], ['#1b3f94', '#ffffff'], ['#111111', '#ffffff'], ['#87c4ea', '#ffffff'], ['#ffd100', '#1b3f94'], ['#7a1f2b', '#ffffff'], ['#5b2c83', '#ffffff'], ['#00843d', '#ffffff'], ['#c8102e', '#ffd100'], ['#1b3f94', '#111111'], ['#c8102e', '#111111'], ['#f47b20', '#111111'], ['#ffd100', '#111111'], ['#a51d2d', '#1c2c5b'], ['#ffffff', '#c8102e'], ['#ffffff', '#1b3f94'], ['#00843d', '#111111'], ['#1d8fd8', '#ffffff']];
const PATS = ['plain', 'stripes', 'halves', 'hoops', 'sash', 'band', 'stripes', 'plain'];
const colCache = {};
function clubColors(name) {
  if (colCache[name]) return colCache[name];
  let k = KNOWN[name];
  if (!k) { const h = hash(name); const kit = KIT[h % KIT.length]; k = [kit[0], kit[1], PATS[(h >> 5) % PATS.length]]; }
  return (colCache[name] = { c1: k[0], c2: k[1], pat: k[2] });
}
function patternSVG(c, x0, y0, w, hgt) {
  const { c1, c2, pat } = c; let g = `<rect x="${x0}" y="${y0}" width="${w}" height="${hgt}" fill="${c1}"/>`;
  if (pat === 'stripes') for (let x = x0 + w / 7; x < x0 + w; x += w / 3.5) g += `<rect x="${x.toFixed(1)}" y="${y0}" width="${(w / 7).toFixed(1)}" height="${hgt}" fill="${c2}"/>`;
  else if (pat === 'halves') g += `<rect x="${x0 + w / 2}" y="${y0}" width="${w / 2}" height="${hgt}" fill="${c2}"/>`;
  else if (pat === 'hoops') for (let y = y0 + hgt / 6; y < y0 + hgt; y += hgt / 3) g += `<rect x="${x0}" y="${y.toFixed(1)}" width="${w}" height="${(hgt / 6).toFixed(1)}" fill="${c2}"/>`;
  else if (pat === 'sash') g += `<polygon points="${x0},${y0 + hgt * .2} ${x0 + w * .2},${y0} ${x0 + w},${y0 + hgt * .8} ${x0 + w * .8},${y0 + hgt}" fill="${c2}"/>`;
  else if (pat === 'band') g += `<rect x="${x0}" y="${y0 + hgt * .38}" width="${w}" height="${hgt * .2}" fill="${c2}"/>`;
  return g;
}
function initials(name) { return name.replace(/^(A\.?S\.?D\.?|U\.?S\.?|S\.?S\.?|Pol\.|G\.?S\.?|C\.?S\.?|A\.?G\.?|I\.?C\.?|Atletico|Virtus|Real|Sporting|Nuova|Polisportiva)\s+/i, '').split(/[\s-]+/).filter(w => /^[A-Za-zÀ-ú]/.test(w)).map(w => w[0]).join('').slice(0, 3).toUpperCase(); }
function ink(hex) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff'; }
function crest(name, size) {
  const px = size === true ? 22 : size || 40; const c = clubColors(name), id = 'cr' + hash(name).toString(36), ini = initials(name);
  return `<svg class="crest" width="${px}" height="${Math.round(px * 1.15)}" viewBox="0 0 40 46" aria-hidden="true"><defs><clipPath id="${id}"><path d="M20 2 L37 6.5 V22 C37 33 30 40 20 44 C10 40 3 33 3 22 V6.5 Z"/></clipPath></defs><g clip-path="url(#${id})">${patternSVG(c, 0, 0, 40, 46)}<rect x="0" y="27" width="40" height="19" fill="rgba(0,0,0,.28)"/></g><path d="M20 2 L37 6.5 V22 C37 33 30 40 20 44 C10 40 3 33 3 22 V6.5 Z" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/>${px >= 30 ? `<text x="20" y="38.5" text-anchor="middle" font-family="Barlow Semi Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="${ini.length > 2 ? 9 : 11}" fill="#fff">${esc(ini)}</text>` : ''}</svg>`;
}
function shirt(name, num, px) {
  px = px || 34; const c = clubColors(name), id = 'sh' + hash(name).toString(36);
  return `<svg class="shirt" width="${px}" height="${px}" viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id="${id}"><path d="M14 4 L8 6.5 L2 13 L7 18.5 L10.5 15.5 V37 H29.5 V15.5 L33 18.5 L38 13 L32 6.5 L26 4 C25 7 22.8 8.6 20 8.6 C17.2 8.6 15 7 14 4 Z"/></clipPath></defs><g clip-path="url(#${id})">${patternSVG(c, 0, 0, 40, 40)}</g><path d="M14 4 L8 6.5 L2 13 L7 18.5 L10.5 15.5 V37 H29.5 V15.5 L33 18.5 L38 13 L32 6.5 L26 4 C25 7 22.8 8.6 20 8.6 C17.2 8.6 15 7 14 4 Z" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/><text x="20" y="30" text-anchor="middle" font-family="Barlow Semi Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="14" fill="${c.c2}" stroke="${ink(c.c2) === '#fff' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)'}" stroke-width="1.1" paint-order="stroke">${num}</text></svg>`;
}
const numCache = {};
function shirtNum(p) {
  const key = p.club || 'x';
  if (!numCache[key] || numCache[key].n !== (S.clubs[key] ? S.clubs[key].squad.length : 0)) {
    const map = {}, used = new Set(); const sq = p.club ? FM.squad(p.club).slice().sort((a, b) => FM.ROLES.indexOf(a.role) - FM.ROLES.indexOf(b.role) || b.ovr - a.ovr) : [];
    const pref = { POR: [1, 12, 22, 33], DIF: [2, 3, 4, 5, 6, 13, 14, 15, 23, 26], CEN: [8, 10, 7, 16, 17, 18, 20, 21, 24, 25], ATT: [9, 11, 19, 27, 29, 30, 32] };
    for (const q of sq) { let n = (pref[q.role] || []).find(x => !used.has(x)); if (!n) { n = 34; while (used.has(n)) n++; } used.add(n); map[q.id] = n; }
    numCache[key] = { n: S.clubs[key] ? S.clubs[key].squad.length : 0, map };
  }
  return numCache[key].map[p.id] || '';
}
function rating(o, tier) { const st = FM.stars(o, tier); return `<span class="rt ${st >= 4 ? 'gold' : st >= 2.5 ? 'silver' : 'bronze'}">${Math.round(o)}</span>`; }
const IC = {
  home: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>', squad: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .2 5.5 2.5 5.5 5.8"/>',
  tactics: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><circle cx="12" cy="12" r="2.5"/><path d="M8 3v3.5h8V3M8 21v-3.5h8V21"/>', table: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
  more: '<path d="M4 7h16M4 12h16M4 17h16"/>', inbox: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', training: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>',
  fixtures: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', cup: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M9 20h6M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3"/>',
  market: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', staff: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>', finance: '<path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9"/>',
  sponsor: '<path d="m3 12 4-4 5 2 5-2 4 4-7 7z"/><path d="m9 11 3 2 3-2"/>', club: '<path d="M3 20V9l9-5 9 5v11"/><path d="M7 20v-6h10v6M3 20h18"/>', options: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
};
const icon = k => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || ''}</svg>`;
const role = r => `<span class="role ${r}">${r}</span>`;
function starsHTML(v) { return `<span class="stars" title="${v.toFixed(1)} / 5"><i style="width:${v / 5 * 100}%"></i></span>`; }
function starsRange(lo, hi) { return `<span class="stars range" title="${lo.toFixed(1)}–${hi.toFixed(1)} / 5"><i class="hi" style="width:${hi / 5 * 100}%"></i><i class="lo" style="width:${lo / 5 * 100}%"></i></span>`; }
function noise(id, u) { return (hash(id + 'x') % (2 * u + 1)) - u; }
function est(p) { if (FM.known(p)) return { known: true, v: p.ovr, lo: p.ovr, hi: p.ovr }; const u = FM.scoutUnc(); const c = p.ovr + noise(p.id, u); return { known: false, v: c, lo: c - u, hi: c + u }; }
function ovrCell(p) {
  const e = est(p), t = S.league.tier;
  if (e.known) return `${rating(p.ovr, t)} ${starsHTML(FM.stars(p.ovr, t))}`;
  return `<span class="muted">${R(e.lo)}–${R(e.hi)}</span> ${starsRange(FM.stars(e.lo, t), FM.stars(e.hi, t))}`;
}
function potCell(p) {
  const t = S.league.tier;
  if (!FM.known(p)) return '<span class="dim">?</span>';
  const u = Math.max(2, R(8 - FM.staffAb('vice') * .3));
  return starsRange(FM.stars(Math.max(p.ovr, p.pa - u), t), FM.stars(p.pa + u, t));
}
function bar(v, cls) { return `<div class="bar ${cls || ''}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`; }
function fitCell(p) { const c = p.fit >= 85 ? '' : p.fit >= 65 ? 'w' : 'b'; return `<div class="row" style="gap:6px;flex-wrap:nowrap">${bar(p.fit, c)}<span class="tiny">${R(p.fit)}%</span></div>`; }
function moraleTxt(m) { return m >= 80 ? '<span class="good">Ottimo</span>' : m >= 60 ? 'Buono' : m >= 40 ? '<span class="warn">Discreto</span>' : '<span class="bad">Scontento</span>'; }
function formAvg(p) { return p.form.length ? (p.form.reduce((a, b) => a + b, 0) / p.form.length).toFixed(1) : '-'; }
function avgR(p) { return p.st.app ? (p.st.r / p.st.app).toFixed(2) : '-'; }
function status(p) {
  const out = [];
  if (p.inj) out.push(`<span class="pill r" title="${esc(p.injName)}">🩹 ${p.inj}s</span>`);
  if (p.susp) out.push(`<span class="pill r">🟥 ${p.susp}</span>`);
  if (p.listed) out.push('<span class="pill y">In vendita</span>');
  if (p.loan) out.push('<span class="pill b">Prestito</span>');
  if (p.club === S.clubId && !p.loan && p.until <= S.season) out.push('<span class="pill y">Scade</span>');
  if (p.homegrown) out.push('<span class="pill g">Vivaio</span>');
  return out.join(' ');
}
function realBadge(p) { return p.real ? ` <span class="pill b" title="Nome da elenco pubblicato (${esc(p.srcNote)}). Tesseramento non verificato, attributi simulati.">📋</span>` : ''; }
function aCls(v) { return v >= 16 ? 'a4' : v >= 11 ? 'a3' : v >= 6 ? 'a2' : 'a1'; }
const seasonLbl = s => `${s}/${String(s + 1).slice(2)}`;
function clubCat(cid) { const c = S.clubs[cid]; return c ? FM.TIERS[c.tier].cat : ''; }
const wageLbl = () => FM.TIERS[S.league.tier].amateur ? 'Rimborso/sett.' : 'Ingaggio/sett.';

/* ---------- toast / modali ---------- */
let toastT = null;
function toast(t) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); } el.innerHTML = t; el.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => el.style.display = 'none', 3800); }
function openModal(html, cls) { closeModal(); const o = document.createElement('div'); o.className = 'overlay'; o.id = 'ov'; o.innerHTML = `<div class="modal ${cls || ''}">${html}</div>`; document.body.appendChild(o); o.addEventListener('click', e => { if (e.target === o && !live) closeModal(); }); }
function closeModal() { const o = $('#ov'); if (o) o.remove(); }
function ask(text, ok) { openModal(`<h3>${text}</h3><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-a="close">Annulla</button><button class="btn pri" id="askok">Conferma</button></div>`); $('#askok').onclick = () => { closeModal(); ok(); }; }

/* ---------- avvio ---------- */
function init() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  const auto = sget(SAVE_AUTO);
  renderStart();
}
let startSel = null, startCat = 'Terza Categoria', startQ = '', startReg = 'Toscana';
function renderStart() {
  const all = FM.startClubs();
  const regs = [...new Set(all.filter(c => c.region).map(c => c.region))].sort(); regs.push('Italia: Serie D, C, B, A');
  const inReg = c => startReg === 'Italia: Serie D, C, B, A' ? !c.region : c.region === startReg;
  const clubs = all.filter(inReg);
  const cats = [...new Set(clubs.slice().sort((x, y) => y.tier - x.tier).map(c => c.cat))];
  if (!cats.includes(startCat)) startCat = cats[0];
  const list = clubs.filter(c => c.cat === startCat && (!startQ || c.name.toLowerCase().includes(startQ.toLowerCase()))).sort((x, y) => x.name.localeCompare(y.name, 'it'));
  if (startSel && !clubs.find(c => c.dbId === startSel)) startSel = null;
  const sel = clubs.find(c => c.dbId === startSel);
  const slots = [1, 2, 3].map(n => { const raw = sget(SLOT(n)); let info = null; if (raw) try { const o = JSON.parse(raw); info = `${o.clubs[o.clubId].name} · ${seasonLbl(o.season)} · ${o.league.cat}`; } catch (e) {} return { n, info }; });
  const auto = sget(SAVE_AUTO); let cont = null;
  if (auto) try { const o = JSON.parse(auto); cont = { name: o.clubs[o.clubId].name, season: seasonLbl(o.season), cat: o.league.cat }; } catch (e) {}
  const preview = sel ? (FM.REAL_BY_CLUB[sel.name] || []).filter(p => p.category === sel.cat) : [];
  const byRole = r => preview.filter(p => p.role === r).slice(0, 3).map(p => esc(p.name)).join(', ');
  const hint = { 'Terza Categoria': 'La scalata completa: 8 promozioni per arrivare in Serie A.', 'Seconda Categoria': 'Dilettanti puri, rimborsi spese e campi di provincia.', 'Prima Categoria': 'Dilettanti regionali: qualche soldo in più, avversari più esperti.', 'Promozione': 'Il calcio regionale che conta.', 'Eccellenza': 'Il vertice regionale: chi vince va in Serie D.', 'Serie D': 'Il primo campionato nazionale, a un passo dai professionisti.', 'Serie C': 'Professionisti: bilanci, procuratori, pressione.', 'Serie B': 'A un passo dalla Serie A.', 'Serie A': 'Massima serie: obiettivi e budget da grande club.' };
  ROOT().innerHTML = `<div class="hero"><div class="box">
  <h1>FM<br>del Valdarno</h1><div class="kicker">Stagione 2026/27 · dalla Terza Categoria alla Serie A</div>
  ${cont ? `<div class="card contcard" data-a="loadauto">${crest(cont.name, 52)}<div class="flex1"><div class="tiny muted">CONTINUA LA CARRIERA</div><b>${esc(cont.name)}</b><div class="small muted">${esc(cont.cat)} · ${esc(cont.season)}</div></div><span class="go">▶</span></div>` : ''}
  <div class="card stack" style="margin-top:14px" id="newcard">
    <h2>Nuova carriera</h2>
    <label class="small muted" for="mgr">Il tuo nome da allenatore</label>
    <input type="text" id="mgr" value="${esc(sget('fmv9:mgr') || '')}" placeholder="Es. Nello Trinchese" maxlength="40">
    <div class="stepl">1 · Zona</div>
    <select id="startreg" aria-label="Regione">${regs.map(r => `<option ${r === startReg ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
    <div class="stepl">2 · Categoria di partenza</div>
    <div class="chips">${cats.map(c => `<button class="btn sm ${c === startCat ? 'pri' : ''}" style="white-space:nowrap;flex:none" data-a="startcat" data-id="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="tiny muted">${esc(hint[startCat] || '')}</div>
    <div class="stepl">3 · Scegli la squadra <span class="muted">(${list.length})</span></div>
    <input type="search" id="startq" placeholder="🔍 Cerca squadra" value="${esc(startQ)}">
    <div class="clublist">${list.map(c => `<div class="it ${c.dbId === startSel ? 'on' : ''}" data-a="pickclub" data-id="${c.dbId}">${crest(c.name, 34)}<div class="flex1"><b>${esc(c.name)}</b><div class="tiny muted">girone ${esc(c.group)}${c.region ? ' · ' + esc(c.region) : ''}</div></div>${c.real ? `<span class="pill b" title="Giocatori con nome da elenchi pubblicati">📋 ${c.real}</span>` : '<span class="tiny dim">nomi generati</span>'}</div>`).join('') || '<div class="it muted">Nessuna squadra trovata</div>'}</div>
    ${sel ? `<div class="selclub" id="selclub">
      <div class="row" style="gap:12px">${crest(sel.name, 64)}<div class="flex1"><div class="tiny muted">HAI SCELTO</div><h2 style="margin:0">${esc(sel.name)}</h2><div class="small muted">${esc(sel.cat)}, girone ${esc(sel.group)}</div></div></div>
      ${preview.length ? `<div class="small stack" style="gap:4px;margin-top:10px">${['POR', 'DIF', 'CEN', 'ATT'].map(r => byRole(r) ? `<div class="row" style="gap:8px;flex-wrap:nowrap;align-items:flex-start">${role(r)}<span>${byRole(r)}</span></div>` : '').join('')}</div><div class="tiny muted" style="margin-top:6px">${sel.real} giocatori con nome da elenchi pubblicati (non è il tesseramento FIGC); il resto è generato.</div>` : '<div class="tiny muted" style="margin-top:8px">Rosa con nomi generati (cognomi tipici della zona). Puoi correggere i nomi nel gioco con ✏️.</div>'}
      ${sel.cat !== 'Terza Categoria' ? '<div class="tiny warn" style="margin-top:6px">Partendo da qui salti la scalata dai dilettanti: obiettivi e pressione sono quelli della categoria.</div>' : ''}
      <button class="btn pri big" data-a="start" style="margin-top:12px;width:100%">Inizia con ${esc(sel.name)} →</button>
    </div>` : '<div class="note">Tocca una squadra della lista per vederne la rosa e iniziare.</div>'}
  </div>
  <div class="card stack" style="margin-top:14px">
    <h2>Carica</h2>
    ${slots.map(s => `<div class="row sb"><span>Slot ${s.n}: ${s.info ? esc(s.info) : '<span class="dim">vuoto</span>'}</span>${s.info ? `<button class="btn sm" data-a="loadslot" data-id="${s.n}">Carica</button>` : ''}</div>`).join('')}
    <div class="row"><button class="btn" data-a="pasteimp">📋 Incolla codice salvataggio</button><label class="btn">📂 Importa file<input type="file" id="importfile" accept=".json,application/json" hidden></label></div>
    <div class="sep"></div>
    <p class="tiny muted">Club e gironi 2026/27 dal database nazionale del progetto (873 società). I nomi dei giocatori, dove presenti, vengono da elenchi pubblicati da società e portali: non sono liste ufficiali di tesserati. Abilità, valori e stipendi sono simulati.</p>
  </div>
  </div></div>`;
  const q = $('#startq'); q.oninput = () => { startQ = q.value; const pos = q.selectionStart; renderStart(); const n = $('#startq'); n.focus(); n.setSelectionRange(pos, pos); };
  $('#startreg').onchange = e => { startReg = e.target.value; startSel = null; startQ = ''; startCat = startReg === 'Toscana' ? 'Terza Categoria' : ''; renderStart(); };
  $('#importfile').onchange = importFile;
}
function startGame() {
  const name = ($('#mgr').value || '').trim() || 'Mister';
  sset('fmv9:mgr', name);
  FM.newGame({ dbId: startSel, manager: name, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, region: startReg === 'Italia: Serie D, C, B, A' ? 'Toscana' : startReg });
  S = FM.state(); view = 'home'; turn = null; autosave(); renderApp();
}
function importFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => { try { FM.load(r.result); S = FM.state(); turn = null; autosave(); view = 'home'; renderApp(); toast('Salvataggio importato'); } catch (err) { toast('File non valido: ' + esc(err.message)); } }; r.readAsText(f);
}

/* ---------- app ---------- */
const NAV = [['home', '🏠', 'Panoramica'], ['inbox', '✉️', 'Posta'], ['squad', '👥', 'Rosa'], ['tactics', '📋', 'Tattica'], ['training', '🏋️', 'Allenamento'], ['fixtures', '📅', 'Calendario'], ['table', '🏆', 'Classifica'], ['cup', '🥇', 'Coppa'], ['market', '🔄', 'Mercato'], ['staff', '🧑‍💼', 'Staff'], ['finance', '💶', 'Finanze'], ['sponsor', '🤝', 'Sponsor'], ['club', '🏟️', 'Società'], ['options', '💾', 'Salvataggi']];
function nextLabel() {
  if (S.gameOver) return 'Carriera terminata';
  if (S.pendingEnd) return 'Fine stagione';
  const e = FM.nextEvent(); if (!e) return '';
  if (e.t === 'pre') return `Precampionato ${e.i + 1}/4`;
  if (e.t === 'lg') return `${e.i + 1}ª giornata`;
  if (e.t === 'cup') return `${S.cup.name} · ${FM.CUP_ROUND[e.i]}`;
  if (e.t === 'po') return 'Playoff';
  return 'Fine stagione';
}
function renderApp() {
  S = FM.state();
  if (!S) return renderStart();
  if (!$('#app')) ROOT().innerHTML = '<div class="layout" id="app"><aside class="side"><div class="brand">⚽ FM DEL VALDARNO</div><nav class="nav" id="nav"></nav></aside><div class="main"><header class="top" id="top"></header><div class="content" id="view"></div></div><div class="dock" id="dock"></div></div>';
  const unread = S.inbox.filter(m => !m.read).length, offers = S.offersIn.length;
  $('#nav').innerHTML = NAV.map(([k, i, l]) => `<button class="${view === k ? 'on' : ''}" data-a="nav" data-id="${k}">${icon(k)}${l}${k === 'inbox' && unread ? `<span class="badge">${unread}</span>` : ''}${k === 'market' && offers ? `<span class="badge">${offers}</span>` : ''}</button>`).join('');
  const me = FM.myClub(), conf = R(S.board.conf);
  const cc = clubColors(me.name); const tbp = FM.table(S.league).findIndex(r => r.id === S.clubId) + 1;
  $('#top').style.setProperty('--club', cc.c1); $('#top').style.setProperty('--club2', cc.c2);
  $('#top').innerHTML = `<div class="club">${crest(me.name, 46)}<div class="cname"><b>${esc(me.name)}</b><span>${esc(S.league.cat)}, girone ${esc(S.league.group)}</span></div></div>
   <div class="meta"><div class="hm2">Stagione<b>${seasonLbl(S.season)}</b></div><div>Posizione<b>${tbp}ª</b></div><div>Saldo<b class="${S.fin.bal < 0 ? 'bad' : ''}">${eur(S.fin.bal)}</b></div><div>Fiducia<b class="${conf < 30 ? 'bad' : conf < 50 ? 'warn' : ''}">${conf}%</b></div>
   ${FM.windowOpen() ? '<span class="pill g">Mercato aperto</span>' : '<span class="pill">Mercato chiuso</span>'}
   <button class="btn pri" data-a="continue">${S.pendingEnd ? 'Chiudi stagione ▶' : turn ? 'Vai alla partita ▶' : 'Continua ▶'}</button></div>`;
  const goLbl = S.pendingEnd ? 'Chiudi stagione' : S.gameOver ? 'Carriera finita' : turn ? 'Vai alla partita' : 'Continua';
  const more = !TABS.slice(0, 4).some(t => t[0] === view);
  $('#dock').innerHTML = `<button class="go" data-a="continue"><b>${goLbl} ▶</b><small>${esc(nextLabel())}</small></button><nav class="tabbar">${TABS.map(([k, i, l]) => `<button class="${(k === 'more' ? more : view === k) ? 'on' : ''}" data-a="${k === 'more' ? 'more' : 'nav'}" data-id="${k}">${icon(k)}<span>${l}</span>${k === 'more' && (unread + offers) ? `<i class="dot">${unread + offers}</i>` : ''}</button>`).join('')}</nav>`;
  const fn = VIEWS[view] || VIEWS.home;
  $('#view').innerHTML = fn();
  mobState = mob();
  if (S.gameOver) showGameOver();
}
const TABS = [['home', '🏠', 'Home'], ['squad', '👥', 'Rosa'], ['tactics', '📋', 'Tattica'], ['table', '🏆', 'Classifica'], ['more', '☰', 'Altro']];
const mob = () => { try { return matchMedia('(max-width: 820px)').matches; } catch (e) { return false; } };
let mobState = null, rsT = null;
window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (S && $('#app') && mob() !== mobState) renderApp(); }, 150); });
function moreSheet() {
  const unread = S.inbox.filter(m => !m.read).length, offers = S.offersIn.length;
  openModal(`<button class="x" data-a="close">×</button><h2>Menu</h2><div class="sheetgrid">${NAV.filter(([k]) => !TABS.some(t => t[0] === k)).map(([k, i, l]) => `<button class="${view === k ? 'on' : ''}" data-a="nav" data-id="${k}">${icon(k)}${l}${k === 'inbox' && unread ? `<i class="dot">${unread}</i>` : ''}${k === 'market' && offers ? `<i class="dot">${offers}</i>` : ''}</button>`).join('')}</div><button class="btn" style="width:100%;margin-top:12px" data-a="mainmenu">🏠 Menu principale (cambia squadra / nuova carriera)</button>`, 'sheet');
}
function go(v) { view = v; renderApp(); window.scrollTo(0, 0); }

/* ---------- viste ---------- */
const VIEWS = {};
VIEWS.home = function () {
  const tb = FM.table(S.league), pos = tb.findIndex(r => r.id === S.clubId), me = tb[pos];
  const e = FM.nextEvent();
  let next = '';
  if (S.pendingEnd) next = `<h3>Stagione conclusa</h3><p>Premi <b>Chiudi stagione</b> per vedere il verdetto.</p>`;
  else if (e) {
    let opp = null, home = true, label = nextLabel();
    if (e.t === 'lg') { const f = S.league.fixtures[e.i].find(x => x.includes(S.clubId)); if (f) { home = f[0] === S.clubId; opp = home ? f[1] : f[0]; } }
    if (e.t === 'cup' && S.cup.out == null && S.cup.rounds[e.i]) { const ids = S.cup.rounds[e.i]; const k = ids.indexOf(S.clubId); if (k >= 0) { opp = k % 2 ? ids[k - 1] : ids[k + 1]; home = !(k % 2); } }
    if (opp) {
      const or = tb.findIndex(r => r.id === opp), mine = FM.myClub(), H = home ? mine : S.clubs[opp], A = home ? S.clubs[opp] : mine;
      const side = (c) => { const i = tb.findIndex(r => r.id === c.id); return `<div class="pside">${crest(c.name, 64)}<b>${esc(c.name)}</b><span>${i >= 0 ? (i + 1) + 'ª · ' + tb[i].pts + ' pt' : ''}</span><span class="form">${(i >= 0 ? tb[i].form.slice(-5) : []).map(f => `<i class="f ${f}">${f}</i>`).join('')}</span></div>`; };
      next = `<div class="poster" style="--c1:${clubColors(H.name).c1};--c2:${clubColors(A.name).c1}"><div class="plabel">${esc(label)} · ${home ? 'in casa' : 'in trasferta'}</div><div class="pteams">${side(H)}<div class="pvs">VS</div>${side(A)}</div></div>`;
    }
    else next = `<div class="small muted">${esc(label)}</div><p>${e.t === 'pre' ? 'Settimana di preparazione con amichevole. Il mercato è aperto.' : e.t === 'cup' ? 'Turno di coppa (sei eliminato): settimana di recupero.' : ''}</p>`;
  }
  const lm = S.lastMatch;
  const alerts = [];
  const sq = FM.squad(S.clubId);
  const inj = sq.filter(p => p.inj), sus = sq.filter(p => p.susp), exp = sq.filter(p => !p.loan && p.until <= S.season);
  if (sq.length < 18) alerts.push(`<span class="bad">Rosa corta: ${sq.length} giocatori.</span> Ingaggia degli svincolati.`);
  if (inj.length) alerts.push(`🩹 Infortunati: ${inj.map(p => esc(p.name)).join(', ')}`);
  if (sus.length) alerts.push(`🟥 Squalificati: ${sus.map(p => esc(p.name)).join(', ')}`);
  if (exp.length) alerts.push(`📄 Contratti in scadenza: ${exp.length}`);
  if (S.offersIn.length) alerts.push(`💰 Offerte ricevute: <a href="#" data-a="nav" data-id="market">${S.offersIn.length}</a>`);
  const freeSlots = Object.entries(FM.slotsMax()).reduce((a, [k, n]) => a + Math.max(0, n - S.sponsors.filter(s => s.slot === k).length), 0);
  if (freeSlots && S.sponsorOffers.length) alerts.push(`🤝 Spazi sponsor liberi: ${freeSlots} — <a href="#" data-a="nav" data-id="sponsor">vedi offerte</a>`);
  if (FM.wageBill() > S.board.wageBudget) alerts.push(`<span class="warn">Monte ingaggi oltre il budget del presidente.</span>`);
  if (S.fin.bal < 0) alerts.push(`<span class="bad">Saldo negativo: il presidente perde fiducia ogni settimana.</span>`);
  const mini = tb.map((r, i) => ({ r, i })).filter(({ i }) => i < 3 || Math.abs(i - pos) <= 2);
  const conf = S.board.conf;
  return `<div class="grid g2">
   <div class="card hl nextcard">${next.includes('poster') ? next : `<h3>Prossimo impegno</h3>${next}`}</div>
   <div class="card"><h3>Ultima partita</h3>${lm ? `<div class="small muted">${esc(lm.label)}</div><div class="lastres">${crest(lm.h, 30)}<b class="tn">${esc(lm.h)}</b><span class="sc">${lm.hg}<i>-</i>${lm.ag}</span><b class="tn r">${esc(lm.a)}</b>${crest(lm.a, 30)}</div>${lm.pens ? `<div class="small muted">Rigori ${lm.pens.h}-${lm.pens.a}</div>` : ''}<div class="small">${lm.ev.filter(x => x.type === 'goal').map(x => `${x.min}' ${esc(x.txt.replace('GOL! ', ''))}`).join('<br>') || '<span class="muted">Nessun gol</span>'}</div><div class="small muted" style="margin-top:6px">Migliore in campo: ${esc(lm.mom)}</div>` : '<p class="muted">Nessuna partita giocata.</p>'}</div>
   <div class="card"><div class="row sb"><h3>Classifica</h3><a href="#" data-a="nav" data-id="table" class="small">completa</a></div><div class="tbl-wrap"><table><tr><th>#</th><th>Squadra</th><th class="num">G</th><th class="num">DR</th><th class="num">Pt</th></tr>${mini.map(({ r, i }) => `<tr class="${r.id === S.clubId ? 'me' : ''}"><td>${i + 1}</td><td>${crest(r.name, true)} ${esc(r.name)}</td><td class="num">${r.g}</td><td class="num">${r.gf - r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`).join('')}</table></div></div>
   <div class="card stack"><h3>Presidente</h3><div><span class="muted small">Obiettivo stagionale</span><br><b>${esc(S.board.obj)}</b></div><div><span class="muted small">Fiducia nel mister: ${R(conf)}%</span>${bar(conf, conf < 30 ? 'b' : conf < 50 ? 'w' : '')}</div><div><span class="muted small">Monte ingaggi ${eur(FM.wageBill())} / budget ${eur(S.board.wageBudget)} a settimana</span>${bar(FM.wageBill() / S.board.wageBudget * 100, FM.wageBill() > S.board.wageBudget ? 'b' : '')}</div><div class="small muted">Posizione attuale: ${pos + 1}° · ${me.pts} punti in ${me.g} partite</div></div>
   <div class="card"><h3>Situazione</h3>${alerts.length ? alerts.map(a => `<div class="small" style="margin:5px 0">${a}</div>`).join('') : '<p class="muted small">Tutto in ordine.</p>'}</div>
   <div class="card flush"><div class="row sb"><h3>Posta</h3><a href="#" data-a="nav" data-id="inbox" class="small">tutta</a></div>${S.inbox.slice(0, 4).map(m => msgItem(m, m.choices && m.done == null)).join('')}</div>
  </div>`;
};
const KIND_IC = { world: 'fixtures', board: 'club', match: 'cup', transfer: 'market', med: 'staff', staff: 'staff', club: 'club', scout: 'squad', press: 'inbox', player: 'squad', fans: 'table', info: 'inbox' };
const KIND_LBL = { world: 'Dal girone', board: 'Presidente', match: 'Partita', transfer: 'Mercato', med: 'Infermeria', staff: 'Staff', club: 'Società', scout: 'Osservatori', press: 'Stampa', player: 'Spogliatoio', fans: 'Tifosi', info: 'Notizia' };
function choicesHTML(m) {
  if (!m.choices) return '';
  if (m.done != null) return `<div class="tiny muted" style="margin-top:6px">Hai scelto: <b>${esc(m.choices[m.done].label)}</b></div>`;
  return `<div class="choices">${m.choices.map((c, i) => `<button class="btn sm ${i === 0 ? 'pri' : ''}" data-a="choice" data-id="${m.id}|${i}">${esc(c.label)}</button>`).join('')}</div>`;
}
function msgItem(m, open) {
  return `<div class="inbox-item ${m.read ? '' : 'unread'} ${m.choices && m.done == null ? 'todo' : ''}" data-a="openmsg" data-id="${m.id}"><span class="mic k-${m.kind}">${icon(KIND_IC[m.kind] || 'inbox')}</span><div class="flex1"><div class="row sb" style="gap:6px"><b>${esc(m.title)}</b><span class="tiny muted">${KIND_LBL[m.kind] || ''} · sett. ${m.week}</span></div>${open ? `<div class="small mbody">${m.body}</div>${choicesHTML(m)}` : ''}</div></div>`;
}
VIEWS.inbox = function () {
  const todo = S.inbox.filter(m => m.choices && m.done == null);
  return `<div class="row sb"><h2>Posta</h2><button class="btn sm" data-a="readall">Segna tutto come letto</button></div>
  ${todo.length ? `<div class="card flush" style="margin-bottom:12px"><h3>Da decidere <span class="muted">${todo.length}</span></h3>${todo.map(m => msgItem(m, true)).join('')}</div>` : ''}
  <div class="card flush"><h3>Messaggi</h3>${S.inbox.filter(m => !(m.choices && m.done == null)).map(m => msgItem(m, ui.inboxOpen === m.id || (!m.read && S.inbox.indexOf(m) < 4))).join('') || '<p class="muted" style="padding:12px">Nessun messaggio</p>'}</div>`;
};
const SORTS = { pos: (a, b) => FM.ROLES.indexOf(a.role) - FM.ROLES.indexOf(b.role) || b.ovr - a.ovr, ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age, fit: (a, b) => b.fit - a.fit, wage: (a, b) => b.wage - a.wage, val: (a, b) => FM.valueFor(b) - FM.valueFor(a), g: (a, b) => b.st.g - a.st.g, name: (a, b) => a.name.localeCompare(b.name), until: (a, b) => a.until - b.until, mor: (a, b) => b.morale - a.morale };
VIEWS.squad = function () {
  let sq = FM.squad(S.clubId); if (ui.squadRole) sq = sq.filter(p => p.role === ui.squadRole);
  sq.sort(SORTS[ui.squadSort] || SORTS.pos);
  const th = (k, l, cls) => `<th class="s ${cls || ''}" data-a="sort" data-id="${k}">${l}${ui.squadSort === k ? ' ▾' : ''}</th>`;
  if (mob()) return `<div class="row sb"><h2>Rosa (${FM.squad(S.clubId).length})</h2></div><div class="chips">${['', 'POR', 'DIF', 'CEN', 'ATT'].map(r => `<button class="btn sm ${ui.squadRole === r ? 'pri' : ''}" data-a="srole" data-id="${r}">${r || 'Tutti'}</button>`).join('')}<select data-ch="ssort">${[['pos', 'Ruolo'], ['ovr', 'Valutazione'], ['age', 'Età'], ['fit', 'Condizione'], ['g', 'Gol'], ['wage', 'Ingaggio'], ['until', 'Scadenza']].map(([k, l]) => `<option value="${k}" ${ui.squadSort === k ? 'selected' : ''}>Ordina: ${l}</option>`).join('')}</select></div>
  ${roomCard()}
  <div class="mlist">${sq.map(mPlayer).join('')}</div>`;
  return `<div class="row sb"><h2>Rosa (${FM.squad(S.clubId).length})</h2><div class="row">${['', 'POR', 'DIF', 'CEN', 'ATT'].map(r => `<button class="btn sm ${ui.squadRole === r ? 'pri' : ''}" data-a="srole" data-id="${r}">${r || 'Tutti'}</button>`).join('')}</div></div>
  ${roomCard()}
  <div class="tbl-wrap"><table><tr>${th('pos', 'Ruolo')}${th('name', 'Giocatore')}${th('age', 'Età', 'num')}${th('ovr', 'Valutazione')}<th>Potenziale</th>${th('fit', 'Condizione')}${th('mor', 'Morale')}<th class="num">Forma</th>${th('g', 'Pr/G/A', 'num')}${th('wage', wageLbl(), 'num')}${th('until', 'Scad.', 'num')}${th('val', 'Valore', 'num')}<th>Stato</th></tr>
  ${sq.map(p => `<tr class="click" data-a="player" data-id="${p.id}"><td>${role(p.role)}</td><td><b>${esc(p.name)}</b>${realBadge(p)}</td><td class="num">${p.age}</td><td>${ovrCell(p)}</td><td>${potCell(p)}</td><td>${fitCell(p)}</td><td>${moraleTxt(p.morale)}</td><td class="num">${formAvg(p)}</td><td class="num">${p.st.app}/${p.st.g}/${p.st.as}</td><td class="num">${eur(p.wage)}</td><td class="num">${p.until + 1}</td><td class="num">${eur(FM.valueFor(p))}</td><td>${status(p)}</td></tr>`).join('')}</table></div>`;
};
function roomCard() {
  const h = R((S.room && S.room.harmony) != null ? S.room.harmony : 60), L = FM.roomLeaders();
  const lbl = h >= 75 ? 'Gruppo unito' : h >= 55 ? 'Clima sereno' : h >= 35 ? 'Qualche tensione' : 'Spogliatoio diviso';
  return `<div class="card room"><div class="row sb"><b>Spogliatoio: ${lbl}</b><span class="small muted">armonia ${h}%</span></div>${bar(h, h < 35 ? 'b' : h < 55 ? 'w' : '')}
   <div class="small" style="margin-top:8px">Leader: ${L.map(p => `<a href="#" data-a="player" data-id="${p.id}">${esc(p.name)}</a> <span class="muted">(${p.morale >= 60 ? 'sereno' : p.morale >= 40 ? 'teso' : 'scontento'})</span>`).join(', ')}</div>
   <div class="tiny muted" style="margin-top:4px">${wageLbl()}: ${eur(FM.wageBill())} · forza titolari ${FM.clubStrength(S.clubId).toFixed(1)}. Un buon capitano e i leader contenti tengono alta l'armonia, che pesa sul rendimento in partita.</div></div>`;
}
function mPlayer(p) {
  const club = p.club && p.club !== S.clubId ? S.clubs[p.club] : null;
  const e = est(p);
  const kitName = p.club ? S.clubs[p.club].name : 'Svincolati';
  return `<button class="mrow" data-a="player" data-id="${p.id}">${shirt(kitName, p.club ? shirtNum(p) : '', 38)}<span class="mmain"><b>${esc(p.name)}${p.real ? ' <span class="tiny" title="Nome da elenco pubblicato">📋</span>' : ''}</b><span class="mrole">${role(p.role)}</span><span class="tiny muted">${p.age} anni${club ? ' · ' + esc(club.name) + ' ' + FM.TIERS[club.tier].short : !p.club && !p.youthPool ? ' · svincolato' : ''}${p.club === S.clubId ? ` · ${R(p.fit)}% · ${p.st.app}p ${p.st.g}g` : ` · chiede ${eur(FM.wageDemand(p))}`}${club ? ' · ' + eur(FM.askingPrice(p)) : ''}</span>${status(p) ? `<span class="mstat">${status(p)}</span>` : ''}</span><span class="mval">${e.known ? rating(p.ovr, S.league.tier) : `<span class="rt unk">${R(e.lo)}–${R(e.hi)}</span>`}${e.known ? starsHTML(FM.stars(p.ovr, S.league.tier)) : starsRange(FM.stars(e.lo, S.league.tier), FM.stars(e.hi, S.league.tier))}</span></button>`;
}
function slotPos(form) {
  const roles = FM.FORMS[form], g = {}; roles.forEach((r, i) => (g[r] = g[r] || []).push(i));
  const pos = []; const place = (idx, y) => idx.forEach((i, k) => pos[i] = [(k + 1) / (idx.length + 1) * 100, y, idx.length]);
  place(g.POR, 89); place(g.DIF || [], 70);
  const c = g.CEN || [];
  if (form === '4-2-3-1') { place(c.slice(0, 2), 56); place(c.slice(2), 37); } else place(c, 44);
  place(g.ATT || [], form === '4-2-3-1' ? 15 : 19);
  return pos;
}
VIEWS.tactics = function () {
  FM.validateLineup();
  const T = S.tactic, roles = FM.FORMS[T.form], pos = slotPos(T.form), me = FM.myClub(), cc = clubColors(me.name);
  const all = FM.squad(S.clubId), avail = all.filter(p => !p.inj && !p.susp), unav = all.filter(p => p.inj || p.susp);
  const res = avail.filter(p => !T.slots.includes(p.id) && !T.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
  const sel = (id, obj, cur) => `<select id="t-${id}" data-ch="${id}">${Object.keys(obj).map(k => `<option ${k === cur ? 'selected' : ''}>${k}</option>`).join('')}</select>`;
  const xi = T.slots.filter(Boolean).map(id => S.players[id]);
  const avgXI = xi.length ? xi.reduce((s, p) => s + FM.roleOvr(p, roles[T.slots.indexOf(p.id)]), 0) / xi.length : 0;
  const ts = ui.tsel;
  if (!T.rt || T.rt.length !== roles.length || T.rtForm !== T.form) { T.rt = FM.defaultRT(T.form); T.rtForm = T.form; T.ins = roles.map(() => 'normale'); }
  const RTA = { 'Portiere': 'POR', 'Portiere libero': 'PL', 'Centrale': 'DC', 'Libero': 'LIB', 'Terzino': 'TER', 'Terzino di spinta': 'TS', 'Mediano': 'MED', 'Regista': 'REG', 'Mezzala': 'MEZ', 'Trequartista': 'TRQ', 'Esterno': 'EST', 'Prima punta': 'PP', 'Seconda punta': 'SP', 'Ala': 'ALA', 'Falso nove': 'F9' };
  const slotI = key => +key.slice(1);
  const disc = (p, r, key) => { const i = slotI(key); const v = R(FM.rtOvr(p, r, T.rt[i])); const out = p.role !== r; return `<button class="disc ${ts === key ? 'sel' : ''} ${out ? 'out' : ''}" data-a="tp" data-id="${key}" style="--k1:${cc.c1};--k2:${cc.c2}"><span class="dn">${shirtNum(p)}</span><span class="drt">${RTA[T.rt[i]] || ''}${T.ins[i] === 'libero' ? '↑' : T.ins[i] === 'posizione' ? '•' : ''}</span><span class="dl">${esc(p.name.split(' ').slice(-1)[0])}${T.captain === p.id ? ' ©' : ''}</span><span class="dv"><i class="${aCls(v / 5)}">${v}</i> <i class="fitdot" style="--f:${p.fit}%"></i></span></button>`; };
  const brow = (p, key, lbl) => `<button class="brow ${ts === key ? 'sel' : ''}" data-a="tp" data-id="${key}">${shirt(me.name, shirtNum(p), 28)}${role(p.role)}<span class="flex1 bname">${esc(p.name)}</span><span class="tiny muted">${R(p.fit)}%</span>${rating(p.ovr, S.league.tier)}</button>`;
  return `<div class="row sb"><h2>Tattica</h2><div class="row"><button class="btn sm" data-a="bestxi">Scegli i migliori</button></div></div>
  <p class="small muted" style="margin-top:-4px">${ts ? 'Ora tocca il giocatore o il posto con cui scambiarlo.' : 'Tocca un giocatore in campo, poi un altro (in campo o in panchina) per scambiarli.'}</p>
  <div class="grid g2">
   <div><div class="pitch tp">${roles.map((r, i) => { const [x, y] = pos[i]; const p = S.players[T.slots[i]]; return `<div class="slot" style="left:${x}%;top:${y}%"><span class="rl">${r}</span>${p ? disc(p, r, 's' + i) : `<button class="disc empty ${ts === 's' + i ? 'sel' : ''}" data-a="tp" data-id="s${i}">+</button>`}</div>`; }).join('')}</div>
    ${ts && ts[0] === 's' ? rolePanel(slotI(ts), roles[slotI(ts)], S.players[T.slots[slotI(ts)]]) : ''}
    <div class="row sb small" style="margin-top:8px"><span>Valutazione undici <b>${avgXI.toFixed(1)}</b></span><span>Intesa <b>${R(S.cohesion)}%</b></span></div>${bar(S.cohesion)}</div>
   <div class="stack">
    <div class="card"><h3>Istruzioni</h3><div class="stack"><div class="row sb"><label for="t-form">Modulo</label>${sel('form', FM.FORMS, T.form)}</div><div class="row sb"><label for="t-ment">Mentalità</label>${sel('ment', FM.MENT, T.ment)}</div><div class="row sb"><label for="t-press">Pressing</label>${sel('press', FM.PRESS, T.press)}</div><div class="row sb"><label for="t-tempo">Ritmo</label>${sel('tempo', FM.TEMPO, T.tempo)}</div>
     <div class="row sb"><label for="t-cap">Capitano</label><select id="t-cap" data-ch="captain">${xi.map(p => `<option value="${p.id}" ${p.id === T.captain ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
     <div class="row sb"><label for="t-pk">Rigorista</label><select id="t-pk" data-ch="pk">${xi.map(p => `<option value="${p.id}" ${p.id === T.pk ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
     <div class="row sb"><label for="t-cor">Calci d'angolo</label><select id="t-cor" data-ch="corner"><option value="">Scelta dello staff</option>${xi.map(p => `<option value="${p.id}" ${p.id === T.corner ? 'selected' : ''}>${esc(p.name)} (pas ${R(p.a.pas)})</option>`).join('')}</select></div>
     <div class="row sb"><label for="t-fk">Punizioni</label><select id="t-fk" data-ch="fk"><option value="">Scelta dello staff</option>${xi.map(p => `<option value="${p.id}" ${p.id === T.fk ? 'selected' : ''}>${esc(p.name)} (tir ${R(p.a.tir)})</option>`).join('')}</select></div>
     <label class="row small"><input type="checkbox" id="t-auto" data-ch="tauto" ${T.auto ? 'checked' : ''}> Lo staff sceglie la formazione ogni settimana</label>
     <label class="row small"><input type="checkbox" id="t-asub" data-ch="autosubs" ${T.autoSubs !== false ? 'checked' : ''}> Cambi automatici in partita</label></div></div>
    <div class="card flush"><h3>Panchina <span class="muted">${T.bench.length}/9</span></h3>${T.bench.map((id, i) => brow(S.players[id], 'b' + i)).join('')}</div>
    ${res.length ? `<div class="card flush"><h3>Riserve</h3>${res.map(p => brow(p, 'r' + p.id)).join('')}</div>` : ''}
    ${unav.length ? `<div class="card flush"><h3>Indisponibili</h3>${unav.map(p => `<div class="brow dis">${role(p.role)}<span class="flex1 bname">${esc(p.name)}</span><span class="tiny bad">${p.inj ? esc(p.injName) + ' · ' + p.inj + ' sett.' : 'squalificato ' + p.susp}</span></div>`).join('')}</div>` : ''}
   </div></div>`;
};
function rolePanel(i, role, p) {
  const T = S.tactic, opts = FM.RT[role] || {};
  return `<div class="card rolepanel"><div class="row sb"><b>${p ? esc(p.name) : 'Posto vuoto'} · ${esc(T.rt[i])}</b><button class="btn sm" data-a="tdone">Fatto</button></div>
   <div class="tiny muted" style="margin:4px 0 8px">Scegli il compito. Il numero è il rendimento di questo giocatore nel ruolo. Tocca un altro giocatore per scambiarli.</div>
   <div class="rtgrid">${Object.entries(opts).map(([k, d]) => `<button class="rtopt ${T.rt[i] === k ? 'on' : ''}" data-a="setrt" data-id="${i}|${k}"><b>${esc(k)}</b>${p ? `<span class="rtv ${aCls(FM.rtOvr(p, role, k) / 5)}">${R(FM.rtOvr(p, role, k))}</span>` : ''}<span class="tiny muted">${esc(d.d)}</span></button>`).join('')}</div>
   ${role !== 'POR' ? `<div class="row" style="margin-top:8px">${Object.entries(FM.INSTR).map(([k, d]) => `<button class="btn sm ${(T.ins[i] || 'normale') === k ? 'pri' : ''}" data-a="setins" data-id="${i}|${k}">${d.label}</button>`).join('')}</div>` : ''}</div>`;
}
VIEWS.training = function () {
  const tr = S.training;
  const sq = FM.squad(S.clubId).sort(SORTS.pos);
  return `<h2>Allenamento</h2><div class="grid g3">${Object.entries(FM.FOCUS).map(([k, f]) => `<div class="choice ${tr.focus === k ? 'on' : ''}" data-a="focus" data-id="${k}"><b>${f.label}</b><div class="tiny muted">${f.attrs.length ? f.attrs.map(a => FM.ATTR_LABEL[a]).join(', ') : 'Recupero condizione e morale, niente crescita'}${f.coh ? ' · +intesa' : ''}</div></div>`).join('')}</div>
  <div class="card" style="margin-top:14px"><div class="row"><b>Intensità</b>${Object.keys(FM.INTENSITY).map(k => `<button class="btn sm ${tr.intensity === k ? 'pri' : ''}" data-a="intens" data-id="${k}">${k}</button>`).join('')}<span class="small muted">Alta: crescita più rapida ma meno recupero e più infortuni. Bassa: il contrario.</span></div>
  <div class="small muted" style="margin-top:8px">Qualità allenamenti: allenatore in seconda ${FM.staffAb('vice') || '—'}, preparatore atletico ${FM.staffAb('prep') || '—'}, preparatore portieri ${FM.staffAb('portieri') || '—'}, centro sportivo livello ${S.fac.campo}. I giovani crescono di più, dopo i 30 si cala fisicamente.</div></div>
  <h3 style="margin-top:16px">Allenamento individuale</h3><div class="tbl-wrap"><table><tr><th>Ruolo</th><th>Giocatore</th><th class="num">Età</th><th class="num">Val.</th><th class="num">Δ stagione</th><th>Potenziale</th><th>Focus individuale</th></tr>
  ${sq.map(p => { const d = p.ovr - (p.o0 || p.ovr); return `<tr><td>${role(p.role)}</td><td>${esc(p.name)}</td><td class="num">${p.age}</td><td class="num">${R(p.ovr)}</td><td class="num ${d > .3 ? 'good' : d < -.3 ? 'bad' : 'muted'}">${d >= 0 ? '+' : ''}${d.toFixed(1)}</td><td>${potCell(p)}</td><td><select data-ch="pfocus" data-id="${p.id}"><option value="">Nessuno</option>${FM.ATTRS.filter(a => a !== 'por' || p.role === 'POR').map(a => `<option value="${a}" ${p.focus === a ? 'selected' : ''}>${FM.ATTR_LABEL[a]}</option>`).join('')}</select></td></tr>`; }).join('')}</table></div>`;
};
VIEWS.fixtures = function () {
  const L = S.league;
  const rows = L.fixtures.map((fx, i) => {
    const f = fx.find(x => x.includes(S.clubId)); const r = (L.results[i] || []).find(x => x.h === f[0] && x.a === f[1]);
    const home = f[0] === S.clubId, opp = S.clubs[home ? f[1] : f[0]];
    let res = '<span class="fxs">-</span>';
    if (r) { const my = home ? r.hg : r.ag, ot = home ? r.ag : r.hg; res = `<span class="fxs ${my > ot ? 'w' : my < ot ? 'l' : 'd'}">${r.hg}-${r.ag}</span>`; }
    const open = ui.fxOpen === i && L.results[i] && L.results[i].length;
    return `<button class="fxrow ${i === L.round ? 'next' : ''}" data-a="fxround" data-id="${i}"><span class="fxn">${i + 1}</span><span class="pill ${home ? 'g' : ''}">${home ? 'Casa' : 'Fuori'}</span>${crest(opp ? opp.name : '?', 26)}<span class="flex1 bname">${esc(opp ? opp.name : '?')}</span>${res}</button>` + (open ? `<div class="fxall">${L.results[i].map(x => `<div class="fxr">${crest(S.clubs[x.h].name, true)}<span class="flex1">${esc(S.clubs[x.h].name)}</span><b>${x.hg}-${x.ag}</b><span class="flex1" style="text-align:right">${esc(S.clubs[x.a].name)}</span>${crest(S.clubs[x.a].name, true)}</div>`).join('')}</div>` : '');
  }).join('');
  return `<h2>Calendario</h2><p class="small muted">${esc(L.cat)}, girone ${esc(L.group)}. Tocca una giornata giocata per vedere tutti i risultati.</p><div class="card flush">${rows}</div>`;
};
VIEWS.table = function () {
  const tb = FM.table(S.league), n = tb.length, rr = FM.promoRules(S.league.tier);
  const zone = i => i < rr.direct ? 'z-p' : rr.playoff && i + 1 >= rr.playoff[0] && i + 1 <= rr.playoff[1] ? 'z-o' : rr.releg && i >= n - rr.releg ? 'z-r' : '';
  const scorers = S.league.teams.flatMap(cid => FM.squad(cid)).filter(p => p.st.g > 0).sort((a, b) => b.st.g - a.st.g || b.st.as - a.st.as).slice(0, 15);
  return `<h2>Classifica ${esc(S.league.cat)} — girone ${esc(S.league.group)}</h2>
  <div class="row small" style="margin-bottom:8px"><span class="pill g">Promozione diretta (${rr.direct})</span>${rr.playoff ? `<span class="pill b">Playoff ${rr.playoff[0]}°–${rr.playoff[1]}°</span>` : ''}${rr.releg ? `<span class="pill r">Retrocessione (${rr.releg})</span>` : ''}</div>
  <div class="tbl-wrap"><table><tr><th>#</th><th>Squadra</th><th class="num">G</th><th class="num hm">V</th><th class="num hm">N</th><th class="num hm">P</th><th class="num hm">GF</th><th class="num hm">GS</th><th class="num">DR</th><th class="num">Pt</th><th class="hm">Forma</th></tr>
  ${tb.map((r, i) => `<tr class="${r.id === S.clubId ? 'me' : ''}"><td class="${zone(i)}">${i + 1}</td><td>${crest(r.name, true)} ${esc(r.name)}</td><td class="num">${r.g}</td><td class="num hm">${r.w}</td><td class="num hm">${r.d}</td><td class="num hm">${r.l}</td><td class="num hm">${r.gf}</td><td class="num hm">${r.ga}</td><td class="num">${r.gf - r.ga}</td><td class="num"><b>${r.pts}</b></td><td class="small hm">${r.form.slice(-5).map(f => `<span class="${f === 'V' ? 'good' : f === 'S' ? 'bad' : 'muted'}">${f}</span>`).join(' ')}</td></tr>`).join('')}</table></div>
  <h3 style="margin-top:18px">Marcatori</h3><div class="tbl-wrap"><table><tr><th>Giocatore</th><th>Squadra</th><th class="num">Gol</th><th class="num">Assist</th><th class="num">Presenze</th></tr>${scorers.map(p => `<tr class="click" data-a="player" data-id="${p.id}"><td>${role(p.role)} ${esc(p.name)}${realBadge(p)}</td><td>${esc(S.clubs[p.club].name)}</td><td class="num"><b>${p.st.g}</b></td><td class="num">${p.st.as}</td><td class="num">${p.st.app}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Ancora nessun gol.</td></tr>'}</table></div>`;
};
VIEWS.cup = function () {
  const C = S.cup;
  const nm = id => S.clubs[id] ? esc(S.clubs[id].name) : '?';
  return `<h2>${esc(C.name)}</h2><p class="small muted">Eliminazione diretta in gara secca, rigori in caso di parità. ${C.out != null ? `<b class="bad">Eliminati: ${FM.CUP_ROUND[C.out]}</b>` : C.winner === S.clubId ? '<b class="good">🏆 Coppa vinta!</b>' : ''}</p>
  <div class="grid g2">${FM.CUP_ROUND.map((rn, k) => { const ids = C.rounds[k]; if (!ids) return `<div class="card"><h3>${rn}</h3><p class="muted small">Da definire</p></div>`; const res = C.results[k]; let html = ''; for (let i = 0; i < ids.length; i += 2) { const r = res && res[i / 2]; const mine = ids[i] === S.clubId || ids[i + 1] === S.clubId; html += `<div class="row sb small" style="padding:5px;${mine ? 'background:#16302a;border-radius:6px' : ''}"><span>${r ? `<span class="${r.w === r.h ? 'good' : ''}">${nm(r.h)}</span>` : nm(ids[i])}</span><b>${r ? `${r.hg}-${r.ag}${r.pens ? ` (${r.pens.h}-${r.pens.a} rig.)` : ''}` : 'vs'}</b><span>${r ? `<span class="${r.w === r.a ? 'good' : ''}">${nm(r.a)}</span>` : nm(ids[i + 1])}</span></div>`; } return `<div class="card"><h3>${rn}</h3>${html}</div>`; }).join('')}</div>`;
};
/* --- mercato --- */
function marketList() {
  const f = ui.mk, t = S.league.tier;
  let ps = FM.marketPlayers();
  if (f.role) ps = ps.filter(p => p.role === f.role);
  if (f.age) ps = ps.filter(p => p.age <= +f.age);
  if (f.scope === 'svincolati') ps = ps.filter(p => !p.club);
  if (f.scope === 'campionato') ps = ps.filter(p => p.club && S.league.teams.includes(p.club));
  if (f.scope === 'sopra') ps = ps.filter(p => p.club && S.clubs[p.club].tier < t);
  if (f.scope === 'sotto') ps = ps.filter(p => p.club && S.clubs[p.club].tier > t);
  if (f.q) ps = ps.filter(p => (p.name + ' ' + (p.club ? S.clubs[p.club].name : '')).toLowerCase().includes(f.q.toLowerCase()));
  if (f.fee !== '' && f.fee != null) ps = ps.filter(p => FM.askingPrice(p) <= +f.fee);
  ps = ps.filter(p => est(p).v >= +f.minEst);
  return ps.sort((a, b) => est(b).v - est(a).v).slice(0, 120);
}
function mktRow(p) {
  const club = p.club ? S.clubs[p.club] : null;
  return `<tr class="click" data-a="player" data-id="${p.id}"><td>${role(p.role)}</td><td><b>${esc(p.name)}</b>${realBadge(p)}${S.shortlist.includes(p.id) ? ' ⭐' : ''}${S.scoutQ.includes(p.id) ? ' 👁' : ''}</td><td class="num">${p.age}</td><td>${club ? `${esc(club.name)} <span class="tiny muted">${FM.TIERS[club.tier].short}</span>` : '<span class="pill g">Svincolato</span>'}</td><td>${ovrCell(p)}</td><td class="num">${club ? eur(FM.askingPrice(p)) : '—'}</td><td class="num">${eur(FM.wageDemand(p))}</td></tr>`;
}
VIEWS.market = function () {
  const f = ui.mk, open = FM.windowOpen();
  const tabs = [['cerca', 'Cerca giocatori'], ['short', `Osservati (${S.shortlist.length})`], ['offerte', `Offerte ricevute (${S.offersIn.length})`], ['vendita', 'In vendita']];
  let body = '';
  const head = `<tr><th>Ruolo</th><th>Giocatore</th><th class="num">Età</th><th>Club</th><th>Valutazione</th><th class="num">Richiesta club</th><th class="num">Chiede/sett.</th></tr>`;
  if (f.tab === 'cerca') {
    const list = marketList();
    body = `<div class="card row" style="margin-bottom:10px"><select data-ch="mk-role"><option value="">Tutti i ruoli</option>${FM.ROLES.map(r => `<option ${f.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
     <select data-ch="mk-scope">${[['tutti', 'Tutti'], ['svincolati', 'Solo svincolati'], ['campionato', 'Nostro girone'], ['sopra', 'Categoria superiore'], ['sotto', 'Categoria inferiore']].map(([k, l]) => `<option value="${k}" ${f.scope === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
     <label class="small">Età max <input type="number" data-ch="mk-age" value="${esc(f.age)}" style="width:64px"></label><label class="small">Prezzo max € <input type="number" data-ch="mk-fee" value="${esc(f.fee)}" style="width:100px"></label><label class="small">Valutaz. min <input type="number" data-ch="mk-min" value="${esc(f.minEst)}" style="width:64px"></label><input type="text" data-ch="mk-q" placeholder="Nome o club" value="${esc(f.q)}"></div>
     <p class="small muted">${list.length} risultati. Le valutazioni dei giocatori non osservati sono stime (±${FM.scoutUnc()}): fai osservare i giocatori per conoscere attributi e potenziale. Club da categoria superiore difficilmente scendono di più livelli.</p>
     ${mob() ? `<div class="mlist">${list.map(mPlayer).join('')}</div>` : `<div class="tbl-wrap"><table>${head}${list.map(mktRow).join('')}</table></div>`}`;
  } else if (f.tab === 'short') {
    const list = S.shortlist.map(id => S.players[id]).filter(Boolean);
    body = list.length ? (mob() ? `<div class="mlist">${list.map(mPlayer).join('')}</div>` : `<div class="tbl-wrap"><table>${head}${list.map(mktRow).join('')}</table></div>`) : '<p class="muted">Nessun giocatore in lista. Aggiungili dalla scheda (⭐).</p>';
  } else if (f.tab === 'offerte') {
    body = S.offersIn.length ? `<div class="tbl-wrap"><table><tr><th>Giocatore</th><th>Club interessato</th><th class="num">Offerta</th><th class="num">Valore</th><th>Scade</th><th></th></tr>${S.offersIn.map(o => { const p = S.players[o.pid], c = S.clubs[o.club]; return `<tr><td>${role(p.role)} <a href="#" data-a="player" data-id="${p.id}">${esc(p.name)}</a></td><td>${esc(c ? c.name : '?')} <span class="tiny muted">${c ? FM.TIERS[c.tier].short : ''}</span></td><td class="num"><b>${eur(o.fee)}</b></td><td class="num">${eur(FM.valueFor(p))}</td><td class="small">sett. ${o.exp}</td><td class="row"><button class="btn sm pri" data-a="offacc" data-id="${o.id}">Accetta</button><input type="number" id="cnt-${o.id}" value="${R(o.fee * 1.2)}" style="width:100px"><button class="btn sm" data-a="offcnt" data-id="${o.id}">Rilancia</button><button class="btn sm danger" data-a="offrej" data-id="${o.id}">Rifiuta</button></td></tr>`; }).join('')}</table></div>` : '<p class="muted">Nessuna offerta. Metti in vendita un giocatore dalla sua scheda per attirare richieste (solo a mercato aperto).</p>';
  } else {
    const list = FM.squad(S.clubId).filter(p => p.listed);
    body = list.length ? `<div class="tbl-wrap"><table><tr><th>Giocatore</th><th class="num">Valore</th><th></th></tr>${list.map(p => `<tr><td>${role(p.role)} ${esc(p.name)}</td><td class="num">${eur(FM.valueFor(p))}</td><td><button class="btn sm" data-a="unlist" data-id="${p.id}">Togli dalla lista</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Nessun giocatore in vendita.</p>';
  }
  return `<div class="row sb"><h2>Mercato</h2><span class="pill ${open ? 'g' : ''}">${open ? 'Finestra aperta' : 'Finestra chiusa — solo svincolati'}</span></div>
  <p class="small muted">Saldo ${eur(S.fin.bal)} · monte ingaggi ${eur(FM.wageBill())} su budget ${eur(S.board.wageBudget)}/sett. · finestre: estate (precampionato e prime 2 giornate) e inverno (a metà stagione).</p>
  <div class="tabs">${tabs.map(([k, l]) => `<button class="${f.tab === k ? 'on' : ''}" data-a="mktab" data-id="${k}">${l}</button>`).join('')}</div>${body}`;
};
VIEWS.staff = function () {
  const eff = { vice: 'Allenamenti, intesa, rendimento in partita, stima del potenziale', prep: 'Recupero fisico, meno infortuni, crescita fisica', portieri: 'Crescita dei portieri', medico: 'Guarigioni più rapide', osservatore: 'Stime di mercato più precise, più giocatori osservati', ds: 'Prezzi e ingaggi più bassi, offerte migliori in uscita', giovanili: 'Qualità della leva giovanile' };
  const roleFilter = ui.staffRole;
  const cands = S.staffMarket.filter(s => !roleFilter || s.role === roleFilter).sort((a, b) => a.role.localeCompare(b.role) || b.ab - a.ab);
  const card = (s, mine) => `<div class="scard"><div class="row sb" style="gap:8px"><div class="flex1"><div class="tiny muted">${esc(FM.STAFF_ROLES[s.role])}</div><b>${esc(s.name)}</b></div><span class="rt ${s.ab >= 15 ? 'gold' : s.ab >= 9 ? 'silver' : 'bronze'}">${s.ab}</span></div><div class="tiny muted">${s.age} anni · ${eur(s.wage)}/sett.${mine ? ' · fino al ' + (s.until + 1) : ''}</div>${mine ? `<div class="tiny" style="margin-top:4px">${eff[s.role]}</div>` : ''}<div class="row" style="margin-top:8px">${mine ? `<button class="btn sm danger" data-a="firestaff" data-id="${s.id}">Licenzia</button>` : `<button class="btn sm pri" data-a="hirestaff" data-id="${s.id}">Assumi</button>`}</div></div>`;
  const empty = Object.keys(FM.STAFF_ROLES).filter(r => !S.staff.some(s => s.role === r));
  return `<h2>Staff</h2><p class="small muted">Costo staff ${eur(FM.staffBill())}/sett. Licenziare costa 6 settimane di stipendio. Nuovi candidati ogni 8 giornate e a inizio stagione.</p>
  <div class="grid g3">${S.staff.map(s => card(s, true)).join('')}${empty.map(r => `<div class="scard empty"><div class="tiny muted">${esc(FM.STAFF_ROLES[r])}</div><b>Posto vacante</b><div class="tiny muted">${eff[r]}</div></div>`).join('')}</div>
  <div class="row sb" style="margin-top:18px"><h3>Candidati</h3><select id="staffrole" data-ch="staffrole"><option value="">Tutti i ruoli</option>${Object.entries(FM.STAFF_ROLES).map(([k, l]) => `<option value="${k}" ${roleFilter === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="grid g3">${cands.map(s => card(s, false)).join('')}</div>`;
};
const CAT_LABEL = { presidente: 'Contributo presidente', iscrizione: 'Iscrizione campionato', sponsor: 'Sponsor', stipendi: 'Stipendi giocatori', staff: 'Stipendi staff', merch: 'Merchandising e bar', tv: 'Diritti TV', strutture: 'Strutture', giovanili: 'Settore giovanile', biglietti: 'Biglietti', trasferte: 'Trasferte', premi: 'Premi', mercato: 'Mercato' };
function junHTML() {
  const J = S.jun; if (!J) return '';
  const tb = J.teams.slice().sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga));
  const pos = tb.findIndex(t => t.me);
  const mini = tb.map((t, i) => ({ t, i })).filter(({ i }) => i < 3 || Math.abs(i - pos) <= 1);
  return `<div class="card flush" style="margin-top:16px"><h3>Campionato Juniores <span class="muted">${J.round}/${J.fx.length} giornate</span></h3>
   <div style="padding:10px 14px" class="small">Forza della Juniores: <b>${FM.junStrength().toFixed(1)}</b>${J.last ? ` · ultima: ${esc(J.last)}` : ''}. I ragazzi crescono ogni settimana, più in fretta con un buon settore giovanile e un buon allenatore. A 20 anni escono dalla Juniores: aggregali prima.</div>
   <div class="tbl-wrap" style="border:0;border-radius:0"><table><tr><th>#</th><th>Squadra</th><th class="num">G</th><th class="num">DR</th><th class="num">Pt</th></tr>${mini.map(({ t, i }) => `<tr class="${t.me ? 'me' : ''}"><td>${i + 1}</td><td>${crest(t.n, true)} ${esc(t.n)}</td><td class="num">${t.g}</td><td class="num">${t.gf - t.ga}</td><td class="num"><b>${t.pts}</b></td></tr>`).join('')}</table></div></div>`;
}
function finChart() {
  const wk = {}; for (const l of S.fin.ledger) if (l.season === S.season) wk[l.week] = (wk[l.week] || 0) + l.amount;
  const ks = Object.keys(wk).map(Number).sort((a, b) => a - b).slice(-24); if (ks.length < 2) return '';
  const vals = ks.map(k => wk[k]); const mx = Math.max(1, ...vals.map(Math.abs));
  const W = 600, H = 150, bw = W / ks.length;
  const bars = vals.map((v, i) => { const h = Math.abs(v) / mx * (H / 2 - 12); return `<rect x="${(i * bw + 2).toFixed(1)}" y="${(v >= 0 ? H / 2 - h : H / 2).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="2" fill="${v >= 0 ? 'var(--good)' : 'var(--bad)'}"><title>Sett. ${ks[i]}: ${eur(v)}</title></rect>`; }).join('');
  return `<div class="card" style="margin-top:14px"><h3>Entrate meno uscite, settimana per settimana</h3><svg viewBox="0 0 ${W} ${H}" class="fchart" role="img" aria-label="Saldo settimanale"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--line2)"/>${bars}</svg><div class="row sb tiny muted"><span>sett. ${ks[0]}</span><span>migliore ${eur(Math.max(...vals))} · peggiore ${eur(Math.min(...vals))}</span><span>sett. ${ks[ks.length - 1]}</span></div></div>`;
}
VIEWS.finance = function () {
  const f = S.fin.season; const ent = Object.entries(f);
  const inc = ent.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), out = ent.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const T = FM.TIERS[S.league.tier], sp = S.sponsors.reduce((s, x) => s + x.weekly, 0);
  return `<h2>Finanze</h2><div class="grid g3">
   <div class="card"><div class="muted small">Saldo</div><div class="kpi ${S.fin.bal < 0 ? 'bad' : ''}">${eur(S.fin.bal)}</div></div>
   <div class="card"><div class="muted small">Monte ingaggi / budget</div><div class="kpi">${eur(FM.wageBill())}</div><div class="small muted">budget ${eur(S.board.wageBudget)}/sett.</div>${bar(FM.wageBill() / S.board.wageBudget * 100, FM.wageBill() > S.board.wageBudget ? 'b' : '')}</div>
   <div class="card"><div class="muted small">Entrate fisse/sett.</div><div class="kpi">${eur(sp + T.tv)}</div><div class="small muted">sponsor ${eur(sp)}${T.tv ? ` · TV ${eur(T.tv)}` : ''}</div></div>
  </div>
  ${finChart()}
  <div class="grid g2" style="margin-top:14px">
   <div class="card"><h3>Stagione ${seasonLbl(S.season)}</h3><table>${inc.map(([k, v]) => `<tr><td>${CAT_LABEL[k] || k}</td><td class="num good">${eur(v)}</td></tr>`).join('')}${out.map(([k, v]) => `<tr><td>${CAT_LABEL[k] || k}</td><td class="num bad">${eur(v)}</td></tr>`).join('')}<tr><td><b>Totale</b></td><td class="num"><b>${eur(ent.reduce((s, [, v]) => s + v, 0))}</b></td></tr></table></div>
   <div class="card stack"><h3>Biglietteria</h3><div class="row">Prezzo biglietto € <input type="number" data-ch="ticket" value="${S.ticket}" min="0" max="500" style="width:80px"><span class="small muted">riferimento categoria ${eur(T.ticket)}</span></div><p class="small muted">Prezzi alti riducono l'affluenza. Capienza stadio: ${FM.STADIUM[S.fac.stadio - 1]} posti · tifosi stimati ${FM.myClub().fans}.</p>
   <h3>Presidente</h3><p class="small muted">Una volta a stagione puoi chiedere un'iniezione di capitale (serve fiducia ≥ 45, costa fiducia).</p><button class="btn" data-a="askfunds" ${S.board.askedFunds ? 'disabled' : ''}>Chiedi fondi al presidente</button></div>
  </div>
  <h3 style="margin-top:16px">Movimenti</h3><div class="tbl-wrap" style="max-height:420px"><table><tr><th>Stagione</th><th>Sett.</th><th>Descrizione</th><th class="num">Importo</th></tr>${S.fin.ledger.slice(0, 120).map(l => `<tr><td>${seasonLbl(l.season)}</td><td>${l.week}</td><td>${esc(l.desc)}</td><td class="num ${l.amount < 0 ? 'bad' : 'good'}">${eur(l.amount)}</td></tr>`).join('')}</table></div>`;
};
VIEWS.sponsor = function () {
  const max = FM.slotsMax();
  const mono = n => { const c = clubColors(n); return `<span class="smono" style="background:${c.c1};color:${ink(c.c1)}">${esc(initials(n).slice(0, 2))}</span>`; };
  return `<h2>Sponsor</h2><p class="small muted">Le offerte arrivano a inizio stagione e dipendono da categoria, reputazione e tifosi. Alla firma incassi un bonus.</p>
  <div class="grid g3">${Object.entries(max).filter(([, n]) => n).map(([k, n]) => { const cur = S.sponsors.filter(s => s.slot === k); return `<div class="card"><h3>${FM.SLOT_LABEL[k]} <span class="muted">${cur.length}/${n}</span></h3>${cur.map(s => `<div class="row" style="margin:6px 0;flex-wrap:nowrap">${mono(s.name)}<div class="flex1 small"><b>${esc(s.name)}</b><br>${eur(s.weekly)}/sett.${s.winBonus ? ` + ${eur(s.winBonus)} a vittoria` : ''}${s.promoBonus ? ` + ${eur(s.promoBonus)} se promossi` : ''} · fino al ${s.until + 1}</div></div>`).join('') || '<p class="muted small">Spazio libero</p>'}</div>`; }).join('')}</div>
  <h3 style="margin-top:16px">Offerte</h3>${S.sponsorOffers.length ? `<div class="grid g3">${S.sponsorOffers.map(o => `<div class="scard"><div class="row" style="flex-wrap:nowrap">${mono(o.name)}<div class="flex1"><div class="tiny muted">${FM.SLOT_LABEL[o.slot]}</div><b>${esc(o.name)}</b></div></div><div class="small" style="margin-top:6px"><b>${eur(o.weekly)}</b>/sett. per ${o.seasons} stagion${o.seasons > 1 ? 'i' : 'e'}${o.winBonus ? ` · ${eur(o.winBonus)} a vittoria` : ''}${o.promoBonus ? ` · ${eur(o.promoBonus)} se promossi` : ''}</div><div class="tiny muted">Alla firma: ${eur(o.signing)}</div><div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="sponsor" data-id="${o.id}">Firma</button></div></div>`).join('')}</div>` : '<p class="muted">Nessuna offerta aperta. Ne arrivano di nuove a inizio stagione.</p>'}
  <p class="note" style="margin-top:12px">Le aziende sponsor sono inventate.</p>`;
};
VIEWS.club = function () {
  const me = FM.myClub(), T = FM.TIERS[S.league.tier];
  const fac = ['stadio', 'campo', 'giovanili'].map(k => { const lvl = S.fac[k], b = S.building.find(x => x.k === k); const cost = lvl < 10 ? FM.FAC_COST[k][lvl] : 0; return `<div class="card stack"><h3>${FM.FAC_LABEL[k]}</h3><div class="row">${bar(lvl * 10)}<b>Liv. ${lvl}</b></div>${k === 'stadio' ? `<div class="small muted">Capienza ${FM.STADIUM[lvl - 1]} posti${FM.STADIUM[lvl - 1] < T.minCap ? ` · <span class="bad">non omologato per la categoria (min. ${T.minCap})</span>` : ''}</div>` : k === 'campo' ? '<div class="small muted">Migliora la crescita dei giocatori</div>' : '<div class="small muted">Più ragazzi e più talento dalla leva annuale</div>'}${b ? `<span class="pill y">Lavori in corso: ${b.left} sett.</span>` : lvl < 10 ? `<button class="btn" data-a="upgrade" data-id="${k}">Migliora → liv. ${lvl + 1} · ${eur(cost)} · ${FM.FAC_WEEKS[lvl]} sett.</button>` : '<span class="pill g">Massimo</span>'}</div>`; }).join('');
  const youth = S.youth.map(id => S.players[id]).filter(Boolean);
  return `<h2>Società</h2><div class="grid g3"><div class="card"><div class="muted small">Tifosi</div><div class="kpi">${me.fans.toLocaleString('it-IT')}</div></div><div class="card"><div class="muted small">Reputazione</div><div class="kpi">${R(me.rep)}/100</div></div><div class="card"><div class="muted small">Trofei</div><div class="kpi">${S.trophies.length}</div><div class="small">${S.trophies.map(t => `🏆 ${esc(t.name)} ${seasonLbl(t.season)}`).join('<br>')}</div></div></div>
  <h3 style="margin-top:16px">Strutture</h3><div class="grid g3">${fac}</div>
  ${junHTML()}
  <h3 style="margin-top:16px">Rosa Juniores <span class="muted small">${youth.length} ragazzi</span></h3>${youth.length ? (mob() ? `<div class="mlist">${youth.sort((x, y) => y.ovr - x.ovr).map(mPlayer).join('')}</div>` : `<div class="tbl-wrap"><table><tr><th>Ruolo</th><th>Nome</th><th class="num">Età</th><th>Valutazione</th><th>Potenziale</th><th></th></tr>${youth.map(p => `<tr><td>${role(p.role)}</td><td><a href="#" data-a="player" data-id="${p.id}">${esc(p.name)}</a></td><td class="num">${p.age}</td><td>${ovrCell(p)}</td><td>${potCell(p)}</td><td><button class="btn sm pri" data-a="promoteyouth" data-id="${p.id}">Aggrega alla prima squadra</button></td></tr>`).join('')}</table></div>`) : '<p class="muted small">Nessun ragazzo in Juniores: la prossima leva arriva a fine stagione.</p>'}
  <h3 style="margin-top:16px">Storia della carriera</h3>${S.history.length ? `<div class="tbl-wrap"><table><tr><th>Stagione</th><th>Categoria</th><th class="num">Pos.</th><th class="num">Pt</th><th class="num">V-N-P</th><th class="num">GF-GS</th><th>Coppa</th><th>Capocannoniere</th><th>Esito</th></tr>${S.history.map(h => `<tr><td>${seasonLbl(h.season)}</td><td>${esc(h.cat)} ${esc(h.group)}</td><td class="num">${h.pos}°/${h.n}</td><td class="num">${h.pts}</td><td class="num">${h.w}-${h.d}-${h.l}</td><td class="num">${h.gf}-${h.ga}</td><td>${esc(h.cup)}</td><td>${esc(h.top)}</td><td><b>${esc(h.outcome || '—')}</b></td></tr>`).join('')}</table></div>` : '<p class="muted small">Prima stagione in corso.</p>'}`;
};
VIEWS.options = function () {
  const slots = [1, 2, 3].map(n => { const raw = sget(SLOT(n)); let info = null; if (raw) try { const o = JSON.parse(raw); info = `${o.clubs[o.clubId].name} · ${seasonLbl(o.season)} · ${o.league.cat}`; } catch (e) {} return { n, info }; });
  return `<h2>Salvataggi</h2><div class="card stack"><p class="small muted">Il gioco salva da solo dopo ogni turno in questo browser. Gli slot servono per tenere più carriere o un punto di ritorno. Esporta il file per non perdere nulla se il browser cancella i dati.</p>
  ${slots.map(s => `<div class="row sb"><span>Slot ${s.n}: ${s.info ? esc(s.info) : '<span class="dim">vuoto</span>'}</span><span class="row"><button class="btn sm" data-a="saveslot" data-id="${s.n}">Salva qui</button>${s.info ? `<button class="btn sm" data-a="loadslot" data-id="${s.n}">Carica</button><button class="btn sm danger" data-a="delslot" data-id="${s.n}">Elimina</button>` : ''}</span></div>`).join('')}
  <div class="row"><button class="btn" data-a="export">⬇️ Esporta carriera</button><button class="btn" data-a="pasteimp">📋 Incolla codice</button><label class="btn">📂 Importa file<input type="file" id="importfile2" accept=".json,application/json" hidden></label></div>
  <div class="sep"></div><div class="row"><button class="btn" data-a="sfx">${SFX.on ? '🔊 Suoni attivi' : '🔇 Suoni disattivati'}</button><button class="btn danger" data-a="newgame">Nuova carriera</button></div></div>
  <div class="card" style="margin-top:14px"><h3>Note sui dati</h3><p class="small muted">Club e gironi 2026/27 dal database nazionale del progetto. I giocatori con 📋 hanno il nome preso da elenchi pubblicati (rose di società, portali e liste di mercato): non sono la lista ufficiale dei tesserati FIGC e possono essere cambiati. Tutti gli attributi, i valori e gli stipendi sono simulati; gli altri nomi, gli sponsor e lo staff sono inventati.</p></div>`;
};

/* ---------- scheda giocatore ---------- */
function playerModal(pid, note) {
  const p = S.players[pid]; if (!p) return;
  const mine = p.club === S.clubId, kn = FM.known(p), club = p.club ? S.clubs[p.club] : null;
  const grp = [['Tecnici', p.role === 'POR' ? ['por', 'pas', 'tec', 'dif'] : ['tec', 'pas', 'tir', 'dif']], ['Mentali', ['vis', 'men']], ['Fisici', ['vel', 'res', 'fis']]];
  const attrs = kn ? `<div class="attrgrid">${grp.map(([g, ks]) => `<div><div class="ag">${g}</div>${ks.map(a => `<div class="arow"><span>${FM.ATTR_LABEL[a]}</span><b class="${aCls(p.a[a])}">${R(p.a[a])}</b></div>`).join('')}</div>`).join('')}</div>` : `<p class="muted">Attributi sconosciuti. Fai osservare il giocatore: lo staff riferisce in 1 settimana.</p>`;
  const rp = { POR: [50, 88], DIF: [50, 68], CEN: [50, 45], ATT: [50, 20] }[p.role];
  const ask = club && !mine ? FM.askingPrice(p) : 0, dem = FM.wageDemand(p);
  let actions = '';
  if (mine) {
    const rd = FM.renewDemand(p);
    actions = `<div class="card stack"><h3>Contratto</h3><div class="small">${wageLbl()}: <b>${eur(p.wage)}</b> · scadenza giugno ${p.until + 1}${p.loan ? ` · in prestito da ${esc(S.clubs[p.loan.from] ? S.clubs[p.loan.from].name : '?')} (paghi ${R(p.loan.pct * 100)}%)${p.loan.opt ? `, riscatto ${eur(p.loan.opt)}${p.loan.exercise ? ' (confermato)' : ''}` : ''}` : ''}</div>
     ${p.loan ? '' : `<div class="row"><span class="small">Rinnovo: €/sett.</span><input type="number" id="rw" value="${rd}"><select id="ry">${[1, 2, 3, 4].map(y => `<option value="${y}" ${y === 2 ? 'selected' : ''}>+${y} anni</option>`).join('')}</select><button class="btn sm pri" data-a="renew" data-id="${p.id}">Proponi</button></div><div class="tiny muted">Richiesta del giocatore: circa ${eur(rd)}/sett.</div>`}
     <div class="row">${p.loan ? '' : `<button class="btn sm" data-a="${p.listed ? 'unlist' : 'list'}" data-id="${p.id}">${p.listed ? 'Togli dalla lista trasferimenti' : 'Metti in vendita'}</button>`}<button class="btn sm danger" data-a="release" data-id="${p.id}">${p.loan ? 'Interrompi prestito' : 'Rescindi contratto'}</button></div></div>`;
  } else if (p.youthPool) {
    actions = `<button class="btn pri" data-a="promoteyouth" data-id="${p.id}">Aggrega alla prima squadra</button>`;
  } else {
    const loanOk = club && p.age <= 24;
    actions = `<div class="card stack"><h3>Trattativa</h3>
     <div class="row">${kn ? '' : `<button class="btn sm" data-a="scout" data-id="${p.id}">👁 Fai osservare</button>`}<button class="btn sm" data-a="short" data-id="${p.id}">${S.shortlist.includes(p.id) ? '★ Togli dagli osservati' : '☆ Aggiungi agli osservati'}</button></div>
     ${club ? `<div class="row"><span class="small">Offerta al club €</span><input type="number" id="bf" value="${ask}"><span class="tiny muted">richiesta ${eur(ask)}</span></div>` : ''}
     <div class="row"><span class="small">Ingaggio €/sett.</span><input type="number" id="bw" value="${dem}"><select id="by">${[1, 2, 3, 4].map(y => `<option value="${y}" ${y === 2 ? 'selected' : ''}>${y} stagion${y > 1 ? 'i' : 'e'}</option>`).join('')}</select></div>
     <div class="row"><button class="btn pri" data-a="bid" data-id="${p.id}">${club ? 'Fai offerta' : 'Ingaggia svincolato'}</button>${loanOk ? `<select id="lp">${[.25, .5, .75, 1].map(x => `<option value="${x}" ${x === .5 ? 'selected' : ''}>paghi ${x * 100}% ingaggio</option>`).join('')}</select><button class="btn" data-a="loan" data-id="${p.id}">Chiedi in prestito</button>` : ''}</div>
     ${loanOk ? `<label class="row small"><input type="checkbox" id="lopt"> Con diritto di riscatto (circa ${eur(FM.askingPrice(p) * .85)})</label>` : ''}
     ${club ? `<div class="row"><label class="small" for="bswap">Scambio con</label><select id="bswap" class="flex1"><option value="">Nessuno, solo soldi</option>${FM.squad(S.clubId).filter(q => !q.loan).sort((a, b) => b.ovr - a.ovr).map(q => `<option value="${q.id}">${esc(q.name)} (${q.role}, ${R(q.ovr)}, vale ${eur(FM.valueFor(q))})</option>`).join('')}</select></div><div class="tiny muted">Con uno scambio il valore del tuo giocatore conta nell'offerta: puoi abbassare la cifra in contanti.</div>` : ''}
     ${FM.playerInterest(p) ? `<div class="small warn">${esc(FM.playerInterest(p))}</div>` : ''}
     ${!FM.windowOpen() && club ? '<div class="small warn">Mercato chiuso: per ora puoi solo osservarlo.</div>' : ''}</div>`;
  }
  const st = p.st, car = p.car;
  openModal(`<button class="x" data-a="close">×</button>
   <div class="pcard" style="--c1:${clubColors(club ? club.name : 'Svincolati').c1}">${shirt(club ? club.name : 'Svincolati', club ? shirtNum(p) : '', 64)}<div class="pcinfo"><div class="row" style="gap:8px">${role(p.role)}${realBadge(p)}<button class="pedit${p.edited ? ' on' : ''}" data-a="pedit" data-id="${p.id}" title="Correggi nome e ruolo" aria-label="Correggi nome e ruolo">✏️</button></div><h2>${esc(p.name)}</h2></div>${kn ? rating(p.ovr, S.league.tier) : ''}</div>
   <div class="small muted" style="margin:6px 0 12px">${FM.ROLE_LABEL[p.role]} · ${p.age} anni · ${club ? esc(club.name) + ' (' + FM.TIERS[club.tier].cat + ')' : p.youthPool ? 'Juniores' : 'Svincolato'} · valore ${eur(FM.valueFor(p))}</div>
   ${note ? `<div class="card" style="margin-bottom:10px;border-color:var(--warn)">${note}</div>` : ''}
   <div class="grid g2"><div class="card"><h3>Attributi</h3><div class="row" style="gap:14px;align-items:flex-start"><div class="flex1">${attrs}</div><div class="minipitch"><i style="left:${rp[0]}%;top:${rp[1]}%"></i></div></div><div class="sep"></div><div class="row sb"><span>Valutazione</span><span>${ovrCell(p)}</span></div><div class="row sb" style="margin-top:6px"><span>Potenziale stimato</span><span>${potCell(p)}</span></div></div>
   <div class="stack"><div class="card small"><div class="row sb"><span>Condizione</span>${fitCell(p)}</div><div class="row sb"><span>Morale</span>${moraleTxt(p.morale)}</div><div class="row sb"><span>Stagione</span><span>${st.app} pres · ${st.g} gol · ${st.as} assist · media ${avgR(p)}</span></div><div class="row sb"><span>Carriera</span><span>${car.app} pres · ${car.g} gol · ${car.as} assist</span></div>${kn && p.pers ? `<div class="sep"></div><div class="row sb"><span>Carattere</span><b>${esc(FM.persLabel(p))}</b></div><div class="persgrid">${[['amb', 'Ambizione'], ['pro', 'Professionalità'], ['tem', 'Temperamento'], ['lead', 'Leadership']].map(([k, l]) => `<div class="arow"><span>${l}</span><b class="${aCls(p.pers[k])}">${p.pers[k]}</b></div>`).join('')}</div>` : ''}${p.inj ? `<div class="bad">${esc(p.injName)}: ${p.inj} sett.</div>` : ''}${p.susp ? `<div class="bad">Squalificato per ${p.susp} partite</div>` : ''}${mine ? `<div class="row sb"><span>Focus individuale</span><select data-ch="pfocus" data-id="${p.id}"><option value="">Nessuno</option>${FM.ATTRS.filter(a => a !== 'por' || p.role === 'POR').map(a => `<option value="${a}" ${p.focus === a ? 'selected' : ''}>${FM.ATTR_LABEL[a]}</option>`).join('')}</select></div>` : ''}</div>
   ${actions}</div></div>
   ${p.real ? `<p class="note" style="margin-top:12px">Nome tratto da un elenco pubblicato (${esc(p.srcNote.replace(/_/g, ' '))})${p.src ? `: <a href="${esc(p.src)}" target="_blank" rel="noopener">fonte</a>` : ''}. Non è un tesseramento verificato; abilità e valori sono simulati.</p>` : ''}`);
}

/* ---------- partita ---------- */
function onContinue() {
  if (S.gameOver) return showGameOver();
  if (S.pendingEnd) return showSeasonEnd();
  if (!turn) turn = FM.beginTurn();
  if (!turn) { renderApp(); if (S.pendingEnd) showSeasonEnd(); return; }
  if (turn.userMatch) return preMatch();
  finishTurn();
}
function teamList(m, side) {
  const T = m[side];
  return T.on.map(x => { const p = S.players[x.id]; return `<div class="row small" style="margin:2px 0">${role(x.role)}<span class="flex1">${esc(p.name)}</span><span class="muted">${FM.known(p) || p.club === S.clubId ? R(FM.roleOvr(p, x.role)) : ''}</span></div>`; }).join('');
}
function preMatch() {
  const m = FM.prepareUserMatch(turn);
  const tb = FM.table(S.league); const pi = id => { const i = tb.findIndex(r => r.id === id); return i >= 0 ? `${i + 1}° · ${tb[i].pts} pt` : ''; };
  const sh = FM.clubStrength(m.h.cid), sa = FM.clubStrength(m.a.cid);
  const myS = m.userSide === 'h' ? sh : sa, opS = m.userSide === 'h' ? sa : sh;
  const verdict = opS > myS + 3 ? 'Avversario nettamente più forte: prudenza.' : opS > myS + 1 ? 'Avversario leggermente superiore.' : opS < myS - 3 ? 'Siamo nettamente favoriti.' : opS < myS - 1 ? 'Siamo leggermente favoriti.' : 'Partita equilibrata.';
  openModal(`<div class="small muted">${esc(m.ctx.label)}</div>
  <div class="score" style="margin:10px 0"><div class="t">${crest(m.h.name)}<div><b>${esc(m.h.name)}</b><div class="tiny muted">${pi(m.h.cid)}</div></div></div><div class="n">vs</div><div class="t r"><div><b>${esc(m.a.name)}</b><div class="tiny muted">${pi(m.a.cid)}</div></div>${crest(m.a.name)}</div></div>
  ${scoutReport(m, verdict)}
  <div class="grid g2"><div class="card"><h3>${esc(m.h.name)} <span class="muted small">${m.h.form}</span></h3>${teamList(m, 'h')}</div><div class="card"><h3>${esc(m.a.name)} <span class="muted small">${m.a.form}</span></h3>${teamList(m, 'a')}</div></div>
  <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-a="pm-tactics">📋 Modifica tattica</button><button class="btn" data-a="pm-quick">⏩ Risultato immediato</button><button class="btn pri" data-a="pm-live">▶ Gioca in diretta</button></div>`, 'wide');
}
function scoutReport(m, verdict) {
  const us = m[m.userSide], th = m[m.userSide === 'h' ? 'a' : 'h'];
  const rows = [['Attacco', us.r.att, th.r.att], ['Centrocampo', us.r.mid, th.r.mid], ['Difesa', us.r.def, th.r.def], ['Portiere', us.r.gk, th.r.gk]];
  const tips = [];
  if (th.r.att > us.r.def * 1.08) tips.push('Il loro attacco è più forte della nostra difesa: valuta una mentalità più prudente.');
  if (th.r.mid > us.r.mid * 1.08) tips.push('A centrocampo soffriremo: il pressing alto può rompere il loro gioco, ma stanca.');
  if (us.r.att > th.r.def * 1.1) tips.push('La loro difesa è il punto debole: possiamo osare con una mentalità offensiva.');
  if (!tips.length) tips.push('Squadre simili: conta la condizione fisica, controlla chi è stanco.');
  const key = th.on.map(x => S.players[x.id]).sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  return `<div class="card" style="margin-bottom:12px"><h3>Rapporto dello staff</h3><p class="small" style="margin:0 0 8px">${verdict} Giocano con il ${th.form}${S.clubs[th.cid].coach ? `, allenatore ${esc(S.clubs[th.cid].coach)}` : ''}.</p>
   ${rows.map(([l, a, b]) => { const t = a + b || 1; return `<div class="cmp"><span>${l}</span><div class="dual"><i style="width:${a / t * 100}%;background:var(--accent)"></i><i style="width:${b / t * 100}%;background:var(--info)"></i></div></div>`; }).join('')}
   <div class="tiny muted" style="margin:4px 0 8px"><span style="color:var(--accent)">■</span> noi · <span style="color:var(--info)">■</span> loro</div>
   <div class="small"><b>Da tenere d'occhio:</b> ${key.map(p => `${esc(p.name)} (${p.role})`).join(', ')}</div>
   <ul class="small tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
}
/* ---------- suoni (sintetizzati, nessun file) ---------- */
const SFX = {
  ctx: null, on: sget('fmv9:sfx') !== '0',
  ac() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
  whistle(n = 1) { if (!this.on) return; const c = this.ac(); if (!c) return; for (let i = 0; i < n; i++) { const t = c.currentTime + i * .45, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(); o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .03); g.gain.setValueAtTime(.12, t + (i === n - 1 ? .55 : .3)); g.gain.linearRampToValueAtTime(0, t + (i === n - 1 ? .65 : .36)); o.connect(g); g.connect(c.destination); o.start(t); lfo.start(t); o.stop(t + .7); lfo.stop(t + .7); } },
  goal() { if (!this.on) return; const c = this.ac(); if (!c) return; const len = c.sampleRate * 2.2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; src.buffer = b; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .6; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .35); g.gain.linearRampToValueAtTime(.18, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 2.2); src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); },
};
function confetti() {
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, cc = clubColors(FM.myClub().name);
  const cols = [cc.c1, cc.c2, '#ffd166', '#ffffff', '#36c47a'];
  const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, c: cols[Math.floor(Math.random() * cols.length)], w: 6 + Math.random() * 6 }));
  let t0 = performance.now();
  (function fr(t) { ctx.clearRect(0, 0, W, H); for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -3, p.w, 6); ctx.restore(); } if (t - t0 < 3500) requestAnimationFrame(fr); else cv.remove(); })(t0);
}
function startLive() {
  const m = FM.prepareUserMatch(turn);
  live = { m, speed: 1, paused: false, timer: null, htShown: false };
  renderLive(true); tick(); SFX.whistle(1);
}
const SPEEDS = [0, 450, 160, 45];
function tick() {
  clearTimeout(live.timer);
  if (!live || live.paused || live.m.done) return;
  live.timer = setTimeout(() => {
    if (!live) return;
    FM.step(live.m);
    if (live.m.min === 45 && !live.htShown) { live.htShown = true; live.paused = true; SFX.whistle(2); }
    if (live.m.done) SFX.whistle(3);
    renderLive();
    tick();
  }, SPEEDS[live.speed]);
}
function renderLive(full) {
  const m = live.m, side = m.userSide, T = m[side], O = m[side === 'h' ? 'a' : 'h'];
  const st = (lbl, a, b, pct) => { const tot = (a + b) || 1; return `<div class="statline"><b class="num">${a}${pct ? '%' : ''}</b><div class="dual"><i style="width:${a / tot * 100}%;background:var(--accent)"></i><i style="width:${b / tot * 100}%;background:var(--info)"></i></div><b>${b}${pct ? '%' : ''}</b></div><div class="tiny muted" style="text-align:center;margin-top:-4px">${lbl}</div>`; };
  const tot = m.h.poss + m.a.poss || 1; const ph = R(m.h.poss / tot * 100);
  const onRows = T.on.map(x => { const p = S.players[x.id], s = m.pl[x.id]; return `<tr><td>${role(x.role)}</td><td>${esc(p.name)}${s.yc ? ' 🟨' : ''}${s.g ? ' ⚽'.repeat(s.g) : ''}</td><td style="min-width:60px">${bar(s.cond, s.cond < 60 ? 'b' : s.cond < 75 ? 'w' : '')}</td><td class="num">${s.r.toFixed(1)}</td></tr>`; }).join('');
  const canSub = !m.done && T.subs < 5 && T.bench.length;
  const sig = [m.done, live.paused, live.speed, T.subs, T.on.length, T.bench.length, T.ment, T.press, T.autoSubs].join('|');
  if (!$('#ov') || !$('#livebox')) { openModal('<div id="livebox"></div>', 'wide'); full = true; }
  if (full || live.sig !== sig) {
    live.sig = sig;
    $('#livebox').innerHTML = `<div class="small muted row sb"><span>${esc(m.ctx.label)}</span><span id="lv-st"></span></div>
     <div class="score" style="margin:8px 0"><div class="t">${crest(m.h.name)}<b>${esc(m.h.name)}</b></div><div class="n" id="lv-sc"></div><div class="t r"><b>${esc(m.a.name)}</b>${crest(m.a.name)}</div></div>
     <div class="lvpitch" id="lv-pitch"><i class="pl-c"></i><i class="pl-l"></i><i class="pl-r"></i><i class="pl-cc"></i><svg id="lv-trail" class="trail" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="50" x2="50" y2="50"/></svg>${dotsHTML(m)}<span class="ball" id="lv-ball"></span><div class="gflash" id="lv-flash">GOL</div></div>
     <div id="lv-bar"></div>
     <div class="card" style="margin-top:10px"><div class="row">${!m.done ? `<button class="btn" data-a="lv-pause">${live.paused ? '▶ Riprendi' : '⏸ Pausa'}</button>${[1, 2, 3].map(s => `<button class="btn ${live.speed === s ? 'pri' : ''}" data-a="lv-speed" data-id="${s}" aria-label="Velocità ${s}">${'›'.repeat(s)}</button>`).join('')}<button class="btn" data-a="lv-end">⏭ Fine</button><button class="btn" data-a="sfx" aria-label="Suoni">${SFX.on ? '🔊' : '🔇'}</button>` : `<button class="btn pri" data-a="lv-done">Continua ▶</button>`}</div>
      ${!m.done ? `<div class="row" style="margin-top:8px"><label class="small" for="lv-ment">Mentalità</label><select id="lv-ment" data-ch="lv-ment">${Object.keys(FM.MENT).map(k => `<option ${k === T.ment ? 'selected' : ''}>${k}</option>`).join('')}</select><label class="small" for="lv-press">Pressing</label><select id="lv-press" data-ch="lv-press">${Object.keys(FM.PRESS).map(k => `<option ${k === T.press ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <label class="row small" style="margin-top:6px"><input type="checkbox" id="lv-auto" data-ch="lv-auto" ${T.autoSubs ? 'checked' : ''}> Cambi automatici</label>` : ''}</div>
     ${canSub ? `<div class="card" style="margin-top:10px"><h3>Sostituzione (${T.subs}/5)</h3><div class="row"><select id="sout" class="flex1"></select><select id="sin" class="flex1">${T.bench.map(id => `<option value="${id}">↑ ${esc(S.players[id].name)} ${S.players[id].role} ${R(S.players[id].ovr)}</option>`).join('')}</select><button class="btn pri" data-a="lv-sub">Cambia</button></div></div>` : ''}
     <div class="grid g2" style="margin-top:10px">
      <div><div class="feed" id="feed"></div><div class="card" style="margin-top:10px" id="lv-stats"></div></div>
      <div class="card" style="padding:6px;overflow-x:auto"><table class="small" id="lv-on"></table></div>
     </div>`;
  }
  $('#lv-st').textContent = m.done ? 'Finale' : live.paused ? (m.min === 45 ? 'Intervallo' : 'In pausa') : '';
  $('#lv-sc').innerHTML = `${m.h.goals} - ${m.a.goals}<div class="tiny muted">${m.min}'${m.pens ? ` · rig. ${m.pens.h}-${m.pens.a}` : ''}</div>`;
  $('#lv-bar').innerHTML = bar(m.min / 90 * 100);
  const last = m.ev[m.ev.length - 1], ball = $('#lv-ball'), goals = m.h.goals + m.a.goals;
  if (ball) moveDots(m, last, ball);
  if (live.goals != null && goals > live.goals) { const f = $('#lv-flash'); const gs = last && last.type === 'goal' ? last.side : 'h'; f.style.setProperty('--fc', clubColors(m[gs].name).c1); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); SFX.goal(); }
  live.goals = goals;
  $('#feed').innerHTML = m.ev.slice().reverse().map(e => `<div class="${e.type}"><span class="m">${e.min}'</span>${e.side ? (e.side === side ? '🟢 ' : '🔵 ') : ''}${esc(e.txt)}</div>`).join('') || '<div class="muted">Calcio d\'inizio…</div>';
  $('#lv-stats').innerHTML = st('Possesso', side === 'h' ? ph : 100 - ph, side === 'h' ? 100 - ph : ph, true) + st('Tiri', T.shots, O.shots) + st('Nello specchio', T.sot, O.sot) + st('Ammonizioni', T.yc, O.yc);
  $('#lv-on').innerHTML = `<tr><th></th><th>In campo</th><th>Fiato</th><th class="num">Voto</th></tr>${onRows}`;
  const so = $('#sout');
  if (so && document.activeElement !== so) { const cur = so.value; so.innerHTML = T.on.map(x => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>↓ ${esc(S.players[x.id].name)} (${R(m.pl[x.id].cond)}%)</option>`).join(''); }
}
function dotsHTML(m) {
  const ch = clubColors(m.h.name), ca0 = clubColors(m.a.name);
  const ca = ch.c1.toLowerCase() === ca0.c1.toLowerCase() ? { c1: ca0.c2, c2: ca0.c1 } : ca0;
  let h = '';
  for (const [side, c] of [['h', ch], ['a', ca]]) for (const x of m[side].on.concat(m[side].bench.map(id => ({ id, role: '' })))) h += `<span class="pd ${x.role === 'POR' ? 'gk' : ''}" id="pd-${x.id}" style="--d1:${c.c1};--d2:${c.c2};display:none"></span>`;
  return h;
}
function moveDots(m, last, ball) {
  const pH = Math.pow(m.h.r.mid, 1.25) / (Math.pow(m.h.r.mid, 1.25) + Math.pow(m.a.r.mid, 1.25));
  const shot = last && last.min === m.min && last.side && ['goal', 'save', 'miss'].includes(last.type);
  const poss = shot ? last.side : Math.random() < pH ? 'h' : 'a';
  const corner = last && last.min === m.min && last.type === 'corner';
  let bx = m.done ? 50 : corner ? (last.side === 'h' ? 99 : 1) : shot ? (poss === 'h' ? 92 : 8) : poss === 'h' ? 30 + Math.random() * 58 : 12 + Math.random() * 58;
  let by = m.done ? 50 : corner ? (Math.random() < .5 ? 2 : 98) : 22 + Math.random() * 56;
  const base = { POR: 5, DIF: 22, CEN: 40, ATT: 56 };
  const spots = { h: [], a: [] };
  for (const side of ['h', 'a']) {
    const T = m[side], g = { POR: [], DIF: [], CEN: [], ATT: [] };
    T.on.forEach(x => (g[x.role] || g.CEN).push(x.id));
    for (const r in g) g[r].forEach((id, k) => {
      let x = base[r] + (r === 'POR' ? 0 : (bx - 50) * .42 + (poss === side ? 7 : -3) * (side === 'h' ? 1 : -1) * (side === 'h' ? 1 : 1));
      if (side === 'a') x = r === 'POR' ? 100 - base[r] : 100 - (base[r] + (50 - bx) * .42 + (poss === side ? 7 : -3));
      let y = (k + 1) / (g[r].length + 1) * 100 + (by - 50) * (r === 'POR' ? .15 : .25) + (Math.random() - .5) * 6;
      x += (Math.random() - .5) * 4;
      x = Math.max(2, Math.min(98, x)); y = Math.max(5, Math.min(95, y));
      spots[side].push({ id, x, y, r });
      const el = document.getElementById('pd-' + id); if (el) { el.style.display = ''; el.style.left = x + '%'; el.style.top = y + '%'; }
    });
    for (const id of m[side].bench) { const el = document.getElementById('pd-' + id); if (el) el.style.display = 'none'; }
  }
  for (const id in m.pl) if (m.pl[id].end != null) { const el = document.getElementById('pd-' + id); if (el) el.style.display = 'none'; }
  if (last && last.min === m.min && (last.type === 'yellow' || last.type === 'red') && last.pid) { const el = document.getElementById('pd-' + last.pid); if (el) { el.classList.remove('cy', 'cr'); void el.offsetWidth; el.classList.add(last.type === 'red' ? 'cr' : 'cy'); } }
  if (!shot && !corner && !m.done) { const cand = spots[poss].filter(s => s.r !== 'POR'); if (cand.length) { const near = cand.sort((a, b) => Math.hypot(a.x - bx, a.y - by) - Math.hypot(b.x - bx, b.y - by))[0]; bx = near.x + (poss === 'h' ? 1.2 : -1.2); by = near.y + 1; } }
  const tr = document.getElementById('lv-trail');
  if (tr && live.bx != null && !m.done) { const ln = tr.querySelector('line'); ln.setAttribute('x1', live.bx); ln.setAttribute('y1', live.by); ln.setAttribute('x2', bx); ln.setAttribute('y2', by); tr.classList.remove('on'); void tr.getBoundingClientRect(); tr.classList.add('on'); }
  live.bx = bx; live.by = by;
  ball.style.left = bx + '%'; ball.style.top = by + '%';
}
function stopLive() { if (live) clearTimeout(live.timer); live = null; }
function finishTurn() {
  const hadMatch = !!turn.userMatch, e = turn.e;
  FM.endTurn(turn); turn = null; stopLive(); closeModal();
  autosave(); renderApp();
  if (hadMatch) postMatch(e);
  else toast(e.t === 'cup' ? 'Turno di coppa giocato dalle altre squadre.' : 'Settimana completata.');
  if (S.pendingEnd) setTimeout(showSeasonEnd, hadMatch ? 0 : 50);
}
function postMatch(e) {
  const lm = S.lastMatch; if (!lm) return;
  const res = e.t === 'lg' ? S.league.results[e.i] : null;
  openModal(`<button class="x" data-a="close">×</button><div class="small muted">${esc(lm.label)}</div>
  <div class="score" style="margin:10px 0"><div class="t">${crest(lm.h)}<b>${esc(lm.h)}</b></div><div class="n">${lm.hg} - ${lm.ag}${lm.pens ? `<div class="tiny muted">rigori ${lm.pens.h}-${lm.pens.a}</div>` : ''}</div><div class="t r"><b>${esc(lm.a)}</b>${crest(lm.a)}</div></div>
  <div class="grid g2"><div class="card small">${lm.ev.map(x => `<div>${x.min}' ${esc(x.txt)}</div>`).join('')}<div class="sep"></div>Possesso ${lm.st[0].poss}% - ${lm.st[1].poss}% · Tiri ${lm.st[0].shots}-${lm.st[1].shots} · In porta ${lm.st[0].sot}-${lm.st[1].sot}<br>Migliore in campo: <b>${esc(lm.mom)}</b></div>
  <div class="card"><h3>Pagelle</h3><table class="small">${lm.ratings.map(r => `<tr><td>${esc(r.n)}${r.g ? ' ⚽'.repeat(r.g) : ''}${r.as ? ' 🅰️' : ''}</td><td class="num"><b class="${r.r >= 7 ? 'good' : r.r < 6 ? 'bad' : ''}">${r.r.toFixed(1)}</b></td></tr>`).join('')}</table></div></div>
  ${res ? `<div class="card" style="margin-top:12px"><h3>Altri risultati</h3><div class="small">${res.filter(r => r.h !== lm.hid).map(r => `<div>${esc(S.clubs[r.h].name)} <b>${r.hg}-${r.ag}</b> ${esc(S.clubs[r.a].name)}</div>`).join('')}</div></div>` : ''}
  <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" data-a="close">Ok</button></div>`, 'wide');
}
function showSeasonEnd() {
  setTimeout(() => { const tb = FM.table(S.league), pos = tb.findIndex(r => r.id === S.clubId) + 1, rr = FM.promoRules(S.league.tier); if (pos <= Math.max(1, rr.direct) || (S.playoff && S.playoff.winner === S.clubId)) { confetti(); SFX.goal(); } }, 250);
  const tb = FM.table(S.league), pos = tb.findIndex(r => r.id === S.clubId) + 1, rr = FM.promoRules(S.league.tier);
  const po = S.playoff;
  const promo = S.league.tier > 0 && (pos <= rr.direct || (po && po.winner === S.clubId));
  const rel = rr.releg && pos > tb.length - rr.releg;
  openModal(`<h2>Fine stagione ${seasonLbl(S.season)}</h2>
   <div class="score"><div class="n">${pos}°</div><div class="flex1"><b>${esc(S.league.cat)} — girone ${esc(S.league.group)}</b><div class="small muted">${tb[pos - 1].pts} punti · ${tb[pos - 1].w}V ${tb[pos - 1].d}N ${tb[pos - 1].l}P</div></div></div>
   <div style="display:flex;justify-content:center;margin:14px 0 4px">${crest(FM.myClub().name, 90)}</div>
   <p style="font-size:20px;margin-top:6px;text-align:center">${promo ? `🎉 <b class="good">PROMOSSI in ${FM.TIERS[S.league.tier - 1].cat}!</b>` : rel ? `<b class="bad">Retrocessi in ${FM.TIERS[S.league.tier + 1].cat}.</b>` : pos === 1 ? '🏆 <b class="good">Campioni!</b>' : 'Restiamo in categoria.'}</p>
   ${po && po.log.length ? `<div class="card small"><b>Playoff</b><br>${po.log.map(esc).join('<br>')}<br>Vincitrice: <b>${esc(S.clubs[po.winner] ? S.clubs[po.winner].name : '?')}</b></div>` : ''}
   <p class="small muted">Obiettivo del presidente: ${esc(S.board.obj)}. Chiudendo la stagione: premi, scadenze dei contratti, ritiri, età, nuova leva giovanile e nuovo calendario.</p>
   <div class="row" style="justify-content:flex-end"><button class="btn pri" data-a="closeseason">Inizia la stagione ${seasonLbl(S.season + 1)} ▶</button></div>`);
}
function showGameOver() {
  const g = S.gameOver;
  openModal(`<h2>Esonerato</h2><p>${esc(g.why)}</p><p class="small muted">Carriera: ${S.history.length} stagioni completate, ${S.trophies.length} trofei. Ultima categoria: ${esc(g.cat)}.</p><div class="row" style="justify-content:flex-end"><button class="btn" data-a="loadslotmenu">Carica uno slot</button><button class="btn pri" data-a="newgame-force">Nuova carriera</button></div>`);
}

/* ---------- eventi ---------- */
function onClick(e) {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, id = el.dataset.id;
  if (el.tagName === 'A') e.preventDefault();
  const H = HANDLERS[a]; if (H) H(id, el, e);
}
const HANDLERS = {
  close: () => { if (live && !live.m.done) return; closeModal(); },
  nav: id => { closeModal(); go(id); },
  pickclub: id => { startSel = id; renderStart(); const el = $('#selclub'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  startcat: id => { startCat = id; startSel = null; startQ = ''; renderStart(); },
  start: () => sget(SAVE_AUTO) ? ask('Iniziare una nuova carriera? Quella in corso viene sostituita (se ti serve, salvala prima in uno slot).', startGame) : startGame(),
  mainmenu: () => { if (S) autosave(); closeModal(); stopLive(); turn = null; S = null; startSel = null; renderStart(); window.scrollTo(0, 0); },
  loadauto: () => { try { FM.load(sget(SAVE_AUTO)); S = FM.state(); turn = null; view = 'home'; renderApp(); window.scrollTo(0, 0); } catch (e) { toast('Salvataggio non leggibile'); } },
  loadslot: id => { const raw = sget(SLOT(id)); if (!raw) return; try { FM.load(raw); S = FM.state(); turn = null; stopLive(); closeModal(); autosave(); view = 'home'; renderApp(); toast('Carriera caricata dallo slot ' + id); } catch (err) { toast('Slot non valido'); } },
  saveslot: id => { if (sset(SLOT(id), FM.serialize())) { toast('Salvato nello slot ' + id); renderApp(); } else toast('Salvataggio non riuscito: memoria del browser piena o bloccata. Usa Esporta.'); },
  delslot: id => ask('Eliminare lo slot ' + id + '?', () => { sdel(SLOT(id)); renderApp(); }),
  export: () => {
    const data = FM.serialize();
    try { const blob = new Blob([data], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fm-valdarno-${FM.myClub().name.replace(/\W+/g, '-')}-${S.season}.json`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
    openModal(`<button class="x" data-a="close">×</button><h2>Esporta carriera</h2><p class="small muted">Se il file non si è scaricato, copia questo codice e conservalo (note, email, WhatsApp a te stesso). Per riprendere la carriera su un altro dispositivo: Salvataggi → Incolla codice.</p><textarea id="exptxt" readonly rows="6">${esc(data)}</textarea><div class="row" style="margin-top:10px"><button class="btn pri" data-a="copyexp">Copia codice</button><span class="small muted">${Math.round(data.length / 1024)} KB</span></div>`);
  },
  copyexp: () => { const t = $('#exptxt'); const done = () => toast('Codice copiato'); try { navigator.clipboard.writeText(t.value).then(done, () => { t.select(); toast('Seleziona e copia a mano'); }); } catch (e) { t.select(); toast('Seleziona e copia a mano'); } },
  pasteimp: () => openModal(`<button class="x" data-a="close">×</button><h2>Incolla codice salvataggio</h2><textarea id="imptxt" rows="6" placeholder="Incolla qui il codice esportato"></textarea><div class="row" style="margin-top:10px"><button class="btn pri" data-a="doimp">Carica carriera</button></div>`),
  doimp: () => { try { FM.load($('#imptxt').value.trim()); S = FM.state(); turn = null; stopLive(); closeModal(); autosave(); view = 'home'; renderApp(); toast('Carriera caricata'); } catch (e) { toast('Codice non valido: ' + esc(e.message)); } },
  more: () => moreSheet(),
  newgame: () => ask('Iniziare una nuova carriera? Quella attuale resta solo se l\'hai salvata in uno slot o esportata.', () => { sdel(SAVE_AUTO); turn = null; stopLive(); ROOT().innerHTML = ''; renderStart(); }),
  'newgame-force': () => { sdel(SAVE_AUTO); turn = null; stopLive(); closeModal(); ROOT().innerHTML = ''; renderStart(); },
  loadslotmenu: () => { closeModal(); S.gameOver = null; view = 'options'; ROOT().innerHTML = ''; renderApp(); },
  continue: () => onContinue(),
  readall: () => { S.inbox.forEach(m => m.read = true); renderApp(); },
  openmsg: id => { const m = S.inbox.find(x => x.id === id); if (m) { m.read = true; ui.inboxOpen = ui.inboxOpen === id ? null : id; } renderApp(); },
  sort: id => { ui.squadSort = id; renderApp(); },
  srole: id => { ui.squadRole = id; renderApp(); },
  player: id => playerModal(id),
  choice: id => { const [mid, i] = id.split('|'); const m = S.inbox.find(x => x.id === mid); const c = m && m.choices[+i]; if (c && c.open) { m.done = +i; m.read = true; renderApp(); return playerModal(c.open); } const r = FM.answerMsg(mid, +i); if (r) toast(esc(r)); autosave(); renderApp(); },
  setrt: id => { const [i, k] = id.split('|'); S.tactic.rt[+i] = k; renderApp(); },
  setins: id => { const [i, k] = id.split('|'); S.tactic.ins[+i] = k; renderApp(); },
  tdone: () => { ui.tsel = null; renderApp(); },
  tp: id => {
    const T = S.tactic;
    if (!ui.tsel) { ui.tsel = id; return renderApp(); }
    if (ui.tsel === id) { ui.tsel = null; return renderApp(); }
    const get = k => k[0] === 's' ? T.slots[+k.slice(1)] : k[0] === 'b' ? T.bench[+k.slice(1)] : k.slice(1);
    const set = (k, v) => { if (k[0] === 's') T.slots[+k.slice(1)] = v || null; else if (k[0] === 'b') { if (v) T.bench[+k.slice(1)] = v; else T.bench.splice(+k.slice(1), 1); } };
    const A = ui.tsel, B = id, a = get(A), b = get(B);
    if (A[0] === 'r' && B[0] === 'r') { ui.tsel = id; return renderApp(); }
    set(A, b); set(B, a); T.auto = false; ui.tsel = null; FM.validateLineup(); renderApp();
  },
  bestxi: () => { S.tactic.auto = true; FM.validateLineup(); S.tactic.auto = false; renderApp(); toast('Formazione migliore schierata'); },
  focus: id => { S.training.focus = id; renderApp(); },
  intens: id => { S.training.intensity = id; renderApp(); },
  fxround: id => { ui.fxOpen = ui.fxOpen === +id ? null : +id; renderApp(); },
  mktab: id => { ui.mk.tab = id; renderApp(); },
  scout: id => { const r = FM.scoutPlayer(id); toast(r || 'Osservatore incaricato: rapporto la prossima settimana.'); renderApp(); playerModal(id); },
  pedit: id => { const p = S.players[id]; if (!p) return; openModal(`<button class="x" data-a="close">×</button><h2>Correggi giocatore</h2>
    <p class="small muted">Se conosci il nome vero (o il ruolo giusto) di questo giocatore, scrivilo qui. Abilità ed età restano quelle simulate.</p>
    <div class="stack"><label class="small" for="pe-name">Nome e cognome</label><input id="pe-name" type="text" maxlength="40" value="${esc(p.name)}" autocomplete="off">
    <label class="small" for="pe-role">Ruolo</label><select id="pe-role" style="width:100%">${['POR', 'DIF', 'CEN', 'ATT'].map(r => `<option value="${r}" ${p.role === r ? 'selected' : ''}>${FM.ROLE_LABEL[r]}</option>`).join('')}</select>
    <div class="row"><button class="btn pri" data-a="psave" data-id="${id}">Salva</button><button class="btn" data-a="pback" data-id="${id}">Annulla</button></div></div>`); setTimeout(() => { const i = $('#pe-name'); if (i) { i.focus(); i.select(); } }, 30); },
  pback: id => playerModal(id),
  psave: id => { const r = FM.editPlayer(id, $('#pe-name').value, $('#pe-role').value); toast(esc(r.txt)); if (!r.ok) return; autosave(); renderApp(); playerModal(id); },
  short: id => { const i = S.shortlist.indexOf(id); if (i >= 0) S.shortlist.splice(i, 1); else S.shortlist.push(id); renderApp(); playerModal(id); },
  bid: id => { const fee = $('#bf') ? +$('#bf').value : 0, w = +$('#bw').value, y = +$('#by').value, sw = $('#bswap') ? $('#bswap').value : ''; const r = FM.bid(id, fee, w, y, null, false, sw || null); afterDeal(id, r); },
  loan: id => { const r = FM.bid(id, 0, 0, 1, +$('#lp').value, $('#lopt') && $('#lopt').checked); afterDeal(id, r); },
  renew: id => { const r = FM.renew(id, +$('#rw').value, +$('#ry').value); toast(esc(r.txt)); renderApp(); playerModal(id, r.ok ? `<b class="good">${esc(r.txt)}</b>` : esc(r.txt)); },
  list: id => { S.players[id].listed = true; toast('Messo in vendita: le offerte arrivano a mercato aperto.'); renderApp(); playerModal(id); },
  unlist: id => { S.players[id].listed = false; renderApp(); if ($('#ov')) playerModal(id); },
  release: id => { const p = S.players[id]; ask(p.loan ? `Rimandare ${esc(p.name)} al suo club?` : `Rescindere il contratto di ${esc(p.name)}? Pagherai una parte degli stipendi residui.`, () => { FM.release(id); FM.validateLineup(); autosave(); renderApp(); }); },
  offacc: id => { toast(esc(FM.answerOffer(id, true) || '')); autosave(); renderApp(); },
  offrej: id => { FM.answerOffer(id, false); renderApp(); },
  offcnt: id => { const v = +$('#cnt-' + id).value; toast(esc(FM.answerOffer(id, false, v) || '')); autosave(); renderApp(); },
  hirestaff: id => { const r = FM.hireStaff(id); toast(esc(r || 'Assunto!')); renderApp(); },
  firestaff: id => ask('Licenziare? Costa 6 settimane di stipendio.', () => { FM.fireStaff(id); renderApp(); }),
  sponsor: id => { const r = FM.acceptSponsor(id); toast(esc(r || 'Contratto di sponsorizzazione firmato!')); autosave(); renderApp(); },
  upgrade: id => { const r = FM.upgradeFac(id); toast(esc(r || 'Lavori avviati!')); autosave(); renderApp(); },
  askfunds: () => { const r = FM.askFunds(); toast(esc(r || 'Fondi in arrivo!')); renderApp(); },
  promoteyouth: id => { const r = FM.promoteYouth(id); toast(esc(r || 'Aggregato alla prima squadra!')); closeModal(); renderApp(); },
  'pm-tactics': () => { closeModal(); go('tactics'); toast('Quando sei pronto premi "Vai alla partita"'); },
  'pm-quick': () => finishTurn(),
  'pm-live': () => startLive(),
  'lv-pause': () => { live.paused = !live.paused; renderLive(); tick(); },
  'lv-speed': id => { live.speed = +id; live.paused = false; renderLive(); tick(); },
  'lv-end': () => { clearTimeout(live.timer); FM.simulate(live.m); renderLive(); },
  'lv-sub': () => { const m = live.m; const r = FM.doSub(m, m.userSide, $('#sout').value, $('#sin').value); if (r) toast(esc(r)); renderLive(); },
  'lv-done': () => finishTurn(),
  sfx: () => { SFX.on = !SFX.on; sset('fmv9:sfx', SFX.on ? '1' : '0'); if (live) renderLive(true); else renderApp(); toast(SFX.on ? 'Suoni attivi' : 'Suoni disattivati'); },
  closeseason: () => { closeModal(); FM.closeSeason(); S = FM.state(); autosave(); view = 'home'; renderApp(); if (S.gameOver) showGameOver(); else toast(`Nuova stagione ${seasonLbl(S.season)}: guarda la posta.`); },
};
function afterDeal(id, r) {
  if (r.ok) { toast('✅ ' + esc(r.txt)); autosave(); renderApp(); closeModal(); return; }
  renderApp(); playerModal(id, esc(r.txt));
  if (r.counter && $('#bf')) $('#bf').value = r.counter;
  if (r.wage && $('#bw')) $('#bw').value = r.wage;
}
function onChange(e) {
  const el = e.target; const k = el.dataset.ch; if (!k) return;
  const T = S && S.tactic, v = el.value, id = el.dataset.id;
  switch (k) {
    case 'tauto': T.auto = el.checked; FM.validateLineup(); break;
    case 'form': T.form = v; T.rt = FM.defaultRT(v); T.rtForm = v; T.ins = FM.FORMS[v].map(() => 'normale'); if (!T.auto) { T.auto = true; FM.validateLineup(); T.auto = false; } break;
    case 'ment': case 'press': case 'tempo': T[k] = v; break;
    case 'captain': T.captain = v; break;
    case 'pk': T.pk = v; break;
    case 'corner': T.corner = v; break;
    case 'fk': T.fk = v; break;
    case 'autosubs': T.autoSubs = el.checked; break;
    case 'slot': {
      T.auto = false; const i = +id, old = T.slots[i];
      if (v) { const j = T.slots.indexOf(v), b = T.bench.indexOf(v); if (j >= 0 && j !== i) T.slots[j] = old; else if (b >= 0) { if (old) T.bench[b] = old; else T.bench.splice(b, 1); } }
      T.slots[i] = v || null; FM.validateLineup(); break;
    }
    case 'bench': { T.auto = false; T.bench[+id] = v; T.bench = [...new Set(T.bench)]; FM.validateLineup(); break; }
    case 'pfocus': S.players[id].focus = v; toast('Focus individuale impostato'); return;
    case 'mk-role': ui.mk.role = v; break;
    case 'mk-scope': ui.mk.scope = v; break;
    case 'mk-age': ui.mk.age = v; break;
    case 'mk-fee': ui.mk.fee = v; break;
    case 'mk-min': ui.mk.minEst = v || 0; break;
    case 'mk-q': ui.mk.q = v; break;
    case 'staffrole': ui.staffRole = v; break;
    case 'ssort': ui.squadSort = v; break;
    case 'ticket': S.ticket = Math.max(0, Math.min(500, +v || 0)); toast('Prezzo aggiornato'); break;
    case 'lv-ment': live.m[live.m.userSide].ment = v; FM.rate(live.m); return;
    case 'lv-press': live.m[live.m.userSide].press = v; FM.rate(live.m); return;
    case 'lv-auto': live.m[live.m.userSide].autoSubs = el.checked; return;
    default: return;
  }
  renderApp();
}
document.addEventListener('change', e => { if (e.target.id === 'importfile2') importFile(e); });
window.addEventListener('DOMContentLoaded', init);
window.FMUI = { state: () => S, view: () => view, inGame: () => !!(S && document.getElementById("app")), go, autosave, onContinue, finishTurn, HANDLERS };
})();
