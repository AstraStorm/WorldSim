// World Sim · Fábricas de la revolución industrial: zona industrial, carbón, agua y extractora
// ================= Fábricas =================
// · Con la máquina de vapor, el pueblo va desbloqueando fábricas (aserradero, cantera, pozo de carbón, fundición de
//   hierro, textil, alfarería, curtiduría, peletería, fundición de oro y joyería) y las paga con sus materiales
// · No van por medio del pueblo: se levantan juntas en una zona industrial a las afueras, en filas; las de metales y
//   el pozo de carbón, junto a la mina (su propia zona minera)
// · Cada fábrica necesita gente que trabaje en ella, carbón para la caldera y agua: rinde mucho más que a mano
// · El agua sale de pozos que se cavan en la zona industrial y, cuando hay muchas fábricas y un río o lago cerca, de
//   una extractora de agua que la bombea y la reparte por tuberías. Se cavan los pozos que hacen falta, ni más ni menos
// · Beber va antes que las fábricas: si el pueblo pasa sed o hambre, las fábricas se paran y el agua es para la gente
// · El carbón se comercia: quien tiene de sobra lo vende por las rutas comerciales a quien le falta, y los pueblos de
//   una misma nación se lo reparten
// · Leyes: carbón estratégico, impuesto al carbón, protección de las aguas, libre industria y nacionalizar la industria
// · De cerca, cada fábrica lleva encima un icono: en marcha, o parada y por qué (sin carbón, sin agua, sin material...)
const FACS = {
  aserradero:{ name:'Aserradero', pay:1.15, tier:0, wood:10, stone:8, out:'wood', n:8, txt:'+8 madera', col:'#c89858',
    desc:'Aserradero de vapor: corta troncos y tablones mucho más rápido que a hacha (y, si falta carbón, hace carbón vegetal)', ok:g => treesNear(g) },
  cantera:{ name:'Cantera de vapor', pay:1.2, tier:0, wood:10, stone:6, out:'stone', n:6, txt:'+6 piedra', col:'#b0aaa0',
    desc:'Cantera de vapor: una grúa saca y corta bloques de piedra', ok:g => true },
  carbon:{ name:'Pozo de carbón', pay:1.5, tier:0, mine:true, wood:14, stone:10, iron:2, out:'coal', n:6, txt:'+6 carbón', col:'#9a9ca4',
    desc:'Pozo de carbón junto a la mina: castillete, vagonetas y montones de carbón para las calderas', ok:g => hasMine(g) },
  hierro:{ name:'Fundición de hierro', pay:1.4, tier:1, mine:true, wood:12, stone:16, iron:3, out:'iron', n:3, txt:'+3 hierro', col:'#b8c0cc',
    desc:'Fundición de hierro: funde el mineral de la mina en lingotes', ok:g => hasMine(g) && (g.mineMix || {}).hierro > 0 },
  textil:{ name:'Fábrica textil', pay:1.0, tier:1, wood:14, stone:10, iron:2, out:'cloth', n:3, txt:'+3 tela', col:'#e8dcc0',
    desc:'Fábrica textil: telares de vapor que tejen la lana y la fibra en tela', ok:g => pensOf(g).length > 0 || popOf(g) >= 24 },
  alfareria:{ name:'Alfarería', pay:1.05, tier:1, wood:8, stone:12, iron:1, in:{ stone:1 }, out:'jars', n:4, txt:'+4 cántaros', col:'#d89058',
    desc:'Alfarería: hornos que cuecen cántaros y tazas (más agua guardada en el pueblo) y vasijas para vender', ok:g => true },
  curtiduria:{ name:'Curtiduría', pay:1.1, tier:2, wood:12, stone:8, iron:2, in:{ hides:2 }, out:'leather', n:2, txt:'+2 cuero', col:'#a87040',
    desc:'Curtiduría: convierte las pieles de la caza en cuero, que se vende bien', ok:g => (g.hides || 0) >= 2 || (g.hidesEver || 0) >= 6 },
  peleteria:{ name:'Peletería', pay:1.15, tier:1, cold:true, wood:12, stone:8, iron:1, in:{ hides:2 }, out:'coats', n:2, txt:'+2 abrigos', col:'#d8c0a0',
    desc:'Peletería: cose abrigos de piel; quien lleva uno pasa mucho menos frío', ok:g => (g.hides || 0) >= 2 || (g.hidesEver || 0) >= 6 },
  oro:{ name:'Fundición de oro', pay:1.6, tier:2, mine:true, wood:12, stone:18, iron:4, out:'gold', n:2, txt:'+2 oro', col:'#f8d850',
    desc:'Fundición de oro: funde el oro de la mina en lingotes', ok:g => hasMine(g) && (g.mineMix || {}).oro > 0 },
  joyeria:{ name:'Joyería', pay:1.9, tier:3, mine:true, wood:10, stone:16, iron:2, gold:3, in:{ gold:1 }, out:'jewels', n:1, txt:'joyas', col:'#d88af0',
    desc:'Joyería: talla las gemas de la mina y hace joyas de oro que se venden muy caras', ok:g => hasMine(g) && ((g.mineMix || {}).gemas > 0 || (g.gems || 0) > 0) },
};
MAT_JOBS.coal = ['extraer', 'cantear'];
const FAC_TIER = ['primeras', 'segundas', 'terceras', 'últimas'];
const PUMP = { name:'Extractora de agua', wood:16, stone:18, iron:3 };
// Registro en las tablas del juego (huella, nombre, dibujo de reserva, oficio)
for (const [k, F] of Object.entries(FACS)) { OBJ['fac:' + k] = [F.name, 'house', 0]; SPRITE_ALIAS['fac:' + k] = 'forge:herreria'; }
OBJ['pump:extractora'] = [PUMP.name, 'house', 0]; SPRITE_ALIAS['pump:extractora'] = 'mill:molino';
BLD.add('fac'); BLD.add('pump'); BUILD_DIMS.fac = [4, 5]; BUILD_DIMS.pump = [4, 5];
KIND_DIMS.fabrica = [4, 5]; KIND_DIMS.extractora = [4, 5]; KIND_DIMS.pozo_fab = [2, 4];
TASK_KIND.fabrica = 'fabrica'; TASK_KIND.extractora = 'extractora'; TASK_KIND.pozo_fab = 'pozo_fab';
OFICIOS.constructor.push('fabrica', 'extractora', 'pozo_fab', 'mejorar_almacen'); OFICIOS.obrero = ['fabricar']; OFICIOS.ingeniero.push('fabrica', 'extractora', 'fabricar'); OFICIOS.cantero.push('fabricar');
Object.assign(BLD_TYPE, { fac:'Industria', pump:'Industria' });
BLD_DESC.pump = 'Extractora de agua: bombea agua del río o del lago con la rueda y la reparte por tuberías a las fábricas';
// Leyes de la industria
Object.assign(LAW_TXT, { fomento_industria:'fomento de la industria', carbon_estrategico:'carbón estratégico', impuesto_carbon:'impuesto al carbón', proteccion_aguas:'protección de las aguas', libre_industria:'libre industria', nacionalizar_industria:'industria nacionalizada' });
Object.assign(LAW_DESC, { fomento_industria:'el gobierno empuja la industria: fábricas más baratas y antes, más obreros por fábrica, sueldos de fábrica más altos y mejoras de fábrica a mitad de precio (lo paga el tesoro)', carbon_estrategico:'el carbón es del país: no se vende fuera mientras no sobre de verdad, y el tesoro compra reservas',
  impuesto_carbon:'cada carbón que se vende fuera paga un impuesto al tesoro', proteccion_aguas:'las fábricas no pueden dejar los pozos por debajo de la mitad: más pozos o extractora',
  libre_industria:'fábricas más baratas de levantar y que rinden algo más, aunque a la gente le gusta menos', nacionalizar_industria:'las fábricas son del estado: todo lo que dejan va al tesoro, pero se trabaja con menos ganas' });
Object.assign(LAW_LEAN, { fomento_industria:.1, carbon_estrategico:.4, impuesto_carbon:.05, proteccion_aguas:-.35, libre_industria:.6, nacionalizar_industria:-.75 });
LAW_CLASH.push(['libre_industria', 'nacionalizar_industria']);
if (REGIME_LAWS.comunismo) REGIME_LAWS.comunismo.push('nacionalizar_industria');
if (REGIME_LAWS.oligarquia) REGIME_LAWS.oligarquia.push('libre_industria');
if (REGIME_LAWS.tecnocracia) REGIME_LAWS.tecnocracia.push('proteccion_aguas', 'fomento_industria');
for (const rg of ['comunismo', 'dictadura', 'fascismo']) if (REGIME_LAWS[rg]) REGIME_LAWS[rg].push('fomento_industria');
if (REGIME_LAWS.fascismo) REGIME_LAWS.fascismo.push('carbon_estrategico');

const facsOf = g => (g.facs ||= []).filter(f => world.objs[f.i] && world.objs[f.i].key === 'fac:' + f.k);
const hasFac = (g, k) => facsOf(g).some(f => f.k === k);
const hasPump = g => g.pump != null && !!world.objs[g.pump] && world.objs[g.pump].key === 'pump:extractora';
const indWellsOf = g => wellsOf(g).filter(w => w.ind);
const facCost = (g, F) => { const m = (hasLaw(g, 'libre_industria') ? .75 : 1) * (hasLaw(g, 'fomento_industria') ? .85 : 1), c = {}; for (const [f] of MATS) if (F[f]) c[f] = Math.ceil(F[f] * m); if (facsOf(g).length) { if ((g.coal || 0) >= 4) c.coal = 4; else c.wood = (c.wood || 0) + 12; } return c; }; // la caldera se estrena con carbón (o con leña si no hay); la primera, sin
const facMissing = (g, c) => [...MATS, ['coal', 'carbón']].map(([f, n]) => [f, n, Math.max(0, (c[f] || 0) - (g[f] || 0))]).filter(m => m[2] > 0);
const facWaterCap = g => 30 + (hasPump(g) ? 60 : 0);
const coalReserve = g => 8 + facsOf(g).length * 4 + (g.factory ? 4 : 0);
// Beber y comer van antes que las fábricas
const survivalFirst = g => (g.sedAlarm != null && yearT - g.sedAlarm < DAY_LEN * .5) || g.food < popOf(g) * 1.2;
// ¿Pasan sed de verdad? Mucha gente con el agua muy baja o alguien que ha muerto de sed hace poco
function thirstCheck(g, people){
  const dry = people.filter(u => u.water < .25).length, sed = (g.deaths || {}).sed || 0;
  if ((people.length && dry / people.length > .25) || sed > (g.sedSeen ?? sed)) g.sedAlarm = yearT;
  g.sedSeen = sed;
}
function treesNear(g){ if (g.treesT > yearT) return g.treesOk; const z = g.indZone || { x:Math.round(g.fx), y:Math.round(g.fy) }; let n = 0; for (let y = z.y - 30; y <= z.y + 30; y += 2) for (let x = z.x - 30; x <= z.x + 30; x += 2) { const o = world.objs[y * W + x]; if (o && OBJ[o.key][1] === 'tree') n++; } g.treesT = yearT + DAY_LEN / 2; return g.treesOk = n >= 8; }
// ¿Qué fábricas tienen desbloqueadas? Por niveles: hacen falta fábricas ya hechas, más gente y más días de vapor
function facTierOf(g){ const n = facsOf(g).length, pop = popOf(g); let t = 0; const fo = hasLaw(g, 'fomento_industria') ? 4 : 0; while (t < 3 && n >= t + 1 + Math.floor(t / 2) && pop >= 16 + (t + 1) * 6 - fo) t++; return t; }
function facUnlocked(g){
  if (!industrial(g) || popOf(g) < 14) return [];
  const t = facTierOf(g);
  if ((g.facTier ?? -1) < t) { notify(`${g.name} desbloquea sus ${FAC_TIER[t]} fábricas: ${Object.entries(FACS).filter(([, F]) => F.tier === t).map(([, F]) => F.name.toLowerCase()).join(', ')}`, { x:g.fx * T, y:g.fy * T }); g.facTier = t; }
  const cold = tempAt(Math.round(g.fy) * W + Math.round(g.fx)) < 6 || ((g.deaths || {})['frío'] || 0) >= 5; // donde el frío mata, la peletería va primero
  return Object.entries(FACS).filter(([, F]) => F.tier <= t || (F.cold && cold));
}
// Cuánta falta les hace cada fábrica (la que más, la siguiente que levantan)
function facNeed(g, k){
  const cap = capOf(g);
  switch (k) {
    case 'carbon': return (g.coal || 0) < coalReserve(g) * 2 ? 10 : 4;
    case 'aserradero': return g.wood < cap * .5 ? 7 : 3;
    case 'cantera': return g.stone < cap * .5 ? 6 : 3;
    case 'hierro': return (g.iron || 0) < 20 ? 7 : 3;
    case 'textil': return (g.cloth || 0) < 10 ? 5 : 2;
    case 'alfareria': return (g.jars || 0) < 6 ? 5 : 2;
    case 'curtiduria': return 3;
    case 'peleteria': return tempAt(Math.round(g.fy) * W + Math.round(g.fx)) < 8 || ((g.deaths || {})['frío'] || 0) >= 5 ? 9 : 3;
    case 'oro': return 4;
    case 'joyeria': return 3;
  }
  return 1;
}
function nextFac(g){
  const max = Math.min(Object.keys(FACS).length, 1 + Math.floor(popOf(g) / 7));
  if (facsOf(g).length >= max) return null;
  let best = null, bw = 0;
  for (const [k, F] of facUnlocked(g)) { if (hasFac(g, k) || !F.ok(g) || (g.facNoSite || {})[k] > yearT) continue; const w = facNeed(g, k); if (w > bw) { bw = w; best = k; } }
  return best;
}
// ---- Zona industrial: un solar grande a las afueras (hacia la mina, si la hay), con las fábricas en filas ----
function zoneFree(x, y, hw, hh){ return clearable(x - hw, y - hh, x + hw, y + 1) && !pathIn(x - hw, y - hh, x + hw, y) && !farmIn(x - hw, y - hh, x + hw, y + 1) && !plazaIn(x - hw, y - hh, x + hw, y) && !penOverlap(null, x - hw, y - hh, x + hw, y + 1); }
// Radio del pueblo: hasta dónde llegan casi todas sus casas
function townRadius(g){ const d = g.houses.map(h => Math.hypot((h % W) - g.fx, (((h / W) | 0) - g.fy) * 1.2)).sort((a, b) => a - b); return d.length ? d[Math.floor(d.length * .9)] : 8; }
// Casillas a las que se llega andando desde el centro del pueblo (por tierra o por puentes), dentro de un radio
function walkSet(g, R){
  const gx = Math.round(g.fx), gy = Math.round(g.fy), seen = new Set([gy * W + gx]), q = [gy * W + gx];
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of [i - 1, i + 1, i - W, i + W]) { if (seen.has(j)) continue; const x = j % W, y = (j / W) | 0;
    if (Math.abs(x - gx) > R || Math.abs(y - gy) > R || (WATER[world.biome[j]] && !bridgeSet.has(j)) || world.biome[j] === B.LAVA) continue; seen.add(j); q.push(j); } }
  return seen;
}
function pickZone(g){
  let best = null, bs = -1e9; const mine = hasMine(g) ? [g.mine % W, (g.mine / W) | 0] : null, memo = new Map();
  const slot = (x, y) => { const k = y * W + x; let v = memo.get(k); if (v === undefined) { v = zoneFree(x, y, 4, 5) && !buildingClash(x, y, 'fabrica'); memo.set(k, v); } return v; };
  const rT = townRadius(g), R = Math.round(Math.min(80, rT + 30)), st = R > 40 ? 4 : 2, gx = Math.round(g.fx), gy = Math.round(g.fy);
  const reach = walkSet(g, R + 6);
  for (let dy = -R; dy <= R; dy += st) for (let dx = -R; dx <= R; dx += st) {
    const d = Math.hypot(dx, dy * 1.2), x = gx + dx, y = gy + dy; if (d < Math.max(12, rT - 8) || d > R || x < 14 || y < 10 || x >= W - 14 || y >= H - 10 || !reach.has((y + 1) * W + x)) continue;
    if (villages.some(o => o !== g && popOf(o) && Math.hypot(o.fx - x, o.fy - y) < Math.min(d, 20))) continue; // no en el pueblo de al lado
    if (!slot(x, y)) continue;
    let free = 1; for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) if (slot(x + i * 9, y + j * 7)) free++;
    if (free < 3) continue;
    const s = free * 5 - Math.abs(d - Math.max(14, rT * .7)) * .8 - (mine ? Math.hypot(mine[0] - x, mine[1] - y) * .3 : 0); // justo a las afueras
    if (s > bs) { bs = s; best = { x, y }; }
  }
  return best;
}
// Casillas de la cuadrícula de una zona, de la más cercana al centro a la más lejana
function zoneSlots(z){ const out = []; for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) out.push([z.x + i * 9, z.y + j * 7]); return out.sort((a, b) => Math.hypot(a[0] - z.x, (a[1] - z.y) * 1.3) - Math.hypot(b[0] - z.x, (b[1] - z.y) * 1.3)); }
function facSite(g, k){
  const F = FACS[k];
  if (F.mine && hasMine(g)) { // las de metales y el carbón, junto a la mina
    const z = g.mineZone ||= { x:g.mine % W, y:((g.mine / W) | 0) + 2 };
    for (const [x, y] of zoneSlots(z)) if (Math.hypot(x - z.x, y - z.y) <= 16 && zoneFree(x, y, 4, 5) && !buildingClash(x, y, 'fabrica')) return { x, y, zone:'mina' };
    const p = ringFind(z.x, z.y + 2, 18, (x, y) => zoneFree(x, y, 4, 5) && !buildingClash(x, y, 'fabrica')); // si la cuadrícula no cabe, el hueco libre más cercano a la mina
    return p ? { x:p[0], y:p[1], zone:'mina' } : null;
  }
  if (!g.indZone || !zoneSlots(g.indZone).some(([x, y]) => zoneFree(x, y, 4, 5) && !buildingClash(x, y, 'fabrica'))) {
    const z = pickZone(g); if (!z) return null;
    if (!g.indZone) notify(`${g.name} reserva un terreno a las afueras para su zona industrial: allí irán las fábricas`, { x:z.x * T, y:z.y * T });
    g.indZone = z;
  }
  for (const [x, y] of zoneSlots(g.indZone)) if (zoneFree(x, y, 4, 5) && !buildingClash(x, y, 'fabrica')) return { x, y, zone:'ind' };
  return null;
}
// ---- Trabajos (desde chooseJob) ----
function factoryJobs(v, g, add){
  if (!industrial(g)) return;
  const surv = survivalFirst(g), facs = facsOf(g);
  // Construir la siguiente fábrica
  const k = !surv && !busyWith(g, 'fabrica') && nextFac(g);
  if (k) {
    const c = facCost(g, FACS[k]), miss = facMissing(g, c);
    if (!miss.length) add('fabrica', facs.length ? 11 : 16); // la primera fábrica es el gran proyecto del pueblo
    else { const ask = g.facAsk ||= {}; for (const [f, n] of miss) { if (!ask[k + f]) { ask[k + f] = true; notify(`En ${g.name} quieren levantar su ${FACS[k].name.toLowerCase()}, pero les falta ${n}`, { x:g.fx * T, y:g.fy * T }); } if (MAT_JOBS[f]) for (const j of MAT_JOBS[f]) add(j, 2.5); } }
  }
  if (!facs.length) return;
  // Agua para las fábricas: los pozos que hagan falta y, con muchas fábricas y agua dulce cerca, la extractora
  const wantW = waterWant(g);
  if (wantW === 'pozo' && !busyWith(g, 'pozo_fab') && (g.stone >= 5 || g.wood >= 8)) add('pozo_fab', 5);
  if (wantW === 'extractora' && !busyWith(g, 'extractora')) { const miss = facMissing(g, { wood:PUMP.wood, stone:PUMP.stone, iron:PUMP.iron }); if (!miss.length) add('extractora', 14); else { for (const [f] of miss) for (const j of MAT_JOBS[f] || []) add(j, 4); const ask = g.facAsk ||= {}; if (!ask.pump) { ask.pump = true; notify(`En ${g.name} quieren una extractora de agua para las fábricas, pero les falta ${miss.map(m => m[1]).join(' y ')}`, { x:g.fx * T, y:g.fy * T }); } } }
  // Trabajar en las fábricas (no si el pueblo pasa sed o hambre: antes, sobrevivir)
  if (surv || ageOf(v) < ADULT_H) return;
  const f = crewFac(g, v), work = q => q.st !== 'carbon' && q.st !== 'agua' && q.st !== 'material' && q.st !== 'sed';
  if (f) { if (work(f) && inShift(g)) add('fabricar', 12); return; } // los obreros, a su fábrica en su turno
  // Con el fomento de la industria, los demás también echan una mano si hay sitio
  if (hasLaw(g, 'fomento_industria') && facs.some(q => work(q) && workersAt(g, q) < facSlots(g))) add('fabricar', 2);
}
const facSlots = g => (popOf(g) >= 40 ? 3 : 2) + (hasLaw(g, 'fomento_industria') ? 1 : 0);
const workersAt = (g, f) => villagers.filter(u => !u.dead && u.vid === g.id && u.task && (u.task.k === 'fabricar' || u.task.job === 'fabricar') && u.task.i === f.i).length;
// ¿Hace falta más agua? Solo si las fábricas se han quedado sin ella hace poco y el depósito está bajo
function waterWant(g){
  if (!hasPump(g) && facsOf(g).length && pumpSite(g)) return 'extractora'; // en cuanto tienen fábrica
  const dry = (g.facDry || 0) >= 2 && (g.indWater || 0) < facWaterCap(g) * .4; if (!dry) return null;
  const nW = indWellsOf(g).length, nF = facsOf(g).length;
  if (!hasPump(g) && pumpSite(g)) return 'extractora'; // la extractora primero: un pozo no da para una fábrica
  if (nW < Math.ceil(nF * (hasPump(g) ? .4 : .8)) - (hasPump(g) ? 1 : 0) && nW < 6) return 'pozo';
  return null;
}
function pumpSite(g){
  const z = g.indZone || g.mineZone; if (!z) return null;
  if (g.pumpSiteT > yearT) return g.pumpSiteC;
  if (!g.indZone && !g.mineZone) return null;
  const wet = (x, y) => [[0, 2], [-5, 0], [5, 0], [0, 3], [-5, 1], [5, 1]].some(([dx, dy]) => { const i = (y + dy) * W + x + dx; return FRESH(world.biome[i]) && !dried(i); });
  const p = ringFind(z.x, z.y, 45, (x, y) => wet(x, y) && zoneFree(x, y, 4, 4) && !buildingClash(x, y, 'extractora')); // primero lo barato: ¿hay agua dulce al lado?
  g.pumpSiteT = yearT + DAY_LEN; g.pumpSiteC = p; return p;
}
function factoryTarget(v, g, job){
  if (job === 'fabrica') {
    const k = nextFac(g); if (!k) return null;
    const s = facSite(g, k); if (!s) { (g.facNoSite ||= {})[k] = yearT + DAY_LEN * 2; return null; }
    return { k:job, fac:k, zone:s.zone, i:s.y * W + s.x, x:s.x * T + 2, y:(s.y + 1) * T + 3 };
  }
  if (job === 'pozo_fab') {
    const z = g.indZone || g.mineZone; if (!z) return null;
    const p = ringFind(z.x, z.y + 9, 12, (x, y) => zoneFree(x, y, 2, 4) && !buildingClash(x, y, 'pozo_fab') && wellsOf(g).every(w => Math.hypot((w.i % W) - x, ((w.i / W) | 0) - y) >= 5));
    return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
  }
  if (job === 'extractora') { const p = pumpSite(g); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
  if (job === 'fabricar') {
    const own = crewFac(g, v), open = own ? [own] : facsOf(g).filter(f => f.st !== 'carbon' && f.st !== 'agua' && f.st !== 'material' && workersAt(g, f) < facSlots(g)); if (!open.length) return null;
    const f = open.sort((a, b) => facNeed(g, b.k) - facNeed(g, a.k) + (Math.random() - .5) * 3)[0], sb = facSpot(f);
    return sb ? { k:job, i:f.i, x:sb[0] + (Math.random() - .5) * 4, y:sb[1] } : null;
  }
  return null;
}
function factoryArrive(v, g, t){
  const x = t.i % W, y = (t.i / W) | 0;
  if (t.k === 'fabrica') { v.actT = 16; v.onDone = () => {
    const F = FACS[t.fac], c = facCost(g, F); if (!F || hasFac(g, t.fac) || facMissing(g, c).length) return;
    if (clearable(x - 4, y - 5, x + 4, y + 1)) clearSite(g, x - 4, y - 5, x + 4, y + 1);
    if (!tileFree(x, y) || buildingClash(x, y, 'fabrica', t.i)) return;
    world.objs[t.i] = { key:'fac:' + t.fac, v:0, ox:0, oy:0, vid:g.id }; for (const f in c) g[f] -= c[f];
    g.facs.push({ i:t.i, k:t.fac, zone:t.zone, st:'gente', made:0 }); if (g.indWater == null || g.indWater < 12) g.indWater = 12; // la caldera se llena al estrenarla
    composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
    notify(`En ${g.name} levantan ${/^(Fábrica|Fundición|Alfarería|Curtiduría|Peletería|Joyería|Cantera)/.test(F.name) ? 'una' : 'un'} ${F.name.toLowerCase()}${t.zone === 'mina' ? ' junto a la mina' : ' en la zona industrial'}: ${F.desc.split(': ')[1] || F.desc}`, { x:x * T, y:y * T });
  }; return true; }
  if (t.k === 'pozo_fab') { v.actT = 8; v.onDone = () => {
    if (!tileFree(x, y) || buildingClash(x, y, 'pozo_fab', t.i) || (g.stone < 5 && g.wood < 8)) return;
    world.objs[t.i] = { key:'well:pozo', v:0, ox:0, oy:0, vid:g.id }; (g.wells ||= []).push({ i:t.i, q:.6, ind:true }); if (g.stone >= 5) g.stone -= 5; else g.wood -= 8;
    g.facDry = 0; composeRegion(x - 8, y - 10, x + 8, y + 8); connect(g, x, y);
    if (!g.indWellMsg) { g.indWellMsg = true; notify(`En ${g.name} cavan pozos en la zona industrial: las calderas de las fábricas necesitan agua`, { x:x * T, y:y * T }); }
  }; return true; }
  if (t.k === 'extractora') { v.actT = 18; v.onDone = () => {
    if (hasPump(g) || facMissing(g, { wood:PUMP.wood, stone:PUMP.stone, iron:PUMP.iron }).length) return;
    if (clearable(x - 4, y - 5, x + 4, y + 1)) clearSite(g, x - 4, y - 5, x + 4, y + 1);
    if (!tileFree(x, y) || buildingClash(x, y, 'extractora', t.i)) return;
    world.objs[t.i] = { key:'pump:extractora', v:0, ox:0, oy:0, vid:g.id }; g.pump = t.i; g.wood -= PUMP.wood; g.stone -= PUMP.stone; g.iron -= PUMP.iron; g.facDry = 0;
    composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T); pipeCache = null;
    notify(`En ${g.name} levantan una extractora de agua: bombea el agua y la reparte por tuberías a las fábricas`, { x:x * T, y:y * T });
  }; return true; }
  if (t.k === 'fabricar') { v.actT = 6; v.onDone = () => facCycle(v, g, t.i); return true; }
  return false;
}
// Una tanda de trabajo en la fábrica: gasta carbón (media unidad), agua y la materia prima, y produce
function facCycle(v, g, i){
  const f = facsOf(g).find(q => q.i === i); if (!f) return;
  const F = FACS[f.k], st = facState(g, f); f.st = st; if (st !== 'ok') return;
  const firewood = (g.coal || 0) < 1; f.wood = firewood;
  if (firewood) g.wood -= 2; else { f.burn = (f.burn || 0) + 1; if (f.burn >= 2) { f.burn = 0; g.coal -= 1; } } // media unidad de carbón por tanda (o 2 de leña)
  g.indWater -= 1; for (const [r, n] of Object.entries(F.in || {})) g[r] -= n;
  f.lastWork = yearT; f.made = (f.made || 0) + 1;
  const ec = ecOf(g), P = ec ? ec.P || 1 : 1, nat = hasLaw(g, 'nacionalizar_industria'), mul = (hasLaw(g, 'libre_industria') ? 1.1 : 1) * (nat ? .85 : 1) * (1 + (f.lv || 0) * .35);
  let n = Math.max(1, Math.round(F.n * mul * (firewood ? .5 : 1))), txt = F.txt.replace(/\d+/, n);
  switch (F.out) {
    case 'wood': if ((g.coal || 0) < coalReserve(g) && !hasMine(g)) { g.wood += Math.round(n / 2); g.coal = (g.coal || 0) + 2; txt = `+${Math.round(n / 2)} madera, +2 carbón vegetal`; } else g.wood += n; break;
    case 'stone': g.stone = (g.stone || 0) + n; break;
    case 'coal': g.coal = (g.coal || 0) + n; if (hasMine(g)) g.mineLeft = (g.mineLeft ?? MINE_RESERVE) - 1; break;
    case 'iron': g.iron = (g.iron || 0) + n; if (hasMine(g)) g.mineLeft = (g.mineLeft ?? MINE_RESERVE) - 1; break;
    case 'gold': g.gold = (g.gold || 0) + n; if (hasMine(g)) g.mineLeft = (g.mineLeft ?? MINE_RESERVE) - 1; break;
    case 'cloth': g.cloth = (g.cloth || 0) + n; break;
    case 'jars': { const jc = 6 + storesOf(g).length * 8; g.jars = Math.min(jc + 6, (g.jars || 0) + n); g.cups = Math.min(12 + popOf(g), (g.cups || 0) + 2); if (ec) ec.treas += Math.round(2 * P); break; }
    case 'leather': g.leather = (g.leather || 0) + n; if (ec) ec.treas += Math.round(n * 3 * P); break;
    case 'coats': g.coats = (g.coats || 0) + n; break;
    case 'jewels': g.gems = (g.gems || 0) + (Math.random() < .5 ? 1 : 0); if (ec) ec.treas += Math.round(14 * P); break;
  }
  clampStore(g);
  // Lo que deja la fábrica: con la industria nacionalizada, todo al tesoro; si no, un sueldo para quien trabaja y algo al tesoro
  if (ec) ec.treas += Math.round((nat ? 3 : 1) * P) - (hasLaw(g, 'fomento_industria') ? 1 : 0); // (el sueldo lo cobra al acabar la tanda, según su oficio: fabricas.js payWage)
  if (typeof research === 'function') research(g, .12 + (f.lv || 0) * .05); // la industria también hace avanzar: técnicas nuevas
  facLevelUp(g, f); bossCut(g, f);
  g.trades = (g.trades || 0) + (F.out === 'jewels' || F.out === 'leather' ? 1 : 0);
  floats.push({ x:v.x, y:v.y - 16, txt, col:F.col, life:0 });
  if (Math.random() < .3) snd('hammer', v.x, v.y, .3);
}
// ¿Puede trabajar la fábrica? 'ok' o lo que le falta
function facState(g, f){
  const F = FACS[f.k];
  if (f.strike) return 'huelga';
  if (survivalFirst(g)) return 'sed';
  if ((g.coal || 0) < 1 && g.wood < 12) return 'carbon'; // sin carbón, la caldera puede ir con leña (rinde la mitad)
  if ((g.indWater || 0) < 1) return 'agua';
  for (const [r, n] of Object.entries(F.in || {})) if ((g[r] || 0) < n) return 'material';
  if (F.mine && (!hasMine(g) || (g.mineLeft ?? MINE_RESERVE) <= 0)) return 'material';
  return 'ok';
}
// ---- Cada 10 s: agua al depósito, reparto de carbón en la nación, abrigos, estado de cada fábrica ----
function factoryTick(g, dt, people){
  if (!g.facs || !g.facs.length) { if (hasPump(g)) pumpForPeople(g, dt); return; }
  if ((g.facT = (g.facT ?? Math.random() * 10) - dt) > 0) return; g.facT = 10;
  const facs = facsOf(g), cap = facWaterCap(g), surv = survivalFirst(g), at = { x:g.fx * T, y:g.fy * T };
  g.facs = facs; g.indWater = g.indWater || 0;
  // Agua: la extractora bombea (si tiene carbón); los pozos de la zona sueltan la que les sobra (sin bajar de la reserva
  // para beber, que con la ley de protección de las aguas es la mitad)
  if (hasPump(g)) { const p = g.pump, wet = freshNear(p, 3); if (wet && ((g.coal || 0) >= 1 || g.wood >= 8)) { g.pumpBurn = (g.pumpBurn || 0) + 1; if (g.pumpBurn >= 3) { g.pumpBurn = 0; if ((g.coal || 0) >= 1) g.coal -= 1; else g.wood -= 3; } g.pumpOn = true; } else g.pumpOn = false; } // la caldera de la bomba: carbón o, si no hay, leña
  if (surv) { // beber primero: la extractora llena los pozos y los cántaros del pueblo, y las fábricas no gastan agua
    pumpForPeople(g, 10);
    if (!g.facSurvMsg || yearT - g.facSurvMsg > DAY_LEN * 2) { g.facSurvMsg = yearT; notify(`En ${g.name} paran las fábricas: ${g.food >= popOf(g) * 1.2 ? 'el agua es para beber' : 'hace falta gente en el campo, que pasan hambre'}`, at); }
  } else {
    if (g.pumpOn) g.indWater += 15; // una extractora da para unas 4 fábricas a pleno; con más, pozos de apoyo
    const keep = hasLaw(g, 'proteccion_aguas') ? .5 : .35;
    for (const w of indWellsOf(g)) { const take = Math.min(w.q - keep, .12); if (take > 0 && g.indWater < cap) { w.q -= take; g.indWater += take * 20; } }
    g.indWater = Math.min(cap, g.indWater);
  }
  // Estado de cada fábrica (y cuenta de las veces que se quedan sin agua, para cavar pozos solo si de verdad hace falta)
  let dry = false;
  for (const f of facs) {
    f.st = facState(g, f);
    if (f.st === 'ok' && workersAt(g, f) === 0 && yearT - (f.lastWork ?? -1e9) > DAY_LEN * .5) f.st = 'gente';
    if (f.st === 'agua' || (g.indWater < 4 && yearT - (f.lastWork ?? -1e9) < DAY_LEN)) dry = true; // sin agua, o casi y trabajando
    if (f.st === 'carbon' && (!g.facCoalMsg || yearT - g.facCoalMsg > DAY_LEN * 3)) { g.facCoalMsg = yearT; notify(`Las fábricas de ${g.name} se paran: no queda carbón`, at); }
  }
  if (dry) g.facDry = (g.facDry || 0) + 1; else if (g.indWater > cap * .6) g.facDry = 0;
  coalShare(g);
  crewTick(g, people, facs, at);
  laborTick(g, people, facs); // jefe, quejas, despidos y huelgas
  // Peletería: los abrigos, para quien no tiene (los más mayores y los niños primero)
  if ((g.coats || 0) > 0) for (const u of people.filter(u => !u.coat).sort((a, b) => coatNeed(b) - coatNeed(a)).slice(0, g.coats)) { u.coat = true; g.coats--; }
  // El carbón estratégico: el tesoro compra una reserva
  if (hasLaw(g, 'carbon_estrategico')) { const ec = ecOf(g); if (ec && ec.treas > 50 && (g.coal || 0) < coalReserve(g)) { g.coal = (g.coal || 0) + 2; ec.treas -= Math.round(2 * coalPrice() * (ec.P || 1)); } }
}
// Quién recibe antes un abrigo: los soldados (que marchan a la intemperie), los niños pequeños, los mayores y los obreros
const coatNeed = u => (u.weapon ? 4 : 0) + (ageOf(u) < 6 ? 3 : 0) + (u.life && ageOf(u) > u.life * .75 ? 2 : 0) + (u.oficio === 'obrero' ? 1 : 0) + (u.chill || 0);
// La extractora, cuando el pueblo pasa sed: llena los pozos de beber y los cántaros
function pumpForPeople(g, dt){
  if (!hasPump(g) || !freshNear(g.pump, 3) || (g.pumpT = (g.pumpT || 0) - dt) > 0) return; g.pumpT = 10;
  for (const w of wellsOf(g)) w.q = Math.min(1, w.q + .08);
  const jc = 6 + storesOf(g).length * 8; g.jars = Math.min(jc, (g.jars || 0) + 2);
}
// Entre pueblos de la misma nación, el que tiene carbón de sobra se lo manda al que se ha quedado sin
function coalShare(g){
  const need = coalReserve(g) - (g.coal || 0); if (need <= 0) return;
  const n = nationOf(g); if (!n) return;
  const src = villages.filter(o => o !== g && popOf(o) && nationOf(o) === n && (o.coal || 0) > coalReserve(o) + 10 && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 90).sort((a, b) => b.coal - a.coal)[0];
  if (!src) return;
  const k = Math.min(Math.ceil(need), Math.floor(src.coal - coalReserve(src) - 5), 20); if (k < 2) return;
  src.coal -= k; g.coal = (g.coal || 0) + k;
  floats.push({ x:g.fx * T, y:g.fy * T - 14, txt:`+${k} carbón de ${src.name}`, col:'#9a9ca4', life:0 });
}
// ---- Comercio del carbón por las rutas comerciales: el precio sube cuanta más falta hace en el mundo ----
function coalPrice(){
  if (world.coalPT && yearT - world.coalPT < 30) return world.coalP; world.coalPT = yearT;
  let need = 0, have = 0; for (const g of villages) if (popOf(g) && industrial(g)) { need += coalReserve(g); have += g.coal || 0; }
  return world.coalP = clamp(2 * (need + 10) / (have + 10), 1, 8);
}
function coalTrade(a, b, r){
  for (const [s, q] of [[a, b], [b, a]]) {
    const spare = (s.coal || 0) - coalReserve(s) * (hasLaw(s, 'carbon_estrategico') ? 2.5 : 1.3), want = coalReserve(q) * 1.5 - (q.coal || 0);
    if (spare < 4 || want < 3 || !industrial(q)) continue;
    const n = Math.floor(Math.min(25, spare, want)), es = ecOf(s), eq = ecOf(q), price = coalPrice(), pay = Math.round(n * price * (eq ? eq.P || 1 : 1));
    if (eq && eq.treas < pay * .5) continue; // no pueden pagarlo
    s.coal -= n; q.coal = (q.coal || 0) + n;
    if (es && eq) { eq.treas -= pay; const tax = Math.round(pay * (hasLaw(s, 'impuesto_carbon') ? .4 : .15)); es.treas += tax; s.coalTax = (s.coalTax || 0) + tax; s.coalRich = (s.coalRich || 0) + pay - tax; // el tesoro cobra su parte; el resto, los comerciantes del carbón
      const m = people0(s); if (m) m.money = (m.money || 0) + pay - tax; moneyFlow(q, s, `${pay} ${q.coin} por ${n} de carbón`); }
    else moneyFlow(q, s, `${n} de carbón`);
    s.coalSold = (s.coalSold || 0) + n; q.coalBought = (q.coalBought || 0) + n;
    const key = s.id + '>' + q.id; if (!(world.coalMsgs ||= {})[key]) { world.coalMsgs[key] = true; notify(`${s.name} empieza a venderle carbón a ${q.name}: ${n} carros a ${price.toFixed(1)} el carro`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }); }
  }
}
{ const base = routeTick; routeTick = function(a, b, r){ const due = r.route && yearT - (r.routeT ?? -1e9) >= DAY_LEN / 2 && !r.war; base(a, b, r); if (due && r.route) coalTrade(a, b, r); }; }
// Los pueblos con mina sacan también carbón si alguien con quien comercian lo necesita (para vendérselo)
const people0 = g => villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H).sort((a, b) => (b.money || 0) - (a.money || 0))[0]; // el comerciante más rico
const coalBuyer = g => !industrial(g) && hasMine(g) && villages.some(o => o !== g && popOf(o) && industrial(o) && (o.coal || 0) < coalReserve(o) && (relOf(g, o) || {}).route);
{ const base = industryTick; industryTick = function(g, dt, people){
  base(g, dt, people);
  if ((g.thirstT = (g.thirstT ?? Math.random() * 10) - dt) <= 0) { g.thirstT = 10; thirstCheck(g, people); }
  if ((g.hides || 0) > (g.hidesSeen || 0)) g.hidesEver = (g.hidesEver || 0) + g.hides - (g.hidesSeen || 0); g.hidesSeen = g.hides || 0; // pieles juntadas (curtiduría y peletería)
  factoryTick(g, dt, people);
}; }
// Ficha del edificio
{ const base = bldDesc; bldDesc = function(o){ const p = o.key.split(':'); return p[0] === 'fac' && FACS[p[1]] ? FACS[p[1]].desc : base(o); }; }
const FAC_ST = { ok:'en marcha', gente:'parada: nadie trabaja ahora', carbon:'parada: sin carbón', agua:'parada: sin agua', material:'parada: le falta materia prima', sed:'parada: el agua y la gente hacen falta para sobrevivir', huelga:'parada: los obreros están en huelga' };
function facKv(g, i, kv){
  const o = world.objs[i]; if (!g || !o) return '';
  if (o.key === 'pump:extractora') return kv('Estado', g.pumpOn ? (survivalFirst(g) ? 'bombea agua para beber' : 'bombea agua a las fábricas') : freshNear(i, 3) ? 'parada: sin carbón' : 'parada: el agua se ha secado') + kv('Depósito', `${Math.round(g.indWater || 0)} / ${facWaterCap(g)} de agua`);
  const f = facsOf(g).find(q => q.i === i); if (!f) return '';
  const F = FACS[f.k];
  return kv('Estado', (FAC_ST[f.st] || '—') + (f.st === 'ok' && f.wood ? ' (con leña: rinde la mitad, falta carbón)' : '')) + kv('Produce', F.txt + ' por tanda') + kv('Gasta', ['½ carbón', '1 de agua', ...Object.entries(F.in || {}).map(([r, n]) => `${n} de ${{ stone:'piedra', hides:'pieles', gold:'oro' }[r] || r}`)].join(' · '))
    + kv('Jefe', f.state ? 'el estado (fábrica nacionalizada)' : bossOf(g, f) ? `${esc(bossOf(g, f).name)} (lleva ganado ${bossOf(g, f).bossEarn || 0})` : 'nadie') + kv('Sueldo de los obreros', `${Math.round((f.pay ?? 1) * 100)} % de lo normal`) + kv('Ánimo de los obreros', `${Math.round(f.mood ?? 60)} / 100${f.strike ? ' · EN HUELGA' : f.mood < 40 ? ' · enfadados' : ''}`)
    + kv('Obreros', `${(f.crew || []).length}`) + kv('Trabajan', `${workersAt(g, f)} de ${facSlots(g)}`) + kv('Tandas', f.made || 0) + kv('Carbón del pueblo', Math.floor(g.coal || 0)) + kv('Agua para las fábricas', `${Math.round(g.indWater || 0)} / ${facWaterCap(g)}`);
}
{ const base = bldDetails; bldDetails = function(i, g){ const o = world.objs[i], p = o && o.key.split(':')[0]; return (p === 'fac' || p === 'pump' ? facKv(g, i, (a, b) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`) : '') + base(i, g); }; }
// Ficha del pueblo: la industria
function factoryCard(g){
  if (!industrial(g)) return '';
  const facs = facsOf(g), unl = facUnlocked(g), nk = nextFac(g);
  const rows = facs.map(f => `<div>${esc(FACS[f.k].name)} <span class="muted">· ${f.zone === 'mina' ? 'junto a la mina' : 'zona industrial'}</span> <span style="color:${f.st === 'ok' ? '#7ab04a' : '#e8a838'}">· ${FAC_ST[f.st] || '—'}</span></div>`).join('');
  const next = nk ? (() => { const c = facCost(g, FACS[nk]), miss = facMissing(g, c); return `<div>Siguiente: ${esc(FACS[nk].name)} <span class="muted">(${Object.entries(c).map(([f, n]) => `${n} de ${{ wood:'madera', stone:'piedra', iron:'hierro', gold:'oro', coal:'carbón' }[f]}`).join(', ')})</span>${miss.length ? ` <span style="color:#e8a838">· faltan ${miss.map(([, n, d]) => `${d} de ${n}`).join(', ')}</span>` : ' <span style="color:#7ab04a">· listo</span>'}</div>`; })() : '';
  const locked = Object.values(FACS).filter(F => F.tier > facTierOf(g)).length;
  return wageCard(g) + `<h4>Industria</h4><div>${rows || '<div class="muted">Aún no tienen fábricas</div>'}${next}
    <div class="muted">Carbón ${Math.floor(g.coal || 0)} (reserva ${coalReserve(g)}) · agua para las fábricas ${Math.round(g.indWater || 0)}/${facWaterCap(g)} · ${indWellsOf(g).length} pozos industriales${hasPump(g) ? ' · extractora de agua' : ''}${g.coalSold ? ` · ha vendido ${g.coalSold} de carbón` : ''}${g.coalBought ? ` · ha comprado ${g.coalBought}` : ''}${locked ? ` · ${locked} fábricas por desbloquear` : ''}${g.leather ? ` · cuero ${g.leather}` : ''}</div></div>`;
}
// ---- Dibujo ----
// Suelo de la zona industrial (grava apisonada bajo las fábricas) y tuberías de la extractora (en el suelo, antes que los objetos)
let pipeCache = null;
function drawFactoryGround(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    if (!g.facs || !g.facs.length) continue;
    for (const zone of ['ind', 'mina']) { // un recinto de grava por zona, que abarca todas sus fábricas
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (const f of facsOf(g)) { if ((f.zone || 'ind') !== zone) continue; const m = ART_MAP['fac:' + f.k], bx = (f.i % W) * T + 2, by = ((f.i / W) | 0) * T + 3, w = m ? m[2] : 34, ax = m ? m[4] : 17;
        a = Math.min(a, bx - ax - 3); c = Math.max(c, bx - ax + w + 3); b = Math.min(b, by - 9); d = Math.max(d, by + 4); }
      if (a === Infinity || c < x0 || a > x1 || d < y0 || b > y1) continue;
      a = Math.floor(a); b = Math.floor(b); c = Math.ceil(c); d = Math.ceil(d);
      vctx.fillStyle = 'rgba(112,102,88,.6)'; vctx.fillRect(a, b, c - a, d - b);
      vctx.fillStyle = 'rgba(66,60,52,.45)'; for (let k = 0; k < (c - a) * (d - b) / 18; k++) vctx.fillRect(a + ((k * 37 + g.id * 11) % (c - a)), b + ((k * 23 + (k >> 3)) % (d - b)), 1, 1);
      vctx.fillStyle = 'rgba(58,48,36,.7)'; vctx.fillRect(a, b, c - a, 1); vctx.fillRect(a, d - 1, c - a, 1); vctx.fillRect(a, b, 1, d - b); vctx.fillRect(c - 1, b, 1, d - b); // la cerca del recinto
    }
    if (hasPump(g) && (g.indZone || g.mineZone)) drawPipe(g, x0, y0, x1, y1);
  }
}
// Tubería de la extractora a la zona industrial: en ángulo recto, gris, con juntas; el agua corre si la bomba va
function drawPipe(g, x0, y0, x1, y1){
  const z = g.indZone || g.mineZone, px = (g.pump % W) * T + 2, py = ((g.pump / W) | 0) * T + 4, zx = z.x * T + 2, zy = (z.y + 1) * T + 2;
  if (Math.max(px, zx) < x0 || Math.min(px, zx) > x1 || Math.max(py, zy) < y0 || Math.min(py, zy) > y1) return;
  vctx.fillStyle = '#3a3a3e'; vctx.fillRect(Math.min(px, zx) - 1, py - 1, Math.abs(zx - px) + 2, 3); vctx.fillRect(zx - 1, Math.min(py, zy) - 1, 3, Math.abs(zy - py) + 2);
  vctx.fillStyle = '#8e9298'; vctx.fillRect(Math.min(px, zx), py, Math.abs(zx - px), 1); vctx.fillRect(zx, Math.min(py, zy), 1, Math.abs(zy - py));
  vctx.fillStyle = '#5a5e64'; for (let x = Math.min(px, zx); x < Math.max(px, zx); x += 6) vctx.fillRect(x, py - 1, 1, 3); for (let y = Math.min(py, zy); y < Math.max(py, zy); y += 6) vctx.fillRect(zx - 1, y, 3, 1);
  if (g.pumpOn && !survivalFirst(g)) { const t = (performance.now() / 120) % 6; vctx.fillStyle = '#7ab8f0'; for (let x = Math.min(px, zx) + t; x < Math.max(px, zx); x += 6) vctx.fillRect(x, py, 1, 1); }
}
// Humo de las chimeneas (si la fábrica va) e iconos de estado encima de cada fábrica, al acercarse (después de los objetos)
function drawFactoryIcons(now){
  if (!world) return;
  drawStoreLevels();
  const [x0, y0, x1, y1] = visibleRect(), near = zoom >= 2.6;
  for (const g of villages) {
    const list = (g.facs && g.facs.length ? facsOf(g) : []).map(f => [f.i, f.st === 'ok' && yearT - (f.lastWork ?? -1e9) < DAY_LEN * .5 ? 'ok' : f.st === 'ok' ? 'gente' : f.st]);
    if (hasPump(g)) list.push([g.pump, g.pumpOn ? 'ok' : freshNear(g.pump, 3) ? 'carbon' : 'agua']);
    for (const [i, st] of list) {
      const o = world.objs[i], m = o && ART_MAP[o.key]; if (!m) continue;
      const bx = (i % W) * T + 2, by = ((i / W) | 0) * T + 3, top = by - m[3] + 1; if (bx + 30 < x0 || bx - 30 > x1 || by + 6 < y0 || top - 14 > y1) continue;
      if (st === 'ok' && o.key.startsWith('fac:') && Math.random() < .12) smoke.push({ x:bx - m[4] + m[2] * .75, y:top + 2, vx:1 + Math.random() * 2, vy:-5 - Math.random() * 3, r:1.2 + Math.random() * 1.3, life:0, max:2 + Math.random() * 1.5 });
      if (near && !o.burnt) { drawFacIcon(bx, top - 6, st, now); const f = o.key.startsWith('fac:') && facsOf(g).find(q => q.i === i); if (f && f.lv) { vctx.fillStyle = '#f8d850'; for (let k = 0; k < f.lv; k++) vctx.fillRect(bx - f.lv + k * 2 + 1, top - 13, 1, 1); } } // estrellitas: nivel de la fábrica
    }
  }
}
// El icono: un círculo verde con un engranaje que gira (en marcha) o uno rojo con lo que falta (carbón, gota, persona...)
function drawFacIcon(x, y, st, now){
  const ok = st === 'ok', bob = Math.round(Math.sin(now / 400) * .6);
  y += bob;
  vctx.fillStyle = 'rgba(20,16,12,.85)'; vctx.beginPath(); vctx.arc(x, y, 4.6, 0, Math.PI * 2); vctx.fill();
  vctx.fillStyle = ok ? '#4caf50' : st === 'gente' ? '#d8a030' : '#d84838'; vctx.beginPath(); vctx.arc(x, y, 3.8, 0, Math.PI * 2); vctx.fill();
  vctx.fillStyle = '#fff';
  if (ok) { // engranaje
    const a0 = now / 500; for (let k = 0; k < 6; k++) { const a = a0 + k * Math.PI / 3; vctx.fillRect(Math.round(x + Math.cos(a) * 2.2) - .5, Math.round(y + Math.sin(a) * 2.2) - .5, 1, 1); }
    vctx.beginPath(); vctx.arc(x, y, 1.6, 0, Math.PI * 2); vctx.fill(); vctx.fillStyle = '#4caf50'; vctx.fillRect(x - .5, y - .5, 1, 1);
  } else if (st === 'agua') { vctx.fillStyle = '#bfe0ff'; vctx.beginPath(); vctx.moveTo(x, y - 2.6); vctx.lineTo(x + 1.8, y + .6); vctx.arc(x, y + .6, 1.8, 0, Math.PI); vctx.closePath(); vctx.fill(); }
  else if (st === 'carbon') { vctx.fillStyle = '#1c1c20'; vctx.fillRect(x - 2, y - 1, 4, 3); vctx.fillRect(x - 1, y - 2, 2, 1); vctx.fillStyle = '#5a5a62'; vctx.fillRect(x - 1, y - 1, 1, 1); }
  else if (st === 'huelga') { vctx.fillRect(x - 1, y - 2.5, 3, 3); vctx.fillRect(x - .5, y + .5, 2, 2); } // puño en alto: huelga
  else if (st === 'gente') { vctx.fillRect(x - .5, y - 2.5, 2, 2); vctx.fillRect(x - 1.5, y, 4, 2); }
  else if (st === 'sed') { vctx.fillStyle = '#bfe0ff'; vctx.fillRect(x - 2, y - 1, 1, 2); vctx.fillRect(x + 1, y - 1, 1, 2); vctx.fillStyle = '#fff'; vctx.fillRect(x - 2, y - 2.5, 4, 1); } // pausa: primero beber
  else { vctx.fillRect(x - .5, y - 2.5, 1, 3); vctx.fillRect(x - .5, y + 1.5, 1, 1); } // material: «!»
}
// ---- Obreros: cada fábrica tiene su cuadrilla fija, que va a trabajar en su turno ----
const crewFac = (g, v) => v.oficio === 'obrero' ? facsOf(g).find(f => f.i === v.facI && (f.crew || []).includes(pidOf(v))) || null : null;
// ¿Le toca ir a su fábrica? En su turno, si la fábrica puede trabajar y el pueblo no pasa sed ni hambre
const crewShift = (v, g) => { if (!inShift(g) || survivalFirst(g) || ageOf(v) < ADULT_H) return false; const f = crewFac(g, v); return !!f && !f.strike && !['carbon', 'agua', 'material', 'sed', 'huelga'].includes(f.st); };
// Dónde se pone cada obrero: delante de la fábrica, repartidos
function facSpot(f){ const sb = standBy(f.i); if (!sb) return null; const k = Math.floor(Math.random() * 5) - 2; return [sb[0] + k * 3, sb[1] + (Math.random() < .5 ? 0 : 2)]; }
// Qué oficio se pasa mejor a cada fábrica (si no, el que más abunda)
const CREW_FROM = { aserradero:'leñador', cantera:'cantero', carbon:'cantero', hierro:'cantero', oro:'cantero', joyeria:'mercader', textil:'pastor', alfareria:'agricultor', curtiduria:'cazador', peleteria:'cazador' };
function crewTick(g, people, facs, at){
  const byPid = peopleByPid(g), fo = hasLaw(g, 'fomento_industria');
  const adults = people.filter(u => ageOf(u) >= ADULT_H && !u.away && !u.slave && u !== g.leader && u.oficio !== 'soldado');
  let total = 0;
  for (const f of facs) { f.crew = (f.crew || []).filter(pid => { const u = byPid.get(pid); return u && !u.dead && u.vid === g.id && u.oficio === 'obrero' && u.facI === f.i; }); total += f.crew.length; }
  // Los obreros de una fábrica que ya no está vuelven a su antiguo oficio
  for (const u of adults) if (u.oficio === 'obrero' && !facs.some(f => f.i === u.facI && f.crew.includes(pidOf(u)))) { u.oficio = u.oldOficio || pickOficio(g); u.facI = null; }
  (g.staffKeep ||= {}).obrero = yearT + DAY_LEN; // que el reparto de oficios no se los lleve
  // Contratar hasta llenar cada cuadrilla, sin dejar el pueblo sin gente en el campo (no más de un 30 %, un 40 % con fomento)
  const max = Math.ceil(adults.length * (fo ? .4 : .3)), cnt = o => adults.filter(u => u.oficio === o).length;
  if (g.food >= popOf(g) * 2.5) for (const f of facs) while (f.crew.length < facSlots(g) && total < max) {
    const pref = CREW_FROM[f.k], free = adults.filter(u => u.oficio !== 'obrero' && u.facBoss == null && !(u.fired > yearT - DAY_LEN * 2) && !['maestro', 'curandero', 'sabio', 'bombero', 'sacerdote'].includes(u.oficio));
    const u = free.sort((a, b) => (b.oficio === pref) - (a.oficio === pref) || cnt(b.oficio) - cnt(a.oficio))[0]; if (!u) break;
    u.oldOficio = u.oficio; u.oficio = 'obrero'; u.facI = f.i; f.crew.push(pidOf(u)); total++;
    if (!f.hired) { f.hired = true; notify(`${u.name} deja de ser ${ofW(u.oldOficio, u)} y entra de ${ofW('obrero', u)} en ${FACS[f.k].name.toLowerCase()} de ${g.name}`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T }); }
  }
  // La sirena de las fábricas al empezar el turno
  const sh = inShift(g); if (sh && g.shiftWas === false && facs.length) { const f = facs[0]; snd('horn', (f.i % W) * T, ((f.i / W) | 0) * T, .5); for (const q of facs) floats.push({ x:(q.i % W) * T + 2, y:((q.i / W) | 0) * T - 26, txt:'¡uuuuh!', col:'#e8e0cc', life:0 }); }
  g.shiftWas = sh;
}
// Mejoras: con el uso, la fábrica se moderniza (máquinas nuevas: rinde más). Con fomento, a mitad de precio
function facLevelUp(g, f){
  const lv = f.lv || 0; if (lv >= 2 || (f.made || 0) < 30 * (lv + 1)) return;
  const m = hasLaw(g, 'fomento_industria') ? .5 : 1, iron = Math.ceil(4 * (lv + 1) * m), stone = Math.ceil(10 * (lv + 1) * m);
  if ((g.iron || 0) < iron || (g.stone || 0) < stone) { if (!f.upAsk) { f.upAsk = true; notify(`${FACS[f.k].name} de ${g.name} podría modernizarse con ${iron} de hierro y ${stone} de piedra`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T }); } return; }
  g.iron -= iron; g.stone -= stone; f.lv = lv + 1; f.upAsk = false;
  notify(`En ${g.name} modernizan ${FACS[f.k].name.toLowerCase()} (nivel ${f.lv + 1}): máquinas nuevas, rinde más`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T });
  addEffect((f.i % W) * T + 2, ((f.i / W) | 0) * T + 3, 'poof'); snd('bell', (f.i % W) * T, ((f.i / W) | 0) * T, .5);
}
// ---- Sueldos según el oficio (y, los obreros, según la fábrica: la mina y las fundiciones pagan más, por duras) ----
const OFICIO_PAY = { sabio:1.6, curandero:1.5, ingeniero:1.5, maestro:1.3, 'cartógrafo':1.25, mercader:1.3, comerciante:1.2, constructor:1.15, soldado:1.1, bombero:1.1, cantero:1.1,
  sacerdote:1, cazador:1, 'leñador':.95, agricultor:.9, pescador:.9, mensajero:.9, pastor:.85, recolector:.8 };
function payMul(v, g){
  if (v.oficio !== 'obrero') return OFICIO_PAY[v.oficio] ?? 1;
  const f = facsOf(g).find(q => q.i === v.facI), base = (f ? FACS[f.k].pay * (1 + (f.lv || 0) * .1) : 1.1) * 1.5; // (cobran por tanda; la jornada entera en la fábrica)
  if (f && f.state) return 1.8; // fábrica del estado: sueldo fijo
  return hasLaw(g, 'nacionalizar_industria') ? 1.8 : (f ? f.pay ?? 1 : 1) * base * (hasLaw(g, 'fomento_industria') ? 1.1 : 1); // nacionalizada: el mismo sueldo para todos
}
{ const base = payWage; payWage = function(v, g, n){ base(v, g, g ? n * payMul(v, g) : n); }; }
function wageCard(g){
  if (!g.coin) return '';
  const adults = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H);
  const avg = o => { const ws = adults.filter(u => u.oficio === o && u.wage != null).map(wageDay); return ws.length ? Math.round(ws.reduce((a, b) => a + b, 0) / ws.length) : null; };
  const rows = [...new Set(adults.map(u => u.oficio).filter(Boolean))].map(o => [o, avg(o)]).filter(r => r[1] != null).sort((a, b) => b[1] - a[1]);
  return rows.length ? `<h4>Sueldos por oficio</h4><div class="muted">${rows.map(([o, w]) => `${esc(o)} ${w}`).join(' · ')} (${esc(g.coin)} al día, de media)</div>` : '';
}
// ---- Almacenes más grandes: con la industria entra mucho más, así que los amplían (hasta el nivel 4) ----
const storeCost = g => { const lv = g.storeLv || 0; return { wood:15 * (lv + 1), stone:20 * (lv + 1), iron:3 * (lv + 1) }; };
function storeJobs(v, g, add){
  const lv = g.storeLv || 0; if (!industrial(g) || lv >= 3 || busyWith(g, 'mejorar_almacen') || !storesOf(g).length) return;
  const cap = capOf(g); if (Math.max(g.food, g.wood, g.stone) < cap * .8) return;
  if (!facMissing(g, storeCost(g)).length) add('mejorar_almacen', 6);
}
{ const base = factoryJobs; factoryJobs = function(v, g, add){ base(v, g, add); storeJobs(v, g, add); }; }
{ const base = factoryTarget; factoryTarget = function(v, g, job){
  if (job !== 'mejorar_almacen') return base(v, g, job);
  const s = storesOf(g)[0], sb = s != null && standBy(s); return sb ? { k:job, i:s, x:sb[0], y:sb[1] } : null;
}; }
{ const base = factoryArrive; factoryArrive = function(v, g, t){
  if (t.k !== 'mejorar_almacen') return base(v, g, t);
  v.actT = 14; v.onDone = () => {
    const c = storeCost(g); if ((g.storeLv || 0) >= 3 || facMissing(g, c).length) return;
    for (const f in c) g[f] -= c[f]; g.storeLv = (g.storeLv || 0) + 1; addEffect(v.x, v.y - 6, 'poof'); snd('bell', v.x, v.y, .5);
    notify(`En ${g.name} amplían los almacenes (nivel ${g.storeLv + 1}): ahora caben ${capOf(g)} de cada cosa`, { x:v.x, y:v.y });
  };
  return true;
}; }
// Los almacenes ampliados: cajas apiladas al lado y un letrero con el nivel
function drawStoreLevels(){
  const [x0, y0, x1, y1] = visibleRect(), m = ART_MAP['store:almacen']; if (!m) return;
  for (const g of villages) { const lv = g.storeLv || 0; if (!lv) continue;
    for (const i of storesOf(g)) {
      const bx = (i % W) * T + 2, by = ((i / W) | 0) * T + 3, rx = bx - m[4] + m[2] - 2; if (rx < x0 - 20 || rx > x1 + 20 || by < y0 - 10 || by - 30 > y1) continue;
      for (let k = 0; k < lv + 1; k++) { const cx = rx + (k % 2) * 4, cy = by - 3 - Math.floor(k / 2) * 3; vctx.fillStyle = '#3a2614'; vctx.fillRect(cx - 1, cy - 1, 5, 4); vctx.fillStyle = '#b07a44'; vctx.fillRect(cx, cy, 3, 2); vctx.fillStyle = '#8a5a30'; vctx.fillRect(cx + 1, cy, 1, 2); }
      if (zoom >= 2.6) { const sx = bx - m[4] + 3, sy = by - m[3] + 4; vctx.fillStyle = '#2a2018'; vctx.fillRect(sx - 1, sy - 1, 9, 5); vctx.fillStyle = '#e8d8a8'; vctx.fillRect(sx, sy, 7, 3); vctx.fillStyle = '#5a3a20'; for (let k = 0; k <= lv; k++) vctx.fillRect(sx + 1 + k * 2, sy + 1, 1, 1); }
    }
  }
}
// Al obrero que se hiela trabajando, la fábrica (con su caldera) le sirve de refugio si está más cerca que su casa
{ const base = shelterTarget; shelterTarget = function(v, g, cold){
  const t = base(v, g, cold), f = g && crewFac(g, v); if (!f) return t;
  const fx = (f.i % W) * T, fy = ((f.i / W) | 0) * T, df = Math.hypot(fx - v.x, fy - v.y);
  if (t && Math.hypot(t.x - v.x, t.y - v.y) <= df) return t;
  const sb = standBy(f.i); return sb ? { k:'refugio', x:sb[0] + (Math.random() - .5) * 4, y:sb[1] } : t;
}; }
// ---- Ropa: abrigo de piel con el cuello blanco cuando hace frío y gorra de obrero ----
function drawClothes(v, x, y, s, lift, drop){
  const top = y - s.height + 1 - lift - drop;
  if (v.coat) {
    if (!(v.coldT > yearT)) { v.coldT = yearT + 2; v.cold = tempAt(Math.floor(v.y / T) * W + Math.floor(v.x / T)) < 10; }
    if (v.cold) { const ty = y - 8 - lift - drop; vctx.fillStyle = '#5a3a22'; vctx.fillRect(x - 2, ty, 5, 6); vctx.fillStyle = '#8a5c36'; vctx.fillRect(x - 1, ty + 1, 3, 4); vctx.fillStyle = '#f0e6d2'; vctx.fillRect(x - 2, ty, 5, 1); vctx.fillRect(x, ty + 1, 1, 4); }
  }
  if (v.oficio === 'obrero' && v.born !== undefined && (yearT - v.born) / YEAR >= ADULT_H) { vctx.fillStyle = '#2e2e34'; vctx.fillRect(x - 2, top, 4, 1); vctx.fillRect(x + (v.dir < 0 ? -3 : 2), top + 1, 2, 1); } // gorra con visera
}
// ---- El jefe de la fábrica y los obreros: sueldos, quejas, despidos, huelgas, dimisiones y el gobierno ----
// · Cada fábrica tiene un jefe (el patrón): se lleva una parte del beneficio y decide cuánto cobran los obreros
//   (f.pay: 1 = lo normal). Un jefe avaricioso paga menos y gana más
// · El ánimo de los obreros (f.mood) sube con buen sueldo y jornada corta y baja con sueldos bajos, jornada larga y despidos
// · Si se enfadan, protestan delante de la fábrica; el jefe sube el sueldo, despide a los que más gritan o no hace nada
// · Muy enfadados, van a la huelga (la prohibición de huelgas lo frena; con derecho a huelga y sindicato aguantan más)
// · Una huelga larga hace dimitir al jefe; si se alarga y hace daño al país, el líder de la nación interviene:
//   nacionaliza la fábrica, manda a los soldados o media un acuerdo, según su régimen
const FAC_SLOGANS = ['¡Sueldos dignos!', '¡Abajo el patrón!', '¡Menos horas!', '¡Ni un despido más!', '¡Huelga!', '¡Pan y trabajo!'];
function bossOf(g, f){ return f.state || f.boss == null ? null : peopleByPid(g).get(f.boss) || null; }
function pickBoss(g, f, people){
  if (f.state) return;
  const cand = people.filter(u => ageOf(u) >= ADULT_H && !u.dead && !u.away && !u.slave && u.oficio !== 'obrero' && u !== g.leader && u.facBoss == null)
    .sort((a, b) => ((b.edu || 0) * 40 + (b.money || 0)) - ((a.edu || 0) * 40 + (a.money || 0)))[0];
  if (!cand) return;
  f.boss = pidOf(cand); cand.facBoss = f.i; cand.greed ??= Math.random();
  f.pay = clamp(1.15 - cand.greed * .4, .7, 1.2);
  notify(`${cand.name} es ${cand.sex === 'm' ? 'la nueva jefa' : 'el nuevo jefe'} de ${FACS[f.k].name.toLowerCase()} de ${g.name} (${cand.greed > .6 ? 'tiene fama de agarrad' + (cand.sex === 'm' ? 'a' : 'o') : cand.greed < .3 ? 'tiene fama de justo' : 'nadie sabe aún cómo será'})`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T });
}
function facProtest(g, f, people, strike){
  const crew = people.filter(u => (f.crew || []).includes(pidOf(u)) && !u.sleep && !u.boat && !(u.task && ['asalto', 'protesta', 'refugio'].includes(u.task.k)));
  const sb = standBy(f.i); if (!sb || !crew.length) return 0;
  const [cx, cy] = sb, pts = [[cx - 10, cy + 2], [cx + 10, cy + 2], [cx + 10, cy + 7], [cx - 10, cy + 7]];
  crew.forEach((u, k) => { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'protesta', pts, idx:k % 4, until:yearT + (strike ? 40 : 25), slogan:FAC_SLOGANS[(k + (strike ? 4 : 0)) % FAC_SLOGANS.length], col:strike ? '#f08a7a' : '#f2efe6', fac:f.i }; u.lastD = Infinity; });
  if (Math.random() < .7) { const u = crew[0]; floats.push({ x:u.x, y:u.y - 16, txt:u.task.slogan, col:'#f8f0d8', life:0 }); }
  return crew.length;
}
function fireWorkers(g, f, people, n, why){
  const crew = people.filter(u => (f.crew || []).includes(pidOf(u))).sort((a, b) => Math.abs(b.ideo || 0) - Math.abs(a.ideo || 0)).slice(0, n);
  for (const u of crew) { f.crew = f.crew.filter(p => p !== pidOf(u)); u.oficio = u.oldOficio || pickOficio(g); u.facI = null; u.fired = yearT; if (u.task && u.task.fac === f.i) u.task = null; }
  if (crew.length) { f.firedT = yearT; g.anger = (g.anger || 0) + 2 * crew.length; notify(`${bossOf(g, f) ? bossOf(g, f).name : 'El jefe'} despide a ${crew.map(u => u.name).join(' y ')} de ${FACS[f.k].name.toLowerCase()} de ${g.name}${why ? ': ' + why : ''}`, { x:(f.i % W) * T, y:((f.i / W) | 0) * T }); }
}
function endStrike(g, f, txt){ f.strike = null; for (const u of villagers) if (!u.dead && u.task && u.task.k === 'protesta' && u.task.fac === f.i) u.task = null; if (txt) notify(txt, { x:(f.i % W) * T, y:((f.i / W) | 0) * T }); }
function laborTick(g, people, facs){
  const at = f => ({ x:(f.i % W) * T, y:((f.i / W) | 0) * T }), n = nationOf(g), L = n && n.leader && !n.leader.dead ? n.leader : g.leader;
  const ws = wageStats(g), poorPay = g.coin && ws.n && ws.avg < ws.cost;
  for (const f of facs) {
    f.mood ??= 60; f.pay ??= 1;
    let boss = bossOf(g, f);
    if (!f.state && (!boss || boss.dead || boss.vid !== g.id)) { if (boss) boss.facBoss = null; f.boss = null; pickBoss(g, f, people); boss = bossOf(g, f); }
    if (!(f.crew || []).length) continue;
    // Ánimo: hacia lo que pide su situación
    const want = 52 + (f.pay - 1) * 90 + (f.lv || 0) * 3 + (hasLaw(g, 'jornada_corta') ? 8 : 0) - (hasLaw(g, 'jornada_larga') ? 15 : 0) - (yearT - (f.firedT ?? -1e9) < DAY_LEN ? 12 : 0) - (poorPay ? 10 : 0) + (f.state ? 6 : 0);
    if (!f.strike) f.mood += clamp(want - f.mood, -2, 2);
    if (yearT < (f.evT ?? 0)) continue;
    // En huelga: cada poco, ¿ceden?, ¿dimite el jefe?, ¿interviene el gobierno?
    if (f.strike) {
      const days = (yearT - f.strike.since) / DAY_LEN; f.evT = yearT + 20;
      if (inShift(g)) facProtest(g, f, people, true);
      if (boss && Math.random() < .06 + days * .05 * (1 - (boss.greed || .5))) { f.pay = Math.min(1.5, f.pay + .25); f.mood = 68; endStrike(g, f, `Fin de la huelga en ${FACS[f.k].name.toLowerCase()} de ${g.name}: ${boss.name} sube los sueldos y los obreros vuelven al trabajo`); continue; }
      if (boss && days > 1.2 && Math.random() < .3) { boss.facBoss = null; f.boss = null; notify(`${boss.name} dimite como ${boss.sex === 'm' ? 'jefa' : 'jefe'} de ${FACS[f.k].name.toLowerCase()} de ${g.name}, desbordad${boss.sex === 'm' ? 'a' : 'o'} por la huelga`, at(f)); pickBoss(g, f, people); f.pay = Math.max(f.pay, 1.15); f.mood = 60; endStrike(g, f, `Con ${bossOf(g, f) ? bossOf(g, f).name : 'el jefe nuevo'} al frente, los obreros de ${g.name} vuelven a la fábrica`); continue; }
      if (!f.strike.broke && days > 2 - (hasLaw(g, 'derecho_huelga') ? -1 : 0) && !g.union && Math.random() < .3) { f.strike.broke = true; f.mood += 15; endStrike(g, f, `Sin sindicato ni caja de resistencia, los huelguistas de ${g.name} no aguantan más sin cobrar y vuelven a la fábrica`); continue; }
      const striking = villages.filter(o => nationOf(o) === n).reduce((a, o) => a + facsOf(o).filter(q => q.strike).length, 0);
      if (!f.strike.gov && L && (days > 2 || (striking >= 2 && days > 1))) { f.strike.gov = true; govSteps(g, f, L, people); }
      continue;
    }
    // Quejas: protesta delante de la fábrica, y el jefe decide
    if (f.mood < 40 && yearT - (f.protT ?? -1e9) > DAY_LEN * .8) {
      f.protT = yearT; f.evT = yearT + 30; const nP = facProtest(g, f, people, false); if (!nP) continue;
      notify(`Los obreros de ${FACS[f.k].name.toLowerCase()} de ${g.name} protestan delante de la fábrica: ${f.pay < .95 ? 'piden mejores sueldos' : hasLaw(g, 'jornada_larga') ? 'piden menos horas' : 'están hartos'}`, at(f));
      const greed = boss ? boss.greed || .5 : .3, r = Math.random();
      if (r < (1 - greed) * .55) { f.pay = Math.min(1.5, f.pay + .15); f.mood += 18; notify(`${boss ? boss.name : 'La dirección'} cede y sube un poco los sueldos de ${FACS[f.k].name.toLowerCase()} de ${g.name}`, at(f)); }
      else if (boss && r < (1 - greed) * .55 + greed * .45) fireWorkers(g, f, people, 1 + (Math.random() < .4 ? 1 : 0), 'por montar la protesta');
      continue;
    }
    // Huelga
    if (f.mood < 25 && (!hasLaw(g, 'prohibir_huelgas') || Math.random() < .25)) {
      f.strike = { since:yearT, illegal:hasLaw(g, 'prohibir_huelgas') }; f.evT = yearT + 20; facProtest(g, f, people, true);
      notify(`¡Huelga${f.strike.illegal ? ' ilegal' : ''} en ${FACS[f.k].name.toLowerCase()} de ${g.name}! Los obreros no entran a trabajar hasta que les suban el sueldo`, at(f));
      if (f.strike.illegal && boss) fireWorkers(g, f, people, 2, 'la huelga está prohibida');
    }
  }
}
// El gobierno interviene en una huelga que se alarga: cada régimen a su manera
function govSteps(g, f, L, people){
  const reg = regimeOf(nationOf(g)), name = FACS[f.k].name.toLowerCase(), boss = bossOf(g, f), at = { x:(f.i % W) * T, y:((f.i / W) | 0) * T };
  if (['comunismo', 'socialismo'].includes(reg) || hasLaw(g, 'estatal') || hasLaw(g, 'nacionalizar_industria')) {
    if (boss) boss.facBoss = null; f.boss = null; f.state = true; f.pay = 1.2; f.mood = 70;
    endStrike(g, f, `${L.name} nacionaliza ${name} de ${g.name} para acabar con la huelga: ahora es del estado y los obreros cobran un sueldo fijo`);
  } else if (['fascismo', 'dictadura'].includes(reg) || hasLaw(g, 'orden')) {
    fireWorkers(g, f, people, 2, 'cabecillas de la huelga'); f.mood = 35; g.anger = (g.anger || 0) + 8;
    endStrike(g, f, `${L.name} manda a los soldados a ${name} de ${g.name}: rompen la huelga, echan a los cabecillas y los demás vuelven al trabajo a regañadientes`);
  } else {
    f.pay = Math.max(f.pay, 1.2); f.mood = 62; if (boss && (boss.greed || 0) > .6) { boss.facBoss = null; f.boss = null; pickBoss(g, f, people); }
    endStrike(g, f, `${L.name} media en la huelga de ${name} de ${g.name}: acuerdo con subida de sueldo${boss && !bossOf(g, f) ? ' y cambio de jefe' : ''}`);
  }
  snd('bell', at.x, at.y, .5);
}
// El jefe se lleva su parte de cada tanda (más cuanto menos paga); con la fábrica del estado, va al tesoro
function bossCut(g, f){
  const ec = ecOf(g); if (!ec || !g.coin) return;
  const cut = Math.max(1, Math.round(wageOf(g, 3) * (1.7 - (f.pay ?? 1)) * (FACS[f.k].pay || 1)));
  const b = bossOf(g, f); if (b) { b.money = (b.money || 0) + cut; b.bossEarn = (b.bossEarn || 0) + cut; } else ec.treas += cut;
}
