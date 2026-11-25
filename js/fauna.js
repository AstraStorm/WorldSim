// World Sim · Animales
// ================= Fauna =================
// Cada animal tiene edad, esperanza de vida y hambre. Los herbívoros pastan (y la hierba comida tarda en
// volver a crecer); los carnívoros cazan a sus presas, que huyen al verlos; gatos y osos pescan en los
// bancos de peces y los osos también comen bayas. Vacas, ovejas y pollos van en rebaño, los lobos en manada
// y gatos y osos son solitarios. Los adultos bien alimentados crían en primavera y verano; las crías siguen
// a su madre hasta hacerse adultas. Mueren de viejos, de hambre o devorados.
// Sprites de animales dibujados a mano, píxel a píxel, en vista lateral mirando a la derecha.
// rows: cuerpo y cabeza · legs: las patas en dos posturas al andar · pals: variantes de color.
// L/W/D son los tonos claro, medio y oscuro del pelaje (luz desde arriba); el contorno se añade solo,
// del color del pelaje oscurecido (más suave que el negro)
// Tamaño real respecto a un aldeano (7×12): la oveja le llega por la cintura y un árbol le saca varias veces
const ANIMAL_ART = {
  vaca: {
    rows:[
      '..............hh...',
      '.............EHHH..',
      '.LLbbLLLLLLLLLHkHH.',
      'tWbbbWWWWWbbWWWHHmm',
      'tWWbWWWWWWbbbWWHmmn',
      'tWWWWWWWWWWbWWW....',
      '.DDDDDDDDDDDDDD....'],
    legs:[
      ['.DD.DD..uu..DD.DD..', '.DD.DD......DD.DD..', '.oo.oo......oo.oo..'],
      ['.DD.DD..uu..DD.DD..', 'DD...DD....DD...DD.', 'oo...oo....oo...oo.']],
    pals:[
      { L:'#ffffff', W:'#ece6da', D:'#c4baa8', b:'#2e2a28', h:'#efe4c8', p:'#eaa8a0', n:'#b06a64', e:'#1a1410', u:'#e8a0a0', o:'#3a3028', t:'#2e2a28', H:'#ffffff', E:'#ece6da', k:'#1a1410', m:'#eaa8a0' },
      { L:'#b07c52', W:'#90603c', D:'#6c4428', b:'#f0e8dc', h:'#efe4c8', p:'#e0a090', n:'#9a5a50', e:'#1a1410', u:'#e0a090', o:'#2a1c14', t:'#4a2e1c', H:'#b07c52', E:'#90603c', k:'#1a1410', m:'#e0a090' }] },
  caballo: {
    rows:[
      '............MML....',
      '...........MMLLLL..',
      '...........MLLLkLL.',
      '..........MLLL..LLn',
      '.LLLLLLLLLLLLL.....',
      'TWWWWWWWWWWWWW.....',
      'TTWWWWWWWWWWWW.....',
      'T.DDDDDDDDDDDD.....'],
    legs:[
      ['..D.D.....D.D......', '..D.D.....D.D......', '..o.o.....o.o......'],
      ['.D...D...D...D.....', '.D...D...D...D.....', '.o...o...o...o.....']],
    pals:[
      { L:'#b0723e', W:'#8e5630', D:'#663c20', M:'#2a1a12', T:'#2a1a12', k:'#120c08', n:'#3a2418', o:'#2a1e16' },
      { L:'#4a4038', W:'#342c26', D:'#221c18', M:'#141010', T:'#141010', k:'#000000', n:'#0e0a08', o:'#100c0a' },
      { L:'#ece8e0', W:'#d4cec4', D:'#aaa298', M:'#9a948c', T:'#9a948c', k:'#1a1410', n:'#6a6058', o:'#4a4038' },
      { L:'#c4843a', W:'#a2662a', D:'#7a4a1c', M:'#f0e0b0', T:'#f0e0b0', k:'#1a1008', n:'#4a2a14', o:'#3a2614' }] },
  oveja: {
    rows:[
      '..LLL.LL......',
      '.LLLLLLLLL....',
      'LLWLLLWLLLkk..',
      'LWLLWLLLWLkekk',
      'WLWWLWWLWWkkn.',
      '.WDWWDWWDW....'],
    legs:[
      ['.k.k...k.k....', '.o.o...o.o....'],
      ['k.k.....k.k...', 'o.o.....o.o...']],
    pals:[
      { L:'#fbf8f0', W:'#e2dccc', D:'#bdb5a2', k:'#3e3532', e:'#f0e8dc', n:'#3e3532', o:'#1c1614' },
      { L:'#ece4d2', W:'#d0c6b0', D:'#a89c84', k:'#241e1c', e:'#e0d8c8', n:'#241e1c', o:'#120e0e' }] },
  pollo: {
    rows:[
      '...r.',
      '..Ley',
      't.LL.',
      'tLWW.',
      '.WDD.'],
    legs:[
      ['.y.y.'],
      ['y...y']],
    pals:[
      { L:'#ffffff', W:'#e8e4da', D:'#c4bcae', r:'#e03a30', y:'#f0a830', e:'#1a1410', t:'#d0cabc' },
      { L:'#d0884a', W:'#b06c34', D:'#864e22', r:'#e03a30', y:'#f0a830', e:'#1a1410', t:'#6a3a18' }] },
  cerdo: {
    rows:[
      '.......kk..',
      '.LLLLLLLLe.',
      'cWWWWWWWWWp',
      'cWWWWWWWWWn',
      '.DDDDDDDD..'],
    legs:[
      ['.D.D...D.D.', '.o.o...o.o.'],
      ['D...D.D...D', 'o...o.o...o']],
    pals:[
      { L:'#fcc8c8', W:'#eca2a8', D:'#c47a82', k:'#d8868e', e:'#1a1410', p:'#e48a94', n:'#8a3a44', c:'#d8868e', o:'#6a3a3a' },
      { L:'#f0d0b8', W:'#dcae94', D:'#b08068', k:'#6a4a3a', e:'#1a1410', p:'#d8949a', n:'#7a3a3a', c:'#c89878', o:'#4a3028' }] },
  gato: {
    rows:[
      't.....k.k',
      't.....kek',
      '.tLLLLkkn',
      '..WWWWWW.'],
    legs:[
      ['..D.DD.D.'],
      ['.D.D..D.D']],
    pals:[
      { L:'#f4a85a', W:'#e08a38', D:'#b06828', k:'#f0a050', e:'#1a1410', n:'#d06a6a', t:'#d0782c', o:'#8a4a1c' },
      { L:'#a8a8b0', W:'#888890', D:'#646470', k:'#9c9ca4', e:'#2a8a3a', n:'#d07a7a', t:'#74747c', o:'#44444c' },
      { L:'#4a4a52', W:'#34343a', D:'#222228', k:'#3c3c44', e:'#e8d050', n:'#c07070', t:'#2a2a30', o:'#141418' }] },
  perro: {
    rows:[
      '......kk..',
      't....Kkekn',
      '.tLLLLLkk.',
      '..WWWWWW..'],
    legs:[
      ['..D.D.D.D.', '..o.o.o.o.'],
      ['.D.D...D.D', '.o.o...o.o']],
    pals:[
      { L:'#b88050', W:'#9a6a3e', D:'#74502c', k:'#a87448', K:'#5a3a20', e:'#1a1410', n:'#1a1410', t:'#8a5a32', o:'#3a2818' },
      { L:'#f0cc84', W:'#dcb064', D:'#b08840', k:'#e8c070', K:'#a87c3c', e:'#1a1410', n:'#2a1e14', t:'#d0a050', o:'#5a4020' },
      { L:'#4e4844', W:'#3a3432', D:'#28221f', k:'#463f3b', K:'#1c1816', e:'#e0c060', n:'#121010', t:'#2e2a28', o:'#100e0e' }] },
  lobo: {
    rows:[
      '..........k.k.',
      'tt........kekn',
      '.ttLLLLLLLLkk.',
      '...WWWWWWWWW..',
      '...vvvvvvvv...'],
    legs:[
      ['...D.D...D.D..', '...o.o...o.o..'],
      ['..D...D.D...D.', '..o...o.o...o.']],
    pals:[
      { L:'#a8a8a2', W:'#8a8a84', D:'#64645e', k:'#9c9c96', v:'#cfcfc8', e:'#e8d050', n:'#141414', t:'#7a7a74', o:'#2e2e2c' },
      { L:'#6e6a66', W:'#55514d', D:'#3a3633', k:'#625e5a', v:'#8a8682', e:'#e8d050', n:'#0c0c0c', t:'#4a4642', o:'#1a1818' }] },
  oso: {
    rows:[
      '...LLLL.....k.k.',
      '.LLLLLLLLLLLkekk',
      'WWWWWWWWWWWWkkSn',
      'WWWWWWWWWWWWW...',
      'DDWWWWWWWWWDD...'],
    legs:[
      ['.DD.DD...DD.DD..', '.oo.oo...oo.oo..'],
      ['DD...DD.DD...DD.', 'oo...oo.oo...oo.']],
    pals:[
      { L:'#8a5a36', W:'#6e4628', D:'#4e301a', k:'#7a4e2e', S:'#b08a62', e:'#1a1410', n:'#1a120c', o:'#2a1a10' },
      { L:'#46403c', W:'#322d2a', D:'#201c1a', k:'#3a3430', S:'#8a7a62', e:'#d0b060', n:'#0a0808', o:'#0e0c0a' }] },
};
// Cada especie: nombre y forma de vida (su dibujo y sus colores están en ANIMAL_ART)
const ANIMALS = {
  // Vaca: cuernos, cabeza alzada con ojo y hocico rosado, manchas, cola y cuatro patas
  vaca:  { n:'Vaca', cold:-20, comfort:12, heat:33, herd:[3, 6], speed:4, life:[6, 9], hunger:110, eats:'pasto', litter:[1, 1], homes:[B.GRASS, B.PLAINS, B.DRY], per:7000 },
  // Caballo: en manadas por llanuras y praderas; el más rápido de los herbívoros
  caballo: { n:'Caballo', cold:-25, comfort:14, heat:36, herd:[3, 6], speed:9, life:[8, 12], hunger:120, eats:'pasto', litter:[1, 1], homes:[B.PLAINS, B.GRASS, B.DRY], per:11000 },
  // Oveja: cuerpo de lana con textura y cara oscura
  oveja: { n:'Oveja', cold:-30, comfort:8, heat:30, herd:[4, 7], speed:4.5, life:[5, 8], hunger:100, eats:'pasto', litter:[1, 2], homes:[B.GRASS, B.PLAINS, B.HILLS], per:7000 },
  // Pollo: cresta roja, pico, cola levantada y patitas
  pollo: { n:'Pollo', cold:-13, comfort:18, heat:35, herd:[4, 7], speed:5, life:[3, 5], hunger:80, eats:'pasto', litter:[2, 4], homes:[B.GRASS, B.PLAINS], per:10000 },
  // Cerdo: en piaras pequeñas, hocica la hierba y la tierra húmeda
  cerdo: { n:'Cerdo', cold:-15, comfort:15, heat:31, herd:[3, 5], speed:4, life:[6, 9], hunger:110, eats:'pasto', litter:[2, 4], homes:[B.GRASS, B.PLAINS, B.SWAMP, B.FOREST], per:12000 },
  // Gato: orejas puntiagudas, cola alta y cuerpo fino
  gato:  { n:'Gato', cold:-17, comfort:16, heat:38, herd:[1, 1], speed:6.5, life:[5, 8], hunger:150, eats:'carne', prey:['pollo'], fish:true, litter:[2, 3], homes:[B.GRASS, B.PLAINS, B.FOREST], per:22000 },
  // Perro: oreja, ojo, hocico oscuro y cola
  perro: { n:'Perro', cold:-23, comfort:14, heat:35, herd:[2, 3], speed:7, life:[5, 8], hunger:150, eats:'carne', prey:['pollo', 'oveja'], litter:[2, 4], homes:[B.GRASS, B.PLAINS], per:22000 },
  // Lobo: orejas tiesas, ojos amarillos, cola peluda y vientre claro
  lobo:  { n:'Lobo', cold:-43, comfort:2, heat:28, herd:[3, 5], speed:8, life:[6, 9], hunger:170, eats:'carne', prey:['oveja', 'vaca', 'caballo', 'pollo', 'cerdo', 'gato', 'perro'], litter:[2, 4], homes:[B.FOREST, B.HILLS, B.TUNDRA, B.SNOW], per:16000 },
  // Oso: grande, con joroba, orejas redondas y hocico
  oso:   { n:'Oso', cold:-43, comfort:4, heat:27, herd:[1, 1], speed:6, life:[10, 14], hunger:190, eats:'todo', prey:['oveja', 'pollo', 'cerdo', 'vaca'], fish:true, berries:true, litter:[1, 2], homes:[B.FOREST, B.HILLS, B.TUNDRA], per:16000 },
};
for (const sp in ANIMALS) ANIMALS[sp].pals = ANIMAL_ART[sp].pals;
const GRASSY = new Set([B.GRASS, B.PLAINS, B.FOREST, B.SWAMP, B.DRY, B.HILLS, B.TUNDRA]);
const PREDATORS = Object.keys(ANIMALS).filter(k => ANIMALS[k].prey);
const ADULT = .8; // años: a partir de aquí ya no es cría
let animals = [], fishes = [], herdLeader = new Map(), herdSeq = 0, aid = 0, faunaT = 0, grazed = new Set();
const animalCache = {};
// Dibuja un animal desde su plantilla, con contorno oscuro; las crías son una versión reducida
function drawArt(sp, P, frame, baby){
  const A = ANIMAL_ART[sp], rows = [...A.rows, ...A.legs[frame]], w = rows[0].length + 2, h = rows.length + 2;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), filled = (cx, cy) => cy >= 0 && cy < rows.length && cx >= 0 && cx < rows[0].length && rows[cy][cx] !== '.';
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    if (filled(xx - 1, y - 1)) x.fillStyle = P[rows[y - 1][xx - 1]];
    else {
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => filled(xx - 1 + dx, y - 1 + dy));
      if (!nb) continue;
      x.fillStyle = mixHex(P[rows[y - 1 + nb[1]][xx - 1 + nb[0]]], '#000000', .62);
    }
    x.fillRect(xx, y, 1, 1);
  }
  c.ax = w >> 1;
  if (!baby) return c;
  const bw = Math.max(5, Math.round(w * .68)), bh = Math.max(5, Math.round(h * .68)), bc = document.createElement('canvas');
  bc.width = bw; bc.height = bh;
  const bx = bc.getContext('2d'); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, bw, bh);
  bc.ax = bw >> 1;
  return bc;
}
function animalSprite(a, frame){
  const S = ANIMALS[a.sp], baby = (yearT - a.born) / YEAR < ADULT, flip = a.dir < 0;
  // Las razas del frío tienen el pelaje más claro y espeso; las del calor, más tostado
  const race = a.ad < -6 ? 'f' : a.ad > 6 ? 'c' : '';
  const key = a.sp + (a.v % S.pals.length) + frame + (flip ? 'l' : 'r') + (baby ? 'b' : '') + race;
  if (animalCache[key]) return animalCache[key];
  let P = S.pals[a.v % S.pals.length];
  if (race) P = Object.fromEntries(Object.entries(P).map(([k, c]) => 'LWDa'.includes(k) ? [k, race === 'f' ? mixHex(c, '#f4f0e8', .28) : mixHex(c, '#9a5a28', .2)] : [k, c]));
  const src = drawArt(a.sp, P, frame, baby);
  if (!flip) return animalCache[key] = src;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  c.ax = src.width - 1 - src.ax;
  return animalCache[key] = c;
}
// Por dónde pueden andar: tierra, sin lava ni árboles o rocas
const aFree = (px, py) => {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
  const i = ty * W + tx, b = world.biome[i];
  return !WATER[b] && b !== B.LAVA && !world.objs[i] && !wallSet.has(i);
};
function makeAnimal(sp, x, y, herd, ageYears, mother){
  const S = ANIMALS[sp], a = { id:++aid, sp, v:mother ? mother.v : Math.floor(Math.random() * S.pals.length), x, y, dir:1,
    born:yearT - ageYears * YEAR, life:S.life[0] + Math.random() * (S.life[1] - S.life[0]), food:.6 + Math.random() * .4,
    herd, mother, state:'paseando', tx:x, ty:y, t:Math.random() * 3, walk:0, moving:false, eatT:0, starve:0, water:.7 + Math.random() * .3, thirst:0, drinkT:0, wt:0, wtarget:null, lastBirth:-1e9, scanT:Math.random(), vx:0, vy:0, fol:false,
    offx:(Math.random() - .5) * 34, offy:(Math.random() - .5) * 22 }; // su sitio dentro del rebaño, para no amontonarse
  // Adaptación al clima (°C que desplazan lo que aguanta de frío y de calor): las crías heredan la de su madre
  // (al criar se mezcla con la del padre); los demás vienen ya adaptados al clima medio de donde aparecen
  const ti = clamp(Math.floor(y / T), 0, H - 1) * W + clamp(Math.floor(x / T), 0, W - 1);
  a.ad = mother ? mother.ad : clamp(((world.baseT ? world.baseT[ti] : S.comfort) - S.comfort) * .7 + (Math.random() - .5) * 4, -18, 18);
  if (herd && !herdLeader.has(herd)) herdLeader.set(herd, a);
  animals.push(a);
  return a;
}
function randomTileIn(homes, tries = 600){
  for (let k = 0; k < tries; k++) {
    const i = Math.floor(Math.random() * N);
    if (homes.includes(world.biome[i]) && !world.objs[i]) return i;
  }
  return -1;
}
function spawnAnimals(){
  animals = []; herdLeader = new Map(); grazed = new Set();
  for (const [sp, S] of Object.entries(ANIMALS)) {
    for (let g = Math.max(1, Math.round(N / S.per * (.6 + Math.random() * .8))); g > 0; g--) {
      const i = randomTileIn(S.homes); if (i < 0) break;
      const cx = (i % W) * T + 2, cy = ((i / W) | 0) * T + 2, herd = S.herd[1] > 1 ? ++herdSeq : 0;
      const n = S.herd[0] + Math.floor(Math.random() * (S.herd[1] - S.herd[0] + 1));
      for (let m = 0; m < n; m++) {
        const x = cx + (Math.random() - .5) * 34, y = cy + (Math.random() - .5) * 24;
        if (aFree(x, y)) makeAnimal(sp, x, y, herd, .9 + Math.random() * (S.life[0] - 1));
      }
    }
  }
}
// ---- Bancos de peces: en aguas poco profundas cerca de la costa, en lagos y en ríos ----
function spawnFish(){
  fishes = [];
  const want = Math.round(N / 1400);
  for (let k = 0, tries = 0; k < want && tries < want * 60; tries++) {
    const i = Math.floor(Math.random() * N), b = world.biome[i];
    if (!(b === B.SHALLOW || b === B.SEA || b === B.LAKE || b === B.RIVER)) continue;
    const tx = i % W, ty = (i / W) | 0;
    let shore = -1, bd = 1e9; // casilla de tierra más cercana desde la que pescar
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const j = y * W + x, d = dx * dx + dy * dy;
      if (!WATER[world.biome[j]] && world.biome[j] !== B.LAVA && d < bd) { bd = d; shore = j; }
    }
    if (shore < 0 || fishes.some(f => Math.hypot(f.x - tx * T, f.y - ty * T) < 24)) continue;
    fishes.push({ x:tx * T + 2, y:ty * T + 2, stock:.5 + Math.random() * .5, ph:Math.random() * 6.28, sx:(shore % W) * T + 2, sy:((shore / W) | 0) * T + 2 });
    k++;
  }
}
function drawFish(t){
  const [x0, y0, x1, y1] = visibleRect(), ts = t / 1000;
  for (const f of fishes) {
    if (f.x < x0 - 10 || f.x > x1 + 10 || f.y < y0 - 10 || f.y > y1 + 10) continue;
    const fi = Math.floor(f.y / T) * W + Math.floor(f.x / T); if (frozen(fi) || dried(fi)) continue; // bajo el hielo o sin agua no se ven
    const n = Math.round(1 + f.stock * 6);
    for (let k = 0; k < n; k++) {
      const a = ts * (.6 + k * .09) * (k % 2 ? 1 : -1) + f.ph + k * 1.3, r = 2 + (k % 3) * 2.2;
      const px = Math.round(f.x + Math.cos(a) * r), py = Math.round(f.y + Math.sin(a) * r * .6);
      vctx.fillStyle = 'rgba(18,38,66,.5)'; vctx.fillRect(px, py, 2, 1);                      // sombra del pez
      if (h2(k, Math.floor(ts * 2 + f.ph), 91) > .7) { vctx.fillStyle = 'rgba(220,236,248,.8)'; vctx.fillRect(px + (Math.cos(a) > 0 ? 1 : 0), py, 1, 1); } // destello
    }
    if (Math.sin(ts * 1.3 + f.ph * 3) > .985 && f.stock > .3) { // un pez salta
      vctx.fillStyle = 'rgba(230,240,250,.9)'; vctx.fillRect(Math.round(f.x + 2), Math.round(f.y - 2), 1, 1); vctx.fillRect(Math.round(f.x + 3), Math.round(f.y - 3), 1, 1);
    }
  }
}
// ---- Comportamiento ----
// Movimiento suave: el animal acelera y frena poco a poco (inercia), esquiva obstáculos mirando un poco
// por delante y solo se gira cuando de verdad cambia de sentido
function moveTo(a, tx, ty, speed, dt){
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 1.5) { a.vx *= .8; a.vy *= .8; return true; }
  const base = Math.atan2(dy, dx);
  let ang = null;
  for (const o of [0, .5, -.5, 1, -1, 1.7, -1.7]) {
    if (aFree(a.x + Math.cos(base + o) * 3, a.y + Math.sin(base + o) * 3)) { ang = base + o; break; }
  }
  if (ang === null) { a.t = 0; a.vx = a.vy = 0; return false; }
  const sp = Math.min(speed, d * 3), k = Math.min(1, dt * 5);
  a.vx += (Math.cos(ang) * sp - a.vx) * k; a.vy += (Math.sin(ang) * sp - a.vy) * k;
  const nx = a.x + a.vx * dt, ny = a.y + a.vy * dt;
  if (aFree(nx, ny)) { a.x = nx; a.y = ny; } else { a.vx = a.vy = 0; }
  a.moving = Math.hypot(a.vx, a.vy) > .8;
  if (a.moving) a.walk += dt;
  if (a.vx > speed * .3) a.dir = 1; else if (a.vx < -speed * .3) a.dir = -1;
  return false;
}
function killAnimal(a, cause){
  if (a.dom) learnFromDeath(a, cause);
  a.dead = true;
  if (herdLeader.get(a.herd) === a) herdLeader.delete(a.herd);
  if (follow === a) setFollow(null);
  if (cause !== 'silencio') { const spr = animalSprite(a, 0); addCorpse(spr, a.x, a.y, false); }
}
// Rejilla de celdas de 8 px con los animales de cada una: buscar al vecino de al lado es inmediato
// en vez de recorrer todos los animales del mapa por cada animal
let aGrid = new Map(), aLod = 0;
const aCell = (x, y) => (Math.floor(y / 8) * 4096 + Math.floor(x / 8));
function nearAnimal(a){
  const cx = Math.floor(a.x / 8), cy = Math.floor(a.y / 8);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const l = aGrid.get((cy + dy) * 4096 + cx + dx); if (!l) continue;
    for (const o of l) if (o !== a && !o.dead && Math.abs(o.x - a.x) < 3 && Math.abs(o.y - a.y) < 2) return o;
  }
  return null;
}
// Orilla más cercana de agua dulce sin helar ni seca (o un charco de lluvia), buscando en anillos alrededor.
// El agua del mar es salada: no les quita la sed, así que nunca van a beber a la costa
function findWater(a){
  const tx = Math.floor(a.x / T), ty = Math.floor(a.y / T);
  for (let r = 1; r <= 30; r++) for (let k = 0; k < 8 * r; k++) {
    const side = Math.floor(k / (2 * r)), s2 = k % (2 * r) - r;
    const x = tx + [s2, r, -s2, -r][side], y = ty + [-r, s2, r, -s2][side];
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    const i = y * W + x, b = world.biome[i];
    const puddle = !WATER[b] && floodA && floodA[i] > .35;
    if (!(FRESH(b) && !frozen(i) && !dried(i)) && !puddle) continue;
    if (puddle && aFree(x * T + 2, y * T + 2)) return { i, x:x * T + 2, y:y * T + 2 };
    for (const n of nb4i(i)) { const nx = (n % W) * T + 2, ny = ((n / W) | 0) * T + 2; if (!WATER[world.biome[n]] && aFree(nx, ny)) return { i, x:nx, y:ny }; }
  }
  return null;
}
function updateAnimals(dt){
  if (!animals.length) return;
  aGrid = new Map();
  for (const a of animals) { const k = aCell(a.x, a.y); let l = aGrid.get(k); if (!l) aGrid.set(k, l = []); l.push(a); }
  const seasonI = seasonInfo().i, counts = {};
  for (const a of animals) counts[a.sp] = (counts[a.sp] || 0) + (a.dead ? 0 : 1);
  const [lx0, ly0, lx1, ly1] = visibleRect(), half = (aLod = (aLod + 1) & 3), dtAll = dt;
  for (const a of animals) {
    if (a.dead) continue;
    // Lejos de la vista (o con el mapa entero a la vista, que se ven diminutos), los animales salvajes piensan un paso sí y otro no (con el doble de tiempo): lo mismo, con la mitad de trabajo
    let dt = dtAll;
    if (!a.dom && !a.lead && (zoom < 1.2 || a.x < lx0 - 60 || a.x > lx1 + 60 || a.y < ly0 - 60 || a.y > ly1 + 60)) { if ((a.lod = (a.lod ?? Math.floor(Math.random() * 4)) & 3) !== half) continue; dt = dtAll * 4; } // (fuera de la vista, uno de cada cuatro pasos: en los mapas enormes hay miles)
    const S = ANIMALS[a.sp], age = (yearT - a.born) / YEAR;
    a.moving = false;
    // Muerte por vejez, lava, hambre, frío o sed
    if (age > a.life) { killAnimal(a, 'vejez'); continue; }
    const ti = Math.floor(a.y / T) * W + Math.floor(a.x / T);
    if (world.biome[ti] === B.LAVA) { killAnimal(a, 'lava'); continue; }
    // En el agua (inundación, tsunami, lago nuevo): nadan despacio hacia la orilla más cercana; si tardan
    // demasiado, se ahogan
    if (WATER[world.biome[ti]]) {
      a.swimT = (a.swimT || 0) + dt; a.state = 'nadando'; a.moving = true; a.walk += dt * .5;
      if (a.swimT > 25) { killAnimal(a, 'ahogado'); continue; }
      if (!a.shore || (a.shoreT -= dt) <= 0) {
        a.shoreT = 2; a.shore = null;
        const tx = Math.floor(a.x / T), ty = Math.floor(a.y / T);
        for (let r = 1; r <= 14 && !a.shore; r++) for (let k = 0; k < 8 * r; k++) {
          const g = k / (8 * r) * Math.PI * 2, x = tx + Math.round(Math.cos(g) * r), y = ty + Math.round(Math.sin(g) * r);
          if (aFree(x * T + 2, y * T + 2)) { a.shore = [x * T + 2, y * T + 2]; break; }
        }
      }
      if (a.shore) {
        const dx = a.shore[0] - a.x, dy = a.shore[1] - a.y, d = Math.hypot(dx, dy) || 1, sp = S.speed * .45;
        a.x += dx / d * sp * dt; a.y += dy / d * sp * dt; if (Math.abs(dx) > .5) a.dir = dx > 0 ? 1 : -1;
      }
      continue;
    } else a.swimT = 0;
    a.food = Math.max(0, a.food - dt / S.hunger);
    if (a.food <= 0) { a.starve += dt; if (a.starve > 20) { killAnimal(a, 'hambre'); continue; } } else a.starve = 0;
    // Frío extremo: por debajo de lo que aguanta su especie (las crías, algo menos) se van helando y mueren;
    // con temperaturas soportables se recuperan
    // Lo que aguanta depende de su especie y de su adaptación: un animal del norte resiste heladas pero
    // muere de calor si baja al sur, y al revés. Las crías aguantan algo menos
    const temp = tempAt(ti), tol = S.cold + a.ad + (age < ADULT ? 6 : 0), hot = S.heat + a.ad - (age < ADULT ? 4 : 0);
    a.chill = temp < tol ? (a.chill || 0) + dt * (tol - temp) / 120 : Math.max(0, (a.chill || 0) - dt * .1);
    a.hot = temp > hot ? (a.hot || 0) + dt * (temp - hot) / 90 : Math.max(0, (a.hot || 0) - dt * .1);
    if (a.chill >= 1) { killAnimal(a, 'frío'); continue; }
    if (a.hot >= 1) { killAnimal(a, 'calor'); continue; }
    // Aclimatación: a lo largo de su vida se acostumbra un poco al clima medio del sitio donde vive
    if (world.baseT) a.ad += ((world.baseT[ti] - S.comfort) * .7 - a.ad) * dt * .0015;
    if (a.dom && domesticStep(a, S, dt)) continue; // animal de granja
    // Sed: más con calor y sequía; sin beber unos segundos, mueren deshidratados (las crías maman)
    if (age >= ADULT) {
      a.water = Math.max(0, a.water - dt / S.hunger * .9 * (1 + Math.max(0, temp - 20) / 10 + droughtAt(ti) * .6));
      if (a.water <= 0) { a.thirst += dt; if (a.thirst > 15) { killAnimal(a, 'sed'); continue; } } else a.thirst = 0;
    }
    if (a.drinkT > 0) { a.drinkT -= dt; if (a.drinkT <= 0) a.water = 1; continue; }
    if (a.eatT > 0) { a.eatT -= dt; if (a.eatT <= 0) a.food = 1; continue; }
    // Herido por los aldeanos: huye un rato lejos de ellos (y se va curando poco a poco)
    if (a.hp !== undefined) a.hp = Math.min(beastHP(a), a.hp + dt * .005);
    if (a.fleeT > 0) { a.fleeT -= dt; a.state = 'huyendo'; moveTo(a, a.x + (a.x - a.fleeFrom[0]) * 3, a.y + (a.y - a.fleeFrom[1]) * 3, S.speed * 1.3, dt); continue; }
    // Las presas huyen de los depredadores que tienen cerca
    a.scanT -= dt;
    if (a.scanT <= 0) {
      a.scanT = .5; a.threat = null;
      const cx = Math.floor(a.x / 8), cy = Math.floor(a.y / 8); // solo en las celdas de alrededor (antes, todos los animales del mapa: en los mapas enormes era lo que más costaba)
      for (let dy = -5; dy <= 5 && !a.threat; dy++) for (let dx = -5; dx <= 5 && !a.threat; dx++) { const l = aGrid.get((cy + dy) * 4096 + cx + dx); if (!l) continue;
        for (const p of l) { if (p.dead || !ANIMALS[p.sp].prey || !ANIMALS[p.sp].prey.includes(a.sp)) continue; if (Math.hypot(p.x - a.x, p.y - a.y) < 34) { a.threat = p; break; } } }
    }
    if (a.threat && !a.threat.dead) {
      a.state = 'huyendo';
      moveTo(a, a.x + (a.x - a.threat.x) * 3, a.y + (a.y - a.threat.y) * 3, S.speed * 1.25, dt);
      continue;
    }
    const baby = age < ADULT;
    // Migración: si pasa demasiado frío o calor, se va hacia donde el clima le sienta mejor (si es el líder,
    // le sigue su manada). Mira en varias direcciones y elige la temperatura más cercana a su ideal
    if (!baby && ((a.chill || 0) > .2 || (a.hot || 0) > .2)) {
      if (!a.mig || (a.migT -= dt) <= 0) {
        a.migT = 4; const ideal = S.comfort + a.ad; let best = Math.abs(temp - ideal);
        a.mig = null;
        for (let k = 0; k < 10; k++) {
          const g = k / 10 * Math.PI * 2, x = a.x + Math.cos(g) * 70, y = a.y + Math.sin(g) * 70;
          if (!aFree(x, y)) continue;
          const d = Math.abs(tempAt(Math.floor(y / T) * W + Math.floor(x / T)) - ideal);
          if (d < best - 1) { best = d; a.mig = [x, y]; }
        }
      }
      if (a.mig) { a.state = 'migrando'; if (moveTo(a, a.mig[0], a.mig[1], S.speed * 1.1, dt)) a.mig = null; continue; }
    }
    // Beber: buscan la orilla de un río o lago que no esté helado (o un charco); el agua del mar no sirve
    if (a.water < .4 && !baby) {
      if (!a.wtarget || frozen(a.wtarget.i) || (a.wt -= dt) <= 0) { a.wtarget = findWater(a); a.wt = 5; }
      if (a.wtarget) {
        a.state = 'yendo a beber';
        if (Math.hypot(a.wtarget.x - a.x, a.wtarget.y - a.y) < 4) { a.state = 'bebiendo'; a.drinkT = 2; a.wtarget = null; continue; }
        moveTo(a, a.wtarget.x, a.wtarget.y, S.speed, dt); continue;
      }
      a.state = 'buscando agua';
    }
    // Hambre: cada uno busca su comida
    if (a.food < .5 && !baby) {
      if (S.eats === 'pasto') {
        a.state = 'pastando';
        if (GRASSY.has(world.biome[ti]) && (world.graze[ti] || 0) + droughtAt(ti) * .6 < .7) { a.eatT = 2.5; world.graze[ti] = (world.graze[ti] || 0) + .45; grazed.add(ti); continue; }
        if ((a.t -= dt) <= 0 || moveTo(a, a.tx, a.ty, S.speed, dt)) {
          a.t = 4;
          for (let k = 0; k < 12; k++) {
            const x = a.x + (Math.random() - .5) * 60, y = a.y + (Math.random() - .5) * 60, j = Math.floor(y / T) * W + Math.floor(x / T);
            if (aFree(x, y) && GRASSY.has(world.biome[j]) && (world.graze[j] || 0) + droughtAt(j) * .6 < .7) { a.tx = x; a.ty = y; break; }
          }
        }
        continue;
      }
      // Lobos y osos también atacan a la gente que anda lejos de la hoguera (el fuego los espanta);
      // los lobos van a por quien ven, los osos solo si se les acercan
      if (a.sp === 'lobo' || a.sp === 'oso') {
        const R = a.sp === 'lobo' ? 70 : 26, ld = a.herd ? herdLeader.get(a.herd) : null;
        if (a.preyV && (a.preyV.dead || Math.hypot(a.preyV.x - a.x, a.preyV.y - a.y) > R * 1.8 || nearFire(a.preyV))) a.preyV = null;
        if (!a.preyV && ld && ld !== a && ld.preyV && !ld.preyV.dead) a.preyV = ld.preyV;
        if (!a.preyV) {
          let bd = R;
          for (const v of villagers) {
            if (v.dead || v.appear < .25 || inWater(v.x, v.y) || nearFire(v)) continue;
            const d = Math.hypot(v.x - a.x, v.y - a.y) * ((yearT - v.born) / YEAR < ADULT_H ? .7 : 1) * (v.weapon ? 1.4 : 1);
            if (d < bd) { bd = d; a.preyV = v; }
          }
        }
        if (a.preyV) {
          a.state = 'atacando'; const v = a.preyV;
          if (Math.hypot(v.x - a.x, v.y - a.y) < 4) { a.atkT = (a.atkT || 0) - dt; if (a.atkT <= 0) { a.atkT = 1.1; biteVillager(v, a); } continue; }
          moveTo(a, v.x, v.y, S.speed * 1.3, dt); continue;
        }
      }
      // Pescar
      if (S.fish) {
        let best = null, bd = 90;
        for (const f of fishes) { const d = Math.hypot(f.sx - a.x, f.sy - a.y); if (f.stock > .25 && d < bd && !frozen(Math.floor(f.y / T) * W + Math.floor(f.x / T)) && !dried(Math.floor(f.y / T) * W + Math.floor(f.x / T))) { bd = d; best = f; } }
        if (best) {
          a.state = 'pescando';
          if (Math.hypot(best.sx - a.x, best.sy - a.y) < 4) { a.eatT = 3; best.stock -= .25; continue; }
          moveTo(a, best.sx, best.sy, S.speed, dt); continue;
        }
      }
      // Bayas (osos)
      if (S.berries) {
        const tx = Math.floor(a.x / T), ty = Math.floor(a.y / T);
        let bush = -1;
        for (let dy = -6; dy <= 6 && bush < 0; dy++) for (let dx = -6; dx <= 6; dx++) {
          const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const o = world.objs[y * W + x]; if (o && o.key.startsWith('bush')) { bush = y * W + x; break; }
        }
        if (bush >= 0) {
          a.state = 'comiendo bayas';
          const bx = (bush % W) * T + 2, by = ((bush / W) | 0) * T + 6;
          if (Math.hypot(bx - a.x, by - a.y) < 6) { a.eatT = 3; continue; }
          moveTo(a, bx, by, S.speed, dt); continue;
        }
      }
      // Cazar (la manada sigue a la presa de su líder)
      if (S.prey) {
        const lead = a.herd ? herdLeader.get(a.herd) : null;
        if (lead && lead !== a && lead.prey && !lead.prey.dead) a.prey = lead.prey;
        if (!a.prey || a.prey.dead || Math.hypot(a.prey.x - a.x, a.prey.y - a.y) > 120) {
          a.prey = null;
          if (!((a.huntT = (a.huntT || 0) - dt) > 0)) { a.huntT = .6; // (buscar presa, como mucho dos veces por segundo y solo por las celdas de alrededor)
            let bd = 100; const cx = Math.floor(a.x / 8), cy = Math.floor(a.y / 8);
            for (let dy = -13; dy <= 13; dy++) for (let dx = -13; dx <= 13; dx++) { const l = aGrid.get((cy + dy) * 4096 + cx + dx); if (!l) continue;
              for (const p of l) { if (p.dead || !S.prey.includes(p.sp)) continue; const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bd) { bd = d; a.prey = p; } } }
          }
        }
        if (a.prey) {
          a.state = 'cazando';
          if (Math.hypot(a.prey.x - a.x, a.prey.y - a.y) < 4) { killAnimal(a.prey, 'presa'); a.prey = null; a.eatT = 3; if (lead && lead !== a) lead.food = Math.max(lead.food, .8); continue; }
          moveTo(a, a.prey.x, a.prey.y, S.speed * 1.3, dt); continue;
        }
      }
      a.state = 'buscando comida';
    } else a.state = baby ? 'siguiendo a su madre' : 'paseando';
    // Crías con su madre; rebaños y manadas junto a su líder; el resto pasea
    const lead = a.herd ? herdLeader.get(a.herd) : null;
    if (a.herd && !lead) herdLeader.set(a.herd, a);
    const anchor = baby && a.mother && !a.mother.dead ? a.mother : lead && lead !== a ? lead : null;
    // Cada uno va a su sitio alrededor del líder (las crías, pegadas a la madre)
    const gx = anchor ? anchor.x + (baby ? a.offx * .2 : a.offx) : 0, gy = anchor ? anchor.y + (baby ? a.offy * .2 : a.offy) : 0;
    // Con margen: arranca si se ha alejado de su sitio y se para cuando ya está cerca (sin ir y venir)
    const gd = anchor ? Math.hypot(gx - a.x, gy - a.y) : 0;
    if (anchor && !a.fol && gd > (baby ? 6 : 11)) a.fol = true;
    if (a.fol && (!anchor || gd < (baby ? 2 : 4))) { a.fol = false; a.vx = a.vy = 0; }
    // Si otro animal está justo encima, se desliza un poco a un lado (sin girarse)
    const near = !a.fol && nearAnimal(a);
    if (near) { const nx = a.x + (a.x >= near.x ? 1 : -1) * dt * 3; if (aFree(nx, a.y)) a.x = nx; }
    if (a.fol) {
      moveTo(a, gx, gy, S.speed * 1.1, dt);
    } else if ((a.t -= dt) <= 0) {
      a.t = 2 + Math.random() * 5;
      if (Math.random() < .55) { a.tx = a.x + (Math.random() - .5) * 50; a.ty = a.y + (Math.random() - .5) * 50; } else { a.tx = a.x; a.ty = a.y; a.state = 'descansando'; }
    } else if (a.tx !== a.x || a.ty !== a.y) moveTo(a, a.tx, a.ty, S.speed * .55, dt);
    // Reproducción: adultos sanos, en primavera o verano, con pareja cerca y sin pasarse del límite
    if (!baby && age < a.life * .85 && a.food > .6 && seasonI <= 1 && yearT - a.lastBirth > YEAR * .75 && Math.random() < dt * .08) {
      const cap = Math.max(6, Math.round(N / S.per * 12));
      let mate = null; { const cx = Math.floor(a.x / 8), cy = Math.floor(a.y / 8); for (let dy = -4; dy <= 4 && !mate; dy++) for (let dx = -4; dx <= 4 && !mate; dx++) { const l = aGrid.get((cy + dy) * 4096 + cx + dx); if (l) mate = l.find(o => !o.dead && o !== a && o.sp === a.sp && (yearT - o.born) / YEAR >= ADULT && Math.hypot(o.x - a.x, o.y - a.y) < 30) || null; } }
      if (mate && (counts[a.sp] || 0) < cap && animals.length < 600) {
        a.lastBirth = mate.lastBirth = yearT;
        const n = S.litter[0] + Math.floor(Math.random() * (S.litter[1] - S.litter[0] + 1));
        for (let c = 0; c < n; c++) {
          const kid = makeAnimal(a.sp, a.x + (Math.random() - .5) * 6, a.y + (Math.random() - .5) * 6, a.herd, 0, a);
          kid.ad = clamp((a.ad + mate.ad) / 2 + (Math.random() + Math.random() - 1) * 2.5, -22, 22); // herencia + pequeña mutación
        }
        counts[a.sp] = (counts[a.sp] || 0) + n;
      }
    }
  }
  if (animals.some(a => a.dead)) animals = animals.filter(a => !a.dead);
  // La hierba comida vuelve a crecer y los peces se recuperan poco a poco
  for (const i of grazed) { world.graze[i] -= dt * .01; if (world.graze[i] <= 0) { world.graze[i] = 0; grazed.delete(i); } }
  for (const f of fishes) f.stock = Math.min(1, f.stock + dt * .004);
  if ((faunaT -= dt) <= 0) { faunaT = 2; updateFaunaPanel(); }
}
let animQ = [], animI = 0;
function drawAnimals(limit = Infinity){
  if (limit === -1) { animQ = [...animals].sort((p, q) => p.y - q.y); animI = 0; return; }
  const [x0, y0, x1, y1] = visibleRect();
  for (; animI < animQ.length && animQ[animI].y <= limit; animI++) {
    const a = animQ[animI];
    if (a.rider || a.x < x0 - 10 || a.x > x1 + 10 || a.y < y0 - 10 || a.y > y1 + 14) continue; // el montado se pinta con su jinete
    const s = animalSprite(a, a.moving ? Math.floor(a.walk * 8) % 2 : 0), x = Math.round(a.x), y = Math.round(a.y);
    const left = x - s.ax, top = y - s.height + 1, ti = Math.floor(a.y / T) * W + Math.floor(a.x / T);
    const deep = WATER[world.biome[ti]], puddle = !deep && floodA && floodA[ti] > .45;
    if (deep || puddle) {
      // Nadando: solo asoman la cabeza y el lomo (en un charco, el cuerpo sin las patas), con un leve vaivén
      // y ondas alrededor
      const tt = performance.now() / 1000, bob = deep ? Math.round(Math.sin(tt * 3 + a.x) * .6) : 0;
      const shown = Math.ceil(s.height * (deep ? .5 : .72)), wy = y + 1 + bob;
      vctx.drawImage(s, 0, 0, s.width, shown, left, wy - shown, s.width, shown);
      vctx.fillStyle = `rgba(225,242,255,${.5 + .2 * Math.sin(tt * 3 + a.y)})`;
      vctx.fillRect(left - 1, wy, 2, 1); vctx.fillRect(left + s.width - 1, wy, 2, 1); vctx.fillRect(left + 2, wy + 1, Math.max(2, s.width - 4), 1);
    } else {
      vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - (s.width >> 2), y + 1, s.width >> 1, 1);
      vctx.drawImage(s, left, top + (a.eatT > 0 ? Math.round(Math.sin(a.eatT * 8)) : 0)); drawHurt(a, s, left, top);
    }
    // Los árboles y rocas que están delante (base más abajo) se repintan encima: el animal queda detrás
    // (con el mapa muy alejado no se nota y se ahorra mucho trabajo)
    if (!params.objects || zoom < .9) continue;
    for (let ty = Math.max(0, Math.floor(y / T)); ty <= Math.min(H - 1, Math.floor((y + 56) / T)); ty++)
      for (let tx = Math.max(0, Math.floor((left - 28) / T)); tx <= Math.min(W - 1, Math.floor((left + s.width + 28) / T)); tx++) {
        const o = world.objs[ty * W + tx]; if (!o) continue;
        const os = objSprite(o), by = ty * T + 3 + o.oy;
        if (by <= y || o.key === 'quarry:cantera') continue;
        const ol = tx * T + 2 + o.ox - os.ax, ot = by - os.height + 1;
        if (ol > left + s.width || ol + os.width <= left || ot > y || by < top) continue;
        vctx.drawImage(os, ol, ot);
      }
  }
}
function villagerAt(sx, sy){
  const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom;
  let best = null, bd = Math.max(5, 8 / zoom);
  for (const v of villagers) { if (v.born === undefined) continue; const d = Math.hypot(v.x - wx, v.y - 5 - wy); if (d < bd) { bd = d; best = v; } }
  return best;
}
function animalAt(sx, sy){
  const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom;
  let best = null, bd = Math.max(5, 8 / zoom);
  for (const a of animals) { const d = Math.hypot(a.x - wx, a.y - 3 - wy); if (d < bd) { bd = d; best = a; } }
  return best;
}
function animalInfo(a){
  const S = ANIMALS[a.sp], age = (yearT - a.born) / YEAR;
  const ad = a.ad < -3 ? ` · adaptado al frío (${Math.round(S.cold + a.ad)} a ${Math.round(S.heat + a.ad)} °C)` : a.ad > 3 ? ` · adaptado al calor (${Math.round(S.cold + a.ad)} a ${Math.round(S.heat + a.ad)} °C)` : '';
  return `<b>${S.n}${age < ADULT ? ' (cría)' : ''}</b>${ad} · ${a.state} · comida ${Math.round(a.food * 100)} % · agua ${Math.round(a.water * 100)} % · ${age.toFixed(1).replace('.', ',')} años`;
}
function buildFaunaPanel(){
  $('fauna').innerHTML = Object.entries(ANIMALS).map(([sp, S]) => `<li><canvas class="ic" data-sp="${sp}" width="28" height="28"></canvas>${S.n}<span class="n" id="fa-${sp}">0</span></li>`).join('')
    + `<li><span class="fishdot"></span>Bancos de peces<span class="n" id="fa-peces">0</span></li>`;
  document.querySelectorAll('#fauna canvas').forEach(c => {
    const s = animalSprite({ sp:c.dataset.sp, v:0, dir:1, born:-1e9 }, 0), x = c.getContext('2d'), sc = Math.max(1, Math.floor(22 / Math.max(s.width, s.height)));
    x.imageSmoothingEnabled = false;
    x.drawImage(s, (28 - s.width * sc) >> 1, (28 - s.height * sc) >> 1, s.width * sc, s.height * sc);
  });
  updateFaunaPanel();
}
function updateFaunaPanel(){
  const c = {};
  for (const a of animals) c[a.sp] = (c[a.sp] || 0) + 1;
  for (const sp of Object.keys(ANIMALS)) { const el = $('fa-' + sp); if (el) el.textContent = c[sp] || 0; }
  const fe = $('fa-peces'); if (fe) fe.textContent = fishes.length;
}
