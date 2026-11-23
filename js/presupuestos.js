// Forja de Mundos · Presupuestos: en qué se gasta el dinero público, obras que cuestan dinero, corrupción, ciudades
// amenazadas y líderes linchados (o sacrificados) por el pueblo
// ================= Presupuestos =================
// Lo que gasta el gobierno se reparte en partidas según el régimen y las leyes. Donde se vota, los presupuestos se
// votan cada dos días: si no salen, se prorrogan (con la mitad para obras) y la gente se queja. Las obras públicas,
// además de material, cuestan dinero del fondo de obras. Un líder codicioso se queda una parte; si se descubre hay
// escándalo, y un tirano descubierto puede amenazar a la ciudad. Si el pueblo se harta, lo lincha o lo sacrifica.
const BUDGET_TXT = { admin:'Administración', obras:'Obras públicas', sanidad:'Sanidad', educacion:'Escuelas', ejercito:'Ejército', reparto:'Reparto de comida', templos:'Templos', corona:'Corona y propaganda' };
// Lo que cuesta cada obra pública, en comidas de dinero (además del material)
const WORKS = { ayuntamiento:20, hospital:30, escuela:25, teatro:30, coliseo:40, cuartel:25, catedral:50, banco:30, mercado:15, lonja:25, herreria:20, pozo:5, molino:10, muralla:20, puente:10, torre:8, almacen:8, maravilla:80, templo:20, monumento:25, construir:6 };
const workCost = (g, k) => { if (!(k in WORKS) || (k === 'construir' && !(housingOn(g) && (hasLaw(g, 'vivienda_publica') || hasLaw(g, 'estatal'))))) return 0; return Math.round(WORKS[k] * priceOf(g)); };
const budgetOn = g => !!(g.coin && g.budget);
// ¿Hay dinero en el fondo de obras para esta obra? (sin moneda, se construye solo con material)
const worksOk = (g, k) => !budgetOn(g) || !workCost(g, k) || (g.works || 0) >= workCost(g, k);
function chargeWork(g, k){
  const c = budgetOn(g) ? workCost(g, k) : 0; if (!c) return;
  g.works = (g.works || 0) - c;
}
const budgetLeader = g => { const L = g.leader && !g.leader.dead ? g.leader : nationOf(g).leader; return L && !L.dead ? L : null; };
// Reparto del gasto en partidas según régimen, leyes y guerra
function budgetShares(g, atWar){
  const reg = regimeOf(g), s = { admin:.45, obras:.2 + (hasLaw(g, 'obras') ? .25 : 0) + (hasLaw(g, 'vivienda_publica') ? .2 : 0) };
  if (hasLaw(g, 'sanidad') || hasHosp(g)) s.sanidad = (hasLaw(g, 'sanidad') ? .2 : 0) + (hasHosp(g) ? .04 : 0);
  if (hasLaw(g, 'educacion') || hasSchool(g)) s.educacion = (hasLaw(g, 'educacion') ? .15 : 0) + (hasSchool(g) ? .04 : 0);
  if (hasLaw(g, 'ejercito') || atWar || hasBarracks(g)) s.ejercito = (hasLaw(g, 'ejercito') ? .3 : 0) + (atWar ? .6 : 0) + (hasBarracks(g) ? .05 : 0);
  if (hasLaw(g, 'reparto')) s.reparto = .15;
  if (reg === 'teocracia' || hasLaw(g, 'fe')) s.templos = (reg === 'teocracia' ? .15 : 0) + (hasLaw(g, 'fe') ? .05 : 0);
  if (reg === 'monarquia' || reg === 'fascismo') s.corona = reg === 'monarquia' ? .15 : .2;
  return s;
}
// Cada cobro: el gasto se reparte en partidas (y el líder corrupto se queda su parte). Devuelve lo gastado
function budgetTick(g, ec, people, spend0){
  const atWar = [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id));
  const b = g.budget ||= { d:Math.floor(yearT / DAY_LEN) + 1, how:votes(g) ? 'votados' : 'decreto', spent:{}, last:{}, shares:budgetShares(g, atWar) };
  if (!b.vote) b.shares = budgetShares(g, atWar); // por decreto se ajustan solos; los votados quedan fijos hasta la próxima votación
  const sh = { ...b.shares }; if (b.how === 'prorrogados') sh.obras = (sh.obras || 0) * .5; if (b.how === 'sin') for (const k in sh) if (k !== 'admin') sh[k] = 0;
  const tot = Object.values(sh).reduce((a, x) => a + x, 0) || 1, spend = b.how === 'sin' ? spend0 * sh.admin / tot : spend0;
  // Corrupción: el líder codicioso desvía una parte del dinero de las partidas
  const L = budgetLeader(g); let stolen = 0;
  if (L) { L.greed ??= Math.random() ** 2; if (L.greed > .45) stolen = spend * (L.greed - .45) * (tyranny(g) ? .6 : .3) * (hasLaw(g, 'censura') ? 1.4 : 1); }
  for (const [k, x] of Object.entries(sh)) { const amt = (spend - stolen) * x / tot; if (k === 'obras') g.works = (g.works || 0) + amt; b.spent[k] = (b.spent[k] || 0) + amt; } // lo de obras va al fondo de obras
  if (stolen > 0) { L.money = (L.money || 0) + Math.round(stolen); g.stolen = (g.stolen || 0) + stolen; b.spent.desvio = (b.spent.desvio || 0) + stolen; }
  budgetDay(g, ec, people, L);
  return spend;
}
// Una vez al día: cierre de cuentas, votación de los presupuestos, escándalos y amenazas
function budgetDay(g, ec, people, L){
  const day = Math.floor(yearT / DAY_LEN), b = g.budget, at = { x:g.fx * T, y:g.fy * T }, P = ec.P; if (b.day === day) return;
  if (b.day != null) { b.last = b.spent; b.spent = {}; }
  b.day = day;
  // Votación cada 2 días donde se vota; si no sale, prorrogados (y si nunca hubo, sin presupuestos)
  if (votes(g) && day - (b.voteD ?? -9) >= 2) {
    const cap = nationOf(g), sup = (cap.voteRes && cap.ruling != null ? cap.voteRes[cap.ruling] : 50) + (Math.random() - .5) * 30 - (g.anger || 0) * .15;
    b.voteD = day; b.vote = true; b.support = Math.round(clamp(sup, 0, 100));
    if (sup >= 50) { b.how = 'votados'; b.shares = budgetShares(g, [...rels.values()].some(r => r.war && (r.war.att === g.id || r.war.def === g.id))); b.d = day + 1; g.noBudgetDays = 0; }
    else { b.how = b.d ? 'prorrogados' : 'sin'; g.noBudgetDays = (g.noBudgetDays || 0) + 1;
      notify(`En ${g.name} no salen los presupuestos (${b.support} % a favor): ${b.how === 'prorrogados' ? 'se prorrogan los de antes, con la mitad para obras' : 'el gobierno solo puede pagar la administración'}`, at); }
  } else if (!votes(g)) { b.how = 'decreto'; b.vote = false; g.noBudgetDays = 0; }
  // Escándalo: el desvío se puede descubrir (más fácil donde se vota y hay escuelas; difícil con censura)
  if (L && (g.stolen || 0) > 5 * P && Math.random() < (votes(g) ? .2 : .06) * (hasLaw(g, 'censura') ? .4 : 1) * (hasSchool(g) ? 1.3 : 1)) {
    const amt = Math.round(g.stolen); g.stolen = 0;
    g.scandal = { who:L.name, amt, t:yearT, d:day + 1 }; g.anger = Math.min(100, (g.anger || 0) + 25); g.scandals = (g.scandals || 0) + 1;
    notify(`¡Escándalo en ${g.name}! Se descubre que ${L.name} se ha quedado ${amt} ${coinPl(g)} del dinero público`, at);
    if (votes(g) && Math.random() < .5) { // dimite y hay elecciones
      if (g.leader === L) g.leader = null; const cap = nationOf(g); if (cap.leader === L) cap.leader = null; cap.voteT = -1e9;
      setTimeout(() => notify(`${L.name} dimite por el escándalo; ${g.name} convoca elecciones`, at), 500);
    } else if (tyranny(g) && Math.random() < .6) { // el tirano no se va: amenaza a la ciudad
      g.threat = { by:L.name, until:yearT + DAY_LEN * 3 };
      setTimeout(() => notify(`${L.name} amenaza a ${g.name}: sus soldados vigilan las calles, cobran «protección» y quien proteste lo pagará`, at), 500);
    }
  }
  // Ciudad amenazada: cada día, «protección» para el líder; se acaba con el tiempo o si el líder cae
  if (g.threat) {
    if (yearT > g.threat.until || !L || L.name !== g.threat.by) { g.threat = null; notify(`${g.name} ya no vive amenazada`, at); }
    else for (const u of people) if (ageOf(u) >= ADULT_H && u !== L) { const n = Math.floor((u.money || 0) * .1); if (n > 0) { u.money -= n; L.money = (L.money || 0) + n; } }
  }
}
// Malestar por los presupuestos y por la corrupción
const budgetGrief = g => budgetOn(g) && (g.budget.how === 'prorrogados' || g.budget.how === 'sin') ? Math.min(.6, .15 + (g.noBudgetDays || 0) * .08) : 0;
const corruptGrief = g => g.scandal && yearT - g.scandal.t < DAY_LEN * 3 ? .7 : 0;
// Con la ciudad amenazada, casi nadie se atreve a protestar (salvo que estén ya furiosos)
const afraid = g => g.threat && yearT < g.threat.until && (g.anger || 0) < 85;
// El pueblo, harto, acaba con su líder: lo lincha o, si es muy devoto, lo sacrifica a su dios
function lynchLeader(g, who){
  const L = budgetLeader(g); if (!L || L.vid !== g.id) return false;
  const holy = g.faith && ((g.devotion || 0) > 3 || regimeOf(g) === 'teocracia'), at = { x:L.x, y:L.y }, was = tyranny(g);
  killVillager(L, holy ? 'sacrificado por el pueblo' : 'linchado por el pueblo');
  if (g.leader === L) g.leader = null; const cap = nationOf(g); if (cap.leader === L) cap.leader = null;
  g.anger = Math.max(0, (g.anger || 0) - 45); g.scandal = null; g.threat = null; g.stolen = 0;
  for (const u of who) u.ideo = clamp((u.ideo || 0) * .8, -1, 1);
  notify(holy ? `¡En ${g.name} la multitud arrastra a ${L.name} hasta el altar y lo sacrifica a ${g.faith.god} por haberles robado!` : `¡En ${g.name} la multitud, furiosa, lincha a ${L.name}!`, at);
  if (was) { setRegime(g, 'republica', null); setTimeout(() => notify(`Tras la caída de ${L.name}, ${g.name} se proclama república y habrá elecciones`, { x:g.fx * T, y:g.fy * T }), 600); }
  else cap.voteT = -1e9;
  return true;
}
// Panel de economía: los presupuestos
function budgetCard(g){
  if (!budgetOn(g)) return '';
  const b = g.budget, last = b.last || {}, keys = Object.keys(BUDGET_TXT).filter(k => (b.shares[k] || 0) > 0 || last[k] > 0);
  const total = keys.reduce((a, k) => a + (last[k] || 0), 0) + (last.desvio || 0), mx = Math.max(1, ...keys.map(k => last[k] || 0), last.desvio || 0);
  const how = { votados:`votados el día ${b.d}${b.support != null ? ` (${b.support} % a favor)` : ''}`, decreto:'por decreto de quien manda', prorrogados:`prorrogados: no salieron en la votación${b.support != null ? ` (${b.support} % a favor)` : ''}; obras a la mitad`, sin:'sin presupuestos: solo se paga la administración' }[b.how];
  const row = (name, v, col) => `<div class="kv"><span>${name}</span><b><span style="display:inline-block;width:70px;height:6px;background:#3a3028;vertical-align:1px;margin-right:6px"><span style="display:block;height:6px;width:${Math.round(v / mx * 70)}px;background:${col}"></span></span>${Math.round(v)} ${coinPl(g)}${total ? ` <span class="muted">(${Math.round(v / total * 100)} %)</span>` : ''}</b></div>`;
  return `<h4>Presupuestos</h4><div class="sec">
    <div class="kv"><span>Estado</span><b${b.how === 'prorrogados' || b.how === 'sin' ? ' style="color:#f08a7a"' : ''}>${how}</b></div>
    <div class="muted" style="margin:4px 0">Reparto del gasto de ayer:</div>
    ${keys.map(k => row(BUDGET_TXT[k], last[k] || 0, k === 'obras' ? '#e8b848' : '#7ab0d8')).join('')}
    ${last.desvio > 0 ? row('Sin justificar', last.desvio, '#d8483a') : ''}
    <div class="kv"><span>Fondo de obras</span><b>${Math.round(g.works || 0)} ${coinPl(g)} <span class="muted">(un hospital cuesta ${workCost(g, 'hospital')}, una escuela ${workCost(g, 'escuela')})</span></b></div>
    ${g.scandal ? `<div class="alert">Escándalo del día ${g.scandal.d}: ${esc(g.scandal.who)} se quedó ${g.scandal.amt} ${coinPl(g)}</div>` : ''}
    ${g.threat && yearT < g.threat.until ? `<div class="alert">Ciudad amenazada por ${esc(g.threat.by)}: cobra «protección» cada día</div>` : ''}</div>`;
}
