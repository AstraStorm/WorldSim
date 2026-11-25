// World Sim · Castillos: la fortaleza de cada ciudad, el refugio en la guerra y el último fortín
// ================= Castillos =================
// · Las naciones que apoyan la fortificación (ley de fortificación, monarquías, dictaduras, ejército o una guerra
//   encima) levantan un castillo en cada ciudad grande: primero la capital. Seis clases: empalizada sobre un montículo
//   (sin piedra), torre del homenaje, castillo con foso, castillo en la roca (en lo alto), castillo concéntrico
//   (ciudades grandes) y palacio fortificado (capitales ricas de reyes)
// · Se busca un sitio alto cerca del pueblo; el de foso, cerca del agua: al acabarlo cavan el foso con picos y palas
//   y un canal hasta el río o el lago para que se llene, y tienden un puente delante de la puerta
// · Guarda mucha comida, agua y leña o carbón (para calentarse), que hay que ir llevando
// · En guerra, si los informadores avisan del ataque (casa de espías, torres de vigía o exploradores; si no, solo
//   cuando ya se ve al enemigo), la gente se refugia dentro: los niños, los mayores y casi todos; los soldados y parte de
//   los hombres armados salen a defender. Dentro siguen con su vida: comen, beben y se calientan de las reservas; si se
//   acaban, unos cuantos salen a buscar más. Desde las almenas, los arqueros disparan a quien se acerque
// · El castillo es uno de los objetivos del enemigo. Si cae, todos salen a defender el pueblo con lo que tengan;
//   pasada la guerra lo reconstruyen (si pueden y quieren) o queda en ruinas
// · Con castillo hacen falta más manos: nacen algo más de niños
const FORTS = {
  empalizada:{ name:'Empalizada del montículo', wood:60, stone:0, cap:40, guard:2, hp:1, desc:'una empalizada de troncos sobre un montículo, con su torre de madera' },
  torre:{ name:'Torre del homenaje', wood:30, stone:80, cap:50, guard:3, hp:1.6, desc:'una gran torre de piedra con su muralla' },
  foso:{ name:'Castillo del foso', wood:40, stone:110, cap:60, guard:4, hp:2, desc:'un castillo rodeado de agua, con un puente delante de la puerta' },
  roca:{ name:'Castillo de la roca', wood:30, stone:100, cap:55, guard:4, hp:2.2, desc:'un castillo en lo alto de la roca, que domina todo el valle' },
  concentrico:{ name:'Castillo concéntrico', wood:40, stone:140, iron:10, cap:80, guard:6, hp:2.6, desc:'dos anillos de murallas con torres redondas' },
  palacio:{ name:'Palacio fortificado', wood:40, stone:150, gold:15, cap:80, guard:5, hp:2.4, desc:'el palacio de la corona, con torres de tejados azules y estandartes' },
};
for (const [k, F] of Object.entries(FORTS)) { OBJ['castle:' + k] = [F.name, 'house', 0]; SPRITE_ALIAS['castle:' + k] = 'barracks:cuartel'; }
BLD.add('castle'); BUILD_DIMS.castle = [7, 11]; KIND_DIMS.castillo = [7, 11]; KIND_DIMS.foso = [1, 1]; TASK_KIND.castillo = 'castillo';
BLD_TYPE.castle = 'Defensa'; OFICIOS.constructor.push('castillo', 'foso'); OFICIOS.soldado.push('abastecer');
const FORT_PROG = 14; // visitas de obra para acabarlo
const fortIn = g => villagers.filter(u => !u.dead && u.inFort === g.id);
const fortOf = g => g.fort && g.fort.built && !g.fort.ruined && world.objs[g.fort.i] && world.objs[g.fort.i].key.startsWith('castle:') ? g.fort : null;
const fortCost = (g, k) => { const F = FORTS[k], m = hasLaw(g, 'fortificacion') ? .75 : 1, c = {}; for (const [f] of MATS) if (F[f]) c[f] = Math.ceil(F[f] * m); return c; };
const FORT_REG = ['monarquia', 'monarquia_parlamentaria', 'fascismo', 'dictadura', 'oligarquia'];
// ¿Quieren castillo? Solo naciones que apoyan la fortificación; uno por ciudad, la capital primero
function wantsFort(g){
  if (g.fort && !(g.fort.ruined && g.fort.redo)) return false;
  const n = nationOf(g), pop = popOf(g); if (!n || g.hall == null || !world.objs[g.hall]) return false;
  const war = [...rels.values()].some(r => r.war && (r.war.att === n.id || r.war.def === n.id));
  if (!(hasLaw(g, 'fortificacion') || FORT_REG.includes(regimeOf(n)) || hasLaw(g, 'ejercito') || (war && pop >= 25))) return false;
  if (n === g) return pop >= 16;
  return pop >= 22 && !!fortOf(n); // las demás ciudades, cuando la capital ya lo tiene
}
// Qué castillo les sale: según lo que tienen y dónde están
function fortType(g){
  const n = nationOf(g), pop = popOf(g), hi = highGround(g), wet = waterNear(g.fx, g.fy, 24);
  if ((g.stone || 0) < 40 && (g.know || {}).cantera !== true && !hasInst(g, 'universidad')) return 'empalizada';
  if (n === g && ['monarquia', 'monarquia_parlamentaria'].includes(regimeOf(n)) && (g.gold || 0) >= 10 && pop >= 30) return 'palacio';
  if (pop >= 45) return 'concentrico';
  if (hi) return 'roca';
  if (wet) return 'foso';
  return 'torre';
}
const isHigh = i => { const b = world.biome[i]; return b === B.HILLS || b === B.ROCK || world.e[i] > .62; };
function highGround(g){ for (let r = 6; r <= 26; r += 2) for (let a = 0; a < 6.28; a += .4) { const x = Math.round(g.fx + Math.cos(a) * r), y = Math.round(g.fy + Math.sin(a) * r); if (x > 8 && y > 12 && x < W - 8 && y < H - 3 && isHigh(y * W + x)) return true; } return false; }
function waterNear(fx, fy, R){ for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) { const i = Math.round(fy + dy) * W + Math.round(fx + dx); if (FRESH(world.biome[i]) && !dried(i)) return true; } return false; }
// El sitio: cerca del pueblo, lo más alto posible (el de foso, a pocos pasos del agua), al que se llega andando
function fortSite(g, type){
  const gx = Math.round(g.fx), gy = Math.round(g.fy), rT = townRadius(g), reach = walkSet(g, Math.round(rT + 30));
  let best = null, bs = -1e9;
  for (let dy = -Math.round(rT + 24); dy <= rT + 24; dy += 2) for (let dx = -Math.round(rT + 24); dx <= rT + 24; dx += 2) {
    const x = gx + dx, y = gy + dy, d = Math.hypot(dx, dy * 1.2); if (d < 9 || d > rT + 24 || x < 10 || y < 14 || x >= W - 10 || y >= H - 5 || !reach.has((y + 1) * W + x)) continue;
    const i = y * W + x; let s = -d * .5 + world.e[i] * 40 + (isHigh(i) ? 12 : 0);
    if (type === 'roca' && !isHigh(i)) continue;
    if (type === 'foso') { if (!waterNear(x, y, 12)) continue; s += 10; }
    if (s <= bs || !zoneFree(x, y, 7, 11) || buildingClash(x, y, 'castillo')) continue;
    bs = s; best = [x, y];
  }
  return best;
}
// Mientras se construye, nadie levanta nada encima del solar
{ const base = buildingClash; buildingClash = function(x, y, kind, skip){
  if (base(x, y, kind, skip)) return true;
  const [hw, hh] = KIND_DIMS[kind] || [4, 5];
  for (const g of villages) { const f = g.fort; if (!f || f.built || f.i === skip) continue; const fx = f.i % W, fy = (f.i / W) | 0; if (!(x + hw < fx - 7 || x - hw > fx + 7 || y + 1 < fy - 11 || y - hh > fy + 1)) return true; }
  return false;
}; }
// ---- Trabajos ----
function fortJobs(v, g, add){
  const f = g.fort;
  if (!f && wantsFort(g) && !(g.fortNoSite > yearT)) { add('castillo', 7); return; }
  if (f && f.ruined && f.redo && !busyWith(g, 'castillo')) { add('castillo', 6); return; }
  if (f && !f.built) { const c = fortCost(g, f.type), miss = MATS.filter(([m]) => (c[m] || 0) / FORT_PROG > (g[m] || 0)); if (!miss.length) add('castillo', busyWith(g, 'castillo') < 4 ? 11 : 0); else for (const [m] of miss) for (const j of MAT_JOBS[m] || []) add(j, 3); return; }
  if (!fortOf(g)) return;
  if (f.moat && f.moat.left.length && busyWith(g, 'foso') < 3) add('foso', 7);
  const C = FORTS[f.type].cap * 4, low = f.food < C * .6 || f.water < C * .4 || f.fuel < C * .25;
  if (low && !f.alarm && busyWith(g, 'abastecer') < 2 && g.food > popOf(g) * 3) add('abastecer', 4);
}
function fortTarget(v, g, job){
  if (job === 'castillo') {
    let f = g.fort;
    if (!f || (f.ruined && f.redo)) {
      if (f && f.ruined) { const i0 = f.i; world.objs[i0] = null; composeRegion(i0 % W - 10, ((i0 / W) | 0) - 16, i0 % W + 10, ((i0 / W) | 0) + 12); g.fort = null; } // se desescombra
      const type = fortType(g), p = fortSite(g, type); if (!p) { g.fortNoSite = yearT + DAY_LEN * 3; return null; }
      f = g.fort = { i:p[1] * W + p[0], type, prog:0, built:false, food:0, water:0, fuel:0 };
      notify(`${g.name} empieza a levantar ${/^(Empalizada|Torre)/.test(FORTS[type].name) ? 'una' : 'un'} ${FORTS[type].name.toLowerCase()}: ${FORTS[type].desc}`, { x:p[0] * T, y:p[1] * T });
    }
    const sb = standBy(f.i) || [(f.i % W) * T + 2, ((f.i / W) | 0) * T + 9];
    return { k:job, i:f.i, x:sb[0] + (Math.random() - .5) * 20, y:sb[1] + Math.random() * 3 };
  }
  const f = fortOf(g); if (!f) return null;
  if (job === 'foso') { const i = f.moat.left[0]; return i == null ? null : { k:job, i, x:(i % W) * T + 2 + (Math.random() - .5) * 3, y:((i / W) | 0) * T + 3 - 4 }; }
  if (job === 'abastecer') { const [gx, gy] = fortGate(f); return { k:job, x:gx + (Math.random() - .5) * 6, y:gy }; }
  return null;
}
function fortArrive(v, g, t){
  if (t.k === 'castillo') { v.actT = 10; v.onDone = () => {
    const f = g.fort; if (!f || f.built) return;
    const c = fortCost(g, f.type), step = (hasLaw(g, 'fortificacion') ? 1.6 : 1) / FORT_PROG;
    for (const [m] of MATS) { const need = Math.ceil((c[m] || 0) / FORT_PROG); if ((g[m] || 0) < need) return; }
    for (const [m] of MATS) g[m] -= Math.ceil((c[m] || 0) / FORT_PROG);
    f.prog = Math.min(1, f.prog + step); snd('pick', v.x, v.y, .4);
    if (f.prog >= 1) fortDone(g, f);
  }; return true; }
  if (t.k === 'foso') { v.actT = 7; v.onDone = () => { const f = fortOf(g); if (!f || !f.moat) return; for (let k = 0; k < 3 && f.moat.left.length; k++) digMoat(g, f, f.moat.left.shift()); snd('pick', v.x, v.y, .4); if (!f.moat.left.length) moatDone(g, f); }; return true; }
  if (t.k === 'abastecer') { v.actT = 5; v.onDone = () => {
    const f = fortOf(g); if (!f) return; const C = FORTS[f.type].cap * 4;
    const fd = Math.min(12, Math.max(0, g.food - popOf(g) * 3), C - f.food); if (fd > 0) { g.food -= fd; f.food += fd; }
    f.water = Math.min(C * .6, f.water + 10); // cántaros del pozo o del río
    if (f.fuel < C * .4) { if ((g.coal || 0) >= 3) { g.coal -= 3; f.fuel += 9; } else if (g.wood >= 6) { g.wood -= 6; f.fuel += 6; } } // leña o carbón
    floats.push({ x:v.x, y:v.y - 14, txt:'provisiones al castillo', col:'#e8d8a8', life:0 });
  }; return true; }
  return false;
}
function fortDone(g, f){
  const x = f.i % W, y = (f.i / W) | 0;
  if (clearable(x - 7, y - 11, x + 7, y + 1)) clearSite(g, x - 7, y - 11, x + 7, y + 1);
  world.objs[f.i] = { key:'castle:' + f.type, v:0, ox:0, oy:0, vid:g.id }; f.built = true; f.ruined = false; f.redo = false; f.hp = FORTS[f.type].hp;
  composeRegion(x - 12, y - 18, x + 12, y + 14); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
  notify(`¡${g.name} termina su ${FORTS[f.type].name.toLowerCase()}! Guardará comida, agua y leña, y en la guerra será el refugio del pueblo`, { x:x * T, y:y * T });
  if (f.type === 'foso') planMoat(g, f);
}
// ---- El foso: un anillo de agua alrededor y un canal hasta el río o el lago ----
function planMoat(g, f){
  const x = f.i % W, y = (f.i / W) | 0, ring = [];
  for (let yy = y - 12; yy <= y + 2; yy++) for (let xx = x - 8; xx <= x + 8; xx++) if (yy === y - 12 || yy === y + 2 || xx === x - 8 || xx === x + 8) ring.push(yy * W + xx);
  const ok = i => { const tx = i % W, ty = (i / W) | 0; if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) return false; const o = world.objs[i], b = world.biome[i];
    return !(o && !['tree', 'berry'].includes(OBJ[o.key][1])) && b !== B.LAVA && !plazaSet.has(i) && !wallSet.has(i) && !villages.some(v => underBuilding(v, tx, ty)); };
  const moat = ring.filter(ok);
  // Canal: el camino más corto por tierra desde el anillo hasta el agua dulce más cercana (sin pasar por casas)
  const seen = new Map(moat.map(i => [i, -1])), q = moat.slice(); let hit = null;
  for (let h = 0; h < q.length && q.length < 6000 && hit == null; h++) { const i = q[h];
    for (const j of [i - 1, i + 1, i - W, i + W]) { if (seen.has(j)) continue; seen.set(j, i); if (FRESH(world.biome[j]) && !dried(j)) { hit = i; break; } if (Math.hypot((j % W) - x, ((j / W) | 0) - y) < 22 && ok(j) && !farmMap.has(j)) q.push(j); } }
  const canal = []; for (let i = hit; i != null && i !== -1 && !moat.includes(i); i = seen.get(i)) canal.push(i);
  const gate = (y + 2) * W + x;
  f.moat = { left:[...canal.reverse(), ...moat.filter(i => i !== gate)], gate, total:canal.length + moat.length };
  notify(`En ${g.name} empiezan a cavar el foso del castillo con picos y palas${canal.length ? ` y un canal de ${canal.length} pasos hasta el agua` : ''}`, { x:x * T, y:y * T });
}
function digMoat(g, f, i){
  const tx = i % W, ty = (i / W) | 0, o = world.objs[i];
  if (o && ['tree', 'berry'].includes(OBJ[o.key][1])) world.objs[i] = null;
  if (pathMap.has(i)) { pathMap.delete(i); bridgeSet.add(i); bridges.push({ tiles:[i], len:1, h:true, cx:tx, cy:ty, sx:tx - 1, sy:ty, ex:tx + 1, ey:ty, vid:g.id }); } // donde corta un camino, un puentecillo
  farmMap.delete(i); world.biome[i] = B.RIVER; composeRegion(tx - 7, ty - 11, tx + 7, ty + 12);
}
function moatDone(g, f){
  const i = f.moat.gate, tx = i % W, ty = (i / W) | 0;
  world.biome[i] = B.RIVER; pathMap.delete(i); bridgeSet.add(i); bridges.push({ tiles:[i], len:1, h:false, cx:tx, cy:ty, sx:tx, sy:ty + 1, ex:tx, ey:ty - 1, vid:g.id });
  pathMap.add(i + W); composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); connect(g, tx, ty + 1); f.moat.done = true;
  notify(`El foso del castillo de ${g.name} ya está lleno de agua; tienden un puente delante de la puerta`, { x:tx * T, y:ty * T });
}
const fortGate = f => [(f.i % W) * T + 2, ((f.i / W) | 0) * T + 3 + (f.moat ? 2 * T : T)];
// ---- La guerra: aviso, refugio, arqueros, asedio y caída ----
// Los informadores: con casa de espías o torres de vigía (o a veces los exploradores) se enteran del ataque al salir
{ const base = launchRaid; launchRaid = function(att, def){
  base.apply(this, arguments);
  if (!def) return;
  for (const g of villages) if (g === def || (nationOf(g) === nationOf(def) && Math.hypot(g.fx - def.fx, g.fy - def.fy) < 40)) {
    if (!fortOf(g)) continue;
    const spies = hasInst(nationOf(g), 'espias') || hasInst(g, 'espias'), watch = towersOf(g).length > 0;
    if (spies || watch || Math.random() < .3) g.fortWarn = { t:yearT, by:spies ? 'los espías' : watch ? 'los vigías de las torres' : 'unos exploradores', foe:att.name };
  }
}; }
const fortFoes = (g, R) => villagers.filter(u => !u.dead && !u.away && u.task && u.task.k === 'asalto' && (u.task.enemy === g.id || (u.task.grp && u.task.grp.enemy === g.id)) && Math.hypot(u.x / T - g.fx, u.y / T - g.fy) < R);
let fortClock = 0;
function fortTick(dt){
  if (!world || (fortClock -= dt) > 0) return; const el = .5 - fortClock; fortClock = .5;
  for (const g of villages) {
    const f = fortOf(g);
    if (!f || !popOf(g)) { const ins = fortIn(g); if (ins.length) { const [gx0, gy0] = g.fort ? fortGate(g.fort) : [g.fx * T, g.fy * T]; for (const u of ins) leaveFort(u, gx0, gy0); } continue; }
    const x = f.i % W, y = (f.i / W) | 0, [gx, gy] = fortGate(f), foes = fortFoes(g, g.fortWarn && yearT - g.fortWarn.t < DAY_LEN ? 110 : 45), near = foes.filter(u => Math.hypot(u.x / T - g.fx, u.y / T - g.fy) < 24);
    const warned = g.fortWarn && yearT - g.fortWarn.t < DAY_LEN;
    // ¿Al castillo? Solo si saben que vienen (o ya los ven)
    if (!f.alarm && foes.length && (warned || near.length)) {
      f.alarm = { since:yearT, quiet:0 };
      notify(warned ? `${capFirst(g.fortWarn.by)} avisan: ¡${g.fortWarn.foe} viene a por ${g.name}! El pueblo se refugia en el castillo` : `¡Ya se ve al enemigo desde ${g.name}! Todos corren al castillo`, { x:gx, y:gy });
      snd('horn', gx, gy, .6); fortCall(g, f);
    }
    if (!f.alarm) { if (fortIn(g).length) fortOut(g, f); continue; }
    // Pasado el peligro, a casa
    if (!foes.length) { if ((f.alarm.quiet += el) > 25) { fortOut(g, f); f.alarm = null; g.fortWarn = null; notify(`Pasado el peligro, la gente de ${g.name} sale del castillo y vuelve a su vida`, { x:gx, y:gy }); continue; } } else f.alarm.quiet = 0;
    fortLife(g, f, el, gx, gy);
    // Arqueros en las almenas: los que tienen arco o ballesta dentro, y la guarnición
    const arch = fortIn(g).filter(u => isRanged(u.weapon)).length + FORTS[f.type].guard;
    f.shotT = (f.shotT || 0) - el;
    if (f.shotT <= 0 && near.length) { f.shotT = 1.5; const range = 16 * T;
      for (let k = 0; k < Math.min(arch, 4); k++) {
        const e = near[Math.floor(Math.random() * near.length)], d = Math.hypot(e.x - gx, e.y - (gy - 30)); if (d > range) continue;
        const sx = gx + (Math.random() - .5) * 40, sy = gy - 34 - Math.random() * 8, hit = Math.random() < .68;
        arrows.push({ x0:sx, y0:sy, a:e, v:{ x:sx, y:sy, dead:false }, t:0, dur:Math.max(.2, d / 160), hit, vis:true, bolt:Math.random() < .3 }); snd('arrow', sx, sy, .3);
        if (hit) fortHit(g, e);
      }
    }
    // Piedras desde las almenas sobre los que se acercan (y, si el pueblo tiene catapultas guardadas, desde el patio y más lejos)
    f.rockT = (f.rockT || 0) - el;
    const cat = (g.siege || 0) > 0, rng = (cat ? 20 : 9) * T, close = foes.filter(u => Math.hypot(u.x - gx, u.y - (gy - 20)) < rng);
    if (f.rockT <= 0 && close.length) { f.rockT = cat ? 3 : 4;
      for (let k = 0; k < (cat ? Math.min(2, g.siege) : 1); k++) {
        const e = close[Math.floor(Math.random() * close.length)], sx = gx + (Math.random() - .5) * 30, sy = gy - 30, tx = e.x + (Math.random() - .5) * 6, ty = e.y + (Math.random() - .5) * 4;
        stones.push({ x0:sx, y0:sy, x1:tx, y1:ty, t:0, dur:.6 + Math.hypot(tx - sx, ty - sy) / 220, tgt:{} }); snd('boom', sx, sy, .25);
        const hitR = (cat ? 2.4 : 1.6) * T, dmg = cat ? .55 : .4;
        (f.rocks ||= []).push({ x:tx, y:ty, at:yearT + .6 + Math.hypot(tx - sx, ty - sy) / 220, r:hitR, dmg });
      }
    }
    if (f.rocks && f.rocks.length) f.rocks = f.rocks.filter(R => { if (yearT < R.at) return true; // la piedra cae: daña a los que pilla debajo
      for (const u of foes) if (!u.dead && Math.hypot(u.x - R.x, u.y - R.y) < R.r) { u.hp = (u.hp ?? 1) - R.dmg + .25; fortHit(g, u); } // (fortHit quita otro 0,25)
      return false; });
    // Los atacantes que llegan al castillo lo golpean; el castillo es uno de sus objetivos
    for (const e of foes) {
      if (Math.hypot(e.x / T - x, e.y / T - (y - 4)) < 11) { f.hp -= .0015 * el; if (Math.random() < .02) chips.push({ x:gx + (Math.random() - .5) * 40, y:gy - 20 - Math.random() * 20, vx:(Math.random() - .5) * 20, vy:-10, life:0, max:.6, col:'#9a968e' }); }
      else if (fortIn(g).length && e.task.grp && !e.task.grp.fortAim && Math.random() < .4) { e.task.grp.fortAim = true; for (const u of e.task.grp.ps) if (!u.dead && u.task && u.task.k === 'asalto' && Math.random() < .5) { u.task.x = gx + (Math.random() - .5) * 30; u.task.y = gy + 4 + Math.random() * 6; } }
    }
    if (f.hp <= 0) fortFalls(g, f, gx, gy);
  }
}
function fortHit(g, e){
  e.hp = (e.hp ?? 1) - .25; hurtFx(e, e.x, e.y - 20, walkable);
  if (e.hp > 0) return;
  const ge = villageById(e.vid), r = ge && warRel(ge, g); if (r && r.war) { r.war.dead++; warLoss(r, ge); }
  killVillager(e, 'guerra'); floats.push({ x:e.x, y:e.y - 14, txt:'†', col:'#f05040', life:0 });
  milOf(g).kills++; if (ge) milOf(ge).deaths++;
}
// Llamada al castillo: dentro, casi todos; fuera, los soldados y parte de los que tienen arma
function fortCall(g, f){
  const ppl = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && !u.boat && !(u.task && u.task.k === 'asalto'));
  const cap = FORTS[f.type].cap, [gx, gy] = fortGate(f); let n = fortIn(g).length;
  for (const u of ppl.sort((a, b) => ageOf(a) - ageOf(b))) {
    if (n >= cap) break;
    const fighter = ageOf(u) >= ADULT_H && (u.oficio === 'soldado' || (u.weapon && !isRanged(u.weapon) && Math.random() < .6)); if (fighter || u === g.leader && nationOf(g) !== g) continue;
    releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.sleep = false; u.task = { k:'guardia', fortGo:g.id, x:gx + (Math.random() - .5) * 8, y:gy + Math.random() * 3, until:yearT + 60 }; u.lastD = Infinity; n++;
  }
}
// Los que llegan a la puerta entran (dejan de verse: están dentro); dentro gastan las reservas
function fortLife(g, f, el, gx, gy){
  for (const u of villagers) {
    if (u.dead || !u.task || u.task.fortGo !== g.id) continue;
    if (Math.hypot(u.x - gx, u.y - gy) < 10) { u.task = { k:'viaje', fort:g.id }; u.away = true; u.inFort = g.id; }
    else if (yearT > u.task.until) u.task = null;
  }
  const inside = fortIn(g), n = inside.length; if (!n) return;
  const cold = tempAt(f.i) < 10;
  f.food = Math.max(0, f.food - n * .004 * el); f.water = Math.max(0, f.water - n * .004 * el); if (cold) f.fuel = Math.max(0, f.fuel - (1 + n / 15) * .01 * el);
  for (const u of inside) { if (f.food > 0) u.food = Math.max(u.food, .7); if (f.water > 0) u.water = Math.max(u.water, .7); if (!cold || f.fuel > 0) u.chill = 0; }
  // Sin provisiones: algunos tienen que salir a buscarlas
  if ((f.food <= 0 || f.water <= 0 || (cold && f.fuel <= 0)) && yearT - (f.forageT ?? -1e9) > 30) {
    f.forageT = yearT; const out = inside.filter(u => ageOf(u) >= ADULT_H).slice(0, Math.max(1, Math.ceil(n * .25)));
    for (const u of out) leaveFort(u, gx, gy);
    if (out.length) notify(`En el castillo de ${g.name} se acaba ${f.food <= 0 ? 'la comida' : f.water <= 0 ? 'el agua' : 'la leña'}: ${out.length} salen a buscar más, aunque el enemigo esté cerca`, { x:gx, y:gy });
  }
}
function leaveFort(u, gx, gy){ u.away = false; u.inFort = null; u.task = null; u.x = gx + (Math.random() - .5) * 10; u.y = gy + 2 + Math.random() * 4; u.wait = Math.random() * .5; }
function fortOut(g, f){ const [gx, gy] = fortGate(f); for (const u of fortIn(g)) leaveFort(u, gx, gy); for (const u of villagers) if (u.task && u.task.fortGo === g.id) u.task = null; }
// Cae el castillo: todos salen a defender el pueblo con lo que tengan; luego, ¿se rehace o queda en ruinas?
function fortFalls(g, f, gx, gy){
  for (const u of fortIn(g)) { leaveFort(u, gx, gy); if (ageOf(u) >= ADULT_H && !u.weapon) u.weapon = 'horca'; }
  f.alarm = null; f.ruined = true; f.food = f.water = f.fuel = 0;
  const o = world.objs[f.i]; if (o) { o.burnt = true; o.dmg = .9; }
  composeRegion(f.i % W - 12, ((f.i / W) | 0) - 18, f.i % W + 12, ((f.i / W) | 0) + 14); addEffect(gx, gy - 20, 'poof'); snd('boom', gx, gy, .8);
  notify(`¡Cae el castillo de ${g.name}! Los que estaban dentro salen a defender el pueblo con lo que tienen`, { x:gx, y:gy });
  f.fellT = yearT;
}
// Pasada la guerra, deciden: si pueden y la nación quiere seguir fortificada, lo rehacen; si no, queda en ruinas
function fortRuinTick(g){
  const f = g.fort; if (!f || !f.ruined || f.redo || f.decided || yearT - (f.fellT ?? 0) < DAY_LEN) return;
  if (fortFoes(g, 70).length) return;
  f.decided = true; const c = fortCost(g, fortType(g));
  if (wantsFortAgain(g) && MATS.every(([m]) => (g[m] || 0) >= (c[m] || 0) * .5)) { f.redo = true; notify(`${g.name} decide reconstruir su castillo`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T }); }
  else notify(`${g.name} deja su castillo en ruinas: no hay con qué (ni ganas) de levantarlo otra vez`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T });
}
const wantsFortAgain = g => { const n = nationOf(g); return hasLaw(g, 'fortificacion') || FORT_REG.includes(regimeOf(n)) || hasLaw(g, 'ejercito'); };
{ const base = fameTick; fameTick = function(g, dt, people){ base(g, dt, people); if ((g.fortT = (g.fortT ?? Math.random() * 20) - dt) <= 0) { g.fortT = 20; fortRuinTick(g); if (g.fort && g.fort.ruined && g.fort.decided && !g.fort.redo && yearT - g.fort.fellT > DAY_LEN * 8) g.fort.decided = false; } }; }
SYSTEMS.push(dt => fortTick(dt));
// Las piedras de las catapultas: contra el castillo hacen el doble de daño (es un blanco grande y quieto)
{ const base = damageBuilding; damageBuilding = function(i, amt){
  const o = world.objs[i]; if (!o || !o.key.startsWith('castle:')) return base(i, amt);
  const g = villageById(o.vid), f = g && fortOf(g); if (!f || f.i !== i) return base(i, amt);
  f.hp -= amt * .5 * 2; if (Math.random() < .3) notify(`¡Las catapultas golpean el castillo de ${g.name}! Las murallas aguantan al ${Math.max(0, Math.round(f.hp / FORTS[f.type].hp * 100))} %`, { x:(i % W) * T, y:((i / W) | 0) * T });
  if (f.hp <= 0) { const [gx, gy] = fortGate(f); fortFalls(g, f, gx, gy); }
  return true;
}; }
// Junto al castillo se aguanta más
{ const base = castleShield; castleShield = function(e){ const g = villageById(e.vid), f = g && fortOf(g); let k = base(e); if (f && k === 1 && Math.hypot(e.x / T - (f.i % W), e.y / T - ((f.i / W) | 0)) < 14) k = .85; return k; }; } // (no se suma al de las torres del ayuntamiento)
// Los asaltos también van a por el castillo
{ const base = vitalTargets; vitalTargets = function(g){ const out = base(g), f = fortOf(g); if (f && Math.random() < .5) out.unshift(f.i); else if (f) out.push(f.i); return out; }; }
// ---- Fichas ----
{ const base = bldDesc; bldDesc = function(o){ const p = o.key.split(':'); return p[0] === 'castle' && FORTS[p[1]] ? `${FORTS[p[1]].name}: ${FORTS[p[1]].desc}. Refugio del pueblo en la guerra, almacén de comida, agua y leña, y puesto de los arqueros` : base(o); }; }
{ const base = bldDetails; bldDetails = function(i, g){
  const o = world.objs[i]; if (!o || !o.key.startsWith('castle:') || !g || !g.fort) return base(i, g);
  const f = g.fort, C = FORTS[f.type].cap * 4, kv = (a, b) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  return kv('Estado', f.ruined ? 'en ruinas' : f.alarm ? `en guerra: ${fortIn(g).length} personas dentro` : 'en paz') + kv('Murallas', `${Math.max(0, Math.round(f.hp / FORTS[f.type].hp * 100))} %`)
    + kv('Comida', `${Math.round(f.food)} / ${C}`) + kv('Agua', `${Math.round(f.water)} / ${Math.round(C * .6)}`) + kv('Leña y carbón', `${Math.round(f.fuel)} / ${Math.round(C * .4)}`) + kv('Caben', FORTS[f.type].cap) + kv('Guarnición', `${FORTS[f.type].guard} arqueros`)
    + (f.moat ? kv('Foso', f.moat.done ? 'lleno de agua, con puente' : `cavando (${f.moat.total - f.moat.left.length} de ${f.moat.total})`) : '') + base(i, g);
}; }
// ---- Dibujo: la obra (andamios y lo que va subiendo), la bandera y cuánta gente hay dentro ----
function drawForts(now){
  if (!world) return;
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    const f = g.fort; if (!f) continue;
    const bx = (f.i % W) * T + 2, by = ((f.i / W) | 0) * T + 3; if (bx + 50 < x0 || bx - 50 > x1 || by + 10 < y0 || by - 70 > y1) continue;
    const key = 'castle:' + f.type, m = ART_MAP[key], c = artFrame(key);
    if (!f.built && m && c) { // en obras: sube desde abajo, con andamios
      const h = Math.max(2, Math.round(m[3] * f.prog)), left = bx - m[4], top = by - m[3] + 1;
      vctx.fillStyle = 'rgba(120,104,84,.55)'; vctx.fillRect(left - 2, by - 4, m[2] + 4, 6); // el solar
      vctx.globalAlpha = .9; vctx.drawImage(c, 0, m[3] - h, m[2], h, left, by - h + 1, m[2], h); vctx.globalAlpha = 1;
      vctx.fillStyle = '#7a5230'; const sh = Math.min(m[3], h + 8);
      for (let k = 0; k <= m[2]; k += 8) vctx.fillRect(left + k, by - sh, 1, sh); for (let yy = by - 6; yy > by - sh; yy -= 7) vctx.fillRect(left, yy, m[2], 1);
      if (zoom >= 2.2) { vctx.fillStyle = '#2a2018'; vctx.fillRect(left, top - 6, m[2], 3); vctx.fillStyle = '#e8c860'; vctx.fillRect(left + 1, top - 5, Math.round((m[2] - 2) * f.prog), 1); }
      continue;
    }
    if (!fortOf(g) || !m) continue;
    const top = by - m[3] + 1, flag = nationOf(g).flag || g.flag;
    if (flag) { const px = bx + Math.round(m[2] * .1), py = top - 1; vctx.fillStyle = '#2a2018'; vctx.fillRect(px - .5, py - 9, 2, 9); vctx.fillStyle = '#e8e0cc'; vctx.fillRect(px, py - 9, 1, 9); drawFlag(flag, px + 1, py - 9, 7, 4, 1, now); }
    const n = f.alarm ? fortIn(g).length : 0;
    if (f.alarm && zoom >= 2) { // cuántos hay dentro y la vida que sigue: humo de las cocinas y gente en las almenas
      vctx.font = 'bold 5px sans-serif'; vctx.textAlign = 'center'; const tx = `${n} dentro`, w = vctx.measureText(tx).width + 6;
      vctx.fillStyle = 'rgba(20,16,12,.85)'; vctx.fillRect(bx - w / 2, top - 18, w, 7); vctx.fillStyle = '#f8e080'; vctx.fillText(tx, bx, top - 12.5); vctx.textAlign = 'start';
      for (let k = 0; k < Math.min(6, n + FORTS[f.type].guard); k++) { const ax = bx - m[4] + 6 + ((k * 13) % (m[2] - 10)), ay = top + 10 + (k % 2) * 4; vctx.fillStyle = '#22201e'; vctx.fillRect(ax, ay - 3, 2, 3); vctx.fillStyle = k % 2 ? '#c8a070' : '#e0b888'; vctx.fillRect(ax, ay - 4, 2, 1); }
    }
    if (n && Math.random() < .08) smoke.push({ x:bx + (Math.random() - .5) * m[2] * .5, y:top + 8, vx:1 + Math.random(), vy:-5, r:1.2, life:0, max:2 });
    if (f.hp < FORTS[f.type].hp * .5 && Math.random() < .1) smoke.push({ x:bx + (Math.random() - .5) * m[2] * .6, y:top + 14, vx:(Math.random() - .5) * 2, vy:-6, r:1.8, life:0, max:2.4 }); // dañado: humea
  }
}
