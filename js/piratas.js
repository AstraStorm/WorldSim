// World Sim · Piratas, armadas y guerra en el mar
// ================= Piratas y armadas =================
// · Cuando hay barcos por el mar (comercio, colonos, expediciones), aparecen barcos piratas en alta mar (como mucho
//   tres): galeones oscuros con bandera negra. Persiguen barcas que puedan alcanzar por mar abierto (si se atascan
//   contra la costa, la dejan), les roban la carga y a veces matan a uno de dentro; de vez en cuando saquean la costa
// · Las naciones con muelle y cuartel que sufren a los piratas mandan su armada a por ellos
// · Guerra en el mar: dos naciones en guerra con muelle y cuartel sacan sus buques de guerra; buscan los del enemigo y,
//   si no hay, cañonean el puerto enemigo (edificios de la orilla y quien esté cerca)
// · Los combates se ven: cañonazos con fogonazo y humo, la bala volando, astillas o salpicón, y el barco que pierde se
//   escora y se hunde dejando burbujas y restos. Las armadas vuelven a su puerto al acabar
const PIRATE_NAMES = ['La Calavera', 'El Tiburón Negro', 'La Sirena Roja', 'El Cuervo del Mar', 'La Viuda Negra', 'El Kraken', 'La Gaviota Sangrienta', 'El Diente de Ballena'];
const pirates = () => world.pirates ||= [], navies = () => world.navies ||= [];
const seaTile = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx >= 0 && ty >= 0 && tx < W && ty < H && openWater(ty * W + tx); };
const SHIP_RANGE = 60, SINK_T = 3.5;
let cannonballs = [], pirateClock = 0;
// Avanza por el agua hacia un punto; si delante hay tierra, prueba a girar. Devuelve si ha podido moverse
function sail(o, tx, ty, sp, dt){
  const a0 = Math.atan2(ty - o.y, tx - o.x);
  for (const da of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
    const a = a0 + da, nx = o.x + Math.cos(a) * sp * dt, ny = o.y + Math.sin(a) * sp * dt;
    if (seaTile(nx, ny)) { o.x = nx; o.y = ny; if (Math.abs(Math.cos(a)) > .2) o.dir = Math.cos(a) < 0 ? -1 : 1; return true; }
  }
  return false;
}
// Navegar de verdad: si hay tierra por medio, sigue una ruta por el agua (se recalcula si el blanco se mueve mucho).
// Devuelve false si no hay forma de llegar por mar
const seaLine = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / T); for (let k = 1; k <= n; k++) if (!seaTile(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)) return false; return true; };
function navigate(o, tx, ty, sp, dt){
  if (seaLine(o.x, o.y, tx, ty)) { o.route = null; return sail(o, tx, ty, sp, dt); }
  if (!o.route || Math.hypot(o.routeTo[0] - tx, o.routeTo[1] - ty) > 50 || (o.routeT -= dt) <= 0) {
    o.routeT = 8; o.routeTo = [tx, ty]; o.route = seaRoute(seaFrom(o.x, o.y), seaFrom(tx, ty));
    if (!o.route) return false;
  }
  // Hacia el punto más lejano de la ruta que se ve en línea recta por el agua (así no va en zigzag de casilla en casilla)
  let k = 0; for (let j = Math.min(o.route.length - 1, 14); j > 0; j--) if (seaLine(o.x, o.y, o.route[j][0], o.route[j][1])) { k = j; break; }
  if (k) o.route.splice(0, k);
  if (o.route.length > 1 && Math.hypot(o.route[0][0] - o.x, o.route[0][1] - o.y) < 2) o.route.shift();
  const wp = o.route[0] || [tx, ty];
  return sail(o, wp[0], wp[1], sp, dt);
}
// Ruta por mar abierto de casilla en casilla (en diagonal solo si no corta una esquina de tierra)
// (rendimiento) qué casillas son mar abierto y a qué masa de agua pertenece cada una se apunta en tablas que se rehacen cada
// 15 s (por el hielo, la sequía y los puentes; ~30 ms). Con eso, un destino en otro mar (un lago, un mar cerrado por el hielo)
// se descarta al momento, y la búsqueda ya no pregunta casilla a casilla: antes, en un océano grande pasaba de las 150 000
// casillas, tardaba ~60 ms y volvía sin ruta aunque la hubiera
let seaOpen = null, seaComp = null, seaCompW = null, seaCompT = -1e9, srP = null, srS = null, srQ = null, srGen = 0;
function seaCompOf(i){
  if (!seaComp || seaComp.length !== N || seaCompW !== world || performance.now() - seaCompT > 15000) {
    seaCompW = world; seaCompT = performance.now(); const ok = seaOpen = new Uint8Array(N), C = seaComp = new Int32Array(N), q = new Int32Array(N), bi = world.biome, dry = world.dry, ice = world.ice;
    for (let k = 0; k < N; k++) ok[k] = WATER[bi[k]] && !(dry && dry[k] > .6) && !(ice && ice[k] > .5) ? 1 : 0;
    for (const k of bridgeSet) ok[k] = 0;
    let id = 0;
    for (let s = 0; s < N; s++) { if (C[s] || !ok[s]) continue; C[s] = ++id; let n = 0; q[n++] = s;
      while (n) { const i = q[--n], x = i % W, row = i - x;
        for (let dy = -W; dy <= W; dy += W) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, j = i + dy + dx; if (nx < 0 || nx >= W || j < 0 || j >= N || C[j] || !ok[j]) continue;
          if (dx && dy && !(ok[row + nx] && ok[i + dy])) continue; C[j] = id; q[n++] = j; } } }
  }
  return seaComp[i];
}
function seaRoute(a, b){
  if (a === b) return [];
  const ca = seaCompOf(a), cb = seaComp[b]; if (ca && cb && ca !== cb) return null;
  if (!srP || srP.length !== N) { srP = new Int32Array(N); srS = new Uint32Array(N); srQ = new Int32Array(N); srGen = 0; }
  const ok = seaOpen, gen = ++srGen; let h = 0, n = 0, found = false; srQ[n++] = a; srS[a] = gen; srP[a] = a;
  while (h < n) {
    const i = srQ[h++]; if (i === b) { found = true; break; }
    const x = i % W, row = i - x;
    for (let dy = -W; dy <= W; dy += W) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, j = i + dy + dx; if (nx < 0 || nx >= W || j < 0 || j >= N || srS[j] === gen || !ok[j]) continue;
      if (dx && dy && !(ok[row + nx] && ok[i + dy])) continue; // sin cortar esquinas
      srS[j] = gen; srP[j] = i; srQ[n++] = j;
    }
  }
  if (!found) return null;
  const path = []; for (let i = b; i !== a; i = srP[i]) path.push([(i % W) * T + T / 2, ((i / W) | 0) * T + T / 2]);
  return path.reverse();
}
// La casilla de mar abierto más cercana (para salir de un muelle en un río o pegado a la orilla)
function seaFrom(x, y){
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const nx = tx + dx, ny = ty + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && openWater(ny * W + nx)) return ny * W + nx; }
  return ty * W + tx;
}
// ¿Avanza de verdad hacia su objetivo? Si en unos segundos no se ha acercado, está atascado (costa por medio)
function stuckOn(o, d, dt){
  if (o.bestD == null || d < o.bestD - 4) { o.bestD = d; o.stuckT = 0; return false; }
  return (o.stuckT = (o.stuckT || 0) + dt) > 6;
}
function seaSpawnFar(){
  for (let k = 0; k < 200; k++) { const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * H), i = y * W + x;
    if (!openWater(i) || world.biome[i] > B.SHALLOW) continue; if (villages.some(g => popOf(g) && Math.hypot(g.fx - x, g.fy - y) < 30)) continue; return [x * T + 2, y * T + 2]; }
  return null;
}
const portXY = g => [(g.port.launch % W) * T + 2, ((g.port.launch / W) | 0) * T + 3];
const sailorsOf = g => villagers.filter(u => !u.dead && !u.away && u.vid === g.id && u.weapon && ageOf(u) >= ADULT_H);
// Un buque de guerra de una nación: contra los piratas o contra otra nación
function launchNavy(g, kind, foe){
  const L = seaFrom(...portXY(g)), sx = (L % W) * T + 2, sy = ((L / W) | 0) * T + 3, n = sailorsOf(g).length, steam = knowsSci(g, 'vapor') && (g.coal || 0) >= 8, hp = 3 + Math.min(4, Math.floor(n / 2)) + (knowsSci(g, 'polvora') ? 1 : 0) + (steam ? 2 : 0);
  if (steam) g.coal -= 8; // el acorazado de vapor: más rápido y más duro, pero quema carbón
  const ship = { nation:g.id, kind, foe:foe ? foe.id : null, x:sx, y:sy, dir:1, hp, max:hp, home:[sx, sy], t:0, cd:Math.random() * 2, steam };
  navies().push(ship); return ship;
}
function updatePirates(dt){
  if (!world || !villages.length) return;
  const P = pirates(), N = navies();
  for (const s of [...P, ...N]) { s.max ??= s.hp; s.cd ??= 0; }
  if ((pirateClock += dt) > 10) { pirateClock = 0;
    const traffic = travelers.some(t => t.sea) || villages.filter(g => g.port && popOf(g)).length >= 2;
    const ports = villages.filter(g => g.port && popOf(g)).length, maxP = Math.min(2, 1 + Math.floor(ports / 5)); // más puertos, más piratas (como mucho dos)
    if (traffic && P.filter(p => !p.leave).length < maxP && yearT > DAY_LEN * 2 && Math.random() < .012) { const s = seaSpawnFar(); if (s) { const used = new Set(P.map(p => p.name)); const name = PIRATE_NAMES.find(n => !used.has(n)) || 'Los Sin Nombre', hp = 3 + Math.floor(Math.random() * 3); P.push({ name, x:s[0], y:s[1], dir:1, hp, max:hp, gold:0, cd:0, raidCd:0, wx:s[0], wy:s[1] }); notify(`Aparecen piratas en alta mar: el barco «${name}», con bandera negra`, { x:s[0], y:s[1] }); } }
    for (const g of villages) {
      if (!popOf(g) || nationOf(g) !== g || !g.port || !hasBarracks(g) || sailorsOf(g).length < 3) continue;
      // Contra los piratas, si les han atacado hace poco
      if ((g.piracyT ?? -1e9) > yearT - DAY_LEN * 2 && P.length && !N.some(n => n.nation === g.id && n.kind !== 'guerra')) { launchNavy(g, 'piratas'); notify(`${g.name} manda su armada a por los piratas`, { x:g.fx * T, y:g.fy * T }); }
      // Guerra: un buque contra cada nación enemiga que también tenga puerto (cuando se les hunde uno, tardan en tener otro)
      for (const r of rels.values()) {
        if (!r.war) continue; const ia = r.war.att === g.id, id = r.war.def === g.id; if (!ia && !id) continue;
        const foe = villageById(ia ? r.war.def : r.war.att); if (!foe || !popOf(foe) || !nationOf(foe).port) continue;
        if (N.some(n => n.nation === g.id && n.kind === 'guerra') || yearT - ((r.war.navyT ||= {})[g.id] ?? -1e9) < DAY_LEN * .8) continue;
        r.war.seaLink ??= !!seaRoute(seaFrom(...portXY(g)), seaFrom(...portXY(nationOf(foe)))); if (!r.war.seaLink) continue; // en mares distintos: no hay guerra naval
        r.war.navyT[g.id] = yearT; launchNavy(g, 'guerra', nationOf(foe));
        notify(`¡${g.name} saca su buque de guerra contra ${nationOf(foe).name}!`, { x:g.fx * T, y:g.fy * T });
      }
    }
  }
  // Piratas
  for (const p of P) {
    if (p.sink != null) continue;
    // Al cabo de unos días (o con la bodega llena) se van con el botín a otros mares: se alejan de la costa y se pierden de vista
    p.life ??= DAY_LEN * (4 + Math.random() * 3);
    if (p.leave == null && ((p.life -= dt) <= 0 || p.gold >= 15)) { p.leave = 0; p.route = null; const far = seaSpawnFar(); [p.wx, p.wy] = far || [p.x, p.y]; notify(`Los piratas de «${p.name}» se van con su botín a otros mares`, { x:p.x, y:p.y }); }
    if (p.leave != null) { navigate(p, p.wx, p.wy, 12, dt); if ((p.leave += dt) > 20) p.gone = true; continue; }
    shoreFire(p, dt, () => true); // desde la costa, cualquiera les dispara
    p.volleyCd = (p.volleyCd || 0) - dt;
    if (p.volleyCd <= 0 && coastFire(p, () => true)) { const o = villages.find(g => popOf(g) && Math.hypot(g.fx * T - p.x, g.fy * T - p.y) < 160); if (o) o.piracyT = yearT; if ((p.volleys = (p.volleys || 0) + 1) >= 4) { p.volleys = 0; p.volleyCd = 60; } } // cañonean la costa (unas andanadas y se van)
    p.cd -= dt; p.raidCd = (p.raidCd ?? 0) - dt;
    const navy = N.filter(n => n.sink == null && n.kind !== 'guerra').map(n => [n, Math.hypot(n.x - p.x, n.y - p.y)]).sort((a, b) => a[1] - b[1])[0];
    if (navy && navy[1] < SHIP_RANGE) { fireAt(p, navy[0], navy[1]); if (navy[1] > 30) navigate(p, navy[0].x, navy[0].y, 10, dt); continue; } // se defienden de la armada
    // Busca una barca que pueda alcanzar por mar abierto (las de ríos y lagos, no)
    let tgt = p.tgt && !p.tgt.done && p.tgt.sea && seaTile(p.tgt.x, p.tgt.y) ? p.tgt : null;
    if (!tgt) { p.tgt = null; let bd = 260; for (const t of travelers) if (t.sea && !t.done && seaTile(t.x, t.y) && t !== p.ignore) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; tgt = t; } } if (tgt) { p.tgt = tgt; p.bestD = null; } }
    if (tgt) {
      const d = Math.hypot(tgt.x - p.x, tgt.y - p.y);
      if (!navigate(p, tgt.x, tgt.y, 15, dt) || (!p.route && stuckOn(p, d, dt))) { p.ignore = tgt; p.tgt = null; p.bestD = null; p.route = null; continue; } // no hay forma de llegar por mar: a otra cosa
      if (d < 9 && p.raidCd <= 0) { p.raidCd = 20; raid(p, tgt); p.tgt = null; }
    } else {
      if (Math.hypot(p.wx - p.x, p.wy - p.y) < 6 || !seaTile(p.wx, p.wy) || !navigate(p, p.wx, p.wy, 9, dt) || ((p.wanderT = (p.wanderT || 0) + dt) > 40)) { // a otro punto de mar abierto (con ruta por agua; si tarda mucho, cambia)
        p.wanderT = 0; p.route = null; for (let k = 0; k < 30; k++) { const a = Math.random() * Math.PI * 2, r0 = 60 + Math.random() * 140, x = p.x + Math.cos(a) * r0, y = p.y + Math.sin(a) * r0; if (seaTile(x, y)) { p.wx = x; p.wy = y; break; } }
      }
      // Saqueo de la costa: un pueblo con muelle cercano
      if (p.raidCd <= 0 && Math.random() < dt * .004) { const g = villages.find(o => popOf(o) && o.port && !(o.piracyGuard > yearT && Math.random() < .7) && Math.hypot(o.fx * T - p.x, o.fy * T - p.y) < 90); if (g) { p.raidCd = 140; const take = Math.min(g.food, 15); g.food -= take; p.gold += 3; g.piracyT = yearT; misfortune(g, 'guerra'); notify(`¡Los piratas de «${p.name}» saquean la costa de ${g.name} y se llevan ${Math.round(take)} de comida!`, { x:p.x, y:p.y }); } }
    }
  }
  // Armadas y buques de guerra
  for (const n of N) {
    if (n.sink != null) continue;
    { const g0 = villageById(n.nation), foe = o => { if (!g0 || o === g0) return false; const r = warRel(g0, o); return !!(r && r.war); }; shoreFire(n, dt, foe); if (n.kind === 'guerra' && ![...P, ...N].some(o => o !== n && o.sink == null && Math.hypot(o.x - n.x, o.y - n.y) < SHIP_RANGE && (o.name || (o.kind === 'guerra' && o.nation !== n.nation)))) coastFire(n, foe); } // a tiro de la costa enemiga: cruzan disparos con sus arqueros y sus edificios
    const g = villageById(n.nation); n.t += dt; n.cd -= dt;
    if (!g || !popOf(g)) { n.done = true; continue; }
    const sp = n.steam ? 20 : 15;
    if (n.back) { if (!navigate(n, n.home[0], n.home[1], sp, dt) || Math.hypot(n.home[0] - n.x, n.home[1] - n.y) < 8) n.done = true; continue; } // de vuelta a puerto
    let tgt = null, bd = Infinity;
    const natOf = o => { const v = villageById(o.nation); return v ? nationOf(v).id : null; };
    const foes = n.kind === 'guerra' ? N.filter(o => o !== n && o.sink == null && o.kind === 'guerra' && natOf(o) === n.foe) : P.filter(p => p.sink == null);
    for (const o of foes) { const d = Math.hypot(o.x - n.x, o.y - n.y); if (d < bd) { bd = d; tgt = o; } }
    const war = n.kind === 'guerra' ? warRel(g, villageById(n.foe) || g) : null;
    if (n.kind === 'guerra' && (!war || !war.war)) { n.back = true; notify(`El buque de guerra de ${g.name} vuelve a puerto: se ha acabado la guerra`, { x:n.x, y:n.y }); continue; }
    if (tgt) { if (bd > SHIP_RANGE * .7 && !navigate(n, tgt.x, tgt.y, sp, dt)) { n.back = true; continue; } if (bd < SHIP_RANGE) fireAt(n, tgt, bd); continue; } // (si no hay paso por mar hasta él, vuelve)
    if (n.kind === 'guerra') { // sin barcos enemigos: a cañonear su puerto
      const foe = villageById(n.foe); if (!foe || !foe.port) { n.back = true; continue; }
      const [px, py] = portXY(foe), d = Math.hypot(px - n.x, py - n.y);
      if (d > 40) { if (!navigate(n, px, py, sp, dt) || (!n.route && stuckOn(n, d, dt))) n.back = true; continue; }
      bombardPort(n, foe); if (n.t > 160) n.back = true; continue;
    }
    if (n.t > 140) n.back = true; // contra piratas: sin encontrarlos, vuelve
  }
  // Balas de cañón y hundimientos
  for (const b of cannonballs) { b.t += dt; if (b.t >= b.dur && !b.done) { b.done = true; cannonHit(b); } }
  if (cannonballs.length) cannonballs = cannonballs.filter(b => b.t < b.dur + .05);
  for (const s of [...P, ...N]) if (s.sink != null && (s.sink += dt) > SINK_T) s.gone = true;
  if (P.some(p => p.gone || p.dead)) world.pirates = P.filter(p => !p.gone && !p.dead);
  if (N.some(n => n.done || n.gone)) world.navies = N.filter(n => !n.done && !n.gone);
}
// Cañonazo: fogonazo y humo en el costado, y la bala vuela en arco hasta el blanco (o al agua)
function fireAt(s, tgt, d, warn){
  if (s.cd > 0) return;
  s.cd = 1.6 + Math.random() * 1.2; s.dir = tgt.x < s.x ? -1 : 1;
  const hit = !warn && Math.random() < (d < 30 ? .65 : .45), mx = s.x + s.dir * 11 * SHIP_K, my = s.y - 7 * SHIP_K;
  cannonballs.push({ x0:mx, y0:my, tx:tgt.x + (hit ? 0 : (Math.random() - .5) * 24), ty:tgt.y - 2 + (hit ? 0 : (Math.random() - .5) * 10), t:0, dur:.35 + d / 160, hit, tgt, from:s });
  for (let k = 0; k < 9; k++) smoke.push({ x:mx + s.dir * k, y:my + (Math.random() - .5) * 3, vx:s.dir * (4 + Math.random() * 8), vy:-2 - Math.random() * 3, r:1.5 + Math.random() * 1.5, life:0, max:1.2 + Math.random() * 1.2 });
  for (let k = 0; k < 6; k++) chips.push({ x:mx + s.dir * 2, y:my, vx:s.dir * (14 + Math.random() * 16), vy:(Math.random() - .5) * 10, life:0, max:.12 + Math.random() * .1, col:k % 2 ? '#ffe080' : '#ff9a30' }); snd('boom', mx, my, .25); // el fogonazo
}
function cannonHit(b){
  if (b.land) return portHit(b);
  const s = b.tgt;
  if (b.hit && s && s.sink == null && !s.gone && !s.done) {
    s.hp--; for (let k = 0; k < 16; k++) chips.push({ x:s.x, y:s.y - 4, vx:(Math.random() - .5) * 30, vy:-8 - Math.random() * 12, life:0, max:.5 + Math.random() * .4, col:k % 2 ? '#8a5a30' : '#5a3a20' }); // astillas
    if (Math.random() < .5) smoke.push({ x:s.x, y:s.y - 6, vx:0, vy:-5, r:2, life:0, max:2 });
    if (s.hp <= 0) shipSunk(s, b.from);
  } else { // al agua: salpicón
    for (let k = 0; k < 14; k++) chips.push({ x:b.tx + (Math.random() - .5) * 3, y:b.ty, vx:(Math.random() - .5) * 18, vy:-12 - Math.random() * 16, life:0, max:.45 + Math.random() * .3, col:k % 3 ? 'rgba(220,240,255,.9)' : 'rgba(170,210,240,.8)' }); // columna de agua
  }
}
// Hundido: se escora, se va al fondo y deja restos; en los buques de una nación mueren algunos marineros
function shipSunk(s, by){
  s.sink = 0; snd('boom', s.x, s.y, .6);
  const isPirate = !!s.name, g = !isPirate && villageById(s.nation), bg = by && !by.name && villageById(by.nation);
  if (!isPirate && g) { const lost = sailorsOf(g).slice(0, 2); for (const u of lost) killVillager(u, s.kind === 'guerra' ? 'guerra' : 'piratas'); if (s.kind === 'guerra') { const r = warRel(g, villageById(s.foe) || g); if (r && r.war) { r.war.dead += lost.length; for (const _ of lost) warLoss(r, g); } } }
  if (isPirate) {
    if (bg) { bg.gold = (bg.gold || 0) + s.gold; if (bg.coin) ecOf(bg).treas += s.gold * 5 * ecOf(bg).P; bg.piracyT = -1e9; }
    notify(`¡${bg ? `La armada de ${bg.name}` : 'Los cañones'} hunde${bg ? '' : 'n'} al barco pirata «${s.name}»${s.gold && bg ? ` y recupera ${s.gold} de oro` : ''}!`, { x:s.x, y:s.y });
  } else if (by && by.name) notify(`Los piratas de «${by.name}» hunden la armada de ${g ? g.name : '?'}`, { x:s.x, y:s.y });
  else notify(`¡${bg ? `El buque de ${bg.name}` : 'El enemigo'} hunde el buque de guerra de ${g ? g.name : '?'}!`, { x:s.x, y:s.y });
}
// Desde el mar, contra el puerto enemigo: edificios de la orilla y quien ande cerca
// Desde tierra: los arqueros y ballesteros que tienen el barco a tiro le disparan (las flechas se ven y le hacen daño)
function shoreFire(s, dt, isFoe){
  if ((s.shoreT = (s.shoreT || 0) - dt) > 0) return; s.shoreT = .4;
  for (const u of villagers) {
    if (u.dead || u.away || u.boat || !isRanged(u.weapon) || ageOf(u) < ADULT_H || (u.shipCd || 0) > yearT) continue;
    const d = Math.hypot(u.x - s.x, u.y - s.y); if (d > (u.weapon === 'ballesta' ? 46 : 38)) continue;
    const g = villageById(u.vid); if (!g || !isFoe(g)) continue;
    u.shipCd = yearT + (u.weapon === 'ballesta' ? 2.2 : 1.5); u.dir = s.x < u.x ? -1 : 1; u.stab = .25;
    const hit = Math.random() < .55;
    arrows.push({ x0:u.x, y0:u.y - 5, a:s, v:u, t:0, dur:Math.max(.15, d / 150), hit, vis:true, bolt:u.weapon === 'ballesta' }); snd('arrow', u.x, u.y);
    if (knowsSci(g, 'polvora')) gunSmoke(u);
    if (hit) { s.hp -= u.weapon === 'ballesta' ? .35 : .2; if (s.hp <= 0 && s.sink == null) { shipSunk(s, null); notify(`¡Los ${u.weapon === 'ballesta' ? 'ballesteros' : 'arqueros'} de ${g.name} hunden ${s.name ? `al barco pirata «${s.name}»` : 'un buque enemigo'} desde la orilla!`, { x:s.x, y:s.y }); } }
  }
}
// Cañonazo contra un edificio enemigo que el barco tenga a tiro (si no hay un barco enemigo al que disparar)
function coastFire(s, isFoe){
  if (s.cd > 0) return false;
  let best = null, bd = SHIP_RANGE;
  for (const g of villages) {
    if (!popOf(g) || Math.hypot(g.fx * T - s.x, g.fy * T - s.y) > SHIP_RANGE + 90 || !isFoe(g)) continue;
    for (const i of buildingsOf(g)) { if (!world.objs[i]) continue; const d = Math.hypot((i % W) * T + 2 - s.x, ((i / W) | 0) * T - s.y); if (d < bd) { bd = d; best = [i, g]; } }
  }
  if (!best) return false;
  const [i, g] = best, tx = (i % W) * T + 2, ty = ((i / W) | 0) * T;
  s.cd = 2.2 + Math.random(); s.dir = tx < s.x ? -1 : 1;
  const mx = s.x + s.dir * 11 * SHIP_K, my = s.y - 7 * SHIP_K;
  cannonballs.push({ x0:mx, y0:my, tx, ty, t:0, dur:.4 + Math.hypot(tx - mx, ty - my) / 160, hit:false, land:{ i, foe:g.id, nat:s.nation ?? null } });
  for (let k = 0; k < 9; k++) smoke.push({ x:mx + s.dir * k, y:my + (Math.random() - .5) * 3, vx:s.dir * (4 + Math.random() * 8), vy:-2 - Math.random() * 3, r:1.5 + Math.random() * 1.5, life:0, max:1.2 + Math.random() * 1.2 });
  snd('boom', mx, my, .25);
  if (!s.coastMsg || yearT - s.coastMsg > 90) { s.coastMsg = yearT; notify(s.name ? `¡Los piratas de «${s.name}» cañonean ${g.name} desde el mar!` : `¡El buque de ${villageById(s.nation)?.name || '?'} cañonea ${g.name} desde el mar!`, { x:tx, y:ty }); }
  return true;
}
function bombardPort(n, foe){
  if (n.cd > 0) return;
  const [px, py] = portXY(foe), bs = buildingsOf(foe).filter(i => world.objs[i] && Math.hypot((i % W) * T - px, ((i / W) | 0) * T - py) < 70);
  const i = bs.length ? bs[Math.floor(Math.random() * bs.length)] : null, tx = i != null ? (i % W) * T + 2 : px + (Math.random() - .5) * 30, ty = i != null ? ((i / W) | 0) * T : py + (Math.random() - .5) * 20;
  n.cd = 2.2 + Math.random(); n.dir = tx < n.x ? -1 : 1;
  const mx = n.x + n.dir * 7, my = n.y - 5;
  cannonballs.push({ x0:mx, y0:my, tx, ty, t:0, dur:.4 + Math.hypot(tx - mx, ty - my) / 160, hit:false, land:{ i, foe:foe.id, nat:n.nation } });
  for (let k = 0; k < 5; k++) smoke.push({ x:mx + n.dir * k, y:my, vx:n.dir * (4 + Math.random() * 6), vy:-2 - Math.random() * 3, r:1.5 + Math.random(), life:0, max:1 + Math.random() });
  snd('boom', mx, my, .25);
  if (!n.bombMsg) { n.bombMsg = true; notify(`¡El buque de guerra de ${villageById(n.nation)?.name || '?'} cañonea el puerto de ${foe.name}!`, { x:px, y:py }); }
}
// Las que caen en tierra: el puerto bombardeado
function portHit(b){
  const L = b.land, foe = villageById(L.foe), g = villageById(L.nat);
  for (let k = 0; k < 8; k++) chips.push({ x:b.tx, y:b.ty, vx:(Math.random() - .5) * 26, vy:-8 - Math.random() * 12, life:0, max:.5 + Math.random() * .3, col:k % 2 ? '#8a7a68' : '#5a4a3a' });
  smoke.push({ x:b.tx, y:b.ty - 3, vx:0, vy:-4, r:2.5, life:0, max:1.6 });
  if (L.i != null && world.objs[L.i]) damageBuilding(L.i, .18);
  const u = foe && villagers.find(v => !v.dead && !v.away && v.vid === foe.id && Math.hypot(v.x - b.tx, v.y - b.ty) < 8);
  if (u && Math.random() < .5) { u.hp = (u.hp ?? 1) - .6; hurtFx(u, b.tx, b.ty, walkable); if (u.hp <= 0) { killVillager(u, 'guerra'); const r = g && foe && warRel(g, foe); if (r && r.war) { r.war.dead++; warLoss(r, foe); } } }
}
// Asalto a una barca: se llevan la carga y a veces matan a uno de dentro (si va más gente, el resto sigue su viaje)
function raid(p, t){
  const g = villageById(t.from), at = { x:t.x, y:t.y };
  if (g) g.piracyT = yearT;
  p.cd = 0; fireAt(p, t, Math.hypot(t.x - p.x, t.y - p.y), true); // un cañonazo de aviso
  if (t.kind === 'flota' && (t.crew || []).filter(u => !u.dead).length >= 3 && Math.random() < .55) { p.hp--; if (p.hp <= 0) shipSunk(p, null); notify(`Los soldados de la flota de ${g ? g.name : '?'} rechazan a los piratas de «${p.name}»${p.hp <= 0 ? ' y hunden su barco' : ''}`, at); return; }
  const loot = t.cargo ? `${t.cargo.n} de ${GOODS[t.cargo.k].txt}` : 'lo que llevaban'; if (t.cargo) p.gold += Math.ceil(t.cargo.n / 4); else p.gold += 1; t.cargo = null;
  const crew = t.crew ? t.crew.filter(u => !u.dead) : [t.v], victim = Math.random() < .35 ? crew[crew.length - 1] : null;
  if (victim && !victim.dead) {
    victim.away = false; killVillager(victim, 'piratas');
    if (!t.crew || !t.crew.some(u => !u.dead)) t.done = true; else if (victim === t.v) t.v = t.crew.find(u => !u.dead); // la barca sigue con los que quedan
  }
  notify(`¡Los piratas de «${p.name}» asaltan la barca de ${g ? g.name : '?'} y se llevan ${loot}${victim ? `; ${victim.name} muere` : ''}!`, at);
}
// Dibujo: galeones (oscuros los piratas, con la bandera de su nación las armadas), con barra de vida al recibir daño,
// y escorándose al hundirse
const SHIP_K = 1.9; // los barcos de guerra, bastante más grandes que una barca
function drawWarShip(s, now, pirate){
  const x = Math.round(s.x), y = Math.round(s.y), k = s.sink != null ? Math.min(1, s.sink / SINK_T) : 0, K = SHIP_K;
  const moving = Math.hypot(s.x - (s.lx ?? s.x), s.y - (s.ly ?? s.y)) > .01; s.lx = s.x; s.ly = s.y;
  vctx.save();
  if (s.leave != null) vctx.globalAlpha = Math.max(0, 1 - s.leave / 20); // se pierde de vista en el horizonte
  if (k) { vctx.globalAlpha = 1 - k * .85; vctx.translate(x, y); vctx.rotate(s.dir * k * .6); vctx.translate(-x, -y + k * 9); }
  if (pirate) vctx.filter = 'brightness(.42) saturate(.6)';
  drawShip(x, y, s.dir, !!s.steam, [40, 40, 40], now, K, moving && !k);
  vctx.filter = 'none';
  // Mástil con su bandera: la negra con calavera o la de su nación
  const mx = x - s.dir * 1, my = y - Math.round(22 * K);
  vctx.fillStyle = '#3a2a1a'; vctx.fillRect(mx, my, 1, 6);
  if (pirate) { vctx.fillStyle = '#141414'; vctx.fillRect(mx + 1, my, 7, 5); vctx.fillStyle = '#f0f0e8'; vctx.fillRect(mx + 3, my + 1, 3, 2); vctx.fillRect(mx + 3, my + 3, 1, 1); vctx.fillRect(mx + 5, my + 3, 1, 1); }
  else { const g = villageById(s.nation), f = g && (nationOf(g).flag || g.flag); if (f) drawFlag(f, mx + 1, my, 7, 5, 1, now); else { const [r0, g0, b0] = g ? villageColor(g) : [200, 200, 200]; vctx.fillStyle = `rgb(${r0},${g0},${b0})`; vctx.fillRect(mx + 1, my, 7, 5); } }
  vctx.restore();
  if (k) { // hundiéndose: burbujas, tablas que flotan y humo
    if (Math.random() < .7) chips.push({ x:x + (Math.random() - .5) * 18, y:y + 1, vx:0, vy:-6 - Math.random() * 4, life:0, max:.5, col:'rgba(220,240,255,.8)' });
    if (Math.random() < .25) chips.push({ x:x + (Math.random() - .5) * 20, y:y, vx:(Math.random() - .5) * 10, vy:-3, life:0, max:1.5, col:'#7a5230' });
    if (Math.random() < .3) smoke.push({ x:x + (Math.random() - .5) * 10, y:y - 8, vx:0, vy:-5, r:2, life:0, max:2 });
    return;
  }
  // Tocado: humo y llamas en cubierta (más cuanto peor está)
  const dmg = 1 - s.hp / s.max;
  if (dmg > .3 && Math.random() < dmg * .6) smoke.push({ x:x + (Math.random() - .5) * 14, y:y - 10, vx:(Math.random() - .5) * 3, vy:-6 - Math.random() * 3, r:1.5 + dmg * 2, life:0, max:1.5 + dmg });
  if (dmg > .55) for (let f = 0; f < 2; f++) { const fx = x + (f ? 5 : -6) * s.dir, fl = 2 + Math.round(Math.abs(Math.sin(now / 90 + f * 2)) * 3); vctx.fillStyle = '#f08030'; vctx.fillRect(fx - 1, y - 6 - fl, 3, fl); vctx.fillStyle = '#ffd860'; vctx.fillRect(fx, y - 5 - Math.ceil(fl / 2), 1, Math.ceil(fl / 2)); }
  if (s.hp < s.max) { const w = 22, hy = y - Math.round(27 * K); vctx.fillStyle = 'rgba(0,0,0,.6)'; vctx.fillRect(x - w / 2 - 1, hy, w + 2, 3); vctx.fillStyle = s.hp / s.max > .5 ? '#6ad06a' : s.hp / s.max > .25 ? '#e8c040' : '#e05040'; vctx.fillRect(x - w / 2, hy + 1, Math.max(1, w * s.hp / s.max), 1); }
  redrawFront(x - 26, x + 26, y - 38, y);
}
function drawPirates(now){
  const [x0, y0, x1, y1] = visibleRect(), on = s => s.x > x0 - 40 && s.x < x1 + 40 && s.y > y0 - 40 && s.y < y1 + 40;
  for (const p of pirates()) if (on(p)) drawWarShip(p, now, true);
  for (const n of navies()) if (on(n)) drawWarShip(n, now, false);
  for (const b of cannonballs) { // la bala, en arco, con su sombra
    const k = Math.min(1, b.t / b.dur), x = b.x0 + (b.tx - b.x0) * k, y = b.y0 + (b.ty - b.y0) * k - Math.sin(k * Math.PI) * 10;
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(Math.round(x), Math.round(b.y0 + (b.ty - b.y0) * k + 2), 2, 1);
    vctx.fillStyle = '#1a1a1a'; vctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }
}

// Los barcos no se montan unos encima de otros: si dos (de guerra, piratas o carabelas de viajeros) se acercan
// demasiado, se apartan un poco hacia donde siga habiendo agua
const SHIP_GAP = 30 * SHIP_K;
addEventListener('DOMContentLoaded', () => SYSTEMS.push(dt => { // (este archivo se carga antes que la lista de sistemas)
  if (!world) return;
  const L = [...pirates(), ...navies()].filter(s => s.sink == null);
  for (const t of travelers) if (t.sea && !t.done && seaTile(t.x, t.y)) L.push(t);
  if (L.length < 2) return;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = b.x - a.x, dy = (b.y - a.y) * 1.4, d = Math.hypot(dx, dy); // (de lado son más largos que altos)
    if (d >= SHIP_GAP || d < .01) { if (d < .01) b.x += 1; continue; }
    const push = Math.min(SHIP_GAP - d, 40 * dt), ux = dx / d, uy = dy / d / 1.4;
    for (const [o, sg] of [[a, -1], [b, 1]]) { const nx = o.x + ux * push * sg * .5, ny = o.y + uy * push * sg * .5; if (seaTile(nx, ny)) { o.x = nx; o.y = ny; if (o.v && o.crew) for (const u of [o.v, ...o.crew]) if (u && !u.dead) { u.x = nx; u.y = ny; } } }
  }
}));
