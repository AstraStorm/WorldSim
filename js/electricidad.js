// World Sim · La electricidad: central de carbón, torres de alta tensión, cables y farolas eléctricas
// ================= Electricidad =================
// · Nuevo descubrimiento, «la electricidad» (hace falta la máquina de vapor y la metalurgia)
// · Un pueblo de 25 o más que la conoce levanta una central de carbón en su zona industrial (o a las afueras): quema carbón
//   y, sin carbón, se apaga y la ciudad se queda a oscuras
// · Desde la central salen torres de alta tensión, unidas por cables, por fuera de las casas (nunca en mitad del pueblo):
//   en cuanto la línea llega a las afueras, todo el pueblo tiene luz (de ahí en adelante va por la red de la ciudad). Las
//   fábricas sueltas, lejos, reciben su propia línea. Cada torre cuesta hierro y madera; se levantan una a una
// · Con corriente: las farolas de vela pasan a ser eléctricas (se encienden solas al anochecer, con más luz) y las
//   fábricas producen un tercio más
// · Ley «red eléctrica pública» (la luz no se cobra: la gente, más contenta) y tratado «suministro eléctrico» (quien no
//   tiene central compra la corriente al vecino que sí: luz para uno, dinero para el otro)
(() => { if (DISCOVERIES.some(d => d.k === 'electricidad')) return; const i = DISCOVERIES.findIndex(d => d.k === 'vapor');
  DISCOVERIES.splice(i + 1, 0, { k:'electricidad', txt:'la electricidad', cost:120, eff:'centrales y torres de alta tensión: farolas eléctricas y fábricas que producen más', req:['vapor', 'metalurgia'].filter(k => DISCOVERIES.some(d => d.k === k)) });
  if (typeof SCI_REQ === 'object') SCI_REQ.electricidad = ['vapor', 'metalurgia']; })();
BLD.add('power'); BLD.add('pylon'); BUILD_DIMS.power = [6, 7]; BUILD_DIMS.pylon = [1, 5]; KIND_DIMS.central = [6, 7];
OBJ['power:central'] = ['Central eléctrica de carbón', 'house', 0]; OBJ['pylon:torre'] = ['Torre de alta tensión', 'house', 0];
Object.assign(BLD_DESC, { power:'Central eléctrica: quema carbón y manda la corriente por las torres de alta tensión', pylon:'Torre de alta tensión: lleva la corriente por los cables y la reparte a lo que tiene cerca' });
Object.assign(BLD_TYPE, { power:'Energía', pylon:'Energía' });
const PYLON_R = 12, PYLON_GAP = 11, LINK_R = 8; // (LINK_R: a cuánto de una casa tiene que llegar la línea para dar luz a todo el pueblo)
const hasPower = g => g.plant != null && world.objs[g.plant] && world.objs[g.plant].key === 'power:central';
function plantOn(g){ return hasPower(g) && !g.plantOff; }
// Torres conectadas (con su torre «madre», hacia la central) y casillas con corriente, por pueblo (caché)
const powC = new Map();
function powered(g){
  let c = powC.get(g.id); if (c && c.t > yearT - 3 && c.n === (g.pylons || []).length) return c;
  const set = new Set(), P = (g.pylons || []).filter(p => world.objs[p.i]);
  const sup = supplierOf(g), on = !!(sup && plantOn(sup));
  if (on) { const src = [g.plant, ...P.map(p => p.i)].filter(i => i != null && world.objs[i]); for (const i of src) { const x = i % W, y = (i / W) | 0; for (let yy = y - PYLON_R; yy <= y + PYLON_R; yy += 2) for (let xx = x - PYLON_R; xx <= x + PYLON_R; xx += 2) if (Math.hypot(xx - x, yy - y) <= PYLON_R) set.add((yy >> 1) * W + (xx >> 1)); } }
  // ¿Ha llegado la línea al pueblo? Entonces todo el pueblo (hasta su última casa) tiene luz
  const hs = housesOf(g), src = [g.plant, ...P.map(p => p.i), ...(typeof renewOf === 'function' ? renewOf(g).map(r => r.i) : [])].filter(i => i != null && world.objs[i]);
  // (o, si compra la luz a una ciudad vecina ya encendida y sus casas casi se tocan, le llega por la red de la ciudad)
  const town = on && (hs.some(h => src.some(n => Math.hypot(h % W - n % W, ((h / W) | 0) - ((n / W) | 0)) <= LINK_R)) || (sup && sup !== g && powered(sup).town && hs.some(h => housesOf(sup).some(h2 => Math.hypot(h % W - h2 % W, ((h / W) | 0) - ((h2 / W) | 0)) <= LINK_R * 1.5))));
  const reach = hs.reduce((m, h) => Math.max(m, Math.hypot(h % W - g.fx, ((h / W) | 0) - g.fy)), 0) + 4;
  c = { t:yearT, n:(g.pylons || []).length, set, on, town, reach }; powC.set(g.id, c); return c;
}
const isPowered = (g, x, y) => { if (!g) return false; const c = powered(g); return c.set.has(((y | 0) >> 1) * W + ((x | 0) >> 1)) || (c.town && Math.hypot(x - g.fx, y - g.fy) <= c.reach); };
const isBldObj = o => o && BLD.has(o.key.split(':')[0]) && !o.key.startsWith('pylon:');
const clearOfBuildings = (x, y, r) => { for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H && isBldObj(world.objs[yy * W + xx])) return false; return !villages.some(q => underBuilding(q, x, y)); };
// De dónde le llega la corriente: de su central; si no tiene, de la de otra ciudad de su nación (red nacional, hasta 90
// casillas) o de la de un vecino con tratado de suministro eléctrico
function supplierOf(g){
  if (hasPower(g)) return g;
  let best = null, bd = 1e9;
  for (const o of villages) { if (o === g || !hasPower(o) || !popOf(o)) continue; const d = Math.hypot(o.fx - g.fx, o.fy - g.fy), r = rels.get(relKey(g, o)); if ((nationOf(o) === nationOf(g) && d < 90) || (r && hasTreaty(r, 'electrico'))) if (d < bd) { bd = d; best = o; } }
  return best;
}
function importsPower(g){ if (hasPower(g)) return false; const s0 = supplierOf(g); return !!(s0 && plantOn(s0)); }
// ---- Dónde: la central, en la zona industrial (o a las afueras); las torres, desde la central hacia lo que no tiene luz ----
function plantSite(g){
  if (typeof facSite === 'function') { const s = facSite(g, Object.keys(FACS)[0]); if (s) return [s.x, s.y]; }
  const o = typeof outskirtsSite === 'function' ? outskirtsSite(g, 'central') : null; if (o) return o;
  // Lejos, en su propia tierra (las centrales no tienen por qué estar en la ciudad: las torres traen la corriente)
  const towns = liveTowns().filter(q => q !== g), cx = Math.round(g.fx), cy = Math.round(g.fy); let best = null, bd = 1e9;
  for (let r = 20; r <= 140 && !best; r += 5) for (let k = 0; k < 40; k++) {
    const a2 = k / 40 * Math.PI * 2, x = Math.round(cx + Math.cos(a2) * r), y = Math.round(cy + Math.sin(a2) * r * .85);
    if (x < 10 || y < 12 || x >= W - 10 || y >= H - 4 || towns.some(o => nationOf(o) !== nationOf(g) && Math.hypot(o.fx - x, o.fy - y) < 25) || !clearable(x - 6, y - 7, x + 6, y + 1) || pathIn(x - 6, y - 7, x + 6, y) || plazaIn(x - 6, y - 7, x + 6, y) || penOverlap(null, x - 6, y - 7, x + 6, y + 1) || buildingClash(x, y, 'central')) continue; // (sobre campos de labranza sí: se pierden esos campos)
    if (r < bd) { bd = r; best = [x, y]; }
  }
  return best; // (nunca derribando casas del centro: una central de carbón no va en mitad de la ciudad)
}
function nextPylon(g){
  const sup = supplierOf(g); if (!sup) return null; const P = (g.pylons || []).filter(p => world.objs[p.i]), nodes = [{ i:sup.plant }, ...(typeof renewOf === 'function' ? renewOf(sup).map(r => ({ i:r.i })) : []), ...(sup === g ? [] : (sup.pylons || []).filter(p => world.objs[p.i])), ...P].filter(n => n.i != null);
  const cov = (x, y) => nodes.some(n => Math.hypot(n.i % W - x, ((n.i / W) | 0) - y) <= PYLON_R - 2), c = powered(g);
  // Lo que falta: llegar al pueblo (a la casa más a mano) y a las fábricas que quedan fuera de él
  const want = [...(c.town ? [] : housesOf(g)), ...(g.facs || []).map(f => f.i).filter(i => !cov(i % W, (i / W) | 0) && !(c.town && Math.hypot(i % W - g.fx, ((i / W) | 0) - g.fy) <= c.reach))];
  if (!want.length) return null;
  const skip = g.pylonSkip ||= {}, pairs = [];
  for (const t of want) { if (skip[t] > yearT) continue; let bn = null, bd = Infinity; for (const n of nodes) { const d = Math.hypot(t % W - n.i % W, ((t / W) | 0) - ((n.i / W) | 0)); if (d < bd) { bd = d; bn = n; } } pairs.push([bd, bn, t]); }
  pairs.sort((a, b) => a[0] - b[0]);
  // los pueblos (su círculo de casas): las torres los rodean, no los cruzan (salvo para salir del pueblo en el que ya están)
  const circ = liveTowns().map(o => { const hs = housesOf(o); return [o.fx, o.fy, Math.min(30, hs.reduce((m, h) => Math.max(m, Math.hypot(h % W - o.fx, ((h / W) | 0) - o.fy)), 0) * .85)]; });
  let from0 = null; const outside = (x, y) => circ.every(([cx, cy, r]) => Math.hypot(x - cx, y - cy) >= r || (from0 && Math.hypot(from0[0] - cx, from0[1] - cy) < r));
  const okR = (r, out = true) => (x, y) => (!out || outside(x, y)) && tileFree(x, y) && !pathMap.has(y * W + x) && !plazaSet.has(y * W + x) && !wallSet.has(y * W + x) && clearOfBuildings(x, y, r) && !plotIn(x, y, x, y); // (lejos de casas y edificios; en un campo sí: la torre ocupa poco)
  // si hay casas por medio, rodea; y si no queda otra, se arrima algo más
  for (const [, from, to] of pairs.slice(0, 6)) {
    const fx = from.i % W, fy = (from.i / W) | 0, tx = to % W, ty = (to / W) | 0, d = Math.hypot(tx - fx, ty - fy) || 1;
    from0 = [fx, fy];
    for (const [step, R, cl, out] of [[Math.min(PYLON_GAP, Math.max(1, d - 5)), 5, 3, true], [Math.min(7, Math.max(1, d - 5)), 5, 3, true], [Math.min(PYLON_GAP, Math.max(1, d - 5)), 10, 3, true], [Math.min(PYLON_GAP, Math.max(1, d - 5)), 9, 3, false]]) { const p = ringFind(Math.round(fx + (tx - fx) / d * step), Math.round(fy + (ty - fy) / d * step), R, okR(cl, out)); if (p) { farmMap.delete(p[1] * W + p[0]); return { i:p[1] * W + p[0], from:from.i }; } }
    skip[to] = yearT + DAY_LEN / 2; // por aquí no hay sitio: otro rato
  }
  return null;
}
// ---- Cada poco: construir la central y las torres, quemar carbón ----
let elecT = 0;
SYSTEMS.push(dt => {
  if (!world || (elecT -= dt) > 0) return; elecT = 2;
  for (const g of liveTowns()) {
    if (!knowsSci(g, 'electricidad')) continue;
    const at = { x:g.fx * T, y:g.fy * T };
    if (!hasPower(g) && !supplierOf(g)) {
      if (popOf(g) < 25 || (g.coal || 0) < 10 || g.stone < 30 || (g.iron || 0) < 6 || (g.plantFail || -1e9) > yearT - DAY_LEN / 4) continue;
      const s = plantSite(g); if (!s) { g.plantFail = yearT; continue; }
      const i = s[1] * W + s[0]; if (clearable(s[0] - 6, s[1] - 7, s[0] + 6, s[1] + 1)) clearSite(g, s[0] - 6, s[1] - 7, s[0] + 6, s[1] + 1);
      if (!tileFree(s[0], s[1]) || buildingClash(s[0], s[1], 'central')) { g.plantFail = yearT; continue; }
      world.objs[i] = { key:'power:central', v:0, ox:0, oy:0, vid:g.id }; g.plant = i; g.coal -= 10; g.stone -= 30; g.iron -= 6; g.pylons = [];
      composeRegion(s[0] - 10, s[1] - 14, s[0] + 10, s[1] + 4); addEffect(s[0] * T + 2, s[1] * T + 3, 'poof'); connect(g, s[0], s[1]); powC.delete(g.id);
      notify(`${g.name} enciende su central eléctrica de carbón: ahora toca llevar la corriente con torres hasta las casas`, { x:s[0] * T, y:s[1] * T });
      continue;
    }
    if (!hasPower(g)) { // conectada a la central de otra ciudad: solo le toca levantar sus torres
      if ((g.iron || 0) >= 1 && g.wood >= 3 && (g.pylonT || 0) < yearT - 6) { const n = nextPylon(g); g.pylonT = yearT; if (n) { world.objs[n.i] = { key:'pylon:torre', v:0, ox:0, oy:0, vid:g.id }; (g.pylons ||= []).push(n); g.iron -= 1; g.wood -= 3; powC.delete(g.id); const x = n.i % W, y = (n.i / W) | 0; composeRegion(x - 4, y - 8, x + 4, y + 2); if (g.pylons.length === 1) notify(`${g.name} tiende torres hasta la central de ${supplierOf(g).name}: la luz eléctrica llega al pueblo`, { x:x * T, y:y * T }); } }
      continue;
    }
    // Quemar carbón (algo más con más torres); sin carbón, apagón
    const burn = dt * (.02 + (g.pylons || []).length * .0015) * 2;
    if ((g.coal || 0) >= burn) { g.coal -= burn; if (g.plantOff) { g.plantOff = false; powC.delete(g.id); notify(`Vuelve la luz a ${g.name}: la central tiene carbón otra vez`, at); } }
    else if (!g.plantOff) { g.plantOff = true; powC.delete(g.id); notify(`¡Apagón en ${g.name}! La central se ha quedado sin carbón`, at); }
    // Una torre más (si hay material y falta luz en algún sitio)
    if ((g.iron || 0) >= 1 && g.wood >= 3 && (g.pylonT || 0) < yearT - 6) {
      const n = nextPylon(g); g.pylonT = yearT;
      if (n) { world.objs[n.i] = { key:'pylon:torre', v:0, ox:0, oy:0, vid:g.id }; (g.pylons ||= []).push(n); g.iron -= 1; g.wood -= 3; powC.delete(g.id); const x = n.i % W, y = (n.i / W) | 0; composeRegion(x - 4, y - 8, x + 4, y + 2); addEffect(x * T + 2, y * T + 3, 'poof');
        if (g.pylons.length === 1) notify(`En ${g.name} levantan la primera torre de alta tensión: la luz eléctrica llega al pueblo`, { x:x * T, y:y * T }); }
    }
  }
});
// Fábricas con corriente: un tercio más
{ const base = facCycle; facCycle = function(v, g, i){ const before = { wood:g.wood, stone:g.stone, food:g.food, iron:g.iron, gold:g.gold, cloth:g.cloth, coal:g.coal }; base.apply(this, arguments);
  if (!isPowered(g, i % W, (i / W) | 0)) return; for (const k in before) { const d = (g[k] || 0) - (before[k] || 0); if (d > 0) g[k] += Math.round(d / 3); } }; }
// ---- Dibujo: cables entre torres (con su comba) y farolas eléctricas ----
const pylonTop = i => [(i % W) * T + 2, ((i / W) | 0) * T + 3 - 22];
function drawPowerLines(){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) {
    if (!(g.pylons || []).length) continue;
    const on = powered(g).on;
    vctx.strokeStyle = on ? 'rgba(30,26,24,.85)' : 'rgba(60,56,52,.6)'; vctx.lineWidth = .6;
    for (const p of g.pylons) {
      if (!world.objs[p.i] || !world.objs[p.from]) continue;
      const fo = world.objs[p.from], [ax, ay] = fo.key === 'power:central' ? [(p.from % W) * T + 2 - 14, ((p.from / W) | 0) * T + 3 - 18] : pylonTop(p.from), [bx, by] = pylonTop(p.i);
      if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 - 10 || Math.min(ay, by) > y1 + 10) continue;
      for (const off of [-3, 3]) { vctx.beginPath(); vctx.moveTo(ax + off, ay); vctx.quadraticCurveTo((ax + bx) / 2 + off, (ay + by) / 2 + 6, bx + off, by); vctx.stroke(); } // dos cables, combados
      redrawFront(Math.min(ax, bx) - 4, Math.max(ax, bx) + 4, Math.min(ay, by), Math.max(((p.from / W) | 0), ((p.i / W) | 0)) * T + 3); // y lo que hay delante, por encima
    }
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawPowerLines(); }; }
// Farolas: con corriente, eléctricas (poste metálico y luz blanca; se encienden solas al anochecer)
{ const base = drawTorches; drawTorches = function(g, t){
  const P = powered(g); if (!P.on || !P.set.size) return base.apply(this, arguments);
  const [x0, y0, x1, y1] = visibleRect(), night = isNight() || dayT() > .42;
  const rest = [];
  for (const tc of torchesOf(g)) {
    const px = (tc.i % W) * T + 2, py = ((tc.i / W) | 0) * T + 4;
    if (!isPowered(g, tc.i % W, (tc.i / W) | 0)) { rest.push(tc); continue; }
    tc.lit = night; tc.elec = true;
    if (px < x0 - 6 || px > x1 + 6 || py < y0 - 16 || py > y1 + 4) continue;
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(px - 1, py, 3, 1);
    vctx.fillStyle = '#4a4e56'; vctx.fillRect(px, py - 12, 1, 13); vctx.fillRect(px, py - 13, 3, 1); vctx.fillStyle = '#2a2c30'; vctx.fillRect(px + 2, py - 13, 2, 2);
    vctx.fillStyle = night ? '#fff6d0' : '#a8acb4'; vctx.fillRect(px + 2, py - 11, 2, 1);
    redrawFront(px - 6, px + 6, py - 16, py);
  }
  const all = g.torches; g.torches = rest; try { base.apply(this, arguments); } finally { g.torches = all; }
}; }
{ const base = nightLights; nightLights = function(glow, k){
  base(glow, k);
  for (const g of villages) { if (!popOf(g) || !powered(g).on) continue; for (const tc of g.torches || []) if (tc.elec && isPowered(g, tc.i % W, (tc.i / W) | 0)) glow((tc.i % W) * T + 4, ((tc.i / W) | 0) * T - 6, 26, .5 * k, '255,244,210'); if (hasPower(g) && plantOn(g)) glow((g.plant % W) * T + 2, ((g.plant / W) | 0) * T - 10, 30, .35 * k, '255,220,150'); }
}; }
// Humo de la chimenea de la central
let plantSmokeT = 0;
SYSTEMS.push(dt => { if ((plantSmokeT -= dt) > 0) return; plantSmokeT = .35; for (const g of villages) if (hasPower(g) && plantOn(g)) { const x = (g.plant % W) * T + 2 - 14, y = ((g.plant / W) | 0) * T + 3 - 30; chips.push({ x, y, vx:(Math.random() - .5) * 3, vy:-4 - Math.random() * 3, life:0, max:2.5, col:'rgba(120,116,112,.55)' }); } });
// ---- Ley y tratado ----
Object.assign(LAW_TXT, { red_publica:'red eléctrica pública' }); Object.assign(LAW_DESC, { red_publica:'la luz no se cobra: la gente está más contenta, pero el tesoro paga el carbón' }); Object.assign(LAW_LEAN, { red_publica:-.45 });
Object.assign(LAW_REQ, { red_publica:g => natAny(g, hasPower) }); Object.assign(LAW_WHY, { red_publica:'ahora que hay central eléctrica' });
{ const base = lawsTick; lawsTick = function(g, dt, people){ const due = (g.lawsT ?? 0) - dt <= 0; base.apply(this, arguments); if (!due || !hasLaw(g, 'red_publica') || !plantOn(g)) return; g.anger = Math.max(0, (g.anger || 0) - .2); const ec = ecOf(g); if (ec) ec.treas -= 1; }; }
Object.assign(TREATY, { electrico:{ n:'acuerdo de suministro eléctrico', days:[6, 10], icon:'⚡' } });
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments); if (!r.known || r.war) return;
  const has = hasTreaty(r, 'electrico');
  if (has) { for (const [s, c] of [[a, b], [b, a]]) if (plantOn(s) && !hasPower(c)) { const es = ecOf(s), ec = ecOf(c); if (es && ec) { ec.treas -= .4; es.treas += .4; } } }
  else if (!has && r.v > 25 && Math.hypot(a.fx - b.fx, a.fy - b.fy) < 90 && ((plantOn(a) && !hasPower(b) && knowsSci(b, 'electricidad')) || (plantOn(b) && !hasPower(a) && knowsSci(a, 'electricidad'))) && Math.random() < .03) signTreaty(a, b, r, 'electrico');
}; }

// Las redes de antes (torres en mitad del pueblo) se rehacen una vez con la regla nueva: torres por fuera, hasta las afueras
SYSTEMS.push(() => {
  if (!world || !villages.some(g => g.gridV !== 2 && (g.pylons || []).length)) return;
  const old = villages.filter(g => g.gridV !== 2 && (g.pylons || []).length);
  for (const g of old) { for (const p of g.pylons) if (world.objs[p.i] && world.objs[p.i].key === 'pylon:torre') { delete world.objs[p.i]; const x = p.i % W, y = (p.i / W) | 0; composeRegion(x - 4, y - 8, x + 4, y + 2); } g.pylons = []; g.pylonSkip = {}; g.gridV = 2; powC.delete(g.id); }
  for (const g of [...old.filter(hasPower), ...old.filter(g => !hasPower(g))]) for (let k = 0; k < 30; k++) { const n = nextPylon(g); if (!n) break; world.objs[n.i] = { key:'pylon:torre', v:0, ox:0, oy:0, vid:g.id }; g.pylons.push(n); powC.delete(g.id); const x = n.i % W, y = (n.i / W) | 0; composeRegion(x - 4, y - 8, x + 4, y + 2); }
});
SYSTEMS.push(() => { if (world) for (const g of villages) if (g.gridV == null && !(g.pylons || []).length) g.gridV = 2; });
