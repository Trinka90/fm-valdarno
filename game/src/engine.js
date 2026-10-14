/* FM del Valdarno 9.0 — motore di gioco (nessuna dipendenza, gira in browser e in Node) */
(function (root) {
'use strict';
const DATA = (typeof FM_NATIONAL !== 'undefined' ? FM_NATIONAL : root.FM_NATIONAL) || { clubs: [], players: [] };
const VERSION = 9;
let S = null; // stato corrente (serve all'RNG)

/* ---------------- RNG e utilità ---------------- */
function rnd() { let t = (S.rng = (S.rng + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const rf = (a, b) => a + (b - a) * rnd();
const ri = (a, b) => Math.floor(rf(a, b + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpick(items, w) { const ws = items.map(w); let t = ws.reduce((x, y) => x + y, 0) * rnd(); for (let i = 0; i < items.length; i++) { t -= ws[i]; if (t <= 0) return items[i]; } return items[items.length - 1]; }
const round = (x, s = 1) => Math.round(x / s) * s;

/* ---------------- Piramide ---------------- */
// base = valore medio (1-100) di un titolare; wage = ingaggio/rimborso settimanale medio; owner = contributo stagionale del presidente
const TIERS = [
  { cat: 'Serie A', base: 77, wage: 38000, value: 9e6, fans: 26000, ticket: 32, tv: 520000, sponsor: 160000, owner: 9e6, travel: 25000, fee: 2.5e6, minCap: 16000, prize: 4e6, amateur: false, short: 'A' },
  { cat: 'Serie B', base: 69, wage: 8500, value: 1.3e6, fans: 8000, ticket: 20, tv: 55000, sponsor: 28000, owner: 2.6e6, travel: 9000, fee: 900000, minCap: 5500, prize: 1.2e6, amateur: false, short: 'B' },
  { cat: 'Serie C', base: 62, wage: 2300, value: 200000, fans: 2600, ticket: 14, tv: 7000, sponsor: 6500, owner: 650000, travel: 2500, fee: 350000, minCap: 2000, prize: 250000, amateur: false, short: 'C' },
  { cat: 'Serie D', base: 56, wage: 450, value: 45000, fans: 1100, ticket: 10, tv: 0, sponsor: 1900, owner: 220000, travel: 900, fee: 25000, minCap: 1000, prize: 60000, amateur: true, short: 'D' },
  { cat: 'Eccellenza', base: 50, wage: 200, value: 15000, fans: 650, ticket: 8, tv: 0, sponsor: 750, owner: 65000, travel: 350, fee: 9000, minCap: 500, prize: 20000, amateur: true, short: 'ECC' },
  { cat: 'Promozione', base: 45, wage: 90, value: 6000, fans: 400, ticket: 7, tv: 0, sponsor: 380, owner: 33000, travel: 220, fee: 5500, minCap: 300, prize: 10000, amateur: true, short: 'PROM' },
  { cat: 'Prima Categoria', base: 40, wage: 45, value: 2500, fans: 260, ticket: 6, tv: 0, sponsor: 200, owner: 18000, travel: 150, fee: 3800, minCap: 200, prize: 5000, amateur: true, short: '1ª' },
  { cat: 'Seconda Categoria', base: 35, wage: 20, value: 1000, fans: 170, ticket: 5, tv: 0, sponsor: 110, owner: 11000, travel: 110, fee: 2500, minCap: 100, prize: 3000, amateur: true, short: '2ª' },
  { cat: 'Terza Categoria', base: 30, wage: 10, value: 400, fans: 110, ticket: 5, tv: 0, sponsor: 60, owner: 6000, travel: 80, fee: 1500, minCap: 0, prize: 1500, amateur: true, short: '3ª' },
];
const PREF_GROUP = { 8: 'Arezzo', 7: 'Toscana I', 6: 'Toscana E', 5: 'Toscana C', 4: 'Toscana B', 3: 'E', 2: 'B', 1: 'Unico', 0: 'Unico' };
const BIG = { Inter: 6, Napoli: 5, Juventus: 5, Milan: 5, Atalanta: 4, Roma: 4, Lazio: 2, Fiorentina: 2, Bologna: 2, Como: 2, Palermo: 3, Sampdoria: 2, 'Hellas Verona': 2, Empoli: 2 };

/* ---------------- Attributi ---------------- */
const ATTRS = ['por', 'dif', 'pas', 'tec', 'tir', 'vel', 'res', 'fis', 'vis', 'men'];
const ATTR_LABEL = { por: 'Portiere', dif: 'Difesa', pas: 'Passaggio', tec: 'Tecnica', tir: 'Tiro', vel: 'Velocità', res: 'Resistenza', fis: 'Fisico', vis: 'Visione', men: 'Mentalità' };
const W = {
  POR: { por: .6, men: .14, fis: .1, pas: .08, vel: .08 },
  DIF: { dif: .36, fis: .15, vel: .11, men: .13, pas: .1, res: .1, tec: .05 },
  CEN: { pas: .24, vis: .19, tec: .16, res: .12, dif: .1, men: .1, tir: .09 },
  ATT: { tir: .33, tec: .2, vel: .18, fis: .1, men: .09, vis: .1 },
};
const ROLES = ['POR', 'DIF', 'CEN', 'ATT'];
const ROLE_LABEL = { POR: 'Portiere', DIF: 'Difensore', CEN: 'Centrocampista', ATT: 'Attaccante' };
function roleOvr(p, role) { const w = W[role]; let s = 0; for (const k in w) s += p.a[k] * w[k]; let o = s * 5; if (role !== p.role) o *= role === 'POR' || p.role === 'POR' ? .35 : .8; return o; }
function ovr(p) { return roleOvr(p, p.role); }
function genAttrs(role, target) {
  const a = {}, t = target / 5;
  for (const k of ATTRS) {
    const key = W[role][k] || 0;
    a[k] = key ? t + gauss() * 1.6 + (key > .15 ? .6 : 0) : t - 2.5 + gauss() * 2.2;
  }
  if (role !== 'POR') a.por = rf(1, 3.5); else a.tir = Math.min(a.tir, rf(1, 6));
  for (let i = 0; i < 4; i++) { const cur = roleOvr({ a, role }, role); const d = (target - cur) / 5; for (const k in W[role]) a[k] += d; }
  for (const k of ATTRS) a[k] = clamp(a[k], 1, 20);
  return a;
}

/* ---------------- Nomi generati (inventati) ---------------- */
const FN = 'Alessandro Andrea Lorenzo Matteo Leonardo Francesco Gabriele Riccardo Tommaso Edoardo Mattia Giuseppe Federico Antonio Davide Marco Luca Simone Filippo Niccolò Pietro Giovanni Samuele Daniele Michele Stefano Nicola Emanuele Christian Alessio Jacopo Diego Elia Cristian Giacomo Manuel Fabio Paolo Roberto Claudio Valerio Dario Enrico Mirko Kevin Denis Ivan Samuel Youssef Mohamed Adam Omar Elvis Arben Luis Bruno Iacopo Duccio Neri Guido Ettore Brando Tiziano Saverio Vittorio Ruben Gianluca Cosimo Ludovico Alberto'.split(' ');
const LN = 'Rossi Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale Lombardo Serra Coppola De_Santis D\'Angelo Marchetti Parisi Villa Conte Ferraro Ferri Fabbri Bianco Marini Grasso Valentini Messina Sala De_Angelis Gatti Pellegrini Palumbo Sanna Farina Rizzi Monti Cattaneo Morelli Amato Silvestri Mazza Testa Grassi Pellegrino Carbone Giuliani Benedetti Barone Rossetti Caputo Montanari Guerra Palmieri Bernardi Martino Fiore De_Rosa Ferretti Bellini Basile Riva Donati Piras Vitali Battaglia Sartori Neri Costantini Milani Pagano Ruggiero Sorrentino D\'Amico Orlando Damico Negri Bartoli'.split(' ');
const LNX = 'Diallo Traoré Kone Hoxha Krasniqi Popescu Ionescu Silva Santos Pereira Kovač Novak Ouedraogo Benali El Idrissi Gashi Shehu Mendes Camara Sow'.split(' ');
// cognomi e nomi tipici per area geografica (per le rose generate quando mancano i nomi reali)
const AREA_LN = {
  TOS: 'Becattini Bindi Cappelli Lapini Mugnai Nocentini Pratesi Sbragi Tognaccini Vannini Bucciarelli Giannini Fratini Landi Lucherini Panichi Pasquini Rosai Sestini Tanzini Bencini Baldini Innocenti Bartolini Ciampi Manetti Calamai Pecchioli Bagnoli Nencini Tarchi Cioni Lotti Fabbrini Magini Del_Sere Bigazzi Baroncini Mazzuoli Pierozzi'.split(' '),
  CEN: 'Proietti Ceccarelli Cerqua Santarelli Paolucci Di_Giacomo Pierantoni Marinelli Di_Pietro D\'Ottavio Cipriani Taddei Bartolucci Brizi Ciotti Pieroni Tiberi Rosati Di_Marco Bernardini Petrucci Fioravanti Sciarra Ciccarelli Mattioli Pompili Di_Felice Marcantoni Capriotti Cesaroni'.split(' '),
  NO: 'Brambilla Galbiati Pozzi Bonfanti Rota Ravasio Pirovano Cereda Perego Biffi Crippa Mauri Fumagalli Bertolini Ghisalberti Bosio Allasia Gribaudo Ferrero Giachino Cravero Bertola Parodi Canepa Repetto Traverso Ghio Rebora Locatelli Mapelli'.split(' '),
  NE: 'Zanella Zanon Bortolin De_Marchi Zanetti Pavan Favaro Bettin Furlan Visentin Tonon Dal_Bello Zago Battistella Bonacini Malaguti Gualandi Baraldi Ghelfi Bertoni Guidetti Zanni Casadei Pirini Zoffoli Spada Montanari Golinelli Tassinari Venturi'.split(' '),
  CAM: 'Esposito Iovine Cozzolino Ambrosio Capasso Scognamiglio Sorrentino De_Simone Della_Corte Iervolino Langella Auricchio Di_Lorenzo Ascione Cirillo Napolitano Coppola Improta Vitiello Russo Iannone Formisano Cuomo Aprea Gargiulo Starace Manna Di_Maio'.split(' '),
  SUD: 'Lorusso Losito Lacatena Giannelli Lopopolo Caputo Colella Laterza Lamanna De_Palma Ventola Cassano Perrone Mastrangelo Schiavone Labianca Loiacono Ricciardi Fortunato Lagioia Scarpelli Gallo Mazzei Lento Morabito Barillà Strangio Romeo'.split(' '),
  SIC: 'Messina La_Rosa Lo_Presti Di_Stefano Bonanno Scuderi Cannizzaro Puglisi Musumeci Spadaro Giuffrida Lo_Bianco Cusumano Mangano Pappalardo Arena Mirabella Lo_Iacono Pulvirenti Tumminello Sciacca Di_Mauro Licata Scalia Barbagallo'.split(' '),
  SAR: 'Sanna Piras Murgia Pinna Melis Deiana Carta Porcu Fadda Usai Mura Cocco Atzeni Loi Serra Pisanu Pintus Cossu Satta Manca Mameli Spanu Lai Floris'.split(' '),
};
const AREA_FN = { CAM: 'Ciro Gennaro Salvatore Vincenzo Pasquale Raffaele Carmine Aniello'.split(' '), SUD: 'Vito Nicola Donato Cosimo Domenico Rocco Savino Pasquale'.split(' '), SIC: 'Salvatore Giuseppe Carmelo Gaetano Sebastiano Calogero Vincenzo Santo'.split(' '), SAR: 'Gavino Efisio Giovanni Antonio Salvatore Andrea'.split(' '), NE: 'Nicolò Mattia Alberto Enrico Giacomo'.split(' '), NO: 'Luca Matteo Stefano Alessandro Davide'.split(' ') };
const REG_AREA = { Toscana: 'TOS', Umbria: 'CEN', Lazio: 'CEN', Marche: 'CEN', Abruzzo: 'CEN', Piemonte: 'NO', Liguria: 'NO', Lombardia: 'NO', "Valle d'Aosta": 'NO', Veneto: 'NE', 'Friuli-Venezia Giulia': 'NE', 'Trentino-Alto Adige': 'NE', 'Emilia-Romagna': 'NE', Campania: 'CAM', Puglia: 'SUD', Basilicata: 'SUD', Molise: 'SUD', Calabria: 'SUD', Sicilia: 'SIC', Sardegna: 'SAR' };
const SARDI = /budoni|ossese|monastir|sassari|sarrabus|torres|olbia|cagliari|tempio|latte dolce|lattedolce|ilvamaddalena|carbonia|arzachena/i;
const EMILIANI = /mezzolara|progresso|sasso marconi|bologna|correggese|lentigione|cittadella modena|tropical coriano|piacenza|fiorenzuola|nibbiano|reggiana|modena|carpi|parma|sassuolo|spal|ravenna|forl[iì]|cesena|rimini|imolese|sammaurese/i;
const CENTRALI = /ternana|flaminia|perugia|foligno|gubbio|trestina|pietralunghese|angelana|orvietana/i;
const CALABRI = /reggina|vibonese|sambiase|lamezia|praiatortora|cosenza|catanzaro|crotone|rossanese|castrovillari|locri|siderno|cittanova/i;
const FNX = 'Moussa Amadou Ibrahima Youssef Mohamed Arben Ardit Klevis Denis Bruno Luis Andrei Mihai Ivan Luka Marko Kevin Samuel Omar Adam'.split(' ');
function areaOf(c) {
  if (!c) return '';
  if (SARDI.test(c.name)) return 'SAR';
  if (c.region && REG_AREA[c.region]) return REG_AREA[c.region];
  if (CALABRI.test(c.name)) return 'SUD';
  if (EMILIANI.test(c.name)) return 'NE';
  if (CENTRALI.test(c.name)) return 'CEN';
  const g = (c.group || '').trim().toUpperCase();
  if (c.tier === 3) return { A: 'NO', B: 'NO', C: 'NE', D: 'NE', E: 'TOS', F: 'CEN', G: 'CEN', H: 'SUD', I: 'SIC' }[g] || '';
  if (c.tier === 2) return { A: 'NO', B: 'CEN', C: 'SUD' }[g] || '';
  return '';
}
function genName(area) {
  const L = AREA_LN[area], F = AREA_FN[area];
  const r = rnd();
  if (r < .12) return pick(FNX) + ' ' + pick(LNX);
  const fn = F && rnd() < .3 ? pick(F) : pick(FN), ln = L && r < .72 ? pick(L) : pick(LN);
  return fn + ' ' + ln.replace(/_/g, ' ');
}

/* ---------------- Economia giocatori ---------------- */
function interpTier(o, field) {
  // interpolazione log fra le basi dei livelli
  const pts = TIERS.map(t => [t.base, Math.log(t[field])]).sort((a, b) => a[0] - b[0]);
  if (o <= pts[0][0]) return Math.exp(pts[0][1] + (o - pts[0][0]) * (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]));
  for (let i = 1; i < pts.length; i++) if (o <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return Math.exp(y0 + (o - x0) * (y1 - y0) / (x1 - x0)); }
  const n = pts.length, [x0, y0] = pts[n - 2], [x1, y1] = pts[n - 1];
  return Math.exp(y1 + (o - x1) * (y1 - y0) / (x1 - x0) * .55);
}
function niceMoney(x) { if (x < 100) return round(x, 1); if (x < 1000) return round(x, 5); if (x < 10000) return round(x, 50); if (x < 100000) return round(x, 500); if (x < 1e6) return round(x, 5000); return round(x, 50000); }
function wageFor(o) { return niceMoney(Math.max(0, interpTier(o, 'wage'))); }
function valueFor(p) {
  const o = p.ovr, age = p.age;
  let v = interpTier(o, 'value');
  const af = age <= 21 ? 1.5 : age <= 24 ? 1.3 : age <= 28 ? 1 : age <= 31 ? .7 : age <= 33 ? .4 : .2;
  const pot = Math.max(0, p.pa - o) * (age < 24 ? .035 : .01);
  return niceMoney(v * af * (1 + pot));
}
function stars(o, tier) { return clamp((o - (TIERS[tier].base - 14)) / 22 * 5, .5, 5); }

/* ---------------- Giocatori ---------------- */
function editPlayer(pid, name, role) {
  const p = S.players[pid]; if (!p) return { ok: false, txt: 'Giocatore non trovato' };
  name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (name.length < 3) return { ok: false, txt: 'Nome troppo corto' };
  if (!ROLES.includes(role)) role = p.role;
  if (name !== p.name) { p.name = name; p.edited = true; p.real = false; }
  if (role !== p.role) { p.role = role; p.ovr = roleOvr(p, role); p.edited = true; if (p.club === S.clubId) validateLineup(); }
  return { ok: true, txt: 'Giocatore aggiornato' };
}
function newPlayer(o) {
  const id = 'p' + (S.nextId++);
  const p = {
    id, name: o.name || genName(o.area), role: o.role, age: o.age, a: genAttrs(o.role, o.ovr), pa: 0, ovr: 0,
    club: o.club || null, real: !!o.real, src: o.src || '', srcNote: o.srcNote || '',
    morale: 70, fit: 100, cond: 100, inj: 0, injName: '', susp: 0, yc: 0,
    wage: 0, until: S.season + (o.years || ri(0, 2)), listed: false, loan: null, focus: '',
    st: { app: 0, g: 0, as: 0, r: 0, yc: 0, rc: 0, mom: 0 }, car: { app: 0, g: 0, as: 0 }, joined: S.season, youth: !!o.youth, xp: 0, form: [],
    pers: genPers(o.age),
  };
  p.ovr = ovr(p);
  const young = Math.max(0, 25 - p.age);
  p.pa = clamp(o.pa || p.ovr + young * rf(.3, 2.6) + rf(0, 4), p.ovr, 96);
  p.wage = o.wage != null ? o.wage : wageFor(p.ovr) * rf(.8, 1.15);
  p.wage = niceMoney(p.wage);
  S.players[id] = p;
  return p;
}
function genPers(age) { const g = () => clamp(Math.round(10 + gauss() * 4), 1, 20); const p = { amb: g(), pro: g(), tem: g(), lead: g() }; if (age >= 29) p.lead = clamp(p.lead + 2, 1, 20); return p; }
function persLabel(p) {
  const q = p.pers || { amb: 10, pro: 10, tem: 10, lead: 10 };
  if (q.lead >= 16 && q.pro >= 13) return 'Leader nato'; if (q.pro >= 16) return 'Professionista modello'; if (q.tem <= 5) return 'Testa calda'; if (q.amb >= 16) return 'Molto ambizioso';
  if (q.pro <= 5) return 'Poco professionale'; if (q.lead >= 15) return 'Uomo spogliatoio'; if (q.amb <= 5) return 'Senza grandi ambizioni'; return 'Equilibrato';
}
function refresh(p) { p.ovr = ovr(p); }
function ageFor(tier) { const amateur = TIERS[tier].amateur; return clamp(Math.round(amateur ? 25 + gauss() * 5 : 25.5 + gauss() * 4), 17, amateur ? 38 : 36); }

/* ---------------- Club ---------------- */
const REAL_BY_CLUB = {};
for (const p of DATA.players || []) (REAL_BY_CLUB[p.club] = REAL_BY_CLUB[p.club] || []).push(p);
function dbClubs(tier, group) { return (DATA.clubs || []).filter(c => c.tier === tier && (group == null || c.group === group)); }
function groupsOf(tier, region) { const g = new Set(); for (const c of DATA.clubs || []) if (c.tier === tier && (!region || c.region === region || c.region === 'Italia')) g.add(c.group); return [...g]; }
const COACH_FN = 'Massimo Roberto Stefano Paolo Andrea Marco Fabio Luca Alessandro Giovanni Simone Daniele Mauro Claudio Gianluca Francesco Maurizio Piero Sandro Enrico'.split(' ');
function makeClub(name, tier, o = {}) {
  const id = 'k' + (S.nextId++);
  const T = TIERS[tier];
  const bias = (BIG[name] || 0) + gauss() * (T.amateur ? 3.2 : 2.6);
  const c = {
    id, name, tier, group: o.group || '', region: o.region || 'Toscana', dbId: o.dbId || null, bias, rep: clamp(50 + bias * 6, 5, 99),
    fans: Math.round(T.fans * clamp(1 + bias * .08 + gauss() * .15, .4, 2.5)), squad: [], user: false,
    coach: (pick(COACH_FN) + ' ' + pick(LN)).replace(/_/g, ' '), coachW: 0,
  };
  S.clubs[id] = c;
  return c;
}
function genSquad(c, tier, realList) {
  const T = TIERS[tier];
  if (realList) { const f = realList.filter(p => p.category === T.cat); realList = f.length ? f : (realList.every(p => p.category === realList[0].category) && Math.abs(TIERS.findIndex(t => t.cat === realList[0].category) - tier) <= 1 ? realList : null); }
  const roles = T.amateur ? ['POR', 'POR', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT', 'ATT', 'ATT', 'ATT']
    : ['POR', 'POR', 'POR', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT', 'ATT', 'ATT', 'ATT'];
  const list = [];
  const base = T.base + c.bias, area = areaOf(c);
  const mk = (role, i, extra) => {
    const quality = i < 11 ? base + gauss() * 3 : base - 4 + gauss() * 4;
    return newPlayer(Object.assign({ role, age: ageFor(tier), ovr: clamp(quality, 12, 92), club: c.id, area, years: ri(0, T.amateur ? 1 : 3) }, extra));
  };
  if (realList && realList.length) {
    const byRole = {}; realList.forEach(r => (byRole[r.role] = byRole[r.role] || []).push(r));
    for (const r of realList) {
      const age = r.birth_year ? clamp(S.season - r.birth_year, 16, 40) : ageFor(tier);
      const q = base - 1.5 + ageCurve(age) + (FAME[r.name] || 0) + gauss() * 2.6;
      list.push(newPlayer({ role: r.role, age, ovr: clamp(q, 12, 94), club: c.id, years: ri(0, T.amateur ? 1 : 3), name: r.name, real: true, src: r.source, srcNote: r.status }));
    }
    // completa i ruoli mancanti
    const need = { POR: T.amateur ? 2 : 3, DIF: 6, CEN: 6, ATT: 4 };
    for (const role of ROLES) { let have = list.filter(p => p.role === role).length; while (have < need[role]) { list.push(mk(role, 11 + have, {})); have++; } }
    while (list.length < 20) list.push(mk(pick(['DIF', 'CEN', 'ATT']), 15, {}));
  } else roles.forEach((r, i) => list.push(mk(r, i < 3 ? (i === 0 ? 0 : 15) : i)));
  c.squad = list.map(p => p.id);
}

function ageCurve(a) { return a <= 18 ? -6 : a <= 20 ? -3.5 : a <= 22 ? -1.5 : a <= 30 ? 1.5 : a <= 32 ? .5 : a <= 34 ? -1.5 : -4; }
// giocatori molto noti: bonus rispetto al livello medio del club (solo per rendere credibili le gerarchie)
const FAME = {
  'Lautaro Martínez': 11, 'Nicolò Barella': 9, 'Marcus Thuram': 8, 'Hakan Çalhanoğlu': 8, 'Alessandro Bastoni': 8, 'Federico Dimarco': 7, 'Piotr Zieliński': 5, 'Henrikh Mkhitaryan': 5, 'Pio Esposito': 4,
  'Kevin De Bruyne': 10, 'Scott McTominay': 9, 'Rasmus Højlund': 7, 'Stanislav Lobotka': 7, 'Alessandro Buongiorno': 6, 'Giovanni Di Lorenzo': 6, 'Frank Anguissa': 6, 'David Neres': 6, 'Sam Beukema': 5, 'Vanja Milinković-Savić': 5, 'Noa Lang': 5, 'Amir Rrahmani': 4,
  'Christian Pulisic': 9, 'Luka Modrić': 8, 'Mike Maignan': 8, 'Adrien Rabiot': 7, 'Strahinja Pavlović': 6, 'Ardon Jashari': 5, 'Pervis Estupiñán': 5, 'Ruben Loftus-Cheek': 4, 'Gonçalo Ramos': 6, 'Alexis Saelemaekers': 5,
  'Paulo Dybala': 8, 'Mile Svilar': 7, 'Manu Koné': 7, 'Matías Soulé': 6, 'Evan Ndicka': 6, 'Lorenzo Pellegrini': 5, 'Donyell Malen': 6, 'Bryan Cristante': 4, 'Gianluca Mancini': 4,
  'Charles De Ketelaere': 8, 'Éderson': 7, 'Gianluca Scamacca': 7, 'Isak Hien': 6, 'Marco Carnesecchi': 6, 'Giacomo Raspadori': 6, 'Nikola Krstović': 6, 'Giorgio Scalvini': 6, 'Mario Pašalić': 4, 'Franck Kessié': 4,
  'Nico Paz': 8, 'Moise Kean': 8, 'Martin Baturina': 6, 'Máximo Perrone': 5, 'Robert Sánchez': 5, 'Trevoh Chalobah': 5, 'Jesús Rodríguez': 5,
  'Mattia Zaccagni': 6, 'Davide Frattesi': 6, 'Nicolò Rovella': 6, 'Gustav Isaksen': 5, 'Alessio Romagnoli': 5, 'Christos Mandas': 4,
  'Riccardo Orsolini': 7, 'Artem Dovbyk': 6, 'Łukasz Skorupski': 4, 'Lewis Ferguson': 5, 'Jens Odgaard': 4,
  'Domenico Berardi': 7, 'Nemanja Matić': 4, 'Jay Idzes': 4, 'Armand Laurienté': 5, 'David Alaba': 5, 'Nicolò Zaniolo': 5, 'Keinan Davis': 4,
  'Duván Zapata': 4, 'Ché Adams': 4, 'Nikola Vlašić': 5, 'Giovanni Simeone': 4, 'Stephan El Shaarawy': 4, 'Johan Vásquez': 4, 'Leo Østigård': 4, 'Tommaso Baldanzi': 4,
  'Zion Suzuki': 5, 'Adrián Bernabé': 5, 'Mateo Pellegrino': 4, 'Wladimiro Falcone': 4, 'Yerry Mina': 3, 'Gennaro Borrelli': 3,
  'Lorenzo Insigne': 6, 'Andrea Belotti': 5, 'Gennaro Tutino': 5, 'Joel Pohjanpalo': 6, 'Mattia Perin': 5, 'Papu Gómez': 3, 'Pietro Iemmello': 4, 'Massimo Coda': 3,
  'Dušan Vlahović': 8, 'Kenan Yıldız': 9, 'Gleison Bremer': 8, 'Manuel Locatelli': 6, 'Teun Koopmeiners': 6, 'Khéphren Thuram': 6, 'Andrea Cambiaso': 6, 'Michele Di Gregorio': 6, 'Francisco Conceição': 6, 'Jonathan David': 7,
  'David de Gea': 7, 'Albert Guðmundsson': 6, 'Robin Gosens': 4, 'Rolando Mandragora': 4, 'Edin Džeko': 4,
};
/* ---------------- Campionato ---------------- */
function scheduleRR(ids) {
  const n = ids.length; let a = ids.slice(); const rounds = [];
  for (let r = 0; r < n - 1; r++) { const pr = []; for (let j = 0; j < n / 2; j++) { const h = a[j], v = a[n - 1 - j]; pr.push(r % 2 ? [v, h] : [h, v]); } rounds.push(pr); a = [a[0], a[n - 1], ...a.slice(1, n - 1)]; }
  return rounds.concat(rounds.map(pr => pr.map(([h, v]) => [v, h])));
}
const REGION_D = { Toscana: 'E', Lazio: 'G', Campania: 'H', Puglia: 'H', Piemonte: 'A', Umbria: 'F' };
const REGION_C = { Toscana: 'B', Lazio: 'B', Umbria: 'B', Campania: 'C', Puglia: 'C', Piemonte: 'A' };
function chooseGroup(tier, prefer, region) {
  region = region || (S && S.region) || 'Toscana';
  if (tier >= 4) {
    const reg = [...new Set((DATA.clubs || []).filter(c => c.tier === tier && c.region === region).map(c => c.group))];
    if (prefer && reg.includes(prefer)) return prefer;
    if (region === 'Toscana' && reg.includes(PREF_GROUP[tier])) return PREF_GROUP[tier];
    if (reg.length) return reg.sort((a, b) => dbClubs(tier, b).length - dbClubs(tier, a).length)[0];
  }
  const groups = groupsOf(tier);
  if (prefer && groups.includes(prefer)) return prefer;
  if (tier === 3 && REGION_D[region] && groups.includes(REGION_D[region])) return REGION_D[region];
  if (tier === 2 && REGION_C[region] && groups.includes(REGION_C[region])) return REGION_C[region];
  if (groups.includes(PREF_GROUP[tier])) return PREF_GROUP[tier];
  return groups[0];
}
function buildLeague(tier, group, keepClubIds) {
  // keepClubIds: club già esistenti da inserire (es. quello dell'utente)
  group = chooseGroup(tier, group);
  const db = dbClubs(tier, group);
  const keep = keepClubIds.map(id => S.clubs[id]);
  const keepNames = new Set(keep.map(c => c.name));
  let pool = shuffle(db.filter(c => !keepNames.has(c.name)));
  let size = db.length + (keep.some(k => !db.find(d => d.name === k.name)) ? 0 : 0);
  size = Math.max(db.length, 14); if (size % 2) size--; if (size > 20) size = 20;
  const ids = keep.map(c => c.id);
  while (ids.length < size && pool.length) {
    const d = pool.shift();
    const c = makeClub(d.name, tier, { group, region: d.region, dbId: d.id });
    genSquad(c, tier, REAL_BY_CLUB[d.name]);
    ids.push(c.id);
  }
  while (ids.length < size || ids.length % 2) { const c = makeClub('Polisportiva ' + pick(LN).replace(/_/g, ' '), tier, { group }); genSquad(c, tier); ids.push(c.id); }
  for (const id of ids) { S.clubs[id].tier = tier; S.clubs[id].group = group; }
  const fixtures = scheduleRR(shuffle(ids.slice()));
  return { tier, cat: TIERS[tier].cat, group, teams: ids, fixtures, results: fixtures.map(() => []), round: 0 };
}
function table(L) {
  const t = {}; for (const id of L.teams) t[id] = { id, name: S.clubs[id].name, g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const rr of L.results) for (const r of rr) {
    const h = t[r.h], a = t[r.a]; if (!h || !a) continue;
    h.g++; a.g++; h.gf += r.hg; h.ga += r.ag; a.gf += r.ag; a.ga += r.hg;
    if (r.hg > r.ag) { h.w++; a.l++; h.pts += 3; h.form.push('V'); a.form.push('S'); }
    else if (r.hg < r.ag) { a.w++; h.l++; a.pts += 3; h.form.push('S'); a.form.push('V'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('N'); a.form.push('N'); }
  }
  return Object.values(t).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.name.localeCompare(y.name));
}
function promoRules(tier) {
  // direct: n promosse dirette; playoff: [da, a] posizioni; releg: retrocesse
  switch (tier) {
    case 0: return { direct: 0, playoff: null, releg: 3 };
    case 1: return { direct: 2, playoff: [3, 6], releg: 3 };
    case 2: return { direct: 1, playoff: [2, 5], releg: 2 };
    case 3: return { direct: 1, playoff: null, releg: 3 };
    case 8: return { direct: 1, playoff: [2, 5], releg: 0 };
    default: return { direct: 1, playoff: [2, 5], releg: 2 };
  }
}

/* ---------------- Calendario stagione ---------------- */
function buildCalendar() {
  const L = S.league, n = L.fixtures.length, cal = [];
  for (let i = 0; i < 4; i++) cal.push({ t: 'pre', i });
  const cupAt = [3, 7, 11, 15].filter(x => x < n - 2);
  for (let r = 0; r < n; r++) { cal.push({ t: 'lg', i: r }); const k = cupAt.indexOf(r); if (k >= 0) cal.push({ t: 'cup', i: k }); }
  cal.push({ t: 'end', i: 0 });
  S.cal = cal; S.ci = 0;
  const half = Math.floor(n / 2);
  S.winter = [half - 1, half + 2];
}
function windowOpen() {
  const e = S.cal[S.ci]; if (!e) return false;
  if (e.t === 'pre') return true;
  if (e.t === 'lg' && (e.i <= 1 || (e.i >= S.winter[0] && e.i <= S.winter[1]))) return true;
  return false;
}
function nextEvent() { return S.cal[S.ci]; }

/* ---------------- Coppa ---------------- */
function buildCup() {
  const L = S.league;
  let ids = L.teams.slice();
  ids.sort((a, b) => clubStrength(b) - clubStrength(a));
  ids = ids.filter(id => id !== S.clubId).slice(0, 15).concat([S.clubId]);
  shuffle(ids);
  const name = TIERS[L.tier].amateur ? 'Coppa ' + (L.tier >= 5 ? 'Toscana ' + L.cat : 'Italia Dilettanti') : 'Coppa Italia ' + (L.tier === 2 ? 'Serie C' : '');
  return { name: name.trim(), rounds: [ids], results: [], out: null, winner: null };
}
const CUP_ROUND = ['Ottavi', 'Quarti', 'Semifinale', 'Finale'];

/* ---------------- Nuova partita ---------------- */
function startClubs() {
  // tutti i club del database: dilettanti per regione, Serie D/C/B/A nazionali
  return (DATA.clubs || []).slice().sort((a, b) => b.tier - a.tier || a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    .map(c => ({ dbId: c.id, name: c.name, tier: c.tier, cat: c.category, group: c.group, region: c.region === 'Italia' ? '' : c.region, real: (REAL_BY_CLUB[c.name] || []).filter(p => p.category === c.category).length }));
}
function newGame(opt) {
  S = {
    v: VERSION, rng: (opt.seed >>> 0) || (Date.now() >>> 0), nextId: 1, season: 2026, manager: opt.manager || 'Allenatore',
    clubs: {}, players: {}, inbox: [], history: [], trophies: [], shortlist: [], scouted: {}, scoutQ: [], offersIn: [], deals: [], youth: [],
    tactic: { form: '4-4-2', ment: 'equilibrata', press: 'media', tempo: 'medio', slots: [], bench: [], auto: true, captain: null, pk: null },
    training: { focus: 'equilibrato', intensity: 'media' }, cohesion: 45, staff: [], staffMarket: [],
    fin: { bal: 0, ledger: [], season: {} }, ticket: 0, fac: { stadio: 1, campo: 1, giovanili: 1 }, building: [],
    sponsors: [], sponsorOffers: [], board: { conf: 60, obj: '', target: 0, wageBudget: 0, askedFunds: false, debtWeeks: 0 },
    gameOver: null, week: 0, lastMatch: null, news: 0, autosave: true, ext: [],
  };
  const d = (DATA.clubs || []).find(c => c.id === opt.dbId) || dbClubs(8, 'Arezzo')[0];
  const tier = d.tier;
  S.region = opt.region || (d.region && d.region !== 'Italia' ? d.region : 'Toscana');
  const me = makeClub(d.name, tier, { group: d.group, region: d.region, dbId: d.id });
  me.user = true; me.bias = -1; me.rep = 40;
  genSquad(me, tier, REAL_BY_CLUB[d.name]);
  S.clubId = me.id;
  S.fac.stadio = facForCap(TIERS[tier].minCap || 150) ; S.fac.campo = clamp(9 - tier, 1, 8); S.fac.giovanili = clamp(8 - tier, 1, 7);
  S.ticket = TIERS[tier].ticket;
  S.league = buildLeague(tier, d.group, [me.id]);
  S.fin.bal = niceMoney(TIERS[tier].owner * .35);
  initStaff(tier);
  startSeason(true);
  msg('Benvenuto, mister ' + S.manager + '!', `Il presidente della ${me.name} ti affida la prima squadra in ${S.league.cat} (girone ${S.league.group}). Obiettivo dichiarato: <b>${S.board.obj}</b>. Il mercato estivo è aperto: controlla rosa, staff e sponsor prima della prima giornata.`, 'board');
  return S;
}
function facForCap(cap) { let l = 1; while (l < 10 && STADIUM[l - 1] < cap) l++; return l; }
const STADIUM = [200, 400, 700, 1200, 2200, 4000, 8000, 16000, 28000, 45000];
const FAC_COST = { stadio: [0, 6000, 15000, 40000, 110000, 350000, 1.2e6, 4e6, 12e6, 30e6], campo: [0, 3000, 8000, 20000, 50000, 120000, 350000, 1e6, 3e6, 8e6], giovanili: [0, 2500, 7000, 18000, 45000, 110000, 300000, 900000, 2.5e6, 7e6] };
const FAC_WEEKS = [0, 2, 3, 4, 6, 8, 10, 14, 18, 24];
const FAC_LABEL = { stadio: 'Stadio', campo: 'Centro sportivo', giovanili: 'Settore giovanile' };

/* ---------------- Staff ---------------- */
const STAFF_ROLES = { vice: 'Allenatore in seconda', prep: 'Preparatore atletico', portieri: 'Preparatore portieri', medico: 'Medico / fisioterapista', osservatore: 'Osservatore', ds: 'Direttore sportivo', giovanili: 'Resp. settore giovanile' };
function staffWage(ab, tier) { return niceMoney(TIERS[tier].wage * .45 * Math.pow(1.13, ab - 8)); }
function genStaff(role, tier, abMean) {
  const ab = clamp(Math.round(abMean + gauss() * 2.5), 1, 20);
  return { id: 's' + (S.nextId++), role, name: genName(), ab, age: ri(28, 64), wage: staffWage(ab, tier), until: S.season + ri(0, 2) };
}
function initStaff(tier) {
  const m = clamp(11 - tier, 3, 13);
  S.staff = [genStaff('vice', tier, m - 1), genStaff('prep', tier, m - 2)];
  if (tier <= 5) S.staff.push(genStaff('medico', tier, m - 2));
  if (tier <= 3) S.staff.push(genStaff('osservatore', tier, m), genStaff('ds', tier, m), genStaff('portieri', tier, m));
  if (tier <= 2) S.staff.push(genStaff('giovanili', tier, m));
  refreshStaffMarket();
}
function refreshStaffMarket() {
  const t = S.league ? S.league.tier : 8, m = clamp(12 - t, 4, 15);
  S.staffMarket = [];
  for (const r of Object.keys(STAFF_ROLES)) for (let i = 0; i < 3; i++) S.staffMarket.push(genStaff(r, t, m - 2 + i * 2.5));
}
function staffAb(role) { const s = S.staff.filter(x => x.role === role); return s.length ? Math.max(...s.map(x => x.ab)) : 0; }
function hireStaff(id) {
  const s = S.staffMarket.find(x => x.id === id); if (!s) return 'Non disponibile';
  if (S.staff.filter(x => x.role === s.role).length >= (s.role === 'osservatore' ? 3 : 1)) return 'Hai già un ' + STAFF_ROLES[s.role].toLowerCase() + ': licenzialo prima.';
  s.until = S.season + 1;
  S.staff.push(s); S.staffMarket = S.staffMarket.filter(x => x !== s);
  msg('Nuovo membro dello staff', `${s.name} (${STAFF_ROLES[s.role]}, abilità ${s.ab}) firma fino al ${s.until + 1}.`, 'staff');
  return null;
}
function fireStaff(id) {
  const s = S.staff.find(x => x.id === id); if (!s) return;
  const sev = s.wage * 6; book('Buonuscita staff: ' + s.name, -sev, 'staff');
  S.staff = S.staff.filter(x => x !== s);
}

/* ---------------- Sponsor ---------------- */
const SY1 = 'Vel Tor Ar Lum Cor Mir Zen Nov Ter Sol Bri Fal Gal Ner Ori Pav Ros Sal Ven Ast'.split(' ');
const SY2 = 'itex onia ara eko ys alia ento ix ora uno ella ion iva ena ocia'.split(' ');
const SECT_LOCAL = ['Forno', 'Pasticceria', 'Autofficina', 'Ferramenta', 'Termoidraulica', 'Agriturismo', 'Bar', 'Pizzeria', 'Gommista', 'Edilizia', 'Impianti Elettrici', 'Ottica', 'Macelleria', 'Cantina', 'Frantoio', 'Trasporti', 'Studio Tecnico', 'Assicurazioni'];
const SECT_BIG = ['Assicurazioni', 'Logistica', 'Energia', 'Costruzioni', 'Tech', 'Food', 'Moda', 'Banca', 'Mobilità', 'Telecomunicazioni'];
const brand = () => pick(SY1) + pick(SY2);
function sponsorName(slot, tier) {
  if (slot === 'tecnico') return brand() + ' Sport';
  if (slot === 'cartelloni' || tier >= 5) return pick(SECT_LOCAL) + ' ' + brand();
  return brand() + ' ' + pick(SECT_BIG);
}
const SLOT_SHARE = { maglia: .5, tecnico: .18, cartelloni: .07, stadio: .35 };
const SLOT_LABEL = { maglia: 'Sponsor di maglia', tecnico: 'Sponsor tecnico', cartelloni: 'Cartellonistica', stadio: 'Naming stadio' };
function slotsMax() { return { maglia: 1, tecnico: 1, cartelloni: 4, stadio: S.league.tier <= 2 ? 1 : 0 }; }
function genSponsorOffers() {
  const t = S.league.tier, T = TIERS[t], me = myClub();
  const mult = (0.7 + me.rep / 120) * Math.sqrt(me.fans / T.fans);
  S.sponsorOffers = [];
  const max = slotsMax();
  for (const slot in max) {
    const used = S.sponsors.filter(s => s.slot === slot).length;
    if (used >= max[slot]) continue;
    const n = slot === 'cartelloni' ? Math.min(4, (max[slot] - used) + 2) : 3;
    for (let i = 0; i < n; i++) {
      const kind = pick(['fisso', 'fisso', 'bonus', 'promo']);
      const w = T.sponsor * SLOT_SHARE[slot] * mult * rf(.75, 1.25);
      const seasons = ri(1, 3);
      S.sponsorOffers.push({
        id: 'o' + (S.nextId++), slot, name: sponsorName(slot, t), kind, seasons,
        weekly: niceMoney(kind === 'fisso' ? w : w * .7), winBonus: kind === 'bonus' ? niceMoney(w * .9) : 0,
        promoBonus: kind === 'promo' ? niceMoney(w * 30) : 0, signing: niceMoney(w * rf(2, 5)),
      });
    }
  }
}
function acceptSponsor(id) {
  const o = S.sponsorOffers.find(x => x.id === id); if (!o) return 'Offerta non più valida';
  const max = slotsMax();
  if (S.sponsors.filter(s => s.slot === o.slot).length >= max[o.slot]) return 'Spazio già occupato';
  S.sponsors.push(Object.assign({}, o, { until: S.season + o.seasons - 1 }));
  book('Firma sponsor ' + o.name, o.signing, 'sponsor');
  S.sponsorOffers = S.sponsorOffers.filter(x => x.id !== id && !(x.slot === o.slot && S.sponsors.filter(s => s.slot === o.slot).length >= max[o.slot]));
  S.board.conf = clamp(S.board.conf + 1, 0, 100);
  return null;
}

/* ---------------- Utility stato ---------------- */
const myClub = () => S.clubs[S.clubId];
const squad = cid => (S.clubs[cid] || { squad: [] }).squad.map(id => S.players[id]).filter(Boolean);
function msg(title, body, kind, choices) { S.inbox.unshift({ id: 'm' + (S.nextId++), title, body, kind: kind || 'info', season: S.season, week: S.week, read: false, choices: choices || null, done: null }); if (S.inbox.length > 150) S.inbox.length = 150; }
function answerMsg(mid, idx) {
  const m = S.inbox.find(x => x.id === mid); if (!m || !m.choices || m.done != null) return null;
  const c = m.choices[idx]; if (!c) return null; m.done = idx; m.read = true; const fx = c.fx || {};
  const sq = squad(S.clubId);
  if (fx.teamMorale) for (const p of sq) p.morale = clamp(p.morale + fx.teamMorale, 0, 100);
  if (fx.conf) S.board.conf = clamp(S.board.conf + fx.conf, 0, 100);
  if (fx.coh) S.cohesion = clamp(S.cohesion + fx.coh, 0, 100);
  if (fx.harmony) { S.room = S.room || { harmony: 60 }; S.room.harmony = clamp(S.room.harmony + fx.harmony, 0, 100); }
  const p = fx.pid && S.players[fx.pid];
  if (p && p.club === S.clubId) {
    if (fx.pm) p.morale = clamp(p.morale + fx.pm, 0, 100);
    if (fx.promise) p.promise = S.week + fx.promise;
    if (fx.list) p.listed = true;
    if (fx.exercise && p.loan) p.loan.exercise = true;
  }
  if (fx.pressure) S.pressure = fx.pressure;
  return c.reply || 'Fatto.';
}
function pressConference(m) {
  const opp = m.userSide === 'h' ? m.a : m.h; const e = expectation(opp.cid);
  const q = e > .7 ? `Siete i favoriti contro ${opp.name}. Vi sentite obbligati a vincere?` : e < -.7 ? `Contro ${opp.name} partite sfavoriti. Che partita sarà?` : `Partita equilibrata contro ${opp.name}: cosa chiede alla squadra?`;
  msg('Conferenza stampa', q, 'press', [
    { label: e < -.7 ? 'Possiamo batterli, ci credo' : 'Vogliamo i tre punti, senza scuse', reply: 'La squadra ha sentito la tua fiducia: morale su, ma ora serve il risultato.', fx: { teamMorale: 5, conf: 1, pressure: 'win' } },
    { label: 'Massimo rispetto per l\'avversario', reply: 'Risposta prudente: nessuna pressione in più.', fx: { teamMorale: 1 } },
    { label: 'Pensiamo solo a noi stessi', reply: 'Il gruppo apprezza: un po\' più di intesa.', fx: { coh: 2 } },
  ]);
}
function book(desc, amount, cat) {
  amount = Math.round(amount);
  S.fin.bal += amount;
  S.fin.ledger.unshift({ season: S.season, week: S.week, desc, amount, cat });
  if (S.fin.ledger.length > 400) S.fin.ledger.length = 400;
  const f = S.fin.season; f[cat] = (f[cat] || 0) + amount;
}
function wageBill() { return squad(S.clubId).reduce((s, p) => s + (p.loan && p.loan.pct != null ? p.wage * p.loan.pct : p.wage), 0); }
function staffBill() { return S.staff.reduce((s, x) => s + x.wage, 0); }
function clubStrength(cid) {
  const ps = squad(cid).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 14);
  return ps.length ? ps.reduce((s, p) => s + p.ovr, 0) / ps.length : 0;
}
function canPlay(p) { return p && !p.inj && !p.susp; }

/* ---------------- Tattica e formazione ---------------- */
const FORMS = {
  '4-4-2': ['POR', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT'],
  '4-3-3': ['POR', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT', 'ATT'],
  '4-2-3-1': ['POR', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT'],
  '3-5-2': ['POR', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT'],
  '3-4-3': ['POR', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT', 'ATT'],
  '5-3-2': ['POR', 'DIF', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT'],
  '4-5-1': ['POR', 'DIF', 'DIF', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'CEN', 'CEN', 'ATT'],
};
const MENT = { 'molto difensiva': [.82, 1.16], difensiva: [.9, 1.08], equilibrata: [1, 1], offensiva: [1.1, .92], 'tutti all\'attacco': [1.22, .82] };
const PRESS = { bassa: { mid: .97, tire: .8, cards: .8 }, media: { mid: 1, tire: 1, cards: 1 }, alta: { mid: 1.06, tire: 1.25, cards: 1.3 } };
const TEMPO = { lento: .88, medio: 1, veloce: 1.12 };
/* ruoli specifici: k = attributi chiave, c = contributo [attacco, costruzione, difesa], d = descrizione */
const RT = {
  POR: { 'Portiere': { k: { por: .75, men: .15, fis: .1 }, c: [0, 0, 0], d: 'Resta tra i pali.' }, 'Portiere libero': { k: { por: .6, pas: .2, vel: .2 }, c: [0, .3, .05], d: 'Esce dall\'area e imposta il gioco.' } },
  DIF: {
    'Centrale': { k: { dif: .45, fis: .25, men: .15, vel: .15 }, c: [.08, .35, 1.12], d: 'Marca e chiude gli spazi in area.' },
    'Libero': { k: { dif: .35, pas: .3, vis: .2, men: .15 }, c: [.1, .75, .92], d: 'Difende e imposta dal basso.' },
    'Terzino': { k: { dif: .3, vel: .25, res: .25, pas: .2 }, c: [.25, .5, .92], d: 'Copre la fascia, sale con giudizio.' },
    'Terzino di spinta': { k: { vel: .3, res: .25, pas: .25, dif: .2 }, c: [.52, .58, .68], d: 'Spinge sempre, lascia spazio dietro.' },
  },
  CEN: {
    'Mediano': { k: { dif: .4, res: .25, fis: .2, men: .15 }, c: [.25, .85, .78], d: 'Recupera palloni e protegge la difesa.' },
    'Regista': { k: { pas: .4, vis: .35, tec: .25 }, c: [.45, 1.28, .35], d: 'Detta i tempi e lancia gli attaccanti.' },
    'Mezzala': { k: { res: .3, pas: .25, tec: .2, tir: .15, dif: .1 }, c: [.62, 1, .5], d: 'Corre box-to-box, si inserisce.' },
    'Trequartista': { k: { tec: .35, vis: .35, tir: .3 }, c: [1.02, .8, .12], d: 'Inventa tra le linee, non difende.' },
    'Esterno': { k: { vel: .4, res: .3, pas: .3 }, c: [.75, .8, .38], d: 'Cross e corsa sulla fascia.' },
  },
  ATT: {
    'Prima punta': { k: { tir: .45, fis: .35, men: .2 }, c: [1.15, .28, .1], d: 'Riferimento in area, finalizza.' },
    'Seconda punta': { k: { tec: .35, tir: .3, vis: .35 }, c: [.95, .6, .1], d: 'Gira attorno alla punta, rifinisce.' },
    'Ala': { k: { vel: .45, tec: .3, tir: .25 }, c: [1, .45, .16], d: 'Punta l\'uomo e accentra.' },
    'Falso nove': { k: { vis: .4, tec: .35, pas: .25 }, c: [.8, .82, .1], d: 'Arretra a cucire il gioco.' },
  },
};
const INSTR = { posizione: { label: 'Resta in posizione', att: .9, def: 1.1, tire: .9 }, normale: { label: 'Normale', att: 1, def: 1, tire: 1 }, libero: { label: 'Libero di inserirsi', att: 1.12, def: .88, tire: 1.12 } };
function defaultRT(form) {
  const roles = FORMS[form], g = {}; roles.forEach((r, i) => (g[r] = g[r] || []).push(i)); const out = [];
  out[g.POR[0]] = 'Portiere';
  const D = g.DIF || []; D.forEach((i, k) => out[i] = D.length >= 4 && (k === 0 || k === D.length - 1) ? (D.length === 5 ? 'Terzino di spinta' : 'Terzino') : 'Centrale');
  const C = g.CEN || [], cm = { '4-4-2': ['Esterno', 'Mediano', 'Mezzala', 'Esterno'], '4-3-3': ['Mezzala', 'Regista', 'Mezzala'], '4-2-3-1': ['Mediano', 'Regista', 'Esterno', 'Trequartista', 'Esterno'], '3-5-2': ['Esterno', 'Mezzala', 'Regista', 'Mezzala', 'Esterno'], '3-4-3': ['Esterno', 'Mediano', 'Regista', 'Esterno'], '5-3-2': ['Mezzala', 'Regista', 'Mezzala'], '4-5-1': ['Esterno', 'Mezzala', 'Mediano', 'Mezzala', 'Esterno'] }[form] || [];
  C.forEach((i, k) => out[i] = cm[k] || 'Mezzala');
  const A = g.ATT || []; A.forEach((i, k) => out[i] = A.length === 1 ? 'Prima punta' : A.length === 2 ? (k === 0 ? 'Prima punta' : 'Seconda punta') : (k === 1 ? 'Prima punta' : 'Ala'));
  return out;
}
function rtOvr(p, role, rt) { const d = (RT[role] || {})[rt]; if (!d) return roleOvr(p, role); let s = 0; for (const k in d.k) s += p.a[k] * d.k[k]; let o = s * 5; if (role !== p.role) o *= role === 'POR' || p.role === 'POR' ? .35 : .8; return o; }
function selScore(p, role) { return roleOvr(p, role) * (0.55 + 0.45 * p.fit / 100) * (p.morale > 40 ? 1 : .95); }
function autoPick(cid, form) {
  const roles = FORMS[form]; const avail = squad(cid).filter(canPlay);
  const used = new Set(), slots = [];
  // prima i ruoli naturali, ordinati per qualità
  const order = roles.map((r, i) => i).sort((a, b) => (roles[a] === 'POR' ? -1 : 0) - (roles[b] === 'POR' ? -1 : 0));
  for (const i of order) {
    const r = roles[i];
    let best = null, bs = -1;
    for (const p of avail) if (!used.has(p.id)) { const s = selScore(p, r) * (p.role === r ? 1 : .9); if (s > bs) { bs = s; best = p; } }
    slots[i] = best ? best.id : null; if (best) used.add(best.id);
  }
  const bench = avail.filter(p => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  // panchina: un portiere + i migliori
  const gk = bench.find(p => p.role === 'POR');
  const b = (gk ? [gk] : []).concat(bench.filter(p => p !== gk)).slice(0, 9).map(p => p.id);
  return { slots, bench: b };
}
function validateLineup() {
  const T = S.tactic, roles = FORMS[T.form];
  const mine = new Set(myClub().squad);
  if (T.auto || !T.slots || T.slots.length !== roles.length) { const a = autoPick(S.clubId, T.form); T.slots = a.slots; T.bench = a.bench; }
  else {
    // sostituisci indisponibili
    const used = new Set();
    T.slots = T.slots.map(id => (id && mine.has(id) && canPlay(S.players[id]) && !used.has(id) && used.add(id)) ? id : null);
    T.bench = (T.bench || []).filter(id => mine.has(id) && canPlay(S.players[id]) && !used.has(id));
    const avail = squad(S.clubId).filter(p => canPlay(p) && !used.has(p.id) && !T.bench.includes(p.id));
    T.slots = T.slots.map((id, i) => { if (id) return id; const r = roles[i]; const pool = avail.concat(T.bench.map(x => S.players[x])).filter(p => !used.has(p.id)); if (!pool.length) return null; const b = pool.sort((x, y) => selScore(y, r) - selScore(x, r))[0]; used.add(b.id); T.bench = T.bench.filter(x => x !== b.id); return b.id; });
    if (T.bench.length < 9) { for (const p of squad(S.clubId).filter(p => canPlay(p) && !used.has(p.id) && !T.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr)) { if (T.bench.length >= 9) break; T.bench.push(p.id); } }
  }
  if (!T.captain || !T.slots.includes(T.captain)) T.captain = T.slots.filter(Boolean).map(id => S.players[id]).sort((a, b) => (b.a.men + b.age / 4) - (a.a.men + a.age / 4))[0]?.id || null;
  if (!T.pk || !T.slots.includes(T.pk)) T.pk = T.slots.filter(Boolean).map(id => S.players[id]).sort((a, b) => (b.a.tir + b.a.men) - (a.a.tir + a.a.men))[0]?.id || null;
}

/* ---------------- Motore partita ---------------- */
function teamSetup(cid, isUser) {
  const c = S.clubs[cid];
  let form, ment, press, tempo, slots, bench;
  if (isUser) { validateLineup(); ({ form, ment, press, tempo } = S.tactic); slots = S.tactic.slots.slice(); bench = S.tactic.bench.slice(); }
  else {
    form = c.form || (c.form = pick(['4-4-2', '4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2']));
    const a = autoPick(cid, form); slots = a.slots; bench = a.bench; ment = 'equilibrata'; press = pick(['bassa', 'media', 'media', 'alta']); tempo = 'medio';
  }
  const roles = FORMS[form];
  let rts = defaultRT(form), ins = [];
  if (isUser) { const T = S.tactic; if (!T.rt || T.rt.length !== roles.length || T.rtForm !== form) { T.rt = defaultRT(form); T.rtForm = form; T.ins = roles.map(() => 'normale'); } rts = T.rt; ins = T.ins || []; }
  const on = slots.map((id, i) => id ? { id, role: roles[i], rt: rts[i], ins: ins[i] || 'normale' } : null).filter(Boolean);
  const setp = isUser ? { corner: S.tactic.corner, fk: S.tactic.fk } : {};
  return { cid, name: c.name, form, ment, press, tempo, on, bench: bench.slice(0, 9), subs: 0, goals: 0, shots: 0, sot: 0, poss: 0, yc: 0, rc: 0, corners: 0, fouls: 0, user: !!isUser, autoSubs: isUser ? S.tactic.autoSubs !== false : true, setp };
}
function createMatch(hid, aid, ctx) {
  const m = { h: teamSetup(hid, hid === S.clubId), a: teamSetup(aid, aid === S.clubId), min: 0, ev: [], ctx: ctx || {}, done: false, pl: {}, ht: false, pens: null };
  for (const side of ['h', 'a']) for (const x of m[side].on.concat(m[side].bench.map(id => ({ id, role: S.players[id].role })))) m.pl[x.id] = { cond: S.players[x.id].fit, r: 6.3, g: 0, as: 0, side, played: m[side].on.some(o => o.id === x.id), yc: 0, rc: false, inj: false, start: m[side].on.some(o => o.id === x.id) ? 0 : null, end: null };
  m.coh = { h: hid === S.clubId ? S.cohesion : 75, a: aid === S.clubId ? S.cohesion : 75 };
  rate(m);
  return m;
}
function eff(m, x) { const p = S.players[x.id], st = m.pl[x.id]; return { p, k: (0.62 + 0.38 * st.cond / 100) * (0.9 + 0.2 * p.morale / 100) }; }
function rate(m) {
  for (const side of ['h', 'a']) {
    const T = m[side]; let att = 0, mid = 0, def = 0, gk = 5;
    for (const x of T.on) {
      const { p, k } = eff(m, x); const a = p.a; const pen = x.role === p.role ? 1 : (x.role === 'POR' || p.role === 'POR') ? .35 : .82;
      const d = (RT[x.role] || {})[x.rt] || null;
      if (x.role === 'POR') { gk = (a.por * .75 + a.men * .15 + a.fis * .1) * k * pen; if (d && d.c[1]) mid += (a.pas * .5 + a.vel * .5) * d.c[1] * k; continue; }
      const rf_ = d ? d.c : { DIF: [.15, .45, 1], CEN: [.55, 1, .5], ATT: [1, .4, .12] }[x.role];
      const suit = d ? clamp(rtOvr(p, x.role, x.rt) / Math.max(1, roleOvr(p, x.role)), .85, 1.15) : 1;
      const I = INSTR[x.ins] || INSTR.normale;
      att += (a.tir * .35 + a.tec * .25 + a.vel * .2 + a.vis * .2) * rf_[0] * k * pen * suit * I.att;
      mid += (a.pas * .35 + a.vis * .25 + a.tec * .2 + a.res * .2) * rf_[1] * k * pen * suit;
      def += (a.dif * .45 + a.fis * .2 + a.vel * .15 + a.men * .2) * rf_[2] * k * pen * suit * I.def;
    }
    const n = T.on.length; const short = n < 11 ? Math.pow(n / 11, 1.4) : 1;
    const [ma, md] = MENT[T.ment]; const pr = PRESS[T.press];
    const coh = 0.9 + 0.1 * m.coh[side] / 100;
    const home = side === 'h' && !m.ctx.neutral ? 1.05 : 1;
    const vice = T.user ? 1 + staffAb('vice') * .0025 : 1 + (TIERS[S.league.tier].amateur ? .01 : .025);
    const harm = T.user ? .96 + .08 * ((S.room && S.room.harmony) != null ? S.room.harmony : 60) / 100 : 1;
    const k = coh * home * vice * short * harm;
    T.r = { att: att * 1.16 * ma * k, mid: mid * pr.mid * k, def: def * md * k, gk: gk * k * (home > 1 ? 1.02 : 1) };
  }
}
const pctEv = (m, side, txt, type, extra) => m.ev.push(Object.assign({ min: m.min, side, txt, type }, extra || {}));
function shooter(T) { return wpick(T.on.filter(x => x.role !== 'POR'), x => { const p = S.players[x.id]; const d = (RT[x.role] || {})[x.rt]; const w = d ? .3 + d.c[0] * 2.1 : ({ ATT: 2.4, CEN: 1.5, DIF: .45 }[x.role]); return Math.pow(p.a.tir, 1.25) * w * ((INSTR[x.ins] || INSTR.normale).att); }); }
function assister(T, ex) { const c = T.on.filter(x => x.id !== ex && x.role !== 'POR'); return c.length ? wpick(c, x => { const p = S.players[x.id]; return Math.pow(p.a.pas + p.a.vis, 1.3) * ({ ATT: 1.2, CEN: 1.6, DIF: .5 }[x.role]); }) : null; }
const sn = id => S.players[id].name.split(' ').slice(-1)[0];
function step(m) {
  if (m.done) return;
  m.min++;
  const H = m.h, A = m.a;
  if (m.min % 5 === 0) rate(m);
  // possesso
  const pH = Math.pow(H.r.mid, 1.25) / (Math.pow(H.r.mid, 1.25) + Math.pow(A.r.mid, 1.25));
  H.poss += pH; A.poss += 1 - pH;
  const tempo = (TEMPO[H.tempo] + TEMPO[A.tempo]) / 2;
  for (const [T, O, side, p] of [[H, A, 'h', pH], [A, H, 'a', 1 - pH]]) {
    const ratio = T.r.att / Math.max(1, O.r.def);
    const chanceP = 0.112 * p * 2 * Math.pow(ratio, .75) * tempo;
    if (rnd() < chanceP) {
      T.shots++;
      const s = shooter(T); const sp = S.players[s.id];
      const gkp = Math.max(2, O.r.gk);
      let xg = 0.08 * Math.pow(ratio, .9) * Math.pow(sp.a.tir / gkp, .55) * (0.75 + 0.5 * m.pl[s.id].cond / 100);
      xg = clamp(xg, .02, .55);
      const onT = rnd() < 0.36 + xg * .8;
      if (onT) { T.sot++; m.pl[s.id].r += .12; }
      if (onT && rnd() < xg / (0.36 + xg * .8) * 1.05) {
        T.goals++; m.pl[s.id].g++; m.pl[s.id].r += 1.05;
        let as = null; if (rnd() < .72) { const a_ = assister(T, s.id); if (a_) { as = a_.id; m.pl[as].as++; m.pl[as].r += .6; } }
        for (const x of O.on) if (x.role === 'DIF' || x.role === 'POR') m.pl[x.id].r -= x.role === 'POR' ? .35 : .2;
        pctEv(m, side, `GOL! ${sp.name}` + (as ? ` (assist ${S.players[as].name})` : ''), 'goal', { pid: s.id, as });
      } else if (onT) {
        const g = O.on.find(x => x.role === 'POR'); if (g) m.pl[g.id].r += .14;
        if (rnd() < .35) pctEv(m, side, pick([`Parata su conclusione di ${sn(s.id)}`, `${sn(s.id)} calcia, il portiere ci arriva`, `Tiro centrale di ${sn(s.id)}, bloccato`]), 'save');
        if (rnd() < .3) { T.corners++; pctEv(m, side, `Calcio d'angolo per ${T.name}`, 'corner'); setPiece(m, T, O, side, 'corner'); }
      } else if (rnd() < .2) pctEv(m, side, pick([`${sn(s.id)} calcia alto`, `Conclusione di ${sn(s.id)} a lato`, `Occasione sprecata da ${sn(s.id)}`]), 'miss');
    }
    // falli e cartellini
    if (rnd() < .2) { T.fouls++; const pr = PRESS[T.press]; if (rnd() < .07) setPiece(m, O, T, side === 'h' ? 'a' : 'h', 'fk');
      if (rnd() < .19 * pr.cards) { const x = wpick(T.on, y => ({ DIF: 3, CEN: 2, ATT: 1, POR: .2 }[y.role]) * (1.5 - ((S.players[y.id].pers || {}).tem || 10) * .05)); const st = m.pl[x.id];
        if (rnd() < .025 * pr.cards || st.yc === 1) { if (st.yc === 1) { st.yc = 2; } st.rc = true; T.rc++; st.r -= 1.5; T.on = T.on.filter(y => y !== x); st.end = m.min; pctEv(m, side, `ESPULSO ${S.players[x.id].name}!` + (st.yc === 2 ? ' (doppia ammonizione)' : ''), 'red', { pid: x.id }); rate(m); }
        else { st.yc = 1; T.yc++; st.r -= .3; pctEv(m, side, `Ammonito ${S.players[x.id].name}`, 'yellow', { pid: x.id }); }
      } }
    // infortuni
    if (rnd() < .0011 * (T.press === 'alta' ? 1.3 : 1)) { const x = pick(T.on); const st = m.pl[x.id]; st.inj = true; pctEv(m, side, `Infortunio per ${S.players[x.id].name}`, 'inj', { pid: x.id }); forcedSub(m, side, x); }
    // fatica
    const tire = PRESS[T.press].tire;
    for (const x of T.on) { const st = m.pl[x.id], p = S.players[x.id]; st.cond = Math.max(5, st.cond - (x.role === 'POR' ? .03 : (0.2 - p.a.res * .0065) * tire)); }
  }
  // cambi automatici (AI o utente in auto)
  if (m.min >= 58 && m.min % 6 === 0) for (const side of ['h', 'a']) if (m[side].autoSubs && !m[side].manual) autoSub(m, side);
  if (m.min === 45) { m.ht = true; pctEv(m, '', `Fine primo tempo: ${H.name} ${H.goals}-${A.goals} ${A.name}`, 'ht'); }
  if (m.min >= 90 + (m.extra || 0)) finish(m);
}
function setPiece(m, T, O, side, kind) {
  const outf = T.on.filter(x => x.role !== 'POR'); if (!outf.length) return;
  const takerId = (kind === 'corner' ? T.setp && T.setp.corner : T.setp && T.setp.fk);
  const taker = outf.find(x => x.id === takerId) || outf.slice().sort((a, b) => (S.players[b.id].a.pas + S.players[b.id].a.tec) - (S.players[a.id].a.pas + S.players[a.id].a.tec))[0];
  const tp = S.players[taker.id]; const gkp = Math.max(2, O.r.gk);
  if (kind === 'fk') {
    const pG = clamp(.02 + (tp.a.tir + tp.a.tec - gkp * 1.6) * .004, .006, .09);
    T.shots++;
    if (rnd() < pG) { T.goals++; T.sot++; m.pl[tp.id].g++; m.pl[tp.id].r += 1.2; pctEv(m, side, `GOL! Punizione perfetta di ${tp.name}`, 'goal', { pid: tp.id }); for (const x of O.on) if (x.role === 'POR') m.pl[x.id].r -= .3; }
    else pctEv(m, side, `Punizione di ${sn(tp.id)}: ${rnd() < .5 ? 'sulla barriera' : 'para il portiere'}`, 'save');
    return;
  }
  const head = outf.filter(x => x.id !== taker.id).sort((a, b) => (S.players[b.id].a.fis + S.players[b.id].a.dif * .5) - (S.players[a.id].a.fis + S.players[a.id].a.dif * .5))[0]; if (!head) return;
  const hp = S.players[head.id]; const odef = O.on.filter(x => x.role === 'DIF').reduce((a, x) => a + S.players[x.id].a.fis, 0) / Math.max(1, O.on.filter(x => x.role === 'DIF').length);
  const pG = clamp(.022 * (tp.a.pas / 10) * Math.pow((hp.a.fis + 1) / (odef + 1), 1.2), .01, .12);
  if (rnd() < pG) { T.goals++; T.sot++; T.shots++; m.pl[hp.id].g++; m.pl[hp.id].r += 1.05; m.pl[tp.id].as++; m.pl[tp.id].r += .5; pctEv(m, side, `GOL! ${hp.name} di testa su corner di ${tp.name}`, 'goal', { pid: hp.id, as: tp.id }); }
}
function forcedSub(m, side, x) {
  const T = m[side]; T.on = T.on.filter(y => y !== x); m.pl[x.id].end = m.min;
  if (T.subs < 5 && T.bench.length) {
    const cand = T.bench.map(id => S.players[id]).filter(p => !m.pl[p.id].rc);
    const best = cand.sort((a, b) => (b.role === x.role) - (a.role === x.role) || b.ovr - a.ovr)[0];
    if (best) doSub(m, side, null, best.id, x.role, true);
  }
  rate(m);
}
function doSub(m, side, outId, inId, role, silentOut) {
  const T = m[side]; if (T.subs >= 5) return 'Hai già fatto 5 cambi';
  if (!T.bench.includes(inId)) return 'Giocatore non in panchina';
  let rt = null, ins = 'normale';
  if (outId) { const x = T.on.find(y => y.id === outId); if (!x) return 'Giocatore non in campo'; role = role || x.role; rt = x.rt; ins = x.ins; T.on = T.on.filter(y => y !== x); m.pl[outId].end = m.min; }
  T.bench = T.bench.filter(id => id !== inId); T.subs++;
  T.on.push({ id: inId, role: role || S.players[inId].role, rt, ins }); const st = m.pl[inId]; st.played = true; st.start = m.min;
  pctEv(m, side, `Cambio: entra ${S.players[inId].name}` + (outId ? `, esce ${S.players[outId].name}` : ''), 'sub');
  rate(m); return null;
}
function autoSub(m, side) {
  const T = m[side]; if (T.subs >= 5 || !T.bench.length) return;
  const tired = T.on.filter(x => x.role !== 'POR').map(x => ({ x, c: m.pl[x.id].cond })).sort((a, b) => a.c - b.c)[0];
  if (!tired || tired.c > 72) return;
  const losing = T.goals < m[side === 'h' ? 'a' : 'h'].goals;
  const bench = T.bench.map(id => S.players[id]).filter(p => p.role !== 'POR');
  const want = losing && m.min > 65 ? 'ATT' : tired.x.role;
  const best = bench.sort((a, b) => (b.role === want) - (a.role === want) || b.ovr - a.ovr)[0];
  if (best && best.ovr > S.players[tired.x.id].ovr * .82) doSub(m, side, tired.x.id, best.id, tired.x.role);
}
function penalties(m) {
  let h = 0, a = 0; const shooterQ = T => T.on.map(x => S.players[x.id]).sort((x, y) => y.a.tir - x.a.tir);
  const hq = shooterQ(m.h), aq = shooterQ(m.a);
  const gkH = m.h.r.gk, gkA = m.a.r.gk;
  const kick = (p, gk) => rnd() < clamp(.72 + (p.a.tir + p.a.men - gk * 2) * .008, .55, .9);
  for (let i = 0; i < 5; i++) { if (kick(hq[i % hq.length], gkA)) h++; if (kick(aq[i % aq.length], gkH)) a++; }
  let i = 5; while (h === a && i < 30) { if (kick(hq[i % hq.length], gkA)) h++; if (kick(aq[i % aq.length], gkH)) a++; i++; }
  return { h, a };
}
function finish(m) {
  m.done = true;
  const H = m.h, A = m.a;
  const tot = H.poss + A.poss || 1; H.possPct = Math.round(H.poss / tot * 100); A.possPct = 100 - H.possPct;
  if (m.ctx.ko && H.goals === A.goals) {
    if (m.ctx.seedWins) { m.winner = m.ctx.seedWins; pctEv(m, '', `Parità: passa ${S.clubs[m.winner].name} per il miglior piazzamento in campionato`, 'end'); }
    else { m.pens = penalties(m); m.winner = m.pens.h > m.pens.a ? H.cid : A.cid; pctEv(m, '', `Rigori: ${m.pens.h}-${m.pens.a}`, 'end'); }
  } else m.winner = H.goals > A.goals ? H.cid : A.goals > H.goals ? A.cid : null;
  for (const id in m.pl) {
    const st = m.pl[id]; if (!st.played) continue;
    const mine = m[st.side], opp = m[st.side === 'h' ? 'a' : 'h'];
    st.r += mine.goals > opp.goals ? .35 : mine.goals < opp.goals ? -.3 : 0;
    if (opp.goals === 0) { const p = S.players[id]; const role = (mine.on.find(x => x.id === id) || {}).role || p.role; if (role === 'POR' || role === 'DIF') st.r += .5; }
    st.r += gauss() * .35; st.r = clamp(st.r, 3.5, 10);
  }
  const best = Object.entries(m.pl).filter(([, s]) => s.played).sort((a, b) => b[1].r - a[1].r)[0];
  m.mom = best ? best[0] : null;
  pctEv(m, '', `Fischio finale: ${H.name} ${H.goals}-${A.goals} ${A.name}`, 'end');
}
function simulate(m) { while (!m.done) step(m); return m; }
function quickResult(hid, aid, ctx) { const m = createMatch(hid, aid, ctx); simulate(m); applyMatch(m); return m; }
function applyMatch(m) {
  // aggiorna giocatori: forma, statistiche, infortuni, squalifiche
  const comp = m.ctx.comp || 'lg';
  for (const id in m.pl) {
    const st = m.pl[id], p = S.players[id]; if (!p) continue;
    if (st.played) {
      p.fit = Math.round(st.cond); p.lastPlayed = S.week;
      if (comp !== 'fr') { p.st.app++; p.st.g += st.g; p.st.as += st.as; p.st.r += st.r; p.car.app++; p.car.g += st.g; p.car.as += st.as; }
      p.form.push(+st.r.toFixed(1)); if (p.form.length > 5) p.form.shift();
      p.xp++;
      if (st.yc && !st.rc && comp === 'lg') { p.yc++; p.st.yc++; if (p.yc >= 5) { p.yc = 0; p.susp++; } }
      if (st.rc) { p.susp += st.yc === 2 ? 1 : ri(1, 3); p.st.rc++; }
      if (st.inj) { const sev = rnd(); p.inj = Math.max(1, Math.round((sev < .6 ? ri(1, 2) : sev < .9 ? ri(3, 6) : ri(8, 20)) * (p.club === S.clubId ? (1 - staffAb('medico') * .025) : 1))); p.injName = sev < .6 ? pick(['Contrattura', 'Distorsione alla caviglia', 'Botta al ginocchio', 'Affaticamento muscolare']) : sev < .9 ? pick(['Stiramento', 'Lesione muscolare', 'Distorsione al ginocchio']) : pick(['Lesione al legamento', 'Frattura al piede', 'Lesione al menisco']); }
      if (m.mom === id && comp !== 'fr') p.st.mom++;
      // morale
      const side = st.side; const res = m[side].goals - m[side === 'h' ? 'a' : 'h'].goals;
      p.morale = clamp(p.morale + (res > 0 ? 4 : res < 0 ? -3 : 0) + (st.r - 6.5) * 2, 5, 100);
    } else if (p.club === S.clubId) {
      // in panchina senza giocare
    }
  }
  if (comp === 'lg') for (const side of ['h', 'a']) { const cid = m[side].cid; for (const p of squad(cid)) if (!m.pl[p.id] && p.susp > 0) p.susp--; }
  if (comp === 'lg') for (const side of ['h', 'a']) for (const id of m[side].bench) { const p = S.players[id]; if (p && !m.pl[id].played && p.susp > 0) p.susp--; }
}
function userPlayersNotPlayed(m) { return squad(S.clubId).filter(p => !m.pl[p.id] || !m.pl[p.id].played); }

/* ---------------- Turno settimanale ---------------- */
function beginTurn() {
  const e = nextEvent(); if (!e || S.gameOver || S.pendingEnd || e.t === 'end') return null;
  if (S.begun !== S.ci) {
    S.begun = S.ci;
    const weekly = e.t === 'lg' || e.t === 'pre';
    if (weekly) { S.week++; aiRecover(); weeklyTraining(); weeklyFinance(e); weeklyBoard(); weeklyMarket(); weeklyScouting(); weeklyBuild(); if (e.t === 'lg' && e.i === S.winter[0]) contractWarning(); if (e.t === 'lg' && e.i % 8 === 7) refreshStaffMarket(); }
    else halfRecovery();
    if (S.gameOver) return null;
  }
  const turn = { e, userMatch: null, info: '' };
  if (e.t === 'lg') {
    const fx = S.league.fixtures[e.i]; const f = fx.find(([h, a]) => h === S.clubId || a === S.clubId);
    if (f) turn.userMatch = createMatch(f[0], f[1], { comp: 'lg', round: e.i, label: `${S.league.cat} · ${e.i + 1}ª giornata` });
  } else if (e.t === 'cup') {
    const C = S.cup; const ids = C.rounds[e.i] || [];
    if (C.out == null && ids.includes(S.clubId)) {
      const k = ids.indexOf(S.clubId); const o = k % 2 ? ids[k - 1] : ids[k + 1];
      const [h, a] = k % 2 ? [o, S.clubId] : [S.clubId, o];
      turn.userMatch = createMatch(h, a, { comp: 'cup', ko: true, label: `${C.name} · ${CUP_ROUND[e.i]}`, neutral: e.i === 3 });
    }
  } else if (e.t === 'po') {
    const P = S.playoff; const pair = P.cur.find(pr => pr.includes(S.clubId));
    if (pair) turn.userMatch = createMatch(pair[0], pair[1], { comp: 'po', ko: true, seedWins: pair[0], label: `Playoff · ${P.stage === 0 ? 'Semifinale' : 'Finale'}` });
  } else if (e.t === 'pre') {
    const pool = Object.values(S.clubs).filter(c => !c.user && S.league.teams.includes(c.id));
    turn.userMatch = createMatch(S.clubId, pick(pool).id, { comp: 'fr', label: `Amichevole precampionato ${e.i + 1}/4` });
  }
  if (turn.userMatch) turn.userMatch.userSide = turn.userMatch.h.cid === S.clubId ? 'h' : 'a';
  worldWeek(e);
  if (e.t === 'lg' && e.i === S.league.fixtures.length - 2) for (const p of squad(S.clubId)) if (p.loan && p.loan.opt && !p.loan.asked) { p.loan.asked = true; msg('Diritto di riscatto: ' + p.name, `A fine stagione ${p.name} torna al suo club, a meno che non lo riscatti per ${eur(p.loan.opt)}.`, 'transfer', [{ label: `Riscatta per ${eur(p.loan.opt)}`, reply: 'Riscatto confermato: si chiude a fine stagione se hai i fondi.', fx: { pid: p.id, exercise: true } }, { label: 'Lascialo tornare', reply: 'Tornerà al suo club a fine stagione.' }]); }
  if (turn.userMatch && e.t === 'lg' && S.lastPress !== S.ci && rnd() < .3) { S.lastPress = S.ci; pressConference(turn.userMatch); }
  return turn;
}
function endTurn(turn) {
  const e = turn.e, um = turn.userMatch;
  if (um && !um.done) simulate(um);
  if (um) { applyMatch(um); S.lastMatch = summarize(um); afterUserMatch(um); }
  if (e.t === 'lg') {
    const res = [];
    for (const [h, a] of S.league.fixtures[e.i]) {
      if (um && um.h.cid === h && um.a.cid === a) { res.push({ h, a, hg: um.h.goals, ag: um.a.goals }); continue; }
      const m = quickResult(h, a, { comp: 'lg' }); res.push({ h, a, hg: m.h.goals, ag: m.a.goals, sc: scorers(m) });
    }
    S.league.results[e.i] = res; S.league.round = e.i + 1;
    if (um) res.find(r => r.h === um.h.cid).sc = scorers(um);
    juniorRound();
  } else if (e.t === 'cup') cupRound(e.i, um);
  else if (e.t === 'po') playoffStage(um);
  else if (e.t === 'pre') { S.cohesion = clamp(S.cohesion + 4, 0, 100); if (um) { const g = gate(um, .35); if (g) book('Incasso amichevole', g, 'biglietti'); } }
  S.ci++;
  const nx = nextEvent();
  if (nx && nx.t === 'end') seasonEnd();
  return turn;
}
function prepareUserMatch(turn) { const m = turn.userMatch; if (!m || m.min > 0) return m; turn.userMatch = createMatch(m.h.cid, m.a.cid, m.ctx); turn.userMatch.userSide = m.userSide; return turn.userMatch; }
function contractWarning() {
  const exp = squad(S.clubId).filter(p => !p.loan && p.until <= S.season);
  if (exp.length) msg('Contratti in scadenza', 'A fine stagione si liberano: ' + exp.map(p => `<b>${p.name}</b>`).join(', ') + '. Rinnovali dalla scheda giocatore o li perderai a parametro zero.', 'club');
}
function scorers(m) { return m.ev.filter(x => x.type === 'goal').map(x => ({ min: x.min, side: x.side, n: S.players[x.pid].name })); }
function summarize(m) {
  return { label: m.ctx.label, h: m.h.name, a: m.a.name, hid: m.h.cid, aid: m.a.cid, hg: m.h.goals, ag: m.a.goals, pens: m.pens, ev: m.ev.filter(x => ['goal', 'red', 'inj', 'end'].includes(x.type)).map(x => ({ min: x.min, side: x.side, txt: x.txt, type: x.type })),
    st: ['h', 'a'].map(s => ({ poss: m[s].possPct, shots: m[s].shots, sot: m[s].sot, yc: m[s].yc, rc: m[s].rc })), mom: m.mom ? S.players[m.mom].name : '',
    ratings: Object.entries(m.pl).filter(([, s]) => s.played && s.side === m.userSide).map(([id, s]) => ({ id, n: S.players[id].name, r: +s.r.toFixed(1), g: s.g, as: s.as })).sort((a, b) => b.r - a.r) };
}
function gate(m, mult) {
  if (m.h.cid !== S.clubId) return 0;
  const T = TIERS[S.league.tier], me = myClub();
  const tb = table(S.league); const pos = tb.findIndex(r => r.id === S.clubId) + 1; const opos = tb.findIndex(r => r.id === m.a.cid) + 1;
  const priceF = clamp(1.25 - (S.ticket / T.ticket - 1) * .7, .25, 1.6);
  const formF = clamp(1 + (tb.length / 2 - pos) * .025, .7, 1.3);
  const big = opos && opos <= 3 ? 1.2 : 1; const cupF = m.ctx.comp === 'cup' ? 1.1 + (m.ctx.round || 0) * .1 : m.ctx.comp === 'po' ? 1.6 : 1;
  const att = Math.min(STADIUM[S.fac.stadio - 1], Math.round(me.fans * priceF * formF * big * cupF * (mult || 1) * rf(.85, 1.1)));
  m.att = att;
  return att * S.ticket;
}
function afterUserMatch(m) {
  const me = m.userSide, opp = me === 'h' ? 'a' : 'h';
  const gd = m[me].goals - m[opp].goals; const comp = m.ctx.comp;
  if (comp !== 'fr') {
    const c = myClub(); c.fans = Math.max(30, Math.round(c.fans * (1 + (gd > 0 ? .008 : gd < 0 ? -.005 : .001))));
    if (m.h.cid === S.clubId) { const g = gate(m); if (g) book(`Incasso ${m.ctx.label} (${m.att} spettatori)`, g, 'biglietti'); }
    else book('Trasferta ' + m.h.name, -TIERS[S.league.tier].travel, 'trasferte');
    // bonus sponsor a vittoria
    if (gd > 0) for (const s of S.sponsors) if (s.winBonus) book('Bonus vittoria ' + s.name, s.winBonus, 'sponsor');
    // premi partita (dilettanti: rimborso premio partita)
    const exp = expectation(m[opp].cid);
    S.board.conf = clamp(S.board.conf + (gd > 0 ? 1.4 : gd < 0 ? -1.6 : 0) * (comp === 'lg' ? 1 : .6) + exp * (gd > 0 ? -.5 : gd < 0 ? .7 : .2), 0, 100);
    // morale di chi non gioca
    for (const p of userPlayersNotPlayed(m)) if (!p.inj && p.ovr >= clubStrength(S.clubId) - 2) p.morale = clamp(p.morale - 2.5, 5, 100);
    S.cohesion = clamp(S.cohesion + .8, 0, 100);
  }
  if (comp === 'lg' && S.pressure === 'win') { S.pressure = null; if (gd > 0) { S.board.conf = clamp(S.board.conf + 2, 0, 100); } else { S.board.conf = clamp(S.board.conf - 4, 0, 100); for (const p of squad(S.clubId)) p.morale = clamp(p.morale - 4, 0, 100); msg('La stampa ricorda le tue parole', 'Avevi promesso i tre punti: il presidente non ha gradito il risultato.', 'press'); } }
  if (comp === 'lg') { const f = (table(S.league).find(r => r.id === S.clubId) || { form: [] }).form.slice(-3).join('');
    if (f === 'VVV' && gd > 0) { myClub().fans = Math.round(myClub().fans * 1.03); msg('Tifosi in festa', 'Tre vittorie di fila: in città si parla solo della squadra e allo stadio arriva più gente.', 'fans'); }
    if (f === 'SSS' && gd < 0) { S.board.conf = clamp(S.board.conf - 2, 0, 100); msg('Contestazione', 'Tre sconfitte consecutive: striscione dei tifosi fuori dal campo. Il presidente chiede una reazione.', 'fans'); } }
  const res = gd > 0 ? 'Vittoria' : gd < 0 ? 'Sconfitta' : 'Pareggio';
  if (comp === 'cup' || comp === 'po') msg(`${res}: ${m.h.name} ${m.h.goals}-${m.a.goals} ${m.a.name}`, `${m.ctx.label}${m.pens ? ` · rigori ${m.pens.h}-${m.pens.a}` : ''}. Migliore in campo: <b>${m.mom ? S.players[m.mom].name : '-'}</b>.`, 'match');
  for (const id in m.pl) { const st = m.pl[id]; const p = S.players[id]; if (st.side === me && p.inj >= 2 && st.inj) msg('Infortunio: ' + p.name, `${p.injName}. Stop previsto: ${p.inj} settiman${p.inj > 1 ? 'e' : 'a'}.`, 'med'); if (st.side === me && st.rc) msg('Squalifica: ' + p.name, `Espulso, salterà ${p.susp} partit${p.susp > 1 ? 'e' : 'a'}.`, 'med'); }
}
function expectation(oppId) { // >0 se eravamo favoriti
  const a = clubStrength(S.clubId), b = clubStrength(oppId); return clamp((a - b) / 4, -2, 2);
}
function halfRecovery() { for (const p of Object.values(S.players)) if (p.club === S.clubId) p.fit = clamp(p.fit + 12 + staffAb('prep') * .4, 0, 100); aiRecover(.5); }
function aiRecover(k = 1) {
  for (const cid of S.league.teams) { if (cid === S.clubId) continue; for (const p of squad(cid)) { p.fit = clamp(p.fit + 30 * k, 0, 100); if (k === 1 && p.inj) p.inj--; } }
}

/* ---------------- Allenamento ---------------- */
const FOCUS = {
  equilibrato: { label: 'Equilibrato', attrs: ATTRS.filter(a => a !== 'por'), mult: 1 },
  fisico: { label: 'Fisico', attrs: ['vel', 'res', 'fis'], mult: 1.7 },
  tecnico: { label: 'Tecnico', attrs: ['tec', 'pas', 'tir'], mult: 1.7 },
  tattico: { label: 'Tattico', attrs: ['dif', 'vis', 'men'], mult: 1.4, coh: 3 },
  attacco: { label: 'Fase offensiva', attrs: ['tir', 'tec', 'vis'], mult: 1.6 },
  difesa: { label: 'Fase difensiva', attrs: ['dif', 'fis', 'men'], mult: 1.6 },
  riposo: { label: 'Riposo / scarico', attrs: [], mult: 0 },
};
const INTENSITY = { bassa: { dev: .7, rec: 38, inj: .0015 }, media: { dev: 1, rec: 30, inj: .004 }, alta: { dev: 1.35, rec: 20, inj: .009 } };
function weeklyTraining() {
  const F = FOCUS[S.training.focus], I = S.training.focus === 'riposo' ? { dev: 0, rec: 50, inj: 0 } : INTENSITY[S.training.intensity];
  const coach = staffAb('vice'), prep = staffAb('prep'), gkc = staffAb('portieri');
  const quality = .55 + coach * .025 + prep * .012 + S.fac.campo * .045;
  S.cohesion = clamp(S.cohesion + (F.coh || 1) * (S.training.focus === 'riposo' ? 0 : 1), 0, 100);
  const report = [];
  for (const p of squad(S.clubId)) {
    if (p.inj) { p.inj--; if (!p.inj) { p.injName = ''; report.push(p.name + ' è guarito'); } continue; }
    p.fit = clamp(p.fit + I.rec + prep * .6, 0, 100);
    if (S.training.focus === 'riposo') p.morale = clamp(p.morale + 1.5, 0, 100);
    if (rnd() < I.inj * (1 - prep * .025)) { p.inj = ri(1, 3); p.injName = pick(['Contrattura in allenamento', 'Risentimento muscolare', 'Distorsione in allenamento']); msg('Infortunio in allenamento: ' + p.name, `${p.injName}, ${p.inj} settiman${p.inj > 1 ? 'e' : 'a'}.`, 'med'); continue; }
    develop(p, I.dev * quality, F, gkc);
  }
  for (const id of S.youth) { const y = S.players[id]; if (y) develop(y, quality * 1.25, FOCUS.equilibrato, gkc); }
  // età e calo sui club IA (più leggero)
  for (const cid of S.league.teams) if (cid !== S.clubId) for (const p of squad(cid)) if (rnd() < .3) develop(p, .55 * 3.3 * .3 + .2, FOCUS.equilibrato, 8);
  if (report.length) msg('Rientri dall\'infermeria', report.join('<br>'), 'med');
}
function develop(p, q, F, gkc) {
  const age = p.age; const gap = Math.max(0, p.pa - p.ovr) / 20;
  const ageF = age <= 20 ? 1.1 : age <= 23 ? .8 : age <= 26 ? .45 : age <= 29 ? .15 : 0;
  const decline = age >= 31 ? (age - 30) * .012 : 0;
  const play = (p.form.length ? 1.15 : .9) * (.78 + ((p.pers || {}).pro || 10) * .022);
  for (const k of ATTRS) {
    if (k === 'por' && p.role !== 'POR') continue;
    let f = F.attrs.includes(k) ? F.mult : (F.mult ? .55 : 0);
    if (k === 'por') f = 1 + gkc * .05;
    if (p.focus === k) f *= 2;
    if (ageF > 0 && gap > 0) p.a[k] = Math.min(20, p.a[k] + .03 * ageF * (.35 + gap) * q * f * play * rf(.4, 1.6));
    if (decline) p.a[k] = Math.max(1, p.a[k] - decline * (['vel', 'res', 'fis'].includes(k) ? 1.6 : .35) * rf(.5, 1.5));
  }
  refresh(p); if (p.ovr > p.pa) p.pa = p.ovr;
}

/* ---------------- Finanze ---------------- */
function weeklyFinance(e) {
  const T = TIERS[S.league.tier];
  book('Stipendi/rimborsi giocatori', -wageBill(), 'stipendi');
  if (S.staff.length) book('Stipendi staff', -staffBill(), 'staff');
  const sp = S.sponsors.reduce((s, x) => s + x.weekly, 0); if (sp) book('Sponsor', sp, 'sponsor');
  const me = myClub();
  const merch = Math.round(me.fans * (T.amateur ? .25 : 1.1) * (0.6 + me.rep / 100)); book('Merchandising e bar', merch, 'merch');
  if (T.tv) book('Diritti TV / mutualità', T.tv, 'tv');
  const maint = Math.round((Math.pow(S.fac.stadio, 1.9) * 12 + Math.pow(S.fac.campo, 1.9) * 9 + Math.pow(S.fac.giovanili, 1.9) * 8) * (T.amateur ? 1 : 2.5));
  book('Manutenzione strutture', -maint, 'strutture');
  if (S.fac.giovanili > 0) book('Settore giovanile', -Math.round(T.wage * (T.amateur ? .8 : .15) * S.fac.giovanili), 'giovanili');
  if (STADIUM[S.fac.stadio - 1] < T.minCap) book('Affitto stadio omologato', -Math.round(T.travel * 1.5), 'strutture');
  if (e.t === 'pre' && e.i === 0) { /* già contato a inizio stagione */ }
}
function weeklyBoard() {
  playerMood(); weeklyRoom();
  const b = S.board;
  if (S.fin.bal < 0) { b.debtWeeks++; b.conf = clamp(b.conf - 1.5, 0, 100); if (b.debtWeeks === 1 || b.debtWeeks % 4 === 0) msg('Conti in rosso', `Il saldo è negativo (${eur(S.fin.bal)}). Il presidente chiede di rientrare: vendi giocatori o taglia gli stipendi.`, 'board'); }
  else b.debtWeeks = 0;
  if (wageBill() > b.wageBudget * 1.05) b.conf = clamp(b.conf - .6, 0, 100);
  if ((b.conf <= 4 && S.week > 6) || (b.debtWeeks >= 12 && S.fin.bal < -TIERS[S.league.tier].owner * .5)) sack('Il presidente ha perso la fiducia nel tuo lavoro.');
}
function roomLeaders() { return squad(S.clubId).filter(p => p.pers).sort((a, b) => (b.pers.lead + (b.age - 24) * .3 + (S.tactic.captain === b.id ? 4 : 0)) - (a.pers.lead + (a.age - 24) * .3 + (S.tactic.captain === a.id ? 4 : 0))).slice(0, 3); }
function weeklyRoom() {
  S.room = S.room || { harmony: 60 };
  const sq = squad(S.clubId); if (!sq.length) return;
  const avgM = sq.reduce((a, p) => a + p.morale, 0) / sq.length; const L = roomLeaders();
  const leadM = L.length ? L.reduce((a, p) => a + p.morale, 0) / L.length : avgM;
  const cap = S.players[S.tactic.captain]; const capL = cap && cap.pers ? cap.pers.lead : 10;
  const fm = (table(S.league).find(r => r.id === S.clubId) || { form: [] }).form.slice(-5); const fs = fm.reduce((a, x) => a + (x === 'V' ? 4 : x === 'S' ? -4 : 0), 0);
  const target = clamp(56 + (avgM - 60) * .7 + (leadM - 55) * .6 + (capL - 10) * 1.5 + fs, 10, 95);
  S.room.harmony = clamp(S.room.harmony + (target - S.room.harmony) * .18, 5, 100);
  // i leader tengono su il morale quando le cose vanno male
  if (avgM < 50 && capL >= 14) for (const p of sq) p.morale = clamp(p.morale + 1, 0, 100);
  // episodi
  const bad = L.find(p => p.morale < 35 && (p.complained || -99) < S.week - 6);
  if (bad && rnd() < .5) { bad.complained = S.week; S.room.harmony = clamp(S.room.harmony - 6, 0, 100);
    msg('Malumore nello spogliatoio', `${bad.name}, uno dei leader del gruppo, è scontento e lo spogliatoio lo segue. L'armonia della squadra sta calando.`, 'player', [
      { label: `Parlo con ${bad.name.split(' ')[0]} a quattr'occhi`, reply: 'Il colloquio è servito, almeno per ora.', fx: { pid: bad.id, pm: 14, harmony: 4 } },
      { label: 'Lo tolgo dal ruolo di leader', reply: 'Gesto forte: qualcuno ti segue, altri no.', fx: { pid: bad.id, pm: -10, harmony: -3, teamMorale: 2 } },
      { label: 'Ignoro, conta il campo', reply: 'Il malumore resta.', fx: { harmony: -3 } }] ); }
  const lazy = sq.find(p => p.pers && p.pers.pro <= 6 && (p.incident || -99) < S.week - 10);
  if (lazy && rnd() < .06) { lazy.incident = S.week;
    msg(`${lazy.name} arriva tardi all'allenamento`, `Terzo ritardo del mese per ${lazy.name}. I compagni guardano come reagisci.`, 'player', [
      { label: 'Multa e panchina', reply: 'Il gruppo apprezza la fermezza.', fx: { pid: lazy.id, pm: -8, harmony: 3 } },
      { label: 'Richiamo in privato', reply: 'Messaggio arrivato, senza drammi.', fx: { pid: lazy.id, pm: -2, harmony: 1 } },
      { label: 'Lascio correre', reply: 'Qualcuno nello spogliatoio storce il naso.', fx: { pid: lazy.id, pm: 3, harmony: -4 } }]); }
  const hot = sq.find(p => p.pers && p.pers.tem <= 5 && (p.incident || -99) < S.week - 10);
  const lastRes = (table(S.league).find(r => r.id === S.clubId) || { form: [] }).form.slice(-1)[0];
  if (hot && lastRes === 'S' && rnd() < .12) { hot.incident = S.week; const other = pick(sq.filter(q => q !== hot));
    if (other) msg('Lite in allenamento', `${hot.name} e ${other.name} vengono alle mani dopo un contrasto duro. Tutti aspettano la tua decisione.`, 'player', [
      { label: `Punisco ${hot.name.split(' ').slice(-1)[0]}`, reply: 'Hai dato un segnale chiaro.', fx: { pid: hot.id, pm: -10, harmony: 3 } },
      { label: 'Punisco tutti e due', reply: 'Giusto ma severo: morale giù per entrambi.', fx: { pid: hot.id, pm: -6, harmony: 1, teamMorale: -1 } },
      { label: 'Chiarimento davanti alla squadra', reply: 'Si stringono la mano. Per ora.', fx: { harmony: 2 } }]); }
}
function playerMood() {
  const str = clubStrength(S.clubId);
  for (const p of squad(S.clubId)) {
    if (p.promise && S.week >= p.promise) {
      if ((p.lastPlayed || 0) < p.promise - 4) { p.morale = clamp(p.morale - 25, 0, 100); for (const q of squad(S.clubId)) q.morale = clamp(q.morale - 2, 0, 100); msg('Promessa non mantenuta: ' + p.name, `${p.name} si sente preso in giro: gli avevi promesso più spazio. Lo spogliatoio ne parla.`, 'player'); }
      else msg('Promessa mantenuta', `${p.name} ringrazia per la fiducia.`, 'player');
      p.promise = 0;
    }
    if (!p.inj && !p.loan && p.ovr >= str - 1 && p.morale < 38 && !p.promise && (p.complained || -99) < S.week - 8 && rnd() < .5) {
      p.complained = S.week;
      msg(`${p.name} chiede un colloquio`, `${p.name} (${ROLE_LABEL[p.role]}, ${p.age} anni) non è contento: dice di meritare più minuti.`, 'player', [
        { label: 'Gli prometto più spazio', reply: 'Promessa fatta: deve giocare nelle prossime 4 settimane.', fx: { pid: p.id, pm: 18, promise: 4 } },
        { label: 'Se vuole andare, lo metto in vendita', reply: 'Messo in lista trasferimenti.', fx: { pid: p.id, pm: 4, list: true } },
        { label: 'Deve guadagnarsi il posto', reply: 'Risposta dura: il giocatore non l\'ha presa bene.', fx: { pid: p.id, pm: -6, teamMorale: -1 } },
      ]);
    }
  }
}
function sack(why) { S.gameOver = { why, season: S.season, cat: S.league.cat }; msg('Esonerato', why, 'board'); }
function weeklyBuild() {
  for (const b of S.building) { b.left--; if (b.left <= 0) { S.fac[b.k] = b.to; msg(FAC_LABEL[b.k] + ' completato', `Lavori finiti: livello ${b.to}.` + (b.k === 'stadio' ? ` Capienza ${STADIUM[b.to - 1]} posti.` : ''), 'club'); } }
  S.building = S.building.filter(b => b.left > 0);
}
function upgradeFac(k) {
  const lvl = S.fac[k]; if (lvl >= 10) return 'Livello massimo raggiunto';
  if (S.building.some(b => b.k === k)) return 'Lavori già in corso';
  const cost = FAC_COST[k][lvl]; if (S.fin.bal < cost) return 'Fondi insufficienti (servono ' + eur(cost) + ')';
  book(`Lavori ${FAC_LABEL[k]} → livello ${lvl + 1}`, -cost, 'strutture');
  S.building.push({ k, to: lvl + 1, left: FAC_WEEKS[lvl] });
  S.board.conf = clamp(S.board.conf + 2, 0, 100);
  return null;
}
function askFunds() {
  const b = S.board; if (b.askedFunds) return 'Hai già chiesto fondi questa stagione.';
  if (b.conf < 45) return 'Il presidente non si fida abbastanza (fiducia < 45).';
  const amt = niceMoney(TIERS[S.league.tier].owner * rf(.12, .25) * (b.conf / 70));
  book('Iniezione di capitale del presidente', amt, 'presidente'); b.askedFunds = true; b.conf = clamp(b.conf - 8, 0, 100);
  msg('Il presidente apre il portafoglio', `Arrivano ${eur(amt)} extra. Ora però si aspetta risultati.`, 'board');
  return null;
}
function eur(x) { const s = Math.abs(Math.round(x)).toLocaleString('it-IT'); return (x < 0 ? '-' : '') + '€ ' + s; }

/* ---------------- Mercato ---------------- */
function scoutUnc() { const ab = staffAb('osservatore'); return Math.max(1, Math.round(7 - ab * .3)); }
function known(p) { return p.club === S.clubId || !!S.scouted[p.id]; }
function scoutPlayer(pid) {
  if (known(S.players[pid])) return null;
  if (S.scoutQ.includes(pid)) return 'Già in osservazione';
  S.scoutQ.push(pid); return null;
}
function weeklyScouting() {
  const n = 2 + Math.floor(staffAb('osservatore') / 4) + S.staff.filter(s => s.role === 'osservatore').length;
  const done = S.scoutQ.splice(0, n);
  for (const id of done) S.scouted[id] = S.season;
  if (done.length) msg('Rapporto osservatori', 'Relazioni complete su: ' + done.map(id => S.players[id] ? S.players[id].name : '').join(', '), 'scout');
}
function marketPlayers() {
  const ids = new Set();
  for (const cid of S.league.teams.concat(S.ext)) if (cid !== S.clubId) for (const id of S.clubs[cid].squad) ids.add(id);
  for (const p of Object.values(S.players)) if (!p.club && !p.youthPool) ids.add(p.id);
  return [...ids].map(id => S.players[id]).filter(Boolean);
}
function askingPrice(p) {
  if (!p.club) return 0;
  const c = S.clubs[p.club]; const sq = squad(p.club).sort((a, b) => b.ovr - a.ovr);
  const rank = sq.indexOf(p);
  const key = rank < 3 ? 1.5 : rank < 11 ? 1.2 : .9;
  const years = Math.max(0, p.until - S.season);
  const ds = 1 - staffAb('ds') * .01;
  return niceMoney(p.value_ = valueFor(p) * key * (1 + years * .12) * ds * (p.listed ? .8 : 1) * (c.user ? 1 : 1));
}
function wageDemand(p, toClub) {
  const myT = S.league.tier; const fromT = p.club ? S.clubs[p.club].tier : myT;
  const step = Math.max(0, myT - fromT); // scendere di categoria costa
  const base = wageFor(p.ovr) * (p.age >= 30 ? .9 : 1);
  const amb = 1 + (((p.pers || {}).amb || 10) - 10) * .015;
  return niceMoney(Math.max(base * amb * Math.pow(1.35, step) * (1 - staffAb('ds') * .008), p.club === S.clubId ? p.wage * 1.05 : 0));
}
function playerInterest(p) {
  // ritorna null se ok, altrimenti motivo
  const myT = S.league.tier; const fromT = p.club ? S.clubs[p.club].tier : myT;
  if (myT - fromT >= 3) return `${p.name} non vuole scendere di ${myT - fromT} categorie.`;
  const level = TIERS[myT].base;
  if (p.ovr > level + 16 && myT - fromT >= 1) return `${p.name} punta a una squadra di categoria superiore.`;
  return null;
}
function bid(pid, fee, wage, years, loan, opt, swapPid) {
  const p = S.players[pid]; if (!p) return { ok: false, txt: 'Giocatore inesistente' };
  if (!windowOpen() && p.club) return { ok: false, txt: 'La finestra di mercato è chiusa: puoi ingaggiare solo svincolati.' };
  if (myClub().squad.length >= 32) return { ok: false, txt: 'Rosa piena (max 32 giocatori).' };
  const interest = playerInterest(p); if (interest) return { ok: false, txt: interest };
  const c = p.club ? S.clubs[p.club] : null;
  if (loan) {
    if (!c) return { ok: false, txt: 'Gli svincolati non si prendono in prestito.' };
    const rank = squad(c.id).sort((a, b) => b.ovr - a.ovr).indexOf(p);
    if (rank < 13 || p.age > 24) return { ok: false, txt: `${c.name}: "${p.name} non è in prestito, rientra nei nostri piani".` };
    const pct = clamp(loan, .25, 1);
    if (pct < .5 && rnd() < .6) return { ok: false, txt: `${c.name} chiede di coprire almeno il 50% dell'ingaggio.` };
    const myShare = p.wage * pct; if (wageBill() + myShare > S.board.wageBudget * 1.1) return { ok: false, txt: 'Il presidente non approva: sforeresti il budget ingaggi.' };
    const optPrice = opt ? niceMoney(askingPrice(p) * .85) : 0;
    if (opt && rank < 15 && rnd() < .5) return { ok: false, txt: `${c.name} accetta il prestito secco, ma non vuole concedere il diritto di riscatto.` };
    p.loan = { from: c.id, pct, until: S.season, opt: optPrice }; move(p, S.clubId);
    msg('Prestito concluso', `${p.name} arriva in prestito da ${c.name} fino a fine stagione (paghi il ${Math.round(pct * 100)}% dell'ingaggio)${opt ? `, con diritto di riscatto a ${eur(optPrice)}` : ''}.`, 'transfer');
    return { ok: true, txt: 'Prestito concluso!' };
  }
  if (c) {
    const ask = askingPrice(p);
    const sq = squad(c.id); if (sq.length <= 17) return { ok: false, txt: `${c.name} ha la rosa troppo corta per cedere.` };
    S.nego = S.nego || {};
    const agreed = S.nego[pid];
    if (swapPid) {
      const swapP = S.players[swapPid];
      if (!swapP || swapP.club !== S.clubId || swapP.loan) return { ok: false, txt: 'Giocatore da inserire nello scambio non valido.' };
      const sq2 = squad(c.id).map(x => x.ovr).sort((a, b) => a - b); const med = sq2[Math.floor(sq2.length / 2)] || 0;
      if (swapP.ovr < med - 3) return { ok: false, txt: `${c.name}: "${swapP.name} non ci interessa come contropartita".` };
      fee = fee + valueFor(swapP) * .85;
    }
    if (!(agreed && fee >= agreed)) {
      if (fee < ask * .7) return { ok: false, txt: `${c.name} rifiuta: offerta troppo bassa.`, counter: ask };
      if (fee < ask) { const cnt = niceMoney((fee + ask) / 2 * rf(1, 1.08)); S.nego[pid] = cnt; return { ok: false, txt: `${c.name} fa una controproposta: ${eur(cnt)}.`, counter: cnt }; }
    }
    if (S.fin.bal < fee - (swapPid ? valueFor(S.players[swapPid]) * .85 : 0)) return { ok: false, txt: 'Fondi insufficienti.' };
  }
  const dem = wageDemand(p);
  if (wage < dem * .92) return { ok: false, txt: `${p.name} chiede almeno ${eur(dem)}/sett.`, wage: dem };
  if (wageBill() + wage > S.board.wageBudget * 1.1) return { ok: false, txt: `Il presidente blocca l'operazione: budget ingaggi ${eur(S.board.wageBudget)}/sett superato.` };
  if (years > 1 && p.age >= 33) years = 1;
  if (c) { const cash = swapPid ? Math.max(0, fee - valueFor(S.players[swapPid]) * .85) : fee; book('Acquisto ' + p.name + ' da ' + c.name + (swapPid ? ' (con scambio)' : ''), -cash, 'mercato'); if (swapPid) { const sp = S.players[swapPid]; move(sp, c.id); sp.listed = false; msg('Scambio', `${sp.name} passa al ${c.name} nell'operazione per ${p.name}.`, 'transfer'); } }
  else if (TIERS[S.league.tier].amateur) {} else book('Bonus firma ' + p.name, -wage * 2, 'mercato');
  const from = c ? c.name : 'svincolato';
  move(p, S.clubId); p.wage = niceMoney(wage); p.until = S.season + years - 1; p.morale = 75; p.listed = false;
  S.cohesion = clamp(S.cohesion - 2.5, 0, 100);
  msg('Colpo di mercato: ' + p.name, `${p.name} (${ROLE_LABEL[p.role]}, ${p.age} anni) arriva da ${from}${c ? ' per ' + eur(fee) : ''}. Contratto fino al ${p.until + 1}, ${eur(p.wage)}/sett.`, 'transfer');
  if (c) aiFill(c.id);
  return { ok: true, txt: 'Affare fatto!' };
}
function move(p, cid) {
  if (p.club && S.clubs[p.club]) S.clubs[p.club].squad = S.clubs[p.club].squad.filter(x => x !== p.id);
  p.club = cid; if (cid) S.clubs[cid].squad.push(p.id);
  p.scoutedFlag = true; S.scouted[p.id] = S.season; p.joined = S.season; p.yc = 0;
  S.shortlist = S.shortlist.filter(x => x !== p.id);
  if (cid !== S.clubId) { S.tactic.slots = S.tactic.slots.map(x => x === p.id ? null : x); S.tactic.bench = S.tactic.bench.filter(x => x !== p.id); }
}
function aiFill(cid) {
  const c = S.clubs[cid]; const t = c.tier;
  while (c.squad.length < 18) { const roles = ROLES.filter(r => squad(cid).filter(p => p.role === r).length < { POR: 2, DIF: 6, CEN: 6, ATT: 4 }[r]); const p = newPlayer({ role: roles.length ? roles[0] : pick(['DIF', 'CEN', 'ATT']), age: ageFor(t), ovr: TIERS[t].base + c.bias - 3 + gauss() * 3, club: cid, area: areaOf(c) }); c.squad.push(p.id); }
}
function release(pid) {
  const p = S.players[pid]; if (!p || p.club !== S.clubId) return 'Errore';
  if (p.loan) { const back = p.loan.from; p.loan = null; move(p, S.clubs[back] ? back : null); msg('Prestito interrotto', `${p.name} torna al club di appartenenza.`, 'transfer'); return null; }
  const weeksLeft = Math.max(0, (p.until - S.season) * 40 + (S.cal.length - S.ci));
  const cost = Math.round(p.wage * weeksLeft * (TIERS[S.league.tier].amateur ? .25 : .5));
  book('Rescissione ' + p.name, -cost, 'mercato'); move(p, null); p.listed = false; p.wage = wageFor(p.ovr);
  msg('Rescissione', `${p.name} lascia il club. Costo della rescissione: ${eur(cost)}.`, 'transfer');
  return null;
}
function renewDemand(p) {
  const dem = wageFor(p.ovr) * (p.morale < 40 ? 1.25 : 1) * (p.age >= 31 ? .9 : 1);
  return niceMoney(Math.max(dem, p.wage * 1.03));
}
function renew(pid, wage, years) {
  const p = S.players[pid]; const dem = renewDemand(p);
  if (p.loan) return { ok: false, txt: 'È in prestito: non puoi rinnovarlo.' };
  if (p.morale < 25) return { ok: false, txt: `${p.name} è scontento e non vuole parlare di rinnovo.` };
  if (wage < dem * .95) return { ok: false, txt: `${p.name} chiede ${eur(dem)}/sett.`, wage: dem };
  if (wageBill() - p.wage + wage > S.board.wageBudget * 1.1) return { ok: false, txt: 'Il presidente non approva: budget ingaggi superato.' };
  p.wage = niceMoney(wage); p.until = S.season + clamp(years, 1, 5); p.morale = clamp(p.morale + 8, 0, 100);
  return { ok: true, txt: `Rinnovato fino al ${p.until + 1}.` };
}
function weeklyMarket() {
  const open = windowOpen();
  if (rnd() < .14) { const str = clubStrength(S.clubId); const fa = Object.values(S.players).filter(p => !p.club && !p.youthPool && p.ovr >= str - 2 && !p.proposed).sort((a, b) => b.ovr - a.ovr)[0];
    if (fa) { fa.proposed = true; S.scouted[fa.id] = S.season; msg('Si propone uno svincolato', `Il procuratore di ${fa.name} (${ROLE_LABEL[fa.role]}, ${fa.age} anni) ce lo offre: chiede ${eur(wageDemand(fa))}/sett. Gli svincolati si possono ingaggiare anche a mercato chiuso.`, 'transfer', [{ label: 'Apri la scheda', open: fa.id }, { label: 'No, grazie', reply: 'Proposta rifiutata.' }]); } }
  // offerte per i nostri giocatori
  S.offersIn = S.offersIn.filter(o => o.exp > S.week && S.players[o.pid] && S.players[o.pid].club === S.clubId);
  if (open) {
    const buyers = S.league.teams.concat(S.ext).filter(id => id !== S.clubId);
    for (const p of squad(S.clubId)) {
      if (p.loan) continue;
      const v = valueFor(p); const prob = p.listed ? .4 : (p.ovr > TIERS[S.league.tier].base + 6 ? .05 : .01);
      if (rnd() < prob && !S.offersIn.some(o => o.pid === p.id)) {
        const cand = buyers.filter(id => S.clubs[id].tier <= S.league.tier + 1);
        const b = S.clubs[pick(cand)];
        const fee = niceMoney(Math.min(v * rf(.65, 1.15) * (1 + staffAb('ds') * .01) * (b.tier < S.league.tier ? 1.3 : 1), TIERS[b.tier].value * 9));
        S.offersIn.push({ id: 'f' + (S.nextId++), pid: p.id, club: b.id, fee, exp: S.week + 2 });
        msg(`Offerta per ${p.name}`, `${b.name} (${TIERS[b.tier].cat}) offre ${eur(fee)} per ${p.name}. Rispondi dal Mercato → Offerte ricevute.`, 'transfer');
      }
    }
    // l'IA si rinforza con gli svincolati
    const free = Object.values(S.players).filter(p => !p.club && !p.youthPool);
    if (free.length && rnd() < .5) { const p = free.sort((a, b) => b.ovr - a.ovr)[ri(0, Math.min(5, free.length - 1))]; const c = S.clubs[pick(S.league.teams.filter(id => id !== S.clubId))]; if (c.squad.length < 26 && !S.shortlist.includes(p.id)) { move(p, c.id); } }
  }
}
function answerOffer(oid, accept, counter) {
  const o = S.offersIn.find(x => x.id === oid); if (!o) return 'Offerta scaduta';
  const p = S.players[o.pid], c = S.clubs[o.club];
  if (!accept && counter) {
    if (counter <= o.fee * 1.25 && rnd() < .65) { o.fee = niceMoney(counter); accept = true; }
    else { S.offersIn = S.offersIn.filter(x => x !== o); return `${c.name} si ritira dalla trattativa.`; }
  }
  S.offersIn = S.offersIn.filter(x => x !== o);
  if (!accept) return null;
  book('Cessione ' + p.name + ' a ' + c.name, o.fee, 'mercato');
  move(p, c.id); p.listed = false; p.wage = wageFor(p.ovr);
  msg('Cessione: ' + p.name, `${p.name} passa al ${c.name} per ${eur(o.fee)}.`, 'transfer');
  validateLineup();
  return 'Cessione completata: ' + eur(o.fee);
}
function genFreeAgents(n) {
  const t = S.league.tier;
  for (let i = 0; i < n; i++) newPlayer({ role: pick(['POR', 'DIF', 'DIF', 'CEN', 'CEN', 'ATT', 'ATT']), age: clamp(ageFor(t) + ri(0, 5), 17, 38), ovr: TIERS[t].base - 6.5 + gauss() * 4.5, club: null, years: 0, area: areaOf(myClub()) });
}
function buildExt() {
  // club esterni per il mercato locale: categoria sopra e sotto, nella stessa regione
  for (const cid of S.ext) dropClub(cid);
  S.ext = [];
  const t = S.league.tier;
  for (const tt of [t - 1, t + 1]) {
    if (tt < 0 || tt > 8) continue;
    const g = chooseGroup(tt); const used = new Set(Object.values(S.clubs).map(c => c.name));
    const list = shuffle(dbClubs(tt, g).filter(c => !used.has(c.name))).slice(0, 4);
    for (const d of list) { const c = makeClub(d.name, tt, { group: d.group, region: d.region, dbId: d.id }); genSquad(c, tt, REAL_BY_CLUB[d.name]); S.ext.push(c.id); }
  }
}
function dropClub(cid) {
  const c = S.clubs[cid]; if (!c || c.user) return;
  for (const id of c.squad) { const p = S.players[id]; if (p && p.club === cid) delete S.players[id]; }
  delete S.clubs[cid];
}

/* ---------------- Settore giovanile ---------------- */
function youthIntake() {
  const t = S.league.tier, n = (S.youth.length < 8 ? 14 - S.youth.length : 2 + Math.floor(S.fac.giovanili / 3) + (staffAb('giovanili') > 10 ? 1 : 0));
  for (let i = 0; i < n; i++) {
    const p = newPlayer({ role: pick(['POR', 'DIF', 'DIF', 'CEN', 'CEN', 'CEN', 'ATT', 'ATT']), age: ri(16, 18), ovr: TIERS[t].base - 13 + gauss() * 4 + S.fac.giovanili * .6, club: null, youth: true, area: areaOf(myClub()), years: 2, pa: clamp(TIERS[t].base + S.fac.giovanili * 1.6 + staffAb('giovanili') * .8 + gauss() * 7 + 2, 20, 95) });
    p.wage = niceMoney(TIERS[t].wage * .2); p.youthPool = true; S.youth.push(p.id); S.scouted[p.id] = S.season;
  }
  msg('Leva giovanile', `Dalla Juniores si presentano ${n} ragazzi. Valutali in Società → Settore giovanile: puoi aggregarli alla prima squadra.`, 'club');
}
function worldWeek(e) {
  if (e.t !== 'lg' || e.i < 5) return;
  const tb = table(S.league);
  for (const r of tb) { const c = S.clubs[r.id]; if (!c || c.user) continue;
    const f = r.form.slice(-5); const losses = f.filter(x => x === 'S').length; const pos = tb.indexOf(r) + 1;
    if (losses >= 4 && pos > tb.length * .6 && (c.sackedW || -99) < S.week - 10 && rnd() < .3) {
      const old = c.coach; c.coach = (pick(COACH_FN) + ' ' + pick(LN)).replace(/_/g, ' '); c.sackedW = S.week; c.bias += .8; c.form = pick(['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2']);
      msg(`Esonero al ${c.name}`, `${c.name} (${pos}° posto) cambia allenatore: via ${old}, arriva ${c.coach}. Nuovo modulo: ${c.form}.`, 'world');
    } }
  if (windowOpen() && rnd() < .5) {
    const buyers = S.league.teams.filter(id => id !== S.clubId).map(id => S.clubs[id]).sort((a, b) => clubStrength(a.id) - clubStrength(b.id));
    const buyer = rnd() < .6 ? buyers[ri(0, Math.min(5, buyers.length - 1))] : pick(buyers);
    const sellers = S.ext.map(id => S.clubs[id]).filter(c => c && c.tier >= S.league.tier && c.squad.length > 18);
    if (buyer && sellers.length && buyer.squad.length < 28) { const sc = pick(sellers); const pl = squad(sc.id).sort((a, b) => b.ovr - a.ovr)[ri(0, 3)];
      if (pl && !S.shortlist.includes(pl.id)) { move(pl, buyer.id); S.scouted[pl.id] = S.scouted[pl.id] || 0; msg(`Mercato: ${pl.name} al ${buyer.name}`, `${buyer.name} si rinforza con ${pl.name} (${ROLE_LABEL[pl.role]}, ${pl.age} anni) dal ${sc.name}.`, 'world'); aiFill(sc.id); } }
  }
}
function rotateLeague(L, tb, rules) {
  // stessa categoria l'anno dopo: chi sale e chi scende viene sostituito con club reali delle categorie vicine
  const n = tb.length, up = tb.slice(0, rules.direct).map(r => r.id); if (S.playoff && S.playoff.winner && !up.includes(S.playoff.winner)) up.push(S.playoff.winner);
  const down = rules.releg ? tb.slice(n - rules.releg).map(r => r.id) : [];
  const out = up.concat(down).filter(id => id !== S.clubId);
  const used = new Set(Object.values(S.clubs).map(c => c.name));
  const from = (tier) => tier < 0 || tier > 8 ? [] : shuffle(dbClubs(tier, chooseGroup(tier)).concat(dbClubs(tier).filter(c => c.region === (S.region || 'Toscana'))).filter(c => !used.has(c.name)));
  const repl = [], inUp = from(L.tier + 1), inDown = from(L.tier - 1);
  for (const id of out) {
    const wasUp = up.includes(id); const src = wasUp ? inUp : inDown; const d = src.shift();
    if (!d) continue; used.add(d.name);
    const c = makeClub(d.name, L.tier, { group: L.group, region: d.region, dbId: d.id }); genSquad(c, L.tier, REAL_BY_CLUB[d.name]);
    L.teams[L.teams.indexOf(id)] = c.id; repl.push({ out: S.clubs[id].name, inn: c.name, up: wasUp }); dropClub(id);
  }
  if (repl.length) msg('Il nuovo girone', 'Lasciano il girone: ' + repl.map(r => `${r.out} (${r.up ? 'promossa' : 'retrocessa'})`).join(', ') + '.<br>Arrivano: ' + repl.map(r => r.inn).join(', ') + '.', 'world');
}
function initJuniores() {
  const names = S.league.teams.map(id => S.clubs[id].name);
  S.jun = { teams: names.map(n => ({ n, me: n === myClub().name, s: TIERS[S.league.tier].base - 11 + gauss() * 3, pts: 0, g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 })), fx: null, round: 0, last: null };
  S.jun.fx = scheduleRR(S.jun.teams.map((_, i) => i));
}
function junStrength() { const ys = S.youth.map(id => S.players[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 11); return ys.length ? ys.reduce((a, p) => a + p.ovr, 0) / ys.length - (11 - ys.length) * 1.5 : 10; }
function poisson(l) { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= rnd(); } while (p > L); return k - 1; }
function juniorRound() {
  const J = S.jun; if (!J || J.round >= J.fx.length) return;
  for (const [a, b] of J.fx[J.round]) {
    const A = J.teams[a], B = J.teams[b]; const sa = A.me ? junStrength() : A.s, sb = B.me ? junStrength() : B.s;
    const ga = poisson(1.45 * Math.pow((sa + 1) / (sb + 1), 1.5) * 1.05), gb = poisson(1.45 * Math.pow((sb + 1) / (sa + 1), 1.5));
    for (const [T, f, c] of [[A, ga, gb], [B, gb, ga]]) { T.g++; T.gf += f; T.ga += c; if (f > c) { T.w++; T.pts += 3; } else if (f === c) { T.d++; T.pts++; } else T.l++; }
    if (A.me || B.me) J.last = `${A.n} ${ga}-${gb} ${B.n}`;
  }
  J.round++;
  if (J.round === J.fx.length) { const tb = J.teams.slice().sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga)); const pos = tb.findIndex(t => t.me) + 1; msg('Juniores: campionato concluso', `La Juniores chiude al ${pos}° posto.` + (pos === 1 ? ' Campioni! Il settore giovanile guadagna prestigio.' : ''), 'club'); if (pos === 1) { myClub().rep = clamp(myClub().rep + 2, 0, 100); S.trophies.push({ season: S.season, name: 'Campionato Juniores' }); } }
}
function promoteYouth(pid) {
  const p = S.players[pid]; if (!p || !S.youth.includes(pid)) return 'Non disponibile';
  if (myClub().squad.length >= 32) return 'Rosa piena';
  S.youth = S.youth.filter(x => x !== pid); p.youthPool = false; p.until = S.season + 2; move(p, S.clubId); p.homegrown = true;
  return null;
}

/* ---------------- Coppa e playoff ---------------- */
function cupRound(k, um) {
  const C = S.cup; const ids = C.rounds[k]; if (!ids) return;
  const next = [], res = [];
  for (let i = 0; i < ids.length; i += 2) {
    let h = ids[i], a = ids[i + 1]; let m;
    if (um && ((um.h.cid === h && um.a.cid === a) || (um.h.cid === a && um.a.cid === h))) m = um;
    else m = quickResult(h, a, { comp: 'cup', ko: true });
    next.push(m.winner); res.push({ h: m.h.cid, a: m.a.cid, hg: m.h.goals, ag: m.a.goals, pens: m.pens, w: m.winner });
  }
  C.results[k] = res;
  if (ids.includes(S.clubId) && !next.includes(S.clubId)) C.out = k;
  if (next.length === 1) {
    C.winner = next[0];
    if (C.winner === S.clubId) { const pr = niceMoney(TIERS[S.league.tier].prize * .5); book('Premio vittoria ' + C.name, pr, 'premi'); S.trophies.push({ season: S.season, name: C.name }); S.board.conf = clamp(S.board.conf + 10, 0, 100); myClub().rep = clamp(myClub().rep + 4, 0, 100); msg('🏆 Coppa vinta!', `Hai vinto la ${C.name}! Premio ${eur(pr)}.`, 'board'); }
  } else C.rounds[k + 1] = shuffle(next);
  if (ids.includes(S.clubId) && next.includes(S.clubId) && k < 3) book('Premio turno coppa', niceMoney(TIERS[S.league.tier].prize * .05), 'premi');
}
function setupPlayoff() {
  const r = promoRules(S.league.tier); if (!r.playoff) return null;
  const tb = table(S.league); const [a, b] = r.playoff; const q = tb.slice(a - 1, b).map(x => x.id);
  // semifinali: 1ª vs ultima, 2ª vs penultima (in casa la meglio piazzata)
  const pairs = []; for (let i = 0; i < q.length / 2; i++) pairs.push([q[i], q[q.length - 1 - i]]);
  return { stage: 0, cur: pairs, winners: [], log: [] };
}
function playoffStage(um) {
  const P = S.playoff; const win = [];
  for (const pr of P.cur) { let m; if (um && um.h.cid === pr[0] && um.a.cid === pr[1]) m = um; else m = quickResult(pr[0], pr[1], { comp: 'po', ko: true, seedWins: pr[0] }); win.push(m.winner); P.log.push(`${m.h.name} ${m.h.goals}-${m.a.goals} ${m.a.name}`); }
  // ordina vincitori per piazzamento
  const tb = table(S.league).map(x => x.id); win.sort((a, b) => tb.indexOf(a) - tb.indexOf(b));
  if (win.length >= 2) { const pairs = []; for (let i = 0; i < win.length / 2; i++) pairs.push([win[i], win[win.length - 1 - i]]); P.cur = pairs; P.stage++; if (P.cur.some(pr => pr.includes(S.clubId))) S.cal.splice(S.ci + 1, 0, { t: 'po', i: P.stage }); else { finishPlayoffSim(); } }
  else { P.winner = win[0]; P.cur = []; }
}
function finishPlayoffSim() { while (S.playoff.cur.length) { playoffStage(null); if (S.playoff.winner) break; } }

/* ---------------- Inizio / fine stagione ---------------- */
function startSeason(first) {
  const L = S.league, T = TIERS[L.tier];
  S.fin.season = {};
  buildCalendar();
  S.cup = buildCup(); S.playoff = null;
  // presidente: contributo stagionale e iscrizione
  const owner = niceMoney(T.owner * (0.75 + myClub().rep / 200) * (first ? .65 : 1));
  book('Contributo stagionale del presidente', owner, 'presidente');
  book('Iscrizione al campionato ' + T.cat, -T.fee, 'iscrizione');
  // budget ingaggi
  const weeks = S.cal.length;
  const income = S.sponsors.reduce((s, x) => s + x.weekly, 0) + T.tv + myClub().fans * .6;
  S.board.wageBudget = niceMoney(Math.max(wageBill() * 1.15 + T.wage * 2, T.wage * 16, (Math.max(0, S.fin.bal) * .8) / weeks + income * .55 - staffBill()));
  S.board.askedFunds = false;
  // obiettivo
  const ranks = L.teams.slice().sort((a, b) => clubStrength(b) - clubStrength(a)); const r = ranks.indexOf(S.clubId) + 1, n = L.teams.length;
  const pr = promoRules(L.tier);
  if (L.tier === 0) { S.board.target = r <= 2 ? 1 : r <= 5 ? 4 : r <= 10 ? 10 : n - pr.releg; S.board.obj = r <= 2 ? 'Vincere lo scudetto' : r <= 5 ? 'Qualificazione in Champions (top 4)' : r <= 10 ? 'Parte sinistra della classifica' : 'Salvezza'; }
  else if (r <= 2) { S.board.target = Math.max(1, pr.direct); S.board.obj = 'Vincere il campionato (promozione diretta)'; }
  else if (r <= 5 && pr.playoff) { S.board.target = pr.playoff[1]; S.board.obj = `Arrivare ai playoff (entro il ${pr.playoff[1]}° posto)`; }
  else if (r <= n / 2 + 1) { S.board.target = Math.ceil(n / 2); S.board.obj = 'Metà classifica'; }
  else { S.board.target = n - pr.releg; S.board.obj = pr.releg ? `Salvezza (evitare gli ultimi ${pr.releg} posti)` : 'Campionato dignitoso'; }
  // squadre: condizione piena
  for (const p of Object.values(S.players)) { p.fit = 100; p.st = { app: 0, g: 0, as: 0, r: 0, yc: 0, rc: 0, mom: 0 }; p.yc = 0; p.form = []; p.o0 = p.ovr; }
  buildExt();
  for (const p of Object.values(S.players)) if (!p.club && !p.youthPool) delete S.players[p.id];
  genFreeAgents(28 + (L.tier <= 3 ? 10 : 0));
  genSponsorOffers();
  refreshStaffMarket();
  S.tactic.slots = []; validateLineup();
  if (!S.youth.length) youthIntake();
  initJuniores();
}
function seasonEnd() {
  // eventuali playoff
  const L = S.league, rules = promoRules(L.tier);
  if (!S.playoff && rules.playoff) {
    S.playoff = setupPlayoff();
    if (S.playoff && S.playoff.cur.some(pr => pr.includes(S.clubId))) { S.cal.splice(S.ci, 0, { t: 'po', i: 0 }); return; }
    if (S.playoff) finishPlayoffSim();
  }
  S.pendingEnd = true; // l'interfaccia mostra il riepilogo, poi chiama closeSeason()
}
function closeSeason() {
  const L = S.league, T = TIERS[L.tier], rules = promoRules(L.tier), tb = table(L), n = tb.length;
  const pos = tb.findIndex(r => r.id === S.clubId) + 1, me = tb[pos - 1];
  let outcome = '', newTier = L.tier;
  const poWin = S.playoff && S.playoff.winner === S.clubId;
  if (L.tier > 0 && (pos <= rules.direct || poWin)) { outcome = pos === 1 ? 'Campione e promosso' : poWin ? 'Promosso ai playoff' : 'Promosso'; newTier = L.tier - 1; }
  else if (rules.releg && pos > n - rules.releg) { outcome = 'Retrocesso'; newTier = L.tier + 1; }
  else if (L.tier === 0 && pos === 1) outcome = 'Campione d\'Italia';
  if (pos === 1) S.trophies.push({ season: S.season, name: L.cat + (L.tier ? ' girone ' + L.group : '') });
  // premi
  const prize = niceMoney(T.prize * Math.max(.1, (n - pos + 1) / n) * (pos === 1 ? 1.5 : 1));
  book('Premio piazzamento ' + L.cat, prize, 'premi');
  for (const s of S.sponsors) if (s.promoBonus && newTier < L.tier) book('Bonus promozione ' + s.name, s.promoBonus, 'sponsor');
  // giudizio presidente
  const b = S.board; let dConf = (b.target - pos) * 3 + (newTier < L.tier ? 25 : 0) + (newTier > L.tier ? -30 : 0);
  b.conf = clamp(b.conf + dConf, 0, 100);
  const topSc = squad(S.clubId).sort((a, x) => x.st.g - a.st.g)[0];
  S.history.unshift({ season: S.season, cat: L.cat, group: L.group, pos, n, pts: me.pts, w: me.w, d: me.d, l: me.l, gf: me.gf, ga: me.ga, outcome, cup: S.cup.winner === S.clubId ? 'Vinta' : S.cup.out != null ? CUP_ROUND[S.cup.out] : '-', top: topSc ? `${topSc.name} (${topSc.st.g})` : '', obj: b.obj });
  const c = myClub();
  if (newTier < L.tier) {
    c.rep = clamp(c.rep + 10, 0, 100); c.fans = Math.round(Math.min(c.fans * 1.25 + TIERS[newTier].fans * .35, TIERS[newTier].fans * 1.6));
    // adeguamento contratti per la promozione
    for (const p of squad(S.clubId)) if (!p.loan) p.wage = niceMoney(Math.max(p.wage * 1.3, wageFor(p.ovr) * .7));
    msg('Adeguamenti contrattuali', 'Con la promozione scattano gli aumenti previsti dai contratti: il monte ingaggi sale.', 'club');
  }
  else if (newTier > L.tier) { c.rep = clamp(c.rep - 8, 0, 100); c.fans = Math.round(c.fans * .8); }
  else c.rep = clamp(c.rep + (pos <= 3 ? 3 : pos > n - 3 ? -3 : 0), 0, 100);
  let fired = b.conf < 15 && pos > b.target;
  const summary = { season: S.season, cat: L.cat, pos, n, outcome, prize, conf: b.conf };
  if (fired) { sack(`Stagione chiusa al ${pos}° posto con obiettivo "${b.obj}". Il presidente ti sostituisce.`); return summary; }
  // contratti, età, ritiri
  const leaving = [];
  for (const p of Object.values(S.players)) {
    if (p.loan && p.loan.until <= S.season && p.loan.exercise && p.loan.opt && S.fin.bal >= p.loan.opt) { book('Riscatto ' + p.name, -p.loan.opt, 'mercato'); p.loan = null; p.until = S.season + 2; p.wage = niceMoney(Math.max(p.wage, wageFor(p.ovr) * .9)); leaving.push(p.name + ' (riscattato, resta con noi)'); continue; }
    if (p.loan && p.loan.until <= S.season) { const back = p.loan.from; p.loan = null; if (S.clubs[back]) move(p, back); else move(p, null); leaving.push(p.name + ' (fine prestito)'); continue; }
    p.age++;
    if (p.club === S.clubId && p.until < S.season + 1) { leaving.push(p.name + ' (contratto scaduto)'); move(p, null); continue; }
    if (p.club && p.club !== S.clubId && p.until < S.season + 1) p.until = S.season + ri(1, 2);
    const retire = p.age >= (T.amateur ? 37 : 35) && rnd() < (p.age - (T.amateur ? 35 : 33)) * .25;
    if (retire && p.club !== S.clubId) { if (p.club) S.clubs[p.club].squad = S.clubs[p.club].squad.filter(x => x !== p.id); delete S.players[p.id]; }
    else if (retire && p.club === S.clubId) { leaving.push(p.name + ' (ritiro)'); move(p, null); delete S.players[p.id]; }
  }
  for (const s of S.staff.slice()) if (s.until < S.season + 1) { S.staff = S.staff.filter(x => x !== s); leaving.push(s.name + ' — ' + STAFF_ROLES[s.role] + ' (contratto staff scaduto)'); }
  S.sponsors = S.sponsors.filter(s => s.until >= S.season + 1);
  if (leaving.length) msg('Fine stagione: partenze', leaving.join('<br>'), 'club');
  // stagione nuova
  S.season++;
  S.scouted = Object.fromEntries(Object.entries(S.scouted).filter(([, v]) => v >= S.season - 1));
  const outq = S.youth.map(id => S.players[id]).filter(p => p && p.age >= 20);
  for (const p of outq) delete S.players[p.id];
  S.youth = S.youth.filter(id => S.players[id]);
  if (outq.length) msg('Juniores: fuori quota', 'Lasciano il settore giovanile per limiti di età: ' + outq.map(p => p.name).join(', ') + '.', 'club');
  if (newTier !== L.tier) {
    const old = L.teams.filter(id => id !== S.clubId);
    S.league = buildLeague(newTier, null, [S.clubId]);
    for (const id of old) if (!S.league.teams.includes(id)) dropClub(id);
    msg(newTier < L.tier ? `🎉 Promossi in ${TIERS[newTier].cat}!` : `Retrocessi in ${TIERS[newTier].cat}`, `La prossima stagione giochiamo nel girone ${S.league.group} di ${TIERS[newTier].cat}. ` + (newTier < L.tier ? 'Il livello si alza: serve rinforzare la rosa e, salendo, anche lo stadio.' : 'Si riparte con umiltà.'), 'board');
    if (STADIUM[S.fac.stadio - 1] < TIERS[newTier].minCap) msg('Stadio non omologato', `In ${TIERS[newTier].cat} servono almeno ${TIERS[newTier].minCap} posti: finché non ampli lo stadio paghi l'affitto di un impianto omologato.`, 'club');
  } else {
    // stessa categoria: rinnova il calendario, rigenera alcune rose
    rotateLeague(L, tb, rules);
    for (const cid of L.teams) if (cid !== S.clubId) { aiFill(cid); for (const p of squad(cid)) { if (rnd() < .25) { develop(p, 2.5, FOCUS.equilibrato, 8); } } }
    L.fixtures = scheduleRR(shuffle(L.teams.slice())); L.results = L.fixtures.map(() => []); L.round = 0;
  }
  // aggiornamento valori
  for (const p of squad(S.clubId)) { p.morale = clamp(p.morale + 5, 0, 100); }
  if (S.ext.length) {}
  youthIntake();
  startSeason(false);
  b.conf = clamp(Math.max(b.conf, 45), 0, 100);
  msg(`Stagione ${S.season}/${String(S.season + 1).slice(2)}`, `Obiettivo del presidente: <b>${S.board.obj}</b>. Budget ingaggi: ${eur(S.board.wageBudget)}/settimana. Nuove offerte di sponsorizzazione disponibili.`, 'board');
  S.pendingEnd = false;
  return summary;
}

/* ---------------- Salvataggio ---------------- */
function serialize() { return JSON.stringify(S); }
function load(json) { const o = typeof json === 'string' ? JSON.parse(json) : json; if (!o || o.v !== VERSION) throw new Error('Salvataggio non compatibile'); S = o; for (const p of Object.values(S.players)) if (!p.pers) p.pers = genPers(p.age); S.room = S.room || { harmony: 60 }; for (const c of Object.values(S.clubs)) if (!c.coach) c.coach = (pick(COACH_FN) + ' ' + pick(LN)).replace(/_/g, ' '); return S; }
function state() { return S; }
function setState(x) { S = x; }

const FM = {
  VERSION, TIERS, ATTRS, ATTR_LABEL, ROLES, ROLE_LABEL, FORMS, MENT, PRESS, TEMPO, FOCUS, INTENSITY, STAFF_ROLES, SLOT_LABEL, FAC_COST, FAC_WEEKS, FAC_LABEL, STADIUM, CUP_ROUND,
  newGame, startClubs, beginTurn, endTurn, closeSeason, table, promoRules, windowOpen, nextEvent,
  createMatch, step, simulate, doSub, finish, prepareUserMatch, rate, release, staffWage,
  squad, myClub, clubStrength, roleOvr, stars, valueFor, wageFor, wageDemand, askingPrice, renewDemand, playerInterest,
  answerMsg, junStrength, RT, INSTR, defaultRT, rtOvr, persLabel, roomLeaders, bid, renew, answerOffer, scoutPlayer, known, scoutUnc, marketPlayers,
  hireStaff, fireStaff, acceptSponsor, upgradeFac, askFunds, promoteYouth, validateLineup, autoPick, editPlayer, areaOf,
  wageBill, staffBill, staffAb, eur, slotsMax, serialize, load, state, setState, msg, book, REAL_BY_CLUB,
};
if (typeof module !== 'undefined' && module.exports) module.exports = FM; else root.FM = FM;
})(typeof window !== 'undefined' ? window : globalThis);
