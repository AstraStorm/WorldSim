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
