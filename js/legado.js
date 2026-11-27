// World Sim · Legado: el discurso del estado de la nación
// ================= Legado =================
// En el modo nación, al acabar cada año sale el balance: cuánta gente hay, cómo va la economía, qué se ha descubierto,
// qué leyes se han aprobado, las guerras, las decisiones difíciles (crisis.js), el clima… y una nota del año. Con los
// años se va formando tu legado: cómo te recordará la historia (el Constructor, el Pacificador, el Reformista, el Tirano…).
// No es ganar ni perder: es saber cómo lo estás haciendo. Se guarda en world.player.years.
let legadoOpen = null, legClock = 0;
function legSnap(n){
  const P = typeof powersData === 'function' ? powersData() : [], rank = P.findIndex(x => x.n === n) + 1, ec = n.coin && ecOf(n);
  return { pop:natPop(n), towns:natTowns(n).length, app:govMood(n).app, rank, nats:P.length, treas:ec ? ec.treas : 0, debt:ec ? ec.debt : 0, P:ec ? ec.P : 1,
    sci:Object.keys(sciOf(n)).filter(k => sciOf(n)[k]).length, laws:(n.pLaws || []).slice(), crises:(n.crises || []).length, emit:n.emit || 0,
    wars:(n.warsFought || 0), dead:natTowns(n).reduce((a, g) => a + Object.values(g.deaths || {}).reduce((s, k) => s + k, 0), 0), cycle:n.cycle ? n.cycle.v : 0 };
}
// Guerras de este año (se cuentan al empezar)
{ const seen = new Set(); SYSTEMS.push(dt => { if (!world || !playerOn()) return; const n = playerNat(); if (!n) return; for (const [k, r] of rels) if (r.war && (r.war.att === n.id || r.war.def === n.id)) { const key = k + ':' + (r.war.start ?? r.war.t ?? ''); if (!seen.has(key)) { seen.add(key); n.warsFought = (n.warsFought || 0) + 1; } } }); }
function legGrade(a, b){
  let s = 50; const f = [];
  const dp = b.pop - a.pop, gp = a.pop ? dp / a.pop : 0;
  s += clamp(gp * 80, -20, 20); f.push(gp > .05 ? ['👥', `La población crece un ${Math.round(gp * 100)} %`, 1] : gp < -.05 ? ['👥', `La población cae un ${Math.round(-gp * 100)} %`, -1] : ['👥', 'La población se mantiene', 0]);
  s += (b.app - .5) * 40; f.push([b.app > .6 ? '😊' : b.app < .4 ? '😠' : '😐', `Aprobación del ${Math.round(b.app * 100)} %`, b.app > .6 ? 1 : b.app < .4 ? -1 : 0]);
  if (a.rank && b.rank) { s += (a.rank - b.rank) * 4; if (a.rank !== b.rank) f.push(['🏆', b.rank < a.rank ? `Subís al ${b.rank}.º puesto entre ${b.nats} naciones` : `Bajáis al ${b.rank}.º puesto entre ${b.nats} naciones`, b.rank < a.rank ? 1 : -1]); }
  const ds = b.sci - a.sci; if (ds > 0) { s += ds * 3; f.push(['🔬', `${ds} descubrimiento${ds > 1 ? 's' : ''} nuevo${ds > 1 ? 's' : ''}`, 1]); }
  const dw = b.wars - a.wars; if (dw > 0) { s -= dw * 6; f.push(['⚔', `${dw} guerra${dw > 1 ? 's' : ''}`, -1]); }
  if (b.debt > a.debt * 1.3 + 20 * b.P) { s -= 6; f.push(['🏦', 'La deuda se dispara', -1]); } else if (b.treas > a.treas + 20 * b.P) { s += 4; f.push(['💰', 'El tesoro engorda', 1]); }
  if (b.cycle < -.4) { s -= 6; f.push(['📉', 'El año acaba en crisis económica', -1]); } else if (b.cycle > .4) { s += 5; f.push(['📈', 'El año acaba con la economía en auge', 1]); }
  const newL = b.laws.filter(l => !a.laws.includes(l)), goneL = a.laws.filter(l => !b.laws.includes(l));
  if (newL.length) f.push(['📜', `Leyes nuevas: ${newL.slice(0, 4).map(l => LAW_TXT[l] || l).join(', ')}${newL.length > 4 ? '…' : ''}`, 0]);
  if (goneL.length) f.push(['🗑', `Derogadas: ${goneL.slice(0, 3).map(l => LAW_TXT[l] || l).join(', ')}${goneL.length > 3 ? '…' : ''}`, 0]);
  if (b.emit > a.emit * 1.3 + 1 && world.warm > .5) { s -= 3; f.push(['🏭', 'Contamináis más que nunca', -1]); }
  return { score:clamp(Math.round(s), 0, 100), facts:f, newL };
}
const LEG_TITLES = [
  ['constructor', 'el Constructor', 'quien levantó ciudades y llenó el país de gente'],
  ['sabio', 'el Sabio', 'quien apostó por la ciencia y el saber'],
  ['pacificador', 'el Pacificador', 'quien mantuvo la paz cuando otros iban a la guerra'],
  ['guerrero', 'el Conquistador', 'quien llevó a su pueblo a la guerra una y otra vez'],
  ['reformista', 'el Reformista', 'quien cambió las leyes de arriba abajo'],
  ['querido', 'el Querido', 'quien tuvo siempre a su gente de su lado'],
  ['tirano', 'el Tirano', 'quien gobernó contra su propia gente'],
  ['prospero', 'el Próspero', 'quien hizo rico al país'],
];
function legTitle(Y){
  if (!Y.length) return null; const sum = k => Y.reduce((a, y) => a + (y[k] || 0), 0);
  const c = { constructor:sum('gp') * 3, sabio:sum('ds') * .8, pacificador:Y.filter(y => !y.dw).length * .7, guerrero:sum('dw') * 1.2, reformista:sum('nl') * .35, querido:Y.reduce((a, y) => a + Math.max(0, y.app - .6), 0) * 8, tirano:Y.reduce((a, y) => a + Math.max(0, .4 - y.app), 0) * 10, prospero:Y.filter(y => y.cycle > .3).length * .8 };
  const k = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; return LEG_TITLES.find(t => t[0] === k);
}
const legWord = s => s >= 80 ? 'Un año glorioso' : s >= 65 ? 'Un buen año' : s >= 50 ? 'Un año tranquilo' : s >= 35 ? 'Un año difícil' : 'Un año para olvidar';
function legYearEnd(n, yr){
  const P = world.player, a = P.legSnap, b = legSnap(n); P.legSnap = b; P.legYear = yr + 1; if (!a) return;
  const G = legGrade(a, b), Y = P.years ||= [];
  Y.push({ y:yr, score:G.score, app:b.app, gp:a.pop ? (b.pop - a.pop) / a.pop : 0, ds:b.sci - a.sci, dw:b.wars - a.wars, nl:G.newL.length, cycle:b.cycle, pop:b.pop, rank:b.rank, facts:G.facts, towns:b.towns, nats:b.nats });
  if (Y.length > 60) Y.shift();
  legShow(n, yr, G, b);
}
function legShow(n, yr, G, b){
  if (busy) return;
  const Y = world.player.years, T = legTitle(Y), avg = Math.round(Y.reduce((a, y) => a + y.score, 0) / Y.length);
  let el = $('legScreen'); if (!el) { el = document.createElement('div'); el.id = 'legScreen'; el.className = 'era leg'; document.body.appendChild(el); el.addEventListener('click', ev => { if (ev.target.closest('[data-legok]')) legClose(); }); el.addEventListener('keydown', ev => { if (ev.key === 'Escape' || ev.key === 'Enter') legClose(); }); }
  const col = G.score >= 65 ? '#a8d088' : G.score >= 45 ? '#e8d070' : '#f08a7a';
  el.innerHTML = `<div class="era-card" role="dialog" aria-modal="true" aria-labelledby="legTitle">
    <div class="era-ic">🏛</div><div class="era-kick">Discurso del estado de la nación · fin del año ${yr}</div>
    <h2 id="legTitle">${legWord(G.score)}</h2><p class="era-sub">${esc(n.name)}: ${b.pop} habitantes en ${b.towns} pueblo${b.towns > 1 ? 's' : ''}${b.rank ? ` · ${b.rank}.ª potencia del mundo` : ''}</p>
    <div class="leg-score" style="--c:${col}"><b>${G.score}</b><span>nota del año</span></div>
    <ul class="leg-facts">${G.facts.map(([i, t, s]) => `<li class="${s > 0 ? 'up' : s < 0 ? 'down' : ''}"><span>${i}</span>${esc(t)}</li>`).join('')}</ul>
    ${Y.length > 1 ? `<div class="leg-years">${Y.slice(-12).map(y => `<i style="height:${Math.round(y.score / 100 * 40) + 4}px;background:${y.score >= 65 ? '#7ab04a' : y.score >= 45 ? '#d8b848' : '#d8583a'}" title="Año ${y.y}: ${y.score}"></i>`).join('')}</div>` : ''}
    ${T && Y.length >= 2 ? `<div class="era-who"><span>La historia te recordará como <b>${esc(T[1])}</b>, ${esc(T[2])} · media de ${avg} en ${Y.length} años</span></div>` : ''}
    <button class="era-ok" data-legok type="button">Seguir gobernando</button></div>`;
  legadoOpen = { speed:gameSpeed }; if (gameSpeed) setSpeed(0);
  el.hidden = false; requestAnimationFrame(() => el.classList.add('in')); const bt = el.querySelector('.era-ok'); if (bt) bt.focus(); snd('bell');
}
function legClose(){ const el = $('legScreen'); if (!el) return; el.classList.remove('in'); el.hidden = true; if (legadoOpen && legadoOpen.speed) setSpeed(legadoOpen.speed); legadoOpen = null; }
SYSTEMS.push(dt => { try {
  if (!world || busy || (legClock -= dt) > 0) return; legClock = 5;
  if (!playerOn()) return; const n = playerNat(); if (!n) return; const P = world.player;
  const yr = bookYearOf(Math.floor(yearT / DAY_LEN) + 1);
  if (!P.legSnap) { P.legSnap = legSnap(n); P.legYear = yr; return; }
  if (yr > (P.legYear || yr) && !legadoOpen && !(typeof crisisOpen !== 'undefined' && crisisOpen) && !(typeof eraShown !== 'undefined' && eraShown)) legYearEnd(n, P.legYear);
} catch (e) { console.error(e); } });
// En el resumen: el legado hasta ahora
{ const base = govSummary; govSummary = function(n){ const h = base.apply(this, arguments), Y = (world.player || {}).years || []; if (!Y.length) return h; const T = legTitle(Y), avg = Math.round(Y.reduce((a, y) => a + y.score, 0) / Y.length);
  return h.replace('<h4>Ciencia</h4>', `<h4>Tu legado</h4><div class="gv-row"><span>${Y.length} año${Y.length > 1 ? 's' : ''} de gobierno · nota media <b>${avg}</b>${T && Y.length >= 2 ? ` · te recordarán como <b>${esc(T[1])}</b>` : ''}</span><button class="gv-btn" data-gact="legado">🏛 Último discurso</button></div><h4>Ciencia</h4>`); }; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-gact="legado"]'); if (!b) return; e.stopPropagation(); const n = playerNat(), Y = (world.player || {}).years || [], y = Y[Y.length - 1]; if (!n || !y) return;
  legShow(n, y.y, { score:y.score, facts:y.facts || [], newL:[] }, { pop:y.pop, towns:y.towns || natTowns(n).length, rank:y.rank }); }, true);
window.forceLegado = () => { const n = playerNat(); if (!n) return 'no'; const P = world.player; if (!P.legSnap) P.legSnap = legSnap(n); legYearEnd(n, P.legYear || 1); return 'ok'; }; // (para probar)
