// World Sim · Caminos reales entre pueblos: la ruta comercial se convierte en camino, carretera y venta
// ================= Caminos de la ruta comercial =================
// · Antes, una ruta comercial por tierra era una raya discontinua en línea recta con carritos que la cruzaban por encima
//   de bosques y ríos. Ahora, al abrirse (o en partidas de antes), se traza un camino de verdad entre los dos pueblos que
//   serpentea por el terreno y cruza los ríos por los puentes; los carros van y vienen por él
// · Con las carreteras empedradas, los dos pueblos lo van empedrando poco a poco, cada uno desde su lado
// · Si el camino es largo, a medio camino abre una venta (una posada de camino) del pueblo más rico: le deja algo de
//   dinero cada medio día con el paso de los carros
const ROAD_MIN = 18; // (más cerca, ya se unen por sus propias calles)
// El trazado: desde la casilla de camino del pueblo b más cercana a a, hasta cualquier camino de a
function tradeRoadPath(a, b){
  const Ra = (typeof townRadius === 'function' ? townRadius(a) : 10) + 10, Rb = (typeof townRadius === 'function' ? townRadius(b) : 10) + 10;
  let s = null, bd = 1e9;
  for (const i of pathMap) { const x = i % W, y = (i / W) | 0; if (Math.hypot(x - b.fx, y - b.fy) > Rb) continue; const d = Math.hypot(x - a.fx, y - a.fy); if (d < bd) { bd = d; s = i; } }
  if (s == null) s = b.fy * W + b.fx;
  const goal = i => (pathMap.has(i) || plazaSet.has(i)) && Math.hypot(i % W - a.fx, ((i / W) | 0) - a.fy) <= Ra;
  const far = Math.hypot(a.fx - b.fx, a.fy - b.fy);
  return pathTiles(a, s % W, (s / W) | 0, 2.2, Math.min(120000, 6000 + far * 500), goal);
}
function layTradeRoad(r, a, b){
  const R = r.route; if (R.road || (R.roadFail && yearT - R.roadFail < DAY_LEN * 2)) return;
  if (Math.hypot(a.fx - b.fx, a.fy - b.fy) < ROAD_MIN) { R.road = []; return; }
  const p = tradeRoadPath(a, b); if (!p) { R.roadFail = yearT; return; }
  const road = p.reverse(); // (de a hacia b)
  for (const i of road) { if (bridgeSet.has(i) || WATER[world.biome[i]]) continue; farmMap.delete(i); pathMap.add(i); if (wallSet.has(i)) { wallSet.delete(i); gateSet.add(i); } }
  R.road = road; R.roadA = a.id;
  const xs = road.map(i => i % W), ys = road.map(i => (i / W) | 0); composeRegion(Math.min(...xs) - 4, Math.min(...ys) - 6, Math.max(...xs) + 4, Math.max(...ys) + 4);
  notify(`Entre ${a.name} y ${b.name} ya hay un camino de verdad: los carros de la ruta comercial van y vienen por él`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T });
}
// Empedrar: cada medio día, un tramo desde cada lado (si saben y tienen piedra)
function paveTradeRoad(r, a, b){
  const R = r.route, road = R.road; if (!road || !road.length || R.paved) return;
  const S = roadSet(), Rs = (world.roads ||= []); let left = 0;
  for (const [g, list] of [[a, road], [b, [...road].reverse()]]) {
    if (!knowsSci(g, 'empedrado') || (g.stone || 0) < 6) continue; let n = 0;
    for (const i of list) { if (n >= 14) break; if (S.has(i) || !pathMap.has(i) || bridgeSet.has(i) || plazaSet.has(i)) continue; Rs.push(i); S.add(i); n++; }
    if (n) g.stone -= Math.ceil(n / 3);
  }
  for (const i of road) if (pathMap.has(i) && !bridgeSet.has(i) && !plazaSet.has(i) && !S.has(i)) left++;
  if (!left) { R.paved = true; notify(`El camino entre ${a.name} y ${b.name} ya es una carretera empedrada de punta a punta`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }); }
}
// La venta: a medio camino, junto a la carretera, lejos de los pueblos
const INN_NAMES = ['del Cruce', 'del Arriero', 'de la Herradura', 'del Camino Real', 'de los Carros', 'del Buen Paso', 'de la Encina', 'del Caminante'];
function tradeInn(r, a, b){
  const R = r.route, road = R.road; if (!road || road.length < 45 || R.inn || yearT - (R.since ?? yearT) < DAY_LEN * 1.5 || (R.innFail && yearT - R.innFail < DAY_LEN)) return;
  const own = (a.coin ? (ecOf(a) || {}).treas || 0 : 0) + popOf(a) >= (b.coin ? (ecOf(b) || {}).treas || 0 : 0) + popOf(b) ? a : b;
  if ((own.wood || 0) < 15 || (own.stone || 0) < 6) return;
  const m = road[road.length >> 1], mx = m % W, my = (m / W) | 0;
  const okSite = (x, y) => tileFree(x, y) && !pathMap.has(y * W + x) && !farmMap.has(y * W + x) && clearable(x - 5, y - 5, x + 5, y + 1)
    && liveTowns().every(g => Math.hypot(g.fx - x, g.fy - y) > 22) && !villages.some(o => underBuilding(o, x, y));
  const p = ringFind(mx, my - 3, 8, okSite); if (!p) { R.innFail = yearT; return; }
  const [x, y] = p, i = y * W + x; clearSite(own, x - 5, y - 5, x + 5, y + 1);
  const used = new Set([...rels.values()].map(q => q.route && q.route.inn && q.route.inn.name)), name = 'Venta ' + (INN_NAMES.find(n => !used.has('Venta ' + n)) || INN_NAMES[0]);
  world.objs[i] = { key:'tavern:taberna', v:0, ox:0, oy:0, vid:own.id, inn:true };
  R.inn = { i, name, by:own.id }; own.wood -= 15; own.stone -= 6;
  composeRegion(x - 10, y - 14, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(own, x, y);
  notify(`A medio camino entre ${a.name} y ${b.name} abre la ${name}: los arrieros paran a comer y a dormir`, { x:x * T, y:y * T });
}
{ const base = routeTick; routeTick = function(a, b, r){
  const out = base.apply(this, arguments);
  try {
    if (r.route && !r.route.sea && !r.war && yearT - (r.roadT ?? -1e9) >= DAY_LEN / 2) {
      r.roadT = yearT; layTradeRoad(r, a, b); paveTradeRoad(r, a, b); tradeInn(r, a, b);
      const I = r.route.inn; if (I) { const o = world.objs[I.i], g = villageById(I.by); if (!o || !o.inn) r.route.inn = null; else if (g && popOf(g)) { const ec = ecOf(g); if (ec) ec.treas += Math.round(3 * ec.P); } }
    }
  } catch (e) { console.error(e); }
  return out;
}; }
// Los carros, por el camino (de a a b y de vuelta)
const roadPts = new WeakMap();
function roadPolyline(road){
  let P = roadPts.get(road); if (P) return P;
  const pts = road.map(i => [(i % W) * T + 2, ((i / W) | 0) * T + 3]), cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  P = { pts, cum, L:cum[cum.length - 1] || 1 }; roadPts.set(road, P); return P;
}
function roadAt(P, s){
  const { pts, cum } = P; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m + 1; else hi = m; }
  const k = Math.max(1, lo), f = (s - cum[k - 1]) / Math.max(.001, cum[k] - cum[k - 1]);
  return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f, Math.sign(pts[k][0] - pts[k - 1][0])];
}
function drawRoadCarts(now){
  if (zoom > 5) return;
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const r of rels.values()) {
    const R = r.route; if (!R || !R.road || R.road.length < 2) continue;
    const a = villageById(R.a), b = villageById(R.b); if (!a || !b || !popOf(a) || !popOf(b)) continue;
    const P = roadPolyline(R.road);
    for (let k = 0; k < 3; k++) {
      const back = k === 2, q = (now / (P.L * 90) + k / 3) % 1, [x, y, dx] = roadAt(P, (back ? 1 - q : q) * P.L);
      if (x < vx0 - 20 || x > vx1 + 20 || y < vy0 - 20 || y > vy1 + 20) continue;
      drawCart(x, y, (dx || 1) * (back ? -1 : 1), now, '#c8a050');
    }
  }
}
{ const base = drawTradeRoutes; drawTradeRoutes = function(now){ base.apply(this, arguments); try { drawRoadCarts(now); } catch (e) { console.error(e); } }; }
