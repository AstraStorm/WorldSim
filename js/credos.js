// Forja de Mundos · Migrantes con su propia fe
// ================= Credos de fuera =================
// Quien llega de un pueblo con otra religión la trae consigo. Unos son pacíficos (rezan a lo suyo y, con el tiempo,
// se integran); otros predican y convierten, y si llegan a ser mayoría imponen su fe y sus costumbres.
// El pueblo que los acoge decide con sus leyes: libertad de culto, o perseguirlos y expulsarlos.
const creedOf = v => v.creed && v.creed.god ? v.creed : null;
const otherFaith = (v, g) => !!creedOf(v) && (!g || !g.faith || v.creed.god !== g.faith.god);
function welcomeMigrant(v, from, to){
  if (!from || !from.faith || (to.faith && to.faith.god === from.faith.god)) return;
  if (!v.creed) v.creed = { god:from.faith.god, fem:from.faith.fem, dom:from.faith.dom, name:from.faith.name, mono:from.faith.mono, from:from.name };
  v.zeal ??= Math.random() < .3 ? .7 + Math.random() * .3 : Math.random() * .5; // 3 de cada 10, predicadores
}
const persecutesFaith = g => hasLaw(g, 'persecucion_religiosa') || (regimeOf(g) === 'teocracia' && !hasLaw(g, 'libertad_religiosa'));
function creedTick(g, people){
  for (const v of people) if (creedOf(v) && g.faith && v.creed.god === g.faith.god) v.creed = null; // ya es la fe del pueblo
  const foreign = people.filter(v => otherFaith(v, g));
  if (!foreign.length) return;
  const groups = new Map(); for (const v of foreign) { const k = v.creed.god; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); }
  const [god, grp] = [...groups].sort((a, b) => b[1].length - a[1].length)[0], c = grp[0].creed, at = { x:g.fx * T, y:g.fy * T };
  const adults = people.filter(v => ageOf(v) >= ADULT_H), free = hasLaw(g, 'libertad_religiosa');
  if (persecutesFaith(g)) { // se les persigue: si los pillan, los expulsan
    if (Math.random() < .03) {
      const sameGod = o => !!(o.faith && o.faith.god === god);
      const dest = villages.filter(o => o !== g && popOf(o) && !persecutesFaith(o) && !hasLaw(o, 'fronteras_cerradas') && !(rels.get(relKey(g, o)) || {}).war).sort((o1, o2) => (sameGod(o2) - sameGod(o1)) || (hasLaw(o2, 'libertad_religiosa') - hasLaw(o1, 'libertad_religiosa')))[0];
      const go = grp.filter(v => v !== g.leader && !v.away).slice(0, 4);
      if (dest && go.length) { for (const u of go) exile(u, g, dest); notify(`En ${g.name} persiguen a los fieles de ${god} y expulsan a ${go.length}: se refugian en ${dest.name}`, at); g.anger = Math.min(100, (g.anger || 0) + 3); }
    }
    return;
  }
  // Predicadores: convierten a gente del pueblo (más con libertad de culto; menos con una fe oficial)
  const preachers = grp.filter(v => (v.zeal || 0) > .6 && !v.away);
  if (preachers.length && Math.random() < .012 * Math.min(4, preachers.length) * (free ? 1.3 : 1) * (hasLaw(g, 'fe') ? .5 : 1)) {
    const local = adults.find(v => !creedOf(v) && v !== g.leader && pietyOf(v) < .7); // los muy devotos no cambian
    if (local) { local.creed = { ...c }; local.zeal = Math.random() * .6; floats.push({ x:local.x, y:local.y - 12, txt:`se convierte a ${god}`, col:'#e0c8f0', life:0 }); }
    if (!free && yearT - (g.preachMsg ?? -1e9) > DAY_LEN * 3) { g.preachMsg = yearT; notify(`En ${g.name} los predicadores de ${god} chocan con los de siempre: quieren imponer sus costumbres y crece la tensión`, at); g.anger = Math.min(100, (g.anger || 0) + 5); }
  }
  // Los pacíficos, con los años, acaban rezando a los dioses del pueblo
  for (const v of grp) if ((v.zeal || 0) < .4 && Math.random() < (free ? .004 : .008)) v.creed = null;
  // Si ya son mayoría, su fe se impone (con sus dioses, sus tabúes y sus fiestas)
  const share = adults.filter(v => creedOf(v) && v.creed.god === god).length / Math.max(1, adults.length);
  if (share > .5 && adults.length >= 6 && yearT - (g.faithChangeT ?? -1e9) > DAY_LEN * 5) { // (y no justo después de otro cambio)
    const oldF = g.faith, old = oldF ? oldF.god : null; g.faithChangeT = yearT;
    g.faith = { god, fem:c.fem, dom:c.dom || 'el cielo', name:c.name || `fe de ${god}`, mono:!!c.mono, pantheon:[] }; g.devotion = 0; g.wrath = 0; if (g.holy) g.holy.style = null;
    for (const v of people) { if (creedOf(v) && v.creed.god === god) v.creed = null; else if (oldF && ageOf(v) >= ADULT_H && pietyOf(v) > .6) { v.creed = { god:oldF.god, fem:oldF.fem, dom:oldF.dom, name:oldF.name, mono:oldF.mono }; v.zeal = Math.random() * .5; } } // los devotos de antes, ahora son la minoría
    notify(`En ${g.name} la fe que trajeron los forasteros se impone: ahora veneran a ${godTxt(g.faith)}${old ? ` y no a ${old}` : ''}`, at);
  }
}
function creedMood(v, g, add){
  if (!g || ageOf(v) < ADULT_H) return;
  if (otherFaith(v, g)) {
    if (persecutesFaith(g)) add(-15, `le persiguen por rezar a ${v.creed.god}`);
    else if (hasLaw(g, 'libertad_religiosa')) add(5, `puede rezar a ${v.creed.god} en paz`);
    else add(-3, 'es de otra fe que la mayoría');
  } else if (g.faith && pietyOf(v) > .6 && !hasLaw(g, 'libertad_religiosa') && villagers.some(u => !u.dead && u.vid === g.id && otherFaith(u, g) && (u.zeal || 0) > .6)) add(-4, 'le molestan los predicadores de otra fe');
}
