// Forja de Mundos · Piratas y armadas
// ================= Piratas =================
// · Cuando hay barcas por el mar (comercio, colonos, expediciones), aparecen barcos piratas en alta mar (como mucho
//   tres), con su bandera negra. Buscan barcas a las que asaltar: les roban la carga y a veces matan a quien va dentro;
//   de vez en cuando saquean un pueblo de la costa
// · Las naciones con muelle y cuartel que sufren a los piratas mandan su armada a por ellos: si ganan, hunden al
//   pirata y recuperan el botín; si pierden, se hunde la armada
const PIRATE_NAMES = ['La Calavera', 'El Tiburón Negro', 'La Sirena Roja', 'El Cuervo del Mar', 'La Viuda Negra', 'El Kraken', 'La Gaviota Sangrienta', 'El Diente de Ballena'];
const pirates = () => world.pirates ||= [], navies = () => world.navies ||= [];
const seaTile = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx >= 0 && ty >= 0 && tx < W && ty < H && openWater(ty * W + tx); };
// Avanza por el agua hacia un punto; si delante hay tierra, prueba a girar
function sail(o, tx, ty, sp, dt){
  const a0 = Math.atan2(ty - o.y, tx - o.x);
  for (const da of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
    const a = a0 + da, nx = o.x + Math.cos(a) * sp * dt, ny = o.y + Math.sin(a) * sp * dt;
    if (seaTile(nx, ny)) { o.x = nx; o.y = ny; o.dir = Math.cos(a) < 0 ? -1 : 1; return true; }
  }
  return false;
}
function seaSpawnFar(){
  for (let k = 0; k < 200; k++) { const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * H), i = y * W + x;
    if (!openWater(i) || world.biome[i] > B.SHALLOW) continue; if (villages.some(g => popOf(g) && Math.hypot(g.fx - x, g.fy - y) < 30)) continue; return [x * T + 2, y * T + 2]; }
  return null;
}
let pirateClock = 0;
function updatePirates(dt){
  if (!world || !villages.length) return;
  const P = pirates(), N = navies();
  if ((pirateClock += dt) > 10) { pirateClock = 0;
    const traffic = travelers.some(t => t.sea) || villages.filter(g => g.port && popOf(g)).length >= 2;
    if (traffic && P.length < 3 && yearT > DAY_LEN * 2 && Math.random() < .08) { const s = seaSpawnFar(); if (s) { const used = new Set(P.map(p => p.name)); const name = PIRATE_NAMES.find(n => !used.has(n)) || 'Los Sin Nombre'; P.push({ name, x:s[0], y:s[1], dir:1, hp:3 + Math.floor(Math.random() * 3), gold:0, cd:0, wx:s[0], wy:s[1] }); notify(`Aparecen piratas en alta mar: el barco «${name}», con la bandera negra`, { x:s[0], y:s[1] }); } }
    // Las naciones que sufren a los piratas mandan su armada
    for (const g of villages) if (popOf(g) && nationOf(g) === g && g.port && hasBarracks(g) && (g.piracyT ?? -1e9) > yearT - DAY_LEN * 2 && !N.some(n => n.nation === g.id) && P.length) {
      const L = g.port.launch, sx = (L % W) * T + 2, sy = ((L / W) | 0) * T + 3, sailors = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && u.weapon).length;
      if (sailors < 3) continue;
      N.push({ nation:g.id, x:sx, y:sy, dir:1, hp:2 + Math.min(4, Math.floor(sailors / 2)), home:[sx, sy], t:0 }); notify(`${g.name} manda su armada a por los piratas`, { x:sx, y:sy });
    }
  }
  for (const p of P) {
    p.cd -= dt;
    // Busca una barca cerca; si no, da vueltas
    let tgt = null, bd = 260;
    for (const t of travelers) if (t.sea && !t.done && inWater(t.x, t.y)) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; tgt = t; } }
    if (tgt) { sail(p, tgt.x, tgt.y, 15, dt); if (bd < 8 && p.cd <= 0) { p.cd = 20; raid(p, tgt); } }
    else { if (Math.hypot(p.wx - p.x, p.wy - p.y) < 6 || !sail(p, p.wx, p.wy, 9, dt)) { const a = Math.random() * Math.PI * 2; p.wx = p.x + Math.cos(a) * 160; p.wy = p.y + Math.sin(a) * 160; }
      // Saqueo de la costa: un pueblo con muelle cercano
      if (p.cd <= 0 && Math.random() < dt * .01) { const g = villages.find(o => popOf(o) && o.port && Math.hypot(o.fx * T - p.x, o.fy * T - p.y) < 90); if (g) { p.cd = 40; const take = Math.min(g.food, 15); g.food -= take; p.gold += 3; g.piracyT = yearT; misfortune(g, 'guerra'); notify(`¡Los piratas de «${p.name}» saquean la costa de ${g.name} y se llevan ${Math.round(take)} de comida!`, { x:p.x, y:p.y }); } } }
  }
  for (const n of N) {
    const g = villageById(n.nation); n.t += dt;
    let tgt = null, bd = Infinity; for (const p of P) { const d = Math.hypot(p.x - n.x, p.y - n.y); if (d < bd) { bd = d; tgt = p; } }
    if (!tgt || !g || n.t > 120) { n.done = true; continue; } // sin piratas (o tras mucho buscar), vuelve a puerto
    sail(n, tgt.x, tgt.y, 16, dt);
    if (bd < 10) { // combate: gana el que más aguanta (con algo de suerte)
      if (Math.random() * (n.hp + tgt.hp) < n.hp * 1.1) { tgt.dead = true; if (g) { g.gold = (g.gold || 0) + tgt.gold; if (g.coin) ecOf(g).treas += tgt.gold * 5 * ecOf(g).P; } notify(`¡La armada de ${g ? g.name : '?'} hunde al barco pirata «${tgt.name}»${tgt.gold ? ` y recupera ${tgt.gold} de oro` : ''}!`, { x:n.x, y:n.y }); if (g) g.piracyT = -1e9; }
      else { n.done = true; const lost = villagers.filter(u => !u.dead && u.vid === n.nation && u.weapon).slice(0, 2); for (const u of lost) killVillager(u, 'piratas'); notify(`Los piratas de «${tgt.name}» hunden la armada de ${g ? g.name : '?'}${lost.length ? `: mueren ${lost.length} marineros` : ''}`, { x:n.x, y:n.y }); tgt.hp = Math.max(1, tgt.hp - 1); }
      n.done = n.done || tgt.dead;
    }
  }
  if (P.some(p => p.dead)) world.pirates = P.filter(p => !p.dead);
  if (N.some(n => n.done)) world.navies = N.filter(n => !n.done);
}
// Asalto a una barca: se llevan la carga y a veces matan a quien va dentro
function raid(p, t){
  const g = villageById(t.from), at = { x:t.x, y:t.y };
  if (g) g.piracyT = yearT;
  if (t.kind === 'flota' && (t.crew || []).filter(u => !u.dead).length >= 3 && Math.random() < .55) { p.hp--; if (p.hp <= 0) p.dead = true; notify(`Los soldados de la flota de ${g ? g.name : '?'} rechazan a los piratas de «${p.name}»${p.dead ? ' y hunden su barco' : ''}`, at); return; }
  const loot = t.cargo ? `${t.cargo.n} de ${GOODS[t.cargo.k].txt}` : 'lo que llevaban'; if (t.cargo) p.gold += Math.ceil(t.cargo.n / 4); else p.gold += 1; t.cargo = null;
  const kill = Math.random() < .35 && t.v && !t.v.dead;
  if (kill) { t.v.away = false; killVillager(t.v, 'piratas'); t.done = true; }
  notify(`¡Los piratas de «${p.name}» asaltan la barca de ${g ? g.name : '?'} y se llevan ${loot}${kill ? `; ${t.v.name} muere` : ''}!`, at);
}
function drawPirates(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const p of pirates()) { if (p.x < x0 - 30 || p.x > x1 + 30 || p.y < y0 - 30 || p.y > y1 + 30) continue;
    const x = Math.round(p.x), y = Math.round(p.y); drawBoat(x, y, p.dir, now, true);
    vctx.fillStyle = '#3a2a1a'; vctx.fillRect(x, y - 16, 1, 12); vctx.fillStyle = '#141414'; vctx.fillRect(x + 1, y - 16, 6, 4); vctx.fillStyle = '#f0f0e8'; vctx.fillRect(x + 3, y - 15, 2, 2); // la bandera negra con su calavera
    redrawFront(x - 15, x + 15, y - 18, y); }
  for (const n of navies()) { if (n.x < x0 - 30 || n.x > x1 + 30 || n.y < y0 - 30 || n.y > y1 + 30) continue;
    const g = villageById(n.nation), x = Math.round(n.x), y = Math.round(n.y); drawBoat(x, y, n.dir, now, true);
    vctx.fillStyle = '#3a2a1a'; vctx.fillRect(x, y - 16, 1, 12); const f = g && (nationOf(g).flag || g.flag); if (f) drawFlag(f, x + 1, y - 16, 6, 4, 1, now); redrawFront(x - 15, x + 15, y - 18, y); }
}
