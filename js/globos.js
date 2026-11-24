// World Sim · Globos aerostáticos: tela, manga de viento, puerto de globos, vuelos y la física del globo
// ================= Globos =================
// Cadena: con mapas (papel) quieren saber de dónde viene el viento → tejen tela (con la lana de sus ovejas o, sin
// ovejas, con fibra de lino de sus campos) → levantan la manga de viento junto a un puerto de globos (una
// plataforma donde aparcar, despegar y aterrizar) → mirando la manga aprenden a hacer el globo → lo cosen
// (cabe 1 persona) y le agrandan la cesta hasta 4. Si se lo pueden permitir (tela, madera y gente de sobra), cosen
// más globos, hasta tres, cada uno con su sitio en la plataforma. Sale a por recursos, a visitar otros pueblos o a cartografiar
// desde el aire (desde arriba se ve mucho más lejos) y vuelve a su puerto. En el aire el viento lo empuja y lo
// inclina; aparcado se queda atado con una cuerda, meciéndose con el viento (o desinflado de noche y con mal tiempo).
// De visita aparcan en el puerto de globos del anfitrión (en uno de sus dos huecos de los lados) si lo tiene.
// En guerra cargan rocas (de su piedra) y las sueltan sobre el pueblo enemigo; los arqueros enemigos les disparan y,
// si lo derriban, el globo se estrella, mueren los de dentro y el pueblo tiene que coser otro.
const BAL_CRUISE = 42, BAL_ROPE = 5; // altura de crucero y largo de las cuerdas entre la cesta y la boca del globo (px)
const hasSock = g => !!(g.aero && g.aero.sock);
const aeroCenter = g => [(g.aero.x0 + g.aero.w / 2) * T, (g.aero.y0 + g.aero.h / 2) * T + 2];
const aeroSpot = (g, k) => { const [x, y] = aeroCenter(g); return [x + [0, -16, 16, -21, 21][k], y + [-2, 3, 3, 9, 9][k]]; }; // 0, 1 y 2: los de casa (los de los lados, algo delante); 3 y 4: visitas
// Los globos del pueblo (antes había uno solo, g.balloon: se pasa a la lista)
function balloonsOf(g){ if (g.balloon) { const b = g.balloon; g.balloon = null; b.id ??= 1; b.slot ??= 0; (g.balloons ||= []).push(b); } return g.balloons ||= []; }
const homeSpot = (g, b) => aeroSpot(g, b.slot || 0);
const parkedReady = g => balloonsOf(g).filter(b => b.state === 'aparcado' && (b.ready || 0) <= yearT);
const MAX_BALLOONS = 3;
// ¿Están en guerra? (entre sus naciones o entre los dos pueblos)
const atWar = (a, b) => { const r = rels.get(relKey(nationOf(a), nationOf(b))) || rels.get(relKey(a, b)); return !!(r && r.war); };
const warRel = (a, b) => { const r = rels.get(relKey(nationOf(a), nationOf(b))); return r && r.war ? r : rels.get(relKey(a, b)); };
let balloonRocks = []; const ARCHER_CD = new WeakMap();
const sockXY = g => [(g.aero.x0 + g.aero.w - 1) * T + 2, (g.aero.y0 + 1) * T + 4];
// El puerto de globos: una plataforma de 9×7 casillas cerca del pueblo (se reserva como parcela). A poder ser,
// centrada con un camino que ya existe: el camino llega justo al medio de uno de sus lados (door: la casilla de
// entrada, por donde luego se une con el resto de caminos)
function aeroFits(g, x0, y0){
  if (x0 < 2 || y0 < 2 || x0 + 9 >= W - 2 || y0 + 7 >= H - 2) return false;
  if (plotIn(x0 - 1, y0 - 1, x0 + 9, y0 + 7) || holyNear(x0, y0, x0 + 8, y0 + 6) || penOverlap(null, x0, y0, x0 + 8, y0 + 6)) return false;
  for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 9; x++) { const i = y * W + x, o = world.objs[i]; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || plazaSet.has(i) || farmMap.has(i) || wallSet.has(i) || bridgeSet.has(i) || underBuilding(g, x, y) || (o && !['tree', 'berry', 'stone'].includes(OBJ[o.key][1]))) return false; }
  return true;
}
function aeroSite(g){
  // 1) Junto a un camino: la plataforma encima, debajo o a un lado, con su centro en línea con el camino
  const near = [...pathMap].map(i => [i % W, (i / W) | 0]).filter(([x, y]) => Math.hypot(x - g.fx, y - g.fy) < 32 && Math.hypot(x - g.fx, y - g.fy) > 6).sort(() => Math.random() - .5).slice(0, 300);
  for (const [px, py] of near) for (const [x0, y0, door] of [[px - 4, py - 7, [px, py]], [px - 4, py + 1, [px, py]], [px - 9, py - 3, [px, py]], [px + 1, py - 3, [px, py]]])
    if (aeroFits(g, x0, y0)) return { x0, y0, w:9, h:7, sock:false, door };
  // 2) Si no, donde quepa, con su entrada abajo en el centro
  for (let k = 0; k < 400; k++) {
    const a = Math.random() * Math.PI * 2, d = 9 + Math.random() * (k < 200 ? 16 : 30), x0 = Math.round(g.fx + Math.cos(a) * d - 4), y0 = Math.round(g.fy + Math.sin(a) * d * .8 - 3);
    if (aeroFits(g, x0, y0)) return { x0, y0, w:9, h:7, sock:false, door:[x0 + 4, y0 + 7] };
  }
  return null;
}
// Buen tiempo para volar: de día, sin lluvia fuerte ni tormentas cerca
function flyWeather(g){
  if (!g.aero || isNight()) return false;
  const [px, py] = aeroCenter(g);
  if (storms.some(s => Math.hypot(s.x - px, s.y - py) < (s.type === 'huracan' ? s.r * 1.5 : 120))) return false;
  const [wx, wy] = windAt(px, py); return Math.hypot(wx, wy) < 16;
}
const woolOf = g => penAnimals(g).some(a => a.sp === 'oveja');
// Trabajos del globo (se llaman desde chooseJob)
function balloonJobs(v, g, add){
  const kn = g.know || {}; if (!kn.manga) return;
  const bs = balloonsOf(g), cloth = g.cloth || 0, pop = popOf(g), small = bs.find(b => b.cap < 4 && b.state === 'aparcado');
  const more = bs.length && bs.length < MAX_BALLOONS && pop >= 15 * (bs.length + 1) && bs.every(b => b.cap >= 2) && g.wood >= 20; // otro globo, si se lo pueden permitir
  const want = !hasSock(g) ? 3 : kn.globo && (!bs.length || more) ? 10 : small ? 6 : 0;
  add('tejer', want && cloth < want + 2 && busyWith(g, 'tejer') < 2 ? (woolOf(g) ? 3 : 2) : 0);
  add('manga', !hasSock(g) && cloth >= 3 && g.wood >= 4 && !busyWith(g, 'manga') ? 4 : 0);
  add('globo', kn.globo && hasSock(g) && (!bs.length || more) && cloth >= 10 && g.wood >= 6 && !busyWith(g, 'globo') ? (bs.length ? 2.5 : 4) : 0);
  add('cesta', small && cloth >= 6 && g.wood >= 6 && pop >= 4 + small.cap * 4 && !busyWith(g, 'cesta') ? 2 : 0);
  add('volar', ageOf(v) >= ADULT_H && flyWeather(g) && busyWith(g, 'volar') < parkedReady(g).length ? (v.oficio === 'cartógrafo' ? 6 : 2.5) : 0);
}
// Adónde ir para cada trabajo (se llama desde setupTask)
function balloonTarget(v, g, job){
  if (job === 'tejer') { const [x, y] = fireSpot(v, g); return { k:job, x:x + (Math.random() - .5) * 8, y }; }
  if (job === 'manga') {
    if (!g.aero) g.aero = aeroSite(g);
    if (!g.aero) { (g.jobFail ||= {}).manga = yearT + DAY_LEN; return null; }
    const [x, y] = sockXY(g); return { k:job, x:x - 3, y:y + 2 };
  }
  if (!g.aero) return null;
  const [x, y] = aeroCenter(g); return { k:job, x:x + (Math.random() - .5) * 10, y:y + 6 };
}
// Al llegar: cuánto tarda y qué pasa al acabar (se llama desde runTask)
function balloonArrive(v, g, t){
  const bs = balloonsOf(g);
  switch (t.k) {
    case 'tejer': v.actT = 6; v.onDone = () => { const n = woolOf(g) ? 2 : 1; g.cloth = (g.cloth || 0) + n; floats.push({ x:v.x, y:v.y - 12, txt:`+${n} tela${woolOf(g) ? ' (lana)' : ' (lino)'}`, col:'#e8dcc0', life:0 }); }; return true;
    case 'manga': v.actT = 8; v.onDone = () => {
      const A = g.aero; if (!A || A.sock || (g.cloth || 0) < 3 || g.wood < 4) return;
      g.cloth -= 3; g.wood -= 4; A.sock = true; A.since = yearT; clearSite(g, A.x0 - 2, A.y0, A.x0 + A.w + 1, A.y0 + A.h + 6); // también los árboles de delante, que la taparían
      const [dx, dy] = A.door || [A.x0 + 4, A.y0 + 7]; connect(g, dx, dy - 1); // un camino desde la entrada hasta el pueblo
      notify(`En ${g.name} levantan una manga de viento junto a un puerto de globos: ya saben de dónde sopla y con qué fuerza`, { x:v.x, y:v.y });
    }; return true;
    case 'globo': v.actT = 12; v.onDone = () => {
      if (bs.length >= MAX_BALLOONS || (g.cloth || 0) < 10 || g.wood < 6 || !g.aero) return;
      const slot = [0, 1, 2].find(k => !bs.some(b => b.slot === k)); if (slot == null) return;
      g.cloth -= 10; g.wood -= 6; const nb = { id:(g.balloonSeq = (g.balloonSeq || 1) + 1), slot, alt:0, vx:0, vy:0, tilt:0, tw:0, inf:0, flame:0, cap:1, state:'aparcado', crew:[], ready:yearT + 10, flights:0 };
      [nb.x, nb.y] = homeSpot(g, nb); bs.push(nb);
      notify(bs.length === 1 ? `¡En ${g.name} han cosido su primer globo aerostático! De momento cabe una persona` : `En ${g.name} cosen otro globo: ya tienen ${bs.length}`, { x:nb.x, y:nb.y });
    }; return true;
    case 'cesta': v.actT = 8; v.onDone = () => {
      const b = bs.filter(x => x.cap < 4 && x.state === 'aparcado').sort((a, c) => a.cap - c.cap)[0];
      if (!b || (g.cloth || 0) < 6 || g.wood < 6) return;
      g.cloth -= 6; g.wood -= 6; b.cap++;
      notify(`En ${g.name} agrandan el globo y su cesta: ahora caben ${b.cap} personas`, { x:b.x, y:b.y });
    }; return true;
    case 'volar': v.actT = 1.5; v.onDone = () => startFlight(v, g); return true;
    case 'embarcar': // un pasajero que llega a la plataforma: se sube si aún hay sitio
      { const b = bs.find(x => x.id === t.bid && x.state === 'embarque' && x.crew.length < x.cap); if (b) board(v, b); else v.task = null; }
      return true;
  }
  return false;
}
function board(v, b){ releaseTask(v); dismount(v); v.task = { k:'viaje' }; v.away = true; v.x = b.x; v.y = b.y; if (!b.crew.includes(v)) b.crew.push(v); }
// ¿Adónde vuelan? A cartografiar lo que no conocen, a visitar a un pueblo amigo o a por madera o piedra
function pickMission(g){
  const opts = [], [hx, hy] = aeroCenter(g), ftile = (x, y) => tileFree(x, y) && !pathMap.has(y * W + x);
  if (hasPaper(g)) {
    const ch = chartOf(g), cwz = chartW();
    for (let k = 0; k < 300; k++) {
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 90, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d);
      if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || ch[Math.floor(y / CZ) * cwz + Math.floor(x / CZ)] > 40) continue;
      opts.push([3, { kind:'explorar', tx:x * T, ty:y * T }]); break;
    }
  }
  const friends = villages.filter(o => o !== g && popOf(o) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 170 && (() => { const r = rels.get(relKey(g, o)); return r && r.known && !r.war; })());
  if (friends.length) {
    const o = friends[Math.floor(Math.random() * friends.length)];
    // Si tienen puerto de globos, a uno de sus huecos libres; si no, junto al pueblo. Los dirigibles solo amarran en
    // plataformas de dirigibles y los globos solo en puertos de globos: si no es el suyo, se posan junto al pueblo
    const taken = new Set(villages.flatMap(q => balloonsOf(q).map(b => b.mission && b.mission.to === o.id && b.mission.slot)).filter(Boolean));
    const slot = hasSock(o) && knowsSci(o, 'dirigible') === knowsSci(g, 'dirigible') ? [3, 4].find(k => !taken.has(k)) : null;
    if (slot) { const [sx, sy] = aeroSpot(o, slot); opts.push([2, { kind:'visita', to:o.id, tx:sx, ty:sy, slot }]); }
    else { const p = ringFind(o.fx, o.fy + 8, 14, ftile); if (p) opts.push([2, { kind:'visita', to:o.id, tx:p[0] * T + 2, ty:p[1] * T + 3 }]); }
  }
  // Comercio: con algo que sobre en el almacén, a vendérselo a un pueblo amigo con mercado o ruta comercial
  const GOODS_B = { food:'comida', wood:'madera', stone:'piedra' };
  const sell = Object.keys(GOODS_B).map(k => [k, k === 'food' ? g.food - popOf(g) * 4 : (g[k] || 0) - 40]).filter(([, n]) => n > 10).sort((a, b) => b[1] - a[1])[0];
  const buyers = friends.filter(o => o.market != null || (rels.get(relKey(g, o)) || {}).route);
  if (sell && buyers.length) {
    const o = buyers[Math.floor(Math.random() * buyers.length)], p = ringFind(o.fx, o.fy + 8, 14, ftile);
    if (p) opts.push([4, { kind:'comercio', to:o.id, tx:p[0] * T + 2, ty:p[1] * T + 3, good:sell[0], gname:GOODS_B[sell[0]] }]);
  }
  // En guerra: a soltar rocas sobre un pueblo enemigo (si tienen piedra para cargarlas)
  if ((g.stone || 0) >= 4) {
    const foes = villages.filter(o => o !== g && popOf(o) && atWar(g, o) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 170);
    if (foes.length) { const o = foes[Math.floor(Math.random() * foes.length)]; opts.push([8, { kind:'bombardeo', to:o.id, tx:o.fx * T, ty:o.fy * T }]); }
  }
  const res = g.wood < g.stone + 10 ? 'tree' : 'stone';
  for (let k = 0; k < 200; k++) {
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 60, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d);
    if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4) continue;
    let n = 0; for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) { const o = world.objs[yy * W + xx]; if (o && OBJ[o.key][1] === res) n++; }
    if (n < 4) continue;
    const p = ringFind(x, y, 6, ftile); if (!p) continue;
    opts.push([2, { kind:'recursos', res, tx:p[0] * T + 2, ty:p[1] * T + 3 }]); break;
  }
  if (!opts.length) return null;
  let r = Math.random() * opts.reduce((s, o) => s + o[0], 0);
  for (const [w, m] of opts) if ((r -= w) < 0) return m;
  return opts[0][1];
}
function startFlight(v, g){
  const b = parkedReady(g)[0]; if (!b || !flyWeather(g)) return;
  if (knowsSci(g, 'dirigible')) { if ((g.coal || 0) < 2) { b.ready = yearT + 40; return; } g.coal -= 2; } // el motor del dirigible quema carbón
  const m = pickMission(g); if (!m) { b.ready = yearT + 40; return; }
  b.mission = m; b.crew = []; board(v, b); b.state = 'embarque'; b.waitT = 7; b.pilot = v;
  if (m.kind === 'comercio') { const have = m.good === 'food' ? g.food - popOf(g) * 4 : (g[m.good] || 0) - 40, n = Math.max(0, Math.min(25, Math.floor(have))); g[m.good] -= n; b.goods = { k:m.good, n }; } // la carga, en la cesta
  // Avisan a quien esté libre cerca para que suba (hasta llenar la cesta)
  const [px, py] = homeSpot(g, b);
  const free = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && u !== g.leader && !u.sleep && !u.boat && !u.mount && !(u.actT > 0) && ageOf(u) >= ADULT_H && (!u.task || ['pasear', 'ocio'].includes(u.task.k)) && Math.hypot(u.x - px, u.y - py) < 160);
  for (const u of free.slice(0, b.cap - 1)) { releaseTask(u); u.task = { k:'embarcar', bid:b.id, x:px + (Math.random() - .5) * 10, y:py + 6 }; u.lastD = Infinity; }
}
// Bajan todos a tierra en la plataforma (o donde estén, si el pueblo ya no existe)
function disembark(g, b){
  for (const u of b.crew) if (!u.dead) { u.away = false; u.task = null; u.x = b.x + (Math.random() - .5) * 8; u.y = b.y + 4 + Math.random() * 3; u.wait = .5; }
  b.crew = []; b.pilot = null;
}
function updateBalloons(dt){
  for (const g of villages) {
    const kn = g.know ||= {}, pop = popOf(g);
    if (!pop) { for (const b of balloonsOf(g)) if (b.crew.length) disembark(g, b); continue; }
    // Aprenden a medir el viento cuando ya hacen mapas; y a volar tras observar un tiempo la manga
    if (!kn.manga && hasPaper(g) && pop >= 10 && g.hall != null && Math.random() < dt * .003) {
      kn.manga = true; notify(`En ${g.name} quieren saber de dónde viene el viento: aprenden a hacer una manga de viento con tela y madera`, { x:g.fx * T, y:g.fy * T });
    }
    if (kn.manga && !kn.globo && hasSock(g) && yearT - (g.aero.since || 0) > DAY_LEN * .6 && Math.random() < dt * .01) {
      kn.globo = true; notify(`Mirando la manga de viento y el humo que sube de las hogueras, en ${g.name} se les ocurre llenar de aire caliente una gran bolsa de tela: ¡aprenden a hacer globos!`, { x:g.fx * T, y:g.fy * T });
    }
    for (const b of balloonsOf(g).slice()) stepBalloon(g, b, dt);
  }
  updateRocks(dt);
}
function stepBalloon(g, b, dt){
  b.crew = b.crew.filter(u => !u.dead);
  if (!g.aero) return;
  const [px, py] = homeSpot(g, b), w = windAt(b.x, b.y - b.alt), m = b.mission, ws = Math.hypot(w[0], w[1]);
  const pvx = b.vx, pvy = b.vy; let burn = false;
  if (b.state === 'aparcado' || b.state === 'embarque') {
    // Atado a la estaca: hinchado se mece con el viento hasta donde da la cuerda; de noche y con mal tiempo, desinflado
    const up = b.state === 'embarque' || (flyWeather(g) && dayT() > .03 && dayT() < .48);
    b.inf = clamp(b.inf + (up ? .25 : -.15) * dt, 0, 1); burn = up && b.inf < 1;
    b.alt += ((b.inf > .9 ? 7 : 0) - b.alt) * Math.min(1, dt * 1.5);
    const tx = px + clamp(w[0] * .9, -6, 6) * b.inf, ty = py + clamp(w[1] * .5, -3, 3) * b.inf;
    b.vx = (tx - b.x) * 1.5; b.vy = (ty - b.y) * 1.5; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.state === 'embarque') {
      b.waitT -= dt;
      if ((b.waitT <= 0 || b.crew.length >= b.cap) && b.inf > .97) {
        b.state = 'despegue'; b.phase = 'ida'; b.flights++; b.hp = b.hp ?? 1;
        if (m.kind === 'bombardeo') { const n = Math.min(Math.floor((g.stone || 0) / 2), 2 + b.cap * 2); g.stone -= n * 2; b.rocks = n; if (!n) { m.kind = 'explorar'; b.phase = 'vuelta'; } }
        for (const u of villagers) if (u.task && u.task.k === 'embarcar' && u.task.bid === b.id && u.vid === g.id) u.task = null; // los que no llegaron, se quedan
        if (m.kind === 'bombardeo') notify(`¡El globo de ${g.name} despega cargado con ${b.rocks} rocas para bombardear ${villageById(m.to)?.name || 'al enemigo'}!`, { x:b.x, y:b.y });
        else if (b.flights <= 2 || b.flights % 6 === 0) notify(`El globo de ${g.name} despega con ${b.crew.length} ${b.crew.length === 1 ? 'persona' : 'personas'} ${m.kind === 'explorar' ? 'a cartografiar desde el aire' : m.kind === 'visita' ? `a visitar ${villageById(m.to)?.name || 'otro pueblo'}` : m.kind === 'comercio' ? `a vender ${b.goods ? b.goods.n : ''} de ${m.gname} a ${villageById(m.to)?.name || 'otro pueblo'}` : `a por ${m.res === 'tree' ? 'madera' : 'piedra'}`}`, { x:b.x, y:b.y });
      }
      if (!b.crew.length) { b.state = 'aparcado'; b.mission = null; }
    }
  } else if (b.state === 'despegue') {
    burn = true; b.alt = Math.min(BAL_CRUISE, b.alt + 9 * dt);
    b.vx += (w[0] * .6 - b.vx) * dt; b.vy += (w[1] * .6 - b.vy) * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.alt >= BAL_CRUISE) b.state = 'vuelo';
  } else if (b.state === 'vuelo') {
    // Se dirige hacia su destino, pero el viento lo arrastra: va algo de lado y con cierta inercia
    const home = b.phase === 'vuelta', tx = home ? px : m.tx, ty = home ? py : m.ty, d = Math.hypot(tx - b.x, ty - b.y) || 1;
    const zep = knowsSci(g, 'dirigible'), spd = zep ? 26 : knowsSci(g, 'aeronautica') ? 18 : 13, drift = zep ? .3 : .7, dvx = (tx - b.x) / d * spd + w[0] * drift, dvy = (ty - b.y) / d * spd + w[1] * drift; // aeronáutica (ciencia.js) y dirigible, con motor (industria.js)
    b.vx += (dvx - b.vx) * Math.min(1, dt * .8); b.vy += (dvy - b.vy) * Math.min(1, dt * .8);
    b.x += b.vx * dt; b.y += b.vy * dt; b.alt = BAL_CRUISE + Math.sin(yearT * .7) * 2;
    if ((b.burnT = (b.burnT || 0) - dt) <= 0) b.burnT = 2.5 + Math.random() * 2; burn = b.burnT > 2.2; // fogonazos de vez en cuando para no perder altura
    if (d < 10) {
      if (!home && m.kind === 'explorar') { b.phase = 'vuelta'; }
      else if (!home && m.kind === 'bombardeo') { b.state = 'bombardeo'; b.bombT = .5; b.bombEnd = yearT + 45; b.aim = null; b.kills = 0; }
      else b.state = 'aterrizaje';
    }
  } else if (b.state === 'aterrizaje') {
    const home = b.phase === 'vuelta', tx = home ? px : m.tx, ty = home ? py : m.ty;
    b.vx = (tx - b.x) * 1.2; b.vy = (ty - b.y) * 1.2; b.x += b.vx * dt; b.y += b.vy * dt;
    b.alt = Math.max(0, b.alt - (b.alt > 12 ? 9 : 5) * dt); burn = b.alt > 3 && b.alt < 10 && Math.random() < .3; // un último fogonazo para posarse suave
    if (b.alt <= 0) {
      if (home) { arriveHome(g, b); return; }
      b.state = 'en_tierra'; b.groundT = 6;
    }
  } else if (b.state === 'bombardeo') {
    // Baja a unos 30 de altura y va de un edificio a otro soltando una roca sobre cada uno
    const o = villageById(m.to);
    if (!o || !popOf(o) || !atWar(g, o) || b.rocks <= 0 || yearT > b.bombEnd) { b.phase = 'vuelta'; b.state = 'vuelo'; if (b.kills) notify(`El bombardeo desde el globo de ${g.name} deja ${b.kills} ${b.kills === 1 ? 'muerto' : 'muertos'} en ${o ? o.name : 'el pueblo enemigo'}`, { x:b.x, y:b.y }); }
    else {
      if (!b.aim) { const bs = buildingsOf(o).filter(i => world.objs[i]); const i = bs.length ? bs[Math.floor(Math.random() * bs.length)] : o.fy * W + o.fx; b.aim = [(i % W) * T + 2, ((i / W) | 0) * T - 2]; }
      const d = Math.hypot(b.aim[0] - b.x, b.aim[1] - b.y) || 1, sp = 9;
      b.vx += ((b.aim[0] - b.x) / d * sp + w[0] * .4 - b.vx) * Math.min(1, dt * 1.2); b.vy += ((b.aim[1] - b.y) / d * sp + w[1] * .4 - b.vy) * Math.min(1, dt * 1.2);
      b.x += b.vx * dt; b.y += b.vy * dt; b.alt += (30 - b.alt) * Math.min(1, dt);
      if ((b.bombT -= dt) <= 0 && d < 6) {
        balloonRocks.push({ x:b.x, y:b.y, alt:b.alt - 2, vz:0, vx:b.vx * .4, vy:b.vy * .4, from:g.id, to:o.id, bid:b.id }); b.rocks--; b.bombT = 1.2; b.aim = null;
        if (!b.bombMsg || yearT - b.bombMsg > 60) { b.bombMsg = yearT; notify(`¡El globo de ${g.name} suelta rocas sobre ${o.name}!`, { x:b.x, y:b.y }); }
      }
    }
  } else if (b.state === 'cayendo') {
    // Derribado: pierde el aire y cae dando vueltas
    b.vz = (b.vz || 0) + 30 * dt; b.alt -= (6 + b.vz) * dt; b.inf = Math.max(.2, b.inf - .35 * dt); b.tw += (Math.random() - .5) * 8 * dt;
    b.vx += (w[0] - b.vx) * dt; b.vy += (w[1] - b.vy) * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.alt <= 0) { crashBalloon(g, b); return; }
  } else if (b.state === 'en_tierra') {
    b.vx = b.vy = 0;
    if ((b.groundT -= dt) <= 0) { missionDone(g, b); b.phase = 'vuelta'; b.state = 'despegue'; }
  }
  // La cesta cuelga del globo como un péndulo: el viento y los cambios de velocidad la inclinan, con algo de vaivén
  const ax = (b.vx - pvx) / Math.max(dt, .001), air = b.alt > 2 ? 1 : 0;
  const target = clamp((w[0] - b.vx) * .02 * (air ? 1 : .6) + w[0] * .015 - ax * .01, -.32, .32) * b.inf;
  b.tw += ((target - b.tilt) * 7 - b.tw * 2.4) * dt + (Math.random() - .5) * ws * .02 * dt * 10;
  b.tilt = clamp(b.tilt + b.tw * dt, -.42, .42);
  if (knowsSci(g, 'dirigible') && b.inf > .5) b.tilt *= .35; // el dirigible es rígido: apenas cabecea
  if (Math.abs(b.vx) > 2.5) b.face = Math.sign(b.vx); // hacia dónde mira el dirigible (con margen, para que no tiemble)
  b.flame = burn ? Math.min(1, b.flame + dt * 6) : Math.max(0, b.flame - dt * 4);
  if (burn && b.flame > .9 && Math.random() < dt * 2) snd('burner', b.x, b.y - b.alt);
  for (const u of b.crew) { u.x = b.x; u.y = b.y; }
  if (b.alt > 4 && !['aparcado', 'embarque', 'cayendo'].includes(b.state)) shootAtBalloon(g, b, dt);
  if ((b.hp ?? 1) < .45 && b.alt > 4 && Math.random() < dt * 3) smoke.push({ x:b.x + (Math.random() - .5) * 6, y:b.y - b.alt - 14, vx:0, vy:-6, r:2, life:0, max:1.5 }); // roto: le sale humo
  // Desde arriba se ve mucho más lejos: lo que ven va al mapa del pueblo (y descubren pueblos que no conocían)
  if (b.alt > 20 && hasPaper(g) && (b.mapT = (b.mapT || 0) - dt) <= 0) {
    b.mapT = 1;
    if (chartMark(chartOf(g), b.x, b.y, 2 + Math.round(b.alt / 14), Math.min(250, cartoConf(g) + 20))) g.chartVer++;
    for (const o of villages) if (o !== g && popOf(o) && Math.hypot(o.fx * T - b.x, o.fy * T - b.y) < b.alt * 2.5) { const r = relOf(g, o); if (!r.known) { r.known = true; r.v = 0; notify(`Desde el globo, los de ${g.name} ven a lo lejos ${o.name}`, { x:o.fx * T, y:o.fy * T }); } }
  }
}
// Los arqueros (y ballesteros) de los pueblos en guerra con él le disparan si pasa cerca y no va muy alto
function shootAtBalloon(g, b, dt){
  if ((b.foeT = (b.foeT || 0) - dt) <= 0) { b.foeT = .5; b.foes = villagers.filter(u => !u.dead && !u.away && !u.sleep && isRanged(u.weapon) && Math.hypot(u.x - b.x, u.y - b.y) < 110 && villageById(u.vid) && atWar(g, villageById(u.vid))); }
  if (!b.foes || !b.foes.length || b.alt > 70) return;
  for (const u of b.foes) {
    if (u.dead || Math.hypot(u.x - b.x, u.y - b.y) > 85 || (ARCHER_CD.get(u) || 0) > yearT) continue;
    ARCHER_CD.set(u, yearT + (u.weapon === 'ballesta' ? 2.2 : 1.5) * (.8 + Math.random() * .4));
    const hit = Math.random() < .3 - b.alt / 300, tgt = { x:b.x, y:b.y - b.alt - 10, dead:false };
    u.dir = b.x < u.x ? -1 : 1; arrows.push({ x0:u.x, y0:u.y - 5, a:tgt, v:u, t:0, dur:.4, hit, vis:true, bolt:u.weapon === 'ballesta' }); snd('arrow', u.x, u.y);
    if (!hit) continue;
    b.hp = (b.hp ?? 1) - (u.weapon === 'ballesta' ? .14 : .07) * (knowsSci(g, 'aeronautica') ? .65 : 1);
    if (b.hp <= 0 && b.state !== 'cayendo') {
      b.state = 'cayendo'; b.vz = 0; b.rocks = 0;
      notify(`¡Los arqueros de ${villageById(u.vid).name} derriban a flechazos el globo de ${g.name}!`, { x:b.x, y:b.y });
      return;
    }
  }
}
// Se estrella: mueren todos los de dentro y el globo queda destrozado (tendrán que coser otro)
function crashBalloon(g, b){
  const n = b.crew.length, foe = b.mission && villageById(b.mission.to), r = foe && warRel(g, foe);
  for (const u of b.crew) if (!u.dead) { u.away = false; u.task = null; u.x = b.x; u.y = b.y; killVillager(u, 'guerra'); if (r && r.war) r.war.dead = (r.war.dead || 0) + 1; }
  addEffect(b.x, b.y, 'poof'); snd('boom', b.x, b.y, .35);
  for (let k = 0; k < 10; k++) chips.push({ x:b.x, y:b.y - 3, vx:(Math.random() - .5) * 34, vy:-8 - Math.random() * 14, life:0, max:.7 + Math.random() * .5, col:k % 3 ? '#8a5a2a' : `rgb(${villageColor(g).join(',')})` });
  g.balloons = balloonsOf(g).filter(x => x !== b); g.balloonsLost = (g.balloonsLost || 0) + 1; misfortune(g, 'guerra');
  notify(`El globo de ${g.name} se estrella${n ? `: ${n === 1 ? 'muere quien iba dentro' : `mueren las ${n} personas que iban dentro`}` : ''}${g.balloons.length ? '' : '. Tendrán que coser otro'}`, { x:b.x, y:b.y });
}
// Las rocas que suelta: caen con gravedad y, al llegar al suelo, destrozan edificios y aplastan a quien pillan
function updateRocks(dt){
  for (const r of balloonRocks) {
    r.vz += 70 * dt; r.alt -= r.vz * dt; r.x += r.vx * dt; r.y += r.vy * dt;
    if (r.alt > 0) continue;
    r.done = true; const tx = Math.floor(r.x / T), ty = Math.floor(r.y / T), g = villageById(r.from), o = villageById(r.to);
    for (let y = ty - 1; y <= ty + 3; y++) for (let x = tx - 3; x <= tx + 3; x++) if (x >= 0 && y >= 0 && x < W && y < H) damageBuilding(y * W + x, .4);
    for (const u of villagers) {
      if (u.dead || u.away || Math.hypot(u.x - r.x, u.y - r.y) > 8) continue;
      u.hp = (u.hp ?? 1) - .75;
      if (u.hp <= 0) { killVillager(u, 'guerra'); const bl = g && balloonsOf(g).find(x => x.id === r.bid); if (bl) bl.kills = (bl.kills || 0) + 1; const wr = g && o && warRel(g, o); if (wr && wr.war) wr.war.dead = (wr.war.dead || 0) + 1; }
      else hurtFx(u, r.x, r.y, walkable);
    }
    addEffect(r.x, r.y, 'poof'); if (o) misfortune(o, 'guerra');
    for (let k = 0; k < 6; k++) chips.push({ x:r.x, y:r.y - 2, vx:(Math.random() - .5) * 26, vy:-6 - Math.random() * 10, life:0, max:.5 + Math.random() * .3, col:k % 2 ? '#7a7068' : '#a89880' });
    if (onScreen(r.x, r.y)) { snd('boom', r.x, r.y, .2); shake = Math.max(shake, .6); }
  }
  if (balloonRocks.length) balloonRocks = balloonRocks.filter(r => !r.done);
}
// En el destino: recogen lo que han venido a buscar o hacen la visita
function missionDone(g, b){
  const m = b.mission, n = b.crew.length; if (!m) return;
  if (m.kind === 'recursos') {
    // Talan o pican alrededor de donde se han posado (lo que cabe en la cesta)
    const k = m.res === 'tree' ? 'madera' : 'piedra', amt = 3 + n * 3; b.cargo = { k, n:amt };
    floats.push({ x:b.x, y:b.y - 16, txt:`+${amt} ${k}`, col:k === 'madera' ? '#e0b070' : '#d8d4cc', life:0 });
    snd(m.res === 'tree' ? 'chop' : 'pick', b.x, b.y);
  } else if (m.kind === 'comercio') {
    const o = villageById(m.to), G = b.goods; b.goods = null; if (!o || !popOf(o) || !G || !G.n) { if (G) g[G.k] += G.n; return; }
    o[G.k] = (o[G.k] || 0) + G.n; const r = relOf(g, o); r.v = clamp(r.v + 3, -100, 100); tradeTrip(g, o, r); g.trades = (g.trades || 0) + 1; o.trades = (o.trades || 0) + 1;
    const eg = ecOf(g), eo = ecOf(o), pay = Math.round(G.n * priceOf(o) * (G.k === 'food' ? .7 : .5));
    if (eg && eo) { eo.treas -= pay; eg.treas += pay; moneyFlow(o, g, `${pay} ${o.coin} por ${G.n} de ${m.gname}`); }
    else { const back = o.food > popOf(o) * 4 ? 'food' : 'wood', n2 = Math.round(G.n * .8); o[back] -= n2; b.cargo = { k:back === 'food' ? 'comida' : 'madera', n:n2 }; }
    floats.push({ x:b.x, y:b.y - 16, txt:`vendido: ${G.n} de ${m.gname}`, col:'#f0d060', life:0 });
    notify(`El globo comercial de ${g.name} aterriza en ${o.name} y vende ${G.n} de ${m.gname}${eg && eo ? ` por ${pay} ${o.coin}` : ''}`, { x:b.x, y:b.y });
  } else if (m.kind === 'visita') {
    const o = villageById(m.to); if (!o || !popOf(o)) return;
    const r = relOf(g, o); r.v = clamp(r.v + 4 + n * 2, -100, 100);
    shareCharts(g, o); const got = r.war ? [] : doTrade(g, o);
    if (typeof languageMeet === 'function') languageMeet(g, o, b.crew);
    notify(`El globo de ${g.name} aterriza en ${o.name}: ${got.length ? `comercian (${got.join(', ')}) y ` : ''}mejoran sus relaciones`, { x:b.x, y:b.y });
  }
}
function arriveHome(g, b){
  if (b.cargo) { if (b.cargo.k === 'madera') g.wood += b.cargo.n; else if (b.cargo.k === 'comida') g.food += b.cargo.n; else g.stone += b.cargo.n; clampStore(g); b.cargo = null; }
  if (b.goods) { g[b.goods.k] += b.goods.n; b.goods = null; } // (si no llegó a venderla, la carga vuelve al almacén)
  disembark(g, b); b.state = 'aparcado'; b.mission = null; b.phase = null; b.ready = yearT + 50 + Math.random() * 60;
}
// ---- Dibujo ----
// Con el arte del atlas (globo, cesta, plataforma, palo y manga); si aún no ha cargado, con figuras sencillas.
// Las partes rojas del globo y de la manga se tiñen del color de la nación (con sus luces y sombras)
const BAL_TINT = new Map();
function tintedArt(key, col){
  const base = artFrame(key); if (!base) return null;
  const ck = key + '|' + col.join(','); let c = BAL_TINT.get(ck); if (c) return c;
  c = document.createElement('canvas'); c.width = base.width; c.height = base.height; c.ax = base.ax;
  const x = c.getContext('2d'); x.drawImage(base, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2]; if (p[i + 3] < 100 || !(r > g + 45 && r > b + 35)) continue;
    const l = Math.min(1.25, r / 200); p[i] = Math.min(255, col[0] * l); p[i + 1] = Math.min(255, col[1] * l); p[i + 2] = Math.min(255, col[2] * l);
  }
  x.putImageData(d, 0, 0); if (BAL_TINT.size > 200) BAL_TINT.clear(); BAL_TINT.set(ck, c);
  return c;
}
// El globo con la bandera de su nación pintada en el centro de la tela, con su proporción (3:2) y las luces, sombras
// y el contorno del dibujo (las provincias llevan la bandera de su nación)
function flagBalloon(g, col){
  const env = tintedArt('balloon:globo', col), n = nationOf(g), flag = n.flag || g.flag; if (!env || !flag) return env;
  const ck = 'fb|' + col.join(',') + '|' + (n.flagUrl || g.flagUrl || n.id); let c = BAL_TINT.get(ck); if (c) return c;
  c = document.createElement('canvas'); c.width = env.width; c.height = env.height; c.ax = env.ax;
  const x = c.getContext('2d'); x.drawImage(env, 0, 0);
  const fw = Math.max(6, Math.round(env.width * .46)), fh = Math.max(4, Math.round(fw * 2 / 3)), fx = Math.round((env.width - fw) / 2), fy = Math.round(env.height * .42 - fh / 2), prev = vctx;
  vctx = x; x.globalCompositeOperation = 'source-atop'; try { drawFlag(flag, fx, fy, fw, fh, 1); } finally { vctx = prev; x.globalCompositeOperation = 'source-over'; }
  const o = env.getContext('2d').getImageData(0, 0, c.width, c.height).data, d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let yy = fy; yy < fy + fh; yy++) for (let xx = fx; xx < fx + fw; xx++) {
    const i = (yy * c.width + xx) * 4; if (o[i + 3] < 100) continue;
    const lum = (o[i] * .3 + o[i + 1] * .59 + o[i + 2] * .11) / 255;
    if (lum < .22) { p[i] = o[i]; p[i + 1] = o[i + 1]; p[i + 2] = o[i + 2]; continue; } // el contorno, como estaba
    const sh = .55 + .55 * Math.min(1, lum / .7) - (xx / c.width > .72 ? .12 : 0);    // luz de la izquierda, sombra a la derecha
    p[i] = Math.min(255, p[i] * sh); p[i + 1] = Math.min(255, p[i + 1] * sh); p[i + 2] = Math.min(255, p[i + 2] * sh);
  }
  x.putImageData(d, 0, 0); BAL_TINT.set(ck, c);
  return c;
}
// La plataforma en el suelo: piedra con la marca de aterrizaje (o, sin arte, tablones en círculo)
function drawAeros(){
  const [x0, y0, x1, y1] = visibleRect(), pad = artFrame('aero:pista'), plat = artFrame('aero:plataforma');
  for (const g of villages) {
    const A = g.aero; if (!A || !A.sock) continue; const px = A.x0 * T, py = A.y0 * T, pw = A.w * T, ph = A.h * T;
    if (px > x1 || px + pw < x0 || py > y1 || py + ph < y0) continue;
    const [cx, cy] = aeroCenter(g);
    if (plat && knowsSci(g, 'dirigible')) { const f = ART_MAP['aero:plataforma']; vctx.drawImage(plat, Math.round(cx - f[4]), Math.round(cy - plat.height * .42)); continue; } // con dirigibles: la plataforma elevada, con el círculo bajo el que amarran
    if (pad) { vctx.drawImage(pad, Math.round(cx - pad.ax), Math.round(cy - pad.height / 2)); continue; }
    const rx = pw / 2 - 3, ry = ph / 2 - 3;
    vctx.save(); vctx.beginPath(); vctx.ellipse(cx, cy, rx + 1, ry + 1, 0, 0, Math.PI * 2); vctx.fillStyle = '#5e4026'; vctx.fill();
    vctx.beginPath(); vctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); vctx.fillStyle = '#9c7548'; vctx.fill(); vctx.clip();
    vctx.fillStyle = 'rgba(70,46,24,.45)'; for (let yy = py; yy < py + ph; yy += 3) vctx.fillRect(px, yy, pw, .5); // tablones
    vctx.restore();
    vctx.strokeStyle = 'rgba(240,226,190,.85)'; vctx.lineWidth = 1;
    vctx.beginPath(); vctx.ellipse(cx, cy, rx * .55, ry * .55, 0, 0, Math.PI * 2); vctx.stroke(); // círculo de aterrizaje
  }
}
// La manga de viento: cuelga del brazo del palo y apunta hacia donde va el viento; con viento fuerte se estira
// (fotograma 0) y sin viento cuelga (4). El palo gira para que el brazo quede a favor del viento
function drawWindsock(g, now){
  const [sx, sy] = sockXY(g), [wx, wy] = windAt(sx, sy), s = clamp(Math.hypot(wx, wy) / 9, 0, 1), dir = wx < 0 ? -1 : 1;
  const pole = artFrame('aero:palo'), col = villageColor(g);
  vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(sx - 1, sy + 1, 4, 1);
  if (pole) {
    const f = s > .75 ? 0 : s > .55 ? 1 : s > .38 ? 2 : s > .2 ? 3 : 4, sock = tintedArt(`sock:${f}`, col);
    vctx.save(); vctx.translate(sx, sy); vctx.scale(dir, 1);
    vctx.drawImage(pole, -pole.ax, -pole.height + 1);
    const tipX = -pole.ax + pole.width - 1, tipY = -pole.height + 3, flut = Math.round(Math.sin(now / 110 + sx) * (s > .2 ? .6 : 0));
    if (sock) vctx.drawImage(sock, tipX - 1, tipY - 1 + flut);
    vctx.restore();
    // Rachas de viento que pasan junto a la manga cuando sopla fuerte
    const gust = s > .45 && artFrame(`wind:${Math.min(4, Math.floor((s - .45) * 9))}`);
    if (gust) { const ph = (now / 1600 + sx * .013) % 1; vctx.save(); vctx.globalAlpha = Math.sin(ph * Math.PI) * .8; vctx.translate(sx + dir * (ph * 36 - 12), sy - 14 + Math.sin(ph * 6) * 2); vctx.scale(dir, 1); vctx.drawImage(gust, -gust.ax, 0); vctx.restore(); }
    return;
  }
  const a = Math.atan2(wy * .6, wx), sc = clamp(s, .12, 1);
  vctx.fillStyle = '#5a3a20'; vctx.fillRect(sx, sy - 16, 1, 17);
  const top = [sx + .5, sy - 15], L = 9, flutter = Math.sin(now / 90 + sx) * (1 - sc * .5) * .6;
  for (let k = 0; k < 3; k++) {
    const t0 = k / 3, t1 = (k + 1) / 3, r0 = 2.2 - t0 * 1.3, r1 = 2.2 - t1 * 1.3;
    const P = t => { const len = t * L * (.4 + .6 * sc); return [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len + t * t * (1 - sc) * 7 + Math.sin(now / 120 + t * 4) * flutter * t]; };
    const [ax, ay] = P(t0), [bx, by] = P(t1);
    vctx.fillStyle = k % 2 ? '#f2ece0' : `rgb(${col[0]},${col[1]},${col[2]})`;
    vctx.beginPath(); vctx.moveTo(ax, ay - r0); vctx.lineTo(bx, by - r1); vctx.lineTo(bx, by + r1); vctx.lineTo(ax, ay + r0); vctx.closePath(); vctx.fill();
  }
}
function drawBalloons(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const r of balloonRocks) { // rocas cayendo, con su sombra en el suelo
    if (r.x < x0 - 10 || r.x > x1 + 10) continue;
    vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(Math.round(r.x) - 1, Math.round(r.y), 3, 1);
    vctx.fillStyle = '#2e2a26'; vctx.fillRect(Math.round(r.x) - 2, Math.round(r.y - r.alt) - 2, 4, 4);
    vctx.fillStyle = '#8a8278'; vctx.fillRect(Math.round(r.x) - 1, Math.round(r.y - r.alt) - 1, 2, 2);
  }
  for (const g of villages) {
    if (g.aero && g.aero.sock) { const [sx, sy] = sockXY(g); if (sx > x0 - 20 && sx < x1 + 20 && sy > y0 - 30 && sy < y1 + 20) drawWindsock(g, now); }
    for (const b of balloonsOf(g)) {
    if (b.x < x0 - 30 || b.x > x1 + 30 || b.y - b.alt < y0 - 40 || b.y - b.alt > y1 + 30) continue;
    const bx = b.x, by = b.y - b.alt, col = villageColor(g), [cr, cg, cb] = col;
    const env = flagBalloon(g, col), bask = artFrame('balloon:cesta'), bh = bask ? bask.height : 4, bw = bask ? bask.width : 7;
    // Sombra en el suelo, más pequeña y suave cuanto más alto
    const sh = 1 - Math.min(1, b.alt / 70); vctx.fillStyle = `rgba(0,0,0,${.12 + .18 * sh})`;
    vctx.beginPath(); vctx.ellipse(b.x + b.alt * .25, b.y + 1, 4 + 7 * b.inf * (.5 + .5 * sh), 1.5 + sh, 0, 0, Math.PI * 2); vctx.fill();
    // Cuerda a la estaca mientras está aparcado (cuelga en curva)
    if ((b.state === 'aparcado' || b.state === 'embarque') && g.aero) {
      const [px, py] = homeSpot(g, b); vctx.strokeStyle = 'rgba(120,90,50,.95)'; vctx.lineWidth = .5;
      vctx.beginPath(); vctx.moveTo(px, py); vctx.quadraticCurveTo((px + bx) / 2, Math.max(py, by + 2) + 2, bx, by - 1); vctx.stroke();
    }
    // Todo gira con la inclinación alrededor del fondo de la cesta
    const inf = b.inf, mouthY = -bh - BAL_ROPE, zep = knowsSci(g, 'dirigible');
    vctx.save(); vctx.translate(bx, by); vctx.rotate(b.tilt);
    if (zep) { drawAirship(col, 0, .62 + .38 * clamp(b.alt / BAL_CRUISE, 0, 1), now, (b.face || 1) < 0); vctx.restore(); continue; } // dirigible de vapor: sin cesta, mirando hacia donde va; más pequeño aparcado y más grande cuanto más alto (como si se acercara)
    if (inf < .15) { // desinflado: la tela tendida en el suelo junto a la cesta
      if (env) vctx.drawImage(env, -env.width - 2, -4, env.width, 4); else { vctx.fillStyle = `rgb(${cr},${cg},${cb})`; vctx.beginPath(); vctx.ellipse(-8, 1, 7, 1.6, 0, 0, Math.PI * 2); vctx.fill(); }
    } else {
      // Cuerdas: de las esquinas de la cesta a la boca del globo
      vctx.strokeStyle = 'rgba(200,168,110,.95)'; vctx.lineWidth = .45;
      for (const [ax, mx] of [[-bw / 2 + .5, -2], [bw / 2 - .5, 2], [-bw / 4, -1], [bw / 4, 1]]) { vctx.beginPath(); vctx.moveTo(ax, -bh + 1); vctx.lineTo(mx, mouthY); vctx.stroke(); }
      if (env) { // al hincharse crece hacia arriba y se ensancha
        const ew = env.width * (.35 + .65 * inf), eh = env.height * inf;
        vctx.drawImage(env, -ew / 2, mouthY - eh + 1, ew, eh);
      } else {
        const R = 3 + 9 * inf, Hh = 4 + 16 * inf;
        vctx.beginPath(); vctx.moveTo(-1.6, mouthY); vctx.bezierCurveTo(-R * .9, mouthY - Hh * .35, -R * 1.05, mouthY - Hh * .95, 0, mouthY - Hh);
        vctx.bezierCurveTo(R * 1.05, mouthY - Hh * .95, R * .9, mouthY - Hh * .35, 1.6, mouthY); vctx.closePath(); vctx.fillStyle = `rgb(${cr},${cg},${cb})`; vctx.fill();
      }
      if (b.flame > .05) { // fogonazo del quemador
        const fl = b.flame * (2.5 + Math.sin(now / 40) * .8);
        vctx.fillStyle = 'rgba(255,170,40,.9)'; vctx.fillRect(-.8, mouthY + 1 - fl * .3, 1.6, fl * .6);
        vctx.fillStyle = 'rgba(255,240,150,.95)'; vctx.fillRect(-.4, mouthY + 1 - fl * .2, .8, fl * .35);
      }
    }
    // La tripulación asomando y, delante, la cesta
    // La cesta (con su hueco), la gente dentro de cintura para arriba (caben dos a la vista) y, delante, el borde frontal
    if (bask) {
      const front = Math.ceil(bask.height * .45); vctx.drawImage(bask, -bask.ax, -bh);
      const crew = b.crew.slice(0, 2);
      crew.forEach((u, k) => { const s = personSprite(u, 0, k === 1), hh = Math.min(s.height, 9), px = crew.length === 1 ? -s.width / 2 : k ? 0 : -s.width; vctx.drawImage(s, 0, 0, s.width, hh, Math.round(px), -bh + front - hh + 2, s.width, hh); });
      vctx.drawImage(bask, 0, front, bask.width, bask.height - front, -bask.ax, -bh + front, bask.width, bask.height - front);
    } else { vctx.fillStyle = '#7a4e26'; vctx.fillRect(-3.5, -3, 7, 4); vctx.fillStyle = '#a8743c'; vctx.fillRect(-3.5, -3, 7, 1); }
    vctx.restore();
    }
  }
}
// Dirigible (con el descubrimiento del dirigible): cigarro alargado con costillas, timones, góndola y hélice.
// Más grande que el globo y sin cesta: la gente va en su góndola. mouthY es el fondo de la góndola
const AIRSHIP_K = 1.8;
function drawAirship(col, mouthY, inf, now, flip){
  if (flip) { vctx.save(); vctx.scale(-1, 1); drawAirship(col, mouthY, inf, now, false); vctx.restore(); return; } // el dibujo mira a la derecha
  const art = tintedArt('airship:dirigible', col);
  if (art) { const w = art.width * inf * AIRSHIP_K, h = art.height * inf * AIRSHIP_K; vctx.drawImage(art, -w / 2, mouthY - h, w, h); airshipProp(-w / 2 + w * 7 / 34, mouthY - h + h * 15 / 19, 7 * inf, now); return; }
  const L = 26 * inf * AIRSHIP_K, Hh = 9 * inf * AIRSHIP_K, cy = mouthY - Hh / 2 - 1;
  vctx.fillStyle = '#22201e'; vctx.beginPath(); vctx.ellipse(0, cy, L / 2 + 1, Hh / 2 + 1, 0, 0, Math.PI * 2); vctx.fill();
  vctx.fillStyle = `rgb(${col.join(',')})`; vctx.beginPath(); vctx.ellipse(0, cy, L / 2, Hh / 2, 0, 0, Math.PI * 2); vctx.fill();
  vctx.fillStyle = 'rgba(255,255,255,.3)'; vctx.beginPath(); vctx.ellipse(-1, cy - Hh * .2, L * .38, Hh * .18, 0, 0, Math.PI * 2); vctx.fill();
  vctx.fillStyle = 'rgba(0,0,0,.25)'; for (let k = -2; k <= 2; k++) vctx.fillRect(k * L / 6, cy - Hh / 2 + 1, .7, Hh - 2); // costillas
  vctx.fillStyle = '#22201e'; vctx.beginPath(); vctx.moveTo(-L / 2 + 2, cy); vctx.lineTo(-L / 2 - 3, cy - Hh / 2 - 2); vctx.lineTo(-L / 2 - 1, cy); vctx.lineTo(-L / 2 - 3, cy + Hh / 2 + 2); vctx.fill(); // timones
  airshipProp(-L / 2 - 3, cy, 7 * inf, now);
}
// La hélice, girando detrás de la góndola, vista de lado: un disco borroso y las palas, que se alargan y se acortan
function airshipProp(x, y, r, now){
  const k = Math.abs(Math.cos(now / 25)) * r;
  vctx.fillStyle = 'rgba(225,215,195,.28)'; vctx.beginPath(); vctx.ellipse(x, y, r * .3, r, 0, 0, Math.PI * 2); vctx.fill(); // el disco al girar
  vctx.fillStyle = 'rgba(70,50,30,.9)'; vctx.fillRect(x - 1, y - k - .4, 2, k * 2 + .8); // las palas, con su borde
  vctx.fillStyle = 'rgba(214,180,124,.98)'; vctx.fillRect(x - .6, y - k, 1.2, k * 2);
  vctx.fillStyle = '#3a2a1c'; vctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); vctx.fillStyle = '#8a6a44'; vctx.fillRect(x - .6, y - .6, 1.2, 1.2); // el buje
}
