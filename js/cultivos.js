// World Sim · Cultivos: más tipos, cada pueblo con las semillas de su clima, y semillas que viajan con el comercio
// ================= Cultivos =================
// · Además del trigo, el maíz, la calabaza, la col y el mijo: arroz (el que más da, pero solo junto al agua o en el
//   pantano), patata (mucho y aguanta el frío), centeno (poco, pero crece hasta en invierno), judías y la vid (da poca
//   comida, pero el vino se vende: deja dinero en el tesoro)
// · Cada pueblo empieza con las semillas de siempre y la que da su tierra; en cada campo siembra lo que mejor rinde
//   allí en esa estación (calor, frío, agua cerca)
// · Al comerciar se intercambian semillas: así el arroz o la patata llegan a pueblos que no los conocían
Object.assign(CROPS, {
  arroz:{ n:'arroz', grow:[.6, 1.4, .8, 0], y:9, wet:true, warm:true, ripe:['#e8e0a0', '#a8b060'], leaf:['#7ac860', '#4e9a3a'], frost:-1 },
  patata:{ n:'patatas', grow:[1, .9, .8, .3], y:8, ripe:['#c8a870', '#6a8a40'], leaf:['#6a9a4a', '#4a7a34'], frost:-5 },
  centeno:{ n:'centeno', grow:[.9, .8, .7, .6], y:4, mill:true, cold:true, ripe:['#c8b070', '#a08850'], leaf:['#90b060', '#6a8a40'], frost:-9 },
  judias:{ n:'judías', grow:[.8, 1.2, .7, 0], y:5, ripe:['#a86a3a', '#5e8a34'], leaf:['#7ab84e', '#4e8a34'], frost:-1 },
  uva:{ n:'uva', grow:[.4, 1, 1.3, 0], y:3, cash:4, warm:true, ripe:['#7a3a8a', '#4e7a34'], leaf:['#6aa84a', '#3e7a2a'], frost:-3 },
});
const BASE_SEEDS = ['trigo', 'calabaza', 'col', 'mijo'];
// La semilla propia de su tierra, según el clima del pueblo
function localSeed(g){
  const i = g.fy * W + g.fx, t = world.baseT ? world.baseT[i] : 15, b = world.biome[i], wet = freshNear(i, 6) || b === B.SWAMP;
  if (t < 4) return Math.random() < .5 ? 'centeno' : 'patata';
  if (wet && t > 14) return 'arroz';
  if (t > 17 && (b === B.DRY || b === B.HILLS)) return 'uva';
  if (b === B.HILLS || t < 9) return 'patata';
  return Math.random() < .5 ? 'maiz' : 'judias';
}
function seedsOf(g){
  if (!g.seeds) { g.seeds = [...new Set([...BASE_SEEDS, localSeed(g), ...Object.keys(g.crops || {})])]; if (!g.seeds.includes('maiz') && Math.random() < .5) g.seeds.push('maiz'); }
  return g.seeds;
}
// Lo que mejor rinde en este campo ahora (las cuentas de un agricultor: cuánto crece, cuánto da y si tiene agua)
function bestCrop(g, i){
  const s = seasonInfo().i, t = tempAt(i), water = freshNear(i, (g.know || {}).acequias ? 12 : 8) || wellsOf(g).some(w => Math.hypot((w.i % W) - (i % W), ((w.i / W) | 0) - ((i / W) | 0)) < 9), wet = freshNear(i, 3) || world.biome[i] === B.SWAMP;
  let best = 'mijo', bs = -1;
  for (const c of seedsOf(g)) {
    const C = CROPS[c]; if (!C || (C.wet && !wet)) continue;
    let sc = C.grow[s] * (C.y + (C.cash || 0) * .6);
    if (C.warm && t < 12) sc *= .3; if (C.cold) sc *= t < 8 ? 1.4 : .8;
    if (C.dry) sc *= water ? .6 : 1.6; else if (!water && (c === 'maiz' || c === 'arroz' || t > 28)) sc *= .3;
    if (t < C.frost + 3) sc *= .2; // con este frío, la helada se lo comería
    if (sc > bs) { bs = sc; best = c; }
  }
  return best;
}
// Las semillas viajan con el comercio
{ const base = tradeTrip; tradeTrip = function(a, b, r){
  base.apply(this, arguments);
  if (!a || !b || Math.random() > .25) return;
  for (const [x, y] of [[a, b], [b, a]]) {
    const nw = seedsOf(x).filter(c => !seedsOf(y).includes(c)); if (!nw.length) continue;
    const c = nw[Math.floor(Math.random() * nw.length)]; y.seeds.push(c);
    notify(`Los de ${y.name} traen de ${x.name} semillas de ${CROPS[c].n} y empiezan a cultivarlo${CROPS[c].cash ? ' (para hacer vino y venderlo)' : CROPS[c].y >= 8 ? ': da mucha más comida' : ''}`, { x:y.fx * T, y:y.fy * T });
    break;
  }
}; }
