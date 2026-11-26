// World Sim · La guerra, más larga, más táctica y más visible
// ================= Guerra =================
// · Al declarar la guerra, el atacante monta un campamento entre los dos pueblos (tiendas, hoguera y su bandera):
//   desde ahí salen los ataques, que antes se reúnen allí y marchan juntos con su abanderado delante
// · Bajas de cada bando, días de guerra y quién va ganando, en el mapa (sobre la línea del frente) y arriba
// · Las guerras duran más: se acaba cuando han muerto muchos para el tamaño de los dos pueblos, o tras varios días si
//   nadie gana; las treguas y los tratados de paz, también más largos
const warCap = (a, b) => Math.max(24, Math.round((popOf(a) + popOf(b)) * .3)); // (una gran batalla no acaba la guerra de golpe)
// ¿Cabe aquí un campamento? Las tiendas ocupan unas 9×6 casillas: todo tierra libre, sin agua, árboles, caminos,
// campos, murallas ni edificios, y lejos de los pueblos y de los volcanes
function campOk(x, y){
  if (x < 6 || y < 5 || x >= W - 6 || y >= H - 4 || volcDanger(x, y, 4)) return false;
  if (villages.some(o => popOf(o) && Math.hypot(o.fx - x, o.fy - y) < Math.max(10, townRadius(o) * .6))) return false; // nunca dentro de un pueblo
  for (let yy = y - 4; yy <= y + 3; yy++) for (let xx = x - 5; xx <= x + 5; xx++) if (underBuilding(null, xx, yy) || plotIn(xx, yy, xx, yy) || holySet.has(yy * W + xx)) return false; // ni pegadas a un edificio
  for (let yy = y - 3; yy <= y + 2; yy++) for (let xx = x - 4; xx <= x + 4; xx++) {
    const i = yy * W + xx, o = world.objs[i];
    if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || farmMap.has(i) || plazaSet.has(i) || wallSet.has(i) || bridgeSet.has(i) || (o && OBJ[o.key][1] !== 'stone' && OBJ[o.key][1] !== 'berry')) return false;
  }
  return true;
}
// Campamento del atacante: a un tercio del camino, en tierra libre
function warCamp(att, def, r){
  const dd = Math.hypot(def.fx - att.fx, def.fy - att.fy) || 1, k = Math.min(dd * .45, 40);
  const p = ringFind(Math.round(att.fx + (def.fx - att.fx) / dd * k), Math.round(att.fy + (def.fy - att.fy) / dd * k), 14, campOk);
  if (p) r.war.camp = { x:p[0], y:p[1], nat:nationOf(att).id };
}
// Una baja: se apunta al bando que la sufre (desde la pelea y los bombardeos)
function warLoss(r, loser){ if (!r || !r.war || !loser) return; if (nationOf(loser).id === r.war.att || loser.id === r.war.att) r.war.lossA = (r.war.lossA || 0) + 1; else r.war.lossD = (r.war.lossD || 0) + 1; }
// Quién va ganando (texto corto)
function warScore(r){
  const a = villageById(r.war.att), d = villageById(r.war.def), la = r.war.lossA || 0, ld = r.war.lossD || 0, days = Math.max(1, Math.floor((yearT - r.war.start) / DAY_LEN) + 1);
  const lead = la === ld ? 'igualados' : la < ld ? `gana ${a.name}` : `gana ${d.name}`;
  return { a, d, la, ld, days, lead };
}
// Dibujo: el campamento (tiendas, hoguera, bandera) y el marcador sobre la línea del frente
function drawWarCamps(now){
  const [vx0, vy0, vx1, vy1] = visibleRect(), tent = artFrame('camp:tienda');
  for (const r of rels.values()) {
    if (!r.war) continue; const S = warScore(r); if (!S.a || !S.d) continue;
    const c = r.war.camp;
    if (c) {
      const cx = c.x * T + 2, cy = c.y * T + 3;
      if (!(cx < vx0 - 40 || cx > vx1 + 40 || cy < vy0 - 40 || cy > vy1 + 40)) {
        const n = villageById(c.nat) || S.a, col = villageColor(n);
        for (const [dx, dy] of [[-9, -3], [8, -4], [0, 4]]) { if (tent) vctx.drawImage(tent, cx + dx - (tent.width >> 1), cy + dy - tent.height); else { vctx.fillStyle = `rgb(${col.join(',')})`; vctx.beginPath(); vctx.moveTo(cx + dx - 5, cy + dy); vctx.lineTo(cx + dx, cy + dy - 7); vctx.lineTo(cx + dx + 5, cy + dy); vctx.fill(); } }
        const fl = .6 + .4 * Math.sin(now / 90); vctx.fillStyle = `rgba(255,150,40,${fl})`; vctx.fillRect(cx - 1, cy - 2, 3, 2); vctx.fillStyle = '#ffe080'; vctx.fillRect(cx, cy - 3, 1, 1); // hoguera
        vctx.fillStyle = '#4a3018'; vctx.fillRect(cx + 14, cy - 18, 1, 18); // mástil con la bandera
        if (n.flag) drawFlag(n.flag, cx + 15, cy - 18, 8, 5, 1, now); else { vctx.fillStyle = `rgb(${col.join(',')})`; vctx.fillRect(cx + 15, cy - 18, 7, 5); }
      }
    }
    if (zoom > 4) continue;
    const mx = (S.a.fx + S.d.fx) / 2 * T, my = (S.a.fy + S.d.fy) / 2 * T - 14 / zoom * 2 - (r.war.battle ? 34 : 0); // (con una batalla en marcha, más arriba: no la tapa)
    if (mx < vx0 - 60 || mx > vx1 + 60 || my < vy0 - 30 || my > vy1 + 30) continue;
    const k = 1 / zoom * 2, w = 64 * k, h = 11 * k;
    vctx.fillStyle = 'rgba(20,10,10,.82)'; vctx.fillRect(mx - w / 2, my - h, w, h);
    vctx.font = `bold ${7 * k}px monospace`; vctx.textAlign = 'center';
    vctx.fillStyle = '#f4d0c0'; vctx.fillText(`día ${S.days} · bajas ${S.la}-${S.ld}`, mx, my - 3 * k); vctx.textAlign = 'start';
  }
}
// ---- Guerra civil: el país se parte en dos bandos ----
// Con mucho enfado y la gente dividida (muchos muy de izquierdas y muchos muy de derechas), o bajo una dictadura
// odiada, los descontentos se alzan en armas: se hacen fuertes en un pueblo propio cerca de la capital y luchan contra
// el gobierno con las mismas reglas que cualquier guerra. Si ganan, cae el gobierno y mandan ellos; si pierden,
// vuelven a ser parte del país
function civilWarTick(g, people, dt){
  if (nationOf(g) !== g || (g.civT = (g.civT ?? DAY_LEN) - dt) > 0) return; g.civT = DAY_LEN / 2;
  const adults = people.filter(u => ageOf(u) >= ADULT_H && !u.away); if (adults.length < 20) return;
  if ([...rels.values()].some(r => r.war && r.war.civil && (r.war.att === g.id || r.war.def === g.id))) return;
  const L = adults.filter(u => (u.ideo || 0) < -.3).length / adults.length, R = adults.filter(u => (u.ideo || 0) > .3).length / adults.length;
  const tyr = ['dictadura', 'fascismo', 'comunismo', 'oligarquia'].includes(regimeOf(g)), anger = g.anger || 0;
  const split = L > .3 && R > .3, ripe = (split && anger > 65) || (tyr && anger > 78);
  if (!ripe || Math.random() > .12) return;
  // Los rebeldes: los del lado contrario al gobierno (o los más enfadados, bajo una dictadura)
  const gi = govIdeo(g), side = gi >= 0 ? -1 : 1, rebels = adults.filter(u => u !== g.leader && ((u.ideo || 0) * side > .15 || (tyr && moodOf(u).score < 40))).slice(0, Math.floor(adults.length * .45));
  if (rebels.length < 8) return;
  for (let k = 0; k < 80; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.max(42, (typeof townRadius === 'function' && g.houses.length ? townRadius(g) : 8) + 26) + Math.random() * 24, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .8);
    if (x < 8 || y < 8 || x >= W - 8 || y >= H - 8 || !tileFree(x, y) || !freshNear(y * W + x, 10)) continue;
    const ng = makeVillage(x, y); if (!ng) continue;
    for (const u of rebels) { releaseTask(u); u.vid = ng.id; u.home = null; if (!u.weapon && Math.random() < .5) u.weapon = 'lanza'; }
    ng.nation = ng.id; becomeIndependent(ng); ng.food = Math.min(g.food * .35, 40); g.food -= ng.food; ng.wood = 15; ng.rebelOf = g.id; ng.rebelSide = side;
    ng.leader = rebels.slice().sort((a, b) => (b.edu || 0) - (a.edu || 0))[0];
    const r = relOf(g, ng); r.known = true; r.v = -90; r.reason = 'guerra civil';
    r.war = { att:ng.id, def:g.id, reason:'guerra civil', start:yearT, raidT:yearT - 60, dead:0, civil:true }; warCamp(ng, g, r);
    notify(`¡Guerra civil en ${g.name}! ${rebels.length} rebeldes ${side < 0 ? 'de izquierdas' : 'de derechas'}${tyr ? ' contra la dictadura' : ''} se alzan en armas y se hacen fuertes en ${ng.name}`, { x:x * T, y:y * T });
    if (typeof buildZones === 'function') buildZones();
    return;
  }
}
// Al firmar la paz de una guerra civil (desde makePeace): el que ha perdido menos gente gana
function civilEnd(a, b, r){
  const reb = villageById(r.war.att), gov = villageById(r.war.def); if (!reb || !gov) return;
  const rebelsWin = (r.war.lossD || 0) > (r.war.lossA || 0) * 1.2;
  reb.nation = gov.id; reb.rebelOf = null; // vuelven a ser un solo país
  if (rebelsWin) {
    const reg = reb.rebelSide < 0 ? (Math.random() < .5 ? 'socialismo' : 'republica') : (Math.random() < .5 ? 'dictadura' : 'republica');
    setRegime(gov, reg, null); if (reb.leader && !reb.leader.dead) { reb.leader.vid = gov.id; gov.leader = reb.leader; }
    gov.anger = 20; notify(`¡Los rebeldes ganan la guerra civil! Cae el gobierno de ${gov.name}: ahora es ${REGIME_A[reg] || reg}${gov.leader ? ` y manda ${gov.leader.name}` : ''}`, { x:gov.fx * T, y:gov.fy * T });
  } else { gov.anger = Math.max(0, (gov.anger || 0) - 25); notify(`El gobierno de ${gov.name} gana la guerra civil: los rebeldes de ${reb.name} se rinden y vuelven a ser parte del país`, { x:reb.fx * T, y:reb.fy * T }); }
  if (typeof buildZones === 'function') buildZones();
}
// ---- Batallas en campo abierto ----
// Cada poco, si los dos bandos tienen gente para luchar, los dos ejércitos salen a encontrarse en un llano entre los
// dos pueblos: marchan en formación con su abanderado, forman en dos líneas y chocan. La batalla tiene nombre (por el
// sitio) y al acabar se sabe quién ha ganado; en el campo quedan cruces
const FIELD_NAME = { [B.PLAINS]:'el llano', [B.GRASS]:'la pradera', [B.FOREST]:'el bosque', [B.HILLS]:'las colinas', [B.DRY]:'el páramo', [B.TUNDRA]:'la estepa helada', [B.SWAMP]:'el pantano', [B.DESERT]:'las dunas', [B.SNOW]:'la nieve' };
const deName = n => n.startsWith('el ') ? 'del ' + n.slice(3) : 'de ' + n; // «del llano», «de la pradera»
let battlefields = []; // cruces que quedan en el campo (se ven unos días)
function armyOf(g, max){
  const nat = nationOf(g), mine = new Set(villages.filter(o => popOf(o) && nationOf(o) === nat).map(o => o.id)); // (de todo el país)
  return villagers.filter(v => !v.dead && !v.away && !v.boat && mine.has(v.vid) && ageOf(v) >= ADULT_H && ageOf(v) < (v.life || 20) * .7 && !villages.some(o => o.leader === v) && (v.hp ?? 1) > .5 && !(v.task && ['asalto', 'detenido'].includes(v.task.k)))
    .sort((a, b) => (b.weapon ? 1 : 0) - (a.weapon ? 1 : 0)).slice(0, max);
}
function fieldBattleTick(att, def, r){
  const W0 = r.war;
  if (W0.battle) { // en marcha: ¿se ha acabado?
    const Bt = W0.battle, alive = side => Bt[side].map(id => villagers.find(u => u.uid === id)).filter(u => u && !u.dead && u.task && u.task.k === 'asalto');
    const A = alive('a'), D = alive('d');
    if (yearT > Bt.until || !A.length || !D.length) {
      const la = (W0.lossA || 0) - Bt.la0, ld = (W0.lossD || 0) - Bt.ld0, winA = la < ld || (!D.length && A.length), tie = la === ld && A.length && D.length;
      for (const u of [...A, ...D]) u.task = { k:'volver' };
      const win = tie ? null : winA ? att : def;
      notify(`Termina la batalla ${deName(Bt.name)}: ${tie ? 'nadie gana' : `gana ${nationOf(win).name}`} (bajas ${la}-${ld})`, { x:Bt.x, y:Bt.y });
      for (let k = 0; k < Math.min(12, la + ld); k++) battlefields.push({ x:Bt.x + (Math.random() - .5) * 40, y:Bt.y + (Math.random() - .5) * 20, until:yearT + DAY_LEN * 4 });
      if (win) sportResult(win, 4, `su ejército ganó la batalla ${deName(Bt.name)}`); if (win) sportResult(win === att ? def : att, -4, `su ejército perdió la batalla ${deName(Bt.name)}`);
      W0.battles = (W0.battles || 0) + 1; W0.battle = null; W0.battleT = yearT; if (win) nationOf(win).battleWins = (nationOf(win).battleWins || 0) + 1;
    }
    return;
  }
  const dt0 = dayT(); if (yearT - (W0.battleT ?? W0.start) < DAY_LEN * 1.1 || !(dt0 > .97 || dt0 < .25) || Math.random() > .3) return; // al amanecer o por la mañana: les da tiempo a llegar y luchar de día
  startFieldBattle(att, def, r);
}
// Los dos ejércitos (de todo el país) salen a un campo abierto entre los dos pueblos
function startFieldBattle(att, def, r){
  const W0 = r.war, size = g => Math.min(36, Math.max(3, Math.floor(villages.filter(o => popOf(o) && nationOf(o) === nationOf(g)).reduce((a, o) => a + popOf(o), 0) / 2.2)));
  const sa = armyOf(att, size(att)), sd = armyOf(def, size(def));
  if (sa.length < 3 || sd.length < 3) return false;
  const dd = Math.hypot(def.fx - att.fx, def.fy - att.fy) || 1; if (dd < 20 || lineWater(att.fx, att.fy, def.fx, def.fy) > .4) return; // separados por el mar: no hay campo
  // Campo abierto: lejos de casas y murallas; si entre los dos no lo hay, al menos sin edificios, campos ni calles
  const base = (x, y) => tileFree(x, y) && !WATER[world.biome[y * W + x]] && !pathMap.has(y * W + x) && !farmMap.has(y * W + x) && !villages.some(o => popOf(o) && underBuilding(o, x, y));
  const open = (x, y) => { let n = 0; for (let yy = y - 4; yy <= y + 4; yy++) for (let xx = x - 6; xx <= x + 6; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false; const i = yy * W + xx; if (WATER[world.biome[i]] || (world.objs[i] && OBJ[world.objs[i].key][1] === 'tree')) n++; } return n <= 6; }; // un claro: sin bosque ni agua alrededor
  const inWalls = (x, y) => villages.some(o => popOf(o) && o.wallRect && x >= o.wallRect.x0 && x <= o.wallRect.x1 && y >= o.wallRect.y0 && y <= o.wallRect.y1);
  const mx0 = Math.round((att.fx + def.fx) / 2), my0 = Math.round((att.fy + def.fy) / 2);
  const p = ringFind(mx0, my0, 26, (x, y) => base(x, y) && open(x, y) && !inWalls(x, y) && !villages.some(o => popOf(o) && Math.hypot(o.fx - x, o.fy - y) < 16)) || ringFind(mx0, my0, 22, (x, y) => base(x, y) && !inWalls(x, y) && !villages.some(o => popOf(o) && Math.hypot(o.fx - x, o.fy - y) < 20))
    || ringFind(mx0, my0, 22, (x, y) => base(x, y) && !villages.some(o => popOf(o) && Math.hypot(o.fx - x, o.fy - y) < 14)) || ringFind(mx0, my0, 12, base);
  if (!p) return false;
  const x = p[0] * T + 2, y = p[1] * T + 3, ux = (def.fx - att.fx) / dd, uy = (def.fy - att.fy) / dd, name = FIELD_NAME[world.biome[p[1] * W + p[0]]] || 'el campo';
  const form = ['bloque', 'bloque', 'línea', 'cuña'][Math.floor(Math.random() * 4)], until = yearT + 70 + dd / 2 * T / 7; // la marcha hasta el campo, y luego la lucha
  const go = (ps, side, g, foe) => {
    const grp = { ps, go:true, until, loot:false, repelled:false, form, field:true }, bearer = ps.find(v => !isRanged(v.weapon)) || ps[0];
    ps.forEach((v, k) => { v.sleep = false; releaseTask(v); if (v.actT > 0) { v.actT = 0; v.onDone = null; } v.bearer = v === bearer; refOf(v); v.water = Math.max(v.water, .85); v.food = Math.max(v.food, .75); // salen con provisiones (si no, la sed les haría volver)
      const lx = x - ux * side * 14 + (-uy) * ((k % 5) - 2) * 6, ly = y - uy * side * 14 + ux * ((k % 5) - 2) * 6; // su línea, de cara al enemigo
      v.task = { k:'asalto', enemy:foe.id, x:lx, y:ly, grp }; v.lastD = Infinity; v.route = null; v.routeKey = null; });
  };
  go(sa, 1, att, def); go(sd, -1, def, att);
  W0.battle = { x, y, name:`${name} de ${def.name}`, until, a:sa.map(refOf), d:sd.map(refOf), la0:W0.lossA || 0, ld0:W0.lossD || 0 };
  notify(`¡Batalla en ${name} de ${def.name}! ${sa.length} de ${att.name} contra ${sd.length} de ${def.name} en campo abierto`, { x, y }); snd('horn', x, y);
  return true;
}
// Cruces en el campo de batalla y, mientras dura, polvo y un estandarte en medio
function drawBattlefields(now){
  if (battlefields.length) battlefields = battlefields.filter(c => c.until > yearT);
  for (const c of battlefields) { vctx.fillStyle = '#d8d0c0'; vctx.fillRect(Math.round(c.x), Math.round(c.y) - 4, 1, 5); vctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 3, 3, 1); }
  for (const r of rels.values()) {
    const Bt = r.war && r.war.battle; if (!Bt) continue;
    if (Math.random() < .5) chips.push({ x:Bt.x + (Math.random() - .5) * 30, y:Bt.y + (Math.random() - .5) * 10, vx:(Math.random() - .5) * 8, vy:-4 - Math.random() * 4, life:0, max:.8, col:'rgba(170,150,120,.6)' }); // polvo
    vctx.fillStyle = '#4a3018'; vctx.fillRect(Math.round(Bt.x), Math.round(Bt.y) - 20, 1, 20);
    vctx.fillStyle = '#c83a2a'; vctx.beginPath(); vctx.moveTo(Bt.x + 1, Bt.y - 20); vctx.lineTo(Bt.x + 9, Bt.y - 17); vctx.lineTo(Bt.x + 1, Bt.y - 14); vctx.fill(); // estandarte de batalla
  }
}
// ---- Destrozos: de camino al centro, las tropas que vienen a castigar o a saquear rompen y queman lo que pillan ----
// · Castigo: todo (también el ayuntamiento); saqueo, esclavos o conversión: casas, almacenes y demás, menos el ayuntamiento;
//   conquista: solo las torres y el cuartel (el pueblo lo quieren entero, para quedárselo)
let razeT = 0;
SYSTEMS.push(dt => {
  if (!world || (razeT -= dt) > 0) return; razeT = 1;
  for (const v of villagers) {
    if (v.dead || v.away || !v.task || v.task.k !== 'asalto' || v.enemy) continue;
    const g = villageById(v.vid), eg = villageById(v.task.enemy), r = eg && g && warRel(eg, g); if (!r || !r.war) continue;
    const goal = r.war.goal || 'saqueo', tx = v.x / T, ty = v.y / T;
    if (Math.hypot(tx - eg.fx, ty - eg.fy) > townRadius(eg) + 4) continue;
    let best = null, bd = 3.5;
    for (const b of buildingsOf(eg)) {
      const o = world.objs[b]; if (!o || o.burnt) continue;
      if (goal === 'conquista' ? !/^(tower|barracks)/.test(o.key) : b === eg.hall && goal !== 'castigo') continue;
      const d = Math.hypot(b % W - tx, ((b / W) | 0) + 1 - ty); if (d < bd) { bd = d; best = b; }
    }
    if (best == null) continue;
    const o = world.objs[best], hard = goal === 'castigo' ? 1.6 : 1;
    v.dir = (best % W) * T + 2 < v.x ? -1 : 1; v.stab = .25; // el golpe
    damageBuilding(best, .03 * hard * (v.ironW ? 1.4 : 1));
    if (world.objs[best] && wooden(o) && !fires.has(best) && Math.random() < .04 * hard) fires.set(best, { t:0, life:10, tree:true, bld:true }); // y la tea
    if (!r.war.razeMsg || yearT - r.war.razeMsg > DAY_LEN * .5) { r.war.razeMsg = yearT; notify(`Las tropas de ${g.name} destrozan lo que encuentran en ${eg.name}`, { x:v.x, y:v.y }); }
  }
});
