// World Sim · Puentes de campaña: tropas que cruzan el agua sin barcos
// ================= Pontones =================
// · Si al enemigo no se llega a pie sin nadar (un río, un lago, un brazo de mar o un estrecho; la mitad de la gente no
//   sabe nadar y los jinetes no cruzan a nado, así que antes el ejército se partía en la orilla), el ejército
//   busca el paso de agua más corto y poco hondo (hasta 12 casillas, nunca mar profundo) entre su tierra y la del enemigo
// · Sale cargado de madera (2 por casilla, de su pueblo), se reúne en la orilla y tiende un puente de troncos casilla a
//   casilla; cuando está hecho, cruzan todos juntos. El puente sirve a cualquiera (también al enemigo para contraatacar)
// · Si el agua es demasiado ancha o profunda no salen: antes se quedaban a medio camino, nadando o atascados en la orilla
// · Pasados unos días sin tropas cerca, la corriente se lleva los troncos
const PONT_MAX = 12, PONT_LIFE = DAY_LEN * 4;
const pontWater = i => WATER[world.biome[i]] && world.biome[i] !== B.DEEP && !bridgeSet.has(i) && !dried(i) && !frozen(i);
// Por donde pasa un ejército entero: la mitad no sabe nadar y a caballo nadie cruza a nado, así que un río también corta
// (salvo por un puente, el hielo o un cauce seco)
const armyOk = i => { const b = world.biome[i]; return b !== B.LAVA && (!WATER[b] || bridgeSet.has(i) || dried(i) || frozen(i)); };
// Tierras unidas a pie para un ejército: se recalcula como mucho cada 20 s
let landComp = null, landCompT = -1e9, landCompSig = '';
function landComps(){
  const sig = bridgeSet.size + ':' + (iceSet ? iceSet.size : 0) + ':' + (drySet ? drySet.size : 0);
  if (landComp && landComp.length === N && landCompT > -1e8 && (sig === landCompSig || yearT - landCompT < 20)) return landComp; // (landCompT = -1e9: rehacer ya)
  landCompSig = sig; landCompT = yearT;
  const c = landComp && landComp.length === N ? landComp.fill(-1) : (landComp = new Int32Array(N).fill(-1)); let id = 0; const q = new Int32Array(N);
  for (let s0 = 0; s0 < N; s0++) {
    if (c[s0] !== -1 || !armyOk(s0)) continue;
    let h = 0, t = 0; q[t++] = s0; c[s0] = id;
    while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (c[n] !== -1 || !armyOk(n)) continue; if (dx && dy && !(armyOk(y * W + nx) && armyOk(ny * W + x))) continue; c[n] = id; q[t++] = n; } }
    id++;
  }
  return c;
}
// 'tierra' si se llega andando; si no, el mejor paso para un puente de troncos (o null si no lo hay)
function crossPlan(att, def){
  const c = landComps(), a = c[Math.round(att.fy) * W + Math.round(att.fx)], b = c[Math.round(def.fy) * W + Math.round(def.fx)];
  if (a < 0 || b < 0 || a === b) return 'tierra';
  const x0 = Math.max(1, Math.min(att.fx, def.fx) - 30), x1 = Math.min(W - 2, Math.max(att.fx, def.fx) + 30), y0 = Math.max(1, Math.min(att.fy, def.fy) - 30), y1 = Math.min(H - 2, Math.max(att.fy, def.fy) + 30);
  let best = null;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const s0 = y * W + x; if (c[s0] !== a || !tileFree(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!pontWater(s0 + dy * W + dx)) continue; // (solo desde la orilla)
      const tiles = [];
      for (let k = 1; k <= PONT_MAX + 1; k++) {
        const xx = x + dx * k, yy = y + dy * k; if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) break; const j = yy * W + xx;
        if (pontWater(j)) { tiles.push(j); continue; }
        if (c[j] === b && tiles.length && tiles.length <= PONT_MAX && tileFree(xx, yy)) {
          const sc = tiles.length * 4 + Math.hypot(x - att.fx, y - att.fy) + Math.hypot(xx - def.fx, yy - def.fy);
          if (!best || sc < best.sc) best = { sc, tiles, h:!!dx, sx:x, sy:y, ex:xx, ey:yy, len:tiles.length, cx:Math.round((x + xx) / 2), cy:Math.round((y + yy) / 2) };
        }
        break;
      }
    }
  }
  if (best) best.wood = Math.max(6, best.len * 2);
  return best;
}
{ const base = launchRaid; launchRaid = function(att, def, r){
  if (!att || !def || att === def || !world) return base.apply(this, arguments);
  const plan = crossPlan(att, def);
  if (plan === 'tierra') return base.apply(this, arguments);
  const w = r && r.war, at = { x:att.fx * T, y:att.fy * T };
  if (!plan) { if (w && !w.noReach) { w.noReach = true; notify(`Los de ${att.name} no pueden llegar a ${def.name}: hay demasiada agua por medio para un puente y no tienen cómo cruzar`, at); } return; }
  if ((att.wood || 0) < plan.wood) { att.pontWant = yearT; if (w && !(w.pontMsg > yearT)) { w.pontMsg = yearT + DAY_LEN; notify(`Para atacar ${def.name}, los de ${att.name} tienen que tender un puente de ${plan.len} casillas: juntan madera (les faltan ${Math.ceil(plan.wood - (att.wood || 0))})`, at); } return; }
  const before = new Set(villagers.filter(v => v.task && v.task.grp).map(v => v.task.grp));
  base.apply(this, arguments);
  const sol = villagers.find(v => !v.dead && v.task && v.task.k === 'asalto' && v.task.enemy === def.id && v.task.grp && !before.has(v.task.grp)); if (!sol) return;
  const G = sol.task.grp; att.wood -= plan.wood; att.pontWant = null;
  G.pont = plan; G.go = false; G.rx = plan.sx * T + 2; G.ry = plan.sy * T + 3; G.until = yearT + 90;
  notify(`No hay camino por tierra hasta ${def.name}: las tropas de ${att.name} cargan ${plan.wood} troncos para tender un puente de ${plan.len} casillas`, { x:G.rx, y:G.ry });
}; }
// Ya reunidos en la orilla: el puente, casilla a casilla (devuelve true cuando está hecho)
function pontWork(G, g, alive){
  const P = G.pont; if (!P || P.built) return true;
  if (P.t0 == null) { P.t0 = yearT; P.k = 0; P.b = { tiles:[], core:[], h:P.h, diag:false, sx:P.sx, sy:P.sy, ex:P.ex, ey:P.ey, len:P.len, cx:P.cx, cy:P.cy, wide:true, pont:true, vid:g.id, born:yearT, used:yearT }; bridges.push(P.b); }
  const want = Math.min(P.tiles.length, Math.floor((yearT - P.t0) / 1.2) + 1);
  while (P.k < want) {
    const i = P.tiles[P.k++]; if (!WATER[world.biome[i]]) continue;
    bridgeSet.add(i); P.b.tiles.push(i); P.b.core.push(i); addEffect((i % W) * T + 2, ((i / W) | 0) * T + 3, 'poof'); groundSig = '';
    const v = alive[P.k % Math.max(1, alive.length)]; if (v && Math.random() < .5) floats.push({ x:v.x, y:v.y - 12, txt:['¡otro tronco!', '¡atad fuerte!', '¡empujad!'][P.k % 3], col:'#e8c898', life:0 });
  }
  if (P.k < P.tiles.length) return false;
  P.built = true; pathMap.add(P.sy * W + P.sx); pathMap.add(P.ey * W + P.ex); landCompT = -1e9; groundSig = ''; routeC.clear(); for (const u of alive) { u.route = null; u.routeKey = null; } // (las rutas guardadas no sabían del puente)
  notify(`Las tropas de ${g.name} terminan su puente de troncos y cruzan el agua`, { x:P.cx * T, y:P.cy * T });
  return true;
}
// Los pontones viejos, sin tropas que los usen, se los lleva la corriente
let pontT = 0;
SYSTEMS.push(dt => {
  if (!world || (pontT -= dt) > 0) return; pontT = 5;
  for (const b of bridges) if (b.pont && villagers.some(v => !v.dead && v.task && v.task.k === 'asalto' && v.vid === b.vid)) b.used = yearT;
  const gone = bridges.filter(b => b.pont && yearT - (b.used ?? b.born) > PONT_LIFE && !villagers.some(v => !v.dead && b.tiles.includes(tileOfXY(v.x, v.y))));
  if (!gone.length) return;
  for (const b of gone) { for (const i of b.tiles) bridgeSet.delete(i); const g = villageById(b.vid); notify(`La corriente se lleva el puente de troncos que tendieron ${g ? 'los de ' + g.name : 'unos soldados'}`, { x:b.cx * T, y:b.cy * T }); }
  bridges = bridges.filter(b => !gone.includes(b)); groundSig = ''; landCompT = -1e9; routeC.clear();
});
// Dibujo: troncos atados, sin barandilla (se pinta desde paintBridges)
function paintPontTile(b, k, px, py){
  const n = b.tiles.length, a0 = k === 0 ? -2 : 0, a1 = k === n - 1 ? 2 : 0;
  vctx.fillStyle = 'rgba(0,0,0,.25)';
  if (b.h) {
    vctx.fillRect(px + a0, py + T + 1, T - a0 + a1, 2);
    for (let q = px + a0; q < px + T + a1; q++) { vctx.fillStyle = (q & 1) ? '#6e4a28' : '#8c623a'; vctx.fillRect(q, py - 1 + ((q * 7) % 3 === 0 ? 1 : 0), 1, T + 2); }
    vctx.fillStyle = '#3e2a16'; vctx.fillRect(px + a0, py + 1, T - a0 + a1, 1); vctx.fillRect(px + a0, py + T - 2, T - a0 + a1, 1); // cuerdas
  } else {
    vctx.fillRect(px + T + 1, py + a0, 2, T - a0 + a1);
    for (let q = py + a0; q < py + T + a1; q++) { vctx.fillStyle = (q & 1) ? '#6e4a28' : '#8c623a'; vctx.fillRect(px - 1 + ((q * 7) % 3 === 0 ? 1 : 0), q, T + 2, 1); }
    vctx.fillStyle = '#3e2a16'; vctx.fillRect(px + 1, py + a0, 1, T - a0 + a1); vctx.fillRect(px + T - 2, py + a0, 1, T - a0 + a1);
  }
}
