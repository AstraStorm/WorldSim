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
// El carguero es largo (unas 15 casillas): va por donde el agua es ancha, lejos de la costa, los muelles, los puentes y las
// plataformas; solo se arrima donde no hay otra (al entrar en puerto)
let clrC = null, clrSig = '';
function shipClear(){
  const sig = bridgeSet.size + ':' + Math.floor(yearT / DAY_LEN) + ':' + (typeof oilDeposits === 'function' ? oilDeposits().filter(d => d.well != null).length : 0);
  if (clrC && clrSig === sig) return clrC; clrSig = sig;
  const D = clrC = new Uint8Array(N), q = new Int32Array(N); let h = 0, t = 0;
  for (let i = 0; i < N; i++) if (!openWater(i) || world.objs[i]) { D[i] = 0; q[t++] = i; } else D[i] = 255;
  if (typeof oilDeposits === 'function') for (const d of oilDeposits()) if (d.sea && d.well != null && world.objs[d.well]) { const x0 = d.well % W, y0 = (d.well / W) | 0; // (la plataforma entera, con sus patas, es un obstáculo)
    for (let y = y0 - 9; y <= y0 + 2; y++) for (let x = x0 - 8; x <= x0 + 8; x++) if (x >= 0 && y >= 0 && x < W && y < H && D[y * W + x]) { D[y * W + x] = 0; q[t++] = y * W + x; } }
  while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0, d = D[i] + 1; if (d > 14) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (D[j] > d) { D[j] = d; q[t++] = j; } } }
  return D;
}
const clearAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= W || ty >= H ? 0 : shipClear()[ty * W + tx]; };
function seaPath(a, b){
  const D = shipClear(), s0 = seaFrom(a[0], a[1]), s1 = seaFrom(b[0], b[1]); if (!openWater(s0) || !openWater(s1)) return null;
  const cost = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), q = [[0, s0]]; cost[s0] = 0;
  const push = e => { q.push(e); let k = q.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (q[p][0] <= q[k][0]) break; [q[p], q[k]] = [q[k], q[p]]; k = p; } };
  const pop = () => { const top = q[0], last = q.pop(); if (q.length) { q[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < q.length && q[l][0] < q[m][0]) m = l; if (r < q.length && q[r][0] < q[m][0]) m = r; if (m === k) break; [q[m], q[k]] = [q[k], q[m]]; k = m; } } return top; };
  let n = 0;
  while (q.length && n++ < 400000) {
    const [c, i] = pop(); if (i === s1) break; if (c > cost[i]) continue; const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!D[j]) continue;
      if (dx && dy && (!D[y * W + nx] || !D[ny * W + x])) continue;
      const cl = D[j], nc = c + (dx && dy ? 1.41 : 1) * (1 + (cl < 2 ? 40 : cl < 4 ? 12 : cl < 7 ? 3 : 0)); if (nc < cost[j]) { cost[j] = nc; prev[j] = i; push([nc, j]); } }
  }
  if (s0 !== s1 && prev[s1] === -1) return null;
  const pts = []; for (let i = s1; i !== s0; i = prev[i]) pts.push([(i % W) * T + T / 2, ((i / W) | 0) * T + T / 2]); pts.reverse(); pts.push(b);
  // de un punto al siguiente en línea recta solo si por medio el agua es tan ancha como en los extremos
  const ok = (x0, y0, x1, y1) => { const need = Math.min(6, clearAt(x0, y0), clearAt(x1, y1)), m = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 2)); for (let k = 1; k < m; k++) if (clearAt(x0 + (x1 - x0) * k / m, y0 + (y1 - y0) * k / m) < need) return false; return true; };
  return thinRoute(a[0], a[1], pts, ok);
}
// Los demás barcos cerca (otros cargueros, barcas de los aldeanos, petroleros, barcos de guerra y piratas)
function shipsNear(c){
  const out = [], R = 120;
  for (const o of cargos) if (o !== c && !o.done) out.push([o.x, o.y, (o.dy || 0) > .6 ? 14 : 38, o]);
  for (const v of villagers) if (!v.dead && v.boat && Math.abs(v.x - c.x) < R && Math.abs(v.y - c.y) < R) out.push([v.x, v.y, 10]);
  if (typeof oilRuns !== 'undefined') for (const t of oilRuns) if (t.sea) out.push([t.x, t.y, 12]);
  if (typeof pirates === 'function') for (const p of [...pirates(), ...navies()]) if (p && p.x != null) out.push([p.x, p.y, 16]);
  if (typeof travelers !== 'undefined' && Array.isArray(travelers)) for (const t of travelers) if (t && t.boat && t.x != null) out.push([t.x, t.y, 10]);
  return out.filter(p => Math.abs(p[0] - c.x) < R && Math.abs(p[1] - c.y) < R);
}
const seaOk = (x, y) => clearAt(x, y) >= 2;
// Donde atraca junto a la plataforma: a su lado, en agua ancha (nunca encima de ella)
function platDock(d){ const x0 = ((d.well ?? d.i) % W) * T + 2, y0 = (((d.well ?? d.i) / W) | 0) * T + 3; for (let r = 13; r <= 24; r += 2) for (const a of [0, Math.PI, .4, Math.PI - .4, Math.PI / 2]) { const x = x0 + Math.cos(a) * r * T, y = y0 + 8 + Math.sin(a) * r * T * .5; if (clearAt(x, y) >= 3) return [x, y]; } return null; }
let cargoT = 0;
SYSTEMS.push(dt => {
  if (!world || (cargoT -= dt) > 0) return; cargoT = 3;
  for (const g of liveTowns()) {
    if (!canCargo(g) || cargos.filter(c => c.g === g.id).length >= (popOf(g) > 80 ? 2 : 1) || (g.cargoT || 0) > yearT) continue;
    const from = cargoPort(g);
    // Petróleo de sus plataformas
    const plat = typeof oilDeposits === 'function' ? oilDeposits().find(d => d.sea && d.owner != null && villageById(d.owner) && nationOf(villageById(d.owner)) === nationOf(g) && d.well != null && world.objs[d.well] && (d.stock || 0) >= 20 && !cargos.some(c => c.d === d)) : null;
    if (plat) { const to = platDock(plat), p = to && seaPath(from, to); if (p) { cargos.push({ g:g.id, d:plat, kind:'petroleo', pts:p, back:null, k:0, x:from[0], y:from[1], full:false, phase:'ida', home:from }); g.cargoT = yearT + 20; continue; } }
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
      if (c.phase === 'ida' && c.kind === 'barcaza') { c.wait = 1e9; c.ready = true; c.label = 'Esperando la fase del cohete'; continue; } // (se queda quieto hasta que aterriza encima)
      if (c.phase === 'ida') {
        if (c.kind === 'petroleo') { const q = Math.min(c.d.stock || 0, 60); c.d.stock -= q; c.load = q; c.label = 'Cargando crudo'; c.ev = [{ at:2.5, full:true, label:'Cargado de crudo' }]; }
        else { const o = villageById(c.to); if (o && popOf(o)) { o[c.good] = (o[c.good] || 0) + c.n; const eg = ecOf(g), eo = ecOf(o); if (eg && eo) { const pay = Math.round(c.n * .6); eo.treas -= pay; eg.treas += pay; } const r = rels.get(relKey(g, o)); if (r) r.v = Math.min(100, r.v + 1);
            // y vuelve con lo que al otro le sobra
            const back = CARGO_GOODS.map(([k, n, keep]) => [k, n, (o[k] || 0) - keep(o)]).filter(x => x[2] > 20 && x[0] !== c.good).sort((a, b) => b[2] - a[2])[0];
            c.label = `Descargando ${c.gname}`; c.ev = [{ at:4.5, full:false, label:'Vacío' }]; if (back) { const n = Math.min(Math.floor(back[2]), 60); o[back[0]] -= n; c.backGood = back[0]; c.backN = n; c.ev.push({ at:2.4, full:false, label:`Cargando ${CARGO_GOODS.find(q => q[0] === back[0])?.[1] || back[0]}` }, { at:.8, full:true, label:'Cargado' }); } } }
        c.phase = 'vuelta'; c.wait = c.kind === 'petroleo' ? 4 : 7; c.pts = seaPath([c.x, c.y], c.home) || [c.home]; c.k = 0; continue;
      }
      if (c.kind === 'petroleo') { const r = (typeof hasRefinery === 'function' && hasRefinery(g) ? g : nearestRefinery(c.d)) || g; r.oilStock = (r.oilStock || 0) + (c.load || 0); } // (a la refinería de la nación)
      else if (c.backGood) g[c.backGood] = (g[c.backGood] || 0) + c.backN;
      if (c.full) { c.ev = [{ at:1.5, full:false, label:'Vacío' }]; c.label = 'Descargando'; c.wait = 3.5; c.pts = [c.home]; c.k = 1; c.backGood = null; c.load = 0; c.kind = 'fin'; continue; } // en casa: lo descargan y se queda vacío
      c.done = true; continue;
    }
    let sp = 22 * dt; const dx = tgt[0] - c.x, dy = tgt[1] - c.y, d = Math.hypot(dx, dy);
    // No atraviesa otros barcos: mide lo largo que es (el suyo y el del otro); si lo tiene delante, para y se aparta a un
    // lado hasta que queda libre (el de detrás espera)
    { const ux = dx / (d || 1), uy = dy / (d || 1), half = (c.dy || 0) > .6 ? 14 : 38; let block = null, stop = false;
      for (const [ox, oy, r] of shipsNear(c)) { const rx = ox - c.x, ry = oy - c.y, ahead = rx * ux + ry * uy, side = rx * -uy + ry * ux, wide = 9 + r * .25;
        if (ahead > -half * .6 && ahead < half + r + 10 && Math.abs(side) < wide + 4) { if (block == null || Math.abs(side) < Math.abs(block)) block = side || (c.x % 2 ? .1 : -.1); if (ahead > 0 && ahead < half + r + 4) stop = true; } }
      if (block != null) { sp *= stop ? 0 : .3; const k = block > 0 ? -1 : 1, mx = -uy * k * 16 * dt, my = ux * k * 16 * dt;
        if (seaOk(c.x + mx * 4, c.y + my * 4)) { c.x += mx; c.y += my; } else if (seaOk(c.x - mx * 4, c.y - my * 4)) { c.x -= mx; c.y -= my; } else sp = 8 * dt; } } // (si no puede apartarse por ningún lado, pasa despacio)
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
    liveQ.push({ y:y + 4, f:() => { // (por altura: lo que está en la orilla de delante lo tapa)
    vctx.fillStyle = 'rgba(0,0,0,.22)'; vctx.fillRect(x - (s.width >> 1), y + 1, s.width, 2);
    vctx.save(); vctx.translate(x, y + 4); vctx.rotate(front ? 0 : tilt); if (left) vctx.scale(-1, 1); vctx.drawImage(s, -s.ax, -s.height); vctx.restore(); // navega: sube, baja y cabecea con las olas
    if (c.stageCv && c.full && typeof drawCv === 'function') drawCv(c.stageCv, x + (left ? 6 : -6), y - 8, 0); // la fase del cohete, de pie sobre la cubierta
    if (c.label) { vctx.save(); vctx.font = `bold ${Math.max(4, 11 / zoom)}px system-ui`; vctx.textAlign = 'center'; vctx.lineWidth = 2 / zoom; vctx.strokeStyle = 'rgba(0,0,0,.75)'; vctx.fillStyle = '#fff'; vctx.strokeText(c.label, x, y - s.height - 2); vctx.fillText(c.label, x, y - s.height - 2); vctx.restore(); }
    const g = villageById(c.g), n = g && nationOf(g); if (n && !front) { const fx = left ? x + (s.width >> 1) - 6 : x - (s.width >> 1) + 5, fy = y - s.height + 2; vctx.fillStyle = '#3a3a3a'; vctx.fillRect(fx, fy, 1, 5); if (n.flag) for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) { vctx.fillStyle = flagColor(n.flag, (a + .5) / 4, (b + .5) / 3); vctx.fillRect(fx + 1 + a, fy + b, 1, 1); } }
    redrawFront(x - (s.width >> 1), x + (s.width >> 1), y - s.height, y + 4); } });
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawCargos(performance.now()); }; }
