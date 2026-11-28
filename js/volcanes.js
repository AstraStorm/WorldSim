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
      u.hp = (u.hp ?? 1) - .009 * dens * (u.home != null && u.sleep ? .3 : 1); // en casa, durmiendo, respiran menos ceniza (mata poco: lo malo es lo que hace en los campos y los tejados)
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

// ================= Cada volcán, a su manera =================
// · Antes todos entraban en erupción cada minuto o dos (varias veces al día de juego) y los tres tipos eran casi iguales.
//   Ahora pasan días dormidos (la caldera, años); antes de despertar avisan con temblores y humo (a veces es falsa
//   alarma), y cada tipo entra en erupción a su manera:
//   · Cono (estratovolcán): explosivo. Mucha ceniza, bombas, lava espesa que llega poco lejos y nubes ardientes que
//     bajan por la ladera a toda velocidad y arrasan lo que pillan
//   · Escudo: tranquilo, como en Hawái. Poca ceniza y ríos de lava fluidos y largos durante mucho rato
//   · Caldera: casi nunca, pero cuando despierta es una catástrofe: ceniza por todas partes, nubes ardientes y un
//     invierno volcánico que enfría el mundo durante un año o más («el año sin verano»)
// · Con nieve en la cumbre, la erupción la derrite y baja un río de barro (lahar) por el valle
const VOLC_KIND = {
  cono:    { sleep:[3, 8],   warn:[.5, 1],    dur:[8, 14],  flows:[1, 2], len:.55, sp:1,   bombs:14, spurts:.6,  ash:120, clouds:2,  pyro:[1, 3], txt:'explosiva: una columna de ceniza y nubes ardientes que bajan por la ladera' },
  escudo:  { sleep:[2, 6],   warn:[.4, .8],   dur:[25, 45], flows:[3, 5], len:2.2, sp:1.6, bombs:3,  spurts:.15, ash:20,  clouds:.3, pyro:[0, 0], txt:'tranquila: poca ceniza, pero ríos de lava que llegan muy lejos' },
  caldera: { sleep:[30, 80], warn:[1.5, 2.5], dur:[20, 30], flows:[4, 6], len:1.4, sp:1.2, bombs:20, spurts:1,   ash:300, clouds:5,  pyro:[2, 4], winter:4, txt:'¡una supererupción! Ceniza hasta el cielo, nubes ardientes y un invierno volcánico que enfriará el mundo' },
};
const volcK = v => VOLC_KIND[v.kind] || VOLC_KIND.cono;
const rnd2 = ([a, b]) => a + Math.random() * (b - a);
const volcDormancy = v => DAY_LEN * rnd2(volcK(v).sleep) / Math.max(.3, disasterF());
function volcMigrate(v){
  if (v.v2) return; v.v2 = 1; if (v.state === 'erupcion') return;
  v.state = 'dormido'; v.t = volcDormancy(v) * (.15 + Math.random() * .6); v.heat = Math.min(v.heat || 0, .25); // (el primero despierta en unos días)
}
const volcName = v => v.kind === 'cono' ? 'El volcán' : v.kind === 'escudo' ? 'El volcán en escudo' : 'La caldera volcánica';
const volcTowns = (v, extra = 30) => liveTowns().filter(g => Math.hypot(g.fx - v.cx, g.fy - v.cy) < v.r + extra);
function volcCycle(v, t){
  if (v.state === 'dormido' && disasterF() <= 0) { v.t = DAY_LEN; return; } // (con los desastres apagados, no despiertan)
  if (v.state === 'dormido') { // se despierta: avisa
    v.state = 'activo'; v.t = DAY_LEN * rnd2(volcK(v).warn); v.false = Math.random() < (v.kind === 'caldera' ? .35 : .15);
    const near = volcTowns(v);
    notify(`${volcName(v)} se despierta: tiembla la tierra, sale humo del cráter y el agua de los pozos huele a azufre${near.length ? `. En ${near.map(g => g.name).join(', ')} miran la montaña con miedo` : ''}`, { x:v.x, y:v.y });
  } else if (v.state === 'activo') {
    if (v.false) { v.state = 'dormido'; v.t = volcDormancy(v); notify(`${volcName(v)} se calma sin llegar a entrar en erupción: falsa alarma`, { x:v.x, y:v.y }); }
    else volcErupt(v, t);
  } else { v.state = 'dormido'; v.t = volcDormancy(v); }
}
// Los avisos: temblores de vez en cuando (sin grietas: se nota, nada más) y la montaña humeando
function volcRestless(v, dt){
  if ((v.trem = (v.trem ?? 10) - dt) > 0) return; v.trem = 15 + Math.random() * 25;
  snd('rumble', v.x, v.y, .4); if (typeof onScreen === 'function' && onScreen(v.x, v.y)) shake = Math.max(shake, 1.2);
  emitAsh(v, 4);
}
function volcErupt(v, t){
  const K = volcK(v); v.state = 'erupcion'; v.t = rnd2(K.dur); snd('boom', v.x, v.y, v.kind === 'caldera' ? 1 : .8);
  for (let k = Math.round(rnd2(K.flows)); k > 0; k--) v.flows.push(flowPath(v, K.len, K.sp));
  emitAsh(v, K.ash);
  for (let k = K.clouds; k > 0; k--) if (k >= 1 || Math.random() < k) toxicCloud(v);
  for (let k = Math.round(rnd2(K.pyro)); k > 0; k--) (v.pyro ||= []).push(pyroPath(v));
  if (volcSnowy(v)) { for (let k = 1 + (Math.random() < .4 ? 1 : 0); k > 0; k--) (v.lahars ||= []).push(laharPath(v)); setTimeout(() => notify('El calor de la erupción derrite la nieve de la cumbre: un río de barro (lahar) baja por el valle arrastrándolo todo', { x:v.x, y:v.y }), 2500); }
  if (K.winter) { world.volcWinter = Math.max(world.volcWinter || 0, K.winter); shake = Math.max(shake, 6); }
  notify(`${volcName(v)} entra en erupción, ${K.txt}`, { x:v.x, y:v.y });
}
const volcSnowy = v => { const i = v.cy * W + v.cx; return (snowA && snowA[i] > .2) || tempAt(i) < 1 || [B.SNOW, B.TUNDRA].includes(world.biome[i]); };
// Camino ladera abajo (por donde más baja; en lo llano sigue recto por la inercia), hasta el mar o el largo que le toque
function downhill(v, len, a = Math.random() * Math.PI * 2){
  const e = world.e, path = [], seen = new Set(), rr = v.r * Math.max(.12, v.crater || .12) + 1;
  let x = Math.round(v.cx + Math.cos(a) * rr), y = Math.round(v.cy + Math.sin(a) * rr), dx = Math.sign(Math.round(Math.cos(a) * 2)), dy = Math.sign(Math.round(Math.sin(a) * 2));
  for (let s = 0; s < len; s++) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) break; const j = y * W + x;
    if (WATER[world.biome[j]] && world.biome[j] <= B.SHALLOW) break; // (al mar no; ríos y lagos los cruza)
    path.push(j); seen.add(j);
    let bx = -1, by = -1, be = Infinity;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { if (!ox && !oy) continue; const n = (y + oy) * W + x + ox; if (seen.has(n)) continue;
      const val = e[n] - (ox === dx && oy === dy ? .004 : 0) + Math.random() * .003; if (val < be) { be = val; bx = x + ox; by = y + oy; } }
    if (bx < 0) break; dx = bx - x; dy = by - y; x = bx; y = by;
  }
  return path;
}
const pyroPath = v => ({ path:downhill(v, Math.round(v.r * (1.4 + Math.random())) + 6), k:0, acc:0, speed:12 + Math.random() * 6, end:0, id:Math.random() });
const laharPath = v => ({ path:downhill(v, Math.round(v.r * 3 + 20 + Math.random() * 20)), k:0, acc:0, speed:6 + Math.random() * 3, end:0, id:Math.random() });
// Lo que arrasa una nube ardiente (todo lo que pilla arde y nadie sobrevive) o un lahar (lo arrastra y lo entierra en barro)
function volcSweep(i, kind, v){
  const x = i % W, y = (i / W) | 0, px = x * T + 2, py = y * T + 3, R = kind === 'pyro' ? 2.4 * T : 1.6 * T;
  const o = world.objs[i];
  if (kind === 'pyro') { if (o) ignite(i, 1); for (const n of nb4i(i)) if (Math.random() < .5) ignite(n, .6); }
  else { if (o && !isBuilding(o)) { if (!fallObj(i, true)) addEffect(px, py, 'poof'); world.objs[i] = null; composeRegion(x - 7, y - 11, x + 7, y + 12); } (world.mud ||= new Map()).set(i, yearT); const f = farmMap.get(i); if (f && f.st !== 'pradera') { f.st = 'muerta'; f.why = 'barro'; } }
  for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) { const j = yy * W + xx; if (j >= 0 && j < N && isBuilding(world.objs[j])) damageBuilding(j, kind === 'pyro' ? .35 : .5); }
  for (const u of villagers) if (!u.dead && !u.away && Math.abs(u.x - px) < R && Math.abs(u.y - py) < R) { killVillager(u, 'volcán'); (v.swept ||= {})[kind] = (v.swept[kind] || 0) + 1; }
  if (typeof animals !== 'undefined') for (const a of animals) if (!a.dead && Math.abs(a.x - px) < R && Math.abs(a.y - py) < R) killAnimal(a, 'volcán');
  if (typeof banditLose === 'function') for (const b of (world.bandits || [])) if (!b.dead && Math.abs(b.x - px) < R * 1.5 && Math.abs(b.y - py) < R * 1.5) banditLose(b, b.men, kind === 'pyro' ? 'una nube ardiente del volcán' : 'el lahar');
}
function volcFlowsTick(v, dt){
  for (const [list, kind] of [[v.pyro, 'pyro'], [v.lahars, 'lahar']]) {
    if (!list || !list.length) continue;
    for (const f of list) {
      if (f.k >= f.path.length) { f.end += dt; continue; }
      f.acc += dt * f.speed; while (f.acc >= 1 && f.k < f.path.length) { f.acc -= 1; volcSweep(f.path[f.k++], kind, v); }
    }
    if (!list.some(f => f.end > 4)) continue;
    const n = (v.swept || {})[kind] || 0;
    if (n) notify(`${kind === 'pyro' ? 'Las nubes ardientes del volcán han' : 'El lahar ha'} matado a ${n === 1 ? 'una persona' : `${n} personas`}`, { x:v.x, y:v.y });
    if (v.swept) v.swept[kind] = 0;
    if (kind === 'pyro') v.pyro = list.filter(f => f.end <= 4); else v.lahars = list.filter(f => f.end <= 4);
  }
}
// Dibujo: la nube ardiente rueda ladera abajo (bolas de ceniza con el dibujo de las nubes); el lahar, una lengua de barro
const pyroSpr = new Map();
function drawVolcFlows(t){
  if (!world.volcanoes) return; const [x0, y0, x1, y1] = visibleRect();
  if (world.mud && world.mud.size) { const old = [];
    for (const [i, t0] of world.mud) { const age = yearT - t0; if (age > DAY_LEN * 2) { old.push(i); continue; } const px = (i % W) * T, py = ((i / W) | 0) * T; if (px < x0 - T || px > x1 || py < y0 - T || py > y1) continue;
      vctx.fillStyle = `rgba(104,78,48,${.75 * (1 - age / (DAY_LEN * 2))})`; vctx.fillRect(px - 2, py - 2, T + 4, T + 4); }
    for (const i of old) world.mud.delete(i); }
  for (const v of world.volcanoes) {
    for (const f of v.lahars || []) { const n = Math.min(f.k, f.path.length - 1), fade = Math.max(0, 1 - f.end / 4);
      for (let k = Math.max(0, n - 6); k <= n; k++) { const i = f.path[k], px = (i % W) * T + 2, py = ((i / W) | 0) * T + 3; if (px < x0 - 20 || px > x1 + 20 || py < y0 - 20 || py > y1 + 20) continue;
        vctx.fillStyle = `rgba(92,66,40,${.9 * fade})`; vctx.beginPath(); vctx.ellipse(px, py, 5 + (n - k) * .4, 3, 0, 0, Math.PI * 2); vctx.fill(); } }
    for (const f of v.pyro || []) { if (!f.path.length) continue; const n = Math.min(f.k, f.path.length - 1), fade = Math.max(0, 1 - f.end / 4);
      let spr = pyroSpr.get(f.id); if (!spr) pyroSpr.set(f.id, spr = [pooledCloud('ash', 26, .55), pooledCloud('ash', 34, .5), pooledCloud('ash', 22, .6)]);
      for (let k = Math.max(0, n - 10); k <= n; k += 2) { const i = f.path[k], px = (i % W) * T + 2, py = ((i / W) | 0) * T + 3; if (px < x0 - 40 || px > x1 + 40 || py < y0 - 40 || py > y1 + 40) continue;
        const sp = spr[k % 3], grow = 1 + (n - k) * .06, w = sp.body.width * grow, h = sp.body.height * grow, rise = (n - k) * 1.5 + Math.sin(t / 300 + k) * 1.5;
        vctx.globalAlpha = .9 * fade * (1 - (n - k) / 14); vctx.drawImage(sp.body, px - w / 2, py - h * .8 - rise, w, h); }
      vctx.globalAlpha = 1; }
  }
  if (pyroSpr.size > 40) pyroSpr.clear();
}
{ const base = drawAshClouds; drawAshClouds = function(t){ drawVolcFlows(t); base.apply(this, arguments); }; }
// La ceniza que cae: mata poco por respirarla, pero arruina lo sembrado y hunde algún tejado; y deja la tierra muy fértil
{ const base = updateAshClouds; updateAshClouds = function(dt){
  if (world.volcWinter > .05) world.volcWinter -= world.volcWinter * dt / (DAY_LEN * 16 * 1.2); else world.volcWinter = 0; // el invierno volcánico se va pasando en un año o así
  for (const c of ashClouds) { if ((c.fallT = (c.fallT || 0) - dt) > 0) continue; c.fallT = 2;
    const dens = ashDens(c), R = c.r * .85, tx = Math.floor(c.x / T), ty = Math.floor(c.y / T), RT = Math.ceil(R / T);
    const S = (world.ashSoil ||= new Set()); let ruined = 0, g0 = null;
    for (const [i, f] of farmMap) { const fx = i % W, fy = (i / W) | 0; if (Math.abs(fx - tx) > RT || Math.abs(fy - ty) > RT || Math.hypot(fx * T - c.x, fy * T - c.y) > R) continue;
      if ((f.st === 'sembrado' || f.st === 'creciendo') && Math.random() < .2 * dens) { f.st = 'muerta'; f.why = 'ceniza'; ruined++; g0 = g0 || villageById(f.vid); }
      if (S.size < 20000) S.add(i); }
    if (ruined && g0 && !(c.cropHit ||= new Set()).has(g0.id)) { c.cropHit.add(g0.id); notify(`La ceniza del volcán cae sobre los campos de ${g0.name} y arruina lo sembrado`, { x:g0.fx * T, y:g0.fy * T }); }
    for (const g of liveTowns()) if (Math.hypot(g.fx * T - c.x, g.fy * T - c.y) < R + 20 * T) for (const b of housesOf(g)) { const bx = (b % W) * T, by = ((b / W) | 0) * T; if (Math.hypot(bx - c.x, by - c.y) < R && Math.random() < .04 * dens) damageBuilding(b, .12); } // el peso de la ceniza en los tejados
  }
  return base.apply(this, arguments);
}; }
