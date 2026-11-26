// World Sim · Civilización: ruinas antiguas, bodas y entierros, villas y ciudades, embajadas, imperios, gremios
// y fiebres del oro
// ================= Civilización =================
// · Ruinas de civilizaciones olvidadas repartidas por el mapa: los pueblos cercanos mandan a explorarlas y encuentran
//   tesoros, saberes perdidos, reliquias… o una maldición
// · Bodas (banquete y arco de flores en la plaza, los vecinos van a celebrarlo) y entierros (ataúd, velas y flores en
//   el cementerio; la familia y los vecinos lo acompañan)
// · Al crecer, la aldea pasa a villa (40), ciudad (80) y gran ciudad (150): las cabañas se cambian por casas de piedra
// · Embajadas: cada nación amiga abre la suya en la capital de la otra (edificio con su bandera); en guerra, se cierran
// · Imperios: una nación con muchas provincias y gente se proclama imperio; su líder es emperador y las provincias
//   lejanas se inquietan
// · Gremios: con cuatro o más del mismo oficio se organizan; cobran una cuota, se hacen ricos y a veces van a la huelga
// · Fiebre del oro: oro en un sitio apartado; la gente acude en masa, nace un pueblo minero y, cuando se agota, se vacía
const civRank = g => { const p = popOf(g); return p >= 150 ? 3 : p >= 80 ? 2 : p >= 40 ? 1 : 0; };
const RANK_TXT = ['aldea', 'villa', 'ciudad', 'gran ciudad'];
const rankTag = g => { const n = nationOf(g); return (n === g && n.empire ? '👑 ' : n === g && typeof provincesOf === 'function' && provincesOf(g).length ? '♛ ' : '') + (civRank(g) === 3 ? 'Metrópolis de ' : civRank(g) === 2 ? '★ ' : ''); }; // corona: capital con más ciudades (ciudades.js)
// ---- Ruinas ----
function ruinsInit(){
  if (world.ruins) return; const R = world.ruins = [], r = mulberry32((langSeed() * 7919) | 0), n = 4 + Math.round(N / 120000);
  const SYL = ['ar', 'kal', 'ze', 'mor', 'tha', 'ul', 'ven', 'ish', 'dra', 'ok', 'sil', 'qua'];
  for (let k = 0; k < 400 && R.length < n; k++) {
    const x = 6 + Math.floor(r() * (W - 12)), y = 8 + Math.floor(r() * (H - 16)), i = y * W + x;
    if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || world.objs[i] || villages.some(g => Math.hypot(g.fx - x, g.fy - y) < 25) || R.some(o => Math.hypot(o.x - x, o.y - y) < 30)) continue;
    const nm = SYL[Math.floor(r() * SYL.length)] + SYL[Math.floor(r() * SYL.length)] + (r() < .5 ? SYL[Math.floor(r() * SYL.length)] : '');
    R.push({ x, y, name:`las ruinas de ${capFirst(nm)}`, kind:Math.floor(r() * 3), seen:false });
  }
}
function ruinJobs(v, g, add){
  if (popOf(g) < 10 || busyWith(g, 'ruinas') || (g.ruinT && yearT - g.ruinT < DAY_LEN)) return; ruinsInit();
  if (world.ruins.some(o => !o.seen && Math.hypot(o.x - g.fx, o.y - g.fy) < 50)) add('ruinas', 3);
}
function ruinTarget(v, g){ const o = world.ruins.filter(o => !o.seen && Math.hypot(o.x - g.fx, o.y - g.fy) < 50).sort((a, b) => Math.hypot(a.x - g.fx, a.y - g.fy) - Math.hypot(b.x - g.fx, b.y - g.fy))[0]; if (!o) return null; g.ruinT = yearT; return { k:'ruinas', ruin:world.ruins.indexOf(o), x:o.x * T + 2, y:(o.y + 2) * T + 3 }; }
function ruinArrive(v, g, t){
  v.actT = 8; v.onDone = () => {
    const o = world.ruins[t.ruin]; if (!o || o.seen) return; o.seen = true; o.by = g.id; const at = { x:o.x * T, y:o.y * T }, roll = Math.random(), ec = ecOf(g);
    if (roll < .35) { const gold = ec ? Math.round(60 * ec.P) : 0; if (ec) ec.treas += gold; g.food += 30; o.found = 'tesoro'; notify(`En ${o.name}, ${v.name} de ${g.name} encuentra un tesoro escondido${gold ? `: ${gold} ${g.coin}` : ''} y provisiones`, at); }
    else if (roll < .65) { research(g, 40); o.found = 'saber'; notify(`En ${o.name}, ${v.name} de ${g.name} encuentra tablillas con saberes olvidados: sus sabios aprenden de ellas`, at); }
    else if (roll < .85) { g.devotion = (g.devotion || 0) + 1; g.anger = Math.max(0, (g.anger || 0) - 10); o.found = 'reliquia'; notify(`En ${o.name}, ${v.name} de ${g.name} encuentra una reliquia antigua: el pueblo la venera`, at); }
    else { g.anger = (g.anger || 0) + 12; o.found = 'maldición'; if (typeof infect === 'function' && typeof newDisease === 'function') infect(v, newDisease(), g); notify(`¡${v.name} de ${g.name} despierta una maldición en ${o.name}! Cae enfermo y el pueblo tiene miedo`, at); }
    floats.push({ x:v.x, y:v.y - 14, txt:{ tesoro:'¡Tesoro!', saber:'¡Saberes!', reliquia:'¡Reliquia!', 'maldición':'¡Maldición!' }[o.found], col:'#f8d850', life:0 });
  };
  return true;
}
function drawRuins(now){
  if (!world.ruins) { if (villages.length) ruinsInit(); return; }
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const o of world.ruins) {
    const x = o.x * T + 2, y = o.y * T + 3; if (x < vx0 - 40 || x > vx1 + 40 || y < vy0 - 40 || y > vy1 + 40) continue;
    if (artAt(o.kind === 1 ? 'ruin:ruinas_b' : 'ruin:ruinas_a', x, y)) { if (o.seen) { const n = villageById(o.by); vctx.fillStyle = '#4a3018'; vctx.fillRect(x + 14, y - 12, 1, 12); vctx.fillStyle = n ? `rgb(${villageColor(nationOf(n)).join(',')})` : '#ccc'; vctx.fillRect(x + 15, y - 12, 5, 3); } continue; }
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 12, y + 1, 25, 2);
    vctx.fillStyle = '#8e887c'; vctx.fillRect(x - 12, y - 1, 25, 2); vctx.fillStyle = '#a8a294'; vctx.fillRect(x - 11, y - 2, 23, 1); // basamento
    for (const [dx, h] of [[-9, 12], [-4, 7], [3, 14], [9, 4]]) { vctx.fillStyle = '#22201e'; vctx.fillRect(x + dx - 1, y - h - 1, 4, h); vctx.fillStyle = '#c8c0ae'; vctx.fillRect(x + dx, y - h, 2, h - 1); vctx.fillStyle = '#a8a090'; vctx.fillRect(x + dx + 1, y - h, 1, h - 1); } // columnas rotas
    if (o.kind !== 1) { vctx.fillStyle = '#22201e'; vctx.fillRect(x - 5, y - 16, 10, 3); vctx.fillStyle = '#c8c0ae'; vctx.fillRect(x - 4, y - 15, 8, 1); } // dintel
    vctx.fillStyle = '#5a8a3a'; vctx.fillRect(x - 10, y - 4, 2, 1); vctx.fillRect(x + 4, y - 9, 1, 3); vctx.fillRect(x + 8, y - 2, 3, 1); // hiedra
    for (const [dx, dy] of [[-14, 0], [13, -1], [7, 2]]) { vctx.fillStyle = '#a8a294'; vctx.fillRect(x + dx, y + dy, 3, 2); } // piedras caídas
    if (o.seen) { const n = villageById(o.by); vctx.fillStyle = '#4a3018'; vctx.fillRect(x + 14, y - 12, 1, 12); vctx.fillStyle = n ? `rgb(${villageColor(nationOf(n)).join(',')})` : '#ccc'; vctx.fillRect(x + 15, y - 12, 5, 3); } // banderita de quien la exploró
  }
}
// ---- Bodas y entierros ----
function wedding(a, b, g){
  if (a.secret || !g.plaza || (g.wedding && g.wedding.until > yearT)) return;
  const P = g.plaza; g.wedding = { a:a.name, b:b.name, until:yearT + 40, x:(P.x0 + P.x1) / 2 * T + 2, y:(P.y0 + P.y1) / 2 * T - 6 };
  if (Math.random() < .35) notify(`¡Boda en ${g.name}! ${a.name} y ${b.name} se casan: banquete en la plaza`, { x:g.wedding.x, y:g.wedding.y });
}
function funeral(v, g){
  if (!g || !g.cemetery || (g.funeral && g.funeral.until > yearT) || popOf(g) < 6) return;
  const C = g.cemetery; g.funeral = { name:v.name, until:yearT + 35, x:(C.x0 + C.w / 2) * T + 2, y:(C.y0 + C.h) * T + 6 };
  for (const u of [...(v.parents || []), ...(v.kids || []), ...(v.partners || [])]) if (u && !u.dead && u.vid === g.id && !u.away && !(u.task && ['asalto', 'detenido'].includes(u.task.k)) && !locked(u)) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.sleep = false; u.task = { k:'entierro', x:g.funeral.x + (Math.random() - .5) * 14, y:g.funeral.y + Math.random() * 4 }; }
}
const eventOf = g => g.wedding && g.wedding.until > yearT ? 'boda' : g.funeral && g.funeral.until > yearT ? 'entierro' : null;
function eventLeisure(v, g, J){ const e = eventOf(g); if (e) J.push([e, e === 'boda' ? 9 : 5]); }
function eventTarget(v, g, job){ const E = job === 'boda' ? g.wedding : g.funeral; if (!E || E.until < yearT) return null; const a = Math.random() * Math.PI * 2; return { k:job, x:E.x + Math.cos(a) * 14, y:E.y + 8 + Math.sin(a) * 6 }; }
function eventArrive(v, g, t){
  v.actT = 7 + Math.random() * 5; v.dir = (t.k === 'boda' ? g.wedding : g.funeral) && (t.k === 'boda' ? g.wedding : g.funeral).x < v.x ? -1 : 1;
  v.onDone = () => { v.fun = yearT; if (t.k === 'boda' && Math.random() < .35) floats.push({ x:v.x, y:v.y - 12, txt:['¡Vivan los novios!', '❤', '¡Que se besen!'][Math.floor(Math.random() * 3)], col:'#f8b0c8', life:0 }); };
  return true;
}
function drawCivEvents(now){
  for (const g of villages) {
    const Wd = g.wedding && g.wedding.until > yearT ? g.wedding : null, Fu = g.funeral && g.funeral.until > yearT ? g.funeral : null;
    if (Wd && onScreen(Wd.x, Wd.y)) { // arco de flores y mesa del banquete
      const x = Math.round(Wd.x), y = Math.round(Wd.y);
      vctx.fillStyle = '#5a8a3a'; vctx.fillRect(x - 7, y - 12, 1, 12); vctx.fillRect(x + 7, y - 12, 1, 12); vctx.fillRect(x - 6, y - 13, 13, 1);
      for (let k = -6; k <= 6; k += 2) { vctx.fillStyle = ['#f8b0c8', '#f4f0e8', '#f0d060'][((k + 6) / 2) % 3]; vctx.fillRect(x + k, y - 14 + (k % 4 === 0 ? 0 : 1), 1, 1); }
      vctx.fillStyle = '#22201e'; vctx.fillRect(x - 10, y + 4, 21, 3); vctx.fillStyle = '#f4f0e8'; vctx.fillRect(x - 9, y + 4, 19, 2); // mesa con mantel
      for (let k = -8; k <= 8; k += 4) { vctx.fillStyle = ['#c86a4a', '#f0d060', '#a8583a'][(k + 8) / 4 % 3]; vctx.fillRect(x + k, y + 3, 2, 1); }
      if (Math.random() < .2) chips.push({ x:x + (Math.random() - .5) * 14, y:y - 14, vx:(Math.random() - .5) * 10, vy:-4, life:0, max:1, col:['#f8b0c8', '#f0d060', '#a0d0f8'][Math.floor(Math.random() * 3)] }); // confeti
    }
    if (Fu && onScreen(Fu.x, Fu.y)) { // ataúd, velas y flores
      const x = Math.round(Fu.x), y = Math.round(Fu.y) - 4;
      vctx.fillStyle = '#22201e'; vctx.fillRect(x - 5, y - 2, 11, 4); vctx.fillStyle = '#6e4626'; vctx.fillRect(x - 4, y - 1, 9, 2); vctx.fillStyle = '#c8b070'; vctx.fillRect(x - 1, y - 1, 3, 1);
      for (const dx of [-8, 8]) { vctx.fillStyle = '#f4f0e8'; vctx.fillRect(x + dx, y - 3, 1, 3); vctx.fillStyle = Math.sin(now / 120 + dx) > 0 ? '#ffd060' : '#ffa030'; vctx.fillRect(x + dx, y - 4, 1, 1); }
      vctx.fillStyle = '#f8b0c8'; vctx.fillRect(x - 3, y - 3, 1, 1); vctx.fillStyle = '#f4f0e8'; vctx.fillRect(x + 2, y - 3, 1, 1);
    }
  }
}
// ---- Cada poco, en cada pueblo: rango, embajadas, imperio y gremios ----
const GUILD = { herrero:'de Herreros', tejedor:'de Tejedores', mercader:'de Mercaderes', comerciante:'de Comerciantes', constructor:'de Constructores', cantero:'de Canteros', pescador:'de Pescadores', 'leñador':'de Leñadores', agricultor:'de Labradores', pastor:'de Pastores' };
function civTick(g, dt, people){
  if ((g.civ2T = (g.civ2T ?? Math.random() * 25) - dt) > 0) return; g.civ2T = 25;
  goldTick(g);
  const at = { x:g.fx * T, y:g.fy * T }, n = nationOf(g), rank = civRank(g);
  // Rango
  if (rank > (g.rank || 0)) notify(`¡${g.name} ya es una ${RANK_TXT[rank]}! (${popOf(g)} habitantes)`, at);
  g.rank = Math.max(g.rank || 0, rank);
  if (rank >= 1 && (g.stone || 0) >= 12) { const hut = g.houses.find(h => world.objs[h] && world.objs[h].key === 'house:hut'); if (hut) { world.objs[hut].key = 'house:piedra'; g.stone -= 8; composeRegion(hut % W - 8, ((hut / W) | 0) - 12, hut % W + 8, ((hut / W) | 0) + 12); } } // casas de piedra
  // Imperio
  if (n === g && !g.empire) {
    const prov = villages.filter(o => o !== g && popOf(o) && nationOf(o) === g), tot = popOf(g) + prov.reduce((s, o) => s + popOf(o), 0);
    if (prov.length >= 3 && tot >= 110) {
      g.empire = { name:`Imperio de ${g.name}`, since:Math.floor(yearT / DAY_LEN) + 1 };
      notify(`¡Nace el ${g.empire.name}! ${g.leader ? `${g.leader.name} se proclama ${g.leader.sex === 'm' ? 'emperatriz' : 'emperador'}` : 'Su gobierno se proclama imperial'} sobre ${prov.length} provincias`, at);
      if (g.leader) addHero(g, g.leader, `fue ${g.leader.sex === 'm' ? 'la primera emperatriz' : 'el primer emperador'}`);
    }
  }
  if (n.empire && n !== g && !hasLaw(n, 'autonomia')) g.unrest = (g.unrest || 0) + .4; // las provincias de un imperio se inquietan
  // Embajadas (solo en las capitales)
  if (n === g && g.hall != null) {
    g.embassies ||= {};
    for (const o of villages) {
      if (o === g || !popOf(o) || nationOf(o) !== o) continue; const r = rels.get(relKey(g, o)), E = g.embassies[o.id];
      if (E && (!r || r.war)) { delete g.embassies[o.id]; notify(`${g.name} expulsa al embajador de ${o.name} y cierra su embajada`, at); continue; }
      if (!E && r && r.known && !r.war && r.v > 40 && Object.keys(g.embassies).length < 4 && Math.random() < .3) {
        const p = ringFind(g.fx - 8 - Object.keys(g.embassies).length * 4, g.fy + 6, 10, (x, y) => tileFree(x, y) && tileFree(x + 1, y) && !pathMap.has(y * W + x) && !farmMap.has(y * W + x) && !villages.some(q => underBuilding(q, x, y)));
        if (p) { g.embassies[o.id] = { x:p[0], y:p[1] }; notify(`${o.name} abre su embajada en ${g.name}`, { x:p[0] * T, y:p[1] * T }); }
      }
      if (E && r) r.v = Math.min(100, r.v + .3);
    }
  }
  // Gremios
  g.guilds ||= {}; const ofs = new Map(); for (const u of people) if (u.oficio && Object.hasOwn(GUILD, u.oficio)) { if (!ofs.has(u.oficio)) ofs.set(u.oficio, []); ofs.get(u.oficio).push(u); } // (Map: «constructor» no choca con las propiedades de un objeto)
  for (const [o, us] of ofs) {
    let Gd = Object.hasOwn(g.guilds, o) ? g.guilds[o] : null;
    if (!Gd && us.length >= 4) { Gd = g.guilds[o] = { name:`Gremio ${GUILD[o]}`, wealth:0, since:Math.floor(yearT / DAY_LEN) + 1 }; notify(`En ${g.name} se funda el ${Gd.name}: ${us.length} ${o}s se organizan`, at); }
    if (!Gd) continue;
    for (const u of us) { const fee = Math.floor((u.money || 0) * .04); u.money -= fee; Gd.wealth += fee; }
    if (Gd.wealth > 80 * (ecOf(g) ? ecOf(g).P : 1) && Math.random() < .2) { const pay = Math.floor(Gd.wealth * .25 / us.length); for (const u of us) u.money = (u.money || 0) + pay; Gd.wealth -= pay * us.length; if (!Gd.richMsg) { Gd.richMsg = true; notify(`El ${Gd.name} de ${g.name} se ha hecho rico y reparte ganancias entre los suyos`, at); } }
    if ((g.anger || 0) > 55 && !(g.strike && g.strike.until > yearT) && Math.random() < .08) { Gd.strikeUntil = yearT + DAY_LEN * .5; notify(`¡Huelga del ${Gd.name} en ${g.name}! Piden mejores precios`, at); }
  }
}
const guildStrike = (v, g) => !!(v.oficio && g.guilds && Object.hasOwn(g.guilds, v.oficio) && g.guilds[v.oficio].strikeUntil > yearT);
function drawEmbassies(now){
  for (const g of villages) {
    if (!g.embassies || !popOf(g)) continue;
    for (const [id, E] of Object.entries(g.embassies)) {
      const o = villageById(+id), x = E.x * T + 2, y = E.y * T + 3; if (!o || !onScreen(x, y)) continue;
      if (artAt('embassy:embajada', x, y)) { const f = nationOf(o).flag, top = y - ART_MAP['embassy:embajada'][3]; if (f) drawFlag(f, x + 14, top + 3, 7, 5, 1, now); continue; } // (en su mástil)
      vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 7, y + 1, 15, 2);
      vctx.fillStyle = '#22201e'; vctx.fillRect(x - 7, y - 9, 15, 10); vctx.fillStyle = '#ece4d4'; vctx.fillRect(x - 6, y - 8, 13, 8);
      vctx.fillStyle = '#c8c0ae'; for (const dx of [-5, -2, 2, 5]) vctx.fillRect(x + dx, y - 7, 1, 7); // columnas
      vctx.fillStyle = '#22201e'; vctx.beginPath(); vctx.moveTo(x - 8, y - 9); vctx.lineTo(x + .5, y - 14); vctx.lineTo(x + 9, y - 9); vctx.fill(); vctx.fillStyle = '#ece4d4'; vctx.beginPath(); vctx.moveTo(x - 6, y - 10); vctx.lineTo(x + .5, y - 13); vctx.lineTo(x + 7, y - 10); vctx.fill(); // frontón
      vctx.fillStyle = '#4a3018'; vctx.fillRect(x + 9, y - 17, 1, 17); const f = nationOf(o).flag; if (f) drawFlag(f, x + 10, y - 17, 7, 5, 1, now); // la bandera de su país
    }
  }
}
// ---- Fiebre del oro (desde diploTick) ----
function goldRushTick(){
  if (yearT - (world.rushT ?? DAY_LEN * 4) < DAY_LEN * 4 || Math.random() > .08) return;
  const live = villages.filter(g => popOf(g) >= 15); if (live.length < 2) return;
  let spot = null;
  for (let k = 0; k < 300 && !spot; k++) {
    const x = 8 + Math.floor(Math.random() * (W - 16)), y = 8 + Math.floor(Math.random() * (H - 16)), b = world.biome[y * W + x];
    if (![B.HILLS, B.ROCK, B.DRY, B.DESERT].includes(b) || !tileFree(x, y) || villages.some(g => popOf(g) && Math.hypot(g.fx - x, g.fy - y) < 30) || volcDanger(x, y)) continue;
    if (live.some(g => Math.hypot(g.fx - x, g.fy - y) < 90)) spot = [x, y];
  }
  if (!spot) return; world.rushT = yearT;
  const ng = makeVillage(spot[0], spot[1]); if (!ng) return;
  ng.name = `${ng.name} del Oro`; ng.goldRush = { until:yearT + DAY_LEN * (5 + Math.random() * 4) }; ng.food = 40; ng.wood = 25;
  let n = 0;
  for (const g of live.filter(g => Math.hypot(g.fx - spot[0], g.fy - spot[1]) < 90)) {
    for (const u of villagers.filter(u => !u.dead && !u.away && u.vid === g.id && ageOf(u) >= ADULT_H && u !== g.leader && !(u.task && ['asalto', 'detenido'].includes(u.task.k)) && !locked(u)).slice(0, 4)) { releaseTask(u); u.vid = ng.id; u.home = null; landAt(u, spot[0] * T + 2 + (Math.random() - .5) * 20, spot[1] * T + 6 + Math.random() * 10); n++; }
  }
  ng.nation = ng.id; becomeIndependent(ng); if (!ng.coin) { const c = live.find(g => g.coin); if (c) ng.coin = c.coin; }
  notify(`¡Fiebre del oro! Han encontrado oro y ${n} buscadores acuden en masa: nace ${ng.name}`, { x:spot[0] * T, y:spot[1] * T }); snd('horn', spot[0] * T, spot[1] * T);
  if (typeof buildZones === 'function') buildZones();
}
// (desde civTick de cada pueblo) el oro da dinero mientras dura; cuando se agota, la gente se va
function goldTick(g){
  const R = g.goldRush; if (!R) return; const ec = ecOf(g);
  if (yearT < R.until) { if (ec) ec.treas += Math.round(popOf(g) * .4 * ec.P); g.trades = (g.trades || 0) + 1; for (const u of villagers) if (!u.dead && u.vid === g.id && Math.random() < .3) u.money = (u.money || 0) + 2; }
  else if (!R.over) { R.over = true; g.anger = (g.anger || 0) + 40; notify(`Se agota el oro en ${g.name}: muchos buscadores hacen las maletas`, { x:g.fx * T, y:g.fy * T }); }
}
// Pico y pala junto al pueblo minero mientras dura la fiebre
function drawGoldRush(now){
  for (const g of villages) {
    if (!g.goldRush || g.goldRush.over || !popOf(g)) continue; const x = g.fx * T + 14, y = g.fy * T + 6; if (!onScreen(x, y)) continue;
    if (artAt('camp:oro', x + 4, y + 2)) { if (Math.random() < .06) floats.push({ x:x + 4, y:y - 18, txt:'✦', col:'#f8d850', life:0 }); continue; }
    vctx.fillStyle = '#6e4626'; vctx.fillRect(x - 6, y - 1, 13, 3); vctx.fillStyle = '#f0c840'; for (let k = 0; k < 5; k++) vctx.fillRect(x - 5 + k * 2 + (Math.sin(now / 300 + k) > 0 ? 1 : 0), y - 2, 1, 1); // pepitas
    vctx.fillStyle = '#4a3018'; vctx.fillRect(x + 8, y - 9, 1, 9); vctx.fillStyle = '#a8a8b0'; vctx.fillRect(x + 6, y - 9, 5, 1); // pico
  }
}
