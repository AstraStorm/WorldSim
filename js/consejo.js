// Forja de Mundos · Consejo de las Naciones: debates, votaciones, altos el fuego y sanciones
// ================= Consejo de las Naciones =================
// · Cuando hay al menos tres naciones y dos ya saben escribir, la más poblada en paz funda el Consejo en su capital
//   (y levanta allí su palacio). Se unen las naciones que saben escribir
// · Se reúne cada poco. Si hay una guerra, vota un alto el fuego: si sale, a veces el agresor firma la paz y si no,
//   se le sanciona. También vota sanciones contra quien persigue a su gente (fascismo, segregación, persecución)
// · En el Consejo se habla la lengua común: la nación cuyo delegado no la sabe no se entera del debate y no vota
// · Sancionar sale caro: precios más altos (inflación) y peores relaciones con todos los miembros
const COUNCIL_NAME = 'Consejo de las Naciones';
const nationsAlive = () => villages.filter(g => popOf(g) && nationOf(g) === g);
const council = () => world.council || null;
const sanctioned = g => { const C = council(); const s = C && C.sanctions[nationOf(g).id]; return !!(s && s.until > yearT); };
// Embargo: los miembros no comercian con el sancionado
const councilEmbargo = (a, b) => { const C = council(); if (!C) return false; return (sanctioned(a) && C.members.includes(nationOf(b).id)) || (sanctioned(b) && C.members.includes(nationOf(a).id)); };
const sanctionPressure = g => sanctioned(g) ? .02 : 0; // (en econTick)
// El delegado: alguien de la capital que hable la lengua común (si no hay nadie, no se entera)
function delegateOf(n){ return villagers.find(u => !u.dead && u.vid === n.id && ageOf(u) >= ADULT_H && speaks(u, LANG_COMMON)) || null; }
function councilLog(txt){ const C = council(); C.log.push({ d:Math.floor(yearT / DAY_LEN) + 1, txt }); if (C.log.length > 10) C.log.shift(); }
let councilClock = 0;
function updateCouncil(dt){
  if ((councilClock += dt) < 5 || !world) return; const el = councilClock; councilClock = 0;
  const ns = nationsAlive();
  if (!council()) {
    if (ns.length < 3 || yearT < DAY_LEN * 3 || ns.filter(n => (n.know || {}).escritura).length < 2 || Math.random() > el * .004) return;
    const seat = ns.filter(n => (n.know || {}).escritura && !atWarJ0(n)).sort((a, b) => popOf(b) - popOf(a))[0]; if (!seat) return;
    world.council = { seat:seat.id, members:[], born:yearT, next:yearT + DAY_LEN * .8, log:[], sanctions:{} };
    notify(`${seat.name} reúne a las naciones del mundo y funda el ${COUNCIL_NAME}: allí se debatirán las guerras y las injusticias, en ${langName(LANG_COMMON)}`, { x:seat.fx * T, y:seat.fy * T });
  }
  const C = council();
  if (!villageById(C.seat) || !popOf(villageById(C.seat))) { const nu = ns.filter(n => (n.know || {}).escritura).sort((a, b) => popOf(b) - popOf(a))[0]; if (!nu) return; C.seat = nu.id; notify(`El ${COUNCIL_NAME} se traslada a ${nu.name}`, { x:nu.fx * T, y:nu.fy * T }); }
  C.members = C.members.filter(id => ns.some(n => n.id === id));
  for (const n of ns) if (!C.members.includes(n.id) && (n.know || {}).escritura && !(C.expelled || {})[n.id]) { C.members.push(n.id); if (C.members.length > 1) notify(`${n.name} entra en el ${COUNCIL_NAME}`, { x:n.fx * T, y:n.fy * T }); }
  if (yearT < C.next || C.members.length < 2) return;
  C.next = yearT + DAY_LEN * 1.2;
  const members = C.members.map(villageById), seat = villageById(C.seat), at = { x:seat.fx * T, y:seat.fy * T };
  const rv = (a, b) => { const r = rels.get(relKey(a, b)); return r ? r.v : 0; };
  // Votación: cada miembro (salvo los afectados) vota; sin delegado que sepa la lengua común, no se entera
  const vote = (skip, isYes) => { // (skip: los implicados, que no votan)
    let yes = 0, no = 0, deaf = [];
    for (const m of members) { if (skip.includes(m)) continue; if (!delegateOf(m)) { deaf.push(m.name); continue; } if (isYes(m)) yes++; else no++; }
    return { yes, no, deaf, ok:yes > no || (yes > 0 && yes === no && Math.random() < .5) }; // (en empate, a veces sale)
  };
  // 1) Una guerra: alto el fuego
  const war = [...rels.values()].find(r => r.war && (C.members.includes(r.war.att) || C.members.includes(r.war.def)));
  if (war) {
    const att = villageById(war.war.att), def = villageById(war.war.def);
    if (att && def) {
      const res = vote([att, def], m => rv(m, att) <= rv(m, def) + 10);
      let txt = `El ${COUNCIL_NAME} vota un alto el fuego entre ${att.name} y ${def.name}: ${res.yes} a favor, ${res.no} en contra${res.deaf.length ? ` (${res.deaf.join(', ')} no se enteran: su delegado no habla ${langName(LANG_COMMON)})` : ''}`;
      if (res.ok) {
        if (Math.random() < .45) { makePeace(att, def, war, `por mandato del ${COUNCIL_NAME}`); txt += '. Se firma la paz'; }
        else { C.sanctions[att.id] = { until:yearT + DAY_LEN * 4, why:`atacar a ${def.name}` }; for (const m of members) if (m !== att) { const r = relOf(m, att); r.v = clamp(r.v - 8, -100, 100); } txt += `. ${att.name} no para la guerra: queda sancionado`; }
      } else txt += '. No sale adelante';
      councilLog(txt); notify(txt, at); return;
    }
  }
  // 2) Una nación que persigue a su gente: sanciones
  const bad = members.find(m => !sanctioned(m) && (regimeOf(m) === 'fascismo' || ['segregacion', 'persecucion', 'persecucion_religiosa'].some(l => hasLaw(m, l)) || (typeof prisonersOf === 'function' && prisonersOf(m).filter(u => u.jail.pol).length >= 3)));
  if (bad) {
    const why = regimeOf(bad) === 'fascismo' ? 'su régimen fascista' : hasLaw(bad, 'segregacion') ? 'la segregación' : hasLaw(bad, 'persecucion') ? 'perseguir a los homosexuales' : hasLaw(bad, 'persecucion_religiosa') ? 'perseguir a los de otra fe' : 'sus presos políticos';
    const res = vote([bad], m => regimeOf(m) !== regimeOf(bad) && rv(m, bad) < 40);
    let txt = `El ${COUNCIL_NAME} vota sanciones contra ${bad.name} por ${why}: ${res.yes} a favor, ${res.no} en contra`;
    if (res.ok) { C.sanctions[bad.id] = { until:yearT + DAY_LEN * 4, why }; for (const m of members) if (m !== bad) { const r = relOf(m, bad); r.v = clamp(r.v - 6, -100, 100); } txt += '. Quedan sancionados'; }
    else txt += '. No salen adelante';
    councilLog(txt); notify(txt, at); return;
  }
  // 3) Sin conflictos: debaten y se conocen mejor (mejoran un poco todas las relaciones)
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) { const r = relOf(members[i], members[j]); r.known = true; r.v = clamp(r.v + 2, -100, 100); }
  if (Math.random() < .3) { const topic = ['el comercio entre naciones', 'las rutas por mar', 'el reparto de los ríos', 'la lengua común en las escuelas', 'los refugiados', 'los nuevos descubrimientos'][Math.floor(Math.random() * 6)]; const txt = `El ${COUNCIL_NAME} se reúne en ${seat.name} y debate sobre ${topic}`; councilLog(txt); notify(txt, at); }
}
function councilCard(g){
  const C = council(); if (!C) return '';
  const n = nationOf(g), member = C.members.includes(n.id), seat = villageById(C.seat), s = C.sanctions[n.id];
  return `<h4>${COUNCIL_NAME}</h4><div>${member ? `Miembro${n.id === C.seat ? ' · <b>sede del Consejo</b>' : ` · sede en ${esc(seat ? seat.name : '?')}`}` : '<span class="muted">No es miembro (hay que saber escribir)</span>'}${member && !delegateOf(n) ? ' · <span style="color:#e8a838">su delegado no habla la lengua común: no se entera de los debates</span>' : ''}</div>
    ${s && s.until > yearT ? `<div class="alert">Sancionados por ${esc(s.why)}: precios más altos y peores relaciones</div>` : ''}
    ${C.log.length ? `<ul class="log">${C.log.slice().reverse().slice(0, 4).map(e => `<li class="pol"><span class="d">día ${e.d}</span>${esc(e.txt.replace(`El ${COUNCIL_NAME} `, ''))}</li>`).join('')}</ul>` : ''}`;
}
