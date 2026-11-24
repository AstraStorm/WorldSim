// World Sim · Rutas comerciales: el comercio que se ve y que da dinero
// ================= Rutas comerciales =================
// · Tras varias caravanas entre dos pueblos se abre una ruta comercial: en el mapa, un camino dorado con carros que
//   van y vienen (o barcas, si es por mar)
// · Cada medio día la ruta deja negocio a los dos (dinero al tesoro y más mercancía, que baja los precios), y el que
//   tiene comida de sobra se la vende al que pasa hambre
// · La guerra o las sanciones la cortan; si pasan días sin caravanas, se abandona
// · Las monedas que van de un tesoro a otro (préstamos, rescates, ventas) se ven volar con una etiqueta de qué son
function tradeTrip(a, b, r){
  r.trips = (r.trips || 0) + 1; r.tripT = yearT;
  if (!r.route && r.trips >= 3) { r.route = { a:a.id, b:b.id, since:yearT, sea:!!(a.port && b.port && lineWater(a.fx, a.fy, b.fx, b.fy) > .5) }; notify(`Se abre la ruta comercial entre ${a.name} y ${b.name}: carros${r.route.sea ? ' y barcas' : ''} con mercancía irán y vendrán`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }); }
}
// (desde diploTick, para cada pareja que no está en guerra)
function routeTick(a, b, r){
  if (!r.route) return;
  if (r.war || sanctionedPair(a, b) || yearT - (r.tripT ?? yearT) > DAY_LEN * 6) {
    notify(`Se corta la ruta comercial entre ${a.name} y ${b.name}${r.war ? ' por la guerra' : sanctionedPair(a, b) ? ' por las sanciones' : ': ya nadie la usa'}`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T });
    r.route = null; r.trips = 0; return;
  }
  if (yearT - (r.routeT ?? -1e9) < DAY_LEN / 2) return; r.routeT = yearT;
  railCheck(a, b, r); // ¿ferrocarril? (industria.js)
  if (r.rail) { const g = (a.coal || 0) >= (b.coal || 0) ? a : b, was = r.rail.idle; r.rail.idle = (g.coal || 0) < 1; if (!r.rail.idle) g.coal -= 1; if (r.rail.idle && !was) notify(`Se para el tren entre ${a.name} y ${b.name}: no queda carbón`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }); } // el tren quema carbón
  let biz = Math.sqrt(popOf(a) * popOf(b)) * .12 * (r.rail && !r.rail.idle ? 2 : 1);
  if (r.route.sea && (world.pirates || []).length && Math.random() < .06) { // los piratas asaltan un barco mercante
    biz *= .3; notify(`¡Piratas! Asaltan ${knowsSci(a, 'vapor') ? 'un vapor' : 'un galeón'} mercante entre ${a.name} y ${b.name} y se llevan buena parte de la carga`, { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T });
  }
  for (const g of [a, b]) { const ec = ecOf(g); if (ec) ec.treas += Math.round(biz * ec.P); g.trades = (g.trades || 0) + 1; }
  r.v = Math.min(100, r.v + .5);
  // Comida: quien tiene de sobra vende a quien le falta
  for (const [s, q] of [[a, b], [b, a]]) {
    if (s.food > popOf(s) * 4 && q.food < popOf(q) * 2) {
      const n = Math.round(Math.min(20, s.food - popOf(s) * 4, popOf(q) * 2 - q.food)); if (n < 3) continue;
      s.food -= n; q.food += n; const es = ecOf(s), eq = ecOf(q), pay = Math.round(n * priceOf(q) * .5);
      if (es && eq) { eq.treas -= pay; es.treas += pay; moneyFlow(q, s, `${pay} ${q.coin} por ${n} de comida`); } else moneyFlow(q, s, `${n} de comida`);
    }
  }
}
// Dibujo de las rutas: camino dorado de puntos y carros (o barcas) que van y vienen
function drawTradeRoutes(now){
  if (zoom > 5) return;
  const [vx0, vy0, vx1, vy1] = visibleRect();
  vctx.save(); vctx.lineWidth = Math.max(.6, 1.2 / zoom); vctx.setLineDash([2 / zoom * 2, 5 / zoom * 2]); vctx.strokeStyle = 'rgba(240,200,80,.55)';
  for (const r of rels.values()) {
    if (!r.route) continue; const a = villageById(r.route.a), b = villageById(r.route.b); if (!a || !b || !popOf(a) || !popOf(b)) continue;
    const ax = a.fx * T, ay = a.fy * T, bx = b.fx * T, by = b.fy * T;
    if (Math.max(ax, bx) < vx0 || Math.min(ax, bx) > vx1 || Math.max(ay, by) < vy0 || Math.min(ay, by) > vy1) continue;
    vctx.beginPath(); vctx.moveTo(ax, ay); vctx.lineTo(bx, by); vctx.stroke();
    const L = Math.hypot(bx - ax, by - ay) || 1, s = Math.max(1, 1.6 / zoom * 2);
    for (let k = 0; k < (r.route.sea ? 2 : 3); k++) { // tres carros (dos de ida y uno de vuelta); por mar, dos barcos
      const back = k === 2 || (r.route.sea && k === 1), q = ((now / (L * 60) + k / 3) % 1), t = back ? 1 - q : q, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (r.route.sea) { if (WATER[world.biome[Math.floor(y / T) * W + Math.floor(x / T)]]) drawShip(x, y, (bx - ax) * (back ? -1 : 1), knowsSci(a, 'vapor') || knowsSci(b, 'vapor'), villageColor(nationOf(back ? b : a)), now, 1.35); continue; } // galeón o vapor (industria.js)
      vctx.fillStyle = '#8a5a30'; vctx.fillRect(x - 2 * s, y - s, 4 * s, 2 * s);
      vctx.fillStyle = '#f0c840'; vctx.fillRect(x - s, y - 2 * s, 2 * s, s); // la carga
    }
  }
  vctx.restore();
}
