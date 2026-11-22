// Forja de Mundos · Hierba de cerca y mapas de alturas, vientos y temperatura
// ================= Hierba de cerca =================
// Al acercar mucho la cámara aparecen matas de hierba que se mecen con el viento en las zonas donde crece.
// El color depende del bioma, la estación y la sequía; bajo la nieve, en tierra quemada o con objetos encima no hay
const GRASS_D = { [B.GRASS]:.55, [B.PLAINS]:.6, [B.FOREST]:.35, [B.HILLS]:.3, [B.SWAMP]:.45, [B.DRY]:.4, [B.TUNDRA]:.15 };
const grassCache = {};
function grassSprite(pal, v, frame, tall){
  const key = pal + v + frame + tall;
  if (grassCache[key]) return grassCache[key];
  const cols = { verde:['#3f7a32','#5a9a3e','#7cbc4e'], claro:['#6a9a3a','#8ab64a','#b0d060'], dorado:['#a8883a','#c8a448','#e0c060'],
    otono:['#8a7a32','#a8963e','#c8b050'], seco:['#8a6e3a','#a88a48','#c4a45a'], junco:['#3a6a3a','#4e8a46','#6aa850'] }[pal];
  const H = tall ? 7 : 4, c = document.createElement('canvas'); c.width = 7; c.height = H + 1;
  const x = c.getContext('2d'), n = 3 + (v % 3);
  for (let b = 0; b < n; b++) {
    const bx = 1 + Math.floor(h2(v, b, 120) * 5), bh = Math.max(2, Math.round(H * (.55 + .45 * h2(v, b, 121))));
    const lean = (frame - 1) * (bh > 3 ? 1 : .5); // la punta se mece con el viento
    for (let yy = 0; yy < bh; yy++) {
      const k = yy / bh;
      x.fillStyle = cols[k < .35 ? 0 : k < .75 ? 1 : 2];
      x.fillRect(bx + Math.round(lean * k * k), H - yy, 1, 1);
    }
  }
  return grassCache[key] = c;
}
function drawGrass(t){
  if (zoom < 3.5 || !params.objects) return;
  const [x0, y0, x1, y1] = visibleRect(), si = seasonInfo().i, ts = t / 1000;
  vctx.globalAlpha = Math.min(1, (zoom - 3.5) / 1.2);
  for (let ty = Math.max(0, Math.floor(y0 / T) - 1); ty <= Math.min(H - 1, Math.floor(y1 / T) + 1); ty++)
    for (let tx = Math.max(0, Math.floor(x0 / T) - 1); tx <= Math.min(W - 1, Math.floor(x1 / T) + 1); tx++) {
      const i = ty * W + tx, b = world.biome[i], d = GRASS_D[b];
      // Ni un poco de nieve en la casilla ni en las de al lado (la nieve se difumina hacia las vecinas): si no,
      // las matas se mecen por encima de la nieve y parpadean
      if (!d || world.objs[i] || burnt.has(i) || floodA && floodA[i] > .3 || fires.has(i)) continue;
      if (snowA && (snowA[i] > .02 || (tx > 0 && snowA[i - 1] > .02) || (tx < W - 1 && snowA[i + 1] > .02) || (ty > 0 && snowA[i - W] > .02) || (ty < H - 1 && snowA[i + W] > .02))) continue;
      const dr = droughtAt(i), grazedHere = (world.graze[i] || 0) > .5;
      for (let k = 0; k < 2; k++) {
        if (h2(tx, ty * 2 + k, 122) > d * (grazedHere ? .3 : 1)) continue;
        const pal = b === B.SWAMP ? 'junco' : b === B.DRY || dr > .55 ? (dr > .55 ? 'seco' : 'dorado') : si === 2 ? 'otono' : si === 3 ? 'seco' : b === B.PLAINS ? 'claro' : 'verde';
        const v = Math.floor(h2(tx, ty, 123 + k) * 9), [wx] = windAt(tx * T, ty * T);
        const ph = ts * (1.5 + Math.abs(wx) * .08) + h2(tx, ty, 124) * 6 + tx * .15;
        const frame = Math.max(0, Math.min(2, Math.round(1 + Math.sin(ph) * .7 + Math.sign(wx) * .4)));
        const spr = grassSprite(pal, v, frame, b === B.SWAMP);
        vctx.drawImage(spr, tx * T + Math.floor(h2(tx, ty, 125 + k) * T) - 3, ty * T + Math.floor(h2(tx, ty, 127 + k) * T) - spr.height + 1);
      }
    }
  vctx.globalAlpha = 1;
}

// Vapor de agua que se evapora: volutas claras que suben, se mecen y se las lleva el viento
let vapor = [];
function addVapor(i){
  if (vapor.length > 500) return;
  for (let k = 0; k < 2; k++)
    vapor.push({ x:(i % W) * T + Math.random() * T, y:((i / W) | 0) * T + Math.random() * T, life:0, max:1.6 + Math.random() * 1.6, ph:Math.random() * 6.28 });
}
function drawVapor(dt){
  if (!vapor.length) return;
  for (const p of vapor) {
    p.life += dt;
    const [wx] = windAt(p.x, p.y);
    p.y -= dt * 7; p.x += dt * (wx * .3 + Math.sin(p.life * 3 + p.ph) * 3);
    const a = Math.min(1, p.life * 3) * (1 - p.life / p.max) * .7;
    vctx.fillStyle = `rgba(240,248,255,${a})`;
    vctx.fillRect(Math.round(p.x), Math.round(p.y), p.life > p.max * .4 ? 2 : 1, 2);
  }
  vapor = vapor.filter(p => p.life < p.max);
}

// ================= Mapa de alturas =================
// Capa opcional con la altura de cada casilla: el mar en azules (más oscuro cuanto más hondo) y la tierra del
// verde de la costa al blanco de las cumbres, con curvas de nivel cada 500 m. Se rehace cada 2 s (por si el
// terreno cambia: pincel, meteoritos, tsunamis)
let heightCv = null, heightT = 1e9;
const HEIGHTS = [[-4000,[12,30,74]], [-1500,[42,90,160]], [-50,[122,176,216]], [0,[60,138,58]], [600,[156,188,74]], [1300,[216,192,96]], [2300,[160,112,58]], [3600,[138,133,128]], [5200,[255,255,255]]];
const altOf = i => world.e[i] >= world.sea ? (world.e[i] - world.sea) / (1 - world.sea) * 5200 : -(world.sea - world.e[i]) / world.sea * 4000;
function heightColor(m){
  if (m <= HEIGHTS[0][0]) return HEIGHTS[0][1];
  for (let k = 1; k < HEIGHTS.length; k++) if (m <= HEIGHTS[k][0]) {
    const [m0, c0] = HEIGHTS[k - 1], [m1, c1] = HEIGHTS[k], f = (m - m0) / (m1 - m0);
    return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
  }
  return HEIGHTS[HEIGHTS.length - 1][1];
}
function drawHeightmap(t){
  if (!params.heightmap || !world.e) return;
  if (!heightCv || heightCv.width !== W || heightCv.height !== H) { heightCv = document.createElement('canvas'); heightCv.width = W; heightCv.height = H; heightT = 1e9; }
  if (Math.abs(t - heightT) > 2000) {
    heightT = t;
    const x = heightCv.getContext('2d'), img = x.createImageData(W, H), D = img.data;
    for (let i = 0; i < N; i++) {
      const m = altOf(i), c = heightColor(m), o = i * 4;
      // Curva de nivel: la casilla de al lado (derecha o abajo) cae en otro tramo de 500 m
      const band = Math.floor(m / 500), xr = i % W;
      const edge = m > 0 && ((xr < W - 1 && Math.floor(altOf(i + 1) / 500) !== band) || (i + W < N && Math.floor(altOf(i + W) / 500) !== band));
      const f = edge ? .72 : 1;
      D[o] = c[0] * f; D[o + 1] = c[1] * f; D[o + 2] = c[2] * f; D[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  vctx.save(); vctx.globalAlpha = .8; vctx.imageSmoothingEnabled = false; vctx.drawImage(heightCv, 0, 0, PW, PH); vctx.restore();
}

// ================= Mapa de vientos =================
// Capa opcional: corrientes de partículas que fluyen con el viento dejando estela (como en los mapas del tiempo)
// y una rejilla de flechas en píxeles con su dirección y fuerza; el color va del azul (calma) al rojo (huracán)
let windParts = [];
const WIND_KMH = 4; // 1 unidad de viento del juego ≈ 4 km/h
function windColor(v){
  const k = v * WIND_KMH;
  return k < 20 ? '#78b4e8' : k < 40 ? '#5ac87a' : k < 65 ? '#f0d43a' : k < 90 ? '#f08a2a' : '#d0281e';
}
function drawWindmap(t){
  if (!params.windmap) return;
  const [x0, y0, x1, y1] = visibleRect(), u = Math.max(1, Math.round(1 / zoom)); // grosor: al menos 1 píxel de pantalla
  // Partículas: nacen al azar en la vista, avanzan con el viento y dejan una estela que se apaga
  const want = Math.round(Math.min(900, (cw * ch) / 900));
  while (windParts.length < want) windParts.push({ x:x0 + Math.random() * (x1 - x0), y:y0 + Math.random() * (y1 - y0), age:Math.random() * 3, max:2 + Math.random() * 3, tr:[] });
  const dt = Math.min(.05, (t - (drawWindmap.last || t)) / 1000); drawWindmap.last = t;
  for (const p of windParts) {
    const [wx, wy] = windAt(p.x, p.y), v = Math.hypot(wx, wy);
    p.tr.push([p.x, p.y]); if (p.tr.length > 8) p.tr.shift();
    p.x += wx * dt * 5; p.y += wy * dt * 5; p.age += dt;
    if (p.age > p.max || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) { p.x = x0 + Math.random() * (x1 - x0); p.y = y0 + Math.random() * (y1 - y0); p.age = 0; p.tr = []; continue; }
    vctx.fillStyle = windColor(v);
    for (let k = 1; k < p.tr.length; k++) {
      vctx.globalAlpha = k / p.tr.length * .85 * Math.min(1, (p.max - p.age) * 2);
      vctx.fillRect(Math.round(p.tr[k][0]), Math.round(p.tr[k][1]), u, u);
    }
  }
  vctx.globalAlpha = 1;
  // Flechas grandes cada ~110 píxeles de pantalla: trazo de 3 píxeles con sombra, más larga cuanto más sopla
  const step = 110 / zoom, wd = Math.max(1, Math.round(3 / zoom));
  for (let y = Math.floor(y0 / step) * step + step / 2; y < y1; y += step) for (let x = Math.floor(x0 / step) * step + step / 2; x < x1; x += step) {
    const [wx, wy] = windAt(x, y), v = Math.hypot(wx, wy) || 1, len = Math.min(step * .75, (34 + v * 2.2) / zoom);
    const ux = wx / v, uy = wy / v, tx = x - ux * len / 2, ty = y - uy * len / 2, hx = x + ux * len / 2, hy = y + uy * len / 2, b = len * .38, sh = Math.max(1, Math.round(1.5 / zoom));
    const arrow = () => {
      pxLine(tx, ty, hx, hy, wd);
      pxLine(hx, hy, hx - ux * b + uy * b * .65, hy - uy * b - ux * b * .65, wd); // punta: dos trazos hacia atrás
      pxLine(hx, hy, hx - ux * b - uy * b * .65, hy - uy * b + ux * b * .65, wd);
    };
    vctx.save(); vctx.translate(sh, sh); vctx.fillStyle = 'rgba(10,14,20,.6)'; arrow(); vctx.restore();
    vctx.fillStyle = windColor(v); arrow();
  }
}

// ================= Mapa térmico =================
// Capa opcional con la temperatura de cada casilla en este momento (1 píxel por casilla, ampliada y suavizada).
// Se recalcula una vez por segundo: se ven las estaciones, las olas de calor y frío, los volcanes y la lava
let thermalCv = null, thermalT = 1e9;
const THERMAL = [[-30,[74,26,122]], [-18,[42,78,200]], [-6,[88,200,232]], [0,[232,244,240]], [10,[88,184,74]], [20,[240,212,58]], [28,[240,138,42]], [36,[200,40,30]], [45,[106,10,20]]];
function thermalColor(t){
  if (t <= THERMAL[0][0]) return THERMAL[0][1];
  for (let k = 1; k < THERMAL.length; k++) if (t <= THERMAL[k][0]) {
    const [t0, c0] = THERMAL[k - 1], [t1, c1] = THERMAL[k], f = (t - t0) / (t1 - t0);
    return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
  }
  return THERMAL[THERMAL.length - 1][1];
}
function drawThermal(t){
  if (!params.thermal || !world.baseT) return;
  if (!thermalCv || thermalCv.width !== W || thermalCv.height !== H) { thermalCv = document.createElement('canvas'); thermalCv.width = W; thermalCv.height = H; thermalT = 1e9; }
  if (Math.abs(t - thermalT) > 1000) {
    thermalT = t;
    const x = thermalCv.getContext('2d'), img = x.createImageData(W, H), D = img.data;
    for (let i = 0; i < N; i++) { const c = thermalColor(tempAt(i)), o = i * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; }
    x.putImageData(img, 0, 0);
  }
  vctx.save(); vctx.globalAlpha = .62; vctx.imageSmoothingEnabled = true; vctx.drawImage(thermalCv, 0, 0, PW, PH); vctx.restore();
}
