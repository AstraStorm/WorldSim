// World Sim · Islas: si a la gente de una isla no le sale a cuenta seguir allí, cruza el mar a tierra mejor
// ================= Islas =================
// · Cada pueblo mira de vez en cuando si vive en una isla (un trozo de tierra pequeño, rodeado de mar) y cuánto le da:
//   tierra fértil, árboles, piedra, vetas y agua dulce alrededor, y si ya están apretados
// · Si sabe hacer barcas y hay una costa mucho mejor al otro lado (a la que se llega por mar y sin pueblos cerca), se
//   muda: si son pocos o la isla es muy pequeña, se va el pueblo entero (la isla queda abandonada); si son muchos,
//   una parte de las familias funda allí una ciudad nueva de su nación
// · Cruzan en barcas que se ven por el mar, siguiendo una ruta por agua
function landSize(i, cap = 4000){ // casillas de tierra unidas a esta (hasta cap)
  const seen = new Set([i]), q = [i];
  for (let h = 0; h < q.length && seen.size < cap; h++) for (const n of nb4i(q[h])) if (!seen.has(n) && !WATER[world.biome[n]]) { seen.add(n); q.push(n); }
  return seen.size;
}
// Cuánto da la tierra alrededor de un sitio
function landWorth(x, y, r = 10){
  let s = 0;
  for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = yy * W + xx, b = world.biome[i], o = world.objs[i];
    if (WATER[b]) { if (FRESH(b)) s += .3; continue; }
    s += (FERTILE[b] || 0) * .6;
    if (o) { const k = OBJ[o.key][1]; s += k === 'mineral' ? 2 : k === 'tree' ? .35 : k === 'stone' ? .5 : k === 'berry' ? .3 : 0; }
  }
  return s;
}
// Una costa mejor al otro lado: tierra grande, sin pueblos cerca, a la que se llega por mar
function betterShore(g, from, size){
  let best = null, tries = 0;
  for (let k = 0; k < 900 && tries < 25; k++) {
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 120, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d);
    if (x < 10 || y < 10 || x >= W - 10 || y >= H - 10 || !tileFree(x, y) || volcDanger(x, y, 8)) continue;
    const wn = nb4i(y * W + x).find(i => openWater(i)); if (wn == null) continue; // en la costa, para desembarcar
    if (villages.some(o => popOf(o) && Math.hypot(o.fx - x, o.fy - y) < 22) || landSize(y * W + x, 3000) < Math.min(3000, Math.max(1500, size * 3))) continue; // tierra firme (o una isla mucho mayor)
    const w = landWorth(x, y); if (best && w <= best.w) continue;
    tries++; const route = seaRoute(from, wn); if (!route || route.length > 450) continue; // (piratas.js)
    best = { x, y, w, route };
  }
  return best;
}
let isleClock = 0;
function islandTick(dt){
  if (!world || (isleClock -= dt) > 0) return; isleClock = 8;
  for (const g of villages) {
    if (!popOf(g) || g.moving || !(g.know || {}).barca || popOf(g) < 5 || (g.isleT ??= yearT + DAY_LEN * (1 + Math.random() * 2)) > yearT) continue;
    g.isleT = yearT + DAY_LEN * (2 + Math.random() * 2);
    const size = landSize(g.fy * W + g.fx, 2500); if (size >= 2500) continue; // no es una isla (o es grande)
    const here = landWorth(g.fx, g.fy), crowd = popOf(g) > size / 14 ? 1.4 : 1;
    const from = seaFrom(g.fx * T + 2, g.fy * T + 3); if (!openWater(from)) continue;
    const s = betterShore(g, from, size); if (!s || s.w < here * crowd * 1.4 + 15) {
      if (s === null && size < 400 && !g.isleMsg) { g.isleMsg = true; notify(`Los de ${g.name} miran el mar desde su islita: no ven ninguna tierra mejor a la que irse`, { x:g.fx * T, y:g.fy * T }); }
      continue;
    }
    const all = popOf(g) <= 14 || size < 500, people = villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === g.id && !u.slave && !(u.jail && u.jail.until > yearT));
    let goers = people;
    if (!all) { const go = new Set(); for (const u of people.sort(() => Math.random() - .5)) { if (go.size >= Math.ceil(people.length * .45)) break; go.add(u); for (const k of [...(u.partners || []), ...(u.kids || [])]) if (k && !k.dead && k.vid === g.id && !k.away) go.add(k); } goers = [...go].filter(u => u !== g.leader); }
    if (goers.length < 3) continue;
    for (const u of goers) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } dismount(u); u.sleep = false; u.task = { k:'viaje' }; u.away = true; }
    const home = [(from % W) * T + 2, ((from / W) | 0) * T + 3], path = s.route.slice(), first = path.shift() || [s.x * T, s.y * T];
    travelers.push({ kind:'mudanza', v:goers[0], crew:goers, from:g.id, to:g.id, x:home[0], y:home[1], tx:first[0], ty:first[1], path, sea:true, phase:'ida', dir:1, site:[s.x, s.y], all, hx:home[0], hy:home[1] });
    if (all) g.moving = true;
    notify(all ? `Los de ${g.name} deciden que su isla no les da para vivir: ¡se mudan todos en barcas a una tierra mejor al otro lado del mar!` : `${goers.length} vecinos de ${g.name} dejan la isla en barcas para fundar una ciudad en una tierra mejor`, { x:g.fx * T, y:g.fy * T });
  }
}
// Al desembarcar: el pueblo nuevo (con su nombre, su fe y su lengua si se han ido todos; si no, ciudad de su nación)
function islandArrive(t, g){
  const [x, y] = t.site, crew = t.crew.filter(u => !u.dead), c = makeVillage(x, y);
  for (const u of crew) { u.away = false; u.task = null; landAt(u, x * T + 2 + (Math.random() - .5) * 8, y * T + 6 + Math.random() * 4); }
  if (!c || !g) { if (g) g.moving = false; notify(`Los que dejaban ${g ? g.name : 'la isla'} no encuentran dónde asentarse y se quedan en la costa`, { x:x * T, y:y * T }); return; }
  for (const u of crew) { u.vid = c.id; u.home = null; }
  c.lang = g.lang; c.faith = g.faith ? { ...g.faith, pantheon:[...(g.faith.pantheon || [])] } : null; if (g.coin) c.coin = g.coin; if (g.know) c.know = { ...g.know }; c.seeds = g.seeds ? [...g.seeds] : undefined;
  c.food += Math.round(g.food * (t.all ? .8 : .4)); c.wood += 20; g.food *= t.all ? .2 : .6;
  if (t.all) {
    const old = g.name; c.name = old; c.flag = g.flag; c.flagUrl = g.flagUrl; c.regime = g.regime; c.parties = g.parties; c.ruling = g.ruling; c.leader = g.leader && !g.leader.dead ? g.leader : c.leader;
    if (nationOf(g) !== g) c.nation = g.nation; else for (const o of villages) if (o.nation === g.id) o.nation = c.id; // si era capital, la capital es ahora el pueblo nuevo
    for (const u of villagers) if (!u.dead && u.vid === g.id) { u.vid = c.id; u.home = null; } // los rezagados también
    g.moving = false;
    setTimeout(() => notify(`${old} se instala en su nueva tierra al otro lado del mar: la isla queda abandonada`, { x:c.fx * T, y:c.fy * T }), 3500);
  } else {
    c.nation = nationOf(g).id; c.province = { cap:nationOf(g).id, born:yearT };
    setTimeout(() => notify(`Los que dejaron ${g.name} fundan ${c.name} en tierra firme`, { x:c.fx * T, y:c.fy * T }), 3500);
  }
}
SYSTEMS.push(dt => islandTick(dt));
