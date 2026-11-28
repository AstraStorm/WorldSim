// Manifestaciones con cabeza: no dan vueltas a la plaza, van a donde está el problema.
// · Se reúnen en la plaza y marchan en columna (cabecilla delante con la pancarta) hasta el edificio que toca según la
//   queja: el ayuntamiento o el parlamento, la fábrica (sueldos, jornada), el banco (inflación), el cuartel (guerra), la
//   escuela, el hospital, el tribunal (corrupción)… Allí se concentran en filas, el cabecilla grita y la gente responde.
// · Quién sale depende de a quién le toca (los mayores por las pensiones, los obreros por los sueldos, los sin casa por
//   la vivienda…) y del miedo: en las dictaduras sale menos gente. Cuanto más enfado, más gente; y por el camino se suma
//   quien pasa y está de acuerdo.
// · Tácticas: si ya han protestado por lo mismo sin que les hagan caso, sentada (más larga); si les reprimieron en una
//   dictadura, cacerolada desde casa (no hay a quién cargar). Si llegan los soldados, huyen, y luego se reagrupan.
const PROT_KIND = { marcha:'Marcha', concentracion:'Concentración', sentada:'Sentada', cacerolada:'Cacerolada' };
const PROT_BLD = { hall:'el ayuntamiento', parliament:'el parlamento', bank:'el banco', market:'el mercado', temple:'el templo', barracks:'el cuartel', school:'la escuela', hospital:'el hospital', court:'el tribunal', fac:'la fábrica' };
const PROT_WHERE = { salarios:['fac', 'hall'], jornada:['fac', 'hall'], 'inflación':['bank', 'market', 'hall'], bancarrota:['bank', 'hall'], hambre:['market', 'hall'],
  guerra:['barracks', 'parliament', 'hall'], guerra_impuesta:['barracks', 'parliament', 'hall'], profesores:['school', 'hall'], medicos:['hospital', 'hall'], 'corrupción':['court', 'parliament', 'hall'] };
const PROT_ECON = ['pensiones', 'hambre', 'inflación', 'bancarrota', 'guerra', 'jornada', 'impuestos', 'vivienda', 'presupuestos', 'corrupción', 'profesores', 'medicos', 'bomberos', 'salarios'];
const PROT_ECHO = ['¡Sí se puede!', '¡Que no, que no!', '¡Unidos!', '¡Aquí estamos!', '¡No nos callarán!', '¡Ni un paso atrás!'];
const protAlive = i => i != null && world.objs[i];
function protTarget(g, grief){
  const n = nationOf(g);
  for (const k of [...(PROT_WHERE[grief] || []), 'parliament', 'hall']) {
    let i = null;
    if (k === 'fac') { const f = (g.facs || []).filter(f => protAlive(f.i)).sort((a, b) => (b.crew || []).length - (a.crew || []).length)[0]; i = f ? f.i : null; }
    else if (k === 'parliament') i = n === g ? n.parliament : null;
    else i = g[k];
    if (!protAlive(i)) continue;
    const bx = i % W, by = (i / W) | 0;
    for (const [dx, dy] of [[0, 1], [0, 2], [-1, 2], [1, 2], [0, 3], [-2, 2], [2, 2]]) { const x = (bx + dx) * T + T / 2, y = (by + dy) * T + T / 2; if (walkable(x, y)) return { i, k, x, y, name:PROT_BLD[k] }; }
  }
  return null;
}
// Lo que pesa para salir a la calle: si va con él, si le toca, cuánto tiene que perder y cuánto miedo da
function protScore(u, g, grief, gi, tyr){
  const age = ageOf(u);
  let s = PROT_ECON.includes(grief) ? .35 : Math.abs((u.ideo || 0) - gi) * .9;
  if (grief === 'pensiones' && u.life && age > u.life * .62) s += .6;
  else if (grief === 'vivienda' && u.home == null) s += .6;
  else if ((grief === 'salarios' || grief === 'jornada') && u.oficio === 'obrero') s += .55;
  else if (grief === 'hambre' && (u.food || 1) < .45) s += .5;
  else if ((grief === 'guerra' || grief === 'guerra_impuesta') && age < 32) s += .35;
  else if (['profesores', 'medicos', 'bomberos'].includes(grief) && (u.kids || []).length) s += .25;
  if ((u.money || 0) < (g.moneyMed || 10) * .6) s += .12;
  s += trait(u, 'sociable') * .15;
  if (tyr) s -= .35 * (1 - trait(u, 'aguante'));
  return s;
}
const protFree = u => !u.dead && !u.away && !u.boat && !u.sleep && !u.slave && !(u.task && BUSY_POL.includes(u.task.k));
function protTask(p, u){ releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; }
  const k = p.who.indexOf(u); u.task = { k:'protesta', mf:true, pts:[[u.x, u.y]], idx:0, until:p.ph === 'mitin' && p.until < 1e5 + yearT ? p.until : yearT + 1e6, slogan:p.slog[k % p.slog.length], col:p.col, gx:u.x, gy:u.y, lead:u === p.lead }; u.lastD = Infinity; u.hitBy = null; }
startProtest = function(g, adults){
  const gi = govIdeo(g), tyr = tyranny(g), grief = g.grief; g.protestT = yearT;
  const pn = g.protestN ||= {}, prior = pn[grief] || 0;
  const r0 = g.plaza, plaza = { x:(r0.x0 + r0.x1 + 1) / 2 * T, y:(r0.y0 + r0.y1 + 1) / 2 * T }, tg = protTarget(g, grief);
  const kind = tyr && (g.repressed || 0) >= 1 && (isNight() || Math.random() < .65) ? 'cacerolada' : prior >= 2 && !tyr && tg ? 'sentada' : tg && Math.hypot(tg.x - plaza.x, tg.y - plaza.y) > T * 5 ? 'marcha' : 'concentracion';
  if (isNight() && kind !== 'cacerolada') return;
  let pool = adults.filter(u => u !== g.leader && (protFree(u) || (kind === 'cacerolada' && u.sleep && !u.dead && !u.away && !u.boat)) && u.food > .35 && u.water > .4); // (con hambre o sed, primero comen; a la cacerolada se levantan de la cama)
  if (grief === 'idioma') pool = pool.filter(u => langProtester(u, g));
  const fear = tyr && kind !== 'cacerolada'; // (desde casa, con la cacerola, da menos miedo)
  const sc = new Map(pool.map(u => [u, protScore(u, g, grief, gi, fear) + Math.random() * .3]));
  const cap = Math.round(clamp(6 + (g.anger || 0) / 4, 6, 28) * (fear ? .6 : kind === 'cacerolada' ? 1.4 : 1));
  let who = pool.filter(u => sc.get(u) > .5).sort((a, b) => sc.get(b) - sc.get(a));
  if (grief === 'vivienda') who.sort((a, b) => (a.home == null ? 0 : 1) - (b.home == null ? 0 : 1));
  who = who.slice(0, cap); if (who.length < 3) return;
  pn[grief] = prior + 1;
  const lead = who.slice().sort((a, b) => (sc.get(b) + trait(b, 'ambicion') * .5) - (sc.get(a) + trait(a, 'ambicion') * .5))[0];
  who.splice(who.indexOf(lead), 1); who.unshift(lead);
  const slog = SLOGANS[grief] || ['¡Basta ya!', '¡Queremos cambios!', '¡Así no!'], col = ['#f2efe6', '#f0d060', '#f08a7a'][Math.floor(Math.random() * 3)];
  const p = g.protest = { until:yearT + 1e6, who, said:false, grief, riot:!tyr && kind !== 'sentada' && (g.anger > 60 || pn[grief] >= 3), lynch:(grief === 'corrupción' && g.anger > 75) || (grief === 'presupuestos' && g.anger > 85 && (g.noBudgetDays || 0) >= 3),
    kind, lead, tg, plaza, quit:[], ph:kind === 'cacerolada' ? 'mitin' : 'reunion', t0:yearT, trail:[], slog, col, n0:who.length, chantT:0, joinT:0 };
  who.forEach(u => { u.sleep = false; protTask(p, u); });
  if (kind === 'cacerolada') { p.until = yearT + 30; for (const u of who) { const h = homeOf(u, villageById(u.vid) || g); [u.task.gx, u.task.gy] = h != null ? [(h % W) * T + 2, ((h / W) | 0) * T + 3 + T] : [u.x, u.y]; u.task.until = p.until; } }
  if (grief === 'vivienda') startCamp(g, who);
  const at = { x:g.fx * T, y:g.fy * T }, against = GRIEF_TXT[grief];
  notify(kind === 'cacerolada' ? `Cacerolada en ${g.name}: por miedo a salir a la calle, ${who.length} vecinos golpean cacerolas desde sus casas contra ${against}`
    : kind === 'marcha' ? `¡Manifestación en ${g.name}! ${who.length} personas, con ${lead.name} al frente, marchan desde la plaza hasta ${tg.name} contra ${against}: «${slog[0]}»`
    : kind === 'sentada' ? `Sentada en ${g.name}: ${who.length} personas se sientan ante ${tg.name} y no piensan irse; es la ${prior + 1}.ª vez que protestan contra ${against}`
    : `Concentración en ${g.name}: ${who.length} personas se plantan ${tg ? `ante ${tg.name}` : 'en la plaza'} contra ${against}: «${slog[0]}»`, at);
};
// Cada persona, según la fase: a la plaza, en la columna tras el cabecilla, en su fila ante el edificio, o huyendo
function protSlot(p, k){
  const c = p.tg || p.plaza, row = Math.floor((k - 1) / 5), col = (k - 1) % 5, inRow = Math.min(5, p.who.length - 1 - row * 5);
  return k === 0 ? [c.x, c.y + 2] : [c.x + (col - (inRow - 1) / 2) * 6, c.y + 10 + row * 6];
}
function protPlace(p){
  const live = p.who.filter(u => !u.dead && u.task && u.task.k === 'protesta');
  const cops = villagers.filter(c => !c.dead && c.task && c.task.k === 'reprimir');
  live.forEach(u => { const t = u.task, k = p.who.indexOf(u);
    // Si carga un soldado cerca, huyen; después, unos vuelven y otros se van a casa
    const cop = cops.length && cops.find(c => Math.abs(c.x - u.x) < 22 && Math.abs(c.y - u.y) < 22);
    if (cop && !(t.fleeT > yearT)) { const d = Math.hypot(u.x - cop.x, u.y - cop.y) || 1, fx = u.x + (u.x - cop.x) / d * 34, fy = u.y + (u.y - cop.y) / d * 34;
      if (walkable(fx, fy)) { t.fleeT = yearT + 4; t.gx = fx; t.gy = fy; t.run = true; if (Math.random() < .3) floats.push({ x:u.x, y:u.y - 14, txt:'¡Corred!', col:'#ffd0a0', life:0 }); return; } }
    if (t.fleeT > yearT) return;
    if (t.fleeT && !t.back) { t.back = true; t.run = false; if (Math.random() < .5 * (1 - trait(u, 'aguante'))) { p.quit.push(u); u.task = null; return; } }
    if (p.kind === 'cacerolada') return;
    if (p.ph === 'reunion') { [t.gx, t.gy] = u === p.lead ? [p.plaza.x, p.plaza.y] : [p.plaza.x + ((k % 5) - 2) * 5, p.plaza.y + 6 + Math.floor(k / 5) * 5]; }
    else if (p.ph === 'mitin') { [t.gx, t.gy] = protSlot(p, k); if (Math.random() < .01) t.gx += Math.random() < .5 ? -1 : 1; }
  });
  return live;
}
// En cada paso (desde humanos.js): el cabecilla deja rastro cada 3 px y los demás lo siguen en filas de tres
function protSteer(v, t){
  if (!t.mf || t.fleeT > yearT) return; const g = villageById(v.vid), p = g && g.protest; if (!p || p.ph !== 'marcha') return;
  const tr = p.trail;
  if (v === p.lead) { let e = tr[tr.length - 1], d = Math.hypot(v.x - e[0], v.y - e[1]);
    while (d > 3) { e = [e[0] + (v.x - e[0]) * 3 / d, e[1] + (v.y - e[1]) * 3 / d]; tr.push(e); d -= 3; } if (tr.length > 200) tr.splice(0, tr.length - 200); return; }
  const k = p.who.indexOf(v); if (k < 1) return; // (ya no va en la marcha)
  const row = Math.floor((k - 1) / 3) + 1, col = (k - 1) % 3 - 1, j = tr.length - 1 - row * 2;
  if (j < 1) { [t.gx, t.gy] = tr[0]; return; } // (la cola aún está saliendo: hacia donde arrancó el cabecilla)
  const [ax, ay] = tr[j], [bx, by] = tr[j + 1], dl = Math.hypot(bx - ax, by - ay) || 1, px = -(by - ay) / dl * col * 5, py = (bx - ax) / dl * col * 5;
  [t.gx, t.gy] = walkable(ax + px, ay + py) ? [ax + px, ay + py] : [ax, ay]; t.run = Math.hypot(t.gx - v.x, t.gy - v.y) > 30; // (si se queda atrás, aprieta el paso)
}
const protBase = runProtest;
runProtest = function(g){
  const p = g.protest; if (!p.kind) return protBase.apply(this, arguments);
  const live = protPlace(p).filter(u => u.task && u.task.k === 'protesta'), L = p.lead && !p.lead.dead && p.lead.task && p.lead.task.k === 'protesta' ? p.lead : live[0];
  if (L && L !== p.lead) { p.lead = L; L.task.lead = true; }
  if (p.ph === 'reunion' && L) {
    const near = live.filter(u => Math.hypot(u.x - p.plaza.x, u.y - p.plaza.y) < T * 3).length;
    if (yearT - p.t0 > 12 || near >= live.length * .7) { p.ph = p.kind === 'marcha' ? 'marcha' : 'mitin'; p.trail = [[L.x, L.y]]; p.tm = yearT; if (p.ph === 'mitin') protRally(p); }
  } else if (p.ph === 'marcha' && L) {
    const t = L.task, ds = live.filter(u => u !== L).map(u => Math.hypot(u.x - L.x, u.y - L.y)).sort((a, b) => a - b), med = ds.length ? ds[ds.length >> 1] : 0;
    const wait = med > 36 && yearT - p.tm < 25; // (el cabecilla espera a que el grueso le alcance, pero no para siempre)
    [t.gx, t.gy] = wait ? [L.x, L.y] : [p.tg.x, p.tg.y];
    if (Math.hypot(L.x - p.tg.x, L.y - p.tg.y) < 6 || yearT - p.tm > 60) { p.ph = 'mitin'; protRally(p); }
  }
  // Cánticos: grita el cabecilla y la gente responde
  if (p.ph !== 'reunion' && L && yearT > p.chantT) { p.chantT = yearT + 2.2 + Math.random();
    if (p.kind === 'cacerolada') { const u = live[Math.floor(Math.random() * live.length)]; if (u) floats.push({ x:u.x, y:u.y - 14, txt:'¡clang, clang!', col:'#c8ccd4', life:0 }); }
    else { const sl = L.task.slogan; floats.push({ x:L.x, y:L.y - 18, txt:sl, col:'#fff4d0', life:0 });
      setTimeout(() => { for (const u of live.filter(u => u !== L && !u.dead).sort(() => Math.random() - .5).slice(0, 2)) floats.push({ x:u.x, y:u.y - 14, txt:Math.random() < .5 ? sl : PROT_ECHO[Math.floor(Math.random() * PROT_ECHO.length)], col:'#e8dcc0', life:0 }); }, 700); } }
  // Se suma quien pasa cerca y está de acuerdo
  if (p.kind !== 'cacerolada' && L && yearT > p.joinT && live.length < 32) { p.joinT = yearT + 3;
    for (const u of p.who) if (!u.dead && !(u.task && u.task.k === 'protesta') && !p.quit.includes(u) && protFree(u) && (!u.task || ['ocio', 'pasear'].includes(u.task.k)) && u.food > .3 && u.water > .35) protTask(p, u); // (los que fueron a comer o a beber, vuelven)
    const gi = govIdeo(g), tyr = tyranny(g), add = villagers.filter(u => u.vid === g.id && u !== g.leader && !p.who.includes(u) && protFree(u) && ageOf(u) >= ADULT_H && Math.abs(u.x - L.x) < 60 && Math.abs(u.y - L.y) < 60 && (!u.task || ['ocio', 'pasear', 'comerciar', 'vender'].includes(u.task.k)) && protScore(u, g, p.grief, gi, tyr) + Math.random() * .3 > .6).slice(0, 3);
    for (const u of add) { p.who.push(u); protTask(p, u); }
    if (add.length && !p.grew && p.who.length >= p.n0 * 1.5 && p.who.length >= 8) { p.grew = true; notify(`La ${PROT_KIND[p.kind].toLowerCase()} de ${g.name} crece por el camino: ya son ${p.who.length} personas`, { x:L.x, y:L.y }); } }
  const rep = g.repressed || 0, said = p.said; if (!said && p.grief) g.grief = p.grief; /* (responden a lo que piden, aunque el pueblo ya tenga otra queja) */ protBase.apply(this, arguments);
  if (!said && p.said && g.protest === p && (g.repressed || 0) === rep && p.kind !== 'cacerolada') // les han hecho caso: lo celebran y se van
    for (const u of live.filter(u => !u.dead).slice(0, 4)) floats.push({ x:u.x, y:u.y - 14, txt:'¡Lo hemos conseguido!', col:'#b8f0a0', life:0 });
};
function protRally(p){ p.until = yearT + (p.kind === 'sentada' ? 45 : 30); for (const u of p.who) if (u.task && u.task.k === 'protesta') { u.task.until = p.until; u.task.run = false; } }
// Con la cacerolada no hay a quién cargar
{ const base = respondProtest; respondProtest = function(g, who){
  const p = g.protest;
  if (p && p.kind === 'cacerolada') { g.anger = Math.max(0, (g.anger || 0) - 8); g.cacerolas = (g.cacerolas || 0) + 1;
    notify(`En ${g.name} suenan las cacerolas en todas las casas: el régimen no puede detener a toda una ciudad${g.cacerolas >= 3 ? ', y empieza a tambalearse' : ''}`, { x:g.fx * T, y:g.fy * T });
    if (g.cacerolas >= 3) g.anger = Math.min(100, g.anger + 15); return; }
  if (p && p.kind === 'sentada') g.anger = Math.min(100, (g.anger || 0) + 5); // (no se van: aprieta más)
  return base.apply(this, arguments); }; }
// Dibujo: pancarta ancha para el cabecilla, cacerola en la cacerolada (desde aldeanos.js)
function drawProtestSign(v, x, sy, now){
  const t = v.task;
  if (t.lead) { vctx.fillStyle = '#7a5230'; vctx.fillRect(x - 7, sy + 1, 1, 9); vctx.fillRect(x + 7, sy + 1, 1, 9); vctx.fillStyle = '#2a2420'; vctx.fillRect(x - 7, sy - 1, 15, 6);
    vctx.fillStyle = t.col; vctx.fillRect(x - 6, sy, 13, 4); vctx.fillStyle = '#c8302a'; vctx.fillRect(x - 6, sy, 13, 1); vctx.fillStyle = '#3a3028'; for (let k = -4; k <= 4; k += 2) vctx.fillRect(x + k, sy + 2, 1, 1); return true; }
  if (t.mf && g_protKind(v) === 'cacerolada') { const b = (Math.floor(now / 160) + Math.floor(v.x)) % 2; vctx.fillStyle = '#8a8e96'; vctx.fillRect(x + v.dir * 3 - 2, sy + 5 + b, 5, 3); vctx.fillStyle = '#5a5e66'; vctx.fillRect(x + v.dir * 3 - 1, sy + 4 + b, 3, 1); return true; }
  return false;
}
const g_protKind = v => { const g = villageById(v.vid); return g && g.protest ? g.protest.kind : null; };
