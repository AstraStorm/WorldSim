// World Sim · Crisis: dilemas para tu nación
// ================= Crisis =================
// En el modo nación, de vez en cuando pasa algo que te obliga a decidir: hambre, sequía, epidemia, refugiados de una
// guerra cercana, un escándalo, una huelga general, una crisis económica, una cumbre del clima, el paro por los robots,
// una ola de inmigración… El juego se para y sale una carta con dos o tres respuestas: cada una tiene su precio
// (dinero, enfado, relaciones con otras naciones, leyes). Lo que elijas queda en la historia de tu nación
// (n.crises, y en el resumen anual de legado.js). Como mucho una carta cada día y pico; cada tipo tiene su descanso.
// Otros módulos pueden pedir una carta con crisisSoon(k, datos) (p. ej. la cumbre del clima).
const CRISIS_GAP = DAY_LEN * 1.2;
const crisisQ = [];
function crisisSoon(k, data){ if (typeof playerOn === 'function' && playerOn()) crisisQ.push({ k, data, t:yearT }); }
const cTowns = () => playerTowns();
const cCap = n => n;
const cP = n => (n.coin && ecOf(n) ? ecOf(n).P || 1 : 1);
const cPop = () => cTowns().reduce((a, g) => a + popOf(g), 0);
const cTreas = n => n.coin && ecOf(n) ? ecOf(n).treas : 0;
const cPay = (n, amt) => { const ec = n.coin && ecOf(n); if (!ec) return false; ec.treas -= amt; return true; };
const cAnger = (d, f) => { for (const g of cTowns()) if (!f || f(g)) g.anger = clamp((g.anger || 0) + d, 0, 100); };
const cLaw = (l, on) => { const n = playerNat(); if (!n || !LAW_TXT[l]) return; if (on && typeof lawAwake === 'function' && !lawAwake(n, l)) return; setPlayerLaw(l, on, 'para hacer frente a la crisis', .5); };
const cLawOk = l => { const n = playerNat(); return !!n && (!LAW_REQ[l] || LAW_REQ[l](n)) ? true : 'aún no se puede (falta lo que pide la ley)'; };
const cMoney = (n, amt) => !n.coin ? 'sin moneda no hay tesoro' : cTreas(n) < amt ? `el tesoro no llega (${Math.round(cTreas(n))} de ${Math.round(amt)})` : true;
const relW = (a, b, d) => { const r = rels.get(relKey(a, b)); if (r) r.v = clamp(r.v + d, -100, 100); };
const coinW = n => n.coin ? coinPl(n) : 'monedas';
// Gente de un lado (derecha/izquierda) más o menos contenta con lo que se decide
const cIdeoAnger = (side, d) => { for (const g of cTowns()) { const ps = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H); if (!ps.length) continue; const k = ps.filter(v => side > 0 ? (v.ideo || 0) > .25 : (v.ideo || 0) < -.25).length / ps.length; g.anger = clamp((g.anger || 0) + d * k * 2, 0, 100); } };

const CRISES = {
  hambre:{ ic:'🍞', cd:3, when:n => { const g = cTowns().find(g => popOf(g) >= 8 && g.food < popOf(g) * .5); return g ? { gid:g.id } : null; },
    title:(n, D) => `Hambre en ${villageById(D.gid).name}`,
    text:(n, D) => { const g = villageById(D.gid); return `Los graneros de ${g.name} están casi vacíos: quedan ${Math.floor(g.food)} raciones para ${popOf(g)} personas. Si no se hace nada, empezará a morir gente.`; },
    opts:(n, D) => { const g = villageById(D.gid), cost = Math.round(popOf(g) * 1.2 * cP(n)), friend = cFriend(n);
      return [
        { t:'Comprar comida fuera', d:`Cuesta ${cost} ${coinW(n)}; llegan ${popOf(g) * 2} raciones`, ok:() => cMoney(n, cost), fx:() => { cPay(n, cost); g.food += popOf(g) * 2; } },
        { t:'Racionar', d:'Nadie se muere de hambre esta vez, pero todo el mundo come menos: enfado', fx:() => { g.food += popOf(g) * .5; g.anger = Math.min(100, (g.anger || 0) + 12); } },
        { t:'Pedir ayuda internacional', d:friend ? `${friend.name} os manda comida; quedáis en deuda con ellos` : 'No tenéis amigos que puedan ayudar', ok:() => friend ? true : 'nadie os conoce lo bastante', fx:() => { g.food += popOf(g) * 1.5; relW(n, friend, 6); friend.food = Math.max(0, friend.food - popOf(g)); notify(`${friend.name} manda comida a ${g.name}, que pasa hambre`, { x:g.fx * T, y:g.fy * T }); } },
      ]; } },
  sequia:{ ic:'💧', cd:3, when:n => { const g = cTowns().find(g => g.sedAlarm && popOf(g) >= 6); return g ? { gid:g.id } : null; },
    title:(n, D) => `Sequía en ${villageById(D.gid).name}`,
    text:(n, D) => `Los pozos de ${villageById(D.gid).name} apenas dan agua y la gente empieza a pasar sed.`,
    opts:(n, D) => { const g = villageById(D.gid), cost = Math.round(popOf(g) * .8 * cP(n));
      return [
        { t:'Traer agua en carros', d:`Cuesta ${cost} ${coinW(n)}: ${popOf(g) * 2} cántaros`, ok:() => cMoney(n, cost), fx:() => { cPay(n, cost); g.jars = (g.jars || 0) + popOf(g) * 2; } },
        { t:'Cavar pozos de urgencia', d:'Todo el pueblo se pone a cavar: gasta madera y piedra', ok:() => (g.wood || 0) >= 6 && (g.stone || 0) >= 6 ? true : 'falta madera o piedra', fx:() => { g.wood -= 6; g.stone -= 6; g.jars = (g.jars || 0) + popOf(g); } },
        { t:'Racionar el agua', d:'Gratis, pero la gente lo pasa mal y se enfada', fx:() => { g.jars = (g.jars || 0) + Math.ceil(popOf(g) * .5); g.anger = Math.min(100, (g.anger || 0) + 10); } },
      ]; } },
  epidemia:{ ic:'🦠', cd:4, when:n => { const ep = epidemics.find(e => !e.over && cTowns().some(g => g.id === e.vid) && e.cases >= 3); return ep ? { gid:ep.vid, name:ep.name } : null; },
    title:(n, D) => `${D.name} en ${(villageById(D.gid) || {}).name}`,
    text:(n, D) => { const g = villageById(D.gid), sick = villagers.filter(v => !v.dead && v.vid === D.gid && v.sick).length; return `La ${D.name.toLowerCase()} se extiende por ${g.name}: ${sick} enfermos ahora mismo. Los médicos piden medidas.`; },
    opts:(n, D) => { const g = villageById(D.gid), cost = Math.round(popOf(g) * cP(n));
      return [
        { t:'Cuarentena', d:'Se cierra el pueblo: se contagia mucho menos, pero el comercio se para y la gente se enfada', ok:() => cLawOk('cuarentena'), fx:() => { cLaw('cuarentena', true); g.anger = Math.min(100, (g.anger || 0) + 6); } },
        { t:'Hospitales de campaña', d:`Cuesta ${cost} ${coinW(n)}: los enfermos se curan antes`, ok:() => cMoney(n, cost), fx:() => { cPay(n, cost); for (const v of villagers) if (!v.dead && v.vid === g.id && v.sick) { v.sick.sev *= .5; v.cared = yearT + DAY_LEN; } } },
        { t:'Que la vida siga', d:'Ni gastos ni cierres… y que sea lo que tenga que ser', fx:() => { g.anger = Math.min(100, (g.anger || 0) + 3); } },
      ]; } },
  refugiados:{ ic:'⛺', cd:5, when:n => { const w = [...rels.values()].find(r => r.war && r.war.att !== n.id && r.war.def !== n.id && villageById(r.war.def) && (r.war.dead || 0) >= 2 && Math.hypot(villageById(r.war.def).fx - n.fx, villageById(r.war.def).fy - n.fy) < 170); if (!w) return null; const from = nationOf(villageById(w.war.def)); return from !== n && !isPlayerG(from) ? { nid:from.id } : null; },
    title:(n, D) => `Refugiados de ${(villageById(D.nid) || {}).name}`,
    text:(n, D) => { const f = villageById(D.nid); return `La guerra ha arrasado ${f.name}. Familias enteras llegan a vuestra frontera pidiendo asilo. Parte de tu gente quiere ayudarlas; otra parte teme que no haya sitio ni trabajo para todos.`; },
    opts:(n, D) => { const f = villageById(D.nid);
      return [
        { t:'Acogerlos a todos', d:'Llegan unas ocho personas: mejor relación con ellos, pero a la derecha no le gusta', fx:() => cRefugees(n, f, 8, 'acoge a todos los refugiados') },
        { t:'Acoger un cupo', d:'Solo tres familias: un término medio', fx:() => cRefugees(n, f, 3, 'acoge un cupo de refugiados') },
        { t:'Cerrar la frontera', d:'Nadie entra: peor relación con ellos y la izquierda se indigna', fx:() => { relW(n, f, -12); cIdeoAnger(-1, 8); notify(`${n.name} cierra la frontera a los refugiados de ${f.name}`, { x:n.fx * T, y:n.fy * T }); } },
      ]; } },
  escandalo:{ ic:'📰', cd:6, when:n => { const g = cTowns().find(g => g.scandal && yearT - g.scandal.t < DAY_LEN * 2 && !g.scandal.card); if (g) { g.scandal.card = true; return { gid:g.id, who:g.scandal.who, amt:g.scandal.amt }; } return Math.random() < .04 && cPop() >= 30 && n.coin ? { who:(n.leader && n.leader.name) || 'un ministro', amt:Math.round(cPop() * cP(n) * .3), fake:true } : null; },
    title:() => 'Escándalo de corrupción',
    text:(n, D) => `La prensa publica que ${D.who} se ha quedado con ${D.amt} ${coinW(n)} de dinero público. Todo el país habla de ello.`,
    opts:(n, D) => [
      { t:'Exigir su dimisión', d:'Se va: la gente lo agradece, aunque el gobierno pierde a alguien de los suyos', fx:() => { cAnger(-8); n.scanOk = (n.scanOk || 0) + 1; } },
      { t:'Comisión de investigación', d:`Cuesta ${Math.round(D.amt * .5)} ${coinW(n)}; se calma poco a poco`, ok:() => cMoney(n, D.amt * .5), fx:() => { cPay(n, D.amt * .5); cAnger(-4); } },
      { t:'Negarlo todo', d:'Puede colar… o puede salir todo y ser mucho peor', fx:() => { if (Math.random() < .5) { cAnger(18); for (const g of cTowns()) g.grief = 'corrupción'; notify(`Sale a la luz que el gobierno de ${n.name} mintió sobre el escándalo de ${D.who}: indignación en la calle`, { x:n.fx * T, y:n.fy * T }); } } },
    ] },
  huelga:{ ic:'✊', cd:4, when:n => { const T0 = cTowns(), a = T0.reduce((s, g) => s + (g.anger || 0) * popOf(g), 0) / Math.max(1, cPop()), par = T0.reduce((s, g) => s + (g.jobless || 0), 0); return n.coin && cPop() >= 20 && (a > 45 || par >= 5) ? { a:Math.round(a), par } : null; },
    title:() => 'Huelga general',
    text:(n, D) => `Los sindicatos convocan una huelga general${D.par >= 5 ? ` por el paro (${D.par} personas sin trabajo)` : ''}: el descontento ya está en un ${D.a} %. Mañana el país puede pararse.`,
    opts:(n, D) => { const cost = Math.round(cPop() * cP(n) * .4);
      return [
        { t:'Negociar una subida', d:`Sueldos un 6 % más altos (cuesta ${cost} ${coinW(n)} ahora y más gasto después)`, ok:() => cMoney(n, cost), fx:() => { cPay(n, cost); for (const g of cTowns()) g.wageUp = (g.wageUp || 1) * 1.06; cAnger(-15); } },
        { t:'Aguantar', d:'Se hace la huelga: un día perdido y la gente sigue enfadada', fx:() => { for (const g of cTowns()) g.genStrike = yearT + DAY_LEN * .5; if (n.cycle) n.cycle.v = Math.max(-1, n.cycle.v - .15); cAnger(4); notify(`Huelga general en ${n.name}: el país se para durante medio día`, { x:n.fx * T, y:n.fy * T }); } },
        { t:'Mandar a la policía', d:'Se acaba la huelga… a palos. Mucho enfado y mala prensa', fx:() => { for (const g of cTowns()) { g.protest = null; } cAnger(14); cIdeoAnger(-1, 6); } },
      ]; } },
  crisis_eco:{ ic:'📉', cd:6, when:n => n.cycle && n.cycle.v < -.5 && n.coin ? {} : null,
    title:() => 'Crisis económica',
    text:n => `La economía de ${n.name} se hunde: cierran negocios, sube el paro y la bolsa cae. Los economistas no se ponen de acuerdo en qué hacer.`,
    opts:n => { const ec = ecOf(n), amt = Math.round(cPop() * cP(n));
      return [
        { t:'Plan de estímulo', d:'Gasto público para reactivar: se sale antes, pero sube la deuda', ok:() => cLawOk('estimulo'), fx:() => { cLaw('austeridad', false); cLaw('estimulo', true); n.cycle.v = Math.min(1, n.cycle.v + .15); } },
        { t:'Austeridad', d:'Recortes: baja la deuda, pero la crisis dura más y enfada', fx:() => { cLaw('estimulo', false); cLaw('austeridad', true); } },
        { t:'Rescatar a los bancos', d:`${amt} ${coinW(n)} de deuda nueva: la bolsa respira, pero a la izquierda le indigna`, fx:() => { if (ec) ec.debt += amt; n.cycle.v = Math.min(1, n.cycle.v + .3); cIdeoAnger(-1, 10); } },
      ]; } },
  cumbre:{ ic:'🌍', cd:0, when:() => null,
    title:(n, D) => `Cumbre del clima en ${D.host}`,
    text:(n, D) => `El planeta se ha calentado ${(world.warm || 0).toFixed(1).replace('.', ',')} °C. En ${D.host} piden a todas las naciones que recorten sus emisiones un ${Math.round(D.cut * 100)} %. Tu nación emite ${(n.emit || 0).toFixed(1).replace('.', ',')} al día.`,
    opts:(n, D) => [
      { t:'Firmar y cumplir', d:'Límite de emisiones en las fábricas: algo menos de producción, mejor relación con los firmantes', ok:() => cLawOk('limite_emisiones'), fx:() => { cJoin(n, D); cLaw('limite_emisiones', true); for (const id of D.members) { const o = villageById(id); if (o && o !== n) relW(n, o, 6); } } },
      { t:'Firmar… y ya veremos', d:'Queda bien en la foto; si luego no bajáis, los firmantes se enfadarán', fx:() => cJoin(n, D) },
      { t:'No firmar', d:'Las fábricas siguen a su ritmo; los firmantes y tu gente más verde lo critican', fx:() => { for (const id of D.members) { const o = villageById(id); if (o && o !== n) relW(n, o, -6); } cIdeoAnger(-1, 5); } },
    ] },
  robots:{ ic:'🤖', cd:6, when:n => { const k = villagers.filter(v => !v.dead && v.parado && v.parado.until > yearT && v.parado.why === 'los robots' && isPlayerG(villageById(v.vid))).length; return k >= 3 ? { k } : null; },
    title:() => 'Las máquinas y el trabajo',
    text:(n, D) => `${D.k} personas se han quedado sin trabajo porque los robots y la inteligencia artificial hacen lo que antes hacían ellas. Piden una solución.`,
    opts:() => [
      { t:'Renta básica', d:'Todos cobran algo cada día, trabajen o no: cuesta mucho al tesoro', ok:() => cLawOk('renta_basica'), fx:() => cLaw('renta_basica', true) },
      { t:'Impuesto a los robots', d:'Las empresas pagan por cada robot: dinero para el tesoro y se robotiza más despacio', ok:() => cLawOk('impuesto_robots'), fx:() => cLaw('impuesto_robots', true) },
      { t:'Es el progreso', d:'No hacer nada: ya encontrarán otro trabajo (o no)', fx:() => cAnger(6) },
    ] },
  inmigracion:{ ic:'🧳', cd:6, when:n => { const M = n.mig; if (!M) return null; const last = n.migCard || 0; return M.in - last >= 8 ? { k:M.in - last } : null; },
    title:() => 'Llegan inmigrantes',
    text:(n, D) => { n.migCard = (n.mig || {}).in || 0; return `En los últimos días han llegado ${D.k} personas de otros países buscando trabajo. Los empresarios están contentos; hay quien teme por sus sueldos.`; },
    opts:() => [
      { t:'Regularizarlos', d:'Papeles para todos: trabajan y pagan impuestos', ok:() => cLawOk('regularizacion'), fx:() => cLaw('regularizacion', true) },
      { t:'Control de fronteras', d:'Solo entra quien tenga papeles en regla', ok:() => cLawOk('control_fronteras'), fx:() => cLaw('control_fronteras', true) },
      { t:'Fronteras abiertas', d:'Que venga quien quiera: más gente, más trabajo… y más tensión', ok:() => cLawOk('fronteras_abiertas'), fx:() => cLaw('fronteras_abiertas', true) },
    ] },
};
// Un amigo que pueda ayudar: la nación conocida con mejor relación y comida de sobra
function cFriend(n){
  let best = null, bv = 10;
  for (const o of nationsAlive()) { if (o === n || isPlayerG(o)) continue; const r = rels.get(relKey(n, o)); if (!r || !r.known || r.war) continue; if (r.v > bv && o.food > popOf(o) * 2) { bv = r.v; best = o; } }
  return best;
}
function cRefugees(n, f, k, how){
  const from = natTowns(f).sort((a, b) => popOf(b) - popOf(a)), dest = cTowns().sort((a, b) => (houseCap(b) - popOf(b)) - (houseCap(a) - popOf(a)))[0]; if (!dest) return;
  let moved = 0;
  for (const g of from) for (const v of villagers.filter(u => !u.dead && u.vid === g.id && !u.away && u !== g.leader && !u.boat && !(u.task && ['asalto', 'detenido'].includes(u.task.k)))) { if (moved >= k) break; v.refugee = f.name; exile(v, g, dest); moved++; }
  relW(n, f, k >= 6 ? 15 : 7); cIdeoAnger(1, k >= 6 ? 8 : 3); cIdeoAnger(-1, -4);
  notify(`${n.name} ${how} de ${f.name}: ${moved} personas van a empezar una vida nueva en ${dest.name}`, { x:dest.fx * T, y:dest.fy * T });
}
function cJoin(n, D){ if (!D.members.includes(n.id)) { D.members.push(n.id); D.base[n.id] = n.emit || 0; } notify(`${n.name} firma el acuerdo de la cumbre del clima de ${D.host}`, { x:n.fx * T, y:n.fy * T }); }

// ---- La carta ----
let crisisOpen = null, crisisClock = 0;
function crisisShow(n, k, D){
  const C = CRISES[k], opts = C.opts(n, D), title = C.title(n, D), text = C.text(n, D);
  let el = $('crisisScreen'); if (!el) { el = document.createElement('div'); el.id = 'crisisScreen'; el.className = 'era crisis'; document.body.appendChild(el); el.addEventListener('click', ev => { const b = ev.target.closest('[data-cpick]'); if (b && !b.disabled) crisisPick(+b.dataset.cpick); }); }
  const oks = opts.map(o => o.ok ? o.ok() : true);
  el.innerHTML = `<div class="era-card cr-card" role="dialog" aria-modal="true" aria-labelledby="crTitle">
    <div class="era-ic">${C.ic}</div><div class="era-kick">${esc(n.name)} · día ${Math.floor(yearT / DAY_LEN) + 1} · tienes que decidir</div>
    <h2 id="crTitle">${esc(title)}</h2><p class="era-sub">${esc(text)}</p>
    <div class="cr-opts">${opts.map((o, i) => `<button class="cr-opt" data-cpick="${i}" type="button"${oks[i] === true ? '' : ' disabled'}><b>${esc(o.t)}</b><span>${esc(o.d)}</span>${oks[i] === true ? '' : `<em>${esc(oks[i])}</em>`}</button>`).join('')}</div></div>`;
  crisisOpen = { k, D, opts, title, speed:gameSpeed }; if (gameSpeed) setSpeed(0);
  el.hidden = false; requestAnimationFrame(() => el.classList.add('in')); snd('bell');
  if (!oks.some(x => x === true)) crisisPick(opts.length - 1, true);
}
function crisisPick(i, forced){
  const O = crisisOpen; if (!O) return; const n = playerNat(), o = O.opts[i]; crisisOpen = null;
  const el = $('crisisScreen'); if (el) { el.classList.remove('in'); el.hidden = true; }
  try { if (n && o) o.fx(); } catch (e) { console.error(e); }
  if (n) { (n.crises ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, k:O.k, t:O.title, pick:o ? o.t : '—' }); if (n.crises.length > 40) n.crises.shift(); lawLog(n, `${CRISES[O.k].ic} ${O.title}: ${o ? o.t.toLowerCase() : 'sin respuesta'}`); }
  if (O.speed && !forced) setSpeed(O.speed);
  if (typeof govRender === 'function') govRender(true);
}
SYSTEMS.push(dt => { try {
  if (!world || busy || (crisisClock -= dt) > 0) return; crisisClock = 12;
  if (!playerOn() || crisisOpen || (typeof eraShown !== 'undefined' && eraShown) || (typeof legadoOpen !== 'undefined' && legadoOpen)) return;
  const n = playerNat(); if (!n || !popOf(n)) { crisisQ.length = 0; return; }
  const P = world.player; if ((P.crisisT || 0) > yearT) return;
  const cd = n.crisisCD ||= {};
  let pick = null;
  while (crisisQ.length && !pick) { const q = crisisQ.shift(); if (yearT - q.t < DAY_LEN * 2 && CRISES[q.k]) pick = [q.k, q.data]; }
  if (!pick) for (const k of Object.keys(CRISES).sort(() => Math.random() - .5)) { if ((cd[k] || 0) > yearT) continue; const D = CRISES[k].when(n); if (D) { pick = [k, D]; break; } }
  if (!pick) return;
  cd[pick[0]] = yearT + DAY_LEN * (CRISES[pick[0]].cd || 3); P.crisisT = yearT + CRISIS_GAP;
  crisisShow(n, pick[0], pick[1]);
} catch (e) { console.error(e); } });
// En el resumen del gobierno: las últimas decisiones
{ const base = govSummary; govSummary = function(n){ const h = base.apply(this, arguments), L = (n.crises || []).slice(-4).reverse(); return L.length ? h.replace('<h4>Ciencia</h4>', `<h4>Decisiones difíciles</h4><ul class="log">${L.map(c => `<li class="pol"><span class="d">día ${c.d}</span>${CRISES[c.k] ? CRISES[c.k].ic : ''} ${esc(c.t)} → <b>${esc(c.pick)}</b></li>`).join('')}</ul><h4>Ciencia</h4>`) : h; }; }
window.forceCrisis = k => { const n = playerNat(); if (!n || !CRISES[k]) return 'no'; const D = k === 'cumbre' ? { host:n.name, cut:.3, members:[], base:{}, d:1 } : CRISES[k].when(n); if (!D) return 'no se dan las condiciones'; crisisShow(n, k, D); return k; }; // (para probar)
