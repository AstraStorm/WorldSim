// Forja de Mundos · Espionaje: espías que roban mapas y descubrimientos, sabotean, siembran discordia o preparan golpes
// ================= Espionaje =================
// · Las naciones que saben escribir y tienen un rival (relaciones muy malas o guerra) mandan espías de vez en cuando;
//   con casa de espías, más a menudo y con más éxito
// · El espía viaja hasta el rival y, al llegar, intenta su misión: robar sus mapas, robar un descubrimiento, sabotear
//   un edificio, sembrar discordia (más enfado) o, contra un tirano o en guerra, preparar un golpe de estado
// · Si lo pillan, crisis diplomática, juicio y cárcel, y piden un rescate a su país. Luego se vota:
//   - donde lo tienen preso, si lo ejecutan (en la plaza, donde se vota; si no, lo decide quien manda): pesa el odio
//     que le tienen a su país, las ideas de cada uno y si hay ley de derechos humanos. Si nadie paga, se vuelve a votar
//   - en su país, qué hacen: pagar el rescate (oro o dinero), mandar un comando armado (puede salir mal) o abandonarlo
// · Si sale bien, a veces sospechan de quién fue
CRIME_TXT.espionaje = 'espionaje'; SENTENCE.espionaje = 1.5;
const rivalsOf = g => nationsAlive().filter(o => o !== nationOf(g) && (() => { const r = rels.get(relKey(nationOf(g), o)); return r && r.known && (r.war || r.v < -20); })());
const hasRival = g => rivalsOf(g).length > 0;
function spyTick(g, dt, people, adults){
  hostageTick(g); // los espías ajenos que tienen presos (y su rescate)
  if (nationOf(g) !== g || !(g.know || {}).escritura || adults.length < 10) return;
  if ((g.spyT ??= yearT + DAY_LEN * (.5 + Math.random())) > yearT) return;
  g.spyT = yearT + DAY_LEN * (hasInst(g, 'espias') ? .8 : 1.6) * (.7 + Math.random() * .6);
  if (travelers.some(t => t.kind === 'espia' && t.from === g.id)) return;
  const rivals = rivalsOf(g); if (!rivals.length) return;
  const to = rivals.sort((a, b) => (rels.get(relKey(g, a)) || { v:0 }).v - (rels.get(relKey(g, b)) || { v:0 }).v)[0];
  const n0 = travelers.length; sendTraveler('espia', g, to); if (travelers.length === n0) return;
  const t = travelers[travelers.length - 1], r = rels.get(relKey(g, to)), opts = [['discordia', 2], ['sabotaje', 2]];
  if (hasPaper(g) && hasPaper(to)) opts.push(['mapas', 2]);
  if (typeof DISCOVERIES !== 'undefined' && DISCOVERIES.some(d => knowsSci(to, d.k) && !knowsSci(g, d.k))) opts.push(['ciencia', 4]);
  if ((tyranny(to) || (r && r.war)) && !to.coup) opts.push(['golpe', .8]);
  let k = Math.random() * opts.reduce((a, o) => a + o[1], 0); t.mission = opts[0][0]; for (const [m, w] of opts) if ((k -= w) < 0) { t.mission = m; break; }
  (g.spyLog ||= { sent:0, ok:0, caught:0 }).sent++;
}
// Al llegar: ¿lo pillan? Si no, la misión. Devuelve true si lo han pillado (se queda allí, en la cárcel)
function spyArrive(t, from, to){
  const v = t.v, at = { x:to.fx * T, y:to.fy * T }, r = relOf(from, to), L = from.spyLog ||= { sent:0, ok:0, caught:0 };
  const success = .55 + (hasInst(from, 'espias') ? .15 : 0) - (hasCourt(to) ? .1 : 0) - (tyranny(to) ? .1 : 0) - (hasInst(to, 'espias') ? .1 : 0);
  if (Math.random() > success && Math.random() < .75) {
    v.away = false; v.task = null; v.x = to.fx * T + 2; v.y = to.fy * T + 6; L.caught++;
    r.v = clamp(r.v - 25, -100, 100);
    notify(`¡En ${to.name} pillan a ${v.name}, espía de ${from.name}! Crisis diplomática entre los dos`, at);
    if (!openTrial(to, v, 'espionaje', .95)) jail(v, to, 1.5, 'espionaje');
    (to.hostages ||= []).push({ v, from:from.id, execT:yearT + DAY_LEN * .15, decideT:yearT + DAY_LEN * .3, until:yearT + DAY_LEN * 1.4 });
    notify(`${to.name} pide a ${from.name} un rescate por ${v.name}: 3 de oro o ${ransomMoney(from)} ${from.coin ? coinPl(from) : 'de su tesoro'}`, at);
    return true;
  }
  L.ok++;
  const blame = Math.random() < .4 ? `: sospechan de ${from.name}` : '';
  if (blame) r.v = clamp(r.v - 10, -100, 100);
  switch (t.mission) {
    case 'mapas': { const A = chartOf(from), Bc = chartOf(to); for (let k = 0; k < A.length; k++) if (Bc[k] * .8 > A[k]) A[k] = Bc[k] * .8 | 0; from.chartVer++; notify(`En ${to.name} han desaparecido sus mapas${blame}`, at); break; }
    case 'ciencia': { const d = DISCOVERIES.find(d => knowsSci(to, d.k) && !knowsSci(from, d.k)); if (d) { sciOf(from)[d.k] = Math.floor(yearT / DAY_LEN) + 1; notify(`Alguien ha robado de la universidad de ${to.name} los secretos de ${d.txt}${blame}`, at); } break; }
    case 'sabotaje': { const bs = buildingsOf(to).filter(i => world.objs[i] && !world.objs[i].key.startsWith('house')); const i = bs.length ? bs[Math.floor(Math.random() * bs.length)] : null; if (i != null) { damageBuilding(i, .6); if (wooden(world.objs[i] || { key:'' })) fires.set(i, { t:0, life:8, tree:true, bld:true }); notify(`Sabotaje en ${to.name}: alguien ha dañado ${bldName(world.objs[i] || { key:'house:hut' }) || 'un edificio'}${blame}`, at); } break; }
    case 'discordia': { to.anger = Math.min(100, (to.anger || 0) + 20); for (const u of villagers) if (!u.dead && u.vid === to.id) u.ideo = clamp((u.ideo || 0) + (Math.random() - .5) * .3, -1, 1); notify(`En ${to.name} corren rumores y panfletos contra el gobierno${blame}`, at); break; }
    case 'golpe': { const adults = villagers.filter(u => !u.dead && u.vid === to.id && ageOf(u) >= ADULT_H); to.anger = Math.min(100, (to.anger || 0) + 25); if (!to.coup && adults.length >= 6) { startCoup(to, adults); if (to.coup) notify(`Detrás del golpe en ${to.name} hay dinero y armas de fuera${blame}`, at); } break; }
  }
  return false;
}
// ---- Rehenes: rescate, comando o ejecución ----
const ransomMoney = g => g.coin ? Math.round(25 * ecOf(g).P) : 25;
const inPrison = (u, g) => !u.dead && ((u.jail && u.jail.until > yearT) || (g.trials || []).some(t => t.who === u));
function release(u, g){ u.jail = null; if (u.task && (u.task.k === 'detenido' || u.task.job === 'detenido')) { u.task = null; u.actT = 0; u.onDone = null; } if (g.trials) g.trials = g.trials.filter(t => t.who !== u); }
// Una votación en la plaza: los que pueden van a votar (se ve) y se cuenta. choose(u) devuelve la opción de cada uno
const popularVote = g => votes(g) || ['tribu', 'anarquia', 'democracia'].includes(regimeOf(g));
function plazaVote(g, choose){
  const adults = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && ageOf(u) >= ADULT_H && !(u.jail && u.jail.until > yearT));
  const r0 = g.plaza, n = {};
  for (const u of adults) {
    const c = choose(u); n[c] = (n[c] || 0) + 1;
    if (r0 && !u.sleep && !(u.task && BUSY_POL.includes(u.task.k)) && Math.random() < .6) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'votar', x:(r0.x0 + .5 + Math.random() * (r0.x1 - r0.x0)) * T + 2, y:(r0.y0 + .5 + Math.random() * (r0.y1 - r0.y0)) * T + 3, until:yearT + 14 }; u.lastD = Infinity; }
  }
  const tot = adults.length || 1, best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return { win:best ? best[0] : null, pct:k => Math.round((n[k] || 0) / tot * 100), n };
}
// ¿Lo ejecutan? Pesa el odio a su país, las ideas (la derecha, más dura) y la ley de derechos humanos
function executionVote(g, h, home){
  const v = h.v, at = { x:g.fx * T, y:g.fy * T }, r = rels.get(relKey(g, home)), hate = r ? clamp(-r.v / 100, 0, 1) : .3, soft = hasLaw(g, 'derechos_humanos') ? .3 : 0;
  let kill, txt;
  if (popularVote(g)) {
    const res = plazaVote(g, u => Math.random() < .2 + hate * .45 + (u.ideo || 0) * .2 - soft ? 'si' : 'no');
    kill = res.win === 'si';
    txt = `En ${g.name} votan en la plaza si ejecutan a ${v.name}, espía de ${home.name}: ${res.pct('si')} % sí, ${res.pct('no')} % no`;
  } else {
    const L = g.leader && !g.leader.dead ? g.leader : null;
    kill = Math.random() < (tyranny(g) ? .65 : .35) + hate * .2 - soft;
    txt = `En ${g.name} ${L ? `${leaderRef(g)} decide` : 'deciden'} la suerte de ${v.name}, espía de ${home.name}`;
  }
  if (kill) { release(v, g); killVillager(v, 'ejecución'); notify(`${txt}: lo ejecutan`, at); return true; }
  notify(`${txt}: se queda en la cárcel${h.decided ? '' : ' (a la espera del rescate)'}`, at); return false;
}
// En su país: ¿pagar, mandar un comando o abandonarlo? (votación, o lo decide quien manda)
function rescueVote(g, h, home){
  const v = h.v, at = { x:home.fx * T, y:home.fy * T }, money = ransomMoney(home), ec = home.coin ? ecOf(home) : null;
  const canPay = (home.gold || 0) >= 3 || (ec && ec.treas >= money), armed = villagers.filter(u => !u.dead && !u.away && u.vid === home.id && u.weapon && u !== home.leader && ageOf(u) >= ADULT_H);
  const opts = ['abandonar'].concat(canPay ? ['pagar'] : [], armed.length >= 2 ? ['comando'] : []);
  let pick, txt;
  if (popularVote(home)) {
    const res = plazaVote(home, u => { const w = { abandonar:.6 + Math.max(0, -(u.ideo || 0)) * .2, pagar:canPay ? 1 + Math.max(0, -(u.ideo || 0)) * .6 : 0, comando:armed.length >= 2 ? .7 + Math.max(0, u.ideo || 0) * 1.2 + (u.weapon ? .8 : 0) : 0 };
      let k = Math.random() * (w.abandonar + w.pagar + w.comando); for (const o of opts) if ((k -= w[o]) < 0) return o; return 'abandonar'; });
    pick = res.win || 'abandonar';
    txt = `En ${home.name} votan qué hacer con ${v.name}, preso en ${g.name}: ${opts.map(o => `${{ pagar:'pagar el rescate', comando:'mandar un comando', abandonar:'dejarlo' }[o]} ${res.pct(o)} %`).join(', ')}`;
  } else {
    pick = armed.length >= 2 && (tyranny(home) || Math.random() < .5) ? 'comando' : canPay ? 'pagar' : 'abandonar';
    txt = `En ${home.name} ${home.leader && !home.leader.dead ? `${leaderRef(home)} decide` : 'deciden'} qué hacer con ${v.name}, preso en ${g.name}`;
  }
  if (pick === 'pagar') {
    if ((home.gold || 0) >= 3) { home.gold -= 3; g.gold = (g.gold || 0) + 3; }
    else { ec.treas -= money; if (g.coin) ecOf(g).treas += money * ecOf(g).P / ec.P; else g.gold = (g.gold || 0) + 1; }
    release(v, g); notify(`${txt}: pagan el rescate y ${g.name} lo suelta`, at); return 'ok';
  }
  if (pick === 'comando') { notify(`${txt}: mandan un comando`, at); launchRescue(home, g, v, armed.slice(0, 3)); return 'going'; }
  notify(`${txt}: lo dejan a su suerte`, at); return null;
}
function hostageTick(g){
  if (!g.hostages || !g.hostages.length) return;
  g.hostages = g.hostages.filter(h => {
    const v = h.v, home = villageById(h.from);
    if (v.dead || !home || !popOf(home) || h.rescue === 'ok') return false;
    if (!inPrison(v, g) && yearT > h.execT + 5) return false; // salió (absuelto o cumplió)
    if (!h.voted && yearT >= h.execT) { h.voted = true; if (executionVote(g, h, home)) return false; }
    if (!h.decided && yearT >= h.decideT) { h.decided = true; h.rescue = rescueVote(g, h, home); if (h.rescue === 'ok') return false; }
    if (yearT > h.until && h.rescue !== 'going') { h.until = Infinity; if (executionVote(g, h, home)) return false; return false; } // nadie ha pagado: se vuelve a votar
    return true;
  });
}
function launchRescue(home, g, v, squad){
  const n0 = travelers.length; sendTraveler('rescate', home, g); if (travelers.length === n0) return;
  const t = travelers[travelers.length - 1]; t.target = v; t.crew = [t.v];
  for (const u of squad) if (u !== t.v && t.crew.length < 3) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } dismount(u); u.task = { k:'viaje' }; u.away = true; t.crew.push(u); }
  notify(`${home.name} manda un comando de ${t.crew.length} a sacar a ${v.name} de la cárcel de ${g.name}`, { x:home.fx * T, y:home.fy * T });
}
// El comando llega: lo saca (y vuelven todos) o le sale mal (muere uno, los demás a la cárcel)
function rescueArrive(t, from, to){
  const v = t.target, h = (to.hostages || []).find(x => x.v === v), at = { x:to.fx * T, y:to.fy * T }, r = relOf(from, to);
  const crew = t.crew.filter(u => !u.dead), armed = crew.filter(u => u.weapon).length;
  if (!v || v.dead) { notify(`El comando de ${from.name} llega tarde a ${to.name}: ${v ? v.name : 'su espía'} ya no está`, at); if (h) h.rescue = 'ok'; return; }
  r.v = clamp(r.v - 20, -100, 100);
  const p = .35 + armed * .1 - (hasInst(to, 'carcel') ? .15 : 0) - (tyranny(to) ? .1 : 0);
  if (Math.random() < p) {
    release(v, to); v.away = true; v.task = { k:'viaje' }; t.crew.push(v); if (h) h.rescue = 'ok';
    notify(`¡Un comando de ${from.name} asalta la cárcel de ${to.name} y libera a ${v.name}!`, at);
  } else {
    const dead = crew[0]; if (dead) { dead.away = false; killVillager(dead, 'guerra'); }
    for (const u of crew.slice(1)) { u.away = false; u.task = null; u.x = to.fx * T + 2; u.y = to.fy * T + 6; jail(u, to, 1.5, 'espionaje'); }
    t.crew = []; t.failed = true; if (h) h.rescue = null;
    notify(`El comando de ${from.name} fracasa en ${to.name}: ${dead ? `${dead.name} muere` : ''}${crew.length > 1 ? ` y ${crew.length - 1} acaban en la cárcel` : ''}`, at);
  }
}
function spyCard(g){
  const L = g.spyLog; if (!L || nationOf(g) !== g) return '';
  return `<h4>Espionaje</h4><div class="muted">${L.sent} espías enviados · ${L.ok} misiones cumplidas · ${L.caught} capturados${hasInst(g, 'espias') ? ' · tienen casa de espías' : ''}</div>`;
}
