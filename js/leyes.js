// Forja de Mundos · Más leyes, con sus efectos
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
