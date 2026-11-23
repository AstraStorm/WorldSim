// Forja de Mundos · Arreglar la economía antes de la bancarrota: planes del gobierno y rescates de otros países
// ================= Rescates =================
// Cuando la deuda se acerca al límite o los precios se disparan, el gobierno pone en marcha un plan (uno a la vez):
//  · subir los tipos: el banco frena la inflación (los precios se calman, la gente gasta menos)
//  · rescate: un país amigo y rico (o el Consejo de las Naciones) presta para pagar la deuda; se le devuelve poco a
//    poco y a cambio se piden recortes
//  · recortes (los gobiernos de derechas): el gasto baja un tercio unos días; la gente se enfada
//  · impuesto a los ricos (los de izquierdas): los que más tienen pagan una parte
//  · vender lo que sobra: madera, piedra y comida de los almacenes, al tesoro
//  · reestructurar la deuda (con banco, si nada basta): se perdona la mitad y los ahorradores pierden algo
// Así la bancarrota pasa a ser el último recurso
const PLAN_TXT = { tipos:'subida de los tipos de interés', rescate:'rescate', recortes:'recortes', ricos:'impuesto a los ricos', venta:'venta de reservas', quita:'reestructuración de la deuda' };
const debtLimit = (g, ec, bank) => bank ? ec.dep * 1.5 + 40 * ec.P : 40 * ec.P;
const austerity = g => g.austerity > yearT ? .65 : 1;
// Un país que pueda prestar: rico, amigo y en paz con el que lo pide
function rescuer(g, need){
  const C = typeof council === 'function' ? council() : null;
  const cands = villages.filter(o => o !== g && popOf(o) && nationOf(o) === o && o.coin && ecOf(o).treas > 30 * ecOf(o).P && !sanctionedPair(g, o)) // (presta lo que puede, aunque no cubra toda la deuda).filter(o => { const r = rels.get(relKey(g, o)); return r && r.known && !r.war && (r.v > 15 || (C && C.members.includes(o.id) && C.members.includes(nationOf(g).id))); });
  return cands.sort((a, b) => ecOf(b).treas - ecOf(a).treas)[0] || null;
}
// (desde econTick, antes de mirar si hay bancarrota). Devuelve true si ha hecho algo
function econRescue(g, ec, people, bank){
  // Devolver lo que se debe a quien nos rescató
  for (const o of ec.owe || []) { const cr = villageById(o.to), pay = Math.min(o.amt, Math.max(0, ec.treas * .15)); if (pay > 0 && cr && ecOf(cr)) { ec.treas -= pay; ecOf(cr).treas += pay; o.amt -= pay; } }
  if (ec.owe) ec.owe = ec.owe.filter(o => o.amt > 1);
  const limit = debtLimit(g, ec, bank), risk = ec.debt / Math.max(1, limit), at = { x:g.fx * T, y:g.fy * T }, n = nationOf(g);
  if (g.ecPlan && g.ecPlan.until > yearT && risk < 1.1) return false; // un plan en marcha: se espera a ver si funciona
  const ideo = govIdeo(g), adults = people.filter(u => ageOf(u) >= ADULT_H);
  const plan = (k, txt, days = 3) => { g.ecPlan = { k, until:yearT + DAY_LEN * days, d:Math.floor(yearT / DAY_LEN) + 1 }; notify(`${g.name}: ${txt}`, at); (g.log ||= []).push({ d:g.ecPlan.d, txt:`Plan económico: ${PLAN_TXT[k]}` }); return true; };
  // Inflación desbocada: el banco sube los tipos
  if (ec.infl > .12 && bank) { ec.infl *= .45; g.anger = (g.anger || 0) + 3; return plan('tipos', `el banco sube los tipos de interés para frenar la inflación (los precios suben un ${Math.round(ec.infl / .45 * 100)} %)`, 2); }
  if (risk < .75 && ec.treas >= 0) return false;
  const need = Math.max(ec.debt - limit * .5, -ec.treas, 10 * ec.P);
  // 1) Vender lo que sobra en los almacenes
  const pop = Math.max(1, people.length), surplus = Math.max(0, g.wood - 40) + Math.max(0, (g.stone || 0) - 40) + Math.max(0, g.food - pop * 5);
  if (surplus > 30 && !(g.ecPlan && g.ecPlan.k === 'venta' && yearT - g.ecPlan.until < DAY_LEN)) {
    const w = Math.max(0, g.wood - 40) * .6, s = Math.max(0, (g.stone || 0) - 40) * .6, f = Math.max(0, g.food - pop * 5) * .6, cash = Math.round((w + s + f) * ec.P * .5);
    g.wood -= w; g.stone -= s; g.food -= f; ec.treas += cash; const p = Math.min(ec.debt, Math.max(0, ec.treas)); ec.debt -= p; ec.treas -= p;
    return plan('venta', `el gobierno vende lo que sobra en los almacenes (${Math.round(w + s + f)} de madera, piedra y comida) y saca ${cash} ${g.coin} para pagar deudas`, 1);
  }
  // 2) Rescate de un país amigo
  const o = rescuer(g, need);
  if (o && risk > .9) {
    const eo = ecOf(o), amt = Math.round(Math.min(need, eo.treas * .4)); eo.treas -= amt; const p = Math.min(ec.debt, amt); ec.debt -= p; ec.treas += amt - p;
    (ec.owe ||= []).push({ to:o.id, amt:Math.round(amt * 1.1) }); g.austerity = yearT + DAY_LEN * 3; g.anger = (g.anger || 0) + 5;
    const r = relOf(g, o); r.v = Math.min(100, r.v + 8); moneyFlow(o, g, `rescate de ${amt} ${o.coin}`);
    return plan('rescate', `¡rescate! ${o.name} le presta ${amt} ${o.coin} para salvarse de la bancarrota; a cambio, recortes durante unos días`, 3);
  }
  // 3) Según quién gobierna: recortes o impuesto a los ricos
  if (ideo > .05 || regimeOf(n) === 'oligarquia') { g.austerity = yearT + DAY_LEN * 3; g.anger = (g.anger || 0) + 8; return plan('recortes', 'el gobierno anuncia recortes: menos gasto en todo durante unos días para pagar la deuda'); }
  if (adults.length) {
    const rich = adults.slice().sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, Math.max(1, Math.round(adults.length * .2))); let got = 0;
    for (const u of rich) { const t = Math.floor((u.money || 0) * .15); u.money -= t; got += t; }
    if (got > 0) { ec.treas += got; const p = Math.min(ec.debt, Math.max(0, ec.treas)); ec.debt -= p; ec.treas -= p; g.anger = (g.anger || 0) + 3; return plan('ricos', `impuesto especial a los ricos: los que más tienen pagan ${got} ${g.coin} para sanear las cuentas`); }
  }
  // 4) Lo último: reestructurar la deuda
  if (bank && risk > 1.05) {
    const lost = Math.round(ec.dep * .15); ec.debt *= .5; ec.dep -= lost; g.anger = (g.anger || 0) + 12;
    return plan('quita', `el gobierno reestructura la deuda: se perdona la mitad y los ahorradores pierden ${lost} ${g.coin}`, 4);
  }
  return false;
}
// En la ficha (pestaña Economía)
function rescueCard(g){
  const ec = ecOf(g); if (!ec) return '';
  const P = g.ecPlan && g.ecPlan.until > yearT ? g.ecPlan : null, owe = (ec.owe || []).filter(o => o.amt > 1);
  if (!P && !owe.length && !(g.austerity > yearT)) return '';
  return `<h4>Plan económico</h4><div class="sec">${P ? `<div class="kv"><span>En marcha</span><b>${PLAN_TXT[P.k]} (desde el día ${P.d})</b></div>` : ''}${g.austerity > yearT ? '<div class="kv"><span>Recortes</span><b>el gasto, un tercio menos</b></div>' : ''}${owe.map(o => `<div class="kv"><span>Debe a ${esc((villageById(o.to) || {}).name || '?')}</span><b>${Math.round(o.amt)} ${esc(g.coin)}</b></div>`).join('')}</div>`;
}
