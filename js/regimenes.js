// Forja de Mundos · Más formas de gobierno: oligarquía, tecnocracia y anarquía, y la corona de la monarquía parlamentaria
// ================= Regímenes =================
// · Oligarquía: donde el dinero se acumula en pocas manos (con moneda y banco), las familias más ricas compran el
//   gobierno; manda la persona más rica y, si muere, la siguiente. Se acaba si el pueblo protesta por los sueldos o la vivienda
// · Tecnocracia: en plena crisis (presupuestos, bancarrota, corrupción, precios) y con gente instruida, un gobierno
//   de expertos toma el mando durante un tiempo; luego vuelven las elecciones
// · Anarquía: tras linchar a quien mandaba, a veces nadie ocupa su sitio y todo se decide en asambleas; al cabo de un
//   tiempo se organizan (república o socialismo, según lo que piense la mayoría)
// · Monarquía parlamentaria: gobierna el parlamento, pero hay rey o reina; si muere sin herederos, se quedan sin corona
// (la democracia parlamentaria, la partitocracia y la monarquía parlamentaria votan: ver countVotes en sociedad.js)
const NEW_REG = ['republica', 'democracia', 'partitocracia'];
function regimeTick(g, dt, people, adults){
  if (nationOf(g) !== g) return;
  const reg = regimeOf(g), at = { x:g.fx * T, y:g.fy * T };
  if (reg === 'monarquia_parlamentaria' && g.monarch && g.monarch.dead) {
    const old = g.monarch, heir = people.filter(u => ageOf(u) >= ADULT_H && (u.parents || []).includes(old)).sort((a, b) => a.born - b.born)[0], tt = old.sex === 'm' ? 'la reina' : 'el rey';
    g.monarch = heir || null;
    if (heir) notify(`Muere ${tt} ${old.name} de ${g.name}; ${heir.name} hereda la corona (el parlamento sigue gobernando)`, at);
    else { notify(`Muere ${tt} ${old.name} de ${g.name} sin herederos: se quedan sin corona y pasan a ser una democracia parlamentaria`, at); setRegime(g, 'democracia', null); }
    return;
  }
  if ((g.regTickT = (g.regTickT || 0) - dt) > 0) return;
  g.regTickT = 5; const el = 5;
  if (NEW_REG.includes(reg) && g.coin && hasBank(g) && adults.length >= 10) {
    const m = adults.map(u => u.money || 0).sort((a, b) => b - a), tot = m.reduce((a, b) => a + b, 0), top = m.slice(0, Math.max(1, Math.ceil(m.length * .1))).reduce((a, b) => a + b, 0);
    if (tot > 50 && top / tot > .6 && Math.random() < el * .002) {
      const rich = adults.slice().sort((a, b) => (b.money || 0) - (a.money || 0))[0];
      setRegime(g, 'oligarquia', rich);
      notify(`En ${g.name} unos pocos tienen el ${Math.round(top / tot * 100)} % del dinero: las familias más ricas compran el gobierno y nace una oligarquía con ${rich.name} al frente`, at);
      return;
    }
  }
  if (NEW_REG.includes(reg) && hasSchool(g) && adults.length >= 10 && ['presupuestos', 'bancarrota', 'corrupción', 'inflación'].includes(g.grief) && (g.anger || 0) > 55) {
    const edu = adults.reduce((a, u) => a + (u.edu || 0), 0) / adults.length;
    if (edu > .3 && Math.random() < el * .004) {
      const sage = adults.slice().sort((a, b) => (b.edu || 0) - (a.edu || 0))[0];
      setRegime(g, 'tecnocracia', sage); g.techUntil = yearT + YEAR * 1.5;
      notify(`Ante la crisis, en ${g.name} se forma un gobierno de expertos: nace una tecnocracia con ${sage.name} al frente, hasta nuevas elecciones`, at);
      return;
    }
  }
  if (reg === 'tecnocracia' && yearT > (g.techUntil || 0)) { setRegime(g, 'democracia', null); notify(`Se acaba el gobierno de expertos de ${g.name}: vuelven las elecciones, ahora como democracia parlamentaria`, at); return; }
  if (reg === 'anarquia' && yearT - (g.regimeT || 0) > DAY_LEN * 4 && Math.random() < el * .01) {
    const nr = adults.reduce((a, u) => a + (u.ideo || 0), 0) / Math.max(1, adults.length) < -.3 ? 'socialismo' : 'republica';
    setRegime(g, nr, null); notify(`Tras un tiempo sin gobierno, las asambleas de ${g.name} acuerdan formar ${REGIME_A[nr]}`, at);
  }
}
// Quién sucede a quien manda en los regímenes nuevos (true si se ha encargado)
function regimeSuccession(g, people){
  const reg = regimeOf(g), old = g.leader, adult = u => { const a = ageOf(u); return a >= ADULT_H && a < u.life * .9; };
  if (reg === 'oligarquia') {
    const nu = people.filter(adult).sort((a, b) => (b.money || 0) - (a.money || 0))[0]; if (!nu) return true;
    g.leader = nu; notify(`Muere ${old.name}; la familia más rica de ${g.name} pone al frente a ${nu.name}`, { x:nu.x, y:nu.y }); return true;
  }
  if (reg === 'tecnocracia') {
    const nu = people.filter(adult).sort((a, b) => (b.edu || 0) - (a.edu || 0))[0]; if (!nu) return true;
    g.leader = nu; notify(`Muere ${old.name}; los expertos de ${g.name} eligen a ${nu.name}`, { x:nu.x, y:nu.y }); return true;
  }
  return reg === 'anarquia'; // en la anarquía no hay a quién suceder
}
// Al ceder a las protestas en una oligarquía: por los sueldos o la vivienda, vuelve la democracia
function oligarchyConcede(g){
  if (regimeOf(g) !== 'oligarquia' || !['salarios', 'vivienda', 'tiranía', 'ideas'].includes(g.grief)) return null;
  setRegime(g, 'democracia', null); return 'los ricos pierden el poder y se convocan elecciones: vuelve la democracia parlamentaria';
}
