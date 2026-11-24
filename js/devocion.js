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
// Cada cohete sube dejando estela de chispas y estalla en una carcasa de un tipo: peonía (bola de color), sauce (cae
// en hilos dorados que dejan rastro), anillo, palmera (pocas ramas gruesas que se curvan), crisantemo de dos colores,
// carcasa que se divide en cohetillos que vuelven a estallar, crepitante (chispazos blancos) o corazón. Cada estallido
// da un destello que ilumina el suelo y deja humo; al final del espectáculo, una traca con muchos a la vez
const canFireworks = g => !!(g && (g.know || {}).pirotecnia);
let fireworks = [], fwQueue = [], fwFlash = [], fwClock = 0;
const FW_KINDS = ['peonia', 'peonia', 'sauce', 'anillo', 'palmera', 'crisantemo', 'divide', 'crepitante', 'corazon'];
const FW_COLS = ['#ff4040', '#ffd040', '#40c0ff', '#ff60e0', '#60ff80', '#ffffff', '#ff9a30', '#b080ff'];
function fireworksShow(g, secs, why){
  if (!canFireworks(g) || !popOf(g)) return;
  fwQueue.push({ g:g.id, until:yearT + secs, why, started:false, secs });
}
function fwLaunch(g, cx, cy, big){
  const [r, gg, b] = villageColor(g), cols = [`rgb(${Math.min(255, r + 60)},${Math.min(255, gg + 60)},${Math.min(255, b + 60)})`, ...FW_COLS];
  const kind = FW_KINDS[Math.floor(Math.random() * FW_KINDS.length)];
  fireworks.push({ x:cx + (Math.random() - .5) * 30, y:cy, vx:(Math.random() - .5) * 14, vy:-(95 + Math.random() * 50) * (big ? 1.2 : 1), fuse:1 + Math.random() * .7, t:0, rocket:true, kind,
    col:cols[Math.floor(Math.random() * cols.length)], col2:cols[Math.floor(Math.random() * cols.length)], size:(big ? 1.4 : 1) * (.8 + Math.random() * .5) });
  snd('arrow', cx, cy);
}
// El estallido de una carcasa
function fwBurst(f){
  const S = f.size, add = (vx, vy, o = {}) => fireworks.push({ x:f.x, y:f.y, vx, vy, t:0, life:1.3 + Math.random() * .6, col:f.col, drag:1.2, grav:16, ...o });
  fwFlash.push({ x:f.x, y:f.y, t:0, col:f.col, r:32 * S }); snd('boom', f.x, f.y, .18 + S * .08);
  for (let k = 0; k < 6; k++) smoke.push({ x:f.x + (Math.random() - .5) * 14 * S, y:f.y + (Math.random() - .5) * 10 * S, vx:(Math.random() - .5) * 2, vy:-1, r:2 + Math.random() * 2, life:0, max:2.5 + Math.random() * 2 });
  const sp = 50 * S;
  switch (f.kind) {
    case 'sauce': for (let k = 0; k < 46; k++) { const a = Math.random() * Math.PI * 2, s = sp * (.4 + Math.random() * .6); add(Math.cos(a) * s, Math.sin(a) * s * .8 - 6, { col:'#ffcf60', life:2.6 + Math.random(), drag:2.2, grav:9, trail:true }); } break;
    case 'anillo': { const tilt = Math.random() * Math.PI; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, s = sp; add(Math.cos(a) * s * Math.cos(tilt) - Math.sin(a) * s * .35 * Math.sin(tilt), Math.sin(a) * s * .35 * Math.cos(tilt) + Math.cos(a) * s * Math.sin(tilt) * .6); } add(0, 0, { col:'#ffffff', life:.4 }); break; }
    case 'palmera': for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + Math.random() * .3, s = sp * 1.1; add(Math.cos(a) * s, Math.sin(a) * s - 10, { col:'#ffb040', life:2, drag:1.4, grav:22, trail:true, thick:true }); } break;
    case 'crisantemo': for (let k = 0; k < 56; k++) { const a = Math.random() * Math.PI * 2, s = sp * (.85 + Math.random() * .3); add(Math.cos(a) * s, Math.sin(a) * s, { col:k % 2 ? f.col : f.col2, trail:true }); } break;
    case 'divide': for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, s = sp * .7; fireworks.push({ x:f.x, y:f.y, vx:Math.cos(a) * s, vy:Math.sin(a) * s - 8, t:0, rocket:true, fuse:.45 + Math.random() * .2, kind:'peonia', col:f.col2, col2:f.col, size:S * .5, mini:true }); } break;
    case 'crepitante': for (let k = 0; k < 38; k++) { const a = Math.random() * Math.PI * 2, s = sp * (.5 + Math.random() * .5); add(Math.cos(a) * s, Math.sin(a) * s, { col:'#fff6d0', life:1 + Math.random() * .8, crackle:true }); } break;
    case 'corazon': for (let k = 0; k < 44; k++) { const a = k / 44 * Math.PI * 2, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); add(hx * S * 1.9, hy * S * 1.9, { col:'#ff5a8a', drag:2.2, grav:5 }); } break;
    default: for (let k = 0; k < 50; k++) { const a = Math.random() * Math.PI * 2, s = sp * Math.sqrt(Math.random()); add(Math.cos(a) * s, Math.sin(a) * s); } // peonía
  }
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
    const cx = (g.plaza ? (g.plaza.x0 + g.plaza.x1) / 2 : g.fx) * T, cy = (g.plaza ? (g.plaza.y0 + g.plaza.y1) / 2 : g.fy) * T;
    const finale = q.until - yearT < 3; // la traca final
    if (Math.random() < dt * (finale ? 12 : 3.5)) { fwLaunch(g, cx, cy, finale || Math.random() < .25); if (Math.random() < .3) fwLaunch(g, cx, cy, false); } // a veces, dos a la vez
  }
  if (fwQueue.length) fwQueue = fwQueue.filter(q => !q.done);
  for (const f of fireworks) {
    f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.rocket) {
      f.vy += 22 * dt;
      if (Math.random() < .8) fireworks.push({ x:f.x + (Math.random() - .5), y:f.y + 2, vx:(Math.random() - .5) * 4, vy:6 + Math.random() * 6, t:0, life:.35 + Math.random() * .25, col:'#ffc880', grav:30, drag:0 }); // la estela del cohete
      if (f.t >= f.fuse) { f.dead = true; fwBurst(f); }
      continue;
    }
    f.vx *= 1 - (f.drag ?? 1) * dt; f.vy *= 1 - (f.drag ?? 1) * dt; f.vy += (f.grav ?? 14) * dt;
    if (f.trail && Math.random() < .5) fireworks.push({ x:f.x, y:f.y, vx:0, vy:3, t:0, life:.5 + Math.random() * .4, col:f.col === '#ffcf60' ? '#c88a30' : f.col, grav:6, drag:3, ember:true }); // rastro
    if (f.crackle && f.t > f.life * .6 && !f.popped && Math.random() < dt * 4) { f.popped = true; fwFlash.push({ x:f.x, y:f.y, t:0, col:'#ffffff', r:5 }); } // chispazo
    if (f.t > f.life) f.dead = true;
  }
  for (const l of fwFlash) l.t += dt;
  if (fireworks.length) fireworks = fireworks.filter(f => !f.dead);
  if (fwFlash.length) fwFlash = fwFlash.filter(l => l.t < .5);
}
function drawFireworks(){
  if (!fireworks.length && !fwFlash.length) return;
  const [x0, y0, x1, y1] = visibleRect();
  vctx.save(); vctx.globalCompositeOperation = 'lighter';
  for (const l of fwFlash) { // el destello: un halo que se abre y se apaga, y su reflejo en el suelo
    const k = 1 - l.t / .5, g = vctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * (1 + l.t * 2));
    g.addColorStop(0, l.col); g.addColorStop(1, 'rgba(0,0,0,0)'); vctx.globalAlpha = .45 * k; vctx.fillStyle = g; vctx.beginPath(); vctx.arc(l.x, l.y, l.r * (1 + l.t * 2), 0, Math.PI * 2); vctx.fill();
    vctx.globalAlpha = .12 * k; vctx.fillStyle = l.col; vctx.beginPath(); vctx.ellipse(l.x, l.y + 40, l.r * 2.2, l.r * .7, 0, 0, Math.PI * 2); vctx.fill();
  }
  for (const f of fireworks) {
    if (f.x < x0 - 30 || f.x > x1 + 30 || f.y < y0 - 60 || f.y > y1 + 30) continue;
    const x = Math.round(f.x), y = Math.round(f.y);
    if (f.rocket) { vctx.globalAlpha = 1; vctx.fillStyle = '#fff0c0'; vctx.fillRect(x, y, f.mini ? 1 : 2, f.mini ? 1 : 2); continue; }
    const a = Math.max(0, 1 - f.t / f.life), tw = f.crackle ? (Math.random() < .5 ? 1 : .2) : 1;
    vctx.globalAlpha = a * tw * (f.ember ? .6 : 1); vctx.fillStyle = f.col; vctx.fillRect(x, y, f.thick ? 2 : 1, f.thick ? 2 : 1);
    if (!f.ember) { vctx.globalAlpha = a * .25; vctx.fillRect(x - 1, y - 1, 3, 3); } // el brillo alrededor de cada chispa
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
