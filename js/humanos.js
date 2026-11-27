// World Sim · Aldeanos, pueblos, oficios, edificios, política, economía y guerra
// ================= Humanos: vida, aldeas, cultivos y ganado =================
// Cada aldeano nace, crece, come, bebe, pasa frío o calor (menos junto a la hoguera o en casa) y muere de viejo,
// de hambre, de sed o por el clima. Vive en una aldea con una hoguera y un almacén común (comida, madera, piedra).
// Los adultos eligen trabajo según lo que le falte a su aldea: talar, picar piedra, recoger bayas, pescar, cazar,
// sembrar junto al agua dulce y cosechar, construir casas, hacer un cercado y traer animales de granja.
// Con comida y casas de sobra, las parejas tienen hijos que heredan su piel, su pelo y su adaptación al clima.
// Al principio no saben qué animales aguantan su clima: si se les mueren de frío o de calor, aprenden y la próxima
// vez escogen animales adaptados a su zona
const ADULT_H = 2.5, H_LIFE = [14, 22], H_COLD = -6, H_HEAT = 40, WARMTH = 14;
let villages = [], vidSeq = 0, farmMap = new Map(), villageClock = 0;
// Nombres de aldea inventados: se juntan sílabas (inicio + medio + final), y a veces una coletilla.
// No salen de ninguna lista de pueblos reales
const VN_INI = ['Al', 'Bor', 'Ca', 'Dur', 'El', 'Fen', 'Gal', 'Har', 'Il', 'Kar', 'Lo', 'Mar', 'Nor', 'Os', 'Pel', 'Qui', 'Ru', 'Sel', 'Tor', 'Ul', 'Val', 'Yr', 'Zan', 'Bri', 'Dra', 'Gre', 'Thal', 'Ves'];
const VN_MID = ['a', 'e', 'i', 'o', 'u', 'ar', 'en', 'il', 'or', 'um', 'ae', 'io', 'an', 'el', 'ir'];
const VN_END = ['dor', 'ria', 'mund', 'thal', 'vel', 'nor', 'gard', 'lin', 'mar', 'nes', 'quia', 'rok', 'sen', 'tis', 'wen', 'zor', 'baya', 'dún', 'lea', 'rin'];
const VN_SUF = [' Alta', ' Baja', ' del Norte', ' del Sur', ' Vieja', ' Nueva', ' del Río', ' del Valle', ' de la Sierra', ' del Lago'];
const rnd1 = a => a[Math.floor(Math.random() * a.length)];
function villageName(){
  for (let k = 0; k < 30; k++) {
    let n = rnd1(VN_INI) + (Math.random() < .55 ? rnd1(VN_MID) : '') + rnd1(VN_END);
    n = n.replace(/([aeiou])/g, '$1');               // sin vocales dobles
    if (Math.random() < .2) n += rnd1(VN_SUF);
    if (!villages.some(g => g.name === n)) return n;
  }
  return rnd1(VN_INI) + rnd1(VN_END) + ' ' + (vidSeq + 1);
}
// (con un índice: se llama miles de veces por paso; los pueblos solo se añaden o se cambia la lista entera)
let vbiArr = null, vbiLen = -1, vbiMap = null;
const villageById = id => { if (villages !== vbiArr || villages.length !== vbiLen) { vbiArr = villages; vbiLen = villages.length; vbiMap = new Map(); for (const g of villages) if (!vbiMap.has(g.id)) vbiMap.set(g.id, g); }
  const g = vbiMap.get(id); return g && g.id === id ? g : villages.find(o => o.id === id); };
const fireXY = g => [g.fx * T + 2, g.fy * T + 2];
// Cada uno tiene su sitio alrededor de la hoguera: si no, se amontonan todos en el mismo punto
const fireSpot = (v, g) => { v.slotA ??= Math.random() * Math.PI * 2; return [g.fx * T + 2 + Math.cos(v.slotA) * 9, g.fy * T + 4 + Math.sin(v.slotA) * 6]; };
// Habitantes de cada pueblo: se cuentan una vez por paso (antes se recorría a toda la gente en cada pregunta, miles por fotograma)
let popC = null, popCT = -1, popCN = -1;
const popOf = g => { if (popCT !== yearT || popCN !== villagers.length) { popCT = yearT; popCN = villagers.length; popC = new Map(); for (const v of villagers) if (!v.dead) popC.set(v.vid, (popC.get(v.vid) || 0) + 1); } return popC.get(g.id) || 0; };
const housesOf = g => g.houses.filter(i => world.objs[i] && world.objs[i].key.startsWith('house') && !world.objs[i].burnt);
const houseRoom = i => { const k = world.objs[i] && world.objs[i].key; return k && k.startsWith('house:bloque') ? BLOQUE_ROOM[k] || 14 : k === 'house:piedra' || k === 'house:mansion' ? 6 : k === 'house:chabola' ? 3 : 4; }; // el bloque de pisos (era industrial), tres plantas de vecinos // la de piedra (y la mansión), un piso más; la chabola, menos
const houseCap = g => housesOf(g).reduce((a, i) => a + houseRoom(i), 0);
// Casas de piedra que pueden pasar a bloque de pisos: las más cercanas a la plaza primero
// Bloques de pisos: de 2 a 6 plantas (house:bloque1..5); cuánto se puede subir depende de la técnica
const BLOQUE_ROOM = { 'house:bloque1':12, 'house:bloque2':18, 'house:bloque3':24, 'house:bloque4':30, 'house:bloque5':36, 'house:bloque':18 };
const bloqueTier = k => k === 'house:piedra' ? 0 : k && k.startsWith('house:bloque') ? +(k.slice(12) || 2) : -1;
const bloqueMax = g => typeof industrial === 'function' && !industrial(g) ? (popOf(g) >= 60 ? 1 : 0) : Math.min(5, (knowsSci(g, 'dirigible') ? 5 : knowsSci(g, 'ferrocarril') ? 4 : 3) + (hasLaw(g, 'edificacion_altura') ? 1 : 0)); // (con la ley de edificación en altura, una planta más)
// (antes del vapor, una ciudad grande sin solares ya levanta casas de vecinos de dos plantas: si no, se estancaba en unos 150)
// Casas que pueden ganar una planta (de piedra a bloque, o un bloque que sube): las más cercanas a la plaza primero
// Un bloque de pisos solo donde hay calle delante (o al lado): la casa tiene que dar a un camino
const onStreet = i => { const x = i % W, y = (i / W) | 0; for (let yy = y - 1; yy <= y + 2; yy++) for (let xx = x - 4; xx <= x + 4; xx++) if (pathMap.has(yy * W + xx)) return true; return false; };
const pisoCands = g => { const mx = bloqueMax(g); return housesOf(g).filter(i => { const t = bloqueTier(world.objs[i].key); return t >= 0 && t < mx && onStreet(i) && !villagers.some(u => u.task && u.task.k === 'pisos' && u.task.i === i); }).sort((a, b) => Math.hypot(a % W - g.fx, ((a / W) | 0) - g.fy) - Math.hypot(b % W - g.fx, ((b / W) | 0) - g.fy)); };
const penAnimals = g => animals.filter(a => !a.dead && a.dom === g.id);
const MALE_ONLY = new Set(['barba', 'calvo', 'coronilla', 'calvoBarba', 'cresta']), FEMALE_ONLY = new Set(['largo', 'melena', 'coleta', 'mono']);
function pickStyleSex(r, sex){
  for (let k = 0; k < 20; k++) { const st = pickStyle(r); if (sex === 'h' ? !FEMALE_ONLY.has(st) : !MALE_ONLY.has(st)) return st; }
  return 'corto';
}
// Datos de vida de un aldeano: sexo, edad, esperanza de vida, necesidades y adaptación al clima de donde nace
function lifeFields(v, tx, ty, ageYears, r){
  const i = clamp(ty, 0, H - 1) * W + clamp(tx, 0, W - 1);
  v.sex = v.sex || (r() < .5 ? 'h' : 'm');
  v.style = pickStyleSex(r, v.sex);
  v.born = yearT - ageYears * YEAR; v.life = H_LIFE[0] + r() * (H_LIFE[1] - H_LIFE[0]);
  v.food = .7 + r() * .3; v.water = .7 + r() * .3; v.chill = 0; v.hot = 0; v.starve = 0; v.thirst = 0;
  v.ad = clamp(((world.baseT ? world.baseT[i] : 15) - 15) * .6, -18, 18);
  v.task = null; v.carry = null; v.actT = 0; v.vid = 0;
  v.diet = clamp(.5 + (r() - .5) * .2, 0, 1); v.ate = v.diet; v.rod = false; // 0 = vegetariano, 1 = carnívoro
  v.hp = 1; v.weapon = null; v.atkT = 0; v.foe = null;
  v.swims = r() < .5; v.drownT = 0; // la mitad sabe nadar
  v.ideo = clamp((r() + r() + r() - 1.5) * .7, -1, 1); // ideas políticas: -1 izquierda, +1 derecha
  return v;
}
// ¿Queda sitio para un pueblo nuevo aquí? Lejos de los que ya hay (más cuanto más grandes): si no, crecen el uno
// dentro del otro y las calles, campos y murallas se pisan
const townSpace = (x, y) => !villages.some(o => !o.dead && popOf(o) > 0 && Math.hypot(o.fx - x, o.fy - y) < Math.max(34, (o.houses.length && typeof townRadius === 'function' ? townRadius(o) : 8) + 24));
function makeVillage(tx, ty){
  if (volcDanger(tx, ty, 6)) return null; // nadie se asienta al pie de un volcán (volcanes.js)
  let fi = -1;
  // Tierra firme a su alrededor (al menos 3 casillas sin agua): si no, la aldea queda medio en el agua
  const dryAround = (x, y) => { for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) { const xx = x + a, yy = y + b; if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false; const j = yy * W + xx; if (WATER[world.biome[j]] || world.biome[j] === B.LAVA) return false; } return true; };
  for (let r = 0; r <= 12 && fi < 0; r++) for (let dy = -r; dy <= r && fi < 0; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tx + dx, y = ty + dy; if (!tileFree(x, y) || farmMap.has(y * W + x) || !dryAround(x, y)) continue;
    fi = y * W + x; break;
  }
  if (fi < 0 || !townSpace(fi % W, (fi / W) | 0)) return null;
  const g = { faith:null, id:++vidSeq, name:villageName(), freshName:true, fx:fi % W, fy:(fi / W) | 0, food:14, meat:4, wood:10, stone:0, houses:[], wells:[], mill:null, know:{}, cut:0, planted:0, pen:null, learn:{}, born:yearT };
  world.objs[fi] = { key:'fire:camp', v:0, ox:0, oy:0, vid:g.id };
  makePlaza(g);
  const st = planSite(g, 'almacen');
  if (st) { const i = st[1] * W + st[0]; clearSite(g, st[0] - 4, st[1] - 5, st[0] + 4, st[1] + 1); world.objs[i] = { key:'store:almacen', v:0, ox:0, oy:0, vid:g.id }; g.stores = [i]; connect(g, st[0], st[1]); }
  composeRegion(g.fx - 7, g.fy - 11, g.fx + 7, g.fy + 12);
  villages.push(g);
  notify(`Se ha fundado la aldea ${g.name}`, { x:g.fx * T, y:g.fy * T });
  return g;
}
// ---- Búsquedas alrededor de un punto (en anillos, de cerca a lejos) ----
// Al bajar de una barca: a la casilla de tierra firme más cercana (nunca de cara al agua)
function landAt(v, x, y){
  v.x = x; v.y = y; v.offBoat = yearT;
  if (!inWater(x, y) && walkable(x, y)) return;
  const p = ringFind(Math.floor(x / T), Math.floor(y / T), 8, (tx, ty) => walkable(tx * T + 2, ty * T + 3) && !inWater(tx * T + 2, ty * T + 3));
  if (p) { v.x = p[0] * T + 2; v.y = p[1] * T + 3; }
}
function ringFind(tx, ty, R, test){
  if (test(tx, ty)) return [tx, ty];
  for (let r = 1; r <= R; r++) for (let k = 0; k < 8 * r; k++) {
    const side = Math.floor(k / (2 * r)), s2 = k % (2 * r) - r;
    const x = tx + [s2, r, -s2, -r][side], y = ty + [-r, s2, r, -s2][side];
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (test(x, y)) return [x, y];
  }
  return null;
}
const freshNear = (i, R) => { const x0 = i % W, y0 = (i / W) | 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const j = y * W + x; if (FRESH(world.biome[j]) && !dried(j) && !frozen(j)) return true; } return false; };
// Orilla de agua dulce (o charco) para beber, junto a la que se pueda estar de pie
// (buscar en 40 casillas a la redonda es caro y mucha gente tiene sed a la vez: se recuerda por zonas de 4×4 unos segundos)
const waterC = new Map(); let waterCW = null;
const waterOk = (x, y, v) => { const i = y * W + x; return tileFree(x, y) && !avoided(v, i) && (nb4i(i).some(n => FRESH(world.biome[n]) && !frozen(n) && !dried(n)) || (floodA && floodA[i] > .35 && !WATER[world.biome[i]])); };
function waterSpot(tx, ty, v){
  if (waterCW !== world) { waterC.clear(); waterCW = world; }
  const key = (ty >> 2) * W + (tx >> 2), c = waterC.get(key);
  let p = c && yearT - c.t < 4 && yearT >= c.t && (c.p === null || waterOk(c.p[0], c.p[1], v)) ? c.p : undefined;
  if (p === undefined) { p = ringFind(tx, ty, 40, (x, y) => waterOk(x, y, v)); if (waterC.size > 4000) waterC.clear(); waterC.set(key, { t:yearT, p }); }
  return p && [p[0] * T + 2, p[1] * T + 3];
}
// ---- Movimiento hacia un punto: prefiere tierra, nada si no queda otra, y abandona si se atasca ----
const V_OFFS = [0, .45, -.45, .9, -.9, 1.4, -1.4, 2, -2, 2.6, -2.6];
// Camino por casillas (A*) hasta el destino: rodea casas, árboles y agua (quien no sabe nadar no la cruza)
// y prefiere los caminos de tierra. Devuelve los puntos por los que pasar, o null si no hay forma de llegar
// Tablas reutilizables para la búsqueda (sin crear mapas en cada ruta: es lo que más se repite en todo el juego)
let rtG = null, rtP = null, rtS = null, rtC = null, rtStamp = 0, rtHF = [], rtHI = [];
function routeTo(v, goal){
  const sx = Math.floor(v.x / T), sy = Math.floor(v.y / T);
  let gx = goal % W, gy = (goal / W) | 0, partial = false;
  // Viajes largos: se busca el camino hasta un punto intermedio y, al llegar, se sigue (en vez de rendirse)
  const lim = v.task && v.task.k === 'asalto' ? 200 : 60, far = Math.max(Math.abs(sx - gx), Math.abs(sy - gy));
  if (far > lim) { const k = lim * .8 / far; gx = Math.round(sx + (gx - sx) * k); gy = Math.round(sy + (gy - sy) * k); goal = gy * W + gx; partial = true; }
  if (!rtG || rtG.length !== N) { rtG = new Float32Array(N); rtP = new Int32Array(N); rtS = new Uint32Array(N); rtC = new Uint32Array(N); rtStamp = 0; }
  const st = ++rtStamp, swim = v.swims !== false && !v.mount, burning = fires.size > 0, kid = v.born !== undefined && ageOf(v) < ADULT_H;
  // (no se cuela por la planta de los edificios, salvo para entrar en el de su destino)
  const cost = i => { const c = tileCost(i % W, (i / W) | 0); if (burning && fires.has(i)) return Infinity; if (footAt(i) && Math.max(Math.abs(i % W - gx), Math.abs(((i / W) | 0) - gy)) > 3 && Math.max(Math.abs(i % W - sx), Math.abs(((i / W) | 0) - sy)) > 1) return Infinity; if (c <= 1) return c; if (!swim) return Infinity; if (world.biome[i] === B.SHALLOW) return kid ? Infinity : c * 9; return c * 3; }; // (el mar: los niños nunca; los mayores, solo si no hay más remedio)
  const hf = rtHF, hi = rtHI; hf.length = 0; hi.length = 0;
  const push = (f, i) => { let k = hf.length; hf.push(f); hi.push(i); while (k) { const q = (k - 1) >> 1; if (hf[q] <= f) break; hf[k] = hf[q]; hi[k] = hi[q]; k = q; } hf[k] = f; hi[k] = i; };
  const pop = () => { const top = hi[0], lf = hf.pop(), li = hi.pop(), n = hf.length; if (n) { let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = -1, mf = lf; if (l < n && hf[l] < mf) { m = l; mf = hf[l]; } if (r < n && hf[r] < mf) { m = r; mf = hf[r]; } if (m < 0) break; hf[k] = hf[m]; hi[k] = hi[m]; k = m; } hf[k] = lf; hi[k] = li; } return top; };
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return dx > dy ? dx + dy * .41 : dy + dx * .41; };
  const s0 = sy * W + sx; rtS[s0] = st; rtG[s0] = 0; rtP[s0] = s0; push(h(sx, sy), s0);
  const goalBlocked = cost(goal) === Infinity, maxN = v.task && v.task.k === 'asalto' ? 30000 : 7000, nc = new Float32Array(9);
  let n = 0, end = -1, best = s0, bestH = h(sx, sy);
  while (hf.length && n++ < maxN) {
    const i = pop(); if (rtC[i] === st) continue; rtC[i] = st;
    const x = i % W, y = (i / W) | 0, gc = rtG[i], hh = h(x, y);
    if (hh < bestH) { bestH = hh; best = i; }
    if (i === goal || (goalBlocked && Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1)) { end = i; break; } // si el destino es un árbol o una casa, basta con llegar al lado
    for (let k = 0; k < 9; k++) { const dx = k % 3 - 1, dy = ((k / 3) | 0) - 1, nx = x + dx, ny = y + dy; nc[k] = (k === 4 || nx < 0 || ny < 0 || nx >= W || ny >= H) ? Infinity : cost(ny * W + nx); }
    for (let k = 0; k < 9; k++) {
      const c = nc[k]; if (c === Infinity) continue;
      const dx = k % 3 - 1, dy = ((k / 3) | 0) - 1;
      if (dx && dy && (nc[4 + dx] === Infinity || nc[4 + dy * 3] === Infinity)) continue; // sin cortar esquinas
      const j = (y + dy) * W + x + dx; if (rtC[j] === st) continue;
      const ng = gc + c * (dx && dy ? 1.41 : 1) * (pathMap.has(j) ? .5 : 1);
      if (rtS[j] !== st || ng < rtG[j]) { rtS[j] = st; rtG[j] = ng; rtP[j] = i; push(ng + h(x + dx, y + dy) * .75, j); }
    }
  }
  // Sin llegar: si se acabó el presupuesto de búsqueda (no es que no haya paso), hasta lo más cerca que se alcanzó
  if (end < 0) { if (!hf.length || bestH > h(sx, sy) - 6) return null; end = best; partial = true; }
  const out = []; for (let i = end; i !== s0; i = rtP[i]) out.push([(i % W) * T + 2, ((i / W) | 0) * T + 3]);
  out.reverse(); if (partial) out.partial = true;
  return out;
}
// Caminos guardados: quien sale de la misma zona (4×4 casillas) hacia el mismo destino reutiliza la ruta que alguien
// calculó hace poco (20 s de juego; los destinos imposibles, 6 s). Con fuego en el mapa no se guarda nada (cambia el paso)
const routeC = new Map(); let routeCW = null, routeHits = 0, routeMiss = 0;
{ const base = routeTo; routeTo = function(v, goal){
  if (fires.size) return base(v, goal);
  if (routeCW !== world) { routeC.clear(); routeCW = world; }
  const sx = Math.floor(v.x / T), sy = Math.floor(v.y / T), key = `${v.swims !== false && !v.mount ? 1 : 0}${v.task && v.task.k === 'asalto' ? 'a' : ''}${v.born !== undefined && ageOf(v) < ADULT_H ? 'k' : ''}|${(sy >> 2) * W + (sx >> 2)}|${goal}`;
  const c = routeC.get(key);
  if (c && yearT - c.t < (c.r ? 20 : 6) && yearT >= c.t) { routeHits++; if (!c.r) return null; const out = c.r.slice(); if (c.r.partial) out.partial = true; return out; }
  routeMiss++;
  const r = base(v, goal);
  if (routeC.size > 3000) routeC.delete(routeC.keys().next().value);
  routeC.set(key, { t:yearT, r:r ? r.slice() : null }); if (r && r.partial) routeC.get(key).r.partial = true;
  return r;
}; }
// Con pasos largos (a x4-x5, o quien está fuera de la vista y piensa un paso sí y otro no), el movimiento se hace en
// trocitos de 0,1 s: así nadie atraviesa una muralla o un río de un salto
{ const base = vGo; vGo = function(v, x, y, dt, run){ if (!(dt > .12)) return base(v, x, y, dt, run); const n = Math.min(4, Math.ceil(dt / .1)), d = dt / n; let r = false; for (let k = 0; k < n && !r; k++) r = base(v, x, y, d, run); return r; }; }
// Fuera de la pantalla (o con el mapa alejado, donde cada uno es un puntito), a x3 o más con mucha gente, no se camina
// esquivando paso a paso: se calcula la ruta (así se sabe si se puede llegar) y se avanza deslizándose por ella a su
// velocidad. Lo que pasa cuenta igual (trabajan, comen, cobran, desgastan el camino por donde pasan); solo se ahorra el
// detalle de cada pisada, que nadie está mirando. Al acercar la cámara vuelven a caminar normal.
const NO_ABS = new Set(['asalto', 'reprimir', 'protesta', 'apagar', 'guardia', 'jugar', 'atleta', 'nadar', 'correr', 'golpe', 'sacrificio', 'refugio', 'embarcar']);
let absRect = null, absRectT = -1;
const absOn = v => { if (!(gameSpeed >= 3) || window.ABS_OFF || villagers.length < 250 || v === follow || v.boat || v.mount || v.enemy || v.foe || (v.task && (NO_ABS.has(v.task.k) || v.task.a || v.task.target))) return false; /* (lo que persigue algo que se mueve, de verdad) */
  if (zoom < 1) return true;
  if (absRectT !== yearT) { absRectT = yearT; absRect = visibleRect(); } const [x0, y0, x1, y1] = absRect; return v.x < x0 - 120 || v.x > x1 + 120 || v.y < y0 - 120 || v.y > y1 + 120; };
{ const base = vGo; vGo = function(v, x, y, dt, run){
  if (!absOn(v)) { v.abs = null; return base(v, x, y, dt, run); }
  const d = Math.hypot(x - v.x, y - v.y); if (d < 3) { v.abs = null; v.route = null; return true; }
  const tk = Math.floor(y / T) * W + Math.floor(x / T); let A = v.abs;
  if (!A || Math.hypot((tk % W) - (A.k % W), ((tk / W) | 0) - ((A.k / W) | 0)) > 2) {
    if (inWater(v.x, v.y)) return base(v, x, y, dt, run); // (nadando, mejor de verdad)
    const r = d > T * 2.5 ? routeTo(v, tk) : null;
    if (!r && d > T * 3) { v.abs = null; v.routeKey = null; return base(v, x, y, dt, run); } // (no hay forma de llegar: que lo resuelva el de siempre)
    const end = walkable(x, y) || !r || !r.length ? [x, y] : r[r.length - 1], pts = [[v.x, v.y], ...(r || []), end], cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    A = v.abs = { k:tk, pts, cum, s:0, i:1 };
  }
  const sp = 10 * (1 + (v.fit || 0) * .3) * 1.3 * (run ? 1.35 : 1) * (ageOf(v) < ADULT_H ? .8 : 1), P = A.pts, C = A.cum, L = C[C.length - 1];
  A.s += sp * dt; v.moving = true; v.walk += dt;
  if (A.s < L) { while (A.i < C.length - 1 && C[A.i] < A.s) A.i++;
    const k = A.i, f = (A.s - C[k - 1]) / Math.max(.001, C[k] - C[k - 1]), nx = P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, ny = P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f;
    if (Math.abs(nx - v.x) > .2) v.dir = nx > v.x ? 1 : -1; v.x = nx; v.y = ny; return false; }
  // Llega: deja la huella en el camino recorrido
  if (wear) for (let k = 1; k < P.length - 1; k++) { const wi = Math.floor(P[k][1] / T) * W + Math.floor(P[k][0] / T); if (WATER[world.biome[wi]] || bridgeSet.has(wi) || (pathMap.has(wi) && !desireSet.has(wi)) || footAt(wi)) continue;
    wear[wi] = Math.min(60, wear[wi] + T / 13); if (wear[wi] > 4) wornSet.add(wi); if (wear[wi] > 30 && !world.objs[wi] && !farmMap.has(wi) && !pathMap.has(wi)) { pathMap.add(wi); desireSet.add(wi); } }
  [v.x, v.y] = P[P.length - 1]; v.abs = null; v.route = null; v.routeKey = null; return true;
}; }
function vGo(v, x, y, dt, run){
  const d = Math.hypot(x - v.x, y - v.y);
  if (d < 3 || (d < 9 && !walkable(x, y))) { v.route = null; return true; }
  // La ruta se calcula al cambiar de destino (si se mueve poco, como un animal que huye, se aprovecha la que hay)
  // o si se atasca; se sigue punto a punto y el último tramo va directo al destino
  const tk = Math.floor(y / T) * W + Math.floor(x / T);
  const far = v.routeKey == null || Math.hypot((tk % W) - (v.routeKey % W), ((tk / W) | 0) - ((v.routeKey / W) | 0)) > 2;
  if (far || v.reroute) {
    v.routeKey = tk; v.reroute = false; v.route = d > T * 2.5 ? routeTo(v, tk) : null; v.ri = 0;
    // No hay forma de llegar: se da por imposible (y se apunta para no volver a elegirlo enseguida)
    if (!v.route && d > T * 3 && !inWater(v.x, v.y) && !(v.task && v.task.k === 'asalto')) {
      (v.avoid ||= new Map()).set(tk, yearT); if (v.task && v.task.i != null) v.avoid.set(v.task.i, yearT);
      if (v.task && v.task.k === 'beber') { const nw = v.noWell ||= {}; nw[v.task.well ? v.task.well.i : 'w' + tk] = yearT; // (a ese pozo o agua no llega: que busque otra)
        // Aislado (en una lengua de tierra, tras desembarcar...) y sin saber nadar: la sed puede más y se tira al agua
        if (v.swims === false && v.water < .2 && Object.keys(nw).length >= 3) { v.swims = true; floats.push({ x:v.x, y:v.y - 12, txt:'se tira al agua', col:'#cfe8ff', life:0 }); } }
      releaseTask(v); v.task = null; v.wait = .3; v.routeKey = null; return false;
    }
    // ¿Esta ruta cruza agua a nado, o da un rodeo largo porque hay agua en medio? Se apunta por dónde se cruzaría
    // (los puentes se hacen en los cruces más frecuentes)
    const vg = d > T * 2.5 && villageById(v.vid);
    if (vg) {
      let cross = null;
      if (v.route) for (const [px, py] of v.route) if (inWater(px, py)) { cross = Math.floor(py / T) * W + Math.floor(px / T); break; }
      if (cross == null && (!v.route || v.route.length > d / T * 1.6 + 5))
        for (let k = 1; k < 40 && cross == null; k++) { const px = v.x + (x - v.x) * k / 40, py = v.y + (y - v.y) * k / 40; if (inWater(px, py)) cross = Math.floor(py / T) * W + Math.floor(px / T); }
      if (cross != null && !WATER[world.biome[cross]] === false) { vg.waterTrips = (vg.waterTrips || 0) + 1; (vg.crossings ||= new Map()).set(cross, (vg.crossings.get(cross) || 0) + 1); }
    }
  }
  let gx = x, gy = y;
  if (v.route) {
    const dw = k => Math.hypot(v.route[k][0] - v.x, v.route[k][1] - v.y);
    // Punto alcanzado (o el siguiente ya está más cerca): al siguiente
    while (v.ri < v.route.length && (dw(v.ri) < 3 || (v.ri + 1 < v.route.length && dw(v.ri + 1) < dw(v.ri)))) { v.ri++; v.wpT = 0; v.wpBest = Infinity; v.wpFail = 0; }
    if (v.ri < v.route.length) {
      [gx, gy] = v.route[v.ri];
      // Si no se acerca a este punto (enganchado en una esquina), se recoloca en el centro de su casilla
      const dn = dw(v.ri);
      if (dn < (v.wpBest ?? Infinity) - .5) { v.wpBest = dn; v.wpT = 0; } else v.wpT = (v.wpT || 0) + dt;
      if (v.wpT > .7) { const cx = Math.floor(v.x / T) * T + 2, cy = Math.floor(v.y / T) * T + 3; v.x += (cx - v.x) * Math.min(1, dt * 10); v.y += (cy - v.y) * Math.min(1, dt * 10); if (v.wpT > 1.2) { gx = cx; gy = cy; } if (v.wpT > 1.6) { v.wpT = 0; v.wpBest = Infinity; v.wpFail = (v.wpFail || 0) + 1; if (v.wpFail === 2) v.reroute = true; if (v.wpFail >= 4) { v.wpFail = 0; (v.avoid ||= new Map()).set(tk, yearT); if (v.task && v.task.i != null) v.avoid.set(v.task.i, yearT); releaseTask(v); v.task = null; v.wait = .5; v.route = null; v.routeKey = null; return false; } } }
    } else { if (v.route.partial) { v.reroute = true; gx = v.x; gy = v.y; } v.route = null; } // tramo de un viaje largo: se calcula el siguiente
  }
  const dx = gx - v.x, dy = gy - v.y, dg = Math.max(.01, Math.hypot(dx, dy));
  const swim = inWater(v.x, v.y), child = (yearT - v.born) / YEAR < ADULT_H;
  const onPath = pathMap.has(Math.floor(v.y / T) * W + Math.floor(v.x / T)) || bridgeSet.has(Math.floor(v.y / T) * W + Math.floor(v.x / T));
  const sp = Math.min(dg, (swim ? 4 * (1 + (v.swimFit || 0)) : 10 * (1 + (v.fit || 0) * .3)) * // (la piscina y la pista mejoran la velocidad: deportes.js)
     (onPath ? (typeof isAsphalt === 'function' && isAsphalt(Math.floor(v.y / T) * W + Math.floor(v.x / T)) ? 2.2 : isRoad(Math.floor(v.y / T) * W + Math.floor(v.x / T)) ? 1.75 : 1.3) : 1) * (run ? 1.35 : 1) * (child ? .8 : 1) * (v.mount ? (v.cart ? 1.6 : 2) : 1) * dt), base = Math.atan2(dy, dx);
  let moved = false; const wpWet = !!v.route && v.swims !== false && !v.mount && (inWater(gx, gy) || inWater((v.x + gx) / 2, (v.y + gy) / 2) || (v.ri > 0 && v.ri <= v.route.length && inWater(...v.route[v.ri - 1]))); // (el siguiente punto de la ruta está en el agua: hay que nadar)
  // Rodea los obstáculos siempre por el mismo lado durante un rato (si no, da bandazos a izquierda y derecha),
  // y no se gira a cada paso
  const pref = v.sideT > 0 ? v.side : 0;
  if (v.sideT > 0) v.sideT -= dt;
  if (v.dirT > 0) v.dirT -= dt;
  for (let pass = 0; pass < 3 && !moved; pass++) for (const o of V_OFFS) {
    if (pass === 0 && pref && o * pref < 0) continue;
    const a = base + o, nx = v.x + Math.cos(a) * sp, ny = v.y + Math.sin(a) * sp;
    if (!walkable(nx, ny) || (((pass < 2 && !wpWet) || v.swims === false || v.mount) && !swim && inWater(nx, ny))) continue; // quien no sabe nadar no se mete (y quien sabe, solo si la ruta pasa por el agua)
    if (pass < 2 && footAt(tileOfXY(nx, ny)) && !footAt(tileOfXY(v.x, v.y)) && Math.hypot(nx - x, ny - y) > T * 3) continue; // ni se mete por la planta de un edificio (salvo el de su destino)
    { const cx = Math.floor(v.x / T), cy = Math.floor(v.y / T), qx = Math.floor(nx / T), qy = Math.floor(ny / T); if (qx !== cx && qy !== cy && tileCost(qx, cy) === Infinity && tileCost(cx, qy) === Infinity) continue; } // sin colarse en diagonal entre dos tramos de muralla (o dos muros) que se tocan por la esquina
    v.x = nx; v.y = ny; moved = true;
    if (o) { v.side = Math.sign(o); v.sideT = 1.2; }
    const nd = Math.cos(a) < 0 ? -1 : 1;
    if (Math.abs(Math.cos(a)) > .35 && nd !== v.dir && !(v.dirT > 0)) { v.dir = nd; v.dirT = .35; }
    break;
  }
  if (moved) {
    v.moving = true; v.walk += dt;
    const wi = Math.floor(v.y / T) * W + Math.floor(v.x / T);
    if (wear && !WATER[world.biome[wi]] && !bridgeSet.has(wi) && (!pathMap.has(wi) || desireSet.has(wi)) && !(v.vid && villageById(v.vid) && underBuilding(villageById(v.vid), wi % W, (wi / W) | 0))) {
      wear[wi] = Math.min(60, wear[wi] + dt * (v.mount ? 2 : 1)); if (wear[wi] > 4) wornSet.add(wi);
      if (wear[wi] > 30 && !world.objs[wi] && !farmMap.has(wi) && !pathMap.has(wi)) { pathMap.add(wi); desireSet.add(wi); }
    }
  }
  // Avance: lo que queda de ruta (si da un rodeo, la distancia en línea recta puede crecer sin estar atascado)
  const left = v.route ? dg + (v.route.length - v.ri) * T : d;
  if (left < (v.lastD ?? Infinity) - 1) { v.stuckT = 0; v.lastD = left; } else v.stuckT = (v.stuckT || 0) + dt; // avanzar de verdad (no temblar)
  if (v.stuckT > 1.5 && !v.rerouted) { v.reroute = true; v.rerouted = true; v.lastD = Infinity; }
  if (v.stuckT < .1) v.rerouted = false;
  if (v.stuckT > 5) { (v.avoid ||= new Map()).set(tk, yearT); if (v.task && v.task.i != null) v.avoid.set(v.task.i, yearT); v.route = null; releaseTask(v); v.task = null; v.wait = 1; v.stuckT = 0; v.lastD = Infinity; }
  return false;
}
// ---- Elegir trabajo según lo que le falta a la aldea ----
const HERBIVORES = ['vaca', 'oveja', 'pollo', 'cerdo', 'caballo'];
// Sitios a los que no hay forma de llegar (al otro lado del agua sin saber nadar…): durante un rato no se vuelve a intentar
const avoided = (v, i) => !!(v && v.avoid && v.avoid.has(i) && yearT - v.avoid.get(i) < 40);
function objNear(g, R, test, v){
  const p = ringFind(g.fx, g.fy, R, (x, y) => { const o = world.objs[y * W + x]; return o && test(o, y * W + x) && !avoided(v, y * W + x); });
  return p && p[1] * W + p[0];
}
function standBy(i){ // casilla libre al lado de un objeto (para trabajar en él)
  const x = i % W, y = (i / W) | 0;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) if (tileFree(x + dx, y + dy)) return [(x + dx) * T + 2, (y + dy) * T + 3];
  return null;
}
// El solar de una maravilla: además de árboles y matorrales, se pueden quitar las rocas sueltas y los minerales comunes
// (la piedra va al pueblo); nunca los valiosos ni los objetos legendarios
const wonderOkObj = o => { const c = OBJ[o.key]; return c && (['tree', 'berry'].includes(c[1]) || (c[1] === 'stone' && c[2] === 0) || (c[1] === 'mineral' && c[2] <= 1)); };
function wonderClearable(x0, y0, x1, y1){
  if (x0 < 0 || y0 < 0 || x1 >= W || y1 >= H) return false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x, b = world.biome[i], o = world.objs[i];
    if (WATER[b] || b === B.LAVA || bridgeSet.has(i) || isFlooded(i) || (o && !wonderOkObj(o))) return false; }
  return true;
}
function wonderClear(g, x0, y0, x1, y1){
  let st = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x, o = world.objs[i]; if (!o || !wonderOkObj(o) || ['tree', 'berry'].includes(OBJ[o.key][1])) continue; world.objs[i] = null; st++; }
  if (st) { g.stone = (g.stone || 0) + st; composeRegion(x0 - 7, y0 - 11, x1 + 7, y1 + 12); rareDirty = true; }
  clearSite(g, x0, y0, x1, y1);
}
function siteNear(g, rMin, rMax, test, tries = 60){
  for (let k = 0; k < tries; k++) {
    const a = Math.random() * Math.PI * 2, d = rMin + Math.random() * (rMax - rMin);
    const x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .8);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (test(x, y, y * W + x)) return [x, y];
  }
  return null;
}
// Cercados de animales: un pueblo puede tener varios (g.pen es siempre el primero, por las partidas guardadas de antes)
const pensOf = g => { if (!g.pens) g.pens = g.pen ? [g.pen] : []; const p0 = g.pens[0] || null; if (g.pen !== p0) g.pen = p0; return g.pens; };
const PEN_CAP = 12; // animales por cercado
const penLimit = g => Math.min(4, 1 + Math.floor(popOf(g) / 15)); // uno más por cada 15 habitantes
const penOfAnimal = (g, a) => { const ps = pensOf(g); return ps[a.penK] || ps[0] || null; };
const emptiestPen = g => { const ps = pensOf(g), n = ps.map(() => 0); for (const a of penAnimals(g)) n[ps[a.penK] ? a.penK : 0]++; let k = 0; for (let j = 1; j < ps.length; j++) if (n[j] < n[k]) k = j; return k; };
const inPen = (g, x, y, m = 0) => pensOf(g).some(p => x >= p.x0 - m && x <= p.x1 + m && y >= p.y0 - m && y <= p.y1 + m);
// Ningún objeto (árbol, roca, casa) en el rectángulo
function areaClear(x0, y0, x1, y1){
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) if (world.objs[y * W + x]) return false;
  return true;
}
// Terreno ocupado por la aldea: los árboles no brotan en campos, cercados ni pegados a las casas
function builtNear(x, y){
  if (farmMap.has(y * W + x) || pathMap.has(y * W + x)) return true;
  for (const g of villages) {
    if (inPen(g, x, y, 1)) return true;
    for (const h of buildingsOf(g)) { const hx = h % W, hy = (h / W) | 0; if (Math.abs(x - hx) <= 5 && y - hy >= -7 && y - hy <= 1) return true; }
  }
  return false;
}
const streetZone = (g, x, y) => (Math.abs(y - (g.fy + 2)) <= 1 && Math.abs(x - g.fx) <= 50) || (Math.abs(x - g.fx) <= 1 && Math.abs(y - g.fy) <= 50) || plazaSet.has(y * W + x) || hallZone(g, x, y);
// Se puede sembrar: tierra libre (o con árboles y matas, que se talan al marcar el campo), junto a agua dulce
// o, en tierra húmeda (pradera, llanura, bosque), de secano con la lluvia
const fieldObjOk = i => { const o = world.objs[i]; return !o || ['tree', 'berry'].includes(OBJ[o.key][1]); };
const farmable = (g, x, y, i) => (tileFree(x, y) || (fieldObjOk(i) && !WATER[world.biome[i]] && !bridgeSet.has(i) && !wallSet.has(i))) && !farmMap.has(i) && !pathMap.has(i) && !plotIn(x, y, x, y) && !streetZone(g, x, y) && !underBuilding(g, x, y) && !inPen(g, x, y) && Math.hypot(x - g.fx, y - g.fy) > 2.5
  && [B.GRASS, B.PLAINS, B.FOREST, B.DRY, B.DIRT, B.HILLS].includes(world.biome[i]) && (freshNear(i, (g.know || {}).acequias ? 12 : 8) || [B.GRASS, B.PLAINS, B.FOREST].includes(world.biome[i]));
// Cuántos de la aldea están ya con ese trabajo (para no ir todos a lo mismo)
// La gente de cada pueblo, agrupada una vez por paso (las tareas se leen en vivo, así que la cuenta es exacta)
let byVidT = -1, byVidA = null, byVidN = -1, byVid = new Map();
const villagersOf = id => { if (byVidT !== yearT || byVidA !== villagers || byVidN !== villagers.length) { byVidT = yearT; byVidA = villagers; byVidN = villagers.length; byVid = new Map(); for (const o of villagers) { let L = byVid.get(o.vid); if (!L) byVid.set(o.vid, L = []); L.push(o); } } return byVid.get(id) || []; };
const busyWith = (g, job) => { let n = 0; for (const o of villagersOf(g.id)) if (!o.dead && o.vid === g.id && o.task && (o.task.k === job || o.task.job === job)) n++; return n; };
// Cada uno a lo suyo: lo que es de otro oficio solo se hace muy de vez en cuando si en el pueblo ya hay quien lo tiene
// (un pescador no se pone a cosechar habiendo agricultores); si no hay nadie de ese oficio, o hay hambre de verdad y
// es un trabajo de comida, cualquiera echa una mano
let JOB_OF = null;
const FOOD_JOBS = new Set(['sembrar', 'arar', 'cosechar', 'campo', 'pescar', 'barca', 'cazar', 'bayas']);
function oficioCount(g){ const c = g.ofC; if (c && c.t === yearT) return c.m; const m = {}; for (const u of villagers) if (!u.dead && u.vid === g.id && u.oficio) m[u.oficio] = (m[u.oficio] || 0) + 1; g.ofC = { t:yearT, m }; return m; }
function otherJob(v, k, ofc, hunger){
  if (!JOB_OF) { JOB_OF = {}; for (const [o, L] of Object.entries(OFICIOS)) for (const j of L) (JOB_OF[j] ||= []).push(o); }
  const owners = JOB_OF[k]; if (!owners) return 1; // (trabajo de todos: no es de ningún oficio)
  if (hunger && FOOD_JOBS.has(k)) return 1;
  if (!owners.some(o => (ofc[o] || 0) > 0)) return 1;
  return owners.includes('constructor') || owners.includes('pastor') ? .5 : .05; // (las obras y los cercados, un poco cosa de todos)
}
function chooseJob(v, g){
  if (retired(v, g)) return Math.random() < .6 ? 'ocio' : 'pasear'; // jubilados (cultura.js)
  if (v.chill > (ageOf(v) < ADULT_H ? .15 : .3) && !warmthAt(v, g)) return 'refugio'; // tiene frío: a calentarse (los niños, antes)
  if (wantsShelter(v, g) && !(v.oficio === 'obrero' && inShift(g))) return 'refugio'; // (los obreros trabajan bajo techo: van aunque llueva)
  if (v.oficio === 'obrero' && crewShift(v, g)) return 'fabricar'; // los obreros, en su turno, a su fábrica (fabricas.js)
  if (guildStrike(v, g) && inShift(g)) return Math.random() < .5 ? 'ocio' : 'pasear'; // huelga del gremio (civilizacion.js) // llueve: a cubierto (lluvia.js)
  const pop = popOf(g), houses = housesOf(g).length, farms = [...farmMap.values()].filter(f => f.vid === g.id);
  const si = seasonInfo().i, J = [];
  const mine = OFICIOS[v.oficio] || [];
  const hunger = g.food < pop * .6, ofc = oficioCount(g);
  const add = (k, w) => { if (w > 0 && !((g.jobFail || {})[k] > yearT) && worksOk(g, k) && !onStrike(v, g, k)) J.push([k, w * (mine.includes(k) ? 3 : otherJob(v, k, ofc, hunger)) * (g.pFocus ? focusMul(g, k) : 1)]); }; // (y la prioridad que marca el jugador: gobierno.js) // lo de su oficio, mucho más a menudo
  // Construir: uno por cada 6 de madera disponibles; el cercado lo hace una sola persona
  // Mientras falten casas, la madera es para ellas: lo demás solo se hace con la que sobre
  // Cuando las casas ya tienen dueño, cuántas se hacen depende de la política de vivienda del gobierno
  const needHouse = housingOn(g) ? houseNeed(g, pop) : houseCap(g) < pop + 4, spare = g.wood - (needHouse ? 4 + busyWith(g, 'construir') * 4 : 0);
  const L = lawsOf(g);
  const soldiersJ = villagers.filter(u => u.vid === g.id && !u.dead && u.weapon).length, atWarJ = [...rels.values()].some(r => r.war && (r.war.att === nationOf(g).id || r.war.def === nationOf(g).id || r.war.att === g.id || r.war.def === g.id));
  const huts = housesOf(g).filter(i => world.objs[i].key === 'house:hut');
  add('ampliar', needHouse && huts.length && g.stone >= 7 && g.wood >= 1 && busyWith(g, 'ampliar') < 2 ? (g.noSite ? 12 : 3) : 0);
  // Sin sitio para más casas y ya en la era industrial: las casas de piedra del centro se cambian por bloques de pisos
  const pisoOk = bloqueMax(g) > 0 && needHouse && g.stone >= 16 && g.wood >= 4 && ((g.iron || 0) >= 1 || !industrial(g)) && busyWith(g, 'pisos') < 2;
  add('pisos', pisoOk && pisoCands(g).length ? (g.noSite > yearT ? 15 : houseCap(g) < pop + 2 ? 6 : 0) : 0);
  const canHouses = Math.floor(g.wood / 4) + (g.wood >= 1 ? Math.floor(g.stone / 10) : 0); // de madera, o de piedra con un poco de madera
  add('construir', needHouse && !(g.noSite > yearT) && canHouses > busyWith(g, 'construir') ? (9 + Math.min(12, (canHouses - busyWith(g, 'construir')) * 2)) * (housingOn(g) && hasLaw(g, 'vivienda_publica') ? 1.6 : 1) : 0); // con material de sobra, más gente a construir (y con vivienda pública, aún más)
  // El campo: se marca una parcela, se ara casilla a casilla, se siembra, crece y se cosecha
  // Cuanto más campo espera, más gente va a él
  let nRipe = 0, nPlowed = 0, nRaw = 0; for (const f of farms) if (!f.claim) { if (f.st === 'madura') nRipe++; else if (f.st === 'arada') nPlowed++; else if (f.st === 'pradera' || f.st === 'muerta') nRaw++; }
  add('cosechar', nRipe ? 9 + Math.min(12, nRipe) : 0); // la cosecha no espera
  add('sembrar', nPlowed ? 5 + Math.min(7, nPlowed / 3) : 0);
  add('arar', nRaw ? 4 + Math.min(6, nRaw / 4) : 0);
  add('campo', farms.length < Math.min(320, 14 + pop * 4) && nRaw < 10 && busyWith(g, 'campo') < (pop >= 20 ? 2 : 1) ? (g.food < pop * 3 ? 7 : 4.5) : 0); // más campos cuanto más gente; no esperan a arar todo
  const berriesNear = g.berriesNear ?? 99;
  add('cementerio', !g.cemetery && houses >= 2 && (pop >= 10 || Object.values(g.deaths || {}).reduce((a, b) => a + b, 0) >= 2) && !busyWith(g, 'cementerio') ? 3 : 0);
  add('arboleda', !g.grove && houses >= 2 && pop >= 6 && !busyWith(g, 'arboleda') ? ((g.treesNear ?? 99) < 20 ? 4 : 1.5) : 0);
  add('bayal', !g.berryPlot && houses >= 1 && pop >= 5 && !busyWith(g, 'bayal') ? (berriesNear < pop ? 4 : 1.2) : 0);
  add('minar', ((g.know || {}).mineria || g.quarry != null || g.stone >= 20) && (g.oresNear || 0) > 0 && busyWith(g, 'minar') < 2 ? (hasForge(g) ? 3 : 1.8) : 0);
  add('hospital', !hasHosp(g) && g.hall != null && pop >= 20 && g.stone >= 15 && g.wood >= 12 && !busyWith(g, 'hospital') ? (L.includes('sanidad') ? 7 : 2.5) : 0);
  add('cuartel', !hasBarracks(g) && g.hall != null && pop >= 12 && g.stone >= 12 && g.wood >= 10 && (atWarJ || soldiersJ >= 3 || L.includes('ejercito')) && !busyWith(g, 'cuartel') ? (atWarJ ? 8 : 3) : 0);
  add('instruir', v.weapon && hasBarracks(g) && (v.vet || 0) < 3 && busyWith(g, 'instruir') < 4 ? (atWarJ ? 4 : 1.5) : 0);
  add('asedio', hasBarracks(g) && hasForge(g) && (g.siege || 0) < 2 && g.wood >= 12 && (g.iron || 0) >= 2 && (atWarJ || L.includes('ejercito')) && !busyWith(g, 'asedio') ? (atWarJ ? 5 : 1.5) : 0);
  add('lonja', g.port && g.market != null && !hasLonja(g) && g.wood >= 12 && g.stone >= 6 && !busyWith(g, 'lonja') ? 4 : 0);
  add('bolsa', wantsBolsa(v, g) ? 2 : 0); // ir al banco a invertir en bolsa (bolsa.js)
  add('vender', g.market != null && world.objs[g.market] && busyWith(g, 'vender') < 3 ? (v.oficio === 'mercader' ? 3 : .3) : 0);
  add('taberna', !hasTavern(g) && houses >= 4 && pop >= 16 && wellsOf(g).length && g.wood >= 12 && g.stone >= 4 && !busyWith(g, 'taberna') ? 3.5 : 0);
  // El gran templo: con templo ya hecho, mucha fe y mucha piedra (más si es teocracia)
  add('escuela', !hasSchool(g) && (g.know || {}).escritura && g.hall != null && pop >= 16 && (g.wood >= 12 && g.stone >= 6 || g.wood >= 22) && !busyWith(g, 'escuela') ? (hasLaw(g, 'educacion') ? 9 : pop >= 20 ? 8 : 4.5) : 0); // un pueblo grande sin escuela se queda atrás (sin escuela no hay universidad) // (sin piedra, toda de madera: más cara) // con la ley de educación, con más prisa
  add('enseñar', hasSchool(g) && v.oficio === 'maestro' && !isFreeDay(g) && villagers.some(u => !u.dead && u.vid === g.id && u.task && u.task.k === 'clase') ? 6 : 0);
  add('catedral', g.faith && g.temple != null && world.objs[g.temple] && !hasCathedral(g) && pop >= 20 && g.stone >= 30 && g.wood >= 15 && (g.devotion || 0) >= 3 && !busyWith(g, 'catedral') ? (2 + Math.min(4, (g.devotion || 0) * .2)) * (regimeOf(g) === 'teocracia' ? 2 : 1) : 0);
  add('explorar', hasPaper(g) && pop >= 8 && !(g.noExplore > yearT) && travelers.filter(t => t.kind === 'expedicion' && t.from === g.id).length < Math.max(1, villagers.filter(u => !u.dead && u.vid === g.id && u.oficio === 'cartógrafo').length) && !busyWith(g, 'explorar') ? (v.oficio === 'cartógrafo' ? 8 : .5) * ((g.expeditions || 0) < 3 ? 2 : 1) : 0);
  add('tazas', g.market != null && world.objs[g.market] && (g.cups || 0) < 6 + pop && g.wood >= 4 && !busyWith(g, 'tazas') ? ((g.cups || 0) < 3 ? 3 : 1.2) : 0);
  add('teatro', !hasTheater(g) && g.hall != null && pop >= 22 && g.stone >= 8 && g.wood >= 15 && !busyWith(g, 'teatro') ? 3 : 0);
  add('coliseo', !hasColiseum(g) && g.hall != null && pop >= 24 && g.stone >= 18 && g.wood >= 10 && !busyWith(g, 'coliseo') ? (['monarquia', 'dictadura', 'fascismo'].includes(regimeOf(g)) ? 3 : 1.5) : 0);
  const sickN = villagers.filter(u => !u.dead && u.vid === g.id && u.sick).length;
  add('curar', sickN && busyWith(g, 'curar') < 2 ? (v.oficio === 'curandero' ? 8 : 1.5) : 0);
  add('herreria', !hasForge(g) && (g.iron || 0) >= 5 && g.wood >= 10 && g.stone >= 10 && g.hall != null && !busyWith(g, 'herreria') ? 5 : 0);
  const noTala = ((g.taboo || {}).talar || 0) > yearT;
  const wantHall = g.hall == null && pop >= 8 && houses >= 2;
  // (la reserva crece con el pueblo: una ciudad grande gasta 12-30 de madera en cada edificio público; con 12 no llegaba nunca)
  const woodGoal = 12 + Math.max(0, pop / 4 + 1 - houses) * 6 + pop * .3;
  add('talar', noTala ? (g.wood < 8 ? 2.5 : .2) : g.wood < 6 ? 7 : wantHall && g.wood < 10 ? 5 : needHouse && g.wood < 4 + busyWith(g, 'construir') * 4 + 4 ? 6 : g.wood < woodGoal * .5 ? 4.5 : g.wood < woodGoal ? 3 : .4);
  const hungry = g.food < pop * 4, share = g.food > 0 ? (g.meat || 0) / g.food : 0, want = g.diet ?? .5;
  const needMeat = share < want - .1, needVeg = share > want + .1;
  add('talar', g.pontWant > yearT - DAY_LEN && g.wood < 40 ? 4 : 0); // madera para el puente de troncos de la guerra (pontones.js)
  add('bayas', (hungry ? 3 : .5) * (needVeg ? 2 : needMeat ? .5 : 1));
  add('pescar', (hungry ? 2.5 : .3) * (needMeat ? 2 : needVeg ? .5 : 1)); add('cazar', (hungry ? 2 : .2) * (needMeat ? 2 : needVeg ? .5 : 1));
  if (g.port && openWater(g.port.launch)) add('barca', g.boatOut || busyWith(g, 'barca') ? 0 : (hungry || needMeat ? 3.5 : 1));
  const nPens = pensOf(g).length, nPenA = penAnimals(g).length; // otro cercado cuando los que hay están casi llenos
  add('cercar', pop >= 4 && (!nPens || (nPenA >= nPens * (PEN_CAP - 2) && nPens < penLimit(g))) && spare >= 8 && !busyWith(g, 'cercar') && houses >= 1 ? 4 : 0);
  add('capturar', nPens && nPenA + busyWith(g, 'capturar') < nPens * PEN_CAP && busyWith(g, 'capturar') < 3 ? (nPenA < 4 ? 5 : nPenA < 6 ? 2 : .4) : 0); // (con el cercado ya poblado, crían ellos: apenas se captura más)
  // Armas: solo saben hacer lanzas y arcos, y se ponen a ello cuando ven fieras cerca
  add('equipar', gearNeed(g) && busyWith(g, 'equipar') < 3 ? (atWarJ ? 2.5 : 1.5) * ((g.danger || 0) > 0 || L.includes('ejercito') || [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id)) ? 5 : 1.5) : 0);
  const wantArmy = pop * (atWarJ ? .45 : g.danger > 0 || L.includes('ejercito') ? .3 : .15) * (g.food < pop * 3 ? .5 : 1); // una pequeña guardia siempre; en guerra, a filas
  add('arma', soldiersJ < wantArmy && g.wood >= (needHouse ? 6 : 3) && busyWith(g, 'arma') < (atWarJ ? 3 : 2) ? (atWarJ ? 8 : g.danger > 0 ? 5 : 2.5) : 0); // sin dejar al pueblo sin madera para casas
  const know = g.know ||= {};
  const wellsLow = wellsOf(g).length > 0 && wellsOf(g).every(w => w.q < .25); // (todos casi secos: hace falta otro, aunque «sobren» por número)
  add('pozo', know.pozo && houses >= 1 && (g.stone >= 5 || g.wood >= 8) && wellsOf(g).length < 1 + Math.floor(pop / 14) + (sedNow(g) || wellsLow ? 1 + Math.floor(pop / 20) : 0) && !busyWith(g, 'pozo') ? (sedNow(g) || wellsLow ? 14 : 4) : 0); // (con sed de verdad, no por el aviso de siempre)
  add('molino', know.molino && houses >= 3 && (g.mill == null || !world.objs[g.mill]) && spare >= 10 && g.stone >= 3 && farms.length >= 8 && !busyWith(g, 'molino') ? 4 : 0);
  const quarry = g.quarry != null && world.objs[g.quarry] && world.objs[g.quarry].key === 'quarry:cantera';
  const wantStone = g.stone < Math.max(g.temple != null && world.objs[g.temple] && !hasCathedral(g) ? 40 : 20, 20 + pop * .35); // con templo, ahorran para el grande; y más cuanto mayor es el pueblo (universidad 25, catedral 30…)
  add('cantera', know.cantera && houses >= 2 && !quarry && spare >= 6 && !busyWith(g, 'cantera') ? 4 : 0);
  add('cantear', quarry && busyWith(g, 'cantear') < 4 + Math.floor(pop / 30) ? (wantStone || g.stone < 30 ? 3.5 : .5) : 0);
  add('puente', know.puente && houses >= 2 && spare >= 8 && bridges.filter(b => b.vid === g.id && !b.pier).length < 1 + Math.floor(pop / 6) && !busyWith(g, 'puente') ? (g.crossings && [...g.crossings.values()].some(n => n >= 4) ? 7 : 3.5) : 0);
  add('muelle', know.barca && houses >= 3 && !g.port && spare >= 8 && !busyWith(g, 'muelle') ? 3.5 : 0);
  balloonJobs(v, g, add); // tela, manga de viento, globo, cesta y vuelos (globos.js)
  institutionJobs(v, g, add); // tribunal, cárcel, imprenta, sindicato, parlamento y academia (instituciones.js)
  mineJobs(v, g, add); // abrir la mina y trabajar en ella (minas.js)
  factoryJobs(v, g, add); // fábricas, pozos industriales y extractora (fabricas.js)
  fortJobs(v, g, add); // castillo: obra, foso y provisiones (castillos.js)
  umbrellaJobs(v, g, add); // coser paraguas (lluvia.js)
  volcanoJobs(v, g, add); // cercar el volcán (volcanes.js)
  sportsJobs(v, g, add); // campo de fútbol, piscina y pista (deportes.js)
  shearJobs(v, g, add); // esquilar las ovejas (ambiente.js)
  roadJobs(v, g, add); // empedrar caminos (industria.js)
  ruinJobs(v, g, add); // explorar ruinas antiguas (civilizacion.js)
  seasonJobs(v, g, add); shackJobs(v, g, add); // conservas, leña, árboles (estaciones.js) y chabolas (riqueza.js)
  scienceJobs(v, g, add); // investigar en la universidad (ciencia.js)
  add('carro', know.montar && houses >= 3 && (g.carts || 0) < 1 + Math.floor(pop / 10) && spare >= 10 && !busyWith(g, 'carro') ? 2.5 : 0);
  add('ayuntamiento', g.hall == null && pop >= 8 && houses >= 2 && ((g.wood >= 10 && g.stone >= 6) || g.wood >= 18) && !busyWith(g, 'ayuntamiento') ? 12 : 0);
  add('almacen', Math.max(g.food, g.wood, g.stone) > capOf(g) * .8 && g.wood >= 8 && !busyWith(g, 'almacen') ? 8 : 0);
  add('torre', g.hall != null && (g.sawBeast || pop >= 16) && towersOf(g).length < 1 + Math.floor(pop / 10) && spare >= 12 && g.stone >= 4 && !busyWith(g, 'torre') ? 3 : 0);
  if (g.hall != null && g.wallPlan && wallLeft(g) === 0 && (g.wallRing || 1) < 2 && (pop >= 25 || atWarJ)) { g.wallRing = 2; g.wallPlan1 = g.wallPlan; g.wallPlan = null; notify(`En ${g.name} empiezan una segunda muralla, más amplia`, { x:g.fx * T, y:g.fy * T }); }
  add('muralla', wallJob(g, pop, needHouse, atWarJ)); // antes, con más gente y, tras un ataque, con prisa (defensa.js)
  add('orar', g.faith ? ((g.wrath || 0) > .3 ? 2 + g.wrath : dayT() < .12 ? .6 : .05) : 0);
  add('altar', g.faith && g.holy && pop >= 5 && (g.altar == null || !world.objs[g.altar]) && g.stone >= 4 && !busyWith(g, 'altar') ? 3 : 0);
  add('templo', g.faith && houses >= 4 && (g.hall != null || pop >= 14) && (g.temple == null || !world.objs[g.temple]) && g.stone >= 15 && spare >= 10 && !busyWith(g, 'templo') ? 3 + (g.devotion || 0) * .3 : 0);
  add('monumento', g.temple != null && world.objs[g.temple] && pop >= 18 && g.stone >= 25 && (g.monument == null || !world.objs[g.monument]) && !busyWith(g, 'monumento') ? 2 + (g.devotion || 0) * .2 : 0);
  add('banco', g.coin && g.hall != null && pop >= 20 && !hasBank(g) && g.stone >= 12 && g.wood >= 8 && !busyWith(g, 'banco') ? 3 : 0);
  add('maravilla', nationOf(g) === g && regimeOf(g) !== 'tribu' && g.hall != null && pop >= 24 && (g.wonder == null || !world.objs[g.wonder]) && g.stone >= 30 && g.wood >= 15 && yearT - (g.regimeT || 0) > DAY_LEN * .3 && !busyWith(g, 'maravilla') ? 6 : 0); // (la obra del régimen: que no quede siempre detrás de todo)
  add('mercado', houses >= 4 && pop >= 14 && (g.market == null || !world.objs[g.market]) && spare >= 12 && !busyWith(g, 'mercado') ? (pop >= 20 ? 5 : 3) : 0);
  add('encender', g.fireOut && !raining(g.fy * W + g.fx) && !(floodA && floodA[g.fy * W + g.fx] > .3) && !busyWith(g, 'encender') ? 12 : 0);
  add('comerciar', g.market != null && world.objs[g.market] ? (L.includes('comercio') ? 2.5 : 1.2) : 0);
  const dark = isNight() || dayT() > .42, unlit = torchesOf(g).some(tc => !tc.lit && !raining(tc.i));
  add('antorcha', know.antorchas && torchesOf(g).length < 4 + Math.floor(pop / 3) && g.wood >= 1 && !busyWith(g, 'antorcha') ? 1.5 : 0);
  add('alumbrar', dark && unlit && !busyWith(g, 'alumbrar') ? 8 : 0);
  const broken = buildingsOf(g).filter(b => world.objs[b] && (world.objs[b].burnt || world.objs[b].dmg > .3));
  // Lo roto se repara y lo quemado se reconstruye en su sitio, con prioridad: un pueblo no vive entre ruinas
  const nBroken = broken.filter(b => !world.objs[b].burnt).length, nBurnt = broken.length - nBroken;
  add('reparar', nBroken && g.wood >= 3 && busyWith(g, 'reparar') < 1 + Math.floor(nBroken / 2) ? Math.min(20, 10 + nBroken * 2) : 0);
  add('derribar', nBurnt && g.wood >= 6 && busyWith(g, 'derribar') < 1 + Math.floor(nBurnt / 2) ? Math.min(20, 10 + nBurnt * 2) : 0);
  if (nBurnt && g.wood < 12) add('talar', 5); // madera para reconstruir
  const near = fireNear(g);
  add('apagar', know.bomberos && near != null ? 12 : 0);
  // Quemas controladas: en verano o con sequía, sin lluvia ni viento fuerte, queman a propósito tiras de hierba alrededor
  // del pueblo para que un incendio no tenga por dónde llegar (lo saben hacer los que ya apagan fuegos)
  const [wx0, wy0] = windAt(g.fx * T, g.fy * T), dryNow = si === 1 || droughtAt(g.fy * W + g.fx) > .4;
  add('quema', know.bomberos && dryNow && Math.hypot(wx0, wy0) < 6 && !raining(g.fy * W + g.fx) && (g.ctrlBurns || 0) < 40 && busyWith(g, 'quema') < 2 && fireNear(g) == null ? 2 : 0);
  const sacred = g.faith && altarSpot(g);
  add('santuario', g.faith && !g.holy && popOf(g) >= 5 && !busyWith(g, 'santuario') ? 4 + (g.wrath || 0) : 0);
  add('ofrenda', sacred && (g.wrath || 0) > 2 && g.food >= 4 && busyWith(g, 'ofrenda') < 2 ? 4 + g.wrath : 0);
  const volcAwake = sacred && riteOf(g) === 'volcan' && ['erupcion', 'activo'].includes((volcanoNear(g) || {}).state);
  add('sacrificio', sacred && ((g.wrath || 0) > 5 || (volcAwake && (g.wrath || 0) > 1)) && penAnimals(g).length >= 2 && !busyWith(g, 'sacrificio') ? (volcAwake ? 9 : 7) : 0); // con el volcán despierto, más a menudo
  add('plantar', (plotSlot(g, 'berryPlot') || plotSlot(g, 'grove') || (g.cut || 0) > (g.planted || 0) + 1 || (g.treesNear ?? 99) < 14) && busyWith(g, 'plantar') < 2 ? (plotSlot(g, 'berryPlot') || plotSlot(g, 'grove') ? 4 : (g.treesNear ?? 99) < 14 ? 5 : 2) : 0);
  add('picar', (wantHall && g.stone < 6 ? 4 : wantStone ? 2 : .3) + ((g.rocksNear || 0) > 0 ? 2.5 : 0)); // y despejan las piedras del pueblo
  add('pasear', .3);
  if (L.includes('obras')) for (const j of J) if (['construir', 'pozo', 'almacen', 'puente', 'molino', 'mercado', 'templo', 'reparar'].includes(j[0])) j[1] *= 1.5;
  if (L.includes('bosques')) for (const j of J) { if (j[0] === 'talar') j[1] *= .5; if (j[0] === 'plantar' || j[0] === 'arboleda') j[1] *= 1.8; }
  // Hambruna (o el invierno encima sin despensa): todos a buscar comida; lo que no da de comer espera
  const FOOD_JOBS = ['cosechar', 'sembrar', 'arar', 'campo', 'bayas', 'pescar', 'cazar', 'barca', 'capturar', 'bayal', 'plantar'];
  const famine = g.food < pop * 1.2 || ((si === 2 || (si === 1 && seasonInfo().f > .7)) && g.food < pop * 4);
  if (famine) for (const j of J) j[1] *= FOOD_JOBS.includes(j[0]) ? 3 : ['apagar', 'encender', 'alumbrar', 'beber', 'comer', 'pozo', 'construir', 'ampliar', 'ayuntamiento', 'reparar', 'derribar'].includes(j[0]) || (atWarJ && ['arma', 'muralla'].includes(j[0])) ? 1 : ['talar', 'picar'].includes(j[0]) ? .7 : .35;
  // Fuera de su horario, los adultos descansan: solo atienden lo urgente (fuego, defensa, la hoguera, las antorchas)
  if (!inShift(g) && !isNight() && ageOf(v) >= ADULT_H && !(g.danger > 0) && !(famine && g.food < pop * 1.5)) {
    for (let k2 = J.length - 1; k2 >= 0; k2--) if (!['apagar', 'encender', 'alumbrar', 'arma', 'equipar', 'beber', 'comer', 'cosechar', 'reparar', 'derribar'].includes(J[k2][0])) J.splice(k2, 1); // (la cosecha madura se recoge aunque sea tarde)
    if (hasLaw(g, 'toque_queda') && dayT() > .62) J.push(['ocio', 6]); // toque de queda: al caer la tarde, nada de salir (leyes.js)
    else { J.push(['ocio', 6], ['pasear', 1]); sportsLeisure(v, g, J); fairLeisure(v, g, J); eventLeisure(v, g, J); if (holidayToday(g)) J.push(['fiesta', 10]); if (hasTheater(g)) J.push(['ver_teatro', 3]); if (hasColiseum(g)) J.push(['ver_coliseo', 2.5]); if (hasTavern(g) && !hasLaw(g, 'ley_seca')) J.push(['ir_taberna', ageOf(v) < ADULT_H ? 1 : 4]); }
  }
  let k = Math.random() * J.reduce((s, j) => s + j[1], 0);
  for (const [job, w] of J) if ((k -= w) < 0) return job;
  return 'pasear';
}
function setupTask(v, g, job){
  const [fx, fy] = fireXY(g);
  switch (job) {
    case 'tejer': case 'manga': case 'globo': case 'cesta': case 'volar': return balloonTarget(v, g, job);
    case 'tribunal': case 'carcel': case 'imprenta': case 'sindicato': case 'parlamento': case 'academia': case 'universidad': case 'consejo': case 'espias': case 'casino': case 'granero': case 'ahumadero': case 'lenera': case 'postas': return institutionTarget(v, g, job);
    case 'investigar': return scienceTarget(v, g, job);
    case 'mina': case 'extraer': return mineTarget(v, g, job);
    case 'fabrica': case 'fabricar': case 'pozo_fab': case 'extractora': case 'mejorar_almacen': return factoryTarget(v, g, job);
    case 'castillo': case 'foso': case 'abastecer': return fortTarget(v, g, job);
    case 'refugio': return shelterTarget(v, g, v.chill > .3);
    case 'conservar': return seasonTarget(v, g, job);
    case 'chabola': return shackTarget(v, g);
    case 'paraguas': return umbrellaTarget(v, g);
    case 'cercar_volcan': return volcFenceTarget(v, g);
    case 'instalacion': return sportBuildTarget(v, g);
    case 'esquilar': return shearTarget(v, g);
    case 'empedrar': return roadTarget(v, g);
    case 'ruinas': return ruinTarget(v, g);
    case 'boda': case 'entierro': return eventTarget(v, g, job);
    case 'feria': return fairTarget(v, g);
    case 'nadar': case 'correr': return sportTarget(v, g, job);
    case 'talar': {
      const i = objNear(g, (g.treesNear ?? 99) < 12 ? 60 : 30, o => OBJ[o.key][1] === 'tree' && o.st !== 'b' && o.st !== 'j', v); const p = i != null && standBy(i); // sin árboles cerca, van más lejos
      return p ? { k:job, i, x:p[0], y:p[1] } : null;
    }
    case 'picar': {
      const i = objNear(g, 42, o => OBJ[o.key][1] === 'stone' || OBJ[o.key][1] === 'mineral', v); const p = i != null && standBy(i);
      return p ? { k:job, i, x:p[0], y:p[1] } : null;
    }
    case 'bayas': {
      const i = objNear(g, 30, o => OBJ[o.key][1] === 'berry' && yearT - (o.harvT ?? -1e9) > 60, v); const p = i != null && standBy(i);
      return p ? { k:job, i, x:p[0], y:p[1] } : null;
    }
    case 'pescar': {
      let best = null, bd = 30 * T;
      for (const f of fishes) { const d = Math.hypot(f.sx - fx, f.sy - fy), fi = Math.floor(f.y / T) * W + Math.floor(f.x / T); if (f.stock > .3 && d < bd && !frozen(fi) && !dried(fi)) { bd = d; best = f; } }
      return best ? { k:job, f:best, x:best.sx, y:best.sy } : null;
    }
    case 'cazar': {
      let best = null, bd = 30 * T;
      for (const a of animals) { if (a.dead || a.dom || !HERBIVORES.includes(a.sp) || ((g.taboo || {})[a.sp] || 0) > yearT) continue; const d = Math.hypot(a.x - fx, a.y - fy); if (d < bd) { bd = d; best = a; } }
      return best ? { k:job, a:best } : null;
    }
    case 'campo': {
      // Una parcela rectangular (de 5×3 a 8×5 casillas) de tierra buena (junto al agua dulce o de secano)
      for (let k = 0; k < 120; k++) {
        const w = 5 + Math.floor(Math.random() * 4), h = 3 + Math.floor(Math.random() * 3), a = Math.random() * Math.PI * 2, d = 12 + Math.random() * (26 + Math.min(30, popOf(g) / 2)); // el centro queda para las casas; con más gente, más afuera
        const x0 = Math.round(g.fx + Math.cos(a) * d - w / 2), y0 = Math.round(g.fy + Math.sin(a) * d * .8 - h / 2);
        let ok = x0 > 1 && y0 > 1 && x0 + w < W - 1 && y0 + h < H - 1 && !(typeof inTownCore === 'function' && inTownCore(g, x0, y0, x0 + w - 1, y0 + h - 1)); // ni en el casco del pueblo (urbanismo.js)
        for (let y = y0; ok && y < y0 + h; y++) for (let x = x0; ok && x < x0 + w; x++) if (!farmable(g, x, y, y * W + x)) ok = false;
        if (ok) return { k:job, rect:{ x0, y0, w, h }, x:(x0 + (w >> 1)) * T + 2, y:(y0 + h) * T + 3 };
      }
      return null;
    }
    case 'arar': case 'sembrar': case 'cosechar': {
      const want = job === 'cosechar' ? ['madura'] : job === 'sembrar' ? ['arada'] : ['pradera', 'muerta'];
      let best = null, bd = Infinity;
      for (const f of farmMap.values()) { if (f.vid !== g.id || !want.includes(f.st) || f.claim) continue; const d = Math.hypot((f.i % W) * T - v.x, ((f.i / W) | 0) * T - v.y); if (d < bd) { bd = d; best = f; } }
      if (!best) return null; best.claim = true;
      return { k:job, farm:best, x:(best.i % W) * T + 2, y:((best.i / W) | 0) * T + 3 };
    }
    case 'construir': {
      const p = bestSite(v, g, 'casa');
      if (!p) { g.noSite = yearT + 40; return null; } // no cabe otra casa: un rato ampliarán las que hay
      return { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 };
    }
    case 'pisos': { const hs = pisoCands(g); if (!hs.length) return null; const i = hs[0], sb = standBy(i); return sb ? { k:job, i, x:sb[0], y:sb[1] } : null; }
    case 'ampliar': { // de cabaña a casa de piedra: un piso más
      const hs = housesOf(g).filter(i => world.objs[i].key === 'house:hut' && !villagers.some(u => u.task && u.task.k === 'ampliar' && u.task.i === i)); if (!hs.length) return null;
      const i = hs[Math.floor(Math.random() * hs.length)], sb = standBy(i); return sb ? { k:job, i, x:sb[0], y:sb[1] } : null;
    }
    case 'banco': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'maravilla': { // cerca de la plaza, en un solar despejado y fuera de calles y campos (en una capital grande ya no cabe dentro: en las afueras)
      const ok = (x, y, i) => !farmMap.has(i) && !pathMap.has(i) && !streetZone(g, x, y) && !penOverlap(g, x - 6, y - 10, x + 6, y + 1) && !farmIn(x - 6, y - 10, x + 6, y + 1) && !plazaIn(x - 6, y - 10, x + 6, y + 1)
        && !pathIn(x - 6, y - 10, x + 6, y) && wonderClearable(x - 6, y - 10, x + 6, y + 1) && !underBuilding(g, x, y) && !buildingClash(x, y, 'maravilla') && !hallIn(g, x - 6, y - 10, x + 6, y + 1);
      const p = siteNear(g, 8, 32, ok, 200) || siteNear(g, 32, 70, ok, 300);
      return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
    }
    case 'pozo': case 'molino': case 'ayuntamiento': case 'almacen': {
      const p = bestSite(v, g, job);
      return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
    }
    case 'arboleda': case 'bayal': case 'cementerio': {
      // Una parcela para plantar en filas (o, el cementerio, para enterrar a los suyos): árboles para madera (arboleda, 11×7) o arbustos de bayas (bayal, 9×5), lejos de las casas
      const big = job === 'arboleda', cem = job === 'cementerio', w = big ? 11 : 9, h = big ? 7 : cem ? 7 : 5, hl = cem && g.holy;
      for (let k = 0; k < (hl ? 90 : 60); k++) {
        // El cementerio, primero junto a la plaza sagrada (alrededor, nunca dentro); luego donde haya sitio
        const a = Math.random() * Math.PI * 2, d = (big ? 24 : cem ? 22 : 18) + Math.random() * 10, near = hl && k < 30, side = k % 4;
        const x0 = near ? (side === 0 ? hl.x0 - w - 2 : side === 1 ? hl.x1 + 3 : hl.cx - (w >> 1) + Math.round((Math.random() - .5) * 6)) : Math.round(g.fx + Math.cos(a) * d - w / 2);
        const y0 = near ? (side === 2 ? hl.y1 + 3 : side === 3 ? hl.y0 - h - 3 : hl.cy - (h >> 1) + Math.round((Math.random() - .5) * 4)) : Math.round(g.fy + Math.sin(a) * d * .8 - h / 2);
        if (x0 < 2 || y0 < 2 || x0 + w >= W - 2 || y0 + h >= H - 2) continue;
        let ok = true;
        for (let y = y0; ok && y < y0 + h; y++) for (let x = x0; ok && x < x0 + w; x++) { const i = y * W + x, o = world.objs[i]; if (WATER[world.biome[i]] || (!cem && (FERTILE[world.biome[i]] || 0) < .15) || world.biome[i] === B.LAVA || pathMap.has(i) || plazaSet.has(i) || farmMap.has(i) || wallSet.has(i) || underBuilding(g, x, y) || (o && !['tree', 'berry'].includes(OBJ[o.key][1])) || villages.some(o2 => penOverlap(o2, x, y, x, y))) ok = false; }
        if (ok && !plotIn(x0 - 1, y0 - 1, x0 + w, y0 + h) && !holyNear(x0 - 1, y0 - 1, x0 + w, y0 + h)) return { k:job, rect:{ x0, y0, w, h }, x:(x0 + (w >> 1)) * T + 2, y:(y0 + h) * T + 3 };
      }
      return null;
    }
    case 'minar': {
      const i = objNear(g, 40, o => OBJ[o.key][1] === 'mineral', v); const p = i != null && standBy(i);
      return p ? { k:job, i, x:p[0], y:p[1] } : null;
    }
    case 'cuartel': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'instruir': case 'asedio': { const sb = hasBarracks(g) && standBy(g.barracks); return sb ? { k:job, x:sb[0] + (Math.random() - .5) * 10, y:sb[1] + Math.random() * 4 } : null; }
    case 'lonja': { // junto al muelle
      const P = g.port, p = ringFind(P.sx, P.sy, 10, (x, y) => tileFree(x, y) && clearable(x - 5, y - 6, x + 5, y + 1) && !buildingClash(x, y, 'lonja') && !pathIn(x - 5, y - 6, x + 5, y) && !plazaIn(x - 5, y - 6, x + 5, y));
      return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
    }
    case 'bolsa': { if (!hasBank(g)) return null; const sb = standBy(g.bank); return sb ? { k:job, x:sb[0], y:sb[1] } : null; }
    case 'vender': { const r = g.marketRect; if (!r) return null; return { k:job, x:(r.x0 + 1 + Math.random() * (r.x1 - r.x0 - 2)) * T + 2, y:(r.y0 + 2) * T + 3 }; }
    case 'taberna': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'escuela': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'enseñar': { const sb = hasSchool(g) && standBy(g.school); return sb ? { k:job, x:sb[0], y:sb[1] - 2 } : null; }
    case 'catedral': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'explorar': { const [fx, fy] = fireSpot(v, g); return { k:job, x:fx, y:fy }; }
    case 'fiesta': { const [fx, fy] = fireXY(g), a = Math.random() * Math.PI * 2, r0 = 8 + Math.random() * 14; return { k:job, x:fx + Math.cos(a) * r0, y:fy + Math.sin(a) * r0 * .7 }; }
    case 'tazas': { const sb = standBy(g.market); return sb ? { k:job, x:sb[0], y:sb[1] } : null; }
    case 'ir_taberna': { const sb = hasTavern(g) && standBy(g.tavern); return sb ? { k:job, x:sb[0] + (Math.random() - .5) * 14, y:sb[1] + 2 + Math.random() * 5 } : null; }
    case 'teatro': case 'coliseo': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'ver_teatro': case 'ver_coliseo': { const b = job === 'ver_teatro' ? g.theater : g.coliseum, sb = b != null && world.objs[b] && standBy(b); return sb ? { k:job, x:sb[0] + (Math.random() - .5) * 24, y:sb[1] + 2 + Math.random() * 6 } : null; }
    case 'curar': { const s0 = villagers.filter(u => !u.dead && u.vid === g.id && u.sick && !(u.cared > yearT)).sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0]; return s0 ? { k:job, pat:s0, x:s0.x, y:s0.y } : null; }
    case 'hospital': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'curarse': { const sb = hasHosp(g) && standBy(g.hospital); return sb ? { k:job, x:sb[0], y:sb[1] } : null; }
    case 'herreria': { const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'plantar': {
      // Primero las parcelas: el bayal y la arboleda se plantan en filas
      for (const key of ['berryPlot', 'grove']) { const sl = plotSlot(g, key); if (sl != null) return { k:job, i:sl, plot:key, x:(sl % W) * T + 2, y:((sl / W) | 0) * T + 3 + T }; }
      // Repoblar: un plantón de la especie que talaron, algo apartado de la aldea
      const p = siteNear(g, 8, 20, (x, y, i) => tileFree(x, y) && (FERTILE[world.biome[i]] || 0) > .2 && !builtNear(x, y) && isFree(i, 2.5));
      return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
    }
    case 'cercar': {
      // Los cercados siguientes, primero junto al que ya tienen; si no, más lejos que el primero (cerca del centro ya no cabe)
      const p0 = pensOf(g)[0], np = pensOf(g).length;
      for (let k = 0; k < (np ? 320 : 160); k++) {
        const near = p0 && k % 2 === 0, cx = near ? (p0.x0 + p0.x1) / 2 : g.fx, cy = near ? (p0.y0 + p0.y1) / 2 : g.fy;
        const a = Math.random() * Math.PI * 2, d = near ? 10 + Math.random() * 8 : 10 + Math.random() * (24 + np * 16), x0 = Math.round(cx + Math.cos(a) * d) - 4, y0 = Math.round(cy + Math.sin(a) * d * .8) - 3;
        let ok = x0 > 1 && y0 > 1 && x0 + 9 < W - 1 && y0 + 7 < H - 1;
        for (let y = y0; ok && y <= y0 + 6; y++) for (let x = x0; ok && x <= x0 + 8; x++) { const i = y * W + x, o = world.objs[i]; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || bridgeSet.has(i) || farmMap.has(i) || (o && !['tree', 'berry'].includes(OBJ[o.key][1]))) ok = false; }
        for (let y = y0 - 1; ok && y <= y0 + 7; y++) for (let x = x0 - 1; ok && x <= x0 + 9; x++) if (underBuilding(g, x, y) || plazaSet.has(y * W + x) || holySet.has(y * W + x)) ok = false;
        if (ok && !plotIn(x0 - 1, y0 - 1, x0 + 9, y0 + 7) && !penOverlap(g, x0, y0, x0 + 8, y0 + 6)) return { k:job, pen:{ x0, y0, x1:x0 + 8, y1:y0 + 6 }, x:(x0 + 4) * T + 2, y:(y0 + 3) * T + 3 };
      }
      return null;
    }
    case 'capturar': {
      // Entre los animales de granja que hay cerca, el más a mano (prefieren alguna especie que aún no tengan) y, si ya
      // han aprendido qué adaptación les va bien aquí, uno parecido
      const have = new Set(penAnimals(g).map(a => a.sp));
      // Se deja siempre una manada salvaje (al menos 4 de cada especie por la zona) para que sigan criando en libertad
      const wild = {}; for (const a of animals) if (!a.dead && !a.dom && !a.lead && Math.hypot(a.x - fx, a.y - fy) / T < 70) wild[a.sp] = (wild[a.sp] || 0) + 1;
      let best = null, bs = Infinity;
      for (const a of animals) {
        if (a.dead || a.dom || a.lead || !HERBIVORES.includes(a.sp) || (yearT - a.born) / YEAR < ADULT || (wild[a.sp] || 0) <= 4) continue;
        const d = Math.hypot(a.x - fx, a.y - fy) / T; if (d > 50) continue;
        const L = g.learn[a.sp], sc = d + (have.has(a.sp) ? 8 : 0) + (L && L.pref != null ? Math.abs(a.ad - L.pref) * 6 : 0) + Math.random() * 6;
        if (sc < bs) { bs = sc; best = a; }
      }
      return best ? { k:job, a:best, phase:'ir' } : null;
    }
    case 'cantera': {
      // En terreno rocoso (colinas, roca, basalto) a no más de 30 casillas
      const ROCKY = [B.ROCK, B.HILLS, B.BASALT];
      const site = (R, test) => ringFind(g.fx, g.fy, R, (x, y) => test(world.biome[y * W + x]) && Math.hypot(x - g.fx, y - g.fy) > 8 && tileFree(x, y) && tileFree(x, y + 1)
        && areaClear(x - 4, y - 4, x + 4, y + 1) && !underBuilding(g, x, y) && !farmMap.has(y * W + x) && !buildingClash(x, y, 'cantera'));
      const p = site(45, b => ROCKY.includes(b)), q = p || site(28, b => !WATER[b] && b !== B.LAVA && b !== B.SNOW); // sin roca cerca, una cantera en el llano
      return q ? { k:job, i:q[1] * W + q[0], x:q[0] * T + 2, y:(q[1] + 1) * T + 3, flat:!p } : null;
    }
    case 'cantear': { const sb = standBy(g.quarry); return sb ? { k:job, i:g.quarry, x:sb[0], y:sb[1] } : null; }
    case 'puente': { const b = bridgeSite(g); return b ? { k:job, br:b, x:b.sx * T + 2, y:b.sy * T + 3 } : null; }
    case 'muelle': { const pp = portSite(g); return pp ? { k:job, pt:pp, x:pp.sx * T + 2, y:pp.sy * T + 3 } : null; }
    case 'barca': { if (!g.port) return null; const e = g.port.end; return { k:job, phase:'ir', x:(e % W) * T + 2, y:((e / W) | 0) * T + 3 }; }
    case 'carro':
    case 'torre': {
      const p = siteNear(g, 11, 20, (x, y, i) => !farmMap.has(i) && !pathMap.has(i) && !streetZone(g, x, y) && !penOverlap(g, x - 2, y - 7, x + 2, y + 1) && !farmIn(x - 2, y - 7, x + 2, y + 1) && clearable(x - 2, y - 7, x + 2, y + 1) && !underBuilding(g, x, y) && !buildingClash(x, y, 'torre'));
      return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
    }
    case 'muralla': {
      const pl = wallPlan(g); let k = g.wallIdx || 0;
      while (k < pl.length && WATER[world.biome[pl[k]]] && world.biome[pl[k]] !== B.RIVER) k++;
      if (k >= pl.length) return null;
      const i = pl[k], x = i % W, y = (i / W) | 0, sb = tileFree(x, y + 1) ? [x * T + 2, (y + 1) * T + 3] : tileFree(x, y - 1) ? [x * T + 2, (y - 1) * T + 3] : [x * T + 2, y * T + 3];
      return { k:job, from:k, x:sb[0], y:sb[1] };
    }
    case 'orar': {
      const sp = g.temple != null && world.objs[g.temple] ? [(g.temple % W) * T + 2, ((g.temple / W) | 0) * T + 3 + T] : g.altar != null && world.objs[g.altar] ? standBy(g.altar) : fireSpot(v, g);
      return sp ? { k:job, x:sp[0] + (Math.random() - .5) * 8, y:sp[1] + Math.random() * 3 } : null;
    }
    case 'santuario': { const p = holySite(g); return p ? { k:job, hx:p[0], hy:p[1], x:p[0] * T + 2, y:(p[1] + 5) * T + 3 } : null; }
    case 'altar': case 'monumento': { // en la plaza sagrada (el altar en medio, las estatuas en las esquinas); si no hay, en la central
      const h = g.holy, spots = h ? (job === 'altar' ? [[h.cx, h.y0 + 2]] : [[h.x0 + 1, h.y1 - 1], [h.x1 - 1, h.y1 - 1], [h.x0 + 1, h.y0 + 2], [h.x1 - 1, h.y0 + 2]])
        : [[g.fx + 3, g.fy + 3], [g.fx - 3, g.fy + 3], [g.fx + 3, g.fy - 2], [g.fx - 3, g.fy - 2]];
      for (const [x, y] of spots) {
        const i = y * W + x; if (world.objs[i] || WATER[world.biome[i]] || buildingClash(x, y, 'altar')) continue;
        if (job === 'monumento' && statueNear(x, y, 6)) continue; // no pegada a otra estatua (devocion.js)
        return { k:job, i, x:x * T + 2, y:(y + 1) * T + 3 };
      }
      return null;
    }
    case 'mercado': {
      // Su propia plaza de mercado (11×7), apartada de caminos, campos y edificios
      for (let k = 0; k < 220; k++) {
        const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * (14 + Math.min(16, popOf(g) / 3)) /* en un pueblo grande, más afuera */, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .8);
        if (x < 7 || y < 6 || x >= W - 7 || y >= H - 4) continue;
        let ok = !buildingClash(x, y, 'mercado') && !villages.some(o => penOverlap(o, x - 5, y - 4, x + 5, y + 2)) && !plotIn(x - 5, y - 4, x + 5, y + 2);
        for (let yy = y - 4; ok && yy <= y + 2; yy++) for (let xx = x - 5; ok && xx <= x + 5; xx++) {
          const i = yy * W + xx, o = world.objs[i];
          if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || plazaSet.has(i) || farmMap.has(i) || bridgeSet.has(i) || wallSet.has(i) || (o && !['tree', 'berry'].includes(OBJ[o.key][1]))) ok = false;
        }
        if (ok) return { k:job, i:y * W + x, x:x * T + 2, y:(y + 1) * T + 3 };
      }
      return null;
    }
    case 'templo': { // presidiendo la plaza sagrada por el norte, con la puerta a ella
      if (g.holy) { const x = g.holy.cx, y = g.holy.y0 - 1; if (clearable(x - 4, y - 7, x + 4, y) && !buildingClash(x, y, 'templo') && !pathIn(x - 4, y - 7, x + 4, y)) return { k:job, i:y * W + x, x:x * T + 2, y:(y + 1) * T + 3 }; }
      const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
    case 'encender': { const [sx, sy] = fireSpot(v, g); return { k:job, x:sx, y:sy }; }
    case 'comerciar': {
      if (g.market == null || !world.objs[g.market]) return null;
      const r = g.marketRect, x = r ? (r.x0 + 1 + Math.random() * (r.x1 - r.x0 - 2)) * T : (g.market % W) * T, y = r ? (r.y1 - Math.random() * 2) * T + 3 : ((g.market / W) | 0) * T + T + 3;
      return { k:job, x, y };
    }
    case 'antorcha': { const i = torchSite(g); return i != null ? { k:job, ti:i, x:(i % W) * T + 2, y:((i / W) | 0) * T + 3 + 2 } : null; }
    case 'alumbrar': {
      let best = null, bd = Infinity;
      for (const tc of torchesOf(g)) { if (tc.lit || raining(tc.i)) continue; const d = Math.hypot((tc.i % W) * T - v.x, ((tc.i / W) | 0) * T - v.y); if (d < bd) { bd = d; best = tc; } }
      return best ? { k:job, tc:best, x:(best.i % W) * T + 2, y:((best.i / W) | 0) * T + 3 + 2 } : null;
    }
    case 'reparar': case 'derribar': {
      const want = job === 'derribar';
      const b = buildingsOf(g).find(i => world.objs[i] && (want ? world.objs[i].burnt : !world.objs[i].burnt && world.objs[i].dmg > .3) && !villagers.some(u => u !== v && u.task && u.task.i === i));
      if (b == null) return null; return { k:job, i:b, x:(b % W) * T + 2, y:((b / W) | 0) * T + 3 + T };
    }
    case 'apagar': { // primero, agua: del pozo (si tiene) o de la orilla más cercana
      const fi = fireNear(g); if (fi == null) return null;
      const fx2 = Math.floor(fi % W), fy2 = (fi / W) | 0;
      let best = null, bd = Infinity;
      for (const w of wellsOf(g)) { if (w.q < .05) continue; const d = Math.hypot((w.i % W) - fx2, ((w.i / W) | 0) - fy2); if (d < bd) { bd = d; best = w; } }
      const sb = best ? standBy(best.i) : waterSpot(fx2, fy2, v);
      if (!sb) return null;
      return { k:job, fire:fi, well:best, phase:'agua', x:sb[0], y:sb[1] };
    }
    case 'quema': {
      const p = siteNear(g, 10, 15, (x, y, i) => !world.objs[i] && (FUEL[world.biome[i]] || 0) > 0 && !burnt.has(i) && !farmMap.has(i) && !pathMap.has(i) && !plazaSet.has(i) && !underBuilding(g, x, y) && tileFree(x, y + 1));
      return p ? { k:job, ti:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null;
    }
    case 'ofrenda': { const sp = riteSpot(g, v); return sp ? { k:job, x:sp[0] + (Math.random() - .5) * 6, y:sp[1] } : null; }
    case 'sacrificio': { const herd = penAnimals(g).filter(a => !a.lead && !a.rider); if (!herd.length) return null; return { k:job, a:herd[Math.floor(Math.random() * herd.length)], phase:'ir' }; }
    case 'equipar': { const sp = hasForge(g) ? standBy(g.forge) : fireSpot(v, g); return sp ? { k:job, x:sp[0], y:sp[1] } : null; }
    case 'caña': case 'arma': return { k:job, x:fireSpot(v, g)[0], y:fireSpot(v, g)[1] }; // se la fabrica junto a la hoguera con un palo
    case 'ocio': { // a la plaza, al mercado o junto a la hoguera, a charlar
      const r = g.marketRect && Math.random() < .3 ? g.marketRect : g.plaza;
      if (r) return { k:job, x:(r.x0 + .5 + Math.random() * (r.x1 - r.x0)) * T + 2, y:(r.y0 + .5 + Math.random() * (r.y1 - r.y0)) * T + 3 };
      const [sx, sy] = fireSpot(v, g); return { k:job, x:sx, y:sy };
    }
    case 'pasear': {
      const p = siteNear(g, 1, 6, (x, y) => tileFree(x, y));
      return p ? { k:job, x:p[0] * T + 2, y:p[1] * T + 3 } : null;
    }
  }
  return null;
}
// ---- Hacer el trabajo: ir, trabajar un rato y volver a la hoguera con lo conseguido ----
function runTask(v, g, dt){
  const t = v.task, [fx, fy] = fireXY(g);
  if ((t.k === 'ritual' || t.k === 'votar' || t.k === 'golpe' || t.k === 'detenido' || t.k === 'espectador' || t.k === 'mitin' || t.k === 'oficina') && yearT > t.until) { v.task = null; return; }
  if (t.k === 'jugar') { if (yearT > t.until) { v.task = null; return; } runBallPlayer(v, dt); return; }
  if (t.k === 'atleta') return; // lo mueve la carrera
  if (t.k === 'protesta') { if (yearT > t.until) { v.task = null; return; } if (t.mf) { protSteer(v, t); vGo(v, t.gx, t.gy, dt, t.run); return; } /* (manifestaciones.js) */ const q = t.pts[t.idx % t.pts.length]; if (vGo(v, q[0], q[1], dt)) t.idx++; return; } // dando vueltas a la plaza con el cartel
  if (t.k === 'reprimir') { runRepress(v, g, t, dt); return; }
  if (t.k === 'guardia') { if (yearT > t.until) { v.task = null; v.ambush = false; return; } if (vGo(v, t.x, t.y, dt, true)) v.ambush = !!t.hide; return; } // en su puesto, esperando
  if (t.k === 'sacrificio' && t.phase !== 'altar') {
    const a = t.a; if (!a || a.dead || a.dom !== g.id) { v.task = null; return; }
    if (t.phase === 'ir') {
      if (vGo(v, a.x, a.y, dt)) { const sp = riteSpot(g, v); if (!sp) { v.task = null; return; } a.lead = v; t.phase = 'llevar'; t.x = sp[0]; t.y = sp[1]; v.lastD = Infinity; }
      return;
    }
    if (!vGo(v, t.x, t.y, dt)) return;
    t.phase = 'altar';
  }
  if (t.k === 'montar') {
    const a = t.a; if (!a || a.dead || a.rider || a.dom !== g.id) { v.task = t.next; return; }
    if (vGo(v, a.x, a.y, dt)) {
      a.rider = v; v.mount = a; a.lead = null;
      v.cart = (g.carts || 0) > villagers.filter(u => u.cart && u.vid === g.id).length;
      v.task = t.next; v.lastD = Infinity; v.route = null; v.routeKey = null;
    }
    return;
  }
  if (t.k === 'volver') { if (t.x == null) [t.x, t.y] = dropSpot(v, g); if (vGo(v, t.x, t.y, dt)) { deposit(v, g); dismount(v); v.task = null; v.wait = .5; } return; }
  if (t.k === 'cazar' || (t.k === 'capturar' && t.phase === 'ir')) {
    const a = t.a; if (!a || a.dead || a.dom) { v.task = null; return; }
    if (Math.hypot(a.x - v.x, a.y - v.y) > 60 * T) { v.task = null; return; }
    if (vGo(v, a.x, a.y, dt, t.k === 'cazar')) {
      if (t.k === 'cazar') { killAnimal(a, 'cazado'); v.carry = { k:'comida', t:'carne', n:a.sp === 'vaca' || a.sp === 'caballo' ? 8 : a.sp === 'pollo' ? 2 : 5, hide:a.sp !== 'pollo' }; v.task = { k:'volver' }; }
      else if (pensOf(g).length) {
        a.dom = g.id; a.lead = v; a.domSince = yearT; if (herdLeader.get(a.herd) === a) herdLeader.delete(a.herd); a.herd = 0;
        a.penK = emptiestPen(g); const pp = pensOf(g)[a.penK]; // al cercado con más sitio
        t.phase = 'llevar'; t.x = (pp.x0 + 3) * T + 2; t.y = (pp.y0 + 2) * T + 3;
      } else v.task = null;
    }
    return;
  }
  if (t.k === 'barca') {
    if (t.phase === 'ir') {
      if (!vGo(v, t.x, t.y, dt)) return;
      const spot = g.port && !g.boatOut && openWater(g.port.launch) && fishingSpot(g); if (!spot) { v.task = null; v.wait = 1; return; }
      v.boat = true; g.boatOut = true; t.phase = 'remar'; t.tx = spot[0]; t.ty = spot[1]; v.x = (g.port.launch % W) * T + 2; v.y = ((g.port.launch / W) | 0) * T + 3; return;
    }
    const bi0 = Math.floor(v.y / T) * W + Math.floor(v.x / T);
    if (!openWater(bi0) && !bridgeSet.has(bi0)) { v.boat = false; g.boatOut = false; landAt(v, t.x, t.y); v.task = { k:'volver' }; return; } // el agua se ha secado o helado bajo la barca: a tierra
    if (t.phase === 'pescando') { v.moving = false; if ((t.ft -= dt) <= 0) { v.carry = { k:'comida', t:'carne', n:6 }; gainText(v); g.fished = (g.fished || 0) + 1; t.phase = 'volviendo'; } return; }
    const [tx, ty] = t.phase === 'remar' ? [t.tx, t.ty] : [(g.port.launch % W) * T + 2, ((g.port.launch / W) | 0) * T + 3], d = Math.hypot(tx - v.x, ty - v.y);
    if (d < 2) {
      if (t.phase === 'remar') { t.phase = 'pescando'; t.ft = 6; }
      else { v.boat = false; g.boatOut = false; landAt(v, t.x, t.y); v.task = { k:'volver' }; }
      return;
    }
    if (!openWater(Math.floor(v.y / T) * W + Math.floor(v.x / T)) && !bridgeSet.has(Math.floor(v.y / T) * W + Math.floor(v.x / T))) { v.boat = false; g.boatOut = false; landAt(v, t.x, t.y); v.task = { k:'volver' }; return; } // el agua se ha secado o helado: la barca se queda varada
    const sp = Math.min(d, 6 * dt); v.x += (tx - v.x) / d * sp; v.y += (ty - v.y) / d * sp;
    if (Math.abs(tx - v.x) > .5) v.dir = tx < v.x ? -1 : 1; v.moving = true; v.walk += dt; return;
  }
  if (!vGo(v, t.x, t.y, dt)) return;
  // Ha llegado
  switch (t.k) {
    case 'tejer': case 'manga': case 'globo': case 'cesta': case 'volar': balloonArrive(v, g, t); break;
    case 'embarcar': balloonArrive(v, g, t); return;
    case 'tribunal': case 'carcel': case 'imprenta': case 'sindicato': case 'parlamento': case 'academia': case 'universidad': case 'consejo': case 'espias': case 'casino': case 'granero': case 'ahumadero': case 'lenera': case 'postas': institutionArrive(v, g, t); break;
    case 'investigar': scienceArrive(v, g, t); break;
    case 'mina': case 'extraer': mineArrive(v, g, t); break;
    case 'fabrica': case 'fabricar': case 'pozo_fab': case 'extractora': case 'mejorar_almacen': factoryArrive(v, g, t); break;
    case 'castillo': case 'foso': case 'abastecer': fortArrive(v, g, t); break;
    case 'refugio': shelterArrive(v, g, t); break;
    case 'conservar': seasonArrive(v, g, t); break;
    case 'chabola': shackArrive(v, g, t); break;
    case 'paraguas': umbrellaArrive(v, g, t); break;
    case 'cercar_volcan': volcFenceArrive(v, g, t); break;
    case 'instalacion': sportBuildArrive(v, g, t); break;
    case 'esquilar': shearArrive(v, g, t); break;
    case 'empedrar': roadArrive(v, g, t); break;
    case 'ruinas': ruinArrive(v, g, t); break;
    case 'boda': case 'entierro': eventArrive(v, g, t); break;
    case 'feria': fairArrive(v, g, t); break;
    case 'nadar': case 'correr': sportArrive(v, g, t); break;
    case 'dormir': dismount(v); v.sleep = true; v.home = t.h ?? null; v.task = null; return;
    case 'beber': v.actT = t.ice || t.snow || t.dry ? 5 : 2; if (t.dry) floats.push({ x:v.x, y:v.y - 12, txt:'el pozo está casi seco', col:'#d8c8a0', life:0 }); if (t.ice || t.snow) floats.push({ x:v.x, y:v.y - 12, txt:t.ice ? 'rompe el hielo' : 'derrite nieve', col:'#cfe8ff', life:0 }); v.onDone = () => { v.water = 1; v.hot = Math.max(0, (v.hot || 0) - .6);
      if (t.cup) { g.cups = Math.max(0, (g.cups || 0) - 1); const pr = Math.min(v.money || 0, 1); if (pr > 0) { v.money -= pr; ecOf(g).treas += pr * .5; } floats.push({ x:v.x, y:v.y - 12, txt:'taza de agua', col:'#9cc8f0', life:0 }); }
      else if (t.jar) { g.jars = Math.max(0, (g.jars || 0) - 1); } else if (!t.well) { const jc = 6 + storesOf(g).length * 8; if ((g.jars || 0) < jc) { g.jars = Math.min(jc, (g.jars || 0) + 2); if (!g.jarMsg && g.jars >= 4) { g.jarMsg = true; notify(`En ${g.name} empiezan a traer cántaros de agua para no tener que ir tan lejos a beber`, { x:g.fx * T, y:g.fy * T }); } } } if (!v.swims && !t.well && Math.random() < .03) v.swims = true; if (t.well) t.well.q = Math.max(0, t.well.q - .02); if (t.dry) v.water = .55; }; break;
    case 'comer': v.actT = 1.5; dismount(v); v.onDone = () => { deposit(v, g); if (eatFrom(v, g, 1) && g.coin && g.market != null && (v.money || 0) > 0) { const pr = Math.min(v.money, priceOf(g)); v.money -= pr; ecOf(g).treas += pr * .1; floats.push({ x:v.x, y:v.y - 12, txt:`−${pr} ${g.coin}`, col:'#c8b080', life:0 }); } }; break;
    case 'ocio': v.actT = 6 + Math.random() * 8; v.dir = Math.random() < .5 ? -1 : 1; v.dirT = v.actT; v.onDone = () => { v.fun = yearT; }; break;
    case 'equipar': v.actT = hasForge(g) ? 6 : 5; v.onDone = () => {
      const n = gearNeed(g); if (!n) return; const [u, what] = n;
      if (what === 'espada') { g.iron -= 2; g.wood -= 1; u.weapon = 'espada'; }
      else if (what === 'ballesta') { g.iron -= 1; g.wood -= 3; u.weapon = 'ballesta'; }
      else if (what === 'escudo') { g.wood -= 3; u.shield = true; }
      else if (what === 'hierro') { g.iron -= 3; u.armor = 'hierro'; }
      else if (what === 'cuero') { g.hides -= 2; u.armor = 'cuero'; }
      gearMsg(g, what); floats.push({ x:v.x, y:v.y - 12, txt:GEAR_TXT[what], col:'#c8d0dc', life:0 });
    }; break;
    case 'arma': v.actT = 5; v.onDone = () => {
      if (v.weapon) return;
      const mine = villagers.filter(u => u.vid === g.id && !u.dead), spears = mine.filter(u => u.weapon === 'lanza').length, bows = mine.filter(u => u.weapon === 'arco').length;
      const melee = mine.filter(u => u.weapon === 'lanza' || u.weapon === 'espada').length, ranged = mine.filter(u => isRanged(u.weapon)).length, forge = hasForge(g);
      if (ranged >= melee || g.wood < 2) {
        if (forge && (g.iron || 0) >= 2 && g.wood >= 1) { g.iron -= 2; g.wood -= 1; v.weapon = 'espada'; gearMsg(g, 'espada'); }
        else if (g.stone >= 1 && g.wood >= 1) { g.wood -= 1; g.stone -= 1; v.weapon = 'lanza'; if (forge && (g.iron || 0) >= 1) { g.iron -= 1; v.ironW = true; } }
      }
      if (!v.weapon && forge && knowsSci(g, 'combustion') && (g.iron || 0) >= 2 && g.wood >= 1 && (g.coal || 0) + g.wood >= 3) { g.iron -= 2; g.wood -= 1; v.weapon = v.mount || v === g.leader ? 'pistola' : 'mosquete'; gearMsg(g, v.weapon); } // armas de fuego (armas.js)
      if (!v.weapon) {
        if (forge && (g.iron || 0) >= 1 && g.wood >= 3) { g.iron -= 1; g.wood -= 3; v.weapon = 'ballesta'; gearMsg(g, 'ballesta'); }
        else if (g.wood >= 2) { g.wood -= 2; v.weapon = 'arco'; }
      }
    }; break;
    case 'caña': v.actT = 4; v.onDone = () => {
      if (g.wood >= 1 && !v.rod) { g.wood -= 1; v.rod = true; if (!g.rods) { g.rods = true; notify(`En ${g.name} han aprendido a fabricar cañas de pescar`, { x:g.fx * T, y:g.fy * T }); } }
    }; break;
    case 'talar': case 'picar': case 'bayas': {
      const o = world.objs[t.i]; if (!o) { v.task = null; return; }
      v.actT = (t.k === 'bayas' ? 2 : 3.5) * (hasForge(g) && t.k !== 'bayas' ? .75 : 1);
      v.onDone = () => {
        const o2 = world.objs[t.i]; if (!o2) return;
        const tx = t.i % W, ty = (t.i / W) | 0;
        if (t.k === 'bayas') { o2.harvT = yearT; v.carry = { k:'comida', t:'veg', n:3 }; }
        else if (t.k === 'talar') { const regrowKey = o2.key, regrow = Math.random() < (hasLaw(g, 'bosques') ? .6 : .3); if (regrow) setTimeout(() => { if (!world.objs[t.i] && placeObject(t.i, regrowKey, Math.random, yearT, .5)) composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); }, 0); g.cut = (g.cut || 0) + 1; g.lastTree = o2.key; fallObj(t.i); world.objs[t.i] = null; composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); rareDirty = true; v.carry = { k:'madera', n:o2.key.startsWith('ancient') ? 12 : 6 }; }
        else { world.objs[t.i] = null; addEffect(tx * T + 2, ty * T + 3, 'poof'); composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); rareDirty = true; v.carry = { k:'piedra', n:o2.key.startsWith('big') || OBJ[o2.key][1] === 'mineral' ? 7 : 4 };
          g.mined = (g.mined || 0) + 1; const kn = g.know ||= {};
          if (!kn.cantera && g.mined >= 3) { // (si no hay roca cerca, la cantera se abre en el llano: da algo menos)
            kn.cantera = true; notify(`En ${g.name} han aprendido a abrir canteras en la roca para sacar más piedra`, { x:g.fx * T, y:g.fy * T });
          } }
        statsSoon();
      };
      break;
    }
    case 'pescar': v.actT = v.rod ? 4 : 6; v.dir = t.f.x < v.x ? -1 : 1; v.dirT = 1;
      v.onDone = () => { g.fished = (g.fished || 0) + 1; if (t.f.stock > .2) { t.f.stock -= v.rod ? .25 : .12; v.carry = { k:'comida', t:'carne', n:v.rod ? 3 : 1 }; if (v.rod && Math.random() < .04) v.rod = false; } }; break; // la caña a veces se rompe
    case 'campo': v.actT = 2; v.onDone = () => { // marca la parcela: aún hay que ararla
      const r = t.rect; let ok = true;
      for (let y = r.y0; ok && y < r.y0 + r.h; y++) for (let x = r.x0; ok && x < r.x0 + r.w; x++) if (!farmable(g, x, y, y * W + x)) ok = false;
      if (ok) { let felled = 0;
        for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) { const i = y * W + x; if (world.objs[i]) { if (OBJ[world.objs[i].key][1] === 'tree') { fallObj(i); felled++; } world.objs[i] = null; } farmMap.set(i, { i, vid:g.id, g:0, st:'pradera', dry:0, field:r }); }
        if (felled) { g.wood += felled * 2; composeRegion(r.x0 - 8, r.y0 - 12, r.x0 + r.w + 8, r.y0 + r.h + 12); rareDirty = true; } } // desbrozan: la madera, al almacén
    }; break;
    case 'arar': v.actT = 2.5; v.onDone = () => { const f = t.farm; f.claim = false; if (farmMap.get(f.i) === f && (f.st === 'pradera' || f.st === 'muerta')) { f.st = 'arada'; f.why = null; } }; break;
    case 'sembrar': v.actT = 1.5; v.onDone = () => { const f = t.farm; f.claim = false; if (farmMap.get(f.i) === f && f.st === 'arada') { f.st = 'sembrado'; f.g = 0; f.dry = 0;
      f.crop = bestCrop(g, f.i); /* lo que mejor rinde en este campo ahora, de las semillas que tienen (cultivos.js) */ const kc = (g.crops ||= {}); if (!kc[f.crop]) { kc[f.crop] = true; if (Object.keys(kc).length > 1) notify(`En ${g.name} empiezan a sembrar ${CROPS[f.crop].n}: es lo que mejor crece en ${['primavera', 'verano', 'otoño', 'invierno'][seasonInfo().i]}`, { x:v.x, y:v.y }); } } }; break;
    case 'cosechar': v.actT = 2; v.onDone = () => { const f = t.farm; f.claim = false; if (farmMap.get(f.i) === f && f.st === 'madura') { f.st = 'arada'; const C = CROPS[f.crop || 'trigo']; v.carry = { k:'comida', t:'veg', n:C.y + (C.mill && g.mill != null && world.objs[g.mill] ? 3 : 0) + (hasForge(g) ? 2 : 0) }; if (C.cash) { const ec = ecOf(g); if (ec) ec.treas += Math.round(C.cash * ec.P); } } }; break; // (la uva: el vino se vende)
    case 'pisos': v.actT = 14; v.onDone = () => {
      const o = world.objs[t.i], tier = o ? bloqueTier(o.key) : -1; if (tier < 0 || tier >= bloqueMax(g) || g.stone < 16 || g.wood < 4 || ((g.iron || 0) < 1 && industrial(g))) return;
      o.key = `house:bloque${tier + 1}`; o.dmg = 0; g.stone -= 16; g.wood -= 4; if ((g.iron || 0) >= 1) g.iron -= 1; const x = t.i % W, y = (t.i / W) | 0;
      composeRegion(x - 8, y - 16, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof');
      if (!g.pisoMsg) { g.pisoMsg = true; notify(`En ${g.name} ya no cabe nada más: levantan el primer bloque de pisos, dos plantas de vecinos donde antes vivía una familia`, { x:x * T, y:y * T }); }
      else if (tier + 1 === bloqueMax(g) && !(g.pisoTop >= tier + 1)) { g.pisoTop = tier + 1; notify(`En ${g.name} levantan un bloque de ${tier + 2} plantas: la ciudad crece hacia arriba`, { x:x * T, y:y * T }); }
    }; break;
    case 'ampliar': v.actT = 7; v.onDone = () => {
      const o = world.objs[t.i]; if (!o || o.key !== 'house:hut' || g.stone < 7 || g.wood < 1) return;
      o.key = 'house:piedra'; o.dmg = 0; g.stone -= 7; g.wood -= 1; const x = t.i % W, y = (t.i / W) | 0;
      composeRegion(x - 7, y - 11, x + 7, y + 12); addEffect(x * T + 2, y * T + 3, 'poof');
      if (!g.ampMsg) { g.ampMsg = true; notify(`En ${g.name} ya no caben más casas: amplían las cabañas a casas de piedra con un piso más`, { x:x * T, y:y * T }); }
    }; break;
    case 'construir': v.actT = 6; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0, stone = g.stone >= 10 || (g.stone >= 8 && g.wood >= 3);
      if (clearable(x - 4, y - 5, x + 4, y + 1)) clearSite(g, x - 4, y - 5, x + 4, y + 1); // despejan el solar
      if (g.wood < (stone ? 1 : 4) || !tileFree(x, y) || penOverlap(g, x - 4, y - 5, x + 4, y + 1) || buildingClash(x, y, 'casa', t.i)) return;
      world.objs[t.i] = { key:stone ? 'house:piedra' : 'house:hut', v:Math.floor(Math.random() * 20), ox:0, oy:0, vid:g.id };
      g.houses.push(t.i); newDeed(g, t.i); if (stone) { const w = Math.min(3, g.wood); g.wood -= w; g.stone -= 8 + (3 - w) * 1; } else g.wood -= 4; // la piedra suple la madera que falte
      composeRegion(x - 7, y - 11, x + 7, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
    }; break;
    case 'puente': { const b = t.br; v.actT = 4 + b.len * 1.5; v.onDone = () => {
      if (g.wood < b.len * 2 || !(b.core || b.tiles).every(openWater)) return;
      for (const i of b.tiles) bridgeSet.add(i);
      bridges.push({ ...b, vid:g.id }); g.wood -= b.len * 2;
      pathMap.add(b.sy * W + b.sx); pathMap.add(b.ey * W + b.ex); connect(g, b.sx, b.sy - 1);
      if (!g.bridgeMsg) { g.bridgeMsg = true; notify(`En ${g.name} han construido su primer puente`, { x:b.cx * T, y:b.cy * T }); }
    }; break; }
    case 'muelle': { const pp = t.pt; v.actT = 9; v.onDone = () => {
      if (g.port || g.wood < 8 || !pp.tiles.every(openWater)) return;
      for (const i of pp.tiles) bridgeSet.add(i);
      bridges.push({ tiles:pp.tiles, h:!!pp.dx, cx:pp.sx, cy:pp.sy, pier:true, vid:g.id });
      g.port = pp; g.wood -= 8; pathMap.add(pp.sy * W + pp.sx); connect(g, pp.sx, pp.sy - 1);
      notify(`En ${g.name} han construido un muelle con su barca`, { x:pp.sx * T, y:pp.sy * T });
    }; break; }
    case 'ayuntamiento': case 'almacen': { const hall = t.k === 'ayuntamiento'; v.actT = hall ? 14 : 8; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0, [hw, hh] = hall ? [5, 7] : [4, 5];
      if ((hall ? g.hall != null || !(g.wood >= 10 && g.stone >= 6) && g.wood < 18 : g.wood < 8)) return; // sin piedra, todo de madera
      if (clearable(x - hw, y - hh, x + hw, y + (hall ? 0 : 1))) clearSite(g, x - hw, y - hh, x + hw, y + (hall ? 0 : 1));
      if ((!tileFree(x, y) && !(hall && !world.objs[t.i])) || buildingClash(x, y, t.k, t.i)) return;
      world.objs[t.i] = { key:hall ? 'hall:ayuntamiento' : 'store:almacen', v:0, ox:0, oy:0, vid:g.id };
      composeRegion(x - 10, y - 14, x + 10, y + 12); // se pinta entero ya (si no, aparecía a trozos, cortado, cuando se repintaba algo al lado)
      if (hall) { g.hall = t.i; if (g.stone >= 6) { g.wood -= 10; g.stone -= 6; } else g.wood -= 18; const nf = !g.flag; g.flag ||= makeFlag(g); g.flagUrl = flagDataUrl(g.flag); notify(`${g.name} ya tiene ayuntamiento${nf ? ' y ha creado su bandera' : ''}`, { x:x * T, y:y * T }); }
      else { (g.stores ||= []).push(t.i); g.wood -= 8; if (g.stores.length === 1) notify(`En ${g.name} han construido un almacén`, { x:x * T, y:y * T }); connect(g, x, y); }
      composeRegion(x - 8, y - 12, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof');
    }; break; }
    case 'banco': v.actT = 12; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if (hasBank(g) || g.wood < 8 || g.stone < 12 || !g.coin) return;
      if (clearable(x - 4, y - 5, x + 4, y + 1)) clearSite(g, x - 4, y - 5, x + 4, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'banco', t.i)) return;
      world.objs[t.i] = { key:'bank:banco', v:0, ox:0, oy:0, vid:g.id }; g.bank = t.i; g.wood -= 8; g.stone -= 12; ecOf(g).dep += 10;
      composeRegion(x - 8, y - 12, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
      notify(`En ${g.name} abren un banco: ya se puede ahorrar y pedir préstamos en ${coinPl(g)}`, { x:x * T, y:y * T });
    }; break;
    case 'maravilla': v.actT = 20; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0, reg = WONDER_OF[regimeOf(g)] || regimeOf(g);
      if ((g.wonder != null && world.objs[g.wonder]) || g.wood < 15 || g.stone < 30 || !(WONDER_ROWS[reg] || ART_MAP['wonder:' + reg])) return;
      if (wonderClearable(x - 6, y - 10, x + 6, y + 1)) wonderClear(g, x - 6, y - 10, x + 6, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'maravilla', t.i)) return;
      world.objs[t.i] = { key:'wonder:' + reg, v:0, ox:0, oy:0, vid:g.id }; g.wonder = t.i; g.wood -= 15; g.stone -= 30;
      if (g.coin) ecOf(g).treas -= 30 * ecOf(g).P; // se paga del tesoro (si no llega, deuda o moneda impresa)
      g.anger = Math.max(0, (g.anger || 0) - 20);
      composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
      notify(`En ${g.name} terminan ${WONDER_TXT[reg]}`, { x:x * T, y:y * T });
    }; break;
    case 'torre': v.actT = 10; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if (g.wood < 12 || g.stone < 4) return;
      if (clearable(x - 2, y - 7, x + 2, y + 1)) clearSite(g, x - 2, y - 7, x + 2, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'torre', t.i)) return;
      world.objs[t.i] = { key:'tower:torre', v:0, ox:0, oy:0, vid:g.id }; (g.towers ||= []).push(t.i); g.wood -= 12; g.stone -= 4;
      composeRegion(x - 7, y - 11, x + 7, y + 12); connect(g, x, y);
      if (g.towers.length === 1) notify(`En ${g.name} han levantado una torre de vigía`, { x:x * T, y:y * T });
    }; break;
    case 'muralla': v.actT = 6; v.onDone = () => {
      // Un tramo de empalizada (hasta 6 casillas); donde cruza un camino queda una puerta
      const pl = wallPlan(g); let k = Math.max(g.wallIdx || 0, t.from), built = 0;
      let half = 0; // de madera, media unidad por tramo; de piedra, una piedra por tramo
      const stretch = wallStretch(g), cost = wallCost(g); // con la ley de fortificación, el doble y a mitad de precio (defensa.js)
      while (k < pl.length && built < stretch && (g.wood >= 1 || g.stone >= 10)) { // (lo que se gasta abajo: piedra solo con 10 o más; si no, madera)
        const i = pl[k], o = world.objs[i]; k++;
        if ((WATER[world.biome[i]] && world.biome[i] !== B.RIVER) || bridgeSet.has(i) || plazaSet.has(i)) continue; // (los ríos se cruzan con una reja)
        if (midGate(g, i)) { gateSet.add(i); gateOwner.set(i, g.id); continue; } // una puerta por lado, donde pasa el camino principal (defensa.js); los demás caminos los corta la muralla
        if (o && (isBuilding(o) || o.key.startsWith('fire') || o.vid != null)) continue; // rocas, flores y matas se quitan; los edificios no
        if (underBuilding(g, i % W, (i / W) | 0) || plotIn(i % W, (i / W) | 0, i % W, (i / W) | 0) || villages.some(o => inPen(o, i % W, (i / W) | 0, 1))) continue; // ni a través de un edificio, una parcela o un cercado
        if (o) { if (OBJ[o.key][1] === 'tree') fallObj(i); world.objs[i] = null; composeRegion((i % W) - 7, ((i / W) | 0) - 11, (i % W) + 7, ((i / W) | 0) + 12); }
        if (villagers.some(u => !u.dead && Math.floor(u.x / T) === i % W && Math.floor(u.y / T) === ((i / W) | 0))) { k--; break; } // alguien encima: luego
        farmMap.delete(i); pathMap.delete(i); wallSet.add(i); built++; // (si pasa por el borde de un campo, se come esa casilla)
        if (g.stone >= 10) { if ((half += cost) >= 1) { half -= 1; g.stone -= 1; } wallStone.add(i); } else if ((half += .5 * cost) >= 1) { half = 0; g.wood -= 1; }
      }
      g.wallIdx = k;
      if (k >= pl.length && !(g.wallRing === 2 ? g.wall2Msg : g.wallMsg)) { if (g.wallRing === 2) g.wall2Msg = true; else g.wallMsg = true; notify(g.wallRing === 2 ? `${g.name} ya tiene doble muralla` : `${g.name} ya está amurallada`, { x:g.fx * T, y:g.fy * T }); }
    }; break;
    case 'orar': v.actT = 5; v.onDone = () => { g.wrath = Math.max(0, (g.wrath || 0) - .6); g.devotion = (g.devotion || 0) + .1; if (Math.random() < .3 && g.food >= 2) g.food -= 1; }; break; // con una ofrenda de vez en cuando
    case 'altar': case 'monumento': case 'templo': case 'mercado': { const kk = t.k; v.actT = kk === 'altar' ? 5 : kk === 'mercado' ? 9 : 14; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      const cost = { altar:[0, 4], monumento:[0, 25], templo:[10, 15], mercado:[12, 0] }[kk];
      if (g.wood < cost[0] || g.stone < cost[1] || world.objs[t.i] || WATER[world.biome[t.i]]) return;
      if (kk === 'templo') { const [hw, hh] = KIND_DIMS[kk]; if (clearable(x - hw, y - hh, x + hw, y + 1)) clearSite(g, x - hw, y - hh, x + hw, y + 1); if (!tileFree(x, y) || buildingClash(x, y, kk, t.i)) return; }
      if (kk === 'mercado') { // se despeja y se empiedra su plaza
        clearSite(g, x - 5, y - 4, x + 5, y + 2); if (!tileFree(x, y)) return;
        for (let yy = y - 4; yy <= y + 2; yy++) for (let xx = x - 5; xx <= x + 5; xx++) { const i = yy * W + xx; if (!WATER[world.biome[i]] && !plotIn(xx, yy, xx, yy)) { plazaSet.add(i); if (i !== t.i) pathMap.add(i); farmMap.delete(i); } }
        g.marketRect = { x0:x - 5, y0:y - 4, x1:x + 5, y1:y + 2 };
      }
      world.objs[t.i] = { key:{ altar:'altar:altar', monumento:'obelisk:monumento', templo:'temple:templo', mercado:'market:mercado' }[kk], v:0, ox:0, oy:0, vid:g.id };
      g[{ altar:'altar', monumento:'monument', templo:'temple', mercado:'market' }[kk]] = t.i; g.wood -= cost[0]; g.stone -= cost[1];
      composeRegion(x - 8, y - 12, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof');
      if (kk === 'templo') connect(g, x, y);
      if (kk === 'mercado') connect(g, x, y + 2);
      notify(kk === 'mercado' ? `En ${g.name} han abierto un mercado` : `En ${g.name} han levantado ${{ altar:'un altar', monumento:'una estatua', templo:'un templo' }[kk]} a ${g.faith.god}`, { x:x * T, y:y * T });
    }; break; }
    case 'encender': v.actT = 3; v.dir = g.fx * T + 2 < v.x ? -1 : 1; v.dirT = 1; v.onDone = () => { // frotando palos: saltan chispas y prende
      if (!raining(g.fy * W + g.fx)) { g.fireOut = false; for (let n = 0; n < 6; n++) chips.push({ x:g.fx * T + 2, y:g.fy * T, vx:(Math.random() - .5) * 20, vy:-10 - Math.random() * 12, life:0, max:.5 + Math.random() * .4, col:n % 2 ? '#ffd060' : '#ff8030' }); }
    }; break;
    case 'comerciar': v.actT = 4; v.onDone = () => {
      g.trades = (g.trades || 0) + 1;
      if (g.coin) { const n = (1 + Math.floor(Math.random() * 3)) * priceOf(g); v.money = (v.money || 0) + n; floats.push({ x:v.x, y:v.y - 12, txt:`+${n} ${coinPl(g)}`, col:'#f0d060', life:0 }); }
      else { const a = BARTER[Math.floor(Math.random() * BARTER.length)], b = BARTER.filter(o => o !== a)[Math.floor(Math.random() * (BARTER.length - 1))]; floats.push({ x:v.x, y:v.y - 12, txt:`${a} ⇄ ${b}`, col:'#e8dcc0', life:0 }); }
      if (!g.coin && g.trades >= 4) { newCoin(g); notify(`En ${g.name} dejan el trueque e inventan su propia moneda: el ${g.coin}, de ${coinTypeTxt(g)}`, { x:g.fx * T, y:g.fy * T }); }
    }; break;
    case 'antorcha': v.actT = 3; v.onDone = () => { if (g.wood >= 1 && tileFree(t.ti % W, (t.ti / W) | 0) && !torchesOf(g).some(tc => tc.i === t.ti)) { g.wood -= 1; torchesOf(g).push({ i:t.ti, lit:isNight() || dayT() > .42 }); } }; break;
    case 'alumbrar': v.actT = 1; v.onDone = () => {
      if (!raining(t.tc.i)) { t.tc.lit = true; for (let n = 0; n < 3; n++) chips.push({ x:(t.tc.i % W) * T + 2, y:((t.tc.i / W) | 0) * T - 6, vx:(Math.random() - .5) * 14, vy:-8 - Math.random() * 6, life:0, max:.4, col:'#ffd060' }); }
    }; break;
    case 'reparar': v.actT = 6; v.onDone = () => { const o = world.objs[t.i]; if (o && !o.burnt && g.wood >= 3) { g.wood -= 3; o.dmg = 0; o.dmgMsg = false; composeRegion((t.i % W) - 8, ((t.i / W) | 0) - 12, (t.i % W) + 8, ((t.i / W) | 0) + 12); floats.push({ x:v.x, y:v.y - 12, txt:'reparado', col:'#c8e0a0', life:0 }); } }; break;
    case 'derribar': v.actT = 10; v.onDone = () => { // quitan los escombros y lo vuelven a levantar en el mismo sitio (de casa, 6 de madera; lo demás, 8 y 4 de piedra, o 14 de madera)
      const o = world.objs[t.i]; if (!o || !o.burnt) return; const house = o.key.startsWith('house'), stone = !house && (g.stone || 0) >= 4, cw = house ? 6 : stone ? 8 : 14;
      if (g.wood < cw) return; g.wood -= cw; if (stone) g.stone -= 4;
      o.burnt = false; o.dmg = 0; o.dmgMsg = false; burntDirty = true; addEffect((t.i % W) * T + 2, ((t.i / W) | 0) * T + 3, 'poof'); composeRegion((t.i % W) - 8, ((t.i / W) | 0) - 14, (t.i % W) + 8, ((t.i / W) | 0) + 12);
      floats.push({ x:v.x, y:v.y - 12, txt:'¡reconstruido!', col:'#c8e0a0', life:0 });
    }; break;
    case 'apagar':
      if (t.phase === 'agua') { v.actT = 1.2; v.onDone = () => { if (t.well) t.well.q = Math.max(0, t.well.q - .04); v.bucket = true;
          const fi = fires.has(t.fire) ? t.fire : fireNear(g); if (fi == null) { v.bucket = false; return; }
          const sb = standNear(fi); if (sb) { v.task = { k:'apagar', phase:'tirar', fire:fi, x:sb[0], y:sb[1] }; v.actT = 0; } }; break; }
      v.actT = .8; v.onDone = () => { // ¡agua! apaga ese fuego y algo los de al lado
        v.bucket = false;
        for (const j of [t.fire, t.fire - 1, t.fire + 1, t.fire - W, t.fire + W]) if (fires.has(j) && (j === t.fire || Math.random() < .5)) fires.delete(j);
        for (let n = 0; n < 6; n++) chips.push({ x:(t.fire % W) * T + 2, y:((t.fire / W) | 0) * T - 2, vx:(Math.random() - .5) * 24, vy:-6 - Math.random() * 8, life:0, max:.5, col:n % 2 ? '#7ab8f0' : '#c8e4fa' });
        smoke.push({ x:(t.fire % W) * T + 2, y:((t.fire / W) | 0) * T - 4, vx:0, vy:-8, r:2, life:0, max:2.5 });
      }; break;
    case 'quema': v.actT = 2; v.onDone = () => { if (!fires.has(t.ti) && !raining(t.ti)) { fires.set(t.ti, { t:0, life:2, ctrl:true }); g.ctrlBurns = (g.ctrlBurns || 0) + 1; } }; break;
    case 'votar': case 'golpe': case 'detenido': case 'espectador': case 'mitin': case 'oficina': v.actT = Math.max(.5, t.until - yearT); v.onDone = null; if (t.k === 'mitin' && t.fx != null) { v.dir = t.fx < v.x - 1 ? -1 : t.fx > v.x + 1 ? 1 : v.dir; v.dirT = v.actT; } break; // (en el mitin, mirando al estrado)
    case 'ritual': v.actT = Math.max(.5, t.until - yearT); v.dir = t.cx < v.x - 1 ? -1 : t.cx > v.x + 1 ? 1 : v.dir; v.dirT = v.actT;
      v.onDone = () => { g.wrath = Math.max(0, (g.wrath || 0) - .35); g.devotion = (g.devotion || 0) + .06; }; break;
    case 'santuario': v.actT = 7; v.onDone = () => {
      if (g.holy) return;
      const x = t.hx, y = t.hy; if (villages.some(o => penOverlap(o, x - 6, y - 4, x + 6, y + 4)) || plotIn(x - 7, y - 5, x + 7, y + 5)) return; // se ha hecho un cercado o un cementerio ahí entretanto
      clearSite(g, x - 6, y - 4, x + 6, y + 4);
      for (let yy = y - 4; yy <= y + 4; yy++) for (let xx = x - 6; xx <= x + 6; xx++) { const i = yy * W + xx; if (!WATER[world.biome[i]] && !plotIn(xx, yy, xx, yy)) { plazaSet.add(i); holySet.set(i, g.id); pathMap.add(i); farmMap.delete(i); } }
      g.holy = { x0:x - 6, y0:y - 4, x1:x + 6, y1:y + 4, cx:x, cy:y, style:holyStyle(g) };
      g.marketRect ||= null; connect(g, x, y + 4);
      notify(`En ${g.name} han hecho una plaza sagrada para ${g.faith.god}`, { x:x * T, y:y * T });
    }; break;
    case 'ofrenda': v.actT = 4; v.onDone = () => { if ((g.gems || 0) >= 1) { g.gems -= 1; g.wrath = Math.max(0, (g.wrath || 0) - 2); floats.push({ x:v.x, y:v.y - 14, txt:'ofrenda de gemas', col:'#d88af0', life:0 }); } if (g.food >= 3) { g.food -= 3; g.wrath = Math.max(0, (g.wrath || 0) - 1.5); g.devotion = (g.devotion || 0) + .3; riteFx(g, v.x, v.y); floats.push({ x:v.x, y:v.y - 12, txt:`ofrenda a ${g.faith.god}`, col:'#f0d060', life:0 }); } }; break;
    case 'sacrificio': v.actT = 3; v.onDone = () => {
      const a = t.a; if (!a || a.dead) return;
      a.lead = null; riteFx(g, a.x, a.y, true); killAnimal(a, 'sacrificio');
      g.wrath = Math.max(0, (g.wrath || 0) - 3.5); g.devotion = (g.devotion || 0) + 1;
      notify(riteOf(g) === 'volcan' ? `En ${g.name} arrojan ${ANIMALS[a.sp].n === 'Oveja' || ANIMALS[a.sp].n === 'Vaca' ? 'una' : 'un'} ${ANIMALS[a.sp].n.toLowerCase()} al volcán como ofrenda a ${g.faith.god}` : `En ${g.name} sacrifican ${ANIMALS[a.sp].n === 'Oveja' || ANIMALS[a.sp].n === 'Vaca' ? 'una' : 'un'} ${ANIMALS[a.sp].n.toLowerCase()} a ${g.faith.god} (${RITE_TXT[riteOf(g)]}) para calmar su ira`, { x:a.x, y:a.y });
    }; break;
    case 'carro': v.actT = 7; v.onDone = () => { if (g.wood >= 10) { g.wood -= 10; g.carts = (g.carts || 0) + 1; if (g.carts === 1) notify(`En ${g.name} han construido su primer carro`, { x:g.fx * T, y:g.fy * T }); } }; break;
    case 'cantera': v.actT = 8; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if (!tileFree(x, y) || g.wood < 6) return;
      world.objs[t.i] = { key:'quarry:cantera', v:0, ox:0, oy:0, vid:g.id, flat:!!t.flat }; g.quarry = t.i; g.wood -= 6;
      composeRegion(x - 7, y - 11, x + 7, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
    }; break;
    case 'cantear': v.actT = 4; v.onDone = () => { const o = world.objs[t.i]; if (o && o.key === 'quarry:cantera') { v.carry = { k:'piedra', n:o.flat ? 4 : 6 }; g.mined = (g.mined || 0) + 1; quarryBonus(v, g); } }; break; // (a veces sale algo de mineral: minas.js)
    case 'pozo': case 'molino': v.actT = t.k === 'pozo' ? 8 : 10; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0, well = t.k === 'pozo';
      if (well ? clearable(x - 2, y - 4, x + 2, y + 1) : clearable(x - 4, y - 8, x + 4, y + 1)) well ? clearSite(g, x - 2, y - 4, x + 2, y + 1) : clearSite(g, x - 4, y - 8, x + 4, y + 1);
      if (!tileFree(x, y) || penOverlap(g, x - 4, y - 8, x + 4, y + 1) || buildingClash(x, y, t.k, t.i) || (well ? g.stone < 5 && g.wood < 8 : g.wood < 10 || g.stone < 3)) return;
      world.objs[t.i] = { key:well ? 'well:pozo' : 'mill:molino', v:0, ox:0, oy:0, vid:g.id };
      if (well) { (g.wells ||= []).push({ i:t.i, q:.5 }); if (g.stone >= 5) g.stone -= 5; else g.wood -= 8; } else { g.mill = t.i; g.wood -= 10; g.stone -= 3; } // el pozo, de piedra o, si no hay, entibado con madera
      composeRegion(x - 7, y - 11, x + 7, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
    }; break;
    case 'cementerio': v.actT = 6; v.onDone = () => {
      const r = t.rect; if (g.cemetery || holyNear(r.x0 - 1, r.y0 - 1, r.x0 + r.w, r.y0 + r.h)) return; const slots = []; // nunca dentro de la plaza sagrada
      for (let y = r.y0 + 1; y < r.y0 + r.h - 1; y += 2) for (let x = r.x0 + 1; x < r.x0 + r.w - 1; x += 2) slots.push(y * W + x);
      clearSite(g, r.x0, r.y0, r.x0 + r.w - 1, r.y0 + r.h - 1);
      g.cemetery = { ...r, slots, graves:new Map() }; connect(g, r.x0 + (r.w >> 1), r.y0 + r.h - 1);
      if (g.cemMoved) { g.cemMoved.forEach((gr, k) => { if (slots[k] != null) g.cemetery.graves.set(slots[k], gr); }); g.cemMoved = null; } // (las tumbas del cementerio trasladado)
      notify(`En ${g.name} preparan un cementerio para enterrar a los suyos`, { x:(r.x0 + r.w / 2) * T, y:(r.y0 + r.h / 2) * T });
    }; break;
    case 'arboleda': case 'bayal': v.actT = 3; v.onDone = () => {
      const r = t.rect, key = t.k === 'arboleda' ? 'grove' : 'berryPlot', step0 = 2, slots = [];
      if (g[key]) return;
      for (let y = r.y0 + 1; y < r.y0 + r.h; y += step0) for (let x = r.x0 + 1; x < r.x0 + r.w; x += step0) slots.push(y * W + x);
      g[key] = { ...r, slots };
      notify(t.k === 'arboleda' ? `En ${g.name} preparan una arboleda: plantarán árboles en filas para tener madera siempre` : `En ${g.name} preparan un bayal: plantarán arbustos de bayas junto al pueblo`, { x:(r.x0 + r.w / 2) * T, y:(r.y0 + r.h / 2) * T });
    }; break;
    case 'minar': { const o = world.objs[t.i]; if (!o) { v.task = null; return; } v.actT = hasForge(g) ? 3.5 : 5; v.onDone = () => {
      const o2 = world.objs[t.i]; if (!o2 || OBJ[o2.key][1] !== 'mineral') return;
      const tx = t.i % W, ty = (t.i / W) | 0, kind = o2.key.startsWith('ore:iron') ? 'hierro' : o2.key.startsWith('ore:gold') ? 'oro' : 'gemas';
      o2.ore = (o2.ore ?? (kind === 'hierro' ? 4 : 3)) - 1; v.carry = { k:kind, n:kind === 'hierro' ? 3 : kind === 'oro' ? 2 : 1 };
      if (o2.ore <= 0) { world.objs[t.i] = null; addEffect(tx * T + 2, ty * T + 3, 'poof'); composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); rareDirty = true; }
      const kn = g.know ||= {}; if (!kn.mineria) { kn.mineria = true; notify(`En ${g.name} aprenden a sacar ${kind === 'hierro' ? 'hierro' : kind === 'oro' ? 'oro' : 'piedras preciosas'} de las vetas de la roca`, { x:tx * T, y:ty * T }); }
    }; break; }
    case 'taberna': v.actT = 10; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if (hasTavern(g) || g.wood < 12 || g.stone < 4) return;
      if (clearable(x - 5, y - 5, x + 5, y + 1)) clearSite(g, x - 5, y - 5, x + 5, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'taberna', t.i)) return;
      world.objs[t.i] = { key:'tavern:taberna', v:0, ox:0, oy:0, vid:g.id }; g.tavern = t.i; g.wood -= 12; g.stone -= 4;
      composeRegion(x - 10, y - 14, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('build', x * T, y * T);
      notify(`En ${g.name} abren una taberna: al acabar la jornada van a beber y charlar`, { x:x * T, y:y * T });
    }; break;
    case 'escuela': v.actT = 12; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      const wooden = g.stone < 6; if (hasSchool(g) || (wooden ? g.wood < 22 : g.wood < 12)) return;
      if (clearable(x - 5, y - 9, x + 5, y + 1)) clearSite(g, x - 5, y - 9, x + 5, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'escuela', t.i)) return;
      world.objs[t.i] = { key:'school:escuela', v:0, ox:0, oy:0, vid:g.id }; g.school = t.i; if (wooden) g.wood -= 22; else { g.wood -= 12; g.stone -= 6; }
      composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
      notify(`En ${g.name} abren una escuela: los niños aprenderán lo que saben los mayores`, { x:x * T, y:y * T });
    }; break;
    case 'enseñar': v.actT = 10; v.dir = -1; v.onDone = () => { // el maestro enseña a los que están en clase
      for (const u of villagers) if (!u.dead && u.vid === g.id && u.task && u.task.k === 'clase' && Math.hypot(u.x - v.x, u.y - v.y) < 50) u.edu = Math.min(1, (u.edu || 0) + .06);
      if (Math.random() < .3) floats.push({ x:v.x, y:v.y - 12, txt:['a, b, c…', '2 + 2 = 4', 'el río va al mar', '¡atención!'][Math.floor(Math.random() * 4)], col:'#c8e0f0', life:0 });
    }; break;
    case 'clase': v.actT = 10 + Math.random() * 5; v.dir = 1; v.onDone = () => { // en clase: algo se aprende aunque no esté el maestro
      schoolLangs(v, g); // y lenguas (idiomas.js)
      v.edu = Math.min(1, (v.edu || 0) + .015); if (hasLaw(g, 'educacion') && !v.swims && Math.random() < .2) v.swims = true;
      if (!v.rod && Math.random() < .03) v.rodSkill = true;
    }; break;
    case 'fiesta': v.actT = 6 + Math.random() * 6; v.dirT = .4; v.onDone = () => { v.fun = yearT; if (Math.random() < .4) floats.push({ x:v.x, y:v.y - 12, txt:['¡Fiesta!', '♪', '¡Viva!', '♫'][Math.floor(Math.random() * 4)], col:'#f0d060', life:0 }); }; break;
    case 'catedral': v.actT = 28; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0, st = holyStyleOf(g);
      if (hasCathedral(g) || !g.faith || g.stone < 30 || g.wood < 15) return;
      if (clearable(x - 6, y - 13, x + 6, y + 1)) clearSite(g, x - 6, y - 13, x + 6, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'catedral', t.i)) return;
      world.objs[t.i] = { key:'cathedral:' + st, v:0, ox:0, oy:0, vid:g.id }; g.cathedral = t.i; g.stone -= 30; g.wood -= 15;
      g.devotion = (g.devotion || 0) + 5; g.wrath = 0; g.anger = Math.max(0, (g.anger || 0) - 15);
      composeRegion(x - 10, y - 20, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
      notify(`En ${g.name} terminan ${HOLY_TXT[st]} de ${g.faith.mono ? godTxt(g.faith) : allGods(g.faith).length > 1 ? 'sus dioses' : godTxt(g.faith)}`, { x:x * T, y:y * T });
    }; break;
    case 'explorar': v.actT = 3; v.onDone = () => { launchExpedition(v, g); }; break; // prepara la mochila (o la barca) y sale
    case 'tazas': v.actT = 6; v.onDone = () => { if (g.wood < 1) return; g.wood -= 1; g.cups = (g.cups || 0) + 4; floats.push({ x:v.x, y:v.y - 12, txt:'+4 tazas', col:'#d8b888', life:0 });
      if (!g.cupMsg) { g.cupMsg = true; notify(`En el mercado de ${g.name} empiezan a vender tazas de madera con agua`, { x:v.x, y:v.y }); } }; break;
    case 'ir_taberna': v.actT = 8 + Math.random() * 6; v.dir = Math.random() < .5 ? -1 : 1; v.onDone = () => {
      const kid = ageOf(v) < ADULT_H, d = kid ? 'zumo' : DRINKS[Math.floor(Math.random() * DRINKS.length)];
      v.water = 1; v.fun = yearT; v.hot = Math.max(0, (v.hot || 0) - .4);
      const pr = Math.min(v.money || 0, Math.max(1, Math.round(priceOf(g) * .5))); if (pr > 0) { v.money -= pr; const ec = ecOf(g); if (ec) ec.treas += pr * .3; }
      if (!kid && d !== 'agua fresca' && Math.random() < .15) v.tipsy = yearT + 8; // alguno sale achispado
      if (Math.random() < .5) floats.push({ x:v.x, y:v.y - 12, txt:Math.random() < .5 ? '¡Salud!' : d, col:'#f0c878', life:0 });
      if (Math.random() < .06) snd('cheer', v.x, v.y);
    }; break;
    case 'teatro': case 'coliseo': { const th = t.k === 'teatro'; v.actT = 14; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if ((th ? hasTheater(g) : hasColiseum(g)) || g.stone < (th ? 8 : 18) || g.wood < (th ? 15 : 10)) return;
      if (clearable(x - 6, y - 6, x + 6, y + 1)) clearSite(g, x - 6, y - 6, x + 6, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, t.k, t.i)) return;
      world.objs[t.i] = { key:th ? 'theater:teatro' : 'coliseum:coliseo', v:0, ox:0, oy:0, vid:g.id };
      if (th) { g.theater = t.i; g.stone -= 8; g.wood -= 15; } else { g.coliseum = t.i; g.stone -= 18; g.wood -= 10; }
      composeRegion(x - 10, y - 14, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
      notify(th ? `En ${g.name} abren un teatro: en su tiempo libre van a ver comedias y tragedias` : `En ${g.name} levantan un coliseo para los juegos y las luchas de exhibición`, { x:x * T, y:y * T });
    }; break; }
    case 'ver_teatro': case 'ver_coliseo': v.actT = 10 + Math.random() * 6; v.dir = Math.random() < .5 ? -1 : 1; v.onDone = () => { v.fun = yearT; v.culture = yearT; if (Math.random() < .5) floats.push({ x:v.x, y:v.y - 12, txt:t.k === 'ver_teatro' ? ['¡Bravo!', '¡Otra!', '¡Qué drama!'][Math.floor(Math.random() * 3)] : ['¡Ooooh!', '¡Vamos!', '¡Hurra!'][Math.floor(Math.random() * 3)], col:'#f8e8c0', life:0 }); if (Math.random() < .3) snd('cheer', v.x, v.y); }; break;
    case 'curar': v.actT = 5; v.onDone = () => { const pt = t.pat; if (pt && !pt.dead && pt.sick) { pt.cared = yearT + 30; pt.hp = Math.min(1, (pt.hp ?? 1) + .15); floats.push({ x:pt.x, y:pt.y - 12, txt:'atendido', col:'#a8e0c8', life:0 }); } }; break;
    case 'cuartel': case 'lonja': { const isB = t.k === 'cuartel'; v.actT = 12; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if ((isB ? hasBarracks(g) : hasLonja(g)) || g.wood < (isB ? 10 : 12) || g.stone < (isB ? 12 : 6)) return;
      if (clearable(x - 5, y - 6, x + 5, y + 1)) clearSite(g, x - 5, y - 6, x + 5, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, t.k, t.i)) return;
      world.objs[t.i] = { key:isB ? 'barracks:cuartel' : 'tradehall:lonja', v:0, ox:0, oy:0, vid:g.id };
      if (isB) { g.barracks = t.i; g.wood -= 10; g.stone -= 12; } else { g.lonja = t.i; g.wood -= 12; g.stone -= 6; }
      composeRegion(x - 9, y - 13, x + 9, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
      notify(isB ? `En ${g.name} levantan un cuartel: allí se instruyen los soldados y se construyen máquinas de asedio` : `En ${g.name} abren una lonja en el puerto: el comercio por mar será mayor y más frecuente`, { x:x * T, y:y * T });
    }; break; }
    case 'instruir': v.actT = 7; v.dir = Math.random() < .5 ? -1 : 1; v.stab = .25; v.onDone = () => { v.vet = Math.min(3, (v.vet || 0) + 1); floats.push({ x:v.x, y:v.y - 12, txt:['recluta', 'soldado', 'veterano', 'veterano'][v.vet], col:'#c8d0dc', life:0 }); }; break;
    case 'asedio': v.actT = 14; v.onDone = () => { if (g.wood < 12 || (g.iron || 0) < 2) return; g.wood -= 12; g.iron -= 2; g.siege = (g.siege || 0) + 1; if (!g.siegeMsg) { g.siegeMsg = true; notify(`En ${g.name} construyen su primera catapulta para asediar murallas`, { x:v.x, y:v.y }); } }; break;
    case 'bolsa': v.actT = 5; v.onDone = () => { v.bolsaT = yearT; tradeStocks(v, g); }; break;
    case 'vender': v.actT = 10; v.dir = 1; v.onDone = () => { snd('coin', v.x, v.y); g.trades = (g.trades || 0) + 2; const n = g.coin ? sround(wageOf(g, 6)) : 0; if (n) { v.money = (v.money || 0) + n; v.earned = (v.earned || 0) + n; } floats.push({ x:v.x, y:v.y - 12, txt:n ? `+${n} ${coinPl(g)}` : 'trueque', col:'#f0d060', life:0 }); }; break;
    case 'hospital': v.actT = 12; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if (hasHosp(g) || g.stone < 15 || g.wood < 12) return;
      if (clearable(x - 4, y - 5, x + 4, y + 1)) clearSite(g, x - 4, y - 5, x + 4, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'hospital', t.i)) return;
      world.objs[t.i] = { key:'hospital:hospital', v:0, ox:0, oy:0, vid:g.id }; g.hospital = t.i; g.stone -= 15; g.wood -= 12;
      composeRegion(x - 8, y - 12, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
      notify(`En ${g.name} abren un hospital: los heridos se curan allí y los ancianos viven algo más`, { x:x * T, y:y * T });
    }; break;
    case 'curarse': v.actT = 8; v.onDone = () => { v.hp = Math.min(1, (v.hp ?? 1) + .6); floats.push({ x:v.x, y:v.y - 12, txt:'curado', col:'#a8e0a8', life:0 }); }; break;
    case 'herreria': v.actT = 10; v.onDone = () => {
      const x = t.i % W, y = (t.i / W) | 0;
      if (hasForge(g) || (g.iron || 0) < 5 || g.wood < 10 || g.stone < 10) return;
      if (clearable(x - 3, y - 5, x + 3, y + 1)) clearSite(g, x - 3, y - 5, x + 3, y + 1);
      if (!tileFree(x, y) || buildingClash(x, y, 'herreria', t.i)) return;
      world.objs[t.i] = { key:'forge:herreria', v:0, ox:0, oy:0, vid:g.id }; g.forge = t.i; g.iron -= 5; g.wood -= 10; g.stone -= 10;
      composeRegion(x - 8, y - 12, x + 8, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
      notify(`En ${g.name} abren una herrería: ya forjan armas y herramientas de hierro (más daño, más rapidez al trabajar y mejores cosechas)`, { x:x * T, y:y * T });
    }; break;
    case 'plantar': if (t.plot) { v.actT = 2.5; v.onDone = () => {
      const pl = g[t.plot]; if (!pl || world.objs[t.i] || WATER[world.biome[t.i]]) return;
      const x = t.i % W, y = (t.i / W) | 0;
      if (t.plot === 'berryPlot') { world.objs[t.i] = { key:'bush:red', v:Math.floor(Math.random() * 4), ox:0, oy:0, harvT:yearT }; }
      else { const table = treeTable(t.i), key = g.lastTree && table.includes(g.lastTree) ? g.lastTree : fromTable(table, rollTier(Math.random, false)); if (!key) { pl.slots = pl.slots.filter(i => i !== t.i); return; } world.objs[t.i] = null; if (!placeObject(t.i, key, Math.random, yearT, .55)) { world.objs[t.i] = { key, v:Math.floor(Math.random() * 4), ox:0, oy:0 }; } g.planted = (g.planted || 0) + 1; }
      composeRegion(x - 7, y - 11, x + 7, y + 12);
    }; break; }
    v.actT = 3; v.onDone = () => {
      const table = treeTable(t.i), key = g.lastTree && table.includes(g.lastTree) ? g.lastTree : fromTable(table, rollTier(Math.random, false));
      if (key && !world.objs[t.i] && placeObject(t.i, key, Math.random, yearT, .5)) { g.planted = (g.planted || 0) + 1; const x = t.i % W, y = (t.i / W) | 0; composeRegion(x - 7, y - 11, x + 7, y + 12); }
    }; break;
    case 'cercar': v.actT = 6; v.onDone = () => { const q = t.pen; let free = true;
      for (let y = q.y0 - 1; free && y <= q.y1 + 1; y++) for (let x = q.x0 - 1; free && x <= q.x1 + 1; x++) if (underBuilding(g, x, y) || plazaSet.has(y * W + x) || holySet.has(y * W + x) || wallSet.has(y * W + x) || (world.objs[y * W + x] && y >= q.y0 && y <= q.y1 && x >= q.x0 && x <= q.x1 && !['tree', 'berry'].includes(OBJ[world.objs[y * W + x].key][1]))) free = false;
      if (free && pensOf(g).length < penLimit(g) && !penOverlap(g, q.x0, q.y0, q.x1, q.y1) && g.wood >= 8) { clearSite(g, q.x0, q.y0, q.x1, q.y1); g.pens.push(t.pen); g.pen = g.pens[0]; g.wood -= 8; connect(g, t.pen.x0 + 3, t.pen.y1);
        if (g.pens.length === 2 && !g.pen2Msg) { g.pen2Msg = true; notify(`${g.name} ya tiene tantos animales que hace un segundo cercado`, { x:(q.x0 + 4) * T, y:(q.y0 + 3) * T }); } } }; break;
    case 'capturar': { const a = t.a; if (a && !a.dead) { a.lead = null; a.x = t.x; a.y = t.y; } v.task = null; return; }
    case 'pasear': v.task = null; v.wait = 1 + Math.random() * 3; return;
  }
  const ti = t.i ?? (t.farm && t.farm.i);
  if (ti != null) { const tx2 = (ti % W) * T + 2; if (Math.abs(tx2 - v.x) > 1) { v.dir = tx2 < v.x ? -1 : 1; v.dirT = 1; } }
  v.task = { k:'trabajando', job:t.k, i:t.i };
}
// Suelta lo que tenía reservado (un trozo de campo, un animal al que llevaba)
function releaseTask(v){ const t = v.task; if (t && t.farm) t.farm.claim = false; if (t && t.a && t.a.lead === v) t.a.lead = null; }
// Parcelas de plantar: el primer hueco libre (en el bayal, o en la arboleda si allí ya han talado)
function plotSlot(g, key){
  const pl = g[key]; if (!pl) return null;
  pl.slots = pl.slots.filter(i => !plazaSet.has(i) && !pathMap.has(i) && !farmMap.has(i) && !wallSet.has(i) && !bridgeSet.has(i)); // si algo ha ocupado un hueco, ese ya no se planta
  const taken = new Set(); for (const u of villagers) if (u.task && u.task.k === 'plantar') taken.add(u.task.i);
  for (const i of pl.slots) if (!world.objs[i] && !taken.has(i) && !WATER[world.biome[i]] && !underBuilding(g, i % W, (i / W) | 0)) return i;
  return null;
}
// ¿Pisa la parcela de una arboleda o de un bayal (de cualquier pueblo)?
const holyNear = (x0, y0, x1, y1) => villages.some(o => o.holy && !(x1 < o.holy.x0 - 1 || x0 > o.holy.x1 + 1 || y1 < o.holy.y0 - 1 || y0 > o.holy.y1 + 1) || o.marketRect && !(x1 < o.marketRect.x0 - 1 || x0 > o.marketRect.x1 + 1 || y1 < o.marketRect.y0 - 1 || y0 > o.marketRect.y1 + 1));
const PLOT_KEYS = ['grove', 'berryPlot', 'cemetery', 'track', 'aero', 'pitch', 'pool', 'sportPlan', 'registry'];
const plotHit = (q, x0, y0, x1, y1) => q && !(x1 < q.x0 || x0 > q.x0 + q.w - 1 || y1 < q.y0 || y0 > q.y0 + q.h - 1);
const plotIn = (x0, y0, x1, y1) => { for (const o of villages) { for (const k of PLOT_KEYS) if (plotHit(o[k], x0, y0, x1, y1)) return true; if (o.camps) for (const k in o.camps) if (plotHit(o.camps[k], x0, y0, x1, y1)) return true; } return false; }; // (sin crear listas: se llama mucho al buscar sitio)
// ---- Asedio: catapultas que acompañan al ejército y derriban murallas y edificios ----
let sieges = [], stones = [];
const hasBarracks = g => g && g.barracks != null && !!world.objs[g.barracks];
const hasLonja = g => g && g.lonja != null && !!world.objs[g.lonja];
const wallsNear = (g, R) => { for (const i of wallSet) if (Math.hypot((i % W) - g.fx, ((i / W) | 0) - g.fy) < R) return true; return false; };
function launchSiege(att, def){
  if (!(att.siege > 0) || !(wallsNear(def, 50) || (typeof fortOf === 'function' && fortOf(def)))) return false; // contra murallas o contra un castillo
  att.siege--;
  const dd = Math.hypot(att.fx - def.fx, att.fy - def.fy) || 1, k = Math.min(dd - 1, 11);
  sieges.push({ att:att.id, def:def.id, x:att.fx * T + 2, y:att.fy * T + 8, tx:(def.fx + (att.fx - def.fx) / dd * k) * T + 2, ty:(def.fy + (att.fy - def.fy) / dd * k) * T + 3, hp:1, cool:3, walk:0, dir:def.fx < att.fx ? -1 : 1, fire:0 });
  notify(`Los de ${att.name} arrastran una catapulta hacia ${def.name}`, { x:att.fx * T, y:att.fy * T });
  return true;
}
function updateSieges(dt){
  for (const S of sieges) {
    const a = villageById(S.att), d = villageById(S.def), r = a && d && rels.get(relKey(a, d));
    if (S.hp <= 0) { S.dead = true; addEffect(S.x, S.y, 'poof'); if (d) notify(`Los de ${d.name} destruyen una catapulta de ${a ? a.name : 'sus enemigos'}`, { x:S.x, y:S.y }); continue; }
    // Sin soldados que la protejan, se queda sola: al rato los defensores se la llevan (y la guardan para defenderse)
    if (!villagers.some(u => !u.dead && u.vid === S.att && u.task && u.task.k === 'asalto' && Math.hypot(u.x - S.x, u.y - S.y) < 40 * T)) {
      if ((S.alone = (S.alone || 0) + dt) > 20) { S.dead = true; if (d) { d.siege = (d.siege || 0) + 1; notify(`Los de ${d.name} capturan una catapulta abandonada de ${a ? a.name : 'sus enemigos'} y la guardan para defenderse`, { x:S.x, y:S.y }); } continue; }
    } else S.alone = 0;
    if (!a || !d || !r || !r.war) { S.dead = true; continue; }
    for (const u of villagers) if (!u.dead && u.vid === d.id && u.weapon && Math.hypot(u.x - S.x, u.y - S.y) < (isRanged(u.weapon) ? 32 : 8)) S.hp -= dt * (isRanged(u.weapon) ? .015 : .05); // los defensores la atacan
    // Camino por tierra (como los soldados): hasta cerca del pueblo; si está amurallado, hasta donde se pueda llegar
    if (!S.route && !S.noRoute) {
      const ad = Math.hypot(a.fx - d.fx, a.fy - d.fy) || 1;
      for (const k of [11, 18, 26, 34]) { const gx = Math.round(d.fx + (a.fx - d.fx) / ad * Math.min(k, ad - 1)), gy = Math.round(d.fy + (a.fy - d.fy) / ad * Math.min(k, ad - 1)); S.route = routeTo({ x:S.x, y:S.y, swims:false, task:{ k:'asalto' } }, gy * W + gx); if (S.route) break; }
      if (!S.route) S.noRoute = true;
    }
    if (S.route && S.route.length) {
      const [tx, ty] = S.route[0], dd = Math.hypot(tx - S.x, ty - S.y);
      if (dd < 2) S.route.shift(); else { S.x += (tx - S.x) / dd * Math.min(dd, 5 * dt); S.y += (ty - S.y) / dd * Math.min(dd, 5 * dt); S.walk += dt; S.dir = tx < S.x ? -1 : 1; }
      if (Math.hypot(d.fx * T - S.x, d.fy * T - S.y) > 18 * T && !wallsNear({ fx:S.x / T, fy:S.y / T }, 16)) continue; // aún lejos para disparar
    }
    S.fire = Math.max(0, S.fire - dt);
    if ((S.cool -= dt) > 0) continue;
    S.cool = 3.5;
    // Blanco: la muralla más cercana a su alcance; si no queda, un edificio del pueblo
    let best = null, bd = 18 * T;
    const fo = typeof fortOf === 'function' && fortOf(d); // ¿tienen castillo? Las catapultas van a por él (castillos.js)
    if (fo) { const px = (fo.i % W) * T + 2, py = ((fo.i / W) | 0) * T - 14, q = Math.hypot(px - S.x, py - S.y); if (q < 22 * T) { best = { bld:fo.i, x:px, y:py }; bd = q; } }
    if (!best) for (const i of wallSet) { const px = (i % W) * T + 2, py = ((i / W) | 0) * T + 2, q = Math.hypot(px - S.x, py - S.y); if (q < bd) { bd = q; best = { wall:i, x:px, y:py }; } }
    if (!best) for (const b of buildingsOf(d)) { if (!world.objs[b]) continue; const px = (b % W) * T + 2, py = ((b / W) | 0) * T - 4, q = Math.hypot(px - S.x, py - S.y); if (q < bd) { bd = q; best = { bld:b, x:px, y:py }; } }
    if (!best) continue;
    S.fire = .4; S.dir = best.x < S.x ? -1 : 1;
    stones.push({ x0:S.x, y0:S.y - 8, x1:best.x, y1:best.y, t:0, dur:1 + bd / 200, tgt:best });
  }
  if (sieges.some(S => S.dead)) sieges = sieges.filter(S => !S.dead);
  for (const st of stones) {
    st.t += dt; if (st.t < st.dur || st.done) continue; st.done = true;
    for (let n = 0; n < 6; n++) chips.push({ x:st.x1, y:st.y1, vx:(Math.random() - .5) * 30, vy:-8 - Math.random() * 12, life:0, max:.5, col:n % 2 ? '#8a867e' : '#c8c4ba' });
    if (st.tgt.wall != null && wallSet.has(st.tgt.wall)) { wallSet.delete(st.tgt.wall); wallStone.delete(st.tgt.wall); if (Math.random() < .5) for (const n of nb4i(st.tgt.wall)) if (wallSet.has(n) && Math.random() < .5) { wallSet.delete(n); wallStone.delete(n); } }
    else if (st.tgt.bld != null && world.objs[st.tgt.bld]) damageBuilding(st.tgt.bld, .3);
  }
  if (stones.length) stones = stones.filter(st => !st.done || st.t < st.dur + .1);
}
function drawSieges(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const S of sieges) {
    if (S.x < x0 - 20 || S.x > x1 + 20 || S.y < y0 - 20 || S.y > y1 + 20) continue;
    const x = Math.round(S.x), y = Math.round(S.y), d = S.dir;
    const fi = S.fire > 0 ? 4 + Math.min(3, Math.floor((.4 - S.fire) / .4 * 4)) : S.cool < 1 ? 3 : S.cool < 2 ? 2 : S.cool < 3 ? 1 : 0, fr = artFrame(`catapult:${fi}`);
    if (fr) { // el dibujo: carga la piedra, tensa y dispara (mira a la izquierda; si dispara a la derecha, se voltea)
      vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 8, y + 1, 17, 2);
      vctx.save(); vctx.translate(x, y + 2); if (d > 0) vctx.scale(-1, 1); vctx.drawImage(fr, -(fr.width >> 1), -fr.height); vctx.restore();
      if (S.hp < 1) { vctx.fillStyle = '#3a3028'; vctx.fillRect(x - 6, y - fr.height - 2, 12, 2); vctx.fillStyle = '#d8483a'; vctx.fillRect(x - 6, y - fr.height - 2, Math.round(12 * S.hp), 2); }
      continue;
    }
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 6, y + 1, 13, 2);
    vctx.fillStyle = '#6a4426'; vctx.fillRect(x - 6, y - 3, 13, 2); vctx.fillRect(x - 5, y - 6, 1, 4); vctx.fillRect(x + 5, y - 6, 1, 4); vctx.fillRect(x - 5, y - 7, 11, 1); // bastidor
    vctx.fillStyle = '#2a1a10'; for (const wx of [x - 5, x + 4]) { vctx.fillRect(wx, y - 1, 3, 3); } // ruedas
    const up = S.fire > 0, ax = x + (up ? d * 2 : -d * 5), ay = up ? y - 15 : y - 8; // el brazo: tenso atrás o lanzando
    vctx.fillStyle = '#8a5a30'; for (let k = 0; k <= 8; k++) { const t2 = k / 8; vctx.fillRect(Math.round(x + (ax - x) * t2), Math.round(y - 6 + (ay - y + 6) * t2), 1, 1); }
    vctx.fillStyle = '#5a5650'; vctx.fillRect(ax - 1, ay - 1, 2, 2);
    if (S.hp < 1) { vctx.fillStyle = '#3a3028'; vctx.fillRect(x - 6, y - 11, 12, 2); vctx.fillStyle = '#d8483a'; vctx.fillRect(x - 6, y - 11, Math.round(12 * S.hp), 2); }
  }
  for (const st of stones) {
    if (st.done) continue; const k = Math.min(1, st.t / st.dur), x = st.x0 + (st.x1 - st.x0) * k, y = st.y0 + (st.y1 - st.y0) * k - Math.sin(k * Math.PI) * 40;
    vctx.fillStyle = '#4a4844'; vctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); vctx.fillStyle = '#8a867e'; vctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1);
  }
}
// Formación al avanzar: k (1..n) detrás del que va en cabeza; devuelve [cuántos pasos atrás, cuántos al lado]
// El sitio de cada soldado en la formación ([filas hacia atrás, de lado], en pasos): columna, línea, cuña o en bloque
// (la masa: filas anchas, como un ejército de verdad; con n, cuántos son)
function formSlot(form, k, n = 12){
  if (form === 'bloque' || form === 'columna') { const w = form === 'columna' ? 3 : Math.max(3, Math.ceil(Math.sqrt(n) * 1.5)), row = Math.floor(k / w), col = k % w - (w - 1) / 2; return [row + .6, col]; }
  const h = Math.ceil(k / 2), side = k % 2 ? -1 : 1;
  return form === 'línea' ? [.4, side * h] : [h, side * h * .9]; // cuña
}
