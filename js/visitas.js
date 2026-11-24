// World Sim · Visitas oficiales: el líder de una nación visita a otra amiga, escoltado por sus soldados
// ================= Visitas oficiales =================
// · De vez en cuando, el líder de una nación va a ver a una nación amiga. Va con escolta (sus mejores soldados) y en
//   el mejor transporte que tienen: dirigible o globo si pueden volar, barco si los dos tienen puerto y los separa el
//   mar, y si no, por tierra
// · Al llegar: mejoran mucho las relaciones, hablan de tratados y comercian; si saben de pirotecnia, fuegos en su honor
// · Los espías de los rivales se enteran: lo cuentan en casa y a veces preparan un atentado (la escolta lo defiende)
let visitClock = 0;
function stateVisitTick(dt){
  if (!world || (visitClock -= dt) > 0) return; visitClock = 10;
  for (const g of villages) {
    if (!popOf(g) || nationOf(g) !== g || !g.leader || g.leader.dead || g.leader.away || popOf(g) < 8) continue;
    if ((g.visitT ??= yearT + DAY_LEN * (1 + Math.random() * 2)) > yearT) continue;
    g.visitT = yearT + DAY_LEN * (2 + Math.random() * 2);
    const friends = villages.filter(o => o !== g && popOf(o) && nationOf(o) === o && (() => { const r = rels.get(relKey(g, o)); return r && r.known && !r.war && r.v > 35; })());
    if (!friends.length) continue;
    stateVisit(g, friends[Math.floor(Math.random() * friends.length)]);
  }
}
function stateVisit(g, o){
  const L = g.leader, esc = villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === g.id && u.weapon && !u.militia && u !== L && ageOf(u) >= ADULT_H && !(u.task && ['asalto', 'detenido'].includes(u.task.k))).slice(0, 3);
  const at = { x:g.fx * T, y:g.fy * T }, who = `${leaderTitle(g)} ${L.name}`;
  // En el aire: dirigible o globo (si hay uno listo y hace buen tiempo)
  const b = typeof parkedReady === 'function' ? parkedReady(g)[0] : null;
  if (b && flyWeather(g) && b.cap >= 2) {
    const tx = o.fx * T + 2, ty = o.fy * T + 14;
    b.mission = { kind:'visita', to:o.id, tx, ty, state:true }; b.crew = []; board(L, b); for (const u of esc.slice(0, b.cap - 1)) board(u, b);
    b.state = 'embarque'; b.waitT = 2; b.pilot = L;
    notify(`¡Visita oficial! ${capFirst(who)} de ${g.name} viaja en ${knowsSci(g, 'dirigible') ? 'dirigible' : 'globo'} a ${o.name}, con ${b.crew.length - 1} de escolta`, at);
    spiesHear(g, o); return;
  }
  // Por mar o por tierra: con su escolta al lado
  const crew = [L, ...esc];
  const home = g.port && o.port ? [(g.port.launch % W) * T + 2, ((g.port.launch / W) | 0) * T + 3] : [L.x, L.y];
  const dest = g.port && o.port ? [(o.port.launch % W) * T + 2, ((o.port.launch / W) | 0) * T + 3] : [o.fx * T + 2, o.fy * T + 9];
  const sea = !!(g.port && o.port && lineWater(home[0], home[1], dest[0], dest[1]) > .6);
  for (const u of crew) { releaseTask(u); dismount(u); u.task = { k:'viaje' }; u.away = true; u.sleep = false; }
  travelers.push({ kind:'visita', v:L, crew, from:g.id, to:o.id, x:sea ? home[0] : L.x, y:sea ? home[1] : L.y, tx:dest[0], ty:dest[1], hx:home[0], hy:home[1], sea, phase:'ida', dir:1 });
  notify(`¡Visita oficial! ${capFirst(who)} de ${g.name} sale hacia ${o.name} ${sea ? 'en barco' : 'por tierra'}, escoltado por ${esc.length} soldado${esc.length === 1 ? '' : 's'}`, at);
  spiesHear(g, o);
}
// Al llegar (también desde el globo o el dirigible: globos.js)
function stateVisitArrive(L, crew, from, to){
  if (!from || !to || !popOf(to)) return;
  const r = relOf(from, to), at = { x:to.fx * T, y:to.fy * T };
  r.v = clamp(r.v + 15, -100, 100); doTrade(from, to); shareCharts(from, to);
  if (typeof treatyTick === 'function') treatyTick(from, to, r); // hablan de tratados
  notify(`${L ? `${L.name}, de ${from.name},` : `La delegación de ${from.name}`} llega a ${to.name} en visita oficial: banquete, regalos y buenas palabras`, at);
  if (typeof fireworksShow === 'function') fireworksShow(to, 8, `por la visita de ${from.name}`);
  // ¿Un atentado preparado por los espías rivales?
  if (to.plot && to.plot.on === from.id) {
    const p = to.plot; to.plot = null; const guards = (crew || []).filter(u => !u.dead && u !== L && u.weapon).length;
    if (guards >= 2 && Math.random() < .75) notify(`¡La escolta de ${from.name} frustra un atentado en ${to.name}! Los agentes de ${villageById(p.by)?.name || 'un rival'} huyen`, at);
    else if (L && !L.dead) {
      if (Math.random() < .3) { notify(`¡Atentado en ${to.name}! Muere ${L.name}, de ${from.name}, durante la visita oficial. Las sospechas apuntan a ${villageById(p.by)?.name || 'un rival'}`, at); L.away = false; killVillager(L, 'atentado'); }
      else { L.hp = Math.max(.15, (L.hp ?? 1) - .5); notify(`¡Atentado en ${to.name}! ${L.name}, de ${from.name}, sale herido de la visita oficial`, at); }
      const rb = villageById(p.by); if (rb) { const r2 = relOf(from, rb); r2.v = clamp(r2.v - 30, -100, 100); }
    }
  }
}
// Los espías de los rivales se enteran de la visita (y a veces preparan algo)
function spiesHear(g, o){
  for (const s of villages) {
    if (s === g || s === o || !popOf(s) || nationOf(s) !== s || !(s.know || {}).escritura) continue;
    const r1 = rels.get(relKey(s, g)), r2 = rels.get(relKey(s, o)), hostile = (r1 && (r1.war || r1.v < -20)) || (r2 && (r2.war || r2.v < -20));
    if (!hostile || Math.random() > (hasInst(s, 'espias') ? .8 : .4)) continue;
    notify(`Los espías de ${s.name} se enteran de la visita de ${g.name} a ${o.name} y lo cuentan en casa`, { x:s.fx * T, y:s.fy * T });
    if (Math.random() < .25 && !o.plot) { o.plot = { by:s.id, on:g.id }; notify(`En ${s.name} traman algo contra la delegación de ${g.name}...`, { x:s.fx * T, y:s.fy * T }); }
    break;
  }
}
SYSTEMS.push(dt => stateVisitTick(dt));
