// Forja de Mundos · Ocio, Juegos, mar, fichas de pueblo y persona, crónica, leyes y diplomacia
// ================= Deportes, teatro, coliseo y Juegos =================
let olymp = { next:SEASON_LEN * 2, cur:null, past:[] }, ballGames = [];
const hasTheater = g => g && g.theater != null && !!world.objs[g.theater];
const hasTavern = g => g && g.tavern != null && !!world.objs[g.tavern];
const hasCathedral = g => g && g.cathedral != null && !!world.objs[g.cathedral];
// Qué gran templo levanta cada fe: un solo dios, catedral; dioses del cielo, el sol, las estrellas o el fuego, zigurat; si no, panteón
const SKY_DOMS = ['el cielo', 'el sol', 'las estrellas', 'el fuego', 'el trueno', 'la luna'];
const holyStyleOf = g => !g.faith ? 'catedral' : g.faith.mono ? 'catedral' : SKY_DOMS.includes(g.faith.dom) ? 'zigurat' : 'panteon';
const HOLY_TXT = { catedral:'la catedral', panteon:'el gran panteón', zigurat:'el zigurat' };
const DRINKS = ['sidra', 'cerveza', 'aguamiel', 'vino', 'agua fresca'];
const hasColiseum = g => g && g.coliseum != null && !!world.objs[g.coliseum];
// Partido de pelota en la plaza: los jugadores persiguen la pelota y la chutan
function startBallGame(g, people){
  if (ballGames.some(b => b.vid === g.id) || !g.plaza) return;
  const off = !inShift(g), ps = people.filter(u => !u.away && !u.boat && !u.sleep && (ageOf(u) < ADULT_H || off) && (!u.task || ['ocio', 'pasear'].includes(u.task.k) || (u.task.k === 'trabajando' && ['ocio', 'pasear'].includes(u.task.job)))).slice(0, 6); if (ps.length < 4) return;
  const r0 = g.plaza, bx = (r0.x0 + r0.x1) / 2 * T + 2, by = (r0.y0 + r0.y1) / 2 * T + 3;
  for (const u of ps) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'jugar', until:yearT + 30 }; }
  ballGames.push({ vid:g.id, ps, x:bx, y:by, vx:0, vy:0, r:r0, until:yearT + 30, goals:[0, 0] });
}
function updateBallGames(dt){
  for (const b of ballGames) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(.25, dt); b.vy *= Math.pow(.25, dt);
    const x0 = b.r.x0 * T, x1 = (b.r.x1 + 1) * T, y0 = b.r.y0 * T, y1 = (b.r.y1 + 1) * T;
    if (b.x < x0 || b.x > x1) { if (b.y > y0 + (y1 - y0) * .3 && b.y < y1 - (y1 - y0) * .3) { b.goals[b.x < x0 ? 1 : 0]++; floats.push({ x:b.x, y:b.y - 10, txt:'¡GOL!', col:'#f8e070', life:0 }); snd('cheer', b.x, b.y); b.x = (x0 + x1) / 2; b.y = (y0 + y1) / 2; b.vx = b.vy = 0; } else { b.vx = -b.vx; b.x = clamp(b.x, x0, x1); } }
    if (b.y < y0 || b.y > y1) { b.vy = -b.vy; b.y = clamp(b.y, y0, y1); }
    if (b.match && !b.subbed && yearT > b.until - 25) matchSub(b); // descanso: entra el suplente (deportes.js)
    if (yearT > b.until) { b.done = true; for (const u of b.ps) if (u.task && u.task.k === 'jugar') { u.task = null; u.fun = yearT; } ballGameEnd(b); }
  }
  if (ballGames.some(b => b.done)) ballGames = ballGames.filter(b => !b.done);
}
function runBallPlayer(v, dt){
  const b = ballGames.find(q => q.ps.includes(v)); if (!b) { v.task = null; return; }
  const team = b.teams ? b.teams.get(v) ?? 0 : b.ps.indexOf(v) % 2, d = Math.hypot(b.x - v.x, b.y - v.y);
  if (d > 3) vGo(v, b.x + (team ? 3 : -3), b.y, dt, true);
  else { const goal = team ? b.r.x0 * T - 4 : (b.r.x1 + 1) * T + 4; const ang = Math.atan2((b.r.y0 + b.r.y1) / 2 * T - b.y + (Math.random() - .5) * 30, goal - b.x); b.vx = Math.cos(ang) * 60; b.vy = Math.sin(ang) * 60; }
}
function drawBallGames(){ for (const b of ballGames) { if (!onScreen(b.x, b.y)) continue; vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 1, 3, 1); vctx.fillStyle = '#f4f0e8'; vctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 2, 2); } }
// La pista de atletismo: un óvalo en el suelo (se reserva como parcela)
function trackSite(g){
  for (let k = 0; k < 400; k++) {
    const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * (k < 200 ? 20 : 36), x0 = Math.round(g.fx + Math.cos(a) * d - 8), y0 = Math.round(g.fy + Math.sin(a) * d * .8 - 4);
    if (x0 < 2 || y0 < 2 || x0 + 16 >= W - 2 || y0 + 8 >= H - 2) continue;
    let ok = !plotIn(x0 - 1, y0 - 1, x0 + 16, y0 + 8) && !holyNear(x0, y0, x0 + 15, y0 + 7) && !penOverlap(null, x0, y0, x0 + 15, y0 + 7);
    for (let y = y0; ok && y < y0 + 8; y++) for (let x = x0; ok && x < x0 + 16; x++) { const i = y * W + x, o = world.objs[i]; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || plazaSet.has(i) || farmMap.has(i) || wallSet.has(i) || bridgeSet.has(i) || underBuilding(g, x, y) || (o && !['tree', 'berry', 'stone'].includes(OBJ[o.key][1]))) ok = false; }
    if (ok) return { x0, y0, w:16, h:8 };
  }
  return null;
}
function trackPoint(tr, p, lane){ const cx = (tr.x0 + tr.w / 2) * T, cy = (tr.y0 + tr.h / 2) * T, rx = tr.w * T / 2 - 4 - lane * 2, ry = tr.h * T / 2 - 4 - lane * 2, a = p * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }
function drawTracks(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    const tr = g.track; if (!tr) continue; const px = tr.x0 * T, py = tr.y0 * T, pw = tr.w * T, ph = tr.h * T;
    if (px > x1 || px + pw < x0 || py - 20 > y1 || py + ph < y0) continue;
    const art = artFrame('sport:atletismo'); // el estadio de atletismo del atlas (deportes.js); sin él, el óvalo de siempre
    if (art) { const [, , aw, ah] = ART_MAP['sport:atletismo']; vctx.drawImage(art, Math.round(px + pw / 2 - aw / 2), py + ph - ah); continue; }
    const cx = px + pw / 2, cy = py + ph / 2;
    vctx.save(); vctx.beginPath(); vctx.ellipse(cx, cy, pw / 2, ph / 2, 0, 0, Math.PI * 2); vctx.fillStyle = '#b8583a'; vctx.fill();
    vctx.beginPath(); vctx.ellipse(cx, cy, pw / 2 - 10, ph / 2 - 10, 0, 0, Math.PI * 2); vctx.fillStyle = '#5a9a3a'; vctx.fill();
    vctx.strokeStyle = 'rgba(255,255,255,.7)'; vctx.lineWidth = .6; for (let l = 1; l < 4; l++) { vctx.beginPath(); vctx.ellipse(cx, cy, pw / 2 - l * 2.5, ph / 2 - l * 2.5, 0, 0, Math.PI * 2); vctx.stroke(); }
    vctx.fillStyle = '#f4f0e8'; vctx.fillRect(cx - .5, py, 1, 10); vctx.restore(); // línea de meta
  }
}
// Los Juegos: cada año, en una sede distinta, si hay naciones en paz; atletas de cada una, carreras en la pista de la anfitriona y todos a mirar
function olympicsTick(dt){
  if (olymp.cur) return runOlympics(dt);
  if (yearT < olymp.next) return;
  olymp.next = yearT + SEASON_LEN * 4; // cada año (deportes.js)
  const nations = [...new Set(villages.filter(g => popOf(g)).map(g => nationOf(g)))].filter(n => n.hall != null && popOf(n) >= 6);
  const atWar = n => [...rels.values()].some(r => r.war && (r.war.att === n.id || r.war.def === n.id));
  const peaceful = nations.filter(n => !atWar(n));
  if (peaceful.length < 2) { if (nations.length >= 2) notify('Este año no hay Juegos: hay demasiadas guerras'); return; }
  // La sede cambia cada año: primero las naciones que menos veces la han tenido, y nunca la del año anterior (si construyen la pista, mejor)
  const hosted = n => olymp.past.filter(p => p.hostId === n.id).length, last = olymp.past[olymp.past.length - 1];
  const order = peaceful.filter(n => !last || last.hostId !== n.id).sort((a, b) => hosted(a) - hosted(b) || !!b.track - !!a.track || popOf(b) - popOf(a));
  let host = null;
  for (const n of order) { if (!n.track) n.track = trackSite(n) || sportSite(n, 16, 8); if (n.track) { host = n; break; } } // (sportSite busca también en las afueras: deportes.js)
  if (!host) { notify('Ninguna nación encuentra sitio para una pista: este año no hay Juegos'); return; }
  if (!host.trackMsg) { host.trackMsg = true; clearSite(host, host.track.x0, host.track.y0, host.track.x0 + 15, host.track.y0 + 7); notify(`${host.name} prepara una pista de atletismo para los Juegos`, { x:(host.track.x0 + 8) * T, y:(host.track.y0 + 4) * T }); }
  const nats = peaceful.filter(n => n === host || !(rels.get(relKey(n, host)) || {}).war), athletes = [];
  for (const n of nats) {
    const cand = villagers.filter(u => !u.dead && !u.away && !u.boat && villageById(u.vid) && nationOf(villageById(u.vid)) === n && ageOf(u) >= ADULT_H && ageOf(u) < u.life * .6).sort((a, b) => ((b.sports || {}).atletismo ? 1 : 0) - ((a.sports || {}).atletismo ? 1 : 0) || (b.fit || 0) - (a.fit || 0) || (b.hp ?? 1) - (a.hp ?? 1)).slice(0, 2);
    for (const u of cand) { releaseTask(u); dismount(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.olymHome = [u.x, u.y]; u.task = { k:'atleta' }; athletes.push({ v:u, nat:n.id, natName:n.name, speed:.045 + Math.random() * .02 + (u.weapon ? .005 : 0) + (u.fit || 0) * .02 }); }
  }
  if (athletes.length < 4) return;
  // Los atletas llegan a la pista; los del país anfitrión (y los vecinos en paz) van a mirar
  athletes.forEach((a, k) => { const [x, y] = trackPoint(host.track, 0, k % 4); a.v.x = x; a.v.y = y; });
  const tr = host.track, spect = villagers.filter(u => !u.dead && !u.away && !u.boat && !u.task?.k?.startsWith('asalto') && !athletes.some(a => a.v === u) && villageById(u.vid) && Math.hypot(villageById(u.vid).fx - host.fx, villageById(u.vid).fy - host.fy) < 60 && !(rels.get(relKey(villageById(u.vid), host)) || {}).war);
  for (const u of payTickets(host, spect, 'Juegos')) { const a = Math.random() * Math.PI * 2, rx = tr.w * T / 2 + 6 + Math.random() * 8, ry = tr.h * T / 2 + 5 + Math.random() * 6; releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.sleep = false; u.task = { k:'espectador', x:(tr.x0 + tr.w / 2) * T + Math.cos(a) * rx, y:(tr.y0 + tr.h / 2) * T + Math.sin(a) * ry, until:yearT + 90 }; u.lastD = Infinity; }
  const EV = [['Carrera de velocidad', 1], ['Carrera de fondo', 3], ['Relevos', 2]];
  olymp.cur = { host:host.id, hostName:host.name, athletes, nats:nats.map(n => n.id), ev:0, EV, race:null, results:[], medals:{}, t:0 };
  notify(`¡Empiezan los Juegos en ${host.name}! Compiten ${nats.map(n => n.name).join(', ')}`, { x:(tr.x0 + 8) * T, y:(tr.y0 + 4) * T }); snd('horn');
}
function runOlympics(dt){
  const O = olymp.cur, host = villageById(O.host);
  if (!host || !host.track) { endOlympics(); return; }
  if (!O.race) {
    if (O.ev >= O.EV.length) { endOlympics(); return; }
    const [name, laps] = O.EV[O.ev]; O.race = { name, laps, runners:O.athletes.filter(a => !a.v.dead).map((a, k) => ({ ...a, speed:a.speed * (.8 + Math.random() * .4) * (laps > 1 ? (a.v.hp ?? 1) : 1), p:0, lane:k % 4, done:false })), order:[], t:0 }; O.wait = 3;
  }
  if ((O.wait -= dt) > 0) return;
  const R = O.race; R.t += dt;
  for (const r of R.runners) {
    if (r.done) continue;
    r.p += dt * r.speed * (.85 + Math.random() * .3) / R.laps * 2;
    const [x, y] = trackPoint(host.track, r.p % 1, r.lane); r.v.dir = x < r.v.x ? -1 : 1; r.v.x = x; r.v.y = y; r.v.moving = true; r.v.walk += dt * 2;
    if (r.p >= R.laps) { r.done = true; R.order.push(r); }
  }
  if (R.order.length >= Math.min(3, R.runners.length) && (R.order.length === R.runners.length || R.t > 60)) {
    const pod = R.order.slice(0, 3); pod.forEach((r, k) => { O.medals[r.natName] = (O.medals[r.natName] || 0) + (3 - k); });
    O.results.push({ name:R.name, podium:pod.map(r => `${r.v.name} (${r.natName})`) });
    notify(`Juegos de ${O.hostName} · ${R.name}: oro para ${pod[0].v.name} de ${pod[0].natName}`, { x:pod[0].v.x, y:pod[0].v.y }); snd('cheer');
    floats.push({ x:pod[0].v.x, y:pod[0].v.y - 16, txt:'¡ORO!', col:'#f8d850', life:0 });
    O.race = null; O.ev++;
  }
}
function endOlympics(){
  const O = olymp.cur; olymp.cur = null; if (!O) return;
  for (const a of O.athletes) if (!a.v.dead) { a.v.task = null; if (a.v.olymHome) { a.v.x = a.v.olymHome[0]; a.v.y = a.v.olymHome[1]; } a.v.fun = yearT; }
  for (const u of villagers) if (u.task && u.task.k === 'espectador') { u.task = null; u.fun = yearT; }
  for (const i of O.nats) for (const j of O.nats) if (i < j) { const a = villageById(i), b = villageById(j); if (a && b) { const r = relOf(a, b); r.known = true; r.v = Math.min(100, r.v + 8); } } // los Juegos acercan a los pueblos
  for (const id of O.nats) { const n = villageById(id); if (n) n.anger = Math.max(0, (n.anger || 0) - 10); }
  const top = Object.entries(O.medals).sort((a, b) => b[1] - a[1])[0];
  olymp.past.push({ host:O.hostName, hostId:O.host, d:Math.floor(yearT / DAY_LEN) + 1, events:O.results, medals:O.medals });
  // El medallero, en el ánimo de cada país: el primero lo celebra, el segundo también algo; quien no gana nada, se desanima
  const rank = O.nats.map(id => villageById(id)).filter(Boolean).sort((a, b) => (O.medals[b.name] || 0) - (O.medals[a.name] || 0));
  rank.forEach((n, k) => { const m = O.medals[n.name] || 0; if (k === 0 && m) sportResult(n, 10, `su país ganó el medallero de los Juegos de ${O.hostName}`); else if (k === 1 && m) sportResult(n, 5, `su país quedó segundo en los Juegos de ${O.hostName}`); else if (!m) sportResult(n, -4, `su país no ganó ninguna medalla en los Juegos de ${O.hostName}`); });
  if (O.host && villageById(O.host)) sportResult(villageById(O.host), 3, `su país organizó los Juegos`);
  notify(`Terminan los Juegos de ${O.hostName}${top ? `: ${top[0]} gana el medallero` : ''}`);
}
const hasHosp = g => g && g.hospital != null && !!world.objs[g.hospital];
const hasForge = g => g && g.forge != null && !!world.objs[g.forge];
// ---- Trazado de la aldea: calles que salen de la hoguera; las casas en fila con la puerta a la calle ----
let wallStone = new Set(), gateOwner = new Map();
let pathMap = new Set(), bridgeSet = new Set(), bridges = [];
// Desgaste de tanto pisar: hierba gastada y, si se sigue pasando, un camino; si se deja de usar, vuelve la hierba
let wear = null, wornSet = new Set(), desireSet = new Set();
const storesOf = g => (g.stores ||= []).filter(i => world.objs[i] && world.objs[i].key === 'store:almacen');
const buildingsOf = g => [...g.houses, ...(g.wells || []).map(w => w.i), ...(g.mill != null ? [g.mill] : []), ...(g.quarry != null ? [g.quarry] : []), ...(g.hall != null ? [g.hall] : []), ...(g.stores || []), ...(g.towers || []), ...[g.altar, g.temple, g.monument, g.market, g.bank, g.wonder, g.forge, g.hospital, g.barracks, g.lonja, g.theater, g.coliseum, g.tavern, g.cathedral, g.school, g.court, g.prison, g.press, g.unionHall, g.parliament, g.academy, g.mine, g.university, g.councilHall, g.spyHouse, g.granary, g.smokehouse, g.woodshed, g.postHouse].filter(b => b != null)];
// Capacidad del almacén: lo que cabe junto a la hoguera, más lo de cada almacén
const capOf = g => Math.max(20, 80 * storesOf(g).length); // sin almacén, solo lo poco que cabe junto a la hoguera
let plazaSet = new Set(), holySet = new Map();
const hallZone = (g, x, y) => g.hall == null && x >= g.fx - 6 && x <= g.fx + 6 && y >= g.fy - 11 && y <= g.fy - 2;
const hallIn = (g, x0, y0, x1, y1) => g.hall == null && !(x1 < g.fx - 6 || x0 > g.fx + 6 || y1 < g.fy - 11 || y0 > g.fy - 2);
const plazaIn = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (plazaSet.has(y * W + x)) return true; return false; };
const pathIn = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pathMap.has(y * W + x) || bridgeSet.has(y * W + x)) return true; return false; };
const farmIn = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (farmMap.has(y * W + x)) return true; return false; };
// Plaza empedrada alrededor de la hoguera (se despeja al fundar la aldea)
function makePlaza(g){
  g.plaza = { x0:g.fx - 3, y0:g.fy - 2, x1:g.fx + 3, y1:g.fy + 3 };
  for (let y = g.plaza.y0; y <= g.plaza.y1; y++) for (let x = g.plaza.x0; x <= g.plaza.x1; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA) continue;
    const o = world.objs[i]; if (o && o.key !== 'fire:camp') { if (OBJ[o.key][1] === 'tree') fallObj(i); world.objs[i] = null; }
    farmMap.delete(i); plazaSet.add(i); if (!(x === g.fx && y === g.fy)) pathMap.add(i);
  }
  composeRegion(g.plaza.x0 - 7, g.plaza.y0 - 11, g.plaza.x1 + 7, g.plaza.y1 + 12);
}
// Dónde dejar lo que traen: en la hoguera o en el almacén que les quede más cerca
// Solo se guarda en los almacenes: lo que traen va al más cercano (si aún no hay ninguno, a la hoguera)
function eatSpot(v, g){
  if (g.market != null && world.objs[g.market]) return { x:(g.market % W) * T + 2 + (Math.random() - .5) * 14, y:((g.market / W) | 0) * T + 3 + T + Math.random() * 3 };
  const [x, y] = dropSpot(v, g); return { x, y };
}
function dropSpot(v, g){
  const st = storesOf(g); let best = st.length ? null : fireSpot(v, g), bd = best ? 0 : Infinity;
  for (const i of storesOf(g)) { const x = (i % W) * T + 2, y = ((i / W) | 0) * T + 3 + T, d = Math.hypot(x - v.x, y - v.y); if (d < bd) { bd = d; best = [x, y]; } }
  return best || [g.fx * T + 2, g.fy * T + 5]; // (sin hoguera ni almacén a mano: el centro del pueblo)
}
function clampStore(g){
  const cap = capOf(g); g.food = Math.min(g.food, cap); g.wood = Math.min(g.wood, cap); g.stone = Math.min(g.stone, cap); g.meat = Math.min(g.meat || 0, g.food);
}
const penOverlap = (g, x0, y0, x1, y1) => villages.some(o => pensOf(o).some(p => !(x1 < p.x0 - 1 || x0 > p.x1 + 1 || y1 < p.y0 - 1 || y0 > p.y1 + 1)));
// ¿Esta casilla queda bajo el dibujo de una casa, pozo o molino de la aldea?
// Rejilla de casillas ocupadas por la huella de los edificios de todos los pueblos: se rehace solo si cambian
let ubCache = null, ubT = -1, ubGrid = null, ubSig = '';
function underBuilding(g, x, y){
  if (ubT !== yearT || !ubCache) {
    ubT = yearT; ubCache = villages.flatMap(buildingsOf);
    const sig = ubCache.length + ':' + ubCache.reduce((a, b) => (a + b * 31) % 1e9, 0);
    if (sig !== ubSig || !ubGrid || ubGrid.length !== N) {
      ubSig = sig; if (!ubGrid || ubGrid.length !== N) ubGrid = new Uint8Array(N); else ubGrid.fill(0);
      for (const h of ubCache) { const hx = h % W, hy = (h / W) | 0; for (let yy = Math.max(0, hy - 7); yy <= Math.min(H - 1, hy + 1); yy++) for (let xx = Math.max(0, hx - 5); xx <= Math.min(W - 1, hx + 5); xx++) ubGrid[yy * W + xx] = 1; }
    }
  }
  return x >= 0 && y >= 0 && x < W && y < H && ubGrid[y * W + x] === 1;
}
const STREETS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Solar que se puede despejar: tierra firme sin agua, y sin más estorbo que árboles o arbustos (que se talan)
function clearable(x0, y0, x1, y1){
  if (x0 < 0 || y0 < 0 || x1 >= W || y1 >= H) return false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, b = world.biome[i], o = world.objs[i];
    if (WATER[b] || b === B.LAVA || bridgeSet.has(i) || isFlooded(i)) return false;
    if (o && !['tree', 'berry'].includes(OBJ[o.key][1])) return false;
  }
  return true;
}
function clearSite(g, x0, y0, x1, y1){
  let n = 0;
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
    const i = y * W + x, o = world.objs[i];
    if (o && ['tree', 'berry'].includes(OBJ[o.key][1])) { if (OBJ[o.key][1] === 'tree') fallObj(i); world.objs[i] = null; n++; }
  }
  if (n) { g.wood += n; composeRegion(x0 - 7, y0 - 11, x1 + 7, y1 + 12); rareDirty = true; }
}
// Entre unos cuantos solares posibles, el que tiene el camino más corto (sin ríos por medio, a poder ser)
function bestSite(v, g, kind){
  let best = null, bl = Infinity;
  for (let k = 0; k < 4; k++) {
    const p = planSite(g, kind); if (!p) break;
    const r0 = routeTo(v, (p[1] + 1) * W + p[0]), r = r0 && !r0.partial ? r0 : null, len = r ? r.length + r.filter(([px, py]) => inWater(px, py)).length * 4 : Infinity;
    if (len < bl) { bl = len; best = p; }
    if (kind === 'ayuntamiento') break;
  }
  return best || planSite(g, kind);
}
// Tamaño de cada edificio (medio ancho y alto en casillas, por encima de su base): para que no se monten
const BUILD_DIMS = { altar:[1, 2], temple:[4, 7], obelisk:[1, 4], market:[4, 4], house:[4, 6], hall:[5, 7], mill:[3, 8], well:[2, 4], store:[4, 5], tower:[2, 7], quarry:[4, 4], fire:[1, 1], bank:[4, 5], wonder:[6, 10], forge:[3, 5], hospital:[4, 5], barracks:[5, 6], tradehall:[5, 6], theater:[6, 6], coliseum:[6, 6], tavern:[5, 5], cathedral:[6, 13], school:[5, 9], court:[4, 7], jail:[4, 6], press:[4, 6], union:[4, 6], parliament:[6, 8], academy:[4, 8], mine:[4, 5], university:[5, 9], council:[6, 9], spy:[4, 6], granary:[4, 6], smoke:[3, 5], woodshed:[3, 4], post:[4, 6] };
const KIND_DIMS = { altar:[1, 2], templo:[4, 7], mercado:[4, 4], casa:[4, 6], ayuntamiento:[5, 7], molino:[3, 8], pozo:[2, 4], almacen:[4, 5], torre:[2, 7], cantera:[4, 4], banco:[4, 5], maravilla:[6, 10], herreria:[3, 5], hospital:[4, 5], cuartel:[5, 6], lonja:[5, 6], teatro:[6, 6], coliseo:[6, 6], taberna:[5, 5], catedral:[6, 13], escuela:[5, 9], tribunal:[4, 7], carcel:[4, 6], imprenta:[4, 6], sindicato:[4, 6], parlamento:[6, 8], academia:[4, 8], mina:[4, 5], universidad:[5, 9], consejo:[6, 9], espias:[4, 6], granero:[4, 6], ahumadero:[3, 5], lenera:[3, 4], postas:[4, 6], chabola:[2, 4] };
const TASK_KIND = { templo:'templo', mercado:'mercado', construir:'casa', ayuntamiento:'ayuntamiento', molino:'molino', pozo:'pozo', almacen:'almacen', torre:'torre', cantera:'cantera', banco:'banco', maravilla:'maravilla', herreria:'herreria', hospital:'hospital', cuartel:'cuartel', lonja:'lonja', teatro:'teatro', coliseo:'coliseo', taberna:'taberna', catedral:'catedral', escuela:'escuela', tribunal:'tribunal', carcel:'carcel', imprenta:'imprenta', sindicato:'sindicato', parlamento:'parlamento', academia:'academia', mina:'mina', universidad:'universidad', consejo:'consejo', espias:'espias', granero:'granero', ahumadero:'ahumadero', lenera:'lenera', postas:'postas', chabola:'chabola' };
// ¿Choca con un edificio ya hecho o con uno que alguien está a punto de levantar? (skip: el propio solar)
function buildingClash(x, y, kind, skip){
  if (volcDanger(x, y)) return true; // ni en las faldas de un volcán ni sobre la lava (volcanes.js)
  const [hw, hh] = KIND_DIMS[kind] || [4, 5];
  const hit = (bx, by, d) => !(x + hw < bx - d[0] || x - hw > bx + d[0] || y + 1 < by - d[1] || y - hh > by + 1);
  for (const g of villages) for (const b of [...buildingsOf(g), g.fy * W + g.fx]) {
    if (b === skip) continue; const o = world.objs[b]; if (!o) continue;
    const d = BUILD_DIMS[o.key.split(':')[0]]; if (d && hit(b % W, (b / W) | 0, d)) return true;
  }
  if (penOverlap(null, x - hw, y - hh, x + hw, y + 1) || plotIn(x - hw, y - hh, x + hw, y + 1)) return true;
  if (wallSet.size) for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - hw; xx <= x + hw; xx++) if (wallSet.has(yy * W + xx)) return true; // ni encima de la muralla // ni encima de un cercado ni de una arboleda o bayal
  for (const v of villagers) {
    const t = v.task; if (!t || t.i == null || t.i === skip) continue;
    const k = TASK_KIND[t.k] || (t.k === 'trabajando' ? TASK_KIND[t.job] : null);
    if (k && hit(t.i % W, (t.i / W) | 0, KIND_DIMS[k])) return true;
  }
  return false;
}
function planSite(g, kind){
  const [hw, hh] = kind === 'molino' ? [4, 8] : kind === 'pozo' ? [2, 4] : kind === 'ayuntamiento' ? [5, 7] : kind === 'templo' ? [4, 7] : kind === 'mercado' ? [4, 4] : kind === 'catedral' ? [6, 13] : [4, 6];
  // El gran templo, junto a la plaza sagrada: al norte, mirando a ella, y si no cabe, a un lado o detrás.
  // Se aparta más cuanto más grande es (su huella sube 13 casillas desde la puerta)
  if (kind === 'catedral' && g.holy) {
    const h = g.holy, fits = (x, y) => x > hw && y > hh + 1 && x < W - hw - 1 && y < H - 3 && !buildingClash(x, y, kind) && !penOverlap(g, x - hw, y - hh, x + hw, y + 1)
      && !farmIn(x - hw, y - hh, x + hw, y + 1) && !plazaIn(x - hw, y - hh, x + hw, y) && !hallIn(g, x - hw, y - hh, x + hw, y + 1) && !pathIn(x - hw, y - hh, x + hw, y) && clearable(x - hw, y - hh, x + hw, y + 1);
    for (let gap = 1; gap <= 8; gap++) for (const [x, y] of [[h.cx, h.y0 - gap - 1], [h.x0 - hw - gap, h.cy + 2], [h.x1 + hw + gap, h.cy + 2], [h.cx, h.y1 + hh + gap]]) if (fits(x, y)) return [x, y];
  }
  // El ayuntamiento, presidiendo la plaza por el norte (con la puerta a ella)
  if (kind === 'ayuntamiento') { const x = g.fx, y = g.fy - 3; if (!buildingClash(x, y, kind) && !penOverlap(g, x - hw, y - hh, x + hw, y) && !farmIn(x - hw, y - hh, x + hw, y) && clearable(x - hw, y - hh, x + hw, y)) return [x, y]; }
  const ok = (x, y) => { const i = y * W + x; return x > hw && y > hh + 1 && x < W - hw - 1 && y < H - 3 && !farmMap.has(i) && !pathMap.has(i)
    && !penOverlap(g, x - hw, y - hh, x + hw, y + 1) && !plazaIn(x - hw, y - hh, x + hw, y) && (kind === 'ayuntamiento' || !hallIn(g, x - hw, y - hh, x + hw, y + 1)) && !farmIn(x - hw, y - hh, x + hw, y + 1) && !pathIn(x - hw, y - hh, x + hw, y) && clearable(x - hw, y - hh, x + hw, y + 1) && !buildingClash(x, y, kind === 'casa' ? 'casa' : kind); };
  // Pozos: lejos unos de otros (al menos 10 casillas), primero en la plaza y si no, por el pueblo (nunca en fila por una calle)
  const wellOk = (x, y) => wellsOf(g).every(w => Math.hypot((w.i % W) - x, ((w.i / W) | 0) - y) >= 10);
  if (kind === 'pozo') { for (const [x, y] of [[g.fx - 4, g.fy - 1], [g.fx + 4, g.fy - 1], [g.fx - 4, g.fy + 6], [g.fx + 4, g.fy + 6]]) if (ok(x, y) && wellOk(x, y)) return [x, y];
    return siteNear(g, 6, 20, (x, y) => ok(x, y) && wellOk(x, y) && !streetZone(g, x, y)); }
  const streetSlot = k => { for (const [dx, dy] of STREETS) {
    // Calles este-oeste: casas en fila al norte de la calle; calles norte-sur: a un lado y a otro
    const cands = dx ? [[g.fx + dx * (8 + k * 9), g.fy + 1]] : [[g.fx - 6, g.fy + dy * (10 + k * 7)], [g.fx + 6, g.fy + dy * (10 + k * 7)]];
    for (const [x, y] of cands) if (ok(x, y)) return [x, y];
  } return null; };
  const k0 = kind === 'molino' ? 2 : 0;
  for (let k = k0; k < 3; k++) { const p = streetSlot(k); if (p) return p; }
  // Las calles cercanas están ocupadas (roca, agua, campos…): un solar libre cerca, con la puerta hacia la aldea
  const rMax = Math.min(34, (kind === 'casa' ? 20 : 24) + Math.floor(popOf(g) / 4)); // el pueblo crece hacia fuera // los edificios grandes pueden quedar algo más lejos si el centro está lleno
  const near = siteNear(g, 7, rMax, (x, y) => ok(x, y) && !streetZone(g, x, y)) || siteNear(g, 7, rMax, (x, y) => ok(x, y) && !streetZone(g, x, y));
  if (near) return near;
  for (let k = Math.max(3, k0); k < 6; k++) { const p = streetSlot(k); if (p) return p; } // más lejos ya no se llega andando
  if (kind !== 'casa' && kind !== 'pozo') return siteNear(g, rMax, rMax + 12, ok); // los edificios grandes, a las afueras si hace falta
  return null;
}
// Camino de tierra de la puerta (debajo del edificio) a la hoguera: por la fila de la puerta y luego en vertical
// Camino de la puerta hasta la red de caminos (o la plaza): busca el recorrido más corto que no cruce agua
// (salvo por un puente), rodea rocas y edificios, evita los campos y se une a los caminos que ya hay, así que
// tuerce y serpentea según el terreno
// Casilla de la puerta de un edificio (la de justo debajo de su base): por ahí sí entra el camino
const buildingDoor = (g, i) => buildingsOf(g).some(b => b + W === i);
function pathTiles(g, sx, sy){
  const mr = g.marketRect, hr = g.holy, inR = (r, i) => r && (i % W) >= r.x0 && (i % W) <= r.x1 && ((i / W) | 0) >= r.y0 && ((i / W) | 0) <= r.y1, inM = i => inR(mr, i) || inR(hr, i);
  const s0 = sy * W + sx, goal = i => i !== s0 && !inM(i) && (pathMap.has(i) || plazaSet.has(i) || i === g.fy * W + g.fx);
  const cost = i => {
    const x = i % W, y = (i / W) | 0; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return Infinity;
    if (bridgeSet.has(i)) return 1; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || wallSet.has(i)) return Infinity;
    const o = world.objs[i]; if (o && !['tree', 'berry'].includes(OBJ[o.key][1]) && o.key !== 'fire:camp') return Infinity;
    if (villages.some(vg => underBuilding(vg, x, y) && !buildingDoor(vg, i))) return Infinity; // por debajo de un edificio, no
    return (o ? 4 : 1) + (farmMap.has(i) ? 6 : 0) + h2(x >> 1, y >> 1, 77) * .7; // algo de ruido: el camino serpentea
  };
  const gs = new Map([[s0, 0]]), par = new Map(), heap = [[0, s0]], hx = g.fx, hy = g.fy;
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (let n = 0; heap.length && n < 8000; n++) {
    const [, i] = pop();
    if (goal(i)) { const out = []; for (let j = i; j !== undefined; j = par.get(j)) out.push(j); return out; }
    const x = i % W, y = (i / W) | 0;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      const c = cost(j); if (c === Infinity) continue;
      const ng = gs.get(i) + c; if (ng < (gs.get(j) ?? Infinity)) { gs.set(j, ng); par.set(j, i); push(ng + Math.hypot((j % W) - hx, ((j / W) | 0) - hy) * .9, j); }
    }
  }
  return null;
}
function connect(g, x, y){
  // Si el camino pasa por un campo, ese trozo de campo se deja para el camino
  const mark = (a, b) => { const i = b * W + a; if (a >= 0 && b >= 0 && a < W && b < H && !WATER[world.biome[i]] && !(a === g.fx && b === g.fy)) { farmMap.delete(i); pathMap.add(i); if (wallSet.has(i)) { wallSet.delete(i); gateSet.add(i); } } };
  const dy = y + 1, route = pathTiles(g, x, dy);
  if (route) { for (const i of route) if (!bridgeSet.has(i)) mark(i % W, (i / W) | 0); return; }
  for (let a = Math.min(x, g.fx); a <= Math.max(x, g.fx); a++) mark(a, dy); // sin recorrido posible: en línea recta
  for (let b = Math.min(dy, g.fy); b <= Math.max(dy, g.fy); b++) mark(g.fx, b);
}
// Caminos, plazas y puentes cambian poco: se pintan en una capa aparte que se rehace solo cuando cambian
// (o cada pocos segundos, por la nieve) en vez de casilla a casilla en cada fotograma
let groundCv = null, groundSig = '', groundT = 0;
function groundSignature(){
  let q = 0; for (const g of villages) q = (q * 31 + (g.quarry ?? 7) + (g.holy ? g.holy.x0 * 3 : 0)) % 1e9;
  return [pathMap.size, plazaSet.size, holySet.size, wornSet.size, bridges.length, bridgeSet.size, q, snowA ? 1 : 0].join(',');
}
function drawGround(){
  if (!groundCv || groundCv.width !== PW || groundCv.height !== PH) { groundCv = document.createElement('canvas'); groundCv.width = PW; groundCv.height = PH; groundSig = ''; }
  const now = performance.now(), sig = groundSignature();
  if (sig !== groundSig || now - groundT > 15000) { // (la nieve sobre los caminos cambia despacio)
    groundSig = sig; groundT = now;
    const gc = groundCv.getContext('2d'), keep = vctx; gc.clearRect(0, 0, PW, PH);
    vctx = gc; vrOverride = [0, 0, PW - 1, PH - 1];
    try { paintPaths(); paintBridges('static'); } finally { vctx = keep; vrOverride = null; }
  }
  const [x0, y0, x1, y1] = visibleRect();
  vctx.drawImage(groundCv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
const drawPaths = () => drawGround(), drawBridges = () => paintBridges('live');
function paintPaths(){
  const [x0, y0, x1, y1] = visibleRect();
  // Alrededor de la cantera, el suelo lleno de grava y lascas de piedra
  for (const g of villages) {
    if (g.quarry == null || !world.objs[g.quarry]) continue;
    const qx = g.quarry % W, qy = (g.quarry / W) | 0;
    for (let y = qy - 5; y <= qy + 3; y++) for (let x = qx - 6; x <= qx + 6; x++) {
      const d = Math.hypot((x - qx) / 6, (y - qy + 1) / 4.5); if (d > 1) continue;
      const px = x * T, py = y * T; if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
      const k = 1 - d;
      for (let n = 0; n < 2 + k * 10; n++) { vctx.fillStyle = h2(x, y, 400 + n) > .5 ? 'rgba(168,164,154,.85)' : 'rgba(120,116,108,.75)'; vctx.fillRect(px + Math.floor(h2(x, y, 300 + n) * T), py + Math.floor(h2(x, y, 350 + n) * T), 1, 1); }
    }
  }
  // Hierba gastada: manchas de tierra que crecen cuanto más se pisa
  for (const i of wornSet) {
    if (pathMap.has(i)) continue;
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    const k = Math.min(1, wear[i] / 30), tx = i % W, ty = (i / W) | 0;
    vctx.fillStyle = `rgba(122,96,60,${.25 + .45 * k})`;
    for (let n = 0; n < 3 + k * 9; n++) vctx.fillRect(px + Math.floor(h2(tx, ty, 200 + n) * T), py + Math.floor(h2(tx, ty, 220 + n) * T), 1, 1);
  }
  if (!pathMap.size) return;
  for (const i of pathMap) {
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    if (holySet.has(i)) { drawHolyTile(i, px, py); snowTile(i, px, py); continue; } // plaza sagrada: a su manera
    if (plazaSet.has(i)) { // empedrado: adoquines en hileras alternas
      const tx = i % W, ty = (i / W) | 0;
      vctx.fillStyle = '#b0a898'; vctx.fillRect(px, py, T, T);
      vctx.fillStyle = '#8e877a'; vctx.fillRect(px, py + 2, T, 1); vctx.fillRect(px + ((tx + ty) % 2 ? 1 : 3), py, 1, 2); vctx.fillRect(px + ((tx + ty) % 2 ? 3 : 1), py + 3, 1, 2);
      vctx.fillStyle = '#c8c0b2'; vctx.fillRect(px + (i % 4), py + 1, 1, 1);
      snowTile(i, px, py);
      continue;
    }
  }
  // Caminos de tierra: ocupan toda la casilla y se unen con las vecinas, con un borde de tierra pisada que se
  // sale hacia la hierba (las esquinas quedan redondeadas), dos rodadas claras y alguna piedrecilla
  const isP = j => pathMap.has(j) || bridgeSet.has(j);
  const vis = [];
  for (const i of pathMap) {
    if (plazaSet.has(i)) continue;
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    const tx = i % W, L = tx > 0 && isP(i - 1), R = tx < W - 1 && isP(i + 1), U = isP(i - W), D = isP(i + W);
    vis.push([i, px, py, L, R, U, D]);
    // Borde de tierra pisada: se sale un píxel hacia la hierba (sin esquinas, para que quede redondeado)
    vctx.fillStyle = 'rgba(88,68,40,.38)';
    vctx.fillRect(px - 1, py, T + 2, T); vctx.fillRect(px, py - 1, T, T + 2);
  }
  for (const [i, px, py, L, R, U, D] of vis) {
    // Ancho de toda la casilla; las esquinas sin vecino se recortan
    vctx.fillStyle = '#a3855a'; vctx.fillRect(px, py + 1, T, T - 2); vctx.fillRect(px + 1, py, T - 2, T);
    if (L || U) vctx.fillRect(px, py, 1, 1); if (R || U) vctx.fillRect(px + T - 1, py, 1, 1);
    if (L || D) vctx.fillRect(px, py + T - 1, 1, 1); if (R || D) vctx.fillRect(px + T - 1, py + T - 1, 1, 1);
    vctx.fillStyle = '#b89a6c'; // dos rodadas claras a lo largo del camino
    if (L || R || !(U || D)) { vctx.fillRect(px + (L ? 0 : 1), py + 1, T - (L ? 0 : 1) - (R ? 0 : 1), 1); vctx.fillRect(px + (L ? 0 : 1), py + 3, T - (L ? 0 : 1) - (R ? 0 : 1), 1); }
    if (U || D) { vctx.fillRect(px + 1, py + (U ? 0 : 1), 1, T - (U ? 0 : 1) - (D ? 0 : 1)); vctx.fillRect(px + 3, py + (U ? 0 : 1), 1, T - (U ? 0 : 1) - (D ? 0 : 1)); }
    const tx = i % W, ty = (i / W) | 0;
    if (h2(tx, ty, 301) < .35) { vctx.fillStyle = '#7d6446'; vctx.fillRect(px + 1 + Math.floor(h2(tx, ty, 302) * 3), py + 1 + Math.floor(h2(tx, ty, 303) * 3), 1, 1); }
    snowTile(i, px, py);
  }
}
// ---- Puentes sobre los ríos (para no tener que nadar ni dar rodeos) y muelles para las barcas ----
const openWater = i => WATER[world.biome[i]] && !bridgeSet.has(i) && !dried(i) && !frozen(i);
// Agua que se puede cruzar con un puente: río o lago (no el mar)
const bridgeable = i => openWater(i) && (world.biome[i] === B.RIVER || world.biome[i] === B.LAKE);
function bridgeSite(g){
  // Primero por donde más cruza la gente (y los vecinos de ese punto, por si ahí es demasiado ancho)
  const hot = g.crossings ? [...g.crossings].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];
  const cands = [];
  for (const [i] of hot) for (let dy2 = -3; dy2 <= 3; dy2++) for (let dx2 = -3; dx2 <= 3; dx2++) cands.push([(i % W) + dx2, ((i / W) | 0) + dy2]);
  for (let k = 0; k < 120; k++) { const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 24; cands.push([Math.round(g.fx + Math.cos(a) * d), Math.round(g.fy + Math.sin(a) * d * .8)]); }
  for (const [x, y] of cands) {
    if (x < 8 || y < 8 || x >= W - 8 || y >= H - 8 || !bridgeable(y * W + x)) continue;
    if (bridges.some(b => Math.hypot(b.cx - x, b.cy - y) < 10)) continue; // ya hay uno cerca
    // Recto o en diagonal: el que salga más corto
    let best = null;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let a1 = 0, b1 = 0;
      while (a1 < 6 && bridgeable((y - dy * (a1 + 1)) * W + x - dx * (a1 + 1))) a1++;
      while (b1 < 6 && bridgeable((y + dy * (b1 + 1)) * W + x + dx * (b1 + 1))) b1++;
      const len = a1 + b1 + 1, diag = dx && dy; if (len > (diag ? 4 : 5)) continue;
      const sx = x - dx * (a1 + 1), sy = y - dy * (a1 + 1), ex = x + dx * (b1 + 1), ey = y + dy * (b1 + 1);
      if (!tileFree(sx, sy) || !tileFree(ex, ey)) continue;
      // Se anda por una fila de casillas; el dibujo es más ancho y centrado sobre ella (ver drawBridges). En diagonal
      // se añade la casilla de al lado en cada paso (en escalera): sin cortar esquinas, si no, no se podría cruzar
      const core = [], tiles = [];
      for (let k2 = -a1 - (diag ? 1 : 0); k2 <= b1; k2++) {
        const j = (y + dy * k2) * W + x + dx * k2;
        if (k2 >= -a1) { core.push(j); tiles.push(j); }
        if (diag) { const c = (y + dy * k2) * W + x + dx * (k2 + 1); if (bridgeable(c) || tileFree(c % W, (c / W) | 0)) tiles.push(c); else { tiles.length = 0; break; } }
      }
      if (!tiles.length) continue;
      const cost = len + (diag ? 100 : 0); // en diagonal solo si recto no hay manera
      if (!best || cost < best.cost) best = { tiles, core, h:!!dx && !dy, diag:!!diag, sx, sy, ex, ey, len, cx:x, cy:y, wide:true, cost };
    }
    if (best) return best;
  }
  return null;
}
// Muelle: tierra en la orilla con agua abierta delante (mar o lago)
function portSite(g){
  const p = ringFind(g.fx, g.fy, 25, (x, y) => tileFree(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    for (let k = 1; k <= 9; k++) { const xx = x + dx * k, yy = y + dy * k, b = world.biome[yy * W + xx]; if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1 || !openWater(yy * W + xx) || b === B.RIVER) return false; }
    return true;
  }));
  if (!p) return null;
  const [x, y] = p, [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { for (let k = 1; k <= 9; k++) { const xx = x + dx * k, yy = y + dy * k; if (!openWater(yy * W + xx) || world.biome[yy * W + xx] === B.RIVER) return false; } return true; });
  // Cuatro tablones mar adentro, siempre de dos de ancho (hacia el lado donde haya agua), y al final un travesaño en T
  const px = dy, py = dx, tiles = [];
  const side = openWater((y + dy + py) * W + x + dx + px) ? 1 : -1;
  for (let k = 1; k <= 4; k++) for (const w of [0, side]) { const j = (y + dy * k + py * w) * W + x + dx * k + px * w; if (openWater(j)) tiles.push(j); }
  const ex = x + dx * 4, ey = y + dy * 4;
  for (const w of [-2, -1, 2, 3].map(w => side < 0 ? w - 1 : w)) { const j = (ey + py * w) * W + ex + px * w; if (openWater(j)) tiles.push(j); }
  // La barca, amarrada pegada al muelle: el hueco de agua más cercano a la punta donde quepa entera (5×2 casillas) sin pisarlo
  const fits = (cx, cy) => { for (let b = cy - 1; b <= cy; b++) for (let a = cx - 2; a <= cx + 2; a++) { const j = b * W + a; if (!openWater(j) || tiles.includes(j)) return false; } return true; };
  let moor = null, md = Infinity;
  for (const t of tiles) for (let b = -3; b <= 3; b++) for (let a = -4; a <= 4; a++) {
    const cx = (t % W) + a, cy = ((t / W) | 0) + b; if (cx < 3 || cy < 2 || cx >= W - 3 || cy >= H - 1 || !fits(cx, cy)) continue;
    const touch = [[0, 1], [0, -2], [3, 0], [-3, 0], [3, -1], [-3, -1]].some(([u, w2]) => tiles.includes((cy + w2) * W + cx + u)) || tiles.some(j => Math.abs((j % W) - cx) <= 2 && (((j / W) | 0) === cy + 1 || ((j / W) | 0) === cy - 2));
    const d = Math.hypot(cx - ex, cy - ey) + (touch ? 0 : 6);
    if (d < md) { md = d; moor = cy * W + cx; }
  }
  moor ??= (y + dy * 8) * W + x + dx * 8;
  return { sx:x, sy:y, dx, dy, tiles, end:ey * W + ex, launch:(y + 7 * dy) * W + x + 7 * dx, moor };
}
function fishingSpot(g){
  const P = g.port, lx = (P.launch % W) * T + 2, ly = ((P.launch / W) | 0) * T + 3, base = Math.atan2(P.dy, P.dx);
  for (let k = 0; k < 30; k++) {
    const a = base + (Math.random() - .5) * 2.2, d = (5 + Math.random() * 10) * T;
    let ok = true;
    for (let st = 0; st <= d && ok; st += 2) { const x = lx + Math.cos(a) * st, y = ly + Math.sin(a) * st; if (x < 0 || y < 0 || x >= PW || y >= PH || !openWater(Math.floor(y / T) * W + Math.floor(x / T))) ok = false; }
    if (ok) return [lx + Math.cos(a) * d, ly + Math.sin(a) * d];
  }
  return null;
}
function paintBridges(part){
  if (!bridges.length) return;
  const [x0, y0, x1, y1] = visibleRect();
  if (part !== 'static') for (const g of villages) if (g.port && !g.boatOut) { // la barca amarrada junto al muelle
    const i = g.port.moor ?? g.port.launch, px = (i % W) * T + 2, py = ((i / W) | 0) * T + 3;
    if (dried(i) || frozen(i)) continue; // varada en el barro: no se pinta flotando
    if (px < x0 - 16 || px > x1 + 16 || py < y0 - 10 || py > y1 + 10) continue;
    drawBoat(px, py, g.port.dx || 1, performance.now(), false);
  }
  if (part !== 'live') for (const b of bridges) if (b.wide && b.diag) {
    const ax = b.sx * T + 2, ay = b.sy * T + 2, bx = b.ex * T + 2, by = b.ey * T + 2;
    if (Math.max(ax, bx) < x0 - 8 || Math.min(ax, bx) > x1 + 8 || Math.max(ay, by) < y0 - 8 || Math.min(ay, by) > y1 + 8) continue;
    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
    const px = (sx2, w2, col) => { vctx.fillStyle = col; vctx.fillRect(Math.round(ax + ux * sx2 + nx * w2), Math.round(ay + uy * sx2 + ny * w2), 1, 1); };
    for (let s2 = 0; s2 <= L; s2 += .5) for (let w2 = -4; w2 <= 4; w2 += .5) px(s2 + 1, w2 + 1.5, 'rgba(0,0,0,.18)'); // sombra en el agua
    for (let s2 = 0; s2 <= L; s2 += .5) for (let w2 = -4; w2 <= 4; w2 += .5) {
      const edge = Math.abs(w2) > 3.4, seam = Math.floor(s2) % 2 === 0 && Math.abs(w2) < 3.4;
      px(s2, w2, edge ? '#4a3018' : seam ? '#7a5030' : '#9a6a3e');
    }
    for (const s2 of [0, L]) for (const w2 of [-4.5, 4.5]) { px(s2, w2, '#3a2414'); px(s2, w2 - .5 * Math.sign(w2), '#3a2414'); } // postes en las orillas
  }
  if (part !== 'live') for (const b of bridges) if (b.wide && !b.diag) {
    // Puente: tablero de 9 píxeles de ancho centrado en su fila, que entra un poco en cada orilla, con barandillas
    const n = b.tiles.length;
    b.tiles.forEach((i, k) => {
      const px = (i % W) * T, py = ((i / W) | 0) * T;
      if (px + T < x0 - 4 || px > x1 + 4 || py + T < y0 - 4 || py > y1 + 4) return;
      const a0 = k === 0 ? -2 : 0, a1 = k === n - 1 ? 2 : 0; // los extremos se apoyan en la orilla
      if (ART.ready && artPattern(b.h ? 'tex:puente_h' : 'tex:puente_v')) { // el dibujo: tablero con barandillas
        vctx.fillStyle = 'rgba(0,0,0,.25)';
        if (b.h) { vctx.fillRect(px + a0, py + T + 2, T - a0 + a1, 2); artFill(vctx, 'tex:puente_h', px + a0, py - 2, T - a0 + a1, 9, 0, py - 2); }
        else { vctx.fillRect(px + T + 2, py + a0, 2, T - a0 + a1); artFill(vctx, 'tex:puente_v', px - 2, py + a0, 9, T - a0 + a1, px - 2, 0); }
        return;
      }
      if (b.h) {
        vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px + a0, py + T + 2, T - a0 + a1, 2);
        vctx.fillStyle = '#9a6a3e'; vctx.fillRect(px + a0, py - 2, T - a0 + a1, T + 4);
        vctx.fillStyle = '#7a5030'; for (let q = px + a0 + 1; q < px + T + a1; q += 2) vctx.fillRect(q, py - 1, 1, T + 2);
        vctx.fillStyle = '#4a3018'; vctx.fillRect(px + a0, py - 3, T - a0 + a1, 1); vctx.fillRect(px + a0, py + T + 2, T - a0 + a1, 1);
        if (k === 0 || k === n - 1) { vctx.fillStyle = '#3a2414'; const ex2 = k === 0 ? px + a0 : px + T + a1 - 1; vctx.fillRect(ex2, py - 5, 1, 3); vctx.fillRect(ex2, py + T + 2, 1, 3); } // postes
      } else {
        vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px + T + 2, py + a0, 2, T - a0 + a1);
        vctx.fillStyle = '#9a6a3e'; vctx.fillRect(px - 2, py + a0, T + 4, T - a0 + a1);
        vctx.fillStyle = '#7a5030'; for (let q = py + a0 + 1; q < py + T + a1; q += 2) vctx.fillRect(px - 1, q, T + 2, 1);
        vctx.fillStyle = '#4a3018'; vctx.fillRect(px - 3, py + a0, 1, T - a0 + a1); vctx.fillRect(px + T + 2, py + a0, 1, T - a0 + a1);
        if (k === 0 || k === n - 1) { vctx.fillStyle = '#3a2414'; const ey2 = k === 0 ? py + a0 : py + T + a1 - 1; vctx.fillRect(px - 4, ey2 - 2, 2, 3); vctx.fillRect(px + T + 2, ey2 - 2, 2, 3); }
      }
    });
  }
  if (part !== 'live') for (const b of bridges) if (!b.wide) for (const i of b.tiles) {
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px + 1, py + 1, T, T);          // sombra en el agua
    if (ART.ready && (b.h ? artFill(vctx, 'tex:puente_h5', px, py, T, T, 0, py) : artFill(vctx, 'tex:puente_v5', px, py, T, T, px, 0))) continue; // el dibujo
    vctx.fillStyle = '#9a6a3e'; vctx.fillRect(px, py, T, T);                            // tablones
    vctx.fillStyle = '#7a5030';
    if (b.h) { vctx.fillRect(px + 1, py, 1, T); vctx.fillRect(px + 3, py, 1, T); } else { vctx.fillRect(px, py + 1, T, 1); vctx.fillRect(px, py + 3, T, 1); }
    const on = j => b.tiles.includes(j) || pathMap.has(j); vctx.fillStyle = '#4a3018';
    if (b.h) { if (!on(i - W)) vctx.fillRect(px, py, T, 1); if (!on(i + W)) vctx.fillRect(px, py + T - 1, T, 1); }
    else { if (!on(i - 1)) vctx.fillRect(px, py, 1, T); if (!on(i + 1)) vctx.fillRect(px + T - 1, py, 1, T); }
  }
  // Muelles: postes que asoman bajo la tarima, noray con cuerda y un banderín con el color de la aldea
  const now = performance.now();
  if (part !== 'static') for (const b of bridges) if (b.pier) {
    for (const i of b.tiles) {
      const px = (i % W) * T, py = ((i / W) | 0) * T;
      if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
      const on = j => b.tiles.includes(j);
      vctx.fillStyle = '#3a2414';
      if (!on(i - W)) vctx.fillRect(px, py, T, 1); if (!on(i + W)) vctx.fillRect(px, py + T - 1, T, 1);
      if (!on(i - 1)) vctx.fillRect(px, py, 1, T); if (!on(i + 1)) vctx.fillRect(px + T - 1, py, 1, T);
      vctx.fillRect(px, py + T, 1, 2); vctx.fillRect(px + T - 1, py + T, 1, 2);
      vctx.fillStyle = 'rgba(225,242,255,.5)'; vctx.fillRect(px - 1, py + T + 2, 3, 1); vctx.fillRect(px + T - 2, py + T + 2, 3, 1);
    }
    const g = villageById(b.vid); if (!g || !g.port) continue;
    const e = g.port.end, ex = (e % W) * T + 2, ey = ((e / W) | 0) * T + 2;
    if (ex < x0 - 20 || ex > x1 + 20 || ey < y0 - 24 || ey > y1 + 6) continue;
    vctx.fillStyle = '#3a2414'; vctx.fillRect(ex + 1, ey, 2, 2); vctx.fillStyle = '#c8b890'; vctx.fillRect(ex, ey + 1, 1, 1); // noray con cuerda
    // Mástil en la punta de un brazo de la T (o al final), con su sombra y un banderín que ondea
    const arm = b.tiles[b.tiles.length - 1], mx = (arm % W) * T + 2, my = ((arm / W) | 0) * T + 3;
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(mx + 1, my + 1, 6, 1);
    vctx.fillStyle = '#4a2e18'; vctx.fillRect(mx, my - 17, 1, 18); vctx.fillStyle = '#7a5030'; vctx.fillRect(mx - 1, my - 18, 3, 1);
    const [r, g2, bl] = villageColor(g), ph = Math.floor(now / 220) % 3;
    vctx.fillStyle = `rgb(${r},${g2},${bl})`;
    vctx.fillRect(mx + 1, my - 17, 5, 1); vctx.fillRect(mx + 1, my - 16 + (ph === 1 ? 1 : 0), 6, 1); vctx.fillRect(mx + 1, my - 15, 5 - ph, 1); vctx.fillRect(mx + 1, my - 14, 3, 1);
    vctx.fillStyle = 'rgba(255,255,255,.35)'; vctx.fillRect(mx + 1, my - 17, 2, 1);
  }
}
function drawBoat(x, y, d, now, rowing, s){
  const bob = Math.round(Math.sin(now / 400 + x) * .5), by = y + bob;
  if (rowing) { vctx.fillStyle = 'rgba(235,248,255,.55)'; for (let k = 0; k < 6; k++) vctx.fillRect(x - d * (15 + k * 3), by - 1 + ((Math.floor(now / 150) + k) % 2) - (k > 2 ? 0 : 1), 3, 1); } // estela
  vctx.fillStyle = 'rgba(0,0,0,.22)'; vctx.fillRect(x - 11, by + 1, 23, 1);                                         // sombra en el agua
  vctx.fillStyle = 'rgba(225,242,255,.45)'; vctx.fillRect(x - 14, by, 29, 1);                                       // espuma en la línea de flotación
  const sx = x - d * 2;
  if (s) { const hh = s.height - 3; vctx.drawImage(s, 0, 0, s.width, hh, sx - (s.width >> 1), by - 4 - hh, s.width, hh); } // sentado: asoma de cintura para arriba
  const fr = artFrame(`boat:${rowing ? Math.floor(now / 110) % 8 : 0}`);
  if (fr) { // el dibujo, con sus remos, medio hundido: lo de debajo de la línea de flotación se ve a través del agua
    const sink = Math.round(fr.height * .42), wl = by + 1;
    vctx.save(); vctx.translate(x, wl + sink); if (d < 0) vctx.scale(-1, 1);
    vctx.drawImage(fr, 0, 0, fr.width, fr.height - sink, -(fr.width >> 1), -fr.height, fr.width, fr.height - sink);
    vctx.globalAlpha = .3; vctx.drawImage(fr, 0, fr.height - sink, fr.width, sink, -(fr.width >> 1), -sink, fr.width, sink); vctx.restore();
    vctx.fillStyle = 'rgba(225,242,255,.6)'; vctx.fillRect(x - (fr.width >> 1) + 1, wl, fr.width - 2, 1); return; }
  vctx.fillStyle = '#3a2414'; vctx.fillRect(x - 11, by - 6, 23, 1);                                                 // borda
  vctx.fillStyle = '#b8844e'; vctx.fillRect(x - 12, by - 5, 25, 1);
  vctx.fillStyle = '#8a5a30'; vctx.fillRect(x - 12, by - 4, 25, 1);
  vctx.fillStyle = '#7a5030'; vctx.fillRect(x - 11, by - 3, 23, 1);
  vctx.fillStyle = '#5e3c20'; vctx.fillRect(x - 10, by - 2, 21, 1);
  vctx.fillStyle = '#4a2e18'; vctx.fillRect(x - 8, by - 1, 17, 1);
  vctx.fillStyle = '#6a4426'; for (let k = -8; k <= 8; k += 4) vctx.fillRect(x + k, by - 4, 1, 2);                  // cuadernas
  vctx.fillStyle = '#3a2414'; vctx.fillRect(x + d * 12, by - 8, 2, 3); vctx.fillRect(x + d * 13, by - 9, 1, 1); vctx.fillRect(x - d * 13, by - 6, 1, 2); // proa alzada y popa
  if (s) { // el remo, de las manos al agua, por delante del casco
    const ph = rowing ? Math.sin(now / 220) : -.3, hx = sx + d, hy = by - 9, ex = Math.round(sx - d * (7 + ph * 4)), ey = by + 1;
    vctx.fillStyle = '#d8b07a'; for (let k = 0; k <= 10; k++) vctx.fillRect(Math.round(hx + (ex - hx) * k / 10), Math.round(hy + (ey - hy) * k / 10), 1, 1);
    vctx.fillStyle = '#9a7448'; vctx.fillRect(ex - 1, ey, 3, 1); // la pala, en el agua
  }
}
// Montar y desmontar (el caballo vuelve solo al cercado); el carro va enganchado al caballo
function dismount(v){ if (v.mount) { v.mount.rider = null; v.mount = null; } v.cart = false; }
function maybeRide(v, g){
  const t = v.task; if (!t || v.mount || !(g.know || {}).montar || t.x == null || t.k === 'pasear' || t.k === 'barca') return;
  if (Math.hypot(t.x - v.x, t.y - v.y) < 16 * T) return; // para ir cerca no merece la pena
  const horse = penAnimals(g).find(a => a.sp === 'caballo' && !a.rider && !a.lead && (yearT - a.born) / YEAR >= ADULT);
  if (horse) v.task = { k:'montar', a:horse, next:t };
}
function drawCart(cx, y, d, now, load){
  vctx.fillStyle = '#5e3c20'; vctx.fillRect(cx - 4, y - 8, 9, 1); vctx.fillRect(cx + d * 5, y - 6, 1, 1); vctx.fillRect(cx + d * 6, y - 5, 1, 1); // borde y varas
  vctx.fillStyle = '#8a5a30'; vctx.fillRect(cx - 4, y - 7, 9, 3);
  if (load) { vctx.fillStyle = load; vctx.fillRect(cx - 3, y - 9, 7, 2); }
  vctx.fillStyle = '#3a2414'; vctx.fillRect(cx - 1, y - 4, 3, 3);
  vctx.fillStyle = '#9a7a58'; vctx.fillRect(cx + (Math.floor(now / 140) % 2 ? 0 : 1) - (Math.floor(now / 140) % 2 ? 0 : 1), y - 3, 1, 1);
}
// Pozos: se llenan cuando llueve y de ellos beben y riegan los campos de alrededor
const wellsOf = g => (g.wells ||= []).filter(w => world.objs[w.i] && world.objs[w.i].key === 'well:pozo');
function drinkSpot(v, g){
  const tx = Math.floor(v.x / T), ty = Math.floor(v.y / T), p = waterSpot(tx, ty, v);
  let best = null, bd = Infinity;
  for (const w of wellsOf(g)) { if (w.q < .05) continue; const d = Math.hypot((w.i % W) - tx, ((w.i / W) | 0) - ty); if (d < bd) { bd = d; best = w; } }
  if (best && bd <= (p ? Math.hypot(p[0] / T - tx, p[1] / T - ty) : Infinity) + 6) { const sb = standBy(best.i); if (sb) return { x:sb[0], y:sb[1], well:best }; }
  const far = !p || Math.hypot(p[0] / T - tx, p[1] / T - ty) > 9;
  if (far) { g.thirsty = yearT; const kn = g.know ||= {}; if (!kn.pozo) { kn.pozo = kn.molino = true; notify(`En ${g.name} el agua queda lejos o se ha secado: aprenden a cavar pozos`, { x:g.fx * T, y:g.fy * T }); } } else if (g.thirsty && yearT - g.thirsty > DAY_LEN) g.thirsty = 0;
  if ((g.cups || 0) >= 1 && g.market != null && world.objs[g.market]) {
    const mx = g.market % W, my = (g.market / W) | 0, dm = Math.hypot(mx - tx, my - ty), dp = p ? Math.hypot(p[0] / T - tx, p[1] / T - ty) : Infinity;
    if (dm + 3 < dp && dm < 30) { const sb = standBy(g.market); if (sb) return { x:sb[0], y:sb[1], cup:true }; }
  }
  if (far && (g.jars || 0) >= 1 && (!p || Math.hypot(tx - g.fx, ty - g.fy) < 30)) { const [sx, sy] = fireSpot(v, g); return { x:sx, y:sy, jar:true }; } // sin agua a mano: a las tinajas del pueblo
  if (!p && best) { const sb = standBy(best.i); if (sb) return { x:sb[0], y:sb[1], well:best }; } // o al pozo, aunque quede lejos
  return p ? { x:p[0], y:p[1] } : null;
}
function wellWater(g, i, dt){
  const x = i % W, y = (i / W) | 0;
  for (const w of wellsOf(g)) if (w.q > .1 && Math.hypot((w.i % W) - x, ((w.i / W) | 0) - y) < 9) { w.q -= .0004 * dt; return true; }
  return false;
}
function drawWellsMills(g, t){
  for (const w of wellsOf(g)) {
    if (w.q < .03) continue;
    const o = world.objs[w.i], s = objSprite(o), l = (w.i % W) * T + 2 + o.ox - s.ax, top = ((w.i / W) | 0) * T + 3 + o.oy - s.height + 1;
    vctx.fillStyle = `rgba(70,130,205,${.35 + .6 * w.q})`; vctx.fillRect(l + 4, top + 14, 10, 2);
    redrawFront(l, l + s.width, top, ((w.i / W) | 0) * T + 3 + o.oy);
  }
  if (g.mill != null && world.objs[g.mill] && world.objs[g.mill].key === 'mill:molino') {
    const o = world.objs[g.mill], s = objSprite(o), mx = (g.mill % W) * T + 2 + o.ox, base = ((g.mill / W) | 0) * T + 3 + o.oy;
    const asp = artFrame('mill:aspas'), hx = asp ? mx - s.ax + (s.width >> 1) : mx - s.ax + 12, hy = asp ? base - s.height + Math.round(s.height * .3) : base - s.height + 11, [wx, wy] = windAt(hx, hy);
    const dtf = Math.min(.1, (t - (g.millT ?? t)) / 1000); g.millT = t;
    g.millA = (g.millA || 0) + dtf * (.6 + Math.min(3, Math.hypot(wx, wy) * .25)); // aspas: giran más con más viento
    if (asp) millSails.push([asp, hx, hy, g.millA]); // las aspas se pintan al final, por delante de la torre y de la gente (ver drawMillSails)
    else for (let b = 0; b < 4; b++) {
      const a = g.millA + b * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
      for (let k = 1; k <= 20; k++) {
        vctx.fillStyle = '#4a3018'; vctx.fillRect(Math.round(hx + c * k), Math.round(hy + sn * k), 1, 1);
        if (k >= 6) { vctx.fillStyle = k === 20 ? '#c8bc9c' : '#ece0c4'; for (let w = 1; w <= 4; w++) vctx.fillRect(Math.round(hx + c * k - sn * w), Math.round(hy + sn * k + c * w), 1, 1); }
      }
    }
    if (!asp) { vctx.fillStyle = '#2a1a10'; vctx.fillRect(hx - 1, hy - 1, 2, 2); redrawFront(hx - 22, hx + 22, hy - 22, base); }
  }
}
// ---- Territorio de cada aldea (como los reinos): crece con su gente y sus casas, e incluye sus campos ----
let zoneCv = null, zoneT = 0, zoneOwn = null, zoneLive = [];
const nationOf = g => (g && g.nation && g.nation !== g.id && villageById(g.nation)) || g;
const sameNation = (a, b) => nationOf(a) === nationOf(b);
function villageColor(g){
  if (g.nation && g.nation !== g.id && villageById(g.nation)) return villageColor(villageById(g.nation)); // las provincias llevan el color de su nación
  if (g.col) return g.col;
  // Un color al azar para cada aldea, lo más distinto posible de los de las demás
  let h = 0, bestGap = -1;
  for (let k = 0; k < 12; k++) {
    const c = Math.random() * 360, gap = Math.min(360, ...villages.filter(o => o !== g && o.hue != null).map(o => { const d = Math.abs(o.hue - c) % 360; return Math.min(d, 360 - d); }));
    if (gap > bestGap) { bestGap = gap; h = c; }
  }
  g.hue = h;
  const f = k => { const a = .62 * Math.min(.5, 1 - .5); const kk = (k + h / 30) % 12; return .5 - a * Math.max(-1, Math.min(kk - 3, 9 - kk, 1)); };
  return g.col = [f(0) * 255 | 0, f(8) * 255 | 0, f(4) * 255 | 0];
}
function buildZones(){
  const live = villages.filter(g => popOf(g) > 0 && world.objs[g.fy * W + g.fx]);
  if (!live.length) { zoneCv = null; return; }
  const own = new Int16Array(N), best = new Float32Array(N).fill(9);
  // Empieza pequeño (la hoguera y poco más) y se extiende alrededor de lo que van construyendo:
  // cada casa, pozo, molino o cantera, sus campos y el cercado suman su trozo de tierra
  live.forEach((g, k) => {
    const src = [[g.fx, g.fy, Math.min(16, 6 + popOf(g) * .3)]];
    for (const h of housesOf(g)) src.push([h % W, (h / W) | 0, 5]);
    for (const w of wellsOf(g)) src.push([w.i % W, (w.i / W) | 0, 4]);
    for (const b of [g.mill, g.quarry]) if (b != null && world.objs[b]) src.push([b % W, (b / W) | 0, 5]);
    for (const f of farmMap.values()) if (f.vid === g.id) src.push([f.i % W, (f.i / W) | 0, 2.5]);
    for (const p of pensOf(g)) src.push([(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 5]);
    if (g.hall != null && world.objs[g.hall]) src.push([g.hall % W, (g.hall / W) | 0, 10]);
    for (const i of storesOf(g)) src.push([i % W, (i / W) | 0, 5]);
    for (const i of towersOf(g)) src.push([i % W, (i / W) | 0, 7]);
    for (const i of pathMap) { const x = i % W, y = (i / W) | 0; if (Math.abs(x - g.fx) < 50 && Math.abs(y - g.fy) < 50) src.push([x, y, 1.8]); }
    if (g.wallRect) { const r = g.wallRect; src.push([(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, Math.hypot(r.x1 - r.x0, r.y1 - r.y0) / 2 + 1]); }
    for (const [sx, sy, R] of src)
      for (let y = Math.max(0, Math.floor(sy - R)); y <= Math.min(H - 1, Math.ceil(sy + R)); y++)
        for (let x = Math.max(0, Math.floor(sx - R)); x <= Math.min(W - 1, Math.ceil(sx + R)); x++) {
          const i = y * W + x, d = Math.hypot(x - sx, y - sy) / R * (.9 + .2 * h2(x >> 1, y >> 1, g.id)); // borde algo irregular
          if (d < 1 && d < best[i] && world.biome[i] !== B.DEEP && world.biome[i] !== B.SEA) { best[i] = d; own[i] = k + 1; }
        }
  });
  // Cierre: se extiende 3 casillas y luego se recorta otras 3, así los huecos y pasillos estrechos quedan dentro
  const orig = own.slice(), isSea = i => world.biome[i] === B.DEEP || world.biome[i] === B.SEA;
  for (let it = 0; it < 3; it++) { const nx = own.slice(); for (let i = W + 1; i < N - W - 1; i++) { if (own[i] || isSea(i)) continue; const a = own[i - 1] || own[i + 1] || own[i - W] || own[i + W]; if (a) nx[i] = a; } own.set(nx); }
  for (let it = 0; it < 3; it++) { const nx = own.slice(); for (let i = W + 1; i < N - W - 1; i++) { if (!own[i] || orig[i]) continue; if (!own[i - 1] || !own[i + 1] || !own[i - W] || !own[i + W]) nx[i] = 0; } own.set(nx); }
  zoneOwn = own; zoneLive = live;
  if (!zoneCv || zoneCv.width !== W || zoneCv.height !== H) { zoneCv = document.createElement('canvas'); zoneCv.width = W; zoneCv.height = H; }
  const zc = zoneCv.getContext('2d'), img = zc.createImageData(W, H), D = img.data;
  for (let i = 0; i < N; i++) {
    const k = own[i]; if (!k) continue;
    const x = i % W, y = (i / W) | 0, [r, g2, b] = villageColor(live[k - 1]);
    // Borde fino (una casilla) y relleno bien visible
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || own[i - 1] !== k || own[i + 1] !== k || own[i - W] !== k || own[i + W] !== k;
    const o = i * 4; D[o] = r; D[o + 1] = g2; D[o + 2] = b; D[o + 3] = edge ? 210 : 70;
  }
  zc.putImageData(img, 0, 0);
}
function drawZones(){
  if (!params.zones || !zoneCv) return;
  vctx.globalAlpha = zoom < 2.5 ? 1 : Math.max(.35, 1 - (zoom - 2.5) * .15); // de cerca, más discreto
  vctx.imageSmoothingEnabled = false; vctx.drawImage(zoneCv, 0, 0, PW, PH); vctx.globalAlpha = 1;
}
// Nombre de cada aldea sobre su hoguera, que se lea a cualquier distancia
function natCol(v){ const g = villageById(v.vid); if (!g) return '#888'; const n = nationOf(g), [r, g2, b] = villageColor(n); return `rgb(${r},${g2},${b})`; }
// Guerras en el mapa: una línea roja discontinua entre los pueblos en guerra, con espadas cruzadas en medio
function drawWarLines(now){
  if (zoom > 4) return;
  vctx.save(); vctx.lineWidth = Math.max(1, 2 / zoom); vctx.setLineDash([6 / zoom * 2, 4 / zoom * 2]); vctx.lineDashOffset = -now / 60;
  for (const r of rels.values()) {
    if (!r.war) continue; const a = villageById(r.war.att), b = villageById(r.war.def); if (!a || !b || !popOf(a) || !popOf(b)) continue;
    const ax = a.fx * T, ay = a.fy * T, bx = b.fx * T, by = b.fy * T;
    vctx.strokeStyle = `rgba(230,60,50,${.55 + .25 * Math.sin(now / 300)})`; vctx.beginPath(); vctx.moveTo(ax, ay); vctx.lineTo(bx, by); vctx.stroke();
    const mx = (ax + bx) / 2, my = (ay + by) / 2, k = Math.max(1, 3 / zoom);
    vctx.setLineDash([]); vctx.strokeStyle = '#f0e0c8'; vctx.lineWidth = k; vctx.beginPath(); vctx.moveTo(mx - 4 * k, my - 4 * k); vctx.lineTo(mx + 4 * k, my + 4 * k); vctx.moveTo(mx + 4 * k, my - 4 * k); vctx.lineTo(mx - 4 * k, my + 4 * k); vctx.stroke();
    vctx.setLineDash([6 / zoom * 2, 4 / zoom * 2]); vctx.lineWidth = Math.max(1, 2 / zoom);
  }
  vctx.restore();
}
function drawVillageNames(){
  if (!params.zones) return;
  // Cartel con el color de la aldea: unos 18 px en pantalla a cualquier zoom
  const fs = Math.max(4, 18 / zoom), fade = clamp((5 - zoom) / 2, 0, 1); // de cerca ya se ve la aldea: el cartel se retira
  if (fade <= 0) return;
  vctx.globalAlpha = fade;
  vctx.font = `bold ${fs}px system-ui, sans-serif`; vctx.textAlign = 'center'; vctx.textBaseline = 'middle';
  for (const g of villages) {
    const pop = popOf(g);
    if (!pop && g.gone && g.ruinsLeft) { const x = g.fx * T + 2, y = g.fy * T - 20 - fs * .8, txt = `Ruinas de ${g.name}`, w = vctx.measureText(txt).width + fs, h = fs * 1.4;
      vctx.fillStyle = 'rgba(20,16,12,.55)'; vctx.fillRect(x - w / 2, y - h / 2, w, h); vctx.fillStyle = '#a8a29a'; vctx.fillText(txt, x, y); continue; }
    if (!pop || !world.objs[g.fy * W + g.fx]) continue;
    const [r, g2, b] = villageColor(g), x = g.fx * T + 2, y = g.fy * T - 26 - fs * .8, txt = `${g.name} · ${pop}${allianceOf(g) ? ' · ' + allianceOf(g).abbr : ''}${g.protest ? ' ✊' : ''}${g.coup || [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id)) ? ' ⚔' : ''}`;
    const nf = nationOf(g).flag, fw = nf ? fs * 1.5 : 0, w = vctx.measureText(txt).width + fs * 1.1 + fw, h = fs * 1.45;
    const atWar = [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id));
    vctx.fillStyle = 'rgba(20,16,12,.8)'; vctx.fillRect(x - w / 2, y - h / 2, w, h);
    if (atWar) { vctx.strokeStyle = `rgba(230,60,50,${.7 + .3 * Math.sin(performance.now() / 250)})`; vctx.lineWidth = Math.max(1, fs * .12); vctx.strokeRect(x - w / 2, y - h / 2, w, h); }
    if (nf) drawFlag(nf, x - w / 2 + fs * .35, y - fs * .45, 15, 10, fs / 11.5);
    vctx.fillStyle = `rgb(${r},${g2},${b})`; vctx.fillRect(x - w / 2, y + h / 2 - fs * .18, w, fs * .18);
    vctx.fillStyle = `rgb(${Math.min(255, r + 110)},${Math.min(255, g2 + 110)},${Math.min(255, b + 110)})`; vctx.fillText(txt, x + fw / 2, y);
  }
  vctx.textAlign = 'start'; vctx.textBaseline = 'alphabetic'; vctx.globalAlpha = 1;
}
// ---- Al trabajar: herramienta que se balancea, astillas o esquirlas al golpear, y lo conseguido flotando ----
let chips = [], floats = [], chipT = 0;
const WORK_TOOLS = { escuela:'martillo', taberna:'martillo', tazas:'hacha', teatro:'martillo', coliseo:'martillo', cuartel:'martillo', asedio:'martillo', lonja:'martillo', ampliar:'martillo', cementerio:'azada', hospital:'martillo', equipar:'martillo', minar:'pico', herreria:'martillo', arboleda:'azada', bayal:'azada', encender:'martillo', talar:'hacha', picar:'pico', cantear:'pico', arar:'azada', construir:'martillo', pozo:'martillo', molino:'martillo', cantera:'pico', cercar:'martillo', arma:'martillo', caña:'martillo', plantar:'azada', banco:'martillo', maravilla:'martillo' };
const CHIP_COL = { minar:['#b8c0cc', '#8a6a3a'],  encender:['#ffd060', '#ff8030'], talar:['#c89858', '#8a5a30'], picar:['#c8c4ba', '#8a867e'], cantear:['#c8c4ba', '#8a867e'], cantera:['#c8c4ba', '#8a867e'], arar:['#6e4a2c', '#8a6038'], plantar:['#6e4a2c', '#8a6038'] };
function gainText(v){
  const c = v.carry, name = { madera:'madera', piedra:'piedra', comida:c.t === 'carne' ? 'carne' : 'comida', hierro:'hierro', oro:'oro', gemas:c.n > 1 ? 'gemas' : 'gema' }[c.k] || c.k;
  floats.push({ x:v.x, y:v.y - 12, txt:`+${c.n} ${name}`, col:c.k === 'hierro' ? '#b8c0cc' : c.k === 'oro' ? '#f8d850' : c.k === 'gemas' ? '#d88af0' : c.k === 'madera' ? '#e0b070' : c.k === 'piedra' ? '#d8d4cc' : c.t === 'carne' ? '#f08070' : '#a8e070', life:0 });
}
function drawTool(v, x, y, now){
  const job = v.task.job, tool = WORK_TOOLS[job]; if (!tool) return;
  const d = v.dir, ph = now / 1000 * (tool === 'martillo' ? 11 : 7) + v.x * .7, sw = Math.sin(ph);
  const ang = -1.3 + (sw * .5 + .5) * 1.9; // de alzada (arriba, atrás) a golpe (delante, abajo)
  const hx = x + d, hy = y - 6, c = Math.cos(ang) * d, sn = Math.sin(ang), L = tool === 'martillo' ? 4 : 5;
  vctx.fillStyle = '#7a5230';
  for (let k = 1; k <= L; k++) vctx.fillRect(Math.round(hx + c * k), Math.round(hy + sn * k), 1, 1);
  const ex = Math.round(hx + c * L), ey = Math.round(hy + sn * L);
  vctx.fillStyle = tool === 'azada' ? '#5a5a5a' : '#b8bcc4';
  if (tool === 'hacha') { vctx.fillRect(ex, ey - 1, 1, 3); vctx.fillRect(ex + d, ey - 1, 1, 2); }
  else if (tool === 'pico') { vctx.fillRect(ex - 1, ey, 3, 1); vctx.fillRect(ex - 2, ey + 1, 1, 1); vctx.fillRect(ex + 2, ey + 1, 1, 1); }
  else if (tool === 'azada') { vctx.fillRect(ex, ey, 1, 2); vctx.fillRect(ex + d, ey + 1, 1, 1); }
  else { vctx.fillStyle = '#6a6a70'; vctx.fillRect(ex - 1, ey - 1, 2, 2); }
  // Al llegar abajo, el golpe: saltan astillas, esquirlas o tierra
  const hit = sw > .92;
  if (hit && !v.hitPrev && CHIP_COL[job]) {
    const col = CHIP_COL[job];
    for (let n = 0; n < 3; n++) chips.push({ x:ex + d, y:ey, vx:(Math.random() * 14 + 4) * d * (Math.random() < .3 ? -1 : 1), vy:-8 - Math.random() * 10, life:0, max:.35 + Math.random() * .3, col:col[n % 2] });
  }
  v.hitPrev = hit;
}
function drawWorkFx(now){
  const dt = Math.min(.1, (now - (chipT || now)) / 1000); chipT = now;
  for (const p of chips) { p.life += dt; p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt; vctx.fillStyle = p.col; vctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  if (chips.length) chips = chips.filter(p => p.life < p.max);
  if (floats.length && zoom >= 2) {
    vctx.font = `bold ${Math.max(4, 11 / zoom)}px system-ui, sans-serif`; vctx.textAlign = 'center'; vctx.lineJoin = 'round';
    for (const f of floats) {
      f.life += dt; const k = f.life / 1.6, y = f.y - k * 10;
      vctx.globalAlpha = Math.max(0, 1 - k * k); vctx.lineWidth = Math.max(1, 3 / zoom); vctx.strokeStyle = 'rgba(20,16,12,.8)'; vctx.strokeText(f.txt, f.x, y);
      vctx.fillStyle = f.col; vctx.fillText(f.txt, f.x, y);
    }
    vctx.globalAlpha = 1; vctx.textAlign = 'start';
  } else for (const f of floats) f.life += dt;
  if (floats.length) floats = floats.filter(f => f.life < 1.6);
}
// ---- La noche: oscuridad azulada, con la luz de las hogueras y de las ventanas ----
function drawNight(){
  const k = darkness(); if (k <= .01) return;
  const [x0, y0, x1, y1] = visibleRect();
  vctx.fillStyle = `rgba(12,18,46,${k})`; vctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  vctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, a, c) => { const g2 = vctx.createRadialGradient(x, y, 0, x, y, r); g2.addColorStop(0, `rgba(${c},${a})`); g2.addColorStop(1, `rgba(${c},0)`); vctx.fillStyle = g2; vctx.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const g of villages) {
    if (g.gone || !world.objs[g.fy * W + g.fx]) continue;
    const fx = g.fx * T + 2, fy = g.fy * T;
    if (fx < x0 - 40 || fx > x1 + 40 || fy < y0 - 40 || fy > y1 + 40) continue;
    if (!g.fireOut) glow(fx, fy, 30 + Math.sin(performance.now() / 160) * 1.5, k * 1.1, '255,150,60');
    for (const tc of torchesOf(g)) if (tc.lit) glow((tc.i % W) * T + 2, ((tc.i / W) | 0) * T - 6, 15 + Math.sin(performance.now() / 130 + tc.i) * .8, k * .9, '255,170,70');
    for (const h of [...housesOf(g), ...(g.hall != null && world.objs[g.hall] ? [g.hall] : [])]) {
      const hx = (h % W) * T + 2, hy = ((h / W) | 0) * T - 6;
      glow(hx, hy, 11, k * .8, '255,200,110');
      if (villagers.some(v => v.sleep && v.home === h) && (Math.floor(performance.now() / 700) + h) % 3 === 0) { // zzz
        vctx.globalCompositeOperation = 'source-over'; vctx.fillStyle = 'rgba(230,235,255,.85)';
        const zy = hy - 22 - (performance.now() / 120 % 6); vctx.fillRect(hx + 6, zy, 3, 1); vctx.fillRect(hx + 7, zy + 1, 1, 1); vctx.fillRect(hx + 6, zy + 2, 3, 1);
        vctx.globalCompositeOperation = 'lighter';
      }
    }
  }
  nightLights(glow, k); // farolillos y luciérnagas (ambiente.js)
  vctx.globalCompositeOperation = 'source-over';
}
// Casa donde duerme cada uno: la suya si sigue en pie; si no, la que tenga sitio (4 por casa)
function homeOf(v, g){
  if (housingOn(g)) return homeMarket(v, g); // con dueños y alquileres (vivienda.js)
  const hs = housesOf(g);
  if (ageOf(v) < ADULT_H) return kidHome(v, hs); // los niños, con sus padres (vivienda.js)
  if (v.home != null && hs.includes(v.home)) return v.home;
  v.home = null;
  for (const h of hs) if (villagers.filter(u => !u.dead && u.home === h).length < houseRoom(h)) { v.home = h; break; }
  bringKids(v, hs);
  return v.home;
}
// ---- Oficios: cada adulto tiene el suyo y lo prefiere (aunque si hace falta, hace de todo) ----
const OFICIOS = { sabio:['investigar', 'universidad'], curandero:['curar'], soldado:['instruir', 'arma', 'equipar'], ingeniero:['asedio', 'muralla', 'cuartel', 'puente', 'herreria', 'lonja'], mercader:['vender', 'comerciar', 'mercado', 'lonja', 'banco', 'tazas', 'taberna'], 'cartógrafo':['explorar', 'volar'], maestro:['enseñar', 'escuela'], 'leñador':['talar', 'plantar', 'arboleda'], 'cantero':['picar', 'cantear', 'cantera', 'minar', 'mina', 'extraer'], 'agricultor':['campo', 'arar', 'sembrar', 'cosechar', 'molino', 'bayal'],
  'pescador':['pescar', 'barca', 'muelle', 'caña'], 'cazador':['cazar', 'arma', 'equipar'], 'constructor':['tribunal', 'carcel', 'parlamento', 'construir', 'ampliar', 'pozo', 'almacen', 'ayuntamiento', 'puente', 'cercar', 'torre', 'muralla', 'carro', 'herreria', 'hospital', 'catedral'],
  'recolector':['bayas'], 'bombero':['apagar', 'quema'], 'comerciante':['comerciar', 'mercado', 'banco'], 'pastor':['capturar', 'cercar'], 'sacerdote':['orar', 'altar', 'templo', 'monumento', 'ofrenda', 'sacrificio', 'catedral'] };
const OFICIO_MIX = { mensajero:.02, sabio:.03, maestro:.04, 'cartógrafo':.03, curandero:.04, soldado:.08, ingeniero:.04, mercader:.05, agricultor:.22, 'leñador':.16, constructor:.16, recolector:.1, pescador:.1, cazador:.1, cantero:.08, pastor:.08, sacerdote:.04, comerciante:.05, bombero:.03 };
function pickOficio(g){
  const ps = villagers.filter(u => !u.dead && u.vid === g.id && u.oficio), n = ps.length + 1;
  let best = 'recolector', bd = -Infinity;
  for (const [o, w] of Object.entries(OFICIO_MIX)) { if (!oficioOk(g, o) || (o === 'cartógrafo' && !hasPaper(g)) || (o === 'soldado' && !hasBarracks(g)) || (o === 'ingeniero' && !hasBarracks(g) && !hasForge(g)) || (o === 'mercader' && g.market == null)) continue; const d = w * n - ps.filter(u => u.oficio === o).length + Math.random() * .3; if (d > bd) { bd = d; best = o; } }
  return best;
}
// ---- Defensa: torres de vigía con arquero y murallas (empalizada) alrededor del pueblo ----
let wallSet = new Set(), gateSet = new Set();
const towersOf = g => (g.towers ||= []).filter(i => world.objs[i] && world.objs[i].key === 'tower:torre');
const coreBuildings = g => buildingsOf(g).filter(h => Math.hypot(h % W - g.fx, ((h / W) | 0) - g.fy) <= 26); // el núcleo: las minas, puertos y demás lejanos quedan fuera
function wallPlan(g){
  if (g.wallPlan) return g.wallPlan;
  let x0 = g.fx - 4, y0 = g.fy - 3, x1 = g.fx + 4, y1 = g.fy + 4;
  for (const h of coreBuildings(g)) { const x = h % W, y = (h / W) | 0; x0 = Math.min(x0, x - 5); x1 = Math.max(x1, x + 5); y0 = Math.min(y0, y - 7); y1 = Math.max(y1, y + 2); }
  const m = g.wallRing === 2 ? 8 : 3; // la segunda muralla, más afuera
  x0 = Math.max(1, x0 - m); y0 = Math.max(1, y0 - m); x1 = Math.min(W - 2, x1 + m); y1 = Math.min(H - 2, y1 + m);
  const plan = [];
  for (let x = x0; x <= x1; x++) plan.push(y0 * W + x);
  for (let y = y0 + 1; y <= y1; y++) plan.push(y * W + x1);
  for (let x = x1 - 1; x >= x0; x--) plan.push(y1 * W + x);
  for (let y = y1 - 1; y > y0; y--) plan.push(y * W + x0);
  g.wallPlan = plan; g.wallIdx = 0; g.wallRect = { x0, y0, x1, y1 };
  return plan;
}
const wallLeft = g => { const pl = wallPlan(g); return pl.length - (g.wallIdx || 0); };
function drawWalls(){
  if (!wallSet.size && !gateSet.size) return;
  const [x0, y0, x1, y1] = visibleRect();
  for (const i of wallSet) {
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 - 8 || py > y1) continue;
    const vert = (wallSet.has(i - W) || wallSet.has(i + W) || gateSet.has(i - W) || gateSet.has(i + W)) && !wallSet.has(i - 1) && !wallSet.has(i + 1);
    if (ART.ready) { // el dibujo: tramo horizontal o vertical, de piedra o de madera
      const stn = wallStone.has(i), k = stn ? (vert ? 'tex:piedra_v' : 'tex:piedra_h') : (vert ? 'tex:empalizada_v' : 'tex:empalizada_h'), p = artPattern(k);
      if (p) {
        vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px - (vert ? 1 : 0), py + T - 1, T + (vert ? 2 : 0), 2);
        if (vert) { const w = p.w, top = wallSet.has(i - W) || gateSet.has(i - W) ? py : py - 4; artFill(vctx, k, px + (T >> 1) - (w >> 1), top, w, py + T - top, px + (T >> 1) - (w >> 1), 0); }
        else artFill(vctx, k, px, py + T - p.h, T, p.h, 0, py + T - p.h);
        continue;
      }
    }
    if (vert && !wallStone.has(i)) { // tramo que va de arriba abajo: se ve de lado, más ancho (dos filas de estacas y el adarve)
      vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px - 1, py + T - 1, T + 3, 2);
      for (let k = -1; k <= T; k++) {
        const back = k < 2; vctx.fillStyle = back ? (k % 2 ? '#6a4428' : '#84583a') : (k % 2 ? '#7a5030' : '#9a6a3e');
        vctx.fillRect(px + k, py - (back ? 4 : 3), 1, T + (back ? 3 : 3)); vctx.fillStyle = '#4a3018'; vctx.fillRect(px + k, py - (back ? 5 : 4) + ((k + 2) % 2), 1, 1);
      }
      vctx.fillStyle = '#5a3a20'; vctx.fillRect(px - 1, py + 1, T + 2, 1); vctx.fillStyle = '#3a2614'; vctx.fillRect(px + T, py - 3, 1, T + 3);
      continue;
    }
    if (wallStone.has(i)) { // muro de piedra: sillares grises y almenas
      vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px - (vert ? 1 : 0), py + T - 1, T + (vert ? 2 : 0), 2);
      vctx.fillStyle = '#8a867e'; vctx.fillRect(px - (vert ? 1 : 0), py - 3, T + (vert ? 2 : 0), T + 3);
      vctx.fillStyle = '#a8a49c'; vctx.fillRect(px - (vert ? 1 : 0), py - 3, T + (vert ? 2 : 0), 1);
      vctx.fillStyle = '#6a6660'; vctx.fillRect(px, py, T, 1); vctx.fillRect(px + ((i % 2) ? 2 : 0), py - 2, 1, 2); vctx.fillRect(px + ((i % 2) ? 0 : 3), py + 1, 1, 2);
      vctx.fillStyle = '#8a867e'; for (let k = 0; k < T; k += 2) vctx.fillRect(px + k, py - 5, 1, 2);
      continue;
    }
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px, py + T - 1, T, 2);
    for (let k = 0; k < T; k++) { // estacas puntiagudas
      vctx.fillStyle = k % 2 ? '#7a5030' : '#9a6a3e'; vctx.fillRect(px + k, py - 3, 1, T + 3);
      vctx.fillStyle = '#4a3018'; vctx.fillRect(px + k, py - 4 + (k % 2), 1, 1);
    }
    vctx.fillStyle = '#5a3a20'; vctx.fillRect(px, py, T, 1); vctx.fillRect(px, py + 3, T, 1);
  }
  for (const i of gateSet) { // puerta: dos postes más altos a los lados
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 - 8 || py > y1) continue;
    const go = villageById(gateOwner.get(i)), shut = gateShut(go), // de noche, con alarma o en guerra (defensa.js)
      stn = [i - 1, i + 1, i - W, i + W].some(j => wallStone.has(j));
    const gs = artFrame(`gate:${stn ? 'piedra' : 'madera'}${shut ? '' : '_abierta'}`);
    if (gs) { vctx.drawImage(gs, px + (T >> 1) - (gs.width >> 1), py + T - gs.height); continue; } // el dibujo: cerrada si la frontera está cerrada
    vctx.fillStyle = '#5a3a20'; vctx.fillRect(px, py - 5, 1, T + 5); vctx.fillRect(px + T - 1, py - 5, 1, T + 5); vctx.fillRect(px, py - 5, T, 1); if (shut) { vctx.fillStyle = '#6a4426'; vctx.fillRect(px + 1, py - 2, T - 2, 4); vctx.fillStyle = '#3a2614'; vctx.fillRect(px + 1, py, T - 2, 1); } // frontera cerrada: puerta atrancada
  }
}
// ---- Religión: cada aldea venera a su dios; las desgracias se las atribuyen a algo y actúan en consecuencia ----
const DOMAINS = ['las tormentas', 'el trueno', 'el cielo', 'las estrellas', 'las montañas', 'el inframundo', 'el desierto', 'el frío', 'la caza', 'la lluvia', 'el sol', 'las cosechas', 'el mar', 'los bosques', 'la guerra', 'la luna', 'el fuego', 'la tierra', 'el viento', 'los animales', 'los muertos'];
const SYL = ['ka', 'lo', 'mi', 'ra', 'to', 'ul', 'an', 'sha', 've', 'dor', 'is', 'ne', 'gu', 'ri', 'ba', 'el', 'or', 'zu', 'ta', 'mo'];
function makeFaith(dom){
  let god = ''; for (let k = 0, n = Math.random() < .4 ? 3 : 2; k < n; k++) god += SYL[Math.floor(Math.random() * SYL.length)];
  god = god[0].toUpperCase() + god.slice(1);
  const kind = ['Culto de', 'Hijos de', 'Fieles de', 'Orden de', 'Senda de'][Math.floor(Math.random() * 5)];
  return { god, fem:Math.random() < .5, dom:dom || DOMAINS[Math.floor(Math.random() * DOMAINS.length)], name:`${kind} ${god}`, mono:Math.random() < .45 };
}
const godTxt = f => `${f.god}, ${f.fem ? 'diosa' : 'dios'} ${f.dom.startsWith('el ') ? 'del ' + f.dom.slice(3) : 'de ' + f.dom}`;
const CAUSE_TXT = { enfermedad:'la epidemia',  seca:'la sequía que secó los cultivos', helada:'la helada que mató la cosecha', inundada:'la riada que ahogó los campos', quemada:'el fuego en los campos',
  podrida:'la cosecha podrida', conquista:'la conquista', guerra:'la guerra con sus vecinos', tornado:'el tornado', huracan:'el huracán', tromba:'la tromba marina', remolino:'el torbellino del mar', terremoto:'el terremoto', tsunami:'la ola gigante', volcan:'la erupción del volcán', meteorito:'la roca de fuego que cayó del cielo', cometa:'la luz que cruzó el cielo', arena:'la tormenta de arena', rayo:'el rayo', fuegoMonte:'el incendio del monte', calentamiento:'el calor que no se va', enfriamiento:'el frío que no se va', derrumbe:'el derrumbe de sus edificios', incendio:'el incendio que quemó sus casas', lluvia:'tantos días de lluvia', hoguera:'la hoguera apagada por la lluvia', lobos:'el ataque de los lobos', oso:'el ataque del oso', hambre:'el hambre', 'frío':'el frío', calor:'el calor', ahogado:'el ahogado', sed:'la sed' };
// La religión no viene de serie: nace de lo primero que les pasa (lo que temen o lo que no entienden)
const CAUSE_DOM = { enfermedad:['el inframundo', 'los muertos', 'la lluvia'], guerra:['la guerra'], tornado:['el viento', 'las tormentas'], huracan:['las tormentas', 'el mar', 'el viento'], tromba:['el mar', 'las tormentas'], remolino:['el mar'], terremoto:['la tierra', 'el inframundo', 'las montañas'], tsunami:['el mar'], volcan:['el fuego', 'las montañas', 'el inframundo'], meteorito:['las estrellas', 'el cielo'], cometa:['las estrellas', 'el cielo'], arena:['el desierto', 'el viento'], rayo:['el trueno', 'el cielo', 'las tormentas'], fuegoMonte:['el fuego', 'los bosques'], calentamiento:['el sol'], enfriamiento:['el frío', 'la luna'], seca:['el sol', 'la lluvia'], sed:['la lluvia', 'el sol'], calor:['el sol'], lluvia:['la lluvia', 'el viento'], inundada:['la lluvia', 'el mar'],
  ahogado:['el mar', 'los muertos'], helada:['el frío', 'la luna'], 'frío':['el frío', 'el viento'], lobos:['la caza', 'los animales'], oso:['la caza', 'los animales'],
  quemada:['el fuego'], incendio:['el fuego'], hoguera:['el fuego', 'la lluvia'], derrumbe:['la tierra', 'el viento'], hambre:['las cosechas', 'la tierra'], podrida:['las cosechas'] };
function bornFaith(g, cause, txt){
  const opts = CAUSE_DOM[cause] || DOMAINS; g.faith = makeFaith(opts[Math.floor(Math.random() * opts.length)]); g.wrath = 2;
  g.faith.shape = RITUAL_SHAPES[Math.floor(Math.random() * RITUAL_SHAPES.length)]; riteOf(g);
  g.lastBlame = `tras ${txt}, empiezan a venerar a ${godTxt(g.faith)}`;
  notify(`En ${g.name}, tras ${txt}, empiezan a venerar a ${godTxt(g.faith)}: así nace la «${g.faith.name}»`, { x:g.fx * T, y:g.fy * T });
}
// Otros dioses: si lo que les pasa no es cosa de ninguno de los suyos, pueden empezar a venerar también a otro
// (politeísmo) o, si su dios no les escucha (mucha ira pese a rezar), cambiar de fe
const allGods = f => [{ god:f.god, fem:f.fem, dom:f.dom }, ...(f.pantheon || [])];
function newGods(g, cause){
  const f = g.faith, opts = CAUSE_DOM[cause]; if (!opts || allGods(f).some(d => opts.includes(d.dom))) return false;
  const r = Math.random(), nf = makeFaith(opts[Math.floor(Math.random() * opts.length)]), txt = CAUSE_TXT[cause];
  if (f.mono) { // un solo dios: la desgracia es cosa suya; solo si su ira no cesa pueden acabar cambiando de fe
    if (r < .12 && (g.wrath || 0) > 6) { const old = f.god; g.faith = { ...nf, mono:true }; g.wrath = 1; g.devotion = 0; g.lastBlame = `abandonan a ${old} y se convierten a ${godTxt(nf)}, su nuevo y único dios`; notify(`En ${g.name} ${g.lastBlame}`, { x:g.fx * T, y:g.fy * T }); return true; }
    return false;
  }
  if (r < .3 && (f.pantheon || []).length < 5) {
    (f.pantheon ||= []).push({ god:nf.god, fem:nf.fem, dom:nf.dom });
    g.lastBlame = `tras ${txt}, veneran también a ${godTxt(nf)}`; notify(`En ${g.name}, tras ${txt}, empiezan a venerar también a ${godTxt(nf)}`, { x:g.fx * T, y:g.fy * T });
    return true;
  }
  if (r < .42 && (g.wrath || 0) > 4) {
    const old = f.god; g.faith = { ...nf, pantheon:f.pantheon }; g.wrath = 1; g.devotion = 0;
    g.lastBlame = `abandonan a ${old}, que no les escuchaba, y se convierten a ${godTxt(nf)}`; notify(`En ${g.name} ${g.lastBlame}`, { x:g.fx * T, y:g.fy * T });
    return true;
  }
  return false;
}
function misfortune(g, cause){
  if (g && cause === 'guerra') onAttacked(g); // prisa por la muralla (defensa.js)
  if (!g || !CAUSE_TXT[cause]) return;
  if (!g.faith) { bornFaith(g, cause, CAUSE_TXT[cause]); return; }
  if (yearT - ((g.blameT || {})[cause] ?? -1e9) >= 120 && newGods(g, cause)) { (g.blameT ||= {})[cause] = yearT; return; }
  g.blameT ||= {}; g.taboo ||= {}; g.grudge ||= {};
  g.wrath = Math.min(10, (g.wrath || 0) + (yearT - (g.blameT[cause] ?? -1e9) < 120 ? .5 : 2) * (hasLaw(g, 'laicidad') ? .6 : 1));
  if (yearT - (g.blameT[cause] ?? -1e9) < 120) return; // ya le han buscado culpable hace poco
  g.blameT[cause] = yearT;
  const f = g.faith, txt = CAUSE_TXT[cause], others = villages.filter(o => o !== g && popOf(o) > 0);
  const opts = [['dios', 4], ['tala', (g.cut || 0) > 6 ? 2 : 0], ['caza', 1.5], ['vecinos', others.length ? 1.5 : 0], ['presagio', 1]];
  let k = Math.random() * opts.reduce((a, o) => a + o[1], 0), why = 'dios';
  for (const [o, w] of opts) if ((k -= w) < 0) { why = o; break; }
  let msg;
  if (why === 'dios') msg = `En ${g.name} creen que ${txt} es un castigo de ${godTxt(f)}: se ponen a rezar`;
  else if (why === 'tala') { g.taboo.talar = yearT + 150; g.cut = (g.cut || 0) + 4; msg = `En ${g.name} creen que ${txt} es por haber talado el bosque sagrado: dejan de talar un tiempo y plantan árboles`; }
  else if (why === 'caza') { const sp = HERBIVORES[Math.floor(Math.random() * HERBIVORES.length)]; g.taboo[sp] = yearT + 400; msg = `En ${g.name} creen que ${txt} es por cazar ${ANIMALS[sp].n.toLowerCase()}s, animal sagrado de ${f.god}: ya no los cazan`; }
  else if (why === 'vecinos') { const o = others[Math.floor(Math.random() * others.length)]; g.grudge[o.id] = (g.grudge[o.id] || 0) + 1; msg = `En ${g.name} culpan a los de ${o.name} de ${txt}`; }
  else msg = `En ${g.name} dicen que ${txt} ya lo anunciaba un mal presagio: rezan a ${f.god}`;
  msg = msg.replace(/ de el /g, ' del ').replace(/ a el /g, ' al ');
  g.lastBlame = msg.replace(`En ${g.name} `, '');
  notify(msg, { x:g.fx * T, y:g.fy * T });
}
function faithLine(g){
  if (!g.faith) return '';
  const tb = Object.entries(g.taboo || {}).filter(([, t]) => t > yearT).map(([k]) => k === 'talar' ? 'no talan' : `no cazan ${ANIMALS[k].n.toLowerCase()}s`);
  return `<br>${g.faith.name} (${godTxt(g.faith)}${(g.faith.pantheon || []).length ? `; y también ${g.faith.pantheon.map(d => d.god).join(', ')}` : ''})${(g.wrath || 0) > .5 ? ` · temen su ira (${Math.round(g.wrath)})` : ''}${tb.length ? ` · ${tb.join(', ')}` : ''}${g.lastBlame ? `<br><i>${g.lastBlame}</i>` : ''}`;
}
// ---- Bandera de la aldea: la diseñan ellos mismos al tener ayuntamiento (colores, franjas o cruz y un emblema) ----
// Banderas diseñadas desde cero por cada aldea, con las normas de siempre de las banderas y la heráldica:
// un "metal" (blanco o amarillo) nunca va junto a otro metal ni un color junto a otro color; divisiones clásicas
// (franjas, bandas, cruces nórdicas, aspas, cantón, triángulo al asta, chevrón, dentado, palo…) y un emblema
// que suele tener que ver con su dios (sol, luna, estrellas, árbol, llama, olas…). Nunca salen dos iguales.
const METALS = ['#f2efe6', '#e8c040'];
const COLOURS = ['#c8302c', '#2a5aa8', '#2e7a3a', '#1e1e22', '#7a3a9a', '#8a2a3a', '#1f3f78', '#b8562a', '#2a8a8a'];
const DOMAIN_FLAG = { 'las tormentas':{ col:'#1f3f78', charge:'rayo' }, 'el trueno':{ col:'#2a5aa8', charge:'rayo' }, 'el cielo':{ col:'#2a8a8a', charge:'sol' }, 'las estrellas':{ col:'#1f3f78', charge:'estrellas' }, 'las montañas':{ col:'#7a3a9a', charge:'monte' }, 'el inframundo':{ col:'#1e1e22', charge:'anillo' }, 'el desierto':{ col:'#b8562a', charge:'sol' }, 'el frío':{ col:'#1f3f78', charge:'estrella' }, 'la caza':{ col:'#2e7a3a', charge:'estrella' }, 'el sol':{ col:'#c8302c', charge:'sol' }, 'la luna':{ col:'#1f3f78', charge:'luna' }, 'el mar':{ col:'#2a5aa8', charge:'olas' },
  'la lluvia':{ col:'#2a8a8a', charge:'gotas' }, 'los bosques':{ col:'#2e7a3a', charge:'arbol' }, 'el fuego':{ col:'#b8562a', charge:'llama' },
  'la guerra':{ col:'#8a2a3a', charge:'estrella' }, 'los muertos':{ col:'#1e1e22', charge:'anillo' }, 'las cosechas':{ col:'#2e7a3a', charge:'disco' },
  'la tierra':{ col:'#b8562a', charge:'rombo' }, 'el viento':{ col:'#2a5aa8', charge:'estrellas' }, 'los animales':{ col:'#7a3a9a', charge:'estrella' } };
const LAYOUTS = ['h2', 'h3', 'v2', 'v3', 'nordica', 'cruz', 'aspa', 'canton', 'triangulo', 'banda', 'cuartel', 'borde', 'franja', 'palo', 'rayas', 'chevron', 'dentado', 'liso', 'tajado'];
let usedFlags = new Set();
const rndOf = a => a[Math.floor(Math.random() * a.length)];
function makeFlag(g){
  const dom = g.faith && DOMAIN_FLAG[g.faith.dom]; // diseño libre: cada régimen nuevo estrena una bandera distinta
  for (let tries = 0; tries < 60; tries++) {
    // Tinturas: un color principal (el de su dios o el de la aldea), un metal y un segundo color distinto
    const [r, g2, b] = villageColor(g), own = '#' + [r, g2, b].map(c => c.toString(16).padStart(2, '0')).join('');
    const c1 = dom && Math.random() < .6 ? dom.col : Math.random() < .5 ? own : rndOf(COLOURS);
    let c2; do c2 = rndOf(COLOURS); while (c2 === c1);
    const m1 = rndOf(METALS), m2 = METALS.find(m => m !== m1);
    const layout = rndOf(LAYOUTS);
    const metalFirst = Math.random() < .35;
    const f = { layout, a:metalFirst ? m1 : c1, b:metalFirst ? c1 : m1, c:metalFirst ? c2 : c2, m2, n:5 + 2 * Math.floor(Math.random() * 4), fimb:Math.random() < .4 };
    // Emblema: el de su dios (a menudo), otro al azar o ninguno; dónde va y de qué tintura (contrasta con lo que tiene debajo)
    const charges = ['', 'estrella', 'estrellas', 'disco', 'luna', 'sol', 'rombo', 'anillo', 'arbol', 'llama'];
    f.charge = dom && Math.random() < .55 ? dom.charge : Math.random() < .25 ? '' : rndOf(charges);
    if (f.charge === 'olas' && !['liso', 'h2', 'borde'].includes(layout)) f.charge = 'estrella';
    f.pos = ['canton', 'nordica'].includes(layout) ? 'canton' : ['triangulo', 'chevron', 'dentado'].includes(layout) ? 'asta' : 'centro';
    // Lo que cuenta es cómo se ve: si el dibujo ya lo tiene otra aldea, a diseñar otra
    let sig = ''; for (let j = 0; j < 10; j++) for (let i = 0; i < 15; i++) sig += flagColor(f, (i + .5) / 15, (j + .5) / 10);
    if (usedFlags.has(sig)) continue;
    usedFlags.add(sig);
    return f;
  }
  return { layout:'liso', a:rndOf(COLOURS), b:rndOf(METALS), c:rndOf(COLOURS), m2:METALS[0], n:5, charge:'estrella', pos:'centro' };
}
// Estrella de 5 puntas: ¿está (x, y) dentro? (radio exterior R)
function inStar(x, y, R){
  const a = Math.atan2(x, -y), r = Math.hypot(x, y), k = ((a / (Math.PI * 2 / 5)) % 1 + 1) % 1, t = Math.abs(k - .5) * 2; // 0 en el entrante, 1 en la punta
  return r < R * (.42 + .58 * Math.pow(t, 1.6));
}
// Tintura del campo (sin emblema) en (u, v), con u de 0 a 1 a lo ancho y v de 0 a 1 a lo alto
function flagField(f, u, v){
  const { a, b, c } = f, cx = u - .5, cy = v - .5;
  switch (f.layout) {
    case 'h2': return v < .5 ? a : b;
    case 'h3': return v < 1 / 3 ? a : v < 2 / 3 ? b : c;
    case 'v2': return u < .5 ? a : b;
    case 'v3': return u < 1 / 3 ? a : u < 2 / 3 ? b : c;
    case 'nordica': { const x = u - .36, w = .09; if (f.fimb && (Math.abs(x) < w * .45 || Math.abs(cy) < w * .7)) return c; return Math.abs(x) < w || Math.abs(cy) < w * 1.5 ? b : a; }
    case 'cruz': { if (f.fimb && (Math.abs(cx) < .05 || Math.abs(cy) < .075)) return c; return Math.abs(cx) < .1 || Math.abs(cy) < .15 ? b : a; }
    case 'aspa': { const k1 = Math.abs(cx * .667 - cy), k2 = Math.abs(cx * .667 + cy); return k1 < .1 || k2 < .1 ? b : a; }
    case 'canton': { if (u < .42 && v < .54) return c; const s = Math.floor(v * f.n); return s % 2 ? b : a; }
    case 'triangulo': { if (u < .4 * (1 - Math.abs(cy) * 2)) return c; return v < .5 ? a : b; }
    case 'banda': return Math.abs(u - v) < .16 ? b : u > v ? a : c;
    case 'cuartel': return (cx < 0) === (cy < 0) ? a : b;
    case 'borde': return u < .1 || u > .9 || v < .14 || v > .86 ? b : a;
    case 'franja': return v < .25 || v >= .75 ? a : b;
    case 'palo': return u < .25 || u >= .75 ? a : b;
    case 'rayas': return Math.floor(v * f.n) % 2 ? b : a;
    case 'chevron': return u < .5 * (1 - Math.abs(cy) * 2) ? c : v < .5 ? a : b;
    case 'dentado': { const z = .28 + .06 * Math.abs(((v * 9) % 2) - 1); return u < z ? b : a; }
    case 'tajado': return u + v < 1 ? a : b;
    default: return a; // liso
  }
}
function flagColor(f, u, v){
  const base = flagField(f, u, v), pos = f.pos;
  // Centro del emblema según dónde vaya
  const [ox, oy, sc] = f.layout === 'nordica' ? [.13, .2, .42] : pos === 'canton' ? [.2, .26, .7] : pos === 'asta' ? [.16, .5, .75] : [.5, .5, 1];
  const x = (u - ox) * 1.5 / sc, y = (v - oy) / sc;
  // El emblema contrasta: metal sobre color y color sobre metal
  const under = flagField(f, ox, oy), metal = METALS.includes(under), ink = metal ? (f.a !== under && !METALS.includes(f.a) ? f.a : f.c) : (METALS.includes(f.b) && f.b !== under ? f.b : f.m2);
  const r = Math.hypot(x, y);
  switch (f.charge) {
    case 'estrella': if (inStar(x, y, .26)) return ink; break;
    case 'estrellas': for (let k = 0; k < 3; k++) if (inStar(x - (k - 1) * .3, y + (k === 1 ? .06 : 0), .12)) return ink; break;
    case 'disco': if (r < .22) return ink; break;
    case 'anillo': if (r < .24 && r > .15) return ink; break;
    case 'luna': if (r < .24 && Math.hypot(x - .1, y - .03) > .2) return ink; break;
    case 'sol': if (r < .14 || (r < .3 && Math.floor((Math.atan2(y, x) / Math.PI + 1) * 6) % 2 === 0 && r > .18)) return ink; break;
    case 'rombo': if (Math.abs(x) + Math.abs(y) * 1.3 < .26) return ink; break;
    case 'arbol': if ((y < .12 && Math.abs(x) < (y + .28) * .55) || (Math.abs(x) < .04 && y >= .12 && y < .26)) return ink; break;
    case 'llama': if (y > -.28 && y < .22 && Math.abs(x + Math.sin(y * 9) * .04) < (.22 - y) * .45 * Math.min(1, (y + .28) * 4)) return ink; break;
    case 'gotas': for (let k = 0; k < 3; k++) { const gx = x - (k - 1) * .26, gy = y - (k === 1 ? -.06 : .04); if (Math.hypot(gx, gy - .03) < .08 || (gy < .03 && gy > -.13 && Math.abs(gx) < (gy + .13) * .55)) return ink; } break;
    case 'rayo': if (Math.abs(y) < .3 && Math.abs(x - (y < 0 ? .05 : -.05) - y * .35) < .06) return ink; break;
    case 'monte': if (y > -.26 && y < .2 && Math.abs(x) < (y + .26) * .85) return ink; break;
    case 'olas': if (Math.abs(v - .62 - Math.sin(u * 18) * .04) < .045 || Math.abs(v - .78 - Math.sin(u * 18 + 1) * .04) < .045) return ink; break;
  }
  return base;
}
// Dibuja la bandera: w×h celdas de tamaño px, ondeando (se ve a cualquier escala)
function drawFlag(f, x, y, w, h, px, t){
  for (let i = 0; i < w; i++) {
    const off = t != null ? Math.round(Math.sin(t / 260 - i * .7) * .7 * i / w) * px : 0;
    for (let j = 0; j < h; j++) { vctx.fillStyle = flagColor(f, (i + .5) / w, (j + .5) / h); vctx.fillRect(x + i * px, y + j * px + off, px, px); }
  }
}
function flagDataUrl(f){
  const c = document.createElement('canvas'); c.width = 36; c.height = 24; const x = c.getContext('2d');
  for (let i = 0; i < 36; i++) for (let j = 0; j < 24; j++) { x.fillStyle = flagColor(f, (i + .5) / 36, (j + .5) / 24); x.fillRect(i, j, 1, 1); }
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.strokeRect(.5, .5, 35, 23);
  return c.toDataURL();
}
// ---- Economía: en el mercado se empieza con el trueque; con el tiempo cada aldea inventa su propia moneda ----
const COIN_A = ['kel', 'dra', 'mor', 'sil', 'tal', 'ven', 'or', 'bes', 'qua', 'lir', 'zan', 'pel'];
const COIN_B = ['ar', 'ma', 'ín', 'eta', 'or', 'ul', 'ena', 'io', 'ón'];
const coinName = () => COIN_A[Math.floor(Math.random() * COIN_A.length)] + COIN_B[Math.floor(Math.random() * COIN_B.length)];
const coinPl = g => g.coin + (/[aeiou]$/.test(g.coin) ? 's' : 'es');
const BARTER = ['madera', 'comida', 'piedra', 'pieles', 'cestas', 'vasijas', 'lana', 'herramientas', 'telas'];
function econLine(g){
  if (g.market == null || !world.objs[g.market]) return '';
  const ps = villagers.filter(v => !v.dead && v.vid === g.id), money = ps.reduce((a, v) => a + (v.money || 0), 0);
  return g.coin ? `<br>Moneda: el ${g.coin} · ${money} ${coinPl(g)} en manos de la gente · ${g.trades || 0} tratos` : `<br>Economía de trueque · ${g.trades || 0} intercambios`;
}
// ---- Daño: el que recibe un golpe parpadea en rojo, recula un poco y saltan unas gotas ----
const redCache = new WeakMap();
function redOf(s){
  let c = redCache.get(s); if (c) return c;
  c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d');
  x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#ff2a20'; x.fillRect(0, 0, c.width, c.height);
  redCache.set(s, c); return c;
}
function hurtFx(e, fromX, fromY, walk){
  e.hurtAt = performance.now();
  const d = Math.hypot(e.x - fromX, e.y - fromY) || 1, nx = e.x + (e.x - fromX) / d * 3, ny = e.y + (e.y - fromY) / d * 3;
  if (walk(nx, ny)) { e.x = nx; e.y = ny; } // el empujón del golpe
  for (let n = 0; n < 5; n++) chips.push({ x:e.x, y:e.y - 5, vx:(Math.random() - .5) * 22 + (e.x - fromX) / d * 10, vy:-6 - Math.random() * 10, life:0, max:.35 + Math.random() * .3, col:n % 2 ? '#c81818' : '#8a0e0e' });
}
// Capa roja que se apaga en un tercio de segundo
function drawHurt(e, s, x, y, w, h){
  const k = 1 - (performance.now() - (e.hurtAt || -1e9)) / 330; if (k <= 0) return;
  vctx.globalAlpha = .75 * k; vctx.drawImage(redOf(s), x, y, w ?? s.width, h ?? s.height); vctx.globalAlpha = 1;
}
// ---- Antorchas: a oscuras no ven, así que ponen antorchas junto a caminos y plaza; al atardecer alguien las va
// encendiendo, de día se apagan y la lluvia también las apaga (luego las vuelven a encender) ----
const torchesOf = g => (g.torches ||= []);
function torchSite(g){
  const near = [...pathMap].filter(i => Math.abs((i % W) - g.fx) < 22 && Math.abs(((i / W) | 0) - g.fy) < 22);
  for (let k = 0; k < 60 && near.length; k++) {
    const pi = near[Math.floor(Math.random() * near.length)];
    for (const j of [pi - 1, pi + 1, pi - W, pi + W]) {
      const x = j % W, y = (j / W) | 0;
      if (!tileFree(x, y) || pathMap.has(j) || farmMap.has(j) || plazaSet.has(j) || underBuilding(g, x, y)) continue;
      if (villages.some(o => torchesOf(o).some(t => Math.hypot((t.i % W) - x, ((t.i / W) | 0) - y) < 6))) continue;
      return j;
    }
  }
  return null;
}
function drawTorches(g, t){
  const [x0, y0, x1, y1] = visibleRect();
  for (const tc of torchesOf(g)) {
    const px = (tc.i % W) * T + 2, py = ((tc.i / W) | 0) * T + 4;
    if (px < x0 - 6 || px > x1 + 6 || py < y0 - 12 || py > y1 + 4) continue;
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px - 1, py, 3, 1);
    const ta = artFrame(tc.lit ? 'antorcha:encendida' : 'antorcha:apagada');
    if (ta) vctx.drawImage(ta, px - (ta.width >> 1), py + 1 - ta.height); else { vctx.fillStyle = '#5a3a20'; vctx.fillRect(px, py - 7, 1, 8); vctx.fillStyle = '#3a2414'; vctx.fillRect(px - 1, py - 8, 3, 2); }
    if (tc.lit) {
      const f = Math.floor(t / 110 + tc.i) % 3;
      vctx.fillStyle = '#ff8a2a'; vctx.fillRect(px - 1, py - 10, 3, 2);
      vctx.fillStyle = '#ffd860'; vctx.fillRect(px - (f === 1 ? 1 : 0), py - 11 - (f === 2 ? 1 : 0), 1 + (f === 0 ? 1 : 0), 2);
    }
  }
}
// ---- Ficha de una aldea (al hacer clic en su territorio) ----
let cardVid = 0;
function techsOf(g){
  const k = g.know || {}, t = ['Fuego'];
  if (housesOf(g).length) t.push('Construcción');
  if ([...farmMap.values()].some(f => f.vid === g.id)) t.push('Agricultura');
  if (g.pen) t.push('Ganadería');
  if (g.rods) t.push('Caña de pescar');
  if (villagers.some(v => !v.dead && v.vid === g.id && v.weapon)) t.push('Lanzas y arcos');
  if (k.pozo) t.push('Pozos'); if (k.molino) t.push('Molinos'); if (k.cantera) t.push('Canteras'); if (k.puente) t.push('Puentes');
  if (k.barca) t.push('Barcas'); if (k.montar) t.push('Equitación y carros'); if (k.antorchas) t.push('Antorchas'); if (k.bomberos) t.push('Cubos contra el fuego'); if (g.ctrlBurns) t.push('Quemas controladas');
  if (g.market != null) t.push('Comercio'); if (g.coin) t.push('Moneda'); if (hasBank(g)) t.push('Banca'); if (k.mineria) t.push('Minería'); if (hasForge(g)) t.push('Herrería'); if (hasHosp(g)) t.push('Hospital'); if (hasSchool(g)) t.push('Escuela'); if (hasCathedral(g)) t.push(OBJ[world.objs[g.cathedral].key][0]); if (hasPaper(g)) t.push('Papel y mapas'); if (hasTavern(g)) t.push('Taberna'); if (hasTheater(g)) t.push('Teatro'); if (hasColiseum(g)) t.push('Coliseo'); if (g.track) t.push('Pista de atletismo'); if (hasBarracks(g)) t.push('Cuartel'); if (g.siegeMsg) t.push('Asedio'); if (hasLonja(g)) t.push('Lonja'); if (g.cemetery) t.push('Cementerio'); if (k.acequias) t.push('Acequias'); if (g.grove) t.push('Arboledas'); if (g.berryPlot) t.push('Bayales'); if (g.jarMsg) t.push('Cántaros');
  for (const c of Object.keys(g.crops || {})) t.push(`Cultivo de ${CROPS[c].n}`); if (g.temple != null) t.push('Templos');
  if (g.wallPlan) t.push('Murallas'); if (towersOf(g).length) t.push('Torres de vigía'); if (g.flag) t.push('Bandera');
  return t;
}
function villageAt(sx, sy){
  const tx = Math.floor((sx - offX) / zoom / T), ty = Math.floor((sy - offY) / zoom / T);
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
  const k = zoneOwn && zoneOwn[ty * W + tx]; if (k && zoneLive[k - 1]) return zoneLive[k - 1];
  let best = null, bd = 14; for (const g of villages) { const d = Math.hypot(g.fx - tx, g.fy - ty); if (d < bd && popOf(g)) { bd = d; best = g; } }
  return best;
}
// ---- Logos de los partidos: un emblema de pixel según su nombre, con su color y su forma ----
const LOGO_SYM = {
  puno:['.#.#.#.', '.#####.', '######.', '#######', '.######', '..####.', '..###..'],
  espiga:['...#...', '..#.#..', '..###..', '.#.#.#.', '..###..', '...#...', '...#...'],
  rueda:['.#.#.#.', '#######', '.##.##.', '###.###', '.##.##.', '#######', '.#.#.#.'],
  espada:['...#...', '...#...', '...#...', '...#...', '.#####.', '...#...', '..###..'],
  corona:['.......', '#..#..#', '#.###.#', '#######', '#######', '.#####.', '.......'],
  moneda:['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  hoja:['....##.', '..####.', '.#####.', '.####..', '.###...', '#.#....', '#......'],
  ola:['.......', '.##..##', '#..##..', '.......', '.##..##', '#..##..', '.......'],
  llama:['...#...', '..##...', '..###..', '.####..', '.#####.', '.##.##.', '..###..'],
  estrella:['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  rosa:['..###..', '.##.##.', '.#.#.#.', '.##.##.', '..###..', '...#.#.', '..##...'],
  sol:['#..#..#', '.#####.', '.#####.', '#######', '.#####.', '.#####.', '#..#..#'],
  oveja:['.......', '.####..', '######.', '######.', '.####.#', '.#..#..', '.#..#..'],
  manos:['.......', '##...##', '###.###', '.#####.', '..###..', '...#...', '.......'],
  ojo:['.......', '..###..', '.#...#.', '#..#..#', '.#...#.', '..###..', '.......']
};
const LOGO_KEYS = [[/Pueblo|Popular|Unido/, 'puno'], [/Pan|Cosechas|Arado/, 'espiga'], [/Jornaleros|Trabajadores|Comunal/, 'rueda'], [/Espada|Orden|Hierro|Sangre/, 'espada'],
  [/Corona|Linajes/, 'corona'], [/Comercio|Mercaderes|Libre/, 'moneda'], [/Verde/, 'hoja'], [/Río/, 'ola'], [/Hoguera|Antorcha/, 'llama'], [/Estrella/, 'estrella'],
  [/Socialista|Reparto/, 'rosa'], [/Fe|Templo|Sagrad/, 'sol'], [/Pastores/, 'oveja'], [/Concordia|Camino/, 'manos'], [/Guardia/, 'ojo']];
function partyLogo(p){
  if (p.logoUrl) return p.logoUrl;
  const h = hashStr(p.name), sym = (LOGO_KEYS.find(([re]) => re.test(p.name)) || [0, p.ideo < -.3 ? 'puno' : p.ideo > .3 ? 'espada' : 'estrella'])[1];
  const shape = ['circulo', 'escudo', 'cuadrado', 'rombo'][h % 4], S = 15, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const inside = (i, j) => { const u = i - 7, v = j - 7; return shape === 'circulo' ? u * u + v * v <= 50 : shape === 'rombo' ? Math.abs(u) + Math.abs(v) <= 8 : shape === 'escudo' ? (j < 9 ? Math.abs(u) <= 6 && j >= 1 : Math.abs(u) <= 6 - (j - 9)) : Math.abs(u) <= 6 && Math.abs(v) <= 6; };
  const dark = shade(p.col, .55), fg = p.ideo > .3 ? '#f0d060' : '#f6ead2';
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    if (!inside(i, j)) continue;
    const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
    x.fillStyle = edge ? dark : p.col; x.fillRect(i, j, 1, 1);
  }
  LOGO_SYM[sym].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') { x.fillStyle = fg; x.fillRect(4 + i, 4 + j, 1, 1); } }));
  return p.logoUrl = c.toDataURL();
}
const logoImg = (p, sz = 18) => `<img class="plogo" src="${partyLogo(p)}" width="${sz}" height="${sz}" alt="" title="${esc(p.name)}">`;
// Redibujar una ficha sin quitarle el clic al jugador: si está pulsando dentro, se espera; si solo tiene el ratón encima, se refresca más despacio
let uiDown = false;
addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.vcard,.pcard,.chron,.toasts')) uiDown = true; }, true);
addEventListener('pointerup', () => { setTimeout(() => { uiDown = false; }, 0); }, true);
function setCardHTML(el, html, force){
  if (el._html === html) return;
  if (!force && el.matches(':hover') && (uiDown || performance.now() - (el._t || 0) < 1500)) return;
  const sc = el.querySelector('.cbody') || el, top = sc.scrollTop;
  el.innerHTML = html; el._html = html; el._t = performance.now();
  (el.querySelector('.cbody') || el).scrollTop = top;
}
// ---- Retratos, ánimo y familia de cada persona ----
const portraitCache = new WeakMap();
function portraitUrl(v, px = 3){
  const s = personSprite(v, 0, false); let m = portraitCache.get(s); if (!m) portraitCache.set(s, m = {});
  if (m[px]) return m[px];
  const c = document.createElement('canvas'); c.width = s.width * px; c.height = s.height * px; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, c.width, c.height);
  return m[px] = c.toDataURL();
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const ageOf = v => (yearT - v.born) / YEAR;
const stageOf = v => { const a = ageOf(v); return a < ADULT_H ? (v.sex === 'm' ? 'niña' : 'niño') : a > v.life * .8 ? (v.sex === 'm' ? 'anciana' : 'anciano') : (v.sex === 'm' ? 'adulta' : 'adulto'); };
const pietyOf = v => v.piety ??= clamp((v.parents ? ((v.parents[0].piety ?? .5) + (v.parents[1].piety ?? .5)) / 2 : .5) + (Math.random() - .5), 0, 1);
const ofW = (o, v) => !o ? '' : v.sex !== 'm' ? o : /or$/.test(o) ? o + 'a' : /o$/.test(o) ? o.slice(0, -1) + 'a' : o; // agricultora, maestra, bombera
const oficioTxt = v => ofW(v.oficio, v);
function doingOf(v){ const s0 = villagerInfo(v), m = s0.match(/años · ([^·]+) ·/); return m ? m[1].trim() : ''; }
function partyOf(v){ const n = nationOf(villageById(v.vid) || {}); if (!n || !n.parties) return null; let best = null, bd = Infinity; for (const p of n.parties) { const d = Math.abs((v.ideo || 0) - p.ideo); if (d < bd) { bd = d; best = p; } } return best; }
// Ánimo: lo que le pasa a esa persona (hambre, sed, salud, luto, dinero, hogar) y a su pueblo (descontento, fe, gobierno)
function moodOf(v){
  const g = villageById(v.vid), f = [];
  const add = (d, why) => { if (Math.abs(d) >= 3) f.push([d, why]); };
  add((Math.min(v.food, .7) - .45) * 60, v.food < .3 ? 'tiene hambre' : v.food < .45 ? 'tiene algo de hambre' : 'come bien');
  add((Math.min(v.water, .7) - .45) * 60, v.water < .3 ? 'tiene sed' : v.water < .45 ? 'tiene algo de sed' : 'bebe bien');
  if ((v.hp ?? 1) < .9) add(((v.hp ?? 1) - 1) * 50, 'está herido');
  if (v.mourn && yearT - v.mourn.t < DAY_LEN * 2) add(-25, `está de luto por ${v.mourn.who}`);
  if (g) {
    if ((g.anger || 0) > 20) add(-(g.anger || 0) * .3, `le preocupa ${GRIEF_TXT[g.grief] || 'cómo van las cosas'}`);
    if (ageOf(v) >= ADULT_H && (nationOf(g).parties)) { const gap = Math.abs((v.ideo || 0) - govIdeo(g)); add(gap < .3 ? 8 : -(gap - .3) * 25, gap < .3 ? 'le gusta el gobierno' : 'no le gusta el gobierno'); }
    if (g.faith && pietyOf(v) > .6) add((g.wrath || 0) > 3 ? -10 : 8, (g.wrath || 0) > 3 ? `teme la ira de ${g.faith.god}` : 'su fe le da paz');
    if (g.coin && ageOf(v) >= ADULT_H) add((v.money || 0) >= priceOf(g) * 5 ? 6 : -8, (v.money || 0) >= priceOf(g) * 5 ? 'tiene ahorros' : 'anda sin dinero');
    socialMood(v, g, add);
    if (g.coin && v.wage != null) { const c = costOfLiving(g), w = wageDay(v); add(w >= c * 1.4 ? 7 : w >= c ? 2 : -12, w >= c * 1.4 ? 'gana un buen sueldo' : w >= c ? 'el sueldo le da para vivir' : 'su sueldo no le llega'); }
    if ([...rels.values()].some(r => r.war && (r.war.att === nationOf(g).id || r.war.def === nationOf(g).id))) add(-8, 'su pueblo está en guerra');
  }
  if (v.home == null || !world.objs[v.home]) { if (ageOf(v) >= ADULT_H) add(-6, 'no tiene casa'); } else add(5, 'tiene casa');
  if (g) { housingMood(v, g, add); stockMood(v, g, add); }
  if (v.task && v.task.k === 'detenido') add(-30, 'está detenido');
  if (g && ageOf(v) >= ADULT_H) { if (hasLaw(g, 'jornada_larga')) add(-8, 'trabaja demasiadas horas'); else if (hasLaw(g, 'jornada_corta')) add(5, 'tiene una jornada corta'); }
  if (v.fun && yearT - v.fun < DAY_LEN) add(6, 'ha tenido tiempo libre');
  if (g && hasHosp(g) && ((v.hp ?? 1) < .9 || ageOf(v) > v.life * .7)) add(5, 'tiene un hospital cerca');
  if (v.task && v.task.k === 'protesta') add(-8, 'está protestando');
  const kids = (v.kids || []).filter(k => !k.dead).length; if (kids) add(6, `tiene ${kids} hij${kids > 1 ? 'os' : 'o'}`);
  const score = clamp(Math.round(55 + f.reduce((a, [d]) => a + d, 0)), 0, 100);
  const word = score > 78 ? 'Feliz' : score > 60 ? 'Contento' : score > 45 ? 'Tranquilo' : score > 30 ? 'Preocupado' : score > 15 ? 'Triste' : 'Desesperado';
  f.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
  return { score, word, good:f.filter(x => x[0] > 0).slice(0, 3).map(x => x[1]), bad:f.filter(x => x[0] < 0).slice(0, 3).map(x => x[1]) };
}
const moodCol = s => s > 60 ? '#7ab04a' : s > 40 ? '#d8b848' : s > 25 ? '#e08a3a' : '#d8483a';
const bar = (k, col, w = 100) => `<span class="bar" style="width:${w}px"><i style="width:${Math.round(clamp(k, 0, 1) * 100)}%;background:${col}"></i></span>`;
// Referencias para poder pinchar en un pariente y seguirle
let uidSeq = 0;
const refOf = v => v.uid ??= ++uidSeq;
function famNode(v, rel, me){
  if (!v) return `<div class="fam none"><span class="fr">${rel}</span>—</div>`;
  const a = Math.floor(ageOf(v));
  return `<button class="fam${v.dead ? ' dead' : ''}${me ? ' me' : ''}" ${v.dead ? 'disabled' : `data-pid="${refOf(v)}"`} title="${esc(v.name)}${v.dead ? ` (murió: ${esc(v.dead)})` : ''}">
    <img src="${portraitUrl(v, 2)}" alt=""><span class="fn">${esc(v.name)}${v.dead ? ' †' : ''}</span><span class="fr">${rel}${v.dead ? '' : ` · ${a}`}</span></button>`;
}
const sexW = (v, m, f) => v.sex === 'm' ? f : m;
function familyTree(v){
  const par = v.parents || [], gp = k => (par[k] && par[k].parents) || [];
  const kids = (v.kids || []), partner = (v.partners || []).slice(-1)[0];
  const sibs = par.length ? villagers.filter(u => u !== v && !u.dead && u.parents && u.parents[0] === par[0] && u.parents[1] === par[1]) : [];
  const row = (arr) => `<div class="famrow">${arr.join('')}</div>`;
  let h = '';
  if (gp(0).length || gp(1).length) h += row([famNode(gp(0)[1], 'abuelo'), famNode(gp(0)[0], 'abuela'), famNode(gp(1)[1], 'abuelo'), famNode(gp(1)[0], 'abuela')]);
  if (par.length) h += row([famNode(par[1], 'padre'), famNode(par[0], 'madre')]);
  h += row([famNode(v, sexW(v, 'él', 'ella'), true), ...(partner ? [famNode(partner, 'pareja')] : [])]);
  if (sibs.length) h += `<div class="famlbl">Hermanos</div>` + row(sibs.slice(0, 6).map(u => famNode(u, sexW(u, 'hermano', 'hermana'))));
  if (kids.length) h += `<div class="famlbl">Hijos</div>` + row(kids.slice(0, 8).map(u => famNode(u, sexW(u, 'hijo', 'hija'))));
  if (!par.length && !kids.length && !partner) h += `<div class="muted">De los primeros pobladores: no se sabe de dónde viene${ageOf(v) >= ADULT_H ? ' y aún no tiene hijos' : ''}.</div>`;
  return h;
}
function renderPersonCard(force){
  const el = $('pcard'), v = follow;
  if (!v || v.born === undefined) { el.hidden = true; return; }
  el.hidden = false;
  const g = villageById(v.vid), n = g && nationOf(g), a = ageOf(v), mood = moodOf(v), p = partyOf(v), reg = g ? regimeOf(g) : null;
  const life = clamp(a / v.life, 0, 1), money = g && g.coin ? `${v.money || 0} ${coinPl(g)}` : '—';
  const gods = g && g.faith ? allGods(g.faith) : [], godList = gods.map(d => esc(godTxt(d))).join('; '), godNames = gods.map(d => esc(d.god)).join(', ').replace(/, ([^,]*)$/, ' y $1');
  const belief = otherFaith(v, g) ? `Reza a ${esc(v.creed.god)}${v.creed.from ? `, la fe que trajo de ${esc(v.creed.from)}` : ''} (${(v.zeal || 0) > .6 ? 'predica y quiere convertir a los demás' : 'la vive en paz'})${g && g.faith ? `; en su pueblo veneran a ${esc(g.faith.god)}` : ''}` : !g || !g.faith ? 'En su pueblo aún no hay religión' : pietyOf(v) > .75 ? `Muy devot${sexW(v, 'o', 'a')} de ${esc(g.faith.name)}: venera a ${godList}` : pietyOf(v) > .3 ? `Creyente de ${esc(g.faith.name)}: ${godList}` : `No es creyente, aunque en su pueblo veneran a ${godNames}`;
  const vote = a < ADULT_H ? 'Aún no vota' : !p ? 'En su pueblo no hay partidos' : votes(g) ? `${logoImg(p, 30)} Vota a ${artP(p)} <b style="color:${p.col}">${esc(p.name)}</b>` : `${logoImg(p, 30)} Simpatiza con ${artP(p)} <b style="color:${p.col}">${esc(p.name)}</b> (no hay elecciones: ${regimeName(g).toLowerCase()})`;
  const ideoPos = ((v.ideo || 0) + 1) / 2 * 100;
  setCardHTML(el, `<div class="ph"><img class="pp" src="${portraitUrl(v, 4)}" alt=""><div><h3>${esc(v.name)}</h3>
      <div class="muted">${v.sex === 'h' ? 'Hombre' : 'Mujer'} · ${Math.floor(a)} año${Math.floor(a) === 1 ? '' : 's'} (${stageOf(v)})</div>
      <div>${g ? `<button class="lnk" data-vid="${g.id}" title="Ver la ficha del pueblo">${n.flagUrl ? `<img class="fl" src="${n.flagUrl}" alt="">` : ''}${esc(g.name)}</button>` : 'Sin pueblo'}${g && g.leader === v ? ` · <b class="gold">${leaderTitle(g)}</b>` : ''}</div></div>
      <button class="x" aria-label="Soltar">×</button></div>
    <div class="lifebar" title="Vida: ${Math.round(life * 100)} %">${bar(life, life > .8 ? '#b89a6a' : '#6a9ac8', 270)}</div>
    <div class="sec"><div class="kv"><span>Oficio</span><b>${a < ADULT_H ? 'Ninguno (es pequeñ' + sexW(v, 'o', 'a') + ')' : oficioTxt(v) || 'Sin oficio'}</b></div>
      <div class="kv"><span>Ahora</span><b>${esc(doingOf(v))}</b></div>
      ${ageOf(v) >= ADULT_H ? `<div class="kv"><span>Orientación</span><b>${ORIENT_TXT[orientOf(v)]}${partnerOf(v) ? ` · pareja: ${esc(partnerOf(v).name)}${v.secret ? ' <span class="muted">(en secreto)</span>' : ''}` : ''}${g && isMinority(v, g) ? ' · <span class="muted">de piel distinta a la mayoría</span>' : ''}</b></div>` : ''}
      ${v.edu ? `<div class="kv"><span>Estudios</span><b>${v.edu >= .7 ? 'muy formad' + sexW(v, 'o', 'a') : v.edu >= .3 ? 'fue a la escuela' : 'algo de escuela'}${ageOf(v) >= ADULT_H ? ' <span class="muted">(cobra más)</span>' : ''}</b></div>` : ''}
      <div class="kv"><span>Dieta</span><b>${dietName(v)}</b></div>
      ${g && ageOf(v) >= ADULT_H ? (g.coin ? `<div class="kv"><span>Sueldo</span><b>${v.wage != null || v.dayPay ? `${wageDay(v)} ${coinPl(g)} al día <span class="muted">(vivir cuesta ${costOfLiving(g)})</span>${wageDay(v) < costOfLiving(g) ? ' · <span style="color:#f08a7a">no le llega</span>' : ''}` : '<span class="muted">aún no ha cobrado</span>'}</b></div><div class="kv"><span>Dinero</span><b>${v.money || 0} ${coinPl(g)} · ha ganado ${v.earned || 0} · impuestos ${Math.round(taxRateOf(g) * 100)} %</b></div>` : `<div class="kv"><span>Sueldo</span><b class="muted">en especie: su pueblo aún no tiene moneda</b></div>`) : ''}
      ${stockLine(v, g)}
      <div class="kv"><span>Equipo</span><b>${[v.weapon && (v.weapon === 'lanza' && v.ironW ? 'lanza de hierro' : v.weapon), v.shield && 'escudo', v.armor && GEAR_TXT[v.armor], v.rod && 'caña', v.mount && 'caballo', v.cart && 'carro', v.swims === false && 'no sabe nadar'].filter(Boolean).join(', ') || 'nada'}</b></div></div>
    <h4>Ánimo</h4><div class="mood"><span class="mw" style="color:${moodCol(mood.score)}">${mood.word}</span>${bar(mood.score / 100, moodCol(mood.score), 120)} <span class="muted">${mood.score}/100</span></div>
    ${mood.good.length ? `<div class="why good">+ ${mood.good.join(' · ')}</div>` : ''}${mood.bad.length ? `<div class="why bad">− ${mood.bad.join(' · ')}</div>` : ''}
    <h4>Necesidades</h4><div class="needs">
      <span>Comida</span>${bar(v.food, v.food < .3 ? '#d8483a' : '#7ab04a')}<span>${Math.round(v.food * 100)} %</span>
      <span>Agua</span>${bar(v.water, v.water < .3 ? '#d8483a' : '#5a9ad8')}<span>${Math.round(v.water * 100)} %</span>
      <span>Salud</span>${bar(v.hp ?? 1, (v.hp ?? 1) < .5 ? '#d8483a' : '#d86a8a')}<span>${Math.round((v.hp ?? 1) * 100)} %</span>
      <span>Dinero</span>${bar(g && g.coin ? (v.money || 0) / (priceOf(g) * 15) : 0, '#e8c050')}<span>${money}</span>
      <span>Hogar</span>${bar(v.home != null && world.objs[v.home] ? 1 : 0, '#b88a5a')}<span>${homeTxt(v, g)}</span></div>
    <h4>Política</h4><div>${vote}</div>
    <div class="ideo"><span>izquierda</span><span class="track"><i style="left:${ideoPos}%"></i></span><span>derecha</span></div>
    <h4>Creencias</h4><div>${belief}</div>
    <h4>Familia</h4><div class="tree">${familyTree(v)}</div>`, force);
}
// ---- Ficha del pueblo, por pestañas ----
let cardTab = 'resumen';
const CARD_TABS = [['resumen', 'Resumen'], ['gente', 'Gente'], ['economia', 'Economía'], ['politica', 'Política'], ['calendario', 'Calendario'], ['deportes', 'Deportes'], ['mapa', 'Mapa'], ['historia', 'Historia']];
function logKind(t){ return /guerra|ataca|saque|conquist|muerto en|Emboscada|rechaz|asalto/.test(t) ? 'war' : /elecciones|golpe|Golpe|revoluc|Manifest|partido|corona|régimen|independiza|rey|reina/.test(t) ? 'pol' : /moneda|banco|precios|Bancarrota|inflación|Flujo|presta|mercado|caravana/.test(t) ? 'eco' : /dios|diosa|ritual|templo|venerar|sacrific|ofrenda|fe /.test(t) ? 'rel' : /Murió|muere|ahogado/.test(t) ? 'death' : 'misc'; }
function tile(label, val, sub){ return `<div class="tile"><span>${label}</span><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div>`; }
function renderVillageCard(force){
  const el = $('vcard'), g = villageById(cardVid);
  if (!g || !popOf(g)) { el.hidden = true; cardVid = 0; return; }
  el.hidden = false;
  const n = nationOf(g), ps = villagers.filter(v => !v.dead && v.vid === g.id), kids = ps.filter(v => ageOf(v) < ADULT_H).length, old = ps.filter(v => ageOf(v) > v.life * .8).length;
  const moods = ps.map(v => moodOf(v).score), avgMood = moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : 50;
  const reg = regimeOf(g), al = allianceOf(g), cap = capOf(g), anger = Math.round(g.anger || 0);
  const provinces = villages.filter(o => o !== g && popOf(o) && o.nation === g.id);
  const status = n !== g ? `Provincia de ${esc(n.name)}` : provinces.length ? `Capital de ${provinces.length} pueblo${provinces.length > 1 ? 's' : ''}` : 'Nación independiente';
  const wars = villages.filter(o => o !== g && popOf(o) && rels.get(relKey(g, o)) && rels.get(relKey(g, o)).war);
  let body = '';
  if (cardTab === 'resumen') {
    body = `<div class="tiles">${tile('Habitantes', ps.length, `${kids} niños · ${old} ancianos`)}${tile('Casas', housesOf(g).length, `${buildingsOf(g).filter(b => world.objs[b]).length} edificios`)}${tile('Ánimo', `<span style="color:${moodCol(avgMood)}">${avgMood}</span>`, avgMood > 60 ? 'contentos' : avgMood > 40 ? 'tranquilos' : 'descontentos')}${tile('Fundada', `día ${Math.floor((g.born || 0) / DAY_LEN) + 1}`, g.leader && !g.leader.dead ? `${leaderTitle(g)}: <button class="lnk" data-pid="${refOf(g.leader)}">${esc(g.leader.name)}</button>` : 'sin líder')}</div>
      <h4>Almacén</h4><div class="needs">
        <span>Comida</span>${bar(g.food / cap, '#7ab04a', 150)}<span>${Math.floor(g.food)}</span>
        <span>Madera</span>${bar(g.wood / cap, '#b8864e', 150)}<span>${g.wood}</span>
        <span>Piedra</span>${bar(g.stone / cap, '#a8a49c', 150)}<span>${g.stone}</span>
        ${(g.know || {}).manga ? `<span>Tela</span>${bar((g.cloth || 0) / 20, '#d8ccb0', 150)}<span>${g.cloth || 0}${balloonsOf(g).length ? ` · ${balloonsOf(g).length === 1 ? 'globo' : `${balloonsOf(g).length} globos`} (${balloonsOf(g).map(b => b.cap).join(', ')} plazas)` : ''}</span>` : ''}
        <span>Agua</span>${bar((g.jars || 0) / (6 + storesOf(g).length * 8), '#5a9ad8', 150)}<span>${g.jars || 0} cántaros${g.cups ? ` · ${g.cups} tazas` : ''}</span>
        ${g.iron || g.gold || g.gems || g.hides ? `<span>Materiales</span><span class="muted">hierro ${g.iron || 0} · oro ${g.gold || 0} · gemas ${g.gems || 0} · pieles ${g.hides || 0}</span><span></span>` : ''}</div>
      ${langCard(g)}
      <h4>Estado</h4><div class="needs"><span>Descontento</span>${bar(anger / 100, anger > 60 ? '#d8483a' : anger > 35 ? '#e8a838' : '#7ab04a', 150)}<span>${anger} %</span></div>
      ${g.protest ? '<div class="alert">Manifestación en curso</div>' : ''}${g.coup ? '<div class="alert">Golpe de estado en curso</div>' : ''}${wars.length ? `<div class="alert">En guerra con ${wars.map(o => `<button class="lnk" data-vid="${o.id}">${esc(o.name)}</button> (${REASON_TXT[rels.get(relKey(g, o)).war.reason] || 'el territorio'})`).join(', ')}</div>` : ''}
      ${g.faith ? `<h4>Religión</h4><div>${esc(g.faith.name)} · ${g.faith.mono ? 'monoteístas: un solo dios' : (g.faith.pantheon || []).length ? `politeístas: ${allGods(g.faith).length} dioses` : 'politeístas (de momento, un dios)'}</div><div class="gods">${allGods(g.faith).map((d, k) => `<span class="god${k === 0 ? ' main' : ''}"><b>${esc(d.god)}</b>${esc(godTxt(d).slice(d.god.length + 1))}${k === 0 ? ' <em>principal</em>' : ''}</span>`).join('')}</div>` : ''}
      <h4>Tecnologías</h4><div class="chips">${techsOf(g).map(t => `<span>${t}</span>`).join('')}</div>`;
  } else if (cardTab === 'gente') {
    const adults = ps.filter(v => ageOf(v) >= ADULT_H), of = new Map(); for (const v of adults) { const k = v.oficio || 'sin oficio'; of.set(k, (of.get(k) || 0) + 1); }
    const ofs = [...of].sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...ofs.map(x => x[1]));
    const bins = [0, 0, 0, 0, 0]; for (const v of adults) bins[clamp(Math.floor(((v.ideo || 0) + 1) / 2 * 5), 0, 4)]++; const bm = Math.max(1, ...bins);
    const believers = g.faith ? ps.filter(v => pietyOf(v) > .3).length : 0;
    const notable = [...ps].sort((a, b) => (b === g.leader) - (a === g.leader) || a.born - b.born).slice(0, 6);
    body = `<h4>Oficios</h4><div class="hbars">${ofs.map(([k, c]) => `<span>${k}</span>${bar(c / mx, '#6a9ac8', 140)}<span>${c}</span>`).join('')}</div>
      <h4>Ideas políticas</h4><div class="hist">${bins.map((c, k) => `<i style="height:${Math.round(c / bm * 36) + 2}px;background:${['#d8483a', '#e08a6a', '#c8b890', '#7a9ad8', '#3a6ab8'][k]}" title="${c}"></i>`).join('')}</div><div class="ideo-l"><span>izquierda</span><span>centro</span><span>derecha</span></div>
      <h4>Creencias</h4><div>${g.faith ? `${believers} de ${ps.length} son creyentes (${Math.round(believers / Math.max(1, ps.length) * 100)} %)` : 'Aún no tienen religión'}${(fs => fs.length ? ` · <b>${fs.length}</b> de otra fe (${[...new Set(fs.map(u => u.creed.god))].join(', ')}): ${persecutesFaith(g) ? 'perseguidos' : hasLaw(g, 'libertad_religiosa') ? 'con libertad de culto' : 'tolerados'}` : '')(ps.filter(u => otherFaith(u, g)))}</div>
      ${g.cemetery ? `<h4>Cementerio</h4><div>${g.cemetery.graves.size} tumba${g.cemetery.graves.size === 1 ? '' : 's'}${g.cemetery.graves.size ? ': ' + [...g.cemetery.graves.values()].sort((a, b) => b.t - a.t).slice(0, 6).map(gr => `† ${esc(gr.name)} (${gr.age} años, ${esc(gr.cause)}, día ${gr.d})`).join(' · ') : ''}</div>` : ''}
      <h4>Muertes</h4><div>${Object.entries(g.deaths || {}).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${k} por ${c}`).join(' · ') || 'Ninguna todavía'}</div>
      <h4>Gente destacada</h4><div class="famrow">${notable.map(v => famNode(v, v === g.leader ? leaderTitle(g) : oficioTxt(v) || stageOf(v))).join('')}</div>`;
  } else if (cardTab === 'economia') {
    body = `<div>${econCard(g)}</div>${rescueCard(g)}${wealthCard(g)}${seasonsCard(g)}${goodsCard(g)}${mineCard(g)}${unionCard(g)}${instCard(g)}`;
  } else if (cardTab === 'politica') {
    const vr = n.voteRes;
    body = `<div>${govCard(g)}</div>
      ${n.parties ? `<h4>Partidos</h4><div class="parties">${n.parties.map((q, k) => { const pct = vr && vr[k] != null ? vr[k] : null; return `<div class="party${n.ruling === k ? ' on' : ''}">${logoImg(q, 30)}<div class="pi"><b style="color:${q.col}">${esc(q.name)}</b> <span class="muted">(${esc(q.abbr || siglas(q.name))})</span><b>${n.ruling === k ? ' <span class="gold">★ gobierna</span>' : ''}</b><span class="muted">${sideTxt(q)} · propone: ${q.laws.map(l => LAW_TXT[l]).join(', ')}</span>${pct != null ? `<span class="pv">${bar(pct / 100, q.col, 150)} ${pct} %</span>` : ''}</div></div>`; }).join('')}</div>` : '<h4>Partidos</h4><div>Aún no tienen partidos</div>'}
      <h4>Leyes</h4><div class="laws">${lawsOf(g).map(l => `<div><b>${LAW_TXT[l]}</b><span class="muted">${LAW_DESC[l] || ''}</span></div>`).join('') || '<div class="muted">Sin leyes propias todavía</div>'}</div>
      ${(nationOf(g).lawHist || []).length ? `<h4>Historia de las leyes</h4><ul class="log">${nationOf(g).lawHist.slice().reverse().map(e => `<li class="pol"><span class="d">día ${e.d}</span>${esc(e.txt.replace(`En ${nationOf(g).name} `, ''))}</li>`).join('')}</ul>` : ''}
      ${colonyCard(g)}${justiceCard(g)}${pressCard(g)}${scienceCard(g)}${councilCard(g)}${spyCard(g)}${cultureCard(g)}
      <h4>Horario</h4><div>${shiftTxt(g)}${inShift(g) ? ' · <b>ahora trabajan</b>' : isNight() ? ' · ahora duermen' : ' · <b>ahora es su tiempo libre</b>'}</div>
      <h4>Nación</h4><div>${status}${provinces.length ? `: ${provinces.map(o => `<button class="lnk" data-vid="${o.id}">${esc(o.name)}</button>`).join(', ')}` : ''}${n !== g ? ` · descontento con la capital ${Math.round(g.unrest || 0)} %` : ''}</div>
      ${allyCard(g)}${warCard(g)}${treatyCard(g)}
      <h4>Relaciones</h4><div class="chips rel">${villages.filter(o => o !== g && popOf(o) && rels.get(relKey(g, o)) && rels.get(relKey(g, o)).known).map(o => { const r = rels.get(relKey(g, o)), w = relWord(r), c = r.war ? '#d8483a' : r.v > 40 ? '#7ab04a' : r.v > 0 ? '#a8c060' : r.v > -30 ? '#d8b848' : '#e08a3a'; return `<button class="relb" data-vid="${o.id}" style="border-color:${c}" title="Ver la ficha de ${esc(o.name)}">${o.flagUrl ? `<img src="${o.flagUrl}" alt="">` : ''}${esc(o.name)} · <b style="color:${c}">${r.war ? 'en guerra' : w}</b></button>`; }).join('') || 'Aún no conocen a nadie'}</div>`;
  } else if (cardTab === 'deportes') {
    body = sportsTab(g);
  } else if (cardTab === 'calendario') {
    body = calendarTab(g);
  } else if (cardTab === 'mapa') {
    body = chartCard(g) + buildingsList(g);
  } else {
    body = `<ul class="log">${(g.log || []).slice(-30).reverse().map(e => `<li class="${logKind(e.txt)}"><span class="d">día ${e.d}</span>${esc(e.txt.startsWith(`En ${g.name} `) ? capFirst(e.txt.slice(g.name.length + 4)) : e.txt)}</li>`).join('') || '<li>Nada destacable aún</li>'}</ul>`;
  }
  setCardHTML(el, `<div class="vh">${n.flagUrl ? `<img class="flag" src="${n.flagUrl}" alt="">` : '<span class="flag none"></span>'}<div><h3>${esc(g.name)}</h3>
      <div class="pills"><span>${regimeName(g)}</span><span>${status}</span>${al ? `<span class="ally">${esc(al.abbr)}</span>` : ''}${g.coin ? `<span class="coin">${esc(g.coin)}</span>` : ''}</div></div>
      <div class="vbtns"><button class="go" data-go="${g.id}" title="Llevar la cámara al pueblo">Ir</button><button class="x" aria-label="Cerrar">×</button></div></div>
    <div class="tabs">${CARD_TABS.map(([k, t]) => `<button data-tab="${k}"${cardTab === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
    <div class="cbody">${body}</div>`, force);
}
// ---- Daños en los edificios: tormentas, terremotos, tsunamis y fuego ----
const BLD = new Set(['granary', 'smoke', 'woodshed', 'post', 'university', 'council', 'spy', 'mine', 'court', 'jail', 'press', 'union', 'parliament', 'academy', 'house', 'hall', 'store', 'market', 'mill', 'tower', 'well', 'temple', 'obelisk', 'altar', 'bank', 'wonder', 'forge', 'hospital', 'barracks', 'tradehall', 'theater', 'coliseum', 'tavern', 'cathedral', 'school']);
const isBuilding = o => !!o && BLD.has(o.key.split(':')[0]);
const wooden = o => /^(house:hut|store|market|mill|tower)/.test(o.key); // de madera: arden; los de piedra, apenas
const bldName = o => OBJ[o.key][0].toLowerCase();
function damageBuilding(i, amt){
  const o = world.objs[i]; if (!isBuilding(o)) return false;
  const x = i % W, y = (i / W) | 0, g = villageById(o.vid);
  o.dmg = (o.dmg || 0) + amt * (wooden(o) ? 1 : .55);
  if (o.dmg >= 1) { // se derrumba del todo: no queda nada
    world.objs[i] = null; addEffect(x * T + 2, y * T + 3, 'poof');
    for (let n = 0; n < 8; n++) chips.push({ x:x * T + 2, y:y * T - 4, vx:(Math.random() - .5) * 30, vy:-10 - Math.random() * 14, life:0, max:.6 + Math.random() * .4, col:n % 2 ? '#8a6a48' : '#6a6a64' });
    if (g) { notify(`En ${g.name} se ha derrumbado ${o.key.startsWith('house') ? 'una casa' : 'el ' + bldName(o)}`, { x:x * T, y:y * T }); misfortune(g, 'derrumbe'); }
  } else if (o.dmg > .3 && !o.dmgMsg && g) { o.dmgMsg = true; notify(`En ${g.name} ${o.key.startsWith('house') ? 'una casa ha quedado' : 'el ' + bldName(o) + ' ha quedado'} medio derruid${o.key.startsWith('house') || /^(store|tower|well)/.test(o.key) ? 'a' : 'o'}`, { x:x * T, y:y * T }); }
  composeRegion(x - 8, y - 12, x + 8, y + 12);
  return true;
}
// Fuego dentro del territorio de la aldea o cerca de ella (el más cercano a la hoguera)
function fireNear(g){
  let best = null, bd = 30;
  for (const [i, f] of fires) { if (f.ctrl) continue; const d = Math.hypot((i % W) - g.fx, ((i / W) | 0) - g.fy); if (d < bd) { bd = d; best = i; } }
  return best;
}
const standNear = i => { const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0]]) if (tileFree(x + dx, y + dy) && !fires.has((y + dy) * W + x + dx)) return [(x + dx) * T + 2, (y + dy) * T + 3]; return null; };
// ---- Ofrendas y sacrificios: cuanto más enfadado creen que está su dios, más ofrecen ----
// Lugar sagrado: la puerta del templo o, si no hay, junto al altar
function altarSpot(g){
  if (g.holy && !(g.altar != null && world.objs[g.altar]) && !(g.temple != null && world.objs[g.temple])) return [g.holy.cx * T + 2, g.holy.cy * T + 3];
  if (g.temple != null && world.objs[g.temple] && !world.objs[g.temple].burnt) return [(g.temple % W) * T + 2, ((g.temple / W) | 0) * T + 3 + T];
  if (g.altar != null && world.objs[g.altar]) return standBy(g.altar);
  return null;
}
// ---- Rituales: los creyentes se reúnen en el lugar sagrado con la forma que ha inventado su fe (círculo, media luna,
// filas, doble corro…), mirando al centro, donde se pone quien manda; rezan juntos un rato ----
const RITUAL_SHAPES = ['círculo', 'media luna', 'filas', 'doble corro', 'cuadrado', 'aspa', 'triángulo', 'espiral', 'estrella'];
// Puntos a lo largo de un polígono cerrado (vértices en píxeles relativos al centro), repartidos por igual
function alongPoly(pts, k, n){
  const seg = pts.map((p, j) => { const q = pts[(j + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); }), tot = seg.reduce((a, b) => a + b, 0);
  let d = (k + .5) / n * tot, j = 0; while (d > seg[j] && j < seg.length - 1) { d -= seg[j]; j++; }
  const p = pts[j], q = pts[(j + 1) % pts.length], f = d / seg[j]; return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
}
function ritualSpots(shape, cx, cy, n){
  const out = [], R = 14 + n * 1.6, sq = .62;
  for (let k = 0; k < n; k++) {
    let p;
    if (shape === 'círculo') { const a = k / n * Math.PI * 2; p = [Math.cos(a) * R, Math.sin(a) * R * sq]; }
    else if (shape === 'media luna') { const a = Math.PI * (.08 + .84 * (n > 1 ? k / (n - 1) : .5)); p = [Math.cos(a) * (R + 4), 4 + Math.sin(a) * (R + 4) * sq]; }
    else if (shape === 'filas') { const c = k % 5, r = Math.floor(k / 5); p = [(c - 2) * 10, 14 + r * 10]; }
    else if (shape === 'cuadrado') p = alongPoly([[-R, -R * sq], [R, -R * sq], [R, R * sq], [-R, R * sq]], k, n);
    else if (shape === 'triángulo') p = alongPoly([[0, -R * .85], [R, R * sq], [-R, R * sq]], k, n);
    else if (shape === 'aspa') { const arm = k % 4, step = Math.floor(k / 4) + 1, m = Math.ceil(n / 4), d = step / m * R; p = [[d, d * sq], [-d, d * sq], [d, -d * sq], [-d, -d * sq]][arm]; }
    else if (shape === 'espiral') { const a = k * .85, r = 8 + k * 2.4; p = [Math.cos(a) * r, Math.sin(a) * r * sq]; }
    else if (shape === 'estrella') { const v = [...Array(10)].map((_, j) => { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? R * .45 : R * 1.1; return [Math.cos(a) * rr, Math.sin(a) * rr * sq]; }); p = alongPoly(v, k, n); }
    else { const inner = k % 2 === 0, a = k / n * Math.PI * 2; p = [Math.cos(a) * (inner ? 13 : 26), Math.sin(a) * (inner ? 8 : 16)]; }
    out.push([cx + p[0], cy + p[1]]);
  }
  return out;
}
// Cada fe ofrece a su manera: sobre el altar, quemándolo en una hoguera sagrada, arrojándolo al agua o enterrándolo
const RITES = ['altar', 'hoguera', 'agua', 'tierra'];
const RITE_TXT = { altar:'sobre el altar', hoguera:'quemados en una hoguera sagrada', agua:'arrojados al agua', tierra:'enterrados en la tierra', volcan:'arrojados al cráter del volcán' };
// Los fieles de un dios del fuego, de las montañas o del inframundo con un volcán cerca le llevan las ofrendas al cráter
const VOLC_DOMS = ['el fuego', 'las montañas', 'el inframundo'];
const volcanoNear = g => { let best = null, bd = 50; for (const vo of (world.volcanoes || [])) { const d = Math.hypot(vo.cx - g.fx, vo.cy - g.fy); if (d < bd) { bd = d; best = vo; } } return best; };
const riteOf = g => { const f = g.faith; if (f.rite !== 'volcan' && VOLC_DOMS.includes(f.dom) && volcanoNear(g)) f.rite = 'volcan'; if (f.rite === 'volcan' && !volcanoNear(g)) f.rite = null; return f.rite ||= RITES[Math.floor(Math.random() * RITES.length)]; };
// Un sitio en el borde del cráter, por el lado del pueblo, donde se pueda estar de pie
function craterSpot(g){
  const vo = volcanoNear(g); if (!vo) return null;
  const dx = g.fx - vo.cx, dy = g.fy - vo.cy, d = Math.hypot(dx, dy) || 1, rr = Math.max(2, (vo.r || 6) * .55);
  const p = ringFind(Math.round(vo.cx + dx / d * rr), Math.round(vo.cy + dy / d * rr), 6, (x, y) => tileFree(x, y) && world.biome[y * W + x] !== B.LAVA && !WATER[world.biome[y * W + x]]);
  return p ? [p[0] * T + 2, p[1] * T + 3] : null;
}
// Dónde se hace la ofrenda según su rito (el agua: la orilla más cercana al lugar sagrado)
function riteSpot(g, v){
  const sp = altarSpot(g); if (!sp) return null;
  if (riteOf(g) === 'agua') { const w = waterSpot(Math.floor(sp[0] / T), Math.floor(sp[1] / T), v); if (w) return w; }
  if (riteOf(g) === 'volcan') { const c = craterSpot(g); if (c) return c; }
  return sp;
}
function riteFx(g, x, y, big){
  const r = riteOf(g), n = big ? 14 : 8;
  if (r === 'hoguera') { for (let k = 0; k < n; k++) chips.push({ x:x + (Math.random() - .5) * 6, y:y - 3, vx:(Math.random() - .5) * 10, vy:-14 - Math.random() * 14, life:0, max:.7 + Math.random() * .5, col:k % 3 ? '#ff8a2a' : '#ffd860' }); for (let k = 0; k < 4; k++) smoke.push({ x:x + (Math.random() - .5) * 4, y:y - 6, vx:0, vy:-6 - Math.random() * 4, r:1.5, life:0, max:2.5 + Math.random() }); }
  else if (r === 'agua') for (let k = 0; k < n; k++) chips.push({ x, y:y - 2, vx:(Math.random() - .5) * 26, vy:-8 - Math.random() * 10, life:0, max:.6, col:k % 2 ? '#7ab8f0' : '#e0f0fc' });
  else if (r === 'volcan') { for (let k = 0; k < n + 6; k++) chips.push({ x:x + (Math.random() - .5) * 8, y:y - 4, vx:(Math.random() - .5) * 30, vy:-18 - Math.random() * 20, life:0, max:.9, col:k % 3 ? '#ff6a1a' : '#ffd040' }); smoke.push({ x, y:y - 6, vx:0, vy:-10, r:3, life:0, max:2.5 }); const vo = volcanoNear(g); if (vo) vo.heat = Math.max(0, vo.heat - (big ? .12 : .05)); } // la lava salta y el volcán se calma un poco
  else if (r === 'tierra') for (let k = 0; k < n; k++) chips.push({ x, y:y - 1, vx:(Math.random() - .5) * 20, vy:-6 - Math.random() * 8, life:0, max:.6, col:k % 2 ? '#6e4a2c' : '#8a6038' });
  else holyGlow(x, y, n);
}
const shapeTxt = s0 => s0 === 'filas' ? 'filas' : ['aspa', 'espiral', 'estrella', 'media luna'].includes(s0) ? `una ${s0}` : `un ${s0}`;
function startRitual(g, why){
  const sp = g.holy ? [g.holy.cx * T + 2, (g.holy.cy + 1) * T + 3] : altarSpot(g) || fireSpot({}, g), cx = sp[0], cy = sp[1] - (!g.holy && altarSpot(g) ? 6 : 0);
  const people = villagers.filter(u => !u.dead && u.vid === g.id && (yearT - u.born) / YEAR >= ADULT_H && !u.sleep && !u.away && !u.boat && !u.mount && !u.foe && !(u.task && ['apagar', 'sacrificio', 'asalto'].includes(u.task.k)) && u.food > .2 && u.water > .2);
  if (people.length < 3) return;
  const n = Math.min(14, people.length), until = yearT + 30;
  g.faith.shape ||= RITUAL_SHAPES[Math.floor(Math.random() * RITUAL_SHAPES.length)];
  const spots = ritualSpots(g.faith.shape, cx, cy, n - 1);
  const ppl = people.sort(() => Math.random() - .5).slice(0, n), lead = ppl.includes(g.leader) ? g.leader : ppl[0];
  let k = 0;
  for (const u of ppl) {
    releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } // dejan lo que estén haciendo
    const [x, y] = u === lead ? [cx, cy + (g.faith.shape === 'filas' ? 0 : 0)] : spots[k++];
    u.task = { k:'ritual', x, y, cx, cy, until }; u.lastD = Infinity; u.wait = 0;
  }
  g.ritual = { cx, cy, until }; g.lastRitual = yearT;
  notify(`En ${g.name} celebran un ritual a ${g.faith.god}${why ? ` ${why}` : ''}: se reúnen formando ${shapeTxt(g.faith.shape)}`, { x:cx, y:cy });
}
// Sitio para la plaza sagrada (13×9), apartada de la central, sin caminos, campos ni edificios
const HOLY_MOTIF = { 'el sol':'sol', 'el cielo':'sol', 'el desierto':'sol', 'la luna':'luna', 'el mar':'olas', 'la lluvia':'olas', 'las tormentas':'olas',
  'el fuego':'llamas', 'la tierra':'cuadros', 'las montañas':'cuadros', 'las estrellas':'estrellas', 'el viento':'estrellas', 'el trueno':'estrellas',
  'los bosques':'hojas', 'las cosechas':'hojas', 'la caza':'hojas', 'los animales':'hojas', 'los muertos':'anillos', 'el inframundo':'anillos', 'el frío':'anillos', 'la guerra':'aspa' };
function holyStyle(g){
  const dom = g.faith ? g.faith.dom : '', fl = DOMAIN_FLAG[dom];
  const [r0, g0, b0] = villageColor(g), ink = fl ? fl.col : `rgb(${r0},${g0},${b0})`;
  // Material: losas de piedra si tienen piedra; si no, tablones (en bosque) o tierra apisonada con un borde de cantos
  const mat = g.stone >= 10 || g.quarry != null ? 'piedra' : world.biome[g.fy * W + g.fx] === B.FOREST ? 'madera' : 'tierra';
  const base = { piedra:['#d8ccb0', '#b8aa8c'], madera:['#a87a4a', '#7a5230'], tierra:['#b89a6c', '#8a7048'] }[mat];
  return { mat, base:base[0], line:base[1], ink, gold:Math.random() < .5 ? '#d8b048' : '#f2efe6', motif:HOLY_MOTIF[dom] || 'cruz' };
}
function drawHolyTile(i, px, py){
  const g = villageById(holySet.get(i)), h = g && g.holy; if (!h) return;
  const st = h.style ||= holyStyle(g), tx = i % W, ty = (i / W) | 0, dx = tx - h.cx, dy = ty - h.cy, r = Math.hypot(dx, dy * 1.4);
  vctx.fillStyle = st.base; vctx.fillRect(px, py, T, T);
  vctx.fillStyle = st.line;
  if (st.mat === 'madera') { vctx.fillRect(px, py + 2, T, 1); vctx.fillRect(px + ((tx + ty) % 2 ? 1 : 3), py, 1, 2); }
  else if (st.mat === 'piedra') { vctx.fillRect(px, py + T - 1, T, 1); vctx.fillRect(px + T - 1, py, 1, T); }
  else if (h2(tx, ty, 520) < .5) vctx.fillRect(px + 1 + (i % 3), py + 2, 1, 1);
  if (tx === h.x0 || tx === h.x1 || ty === h.y0 || ty === h.y1) { vctx.fillStyle = st.gold === '#d8b048' ? '#8a7048' : '#9a948a'; vctx.fillRect(px, py, T, 1); vctx.fillRect(px, py + T - 1, T, 1); } // borde
  vctx.fillStyle = st.ink; const full = () => vctx.fillRect(px + 1, py + 1, 3, 3), dot = () => vctx.fillRect(px + 2, py + 2, 1, 1);
  switch (st.motif) {
    case 'sol': if (r < 1.6) { vctx.fillStyle = st.gold; full(); } else if ((dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && r < 6) { vctx.fillStyle = st.gold; dot(); vctx.fillRect(px + 1, py + 2, 3, 1); } break;
    case 'luna': if (r > 2.2 && r < 3.6 && Math.hypot(dx - 1.2, dy * 1.4) > 2.6) full(); break;
    case 'olas': if (((dy + 10) - Math.round(Math.sin(dx * .9) * .8)) % 2 === 0) { vctx.fillRect(px, py + 2, T, 1); vctx.fillRect(px + (tx % 2 ? 1 : 3), py + 1, 1, 1); } break;
    case 'llamas': if (Math.abs(dx) % 3 === 0 && dy > -3) { vctx.fillRect(px + 2, py + 1, 1, 3); vctx.fillRect(px + 1, py + 3, 3, 1); vctx.fillStyle = st.gold; vctx.fillRect(px + 2, py + 2, 1, 1); } break;
    case 'cuadros': if (Math.max(Math.abs(dx), Math.round(Math.abs(dy) * 1.4)) % 2 === 0) { vctx.fillRect(px, py, T, 1); vctx.fillRect(px, py, 1, T); } break;
    case 'estrellas': if (h2(tx, ty, 511) < .22 || r < 1) { vctx.fillStyle = r < 1 ? st.gold : st.ink; vctx.fillRect(px + 2, py + 1, 1, 3); vctx.fillRect(px + 1, py + 2, 3, 1); } break;
    case 'hojas': if ((tx * 2 + ty) % 4 === 0) { vctx.fillRect(px + 1, py + 2, 2, 1); vctx.fillRect(px + 2, py + 1, 2, 1); } break;
    case 'anillos': if (Math.round(r) % 2 === 0 && r < 6) dot(), vctx.fillRect(px + 1, py + 2, 3, 1); break;
    case 'aspa': if (Math.abs(Math.abs(dx) - Math.abs(dy) * 1.4) < .8) full(); break;
    default: if ((tx + ty) % 3 === 0) { vctx.fillRect(px + 2, py + 1, 1, 3); vctx.fillRect(px + 1, py + 2, 3, 1); }
  }
}
function holySite(g){
  for (let k = 0; k < 400; k++) { // primero cerca; si no hay sitio, algo más lejos
    const a = Math.random() * Math.PI * 2, d = 9 + Math.random() * (k < 200 ? 14 : 26), x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .8);
    if (x < 8 || y < 12 || x >= W - 8 || y >= H - 6) continue;
    let ok = !villages.some(o => penOverlap(o, x - 6, y - 4, x + 6, y + 4)) && !plotIn(x - 6, y - 4, x + 6, y + 4);
    for (let yy = y - 4; ok && yy <= y + 4; yy++) for (let xx = x - 6; ok && xx <= x + 6; xx++) {
      const i = yy * W + xx, o = world.objs[i];
      if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || plazaSet.has(i) || farmMap.has(i) || bridgeSet.has(i) || wallSet.has(i) || underBuilding(g, xx, yy) || (o && !['tree', 'berry'].includes(OBJ[o.key][1]))) ok = false;
    }
    if (ok && !buildingClash(x, y + 4, 'pozo')) return [x, y];
  }
  return null;
}
function holyGlow(x, y, n = 8){ for (let k = 0; k < n; k++) chips.push({ x:x + (Math.random() - .5) * 6, y:y - 4, vx:(Math.random() - .5) * 10, vy:-10 - Math.random() * 12, life:0, max:.8 + Math.random() * .5, col:k % 2 ? '#ffe9a0' : '#f0c040' }); }
// ---- Relaciones entre pueblos: se encuentran, se llevan bien o mal (religión, raza, territorio, recursos, ofensas),
// comercian con caravanas por tierra o por mar, se mandan diplomáticos y pueden acabar en guerra ----
let rels = new Map(), travelers = [], diploT = 5;
const relKey = (a, b) => a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id;
const relOf = (a, b) => { const k = relKey(a, b); let r = rels.get(k); if (!r) rels.set(k, r = { v:0, known:false, reason:'' }); return r; };
const REASON_TXT = { 'guerra civil':'la guerra civil', alianza:'defender a sus aliados', 'religión':'la religión', raza:'ser de otro pueblo', territorio:'el territorio', recursos:'los recursos', rencor:'viejas ofensas' };
const relWord = r => r.war ? 'en guerra' : r.v >= 40 ? 'aliados' : r.v >= 15 ? 'amigos' : r.v > -15 ? 'neutrales' : r.v > -45 ? 'tensos' : 'enemigos';
const skinAvg = g => { const ps = villagers.filter(v => !v.dead && v.vid === g.id); return ps.reduce((a, v) => a + Math.max(0, SKIN.indexOf(v.skin)), 0) / Math.max(1, ps.length); };
function diploTick(){
  fairTick(); // la feria ambulante (fama.js)
  const live = villages.filter(g => popOf(g) > 0 && world.objs[g.fy * W + g.fx]);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j], r = relOf(a, b), dist = Math.hypot(a.fx - b.fx, a.fy - b.fy);
    if (sameNation(a, b)) { r.known = true; r.v = 80; r.war = null; continue; }
    if (r.route) routeTick(a, b, r); // la ruta comercial: negocio, o se corta (rutas.js)
    // Anexión pacífica: aliados, con la misma fe, y uno mucho más pequeño que el otro
    if (r.known && !r.war && r.v >= 60 && a.faith && b.faith && a.faith.god === b.faith.god && Math.random() < .08) {
      const big = popOf(a) >= popOf(b) ? a : b, small = big === a ? b : a;
      if (popOf(small) < popOf(big) * .5 && nationOf(small) === small && !villages.some(o => o !== small && o.nation === small.id)) {
        small.nation = nationOf(big).id; small.unrest = 0;
        notify(`${small.name} se une por las buenas a la nación de ${nationOf(big).name}`, { x:small.fx * T, y:small.fy * T }); continue;
      }
    }
    if (!r.known) {
      if (dist < 200 && yearT > DAY_LEN * .5) {
        r.known = true; r.v = a.faith && b.faith && allGods(a.faith).some(d => allGods(b.faith).some(e => e.god === d.god)) ? 15 : 0;
        notify(`Los de ${a.name} y los de ${b.name} se han encontrado`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T });
      }
      continue;
    }
    // Lo que acerca y lo que separa (cada 10 s, poco a poco)
    const f = {};
    if (a.faith && b.faith) f['religión'] = allGods(a.faith).some(d => allGods(b.faith).some(e => e.god === d.god)) ? 1.5 : regimeOf(a) === 'teocracia' || regimeOf(b) === 'teocracia' || hasLaw(a, 'fe') || hasLaw(b, 'fe') ? -2.5 : -1; // con fe oficial, la otra fe enfada mucho más
    const sd = Math.abs(skinAvg(a) - skinAvg(b)); if (sd > 1.5) f.raza = -.8 * (sd - 1.5) * (hasLaw(a, 'segregacion') || hasLaw(b, 'segregacion') ? 2 : 1) * (hasLaw(a, 'derechos_humanos') && hasLaw(b, 'derechos_humanos') ? .3 : hasLaw(a, 'derechos_humanos') || hasLaw(b, 'derechos_humanos') ? .6 : 1);
    if (dist < 55) f.territorio = -(55 - dist) / 22;
    const fa = a.food / Math.max(1, popOf(a)), fb = b.food / Math.max(1, popOf(b));
    if ((fa < 1 && fb > 2.5) || (fb < 1 && fa > 2.5)) f.recursos = -1.2;
    const gr = ((a.grudge || {})[b.id] || 0) + ((b.grudge || {})[a.id] || 0); if (gr) f.rencor = -gr;
    // Lo que acerca: comerciar, el trato de los años y que el otro gobierne parecido
    if (yearT - (r.tradeT ?? -1e9) < DAY_LEN * 1.5) f.comercio = .7;
    f.trato = .35;
    if (regimeOf(a) === regimeOf(b)) f.gobierno = .3;
    let sum = 0, worst = null; for (const [k, d] of Object.entries(f)) { sum += d; if (d < 0 && (!worst || d < f[worst])) worst = k; }
    const before = relWord(r);
    r.v = clamp(r.v * .97 + sum * .8, -100, 100); if (worst) r.reason = worst;
    const now = relWord(r);
    if (now !== before && !r.war) notify(`${a.name} y ${b.name} ahora son ${now}${now === 'tensos' || now === 'enemigos' ? ` (por ${REASON_TXT[r.reason] || 'desconfianza'})` : ''}`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T });
    allyCheck(a, b, r); treatyTick(a, b, r);
    // Guerra: con mucha enemistad (y gente para luchar)
    const warAt = (hasLaw(a, 'ejercito') || hasLaw(b, 'ejercito') ? -45 : -58) - (hasLaw(a, 'paz') && hasLaw(b, 'paz') ? 25 : hasLaw(a, 'paz') || hasLaw(b, 'paz') ? 10 : 0);
    const warsOf = g => { let n = 0; for (const o of rels.values()) if (o.war && (o.war.att === g.id || o.war.def === g.id)) n++; return n; };
    if (!r.war && r.v < warAt && !(hasTreaty(r, 'fronteras') && (r.reason || 'territorio') === 'territorio' && r.v > -85) && (!(hasTreaty(r, 'noagresion') || hasTreaty(r, 'paz')) || r.v < -85) && warsOf(a) + warsOf(b) === 0 && popOf(a) >= 10 && popOf(b) >= 10 && yearT > DAY_LEN * 5 && yearT - (r.peaceT ?? -1e9) > DAY_LEN * 8) { // tras una paz, una tregua larga
      const armed = g => villagers.filter(v => !v.dead && v.vid === g.id && v.weapon).length;
      const att = armed(a) + popOf(a) * .3 >= armed(b) + popOf(b) * .3 ? a : b, def = att === a ? b : a;
      r.war = { att:att.id, def:def.id, reason:r.reason || 'territorio', start:yearT, raidT:yearT - 40, dead:0 }; breakTreaties(att, def, r); mutualDefense(att, def); warCamp(att, def, r); // (tratados.js, guerra.js)
      att.danger = def.danger = 120;
      const sol = g0 => villagers.filter(v => !v.dead && v.vid === g0.id && v.weapon).length;
      notify(`¡${att.name} declara la guerra a ${def.name}! Motivo: ${REASON_TXT[r.war.reason] || 'el territorio'}. ${att.name} tiene ${sol(att)} soldados y ${popOf(att)} habitantes; ${def.name}, ${sol(def)} soldados y ${popOf(def)} habitantes`, { x:def.fx * T, y:def.fy * T });
      sendNews(att, `${att.name} ha declarado la guerra a ${def.name}`);
      if (r.war.reason === 'religión') notify(`¡Es una guerra santa! ${att.name} quiere imponer ${godTxt(att.faith)} a ${def.name}`, { x:def.fx * T, y:def.fy * T });
      callAllies(nationOf(att), nationOf(def));
      misfortune(def, 'guerra');
    }
    if (r.war) {
      const att = villageById(r.war.att), def = villageById(r.war.def);
      if (!att || !def || !popOf(att) || !popOf(def)) { r.war = null; continue; }
      fieldBattleTick(att, def, r); // batallas en campo abierto (guerra.js)
      if (r.war.dead >= warCap(att, def) || (yearT - r.war.start > DAY_LEN * 6 && Math.random() < .02)) makePeace(a, b, r, r.war.dead >= warCap(att, def) ? 'agotados por tantas muertes' : 'cansados de luchar'); // (guerras más largas: guerra.js)
      else if (yearT - r.war.raidT > 80) { const back = Math.random() < .25, A = back ? def : att; if (!(knowsT(A, 'noche') && !isNight() && yearT - r.war.raidT < 170)) { r.war.raidT = yearT; const D = back ? att : def, far = Math.hypot(A.fx - D.fx, A.fy - D.fy); if (!(A.port && (far > 60 || Math.random() < .45) && launchNavalRaid(A, D, r))) launchRaid(A, D, r); } } // a veces contraataca el atacado
      continue;
    }
    // Caravanas de comercio y diplomáticos
    if (hasLaw(a, 'fronteras_abiertas') && hasLaw(b, 'fronteras_abiertas')) r.v = Math.min(100, r.v + .3);
    const closed = (hasLaw(a, 'fronteras_cerradas') || hasLaw(b, 'fronteras_cerradas')) && !(a.port && b.port && (hasLonja(a) || hasLonja(b)));
    if (!closed && !sanctionedPair(a, b) && r.v > -15 && (a.market != null || b.market != null) && yearT - (r.tradeT ?? -1e9) > DAY_LEN * (hasLaw(a, 'comercio') || hasLaw(b, 'comercio') ? .3 : .6) * (hasLonja(a) || hasLonja(b) ? .5 : 1) * (hasTreaty(r, 'comercio') ? .5 : 1) * (hasLaw(a, 'fronteras_abiertas') || hasLaw(b, 'fronteras_abiertas') ? .7 : 1)) { r.tradeT = yearT; const from = a.market != null && Math.random() < .5 ? a : b.market != null ? b : a; sendTraveler('caravana', from, from === a ? b : a); }
    if (r.v < 30 && yearT - (r.dipT ?? -1e9) > DAY_LEN * (hasLaw(a, 'paz') || hasLaw(b, 'paz') ? .6 : 1.2) && Math.random() < .5) { r.dipT = yearT; const from = (a.hall != null) !== (b.hall != null) ? (a.hall != null ? a : b) : Math.random() < .5 ? a : b; sendTraveler('diplomatico', from, from === a ? b : a); }
  }
}
// Un pueblo que se queda por su cuenta: su propia bandera, su gobierno y alguien al mando (y se rehacen las fronteras)
// Al comerciar con quien ya usa moneda, se aprende a usarla (cada uno acuña la suya)
function spreadCoin(a, b){
  for (const [x, y] of [[a, b], [b, a]]) if (x.coin && !y.coin && Math.random() < .5) { newCoin(y); notify(`Comerciando con ${x.name}, los de ${y.name} aprenden a usar moneda y acuñan la suya: el ${y.coin}`, { x:y.fx * T, y:y.fy * T }); }
}
function becomeIndependent(g){
  g.nation = g.id; g.unrest = 0;
  if (!g.flag) { g.flag = makeFlag(g); g.flagUrl = flagDataUrl(g.flag); }
  if (!g.regime) { g.regime = 'tribu'; g.regimeT = yearT; }
  if (!g.leader || g.leader.dead || g.leader.vid !== g.id) { const c = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H).sort((a, b) => a.born - b.born)[0]; if (c) g.leader = c; }
  if (typeof buildZones === 'function') buildZones();
}
function conquer(cap, eg, r){
  cap.conquests = (cap.conquests || 0) + 1;
  const old = nationOf(eg);
  r.war = null; r.v = -30; eg.nation = cap.id; eg.unrest = 50; addFiesta(cap, `Día de la Victoria sobre ${eg.name}`);
  // Si el conquistado era la capital de una nación, el resto de sus pueblos queda suelto (cada uno, independiente)
  for (const o of villages) if (o !== eg && o.nation === eg.id) { becomeIndependent(o); notify(`Con la caída de ${eg.name}, ${o.name} queda independiente`, { x:o.fx * T, y:o.fy * T }); }
  if (cap.faith && eg.faith && cap.faith.god !== eg.faith.god && Math.random() < .5) { eg.faith = { ...cap.faith, pantheon:[...(cap.faith.pantheon || [])] }; eg.unrest += 20; }
  notify(`¡${cap.name} conquista ${eg.name}!${old !== eg ? '' : ''}`, { x:eg.fx * T, y:eg.fy * T });
  for (const v of villagers) if (v.task && v.task.k === 'asalto' && (v.vid === cap.id || villageById(v.vid) && nationOf(villageById(v.vid)) === cap)) v.task = { k:'volver' };
}
function makePeace(a, b, r, why){
  if (r.war && r.war.civil) civilEnd(a, b, r); // fin de una guerra civil (guerra.js)
  sendNews(a, `${a.name} y ${b.name} han firmado la paz`);
  r.lastWar = r.war; r.war = null; r.v = -12; r.peaceT = yearT; addFiesta(a, `Día de la Paz con ${b.name}`); addFiesta(b, `Día de la Paz con ${a.name}`);
  notify(`${a.name} y ${b.name} firman la paz${why ? `, ${why}` : ''}`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T });
  peaceTreaty(a, b, r);
  for (const v of villagers) if (v.task && v.task.k === 'asalto' && (v.vid === a.id || v.vid === b.id)) v.task = { k:'volver' };
}
// Intercambio de lo que a uno le sobra por lo que al otro le falta (lo usan las caravanas)
function doTrade(g, o){
  const c1 = capOf(g), c2 = capOf(o), got = [], lot = hasLonja(g) || hasLonja(o) ? 20 : 12;
  for (const r0 of ['food', 'wood', 'stone']) {
    if (g[r0] > c1 * .45 && o[r0] < c2 * .3) { const n = Math.min(lot, Math.floor(g[r0] - c1 * .35)); if (n > 0) { g[r0] -= n; o[r0] += n; got.push(`${n} de ${{ food:'comida', wood:'madera', stone:'piedra' }[r0]} para ${o.name}`); } }
    else if (o[r0] > c2 * .45 && g[r0] < c1 * .3) { const n = Math.min(lot, Math.floor(o[r0] - c2 * .35)); if (n > 0) { o[r0] -= n; g[r0] += n; got.push(`${n} de ${{ food:'comida', wood:'madera', stone:'piedra' }[r0]} para ${g.name}`); } }
  }
  if (g.faith && o.faith && Math.random() < .15 && !allGods(g.faith).some(d => d.god === o.faith.god) && (g.faith.pantheon || []).length < 5) {
    (g.faith.pantheon ||= []).push({ god:o.faith.god, fem:o.faith.fem, dom:o.faith.dom }); notify(`Comerciando con ${o.name}, los de ${g.name} empiezan a venerar también a ${godTxt(o.faith)}`, { x:g.fx * T, y:g.fy * T });
  }
  return got;
}
// Viajeros: un aldeano sale de su pueblo (con su carro, o en barca si los dos tienen muelle) y vuelve luego
function lineWater(ax, ay, bx, by){ let w = 0, n = 0; for (let k = 0; k <= 30; k++) { const x = ax + (bx - ax) * k / 30, y = ay + (by - ay) * k / 30, i = Math.floor(y / T) * W + Math.floor(x / T); n++; if (WATER[world.biome[i]] && !dried(i)) w++; } return w / n; }
// Dónde desembarcar: una orilla libre cerca del pueblo enemigo, con agua al lado (y el punto de agua desde el que se baja)
function landingOf(def){
  let best = null, bd = Infinity;
  for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
    const x = def.fx + dx, y = def.fy + dy; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || !tileFree(x, y)) continue;
    const i = y * W + x, wn = nb4i(i).find(n => openWater(n)); if (wn == null) continue;
    const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = { land:[x * T + 2, y * T + 3], water:[(wn % W) * T + 2, ((wn / W) | 0) * T + 3] }; }
  }
  return best;
}
// Ruta por el agua de una casilla a otra (búsqueda en anchura), en puntos cada pocas casillas; null si no hay paso
function waterRoute(a, b){
  if (a === b) return [];
  const prev = new Int32Array(N).fill(-1), q = [a]; prev[a] = a;
  for (let h = 0; h < q.length && q.length < 90000; h++) {
    const i = q[h]; if (i === b) break;
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (prev[n] !== -1 || !(openWater(n) || n === b)) continue;
      prev[n] = i; q.push(n);
    }
  }
  if (prev[b] === -1) return null;
  const path = []; for (let i = b; i !== a; i = prev[i]) path.push(i); path.reverse();
  return path.filter((_, k) => k % 4 === 3 || k === path.length - 1).map(i => [(i % W) * T + 2, ((i / W) | 0) * T + 3]);
}
const pxTile = p => Math.floor(p[1] / T) * W + Math.floor(p[0] / T);
// Un ataque por mar: la flota sale del muelle; al llegar, o saquea la costa o desembarca a los soldados
function launchNavalRaid(att, def, r){
  if (!att.port || !openWater(att.port.launch)) return false;
  const L = landingOf(def); if (!L) return false;
  const home = [(att.port.launch % W) * T + 2, ((att.port.launch / W) | 0) * T + 3];
  const route = waterRoute(att.port.launch, pxTile(L.water)); if (!route || !route.length || route.length > 120) return false; // sin paso por agua (o demasiado lejos)
  const ps = villagers.filter(v => !v.dead && !v.away && v.vid === att.id && (yearT - v.born) / YEAR >= ADULT_H && v !== att.leader && (v.hp ?? 1) > .5 && !v.boat).sort((a, b) => (b.weapon ? 1 : 0) - (a.weapon ? 1 : 0)).slice(0, Math.min(6, Math.max(2, Math.floor(popOf(att) / 3))));
  if (ps.length < 2) return false;
  const mode = Math.random() < .5 ? 'saqueo' : 'desembarco';
  for (const v of ps) { v.sleep = false; releaseTask(v); if (v.actT > 0) { v.actT = 0; v.onDone = null; } dismount(v); v.task = { k:'viaje' }; v.away = true; }
  const path = route.slice(); const first = path.shift();
  travelers.push({ kind:'flota', mode, v:ps[0], crew:ps, from:att.id, to:def.id, x:home[0], y:home[1], tx:first[0], ty:first[1], path, back:[...route].reverse().slice(1).concat([home]), hx:home[0], hy:home[1], land:L.land, sea:true, phase:'ida', dir:1 });
  notify(`¡Los barcos de ${att.name} zarpan contra ${def.name}${mode === 'saqueo' ? ' para saquear su costa' : ' con soldados para desembarcar'}!`, { x:home[0], y:home[1] });
  return true;
}
function arriveFleet(t, from, to){
  const r = rels.get(relKey(from, to)), crew = t.crew.filter(u => !u.dead);
  if (!r || !r.war || !crew.length) return;
  if (t.mode === 'desembarco') { // bajan a tierra y asaltan; luego vuelven en barca
    const grp = { ps:crew, go:true, until:yearT, loot:false, repelled:false };
    crew.forEach((u, k) => { u.away = false; u.x = t.land[0] + (k % 3 - 1) * 3; u.y = t.land[1] + Math.floor(k / 3) * 3; u.task = { k:'asalto', enemy:to.id, x:to.fx * T + 2, y:to.fy * T + 10, grp }; u.lastD = Infinity; u.navalHome = from.id; u.landing = t.land; });
    if (to) to.alarm = { until:yearT + 70, posts:defensePosts(to, from) };
    notify(`¡${crew.length} soldados de ${from.name} desembarcan en la costa de ${to.name}!`, { x:t.land[0], y:t.land[1] });
    t.crewOff = true; return;
  }
  // Saqueo costero: si la orilla está defendida por arqueros, les cuesta caro
  const archers = villagers.filter(u => !u.dead && u.vid === to.id && isRanged(u.weapon) && Math.hypot(u.x - t.x, u.y - t.y) < 120).length;
  if (archers >= crew.length) {
    const lost = crew.slice(0, Math.max(1, Math.floor(crew.length / 3))); for (const u of lost) { u.away = false; killVillager(u, 'guerra'); }
    r.war.dead += lost.length; for (const _ of lost) warLoss(r, from); notify(`Los arqueros de ${to.name} rechazan desde la orilla a los barcos de ${from.name}: ${lost.length} muertos`, { x:t.x, y:t.y });
    milOf(to).won++; milOf(to).xp += 2; milLearn(to); return;
  }
  const take = Math.min(to.food, 4 + crew.length * 2); to.food -= take; from.food += take;
  const wood = buildingsOf(to).filter(b => world.objs[b] && wooden(world.objs[b]) && !world.objs[b].burnt && Math.hypot((b % W) * T - t.land[0], ((b / W) | 0) * T - t.land[1]) < 90);
  if (wood.length && Math.random() < .6) { const b = wood[Math.floor(Math.random() * wood.length)]; fires.set(b, { t:0, life:10, tree:true, bld:true }); }
  r.war.loots = (r.war.loots || 0) + 1; milOf(from).xp += 1; milLearn(from); misfortune(to, 'guerra');
  notify(`Los barcos de ${from.name} saquean la costa de ${to.name}: se llevan ${Math.round(take)} de comida${wood.length ? ' y prenden fuego a lo que pillan' : ''}`, { x:t.land[0], y:t.land[1] });
}
function sendTraveler(kind, from, to){
  const v = villagers.filter(u => !u.dead && !u.away && u.vid === from.id && (yearT - u.born) / YEAR >= ADULT_H && u !== from.leader && !u.sleep && !u.boat && !u.mount && !(u.actT > 0)).sort((a, b) => travelerScore(b, kind, to) - travelerScore(a, kind, to))[0]; // mejor un mercader; de diplomático, quien hable su lengua o la común
  if (!v) return;
  const home = from.port && to.port ? [(from.port.launch % W) * T + 2, ((from.port.launch / W) | 0) * T + 3] : fireSpot(v, from);
  const dest = from.port && to.port ? [(to.port.launch % W) * T + 2, ((to.port.launch / W) | 0) * T + 3] : to.market != null ? [(to.market % W) * T + 2, ((to.market / W) | 0) * T + 3 + T] : [to.fx * T + 2, to.fy * T + 9];
  const sea = !!(from.port && to.port && lineWater(home[0], home[1], dest[0], dest[1]) > .6);
  releaseTask(v); v.task = { k:'viaje' }; v.away = true; dismount(v);
  travelers.push({ kind, v, from:from.id, to:to.id, x:sea ? home[0] : v.x, y:sea ? home[1] : v.y, tx:dest[0], ty:dest[1], hx:home[0], hy:home[1], sea, phase:'ida', dir:1 });
  if (kind === 'caravana') loadCargo(travelers[travelers.length - 1], from, to); // la mercancía que más gana (comercio.js)
}
function updateTravelers(dt){
  for (const t of travelers) {
    const from = villageById(t.from), to = villageById(t.to); let v = t.v;
    if (t.crew) { t.v = t.crew.find(u => !u.dead) || t.v; if (!t.crew.some(u => !u.dead)) { t.done = true; continue; } } // la flota sigue mientras quede alguien
    if (t.v.dead || !from) { t.done = true; if (!t.v.dead) { t.v.away = false; t.v.task = null; } continue; }
    v = t.v; let d = Math.hypot(t.tx - t.x, t.ty - t.y); const sp = (t.sea && inWater(t.x, t.y) ? 14 : 10) * (t.fast ? 1.8 : 1) * dt; // sobre el hielo bajan de la barca y van andando
    if (d <= 2 && t.path && t.path.length) { const nx = t.path.shift(); t.tx = nx[0]; t.ty = nx[1]; d = Math.hypot(t.tx - t.x, t.ty - t.y); } // siguiente punto de la ruta
    if (d > 2) { t.x += (t.tx - t.x) / d * Math.min(d, sp); t.y += (t.ty - t.y) / d * Math.min(d, sp); if (Math.abs(t.tx - t.x) > .3) t.dir = t.tx < t.x ? -1 : 1; t.walk = (t.walk || 0) + dt; v.x = t.x; v.y = t.y; if (t.crew) for (const u of t.crew) if (!u.dead) { u.x = t.x; u.y = t.y; } if (t.animals) t.animals.forEach((a, k) => { if (!a.dead) { a.x = t.x - t.dir * (8 + k * 5); a.y = t.y + 2; a.dir = t.dir; a.moving = true; } }); continue; }
    if (t.kind === 'expedicion' && t.phase === 'ida') { t.phase = 'vuelta'; t.path = t.back.slice(); const nx = t.path.shift(); t.tx = nx[0]; t.ty = nx[1]; continue; }
    if (t.kind === 'expedicion') { t.done = true; v.away = false; v.task = null; v.x = t.x; v.y = t.y; endExpedition(t, from); continue; }
    if (t.kind === 'regreso') { t.done = true; v.away = false; v.task = null; v.x = t.x; v.y = t.y; continue; }
    if (t.kind === 'emigrante') { if (to) welcomeMigrant(v, from, to); t.done = true; v.away = false; v.task = null; v.home = null; if (to && popOf(to) !== undefined) { v.vid = to.id; v.x = t.x; v.y = t.y; floats.push({ x:v.x, y:v.y - 12, txt:'¡nuevo hogar!', col:'#c8e0a0', life:0 }); } continue; } // de vuelta al muelle, a pie hasta casa
    if (t.kind === 'flota' && t.phase === 'ida') { if (to) arriveFleet(t, from, to); if (t.crewOff) { t.done = true; continue; } t.phase = 'vuelta'; t.path = t.back.slice(); const nx = t.path.shift(); t.tx = nx[0]; t.ty = nx[1]; continue; }
    if (t.kind === 'flota') { t.done = true; for (const u of t.crew) if (!u.dead) { u.away = false; u.task = null; u.x = t.x; u.y = t.y; } continue; }
    if (t.kind === 'colonos') { foundColony(t, from); t.done = true; continue; } // colonias.js
    if (t.kind === 'mensajero' && t.phase === 'ida') { newsArrive(t, from, to); t.phase = 'vuelta'; t.tx = t.hx; t.ty = t.hy; continue; } // noticias.js
    if (t.kind === 'batida' && t.phase === 'ida') { huntArrive(t, from); t.phase = 'vuelta'; t.tx = t.hx; t.ty = t.hy; continue; }
    if (t.kind === 'batida') huntHome(t, from);
    if (t.kind === 'rescate' && t.phase === 'ida') { if (to) rescueArrive(t, from, to); if (t.failed) { t.done = true; continue; } t.phase = 'vuelta'; t.tx = t.hx; t.ty = t.hy; continue; } // espionaje.js
    if (t.kind === 'espia' && t.phase === 'ida') { if (to && spyArrive(t, from, to)) { t.done = true; continue; } t.phase = 'vuelta'; t.tx = t.hx; t.ty = t.hy; continue; } // espionaje.js
    if (t.phase === 'ida') {
      const r = to && relOf(from, to);
      if (to && r) {
        const und = langUnderstand(v, to); // si no se entienden, la visita sirve de poco
        if (t.kind === 'caravana') {
          const got = doTrade(from, to), sold = sellCargo(t, from, to); r.v = clamp(r.v + 4 * und, -100, 100); tradeTrip(from, to, r); shareCharts(from, to); spreadCoin(from, to);
          const sickHome = villagers.find(u => !u.dead && u.vid === from.id && u.sick); if (sickHome && !hasLaw(to, 'cuarentena') && Math.random() < .3) { const tgt = villagers.find(u => !u.dead && u.vid === to.id && !u.sick); if (tgt) infect(tgt, sickHome.sick, to); } // la caravana trae la enfermedad
          notify(`Una caravana de ${from.name} llega a ${to.name} ${t.sea ? 'por mar' : 'por tierra'}${sold}${got.length ? `: ${got.join(', ')}` : ''}`, { x:t.x, y:t.y });
        } else if (r.war) {
          if (yearT - r.war.start > DAY_LEN * 2 && Math.random() < (.2 + Math.min(.4, (yearT - r.war.start) / (DAY_LEN * 8))) * und) makePeace(from, to, r, `gracias a un diplomático de ${from.name}`);
          else notify(`${to.name} rechaza al diplomático de ${from.name}${und < .5 ? ` (ni le entienden: no habla su lengua ni ${langName(LANG_COMMON)})` : ''}: sigue la guerra`, { x:t.x, y:t.y });
        } else { r.v = clamp(r.v + 7 * und, -100, 100); if (r.v > 20) shareCharts(from, to); notify(und < .5 ? `Un diplomático de ${from.name} visita ${to.name}, pero apenas se entienden: ni habla ${langName(villageLang(to))} ni allí saben ${langName(LANG_COMMON)}` : `Un diplomático de ${from.name} visita ${to.name}${und < 1 ? ` (hablan en ${langName(LANG_COMMON)})` : ''}: mejoran sus relaciones`, { x:t.x, y:t.y }); }
      }
      t.phase = 'vuelta'; t.tx = t.hx; t.ty = t.hy; continue;
    }
    if (t.crew) for (const u of t.crew) if (!u.dead && u !== v) { u.away = false; u.task = null; u.x = t.x; u.y = t.y; } // el comando (y el rescatado)
    t.done = true; v.away = false; v.task = null; v.wait = .5; const [fx, fy] = fireSpot(v, from); if (!t.sea) { v.x = fx; v.y = fy; } else landAt(v, t.x, t.y); // del barco, a tierra firme
  }
  if (travelers.some(t => t.done)) travelers = travelers.filter(t => !t.done);
}
function drawTravelers(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const t of travelers) {
    if (t.x < x0 - 20 || t.x > x1 + 20 || t.y < y0 - 20 || t.y > y1 + 20) continue;
    const g = villageById(t.from), s = personSprite(t.v, Math.floor((t.walk || 0) * 8) % 2, t.dir < 0), x = Math.round(t.x), y = Math.round(t.y);
    const wet = inWater(t.x, t.y); // en un cauce seco, sobre el hielo o en tierra no se dibuja la barca: van andando
    if (t.crew && wet) { const crew = t.crew.filter(u => !u.dead); crew.forEach((u, k) => { if (k % 2) return; const ox = -t.dir * Math.floor(k / 2) * 14, oy = (Math.floor(k / 2) % 2 ? 6 : -4); drawBoat(x + ox, y + oy, t.dir, now, true, personSprite(u, 0, t.dir < 0)); }); redrawFront(x - 15 - crew.length * 7, x + 15 + crew.length * 7, y - 20, y + 6); if (crew.length) { vctx.fillStyle = '#c8302a'; vctx.fillRect(x + t.dir * 2, y - 22, 3, 2); vctx.fillStyle = '#5a3a20'; vctx.fillRect(x + t.dir, y - 22, 1, 8); } continue; }
    if (wet) { drawBoat(x, y, t.dir, now, true, s); redrawFront(x - 15, x + 15, y - s.height - 6, y); continue; } // lo que hay delante (en la orilla) tapa la barca
    if (t.kind === 'caravana') { drawCart(x - t.dir * 8, y, t.dir, now, '#c8a050'); if (t.cargo) { vctx.fillStyle = '#2a1a10'; vctx.fillRect(x - t.dir * 8 - 3, y - 9, 6, 4); vctx.fillStyle = GOODS[t.cargo.k].col; vctx.fillRect(x - t.dir * 8 - 2, y - 8, 4, 2); } } // con su carga, del color de la mercancía
    vctx.drawImage(s, x - (s.width >> 1), y - s.height + 1);
    redrawFront(x - 14, x + 14, y - s.height - 14, y);
    if (t.kind === 'mensajero') { vctx.fillStyle = '#f4f0e4'; vctx.fillRect(x + t.dir * 3, y - 8, 3, 2); vctx.fillStyle = '#c8302a'; vctx.fillRect(x + t.dir * 3 + 1, y - 8, 1, 1); } // con su carta lacrada
    if (t.kind === 'diplomatico') { // con la bandera de su pueblo en un palo
      vctx.fillStyle = '#4a2e18'; vctx.fillRect(x + t.dir * 3, y - 14, 1, 12);
      if (g && g.flag) drawFlag(g.flag, x + t.dir * 3 + (t.dir < 0 ? -6 : 1), y - 14, 6, 4, 1); else { const [r0, g0, b0] = g ? villageColor(g) : [200, 200, 200]; vctx.fillStyle = `rgb(${r0},${g0},${b0})`; vctx.fillRect(x + t.dir * 3 + (t.dir < 0 ? -4 : 1), y - 14, 4, 3); }
    }
  }
}
// ---- Guerra: asaltos de un pueblo a otro; los armados luchan, el resto huye; si llegan sin oposición, saquean ----
// Campamentos de las tropas en marcha (solo de noche): hoguera, tiendas de pieles o esteras
// Las tiendas y la hoguera no se pintan aquí: van a una cola ordenada por altura y drawVillagers las intercala con la gente
let warCamps = [], campQueue = [];
function drawCamps(t){
  campQueue = [];
  if (!warCamps.length) return;
  warCamps = warCamps.filter(c => !c.done);
  const [x0, y0, x1, y1] = visibleRect();
  for (const c of warCamps) {
    if (c.x < x0 - 30 || c.x > x1 + 30 || c.y < y0 - 30 || c.y > y1 + 30) continue;
    const g = villageById(c.vid), [cr, cg, cb] = g ? villageColor(g) : [200, 200, 200];
    for (let k = 0; k < c.tents; k++) { // tiendas alrededor de la hoguera
      const a = c.seed + k / c.tents * Math.PI * 2, tx = Math.round(c.x + Math.cos(a) * 15), ty = Math.round(c.y + Math.sin(a) * 9 - 2);
      campQueue.push({ y:ty, f:() => {
      const art = artFrame(c.hide ? 'camp:tienda' : 'camp:estera');
      if (art) vctx.drawImage(art, tx - (art.width >> 1), ty - art.height + 1);
      else if (c.hide) {
        vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(tx - 5, ty + 1, 11, 2);
        vctx.fillStyle = 'rgba(0,0,0,.28)'; vctx.fillRect(tx - 7, ty + 1, 15, 2);
        for (let h = 0; h < 10; h++) { const w = Math.round(h * .75); vctx.fillStyle = '#2a1a10'; vctx.fillRect(tx - w - 1, ty - 9 + h, 1, 1); vctx.fillRect(tx + w + 1, ty - 9 + h, 1, 1); vctx.fillStyle = h % 3 === 2 ? '#94683e' : '#b08656'; vctx.fillRect(tx - w, ty - 9 + h, w * 2 + 1, 1); vctx.fillStyle = '#7a5434'; vctx.fillRect(tx + Math.max(0, w - 1), ty - 9 + h, 1, 1); }
        vctx.fillStyle = '#2a1a10'; vctx.fillRect(tx - 7, ty, 15, 1); vctx.fillRect(tx - 1, ty - 4, 3, 5); vctx.fillRect(tx, ty - 12, 1, 3); // entrada, base y palo
        vctx.fillStyle = `rgb(${cr},${cg},${cb})`; vctx.fillRect(tx + 1, ty - 12, 4, 2); // banderín del pueblo
      } else { vctx.fillStyle = '#8a7a5a'; vctx.fillRect(tx - 3, ty - 1, 7, 2); vctx.fillStyle = '#6a5a40'; vctx.fillRect(tx - 3, ty, 7, 1); } // esteras
      } });
    }
    // Hoguera con resplandor
    const fl = Math.sin(t / 90 + c.seed) * .5 + .5;
    vctx.fillStyle = `rgba(255,160,60,${.14 + fl * .08})`; vctx.beginPath(); vctx.ellipse(c.x, c.y, 16, 10, 0, 0, Math.PI * 2); vctx.fill(); // el resplandor en el suelo, debajo de todo
    campQueue.push({ y:c.y, f:() => {
    const cf = artFrame('fire:camp'); if (cf) vctx.drawImage(cf, c.x - (cf.width >> 1), c.y - cf.height + 3); else { vctx.fillStyle = '#3a2414'; vctx.fillRect(c.x - 3, c.y, 7, 2); } // piedras y troncos (dibujados); las llamas, encima
    vctx.fillStyle = '#f08030'; vctx.fillRect(c.x - 1, c.y - 3 - Math.round(fl), 3, 3 + Math.round(fl)); vctx.fillStyle = '#ffd860'; vctx.fillRect(c.x, c.y - 2, 1, 2);
    if (Math.random() < .05) smoke.push({ x:c.x, y:c.y - 4, vx:0, vy:-5, r:1, life:0, max:2 });
    } });
  }
  campQueue.sort((a, b) => a.y - b.y);
}
function launchRaid(att, def, r){
  if (!att || !def || att === def) return;
  const ps = villagers.filter(v => !v.dead && !v.away && v.vid === att.id && (yearT - v.born) / YEAR >= ADULT_H && v !== att.leader && (v.hp ?? 1) > .5).sort((a, b) => (b.weapon ? 1 : 0) - (a.weapon ? 1 : 0)).slice(0, Math.min(6, Math.max(2, Math.floor(popOf(att) / 3))));
  if (ps.length < 2) return;
  // Con experiencia, se reúnen antes en un punto a cierta distancia del pueblo enemigo y atacan todos a la vez
  const grp = { ps, go:!knowsT(att, 'grupo'), until:yearT + 35, loot:false, repelled:false };
  if (!grp.go) {
    const dd = Math.hypot(att.fx - def.fx, att.fy - def.fy) || 1, k = Math.min(14, dd * .6);
    const rp = ringFind(Math.round(def.fx + (att.fx - def.fx) / dd * k), Math.round(def.fy + (att.fy - def.fy) / dd * k), 5, (x, y) => tileFree(x, y) && !WATER[world.biome[y * W + x]]);
    if (rp) { grp.rx = rp[0] * T + 2; grp.ry = rp[1] * T + 3; } else grp.go = true;
  }
  // Formación de marcha (si ya saben luchar en grupo o son bastantes) y a caballo quien pueda
  if (ps.length >= 4 || knowsT(att, 'grupo')) grp.form = ['columna', 'línea', 'cuña'][Math.floor(Math.random() * 3)];
  if ((att.know || {}).montar) { const horses = animals.filter(a => !a.dead && a.sp === 'caballo' && a.dom === att.id && !a.rider); for (const v of ps) { if (!horses.length) break; if (v.mount || isRanged(v.weapon) && Math.random() < .5) continue; const a = horses.pop(); a.rider = v; v.mount = a; a.lead = null; } }
  const bearer = ps.find(v => !isRanged(v.weapon)) || ps[0]; for (const v of ps) v.bearer = v === bearer;
  const sieged = launchSiege(att, def);
  for (const v of ps) {
    v.sleep = false; releaseTask(v); if (v.actT > 0) { v.actT = 0; v.onDone = null; }
    v.task = { k:'asalto', enemy:def.id, x:def.fx * T + 2, y:def.fy * T + 10, grp }; v.lastD = Infinity; v.route = null; v.routeKey = null;
    if (Math.random() < .4) floats.push({ x:v.x, y:v.y - 14, txt:['¡Al ataque!', '¡A por ellos!', `¡Por ${nationOf(att).name}!`][Math.floor(Math.random() * 3)], col:'#f8d0a0', life:0 });
  }
  // Los vigías avisan: si saben, los defensores toman posiciones
  const posts = defensePosts(def, att); if (posts.length) def.alarm = { until:yearT + 70, posts };
  const cav = ps.filter(v => v.mount).length;
  notify(`Los de ${att.name} marchan a atacar ${def.name}${grp.form ? ` en formación de ${grp.form}` : ''}${grp.go ? '' : ' (se reunirán antes de atacar)'}${cav ? ` con ${cav} jinete${cav > 1 ? 's' : ''}` : ''}${sieged ? ' y una catapulta' : ''}${isNight() ? ' en plena noche' : ''}`, { x:att.fx * T, y:att.fy * T });
}
const enemyOf = (v, u) => { const a = villageById(v.vid), b = villageById(u.vid); if (!a || !b || a === b) return false; const r = rels.get(relKey(a, b)); return !!(r && r.war); };
// Pelea entre personas (cuerpo a cuerpo con lanza o puños; con arco, de lejos). Devuelve true si este turno lo ha pasado luchando
function fightPerson(v, e, dt){
  const gv = villageById(v.vid), ge = villageById(e.vid), d = Math.hypot(e.x - v.x, e.y - v.y), hv = elevAt(v), he = elevAt(e);
  const tv = Math.floor(v.x / T), ty = Math.floor(v.y / T);
  const onTower = knowsT(gv, 'torres') && towersOf(gv || {}).some(i => Math.hypot((i % W) - tv, ((i / W) | 0) - ty) < 3);
  const cav = v.mount && knowsT(gv, 'caballeria');
  const reach = isRanged(v.weapon) ? (v.weapon === 'ballesta' ? 38 : 30) + (onTower ? 14 : 0) + (hv - he > .02 ? 8 : 0) : cav ? 7 : 5;
  v.dir = e.x < v.x ? -1 : 1; v.dirT = .4; v.atkT = (v.atkT || 0) - dt;
  if (isRanged(v.weapon) && !onTower) {
    // Arqueros que saben: si se les echan encima, retroceden; si hay una loma cerca desde la que llegan, suben a ella
    if (knowsT(gv, 'distancia') && d < 14) { const k = 20 / Math.max(1, d); vGo(v, v.x + (v.x - e.x) * k, v.y + (v.y - e.y) * k, dt, true); return true; }
    if (knowsT(gv, 'altura')) {
      if (!(v.hillT > 0)) {
        v.hillT = 3; v.hill = null; let best = hv + .015;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const x = tv + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x;
          if (world.e[i] > best && !WATER[world.biome[i]] && tileCost(x, y) < Infinity && Math.hypot(x * T + 2 - e.x, y * T + 3 - e.y) < 34) { best = world.e[i]; v.hill = [x * T + 2, y * T + 3]; }
        }
      } else v.hillT -= dt;
      if (v.hill && Math.hypot(v.hill[0] - v.x, v.hill[1] - v.y) > 3) { vGo(v, v.hill[0], v.hill[1], dt, true); return true; }
    }
  }
  if (d > reach) { vGo(v, e.x, e.y, dt, true); return true; }
  if (v.atkT <= 0) {
    v.atkT = (v.weapon === 'ballesta' ? 2.2 : v.weapon === 'arco' ? 1.5 : 1) * (cav ? .8 : 1); v.stab = .25;
    let dmg = { lanza:.34, espada:.42, arco:.28, ballesta:.5 }[v.weapon] || .14, hit = v.weapon === 'ballesta' ? .8 : v.weapon === 'arco' ? .7 : .85;
    dmg *= guardOf(e, isRanged(v.weapon));
    if (v.weapon && knowsT(gv, 'puntas')) dmg *= 1.25;          // punta de piedra
    if (v.ironW) dmg *= 1.3;
    if (knowsSci(gv, 'polvora')) dmg *= 1.35; // pólvora (ciencia.js)
    if (v.vet) { dmg *= 1 + .12 * v.vet; hit = Math.min(.97, hit + .03 * v.vet); } // instruidos en el cuartel                                     // forjada en hierro
    if (hv - he > .02) dmg *= 1.25;                              // desde arriba se golpea mejor
    if (cav) dmg += .12;                                         // la carga a caballo
    if (knowsT(ge, 'escudos')) dmg *= .8;                        // el enemigo se cubre
    if (e.sleep) dmg *= 1.5;                                     // pillado durmiendo
    if (inForest(e) && knowsT(ge, 'bosque')) hit *= .7;          // entre los árboles cuesta acertar
    if (onTower) hit = Math.min(.95, hit + .15);
    if (v.ambush) { dmg *= 1.6; hit = 1; v.ambush = false; if (gv && yearT - (gv.ambushMsgT ?? -1e9) > 40) { gv.ambushMsgT = yearT; notify(`¡Emboscada! Los de ${gv.name} salen del bosque y caen sobre los de ${ge ? ge.name : '?'}`, { x:v.x, y:v.y }); } }
    const shoot = isRanged(v.weapon); snd(shoot ? 'arrow' : 'clash', v.x, v.y); if (shoot) arrows.push({ x0:v.x, y0:v.y - 5, a:e, v, t:0, dur:Math.max(.12, d / 150), hit:true, vis:true, bolt:v.weapon === 'ballesta' });
    if (Math.random() < hit) {
      if (!shoot) for (let n = 0; n < 4; n++) chips.push({ x:(v.x + e.x) / 2, y:(v.y + e.y) / 2 - 6, vx:(Math.random() - .5) * 30, vy:-8 - Math.random() * 14, life:0, max:.25 + Math.random() * .2, col:n % 2 ? '#fff3a0' : '#ffd040' }); // chispas del choque
      e.hp = (e.hp ?? 1) - dmg * castleShield(e); hurtFx(e, v.x, v.y, walkable); // (en su castillo aguantan más: fama.js)
      if (gv) milOf(gv).xp += .2;
      if (e.hp <= 0) {
        const r = ge && gv && rels.get(relKey(ge, gv)); if (r && r.war) { r.war.dead++; warLoss(r, ge); }
        notify(`${e.name} de ${ge ? ge.name : '?'} ha muerto en la guerra contra ${gv ? gv.name : '?'}`, { x:e.x, y:e.y });
        if (gv) heroKill(v, gv); // ¿un héroe? (fama.js)
        if (gv) { const m = milOf(gv); m.kills++; m.xp += 1; }
        if (ge) { const m = milOf(ge); m.deaths++; m.xp += .6; }
        // Un ataque rechazado: si caen la mitad de los que vinieron sin haber saqueado
        const raid = e.task && e.task.k === 'asalto' && e.task.grp;
        floats.push({ x:e.x, y:e.y - 14, txt:'†', col:'#f05040', life:0 }); if (e.bearer && e.task && e.task.k === 'asalto' && ge) notify(`¡Cae el abanderado de ${nationOf(ge).name}!`, { x:e.x, y:e.y }); releaseTask(e); killVillager(e, 'guerra');
        if (raid && !raid.loot && !raid.repelled && raid.ps.filter(u => u.dead).length >= Math.ceil(raid.ps.length / 2)) {
          raid.repelled = true; if (ge) milOf(ge).repelled++; if (gv) { milOf(gv).won++; milOf(gv).xp += 2; }
          for (const u of raid.ps) if (!u.dead && u.task && u.task.k === 'asalto') u.task = { k:'volver' };
          if (gv && ge) notify(`Los de ${gv.name} rechazan el ataque de ${ge.name}: los que quedan huyen`, { x:v.x, y:v.y });
        }
        milLearn(gv); milLearn(ge);
      }
    }
  }
  return true;
}
// ---- Equipo de guerra ----
const isRanged = w => w === 'arco' || w === 'ballesta';
const GEAR_TXT = { espada:'espada', ballesta:'ballesta', escudo:'escudo', hierro:'armadura de hierro', cuero:'armadura de cuero' };
const GEAR_MSG = { espada:'forjan sus primeras espadas de hierro', ballesta:'fabrican ballestas: disparan más lejos y más fuerte que los arcos', escudo:'hacen escudos de madera para sus soldados',
  hierro:'forjan armaduras de hierro', cuero:'cosen armaduras de cuero con las pieles de la caza' };
function gearMsg(g, what){ const k = g.gearMsg ||= {}; if (k[what]) return; k[what] = true; notify(`En ${g.name} ${GEAR_MSG[what]}`, { x:g.fx * T, y:g.fy * T }); }
// El siguiente soldado al que equipar, y con qué (lo que se pueda pagar con lo que hay en el almacén)
function gearNeed(g){
  const forge = hasForge(g), iron = g.iron || 0, wood = g.wood, hides = g.hides || 0;
  const sol = villagers.filter(u => !u.dead && u.vid === g.id && u.weapon && !(u.task && u.task.k === 'asalto'));
  // Por rondas: primero mejores armas para todos, luego escudos, luego armaduras
  for (const u of sol) { if (forge && u.weapon === 'lanza' && iron >= 2 && wood >= 1) return [u, 'espada']; if (forge && u.weapon === 'arco' && iron >= 1 && wood >= 3) return [u, 'ballesta']; }
  for (const u of sol) if (!u.shield && !isRanged(u.weapon) && wood >= 5) return [u, 'escudo'];
  for (const u of sol) if (!u.armor && hides >= 2) return [u, 'cuero'];
  for (const u of sol) if (u.armor !== 'hierro' && forge && iron >= 3) return [u, 'hierro'];
  return null;
}
// Lo que para el golpe: el escudo (sobre todo las flechas) y la armadura
const guardOf = (e, ranged) => (e.shield ? (ranged ? .6 : .75) : 1) * (e.armor === 'hierro' ? .65 : e.armor === 'cuero' ? .85 : 1);
// ---- Arte de la guerra: cada nación aprende de lo que vive en combate (y de sus avances) a luchar mejor ----
const TACTICS = { grupo:'reunirse antes de atacar y caer todos a la vez', distancia:'que los arqueros guarden la distancia', altura:'buscar las alturas para disparar desde arriba',
  bosque:'esconderse en el bosque y tender emboscadas', foco:'rematar primero al enemigo más herido', retirada:'retirar a los heridos antes de que mueran', noche:'atacar de noche, mientras el enemigo duerme',
  caballeria:'cargar a caballo', escudos:'llevar escudos de madera', torres:'defenderse desde las torres de vigía', puntas:'hacer lanzas y flechas con punta de piedra' };
const TACTIC_SHORT = { grupo:'Ataque en grupo', distancia:'Arqueros a distancia', altura:'Terreno elevado', bosque:'Emboscadas', foco:'Rematar heridos', retirada:'Retirada de heridos', noche:'Ataques nocturnos',
  caballeria:'Caballería', escudos:'Escudos', torres:'Defensa en torres', puntas:'Puntas de piedra' };
const milOf = g => { const n = nationOf(g); return n.mil ||= { xp:0, t:{}, kills:0, deaths:0, repelled:0, won:0 }; };
const knowsT = (g, k) => !!(g && milOf(g).t[k]);
function learnT(g, k){ const m = milOf(g); if (m.t[k]) return; m.t[k] = true; notify(`Los de ${nationOf(g).name} aprenden a ${TACTICS[k]}`, { x:g.fx * T, y:g.fy * T }); }
// Lo vivido se convierte en táctica: las derrotas enseñan tanto como las victorias
function milLearn(g){
  if (!g) return; const m = milOf(g), n = nationOf(g);
  if (n.quarry != null && m.xp >= 2) learnT(g, 'puntas');
  if (towersOf(n).length && m.xp >= 3) learnT(g, 'torres');
  if (m.xp >= 4 || m.deaths >= 2) learnT(g, 'grupo');
  if ((n.know || {}).montar && m.xp >= 5) learnT(g, 'caballeria');
  if (m.xp >= 6 && villagers.some(u => !u.dead && u.vid === n.id && u.weapon === 'arco')) learnT(g, 'distancia');
  if (m.xp >= 7 && (n.treesNear ?? 0) >= 12) learnT(g, 'bosque');
  if (m.xp >= 8 && m.deaths >= 2) learnT(g, 'escudos');
  if (m.xp >= 9) learnT(g, 'altura');
  if (m.deaths >= 4) learnT(g, 'retirada');
  if (m.repelled >= 1) learnT(g, 'noche');
  if (m.xp >= 12) learnT(g, 'foco');
}
const inForest = u => { const x = Math.floor(u.x / T), y = Math.floor(u.y / T); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = world.objs[(y + dy) * W + x + dx]; if (o && OBJ[o.key] && OBJ[o.key][1] === 'tree') return true; } return false; };
const elevAt = u => world.e[clamp(Math.floor(u.y / T), 0, H - 1) * W + clamp(Math.floor(u.x / T), 0, W - 1)];
// Puestos de defensa cuando se acerca un ataque: los arqueros a las torres, el resto escondido en el bosque del lado por donde vienen
function defensePosts(def, att){
  const posts = [];
  if (knowsT(def, 'torres')) for (const i of towersOf(def)) { const sb = standBy(i); if (sb) posts.push([sb[0], sb[1], false, true]); }
  if (knowsT(def, 'bosque')) {
    const ang = Math.atan2(att.fy - def.fy, att.fx - def.fx), c = [];
    for (let d = 6; d <= 14; d++) for (let a = -.9; a <= .9; a += .15) {
      const x = Math.round(def.fx + Math.cos(ang + a) * d), y = Math.round(def.fy + Math.sin(ang + a) * d);
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || WATER[world.biome[y * W + x]] || tileCost(x, y) === Infinity || world.objs[y * W + x]) continue;
      if (inForest({ x:x * T + 2, y:y * T + 3 })) c.push([x * T + 2, y * T + 3, true, false, Math.abs(a)]);
    }
    c.sort((p, q) => p[4] - q[4]); for (const p of c.slice(0, 8)) posts.push(p);
  }
  return posts;
}
function warCard(g){
  const m = nationOf(g).mil || { xp:0, t:{}, kills:0, deaths:0 }; if (!m.xp && !villagers.some(u => !u.dead && u.vid === g.id && u.weapon)) return '';
  const ts = Object.keys(m.t);
  const sol = villagers.filter(u => !u.dead && nationOf(villageById(u.vid) || {}) === nationOf(g) && u.weapon), cnt = k => sol.filter(k).length;
  const army = sol.length ? `<div class="chips" style="margin:4px 0">${[['lanzas', u => u.weapon === 'lanza'], ['espadas', u => u.weapon === 'espada'], ['arcos', u => u.weapon === 'arco'], ['ballestas', u => u.weapon === 'ballesta'], ['escudos', u => u.shield], ['armaduras de cuero', u => u.armor === 'cuero'], ['armaduras de hierro', u => u.armor === 'hierro']].map(([n, f]) => cnt(f) ? `<span>${cnt(f)} ${n}</span>` : '').join('')}</div>` : '';
  return `<h4>Arte de la guerra</h4>${army}<div>${sol.length} soldados · experiencia ${Math.round(m.xp)} · ${m.kills} enemigo${m.kills === 1 ? '' : 's'} abatido${m.kills === 1 ? '' : 's'} · ${m.deaths} caído${m.deaths === 1 ? '' : 's'}${m.won ? ` · ${m.won} ataques rechazados` : ''}${ts.length ? `<div class="chips">${ts.map(k => `<span title="${TACTICS[k]}">${TACTIC_SHORT[k]}</span>`).join('')}</div>` : '<br>Aún no saben luchar más que a lo bruto'}</div>`;
}
// ---- Política: partidos inventados en cada sitio, de izquierdas a derechas, con sus leyes; cada cierto tiempo se
// reúnen en la plaza y votan; el partido que gana pone al líder y sus leyes cambian cómo vive el pueblo y cómo trata
// a los demás ----
// Nombres de partido como los de la vida real, con sus siglas ({N}: el pueblo; {L}: la lengua de una minoría)
const PARTY_NAMES = {
  izq:['Partido Socialista de {N}', 'Partido Comunista de {N}', 'Partido Socialista Obrero', 'Izquierda Unida', 'Frente Popular', 'Partido de los Trabajadores', 'Unión de la Izquierda', 'Alianza Socialista', 'Movimiento Obrero de {N}', 'Partido del Pueblo Trabajador', 'Izquierda Republicana', 'Partido Comunista Revolucionario', 'Hermandad del Pan para Todos', 'Partido de la Hoguera Común'],
  centro:['Partido Demócrata', 'Unión de Centro Democrático', 'Ciudadanos de {N}', 'Coalición Cívica', 'Centro Democrático y Social', 'Movimiento Ciudadano', 'Partido Moderado', 'Unión Progresista', 'Agrupación Independiente de {N}', 'Partido de la Concordia', 'Partido del Arado y el Río'],
  der:['Partido Conservador', 'Partido Popular de {N}', 'Unión Nacional', 'Frente Nacional', 'Alianza Patriótica', 'Acción Nacional', 'Liga Conservadora', 'Partido de la Tradición', 'Partido de la Fe y el Orden', 'Movimiento Patriótico de {N}', 'Partido Agrario', 'Unión de los Mercaderes', 'Partido de la Corona de Piedra'],
  verde:['Partido Verde', 'Alianza Ecologista', 'Movimiento Verde de {N}', 'Verdes Unidos', 'Partido Ecologista de {N}', 'Coalición por los Bosques'],
  liberal:['Partido Liberal', 'Unión Liberal', 'Liberales de {N}', 'Partido Liberal Demócrata', 'Alianza Liberal', 'Partido Liberal Progresista'],
  region:['Partido Regionalista {L}', 'Bloque {L}', 'Unión del Pueblo {L}', 'Coalición {L}', 'Partido Nacionalista {L}', 'Convergencia {L}', 'Frente {L}'],
};
const SIGLA_SKIP = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'por']);
const siglas = name => name.split(/\s+/).filter(w => w && !SIGLA_SKIP.has(w.toLowerCase())).map(w => w[0].toUpperCase()).join('');
function partyName(kind, g, used, L){
  const pool = PARTY_NAMES[kind].map(t => t.replace('{N}', g.name).replace('{L}', L || g.name)).filter(x => !used.has(x));
  const name = pool[Math.floor(Math.random() * pool.length)] || `Partido de ${g.name}`; used.add(name);
  return { name, abbr:siglas(name) };
}
const LAW_TXT = { aranceles:'aranceles', autonomia:'autonomía de las provincias', pensiones:'pensiones', fortificacion:'fortificación', derecho_huelga:'derecho a huelga', prohibir_huelgas:'prohibición de huelgas', lengua_unica:'una sola lengua', plurilinguismo:'todas las lenguas', reforma_lengua:'reforma de la lengua', pureza_lengua:'pureza de la lengua', reparto:'reparto de comida', obras:'obras públicas', paz:'paz con los vecinos', comercio:'comercio libre', ejercito:'ejército', expansion:'expansión', fe:'fe oficial', estatal:'economía estatal', censura:'censura',
  jornada_corta:'jornada corta', jornada_larga:'jornada larga', sanidad:'sanidad pública', educacion:'escuelas', impuestos_altos:'impuestos altos', impuestos_bajos:'impuestos bajos',
  bosques:'protección de los bosques', orden:'mano dura', natalidad:'más hijos', laicidad:'laicidad', salario_minimo:'salario mínimo', fronteras_abiertas:'fronteras abiertas', fronteras_cerradas:'fronteras cerradas', cuarentena:'cuarentena', vivienda_publica:'vivienda pública', mercado_vivienda:'libre mercado de la vivienda', tope_alquiler:'tope a los alquileres', libertad_religiosa:'libertad de culto', persecucion_religiosa:'persecución religiosa', derechos_humanos:'derechos humanos', segregacion:'segregación racial', matrimonio_igualitario:'matrimonio igualitario', persecucion:'persecución de homosexuales' };
const LAW_DESC = { aranceles:'las mercancías de otras naciones pagan una parte al entrar (y aparece el contrabando)', autonomia:'las provincias y colonias se gobiernan solas en lo suyo: apenas quieren irse', pensiones:'los mayores dejan de trabajar y cobran del tesoro', fortificacion:'todo el mundo arrima el hombro en las murallas: cada tramo se levanta el doble de rápido y cuesta la mitad', derecho_huelga:'los sindicatos pueden hacer huelga y el gobierno tiene que negociar antes', prohibir_huelgas:'las huelgas son ilegales: se rompen y los cabecillas van a juicio', lengua_unica:'en la escuela solo se enseña la lengua oficial: las demás se van perdiendo (y sus hablantes protestan)', plurilinguismo:'en la escuela se enseñan todas las lenguas del país (a los de una sola lengua no les gusta)', reforma_lengua:'una academia moderniza la lengua: cambia antes (los mayores se quejan de que ya no es la de siempre)', pureza_lengua:'la lengua no se toca: casi no cambia y cuesta más aprender palabras de fuera', vivienda_publica:'el gobierno construye muchas casas y las da a quien no tiene, sin alquiler', mercado_vivienda:'el gobierno no construye casas: solo se hacen las que alguien compra, y los precios suben', tope_alquiler:'los alquileres no pueden pasar de un tope y cuesta más desahuciar', libertad_religiosa:'cada uno reza a quien quiera: los forasteros de otra fe viven en paz (y sus predicadores convierten más)', persecucion_religiosa:'solo se tolera la fe del pueblo: a los de otra fe se les expulsa', derechos_humanos:'todos tienen los mismos derechos, sea cual sea su origen o su piel: mejor trato con los vecinos', segregacion:'quien tiene otra piel cobra menos y vive peor: muchos se van y los vecinos lo ven mal', matrimonio_igualitario:'las parejas del mismo sexo se casan y pueden adoptar', persecucion:'las parejas del mismo sexo se esconden; si las descubren, las destierran', reparto:'se reparte comida antes a quien tiene hambre', obras:'se construye más', paz:'menos guerras y más diplomacia', comercio:'más comercio y caravanas', ejercito:'más soldados y más impuestos',
  expansion:'conquistan a quien puedan', fe:'una religión oficial', estatal:'el estado lo controla todo', censura:'menos protestas, más rabia contenida', jornada_corta:'trabajan menos horas y viven más contentos',
  jornada_larga:'trabajan de sol a sol: producen más, pero se quejan', sanidad:'los heridos se curan antes', educacion:'los niños aprenden más (a nadar, un oficio)', impuestos_altos:'más dinero público, menos en el bolsillo',
  impuestos_bajos:'menos gasto público, más dinero para la gente', bosques:'talan menos y replantan más', orden:'las protestas se reprimen y cuesta más que salgan', natalidad:'nacen más niños', laicidad:'los dioses dan menos miedo', salario_minimo:'cobran más por su trabajo (y los precios suben algo)', fronteras_abiertas:'entran caravanas y viajeros libremente: más comercio y mejores relaciones', fronteras_cerradas:'las puertas se atrancan para los de fuera: casi no entran caravanas por tierra', cuarentena:'aíslan a los enfermos: las epidemias se contagian mucho menos' };
const LAW_LEAN = { aranceles:.4, autonomia:-.2, pensiones:-.5, fortificacion:.35, derecho_huelga:-.45, prohibir_huelgas:.6, lengua_unica:.55, plurilinguismo:-.4, reforma_lengua:-.25, pureza_lengua:.45, vivienda_publica:-.6, tope_alquiler:-.45, mercado_vivienda:.55, libertad_religiosa:-.35, persecucion_religiosa:.75, derechos_humanos:-.45, matrimonio_igualitario:-.5, segregacion:.7, persecucion:.8, cuarentena:.1, fronteras_abiertas:-.35, fronteras_cerradas:.45, salario_minimo:-.55, reparto:-.7, jornada_corta:-.6, sanidad:-.5, impuestos_altos:-.5, educacion:-.4, paz:-.35, bosques:-.3, laicidad:-.3, obras:-.15, comercio:.45, fe:.4, natalidad:.3, jornada_larga:.5, impuestos_bajos:.55, ejercito:.6, orden:.6, expansion:.7 };
const LAW_CLASH = [['derecho_huelga', 'prohibir_huelgas'], ['lengua_unica', 'plurilinguismo'], ['reforma_lengua', 'pureza_lengua'], ['vivienda_publica', 'mercado_vivienda'], ['tope_alquiler', 'mercado_vivienda'], ['libertad_religiosa', 'persecucion_religiosa'], ['laicidad', 'persecucion_religiosa'], ['derechos_humanos', 'segregacion'], ['matrimonio_igualitario', 'persecucion'], ['fronteras_abiertas', 'fronteras_cerradas'], ['salario_minimo', 'impuestos_bajos'], ['jornada_corta', 'jornada_larga'], ['impuestos_altos', 'impuestos_bajos'], ['fe', 'laicidad'], ['paz', 'expansion']];
// Programa de un partido: 3 o 4 leyes cercanas a sus ideas, con algo de sorpresa (dos partidos del mismo lado no proponen lo mismo)
function partyProgram(ideo, n = 3 + (Math.random() < .5 ? 1 : 0), keep = []){
  const laws = [...keep];
  while (laws.length < n) {
    const opts = Object.entries(LAW_LEAN).filter(([l]) => !laws.includes(l) && !LAW_CLASH.some(([a, b]) => (l === a && laws.includes(b)) || (l === b && laws.includes(a))));
    if (!opts.length) break;
    const w = opts.map(([, lean]) => Math.exp(-((lean - ideo) ** 2) / .14) + .008);
    let k = Math.random() * w.reduce((a, b) => a + b, 0), pick = opts[0][0];
    for (let j = 0; j < opts.length; j++) if ((k -= w[j]) < 0) { pick = opts[j][0]; break; }
    laws.push(pick);
  }
  return laws;
}
// En los parlamentos hay más partidos: verdes, liberales y, donde se hablan varias lenguas, uno regionalista
function moreParties(g){
  const ps = g.parties ||= [], has = k => ps.some(p => p.kind === k || (k === 'verde' && /Verde|Ecolog/.test(p.name)) || (k === 'liberal' && /Liberal/.test(p.name)) || (k === 'region' && /Regional/.test(p.name))), used = new Set(villages.flatMap(o => (o.parties || []).map(p => p.name)));
  if (!has('verde')) ps.push({ ...partyName('verde', g, used), kind:'verde', ideo:-.3, laws:partyProgram(-.3, 3, ['bosques']), col:'#5aa84a' });
  if (!has('liberal')) ps.push({ ...partyName('liberal', g, used), kind:'liberal', ideo:.2, laws:partyProgram(.2, 3, ['comercio']), col:'#e8c040' });
  const langs = [...new Set(villages.filter(o => popOf(o) && nationOf(o) === g).map(o => o.lang).filter(l => l != null && l !== g.lang))];
  if (langs.length && !has('region')) { const L = langList()[langs[0]]; ps.push({ ...partyName('region', g, used, L ? capFirst(L.adj) : null), kind:'region', ideo:-.05, laws:partyProgram(-.05, 3, ['plurilinguismo']), col:'#8a5ac8' }); }
  while (ps.length > 6) ps.splice(ps.findIndex((p, k) => k !== g.ruling), 1);
}
function makeParties(g){
  const parties = [], used = new Set();
  for (const side of Math.random() < .5 ? ['izq', 'centro', 'der'] : ['izq', 'der']) {
    const { name, abbr } = partyName(side, g, used); // nombres como los de verdad, con siglas
    const ideo = side === 'izq' ? -.4 - Math.random() * .45 : side === 'der' ? .4 + Math.random() * .45 : (Math.random() - .5) * .3;
    const laws = partyProgram(ideo, undefined, name.includes('Fe') ? ['fe'] : []);
    parties.push({ name, abbr, kind:side, ideo, laws, col:side === 'izq' ? '#d8483a' : side === 'der' ? '#3a6ab8' : '#e8b848' });
  }
  g.parties = parties;
  if (!g.regime) { // la primera forma de gobierno depende de cómo les va: quien manda, cuánto temen a sus dioses, si hay peligro...
    const L = g.leader && !g.leader.dead ? g.leader : null, devout = g.faith && ((g.devotion || 0) > 1 || (g.wrath || 0) > 2), danger = (g.danger || 0) > 0;
    const w = { republica:3, democracia:.6, monarquia:L ? 2.5 : 0, teocracia:devout ? 2 : .3, dictadura:L ? (danger ? 2 : .8) : 0, socialismo:1, tribu:1.2 };
    let k = Math.random() * Object.values(w).reduce((a2, b2) => a2 + b2, 0); for (const [reg, x] of Object.entries(w)) if ((k -= x) < 0) { g.regime = reg; break; }
    g.regime ||= 'republica'; g.regimeT = yearT;
    if (PARLIAMENT.includes(g.regime)) moreParties(g);
    if (g.regime === 'teocracia' && g.faith) { const pr = villagers.filter(u => !u.dead && u.vid === g.id && (yearT - u.born) / YEAR >= ADULT_H).sort((x, y) => pietyOf(y) - pietyOf(x))[0]; if (pr) g.leader = pr; }
    const at = { x:g.fx * T, y:g.fy * T }, Ln = g.leader && !g.leader.dead ? g.leader.name : 'quien manda';
    notify({ democracia:`En ${g.name} deciden gobernarse con un parlamento de muchos partidos: nace una democracia parlamentaria`, republica:`En ${g.name} deciden gobernarse votando: nace una república`, monarquia:`${Ln} se corona ${g.leader && g.leader.sex === 'm' ? 'reina' : 'rey'} de ${g.name}: nace una monarquía`,
      teocracia:`En ${g.name} mandan los sacerdotes en nombre de ${g.faith ? g.faith.god : 'sus dioses'}: nace una teocracia`, dictadura:`${Ln} se hace con todo el poder en ${g.name}${danger ? ' ante el peligro' : ''}: nace una dictadura`,
      socialismo:`En ${g.name} deciden repartirlo todo y votar: nace una república socialista`, tribu:`${g.name} sigue gobernándose como siempre, con un consejo de ancianos` }[g.regime], at);
  }
  if (!g.flag) { g.flag = makeFlag(g); g.flagUrl = flagDataUrl(g.flag); notify(`${g.name} se da a sí misma una bandera`, { x:g.fx * T, y:g.fy * T }); }
  notify(`En ${g.name} nacen los partidos: ${parties.map(p => p.name).join(', ')}`, { x:g.fx * T, y:g.fy * T });
}
const artP = p => /^(Ciudadanos|Verdes|Liberales)/.test(p.name) ? 'los' : /^(Unión|Liga|Alianza|Asamblea|Hermandad|Izquierda|Coalición|Acción|Agrupación|Convergencia)/.test(p.name) ? 'la' : 'el'; // «gana la Liga…», «gana el Frente…»
const lawsOf = g => { const n = nationOf(g); if (REGIME_LAWS[n.regime]) return REGIME_LAWS[n.regime]; let L = n.ruling != null && n.parties && n.parties[n.ruling] ? n.parties[n.ruling].laws : [];
  const C = n.coalition != null && n.parties && n.parties[n.coalition]; if (C) L = [...L, ...C.laws.filter(l => !L.includes(l) && !LAW_CLASH.some(([a, b]) => (l === a && L.includes(b)) || (l === b && L.includes(a))))];
  return n.regime === 'socialismo' ? [...new Set(['reparto', 'estatal', 'vivienda_publica', ...L.filter(l => l !== 'mercado_vivienda')])] : L; };
const hasLaw = (g, l) => lawsOf(g).includes(l);
const sideTxt = p => p.ideo < -.3 ? 'izquierda' : p.ideo > .3 ? 'derecha' : 'centro';
// Elecciones: los de toda la nación van a la plaza de su pueblo a votar; luego se cuenta
function startElection(cap){
  const vill = villages.filter(o => popOf(o) && nationOf(o) === cap);
  for (const o of vill) {
    const r0 = o.plaza; if (!r0) continue;
    for (const u of villagers) {
      if (u.dead || u.away || u.vid !== o.id || (yearT - u.born) / YEAR < ADULT_H || u.sleep || u.boat || (u.task && ['asalto', 'apagar', 'viaje', 'ritual', 'protesta', 'golpe', 'reprimir', 'detenido'].includes(u.task.k))) continue;
      releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; }
      u.task = { k:'votar', x:(r0.x0 + .5 + Math.random() * (r0.x1 - r0.x0)) * T + 2, y:(r0.y0 + .5 + Math.random() * (r0.y1 - r0.y0)) * T + 3, until:yearT + 20 }; u.lastD = Infinity;
    }
  }
  cap.election = { until:yearT + 22 };
  notify(`Hay elecciones en ${cap.name}${vill.length > 1 ? ` (y ${vill.length - 1} pueblo${vill.length > 2 ? 's' : ''} más de su nación)` : ''}: todos a la plaza a votar`, { x:cap.fx * T, y:cap.fy * T });
}
function countVotes(cap){
  const ps = cap.parties, votes = ps.map(() => 0), voters = villagers.filter(u => !u.dead && (yearT - u.born) / YEAR >= ADULT_H && nationOf(villageById(u.vid)) === cap);
  for (const u of voters) {
    let best = 0, bd = Infinity;
    ps.forEach((p, k) => { let d = Math.abs((u.ideo || 0) - p.ideo) + Math.random() * .35 - (k === cap.ruling ? .05 : 0); if (p.laws.includes('fe') && (cap.wrath || 0) > 3) d -= .2; if (p.laws.includes('ejercito') && [...rels.values()].some(r => r.war)) d -= .15; if (d < bd) { bd = d; best = k; } });
    votes[best]++;
  }
  const tot = Math.max(1, voters.length), win = votes.indexOf(Math.max(...votes)), p = ps[win];
  const changed = cap.ruling !== win; cap.ruling = win; cap.coalition = null;
  // Parlamento: si el ganador no llega a la mitad, pacta con el partido de ideas más parecidas que le dé mayoría
  let coalTxt = '';
  if (PARLIAMENT.includes(regimeOf(cap)) && votes[win] / tot < .5) {
    const partner = ps.map((q, k) => k).filter(k => k !== win && votes[win] + votes[k] > tot / 2).sort((a, b) => Math.abs(ps[a].ideo - p.ideo) - Math.abs(ps[b].ideo - p.ideo))[0];
    if (partner != null) { cap.coalition = partner; coalTxt = ` y gobierna en coalición con ${artP(ps[partner])} ${ps[partner].name}`; }
    else coalTxt = ' pero sin mayoría: gobierna en minoría';
  }
  cap.winStreak = changed ? 1 : (cap.winStreak || 0) + 1;
  // Los que pierden se replantean el programa (a veces a fondo): miran qué piensa la gente y se acercan un poco
  const avgIdeo = voters.reduce((a, u) => a + (u.ideo || 0), 0) / Math.max(1, voters.length);
  for (const [k, q] of ps.entries()) if (k !== win && Math.random() < .6 && q.laws.length) {
    const nOut = Math.random() < .35 ? 2 : 1, outs = [...q.laws].sort(() => Math.random() - .5).slice(0, nOut), keep = q.laws.filter(l => !outs.includes(l));
    const nl = partyProgram(q.ideo + (avgIdeo - q.ideo) * .3 + (Math.random() - .5) * .2, q.laws.length, keep), added = nl.filter(l => !q.laws.includes(l));
    if (added.length) { q.laws = nl; const txt = `Tras perder en ${cap.name}, ${artP(q)} ${q.name} renueva su programa: deja ${outs.map(l => `«${LAW_TXT[l]}»`).join(' y ')} y propone ${added.map(l => `«${LAW_TXT[l]}»`).join(' y ')}`; lawLog(cap, txt); setTimeout(() => notify(txt, { x:cap.fx * T, y:cap.fy * T }), 600); }
  }
  // El líder: alguien de la capital con ideas parecidas a las del partido
  const cands = villagers.filter(u => !u.dead && u.vid === cap.id && (yearT - u.born) / YEAR >= ADULT_H && (yearT - u.born) / YEAR < u.life * .85).sort((a, b) => Math.abs((a.ideo || 0) - p.ideo) - Math.abs((b.ideo || 0) - p.ideo));
  if (cands.length) cap.leader = cands[0];
  cap.lastVote = ps.map((q, k) => `${q.name} ${Math.round(votes[k] / tot * 100)} %`).join(' · '); cap.voteRes = votes.map(x => Math.round(x / tot * 100));
  notify(`Elecciones en ${cap.name}: gana ${artP(p)} ${p.name} (${sideTxt(p)}, ${Math.round(votes[win] / tot * 100)} %)${coalTxt}${cap.leader ? `; ${cap.leader.name} pasa a mandar` : ''}${changed ? `. Nuevas leyes: ${p.laws.map(l => LAW_TXT[l]).join(', ')}` : ''}`, { x:cap.fx * T, y:cap.fy * T });
  // Polarización: si un pueblo muy grande queda partido casi por la mitad, los perdedores pueden irse y fundar el suyo
  const second = [...votes].sort((a, b) => b - a)[1] || 0;
  if (popOf(cap) > 36 && second / tot > .38 && Math.random() < .35) secede(cap, ps[votes.indexOf(second)]);
  const share = votes[win] / tot;
  // Si ganan siempre los mismos, los partidos se reparten los cargos: partitocracia
  if (['democracia', 'republica'].includes(regimeOf(cap)) && cap.winStreak >= 4 && Math.random() < .4) { setRegime(cap, 'partitocracia', null); cap.ruling = win; notify(`En ${cap.name} ${artP(p)} ${p.name} lleva ${cap.winStreak} elecciones seguidas ganando: los partidos se reparten los cargos y nace una partitocracia (más enchufes y más corrupción)`, { x:cap.fx * T, y:cap.fy * T }); return; }
  if (regimeOf(cap) === 'republica' && p.ideo < -.4 && share >= .6 && Math.random() < .35) { setRegime(cap, 'socialismo', null); cap.ruling = win; cap.voteRes = votes.map(x => Math.round(x / tot * 100)); notify(`Con ${Math.round(share * 100)} % de los votos, ${artP(p)} ${p.name} proclama la República Socialista de ${cap.name}`, { x:cap.fx * T, y:cap.fy * T }); }
  else if (regimeOf(cap) === 'socialismo' && p.ideo > .3 && share >= .5) { setRegime(cap, 'republica', null); cap.ruling = win; cap.voteRes = votes.map(x => Math.round(x / tot * 100)); notify(`${cap.name} deja el socialismo: gana ${artP(p)} ${p.name} y vuelve la república de siempre`, { x:cap.fx * T, y:cap.fy * T }); }
}
// Escisión: los partidarios del partido perdedor se marchan a fundar su propio pueblo
function secede(g, party){
  const goers = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && u !== g.leader && Math.abs((u.ideo || 0) - party.ideo) < .35).slice(0, Math.floor(popOf(g) * .4));
  if (goers.length < 6) return;
  for (let k = 0; k < 60; k++) {
    const a = Math.random() * Math.PI * 2, d = 35 + Math.random() * 25, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .8);
    if (x < 8 || y < 8 || x >= W - 8 || y >= H - 8 || !tileFree(x, y) || !freshNear(y * W + x, 10)) continue;
    const ng = makeVillage(x, y); if (!ng) continue;
    for (const u of goers) { releaseTask(u); u.vid = ng.id; u.home = null; if (u === g.leader) g.leader = null; }
    ng.faith = g.faith ? { ...g.faith, pantheon:[...(g.faith.pantheon || [])] } : null;
    ng.parties = [{ ...party }]; ng.ruling = 0; ng.food = Math.min(g.food * .3, 30); g.food -= ng.food; ng.wood = 10;
    relOf(g, ng).known = true; relOf(g, ng).v = -25; relOf(g, ng).reason = 'rencor';
    notify(`Los partidarios de ${artP(party)} ${party.name} se escinden de ${g.name} y fundan ${ng.name}`, { x:x * T, y:y * T });
    return;
  }
}
// ---- Regímenes: tribu, república, monarquía, dictadura, comunismo o fascismo; cada uno manda a su manera ----
const REGIMES = { oligarquia:'Oligarquía', tecnocracia:'Tecnocracia', anarquia:'Anarquía', democracia:'Democracia parlamentaria', partitocracia:'Partitocracia', monarquia_parlamentaria:'Monarquía parlamentaria', socialismo:'República socialista', teocracia:'Teocracia', tribu:'Consejo tribal', republica:'República', monarquia:'Monarquía', dictadura:'Dictadura militar', comunismo:'Estado comunista', fascismo:'Régimen fascista' };
const REGIME_A = { oligarquia:'una oligarquía', tecnocracia:'una tecnocracia', anarquia:'una anarquía', democracia:'una democracia parlamentaria', partitocracia:'una partitocracia', monarquia_parlamentaria:'una monarquía parlamentaria', socialismo:'una república socialista', teocracia:'una teocracia', tribu:'un consejo tribal', republica:'una república', monarquia:'una monarquía', dictadura:'una dictadura militar', comunismo:'un estado comunista', fascismo:'un régimen fascista' };
const REGIME_IDEO = { oligarquia:.55, tecnocracia:0, anarquia:-.6, teocracia:.45, comunismo:-.85, fascismo:.85, dictadura:.35, monarquia:.5 };
const REGIME_LAWS = { oligarquia:['impuestos_bajos', 'comercio', 'mercado_vivienda', 'orden'], tecnocracia:['educacion', 'sanidad', 'obras', 'bosques', 'reforma_lengua'], anarquia:['reparto', 'paz', 'fronteras_abiertas'], teocracia:['fe', 'censura', 'reparto', 'natalidad'], comunismo:['reparto', 'obras', 'ejercito', 'estatal', 'sanidad', 'educacion', 'jornada_larga', 'vivienda_publica'], fascismo:['ejercito', 'expansion', 'fe', 'censura', 'orden', 'natalidad', 'jornada_larga', 'segregacion', 'persecucion', 'fortificacion'], dictadura:['ejercito', 'obras', 'censura', 'orden', 'fortificacion'], monarquia:['fe', 'comercio', 'impuestos_bajos', 'mercado_vivienda'] };
const regimeOf = g => { const n = nationOf(g); return n.regime || (n.parties ? 'republica' : 'tribu'); };
const tyranny = g => ['dictadura', 'comunismo', 'fascismo', 'teocracia'].includes(regimeOf(g));
const votes = g => ['republica', 'socialismo', 'democracia', 'partitocracia', 'monarquia_parlamentaria'].includes(regimeOf(g)); // donde se vota
// Parlamentarios: muchos partidos y, si nadie llega a la mitad de los votos, gobiernos de coalición
const PARLIAMENT = ['democracia', 'partitocracia', 'monarquia_parlamentaria'];
const WONDER_OF = {}; // (cada régimen tiene ya su maravilla; aquí iría la de otro si a alguno le faltara)
const regimeName = g => { const n = nationOf(g), r = regimeOf(g); return r === 'monarquia' && n.empire ? 'Imperio' : REGIMES[r]; };
function leaderTitle(g){
  const f = g.leader && g.leader.sex === 'm';
  if (nationOf(g) !== g) return f ? 'gobernadora' : 'gobernador';
  if (regimeOf(g) === 'monarquia' && g.empire) return f ? 'emperatriz' : 'emperador';
  return { oligarquia:f ? 'jefa de las familias' : 'jefe de las familias', tecnocracia:f ? 'jefa de gobierno' : 'jefe de gobierno', anarquia:'portavoz de la asamblea', democracia:f ? 'primera ministra' : 'primer ministro', partitocracia:f ? 'presidenta del consejo' : 'presidente del consejo', monarquia_parlamentaria:f ? 'primera ministra' : 'primer ministro', socialismo:f ? 'presidenta' : 'presidente', teocracia:f ? 'suma sacerdotisa' : 'sumo sacerdote', tribu:f ? 'jefa' : 'jefe', republica:f ? 'presidenta' : 'presidente', monarquia:f ? 'reina' : 'rey', dictadura:f ? 'dictadora' : 'dictador', comunismo:f ? 'secretaria general' : 'secretario general', fascismo:f ? 'caudilla' : 'caudillo' }[regimeOf(g)];
}
const leaderRef = g => g.leader && !g.leader.dead ? `${g.leader.sex === 'm' ? 'la' : 'el'} ${leaderTitle(g)} ${g.leader.name}` : 'el gobierno';
const govIdeo = g => { const n = nationOf(g), r = n.ruling != null && n.parties ? n.parties[n.ruling].ideo : 0; return regimeOf(g) === 'socialismo' ? Math.min(r, -.3) : REGIME_IDEO[regimeOf(g)] ?? r; };
const ONE_PARTY = { comunismo:['Partido de los Trabajadores', 'Partido de la Estrella Roja', 'Partido del Pueblo Unido', 'Partido Comunal'], fascismo:['Movimiento del Orden Nuevo', 'Frente de la Espada de Hierro', 'Guardia de la Antorcha', 'Movimiento de la Sangre y el Suelo'] };
const capFirst = s => s[0].toUpperCase() + s.slice(1);
function setRegime(g, reg, chief){
  const prevReg = g.regime; if (prevReg && prevReg !== reg && popOf(g)) sendNews(g, `en ${g.name} hay nuevo régimen: ${REGIME_A[reg]}`);
  g.regime = reg; g.regimeT = yearT; g.voteRes = null; g.empire = false; if (chief) g.leader = chief;
  if (g.flag && prevReg && prevReg !== reg) { g.flag = makeFlag(g); g.flagUrl = flagDataUrl(g.flag); setTimeout(() => notify(`${g.name} estrena bandera con su nuevo régimen (${REGIMES[reg].toLowerCase()})`, { x:g.fx * T, y:g.fy * T }), 400); }
  if (reg === 'republica' || reg === 'socialismo' || PARLIAMENT.includes(reg)) { g.voteT = yearT; if (!g.parties || g.parties.length < 2) { g.parties = null; makeParties(g); } if (reg !== 'socialismo') { g.ruling = null; g.voteT = -1e9; } }
  g.coalition = null;
  if (PARLIAMENT.includes(reg)) moreParties(g);
  if (reg === 'anarquia') { g.leader = null; g.parties = null; g.ruling = null; } // nadie manda: asambleas
  if (reg === 'monarquia_parlamentaria' && g.leader && !g.leader.dead) g.monarch = g.leader; // el rey sigue, pero gobierna el parlamento
  if (reg === 'teocracia') g.ruling = null;
  if (ONE_PARTY[reg]) { const L = ONE_PARTY[reg]; g.parties = [{ name:L[Math.floor(Math.random() * L.length)], ideo:REGIME_IDEO[reg], laws:REGIME_LAWS[reg], col:reg === 'comunismo' ? '#d8483a' : '#3a3a3a' }]; g.ruling = 0; }
  // La maravilla del régimen anterior: si era culto al líder o a la corona, la derriban
  const o = g.wonder != null && world.objs[g.wonder];
  if (o && o.key !== 'wonder:' + reg && /monarquia|dictadura|comunismo|fascismo|teocracia|oligarquia/.test(o.key)) {
    const i = g.wonder, nm = OBJ[o.key][0]; world.objs[i] = null; g.wonder = null; addEffect((i % W) * T + 2, ((i / W) | 0) * T + 3, 'poof');
    composeRegion((i % W) - 10, ((i / W) | 0) - 16, (i % W) + 10, ((i / W) | 0) + 12);
    notify(`En ${g.name} derriban ${/^(Palacio|Arco|Monumento)/.test(nm) ? 'el' : 'la'} ${nm} del antiguo régimen`, { x:(i % W) * T, y:((i / W) | 0) * T });
  }
  const al = allianceOf(g); if (al) for (const id of al.members) { const m = villageById(id); if (m && m !== g && regimeClash(g, m)) { leaveAlliance(al, g, `su nuevo régimen choca con el de ${m.name}`); break; } }
}
// Sucesión cuando muere quien manda (fuera de la república, donde se vota)
function succession(g, people){
  if (regimeSuccession(g, people)) return; // oligarquía, tecnocracia y anarquía (regimenes.js)
  const old = g.leader, reg = regimeOf(g), adult = u => { const a = (yearT - u.born) / YEAR; return a >= ADULT_H && a < u.life * .9; };
  if (reg === 'monarquia') {
    const heir = people.filter(u => adult(u) && (u.parents || []).includes(old)).sort((a, b) => a.born - b.born)[0];
    const nu = heir || people.filter(adult).sort((a, b) => a.born - b.born)[0]; if (!nu) return;
    g.leader = nu;
    notify(heir ? `Muere ${old.sex === 'm' ? 'la reina' : 'el rey'} ${old.name} de ${g.name}; ${heir.sex === 'm' ? 'su hija' : 'su hijo'} ${heir.name} hereda la corona`
      : `${old.sex === 'm' ? 'La reina' : 'El rey'} ${old.name} muere sin herederos: ${nu.name} funda una nueva dinastía en ${g.name} y estrena bandera`, { x:nu.x, y:nu.y });
    if (!heir && g.flag) { g.flag = makeFlag(g); g.flagUrl = flagDataUrl(g.flag); }
  } else if (reg === 'teocracia') {
    const nu = people.filter(adult).sort((a, b) => (b.oficio === 'sacerdote') - (a.oficio === 'sacerdote') || pietyOf(b) - pietyOf(a))[0]; if (!nu) return;
    g.leader = nu; notify(`Muere ${old.name}; los sacerdotes de ${g.name} eligen a ${nu.name} como ${leaderTitle(g)}`, { x:nu.x, y:nu.y });
  } else if (Math.random() < .4) {
    g.leader = null; setRegime(g, 'republica', null);
    notify(`Tras la muerte de ${old.name}, ${g.name} vuelve a ser una república y convoca elecciones`, { x:g.fx * T, y:g.fy * T });
  } else {
    const nu = people.filter(u => adult(u) && u.weapon).sort((a, b) => Math.abs((a.ideo || 0) - govIdeo(g)) - Math.abs((b.ideo || 0) - govIdeo(g)))[0] || people.filter(adult)[0]; if (!nu) return;
    g.leader = nu; notify(`${nu.name} sucede a ${old.name} como ${leaderTitle(g)} de ${g.name}`, { x:nu.x, y:nu.y });
  }
}
// ---- Descontento, manifestaciones y golpes de estado ----
const SLOGANS = { pensiones:['¡Pensiones dignas!', '¡Nuestros mayores se lo han ganado!', '¡Respeto a los abuelos!'], profesores:['¡Más maestros!', '¡Nuestros hijos merecen aprender!', '¡Escuela digna!'], medicos:['¡Más médicos!', '¡La salud no espera!', '¡Nos morimos sin curanderos!'], bomberos:['¡Más bomberos!', '¡Que no ardan nuestras casas!', '¡Protección contra el fuego!'], idioma:['¡Nuestra lengua en la escuela!', '¡Respeto a nuestro idioma!', '¡Hablamos como queremos!'], presupuestos:['¡Presupuestos ya!', '¡Queremos saber en qué se gasta!', '¡Las cuentas claras!'], 'corrupción':['¡Ladrones!', '¡Devolved lo robado!', '¡Fuera los corruptos!'], vivienda:['¡Casas para todos!', '¡Alquileres justos!', '¡Ni gente sin casa ni casas sin gente!', '¡Stop desahucios!'], jornada:['¡Queremos descansar!', '¡Menos horas!', '¡Días libres!'], impuestos:['¡Menos impuestos!', '¡No más tributos!'], hambre:['¡Pan!', '¡Tenemos hambre!', '¡Comida para todos!'], 'inflación':['¡Precios justos!', '¡Nuestro dinero no vale nada!', '¡Salarios dignos!'],
  'tiranía':['¡Libertad!', '¡Abajo el tirano!', '¡Fuera!'], ideas:['¡Fuera el gobierno!', '¡Otro gobierno!', '¡No nos representan!'], guerra:['¡Paz!', '¡No a la guerra!'], bancarrota:['¡Devolved nuestros ahorros!', '¡Ladrones!'], salarios:['¡Sueldos dignos!', '¡No llegamos a fin de mes!', '¡Más salario!'], culto:['¡Libertad de culto!', '¡Dejadnos rezar!'], racismo:['¡No al racismo!', '¡Todos somos iguales!', '¡Derechos para todos!'], derechos:['¡Amar no es delito!', '¡Igualdad!', '¡Libres de amar!'] };
const GRIEF_TXT = { pensiones:'que los mayores no tengan pensión', idioma:'la política de idiomas', profesores:'la falta de maestros', medicos:'la falta de médicos', bomberos:'la falta de bomberos', presupuestos:'la falta de presupuestos', 'corrupción':'la corrupción', vivienda:'la falta de vivienda', jornada:'las jornadas interminables', impuestos:'los impuestos', hambre:'el hambre', 'inflación':'la subida de precios', 'tiranía':'la tiranía', ideas:'el gobierno', guerra:'la guerra', bancarrota:'la bancarrota', salarios:'los sueldos bajos', culto:'la persecución religiosa', racismo:'la segregación racial', derechos:'la persecución por amar' };
const atWarJ0 = g => [...rels.values()].some(r => r.war && [r.war.att, r.war.def].includes(nationOf(g).id));
const BUSY_POL = ['asalto', 'apagar', 'viaje', 'votar', 'golpe', 'protesta', 'reprimir', 'detenido', 'ritual'];
function politicsTick(g, dt, people){
  if (g.coin && (g.econT = (g.econT ?? 20) - dt) <= 0) { g.econT = 20; econTick(g, people); }
  const cap = nationOf(g), adults = people.filter(u => (yearT - u.born) / YEAR >= ADULT_H);
  if (adults.length < 4) return;
  const avg = adults.reduce((a, u) => a + (u.ideo || 0), 0) / adults.length, ec = g.coin ? ecOf(g) : null;
  const f = { hambre:g.food < popOf(g) * .5 ? .7 : 0, 'inflación':ec && ec.infl > .05 ? Math.min(1.5, ec.infl * 6) : 0,
    'tiranía':tyranny(g) ? .22 + (g.repressed || 0) * .02 : regimeOf(g) === 'monarquia' ? .06 : regimeOf(g) === 'monarquia_parlamentaria' ? .02 : regimeOf(g) === 'oligarquia' ? .12 : 0,
    ideas:cap.parties ? Math.max(0, Math.abs(avg - govIdeo(g)) - .5) * 1.1 : 0,
    guerra:[...rels.values()].some(r => r.war && r.war.def === g.id && r.war.dead > 2) ? .5 : 0,
    bancarrota:ec && yearT - (ec.bankruptT ?? -1e9) < DAY_LEN * 2 ? 1 : 0, jornada:(hasLaw(g, 'jornada_larga') ? .25 : 0) + (restDaysOf(g) === 0 ? .25 : 0) + (restDaysOf(g) === 1 && avg < -.35 ? .1 : 0), impuestos:(hasLaw(g, 'impuestos_altos') ? .12 : 0) + taxGrief(g), salarios:0, vivienda:housingGrief(g), presupuestos:budgetGrief(g), 'corrupción':corruptGrief(g) };
  { const ad = adults.length || 1, mins = adults.filter(u => isMinority(u, g)).length, gays = adults.filter(lgtb).length, left = adults.filter(u => (u.ideo || 0) < -.2).length / ad;
    if (hasLaw(g, 'segregacion') && (mins / ad > .12 || left > .4)) f.racismo = .25 + mins / ad;
    if (hasLaw(g, 'persecucion') && (gays >= 2 || left > .4)) f.derechos = .2 + gays / ad * 2;
    f.idioma = languageGrief(g, adults); // idiomas.js
    Object.assign(f, staffGrief(g, adults, people)); // faltan maestros, médicos o bomberos (trabajo.js)
    f.pensiones = pensionGrief(g, adults); // (cultura.js)
    const others = adults.filter(u => otherFaith(u, g)).length; if (hasLaw(g, 'persecucion_religiosa') && (others >= 2 || left > .45)) f.culto = .2 + others / ad * 1.5; }
  if (g.coin) { const ws = wageStats(g); if (ws.n >= 3 && (ws.avg < ws.cost || ws.low / ws.n > .4)) f.salarios = Math.min(.8, Math.max((1 - ws.avg / ws.cost) * 1.3, (ws.low / ws.n - .3) * 1.2)); } // no les llega el sueldo
  let up = -(.32 + (hasLaw(g, 'reparto') ? .12 : 0) + (cap.wonder != null && world.objs[cap.wonder] ? .1 : 0) + (hasLaw(g, 'censura') ? .1 : 0)), worst = null;
  for (const [k, d] of Object.entries(f)) { up += d; if (d > 0 && (!worst || d > f[worst])) worst = k; }
  if (regimeOf(g) === 'partitocracia') f['corrupción'] = Math.max(f['corrupción'] || 0, .18); // enchufes y cargos repartidos
  g.anger = clamp((g.anger || 0) + up * dt, 0, 100); if (worst) g.grief = worst;
  // Una república con escuelas, escritura y años de paz se vuelve democracia parlamentaria (más partidos y coaliciones)
  regimeTick(g, dt, people, adults); // oligarquía, tecnocracia, anarquía y la corona parlamentaria (regimenes.js)
  justiceTick(g, dt, people, adults); unionTick(g, dt, people, adults); pressTick(g, dt, people, adults); // justicia.js, sindicatos.js, prensa.js
  scienceTick(g, dt, people); spyTick(g, dt, people, adults); // ciencia.js, espionaje.js
  colonyTick(g, dt, people, adults); cultureTick(g, dt, people, adults); // colonias.js, cultura.js
  wealthTick(g, dt, people); huntTick(g, dt, people, adults); // riqueza.js, noticias.js (batidas)
  if ((g.goodsT = (g.goodsT || 0) - dt) <= 0) { g.goodsT = 20; goodsTick(g); } // mercancías (comercio.js)
  if (cap === g && regimeOf(g) === 'republica' && hasSchool(g) && (g.know || {}).escritura && popOf(g) >= 18 && yearT - (g.regimeT || 0) > YEAR && !atWarJ0(g) && Math.random() < dt * .0006) {
    setRegime(g, 'democracia', null); notify(`La república de ${g.name} se convierte en una democracia parlamentaria: más partidos, y si nadie gana por mayoría, gobiernos de coalición`, { x:g.fx * T, y:g.fy * T });
  }
  if (g.camp) campTick(g);
  if (g.protestN) for (const k in g.protestN) if (!(f[k] > 0)) delete g.protestN[k]; // ya no hay motivo: se olvida
  if (g.protest) { runProtest(g); return; }
  if (g.coup) { if (yearT > g.coup.until) resolveCoup(g); return; }
  if (g.anger > (hasLaw(g, 'orden') ? 50 : 35) && !afraid(g) && g.grief && !isNight() && g.plaza && !cap.election && yearT - (g.protestT ?? -1e9) > DAY_LEN * .5) { startProtest(g, adults); return; }
  if (cap === g && g.faith && ['republica', 'monarquia', 'tribu'].includes(regimeOf(g)) && (g.devotion || 0) > 8 && (g.wrath || 0) > 3 && !isNight() && Math.random() < .0004 * dt) {
    const priest = adults.filter(u => u.oficio === 'sacerdote').sort((a, b) => pietyOf(b) - pietyOf(a))[0] || adults.slice().sort((a, b) => pietyOf(b) - pietyOf(a))[0];
    if (priest) { const old = g.leader; setRegime(g, 'teocracia', priest); notify(`Los sacerdotes de ${g.name} toman el poder en nombre de ${g.faith.god}${old && old !== priest && !old.dead ? ` y apartan a ${old.name}` : ''}: ${priest.name} es ${leaderTitle(g)} de una teocracia`, { x:g.fx * T, y:g.fy * T }); return; }
  }
  if (cap === g && regimeOf(g) === 'monarquia' && !g.empire && villages.filter(o => o !== g && popOf(o) && o.nation === g.id).length >= 3) {
    g.empire = true; if (g.flag) { g.flag = makeFlag(g); g.flagUrl = flagDataUrl(g.flag); } notify(`¡${g.name} se proclama imperio (con bandera nueva)! ${g.leader && !g.leader.dead ? `${g.leader.name} es ahora ${leaderTitle(g)}` : ''}`, { x:g.fx * T, y:g.fy * T });
  }
  // Vida parlamentaria: el partido en el gobierno propone de vez en cuando una ley nueva y la gente la vota en la plaza
  if (cap === g && votes(g) && g.parties && g.ruling != null && !g.election && !isNight() && yearT - (g.lawT ?? yearT) > DAY_LEN * 1.5) { g.lawT = yearT; proposeLaw(g, adults); }
  g.lawT ??= yearT;
  // Golpe de estado: en la capital, con mucho descontento, con mucha represión acumulada o con militares hartos de un gobierno pacifista
  if (cap === g && regimeOf(g) !== 'tribu' && !isNight()) {
    const armed = adults.filter(u => u.weapon).length, mil = regimeOf(g) === 'republica' && hasLaw(g, 'paz') && armed >= 4 ? .0006 : 0;
    if (Math.random() < (Math.max(0, (g.anger - 60) / 2500) + mil + ((g.repressed || 0) > 5 ? .0008 : 0)) * dt) startCoup(g, adults);
  }
}
function lawLog(g, txt){ (g.lawHist ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, txt }); if (g.lawHist.length > 12) g.lawHist.shift(); }
// Una ley nueva: la propone el gobierno (cercana a sus ideas) y la vota la gente (cada uno, según lo cerca que le quede)
function proposeLaw(g, adults){
  const p = g.parties[g.ruling], cand = Object.keys(LAW_LEAN).filter(l => !p.laws.includes(l) && !LAW_CLASH.some(([a, b]) => (l === a && p.laws.includes(b)) || (l === b && p.laws.includes(a))));
  if (!cand.length || !adults.length) return;
  const w = cand.map(l => Math.exp(-((LAW_LEAN[l] - p.ideo) ** 2) / .2) + .02); let k = Math.random() * w.reduce((a, b) => a + b, 0), law = cand[0];
  for (let j = 0; j < cand.length; j++) if ((k -= w[j]) < 0) { law = cand[j]; break; }
  const yes = adults.filter(u => langVote(u, g, law) ?? Math.abs((u.ideo || 0) - LAW_LEAN[law]) < .5).length, pct = Math.round(yes / adults.length * 100), at = { x:g.fx * T, y:g.fy * T };
  if (pct >= 55) {
    const out = p.laws.length >= 4 ? p.laws[Math.floor(Math.random() * p.laws.length)] : null; if (out) p.laws = p.laws.filter(l => l !== out); p.laws.push(law);
    const txt = `En ${g.name} se aprueba la ley de «${LAW_TXT[law]}» con el ${pct} % de los votos${out ? `; se deroga la de «${LAW_TXT[out]}»` : ''}`; lawLog(g, txt); notify(txt, at);
  } else { const txt = `En ${g.name} el pueblo rechaza la ley de «${LAW_TXT[law]}» que proponía ${artP(p)} ${p.name} (solo un ${pct} % a favor)`; lawLog(g, txt); notify(txt, at); g.anger = Math.min(100, (g.anger || 0) + 3); }
}
function startProtest(g, adults){
  const gi = govIdeo(g), econ = ['pensiones', 'hambre', 'inflación', 'bancarrota', 'guerra', 'jornada', 'impuestos', 'vivienda', 'presupuestos', 'corrupción', 'profesores', 'medicos', 'bomberos'].includes(g.grief); g.protestT = yearT;
  let who = adults.filter(u => u !== g.leader && !u.away && !u.boat && !u.sleep && !(u.task && BUSY_POL.includes(u.task.k)) && (econ ? Math.random() < .6 : Math.abs((u.ideo || 0) - gi) > .3));
  if (g.grief === 'vivienda') who.sort((a, b) => (a.home == null ? 0 : 1) - (b.home == null ? 0 : 1)); // los que no tienen casa, delante
  if (g.grief === 'idioma') who = adults.filter(u => u !== g.leader && !u.away && !u.boat && !u.sleep && !(u.task && BUSY_POL.includes(u.task.k)) && langProtester(u, g));
  if (who.length < 3) return;
  who = who.slice(0, 14);
  const pn = g.protestN ||= {}; pn[g.grief] = (pn[g.grief] || 0) + 1;
  const r0 = g.plaza, pts = [[r0.x0, r0.y0], [r0.x1, r0.y0], [r0.x1, r0.y1], [r0.x0, r0.y1]].map(([x, y]) => [x * T + 2, y * T + 3]);
  const slog = SLOGANS[g.grief], col = ['#f2efe6', '#f0d060', '#f08a7a'][Math.floor(Math.random() * 3)];
  who.forEach((u, k) => { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'protesta', pts, idx:k % 4, until:yearT + 30, slogan:slog[k % slog.length], col }; u.lastD = Infinity; u.hitBy = null; });
  g.protest = { until:yearT + 30, who, said:false, grief:g.grief, riot:g.anger > 60 || pn[g.grief] >= 3, lynch:(g.grief === 'corrupción' && g.anger > 75) || (g.grief === 'presupuestos' && g.anger > 85 && (g.noBudgetDays || 0) >= 3) }; // furiosos con su líder: van a por él // muy enfadados, o hartos de protestar por lo mismo: disturbios
  if (g.grief === 'vivienda') startCamp(g, who);
  notify(`¡Manifestación en ${g.name}! ${who.length} personas salen con carteles contra ${GRIEF_TXT[g.grief]}: «${slog[0]}»`, { x:g.fx * T, y:g.fy * T });
}
function runProtest(g){
  const p = g.protest, live = p.who.filter(u => !u.dead && u.task && u.task.k === 'protesta');
  if (live.length && Math.random() < .6) { const u = live[Math.floor(Math.random() * live.length)]; floats.push({ x:u.x, y:u.y - 16, txt:u.task.slogan, col:'#f8f0d8', life:0 }); }
  if (p.riot && !p.said) riotTick(g, p, live);
  if (p.lynch && !p.said && yearT > p.until - 24 && live.length >= 3) { p.lynch = false; if (lynchLeader(g, live, p.grief)) { p.said = true; g.grief = null; } }
  if (!p.said && yearT > p.until - 20) { p.said = true; const rep = g.repressed || 0; respondProtest(g, live); if (g.camp && (g.repressed || 0) > rep) endCamp(g, 'desalojo'); }
  if (yearT > p.until || !live.length) { for (const u of p.who) if (u.task && u.task.k === 'protesta') u.task = null; g.protest = null; }
}
// Cartel sobre la plaza mientras hay manifestación o acampada (unos 12 px en pantalla a cualquier zoom), con el motivo y si hay disturbios
function drawProtestBanners(){
  const [x0, y0, x1, y1] = visibleRect(), fs = Math.max(3, 12 / zoom), now = performance.now();
  vctx.font = `bold ${fs}px system-ui, sans-serif`; vctx.textAlign = 'center'; vctx.textBaseline = 'middle';
  for (const g of villages) {
    if (!(g.protest || g.camp) || !g.plaza) continue;
    const r0 = g.plaza, x = (r0.x0 + r0.x1 + 1) / 2 * T, y = r0.y0 * T - 10 - fs;
    if (x < x0 - 80 || x > x1 + 80 || y < y0 - 40 || y > y1 + 60) continue;
    const p = g.protest, live = p ? p.who.filter(u => !u.dead && u.task && u.task.k === 'protesta').length : 0;
    const lines = [];
    if (p) lines.push([`✊ Manifestación contra ${GRIEF_TXT[g.grief] || 'el gobierno'} · ${live} personas`, '#f8f0d8']);
    if (p && p.fires) lines.push([`🔥 Disturbios: ${p.fires} incendio${p.fires > 1 ? 's' : ''}`, '#ffb060']);
    if (g.camp) lines.push([`⛺ Acampada en la plaza · ${Math.max(1, Math.ceil((g.camp.until - yearT) / DAY_LEN))} día${Math.ceil((g.camp.until - yearT) / DAY_LEN) > 1 ? 's' : ''} más como mucho`, '#d8e8f8']);
    const w = Math.max(...lines.map(([s0]) => vctx.measureText(s0).width)) + fs * 1.2, lh = fs * 1.35, h = lh * lines.length + fs * .5, top = y - h;
    const pulse = .75 + .25 * Math.sin(now / 260);
    vctx.fillStyle = 'rgba(20,14,10,.78)'; vctx.fillRect(x - w / 2, top, w, h);
    vctx.fillStyle = `rgba(216,72,58,${pulse})`; vctx.fillRect(x - w / 2, top, w, Math.max(.5, fs * .18)); // franja roja que late
    lines.forEach(([s0, col], k) => { vctx.fillStyle = col; vctx.fillText(s0, x, top + fs * .35 + lh * (k + .5)); });
    vctx.fillStyle = 'rgba(20,14,10,.78)'; vctx.fillRect(x - fs * .3, y, fs * .6, fs * .5); // piquito hacia la plaza
  }
  vctx.textBaseline = 'alphabetic'; vctx.textAlign = 'start';
}
// El gobierno responde: cede (república, tribu y a veces la monarquía) o reprime (dictaduras, a veces la monarquía)
function respondProtest(g, who){
  const reg = regimeOf(g), cap = nationOf(g), at = { x:g.fx * T, y:g.fy * T };
  const cops = villagers.filter(u => !u.dead && u.vid === g.id && u.weapon && !who.includes(u) && !u.away && !u.boat && !u.sleep && (yearT - u.born) / YEAR >= ADULT_H).slice(0, 5);
  const hard = (tyranny(g) || hasLaw(g, 'orden') || (reg === 'monarquia' && Math.random() < .5) || (hasLaw(g, 'ejercito') && Math.random() < .3)) && (cops.length || reg === 'comunismo');
  if (!hard && tyranny(g)) { // un régimen duro sin soldados a mano: no puede pararlos y se tambalea
    g.anger = Math.min(100, g.anger + 10);
    notify(`En ${g.name} no queda nadie para disolver la protesta: el régimen de ${cap.leader && !cap.leader.dead ? cap.leader.name : cap.name} se tambalea`, at);
    return;
  }
  if (!hard) {
    g.anger = Math.max(0, g.anger - 30); let what;
    if (g.grief === 'hambre' || g.grief === 'bancarrota') { what = 'reparten comida de los almacenes'; for (const u of who) u.food = Math.min(1, u.food + .4); g.food = Math.max(0, g.food - who.length * .5); }
    else if (g.grief === 'guerra') { what = 'prometen buscar la paz'; for (const r of rels.values()) if (r.war && (r.war.def === g.id || r.war.att === g.id) && Math.random() < .5) { const a = villageById(r.war.att), b = villageById(r.war.def); if (a && b) makePeace(a, b, r, 'tras las protestas'); } }
    else if (g.grief === 'inflación' && g.coin) { what = 'congelan los precios'; ecOf(g).infl *= .3; }
    else if ((g.grief === 'racismo' || g.grief === 'derechos' || g.grief === 'culto') && cap.parties && cap.ruling != null) { const law = g.grief === 'racismo' ? 'segregacion' : g.grief === 'culto' ? 'persecucion_religiosa' : 'persecucion', P = cap.parties[cap.ruling]; P.laws = P.laws.filter(l => l !== law); what = `derogan la ley de «${LAW_TXT[law]}»`; lawLog(g, `En ${g.name}, tras las protestas, se deroga la ley de «${LAW_TXT[law]}»`); }
    else if (g.grief === 'jornada' && restDaysOf(g) < 2 && !(g.restBonus > 0)) { g.restBonus = 1; what = `les dan un día libre más a la semana (ahora, ${restDaysOf(g)})`; }
    else if (cap === g && oligarchyConcede(g)) what = 'los ricos pierden el poder y se convocan elecciones: vuelve la democracia parlamentaria';
    else if (g.grief === 'corrupción' && regimeOf(g) === 'partitocracia' && cap === g) { setRegime(g, 'democracia', null); what = 'acaban con el reparto de cargos entre partidos: vuelve la democracia parlamentaria'; }
    else if (g.grief === 'corrupción' && g.scandal) { const L = budgetLeader(g); if (L) { const back = Math.min(L.money || 0, g.scandal.amt); L.money -= back; ecOf(g).treas += back; if (g.leader === L) g.leader = null; if (cap.leader === L) cap.leader = null; if (votes(g)) cap.voteT = -1e9; } what = `${g.scandal.who} devuelve lo que se llevó y deja el cargo`; g.scandal = null; }
    else if (g.grief === 'presupuestos' && g.budget) { g.budget.how = 'votados'; g.budget.d = Math.floor(yearT / DAY_LEN) + 1; g.noBudgetDays = 0; what = 'aprueban unos presupuestos de urgencia'; }
    else if (g.grief === 'vivienda' && cap.parties && cap.ruling != null && !hasLaw(g, 'vivienda_publica')) { const P = cap.parties[cap.ruling], law = hasLaw(g, 'tope_alquiler') || Math.random() < .5 ? 'vivienda_publica' : 'tope_alquiler'; P.laws = [...P.laws.filter(l => l !== 'mercado_vivienda'), law]; what = `aprueban la ley de «${LAW_TXT[law]}»`; lawLog(g, `En ${g.name}, tras las protestas, se aprueba la ley de «${LAW_TXT[law]}»`); }
    else if (g.grief === 'vivienda') { g.hDem = Math.max(.7, (g.hDem || 1) * .8); what = 'prometen más casas y bajan los precios de la vivienda'; }
    else if (g.grief === 'salarios' && g.coin) { g.wageUp = Math.min(2.5, (g.wageUp || 1) * 1.3); what = 'suben los sueldos un 30 %'; }
    else if (g.grief === 'idioma') what = langConcede(g);
    else if (g.grief === 'pensiones' && cap.parties && cap.ruling != null) { const P = cap.parties[cap.ruling]; if (!P.laws.includes('pensiones')) P.laws.push('pensiones'); what = 'aprueban las pensiones para los mayores'; }
    else if (['profesores', 'medicos', 'bomberos'].includes(g.grief)) what = staffConcede(g, g.grief) || 'prometen buscar a alguien';
    else if (votes(g) && cap.parties && !cap.election) { what = 'convocan elecciones anticipadas'; cap.voteT = -1e9; }
    else if (reg === 'monarquia' && ['tiranía', 'ideas'].includes(g.grief) && cap === g && Math.random() < .4) { setRegime(g, 'monarquia_parlamentaria', null); what = `${leaderRef(g)} acepta un parlamento elegido por el pueblo: nace una monarquía parlamentaria`; }
    else if (reg === 'monarquia') { what = `${leaderRef(cap)} reparte grano y promete reformas`; g.food = Math.max(0, g.food - who.length * .3); }
    else what = 'escuchan sus quejas y prometen cambios';
    notify(`En ${g.name} el gobierno cede ante los manifestantes: ${what}`, at);
    return;
  }
  g.repressed = (g.repressed || 0) + 1; g.anger = Math.max(0, g.anger - 25);
  politicalTrials(g, who); // en las dictaduras, algunos acaban ante el juez (justicia.js)
  if (reg === 'comunismo') { // la policía del partido detiene y confisca
    const n = Math.ceil(who.length / 2), hi = g.hall != null && world.objs[g.hall] ? g.hall : g.fy * W + g.fx, hx = (hi % W) * T + 2, hy = ((hi / W) | 0) * T + 3 + T * 2;
    who.slice(0, n).forEach((u, k) => { u.money = 0; u.task = { k:'detenido', x:hx + ((k % 5) - 2) * 4, y:hy + Math.floor(k / 5) * 4, until:yearT + 45 }; u.lastD = Infinity; u.ideo = clamp((u.ideo || 0) * .5 - .2, -1, 1); });
    notify(`En ${g.name} la policía del partido detiene a ${n} manifestantes y les confisca todo lo que tienen`, at);
  }
  if (cops.length) {
    for (const c of cops) { releaseTask(c); if (c.actT > 0) { c.actT = 0; c.onDone = null; } c.task = { k:'reprimir', target:null, until:yearT + 20 }; }
    notify(`En ${g.name} ${cops.length} soldado${cops.length > 1 ? 's' : ''} carga${cops.length > 1 ? 'n' : ''} contra los manifestantes por orden ${leaderRef(cap).startsWith('el ') ? 'del ' + leaderRef(cap).slice(3) : 'de ' + leaderRef(cap)}`, at);
  }
}
// Un soldado persigue a un manifestante y le golpea; los que reciben se dispersan, alguno muere
function runRepress(v, g, t, dt){
  let u = t.target;
  if (!u || u.dead || !u.task || u.task.k !== 'protesta') {
    t.target = u = g.protest ? g.protest.who.find(w => !w.dead && w.task && w.task.k === 'protesta' && (!w.hitBy || w.hitBy === v || w.hitBy.dead)) : null;
    if (!u || yearT > t.until) { v.task = null; return; }
    u.hitBy = v;
  }
  const d = Math.hypot(u.x - v.x, u.y - v.y); v.dir = u.x < v.x ? -1 : 1; v.dirT = .4;
  if (d > 5) { vGo(v, u.x, u.y, dt, true); return; }
  v.stab = .25; u.hp = (u.hp ?? 1) - .45; u.hurtT = .3; hurtFx(u, v.x, v.y, walkable);
  if (u.hp <= 0) { releaseTask(u); killVillager(u, 'represión'); notify(`${u.name} muere en la represión de la protesta de ${g.name}`, { x:u.x, y:u.y }); }
  else { u.task = null; u.ideo = clamp((u.ideo || 0) + (govIdeo(g) > 0 ? -.15 : .15), -1, 1); }
  t.target = null;
}
function startCoup(g, adults){
  const gi = govIdeo(g), armed = adults.filter(u => u.weapon && u !== g.leader), military = armed.length >= 3 && Math.random() < .7;
  let plot = (military ? armed : adults).filter(u => u !== g.leader && !u.away && !u.boat && Math.abs((u.ideo || 0) - gi) > .25);
  if (plot.length < 3) return;
  plot = plot.slice(0, 12);
  const pIdeo = plot.reduce((a, u) => a + (u.ideo || 0), 0) / plot.length, hall = g.hall != null && world.objs[g.hall] ? g.hall : g.fy * W + g.fx;
  const hx = (hall % W) * T + 2, hy = ((hall / W) | 0) * T + 3 + T * 2;
  plot.forEach((u, k) => { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.sleep = false; u.task = { k:'golpe', x:hx + ((k % 5) - 2) * 4, y:hy + Math.floor(k / 5) * 4, until:yearT + 18 }; u.lastD = Infinity; });
  g.coup = { until:yearT + 18, plot, military, pIdeo };
  notify(`¡${military ? 'Golpe de estado' : 'Revolución'} en ${g.name}! ${military ? 'Los militares rodean' : 'El pueblo rodea'} el ayuntamiento contra ${leaderRef(g)}`, { x:hx, y:hy });
}
function resolveCoup(g){
  const c = g.coup; g.coup = null;
  const plot = c.plot.filter(u => !u.dead && u.vid === g.id); for (const u of plot) if (u.task && u.task.k === 'golpe') u.task = null;
  const gi = govIdeo(g), loyal = villagers.filter(u => !u.dead && u.vid === g.id && !plot.includes(u) && (yearT - u.born) / YEAR >= ADULT_H && Math.abs((u.ideo || 0) - gi) < .3);
  const str = a => a.reduce((s, u) => s + (u.weapon ? 2 : .6), 0), at = { x:g.fx * T, y:g.fy * T };
  if (plot.length < 2 || str(plot) * (.7 + Math.random() * .7) < str(loyal.filter(u => u.weapon)) + loyal.length * .15 + 1) {
    const tried = coupTrial(g, plot); // justicia.js
    if (tried) { g.anger = Math.max(0, g.anger - 20); notify(`${c.military ? 'El golpe de estado' : 'La revolución'} en ${g.name} fracasa: ${tried} ${c.military ? 'golpistas' : 'revolucionarios'} irán a juicio`, at); return; }
    const n = Math.ceil(plot.length / 2); plot.slice(0, n).forEach(u => killVillager(u, 'ejecución'));
    g.anger = Math.max(0, g.anger - 20); g.repressed = (g.repressed || 0) + 2;
    notify(`${c.military ? 'El golpe de estado' : 'La revolución'} en ${g.name} fracasa: ${n} ${c.military ? 'golpistas' : 'revolucionarios'} son ejecutados`, at); return;
  }
  const wasRep = regimeOf(g) === 'republica', wasTyr = tyranny(g), L = g.leader && !g.leader.dead ? g.leader : null, title = L ? leaderRef(g) : '';
  let fate = '';
  if (L) {
    const dest = villages.filter(o => o !== g && popOf(o) && !sameNation(o, g));
    if (dest.length && Math.random() < .45) { const d = dest[Math.floor(Math.random() * dest.length)]; releaseTask(L); L.task = null; L.vid = d.id; L.home = null; fate = `${capFirst(title)} huye al exilio en ${d.name}`; }
    else { killVillager(L, c.military ? 'golpe de estado' : 'revolución'); fate = `${capFirst(title)} muere en el asalto`; }
  }
  const reg = c.pIdeo < -.35 ? (!c.military && c.pIdeo > -.65 ? 'socialismo' : 'comunismo') : c.pIdeo > .35 ? (c.military ? 'fascismo' : 'monarquia') : wasTyr && !c.military ? 'republica' : c.military ? 'dictadura' : 'republica';
  const chief = plot.slice().sort((a, b) => (b.weapon ? 1 : 0) - (a.weapon ? 1 : 0) || Math.abs(b.ideo || 0) - Math.abs(a.ideo || 0))[0];
  g.leader = null; setRegime(g, reg, reg === 'republica' || reg === 'socialismo' ? null : chief); g.anger = 15; g.repressed = 0;
  notify(`¡${c.military ? 'Triunfa el golpe de estado' : 'Triunfa la revolución'} en ${g.name}! ${fate ? fate + '; ' : ''}${reg === 'socialismo' ? 'se proclama una república socialista y habrá elecciones' : reg === 'republica' ? (wasRep ? 'habrá elecciones nuevas' : 'se proclama una república y habrá elecciones') : reg === 'monarquia' ? `${chief.name} se corona ${chief.sex === 'm' ? 'reina' : 'rey'}` : `${chief.name} instaura ${REGIME_A[reg]}`}`, at);
}
// ---- Dinero: cada pueblo su moneda; impuestos, gasto, banco, deuda, inflación y bancarrota ----
// Salario por un viaje de trabajo (según lo que trae, los precios y el salario mínimo) e impuesto que se lleva el gobierno
const wageOf = (g, n) => Math.max(1, Math.round(n / 3 * priceOf(g) * (hasLaw(g, 'salario_minimo') ? 1.5 : 1) * (regimeOf(g) === 'comunismo' ? .7 : 1) * (g.wageUp || 1)));
// Lo que cuesta vivir un día (comer lo de cada día y algo más) y lo que gana cada uno al día
const costOfLiving = g => Math.max(2, Math.round(priceOf(g) * 4.5)); // comida, casa, ropa y lo demás de un día
const UNPAID = new Set(['refugio', 'bolsa', 'ocio', 'pasear', 'comer', 'beber', 'dormir', 'ver_teatro', 'ver_coliseo', 'ir_taberna', 'jugar', 'volver', 'espectador', 'votar', 'protesta', 'golpe', 'detenido', 'ritual']);
function payWage(v, g, n){
  if (!g || !g.coin || ageOf(v) < ADULT_H) return;
  const pay = Math.max(1, Math.round(wageOf(g, n) * (hasLaw(g, 'segregacion') && isMinority(v, g) ? .6 : 1) * (1 + Math.min(.4, (v.edu || 0) * .4)))), /* con estudios, más */ d = Math.floor(yearT / DAY_LEN);
  if (v.payDay !== d) { if (v.payDay != null) v.wage = v.wage == null ? v.dayPay || 0 : Math.round(v.wage * .5 + (v.dayPay || 0) * .5); v.payDay = d; v.dayPay = 0; }
  v.dayPay += pay; v.money = (v.money || 0) + pay; v.earned = (v.earned || 0) + pay; v.lastPay = pay;
}
const wageDay = v => { const g = villageById(v.vid), w = v.wage ?? v.dayPay ?? 0; return Math.round(w * (1 - (g && g.coin ? taxRateOf(g) : 0))); }; // sueldo neto de un día (tras impuestos; el de ayer, suavizado)
function wageStats(g){
  const ws = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H && v.wage != null).map(wageDay);
  const avg = ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : 0, cost = costOfLiving(g);
  return { avg:Math.round(avg), cost, n:ws.length, low:ws.filter(w => w < cost).length };
}
const taxRateOf = g => { const reg = regimeOf(g); return clamp((hasLaw(g, 'ejercito') || hasLaw(g, 'expansion') ? .12 : .07) + (reg === 'comunismo' ? .25 : reg === 'socialismo' ? .12 : 0) + (reg === 'monarquia' ? .04 : 0) + (hasLaw(g, 'impuestos_altos') ? .08 : 0) - (hasLaw(g, 'impuestos_bajos') ? .04 : 0) + taxRateExtra(g), .02, .5); };
const ecOf = g => g.coin ? (g.ec ||= { P:1, infl:0, treas:10, debt:0, dep:0, hist:[1] }) : null;
const priceOf = g => g.coin ? Math.max(1, Math.round(ecOf(g).P)) : 1;
const hasBank = g => g.bank != null && !!world.objs[g.bank];
function econTick(g, people){
  coinTick(g); // ¿pasan a una moneda mejor? (monedas.js)
  payPensions(g, people); // los mayores jubilados cobran del tesoro (cultura.js)
  const ec = ecOf(g), pop = Math.max(1, people.length), reg = regimeOf(g), bank = hasBank(g);
  const taxR = taxRateOf(g);
  marketTick(); // la bolsa mundial, una vez al día (bolsa.js)
  housingTick(g, people); // la vivienda: compraventa, alquileres e hipotecas
  taxDay(g, people, ec); // los impuestos de cada día, y si crean o quitan alguno (impuestos.js)
  let tax = 0; for (const v of people) { const t0 = Math.floor((v.money || 0) * taxR); v.money = (v.money || 0) - t0; tax += t0; }
  if (bank) for (const v of people) if ((v.money || 0) > 10 * ec.P) { const d = Math.floor(v.money * .3); v.money -= d; ec.dep += d; }
  const atWar = [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id));
  const extra = (reg === 'teocracia' ? .15 : 0) + (hasLaw(g, 'sanidad') ? .2 : 0) + (hasLaw(g, 'educacion') ? .15 : 0) + (hasLaw(g, 'obras') ? .25 : 0) + (hasLaw(g, 'ejercito') ? .3 : 0) + (hasLaw(g, 'reparto') ? .15 : 0) + (hasLaw(g, 'vivienda_publica') ? .2 : 0) + (atWar ? .6 : 0) + (reg === 'monarquia' ? .15 : 0) + (reg === 'fascismo' ? .2 : 0);
  const spend = budgetTick(g, ec, people, (tax * (.9 + extra) + pop * ec.P * .05 * extra) * austerity(g)); // (con recortes, menos: rescate.js) // repartido en partidas (presupuestos.js)
  ec.treas += tax - spend; ec.lastTax = tax; ec.lastSpend = spend;
  let printed = 0;
  if (ec.treas < 0) {
    const need = -ec.treas, limit = bank ? ec.dep * 1.5 + 40 * ec.P : 0;
    if (bank && ec.debt + need <= limit) { ec.debt += need; ec.treas = 0; }      // el banco presta al gobierno
    else if (allyLoan(g, need)) ec.treas = 0;                                      // o los bancos de los aliados
    else { printed = need; ec.treas = 0; }                                          // o se imprime moneda
  }
  if (ec.treas > spend * 2 && ec.debt > 0) { const p = Math.min(ec.debt, ec.treas - spend * 2); ec.debt -= p; ec.treas -= p; }
  ec.debt *= 1.02; ec.dep *= 1.01;
  // Precios: el dinero impreso y la escasez los suben; la abundancia y el comercio los bajan
  const goods = g.food + (g.wood + g.stone) * .5 + ((g.trades || 0) - (ec.lastTrades || 0)) * 2; ec.lastTrades = g.trades || 0;
  const M = people.reduce((a, v) => a + (v.money || 0), 0) + ec.treas + ec.dep + 30 * ec.P;
  const pressure = sanctionPressure(g) + (hasLaw(g, 'salario_minimo') ? .012 : 0) + printed / M * .8 + (g.food < pop * .5 ? .05 : 0) - (goods > pop * 3 ? .025 : 0) + (Math.random() - .5) * .05 - (reg === 'comunismo' ? .01 : 0) - Math.log(ec.P) * .04;
  ec.infl = ec.infl * .5 + pressure * coinInfl(g); ec.P = Math.max(.2, ec.P * (1 + ec.infl)); // el oro aguanta, los billetes se disparan (monedas.js)
  ec.hist.push(1 / ec.P); if (ec.hist.length > 40) ec.hist.shift();
  const at = { x:g.fx * T, y:g.fy * T };
  econRescue(g, ec, people, bank); // antes de la bancarrota, el gobierno intenta arreglarlo (rescate.js)
  // Bancarrota: deuda impagable o precios desbocados
  ec.hyper = ec.infl > .3 ? (ec.hyper || 0) + 1 : 0;
  if ((bank && ec.debt > (ec.dep * 1.5 + 40 * ec.P) * 1.25) || ec.hyper >= 3) { ec.hyper = 0; bankrupt(g, ec, people, bank); return; }
  if (yearT - (ec.msgT ?? -1e9) > DAY_LEN * .8) {
    if (ec.infl > .2) { ec.msgT = yearT; notify(`¡Hiperinflación en ${g.name}! Los precios suben un ${Math.round(ec.infl * 100)} % y el ${g.coin} ya casi no vale nada`, at); }
    else if (ec.infl > .1) { ec.msgT = yearT; notify(`El ${g.coin} de ${g.name} baja: los precios suben un ${Math.round(ec.infl * 100)} %`, at); }
    else if (ec.infl < -.08) { ec.msgT = yearT; notify(`El ${g.coin} de ${g.name} sube: los precios bajan un ${Math.round(-ec.infl * 100)} %`, at); }
  }
}
function bankrupt(g, ec, people, bank){
  const lost = Math.round(ec.dep); ec.bankruptT = yearT; ec.dep = 0; ec.debt = 0; ec.P *= 1.8; ec.infl = .15;
  for (const v of people) v.money = Math.floor((v.money || 0) * .5);
  g.anger = Math.min(100, (g.anger || 0) + 35);
  notify(bank ? `¡Bancarrota en ${g.name}! El banco quiebra, la gente pierde ${lost} ${coinPl(g)} de ahorros y el ${g.coin} se hunde` : `¡Bancarrota en ${g.name}! El gobierno no puede pagar y el ${g.coin} se hunde`, { x:g.fx * T, y:g.fy * T });
  const al = allianceOf(g);
  if (ec.P > 12 && !(al && al.coin === g.coin)) { // los precios ya no tienen sentido: moneda nueva
    const old = g.coin, k = ec.P; newCoin(g); for (const v of people) v.money = Math.round((v.money || 0) / k); ec.P = 1; ec.hist = [1]; ec.infl = 0;
    notify(`En ${g.name} retiran el ${old} y crean una moneda nueva: el ${g.coin}`, { x:g.fx * T, y:g.fy * T });
  }
}
// ---- Alianzas entre naciones: defensa mutua, moneda común y bancos que se prestan entre ellos ----
let alliances = [], moneyFlows = [];
const ALLY_A = ['Pacto', 'Liga', 'Alianza', 'Tratado', 'Unión', 'Coalición', 'Concordia', 'Organización del Pacto'];
const ALLY_B = ['del Norte', 'del Sur', 'de los Ríos', 'de las Hogueras', 'del Mar Interior', 'de las Colinas', 'de los Tres Soles', 'de la Llanura', 'del Alba', 'de las Islas', 'de Hierro', 'de los Puertos', 'del Gran Lago'];
const artA = al => /^(Pacto|Tratado)/.test(al.name) ? 'el' : 'la';
const allianceOf = g => g ? alliances.find(a => !a.dead && a.members.includes(nationOf(g).id)) : null;
const regimeClash = (x, y) => { const p = [regimeOf(x), regimeOf(y)]; return (p.includes('comunismo') && (p.includes('fascismo') || p.includes('monarquia') || p.includes('teocracia'))) || (p.includes('socialismo') && p.includes('fascismo')); };
function leaveAlliance(al, g, why){
  al.members = al.members.filter(id => id !== nationOf(g).id);
  notify(`${g.name} abandona ${artA(al)} ${al.name} (${why})`, { x:g.fx * T, y:g.fy * T });
}
function allyCheck(a, b, r){
  if (nationOf(a) !== a || nationOf(b) !== b) return; // solo entre naciones (sus capitales)
  const A = allianceOf(a), B2 = allianceOf(b);
  if (A && A === B2) {
    if (r.v < -5 || r.war || regimeClash(a, b)) { const g = popOf(a) < popOf(b) ? a : b; leaveAlliance(A, g, regimeClash(a, b) ? 'regímenes enemigos' : `se ha enemistado con ${g === a ? b.name : a.name}`); }
    else r.v = Math.min(100, r.v + .8);
    return;
  }
  if (r.war || r.v < 50 || regimeClash(a, b) || a.hall == null || b.hall == null) { r.allyN = 0; return; }
  if ((r.allyN = (r.allyN || 0) + 1) < 3) return;
  const at = { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T };
  if (!A && !B2) {
    let name; do name = `${ALLY_A[Math.floor(Math.random() * ALLY_A.length)]} ${ALLY_B[Math.floor(Math.random() * ALLY_B.length)]}`; while (alliances.some(o => o.name === name));
    const abbr = name.split(' ').filter(w => /^[A-ZÁÉÍÓÚ]/.test(w)).map(w => w[0]).join('');
    const al = { id:alliances.length + 1, name, abbr, members:[a.id, b.id], coin:null, born:yearT }; alliances.push(al);
    notify(`${a.name} y ${b.name} firman ${artA(al)} ${name} (${abbr}): si atacan a uno, responderán los dos`, at);
  } else {
    const al = A || B2, nu = A ? b : a;
    if (al.members.every(id => { const m = villageById(id); return m && !regimeClash(m, nu) && relOf(nu, m).v > 15 && !relOf(nu, m).war; })) {
      al.members.push(nu.id); notify(`${nu.name} entra en ${artA(al)} ${al.name} (${al.abbr})`, at);
    }
  }
}
// Si atacan a un miembro, los demás entran en la guerra
function callAllies(att, def){
  const al = allianceOf(def); if (!al || allianceOf(att) === al) return;
  for (const id of al.members) {
    const m = villageById(id); if (!m || m === nationOf(def) || !popOf(m) || sameNation(m, att)) continue;
    const r = relOf(m, att); if (r.war) continue;
    r.known = true; r.v = Math.min(r.v, -60); r.reason = 'alianza'; r.war = { att:m.id, def:att.id, reason:'alianza', start:yearT, raidT:yearT - 40, dead:0 };
    notify(`${m.name} entra en la guerra contra ${att.name} para defender a ${def.name} (${al.abbr})`, { x:m.fx * T, y:m.fy * T });
  }
}
function moneyFlow(a, b, txt){
  const p = g => { const i = hasBank(g) ? g.bank : g.hall != null ? g.hall : g.fy * W + g.fx; return [(i % W) * T + 2, ((i / W) | 0) * T - 8]; };
  const [x0, y0] = p(a), [x1, y1] = p(b); moneyFlows.push({ x0, y0, x1, y1, t0:performance.now(), txt });
}
// Préstamo de un aliado con la misma moneda: el banco más rico de la alianza cubre lo que falta
function allyLoan(g, need){
  const al = allianceOf(g); if (!al || !al.coin || g.coin !== al.coin) return false;
  const lender = al.members.map(villageById).filter(m => m && m !== nationOf(g) && m.coin === al.coin && hasBank(m) && ecOf(m).dep > need * 2).sort((x, y) => ecOf(y).dep - ecOf(x).dep)[0];
  if (!lender) return false;
  ecOf(lender).dep -= need; ecOf(g).debt += need; moneyFlow(lender, g, `préstamo de ${Math.round(need)} ${g.coin}`);
  if (yearT - (al.msgT ?? -1e9) > DAY_LEN * .4) { al.msgT = yearT; notify(`El banco de ${lender.name} presta ${Math.round(need)} ${coinPl(g)} a ${g.name} (${al.abbr})`, { x:g.fx * T, y:g.fy * T }); }
  return true;
}
function allianceTick(){
  for (const al of alliances) {
    if (al.dead) continue;
    al.members = al.members.filter(id => { const m = villageById(id); return m && popOf(m) && nationOf(m) === m; });
    if (al.members.length < 2) { al.dead = true; const m = villageById(al.members[0]); notify(`${capFirst(artA(al))} ${al.name} se disuelve`, m ? { x:m.fx * T, y:m.fy * T } : undefined); continue; }
    const ms = al.members.map(villageById), coined = ms.filter(m => m.coin);
    // Moneda común: cuando al menos dos tienen la suya, la cambian por una de todos
    if (!al.coin && coined.length >= 2 && yearT - al.born > DAY_LEN * .4) {
      al.coin = coinNameFor(coined[0]); const olds = coined.map(m => `al ${m.coin} de ${m.name}`), best = coined.map(coinType).sort((a, b) => COIN_TYPES[b].rank - COIN_TYPES[a].rank)[0], P = coined.reduce((s, m) => s + ecOf(m).P, 0) / coined.length;
      for (const m of coined) { const k = P / ecOf(m).P; for (const v of villagers) if (!v.dead && v.vid === m.id) v.money = Math.round((v.money || 0) * k); m.coin = al.coin; m.coinType = best; ecOf(m).P = P; }
      notify(`${capFirst(artA(al))} ${al.name} (${al.abbr}) adopta una moneda común, el ${al.coin}, que sustituye ${olds.join(' y ')}`, { x:ms[0].fx * T, y:ms[0].fy * T });
    }
    if (al.coin) {
      for (const m of coined) if (m.coin !== al.coin) { m.coin = al.coin; m.coinType = coinType(ms.find(o => o.coin === al.coin && o !== m) || m); notify(`${m.name} adopta el ${al.coin}, la moneda de ${al.abbr}`, { x:m.fx * T, y:m.fy * T }); }
      const ecs = coined.map(ecOf), P = ecs.reduce((s, e) => s + e.P, 0) / ecs.length, inf = ecs.reduce((s, e) => s + e.infl, 0) / ecs.length;
      for (const e of ecs) { e.P = P; e.infl = inf; } // una misma moneda: los precios y la inflación se contagian
      // Flujo bancario: el miembro más rico invierte en el más endeudado
      if (coined.length >= 2 && Math.random() < .25) {
        const rich = coined.slice().sort((x, y) => ecOf(y).treas - ecOf(x).treas)[0], poor = coined.slice().sort((x, y) => (ecOf(y).debt - ecOf(y).treas) - (ecOf(x).debt - ecOf(x).treas))[0];
        if (rich !== poor && ecOf(rich).treas > 20 * P) {
          const amt = Math.round(ecOf(rich).treas * .3), pe = ecOf(poor), pay = Math.min(pe.debt, amt); ecOf(rich).treas -= amt; pe.debt -= pay; pe.treas += amt - pay; moneyFlow(rich, poor, `ayuda de ${amt} ${rich.coin}`);
          if (yearT - (al.msgT ?? -1e9) > DAY_LEN * .4) { al.msgT = yearT; notify(`Flujo bancario en ${al.abbr}: ${rich.name} transfiere ${amt} ${coinPl(rich)} a ${poor.name}`, { x:poor.fx * T, y:poor.fy * T }); }
        }
      }
    }
  }
  alliances = alliances.filter(a => !a.dead);
}
// Monedas que viajan de un banco a otro, en arco
function drawMoneyFlows(now){
  if (!moneyFlows.length) return;
  for (const f of moneyFlows) {
    const k = (now - f.t0) / 6000; if (k > 1) continue;
    for (let j = 0; j < 6; j++) {
      const q = (k * 3 + j / 6) % 1, x = Math.round(f.x0 + (f.x1 - f.x0) * q), y = Math.round(f.y0 + (f.y1 - f.y0) * q - Math.sin(q * Math.PI) * 30);
      const r = Math.max(1, 2.5 / zoom * 1.4); vctx.fillStyle = '#8a6a18'; vctx.beginPath(); vctx.arc(x, y, r + .6, 0, Math.PI * 2); vctx.fill();
      vctx.fillStyle = '#f0c840'; vctx.beginPath(); vctx.arc(x, y, r, 0, Math.PI * 2); vctx.fill(); vctx.fillStyle = '#fff4b0'; vctx.fillRect(x - r * .5, y - r * .5, r * .5, r * .5); // monedas redondas con brillo
    }
    if (f.txt && k < .9) { const mx = (f.x0 + f.x1) / 2, my = (f.y0 + f.y1) / 2 - 34, s = 2 / zoom; vctx.font = `bold ${6 * s}px sans-serif`; vctx.textAlign = 'center'; vctx.fillStyle = 'rgba(17,21,26,.8)'; const w = vctx.measureText(f.txt).width + 4 * s; vctx.fillRect(mx - w / 2, my - 6 * s, w, 8 * s); vctx.fillStyle = '#f8e080'; vctx.fillText(f.txt, mx, my); vctx.textAlign = 'start'; } // qué es: préstamo, rescate, venta
  }
  moneyFlows = moneyFlows.filter(f => now - f.t0 < 6000);
}
// ---- Maravillas: cada régimen levanta la suya ----
const WONDER_TXT = { democracia:'el Ágora de la Democracia, donde todos los partidos debaten', partitocracia:'el Palacio de los Partidos, donde se reparten los cargos', monarquia_parlamentaria:'el Palacio de las Cortes, corona y parlamento bajo un mismo techo', oligarquia:'la Mansión de las Familias, con su cámara del tesoro', tecnocracia:'el Gran Observatorio, biblioteca de los sabios', anarquia:'el Círculo de la Asamblea, donde todo se decide entre todos', socialismo:'la Casa del Pueblo, donde se reparten el trabajo y el pan', teocracia:'el Gran Templo, morada de su dios en la tierra', republica:'el Foro de la República, donde el pueblo debate sus leyes', monarquia:'el Palacio Real, para mayor gloria de la corona', dictadura:'una estatua gigante del líder, para que nadie olvide quién manda',
  comunismo:'el Monumento al Trabajo, en honor a los trabajadores', fascismo:'el Arco del Triunfo, para celebrar la grandeza de la nación' };
// ---- En la ficha del pueblo ----
function govCard(g){
  const n = nationOf(g), reg = regimeOf(g), a = Math.round(g.anger || 0);
  return `${regimeName(g)}${n !== g ? ` (de ${n.name})` : ''} · ${leaderTitle(n)}: <b>${n.leader && !n.leader.dead ? n.leader.name : 'nadie'}</b>
    <br>Descontento: <span style="display:inline-block;width:60px;height:6px;background:#3a3028;vertical-align:1px"><span style="display:block;height:6px;width:${a * .6}px;background:${a > 60 ? '#d8483a' : a > 35 ? '#e8a838' : '#7ab04a'}"></span></span> ${a} %${g.grief && a > 10 ? ` (por ${GRIEF_TXT[g.grief]})` : ''}
    ${g.protest ? '<br><b>¡Manifestación en curso!</b>' : ''}${g.coup ? '<br><b>¡Golpe de estado en curso!</b>' : ''}${g.repressed ? `<br>${g.repressed} protesta${g.repressed > 1 ? 's' : ''} reprimida${g.repressed > 1 ? 's' : ''}` : ''}
    ${n.wonder != null && world.objs[n.wonder] ? `<br>Maravilla: ${OBJ[world.objs[n.wonder].key][0]}` : ''}`;
}
function econCard(g){
  if (!g.coin) return `<div class="tiles">${tile('Economía', g.market != null ? 'Trueque' : 'Sin mercado', `${g.trades || 0} intercambios`)}${tile('Almacén', Math.floor(g.food), `comida · ${g.wood} madera · ${g.stone} piedra`)}</div><div class="muted" style="margin-top:8px">Cuando comercien lo bastante en el mercado inventarán su propia moneda.</div>`;
  const ec = ecOf(g), al = allianceOf(g), h = ec.hist, mx = Math.max(...h), mn = Math.min(...h), up = ec.infl > .08, down = ec.infl < -.05;
  const pts = h.map((v, k) => [(k / Math.max(1, h.length - 1) * 160).toFixed(1), (28 - (v - mn) / Math.max(1e-6, mx - mn) * 25).toFixed(1)]);
  const line = pts.map(q => q.join(',')).join(' '), area = `0,30 ${line} 160,30`;
  const fx = villages.filter(o => o !== g && o.coin && o.coin !== g.coin && popOf(o) && rels.get(relKey(g, o)) && rels.get(relKey(g, o)).known).slice(0, 4);
  return `<div class="tiles">${tile('Moneda', esc(g.coin), `${coinTypeTxt(g)} · ${al && al.coin === g.coin ? `común de ${esc(al.abbr)}` : 'propia'}`)}
      ${tile('Precios', `<span style="color:${up ? '#f08a7a' : down ? '#a8d088' : 'inherit'}">${ec.infl >= 0 ? '+' : ''}${Math.round(ec.infl * 100)} %</span>`, up ? 'suben: inflación' : down ? 'bajan' : 'estables')}
      ${tile('Tesoro', Math.round(ec.treas), `deuda: ${Math.round(ec.debt)}`)}${tile('Banco', hasBank(g) ? Math.round(ec.dep) : '—', hasBank(g) ? 'en ahorros de la gente' : 'aún no tienen')}</div>
    <h4>Valor del ${esc(g.coin)}</h4><svg class="spark" viewBox="0 0 160 30" preserveAspectRatio="none"><polygon points="${area}" fill="rgba(240,200,64,.15)"/><polyline fill="none" stroke="#f0c840" stroke-width="1.2" vector-effect="non-scaling-stroke" points="${line}"/></svg>
    ${ec.bankruptT != null ? `<div class="alert">Bancarrota el día ${Math.floor(ec.bankruptT / DAY_LEN) + 1}</div>` : ''}
    <h4>Salarios e impuestos</h4><div class="sec">${(ws => `<div class="kv"><span>Sueldo medio al día</span><b>${ws.n ? `${ws.avg} ${coinPl(g)}` : '—'}${ws.n && ws.avg < ws.cost ? ' <span style="color:#f08a7a">(no llega para vivir)</span>' : ''}</b></div><div class="kv"><span>Coste de la vida al día</span><b>${ws.cost} ${coinPl(g)}${ws.low ? ` · <span style="color:#f08a7a">${ws.low} de ${ws.n} no llegan</span>` : ''}</b></div>${(g.wageUp || 1) > 1 ? `<div class="kv"><span>Subidas de sueldo</span><b>+${Math.round(((g.wageUp || 1) - 1) * 100)} % por las protestas</b></div>` : ''}`)(wageStats(g))}<div class="kv"><span>Salario por un viaje de trabajo</span><b>${wageOf(g, 6)} ${coinPl(g)}${hasLaw(g, 'salario_minimo') ? ' <span class="muted">(salario mínimo)</span>' : ''}</b></div>
      <div class="kv"><span>Recaudado / gastado (último cobro)</span><b>${Math.round(ec.lastTax || 0)} / ${Math.round(ec.lastSpend || 0)}</b></div></div>
    <div class="sec"><div class="kv"><span>Una comida cuesta</span><b>${priceOf(g)} ${priceOf(g) > 1 ? coinPl(g) : g.coin}</b></div>
      <div class="kv"><span>Tratos en el mercado</span><b>${g.trades || 0}</b></div>
      <div class="kv"><span>Dinero en manos de la gente</span><b>${villagers.filter(v => !v.dead && v.vid === g.id).reduce((a, v) => a + (v.money || 0), 0)}</b></div></div>
    ${taxCard(g)}
    ${budgetCard(g)}
    ${marketCard(g)}
    ${housingCard(g)}
    ${fx.length ? `<h4>Cambio de moneda</h4><div class="sec">${fx.map(o => `<div class="kv"><span>1 ${esc(g.coin)} =</span><b>${(ecOf(o).P / ec.P).toFixed(2)} ${coinPl(o)} <span class="muted">(${esc(o.name)})</span></b></div>`).join('')}</div>` : ''}`;
}
function allyCard(g){
  const al = allianceOf(g); if (!al) return '';
  return `<h4>Alianza</h4><div><b>${al.name} (${al.abbr})</b>: ${al.members.map(id => villageById(id)).filter(Boolean).map(m => m.name).join(', ')}${al.coin ? ` · moneda común: el ${al.coin}` : ''} · defensa mutua</div>`;
}
// ---- Lucha contra lobos y osos: lanzas (cuerpo a cuerpo) y arcos (a distancia) ----
let arrows = [];
const beastHP = a => a.sp === 'oso' ? 2.2 : a.sp === 'lobo' ? 1 : .8;
const nearFire = v => { const g = villageById(v.vid); return g && Math.hypot(v.x - (g.fx * T + 2), v.y - (g.fy * T + 3)) < 28; };
function biteVillager(v, a){
  v.hp -= (a.sp === 'oso' ? .45 : .25) * guardOf(v, false); v.hurtT = .3; v.foe = a; hurtFx(v, a.x, a.y, walkable);
  const g = villageById(v.vid); if (g) g.danger = 60;
  if (v.hp <= 0) {
    notify(`${v.name} ha muerto atacado por ${a.sp === 'oso' ? 'un oso' : 'los lobos'}`, { x:v.x, y:v.y });
    releaseTask(v); killVillager(v, a.sp === 'oso' ? 'oso' : 'lobos'); a.preyV = null; a.eatT = 4; a.food = 1;
  }
}
function hitAnimal(a, dmg, v){
  if (a.dead) return;
  a.hp = (a.hp ?? beastHP(a)) - dmg; hurtFx(a, v.x, v.y, aFree);
  if (a.hp <= 0) {
    killAnimal(a, 'aldeanos'); v.foe = null;
    if (!v.carry) v.carry = { k:'comida', t:'carne', n:a.sp === 'oso' ? 8 : 3 };
    const g = villageById(v.vid); if (g) notify(`En ${g.name} han abatido a ${a.sp === 'oso' ? 'un oso' : 'un lobo'}`, { x:a.x, y:a.y });
  } else if (a.hp < beastHP(a) * .45) { a.fleeT = 8; a.fleeFrom = [v.x, v.y]; a.preyV = null; a.prey = null; } // malherido: huye
  else if (villagers.includes(v)) a.preyV = v; // se revuelve contra quien le ha herido
  else { a.fleeT = 5; a.fleeFrom = [v.x, v.y]; a.preyV = null; } // flecha desde la torre: se espanta
}
// ¿Hay una fiera de la que defenderse? Los que van armados también salen a proteger a los suyos y al ganado
function threatFor(v, g){
  const armed = v.weapon && (yearT - v.born) / YEAR >= ADULT_H;
  let best = null, bd = Infinity;
  for (const a of animals) {
    if (a.dead || a.dom || (a.sp !== 'lobo' && a.sp !== 'oso') || a.fleeT > 0) continue;
    const d = Math.hypot(a.x - v.x, a.y - v.y); if (d > 70) continue;
    const onMe = a.preyV === v, onUs = (a.preyV && a.preyV.vid === g.id) || (a.prey && a.prey.dom === g.id);
    if ((onMe || (armed && onUs && d < 60)) && d < bd) { bd = d; best = a; }
  }
  return best;
}
// Devuelve true si este turno lo ha pasado luchando o huyendo
function fightOrFlee(v, g, dt){
  const a = v.foe, d = Math.hypot(a.x - v.x, a.y - v.y), child = (yearT - v.born) / YEAR < ADULT_H;
  if (v.actT > 0) { v.actT = 0; v.onDone = null; }
  releaseTask(v); v.task = null; v.wait = 0;
  if (!v.weapon || child) { // sin arma: corre a la hoguera
    const [fx, fy] = fireXY(g); vGo(v, ...fireSpot(v, g), dt, true); return true;
  }
  v.dir = a.x < v.x ? -1 : 1; v.dirT = .5; v.atkT -= dt;
  if (isRanged(v.weapon)) {
    if (d > 45) vGo(v, a.x, a.y, dt, true);
    else if (d < 10) vGo(v, v.x + (v.x - a.x) * 2, v.y + (v.y - a.y) * 2, dt, true); // se aparta para poder tirar
    else if (v.atkT <= 0) { v.atkT = 1.6; arrows.push({ x0:v.x, y0:v.y - 5, a, v, t:0, dur:Math.max(.15, d / 130), hit:Math.random() < .7 }); }
  } else {
    if (d > 5) vGo(v, a.x, a.y, dt, true);
    else if (v.atkT <= 0) { v.atkT = 1; v.stab = .25; hitAnimal(a, v.weapon === 'espada' ? .5 : .4, v); }
  }
  return true;
}
function updateArrows(dt){
  for (const r of arrows) { r.t += dt; if (r.t >= r.dur && !r.done) { r.done = true; if (!r.vis && r.hit && !r.a.dead && !r.v.dead) hitAnimal(r.a, .35, r.v); } } // las de las batallas solo se ven (el daño ya está hecho)
  if (arrows.length) arrows = arrows.filter(r => r.t < r.dur + .4);
}
function drawArrows(){
  for (const r of arrows) {
    const k = Math.min(1, r.t / r.dur), tx = r.a.x + (r.hit ? 0 : 6), ty = r.a.y - 2 + (r.hit ? 0 : 4);
    const x = r.x0 + (tx - r.x0) * k, y = r.y0 + (ty - r.y0) * k - Math.sin(k * Math.PI) * 4;
    if (r.done && r.hit) continue; // clavada: ya no se ve
    const ang = Math.atan2(ty - r.y0, tx - r.x0), cx = Math.cos(ang), cy = Math.sin(ang);
    vctx.fillStyle = r.bolt ? '#6a5a48' : '#d8c8a0'; for (let q = 0; q < (r.bolt ? 3 : 4); q++) vctx.fillRect(Math.round(x - cx * q), Math.round(y - cy * q), 1, 1);
    vctx.fillStyle = '#e8e8e8'; vctx.fillRect(Math.round(x + cx), Math.round(y + cy), 1, 1);
  }
}
// Comer del almacén: cada uno busca equilibrar lo que ha comido últimamente (v.ate: parte de carne) con su dieta.
// Los vegetarianos y los carnívoros solo comen lo otro si pasan hambre de verdad. Lo que comen les va cambiando
// los gustos: quien vive a base de vegetales acaba vegetariano, y al revés. dry = solo mirar si puede.
function eatFrom(v, g, amount, dry){
  if (g.food < 1) return false;
  g.meat = clamp(g.meat || 0, 0, g.food);
  const meat = g.meat >= 1, veg = g.food - g.meat >= 1, starving = v.food < .15;
  let eatMeat = meat && (v.ate < v.diet || !veg);
  if (v.diet < .2 && eatMeat && !starving) return false;
  if (v.diet > .8 && !eatMeat && !starving) { if (meat) eatMeat = true; else return false; }
  if (dry) return true;
  g.food -= 1; if (eatMeat) g.meat -= 1;
  v.ate = v.ate * .8 + (eatMeat ? .2 : 0);
  v.diet = clamp(v.diet + (v.ate - v.diet) * .06, 0, 1);
  v.food = amount;
  return true;
}
const canEat = (v, g) => eatFrom(v, g, 0, true) || (v.carry && v.carry.k === 'comida');
const dietName = v => v.diet < .2 ? 'vegetariano' : v.diet > .8 ? 'carnívoro' : 'omnívoro';
function deposit(v, g){
  if (!v.carry) return;
  if (v.carry.k === 'comida') { g.food += v.carry.n; if (v.carry.t === 'carne') g.meat = (g.meat || 0) + v.carry.n; if (v.carry.hide) g.hides = (g.hides || 0) + 1; } else if (v.carry.k === 'madera') g.wood += v.carry.n;
  else if (v.carry.k === 'hierro') g.iron = (g.iron || 0) + v.carry.n;
  else if (v.carry.k === 'oro') { g.gold = (g.gold || 0) + v.carry.n; if (g.coin) { const ec = ecOf(g); ec.treas += v.carry.n * 6 * ec.P; ec.infl -= .01 * v.carry.n; } } // el oro respalda la moneda
  else if (v.carry.k === 'gemas') g.gems = (g.gems || 0) + v.carry.n;
  else g.stone += v.carry.n;
  payWage(v, g, v.carry.n); // el trabajo se paga (más cuanto más suben los precios)
  v.carry = null; clampStore(g);
}
// ---- Necesidades y muerte ----
function warmthAt(v, g){
  if (g && g.noFirewood) return 0; // sin leña, ni la hoguera ni las casas calientan (estaciones.js)
  if (g && !g.fireOut && Math.hypot(v.x / T - g.fx, v.y / T - g.fy) < 6) return WARMTH;
  const tx = Math.floor(v.x / T), ty = Math.floor(v.y / T);
  for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) { const o = world.objs[(ty + dy) * W + tx + dx]; if (o && o.key && (o.key.startsWith('house') || (o.vid != null && isBuilding(o)))) return WARMTH; } // casas y edificios del pueblo (taberna, ayuntamiento...)
  return 0;
}
function killVillager(v, cause){
  if (v.dead) return;
  v.dead = cause; v.onDone = null; dismount(v);
  { const gc = villageById(v.vid), c = gc && gc.cemetery; if (c && c.slots.length && v.born !== undefined) {
    let i = c.slots.find(j => !c.graves.has(j));
    if (i == null) { let old = Infinity; for (const [j, gr] of c.graves) if (gr.t < old) { old = gr.t; i = j; } }
    c.graves.set(i, { name:v.name, cause, d:Math.floor(yearT / DAY_LEN) + 1, t:yearT, cross:gc.faith ? Math.random() < .5 : false, age:Math.floor((yearT - v.born) / YEAR) });
  } }
  for (const u of [...(v.parents || []), ...(v.kids || []), ...(v.partners || [])]) if (u && !u.dead) u.mourn = { t:yearT, who:v.name };
  { const g = villageById(v.vid); if (g) { (g.deaths ||= {})[cause] = (g.deaths[cause] || 0) + 1; if (cause !== 'vejez') (g.log ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, txt:`Murió ${v.name} (${cause})` }); } }
  misfortune(villageById(v.vid), cause);
  if (v.boat) { const g = villageById(v.vid); if (g) g.boatOut = false; }
  const s = personSprite(v, 0, v.dir < 0); s.ax ??= s.width >> 1;
  addCorpse(s, v.x, v.y, false);
  if (follow === v) setFollow(null);
}
function updateVillagers(dt){
  if (!world) return;
  updateArrows(dt);
  updateTravelers(dt);
  // (rendimiento) quién está asaltando, una vez por paso: así cada aldeano no repasa a todos los demás
  let anyWar = false; for (const r of rels.values()) if (r.war) { anyWar = true; break; }
  const assaulters = anyWar ? villagers.filter(u => !u.dead && !u.away && u.task && u.task.k === 'asalto') : [];
  for (const v of villagers) {
    v.moving = false;
    if (v.dead) continue;
    if (v.away) continue; // de viaje (caravana o diplomático)
    if (!isFinite(v.x) || !isFinite(v.y)) { const g0 = villageById(v.vid); window.__nanLog = (window.__nanLog || []).concat([v.task && (v.task.job || v.task.k)]).slice(-20); v.x = g0 ? g0.fx * T + 2 : PW / 2; v.y = g0 ? g0.fy * T + 6 : PH / 2; v.task = null; v.route = null; } // por si alguna cuenta sale mal
    if (v.appear < .25) { v.appear += dt; continue; }
    if (v.born === undefined) lifeFields(v, Math.floor(v.x / T), Math.floor(v.y / T), 3 + Math.random() * 6, Math.random);
    // La corriente del río arrastra a quien nada en él (más fuerte en los rápidos)
    const ri = Math.floor(v.y / T) * W + Math.floor(v.x / T);
    if (world.biome[ri] === B.RIVER && !v.boat && !bridgeSet.has(ri)) {
      const f = world.flow[ri], drift = (1.2 + world.slope[ri] / 255 * 1.6) * dt * (v.task ? .3 : 1);
      const nx = v.x + (Math.floor(f / 3) - 1) * drift, ny = v.y + (f % 3 - 1) * drift;
      if (walkable(nx, ny)) { v.x = nx; v.y = ny; }
    }
    // Quien no sabe nadar y cae al agua (una riada, un tsunami, la corriente) se ahoga si no sale enseguida
    if (v.swims === false && !v.boat && inWater(v.x, v.y)) {
      if (yearT - (v.offBoat ?? -1e9) < 15) { landAt(v, v.x, v.y); v.offBoat = -1e9; } // recién bajado de la barca: a tierra, no al agua
      v.drownT = (v.drownT || 0) + dt;
      if (v.drownT > 4) { notify(`${v.name} no sabía nadar y se ha ahogado`, { x:v.x, y:v.y }); releaseTask(v); killVillager(v, 'ahogado'); continue; }
    } else v.drownT = 0;
    // Necesidades: comer, beber, abrigo; si fallan mucho tiempo, muere
    const age = (yearT - v.born) / YEAR, child = age < ADULT_H;
    let g = villageById(v.vid);
    if (age > v.life * (hasHosp(g) ? 1.12 : 1)) { killVillager(v, 'vejez'); continue; }
    const nut = Math.abs((v.ate ?? .5) - (v.diet ?? .5)); v.mal = nut > .3; const tHere = tempAt(ri); // (la temperatura de su casilla, una sola vez)
    v.food = Math.max(0, v.food - dt * (v.mal ? 1.4 : nut < .15 ? .9 : 1) * (v.sleep ? .5 : 1) / (child ? 190 : 160)); v.water = Math.max(0, v.water - dt * (v.sleep ? .5 : 1) * (tHere > 28 ? 1.3 : 1) / (child ? 130 : 120));
    if (v.food <= 0) { v.starve += dt; if (v.starve > 25) { killVillager(v, 'hambre'); continue; } } else v.starve = 0;
    if (v.water <= 0) { v.thirst += dt; if (v.thirst > 20) { killVillager(v, 'sed'); continue; } } else v.thirst = 0;
    // El abrigo (hoguera, casa) solo calienta cuando hace frío, hasta unos 18 °C; con calor, la casa da algo de sombra
    const out = tHere, shelter = warmthAt(v, g) > 0, shade = out > 24 && inForest(v), temp = shelter ? (out < 18 ? Math.min(18, out + WARMTH) : out - 8) : shade ? out - 5 : out; // la casa (gruesa) y la sombra refrescan // los árboles también dan sombra
    const cold = H_COLD + v.ad + (child ? 4 : 0), hot = H_HEAT + v.ad;
    v.chill = temp < cold ? v.chill + dt * (cold - temp) / (120 * (1 + (v.fit || 0) * .4)) : Math.max(0, v.chill - dt * .1);
    v.hot = temp > hot ? v.hot + dt * (temp - hot) / (90 * (1 + (v.fit || 0) * .4)) : Math.max(0, v.hot - dt * .1);
    if (v.chill >= 1) { killVillager(v, 'frío'); continue; }
    // Quien se está helando deja lo que hace y corre a una casa o edificio caliente (lluvia.js)
    if (g && v.chill > .4 && !shelter && !v.boat && !(v.task && ['refugio', 'asalto'].includes(v.task.k))) { const p = shelterTarget(v, g, true); if (p) { releaseTask(v); v.task = p; v.lastD = Infinity; } }
    if (v.hot >= 1) { killVillager(v, 'calor'); continue; }
    if (g && v.hot > .4 && v.task && !['beber', 'asalto', 'trabajando'].includes(v.task.k) && !v.boat) { const p = drinkSpot(v, g); if (p) { releaseTask(v); v.task = { k:'beber', ...p }; v.lastD = Infinity; } } // acalorados: a beber y refrescarse
    // Sin aldea: se une a la más cercana o funda una nueva donde está
    if (!g) {
      const tx = Math.floor(v.x / T), ty = Math.floor(v.y / T);
      let best = null, bd = 40;
      for (const h of villages) { const d = Math.hypot(h.fx - tx, h.fy - ty); if (d < bd && world.objs[h.fx + h.fy * W]) { bd = d; best = h; } }
      g = best || makeVillage(tx, ty); if (!g) { v.wait = 1; continue; }
      v.vid = g.id;
    }
    // Si el hambre aprieta de verdad y no llega a la hoguera, tira de las provisiones de la aldea
    if (v.food < (hasLaw(g, 'reparto') ? .16 : .08)) eatFrom(v, g, .8); // con reparto, antes se tira de las provisiones
    v.hp = Math.min(1, (v.hp ?? 1) + dt * .008 * (hasLaw(g, 'sanidad') ? 3 : 1) * (hasHosp(g) ? 2 : 1) * (v.sick ? 0 : 1)); // enfermo no se repone if (v.hurtT > 0) v.hurtT -= dt; if (v.stab > 0) v.stab -= dt;
    // Defensa: con un lobo o un oso encima, quien tiene arma le planta cara; los demás corren a la hoguera
    if (v.boat) { if (!v.task || v.task.k !== 'barca') { v.boat = false; g.boatOut = false; if (g.port) landAt(v, (g.port.end % W) * T + 2, ((g.port.end / W) | 0) * T + 3); } }
    if (!(v.scanA > 0)) { v.scanA = .4; v.foe = v.boat ? null : threatFor(v, g); } else v.scanA -= dt;
    if (v.foe && (v.foe.dead || v.foe.fleeT > 0)) v.foe = null;
    if (v.foe && v.sleep) { v.sleep = false; v.task = null; } // una fiera los despierta
    // Guerra: el soldado va al pueblo enemigo y lucha con quien le salga; si no hay nadie, saquea y se vuelve.
    // Los del pueblo atacado: los armados plantan cara, los demás corren a refugiarse
    if (anyWar && !(v.scanW > 0)) {
      v.scanW = .4; v.enemy = null;
      let bd = v.task && v.task.k === 'asalto' ? 45 : 35;
      const focus = knowsT(g, 'foco'); let bs = Infinity;
      for (const u of (v.task && v.task.k === 'asalto' ? villagers : assaulters)) { if (u.dead || u.away || u === v || !enemyOf(v, u)) continue; if (!(u.task && u.task.k === 'asalto') && !(v.task && v.task.k === 'asalto')) continue; const d = Math.hypot(u.x - v.x, u.y - v.y); if (d >= bd) continue; const sc = focus ? d - (1 - (u.hp ?? 1)) * 40 : d; if (sc < bs) { bs = sc; v.enemy = u; } }
    } else v.scanW -= dt;
    if (v.task && v.task.k === 'asalto' && (v.hp ?? 1) < .35 && knowsT(g, 'retirada')) { v.task = { k:'volver' }; v.enemy = null; v.retreatT = 10; floats.push({ x:v.x, y:v.y - 14, txt:'¡retirada!', col:'#f0c8a0', life:0 }); }
    if (v.retreatT > 0) { v.retreatT -= dt; v.enemy = null; }
    if (v.enemy && !v.enemy.dead) {
      if (v.sleep) v.sleep = false;
      const armed = v.weapon && !child;
      if (armed || (v.task && v.task.k === 'asalto')) { if (fightPerson(v, v.enemy, dt)) continue; }
      else { if (v.actT > 0) { v.actT = 0; v.onDone = null; } releaseTask(v); v.task = null; vGo(v, ...fireSpot(v, g), dt, true); continue; }
    }
    if (g.alarm && yearT < g.alarm.until && v.weapon && !child && !v.enemy && !v.boat && (!v.task || !['asalto', 'volver', 'beber', 'comer', 'guardia'].includes(v.task.k))) {
      const ps = g.alarm.posts, k = villagers.filter(u => u.vid === g.id && u.weapon).indexOf(v), p = ps[(k < 0 ? 0 : k) % ps.length];
      if (p && (!p[3] || isRanged(v.weapon) || ps.every(q => q[3]))) { if (v.actT > 0) { v.actT = 0; v.onDone = null; } releaseTask(v); v.sleep = false; v.task = { k:'guardia', x:p[0] + (k % 3 - 1) * 3, y:p[1], hide:p[2], until:g.alarm.until }; v.lastD = Infinity; }
    }
    if (v.navalHome && (!v.task || v.task.k === 'volver')) { // soldado desembarcado: a la orilla y de vuelta en barca
      const hg = villageById(v.navalHome), L = v.landing;
      if (!hg || !hg.port || !L) v.navalHome = null;
      else if (vGo(v, L[0], L[1], dt, true)) { const h = [(hg.port.launch % W) * T + 2, ((hg.port.launch / W) | 0) * T + 3], wn = nb4i(pxTile(L)).find(n => openWater(n)), route = wn != null && waterRoute(wn, hg.port.launch); v.navalHome = null;
        if (route) { const path = route.slice(), f = path.shift() || h; v.away = true; v.task = { k:'viaje' }; travelers.push({ kind:'regreso', v, from:hg.id, to:hg.id, x:L[0], y:L[1], tx:f[0], ty:f[1], path, hx:h[0], hy:h[1], sea:true, phase:'ida', dir:1 }); } else v.task = { k:'volver' }; }
      continue;
    }
    if (v.task && v.task.k === 'asalto' && (v.water < .3 || v.food < .22)) v.task = null; // la sed y el hambre pueden más que la guerra
    if (v.task && v.task.k === 'asalto') {
      const eg = villageById(v.task.enemy), r = eg && rels.get(relKey(eg, g));
      const G = v.task.grp;
      // De noche y aún lejos del enemigo: campamento improvisado (tiendas de pieles si las tienen) y al amanecer, en marcha
      if (G && G.camp && (!isNight() || !eg || !r || !r.war)) { G.camp.done = true; G.camp = null; G.campedT = yearT; }
      if (G && !G.field && eg && r && r.war && isNight() && !knowsT(g, 'noche') && yearT - (G.campedT ?? -1e9) > DAY_LEN * .3 && Math.hypot(v.x / T - eg.fx, v.y / T - eg.fy) > 18 && (G.camp || Math.hypot(v.x / T - g.fx, v.y / T - g.fy) > 15)) { // (cerca de casa, no: siguen)
        const alive = G.ps.filter(u => !u.dead && u.task && u.task.k === 'asalto');
        if (!G.camp && alive.length) {
          const cx = alive.reduce((a, u) => a + u.x, 0) / alive.length, cy = alive.reduce((a, u) => a + u.y, 0) / alive.length;
          const p = ringFind(Math.round(cx / T), Math.round(cy / T), 8, (x, y) => tileFree(x, y) && !WATER[world.biome[y * W + x]] && !pathMap.has(y * W + x) && !farmMap.has(y * W + x) && !villages.some(o => underBuilding(o, x, y)));
          if (p) {
            const hide = (g.hides || 0) >= 2, nT = Math.min(4, Math.ceil(alive.length / 2));
            if (hide) g.hides -= Math.min(g.hides, nT); // las pieles, para las tiendas (se gastan)
            G.camp = { x:p[0] * T + 2, y:p[1] * T + 3, tents:nT, hide, vid:g.id, seed:Math.random() * 100 }; warCamps.push(G.camp);
            if (!r.war.campMsg || yearT - r.war.campMsg > DAY_LEN) { r.war.campMsg = yearT; notify(`Se hace de noche: las tropas de ${g.name} acampan de camino a ${eg.name}${hide ? ' en tiendas de pieles' : ''}`, { x:G.camp.x, y:G.camp.y }); }
          }
        }
        if (G.camp) { const k = G.ps.indexOf(v), a = k / Math.max(1, G.ps.length) * Math.PI * 2; if (vGo(v, G.camp.x + Math.cos(a) * 9, G.camp.y + Math.sin(a) * 6 + 2, dt)) { v.moving = false; v.dir = G.camp.x < v.x ? -1 : 1; } continue; }
      }
      if (eg && r && r.war && G && !G.go) {
        const alive = G.ps.filter(u => !u.dead && u.task && u.task.k === 'asalto');
        if (yearT > G.until || alive.every(u => Math.hypot(u.x - G.rx, u.y - G.ry) < 20)) { G.go = true; if (alive.length > 1) notify(`Las tropas de ${g.name} se han reunido: atacan ${eg.name} todas a la vez`, { x:G.rx, y:G.ry }); }
        else { vGo(v, G.rx + (G.ps.indexOf(v) % 3 - 1) * 5, G.ry + Math.floor(G.ps.indexOf(v) / 3) * 4, dt); continue; }
      }
      if (!eg || !r || !r.war) { v.task = { k:'volver' }; }
      else if (Math.hypot(v.x / T - eg.fx, v.y / T - eg.fy) < 6) { // en el corazón del pueblo enemigo y nadie lo defiende: saqueo
        const take = Math.min(eg.food, 6); eg.food -= take; v.carry = { k:'comida', t:'veg', n:Math.floor(take) };
        const wood = buildingsOf(eg).filter(b => world.objs[b] && wooden(world.objs[b]) && !world.objs[b].burnt);
        if (wood.length && Math.random() < .5) { const b = wood[Math.floor(Math.random() * wood.length)]; fires.set(b, { t:0, life:10, tree:true, bld:true }); }
        r.war.loots = (r.war.loots || 0) + 1; if (v.task.grp) v.task.grp.loot = true; milOf(g).xp += 1; milLearn(g);
        // Conquista: sin nadie armado que les defienda, o muy pocos, o tras varios saqueos, el pueblo pasa a ser suyo
        const defArmed = villagers.filter(u => !u.dead && u.vid === eg.id && u.weapon).length;
        if (popOf(eg) > 0 && (defArmed === 0 || popOf(eg) <= 4 || r.war.loots >= 3) && (hasLaw(g, 'expansion') || Math.random() < .5)) { conquer(nationOf(g), eg, r); v.task = { k:'volver' }; continue; }
        if (!r.war.lootMsgT || yearT - r.war.lootMsgT > 40) { r.war.lootMsgT = yearT; notify(`Los de ${g.name} saquean ${eg.name}`, { x:v.x, y:v.y }); misfortune(eg, 'guerra'); }
        v.task = { k:'volver' };
      } else {
        // En formación mientras están lejos: el de cabeza marca el paso y los demás van en su sitio
        if (G && G.go && G.form && Math.hypot(v.x / T - eg.fx, v.y / T - eg.fy) > 16) {
          const alive = G.ps.filter(u => !u.dead && u.task && u.task.k === 'asalto'), lead = alive[0], k = alive.indexOf(v);
          if (lead && lead !== v && k > 0) { const dx = eg.fx * T - lead.x, dy = eg.fy * T - lead.y, dl = Math.hypot(dx, dy) || 1, fx = dx / dl, fy = dy / dl, [back, side] = formSlot(G.form, k); vGo(v, lead.x - fx * back * 7 - fy * side * 7, lead.y - fy * back * 7 + fx * side * 7, dt); continue; }
          if (lead === v) { vGo(v, v.task.x, v.task.y, dt * .7); continue; }
        }
        vGo(v, v.task.x, v.task.y, dt); continue;
      }
    }
    // Miedo al fuego: si arde algo a su lado, huyen (los que van a apagarlo, no)
    if (fires.size && !(v.task && v.task.k === 'apagar')) {
      const tx0 = Math.floor(v.x / T), ty0 = Math.floor(v.y / T);
      let fx0 = null; for (let dy = -2; dy <= 2 && fx0 == null; dy++) for (let dx = -2; dx <= 2; dx++) if (fires.has((ty0 + dy) * W + tx0 + dx) && !fires.get((ty0 + dy) * W + tx0 + dx).ctrl) { fx0 = [tx0 + dx, ty0 + dy]; break; }
      if (fx0) {
        if (v.sleep) v.sleep = false;
        if (v.actT > 0) { v.actT = 0; v.onDone = null; }
        releaseTask(v); v.task = null;
        vGo(v, v.x + (v.x - (fx0[0] * T + 2)) * 4, v.y + (v.y - (fx0[1] * T + 3)) * 4, dt, true);
        const g0 = villageById(v.vid); if (g0 && !(g0.know || {}).bomberos && wellsOf(g0).length && Math.random() < dt * .05) { g0.know.bomberos = true; notify(`En ${g0.name}, después de pasar miedo con el fuego, aprenden a apagarlo con cubos de agua`, { x:v.x, y:v.y }); }
        continue;
      }
    }
    if (v.foe && fightOrFlee(v, g, dt)) continue;
    if (!child && !v.oficio) v.oficio = pickOficio(g);
    // Durmiendo: hasta que se hace de día (o les despierta el hambre o la sed)
    if (v.sleep) { if (!isNight() || v.food < .1 || v.water < .12) { v.sleep = false; v.task = null; v.wait = Math.random() * .8; } else { v.moving = false; continue; } }
    // Al caer la noche dejan lo que no sea urgente (lo que llevan encima, lo dejan antes) y se van a dormir
    if (isNight() && !v.boat && !(v.actT > 0) && (!v.task || !['dormir', 'volver', 'beber', 'comer', 'trabajando', 'alumbrar', 'encender', 'ritual', 'asalto', 'viaje', 'votar', 'protesta', 'golpe', 'reprimir', 'detenido', 'guardia', 'atleta', 'espectador', 'jugar'].includes(v.task.k)) && v.food > .2 && v.water > .25) {
      releaseTask(v); if (v.carry) v.task = { k:'volver' };
      else {
        // Antes de acostarse, si quedan antorchas apagadas, uno las va encendiendo
        const al = !child && !busyWith(g, 'alumbrar') && torchesOf(g).some(tc => !tc.lit && !raining(tc.i)) ? setupTask(v, g, 'alumbrar') : null;
        if (al) { v.task = al; v.lastD = Infinity; }
        else { const h = homeOf(v, g), [sx, sy] = h != null ? [(h % W) * T + 2, ((h / W) | 0) * T + 3 + T] : campSpot(v, g) || fireSpot(v, g); v.task = { k:'dormir', x:sx, y:sy, h }; v.lastD = Infinity; }
      }
    }
    if (v.actT > 0) { v.actT -= dt; v.walk = 0; if (v.actT <= 0) { const had = v.carry, tk0 = v.task; if (v.onDone) v.onDone(); v.onDone = null; if (tk0 && !v.carry && !UNPAID.has(tk0.k)) payWage(v, g, 3); /* obras, oficios y servicios también se pagan */ if (v.carry && v.carry !== had) { if (v.cart) v.carry.n = Math.round(v.carry.n * 2.5); gainText(v); } if (v.task === tk0) v.task = v.carry ? { k:'volver' } : null; } continue; } // (si al acabar se ha puesto otra tarea, se respeta)
    if (v.wait > 0) { v.wait -= dt; continue; }
    if (!v.task && v.carry) v.task = { k:'volver' }; // lo que lleva encima, primero a casa
    if (!v.task) {
      const [fx, fy] = fireXY(g);
      if (v.water < .5) { const p = drinkSpot(v, g); v.task = p ? { k:'beber', ...p } : null; }
      else if (v.food < .5 && canEat(v, g)) v.task = { k:'comer', ...eatSpot(v, g) };
      else if (child) { v.task = kidTask(v, g); if (!v.task) { const p = siteNear(g, 1, 4, (x, y) => tileFree(x, y)); v.task = p ? { k:'pasear', x:p[0] * T + 2, y:p[1] * T + 3 } : null; } }
      else { let job = chooseJob(v, g); if (job === 'pescar' && !v.rod && g.wood >= 2 && housesOf(g).length * 4 >= popOf(g) + 2 && villagers.filter(u => u.rod && u.vid === g.id).length < Math.ceil(popOf(g) / 3)) job = 'caña'; let tk = setupTask(v, g, job); if (!tk) (g.jobFail ||= {})[job] = yearT + 30; for (let k = 0; k < 3 && !tk; k++) { const j2 = chooseJob(v, g); tk = setupTask(v, g, j2); if (!tk) g.jobFail[j2] = yearT + 30; } /* lo que no encuentra sitio se aparca un rato */ v.task = tk || setupTask(v, g, 'pasear'); if (tk) chargeWork(g, tk.k); /* las obras públicas se pagan del fondo de obras */ maybeRide(v, g); }
      v.lastD = Infinity; v.stuckT = 0;
      if (!v.task) { v.wait = 1 + Math.random(); continue; }
    }
    // El hambre y la sed mandan: si aprietan, deja lo que esté haciendo
    if (((v.hp ?? 1) < .45 || (v.sick && v.sick.t > 8)) && hasHosp(g) && !v.enemy && !v.foe && !['curarse', 'asalto', 'beber', 'comer', 'trabajando'].includes(v.task.k)) { const sb = standBy(g.hospital); if (sb) { releaseTask(v); v.task = { k:'curarse', x:sb[0], y:sb[1] }; v.lastD = Infinity; } }
    if (v.water < .12 && v.task.k === 'trabajando' && v.task.job !== 'beber' && !v.boat) { const p = drinkSpot(v, g); if (p) { v.actT = 0; v.onDone = null; releaseTask(v); v.task = { k:'beber', ...p }; v.lastD = Infinity; } }
    if (v.task.k !== 'beber' && v.task.k !== 'comer' && v.task.k !== 'trabajando' && !v.boat) {
      if (v.water < .3) { const p = drinkSpot(v, g); if (p) { releaseTask(v); v.task = { k:'beber', ...p }; v.lastD = Infinity; } }
      else if (v.food < .28 && canEat(v, g)) { releaseTask(v); const [fx, fy] = fireXY(g); v.task = { k:'comer', ...eatSpot(v, g) }; v.lastD = Infinity; }
    }
    if (v.task.k === 'capturar' && v.task.phase === 'llevar') { if (vGo(v, v.task.x, v.task.y, dt)) { const a = v.task.a; if (a && !a.dead) { a.lead = null; a.x = v.task.x; a.y = v.task.y; } v.task = null; } continue; }
    runTask(v, g, dt);
  }
  if (villagers.some(v => v.dead)) villagers = villagers.filter(v => !v.dead);
  villageClock += dt;
  if (villageClock >= 1) { updateVillages(villageClock); villageClock = 0; }
}
// ---- Pueblo abandonado: en unos días los edificios se caen, el cercado se pudre y la hierba se come las calles ----
function decayRuins(g, dt){
  const age = yearT - (g.goneT ?? yearT);
  for (const b of buildingsOf(g)) {
    const o = world.objs[b]; if (!o || !isBuilding(o)) continue;
    o.dmg = Math.max(o.dmg || 0, .6) + dt * (o.burnt || wooden(o) ? .0009 : .0005) * (.5 + h2(b % W, (b / W) | 0, 7));
    if (o.dmg >= 1) { world.objs[b] = null; addEffect((b % W) * T + 2, ((b / W) | 0) * T + 3, 'poof'); composeRegion((b % W) - 8, ((b / W) | 0) - 12, (b % W) + 8, ((b / W) | 0) + 12); }
  }
  if (pensOf(g).length && age > DAY_LEN) { for (const p of g.pens) composeRegion(p.x0 - 2, p.y0 - 4, p.x1 + 2, p.y1 + 2); g.pens = []; g.pen = null; }
  if (g.ruinTiles && g.ruinTiles.length && age > DAY_LEN * .5) {
    g.ruinAcc = (g.ruinAcc || 0) + dt * Math.max(.2, g.ruinTiles.length / (DAY_LEN * 3));
    while (g.ruinAcc >= 1 && g.ruinTiles.length) { g.ruinAcc--; const i = g.ruinTiles.pop(); pathMap.delete(i); plazaSet.delete(i); holySet.delete(i); desireSet.delete(i); }
  }
  if (age > DAY_LEN * 1.5) { const i = g.fy * W + g.fx, o = world.objs[i]; if (o && o.key === 'fire:camp') { world.objs[i] = null; composeRegion(g.fx - 4, g.fy - 6, g.fx + 4, g.fy + 2); } }
  g.ruinsLeft = buildingsOf(g).some(b => world.objs[b] && isBuilding(world.objs[b]));
}
// ---- Cada segundo: cultivos, nacimientos y ganado ----
function updateVillages(dt){
  for (const g of villages) if (!g.gone && g.born != null && yearT - g.born > 5 && popOf(g) === 0) {
    g.gone = true; g.goneT = yearT; g.fireOut = true; sportsOrphan(g); // (deportes.js)
    for (const tc of torchesOf(g)) tc.lit = false;
    for (const [i, f] of farmMap) if (f.vid === g.id) farmMap.delete(i); // los campos se pierden entre la hierba
    // Calles y plazas que solo eran suyas (lejos de cualquier otro pueblo con gente): la hierba se las irá comiendo
    const others = villages.filter(o => o !== g && !o.gone && popOf(o));
    g.ruinTiles = [...pathMap].filter(i => !bridgeSet.has(i) && Math.hypot((i % W) - g.fx, ((i / W) | 0) - g.fy) < 30 && others.every(o => Math.hypot((i % W) - o.fx, ((i / W) | 0) - o.fy) > 30));
    g.ruinTiles.sort(() => Math.random() - .5);
    for (const b of buildingsOf(g)) { const o = world.objs[b]; if (o && !o.burnt) { o.dmg = Math.max(o.dmg || 0, .6); composeRegion((b % W) - 8, ((b / W) | 0) - 12, (b % W) + 8, ((b / W) | 0) + 12); } }
    const war = [...rels.values()].find(r => r.war && (r.war.att === g.id || r.war.def === g.id));
    notify(war ? `${g.name} ha sido arrasada: no queda nadie` : `${g.name} se ha extinguido: solo quedan sus ruinas`, { x:g.fx * T, y:g.fy * T });
    for (const r of rels.values()) if (r.war && (r.war.att === g.id || r.war.def === g.id)) r.war = null;
    for (const o of villages) if (o.nation === g.id && o !== g) o.nation = o.id;
  }
  for (const g of villages) if (g.gone) { decayRuins(g, dt); if (g.pitch || g.pool || g.track || g.club) sportsOrphan(g); } // (partidas de antes: deportes.js)
  if ((diploT -= dt) <= 0) { diploT = 10; diploTick(); allianceTick(); }
  if ((histT -= dt) <= 0) { histT = DAY_LEN / 2; recordHistory(); if ($('histPanel') && !$('histPanel').hidden) renderHistory(); }
  if ((autoSaveT += dt) > DAY_LEN * 2) { autoSaveT = 0; saveGame('auto', true); } // cada dos días, guardado automático
  if (cardVid) renderVillageCard();
  // La hierba pisada se recupera poco a poco; un camino de pisadas que ya nadie usa desaparece
  for (const i of wornSet) {
    wear[i] -= dt * .04;
    if (desireSet.has(i) && wear[i] < 12) { desireSet.delete(i); pathMap.delete(i); }
    if (wear[i] <= 0) { wear[i] = 0; wornSet.delete(i); }
  }
  if ((zoneT -= dt) <= 0) { zoneT = 5; buildZones(); } // el territorio cambia despacio
  const si = seasonInfo().i, grow = [1, 1.2, .6, .2][si];
  for (const [i, f] of farmMap) {
    const g = villageById(f.vid); if (!g) { farmMap.delete(i); continue; }
    if (world.objs[i] || WATER[world.biome[i]] || world.biome[i] === B.LAVA) { farmMap.delete(i); continue; } // algo ha ocupado el campo
    if (f.st === 'muerta' || f.st === 'arada' || f.st === 'pradera') continue; // sin nada sembrado
    const t = tempAt(i), C = CROPS[f.crop || 'trigo'], water = freshNear(i, (g.know || {}).acequias ? 12 : 8) || raining(i) || (floodA && floodA[i] > .2) || wellWater(g, i, dt);
    const secano = !water && [B.GRASS, B.PLAINS, B.FOREST].includes(world.biome[i]) && droughtAt(i) < .3; // tierra húmeda: aguanta con la lluvia de vez en cuando
    if (fires.has(i) || burnt.has(i)) { f.st = 'muerta'; f.why = 'quemada'; misfortune(g, 'quemada'); continue; }
    if (floodA && floodA[i] > .6) { f.st = 'muerta'; f.why = 'inundada'; misfortune(g, 'inundada'); continue; }
    if (t < C.frost && f.st !== 'madura') { f.st = 'muerta'; f.why = 'helada'; misfortune(g, 'helada'); continue; }
    if (f.st === 'madura') { if (yearT - f.ripeT > 130) { /* si nadie la recoge a tiempo */ f.st = 'muerta'; f.why = 'podrida'; misfortune(g, 'podrida'); } continue; }
    if (secano) f.g += .013 * C.grow[si] * dt; // más despacio que con riego
    else if (!water) { f.dry += dt * (C.dry ? .2 : 1); if (C.dry) f.g += .01 * C.grow[si] * dt; if (f.dry > 45) { f.st = 'muerta'; f.why = 'seca'; misfortune(g, 'seca');
        const kn = g.know ||= {}; if (!kn.acequias && (g.dryLoss = (g.dryLoss || 0) + 1) >= 6) { kn.acequias = true; notify(`En ${g.name}, tras perder cosechas por la sequía, aprenden a cavar acequias para llevar el agua a los campos`, { x:g.fx * T, y:g.fy * T }); }
        continue; } } else f.dry = Math.max(0, f.dry - dt);
    if (water) f.g += .022 * C.grow[si] * dt;
    f.st = f.g >= 1 ? 'madura' : f.g > .15 ? 'creciendo' : 'sembrado';
    if (f.st === 'madura') f.ripeT = yearT;
  }
  for (const g of villages) {
    const people = villagers.filter(v => !v.dead && v.vid === g.id), pop = people.length;
    if (!pop) continue;
    g.meat = clamp(g.meat || 0, 0, g.food); g.diet = people.reduce((s, v) => s + (v.diet ?? .5), 0) / pop;
    const know = g.know ||= {};
    if (!know.pozo && raining(g.fy * W + g.fx)) {
      know.pozo = know.molino = true;
      notify(`Ha llovido por primera vez en ${g.name}: aprenden a hacer pozos para guardar el agua de lluvia, y molinos para moler el grano`, { x:g.fx * T, y:g.fy * T });
    }
    if (!know.puente && (g.waterTrips || 0) >= 3 && g.crossings && g.crossings.size) {
      know.puente = true; notify(`En ${g.name} se han hartado de mojarse: aprenden a hacer puentes`, { x:g.fx * T, y:g.fy * T });
    }
    if (!know.barca && (g.fished || 0) >= 6 && (g.portTry = (g.portTry || 0) - dt) <= 0) {
      g.portTry = 15;
      if (portSite(g)) { know.barca = true; notify(`En ${g.name} aprenden a hacer barcas y un muelle para pescar mar adentro`, { x:g.fx * T, y:g.fy * T }); }
    }
    if (!know.montar && penAnimals(g).some(a => a.sp === 'caballo' && (yearT - a.born) / YEAR >= ADULT)) {
      know.montar = true; notify(`En ${g.name} aprenden a montar a caballo (y a hacer carros)`, { x:g.fx * T, y:g.fy * T });
    }
    chartTick(g, dt, people); socialTick(g, dt, people); workTick(g, dt, people); holidayTick(g, dt, people);
    // Un pueblo grande con gobierno acuña su moneda aunque apenas comercie (y desde entonces se pagan sueldos)
    if (!g.coin && ((g.hall != null && people.length >= 12) || people.length >= 22 || g.market != null) && Math.random() < dt * .012) { g.coin = coinName(); notify(`En ${g.name} el gobierno acuña su propia moneda, el ${g.coin}: desde ahora el trabajo se paga con sueldo`, { x:g.fx * T, y:g.fy * T }); }
    // Un cementerio encima de una plaza sagrada (partidas de antes): se traslada (se vuelve a hacer en otro sitio)
    const cm = g.cemetery; if (cm && villages.some(o => o.holy && !(cm.x0 + cm.w - 1 < o.holy.x0 || cm.x0 > o.holy.x1 || cm.y0 + cm.h - 1 < o.holy.y0 || cm.y0 > o.holy.y1))) { g.cemetery = null; notify(`En ${g.name} trasladan el cementerio fuera de la plaza sagrada`, { x:(cm.x0 + cm.w / 2) * T, y:(cm.y0 + cm.h / 2) * T }); }
    for (const w of wellsOf(g)) w.q = Math.min(1, w.q + (raining(w.i) ? .04 : .006) * dt); // con la lluvia se llena; sin ella, poco a poco, del agua de debajo
    for (const ti of towersOf(g)) {
      const o = world.objs[ti], tx = (ti % W) * T + 2, ty = ((ti / W) | 0) * T - 28;
      o.archer ||= { x:tx, y:ty, vid:g.id, carry:{ k:'-' }, dead:false, foe:null, name:'la torre' };
      let tgt = null, bd = 60;
      for (const a of animals) { if (a.dead || a.dom || (a.sp !== 'lobo' && a.sp !== 'oso')) continue; const d = Math.hypot(a.x - tx, a.y - ty - 20); if (d < bd) { bd = d; tgt = a; } }
      if (tgt) arrows.push({ x0:tx, y0:ty, a:tgt, v:o.archer, t:0, dur:Math.max(.2, bd / 140), hit:Math.random() < .75 });
    }
    const angryVolc = g.faith && riteOf(g) === 'volcan' && (volcanoNear(g) || {}).state === 'erupcion';
    if (g.faith && ((g.wrath || 0) >= 8 || (angryVolc && (g.wrath || 0) >= 3 && !penAnimals(g).length)) && (g.devotion || 0) >= 2 && altarSpot(g) && !hasLaw(g, 'derechos_humanos') && !hasLaw(g, 'laicidad') && yearT - (g.humanT ?? -1e9) > DAY_LEN * 3 && Math.random() < dt * .02) {
      const cands = people.filter(u => (yearT - u.born) / YEAR >= ADULT_H && u !== g.leader && !u.sleep && !u.boat && !u.mount);
      if (cands.length > 6) {
        const vic = cands[Math.floor(Math.random() * cands.length)], sp = riteSpot(g, vic) || altarSpot(g);
        releaseTask(vic); vic.task = null; vic.x = sp[0]; vic.y = sp[1];
        g.humanT = yearT; g.wrath = 0; g.devotion = (g.devotion || 0) + 2; riteFx(g, sp[0], sp[1], true);
        notify(riteOf(g) === 'volcan' ? `En ${g.name}, desesperados, arrojan a ${vic.name} al volcán para aplacar a ${g.faith.god}` : `En ${g.name}, desesperados, sacrifican a ${vic.name} para aplacar a ${g.faith.god}`, { x:sp[0], y:sp[1] });
        killVillager(vic, 'sacrificio');
      }
    }
    if (g.faith && !g.ritual && !isNight()) {
      const today = Math.floor(yearT / DAY_LEN);
      if (dayT() < .14 && g.ritualDay !== today && popOf(g) >= 5) { g.ritualDay = today; startRitual(g, 'al amanecer'); }
      else if ((g.wrath || 0) > 3 && yearT - (g.lastRitual ?? -1e9) > 90) startRitual(g, 'para calmar su ira');
    }
    if (g.ritual) { if (yearT > g.ritual.until) g.ritual = null; else if (Math.random() < dt * 2) holyGlow(g.ritual.cx, g.ritual.cy + 2, 3); }
    // Sin desgracias que explicar, acaban venerando lo que ven cada día en el cielo
    if (!g.faith && yearT - (g.born || 0) > DAY_LEN * 2) { g.faith = makeFaith(Math.random() < .5 ? 'el sol' : 'la luna'); g.lastBlame = `mirando al cielo, empiezan a venerar a ${godTxt(g.faith)}`; notify(`En ${g.name}, ${g.lastBlame}`, { x:g.fx * T, y:g.fy * T }); }
    if (g.faith) {
      g.wrath = Math.max(0, (g.wrath || 0) - dt * .004);
      if (raining(g.fy * W + g.fx) && g.blameT && yearT - (g.blameT.seca ?? -1e9) < 900 && yearT - (g.thanked ?? -1e9) > 600) {
        g.thanked = yearT; g.devotion = (g.devotion || 0) + 2; g.wrath = Math.max(0, g.wrath - 2);
        notify(`En ${g.name} dan gracias a ${g.faith.god} por la lluvia`, { x:g.fx * T, y:g.fy * T });
      }
    }
    const fi0 = g.fy * W + g.fx;
    if (!g.fireOut && world.objs[fi0] && ((raining(fi0) && Math.random() < dt * .06) || (floodA && floodA[fi0] > .3))) {
      g.fireOut = true;
      if (yearT - (g.fireMsgT ?? -1e9) > 300) { g.fireMsgT = yearT; notify(`El agua ha apagado la hoguera de ${g.name}`, { x:g.fx * T, y:g.fy * T }); }
      if (!g.faith || g.faith.dom !== 'la lluvia') misfortune(g, 'hoguera'); // ¿por qué les apaga el fuego el cielo?
    }
    // Mucha lluvia seguida: o es una bendición (si su dios es el de la lluvia) o le buscan culpable
    g.rainT = raining(fi0) ? (g.rainT || 0) + dt : Math.max(0, (g.rainT || 0) - dt * 2);
    if (g.rainT > 45) {
      g.rainT = 0;
      if (g.faith && g.faith.dom === 'la lluvia') {
        if (yearT - (g.blessT ?? -1e9) > 300) { g.blessT = yearT; g.devotion = (g.devotion || 0) + 1; g.lastBlame = `creen que ${godTxt(g.faith)}, les bendice con tanta lluvia`; notify(`En ${g.name} ${g.lastBlame}`, { x:g.fx * T, y:g.fy * T }); }
      } else misfortune(g, 'lluvia');
    }
    if (!know.antorchas && isNight() && housesOf(g).length >= 2) { know.antorchas = true; notify(`En ${g.name} no ven nada de noche: empiezan a poner antorchas`, { x:g.fx * T, y:g.fy * T }); }
    for (const tc of torchesOf(g)) {
      if (tc.lit && dayT() > .06 && dayT() < .42) tc.lit = false;                       // de día se apagan
      if (tc.lit && raining(tc.i) && Math.random() < dt * .1) tc.lit = false;           // la lluvia las apaga
    }
    if (nationOf(g) === g) {
      if (!g.parties && popOf(g) >= 8 && yearT > DAY_LEN * .8) makeParties(g);
      if (g.parties && votes(g) && !g.election && !isNight() && yearT - (g.voteT ?? -1e9) > DAY_LEN * 2) { g.voteT = yearT; startElection(g); }
      if (g.election && yearT > g.election.until) { g.election = null; countVotes(g); }
    }
    politicsTick(g, dt, people);
    diseaseTick(g, dt, people);
    if (!isNight() && g.plaza && people.length >= 8 && Math.random() < dt * .03) startBallGame(g, people); // los niños juegan cuando quieren; los mayores, en su tiempo libre
    if ((g.wallT = (g.wallT ?? Math.random() * 20) - dt) <= 0) { g.wallT = 20; wallGrow(g); } // la muralla, a la medida del pueblo (defensa.js)
    lawsTick(g, dt, people); // efectos de las leyes nuevas (leyes.js)
    fameTick(g, dt, people); // castillos y bardos (fama.js)
    civilWarTick(g, people, dt); // ¿estalla una guerra civil? (guerra.js)
    sportsTick(g, dt, people); // clubes, entrenos y partidos (deportes.js)
    if ((g.migT = (g.migT ?? DAY_LEN / 3) - dt) <= 0) { g.migT = DAY_LEN / 3; migrationTick(g, people); }
    smallTownTick(g, dt, people); // pueblos casi vacíos: anexión o mudanza (anexiones.js)
    seasonsTick(g, dt, people); // comida que se estropea y leña (estaciones.js)
    if (g.leader && g.leader.dead && nationOf(g) === g && !['tribu', 'republica'].includes(regimeOf(g)) && !votes(g)) succession(g, people);
    // Líder: si no tienen (o ha muerto), eligen al adulto de más edad que no sea un anciano (hasta que haya elecciones)
    if (!g.leader || g.leader.dead || g.leader.vid !== g.id) {
      const cands = people.filter(u => { const a = (yearT - u.born) / YEAR; return a >= ADULT_H && a < u.life * .85; }).sort((a, b) => a.born - b.born);
      if (cands.length) { const first = !g.leader; g.leader = cands[0]; notify(`${g.leader.name} es ${first ? 'la primera persona al mando' : 'quien manda ahora'} en ${g.name}`, { x:g.leader.x, y:g.leader.y }); }
    }
    // Descontento de los pueblos de una nación: lejos de la capital, con otra fe, con hambre o conquistados a la fuerza;
    // si se acumula, se independizan
    if (g.nation && g.nation !== g.id && villageById(g.nation) && popOf(villageById(g.nation))) {
      const cap = villageById(g.nation), f = { distancia:Math.hypot(g.fx - cap.fx, g.fy - cap.fy) > 70 ? .6 * colonyCare(g, cap) : 0, 'religión':g.faith && cap.faith && g.faith.god !== cap.faith.god ? .8 : 0,
        hambre:g.food < popOf(g) ? .6 : 0, impuestos:hasLaw(cap, 'ejercito') || hasLaw(cap, 'expansion') ? .3 : 0 };
      const up = Object.values(f).reduce((a2, b2) => a2 + b2, 0) - .5 - (hasLaw(cap, 'reparto') ? .2 : 0) - (hasLaw(cap, 'autonomia') ? .25 : 0);
      g.unrest = clamp((g.unrest || 0) + up * dt, 0, 100);
      if (g.unrest > 70 && independenceReferendum(g, cap)) { // donde la capital vota, antes hay referéndum (colonias.js)
        const why = Object.entries(f).sort((a2, b2) => b2[1] - a2[1])[0][0];
        becomeIndependent(g); addFiesta(g, 'Día de la Independencia'); const r = relOf(g, cap); r.known = true; r.v = -35; r.reason = why === 'religión' ? 'religión' : why === 'hambre' ? 'recursos' : 'territorio';
        notify(`¡${g.name} se independiza de ${cap.name}! (por ${{ distancia:'estar tan lejos', 'religión':'la religión', hambre:'el hambre', impuestos:'los impuestos y las levas' }[why]})`, { x:g.fx * T, y:g.fy * T });
      }
    } else if (g.nation && g.nation !== g.id) becomeIndependent(g); // la capital ya no existe
    // Cada poco cuentan los árboles que les quedan cerca y las piedras sueltas por el pueblo
    if ((g.scanT = (g.scanT || 0) - dt) <= 0) {
      g.scanT = 8; let tr = 0, rk = 0, ores = 0, bush = 0;
      for (let y = g.fy - 30; y <= g.fy + 30; y++) for (let x = g.fx - 30; x <= g.fx + 30; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue; const o = world.objs[y * W + x]; if (!o) continue;
        const c = OBJ[o.key][1], d = Math.hypot(x - g.fx, y - g.fy);
        if (c === 'mineral') { ores++; continue; }
        if (Math.abs(x - g.fx) > 16 || Math.abs(y - g.fy) > 16) continue;
        if (c === 'tree') tr++; else if (c === 'berry') bush++; else if (c === 'stone' && d < 12) rk++;
      }
      g.oresNear = ores; g.berriesNear = bush;
      if (g.treesNear != null && g.treesNear >= 14 && tr < 14) notify(`En ${g.name} se han quedado sin árboles cerca: se ponen a replantar`, { x:g.fx * T, y:g.fy * T });
      g.treesNear = tr; g.rocksNear = rk;
    }
    // ¿Fieras cerca? La aldea se pone en guardia y empieza a fabricar armas
    g.danger = Math.max(0, (g.danger || 0) - dt);
    for (const a of animals) if (!a.dead && !a.dom && (a.sp === 'lobo' || a.sp === 'oso') && Math.hypot(a.x - g.fx * T, a.y - g.fy * T) < 25 * T) {
      if (!g.sawBeast) { g.sawBeast = true; notify(`En ${g.name} han visto ${a.sp === 'oso' ? 'un oso' : 'lobos'} cerca: empiezan a fabricar lanzas y arcos`, { x:g.fx * T, y:g.fy * T }); }
      g.danger = 60; break;
    }
    // Nacimientos: con comida y sitio en casa, una pareja adulta tiene un hijo
    clampStore(g);
    const cap = houseCap(g) + 4 + (g.hall != null && world.objs[g.hall] ? 8 : 0), adults = people.filter(v => { const a = (yearT - v.born) / YEAR; return a >= ADULT_H && a < 12; });
    // Cuantas más parejas, más nacimientos (antes solo podía tener hijos la primera: los pueblos se estancaban en unos 30)
    const moms = adults.filter(v => v.sex === 'm' && partnerOf(v) && partnerOf(v).sex === 'h' && adults.includes(partnerOf(v)));
    const mom = moms[Math.floor(Math.random() * moms.length)], dad = mom && partnerOf(mom); // de una pareja
    if (mom && dad && pop < cap && g.food >= pop * 1.5 + 3 && Math.random() < dt * Math.min(.1, .03 + moms.length * .006) * (hasLaw(g, 'natalidad') ? 1.6 : 1)) {
      const kid = lifeFields({ name:NAMES[nameIdx++ % NAMES.length], x:mom.x, y:mom.y, path:null, wait:1, walk:0, moving:false, dir:1, appear:1,
        pants:pick(PANTS, Math.random), hat:pick(HATS, Math.random), shirt:pick(SHIRT, Math.random), hair:Math.random() < .5 ? mom.hair : dad.hair },
        Math.floor(mom.x / T), Math.floor(mom.y / T), 0, Math.random);
      const si2 = clamp(Math.round((SKIN.indexOf(mom.skin) + SKIN.indexOf(dad.skin)) / 2 + (Math.random() - .5) * 1.4), 0, SKIN.length - 1);
      kid.skin = SKIN[si2]; kid.ad = clamp((mom.ad + dad.ad) / 2 + (Math.random() - .5) * 3, -20, 20); kid.vid = g.id;
      kid.swims = (mom.swims || dad.swims) ? Math.random() < .6 : Math.random() < .1; // se aprende de los padres
      if (hasLaw(g, 'educacion') && Math.random() < .8) kid.swims = true; // y en la escuela
      kid.parents = [mom, dad]; kid.name = personName(villageById(mom.vid), kid.sex) || nameFor(kid.sex); kid.fresh = false; const pc = creedOf(mom) || creedOf(dad); if (pc) { kid.creed = { ...pc }; kid.zeal = Math.random() * .7; } /* la fe de casa */
      (mom.kids ||= []).push(kid); (dad.kids ||= []).push(kid); if (!(mom.partners ||= []).includes(dad)) mom.partners.push(dad); if (!(dad.partners ||= []).includes(mom)) dad.partners.push(mom);
      kid.ideo = clamp(((mom.ideo || 0) + (dad.ideo || 0)) / 2 + (Math.random() - .5) * .4, -1, 1);
      kid.diet = clamp(((mom.diet ?? .5) + (dad.diet ?? .5)) / 2 + (Math.random() - .5) * .1, 0, 1); kid.ate = kid.diet;
      villagers.push(kid); g.food -= 3;
    }
    // Ganado: produce comida (leche, huevos…), come del almacén y cría dentro del cercado
    const herd = penAnimals(g);
    for (const a of herd) {
      if (a.lead) continue;
      a.prodT = (a.prodT || 0) + dt;
      if (a.prodT > 25 && (yearT - a.born) / YEAR >= ADULT) { a.prodT = 0; const n = a.sp === 'vaca' ? 2 : 1; g.food += n; g.meat = (g.meat || 0) + n; } // leche, huevos…
      if (g.food > 0) g.food = Math.max(0, g.food - .012 * dt);
      // Lo que aprenden: un animal que aguanta un año en su cercado les enseña qué adaptación funciona aquí
      if (!a.taught && yearT - a.domSince > YEAR) {
        a.taught = true; const L = g.learn[a.sp] ||= { pref:null, dead:0, ok:0 };
        L.ok++; L.pref = L.pref == null ? a.ad : L.pref * .6 + a.ad * .4;
      }
    }
    for (const sp of HERBIVORES) {
      const same = herd.filter(a => a.sp === sp && !a.lead && (yearT - a.born) / YEAR >= ADULT);
      if (same.length >= 2 && herd.length < 18 && g.food > 6 && Math.random() < dt * .01) {
        const m = same[0], kid = makeAnimal(sp, m.x, m.y, 0, 0, m);
        kid.ad = clamp((same[0].ad + same[1].ad) / 2 + (Math.random() - .5) * 2, -22, 22); kid.dom = g.id; kid.domSince = yearT;
      }
    }
  }
  updateVillagePanel();
}
// Un animal de granja que muere de frío o de calor: la aldea aprende que necesita animales de otro clima
function learnFromDeath(a, cause){
  const g = villageById(a.dom); if (!g || (cause !== 'frío' && cause !== 'calor')) return;
  const L = g.learn[a.sp] ||= { pref:null, dead:0, ok:0 };
  L.dead++;
  // Se fijan en el clima de su tierra (lo que aguantan los animales salvajes de aquí) y en que este era
  // demasiado del frío o del calor: la próxima vez buscan uno más parecido a lo que piden su zona
  const local = (world.baseT[g.fy * W + g.fx] - ANIMALS[a.sp].comfort) * .7;
  L.pref = L.pref == null ? (a.ad + local) / 2 : (L.pref + local) / 2;
  L.pref = cause === 'frío' ? Math.min(L.pref, a.ad - 6) : Math.max(L.pref, a.ad + 6);
}
// Animales de granja: siguen a quien los lleva y después se quedan en el cercado
function domesticStep(a, S, dt){
  if (a.rider) {
    if (a.rider.dead || a.rider.mount !== a) a.rider = null;
    else { a.x = a.rider.x; a.y = a.rider.y + .5; a.dir = a.rider.dir; a.moving = a.rider.moving; a.walk = a.rider.walk; a.state = 'montado'; return true; }
  }
  const g = villageById(a.dom);
  if (!g || (!pensOf(g).length && !a.lead)) { a.dom = 0; return false; }
  a.water = 1; if (g.food > 0) a.food = 1;
  if (a.lead) {
    if (a.lead.dead || !villagers.includes(a.lead)) { a.lead = null; return true; }
    moveTo(a, a.lead.x - 6 * a.lead.dir, a.lead.y + 2, S.speed * 1.4, dt); a.state = 'llevado'; return true;
  }
  const p = penOfAnimal(g, a), cx = (p.x0 + p.x1 + 1) / 2 * T, cy = (p.y0 + p.y1 + 1) / 2 * T; // cada animal, en el suyo
  const inside = a.x > p.x0 * T + 2 && a.x < (p.x1 + 1) * T - 2 && a.y > p.y0 * T + 2 && a.y < (p.y1 + 1) * T - 1;
  a.state = 'en el cercado';
  if (!inside) { // vuelve andando; solo si se queda atascado mucho rato aparece dentro
    a.backT = (a.backT || 0) + dt; a.state = 'volviendo al cercado';
    if (a.backT > 30) { a.x = cx; a.y = cy; a.backT = 0; } else moveTo(a, cx, cy, S.speed * .9, dt);
    return true;
  }
  a.backT = 0;
  if ((a.t -= dt) <= 0) { a.t = 2 + Math.random() * 4; a.tx = (p.x0 + .5 + Math.random() * (p.x1 - p.x0)) * T + 2; a.ty = (p.y0 + .5 + Math.random() * (p.y1 - p.y0)) * T + 2; }
  if (Math.hypot(a.tx - a.x, a.ty - a.y) > 1.5) moveTo(a, a.tx, a.ty, S.speed * .5, dt);
  return true;
}
// ---- Dibujo: campos, cercados, llama de las hogueras y lo que llevan en las manos ----
// Nieve cuajada encima de algo dibujado sobre el suelo (plaza, caminos, campos): píxeles blancos según la cantidad
function snowTile(i, px, py){
  const sn = snowA ? snowA[i] : 0; if (sn < .06) return;
  const tx = i % W, ty = (i / W) | 0;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (h2(px + x, py + y, 41) < sn * 1.15) { vctx.fillStyle = h2(px + x, py + y, 44) > .8 ? '#dfe6ee' : '#f4f7fc'; vctx.fillRect(px + x, py + y, 1, 1); }
}
// Tejados (y cabezas de estatua) nevados: los píxeles de arriba de cada columna del dibujo, en la mitad superior
const snowCapCache = new WeakMap();
function snowCap(s){
  let c = snowCapCache.get(s); if (c) return c;
  const w = s.width, h = s.height, src = s.getContext('2d').getImageData(0, 0, w, h).data;
  c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const op = (px, py) => py >= 0 && src[(py * w + px) * 4 + 3] > 0;
  for (let px = 0; px < w; px++) for (let py = 0; py < h * .6; py++) {
    if (!op(px, py) || op(px, py - 1)) continue; // borde de arriba: ahí se posa la nieve
    x.fillStyle = '#f4f7fc'; x.fillRect(px, py, 1, 2);
    if ((px * 7 + py) % 3 === 0) { x.fillStyle = '#dfe6ee'; x.fillRect(px, py + 2, 1, 1); }
  }
  snowCapCache.set(s, c); return c;
}
function drawCemeteries(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    const c = g.cemetery; if (!c) continue;
    const px = c.x0 * T, py = c.y0 * T, pw = c.w * T, ph = c.h * T;
    if (px > x1 || px + pw < x0 || py > y1 || py + ph < y0) continue;
    vctx.fillStyle = 'rgba(30,50,26,.35)'; vctx.fillRect(px, py, pw, ph);
    if (fence(px, py, pw, ph, (c.w >> 1) * T)) { /* valla dibujada */ } else {
    vctx.fillStyle = '#6a5a48';
    vctx.fillRect(px, py, pw, 1); vctx.fillRect(px, py, 1, ph); vctx.fillRect(px + pw - 1, py, 1, ph);
    const gate = px + (c.w >> 1) * T; vctx.fillRect(px, py + ph - 1, gate - px - 1, 1); vctx.fillRect(gate + T + 1, py + ph - 1, px + pw - gate - T - 1, 1); // la puerta, abajo
    for (let k = 0; k < c.w; k += 2) { vctx.fillRect(px + k * T, py - 1, 1, 2); vctx.fillRect(px + k * T, py + ph - 2, 1, 2); } }
    for (const [i, gr] of c.graves) {
      const gx = (i % W) * T + 1, gy = ((i / W) | 0) * T;
      vctx.fillStyle = 'rgba(40,30,20,.45)'; vctx.fillRect(gx - 1, gy + 3, 5, 2); // tierra removida
      const ts = artFrame(gr.cross ? 'tumba:estela' : i % 3 === 0 ? 'tumba:flores' : 'tumba:lapida');
      if (ts) { vctx.drawImage(ts, gx + 1 - (ts.width >> 1), gy + 4 - ts.height); continue; } // el dibujo
      if (gr.cross) { vctx.fillStyle = '#6a4a2c'; vctx.fillRect(gx + 1, gy - 2, 1, 5); vctx.fillRect(gx, gy - 1, 3, 1); }
      else { vctx.fillStyle = '#4a4844'; vctx.fillRect(gx, gy - 2, 3, 5); vctx.fillStyle = '#a8a49c'; vctx.fillRect(gx, gy - 1, 3, 3); vctx.fillRect(gx + 1, gy - 2, 1, 1); vctx.fillStyle = '#6a6660'; vctx.fillRect(gx + 1, gy, 1, 1); }
    }
  }
}
function drawFarms(){
  if (!farmMap.size) return;
  const [x0, y0, x1, y1] = visibleRect();
  drawFarmTiles(x0, y0, x1, y1);
  for (const [i, f] of farmMap) {
    const px = (i % W) * T, py = ((i / W) | 0) * T;
    if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    if (f.st === 'muerta' && f.why === 'helada') { vctx.fillStyle = 'rgba(200,225,245,.45)'; vctx.fillRect(px, py, T, T); vctx.fillStyle = '#eef6fc'; vctx.fillRect(px + (i % 3), py + 1, 1, 1); vctx.fillRect(px + 3, py + 3, 1, 1); }
    snowTile(i, px, py);
  }
}
function drawFarmTiles(x0, y0, x1, y1){
  for (const [i, f] of farmMap) {
    const tx = i % W, ty = (i / W) | 0, px = tx * T, py = ty * T;
    if (px + T < x0 || px > x1 || py + T < y0 || py > y1) continue;
    const st = f.st, tk = st !== 'pradera' && ART.ready && fieldTex(f);
    if (tk && artFill(vctx, tk, px, py, T, T)) { /* dibujado: tierra y cultivo de la textura */ }
    else if (st !== 'pradera') {
      vctx.fillStyle = '#6e4a2c'; vctx.fillRect(px, py, T, T);                                    // tierra arada
      vctx.fillStyle = '#58391f'; for (let r = 1; r < T; r += 2) vctx.fillRect(px, py + r, T, 1);  // surcos
    }
    // Borde de la parcela (donde la casilla de al lado no es del mismo campo)
    vctx.fillStyle = st === 'pradera' ? 'rgba(90,60,30,.55)' : 'rgba(60,38,20,.6)';
    const same = j => { const o = farmMap.get(j); return o && o.field === f.field; };
    if (!same(i - W)) vctx.fillRect(px, py, T, 1);
    if (!same(i + W)) vctx.fillRect(px, py + T - 1, T, 1);
    if (tx === 0 || !same(i - 1)) vctx.fillRect(px, py, 1, T);
    if (tx === W - 1 || !same(i + 1)) vctx.fillRect(px + T - 1, py, 1, T);
    if (st === 'pradera' || st === 'arada' || tk) continue;
    const h = st === 'sembrado' ? 1 : st === 'creciendo' ? 1 + Math.round(f.g * 4) : st === 'madura' ? 5 : 1;
    const C = CROPS[f.crop || 'trigo'], col = st === 'madura' ? C.ripe : st === 'muerta' ? ['#7a6a4a', '#5a4c36'] : C.leaf;
    for (let k = 0; k < T; k += 2) for (let r = 0; r < 2; r++) {
      const sx = px + k, sy = py + 1 + r * 2 + 1;
      vctx.fillStyle = col[1]; vctx.fillRect(sx, sy - h + 1, 1, h);
      if (st === 'madura') { vctx.fillStyle = col[0]; if (f.crop === 'calabaza' || f.crop === 'col') vctx.fillRect(sx, sy - 1, 2, 2); else vctx.fillRect(sx, sy - h + 1, 1, 2); }
      else if (st === 'creciendo' && h > 2) { vctx.fillStyle = col[0]; vctx.fillRect(sx, sy - h + 1, 1, 1); }
    }
  }
}
function drawPens(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    // Cercado: postes y travesaños de madera alrededor
    for (const p of pensOf(g)) {
      const ax = p.x0 * T, ay = p.y0 * T, bx = (p.x1 + 1) * T, by = (p.y1 + 1) * T;
      if (!(bx < x0 || ax > x1 || by < y0 || ay > y1) && !fence(ax, ay, bx - ax, by - ay)) {
        vctx.fillStyle = '#7a5230';
        vctx.fillRect(ax, ay, bx - ax, 1); vctx.fillRect(ax, by - 1, bx - ax, 1); vctx.fillRect(ax, ay, 1, by - ay); vctx.fillRect(bx - 1, ay, 1, by - ay);
        vctx.fillStyle = '#4a3018';
        for (let x = ax; x <= bx; x += 4) { vctx.fillRect(x, ay - 2, 1, 3); vctx.fillRect(x, by - 3, 1, 3); }
        for (let y = ay; y <= by; y += 4) { vctx.fillRect(ax, y - 2, 1, 3); vctx.fillRect(bx - 1, y - 2, 1, 3); }
      }
    }
  }
}
// Llamas de la hoguera: delante de quien está detrás del fuego y detrás de quien está delante
function drawCampFlames(g, t){
  const fx = g.fx * T + 2, fy = g.fy * T + 1;
  for (let k = 0; k < 5; k++) {
    const h = 2 + Math.round((Math.sin(t / 90 + k * 1.7) + 1) * 1.6 + h2(k, t / 120 | 0, 140) * 2);
    for (let s = 0; s < h; s++) {
      const r = s / h; vctx.fillStyle = r < .35 ? '#fff0a0' : r < .7 ? '#ffa030' : '#e05020';
      vctx.fillRect(fx - 2 + k, fy - s, 1, 1);
    }
  }
  redrawFront(fx - 6, fx + 6, fy - 12, g.fy * T + 3);
}
function drawVillageFx(t){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    drawWellsMills(g, t);
    drawTorches(g, t);
    if (snowA) for (const b of buildingsOf(g)) {
      const o = world.objs[b]; if (!o) continue;
      const sn = Math.max(snowA[b], snowA[b - W] || 0, snowA[b - 2 * W] || 0); if (sn < .2) continue;
      const sp = objSprite(o), left = (b % W) * T + 2 + o.ox - sp.ax, base = ((b / W) | 0) * T + 3 + o.oy, top = base - sp.height + 1;
      if (left > x1 || left + sp.width < x0 || base < y0 || top > y1) continue;
      vctx.globalAlpha = Math.min(1, (sn - .2) * 2.5); vctx.drawImage(snowCap(sp), left, top); vctx.globalAlpha = 1;
      redrawFront(left, left + sp.width, top, base);
    }
    if (nationOf(g).flag && g.hall != null && world.objs[g.hall]) {
      const o = world.objs[g.hall], sp = objSprite(o), left = (g.hall % W) * T + 2 + o.ox - sp.ax, top = ((g.hall / W) | 0) * T + 3 + o.oy - sp.height + 1;
      drawFlag(nationOf(g).flag, left + 24, top + 1, 15, 10, 1, t);
    }
    // Hoguera encendida: llamas que parpadean y algo de humo
    const fx = g.fx * T + 2, fy = g.fy * T + 1;
    if (fx < x0 - 10 || fx > x1 + 10 || fy < y0 - 20 || fy > y1 + 10 || !world.objs[g.fy * W + g.fx]) continue;
    if (g.fireOut) { // apagada: brasas mojadas que echan un hilo de humo
      if (Math.random() < .03) smoke.push({ x:fx + (Math.random() - .5) * 2, y:fy - 2, vx:windAt(fx, fy)[0] * .3, vy:-3 - Math.random() * 2, r:1, life:0, max:1.5 + Math.random() });
      continue;
    }
    vctx.fillStyle = 'rgba(255,170,60,.18)'; vctx.fillRect(fx - 5, fy - 5, 11, 8);
    // Las llamas se pintan junto con los aldeanos, en su orden de profundidad (ver drawVillagers)
    if (Math.random() < .08) smoke.push({ x:fx + (Math.random() - .5) * 2, y:fy - 5, vx:windAt(fx, fy)[0] * .5, vy:-5 - Math.random() * 4, r:1, life:0, max:2 + Math.random() * 2 });
  }
}
// Panel de aldeas (población, almacén, campos, ganado y lo que han aprendido)
function buildsOf(g){
  const ws = wellsOf(g), mill = g.mill != null && world.objs[g.mill];
  return (ws.length ? ` · ${ws.length} pozo${ws.length > 1 ? 's' : ''} (${Math.round(ws.reduce((s, w) => s + w.q, 0) / ws.length * 100)} % de agua)` : '') + (mill ? ' · molino' : '') + (g.quarry != null && world.objs[g.quarry] ? ' · cantera' : '') + (g.planted ? ` · ${g.planted} árboles plantados` : '') + (bridges.some(b => b.vid === g.id && !b.pier) ? ` · ${bridges.filter(b => b.vid === g.id && !b.pier).length} puentes` : '') + (g.port ? ' · muelle y barca' : '') + (g.carts ? ` · ${g.carts} carro${g.carts > 1 ? 's' : ''}` : '');
}
function armsOf(g){
  const ps = villagers.filter(v => !v.dead && v.vid === g.id), sp = ps.filter(v => v.weapon === 'lanza').length, bw = ps.filter(v => v.weapon === 'arco').length;
  return sp + bw ? ` · ${sp} lanzas, ${bw} arcos` : '';
}
function dietMix(g){
  const ps = villagers.filter(v => !v.dead && v.vid === g.id), veg = ps.filter(v => v.diet < .2).length, car = ps.filter(v => v.diet > .8).length;
  return `${ps.length - veg - car} omnívoros${veg ? `, ${veg} vegetarianos` : ''}${car ? `, ${car} carnívoros` : ''}`;
}
function updateVillagePanel(){
  const el = $('aldeas'); if (!el) return;
  const live = villages.filter(g => popOf(g) > 0);
  el.innerHTML = live.length ? live.map(g => {
    const farms = [...farmMap.values()].filter(f => f.vid === g.id), ripe = farms.filter(f => f.st === 'madura').length, dead = farms.filter(f => f.st === 'muerta').length;
    const herd = penAnimals(g), learned = Object.entries(g.learn).filter(([, L]) => L.pref != null).map(([sp, L]) => `${ANIMALS[sp].n.toLowerCase()}s ${L.pref < -4 ? 'del frío' : L.pref > 4 ? 'del calor' : 'de clima templado'}`);
    return `<li>${g.flagUrl ? `<img src="${g.flagUrl}" alt="" width="24" height="16" style="image-rendering:pixelated;vertical-align:-1px;margin-right:5px">` : ''}<b>${g.name}</b> · ${popOf(g)} hab. · ${housesOf(g).length} casas<br><span class="sub">${g.hall != null && world.objs[g.hall] ? 'Ayuntamiento · ' : ''}Almacén (cabe ${capOf(g)} de cada) · comida ${Math.floor(g.food)} (${Math.floor(g.meat || 0)} de carne y pescado) · ${dietMix(g)}${armsOf(g)}${buildsOf(g)} · madera ${g.wood} · piedra ${g.stone} · campos ${farms.length} (${ripe} maduros${dead ? `, ${dead} perdidos` : ''}) · ganado ${herd.length}${learned.length ? `<br>Han aprendido: ${learned.join(', ')}` : ''}${econLine(g)}${faithLine(g)}</span></li>`;
  }).join('') : '<li class="empty">Aún no hay aldeas</li>';
}
function villagerInfo(v){
  const age = (yearT - v.born) / YEAR, g = villageById(v.vid);
  const job = { granero:'construyendo el granero', ahumadero:'construyendo el ahumadero', lenera:'construyendo la leñera', postas:'construyendo la casa de postas', conservar:'haciendo conservas', chabola:'levantando una chabola', refugio:'resguardándose de la lluvia', paraguas:'cosiendo paraguas', cercar_volcan:'cercando el volcán', instalacion:'construyendo una instalación deportiva', esquilar:'esquilando las ovejas', feria:'en la feria', nadar:'nadando en la piscina', correr:'corriendo en la pista', universidad:'construyendo la universidad', consejo:'construyendo el palacio del Consejo', espias:'arreglando una casa discreta', investigar:'investigando en la universidad', mina:'abriendo una mina', extraer:'trabajando en la mina', tribunal:'construyendo el tribunal', carcel:'construyendo la cárcel', imprenta:'montando la imprenta', sindicato:'levantando la casa del sindicato', parlamento:'construyendo el parlamento', academia:'construyendo la academia de la lengua', tejer:'tejiendo tela', manga:'levantando la manga de viento', globo:'cosiendo un globo', cesta:'agrandando la cesta del globo', volar:'preparando el globo para volar', embarcar:'subiendo al globo', talar:'talando', picar:'picando piedra', bayas:'recogiendo bayas', pescar:'pescando', cazar:'cazando', sembrar:'sembrando', caña:'fabricando una caña', arma:'fabricando un arma', pozo:'construyendo un pozo', cantera:'abriendo una cantera', cantear:'sacando piedra de la cantera', molino:'construyendo un molino', plantar:'plantando un árbol', votar:'votando en la plaza', taberna:'construyendo la taberna', tazas:'tallando tazas de madera', ir_taberna:'tomando algo en la taberna', explorar:'preparando una expedición', catedral:'levantando el gran templo', escuela:'construyendo la escuela', 'enseñar':'dando clase en la escuela', clase:'en clase, en la escuela', fiesta:'de fiesta en la plaza', teatro:'construyendo el teatro', coliseo:'construyendo el coliseo', ver_teatro:'viendo una obra en el teatro', ver_coliseo:'viendo los juegos del coliseo', curar:'atendiendo a un enfermo', jugar:'jugando a la pelota', atleta:'compitiendo en los Juegos', espectador:'viendo los Juegos', emigrante:'emigrando', cuartel:'construyendo el cuartel', instruir:'instruyéndose en el cuartel', asedio:'construyendo una catapulta', lonja:'construyendo la lonja', vender:'vendiendo en el mercado', ampliar:'ampliando una casa', cementerio:'preparando el cementerio', hospital:'construyendo el hospital', curarse:'curándose en el hospital', ocio:'charlando en su tiempo libre', equipar:'forjando equipo para los soldados', minar:'sacando mineral de una veta', herreria:'construyendo la herrería', arboleda:'preparando una arboleda', bayal:'preparando un bayal', protesta:'manifestándose', golpe:'dando un golpe de estado', reprimir:'reprimiendo una protesta', detenido:'detenido', banco:'construyendo el banco', maravilla:'levantando una maravilla', asalto:'yendo a la guerra', guardia:'defendiendo su puesto', viaje:'de viaje', ritual:'yendo al ritual', ofrenda:'llevando una ofrenda', sacrificio:'llevando un animal al altar', quema:'haciendo una quema controlada', reparar:'reparando un edificio', derribar:'tirando abajo un edificio quemado', apagar:'apagando el fuego', antorcha:'poniendo una antorcha', alumbrar:'encendiendo las antorchas', comerciar:'comerciando en el mercado', encender:'encendiendo la hoguera', orar:'rezando', altar:'levantando un altar', templo:'construyendo el templo', monumento:'tallando una estatua', mercado:'montando el mercado', dormir:'yendo a dormir', torre:'construyendo una torre', muralla:'levantando la muralla', ayuntamiento:'construyendo el ayuntamiento', almacen:'construyendo un almacén', puente:'construyendo un puente', muelle:'construyendo un muelle', barca:'pescando en barca', carro:'construyendo un carro', montar:'yendo a por un caballo', campo:'marcando un campo', arar:'arando', cosechar:'cosechando', construir:'construyendo una casa', cercar:'haciendo un cercado', capturar:'trayendo un animal', pasear:'paseando', beber:'yendo a beber', comer:'comiendo', volver:'volviendo a la aldea', trabajando:'trabajando' };
  const beast = v.foe && !v.foe.dead ? (v.foe.sp === 'oso' ? 'un oso' : 'un lobo') : null;
  const doing = v.sleep ? 'durmiendo' : beast ? (v.weapon && age >= ADULT_H ? `luchando contra ${beast}` : `huyendo de ${beast}`) : v.task ? (v.task.k === 'trabajando' ? job[v.task.job] || 'trabajando' : job[v.task.k] || v.task.k) : 'descansando';
  return `<b>${v.name}</b> · ${v.sex === 'h' ? 'hombre' : 'mujer'}${age < ADULT_H ? ' (niño)' : v.oficio ? `, ${v.oficio}${v.sex === 'm' && /or$/.test(v.oficio) ? 'a' : ''}` : ''} · ${age.toFixed(1).replace('.', ',')} años · ${doing}${g ? ` · de ${g.name}` : ''} · ${dietName(v)}${v.mal ? ' (mal alimentado)' : ''}${v.rod ? ' · con caña' : ''}${v.weapon ? ` · con ${v.weapon}${v.shield ? ' y escudo' : ''}${v.armor ? `, ${GEAR_TXT[v.armor]}` : ''}` : ''}${v.swims === false ? ' · no sabe nadar' : ''}${v.mount ? ` · a caballo${v.cart ? ' con carro' : ''}` : ''}${v.boat ? ' · en barca' : ''}${g && g.coin && v.money ? ` · ${v.money} ${coinPl(g)}` : ''}${v.hp < .95 ? ` · herido (${Math.round(v.hp * 100)} %)` : ''} · comida ${Math.round(v.food * 100)} % · agua ${Math.round(v.water * 100)} %`;
}
