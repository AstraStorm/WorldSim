// World Sim · Justicia: tribunal, juicios, cárcel, presos políticos y amnistías
// ================= Justicia =================
// · Con escritura se levanta el tribunal, y luego la cárcel (instituciones.js); los presos cumplen delante de ella con
//   grilletes y les dan de comer
// · Se juzga la corrupción (cuando se destapa un escándalo), a los golpistas de un golpe fallido (donde no se fusila),
//   los robos, las huelgas ilegales, a los periodistas que el gobierno cierra y, en las dictaduras, a los opositores
// · Lo que pesa en cada juicio es lo independientes que son los jueces: en una democracia pueden condenar al primer
//   ministro; en una dictadura obedecen al líder (a él no lo juzgan) y condenan a quien les mandan
// · Al caer una dictadura hay amnistía: salen los presos políticos
const JUDGE_INDEP = { democracia:.85, monarquia_parlamentaria:.8, republica:.75, tecnocracia:.7, socialismo:.6, anarquia:.6, partitocracia:.5, tribu:.5, monarquia:.4, oligarquia:.3, teocracia:.3, dictadura:.12, comunismo:.1, fascismo:.08 };
const CRIME_TXT = { 'corrupción':'corrupción', golpe:'participar en el golpe de estado', robo:'robo', 'político':'agitación contra el gobierno', huelga:'convocar una huelga ilegal', prensa:'publicar mentiras contra el gobierno' };
const SENTENCE = { 'corrupción':1, golpe:1.5, robo:.4, 'político':1, huelga:.5, prensa:.7 }; // días de cárcel
const judgeIndep = g => JUDGE_INDEP[regimeOf(g)] ?? .5;
const hasCourt = g => !!((g.know || {}).escritura && hasInst(g, 'tribunal')); // el edificio (instituciones.js)
const prisonersOf = g => villagers.filter(u => !u.dead && u.jail && u.jail.vid === g.id && u.jail.until > yearT);
// A la cárcel: delante del ayuntamiento, con grilletes, hasta que cumpla
function jail(u, g, days, why){
  releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } dismount(u); u.sleep = false; u.away = false;
  const hi = jailSpot(g), hx = (hi % W) * T + 2, hy = ((hi / W) | 0) * T + 3 + T * 2, k = prisonersOf(g).length;
  const until = yearT + days * DAY_LEN;
  u.task = { k:'detenido', x:hx + ((k % 6) - 2.5) * 4, y:hy + Math.floor(k / 6) * 4, until }; u.lastD = Infinity;
  u.jail = { why, until, vid:g.id, pol:why === 'político' || why === 'prensa' || why === 'huelga' };
}
// Abre un juicio (se resuelve al cabo de un rato). evidence: lo claras que están las pruebas
function openTrial(g, who, crime, evidence = .8){
  if (!who || who.dead || who.away || !hasCourt(g) || (g.trials || []).some(t => t.who === who)) return false;
  const n = nationOf(g);
  if (crime === 'corrupción' && tyranny(g) && (who === g.leader || who === n.leader)) { // al tirano no se le juzga
    if (!g.immuneMsg || yearT - g.immuneMsg > DAY_LEN * 2) { g.immuneMsg = yearT; notify(`En ${g.name} ningún juez se atreve a juzgar a ${leaderRef(n)}`, { x:g.fx * T, y:g.fy * T }); }
    return false;
  }
  (g.trials ||= []).push({ who, crime, evidence, until:yearT + DAY_LEN * .35 });
  return true;
}
function verdict(g, t){
  const u = t.who; if (u.dead) return;
  const ind = judgeIndep(g), at = { x:g.fx * T, y:g.fy * T }, n = nationOf(g);
  // Los jueces independientes condenan según las pruebas; los que obedecen, según lo que convenga al gobierno
  const p = t.crime === 'político' || t.crime === 'prensa' ? t.evidence * (1 - ind) + .05
    : t.crime === 'huelga' ? t.evidence * (1 - ind * .6)
    : t.crime === 'corrupción' ? t.evidence * ind * (u === n.leader || u === g.leader ? .85 : 1) + .05
    : t.evidence * (.6 + ind * .35);
  const guilty = Math.random() < p, days = SENTENCE[t.crime] || .5;
  let txt;
  if (guilty) {
    jail(u, g, days, t.crime);
    if (t.crime === 'corrupción') { // devuelve lo robado y, si mandaba, deja el cargo
      if (g.coin && (u.money || 0) > 0) { ecOf(g).treas += u.money; u.money = 0; }
      if (g.leader === u) g.leader = null; if (n.leader === u) { n.leader = null; if (votes(n)) n.voteT = -1e9; }
      g.anger = Math.max(0, (g.anger || 0) - 20);
    }
    txt = `Juicio en ${g.name}: ${u.name}, ${t.crime === 'corrupción' && (u === n.leader || u === g.leader) ? 'quien mandaba, ' : ''}acusad${u.sex === 'm' ? 'a' : 'o'} de ${CRIME_TXT[t.crime]}, es condenad${u.sex === 'm' ? 'a' : 'o'} a ${days < 1 ? 'unas horas' : days === 1 ? 'un día' : `${days} días`} de cárcel`;
  } else {
    txt = `Juicio en ${g.name}: ${u.name} sale absuelt${u.sex === 'm' ? 'a' : 'o'} de ${CRIME_TXT[t.crime]}`;
    if (t.crime === 'corrupción' && ind < .55) { txt += '; el pueblo sospecha que el juez estaba comprado'; g.anger = Math.min(100, (g.anger || 0) + 10); }
  }
  (g.trialLog ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, txt:txt.replace(`Juicio en ${g.name}: `, ''), guilty });
  if (g.trialLog.length > 8) g.trialLog.shift();
  if (t.crime !== 'robo' || guilty && (!g.robMsg || yearT - g.robMsg > DAY_LEN)) { if (t.crime === 'robo') g.robMsg = yearT; notify(txt, at); }
}
function justiceTick(g, dt, people, adults){
  // Los presos comen (el rancho de la cárcel) y, al cumplir, salen
  for (const u of people) if (u.jail) {
    if (u.jail.until <= yearT) { u.jail = null; continue; }
    u.food = Math.max(u.food ?? 1, .5); u.water = Math.max(u.water ?? 1, .5);
    if (!(u.task && (u.task.k === 'detenido' || u.task.job === 'detenido'))) { const j = u.jail; jail(u, g, (j.until - yearT) / DAY_LEN, j.why); u.jail.pol = j.pol; } // si alguien lo ha sacado, vuelve a su sitio
  }
  if (g.trials && g.trials.length) { const due = g.trials.filter(t => yearT >= t.until); if (due.length) { g.trials = g.trials.filter(t => yearT < t.until); for (const t of due) verdict(g, t); } }
  // Al caer la dictadura: amnistía para los presos políticos
  const tyr = tyranny(g);
  if (g.wasTyr && !tyr) {
    const pol = people.filter(u => u.jail && u.jail.pol && u.jail.until > yearT);
    for (const u of pol) { u.jail = null; if (u.task && (u.task.k === 'detenido' || u.task.job === 'detenido')) { u.task = null; u.actT = 0; } }
    if (pol.length) notify(`Amnistía en ${g.name}: salen de la cárcel ${pol.length} ${pol.length === 1 ? 'preso político' : 'presos políticos'}`, { x:g.fx * T, y:g.fy * T });
  }
  g.wasTyr = tyr;
  if ((g.justT = (g.justT || 0) - dt) > 0) return;
  g.justT = 5; const el = 5;
  // Robos: quien no tiene nada roba a quien tiene mucho; a veces lo pillan
  if (g.coin && hasCourt(g) && adults.length >= 8 && Math.random() < el * .006) {
    const poor = adults.filter(u => (u.money || 0) < .5 && !u.jail && !u.away), rich = adults.filter(u => (u.money || 0) > 6 && !u.away);
    if (poor.length && rich.length) {
      const th = poor[Math.floor(Math.random() * poor.length)], vi = rich[Math.floor(Math.random() * rich.length)], amt = Math.ceil(vi.money * .3);
      vi.money -= amt; th.money = (th.money || 0) + amt;
      if (Math.random() < .4 + (hasLaw(g, 'orden') ? .3 : 0)) { th.money = Math.max(0, th.money - amt); vi.money += amt; openTrial(g, th, 'robo', .9); }
    }
  }
}
// Los golpistas de un golpe fallido: donde hay tribunal y no manda un tirano, se les juzga en vez de fusilarlos
function coupTrial(g, plot){
  if (!hasCourt(g) || tyranny(g)) return false;
  let n = 0; for (const u of plot) if (openTrial(g, u, 'golpe', .95)) n++;
  return n > 0 ? n : false;
}
// En las dictaduras, tras reprimir una protesta, algunos acaban ante el juez (presos políticos)
function politicalTrials(g, who){
  if (!tyranny(g) || !hasCourt(g)) return;
  for (const u of who.filter(u => !u.dead).slice(0, 2)) openTrial(g, u, 'político', .9);
}
function justiceCard(g){
  if (!hasCourt(g)) return `<h4>Justicia</h4><div class="muted">Sin tribunal todavía${(g.know || {}).escritura ? '' : ' (antes tienen que saber escribir)'}</div>`;
  const pr = prisonersOf(g), ind = judgeIndep(g);
  return `<h4>Justicia</h4><div class="needs"><span>Independencia de los jueces</span>${bar(ind, ind > .6 ? '#7ab04a' : ind > .35 ? '#e8a838' : '#d8483a', 150)}<span>${Math.round(ind * 100)} %</span></div>
    <div>${pr.length ? `En la cárcel: ${pr.slice(0, 6).map(u => `${esc(u.name)} <span class="muted">(${CRIME_TXT[u.jail.why] || u.jail.why})</span>`).join(', ')}${pr.length > 6 ? ` y ${pr.length - 6} más` : ''}` : '<span class="muted">La cárcel está vacía</span>'}${(g.trials || []).length ? ` · ${g.trials.length} ${g.trials.length === 1 ? 'juicio pendiente' : 'juicios pendientes'}` : ''}</div>
    ${(g.trialLog || []).length ? `<ul class="log">${g.trialLog.slice().reverse().slice(0, 5).map(e => `<li class="${e.guilty ? 'war' : 'pol'}"><span class="d">día ${e.d}</span>${esc(e.txt)}</li>`).join('')}</ul>` : ''}`;
}
