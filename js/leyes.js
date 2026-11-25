// World Sim · Más leyes, con sus efectos
// ================= Leyes nuevas =================
// · Ley seca: la taberna cierra; la gente se enfada y aparece el alcohol de contrabando
// · Toque de queda: de noche nadie sale a divertirse; menos delitos, más enfado
// · Renta básica: cada día todos los adultos cobran algo del tesoro
// · Lotería nacional: el tesoro gana con los boletos y cada pocos días a alguien le toca un pellizco
// · Servicio militar: los jóvenes hacen la mili y reciben una lanza
// · Fomento del deporte: más instalaciones deportivas y más entrenamientos (deportes.js)
// · Más festivos: un día libre más a la semana
// · Protección de los animales: no hay batidas de caza y en los cercados se sacrifica menos
// · Libertad de prensa: los periódicos dicen lo que quieren (no casa con la censura); la gente se fía más
// · Impuesto a los ricos: los que más tienen pagan una parte cada día al tesoro
Object.assign(LAW_TXT, { ley_seca:'ley seca', toque_queda:'toque de queda', renta_basica:'renta básica', loteria:'lotería nacional', servicio_militar:'servicio militar',
  deporte:'fomento del deporte', entradas_gratis:'entradas gratis', mas_festivos:'más festivos', animales:'protección de los animales', libertad_prensa:'libertad de prensa', impuesto_ricos:'impuesto a los ricos' });
Object.assign(LAW_DESC, { ley_seca:'prohibido el alcohol: la taberna cierra, la gente se enfada y alguno lo vende a escondidas',
  toque_queda:'de noche nadie sale a divertirse: menos delitos, pero más enfado', renta_basica:'cada día todos los adultos cobran algo del tesoro, trabajen o no',
  loteria:'el tesoro gana con los boletos y cada pocos días a alguien le toca un buen pellizco', servicio_militar:'los jóvenes hacen la mili y reciben una lanza: más gente sabe defender el pueblo',
  deporte:'se construyen instalaciones deportivas antes y se entrena más', entradas_gratis:'ver los partidos y los Juegos no cuesta nada (el club y el tesoro no cobran taquilla)', mas_festivos:'un día libre más a la semana', animales:'no hay batidas de caza y se sacrifica menos ganado',
  libertad_prensa:'los periódicos dicen lo que quieren: la gente se fía más del gobierno (o se entera de todo)', impuesto_ricos:'los que más dinero tienen pagan una parte cada día al tesoro' });
Object.assign(LAW_LEAN, { ley_seca:.35, toque_queda:.6, renta_basica:-.65, loteria:.1, servicio_militar:.5, deporte:-.1, entradas_gratis:-.5, mas_festivos:-.4, animales:-.35, libertad_prensa:-.4, impuesto_ricos:-.6 });
LAW_CLASH.push(['libertad_prensa', 'censura'], ['impuesto_ricos', 'impuestos_bajos'], ['mas_festivos', 'jornada_larga'], ['renta_basica', 'impuestos_bajos']);
REGIME_LAWS.fascismo.push('servicio_militar', 'toque_queda'); REGIME_LAWS.dictadura.push('toque_queda'); REGIME_LAWS.comunismo.push('impuesto_ricos'); REGIME_LAWS.teocracia.push('ley_seca');
// Efectos que van con el tiempo (desde el ciclo de cada pueblo)
function lawsTick(g, dt, people){
  if ((g.lawT = (g.lawT ?? Math.random() * 30) - dt) > 0) return; g.lawT = 30; // cada 30 s (un sexto de día)
  const at = { x:g.fx * T, y:g.fy * T }, adults = people.filter(u => ageOf(u) >= ADULT_H), ec = ecOf(g);
  if (hasLaw(g, 'ley_seca')) { g.anger = (g.anger || 0) + .4; if (hasTavern(g) && Math.random() < .05 && !g.dryMsg) { g.dryMsg = true; notify(`En ${g.name} cierra la taberna por la ley seca; ya hay quien vende licor a escondidas`, at); } }
  if (hasLaw(g, 'toque_queda') && isNight()) g.anger = (g.anger || 0) + .2;
  if (hasLaw(g, 'libertad_prensa')) g.anger = Math.max(0, (g.anger || 0) - .15);
  if (ec) {
    if (hasLaw(g, 'renta_basica')) { const each = Math.max(1, Math.round(wageOf(g, 1) / 6)); for (const u of adults) u.money = (u.money || 0) + each; ec.treas -= each * adults.length; }
    if (hasLaw(g, 'impuesto_ricos')) { const rich = adults.slice().sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, Math.max(1, Math.round(adults.length * .1))); for (const u of rich) { const t = Math.floor((u.money || 0) * .03); u.money -= t; ec.treas += t; } }
    if (hasLaw(g, 'loteria') && adults.length) {
      ec.treas += adults.length * .3;
      if (Math.random() < .08) { const u = adults[Math.floor(Math.random() * adults.length)], prize = Math.round(wageOf(g, 1) * 8); u.money = (u.money || 0) + prize; ec.treas -= prize * .5; notify(`¡A ${u.name} le toca la lotería en ${g.name}: ${prize} ${g.coin}!`, { x:u.x, y:u.y }); floats.push({ x:u.x, y:u.y - 12, txt:'¡Lotería!', col:'#f0d060', life:0 }); }
    }
  }
  if (hasLaw(g, 'servicio_militar') && g.wood >= 1) { const u = adults.find(x => !x.weapon && ageOf(x) < (x.life || 20) * .45); if (u) { u.weapon = 'lanza'; g.wood -= 1; if (!g.miliMsg) { g.miliMsg = true; notify(`En ${g.name} empieza el servicio militar: los jóvenes reciben una lanza`, at); } } }
}

// ================= Leyes con sentido =================
// · Cada ley solo vale donde tiene sentido: las de la industria, con industria; las del deporte, con club o
//   instalaciones; las del casino, con casino; las de la moneda, con moneda... Mientras no lo tiene, la ley queda
//   «dormida» en el programa del gobierno y entra en vigor (con aviso) el día que lo tiene. Y no se proponen leyes sin sentido
// · Al votar una ley, cada persona mira lo que le toca: además de sus ideas, si le conviene o lo necesita (los obreros,
//   los patrones, los pobres, los ricos, los mayores, los que no tienen casa, los que tienen sed...)
const natAny = (g, f) => villages.some(o => popOf(o) && nationOf(o) === nationOf(g) && f(o));
const hasFacs = g => typeof facsOf === 'function' && facsOf(g).length > 0;
const LAW_REQ = {
  fomento_industria:g => natAny(g, industrial), libre_industria:g => natAny(g, industrial), carbon_estrategico:g => natAny(g, industrial),
  impuesto_carbon:g => natAny(g, o => industrial(o) || hasMine(o)), proteccion_aguas:g => natAny(g, hasFacs), nacionalizar_industria:g => natAny(g, hasFacs),
  derecho_huelga:g => natAny(g, o => !!o.union || hasFacs(o)), prohibir_huelgas:g => natAny(g, o => !!o.union || hasFacs(o)),
  deporte:g => natAny(g, o => !!o.club || popOf(o) >= 20), entradas_gratis:g => natAny(g, o => !!o.club),
  prohibir_juego:g => natAny(g, o => !!o.coin && popOf(o) >= 18), loteria:g => natAny(g, o => !!o.coin),
  salario_minimo:g => natAny(g, o => !!o.coin), renta_basica:g => natAny(g, o => !!o.coin), impuesto_ricos:g => natAny(g, o => !!o.coin), impuestos_altos:g => natAny(g, o => !!o.coin),
  impuestos_bajos:g => natAny(g, o => !!o.coin), pensiones:g => natAny(g, o => !!o.coin), aranceles:g => natAny(g, o => !!o.coin),
  vivienda_publica:g => natAny(g, housingOn), mercado_vivienda:g => natAny(g, housingOn), tope_alquiler:g => natAny(g, housingOn),
  libertad_prensa:g => natAny(g, o => hasPress(o)), censura:g => natAny(g, o => hasPress(o) || (o.know || {}).escritura),
  ley_seca:g => natAny(g, hasTavern), sanidad:g => natAny(g, o => hasHosp(o) || popOf(o) >= 15), educacion:g => natAny(g, o => hasSchool(o) || (o.know || {}).escritura),
  servicio_militar:g => natAny(g, o => hasBarracks(o) || popOf(o) >= 20), cuarentena:g => natAny(g, o => popOf(o) >= 12),
  autonomia:g => villages.filter(o => popOf(o) && nationOf(o) === nationOf(g)).length > 1,
  lengua_unica:g => natLangs(g) > 1, plurilinguismo:g => natLangs(g) > 1, reforma_lengua:g => natAny(g, o => (o.know || {}).escritura), pureza_lengua:g => natAny(g, o => (o.know || {}).escritura),
};
function natLangs(g){ const s = new Set(); for (const u of villagers) if (!u.dead && villageById(u.vid) && nationOf(villageById(u.vid)) === nationOf(g) && u.lang != null) s.add(u.lang); return s.size; }
// Caché por nación (cada 5 s de juego): qué leyes tienen sentido ahí
const lawFitC = new Map();
function lawAwake(g, l){
  const R = LAW_REQ[l]; if (!R) return true;
  const n = nationOf(g); if (!n) return true;
  let c = lawFitC.get(n.id); if (!c || c.w !== world || yearT - c.t > 5 || yearT < c.t) { c = { t:yearT, w:world, m:{} }; lawFitC.set(n.id, c); }
  return c.m[l] ??= !!R(n);
}
// Avisos: una ley del gobierno que estaba dormida entra en vigor (o se queda sin efecto)
const LAW_WHY = { fomento_industria:'ahora que hay industria', libre_industria:'ahora que hay industria', carbon_estrategico:'ahora que el carbón mueve las máquinas', impuesto_carbon:'ahora que se vende carbón',
  proteccion_aguas:'ahora que hay fábricas', nacionalizar_industria:'ahora que hay fábricas', derecho_huelga:'ahora que hay obreros', prohibir_huelgas:'ahora que hay obreros', entradas_gratis:'ahora que hay club',
  ley_seca:'ahora que hay taberna', libertad_prensa:'ahora que hay imprenta', vivienda_publica:'ahora que las casas se compran y se alquilan', tope_alquiler:'ahora que se pagan alquileres' };
function lawWakeTick(g){
  if (nationOf(g) !== g) return;
  const all = lawsOfAll(g), awake = new Set(all.filter(l => lawAwake(g, l))), prev = g.lawsAwake ? new Set(g.lawsAwake) : null;
  if (prev) for (const l of awake) if (!prev.has(l) && all.includes(l) && LAW_REQ[l] && g.lawsAll && g.lawsAll.includes(l)) notify(`En ${g.name} entra en vigor la ley de «${LAW_TXT[l]}» ${LAW_WHY[l] || 'ahora que tiene sentido'}`, { x:g.fx * T, y:g.fy * T });
  g.lawsAwake = [...awake]; g.lawsAll = all.slice();
}
{ const base = lawsTick; lawsTick = function(g, dt, people){ const due = (g.lawT ?? 0) - dt <= 0; base(g, dt, people); if (due) lawWakeTick(g); }; }
// ---- El voto con sentido: ideas + lo que le toca a cada uno ----
function lawNeed(u, g, law){
  const age = ageOf(u), adultsMoney = g.moneyMed ?? 0, m = u.money || 0, rich = m > adultsMoney * 2.5 && m > 30, poor = m < adultsMoney * .6, ob = u.oficio === 'obrero', boss = u.facBoss != null;
  const wage = typeof wageDay === 'function' && g.coin ? wageDay(u) : null, low = wage != null && wage < costOfLiving(g), old = u.life && age > u.life * .7, kids = villagers.some(k => !k.dead && (k.parents && (k.parents[0] === u || k.parents[1] === u)) && ageOf(k) < ADULT_H);
  const war = [...rels.values()].some(r => r.war && (r.war.att === nationOf(g).id || r.war.def === nationOf(g).id)), owner = u.home != null && typeof deedOf === 'function' && (deedOf(g, u.home) || {}).o === pidOf(u);
  switch (law) {
    case 'salario_minimo': return (low ? .8 : 0) + (ob ? .3 : 0) - (boss || rich ? .7 : 0);
    case 'renta_basica': return (poor ? .8 : 0) - (rich ? .7 : 0);
    case 'impuesto_ricos': case 'impuestos_altos': return (poor ? .6 : 0) - (rich ? 1 : 0);
    case 'impuestos_bajos': return (rich ? .8 : 0) - (poor ? .4 : 0);
    case 'pensiones': return old ? 1 : age < 30 ? -.2 : 0;
    case 'jornada_corta': return (ob ? .7 : .2) - (boss ? .8 : 0);
    case 'jornada_larga': return (boss ? .8 : 0) - (ob ? .9 : .3);
    case 'sanidad': return (u.sick ? .8 : 0) + (old ? .4 : 0) + (kids ? .3 : 0);
    case 'educacion': return kids ? .7 : 0;
    case 'vivienda_publica': case 'tope_alquiler': return (u.home == null ? 1 : owner ? -.3 : .5);
    case 'mercado_vivienda': return owner ? .6 : u.home == null ? -.7 : -.2;
    case 'fomento_industria': return (ob ? .7 : 0) + (boss ? .6 : 0) + (low ? .2 : 0);
    case 'nacionalizar_industria': return (ob && low ? .7 : ob ? .3 : 0) - (boss ? 1 : 0) - (rich ? .4 : 0);
    case 'libre_industria': return (boss ? .9 : 0) + (rich ? .3 : 0) - (ob ? .6 : 0);
    case 'derecho_huelga': return (ob ? .9 : 0) - (boss ? .9 : 0);
    case 'prohibir_huelgas': return (boss ? .9 : 0) - (ob ? 1 : 0);
    case 'proteccion_aguas': return (u.water < .45 ? .8 : 0) + (kids ? .2 : 0) - (boss ? .5 : 0);
    case 'carbon_estrategico': return ob ? .3 : 0;
    case 'servicio_militar': return (u.weapon ? .5 : 0) + (war ? .4 : 0) - (age < 25 && !u.weapon ? .6 : 0);
    case 'fortificacion': case 'ejercito': return (war ? .7 : 0) + (u.weapon ? .3 : 0);
    case 'paz': return war ? .7 : 0;
    case 'deporte': case 'entradas_gratis': return age < 30 ? .5 : 0;
    case 'ley_seca': return ((u.piety ?? .5) > .6 ? .5 : 0) - ((u.piety ?? .5) < .3 ? .4 : 0);
    case 'prohibir_juego': return (u.casRuin != null ? .9 : 0) - (u.gamb === 2 ? .9 : 0) - (u.casOwn ? 1 : 0);
    case 'loteria': return poor ? .4 : 0;
    case 'natalidad': return kids ? .4 : 0;
    case 'cuarentena': return villagers.some(k => !k.dead && k.vid === g.id && k.sick) ? .6 : -.2;
    case 'reparto': return (poor || u.food < .4 ? .8 : 0) - (rich ? .6 : 0);
    case 'pensiones_': return 0;
  }
  return 0;
}
function lawVote(u, g, law){
  const lang = langVote(u, g, law); if (lang != null) return lang;
  const s = .5 - Math.abs((u.ideo || 0) - LAW_LEAN[law]) * 1.1 + lawNeed(u, g, law) * .9 + (Math.random() - .5) * .2;
  return s > 0;
}
// Quién la ha apoyado más: para contarlo en la noticia
function lawWho(adults, g, law, yesSet){
  const grp = u => u.oficio === 'obrero' ? 'los obreros' : u.facBoss != null ? 'los patrones' : u.life && ageOf(u) > u.life * .7 ? 'los mayores' : (u.money || 0) > (g.moneyMed || 0) * 2.5 && (u.money || 0) > 30 ? 'los ricos' : (u.money || 0) < (g.moneyMed || 0) * .6 ? 'los más pobres' : ageOf(u) < 25 ? 'los jóvenes' : null;
  const t = {}; for (const u of adults) { const k = grp(u); if (!k) continue; (t[k] ||= [0, 0])[1]++; if (yesSet.has(u)) t[k][0]++; }
  const rows = Object.entries(t).filter(([, [y, n]]) => n >= 2).map(([k, [y, n]]) => [k, y / n]);
  const fav = rows.filter(r => r[1] >= .7).sort((a, b) => b[1] - a[1])[0], con = rows.filter(r => r[1] <= .3).sort((a, b) => a[1] - b[1])[0];
  return [fav && `a favor sobre todo ${fav[0]}`, con && `en contra ${con[0]}`].filter(Boolean).join('; ');
}
