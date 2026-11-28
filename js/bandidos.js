// World Sim · Bandidos en los caminos
// ================= Bandidos =================
// · Cuando hay caravanas por tierra (o mucha pobreza), en un bosque o en unas colinas lejos de los pueblos se monta un
//   campamento de bandidos (como mucho dos). Salen a asaltar caravanas y viajeros que pasan cerca: les roban la carga y
//   a veces matan a alguno; de vez en cuando roban comida en un pueblo pequeño
// · Los pueblos que los sufren, si tienen soldados, mandan una patrulla al campamento: si ganan, lo desmantelan y
//   recuperan el botín; si pierden, mueren algunos de los suyos
const bandits = () => world.bandits ||= [];
function banditSite(){
  for (let k = 0; k < 300; k++) { const x = 8 + Math.floor(Math.random() * (W - 16)), y = 8 + Math.floor(Math.random() * (H - 16)), b = world.biome[y * W + x];
    if (![B.FOREST, B.HILLS, B.SWAMP].includes(b) || !walkable(x * T, y * T)) continue;
    const d = Math.min(...villages.filter(g => popOf(g)).map(g => Math.hypot(g.fx - x, g.fy - y)));
    if (d < 25 || d > 90) continue; return [x, y]; }
  return null;
}
const banditFace = () => { const v = makeVillager(0, 0, Math.random, 4, Math.random() < .8 ? 'h' : 'm'); v.shirt = '#3a3a3a'; v.hat = null; return v; }; // (no se añade a la gente: solo para dibujarlo)
let banditClock = 0;
function updateBandits(dt){
  if (!world || !villages.length) return;
  const Bs = bandits();
  if ((banditClock += dt) > 10) { banditClock = 0;
    const roads = travelers.some(t => !t.sea && t.kind === 'caravana') || villages.some(g => popOf(g) >= 15 && g.coin);
    if (roads && Bs.length < 1 && yearT > DAY_LEN * 3 && Math.random() < .02) { const s = banditSite(); if (s) { const names = ['los Lobos del Camino', 'la Banda del Tuerto', 'los Hijos de la Niebla', 'los Sin Tierra', 'la Banda de la Cicatriz']; const used = new Set(Bs.map(b => b.name)); const name = names.find(n => !used.has(n)) || 'una banda'; Bs.push({ name, cx:s[0] * T + 2, cy:s[1] * T + 3, x:s[0] * T + 2, y:s[1] * T + 3, men:3 + Math.floor(Math.random() * 3), loot:0, cd:0, faces:[banditFace(), banditFace(), banditFace(), banditFace(), banditFace()], dir:1 }); notify(`En el bosque se esconde una banda de salteadores: ${name}`, { x:s[0] * T, y:s[1] * T }); } }
    // Patrullas contra los campamentos que han hecho daño
    // (tras una emboscada el pueblo tarda en volver a intentarlo, y solo va si tiene gente suficiente para la banda)
    for (const b of Bs) if (!b.patrol) { const g = villages.find(o => popOf(o) && (o.banditT ?? -1e9) > yearT - DAY_LEN * 2 && (o.patrolCd ?? -1e9) < yearT && Math.hypot(o.fx * T - b.cx, o.fy * T - b.cy) < 90 * T);
      if (g) { const sol = villagers.filter(u => !u.dead && !u.away && u.vid === g.id && u.weapon && u !== g.leader && ageOf(u) >= ADULT_H).slice(0, 6); if (sol.length >= Math.max(2, b.men - 1)) { b.patrol = { vid:g.id, n:sol.length, t:DAY_LEN * .2 }; notify(`${g.name} manda una patrulla de ${sol.length} contra ${b.name}`, { x:g.fx * T, y:g.fy * T }); } } }
  }
  for (const b of Bs) {
    b.cd -= dt;
    // Una banda no dura para siempre: al cabo de unos días se reparte el botín y se va de la comarca
    b.life ??= DAY_LEN * (5 + Math.random() * 4);
    if (!b.patrol && (b.life -= dt) <= 0) { b.dead = true; notify(`${capFirst(b.name)} levantan el campamento y se van de la comarca`, { x:b.cx, y:b.cy }); continue; }
    // La patrulla llega al cabo de un rato: combate
    if (b.patrol && (b.patrol.t -= dt) <= 0) { const g = villageById(b.patrol.vid), sol = g ? villagers.filter(u => !u.dead && u.vid === g.id && u.weapon).slice(0, b.patrol.n) : [];
      if (sol.length && Math.random() * (sol.length + b.men) < sol.length * 1.2) { b.dead = true; if (g) { g.food += b.loot; g.banditT = -1e9; } notify(`La patrulla de ${g ? g.name : '?'} desmantela el campamento de ${b.name}: ${b.men === 1 ? 'muere el último bandido' : `mueren los ${b.men} bandidos`}${b.loot ? ` y recupera ${Math.round(b.loot)} de comida y mercancías` : ''}`, { x:b.cx, y:b.cy }); }
      else { // la patrulla pierde, pero también cae alguno de la banda; si quedan muy pocos, se dispersan
        const lost = sol.slice(0, Math.random() < .5 ? 1 : 2); for (const u of lost) killVillager(u, 'bandidos'); b.patrol = null; b.men--; if (g) g.patrolCd = yearT + DAY_LEN * 1.5;
        notify(`${b.name} tiende una emboscada a la patrulla de ${g ? g.name : '?'}: mueren ${lost.length}`, { x:b.cx, y:b.cy });
        if (b.men <= 1) { b.dead = true; if (g) g.banditT = -1e9; notify(`Lo que queda de ${b.name} se dispersa`, { x:b.cx, y:b.cy }); } }
      continue; }
    // Buscan caravanas o viajeros a pie cerca del campamento
    // (a pie: no cruzan el mar ni los lagos; si no hay forma de llegar, dejan esa presa)
    if ((b.giveUpT = (b.giveUpT || 0) - dt) <= 0) b.skip = null;
    let tgt = null, bd = 70 * T; for (const t of travelers) if (!t.sea && !t.done && t !== b.skip && ['caravana', 'diplomatico', 'emigrante', 'mensajero'].includes(t.kind) && !inWater(t.x, t.y)) { const d = Math.hypot(t.x - b.cx, t.y - b.cy); if (d < bd) { bd = d; tgt = t; } }
    if (tgt !== b.lastTgt) { b.lastTgt = tgt; b.bestD = null; b.stuckT = 0; }
    const [gx, gy] = tgt ? [tgt.x, tgt.y] : [b.cx, b.cy], d = Math.hypot(gx - b.x, gy - b.y);
    if (d > 2) {
      const sp = Math.min(d, 11 * dt), a0 = Math.atan2(gy - b.y, gx - b.x); let moved = false;
      for (const da of [0, .6, -.6, 1.2, -1.2, 1.8, -1.8]) { const nx = b.x + Math.cos(a0 + da) * sp, ny = b.y + Math.sin(a0 + da) * sp; if (walkable(nx, ny) && !inWater(nx, ny)) { b.x = nx; b.y = ny; moved = true; break; } }
      b.dir = gx < b.x ? -1 : 1; if (moved) b.walk = (b.walk || 0) + dt;
      if (tgt && (!moved || stuckOn(b, d, dt))) { b.skip = tgt; b.giveUpT = 30; b.bestD = null; } // atascados contra el agua: a otra cosa
      else if (!tgt && !moved) { b.x = b.cx; b.y = b.cy; } // (vuelven al campamento por el bosque)
    }
    if (tgt && d < 6 && b.cd <= 0) { b.cd = 25; ambush(b, tgt); }
    // De vez en cuando, roban en un pueblo pequeño
    if (!tgt && b.cd <= 0 && Math.random() < dt * .0025) { const g = villages.find(o => popOf(o) && popOf(o) < 14 && Math.hypot(o.fx * T - b.cx, o.fy * T - b.cy) < 60 * T); if (g) { b.cd = 160; const take = Math.min(g.food, 10); g.food -= take; b.loot += take; g.banditT = yearT; notify(`${b.name} entra de noche en ${g.name} y se lleva ${Math.round(take)} de comida`, { x:g.fx * T, y:g.fy * T }); } }
  }
  if (Bs.some(b => b.dead)) world.bandits = Bs.filter(b => !b.dead);
}
function ambush(b, t){
  const g = villageById(t.from), at = { x:t.x, y:t.y }; if (g) g.banditT = yearT;
  const loot = t.cargo ? `${t.cargo.n} de ${GOODS[t.cargo.k].txt}` : 'todo lo que llevaba'; b.loot += t.cargo ? t.cargo.n : 3; t.cargo = null;
  if (t.v && !t.v.dead && t.v.weapon && Math.random() < .5) { if (Math.random() < .45) { banditLose(b, 1, null, at); notify(`${t.v.name}, de ${g ? g.name : '?'}, se defiende y mata a uno de ${b.name}${b.dead ? ': era el último' : ''}`, at); } else notify(`${t.v.name}, de ${g ? g.name : '?'}, se defiende y escapa de ${b.name}`, at); return; }
  const kill = Math.random() < .3 && t.v && !t.v.dead;
  if (kill) { t.v.away = false; killVillager(t.v, 'bandidos'); t.done = true; }
  notify(`¡${capFirst(b.name)} asaltan en el camino a ${t.v ? t.v.name : 'unos viajeros'} de ${g ? g.name : '?'} y se llevan ${loot}${kill ? `; ${t.v.name} muere` : ''}!`, at);
}
function drawBandits(now){
  const [x0, y0, x1, y1] = visibleRect(), tent = artFrame('camp:tienda');
  for (const b of bandits()) {
    if (b.cx > x0 - 30 && b.cx < x1 + 30 && b.cy > y0 - 30 && b.cy < y1 + 30) { if (tent) vctx.drawImage(tent, Math.round(b.cx - tent.ax), Math.round(b.cy - tent.height + 1)); vctx.fillStyle = `rgba(255,140,40,${.6 + Math.sin(now / 90) * .3})`; vctx.fillRect(Math.round(b.cx) + 8, Math.round(b.cy) - 2, 2, 2); }
    if (b.x < x0 - 20 || b.x > x1 + 20 || b.y < y0 - 20 || b.y > y1 + 20) continue;
    // La banda: separados (el de delante, más abajo), con capucha, el pañuelo tapándoles la boca y su arma
    const F = b.faces.slice(0, Math.max(1, Math.min(b.faces.length, b.men))), L = F.map((f, k) => ({ f, k, x:Math.round(b.x + (k - (F.length - 1) / 2) * 7 * (b.dir < 0 ? -1 : 1)), y:Math.round(b.y + (k % 2 ? 3 : 0)) })).sort((p, q) => p.y - q.y);
    for (const { f, k, x, y } of L) {
      const s = personSprite(f, b.moving === false ? 0 : Math.floor((b.walk || 0) * 8 + k) % 2, b.dir < 0), top = y - s.height + 1, d = b.dir < 0 ? -1 : 1;
      vctx.fillStyle = 'rgba(0,0,0,.3)'; vctx.fillRect(x - 2, y + 1, 5, 1); // la sombra
      vctx.drawImage(s, x - (s.width >> 1), top);
      vctx.fillStyle = '#3a2a1e'; vctx.fillRect(x - 2, top, 5, 2); vctx.fillRect(x - 2, top + 2, 1, 2); vctx.fillRect(x + 2, top + 2, 1, 2); // la capucha
      vctx.fillStyle = '#7a1a1a'; vctx.fillRect(x - 1, top + 4, 3, 1); // el pañuelo, sobre la boca
      const wx = x + d * 3;
      if (k % 3 === 0) { vctx.fillStyle = '#5a3a20'; vctx.fillRect(wx, y - 6, 1, 2); vctx.fillStyle = '#d8dce0'; vctx.fillRect(wx, y - 9, 1, 3); } // puñal
      else if (k % 3 === 1) { vctx.fillStyle = '#6a4426'; vctx.fillRect(wx, y - 9, 1, 6); vctx.fillRect(wx - 1, y - 10, 3, 2); } // garrote
      else { vctx.fillStyle = '#6a4426'; vctx.fillRect(wx - d * 2, y - 6, 4, 1); vctx.fillStyle = '#8a8e96'; vctx.fillRect(wx + d * 2, y - 8, 1, 5); } // ballesta
    }
    redrawFront(b.x - 20, b.x + 20, b.y - 16, Math.round(b.y + 3));
  }
}

// ---- Los bandidos también mueren ----
// · Antes la banda solo desaparecía si ganaba una patrulla (una tirada sin más) o si se iba de la comarca. Ahora cada
//   bandido cuenta: los matan el fuego, la lava, las riadas, los tornados, los meteoritos y los misiles, los rayos, los
//   viajeros armados que se defienden y los aldeanos armados que se los cruzan; en modo dios, «Retirar» sobre la banda
//   quita a uno. Sin hombres, la banda se acaba
function banditLose(b, n, why, at){
  if (b.dead || n <= 0) return; n = Math.min(n, b.men); b.men -= n; addEffect(b.x, b.y, 'poof');
  if (b.men <= 0) { b.dead = true; notify(`No queda nadie de ${b.name}${why ? `: ${why}` : ''}`, at || { x:b.x, y:b.y }); return; }
  if (why && !(b.hurtMsg > yearT)) { b.hurtMsg = yearT + DAY_LEN / 3; notify(`${capFirst(b.name)} pierden ${n === 1 ? 'a uno de los suyos' : `a ${n} de los suyos`}: ${why} (quedan ${b.men})`, at || { x:b.x, y:b.y }); }
}
function banditHazards(b, dt){
  const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
  const i = ty * W + tx;
  if (world.biome[i] === B.LAVA) return banditLose(b, b.men, 'la lava se los traga');
  if ((fires.has(i) || fires.has(i - 1) || fires.has(i + 1) || fires.has(i - W) || fires.has(i + W)) && Math.random() < dt * .6) banditLose(b, 1, 'el fuego del bosque');
  if (isFlooded(i) && Math.random() < dt * .3) banditLose(b, 1, 'la riada');
  for (const s of storms) if (s.type === 'tornado') { const d = Math.hypot(s.x - b.x, s.y - b.y); if (d < 10 + s.size * 10 && Math.random() < dt * 1.5 * stormPower(s)) banditLose(b, 1, 'el tornado'); }
  for (const e of blasts) { if (e.age > .5) continue; const hit = (e.hitB ||= []); if (hit.includes(b)) continue; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d > e.blastR) continue; hit.push(b);
    banditLose(b, d < e.R * 1.2 ? b.men : 1 + (Math.random() < .5 ? 1 : 0), 'la explosión'); }
  // Aldeanos armados cerca: pelea (cae alguno de un lado o del otro)
  if ((b.fightT = (b.fightT || 0) - dt) > 0) return; b.fightT = 2;
  const arm = villagers.filter(u => !u.dead && !u.away && !u.boat && u.weapon && Math.abs(u.x - b.x) < 9 * T && Math.abs(u.y - b.y) < 9 * T);
  if (!arm.length) return;
  const p = arm.length / (arm.length + b.men), g = villageById(arm[0].vid), at = { x:b.x, y:b.y };
  if (Math.random() < p * .7) { banditLose(b, 1, null, at); if (!b.dead && !(b.fightMsg > yearT)) { b.fightMsg = yearT + DAY_LEN / 3; notify(`Gente armada de ${g ? g.name : 'la comarca'} se enfrenta a ${b.name} y mata a uno (quedan ${b.men})`, at); } else if (b.dead) notify(`Gente armada de ${g ? g.name : 'la comarca'} acaba con el último de ${b.name}`, at); if (g && b.dead) { g.food += b.loot; g.banditT = -1e9; } }
  else if (Math.random() < (1 - p) * .35) { const u = arm[Math.floor(Math.random() * arm.length)]; killVillager(u, 'bandidos'); }
}
{ const base = updateBandits; updateBandits = function(dt){
  base.apply(this, arguments);
  if (!world || !world.bandits || !world.bandits.length) return;
  for (const b of world.bandits) if (!b.dead) try { banditHazards(b, dt); } catch (e) { console.error(e); }
  if (world.bandits.some(b => b.dead)) world.bandits = world.bandits.filter(b => !b.dead);
}; }
// Un rayo que cae sobre la banda
{ const base = strikeAt; strikeAt = function(gx, gy, top){ const r = base.apply(this, arguments); for (const b of (world && world.bandits) || []) if (!b.dead && Math.hypot(b.x - gx, b.y - gy) < 12) banditLose(b, 1, 'les cae un rayo'); return r; }; }
// Modo dios: «Retirar» sobre la banda quita a un bandido (aldeanos.js, donde está godClick, se carga después)
addEventListener('DOMContentLoaded', () => { const base = godClick; godClick = function(sx, sy){
  if (params.tool === 'remove' && world && world.bandits) { const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom;
    const b = world.bandits.find(b => !b.dead && Math.abs(b.x - wx) < 7 * Math.max(1, b.men) / 2 + 6 && wy > b.y - 14 && wy < b.y + 4);
    if (b) { banditLose(b, 1, 'una mano divina se los lleva'); world.bandits = world.bandits.filter(o => !o.dead); return; } }
  return base.apply(this, arguments);
}; });
