// World Sim · Automatización: robots en las fábricas, inteligencia artificial en las oficinas
// ================= Automatización =================
// · Ciencia: «la robótica» (ordenadores + chips) y «la inteligencia artificial» (robótica + internet).
// · Con robótica y corriente, las fábricas se robotizan poco a poco (f.robot 1-2, cuesta hierro): producen más (+40 % por
//   nivel) con menos obreros; los que sobran van al paro (v.parado, «los robots»). Con IA, las empresas también: dos
//   puestos menos y un 25 % más de ingresos (c.ai).
// · La gente se lo toma mal donde no hay renta básica: sube el enfado, aparece la queja «automatización» y, si el paro es
//   alto, surge un movimiento contra las máquinas (y ganas de votar la renta básica o el impuesto a los robots).
// · Leyes: «impuesto a los robots» (cada robot paga al tesoro; se robotiza más despacio) y «moratoria de la IA»
//   (las empresas no usan IA). La renta básica (leyes.js) es la otra respuesta.
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i < 0 ? DISCOVERIES.length : i + 1, 0, { ...d, req:d.req.filter(k => DISCOVERIES.some(x => x.k === k)) }); if (typeof SCI_REQ === 'object') SCI_REQ[d.k] = d.req; };
  add('ordenadores', { k:'robotica', txt:'la robótica', cost:200, eff:'robots en las fábricas: producen más con menos obreros (y algunos se quedan sin trabajo)', req:['ordenadores', 'chips'] });
  add('internet', { k:'ia', txt:'la inteligencia artificial', cost:240, eff:'las máquinas aprenden: más ciencia, oficinas con menos gente… y un gran debate', req:['robotica', 'internet'] });
})();
Object.assign(LAW_TXT, { impuesto_robots:'impuesto a los robots', moratoria_ia:'moratoria de la IA' });
Object.assign(LAW_DESC, { impuesto_robots:'cada robot paga impuestos como un obrero: dinero para el tesoro, y se robotiza más despacio',
  moratoria_ia:'las empresas no pueden sustituir empleados por inteligencia artificial: menos paro, menos beneficios' });
Object.assign(LAW_LEAN, { impuesto_robots:-.45, moratoria_ia:-.2 });
Object.assign(LAW_REQ, { impuesto_robots:g => knowsSci(g, 'robotica'), moratoria_ia:g => knowsSci(g, 'ia') });
Object.assign(LAW_WHY, { impuesto_robots:'ahora que hay robots', moratoria_ia:'ahora que hay inteligencia artificial' });
{ const c = typeof LAW_CATS !== 'undefined' && LAW_CATS.find(c => c[0] === 'natura'); if (c) c[3].push('impuesto_robots', 'moratoria_ia'); }
SLOGANS.automatizacion = ['¡Personas, no máquinas!', '¡Trabajo para todos!', '¡Que paguen los robots!'];
GRIEF_TXT.automatizacion = 'los robots que quitan trabajo';

const robotsOf = g => facsOf(g).reduce((a, f) => a + (f.robot || 0), 0);
function autoTick(g, people){
  const at = { x:g.fx * T, y:g.fy * T }, n = nationOf(g);
  // Fábricas: una más robotizada cada cierto tiempo (si hay luz y hierro)
  if (knowsSci(g, 'robotica') && (typeof powered !== 'function' || powered(g)) && (g.robotT || 0) < yearT) {
    g.robotT = yearT + DAY_LEN * (hasLaw(g, 'impuesto_robots') ? 2.5 : 1.2) * (.7 + Math.random() * .6);
    const f = facsOf(g).filter(f => (f.robot || 0) < 2).sort((a, b) => (a.robot || 0) - (b.robot || 0))[0];
    if (f && (g.iron || 0) >= 3) {
      g.iron -= 3; f.robot = (f.robot || 0) + 1;
      const byPid = typeof peopleByPid === 'function' ? peopleByPid(g) : null, over = Math.max(0, f.crew.length - (facSlots(g) - f.robot)), out = [];
      for (let k = 0; k < over; k++) { const pid = f.crew[f.crew.length - 1], u = byPid && byPid.get(pid); f.crew.pop(); if (u) { u.oficio = u.oldOficio || 'recolector'; u.facI = null; u.fired = yearT; u.parado = { until:yearT + DAY_LEN * (2 + Math.random() * 2), why:'los robots' }; out.push(u); } }
      n.robots = (n.robots || 0) + 1;
      notify(`🤖 ${FACS[f.k].name} de ${g.name} instala robots${f.robot > 1 ? ' (segunda tanda)' : ''}: produce más${out.length ? `, pero ${out.length} obrero${out.length > 1 ? 's se quedan' : ' se queda'} sin trabajo` : ''}`, at);
      if (out.length && !hasLaw(g, 'renta_basica')) g.anger = Math.min(100, (g.anger || 0) + out.length * 2);
    }
  }
  // Oficinas: la IA sustituye a parte de la plantilla
  if (knowsSci(g, 'ia') && !hasLaw(g, 'moratoria_ia')) for (const c of (g.comps || [])) {
    if (c.ai || Math.random() > .15) continue; c.ai = true;
    const out = (c.staff || []).slice(-2).filter(u => u && !u.dead);
    for (const u of out) { c.staff = c.staff.filter(x => x !== u); u.compId = null; u.oficio = u.oldOficio || 'recolector'; u.fired = yearT; u.parado = { until:yearT + DAY_LEN * (2 + Math.random() * 2), why:'los robots' }; }
    notify(`🧠 «${c.name}» de ${g.name} empieza a usar inteligencia artificial${out.length ? `: ${out.length} empleado${out.length > 1 ? 's' : ''} a la calle` : ''}`, at);
  }
  if (hasLaw(g, 'moratoria_ia')) for (const c of (g.comps || [])) c.ai = false;
  // Impuesto a los robots
  const R = robotsOf(g); if (R && hasLaw(g, 'impuesto_robots') && g.coin) ecOf(g).treas += R * .3 * (ecOf(g).P || 1);
  // El enfado: paro por las máquinas sin renta básica
  const fired = people.filter(u => u.parado && u.parado.until > yearT && u.parado.why === 'los robots').length;
  if (fired >= 2 && !hasLaw(g, 'renta_basica')) { g.anger = Math.min(100, (g.anger || 0) + fired * .15); if ((g.anger || 0) > 30 && (!g.grief || Math.random() < .3)) g.grief = 'automatizacion'; }
  // La IA también investiga
  if (knowsSci(g, 'ia') && typeof research === 'function' && hasInst(g, 'universidad')) research(g, .3);
}
let autoClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (autoClock -= dt) > 0) return; autoClock = 6;
  const byV = new Map(); for (const v of villagers) if (!v.dead) { let L = byV.get(v.vid); if (!L) byV.set(v.vid, L = []); L.push(v); }
  for (const g of liveTowns()) if (knowsSci(g, 'robotica')) autoTick(g, byV.get(g.id) || []);
} catch (e) { console.error(e); } });
// En la ficha de la fábrica: cuántos robots
{ const base = factoryCard; factoryCard = function(g){ const h = base.apply(this, arguments), R = robotsOf(g); return R ? h + `<div class="muted">🤖 ${R} tanda${R > 1 ? 's' : ''} de robots en sus fábricas${hasLaw(g, 'impuesto_robots') ? ' (pagan impuesto)' : ''}</div>` : h; }; }
