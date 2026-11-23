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
