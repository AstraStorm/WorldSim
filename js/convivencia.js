// Forja de Mundos · Convivencia: parejas y orientación sexual, racismo y derechos, homofobia o igualdad
// ================= Convivencia =================
// Cada persona tiene su orientación (la mayoría heterosexual; algunos homosexuales o bisexuales) y forma pareja
// con quien le atrae. Lo que piense el pueblo de quien es distinto (por su piel o por a quién ama) lo marcan sus
// leyes: derechos humanos o segregación, matrimonio igualitario o persecución. Eso cambia el ánimo, los sueldos,
// quién se va del pueblo, las manifestaciones y cómo se llevan con los vecinos.
const ORIENT_TXT = { hetero:'heterosexual', homo:'homosexual', bi:'bisexual' };
const pidOf = v => v.pid ||= Math.random(); // identificador propio de cada persona (para el azar fijo y las parejas)
const orientOf = v => v.orient ||= (() => { const r = (pidOf(v) * 9301 + .49297) % 1; return r < .86 ? 'hetero' : r < .93 ? 'homo' : 'bi'; })();
const attracted = (a, b) => { const o = orientOf(a); return o === 'bi' || (o === 'hetero' ? a.sex !== b.sex : a.sex === b.sex); };
const partnerOf = v => { const p = (v.partners || []).slice().reverse().find(u => !u.dead); return p || null; };
const lgtb = v => orientOf(v) !== 'hetero';
const isMinority = (v, g) => g && g.skinMean != null && Math.abs(Math.max(0, SKIN.indexOf(v.skin)) - g.skinMean) > 1.6;
const sameSex = v => { const p = partnerOf(v); return !!p && p.sex === v.sex; };
function socialTick(g, dt, people){
  if ((g.socT = (g.socT || 0) - dt) > 0) return;
  g.socT = 3;
  g.skinMean = people.reduce((a, v) => a + Math.max(0, SKIN.indexOf(v.skin)), 0) / Math.max(1, people.length);
  const adult = v => { const a = ageOf(v); return a >= ADULT_H && a < 13; };
  const persec = hasLaw(g, 'persecucion'), equal = hasLaw(g, 'matrimonio_igualitario'), at = { x:g.fx * T, y:g.fy * T };
  // Parejas: quien está solo busca a alguien del pueblo que le atraiga (y a quien atraiga)
  const singles = people.filter(v => adult(v) && !v.away && !partnerOf(v));
  for (let n = 0; n < 2 && singles.length > 1; n++) {
    const a = singles.splice(Math.floor(Math.random() * singles.length), 1)[0];
    const k = singles.findIndex(b => attracted(a, b) && attracted(b, a) && Math.abs(ageOf(a) - ageOf(b)) < 5); if (k < 0) continue;
    const b = singles.splice(k, 1)[0]; (a.partners ||= []).push(b); (b.partners ||= []).push(a);
    if (a.sex === b.sex) {
      a.secret = b.secret = persec; // con la ley en contra, a escondidas
      if (!persec && !g.sameSexMsg) { g.sameSexMsg = true; notify(equal ? `En ${g.name} se casan ${a.name} y ${b.name}: la primera boda entre dos ${a.sex === 'h' ? 'hombres' : 'mujeres'} del pueblo` : `En ${g.name}, ${a.name} y ${b.name} forman pareja`, at); floats.push({ x:a.x, y:a.y - 14, txt:'♥', col:'#f0a0c0', life:0 }); }
    }
  }
  // Persecución: las parejas escondidas pueden ser descubiertas y desterradas
  if (persec) for (const v of people) {
    const p = partnerOf(v); if (!p || p.sex !== v.sex || v.away || p.away || pidOf(v) > pidOf(p) || Math.random() > .012) continue;
    const dest = villages.filter(o => o !== g && popOf(o) && !hasLaw(o, 'persecucion') && !hasLaw(o, 'fronteras_cerradas') && !(rels.get(relKey(g, o)) || {}).war).sort((o1, o2) => (hasLaw(o2, 'matrimonio_igualitario') - hasLaw(o1, 'matrimonio_igualitario')) || Math.hypot(o1.fx - g.fx, o1.fy - g.fy) - Math.hypot(o2.fx - g.fx, o2.fy - g.fy))[0];
    if (dest) { for (const u of [v, p]) exile(u, g, dest); notify(`En ${g.name} descubren la relación de ${v.name} y ${p.name} y, por la ley de persecución, los destierran: se van a ${dest.name}`, at); }
    else { v.hidden = p.hidden = yearT + DAY_LEN; notify(`En ${g.name} descubren a ${v.name} y ${p.name}; sin ningún sitio adonde ir, viven escondidos`, at); }
    g.anger = Math.min(100, (g.anger || 0) + 4); break;
  }
  if (!persec) for (const v of people) if (v.secret) v.secret = false; // si cambia la ley, ya no tienen que esconderse
  // Segregación: quien tiene otra piel cobra menos y, si puede, se va a un pueblo con derechos
  if (hasLaw(g, 'segregacion') && Math.random() < .05) {
    const mins = people.filter(v => adult(v) && isMinority(v, g) && !v.away && v !== g.leader);
    const dest = mins.length >= 2 && villages.filter(o => o !== g && popOf(o) && !hasLaw(o, 'segregacion') && !hasLaw(o, 'fronteras_cerradas') && !(rels.get(relKey(g, o)) || {}).war && houseCap(o) + 4 > popOf(o)).sort((o1, o2) => hasLaw(o2, 'derechos_humanos') - hasLaw(o1, 'derechos_humanos'))[0];
    if (dest) { const go = mins.slice(0, 4); for (const u of go) exile(u, g, dest); notify(`Huyendo del racismo, ${go.length} personas de ${g.name} emigran a ${dest.name}`, at); }
  }
  creedTick(g, people);
  // Igualdad: las parejas del mismo sexo pueden adoptar a los huérfanos
  if (equal && Math.random() < .2) {
    const orphan = people.find(v => ageOf(v) < ADULT_H && !(v.parents || []).some(p => p && !p.dead));
    const pair = orphan && people.find(v => adult(v) && sameSex(v) && !v.away && (v.kids || []).length < 3);
    if (pair) { const p = partnerOf(pair); orphan.parents = [pair, p]; (pair.kids ||= []).push(orphan); (p.kids ||= []).push(orphan); if (!g.adoptMsg) { g.adoptMsg = true; notify(`En ${g.name}, ${pair.name} y ${p.name} adoptan a ${orphan.name}, que se había quedado huérfan${orphan.sex === 'm' ? 'a' : 'o'}`, at); } }
  }
}
function exile(u, g, dest){
  releaseTask(u); dismount(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'viaje' }; u.away = true; u.secret = false;
  travelers.push({ kind:'emigrante', v:u, from:g.id, to:dest.id, x:u.x, y:u.y, tx:dest.fx * T + 2 + (Math.random() - .5) * 20, ty:dest.fy * T + 10, hx:u.x, hy:u.y, sea:false, phase:'ida', dir:1 });
}
// Lo que pesa en el ánimo de cada uno
function socialMood(v, g, add){
  if (!g || ageOf(v) < ADULT_H) return;
  creedMood(v, g, add);
  if (holidayToday(g)) add(8, 'hoy es fiesta'); else if (restDaysOf(g) === 0) add(-8, 'no tiene ni un día libre'); else if (isRestDay(g)) add(4, 'hoy es su día libre');
  if (isMinority(v, g)) {
    if (hasLaw(g, 'segregacion')) add(-15, 'sufre el racismo de su pueblo');
    else if (hasLaw(g, 'derechos_humanos')) add(4, 'tiene los mismos derechos que todos');
    else if (govIdeo(g) > .4) add(-5, 'le miran mal por su piel');
  }
  if (lgtb(v)) {
    if (hasLaw(g, 'persecucion')) add(-18, partnerOf(v) ? 'tiene que esconder a quien ama' : 'tiene que esconder quién es');
    else if (hasLaw(g, 'matrimonio_igualitario')) add(6, 'puede amar libremente');
    else if (govIdeo(g) > .4) add(-4, 'algunos le rechazan');
  }
}
