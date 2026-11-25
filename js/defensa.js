// World Sim · Defensa: murallas antes y más deprisa, puertas que se cierran, y la ley de fortificación
// ================= Defensa =================
// · Las murallas se empiezan antes (con 8 habitantes, aunque aún no haya ayuntamiento) y con más gente
// · Tras un ataque, el pueblo se vuelca en ellas (más constructores, más prisa) durante unos días, y donde hay
//   partidos el gobierno aprueba la ley de «fortificación»; las dictaduras ya la llevan
// · Con la ley, cada tramo levanta el doble de muralla y cuesta la mitad
// · Las puertas se cierran de noche, con la alarma o en guerra (y con fronteras cerradas); cada lado de la muralla tiene
//   una puerta en el centro aunque no pase camino, para que nadie quede encerrado sin salida a sus campos
const fortified = g => hasLaw(g, 'fortificacion');
const underThreat = g => yearT - (g.attackedT ?? -1e9) < DAY_LEN * 3 || !!(g.alarm && g.alarm.until > yearT) || (g.danger || 0) > 0;
// Cuántos se ponen a la muralla y con qué ganas (se llama desde chooseJob)
function wallJob(g, pop, needHouse, atWar){
  if (pop < 8 || wallLeft(g) <= 0 || !(g.wood >= (needHouse && !underThreat(g) ? 8 : 2) || g.stone >= 10)) return 0;
  const threat = underThreat(g) || atWar, cap = threat ? 4 : fortified(g) ? 3 : 2;
  if (busyWith(g, 'muralla') >= cap) return 0;
  return threat ? 14 : fortified(g) ? 9 : g.hall != null ? 5 : 3;
}
// El pueblo ha crecido más allá de su muralla (casas fuera o encima de la línea): se derriba (devuelve algo de madera)
// y se planea una nueva alrededor de todo, para que no queden tramos sueltos cruzando el pueblo
function wallGrow(g){
  if (!g.wallRect || !popOf(g)) return;
  if (g.wallRing === 2 && !g.wallPlan1) g.wallPlan1 = []; // (partidas de antes: no se guardaba cuál era la de dentro)
  // Piezas sueltas de planes viejos (o de pueblos que ya no están) que no forman parte de ninguna muralla: fuera
  const ring = new Set(villages.filter(o => popOf(o)).flatMap(o => [...(o.wallPlan || []), ...(o.wallPlan1 || [])]));
  for (const i of [...wallSet, ...gateSet]) if (!ring.has(i)) { wallSet.delete(i); wallStone.delete(i); gateSet.delete(i); gateOwner.delete(i); }
  for (const i of [...gateSet]) if (gateOwner.get(i) === g.id && !wallGates(g).has(i)) { gateSet.delete(i); gateOwner.delete(i); wallSet.add(i); } // (partidas de antes: una puerta en cada camino) → muro
  // ¿El pueblo se ha salido de la muralla, o la muralla es mucho más grande de lo que hace falta?
  const R = g.wallRect, m = g.wallRing === 2 ? 8 : 3; let x0 = g.fx - 4, y0 = g.fy - 3, x1 = g.fx + 4, y1 = g.fy + 4;
  for (const h of coreBuildings(g)) { const x = h % W, y = (h / W) | 0; x0 = Math.min(x0, x - 5); x1 = Math.max(x1, x + 5); y0 = Math.min(y0, y - 7); y1 = Math.max(y1, y + 2); }
  const out = x0 < R.x0 || x1 > R.x1 || y0 < R.y0 || y1 > R.y1, big = (R.x1 - R.x0) * (R.y1 - R.y0) > 2 * (x1 - x0 + 2 * m + 4) * (y1 - y0 + 2 * m + 4);
  if (!out && !big) return;
  // Se derriba (las dos, si hay doble) y se vuelve a empezar por la de dentro, a la medida del pueblo
  let n = 0;
  for (const i of [...(g.wallPlan || []), ...(g.wallPlan1 || [])]) { if (wallSet.has(i)) { wallSet.delete(i); wallStone.delete(i); n++; } if (gateOwner.get(i) === g.id) { gateSet.delete(i); gateOwner.delete(i); } }
  g.wallRing = 1; g.wallPlan1 = null; g.wallPlan = null; g.wallMsg = g.wall2Msg = false; wallPlan(g); g.wood += Math.round(n * .3);
  if (n > 6) notify(out ? `${g.name} ha crecido más allá de su muralla: la derriban y empiezan otra más grande` : `En ${g.name} rehacen la muralla, más ceñida al pueblo`, { x:g.fx * T, y:g.fy * T });
}
// Lo que levanta cada tramo y lo que cuesta
const wallStretch = g => Math.round((fortified(g) ? 20 : underThreat(g) ? 14 : 10) * Math.max(1, wallPlan(g).length / 220)); // las murallas de las ciudades grandes, con más cuadrillas (cada tramo se paga igual)
const wallCost = g => fortified(g) ? .5 : 1;
// Tras un ataque (desde misfortune): prisa por amurallarse y, donde se vota, ley de fortificación
function onAttacked(g){
  const first = yearT - (g.attackedT ?? -1e9) > DAY_LEN * 3; g.attackedT = yearT;
  if (!first || !popOf(g)) return;
  const at = { x:g.fx * T, y:g.fy * T };
  if (wallLeft(g) > 0) notify(`Tras el ataque, en ${g.name} todos se ponen a levantar la muralla`, at);
  const n = nationOf(g), P = n.parties && n.ruling != null ? n.parties[n.ruling] : null;
  if (P && !P.laws.includes('fortificacion') && Math.random() < .6) {
    P.laws.push('fortificacion'); if (P.laws.length > 6) P.laws.splice(0, 1);
    const txt = `Tras el ataque a ${g.name}, ${artP(P)} ${P.name} aprueba la ley de «${LAW_TXT.fortificacion}»: murallas más rápidas y baratas`; lawLog(n, txt); notify(txt, at);
  }
}
// ¿Está cerrada la puerta de este pueblo?
const gateShut = g => !!g && (hasLaw(g, 'fronteras_cerradas') || isNight() || !!(g.alarm && g.alarm.until > yearT) || [...rels.values()].some(r => r.war && [r.war.att, r.war.def].includes(nationOf(g).id)));
// ¿Va una puerta en esta casilla de la muralla? (una por lado: ver wallGates)
function midGate(g, i){ return wallGates(g).has(i); }
// ---- Puertas con lógica: una por lado, donde pasa el camino principal (o en el centro si no pasa ninguno) ----
function wallGates(g){
  const R = g.wallRect; if (!R) return new Set();
  if (g.gateTiles && g.gateKey === `${R.x0},${R.y0},${R.x1},${R.y1}`) return g.gateTiles;
  const out = new Set(), mx = Math.round((R.x0 + R.x1) / 2), my = Math.round((R.y0 + R.y1) / 2);
  const sides = [[...Array(R.x1 - R.x0 - 1)].map((_, k) => [R.x0 + 1 + k, R.y0]), [...Array(R.x1 - R.x0 - 1)].map((_, k) => [R.x0 + 1 + k, R.y1]),
    [...Array(R.y1 - R.y0 - 1)].map((_, k) => [R.x0, R.y0 + 1 + k]), [...Array(R.y1 - R.y0 - 1)].map((_, k) => [R.x1, R.y0 + 1 + k])];
  for (const S of sides) {
    const land = S.filter(([x, y]) => !WATER[world.biome[y * W + x]]); if (!land.length) continue;
    const d = ([x, y]) => Math.abs(x - mx) + Math.abs(y - my), paths = land.filter(([x, y]) => pathMap.has(y * W + x));
    const [x, y] = (paths.length ? paths : land).sort((a, b) => d(a) - d(b))[0]; out.add(y * W + x);
  }
  g.gateTiles = out; g.gateKey = `${R.x0},${R.y0},${R.x1},${R.y1}`; return out;
}
// ---- Murallas grandes: almenas, adarve, torres en las esquinas y una puerta fortificada con dos torreones ----
function wallTower(px, py, stone){ // torre de esquina (o torreón de la puerta), más alta que el muro
  if (stone) {
    vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(px - 2, py + T, T + 5, 2);
    vctx.fillStyle = '#7a766e'; vctx.fillRect(px - 2, py - 11, T + 4, T + 11);
    vctx.fillStyle = '#9a968c'; vctx.fillRect(px - 2, py - 11, T + 4, 2); vctx.fillStyle = '#5e5a54'; vctx.fillRect(px + T + 1, py - 9, 1, T + 9);
    vctx.fillStyle = '#7a766e'; for (let k = -2; k < T + 2; k += 2) vctx.fillRect(px + k, py - 13, 1, 2); // almenas
    vctx.fillStyle = '#2a2622'; vctx.fillRect(px + 1, py - 6, 1, 2); vctx.fillRect(px + T - 2, py - 6, 1, 2); // aspilleras
    vctx.fillStyle = '#6a6660'; for (let r = py - 8; r < py + T; r += 3) vctx.fillRect(px - 2, r, T + 4, 1);
  } else {
    vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(px - 2, py + T, T + 5, 2);
    vctx.fillStyle = '#5a3a20'; vctx.fillRect(px - 2, py - 10, 1, T + 10); vctx.fillRect(px + T + 1, py - 10, 1, T + 10); // los postes
    vctx.fillStyle = '#9a6a3e'; vctx.fillRect(px - 2, py - 11, T + 4, 4); vctx.fillStyle = '#7a5030'; vctx.fillRect(px - 2, py - 8, T + 4, 1); // la plataforma
    vctx.fillStyle = '#6a4428'; vctx.beginPath(); vctx.moveTo(px - 3, py - 11); vctx.lineTo(px + T / 2, py - 16); vctx.lineTo(px + T + 3, py - 11); vctx.fill(); // el tejadillo
  }
}
// Un tramo de muralla (o la torre de una esquina). Se pinta dentro de la capa de objetos (composeRegion), fila a fila
// con casas y árboles: lo que está delante tapa la muralla y la muralla tapa lo que queda detrás
function paintWallTile(i){
  const on = j => wallSet.has(j) || gateSet.has(j), px = (i % W) * T, py = ((i / W) | 0) * T;
  const L = on(i - 1), Rt = on(i + 1), U = on(i - W), D = on(i + W), stn = wallStone.has(i);
  if (gateSet.has(i - 1) || gateSet.has(i + 1)) return; // ahí va el torreón de la puerta
  if ((L || Rt) && (U || D)) { wallTower(px, py, stn); return; } // esquina: torre
  const Hh = stn ? 8 : 7;
  if ((U || D) && !L && !Rt) { // tramo de arriba abajo: se ve el adarve desde arriba y un costado
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px + T, py - 2, 2, T + 2);
    if (stn) { vctx.fillStyle = '#8a867e'; vctx.fillRect(px, py - (U ? 0 : Hh), T, T + (U ? 0 : Hh)); vctx.fillStyle = '#a8a49c'; vctx.fillRect(px + 1, py - (U ? 0 : Hh), T - 2, T + (U ? 0 : Hh) - 1); vctx.fillStyle = '#6a6660'; vctx.fillRect(px, py + (i % 2 ? 1 : 3), T, 1); vctx.fillStyle = '#8a867e'; vctx.fillRect(px, py + 1, 1, 2); vctx.fillRect(px + T - 1, py + 3, 1, 2); }
    else { for (let k = 0; k < T; k++) { vctx.fillStyle = k % 2 ? '#7a5030' : '#9a6a3e'; vctx.fillRect(px + k, py - (U ? 0 : Hh), 1, T + (U ? 0 : Hh)); } vctx.fillStyle = '#5a3a20'; vctx.fillRect(px + 1, py, 3, T); vctx.fillStyle = '#4a3018'; vctx.fillRect(px, py + 2, T, 1); }
    return;
  }
  // Tramo de lado a lado: el frente del muro, alto, con almenas arriba
  vctx.fillStyle = 'rgba(0,0,0,.28)'; vctx.fillRect(px, py + T, T, 2);
  if (stn) {
    vctx.fillStyle = '#8a867e'; vctx.fillRect(px, py - Hh + 2, T, Hh + T - 2);
    vctx.fillStyle = '#a8a49c'; vctx.fillRect(px, py - Hh + 2, T, 2); // el adarve
    vctx.fillStyle = '#8a867e'; for (let k = (i % 2); k < T; k += 2) vctx.fillRect(px + k, py - Hh, 1, 2); // almenas
    vctx.fillStyle = '#6a6660'; for (let r = py - Hh + 5; r < py + T; r += 3) vctx.fillRect(px, r, T, 1); vctx.fillRect(px + ((i % 3) + 1), py - Hh + 5, 1, 3); vctx.fillRect(px + ((i % 3) + 2) % T, py - Hh + 8, 1, 3);
  } else {
    for (let k = 0; k < T; k++) { vctx.fillStyle = k % 2 ? '#7a5030' : '#9a6a3e'; vctx.fillRect(px + k, py - Hh + 1, 1, Hh + T - 1); vctx.fillStyle = '#4a3018'; vctx.fillRect(px + k, py - Hh + (k % 2), 1, 1); } // estacas afiladas
    vctx.fillStyle = '#5a3a20'; vctx.fillRect(px, py - 2, T, 1); vctx.fillRect(px, py + 2, T, 1); // travesaños
  }
}
// La capa de objetos se rehace donde la muralla ha cambiado (tramos nuevos, derribados, puertas)
let wallShadow = new Set(), wallSyncT = 0;
function syncWallLayer(){
  const now = performance.now(), size = wallSet.size + gateSet.size * 1e5;
  if (size === wallShadow.sig && now - wallSyncT < 2000) return;
  wallSyncT = now;
  const cur = new Set([...wallSet, ...gateSet].map(i => gateSet.has(i) ? -i - 1 : i)), changed = [];
  for (const i of cur) if (!wallShadow.has(i)) changed.push(i < 0 ? -i - 1 : i);
  for (const i of wallShadow) if (!cur.has(i)) changed.push(i < 0 ? -i - 1 : i);
  wallShadow = cur; wallShadow.sig = size;
  if (changed.length > 400) { composeRegion(0, 0, W - 1, H - 1); return; }
  for (const i of changed) composeRegion((i % W) - 2, ((i / W) | 0) - 5, (i % W) + 2, ((i / W) | 0) + 2);
}
function paintGateTile(i){ // la puerta: dos torreones y el arco, con las hojas cerradas (noche, alarma o guerra) o abiertas
  const px = (i % W) * T, py = ((i / W) | 0) * T;
  const go = villageById(gateOwner.get(i)), shut = gateShut(go), stn = [i - 1, i + 1, i - W, i + W].some(j => wallStone.has(j));
  wallTower(px - T, py, stn); wallTower(px + T, py, stn);
  vctx.fillStyle = stn ? '#7a766e' : '#6a4428'; vctx.fillRect(px - 1, py - 9, T + 2, 4); // el dintel
  vctx.fillStyle = stn ? '#9a968c' : '#9a6a3e'; vctx.fillRect(px - 1, py - 9, T + 2, 1);
  if (shut) { vctx.fillStyle = '#6a4426'; vctx.fillRect(px, py - 5, T, T + 5); vctx.fillStyle = '#3a2614'; vctx.fillRect(px + (T >> 1), py - 5, 1, T + 5); vctx.fillStyle = '#9aa0a8'; vctx.fillRect(px + 1, py - 1, T - 2, 1); }
  else { vctx.fillStyle = 'rgba(20,14,10,.55)'; vctx.fillRect(px, py - 5, T, 3); }
}
// Las puertas que se abren o se cierran: se repinta su trozo de la capa de objetos
let gateShutWas = new Map();
function drawWalls(){
  if (!wallSet.size && !gateSet.size) return;
  syncWallLayer();
  for (const i of gateSet) { const s = gateShut(villageById(gateOwner.get(i))); if (gateShutWas.get(i) !== s) { gateShutWas.set(i, s); composeRegion((i % W) - 2, ((i / W) | 0) - 5, (i % W) + 2, ((i / W) | 0) + 2); } }
}
// La bandera encima de cada puerta (ondea: va por encima de la capa de objetos)
function drawGateFlags(){
  if (!gateSet.size) return;
  const [x0, y0, x1, y1] = visibleRect(), now = performance.now();
  for (const i of gateSet) {
    const px = (i % W) * T, py = ((i / W) | 0) * T; if (px + T + 8 < x0 || px - 8 > x1 || py + T < y0 - 18 || py > y1) continue;
    const go = villageById(gateOwner.get(i)), go2 = go && nationOf(go); if (go2 && go2.flag) drawFlag(go2.flag, px + 1, py - 17, 5, 3, 1, now);
  }
}
