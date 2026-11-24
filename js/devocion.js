// World Sim · El jugador como dios: los pueblos agradecen la ayuda que les llega del cielo; y la pirotecnia
// ================= Devoción y fuegos artificiales =================
// · Si un pueblo pasa hambre, sequía o una desgracia y el jugador le ayuda (le caen vacas del cielo, aparece gente,
//   llega agua, crecen árboles), lo notan: cuanto más lo necesitaban, más lo agradecen. Primero lo celebran y rezan,
//   luego le llevan ofrendas, bailan en la plaza, le levantan una estatua y, al final, lo cuentan entre sus dioses
//   (o lo hacen su dios, si no tenían). Cada cosa sale como aviso para ir a verla
// · Pirotecnia: con pólvora y papel aprenden a hacer cohetes. En Año Nuevo (de noche), al ganar una guerra, al firmar
//   la paz y en honor del dios que les ayudó, lanzan fuegos artificiales desde la plaza
const PLAYER_GODS = ['el Gran Hacedor', 'la Mano del Cielo', 'el Pastor de las Nubes', 'el Que Todo lo Ve', 'la Madre de las Lluvias', 'el Señor de los Prodigios'];
const playerGod = () => world.playerGod ||= PLAYER_GODS[Math.floor(Math.random() * PLAYER_GODS.length)];
// ¿Cuánto lo necesitaban? (0 = nada, 1 = mucho)
function needOf(g){
  const pop = popOf(g) || 1, i = g.fy * W + g.fx;
  return clamp((g.food < pop * 2 ? .5 : 0) + (droughtAt(i) > .4 ? .3 : 0) + (yearT - (g.misfortuneT ?? -1e9) < DAY_LEN ? .3 : 0) + (villagers.some(u => !u.dead && u.vid === g.id && u.sick) ? .2 : 0), 0, 1);
}
let giftT = 0;
// Una ayuda del jugador cerca de un pueblo (desde las herramientas: animales, gente, agua, árboles)
function godGift(wx, wy, what){
  if (!world || !villages.length || performance.now() - giftT < 400) return; giftT = performance.now();
  const g = villages.filter(o => popOf(o) && Math.hypot(o.fx * T - wx, o.fy * T - wy) < 40 * T).sort((a, b) => Math.hypot(a.fx * T - wx, a.fy * T - wy) - Math.hypot(b.fx * T - wx, b.fy * T - wy))[0];
  if (!g) return;
  const need = needOf(g), add = (.6 + need * 2.4) * (what === 'animal' ? 1.2 : 1);
  if (what === 'animal' && g.food < popOf(g) * 2) g.food += 6; // (comida que les cae del cielo)
  const before = g.devoTo || 0; g.devoTo = before + add;
  const at = { x:g.fx * T, y:g.fy * T }, god = playerGod(), txt = { animal:'les caen animales del cielo', persona:'aparece gente nueva de la nada', agua:'brota agua donde no la había', arbol:'crecen árboles de golpe' }[what] || 'pasa algo prodigioso';
  if (before < 1 && g.devoTo >= 1) notify(`¡Milagro en ${g.name}! ${capFirst(txt)}${need > .3 ? ' justo cuando más falta les hacía' : ''}. Lo llaman obra de ${god}`, at);
  for (const [th, f] of [[4, devoPray], [8, devoOffer], [12, devoDance], [17, devoStatue], [24, devoAdopt]]) if (before < th && g.devoTo >= th) setTimeout(() => popOf(g) && f(g, at, god), 1200);
}
function devoPray(g, at, god){
  for (const u of villagers.filter(u => !u.dead && !u.away && u.vid === g.id && ageOf(u) >= ADULT_H).slice(0, 8)) { releaseTask(u); u.task = { k:'trabajando', job:'orar', x:u.x, y:u.y }; u.actT = 6; floats.push({ x:u.x, y:u.y - 14, txt:'🙏', col:'#f8e8a0', life:0 }); }
  notify(`En ${g.name} se arrodillan y rezan a ${god}, que les ayudó cuando lo necesitaban`, at);
}
function devoOffer(g, at, god){
  const n = Math.min(Math.floor(g.food * .1), 15); g.food -= n;
  for (let k = 0; k < 8; k++) floats.push({ x:g.fx * T + (Math.random() - .5) * 30, y:g.fy * T - 10, txt:['🍞', '🍎', '🌾', '🕯'][k % 4], col:'#f0d080', life:0 });
  notify(`Los de ${g.name} dejan ofrendas para ${god} en la plaza: ${n > 0 ? `${n} de comida, ` : ''}flores y velas`, at);
}
function devoDance(g, at, god){
  const ps = villagers.filter(u => !u.dead && !u.away && u.vid === g.id).slice(0, 14), cx = (g.plaza ? (g.plaza.x0 + g.plaza.x1) / 2 : g.fx) * T, cy = (g.plaza ? (g.plaza.y0 + g.plaza.y1) / 2 : g.fy) * T;
  ps.forEach((u, k) => { releaseTask(u); const a = k / ps.length * Math.PI * 2; u.task = { k:'trabajando', job:'ritual', x:cx + Math.cos(a) * 12, y:cy + Math.sin(a) * 7 }; u.actT = 10; });
  notify(`¡Fiesta en ${g.name}! Bailan en corro en la plaza en honor de ${god}`, at);
  fireworksShow(g, 12, `en honor de ${god}`);
}
function devoStatue(g, at, god){
  if (!g.plaza || g.stone < 8) { notify(`En ${g.name} quieren levantar una estatua a ${god}, pero aún les falta piedra o una plaza`, at); return; }
  const p = statueSpot(g); if (!p) return;
  const i = p[1] * W + p[0]; world.objs[i] = { key:'obelisk:monumento', v:0, ox:0, oy:0, vid:g.id, hero:god }; g.stone -= 8; composeRegion(p[0] - 8, p[1] - 12, p[0] + 8, p[1] + 12);
  notify(`En ${g.name} levantan una estatua a ${god}`, { x:p[0] * T, y:p[1] * T });
}
function devoAdopt(g, at, god){
  if (!g.faith) { g.faith = { god:capFirst(god.replace(/^(el|la) /, '')), fem:/^la /.test(god), dom:'el cielo', name:`Fieles de ${capFirst(god.replace(/^(el|la) /, ''))}`, mono:true, player:true }; riteOf(g); notify(`¡${g.name} hace de ${god} su dios! Nace una fe nueva: los «${g.faith.name}»`, at); return; }
  if (g.faith.player || (g.faith.pantheon || []).some(d => d.player)) return;
  (g.faith.pantheon ||= []).push({ god:capFirst(god), player:true });
  notify(`Los de ${g.name} cuentan ya a ${god} entre sus dioses, junto a ${g.faith.god}`, at);
}
// ---- Pirotecnia ----
const canFireworks = g => !!(g && (g.know || {}).pirotecnia);
let fireworks = [], fwQueue = [], fwClock = 0;
function fireworksShow(g, secs, why){
  if (!canFireworks(g) || !popOf(g)) return;
  fwQueue.push({ g:g.id, until:yearT + secs, why, started:false });
}
function updateFireworks(dt){
  if (!world) return;
  if ((fwClock -= dt) <= 0) { fwClock = 5;
    for (const g of villages) { // aprenden: pólvora y papel
      if (!popOf(g) || canFireworks(g) || !knowsSci(g, 'polvora') || !hasPaper(g) || Math.random() > .05) continue;
      (g.know ||= {}).pirotecnia = true; notify(`En ${g.name} mezclan pólvora y papel y aprenden a hacer cohetes: ¡la pirotecnia! Harán fuegos artificiales en las fiestas`, { x:g.fx * T, y:g.fy * T });
    }
    const y = seasonInfo().year; if (world.fwYear == null) world.fwYear = y;
    if (y !== world.fwYear) { world.fwYear = y; for (const g of villages) if (canFireworks(g)) fireworksShow(g, 25, 'por el Año Nuevo'); } // Año Nuevo
  }
  for (const q of fwQueue) {
    const g = villageById(q.g); if (!g || !popOf(g) || yearT > q.until) { q.done = true; continue; }
    if (!q.started) { if (!isNight() && q.why === 'por el Año Nuevo') { q.until += dt; continue; } q.started = true; notify(`¡Fuegos artificiales en ${g.name} ${q.why}!`, { x:g.fx * T, y:g.fy * T }); } // los de Año Nuevo esperan a la noche
    if (Math.random() < dt * 2.2) {
      const cx = (g.plaza ? (g.plaza.x0 + g.plaza.x1) / 2 : g.fx) * T, cy = (g.plaza ? (g.plaza.y0 + g.plaza.y1) / 2 : g.fy) * T;
      const [r, gg, b] = villageColor(g), cols = [`rgb(${r},${gg},${b})`, '#ffe060', '#ff6040', '#60d0ff', '#ff80e0', '#ffffff'];
      fireworks.push({ x:cx + (Math.random() - .5) * 16, y:cy, vx:(Math.random() - .5) * 10, vy:-55 - Math.random() * 25, fuse:.8 + Math.random() * .5, t:0, col:cols[Math.floor(Math.random() * cols.length)], rocket:true });
      snd('arrow', cx, cy);
    }
  }
  if (fwQueue.length) fwQueue = fwQueue.filter(q => !q.done);
  for (const f of fireworks) {
    f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.rocket) { f.vy += 20 * dt; if (f.t >= f.fuse) { f.dead = true; snd('boom', f.x, f.y, .15); const n = 18 + Math.floor(Math.random() * 10); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, s = 18 + Math.random() * 10; fireworks.push({ x:f.x, y:f.y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, t:0, life:1 + Math.random() * .5, col:f.col }); } } }
    else { f.vy += 14 * dt; f.vx *= 1 - dt; if (f.t > f.life) f.dead = true; }
  }
  if (fireworks.length) fireworks = fireworks.filter(f => !f.dead);
}
function drawFireworks(){
  if (!fireworks.length) return;
  const [x0, y0, x1, y1] = visibleRect();
  vctx.save(); vctx.globalCompositeOperation = 'lighter';
  for (const f of fireworks) {
    if (f.x < x0 - 20 || f.x > x1 + 20 || f.y < y0 - 40 || f.y > y1 + 20) continue;
    if (f.rocket) { vctx.fillStyle = '#ffd890'; vctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 2); vctx.fillStyle = 'rgba(255,200,120,.4)'; vctx.fillRect(Math.round(f.x), Math.round(f.y) + 2, 1, 3); continue; }
    const a = Math.max(0, 1 - f.t / f.life); vctx.globalAlpha = a; vctx.fillStyle = f.col; vctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    vctx.globalAlpha = a * .35; vctx.fillRect(Math.round(f.x - f.vx * .04), Math.round(f.y - f.vy * .04), 1, 1);
  }
  vctx.restore();
}
SYSTEMS.push(dt => updateFireworks(dt));
// Celebraciones con cohetes: ganar una guerra y firmar la paz
{ const base = conquer; conquer = function(cap, eg, r){ base.apply(this, arguments); fireworksShow(cap, 15, `por la conquista de ${eg.name}`); }; }
{ const base = makePeace; makePeace = function(a, b){ base.apply(this, arguments); fireworksShow(a, 10, 'por la paz'); fireworksShow(b, 10, 'por la paz'); }; }
// ---- Estatuas con orden: en las esquinas de la plaza, separadas entre sí y no demasiadas ----
function statueSpot(g){
  const r0 = g.plaza; if (!r0) return null;
  const all = []; for (let y = r0.y0 - 12; y <= r0.y1 + 12; y++) for (let x = r0.x0 - 14; x <= r0.x1 + 14; x++) { const i = y * W + x; if (i >= 0 && i < N && world.objs[i] && world.objs[i].key === 'obelisk:monumento') all.push(i); }
  if (all.length >= 4) return null; // ya hay bastantes
  const corners = [[r0.x0 - 1, r0.y0 - 1], [r0.x1 + 1, r0.y0 - 1], [r0.x0 - 1, r0.y1 + 2], [r0.x1 + 1, r0.y1 + 2]];
  for (const [cx, cy] of corners.sort(() => Math.random() - .5)) {
    const p = ringFind(cx, cy, 3, (x, y) => tileFree(x, y) && !pathMap.has(y * W + x) && !plazaSet.has(y * W + x) && !farmMap.has(y * W + x) && !underBuilding(g, x, y) && all.every(j => Math.hypot((j % W) - x, ((j / W) | 0) - y) >= 7));
    if (p) return p;
  }
  return null;
}
// ¿Hay ya una estatua a menos de r casillas?
function statueNear(x, y, r){
  for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const o = world.objs[yy * W + xx]; if (o && o.key === 'obelisk:monumento' && Math.hypot(xx - x, yy - y) <= r) return true; }
  return false;
}
// Partidas de antes: estatuas amontonadas unas encima de otras. Se deja la primera de cada montón
function tidyStatues(){
  if (!world || world.statuesTidy) return; world.statuesTidy = true;
  const st = []; for (let i = 0; i < N; i++) { const o = world.objs[i]; if (o && o.key === 'obelisk:monumento') st.push(i); }
  const keep = [];
  for (const i of st) {
    const x = i % W, y = (i / W) | 0;
    if (keep.some(j => Math.hypot((j % W) - x, ((j / W) | 0) - y) < 5)) { world.objs[i] = null; composeRegion(x - 8, y - 12, x + 8, y + 12); for (const g of villages) if (g.monument === i) g.monument = null; }
    else keep.push(i);
  }
}
SYSTEMS.push(() => tidyStatues());
