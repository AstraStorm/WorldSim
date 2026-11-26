// World Sim · El petróleo: yacimientos, pozos, refinería, camiones, asfalto y plástico
// ================= Petróleo =================
// · Al crear el mundo (o la primera vez en una partida de antes) aparecen yacimientos: en desiertos y secarrales y, en el
//   mar, cerca de la costa. Se ven como una mancha negra en cuanto alguien sabe buscar petróleo
// · Ciencia: «la prospección petrolera» (combustión + vapor) → pozos; «el refinado» (prospección + electricidad) →
//   refinería, combustible y asfalto; «el plástico» (refinado) → botellas de agua que se venden en el mercado
// · Una ciudad que sabe va a por el yacimiento libre más cercano (hasta 180 casillas, en tierra de nadie o la suya; los del
//   mar, si tiene muelle): levanta el pozo (o la plataforma) y el petróleo se acumula allí
// · Con refinería, camiones con la bandera del país van del pozo a la refinería y vuelven (los del mar, en barco). La
//   refinería saca combustible (las fábricas lo queman si no hay carbón), asfalto (las carreteras empedradas se asfaltan:
//   se va más rápido) y, con el plástico, botellas: con la extractora de agua, agua casi sin fin en el mercado
// · Los pozos son un botín de guerra: quien se rinde entrega uno al vencedor
// · Leyes: «nacionalizar el petróleo» (lo que sale va al tesoro), «impuesto al combustible». Tratado: «suministro de petróleo»
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i + 1, 0, { ...d, req:d.req.filter(k => DISCOVERIES.some(x => x.k === k)) }); if (typeof SCI_REQ === 'object') SCI_REQ[d.k] = d.req; };
  add('combustion', { k:'petroleo', txt:'la prospección petrolera', cost:115, eff:'saben encontrar petróleo y sacarlo con pozos, en tierra y en el mar', req:['combustion', 'vapor'] });
  add('petroleo', { k:'refinado', txt:'el refinado del petróleo', cost:130, eff:'refinerías: combustible para las fábricas, asfalto para las carreteras y camiones', req:['petroleo', 'electricidad'] });
  add('refinado', { k:'plastico', txt:'el plástico', cost:120, eff:'botellas de agua: con la extractora, agua casi sin fin en el mercado', req:['refinado'] });
})();
BLD.add('oil'); BUILD_DIMS.oil = [4, 5]; KIND_DIMS.refineria = [5, 6];
OBJ['oil:pozo'] = ['Pozo petrolero', 'house', 0]; OBJ['oil:plataforma'] = ['Plataforma petrolera', 'house', 0]; OBJ['oil:refineria'] = ['Refinería', 'house', 0];
Object.assign(BLD_DESC, { oil:'Petróleo: el pozo lo saca de la tierra (o del fondo del mar) y la refinería lo convierte en combustible, asfalto y plástico' });
Object.assign(BLD_TYPE, { oil:'Energía' });
// ---- Yacimientos ----
function oilDeposits(){
  if (world.oil) return world.oil;
  const r = mulberry32((hashStr(params.seed) ^ 0x0117) >>> 0), out = [], seaNear = i => { const x = i % W, y = (i / W) | 0; for (let d = 2; d <= 10; d++) for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const j = (y + b) * W + x + a; if (j >= 0 && j < N && !WATER[world.biome[j]]) return true; } return false; };
  const want = Math.max(4, Math.round(N / 22000)), wantSea = Math.max(3, Math.round(N / 35000));
  for (let k = 0; k < 40000 && out.filter(o => !o.sea).length < want; k++) { const i = Math.floor(r() * N), b = world.biome[i]; if (![B.DESERT, B.DRY, B.SAND].includes(b) && !(b === B.PLAINS && r() < .08)) continue; const x = i % W, y = (i / W) | 0; if (x < 6 || y < 8 || x >= W - 6 || y >= H - 4 || out.some(o => Math.hypot(o.i % W - x, ((o.i / W) | 0) - y) < 30)) continue; out.push({ i, sea:false, amt:500 + r() * 700 }); }
  for (let k = 0; k < 40000 && out.filter(o => o.sea).length < wantSea; k++) { const i = Math.floor(r() * N), b = world.biome[i]; if (b !== B.SHALLOW && b !== B.SEA) continue; const x = i % W, y = (i / W) | 0; if (x < 6 || y < 8 || x >= W - 6 || y >= H - 4 || !seaNear(i) || out.some(o => Math.hypot(o.i % W - x, ((o.i / W) | 0) - y) < 30)) continue; out.push({ i, sea:true, amt:800 + r() * 900 }); }
  return world.oil = out;
}
const oilKnown = () => villages.some(g => popOf(g) && knowsSci(g, 'petroleo'));
const wellsOfNation = g => oilDeposits().filter(d => d.owner != null && villageById(d.owner) && nationOf(villageById(d.owner)) === nationOf(g));
// ---- Cada poco: pozos, producción, refinería y transporte ----
let oilT = 0;
SYSTEMS.push(dt => {
  if (!world || (oilT -= dt) > 0) return; const step = 2 - oilT; oilT = 2;
  if (!oilKnown()) return;
  const D = oilDeposits(), towns = liveTowns();
  for (const d of D) { // producción
    if (d.well == null || !world.objs[d.well]) continue; const g = villageById(d.owner); if (!g || !popOf(g)) { d.owner = null; continue; }
    if (d.amt <= 0) { if (!d.dry) { d.dry = true; notify(`Se agota el pozo petrolero de ${g.name}`, { x:(d.i % W) * T, y:(d.i / W | 0) * T }); } continue; }
    const q = Math.min(d.amt, step * (d.sea ? .09 : .06) * (d.relief > yearT - DAY_LEN ? 1.5 : 1)); // (con el relevo del dirigible, más) d.amt -= q; d.stock = Math.min(80, (d.stock || 0) + q);
  }
  for (const g of towns) {
    if (!knowsSci(g, 'petroleo')) continue;
    // Ir a por un yacimiento (uno cada vez)
    const WN = wellsOfNation(g), landOk2 = WN.filter(d => !d.sea).length < 1 + Math.floor(popOf(g) / 60), seaOk2 = !!g.port && WN.filter(d => d.sea).length < 1 + Math.floor(popOf(g) / 120) && (g.iron || 0) >= 15; // (las plataformas del mar van aparte: un pueblo con puerto quiere la suya)
    if (!(g.oilFail > yearT - DAY_LEN / 2) && (landOk2 || seaOk2) && (g.iron || 0) >= 8 && g.stone >= 20 && g.wood >= 15) {
      let best = null, bd = 1e9; const cands = [];
      for (const d of D) {
        if (d.owner != null || (d.sea ? !seaOk2 : !landOk2)) continue; const x = d.i % W, y = (d.i / W) | 0, dist = Math.hypot(x - g.fx, y - g.fy); if (dist > 180) continue;
        if (towns.some(o => nationOf(o) !== nationOf(g) && Math.hypot(o.fx - x, o.fy - y) < 22)) continue; // en la tierra de otro, no (eso es cosa de guerras)
        const hm = !d.sea && houseOver(x, y); if (hm && nationOf(hm.o) === nationOf(g) && (tileFree(x, y) || hm.h === d.i)) { cands.push([dist, d, d.i, hm]); continue; } // (una casa encima: se muda a un lado y el pozo va justo sobre el petróleo)
        let at = d.i; if (!d.sea) { const p = ringFind(x, y, 4, (xx, yy) => tileFree(xx, yy) && !world.objs[yy * W + xx] && !buildingClash(xx, yy, 'cantera')); if (!p) continue; at = p[1] * W + p[0]; } // (si el yacimiento tiene algo encima, el pozo se pone al lado)
        cands.push([dist, d, at]);
      }
      // el más cercano al que llegue un camión por tierra (o, en el mar, con puerto)
      let bat = null, mv = null; for (const [dist, d, at, hm] of cands.sort((a, b) => a[0] - b[0]).slice(0, 4)) { if (!d.sea && !landRoute(g.fx * T, g.fy * T, (at % W) * T + 2, ((at / W) | 0) * T + 3 + T)) continue; best = d; bd = dist; bat = at; mv = hm; break; }
      if (!best) g.oilFail = yearT;
      else {
        const x = bat % W, y = (bat / W) | 0; best.owner = g.id; best.well = bat; g.iron -= best.sea ? 15 : 8; g.stone -= 20; g.wood -= 15;
        const mo = mv ? world.objs[mv.h] : null; if (mv) { world.objs[mv.h] = null; mv.o.houses = mv.o.houses.filter(i => i !== mv.h); composeRegion(mv.h % W - 8, ((mv.h / W) | 0) - 12, mv.h % W + 8, ((mv.h / W) | 0) + 4); }
        world.objs[bat] = { key:best.sea ? 'oil:plataforma' : 'oil:pozo', v:0, ox:0, oy:0, vid:g.id }; if (mv) moveHouse(mv, mo); composeRegion(x - 8, y - 12, x + 8, y + 4); addEffect(x * T + 2, y * T + 3, 'poof');
        notify(`¡${g.name} levanta ${best.sea ? 'una plataforma petrolera en el mar' : 'un pozo petrolero'} a ${Math.round(bd)} casillas de casa! El petróleo ya mana`, { x:x * T, y:y * T });
      }
    }
    // Prospección en el mar: si no hay ningún yacimiento marino a su alcance, buscan frente a su costa
    if (seaOk2 && !(g.seaProsT > yearT) && typeof clearAt === 'function' && !D.some(d => d.sea && d.owner == null && Math.hypot(d.i % W - g.fx, ((d.i / W) | 0) - g.fy) <= 180)) {
      g.seaProsT = yearT + DAY_LEN * 2; const L = g.port.launch, lx = L % W, ly = (L / W) | 0;
      for (let k = 0; k < 120; k++) { const a = Math.random() * Math.PI * 2, r = 25 + Math.random() * 40, x = Math.round(lx + Math.cos(a) * r), y = Math.round(ly + Math.sin(a) * r * .8);
        if (x < 10 || y < 12 || x >= W - 10 || y >= H - 6 || clearAt(x * T, y * T) < 6 || D.some(o => Math.hypot(o.i % W - x, ((o.i / W) | 0) - y) < 30) || !seaPath(cargoPort(g), [x * T, y * T])) continue;
        D.push({ i:y * W + x, sea:true, amt:900 + Math.random() * 800 }); notify(`Los prospectores de ${g.name} encuentran petróleo en el fondo del mar, frente a su costa`, { x:x * T, y:y * T }); break; }
    }
    // La refinería
    if (knowsSci(g, 'refinado') && wellsOfNation(g).some(d => d.owner === g.id) && !hasRefinery(g) && (g.iron || 0) >= 10 && g.stone >= 40 && g.wood >= 20 && !(g.refFail > yearT - DAY_LEN / 3)) {
      const s = refinerySite(g);
      if (!s || !tileFree(s[0], s[1]) || buildingClash(s[0], s[1], 'refineria')) g.refFail = yearT;
      else { const i = s[1] * W + s[0]; world.objs[i] = { key:'oil:refineria', v:0, ox:0, oy:0, vid:g.id }; g.refinery = i; g.iron -= 10; g.stone -= 40; g.wood -= 20; composeRegion(s[0] - 10, s[1] - 12, s[0] + 10, s[1] + 4); addEffect(s[0] * T + 2, s[1] * T + 3, 'poof'); connect(g, s[0], s[1]); notify(`${g.name} abre su refinería: del petróleo saldrán combustible y asfalto`, { x:s[0] * T, y:s[1] * T }); }
    }
    if (!hasRefinery(g)) continue;
    // Refinar: 2 de petróleo → 1 de combustible, algo de asfalto y (con el plástico) plástico
    if ((g.oilStock || 0) >= 2) { const n = Math.min(Math.floor(g.oilStock / 2), 3); g.oilStock -= n * 2; g.fuel = (g.fuel || 0) + n; g.asphalt = (g.asphalt || 0) + n * .5; if (knowsSci(g, 'plastico')) g.plastic = (g.plastic || 0) + n * .5;
      const ec = ecOf(g); if (ec && hasLaw(g, 'nacionalizar_petroleo')) ec.treas += n * 1.5; }
    // Sin carbón, las fábricas queman combustible
    if ((g.coal || 0) < 4 && (g.fuel || 0) >= 2) { g.fuel -= 2; g.coal = (g.coal || 0) + 2; }
    // Asfalto: las carreteras empedradas del pueblo, una a una
    if ((g.asphalt || 0) >= 1 && world.roads && world.roads.length) asphaltOne(g);
    // Botellas de agua (con plástico y extractora)
    if ((g.plastic || 0) >= 1 && (typeof hasPump !== 'function' || hasPump(g) || g.market != null)) { g.plastic -= 1; g.bottles = Math.min(200, (g.bottles || 0) + 6); if (!g.bottleMsg) { g.bottleMsg = true; notify(`En el mercado de ${g.name} ya venden agua embotellada: nadie pasa sed`, { x:g.fx * T, y:g.fy * T }); } }
    // Camiones (y barcos, a las plataformas del mar): uno por pozo con petróleo esperando
    for (const d of D) {
      const ow = villageById(d.owner); if (!ow || nationOf(ow) !== nationOf(g) || (d.stock || 0) < 8 || oilRuns.some(t => t.d === d) || d.noRoute > yearT - DAY_LEN) continue;
      if (d.owner !== g.id && (hasRefinery(ow) || nearestRefinery(d) !== g)) continue; // (si el pueblo del pozo no tiene refinería, lo lleva la más cercana de su nación)
      const a = [(g.refinery % W) * T + 2, ((g.refinery / W) | 0) * T + 3 + T * 2], b = [((d.well ?? d.i) % W) * T + 2, (((d.well ?? d.i) / W) | 0) * T + 3 + T];
      if (d.sea) { const P = [g, ow, ...towns.filter(o => nationOf(o) === nationOf(g))].find(o => o.port); // (sale del puerto de la nación más a mano)
        if (!P || (typeof canCargo === 'function' && canCargo(P))) continue; // (con carguero, lo trae el carguero: carguero.js)
        const L = P.port.launch, pa = [(L % W) * T + 2, ((L / W) | 0) * T + 3]; const bd = (typeof platDock === 'function' && platDock(d)) || b; oilRuns.push({ g:g.id, d, sea:true, pts:[pa, bd], back:[bd, pa], k:0, x:pa[0], y:pa[1], load:0, phase:'ida', drop:a }); }
      else { const r = truckRoute(a[0], a[1], b[0], b[1]); if (!r) { d.noRoute = yearT; continue; } oilRuns.push({ g:g.id, d, sea:false, pts:[a, ...r], k:0, x:a[0], y:a[1], load:0, phase:'ida' }); }
    }
  }
});
// Una casa encima del yacimiento: se derriba y se levanta igual un poco más allá (la familia se muda con ella)
function houseOver(x, y){
  for (const o of liveTowns()) for (const h of o.houses) { const ob = world.objs[h]; if (!ob) continue; const d = BUILD_DIMS[ob.key.split(':')[0]] || [4, 6], hx = h % W, hy = (h / W) | 0; if (Math.abs(x - hx) <= d[0] + 1 && y >= hy - d[1] && y <= hy + 1) return { o, h }; }
  return null;
}
function moveHouse(mv, ob){
  const hx = mv.h % W, hy = (mv.h / W) | 0, [hw, hh] = KIND_DIMS.casa;
  const p = ringFind(hx, hy, 22, (x, y) => Math.hypot(x - hx, y - hy) >= 8 && tileFree(x, y) && clearable(x - hw, y - hh, x + hw, y + 1) && !pathIn(x - hw, y - hh, x + hw, y) && !farmIn(x - hw, y - hh, x + hw, y + 1) && !plazaIn(x - hw, y - hh, x + hw, y) && !buildingClash(x, y, 'casa'));
  if (!p) { for (const u of villagers) if (u.home === mv.h) u.home = null; return; } // (sin sitio: la familia se hará otra casa)
  const i = p[1] * W + p[0]; clearSite(mv.o, p[0] - hw, p[1] - hh, p[0] + hw, p[1] + 1); world.objs[i] = ob; mv.o.houses.push(i); for (const u of villagers) if (u.home === mv.h) u.home = i;
  connect(mv.o, p[0], p[1]); composeRegion(p[0] - 8, p[1] - 12, p[0] + 8, p[1] + 4); addEffect(p[0] * T + 2, p[1] * T + 3, 'poof');
  notify(`En ${mv.o.name} trasladan una casa: debajo había petróleo y el pozo va justo encima`, { x:p[0] * T, y:p[1] * T });
}
// La ruta del camión: por tierra, sin ir pegado a la orilla (el camión no puede asomar sobre el agua) y sin pasar por
// encima de edificios, murallas ni torres; mejor por camino. Si no hay tal ruta, no sale el camión
function truckBlocked(){
  const g = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const o = world.objs[i]; if (!o) continue; const k = o.key.split(':')[0]; if (!BLD.has(k) || k === 'oil' || k === 'pylon') continue; const d = BUILD_DIMS[k] || [1, 1], bx = i % W, by = (i / W) | 0; // (al pozo y a la refinería sí se arrima: es adonde va)
    for (let y = Math.max(0, by - d[1]); y <= by; y++) for (let x = Math.max(0, bx - d[0]); x <= Math.min(W - 1, bx + d[0]); x++) g[y * W + x] = 1; }
  for (const i of wallSet) if (!pathMap.has(i)) g[i] = 1;
  return g;
}
function truckRoute(x0, y0, x1, y1){
  const a = tileOfXY(x0, y0), b = tileOfXY(x1, y1), blk = truckBlocked(), near = i => Math.min(Math.hypot(i % W - a % W, ((i / W) | 0) - ((a / W) | 0)), Math.hypot(i % W - b % W, ((i / W) | 0) - ((b / W) | 0))) <= 3;
  const wet = i => !bridgeSet.has(i) && (WATER[world.biome[i]] || world.biome[i] === B.LAVA);
  for (const M of [2, 1, 0]) { // primero bien lejos del agua; si no hay manera, arrimándose algo más (pero nunca por encima)
    const dry = i => { if (wet(i) || (blk[i] && !near(i))) return false; const x = i % W, y = (i / W) | 0; for (let dy = -M; dy <= Math.min(1, M); dy++) for (let dx = -M; dx <= M; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && wet(yy * W + xx)) return false; } return true; };
    const cost = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), q = [[0, a]]; cost[a] = 0;
    const push = e => { q.push(e); let k = q.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (q[p][0] <= q[k][0]) break; [q[p], q[k]] = [q[k], q[p]]; k = p; } };
    const pop = () => { const top = q[0], last = q.pop(); if (q.length) { q[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < q.length && q[l][0] < q[m][0]) m = l; if (r < q.length && q[r][0] < q[m][0]) m = r; if (m === k) break; [q[m], q[k]] = [q[k], q[m]]; k = m; } } return top; };
    let n = 0;
    while (q.length && n++ < 600000) {
      const [c, i] = pop(); if (i === b) break; if (c > cost[i]) continue; const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (j !== b && !dry(j)) continue;
        if (dx && dy && (!dry(y * W + nx) || !dry(ny * W + x))) continue; // (sin cortar esquinas)
        const nc = c + (dx && dy ? 1.41 : 1) * (pathMap.has(j) || isAsphalt(j) ? .5 : world.objs[j] ? 3 : 1.6); if (nc < cost[j]) { cost[j] = nc; prev[j] = i; push([nc, j]); } }
    }
    if (prev[b] === -1) continue;
    const pts = []; for (let i = b; i !== a; i = prev[i]) pts.push([(i % W) * T + 2, ((i / W) | 0) * T + 3]); pts.reverse(); return pts;
  }
  return null;
}
// ¿Le queda sitio al pueblo para su aeródromo si la refinería va aquí? (si sabe de aviación y aún no lo tiene)
function keepsAir(g, x, y){
  if (typeof farSite !== 'function' || !knowsSci(g, 'aviacion') || hasAirfield(g)) return true;
  const i = y * W + x, was = world.objs[i], r0 = g.refinery; world.objs[i] = { key:'oil:refineria', v:0, ox:0, oy:0, vid:g.id }; g.refinery = i; abT = -1;
  try { return !!farSite(g, 13, 13); } finally { if (was) world.objs[i] = was; else delete world.objs[i]; g.refinery = r0; abT = -1; }
}
// La refinería, pegada a la central (la zona industrial, junta: menos sitio); si no se puede, donde iría una central
function refinerySite(g){
  if (hasPower(g)) { const px = g.plant % W, py = (g.plant / W) | 0;
    const around = []; for (let r = 12; r <= 22; r += 2) for (let k = 0; k < 16; k++) around.push([Math.round(Math.cos(k / 16 * Math.PI * 2) * r * 1.15), Math.round(Math.sin(k / 16 * Math.PI * 2) * r * .8)]);
    for (const [dx, dy] of around) { const x = px + dx, y = py + dy;
      if (x < 8 || y < 9 || x >= W - 8 || y >= H - 3 || !tileFree(x, y) || !clearableRocks(x - 5, y - 6, x + 5, y + 1) || pathCount(x - 5, y - 6, x + 5, y) > 4 || plazaIn(x - 5, y - 6, x + 5, y) || bigClash(x, y, 5, 6) || buildingClash(x, y, 'refineria')) continue;
      if (keepsAir(g, x, y)) { clearRocks(x - 5, y - 6, x + 5, y + 1); return [x, y]; } } }
  return typeof plantSite === 'function' ? plantSite(g) : null;
}
const nearestRefinery = d => { const ow = villageById(d.owner); return liveTowns().filter(o => nationOf(o) === nationOf(ow) && hasRefinery(o)).sort((a, b) => Math.hypot(a.refinery % W - d.i % W, ((a.refinery / W) | 0) - ((d.i / W) | 0)) - Math.hypot(b.refinery % W - d.i % W, ((b.refinery / W) | 0) - ((d.i / W) | 0)))[0] || null; };
const hasRefinery = g => g.refinery != null && world.objs[g.refinery] && world.objs[g.refinery].key === 'oil:refineria';
// ---- Asfalto ----
let asphSet = null, asphN = -1;
const asphaltSet = () => { const A = world.asphalt ||= []; if (!asphSet || asphN !== A.length) { asphSet = new Set(A); asphN = A.length; } return asphSet; };
const isAsphalt = i => !!(world.asphalt && world.asphalt.length && asphaltSet().has(i));
function asphaltOne(g){
  const S = roadSet(), A = asphaltSet(); let best = null, bd = 1e9;
  for (const i of S) { if (A.has(i)) continue; const d = Math.hypot(i % W - g.fx, ((i / W) | 0) - g.fy); if (d < bd && d < 60) { bd = d; best = i; } }
  if (best == null) return; g.asphalt -= .25; world.asphalt.push(best); groundSig = '';
  if (!g.asphMsg) { g.asphMsg = true; notify(`${g.name} empieza a asfaltar sus carreteras: los carros y camiones van mucho más rápido`, { x:g.fx * T, y:g.fy * T }); }
}
{ const base = paintRoads; paintRoads = function(){
  base.apply(this, arguments); if (!world.asphalt || !world.asphalt.length) return;
  const [x0, y0, x1, y1] = visibleRect(), A = asphaltSet();
  for (const i of A) {
    const px = (i % W) * T, py = ((i / W) | 0) * T; if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    vctx.fillStyle = '#3a3c40'; vctx.fillRect(px, py, T, T); vctx.fillStyle = '#46484e'; vctx.fillRect(px + 1, py + 1, T - 2, 1);
    const h = A.has(i - 1) || A.has(i + 1), v = A.has(i - W) || A.has(i + W);
    vctx.fillStyle = '#e8d070'; if (h && !v && (i % W) % 2) vctx.fillRect(px + 1, py + 2, 3, 1); else if (v && !h && ((i / W) | 0) % 2) vctx.fillRect(px + 2, py + 1, 1, 3); // la raya del medio
  }
}; }
// ---- Los viajes del petróleo: camiones por tierra, barcos por mar ----
let oilRuns = [];
SYSTEMS.push(dt => {
  if (!oilRuns.length) return;
  for (const t of oilRuns) {
    const g = villageById(t.g); if (!g || !popOf(g) || !hasRefinery(g)) { t.done = true; continue; }
    const sp = (t.sea ? 26 : (knowsSci(g, 'refinado') ? 34 : 26)) * dt, tgt = t.pts[t.k];
    if (!tgt) { // llegó al final del tramo
      if (t.phase === 'ida') { t.load = Math.min(t.d.stock || 0, t.sea ? 30 : 12); t.d.stock -= t.load; t.phase = 'vuelta'; t.pts = t.sea ? t.back : t.pts.slice().reverse(); t.k = 0; continue; }
      g.oilStock = (g.oilStock || 0) + t.load; if (t.sea && hasLaw(g, 'impuesto_combustible')) { const ec = ecOf(g); if (ec) ec.treas += 1; } t.done = true; continue;
    }
    const dx = tgt[0] - t.x, dy = tgt[1] - t.y, d = Math.hypot(dx, dy);
    if (d <= sp) { t.x = tgt[0]; t.y = tgt[1]; t.k++; } else { t.x += dx / d * sp; t.y += dy / d * sp; t.ang = Math.atan2(dy, dx); }
  }
  oilRuns = oilRuns.filter(t => !t.done);
});
const TRUCK_DIR = ['e', 'se', 's', 'so', 'o', 'no', 'n', 'ne'];
// Mancha de petróleo: un manchurrón irregular, oscuro pero translúcido (se ve el suelo o el agua debajo), quieto; en
// tierra con algún brillo y una burbuja que sube de vez en cuando; en el mar, con un borde irisado
const seepC = new Map();
function seepCanvas(d){
  if (seepC.has(d.i)) return seepC.get(d.i);
  const R = d.sea ? 30 : 22, c = document.createElement('canvas'); c.width = R * 2 + 4; c.height = R + 4; const x = c.getContext('2d'), rnd = mulberry32((d.i * 2654435761) >>> 0);
  const blobs = []; for (let k = 0; k < 16; k++) { const a = rnd() * Math.PI * 2, r = rnd() * R * .62; blobs.push([R + 2 + Math.cos(a) * r, R / 2 + 2 + Math.sin(a) * r * .5, R * (.22 + rnd() * .3)]); }
  const px = (X, Y) => blobs.some(([bx, by, br]) => ((X - bx) / br) ** 2 + ((Y - by) / (br * .5)) ** 2 <= 1);
  for (let Y = 0; Y < c.height; Y++) for (let X = 0; X < c.width; X++) {
    if (!px(X, Y)) continue; const edge = !px(X - 1, Y) || !px(X + 1, Y) || !px(X, Y - 1) || !px(X, Y + 1);
    if (d.sea) x.fillStyle = edge ? ['rgba(170,90,200,.35)', 'rgba(80,160,210,.35)', 'rgba(110,200,120,.32)', 'rgba(230,200,90,.32)'][(X + Y) % 4] : 'rgba(12,14,22,.42)';
    else x.fillStyle = edge ? 'rgba(28,22,18,.4)' : 'rgba(16,12,10,.55)';
    x.fillRect(X, Y, 1, 1);
  }
  if (!d.sea) { x.fillStyle = 'rgba(150,150,185,.35)'; for (let k = 0; k < 6; k++) { const [bx, by] = blobs[k]; x.fillRect(Math.round(bx), Math.round(by) - 1, 2 + (k % 2), 1); } } // brillos
  seepC.set(d.i, c); return c;
}
function drawOilSeep(d, x, y, now){
  const c = seepCanvas(d); vctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  if (!d.sea) { const b = (now / 1400 + (d.i % 97) / 97) % 1; if (b < .3) { vctx.fillStyle = `rgba(40,34,44,${.7 - b * 2})`; vctx.fillRect(x + (d.i % 9) - 4, y - Math.round(b * 4), 1, 1); } } // una burbuja que sube
}
function drawOil(now){
  const [x0, y0, x1, y1] = visibleRect(), known = oilKnown();
  for (const d of oilDeposits()) {
    const wi = d.well != null && world.objs[d.well] ? d.well : d.i, x = (wi % W) * T + 2, y = ((wi / W) | 0) * T + 3; if (x < x0 - 30 || x > x1 + 30 || y < y0 - 40 || y > y1 + 20) continue;
    if (d.well == null || !world.objs[d.well]) { drawOilSeep(d, x, y, now); continue; } // (sin pozo: la mancha negra que delata el petróleo)
    if (!d.sea) { // el balancín, en marcha (8 fotogramas) mientras quede petróleo
      const f = d.amt > 0 ? Math.floor(now / 140 + d.i) % 8 : 0, s = artFrame(`oil:pozo${f}`); if (s) liveQ.push({ y, f:() => { vctx.drawImage(s, x - s.ax, y - s.height + 1); redrawFront(x - s.ax, x - s.ax + s.width, y - s.height + 1, y + 1); } });
    }
  }
  for (const t of oilRuns) {
    if (t.x < x0 - 20 || t.x > x1 + 20 || t.y < y0 - 20 || t.y > y1 + 20) continue; const g = villageById(t.g); if (!g) continue;
    if (t.sea) { drawShip(t.x, t.y, Math.cos(t.ang || 0) < 0 ? -1 : 1, true, villageColor(nationOf(g)), now, .6, true); continue; }
    const k = (Math.round(((t.ang || 0) / (Math.PI * 2)) * 8) + 8) % 8, s = artFrame(`truck:${TRUCK_DIR[k]}`); if (!s) continue;
    vctx.drawImage(s, Math.round(t.x - s.ax), Math.round(t.y - s.height + 2));
    const n = nationOf(g), c = villageColor(n), fx = Math.round(t.x) - 1, fy = Math.round(t.y - s.height - 1); // banderín del país en el techo
    vctx.fillStyle = '#3a3a3a'; vctx.fillRect(fx, fy, 1, 4); if (n.flag) for (let a = 0; a < 4; a++) for (let b2 = 0; b2 < 3; b2++) { vctx.fillStyle = flagColor(n.flag, (a + .5) / 4, (b2 + .5) / 3); vctx.fillRect(fx + 1 + a, fy + b2, 1, 1); } else { vctx.fillStyle = `rgb(${c.join(',')})`; vctx.fillRect(fx + 1, fy, 4, 3); }
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawOil(performance.now()); }; }
// El pozo de tierra se pinta en vivo (animado): en la capa fija, nada
{ const blank = document.createElement('canvas'); blank.width = 22; blank.height = 22; blank.ax = 11;
  const base = artSprite; artSprite = function(o){ if (o && o.key === 'oil:pozo') return blank; return base.apply(this, arguments); }; }
// Agua embotellada: en el mercado, como las tazas (y sin acabarse casi nunca)
{ const base = drinkSpot; drinkSpot = function(v, g){
  if (g && (g.bottles || 0) >= 1 && g.market != null && world.objs[g.market] && Math.hypot(g.market % W - v.x / T, ((g.market / W) | 0) - v.y / T) < 40) { const sb = standBy(g.market); if (sb) { g.bottles -= .5; return { x:sb[0], y:sb[1], cup:true }; } }
  return base.apply(this, arguments);
}; }
// Guerra: quien se rinde entrega al vencedor el pozo que tenga más cerca
{ const base = makePeace; makePeace = function(a, b, r, why){
  const out = base.apply(this, arguments);
  if (why && / se rinde /.test(why)) { const loser = / se rinde/.test(why) && why.startsWith(a.name) ? a : b, win = loser === a ? b : a; const d = wellsOfNation(loser).sort((p, q) => Math.hypot(p.i % W - win.fx, ((p.i / W) | 0) - win.fy) - Math.hypot(q.i % W - win.fx, ((q.i / W) | 0) - win.fy))[0];
    if (d) { d.owner = win.id; const o = world.objs[d.well]; if (o) o.vid = win.id; notify(`${loser.name} entrega su pozo petrolero a ${win.name} como parte de la rendición`, { x:(d.i % W) * T, y:((d.i / W) | 0) * T }); } }
  return out;
}; }
// ---- Leyes y tratado ----
Object.assign(LAW_TXT, { nacionalizar_petroleo:'nacionalizar el petróleo', impuesto_combustible:'impuesto al combustible' });
Object.assign(LAW_DESC, { nacionalizar_petroleo:'lo que sale de la refinería deja dinero en el tesoro', impuesto_combustible:'el combustible paga impuesto: más dinero para el tesoro, algo más de enfado' });
Object.assign(LAW_LEAN, { nacionalizar_petroleo:-.5, impuesto_combustible:-.2 });
Object.assign(LAW_REQ, { nacionalizar_petroleo:g => wellsOfNation(g).length > 0, impuesto_combustible:g => natAny(g, hasRefinery) });
Object.assign(LAW_WHY, { nacionalizar_petroleo:'ahora que hay pozos', impuesto_combustible:'ahora que hay refinería' });
LAW_CLASH.push(['nacionalizar_petroleo', 'libre_industria']);
{ const base = lawsTick; lawsTick = function(g, dt, people){ const due = (g.lawsT ?? 0) - dt <= 0; base.apply(this, arguments); if (!due || !hasLaw(g, 'impuesto_combustible') || !(g.fuel > 0)) return; const ec = ecOf(g); if (ec) ec.treas += 2; g.anger = (g.anger || 0) + .1; }; }
Object.assign(TREATY, { petroleo:{ n:'acuerdo de suministro de petróleo', days:[6, 10], icon:'🛢' } });
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments); if (!r.known || r.war) return;
  if (hasTreaty(r, 'petroleo')) { for (const [s, c] of [[a, b], [b, a]]) if ((s.fuel || 0) > 6 && !hasRefinery(c)) { s.fuel -= 1; c.fuel = (c.fuel || 0) + 1; const es = ecOf(s), ec = ecOf(c); if (es && ec) { ec.treas -= 1; es.treas += 1; } } }
  else if (r.v > 20 && ((hasRefinery(a) && !hasRefinery(b) && industrial(b)) || (hasRefinery(b) && !hasRefinery(a) && industrial(a))) && Math.random() < .03) signTreaty(a, b, r, 'petroleo');
}; }
// ---- La plataforma del mar: los dirigibles llevan el relevo a su helipuerto ----
// Con dirigibles, de vez en cuando uno vuela del pueblo a la plataforma con el turno de relevo, se posa en el helipuerto
// (arriba a la izquierda), espera un poco y vuelve. Con relevo, la plataforma saca más petróleo durante un día
const helipad = d => [((d.well ?? d.i) % W) * T + 2 - 23, (((d.well ?? d.i) / W) | 0) * T + 3 - 31];
{ const base = pickMission; pickMission = function(g){
  if (knowsSci(g, 'dirigible') && Math.random() < .45) {
    const d = oilDeposits().find(d => d.sea && d.well != null && world.objs[d.well] && villageById(d.owner) && nationOf(villageById(d.owner)) === nationOf(g) && Math.hypot((d.i % W) - g.fx, ((d.i / W) | 0) - g.fy) < 200 && !(d.relief > yearT - DAY_LEN / 2) && !villages.some(o => balloonsOf(o).some(b => b.mission && b.mission.kind === 'plataforma' && b.mission.di === d.i)));
    if (d) { const [x, y] = helipad(d); return { kind:'plataforma', di:d.i, tx:x, ty:y }; } // (por su casilla: la misión se guarda en la partida)
  }
  return base.apply(this, arguments);
}; }
{ const base = missionDone; missionDone = function(g, b){
  const m = b.mission; if (!m || m.kind !== 'plataforma') return base.apply(this, arguments);
  const d = oilDeposits().find(q => q.i === m.di); if (d) d.relief = yearT; floats.push({ x:b.x, y:b.y - 16, txt:'relevo en la plataforma', col:'#f0d060', life:0 });
  if (!g.reliefMsg) { g.reliefMsg = true; notify(`El dirigible de ${g.name} se posa en el helipuerto de la plataforma petrolera con el turno de relevo: la plataforma saca más crudo`, { x:b.x, y:b.y }); }
}; }
