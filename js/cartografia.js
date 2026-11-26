// World Sim · Papel y mapas: cada aldea dibuja el mundo que conoce (y no siempre bien)
// ================= Cartografía =================
// El mapa de cada aldea es una rejilla de zonas de 4×4 casillas con lo seguros que están de cada una (0 = ni idea,
// 255 = la conocen al dedillo). Se llena con lo que ve la gente del pueblo, con las expediciones de sus cartógrafos
// (a pie o en barca) y con los mapas que se intercambian al comerciar. Al dibujarlo, lo poco conocido se tuerce,
// se borra o se inventa: costas que no están donde tocan, islas que no existen.
const CZ = 4; // casillas por zona
const chartNoise = perlin(mulberry32(7771)), noise2 = (x, y) => clamp(chartNoise(x, y) * .75 + .5, 0, 1);
const chartW = () => Math.ceil(W / CZ), chartH = () => Math.ceil(H / CZ);
function chartOf(g){
  if (!g.chart || g.chart.length !== chartW() * chartH()) { g.chart = new Uint8Array(chartW() * chartH()); g.chartVer = (g.chartVer || 0) + 1; }
  return g.chart;
}
const hasPaper = g => !!(g && g.know && g.know.papel);
// Apunta lo visto alrededor de un punto (en píxeles): r zonas a la redonda, con esta seguridad
function chartMark(arr, px, py, r, conf){
  const cw = chartW(), ch = chartH(), cx = Math.floor(px / T / CZ), cy = Math.floor(py / T / CZ);
  let fresh = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= cw || y >= ch || dx * dx + dy * dy > r * r + 1) continue;
    const c = Math.round(conf * (1 - Math.hypot(dx, dy) / (r + 1) * .45)), k = y * cw + x;
    if (arr instanceof Map) { if ((arr.get(k) || 0) < c) arr.set(k, c); }
    else if (arr[k] < c) { if (!arr[k]) fresh++; arr[k] = c; }
  }
  return fresh;
}
const cartoConf = g => Math.min(235, 120 + (g.cartoSkill || 0) * 14); // con oficio, cada vez más precisos
function learnPaper(g, how){
  const kn = g.know ||= {}; if (kn.papel) return;
  kn.papel = true; g.cartoSkill = 0; const ch = chartOf(g);
  chartMark(ch, g.fx * T, g.fy * T, 6, 200); g.chartVer++;
  notify(how || `En ${g.name} descubren el papel: empiezan a dibujar mapas de sus tierras`, { x:g.fx * T, y:g.fy * T });
}
// Cada pocos segundos: lo que ve la gente del pueblo y lo que van viendo sus expediciones
function chartTick(g, dt, people){
  const kn = g.know || {};
  if (!kn.papel) {
    // El papel llega con el ayuntamiento y algo de madera de sobra (antes si comercian con quien ya lo tiene)
    if (kn.escritura && g.hall != null && people.length >= 10 && g.wood >= 15 && Math.random() < dt * .004) learnPaper(g);
    return;
  }
  if ((g.chartT = (g.chartT || 0) - dt) > 0) return;
  g.chartT = 3;
  const ch = chartOf(g), conf = Math.min(250, cartoConf(g) + 30); let fresh = 0;
  const near = townRadius(g) + 12; // la gente solo apunta lo de alrededor del pueblo: lo lejano, los cartógrafos (y los vuelos)
  for (const v of people) if (!v.away && Math.hypot(v.x / T - g.fx, v.y / T - g.fy) < near) fresh += chartMark(ch, v.x, v.y, v.boat ? 2 : 1, conf);
  if (fresh) g.chartVer++;
  for (const t of travelers) if (t.kind === 'expedicion' && t.from === g.id && t.sketch) chartMark(t.sketch, t.x, t.y, t.sea ? 3 : 2, cartoConf(g) * (.75 + Math.random() * .25));
}
// Una expedición: a pie hacia tierras sin dibujar, o en barca por mar abierto, y vuelta a casa a pasarlo al papel
function launchExpedition(v, g){
  const ch = chartOf(g), cw = chartW(), chh = chartH(), hx = g.fx * T + 2, hy = g.fy * T + 6;
  const unknown = (want, rMin, rMax) => { const out = [];
    for (let k = 0; k < 500 && out.length < 12; k++) {
      const a = Math.random() * Math.PI * 2, d = rMin + Math.random() * (rMax - rMin), x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d);
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
      const c = Math.floor(y / CZ) * cw + Math.floor(x / CZ); if (ch[c] > 40) continue;
      const i = y * W + x; if (want === 'mar' ? !openWater(i) || !(world.biome[i] <= B.SHALLOW) : WATER[world.biome[i]] || world.biome[i] === B.LAVA) continue;
      out.push([x, y, d]);
    }
    return out.sort((p, q) => p[2] - q[2]); };
  const reach = Math.min(230, 85 + (g.expeditions || 0) * 5); // cuantas más expediciones llevan, más lejos se atreven
  let mode = g.port && openWater(g.port.launch) && Math.random() < .55 ? 'mar' : 'tierra', t = null;
  for (let tries = 0; tries < 2 && !t; tries++, mode = mode === 'mar' ? 'tierra' : 'mar') {
    if (mode === 'mar') {
      if (!g.port || !openWater(g.port.launch)) continue;
      for (const [x, y] of unknown('mar', 25, reach * 1.3).slice(0, 4)) {
        const route = waterRoute(g.port.launch, y * W + x); if (!route || route.length < 6 || route.length > reach * .5 + 100) continue;
        const home = [(g.port.launch % W) * T + 2, ((g.port.launch / W) | 0) * T + 3], path = route.slice(), first = path.shift();
        t = { kind:'expedicion', mode, v, from:g.id, to:g.id, x:home[0], y:home[1], tx:first[0], ty:first[1], path, back:[...route].reverse().slice(1).concat([home]), hx:home[0], hy:home[1], sea:true, phase:'ida', dir:1 };
        break;
      }
    } else {
      const c = unknown('tierra', 22, reach)[0]; if (!c) continue;
      // Un rodeo de un par de puntos: no van en línea recta, van mirando
      const [x, y] = c, mid = k => [((g.fx + (x - g.fx) * k) + (Math.random() - .5) * 18) * T, ((g.fy + (y - g.fy) * k) + (Math.random() - .5) * 18) * T];
      const path = [mid(.4), mid(.75), [x * T + 2, y * T + 3]], first = path.shift();
      t = { kind:'expedicion', mode, v, from:g.id, to:g.id, x:v.x, y:v.y, tx:first[0], ty:first[1], path, back:[mid(.5), [hx, hy]], hx, hy, sea:false, phase:'ida', dir:1 };
    }
  }
  if (!t) { g.noExplore = yearT + DAY_LEN; return false; } // ya lo tienen todo dibujado cerca (o no hay por dónde)
  t.sketch = new Map(); releaseTask(v); v.task = { k:'viaje' }; v.away = true; dismount(v); travelers.push(t);
  g.expeditions = (g.expeditions || 0) + 1;
  if (g.expeditions <= 2 || g.expeditions % 5 === 0) notify(`${v.name}, de ${g.name}, sale ${t.sea ? 'en barca a cartografiar la costa y el mar' : 'a pie a cartografiar tierras lejanas'}`, { x:v.x, y:v.y });
  return true;
}
// Al volver: lo apuntado se pasa al mapa del pueblo
function endExpedition(t, g){
  const ch = chartOf(g); let fresh = 0;
  for (const [k, c] of t.sketch) if (ch[k] < c) { if (ch[k] < 30) fresh++; ch[k] = c; }
  g.chartVer++; g.cartoSkill = Math.min(8, (g.cartoSkill || 0) + .5); g.maps = (g.maps || 0) + 1;
  // ¿Han encontrado algún pueblo que no conocían?
  const cw = chartW(), found = villages.filter(o => o !== g && popOf(o) && t.sketch.has(Math.floor(o.fy / CZ) * cw + Math.floor(o.fx / CZ)));
  for (const o of found) { const r = relOf(g, o); if (!r.known) { r.known = true; r.v = 0; notify(`Los cartógrafos de ${g.name} encuentran ${o.name}`, { x:o.fx * T, y:o.fy * T }); } }
  if (fresh >= 4) notify(`${t.v.name} vuelve a ${g.name} y añade ${fresh} zonas nuevas al mapa${t.sea ? ' (por mar)' : ''}`, { x:t.x, y:t.y });
}
// Al comerciar o en las visitas: se copian los mapas (la copia, algo peor que el original)
function shareCharts(a, b){
  spreadWriting(a, b); // la escritura también se aprende al tratar con otros
  spreadScience(a, b); // y algún descubrimiento (ciencia.js)
  if (!hasPaper(a) && hasPaper(b) && Math.random() < .35) learnPaper(a, `Los de ${a.name} aprenden de ${b.name} a hacer papel y mapas`);
  if (!hasPaper(b) && hasPaper(a) && Math.random() < .35) learnPaper(b, `Los de ${b.name} aprenden de ${a.name} a hacer papel y mapas`);
  if (!hasPaper(a) || !hasPaper(b)) return;
  const A = chartOf(a), Bc = chartOf(b); let na = 0, nb = 0;
  for (let k = 0; k < A.length; k++) { const ca = A[k] * .7 | 0, cb = Bc[k] * .7 | 0; if (cb > A[k]) { if (A[k] < 30 && cb >= 30) na++; A[k] = cb; } if (ca > Bc[k]) { if (Bc[k] < 30 && ca >= 30) nb++; Bc[k] = ca; } }
  a.chartVer++; b.chartVer++;
  const key = relKey(a, b), r = rels.get(key); if ((na + nb) > 30 && r && !r.mapMsg) { r.mapMsg = true; notify(`${a.name} y ${b.name} intercambian sus mapas`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }); }
}

// ---- Para qué sirve el mapa ----
// Sin mapa de un sitio no se va allí: no se navega hacia costas que no tienen dibujadas (flotas, colonos), y dos pueblos
// lejanos solo se conocen si uno tiene al otro en su mapa. Lo de alrededor del pueblo lo conocen siempre (sin papel, solo eso)
function chartAt(g, tx, ty){
  if (Math.hypot(tx - g.fx, ty - g.fy) < townRadius(g) + 14) return 255;
  if (!hasPaper(g)) return 0;
  const cw = chartW(), x = Math.floor(tx / CZ), y = Math.floor(ty / CZ); if (x < 0 || y < 0 || x >= cw || y >= chartH()) return 0;
  return chartOf(g)[y * cw + x];
}
const mapSees = (a, b) => chartAt(a, b.fx, b.fy) >= 40; // ¿tiene a ese pueblo en su mapa?
// ¿Conocen la ruta por mar? (casi todos sus tramos, dibujados en el mapa; route son puntos en píxeles, como waterRoute)
function seaRouteKnown(g, route){
  if (!route || !route.length) return true;
  let ok = 0; for (const [px, py] of route) if (chartAt(g, px / T, py / T) >= 30) ok++;
  return ok >= route.length * .85;
}
// ---- Dibujo del mapa en pergamino ----
const INK = { [B.DEEP]:[96, 128, 148], [B.SEA]:[118, 148, 162], [B.SHALLOW]:[150, 176, 178], [B.LAKE]:[104, 140, 168], [B.RIVER]:[104, 140, 168],
  [B.SAND]:[226, 204, 150], [B.DESERT]:[222, 196, 136], [B.DRY]:[208, 190, 140], [B.GRASS]:[190, 186, 126], [B.PLAINS]:[200, 190, 130], [B.DIRT]:[196, 176, 130],
  [B.FOREST]:[146, 156, 100], [B.SWAMP]:[140, 150, 110], [B.HILLS]:[176, 146, 104], [B.ROCK]:[150, 134, 116], [B.BASALT]:[120, 110, 104],
  [B.SNOW]:[236, 232, 216], [B.TUNDRA]:[210, 206, 186], [B.LAVA]:[170, 96, 70], [B.ASH]:[150, 130, 116] };
const PARCH = [233, 220, 184];
let chartCache = new Map();
function chartImage(g){
  const key = g.id + ':' + (g.chartVer || 0) + ':' + Math.floor(yearT / (DAY_LEN / 2));
  const hit = chartCache.get(g.id); if (hit && hit.key === key) return hit;
  const ch = chartOf(g), cw = chartW(), chh = chartH(), seed = g.id * 7.31;
  const skill = (g.cartoSkill || 0) / 8;
  // Tierra o agua en una zona, según la ve este pueblo: cuanto menos la conocen, más se desplaza (costas torcidas)
  // y alguna vez se inventan lo que hay (islas de más, lagos que no están)
  const seen = new Uint8Array(cw * chh), wat = new Uint8Array(cw * chh), col = new Array(cw * chh);
  let known = 0;
  for (let cy = 0; cy < chh; cy++) for (let cx = 0; cx < cw; cx++) {
    const k = cy * cw + cx, c = ch[k]; if (c < 12) continue; known++;
    const err = (1 - c / 255) * (1.4 - skill * .8), wob = 9 * err;
    const sx = clamp(Math.round(cx * CZ + 2 + (noise2(cx * .23 + seed, cy * .23) - .5) * 2 * wob * CZ / 2), 0, W - 1);
    const sy = clamp(Math.round(cy * CZ + 2 + (noise2(cx * .23, cy * .23 + seed) - .5) * 2 * wob * CZ / 2), 0, H - 1);
    let b = world.biome[sy * W + sx];
    if (err > .45 && h2(cx, cy, 900 + g.id) < (err - .45) * .25) b = WATER[b] ? B.GRASS : B.SEA; // inventado
    seen[k] = c; wat[k] = WATER[b] && b !== B.RIVER ? 1 : 0; col[k] = INK[b] || PARCH;
  }
  // Solo la parte que conocen (con margen de pergamino en blanco alrededor), ampliada para que se lea
  let bx0 = cw, by0 = chh, bx1 = 0, by1 = 0;
  for (let k = 0; k < seen.length; k++) if (seen[k]) { const cx = k % cw, cy = (k / cw) | 0; if (cx < bx0) bx0 = cx; if (cx > bx1) bx1 = cx; if (cy < by0) by0 = cy; if (cy > by1) by1 = cy; }
  if (bx1 < bx0) { bx0 = by0 = 0; bx1 = cw - 1; by1 = chh - 1; }
  let mw = Math.max(18, (bx1 - bx0 + 1) * 1.3), mh = Math.max(11, (by1 - by0 + 1) * 1.3);
  if (mw / mh < 1.6) mw = mh * 1.6; else mh = mw / 1.6; // apaisado, como la ficha
  mw = Math.min(cw, Math.ceil(mw)); mh = Math.min(chh, Math.ceil(mh));
  const ox = clamp(Math.round((bx0 + bx1) / 2 - mw / 2), 0, cw - mw), oy = clamp(Math.round((by0 + by1) / 2 - mh / 2), 0, chh - mh);
  const S = clamp(Math.floor(440 / mw), 3, 12), cv = document.createElement('canvas'); cv.width = mw * S; cv.height = mh * S;
  const x = cv.getContext('2d'), img = x.createImageData(cv.width, cv.height), D = img.data;
  const MX = tx => Math.round((tx / CZ - ox) * S), MY = ty => Math.round((ty / CZ - oy) * S); // casilla del mundo → píxel del mapa
  for (let py = 0; py < cv.height; py++) for (let px = 0; px < cv.width; px++) {
    const cx = ox + ((px / S) | 0), cy = oy + ((py / S) | 0), k = cy * cw + cx, o = (py * cv.width + px) * 4, grain = (h2(px, py, 31) - .5) * 14;
    let c = PARCH, a = 0;
    if (seen[k]) { c = col[k]; a = Math.min(1, seen[k] / 255 * 1.3); }
    let r = PARCH[0] + (c[0] - PARCH[0]) * a + grain, gg = PARCH[1] + (c[1] - PARCH[1]) * a + grain, bb = PARCH[2] + (c[2] - PARCH[2]) * a + grain;
    // Costa: tinta oscura entre tierra y agua (solo donde lo conocen)
    if (seen[k] && ((px % S === 0 && cx > 0 && seen[k - 1] && wat[k - 1] !== wat[k]) || (py % S === 0 && cy > 0 && seen[k - cw] && wat[k - cw] !== wat[k]))) { r = 92; gg = 70; bb = 48; }
    // Bosques y montes: puntitos y picos de tinta
    if (seen[k] > 60 && !wat[k] && col[k] === INK[B.FOREST] && (px + py * 3) % 7 === 0) { r -= 50; gg -= 40; bb -= 40; }
    D[o] = r; D[o + 1] = gg; D[o + 2] = bb; D[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // Lo de encima: caminos conocidos, pueblos, rosa de los vientos y bordes
  x.fillStyle = 'rgba(110,70,40,.7)';
  for (const i of pathMap) { const tx = i % W, ty = (i / W) | 0, k = Math.floor(ty / CZ) * cw + Math.floor(tx / CZ); if (seen[k] > 90 && (tx + ty) % 3 === 0) x.fillRect(MX(tx), MY(ty), Math.max(1, S >> 2), Math.max(1, S >> 2)); }
  const marks = [];
  for (const o of villages) {
    if (!popOf(o)) continue;
    const k = Math.floor(o.fy / CZ) * cw + Math.floor(o.fx / CZ); if (o !== g && seen[k] < 40) continue;
    const err = (1 - seen[k] / 255) * 10, mx = MX(o.fx) + Math.round((noise2(o.id, seed) - .5) * err * S / 4), my = MY(o.fy) + Math.round((noise2(seed, o.id) - .5) * err * S / 4);
    if (mx < 0 || my < 0 || mx >= cv.width || my >= cv.height) continue;
    x.fillStyle = o === g ? '#a8281e' : '#3a2a1a'; x.fillRect(mx - 2, my - 2, 5, 5); x.fillStyle = PARCH_CSS; x.fillRect(mx - 1, my - 1, 3, 3); x.fillStyle = o === g ? '#a8281e' : '#3a2a1a'; x.fillRect(mx, my, 1, 1);
    marks.push({ o, x:mx, y:my });
  }
  x.font = 'bold 10px serif'; x.textBaseline = 'bottom';
  for (const m of marks) { const t = m.o.name, w = x.measureText(t).width, lx = clamp(m.x - w / 2, 2, cv.width - w - 2), ly = m.y - 4 < 12 ? m.y + 15 : m.y - 4; x.fillStyle = 'rgba(233,220,184,.75)'; x.fillRect(lx - 1, ly - 10, w + 2, 11); x.fillStyle = m.o === g ? '#8a2018' : '#3a2a1a'; x.fillText(t, lx, ly); }
  // Rosa de los vientos en una esquina sin conocer (o abajo a la derecha)
  const rx = cv.width - 22, ry = cv.height - 22; x.strokeStyle = '#5a4028'; x.fillStyle = '#5a4028'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(rx, ry - 14); x.lineTo(rx + 3, ry); x.lineTo(rx, ry + 14); x.lineTo(rx - 3, ry); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(rx - 14, ry); x.lineTo(rx, ry + 3); x.lineTo(rx + 14, ry); x.lineTo(rx, ry - 3); x.closePath(); x.stroke();
  x.font = 'bold 9px serif'; x.textBaseline = 'alphabetic'; x.fillText('N', rx - 3, ry - 16);
  // Lo que no conocen: algún monstruo marino en el mar sin dibujar
  if (known < cw * chh * .6) { x.font = 'italic 11px serif'; x.fillStyle = 'rgba(90,64,40,.55)'; const tx0 = h2(g.id, 3, 5) < .5 ? 10 : cv.width - 130; x.fillText(Math.random() < .5 ? 'Aquí hay dragones' : 'Tierras sin explorar', tx0, 20); }
  x.strokeStyle = '#6a4a2a'; x.lineWidth = 2; x.strokeRect(1, 1, cv.width - 2, cv.height - 2);
  const res = { key, url:cv.toDataURL(), known:known / (cw * chh) };
  chartCache.set(g.id, res); return res;
}
const PARCH_CSS = `rgb(${PARCH.join(',')})`;
function chartCard(g){
  if (!hasPaper(g)) return `<div class="muted">Aún no conocen el papel: no tienen mapas, así que no se alejan de su tierra (ni por mar). Lo descubren con el ayuntamiento y madera de sobra, o aprendiéndolo de quien ya lo tiene al comerciar.</div>`;
  const im = chartImage(g), sk = g.cartoSkill || 0, prec = sk >= 6 ? 'muy precisos' : sk >= 3 ? 'bastante fieles' : sk >= 1 ? 'aproximados' : 'toscos';
  const exp = travelers.filter(t => t.kind === 'expedicion' && t.from === g.id);
  const carto = villagers.filter(v => !v.dead && v.vid === g.id && v.oficio === 'cartógrafo').length;
  return `<div class="chart"><img src="${im.url}" alt="Mapa de ${esc(g.name)}"></div>
    <div class="chart-meta"><span>Conocen el <b>${Math.round(im.known * 100)} %</b> del mundo</span><span>Mapas ${prec}</span><span>${g.expeditions || 0} expediciones${exp.length ? ` · <b>${exp.length} en camino</b>` : ''}</span>${carto ? `<span>${carto} cartógrafo${carto > 1 ? 's' : ''}</span>` : ''}</div>
    <p class="muted chart-note">Así ven el mundo los de ${esc(g.name)}: lo que mejor conocen está nítido; lo lejano o poco visitado, borroso, torcido y a veces inventado. Solo navegan hacia costas que tienen dibujadas y solo conocen los pueblos lejanos que aparecen en su mapa: lo amplían sus cartógrafos (y los globos y aviones de reconocimiento).</p>`;
}
