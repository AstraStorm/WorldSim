// World Sim · El barco carguero: comercio a lo grande por mar (y petróleo de las plataformas)
// ================= Carguero =================
// · Nuevo descubrimiento: «el transporte en contenedores» (vapor + electricidad)
// · Solo con el puerto grande terminado: el pueblo tiene un carguero (uno, dos si pasa de 80 habitantes)
// · Viajes de comercio: con algo que le sobra de verdad (comida, madera, piedra, combustible, agua embotellada) sale
//   cargado hasta los topes hacia el puerto de un pueblo amigo; al llegar descarga (se ve vacío), cobra y vuelve con lo
//   que al otro le sobra (o de vacío)
// · Si tiene plataformas petroleras en el mar, el carguero va vacío y vuelve lleno de bidones (mucho más que un barco)
// · Lleno se pinta con los contenedores; vacío, con la bodega a la vista. De lado o de frente según adónde vaya
(() => { if (DISCOVERIES.some(d => d.k === 'contenedores')) return; const i = DISCOVERIES.findIndex(d => d.k === 'electricidad');
  DISCOVERIES.splice(i + 1, 0, { k:'contenedores', txt:'el transporte en contenedores', cost:125, eff:'con un puerto grande, barcos cargueros: comercio por mar a lo grande', req:['vapor', 'electricidad'].filter(k => DISCOVERIES.some(d => d.k === k)) });
  if (typeof SCI_REQ === 'object') SCI_REQ.contenedores = ['vapor', 'electricidad']; })();
let cargos = [];
const CARGO_GOODS = [['food', 'comida', g => Math.max(popOf(g) * 3, capOf(g) * .45)], ['wood', 'madera', g => capOf(g) * .45], ['stone', 'piedra', g => capOf(g) * .45], ['fuel', 'combustible', () => 10], ['bottles', 'agua embotellada', () => 30]]; // (lo que sobra: lo que pasa de casi la mitad del almacén)
const cargoPort = g => { const L = g.port.launch; return [(L % W) * T + 2, ((L / W) | 0) * T + 3]; };
const canCargo = g => g.port && g.bigPort && g.bigPort.done && knowsSci(g, 'contenedores') && popOf(g);
function seaPath(a, b){
  if (seaLine(a[0], a[1], b[0], b[1])) return [b];
  const r = seaRoute(seaFrom(a[0], a[1]), seaFrom(b[0], b[1])); if (!r) return null;
  return thinRoute(a[0], a[1], [...r, b], (x0, y0, x1, y1) => seaLine(x0, y0, x1, y1));
}
// Los demás barcos cerca (otros cargueros, barcas de los aldeanos, petroleros, barcos de guerra y piratas)
function shipsNear(c){
  const out = [];
  for (const o of cargos) if (o !== c && !o.done) out.push([o.x, o.y]);
  for (const v of villagers) if (!v.dead && v.boat && Math.abs(v.x - c.x) < 70 && Math.abs(v.y - c.y) < 70) out.push([v.x, v.y]);
  if (typeof oilRuns !== 'undefined') for (const t of oilRuns) if (t.sea) out.push([t.x, t.y]);
  if (typeof pirates === 'function') for (const p of [...pirates(), ...navies()]) if (p && p.x != null) out.push([p.x, p.y]);
  if (typeof travelers !== 'undefined' && Array.isArray(travelers)) for (const t of travelers) if (t && t.boat && t.x != null) out.push([t.x, t.y]);
  return out.filter(p => Math.abs(p[0] - c.x) < 70 && Math.abs(p[1] - c.y) < 70);
}
const seaOk = (x, y) => { const i = Math.floor(y / T) * W + Math.floor(x / T); return i >= 0 && i < N && WATER[world.biome[i]]; };
let cargoT = 0;
SYSTEMS.push(dt => {
  if (!world || (cargoT -= dt) > 0) return; cargoT = 3;
  for (const g of liveTowns()) {
    if (!canCargo(g) || cargos.filter(c => c.g === g.id).length >= (popOf(g) > 80 ? 2 : 1) || (g.cargoT || 0) > yearT) continue;
    const from = cargoPort(g);
    // Petróleo de sus plataformas
    const plat = typeof oilDeposits === 'function' ? oilDeposits().find(d => d.sea && d.owner === g.id && (d.stock || 0) >= 20 && !cargos.some(c => c.d === d)) : null;
    if (plat) { const to = [(plat.i % W) * T + 2, ((plat.i / W) | 0) * T + 3 + T], p = seaPath(from, to); if (p) { cargos.push({ g:g.id, d:plat, kind:'petroleo', pts:p, back:null, k:0, x:from[0], y:from[1], full:false, phase:'ida', home:from }); g.cargoT = yearT + 20; continue; } }
    // Comercio: lo que le sobra, a un pueblo amigo con puerto
    const sell = CARGO_GOODS.map(([k, n, keep]) => [k, n, (g[k] || 0) - keep(g)]).filter(x => x[2] > 12).sort((a, b) => b[2] - a[2])[0]; if (!sell) continue;
    const mates = liveTowns().filter(o => o !== g && o.port && (() => { const r = rels.get(relKey(g, o)); return r && r.known && !r.war && r.v > 0; })()).sort((a, b) => Math.hypot(a.fx - g.fx, a.fy - g.fy) - Math.hypot(b.fx - g.fx, b.fy - g.fy));
    for (const o of mates.slice(0, 3)) {
      const to = cargoPort(o), p = seaPath(from, to); if (!p) continue;
      const n = Math.min(Math.floor(sell[2]), 80); g[sell[0]] -= n;
      cargos.push({ g:g.id, to:o.id, kind:'comercio', good:sell[0], gname:sell[1], n, pts:p, k:0, x:from[0], y:from[1], full:true, phase:'ida', home:from });
      g.cargoT = yearT + 30;
      if (!g.cargoMsg) { g.cargoMsg = true; notify(`Zarpa el primer carguero de ${g.name}, hasta los topes de ${sell[1]} para ${o.name}`, { x:from[0], y:from[1] }); }
      break;
    }
  }
});
SYSTEMS.push(dt => {
  if (!cargos.length) return;
  for (const c of cargos) {
    const g = villageById(c.g); if (!g || !popOf(g)) { c.done = true; continue; }
    if (c.wait > 0) { // en puerto: se ve cómo lo descargan (se queda vacío) y, si hay, cómo lo vuelven a cargar
      c.wait -= dt; for (const e of c.ev || []) if (!e.done && c.wait <= e.at) { e.done = true; c.full = e.full; c.label = e.label; addEffect(c.x, c.y - 8, 'poof'); }
      if (c.wait <= 0) c.label = null; continue; }
    const tgt = c.pts[c.k];
    if (!tgt) { // fin de tramo
      if (c.phase === 'ida' && c.kind === 'barcaza') { c.wait = 1e9; c.label = 'Esperando la fase del cohete'; continue; } // (se queda quieto hasta que aterriza encima)
      if (c.phase === 'ida') {
        if (c.kind === 'petroleo') { const q = Math.min(c.d.stock || 0, 60); c.d.stock -= q; c.load = q; c.label = 'Cargando crudo'; c.ev = [{ at:2.5, full:true, label:'Cargado de crudo' }]; }
        else { const o = villageById(c.to); if (o && popOf(o)) { o[c.good] = (o[c.good] || 0) + c.n; const eg = ecOf(g), eo = ecOf(o); if (eg && eo) { const pay = Math.round(c.n * .6); eo.treas -= pay; eg.treas += pay; } const r = rels.get(relKey(g, o)); if (r) r.v = Math.min(100, r.v + 1);
            // y vuelve con lo que al otro le sobra
            const back = CARGO_GOODS.map(([k, n, keep]) => [k, n, (o[k] || 0) - keep(o)]).filter(x => x[2] > 20 && x[0] !== c.good).sort((a, b) => b[2] - a[2])[0];
            c.label = `Descargando ${c.gname}`; c.ev = [{ at:4.5, full:false, label:'Vacío' }]; if (back) { const n = Math.min(Math.floor(back[2]), 60); o[back[0]] -= n; c.backGood = back[0]; c.backN = n; c.ev.push({ at:2.4, full:false, label:`Cargando ${CARGO_GOODS.find(q => q[0] === back[0])?.[1] || back[0]}` }, { at:.8, full:true, label:'Cargado' }); } } }
        c.phase = 'vuelta'; c.wait = c.kind === 'petroleo' ? 4 : 7; c.pts = seaPath([c.x, c.y], c.home) || [c.home]; c.k = 0; continue;
      }
      if (c.kind === 'petroleo') g.oilStock = (g.oilStock || 0) + (c.load || 0);
      else if (c.backGood) g[c.backGood] = (g[c.backGood] || 0) + c.backN;
      if (c.full) { c.ev = [{ at:1.5, full:false, label:'Vacío' }]; c.label = 'Descargando'; c.wait = 3.5; c.pts = [c.home]; c.k = 1; c.backGood = null; c.load = 0; c.kind = 'fin'; continue; } // en casa: lo descargan y se queda vacío
      c.done = true; continue;
    }
    let sp = 22 * dt; const dx = tgt[0] - c.x, dy = tgt[1] - c.y, d = Math.hypot(dx, dy);
    // No atraviesa otros barcos: si tiene uno delante, frena y se aparta a un lado hasta que pasa
    { const ux = dx / (d || 1), uy = dy / (d || 1); let block = null;
      for (const o of shipsNear(c)) { const rx = o[0] - c.x, ry = o[1] - c.y, ahead = rx * ux + ry * uy, side = rx * -uy + ry * ux; if (ahead > -10 && ahead < 55 && Math.abs(side) < 16) { block = side; break; } }
      if (block != null) { sp *= .25; const k = block > 0 ? -1 : 1; if (seaOk(c.x - uy * k * 12 * dt * 3, c.y + ux * k * 12 * dt * 3)) { c.x += -uy * k * 12 * dt; c.y += ux * k * 12 * dt; } } }
    if (d <= sp) { c.x = tgt[0]; c.y = tgt[1]; c.k++; } else { c.x += dx / d * sp; c.y += dy / d * sp; c.dx = dx / d; c.dy = dy / d; }
    if (Math.random() < dt * 26) { const sw = 34, side = (Math.random() - .5) * 6; chips.push({ x:c.x - (c.dx || 1) * sw + side * -(c.dy || 0), y:c.y + 1 + side * (c.dx || 0) * .4, vx:-(c.dx || 1) * 4 + (Math.random() - .5) * 4, vy:(Math.random() - .5) * 2, life:0, max:1.6 + Math.random(), col:`rgba(240,250,255,${.45 + Math.random() * .35})` }); } // la espuma que deja detrás
    if (Math.random() < dt * 14) for (const sg of [-1, 1]) chips.push({ x:c.x + (c.dx || 1) * 30, y:c.y + 1, vx:(c.dx || 1) * 2 + sg * -(c.dy || 0) * 6, vy:sg * (c.dx || 1) * 3, life:0, max:.7, col:'rgba(235,248,255,.7)' }); // la ola de proa
  }
  cargos = cargos.filter(c => !c.done);
});
function drawCargos(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const c of cargos) {
    if (c.x < x0 - 40 || c.x > x1 + 40 || c.y < y0 - 30 || c.y > y1 + 30) continue;
    const front = (c.dy || 0) > .6, s = artFrame(`cargo:${c.full ? 'lleno' : 'vacio'}${front ? '_f' : ''}`); if (!s) continue;
    const left = !front && (c.dx || 1) < 0, bob = Math.round(Math.sin(now / 600 + c.home[0]) * 1.2), x = Math.round(c.x), y = Math.round(c.y) + bob, tilt = Math.sin(now / 900 + c.home[1]) * .025;
    vctx.fillStyle = 'rgba(0,0,0,.22)'; vctx.fillRect(x - (s.width >> 1), y + 1, s.width, 2);
    vctx.save(); vctx.translate(x, y + 4); vctx.rotate(front ? 0 : tilt); if (left) vctx.scale(-1, 1); vctx.drawImage(s, -s.ax, -s.height); vctx.restore(); // navega: sube, baja y cabecea con las olas
    if (c.stageCv && c.full && typeof drawCv === 'function') drawCv(c.stageCv, x + (left ? 6 : -6), y - 8, 0); // la fase del cohete, de pie sobre la cubierta
    if (c.label) { vctx.save(); vctx.font = `bold ${Math.max(4, 11 / zoom)}px system-ui`; vctx.textAlign = 'center'; vctx.lineWidth = 2 / zoom; vctx.strokeStyle = 'rgba(0,0,0,.75)'; vctx.fillStyle = '#fff'; vctx.strokeText(c.label, x, y - s.height - 2); vctx.fillText(c.label, x, y - s.height - 2); vctx.restore(); }
    const g = villageById(c.g), n = g && nationOf(g); if (n && !front) { const fx = left ? x + (s.width >> 1) - 6 : x - (s.width >> 1) + 5, fy = y - s.height + 2; vctx.fillStyle = '#3a3a3a'; vctx.fillRect(fx, fy, 1, 5); if (n.flag) for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) { vctx.fillStyle = flagColor(n.flag, (a + .5) / 4, (b + .5) / 3); vctx.fillRect(fx + 1 + a, fy + b, 1, 1); } }
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawCargos(performance.now()); }; }
