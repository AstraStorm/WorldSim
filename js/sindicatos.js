// Forja de Mundos · Sindicatos y huelgas
// ================= Sindicatos =================
// · Donde hay sueldos (moneda) y bastante gente, los trabajadores fundan un sindicato; se afilian los que trabajan con
//   las manos y no son de derechas. En el fascismo y el comunismo solo hay el sindicato oficial (y no se hace huelga)
// · Si hay quejas por los sueldos, la jornada, los impuestos o la vivienda, el sindicato convoca huelga en un oficio
//   (leñadores, canteros, campesinos, pescadores, constructores…): los afiliados de ese oficio dejan de hacer su trabajo
//   (y ese recurso deja de entrar) y unos cuantos hacen piquete en la plaza. Los que no están afiliados siguen trabajando
// · El gobierno cede (más sueldo o más descanso) antes si falta lo que producen o si hay ley de derecho a huelga; con
//   ley que prohíbe las huelgas (o en una dictadura) la huelga es ilegal: la rompen y juzgan a los cabecillas
const SECTOR_JOBS = { 'leñador':['talar'], cantero:['picar', 'cantear', 'minar', 'cantera', 'extraer'], agricultor:['arar', 'sembrar', 'cosechar', 'campo'], pescador:['pescar', 'barca', 'caña'],
  constructor:['construir', 'ampliar', 'pozo', 'almacen', 'torre', 'muralla', 'puente'], recolector:['bayas'], cazador:['cazar'], pastor:['capturar', 'cercar'] };
const SECTOR_TXT = { 'leñador':'leñadores', cantero:'canteros', agricultor:'campesinos', pescador:'pescadores', constructor:'constructores', recolector:'recolectores', cazador:'cazadores', pastor:'pastores' };
const SECTOR_RES = { 'leñador':g => g.wood < 10, cantero:g => g.stone < 8, agricultor:g => g.food < popOf(g) * 2, pescador:g => g.food < popOf(g) * 2, constructor:g => houseCap(g) < popOf(g), recolector:g => g.food < popOf(g) * 2, cazador:g => g.food < popOf(g) * 2, pastor:() => false };
const unionMember = (u, g) => !!(g.union && SECTOR_JOBS[u.oficio] && (u.ideo || 0) < .3 && ageOf(u) >= ADULT_H);
const strikeIllegal = g => hasLaw(g, 'prohibir_huelgas') || tyranny(g) || regimeOf(g) === 'oligarquia';
// ¿Este trabajo lo deja por la huelga? (se llama desde chooseJob)
const onStrike = (v, g, k) => !!(g.strike && v.oficio === g.strike.oficio && unionMember(v, g) && SECTOR_JOBS[v.oficio].includes(k));
function unionTick(g, dt, people, adults){
  if ((g.unionT = (g.unionT || 0) - dt) > 0) return;
  g.unionT = 5; const el = 5, at = { x:g.fx * T, y:g.fy * T }, reg = regimeOf(g);
  const official = reg === 'fascismo' || reg === 'comunismo';
  // Fundar el sindicato
  if (!g.union && g.coin && adults.length >= 10 && Math.random() < el * (['salarios', 'jornada'].includes(g.grief) ? .02 : .002)) {
    g.union = { name:official ? `Sindicato Oficial de ${g.name}` : ['Sindicato de Trabajadores de ', 'Unión Obrera de ', 'Hermandad del Trabajo de ', 'Confederación del Trabajo de '][Math.floor(Math.random() * 4)] + g.name, since:yearT, official, wins:0, losses:0, log:[] };
    notify(official ? `En ${g.name} el régimen crea su sindicato oficial: el único permitido` : `Los trabajadores de ${g.name} fundan ${g.union.name}`, at);
  }
  const U = g.union; if (!U) return;
  if (official !== !!U.official) { U.official = official; U.name = official ? `Sindicato Oficial de ${g.name}` : U.name.replace('Sindicato Oficial de', 'Sindicato de Trabajadores de'); if (official) notify(`En ${g.name} el régimen disuelve los sindicatos libres: solo queda el oficial`, at); }
  const S = g.strike;
  if (!S) {
    // Convocar huelga en el oficio con más afiliados
    if (U.official || !['salarios', 'jornada', 'impuestos', 'vivienda'].includes(g.grief) || (g.anger || 0) < 35 || yearT - (U.lastStrike || -1e9) < DAY_LEN * 2 || Math.random() > el * .012) return;
    const by = {}; for (const u of adults) if (unionMember(u, g)) by[u.oficio] = (by[u.oficio] || 0) + 1;
    const [oficio, n] = Object.entries(by).sort((a, b) => b[1] - a[1])[0] || []; if (!oficio || n < 2) return;
    const demand = g.grief === 'jornada' ? 'jornada' : 'salarios';
    g.strike = { oficio, demand, n, start:yearT, until:yearT + DAY_LEN * 1.2, illegal:strikeIllegal(g) }; U.lastStrike = yearT;
    notify(`¡Huelga de ${SECTOR_TXT[oficio]} en ${g.name}! ${U.name} convoca a sus ${n} afiliados: piden ${demand === 'jornada' ? 'trabajar menos horas' : 'mejores sueldos'}${g.strike.illegal ? ' (la huelga es ilegal)' : ''}`, at);
    return;
  }
  // Durante la huelga: piquete en la plaza (unos pocos a la vez, por turnos)
  const strikers = adults.filter(u => u.oficio === S.oficio && unionMember(u, g) && !u.jail && !u.away);
  if (g.plaza && !g.protest) {
    const r0 = g.plaza, pts = [[r0.x0, r0.y0], [r0.x1, r0.y0], [r0.x1, r0.y1], [r0.x0, r0.y1]].map(([x, y]) => [x * T + 2, y * T + 3]);
    const slog = ['¡Huelga!', S.demand === 'jornada' ? '¡Menos horas!' : '¡Sueldos dignos!', '¡Unidos venceremos!', `¡${capFirst(SECTOR_TXT[S.oficio])} en lucha!`];
    for (const u of strikers.filter(u => !(u.task && BUSY_POL.includes(u.task.k)) && !(u.actT > 0)).slice(0, 5)) { releaseTask(u); u.sleep = false; u.task = { k:'protesta', pts, idx:Math.floor(Math.random() * 4), until:yearT + 20, slogan:slog[Math.floor(Math.random() * slog.length)], col:'#f0d060' }; u.lastD = Infinity; }
    const pk = strikers.find(u => u.task && u.task.k === 'protesta'); if (pk && Math.random() < .5) floats.push({ x:pk.x, y:pk.y - 16, txt:pk.task.slogan, col:'#f8f0d8', life:0 });
  }
  const end = (txt, won) => { g.strike = null; if (won) U.wins++; else U.losses++; U.log.push({ d:Math.floor(yearT / DAY_LEN) + 1, txt, won }); if (U.log.length > 6) U.log.shift(); notify(txt, at);
    for (const u of strikers) if (u.task && u.task.k === 'protesta' && u.task.col === '#f0d060') u.task = null; };
  // Ilegal: la rompen y los cabecillas, a juicio (o a la calle, sin tribunal)
  if (S.illegal && yearT - S.start > DAY_LEN * .25) {
    const heads = strikers.slice(0, 2); for (const u of heads) openTrial(g, u, 'huelga', .9);
    g.anger = Math.min(100, (g.anger || 0) + 8);
    end(`En ${g.name} rompen la huelga ilegal de los ${SECTOR_TXT[S.oficio]}${heads.length && hasCourt(g) ? `: ${heads.map(u => u.name).join(' y ')}, a juicio` : ''}`, false); return;
  }
  if (S.illegal) return; // una huelga ilegal no se negocia: se rompe
  // Negociación: cede antes si falta lo que producen, si hay derecho a huelga o si la huelga es muy seguida
  const short = SECTOR_RES[S.oficio](g), right = hasLaw(g, 'derecho_huelga'), share = strikers.length / Math.max(1, adults.filter(u => u.oficio === S.oficio).length);
  if (Math.random() < el * (.004 + (short ? .02 : 0) + (right ? .012 : 0)) * (.5 + share) * (hasInst(g, 'sindicato') ? 1.4 : 1)) {
    let what;
    if (S.demand === 'jornada' && restDaysOf(g) < 3) { g.restBonus = (g.restBonus || 0) + 1; what = `un día libre más a la semana (ahora, ${restDaysOf(g)})`; }
    else { g.wageUp = Math.min(2.5, (g.wageUp || 1) * 1.2); what = 'subir los sueldos un 20 %'; }
    g.anger = Math.max(0, (g.anger || 0) - 25);
    end(`Termina la huelga de los ${SECTOR_TXT[S.oficio]} de ${g.name}: consiguen ${what}`, true); return;
  }
  if (yearT > S.until) end(`Los ${SECTOR_TXT[S.oficio]} de ${g.name} vuelven al trabajo sin conseguir nada${right ? '' : ' (sin derecho a huelga, no les pagaban los días parados)'}`, false);
}
function unionCard(g){
  const U = g.union; if (!U) return g.coin ? `<h4>Sindicato</h4><div class="muted">Aún no hay sindicato</div>` : '';
  const members = villagers.filter(u => !u.dead && u.vid === g.id && unionMember(u, g)).length, S = g.strike;
  return `<h4>Sindicato</h4><div><b>${esc(U.name)}</b> · ${members} afiliados${U.official ? ' · oficial (no hay huelgas)' : ` · ${U.wins} huelgas ganadas, ${U.losses} perdidas`} · ${hasLaw(g, 'derecho_huelga') ? 'con derecho a huelga' : strikeIllegal(g) ? 'huelgas prohibidas' : 'huelgas toleradas'}</div>
    ${S ? `<div class="alert">En huelga: los ${SECTOR_TXT[S.oficio]} (piden ${S.demand === 'jornada' ? 'menos horas' : 'mejores sueldos'})${S.illegal ? ' · ilegal' : ''}</div>` : ''}
    ${U.log.length ? `<ul class="log">${U.log.slice().reverse().map(e => `<li class="${e.won ? 'pol' : 'war'}"><span class="d">día ${e.d}</span>${esc(e.txt.replace(` de ${g.name}`, '').replace(` en ${g.name}`, ''))}</li>`).join('')}</ul>` : ''}`;
}
