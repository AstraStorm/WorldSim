// World Sim · Puertos grandes: del muelle de la barca al puerto de verdad
// ================= Puertos =================
// · Un pueblo de 35 o más con muelle que vive del mar (mercado, lonja o ruta comercial) amplía su puerto: un muelle de
//   piedra a lo largo de la orilla, dos espigones mar adentro y una grúa; se va levantando tramo a tramo
// · En los atraques de los espigones quedan amarrados sus barcos (galeones o, con el vapor, vapores)
function bigPortPlan(g){
  const P = g.port; if (!P) return null;
  const { sx, sy, dx, dy } = P, px = dy ? 1 : 0, py = dx ? 1 : 0; // a lo largo de la orilla
  const open = j => openWater(j) && world.biome[j] !== B.RIVER && !P.tiles.includes(j), quay = [];
  // El muelle de piedra: siguiendo la orilla de verdad (la primera casilla de agua de cada columna), hasta 10 a cada lado
  for (let k = -10; k <= 10; k++) for (let m = -3; m <= 4; m++) {
    const x = sx + px * k + dx * m, y = sy + py * k + dy * m, j = y * W + x, prev = j - dy * W - dx;
    if (open(j) && !WATER[world.biome[prev]]) { quay.push({ j, k, m }); break; }
  }
  if (quay.length < 5) return null;
  // Dos espigones (dos de ancho, hasta 7 de largo) que salen del muelle hacia el agua abierta
  const piers = [];
  for (const want of [-6, 6]) {
    const q = quay.slice().sort((a, b) => Math.abs(a.k - want) - Math.abs(b.k - want))[0]; if (!q || piers.some(p => Math.abs(p.k - q.k) < 4)) continue;
    const t = [];
    for (let k = 1; k <= 7; k++) { const row = []; for (const w of [0, 1]) { const x = (q.j % W) + px * w + dx * k, y = ((q.j / W) | 0) + py * w + dy * k, j = y * W + x; if (open(j)) row.push(j); } if (row.length < 2) break; t.push(...row); }
    if (t.length >= 8) { const e = t[t.length - 2]; piers.push({ k:q.k, tiles:t, berth:[(e % W + px * 4) * T + 2, (((e / W) | 0) + py * 4) * T + 3] }); }
  }
  if (!piers.length) return null;
  return { quay:quay.map(q => q.j), piers, crane:quay[Math.floor(quay.length / 2)].j, dx, dy };
}
const livesOffSea = g => g.market != null || hasLonja(g) || villages.some(o => o !== g && (rels.get(relKey(g, o)) || {}).route);
let portT = 0;
SYSTEMS.push(dt => {
  if (!world || (portT -= dt) > 0) return; portT = 1;
  for (const g of liveTowns()) {
    const B0 = g.bigPort;
    if (!B0) {
      if (!g.port || popOf(g) < 35 || !livesOffSea(g) || g.wood < 40 || g.stone < 25 || (g.bigPortFail || -1e9) > yearT - DAY_LEN) continue;
      const plan = bigPortPlan(g); if (!plan) { g.bigPortFail = yearT; continue; }
      g.wood -= 40; g.stone -= 25; g.bigPort = { ...plan, built:0, done:false, t0:yearT, b:{ tiles:[], h:!!plan.dx, cx:g.port.sx, cy:g.port.sy, pier:true, big:true, vid:g.id } }; bridges.push(g.bigPort.b);
      notify(`${g.name} empieza a levantar un gran puerto: un muelle de piedra a lo largo de la orilla y dos espigones`, { x:g.port.sx * T, y:g.port.sy * T });
      continue;
    }
    if (B0.done) continue;
    const all = [...B0.quay, ...B0.piers.flatMap(p => p.tiles)], want = Math.min(all.length, Math.floor((yearT - B0.t0) / 3) + 1); // una casilla cada pocos segundos
    if (B0.built >= want) continue;
    while (B0.built < want) { const j = all[B0.built++]; if (!openWater(j)) continue; bridgeSet.add(j); B0.b.tiles.push(j); addEffect((j % W) * T + 2, ((j / W) | 0) * T + 3, 'poof'); groundTouch(j); }
    if (typeof routeC !== 'undefined') routeC.clear();
    if (B0.built >= all.length) { B0.done = true; notify(`Terminan el gran puerto de ${g.name}: ya pueden amarrar varios barcos a la vez`, { x:g.port.sx * T, y:g.port.sy * T }); }
  }
});
// Dibujo: la grúa del muelle y los barcos amarrados en los espigones (después de los objetos)
function drawBigPorts(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    const B0 = g.bigPort; if (!B0 || !popOf(g)) continue;
    const cx = (B0.crane % W) * T + 2, cy = ((B0.crane / W) | 0) * T + 3, sw = Math.round(Math.sin(now / 900) * 2);
    if (cx > x0 - 30 && cx < x1 + 30 && cy > y0 - 30 && cy < y1 + 30 && B0.built > 4) { // la grúa: mástil, brazo, cuerda y fardo
      vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(cx + 1, cy + 1, 10, 1);
      vctx.fillStyle = '#4a3420'; vctx.fillRect(cx, cy - 16, 2, 16); vctx.fillRect(cx - 1, cy - 17, 12, 2); vctx.fillStyle = '#c8b890'; vctx.fillRect(cx + 9, cy - 15, 1, 6 + sw); vctx.fillStyle = '#8a6a44'; vctx.fillRect(cx + 8, cy - 9 + sw, 3, 2);
    }
    if (!B0.done) continue;
    const steam = knowsSci(g, 'vapor'), col = villageColor(nationOf(g));
    B0.piers.forEach((p, k) => {
      const [bx, by] = p.berth; if (bx < x0 - 40 || bx > x1 + 40 || by < y0 - 40 || by > y1 + 20) return;
      if (k === 1 && popOf(g) < 60) return; // el segundo atraque, ocupado solo en los puertos con más vida
      drawShip(bx, by, B0.dx || (k ? -1 : 1), steam, col, now, .75, false);
    });
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawBigPorts(performance.now()); }; }
