// World Sim · Más leyes y tratados
// ================= Leyes =================
// · Vacunación (con medicina y hospital): las epidemias brotan menos y se contagian menos
// · Patentes (con universidad): quien inventa cobra por ello y se investiga más deprisa
// · Escolarización obligatoria (con escuela): todos los niños van a clase; aprenden antes a leer y escribir
// · Edificación en altura (en la era industrial): los bloques de pisos pueden tener una planta más
// · Puerto franco (con muelle): sin aranceles en el puerto; llegan más barcos y el tesoro cobra por los amarres
// · Protección de la infancia: los niños no trabajan ni van a la guerra (y los padres están más contentos)
// ================= Tratados =================
// · Unión aduanera: los dos (con moneda) comercian sin aranceles: cada poco, algo más para los dos tesoros
// · Intercambio de estudiantes: los jóvenes estudian en el otro país: más saber y mejor relación
// · Tratado de aguas: comparten pozos y ríos: si uno pasa sed, el otro le manda agua (cántaros)
// · Patrulla naval conjunta (los dos con muelle): sus barcos vigilan juntos; los piratas se lo piensan más
Object.assign(LAW_TXT, { vacunacion:'vacunación', patentes:'patentes', escolarizacion:'escolarización obligatoria', edificacion_altura:'edificación en altura', puerto_franco:'puerto franco', proteccion_infancia:'protección de la infancia' });
Object.assign(LAW_DESC, { vacunacion:'las epidemias brotan menos y se contagian mucho menos', patentes:'quien inventa cobra por ello: se investiga más deprisa',
  escolarizacion:'todos los niños van a la escuela: aprenden antes y crecen más preparados', edificacion_altura:'los bloques de pisos pueden tener una planta más',
  puerto_franco:'sin aranceles en el puerto: llegan más barcos y el tesoro cobra los amarres', proteccion_infancia:'los niños no trabajan ni van a la guerra' });
Object.assign(LAW_LEAN, { vacunacion:-.3, patentes:.35, escolarizacion:-.45, edificacion_altura:.2, puerto_franco:.4, proteccion_infancia:-.4 });
Object.assign(LAW_REQ, {
  vacunacion:g => knowsSci(g, 'medicina') && natAny(g, o => hasHosp(o)), patentes:g => natAny(g, o => hasInst(o, 'universidad')),
  escolarizacion:g => natAny(g, o => hasSchool(o)), edificacion_altura:g => natAny(g, industrial), puerto_franco:g => natAny(g, o => !!o.port && !!o.coin),
});
Object.assign(LAW_WHY, { vacunacion:'ahora que hay hospital', patentes:'ahora que hay universidad', escolarizacion:'ahora que hay escuela', edificacion_altura:'ahora que hay industria', puerto_franco:'ahora que hay puerto' });
REGIME_LAWS.socialismo && REGIME_LAWS.socialismo.push('escolarizacion', 'proteccion_infancia');
// Efectos que van con el tiempo
{ const base = lawsTick; lawsTick = function(g, dt, people){
  const due = (g.lawsT ?? 0) - dt <= 0; base.apply(this, arguments); if (!due) return;
  const at = { x:g.fx * T, y:g.fy * T }, ec = ecOf(g), kids = people.filter(u => ageOf(u) < ADULT_H);
  if (hasLaw(g, 'escolarizacion') && hasSchool(g)) for (const u of kids) u.edu = Math.min(1, (u.edu || 0) + .02);
  if (hasLaw(g, 'proteccion_infancia')) { for (const u of kids) if (u.weapon) u.weapon = null; g.anger = Math.max(0, (g.anger || 0) - .05); }
  if (hasLaw(g, 'puerto_franco') && g.port && ec) { ec.treas += 1 + (g.bigPort && g.bigPort.done ? 2 : 0); if (!g.francoMsg) { g.francoMsg = true; notify(`El puerto de ${g.name} es ahora puerto franco: sin aranceles, llegan más barcos`, at); } }
}; }
// Patentes: se investiga más deprisa
{ const base = research; research = function(g, pts){ return base.call(this, g, hasLaw(g, 'patentes') ? pts * 1.2 : pts); }; }
// ---- Tratados nuevos ----
Object.assign(TREATY, {
  aduana:{ n:'tratado de unión aduanera', days:[6, 10], icon:'🛃' },
  estudiantes:{ n:'acuerdo de intercambio de estudiantes', days:[5, 9], icon:'🎓' },
  aguas:{ n:'tratado de aguas compartidas', days:[6, 10], icon:'💧' },
  naval:{ n:'acuerdo de patrulla naval conjunta', days:[6, 10], icon:'⚓' },
});
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments);
  if (!r.known || r.war) return;
  const ts = treatiesOf(r), has = k => ts.some(t => t.k === k);
  // Sus efectos
  if (has('aduana')) { for (const g of [a, b]) { const ec = ecOf(g); if (ec) ec.treas += .3; } r.v = Math.min(100, r.v + .1); }
  if (has('estudiantes')) { r.v = Math.min(100, r.v + .15); for (const g of [a, b]) for (const u of villagers) if (!u.dead && u.vid === g.id && ageOf(u) < ADULT_H * 1.5 && Math.random() < .05) u.edu = Math.min(1, (u.edu || 0) + .03); }
  if (has('aguas')) { r.v = Math.min(100, r.v + .1); for (const [x, y] of [[a, b], [b, a]]) if (typeof sedNow === 'function' && sedNow(x) && (y.jars || 0) > 4) { const n = Math.min(4, y.jars - 4); y.jars -= n; x.jars = (x.jars || 0) + n; } }
  if (has('naval')) { r.v = Math.min(100, r.v + .1); for (const g of [a, b]) g.piracyGuard = yearT + DAY_LEN; }
  // Firmarlos (de vez en cuando, si tiene sentido)
  if (Math.random() > .5) return;
  if (!has('aduana') && r.v > 30 && a.coin && b.coin && hasTreaty(r, 'comercio') && Math.random() < .04) signTreaty(a, b, r, 'aduana');
  else if (!has('estudiantes') && r.v > 30 && hasSchool(a) && hasSchool(b) && Math.random() < .04) signTreaty(a, b, r, 'estudiantes');
  else if (!has('aguas') && r.v > 20 && Math.hypot(a.fx - b.fx, a.fy - b.fy) < 90 && ((typeof sedNow === 'function' && (sedNow(a) || sedNow(b))) || Math.random() < .2) && Math.random() < .04) signTreaty(a, b, r, 'aguas');
  else if (!has('naval') && r.v > 35 && a.port && b.port && Math.random() < .04) signTreaty(a, b, r, 'naval');
}; }
