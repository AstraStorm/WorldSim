// World Sim · Coches: fábricas y marcas de cada nación, concesionarios, comercio, gasolineras y tráfico
// ================= Coches =================
// · Nuevo descubrimiento: «el automóvil» (con el refinado del petróleo). Una ciudad de 45 o más con hierro levanta una
//   fábrica de coches: cada fábrica es una marca de su nación (una empresa con su CEO), con sus modelos — dos berlinas,
//   un familiar, un sedán y un deportivo — que salen de la cadena y se acumulan en el concesionario del pueblo
// · Los coches se compran (quien tiene ahorros de sobra: los ricos, el deportivo; las familias con hijos, el familiar),
//   y se comercian: por las rutas comerciales, en camión, y por mar, en los cargueros, a los pueblos que no fabrican
//   (sus coches son de marcas de fuera: «importados»). Cada coche es de gasolina o diésel (el diésel —gasóleo— gasta
//   menos y suele estar más barato; los deportivos, de gasolina)
// · Gasolineras: en los pueblos con coches. El precio de la gasolina y del diésel sube y baja cada medio día: según el
//   combustible que hay en la nación frente a los coches que lo gastan, la guerra, la crisis, el impuesto y algo de
//   azar. Se ve en el panel de la gasolinera; si se dispara, los conductores se quejan y el pueblo se enfada
// · Por las calles circulan coches de verdad (los de la gente del pueblo), cada uno de su color
(() => { if (DISCOVERIES.some(d => d.k === 'automovil')) return; const i = DISCOVERIES.findIndex(d => d.k === 'refinado'); if (i < 0) return;
  DISCOVERIES.splice(i + 1, 0, { k:'automovil', txt:'el automóvil', cost:135, eff:'fábricas de coches con sus marcas, concesionarios y gasolineras', req:['refinado'] });
  if (typeof SCI_REQ === 'object') SCI_REQ.automovil = ['refinado']; })();
BLD.add('carfac'); BLD.add('gas'); BUILD_DIMS.carfac = [5, 6]; BUILD_DIMS.gas = [4, 5]; KIND_DIMS.fabrica_coches = [5, 6]; KIND_DIMS.gasolinera = [4, 5];
OBJ['carfac:fabrica'] = ['Fábrica de coches', 'house', 0]; SPRITE_ALIAS['carfac:fabrica'] = 'factory:fabrica';
OBJ['gas:gasolinera'] = ['Gasolinera', 'house', 0]; OBJ['gas:izq'] = ['Gasolinera', 'house', 0]; OBJ['gas:der'] = ['Gasolinera', 'house', 0];
if (typeof BLD_DESC !== 'undefined') { BLD_DESC.carfac = 'Fábrica de coches: la cadena de montaje de una marca de la nación'; BLD_DESC.gas = 'Gasolinera: gasolina y diésel, al precio del día'; }
SECTORS.automovil = { ic:'🚗', txt:'automóvil', rev:6, col:'#3a5a8a', ok:() => false };
Object.assign(GRIEF_TXT, { gasolina:'lo cara que está la gasolina' });
// Los modelos: precio (en ahorros de la gente), cuánto gasta y cuántos son diésel
const CAR_T = {
  sedan:    { txt:'sedán',     price:18, use:.8,  diesel:.6,  w:1.2 },
  berlina:  { txt:'berlina',   price:26, use:1,   diesel:.5,  w:1 },
  berlina2: { txt:'berlina',   price:30, use:1,   diesel:.45, w:.8 },
  familiar: { txt:'familiar',  price:28, use:1.2, diesel:.75, w:.8 },
  deportivo:{ txt:'deportivo', price:55, use:1.6, diesel:.03, w:.25 },
};
const CAR_MODELS = ['Brisa', 'Cóndor', 'Lince', 'Ráfaga', 'Atlas', 'Delta', 'Siroco', 'Halcón', 'Corsa', 'Faro', 'Nova', 'Puma', 'Alba', 'Trueno', 'Cometa', 'Lobo', 'Vega', 'Estela', 'Duna', 'Mistral'];
const CAR_COLS = ['#c8302a', '#2a5ac8', '#e8e8ea', '#22242a', '#8a8e96', '#2a8a4a', '#e0a030', '#8a2a3a', '#6ab0e0', '#c86a2a', '#5a3a8a', '#d8c8a0'];
const carFacs = () => liveTowns().filter(g => g.carFac && world.objs[g.carFac.i]);
const natBrands = n => carFacs().filter(g => nationOf(g) === n).map(g => g.carFac);
const carP = g => { const e = ecOf(g); return e ? e.P || 1 : 1; };
// Una marca nueva: un nombre de su lengua y sus cinco modelos
function makeBrand(g){
  const n = nationOf(g); let w = typeof brandWord === 'function' ? brandWord(n) : ''; if (!w || w.length < 4) w = g.name;
  w = w.charAt(0).toUpperCase() + w.slice(1); const used = new Set(carFacs().map(o => o.carFac.brand)); if (used.has(w)) w = w + ' Motor';
  const pool = CAR_MODELS.slice().sort(() => Math.random() - .5), models = {}; let k = 0; for (const t in CAR_T) models[t] = pool[k++];
  return { brand:w, models };
}
// ---- Fábricas, producción y concesionarios ----
function carFacSite(g){
  const z = g.indZone || g.mineZone;
  if (z && typeof zoneFree === 'function') { const p = ringFind(z.x, z.y + 9, 16, (x, y) => zoneFree(x, y, 5, 6) && !buildingClash(x, y, 'fabrica_coches')); if (p) return p; }
  return planSite(g, 'fabrica_coches');
}
function gasSite(g){ // (junto a una calle: se miran las casillas justo encima de las calles del pueblo, de la plaza hacia fuera)
  const R = Math.min(34, (typeof townRadius === 'function' ? townRadius(g) : 10) + 8), cand = [];
  for (const i of pathMap) { const x = i % W, y = ((i / W) | 0) - 1, d = Math.hypot(x - g.fx, y - g.fy); if (d < 5 || d > R || plazaSet.has(i)) continue; cand.push([d + Math.random() * 6, x, y]); }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, x, y] of cand.slice(0, 400)) {
    if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6 || pathMap.has(y * W + x) || !tileFree(x, y)) continue;
    if (!clearable(x - 4, y - 5, x + 4, y) || buildingClash(x, y, 'gasolinera') || villages.some(o => underBuilding(o, x, y))) continue;
    return [x, y]; }
  return null;
}
let carT = 0;
SYSTEMS.push(dt => { try {
  if (!world || (carT -= dt) > 0) return; carT = 10;
  const half = yearT - (world.carHalf || 0) >= DAY_LEN / 2; if (half) world.carHalf = yearT;
  for (const g of liveTowns()) {
    const n = nationOf(g), auto = knowsSci(n, 'automovil');
    // Fábrica nueva (una por ciudad; más en las naciones grandes)
    if (auto && !g.carFac && popOf(g) >= 45 && g.coin && (g.iron || 0) >= 12 && (g.stone || 0) >= 25 && (g.wood || 0) >= 20 && !(g.carFacFail > yearT - DAY_LEN)
      && natBrands(n).length < 1 + Math.floor(natTowns(n).reduce((s, o) => s + popOf(o), 0) / 160)) {
      const p = carFacSite(g); if (!p) { g.carFacFail = yearT; continue; }
      const [x, y] = p, i = y * W + x; if (clearable(x - 5, y - 6, x + 5, y + 1)) clearSite(g, x - 5, y - 6, x + 5, y + 1);
      if (!tileFree(x, y)) { g.carFacFail = yearT; continue; }
      world.objs[i] = { key:'carfac:fabrica', v:0, ox:0, oy:0, vid:g.id }; g.iron -= 12; g.stone -= 25; g.wood -= 20;
      g.carFac = { i, ...makeBrand(g), made:0, sold:0, since:yearT, nat:n.id, town:g.id };
      composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
      notify(`🚗 En ${g.name} abre la fábrica de coches ${g.carFac.brand}: de su cadena saldrán el ${g.carFac.brand} ${g.carFac.models.berlina}, el ${g.carFac.models.familiar}, el ${g.carFac.models.sedan} y el deportivo ${g.carFac.models.deportivo}`, { x:x * T, y:y * T });
      if (typeof foundCompany === 'function') foundCompany(g, 'automovil', { name:g.carFac.brand, link:'car:' + g.id });
    }
    // Producción: cada medio día, unos cuantos coches (con hierro y algo de combustible)
    if (half && g.carFac && world.objs[g.carFac.i]) { const F = g.carFac, k = Math.min(Math.floor((g.iron || 0) / 2), 2 + Math.floor(popOf(g) / 30)), room = 40 - (g.cars || 0);
      const made = Math.max(0, Math.min(k, room)); if (made) { g.iron -= made * 2; g.cars = (g.cars || 0) + made; F.made += made; (g.carMix ||= {})[F.brand] = (g.carMix[F.brand] || 0) + made; } }
    // Gasolinera, cuando ya hay coches por el pueblo
    if (auto && !g.gas && carOwners(g).length >= 3 && (g.wood || 0) >= 10 && (g.stone || 0) >= 10 && !(g.gasFail > yearT - DAY_LEN)) {
      const p = gasSite(g); if (!p) { g.gasFail = yearT; } else { const [x, y] = p, i = y * W + x; clearSite(g, x - 4, y - 5, x + 4, y + 1);
        world.objs[i] = { key:['gas:gasolinera', 'gas:izq', 'gas:der'][Math.floor(Math.random() * 3)], v:0, ox:0, oy:0, vid:g.id }; g.gas = i; g.wood -= 10; g.stone -= 10;
        composeRegion(x - 10, y - 14, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof');
        const F = fuelOf(n); notify(`⛽ Abre la primera gasolinera de ${g.name}: la gasolina, a ${fmtFuel(F.gas, g)}, y el diésel, a ${fmtFuel(F.die, g)}`, { x:x * T, y:y * T }); } }
    if (g.gas != null && !world.objs[g.gas]) g.gas = null;
    // Compras: quien tiene ahorros de sobra se compra un coche (del concesionario del pueblo)
    if ((g.cars || 0) > 0 && auto) carBuyers(g);
    // Gasolina: los coches gastan combustible del pueblo y la gente paga el precio del día
    if (half) carFuel(g);
  }
  if (half) for (const n of [...new Set(liveTowns().map(nationOf))]) fuelPrices(n);
} catch (e) { console.error(e); } });
const carOwners = g => villagers.filter(v => !v.dead && v.vid === g.id && v.car);
// Qué coche: la marca (de su nación si fabrica; si no, importada de quien comercia con ellos) y el modelo según el bolsillo
function pickCar(v, g){
  const n = nationOf(g), mine = natBrands(n), mix = g.carMix || {}, tot = Object.values(mix).reduce((s, x) => s + x, 0);
  let F = null;
  if (tot > 0) { let r = Math.random() * tot; for (const b in mix) if ((r -= mix[b]) <= 0) { F = carFacs().map(o => o.carFac).find(f => f.brand === b); break; } }
  if (!F) F = mine.length ? mine[Math.floor(Math.random() * mine.length)] : carFacs().map(o => o.carFac).sort(() => Math.random() - .5)[0];
  if (!F) return null;
  const P = carP(g), money = v.money || 0, kids = (v.kids || []).some(k => !k.dead && ageOf(k) < ADULT_H);
  const opts = Object.entries(CAR_T).filter(([, c]) => c.price * P <= money * .8).map(([t, c]) => [t, c.w * (t === 'familiar' && kids ? 3 : 1) * (t === 'deportivo' && money > c.price * P * 2 ? 4 : 1)]);
  if (!opts.length) return null;
  let r = Math.random() * opts.reduce((s, o) => s + o[1], 0), t = opts[0][0]; for (const [k, w] of opts) if ((r -= w) <= 0) { t = k; break; }
  return { b:F.brand, m:F.models[t], t, f:Math.random() < CAR_T[t].diesel ? 'diesel' : 'gasolina', c:Math.floor(Math.random() * CAR_COLS.length), nat:F.nat, home:F.town, y:Math.floor(yearT / DAY_LEN) + 1, imp:nationOf(villageById(F.town) || g) !== n };
}
function carBuyers(g){
  const P = carP(g), cand = villagers.filter(v => !v.dead && !v.away && v.vid === g.id && !v.car && ageOf(v) >= ADULT_H && (v.money || 0) >= CAR_T.sedan.price * P * 1.25 && !(v.car === false));
  let sold = 0;
  for (const v of cand.sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, 2)) {
    if ((g.cars || 0) <= 0 || Math.random() > .35) continue;
    const car = pickCar(v, g); if (!car) continue; const price = CAR_T[car.t].price * P;
    v.money -= price; v.car = car; g.cars--; if (g.carMix && g.carMix[car.b]) { g.carMix[car.b]--; if (g.carMix[car.b] <= 0) delete g.carMix[car.b]; }
    const ec = ecOf(g); if (ec) ec.treas += Math.round(price * .15); // (el impuesto de matriculación)
    const fg = villageById(car.home); if (fg && fg.carFac) { fg.carFac.sold++; (fg.carFac.sales ||= []).push([yearT, price]); if (fg.carFac.sales.length > 40) fg.carFac.sales.shift(); }
    sold++; if (typeof floats !== 'undefined') floats.push({ x:v.x, y:v.y - 12, txt:`¡${car.b} ${car.m}!`, col:'#f0d070', life:0 });
    if (!g.carMsg) { g.carMsg = true; notify(`🚗 ${v.name} se compra el primer coche de ${g.name}: un ${car.b} ${car.m} (${CAR_T[car.t].txt}, ${car.f === 'diesel' ? 'diésel' : 'gasolina'})${car.imp ? ', importado' : ''}`, { x:v.x, y:v.y }); }
  }
  return sold;
}
// Los ingresos de la marca (empresas.js): lo vendido en los últimos días
{ const base = linkRevenue; linkRevenue = function(c, n){
  if (c.link && c.link.startsWith('car:')) { const g = villageById(+c.link.split(':')[1]); const S = g && g.carFac && g.carFac.sales || []; return S.filter(([t]) => yearT - t < DAY_LEN * 2).reduce((s, [, p]) => s + p * .25, 0); }
  return base.apply(this, arguments);
}; }
// Comercio por tierra: por las rutas comerciales, del que tiene coches de sobra al que no tiene (y por mar: carguero.js)
if (typeof CARGO_GOODS !== 'undefined') CARGO_GOODS.push(['cars', 'coches', g => g.carFac ? 8 : 30]);
{ const base = routeTick; routeTick = function(a, b, r){
  const was = r.routeT, out = base.apply(this, arguments);
  try { if (r.route && !r.war && r.routeT !== was) for (const [s, d] of [[a, b], [b, a]]) {
    if ((s.cars || 0) < 10 || (d.cars || 0) >= 6 || !knowsSci(nationOf(d), 'automovil')) continue;
    const k = Math.min(4, s.cars - 8); s.cars -= k; d.cars = (d.cars || 0) + k;
    const mix = s.carMix || {}, top = Object.keys(mix).sort((p, q) => mix[q] - mix[p])[0]; if (top) { mix[top] = Math.max(0, mix[top] - k); (d.carMix ||= {})[top] = (d.carMix[top] || 0) + k; }
    const es = ecOf(s), ed = ecOf(d); if (es && ed) { const pay = Math.round(k * CAR_T.berlina.price * carP(d) * .5); ed.treas -= pay; es.treas += pay; }
    if (!(r.carMsg > yearT)) { r.carMsg = yearT + DAY_LEN * 3; notify(`🚛 Llegan ${k} coches${top ? ` ${top}` : ''} de ${s.name} al concesionario de ${d.name}`, { x:d.fx * T, y:d.fy * T }); }
  } } catch (e) { console.error(e); }
  return out;
}; }
// (lo que llega en un carguero: a la mezcla de marcas del puerto, como la marca que más hay en el puerto de salida)
{ let last = new Map(); SYSTEMS.push(() => { if (typeof cargos === 'undefined') return; for (const c of cargos) { if (c.good !== 'cars' || last.has(c)) continue; last.set(c, 1); const g = villageById(c.g), o = villageById(c.to); if (!g || !o) continue; const mix = g.carMix || {}, top = Object.keys(mix).sort((p, q) => mix[q] - mix[p])[0]; if (top) { mix[top] = Math.max(0, mix[top] - c.n); (o.carMix ||= {})[top] = (o.carMix[top] || 0) + c.n; } } if (last.size > 200) last = new Map(); }); }

// ---- Gasolina y diésel ----
// Índice de precio por nación (1 = normal): sube si falta combustible para los coches que hay, con la guerra, la crisis
// y el impuesto; baja si sobra. El diésel suele ir un poco por debajo, pero a veces se da la vuelta
function fuelOf(n){ return n.fuelP ||= { gas:1, die:.92, hist:[], dd:-.08 }; }
const fmtFuel = (p, g) => (p * 1.5 * carP(g)).toFixed(2).replace('.', ',');
function fuelPrices(n){
  const F = fuelOf(n), towns = natTowns(n), cars = towns.reduce((s, g) => s + carOwners(g).length, 0); if (!cars && !towns.some(g => g.gas)) return;
  const fuel = towns.reduce((s, g) => s + (g.fuel || 0), 0), refin = towns.some(g => typeof hasRefinery === 'function' && hasRefinery(g));
  const short = clamp((cars * .6 - fuel) / (cars * 2 + 10), -.3, .7) + (refin ? 0 : .25);
  const war = [...rels.values()].some(r => r.war && (r.war.att === n.id || r.war.def === n.id)) ? .2 : 0;
  const crisis = typeof econPhase === 'function' ? Math.max(0, -econPhase(n)) * .15 : 0, tax = towns.some(g => hasLaw(g, 'impuesto_combustible')) ? .2 : 0;
  const target = clamp(1 + short + war + crisis + tax + (Math.random() - .5) * .1, .55, 2.6);
  const old = F.gas; F.gas = clamp(F.gas + (target - F.gas) * .35 + (Math.random() - .5) * .04, .5, 2.8);
  F.dd = clamp(F.dd + (Math.random() - .5) * .03, -.15, .1); // (el diésel, normalmente algo más barato; a veces más caro)
  F.die = clamp(F.gas * (1 + F.dd), .45, 2.8); F.hist.push([Math.floor(yearT / DAY_LEN) + 1, +F.gas.toFixed(3), +F.die.toFixed(3)]); if (F.hist.length > 24) F.hist.shift();
  const ch = (F.gas - old) / old, g0 = towns.find(g => g.gas != null) || towns[0];
  if (g0 && Math.abs(ch) > .07 && !(F.msgT > yearT)) { F.msgT = yearT + DAY_LEN;
    notify(`⛽ En ${n.name} la gasolina ${ch > 0 ? 'sube' : 'baja'} a ${fmtFuel(F.gas, g0)} (${ch > 0 ? '+' : ''}${Math.round(ch * 100)} %) y el diésel a ${fmtFuel(F.die, g0)}${ch > 0 && war ? ': la guerra dispara el combustible' : ch > 0 && short > .3 ? ': no llega combustible para tanto coche' : ch < 0 && short < 0 ? ': sobra combustible en los depósitos' : ''}`, { x:g0.fx * T, y:g0.fy * T }); }
}
function carFuel(g){
  const own = carOwners(g); if (!own.length) return;
  const n = nationOf(g), F = fuelOf(n), P = carP(g); let need = 0, dry = 0;
  for (const v of own) { const p = v.car.f === 'diesel' ? F.die : F.gas, use = CAR_T[v.car.t].use * (v.car.f === 'diesel' ? .8 : 1); need += use * .05;
    const cost = p * use * .4 * P; if ((v.money || 0) >= cost) { v.money -= cost; const ec = ecOf(g); if (ec) ec.treas += cost * .3; v.carDry = 0; } else { v.carDry = (v.carDry || 0) + 1; dry++; } }
  // El combustible sale de los depósitos del pueblo (o de los de la nación)
  if ((g.fuel || 0) >= need) g.fuel -= need; else { const o = natTowns(n).find(o => (o.fuel || 0) >= need); if (o) o.fuel -= need; }
  // Con el precio por las nubes, el pueblo se enfada
  const hi = Math.max(F.gas, F.die); if (hi > 1.5 && own.length >= 4) { g.anger = Math.min(100, (g.anger || 0) + (hi - 1.5) * own.length * .15); if ((g.anger || 0) > 25 && (!g.grief || Math.random() < .3)) g.grief = 'gasolina'; }
}
// Ánimo: estrenar coche alegra; llenar el depósito a precio de oro, no
{ const base = socialMood; socialMood = function(v, g, add){
  base.apply(this, arguments); if (!v.car || !g) return;
  const F = fuelOf(nationOf(g)), p = v.car.f === 'diesel' ? F.die : F.gas;
  if (Math.floor(yearT / DAY_LEN) + 1 - v.car.y <= 2) add(5, 'estrena coche');
  if (p > 1.3) add(-Math.min(10, (p - 1.3) * 14), v.car.f === 'diesel' ? 'el diésel está carísimo' : 'la gasolina está carísima');
  else if (p < .8) add(3, 'llenar el depósito sale barato');
  if (v.carDry > 1) add(-4, 'no le llega para gasolina');
}; }
// En la ficha de la persona y del pueblo
{ const base = docCards; docCards = function(v){
  const out = base.apply(this, arguments); if (!v.car) return out; const C = v.car;
  return out + `<div class="kv"><span>Coche</span><b>🚗 ${esc(C.b)} ${esc(C.m)} <span class="muted">(${CAR_T[C.t].txt}, ${C.f === 'diesel' ? 'diésel' : 'gasolina'}${C.imp ? ', importado' : ''})</span> <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${CAR_COLS[C.c]};border:1px solid #0004;vertical-align:middle"></span></b></div>`;
}; }
{ const base = colonyCard; colonyCard = function(g){
  const out = base.apply(this, arguments); const n = nationOf(g); if (!knowsSci(n, 'automovil') || !popOf(g)) return out;
  const own = carOwners(g).length, F = fuelOf(n), mix = g.carMix || {}, brands = Object.keys(mix).filter(b => mix[b] > 0);
  return out + `<h4>Coches</h4><div>${own} conductores · ${g.cars || 0} en el concesionario${brands.length ? ` (${brands.map(esc).join(', ')})` : ''}${g.carFac ? ` · fábrica <b>${esc(g.carFac.brand)}</b>: ${g.carFac.made} hechos, ${g.carFac.sold} vendidos` : ''}<br>⛽ Gasolina ${fmtFuel(F.gas, g)} · diésel ${fmtFuel(F.die, g)}${g.gas == null ? ' <span class="muted">(sin gasolinera)</span>' : ''}</div>`;
}; }
// La charla del momento (charla.js): cuando sube la gasolina, los conductores hablan de eso
if (typeof MOMENTS !== 'undefined') { MOMENTS.unshift([/la gasolina sube/i, 'gasolinaSube', 120, 1.2, false, -1,
  ['¿Has visto a cuánto está la gasolina?', 'Llenar el depósito ya cuesta un riñón', 'A este paso vuelvo al caballo', 'El diésel también se ha disparado'],
  ['¡Una vergüenza!', 'Yo ya voy andando', 'Esto lo arregla el gobierno o nadie', 'Pues habrá que compartir coche']],
  [/la gasolina baja/i, 'gasolinaBaja', 120, 1, false, 1, ['¡Por fin baja la gasolina!', 'Hoy lleno el depósito'], ['Ya era hora', 'A ver lo que dura']],
  [/se compra el primer coche|abre la fábrica de coches/i, 'coche', 40, 1, false, 1, ['¿Has visto ese coche?', 'Algún día tendré uno', 'Hace un ruido que no veas'], ['¡Qué maravilla!', 'Eso es para ricos', 'Va más rápido que un caballo']]);
  for (const m of MOMENTS.slice(0, 3)) MOMENT_K[m[1]] = m; }

// ---- Dibujo: el tráfico, la gasolinera con sus precios y el letrero de la marca ----
// Los coches salen en blanco en la hoja: se pintan del color de cada uno (solo la carrocería, no los cristales ni las luces)
const carTint = new Map();
function carSprite(t, dir, col){
  const key = t + ':' + dir + ':' + col; if (carTint.has(key)) return carTint.get(key);
  const f = artFrame(`car:${t}:${dir}`); if (!f) return null;
  const c = document.createElement('canvas'); c.width = f.width; c.height = f.height; const x = c.getContext('2d'); x.drawImage(f, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height), d = im.data, n = parseInt(CAR_COLS[col].slice(1), 16), cr = n >> 16, cg = (n >> 8) & 255, cb = n & 255;
  for (let k = 0; k < d.length; k += 4) { if (!d[k + 3]) continue; const r = d[k], g = d[k + 1], b = d[k + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 26 && mx > 120) { const l = mx / 255; d[k] = cr * l; d[k + 1] = cg * l; d[k + 2] = cb * l; } } // (gris claro = chapa)
  x.putImageData(im, 0, 0); c.ax = f.ax; carTint.set(key, c); return c;
}
const CAR_DIR = ['e', 'se', 's', 'so', 'o', 'no', 'n', 'ne'];
let traffic = [], trafficW = null;
const roadTile = i => pathMap.has(i) && !plazaSet.has(i) && !bridgeSet.has(i) || (typeof isAsphalt === 'function' && isAsphalt(i));
function trafficTick(dt){
  if (trafficW !== world) { trafficW = world; traffic = []; }
  const [x0, y0, x1, y1] = visibleRect(), m = 200;
  for (const g of liveTowns()) { // cuántos coches circulan por el pueblo (si se ve)
    if (g.fx * T < x0 - m || g.fx * T > x1 + m || g.fy * T < y0 - m || g.fy * T > y1 + m) { traffic = traffic.filter(c => c.g !== g.id); continue; }
    const own = carOwners(g).filter(v => !v.away && !v.sleep && (v.carDry || 0) < 2), want = Math.min(10, Math.ceil(own.length * (isNight() ? .15 : .4))), have = traffic.filter(c => c.g === g.id);
    if (have.length > want) { traffic = traffic.filter(c => c !== have[0]); continue; }
    if (have.length < want && Math.random() < dt * 2) { const v = own.find(u => !have.some(c => c.v === u)); if (!v) continue;
      const R = (typeof townRadius === 'function' ? townRadius(g) : 10) + 6; let s = null;
      for (let k = 0; k < 40 && s == null; k++) { const x = Math.round(g.fx + (Math.random() - .5) * 2 * R), y = Math.round(g.fy + (Math.random() - .5) * 2 * R), i = y * W + x; if (i >= 0 && i < N && roadTile(i)) s = i; }
      if (s != null) traffic.push({ g:g.id, v, i:s, prev:-1, x:(s % W) * T + 2, y:((s / W) | 0) * T + 3, ang:0, life:30 + Math.random() * 40 }); }
  }
  for (const c of traffic) {
    if ((c.life -= dt) <= 0 || c.v.dead || !c.v.car) { c.done = true; continue; }
    const tx = (c.i % W) * T + 2, ty = ((c.i / W) | 0) * T + 3, dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), sp = (typeof isAsphalt === 'function' && isAsphalt(c.i) ? 26 : 18) * dt;
    if (d > sp) { c.x += dx / d * sp; c.y += dy / d * sp; c.ang = Math.atan2(dy, dx); continue; }
    c.x = tx; c.y = ty;
    const opts = []; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const j = c.i + oy * W + ox; if (j !== c.prev && roadTile(j)) opts.push(j); }
    if (!opts.length) { if (c.prev >= 0) { const p = c.prev; c.prev = c.i; c.i = p; } else c.done = true; continue; }
    const straight = opts.find(j => j - c.i === c.i - c.prev); c.prev = c.i; c.i = straight != null && Math.random() < .7 ? straight : opts[Math.floor(Math.random() * opts.length)];
  }
  if (traffic.some(c => c.done)) traffic = traffic.filter(c => !c.done);
}
SYSTEMS.push(dt => { try { if (world && liveTowns().some(g => g.cars != null || g.carFac)) trafficTick(Math.min(dt, .5)); } catch (e) { console.error(e); } });
function drawCars(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const c of traffic) {
    if (c.x < x0 - 20 || c.x > x1 + 20 || c.y < y0 - 20 || c.y > y1 + 20) continue;
    const k = (Math.round((c.ang / (Math.PI * 2)) * 8) + 8) % 8, s = carSprite(c.v.car.t, CAR_DIR[k], c.v.car.c); if (!s) continue;
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(Math.round(c.x - s.width / 2 + 1), Math.round(c.y + 1), s.width - 2, 1);
    vctx.drawImage(s, Math.round(c.x - s.ax), Math.round(c.y - s.height + 3));
  }
  // La gasolinera: el panel con los precios del día (de cerca)
  if (zoom >= 2.2) for (const g of liveTowns()) { if (g.gas == null) continue; const i = g.gas, x = (i % W) * T + 2, y = ((i / W) | 0) * T + 3; if (x < x0 - 40 || x > x1 + 40 || y < y0 - 50 || y > y1 + 10) continue;
    const F = fuelOf(nationOf(g)), px = x + 22, py = y - 30; vctx.fillStyle = '#22201e'; vctx.fillRect(px - 1, py - 1, 22, 15); vctx.fillStyle = '#f4f0e4'; vctx.fillRect(px, py, 20, 13); vctx.fillStyle = '#5a5e66'; vctx.fillRect(px + 9, py + 14, 2, 14);
    vctx.font = 'bold 4px sans-serif'; vctx.textAlign = 'left'; vctx.fillStyle = '#c8302a'; vctx.fillText('G', px + 1.5, py + 5.2); vctx.fillStyle = '#2a8a4a'; vctx.fillText('D', px + 1.5, py + 11.2);
    vctx.fillStyle = '#22201e'; vctx.fillText(fmtFuel(F.gas, g), px + 6, py + 5.2); vctx.fillText(fmtFuel(F.die, g), px + 6, py + 11.2); vctx.textAlign = 'start'; }
  // La fábrica: el letrero con la marca
  if (zoom >= 2) for (const g of carFacs()) { const i = g.carFac.i, x = (i % W) * T + 2, y = ((i / W) | 0) * T - 30; if (x < x0 - 40 || x > x1 + 40 || y < y0 - 20 || y > y1 + 40) continue;
    vctx.font = 'bold 4.5px sans-serif'; const w = vctx.measureText(g.carFac.brand).width + 6; vctx.fillStyle = '#22201e'; vctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 8); vctx.fillStyle = '#2a4a80'; vctx.fillRect(x - w / 2, y, w, 6); vctx.fillStyle = '#f4f0e4'; vctx.textAlign = 'center'; vctx.fillText(g.carFac.brand, x, y + 4.6); vctx.textAlign = 'start'; }
}
// ---- Aparcamientos ----
// · Con cinco o más coches en el pueblo, un aparcamiento junto a una calle (otro por cada doce coches, hasta tres): de
//   tierra o, si la nación ya sabe refinar (asfalto), asfaltado; los de tierra se asfaltan cuando aprenden
// · Se ven los coches de la gente que no está conduciendo, aparcados en sus plazas (de morro, en dos filas)
BLD.add('parking'); BUILD_DIMS.parking = [4, 4]; KIND_DIMS.aparcamiento = [4, 4];
for (const k of ['tierra', 'tierra2', 'asfalto', 'asfalto2']) OBJ['parking:' + k] = ['Aparcamiento', 'house', 0];
if (typeof BLD_DESC !== 'undefined') BLD_DESC.parking = 'Aparcamiento: donde dejan el coche los del pueblo';
const parksOf = g => (g.parks || []).filter(i => world.objs[i] && world.objs[i].key.startsWith('parking:'));
function parkSite(g){ // (como la gasolinera: con una calle delante, de la plaza hacia fuera)
  const R = Math.min(34, (typeof townRadius === 'function' ? townRadius(g) : 10) + 8), cand = [];
  for (const i of pathMap) { const x = i % W, y = ((i / W) | 0) - 1, d = Math.hypot(x - g.fx, y - g.fy); if (d < 4 || d > R || plazaSet.has(i)) continue; cand.push([d + Math.random() * 8, x, y]); }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, x, y] of cand.slice(0, 400)) {
    if (x < 6 || y < 6 || x >= W - 6 || y >= H - 6 || pathMap.has(y * W + x) || !tileFree(x, y)) continue;
    if (!clearable(x - 4, y - 4, x + 4, y) || buildingClash(x, y, 'aparcamiento') || villages.some(o => underBuilding(o, x, y))) continue;
    return [x, y]; }
  return null;
}
let parkT = 0;
SYSTEMS.push(dt => { try {
  if (!world || (parkT -= dt) > 0) return; parkT = 12;
  for (const g of liveTowns()) {
    const n = nationOf(g); if (!knowsSci(n, 'automovil')) continue;
    const P = g.parks = parksOf(g), own = carOwners(g).length, paved = knowsSci(n, 'refinado');
    for (const i of P) { const o = world.objs[i]; if (paved && o.key.startsWith('parking:tierra')) { o.key = o.key.replace('tierra', 'asfalto'); const x = i % W, y = (i / W) | 0; composeRegion(x - 8, y - 8, x + 8, y + 4); } } // (lo asfaltan)
    if (own < 5 || P.length >= Math.min(3, Math.ceil(own / 12)) || (g.stone || 0) < 8 || (g.parkFail > yearT - DAY_LEN)) continue;
    const p = parkSite(g); if (!p) { g.parkFail = yearT; continue; }
    const [x, y] = p, i = y * W + x; clearSite(g, x - 4, y - 4, x + 4, y);
    world.objs[i] = { key:`parking:${paved ? 'asfalto' : 'tierra'}${Math.random() < .5 ? '2' : ''}`, v:0, ox:0, oy:0, vid:g.id }; P.push(i); g.stone -= 8;
    composeRegion(x - 8, y - 8, x + 8, y + 4); addEffect(x * T + 2, y * T + 3, 'poof');
    if (P.length === 1) notify(`En ${g.name} hacen un aparcamiento: ya hay tantos coches que no caben por las calles`, { x:x * T, y:y * T });
  }
} catch (e) { console.error(e); } });
function drawParked(){
  if (zoom < 1.4) return; const [x0, y0, x1, y1] = visibleRect(), driving = new Set(traffic.map(c => c.v));
  for (const g of liveTowns()) {
    const P = (g.parks || []).filter(i => world.objs[i] && world.objs[i].key.startsWith('parking:')); if (!P.length) continue;
    const cars = carOwners(g).filter(v => !driving.has(v) && !v.away); let k = 0;
    for (const i of P) {
      const f = artFrame(world.objs[i].key), x = (i % W) * T + 2, y = ((i / W) | 0) * T + 3; if (!f || x < x0 - 40 || x > x1 + 40 || y < y0 - 30 || y > y1 + 20) { k += 8; continue; }
      const L = x - f.ax, Tp = y - f.height + 1, w = f.width, h = f.height, xs = [.27, .42, .58, .73];
      for (const [row, dir, fy] of [[0, 'n', .5], [1, 's', .93]]) for (const fx of xs) { const v = cars[k++]; if (!v) continue; const s = carSprite(v.car.t, dir, v.car.c); if (!s) continue;
        vctx.drawImage(s, Math.round(L + w * fx - s.width / 2), Math.round(Tp + h * fy - s.height)); }
    }
  }
}
{ const base = drawCars; drawCars = function(now){ try { drawParked(); } catch (e) { console.error(e); } return base.apply(this, arguments); }; }
{ const base = drawInstFlags; drawInstFlags = function(t){ const r = base.apply(this, arguments); try { drawCars(performance.now()); } catch (e) { console.error(e); } return r; }; }
