// World Sim · Vida en el mapa: estaciones, la noche y el campo
// ================= Ambiente =================
// · Otoño: almiares dorados en los campos. Invierno: muñecos de nieve junto a las casas y niños patinando en los lagos
//   helados cerca del pueblo. Primavera (y verano): flores entre la hierba y mariposas revoloteando
// · Noche: farolillos en las calles, luciérnagas en las noches templadas, estrellas fugaces y, sobre las casas donde
//   duermen, bocadillos con lo que sueñan
// · Campo: quien ara lleva un buey delante; con ovejas en el cercado, alguien las esquila (lana para la tela)
let ambT = 0, amb = new Map(); // por pueblo: dónde van los adornos (se recalcula cada pocos segundos)
const isFrozen = i => world.ice && world.ice[i] > .5;
function ambOf(g, now){
  let A = amb.get(g.id);
  if (A && now - A.t < 6000) return A;
  A = { t:now, hay:[], snow:[], ice:[], flowers:[], lamps:[] };
  const R = 16;
  for (let y = Math.max(1, g.fy - R); y <= Math.min(H - 2, g.fy + R); y++) for (let x = Math.max(1, g.fx - R); x <= Math.min(W - 2, g.fx + R); x++) {
    const i = y * W + x, h = h2(x, y, 61);
    const f = farmMap.get(i); if (f && h < .08 && (f.st === 'madura' || f.st === 'arada')) A.hay.push([x * T + 2, y * T + 3]);
    if (pathMap.has(i) && !plazaSet.has(i) && h > .955) A.lamps.push([x * T + 2, y * T + 2]);
    if (!world.objs[i] && !pathMap.has(i) && !farmMap.has(i) && !WATER[world.biome[i]]) {
      if (snowA && snowA[i] > .3 && h < .012 && A.snow.length < 4) A.snow.push([x * T + 2, y * T + 3]);
      if ([B.GRASS, B.PLAINS, B.FOREST].includes(world.biome[i]) && h < .07) A.flowers.push([x * T + (h * 97 % 4), y * T + (h * 61 % 4), Math.floor(h * 1000) % 4]);
    }
    if (isFrozen(i) && h < .5 && A.ice.length < 40) A.ice.push([x * T + 2, y * T + 2]);
  }
  amb.set(g.id, A); return A;
}
// Lo que va en el suelo (se dibuja antes que la gente)
function drawSeasonLife(now){
  const si = seasonInfo().i, [vx0, vy0, vx1, vy1] = visibleRect(), ts = now / 1000;
  if (zoom < 1.4) return; // de lejos no se aprecia
  for (const g of villages) {
    if (!popOf(g) || g.fx * T < vx0 - 100 || g.fx * T > vx1 + 100 || g.fy * T < vy0 - 100 || g.fy * T > vy1 + 100) continue;
    const A = ambOf(g, now);
    if (si === 2) for (const [x, y] of A.hay) { // almiar: montón dorado con un palo
      vctx.fillStyle = '#a88838'; vctx.fillRect(x - 3, y - 2, 7, 2); vctx.fillStyle = '#d8b45a'; vctx.fillRect(x - 2, y - 4, 5, 2); vctx.fillRect(x - 1, y - 5, 3, 1); vctx.fillStyle = '#f0d070'; vctx.fillRect(x - 1, y - 4, 1, 1); vctx.fillStyle = '#6e4626'; vctx.fillRect(x, y - 7, 1, 2);
    }
    if (si === 3) {
      for (const [x, y] of A.snow) { // muñeco de nieve: dos bolas, ojos, nariz de zanahoria y bufanda roja
        vctx.fillStyle = 'rgba(0,0,0,.2)'; vctx.fillRect(x - 3, y, 7, 1);
        vctx.fillStyle = '#f4f6fa'; vctx.fillRect(x - 3, y - 4, 7, 4); vctx.fillRect(x - 2, y - 5, 5, 1); vctx.fillRect(x - 2, y - 8, 5, 3); vctx.fillRect(x - 1, y - 9, 3, 1);
        vctx.fillStyle = '#c8d0dc'; vctx.fillRect(x + 2, y - 3, 1, 3); vctx.fillStyle = '#c83a2a'; vctx.fillRect(x - 2, y - 5, 5, 1);
        vctx.fillStyle = '#22201e'; vctx.fillRect(x - 1, y - 7, 1, 1); vctx.fillRect(x + 1, y - 7, 1, 1); vctx.fillStyle = '#e8803a'; vctx.fillRect(x + 2, y - 6, 2, 1);
      }
      if (A.ice.length > 6) for (let k = 0; k < Math.min(3, Math.floor(popOf(g) / 10) + 1); k++) { // niños patinando: dan vueltas sobre el hielo
        const c = A.ice[(k * 7) % A.ice.length], a = ts * (.8 + k * .2) + k * 2, x = c[0] + Math.cos(a) * 7, y = c[1] + Math.sin(a) * 3;
        vctx.fillStyle = 'rgba(255,255,255,.5)'; vctx.fillRect(Math.round(x - Math.cos(a) * 3), Math.round(y - Math.sin(a) * 2) + 1, 2, 1); // la estela
        vctx.fillStyle = ['#c83a2a', '#3a6ab8', '#e8b030'][k % 3]; vctx.fillRect(Math.round(x) - 1, Math.round(y) - 5, 3, 3); // abrigo
        vctx.fillStyle = '#e8c8a0'; vctx.fillRect(Math.round(x), Math.round(y) - 7, 1, 2); vctx.fillStyle = '#22201e'; vctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 1, 2); vctx.fillRect(Math.round(x) + 1, Math.round(y) - 2, 1, 2);
      }
    }
    if (si === 0 || si === 1) {
      const cols = ['#f0e070', '#f8a0c0', '#ffffff', '#b8a0f0'];
      for (const [x, y, c] of A.flowers) { vctx.fillStyle = cols[c]; vctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      if (!isNight()) for (let k = 0; k < Math.min(8, A.flowers.length); k++) { // mariposas
        const f = A.flowers[(k * 13) % A.flowers.length], a = ts * 1.3 + k * 1.7, x = f[0] + Math.sin(a) * 6 + Math.sin(a * 2.3) * 2, y = f[1] - 4 + Math.cos(a * 1.4) * 3, open = Math.sin(ts * 14 + k) > 0;
        vctx.fillStyle = ['#f0a030', '#f8f0f8', '#70b0f0'][k % 3]; vctx.fillRect(Math.round(x) - (open ? 1 : 0), Math.round(y), open ? 3 : 1, 1);
      }
    }
  }
}
// La noche (desde drawNight, con la mezcla de luz): farolillos y luciérnagas
function nightLights(glow, k){
  const [vx0, vy0, vx1, vy1] = visibleRect(), ts = performance.now() / 1000, warm = seasonInfo().i === 1 || seasonInfo().i === 0;
  for (const g of villages) {
    if (!popOf(g) || g.fx * T < vx0 - 100 || g.fx * T > vx1 + 100 || g.fy * T < vy0 - 100 || g.fy * T > vy1 + 100) continue;
    const A = ambOf(g, performance.now());
    for (const [x, y] of A.lamps) { glow(x, y - 5, 14, .5 * k, '255,190,90'); vctx.fillStyle = 'rgba(255,220,140,.9)'; vctx.fillRect(x, y - 6, 1, 2); }
    if (warm) for (let n = 0; n < 10; n++) { // luciérnagas
      const s = Math.sin(ts * 2 + n * 3.1); if (s < .4) continue;
      const x = g.fx * T + Math.sin(n * 7.3 + ts * .3) * 60, y = g.fy * T + Math.cos(n * 5.1 + ts * .25) * 40;
      glow(x, y, 4, (s - .4) * .9 * k, '200,255,120');
    }
  }
}
// Farolas (el poste, sin luz), estrellas fugaces y sueños: después de la noche
let shooting = null;
function drawNightLife(now){
  const k = darkness(); if (k < .2) return;
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const g of villages) {
    if (!popOf(g) || g.fx * T < vx0 - 100 || g.fx * T > vx1 + 100 || g.fy * T < vy0 - 100 || g.fy * T > vy1 + 100) continue;
    const A = ambOf(g, now);
    for (const [x, y] of A.lamps) { vctx.fillStyle = '#2a2018'; vctx.fillRect(x, y - 5, 1, 6); vctx.fillStyle = '#ffd890'; vctx.fillRect(x - 1, y - 7, 3, 2); }
    // Sueños: sobre alguna casa donde duermen, un bocadillo con lo que sueñan
    if (zoom >= 2.5) for (const h of g.houses.slice(0, 12)) {
      const s = Math.sin(now / 1800 + h); if (s < .7 || !villagers.some(v => v.sleep && v.home === h)) continue;
      const x = (h % W) * T + 8, y = ((h / W) | 0) * T - 26, a = (s - .7) / .3;
      vctx.globalAlpha = a; vctx.fillStyle = '#f4f0e8'; vctx.fillRect(x - 5, y - 4, 11, 8); vctx.fillRect(x - 4, y - 5, 9, 10); vctx.fillRect(x - 2, y + 6, 2, 2); vctx.fillRect(x - 4, y + 9, 1, 1);
      const dream = ['🐟', '❤', '⭐', '🍞', '🐑', '💰'][h % 6]; vctx.font = '7px sans-serif'; vctx.textAlign = 'center'; vctx.fillStyle = '#22201e'; vctx.fillText(dream, x + .5, y + 3); vctx.textAlign = 'start'; vctx.globalAlpha = 1;
    }
  }
  // Estrella fugaz de vez en cuando
  if (!shooting && Math.random() < .004) shooting = { x:vx0 + Math.random() * (vx1 - vx0), y:vy0 + Math.random() * (vy1 - vy0) * .4, t:0, vx:(Math.random() < .5 ? -1 : 1) * (80 + Math.random() * 60) / zoom, vy:(30 + Math.random() * 30) / zoom };
  if (shooting) {
    const S = shooting; S.t += 1 / 60; const x = S.x + S.vx * S.t, y = S.y + S.vy * S.t, a = Math.max(0, 1 - S.t / .9);
    vctx.strokeStyle = `rgba(255,255,240,${a * k})`; vctx.lineWidth = Math.max(.6, 1.2 / zoom); vctx.beginPath(); vctx.moveTo(x, y); vctx.lineTo(x - S.vx * .12, y - S.vy * .12); vctx.stroke();
    if (S.t > .9) shooting = null;
  }
}
// ---- Campo: buey arando, capa de los héroes (desde drawVillagers, antes de pintar a la persona) ----
const OX = { sp:'vaca', born:-1e9, v:3, ad:0, dir:1 };
function drawPersonExtras(v, x, y, s, now){
  if (v.task && v.task.k === 'trabajando' && v.task.job === 'arar') {
    OX.dir = v.dir; const fr = Math.floor(now / 300) % 2, o = animalSprite(OX, fr), ox = x + v.dir * 9 - (o.width >> 1);
    vctx.drawImage(o, ox, y - o.height + 1); vctx.fillStyle = '#6e4626'; vctx.fillRect(Math.min(x, x + v.dir * 5), y - 3, 5, 1); // el yugo
  }
  if (v.hero) { // capa roja del héroe, detrás
    const top = y - s.height + 4, back = v.dir < 0 ? x + 1 : x - 4, wave = Math.round(Math.sin(now / 200) * .8), ch = s.height - 3;
    vctx.fillStyle = '#5a1410'; vctx.fillRect(back - 1, top, 6, ch + wave); vctx.fillStyle = '#b02a20'; vctx.fillRect(back, top, 4, ch - 1 + wave); vctx.fillStyle = '#e04a3a'; vctx.fillRect(back + (v.dir < 0 ? 2 : 0), top, 2, ch - 3);
    const sy = y - s.height - 4 - Math.round(Math.abs(Math.sin(now / 400)) * 1); vctx.fillStyle = '#f8d850'; vctx.fillRect(x, sy - 1, 1, 3); vctx.fillRect(x - 1, sy, 3, 1); // estrellita de fama
  }
}
// Esquilar: con ovejas en el cercado y poca tela, alguien les quita la lana (desde chooseJob)
function shearJobs(v, g, add){
  if ((g.cloth || 0) >= 6 || busyWith(g, 'esquilar') || yearT - (g.shearT ?? -1e9) < DAY_LEN * .5) return;
  const sheep = penAnimals(g).filter(a => a.sp === 'oveja'); if (sheep.length < 2) return;
  add('esquilar', 4);
}
function shearTarget(v, g){ const P = pensOf(g)[0]; return P ? { k:'esquilar', x:(P.x0 + 2) * T + 2, y:(P.y1 + 1) * T + 3 } : null; }
function shearArrive(v, g, t){
  v.actT = 5; v.onDone = () => {
    const n = Math.max(1, Math.floor(penAnimals(g).filter(a => a.sp === 'oveja').length / 2)); g.cloth = (g.cloth || 0) + n; g.shearT = yearT;
    floats.push({ x:v.x, y:v.y - 12, txt:`+${n} lana`, col:'#f4f0e8', life:0 });
    for (let k = 0; k < 6; k++) chips.push({ x:v.x, y:v.y - 6, vx:(Math.random() - .5) * 16, vy:-6 - Math.random() * 8, life:0, max:.6, col:'#f4f0e8' }); // vellones
  };
  return true;
}
