// World Sim · Ciclo económico: expansión, burbuja, crac, recesión y paro
// ================= Ciclo económico =================
// · Cada nación con moneda tiene su ciclo (n.cycle.v de -1 a 1): sube con el comercio, la industria, la paz y el crédito;
//   baja con la guerra, la inflación, la deuda, la bancarrota, las huelgas y los desastres. Además hay un ciclo del mundo
//   (world.gcycle) que arrastra a todos: unos 10-16 días de subida y bajada, como los de verdad.
// · Lo que se nota: los sueldos (±12 %), el paro (en recesión las fábricas y empresas despiden: v.parado; los parados
//   cobran poco y están de mal humor, con renta básica menos) y los precios en bolsa.
// · Burbuja y crac: si una nación pasa varios días en auge, la bolsa se infla; tarde o temprano revienta (crac bursátil),
//   la economía cae de golpe y arrastra a sus socios comerciales (rutas y alianzas).
// · Leyes: «plan de estímulo» (el tesoro gasta para salir antes de la crisis… y sube la deuda) y «austeridad» (recortes:
//   baja la deuda, pero la crisis dura más y enfada).
const CYCLE_TXT = [[.7, 'auge', '🚀'], [.25, 'expansión', '📈'], [-.25, 'estancamiento', '➖'], [-.7, 'recesión', '📉'], [-2, 'depresión', '🕳']];
const cycleWord = v => CYCLE_TXT.find(([t]) => v >= t);
Object.assign(LAW_TXT, { estimulo:'plan de estímulo', austeridad:'austeridad' });
Object.assign(LAW_DESC, { estimulo:'en crisis el tesoro gasta en obras y ayudas: se sale antes, pero sube la deuda',
  austeridad:'recortes en el gasto: baja la deuda, pero las crisis duran más y la gente se enfada' });
Object.assign(LAW_LEAN, { estimulo:-.35, austeridad:.45 });
Object.assign(LAW_REQ, { estimulo:g => !!g.coin && knowsSci(g, 'economia'), austeridad:g => !!g.coin });
Object.assign(LAW_WHY, { estimulo:'ahora que entienden la economía', austeridad:'ahora que hay tesoro' });
LAW_CLASH.push(['estimulo', 'austeridad']);
{ const c = typeof LAW_CATS !== 'undefined' && LAW_CATS.find(c => c[0] === 'economia'); if (c) c[3].push('estimulo', 'austeridad'); }

const econPhase = n => (n && n.cycle && n.cycle.v) || 0;
const cycleDay = () => Math.floor(yearT / DAY_LEN) + 1;
// Socios: los que comercian con ella por ruta o son aliados
function econPartners(n){
  const out = new Set(), al = allianceOf(n);
  for (const [key, r] of rels) { if (r.war || !r.route) continue;
    const [x, y] = key.split('-').map(Number), a = villageById(x), b = villageById(y); if (!a || !b) continue;
    const na = nationOf(a), nb = nationOf(b); if (na === nb) continue; if (na === n) out.add(nb); else if (nb === n) out.add(na); }
  if (al) for (const id of al.members) { const o = villageById(id); if (o && o !== n) out.add(o); }
  return [...out].filter(o => o.cycle);
}
function gcycleTick(){
  const G = world.gcycle ||= { ph:Math.random() * Math.PI * 2, len:DAY_LEN * (10 + Math.random() * 6) };
  G.ph += (DAY_LEN * .5) / G.len * Math.PI * 2; if (G.ph > Math.PI * 2) { G.ph -= Math.PI * 2; G.len = DAY_LEN * (10 + Math.random() * 6); }
  return Math.sin(G.ph) * .35;
}
function cycleTick(n, glob){
  const ts = natTowns(n).filter(g => g.coin); if (!ts.length) return;
  const C = n.cycle ||= { v:0, hist:[], boom:0, crashT:0, word:null, low:0 }, pop = ts.reduce((a, g) => a + popOf(g), 0);
  let target = glob;
  const trades = ts.reduce((a, g) => a + (g.trades || 0), 0); target += clamp((trades - (C.trades ?? trades)) / Math.max(4, pop * .05), -.2, .3); C.trades = trades;
  target += ts.some(g => facsOf(g).length) ? .1 : 0;
  if (atWarN(n)) target -= .35;
  const ecs = ts.map(ecOf), infl = Math.max(...ecs.map(e => e.infl || 0)), debt = ecs.reduce((a, e) => a + (e.debt || 0), 0) / Math.max(1, ecs.reduce((a, e) => a + (e.P || 1), 0));
  if (infl > .08) target -= Math.min(.5, infl * 2);
  if (debt > 60) target -= .15;
  if (ecs.some(e => e.bankruptT && yearT - e.bankruptT < DAY_LEN * 2)) target -= .6;
  if (ts.some(g => g.strike || (g.genStrike || 0) > yearT || (g.protest && g.grief))) target -= .1;
  if (hasLaw(n, 'estimulo') && C.v < -.2) { target += .3; for (const e of ecs) { e.treas -= 2 * (e.P || 1); } }
  if (hasLaw(n, 'austeridad')) { target -= .12; for (const e of ecs) if (e.debt > 0) e.debt *= .99; if (C.v < -.2) for (const g of ts) g.anger = Math.min(100, (g.anger || 0) + .8); }
  // La burbuja: varios días de auge seguidos inflan la bolsa; cuanto más dura, más fácil que reviente
  if (C.v > .6) C.boom++; else C.boom = Math.max(0, C.boom - 1);
  if (C.boom >= 6 && yearT > C.crashT && Math.random() < (C.boom - 5) * .06) { econCrash(n, C); return; }
  target += (Math.random() - .5) * .3;
  C.v = clamp(C.v + (target - C.v) * .25, -1, 1);
  C.hist.push(Math.round(C.v * 100) / 100); if (C.hist.length > 40) C.hist.shift();
  cycleNews(n, C);
}
const atWarN = n => [...rels.values()].some(r => r.war && (r.war.att === n.id || r.war.def === n.id));
function econCrash(n, C){
  C.v = -.85; C.boom = 0; C.crashT = yearT + DAY_LEN * 6; C.crashes = (C.crashes || 0) + 1;
  const s = typeof stockOf === 'function' && stockOf(n); if (s) s.price = Math.max(1, s.price * .55);
  const hit = econPartners(n); for (const o of hit) o.cycle.v = clamp(o.cycle.v - .4, -1, 1);
  world.crashes = (world.crashes || 0) + 1;
  notify(`💥 Crac bursátil en ${n.name}: la burbuja revienta, la bolsa se hunde y empieza una crisis${hit.length ? `. Arrastra a ${hit.map(o => o.name).join(', ')}` : ''}`, { x:n.fx * T, y:n.fy * T });
  if (typeof sendNews === 'function') sendNews(n, `Crac en la bolsa de ${n.name}`);
}
function cycleNews(n, C){
  const w = cycleWord(C.v); if (C.word === w[1]) return; const was = C.word; C.word = w[1];
  if (!was || (C.wordT || 0) > yearT) return; C.wordT = yearT + DAY_LEN;
  const at = { x:n.fx * T, y:n.fy * T };
  if (w[1] === 'recesión' && was !== 'depresión') notify(`📉 ${n.name} entra en recesión: cierran negocios y sube el paro`, at);
  else if (w[1] === 'depresión') notify(`🕳 La crisis de ${n.name} se convierte en depresión: colas para comer y fábricas cerradas`, at);
  else if (w[1] === 'expansión' && ['recesión', 'depresión', 'estancamiento'].includes(was)) notify(`📈 La economía de ${n.name} sale de la crisis: vuelven a contratar`, at);
  else if (w[1] === 'auge') notify(`🚀 ${n.name} vive un auge económico: sueldos al alza y la bolsa no para de subir`, at);
}
// ---- Paro: en crisis se despide; con la recuperación se vuelve a contratar ----
const isParado = v => !!(v.parado && v.parado.until > yearT);
function layoffTick(n){
  const C = n.cycle; if (!C) return;
  for (const g of natTowns(n)) {
    const ps = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H && !v.away);
    if (C.v < -.3) {
      const k = Math.max(0, Math.round(ps.length * (-C.v - .2) * .05)), pool = ps.filter(v => !isParado(v) && v !== g.leader && ['obrero', 'oficinista', 'comerciante', 'mercader', 'constructor'].includes(v.oficio));
      for (let i = 0; i < k && pool.length; i++) { const u = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; fireWorker(g, u, 'la crisis'); }
    } else if (C.v > .15) for (const u of ps) if (isParado(u) && u.parado.why === 'la crisis' && Math.random() < .35) u.parado.until = yearT;
    g.jobless = ps.filter(isParado).length;
  }
}
function fireWorker(g, u, why){
  for (const f of (typeof facsOf === 'function' ? facsOf(g) : [])) if (f.crew && f.crew.includes(pidOf(u))) { f.crew = f.crew.filter(p => p !== pidOf(u)); if (u.oficio === 'obrero') { u.oficio = u.oldOficio || 'recolector'; u.facI = null; } }
  u.fired = yearT; u.parado = { until:yearT + DAY_LEN * (1.5 + Math.random() * 2), why };
}
// Los parados cobran poco (chapuzas); en auge, algo más todos; en crisis, algo menos
{ const base = payMul; payMul = function(v, g){ const n = g && nationOf(g); return base.apply(this, arguments) * (1 + econPhase(n) * .12) * (isParado(v) ? (hasLaw(g, 'renta_basica') ? .5 : .25) : 1); }; }
{ const base = socialMood; socialMood = function(v, g, add){ base.apply(this, arguments); if (isParado(v)) add(hasLaw(g, 'renta_basica') ? -4 : -14, v.parado.why === 'los robots' ? 'una máquina le ha quitado el trabajo' : 'está en el paro'); else if (g && econPhase(nationOf(g)) < -.6) add(-5, 'le asusta la crisis'); }; }

let cycClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (cycClock -= dt) > 0) return; cycClock = DAY_LEN * .5;
  const glob = gcycleTick();
  for (const n of nationsAlive()) { cycleTick(n, glob); layoffTick(n); }
} catch (e) { console.error(e); } });

// ---- Fichas ----
function cycleSpark(h, w = 220, hh = 40){
  if (!h || h.length < 2) return '';
  const pts = h.map((v, i) => `${Math.round(i / (h.length - 1) * w)},${Math.round((1 - (v + 1) / 2) * hh)}`).join(' ');
  return `<svg class="cy-sp" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><line x1="0" x2="${w}" y1="${hh / 2}" y2="${hh / 2}" class="cy-0"/><polyline points="${pts}" class="cy-l"/></svg>`;
}
function cycleCard(n){
  const C = n.cycle; if (!C) return '';
  const w = cycleWord(C.v), ps = villagers.filter(v => !v.dead && ageOf(v) >= ADULT_H && nationOf(villageById(v.vid) || {}) === n), par = ps.filter(isParado).length;
  return `<h4>Ciclo económico</h4><div class="cy-row"><b class="cy-w">${w[2]} ${capFirst(w[1])}</b>${cycleSpark(C.hist)}</div>
    <div class="dp-k"><span>Paro</span><b>${par} (${Math.round(par / Math.max(1, ps.length) * 100)} %)</b>${C.boom >= 4 ? '<span>Bolsa</span><b>⚠ burbuja</b>' : ''}${C.crashes ? `<span>Cracs</span><b>${C.crashes}</b>` : ''}</div>`;
}
{ const base = instCard; instCard = function(g){ return base.apply(this, arguments) + (nationOf(g) === g ? cycleCard(g) : ''); }; }
{ const base = govEconomy; govEconomy = function(n){ return cycleCard(n) + base.apply(this, arguments); }; }
