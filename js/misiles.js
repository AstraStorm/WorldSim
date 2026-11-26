// World Sim · Misiles: silos que se abren, misiles con trayectoria curva y explosiones como de meteorito
// ================= Misiles =================
// · Ciencia: «los misiles balísticos» (cohetería + combustión), «los misiles guiados» (misiles + ordenadores: más
//   precisos y antimisiles) y «el misil pesado» (guiados + combustible líquido: el más destructor)
// · Una nación en guerra que sabe hacerlos levanta silos (lejos de la ciudad). Cada silo dispara cada cierto tiempo a un
//   pueblo enemigo a su alcance: la compuerta se abre, el misil sale, vuela en curva (se ve) y cae: cráter, edificios
//   destruidos y muertos, como un meteorito. Luego el silo se cierra
// · Seis misiles: el V-2 (pionero), el táctico (preciso, corto), el de propulsores (lejos), el remachado (equilibrado),
//   el antimisil (derriba los que llegan, si la nación atacada lo tiene) y el pesado (enorme)
// · Disparar un misil escandaliza al mundo: todas las naciones se enfadan con quien lo lanza
// · Tratado de no proliferación (entre ellos no hay misiles); leyes «desarme» (no hay silos: los que había, se desmontan) y «disuasión»
// · Son caros y no se usan a la ligera (control de armas, al final del archivo): fabricar cada misil, mantener los silos,
//   autorización del gobierno solo si la guerra va mal, represalia y convención contra los misiles del Consejo
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i < 0 ? DISCOVERIES.length : i + 1, 0, { ...d, req:d.req.filter(k => DISCOVERIES.some(x => x.k === k)) }); if (typeof SCI_REQ === 'object') SCI_REQ[d.k] = d.req; };
  add('coheteria', { k:'misiles', txt:'los misiles balísticos', cost:210, eff:'silos y misiles que caen sobre el enemigo como un meteorito', req:['coheteria', 'combustion'] });
  add('misiles', { k:'misiles_guiados', txt:'los misiles guiados', cost:200, eff:'misiles más precisos y antimisiles que derriban los que llegan', req:['misiles', 'ordenadores'] });
  add('misiles_guiados', { k:'misil_pesado', txt:'el misil pesado', cost:240, eff:'el misil más destructor', req:['misiles_guiados', 'combustible_liquido'] });
})();
BLD.add('silo'); BUILD_DIMS.silo = [3, 4];
OBJ['silo:0'] = ['Silo de misiles', 'house', 0];
Object.assign(BLD_DESC, { silo:'Silo de misiles: bajo la compuerta espera un misil' }); Object.assign(BLD_TYPE, { silo:'Defensa' });
// alcance (casillas), radio de la explosión, puntería, ciencia que hace falta
const MISSILES = [
  { n:'V-2', range:160, R:5, acc:.65, need:'misiles' }, { n:'misil táctico', range:120, R:4, acc:.9, need:'misiles' },
  { n:'misil de largo alcance', range:380, R:7, acc:.7, need:'misiles' }, { n:'misil remachado', range:260, R:6.5, acc:.85, need:'misiles_guiados' },
  { n:'antimisil', range:0, R:0, acc:1, need:'misiles_guiados', anti:true }, { n:'misil pesado', range:520, R:10, acc:.8, need:'misil_pesado' },
];
let missiles = [];
const silosOf = g => (g.silos ||= []).filter(s => world.objs[s.i]);
let siloT = 0;
SYSTEMS.push(dt => {
  if (!world || (siloT -= dt) > 0) return; siloT = 3;
  for (const g of liveTowns()) {
    if (nationOf(g) !== g || !knowsSci(g, 'misiles')) continue;
    if (missileBanned(g) && !hasLaw(g, 'desarme') && (g.banBreakT || 0) < yearT) { g.banBreakT = yearT + DAY_LEN; // (una vez al día se lo plantean)
      const worst = liveTowns().filter(o => atWar(g, o) && !noProlif(g, o)).reduce((m, o) => Math.max(m, warStakes(g, o)), 0);
      if (worst >= 1.5 && Math.random() < .35) leaveBan(g, true); }
    if (hasLaw(g, 'desarme') || missileBanned(g)) { dismantleSilo(g); continue; } // (desarme o convención firmada: fuera silos, uno al día)
    const ec = ecOf(g), foes = liveTowns().filter(o => atWar(g, o) && !noProlif(g, o)), S = silosOf(g), want = (hasLaw(g, 'disuasion') ? 2 : 1) + Math.floor(popOf(g) / 120);
    // Mantener los silos cuesta dinero cada día; sin pagar, no funcionan
    if (S.length && (g.siloPayT || 0) < yearT) { g.siloPayT = yearT + DAY_LEN; const fee = S.length * SILO_FEE; if (!ec || ec.treas >= fee) { if (ec) ec.treas -= fee; g.siloUnpaid = false; } else g.siloUnpaid = true; }
    // Silos: en guerra (o con la ley de disuasión), hasta los que quiera; son caros
    const serious = foes.some(o => warStakes(g, o) >= .5 || (world.mUsed || {})[nationOf(o).id + '>' + g.id]); // (por una disputa de nada no se gasta uno esto; si le han lanzado, se arma para responder)
    if ((serious || hasLaw(g, 'disuasion')) && S.length < want && (g.iron || 0) >= SILO_COST.iron && g.stone >= SILO_COST.stone && (!ec || ec.treas >= SILO_COST.money) && !(g.siloFail > yearT - DAY_LEN / 3)) {
      const s = typeof farSite === 'function' ? farSite(g, 3, 4) : null; if (!s) { g.siloFail = yearT; continue; } clearRocks(s[0] - 3, s[1] - 4, s[0] + 3, s[1] + 1);
      const i = s[1] * W + s[0]; world.objs[i] = { key:'silo:0', v:0, ox:0, oy:0, vid:g.id }; g.silos.push({ i, f:0, st:'cerrado', t:0, ready:yearT + 20 }); g.iron -= SILO_COST.iron; g.stone -= SILO_COST.stone; if (ec) ec.treas -= SILO_COST.money;
      composeRegion(s[0] - 6, s[1] - 8, s[0] + 6, s[1] + 3); notify(`${g.name} construye un silo de misiles (le ha costado ${SILO_COST.iron} de hierro, ${SILO_COST.stone} de piedra${ec ? ` y ${SILO_COST.money} ${coinPl(g)}` : ''}, y mantenerlo también cuesta)`, { x:s[0] * T, y:s[1] * T }); continue;
    }
    // Fabricar misiles: uno cada día y medio como mucho, con hierro, combustible y dinero (se guardan, dos por silo)
    if (S.length && (serious || hasLaw(g, 'disuasion')) && (g.mStock || 0) < S.length * 2 && (g.mMakeT || 0) < yearT && (g.iron || 0) >= MISSILE_COST.iron && ((g.fuel || 0) >= MISSILE_COST.fuel || (g.coal || 0) >= MISSILE_COST.fuel * 2) && (!ec || ec.treas >= MISSILE_COST.money)) {
      g.iron -= MISSILE_COST.iron; if ((g.fuel || 0) >= MISSILE_COST.fuel) g.fuel -= MISSILE_COST.fuel; else g.coal -= MISSILE_COST.fuel * 2; if (ec) ec.treas -= MISSILE_COST.money;
      g.mStock = (g.mStock || 0) + 1; g.mMakeT = yearT + DAY_LEN * 1.5;
      if (!g.mMadeMsg) { g.mMadeMsg = true; notify(`${g.name} fabrica su primer misil: ${MISSILE_COST.iron} de hierro, ${MISSILE_COST.fuel} de combustible${ec ? ` y ${MISSILE_COST.money} ${coinPl(g)}` : ''} cada uno`, { x:g.fx * T, y:g.fy * T }); }
    }
    // Disparar: a un pueblo enemigo a su alcance (el misil mejor que tenga), si hay misiles hechos y el gobierno lo autoriza
    for (const s of S) {
      if (s.st !== 'cerrado' || s.ready > yearT || !foes.length || !(g.mStock >= 1) || g.siloUnpaid) continue;
      const sx = s.i % W, sy = (s.i / W) | 0, types = MISSILES.map((m, k) => [m, k]).filter(([m]) => !m.anti && knowsSci(g, m.need));
      const tgt = foes.filter(o => types.some(([m]) => Math.hypot(o.fx - sx, o.fy - sy) <= m.range) && missileOk(g, o)).sort((a, b) => popOf(b) - popOf(a))[0]; if (!tgt) continue;
      const fit = types.filter(([m]) => Math.hypot(tgt.fx - sx, tgt.fy - sy) <= m.range).sort((a, b) => b[0].R - a[0].R), [M, k] = fit[Math.floor(Math.random() * Math.min(2, fit.length))]; // (uno de los dos más fuertes que tenga)
      g.mStock -= 1; s.st = 'abriendo'; s.t = 0; s.ready = yearT + DAY_LEN * 2.5; // (recargar un silo lleva días)
      ((world.mUsed ||= {})[g.id + '>' + nationOf(tgt).id] = yearT); missileBreach(g);
      const miss = Math.random() > M.acc ? 6 + Math.random() * 10 : Math.random() * 2, a = Math.random() * Math.PI * 2;
      s.load = { k, g:g.id, to:tgt.id, tx:(tgt.fx + Math.cos(a) * miss) * T, ty:(tgt.fy + Math.sin(a) * miss) * T };
    }
  }
});
// Animación de los silos y el vuelo de los misiles
SYSTEMS.push(dt => {
  for (const g of villages) for (const s of g.silos || []) {
    if (s.st === 'cerrado') continue; s.t += dt;
    if (s.st === 'abriendo') { s.f = Math.min(5, Math.floor(s.t / .3)); if (s.f >= 5 && s.load) { const L = s.load; s.load = null; const x = (s.i % W) * T + 2, lip = ((s.i / W) | 0) * T + 3 - 10, mh = (artFrame(`missile:${L.k}`) || { height:24 }).height, y = lip + mh / 2; missiles.push({ ...L, x0:x, y0:y, x, y, lip, mh, t:0, phase:'sale' }); const M = MISSILES[L.k]; notify(`¡${g.name} dispara un ${M.n} contra ${villageById(L.to)?.name || 'el enemigo'}!`, { x, y }); worldOutrage(g); s.st = 'abierto'; s.t = 0; } }
    else if (s.st === 'abierto') { s.f = 6; if (s.t > 3.4) { s.st = 'cerrando'; s.t = 0; } }
    else if (s.st === 'cerrando') { s.f = 7 + Math.min(4, Math.floor(s.t / .3)); if (s.t > 1.6) { s.st = 'cerrado'; s.f = 0; } }
  }
  for (const m of missiles) {
    m.t += dt;
    if (m.phase === 'sale') { m.y = m.y0 - (m.t < 1.6 ? m.t / 1.6 * m.mh * 1.1 : m.mh * 1.1 + (m.t - 1.6) ** 2 * 70); m.ang = -Math.PI / 2; if (Math.random() < dt * (m.t < 1.6 ? 8 : 40)) smokePuff(m.x0 + (Math.random() - .5) * 10, m.lip, m.t < 1.6 ? .6 : 1.3); if (m.t > 2.5) { m.phase = 'vuela'; m.t = 0; m.sx = m.x; m.sy = m.y; m.dur = Math.max(2.5, Math.hypot(m.tx - m.sx, m.ty - m.sy) / 140); interceptCheck(m); } continue; }
    if (m.phase === 'vuela') {
      const k = Math.min(1, m.t / m.dur), H0 = Math.hypot(m.tx - m.sx, m.ty - m.sy) * .35, px = m.x, py = m.y;
      m.x = m.sx + (m.tx - m.sx) * k; m.y = m.sy + (m.ty - m.sy) * k - Math.sin(k * Math.PI) * H0; m.ang = Math.atan2(m.y - py, m.x - px);
      if (Math.random() < dt * 25) smokePuff(m.x, m.y, .5);
      if (m.icp && k >= m.icp.k) { m.done = true; rocketBoomAt(m.x, m.y, 1.2); const o = villageById(m.to); if (o) notify(`¡Los antimisiles de ${o.name} derriban el misil en el aire!`, { x:m.x, y:m.y }); missileLog.push({ key:m.key, until:performance.now() + 6000, at:[m.x, m.y], html:`<div class="t">🛡 DERRIBADO</div><span class="n">¡Interceptado!</span><div class="m">Los antimisiles de ${esc(o ? o.name : '?')} lo derriban en el aire</div>` }); continue; }
      if (k >= 1) { m.done = true; missileImpact(m); const g = villageById(m.g), o = villageById(m.to); missileLog.push({ key:m.key, until:performance.now() + 6000, at:[m.x, m.y], html:`<div class="t">💥 IMPACTO · ${esc(o ? o.name : '?')}</div><span class="n">${m.hit.dead} muertos</span><div class="m">${m.hit.ruined} edificios destrozados por el ${esc(MISSILES[m.k].n)} de ${esc(g ? g.name : '?')}</div>` }); }
    }
  }
  missiles = missiles.filter(m => !m.done);
});
// Antimisil: la nación atacada, si lo tiene y tiene silo, lo intenta derribar
function interceptCheck(m){ const o = villageById(m.to), n = o && nationOf(o); if (!n || !knowsSci(n, 'misiles_guiados') || !silosOf(n).length) return; if (Math.random() < .55) m.icp = { k:.55 + Math.random() * .3 }; }
function missileImpact(m){
  const M = MISSILES[m.k], o = villageById(m.to), g = villageById(m.g), tx = Math.floor(m.x / T), ty = Math.floor(m.y / T);
  if (typeof impact === 'function') impact({ x:m.x, y:m.y, size:M.R / 4, R:M.R, blastR:M.R * 4 }); // como un meteorito: cráter, edificios y gente
  rocketBoomAt(m.x, m.y, 1.5 + M.R / 2.5); if (typeof flash !== 'undefined') flash = Math.min(.45, (flash || 0) + .35); shake = Math.max(shake || 0, M.R / 2);
  // la onda expansiva: lo que está cerca, destruido; más lejos, dañado y ardiendo
  let ruined = 0;
  for (const q of liveTowns()) for (const b of buildingsOf(q)) { if (!world.objs[b]) continue; const d = Math.hypot(b % W - tx, ((b / W) | 0) - ty); if (d < M.R * 2.5) { damageBuilding(b, d < M.R * 1.2 ? 1 : d < M.R * 1.8 ? .7 : .4); ruined++; if (typeof igniteBuilding === 'function' && Math.random() < .5) igniteBuilding(b); } }
  let dead = 0; for (const v of villagers) if (!v.dead && Math.hypot(v.x - m.x, v.y - m.y) < M.R * T * 2.4) { killVillager(v, 'misil'); dead++; }
  if (o) { o.anger = (o.anger || 0) + 30; const r = warRel(o, g); if (r && r.war) r.war.dead = (r.war.dead || 0) + dead; }
  m.hit = { dead, ruined, t:performance.now() };
  notify(`¡El ${M.n} de ${g ? g.name : '?'} cae sobre ${o ? o.name : 'el enemigo'}! ${dead} muertos y ${ruined} edificios destrozados`, { x:m.x, y:m.y });
}
// El aviso a la izquierda: «¡están lanzando un misil!», cómo va y, al caer, el balance (se queda unos segundos)
const missileLog = [];
function missileCards(){
  for (const m of missiles) { const g = villageById(m.g), o = villageById(m.to); if (!g) continue; m.key ||= 'm' + Math.random().toString(36).slice(2);
    const st = m.phase === 'sale' ? 'sale del silo...' : m.icp ? 'en vuelo · ¡los antimisiles van a por él!' : `en vuelo · ${Math.max(0, Math.ceil(m.dur - m.t))} s para el impacto`;
    sideCard(m.key, 'ms', `<div class="t">🚨 MISIL · ${esc(g.name)} → ${esc(o ? o.name : '?')}</div><span class="n">${esc(MISSILES[m.k].n)}</span><div class="m">${st}</div>`, () => [m.x, m.y]); }
  for (const e of missileLog) { const el = sideCard(e.key, 'ms', e.html, () => e.at); el._until = e.until; }
  while (missileLog.length && missileLog[0].until < performance.now()) missileLog.shift();
}
// Todo el mundo condena el ataque
function worldOutrage(g){ for (const o of liveTowns()) { if (nationOf(o) === nationOf(g) || nationOf(o) !== o) continue; const r = relOf(o, nationOf(g)); r.v = clamp(r.v - 12, -100, 100); } }
const noProlif = (a, b) => { const r = rels.get(relKey(nationOf(a), nationOf(b))); return !!(r && hasTreaty(r, 'no_proliferacion')); };
// ---- Dibujo ----
function drawSilos(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) for (const s of g.silos || []) {
    if (!world.objs[s.i]) continue; const x = (s.i % W) * T + 2, y = ((s.i / W) | 0) * T + 3; if (x < x0 - 20 || x > x1 + 20 || y < y0 - 40 || y > y1 + 10) continue;
    const f = artFrame(`silo:${s.f || 0}`), st = s.st; if (f) liveQ.push({ y, f:() => { vctx.drawImage(f, x - f.ax, y - f.height + 2); redrawFront(x - f.ax, x - f.ax + f.width, y - f.height + 2, y + 2);
      if (st !== 'cerrado') { vctx.fillStyle = `rgba(255,60,40,${.5 + .5 * Math.sin(now / 120)})`; vctx.fillRect(x - 11, y - 10, 2, 2); vctx.fillRect(x + 9, y - 10, 2, 2); } } }); // con las luces de alarma
  }
}
function drawMissiles(now){
  for (const m of missiles) {
    const s = artFrame(`missile:${m.k}`); if (!s) continue;
    const sc = m.phase === 'vuela' ? 1 + .6 * Math.sin(Math.min(1, m.t / m.dur) * Math.PI) : 1; // cuanto más alto, más cerca de la vista: más grande
    vctx.save();
    if (m.phase === 'sale') { vctx.beginPath(); vctx.rect(m.x0 - 30, m.lip - 400, 60, 400); vctx.clip(); } // sale de dentro del silo: lo de debajo de la boca no se ve
    vctx.translate(Math.round(m.x), Math.round(m.y)); vctx.rotate((m.ang || -Math.PI / 2) + Math.PI / 2); vctx.scale(sc, sc); vctx.drawImage(s, -s.width / 2, -s.height / 2);
    if (m.phase !== 'sale' || m.t > 1.2) { const f = .7 + Math.random() * .6; vctx.fillStyle = 'rgba(255,230,150,.95)'; vctx.fillRect(-1.5, s.height / 2, 3, 4 * f); vctx.fillStyle = 'rgba(255,120,40,.75)'; vctx.fillRect(-2, s.height / 2 + 3, 4, 7 * f); }
    vctx.restore();
  }
}
{ const blank = document.createElement('canvas'); blank.width = 27; blank.height = 30; blank.ax = 13; const base = artSprite; artSprite = function(o){ if (o && o.key === 'silo:0') return blank; return base.apply(this, arguments); }; } // (el silo se pinta en vivo, con su compuerta)
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawSilos(performance.now()); }; }
{ const base = drawAir; drawAir = function(t){ base.apply(this, arguments); drawMissiles(performance.now()); }; }
// ---- Leyes y tratado ----
Object.assign(LAW_TXT, { desarme:'desarme', disuasion:'disuasión' });
Object.assign(LAW_DESC, { desarme:'no se construyen silos ni se disparan misiles: el mundo se fía más', disuasion:'más silos, aunque no haya guerra: que nadie se atreva' });
Object.assign(LAW_LEAN, { desarme:-.5, disuasion:.6 }); LAW_CLASH.push(['desarme', 'disuasion']);
Object.assign(LAW_REQ, { desarme:g => knowsSci(g, 'misiles'), disuasion:g => knowsSci(g, 'misiles') });
Object.assign(LAW_WHY, { desarme:'ahora que existen los misiles', disuasion:'ahora que existen los misiles' });
Object.assign(TREATY, { no_proliferacion:{ n:'tratado de no proliferación', days:[10, 14], icon:'☮' } });
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments); if (!r.known || r.war) return;
  if (hasTreaty(r, 'no_proliferacion')) r.v = Math.min(100, r.v + .12);
  else if (r.v > 10 && knowsSci(a, 'misiles') && knowsSci(b, 'misiles') && Math.random() < .03) signTreaty(a, b, r, 'no_proliferacion');
}; }

// ---- Control de armas: cuestan, no se usan a la ligera y hay una convención mundial ----
// · Un silo cuesta 50 de hierro, 80 de piedra y 100 monedas, y mantenerlo 4 al día por silo (sin pagar, no dispara).
//   Cada misil se fabrica aparte (30 de hierro, 20 de combustible y 60 monedas; como mucho uno cada día y medio) y se
//   guardan dos por silo. Recargar un silo lleva dos días y medio
// · Nadie dispara el primero a la ligera: solo si la guerra le va mal (tiene menos gente que el enemigo o la guerra se
//   alarga), y el gobierno tiene que autorizarlo (una dictadura se atreve mucho antes que una democracia, y si el
//   enemigo también tiene silos, casi nadie se atreve: disuasión). A quien le han lanzado un misil, puede responder
// · Convención contra los misiles, votada en el Consejo de las Naciones: quien la firma desmonta sus silos y no
//   dispara; quien lance un misil mientras está en vigor queda sancionado por el Consejo
const SILO_COST = { iron:50, stone:80, money:100 }, SILO_FEE = 4, MISSILE_COST = { iron:30, fuel:20, money:60 };
const missileBan = () => world.missileBan || null;
const missileBanned = g => { const B = missileBan(); return !!(B && B.signers.includes(nationOf(g).id)); };
const nationPop = n => liveTowns().filter(o => nationOf(o) === n).reduce((a, o) => a + popOf(o), 0);
function dismantleSilo(g){
  const S = silosOf(g); if (!S.length || (g.siloDownT || 0) > yearT) return; g.siloDownT = yearT + DAY_LEN;
  const s = S[0]; world.objs[s.i] = null; g.silos = g.silos.filter(q => q !== s); g.mStock = 0; const x = s.i % W, y = (s.i / W) | 0; composeRegion(x - 6, y - 8, x + 6, y + 3); addEffect(x * T + 2, y * T + 3, 'poof');
  notify(`${g.name} desmantela un silo de misiles${missileBanned(g) ? ', como manda la convención que ha firmado' : ' por su ley de desarme'}`, { x:x * T, y:y * T });
}
// Lo que una nación se juega en una guerra (de 0 a 2 y pico), como en la vida real: el motivo (una guerra santa o una
// guerra civil pesan más que el puerto o el oro de otro), las bajas que lleva para lo que era, si ha perdido ciudades y,
// sobre todo, si es la atacada y el enemigo ya está a las puertas
const STAKES = { 'religión':.6, 'guerra civil':.6, raza:.5, territorio:.4, venganza:.4, rencor:.35, honor:.25, alianza:.3, recursos:.2, oro:.2, puerto:.2, esclavos:.3 };
function warStakes(g, o){
  const n = nationOf(g), e = nationOf(o), r = rels.get(relKey(n, e)); if (!r || !r.war) return 0;
  const Wr = r.war, att = Wr.att === n.id, P = Wr.pop0 || { a:nationPop(att ? n : e), d:nationPop(att ? e : n) };
  const loss = (att ? Wr.lossA : Wr.lossD) || 0, base = att ? P.a : P.d, lostTowns = Wr['lost' + n.id] || 0;
  let st = (STAKES[Wr.reason] || .3) * (att ? .8 : 1) + Math.min(1, loss / Math.max(4, base) * 2.5) + lostTowns * .4;
  if (!att && (n.fortWarn > yearT || liveTowns().some(q => nationOf(q) === n && q.coup))) st += .2;
  if (!att && villagers.some(u => !u.dead && u.vid === e.id && u.task && u.task.k === 'asalto' && Math.hypot(u.x / T - n.fx, u.y / T - n.fy) < 25)) st += .4; // (el enemigo, a las puertas de la capital)
  return st;
}
// ¿Puede g lanzar contra o? Con tratado de no proliferación, nunca. A quien le han lanzado antes, puede responder. El
// primero solo si se juega mucho, más aún si la convención está en vigor (quien no la firmó acepta sanciones) o si el
// enemigo también tiene silos (disuasión). Las dictaduras se atreven antes; las democracias, más tarde
function missileOk(g, o){
  const n = nationOf(g), e = nationOf(o), r = rels.get(relKey(n, e)); if (!r || !r.war || missileBanned(n) || noProlif(n, e)) return false;
  if ((world.mUsed || {})[e.id + '>' + n.id]) return true; // (le han lanzado antes: responde)
  const W2 = r.war; if (W2['nk' + n.id]) return true; // (ya lo autorizó en esta guerra)
  if ((W2['ask' + n.id] || 0) > yearT) return false; W2['ask' + n.id] = yearT + DAY_LEN; // (se lo plantean una vez al día)
  const need = (missileBan() ? 1.2 : .8) + (silosOf(e).length ? .35 : 0) + (tyranny(n) ? -.25 : ['democracia', 'republica', 'monarquia_parlamentaria', 'partitocracia'].includes(regimeOf(n)) ? .2 : 0);
  const st = warStakes(n, e); if (st < need || Math.random() > .5) return false;
  W2['nk' + n.id] = true;
  const why = st >= 1.5 ? 'dice que es su supervivencia' : (STAKES[W2.reason] || 0) >= .5 ? `por ${REASON_TXT[W2.reason] || W2.reason}` : 'la guerra se le complica';
  notify(`¡${capFirst(leaderTitle(n))} ${n.leader ? n.leader.name + ' ' : ''}de ${n.name} autoriza lanzar misiles contra ${e.name} (${why})! ${tyranny(n) ? 'Nadie se atreve a llevarle la contraria' : 'El parlamento lo aprueba por poco, entre protestas'}${missileBan() ? '. Saben que el Consejo les sancionará' : ''}`, { x:n.fx * T, y:n.fy * T });
  return true;
}
// Salirse de la convención (para volver a tener misiles): aceptando las sanciones
function leaveBan(g, need){
  const n = nationOf(g), B = missileBan(); if (!B) return; B.signers = B.signers.filter(id => id !== n.id);
  const C = typeof council === 'function' && council();
  if (C && need) { C.sanctions[n.id] = { until:yearT + DAY_LEN * 5, why:'romper la convención contra los misiles' }; councilLog(`${n.name} rompe la convención contra los misiles y queda sancionado`); }
  notify(need ? `${n.name} rompe la convención contra los misiles: dice que se juega su supervivencia y acepta las sanciones del Consejo` : `${n.name} se sale de la convención contra los misiles`, { x:n.fx * T, y:n.fy * T });
}
// Quien lanza con la convención en vigor (sin haberla firmado), sancionado por el Consejo
function missileBreach(g){
  const n = nationOf(g); worldOutrage(n);
  const C = typeof council === 'function' && council(), B = missileBan(); if (!C || !B) return;
  C.sanctions[n.id] = { until:yearT + DAY_LEN * 6, why:'lanzar misiles contra la convención' };
  if (!(n.mSancMsg > yearT)) { n.mSancMsg = yearT + DAY_LEN * 3; const txt = `El ${COUNCIL_NAME} sanciona a ${n.name} por lanzar misiles: la convención contra los misiles lo prohíbe`; councilLog(txt); notify(txt, { x:n.fx * T, y:n.fy * T }); }
}
// La convención: el Consejo la vota cuando ya hay misiles en el mundo; luego se puede unir quien quiera
let banT = 0;
SYSTEMS.push(dt => {
  if (!world || (banT -= dt) > 0) return; banT = 20;
  const C = typeof council === 'function' && council(); if (!C || C.members.length < 3) return;
  const members = C.members.map(villageById).filter(m => m && popOf(m)); if (!liveTowns().some(g => knowsSci(g, 'misiles'))) return;
  const wantsBan = m => !hasLaw(m, 'disuasion') && !(tyranny(m) && silosOf(m).length) && !(world.mUsed && Object.keys(world.mUsed).some(k => k.endsWith('>' + m.id)) && silosOf(m).length); // (quien acaba de sufrir un ataque y tiene con qué responder, no)
  const B = missileBan();
  if (!B) {
    if ((world.banVoteT || 0) > yearT) return; world.banVoteT = yearT + DAY_LEN * 3;
    const yes = members.filter(m => (typeof delegateOf !== 'function' || delegateOf(m)) && wantsBan(m)), no = members.length - yes.length;
    let txt = `El ${COUNCIL_NAME} vota una convención contra los misiles: ${yes.length} a favor, ${no} en contra`;
    if (yes.length > no) { world.missileBan = { since:Math.floor(yearT / DAY_LEN) + 1, signers:yes.map(m => m.id) }; txt += `. Sale adelante: ${yes.map(m => m.name).join(', ')} se comprometen a no tener misiles`; }
    else txt += '. No sale adelante';
    councilLog(txt); notify(txt, { x:villageById(C.seat).fx * T, y:villageById(C.seat).fy * T }); return;
  }
  // Se unen más (o se salen, si cambian de política)
  for (const m of members) {
    const in_ = B.signers.includes(m.id);
    if (!in_ && wantsBan(m) && !atWarAny(m) && Math.random() < .15) { B.signers.push(m.id); notify(`${m.name} firma la convención contra los misiles`, { x:m.fx * T, y:m.fy * T }); }
    else if (in_ && !wantsBan(m) && !atWarAny(m) && Math.random() < .3) leaveBan(m, false);
  }
});
const atWarAny = g => [...rels.values()].some(r => r.war && (r.war.att === nationOf(g).id || r.war.def === nationOf(g).id));
