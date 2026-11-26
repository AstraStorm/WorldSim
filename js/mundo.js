// World Sim · Generación del mundo y pintado del terreno
// ================= Generación =================
function makeBlobs(type, rand, asp){
  const list = [];
  const add = (n, rmin, rmax, margin) => { for (let k = 0; k < n; k++) list.push({ x:margin + rand() * (1 - 2 * margin), y:(margin + rand() * (1 - 2 * margin)) * asp, r:rmin + rand() * (rmax - rmin) }); };
  if (type === 'pangea') { list.push({ x:.5, y:asp / 2, r:.46 }); add(3, .08, .14, .25); }
  else if (type === 'cont') add(2 + Math.floor(rand() * 2), .22, .32, .22);
  else if (type === 'islas') add(7 + Math.floor(rand() * 6), .07, .13, .1);
  else if (type === 'archi') add(30 + Math.floor(rand() * 20), .025, .065, .06);
  return list;
}

// Relleno de depresiones (priority-flood): da a cada casilla de tierra la dirección por la que drena hacia el mar
function drainage(e, sea){
  const filled = new Float32Array(N), dir = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const hi = new Int32Array(N), hv = new Float32Array(N); let n = 0;
  const push = (i, v) => { let k = n++; while (k > 0) { const p = (k - 1) >> 1; if (hv[p] <= v) break; hi[k] = hi[p]; hv[k] = hv[p]; k = p; } hi[k] = i; hv[k] = v; };
  const pop = () => { const top = hi[0], li = hi[--n], lv = hv[n]; let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && hv[c + 1] < hv[c]) c++; if (hv[c] >= lv) break; hi[k] = hi[c]; hv[k] = hv[c]; k = c; } hi[k] = li; hv[k] = lv; return top; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (e[i] < sea || x === 0 || y === 0 || x === W - 1 || y === H - 1) { filled[i] = e[i]; done[i] = 1; push(i, e[i]); }
  }
  while (n) {
    const c = pop(), cx = c % W, cy = (c / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if ((!dx && !dy) || x < 0 || y < 0 || x >= W || y >= H) continue;
      const nb = y * W + x;
      if (done[nb]) continue;
      done[nb] = 1;
      filled[nb] = Math.max(e[nb], filled[c] + 1e-6);
      dir[nb] = c;
      push(nb, filled[nb]);
    }
  }
  return { filled, dir };
}

// Generador por pasos: cada yield devuelve [progreso 0..1, texto] para la pantalla de carga
const nb4i = i => { const x = i % W, out = []; if (x > 0) out.push(i - 1); if (x < W - 1) out.push(i + 1); if (i >= W) out.push(i - W); if (i < N - W) out.push(i + W); return out; };
function* generateSteps(){
  [W, H] = SIZES[params.size]; N = W * H; PW = W * T; PH = H * T;
  const seedNum = hashStr(params.seed), rand = mulberry32(seedNum);
  const nE = perlin(rand), nM = perlin(rand), nV = perlin(rand), nW1 = perlin(rand), nW2 = perlin(rand), nT = perlin(rand);
  const freq = TYPES[params.type].freq, asp = H / W;
  const blobs = makeBlobs(params.type, rand, asp);
  const e = new Float32Array(N), m = new Float32Array(N), veg = new Float32Array(N), heat = new Float32Array(N);

  for (let y = 0; y < H; y++) { if (y % 16 === 0) yield [.3 * y / H, 'Levantando montañas']; for (let x = 0; x < W; x++) {
    const i = y * W + x, u = x / W, v = y / W, nx = u * freq, ny = v * freq;
    const wx = fbm(nW1, nx * .8 + 11.3, ny * .8 + 5.1, 3), wy = fbm(nW2, nx * .8 - 7.7, ny * .8 + 2.9, 3);
    let h = fbm(nE, nx + wx * .9 + .37, ny + wy * .9 + .71, 6);
    if (params.type !== 'salv') {
      const uu = u + wx * .08, vv = v + wy * .08;
      let mk = 0;
      for (const b of blobs) {
        const d = Math.hypot(uu - b.x, vv - b.y) / b.r;
        if (d < 1) { const s = 1 - d, val = s * s * (3 - 2 * s); if (val > mk) mk = val; }
      }
      h = h * .75 + mk * .55;
      const edge = Math.max(Math.abs(u * 2 - 1), Math.abs(v / asp * 2 - 1));
      if (edge > .85) h -= (edge - .85) / .15 * .4;
    }
    e[i] = h;
    m[i] = fbm(nM, nx * .7 + 3.3, ny * .7 + 9.1, 4);
    // Calor: la latitud manda (centro del mapa cálido, norte y sur fríos) más grandes regiones de ruido
    heat[i] = (1 - Math.abs(y / (H - 1) * 2 - 1)) * 1.1 + fbm(nT, u * 2.4 + 7.7, v * 2.4 + 1.3, 3) * .9;
    veg[i] = fbm(nV, u * 16 + .5, v * 16 + .5, 3) * .5 + .5;
  } }

  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) { if (e[i] < lo) lo = e[i]; if (e[i] > hi) hi = e[i]; }
  for (let i = 0; i < N; i++) e[i] = (e[i] - lo) / (hi - lo);

  // Erosión hidráulica: gotas de lluvia bajan por la pendiente arrastrando tierra y la sueltan al frenar.
  // Excava valles, afila crestas y deja llanuras de sedimento en lo bajo
  yield [.31, 'Erosionando el terreno'];
  const er = mulberry32(seedNum ^ 0xe205);
  for (let dI = 0, nD = Math.round(N * .6); dI < nD; dI++) {
    if (dI % 40000 === 0 && dI) yield [.31 + .02 * dI / nD, 'Erosionando el terreno'];
    let x = 1 + Math.floor(er() * (W - 2)), y = 1 + Math.floor(er() * (H - 2)), sed = 0, water = 1;
    for (let s = 0; s < 28; s++) {
      const i = y * W + x;
      let bj = -1, be = e[i];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        const j = ny * W + nx; if (e[j] < be) { be = e[j]; bj = j; }
      }
      if (bj < 0) { e[i] += sed; break; }                   // hoyo: deja todo lo que lleva
      const sl = e[i] - be, cap = sl * 3 * water;
      if (sed > cap) { const dep = (sed - cap) * .3; e[i] += dep; sed -= dep; }
      else { const ero = Math.min((cap - sed) * .3, sl * .45); e[i] -= ero; sed += ero; }
      x = bj % W; y = (bj / W) | 0; water *= .97;
    }
  }
  lo = Infinity; hi = -Infinity;
  for (let i = 0; i < N; i++) { if (e[i] < lo) lo = e[i]; if (e[i] > hi) hi = e[i]; }
  for (let i = 0; i < N; i++) e[i] = (e[i] - lo) / (hi - lo);
  const sortedE = Float32Array.from(e).sort();
  const sea = sortedE[Math.floor(params.water / 100 * (N - 1))], peakE = sortedE[Math.floor(.985 * (N - 1))];

  // Calas y bahías: mordiscos redondeados en la costa baja, centrados un poco tierra adentro
  yield [.32, 'Excavando calas y bahías'];
  const brand = mulberry32(seedNum ^ 0xba7), coast = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    if (e[i] >= sea && (e[i - 1] < sea || e[i + 1] < sea || e[i - W] < sea || e[i + W] < sea)) coast.push(i);
  }
  const lowland = sea + (1 - sea) * .3;
  for (let k = Math.round(coast.length / 110); k > 0 && coast.length; k--) {
    const i = coast[Math.floor(brand() * coast.length)], cx = i % W, cy = (i / W) | 0;
    let gx = e[i + 1] - e[i - 1], gy = e[i + W] - e[i - W]; const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
    const r = 2.5 + brand() * W / 55, push = r * (.45 + brand() * .4), bx = cx + gx * push, by = cy + gy * push;
    for (let y = Math.floor(by - r - 1); y <= by + r + 1; y++) for (let x = Math.floor(bx - r - 1); x <= bx + r + 1; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const j = y * W + x, d = Math.hypot((x - bx) / r, (y - by) / (r * .85));
      if (d < 1 && e[j] < lowland) e[j] = Math.min(e[j], sea - .012 - (1 - d) * .05);
    }
  }
  // Volcanes: islas volcánicas en mar abierto y algún volcán entre las montañas.
  // volc: 1 ceniza en las faldas, 2 roca volcánica en el cono, 3 lava (cráter y coladas)
  yield [.36, 'Alzando volcanes'];
  const volc = new Uint8Array(N), vid = new Uint8Array(N), volcanoes = [], vr = mulberry32(seedNum ^ 0x7015);
  // Tres tipos: cono (alto y empinado), escudo (ancho, bajo, muchas coladas) y caldera (lago de lava grande)
  const makeVolcano = (cx, cy, r) => {
    if (volcanoes.length >= 250) return;
    const kind = ['cono', 'escudo', 'caldera'][Math.floor(vr() * 3)], id = volcanoes.length + 1;
    const R = kind === 'escudo' ? r * 1.35 : r;
    const top = kind === 'escudo' ? sea + (1 - sea) * (.55 + vr() * .15) : Math.max(peakE, sea + (1 - sea) * (.88 + vr() * .12));
    const expo = kind === 'escudo' ? .55 : kind === 'caldera' ? .9 : 1.1 + vr() * .4;
    const crater = kind === 'caldera' ? .3 + vr() * .1 : kind === 'escudo' ? .1 : .12 + vr() * .06;
    const ang = vr() * Math.PI, sx = .75 + vr() * .5, sy = (.9 + vr() * .2) / sx, ca = Math.cos(ang), sa = Math.sin(ang);
    const box = Math.ceil(R * 1.4) + 1;
    for (let y = Math.floor(cy - box); y <= cy + box; y++) for (let x = Math.floor(cx - box); x <= cx + box; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const dx = x - cx, dy = y - cy, ux = (dx * ca + dy * sa) / sx, uy = (-dx * sa + dy * ca) / sy;
      const j = y * W + x, d = Math.hypot(ux, uy) / R * (1 + (h2(x, y, 21 + id) - .5) * .3);
      if (d >= 1) continue;
      const cone = sea - .02 + (top - sea + .02) * Math.pow(1 - d, expo);
      if (cone > e[j]) e[j] = cone;
      volc[j] = Math.max(volc[j], d < crater ? 3 : d < (kind === 'escudo' ? .7 : .5) ? 2 : 1);
      vid[j] = id;
    }
    // Las coladas no existen al empezar: nacen en cada erupción (ver updateVolcanoes)
    const state = vr() < .45 ? 'dormido' : 'activo';
    volcanoes.push({ x:Math.round(cx) * T + 2, y:Math.round(cy) * T + 2, cx:Math.round(cx), cy:Math.round(cy), r:R, crater, kind, id, state,
      t:5 + vr() * 25, heat:state === 'dormido' ? 0 : .55, bombs:[], flows:[] });
  };
  const nIsl = Math.max(1, Math.round(N / 50000 * (.6 + vr() * .8)));
  for (let k = 0, tries = 0; k < nIsl && tries < 500; tries++) {
    const r = 5 + vr() * W / 45, cx = r + 3 + vr() * (W - 2 * r - 6), cy = r + 3 + vr() * (H - 2 * r - 6);
    let ok = e[Math.round(cy) * W + Math.round(cx)] < sea;
    for (let s = 0; s < 16 && ok; s++) { const a = s / 16 * Math.PI * 2; if (e[Math.round(cy + Math.sin(a) * (r + 3)) * W + Math.round(cx + Math.cos(a) * (r + 3))] >= sea) ok = false; }
    if (ok) { makeVolcano(cx, cy, r); k++; }
  }
  for (let k = Math.round(N / 150000 + vr() * .9), tries = 0; k > 0 && tries < 3000; tries++) {
    const i = Math.floor(vr() * N);
    if (e[i] >= peakE) { makeVolcano(i % W, (i / W) | 0, 4 + vr() * W / 70); k--; }
  }
  yield [.4, 'Repartiendo climas'];

  // Sombra orográfica: el viento húmedo sopla del oeste; sobre el mar se carga de humedad, al subir una
  // montaña la descarga en forma de lluvia y la ladera de detrás queda seca. Además, las alturas son frías
  const rain = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    let hum = 1;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (e[i] < sea) { hum = Math.min(1, hum + .06); rain[i] = hum * .5; continue; }
      const rise = x > 0 ? Math.max(0, e[i] - e[i - 1]) : 0, p = Math.min(hum, hum * .025 + rise * 6 * hum);
      rain[i] = p * 8 + hum * .25;
      hum = Math.max(.15, hum - p * .7 - .003);
    }
  }
  for (let i = 0; i < N; i++) {
    m[i] = (m[i] + .5) * .62 + Math.min(1, rain[i]) * .38;
    heat[i] -= Math.max(0, e[i] - sea) / (1 - sea) * .9;
  }

  // Humedad por percentil: reparto uniforme 0..1
  const mIdx = new Uint32Array(N); for (let i = 0; i < N; i++) mIdx[i] = i;
  mIdx.sort((a, b) => m[a] - m[b]);
  const mp = new Float32Array(N); for (let k = 0; k < N; k++) mp[mIdx[k]] = k / (N - 1);
  for (let i = 0; i < N; i++) mIdx[i] = i;
  mIdx.sort((a, b) => heat[a] - heat[b]);
  const tp = new Float32Array(N); for (let k = 0; k < N; k++) tp[mIdx[k]] = k / (N - 1);

  // Lagos y ríos
  yield [.48, 'Trazando ríos y lagos'];
  const { filled, dir } = drainage(e, sea);
  const lake = new Uint8Array(N), river = new Uint8Array(N), flow = new Uint8Array(N).fill(5), slope = new Uint8Array(N);
  const land = [];
  for (let i = 0; i < N; i++) if (e[i] >= sea) { if (filled[i] - e[i] > .007) lake[i] = 1; else land.push(i); }
  if (params.rivers > 0) {
    const thresh = (N / 36000) * 450 * Math.pow(.07, params.rivers / 100);
    const order = land.slice().sort((a, b) => filled[b] - filled[a]);
    const acc = new Float32Array(N);
    for (const i of order) { acc[i] += .5 + mp[i]; const d = dir[i]; if (d >= 0) acc[d] += acc[i]; }
    // Ancho del río según el caudal: ~5 casillas los arroyos, hasta ~10 los ríos grandes, a escala de
    // aldeanos (~1,5 casillas) y animales (una oveja ~3): hasta el arroyo más fino es más ancho que una vaca
    // flow guarda hacia dónde corre el agua (para animar la corriente)
    for (const i of land) if (acc[i] > thresh) {
      const cx = i % W, cy = (i / W) | 0, d = dir[i];
      const fx = d >= 0 ? (d % W) - cx : 0, fy = d >= 0 ? ((d / W) | 0) - cy : 1;
      const sl = d >= 0 ? Math.round(clamp((e[i] - e[d]) * 60, 0, 1) * 255) : 0; // pendiente: rápidos o remanso
      const R = acc[i] > thresh * 20 ? 5 : acc[i] > thresh * 5 ? 3.6 : 2.5;
      // Meandros: en terreno llano el cauce se desplaza a un lado y a otro de su línea de caída
      const amp = sl < 50 ? 2.8 : sl < 120 ? 1.2 : 0, off = Math.round(Math.sin(cx * .31 + cy * .27 + seedNum % 7) * amp);
      const ox = Math.round(-fy * off), oy = Math.round(fx * off);
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const x = cx + ox + dx, y = cy + oy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const j = y * W + x;
        if (e[j] >= sea && !lake[j]) { if (!river[j]) flow[j] = (fx + 1) * 3 + (fy + 1); river[j] = 1; slope[j] = Math.max(slope[j], sl); }
      }
    }
    // Deltas: los ríos grandes se abren en dos brazos al llegar al mar
    for (const i of land) {
      if (!river[i] || acc[i] < thresh * 5) continue;
      const cx = i % W, cy = (i / W) | 0;
      if (!((cx > 0 && e[i - 1] < sea) || (cx < W - 1 && e[i + 1] < sea) || (cy > 0 && e[i - W] < sea) || (cy < H - 1 && e[i + W] < sea))) continue;
      const f = flow[i], fx = Math.floor(f / 3) - 1, fy = f % 3 - 1;
      if (!fx && !fy) continue;
      for (const side of [-1, 1]) {
        let a = Math.atan2(fy, fx) + side * .75, x = cx - fx * 6, y = cy - fy * 6;
        for (let s = 0; s < 10; s++) {
          x += Math.cos(a); y += Math.sin(a); a -= side * .1;
          const tx = Math.round(x), ty = Math.round(y);
          if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
          const j = ty * W + tx; if (e[j] < sea || lake[j]) break;
          const fl = (Math.round(Math.cos(a)) + 1) * 3 + (Math.round(Math.sin(a)) + 1);
          for (const k of [j, ...nb4i(j)]) if (e[k] >= sea && !lake[k]) { river[k] = 1; slope[k] = 0; flow[k] = fl; }
        }
      }
    }
    // Bosque de ribera: las orillas de ríos y lagos son mucho más húmedas
    for (let i = 0; i < N; i++) if (river[i] || lake[i]) {
      const cx = i % W, cy = (i / W) | 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const j = y * W + x, b = .2 * (1 - Math.hypot(dx, dy) / 5.3);
        if (b > 0 && mp[j] < 1.3) mp[j] += b * .6;
      }
    }
  }

  // Cortes de altitud por percentil de la tierra
  const le = land.map(i => e[i]).sort((a, b) => a - b);
  const q = p => le.length ? le[Math.floor(p * (le.length - 1))] : 1;
  const cuts = { sand:q(.03), swamp:q(.3), hills:q(.8), rock:q(.93), snow:q(.975), high:q(.5) };

  // Distancia al mar (en casillas, hasta 4) para las playas
  yield [.56, 'Dibujando playas'];
  const cdist = new Uint8Array(N).fill(255), bq = [];
  for (let i = 0; i < N; i++) if (e[i] < sea) { cdist[i] = 0; bq.push(i); }
  for (let h = 0; h < bq.length; h++) {
    const i = bq[h], d = cdist[i]; if (d >= 4) continue;
    const x = i % W;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W])
      if (j >= 0 && j < N && cdist[j] === 255) { cdist[j] = d + 1; bq.push(j); }
  }

  world = { e, mp, tp, veg, lake, river, flow, slope, volc, vid, volcanoes, lavaT:new Float32Array(N), lavaTiles:new Map(), scour:new Uint8Array(N), scourT:new Map(), graze:new Float32Array(N), sea, cuts, cdist, biome:new Uint8Array(N), objs:new Array(N).fill(null), rare:[] };
  for (let i = 0; i < N; i++) world.biome[i] = classify(i);

  // Objetos con separación mínima, en orden aleatorio
  yield [.62, 'Plantando bosques'];
  const r = mulberry32(seedNum ^ 0x9e3779b9);
  const order = new Uint32Array(N); for (let i = 0; i < N; i++) order[i] = i;
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  const D = params.dens / 100;
  for (let n = 0; n < N; n++) {
    if (n % 40000 === 0) yield [.62 + .08 * n / N, 'Plantando bosques'];
    const i = order[n], key = randomObject(i, r, D);
    if (key) placeObject(i, key, r);
  }
  buildRareList();

  // Placas tectónicas: regiones de Voronoi deformadas con ruido, cada una con su movimiento.
  // Las fronteras son convergentes (chocan), divergentes (se separan) o transformantes (rozan de lado)
  yield [.71, 'Dividiendo placas tectónicas'];
  const pr = mulberry32(seedNum ^ 0x51a7e), nWp = perlin(pr);
  const nPl = clamp(Math.round(5 + N / 40000 + pr() * 3), 5, 16), plates = [];
  for (let k = 0; k < nPl; k++) plates.push({ x:pr() * W, y:pr() * H, vx:pr() * 2 - 1, vy:pr() * 2 - 1, hue:(k * 137.5) % 360, sx:0, sy:0, n:0 });
  const plate = new Uint8Array(N), pb = new Uint8Array(N), pbList = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + fbm(nWp, x / W * 4, y / W * 4, 3) * W * .14, wy = y + fbm(nWp, x / W * 4 + 9.1, y / W * 4 + 3.7, 3) * W * .14;
    let best = 0, bd = Infinity;
    for (let k = 0; k < nPl; k++) { const dx = wx - plates[k].x, dy = wy - plates[k].y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
    const i = y * W + x; plate[i] = best;
    const P = plates[best]; P.sx += x; P.sy += y; P.n++;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x + dx >= W || y + dy >= H) continue;
      const j = i + dx + dy * W, a = plates[plate[i]], b = plates[plate[j]];
      if (plate[i] === plate[j]) continue;
      const approach = -((b.vx - a.vx) * dx + (b.vy - a.vy) * dy);
      const type = approach > .4 ? 1 : approach < -.4 ? 2 : 3;
      if (!pb[i]) pbList.push(i);
      pb[i] = pb[j] = type;
    }
  }
  for (const P of plates) { P.cx = P.n ? P.sx / P.n : P.x; P.cy = P.n ? P.sy / P.n : P.y; }
  Object.assign(world, { plate, pb, pbList, plates });
}

function classify(i){
  const { e, mp, lake, river, sea, cuts } = world;
  if (lake[i]) return B.LAKE;
  if (e[i] < sea) { const d = (sea - e[i]) / sea; return d < .1 ? B.SHALLOW : d < .45 ? B.SEA : B.DEEP; }
  const vo = world.volc[i];
  if (vo === 3) return B.LAVA;
  if (river[i]) return B.RIVER;
  if (world.scour && world.scour[i]) return B.DIRT; // por aquí pasó un tornado
  if (vo === 2) return B.BASALT;
  if (vo === 1) return B.ASH;
  const h = e[i], mm = clamp(mp[i] + params.humid / 100, 0, 1.3), tp = world.tp[i];
  // Transiciones irregulares: un poco de ruido en los límites de altura; y en las laderas que miran
  // al norte (umbría) la nieve baja más
  const span = cuts.snow - cuts.rock, nz = (h2(i, 3, 99) - .5) * span * .7;
  const north = i >= W && e[i - W] < h ? span * .5 : 0;
  if (h + nz + north >= cuts.snow || (tp < .1 && h >= cuts.hills)) return B.SNOW;
  if (h + nz * .6 >= cuts.rock) return B.ROCK;
  if (h + nz * .6 >= cuts.hills) return B.HILLS;
  // Playa: franja de 1 a 3 casillas junto al mar, salvo en costas altas (acantilados)
  const bw = 1 + (world.veg[i] > .5 ? 1 : 0) + (world.veg[i] > .64 ? 1 : 0);
  if (h < cuts.sand || (world.cdist[i] <= bw && h < cuts.high && (h - sea) / (1 - sea) < .1)) return B.SAND;
  // Zonas polares: hielo y tundra en el norte y el sur del mapa
  if (tp < .05) return B.SNOW;
  if (tp < .13) return B.TUNDRA;
  if (world.tp[i] - mm * .7 > .52) return B.DESERT; // calor alto y poca humedad
  if (mm > .8 && h < cuts.swamp) return B.SWAMP;
  if (mm > .7) return B.FOREST;
  if (mm > .48) return B.GRASS;
  if (mm > .18) return B.PLAINS;
  return B.DRY;
}

function rollTier(r, rich){
  const p = r(), t = rich ? [.003, .012, .045, .15] : [.0025, .012, .04, .14];
  return p < t[0] ? 4 : p < t[1] ? 3 : p < t[2] ? 2 : p < t[3] ? 1 : 0;
}
function fromTable(table, tier){ for (let k = tier; k >= 0; k--) if (table[k]) return table[k]; return null; }
function treeTable(i){
  const b = world.biome[i];
  if (b === B.SNOW) return TREES.snow;
  if (b === B.HILLS || b === B.ROCK || b === B.ASH || (b === B.FOREST && world.e[i] > world.cuts.high)) return TREES.conif;
  if (b === B.DRY) return TREES.dry;
  if (b === B.SWAMP) return TREES.swamp;
  if (b === B.SAND) return TREES.sand;
  if (b === B.DESERT) return TREES.desert;
  if (b === B.TUNDRA) return TREES.snow;
  if (world.tp[i] < .22) return TREES.conif; // taiga: bosques de coníferas en las zonas frías
  return TREES.broad;
}
function isCoast(i){
  const x = i % W, y = (i / W) | 0, bi = world.biome;
  return (x > 0 && WATER[bi[i - 1]]) || (x < W - 1 && WATER[bi[i + 1]]) || (y > 0 && WATER[bi[i - W]]) || (y < H - 1 && WATER[bi[i + W]]);
}
function randomObject(i, r, D){
  const b = world.biome[i], v = world.veg[i];
  let tree = 0, bush = 0, rock = 0, rich = false;
  switch (b) {
    case B.SAND:   tree = (isCoast(i) ? .07 : .015) * D; rock = .003; break;
    case B.DRY:    tree = .05 * D * (.4 + v * 1.6); bush = .015 * D; rock = .006; break;
    case B.GRASS:  tree = .03 * D * (v > .62 ? 4 : v < .45 ? .3 : 1); bush = .025 * D; rock = .002; break;
    case B.PLAINS: tree = .006 * D * (v > .72 ? 4 : 1); bush = .015 * D; rock = .002; break;
    case B.DESERT: tree = .03 * D * (.5 + v); rock = .006; break;
    case B.FOREST: tree = .6 * D * (v < .4 ? .15 : .5 + v); bush = .03 * D; break; // claros donde v es bajo
    case B.SWAMP:  tree = .18 * D * (.5 + v); bush = .02 * D; break;
    case B.HILLS:  tree = .12 * D * (.5 + v); rock = .018; rich = true; break;
    case B.ROCK:   tree = .02 * D; rock = .05; rich = true; break;
    case B.SNOW:   tree = .06 * D; rock = .01; rich = true; break;
    case B.ASH:    tree = .015 * D; rock = .008; break;
    case B.TUNDRA: tree = .012 * D; bush = .006 * D; rock = .01; break;
    case B.BASALT: rock = .012; break;
    default: return null;
  }
  tree = Math.min(tree, .9);
  const p = r();
  if (p < tree) return fromTable(treeTable(i), rollTier(r, false));
  if (p < tree + bush) return fromTable(BUSHES, rollTier(r, false));
  if (p < tree + bush + rock) { // en la montaña, muchas vetas (hierro sobre todo, algo de oro y alguna gema); en el llano, pocas
    const q = r();
    if (rich) { if (q < .3) return 'ore:iron'; if (q < .39) return 'ore:gold'; if (q < .42) return 'gem:amethyst'; if (q < .43) return 'gem:mana'; }
    else { if (q < .1) return 'ore:iron'; if (q < .13) return 'ore:gold'; }
    const t = rollTier(r, rich); return t === 0 && r() < .45 ? 'rock:stone' : ROCKS[rich ? t : Math.min(t, 1)];
  }
  return null;
}
// Separación mínima (en casillas) para dejar huecos por donde vean y caminen los aldeanos
function spacing(i, key){
  if (key.startsWith('ancient')) return 5.4; // en casillas; los árboles son altos y anchos, así que van más separados
  if (OBJ[key][1] !== 'tree') return 1.6;
  const b = world.biome[i];
  return b === B.FOREST || b === B.SWAMP ? 3.5 : 4.4;
}
function isFree(i, R){
  const cx = i % W, cy = (i / W) | 0, objs = world.objs, r = Math.ceil(R);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > R * R) continue;
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (objs[y * W + x]) return false;
  }
  return true;
}
// Ciclo de vida de los árboles (en años del mundo; 1 año = 4 estaciones)
const YEAR = 4 * 60;
const LIFESPAN = { oak:[3, 5], birch:[2, 3], pine:[3, 5], acacia:[3, 4], willow:[2.5, 4], palm:[2, 3], cactus:[4, 6], ancient:[10, 15] };
// Clima de cada especie de árbol: [ideal, frío que aguanta, calor que aguanta] en °C. Cada árbol desplaza ese
// rango con su adaptación (o.ad), que hereda de su padre al nacer de semilla
const TREE_CLIMA = { oak:[12, -25, 32], birch:[6, -35, 26], pine:[2, -40, 24], acacia:[26, -2, 44], willow:[14, -20, 32], palm:[26, 0, 42], cactus:[30, -5, 48], ancient:[10, -30, 34] };
const treeClima = o => TREE_CLIMA[o.key.split(':')[0]];
// Los árboles van con su propio reloj, mucho más lento que el de la gente: viven meses de juego, no días
// (si no, todo el bosque se moría a la vez en una estación y en otoño, sin semillas, no volvía a crecer)
const TREE_YEAR = YEAR * 16; // (un año de árbol ≈ una estación y pico: la vida media, más de un año de calendario)
function treeStage(o){
  const age = (yearT - o.born) / TREE_YEAR;
  if (age < .3) return 'b';
  if (age < 1) return 'j';
  if (age < o.life * .8) return 'a';
  if (age < o.life) return 'v';
  if (age < o.life + .4) return 'm';
  return null; // se cae y desaparece
}
const STAGE_NAMES = { b:'brote', j:'joven', a:'adulto', v:'viejo', m:'muerto' };
// Cada árbol cambia de aspecto con la estación a su ritmo: hasta 3 días después del cambio (su retraso es fijo y al azar)
// Frecuencia de catástrofes naturales (control del panel): 1 = la de antes; por defecto, la mitad
const disasterF = () => params.disasters / 100;
const SEASON_SPREAD = 360; // los árboles tardan unos 2 días en cambiar todos de aspecto
let prevSeason = 1, seasonChangeT = -1e9;
const treeSeason = o => yearT - seasonChangeT < (o.sd ??= Math.random()) * SEASON_SPREAD ? prevSeason : spriteSeason;
// Plan del cambio de estación: cada árbol recibe su momento según la distancia al centro más cercano (con algo
// de ruido para que el borde no sea un círculo perfecto). Los trozos de 12×12 casillas se repintan cuando les toca
let seasonEvents = [], SC_W = 1;
function planSeasonChange(){
  const n = 4 + Math.round(N / 25000), centers = [];
  for (let k = 0; k < n; k++) centers.push([Math.random() * W, Math.random() * H]);
  const objs = world.objs, dist = new Float32Array(N); let maxD = 1;
  for (let i = 0; i < N; i++) {
    if (!objs[i]) continue;
    const x = i % W, y = (i / W) | 0; let d = 1e9;
    for (const [cx, cy] of centers) d = Math.min(d, Math.hypot(x - cx, y - cy));
    dist[i] = d; if (d > maxD) maxD = d;
  }
  SC_W = Math.ceil(W / 12);
  const due = new Map(); // trozo → momentos (en pasos de 0,25) en que alguno de sus árboles cambia
  for (let i = 0; i < N; i++) {
    const o = objs[i]; if (!o) continue;
    const x = i % W, y = (i / W) | 0;
    o.sd = clamp(dist[i] / maxD + (h2(x >> 1, y >> 1, 131) - .5) * .12, 0, 1);
    const c = Math.floor(y / 12) * SC_W + Math.floor(x / 12), step = Math.ceil(o.sd * SEASON_SPREAD * 4) / 4;
    let set = due.get(c); if (!set) due.set(c, set = new Set()); set.add(step);
  }
  seasonEvents = [];
  for (const [c, set] of due) for (const st of set) seasonEvents.push([st + .02, c]);
  seasonEvents.sort((a, b) => b[0] - a[0]); // al final de la lista, los que tocan antes
}
const treeRace = o => o.ad === undefined ? '' : o.ad < -6 ? 'f' : o.ad > 6 ? 'c' : '';
const objSprite = o => { const s0 = (typeof artSprite === 'function' && artSprite(o)) || sprite(o.key, o.v, treeSeason(o), o.st || 'a', o.sz ?? 1, treeRace(o)); /* dibujo nuevo, si lo hay */ return o.burnt ? burntOf(s0) : o.dmg > .3 ? ruinedOf(s0) : s0; };
// Edificio chamuscado: ennegrecido pero se adivina lo que era. Medio derruido: con agujeros en el tejado y grietas
const burntCache = new WeakMap(), ruinCache = new WeakMap();
function burntOf(s0){
  let c = burntCache.get(s0); if (c) return c;
  c = document.createElement('canvas'); c.width = s0.width; c.height = s0.height; const x = c.getContext('2d');
  x.drawImage(s0, 0, 0); x.globalAlpha = .78; x.drawImage(charred(s0), 0, 0); x.globalAlpha = 1;
  x.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 6; k++) { const px = Math.floor(((k * 37) % 97) / 97 * c.width), py = Math.floor(((k * 53) % 89) / 89 * c.height * .45); x.fillRect(px, py, 2 + (k % 3), 2); }
  c.ax = s0.ax; burntCache.set(s0, c); return c;
}
function ruinedOf(s0){
  let c = ruinCache.get(s0); if (c) return c;
  c = document.createElement('canvas'); c.width = s0.width; c.height = s0.height; const x = c.getContext('2d');
  x.drawImage(s0, 0, 0);
  x.globalCompositeOperation = 'destination-out'; // boquetes en el tejado
  for (let k = 0; k < 5; k++) { const px = Math.floor(((k * 41 + 7) % 89) / 89 * (c.width - 4)), py = Math.floor(((k * 29 + 3) % 61) / 61 * c.height * .4); x.fillRect(px, py, 3 + (k % 3), 2 + (k % 2)); }
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(30,22,16,.85)'; // grietas
  for (let k = 0; k < 3; k++) { let px = Math.floor(c.width * (.25 + k * .25)), py = Math.floor(c.height * .45); for (let n = 0; n < 6; n++) { x.fillRect(px, py, 1, 1); py++; px += (n + k) % 3 - 1; } }
  c.ax = s0.ax; ruinCache.set(s0, c); return c;
}
// vig (vigor, 0..1): la "fuerza" del árbol. Se hereda de la planta madre con pequeñas mutaciones;
// cuanto más vigor, más probable que sobreviva al crecer, más vive y más semillas deja
function placeObject(i, key, r, born, vig){
  const ok = placeObjectRaw(i, key, r);
  const L = ok && LIFESPAN[key.split(':')[0]];
  if (L) {
    const o = world.objs[i];
    o.vig = vig ?? .3 + r() * .5;
    o.life = (L[0] + r() * (L[1] - L[0])) * (.8 + .4 * o.vig);
    o.born = born ?? yearT - r() * o.life * .85 * TREE_YEAR; // al generar el mundo hay árboles de todas las edades
    o.sz = Math.floor(r() * 3);
    o.st = treeStage(o);
  }
  return ok;
}
function placeObjectRaw(i, key, r){
  if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || !isFree(i, spacing(i, key))) return false;
  world.objs[i] = { key, v:Math.floor(r() * 4), ox:Math.floor(r() * 3) - 1, oy:Math.floor(r() * 2) };
  return true;
}
function buildRareList(){
  const list = [];
  for (let i = 0; i < N; i++) {
    const o = world.objs[i]; if (!o) continue;
    const tier = OBJ[o.key][2]; if (tier < 2) continue;
    const s = objSprite(o), tx = i % W, ty = (i / W) | 0;
    list.push({ i, key:o.key, tier, px:tx * T + 2 + o.ox, py:ty * T + 3 + o.oy, w:s.width, h:s.height, seed:h2(tx, ty, 9) });
  }
  world.rare = list;
}

// ================= Pintado =================
const terrain = document.createElement('canvas'), tctx = terrain.getContext('2d');
const worldCv = document.createElement('canvas'), wctx = worldCv.getContext('2d');
let img = null, pt = null;

function resizeCanvases(){
  terrain.width = worldCv.width = PW; terrain.height = worldCv.height = PH;
  img = tctx.createImageData(PW, PH);
  // Cada píxel lee su casilla con un desplazamiento aleatorio de ±1: bordes dentados entre biomas
  pt = new Int32Array(PW * PH);
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    let qx = px, qy = py;
    const a = h2(px, py, 1), c = h2(px, py, 2);
    if (a < .5) qx += a < .25 ? -1 : 1;
    if (c < .5) qy += c < .25 ? -1 : 1;
    qx = clamp(qx, 0, PW - 1); qy = clamp(qy, 0, PH - 1);
    pt[py * PW + px] = ((qy / T) | 0) * W + ((qx / T) | 0);
  }
}

function paintRegion(x0, y0, x1, y1){
  x0 = clamp(x0, 0, W - 1); y0 = clamp(y0, 0, H - 1); x1 = clamp(x1, 0, W - 1); y1 = clamp(y1, 0, H - 1);
  const { e, biome, sea } = world, Dd = img.data;
  const kLow = 14 * W / 240, kHigh = 26 * W / 240;
  const wet = k => WATER[biome[pt[k]]];
  const px0 = x0 * T, py0 = y0 * T, px1 = (x1 + 1) * T - 1, py1 = (y1 + 1) * T - 1;
  for (let py = py0; py <= py1; py++) for (let px = px0; px <= px1; px++) {
    const k = py * PW + px, ti = pt[k], b = biome[ti];
    let r, g, bl;
    if (WATER[b]) {
      const ocean = b <= B.SHALLOW;
      const near1 = (px > 0 && !wet(k - 1)) || (px < PW - 1 && !wet(k + 1)) || (py > 0 && !wet(k - PW)) || (py < PH - 1 && !wet(k + PW));
      const near2 = !near1 && ((px > 1 && !wet(k - 2)) || (px < PW - 2 && !wet(k + 2)) || (py > 1 && !wet(k - 2 * PW)) || (py < PH - 2 && !wet(k + 2 * PW)));
      if (near1 && ocean) [r, g, bl] = FOAM_C;
      else {
        let c;
        if (ocean) {
          const t = Math.pow(clamp((sea - e[ti]) / sea, 0, 1), .6) * 5 + (h2(px, py, 5) - .5) * .35; // tramado suave entre tonos de profundidad
          const s = clamp(Math.floor(t), 0, 5) / 5;
          c = s === 0 ? TURQ_C : [SHALLOW_C[0] + (DEEP_C[0] - SHALLOW_C[0]) * s, SHALLOW_C[1] + (DEEP_C[1] - SHALLOW_C[1]) * s, SHALLOW_C[2] + (DEEP_C[2] - SHALLOW_C[2]) * s];
        } else c = b === B.LAKE ? LAKE_C : RIVER_C;
        // Cascadas y rápidos: espuma blanca donde el río baja con mucha pendiente
        if (b === B.RIVER && world.slope[ti] > 210 && h2(px, py, 77) < .35) c = [222,238,250];
        let f = 1 + (h2(px, py, 5) - .5) * .02;
        if (near2 || (near1 && !ocean)) f *= 1.12;
        if (h2(px, py, 6) > .9988) f = 1.18;
        r = c[0] * f; g = c[1] * f; bl = c[2] * f;
      }
    } else {
      if (b === B.LAVA) { // lava: manchas incandescentes con costra oscura
        const lv = h2(px >> 1, py >> 1, 22), o = k * 4;
        const c = lv > .72 ? [255,196,80] : lv > .25 ? [232,98,30] : [128,36,20];
        Dd[o] = c[0]; Dd[o + 1] = c[1]; Dd[o + 2] = c[2]; Dd[o + 3] = 255; continue;
      }
      let base = groundColor(b);
      // Transición entre biomas: cerca de un borde, algunos píxeles toman el color del bioma vecino
      // (hierba que se seca hacia la sabana, roca que asoma entre la hierba…)
      if (h2(px, py, 9) < .18) {
        const sx = clamp(px + Math.round((h2(px, py, 10) - .5) * 5), 0, PW - 1), sy = clamp(py + Math.round((h2(px, py, 11) - .5) * 5), 0, PH - 1);
        const b2 = biome[pt[sy * PW + sx]];
        if (b2 !== b && !WATER[b2] && b2 !== B.LAVA) base = base.map((v, j) => (v + groundColor(b2)[j]) / 2);
      }
      const lh = (e[ti] - sea) / (1 - sea);
      // Acantilado: costa alta, pared de roca en vez de playa
      const wetBelow = py < PH - 1 && wet(k + PW), wetSide = (px > 0 && wet(k - 1)) || (px < PW - 1 && wet(k + 1)) || (py > 0 && wet(k - PW)) || wetBelow;
      if (wetSide && lh > .12) base = [112,104,96];
      let f = 1 + (h2(px, py, 3) - .5) * .08;
      if (params.relief) {
        const tx = ti % W, ty = (ti / W) | 0;
        if (tx > 0 && ty > 0) f *= 1 + clamp((e[ti] - e[ti - W - 1]) * ((b >= B.HILLS && b <= B.SNOW) || b >= B.BASALT ? kHigh : kLow), -.3, .3);
        // Escalones de altura (curvas de nivel): borde oscuro en la cara sur de cada nivel y luz en la norte
        if (py < PH - 1 && pt[k + PW] !== ti) {
          const tb = pt[k + PW];
          if (!WATER[biome[tb]] && Math.floor(lh * 16) > Math.floor((e[tb] - sea) / (1 - sea) * 16)) f *= .74;
        }
        if (py > 0 && pt[k - PW] !== ti) {
          const ta = pt[k - PW];
          if (!WATER[biome[ta]] && Math.floor(lh * 16) > Math.floor((e[ta] - sea) / (1 - sea) * 16)) f *= 1.08;
        }
      }
      if (wetBelow && lh > .12) f *= .62; // sombra de la pared del acantilado sobre el agua
      const hd = h2(px, py, 4);
      // Detalles del suelo: matas de hierba, flores silvestres y piedrecitas
      if ((b === B.GRASS || b === B.PLAINS || b === B.FOREST) && hd > .965) f *= .82;
      else if ((b === B.GRASS || b === B.PLAINS || b === B.FOREST) && py < PH - 1 && h2(px, py + 1, 4) > .965) f *= 1.18;
      const fl = h2(px, py, 12);
      if ((b === B.GRASS || b === B.PLAINS) && fl > .993) {
        const o = k * 4, c = fl > .9977 ? [246,240,226] : fl > .9953 ? [240,214,92] : [176,140,220];
        Dd[o] = c[0]; Dd[o + 1] = c[1]; Dd[o + 2] = c[2]; Dd[o + 3] = 255; continue;
      }
      if ((b === B.HILLS || b === B.DRY || b === B.DESERT || b === B.TUNDRA) && fl > .985) f *= .7;           // piedrecitas
      if (b === B.HILLS && fl > .93 && biome[ti + 1] === B.ROCK) f *= .78;                                     // canchal al pie de la roca
      if ((b === B.GRASS || b === B.FOREST || b === B.DRY || b === B.SWAMP) && hd > .94) f *= 1.12;
      if ((b === B.ROCK || b === B.HILLS || b === B.BASALT || b === B.ASH || b === B.DIRT) && hd > .9) f *= .86;
      if (b === B.DIRT && hd < .06) f *= 1.15; // terrones sueltos
      if (b === B.SNOW && hd > .93) f *= .94;
      if (b === B.DESERT) f *= 1 + .07 * Math.sin(px * .45 + py * 1.1 + h2(px >> 3, py >> 3, 8) * 3); // dunas
      if (b === B.PLAINS && hd > .985) { const o = k * 4; Dd[o] = 236; Dd[o + 1] = 222; Dd[o + 2] = 120; Dd[o + 3] = 255; continue; } // flores
      if (b === B.SWAMP && hd < .1) { const o = k * 4; Dd[o] = 58; Dd[o + 1] = 92; Dd[o + 2] = 86; Dd[o + 3] = 255; continue; } // charcos
      if (wetSide) f *= .85;
      else if (b === B.SAND && ((px > 2 && wet(k - 3)) || (px < PW - 3 && wet(k + 3)) || (py > 2 && wet(k - 3 * PW)) || (py < PH - 3 && wet(k + 3 * PW)))) f *= .92; // arena mojada
      r = base[0] * f; g = base[1] * f; bl = base[2] * f;
    }
    const o = k * 4;
    Dd[o] = r; Dd[o + 1] = g; Dd[o + 2] = bl; Dd[o + 3] = 255; // Uint8ClampedArray recorta solo
  }
  tctx.putImageData(img, 0, 0, px0, py0, px1 - px0 + 1, py1 - py0 + 1);
}

function composeRegion(x0, y0, x1, y1){
  x0 = clamp(x0, 0, W - 1); y0 = clamp(y0, 0, H - 1); x1 = clamp(x1, 0, W - 1); y1 = clamp(y1, 0, H - 1);
  const px0 = x0 * T, py0 = y0 * T, pw = (x1 - x0 + 1) * T, ph = (y1 - y0 + 1) * T;
  wctx.save();
  wctx.beginPath(); wctx.rect(px0, py0, pw, ph); wctx.clip();
  wctx.clearRect(px0, py0, pw, ph); // worldCv es solo la capa de objetos; el terreno se dibuja aparte
  if (params.objects) {
    const objs = world.objs;
    // Los objetos se dibujan fila a fila: los de abajo tapan a los de arriba
    for (let ty = Math.max(0, y0 - 1); ty <= Math.min(H - 1, y1 + 16); ty++)
      for (let tx = Math.max(0, x0 - 14); tx <= Math.min(W - 1, x1 + 14); tx++) { // (14: lo más ancho, el aeródromo, sobresale 13 casillas de su punto)
        const wi = ty * W + tx; if (typeof wallSet !== 'undefined' && (wallSet.has(wi) || gateSet.has(wi))) { const keep = vctx; vctx = wctx; try { (gateSet.has(wi) ? paintGateTile : paintWallTile)(wi); } finally { vctx = keep; } } // la muralla, en su fila (defensa.js)
        const o = objs[wi]; if (!o) continue;
        const s = objSprite(o), cx = tx * T + 2 + o.ox, by = ty * T + 3 + o.oy;
        wctx.fillStyle = 'rgba(0,0,0,.24)';
        wctx.fillRect(cx - (s.width >> 2), by, (s.width >> 1) + 1, 2);
        wctx.drawImage(s, cx - s.ax, by - s.height + 1);
      }
  }
  wctx.restore();
}
const repaintAll = () => { paintRegion(0, 0, W - 1, H - 1); composeRegion(0, 0, W - 1, H - 1); };
