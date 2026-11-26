// World Sim · Terrorismo: grupos radicales, atentados, secuestros de aviones y denuncias en el Consejo
// ================= Terrorismo =================
// · Los grupos nacen de agravios que ya hay en el mundo: religiosos (una guerra santa, la persecución de los de otra fe,
//   una ciudad conquistada por gente de otra religión, mucho fanatismo), políticos (represión, presos políticos,
//   ejecuciones y mucho enfado) o separatistas (provincias descontentas que hablan otra lengua). Cada uno con su nombre
// · Con fuerza suficiente atentan: una bomba en un edificio simbólico (mercado, ayuntamiento, templo, estación…) o, si
//   ya existe la aviación, secuestran un avión en vuelo y lo estrellan contra un edificio (a veces los pasajeros se
//   rebelan y cae en el campo). Contra su propio gobierno o contra la nación que odian
// · Seguridad: los espías, el tribunal y la ley antiterrorista desbaratan atentados y detienen a sus miembros; la ley,
//   a cambio, enfada (menos libertades). Sin agravios los grupos se van apagando
// · Patrocinio: una nación hostil puede financiar a un grupo contra su rival. Si los espías lo descubren, la víctima lo
//   denuncia en el Consejo de las Naciones (que vota sanciones) y el terrorismo pasa a ser un motivo de guerra
const TERROR_KIND = { religioso:'religioso', politico:'político', separatista:'separatista' };
const TERROR_TARGET = ['market', 'hall', 'temple', 'cathedral', 'station', 'parliament', 'tradehall', 'theater', 'coliseum', 'court', 'bank'];
REASON_TXT.terrorismo = 'el terrorismo';
const terrorOf = n => (n.terror ||= []);
const allGroups = () => liveTowns().filter(o => nationOf(o) === o).flatMap(n => terrorOf(n).map(G => [n, G]));
const natTowns = n => liveTowns().filter(o => nationOf(o) === n);
// Agravios de una nación: cuánto empuja a la gente a radicalizarse, y por qué
function grievances(n){
  const towns = natTowns(n), out = [];
  const holy = [...rels.values()].find(r => r.war && (r.war.att === n.id || r.war.def === n.id) && r.war.reason === 'religión');
  const zeal = villagers.filter(u => !u.dead && towns.some(o => o.id === u.vid) && (u.zeal || 0) > .7).length;
  const conq = towns.find(o => o.capturedFrom && o.faith && n.faith && o.faith.god !== n.faith.god);
  if (holy) { const foe = villageById(holy.war.att === n.id ? holy.war.def : holy.war.att); out.push({ k:'religioso', w:.5 + zeal * .03, foe }); }
  if (hasLaw(n, 'persecucion_religiosa')) out.push({ k:'religioso', w:.6, foe:null });
  if (conq) out.push({ k:'religioso', w:.4, foe:null, town:conq });
  if (zeal >= 6) out.push({ k:'religioso', w:zeal * .02, foe:liveTowns().find(o => nationOf(o) === o && o !== n && o.faith && n.faith && o.faith.god !== n.faith.god && (rels.get(relKey(o, n)) || {}).v < -30) || null });
  const angry = towns.reduce((a, o) => a + (o.anger || 0), 0) / Math.max(1, towns.length), pol = typeof prisonersOf === 'function' ? prisonersOf(n).filter(u => u.jail && u.jail.pol).length : 0;
  if ((n.repressed || 0) >= 2 || pol >= 2 || (tyranny(n) && angry > 40)) out.push({ k:'politico', w:.3 + (n.repressed || 0) * .08 + pol * .1 + angry / 200, foe:null });
  for (const o of towns) if (o !== n && (o.unrest || 0) > 50 && o.lang != null && o.lang !== n.lang) out.push({ k:'separatista', w:(o.unrest - 40) / 80, foe:null, town:o });
  return out;
}
function groupName(n, k, gr){
  const god = n.faith && n.faith.god, pl = gr.town ? gr.town.name : n.name, r = hashStr(n.name + k + yearT) % 4;
  if (k === 'religioso') return ['Hermandad de los Puros', `Mártires de ${god || 'la Fe'}`, `Espada de ${god || 'los Dioses'}`, 'Guardianes de la Fe'][r];
  if (k === 'separatista') return [`Frente de Liberación de ${pl}`, `${pl} Libre`, `Patria y Libertad de ${pl}`, `Ejército de ${pl}`][r];
  return ['Brigadas del Pueblo', 'Frente Revolucionario', 'Acción Directa', 'Células de la Resistencia'][r];
}
const security = n => (hasInst(n, 'espias') ? .25 : 0) + (natTowns(n).some(o => hasInst(o, 'tribunal')) ? .1 : 0) + (hasLaw(n, 'antiterrorista') ? .3 : 0) + (hasLaw(n, 'orden') ? .1 : 0);
let terrorT = 0;
SYSTEMS.push(dt => {
  if (!world || (terrorT -= dt) > 0) return; terrorT = 8;
  for (const n of liveTowns()) {
    if (nationOf(n) !== n || popOf(n) < 1) continue; const G = terrorOf(n);
    // Nacen grupos (rara vez: uno a la vez por causa; solo en naciones de cierto tamaño)
    if (natTowns(n).reduce((a, o) => a + popOf(o), 0) >= 25 && (n.terrorT || 0) < yearT) {
      n.terrorT = yearT + DAY_LEN;
      for (const gr of grievances(n)) {
        if (G.some(x => x.kind === gr.k && (!gr.town || x.town === gr.town.id))) continue;
        if (Math.random() < Math.min(.12, gr.w * .07)) {
          const name = groupName(n, gr.k, gr); G.push({ id:Math.random().toString(36).slice(2, 8), name, kind:gr.k, str:.3, since:Math.floor(yearT / DAY_LEN) + 1, foe:gr.foe ? nationOf(gr.foe).id : null, town:gr.town ? gr.town.id : null, sponsor:null, hits:0, log:[] });
          notify(`Nace en ${n.name} un grupo ${TERROR_KIND[gr.k]} radical: «${name}»${gr.foe ? `, contra ${nationOf(gr.foe).name}` : gr.k === 'separatista' ? `, que quiere separar ${gr.town.name}` : ', contra su gobierno'}`, { x:n.fx * T, y:n.fy * T });
          break;
        }
      }
    }
    // Crecen con los agravios (y con un patrocinador), se apagan sin ellos o con seguridad
    const grv = grievances(n);
    for (const x of G) {
      const fuel = grv.filter(g2 => g2.k === x.kind).reduce((a, g2) => a + g2.w, 0), sp = x.sponsor && villageById(x.sponsor) && popOf(villageById(x.sponsor)) ? .02 : 0;
      x.str = clamp(x.str + (fuel * .02 + sp - .012 - security(n) * .02) * 1, 0, 3);
      // ¿Atentan? (con fuerza, cada cierto tiempo)
      if (x.str >= 1 && !(x.nextT > yearT) && !isNight() && Math.random() < .35) { x.nextT = yearT + DAY_LEN * (2 + Math.random() * 2); terrorAttack(n, x); }
    }
    n.terror = G.filter(x => x.str > .05 || x.hits === 0 && yearT - x.since * DAY_LEN < DAY_LEN * 3);
    for (const x of G) if (!n.terror.includes(x)) notify(`El grupo «${x.name}» se disuelve en ${n.name}: ya nadie lo sigue`, { x:n.fx * T, y:n.fy * T });
    // Una nación hostil financia a un grupo de su rival (y los espías pueden descubrirlo)
    for (const x of n.terror) {
      if (!x.sponsor && Math.random() < .03) { const sp = liveTowns().find(o => nationOf(o) === o && o !== n && ((rels.get(relKey(o, n)) || {}).v < -50 || atWar(o, n)) && (tyranny(o) || (rels.get(relKey(o, n)) || {}).v < -75) && !(x.kind === 'religioso' && o.faith && n.faith && o.faith.god === n.faith.god && x.foe === o.id)); if (sp && x.foe !== sp.id) x.sponsor = sp.id; }
      if (x.sponsor && !x.exposed && hasInst(n, 'espias') && Math.random() < .06) exposeSponsor(n, x);
    }
  }
});
// Un atentado del grupo x (de la nación n): contra su propio gobierno o contra la nación que odia
function terrorAttack(n, x){
  const tn = x.foe && villageById(x.foe) && popOf(villageById(x.foe)) ? nationOf(villageById(x.foe)) : x.sponsor ? n : n;
  const towns = natTowns(tn).filter(o => !x.town || x.kind !== 'separatista' || o === n || o.id === x.town).sort((a, b) => popOf(b) - popOf(a)), tgt = towns[0]; if (!tgt) return;
  const bs = buildingsOf(tgt).filter(b => world.objs[b] && TERROR_TARGET.includes(world.objs[b].key.split(':')[0])); const b = bs[Math.floor(Math.random() * bs.length)]; if (b == null) return;
  const at = { x:(b % W) * T + 2, y:((b / W) | 0) * T + 3 };
  // La seguridad lo desbarata a veces: detenidos
  if (Math.random() < security(tn)) { const caught = 1 + Math.floor(Math.random() * 3); x.str = Math.max(0, x.str - .5); x.log.push({ d:Math.floor(yearT / DAY_LEN) + 1, t:`desbaratado en ${tgt.name}` });
    notify(`La policía de ${tn.name} desbarata un atentado de «${x.name}» en ${tgt.name}: ${caught} detenido${caught > 1 ? 's' : ''}`, at); return; }
  // Secuestrar un avión que vuele cerca (si ya hay aviones en el mundo)
  const p = typeof planes !== 'undefined' && planes.find(q => !q.hijack && !q.done && q.alt >= 30 && q.m.kind !== 'bombardeo' && Math.hypot(q.x - at.x, q.y - at.y) < 320 * T);
  if (p && Math.random() < .5) { p.hijack = { to:tgt.id, b, x:at.x, y:at.y - 6, g:x.name, n:n.id }; notify(`¡Secuestran un avión de ${villageById(p.g).name}! Los de «${x.name}» lo desvían hacia ${tgt.name}`, { x:p.x, y:p.y }); x.hits++; return; }
  terrorBlast(n, x, tn, tgt, b, at, 1);
}
// La explosión: el edificio, la gente de alrededor y lo que viene después
function terrorBlast(n, x, tn, tgt, b, at, k){
  if (typeof rocketBoomAt === 'function') rocketBoomAt(at.x, at.y, .7 * k); else addEffect(at.x, at.y, 'poof');
  const bName = world.objs[b] && OBJ[world.objs[b].key] ? OBJ[world.objs[b].key][0] : 'principal';
  if (world.objs[b]) damageBuilding(b, k >= 1.5 ? 1 : .7);
  let dead = 0; for (const v of villagers) if (!v.dead && !v.away && Math.hypot(v.x - at.x, v.y - at.y) < 16 * k && Math.random() < .55) { killVillager(v, 'atentado'); dead++; }
  x.hits++; x.log.push({ d:Math.floor(yearT / DAY_LEN) + 1, t:`${k >= 1.5 ? 'avión contra' : 'bomba en'} ${tgt.name} (${dead} muertos)` }); if (x.log.length > 8) x.log.shift();
  tgt.anger = Math.min(100, (tgt.anger || 0) + 10);
  notify(`¡Atentado en ${tgt.name}! ${k >= 1.5 ? 'Un avión secuestrado se estrella contra' : 'Estalla una bomba en'} el edificio «${bName}»: ${dead} muerto${dead === 1 ? '' : 's'}. Lo reivindica «${x.name}»`, at);
  if (typeof sendNews === 'function') sendNews(tn, `un atentado de «${x.name}» en ${tgt.name}`);
  if (typeof addFiesta === 'function' && dead >= 3) addFiesta(tgt, `Día de las víctimas de ${tgt.name}`);
  // Si lo financia otra nación (y ya se sabe), la víctima se le echa encima
  if (x.sponsor && x.exposed && tn !== nationOf(villageById(x.sponsor))) { const r = relOf(tn, villageById(x.sponsor)); r.v = clamp(r.v - 25, -100, 100); r.reason = 'terrorismo'; }
  if (x.foe && tn.id === x.foe && n !== tn) { const r = relOf(tn, n); r.v = clamp(r.v - 12, -100, 100); if (r.v < -40) r.reason = 'terrorismo'; } // (la nación de donde salen, sospechosa)
}
// Los espías descubren quién paga: denuncia en el Consejo (sanciones) y motivo de guerra
function exposeSponsor(n, x){
  const sp = villageById(x.sponsor); if (!sp || !popOf(sp)) { x.sponsor = null; return; } x.exposed = true;
  const r = relOf(n, sp); r.v = clamp(r.v - 30, -100, 100); r.reason = 'terrorismo';
  notify(`Los espías de ${n.name} descubren que ${sp.name} financia a «${x.name}»: lo denuncian ante el mundo`, { x:n.fx * T, y:n.fy * T });
  const C = typeof council === 'function' && council(); if (!C || !C.members.includes(n.id)) return;
  const members = C.members.map(villageById).filter(m => m && popOf(m) && m !== n && m !== sp), yes = members.filter(m => (typeof delegateOf !== 'function' || delegateOf(m)) && ((rels.get(relKey(m, sp)) || {}).v ?? 0) < ((rels.get(relKey(m, n)) || {}).v ?? 0) + 15).length, no = members.length - yes;
  let txt = `${n.name} denuncia ante el ${COUNCIL_NAME} que ${sp.name} financia el terrorismo («${x.name}»): ${yes} a favor de sancionar, ${no} en contra`;
  if (yes > no) { C.sanctions[sp.id] = { until:yearT + DAY_LEN * 5, why:'financiar el terrorismo' }; for (const m of members) { const q = relOf(m, sp); q.v = clamp(q.v - 8, -100, 100); } txt += `. ${sp.name} queda sancionado`; }
  else txt += '. No sale adelante';
  councilLog(txt); notify(txt, { x:villageById(C.seat).fx * T, y:villageById(C.seat).fy * T });
}
// El avión secuestrado (lo llama aviacion.js en vez de su vuelo normal): va hacia el edificio y se estrella; a veces
// los pasajeros se rebelan y cae en el campo
function hijackStep(p, dt){
  const H = p.hijack, dx = H.x - p.x, dy = H.y - p.y, d = Math.hypot(dx, dy), sp = 58 * dt;
  p.ang = Math.atan2(dy, dx); p.phase = 'ida';
  for (const u of p.crew || []) if (!u.dead) { u.x = p.x; u.y = p.y; }
  if (!H.fight && Math.random() < dt * .04) { H.fight = true; if (Math.random() < .35) { H.x = p.x + Math.cos(p.ang + 1.2) * 60; H.y = p.y + Math.sin(p.ang + 1.2) * 60; H.field = true; notify(`¡Los pasajeros se enfrentan a los secuestradores! El avión cae lejos de ${villageById(H.to) ? villageById(H.to).name : 'su objetivo'}`, { x:p.x, y:p.y }); } }
  if (d > sp) { p.x += dx / d * sp; p.y += dy / d * sp; if (d < 90) p.alt = Math.max(0, p.alt - dt * 26); return; }
  p.done = true; for (const u of p.crew || []) if (!u.dead) { u.inPlane = false; u.away = false; killVillager(u, 'atentado'); } p.crew = [];
  const tgt = villageById(H.to), n = villageById(H.n), x = n && terrorOf(n).find(q => q.name === H.g);
  if (H.field || !tgt || !x) { if (typeof rocketBoomAt === 'function') rocketBoomAt(p.x, p.y, .6); return; }
  terrorBlast(n, x, nationOf(tgt), tgt, H.b, { x:H.x, y:H.y + 6 }, 1.6);
}
// La ley antiterrorista: más seguridad, menos libertades
Object.assign(LAW_TXT, { antiterrorista:'ley antiterrorista' });
Object.assign(LAW_DESC, { antiterrorista:'más policía y vigilancia: se desbaratan muchos más atentados, pero la gente tiene menos libertades' });
Object.assign(LAW_LEAN, { antiterrorista:.4 });
Object.assign(LAW_REQ, { antiterrorista:g => allGroups().some(([n2, G]) => n2 === nationOf(g) || G.foe === nationOf(g).id) });
Object.assign(LAW_WHY, { antiterrorista:'ahora que hay atentados' });
SYSTEMS.push(dt => { if (!world || Math.random() > dt * .02) return; for (const g of liveTowns()) if (nationOf(g) === g && hasLaw(g, 'antiterrorista')) g.anger = Math.min(100, (g.anger || 0) + .3); });
// En la ficha (pestaña Política): los grupos de la nación y los que la atacan
function terrorCard(g){
  const n = nationOf(g), own = terrorOf(n), vs = allGroups().filter(([m, G]) => m !== n && G.foe === n.id);
  if (!own.length && !vs.length) return '';
  const row = (m, G) => `<div><b>${esc(G.name)}</b><span class="muted">${TERROR_KIND[G.kind]}${m !== n ? ` · de ${esc(m.name)}` : ''} · ${G.str >= 2 ? 'muy activo' : G.str >= 1 ? 'activo' : 'débil'} · ${G.hits} atentado${G.hits === 1 ? '' : 's'}${G.exposed && G.sponsor && villageById(G.sponsor) ? ` · financiado por ${esc(villageById(G.sponsor).name)}` : ''}${G.log.length ? ` · último: ${esc(G.log[G.log.length - 1].t)} (día ${G.log[G.log.length - 1].d})` : ''}</span></div>`;
  return `<h4>Terrorismo</h4><div class="laws">${own.map(G => row(n, G)).join('')}${vs.map(([m, G]) => row(m, G)).join('')}</div>`;
}
{ const base = justiceCard; justiceCard = function(g){ return base.apply(this, arguments) + terrorCard(g); }; }
