// Constitución: para que las leyes no vayan y vengan con cada gobierno.
// · Las naciones donde se vota y que ya saben escribir convocan unas Cortes Constituyentes: entran en la Constitución las
//   leyes fundamentales (CONST_KINDS) que quiere una mayoría clara (≥60 %), sin choques entre ellas, como mucho 5. El texto se aprueba en referéndum.
// · Esas leyes valen gobierne quien gobierne: los partidos no las proponen ni las derogan, y las suyas que chocan con
//   ellas quedan sin efecto (constMerge, desde lawsOfAll en sociedad.js).
// · Cambiarla cuesta: una reforma necesita dos de cada tres votos. Las naciones de la IA la revisan cada pocos días: se
//   quita lo que ya casi nadie quiere (≤33 %) o se añade lo que casi todos piden (≥72 %), un cambio cada vez.
// · Con un golpe o un régimen sin votos queda suspendida; si vuelve la democracia, vuelve con ella.
// · En tu nación sale sola cuando toca (o la convocas tú); la reformas con un referéndum de dos tercios.
// Lo que entra en una Constitución es lo fundamental (derechos, lengua, religión, huelga, autonomía, sanidad, educación,
// vivienda, medio ambiente, paz), para bien o para mal. Impuestos, jornada, comercio o ejército son política de cada gobierno.
const CONST_KINDS = new Set(['autonomia', 'derecho_huelga', 'prohibir_huelgas', 'lengua_unica', 'plurilinguismo', 'libertad_religiosa', 'persecucion_religiosa', 'laicidad', 'fe',
  'derechos_humanos', 'matrimonio_igualitario', 'segregacion', 'persecucion', 'sanidad', 'educacion', 'vivienda_publica', 'pensiones', 'bosques', 'paz']);
const CONST_MAX = 6, CONST_DRAFT_MIN = .6, CONST_ADD = .72, CONST_DROP = .33;
const constOn = n => !!(n && n.const && n.const.laws.length && votes(n));
const constHas = (n, l) => constOn(n) && n.const.laws.includes(l);
const constClashes = (n, l) => constOn(n) && n.const.laws.some(x => x !== l && lawClash(x, l));
const constBlocks = (g, l) => { const n = nationOf(g); return constHas(n, l) || constClashes(n, l); };
const constWM = new WeakMap();
function constMerge(n, L){
  if (!constOn(n)) return L;
  const C = n.const.laws, key = C.join(), c = constWM.get(n);
  if (c && c.src === L && c.len === L.length && c.last === L[L.length - 1] && c.key === key) return c.out;
  const out = [...C, ...L.filter(l => !C.includes(l) && !C.some(x => lawClash(x, l)))];
  constWM.set(n, { src:L, len:L.length, last:L[L.length - 1], key, out }); return out;
}
// Quiénes votan (una muestra de los adultos de toda la nación) y cuántos apoyan una ley
function constVoters(n){
  const ads = villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && (() => { const g = villageById(u.vid); return g && nationOf(g) === n; })());
  return ads.length > 120 ? ads.filter((u, i) => i % Math.ceil(ads.length / 120) === 0) : ads;
}
const constSup = (n, S, l) => S.length ? S.reduce((a, u) => a + (lawVote(u, villageById(u.vid) || n, l) ? 1 : 0), 0) / S.length : 0;
const constName = n => `Constitución del año ${n.const.y}`;
const constList = L => L.map(l => `«${LAW_TXT[l] || l}»`).join(', ').replace(/, ([^,]*)$/, ' y $1');
// Cortes Constituyentes
function constDraft(n, byPlayer){
  const S = constVoters(n); if (S.length < 8) { if (byPlayer) sysToast('Hace falta más gente para unas Cortes Constituyentes'); return false; }
  const cand = Object.keys(LAW_LEAN).filter(l => CONST_KINDS.has(l) && LAW_TXT[l] && lawAwake(n, l)).map(l => [l, constSup(n, S, l)]).sort((a, b) => b[1] - a[1]), laws = [];
  for (const [l, s] of cand) { if (laws.length >= 5 || s < CONST_DRAFT_MIN) break; if (!laws.some(x => lawClash(x, l))) laws.push(l); }
  const at = { x:n.fx * T, y:n.fy * T };
  if (laws.length < 2) { n.constT = yearT + DAY_LEN * 2;
    if (byPlayer || !n.constFail) { n.constFail = true; const txt = `En ${n.name} las Cortes Constituyentes no se ponen de acuerdo: no hay leyes que quiera la gran mayoría`; lawLog(n, txt); notify(txt, at); }
    return false; }
  const pct = Math.round(laws.reduce((a, l) => a + cand.find(c => c[0] === l)[1], 0) / laws.length * 100), d = Math.floor(yearT / DAY_LEN) + 1;
  n.const = { laws, d, y:bookYearOf(d), pct, ref:0 }; delete n.constFail;
  if (n.pLaws) { for (const l of laws) { n.pLaws = n.pLaws.filter(x => !lawClash(x, l)); if (!n.pLaws.includes(l)) n.pLaws.push(l); } if (typeof lawSupC !== 'undefined') lawSupC.clear(); }
  const txt = `📜 ${n.name} aprueba en referéndum su Constitución (${pct} % de síes): consagra ${constList(laws)}. Esas leyes ya no cambian con cada gobierno; para tocarlas hace falta una reforma con dos de cada tres votos`;
  lawLog(n, txt); notify(txt, at); if (typeof sendNews === 'function') sendNews(n, `${n.name} ya tiene Constitución`);
  for (const g of villages) if (popOf(g) && nationOf(g) === n) g.anger = Math.max(0, (g.anger || 0) - 5);
  return true;
}
// Reforma: añadir (on) o quitar una ley de la Constitución
function constReform(n, l, on, how){
  if (!constOn(n) || on === n.const.laws.includes(l)) return; const C = n.const;
  if (on) { C.laws = C.laws.filter(x => !lawClash(x, l)); C.laws.push(l); if (n.pLaws) { n.pLaws = n.pLaws.filter(x => !lawClash(x, l)); if (!n.pLaws.includes(l)) n.pLaws.push(l); } }
  else C.laws = C.laws.filter(x => x !== l);
  C.ref++; if (typeof lawSupC !== 'undefined') lawSupC.clear();
  const txt = `📜 Reforma constitucional en ${n.name} ${how}: ${on ? `la Constitución añade «${LAW_TXT[l] || l}»` : `«${LAW_TXT[l] || l}» sale de la Constitución${n.pLaws && n.pLaws.includes(l) ? ' (sigue en vigor como ley normal, ya la puedes quitar)' : ' y queda en manos de cada gobierno'}`}`;
  lawLog(n, txt); notify(txt, { x:n.fx * T, y:n.fy * T });
}
// La IA revisa su Constitución de vez en cuando (en tu nación decides tú, con referéndum)
function constReview(n){
  const S = constVoters(n); if (S.length < 8) return; const C = n.const;
  const worst = C.laws.map(l => [l, constSup(n, S, l)]).sort((a, b) => a[1] - b[1])[0];
  if (worst && worst[1] <= CONST_DROP && C.laws.length > 1) { constReform(n, worst[0], false, `(solo un ${Math.round(worst[1] * 100)} % la quería ya)`); return; }
  if (C.laws.length >= CONST_MAX) return;
  const best = Object.keys(LAW_LEAN).filter(l => CONST_KINDS.has(l) && LAW_TXT[l] && !C.laws.includes(l) && lawAwake(n, l) && !C.laws.some(x => lawClash(x, l))).map(l => [l, constSup(n, S, l)]).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= CONST_ADD) constReform(n, best[0], true, `(con un ${Math.round(best[1] * 100)} % a favor)`);
}
let constClock = 0;
SYSTEMS.push(dt => { try {
  if ((constClock -= dt) > 0) return; constClock = 6;
  for (const n of villages) {
    if (!popOf(n) || nationOf(n) !== n || !votes(n) || n.election || (n.constT || 0) > yearT) continue;
    const mine = typeof isPlayerG === 'function' && isPlayerG(n);
    if (!n.const) { if ((n.know || {}).escritura && n.parties && n.parties.length >= 2 && yearT - (n.regimeT || 0) > DAY_LEN && Math.random() < .3) { n.constT = yearT + DAY_LEN * .5; constDraft(n, false); } }
    else if (!mine) { n.constT = yearT + DAY_LEN * (2.5 + Math.random() * 1.5); constReview(n); }
  }
} catch (e) { console.error(e); } });
// Golpes y regímenes sin votos la suspenden; con la democracia vuelve
{ const base = setRegime; setRegime = function(g, reg, chief){
  const n = nationOf(g), was = constOn(n), r = base.apply(this, arguments);
  if (n && n.const) { const now = constOn(n), at = { x:n.fx * T, y:n.fy * T };
    if (was && !now) { const t = `En ${n.name} queda suspendida la ${constName(n)}`; lawLog(n, t); notify(t, at); }
    else if (!was && now) { const t = `En ${n.name} vuelve a estar en vigor la ${constName(n)}: ${constList(n.const.laws)}`; lawLog(n, t); notify(t, at); } }
  return r; }; }
// ---- Ficha de la nación ----
function constCard(n){
  if (!n || !n.const) return '';
  const C = n.const, off = !votes(n);
  return `<h4>Constitución</h4><div class="muted">${esc(constName(n))} · aprobada con el ${C.pct} % de síes${C.ref ? ` · ${C.ref} reforma${C.ref > 1 ? 's' : ''}` : ''}${off ? ' · <b>suspendida</b> (no se vota con este régimen)' : ''}</div>
    <div class="laws">${C.laws.map(l => `<div><b>📜 ${LAW_TXT[l] || l}</b><span class="muted">${LAW_DESC[l] || ''}</span></div>`).join('')}</div>`;
}
// ---- Gobierno del jugador: la Constitución en la pestaña de Leyes ----
function constGovHtml(n){
  if (!votes(n)) return n.const ? `<div class="gv-note muted">📜 La ${esc(constName(n))} está suspendida: con este régimen no se vota.</div>` : '';
  const P = world.player, busy = !!P.ref || (P.refT || -1e9) > yearT, dis = busy ? ' disabled title="Ya hay un referéndum o acaba de haber uno"' : '';
  if (!n.const) return `<div class="gv-vigor gv-const"><div class="gv-vh"><b>📜 Constitución</b><span class="muted">no tenéis</span></div><p class="muted gv-note">Una Constitución fija las leyes que quiere la gran mayoría: ya no cambian con cada gobierno y solo se tocan con dos tercios de los votos.</p><button class="gv-btn gold" data-gconst="1"${(n.constT || 0) > yearT ? ' disabled title="Las Cortes Constituyentes acaban de reunirse"' : ''}>Convocar Cortes Constituyentes</button></div>`;
  const C = n.const, add = (n.pLaws || []).filter(l => !C.laws.includes(l) && !C.laws.some(x => lawClash(x, l)) && CONST_KINDS.has(l));
  return `<div class="gv-vigor gv-const"><div class="gv-vh"><b>📜 ${esc(constName(n))}</b><span class="muted">${C.laws.length}/${CONST_MAX}</span></div>
    <p class="muted gv-note">Estas leyes no se pueden quitar por decreto ni en las Cortes: solo con una reforma votada en referéndum por dos de cada tres.</p>
    <div class="gv-blist">${C.laws.map(l => `<div class="gv-law on"><div class="gv-lt"><b>📜 ${esc(LAW_TXT[l] || l)}</b><span class="muted">apoyo ${Math.round(lawSup(n, l) * 100)} %</span></div><button class="gv-btn" data-gref="const" data-key="${l}" data-on="0"${dis}>🗳 Reforma: quitar</button></div>`).join('')}
    ${C.laws.length < CONST_MAX ? add.map(l => `<div class="gv-law"><div class="gv-lt"><b>${esc(LAW_TXT[l] || l)}</b><span class="muted">en vigor, apoyo ${Math.round(lawSup(n, l) * 100)} %</span></div><button class="gv-btn" data-gref="const" data-key="${l}" data-on="1"${dis}>🗳 Reforma: añadir</button></div>`).join('') : ''}</div></div>`;
}
{ const base = govLaws; govLaws = function(n){ return constGovHtml(n) + base.apply(this, arguments); }; }
{ const base = govLawDo; govLawDo = function(l, on){
  const n = playerNat();
  if (n && !on && constHas(n, l)) { sysToast(`«${LAW_TXT[l] || l}» está en la Constitución: solo se quita con una reforma (referéndum, dos tercios)`); return; }
  if (n && on && constClashes(n, l)) { const x = n.const.laws.find(y => lawClash(y, l)); sysToast(`Choca con «${LAW_TXT[x] || x}», que está en la Constitución`); return; }
  return base.apply(this, arguments); }; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-gconst]'); if (!b) return; const n = playerNat(); if (!n || n.const) return; constDraft(n, true); n.constT = yearT + DAY_LEN; govRender(true); });
{ const base = setPlayerLaw; setPlayerLaw = function(l, on){ const n = playerNat(); if (n && (on ? constClashes(n, l) : constHas(n, l))) { sysToast(`No se puede: «${LAW_TXT[l] || l}» ${on ? 'choca con la Constitución' : 'está en la Constitución'}`); return; } return base.apply(this, arguments); }; }
