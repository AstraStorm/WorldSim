// World Sim · Vivir junto a un volcán: no construir en sus faldas, cercar el cráter y la lava que quema edificios
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
// ---- Erupciones más vivas: islas que crecen, chorros de lava y nubes de ceniza tóxica ----
// · La colada que llega al mar se enfría al momento y deja tierra nueva: sigue avanzando unas casillas mar adentro,
//   así que la costa (o la isla volcánica) crece con cada erupción
// · Chorros de lava: bombas grandes y brillantes que caen lejos del cráter; donde caen prenden fuego a árboles y
//   casas y hieren o matan a quien pillen
// · Nube de ceniza tóxica: sale en cada erupción y el viento se la lleva; quien queda debajo tose, enferma y, si se
//   queda mucho rato, puede morir
let ashClouds = [];
function lavaMeetsWater(f, v){
  const j = f.water, x = j % W, y = (j / W) | 0; f.water = -1;
  addEffect(x * T + 2, y * T + 3, 'poof');
  for (let k = 0; k < 6; k++) smoke.push({ x:x * T + 2 + (Math.random() - .5) * 6, y:y * T, vx:(Math.random() - .5) * 4, vy:-6 - Math.random() * 4, r:2 + Math.random() * 2, life:0, max:2 + Math.random() }); // el vapor
  if (world.lake[j] || world.biome[j] > B.SHALLOW) return; // ríos y lagos: solo vapor
  f.sea ??= 3 + Math.floor(Math.random() * 6) + (v.kind === 'escudo' ? 4 : 0); if (f.sea-- <= 0) return;
  // Tierra nueva: la casilla sube justo por encima del mar y la colada sigue por ella
  world.e[j] = world.sea + .004 + Math.random() * .006; world.volc[j] = 2; world.vid[j] = v.id;
  const last = f.path[f.path.length - 1] ?? j, dx = Math.sign((j % W) - (last % W)), dy = Math.sign(((j / W) | 0) - ((last / W) | 0));
  f.path.push(j);
  for (const [sx, sy] of [[dy, dx], [-dy, -dx]]) { const k = (y + sy) * W + x + sx; if (Math.random() < .6 && k > 0 && k < N && WATER[world.biome[k]] && !world.lake[k] && world.biome[k] <= B.SHALLOW) { world.e[k] = world.sea + .003 + Math.random() * .005; world.volc[k] = 2; world.vid[k] = v.id; f.path.push(k); } } // la colada se ensancha al enfriarse
  const turn = Math.random() < .35 ? (Math.random() < .5 ? [dy, dx] : [-dy, -dx]) : [dx, dy], nx = x + turn[0], ny = y + turn[1], n = ny * W + nx;
  if (nx > 1 && ny > 1 && nx < W - 2 && ny < H - 2 && WATER[world.biome[n]]) f.water = n; // la siguiente casilla de mar
  if (!v.islandMsg || yearT - v.islandMsg > DAY_LEN) { v.islandMsg = yearT; notify('La lava del volcán llega al mar y se enfría entre nubes de vapor: la tierra gana terreno al mar', { x:x * T, y:y * T }); }
}
function lavaSpurt(v){
  const n = 2 + Math.floor(Math.random() * 4);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, sp = 45 + Math.random() * 40, far = v.r * T * (.6 + Math.random() * 1.6);
    v.bombs.push({ x:v.x, y:v.y - 3, vx:Math.cos(a) * sp * .7, vy:-60 - Math.random() * 45, life:0, big:true, gy:v.y + (Math.random() - .35) * far * .8, trail:[] });
  }
  snd('boom', v.x, v.y, .35);
}
function lavaBombLand(b, v){
  const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
  const i = ty * W + tx;
  for (let k = 0; k < 10; k++) chips.push({ x:b.x, y:b.y, vx:(Math.random() - .5) * 26, vy:-6 - Math.random() * 12, life:0, max:.5 + Math.random() * .4, col:k % 3 ? '#ff8a20' : '#ffe060' });
  smoke.push({ x:b.x, y:b.y - 2, vx:0, vy:-5, r:2, life:0, max:1.8 });
  if (WATER[world.biome[i]]) { addEffect(b.x, b.y, 'poof'); return; }
  const o = world.objs[i];
  ignite(i, o && (OBJ[o.key][1] === 'tree' || OBJ[o.key][1] === 'berry' || isBuilding(o)) ? 1 : .5); // prende lo que pilla
  for (let yy = ty; yy <= Math.min(H - 1, ty + 6); yy++) for (let xx = Math.max(0, tx - 3); xx <= Math.min(W - 1, tx + 3); xx++) {
    const j = yy * W + xx; if (!isBuilding(world.objs[j])) continue;
    damageBuilding(j, .15); if (world.objs[j] && !fires.has(j) && fires.size < 260 && Math.random() < .5) fires.set(j, { t:0, life:6 + Math.random() * 4, tree:true, bld:true });
  }
  for (const u of villagers) {
    if (u.dead || u.away || Math.hypot(u.x - b.x, u.y - b.y) > 7) continue;
    u.hp = (u.hp ?? 1) - .55; hurtFx(u, b.x, b.y, walkable);
    if (u.hp <= 0) { killVillager(u, 'volcán'); notify(`Una bomba de lava del volcán mata a ${u.name}`, { x:u.x, y:u.y }); }
  }
}
function drawLavaBomb(b, t){
  (b.trail ||= []).push([b.x, b.y]); if (b.trail.length > 7) b.trail.shift();
  b.trail.forEach(([x, y], k) => { const a = (k + 1) / b.trail.length; vctx.fillStyle = `rgba(255,${120 + k * 12},40,${a * .5})`; vctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); });
  vctx.fillStyle = 'rgba(255,140,40,.35)'; vctx.beginPath(); vctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); vctx.fill(); // el resplandor
  vctx.fillStyle = '#ffb040'; vctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3); vctx.fillStyle = '#fff0a0'; vctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
  vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(Math.round(b.x) - 1, Math.round(b.gy) + 1, 3, 1); // su sombra donde va a caer
}
function toxicCloud(v){
  for (let k = 0; k < (v.kind === 'cono' ? 2 : 1); k++)
    ashClouds.push({ x:v.x + (Math.random() - .5) * 20, y:v.y - 10, r:14, life:0, max:150 + Math.random() * 120, seed:Math.random() * 100,
      puffs:Array.from({ length:8 }, () => [(Math.random() - .5) * 1.4, (Math.random() - .5) * .8, .45 + Math.random() * .5]) });
}
const ashDens = c => clamp(Math.min(c.life / 6, (c.max - c.life) / 30), 0, 1);
function updateAshClouds(dt){
  for (const c of ashClouds) {
    c.life += dt; const w = windAt(c.x, c.y); c.x += w[0] * .9 * dt; c.y += w[1] * .9 * dt; c.r = Math.min(70, c.r + dt * 1.4);
    if ((c.tick = (c.tick || 0) - dt) > 0) continue; c.tick = 1;
    const dens = ashDens(c), R = c.r * .85;
    for (const u of villagers) {
      if (u.dead || u.away || Math.hypot(u.x - c.x, u.y - c.y) > R) continue;
      u.hp = (u.hp ?? 1) - .025 * dens * (u.home != null && u.sleep ? .3 : 1); // en casa, durmiendo, respiran menos ceniza
      if (Math.random() < .08) { floats.push({ x:u.x, y:u.y - 12, txt:'*cof cof*', col:'#a8a878', life:0 }); snd('cough', u.x, u.y); }
      if (u.hp <= 0) killVillager(u, 'ceniza tóxica');
    }
    for (const g of villages) if (popOf(g) && Math.hypot(g.fx * T - c.x, g.fy * T - c.y) < R && !(c.hit ||= new Set()).has(g.id)) { c.hit.add(g.id); notify(`Una nube de ceniza tóxica del volcán cubre ${g.name}: la gente tose y enferma`, { x:g.fx * T, y:g.fy * T }); }
  }
  if (ashClouds.length) ashClouds = ashClouds.filter(c => c.life < c.max);
}
// Con el mismo dibujo que las nubes del cielo (clima.js), en gris verdoso: la sombra en el suelo y la nube un poco por
// encima (más baja que las de lluvia: es humo pesado), y un dibujo más grande a medida que se extiende
const ASH_LIFT = 18;
function ashSprite(c){
  const w = c.r * 2.4; if (c.spr && Math.abs(c.sw - w) / c.sw < .3) return c.spr;
  c.sw = w; return c.spr = pooledCloud('ash', w, .42 + (c.seed % 1) * .12);
}
function drawAshClouds(t){
  if (!ashClouds.length) return;
  const [x0, y0, x1, y1] = visibleRect();
  for (const c of ashClouds) {
    if (c.x + c.r * 1.6 < x0 || c.x - c.r * 1.6 > x1 || c.y + c.r < y0 || c.y - c.r - ASH_LIFT > y1) continue;
    const dens = ashDens(c), sp = ashSprite(c), w = sp.body.width, h = sp.body.height, wob = Math.sin(t / 1400 + c.seed) * 2;
    const x = Math.round(c.x - w / 2 + wob), y = Math.round(c.y - h / 2);
    vctx.globalAlpha = .22 * dens; vctx.drawImage(sp.shadow, x, y); // la sombra
    vctx.globalAlpha = .72 * dens; vctx.drawImage(sp.body, x, y - ASH_LIFT);
    vctx.globalAlpha = 1;
  }
}
