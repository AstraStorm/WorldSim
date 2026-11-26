// World Sim · La aviación: aeródromo y planeadores (no sustituyen a los dirigibles: conviven)
// ================= Aviación =================
// · Nuevo descubrimiento: «la aviación» (combustión + aeronáutica)
// · Un pueblo de 30 o más lo levanta a las afueras: pista, torre, hangar y manga de viento (hierro, madera, piedra y
//   combustible). Tiene uno o dos planeadores (dos si pasa de 70 habitantes)
// · Vuelos: de reconocimiento (cartografía mucho más deprisa que los globos), de correo a un pueblo amigo (mejor relación)
//   y, en guerra, a bombardear (bombas que caen sobre los edificios del enemigo). Los arqueros y mosqueteros les disparan
// · Despegue: carrera por la pista, sube (más grande y con la sombra alejándose) y vuelve a aterrizar. Hélice girando
// · Vuelos de pasajeros entre dos ciudades amigas con aeródromo: aterrizan en la otra, hacen escala y vuelven. Los viajeros
//   comercian, traen ideas (ciencia) y mejoran la relación; algunos se quedan a vivir allí y otros vienen de vuelta
// · Visitas oficiales en avión: si las dos capitales tienen aeródromo, el líder vuela con su escolta (más deprisa que en globo)
(() => { if (DISCOVERIES.some(d => d.k === 'aviacion')) return; const i = DISCOVERIES.findIndex(d => d.k === 'combustion');
  DISCOVERIES.splice(i + 1, 0, { k:'aviacion', txt:'la aviación', cost:140, eff:'aeródromos y planeadores: reconocimiento, correo y, en guerra, bombardeos', req:['combustion', 'aeronautica'].filter(k => DISCOVERIES.some(d => d.k === k)) });
  if (typeof SCI_REQ === 'object') SCI_REQ.aviacion = ['combustion', 'aeronautica']; })();
BLD.add('air'); BUILD_DIMS.air = [13, 13]; KIND_DIMS.aerodromo = [13, 13];
OBJ['air:aerodromo'] = ['Aeródromo', 'house', 0];
Object.assign(BLD_DESC, { air:'Aeródromo: pista, torre de control y hangar; de aquí despegan los planeadores' });
Object.assign(BLD_TYPE, { air:'Transporte' });
let planes = [];
const hasAirfield = g => g.airfield != null && world.objs[g.airfield] && world.objs[g.airfield].key === 'air:aerodromo';
const stripOf = g => { const x = (g.airfield % W) * T + 2, y = ((g.airfield / W) | 0) * T + 3; return { x0:x - 56, x1:x + 56, y:y - 17 }; }; // la pista de baldosas, de punta a punta
let airT = 0;
SYSTEMS.push(dt => {
  if (!world || (airT -= dt) > 0) return; airT = 3;
  for (const g of liveTowns()) {
    if (!knowsSci(g, 'aviacion')) continue;
    if (!hasAirfield(g)) {
      if (popOf(g) < 30 || (g.iron || 0) < 10 || g.wood < 30 || g.stone < 20 || (g.airFail || -1e9) > yearT - DAY_LEN / 3) continue;
      const s = typeof plantSite === 'function' ? farSite(g, 13, 13) : null; if (!s) { g.airFail = yearT; continue; }
      clearRocks(s[0] - 13, s[1] - 13, s[0] + 13, s[1] + 1);
      if (!tileFree(s[0], s[1]) || buildingClash(s[0], s[1], 'aerodromo')) { g.airFail = yearT; continue; }
      const i = s[1] * W + s[0]; for (let yy = s[1] - 13; yy <= s[1]; yy++) for (let xx = s[0] - 13; xx <= s[0] + 13; xx++) farmMap.delete(yy * W + xx);
      world.objs[i] = { key:'air:aerodromo', v:0, ox:0, oy:0, vid:g.id }; g.airfield = i; g.iron -= 10; g.wood -= 30; g.stone -= 20;
      composeRegion(s[0] - 18, s[1] - 18, s[0] + 18, s[1] + 4); addEffect(s[0] * T + 2, s[1] * T + 3, 'poof'); connect(g, s[0], s[1]);
      notify(`${g.name} inaugura su aeródromo: pista, torre y hangar para sus planeadores`, { x:s[0] * T, y:s[1] * T }); continue;
    }
    // Un vuelo (si hay planeador libre, combustible y buen tiempo)
    const mine = planes.filter(p => p.g === g.id); if (mine.length >= (popOf(g) > 70 ? 2 : 1) || isNight() || (g.planeT || 0) > yearT || ((g.fuel || 0) < 1 && (g.coal || 0) < 2)) continue;
    const m = planeMission(g); if (!m) continue;
    const crew = m.kind === 'pasajeros' ? villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === g.id && u !== g.leader && ageOf(u) >= ADULT_H && !u.weapon && !(u.task && ['asalto', 'detenido', 'guardia'].includes(u.task.k))).sort(() => Math.random() - .5).slice(0, popOf(g) > 70 ? 6 : 4) : [];
    if (m.kind === 'pasajeros' && crew.length < 2) continue;
    launchPlane(g, m, crew);
    if (m.kind === 'pasajeros' && !g.paxMsg) { g.paxMsg = true; notify(`Primer vuelo de pasajeros de ${g.name} a ${villageById(m.to).name}: ${crew.length} viajeros`, { x:g.fx * T, y:g.fy * T }); }
  }
  // (quien quedó «en el avión» sin avión, p. ej. al cargar una partida, vuelve a casa)
  for (const u of villagers) if (u.inPlane && !u.dead && !planes.some(p => p.crew && p.crew.includes(u))) { u.inPlane = false; u.away = false; u.task = null; u.migrant = null; }
});
const planeCap = g => popOf(g) > 70 ? 2 : 1;
function launchPlane(g, m, crew){
  if ((g.fuel || 0) >= 1) g.fuel -= 1; else g.coal -= 2; g.planeT = yearT + 25;
  for (const u of crew) { releaseTask(u); dismount(u); u.task = { k:'viaje' }; u.away = true; u.sleep = false; u.inPlane = true; }
  const st = stripOf(g); planes.push({ g:g.id, at:g.id, m, crew, x:st.x0 + 8, y:st.y, alt:0, phase:'pista', t:0, ang:0, hp:1, bombs:m.kind === 'bombardeo' ? 4 : 0 });
  if (!g.planeMsg) { g.planeMsg = true; notify(`¡Despega el primer planeador de ${g.name}!`, { x:st.x0, y:st.y }); }
}
// Bajan del avión donde está (en tierra) y siguen con lo suyo; los que venían a quedarse, al pueblo nuevo
function unboard(p, x, y){
  for (const u of p.crew || []) if (!u.dead) { u.inPlane = false; u.away = false; u.task = null; u.x = x + (Math.random() - .5) * 10; u.y = y + 6;
    if (u.migrant != null) { const to = villageById(u.migrant), from = villageById(u.vid); u.migrant = null; if (to && popOf(to) && from && to !== from) { welcomeMigrant(u, from, to); u.vid = to.id; u.home = null; floats.push({ x:u.x, y:u.y - 12, txt:'¡nuevo hogar!', col:'#c8e0a0', life:0 }); } } }
  p.crew = [];
}
// Un sitio lejos de la ciudad (como la central): reutiliza la búsqueda de la electricidad con otra medida
function farSite(g, hw, hh){ // (alrededor de la ciudad y, si no cabe, de las demás ciudades de su nación)
  for (const o of [g, ...liveTowns().filter(q => q !== g && nationOf(q) === nationOf(g))]) { const s0 = farSite1(o, g, hw, hh); if (s0) return s0; }
  return null;
}
// Como clearable, pero las piedras sueltas también se pueden quitar (para lo grande: aeródromo, lanzadera, silos...)
function clearableRocks(x0, y0, x1, y1){
  if (x0 < 0 || y0 < 0 || x1 >= W || y1 >= H) return false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x, b = world.biome[i], o = world.objs[i]; if (WATER[b] || b === B.LAVA || bridgeSet.has(i) || isFlooded(i)) return false; if (o && !['tree', 'berry', 'stone'].includes(OBJ[o.key][1]) && !o.key.startsWith('pylon:')) return false; } // (las torres de la luz se apartan: la red se rehace por fuera)
  return true;
}
function clearRocks(x0, y0, x1, y1){ let grid = false; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x, o = world.objs[i]; if (o && o.key.startsWith('pylon:')) { delete world.objs[i]; grid = true; } else if (o && ['tree', 'berry', 'stone'].includes(OBJ[o.key][1])) delete world.objs[i]; }
  if (grid) for (const g of villages) if ((g.pylons || []).some(p => !world.objs[p.i])) g.gridV = 0; } // (la red de ese pueblo se vuelve a tender, rodeando lo nuevo)
// Las instalaciones grandes de todas las ciudades (aeródromo, lanzadera, central, refinería, silos, parque de renovables):
// una nueva no puede pisar ninguna (con 2 casillas de margen)
function bigClash(x, y, hw, hh){
  for (const o of villages) for (const [i, w, h] of [[o.airfield, 13, 13], [o.spacePad, 6, 10], [o.plant, 6, 7], [o.refinery, 6, 7], [o.renewAt, 17, 8], ...(o.silos || []).map(s => [s.i, 3, 4])]) {
    if (i == null) continue; const bx = i % W, by = (i / W) | 0;
    if (!(x + hw + 2 < bx - w || x - hw - 2 > bx + w || y + 3 < by - h || y - hh - 2 > by + 1 + (w === 16 ? 6 : 0))) return true;
  }
  return false;
}
// ¿Hay casas o edificios en ese rectángulo? (las instalaciones grandes, con margen: nunca pegadas al pueblo)
function nearBuildings(x0, y0, x1, y1){ for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) { const o = world.objs[y * W + x]; if (o && BLD.has(o.key.split(':')[0]) && !/^(pylon|wind|solar):/.test(o.key)) return true; } return false; }
const wallNear = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) if (wallSet.has(y * W + x)) return true; return false; }; // (ni pegado a una muralla)
const pathCount = (x0, y0, x1, y1) => { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pathMap.has(y * W + x)) n++; return n; }; // (un camino corto que cruce el sitio, se puede tapar)
function farSite1(c, g, hw, hh){
  const towns = liveTowns().filter(q => q !== g), cx = Math.round(c.fx), cy = Math.round(c.fy);
  for (let r = 16; r <= 150; r += 3) { const nk = Math.max(48, Math.round(r * 2)); for (let k = 0; k < nk; k++) { // (más puntos cuanto más lejos: que no se escape ningún hueco)
    const a2 = k / nk * Math.PI * 2, x = Math.round(cx + Math.cos(a2) * r), y = Math.round(cy + Math.sin(a2) * r * .85);
    if (x < hw + 4 || y < hh + 4 || x >= W - hw - 4 || y >= H - 4 || towns.some(o => nationOf(o) !== nationOf(g) && Math.hypot(o.fx - x, o.fy - y) < 25)) continue;
    if (bigClash(x, y, hw, hh) || !clearableRocks(x - hw, y - hh, x + hw, y + 1) || nearBuildings(x - hw - 2, y - hh - 2, x + hw + 2, y + 3) || plotIn(x - hw - 3, y - hh - 3, x + hw + 3, y + 4) || wallNear(x - hw - 2, y - hh - 2, x + hw + 2, y + 3) || pathCount(x - hw, y - hh, x + hw, y) > 10 || plazaIn(x - hw, y - hh, x + hw, y) || penOverlap(null, x - hw, y - hh, x + hw, y + 1) || buildingClash(x, y, 'aerodromo')) continue;
    return [x, y];
  }
  }
  return null;
}
function planeMission(g){
  const foes = liveTowns().filter(o => o !== g && atWar(g, o) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 300);
  if (foes.length) { const o = foes[Math.floor(Math.random() * foes.length)]; return { kind:'bombardeo', to:o.id, tx:o.fx * T, ty:o.fy * T }; }
  if (hasPaper(g) && Math.random() < .5) { const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160; return { kind:'reconocimiento', tx:clamp(g.fx + Math.cos(a) * d, 5, W - 5) * T, ty:clamp(g.fy + Math.sin(a) * d, 5, H - 5) * T }; }
  const fr = liveTowns().filter(o => o !== g && (rels.get(relKey(g, o)) || {}).known && !atWar(g, o)); if (!fr.length) return null;
  const air = fr.filter(o => hasAirfield(o) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 400); // con aeródromo: se puede aterrizar allí
  if (air.length && Math.random() < .6) { const o = air[Math.floor(Math.random() * air.length)]; return { kind:'pasajeros', to:o.id, land:true }; }
  const o = fr[Math.floor(Math.random() * fr.length)]; return { kind:'correo', to:o.id, tx:o.fx * T, ty:o.fy * T };
}
SYSTEMS.push(dt => {
  if (!planes.length) return;
  for (const p of planes) {
    const g = villageById(p.g); if (!g || !popOf(g) || !hasAirfield(g)) { p.done = true; unboard(p, p.x, p.y); continue; }
    let dest = p.m.land ? villageById(p.m.to) : null;
    if (p.m.land && (!dest || !popOf(dest) || !hasAirfield(dest) || atWar(g, dest))) { // (el destino ya no existe o hay guerra: vuelven a casa)
      p.m.land = false; dest = null; if (p.phase === 'escala') { unboard(p, p.x, p.y); p.done = true; continue; }
      if (p.phase === 'ida') p.phase = 'vuelta'; if (p.phase === 'aterriza' && p.at !== p.g) { p.phase = 'vuelta'; p.alt = Math.max(p.alt, 20); } p.back = true;
    }
    const here = villageById(p.at), st = stripOf(here && hasAirfield(here) ? here : g); p.t += dt;
    for (const u of p.crew || []) if (!u.dead) { u.x = p.x; u.y = p.y; }
    if (p.phase === 'escala') { if (p.t > 8) { planeTurn(p, g, dest); p.x = st.x0 + 8; p.y = st.y; p.phase = 'pista'; p.t = 0; p.back = true; } continue; } // escala: bajan unos, suben otros
    if (p.phase === 'pista') { p.x += dt * (6 + p.t * 16); p.ang = 0; if (p.x > st.x0 + 70) p.phase = 'sube'; continue; } // carrera de despegue por la pista
    if (p.phase === 'sube' || p.phase === 'ida' || p.phase === 'vuelta') {
      if (p.phase === 'sube') { p.alt = Math.min(40, p.alt + dt * 12); if (p.alt >= 40) p.phase = p.back ? 'vuelta' : 'ida'; }
      const sH = stripOf(g), sD = dest ? stripOf(dest) : null;
      const [tx, ty] = p.phase === 'vuelta' || (p.phase === 'sube' && p.back) ? [sH.x0 - 70, sH.y] : sD ? [sD.x0 - 70, sD.y] : [p.m.tx, p.m.ty], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp = 46 * dt;
      p.ang = Math.atan2(dy, dx);
      if (d > sp) { p.x += dx / d * sp; p.y += dy / d * sp; }
      else if (p.phase === 'vuelta') { p.phase = 'aterriza'; p.at = p.g; }
      else if (p.phase === 'ida' && dest) { p.phase = 'aterriza'; p.at = dest.id; }
      else if (p.phase === 'ida') planeArrive(p, g);
      if (p.m.kind === 'reconocimiento' && Math.random() < dt * 2 && chartMark(chartOf(g), p.x, p.y, 4, Math.min(250, cartoConf(g) + 40))) g.chartVer++;
      if (p.m.kind === 'bombardeo' && p.phase === 'ida' && p.bombs > 0 && d < 60 && Math.random() < dt * 2.5) dropBomb(p, g);
      planeShot(p, g, dt);
      continue;
    }
    if (p.phase === 'aterriza') { p.ang = 0; p.alt = Math.max(0, p.alt - dt * 14); p.x += dt * (p.alt > 0 ? 30 : Math.max(4, 30 - (p.x - st.x0) * .35)); p.y += (st.y - p.y) * Math.min(1, dt * 2); if (p.alt <= 0 && p.x > st.x1 - 20) { if (p.at !== p.g && dest) { p.phase = 'escala'; p.t = 0; planeLanded(p, g, dest); } else { p.done = true; unboard(p, p.x, p.y); } } } // toca tierra al principio de la pista y frena
  }
  planes = planes.filter(p => !p.done);
});
// Aterriza en la otra ciudad: los pasajeros comercian, cuentan lo que saben y algunos se quedan; la visita oficial, a lo suyo
function planeLanded(p, g, o){
  const at = { x:p.x, y:p.y }, r = relOf(g, o);
  if (p.m.kind === 'visita') { stateVisitArrive(p.crew.find(u => u === g.leader) || null, p.crew, g, o); return; }
  r.v = clamp(r.v + 4, -100, 100); if (Math.random() < .5) doTrade(g, o); spreadScience(g, o);
  for (const x of [g, o]) { const ec = ecOf(x); if (ec) ec.treas += (p.crew || []).length; } // los billetes y lo que gastan allí
  const stay = (p.crew || []).filter(u => !u.dead && Math.random() < (houseCap(o) > popOf(o) + 2 ? .25 : .08));
  for (const u of stay) { p.crew = p.crew.filter(q => q !== u); u.inPlane = false; u.away = false; u.task = null; u.home = null; u.x = p.x; u.y = p.y + 6; welcomeMigrant(u, g, o); u.vid = o.id; floats.push({ x:u.x, y:u.y - 12, txt:'¡nuevo hogar!', col:'#c8e0a0', life:0 }); }
  if (stay.length && !o.airMigMsg) { o.airMigMsg = true; notify(`Llegan en avión desde ${g.name} y ${stay.length === 1 ? 'una persona se queda' : `${stay.length} se quedan`} a vivir en ${o.name}`, at); }
  else if (!g.paxLandMsg) { g.paxLandMsg = true; notify(`El vuelo de ${g.name} aterriza en ${o.name}: los viajeros hacen negocios, cuentan novedades y vuelven`, at); }
}
// Antes de volver: suben viajeros de la ciudad que los recibe que quieran irse a vivir a la otra (si allí hay sitio)
function planeTurn(p, g, o){
  if (p.m.kind !== 'pasajeros' || !o) return;
  const room = (popOf(g) > 70 ? 6 : 4) - (p.crew || []).length; if (room <= 0 || houseCap(g) <= popOf(g) + 2) return;
  const go = villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === o.id && u !== o.leader && ageOf(u) >= ADULT_H && !u.weapon && !(u.task && ['asalto', 'detenido'].includes(u.task.k)) && Math.random() < .12).slice(0, Math.min(room, 2));
  for (const u of go) { releaseTask(u); dismount(u); u.task = { k:'viaje' }; u.away = true; u.inPlane = true; u.migrant = g.id; p.crew.push(u); }
}
function planeArrive(p, g){
  const o = villageById(p.m.to);
  if (p.m.kind === 'correo' && o) { const r = relOf(g, o); r.v = clamp(r.v + 3, -100, 100); if (!g.mailMsg) { g.mailMsg = true; notify(`El planeador de ${g.name} lleva el correo a ${o.name}: las cartas llegan en un momento`, { x:p.x, y:p.y }); } }
  if (p.m.kind === 'reconocimiento' && !g.reconMsg) { g.reconMsg = true; notify(`El planeador de ${g.name} cartografía desde el aire tierras lejanas`, { x:p.x, y:p.y }); }
  p.phase = 'vuelta';
}
// Bombas del planeador: caen donde está y dañan los edificios de alrededor
function dropBomb(p, g){
  p.bombs--; const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  addEffect(p.x, p.y, 'poof'); if (typeof snd === 'function') snd('boom', p.x, p.y, .3);
  const o = villageById(p.m.to); if (!o) return;
  for (const b of buildingsOf(o)) if (world.objs[b] && Math.hypot(b % W - tx, ((b / W) | 0) - ty) < 6) damageBuilding(b, .35);
  for (const v of villagers) if (!v.dead && v.vid === o.id && Math.hypot(v.x - p.x, v.y - p.y) < 14 && Math.random() < .3) killVillager(v, 'guerra');
  if (!p.bombMsg) { p.bombMsg = true; notify(`¡El planeador de ${g.name} bombardea ${o.name}!`, { x:p.x, y:p.y }); }
}
// Los del suelo le disparan (arcos, ballestas, mosquetes)
function planeShot(p, g, dt){
  if (p.alt < 10 || !(p.m.kind === 'bombardeo')) return;
  for (const v of villagers) { if (v.dead || !v.weapon || !isRanged(v.weapon) || !enemyOfVil(v, g) || Math.hypot(v.x - p.x, v.y - p.y) > 40) continue; if (Math.random() < dt * (isGun(v.weapon) ? .35 : .12)) { p.hp -= isGun(v.weapon) ? .25 : .12; if (p.hp <= 0) { p.done = true; addEffect(p.x, p.y, 'poof'); notify(`¡Derriban el planeador de ${g.name}!`, { x:p.x, y:p.y }); return; } } }
}
const enemyOfVil = (v, g) => { const o = villageById(v.vid); return o && o !== g && atWar(o, g); };
// ---- Dibujo (por encima de todo: van por el aire) ----
const PLANE_DIR = a => { const k = (Math.round(a / (Math.PI / 4)) + 8) % 8; return ['e', 'se', 's', 'so', 'o', 'n', 'n', 'n'][k]; };
// dónde está la hélice en cada vista (fracción del dibujo) y cómo se ve: de frente gira entera, de lado es una raya, en diagonal se aplasta
const PROP_AT = { s:[.49, .48, 1], e:[.97, .4, 0], o:[.03, .42, 0], so:[.36, .5, .6], se:[.64, .5, .6] };
// El planeador, pintado con el color de su nación (se guarda una copia por color y vista)
const liveryC = new Map();
function planeLivery(s, k, col){
  const key = k + col.join(','); let c = liveryC.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d');
  x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .42; x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; x.fillRect(0, 0, c.width, c.height);
  liveryC.set(key, c); return c;
}
function drawPlanes(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const p of planes) {
    if (p.x < x0 - 40 || p.x > x1 + 40 || p.y < y0 - 80 || p.y > y1 + 30) continue;
    const g = villageById(p.g), n = g ? nationOf(g) : null, k = PLANE_DIR(p.ang), s0 = artFrame(`plane:${k}`); if (!s0) continue;
    const s = n ? planeLivery(s0, k, villageColor(n)) : s0; // (pintado con el color de su nación)
    const sc = 1 + p.alt / 40 * .25, w = s.width * sc, h = s.height * sc, x = p.x, y = p.y - p.alt;
    // la sombra: pegada a las ruedas en tierra; en el aire, más pequeña, más clara y desplazada
    const sw = w * (p.alt > 0 ? .42 - p.alt / 400 : .46); vctx.fillStyle = `rgba(0,0,0,${p.alt > 0 ? .26 - p.alt / 220 : .38})`; vctx.beginPath(); vctx.ellipse(p.x + p.alt * .3, p.y, sw, p.alt > 0 ? 2.5 : 1.6, 0, 0, Math.PI * 2); vctx.fill();
    // inclinación: en tierra, con la cola apoyada (morro algo arriba); al despegar, morro arriba; en vuelo, recto; al aterrizar, algo arriba
    const side = k === 'e' ? 1 : k === 'o' ? -1 : 0, pitch = !side ? 0 : p.phase === 'sube' ? -.2 : p.phase === 'aterriza' ? (p.alt > 0 ? -.1 : -.07) : p.alt <= 0 ? -.07 : 0;
    const L = Math.round(x - w / 2), Tp = Math.round(y - h);
    vctx.save(); if (pitch) { const wx = x + side * w * .2; vctx.translate(wx, y); vctx.rotate(pitch * side); vctx.translate(-wx, -y); } // (gira sobre las ruedas delanteras: siguen tocando el suelo)
    vctx.drawImage(s, L, Tp + 1, Math.round(w), Math.round(h));
    const pa = PROP_AT[k];
    if (pa) { // la hélice girando
      const px = L + pa[0] * w, py = Tp + pa[1] * h, fr = Math.floor(now / 45) % 4;
      if (pa[2] === 0) { const f = artFrame('prop:0'); if (f) { const hh = f.height * sc * (fr % 2 ? .45 : 1); vctx.drawImage(f, Math.round(px - 1), Math.round(py - hh / 2), Math.max(1, Math.round(f.width * sc * .6)), Math.round(hh)); } }
      else { const f = artFrame(`prop:${fr}`); if (f) { const fw = f.width * sc * pa[2], fh = f.height * sc; vctx.drawImage(f, Math.round(px - fw / 2), Math.round(py - fh / 2), Math.max(1, Math.round(fw)), Math.round(fh)); } }
    }
    if (n) { // la bandera en la cola (de lado) o la escarapela en las alas (de frente o en diagonal)
      const f = n.flag || g.flag, [r0, g0, b0] = villageColor(n);
      if (side) { const fx = Math.round(L + (side > 0 ? .1 : .78) * w), fy = Math.round(Tp + .12 * h); if (f) vctx.drawImage(flagCloth(f, 6, 4), fx, fy, Math.max(4, Math.round(6 * sc)), Math.max(3, Math.round(4 * sc))); else { vctx.fillStyle = `rgb(${r0},${g0},${b0})`; vctx.fillRect(fx, fy, 5, 3); } }
      else { const rr = Math.max(1.6, 2.2 * sc); for (const fx of [.22, .78]) { const cx = L + fx * w, cy = Tp + .5 * h; vctx.fillStyle = '#f4f0e6'; vctx.beginPath(); vctx.arc(cx, cy, rr, 0, Math.PI * 2); vctx.fill(); vctx.fillStyle = `rgb(${r0},${g0},${b0})`; vctx.beginPath(); vctx.arc(cx, cy, rr * .6, 0, Math.PI * 2); vctx.fill(); } }
    }
    vctx.restore();
    if (p.hp < .6) chips.push({ x, y:y - h / 2, vx:(Math.random() - .5) * 4, vy:-3, life:0, max:1, col:'rgba(60,60,60,.6)' }); // tocado: echa humo
  }
}
{ const base = drawAir; drawAir = function(t){ base.apply(this, arguments); drawPlanes(performance.now()); }; }
// Los aeródromos de antes (más pequeños) se levantan de nuevo con las piezas nuevas, en un sitio donde quepan
SYSTEMS.push(() => { if (!world) return; for (const g of villages) { if (g.airV === 2) continue; g.airV = 2; if (g.airfield != null && world.objs[g.airfield] && world.objs[g.airfield].key === 'air:aerodromo') { const x = g.airfield % W, y = (g.airfield / W) | 0; delete world.objs[g.airfield]; g.airfield = null; g.airFail = -1e9; composeRegion(x - 18, y - 18, x + 18, y + 4); } } });

// Visitas oficiales en avión: si las dos ciudades tienen aeródromo y hay un planeador libre, el líder vuela con su escolta
{ const base = stateVisit; stateVisit = function(g, o){
  if (hasAirfield(g) && hasAirfield(o) && !isNight() && planes.filter(p => p.g === g.id).length < planeCap(g) && ((g.fuel || 0) >= 1 || (g.coal || 0) >= 2) && g.leader && !g.leader.dead) {
    const esc = villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === g.id && u.weapon && !u.militia && u !== g.leader && ageOf(u) >= ADULT_H && !(u.task && ['asalto', 'detenido'].includes(u.task.k))).slice(0, 3);
    launchPlane(g, { kind:'visita', to:o.id, land:true }, [g.leader, ...esc]);
    notify(`¡Visita oficial! ${capFirst(leaderTitle(g))} ${g.leader.name} de ${g.name} vuela a ${o.name} en avión, con ${esc.length} de escolta`, { x:g.fx * T, y:g.fy * T });
    spiesHear(g, o); return;
  }
  return base.apply(this, arguments);
}; }
