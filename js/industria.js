// World Sim · La era industrial: carreteras de piedra, pólvora, vapor, fábricas, ferrocarril y dirigibles
// ================= Industria =================
// Descubrimientos nuevos (después de los de siempre): carreteras empedradas, el reloj mecánico, la máquina de vapor,
// el ferrocarril y el dirigible
// · Carreteras: los caminos de tierra se cambian por carreteras de adoquines (con piedra): se va mucho más rápido
// · Pólvora: los tiradores disparan mosquetes: fogonazo, humo y estruendo
// · Vapor: el pueblo levanta una fábrica con chimeneas humeantes que produce madera, piedra y mercancía
// · Ferrocarril: entre dos pueblos con ruta comercial por tierra que lo conocen, una vía con una estación en cada uno;
//   el tren va y viene echando humo y el comercio de esa ruta se dobla
// · Por mar: galeones (y vapores, con la máquina de vapor) en las rutas comerciales; los piratas a veces los asaltan
// · Reloj: torre del reloj en la plaza que da las horas. Astronomía (con universidad): observatorio con cúpula.
//   Imprenta: carteles en las paredes
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i + 1, 0, d); };
  add('astronomia', { k:'empedrado', txt:'las carreteras empedradas', cost:50, eff:'cambian los caminos de tierra por carreteras de piedra: se va mucho más rápido' });
  add('aeronautica', { k:'reloj', txt:'el reloj mecánico', cost:70, eff:'levantan una torre del reloj en la plaza que da las horas' });
  add('vacunas', { k:'vapor', txt:'la máquina de vapor', cost:110, eff:'empieza la era industrial: fábricas que producen madera, piedra y mercancía' });
  add('vapor', { k:'ferrocarril', txt:'el ferrocarril', cost:140, eff:'trenes y estaciones entre sus pueblos y sus socios comerciales: el comercio se dobla' });
  add('ferrocarril', { k:'dirigible', txt:'el dirigible', cost:170, eff:'sus globos se convierten en dirigibles de vapor, más rápidos' });
})();
const industrial = g => knowsSci(g, 'vapor');
// ---- Carreteras ----
let roadCache = null, roadW = null, roadN = -1;
function roadSet(){ const R = world.roads || []; if (roadW !== world || roadN !== R.length) { roadW = world; roadN = R.length; roadCache = new Set(R); } return roadCache; }
const isRoad = i => !!(world.roads && world.roads.length && roadSet().has(i));
function roadJobs(v, g, add){
  if (!knowsSci(g, 'empedrado') || (g.stone || 0) < 6 || busyWith(g, 'empedrar') >= 2 || (g.roadDone && yearT - g.roadDone < DAY_LEN)) return;
  add('empedrar', 6);
}
function roadTarget(v, g){
  let best = null, bd = 1e9;
  const rails = railTiles();
  for (const i of pathMap) { if (isRoad(i) || plazaSet.has(i) || bridgeSet.has(i) || rails.has(i)) continue; const d = Math.hypot(i % W - g.fx, ((i / W) | 0) - g.fy); if (d < 30 && d < bd) { bd = d; best = i; } }
  if (best == null) { g.roadDone = yearT; return null; }
  return { k:'empedrar', i:best, x:(best % W) * T + 2, y:((best / W) | 0) * T + 3 };
}
function roadArrive(v, g, t){
  v.actT = 4; v.onDone = () => {
    if ((g.stone || 0) < 2) return; const R = (world.roads ||= []), S = roadSet(), q = [t.i], seen = new Set(q); let n = 0;
    while (q.length && n < 9) { const i = q.shift(); if (!pathMap.has(i) || S.has(i) || plazaSet.has(i) || bridgeSet.has(i)) continue; R.push(i); n++; for (const j of [i - 1, i + 1, i - W, i + W]) if (!seen.has(j) && pathMap.has(j)) { seen.add(j); q.push(j); } }
    if (!n) return; g.stone -= Math.ceil(n / 3); snd('pick', v.x, v.y, .5);
    if (!g.roadMsg) { g.roadMsg = true; notify(`En ${g.name} empiezan a cambiar los caminos de tierra por carreteras de piedra`, { x:v.x, y:v.y }); }
  };
  return true;
}
function paintRoads(){
  if (!world.roads || !world.roads.length) return;
  const [x0, y0, x1, y1] = visibleRect(), S = roadSet();
  for (const i of S) {
    const px = (i % W) * T, py = ((i / W) | 0) * T; if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    const tx = i % W, ty = (i / W) | 0, L = S.has(i - 1) || bridgeSet.has(i - 1), R = S.has(i + 1) || bridgeSet.has(i + 1), U = S.has(i - W), D = S.has(i + W);
    if (!artFill(vctx, 'tex:carretera', px, py, T, T)) { // adoquines del atlas; si no está, dibujados a mano
      vctx.fillStyle = '#9a948a'; vctx.fillRect(px, py, T, T);
      vctx.fillStyle = '#7c766c'; vctx.fillRect(px, py + 2, T, 1); vctx.fillRect(px + ((tx + ty) % 2 ? 1 : 3), py, 1, 2); vctx.fillRect(px + ((tx + ty) % 2 ? 3 : 1), py + 3, 1, 2);
      vctx.fillStyle = '#b4aea2'; vctx.fillRect(px + (i % 3), py + 1, 1, 1);
    }
    vctx.fillStyle = '#5c574f'; if (!L) vctx.fillRect(px, py, 1, T); if (!R) vctx.fillRect(px + T - 1, py, 1, T); if (!U) vctx.fillRect(px, py, T, 1); if (!D) vctx.fillRect(px, py + T - 1, T, 1); // bordillo
    snowTile(i, px, py);
  }
}
// ---- Pólvora: fogonazo, humo y estruendo ----
function gunSmoke(v){
  for (let k = 0; k < 6; k++) chips.push({ x:v.x + v.dir * 4, y:v.y - 6, vx:v.dir * (6 + Math.random() * 10) + (Math.random() - .5) * 6, vy:-3 - Math.random() * 5, life:0, max:.9 + Math.random() * .5, col:k ? 'rgba(220,220,214,.75)' : '#ffd860' });
  if (Math.random() < .5) snd('boom', v.x, v.y, .25);
}
// ---- Fábricas, reloj, observatorio y ferrocarril (cada poco, desde el ciclo de los pueblos) ----
function industryTick(g, dt, people){
  if ((g.indT = (g.indT ?? Math.random() * 30) - dt) > 0) return; g.indT = 30;
  const at = { x:g.fx * T, y:g.fy * T }, pop = popOf(g);
  if (industrial(g) && pop >= 18 && !g.factory) {
    const p = ringFind(g.fx + 12, g.fy + 4, 14, (x, y) => { for (let yy = y - 3; yy <= y; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (!tileFree(xx, yy) || pathMap.has(yy * W + xx) || farmMap.has(yy * W + xx) || villages.some(o => underBuilding(o, xx, yy))) return false; return true; });
    if (p) { g.factory = { x:p[0], y:p[1] }; notify(`¡${g.name} entra en la era industrial! Levantan una fábrica de vapor con chimeneas`, { x:p[0] * T, y:p[1] * T }); }
  }
  if (g.factory) { g.wood += 4; g.stone = (g.stone || 0) + 3; g.trades = (g.trades || 0) + 1; const ec = ecOf(g); if (ec) ec.treas += Math.round(pop * .03 * ec.P); clampStore(g); }
  if (knowsSci(g, 'reloj') && g.plaza && !g.clock) { g.clock = true; notify(`En ${g.name} levantan la torre del reloj en la plaza`, at); }
}
// Ferrocarril (desde routeTick): vía y estaciones entre dos pueblos con ruta por tierra que lo conocen
function railCheck(a, b, r){
  if (r.rail || !r.route || r.route.sea || !knowsSci(a, 'ferrocarril') || !knowsSci(b, 'ferrocarril') || yearT - (r.railFail ?? -1e9) < DAY_LEN * 2) return;
  const d = Math.hypot(b.fx - a.fx, b.fy - a.fy) || 1, ux = (b.fx - a.fx) / d, uy = (b.fy - a.fy) / d;
  const st = (g, s) => ringFind(Math.round(g.fx + ux * s * 10), Math.round(g.fy + uy * s * 10), 8, (x, y) => tileFree(x, y) && tileFree(x - 2, y) && tileFree(x + 2, y) && !pathMap.has(y * W + x) && !villages.some(o => underBuilding(o, x, y)));
  const sa = st(a, 1), sb = st(b, -1); if (!sa || !sb) return;
  const path = railPath(sa, sb); if (!path) { r.railFail = yearT; return; }
  r.rail = { a:a.id, b:b.id, sa, sb, path, since:Math.floor(yearT / DAY_LEN) + 1 }; layRail(path);
  notify(`¡Se inaugura el ferrocarril entre ${a.name} y ${b.name}! Estaciones en los dos pueblos y trenes que van y vienen`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }); snd('horn', a.fx * T, a.fy * T, .6);
}
// La vía va por casillas: rodea los pueblos, los edificios y los campos; cruza ríos y lagos con un puente (el mar no)
function railPath(sa, sb){
  const s0 = sa[1] * W + sa[0], s1 = sb[1] * W + sb[0], tx1 = sb[0], ty1 = sb[1];
  const cost = i => {
    const x = i % W, y = (i / W) | 0; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return Infinity;
    const b = world.biome[i]; if (b === B.DEEP || b === B.SEA || b === B.LAVA || (wallSet.has(i) && !gateSet.has(i)) || plazaSet.has(i)) return Infinity;
    if (villages.some(g => popOf(g) && underBuilding(g, x, y))) return i === s0 || i === s1 ? 1 : Infinity;
    const o = world.objs[i]; if (o && !(OBJ[o.key][1] === 'tree' || OBJ[o.key][1] === 'berry')) return Infinity;
    let c = WATER[b] ? 9 : 1; if (o) c += 2; if (farmMap.has(i)) c += 5; if (pathMap.has(i)) c += .5;
    for (const g of villages) if (popOf(g)) { const d = Math.hypot(g.fx - x, g.fy - y); if (d < 9) c += (9 - d) * 1.5; } // por fuera de los pueblos
    return c;
  };
  const gs = new Map([[s0, 0]]), par = new Map(), heap = [[0, s0]];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r2 = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (let n = 0; heap.length && n < 60000; n++) {
    const [, i] = pop();
    if (i === s1) { const out = []; for (let j = i; j !== undefined; j = par.get(j)) out.push(j); return out.reverse(); }
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      const c = cost(j); if (c === Infinity) continue;
      const turn = par.has(i) && (j - i) !== (i - par.get(i)) ? .6 : 0; // mejor recta que en zigzag
      const ng = gs.get(i) + c + turn; if (ng < (gs.get(j) ?? Infinity)) { gs.set(j, ng); par.set(j, i); push(ng + Math.abs((j % W) - tx1) + Math.abs(((j / W) | 0) - ty1), j); }
    }
  }
  return null;
}
// Al tender la vía: se talan los árboles que estorban y el trazado queda como camino (nadie construye encima)
function layRail(path){ for (const i of path) { const o = world.objs[i]; if (o && (OBJ[o.key][1] === 'tree' || OBJ[o.key][1] === 'berry')) { world.objs[i] = null; composeRegion(i % W - 7, ((i / W) | 0) - 11, i % W + 7, ((i / W) | 0) + 12); } if (!WATER[world.biome[i]]) pathMap.add(i); } railCache = null; }
let railCache = null;
function railTiles(){
  if (railCache && railCache.n === rels.size) return railCache.set;
  const set = new Set(); for (const r of rels.values()) if (r.rail && r.rail.path) for (const i of r.rail.path) set.add(i);
  railCache = { set, n:rels.size }; return set;
}
// Pieza de vía de cada casilla según sus vecinas: recta, curva, desvío (girado) o cruce
const RAIL_PIECE = { 5:['rail:v', 0], 10:['rail:h', 0], 1:['rail:v', 0], 4:['rail:v', 0], 2:['rail:h', 0], 8:['rail:h', 0], 0:['rail:h', 0],
  3:['rail:ne', 0], 9:['rail:nw', 0], 6:['rail:se', 0], 12:['rail:sw', 0], 14:['rail:t', 0], 13:['rail:t', 1], 11:['rail:t', 2], 7:['rail:t', 3], 15:['rail:x', 0] };
function drawRailTile(i, S, now){
  const x = (i % W) * T, y = ((i / W) | 0) * T, m = (S.has(i - W) ? 1 : 0) | (S.has(i + 1) ? 2 : 0) | (S.has(i + W) ? 4 : 0) | (S.has(i - 1) ? 8 : 0);
  if (WATER[world.biome[i]]) { vctx.fillStyle = '#5a3e24'; vctx.fillRect(x - 1, y, T + 2, T); vctx.fillStyle = '#3a2614'; vctx.fillRect(x, y + T, 1, 3); vctx.fillRect(x + T - 1, y + T, 1, 3); } // puente de madera
  const [k, rot] = RAIL_PIECE[m] || ['rail:h', 0], c = artFrame(k);
  if (!c) { vctx.fillStyle = '#5a3e24'; vctx.fillRect(x, y + 1, T, 3); vctx.fillStyle = '#9a9aa0'; vctx.fillRect(x, y + 1, T, 1); vctx.fillRect(x, y + 3, T, 1); return; }
  if (!rot) { vctx.drawImage(c, x, y, T, T); return; }
  vctx.save(); vctx.translate(x + T / 2, y + T / 2); vctx.rotate(rot * Math.PI / 2); vctx.drawImage(c, -T / 2, -T / 2, T, T); vctx.restore();
}
// Dónde está el tren: un punto a lo largo del trazado (de casilla en casilla)
function railPoint(path, d){ const n = path.length - 1, k = clamp(Math.floor(d), 0, n - 1), f = clamp(d - k, 0, 1), a = path[k], b = path[k + 1] ?? a; return [((a % W) + ((b % W) - (a % W)) * f) * T + T / 2, (((a / W) | 0) + (((b / W) | 0) - ((a / W) | 0)) * f) * T + T / 2 + 1, Math.sign((b % W) - (a % W))]; }
// ---- Dibujo ----
// Si ya está el dibujo en el atlas (hojas 13 de la carpeta de prompts), se usa; si no, el dibujo hecho a mano de abajo
function artAt(key, x, y, flip){ const c = artFrame(key); if (!c) return false; const f = ART_MAP[key]; if (flip) { vctx.save(); vctx.translate(Math.round(x), 0); vctx.scale(-1, 1); vctx.drawImage(c, -f[4], Math.round(y) - f[3] + 1); vctx.restore(); } else vctx.drawImage(c, Math.round(x) - f[4], Math.round(y) - f[3] + 1); return true; }
function drawIndustry(now){
  const [vx0, vy0, vx1, vy1] = visibleRect(), onS = (x, y, m = 60) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  // Vías (por casillas), estaciones y trenes
  const S = railTiles();
  for (const i of S) { const x = (i % W) * T, y = ((i / W) | 0) * T; if (x > vx0 - 10 && x < vx1 + 10 && y > vy0 - 10 && y < vy1 + 10) drawRailTile(i, S, now); }
  for (const r of rels.values()) {
    const R = r.rail; if (!R) continue;
    if (!R.path && !R.tried) { R.tried = true; R.path = railPath(R.sa, R.sb); if (R.path) layRail(R.path); else { r.rail = null; continue; } } // (partidas de antes: la vía iba en línea recta)
    if (!R.path) continue;
    for (const [st, g] of [[R.sa, villageById(R.a)], [R.sb, villageById(R.b)]]) { const sx = st[0] * T + 2, sy = st[1] * T + 3; if (g && onS(sx, sy)) drawStation(sx, sy, g, now); }
    if (!r.route) continue; // sin comercio (guerra, sanciones) no circula
    // Va y viene con el tiempo del juego (se para en pausa y corre más a más velocidad): espera un rato en cada
    // estación y vuelve sin dar la vuelta (la locomotora siempre en el mismo extremo, como un tren lanzadera); así
    // los vagones nunca saltan de un lado a otro ni se amontonan al final de la vía
    const n = R.path.length - 1, L = Math.min(9.2, n * .5), run = Math.max(.1, (n - L) / 4), cyc = 2 * (run + TRAIN_DWELL);
    let t = ((yearT + R.a * 7.3) % cyc + cyc) % cyc, d, fwd, moving = true;
    if (t < TRAIN_DWELL) { d = L; fwd = true; moving = false; }
    else if ((t -= TRAIN_DWELL) < run) d = L + (n - L) * t / run, fwd = true;
    else if ((t -= run) < TRAIN_DWELL) { d = n; fwd = false; moving = false; }
    else d = n - (n - L) * (t - TRAIN_DWELL) / run, fwd = false;
    const [tx, ty, sx] = railPoint(R.path, d); if (!onS(tx, ty, 60 + L * T)) continue;
    if (moving) R.dir = sx ? sx * (fwd ? 1 : -1) : R.dir || 1;
    drawTrainOn(R.path, d, L / 2, R.dir || 1, moving);
  }
  for (const g of villages) {
    if (!popOf(g)) continue;
    if (g.factory) { const x = g.factory.x * T + 2, y = g.factory.y * T + 3; if (onS(x, y)) drawFactory(x, y, now); }
    if (g.clock && g.plaza) { const P = g.plaza, x = P.x1 * T + 3, y = P.y0 * T + 2; if (onS(x, y)) drawClockTower(x, y, now, g); }
    if (knowsSci(g, 'astronomia') && g.university != null && world.objs[g.university]) { const x = (g.university % W) * T + 22, y = ((g.university / W) | 0) * T + 3; if (onS(x, y)) drawObservatory(x, y, now); }
    if (g.press != null && world.objs[g.press] && zoom >= 2.5) for (const h of g.houses.slice(0, 8)) { if (!world.objs[h] || h2(h % W, (h / W) | 0, 91) > .6) continue; const x = (h % W) * T, y = ((h / W) | 0) * T - 6; if (!onS(x, y)) continue; vctx.fillStyle = '#f4ecd0'; vctx.fillRect(x, y, 3, 4); vctx.fillStyle = ['#c83a2a', '#3a6ab8', '#22201e'][h % 3]; vctx.fillRect(x, y + 1, 3, 1); vctx.fillRect(x + 1, y + 3, 1, 1); } // carteles
  }
}
function drawStation(x, y, g, now){
  if (artAt('station:estacion', x, y)) { if (zoom >= 2) { vctx.font = 'bold 4px sans-serif'; vctx.textAlign = 'center'; vctx.fillStyle = '#22201e'; vctx.fillRect(x - 10, y - ART_MAP['station:estacion'][3] - 6, 21, 5); vctx.fillStyle = '#f8e080'; vctx.fillText(g.name.slice(0, 12), x + .5, y - ART_MAP['station:estacion'][3] - 2.3); vctx.textAlign = 'start'; } return; }
  // Estación: andén de piedra, edificio de ladrillo con tejado a dos aguas, reloj, farolas y letrero con el nombre
  vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 13, y + 1, 27, 2);
  vctx.fillStyle = '#b0a898'; vctx.fillRect(x - 13, y - 2, 27, 3); vctx.fillStyle = '#8e877a'; vctx.fillRect(x - 13, y, 27, 1); // andén
  vctx.fillStyle = '#22201e'; vctx.fillRect(x - 9, y - 14, 19, 12); vctx.fillStyle = '#a8583a'; vctx.fillRect(x - 8, y - 13, 17, 11); // ladrillo
  vctx.fillStyle = '#8a4428'; for (let k = 0; k < 11; k += 3) vctx.fillRect(x - 8, y - 12 + k, 17, 1);
  vctx.fillStyle = '#22201e'; vctx.beginPath(); vctx.moveTo(x - 11, y - 13); vctx.lineTo(x + 1, y - 20); vctx.lineTo(x + 12, y - 13); vctx.fill(); vctx.fillStyle = '#4a5868'; vctx.beginPath(); vctx.moveTo(x - 9, y - 14); vctx.lineTo(x + 1, y - 19); vctx.lineTo(x + 10, y - 14); vctx.fill(); // tejado
  vctx.fillStyle = '#f4f0e8'; vctx.fillRect(x - 1, y - 18, 3, 3); vctx.fillStyle = '#22201e'; vctx.fillRect(x, y - 17, 1, 1); // reloj
  vctx.fillStyle = '#f0d890'; vctx.fillRect(x - 6, y - 9, 2, 3); vctx.fillRect(x + 5, y - 9, 2, 3); vctx.fillStyle = '#5a3e24'; vctx.fillRect(x - 1, y - 8, 3, 6); // ventanas y puerta
  vctx.fillStyle = '#2a2018'; vctx.fillRect(x - 12, y - 9, 1, 8); vctx.fillRect(x + 13, y - 9, 1, 8); vctx.fillStyle = '#ffd890'; vctx.fillRect(x - 13, y - 10, 3, 2); vctx.fillRect(x + 12, y - 10, 3, 2); // farolas
  if (zoom >= 2) { vctx.font = 'bold 4px sans-serif'; vctx.textAlign = 'center'; vctx.fillStyle = '#22201e'; vctx.fillRect(x - 10, y - 25, 21, 5); vctx.fillStyle = '#f8e080'; vctx.fillText(g.name.slice(0, 12), x + .5, y - 21.3); vctx.textAlign = 'start'; } // letrero
}
const TRAIN_DWELL = 4; // segundos parado en cada estación
function drawTrainOn(path, d, gap, dir, moving){
  const flip = dir < 0, keys = ['train:locomotora', 'train:vagon_p', 'train:vagon_m'];
  if (!artFrame(keys[0])) { const [x, y] = railPoint(path, d); drawTrain(x, y, dir, 0, performance.now()); return; }
  for (let k = 2; k >= 0; k--) { const [x, y] = railPoint(path, d - k * gap); artAt(keys[k], x, y, flip); }
  const [x, y] = railPoint(path, d); if (Math.random() < (moving ? .4 : .08)) chips.push({ x:x + (flip ? -3 : 3), y:y - 15, vx:-dir * 9 + (Math.random() - .5) * 3, vy:-6 - Math.random() * 3, life:0, max:1.2, col:'rgba(215,215,210,.75)' });
}
function drawTrain(x, y, ux, uy, now){
  if (artFrame('train:locomotora')) { const flip = ux < 0; for (let k = 2; k >= 0; k--) artAt(k ? (k === 1 ? 'train:vagon_p' : 'train:vagon_m') : 'train:locomotora', x - ux * k * 23, y - uy * k * 23, flip); if (Math.random() < .4) chips.push({ x:x + (flip ? -3 : 3), y:y - 15, vx:-ux * 9 + (Math.random() - .5) * 3, vy:-6 - Math.random() * 3, life:0, max:1.2, col:'rgba(215,215,210,.75)' }); return; } // (humo: lo pone el juego)
  const parts = [['#22201e', '#3a3a40'], ['#8a3a2a', '#a8583a'], ['#2a5a3a', '#3a7a4a']]; // locomotora y dos vagones
  for (let k = parts.length - 1; k >= 0; k--) {
    const cx = x - ux * k * 9, cy = y - uy * k * 9, [c1, c2] = parts[k];
    vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(cx - 4, cy + 1, 9, 1);
    vctx.fillStyle = c1; vctx.fillRect(cx - 4, cy - 6, 9, 6); vctx.fillStyle = c2; vctx.fillRect(cx - 3, cy - 5, 7, 3);
    vctx.fillStyle = '#22201e'; vctx.fillRect(cx - 3, cy, 2, 1); vctx.fillRect(cx + 2, cy, 2, 1); // ruedas
    if (k === 0) { vctx.fillStyle = '#22201e'; vctx.fillRect(cx + (ux >= 0 ? 2 : -3), cy - 9, 2, 3); vctx.fillStyle = '#c83a2a'; vctx.fillRect(cx + (ux >= 0 ? -4 : 2), cy - 8, 3, 2); // chimenea y cabina
      if (Math.random() < .35) chips.push({ x:cx + (ux >= 0 ? 3 : -2), y:cy - 10, vx:-ux * 8 + (Math.random() - .5) * 4, vy:-6 - Math.random() * 4, life:0, max:1.1, col:'rgba(210,210,205,.7)' }); }
  }
}
function drawFactory(x, y, now){
  if (artAt('factory:fabrica', x, y)) { if (Math.random() < .3) chips.push({ x:x + 8, y:y - ART_MAP['factory:fabrica'][3], vx:3 + Math.random() * 4, vy:-5 - Math.random() * 4, life:0, max:1.6, col:'rgba(120,118,115,.6)' }); return; }
  vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 12, y + 1, 25, 2);
  vctx.fillStyle = '#22201e'; vctx.fillRect(x - 12, y - 11, 25, 12); vctx.fillStyle = '#9a4a30'; vctx.fillRect(x - 11, y - 10, 23, 10);
  vctx.fillStyle = '#7a3a24'; for (let k = 0; k < 10; k += 3) vctx.fillRect(x - 11, y - 9 + k, 23, 1);
  vctx.fillStyle = '#3a3a40'; for (let k = 0; k < 4; k++) { vctx.beginPath(); vctx.moveTo(x - 11 + k * 6, y - 10); vctx.lineTo(x - 8 + k * 6, y - 14); vctx.lineTo(x - 5 + k * 6, y - 10); vctx.fill(); } // tejado de dientes de sierra
  vctx.fillStyle = '#f0d890'; for (let k = 0; k < 4; k++) vctx.fillRect(x - 9 + k * 6, y - 6, 2, 2);
  for (const cx of [x + 6, x + 10]) { // chimeneas con humo
    vctx.fillStyle = '#22201e'; vctx.fillRect(cx - 1, y - 26, 4, 16); vctx.fillStyle = '#8a4428'; vctx.fillRect(cx, y - 25, 2, 15); vctx.fillStyle = '#5a5a60'; vctx.fillRect(cx - 1, y - 27, 4, 2);
    if (Math.random() < .3) chips.push({ x:cx + 1, y:y - 28, vx:3 + Math.random() * 4, vy:-5 - Math.random() * 4, life:0, max:1.6, col:'rgba(120,118,115,.6)' });
  }
}
function drawClockTower(x, y, now, g){
  if (artAt('clock:reloj', x, y)) { const h = Math.floor(dayT() * 12); if (g.clockH !== h) { g.clockH = h; if (zoom >= 2) floats.push({ x, y:y - ART_MAP['clock:reloj'][3] - 4, txt:'¡dong!', col:'#f8e0a0', life:0 }); } return; }
  vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 3, y + 1, 8, 2);
  vctx.fillStyle = '#22201e'; vctx.fillRect(x - 3, y - 24, 8, 25); vctx.fillStyle = '#c8b898'; vctx.fillRect(x - 2, y - 23, 6, 23); vctx.fillStyle = '#a89878'; vctx.fillRect(x + 2, y - 23, 2, 23);
  vctx.fillStyle = '#22201e'; vctx.beginPath(); vctx.moveTo(x - 4, y - 24); vctx.lineTo(x + 1, y - 31); vctx.lineTo(x + 6, y - 24); vctx.fill(); vctx.fillStyle = '#4a5868'; vctx.beginPath(); vctx.moveTo(x - 2, y - 25); vctx.lineTo(x + 1, y - 29); vctx.lineTo(x + 4, y - 25); vctx.fill();
  vctx.fillStyle = '#f4f0e8'; vctx.fillRect(x - 1, y - 21, 5, 5); vctx.fillStyle = '#22201e'; const a = dayT() * Math.PI * 4; vctx.fillRect(x + 1, y - 19, 1, 1); vctx.fillRect(Math.round(x + 1 + Math.sin(a) * 1.6), Math.round(y - 19 - Math.cos(a) * 1.6), 1, 1); // la esfera
  // Da las horas: «¡dong!»
  const h = Math.floor(dayT() * 12); if (g.clockH !== h) { g.clockH = h; if (zoom >= 2) floats.push({ x:x + 1, y:y - 34, txt:'¡dong!', col:'#f8e0a0', life:0 }); }
}
function drawObservatory(x, y, now){
  if (artAt('observatory:observatorio', x, y)) return;
  vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 6, y + 1, 13, 2);
  vctx.fillStyle = '#22201e'; vctx.fillRect(x - 6, y - 8, 13, 9); vctx.fillStyle = '#d8d0c0'; vctx.fillRect(x - 5, y - 7, 11, 7);
  vctx.fillStyle = '#22201e'; vctx.beginPath(); vctx.arc(x + .5, y - 8, 6.5, Math.PI, 0); vctx.fill(); vctx.fillStyle = '#8aa0b8'; vctx.beginPath(); vctx.arc(x + .5, y - 8, 5.5, Math.PI, 0); vctx.fill(); // cúpula
  vctx.fillStyle = '#22201e'; vctx.fillRect(x, y - 14, 2, 6); vctx.fillStyle = '#a8a090'; vctx.save(); vctx.translate(x + 1, y - 12); vctx.rotate(-.6 + Math.sin(now / 4000) * .2); vctx.fillRect(0, -1, 7, 2); vctx.restore(); // telescopio
}
// Barcos en las rutas por mar: galeón (o vapor) con las velas del color del país
function drawShip(x, y, dir, steam, col, now){
  const sk = steam ? 'ship:vapor' : 'ship:galeon', sc = artFrame(sk);
  if (sc) { // el casco, medio metido en el agua: se pinta solo lo que asoma y una línea de olas encima
    const f = ART_MAP[sk], w = f[2], h = f[3], vis = Math.round(h * .8), bx = Math.round(x) - f[4], by = Math.round(y) + 2 - vis, bob = Math.round(Math.sin(now / 500 + x) * .6);
    if (dir < 0) { vctx.save(); vctx.translate(Math.round(x), 0); vctx.scale(-1, 1); vctx.drawImage(sc, 0, 0, w, vis, -f[4], by + bob, w, vis); vctx.restore(); } else vctx.drawImage(sc, 0, 0, w, vis, bx, by + bob, w, vis);
    const wl = Math.round(y) + 2 + bob; vctx.fillStyle = 'rgba(225,242,255,.8)'; for (let k = 0; k < w; k += 2) vctx.fillRect(bx + k, wl - ((k / 2 + Math.floor(now / 250)) % 2), 2, 1); // olas contra el casco
    vctx.fillStyle = 'rgba(225,242,255,.45)'; for (let k = 1; k < 4; k++) vctx.fillRect(Math.round(x) - (dir >= 0 ? 1 : -1) * (f[4] + k * 4), wl + (k % 2), 3, 1); // estela
    if (steam && Math.random() < .3) chips.push({ x:x + (dir >= 0 ? 1 : -1), y:by + bob, vx:-(dir >= 0 ? 1 : -1) * 6, vy:-5, life:0, max:1.3, col:'rgba(90,90,95,.6)' }); // humo de la chimenea
    return;
  }
  const s = dir >= 0 ? 1 : -1;
  vctx.fillStyle = 'rgba(0,0,0,.2)'; vctx.fillRect(x - 7, y + 1, 15, 1);
  vctx.fillStyle = '#22201e'; vctx.fillRect(x - 7, y - 3, 15, 4); vctx.fillStyle = steam ? '#3a3a40' : '#7a4a28'; vctx.fillRect(x - 6, y - 2, 13, 2); vctx.fillStyle = steam ? '#c83a2a' : '#a86a38'; vctx.fillRect(x - 6, y - 3, 13, 1);
  if (steam) { vctx.fillStyle = '#c83a2a'; vctx.fillRect(x - 1, y - 9, 3, 6); vctx.fillStyle = '#22201e'; vctx.fillRect(x - 1, y - 9, 3, 1); if (Math.random() < .3) chips.push({ x:x, y:y - 10, vx:-s * 6, vy:-5, life:0, max:1.2, col:'rgba(90,90,95,.6)' }); }
  else for (const mx of [x - 3, x + 3]) { vctx.fillStyle = '#4a3018'; vctx.fillRect(mx, y - 12, 1, 9); vctx.fillStyle = '#f4f0e8'; vctx.fillRect(mx - 2, y - 11, 5, 6); vctx.fillStyle = `rgb(${col.join(',')})`; vctx.fillRect(mx - 2, y - 9, 5, 1); }
}
