// Forja de Mundos · Vivienda: casas con dueño, compraventa, hipotecas, alquileres, desahucios y la ley de la vivienda
// ================= Vivienda =================
// Al principio el pueblo construye casas para todos con lo que tiene en el almacén. Cuando crece y ya usa moneda,
// cada casa pasa a tener dueño: las nuevas se venden (con vivienda pública, se dan a quien no tiene), quien tiene
// mucho dinero compra más para alquilarlas y quien no puede pagar el alquiler acaba en la calle.
// Cada gobierno hace su política: unos construyen mucha vivienda pública y otros lo dejan todo al mercado.
const HOUSING_POP = 14; // a partir de cuántos habitantes (y con moneda) la vivienda deja de ser de todos
const FOR_SALE = -1, PUBLIC = 0; // en una escritura, «o» es el pid del dueño, o una de estas dos
const deedsOf = g => g.deeds ||= {};
const deedOf = (g, h) => deedsOf(g)[h];
const housingOn = g => !!(g && g.coin && g.housing);
const familyOf = (a, b) => a === b || [...(a.partners || []), ...(a.parents || []), ...(a.kids || [])].includes(b);
function peopleByPid(g){ const m = new Map(); for (const u of villagers) if (!u.dead && u.vid === g.id) m.set(pidOf(u), u); return m; }
const residentsOf = h => villagers.filter(u => !u.dead && u.home === h);
const ownedBy = (g, v) => housesOf(g).filter(h => { const d = deedOf(g, h); return d && d.o === pidOf(v); });
const forSaleOf = g => housesOf(g).filter(h => { const d = deedOf(g, h); return d && d.o === FOR_SALE; });
// Precio de una casa: unos 2 días de sueldo medio, más de lo que suele ahorrar la gente (la de piedra, la mitad más); sube cuanta más gente se queda sin casa y con el libre mercado
const housePrice = (g, h, stone = !!(world.objs[h] && world.objs[h].key === 'house:piedra')) => Math.max(4, Math.round(Math.max(priceOf(g) * 13, (g.hWage || 0) * 2) * (stone ? 1.5 : 1) * (g.hDem || 1)
  * (hasLaw(g, 'mercado_vivienda') ? 1.15 : hasLaw(g, 'vivienda_publica') ? .9 : 1)));
// Alquiler de un día por persona adulta; con tope, no pasa de una parte del coste de la vida
const rentOf = (g, h) => { const r = Math.max(1, Math.round(housePrice(g, h) * .06)); return hasLaw(g, 'tope_alquiler') ? Math.min(r, Math.max(1, Math.round(costOfLiving(g) * .2))) : r; };
const socialRent = g => hasLaw(g, 'vivienda_publica') ? 0 : Math.max(1, Math.round(costOfLiving(g) * .1)); // lo que se paga al pueblo por una casa pública
const adultV = v => ageOf(v) >= ADULT_H;
// Hipoteca: entrada del 30 %; el resto, con un 10 % de intereses, en 15 cuotas diarias. El banco solo la da si la cuota
// no pasa del 40 % del sueldo de quien compra
const MORT_DOWN = .3, MORT_INT = 1.1, MORT_DAYS = 15;
const mortgageOf = p => { const owed = Math.round((p - Math.ceil(p * MORT_DOWN)) * MORT_INT); return { down:Math.ceil(p * MORT_DOWN), owed, q:Math.max(1, Math.ceil(owed / MORT_DAYS)) }; };
function howBuy(g, u, p){ // 'contado', 'hipoteca' o null
  if ((u.money || 0) >= p) return 'contado';
  if (!hasBank(g)) return null;
  const m = mortgageOf(p); return (u.money || 0) >= m.down && u.wage != null && m.q <= wageDay(u) * .4 ? 'hipoteca' : null;
}
// Quién podría comprar ahora mismo: sin casa propia (al contado, o con hipoteca si hay banco) o con mucho dinero para invertir
const ownersOf = g => { const s = new Set(); for (const h of housesOf(g)) { const d = deedOf(g, h); if (d && d.o > 0) s.add(d.o); } return s; };
function buyersOf(g, people){
  const p = housePrice(g), owners = ownersOf(g);
  return people.filter(u => adultV(u) && !u.away && (owners.has(pidOf(u)) ? (u.money || 0) >= p * (hasLaw(g, 'tope_alquiler') ? 2.5 : 1.5) : howBuy(g, u, p)));
}
// Cuántas casas hacen falta según la política del gobierno (lo usa chooseJob al decidir si se construye)
function houseNeed(g, pop){
  if (g.needT != null && Math.abs(yearT - g.needT) < 2) return g.need; g.needT = yearT; // se recalcula cada poco, no en cada decisión
  return g.need = houseNeed0(g, pop);
}
function houseNeed0(g, pop){
  if (hasLaw(g, 'vivienda_publica') || hasLaw(g, 'estatal')) return houseCap(g) < pop + 8; // el gobierno construye de sobra
  const ppl = villagers.filter(u => !u.dead && u.vid === g.id), demand = buyersOf(g, ppl).length - forSaleOf(g).length - busyWith(g, 'construir');
  if (hasLaw(g, 'mercado_vivienda')) return demand > 0; // solo se construye lo que alguien va a comprar
  return houseCap(g) < pop + 2 || demand > 0;
}
// Casa nueva: pública o en venta, según la ley
function newDeed(g, h){
  if (!housingOn(g)) return;
  const pub = hasLaw(g, 'vivienda_publica') || hasLaw(g, 'estatal');
  deedsOf(g)[h] = { o:pub ? PUBLIC : FOR_SALE };
  if (pub && !g.pubMsg) { g.pubMsg = true; notify(`${g.name} construye su primera vivienda pública: la ocupará quien no tenga casa`, { x:(h % W) * T, y:((h / W) | 0) * T }); }
}
// ¿Puede vivir v en la casa h? La suya o la de su familia; una pública; una en venta si ya vivía allí; o de alquiler si puede pagarlo
function canLive(v, g, h, byPid){
  const d = deedOf(g, h); if (!d || d.o === PUBLIC) return true;
  if (d.o === FOR_SALE) return v.home === h;
  const o = byPid.get(d.o); if (!o || familyOf(v, o)) return true;
  return !adultV(v) || v.home === h || (v.money || 0) >= rentOf(g, h);
}
// Los niños viven con sus padres aunque la casa esté llena (se apretujan); los huérfanos los acoge la casa con más sitio, sin pagar
function kidHome(v, hs){
  const p = (v.parents || []).find(u => !u.dead && u.vid === v.vid && u.home != null && hs.includes(u.home));
  if (p) return v.home = p.home;
  if ((v.parents || []).some(u => !u.dead && u.vid === v.vid)) return v.home = null; // sus padres tampoco tienen casa: con ellos, a la hoguera
  if (v.home != null && hs.includes(v.home)) return v.home;
  let best = null, bf = -Infinity; for (const h of hs) { const f = houseRoom(h) - residentsOf(h).length; if (f > bf) { bf = f; best = h; } }
  return v.home = best;
}
// Cuando alguien consigue casa, sus hijos pequeños se van con él
function bringKids(v, hs){
  if (v.home == null) return;
  for (const k of v.kids || []) if (!k.dead && k.vid === v.vid && ageOf(k) < ADULT_H && (k.home == null || !hs.includes(k.home) || !(k.parents || []).some(u => !u.dead && u.home === k.home))) k.home = v.home;
}
// Casa donde duerme cada uno con el mercado de la vivienda: la suya, la de su familia, una pública y, si no, el alquiler más barato.
// Si aparece algo mejor que lo que tiene (se compra una casa, su familia se muda), se cambia
function homeMarket(v, g){
  const hs = housesOf(g), byPid = peopleByPid(g);
  if (!adultV(v)) return kidHome(v, hs);
  const famHomes = new Set([...(v.partners || []), ...(v.parents || []), ...(v.kids || [])].filter(u => !u.dead && u.home != null && u.home !== v.home).map(u => u.home));
  const score = h => {
    const d = deedOf(g, h), o = d && d.o > 0 ? byPid.get(d.o) : null;
    if (o === v) return 0;
    if ((o && familyOf(v, o)) || famHomes.has(h)) return 1;
    if (!d || d.o === PUBLIC || (d.o > 0 && !o)) return 2;
    if (d.o === FOR_SALE) return v.home === h ? 2.5 : Infinity;
    return adultV(v) && (v.home === h || (v.money || 0) >= rentOf(g, h)) ? 3 + rentOf(g, h) * .01 : Infinity;
  };
  const cur = v.home != null && hs.includes(v.home) && canLive(v, g, v.home, byPid) ? score(v.home) : Infinity;
  let best = cur < Infinity ? v.home : null, bs = cur;
  if (cur > 0) for (const h of hs) {
    if (h === v.home || residentsOf(h).length >= houseRoom(h)) continue;
    const s = score(h); if (s < bs - .5) { bs = s; best = h; } // solo se muda si sale ganando de verdad
  }
  v.home = best; bringKids(v, hs);
  return best;
}
// Cómo vive cada uno (para su ficha)
function homeTxt(v, g){
  if (v.home == null || !world.objs[v.home]) return v.evictT != null && yearT - v.evictT < DAY_LEN * 3 ? 'desahuciad' + sexW(v, 'o', 'a') : 'sin casa';
  if (!housingOn(g)) return 'tiene casa';
  const d = deedOf(g, v.home), o = d && d.o > 0 ? peopleByPid(g).get(d.o) : null;
  if (o === v) return d.m > 0 ? `en su casa (hipoteca: le quedan ${d.m}, ${Math.min(d.m, d.q || 1)}/día${d.miss ? ` · ${d.miss} cuota${d.miss > 1 ? 's' : ''} sin pagar` : ''})` : 'en su casa';
  if (o && familyOf(v, o)) return 'en casa de su familia';
  if (!d || d.o === PUBLIC || !o) return 'en vivienda pública';
  return adultV(v) && v.rentPay ? `de alquiler (${v.rentPay}/día)` : 'de alquiler';
}
// ---- Cada cobro de impuestos: arranque del mercado, herencias, precios y compraventa; una vez al día, alquileres e hipotecas ----
function housingTick(g, people){
  const at = { x:g.fx * T, y:g.fy * T }, hs = housesOf(g), D = deedsOf(g);
  if (!g.housing) {
    if (popOf(g) < HOUSING_POP || hs.length < 4) return;
    g.housing = true;
    for (const h of hs) { // cada casa pasa a ser de quien vive en ella (el mayor); las vacías, al pueblo
      const owner = residentsOf(h).filter(adultV).sort((a, b) => a.born - b.born)[0];
      D[h] = { o:owner ? pidOf(owner) : hasLaw(g, 'vivienda_publica') || hasLaw(g, 'estatal') ? PUBLIC : FOR_SALE };
    }
    notify(hasLaw(g, 'vivienda_publica') || hasLaw(g, 'estatal') ? `${g.name} ha crecido: cada casa pasa a ser de quien vive en ella y el gobierno construirá vivienda pública para quien no tenga`
      : `${g.name} ha crecido: las casas ya no son de todos. Cada una pasa a ser de quien vive en ella y las nuevas se venden`, at);
  }
  const byPid = peopleByPid(g), ec = ecOf(g), pub = hasLaw(g, 'vivienda_publica') || hasLaw(g, 'estatal');
  // Escrituras de casas que ya no existen, casas sin escritura y dueños que han muerto o se han ido (heredan los hijos o la pareja)
  for (const k of Object.keys(D)) if (!hs.includes(+k)) delete D[k];
  for (const h of hs) {
    const d = D[h] ||= { o:pub ? PUBLIC : FOR_SALE };
    if (d.o > 0 && !byPid.has(d.o)) {
      const dead = villagers.find(u => u.pid === d.o), heir = dead && [...(dead.kids || []), ...(dead.partners || [])].find(u => !u.dead && u.vid === g.id && adultV(u));
      D[h] = heir ? { ...d, o:pidOf(heir), miss:0 } : { o:pub ? PUBLIC : FOR_SALE }; // el heredero se queda también con lo que falte de hipoteca
    }
  }
  // Economía estatal: el estado se queda con todas las casas
  if (hasLaw(g, 'estatal') && hs.some(h => D[h].o !== PUBLIC)) {
    const n = hs.filter(h => D[h].o > 0).length; for (const h of hs) D[h] = { o:PUBLIC };
    if (n) { notify(`En ${g.name} el estado expropia ${n} casa${n > 1 ? 's' : ''}: toda la vivienda pasa a ser pública`, at); g.anger = Math.min(100, (g.anger || 0) + 4); }
  }
  // Demanda: cuanta más gente sin casa y menos casas en venta, más caras
  const adults = people.filter(adultV), homeless = adults.filter(u => !u.away && (u.home == null || !hs.includes(u.home))).length, sale = forSaleOf(g);
  g.homelessKids = people.filter(u => !adultV(u) && !u.away && (u.home == null || !hs.includes(u.home))).length;
  g.homeless = homeless; g.hWage = wageStats(g).avg; // el sueldo medio marca lo que cuesta una casa
  g.hDem = clamp(1 + homeless / Math.max(6, adults.length) * 2.5 - sale.length * .12, .7, 2.5);
  // Compraventa: primero quien no tiene casa (al contado o con hipoteca), luego quien compra para alquilar. Una o dos por cobro
  let sold = 0;
  for (const h of sale.sort((a, b) => housePrice(g, a) - housePrice(g, b))) {
    if (sold >= 2) break;
    const p = housePrice(g, h);
    const firsts = adults.filter(u => !u.away && !ownedBy(g, u).length && howBuy(g, u, p)).sort((a, b) => (b.money || 0) - (a.money || 0));
    const inv = adults.filter(u => !u.away && ownedBy(g, u).length && (u.money || 0) >= p * (hasLaw(g, 'tope_alquiler') ? 2.5 : 1.5)).sort((a, b) => (b.money || 0) - (a.money || 0));
    const b = firsts[0] || inv[0]; if (!b) break;
    const mort = howBuy(g, b, p) === 'hipoteca', m = mortgageOf(p), loan = mort ? p - m.down : 0;
    b.money -= mort ? m.down : p; ec.treas += p; if (loan) ec.dep = Math.max(0, ec.dep - loan); // lo que falta lo adelanta el banco, con los ahorros de la gente
    D[h] = mort ? { o:pidOf(b), m:m.owed, q:m.q, miss:0 } : { o:pidOf(b) }; if (mort) g.mortgages = (g.mortgages || 0) + 1;
    sold++; g.houseSales = (g.houseSales || 0) + 1;
    if (!ownedBy(g, b).filter(x => x !== h).length && (b.home == null || !hs.includes(b.home))) b.home = h; // se muda
    const n = ownedBy(g, b).length;
    if (!g.saleMsg) { g.saleMsg = true; notify(`${b.name} compra la primera casa que se vende en ${g.name} por ${p} ${coinPl(g)}${loan > 0 ? ' (con hipoteca del banco)' : ''}`, at); }
    else if (n === 2 && !g.landMsg) { g.landMsg = true; notify(`${b.name} compra una segunda casa en ${g.name} para alquilarla: aparecen los caseros`, at); }
    else if (n >= 4 && (b.bigMsg || 0) < n) { b.bigMsg = n; notify(`${b.name} ya es ${sexW(b, 'dueño', 'dueña')} de ${n} casas en ${g.name}`, at); }
  }
  // Una vez al día: hipotecas, alquileres y desahucios
  const day = Math.floor(yearT / DAY_LEN); if (g.hDay === day) return; g.hDay = day;
  let evicted = 0, repo = 0;
  for (const h of hs) {
    const d = D[h], o = d.o > 0 ? byPid.get(d.o) : null;
    if (o && d.m > 0) { // la cuota de la hipoteca
      const q = Math.min(d.m, d.q || Math.max(1, Math.ceil(d.m / MORT_DAYS)));
      if ((o.money || 0) >= q) { o.money -= q; d.m -= q; ec.dep += q; d.miss = 0; if (d.m <= 0) { delete d.m; delete d.q; delete d.miss; } } // pagada del todo: la casa ya es suya
      else if ((d.miss = (d.miss || 0) + 1) >= 3) { D[h] = { o:FOR_SALE }; repo++; g.repos = (g.repos || 0) + 1; o.ideo = clamp((o.ideo || 0) - .1, -1, 1); continue; } // tres cuotas sin pagar: el banco se queda la casa
    }
    for (const u of residentsOf(h)) {
      if (!adultV(u) || u.away) continue;
      if (u.okupa === h) { u.rentPay = 0; u.rentMiss = 0; continue; } // okupas: no pagan (okupas.js)
      if (o && familyOf(u, o)) { u.rentPay = 0; continue; }
      if (!o) { const r = socialRent(g); u.rentPay = r; if (r && (u.money || 0) >= r) { u.money -= r; ec.treas += r; } continue; } // pública (o en venta con inquilinos): se paga al pueblo, sin desahucios
      const ct = d.ct && d.ct.find(c => c.p === pidOf(u)), r = ct ? ct.r : rentOf(g, h); u.rentPay = r; // con contrato, lo pactado (okupas.js)
      if ((u.money || 0) >= r) { u.money -= r; o.money = (o.money || 0) + r; o.rentIn = (o.rentIn || 0) + r; u.rentMiss = 0; o.ideo = clamp((o.ideo || 0) + .004, -1, 1); }
      else if (++u.rentMiss >= (hasLaw(g, 'tope_alquiler') ? 3 : 2)) { // no paga: a la calle
        u.home = null; u.rentMiss = 0; u.evictT = yearT; evicted++; u.ideo = clamp((u.ideo || 0) - .08, -1, 1);
      }
    }
  }
  if (evicted) { g.evictions = (g.evictions || 0) + evicted; g.evictT = yearT; if (yearT - (g.evMsgT ?? -1e9) > DAY_LEN) { g.evMsgT = yearT; notify(`En ${g.name} desahucian a ${evicted} persona${evicted > 1 ? 's' : ''} que no podía${evicted > 1 ? 'n' : ''} pagar el alquiler`, at); } }
  if (repo) notify(`El banco de ${g.name} embarga ${repo} casa${repo > 1 ? 's' : ''} por hipotecas sin pagar y la${repo > 1 ? 's' : ''} pone a la venta`, at);
}
// Descontento por la vivienda: gente sin casa y desahucios recientes
const housingGrief = g => housingOn(g) ? Math.min(.9, (g.homeless || 0) / Math.max(4, popOf(g)) * 1.6 + (yearT - (g.evictT ?? -1e9) < DAY_LEN * 2 ? .15 : 0)) : 0;
// Ánimo de cada persona por su casa
function housingMood(v, g, add){
  if (!housingOn(g) || !adultV(v)) return;
  if (v.evictT != null && yearT - v.evictT < DAY_LEN * 3) add(-15, 'le han desahuciado');
  if (v.home == null) return;
  const d = deedOf(g, v.home);
  if (d && d.o === pidOf(v)) add(4, d.m > 0 ? 'paga la hipoteca de su casa' : 'es ' + sexW(v, 'dueño', 'dueña') + ' de su casa');
  else if (v.rentPay && v.wage != null && v.rentPay > wageDay(v) * .35) add(-6, 'el alquiler se le come el sueldo');
}
// Panel de economía del pueblo: el mercado de la vivienda
function housingCard(g){
  if (!housingOn(g)) return g.coin ? `<h4>Vivienda</h4><div class="muted">Las casas aún son de todos: cuando el pueblo llegue a ${HOUSING_POP} habitantes, cada una tendrá dueño.</div>` : '';
  const hs = housesOf(g), D = deedsOf(g), byPid = peopleByPid(g), sale = forSaleOf(g).length, pubN = hs.filter(h => D[h] && D[h].o === PUBLIC).length;
  const own = new Map(); for (const h of hs) if (D[h] && D[h].o > 0) own.set(D[h].o, (own.get(D[h].o) || 0) + 1);
  const big = [...own].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]), top = big[0] && byPid.get(big[0][0]);
  const tenants = hs.reduce((a, h) => { const o = D[h] && D[h].o > 0 ? byPid.get(D[h].o) : null; return a + (o ? residentsOf(h).filter(u => adultV(u) && !familyOf(u, o)).length : 0); }, 0);
  const policy = hasLaw(g, 'estatal') ? 'toda la vivienda es del estado' : hasLaw(g, 'vivienda_publica') ? 'el gobierno construye vivienda pública' : hasLaw(g, 'mercado_vivienda') ? 'libre mercado: el gobierno no construye' : 'se venden las casas nuevas';
  return `<h4>Vivienda</h4><div class="sec">
    <div class="kv"><span>Política</span><b>${policy}${hasLaw(g, 'tope_alquiler') ? ' · alquileres con tope' : ''}</b></div>
    <div class="kv"><span>Precio de una casa</span><b>${housePrice(g)} ${coinPl(g)} <span class="muted">(de piedra, ${housePrice(g, null, true)})</span></b></div>
    <div class="kv"><span>Alquiler al día</span><b>${rentOf(g)} ${coinPl(g)} por persona</b></div>
    <div class="kv"><span>Casas</span><b>${hs.length} · ${pubN} públicas · ${sale} en venta · ${own.size} propietarios</b></div>
    <div class="kv"><span>Inquilinos</span><b>${tenants}${big.length ? ` · ${big.length} casero${big.length > 1 ? 's' : ''}${top ? ` (${esc(top.name)}, ${big[0][1]} casas)` : ''}` : ''}</b></div>
    ${hasBank(g) || g.mortgages ? `<div class="kv"><span>Hipotecas</span><b>${hs.filter(h => D[h] && D[h].m > 0).length} pagándose · quedan ${hs.reduce((a, h) => a + (D[h] && D[h].m > 0 ? D[h].m : 0), 0)} ${coinPl(g)} por pagar${g.repos ? ` · ${g.repos} embargo${g.repos > 1 ? 's' : ''}` : ''}<br><span class="muted">entrada del 30 %, el resto con un 10 % de intereses en ${MORT_DAYS} días; solo si la cuota no pasa del 40 % del sueldo</span></b></div>` : ''}
    <div class="kv"><span>Sin casa</span><b>${g.homeless ? `<span style="color:#f08a7a">${g.homeless}</span>` : 0}${g.homelessKids ? ` <span style="color:#f08a7a">(y ${g.homelessKids} niño${g.homelessKids > 1 ? 's' : ''})</span>` : ''}${g.evictions ? ` · ${g.evictions} desahucio${g.evictions > 1 ? 's' : ''} en total` : ''}</b></div></div>`;
}
// ---- Acampada por la vivienda: tiendas en la plaza donde duermen los que no tienen casa, hasta que haya casas o los desalojen ----
function startCamp(g, who){
  const r0 = g.plaza; if (!r0 || g.camp) return;
  const tents = clamp(2 + Math.round((g.homeless || who.length) / 2), 3, 7);
  g.camp = { vid:g.id, x:Math.round((r0.x0 + r0.x1 + 1) / 2 * T), y:Math.round((r0.y0 + r0.y1 + 1) / 2 * T) + 3, tents, hide:true, seed:Math.random() * 6, until:yearT + DAY_LEN * 3, done:false };
  warCamps.push(g.camp);
  notify(`Los que no tienen casa en ${g.name} acampan en la plaza con ${tents} tiendas: no se irán hasta que haya vivienda para todos`, { x:g.camp.x, y:g.camp.y });
}
function endCamp(g, why){
  if (!g.camp) return; g.camp.done = true; const at = { x:g.camp.x, y:g.camp.y }; g.camp = null;
  notify(why === 'desalojo' ? `La policía desaloja a la fuerza la acampada de la plaza de ${g.name}` : why === 'casas' ? `Levantan la acampada de ${g.name}: ya hay casa para todos` : `Tras días en la plaza, se levanta la acampada de ${g.name}`, at);
}
function campTick(g){
  const c = g.camp; if (!warCamps.includes(c)) warCamps.push(c); // tras cargar una partida
  if (yearT > c.until) return endCamp(g, 'tiempo');
  if (housingGrief(g) < .05 && !g.protest) return endCamp(g, 'casas');
  if (!isNight() && Math.random() < .004) floats.push({ x:c.x + (Math.random() - .5) * 26, y:c.y - 14, txt:SLOGANS.vivienda[Math.floor(Math.random() * SLOGANS.vivienda.length)], col:'#f8f0d8', life:0 });
}
// Sitio para dormir en la acampada (alrededor de las tiendas)
const campSpot = (v, g) => { const c = g.camp; if (!c || c.done) return null; const a = pidOf(v) * 40, r = 6 + (pidOf(v) * 97 % 1) * 8; return [c.x + Math.cos(a) * r * 1.6, c.y + Math.sin(a) * r]; };
// ---- Disturbios: si están muy enfadados (o ya han protestado tres veces por lo mismo sin arreglo), queman cosas ----
function riotTargets(g){
  const byPid = peopleByPid(g), D = deedsOf(g), t = [];
  if (g.grief === 'vivienda') { // primero, las casas de los caseros
    const own = new Map(); for (const h of housesOf(g)) if (D[h] && D[h].o > 0) own.set(D[h].o, [...(own.get(D[h].o) || []), h]);
    for (const [pid, hs] of own) if (hs.length >= 2) for (const h of hs) if (!residentsOf(h).some(u => u.pid === pid)) t.push([h, `la casa de ${byPid.get(pid) ? byPid.get(pid).name : 'un casero'}, que la alquila`]);
    if (hasBank(g)) t.push([g.bank, 'el banco']);
  }
  if (g.hall != null) t.push([g.hall, 'el ayuntamiento']);
  if (g.grief !== 'vivienda' && hasBank(g)) t.push([g.bank, 'el banco']);
  if (g.market != null) t.push([g.market, 'el mercado']);
  return t.filter(([i]) => i != null && world.objs[i] && !world.objs[i].burnt && !fires.has(i));
}
function riotTick(g, p, live){
  if ((p.fires || 0) >= 3 || !live.length || yearT < (p.riotT ?? -1e9) + 5 || raining(g.fy * W + g.fx)) return;
  const tg = riotTargets(g); if (!tg.length) return;
  const [i, what] = Math.random() < .7 ? tg[0] : tg[Math.floor(Math.random() * tg.length)], u = live[Math.floor(Math.random() * live.length)];
  p.riotT = yearT; p.fires = (p.fires || 0) + 1;
  fires.set(i, { t:0, life:10 + Math.random() * 3, tree:true, bld:true });
  floats.push({ x:u.x, y:u.y - 16, txt:'¡A quemarlo!', col:'#ffb060', life:0 });
  g.riots = (g.riots || 0) + 1;
  notify(`¡Disturbios en ${g.name}! Los manifestantes, furiosos, prenden fuego a ${what}`.replace(' a el ', ' al '), { x:(i % W) * T + 2, y:((i / W) | 0) * T + 3 });
}
