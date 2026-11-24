// World Sim · Minas: se abren donde más vetas hay y sacan mineral casi sin fin; la cantera también da algo
// ================= Minas =================
// · Quien ya sabe sacar mineral de las vetas (minería) busca el sitio con más vetas cerca del pueblo y abre una mina
// · La mina da hierro, oro o gemas según lo que había alrededor, en mucha más cantidad que una veta suelta, y su
//   reserva es casi infinita (se va gastando muy poco a poco)
// · Al picar en la cantera a veces sale algo de hierro, oro o una gema entre la piedra
// · Si hace falta hierro u oro (para una institución, la herrería o las armas), va más gente a la mina
const MINE_RESERVE = 4000;
const hasMine = g => g.mine != null && !!world.objs[g.mine] && world.objs[g.mine].key === 'mine:mina';
// Cuántas vetas de cada clase hay alrededor de una casilla
function oresAround(x, y, r){
  const mix = { hierro:0, oro:0, gemas:0 };
  for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const o = world.objs[yy * W + xx]; if (!o || OBJ[o.key][1] !== 'mineral') continue;
    mix[o.key.startsWith('ore:iron') ? 'hierro' : o.key.startsWith('ore:gold') ? 'oro' : 'gemas']++;
  }
  return mix;
}
// El mejor sitio: donde más vetas hay en un radio de 6 casillas (al menos 3), con sitio para la boca de la mina
function mineSite(g){
  let best = null, bs = 2;
  for (let y = g.fy - 40; y <= g.fy + 40; y += 2) for (let x = g.fx - 40; x <= g.fx + 40; x += 2) {
    if (x < 6 || y < 8 || x >= W - 6 || y >= H - 3) continue;
    const m = oresAround(x, y, 6), n = m.hierro + m.oro * 1.5 + m.gemas * 1.5; if (n <= bs) continue;
    const p = ringFind(x, y, 4, (px, py) => tileFree(px, py) && clearable(px - 4, py - 5, px + 4, py + 1) && !buildingClash(px, py, 'mina') && !plotIn(px - 4, py - 5, px + 4, py + 1));
    if (p) { bs = n; best = { x:p[0], y:p[1], mix:m }; }
  }
  return best;
}
// Trabajos (se llaman desde chooseJob)
function mineJobs(v, g, add){
  const kn = g.know || {};
  if (!hasMine(g)) { add('mina', kn.mineria && (g.oresNear || 0) >= 3 && g.wood >= 12 && g.stone >= 8 && !busyWith(g, 'mina') && !(g.noMineSite > yearT) ? 9 : 0); return; }
  const want = hasForge(g) || (g.iron || 0) < 6 || Object.entries(INSTS).some(([k, I]) => !hasInst(g, k) && I.want(g) && instMissing(g, I).some(([f]) => f === 'iron' || f === 'gold'));
  add('extraer', busyWith(g, 'extraer') < 4 && (g.mineLeft ?? MINE_RESERVE) > 0 ? (want ? 5 : 2.5) : 0);
}
function mineTarget(v, g, job){
  if (job === 'mina') {
    const s = mineSite(g); if (!s) { g.noMineSite = yearT + DAY_LEN * 2; return null; }
    return { k:job, i:s.y * W + s.x, x:s.x * T + 2, y:(s.y + 1) * T + 3, mix:s.mix };
  }
  const sb = hasMine(g) && standBy(g.mine); return sb ? { k:job, x:sb[0] + (Math.random() - .5) * 6, y:sb[1] } : null;
}
function mineArrive(v, g, t){
  if (t.k === 'mina') { v.actT = 14; v.onDone = () => {
    const x = t.i % W, y = (t.i / W) | 0;
    if (hasMine(g) || g.wood < 12 || g.stone < 8) return;
    if (clearable(x - 4, y - 5, x + 4, y + 1)) clearSite(g, x - 4, y - 5, x + 4, y + 1);
    if (!tileFree(x, y) || buildingClash(x, y, 'mina', t.i)) return;
    world.objs[t.i] = { key:'mine:mina', v:0, ox:0, oy:0, vid:g.id }; g.mine = t.i; g.wood -= 12; g.stone -= 8;
    g.mineMix = t.mix || oresAround(x, y, 8); g.mineLeft = MINE_RESERVE;
    composeRegion(x - 10, y - 16, x + 10, y + 12); addEffect(x * T + 2, y * T + 3, 'poof'); connect(g, x, y); snd('bell', x * T, y * T);
    const m = g.mineMix, what = [m.hierro && 'hierro', m.oro && 'oro', m.gemas && 'gemas'].filter(Boolean).join(', ');
    notify(`En ${g.name} abren una mina donde más vetas había${what ? ` (${what})` : ''}: sacarán mineral casi sin fin`, { x:x * T, y:y * T });
  }; return true; }
  if (t.k === 'extraer') { v.actT = hasForge(g) ? 3 : 4; v.dir = Math.random() < .5 ? -1 : 1; v.onDone = () => {
    if (!hasMine(g) || (g.mineLeft ?? MINE_RESERVE) <= 0) return;
    const m = g.mineMix || { hierro:1, oro:0, gemas:0 }, tot = m.hierro * 1 + m.oro * .8 + m.gemas * .5 || 1;
    let r = Math.random() * tot, kind = 'hierro';
    if ((r -= m.hierro) >= 0) kind = (r -= m.oro * .8) < 0 ? 'oro' : 'gemas';
    const n = Math.round((kind === 'hierro' ? 4 : kind === 'oro' ? 2 : 1) * (knowsSci(g, 'metalurgia') ? 1.5 : 1)); // metalurgia (ciencia.js)
    v.carry = { k:kind, n }; g.mineLeft = (g.mineLeft ?? MINE_RESERVE) - n;
    if (g.mineLeft <= 0) notify(`La mina de ${g.name} se ha agotado después de tantos años`, { x:(g.mine % W) * T, y:((g.mine / W) | 0) * T });
  }; return true; }
  return false;
}
// En la cantera, entre la piedra, a veces sale algo de mineral
function quarryBonus(v, g){
  const r = Math.random(), at = { x:v.x, y:v.y - 18 };
  if (r < .15) { g.iron = (g.iron || 0) + 1; floats.push({ ...at, txt:'+1 hierro', col:'#b8c0cc', life:0 }); }
  else if (r < .19) { g.gold = (g.gold || 0) + 1; floats.push({ ...at, txt:'+1 oro', col:'#f8d850', life:0 }); }
  else if (r < .21) { g.gems = (g.gems || 0) + 1; floats.push({ ...at, txt:'+1 gema', col:'#d88af0', life:0 }); }
}
function mineCard(g){
  if (!hasMine(g)) return (g.know || {}).mineria ? `<h4>Mina</h4><div class="muted">${(g.oresNear || 0) >= 3 ? 'Aún no han abierto mina' : 'No hay bastantes vetas cerca para abrir una mina'}</div>` : '';
  const m = g.mineMix || {}, left = g.mineLeft ?? MINE_RESERVE;
  return `<h4>Mina</h4><div class="needs"><span>Reserva</span>${bar(left / MINE_RESERVE, '#a8a49c', 150)}<span>${Math.round(left / MINE_RESERVE * 100)} %</span></div>
    <div class="muted">Saca ${[m.hierro && 'hierro', m.oro && 'oro', m.gemas && 'gemas'].filter(Boolean).join(', ') || 'hierro'} · almacén: hierro ${g.iron || 0}, oro ${g.gold || 0}, gemas ${g.gems || 0}</div>`;
}
// Arreglo de partidas antiguas: la muralla que se construyó por encima de un cercado se quita (el cercado ya tiene su valla)
let penWallClock = 0;
function clearWallsOverPens(dt){
  if ((penWallClock -= dt) > 0 || !wallSet.size) return; penWallClock = 10;
  for (const g of villages) for (const p of pensOf(g)) for (let y = p.y0 - 1; y <= p.y1 + 1; y++) for (let x = p.x0 - 1; x <= p.x1 + 1; x++) { const i = y * W + x; if (wallSet.has(i)) { wallSet.delete(i); wallStone.delete(i); } }
}
