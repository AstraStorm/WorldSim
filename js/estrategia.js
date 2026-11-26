// World Sim · Estrategia de guerra: objetivos, defensa del pueblo, qué hacer con los conquistados, ruinas y espías
// ================= Estrategia =================
// · Cada guerra tiene un objetivo según su motivo: conquistar (territorio, raza, salida al mar), imponer su fe,
//   saquear (recursos, oro), capturar esclavos o castigar (rencor, venganza, honor). La guerra no se acaba sola:
//   termina al lograrlo, con la conquista, con un tratado de paz si a los dos les interesa (o por un diplomático),
//   o cuando un bando está agotado y se rinde
// · Si vienen a por el pueblo, todos los adultos que pueden cogen horcas y palos y lo defienden (la milicia)
// · Los asaltos van a por lo que más duele: el almacén, el ayuntamiento, la mina o el mercado (y, con un informe de
//   sus espías, a por su punto débil); si los rechazan, se retiran y vuelven antes, con refuerzos. Los globos y
//   dirigibles bombardean esos mismos sitios
// · Tras conquistar un pueblo deciden qué hacer con su gente: adoptarlos como ciudadanos, esclavizarlos o (algunas
//   fes y tiranías) sacrificar a unos cuantos
// · Ruinas: las que están cerca de una nación pasan a ser suyas; las lejanas, una vez exploradas, las estudian para ver
//   si sale a cuenta fundar allí una ciudad (madera, piedra, minerales, agua y tierra buena)
// · Espías: además de lo de siempre, traen informes de guerra (soldados, arqueros, punto débil) o roban dinero del tesoro
Object.assign(REASON_TXT, { esclavos:'capturar esclavos', honor:'una ofensa a su honor', puerto:'una salida al mar', oro:'el oro de sus minas', venganza:'vengar a sus muertos' });
const GOAL_TXT = { conquista:'conquistar', conversion:'imponer su fe a', saqueo:'saquear', esclavos:'capturar esclavos en', castigo:'castigar a' };
const GOAL_OF = { territorio:'conquista', raza:'conquista', puerto:'conquista', 'religión':'conversion', recursos:'saqueo', oro:'saqueo', esclavos:'esclavos', rencor:'castigo', venganza:'castigo', honor:'castigo', alianza:'castigo', 'guerra civil':'conquista' };
const natPopOf = g => villages.filter(o => popOf(o) && nationOf(o) === nationOf(g)).reduce((a, o) => a + popOf(o), 0);
// El objetivo de la guerra (con algún motivo nuevo según lo que tienen los dos)
function warGoal(r, att, def){
  const W0 = r.war; if (W0.goal) return W0.goal;
  let why = W0.reason;
  if (!W0.civil && why !== 'alianza') {
    const roll = Math.random();
    if (slaving(att) && roll < .3) why = 'esclavos';
    else if (def.port && !att.port && roll < .5) why = 'puerto';
    else if (hasMine(def) && !hasMine(att) && roll < .6) why = 'oro';
    else if (r.lastWar && roll < .7) why = 'venganza';
    else if ((r.spyCaughtT || -1e9) > yearT - DAY_LEN * 3 && roll < .8) why = 'honor';
  }
  W0.reason = why; W0.goal = GOAL_OF[why] || 'saqueo';
  const dp = natPopOf(def); W0.pop0 = { a:natPopOf(att), d:dp };
  W0.need = { saqueo:3, esclavos:4, castigo:Math.max(4, Math.round(dp * .25)), conversion:Math.max(3, Math.round(dp * .2)) }[W0.goal] || 0;
  if (W0.goal === 'conversion' && (!att.faith || (def.faith && def.faith.god === att.faith.god))) W0.goal = 'castigo';
  notify(`El objetivo de ${att.name} en esta guerra: ${GOAL_TXT[W0.goal]} ${def.name} (por ${REASON_TXT[why] || why})`, { x:def.fx * T, y:def.fy * T });
  return W0.goal;
}
// ¿Se acaba la guerra? Al lograr su objetivo, por agotamiento (el agotado se rinde o pide la paz) o tras mucho tiempo
// si a los dos les interesa. Devuelve true si se ha firmado la paz
function warEndCheck(a, b, att, def, r){
  const W0 = r.war, goal = warGoal(r, att, def), la = W0.lossA || 0, ld = W0.lossD || 0, P = W0.pop0 || { a:natPopOf(att), d:natPopOf(def) };
  const done = goal === 'saqueo' ? (W0.loots || 0) >= W0.need : goal === 'esclavos' ? (W0.captives || 0) >= W0.need : goal === 'castigo' ? ld >= W0.need : goal === 'conversion' ? ld >= W0.need : false;
  if (done) {
    if (goal === 'conversion' && att.faith) { for (const o of villages) if (nationOf(o) === nationOf(def)) o.faith = { ...att.faith, pantheon:[...(att.faith.pantheon || [])] }; makePeace(a, b, r, `y ${def.name} acepta la fe de ${att.faith.god}`); }
    else makePeace(a, b, r, `${att.name} ha logrado lo que quería (${GOAL_TXT[goal]} ${def.name})`);
    return true;
  }
  // Agotados: han caído muchos para lo que eran
  const tiredA = la >= Math.max(4, P.a * .25), tiredD = ld >= Math.max(4, P.d * .25), long = yearT - W0.start > DAY_LEN * 10;
  if (tiredD && !tiredA) { // se rinde el atacado: paga un tributo y acepta lo que le piden
    const take = Math.min(def.food * .4, 60); def.food -= take; att.food += take;
    const ed = ecOf(def), ea = ecOf(att); if (ed && ea && ed.treas > 0) { const g0 = Math.round(ed.treas * .3); ed.treas -= g0; ea.treas += Math.round(g0 / ed.P * ea.P); }
    if (goal === 'conquista' && popOf(def) <= 12) { conquer(nationOf(att), def, r); return true; }
    makePeace(a, b, r, `${def.name} se rinde y paga un tributo a ${att.name}`); return true;
  }
  if (tiredA && Math.random() < .02) { // el atacante pide la paz: el otro la acepta si le interesa
    if (tiredD || ld > 2 || Math.random() < .5) { makePeace(a, b, r, `${att.name}, agotado, pide la paz y ${def.name} la acepta`); return true; }
  }
  if (long && Math.random() < .004 * (tiredA + tiredD + 1)) { makePeace(a, b, r, 'tras tanto tiempo de guerra, les interesa a los dos'); return true; }
  return false;
}
// ---- Los sitios que más duelen: el almacén, el ayuntamiento, la mina, el mercado... ----
function vitalTargets(g){
  const out = [];
  for (const i of buildingsOf(g)) { const o = world.objs[i]; if (!o) continue; const k = o.key.split(':')[0], w = { store:5, hall:4, mine:4, market:3, granary:3, barracks:3, bank:3, smith:2, factory:2 }[k]; if (w) out.push([i, w]); }
  if (g.mine != null && world.objs[g.mine] && !out.some(([i]) => i === g.mine)) out.push([g.mine, 4]);
  return out.sort((p, q) => q[1] - p[1]).map(([i]) => i);
}
const bldLabel = i => { const o = world.objs[i]; return o ? (o.key.startsWith('house') ? 'una casa' : `el ${bldName(o)}`) : 'un edificio'; };
// Al lanzar un asalto: a por un sitio clave (el que diga el informe de sus espías, si lo tienen)
{ const base = launchRaid; launchRaid = function(att, def, r){
  const before = new Set(villagers.filter(v => v.task && v.task.k === 'asalto').map(v => v.task.grp));
  base.apply(this, arguments);
  const r0 = r || warRel(att, def), intel = r0 && r0.war && r0.war.intel && yearT - r0.war.intel.t < DAY_LEN * 3 ? r0.war.intel : null;
  const G = villagers.map(v => v.task && v.task.k === 'asalto' && v.task.grp).find(g => g && !before.has(g)); if (!G || !def) return;
  const tg = intel && intel.weak != null && world.objs[intel.weak] ? intel.weak : vitalTargets(def)[0];
  if (tg == null) return;
  G.vital = tg; G.enemy = def.id;
  const bx = (tg % W) * T + 2, by = ((tg / W) | 0) * T + T + 3;
  for (const v of G.ps) if (v.task && v.task.k === 'asalto') { v.task.x = bx + (Math.random() - .5) * 8; v.task.y = by + Math.random() * 4; }
  if (G.ps.length >= 3) notify(`Las tropas de ${att.name} van a por ${bldLabel(tg)} de ${def.name}${intel ? ' (lo dice el informe de sus espías)' : ''}`, { x:bx, y:by });
}; }
// ---- Cada poco: objetivos, sitios clave, milicia, retiradas y ruinas ----
let stratClock = 0;
function strategyTick(dt){
  if (!world || !villages.length || (stratClock -= dt) > 0) return; stratClock = .5;
  // Asaltos que llegan a su sitio clave: lo queman y lo destrozan, y siguen hacia el centro del pueblo
  const groups = new Set(villagers.filter(v => !v.dead && v.task && v.task.k === 'asalto' && v.task.grp && v.task.grp.vital != null).map(v => v.task.grp));
  for (const G of groups) {
    const i = G.vital, bx = (i % W) * T + 2, by = ((i / W) | 0) * T + 3, eg = villageById(G.enemy), alive = G.ps.filter(u => !u.dead && u.task && u.task.k === 'asalto');
    if (!world.objs[i] || !eg) { G.vital = null; continue; }
    if (!alive.some(u => Math.hypot(u.x - bx, u.y - by) < 14)) continue;
    damageBuilding(i, .35); if (world.objs[i] && !fires.has(i) && fires.size < 260) fires.set(i, { t:0, life:10, tree:true, bld:true });
    const o = world.objs[i], k = o ? o.key.split(':')[0] : '';
    if (k === 'store') { const lost = Math.min(eg.food, eg.food * .5); eg.food -= lost; eg.wood = Math.max(0, eg.wood * .6); }
    if (k === 'bank' || k === 'market') { const e = ecOf(eg); if (e) e.treas = Math.round(e.treas * .7); }
    notify(`¡Los asaltantes queman ${bldLabel(i)} de ${eg.name}!`, { x:bx, y:by }); misfortune(eg, 'guerra');
    G.vital = null; for (const u of alive) { u.task.x = eg.fx * T + 2; u.task.y = eg.fy * T + 10; }
  }
  // Rechazados: se retiran y vuelven antes, con refuerzos
  for (const r of rels.values()) {
    if (!r.war) continue; const att = villageById(r.war.att), def = villageById(r.war.def); if (!att || !def) continue;
    warGoal(r, att, def);
    if ((r.war.repelledSeen || 0) < (milOf(att).repelled || 0) + (milOf(def).repelled || 0)) {
      r.war.repelledSeen = (milOf(att).repelled || 0) + (milOf(def).repelled || 0);
      r.war.raidT = Math.min(r.war.raidT, yearT - 55); // vuelven a atacar antes
      notify(`Los de ${att.name} se retiran para reagruparse: volverán con refuerzos`, { x:att.fx * T, y:att.fy * T });
    }
    // Capturas: en cada saqueo, si quieren esclavos (o la ley lo permite), se llevan a alguien
    if ((r.war.loots || 0) > (r.war.lootSeen || 0)) {
      r.war.lootSeen = r.war.loots;
      if (r.war.goal === 'esclavos' || (slaving(att) && Math.random() < .4)) {
        const vic = villagers.filter(u => !u.dead && !u.away && !u.slave && nationOf(villageById(u.vid) || {}) === nationOf(def) && ageOf(u) >= ADULT_H && !villages.some(o => o.leader === u) && Math.hypot(u.x / T - def.fx, u.y / T - def.fy) < 18).slice(0, 2);
        for (const u of vic) { enslave(u, att, 'tras ser capturado en un saqueo'); u.vid = att.id; u.task = null; u.home = null; r.war.captives = (r.war.captives || 0) + 1; }
      }
    }
  }
  militiaTick();
  if ((stratClock2 -= .5) <= 0) { stratClock2 = 20; ruinsTick(); }
}
let stratClock2 = 5;
SYSTEMS.push(dt => strategyTick(dt));
// ---- La milicia: si vienen a por el pueblo, todos los adultos que pueden lo defienden con horcas y palos ----
function militiaTick(){
  const raiders = villagers.filter(v => !v.dead && !v.away && v.task && v.task.k === 'asalto');
  for (const g of villages) {
    if (!popOf(g)) continue;
    const near = raiders.filter(v => { const o = villageById(v.vid); return o && Math.hypot(v.x / T - g.fx, v.y / T - g.fy) < 24 && enemyOf(v, { vid:g.id }); });
    if (near.length) {
      if (!g.militiaT || yearT - g.militiaT > 60) notify(`¡En ${g.name} todos cogen horcas y palos para defender el pueblo!`, { x:g.fx * T, y:g.fy * T });
      g.militiaT = yearT;
      for (const u of villagers) {
        if (u.dead || u.away || u.vid !== g.id || u.weapon || u.slave || u.boat || inCamp(u) || ageOf(u) < ADULT_H || ageOf(u) > (u.life || 20) * .75 || (u.hp ?? 1) < .4) continue;
        u.weapon = 'horca'; u.militia = true; u.sleep = false; if (Math.random() < .3) floats.push({ x:u.x, y:u.y - 14, txt:['¡A defender el pueblo!', '¡Fuera de aquí!', '¡Por nuestras casas!'][Math.floor(Math.random() * 3)], col:'#f0e0a0', life:0 });
      }
    } else if (g.militiaT && yearT - g.militiaT > 40) { // pasado el peligro, vuelven a lo suyo
      g.militiaT = 0; for (const u of villagers) if (u.militia && u.vid === g.id) { u.weapon = null; u.militia = false; }
    }
  }
}
// ---- Tras la conquista: qué hacen con la gente del pueblo conquistado ----
{ const base = conquer; conquer = function(cap, eg, r){
  const was = nationOf(eg); base.apply(this, arguments);
  eg.capturedFrom = was === eg ? eg.name : was.name; // en su cartel: «capturada · antes …» (la antigua nación)
  const people = villagers.filter(u => !u.dead && !u.away && u.vid === eg.id && ageOf(u) >= ADULT_H && u !== eg.leader);
  if (!people.length) return;
  const cruel = tyranny(cap), w = { adoptar:2 + (votes(cap) ? 2 : 0) + (hasLaw(cap, 'derechos_humanos') ? 4 : 0), esclavos:slaving(cap) ? 3 + (cruel ? 1 : 0) : 0, sacrificio:cap.faith && (cruel || ['volcan', 'sangre'].includes(typeof riteOf === 'function' ? riteOf(cap) : '')) && !hasLaw(cap, 'derechos_humanos') ? 1 : 0 };
  let k = Math.random() * (w.adoptar + w.esclavos + w.sacrificio), fate = 'adoptar'; for (const [f, x] of Object.entries(w)) if ((k -= x) < 0) { fate = f; break; }
  const at = { x:eg.fx * T, y:eg.fy * T };
  if (fate === 'esclavos') {
    const n = Math.max(1, Math.round(people.length * (.3 + Math.random() * .25)));
    for (const u of people.sort(() => Math.random() - .5).slice(0, n)) { enslave(u, cap, `tras la conquista de ${eg.name}`); u.vid = cap.id; u.home = null; u.task = null; }
    notify(`${cap.name} esclaviza a ${n} habitantes de ${eg.name} y se los lleva a trabajar sin sueldo`, at); eg.unrest = (eg.unrest || 0) + 30;
  } else if (fate === 'sacrificio') {
    const n = Math.min(3, people.length);
    for (const u of people.sort(() => Math.random() - .5).slice(0, n)) killVillager(u, 'sacrificio');
    notify(`¡Los sacerdotes de ${cap.name} sacrifican a ${n} habitantes de ${eg.name} a ${cap.faith ? cap.faith.god : 'sus dioses'}!`, at); eg.unrest = (eg.unrest || 0) + 45;
    for (const o of villages) if (o !== cap && popOf(o)) { const r2 = rels.get(relKey(o, cap)); if (r2) r2.v = clamp(r2.v - 15, -100, 100); } // el mundo se horroriza
  } else { eg.unrest = Math.max(0, (eg.unrest || 0) - 25); notify(`${cap.name} adopta a los habitantes de ${eg.name} como ciudadanos de pleno derecho`, at); }
}; }
// ---- Ruinas: las cercanas, propias; las lejanas, ¿sale a cuenta? ----
function ruinWorth(o){
  let s = 0; for (let y = o.y - 8; y <= o.y + 8; y++) for (let x = o.x - 8; x <= o.x + 8; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x, ob = world.objs[i];
    if (WATER[world.biome[i]]) { s += FRESH(world.biome[i]) ? .5 : .1; continue; }
    if ([B.GRASS, B.PLAINS, B.FOREST].includes(world.biome[i])) s += .15;
    if (ob) { const kd = OBJ[ob.key][1]; s += kd === 'mineral' ? 3 : kd === 'tree' ? .4 : kd === 'stone' ? .6 : 0; }
  }
  return s;
}
function ruinsTick(){
  if (!world.ruins) return;
  for (const o of world.ruins) {
    if (!o.seen) continue;
    const cand = villages.filter(g => popOf(g) && nationOf(g) === g).map(g => [g, Math.hypot(g.fx - o.x, g.fy - o.y)]).sort((p, q) => p[1] - q[1]);
    const near = cand[0]; if (!near) continue;
    const [g, d] = near;
    if (d < 24 && o.owner !== g.id) { o.owner = g.id; o.by = g.id; g.research = (g.research || 0) + 10; notify(`${g.name} hace suyas ${o.name}, que están dentro de su territorio`, { x:o.x * T, y:o.y * T }); continue; }
    if (d >= 24 && d < 90 && !o.studied && popOf(g) >= 30) { // las estudian: ¿compensa una ciudad allí?
      o.studied = g.id; const worth = ruinWorth(o); o.worth = worth;
      if (worth > 45) { o.want = g.id; notify(`Los sabios de ${g.name} estudian ${o.name}: hay buena tierra, agua y recursos alrededor. ¡Sale a cuenta fundar una ciudad allí!`, { x:o.x * T, y:o.y * T }); }
      else notify(`${g.name} estudia ${o.name}, pero no compensa: hay poco que sacar alrededor`, { x:o.x * T, y:o.y * T });
    }
  }
}
// Al fundar una ciudad, prefieren levantarla sobre unas ruinas que les compensan
{ const base = citySite; citySite = function(g){
  const o = (world.ruins || []).find(r => (r.want === g.id || (r.owner === g.id && Math.hypot(r.x - g.fx, r.y - g.fy) > 18)) && !r.rebuilt && !villages.some(v => popOf(v) && Math.hypot(v.fx - r.x, v.fy - r.y) < 16));
  if (o) { const p = ringFind(o.x, o.y + 3, 8, (x, y) => tileFree(x, y) && !volcDanger(x, y, 8)); if (p) { o.rebuilt = g.id; setTimeout(() => notify(`La nueva ciudad de ${g.name} se levanta sobre ${o.name}`, { x:o.x * T, y:o.y * T }), 4000); return p; } }
  return base.apply(this, arguments);
}; }
// ---- Espías: informes de guerra y robo de dinero ----
function spyReport(from, to){
  const r = warRel(from, to) || relOf(from, to), ps = villagers.filter(u => !u.dead && nationOf(villageById(u.vid) || {}) === nationOf(to) && ageOf(u) >= ADULT_H);
  const armed = ps.filter(u => u.weapon && !u.militia).length, archers = ps.filter(u => isRanged(u.weapon)).length, weak = vitalTargets(to)[0];
  const intel = { t:yearT, armed, archers, weak, by:from.id };
  if (r.war) r.war.intel = intel; else r.intel = intel;
  notify(`El espía de ${from.name} trae un informe de ${to.name}: ${armed} soldados, ${archers} arqueros${weak != null ? `; su punto débil es ${bldLabel(weak)}` : ''}${archers < 2 && balloonsOf(from).length ? '. Apenas tienen arqueros: ¡buen momento para atacar desde el aire!' : ''}`, { x:to.fx * T, y:to.fy * T });
}
function spyRob(from, to){
  const et = ecOf(to), ef = ecOf(from), at = { x:to.fx * T, y:to.fy * T };
  if (et && et.treas > 0) { const t0 = Math.round(et.treas * (.1 + Math.random() * .12)); et.treas -= t0; if (ef) ef.treas += Math.round(t0 / et.P * ef.P); else from.gold = (from.gold || 0) + Math.ceil(t0 / et.P / 6); notify(`¡Desaparecen ${t0} ${to.coin ? coinPl(to) : 'monedas'} del tesoro de ${to.name}! Nadie sabe quién ha sido`, at); }
  else if ((to.gold || 0) > 0) { const n = Math.ceil(to.gold * .3); to.gold -= n; from.gold = (from.gold || 0) + n; notify(`Roban ${n} de oro de los almacenes de ${to.name}`, at); }
  else notify(`Un ladrón entra en el tesoro de ${to.name}, pero está vacío`, at);
}
// ---- Lo importante, en el centro: tribunal, parlamento, universidad, banco, hospital… ----
// Buscan el solar libre más cerca del centro (donde la muralla los protege). Si el centro está lleno, derriban la
// cabaña más céntrica (sus vecinos se mudan y se hacen otra casa más afuera) y lo levantan allí; como mucho una al día
const CENTRAL = new Set(['tribunal', 'parlamento', 'academia', 'universidad', 'consejo', 'banco', 'hospital', 'escuela', 'imprenta', 'almacen', 'granero']);
function centralFits(g, kind, x, y){
  const [hw, hh] = KIND_DIMS[kind] || [4, 6];
  return x > hw && y > hh + 1 && x < W - hw - 1 && y < H - 3 && !buildingClash(x, y, kind) && !penOverlap(g, x - hw, y - hh, x + hw, y + 1) && !plazaIn(x - hw, y - hh, x + hw, y) && !farmIn(x - hw, y - hh, x + hw, y + 1) && !pathIn(x - hw, y - hh, x + hw, y) && clearable(x - hw, y - hh, x + hw, y + 1) && !hallIn(g, x - hw, y - hh, x + hw, y + 1);
}
{ const base = planSite; planSite = function(g, kind){
  if (!CENTRAL.has(kind)) return base.apply(this, arguments);
  const C = g.centralC; if (C && C.kind === kind && C.t === yearT) return C.p; // (bestSite pregunta varias veces seguidas)
  if ((g.centralFull || {})[kind] > yearT) return base.apply(this, arguments); // el centro estaba lleno hace poco: ni se busca
  const p = centralPlan(g, kind); g.centralC = { kind, t:yearT, p }; if (!p) (g.centralFull ||= {})[kind] = yearT + DAY_LEN; return p || base.apply(this, arguments);
}; }
function centralPlan(g, kind){ {
  const ring = (r0, r1) => { for (let r = r0; r <= r1; r++) for (let k = 0; k < r * 6; k++) { const a = k / (r * 6) * Math.PI * 2, x = Math.round(g.fx + Math.cos(a) * r), y = Math.round(g.fy + 3 + Math.sin(a) * r * .8); if (centralFits(g, kind, x, y)) return [x, y]; } return null; };
  const c = ring(4, 14); if (c) return c;
  // Lleno: se derriba la cabaña más céntrica para hacer sitio (si sobran casas o es un edificio de mucho peso)
  const huts = housesOf(g).filter(h => world.objs[h].key === 'house:hut').sort((a, b) => Math.hypot(a % W - g.fx, ((a / W) | 0) - g.fy) - Math.hypot(b % W - g.fx, ((b / W) | 0) - g.fy));
  // (solo si sobra sitio para vivir sin ella: antes derribaban casas aunque la gente durmiera al raso, y la ciudad se quedaba sin casas)
  const h = huts[0], spare = houseCap(g) - (h != null ? houseRoom(h) : 0) >= popOf(g) + 2, heavy = !['almacen', 'granero', 'escuela'].includes(kind);
  if (h != null && Math.hypot(h % W - g.fx, ((h / W) | 0) - g.fy) < 14 && (spare || (heavy && houseCap(g) >= popOf(g) + 6)) && !(g.demolishT > yearT)) { // (la familia se hará otra casa más afuera)
    const x = h % W, y = (h / W) | 0, o = world.objs[h]; world.objs[h] = null; const fits = centralFits(g, kind, x, y); world.objs[h] = o;
    if (!fits) return ring(15, 24); // (si ni quitándola cabe, no se derriba en balde)
    g.demolishT = yearT + DAY_LEN;
    world.objs[h] = null; g.houses = g.houses.filter(i => i !== h); for (const u of villagers) if (u.home === h) u.home = null;
    g.wood += 3; composeRegion(x - 8, y - 12, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof');
    notify(`En ${g.name} derriban una cabaña del centro para hacer sitio a ${kind === 'almacen' ? 'un almacén nuevo' : `el ${kind}`}: lo importante, protegido en el centro`, { x:x * T, y:y * T });
    if (centralFits(g, kind, x, y)) return [x, y];
  }
  return ring(15, 24); // si no, el solar libre más cercano al centro (y si tampoco, el sitio de siempre)
} }
// ---- Como en WorldBox: espadas cruzadas sobre cada pelea y la conquista en porcentaje ----
// · Donde hay soldados luchando sale un icono de espadas que chocan (late y se balancea); sobre los ejércitos que van
//   hacia el enemigo, uno más pequeño
// · Si los atacantes ocupan el centro de un pueblo y hay pocos defensores armados, se va conquistando: una barra
//   «Conquistando N %» sobre el pueblo, que sube mientras dominan y baja si resisten; al 100 %, el pueblo cae
function conquestTick(dt){
  for (const r of rels.values()) {
    if (!r.war) continue; const att = villageById(r.war.att), def = villageById(r.war.def); if (!att || !def) continue;
    for (const eg of villages.filter(o => popOf(o) && nationOf(o) === nationOf(def))) {
      const cx = eg.fx * T, cy = eg.fy * T, R = 9 * T;
      const atk = villagers.filter(v => !v.dead && !v.away && v.task && v.task.k === 'asalto' && v.task.enemy === eg.id && Math.hypot(v.x - cx, v.y - cy) < R).length;
      const dfn = villagers.filter(v => !v.dead && !v.away && v.vid === eg.id && v.weapon && Math.hypot(v.x - cx, v.y - cy) < R * 1.4).length;
      const S = (r.war.siege ||= {}), p = S[eg.id] || 0;
      if (atk > 0 && atk > dfn) S[eg.id] = Math.min(100, p + dt * (atk - dfn) * 2.2);
      else if (p > 0) S[eg.id] = Math.max(0, p - dt * (2 + dfn));
      if (S[eg.id] >= 100) { delete S[eg.id]; notify(`¡Las tropas de ${att.name} toman ${eg.name}!`, { x:cx, y:cy }); conquer(nationOf(att), eg, r); return; }
    }
  }
}
SYSTEMS.push(dt => conquestTick(dt));
function swordsIcon(sx, sy, s, t, hot){
  const sw = Math.sin(t / 110) * (hot ? .35 : .15), k = hot ? 1 + Math.abs(Math.sin(t / 160)) * .25 : 1, R = 10.5 * s * k;
  vctx.save(); vctx.translate(sx, sy);
  vctx.fillStyle = 'rgba(20,10,10,.78)'; vctx.beginPath(); vctx.arc(0, 0, R, 0, Math.PI * 2); vctx.fill();
  vctx.strokeStyle = hot ? `rgba(240,70,50,${.7 + .3 * Math.sin(t / 120)})` : 'rgba(240,190,90,.8)'; vctx.lineWidth = 1.6 * s; vctx.stroke();
  for (const d of [-1, 1]) { // las dos espadas, cruzándose
    vctx.save(); vctx.rotate(d * (Math.PI / 4 + sw));
    vctx.fillStyle = '#e8ecf0'; vctx.fillRect(-1 * s, -6.5 * s * k, 2 * s, 9 * s * k); // la hoja
    vctx.fillStyle = '#c8a040'; vctx.fillRect(-3 * s, 2.5 * s * k, 6 * s, 1.5 * s); vctx.fillStyle = '#6a4426'; vctx.fillRect(-.8 * s, 4 * s * k, 1.6 * s, 2.6 * s); // guarda y empuñadura
    vctx.restore();
  }
  if (hot && Math.sin(t / 110) > .85) { vctx.fillStyle = '#ffe080'; vctx.fillRect(-1.5 * s, -2 * s, 3 * s, 3 * s); } // la chispa del choque
  vctx.restore();
}
function drawWarIcons(t){
  if (!world || ![...rels.values()].some(r => r.war)) return;
  const sc = p => [offX + p[0] * zoom, offY + p[1] * zoom];
  // Peleas: se agrupan los que luchan cerca unos de otros
  const cells = new Map();
  for (const v of villagers) {
    if (v.dead || v.away || !v.enemy || v.enemy.dead || Math.hypot(v.enemy.x - v.x, v.enemy.y - v.y) > 40) continue;
    const k = Math.floor(v.x / 60) + ',' + Math.floor(v.y / 60), c = cells.get(k) || { x:0, y:0, n:0 }; c.x += v.x; c.y += v.y; c.n++; cells.set(k, c);
  }
  const s = Math.max(2.6, Math.min(3.6, zoom / 1.1)); // grande, que se vea bien dónde se lucha
  for (const c of cells.values()) if (c.n >= 2) { const [x, y0] = sc([c.x / c.n, c.y / c.n - 22]), y = y0 - 6 * s; if (x > -60 && y > -60 && x < cw + 60 && y < ch + 60) swordsIcon(x, y, s * (c.n >= 6 ? 1.3 : 1), t, true); }
  // Ejércitos en marcha (sin pelea todavía)
  const groups = new Map();
  for (const v of villagers) if (!v.dead && !v.away && v.task && v.task.k === 'asalto' && v.task.grp && !v.enemy) { const G = v.task.grp, c = groups.get(G) || { x:0, y:0, n:0 }; c.x += v.x; c.y += v.y; c.n++; groups.set(G, c); }
  for (const c of groups.values()) if (c.n >= 3) { const [x, y0] = sc([c.x / c.n, c.y / c.n - 24]), y = y0 - 5 * s; if (x > -60 && y > -60 && x < cw + 60 && y < ch + 60) swordsIcon(x, y, s * .8, t, false); }
  // La conquista en marcha: barra con el porcentaje sobre el pueblo
  for (const r of rels.values()) for (const [id, p] of Object.entries((r.war && r.war.siege) || {})) {
    if (p < 1) continue; const eg = villageById(+id); if (!eg) continue;
    const [x, y] = sc([eg.fx * T, eg.fy * T - 46]); if (x < -80 || y < -30 || x > cw + 80 || y > ch + 30) continue;
    const w = 96, h = 14; vctx.fillStyle = 'rgba(20,10,10,.85)'; vctx.fillRect(x - w / 2 - 2, y - 2, w + 4, h + 4);
    vctx.fillStyle = '#4a1a14'; vctx.fillRect(x - w / 2, y, w, h); vctx.fillStyle = `rgb(${200 + Math.round(40 * Math.sin(t / 200))},60,40)`; vctx.fillRect(x - w / 2, y, w * p / 100, h);
    vctx.font = 'bold 10px system-ui, sans-serif'; vctx.textAlign = 'center'; vctx.textBaseline = 'middle'; vctx.fillStyle = '#fff'; vctx.fillText(`Conquistando ${Math.floor(p)} %`, x, y + h / 2 + .5); vctx.textAlign = 'start'; vctx.textBaseline = 'alphabetic';
  }
}
