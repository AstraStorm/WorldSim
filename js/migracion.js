// World Sim · Migraciones entre naciones: por sueldos, libertades, guerra o paro; fuga de cerebros
// ================= Migración =================
// (vida.js ya tiene las huidas en masa por hambre, guerra, epidemia o falta de casas: esto es la migración de cada día)
// · Cada pueblo tiene un «atractivo» (migAppeal): cuánto llega el sueldo, si hay casa y comida, libertades, guerra, paro,
//   enfado, luz e internet. Si un pueblo de otra nación es bastante mejor y está a mano, de vez en cuando se van unos pocos
//   jóvenes (más con estudios si allí pagan mucho más: fuga de cerebros). Las fronteras cerradas los frenan (salvo
//   tratado de libre circulación); con fronteras abiertas o «atraer talento», llegan más.
// · Cada nación lleva la cuenta (n.mig {in, out, brain}) y su gente opina: unos lo ven bien, otros no (la ley y la
//   ideología del gobierno). En la ficha (Política → Migración) y en el panel de tu nación.
Object.assign(LAW_TXT, { atraer_talento:'atraer talento' });
Object.assign(LAW_DESC, { atraer_talento:'permisos rápidos y ayudas para científicos e ingenieros de fuera: llegan cerebros, y alguno se queda sin plaza' });
Object.assign(LAW_LEAN, { atraer_talento:.1 });
Object.assign(LAW_REQ, { atraer_talento:g => natAny(g, o => hasInst(o, 'universidad')) });
Object.assign(LAW_WHY, { atraer_talento:'ahora que hay universidad' });
{ const c = typeof LAW_CATS !== 'undefined' && LAW_CATS.find(c => c[0] === 'exterior'); if (c) c[3].push('atraer_talento'); }

const townAtWar = g => { const id = nationOf(g).id; return [...rels.values()].some(r => r.war && (r.war.att === id || r.war.def === id)); };
// Lo bien que se vive en un pueblo, visto desde fuera (0 ≈ mal, 1 ≈ normal, 2 ≈ muy bien)
function migAppeal(g){
  const c = g._ma; if (c && yearT - c.t < 20 && yearT >= c.t) return c.v;
  const pop = popOf(g); let a = 1;
  if (g.coin) { const ps = villagers.filter(v => !v.dead && v.vid === g.id && v.wage != null), w = ps.length ? ps.reduce((s, v) => s + v.wage, 0) / ps.length : 0; a += clamp(w / Math.max(1, costOfLiving(g)) - 1, -.6, .8) * .8; }
  else a -= .2;
  a += g.food >= pop * 2 ? .15 : g.food < pop * .6 ? -.4 : 0;
  a += houseCap(g) + 4 - pop >= 3 ? .15 : -.25;
  a -= (g.anger || 0) / 100 * .6;
  if (townAtWar(g)) a -= .6;
  if (hasLaw(g, 'derechos_humanos')) a += .15;
  if (hasLaw(g, 'persecucion') || hasLaw(g, 'segregacion') || hasLaw(g, 'persecucion_religiosa')) a -= .25;
  if (['dictadura', 'fascismo'].includes(regimeOf(g))) a -= .2;
  if (typeof powered === 'function' && powered(g)) a += .12;
  if (knowsSci(g, 'internet')) a += .08;
  if (hasHosp(g)) a += .06;
  a -= Math.min(.4, (g.jobless || 0) / Math.max(1, pop) * 2);           // paro (automatizacion.js)
  if (typeof econPhase === 'function') a += econPhase(nationOf(g)) * .25; // si su economía va bien o mal (economia.js)
  const v = clamp(a, 0, 2.2); g._ma = { t:yearT, v }; return v;
}
const borderShut = (from, to) => { if (typeof sameUnion === 'function' && sameUnion(from, to)) return false; /* libre circulación en una Unión (union.js) */ const r = rels.get(relKey(from, to)); return hasLaw(to, 'fronteras_cerradas') && !hasTreaty(r, 'circulacion'); };
function migTick(g, people){
  const pop = people.length; if (pop < 10 || (g.migT || 0) > yearT) return;
  g.migT = yearT + DAY_LEN * (.6 + Math.random() * .6);
  const here = migAppeal(g), n = nationOf(g); let best = null, bs = 0;
  for (const o of liveTowns()) {
    if (nationOf(o) === n || popOf(o) < 8 || borderShut(g, o)) continue;
    const r = rels.get(relKey(g, o)); if (!r || !r.known || r.war) continue;
    const d = Math.hypot(o.fx - g.fx, o.fy - g.fy); if (d > 170) continue;
    if (houseCap(o) + 4 - popOf(o) < 2) continue;
    const s = migAppeal(o) - here + (hasLaw(o, 'fronteras_abiertas') ? .15 : 0) + (hasTreaty(r, 'circulacion') ? .15 : 0) + (typeof sameUnion === 'function' && sameUnion(g, o) ? .2 : 0) - d / 600;
    if (s > bs) { bs = s; best = o; }
  }
  if (!best || bs < .45 || Math.random() > Math.min(.8, bs)) return;
  const talent = hasLaw(best, 'atraer_talento'), cands = people.filter(v => v !== g.leader && !v.away && !v.boat && !v.slave && ageOf(v) >= ADULT_H && ageOf(v) < ADULT_H + 6 && !v.compId && !v.ceo && !(v.task && ['asalto', 'viaje', 'golpe', 'detenido'].includes(v.task.k)));
  if (!cands.length) return;
  cands.sort((a, b) => (b.edu || 0) * (talent || bs > .8 ? 2 : .5) + Math.random() - ((a.edu || 0) * (talent || bs > .8 ? 2 : .5) + Math.random()));
  const k = Math.min(cands.length, 1 + (bs > .9 ? 2 : bs > .65 ? 1 : 0)), goers = cands.slice(0, k);
  for (const u of [...goers]) { const p = partnerOf(u); if (p && p.vid === g.id && !p.away && !goers.includes(p) && p !== g.leader) goers.push(p); }
  for (const u of goers) { u.migr = { from:n.name, d:Math.floor(yearT / DAY_LEN) + 1 }; exile(u, g, best); }
  const brains = goers.filter(u => (u.edu || 0) >= .5).length, to = nationOf(best);
  const M = n.mig ||= { in:0, out:0, brain:0, to:{} }, M2 = to.mig ||= { in:0, out:0, brain:0, to:{} };
  M.out += goers.length; M.brain += brains; M.to[to.name] = (M.to[to.name] || 0) + goers.length; M2.in += goers.length;
  const why = migWhy(g, best);
  const key = n.id + '>' + to.id, W0 = world.migMsg ||= {};
  if (!(W0[key] > yearT)) { W0[key] = yearT + DAY_LEN * 2;
    notify(`🧳 ${goers.length === 1 ? `${goers[0].name} emigra` : `${goers.length} personas emigran`} de ${g.name} a ${best.name} (${to.name}) ${why}${brains ? ` · ${brains === goers.length ? (goers.length > 1 ? 'todos con estudios: fuga de cerebros' : 'con estudios: fuga de cerebros') : `${brains} con estudios`}` : ''}`, { x:g.fx * T, y:g.fy * T }); }
}
function migWhy(a, b){
  if (townAtWar(a)) return 'huyendo de la guerra';
  if ((a.jobless || 0) > 2) return 'porque aquí no hay trabajo';
  if ((hasLaw(a, 'persecucion') || hasLaw(a, 'segregacion') || hasLaw(a, 'persecucion_religiosa')) && hasLaw(b, 'derechos_humanos')) return 'buscando libertad';
  if (a.coin && b.coin) return 'buscando un sueldo mejor';
  if (houseCap(a) + 4 - popOf(a) < 1) return 'porque aquí no encuentran casa';
  return 'buscando una vida mejor';
}
// Lo que piensa la gente del pueblo que recibe: unos lo celebran, otros no (según su ideología)
function migArrive(v, to){
  if (!v.migr) return; const right = (v2 => (v2.ideo || 0) > .35);
  const ps = villagers.filter(u => !u.dead && u.vid === to.id && ageOf(u) >= ADULT_H); if (ps.length < 6) return;
  const against = ps.filter(right).length / ps.length;
  if (against > .55 && !hasLaw(to, 'derechos_humanos')) to.anger = Math.min(100, (to.anger || 0) + .6);
}
{ const base = welcomeMigrant; welcomeMigrant = function(v, from, to){ const r = base.apply(this, arguments); try { if (to) migArrive(v, to); } catch (e) { console.error(e); } return r; }; }

let migClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (migClock -= dt) > 0) return; migClock = 4;
  const byV = new Map(); for (const v of villagers) if (!v.dead) { let L = byV.get(v.vid); if (!L) byV.set(v.vid, L = []); L.push(v); }
  for (const g of liveTowns()) { const ps = byV.get(g.id); if (ps) migTick(g, ps); }
} catch (e) { console.error(e); } });

// ---- Fichas ----
function migCard(n){
  const M = n.mig; if (!M || !(M.in + M.out)) return '';
  const tops = Object.entries(M.to || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return `<h4>Migración</h4><div class="dp-k"><span>Han llegado</span><b>${M.in}</b><span>Se han ido</span><b>${M.out}</b>${M.brain ? `<span>Con estudios (fuga de cerebros)</span><b>${M.brain}</b>` : ''}${tops.length ? `<span>Adónde van</span><b>${tops.map(([k, c]) => `${esc(k)} (${c})`).join(', ')}</b>` : ''}</div>`;
}
{ const base = councilCard; councilCard = function(g){ return base.apply(this, arguments) + migCard(nationOf(g)); }; }
{ const base = govSummary; govSummary = function(n){ const h = base.apply(this, arguments); return h.replace('<h4>Ciencia</h4>', migCard(n) + '<h4>Ciencia</h4>'); }; }
