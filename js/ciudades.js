// World Sim · Naciones de varias ciudades: la capital funda ciudades nuevas por tierra
// ================= Ciudades nuevas =================
// · Hasta ahora una nación era un pueblo (y, si tenía muelle, alguna colonia al otro lado del mar). Ahora, cuando la
//   capital crece y le falta sitio, manda a un grupo de familias a fundar una ciudad nueva en su propia tierra, a unas
//   decenas de casillas: es una provincia suya, con su lengua, su fe y su bandera
// · Así una nación grande acaba siendo una capital con varias ciudades alrededor (y, con el tiempo, un imperio)
// · La capital lleva corona en su nombre y la ciudad que pasa de 150 habitantes es una metrópolis
const provincesOf = n => villages.filter(o => o !== n && popOf(o) && nationOf(o) === n);
function cityTick(g, dt, people){
  if (nationOf(g) !== g) return;
  if ((g.cityT = (g.cityT ?? DAY_LEN * (.5 + Math.random())) - dt) > 0) return; g.cityT = DAY_LEN * .5;
  const pop = people.length, cities = provincesOf(g).filter(o => !o.colony).length, max = Math.min(5, Math.floor(pop / 35));
  if (pop < 40 || cities >= max || [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id))) return;
  if (pop < houseCap(g) - 2 && Math.random() < .6) return; // si aún tiene sitio, no hay prisa
  const s = citySite(g); if (!s) return;
  const adults = people.filter(u => ageOf(u) >= ADULT_H && !u.away && !u.boat && u !== g.leader && !u.slave && !inCamp(u) && !(u.task && BUSY_POL.includes(u.task.k)));
  // Van familias enteras: parejas con sus hijos
  const go = new Set();
  for (const u of adults.sort(() => Math.random() - .5)) { if (go.size >= 10) break; go.add(u); for (const k of [...(u.partners || []), ...(u.kids || [])]) if (!k.dead && k.vid === g.id && !k.away && k !== g.leader && go.size < 12) go.add(k); }
  const crew = [...go]; if (crew.length < 6) return;
  const c = makeVillage(s[0], s[1]); if (!c) return;
  if (s.old) adoptRuins(c, s.old); // sobre las ruinas de una ciudad suya que se quedó vacía
  c.spec = s.spec || siteSpec(c.fx, c.fy)[0];
  c.nation = g.id; c.province = { cap:g.id, born:yearT }; c.lang = g.lang; c.food += 40; c.wood += 30; c.stone = (c.stone || 0) + 10; g.food = Math.max(0, g.food - 40); g.wood = Math.max(0, g.wood - 30);
  c.faith = g.faith ? { ...g.faith, pantheon:[...(g.faith.pantheon || [])] } : null; if (g.coin) c.coin = g.coin;
  if (g.know) c.know = { ...g.know };
  const lead = crew[0]; releaseTask(lead); dismount(lead); lead.vid = c.id; lead.home = null; landAt(lead, c.fx * T + 2, c.fy * T + 8); // el fundador ya está allí; los demás, de camino
  for (const u of crew.slice(1)) { exile(u, g, c); u.arrived = null; }
  setTimeout(() => notify(`${g.name} funda una ciudad nueva en su territorio: ${c.name}${CITY_SPEC[c.spec] ? `, ciudad ${CITY_SPEC[c.spec][0]}` : ''}. ${crew.length} personas se mudan allí${cities + 1 >= 2 ? `; ya son ${cities + 2} ciudades` : ''}`, { x:c.fx * T, y:c.fy * T }), 3500);
  if (typeof addHero === 'function') setTimeout(() => addHero(g, lead, `fundó la ciudad de ${c.name}`), 4000);
}
// Dónde: tierra firme a 40-64 casillas de la capital, lejos de otros pueblos, sin cruzar el mar (se llega andando)
function citySite(g){
  const d0 = Math.max(40, (g.houses.length && typeof townRadius === 'function' ? townRadius(g) : 8) + 26); // (más lejos cuanto mayor es la ciudad: si no, una capital grande ya no encontraba sitio nunca)
  for (let k = 0; k < 160; k++) {
    const a = Math.random() * Math.PI * 2, d = d0 + Math.random() * 26, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .85);
    if (x < 10 || y < 10 || x >= W - 10 || y >= H - 10 || !tileFree(x, y) || volcDanger(x, y, 8)) continue;
    if (!townSpace(x, y)) continue; // lejos de todos los pueblos (humanos.js)
    let land = 0; for (let yy = y - 5; yy <= y + 5; yy++) for (let xx = x - 5; xx <= x + 5; xx++) if (!WATER[world.biome[yy * W + xx]]) land++; if (land < 100) continue;
    let sea = false; for (let j = 1; j < 20 && !sea; j++) { const f = j / 20, i = Math.round(g.fy + (y - g.fy) * f) * W + Math.round(g.fx + (x - g.fx) * f); if (world.biome[i] === B.SEA || world.biome[i] === B.DEEP) sea = true; }
    if (sea) continue;
    return [x, y];
  }
  return null;
}

// ---- Ciudades que no se quedan solo con los fundadores ----
// · Antes, a la ciudad nueva solo iban las 6-12 familias del principio: nadie más se mudaba (solo si en la capital había
//   gente sin casa y allí sobraban casas), en cuanto morían unos pocos quedaba casi vacía y se iban todos. Ahora, los
//   primeros días, la capital sigue mandando familias (con algo de madera para sus casas) mientras le sobre gente
// · Una ciudad joven con la capital fuerte detrás no se abandona: la capital la repuebla
// · Si aun así se queda vacía, la próxima ciudad que funde esa nación se levanta sobre sus ruinas (y aprovecha las casas
//   que siguen en pie, que se reparan) en vez de en otro sitio
const CITY_YOUNG = DAY_LEN * 8;
const youngCity = c => { const f = c.colony || c.province; return !!f && yearT - (f.born ?? c.born ?? 0) < CITY_YOUNG; }; // (también las colonias de ultramar: los colonos van en barco)
const goingTo = c => travelers.filter(t => t.kind === 'emigrante' && t.to === c.id && !t.done).length;
function cityFeedTick(n, people){
  if ((n.feedT || 0) > yearT) return; n.feedT = yearT + DAY_LEN * (.25 + Math.random() * .15);
  const pop = people.length; if (pop < 28) return;
  const kids = villages.filter(c => c !== n && !c.gone && c.nation === n.id && youngCity(c) && popOf(c) + goingTo(c) < 30 && (c.colony ? !!n.port : Math.hypot(c.fx - n.fx, c.fy - n.fy) < 130));
  if (!kids.length) return;
  const c = kids.sort((a, b) => popOf(a) + goingTo(a) - popOf(b) - goingTo(b))[0];
  const hs = new Set(housesOf(n)), free = u => u !== n.leader && !u.away && !u.boat && !u.slave && !u.compId && !u.ceo && !inCamp(u) && !(u.task && BUSY_POL.includes(u.task.k)) && !(u.task && ['asalto', 'viaje', 'golpe', 'detenido'].includes(u.task.k));
  const adults = people.filter(u => ageOf(u) >= ADULT_H && free(u)).sort((a, b) => ((a.home == null || !hs.has(a.home)) ? 0 : 1) - ((b.home == null || !hs.has(b.home)) ? 0 : 1) || Math.random() - .5); // los que no tienen casa, primero
  const goers = [], cap = Math.min(5, pop - 25);
  for (const u of adults) {
    if (goers.length >= cap) break; if (goers.includes(u)) continue;
    const fam = [u, partnerOf(u), ...(u.kids || [])].filter(x => x && !x.dead && x.vid === n.id && free(x) && !goers.includes(x));
    if (goers.length + fam.length > cap + 2) continue; goers.push(...fam);
  }
  if (!goers.length) return;
  for (const u of goers) exile(u, n, c);
  const wood = Math.min(12, Math.max(0, Math.floor((n.wood || 0) * .15))); n.wood -= wood; c.wood += wood;
  const W0 = world.feedMsg ||= {}, key = n.id + '>' + c.id;
  if (!(W0[key] > yearT)) { W0[key] = yearT + DAY_LEN * 1.5; notify(`${c.colony ? '⛵' : '🧺'} ${goers.length === 1 ? `${goers[0].name} deja` : `${goers.length} personas dejan`} ${n.name} para vivir en ${c.name}, ${c.colony ? 'la colonia de ultramar' : 'la ciudad nueva'}`, { x:c.fx * T, y:c.fy * T }); }
}
let feedClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (feedClock -= dt) > 0) return; feedClock = 5;
  const byV = new Map(); for (const v of villagers) if (!v.dead) { let L = byV.get(v.vid); if (!L) byV.set(v.vid, L = []); L.push(v); }
  for (const g of liveTowns()) if (nationOf(g) === g) { const ps = byV.get(g.id); if (ps) cityFeedTick(g, ps); }
  for (const g of liveTowns()) if (g.spec) citySpecTick(g);
  for (const g of liveTowns()) if (g.heritage && !g.heritage.fiesta && typeof addFiesta === 'function' && g.heritage.tryDay !== dayNum() && (g.heritage.tries = (g.heritage.tries || 0) + 1) <= 16) { g.heritage.tryDay = dayNum(); const nm = `Día de ${g.heritage.name}`; addFiesta(g, nm); g.heritage.fiesta = (g.fiestas || []).some(f => f.name === nm); } // (si hoy ya hay otra fiesta, lo intenta otro día) // (la ciudad que se levantó sobre unas ruinas)
} catch (e) { console.error(e); } });
// Una ciudad joven no vota irse mientras su capital pueda repoblarla
{ const base = smallTownTick; smallTownTick = function(g, dt, people){
  const n = nationOf(g); if (n !== g && youngCity(g) && popOf(n) >= 28) return;
  return base.apply(this, arguments);
}; }
// ---- Ciudades con oficio: minera, maderera, pesquera o agrícola ----
// · Al fundar, se miran varios sitios y se elige el que más da (mineral y roca, bosque, costa con peces, buena tierra con
//   agua dulce); la ciudad nace con ese oficio, saca algo más de lo suyo y manda lo que le sobra a la capital
const CITY_SPEC = { minera:['minera', 'stone', 'piedra'], maderera:['maderera', 'wood', 'madera'], pesquera:['pesquera', 'food', 'pescado'], agricola:['agrícola', 'food', 'grano'] };
function siteSpec(x, y){
  let min = 0, tree = 0, sea = 0, farm = 0, fresh = 0;
  for (let yy = y - 10; yy <= y + 10; yy++) for (let xx = x - 10; xx <= x + 10; xx++) {
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = yy * W + xx, b = world.biome[i], o = world.objs[i];
    if (b === B.SEA || b === B.SHALLOW) sea++; else if (b === B.LAKE || b === B.RIVER) fresh++; else if (b === B.GRASS || b === B.PLAINS) farm++;
    if (o) { const k = OBJ[o.key][1]; if (k === 'mineral') min += 3; else if (k === 'stone') min++; else if (k === 'tree') tree++; }
    if (b === B.HILLS || b === B.ROCK) min += .15;
  }
  const sc = { minera:min * 1.2, maderera:tree * .5, pesquera:sea * .12, agricola:farm * .1 * (fresh ? 1.4 : .6) };
  const best = Object.entries(sc).sort((p, q) => q[1] - p[1])[0]; return [best[0], best[1]];
}
{ const base = citySite; citySite = function(g){
  let best = null;
  for (let k = 0; k < 6; k++) { const p = base.apply(this, arguments); if (!p) break; const [spec, sc] = siteSpec(p[0], p[1]); if (!best || sc > best[1]) best = [p, sc, spec]; }
  if (!best) return null; const s = best[0]; s.spec = best[2]; return s;
}; }
function citySpecTick(c){
  const S = CITY_SPEC[c.spec]; if (!S || (c.specT || 0) > yearT) return; c.specT = yearT + DAY_LEN / 2;
  const pop = popOf(c), n = nationOf(c); if (pop < 6) return;
  const k = S[1], extra = Math.round((c.spec === 'minera' ? 2 : c.spec === 'maderera' ? 4 : 5) * Math.min(2, pop / 12));
  c[k] = (c[k] || 0) + extra; if (c.spec === 'minera' && Math.random() < .3) c.iron = (c.iron || 0) + 1;
  if (n === c || !popOf(n)) return; // (sin capital a la que mandar)
  const keep = Math.max(30, capOf(c) * .4), spare = Math.floor((c[k] || 0) - keep); if (spare < 8) return;
  const send = Math.min(spare, 40); c[k] -= send; n[k] = Math.min(capOf(n), (n[k] || 0) + send);
  const W0 = world.specMsg ||= {}; if (!(W0[c.id] > yearT)) { W0[c.id] = yearT + DAY_LEN * 3; notify(`📦 ${c.name}, la ciudad ${S[0]}, manda ${send} de ${S[2]} a ${n.name}`, { x:c.fx * T, y:c.fy * T }); }
}
{ const base = colonyCard; colonyCard = function(g){
  const S = CITY_SPEC[g.spec], out = base.apply(this, arguments);
  return S ? out + `<h4>Oficio</h4><div>Ciudad ${S[0]}: saca más ${S[2]} que las demás${nationOf(g) !== g ? ` y manda lo que le sobra a ${esc(nationOf(g).name)}` : ''}</div>` : out;
}; }

// Ruinas de una ciudad suya (o de su tierra) que se quedó vacía: ahí se funda la siguiente
function ownRuin(g){
  return villages.filter(o => o.gone && !o.reborn && !o.colony && !popOf(o) && (o.nation === g.id || (o.province && o.province.cap === g.id)) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 140 && townSpace(o.fx, o.fy) && !volcDanger(o.fx, o.fy, 8))
    .sort((a, b) => (b.goneT || 0) - (a.goneT || 0))[0] || null;
}
{ const base = citySite; citySite = function(g){
  const o = ownRuin(g);
  if (o) { const p = ringFind(o.fx, o.fy, 8, (x, y) => tileFree(x, y) && !farmMap.has(y * W + x)); if (p) { const s = [p[0], p[1]]; s.old = o; return s; } }
  return base.apply(this, arguments);
}; }
function adoptRuins(c, o){
  o.reborn = c.id; o.ruinTiles = []; o.ruinsLeft = false;
  // Con memoria: se llama como la de antes («Nueva …») y, en cuanto vive alguien, guarda una fiesta en su recuerdo
  const base0 = o.name.replace(/^Nueva /, ''); c.name = ('Nueva ' + base0).slice(0, 22); c.freshName = false;
  c.heritage = { name:o.name, born:o.born ?? null, gone:o.goneT ?? yearT, fiesta:false };
  const keep = o.houses.filter(i => { const b = world.objs[i]; return b && b.key.startsWith('house') && !b.burnt; });
  for (const i of keep) { world.objs[i].vid = c.id; world.objs[i].dmg = Math.max(.35, Math.min(.8, world.objs[i].dmg || 0)); world.objs[i].dmgMsg = true; } // en pie, pero hay que arreglarlas
  c.houses.push(...keep); o.houses = o.houses.filter(i => !keep.includes(i));
  c.wood += 15;
  setTimeout(() => notify(`${c.name} se levanta sobre las ruinas de ${o.name}${keep.length ? `: arreglan las ${keep.length} casas que seguían en pie` : ''}`, { x:c.fx * T, y:c.fy * T }), 4200);
}
// Colonias de ultramar: si una se quedó vacía, el próximo barco de colonos va a sus ruinas (si siguen a mano por mar)
{ const base = colonySite; colonySite = function(n){
  const L = n.port.launch;
  for (const o of villages.filter(o => o.gone && !o.reborn && o.colony && o.colony.cap === n.id && !popOf(o)).sort((a, b) => (b.goneT || 0) - (a.goneT || 0))) {
    if (!villages.every(v => !popOf(v) || Math.hypot(v.fx - o.fx, v.fy - o.fy) >= 30)) continue;
    const p = ringFind(o.fx, o.fy, 8, (x, y) => tileFree(x, y) && nb4i(y * W + x).some(i => openWater(i))) || ringFind(o.fx, o.fy, 14, (x, y) => tileFree(x, y) && nb4i(y * W + x).some(i => openWater(i)));
    if (!p) continue; const wn = nb4i(p[1] * W + p[0]).find(i => openWater(i)), route = waterRoute(L, wn); if (!route || route.length < 8) continue;
    const s = { x:p[0], y:p[1], route, old:o }; return s;
  }
  return base.apply(this, arguments);
}; }
{ const base = foundColony; foundColony = function(t, n){
  const r = base.apply(this, arguments), c = n && villages.at(-1), o = t.old;
  if (o && c && c.colony && c.colony.cap === n.id && c.colony.born === yearT && !o.reborn) adoptRuins(c, o); // (solo si la acaban de fundar ahora)
  return r;
}; }
// En la ficha: de dónde viene la ciudad levantada sobre unas ruinas
{ const base = colonyCard; colonyCard = function(g){
  const h = g.heritage, out = base.apply(this, arguments);
  return h ? out + `<h4>Historia</h4><div>Levantada sobre las ruinas de ${esc(h.name)}${h.born != null ? `, fundada el día ${Math.floor(h.born / DAY_LEN) + 1}` : ''} y abandonada el día ${Math.floor(h.gone / DAY_LEN) + 1}. Cada año celebran el «Día de ${esc(h.name)}»</div>` : out;
}; }
