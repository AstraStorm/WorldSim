// World Sim · Urbanismo: pueblos ordenados, con calles que llegan a todo y murallas que cierran
// ================= Urbanismo =================
// · Casas (y tabernas y herrerías) en fila a lo largo de las calles que ya hay, con la puerta a la calle y lo más cerca
//   posible de la plaza: el pueblo crece compacto, por manzanas, y no a saltos por el campo
// · Pozos junto a la calle, repartidos, y no más de los que hacen falta
// · Ningún edificio sin camino: cada poco se repasa que la puerta dé a una calle unida a la plaza; si no, se abre una
// · La muralla sigue la forma del pueblo (rodea sus edificios, cercados y parcelas, a unos pasos) en vez de un gran
//   rectángulo que atraviesa casas y campos; nunca entra en el terreno del pueblo vecino (se queda a medio camino);
//   lleva una puerta donde la cruza cada calle importante
// · Partidas de antes: la muralla vieja se cambia por la nueva con los mismos tramos ya pagados
const sedNow = g => g.sedAlarm != null && yearT - g.sedAlarm < DAY_LEN; // sed de verdad (fabricas.js), no el aviso de casi siempre
const URB_NET = i => pathMap.has(i) || plazaSet.has(i) || bridgeSet.has(i) || gateSet.has(i);
const liveTowns = () => villages.filter(o => !o.dead && popOf(o) > 0);
// ¿Esta casilla está más cerca del centro de otro pueblo? (el terreno de cada uno llega hasta medio camino)
function otherTown(g, x, y, towns){
  const d = Math.hypot(x - g.fx, y - g.fy);
  for (const o of towns) if (o !== g && Math.abs(o.fx - x) < d && Math.abs(o.fy - y) < d && Math.hypot(x - o.fx, y - o.fy) < d) return true;
  return false;
}
const wallIn = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; if (wallSet.has(i) || gateSet.has(i)) return true; } return false; };

// ---- Murallas a la medida del pueblo ----
// Pueblos de la misma nación pegados unos a otros (centros a menos de 45 pasos) son una sola ciudad: una sola muralla,
// la que levanta el más antiguo (el de id más bajo), que rodea las casas de todos
function wallCluster(g){
  const n = nationOf(g), out = [g], q = [g];
  while (q.length) { const a = q.pop(); for (const o of liveTowns()) if (!out.includes(o) && nationOf(o) === n && Math.hypot(o.fx - a.fx, o.fy - a.fy) < 45) { out.push(o); q.push(o); } }
  return out;
}
const wallLeader = g => wallCluster(g).reduce((a, b) => b.id < a.id ? b : a);
function ownPlots(g){
  const R = [...pensOf(g).map(p => ({ x0:p.x0, y0:p.y0, x1:p.x1, y1:p.y1 }))];
  for (const q of [g.grove, g.berryPlot, g.cemetery, g.pitch, g.pool, g.track, g.aero, g.registry]) if (q && q.w) R.push({ x0:q.x0, y0:q.y0, x1:q.x0 + q.w - 1, y1:q.y0 + q.h - 1 });
  return R.filter(r => Math.hypot((r.x0 + r.x1) / 2 - g.fx, (r.y0 + r.y1) / 2 - g.fy) <= 45);
}
{ const base = wallPlan; wallPlan = function(g){
  if (g.wallPlan) return g.wallPlan;
  const club = wallCluster(g);
  if (wallLeader(g) !== g) { g.wallPlan = []; g.wallIdx = 0; g.wallRing = 2; g.wallMsg = g.wall2Msg = true; g.gateTiles = new Set(); g.gateKey = 'v2'; g.wallV2 = true; g.wallRect = null; g.wallCoreN = 0; return g.wallPlan; } // la muralla es la de la ciudad
  const m = g.wallRing === 2 ? 6 : 2, cx = Math.round(g.fx), cy = Math.round(g.fy), rects = club.map(o => ({ x0:Math.round(o.fx) - 6, y0:Math.round(o.fy) - 11, x1:Math.round(o.fx) + 6, y1:Math.round(o.fy) + 4 })), force = [];
  const core = coreBuildings(g), near = club.flatMap(o => buildingsOf(o).filter(h => Math.hypot(h % W - o.fx, ((h / W) | 0) - o.fy) <= 60));
  // Cada edificio con su huella entera (la de underBuilding: 5 a cada lado, 7 por encima) y unos pasos de margen
  const foot = (h, e) => { const o = world.objs[h], d = (o && BUILD_DIMS[o.key.split(':')[0]]) || [4, 6], x = h % W, y = (h / W) | 0, hw = Math.max(5, d[0]), hh = Math.max(7, d[1]); return { x0:x - hw - e, y0:y - hh - e, x1:x + hw + e, y1:y + 1 + e }; };
  for (const h of near) force.push(foot(h, 1));
  if (g.fort && Math.hypot(g.fort.i % W - g.fx, ((g.fort.i / W) | 0) - g.fy) <= 32) { const x = g.fort.i % W, y = (g.fort.i / W) | 0; force.push({ x0:x - 8, y0:y - 12, x1:x + 8, y1:y + 2 }); }
  for (const o of club) force.push(...ownPlots(o).map(r => ({ x0:r.x0 - 2, y0:r.y0 - 2, x1:r.x1 + 2, y1:r.y1 + 2 })));
  for (const r of club.flatMap(o => [o.holy, o.marketRect])) if (r) force.push({ x0:r.x0 - 1, y0:r.y0 - 1, x1:r.x1 + 1, y1:r.y1 + 1 });
  let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
  for (const r of [...rects, ...force]) { r.x0 -= m; r.y0 -= m; r.x1 += m; r.y1 += m; X0 = Math.min(X0, r.x0); Y0 = Math.min(Y0, r.y0); X1 = Math.max(X1, r.x1); Y1 = Math.max(Y1, r.y1); }
  X0 = Math.max(2, Math.floor(X0)); Y0 = Math.max(2, Math.floor(Y0)); X1 = Math.min(W - 3, Math.ceil(X1)); Y1 = Math.min(H - 3, Math.ceil(Y1)); // (el centro del pueblo no siempre cae en casilla entera)
  // Rejilla local con un borde de una casilla: 1 = dentro del pueblo
  const bw = X1 - X0 + 3, bh = Y1 - Y0 + 3, blob = new Uint8Array(bw * bh), at = (x, y) => (y - Y0 + 1) * bw + (x - X0 + 1);
  const towns = liveTowns().filter(o => !club.includes(o) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 120), fill = (r, v, clip) => { for (let y = Math.max(Y0, r.y0); y <= Math.min(Y1, r.y1); y++) for (let x = Math.max(X0, r.x0); x <= Math.min(X1, r.x1); x++) if (!clip || !foreign(x, y)) blob[at(x, y)] = v; };
  const foreign = (x, y) => { const d = Math.min(...club.map(o => Math.hypot(x - o.fx, y - o.fy))); return towns.some(o => Math.abs(o.fx - x) < d && Math.abs(o.fy - y) < d && Math.hypot(x - o.fx, y - o.fy) < d); };
  for (const r of rects) fill(r, 1, true);
  for (const r of force) fill(r, 1, false); // lo suyo, aunque quede más cerca del vecino
  // Cierre (dilatar y luego erosionar 4 casillas): rellena las entradas estrechas entre casas para que la muralla no
  // vaya haciendo zigzag alrededor de cada una
  const morph = (src, r, grow) => { const tmp = new Uint8Array(src.length), dst = new Uint8Array(src.length);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { let v = grow ? 0 : 1; for (let k = -r; k <= r; k++) { const xx = x + k, b = xx < 0 || xx >= bw ? 0 : src[y * bw + xx]; if (grow ? b : !b) { v = grow ? 1 : 0; break; } } tmp[y * bw + x] = v; }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { let v = grow ? 0 : 1; for (let k = -r; k <= r; k++) { const yy = y + k, b = yy < 0 || yy >= bh ? 0 : tmp[yy * bw + x]; if (grow ? b : !b) { v = grow ? 1 : 0; break; } } dst[y * bw + x] = v; }
    return dst; };
  const closed = morph(morph(blob, 4, true), 4, false); for (let k = 0; k < blob.length; k++) if (closed[k]) blob[k] = 1;
  for (let x = 0; x < bw; x++) blob[x] = blob[(bh - 1) * bw + x] = 0; for (let y = 0; y < bh; y++) blob[y * bw] = blob[y * bw + bw - 1] = 0; // (el borde, siempre fuera)
  // Lo del vecino (edificios, cercados, parcelas) queda fuera: la muralla pasa por delante, nunca por debajo
  for (const o of towns) {
    for (const h of buildingsOf(o)) { const x = h % W, y = (h / W) | 0; if (x >= X0 - 7 && x <= X1 + 7 && y >= Y0 - 2 && y <= Y1 + 9) fill({ x0:x - 6, y0:y - 8, x1:x + 6, y1:y + 2 }, 0, false); }
    for (const r of ownPlots(o)) fill({ x0:r.x0 - 1, y0:r.y0 - 1, x1:r.x1 + 1, y1:r.y1 + 1 }, 0, false);
  }
  for (const h of near) fill(foot(h, 1), 1, false); // donde los dos pueblos se mezclan, primero lo suyo (sin margen)
  // Los huecos que quedan dentro (patios entre manzanas) también son pueblo
  const out = new Uint8Array(bw * bh), q = [0]; out[0] = 1;
  while (q.length) { const k = q.pop(), x = k % bw, y = (k / bw) | 0; for (const [dx, dy] of STREETS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue; const j = ny * bw + nx; if (!out[j] && !blob[j]) { out[j] = 1; q.push(j); } } }
  for (let k = 0; k < blob.length; k++) if (!out[k]) blob[k] = 1;
  // El contorno: casillas del pueblo que tocan (también en diagonal) el exterior
  const ring = [];
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    if (!blob[at(x, y)]) continue;
    let edge = false; for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !blob[at(x + dx, y + dy)]) { edge = true; break; }
    if (edge) ring.push([x, y]);
  }
  if (ring.length < 8) return base.call(this, g);
  ring.sort((a, b) => Math.atan2(a[1] - g.fy, a[0] - g.fx) - Math.atan2(b[1] - g.fy, b[0] - g.fx));
  const plan = ring.map(([x, y]) => y * W + x);
  // Puertas: donde la cruza una calle (separadas al menos 7 pasos); y si casi no hay calles, una mirando a cada lado
  const gates = [], far = (x, y) => gates.every(j => Math.hypot(j % W - x, ((j / W) | 0) - y) >= 7);
  for (const i of plan) { const x = i % W, y = (i / W) | 0; if (pathMap.has(i) && !WATER[world.biome[i]] && far(x, y)) gates.push(i); }
  if (gates.length < 2) for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    let best = null, bd = 1e9; for (const i of plan) { const x = i % W, y = (i / W) | 0; if (WATER[world.biome[i]]) continue; const d = Math.abs(Math.atan2(y - g.fy, x - g.fx) - a); if (d < bd) { bd = d; best = i; } }
    if (best != null && far(best % W, (best / W) | 0)) gates.push(best);
  }
  g.wallPlan = plan; g.wallIdx = 0; g.gateTiles = new Set(gates); g.gateKey = 'v2'; g.wallV2 = true; g.wallCoreN = core.filter(h => !otherTown(g, h % W, (h / W) | 0, towns)).length;
  let rx0 = 1e9, ry0 = 1e9, rx1 = -1e9, ry1 = -1e9; for (const [x, y] of ring) { rx0 = Math.min(rx0, x); ry0 = Math.min(ry0, y); rx1 = Math.max(rx1, x); ry1 = Math.max(ry1, y); }
  g.wallRect = { x0:rx0, y0:ry0, x1:rx1, y1:ry1 };
  return plan;
}; }
{ const base = wallGates; wallGates = function(g){ return g.wallV2 ? (g.gateTiles || new Set()) : base.call(this, g); }; }
// Un tramo puesto sin obra (al cambiar la muralla vieja por la nueva): las mismas reglas que al levantarla
function placeWall(g, i, stone){
  const x = i % W, y = (i / W) | 0, o = world.objs[i];
  if (WATER[world.biome[i]] || bridgeSet.has(i) || plazaSet.has(i)) return false;
  if (midGate(g, i)) { gateSet.add(i); gateOwner.set(i, g.id); return true; }
  if (o && (isBuilding(o) || o.key.startsWith('fire') || o.vid != null)) return false;
  if (underBuilding(g, x, y) || plotIn(x, y, x, y) || villages.some(q => inPen(q, x, y, 1))) return false;
  if (o) { world.objs[i] = null; composeRegion(x - 7, y - 11, x + 7, y + 12); }
  farmMap.delete(i); pathMap.delete(i); wallSet.add(i); if (stone) wallStone.add(i);
  return true;
}
function wallMigrate(g){
  g.wallV2 = true;
  const old = [...(g.wallPlan || []), ...(g.wallPlan1 || [])]; if (!old.length) return;
  let built = 0, stone = 0;
  for (const i of old) {
    if (wallSet.has(i)) { built++; if (wallStone.has(i)) stone++; wallSet.delete(i); wallStone.delete(i); }
    if (gateOwner.get(i) === g.id) { gateSet.delete(i); gateOwner.delete(i); }
  }
  g.wallRing = 1; g.wallPlan = g.wallPlan1 = null; g.gateTiles = null; g.wallMsg = g.wall2Msg = false;
  const pl = wallPlan(g); let k = 0, n = 0;
  while (k < pl.length && n < built) { if (placeWall(g, pl[k], stone > built / 2)) n++; k++; }
  g.wallIdx = k; if (k >= pl.length) g.wallMsg = true; // (la segunda muralla, si hace falta, se planea luego a su medida)
}
// El pueblo se sale de su muralla: se rehace a su medida (lo que coincide se queda; lo demás se derriba)
{ wallGrow = function(g){
  if (!g.wallRect || !popOf(g)) return;
  if (!g.wallV2) { wallMigrate(g); return; }
  const ring = new Set(villages.filter(o => popOf(o)).flatMap(o => [...(o.wallPlan || []), ...(o.wallPlan1 || [])]));
  for (const i of [...wallSet, ...gateSet]) if (!ring.has(i)) { wallSet.delete(i); wallStone.delete(i); gateSet.delete(i); gateOwner.delete(i); }
  for (const i of [...gateSet]) if (gateOwner.get(i) === g.id && !wallGates(g).has(i)) { gateSet.delete(i); gateOwner.delete(i); wallSet.add(i); }
  const R = g.wallRect, towns = liveTowns(), core = coreBuildings(g).filter(h => !otherTown(g, h % W, (h / W) | 0, towns)); // (lo que cae en terreno del vecino no cuenta)
  const out = core.some(h => { const x = h % W, y = (h / W) | 0; return x - 2 <= R.x0 || x + 2 >= R.x1 || y - 4 <= R.y0 || y + 1 >= R.y1; });
  if (!out && core.length < (g.wallCoreN || 0) + 8) return;
  const old = new Set([...(g.wallPlan || []), ...(g.wallPlan1 || [])]);
  g.wallRing = 1; g.wallPlan1 = null; g.wallPlan = null; g.wallMsg = g.wall2Msg = false;
  const keep = new Set(wallPlan(g)); let n = 0;
  for (const i of old) if (!keep.has(i)) { if (wallSet.has(i)) { wallSet.delete(i); wallStone.delete(i); n++; } if (gateOwner.get(i) === g.id) { gateSet.delete(i); gateOwner.delete(i); } }
  g.wallIdx = 0; g.wood += Math.round(n * .3);
  if (n > 6) notify(`${g.name} ha crecido: rehacen la muralla alrededor de las casas nuevas`, { x:g.fx * T, y:g.fy * T });
}; }

// ---- Casas en fila a lo largo de las calles ----
const FRONT_KINDS = new Set(['casa', 'taberna', 'herreria']);
const streetCache = new Map();
function streetsNear(g){
  const c = streetCache.get(g.id), now = performance.now(); if (c && now - c.t < 4000) return c.list;
  const R = Math.max(14, Math.min(40, townRadius(g) + 8)), list = [];
  for (let y = Math.max(2, Math.round(g.fy - R)); y <= Math.min(H - 3, Math.round(g.fy + R)); y++) for (let x = Math.max(2, Math.round(g.fx - R)); x <= Math.min(W - 3, Math.round(g.fx + R)); x++) {
    const i = y * W + x; if (!pathMap.has(i) || bridgeSet.has(i)) continue;
    const d = Math.hypot(x - g.fx, (y - g.fy) * 1.2); if (d <= R) list.push([x, y, d]);
  }
  list.sort((a, b) => a[2] - b[2]); streetCache.set(g.id, { t:now, list }); return list;
}
function frontOk(g, kind, x, y, towns){
  const [hw, hh] = KIND_DIMS[kind] || [4, 6], i = y * W + x;
  if (x <= hw || y <= hh + 1 || x >= W - hw - 1 || y >= H - 3 || farmMap.has(i) || pathMap.has(i)) return false;
  if (x - hw <= g.fx + 1 && x + hw >= g.fx - 1 && Math.abs(y - g.fy) <= 50) return false; // la calle mayor norte-sur queda libre
  if (otherTown(g, x, y, towns)) return false;
  return !penOverlap(g, x - hw, y - hh, x + hw, y + 1) && !plazaIn(x - hw, y - hh, x + hw, y) && !hallIn(g, x - hw, y - hh, x + hw, y + 1) && !farmIn(x - hw, y - hh, x + hw, y + 1)
    && !pathIn(x - hw, y - hh, x + hw, y) && !wallIn(x - hw, y - hh, x + hw, y + 1) && !plotIn(x - hw, y - hh, x + hw, y + 1) && clearable(x - hw, y - hh, x + hw, y + 1) && !buildingClash(x, y, kind);
}
// El mejor solar con la puerta a una calle: cerca de la plaza, en fila con los vecinos y, si hay muralla, dentro
function frontSite(g, kind){
  const towns = liveTowns().filter(o => o !== g && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 100), R = g.wallRect, cand = [];
  const row = new Map(); for (const b of buildingsOf(g)) { const y = (b / W) | 0; (row.get(y) || row.set(y, []).get(y)).push(b % W); }
  for (const [sx, sy, d] of streetsNear(g)) {
    const x = sx, y = sy - 1; // la casa al norte de la calle: su puerta da a ella
    let s = d;
    const xs = row.get(y); if (xs && xs.some(bx => Math.abs(bx - x) <= 13)) s -= 6; // sigue la fila de las casas vecinas
    if (R && (x < R.x0 + 4 || x > R.x1 - 4 || y < R.y0 + 7 || y > R.y1 - 2)) s += 12;
    cand.push([s, x, y]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  let tests = 0;
  for (const [, x, y] of cand) { if (++tests > 140) break; if (frontOk(g, kind, x, y, towns)) return [x, y]; }
  return null;
}
// Pozos: junto a una calle, a unos pasos de las casas y lejos de los otros pozos
function wellFront(g){
  const gap = sedNow(g) ? 7 : 11, towns = liveTowns().filter(o => o !== g && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 100);
  const ws = wellsOf(g).map(w => [w.i % W, (w.i / W) | 0]), hs = housesOf(g).map(h => [h % W, (h / W) | 0]);
  let tests = 0;
  for (const [sx, sy] of streetsNear(g)) {
    const x = sx, y = sy - 1;
    if (ws.some(([wx, wy]) => Math.hypot(wx - x, wy - y) < gap)) continue;
    if (hs.length && !hs.some(([hx, hy]) => Math.hypot(hx - x, hy - y) < 12)) continue;
    if (++tests > 80) break;
    if (frontOk(g, 'pozo', x, y, towns)) return [x, y];
  }
  return null;
}
{ const base = planSite; planSite = function(g, kind){
  if (FRONT_KINDS.has(kind)) { const p = frontSite(g, kind); if (p) return p; }
  if (kind === 'pozo' && wellsOf(g).length) { const p = wellFront(g); if (p) return p; }
  return base.apply(this, arguments);
}; }

// ---- Que todo tenga camino: la puerta de cada edificio, unida a la red de calles de la plaza ----
function townNet(g){ // las calles unidas a la plaza (hasta un poco más allá del pueblo)
  const R = Math.max(20, Math.min(70, townRadius(g) + 30)), s0 = Math.round(g.fy) * W + Math.round(g.fx), seen = new Set([s0]), q = [s0];
  while (q.length) {
    const i = q.pop();
    for (const j of [i - 1, i + 1, i - W, i + W]) { if (seen.has(j) || !URB_NET(j)) continue; if (Math.hypot(j % W - g.fx, ((j / W) | 0) - g.fy) > R) continue; seen.add(j); q.push(j); }
  }
  return seen;
}
function linkRoute(g, start, net){
  const hx = g.fx, hy = g.fy, gs = new Map([[start, 0]]), par = new Map(), heap = [[0, start]];
  const cost = i => {
    const x = i % W, y = (i / W) | 0; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return Infinity;
    if (URB_NET(i)) return wallSet.has(i) ? Infinity : .3;
    if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || wallSet.has(i)) return Infinity;
    const o = world.objs[i]; if (o && !['tree', 'berry'].includes(OBJ[o.key][1])) return Infinity;
    if (underBuilding(g, x, y)) return Infinity;
    return (o ? 4 : 1) + (farmMap.has(i) ? 6 : 0) + (plotIn(x, y, x, y) ? 20 : 0);
  };
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (let n = 0; heap.length && n < 7000; n++) {
    const [, i] = pop();
    if (i !== start && net.has(i)) { const out = []; for (let j = i; j !== undefined; j = par.get(j)) out.push(j); return out; }
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      const c = cost(j); if (c === Infinity) continue;
      const ng = gs.get(i) + c; if (ng < (gs.get(j) ?? Infinity)) { gs.set(j, ng); par.set(j, i); push(ng + Math.hypot((j % W) - hx, ((j / W) | 0) - hy) * .3, j); }
    }
  }
  return null;
}
function townDoors(g){
  const L = buildingsOf(g).filter(i => world.objs[i]);
  if (fortOf(g)) L.push(g.fort.i);
  for (const f of g.facs || []) if (world.objs[f.i]) L.push(f.i);
  if (g.pump != null && world.objs[g.pump]) L.push(g.pump);
  return [...new Set(L)];
}
function linkTick(g){
  const net = townNet(g), now = yearT; let made = 0;
  g.linkFail ||= {};
  for (const b of townDoors(g)) {
    const door = b + W; if (net.has(door) || net.has(door - 1) || net.has(door + 1) || net.has(door + W)) continue;
    if ((g.linkFail[b] || -1e9) > now) continue;
    if (WATER[world.biome[door]]) continue;
    const r = linkRoute(g, door, net);
    if (!r) { g.linkFail[b] = now + DAY_LEN; continue; }
    for (const i of r) if (!URB_NET(i) && !WATER[world.biome[i]]) { farmMap.delete(i); pathMap.add(i); net.add(i); }
    if (!pathMap.has(door) && !WATER[world.biome[door]]) pathMap.add(door);
    if (++made >= 2) break;
  }
  for (const k in g.linkFail) if (g.linkFail[k] < now - DAY_LEN * 3) delete g.linkFail[k];
}
let urbIdx = 0, urbT = 0;
SYSTEMS.push(dt => {
  if (!world || !villages.length || (urbT -= dt) > 0) return;
  urbT = 1.5;
  const towns = liveTowns(); if (!towns.length) return;
  for (const g of towns) if (!g.wallV2 && (g.wallPlan || g.wallPlan1)) wallMigrate(g);
  const g = towns[urbIdx++ % towns.length]; if (g.hall != null || popOf(g) >= 6) linkTick(g);
});
