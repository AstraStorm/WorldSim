// World Sim · Empresas: sedes, CEO, plantilla, sueldos, beneficios, despidos y quiebras
// ================= Empresas =================
// · Con moneda y gente de sobra, en los pueblos nacen empresas de servicios (banca, grandes almacenes, constructoras,
//   transportes) y, con los avances, las de videojuegos, apps, radio y tele y productoras de cine (las de digital.js y
//   medios.js pasan a ser empresas de verdad). Cada una levanta su sede: un edificio de oficinas con su letrero
// · Tiene CEO (quien la funda, o el más preparado si falta; con su codicia, como los jefes de fábrica) y una plantilla de
//   oficinistas que cada turno van a la oficina y cobran según lo que paga la empresa; el CEO cobra varias veces más
// · Cada día: ingresos según el sector, la plantilla y cómo le va al pueblo (más lo que hacen sus juegos, apps,
//   audiencias o películas); gastos en sueldos; paga el impuesto de sociedades al tesoro. Con beneficios contrata y sube
//   sueldos (o, si el CEO es codicioso, se lleva un buen bonus); con pérdidas recorta sueldos y despide; sin caja, quiebra
// · Si el sueldo no da para vivir, la plantilla hace huelga hasta que se lo suben. Con economía estatal, las empresas son
//   del estado: todo el beneficio va al tesoro y el CEO cobra como un funcionario
// · Las fábricas (fabricas.js) también salen en la lista de empresas del pueblo, con su jefe y su cuadrilla
const SECTORS = {
  banca:{ ic:'🏦', txt:'banca y seguros', names:['Banco {F}', 'Seguros {F}', 'Caja {P}'], rev:7, col:'#3a6a9a', ok:g => g.bank != null && world.objs[g.bank] },
  comercio:{ ic:'🛍', txt:'grandes almacenes', names:['Almacenes {F}', 'Galerías {P}', 'El Corte de {P}'], rev:5.5, col:'#c84a4a', ok:g => g.market != null && popOf(g) >= 30 },
  constructora:{ ic:'🏗', txt:'construcción', names:['Construcciones {F}', 'Obras {P}', 'Inmobiliaria {F}'], rev:5.5, col:'#c8902a', ok:g => popOf(g) >= 40 },
  transporte:{ ic:'🚚', txt:'transportes', names:['Transportes {F}', 'Ferrocarriles de {P}', 'Aerolíneas {P}'], rev:6, col:'#4a8a5a', ok:g => knowsSci(nationOf(g), 'ferrocarril') || knowsSci(nationOf(g), 'aviacion') },
  videojuegos:{ ic:'🎮', txt:'videojuegos', rev:6, col:'#6a4aa8', ok:() => false },
  redes:{ ic:'📲', txt:'redes sociales', rev:6.5, col:'#2a7ac8', ok:() => false },
  medios:{ ic:'📺', txt:'radio y televisión', rev:4.5, col:'#c84a90', ok:() => false },
  cine:{ ic:'🎬', txt:'productora de cine', rev:4.5, col:'#8a2a3a', ok:() => false },
};
const COMP_SLOTS = 8, CEO_PAY = 4;
const compsOf = g => (g.comps ||= []);
const allComps = () => villages.flatMap(g => popOf(g) ? compsOf(g) : []);
const compById = id => { for (const g of villages) for (const c of (g.comps || [])) if (c.id === id) return c; return null; };
const compAt = v => v.compId != null ? compById(v.compId) : null;
if (typeof OFICIO_PAY !== 'undefined') OFICIO_PAY.oficinista = 1.25;
// Sedes: un edificio de oficinas (de momento con el dibujo de un bloque de pisos y el letrero de la empresa)
OBJ['office:sede'] = ['Oficinas', 'house', 0]; SPRITE_ALIAS['office:sede'] = 'house:bloque3';
BLD.add('office'); BUILD_DIMS.office = [4, 9];
if (typeof BLD_TYPE !== 'undefined') BLD_TYPE.office = 'Empresas';
if (typeof BLD_DESC !== 'undefined') BLD_DESC.office = 'Oficinas: la sede de una empresa, con su CEO y su plantilla';
if (typeof BARRIO_OF !== 'undefined') BARRIO_OF.office = 'comercio';
function officeSite(g){
  const R0 = typeof townRadius === 'function' ? townRadius(g) : 12;
  for (let r = 5; r <= R0 + 8; r += 1) for (let k = 0; k < 12; k++) {
    const a = Math.random() * Math.PI * 2, x = Math.round(g.fx + Math.cos(a) * r), y = Math.round(g.fy + Math.sin(a) * r);
    if (x < 6 || y < 12 || x >= W - 6 || y >= H - 3 || !tileFree(x, y)) continue;
    if (typeof zoneFree === 'function' ? zoneFree(x, y, 4, 9) : clearable(x - 4, y - 9, x + 4, y + 1)) return [x, y];
  }
  return null;
}
function buildHQ(g, c){
  const p = officeSite(g); if (!p) return false;
  const [x, y] = p, i = y * W + x; clearSite(g, x - 4, y - 9, x + 4, y + 1);
  if (!tileFree(x, y)) return false;
  world.objs[i] = { key:'office:sede', v:0, ox:0, oy:0, vid:g.id }; c.hq = i;
  composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y);
  return true;
}
const hqOk = c => c.hq != null && world.objs[c.hq] && world.objs[c.hq].key === 'office:sede';
// ---- Fundar ----
let compSeq = 0;
function foundCompany(g, sector, opt = {}){
  const S = SECTORS[sector], n = nationOf(g);
  const ceo = opt.ceo || villagers.filter(u => !u.dead && !u.away && u.vid === g.id && ageOf(u) >= ADULT_H && ageOf(u) < (u.life || 20) * .8 && u.compId == null && u.facBoss == null && !locked(u) && u !== g.leader)
    .sort((a, b) => ((b.money || 0) / 50 + (b.edu || 0) + trait(b, 'ambicion')) - ((a.money || 0) / 50 + (a.edu || 0) + trait(a, 'ambicion')))[0];
  if (!ceo) return null;
  const first = ceo.name.split(' ')[0], used = new Set(allComps().map(c => c.name));
  let name = opt.name; if (!name) { for (let k = 0; k < 6 && (!name || used.has(name)); k++) name = S.names[Math.floor(Math.random() * S.names.length)].replace('{F}', first).replace('{P}', g.name); if (used.has(name)) name += ' ' + (used.size + 1); }
  const c = { id:(world.compSeq = Math.max(world.compSeq || 0, compSeq) + 1), name, sector, vid:g.id, ceo, staff:[], pay:1.3, ceoPay:CEO_PAY, cash:20 * (ecOf(g).P || 1), rev:0, cost:0, profit:0, value:0, since:yearT, link:opt.link || null, log:[], hq:null, col:S.col };
  compSeq = c.id; ceo.compId = c.id; ceo.ceo = true; ceo.greed ??= Math.random();
  compsOf(g).push(c); const built = buildHQ(g, c);
  notify(`${S.ic} En ${g.name} nace «${name}» (${S.txt}): ${ceo.name} es su CEO${built ? ' y levantan sus oficinas' : ''}`, { x:g.fx * T, y:g.fy * T });
  return c;
}
// Las empresas de lo digital y los medios: se registran al nacer allí (estudios, apps, emisoras privadas, cine)
function linkCompanies(n){
  const towns = natTowns(n).filter(g => g.coin); if (!towns.length) return;
  const home = u => (u && towns.find(g => g.id === u.vid)) || towns[0];
  const have = new Set(allComps().map(c => c.link).filter(Boolean));
  for (const st of (n.studios || [])) { const L = 'st:' + n.id + ':' + st.name; if (!have.has(L)) foundCompany(home(st.founder), 'videojuegos', { name:st.name, ceo:st.founder && !st.founder.dead && st.founder.compId == null ? st.founder : null, link:L }); }
  for (const a of (typeof worldApps === 'function' ? worldApps() : []).filter(a => a.nat === n.id)) { const L = 'app:' + a.name; if (!have.has(L)) foundCompany(home(a.founder), 'redes', { name:`${a.name} S.A.`, ceo:a.founder && !a.founder.dead && a.founder.compId == null ? a.founder : null, link:L }); }
  const M = n.media; if (M) for (const o of [...M.radio, ...M.tv].filter(o => !o.official && !o.public)) { const L = 'md:' + o.name; if (!have.has(L)) foundCompany(home(o.host), 'medios', { name:`Grupo ${o.name}`, link:L }); }
  if ((n.films || []).length && !have.has('cine:' + n.id)) { const bw = typeof brandWord === 'function' ? brandWord(n) : ''; foundCompany(towns[0], 'cine', { name:`${bw.length >= 4 ? bw : n.name} Films`, link:'cine:' + n.id }); }
}
// Lo que deja lo enlazado hoy (ventas de juegos, usuarios de la app, audiencia, taquilla)
function linkRevenue(c, n){
  if (!c.link) return 0; const [k, a, b] = c.link.split(':');
  if (k === 'st') { const day = Math.floor(yearT / DAY_LEN) + 1; return (typeof worldGames === 'function' ? worldGames() : []).filter(G0 => G0.studio === b && day - G0.d <= 4).reduce((s, G0) => s + G0.sales * .02, 0); }
  if (k === 'app') { const ap = (typeof worldApps === 'function' ? worldApps() : []).find(x => x.name === a); return ap ? ap.total * .15 : 0; }
  if (k === 'md') { const o = n.media && [...n.media.radio, ...n.media.tv].find(x => x.name === a); return o ? o.aud * .1 : 0; }
  if (k === 'cine') { const day = Math.floor(yearT / DAY_LEN) + 1; return (n.films || []).filter(F => day - F.d <= 3).reduce((s, F) => s + F.box * .03, 0); }
  return 0;
}
// ---- Cada día: cuentas, decisiones del CEO, contratos y despidos ----
function companyDay(g, c){
  const n = nationOf(g), P = ecOf(g).P || 1, at = hqOk(c) ? { x:(c.hq % W) * T, y:((c.hq / W) | 0) * T } : { x:g.fx * T, y:g.fy * T }, S = SECTORS[c.sector];
  c.staff = c.staff.filter(u => !u.dead && u.vid === g.id && u.compId === c.id);
  if (!c.ceo || c.ceo.dead || c.ceo.vid !== g.id) { const nu = c.staff.slice().sort((a, b) => (b.edu || 0) - (a.edu || 0))[0] || villagers.filter(u => !u.dead && !u.away && u.vid === g.id && ageOf(u) >= ADULT_H && u.compId == null && u.facBoss == null && !locked(u) && u !== g.leader).sort((a, b) => ((b.edu || 0) + trait(b, 'ambicion')) - ((a.edu || 0) + trait(a, 'ambicion')))[0]; if (c.ceo) c.ceo.ceo = false; c.ceo = nu || null; if (nu) { nu.ceo = true; nu.compId = c.id; c.staff = c.staff.filter(u => u !== nu); nu.greed ??= Math.random(); c.log.push(`día ${Math.floor(yearT / DAY_LEN) + 1}: nuevo CEO, ${nu.name}`); notify(`${nu.name} es el nuevo CEO de «${c.name}»`, at); } else { companyBust(g, c, 'se queda sin nadie al frente'); return; } }
  const state = hasLaw(g, 'estatal') || hasLaw(g, 'nacionalizar_industria');
  if (state && !c.state) { c.state = true; c.ceoPay = 2; notify(`«${c.name}» pasa a ser del estado: el beneficio irá al tesoro`, at); } else if (!state && c.state) { c.state = false; c.ceoPay = CEO_PAY; }
  // Ingresos y gastos (en monedas)
  const prosper = clamp(g.food / Math.max(1, popOf(g) * 2), .7, 1.2) * (g.strike ? .6 : 1), wageBase = costOfLiving(g) * .9;
  const base = ((c.staff.length + 2) + popOf(g) * .04) * (S.rev / 3.5) * wageBase * prosper * (c.strikeT > yearT ? .3 : 1) + linkRevenue(c, n) * P; // (cada empleado produce más de lo que cobra; y el pueblo, cuanto más grande, más clientes)
  const cost = (c.staff.length * c.pay + c.ceoPay) * wageBase;
  c.rev = Math.round(base); c.cost = Math.round(cost); c.profit = c.rev - c.cost;
  const tax = c.profit > 0 ? Math.round(c.profit * (state ? 1 : hasLaw(g, 'impuestos_altos') ? .3 : hasLaw(g, 'impuestos_bajos') ? .1 : .18)) : 0;
  if (tax) ecOf(g).treas += tax; c.tax = tax; c.cash += c.profit - tax;
  const greedy = !state && (c.ceo.greed || 0) > .6, day = Math.floor(yearT / DAY_LEN) + 1, log = t => { c.log.push(`día ${day}: ${t}`); if (c.log.length > 6) c.log.shift(); };
  // Huelga: si el sueldo no da para vivir
  const net = c.pay * wageBase * (1 - (typeof taxRateOf === 'function' ? taxRateOf(g) : 0));
  if (c.staff.length >= 3 && net < costOfLiving(g) && !(c.strikeT > yearT) && Math.random() < .5) { c.strikeT = yearT + DAY_LEN * .6; log('huelga por los sueldos'); notify(`✊ Huelga en «${c.name}»: la plantilla dice que con ese sueldo no se puede vivir`, at); }
  if (c.strikeT && yearT > c.strikeT && net < costOfLiving(g)) { c.pay = +(c.pay * 1.15).toFixed(2); c.strikeT = null; log('sube los sueldos tras la huelga'); notify(`«${c.name}» sube los sueldos un 15 % y se acaba la huelga`, at); }
  // Decisiones del CEO
  if (c.profit > 0 && c.cash > cost * 2) {
    if (greedy && Math.random() < .5) { const b = Math.round(c.profit * .4); c.cash -= b; c.ceo.money = (c.ceo.money || 0) + b; c.bonus = (c.bonus || 0) + b; if (b > 20 * P && Math.random() < .3) { log(`el CEO se lleva un bonus de ${b}`); notify(`💰 El CEO de «${c.name}», ${c.ceo.name}, se lleva un bonus de ${b} ${typeof coinPl === 'function' ? coinPl(g) : ''} mientras la plantilla cobra lo mismo`, at); } }
    else if (c.staff.length >= 2 && Math.random() < .3) { c.pay = +(c.pay * 1.06).toFixed(2); log('sube los sueldos un 6 %'); }
    if (c.staff.length < COMP_SLOTS && Math.random() < .7) hire(g, c, 1 + (c.cash > cost * 5 ? 1 : 0));
  } else if (c.profit < 0) {
    c.lossDays = (c.lossDays || 0) + 1;
    if (c.lossDays >= 2 && c.staff.length) { const out = c.staff.splice(0, Math.max(1, Math.ceil(c.staff.length / 4))); for (const u of out) { u.compId = null; u.oficio = u.oldOficio || pickOficio(g); u.fired = yearT; } log(`despide a ${out.length}`); notify(`📉 «${c.name}» pierde dinero y despide a ${out.length} persona${out.length > 1 ? 's' : ''}`, at); c.lossDays = 0; }
    else if (c.pay > 1.05 && Math.random() < .4) { c.pay = +(c.pay * .93).toFixed(2); log('baja los sueldos'); }
  } else c.lossDays = 0;
  if (c.staff.length < 3 && c.cash > 0 && Math.random() < .7) hire(g, c, 1); // (la plantilla mínima para arrancar)
  if (c.cash < -40 * P) { companyBust(g, c, 'se ha quedado sin dinero'); return; }
  c.value = Math.max(0, Math.round(c.cash + Math.max(0, c.profit) * 8 + c.staff.length * 5 * P));
  if (!hqOk(c) && Math.random() < .3) buildHQ(g, c);
}
function hire(g, c, k){
  const adults = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && ageOf(u) >= ADULT_H && ageOf(u) < (u.life || 20) * .75 && u.compId == null && u.facBoss == null && u.oficio !== 'obrero' && !locked(u) && u !== g.leader && !(u.fired > yearT - DAY_LEN * 2) && !['maestro', 'curandero', 'sabio', 'bombero', 'sacerdote', 'soldado'].includes(u.oficio));
  const cnt = o => adults.filter(u => u.oficio === o).length;
  for (let j = 0; j < k && c.staff.length < COMP_SLOTS; j++) {
    const u = adults.filter(x => x.compId == null).sort((a, b) => ((b.edu || 0) + cnt(b.oficio) * .05) - ((a.edu || 0) + cnt(a.oficio) * .05))[0]; if (!u) return;
    u.oldOficio = u.oficio; u.oficio = 'oficinista'; u.compId = c.id; c.staff.push(u);
  }
  (g.staffKeep ||= {}).oficinista = yearT + DAY_LEN;
}
function companyBust(g, c, why){
  for (const u of c.staff) { u.compId = null; u.oficio = u.oldOficio || pickOficio(g); u.fired = yearT; }
  if (c.ceo) { c.ceo.compId = null; c.ceo.ceo = false; }
  g.comps = compsOf(g).filter(x => x !== c);
  notify(`💥 Quiebra «${c.name}»: ${why}. ${c.staff.length ? `${c.staff.length} persona${c.staff.length > 1 ? 's' : ''} a la calle` : ''}`, { x:g.fx * T, y:g.fy * T });
}
// Sueldo de la empresa (por encima del de su oficio)
{ const base = payMul; payMul = function(v, g){ const c = compAt(v); if (c && c.vid === g.id) return v.ceo && c.ceo === v ? c.ceoPay : c.pay; return base.apply(this, arguments); }; }
// En la ficha del aldeano: en qué empresa trabaja
const compTag = v => { const c = compAt(v); return !c ? '' : c.ceo === v ? ` · CEO de «${c.name}»` : ` en «${c.name}»`; };
// ---- El turno: a la oficina ----
let compClock = 0, compDayClock = 0;
SYSTEMS.push(dt => {
  if (!villages.length || !world) return;
  if ((compDayClock -= dt) <= 0) { compDayClock = 6; const day = Math.floor(yearT / DAY_LEN);
    for (const g of villages) { if (!popOf(g) || !g.coin || g.compDay === day) continue; g.compDay = day;
      const n = nationOf(g); if (n === g) linkCompanies(n);
      for (const c of compsOf(g).slice()) companyDay(g, c);
      // Nacen empresas de servicios (como mucho una cada dos días por pueblo, y una cada 25 habitantes)
      if (compsOf(g).length < Math.floor(popOf(g) / 25) && day - (g.compNew ?? -9) >= 2 && Math.random() < .35) {
        const opts = Object.keys(SECTORS).filter(k => SECTORS[k].ok(g) && !compsOf(g).some(c => c.sector === k)); if (opts.length) { g.compNew = day; foundCompany(g, opts[Math.floor(Math.random() * opts.length)]); }
      } } }
  if ((compClock -= dt) > 0) return; compClock = 3;
  for (const g of villages) {
    if (!popOf(g) || !g.comps || !g.comps.length || !inShift(g)) continue;
    for (const c of g.comps) {
      if (!hqOk(c) || c.strikeT > yearT) continue; const sb = standBy(c.hq); if (!sb) continue;
      for (const u of [c.ceo, ...c.staff]) {
        if (!u || u.dead || u.away || u.sleep || u.boat || locked(u) || u.water < .3 || u.food < .25 || (u.task && !['ocio', 'pasear'].includes(u.task.k)) || u.actT > 0) continue;
        if (u.task) releaseTask(u);
        u.task = { k:'oficina', x:sb[0] + (Math.random() - .5) * 8, y:sb[1] + Math.random() * 3, until:yearT + 22 }; u.lastD = Infinity;
      }
    }
  }
});
// ---- Lo que piensan ----
{ const base = thoughtOf; thoughtOf = function(v){
  const c = compAt(v);
  if (c && !v.sleep && Math.random() < .35) {
    if (c.ceo === v) return { txt:thPick(c.profit >= 0 ? ['Este trimestre ganaremos más', 'Hay que abrir mercado fuera', `«${c.name}» será la empresa más grande del mundo`] : ['Hay que recortar gastos', 'Malos tiempos para el negocio', '¿A quién despido?']), mood:0, think:true };
    return { txt:thPick(c.strikeT > yearT ? ['¡Huelga hasta que nos suban el sueldo!'] : c.profit < 0 ? ['Dicen que va a haber despidos...', 'Ojalá no me toque'] : ['Otra reunión que podría haber sido un mensaje', '¿Nos subirán el sueldo este año?', `En «${c.name}» se está bien`, `El CEO, ${c.ceo ? c.ceo.name : 'el jefe'}, no se entera de nada`]), mood:c.profit < 0 ? -1 : 0, think:Math.random() < .5 };
  }
  return base.apply(this, arguments);
}; }
// ---- El letrero de la empresa en su sede ----
{ const base = drawInstFlags; drawInstFlags = function(t){
  const r = base.apply(this, arguments);
  if (zoom < 1.5) return r; const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const g of villages) for (const c of (g.comps || [])) {
    if (!hqOk(c)) continue; const x = (c.hq % W) * T + 2, y = ((c.hq / W) | 0) * T - 44; if (x < vx0 - 30 || x > vx1 + 30 || y < vy0 - 20 || y > vy1 + 60) continue;
    const ws = c.name.split(/\s+/).filter(w => w.length > 2 && !/^(de|del|la|las|los|el|S\.A\.)$/i.test(w)), ab = (ws.length > 1 ? ws.map(w => w[0]).join('').slice(0, 3) : (ws[0] || c.name).slice(0, 3)).toUpperCase(); // (siglas; con una sola palabra, sus tres primeras letras)
    vctx.fillStyle = 'rgba(10,10,14,.85)'; vctx.fillRect(x - 9, y, 19, 7); vctx.fillStyle = c.col; vctx.fillRect(x - 8, y + 1, 17, 5);
    vctx.fillStyle = '#fff'; vctx.font = 'bold 4.5px sans-serif'; vctx.textAlign = 'center'; vctx.fillText(ab, x + .5, y + 5.2); vctx.textAlign = 'start';
    if (c.strikeT > yearT) { vctx.fillStyle = '#e04040'; vctx.fillRect(x - 9, y + 8, 19, 2); }
  }
  return r;
}; }
// ---- En la ficha (Economía), en tu gobierno y en Historia ----
function compRow(c, g){
  const S = SECTORS[c.sector], coin = typeof coinPl === 'function' ? coinPl(g) : '', wb = costOfLiving(g) * .9;
  return `<div class="cp-row" style="--c:${c.col}"><span class="cp-ic">${S.ic}</span><div class="cp-b"><b>${esc(c.name)}</b><span class="muted">${S.txt}${c.state ? ' · del estado' : ''}${c.ceo ? ` · CEO: <button class="lnk" data-pid="${refOf(c.ceo)}">${esc(c.ceo.name)}</button>` : ''} · ${c.staff.length} emplead${c.staff.length === 1 ? 'o' : 'os'}</span>
    <span class="cp-n">Sueldo: ${Math.round(c.pay * wb)} ${esc(coin)}/día · CEO: ${Math.round(c.ceoPay * wb)} · ${c.profit >= 0 ? `<b class="ok">gana ${c.profit}</b>` : `<b class="ko">pierde ${-c.profit}</b>`} al día · vale ${c.value}${c.strikeT > yearT ? ' · <b class="ko">en huelga</b>' : ''}</span>${c.log.length ? `<span class="cp-log">${esc(c.log[c.log.length - 1])}</span>` : ''}</div></div>`;
}
function facRow(g, f){
  const F = FACS[f.k], boss = typeof bossOf === 'function' ? bossOf(g, f) : null;
  return `<div class="cp-row" style="--c:${F.col}"><span class="cp-ic">🏭</span><div class="cp-b"><b>${esc(F.name)}</b><span class="muted">industria${f.state ? ' · del estado' : ''}${boss ? ` · jefe: <button class="lnk" data-pid="${refOf(boss)}">${esc(boss.name)}</button>` : ''} · ${(f.crew || []).length} obreros</span></div></div>`;
}
function companiesCard(g){
  const C = compsOf(g), F = typeof facsOf === 'function' ? facsOf(g) : [];
  if (!C.length && !F.length) return '';
  const tax = C.reduce((a, c) => a + (c.tax || 0), 0);
  return `<h4>Empresas</h4><div class="cp-list">${C.map(c => compRow(c, g)).join('')}${F.map(f => facRow(g, f)).join('')}</div>${tax ? `<div class="muted" style="font-size:12px">Impuesto de sociedades: ${tax} al día para el tesoro</div>` : ''}`;
}
{ const base = factoryCard; factoryCard = function(g){ return base.apply(this, arguments) + companiesCard(g); }; }
function companiesHtml(){
  const C = allComps().sort((a, b) => b.value - a.value).slice(0, 15);
  if (!C.length) return '<div class="muted" style="padding:10px">Aún no hay empresas: nacen con la moneda, en los pueblos con gente de sobra.</div>';
  return `<div class="pw"><p class="muted pw-note">Las empresas más valiosas del mundo: su CEO, su plantilla, lo que pagan y lo que ganan.</p>${C.map((c, i) => { const g = villageById(c.vid); return `<div class="gb-row"><span class="gb-k">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.º'} ${esc(c.name)}</span><span class="gb-p">${compRow(c, g)}<span class="muted">${esc(g.name)} (${esc(nationOf(g).name)})</span></span></div>`; }).join('')}</div>`;
}
{ const base = renderHistory; renderHistory = function(){
  const el = $('histPanel'); if (el && !el.hidden && histTab === 'empresas') { el.querySelector('.hp-body').innerHTML = companiesHtml(); return; }
  return base.apply(this, arguments);
}; }
// En tu panel de gobierno (Economía): las empresas de tu nación y lo que dejan en impuestos
if (typeof govEconomy === 'function') { const base = govEconomy; govEconomy = function(n){ const C = playerTowns().flatMap(g => compsOf(g)); return base.apply(this, arguments) + (C.length ? `<h4>Empresas</h4><div class="cp-list">${C.sort((a, b) => b.value - a.value).map(c => compRow(c, villageById(c.vid))).join('')}</div><div class="muted gv-note">Pagan el impuesto de sociedades (más con impuestos altos, menos con bajos); con economía estatal pasan a ser del estado.</div>` : ''); }; }
