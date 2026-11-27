// World Sim · Temperatura, heladas, sequías, incendios, tormentas de arena y meteoritos
// ================= Temperatura, heladas y sequías =================
// Cada casilla tiene una temperatura media (latitud, altitud y bioma: la montaña y los polos, fríos; el
// desierto, caluroso; el mar suaviza) a la que se suma la estación y olas de calor o de frío que recorren
// el mapa despacio. Con temperaturas bajo cero lagos, ríos y aguas poco profundas se congelan.
// La humedad del suelo sube con la lluvia y baja con el calor: si falta lluvia mucho tiempo hay sequía
// (la hierba se agosta, arde con más facilidad y los animales tienen más sed)
// Casillas cuya nieve ha cambiado y hay que repintar (solo cuenta un cambio de al menos un 5 %)
let snowDirty = new Set();
const setSnow = (i, v) => { const o = snowA[i]; snowA[i] = v; if ((o * 20 | 0) !== (v * 20 | 0) || v <= 0) snowDirty.add(i); };
// Temperatura media del planeta respecto a la normal: va hacia un objetivo que cambia cada año
let globalT = 0, globalTarget = 0, globalYear = 0;
let ensoDT = 0; // (El Niño / La Niña: fenomenos.js)
let iceSet = new Set(), drySet = new Set(), snowDepth = null, snowClock = 0, seasonTempNow = 0, soil = null, soilNorm = null, soilRain = null, drought = null, droughtCv = null, climT = 0, iceSweep = 0, climClock = 0, lastDroughtNotice = -1e9;
const SOIL_C = 8; // las celdas de humedad del suelo agrupan 8×8 casillas
const BIOME_DT = { [B.DESERT]:6, [B.DRY]:2, [B.SAND]:2, [B.SNOW]:-4, [B.TUNDRA]:-3, [B.ROCK]:-2, [B.SWAMP]:1 };
function initClimate(){
  const { e, sea, tp, biome } = world;
  seasonTempNow = seasonVal('temp');
  world.baseT = new Float32Array(N); world.ice = new Float32Array(N); iceSet = new Set();
  world.dry = new Float32Array(N); drySet = new Set(); snowDepth = new Uint8Array(N);
  // Calor de los volcanes: cada casilla cercana guarda cuál es su volcán y cuánto le llega (más al lado)
  world.vHeatId = new Uint8Array(N); world.vHeatF = new Float32Array(N);
  world.volcanoes.forEach((v, k) => {
    const R = 14, cx = Math.floor(v.x / T), cy = Math.floor(v.y / T);
    for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x++) {
      const f = 1 - Math.hypot(x - cx, y - cy) / R, i = y * W + x;
      if (f > world.vHeatF[i]) { world.vHeatF[i] = f * f; world.vHeatId[i] = k + 1; }
    }
  });
  // Profundidad del agua dulce: casillas desde la orilla. Con sequía se secan primero las orillas y los
  // arroyos estrechos; los lagos grandes solo encogen
  const fd = world.fdepth = new Uint8Array(N), q = [];
  for (let i = 0; i < N; i++) if (FRESH(biome[i]) && nb4i(i).some(n => !WATER[biome[n]])) { fd[i] = 1; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h]; if (fd[i] >= 30) continue; for (const n of nb4i(i)) if (FRESH(biome[n]) && !fd[n]) { fd[n] = fd[i] + 1; q.push(n); } }
  for (let i = 0; i < N; i++) {
    let t = -2 + tp[i] * 35 - Math.max(0, (e[i] - sea) / (1 - sea)) * 8 + (BIOME_DT[biome[i]] || 0);
    if (e[i] < sea && biome[i] !== B.LAKE) t = t * .5 + 7; // el mar suaviza: ni tan frío ni tan caluroso
    world.baseT[i] = t;
  }
  const SW = Math.ceil(W / SOIL_C), SH = Math.ceil(H / SOIL_C);
  soil = new Float32Array(SW * SH); soilNorm = new Float32Array(SW * SH); soilRain = new Float32Array(SW * SH); drought = new Float32Array(SW * SH);
  for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) {
    let sum = 0, n = 0;
    for (let y = cy * SOIL_C; y < Math.min(H, cy * SOIL_C + SOIL_C); y++) for (let x = cx * SOIL_C; x < Math.min(W, cx * SOIL_C + SOIL_C); x++) { sum += Math.min(1, world.mp[y * W + x]); n++; }
    const c = cy * SW + cx; soilNorm[c] = .3 + sum / n * .6; soil[c] = soilNorm[c];
  }
  droughtCv = document.createElement('canvas'); droughtCv.width = W; droughtCv.height = H;
  // Árboles del mapa inicial: ya adaptados al clima medio de su zona
  for (let i = 0; i < N; i++) {
    const o = world.objs[i]; if (!o || !o.life) continue;
    const C = treeClima(o); if (C) o.ad = clamp((world.baseT[i] - C[0]) * .8 + (Math.random() - .5) * 4, -20, 20);
  }
  // Nieve de partida: la que corresponde al frío de cada sitio en la estación actual
  for (let i = 0; i < N; i++) {
    if (WATER[biome[i]] || biome[i] === B.LAVA) continue;
    const t = tempAt(i); if (t < -3) { snowA[i] = clamp((-t - 3) / 6, 0, 1); snowSet.add(i); snowDirty.add(i); }
  }
}
const soilCell = i => Math.floor(((i / W) | 0) / SOIL_C) * Math.ceil(W / SOIL_C) + Math.floor((i % W) / SOIL_C);
const droughtAt = i => drought ? drought[soilCell(i)] : 0;
// Ola de calor o de frío: manchas grandes que se desplazan por el mapa (± 6 °C)
const anomaly = (x, y) => 6 * Math.sin(x * .021 + climT * .013) * Math.cos(y * .027 - climT * .009);
function tempAt(i){
  if (!world.baseT) return 15;
  const x = i % W, y = (i / W) | 0, sea = world.e[i] < world.sea && world.biome[i] !== B.LAKE;
  // En las zonas frías la diferencia entre invierno y verano es mayor (como en el interior de los continentes)
  const amp = sea ? .5 : 1 + clamp(-world.baseT[i] / 15, 0, 1) * .6;
  // Cerca de un volcán hace más calor (dormido, algo; en erupción, mucho) y sobre la lava, muchísimo
  const vk = world.vHeatId[i], volc = vk ? world.vHeatF[i] * (6 + world.volcanoes[vk - 1].heat * 30) : 0;
  return world.baseT[i] + globalT + ensoDT + seasonTempNow * amp + anomaly(x, y) - (raining(i) ? 2 : 0) + droughtAt(i) * 3 + volc + world.lavaT[i] * 40;
}
const FRESH = b => b === B.LAKE || b === B.RIVER;
const frozen = i => world.ice && world.ice[i] > .5;
const dried = i => world.dry && world.dry[i] > .6; // cauce o lecho seco por la sequía
function updateClimate(dt){
  if (!world.baseT) return;
  climT += dt;
  // Nieve, hielo y cauces: se recorre todo el mapa cada ~1 s, un trozo por fotograma, en orden disperso
  // (saltando por el mapa con un paso primo) para que los cambios no avancen en franjas de arriba abajo
  seasonTempNow = seasonVal('temp');
  const seasonLo = seasonTempNow < 0 ? seasonTempNow * 1.6 : seasonTempNow * .5; // lo más frío que puede dar la estación en una casilla (para descartar rápido)
  // Cambio climático lento: cada año el planeta tira hacia un nuevo objetivo, y la temperatura lo sigue despacio
  const yr = Math.floor(yearT / YEAR);
  if (yr !== globalYear) { globalYear = yr; globalTarget = clamp(globalTarget + (Math.random() - .5) * 3.2, -5, 5); }
  globalT += (globalTarget - globalT) * Math.min(1, dt / (YEAR * 1.2));
  const chunk = Math.ceil(N / 240), el = dt * 240, vr = visibleRect(); // (todo el mapa cada ~4 s: la nieve y el hielo cambian despacio)
  const seen = i => { const x = (i % W) * T, y = ((i / W) | 0) * T; return x >= vr[0] && x <= vr[2] && y >= vr[1] && y <= vr[3]; };
  for (let n = 0; n < chunk; n++) {
    iceSweep = (iceSweep + 1) % N;
    const i = (iceSweep * 1000003) % N;
    const b = world.biome[i];
    if (!WATER[b]) {
      // Nieve en el suelo: donde hace mucho frío se mantiene y crece (neveros y glaciares de las cumbres);
      // por encima de 0 °C se derrite, más deprisa cuanto más calor
      if (b === B.LAVA) continue;
      if (!snowA[i] && !(floodA && floodA[i] > .1) && world.baseT[i] + globalT + seasonLo - 11 > -6) continue; // (rendimiento) tan templado que no puede nevar: ni se calcula
      const t = tempAt(i);
      // Charco evaporándose: vapor que sube (más cuanto más calor)
      if (floodA && floodA[i] > .1 && t > 14 && Math.random() < (t - 14) / 20 && seen(i)) addVapor(i);
      if (t < -6) { if (snowA[i] < 1) { setSnow(i, Math.min(1, snowA[i] + Math.min(1, (-t - 6) / 6) * .012 * el)); snowSet.add(i); } }
      else if (t > -.5 && snowA[i] > 0) {
        // Cada mancha de nieve se funde desde su centro hacia fuera: lo más interior va primero y el
        // frente avanza hacia el borde (la distancia al borde de cada casilla es la de antes de fundirse)
        const core = .15 + 2.4 * clamp((snowDepth[i] - 1) / 5, 0, 1);
        setSnow(i, snowA[i] - (t + 1) * .03 * core * el);
        if (snowA[i] <= 0) { snowA[i] = 0; snowDepth[i] = 0; snowSet.delete(i); groundClear.push(i); }
      }
      continue;
    }
    if (!(FRESH(b) || b === B.SHALLOW)) { if (world.ice[i]) { world.ice[i] = 0; } continue; }
    if (FRESH(b)) {
      // Sequía: el agua baja y deja el cauce al aire, más pronto cuanto menos profunda; con lluvia se recupera.
      // Un cauce que se está secando ya no se hiela: no queda agua que congelar
      const thr = .3 + Math.min(world.fdepth[i], 8) * .1, d = droughtAt(i);
      let w = world.dry[i];
      w = d > thr ? Math.min(1, w + (d - thr + .1) * .5 * el) : Math.max(0, w - .15 * el);
      world.dry[i] = w; if (w > 0) drySet.add(i);
      if (d > thr && w < .95 && Math.random() < .8 && seen(i)) addVapor(i); // se está secando: el agua se evapora
      if (w > .05) { world.ice[i] = 0; continue; }
    }
    if (!world.ice[i] && world.baseT[i] + globalT + seasonLo - 11 > 0) continue; // (rendimiento) no puede helarse
    const t = tempAt(i) + (b === B.SHALLOW ? 3 : 0) + (b === B.RIVER && world.slope[i] > 120 ? 2 : 0); // el mar y los rápidos cuestan más de helar
    let v = world.ice[i];
    // Unos 5 días en helarse o deshelarse con 2-3 grados bajo o sobre cero (antes de 15 a 20)
    v = t < 0 ? Math.min(1, v + -t * .035 * el) : Math.max(0, v - t * .04 * el);
    world.ice[i] = v;
    if (v > 0) iceSet.add(i);
  }
  snowClock += dt;
  if (snowClock > 3) { snowClock = 0; buildSnowDepth(); }
  // Humedad del suelo y sequía, una vez por segundo
  climClock += dt;
  if (climClock < 1) return;
  const step = climClock; climClock = 0;
  const SW = Math.ceil(W / SOIL_C), SH = Math.ceil(H / SOIL_C), si = seasonInfo().i;
  const img = droughtCv.getContext('2d').createImageData(W, H), D = img.data;
  for (let c = 0; c < soil.length; c++) {
    const cx = (c % SW) * SOIL_C + 4, cy = Math.floor(c / SW) * SOIL_C + 4, ti = Math.min(H - 1, cy) * W + Math.min(W - 1, cx);
    // Sin lluvia, el suelo tiende a su humedad normal, menos cuanto más calor haga por encima de lo habitual
    // en esa zona (verano, olas de calor). Un verano normal no basta: hace falta calor de más o falta de lluvia
    const t = world.baseT[ti] + seasonVal('temp') + anomaly(cx, cy), stress = clamp((t - world.baseT[ti] - Math.max(0, seasonVal('temp')) - 1.5) / 4.5, 0, 1); // solo el calor por encima de lo normal en la estación
    const target = soilNorm[c] * (1 - stress * .55) * (si === 3 ? 1.05 : 1);
    soil[c] = clamp(soil[c] + soilRain[c] + (target - soil[c]) * .04 * step, 0, 1);
    soilRain[c] = 0;
    const d = clamp((soilNorm[c] * .8 - soil[c]) / (soilNorm[c] * .6), 0, 1);
    if (d > .45 && drought[c] <= .45 && t > 15) maybeDroughtNotice(cx, cy);
    drought[c] = d;
  }
  // Capa de sequía: 1 píxel por casilla (se pinta ampliada y suavizada sobre el terreno)
  for (let i = 0; i < N; i++) {
    const b = world.biome[i]; if (WATER[b] || b === B.LAVA || b === B.SNOW || b === B.DESERT) continue;
    const d = drought[soilCell(i)]; if (d < .2) continue;
    const o = i * 4; D[o] = 196; D[o + 1] = 156; D[o + 2] = 70; D[o + 3] = Math.min(1, (d - .2) / .6) * 120;
  }
  droughtCv.getContext('2d').putImageData(img, 0, 0);
}
function maybeDroughtNotice(x, y){
  const t = performance.now(); if (t - lastDroughtNotice < 180000) return; // un aviso cada pocos minutos como mucho
  lastDroughtNotice = t; notify('Hay sequía en una región', { x:x * T, y:y * T });
}
function drawDrought(){
  if (!droughtCv) return;
  vctx.save(); vctx.imageSmoothingEnabled = true; vctx.drawImage(droughtCv, 0, 0, PW, PH); vctx.restore();
}
// Distancia de cada casilla nevada al borde de su mancha (0 en el borde, más en el centro)
// Solo crece mientras la mancha crece: cuando se abre un hueco al fundirse el centro, las casillas de alrededor
// conservan su distancia original y el deshielo sigue avanzando hacia fuera
function buildSnowDepth(){
  const d = new Uint8Array(N), q = [];
  for (const i of snowSet) if (snowA[i] > .05 && nb4i(i).some(n => snowA[n] <= .05)) { d[i] = 1; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (d[i] >= 40) continue;
    for (const n of nb4i(i)) if (snowA[n] > .05 && !d[n]) { d[n] = d[i] + 1; q.push(n); }
  }
  for (const i of snowSet) snowDepth[i] = snowA[i] > .05 ? Math.max(snowDepth[i], d[i]) : 0;
}
// Placas de barro: celdas irregulares (los bordes se desplazan al azar por tramos); la grieta es el borde entre dos
const mudId = (px, py) => Math.floor((px + h2(py >> 2, px >> 4, 65) * 3) / 5) * 4096 + Math.floor((py + h2(px >> 2, py >> 4, 66) * 3) / 4);
// Cauce seco: barro cuarteado con grietas oscuras donde antes había agua
function paintDry(Dd, x0, y0, x1, y1){
  for (const i of drySet) {
    const tx = i % W, ty = (i / W) | 0;
    if ((tx + 1) * T < x0 || tx * T > x1 || (ty + 1) * T < y0 || ty * T > y1) continue;
    const v = world.dry[i];
    for (let py = ty * T; py < ty * T + T; py++) for (let px = tx * T; px < tx * T + T; px++) {
      const k = py * PW + px; if (!WATER[world.biome[pt[k]]]) continue;
      const o = k * 4;
      if (v > .02 && (v > .35 || h2(px, py, 64) < v * 3)) {
        const crack = mudId(px, py) !== mudId(px + 1, py) || mudId(px, py) !== mudId(px, py + 1);
        const damp = v < .75 && h2(px, py, 67) < .4; // aún queda barro húmedo
        Dd[o] = crack ? 104 : damp ? 128 : 170; Dd[o + 1] = crack ? 82 : damp ? 106 : 140; Dd[o + 2] = crack ? 58 : damp ? 82 : 98; Dd[o + 3] = 245;
      } else if (v <= .02) Dd[o + 3] = 0;
    }
    if (v <= .02) drySet.delete(i);
  }
}
// Hielo sobre el agua (se pinta en la capa de olas, por encima de la corriente): blanco azulado con grietas
function paintIce(Dd, x0, y0, x1, y1){
  for (const i of iceSet) {
    const tx = i % W, ty = (i / W) | 0;
    if ((tx + 1) * T < x0 || tx * T > x1 || (ty + 1) * T < y0 || ty * T > y1) continue;
    const v = world.ice[i];
    for (let py = ty * T; py < ty * T + T; py++) for (let px = tx * T; px < tx * T + T; px++) {
      const k = py * PW + px; if (!WATER[world.biome[pt[k]]]) continue;
      const o = k * 4, hv = h2(px, py, 61);
      if (v > .02 && hv < v * 1.25) {
        const crack = h2(px >> 1, py, 62) > .93, shine = h2(px, py >> 1, 63) > .9;
        Dd[o] = crack ? 168 : shine ? 246 : 214; Dd[o + 1] = crack ? 200 : shine ? 251 : 234; Dd[o + 2] = crack ? 226 : shine ? 255 : 246; Dd[o + 3] = 240;
      } else if (v <= .02) Dd[o + 3] = 0;
    }
    if (v <= .02) iceSet.delete(i);
  }
}

// ================= Incendios =================
// Un rayo o la lava pueden prender la hierba o un árbol. El fuego salta a las casillas vecinas según lo
// inflamable que sea el terreno, la estación (en verano mucho más), la humedad y el viento; la lluvia y la
// nieve lo apagan y el agua lo frena. Lo quemado queda como tierra calcinada que se recupera con los años
let fires = new Map(), burnt = new Map(), smoke = [], lastFireNotice = -1e9, wetT = null, simT = 0;
const raining = i => wetT && simT - wetT[i] < .5; // le ha llovido o nevado en el último medio segundo
const wetSoil = i => wetT && simT - wetT[i] < 25; // la tierra sigue húmeda un rato después de llover (los campos no se secan nada más parar)
const FUEL = { [B.DRY]:1, [B.PLAINS]:.8, [B.GRASS]:.7, [B.FOREST]:.75, [B.HILLS]:.55, [B.TUNDRA]:.2, [B.SWAMP]:.08 };
const SEASON_DRY = [.55, 1.35, .85, .25]; // primavera · verano · otoño · invierno
function fireRisk(i){
  const fuel = FUEL[world.biome[i]]; if (!fuel) return 0;
  if (snowA[i] > .15 || floodA[i] > .08 || world.lavaT[i] || raining(i)) return 0;
  const tree = world.objs[i] && (OBJ[world.objs[i].key][1] === 'tree' || (isBuilding(world.objs[i]) && wooden(world.objs[i])));
  return clamp(fuel * SEASON_DRY[seasonInfo().i] * (1.2 - Math.min(1, world.mp[i]) * .6) * (tree ? 1.3 : 1) * (burnt.has(i) ? .1 : 1) * (1 + droughtAt(i) * 1.5), 0, 2);
}
// Prende una casilla con cierta probabilidad (multiplicada por su riesgo)
function ignite(i, chance, lightning){
  // Un rayo puede prender aunque llueva (la lluvia lo apagará enseguida); el resto de fuegos, no
  const risk = lightning && raining(i) ? (wetT[i] = -1e9, fireRisk(i)) : fireRisk(i);
  if (fires.has(i) || fires.size > 260 || Math.random() > chance * risk) return false;
  const bo = world.objs[i], bld = isBuilding(bo) && !bo.burnt, tree = (bo && OBJ[bo.key][1] === 'tree') || bld;
  if (bld && !wooden(bo) && Math.random() > .15) return false; // la piedra casi no prende
  fires.set(i, { t:0, life:(bld ? 10 : tree ? 7 : 3.5) + Math.random() * 3, tree, bld });
  const t = performance.now();
  if (t - lastFireNotice > 20000) { lastFireNotice = t; notify('Se ha declarado un incendio', { x:(i % W) * T + 2, y:((i / W) | 0) * T + 3 }); }
  return true;
}
// Tras la ceniza, la tierra rebrota: la hierba vuelve y a veces sale un arbusto o un árbol joven de los que había alrededor
function regrow(i){
  if (world.graze) world.graze[i] = Math.min(world.graze[i], .3);
  if (world.objs[i] || WATER[world.biome[i]] || farmMap.has(i) || pathMap.has(i) || plazaSet.has(i)) return;
  const r0 = Math.random(), x = i % W, y = (i / W) | 0;
  if (r0 < .22) { const table = treeTable(i), key = table && table.length ? fromTable(table, rollTier(Math.random, false)) : null; if (key && placeObject(i, key, Math.random, yearT, .5)) composeRegion(x - 7, y - 11, x + 7, y + 12); }
  else if (r0 < .3 && (FERTILE[world.biome[i]] || 0) > .3) { if (placeObjectRaw(i, 'bush:red', Math.random)) composeRegion(x - 7, y - 11, x + 7, y + 12); }
}
function updateFires(dt){
  simT += dt;
  for (const [i, b] of burnt) {
    const age = b + dt;
    if (age > YEAR * .7) { burnt.delete(i); burntDirty = true; regrow(i); } else burnt.set(i, age);
  }
  for (const p of smoke) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 1.6; }
  if (smoke.length) smoke = smoke.filter(p => p.life < p.max);
  if (!fires.size) return;
  for (const [i, f] of [...fires]) {
    f.t += dt;
    const x = i % W, y = (i / W) | 0;
    // La lluvia o la nieve que caen encima lo apagan en un par de segundos (y entonces ya no se propaga)
    if (raining(i) || floodA[i] > .05 || snowA[i] > .1) { f.t += dt * 4; f.wet = true; }
    // Se propaga a las vecinas, más a favor del viento
    const [wx, wy] = windAt(x * T, y * T), ws = Math.hypot(wx, wy) || 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const down = 1 + Math.max(0, (dx * wx + dy * wy) / ws) * 1.4;
      if (!f.wet && !f.ctrl) ignite(ny * W + nx, dt * .032 * down * (f.tree ? 1.4 : 1) * (dx && dy ? .7 : 1));
    }
    if (smoke.length < 450 && Math.random() < dt * (f.tree ? 5 : 2.5) * Math.min(1, 120 / fires.size)) smoke.push({ x:x * T + Math.random() * T, y:y * T - (f.tree ? 22 : 1), vx:wx * .8, vy:-6 - Math.random() * 6, r:1, life:0, max:2 + Math.random() * 2.5 });
    // Los animales que están en la casilla huyen o se queman
    for (const a of animals) if (!a.dead && Math.floor(a.x / T) === x && Math.floor(a.y / T) === y && Math.random() < dt * .8) killAnimal(a, 'fuego');
    if (f.t >= f.life) {
      fires.delete(i);
      if (f.bld && world.objs[i] && isBuilding(world.objs[i])) { // el edificio queda chamuscado (o, si era de piedra, dañado)
        const o = world.objs[i], g = villageById(o.vid);
        if (wooden(o)) { o.burnt = true; if (g) { notify(`En ${g.name} se ha quemado ${o.key.startsWith('house') ? 'una casa' : 'el ' + bldName(o)}: habrá que tirarla abajo`, { x:x * T, y:y * T }); misfortune(g, 'incendio'); } }
        else o.dmg = (o.dmg || 0) + .4;
        composeRegion(x - 8, y - 12, x + 8, y + 12); burnt.set(i, 0); burntDirty = true; continue;
      }
      if (world.objs[i] && OBJ[world.objs[i].key][1] !== 'tree') continue;
      if (world.objs[i]) uproot(i, x, y, true);
      burnt.set(i, 0); burntDirty = true;
      if (world.graze) world.graze[i] = 1; // la hierba tardará en volver
    }
  }
}
// Tierra calcinada: manchas negras y ceniza gris que se van aclarando hasta desaparecer
let burntCv = null, burntDirty = true, burntT = 0;
function drawBurnt(){
  if (!burnt.size) return;
  const now = performance.now();
  if (!burntCv || burntCv.width !== PW || burntCv.height !== PH) { burntCv = document.createElement('canvas'); burntCv.width = PW; burntCv.height = PH; burntDirty = true; }
  if (burntDirty || now - burntT > 4000) {
    burntDirty = false; burntT = now; const bc = burntCv.getContext('2d'); bc.clearRect(0, 0, PW, PH); paintBurnt(bc);
  }
  const [x0, y0, x1, y1] = visibleRect();
  vctx.drawImage(burntCv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function paintBurnt(ctx){
  for (const [i, age] of burnt) {
    const x = (i % W) * T, y = ((i / W) | 0) * T, k = 1 - age / (YEAR * .7);
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const hv = h2(x + px, y + py, 91); if (hv > .3 + k * .7) continue;
      ctx.fillStyle = hv < .1 ? `rgba(130,126,118,${.7 * k})` : `rgba(26,20,16,${.8 * k})`;
      ctx.fillRect(x + px, y + py, 1, 1);
    }
    // Bordes irregulares: algún píxel chamuscado fuera de la casilla
    if (k > .3) { ctx.fillStyle = `rgba(40,30,20,${.45 * k})`; ctx.fillRect(x - 1 + Math.floor(h2(i, 1, 3) * (T + 2)), y - 1, 1, 1); ctx.fillRect(x + T, y + Math.floor(h2(i, 2, 3) * T), 1, 1); }
  }
}
// Silueta negra de un sprite (el árbol carbonizado)
const charCache = new WeakMap();
function charred(os){
  let c = charCache.get(os); if (c) return c;
  c = document.createElement('canvas'); c.width = os.width; c.height = os.height;
  const x = c.getContext('2d'); x.drawImage(os, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#1e1610'; x.fillRect(0, 0, c.width, c.height);
  charCache.set(os, c); return c;
}
// Llamas de píxeles que parpadean (en los árboles, por toda la copa) y humo que se lleva el viento
function drawSmoke(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const p of smoke) {
    if (p.x < x0 - 10 || p.x > x1 + 10 || p.y < y0 - 10 || p.y > y1 + 10) continue;
    const a = (1 - p.life / p.max) * .45, s = Math.max(1, Math.round(p.r)), g = 70 + p.life * 25 | 0;
    vctx.fillStyle = `rgba(${g},${g},${g},${a})`;
    vctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
}
// Repinta los árboles y rocas cuya base está por delante (más abajo) de baseY: tapan lo que hay detrás
function redrawFront(l, r, top, baseY){
  if (!params.objects || zoom < WAVE_ZOOM) return; // (muy alejado, la gente es un punto: no hace falta repintar lo que tiene delante)
  const objs = world.objs;
  for (let ty = Math.max(0, Math.floor(baseY / T)); ty <= Math.min(H - 1, Math.floor((baseY + 80) / T)); ty++)
    for (let tx = Math.max(0, Math.floor((l - 66) / T)); tx <= Math.min(W - 1, Math.floor((r + 66) / T)); tx++) {
      const o = objs[ty * W + tx]; if (!o) continue;
      const os = objSprite(o), by = ty * T + 3 + o.oy;
      if (by <= baseY || o.key === 'quarry:cantera') continue;
      const ol = tx * T + 2 + o.ox - os.ax, ot = by - os.height + 1;
      if (ol > r || ol + os.width <= l || ot > baseY || by < top) continue;
      vctx.drawImage(os, ol, ot);
    }
}
// trees = false: fuego en la hierba (se pinta bajo los árboles) · true: árboles en llamas (tapados por lo de delante)
function drawFires(t, trees){
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const [i, f] of fires) {
    if (!!f.tree !== trees) continue;
    const x = (i % W) * T, y = ((i / W) | 0) * T;
    if (x < vx0 - 30 || x > vx1 + 30 || y < vy0 - 10 || y > vy1 + 60) continue;
    const p = Math.min(1, f.t * 2) * Math.min(1, (f.life - f.t) * .8);
    // Zona que arde: la casilla, o toda la copa si es un árbol (que además se va ennegreciendo)
    let bx = x, by = y + T - 1, bw = T, bh = 1, tall = 5, n = 4;
    const o = world.objs[i];
    if (f.tree && o && params.objects) {
      const os = objSprite(o), base = y + 3 + o.oy;
      bx = x + 2 + o.ox - os.ax; bw = os.width; bh = Math.round(os.height * .8); by = base - Math.round(os.height * .15);
      tall = 7; n = Math.round(6 + bw * bh / 40);
      const char = Math.min(1, f.t / f.life * 1.6);
      vctx.globalAlpha = char * .75; vctx.drawImage(charred(os), bx, base - os.height + 1); vctx.globalAlpha = 1;
    }
    vctx.fillStyle = `rgba(255,120,40,${.16 * p})`; vctx.fillRect(bx - 1, by - bh - 2, bw + 2, bh + 3);
    for (let k = 0; k < n; k++) {
      const ph = (t / 260 + k * .37 + h2(i, k, 5)) % 1, fx = bx + Math.floor(h2(i, k, 7) * bw), h = Math.max(1, Math.round(tall * p * (.4 + .6 * h2(i, k, 9)) * (1 - ph * .5)));
      const fy = by - Math.floor(h2(i, k, 11) * bh);
      for (let s = 0; s < h; s++) {
        const r = s / h;
        vctx.fillStyle = r < .3 ? '#fff0a0' : r < .6 ? '#ffb030' : r < .85 ? '#f06020' : 'rgba(200,40,20,.8)';
        vctx.fillRect(fx + (s > 1 && ((t / 90 + k + s) | 0) % 3 === 0 ? 1 : 0), fy - s, 1, 1);
      }
    }
    if (trees) redrawFront(bx - 1, bx + bw + 1, by - bh - tall - 2, y + 3 + (o ? o.oy : 0));
  }
}

// ================= Tormentas de arena =================
// Donde el viento sopla muy fuerte sobre desierto, arena, sabana seca o tierra en sequía (y no llueve)
// se levanta una tormenta de arena: una nube de polvo ocre que avanza con el viento, crece mientras pasa
// por terreno seco y se deshace al salir de él. Dentro, los animales tienen más sed
let sandstorms = [], sandClock = 0;
const SAND_WIND = 16;
const dusty = i => world.biome[i] === B.DESERT || world.biome[i] === B.SAND || world.biome[i] === B.DRY || (!WATER[world.biome[i]] && droughtAt(i) > .5);
// Ruido suave (interpolado) para dar forma a la nube
function vnoise(x, y, s){
  const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy;
  return (h2(ix, iy, s) * (1 - u) + h2(ix + 1, iy, s) * u) * (1 - v) + (h2(ix, iy + 1, s) * (1 - u) + h2(ix + 1, iy + 1, s) * u) * v;
}
// Sprite de polvo en píxeles: más denso en el centro, borde deshilachado y tres tonos de arena
function dustSprite(R, seed){
  const w = Math.ceil(R * 2), h = Math.ceil(R * 1.5), c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), img = x.createImageData(w, h), D = img.data, tones = [[186,140,88], [160,114,70], [132,92,58]]; // ocres más oscuros que la arena del suelo, para que se distinga
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const dx = (px - w / 2) / R, dy = (py - h / 2) / (R * .75), d = Math.hypot(dx, dy), n = vnoise(px / 9, py / 9, seed);
    const dens = (1 - d) * 1.5 + (n - .5) * .9;
    if (dens < h2(px, py, seed + 1)) continue;
    const t = tones[n > .62 ? 0 : n > .4 ? 1 : 2], o = (py * w + px) * 4;
    D[o] = t[0]; D[o + 1] = t[1]; D[o + 2] = t[2]; D[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
function updateSandstorms(dt){
  if (!world.baseT) return;
  sandClock += dt;
  if (sandClock > 1.5) {
    sandClock = 0;
    for (let k = 0; k < 40 && sandstorms.length < 4; k++) {
      const i = Math.floor(Math.random() * N); if (!dusty(i) || raining(i) || snowA[i] > .1) continue;
      const x = (i % W) * T, y = ((i / W) | 0) * T, [wx, wy] = windAt(x, y);
      if (Math.hypot(wx, wy) < SAND_WIND || Math.random() > .22 * disasterF()) continue;
      const R = 70 + Math.random() * 80, seed = 90 + (Math.random() * 1000 | 0);
      sandstorms.push({ x, y, R, r:.3, age:0, life:40 + Math.random() * 40, seed, spr:dustSprite(R, seed), spr2:dustSprite(R * .8, seed + 7) });
      notify('Se ha levantado una tormenta de arena', { x, y });
      break;
    }
  }
  for (const s of sandstorms) {
    s.age += dt;
    const [wx, wy] = windAt(s.x, s.y); s.x += wx * dt * 1.4; s.y += wy * dt * 1.4;
    const i = clamp(Math.floor(s.y / T), 0, H - 1) * W + clamp(Math.floor(s.x / T), 0, W - 1);
    // Crece sobre terreno seco con viento fuerte; sobre agua, bosque, lluvia o con poco viento se deshace
    const feed = dusty(i) && !raining(i) && Math.hypot(wx, wy) > SAND_WIND * .6;
    s.r = clamp(s.r + (feed ? .12 : -.18) * dt, 0, 1);
    s.p = Math.min(1, s.age / 3, (s.life - s.age) / 5) * s.r;
    for (const a of animals) if (!a.dead && Math.hypot(a.x - s.x, (a.y - s.y) / .75) < s.R * s.r) a.water = Math.max(0, a.water - dt * .02);
    // Los pueblos que pilla: la gente se resguarda (y bebe más), el polvo ensucia los pozos y entierra un poco los campos
    if ((s.hitT = (s.hitT || 0) - dt) <= 0 && s.p > .3) { s.hitT = 2; const RR = s.R * s.r;
      for (const g of villages) { if (!popOf(g) || Math.hypot(g.fx * T - s.x, (g.fy * T - s.y) / .75) > RR + 30) continue;
        if (!(s.hit ||= []).includes(g.id)) { s.hit.push(g.id); notify(`Una tormenta de arena azota ${g.name}: la gente se resguarda en casa hasta que pase`, { x:g.fx * T, y:g.fy * T }); }
        for (const w of wellsOf(g)) if (Math.hypot((w.i % W) * T - s.x, ((w.i / W) | 0) * T - s.y) < RR) w.q = Math.max(0, w.q - .03);
        for (const [fi, f] of farmMap) if (f.vid === g.id && f.g > 0 && Math.random() < .15 && Math.hypot((fi % W) * T - s.x, ((fi / W) | 0) * T - s.y) < RR) f.g = Math.max(0, f.g - .1);
      }
      for (const v of villagers) {
        if (v.dead || v.away || v.boat || v.sandS === s.seed || Math.hypot(v.x - s.x, (v.y - s.y) / .75) > RR) continue;
        v.water = Math.max(0, v.water - .03); const g = villageById(v.vid);
        if (!g || (v.task && ['refugio', 'asalto', 'beber'].includes(v.task.k)) || warmthAt(v, g) > 0) continue;
        const t2 = shelterTarget(v, g, false); if (t2) { v.sandS = s.seed; releaseTask(v); if (v.actT > 0) { v.actT = 0; v.onDone = null; } v.task = t2; v.lastD = Infinity; }
      }
    }
  }
  if (sandstorms.length) sandstorms = sandstorms.filter(s => s.age < s.life && (s.r > .05 || s.age < 3) && s.x > -200 && s.y > -200 && s.x < PW + 200 && s.y < PH + 200);
}
// Dos capas de polvo que se deslizan en el sentido del viento y granos sueltos que vuelan por delante
function drawSandstorms(t){
  const [x0, y0, x1, y1] = visibleRect(), ts = t / 1000;
  for (const s of sandstorms) {
    const R = s.R * Math.max(.3, s.r);
    if (s.x + R < x0 || s.x - R > x1 || s.y + R < y0 || s.y - R > y1 || s.p < .02) continue;
    const [wx, wy] = windAt(s.x, s.y), wl = Math.hypot(wx, wy) || 1, ux = wx / wl, uy = wy / wl;
    const sc = Math.max(.3, s.r), drift = Math.sin(ts * .8 + s.seed) * 3;
    const veil = vctx.createRadialGradient(s.x, s.y, R * .2, s.x, s.y, R * 1.35); veil.addColorStop(0, `rgba(150,104,58,${.42 * s.p})`); veil.addColorStop(1, 'rgba(150,104,58,0)');
    vctx.fillStyle = veil; vctx.beginPath(); vctx.ellipse(s.x, s.y, R * 1.35, R * 1.0, 0, 0, Math.PI * 2); vctx.fill(); // el velo de polvo
    vctx.globalAlpha = .72 * s.p;
    vctx.drawImage(s.spr, Math.round(s.x - s.spr.width * sc / 2 + ux * drift), Math.round(s.y - s.spr.height * sc / 2 + uy * drift), Math.round(s.spr.width * sc), Math.round(s.spr.height * sc));
    vctx.globalAlpha = .5 * s.p;
    const off = ((ts * 6) % 12) - 6;
    vctx.drawImage(s.spr2, Math.round(s.x - s.spr2.width * sc / 2 + ux * off), Math.round(s.y - s.spr2.height * sc / 2 + uy * off), Math.round(s.spr2.width * sc), Math.round(s.spr2.height * sc));
    vctx.globalAlpha = 1;
    const n = Math.round(R * R * .03 * s.p * Math.min(1, .3 + zoom * .5));
    for (let k = 0; k < n; k++) {
      const a = h2(k, s.seed, 81) * 6.28, d = Math.sqrt(h2(k, s.seed, 82)) * R, ph = (ts * (.5 + h2(k, s.seed, 84) * .6) + h2(k, s.seed, 85)) % 1;
      const px = s.x + Math.cos(a) * d + ux * (ph - .5) * R, py = s.y + Math.sin(a) * d * .75 + uy * (ph - .5) * R;
      vctx.fillStyle = k % 3 ? `rgba(236,212,160,${.85 * s.p * (1 - Math.abs(ph - .5) * 2)})` : `rgba(110,74,44,${.75 * s.p})`;
      vctx.fillRect(Math.round(px), Math.round(py), Math.abs(ux) > .5 ? 2 : 1, Math.abs(ux) > .5 ? 1 : 2);
    }
  }
}
// Animales y árboles muertos: caen de lado (girando sobre su base) y se desvanecen en unas décimas de segundo.
// Los árboles caen más despacio
let corpses = [];
function addCorpse(spr, x, y, slow, stay = 0){ corpses.push({ spr, x, y, side:Math.random() < .5 ? -1 : 1, born:performance.now(), k:slow ? 2.2 : 1, stay }); } // stay: segundos que queda en el suelo (los caídos en la guerra)
function fallObj(i, burnt){
  const o = world.objs[i]; if (!o || OBJ[o.key][1] !== 'tree') return false;
  const os = objSprite(o), spr = burnt ? Object.assign(charred(os), { ax:os.ax }) : os;
  addCorpse(spr, (i % W) * T + 2 + o.ox, ((i / W) | 0) * T + 3 + o.oy, true);
  return true;
}
// ---- Torbellinos en el mar: giran, arrastran barcas y flotas hacia el centro y pueden hundirlas ----
let whirls = [];
const seaOK = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) return false; const b = world.biome[ty * W + tx]; return b === B.DEEP || b === B.SEA; };
function openSeaAround(x, y, r){ for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; if (!seaOK(x + Math.cos(an) * r, y + Math.sin(an) * r)) return false; } return seaOK(x, y); }
function addWhirl(x, y, natural){
  if (whirls.length >= 4) return null;
  const r = 14 + Math.pow(Math.random(), 1.5) * 22;
  if (!openSeaAround(x, y, r * .8)) return null;
  const w = { x, y, r, age:0, life:45 + Math.random() * 50, dir:Math.random() < .5 ? 1 : -1, seed:Math.random() * 100, sunk:0 };
  whirls.push(w);
  if (natural) notify(r > 28 ? 'Se ha abierto un gran torbellino en el mar' : 'Se ha formado un torbellino en el mar', { x, y });
  return w;
}
const whirlPower = w => clamp(Math.min(w.age / 4, (w.life - w.age) / 6), 0, 1);
// Gira algo que flota alrededor del torbellino; devuelve la distancia al centro (en fracción del radio)
function whirlPull(w, o, dt, k){
  const dx = o.x - w.x, dy = o.y - w.y, d = Math.hypot(dx, dy) || 1, reach = w.r * 1.8;
  if (d > reach) return 9;
  const f = (1 - d / reach) * w.r * 1.4 * whirlPower(w) * dt * k, nx = o.x + (-dy / d * w.dir - dx / d * .45) * f, ny = o.y + (dx / d * w.dir - dy / d * .45) * f;
  if (surfaceWater(nx, ny)) { o.x = nx; o.y = ny; }
  return d / w.r;
}
function updateWhirls(dt){
  if (!world) return;
  // Nacen solos en mar abierto, más con temporal
  if (whirls.length < 3 && Math.random() < dt * .003 * disasterF() * (storms.some(s => s.type === 'huracan') ? 4 : 1)) {
    for (let k = 0; k < 30; k++) { const i = Math.floor(Math.random() * N); if (world.biome[i] !== B.DEEP && world.biome[i] !== B.SEA) continue; if (addWhirl((i % W) * T + 2, ((i / W) | 0) * T + 2, true)) break; }
  }
  for (const w of whirls) {
    w.age += dt; const p = whirlPower(w);
    // Barcas de pesca
    for (const v of villagers) {
      if (v.dead || !v.boat) continue;
      const d = whirlPull(w, v, dt, 1);
      if (d < .3 && p > .5 && Math.random() < dt * .5) {
        const g = villageById(v.vid); w.sunk++;
        notify(`El torbellino se traga la barca de ${v.name}${g ? ' de ' + g.name : ''}`, { x:v.x, y:v.y });
        addEffect(v.x, v.y, 'poof'); killVillager(v, 'remolino');
      }
    }
    // Flotas y barcos de comercio
    for (const t of travelers) {
      if (!t.sea || t.gone) continue;
      const d = whirlPull(w, t, dt, .7);
      if (d < .35 && p > .5 && !t.whirlHit && t.kind === 'flota') {
        t.whirlHit = true; w.sunk++;
        const crew = t.crew.filter(u => u && !u.dead), lost = crew.slice(0, Math.max(1, Math.ceil(crew.length / 2)));
        for (const u of lost) { u.away = false; killVillager(u, 'remolino'); }
        const g = villageById(t.from);
        notify(`Un torbellino atrapa la flota${g ? ' de ' + g.name : ''}: ${lost.length} ${lost.length === 1 ? 'ahogado' : 'ahogados'}`, { x:t.x, y:t.y });
      }
    }
    if (onScreen(w.x, w.y) && Math.random() < dt * .05) snd('thunder', w.x, w.y);
  }
  if (whirls.length) whirls = whirls.filter(w => w.age < w.life && seaOK(w.x, w.y)); // (un mundo nuevo se los lleva)
}
function drawWhirls(t){
  if (!whirls.length) return;
  const [x0, y0, x1, y1] = visibleRect(), ts = t / 1000;
  for (const w of whirls) {
    const R = w.r, p = whirlPower(w);
    if (w.x + R * 1.4 < x0 || w.x - R * 1.4 > x1 || w.y + R < y0 || w.y - R > y1) continue;
    // Hondonada oscura que se estrecha hacia el centro
    for (let k = 4; k >= 1; k--) { vctx.fillStyle = `rgba(6,20,48,${.13 * p})`; vctx.beginPath(); vctx.ellipse(w.x, w.y, R * k / 4, R * k / 4 * .8, 0, 0, Math.PI * 2); vctx.fill(); }
    // Brazos de espuma en espiral que giran
    const spin = ts * (1.6 + 30 / R) * w.dir;
    for (let arm = 0; arm < 4; arm++) for (let s = 0; s < 1; s += .45 / R) {
      const rr = R * (.1 + s * .95), an = spin + arm * 1.571 + s * 5.5 * w.dir, x = Math.round(w.x + Math.cos(an) * rr), y = Math.round(w.y + Math.sin(an) * rr * .8);
      if (h2(Math.floor(s * R * 2), arm, w.seed) < s * .45) continue; // la espuma se deshilacha hacia fuera
      const a = p * (1 - s * .75);
      vctx.fillStyle = `rgba(${s < .4 ? '236,248,255' : '170,208,232'},${a})`; vctx.fillRect(x, y, s < .55 ? 2 : 1, s < .3 ? 2 : 1);
    }
    vctx.strokeStyle = `rgba(200,228,246,${.25 * p})`; vctx.lineWidth = 1; vctx.beginPath(); vctx.ellipse(w.x, w.y, R * 1.05, R * .84, 0, 0, Math.PI * 2); vctx.stroke(); // borde de la corriente
    vctx.fillStyle = `rgba(2,8,22,${.7 * p})`; vctx.fillRect(Math.round(w.x) - 1, Math.round(w.y) - 1, 3, 2); // el ojo
  }
}
function drawCorpses(){
  const now = performance.now();
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const c of corpses) {
    c.t = (now - c.born) / 1000 / c.k;
    if (c.x < vx0 - 16 || c.x > vx1 + 16 || c.y < vy0 - 16 || c.y > vy1 + 16) continue;
    const e = Math.min(1, c.t / .22), fall = e * e, ang = fall * Math.PI / 2 * c.side, hold = .45 + (c.stay || 0), a = c.t < hold ? 1 : Math.max(0, 1 - (c.t - hold) / .45);
    if (c.stay && c.t > .2) { vctx.fillStyle = `rgba(120,10,10,${.55 * a})`; vctx.beginPath(); vctx.ellipse(c.x + c.side * 3, c.y, 3 + Math.min(2, c.t * .6), 1.4 + Math.min(1, c.t * .3), 0, 0, Math.PI * 2); vctx.fill(); } // el charco de sangre
    vctx.save();
    vctx.globalAlpha = a;
    vctx.translate(Math.round(c.x), Math.round(c.y));
    vctx.rotate(ang);
    vctx.drawImage(c.spr, -c.spr.ax, -c.spr.height + 1);
    vctx.restore();
    // Lo que tiene delante (árboles y rocas con la base más abajo) se repinta encima: cae por detrás de ellos
    const D = Math.max(c.spr.width, c.spr.height);
    if (zoom > 1.6 && c.t < .6) redrawFront(c.x - D, c.x + D, c.y - D, Math.round(c.y)); // (solo mientras cae)
  }
  if (corpses.length) corpses = corpses.filter(c => c.t < .9 + (c.stay || 0));
}

// ================= Meteoritos =================
// De vez en cuando (muy rara vez) cae un meteorito: baja del cielo en diagonal con una estela de fuego y su
// sombra crece en el suelo. Al chocar: destello, temblor, onda expansiva y escombros. Deja un cráter con el
// borde levantado (en el mar, hunde el fondo y puede levantar islotes en el borde y un tsunami).
// La onda mata a los animales y derriba árboles según la distancia, y prende la vegetación de alrededor
let meteors = [], blasts = [], meteorClock = 0;
const METEOR_WARN = 4; // segundos de aviso antes de que empiece a caer
function launchMeteor(x, y, size){
  size = size ?? .35 + Math.pow(Math.random(), 2.2) * .65; // casi todos pequeños, alguno enorme
  const ang = (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .4), R = 2 + size * 8;
  meteors.push({ x, y, size, R, blastR:R * 3.4, t:-METEOR_WARN, dur:1.6 + size * .8, dx:Math.sin(ang), dy:-Math.cos(ang) });
  notify(size > .7 ? '¡Se acerca un gran meteorito! Zona de impacto marcada' : '¡Se acerca un meteorito! Zona de impacto marcada', { x, y });
}
function updateMeteors(dt){
  if (!world.baseT) return;
  // Probabilidad pequeña (según la frecuencia de catástrofes del panel)
  meteorClock += dt;
  if (meteorClock > 5) { meteorClock = 0; if (Math.random() < .012 * disasterF()) launchMeteor(Math.random() * PW, Math.random() * PH); }
  for (const m of meteors) {
    m.t += dt;
    // Durante el aviso los animales de la zona huyen
    if (m.t < 0 && Math.random() < dt * 2) for (const a of animals) if (!a.dead && Math.hypot(a.x - m.x, a.y - m.y) < m.blastR * T * 1.3) { a.threat = { x:m.x, y:m.y, dead:false }; a.scanT = 2; }
    if (m.t >= m.dur && !m.hit) { m.hit = true; impact(m); }
  }
  if (meteors.length) meteors = meteors.filter(m => !m.hit);
  for (const b of blasts) {
    b.age += dt;
    // La onda expansiva funde la nieve y el hielo a medida que avanza (anillo a anillo, no todo de golpe)
    const front = (b.R + (b.blastR * 1.15 - b.R) * Math.min(1, b.age / b.life * 1.6)) / T, from = b.melted || 0;
    if (front > from) {
      const cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), Rf = Math.ceil(front);
      for (let dy = -Rf; dy <= Rf; dy++) for (let dx = -Rf; dx <= Rf; dx++) {
        const d = Math.hypot(dx, dy / .75); if (d > front || d < from - 1) continue;
        const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        if (snowA[i] > 0) { setSnow(i, 0); snowSet.delete(i); groundClear.push(i); }
        if (world.ice && world.ice[i] > 0) world.ice[i] = 0;
      }
      b.melted = front;
    }
    // Cuando aterrizan los escombros quedan las rocas, las piedras y los minerales alrededor del cráter
    if (b.drops && b.age > .9) {
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (const [i, key] of b.drops) {
        if (world.objs[i] || !placeObjectRaw(i, key, Math.random)) continue;
        const x = i % W, y = (i / W) | 0;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      if (x1 >= 0) { composeRegion(x0 - 7, y0 - 11, x1 + 7, y1 + 12); rareDirty = true; statsSoon(true); }
      b.drops = null;
    }
  }
  if (blasts.length) blasts = blasts.filter(b => b.age < b.life);
}
function impact(m){
  const { e, sea, lake, river, objs } = world, cx = Math.floor(m.x / T), cy = Math.floor(m.y / T);
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) return;
  const R = m.R, blastR = m.blastR, wet = surfaceWater(m.x, m.y), ci = cy * W + cx;
  snd('boom', m.x, m.y, m.size);
  const depth = .025 + m.size * .06, rim = .012 + m.size * .02;
  // Cráter: cuenco hundido y borde levantado; la tierra de alrededor queda removida (tierra y roca)
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  const Rr = Math.ceil(R * 1.5), meteorHits = [];
  for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = Math.hypot(dx, dy) + (h2(x, y, 95) - .5) * .8, i = y * W + x;
    if (d > R * 1.5) continue;
    if (d < R) e[i] -= depth * (1 - (d / R) * (d / R)) - rim * .2;
    else e[i] += rim * (1 - Math.abs(d - R * 1.2) / (R * .3));
    e[i] = clamp(e[i], 0, 1.3);
    river[i] = 0;
    if (d < R * 1.25) { if (isBuilding(objs[i])) meteorHits.push(i); else if (objs[i]) { fallObj(i, true); objs[i] = null; } world.scour[i] = 255; } // los edificios, más abajo (con la gente)
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  // En tierra, el fondo del cráter queda de roca fundida al rojo, que se enfría poco a poco hasta ser roca
  // volcánica; si el cráter es grande y la zona húmeda, alrededor de ese charco queda un lago
  const molten = !wet;
  if (!wet && R >= 4.5 && (world.mp[ci] > .45 || Math.random() < .35))
    for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(dx, dy); if (d < R * .7 && d > R * .45) lake[y * W + x] = 1;
    }
  for (let y = Math.max(0, y0 - 1); y <= Math.min(H - 1, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(W - 1, x1 + 1); x++) {
    const i = y * W + x;
    if (e[i] >= sea && !lake[i] && Math.hypot(x - cx, y - cy) < R * 1.3) world.biome[i] = Math.hypot(x - cx, y - cy) < R ? B.DIRT : B.ROCK;
    else world.biome[i] = classify(i);
    if (WATER[world.biome[i]]) objs[i] = null;
  }
  if (molten) {
    const src = { x:m.x, y:m.y, id:0 }, now = performance.now(), Rm = R * (lake[ci] ? .45 : .62);
    for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x; if (Math.hypot(dx, dy) + (h2(x, y, 101) - .5) > Rm || lake[i]) continue;
      world.lavaT[i] = 1; world.volc[i] = 3; world.vid[i] = 0;
      world.lavaTiles.set(i, { born:now, v:src, cool:45 + m.size * 40 + Math.random() * 15 });
      world.biome[i] = classify(i);
    }
  }
  paintRegion(x0 - 2, y0 - 2, x1 + 2, y1 + 2);
  // Onda expansiva: derriba árboles, mata animales (seguro en el centro, cada vez menos lejos) y prende fuego
  const B2 = Math.ceil(blastR);
  for (let dy = -B2; dy <= B2; dy++) for (let dx = -B2; dx <= B2; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = Math.hypot(dx, dy); if (d > blastR || d < R) continue;
    const i = y * W + x, f = 1 - (d - R) / (blastR - R);
    if (objs[i] && OBJ[objs[i].key][1] === 'tree' && Math.random() < f * .9) { fallObj(i, f > .7); objs[i] = null; }
    if (!WATER[world.biome[i]] && world.biome[i] !== B.LAVA && Math.random() < f * f) { burnt.set(i, 0); burntDirty = true; } // solo se calcina la tierra
    ignite(i, f * 1.6); // el agua no arde: ahí no prende
  }
  composeRegion(cx - B2 - 7, cy - B2 - 11, cx + B2 + 7, cy + B2 + 12);
  for (const a of animals) {
    if (a.dead) continue;
    const d = Math.hypot(a.x - m.x, a.y - m.y) / T;
    if (d < R * 1.1 || (d < blastR && Math.random() < 1 - (d - R) / (blastR - R))) killAnimal(a, 'meteorito');
    else if (d < blastR * 1.6) { a.threat = { x:m.x, y:m.y, dead:false }; a.scanT = 3; } // huyen del lugar
  }
  // Edificios y gente: en el cráter no queda nada; en la onda expansiva, cuanto más cerca, más daño (un solo aviso)
  meteorVictims(m, cx, cy, R, blastR, meteorHits);
  for (const v of villagers) if (!v.dead && Math.hypot(v.x - m.x, v.y - m.y) / T < R * 1.1) { v.path = null; v.wait = 1; }
  if (wet && m.size > .45) { const ts = makeTsunami(m.x, m.y, 5.6 + m.size * 2.2); if (ts) tsunamis.push(ts); }
  shake = Math.max(shake, 3 + m.size * 9);
  if (!reduceMotion) flash = Math.max(flash, .15 + m.size * .25);
  // Lo que dejará al caer los escombros: rocas grandes junto al borde, piedras más lejos y a veces minerales
  const drops = [], tries = Math.round(10 + m.size * 40);
  for (let k = 0; k < tries; k++) {
    const a = Math.random() * Math.PI * 2, d = R * (1.05 + Math.pow(Math.random(), 1.4) * 1.3);
    const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .85);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const roll = Math.random();
    const key = roll < .06 * m.size ? (Math.random() < .25 * m.size ? (Math.random() < .3 ? 'gem:mana' : 'gem:amethyst') : Math.random() < .35 ? 'ore:gold' : 'ore:iron')
      : d < R * 1.5 ? (Math.random() < .55 ? 'big:stone' : 'rock:stone') : 'rock:stone';
    drops.push([y * W + x, key]);
  }
  blasts.push({ x:m.x, y:m.y, R:R * T, blastR:blastR * T, age:0, life:2.2, wet, drops });
  for (let k = 0; k < 60 * m.size + 15; k++) {
    const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60 * (.5 + m.size);
    debris.push({ x:m.x, y:m.y, z:2, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * .7, vz:30 + Math.random() * 60, life:0, big:Math.random() < .3,
      col:wet ? '210,230,245' : Math.random() < .5 ? '96,78,60' : '150,140,128' });
  }
  for (let k = 0; k < 10 + m.size * 30; k++) smoke.push({ x:m.x + (Math.random() - .5) * R * T, y:m.y + (Math.random() - .5) * R * T * .6, vx:(Math.random() - .5) * 8, vy:-4 - Math.random() * 8, r:2 + Math.random() * 3, life:0, max:3 + Math.random() * 4 });
  statsSoon(true);
  notify(wet ? (m.size > .45 ? '¡Ha caído un meteorito en el mar! Alerta de tsunami' : 'Ha caído un meteorito en el mar') : m.size > .7 ? '¡Ha caído un gran meteorito!' : 'Ha caído un meteorito', { x:m.x, y:m.y });
}
function meteorVictims(m, cx, cy, R, blastR, hits){
  const keep = notify; let down = 0, hurt = 0, dead = 0; const towns = new Set();
  notify = () => {}; // los derrumbes uno a uno no: al final, un solo aviso
  try {
    for (const i of hits) { const o = world.objs[i]; if (o && o.vid != null) towns.add(o.vid); if (damageBuilding(i, 9)) down++; if (world.objs[i]) world.objs[i] = null; }
    const B2 = Math.ceil(blastR);
    for (let dy = -B2; dy <= B2; dy++) for (let dx = -B2; dx <= B2; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(dx, dy), i = y * W + x, o = world.objs[i]; if (d > blastR || !isBuilding(o)) continue;
      const f = d < R * 1.25 ? 1 : 1 - (d - R) / (blastR - R); if (o.vid != null) towns.add(o.vid);
      if (damageBuilding(i, d < R * 1.6 ? 9 : f * 1.5 + Math.random() * .3)) { if (!world.objs[i]) down++; else hurt++; }
    }
    for (const v of villagers) {
      if (v.dead || v.away || v.boat) continue;
      const d = Math.hypot(v.x - m.x, v.y - m.y) / T; if (d > blastR) continue;
      const f = d < R * 1.2 ? 1 : 1 - (d - R) / (blastR - R);
      if (d < R * 1.2 || Math.random() < f * .75) { killVillager(v, 'meteorito'); dead++; towns.add(v.vid); }
      else { v.hp = Math.max(.1, (v.hp ?? 1) - f * .8); v.path = null; v.wait = .5; }
    }
  } finally { notify = keep; }
  for (const id of towns) { const g = villageById(id); if (g && popOf(g) !== undefined) misfortune(g, 'meteorito'); }
  if (dead || down || hurt) {
    const names = [...towns].map(villageById).filter(g => g).map(g => g.name);
    notify(`¡El meteorito arrasa${names.length ? ' ' + names.slice(0, 2).join(' y ') : ' la zona'}! ${[dead && `${dead} muerto${dead > 1 ? 's' : ''}`, down && `${down} edificio${down > 1 ? 's' : ''} derrumbado${down > 1 ? 's' : ''}`, hurt && `${hurt} dañado${hurt > 1 ? 's' : ''}`].filter(Boolean).join(', ')}`, { x:m.x, y:m.y });
  }
}
// La roca en llamas bajando con su estela y la sombra en el suelo; después, la onda expansiva
function drawMeteors(t){
  // Con el mapa alejado todo se agranda (k): la zona, la roca y la estela se ven a cualquier zoom
  const k = Math.max(1, 1.6 / zoom), px = Math.max(1, Math.round(k));
  for (const m of meteors) {
    // Zona de impacto: área del cráter y de la onda sombreadas en rojo, anillos que laten y cruz en el centro
    const pulse = .55 + .45 * Math.sin(t / 160), za = Math.min(1, (m.t + METEOR_WARN) * 2);
    const Rc = m.R * T, Rb = m.blastR * T;
    vctx.fillStyle = `rgba(235,60,40,${.13 * za})`; vctx.beginPath(); vctx.ellipse(m.x, m.y, Rb, Rb * .75, 0, 0, Math.PI * 2); vctx.fill();
    vctx.fillStyle = `rgba(235,60,40,${(.2 + .18 * pulse) * za})`; vctx.beginPath(); vctx.ellipse(m.x, m.y, Rc, Rc * .75, 0, 0, Math.PI * 2); vctx.fill();
    const ring = (rad, step, a) => {
      const n = Math.max(16, Math.round(rad * .8 / k));
      vctx.fillStyle = `rgba(235,60,40,${a})`;
      for (let q = 0; q < n; q += step) { const g = q / n * Math.PI * 2; vctx.fillRect(Math.round(m.x + Math.cos(g) * rad - px), Math.round(m.y + Math.sin(g) * rad * .75 - px / 2), px * 2, px); }
    };
    ring(Rc, 1, .9 * pulse * za);
    ring(Rb, 3, .7 * pulse * za);
    vctx.fillStyle = `rgba(255,80,50,${.95 * za})`;
    vctx.fillRect(Math.round(m.x - 4 * px), Math.round(m.y), 9 * px, px); vctx.fillRect(Math.round(m.x), Math.round(m.y - 3 * px), px, 7 * px);
    if (m.t < 0) continue; // aún no ha empezado a caer
    const p = Math.min(1, m.t / m.dur), H0 = (260 + m.size * 120) * k, h = H0 * (1 - p);
    const x = m.x + m.dx * h * .7, y = m.y + m.dy * h;
    // La roca es tan grande como el impacto que va a causar (un tercio del radio del cráter)
    const r = Math.max(Math.round((1 + m.size * 3) * k), Math.round(Rc * .3));
    // Sombra que crece
    vctx.fillStyle = `rgba(0,0,0,${.15 + p * .3})`;
    vctx.fillRect(Math.round(m.x - r * p * 2), Math.round(m.y - r * p * .7), Math.round(r * p * 4) + 1, Math.max(1, Math.round(r * p * 1.4)));
    // Estela detrás de la roca (por donde viene): blanca y amarilla junto a ella, roja después y humo al final
    const len = (18 + m.size * 30) * k;
    for (let q2 = 0; q2 < len; q2 += px) {
      const q = q2 / len, tx = x + m.dx * q2 * .7, ty = y + m.dy * q2, wob = (h2(q2 | 0, t / 60 | 0, 96) - .5) * (1 + q * 3) * (r + 1);
      vctx.fillStyle = q < .15 ? '#fff4c0' : q < .4 ? `rgba(255,190,70,${1 - q})` : q < .7 ? `rgba(240,110,40,${.8 - q})` : `rgba(120,110,100,${.5 * (1 - q)})`;
      const w = Math.max(px, Math.round(r * (1 - q) * 1.4));
      vctx.fillRect(Math.round(tx + wob * Math.abs(m.dy) - w / 2), Math.round(ty + wob * Math.abs(m.dx) * .4 - w / 2), w, w);
    }
    // Halo caliente y roca redonda en píxeles: la cara que va por delante, al rojo vivo; el resto, roca oscura
    vctx.fillStyle = `rgba(255,150,60,${.25 + .1 * Math.sin(t / 40)})`; vctx.beginPath(); vctx.arc(x, y, r * 1.8, 0, Math.PI * 2); vctx.fill();
    const cell = Math.max(1, Math.round(r / 6));
    for (let yy = -r; yy <= r; yy += cell) for (let xx = -r; xx <= r; xx += cell) {
      const d = Math.hypot(xx, yy) / r; if (d > 1 + (h2(xx, yy, 98) - .5) * .25) continue;
      const front = -(xx * m.dx * .7 + yy * m.dy) / r; // >0 en el lado hacia donde avanza (abajo)
      vctx.fillStyle = front > .45 ? '#fff0b0' : front > .1 ? '#ffb040' : front > -.25 ? '#c8502a' : h2(xx, yy, 99) > .5 ? '#4a3a30' : '#3a2c24';
      vctx.fillRect(Math.round(x + xx), Math.round(y + yy), cell, cell);
    }
  }
  for (const b of blasts) {
    const p = b.age / b.life, ring = b.R + (b.blastR * 1.15 - b.R) * Math.min(1, p * 1.6), a = 1 - p;
    // Destello en el centro y anillo de la onda (en píxeles)
    if (p < .25) { vctx.fillStyle = `rgba(255,240,200,${(1 - p / .25) * .8})`; vctx.beginPath(); vctx.arc(b.x, b.y, b.R * (1 + p * 3), 0, Math.PI * 2); vctx.fill(); }
    vctx.fillStyle = b.wet ? `rgba(230,245,255,${a * .8})` : `rgba(255,220,170,${a * .7})`;
    const n = Math.round(ring * .9);
    for (let k = 0; k < n; k++) {
      const ang = k / n * Math.PI * 2, rr = ring + (h2(k, 1, 97) - .5) * 3;
      vctx.fillRect(Math.round(b.x + Math.cos(ang) * rr), Math.round(b.y + Math.sin(ang) * rr * .75), 2, 1);
    }
  }
}
