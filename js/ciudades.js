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
  c.nation = g.id; c.province = { cap:g.id, born:yearT }; c.lang = g.lang; c.food += 40; c.wood += 30; c.stone = (c.stone || 0) + 10; g.food = Math.max(0, g.food - 40); g.wood = Math.max(0, g.wood - 30);
  c.faith = g.faith ? { ...g.faith, pantheon:[...(g.faith.pantheon || [])] } : null; if (g.coin) c.coin = g.coin;
  if (g.know) c.know = { ...g.know };
  const lead = crew[0]; releaseTask(lead); dismount(lead); lead.vid = c.id; lead.home = null; landAt(lead, c.fx * T + 2, c.fy * T + 8); // el fundador ya está allí; los demás, de camino
  for (const u of crew.slice(1)) { exile(u, g, c); u.arrived = null; }
  setTimeout(() => notify(`${g.name} funda una ciudad nueva en su territorio: ${c.name}. ${crew.length} personas se mudan allí${cities + 1 >= 2 ? `; ya son ${cities + 2} ciudades` : ''}`, { x:c.fx * T, y:c.fy * T }), 3500);
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
const youngCity = c => c.province && !c.colony && yearT - (c.province.born ?? c.born ?? 0) < CITY_YOUNG;
const goingTo = c => travelers.filter(t => t.kind === 'emigrante' && t.to === c.id && !t.done).length;
function cityFeedTick(n, people){
  if ((n.feedT || 0) > yearT) return; n.feedT = yearT + DAY_LEN * (.25 + Math.random() * .15);
  const pop = people.length; if (pop < 28) return;
  const kids = villages.filter(c => c !== n && !c.gone && c.nation === n.id && youngCity(c) && popOf(c) + goingTo(c) < 30 && Math.hypot(c.fx - n.fx, c.fy - n.fy) < 130);
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
  if (!(W0[key] > yearT)) { W0[key] = yearT + DAY_LEN * 1.5; notify(`🧺 ${goers.length === 1 ? `${goers[0].name} deja` : `${goers.length} personas dejan`} ${n.name} para vivir en ${c.name}, la ciudad nueva`, { x:c.fx * T, y:c.fy * T }); }
}
let feedClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (feedClock -= dt) > 0) return; feedClock = 5;
  const byV = new Map(); for (const v of villagers) if (!v.dead) { let L = byV.get(v.vid); if (!L) byV.set(v.vid, L = []); L.push(v); }
  for (const g of liveTowns()) if (nationOf(g) === g) { const ps = byV.get(g.id); if (ps) cityFeedTick(g, ps); }
} catch (e) { console.error(e); } });
// Una ciudad joven no vota irse mientras su capital pueda repoblarla
{ const base = smallTownTick; smallTownTick = function(g, dt, people){
  const n = nationOf(g); if (n !== g && youngCity(g) && popOf(n) >= 28) return;
  return base.apply(this, arguments);
}; }
// Ruinas de una ciudad suya (o de su tierra) que se quedó vacía: ahí se funda la siguiente
function ownRuin(g){
  return villages.filter(o => o.gone && !o.reborn && !popOf(o) && (o.nation === g.id || (o.province && o.province.cap === g.id)) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 140 && townSpace(o.fx, o.fy) && !volcDanger(o.fx, o.fy, 8))
    .sort((a, b) => (b.goneT || 0) - (a.goneT || 0))[0] || null;
}
{ const base = citySite; citySite = function(g){
  const o = ownRuin(g);
  if (o) { const p = ringFind(o.fx, o.fy, 8, (x, y) => tileFree(x, y) && !farmMap.has(y * W + x)); if (p) { const s = [p[0], p[1]]; s.old = o; return s; } }
  return base.apply(this, arguments);
}; }
function adoptRuins(c, o){
  o.reborn = c.id; o.ruinTiles = []; o.ruinsLeft = false;
  const keep = o.houses.filter(i => { const b = world.objs[i]; return b && b.key.startsWith('house') && !b.burnt; });
  for (const i of keep) { world.objs[i].vid = c.id; world.objs[i].dmg = Math.max(.35, Math.min(.8, world.objs[i].dmg || 0)); world.objs[i].dmgMsg = true; } // en pie, pero hay que arreglarlas
  c.houses.push(...keep); o.houses = o.houses.filter(i => !keep.includes(i));
  c.wood += 15;
  setTimeout(() => notify(`${c.name} se levanta sobre las ruinas de ${o.name}${keep.length ? `: arreglan las ${keep.length} casas que seguían en pie` : ''}`, { x:c.fx * T, y:c.fy * T }), 4200);
}
