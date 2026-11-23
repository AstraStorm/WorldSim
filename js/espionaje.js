// Forja de Mundos · Espionaje: espías que roban mapas y descubrimientos, sabotean, siembran discordia o preparan golpes
// ================= Espionaje =================
// · Las naciones que saben escribir y tienen un rival (relaciones muy malas o guerra) mandan espías de vez en cuando;
//   con casa de espías, más a menudo y con más éxito
// · El espía viaja hasta el rival y, al llegar, intenta su misión: robar sus mapas, robar un descubrimiento, sabotear
//   un edificio, sembrar discordia (más enfado) o, contra un tirano o en guerra, preparar un golpe de estado
// · Si lo pillan, juicio y cárcel allí, y crisis diplomática; si sale bien, a veces sospechan de quién fue
CRIME_TXT.espionaje = 'espionaje'; SENTENCE.espionaje = 1.5;
const rivalsOf = g => nationsAlive().filter(o => o !== nationOf(g) && (() => { const r = rels.get(relKey(nationOf(g), o)); return r && r.known && (r.war || r.v < -20); })());
const hasRival = g => rivalsOf(g).length > 0;
function spyTick(g, dt, people, adults){
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
    if (!openTrial(to, v, 'espionaje', .95)) jail(v, to, 1, 'espionaje');
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
function spyCard(g){
  const L = g.spyLog; if (!L || nationOf(g) !== g) return '';
  return `<h4>Espionaje</h4><div class="muted">${L.sent} espías enviados · ${L.ok} misiones cumplidas · ${L.caught} capturados${hasInst(g, 'espias') ? ' · tienen casa de espías' : ''}</div>`;
}
