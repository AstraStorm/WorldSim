// World Sim · Herramientas del jugador, entrada, panel, pantalla de carga y oleaje
// ================= Pincel de dios =================
const TOOLS = [
  ['move','Mover'], ['raise','Elevar'], ['lower','Hundir'], ['land','Tierra'],
  ['water','Agua'], ['river','Río'], ['plant','Plantar'], ['cut','Talar'],
];
const brushRadius = () => SPAWN_TOOLS.has(params.tool) ? 0 : params.tool === 'river' ? Math.round(params.brush / 3) : params.brush;

function applyBrush(cx, cy){
  const R = brushRadius(), tool = params.tool, { e, lake, river, objs, sea } = world;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = Math.hypot(dx, dy); if (d > R + .5) continue;
    const i = y * W + x, f = 1 - d / (R + 1.5);
    switch (tool) {
      case 'raise': e[i] = Math.min(1.3, e[i] + .014 * f); lake[i] = 0; break;
      case 'lower': e[i] = Math.max(0, e[i] - .014 * f); break;
      case 'land':  if (e[i] < sea || lake[i]) { e[i] = Math.max(e[i], sea + .004); lake[i] = 0; } river[i] = 0; break;
      case 'water': e[i] = Math.min(e[i], sea - .03); lake[i] = 0; river[i] = 0; break;
      case 'river': if (e[i] >= sea && !lake[i]) { river[i] = 1; objs[i] = null; } break;
      case 'plant':
        if (!objs[i] && Math.random() < .35) {
          const key = fromTable(treeTable(i), rollTier(Math.random, false));
          if (key) placeObject(i, key, Math.random, yearT - .3 * YEAR); // lo plantado nace joven
        }
        break;
      case 'cut': objs[i] = null; break;
    }
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return;
  for (let y = Math.max(0, y0 - 1); y <= Math.min(H - 1, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(W - 1, x1 + 1); x++) {
    const i = y * W + x;
    world.biome[i] = classify(i);
    if (WATER[world.biome[i]]) objs[i] = null;
  }
  paintRegion(x0 - 2, y0 - 2, x1 + 2, y1 + 2);
  composeRegion(x0 - 7, y0 - 11, x1 + 7, y1 + 12);
  if (tool === 'plant' || tool === 'cut' || tool !== 'move') statsSoon(tool !== 'plant' && tool !== 'cut');
}

// ================= Entrada =================
const pts = new Map(); let pinch = null, painting = false, lastTile = null;
const toTile = (sx, sy) => [Math.floor((sx - offX) / zoom / T), Math.floor((sy - offY) / zoom / T)];
function strokeTo(sx, sy){
  const [tx, ty] = toTile(sx, sy);
  if (!lastTile) { applyBrush(tx, ty); lastTile = [tx, ty]; return; }
  const [lx, ly] = lastTile, steps = Math.max(Math.abs(tx - lx), Math.abs(ty - ly));
  const stride = Math.max(1, Math.floor(brushRadius() / 2));
  for (let s = stride; s <= steps; s += stride) applyBrush(Math.round(lx + (tx - lx) * s / steps), Math.round(ly + (ty - ly) * s / steps));
  if (steps === 0 && params.tool !== 'river' && params.tool !== 'land' && params.tool !== 'water') applyBrush(tx, ty);
  if (steps >= stride || steps === 0) lastTile = [tx, ty];
}
view.addEventListener('contextmenu', e => e.preventDefault());
view.addEventListener('pointerdown', e => {
  view.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, { x:e.offsetX, y:e.offsetY, sx:e.offsetX, sy:e.offsetY, pan:params.tool === 'move' || e.button !== 0, btn:e.button });
  if (pts.size === 2) { painting = false; const [a, b] = [...pts.values()]; pinch = { d:Math.hypot(a.x - b.x, a.y - b.y) || 1, z:zoom }; return; }
  if (busy) return;
  if (SPAWN_TOOLS.has(params.tool) && e.button === 0) { godClick(e.offsetX, e.offsetY); return; }
  if (params.tool !== 'move' && e.button === 0) { painting = true; lastTile = null; strokeTo(e.offsetX, e.offsetY); return; }
  const v = e.button === 0 ? villagerAt(e.offsetX, e.offsetY) : null;
  if (v) { setFollow(v); pts.get(e.pointerId).pan = false; return; }
  view.style.cursor = 'grabbing';
});
view.addEventListener('pointermove', e => {
  mouse = { x:e.offsetX, y:e.offsetY };
  const p = pts.get(e.pointerId);
  if (p) {
    if (pts.size === 2 && pinch) {
      p.x = e.offsetX; p.y = e.offsetY;
      const [a, b] = [...pts.values()];
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d);
    } else if (painting) strokeTo(e.offsetX, e.offsetY);
    else if (p.pan && (e.offsetX !== p.x || e.offsetY !== p.y)) { setFollow(null); offX += e.offsetX - p.x; offY += e.offsetY - p.y; }
    p.x = e.offsetX; p.y = e.offsetY;
  }
  inspect(e.offsetX, e.offsetY);
});
const endPtr = e => {
  const p0 = pts.get(e.pointerId);
  if (e.type === 'pointerup' && p0 && p0.pan && p0.btn === 0 && pts.size === 1 && params.tool === 'move' && Math.hypot(e.offsetX - p0.sx, e.offsetY - p0.sy) < (e.pointerType === 'touch' ? 12 : 5)) { // con el dedo, algo más de margen
    const bi = buildingAt(e.offsetX, e.offsetY); // ¿un edificio? su ficha (edificios.js)
    if (bi != null) selectBuilding(bi);
    else if (sportAt(e.offsetX, e.offsetY)) { const sg = sportAt(e.offsetX, e.offsetY); cardVid = sg.id; cardTab = 'deportes'; renderVillageCard(true); }
    else { if (selBld != null) selectBuilding(null); const g = villageAt(e.offsetX, e.offsetY); if (g) { cardVid = g.id; renderVillageCard(true); } }
  }
  pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { painting = false; lastTile = null; view.style.cursor = ''; } };
view.addEventListener('pointerup', endPtr);
view.addEventListener('pointercancel', endPtr);
view.addEventListener('pointerleave', () => { mouse = null; });
view.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, zoom * Math.exp(-e.deltaY * .0015)); }, { passive:false });
document.getElementById('zin').onclick = () => zoomAt(cw / 2, ch / 2, zoom * 1.5);
document.getElementById('zout').onclick = () => zoomAt(cw / 2, ch / 2, zoom / 1.5);
document.getElementById('zfit').onclick = fit;
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  const n = +e.key; if (n >= 1 && n <= TOOLS.length) setTool(TOOLS[n - 1][0]);
});

const hud = document.getElementById('hud');
function inspect(sx, sy){
  if (busy) return;
  const [tx, ty] = toTile(sx, sy);
  if (!world || tx < 0 || ty < 0 || tx >= W || ty >= H) { hud.textContent = 'Fuera del mapa'; return; }
  const i = ty * W + tx, { e, sea, biome } = world;
  const alt = e[i] >= sea ? Math.round((e[i] - sea) / (1 - sea) * 5200) : -Math.round((sea - e[i]) / sea * 4000);
  const o = world.objs[i];
  let obj = '';
  if (o) {
    const [n, , tier] = OBJ[o.key];
    obj = ` · <b style="color:${TIERS[tier].c}">${n}</b> <span style="color:${TIERS[tier].c}">(${TIERS[tier].n})</span>`;
    if (o.life) obj += ` · ${STAGE_NAMES[o.st] || ''}, vigor ${Math.round(o.vig * 100)} %`;
    const vg = o.vid && villageById(o.vid);
    if (vg) obj += ` · aldea <b>${vg.name}</b>: ${popOf(vg)} habitantes, comida ${Math.floor(vg.food)}, madera ${vg.wood}, piedra ${vg.stone}`;
    const C = o.life && treeClima(o);
    if (C && o.ad !== undefined) obj += ` · ${o.ad < -4 ? 'adaptado al frío' : o.ad > 4 ? 'adaptado al calor' : 'clima templado'} (${Math.round(C[1] + o.ad)} a ${Math.round(C[2] + o.ad)} °C)`;
  }
  const vi = world.vid[i];
  let vol = '';
  if (vi) {
    const v = world.volcanoes[vi - 1];
    vol = ` · Volcán ${v.kind === 'cono' ? 'de cono' : v.kind === 'escudo' ? 'en escudo' : 'de caldera'} (${v.state === 'erupcion' ? 'en erupción' : v.state === 'activo' ? 'activo' : 'dormido'})`;
  }
  const vv = villagerAt(sx, sy);
  if (vv) { hud.innerHTML = villagerInfo(vv); return; }
  const an = animalAt(sx, sy);
  if (an) { hud.innerHTML = animalInfo(an); return; }
  const fish = fishes.find(f => Math.hypot(f.x - (sx - offX) / zoom, f.y - (sy - offY) / zoom) < 8);
  const clim = ` · ${Math.round(tempAt(i))} °C${frozen(i) ? ' · <b style="color:#bfe3ff">Helado</b>' : ''}${dried(i) ? ' · <b style="color:#c8a060">Seco</b>' : ''}${!WATER[biome[i]] && droughtAt(i) > .35 ? ` · <b style="color:#e0a040">Sequía</b>` : ''}`;
  const fm = farmMap.get(i);
  if (fm) obj += ` · <b>Campo de ${villageById(fm.vid)?.name || '—'}</b>: ${fm.st}${fm.st === 'muerta' && fm.why ? ` (${fm.why})` : fm.st === 'creciendo' ? ` (${Math.round(fm.g * 100)} %)` : ''}`;
  hud.innerHTML = `<b>${BIOMES[biome[i]].n}</b> · ${alt} m${clim}${vol}${obj}${fish ? ` · <b>Banco de peces</b> (${Math.round(fish.stock * 100)} %)` : ''} · casilla ${tx},${ty}`;
}

// ================= Panel =================
const $ = id => document.getElementById(id);
function buildSeg(el, entries, key, onPick){
  el.innerHTML = entries.map(([k, n]) => `<button data-k="${k}" aria-pressed="${params[key] === k}">${n}</button>`).join('');
  el.onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    params[key] = b.dataset.k;
    el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    onPick();
  };
}
buildSeg($('sizeSeg'), Object.entries(SIZES).map(([k, v]) => [k, v[2]]), 'size', () => { syncOutputs(); regenerate(true); });
buildSeg($('typeSeg'), Object.entries(TYPES).map(([k, v]) => [k, v.n]), 'type', () => {
  params.water = TYPES[params.type].water; $('water').value = params.water; syncOutputs(); regenerate(true);
});
$('tools').innerHTML = TOOLS.map(([k, n], j) => `<button data-k="${k}" aria-pressed="${params.tool === k}">${n}<kbd>${j + 1}</kbd></button>`).join('');
$('tools').onclick = ev => { const b = ev.target.closest('button'); if (b) setTool(b.dataset.k); };
function setTool(k){
  params.tool = k;
  document.querySelectorAll('#tools button, #spawnMenu button').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === k));
  view.classList.toggle('paint', k !== 'move');
}
$('spawnMenu').onclick = ev => { const b = ev.target.closest('button'); if (b && b.dataset.k) setTool(params.tool === b.dataset.k ? 'move' : b.dataset.k); };
window.addEventListener('keydown', e => { if (e.key === 'Escape') setTool('move'); });

function syncOutputs(){
  const [w, h] = SIZES[params.size];
  $('sizeOut').textContent = `${w} × ${h} casillas`;
  $('waterOut').textContent = params.water + ' %';
  $('riversOut').textContent = params.rivers === 0 ? 'Ninguno' : params.rivers < 35 ? 'Pocos' : params.rivers < 70 ? 'Normales' : 'Muchos';
  $('humidOut').textContent = (params.humid > 0 ? '+' : '') + params.humid;
  $('densOut').textContent = params.dens + ' %';
  $('cloudOpOut').textContent = params.cloudOp + ' %';
  $('disastersOut').textContent = params.disasters === 0 ? 'Ninguna' : params.disasters < 40 ? 'Muy pocas' : params.disasters < 80 ? 'Pocas' : params.disasters < 130 ? 'Normales' : 'Muchas';
  $('brushOut').textContent = params.tool === 'river' ? `${brushRadius() * 2 + 1} (río)` : String(params.brush * 2 + 1);
}
function syncInputs(){
  $('seed').value = params.seed;
  for (const k of ['water', 'rivers', 'humid', 'dens', 'brush', 'cloudOp', 'disasters']) $(k).value = params[k];
  for (const k of ['relief', 'objects', 'markers', 'people', 'weather', 'pressure', 'plates', 'thermal', 'heightmap', 'windmap', 'zones']) $(k).checked = params[k];
  syncOutputs();
}

const findCursor = {};
function renderStats(){
  const { biome, objs } = world, counts = new Array(BIOMES.length).fill(0);
  const kc = { tree:0, berry:0, stone:0, mineral:0 }, tc = [0, 0, 0, 0, 0], keyc = {};
  for (let i = 0; i < N; i++) {
    counts[biome[i]]++;
    const o = objs[i]; if (!o) continue;
    const [, kind, tier] = OBJ[o.key];
    kc[kind]++; tc[tier]++; keyc[o.key] = (keyc[o.key] || 0) + 1;
  }
  const sw = c => `rgb(${c})`;
  $('bar').innerHTML = BIOMES.map((b, i) => counts[i] ? `<span style="width:${counts[i] / N * 100}%;background:${sw(b.c)}" title="${b.n}"></span>` : '').join('');
  $('legend').innerHTML = BIOMES.map((b, i) => counts[i] ? `<li><span class="sw" style="background:${sw(b.c)}"></span>${b.n}<span class="pc">${(counts[i] / N * 100).toFixed(1)}%</span></li>` : '').join('');
  $('res').innerHTML = Object.entries(KINDS).map(([k, [n, icon]]) => `<li><canvas class="ic" data-icon="${icon}" width="28" height="28"></canvas>${n}<span class="n">${kc[k].toLocaleString('es')}</span></li>`).join('');
  $('tiers').innerHTML = TIERS.map((t, j) => `<div><b style="color:${t.c}">${tc[j].toLocaleString('es')}</b>${t.n}</div>`).join('');
  const finds = Object.keys(OBJ).filter(k => OBJ[k][2] >= 2 && keyc[k]).sort((a, b) => OBJ[b][2] - OBJ[a][2]);
  $('finds').innerHTML = finds.length
    ? finds.map(k => `<button data-key="${k}" title="Ir a uno"><canvas class="ic" data-icon="${k}" width="28" height="28"></canvas><span style="color:${TIERS[OBJ[k][2]].c}">${OBJ[k][0]}</span><span class="n">×${keyc[k]}</span></button>`).join('')
    : '<p class="empty">Este mundo no tiene nada raro. Prueba otra semilla.</p>';
  document.querySelectorAll('canvas.ic[data-icon]').forEach(c => drawIcon(c, c.dataset.icon)); // los iconos de fauna se pintan aparte
}
let statsTimer = 0;
// (rendimiento) como mucho cada 2 s, y el oleaje solo se rehace si ha cambiado la costa (talar o picar no la cambia)
let coastDirty = false, statsLast = 0;
function statsSoon(coast){ if (coast) coastDirty = true; if (statsTimer) return; statsTimer = setTimeout(() => { statsTimer = 0; statsLast = performance.now(); if (busy) return; buildRareList(); renderStats(); if (coastDirty) { coastDirty = false; buildWaves(); } }, Math.max(250, 2000 - (performance.now() - statsLast))); }
$('finds').onclick = ev => {
  const b = ev.target.closest('button'); if (!b) return;
  const key = b.dataset.key, list = world.rare.filter(s => s.key === key); if (!list.length) return;
  findCursor[key] = ((findCursor[key] ?? -1) + 1) % list.length;
  const s = list[findCursor[key]];
  centerOn(s.px, s.py - s.h / 2, Math.max(zoom, 6));
};

// ================= Pantalla de carga =================
let busy = false, genToken = 0, loadingShown = true;
// Cede el control al navegador para que pinte la barra, sin esperar al siguiente fotograma
const nextFrame = () => new Promise(r => setTimeout(r, 0));
function setLoading(show, p, text, quiet){
  loadingShown = show;
  $('loading').classList.toggle('out', !show);
  $('loading').classList.toggle('quiet', !!quiet);
  if (p != null) $('loadFill').style.width = Math.round(p * 100) + '%';
  if (text) $('loadStep').textContent = text + '…';
}
// Planeta de píxeles que gira mientras se genera el mundo
function drawGlobe(t){
  const c = $('globe'), x = c.getContext('2d'), R = 14;
  x.clearRect(0, 0, 32, 32);
  for (let py = 0; py < 32; py++) for (let px = 0; px < 32; px++) {
    const nx = (px - 15.5) / R, ny = (py - 15.5) / R, r2 = nx * nx + ny * ny;
    if (r2 > 1.08) continue;
    if (r2 > 1) { x.fillStyle = '#0c1424'; x.fillRect(px, py, 1, 1); continue; }
    const z = Math.sqrt(1 - r2), lon = Math.atan2(nx, z) + t / 1400, lat = Math.asin(ny);
    const n = Math.sin(lon * 3 + Math.sin(lat * 4) * 1.2) * Math.cos(lat * 2.3 + 1) + Math.sin(lon * 5 + 2) * .4;
    const light = clamp(.55 - nx * .35 - ny * .35 + z * .25, .35, 1.1);
    const col = Math.abs(lat) > 1.15 ? [234,240,246] : n > .45 ? [64,128,50] : n > .25 ? [110,164,64] : n > .18 ? [221,198,128] : n > .05 ? [78,152,206] : [36,80,150];
    x.fillStyle = `rgb(${col[0] * light | 0},${col[1] * light | 0},${col[2] * light | 0})`;
    x.fillRect(px, py, 1, 1);
  }
}

// ================= Oleaje animado =================
// Una capa transparente encima del agua: olas que avanzan hacia la orilla y brillos en mar abierto
const waveCv = document.createElement('canvas'), wvctx = waveCv.getContext('2d');
let waveImg = null, coastK = null, coastD = null, coastPh = null, coastRow = null, glintK = null, glintPh = null, waveLast = 0, waveBand = 0;
let riverK = null, riverF = null, riverS = null, riverRow = null, lavaK = null, lavaV = null, lavaD = null, lavaL = null;
// El navegador puede vaciar los lienzos grandes cuando la pestaña pasa tiempo en segundo plano: se comprueba
// un píxel de tierra del terreno y, si está vacío, se repintan las capas
function layersAlive(){
  if (!world || busy) return true;
  for (let k = 0; k < 6; k++) { const i = Math.floor(Math.random() * N); if (tctx.getImageData((i % W) * T + 1, ((i / W) | 0) * T + 1, 1, 1).data[3] > 0) return true; }
  return false;
}
function restoreLayers(){ if (layersAlive()) return; repaintAll(); buildWaves(); burntDirty = true; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) restoreLayers(); });
for (const cv of [terrain, worldCv]) cv.addEventListener('contextrestored', () => { if (world) { repaintAll(); buildWaves(); burntDirty = true; } });
setInterval(restoreLayers, 3000);
function buildWaves(){
  const biome = world.biome, NP = PW * PH;
  // Solo se crea de nuevo si cambia el tamaño o es un mundo nuevo; si no, se borran las olas, corrientes y
  // lava de antes (pueden haber cambiado) y la nieve y los charcos ya pintados se quedan como están
  const fresh = !waveImg || waveImg.width !== PW || waveImg.height !== PH;
  if (fresh) { waveCv.width = PW; waveCv.height = PH; waveImg = wvctx.createImageData(PW, PH); }
  else { const D = waveImg.data; for (const A of [coastK, riverK, lavaK]) if (A) for (let n = 0; n < A.length; n++) D[A[n] * 4 + 3] = 0; }
  const sea = k => { const b = biome[pt[k]]; return b <= B.SHALLOW || b === B.LAKE; };
  const land = k => !WATER[biome[pt[k]]];
  const dist = new Uint8Array(NP), q = [];
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const k = py * PW + px;
    if (sea(k) && ((px > 0 && land(k - 1)) || (px < PW - 1 && land(k + 1)) || (py > 0 && land(k - PW)) || (py < PH - 1 && land(k + PW)))) { dist[k] = 1; q.push(k); }
  }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], d = dist[k]; if (d >= 10) continue;
    const px = k % PW;
    for (const j of [px > 0 ? k - 1 : -1, px < PW - 1 ? k + 1 : -1, k - PW, k + PW])
      if (j >= 0 && j < NP && !dist[j] && sea(j)) { dist[j] = d + 1; q.push(j); }
  }
  q.sort((a, b) => a - b);
  coastK = Int32Array.from(q); coastD = new Uint8Array(q.length); coastPh = new Float32Array(q.length);
  for (let n = 0; n < q.length; n++) {
    const k = q[n], px = k % PW, py = (k / PW) | 0;
    coastD[n] = dist[k];
    coastPh[n] = (Math.sin(px * .045) + Math.sin(py * .06 + 1.3)) * .25 + h2(px >> 3, py >> 3, 12) * .1;
  }
  coastRow = new Int32Array(PH + 1);
  for (let py = 0, n = 0; py <= PH; py++) { while (n < q.length && coastK[n] < py * PW) n++; coastRow[py] = n; }
  const gk = [], gp = [];
  for (let n = 0; n < NP / 600; n++) {
    const k = Math.floor(Math.random() * NP), b = biome[pt[k]];
    if ((b === B.SEA || b === B.DEEP) && !dist[k]) { gk.push(k); gp.push(Math.random()); }
  }
  glintK = Int32Array.from(gk); glintPh = Float32Array.from(gp);
  // Píxeles de río con la dirección de su corriente
  const rk = [], rf = [], rs = [], lk = [];
  for (let k = 0; k < NP; k++) {
    const ti = pt[k];
    if (biome[ti] === B.RIVER) { rk.push(k); rf.push(world.flow[ti]); rs.push(world.slope[ti]); }
    else if (biome[ti] === B.LAVA && world.vid[ti] && !world.lavaT[ti]) lk.push(k); // solo el cráter; las coladas van aparte
  }
  // Para cada píxel de lava: su volcán, la distancia al cráter (la lava fluye hacia fuera) y un carril para trocear los trazos
  lavaK = Int32Array.from(lk); lavaV = new Uint8Array(lk.length); lavaD = new Float32Array(lk.length); lavaL = new Int16Array(lk.length);
  for (let n = 0; n < lk.length; n++) {
    const k = lk[n], px = k % PW, py = (k / PW) | 0, v = world.volcanoes[world.vid[pt[k]] - 1];
    lavaV[n] = v.id; lavaD[n] = Math.hypot(px - v.x, py - v.y);
    lavaL[n] = Math.floor((Math.atan2(py - v.y, px - v.x) + Math.PI) * 6);
  }
  riverK = Int32Array.from(rk); riverF = Uint8Array.from(rf); riverS = Uint8Array.from(rs);
  riverRow = new Int32Array(PH + 1);
  for (let py = 0, n = 0; py <= PH; py++) { while (n < rk.length && riverK[n] < py * PW) n++; riverRow[py] = n; }
  waveLast = 0;
  // La capa se ha creado de nuevo (vacía): la nieve que ya había se tiene que volver a pintar entera
  if (snowA && fresh) for (const i of snowSet) snowDirty.add(i);
}
let vrOverride = null;
function visibleRect(){
  if (vrOverride) return vrOverride;
  return [clamp(Math.floor(-offX / zoom) - 2, 0, PW - 1), clamp(Math.floor(-offY / zoom) - 2, 0, PH - 1),
          clamp(Math.ceil((cw - offX) / zoom) + 2, 0, PW - 1), clamp(Math.ceil((ch - offY) / zoom) + 2, 0, PH - 1)];
}
let floodTick = 0;
function updateWaves(t){
  floodTick++;
  if (!coastK || reduceMotion || !cw) return;
  // Con mucho mapa a la vista se reparte el trabajo en franjas: cada fotograma se anima solo una franja
  // horizontal (y solo esa se copia al lienzo), así nunca se procesan millones de píxeles de golpe.
  // Con poco a la vista se anima todo cada fotograma (de cerca, sin saltos)
  const vr = visibleRect(), area = (vr[2] - vr[0] + 1) * (vr[3] - vr[1] + 1), bands = Math.min(10, Math.ceil(area / 5e5));
  if (t - waveLast < (bands === 1 && zoom < 2 ? 50 : 45)) return; // (rendimiento) unas 20 veces por segundo bastan: el agua se mueve despacio
  waveLast = t;
  waveBand = (waveBand + 1) % bands;
  const hb = Math.ceil((vr[3] - vr[1] + 1) / bands);
  const x0 = vr[0], x1 = vr[2], y0 = vr[1] + waveBand * hb, y1 = Math.min(vr[3], y0 + hb - 1);
  if (y0 > y1) return;
  const Dd = waveImg.data, ts = t / 1000;
  for (let n = coastRow[y0]; n < coastRow[y1 + 1]; n++) {
    const k = coastK[n], px = k % PW; if (px < x0 || px > x1) continue;
    const d = coastD[n], ph = ((ts / 2.6 + coastPh[n]) % 1 + 1) % 1;
    const crest = 10 - ph * 9.4, dd = Math.abs(d - crest);
    let a = dd < 1.1 ? Math.min(1, (1 - dd / 1.1) * (.65 + .4 * ph)) : 0;  // la ola se aclara al llegar a la orilla
    if (d <= 2) a = Math.max(a, (.3 + .3 * Math.sin(ts * 2.2 + coastPh[n] * 12)) * (d === 1 ? 1 : .6)); // resaca
    const o = k * 4; Dd[o] = 236; Dd[o + 1] = 248; Dd[o + 2] = 255; Dd[o + 3] = a * 255;
  }
  // Corriente de los ríos: trazos claros que bajan en el sentido del agua.
  // Donde hay pendiente van rápido y aparecen a menudo (rápidos); en llano van lentos y solo de vez en cuando.
  for (let n = riverRow[y0]; n < riverRow[y1 + 1]; n++) {
    const k = riverK[n], px = k % PW; if (px < x0 || px > x1) continue;
    const py = (k / PW) | 0, f = riverF[n], fx = Math.floor(f / 3) - 1, fy = f % 3 - 1, sl = riverS[n] / 255;
    const along = px * fx + py * fy, across = py * fx - px * fy, lane = Math.floor(across / 2);
    const speed = 4 + sl * 20, pos = (along - ts * speed) / 9 + h2(lane, 0, 13);
    const ph = (pos % 1 + 1) % 1, seg = Math.floor(pos);
    let a = 0;
    if (ph < .18) {
      // Cada trazo se enciende y apaga suavemente con su propio ritmo
      const w = Math.sin(ts * (.5 + h2(seg, lane, 16) * .6) + h2(seg, lane, 14) * 6.28);
      const vis = clamp((w - (.55 - sl * .7)) * 3, 0, 1);
      a = vis * (.3 + .4 * sl) * (1 - ph / .18);
    }
    const o = k * 4; Dd[o] = 205; Dd[o + 1] = 235; Dd[o + 2] = 252; Dd[o + 3] = a * 255;
  }
  if (iceSet.size) paintIce(Dd, x0, y0, x1, y1);
  if (drySet.size) paintDry(Dd, x0, y0, x1, y1);
  // Lava: si el volcán está caliente, trazos brillantes que fluyen desde el cráter hacia fuera;
  // si se enfría, se cubre de costra oscura con alguna grieta roja
  const lavaPx = (k, px, py, h, v, fade) => {
    const o = k * 4;
    if (h < .45) {
      const crack = h2(px, py, 24) > .9;
      Dd[o] = crack ? 180 : 56; Dd[o + 1] = crack ? 50 : 40; Dd[o + 2] = crack ? 22 : 36;
      Dd[o + 3] = (1 - h / .45) * (crack ? .55 : .92) * 255;
    } else {
      // Trazos que avanzan despacio desde el cráter hacia fuera
      const lane = Math.floor((Math.atan2(py - v.y, px - v.x) + Math.PI) * 6);
      const pos = (Math.hypot(px - v.x, py - v.y) - ts * (1.5 + h * 3)) / 7 + h2(lane, v.id, 25), ph = (pos % 1 + 1) % 1;
      Dd[o] = 255; Dd[o + 1] = 226; Dd[o + 2] = 120;
      Dd[o + 3] = (ph < .3 ? (1 - ph / .3) * (.3 + .5 * h) : 0) * fade * 255;
    }
  };
  // Cráteres: su temperatura es la del volcán
  for (let n = 0; n < lavaK.length; n++) {
    const k = lavaK[n], px = k % PW, py = (k / PW) | 0;
    if (px < x0 || px > x1 || py < y0 || py > y1) continue;
    const v = world.volcanoes[lavaV[n] - 1];
    lavaPx(k, px, py, v.heat, v, 1);
  }
  // Nieve y charcos en el suelo, píxel a píxel: la cantidad se interpola entre casillas vecinas,
  // así el borde queda difuminado y no se ve la cuadrícula
  if (snowA && (snowDirty.size || (floodSet.size && floodTick % 3 === 0) || groundClear.length)) {
    const amt = (A, x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : A[y * W + x];
    const lerp2 = (A, px, py) => {
      const fx = (px - 1.5) / T, fy = (py - 1.5) / T, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
      return (amt(A, ix, iy) * (1 - u) + amt(A, ix + 1, iy) * u) * (1 - v) + (amt(A, ix, iy + 1) * (1 - u) + amt(A, ix + 1, iy + 1) * u) * v;
    };
    const tiles = new Set();
    const addRing = i => { const cx = i % W, cy = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < W && y < H) tiles.add(y * W + x); } };
    // Solo las casillas de la franja que toca animar (con mucha nieve en invierno son decenas de miles)
    const inBand = i => { const tx = i % W, ty = (i / W) | 0; return (ty + 2) * T >= y0 && (ty - 1) * T <= y1 && (tx + 2) * T >= x0 && (tx - 1) * T <= x1; };
    // De la nieve solo se repintan las casillas que han cambiado (la nieve quieta ya está pintada)
    for (const i of snowDirty) if (inBand(i)) { addRing(i); snowDirty.delete(i); }
    if (floodTick % 3 === 0) for (const i of floodSet) if (inBand(i)) addRing(i); // (el brillo de los charcos, uno de cada tres fotogramas)
    const keep = [];
    for (const i of groundClear) { const gy = ((i / W) | 0) * T; if (gy + 2 * T >= y0 && gy - T <= y1) addRing(i); else keep.push(i); }
    groundClear = keep;
    for (const i of tiles) {
      const tx = i % W, ty = (i / W) | 0;
      if ((tx + 1) * T < x0 || tx * T > x1 || (ty + 1) * T < y0 || ty * T > y1) continue;
      for (let py = ty * T; py < ty * T + T; py++) for (let px = tx * T; px < tx * T + T; px++) {
        const k = py * PW + px, b = world.biome[pt[k]];
        if (WATER[b] || b === B.LAVA) continue; // esos píxeles ya los anima el agua o la lava
        const s = lerp2(snowA, px, py), f = lerp2(floodA, px, py), o = k * 4;
        if (s > .04 && h2(px, py, 41) < s * 1.15) {
          const L = (img.data[o] + img.data[o + 1] + img.data[o + 2]) / 3, f = clamp(.62 + L / 360, .82, 1.04); // sombreado del relieve de debajo
          Dd[o] = Math.min(255, 244 * f); Dd[o + 1] = Math.min(255, 247 * f); Dd[o + 2] = Math.min(255, 252 * f); Dd[o + 3] = 240;
        }
        else if (f > .1 && h2(px, py, 42) < f * 1.15) {
          const hi = h2(px, py, 43) > .86 + .08 * Math.sin(ts * 2 + px * .3);
          Dd[o] = hi ? 156 : 79; Dd[o + 1] = hi ? 200 : 143; Dd[o + 2] = hi ? 234 : 202; Dd[o + 3] = 185;
        } else Dd[o + 3] = 0;
      }
    }
  }
  // Fondo marino al descubierto cuando el mar se retira antes del tsunami: arena mojada con charcos
  for (const [i, v] of recede) {
    const tx = i % W, ty = (i / W) | 0;
    if ((tx + 1) * T < x0 || tx * T > x1 || (ty + 1) * T < y0 || ty * T > y1) continue;
    for (let py = ty * T; py < ty * T + T; py++) for (let px = tx * T; px < tx * T + T; px++) {
      const o = (py * PW + px) * 4, puddle = h2(px, py, 72) < .22;
      Dd[o] = puddle ? 96 : 150; Dd[o + 1] = puddle ? 146 : 128; Dd[o + 2] = puddle ? 180 : 92; Dd[o + 3] = Math.min(1, v * 1.5) * 240;
    }
  }
  // Coladas vivas: cada casilla tiene su propia temperatura y se ilumina poco a poco al llegar la lava
  const now = performance.now();
  for (const [i, L] of world.lavaTiles) {
    const tx = i % W, ty = (i / W) | 0;
    if ((tx + 1) * T < x0 || tx * T > x1 || (ty + 1) * T < y0 || ty * T > y1) continue;
    const temp = world.lavaT[i], fade = Math.min(1, (now - L.born) / 1500);
    for (let py = ty * T - 1; py <= ty * T + T; py++) for (let px = tx * T - 1; px <= tx * T + T; px++) {
      if (px < 0 || py < 0 || px >= PW || py >= PH) continue;
      const k = py * PW + px;
      if (pt[k] === i) lavaPx(k, px, py, temp, L.v, fade);
    }
  }
  wvctx.putImageData(waveImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function drawGlints(t){
  if (!glintK || reduceMotion) return;
  const [x0, y0, x1, y1] = visibleRect(), ts = t / 1000; vctx.fillStyle = '#ffffff';
  for (let n = 0; n < glintK.length; n++) {
    const k = glintK[n], px = k % PW, py = (k / PW) | 0;
    if (px < x0 || px > x1 || py < y0 || py > y1) continue;
    const s = Math.sin(ts * .8 + glintPh[n] * 40);
    if (s < .9) continue;
    vctx.globalAlpha = (s - .9) * 3.5; // brillo suave, sin destellos bruscos (con globalAlpha: no se crea un color nuevo por brillo)
    vctx.fillRect(px + Math.round(Math.sin(ts * .7 + n) * 1.5), py, 2, 1);
  }
  vctx.globalAlpha = 1;
}

async function regenerate(refit, quiet){
  const token = ++genToken;
  busy = true;
  villagers = []; setFollow(null); effects = [];
  setLoading(true, 0, 'Levantando montañas', quiet);
  await nextFrame();
  if (token !== genToken) return;
  let last = performance.now();
  const step = async (p, text) => {
    setLoading(true, p, text, quiet);
    if (performance.now() - last > 60) { await nextFrame(); last = performance.now(); }
    return token === genToken;
  };
  for (const [p, text] of generateSteps()) if (!await step(p, text)) return;
  const sizeChanged = terrain.width !== PW || terrain.height !== PH;
  if (sizeChanged) { if (!await step(.72, 'Preparando el lienzo')) return; resizeCanvases(); }
  const rows = Math.max(2, Math.floor(220000 / (W * T * T)));
  for (let y = 0; y < H; y += rows) {
    paintRegion(0, y, W - 1, Math.min(H - 1, y + rows - 1));
    if (!await step(.74 + .18 * y / H, 'Pintando el mundo')) return;
  }
  spriteSeason = prevSeason = seasonInfo().i; seasonEvents = []; seasonChangeT = -1e9;
  composeRegion(0, 0, W - 1, H - 1);
  if (!await step(.94, 'Agitando el oleaje')) return;
  waveImg = null; buildWaves();
  renderStats(); initWeather(); composeRegion(0, 0, W - 1, H - 1); /* los árboles ya tienen su raza del clima */ spawnVillagers(); buildPlateCanvas(); spawnFish(); spawnAnimals(); buildFaunaPanel();
  ash = []; quakes = []; cracks = []; tsunamis = []; dust = []; shake = 0; recede.clear(); globalT = globalTarget = 0; globalYear = Math.floor(yearT / YEAR); fires.clear(); burnt.clear(); smoke = []; sandstorms = []; corpses = []; meteors = []; blasts = []; vapor = [];
  if (refit || sizeChanged) needFit = true;
  busy = false;
  setLoading(false, 1, 'Listo');
}
let regenTimer = 0;
const regenSoon = () => { clearTimeout(regenTimer); regenTimer = setTimeout(() => regenerate(false, true), 90); };

for (const k of ['water', 'rivers', 'humid', 'dens']) $(k).addEventListener('input', () => { params[k] = +$(k).value; syncOutputs(); regenSoon(); });
$('brush').addEventListener('input', () => { params.brush = +$('brush').value; syncOutputs(); });
$('relief').addEventListener('change', () => { params.relief = $('relief').checked; repaintAll(); });
$('objects').addEventListener('change', () => { params.objects = $('objects').checked; composeRegion(0, 0, W - 1, H - 1); });
$('markers').addEventListener('change', () => { params.markers = $('markers').checked; });
$('weather').addEventListener('change', () => { params.weather = $('weather').checked; flash = 0; });
$('pressure').addEventListener('change', () => { params.pressure = $('pressure').checked; });
$('plates').addEventListener('change', () => { params.plates = $('plates').checked; });
$('thermal').addEventListener('change', () => { params.thermal = $('thermal').checked; $('thermLegend').hidden = !params.thermal; thermalT = 1e9; placeLegends(); });
$('heightmap').addEventListener('change', () => { params.heightmap = $('heightmap').checked; $('heightLegend').hidden = !params.heightmap; heightT = 1e9; placeLegends(); });
$('zones').addEventListener('change', () => { params.zones = $('zones').checked; });
$('windmap').addEventListener('change', () => { params.windmap = $('windmap').checked; $('windLegend').hidden = !params.windmap; windParts = []; placeLegends(); });
// Las leyendas visibles se apilan una debajo de otra
function placeLegends(){ let top = 46; for (const id of ['heightLegend', 'windLegend', 'thermLegend']) { const el = $(id); if (!el.hidden) { el.style.top = top + 'px'; top += 66; } } }
$('cloudOp').addEventListener('input', () => { params.cloudOp = +$('cloudOp').value; syncOutputs(); });
$('disasters').addEventListener('input', () => { params.disasters = +$('disasters').value; syncOutputs(); });
$('warmer').onclick = () => { globalTarget = clamp(globalTarget + 2, -8, 8); notify('El planeta empieza a calentarse'); };
$('cooler').onclick = () => { globalTarget = clamp(globalTarget - 2, -8, 8); notify('El planeta empieza a enfriarse'); };
$('people').addEventListener('change', () => { params.people = $('people').checked; spawnVillagers(); });
$('goPeople').onclick = () => {
  if (!villagers.length) { params.people = true; $('people').checked = true; spawnVillagers(); }
  followNext();
};
$('followNext').onclick = followNext;
function setSpeed(n){
  gameSpeed = n;
  for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('on', +b.dataset.s === n);
}
$('speed').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSpeed(+b.dataset.s); });
// La barra de velocidad, justo a la derecha del cartel de la estación (que cambia de ancho)
new ResizeObserver(() => { $('speed').style.left = ($('season').offsetLeft + $('season').offsetWidth + 6) + 'px'; }).observe($('season'));
$('season').onclick = () => { yearT = (Math.floor(yearT / SEASON_LEN) + 1) * SEASON_LEN + .01; };
$('noticeGo').onclick = () => { if (noticeTarget) { setFollow(null); centerOn(noticeTarget.x, noticeTarget.y - 10, Math.max(zoom, 5)); } $('notice').hidden = true; };
$('followStop').onclick = () => setFollow(null);
$('histBtn').onclick = () => { const h = $('histPanel'); h.hidden = !h.hidden; if (!h.hidden) { $('chron').hidden = $('savePanel').hidden = $('sndPanel').hidden = true; recordHistory(); renderHistory(); } };
$('histPanel').addEventListener('click', e => { if (e.target.closest('.x')) { $('histPanel').hidden = true; return; } const b = e.target.closest('[data-h]'); if (b) { histTab = b.dataset.h; for (const q of $('histPanel').querySelectorAll('[data-h]')) q.classList.toggle('on', q === b); renderHistory(); } });
$('saveBtn').onclick = () => { const h = $('savePanel'); h.hidden = !h.hidden; if (!h.hidden) { $('chron').hidden = $('histPanel').hidden = $('sndPanel').hidden = true; renderSlots(); } };
$('savePanel').addEventListener('click', async e => {
  if (e.target.closest('.x')) { $('savePanel').hidden = true; return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.sv) { b.disabled = true; b.textContent = 'Guardando…'; await saveGame(b.dataset.sv); }
  else if (b.dataset.ld) { $('savePanel').hidden = true; await loadGame(b.dataset.ld); }
  else if (b.dataset.del) { if (b.dataset.armed) { await idbDo('readwrite', st => st.delete(b.dataset.del)); renderSlots(); } else { b.dataset.armed = '1'; b.textContent = '¿Seguro?'; } } // dos clics para borrar
  else if (b.id === 'dlSave') { b.disabled = true; b.textContent = 'Preparando…'; try { await downloadSave(); } finally { b.disabled = false; b.textContent = 'Descargar partida actual'; } }
  else if (b.id === 'upSave') $('upFile').click();
});
$('upFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) openSaveFile(f); };
addEventListener('pointerdown', () => { if (SND.on) sndInit(); }); // el navegador solo deja sonar tras un clic

const sndLabel = () => { $('sndBtn').textContent = SND.on ? 'Sonido: sí' : 'Sonido: no'; }; sndLabel();
const sndPanelSync = () => { $('sndOn').checked = SND.on; for (const r of $('sndPanel').querySelectorAll('input[type=range]')) { r.value = Math.round(SND.vol[r.dataset.v] * 100); r.nextElementSibling.textContent = r.value; } };
$('sndBtn').onclick = () => { const p = $('sndPanel'); p.hidden = !p.hidden; if (!p.hidden) { $('chron').hidden = $('histPanel').hidden = $('savePanel').hidden = true; sndPanelSync(); } };
$('sndPanel').addEventListener('click', e => { if (e.target.closest('.x')) $('sndPanel').hidden = true; });
$('sndOn').onchange = e => { SND.on = e.target.checked; saveSndVol(); sndLabel(); if (SND.on) sndInit(); applySndVol(); };
$('sndPanel').addEventListener('input', e => {
  const r = e.target.closest('input[type=range]'); if (!r) return;
  SND.vol[r.dataset.v] = r.value / 100; r.nextElementSibling.textContent = r.value; saveSndVol(); applySndVol();
});
$('sndPanel').addEventListener('change', e => { if (e.target.dataset.v === 'sfx' || e.target.dataset.v === 'gen') snd('bell'); }); // al soltar, una campana de prueba
$('chronBtn').onclick = () => { const c = $('chron'); c.hidden = !c.hidden; $('toasts').hidden = !c.hidden; if (!c.hidden) { $('sndPanel').hidden = true; renderChronicle(); chronUnread = 0; delete $('chronBtn').dataset.n; } };
$('chron').addEventListener('click', e => {
  if (e.target.closest('.x')) { $('chron').hidden = true; $('toasts').hidden = false; return; }
  const fb = e.target.closest('[data-f]'); if (fb) { $('chron').dataset.f = fb.dataset.f; renderChronicle(); return; }
  const cb = e.target.closest('[data-ci]'); if (cb) { const c = chronicle[+cb.dataset.ci]; if (c && c.target) { setFollow(null); centerOn(c.target.x, c.target.y - 10, Math.max(zoom, 5)); } }
});
const setPanel = wide => { document.querySelector('.app').classList.toggle('wide', wide); $('panelTog').dataset.ic = wide ? '⇤' : '⇥'; $('panelTog').title = wide ? 'Mostrar el panel de la derecha' : 'Ocultar el panel de la derecha'; $('panelTog').setAttribute('aria-pressed', wide); try { localStorage.setItem('forja-panel', wide ? '1' : '0'); } catch (err) {} };
$('panelTog').onclick = () => setPanel(!document.querySelector('.app').classList.contains('wide'));
try { if (localStorage.getItem('forja-panel') === '1') setPanel(true); } catch (err) {}
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('sndPanel').hidden) $('sndPanel').hidden = true; else if (!$('chron').hidden) { $('chron').hidden = true; $('toasts').hidden = false; } else if (follow) setFollow(null); else if (!$('vcard').hidden) { cardVid = 0; $('vcard').hidden = true; }
  else for (const t of [...$('toasts').children]) t.remove();
});
const openVillage = id => { cardVid = id; cardTab = 'resumen'; renderVillageCard(true); };
for (const id of ['vcard', 'pcard']) $(id).addEventListener('click', e => {
  const vb = e.target.closest('[data-vid]'); if (vb) { openVillage(+vb.dataset.vid); return; }
  const gb = e.target.closest('[data-go]'); if (gb) { const g = villageById(+gb.dataset.go); if (g) { setFollow(null); centerOn(g.fx * T, g.fy * T, Math.max(zoom, 4)); } }
});
$('vcard').addEventListener('click', e => {
  const tb = e.target.closest('[data-tab]'); if (tb) { cardTab = tb.dataset.tab; renderVillageCard(true); return; }
  if (e.target.closest('.x')) { cardVid = 0; $('vcard').hidden = true; return; }
  const pb = e.target.closest('[data-pid]'); if (pb) { const v = villagers.find(u => u.uid === +pb.dataset.pid && !u.dead); if (v) setFollow(v); }
});
$('pcard').addEventListener('click', e => {
  if (e.target.closest('.x')) { setFollow(null); return; }
  const pb = e.target.closest('[data-pid]'); if (pb) { const v = villagers.find(u => u.uid === +pb.dataset.pid && !u.dead); if (v) setFollow(v); }
});
$('newWorld').onclick = () => { params.seed = randomSeed(); $('seed').value = params.seed; regenerate(true); };
$('useSeed').onclick = () => { params.seed = $('seed').value.trim() || randomSeed(); $('seed').value = params.seed; regenerate(true); };
$('seed').addEventListener('keydown', e => { if (e.key === 'Enter') $('useSeed').click(); });

syncInputs();
regenerate(true);
drawPersonIcons();
requestAnimationFrame(loop);
