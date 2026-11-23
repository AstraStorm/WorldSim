// Forja de Mundos · Defensa: murallas antes y más deprisa, puertas que se cierran, y la ley de fortificación
// ================= Defensa =================
// · Las murallas se empiezan antes (con 8 habitantes, aunque aún no haya ayuntamiento) y con más gente
// · Tras un ataque, el pueblo se vuelca en ellas (más constructores, más prisa) durante unos días, y donde hay
//   partidos el gobierno aprueba la ley de «fortificación»; las dictaduras ya la llevan
// · Con la ley, cada tramo levanta el doble de muralla y cuesta la mitad
// · Las puertas se cierran de noche, con la alarma o en guerra (y con fronteras cerradas); cada lado de la muralla tiene
//   una puerta en el centro aunque no pase camino, para que nadie quede encerrado sin salida a sus campos
const fortified = g => hasLaw(g, 'fortificacion');
const underThreat = g => yearT - (g.attackedT ?? -1e9) < DAY_LEN * 3 || !!(g.alarm && g.alarm.until > yearT) || (g.danger || 0) > 0;
// Cuántos se ponen a la muralla y con qué ganas (se llama desde chooseJob)
function wallJob(g, pop, needHouse, atWar){
  if (pop < 8 || wallLeft(g) <= 0 || !(g.wood >= (needHouse && !underThreat(g) ? 8 : 2) || g.stone >= 10)) return 0;
  const threat = underThreat(g) || atWar, cap = threat ? 4 : fortified(g) ? 3 : 2;
  if (busyWith(g, 'muralla') >= cap) return 0;
  return threat ? 14 : fortified(g) ? 9 : g.hall != null ? 5 : 3;
}
// El pueblo ha crecido más allá de su muralla (casas fuera o encima de la línea): se derriba (devuelve algo de madera)
// y se planea una nueva alrededor de todo, para que no queden tramos sueltos cruzando el pueblo
function wallGrow(g){
  if (!g.wallRect || !popOf(g)) return;
  if (g.wallRing === 2 && !g.wallPlan1) g.wallPlan1 = []; // (partidas de antes: no se guardaba cuál era la de dentro)
  // Piezas sueltas de planes viejos (o de pueblos que ya no están) que no forman parte de ninguna muralla: fuera
  const ring = new Set(villages.filter(o => popOf(o)).flatMap(o => [...(o.wallPlan || []), ...(o.wallPlan1 || [])]));
  for (const i of [...wallSet, ...gateSet]) if (!ring.has(i)) { wallSet.delete(i); wallStone.delete(i); gateSet.delete(i); gateOwner.delete(i); }
  // ¿El pueblo se ha salido de la muralla, o la muralla es mucho más grande de lo que hace falta?
  const R = g.wallRect, m = g.wallRing === 2 ? 8 : 3; let x0 = g.fx - 4, y0 = g.fy - 3, x1 = g.fx + 4, y1 = g.fy + 4;
  for (const h of coreBuildings(g)) { const x = h % W, y = (h / W) | 0; x0 = Math.min(x0, x - 5); x1 = Math.max(x1, x + 5); y0 = Math.min(y0, y - 7); y1 = Math.max(y1, y + 2); }
  const out = x0 < R.x0 || x1 > R.x1 || y0 < R.y0 || y1 > R.y1, big = (R.x1 - R.x0) * (R.y1 - R.y0) > 2 * (x1 - x0 + 2 * m + 4) * (y1 - y0 + 2 * m + 4);
  if (!out && !big) return;
  // Se derriba (las dos, si hay doble) y se vuelve a empezar por la de dentro, a la medida del pueblo
  let n = 0;
  for (const i of [...(g.wallPlan || []), ...(g.wallPlan1 || [])]) { if (wallSet.has(i)) { wallSet.delete(i); wallStone.delete(i); n++; } if (gateOwner.get(i) === g.id) { gateSet.delete(i); gateOwner.delete(i); } }
  g.wallRing = 1; g.wallPlan1 = null; g.wallPlan = null; g.wallMsg = g.wall2Msg = false; wallPlan(g); g.wood += Math.round(n * .3);
  if (n > 6) notify(out ? `${g.name} ha crecido más allá de su muralla: la derriban y empiezan otra más grande` : `En ${g.name} rehacen la muralla, más ceñida al pueblo`, { x:g.fx * T, y:g.fy * T });
}
// Lo que levanta cada tramo y lo que cuesta
const wallStretch = g => fortified(g) ? 20 : underThreat(g) ? 14 : 10;
const wallCost = g => fortified(g) ? .5 : 1;
// Tras un ataque (desde misfortune): prisa por amurallarse y, donde se vota, ley de fortificación
function onAttacked(g){
  const first = yearT - (g.attackedT ?? -1e9) > DAY_LEN * 3; g.attackedT = yearT;
  if (!first || !popOf(g)) return;
  const at = { x:g.fx * T, y:g.fy * T };
  if (wallLeft(g) > 0) notify(`Tras el ataque, en ${g.name} todos se ponen a levantar la muralla`, at);
  const n = nationOf(g), P = n.parties && n.ruling != null ? n.parties[n.ruling] : null;
  if (P && !P.laws.includes('fortificacion') && Math.random() < .6) {
    P.laws.push('fortificacion'); if (P.laws.length > 6) P.laws.splice(0, 1);
    const txt = `Tras el ataque a ${g.name}, ${artP(P)} ${P.name} aprueba la ley de «${LAW_TXT.fortificacion}»: murallas más rápidas y baratas`; lawLog(n, txt); notify(txt, at);
  }
}
// ¿Está cerrada la puerta de este pueblo?
const gateShut = g => !!g && (hasLaw(g, 'fronteras_cerradas') || isNight() || !!(g.alarm && g.alarm.until > yearT) || [...rels.values()].some(r => r.war && [r.war.att, r.war.def].includes(nationOf(g).id)));
// ¿Esta casilla de la muralla es el centro de un lado? (ahí va una puerta)
function midGate(g, i){
  const R = g.wallRect; if (!R) return false;
  const x = i % W, y = (i / W) | 0, mx = Math.round((R.x0 + R.x1) / 2), my = Math.round((R.y0 + R.y1) / 2);
  return ((y === R.y0 || y === R.y1) && x === mx) || ((x === R.x0 || x === R.x1) && y === my);
}
