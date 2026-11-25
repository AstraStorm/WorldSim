// World Sim · Energías limpias: molinos eólicos y placas solares
// ================= Renovables =================
// · Nuevo descubrimiento: «las energías renovables» (electricidad + plástico)
// · Un pueblo con red eléctrica levanta molinos (mejor en lomas y en la costa, donde sopla) y placas solares (mejor en
//   tierras secas y soleadas) junto a sus torres: cada uno da corriente a lo que tiene cerca, como una torre
// · Cada molino o placa quita carbón a la central (hasta un 80 %); con 3 o más, la ciudad tiene luz aunque no tenga
//   central ni la compre
// · La central de carbón ensucia el aire (algo más de enfado): con la ley «aire limpio» se apaga si hay bastante
//   renovable. Tratado: «acuerdo climático» (los dos, menos carbón; mejor relación)
(() => { if (DISCOVERIES.some(d => d.k === 'renovables')) return; const i = DISCOVERIES.findIndex(d => d.k === 'plastico');
  DISCOVERIES.splice(i + 1, 0, { k:'renovables', txt:'las energías renovables', cost:150, eff:'molinos eólicos y placas solares: luz sin quemar carbón', req:['electricidad', 'plastico'].filter(k => DISCOVERIES.some(d => d.k === k)) });
  if (typeof SCI_REQ === 'object') SCI_REQ.renovables = ['electricidad', 'plastico']; })();
BLD.add('wind'); BLD.add('solar'); BUILD_DIMS.wind = [1, 4]; BUILD_DIMS.solar = [1, 2];
OBJ['wind:torre'] = ['Molino eólico', 'house', 0]; OBJ['solar:placa'] = ['Placa solar', 'house', 0];
Object.assign(BLD_DESC, { wind:'Molino eólico: el viento mueve las aspas y da corriente sin quemar nada', solar:'Placa solar: convierte la luz del sol en corriente' });
Object.assign(BLD_TYPE, { wind:'Energía', solar:'Energía' });
const renewOf = g => (g.renew ||= []).filter(r => world.objs[r.i]);
// Las renovables también alimentan la red (y, con 3 o más, la ciudad tiene luz sin central)
{ const base = supplierOf; supplierOf = function(g){ const s0 = base.apply(this, arguments); if (s0) return s0; return renewOf(g).length >= 3 ? g : null; }; }
{ const base = powered; powered = function(g){
  const c = base.apply(this, arguments), R = renewOf(g); if (!R.length || c.renewN === R.length) return c;
  if (c.on || R.length >= 3) { c.on = true; for (const r of R) { const x = r.i % W, y = (r.i / W) | 0; for (let yy = y - 10; yy <= y + 10; yy += 2) for (let xx = x - 10; xx <= x + 10; xx += 2) if (Math.hypot(xx - x, yy - y) <= 10) c.set.add((yy >> 1) * W + (xx >> 1)); } }
  c.renewN = R.length; return c;
}; }
let renewT = 0;
SYSTEMS.push(dt => {
  if (!world || (renewT -= dt) > 0) return; renewT = 4;
  for (const g of liveTowns()) {
    if (!knowsSci(g, 'renovables')) continue;
    const R = renewOf(g), want = 2 + Math.floor(popOf(g) / 18);
    if (R.length >= want || (g.iron || 0) < 3 || g.stone < 6 || (g.renewT || 0) > yearT - 8) continue; g.renewT = yearT;
    // En un parque a las afueras (no en mitad del pueblo): los molinos en fila, separados; las placas, juntas en hileras
    if (g.renewAt == null || !clearable(g.renewAt % W - 1, ((g.renewAt / W) | 0) - 1, g.renewAt % W + 1, ((g.renewAt / W) | 0) + 1) && !R.length) { const s0 = typeof farSite === 'function' ? farSite(g, 7, 6) : null; if (!s0) { g.renewT = yearT + DAY_LEN / 2; continue; } g.renewAt = s0[1] * W + s0[0]; }
    const k = R.filter(r => r.k === 'wind').length <= R.filter(r => r.k === 'solar').length ? 'wind' : 'solar', ax = g.renewAt % W, ay = (g.renewAt / W) | 0;
    const near = (x, y, r) => { for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const o = world.objs[yy * W + xx]; if (o && BLD.has(o.key.split(':')[0]) && !/^(wind|solar|pylon):/.test(o.key)) return true; } return false; };
    let best = null;
    const slots = k === 'wind' ? [[0, -4], [-5, -4], [5, -4], [-10, -4], [10, -4], [-15, -4], [15, -4]] : [[-4, 2], [-2, 2], [0, 2], [2, 2], [4, 2], [-4, 5], [-2, 5], [0, 5], [2, 5], [4, 5], [-6, 2], [6, 2], [-6, 5], [6, 5]];
    for (const [dx, dy] of slots) { const x = ax + dx, y = ay + dy; if (x < 3 || y < 6 || x >= W - 3 || y >= H - 2 || !(tileFree(x, y) || clearable(x, y, x, y)) || pathMap.has(y * W + x) || plazaSet.has(y * W + x) || wallSet.has(y * W + x) || near(x, y, 2) || villages.some(q => underBuilding(q, x, y)) || plotIn(x, y, x, y)) continue; best = [x, y]; break; }
    if (!best) continue;
    const i = best[1] * W + best[0]; farmMap.delete(i); if (world.objs[i]) delete world.objs[i];
    world.objs[i] = { key:k === 'wind' ? 'wind:torre' : 'solar:placa', v:0, ox:0, oy:0, vid:g.id }; g.renew.push({ i, k }); g.iron -= 3; g.stone -= 6; if (powC) powC.delete(g.id);
    composeRegion(best[0] - 4, best[1] - 8, best[0] + 4, best[1] + 2); if (powC) powC.delete(g.id); addEffect(best[0] * T + 2, best[1] * T + 3, 'poof');
    if (!g.renewMsg) { g.renewMsg = true; notify(`${g.name} levanta ${k === 'wind' ? 'su primer molino eólico' : 'sus primeras placas solares'}: corriente sin quemar carbón`, { x:best[0] * T, y:best[1] * T }); }
  }
});
// Menos carbón en la central cuantas más renovables; la central ensucia el aire; ley de aire limpio
SYSTEMS.push(dt => {
  if (!world) return;
  for (const g of villages) {
    if (!popOf(g) || !hasPower(g)) continue; const n = renewOf(g).length;
    if (n) g.coal = (g.coal || 0) + dt * (.02 + (g.pylons || []).length * .0015) * 2 * (hasLaw(g, "aire_limpio") && n >= 4 ? 1 : Math.min(.8, n * .1) * .5); // (devuelve parte de lo que quemó la central; con aire limpio, todo: la central no quema)
    if (!g.plantOff && !(hasLaw(g, 'aire_limpio') && n >= 4)) g.anger = (g.anger || 0) + dt * .004; // el humo de la chimenea
  }
});
{ const base = plantOn; plantOn = function(g){ return base(g) || renewOf(g).length >= 3; }; } // (con 3 renovables o más, hay luz aunque la central esté apagada o no exista)
// Dibujo: las aspas de los molinos, girando (más deprisa con más viento)
function drawWindmills(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) for (const r of g.renew || []) {
    if (r.k !== 'wind' || !world.objs[r.i]) continue; const x = (r.i % W) * T + 2, y = ((r.i / W) | 0) * T + 3; if (x < x0 - 20 || x > x1 + 20 || y < y0 - 40 || y > y1 + 10) continue;
    const [wx, wy] = windAt(x, y), sp = 120 + 60 / Math.max(.3, Math.hypot(wx, wy) / 6), f = Math.floor(now / sp + r.i) % 8, s = artFrame(`wind:aspas${f}`), gd = artFrame('wind:gondola');
    const hx = x, hy = y - 19; if (gd) vctx.drawImage(gd, hx - (gd.width >> 1), hy - (gd.height >> 1));
    if (s) vctx.drawImage(s, Math.round(hx - s.width / 2), Math.round(hy - s.height / 2));
    redrawFront(hx - 9, hx + 9, hy - 9, y + 1); // lo que está delante tapa las aspas
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawWindmills(performance.now()); }; }
// ---- Ley y tratado ----
Object.assign(LAW_TXT, { aire_limpio:'aire limpio' }); Object.assign(LAW_DESC, { aire_limpio:'con bastantes molinos y placas, la central de carbón se apaga: aire limpio y menos enfado' }); Object.assign(LAW_LEAN, { aire_limpio:-.4 });
Object.assign(LAW_REQ, { aire_limpio:g => natAny(g, o => renewOf(o).length > 0) }); Object.assign(LAW_WHY, { aire_limpio:'ahora que hay renovables' });
Object.assign(TREATY, { clima:{ n:'acuerdo climático', days:[8, 12], icon:'🌱' } });
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments); if (!r.known || r.war) return;
  if (hasTreaty(r, 'clima')) { r.v = Math.min(100, r.v + .1); for (const g of [a, b]) g.anger = Math.max(0, (g.anger || 0) - .05); }
  else if (r.v > 30 && knowsSci(a, 'renovables') && knowsSci(b, 'renovables') && Math.random() < .03) signTreaty(a, b, r, 'clima');
}; }

// Las renovables de antes (sueltas entre las casas) se quitan una vez: se vuelven a levantar en su parque, a las afueras
SYSTEMS.push(() => { if (!world) return; for (const g of villages) { if (g.renewV === 2) continue; g.renewV = 2; for (const r of renewOf(g)) { delete world.objs[r.i]; const x = r.i % W, y = (r.i / W) | 0; composeRegion(x - 4, y - 8, x + 4, y + 2); } g.renew = []; g.renewAt = null; g.renewT = 0; if (powC) powC.delete(g.id); } });
