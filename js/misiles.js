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
// · Tratado de no proliferación (entre ellos no hay misiles); leyes «desarme» (no se construyen silos) y «disuasión»
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
  { n:'V-2', range:160, R:3, acc:.65, need:'misiles' }, { n:'misil táctico', range:120, R:2.4, acc:.9, need:'misiles' },
  { n:'misil de propulsores', range:380, R:4.5, acc:.7, need:'misiles' }, { n:'misil remachado', range:260, R:4, acc:.85, need:'misiles_guiados' },
  { n:'antimisil', range:0, R:0, acc:1, need:'misiles_guiados', anti:true }, { n:'misil pesado', range:520, R:6.5, acc:.8, need:'misil_pesado' },
];
let missiles = [];
const silosOf = g => (g.silos ||= []).filter(s => world.objs[s.i]);
let siloT = 0;
SYSTEMS.push(dt => {
  if (!world || (siloT -= dt) > 0) return; siloT = 3;
  for (const g of liveTowns()) {
    if (nationOf(g) !== g || !knowsSci(g, 'misiles') || hasLaw(g, 'desarme')) continue;
    const foes = liveTowns().filter(o => atWar(g, o) && !noProlif(g, o)), S = silosOf(g), want = (hasLaw(g, 'disuasion') ? 2 : 1) + Math.floor(popOf(g) / 80);
    // Silos: en guerra (o con la ley de disuasión), hasta los que quiera
    if ((foes.length || hasLaw(g, 'disuasion')) && S.length < want && (g.iron || 0) >= 25 && g.stone >= 40 && !(g.siloFail > yearT - DAY_LEN / 3)) {
      const s = typeof farSite === 'function' ? farSite(g, 3, 4) : null; if (!s) { g.siloFail = yearT; continue; } clearRocks(s[0] - 3, s[1] - 4, s[0] + 3, s[1] + 1);
      const i = s[1] * W + s[0]; world.objs[i] = { key:'silo:0', v:0, ox:0, oy:0, vid:g.id }; g.silos.push({ i, f:0, st:'cerrado', t:0, ready:yearT + 20 }); g.iron -= 25; g.stone -= 40;
      composeRegion(s[0] - 6, s[1] - 8, s[0] + 6, s[1] + 3); notify(`${g.name} construye un silo de misiles`, { x:s[0] * T, y:s[1] * T }); continue;
    }
    // Disparar: a un pueblo enemigo a su alcance (el misil mejor que tenga)
    for (const s of S) {
      if (s.st !== 'cerrado' || s.ready > yearT || !foes.length || (g.iron || 0) < 15 || ((g.fuel || 0) < 10 && (g.coal || 0) < 20)) continue;
      const sx = s.i % W, sy = (s.i / W) | 0, types = MISSILES.map((m, k) => [m, k]).filter(([m]) => !m.anti && knowsSci(g, m.need));
      const tgt = foes.filter(o => types.some(([m]) => Math.hypot(o.fx - sx, o.fy - sy) <= m.range)).sort((a, b) => popOf(b) - popOf(a))[0]; if (!tgt) continue;
      const fit = types.filter(([m]) => Math.hypot(tgt.fx - sx, tgt.fy - sy) <= m.range).sort((a, b) => b[0].R - a[0].R), [M, k] = fit[Math.floor(Math.random() * Math.min(2, fit.length))]; // (uno de los dos más fuertes que tenga)
      g.iron -= 15; if ((g.fuel || 0) >= 10) g.fuel -= 10; else g.coal -= 20; s.st = 'abriendo'; s.t = 0; s.ready = yearT + DAY_LEN;
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
      if (m.icp && k >= m.icp.k) { m.done = true; rocketBoomAt(m.x, m.y, 1.2); const o = villageById(m.to); if (o) notify(`¡Los antimisiles de ${o.name} derriban el misil en el aire!`, { x:m.x, y:m.y }); continue; }
      if (k >= 1) { m.done = true; missileImpact(m); }
    }
  }
  missiles = missiles.filter(m => !m.done);
});
// Antimisil: la nación atacada, si lo tiene y tiene silo, lo intenta derribar
function interceptCheck(m){ const o = villageById(m.to), n = o && nationOf(o); if (!n || !knowsSci(n, 'misiles_guiados') || !silosOf(n).length) return; if (Math.random() < .55) m.icp = { k:.55 + Math.random() * .3 }; }
function missileImpact(m){
  const M = MISSILES[m.k], o = villageById(m.to), g = villageById(m.g);
  if (typeof impact === 'function') impact({ x:m.x, y:m.y, size:M.R / 5, R:M.R, blastR:M.R * 3.2 }); // como un meteorito: cráter, edificios y gente
  rocketBoomAt(m.x, m.y, 1 + M.R / 3); if (typeof flash !== 'undefined') flash = Math.min(1, (flash || 0) + .6);
  for (const v of villagers) if (!v.dead && Math.hypot(v.x - m.x, v.y - m.y) < M.R * T * 1.6) killVillager(v, 'misil');
  if (o) { o.anger = (o.anger || 0) + 20; const r = warRel(o, g); if (r && r.war) { r.war.dead = (r.war.dead || 0) + 3; } }
  notify(`¡El ${M.n} de ${g ? g.name : '?'} cae sobre ${o ? o.name : 'el enemigo'}! Una explosión enorme`, { x:m.x, y:m.y });
}
// Todo el mundo condena el ataque
function worldOutrage(g){ for (const o of liveTowns()) { if (nationOf(o) === nationOf(g) || nationOf(o) !== o) continue; const r = relOf(o, nationOf(g)); r.v = clamp(r.v - 12, -100, 100); } }
const noProlif = (a, b) => { const r = rels.get(relKey(nationOf(a), nationOf(b))); return !!(r && hasTreaty(r, 'no_proliferacion')); };
// ---- Dibujo ----
function drawSilos(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) for (const s of g.silos || []) {
    if (!world.objs[s.i]) continue; const x = (s.i % W) * T + 2, y = ((s.i / W) | 0) * T + 3; if (x < x0 - 20 || x > x1 + 20 || y < y0 - 40 || y > y1 + 10) continue;
    const f = artFrame(`silo:${s.f || 0}`); if (f) { vctx.drawImage(f, x - f.ax, y - f.height + 2); redrawFront(x - f.ax, x - f.ax + f.width, y - f.height + 2, y + 2); }
    if (s.st !== 'cerrado') { vctx.fillStyle = `rgba(255,60,40,${.5 + .5 * Math.sin(now / 120)})`; vctx.fillRect(x - 12, y - 11, 2, 2); vctx.fillRect(x + 10, y - 11, 2, 2); } // las luces de alarma
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
{ const blank = document.createElement('canvas'); blank.width = 30; blank.height = 33; blank.ax = 15; const base = artSprite; artSprite = function(o){ if (o && o.key === 'silo:0') return blank; return base.apply(this, arguments); }; } // (el silo se pinta en vivo, con su compuerta)
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
