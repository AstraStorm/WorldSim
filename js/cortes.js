// World Sim · Cortes, pactos, referéndums y partidos que nacen o se fusionan
// ================= Cortes =================
// · En tu nación, si hay parlamento (escaños), las leyes no van por decreto: las llevas a las Cortes. Los líderes de
//   los partidos debaten en el parlamento (o en la plaza) y luego vota cada partido con todos sus escaños: sí si la ley
//   está en su programa o va con sus ideas. Si no te salen las cuentas, puedes pactar: un partido te da sus votos a
//   cambio de que apruebes una ley de su programa
// · Referéndum: para una ley o un cambio de régimen, en vez de imponerlo se lo preguntas a la gente: todos a la plaza a
//   votar. Si gana el sí, se aplica sin enfados (la gente agradece que le pregunten); si gana el no, no se hace
// · En todas las naciones donde se vota: si mucha gente no se siente representada por ningún partido, nace uno nuevo;
//   dos partidos pequeños y parecidos se fusionan en uno
const BILL_LEN = 30, REF_LEN = 22;
const hasCortes = n => !!(n && typeof seatsOf === 'function' && seatsOf(n));
const lawClash = (a, b) => (typeof LAW_CLASH !== 'undefined' && LAW_CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) || (typeof lawOpp === 'function' && lawOpp(a) === b);
// Lo que vota cada partido: true (sí) / false (no)
function partyVote(n, k, law, on){
  const p = n.parties[k], P = world.player; if ((P && P.pacts || {})[k] && P.pacts[k].bill === law) return true;
  let s = p.laws.includes(law) ? .95 : p.laws.some(l => lawClash(l, law)) ? .05 : clamp(.7 - Math.abs((LAW_LEAN[law] || 0) - p.ideo) * .6, .05, .9);
  if (!on) s = 1 - s; return s > .5;
}
function billCount(n, law, on){
  const S = seatsOf(n); if (!S) return null; let yes = 0; const tot = S.reduce((a, b) => a + b, 0);
  const vote = n.parties.map((q, k) => partyVote(n, k, law, on)); vote.forEach((v, k) => { if (v) yes += S[k]; });
  return { yes, tot, ok:yes * 2 > tot, vote };
}
// Pactos posibles: partidos que votan no y cuyo voto bastaría (o ayudaría), con la ley que piden a cambio
function pactOffers(n, law, on){
  const c = billCount(n, law, on); if (!c || c.ok) return [];
  const S = seatsOf(n), L = n.pLaws || [], out = [];
  n.parties.forEach((p, k) => {
    if (c.vote[k] || !S[k] || p.laws.includes(law) && !on) return;
    if (p.laws.some(l => lawClash(l, law)) && on) return; // (lo que va contra su programa no lo pactan)
    const ask = p.laws.find(l => !L.includes(l) && l !== law && !lawClash(l, law) && (typeof lawAwake !== 'function' || lawAwake(n, l)));
    if (ask) out.push({ k, ask, seats:S[k], enough:(c.yes + S[k]) * 2 > c.tot });
  });
  return out.sort((a, b) => b.enough - a.enough || b.seats - a.seats).slice(0, 3);
}
function makePact(k, law, on){
  const n = playerNat(), P = world.player; if (!n) return;
  const o = pactOffers(n, law, on).find(x => x.k === k); if (!o) return;
  (P.pacts ||= {})[k] = { bill:law, ask:o.ask, t:yearT };
  const p = n.parties[k];
  setPlayerLaw(o.ask, true, `por el pacto con ${artP(p)} ${p.name}`, .4);
  notify(`${n.name} pacta con ${artP(p)} ${p.name}: sus ${o.seats} escaños votarán «${LAW_TXT[law] || law}» a cambio de «${LAW_TXT[o.ask] || o.ask}»`, { x:n.fx * T, y:n.fy * T });
}
// Llevar una ley a las Cortes: debate de los líderes y votación
function startBill(law, on){
  const n = playerNat(), P = world.player; if (!n || P.bill || !hasCortes(n)) return;
  const B = { law, on, until:yearT + BILL_LEN, sayT:0 }; P.bill = B;
  const bi = n.parliament != null && world.objs[n.parliament] ? n.parliament : null;
  const bx = bi != null ? (bi % W) * T + 2 : n.plaza ? ((n.plaza.x0 + n.plaza.x1) / 2) * T + 2 : n.fx * T + 2, by = bi != null ? (((bi / W) | 0) + 3) * T : n.plaza ? ((n.plaza.y0 + n.plaza.y1) / 2) * T + 3 : n.fy * T + 8;
  const S = seatsOf(n), idx = n.parties.map((q, k) => k).filter(k => S[k] > 0);
  idx.forEach((k, j) => { const L = typeof partyLeaderOf === 'function' ? partyLeaderOf(n, n.parties[k]) : null; if (!L || L.away || L.dead || (L.task && ['asalto', 'detenido', 'viaje'].includes(L.task.k))) return;
    const a = Math.PI * (.15 + .7 * (idx.length === 1 ? .5 : j / (idx.length - 1)));
    releaseTask(L); if (L.actT > 0) { L.actT = 0; L.onDone = null; } L.sleep = false;
    L.task = { k:'mitin', x:bx + Math.cos(a) * 16 * (j % 2 ? 1 : -1), y:by + Math.sin(a) * 8 + 4, until:B.until, party:k, lead:true }; L.lastD = Infinity; });
  B.x = bx; B.y = by;
  notify(`${on ? 'Las Cortes de ' + n.name + ' debaten la ley de' : 'Las Cortes de ' + n.name + ' debaten quitar la ley de'} «${LAW_TXT[law] || law}»: los líderes de los partidos toman la palabra`, { x:bx, y:by });
}
function billTick(dt){
  const n = playerNat(), P = world && world.player, B = P && P.bill; if (!B) return;
  if (!n || !hasCortes(n)) { P.bill = null; return; }
  if ((B.sayT -= dt) <= 0 && typeof sayList !== 'undefined' && zoom >= 3) {
    B.sayT = 2.8; const S = seatsOf(n), ids = n.parties.map((q, i) => i).filter(i => S[i] > 0), k = ids[Math.floor(Math.random() * ids.length)];
    const p = k != null && n.parties[k], L = p && p.lead;
    if (L && !L.dead && L.task && L.task.k === 'mitin') { const yes = partyVote(n, k, B.law, B.on), t = LAW_TXT[B.law] || B.law, now = performance.now();
      sayList = sayList.filter(s => s.v !== L); sayList.push({ v:L, txt:yes ? thPick([`${capFirst(artP(p))} ${p.abbr || p.name} votará que sí`, B.on ? `¡${capFirst(t)} es lo que hace falta!` : `¡Fuera ${t}!`, 'Señorías, es una buena ley']) : thPick([`Votaremos que no`, B.on ? `¡${capFirst(t)}, jamás!` : `¡No toquéis ${t}!`, 'Esa ley es un error']), think:false, t0:now, t1:now + 2600 }); }
  }
  if (yearT < B.until) return;
  P.bill = null; const c = billCount(n, B.law, B.on), t = LAW_TXT[B.law] || B.law, at = { x:B.x || n.fx * T, y:B.y || n.fy * T };
  for (const u of villagers) if (u.task && u.task.k === 'mitin' && u.task.lead && !rallies.some(R => R.lead === u)) u.task = null;
  if (P.pacts) for (const k in P.pacts) if (P.pacts[k].bill === B.law) delete P.pacts[k];
  if (!c) return;
  const tally = `${c.yes} a favor y ${c.tot - c.yes} en contra`;
  if (c.ok) setPlayerLaw(B.law, B.on, `en las Cortes (${tally})`, .5);
  else notify(`Las Cortes de ${n.name} tumban ${B.on ? 'la ley de' : 'la derogación de'} «${t}»: ${tally}`, at);
}
// ---- Referéndums ----
function personYes(u, g, R){
  if (R.kind === 'ley') { const lean = LAW_LEAN[R.key] || 0, s = (typeof lawNeed === 'function' ? lawNeed(u, g, R.key) : 0) * .7 + (lean ? .45 - Math.abs((u.ideo || 0) - lean) * .5 : .1); return R.on ? s > 0 : s <= 0; }
  const free = ['republica', 'democracia', 'monarquia_parlamentaria', 'partitocracia'].includes(R.key), I = REGIME_IDEO[R.key] ?? 0;
  return free ? Math.abs(u.ideo || 0) < .75 : Math.abs((u.ideo || 0) - I) < .45;
}
function startReferendum(kind, key, on){
  const n = playerNat(), P = world.player; if (!n || P.ref || (P.refT || -1e9) > yearT) return;
  const R = { kind, key, on:on !== false, until:yearT + REF_LEN }; P.ref = R;
  for (const o of playerTowns()) { const r0 = o.plaza; if (!r0) continue;
    for (const u of villagers) { if (u.dead || u.away || u.vid !== o.id || ageOf(u) < ADULT_H || u.sleep || u.boat || (u.task && ['asalto', 'apagar', 'viaje', 'ritual', 'protesta', 'golpe', 'reprimir', 'detenido', 'mitin'].includes(u.task.k))) continue;
      releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; }
      u.task = { k:'votar', x:(r0.x0 + .5 + Math.random() * (r0.x1 - r0.x0)) * T + 2, y:(r0.y0 + .5 + Math.random() * (r0.y1 - r0.y0)) * T + 3, until:R.until - 2 }; u.lastD = Infinity; } }
  notify(`Referéndum en ${n.name}: ¿${kind === 'ley' ? `${R.on ? 'aprobar' : 'quitar'} la ley de «${LAW_TXT[key] || key}»` : `pasar a ser ${REGIME_A[key]}`}? Todos a la plaza a votar`, { x:n.fx * T, y:n.fy * T });
}
function refTick(){
  const n = playerNat(), P = world && world.player, R = P && P.ref; if (!R || yearT < R.until) return;
  P.ref = null; P.refT = yearT + DAY_LEN * .5; if (!n) return;
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && isPlayerG(villageById(u.vid))); let yes = 0;
  for (const u of ads) if (personYes(u, villageById(u.vid) || n, R)) yes++;
  const pct = Math.round(yes / Math.max(1, ads.length) * 100), ok = pct > 50, at = { x:n.fx * T, y:n.fy * T };
  const what = R.kind === 'ley' ? `${R.on ? 'aprobar' : 'quitar'} la ley de «${LAW_TXT[R.key] || R.key}»` : `pasar a ser ${REGIME_A[R.key]}`;
  if (ok) { if (R.kind === 'ley') setPlayerLaw(R.key, R.on, `por referéndum (${pct} % de síes)`, 0); else setPlayerRegime(R.key, `por referéndum (${pct} % de síes)`, 0, true); }
  else notify(`Referéndum en ${n.name}: gana el no (${100 - pct} %) y no se va a ${what}`, at);
  for (const g of playerTowns()) g.anger = Math.max(0, (g.anger || 0) - 4); // (les han preguntado: eso calma)
}
SYSTEMS.push(dt => { try { billTick(dt); refTick(); } catch (e) { console.error(e); } });
// ---- Partidos que nacen y que se fusionan (en todas las naciones donde se vota) ----
const PARTY_PALETTE = ['#d8483a', '#3a6ab8', '#e8b848', '#5aa84a', '#e8c040', '#8a5ac8', '#e07a30', '#30a8a8', '#c84a90', '#8a8a8a', '#6a3a20', '#40c0e0'];
// Quita el partido j (sus votos pasan a keep, si lo hay) y recoloca los índices de quien gobierna
function removeParty(n, j, keep){
  const ps = n.parties, into = keep == null ? null : keep > j ? keep - 1 : keep, fix = k => k == null ? k : k === j ? into : k > j ? k - 1 : k;
  if (n.voteRes && n.voteRes.length === ps.length) { if (keep != null) n.voteRes[keep] += n.voteRes[j]; n.voteRes.splice(j, 1); }
  ps.splice(j, 1); n.ruling = fix(n.ruling); n.coalition = fix(n.coalition); n.seats = null;
  if (n.coalition === n.ruling) n.coalition = null;
  const P = world.player; if (P && P.pacts && playerNat() === n) P.pacts = {};
}
function partiesTick(n){
  const ps = n.parties, at = { x:n.fx * T, y:n.fy * T };
  // Fusión: dos pequeños y parecidos (que no gobiernen)
  if (ps.length > 3 && n.voteRes && n.voteRes.length === ps.length && Math.random() < .35) {
    for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
      if (a === n.ruling || b === n.ruling || Math.abs(ps[a].ideo - ps[b].ideo) > .22 || n.voteRes[a] >= 15 || n.voteRes[b] >= 15) continue;
      const big = n.voteRes[a] >= n.voteRes[b] ? a : b, small = big === a ? b : a, A = ps[big], Bp = ps[small];
      const used = new Set(villages.flatMap(o => (o.parties || []).map(q => q.name))), kind = A.ideo < -.25 ? 'izq' : A.ideo > .25 ? 'der' : 'centro';
      const nm = partyName(kind, n, used), old = [A.name, Bp.name];
      A.name = nm.name; A.abbr = nm.abbr; A.ideo = (A.ideo * 2 + Bp.ideo) / 3; A.laws = [...new Set([...A.laws, ...Bp.laws])].filter((l, i, arr) => !arr.slice(0, i).some(x => lawClash(x, l))).slice(0, 5);
      if (!A.lead || A.lead.dead) A.lead = Bp.lead;
      removeParty(n, small, big);
      notify(`En ${n.name}, ${artP({ name:old[0] })} ${old[0]} y ${artP({ name:old[1] })} ${old[1]} se fusionan: nace ${artP(A)} ${A.name}`, at); lawLog(n, `Fusión: ${old[0]} + ${old[1]} = ${A.name}`);
      return;
    }
  }
  // Nace uno: mucha gente lejos de todos los partidos
  if (ps.length >= 6) return;
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && nationOf(villageById(u.vid) || {}) === n); if (ads.length < 20) return;
  const S = ads.length > 120 ? ads.filter((u, i) => i % Math.ceil(ads.length / 120) === 0) : ads;
  const lost = S.filter(u => Math.min(...ps.map(p => Math.abs((u.ideo || 0) - p.ideo))) > .4);
  if (lost.length / S.length < .2) return;
  const ideo = clamp(lost.reduce((a, u) => a + (u.ideo || 0), 0) / lost.length, -1, 1), kind = ideo < -.25 ? 'izq' : ideo > .25 ? 'der' : 'centro';
  const used = new Set(villages.flatMap(o => (o.parties || []).map(q => q.name))), nm = partyName(kind, n, used), cols = new Set(ps.map(p => p.col));
  const p = { ...nm, kind, ideo, laws:partyProgram(ideo, 3, [], n), col:PARTY_PALETTE.find(c => !cols.has(c)) || '#aaaaaa', born:yearT };
  ps.push(p); if (n.voteRes && n.voteRes.length === ps.length - 1) n.voteRes.push(0); n.seats = null;
  const L = typeof partyLeaderOf === 'function' ? partyLeaderOf(n, p) : null;
  notify(`En ${n.name} nace ${artP(p)} ${p.name} (${sideTxt(p)}): un ${Math.round(lost.length / S.length * 100)} % de la gente no se sentía representada${L ? `; lo lidera ${L.name}` : ''}. Propone: ${p.laws.map(l => LAW_TXT[l]).join(', ')}`, at);
  lawLog(n, `Nace ${p.name}`);
}
let partiesClock = 0;
SYSTEMS.push(dt => {
  if ((partiesClock -= dt) > 0 || !villages.length) return; partiesClock = DAY_LEN / 2;
  for (const n of villages) if (nationOf(n) === n && popOf(n) && n.parties && n.parties.length >= 2 && votes(n) && !n.election && yearT - (n.voteT ?? -1e9) > DAY_LEN) try { partiesTick(n); } catch (e) { console.error(e); }
});
// ---- Interfaz (desde las pestañas de Leyes y Régimen del gobierno) ----
function cortesBar(n){
  const P = world.player, B = P.bill, R = P.ref;
  let h = '';
  if (B) h += `<div class="gv-live">🏛 Se debate en las Cortes: ${B.on ? '' : 'quitar '}«${esc(LAW_TXT[B.law] || B.law)}» · votación en ${Math.max(0, Math.ceil(B.until - yearT))} s</div>`;
  if (R) h += `<div class="gv-live">🗳 Referéndum en marcha: ${R.kind === 'ley' ? `«${esc(LAW_TXT[R.key] || R.key)}»` : esc(REGIMES[R.key])} · recuento en ${Math.max(0, Math.ceil(R.until - yearT))} s</div>`;
  if (hasCortes(n) && !B) { const S = seatsOf(n), tot = S.reduce((a, b) => a + b, 0); h += `<p class="muted gv-note">Hay parlamento: las leyes se votan en las Cortes (${tot} escaños; hacen falta ${Math.floor(tot / 2) + 1}). Si no te salen las cuentas, pacta con algún partido o pregunta a la gente con un referéndum.</p>`; }
  return h;
}
function lawActions(n, l, on){
  const P = world.player, busyB = !!P.bill, busyR = !!P.ref || (P.refT || -1e9) > yearT, ref = `<button class="gv-btn" data-gref="ley" data-key="${l}" data-on="${on ? 1 : 0}" ${busyR ? 'disabled title="Ya hay un referéndum o acaba de haber uno"' : ''}>🗳 Referéndum</button>`;
  if (!hasCortes(n)) return `<button class="gv-btn${on ? ' gold' : ''}" data-glaw="${l}" data-on="${on ? 1 : 0}">${on ? 'Aprobar' : 'Derogar'}</button>${ref}`;
  const c = billCount(n, l, on), offers = !c.ok ? pactOffers(n, l, on) : [], open = P.neg === l;
  return `<span class="gv-tally ${c.ok ? 'ok' : 'no'}" title="${on ? 'Escaños a favor de aprobarla' : 'Escaños a favor de quitarla'}, de lo que votaría cada partido">${c.ok ? '✓' : '✕'} ${c.yes}/${c.tot}</span><button class="gv-btn${on ? ' gold' : ''}" data-gbill="${l}" data-on="${on ? 1 : 0}" ${busyB ? 'disabled title="Ya se debate otra ley"' : ''}>🏛 ${on ? 'Aprobar' : 'Derogar'} en las Cortes</button>${offers.length ? `<button class="gv-btn${open ? ' on' : ''}" data-gneg="${l}">🤝 Negociar</button>` : ''}${ref}
    ${open && offers.length ? `<div class="gv-pacts">${offers.map(o => { const p = n.parties[o.k]; return `<button class="gv-pact" data-gpact="${o.k}" data-law="${l}" data-on="${on ? 1 : 0}" style="--c:${p.col}"><b>${esc(p.name)}</b> · ${o.seats} escaños${o.enough ? ' · <em>con ellos sale</em>' : ''}<span>A cambio: aprobar «${esc(LAW_TXT[o.ask] || o.ask)}»</span></button>`; }).join('')}</div>` : ''}`;
}
