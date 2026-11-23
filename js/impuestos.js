// Forja de Mundos · Impuestos: cada pueblo va creando (y quitando) impuestos según lo que necesita y quién gobierna
// ================= Impuestos =================
// Siempre hay uno sobre lo que tiene cada uno (su porcentaje depende del régimen y de las leyes). Además, el gobierno
// crea impuestos cuando hay guerra, deudas o le falta dinero varios días seguidos, y elige cuál según sus ideas:
// la izquierda grava a quien más tiene (patrimonio, casas, caseros) y la derecha a todos por igual (por cabeza, diezmo).
// Cuando sobra dinero, o llega un gobierno de ideas contrarias, los quita. Cada impuesto guarda por qué se creó.
const TAXES = {
  guerra:     { name:'Impuesto de guerra', what:'+4 % sobre lo que tiene cada uno', lean:0 },
  deuda:      { name:'Recargo por la deuda', what:'+3 % sobre lo que tiene cada uno', lean:0 },
  patrimonio: { name:'Impuesto sobre el patrimonio', what:'cada día, el 10 % de lo que pase de 10 comidas de dinero', lean:-.6 },
  casas:      { name:'Impuesto sobre las casas', what:'cada día, el precio de una comida por cada casa que se tiene', lean:-.2 },
  alquileres: { name:'Impuesto a los caseros', what:'cada día, el 20 % de lo que se cobra de alquiler', lean:-.5 },
  cabeza:     { name:'Impuesto por cabeza', what:'cada día, el precio de una comida por cada adulto, tenga lo que tenga', lean:.6 },
  diezmo:     { name:'Diezmo', what:'cada día, el 5 % de lo que tiene cada uno, para los templos', lean:.5 },
};
const taxesOf = g => g.taxes ||= [];
const hasTax = (g, k) => taxesOf(g).some(t => t.k === k);
// Lo que suben los impuestos de guerra y de la deuda al porcentaje de siempre (lo usa taxRateOf)
const taxRateExtra = g => (hasTax(g, 'guerra') ? .04 : 0) + (hasTax(g, 'deuda') ? .03 : 0);
// Malestar: cada impuesto de más molesta un poco; el de por cabeza, más
const taxGrief = g => g.coin ? taxesOf(g).length * .03 + (hasTax(g, 'cabeza') ? .06 : 0) : 0;
function addTax(g, k, why){
  if (hasTax(g, k)) return;
  taxesOf(g).push({ k, why, d:Math.floor(yearT / DAY_LEN) + 1, last:0 });
  const txt = `${g.name} crea el ${TAXES[k].name.toLowerCase()} (${TAXES[k].what}) ${why}`; notify(txt, { x:g.fx * T, y:g.fy * T }); lawLog(g, txt);
}
function dropTax(g, k, why){
  if (!hasTax(g, k)) return;
  g.taxes = taxesOf(g).filter(t => t.k !== k);
  const txt = `${g.name} quita el ${TAXES[k].name.toLowerCase()}: ${why}`; notify(txt, { x:g.fx * T, y:g.fy * T }); lawLog(g, txt);
}
// Una vez al día: se cobran los impuestos diarios y el gobierno decide si crea o quita alguno
function taxDay(g, people, ec){
  const day = Math.floor(yearT / DAY_LEN); if (g.taxDay === day) return; g.taxDay = day;
  const P = ec.P, adults = people.filter(u => ageOf(u) >= ADULT_H && !u.away), at = { x:g.fx * T, y:g.fy * T };
  // Cobro
  for (const t of taxesOf(g)) {
    let sum = 0; const take = (u, n) => { n = Math.min(u.money || 0, Math.floor(n)); if (n > 0) { u.money -= n; sum += n; } };
    if (t.k === 'patrimonio') for (const u of adults) take(u, ((u.money || 0) - 10 * P) * .1);
    else if (t.k === 'cabeza') for (const u of adults) take(u, Math.max(1, P));
    else if (t.k === 'diezmo') for (const u of adults) take(u, (u.money || 0) * .05);
    else if (t.k === 'casas' && housingOn(g)) for (const u of adults) { const n = ownedBy(g, u).length; if (n) take(u, Math.max(1, P) * n); }
    else if (t.k === 'alquileres' && housingOn(g)) for (const u of adults) { const inc = (u.rentIn || 0) - (u.rentTaxed || 0); u.rentTaxed = u.rentIn || 0; if (inc > 0) take(u, inc * .2); }
    else continue; // guerra y deuda ya van en el porcentaje de cada cobro
    t.last = sum; ec.treas += sum;
  }
  // Guerra y deuda: mientras duren
  const war = [...rels.values()].find(r => r.war && (r.war.att === g.id || r.war.def === g.id || r.war.att === nationOf(g).id || r.war.def === nationOf(g).id));
  if (war && !hasTax(g, 'guerra')) { const foe = villageById(war.war.att === g.id || war.war.att === nationOf(g).id ? war.war.def : war.war.att); addTax(g, 'guerra', `para pagar la guerra${foe ? ` contra ${foe.name}` : ''}`); }
  else if (!war && hasTax(g, 'guerra')) dropTax(g, 'guerra', 'ya no hay guerra');
  if (ec.debt > 20 * P && !hasTax(g, 'deuda')) addTax(g, 'deuda', `para devolver los ${Math.round(ec.debt)} ${coinPl(g)} que deben al banco`);
  else if (ec.debt < 5 * P && hasTax(g, 'deuda')) dropTax(g, 'deuda', 'ya han pagado casi toda la deuda');
  // Déficit o superávit de los últimos días
  // Déficit: el tesoro está casi vacío o la deuda con el banco ha crecido desde ayer
  const deficit = ec.treas < 5 * P || ec.debt > (g.debtPrev ?? ec.debt) + P; g.debtPrev = ec.debt;
  g.deficitDays = deficit ? (g.deficitDays || 0) + 1 : 0;
  g.surplusDays = !deficit && ec.treas > (ec.lastSpend || 0) * 3 + 20 * P ? (g.surplusDays || 0) + 1 : 0;
  const gi = govIdeo(g), reg = regimeOf(g), extra = taxesOf(g).filter(t => !['guerra', 'deuda'].includes(t.k));
  const need = hasLaw(g, 'impuestos_altos') ? 1 : hasLaw(g, 'impuestos_bajos') ? 4 : 2;
  if (g.deficitDays >= need && extra.length < 4) {
    // Qué impuesto, según las ideas de quien manda (y lo que tenga sentido en el pueblo)
    const landlords = housingOn(g) && adults.filter(u => ownedBy(g, u).length >= 2).length;
    const opts = Object.entries(TAXES).filter(([k]) => !['guerra', 'deuda'].includes(k) && !hasTax(g, k)
      && (k !== 'diezmo' || (g.faith && (reg === 'teocracia' || hasLaw(g, 'fe'))))
      && (k !== 'casas' || housingOn(g)) && (k !== 'alquileres' || landlords));
    if (opts.length) {
      const w = opts.map(([k, d]) => Math.exp(-((d.lean - gi) ** 2) / .25) * (k === 'diezmo' && reg === 'teocracia' ? 3 : 1) * (k === 'alquileres' ? 1 + landlords * .3 : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0), k = opts[0][0]; for (let j = 0; j < opts.length; j++) if ((r -= w[j]) < 0) { k = opts[j][0]; break; }
      const why = k === 'alquileres' ? `porque falta dinero y ${landlords} casero${landlords > 1 ? 's' : ''} se lleva${landlords > 1 ? 'n' : ''} mucho con los alquileres`
        : k === 'patrimonio' ? 'porque falta dinero y quieren que pague más quien más tiene'
        : k === 'diezmo' ? `porque faltan fondos para los templos de ${g.faith.god}`
        : `para tapar el déficit (el tesoro tiene ${Math.round(ec.treas)} ${coinPl(g)}${ec.debt > P ? ` y deben ${Math.round(ec.debt)} al banco` : ''})`;
      addTax(g, k, why); g.deficitDays = 0;
    }
  } else if (g.surplusDays >= (hasLaw(g, 'impuestos_bajos') ? 1 : 3) && extra.length) {
    dropTax(g, extra[extra.length - 1].k, 'sobra dinero en el tesoro'); g.surplusDays = 0;
  } else for (const t of extra) if (Math.abs(TAXES[t.k].lean - gi) > 1 && Math.random() < .25) { dropTax(g, t.k, 'el gobierno de ahora no está de acuerdo con él'); break; }
}
// Por qué el impuesto de siempre está en ese porcentaje
function baseTaxWhy(g){
  const reg = regimeOf(g), w = [`${hasLaw(g, 'ejercito') || hasLaw(g, 'expansion') ? 12 : 7} % de base${hasLaw(g, 'ejercito') || hasLaw(g, 'expansion') ? ' (con ejército)' : ''}`];
  if (reg === 'comunismo') w.push('+25 % por el comunismo'); else if (reg === 'socialismo') w.push('+12 % por el socialismo'); else if (reg === 'monarquia') w.push('+4 % para la corona');
  if (hasLaw(g, 'impuestos_altos')) w.push('+8 % por la ley de impuestos altos'); if (hasLaw(g, 'impuestos_bajos')) w.push('−4 % por la ley de impuestos bajos');
  if (hasTax(g, 'guerra')) w.push('+4 % de guerra'); if (hasTax(g, 'deuda')) w.push('+3 % por la deuda');
  return w.join(' · ');
}
// Panel de economía: los impuestos del pueblo, qué cobran y por qué
function taxCard(g){
  const ts = taxesOf(g);
  return `<h4>Impuestos</h4><div class="sec">
    <div class="kv"><span>Sobre lo que tiene cada uno</span><b>${Math.round(taxRateOf(g) * 100)} % en cada cobro <span class="muted">(${baseTaxWhy(g)})</span></b></div>
    ${ts.map(t => `<div class="kv"><span>${TAXES[t.k].name}</span><b>${TAXES[t.k].what}${!['guerra', 'deuda'].includes(t.k) ? ` · ayer: ${t.last || 0} ${coinPl(g)}` : ''}<br><span class="muted">Desde el día ${t.d}, ${esc(t.why)}</span></b></div>`).join('')}
    ${ts.length ? '' : '<div class="muted">No hay más impuestos: crearán alguno si les falta dinero, hay guerra o deudas.</div>'}</div>`;
}
