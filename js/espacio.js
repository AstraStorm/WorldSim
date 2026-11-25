// World Sim · La carrera espacial: lanzaderas, cohetes de una o dos fases, aterrizaje automático y misiones
// ================= Espacio =================
// · Ciencia: «la cohetería» (aviación + electrónica) → cohetes de una fase (combustible sólido: mucha potencia);
//   «los cohetes de dos fases»; «el combustible líquido» (dura más y deja apagar y encender los motores); «el aterrizaje
//   automático» (ordenadores: la primera fase vuelve y se reutiliza); «los satélites»; «la estación espacial»;
//   «la hidroponía»; «la defensa planetaria»; «la colonización espacial»
// · Lanzadera: base (cohetes de una fase), mejorada (dos fases y con propulsores) y puerto espacial (los más grandes). Cada
//   lanzamiento cuesta hierro, combustible y dinero; reutilizar la primera fase lo abarata
// · Lanzamiento: aviso grande y cuenta atrás desde 10; llamarada y humo; sube dejando estela y se sale de la pantalla.
//   En los de dos fases, antes de llegar arriba se separan: los propulsores laterales primero, luego la fase central y al
//   final sigue la de arriba. Lo que se suelta cae al mar (o donde caiga); con aterrizaje automático, la fase central da la
//   vuelta y aterriza en la base (o, con puerto grande, en un carguero vacío en el mar). Todo puede fallar: con la
//   experiencia, cada vez menos
// · Misiones: investigación (mucha ciencia), satélites (cobertura y conectividad para toda la nación), estación espacial
//   (más ciencia para siempre), hidroponía (más comida), defensa planetaria (los satélites desvían meteoritos) y colonos a
//   la Luna o a Marte (se van para no volver... de momento)
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i < 0 ? DISCOVERIES.length : i + 1, 0, { ...d, req:d.req.filter(k => DISCOVERIES.some(x => x.k === k)) }); if (typeof SCI_REQ === 'object') SCI_REQ[d.k] = d.req; };
  add('internet', { k:'coheteria', txt:'la cohetería', cost:200, eff:'lanzaderas y cohetes de una fase (combustible sólido): mucha ciencia', req:['aviacion', 'electronica'] });
  add('coheteria', { k:'cohete_2fases', txt:'los cohetes de dos fases', cost:170, eff:'cohetes que se separan antes de llegar arriba: más alto y más carga', req:['coheteria'] });
  add('cohete_2fases', { k:'combustible_liquido', txt:'el combustible líquido', cost:180, eff:'dura más y deja apagar y encender los motores: menos fallos y cohetes con propulsores', req:['coheteria', 'refinado'] });
  add('combustible_liquido', { k:'aterrizaje_auto', txt:'el aterrizaje automático', cost:220, eff:'la primera fase vuelve y aterriza sola: se reutiliza', req:['ordenadores', 'cohete_2fases', 'combustible_liquido'] });
  add('aterrizaje_auto', { k:'satelites', txt:'los satélites', cost:190, eff:'satélites en órbita: cobertura y conectividad para toda la nación', req:['coheteria', 'telecomunicaciones'] });
  add('satelites', { k:'estacion_espacial', txt:'la estación espacial', cost:250, eff:'un laboratorio en órbita: más ciencia para siempre', req:['satelites', 'cohete_2fases'] });
  add('estacion_espacial', { k:'hidroponia', txt:'la hidroponía', cost:160, eff:'cultivos sin tierra probados en la estación: los campos dan más', req:['estacion_espacial'] });
  add('hidroponia', { k:'defensa_planetaria', txt:'la defensa planetaria', cost:220, eff:'los satélites desvían los meteoritos que van a caer', req:['satelites', 'aterrizaje_auto'] });
  add('defensa_planetaria', { k:'colonizacion_espacial', txt:'la colonización espacial', cost:300, eff:'colonos a la Luna y a Marte', req:['estacion_espacial', 'combustible_liquido'] });
})();
BLD.add('space'); BUILD_DIMS.space = [6, 9]; KIND_DIMS.lanzadera = [6, 9];
for (const k of [1, 2, 3]) OBJ[`space:lanzadera${k}`] = [k === 3 ? 'Puerto espacial' : k === 2 ? 'Lanzadera mejorada' : 'Lanzadera', 'house', 0];
Object.assign(BLD_DESC, { space:'Lanzadera: desde aquí despegan los cohetes (investigación, satélites, estación espacial, colonos...)' });
Object.assign(BLD_TYPE, { space:'Espacio' });
const ROCKETS = {
  // low: lo que mide la primera fase (fracción del alto, desde abajo); split: dónde acaban los propulsores laterales;
  // xp: lanzamientos que hacen falta antes de atreverse con él (se va de lo pequeño a lo grande, poco a poco)
  a:{ n:'Cohete ligero', fases:1, need:['coheteria'], xp:0 },
  b:{ n:'Cohete pesado', fases:1, need:['coheteria'], xp:2 },
  c:{ n:'Cohete de dos fases', fases:2, low:.616, need:['cohete_2fases'], pad:2, xp:4 },
  d:{ n:'Cohete con propulsores', fases:3, low:.524, split:[.3, .7], need:['cohete_2fases', 'combustible_liquido'], pad:2, xp:7 },
  e:{ n:'Cohete de carga pesada', fases:3, low:.596, split:[.26, .74], need:['cohete_2fases', 'combustible_liquido', 'estacion_espacial'], pad:3, xp:10 },
};
const PAD_DX = { 1:0, 2:0, 3:1 }; // el centro del círculo de la plataforma, en cada lanzadera (11 px por encima de la base)
const padSpot = g => { const lv = padOf(g); return [(g.spacePad % W) * T + 2 + (PAD_DX[lv] || 0), ((g.spacePad / W) | 0) * T + 3 - 11]; };
const padOf = g => g.spacePad != null && world.objs[g.spacePad] && world.objs[g.spacePad].key.startsWith('space:') ? +world.objs[g.spacePad].key.slice(-1) : 0;
const bestRocket = g => { const lv = padOf(g), xp = g.rocketXP || 0; let best = null; for (const [k, R] of Object.entries(ROCKETS)) if (R.need.every(s => knowsSci(g, s)) && (R.pad || 1) <= lv && xp >= R.xp) best = k; return best; };
let rockets = [], rocketBits = [];
let spaceT = 0;
SYSTEMS.push(dt => {
  if (!world || (spaceT -= dt) > 0) return; spaceT = 3;
  for (const g of liveTowns()) {
    if (nationOf(g) !== g || !knowsSci(g, 'coheteria')) continue;
    const lv = padOf(g), at = { x:g.fx * T, y:g.fy * T };
    // Construir o mejorar la lanzadera
    const xp = g.rocketXP || 0, wantLv = knowsSci(g, 'estacion_espacial') && xp >= 9 ? 3 : knowsSci(g, 'cohete_2fases') && xp >= 3 ? 2 : 1; // (se amplía cuando ya tienen experiencia)
    if (lv < wantLv && (g.iron || 0) >= 30 && g.stone >= 60 && !(g.padFail > yearT - DAY_LEN / 3) && !rockets.some(r => r.g === g.id)) {
      if (!lv) { const s = typeof farSite === 'function' ? farSite(g, 6, 9) : null; if (!s) { g.padFail = yearT; continue; } clearRocks(s[0] - 6, s[1] - 10, s[0] + 6, s[1] + 1); for (let yy = s[1] - 9; yy <= s[1]; yy++) for (let xx = s[0] - 6; xx <= s[0] + 6; xx++) farmMap.delete(yy * W + xx); g.spacePad = s[1] * W + s[0]; }
      world.objs[g.spacePad] = { key:`space:lanzadera${lv + 1}`, v:0, ox:0, oy:0, vid:g.id }; g.iron -= 30; g.stone -= 60; const x = g.spacePad % W, y = (g.spacePad / W) | 0;
      composeRegion(x - 12, y - 16, x + 12, y + 4); addEffect(x * T + 2, y * T + 3, 'poof'); if (!lv) connect(g, x, y);
      notify(lv ? `${g.name} amplía su lanzadera: ${lv + 1 === 3 ? 'ya es un puerto espacial' : 'ya puede lanzar cohetes de dos fases'}` : `${g.name} termina su primera lanzadera de cohetes`, { x:x * T, y:y * T });
      continue;
    }
    if (!lv || rockets.some(r => r.g === g.id) || (g.launchT || 0) > yearT) continue;
    const k = bestRocket(g); if (!k) continue;
    const reuse = !!g.reusable, cost = { iron:reuse ? 6 : 15, fuel:reuse ? 5 : 10, money:reuse ? 15 : 30 };
    const fuelOk = (g.fuel || 0) >= cost.fuel || (g.coal || 0) >= cost.fuel * 2, ec = ecOf(g);
    if ((g.iron || 0) < cost.iron || !fuelOk || (ec && ec.treas < cost.money)) continue;
    const m = rocketMission(g, k); if (!m) continue;
    g.iron -= cost.iron; if ((g.fuel || 0) >= cost.fuel) g.fuel -= cost.fuel; else g.coal -= cost.fuel * 2; if (ec) ec.treas -= cost.money; g.reusable = false;
    g.launchT = yearT + DAY_LEN * 3;
    const [x, y] = padSpot(g);
    const R = { g:g.id, k, m, x, y, x0:x, y0:y, alt:0, v:0, t:10, phase:'cuenta', parts:ROCKETS[k].fases === 3 ? 3 : ROCKETS[k].fases, liquid:knowsSci(g, 'combustible_liquido'), auto:knowsSci(g, 'aterrizaje_auto') };
    const fail = Math.max(.03, .28 - xp * .03 - (R.liquid ? .06 : 0)); if (Math.random() < fail) R.failAt = 40 + Math.random() * 240;
    rockets.push(R); sendBarge(g, R);
    notify(`¡Lanzamiento en ${g.name}! Un ${ROCKETS[k].n.toLowerCase()} despega con una misión de ${MISSION_TXT[m]}: cuenta atrás desde 10`, { x, y });
  }
});
const MISSION_TXT = { investigacion:'investigación', satelite:'poner un satélite en órbita', estacion:'montar la estación espacial', hidroponia:'cultivos hidropónicos', defensa:'defensa planetaria', luna:'llevar colonos a la Luna', marte:'llevar colonos a Marte' };
function rocketMission(g, k){ // por orden: primero investigar; luego satélites; con dos, la estación; desde ella, hidroponía y defensa; y lo último, colonos
  const n = g, xp = n.rocketXP || 0, sats = n.sats || 0, big = ROCKETS[k].fases >= 2, huge = k === 'e', opts = [['investigacion', 3]];
  if (knowsSci(g, 'satelites') && xp >= 2) opts.push(['satelite', sats < 6 ? 6 : 1]);
  if (knowsSci(g, 'estacion_espacial') && big && sats >= 2 && !n.station) opts.push(['estacion', 10]);
  if (knowsSci(g, 'hidroponia') && n.station && !n.hydro) opts.push(['hidroponia', 6]);
  if (knowsSci(g, 'defensa_planetaria') && n.station && sats >= 3 && !n.shield) opts.push(['defensa', 6]);
  if (knowsSci(g, 'colonizacion_espacial') && huge && n.station && n.hydro && xp >= 12 && popOf(g) >= 60) opts.push([(n.moon || 0) < 12 ? 'luna' : 'marte', 4]);
  let r = Math.random() * opts.reduce((s, o) => s + o[1], 0); for (const [m, w] of opts) if ((r -= w) < 0) return m; return 'investigacion';
}
// Avisos a la izquierda (lanzamientos y misiles): una tarjeta por cada uno; al pulsarla, la cámara va allí
function sideCard(key, cls, html, at){
  let box = document.getElementById('sideCards'); if (!box) { box = document.createElement('div'); box.id = 'sideCards'; document.body.appendChild(box); }
  let el = box.querySelector(`[data-k="${key}"]`);
  if (!el) { el = document.createElement('div'); el.className = 'sc ' + cls; el.dataset.k = key; box.appendChild(el); el.addEventListener('click', () => { const p = el._at && el._at(); if (p) { setFollow(null); centerOn(p[0], p[1], Math.max(zoom, 3)); } }); }
  if (el._h !== html) { el._h = html; el.innerHTML = html; } el._at = at; el._seen = true; return el;
}
function sideCardsSweep(){ for (const el of document.querySelectorAll('#sideCards .sc')) { if (!el._seen && !(el._until > performance.now())) el.remove(); el._seen = false; } }
function bannerTick(){
  for (const R of rockets) {
    const g = villageById(R.g); if (!g || R.alt > 700) continue; R.key ||= 'r' + Math.random().toString(36).slice(2);
    const n = R.phase === 'cuenta' ? `<span class="n">${Math.max(0, Math.ceil(R.t))}</span>` : '<span class="n go">¡DESPEGUE!</span>';
    sideCard(R.key, 'rk', `<div class="t">🚀 LANZAMIENTO · ${esc(g.name)}</div>${n}<div class="m">${esc(ROCKETS[R.k].n)} · ${esc(MISSION_TXT[R.m])}</div>`, () => [R.x, R.y0 - R.alt]);
  }
}
// ---- El vuelo ----
SYSTEMS.push(dt => {
  if (!rockets.length && !rocketBits.length) return;
  for (const R of rockets) {
    const g = villageById(R.g); if (!g) { R.done = true; continue; }
    if (R.phase === 'cuenta') { R.t -= dt; if (R.t <= 3 && Math.random() < dt * 20) smokePuff(R.x0 + (Math.random() - .5) * 14, R.y0 + 2, 1); if (R.t <= 0) { R.phase = 'sube'; snd('boom', R.x0, R.y0, .5); } continue; }
    if (R.phase === 'sube') {
      R.v += dt * (R.liquid ? 26 : 32); R.alt += R.v * dt; R.x = R.x0 + Math.max(0, R.alt - 60) * .12; // se inclina un poco (giro de gravedad)
      if (R.alt < 80 && Math.random() < dt * 30) smokePuff(R.x0 + (Math.random() - .5) * 18, R.y0 + 2, 1.4); // la nube del despegue
      if (Math.random() < dt * 14) smokePuff(R.x, R.y0 - R.alt + 8, .7); // la estela
      if (R.failAt && R.alt >= R.failAt) { rocketBoom(R, g); continue; }
      // Separación de fases
      const Rk = ROCKETS[R.k];
      if (Rk.fases === 3 && R.parts === 3 && R.alt > 110) { R.parts = 2; const S = stageCv(R.k); // primero, los propulsores laterales
        if (S) for (const [cv, cx, sg] of [[S.boostL, S.blx, -1], [S.boostR, S.brx, 1]]) rocketBits.push({ cv, x:R.x + cx, y:R.y0 - R.alt, vx:sg * (6 + Math.random() * 4), vy:-R.v * .45, rot:0, vr:sg * .7, sea:true, burn:.6, gy:R.y0 + 20 + Math.random() * 60 });
        notify(`Se separan los propulsores laterales del cohete de ${g.name}`, { x:R.x, y:R.y0 - R.alt }); }
      if (Rk.fases >= 2 && R.parts === 2 && R.alt > 210) { R.parts = 1; const S = stageCv(R.k); // luego, la primera fase (la de abajo); la de arriba sigue sola
        if (S) { const b = { cv:S.core, x:R.x, y:R.y0 - R.alt, rot:0 }; if (R.auto) Object.assign(b, { vx:0, vy:0, vr:0, land:true, g:R.g, barge:R.barge || null }); else Object.assign(b, { vx:4, vy:-R.v * .35, vr:.4, sea:true, gy:R.y0 + 40 + Math.random() * 60 }); rocketBits.push(b); R.alt += S.lowH; }
        notify(`Se separa la primera fase del cohete de ${g.name}${R.auto ? ': da la vuelta para aterrizar' : ''}`, { x:R.x, y:R.y0 - R.alt }); }
      if (R.alt > 900) { R.done = true; rocketSuccess(R, g); } // fuera de la pantalla: ya está en el espacio
    }
  }
  rockets = rockets.filter(r => !r.done);
  for (const b of rocketBits) {
    if (b.land) { // la fase que vuelve: cae, da la vuelta y frena con el motor hasta posarse
      const g = villageById(b.g), bg = b.barge && !b.barge.done ? b.barge : null; if (b.barge && !bg) b.barge = null;
      const [tx, ty] = bg ? [bg.x, bg.y - 4] : g && padOf(g) ? padSpot(g) : [b.x, b.y + 300]; // (en el carguero, sobre la cubierta; en la base, en el centro del círculo)
      const dy = ty - b.y, dx = tx - b.x; b.rot += (0 - b.rot) * Math.min(1, dt * 2);
      b.vy = Math.min(dy * .6, 50); if (dy < 50) b.vy = Math.max(5, dy * .7); b.vx = clamp(dx * .9, -45, 45); // baja frenando con el motor y se va centrando
      b.x += b.vx * dt; b.y += b.vy * dt; b.burn = dy < 80; if (b.burn && Math.random() < dt * 20) smokePuff(b.x, b.y + 6, .6);
      if (Math.abs(dy) < 1.5 && Math.abs(dx) < 1.5) { b.done = true; const xp = g ? g.rocketXP || 0 : 0;
        if (Math.random() < Math.max(.08, .45 - xp * .06)) { rocketBoomAt(tx, ty); if (bg) { bg.wait = 0; bg.label = null; bg.phase = 'vuelta'; bg.pts = seaPath([bg.x, bg.y], bg.home) || [bg.home]; bg.k = 0; } if (g) notify(`La primera fase del cohete de ${g.name} se estrella al aterrizar${bg ? ' en el carguero' : ''}. La próxima vez irá mejor`, { x:tx, y:ty }); }
        else if (g) { g.reusable = true;
          if (bg) { bg.stageCv = b.cv; bg.full = true; bg.kind = 'fin'; bg.wait = 2; bg.label = 'Trae la fase del cohete'; bg.phase = 'vuelta'; bg.pts = seaPath([bg.x, bg.y], bg.home) || [bg.home]; bg.k = 0; } // el carguero se la lleva a puerto
          else rocketBits.push({ cv:b.cv, x:tx, y:ty, rot:0, parked:true, t:0 }); // se queda de pie en la plataforma
          notify(`¡La primera fase del cohete de ${g.name} aterriza ${bg ? 'en un carguero en pleno mar! El barco la trae a puerto' : 'en el centro de la base!'} Se podrá reutilizar`, { x:tx, y:ty }); } }
      continue;
    }
    if (b.parked) { b.t += dt; if (b.t > 70) { b.x += dt * 6; b.alpha = Math.max(0, 1 - (b.t - 70) / 8); if (b.t > 78) b.done = true; } continue; } // de pie en la plataforma un buen rato; luego se la llevan al hangar
    // lo que se suelta cae despacio (aún lleva impulso), dando vueltas, hasta el suelo o el mar
    b.vy += 16 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.t = (b.t || 0) + dt; if (b.t > 1.6) b.burn = 0; if (Math.random() < dt * 10) smokePuff(b.x, b.y - 4, .6);
    if (b.y >= b.gy || b.t > 14) { b.done = true; const i = Math.floor(b.y / T) * W + Math.floor(b.x / T); if (i >= 0 && i < N && WATER[world.biome[i]]) { addEffect(b.x, b.y, 'poof'); for (let n = 0; n < 14; n++) chips.push({ x:b.x, y:b.y, vx:(Math.random() - .5) * 30, vy:-10 - Math.random() * 20, life:0, max:.9, col:'rgba(230,245,255,.85)' }); } else rocketBoomAt(b.x, b.y, .6); } // al mar (chapuzón) o donde caiga
  }
  rocketBits = rocketBits.filter(b => !b.done);
});
SYSTEMS.push(() => { if (!world) return; bannerTick(); if (typeof missileCards === 'function') missileCards(); sideCardsSweep(); });
// Con puerto grande, la fase aterriza en un carguero vacío en el mar (que luego vuelve a puerto)
// Con aterrizaje automático y un puerto grande en la nación, una vez de cada dos la fase aterriza en el mar, sobre un
// carguero vacío que sale de puerto al empezar la cuenta atrás, la espera y luego la trae
function sendBarge(g, R){
  if (!R.auto || typeof canCargo !== 'function' || (g.bargeN = (g.bargeN || 0) + 1) % 2) return;
  const P = liveTowns().filter(o => nationOf(o) === nationOf(g) && canCargo(o)).sort((a, b) => Math.hypot(a.fx - g.fx, a.fy - g.fy) - Math.hypot(b.fx - g.fx, b.fy - g.fy))[0]; if (!P) return;
  const home = cargoPort(P);
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, d = 35 + (k % 3) * 12, x = home[0] + Math.cos(a) * d * T, y = home[1] + Math.sin(a) * d * T, i = Math.floor(y / T) * W + Math.floor(x / T);
    if (i < 0 || i >= N || !WATER[world.biome[i]] || world.biome[i] === B.SHALLOW) continue; const p = seaPath(home, [x, y]); if (!p) continue;
    const c = { g:P.id, kind:'barcaza', pts:p, k:0, x:home[0], y:home[1], full:false, phase:'ida', home, label:'Sale a esperar el cohete' }; cargos.push(c); R.barge = c;
    notify(`Un carguero de ${P.name} sale al mar: la primera fase del cohete intentará aterrizar sobre él`, { x:home[0], y:home[1] }); return; }
}
function smokePuff(x, y, s){ chips.push({ x, y, vx:(Math.random() - .5) * 14 * s, vy:-2 - Math.random() * 6, life:0, max:1.5 + s, col:`rgba(${200 + Math.floor(Math.random() * 40)},${200 + Math.floor(Math.random() * 40)},${205 + Math.floor(Math.random() * 40)},.6)` }); }
function rocketBoomAt(x, y, k = 1){ addEffect(x, y, 'poof'); snd('boom', x, y, .6 * k); for (let n = 0; n < 30 * k; n++) chips.push({ x, y, vx:(Math.random() - .5) * 60, vy:(Math.random() - .7) * 50, life:0, max:.8 + Math.random(), col:n % 3 ? '#ff9a3a' : '#ffe080' }); for (let n = 0; n < 12 * k; n++) smokePuff(x + (Math.random() - .5) * 10, y, 1.5); }
function rocketBoom(R, g){
  R.done = true; rocketBoomAt(R.x, R.y0 - R.alt, 1.4); g.rocketXP = (g.rocketXP || 0) + 1;
  notify(`¡El cohete de ${g.name} explota en pleno vuelo! Han aprendido de sus errores para la próxima`, { x:R.x, y:R.y0 - R.alt });
}
function rocketSuccess(R, g){
  g.rocketXP = (g.rocketXP || 0) + 1; const at = { x:R.x0, y:R.y0 };
  if (R.m === 'investigacion') { research(g, 220); notify(`El cohete de ${g.name} llega al espacio: sus sabios aprenden muchísimo`, at); }
  else if (R.m === 'satelite') { g.sats = (g.sats || 0) + 1; world.sats = (world.sats || 0) + 1; notify(`${g.name} pone en órbita su satélite número ${g.sats}: mejor cobertura para toda la nación`, at); }
  else if (R.m === 'estacion') { g.station = true; notify(`¡${g.name} monta su estación espacial en órbita! Sus sabios investigarán más deprisa`, at); }
  else if (R.m === 'hidroponia') { g.hydro = true; notify(`En la estación espacial de ${g.name} prueban los cultivos hidropónicos: en casa, los campos darán más`, at); }
  else if (R.m === 'defensa') { g.shield = true; notify(`${g.name} completa su red de defensa planetaria: sus satélites desviarán los meteoritos`, at); }
  else if (R.m === 'luna' || R.m === 'marte') { const go = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H && !v.away && v !== g.leader).slice(0, 6); for (const v of go) { releaseTask(v); v.dead = 'espacio'; v.away = true; } g[R.m === 'luna' ? 'moon' : 'mars'] = (g[R.m === 'luna' ? 'moon' : 'mars'] || 0) + go.length; notify(`¡${go.length} colonos de ${g.name} llegan a ${R.m === 'luna' ? 'la Luna' : 'Marte'}! La humanidad ya vive fuera de su mundo`, at); }
}
// Efectos de lo conseguido: satélites (más conectividad), estación (más ciencia), hidroponía (más comida), defensa (meteoritos)
{ const base = research; research = function(g, pts){ const n = nationOf(g); return base.call(this, g, pts * (n.station ? 1.25 : 1)); }; }
{ const base = connOf; connOf = function(g){ const c = base(g), n = nationOf(g); return n.sats ? Math.min(1, c + .1 * Math.min(5, n.sats)) : c; }; } // (cada satélite, hasta 5, da algo de cobertura a toda la nación)
SYSTEMS.push(dt => { if (!world) return; for (const g of villages) { const n = nationOf(g); if (n && n.hydro && popOf(g) && Math.random() < dt * .05) g.food += 1; } });
if (typeof launchMeteor === 'function') { const base = launchMeteor; launchMeteor = function(x, y, size){ const n = villages.find(o => popOf(o) && nationOf(o) === o && o.shield && Math.hypot(o.fx * T - x, o.fy * T - y) < 600); if (n && Math.random() < .8) { notify(`¡Los satélites de ${n.name} desvían un meteorito que iba a caer cerca!`, { x, y }); return; } return base.apply(this, arguments); }; }
// ---- Dibujo ----
// Las fases se recortan del mismo dibujo del cohete entero (así no cambian de tamaño al separarse): la de arriba, la de
// abajo (el núcleo) y los dos propulsores laterales
const stageC = {};
function stageCv(k){
  if (stageC[k]) return stageC[k]; const s = artFrame(`rocket:${k}`), Rk = ROCKETS[k]; if (!s || !Rk.low) return null;
  const w = s.width, h = s.height, lowH = Math.round(h * Rk.low), cut = (x, y, cw, chh) => { const c = document.createElement('canvas'); c.width = Math.max(1, cw); c.height = Math.max(1, chh); c.getContext('2d').drawImage(s, x, y, cw, chh, 0, 0, cw, chh); return c; };
  const S = { lowH, w, upper:cut(0, 0, w, h - lowH) };
  if (Rk.split) {
    const a = Math.round(w * Rk.split[0]), b = Math.round(w * Rk.split[1]);
    S.core = cut(a, h - lowH, b - a, lowH); S.boostL = cut(0, h - lowH, a, lowH); S.boostR = cut(b, h - lowH, w - b, lowH);
    S.blx = -w / 2 + a / 2; S.brx = -w / 2 + (b + w) / 2; S.coreX = -w / 2 + (a + b) / 2;
    const nb = document.createElement('canvas'); nb.width = w; nb.height = h; const c = nb.getContext('2d'); c.drawImage(s, 0, 0); c.clearRect(0, h - lowH, a, lowH); c.clearRect(b, h - lowH, w - b, lowH); S.noBoost = nb;
  } else { S.core = cut(0, h - lowH, w, lowH); S.coreX = 0; }
  return stageC[k] = S;
}
function drawCv(cv, x, y, rot, cx = 0){ vctx.save(); vctx.translate(Math.round(x), Math.round(y)); if (rot) vctx.rotate(rot); vctx.drawImage(cv, Math.round(cx - cv.width / 2), -cv.height); vctx.restore(); }
function flame(x, y, k){ const f = .7 + Math.random() * .6; vctx.fillStyle = 'rgba(255,240,180,.95)'; vctx.fillRect(x - 1, y, 3, Math.round(3 * f * k)); vctx.fillStyle = 'rgba(255,160,60,.85)'; vctx.fillRect(x - 2, y + 2, 5, Math.round(5 * f * k)); vctx.fillStyle = 'rgba(255,90,30,.6)'; vctx.fillRect(x - 1, y + 6, 3, Math.round(6 * f * k)); }
function drawRockets(now){
  for (const R of rockets) {
    const Rk = ROCKETS[R.k], y = R.y0 - R.alt, rot = Math.min(.2, Math.max(0, R.alt - 60) / 1500), s = artFrame(`rocket:${R.k}`), S = stageCv(R.k); if (!s) continue;
    if (R.phase === 'cuenta') { vctx.save(); vctx.font = `bold ${Math.max(6, 14 / zoom)}px system-ui`; vctx.textAlign = 'center'; vctx.fillStyle = '#ffe070'; vctx.strokeStyle = 'rgba(0,0,0,.8)'; vctx.lineWidth = 2 / zoom; const t = String(Math.max(0, Math.ceil(R.t))); vctx.strokeText(t, R.x0, R.y0 - s.height - 8); vctx.fillText(t, R.x0, R.y0 - s.height - 8); vctx.restore(); }
    const fire = R.phase !== 'cuenta', big = R.alt < 30 ? 1.6 : 1.2;
    if (!S || R.parts === 1 && Rk.fases === 1) { if (fire) flame(Math.round(R.x), Math.round(y + 1), big); drawCv(s, R.x, y, rot); }
    else if (R.parts === 3) { if (fire) for (const cx of [S.coreX, S.blx, S.brx]) flame(Math.round(R.x + cx), Math.round(y + 1), cx === S.coreX ? big : big * .8); drawCv(s, R.x, y, rot); } // los laterales también echan fuego
    else if (R.parts === 2) { if (fire) flame(Math.round(R.x + S.coreX), Math.round(y + 1), big); drawCv(S.noBoost || s, R.x, y, rot); }
    else { if (fire) flame(Math.round(R.x), Math.round(y + 1), 1.1); drawCv(S.upper, R.x, y, rot); }
    const g = villageById(R.g); if (R.alt < 50 && g && g.spacePad != null) redrawFront(R.x - s.width / 2, R.x + s.width / 2, y - s.height, ((g.spacePad / W) | 0) * T + 4); // lo que está delante de la plataforma (no ella misma) lo tapa
  }
  for (const b of rocketBits) {
    if (b.burn) flame(Math.round(b.x), Math.round(b.y + 1), b.burn === true ? 1 : b.burn);
    if (b.alpha != null) vctx.globalAlpha = b.alpha; drawCv(b.cv, b.x, b.y, b.rot); vctx.globalAlpha = 1;
  }
}
{ const base = drawAir; drawAir = function(t){ base.apply(this, arguments); drawRockets(performance.now()); }; }
// ---- Leyes y tratados del espacio ----
Object.assign(LAW_TXT, { agencia_espacial:'agencia espacial pública', espacio_privado:'carrera espacial privada' });
Object.assign(LAW_DESC, { agencia_espacial:'el estado paga los lanzamientos: más a menudo, pero el tesoro se resiente', espacio_privado:'los ricos pagan los cohetes: el tesoro no gasta, pero se lanza menos' });
Object.assign(LAW_LEAN, { agencia_espacial:-.2, espacio_privado:.6 }); LAW_CLASH.push(['agencia_espacial', 'espacio_privado']);
Object.assign(LAW_REQ, { agencia_espacial:g => knowsSci(g, 'coheteria'), espacio_privado:g => knowsSci(g, 'coheteria') });
Object.assign(LAW_WHY, { agencia_espacial:'ahora que hay lanzadera', espacio_privado:'ahora que hay lanzadera' });
{ const base = lawsTick; lawsTick = function(g, dt, people){ const due = (g.lawsT ?? 0) - dt <= 0; base.apply(this, arguments); if (!due) return; if (hasLaw(g, 'agencia_espacial') && g.launchT > yearT) g.launchT -= DAY_LEN * .1; if (hasLaw(g, 'espacio_privado')) { const ec = ecOf(g); if (ec) ec.treas += 1.5; } }; }
Object.assign(TREATY, { espacio:{ n:'acuerdo de cooperación espacial', days:[8, 12], icon:'🚀' }, espacio_paz:{ n:'tratado del espacio exterior', days:[10, 14], icon:'🌍' } });
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments); if (!r.known || r.war) return;
  if (hasTreaty(r, 'espacio')) { r.v = Math.min(100, r.v + .1); for (const [x, y] of [[a, b], [b, a]]) if ((x.rocketXP || 0) > (y.rocketXP || 0) + 2 && Math.random() < .01) y.rocketXP = (y.rocketXP || 0) + 1; }
  if (hasTreaty(r, 'espacio_paz')) r.v = Math.min(100, r.v + .08);
  if (Math.random() > .5) return;
  if (!hasTreaty(r, 'espacio') && r.v > 35 && knowsSci(a, 'coheteria') && knowsSci(b, 'coheteria') && Math.random() < .03) signTreaty(a, b, r, 'espacio');
  else if (!hasTreaty(r, 'espacio_paz') && r.v > 20 && (knowsSci(a, 'satelites') || knowsSci(b, 'satelites')) && Math.random() < .02) signTreaty(a, b, r, 'espacio_paz');
}; }
