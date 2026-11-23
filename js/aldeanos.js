// Forja de Mundos · Movimiento y dibujo de los aldeanos
// ================= Aldeanos de prueba (escala y visibilidad) =================
// Se dibujan siempre por encima de árboles y rocas, con contorno oscuro, para que nunca queden tapados
// Tonos de piel de más claro a más oscuro. Cada aldeano tiene el de su clima: en zonas frías (poco sol) la piel
// es más clara y en las cálidas más oscura, con algo de variación entre personas
const SKIN = ['#f6dcc4','#f1c9a0','#e0ae80','#c98e5e','#a8704a','#87573a','#6e4630','#4e3020'];
const skinFor = (i, r) => SKIN[clamp(Math.round(((world.baseT ? world.baseT[i] : 12) + 6) / 36 * (SKIN.length - 1) + (r() - .5) * 2.2), 0, SKIN.length - 1)];
const SHIRT = ['#d8423a','#3a7bd5','#e9b949','#5ab45a','#9a5ad0','#ece8dc'];
const HAIR = ['#2a1a10','#141010','#5a3a1a','#7a5230','#c89a4a','#e8d49a','#8a2a1a','#c8642a','#8a8a88','#d8d4cc'];
const HATS = ['#8a5a32','#d8b860','#4a3a2a','#a83a2a','#3a5a8a'];
const PANTS = ['#3a4a6a','#5a4030','#3a3a3a','#4a5a3a'];
// h pelo (y barba) · g gorro · s piel · c camisa · C sombra de la camisa · p pantalón · f calzado
// Peinados: la cabeza vista de lado mirando a la derecha (el pelo de la nuca queda a la izquierda)
const HAIRSTYLE = {
  corto:   ['.hhh.', 'hhhhh', '.sss.', '.sss.'],
  largo:   ['.hhh.', 'hhhhh', 'hsssh', 'hsssh'],
  melena:  ['.hhh.', 'hhhhh', 'hhsss', 'hhsss', 'h....'],
  coleta:  ['.hhh.', 'hhhhh', 'hsss.', 'hsss.'],
  mono:    ['.hh..', '.hhh.', 'hhhhh', '.sss.', '.sss.'],
  rizos:   ['hhhhh', 'hhhhh', 'hsssh', '.sss.'],
  cresta:  ['..h..', '.shs.', '.sss.', '.sss.'],
  calvo:   ['.sss.', 'sssss', '.sss.', '.sss.'],
  coronilla: ['.sss.', 'hsssh', 'hsss.', '.sss.'],
  barba:   ['.hhh.', 'hhhhh', '.sss.', '.hhh.'],
  calvoBarba: ['.sss.', 'sssss', 'hsss.', '.hhh.'],
  gorro:   ['.ggg.', 'ggggg', '.sss.', '.sss.'],
  sombrero: ['.ggg.', 'ggggggg', '.sss.', '.sss.'],
};
// Cuántos de cada peinado (los calvos y las crestas son más raros)
const STYLE_W = [['corto', 18], ['largo', 12], ['melena', 7], ['coleta', 8], ['mono', 6], ['rizos', 7], ['cresta', 2], ['calvo', 6], ['coronilla', 6], ['barba', 9], ['calvoBarba', 4], ['gorro', 6], ['sombrero', 5]];
const pickStyle = r => { let k = r() * STYLE_W.reduce((a, [, w]) => a + w, 0); for (const [st, w] of STYLE_W) if ((k -= w) < 0) return st; return 'corto'; };
const styleOf = v => v.style || (v.long ? 'largo' : 'corto');
const PERSON = {
  body:  [['cccCc', 'scccs', '.ccC.'], ['cccCc', '.cccs', 'sccC.']], // brazos abajo / balanceo
  legs:  [['.p.p.', '.p.p.', '.f.f.'], ['.p.p.', 'p...p', 'f...f']], // pies juntos / zancada
};
// Círculo de selección en el suelo (elipse de píxeles)
const RING = (() => { const seen = new Set(), out = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, p = [Math.round(Math.cos(a) * 5), Math.round(Math.sin(a) * 2) + 1]; if (!seen.has(p + '')) { seen.add(p + ''); out.push(p); } } return out; })();
function shade(hex, f){ const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) * f | 0},${(n >> 8 & 255) * f | 0},${(n & 255) * f | 0})`; }
const personCache = {};
// Iguala el ancho de las filas (un sombrero de ala ancha sobresale por los lados) centrándolas
function padRows(rows){
  const w = Math.max(...rows.map(r => r.length));
  return rows.map(r => { const l = (w - r.length) >> 1; return '.'.repeat(l) + r + '.'.repeat(w - r.length - l); });
}
function personSprite(v, frame, flip){
  const key = [v.skin, v.shirt, v.hair, v.pants, styleOf(v), v.hat, frame, flip].join();
  if (personCache[key]) return personCache[key];
  const rows = padRows([...HAIRSTYLE[styleOf(v)], ...PERSON.body[frame], ...PERSON.legs[frame]]);
  const col = { h:v.hair, g:v.hat || HATS[0], s:v.skin, c:v.shirt, C:shade(v.shirt, .68), p:v.pants, P:shade(v.pants, .7), f:'#2a1c14' };
  const c = document.createElement('canvas'); c.width = rows[0].length + 2; c.height = rows.length + 2;
  const x = c.getContext('2d');
  x.fillStyle = '#16110d';
  for (const [ox, oy] of [[0,1],[2,1],[1,0],[1,2]])
    rows.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch !== '.') x.fillRect(xx + ox, y + oy, 1, 1); }));
  rows.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch !== '.') { x.fillStyle = col[ch]; x.fillRect(xx + 1, y + 1, 1, 1); } }));
  if (flip) {
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const fx = f.getContext('2d'); fx.scale(-1, 1); fx.drawImage(c, -c.width, 0);
    return personCache[key] = f;
  }
  return personCache[key] = c;
}
// Nadando: cabeza y hombros fuera del agua y los brazos dando brazadas (abiertos / arriba)
const SWIM_ART = {
  arms:  [['ssscccsss'], ['s..ccc..s']],
  raise: [['.........', '.........'], ['s.......s', '.s.....s.']], // en la brazada las manos suben por los lados
};
function swimSprite(v, frame, flip){
  const key = ['nada', v.skin, v.shirt, v.hair, styleOf(v), v.hat, frame, flip].join();
  if (personCache[key]) return personCache[key];
  const st = HAIRSTYLE[styleOf(v)], base = padRows([...st.slice(0, -1), '.........']).map(r => r.length < 9 ? '.'.repeat((9 - r.length) >> 1) + r + '.'.repeat(9 - r.length - ((9 - r.length) >> 1)) : r).slice(0, -1);
  const n = base.length, head = base.map((r, y) => { const ry = y - (n - 3); return frame && SWIM_ART.raise[1][ry] ? [...r].map((ch, x) => ch === '.' ? SWIM_ART.raise[1][ry][x] : ch).join('') : r; });
  const rows = [...head, ...SWIM_ART.arms[frame]];
  const col = { h:v.hair, g:v.hat || HATS[0], s:v.skin, c:v.shirt };
  const c = document.createElement('canvas'); c.width = rows[0].length + 2; c.height = rows.length + 2;
  const x = c.getContext('2d');
  x.fillStyle = '#16110d';
  for (const [ox, oy] of [[0,1],[2,1],[1,0],[1,2]])
    rows.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch !== '.') x.fillRect(xx + ox, y + oy, 1, 1); }));
  rows.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch !== '.') { x.fillStyle = col[ch]; x.fillRect(xx + 1, y + 1, 1, 1); } }));
  if (flip) {
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const fx = f.getContext('2d'); fx.scale(-1, 1); fx.drawImage(c, -c.width, 0);
    return personCache[key] = f;
  }
  return personCache[key] = c;
}
const NAMES_F = ['Ana','Carla','Elena','Gala','Iris','Lía','Nora','Paula','Sara','Vera','Alba','Celia','Irene','Julia','Marta','Noa','Olga','Rosa','Tea','Zoe'];
const NAMES_M = ['Bruno','Darío','Fede','Hugo','Joel','Marco','Óscar','Raúl','Teo','Yago','Abel','Ciro','Enzo','Gael','Iker','Leo','Mateo','Nil','Pau','Saúl'];
const NAMES = [...NAMES_F, ...NAMES_M];
const nameFor = sex => { const L = sex === 'm' ? NAMES_F : NAMES_M; return L[Math.floor(Math.random() * L.length)]; };
let villagers = [], follow = null;
function setFollow(v){
  follow = v;
  $('followTag').hidden = !v; pcardT = 0; renderPersonCard(true);
  // Encuadre inmediato: sin viaje de cámara por medio mundo
  if (v) { centerOn(v.x, v.y - 5, Math.max(zoom, 6)); updateFollowTag(); }
}
function followNext(){
  if (!villagers.length) return;
  const k = follow ? (villagers.indexOf(follow) + 1) % villagers.length : 0;
  setFollow(villagers[k]);
}
let pcardT = 0;
function updateFollowTag(){
  if (!follow) return;
  if (performance.now() - pcardT > 500) { pcardT = performance.now(); renderPersonCard(); }
  const state = follow.moving ? 'paseando' : 'descansando';
  const txt = `Siguiendo a ${follow.name} · ${state}`;
  if ($('followTxt').textContent !== txt) $('followTxt').textContent = txt;
}
let touchUI = false; addEventListener('pointerdown', e => { touchUI = e.pointerType === 'touch'; }, true);
function villagerAt(sx, sy){
  let best = null, bd = Math.max(touchUI ? 18 : 8, 5 * zoom); // un dedo es más gordo que el ratón
  for (const v of villagers) {
    const d = Math.hypot(offX + v.x * zoom - sx, offY + (v.y - 5) * zoom - sy);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
// Coste de pisar una casilla: tierra libre 1; río, lago o agua poco profunda 8 (hay que nadar);
// mar abierto, árboles, rocas y arbustos son infranqueables
const SWIM = 8;
function tileCost(tx, ty){
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return Infinity;
  const i = ty * W + tx, b = world.biome[i];
  if (bridgeSet.has(i)) return 1; // puente o muelle
  if (wallSet.has(i)) return Infinity; // muralla
  if (world.objs[i] || b === B.LAVA) return Infinity;
  if (WATER[b] && (dried(i) || frozen(i))) return 1.3; // cauce seco o agua helada: se cruza andando (por el barro o por el hielo)
  if (!WATER[b]) return isFlooded(i) ? SWIM : 1; // zona inundada: hay que nadar
  return b === B.RIVER || b === B.LAKE || b === B.SHALLOW ? SWIM : Infinity;
}
const tileFree = (tx, ty) => tileCost(tx, ty) === 1 && !bridgeSet.has(ty * W + tx); // tierra firme y libre (un puente no sirve para construir)
const inWater = (px, py) => { const i = Math.floor(py / T) * W + Math.floor(px / T); return !bridgeSet.has(i) && ((!!WATER[world.biome[i]] && !dried(i) && !frozen(i)) || isFlooded(i)); }; // sobre el hielo se anda
const walkable = (px, py) => tileCost(Math.floor(px / T), Math.floor(py / T)) < Infinity;
// Dijkstra en un radio de 8 casillas: el destino siempre es tierra y el camino rodea el agua salvo que no haya otra
function findPath(v){
  const sx = Math.floor(v.x / T), sy = Math.floor(v.y / T), R = 8, S = 2 * R + 1, NS = S * S, swimming = inWater(v.x, v.y);
  const dist = new Float32Array(NS).fill(Infinity), par = new Int32Array(NS).fill(-2), done = new Uint8Array(NS), cand = [];
  const L = (x, y) => (y - sy + R) * S + (x - sx + R);
  dist[L(sx, sy)] = 0; par[L(sx, sy)] = -1;
  for (;;) {
    let li = -1, best = Infinity;
    for (let k = 0; k < NS; k++) if (!done[k] && dist[k] < best) { best = dist[k]; li = k; }
    if (li < 0 || best > 140) break;
    done[li] = 1;
    const x = li % S - R + sx, y = Math.floor(li / S) - R + sy;
    // Quien está en el agua acepta cualquier orilla cercana; en tierra se busca un destino a 3+ pasos
    if ((best >= 3 || (best > 0 && swimming)) && tileFree(x, y)) cand.push(li);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (Math.abs(nx - sx) > R || Math.abs(ny - sy) > R) continue;
      const c = tileCost(nx, ny); if (c === Infinity) continue;
      if (dx && dy && (tileCost(x + dx, y) === Infinity || tileCost(x, y + dy) === Infinity)) continue; // sin cortar esquinas
      const ni = L(nx, ny), nd = best + c * (dx && dy ? 1.41 : 1);
      if (nd < dist[ni]) { dist[ni] = nd; par[ni] = li; }
    }
  }
  if (!cand.length) return null;
  let li = cand[Math.floor(Math.random() * cand.length)];
  const path = [];
  while (par[li] !== -1) { path.push([(li % S - R + sx) * T + 2, (Math.floor(li / S) - R + sy) * T + 3]); li = par[li]; }
  return path.reverse();
}
let nameIdx = 0;
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
function makeVillager(tx, ty, r, age, sex){
  const nv = lifeFields({ name:NAMES[nameIdx++ % NAMES.length], x:tx * T + 2, y:ty * T + 3, path:null, wait:.5 + r() * 1.5, walk:0, moving:false, dir:1, appear:1, sex,
    pants:pick(PANTS, r), hat:pick(HATS, r), skin:skinFor(clamp(ty, 0, H - 1) * W + clamp(tx, 0, W - 1), r), shirt:pick(SHIRT, r), hair:pick(HAIR, r) },
    tx, ty, age ?? 3 + r() * 6, r);
  nv.name = nameFor(nv.sex); nv.fresh = true; return nv; // (en cuanto tenga pueblo, un nombre de su lengua: idiomas.js)
}

// ---- Crear vida: aparición con haz de luz, onda y chispas ----
const SPAWN_TOOLS = new Set(['person', 'family', 'remove', 'animal', 'tornado', 'tromba', 'huracan', 'remolino', 'terremoto', 'meteorito']);
let effects = [];
function addEffect(x, y, kind, delay = 0){
  if (kind === 'poof') snd('build', x, y);
  const n = kind === 'spawn' ? 16 : 12;
  effects.push({ x, y, kind, t:-delay, parts:Array.from({ length:n }, () => ({
    a:Math.random() * Math.PI * 2, s:3 + Math.random() * 8, vy:-(5 + Math.random() * 14),
    c:kind === 'spawn' ? (Math.random() < .5 ? '255,244,192' : '233,185,73') : (Math.random() < .5 ? '200,200,200' : '140,140,140') })) });
}
function updateEffects(dt){ for (const e of effects) e.t += dt; effects = effects.filter(e => e.t < 1.6); }
function drawEffects(){
  for (const e of effects) {
    const t = e.t; if (t < 0) continue;
    const x = Math.round(e.x), y = Math.round(e.y);
    if (e.kind === 'spawn') {
      // Haz de luz: entra rápido desde el cielo, se mantiene y se estrecha al apagarse
      const grow = Math.min(1, t / .15), ba = t < .7 ? 1 : Math.max(0, 1 - (t - .7) / .5);
      if (ba > 0) {
        const len = Math.round(90 * grow), w = t < .7 ? 1 : ba;
        vctx.fillStyle = `rgba(255,214,110,${ba * .22})`; vctx.fillRect(x - Math.round(6 * w), y - len, Math.round(6 * w) * 2 + 1, len + 1);
        vctx.fillStyle = `rgba(255,236,170,${ba * .5})`; vctx.fillRect(x - Math.round(3 * w), y - len, Math.round(3 * w) * 2 + 1, len + 1);
        vctx.fillStyle = `rgba(255,255,255,${ba * .95})`; vctx.fillRect(x - 1, y - len, 3, len + 1);
        // Destello en el suelo
        vctx.fillStyle = `rgba(255,250,220,${ba * .8})`; vctx.fillRect(x - 4, y - 1, 9, 3); vctx.fillRect(x - 2, y - 2, 5, 5);
        // Chispas que bajan por el haz
        for (let k = 0; k < 6; k++) {
          const py = y - len + ((t * 120 + k * 15) % Math.max(1, len));
          vctx.fillStyle = `rgba(255,255,255,${ba})`; vctx.fillRect(x + ((k * 7) % 9) - 4, Math.round(py), 1, 2);
        }
      }
    }
    // Onda en el suelo
    const r = 2 + t * 12, ra = Math.max(0, 1 - t / 1.4);
    vctx.fillStyle = e.kind === 'spawn' ? `rgba(233,185,73,${ra})` : `rgba(180,180,180,${ra * .8})`;
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; vctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + 1 + Math.sin(a) * r * .4), 1, 1); }
    // Chispas (o humo al retirar)
    for (const p of e.parts) {
      const pa = Math.max(0, 1 - t / 1.5);
      vctx.fillStyle = `rgba(${p.c},${pa})`;
      vctx.fillRect(Math.round(x + Math.cos(p.a) * p.s * t * 1.4), Math.round(y - 2 + p.vy * t + 9 * t * t), 1, 1);
    }
  }
}
function godClick(sx, sy){
  if (params.tool === 'meteorito') { launchMeteor((sx - offX) / zoom, (sy - offY) / zoom); return; }
  if (params.tool === 'terremoto') {
    // Más fuerte cuanto más cerca de una frontera entre placas
    const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom, tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    let near = 0;
    for (let dy = -6; dy <= 6 && !near; dy++) for (let dx = -6; dx <= 6; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < W && y < H && world.pb[y * W + x]) { near = 1; break; }
    }
    // En el mar, el terremoto es siempre lo bastante fuerte para provocar un tsunami
    const M = 5 + Math.random() * 1.5 + near * 1.5;
    startQuake(wx, wy, surfaceWater(wx, wy) ? Math.max(M, 6.5 + Math.random()) : M);
    return;
  }
  if (params.tool === 'remolino') {
    const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom;
    if (!seaOK(wx, wy)) { hud.textContent = 'Los torbellinos solo se forman en mar abierto.'; return; }
    const w = addWhirl(wx, wy, false); if (w) w.age = 2; else hud.textContent = whirls.length >= 4 ? 'Ya hay demasiados torbellinos.' : 'Necesita más mar abierto alrededor.';
    return;
  }
  if (params.tool === 'tornado' || params.tool === 'tromba' || params.tool === 'huracan') {
    const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom;
    // Tornado y tromba son lo mismo: depende de si cae en tierra o en agua
    const type = params.tool === 'huracan' ? 'huracan' : surfaceWater(wx, wy) ? 'tromba' : 'tornado';
    if (!params.weather) { params.weather = true; $('weather').checked = true; }
    const s = addStorm(type, wx, wy, false);
    if (s) { s.age = 1.5; if (type === 'huracan') s.life = 55; }
    else hud.textContent = 'Ya hay demasiados fenómenos a la vez: espera a que se disipe alguno.';
    return;
  }
  if (params.tool === 'animal') {
    // Suelta un grupo pequeño de la especie elegida (pareja o rebaño mínimo; solitarios, uno)
    const sp = $('animalSel').value, S = ANIMALS[sp], wx = (sx - offX) / zoom, wy = (sy - offY) / zoom;
    if (!aFree(wx, wy)) { hud.textContent = 'Los animales necesitan tierra libre: sin agua, lava ni árboles.'; return; }
    const herd = S.herd[1] > 1 ? ++herdSeq : 0, n = S.herd[1] > 1 ? Math.max(2, S.herd[0]) : 1;
    for (let k = 0; k < n; k++) {
      const x = wx + (Math.random() - .5) * 10, y = wy + (Math.random() - .5) * 10;
      if (aFree(x, y)) { makeAnimal(sp, x, y, herd, 1 + Math.random()); addEffect(x, y, 'spawn', k * .1); }
    }
    updateFaunaPanel();
    return;
  }
  if (params.tool === 'remove' && !villagerAt(sx, sy)) {
    const a = animalAt(sx, sy); if (a) { killAnimal(a, 'retirado'); animals = animals.filter(o => !o.dead); updateFaunaPanel(); }
    return;
  }
  if (params.tool === 'remove') {
    const v = villagerAt(sx, sy);
    if (v) { villagers.splice(villagers.indexOf(v), 1); if (follow === v) setFollow(null); addEffect(v.x, v.y, 'poof'); }
    return;
  }
  const n = params.tool === 'family' ? 3 : 1, [cx, cy] = toTile(sx, sy);
  let made = 0;
  for (let k = 0; k < 80 && made < n; k++) {
    const rr = k === 0 ? 0 : 1 + Math.floor(k / 16);
    const tx = cx + Math.round((Math.random() * 2 - 1) * rr), ty = cy + Math.round((Math.random() * 2 - 1) * rr);
    if (!tileFree(tx, ty) || villagers.some(v => v.appear < .25 && Math.floor(v.x / T) === tx && Math.floor(v.y / T) === ty)) continue;
    // Una familia: un hombre, una mujer y un niño
    const v = n === 3 ? makeVillager(tx, ty, Math.random, made === 2 ? .5 : 3 + Math.random() * 3, made === 0 ? 'h' : made === 1 ? 'm' : undefined) : makeVillager(tx, ty, Math.random);
    v.appear = -.45 - made * .15; // aparece cuando el haz ya está encendido
    villagers.push(v);
    addEffect(tx * T + 2, ty * T + 3, 'spawn', made * .15);
    made++;
  }
  if (!made) hud.textContent = 'Aquí no puede vivir nadie: elige tierra libre, sin agua ni árboles.';
}
function drawPersonIcons(){
  const samples = [{ skin:SKIN[1], shirt:SHIRT[0], hair:HAIR[1], pants:PANTS[0], long:false }, { skin:SKIN[5], shirt:SHIRT[1], hair:HAIR[0], pants:PANTS[1], long:true }, { skin:SKIN[3], shirt:SHIRT[3], hair:HAIR[2], pants:PANTS[2], long:false }];
  document.querySelectorAll('canvas.pi').forEach(c => {
    const x = c.getContext('2d');
    for (let k = 0; k < +c.dataset.n; k++) x.drawImage(personSprite(samples[k], 0, false), k * 8, c.height - 8);
  });
}

function spawnVillagers(){
  villagers = []; setFollow(null); nameIdx = 0; villages = []; rels = new Map(); travelers = []; diploT = 5; farmMap = new Map(); vidSeq = 0; pathMap = new Set(); bridgeSet = new Set(); bridges = []; plazaSet = new Set(); holySet = new Map(); usedFlags = new Set(); wear = new Float32Array(N); wornSet = new Set(); desireSet = new Set(); arrows = []; chips = []; floats = []; zoneCv = null; zoneT = 0; wallSet = new Set(); gateSet = new Set(); alliances = []; moneyFlows = []; worldHist = { t:[], n:{} }; olymp = { next:yearT + SEASON_LEN * 2, cur:null, past:[] }; epidemics = []; ballGames = []; sieges = []; stones = []; wallStone = new Set(); gateOwner = new Map();
  if (!params.people) { updateVillagePanel(); return; }
  const r = mulberry32(hashStr(params.seed) ^ 0x51ed), bi = world.biome;
  // Tres pueblos en tierra buena cerca de agua dulce, lo bastante lejos para ser distintos y lo bastante cerca
  // para acabar encontrándose (cada uno con la piel de su clima)
  const starts = [];
  for (let vi = 0; vi < 3; vi++) {
    let start = -1;
    for (let k = 0; k < 8000 && start < 0; k++) {
      const i = Math.floor(r() * N), x = i % W, y = (i / W) | 0;
      if (!(bi[i] === B.GRASS || bi[i] === B.PLAINS || bi[i] === B.FOREST || bi[i] === B.DRY) || !(k > 5000 || freshNear(i, 6))) continue;
      if (starts.some(([sx0, sy0]) => { const d = Math.hypot(x - sx0, y - sy0); return d < 60 || d > 190; })) continue;
      start = i;
    }
    if (start < 0) continue;
    const sx = start % W, sy = (start / W) | 0, g = makeVillage(sx, sy); if (!g) continue;
    starts.push([sx, sy]);
    for (let n = 0, tries = 0; n < 12 && tries < 400; tries++) {
      const tx = sx + Math.floor(r() * 9) - 4, ty = sy + Math.floor(r() * 9) - 4;
      if (!tileFree(tx, ty)) continue;
      const v = makeVillager(tx, ty, r, n < 8 ? 3 + r() * 6 : r() * 2, n < 8 ? (n % 2 ? 'm' : 'h') : undefined); // 4 parejas y algunos niños
      v.vid = g.id; villagers.push(v); n++;
    }
  }
  updateVillagePanel();
}
function drawVillagers(){
  if (!villagers.length && !villages.length) return;
  const objs = world.objs, now = performance.now(), [vx0, vy0, vx1, vy1] = visibleRect();
  const camps = villages.filter(g => !g.fireOut && world.objs[g.fy * W + g.fx] && g.fx * T > vx0 - 10 && g.fx * T < vx1 + 10 && g.fy * T > vy0 - 20 && g.fy * T < vy1 + 10).sort((a, b) => a.fy - b.fy);
  let ci = 0, qi = 0;
  for (const v of [...villagers].sort((a, b) => a.y - b.y)) {
    while (ci < camps.length && camps[ci].fy * T + 3 <= v.y) drawCampFlames(camps[ci++], now);
    while (qi < campQueue.length && campQueue[qi].y <= v.y) campQueue[qi++].f(); // tiendas de acampadas y campamentos que están más atrás
    drawAnimals(v.y); // los animales que están más atrás que este aldeano
    const s = personSprite(v, v.moving ? Math.floor(v.walk * 8) % 2 : 0, v.dir < 0);
    const x = Math.round(v.x), y = Math.round(v.y), selected = v === follow;
    const ringA = .65 + .35 * Math.sin(performance.now() / 250);
    if (selected) { vctx.fillStyle = `rgba(233,185,73,${ringA})`; for (const [dx, dy] of RING) if (dy < 1) vctx.fillRect(x + dx, y + dy, 1, 1); }
    if (v.appear < 0 || v.away) continue;
    if (v.sleep && v.home != null) continue; // durmiendo en casa
    if (v.sleep) { vctx.save(); vctx.translate(x, y - 2); vctx.rotate(-Math.PI / 2); vctx.drawImage(s, -(s.width >> 1), -(s.height >> 1)); vctx.restore(); continue; } // al raso, tumbado
    // Al aparecer cae desde arriba con un fundido
    const drop = v.appear < .25 ? Math.round((1 - v.appear / .25) * 8) : 0;
    if (v.boat) {
      // En la barca: de cintura para arriba, remando
      drawBoat(x, y, v.dir, now, v.moving, s);
    } else if (v.appear >= .25 && inWater(v.x, v.y)) {
      // Nadando: asoman cabeza y hombros y los brazos dan brazadas; al bajarlos salpican y dejan ondas
      const tt = performance.now() / 1000, ph = tt * 2.6 + v.x * .37, fr = Math.floor(ph) % 2;
      const sw = swimSprite(v, fr, v.dir < 0), bob = Math.round(Math.sin(ph * Math.PI) * .6), hy = y - sw.height + 3 + bob;
      vctx.drawImage(sw, x - (sw.width >> 1), hy);
      const ra = .45 + .25 * Math.sin(tt * 3 + v.y), wy = hy + sw.height - 1;
      vctx.fillStyle = `rgba(225,242,255,${ra})`;
      vctx.fillRect(x - 6, wy, 3, 1); vctx.fillRect(x + 4, wy, 3, 1); vctx.fillRect(x - 3, wy + 1, 7, 1);
      if (!fr && ph % 1 < .35) { vctx.fillStyle = 'rgba(240,250,255,.85)'; vctx.fillRect(x - 6, wy - 1, 1, 1); vctx.fillRect(x + 6, wy - 1, 1, 1); vctx.fillRect(x - 5, wy - 2, 1, 1); vctx.fillRect(x + 5, wy - 2, 1, 1); }
    } else {
      vctx.fillStyle = 'rgba(0,0,0,.3)';
      vctx.fillRect(x - 2, y + 1, 5, 1);
      // A caballo: primero el caballo (y el carro detrás), y el jinete encima
      let lift = 0;
      if (v.mount) {
        const hs = animalSprite(v.mount, v.moving ? Math.floor(v.walk * 8) % 2 : 0);
        if (v.cart) drawCart(x - v.dir * (hs.width >> 1) - v.dir * 4, y, v.dir, now, v.carry ? (v.carry.k === 'madera' ? '#a87448' : v.carry.k === 'piedra' ? '#a8a49c' : '#c86a4a') : null);
        vctx.drawImage(hs, x - hs.ax, y - hs.height + 1); lift = Math.round(hs.height * .55);
      }
      vctx.globalAlpha = Math.min(1, v.appear / .25 + .3);
      if (v.born !== undefined && (yearT - v.born) / YEAR < ADULT_H) { // los niños, más pequeños
        const w = Math.round(s.width * .72), h = Math.round(s.height * .72);
        vctx.drawImage(s, x - (w >> 1), y - h + 1 - drop - lift, w, h); drawHurt(v, s, x - (w >> 1), y - h + 1 - drop - lift, w, h);
      } else { vctx.drawImage(s, x - (s.width >> 1), y - s.height + 1 - drop - lift); drawHurt(v, s, x - (s.width >> 1), y - s.height + 1 - drop - lift); }
      vctx.globalAlpha = 1;
      if (v.task && v.task.k === 'protesta') { // cartel en alto, subiendo y bajando
        const sx = x + v.dir * 2, sy = y - s.height - 8 - lift - drop - ((Math.floor(now / 280) + Math.floor(v.x)) % 2);
        vctx.fillStyle = '#7a5230'; vctx.fillRect(sx, sy + 4, 1, 6); vctx.fillStyle = '#2a2420'; vctx.fillRect(sx - 4, sy - 1, 9, 6);
        vctx.fillStyle = v.task.col; vctx.fillRect(sx - 3, sy, 7, 4); vctx.fillStyle = '#3a3028'; vctx.fillRect(sx - 2, sy + 1, 2, 1); vctx.fillRect(sx + 1, sy + 1, 2, 1); vctx.fillRect(sx - 2, sy + 2, 4, 1);
      }
      if (v.task && (v.task.k === 'golpe' || (v.task.k === 'trabajando' && v.task.job === 'golpe'))) { // brazalete y banderín de los golpistas
        const sx = x - v.dir * 2, sy = y - s.height - 6 - lift - drop; vctx.fillStyle = '#5a4030'; vctx.fillRect(sx, sy, 1, 8); vctx.fillStyle = '#c8302a'; vctx.fillRect(sx + 1, sy, 3, 2); vctx.fillStyle = '#1a1a1a'; vctx.fillRect(sx + 1, sy + 2, 3, 1);
      }
      if (v.task && v.task.k === 'trabajando' && v.task.job === 'detenido') { vctx.fillStyle = '#6a6a70'; vctx.fillRect(x - 2, y - 7, 5, 1); } // con grilletes
      if (v.task && v.task.k === 'trabajando' && v.task.job === 'ocio' && (Math.floor(now / 900) + Math.floor(v.x)) % 3 === 0) { const bx = x + v.dir * 3, by = y - s.height - 6 - lift; vctx.fillStyle = 'rgba(240,236,224,.9)'; vctx.fillRect(bx - 2, by, 5, 3); vctx.fillRect(bx - v.dir, by + 3, 1, 1); vctx.fillStyle = '#3a3028'; vctx.fillRect(bx - 1, by + 1, 1, 1); vctx.fillRect(bx + 1, by + 1, 1, 1); }
      if (v.task && v.task.k === 'trabajando' && v.task.job === 'votar') { const vp = partyOf(v); vctx.fillStyle = vp ? vp.col : '#f2efe6'; vctx.fillRect(x + v.dir * 2, y - 8 - ((Math.floor(now / 500) + v.x) % 2), 2, 3); }
      if (v.task && v.task.k === 'trabajando' && (v.task.job === 'orar' || v.task.job === 'ritual')) { const g0 = villageById(v.vid); if (g0) { const [r, gg, b] = villageColor(g0); vctx.fillStyle = `rgba(${Math.min(255, r + 90)},${Math.min(255, gg + 90)},${Math.min(255, b + 90)},.9)`; for (let k = 0; k < 2; k++) vctx.fillRect(x - 2 + k * 4, y - s.height - 2 - Math.floor((now / 160 + k * 3) % 6), 1, 1); } }
      if (v.task && v.task.k === 'trabajando' && (v.born === undefined || (yearT - v.born) / YEAR >= ADULT_H)) drawTool(v, x, y, now);
      if (v.bearer && v.task && v.task.k === 'asalto') { const nf = nationOf(villageById(v.vid) || {}).flag, px = x - v.dir * 3, py = y - s.height - 12 - lift - drop; vctx.fillStyle = '#5a3a20'; vctx.fillRect(px, py, 1, s.height + 12); if (nf) drawFlag(nf, v.dir > 0 ? px + 1 : px - 8, py, 15, 10, .5, now); else { vctx.fillStyle = natCol(v); vctx.fillRect(v.dir > 0 ? px + 1 : px - 7, py, 7, 5); } } // el abanderado
      if (v.sick) { vctx.fillStyle = 'rgba(130,200,90,.65)'; vctx.fillRect(x - 1, y - s.height + 3 - lift - drop, 3, 2); if (Math.random() < .004) { floats.push({ x, y:y - 14, txt:'*cof*', col:'#b8d890', life:0 }); snd('cough', x, y); } } // enfermo: la cara verdosa
      // De qué nación es: cinturón de su color (los adultos)
      if (v.born !== undefined && (yearT - v.born) / YEAR >= ADULT_H && zoom >= 3) { vctx.fillStyle = natCol(v); vctx.fillRect(x - 1, y - 4 - lift - drop, 3, 1); }
      // Arma en la mano: la lanza en vertical (adelantada al clavarla) o el arco
      { const gl = villageById(v.vid); if (gl && gl.leader === v) { const hy = y - s.height - lift - drop - 1; vctx.fillStyle = '#f0c840'; vctx.fillRect(x - 2, hy, 5, 1); vctx.fillRect(x - 2, hy - 1, 1, 1); vctx.fillRect(x, hy - 1, 1, 1); vctx.fillRect(x + 2, hy - 1, 1, 1); } }
      if (v.weapon && !(v.task && v.task.k === 'trabajando' && WORK_TOOLS[v.task.job]) && (v.born === undefined || (yearT - v.born) / YEAR >= ADULT_H)) {
        const d = v.dir, wx = x + d * 3 + (v.stab > 0 ? d * 2 : 0);
        const top = y - s.height + 1 - lift - drop, ncol = natCol(v);
        vctx.fillStyle = ncol; vctx.fillRect(x - 1, y - 7 - lift - drop, 3, 3); // sobreveste con el color de su nación
        if (v.armor === 'hierro') { vctx.fillStyle = '#8a929c'; vctx.fillRect(x - 2, top, 5, 2); vctx.fillStyle = '#c8d0d8'; vctx.fillRect(x - 1, top, 2, 1); vctx.fillStyle = '#9aa2ac'; vctx.fillRect(x - 2, y - 7 - lift - drop, 1, 2); vctx.fillRect(x + 2, y - 7 - lift - drop, 1, 2); vctx.fillStyle = '#5a626c'; vctx.fillRect(x - 1, y - 5 - lift - drop, 3, 1); } // casco, hombreras y cota
        else if (v.armor === 'cuero') { vctx.fillStyle = '#7a4a28'; vctx.fillRect(x - 2, top, 5, 1); vctx.fillStyle = '#8a5a30'; vctx.fillRect(x - 2, y - 7 - lift - drop, 1, 2); vctx.fillRect(x + 2, y - 7 - lift - drop, 1, 2); vctx.fillStyle = '#5a3418'; vctx.fillRect(x - 1, y - 5 - lift - drop, 3, 1); } // gorro y hombreras de cuero
        if (v.shield) { const sx = x - d * 3, sy = y - 8 - lift - drop; vctx.fillStyle = '#3a2614'; vctx.fillRect(sx - 1, sy, 4, 6); vctx.fillStyle = ncol; vctx.fillRect(sx, sy + 1, 2, 4); vctx.fillStyle = '#c8ccd0'; vctx.fillRect(sx, sy + 2, 1, 1); } // escudo pintado con su color
        if (v.weapon === 'lanza') { vctx.fillStyle = '#7a5230'; vctx.fillRect(wx, y - 9, 1, 9); vctx.fillStyle = v.ironW ? '#e0e4ea' : '#c8ccd0'; vctx.fillRect(wx, y - 11, 1, 2); }
        else if (v.weapon === 'espada') { vctx.fillStyle = '#5a3a20'; vctx.fillRect(wx, y - 5, 1, 2); vctx.fillStyle = '#8a8e96'; vctx.fillRect(wx - 1, y - 6, 3, 1); vctx.fillStyle = '#e0e4ea'; vctx.fillRect(wx, y - 11, 1, 5); }
        else if (v.weapon === 'ballesta') { vctx.fillStyle = '#6a4426'; vctx.fillRect(wx - d * 2, y - 6, 4, 1); vctx.fillStyle = '#8a8e96'; vctx.fillRect(wx + d * 2, y - 8, 1, 5); vctx.fillStyle = 'rgba(235,235,225,.8)'; vctx.fillRect(wx + d, y - 8, 1, 1); vctx.fillRect(wx + d, y - 4, 1, 1); }
        else { vctx.fillStyle = '#7a5230'; vctx.fillRect(wx, y - 8, 1, 1); vctx.fillRect(wx + d, y - 7, 1, 4); vctx.fillRect(wx, y - 3, 1, 1); vctx.fillStyle = 'rgba(235,235,225,.8)'; vctx.fillRect(wx, y - 7, 1, 4); }
      }
      // Pescando con caña: la vara inclinada sobre el agua, el sedal y el corcho que se mece
      if (v.rod && v.task && v.task.k === 'trabajando' && v.task.job === 'pescar') {
        const d = v.dir, hx = x + d * 2, hy = y - 4, ex = x + d * 8, ey = y - 10, tt = performance.now();
        vctx.fillStyle = '#6a4426';
        for (let k = 0; k <= 6; k++) vctx.fillRect(Math.round(hx + (ex - hx) * k / 6), Math.round(hy + (ey - hy) * k / 6), 1, 1);
        const by = y + 2 + Math.round(Math.sin(tt / 280 + x) * .6);
        vctx.fillStyle = 'rgba(235,235,225,.65)';
        for (let yy = ey + 1; yy < by; yy++) vctx.fillRect(ex + (yy - ey > 6 ? d : 0), yy, 1, 1);
        vctx.fillStyle = '#e04030'; vctx.fillRect(ex + d, by, 1, 1);
      }
      if (v.bucket) { const bx = x + v.dir * 3, by = y - 5; vctx.fillStyle = '#6a6a70'; vctx.fillRect(bx - 1, by, 3, 3); vctx.fillStyle = '#5a9ae0'; vctx.fillRect(bx, by, 1, 1); }
      // Lo que lleva a la aldea, sobre la cabeza: madera, piedra o comida
      if (v.carry) { vctx.fillStyle = v.carry.k === 'madera' ? '#8a5a30' : v.carry.k === 'piedra' ? '#9a948c' : '#d84a3a'; vctx.fillRect(x - 1, y - s.height - 2, 3, 2); }
      drawRainCover(v, x, y - s.height + 1); // paraguas u hoja si llueve (lluvia.js)
      drawWealth(v, x, y, y - s.height + 1); // collar y capa de los ricos, remiendos de los pobres (riqueza.js)
    }
    if (selected) { vctx.fillStyle = `rgba(233,185,73,${ringA})`; for (const [dx, dy] of RING) if (dy >= 1) vctx.fillRect(x + dx, y + dy, 1, 1); }
    if (!params.objects) continue;
    // Se repintan encima los objetos que están delante (base más abajo): las copas tapan al aldeano.
    // Al aldeano que sigue la cámara se le ve a través de ellas.
    const top = y - s.height + 1;
    for (let ty = Math.max(0, Math.floor(y / T)); ty <= Math.min(H - 1, Math.floor((y + 56) / T)); ty++)
      for (let tx = Math.max(0, Math.floor((x - 28) / T)); tx <= Math.min(W - 1, Math.floor((x + 28) / T)); tx++) {
        const o = objs[ty * W + tx]; if (!o) continue;
        const os = objSprite(o), by = ty * T + 3 + o.oy;
        if (by <= y || o.key === 'quarry:cantera') continue;
        const left = tx * T + 2 + o.ox - os.ax, otop = by - os.height + 1;
        const hw = v.boat ? 15 : 4; // en barca ocupa mucho más que una persona
        if (left > x + hw || left + os.width <= x - hw || otop > y || by < top) continue;
        vctx.globalAlpha = selected ? .5 : 1;
        vctx.drawImage(os, left, otop);
        vctx.globalAlpha = 1;
      }
    // El círculo del aldeano fijado se ve aunque esté detrás de una copa
    if (selected) { vctx.fillStyle = `rgba(233,185,73,${ringA * .7})`; for (const [dx, dy] of RING) vctx.fillRect(x + dx, y + dy, 1, 1); }
  }
  while (ci < camps.length) drawCampFlames(camps[ci++], now);
  while (qi < campQueue.length) campQueue[qi++].f();
  drawTravelers(now); drawPirates(now); drawBandits(now); drawSieges(now); drawBallGames(); drawMoneyFlows(now);
  drawArrows();
  drawWorkFx(now);
  drawProtestBanners();
}

// Cambiar el tamaño del lienzo lo borra: solo se hace si cambió de verdad, se conserva el centro de la vista
// y se repinta en el acto (si no, se ve un fotograma vacío: el parpadeo)
new ResizeObserver(() => {
  const dpr = window.devicePixelRatio || 1, nw = stage.clientWidth, nh = stage.clientHeight;
  const bw = Math.round(nw * dpr), bh = Math.round(nh * dpr);
  if (cw && nw) { offX += (nw - cw) / 2; offY += (nh - ch) / 2; }
  cw = nw; ch = nh;
  if (view.width !== bw || view.height !== bh) { view.width = bw; view.height = bh; draw(performance.now()); }
}).observe(stage);
