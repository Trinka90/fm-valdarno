'use strict';
// Simula carriere complete con un "allenatore automatico" e verifica che il motore regga più stagioni.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
globalThis.FM_NATIONAL = JSON.parse(fs.readFileSync(path.join(__dirname, 'database-nazionale-2026-27.json'), 'utf8').replace(/^﻿/, ''));
const FM = require('./src/engine.js');
const seasons = +(process.argv[2] || 6), runs = +(process.argv[3] || 3), verbose = process.argv.includes('-v');
let goals = 0, matches = 0, best = 99, homeW = 0, draws = 0;
const boost = process.argv.includes('--boost');
function manage(S) {
  if (boost && S.ci === 0) for (const p of FM.squad(S.clubId)) { const t = FM.TIERS[S.league.tier].base + 9; for (const k of FM.ATTRS) p.a[k] = Math.min(20, p.a[k] * t / p.ovr); p.ovr = FM.roleOvr(p, p.role); p.until = S.season + 3; p.age = Math.min(p.age, 27); }
  // gestore automatico: sponsor, rinnovi, mercato svincolati, strutture
  for (const o of S.sponsorOffers.slice().sort((a, b) => b.weekly - a.weekly)) FM.acceptSponsor(o.id);
  for (const p of FM.squad(S.clubId)) if (p.until <= S.season && p.ovr >= FM.clubStrength(S.clubId) - 6 && p.age < 34) FM.renew(p.id, FM.renewDemand(p), 2);
  if (FM.windowOpen()) {
    const weak = FM.squad(S.clubId).sort((a, b) => a.ovr - b.ovr);
    const cands = FM.marketPlayers().filter(p => p.ovr > FM.clubStrength(S.clubId) + 1).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
    for (const p of cands) {
      const fee = p.club ? FM.askingPrice(p) : 0;
      if (fee > S.fin.bal * .4) continue;
      const r = FM.bid(p.id, fee, FM.wageDemand(p), 2);
      if (r.ok && FM.squad(S.clubId).length > 24) { const w = weak.shift(); if (w && w.club === S.clubId) FM.release(w.id); }
    }
  }
  for (const o of S.offersIn.slice()) FM.answerOffer(o.id, o.fee > FM.valueFor(FM.state().players[o.pid]) * 1.1);
  for (const k of ['stadio', 'campo', 'giovanili']) if (S.fin.bal > 3 * FM.FAC_COST[k][S.fac[k]] && S.fac[k] < 10) FM.upgradeFac(k);
  for (const y of S.youth.slice()) if (S.players[y].pa > FM.TIERS[S.league.tier].base + 4) FM.promoteYouth(y);
}
for (let run = 0; run < runs; run++) {
  const S = FM.newGame({ seed: 1234 + run * 77, manager: 'Test' });
  const log = [];
  for (let s = 0; s < seasons; s++) {
    let guard = 0;
    while (!S.pendingEnd && !S.gameOver && guard++ < 200) {
      manage(S);
      const t = FM.beginTurn(); if (!t) break;
      FM.endTurn(t);
      if (t.e.t === 'lg') for (const r of S.league.results[t.e.i]) { goals += r.hg + r.ag; matches++; if (r.hg > r.ag) homeW++; if (r.hg === r.ag) draws++; }
    }
    if (S.gameOver) { log.push('ESONERATO: ' + S.gameOver.why); break; }
    assert(S.pendingEnd, 'la stagione deve chiudersi');
    const tb = FM.table(S.league);
    const n = S.league.teams.length; assert.equal(tb.reduce((a, r) => a + r.g, 0), n * 2 * (n - 1), 'partite giocate');
    if (verbose) console.log(JSON.stringify(S.fin.season));
    const sum = FM.closeSeason();
    log.push(`${sum.season}/${String(sum.season + 1).slice(2)} ${sum.cat}: ${sum.pos}°/${sum.n} ${sum.outcome || ''} | saldo ${FM.eur(S.fin.bal)} | fiducia ${Math.round(S.board.conf)} | forza ${FM.clubStrength(S.clubId).toFixed(1)} | rosa ${FM.squad(S.clubId).length}`);
    if (S.gameOver) { log.push('ESONERATO: ' + S.gameOver.why); break; }
    best = Math.min(best, S.league.tier);
    // integrità
    for (const c of Object.values(S.clubs)) for (const id of c.squad) assert(S.players[id] && S.players[id].club === c.id, 'rosa incoerente ' + c.name);
    assert(S.league.teams.length % 2 === 0);
    assert(JSON.stringify(S).length < 4.5e6, 'salvataggio troppo grande');
  }
  console.log(`--- carriera ${run + 1} (${FM.myClub().name})\n` + log.join('\n'));
}
console.log(`gol/partita ${(goals / matches).toFixed(2)} · vittorie casa ${(homeW / matches * 100).toFixed(0)}% · pareggi ${(draws / matches * 100).toFixed(0)}% · categoria massima raggiunta: ${FM.TIERS[best].cat}`);
const size = FM.serialize().length; console.log('dimensione salvataggio', Math.round(size / 1024), 'KB');
