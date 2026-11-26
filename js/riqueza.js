// World Sim · Ricos y pobres que se notan: mansiones, chabolas y ropa
// ================= Riqueza =================
// · Donde hay dinero, los más ricos (los que tienen el triple que la mayoría) convierten su casa de piedra en una
//   mansión, pagándola de su bolsillo (como mucho una por cada ocho habitantes)
// · Los pobres sin casa, cuando no queda sitio, se levantan una chabola con cuatro maderas en las afueras
// · Se nota en la gente: los ricos llevan un collar de oro y una capa; los pobres, la ropa remendada
const RICH_K = 3;
function wealthLines(g){
  if (g.wealthT > yearT - 10 && g.wealthLines) return g.wealthLines;
  const ms = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H).map(u => u.money || 0).sort((a, b) => a - b), med = ms[ms.length >> 1] || 0;
  g.wealthT = yearT; return g.wealthLines = { rich:Math.max(8, med * RICH_K), poor:Math.max(.5, med * .25) };
}
const isRich = (u, g) => g && g.coin && (u.money || 0) >= wealthLines(g).rich;
const isPoor = (u, g) => g && g.coin && (u.money || 0) < wealthLines(g).poor && u.home == null;
function wealthTick(g, dt, people){
  if (!g.coin || (g.wealthTk = (g.wealthTk || 0) - dt) > 0) return; g.wealthTk = 20;
  const at = { x:g.fx * T, y:g.fy * T }, mansions = housesOf(g).filter(i => world.objs[i].key === 'house:mansion').length;
  if (mansions < Math.floor(people.length / 8)) {
    const rich = people.filter(u => isRich(u, g) && u.home != null && world.objs[u.home] && world.objs[u.home].key === 'house:piedra').sort((a, b) => (b.money || 0) - (a.money || 0))[0];
    if (rich) { const o = world.objs[rich.home], cost = Math.round(wealthLines(g).rich * .5); rich.money -= cost; o.key = 'house:mansion'; const x = rich.home % W, y = (rich.home / W) | 0; composeRegion(x - 8, y - 12, x + 8, y + 12);
      notify(`${rich.name}, de lo más rico de ${g.name}, convierte su casa en una mansión`, at); }
  }
}
// Trabajos: chabola para un pobre sin casa cuando no queda sitio (se llama desde chooseJob)
function shackJobs(v, g, add){ if (isPoor(v, g) && houseCap(g) < popOf(g) && g.wood >= 2 && !busyWith(g, 'chabola')) add('chabola', 6); }
function shackTarget(v, g){ const p = bestSite(v, g, 'chabola'); return p ? { k:'chabola', i:p[1] * W + p[0], x:p[0] * T + 2, y:(p[1] + 1) * T + 3 } : null; }
function shackArrive(v, g, t){
  v.actT = 5; v.onDone = () => {
    const x = t.i % W, y = (t.i / W) | 0; if (g.wood < 2 || !tileFree(x, y) || buildingClash(x, y, 'chabola', t.i)) return;
    if (clearable(x - 2, y - 3, x + 2, y + 1)) clearSite(g, x - 2, y - 3, x + 2, y + 1);
    world.objs[t.i] = { key:'house:chabola', v:0, ox:0, oy:0, vid:g.id }; g.houses.push(t.i); g.wood -= 2; v.home = t.i;
    composeRegion(x - 8, y - 12, x + 8, y + 12); connect(g, x, y);
    if (!g.shackMsg) { g.shackMsg = true; notify(`En ${g.name} los que no tienen casa ni dinero se levantan chabolas en las afueras`, { x:x * T, y:y * T }); }
  };
  return true;
}
// Al dibujar: collar y capa de los ricos, remiendos de los pobres
function drawWealth(v, x, y, top){
  const g = villageById(v.vid); if (!g || !g.coin) return;
  if (isRich(v, g)) { vctx.fillStyle = '#6a2a7a'; vctx.fillRect(x - 2 - v.dir, top + 4, 1, 4); vctx.fillStyle = '#f0c848'; vctx.fillRect(x, top + 4, 1, 1); }
  else if ((v.money || 0) < wealthLines(g).poor) { vctx.fillStyle = '#8a6a48'; vctx.fillRect(x + 1, top + 6, 1, 1); vctx.fillRect(x - 1, y - 2, 1, 1); }
}
function wealthCard(g){
  if (!g.coin) return '';
  const ps = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H), rich = ps.filter(u => isRich(u, g)).length, poor = ps.filter(u => (u.money || 0) < wealthLines(g).poor).length;
  const man = housesOf(g).filter(i => world.objs[i].key === 'house:mansion').length, sh = housesOf(g).filter(i => world.objs[i].key === 'house:chabola').length;
  return `<h4>Riqueza</h4><div class="muted" style="font-size:12px">${rich} ricos y ${poor} pobres${man ? ` · ${man} ${man === 1 ? 'mansión' : 'mansiones'}` : ''}${sh ? ` · ${sh} ${sh === 1 ? 'chabola' : 'chabolas'}` : ''}</div>`;
}
