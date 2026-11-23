// Forja de Mundos · Vivir junto a un volcán: no construir en sus faldas, cercar el cráter y la lava que quema edificios
// ================= Volcanes y pueblos =================
// · Nadie levanta edificios en las faldas de un volcán ni sobre coladas de lava (ni funda allí un pueblo nuevo)
// · Un pueblo con un volcán cerca lo cerca: una valla de estacas con cuerda y carteles de peligro alrededor del
//   cráter, a tramos, con madera.
// · La lava que llega a un edificio lo quema y lo va derrumbando
let volcGrid = null, volcGridW = null;
// ¿Casilla peligrosa? (en las faldas de un volcán, con margen, o sobre una colada)
function volcDanger(x, y, extra = 0){
  if (!world || !world.volcanoes || !world.volcanoes.length) return false;
  if (volcGridW !== world) {
    volcGridW = world; volcGrid = new Uint8Array(N);
    for (const v of world.volcanoes) { const R = Math.ceil(v.r + 10); for (let yy = Math.max(0, v.cy - R); yy <= Math.min(H - 1, v.cy + R); yy++) for (let xx = Math.max(0, v.cx - R); xx <= Math.min(W - 1, v.cx + R); xx++) { const d = Math.hypot(xx - v.cx, yy - v.cy) - v.r; if (d <= 10) { const j = yy * W + xx, val = d <= 3 ? 1 : d <= 10 ? 2 : 0; if (!volcGrid[j] || val < volcGrid[j]) volcGrid[j] = val; } } }
  }
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const i = y * W + x, gv = volcGrid[i];
  return (gv === 1) || (extra > 3 && gv === 2) || world.volc[i] >= 2 || !!world.lavaT[i];
}
// La valla de un volcán: puntos en un anillo alrededor del cráter (por encima de donde suele correr la lava)
function volcFence(vo){
  if (vo.fence) return vo.fence;
  const r = Math.max(3, vo.r * Math.max(vo.crater, .12) + 3), n = Math.max(12, Math.round(Math.PI * 2 * r / 2)), pts = [];
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, x = Math.round(vo.cx + Math.cos(a) * r), y = Math.round(vo.cy + Math.sin(a) * r * .8), i = y * W + x;
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && !WATER[world.biome[i]] && pts[pts.length - 1] !== i) pts.push(i); }
  return vo.fence = { pts, built:0, by:null };
}
const fenceVolcOf = g => { const vo = volcanoNear(g); return vo && Math.hypot(vo.cx - g.fx, vo.cy - g.fy) < 40 ? vo : null; };
// Trabajo (desde chooseJob): cercar el volcán, si hay madera y no está cercado
function volcanoJobs(v, g, add){
  const vo = fenceVolcOf(g); if (!vo || popOf(g) < 6 || g.wood < 4) return;
  const F = volcFence(vo); if (F.built >= F.pts.length) return;
  add('cercar_volcan', busyWith(g, 'cercar_volcan') < 2 ? (vo.state === 'dormido' ? 3 : 6) : 0);
}
function volcFenceTarget(v, g){
  const vo = fenceVolcOf(g); if (!vo) return null; const F = volcFence(vo), i = F.pts[Math.min(F.built, F.pts.length - 1)];
  return { k:'cercar_volcan', vo:vo.id, x:(i % W) * T + 2, y:((i / W) | 0) * T + 4 };
}
function volcFenceArrive(v, g, t){
  v.actT = 6; v.onDone = () => {
    const vo = world.volcanoes[(t.vo || 0) - 1]; if (!vo) return; const F = volcFence(vo);
    const n = Math.min(6, F.pts.length - F.built, Math.floor(g.wood)); if (n <= 0) return;
    F.built += n; F.by ??= g.id; g.wood -= Math.ceil(n / 2);
    if (F.built >= F.pts.length) notify(`${g.name} ha terminado de cercar el volcán: nadie se acercará al cráter sin querer`, { x:vo.x, y:vo.y });
    else if (F.built === n) notify(`En ${g.name} empiezan a cercar el volcán, por si acaso`, { x:vo.x, y:vo.y });
  };
  return true;
}
// Dibujo de las vallas (estacas, cuerda y carteles rojos), en coordenadas del mundo
function drawVolcFences(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const vo of world.volcanoes || []) {
    const F = vo.fence; if (!F || !F.built) continue;
    if (vo.x + 200 < x0 || vo.x - 200 > x1 || vo.y + 200 < y0 || vo.y - 200 > y1) continue;
    const P = F.pts.slice(0, F.built).map(i => [(i % W) * T + 2, ((i / W) | 0) * T + 3]);
    vctx.strokeStyle = 'rgba(220,200,150,.85)'; vctx.lineWidth = .7; vctx.beginPath();
    P.forEach(([x, y], k) => { if (k) vctx.lineTo(x, y - 3); else vctx.moveTo(x, y - 3); }); if (F.built >= F.pts.length && P.length) vctx.lineTo(P[0][0], P[0][1] - 3); vctx.stroke();
    P.forEach(([x, y], k) => {
      vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(x - 1, y, 3, 1);
      vctx.fillStyle = '#7a5030'; vctx.fillRect(x, y - 5, 1, 5); vctx.fillStyle = '#a87a4a'; vctx.fillRect(x, y - 5, 1, 1);
      if (k % 5 === 0) { vctx.fillStyle = '#d8483a'; vctx.fillRect(x - 2, y - 8, 5, 3); vctx.fillStyle = '#f0e0c8'; vctx.fillRect(x, y - 7, 1, 1); } // cartel de peligro
    });
  }
}
// La lava alcanza un edificio: lo quema y lo daña (desde igniteTile)
function lavaHitsBuildings(i){
  const x = i % W, y = (i / W) | 0;
  for (let by = y; by <= Math.min(H - 1, y + 10); by++) for (let bx = Math.max(0, x - 6); bx <= Math.min(W - 1, x + 6); bx++) {
    const b = by * W + bx, o = world.objs[b]; if (!isBuilding(o)) continue;
    const d = BUILD_DIMS[o.key.split(':')[0]] || [3, 5]; if (Math.abs(bx - x) > d[0] * .6 || y < by - d[1]) continue;
    if (!o.lavaMsg) { o.lavaMsg = true; const g = villageById(o.vid); if (g) notify(`¡La lava alcanza ${o.key.startsWith('house') ? 'una casa' : 'el ' + bldName(o)} de ${g.name}!`, { x:bx * T, y:by * T }); }
    damageBuilding(b, .3); if (world.objs[b] && !fires.has(b) && fires.size < 260) fires.set(b, { t:0, life:8 + Math.random() * 4, tree:true, bld:true });
  }
}
