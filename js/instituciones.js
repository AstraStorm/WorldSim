// World Sim · Edificios de las instituciones: tribunal, cárcel, imprenta, casa del sindicato, parlamento y academia
// ================= Instituciones =================
// · Tribunal: sin él no hay juicios (hace falta saber escribir y tener ayuntamiento)
// · Cárcel: los presos cumplen allí (sin cárcel, delante del tribunal o del ayuntamiento)
// · Imprenta: sin ella no salen periódicos
// · Casa del sindicato: el sindicato se organiza mejor (aguanta más las huelgas y negocia mejor)
// · Parlamento: lo levantan las democracias, partitocracias y monarquías parlamentarias
// · Academia de la lengua: donde hay ley de reforma o de pureza de la lengua; con ella la ley se nota de verdad
const INSTS = {
  tribunal: { key:'court:tribunal', field:'court', wood:8, stone:12, flag:[.5, 0], t:12, name:'un tribunal', why:'ya pueden juzgar a quien se salte las leyes',
    want:g => (g.know || {}).escritura && g.hall != null && popOf(g) >= 20, w:g => 6 },
  carcel: { key:'jail:carcel', field:'prison', wood:4, stone:12, iron:3, flag:[.79, 0], t:10, name:'una cárcel', why:'los condenados cumplirán allí',
    want:g => hasCourt(g) && (prisonersOf(g).length > 0 || popOf(g) >= 30), w:g => prisonersOf(g).length ? 8 : 3 },
  imprenta: { key:'press:imprenta', field:'press', wood:10, stone:4, iron:2, t:10, name:'una imprenta', why:'pronto saldrá su primer periódico',
    want:g => hasPaper(g) && (g.know || {}).escritura && popOf(g) >= 24, w:g => 5 },
  sindicato: { key:'union:sindicato', field:'unionHall', wood:10, stone:4, t:10, name:'la casa del sindicato', why:'los trabajadores tienen dónde reunirse',
    want:g => !!g.union && g.hall != null && popOf(g) >= 20, w:g => 4 },
  parlamento: { key:'parliament:parlamento', field:'parliament', wood:12, stone:25, gold:2, flag:[.5, 0], t:16, name:'el parlamento', why:'allí se sentarán los diputados de todos los partidos',
    want:g => PARLIAMENT.includes(regimeOf(g)) && nationOf(g) === g && popOf(g) >= 20, w:g => 6 },
  academia: { key:'academy:academia', field:'academy', wood:10, stone:15, flag:[.76, 0], t:14, name:'una academia de la lengua', why:'decidirá cómo se habla y se escribe',
    want:g => (hasLaw(g, 'reforma_lengua') || hasLaw(g, 'pureza_lengua')) && (g.know || {}).escritura && popOf(g) >= 24, w:g => 5 },
  universidad: { key:'university:universidad', field:'university', wood:15, stone:25, t:16, name:'una universidad', why:'sus sabios investigarán y harán descubrimientos', flag:[.5, 0],
    want:g => (g.know || {}).escritura && hasSchool(g) && popOf(g) >= 30, w:g => 7 },
  consejo: { key:'council:consejo', field:'councilHall', wood:15, stone:30, gold:3, t:18, name:'el palacio del Consejo de las Naciones', why:'allí se reunirán los delegados de todo el mundo', flag:[.5, 0],
    want:g => !!(world.council && world.council.seat === g.id), w:g => 7 },
  espias: { key:'spy:espias', field:'spyHouse', wood:10, stone:8, t:10, name:'una casa discreta (de espías, aunque nadie lo dice)', why:'sus espías saldrán más a menudo y con más éxito',
    want:g => nationOf(g) === g && (g.know || {}).escritura && popOf(g) >= 24 && hasRival(g), w:g => 3 },
};
const hasInst = (g, k) => { const f = INSTS[k].field; return g[f] != null && !!world.objs[g[f]] && world.objs[g[f]].key === INSTS[k].key; };
const hasPress = g => hasInst(g, 'imprenta');
// Lo que les falta de cada material para levantarlo (madera, piedra, hierro, oro)
const MATS = [['wood', 'madera'], ['stone', 'piedra'], ['iron', 'hierro'], ['gold', 'oro']];
const instMissing = (g, I) => MATS.map(([f, n]) => [f, n, Math.max(0, (I[f] || 0) - (g[f] || 0))]).filter(m => m[2] > 0);
const instAfford = (g, I) => !instMissing(g, I).length;
// Para cada material, el trabajo que lo produce (más gente a ello si hace falta para una institución)
const MAT_JOBS = { wood:['talar'], stone:['picar', 'cantear'], iron:['minar', 'extraer'], gold:['minar', 'extraer'] };
// Trabajos (se llama desde chooseJob)
function institutionJobs(v, g, add){
  const need = {};
  for (const [k, I] of Object.entries(INSTS)) {
    if (hasInst(g, k) || !I.want(g)) continue;
    if (instAfford(g, I)) { add(k, !busyWith(g, k) ? I.w(g) : 0); continue; }
    // Lo quieren pero les falta material: se ponen a producirlo (y lo cuentan una vez)
    for (const [f, n] of instMissing(g, I)) { need[f] = true; const ask = g.instAsk ||= {}; if (!ask[k + f]) { ask[k + f] = true; notify(`En ${g.name} quieren levantar ${I.name}, pero les falta ${n}: más gente se pone a conseguirla`, { x:g.fx * T, y:g.fy * T }); } }
  }
  for (const f in need) for (const j of MAT_JOBS[f]) add(j, 4);
}
// Dónde (se llama desde setupTask)
function institutionTarget(v, g, job){ const p = bestSite(v, g, job); return p ? { k:job, i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
// Al acabar (se llama desde runTask)
function institutionArrive(v, g, t){
  const I = INSTS[t.k]; if (!I) return false;
  v.actT = I.t; v.onDone = () => {
    const x = t.i % W, y = (t.i / W) | 0, [hw, hh] = KIND_DIMS[t.k];
    if (hasInst(g, t.k) || !instAfford(g, I)) return;
    if (clearable(x - hw, y - hh, x + hw, y + 1)) clearSite(g, x - hw, y - hh, x + hw, y + 1);
    if (!tileFree(x, y) || buildingClash(x, y, t.k, t.i)) return;
    world.objs[t.i] = { key:I.key, v:0, ox:0, oy:0, vid:g.id }; g[I.field] = t.i; for (const [f] of MATS) if (I[f]) g[f] -= I[f];
    composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
    notify(`En ${g.name} levantan ${I.name}: ${I.why}`, { x:x * T, y:y * T });
  };
  return true;
}
// Delante de qué edificio esperan los presos: la cárcel, si no el tribunal, si no el ayuntamiento
function jailSpot(g){
  for (const k of ['carcel', 'tribunal']) if (hasInst(g, k)) return g[INSTS[k].field];
  return g.hall != null && world.objs[g.hall] ? g.hall : g.fy * W + g.fx;
}
// La bandera de la nación ondeando en un mástil sobre los edificios del gobierno (tribunal, cárcel, parlamento, academia)
function drawInstFlags(t){
  if (!ART.ready) return;
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    const flag = nationOf(g).flag || g.flag; if (!flag) continue;
    for (const [k, I] of Object.entries(INSTS)) {
      if (!I.flag || !hasInst(g, k)) continue;
      const i = g[I.field], o = world.objs[i], m = ART_MAP[o.key]; if (!m || o.burnt) continue;
      const left = (i % W) * T + 2 + (o.ox || 0) - m[4], top = ((i / W) | 0) * T + 3 + (o.oy || 0) - m[3] + 1;
      const px = Math.round(left + m[2] * I.flag[0]), py = Math.round(top + m[3] * I.flag[1]);
      if (px < x0 - 10 || px > x1 + 10 || py < y0 - 12 || py > y1 + 10) continue;
      vctx.fillStyle = '#2a2018'; vctx.fillRect(px - .5, py - 7, 2, 7); vctx.fillStyle = '#e8e0cc'; vctx.fillRect(px, py - 7, 1, 7); // mástil claro con su contorno
      vctx.fillStyle = '#f0c848'; vctx.fillRect(px, py - 8, 1, 1);       // remate dorado
      drawFlag(flag, px + 1, py - 7, 5, 3, 1, t);
    }
  }
}
// Edificios que quieren levantar y lo que les falta (ficha del pueblo)
function instCard(g){
  const rows = Object.entries(INSTS).filter(([k, I]) => !hasInst(g, k) && I.want(g));
  if (!rows.length) return '';
  return `<h4>Instituciones por construir</h4><div>${rows.map(([k, I]) => { const miss = instMissing(g, I);
    return `<div>${esc(capFirst(I.name.replace(/^(un|una|el|la) /, '')))}: <span class="muted">${MATS.filter(([f]) => I[f]).map(([f, n]) => `${I[f]} de ${n}`).join(', ')}</span> ${miss.length ? `<span style="color:#e8a838">· faltan ${miss.map(([, n, d]) => `${d} de ${n}`).join(', ')}</span>` : '<span style="color:#7ab04a">· listo para empezar</span>'}</div>`; }).join('')}</div>`;
}
