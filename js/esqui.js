// World Sim · Estaciones de esquí en las montañas nevadas
// ================= Esquí =================
// · Una ciudad de 35 o más, con dinero y electricidad, que tiene una montaña con nieve a mano (de 25 a 75 casillas)
//   abre una estación de esquí: un refugio abajo, un telesilla en línea recta con sus torres hasta la cima y una pista
//   que baja por la ladera. Un camino la une con la ciudad
// · Abre en la temporada de nieve (si la cumbre tiene nieves perpetuas, todo el año menos el verano). Abierta, da
//   plazas de ocio a las ciudades de su nación que están cerca (ocio.js), la gente aburrida sube a esquiar y deja
//   dinero en la ciudad dueña
// · Se ve: las sillas suben y bajan, los esquiadores bajan por la pista haciendo eses. Con los dibujos de la hoja 15
//   (refugio, estaciones, torres, sillas) cuando estén; mientras, a mano
BLD.add('skilodge'); BUILD_DIMS.skilodge = [5, 5]; OBJ['skilodge:refugio'] = ['Refugio de esquí', 'house', 0]; SPRITE_ALIAS['skilodge:refugio'] = 'tavern:taberna';
const skiResorts = () => villages.filter(g => g.ski && popOf(g));
const snowyAt = i => world.biome[i] === B.SNOW || (snowA && snowA[i] > .2);
// Abierta: con nieve en la mitad de la pista (o nieves perpetuas arriba y no es verano)
function skiOpen(S){
  if (!S || !world.objs[S.lodge]) return false;
  const mid = S.piste[S.piste.length >> 1], top = S.piste[0];
  return (snowA && snowA[mid] > .15) || (world.biome[top] === B.SNOW && seasonInfo().i !== 1);
}
function skiPlazas(g){
  let n = 0; for (const o of skiResorts()) if (nationOf(o) === nationOf(g) && skiOpen(o.ski) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 100) n += 40;
  return n;
}
// Ladera abajo desde la cima, hasta salir de la nieve (y un poco más, para el refugio)
function skiPiste(x, y){
  const e = world.e, path = [y * W + x], seen = new Set(path); let out = 0;
  for (let s = 0; s < 40; s++) {
    let bx = -1, by = -1, be = e[y * W + x];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const n = (y + dy) * W + x + dx; if (seen.has(n) || x + dx < 2 || y + dy < 2 || x + dx >= W - 2 || y + dy >= H - 2) continue; if (e[n] < be) { be = e[n]; bx = x + dx; by = y + dy; } }
    if (bx < 0) break; x = bx; y = by; const i = y * W + x; if (WATER[world.biome[i]]) break; path.push(i); seen.add(i);
    if (world.biome[i] !== B.SNOW && ++out >= 4) break;
  }
  return path;
}
function skiSite(g){
  const R = typeof townRadius === 'function' ? townRadius(g) : 10;
  for (let k = 0; k < 500; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.max(25, R + 12) + Math.random() * 50, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d);
    if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4 || world.biome[y * W + x] !== B.SNOW) continue;
    const piste = skiPiste(x, y); if (piste.length < 10) continue;
    const b = piste[piste.length - 1], bx = b % W, by = (b / W) | 0;
    if (!tileFree(bx, by) || volcDanger(bx, by, 6) || !clearable(bx - 5, by - 5, bx + 5, by + 1) || liveTowns().some(o => Math.hypot(o.fx - bx, o.fy - by) < 22)) continue;
    if ((typeof skiResorts === 'function') && skiResorts().some(o => Math.hypot(o.ski.base[0] - bx, o.ski.base[1] - by) < 30)) continue;
    return { piste, base:[bx, by], top:[x, y] };
  }
  return null;
}
let skiT = 0;
SYSTEMS.push(dt => { try {
  if (!world || (skiT -= dt) > 0) return; skiT = 10;
  // Abrir una estación nueva
  for (const g of liveTowns()) {
    if (g.ski || popOf(g) < 35 || !g.coin || !knowsSci(nationOf(g), 'electricidad') || (g.wood || 0) < 40 || (g.stone || 0) < 20 || (g.skiFail && yearT - g.skiFail < DAY_LEN * 3)) continue;
    if (skiResorts().filter(o => nationOf(o) === nationOf(g)).length >= 2) continue;
    const s = skiSite(g); if (!s) { g.skiFail = yearT; continue; }
    const [bx, by] = s.base, i = by * W + bx; clearSite(g, bx - 5, by - 5, bx + 5, by + 1);
    world.objs[i] = { key:'skilodge:refugio', v:0, ox:0, oy:0, vid:g.id };
    g.ski = { lodge:i, base:s.base, top:s.top, piste:s.piste, since:yearT, visitors:0, open:false };
    g.wood -= 40; g.stone -= 20; composeRegion(bx - 10, by - 14, bx + 10, by + 12); addEffect(bx * T + 2, by * T + 3, 'poof'); connect(g, bx, by);
    notify(`${g.name} inaugura una estación de esquí en las montañas: un refugio, un telesilla hasta la cima y una pista que baja por la ladera`, { x:bx * T, y:by * T });
  }
  // Temporada: abre y cierra con la nieve; la gente aburrida sube a esquiar y deja dinero
  for (const g of skiResorts()) {
    const S = g.ski; if (!world.objs[S.lodge]) { g.ski = null; continue; }
    const open = skiOpen(S);
    if (open !== S.open) { S.open = open; notify(open ? `Abre la temporada de esquí en las pistas de ${g.name}: ¡ha nevado!` : `Cierra la estación de esquí de ${g.name} hasta que vuelva a nevar`, { x:S.base[0] * T, y:S.base[1] * T }); }
    if (!open) { S.visitors = Math.max(0, S.visitors - 2); continue; }
    let n = 0;
    for (const o of liveTowns()) { if (nationOf(o) !== nationOf(g) || Math.hypot(o.fx - S.base[0], o.fy - S.base[1]) > 100) continue;
      const bored = villagers.filter(v => !v.dead && !v.away && v.vid === o.id && ageOf(v) >= ADULT_H && yearT - (v.fun || v.born || 0) > DAY_LEN * 1.5 && (v.money || 0) >= 1).slice(0, 3);
      for (const v of bored) { v.fun = yearT; v.ski = yearT; v.money -= 1; n++; } }
    S.visitors = Math.min(30, S.visitors * .8 + n); const ec = ecOf(g); if (ec && n) ec.treas += Math.round(n * 1.5 * ec.P);
  }
} catch (e) { console.error(e); } });

// ---- Dibujo ----
const skiFaces = []; const skiFace = k => skiFaces[k] ||= (() => { const v = makeVillager(0, 0, Math.random, 5, Math.random() < .5 ? 'h' : 'm'); v.shirt = ['#c8302a', '#2a6ac8', '#e0a030', '#2a9a4a', '#8a2ac8'][k % 5]; return v; })();
const skiPolyC = new WeakMap(); // (no va en la partida)
function skiPoly(S){ let P = skiPolyC.get(S); if (P) return P; skiPolyC.set(S, P = (() => { const pts = S.piste.map(i => [(i % W) * T + 2, ((i / W) | 0) * T + 3]), cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { pts, cum, L:cum[cum.length - 1] || 1 }; })()); return P; }
function skiAt(P, s){ const { pts, cum } = P; let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const f = (s - cum[k - 1]) / Math.max(.001, cum[k] - cum[k - 1]); return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f, pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]; }
function drawSkiStation(x, y, top){
  const f = artFrame(top ? 'ski:telesilla_cima' : 'ski:telesilla_base');
  if (f) { vctx.drawImage(f, Math.round(x - f.ax), Math.round(y - f.height + 1)); return; }
  const w = top ? 10 : 13, h = top ? 6 : 7; // (a mano: caseta con tejado nevado y la rueda del cable)
  vctx.fillStyle = '#22201e'; vctx.fillRect(x - w / 2 - 1, y - h - 4, w + 2, h + 5);
  vctx.fillStyle = '#9a6a3e'; vctx.fillRect(x - w / 2, y - h, w, h); vctx.fillStyle = '#f4f6fa'; vctx.fillRect(x - w / 2 - 1, y - h - 3, w + 2, 3);
  vctx.fillStyle = '#8a8e96'; vctx.fillRect(x - 3, y - h + 2, 6, 2); vctx.fillStyle = '#f0d070'; vctx.fillRect(x + w / 2 - 3, y - 4, 2, 2);
}
function drawSkiTower(x, y){
  const f = artFrame('ski:torre'); if (f) { vctx.drawImage(f, Math.round(x - f.ax), Math.round(y - f.height + 1)); return; }
  vctx.fillStyle = '#5a5e66'; vctx.fillRect(x, y - 13, 1, 13); vctx.fillStyle = '#8a8e96'; vctx.fillRect(x - 3, y - 14, 7, 1); vctx.fillStyle = '#6a6e76'; vctx.fillRect(x - 1, y, 3, 1);
}
function drawSkiChair(x, y, dir){
  const f = artFrame('ski:silla'); if (f) { vctx.drawImage(f, Math.round(x - f.width / 2), Math.round(y)); return; }
  vctx.fillStyle = '#5a5e66'; vctx.fillRect(Math.round(x), Math.round(y), 1, 3); vctx.fillStyle = '#a82a32'; vctx.fillRect(Math.round(x) - 2, Math.round(y) + 3, 4, 1); vctx.fillRect(Math.round(x) + (dir > 0 ? -2 : 1), Math.round(y) + 1, 1, 2);
}
function drawSki(t){
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of skiResorts()) {
    const S = g.ski, [bx, by] = S.base, [tx, ty] = S.top, X0 = bx * T + 2, Y0 = by * T + 3, X1 = tx * T + 2, Y1 = ty * T + 3;
    if (Math.max(X0, X1) < x0 - 40 || Math.min(X0, X1) > x1 + 40 || Math.max(Y0, Y1) < y0 - 40 || Math.min(Y0, Y1) > y1 + 40) continue;
    const open = S.open, P = skiPoly(S);
    // La pista: nieve pisada y jalones naranjas
    if (open) { vctx.lineCap = 'round'; vctx.lineJoin = 'round'; for (const [c, w] of [['rgba(150,176,214,.55)', 8], ['rgba(246,250,255,.9)', 5]]) { vctx.strokeStyle = c; vctx.lineWidth = w; vctx.beginPath(); P.pts.forEach(([x, y], k) => k ? vctx.lineTo(x, y) : vctx.moveTo(x, y)); vctx.stroke(); } vctx.lineWidth = 1; // (nieve pisada, con el borde azulado)
      for (let k = 2; k < P.pts.length - 1; k += 4) { const [x, y] = P.pts[k]; vctx.fillStyle = '#e07020'; vctx.fillRect(Math.round(x) + 4, Math.round(y) - 4, 1, 4); vctx.fillRect(Math.round(x) - 5, Math.round(y) - 4, 1, 4); } }
    // El telesilla: de la caseta de abajo (al lado del refugio) a la cima, en línea recta; el cable pasa por lo alto de
    // cada torre y de las dos casetas, y las sillas cuelgan de él (suben por un lado y bajan por el otro)
    const ax = X0 + 32, ay = Y0, nT = Math.max(1, Math.floor(Math.hypot(X1 - ax, Y1 - ay) / 45)); // (la caseta, a un lado del refugio; la línea va paralela a la pista, no encima)
    const fT = artFrame('ski:torre'), fB = artFrame('ski:telesilla_base'), fC = artFrame('ski:telesilla_cima');
    const hT = fT ? fT.height - 4 : 13, hB = fB ? fB.height - 6 : 9, hC = fC ? fC.height - 7 : 8;
    // La caseta de alquiler, al otro lado del refugio
    const fA = artFrame('ski:alquiler'); if (fA) vctx.drawImage(fA, Math.round(X0 - 38 - fA.ax), Math.round(Y0 - fA.height + 1));
    drawSkiStation(ax, ay, false);
    const bX = X1 + 30, bY = Y1; // (arriba, también a un lado de la pista)
    const towers = []; for (let k = 1; k <= nT; k++) { const f = k / (nT + 1); towers.push([ax + (bX - ax) * f, ay + (bY - ay) * f]); }
    for (const [x, y] of towers) drawSkiTower(x, y);
    drawSkiStation(bX, bY, true);
    const cab = [[ax, ay - hB], ...towers.map(([x, y]) => [x, y - hT]), [bX, bY - hC]], cum = [0];
    for (let k = 1; k < cab.length; k++) cum.push(cum[k - 1] + Math.hypot(cab[k][0] - cab[k - 1][0], cab[k][1] - cab[k - 1][1]));
    const L = cum[cum.length - 1] || 1, at = s => { let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const f = (s - cum[k - 1]) / Math.max(.001, cum[k] - cum[k - 1]); return [cab[k - 1][0] + (cab[k][0] - cab[k - 1][0]) * f, cab[k - 1][1] + (cab[k][1] - cab[k - 1][1]) * f]; };
    // (los dos cables, a cada lado: separados en perpendicular a la línea, para que las sillas de subida y de bajada no se pisen)
    const dX = bX - ax, dY = bY - ay, dl = Math.hypot(dX, dY) || 1, px = -dY / dl * 6, py = dX / dl * 3;
    vctx.strokeStyle = 'rgba(40,40,46,.85)'; for (const sg of [-1, 1]) { vctx.beginPath(); cab.forEach(([x, y], k) => k ? vctx.lineTo(x + px * sg, y + py * sg) : vctx.moveTo(x + px * sg, y + py * sg)); vctx.stroke(); }
    const nC = Math.max(2, Math.floor(L / 30)), sp = open ? t / 1000 * 6 : 0;
    for (let k = 0; k < nC * 2; k++) { const up = k % 2 === 0, s = ((Math.floor(k / 2) / nC) * L + sp + (up ? 0 : L / nC / 2)) % L, [x, y] = at(up ? s : L - s), sg = up ? -1 : 1; drawSkiChair(x + px * sg, y + py * sg, up ? 1 : -1); }
    // Cañones de nieve a lo largo de la pista (echando nieve cuando está abierta)
    const fN = artFrame('ski:canon');
    if (fN) for (let k = 3; k < P.pts.length - 2; k += 6) { const [x, y] = P.pts[k], cx = Math.round(x + 9), cy = Math.round(y); vctx.drawImage(fN, cx - fN.ax, cy - fN.height + 1);
      if (open) for (let q = 0; q < 4; q++) { const ph = (t / 600 + q / 4 + k) % 1; vctx.fillStyle = `rgba(255,255,255,${.9 * (1 - ph)})`; vctx.fillRect(Math.round(cx + 6 + ph * 10), Math.round(cy - 14 - ph * 6 + Math.sin(q * 2) * 2), 1, 1); } }
    // Los esquiadores bajan haciendo eses
    if (open) { const nS = Math.min(8, 2 + Math.floor(S.visitors / 4));
      for (let k = 0; k < nS; k++) { const s = ((t / 1000 * 9 + k * P.L / nS) % P.L), [x, y, dx, dy] = skiAt(P, s), d = Math.hypot(dx, dy) || 1, sw = Math.sin(t / 380 + k * 1.7) * 4, px = x - dy / d * sw, py = y + dx / d * sw;
        if (px < x0 - 10 || px > x1 + 10 || py < y0 - 10 || py > y1 + 10) continue;
        const v = skiFace(k), sp2 = personSprite(v, 0, Math.cos(t / 380 + k * 1.7) < 0); vctx.drawImage(sp2, Math.round(px - (sp2.width >> 1)), Math.round(py - sp2.height + 1));
        vctx.fillStyle = '#22201e'; vctx.fillRect(Math.round(px) - 3, Math.round(py) + 1, 7, 1); } } // los esquís
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ const r = base.apply(this, arguments); try { drawSki(performance.now()); } catch (e) { console.error(e); } return r; }; }
