// World Sim · Fama: héroes de guerra, castillos y la feria ambulante
// ================= Fama =================
// · Héroes: quien abate a varios enemigos se hace famoso: le llaman «el Valiente» (o parecido), lleva capa roja, le
//   levantan una estatua y en la taberna los bardos cantan su balada
// · Castillos: la nación que gana muchas batallas (o conquista pueblos) convierte su ayuntamiento en castillo, con
//   torres, almenas y estandartes; allí sus defensores aguantan más
// · Feria ambulante: puestos de colores, malabaristas y música que van de pueblo en pueblo; la gente va a divertirse y
//   a comprar, y el pueblo hace caja y se alegra
const EPITHETS = { h:['el Valiente', 'el Bravo', 'el León', 'el Invicto', 'el Fuerte', 'Mano de Hierro'], m:['la Valiente', 'la Brava', 'la Leona', 'la Invicta', 'la Fuerte', 'Mano de Hierro'] };
// (desde la pelea, cuando alguien abate a un enemigo)
function heroKill(v, g){
  v.kills = (v.kills || 0) + 1;
  if (v.hero || v.kills < 3 || !g) return;
  const E = EPITHETS[v.sex === 'm' ? 'm' : 'h']; v.hero = true; v.title = E[Math.floor(Math.random() * E.length)];
  notify(`${v.name} se hace famoso en ${nationOf(g).name}: ya le llaman «${v.title}» tras abatir a ${v.kills} enemigos`, { x:v.x, y:v.y });
  floats.push({ x:v.x, y:v.y - 16, txt:'¡HÉROE!', col:'#f8d850', life:0 });
  addHero(g, v, `luchó como nadie en la guerra («${v.title}»)`);
}
const heroName = v => v.hero && v.title ? `${v.name} ${v.title}` : v.name;
// Castillo: más resistentes cerca del centro
function castleShield(e){ const g = villageById(e.vid); return g && g.castle && Math.hypot(e.x / T - g.fx, e.y / T - g.fy) < 16 ? .7 : 1; }
// Cada poco, en cada pueblo: castillo, bardos y feria
function fameTick(g, dt, people){
  if ((g.fameT = (g.fameT ?? Math.random() * 20) - dt) > 0) return; g.fameT = 20;
  const n = nationOf(g), at = { x:g.fx * T, y:g.fy * T };
  if (n === g && !g.castle && g.hall != null && world.objs[g.hall] && (g.stone || 0) >= 40 && ((n.battleWins || 0) >= 2 || (n.conquests || 0) >= 2 || (milOf(g).kills || 0) >= 15)) {
    g.stone -= 40; g.castle = { since:Math.floor(yearT / DAY_LEN) + 1 };
    notify(`¡${g.name} convierte su ayuntamiento en castillo! Torres, almenas y estandartes para la nación que ${(n.battleWins || 0) >= 2 ? 'gana sus batallas' : 'conquista a sus vecinos'}`, at);
  }
  // Bardos: en la taberna cantan la balada de algún héroe del país
  if (hasTavern(g) && Math.random() < .25) {
    const h = villagers.find(u => !u.dead && u.hero && villageById(u.vid) && nationOf(villageById(u.vid)) === n) || (g.heroes || [])[0];
    if (h) { const sb = standBy(g.tavern); if (sb) { floats.push({ x:sb[0], y:sb[1] - 22, txt:`♪ la balada de ${h.title ? heroName(h) : h.name} ♪`, col:'#e8d0f8', life:0 }); snd('cheer', sb[0], sb[1], .3); } }
  }
}
// ---- Feria ambulante ----
function fairTick(){
  const F = world.fair;
  if (F && yearT < F.until) { const g = villageById(F.at); if (g && popOf(g)) return; }
  if (F && yearT < (F.next ?? 0)) return;
  const cands = villages.filter(g => popOf(g) >= 15 && g.plaza && (!F || g.id !== F.at) && ![...rels.values()].some(r => r.war && (r.war.att === nationOf(g).id || r.war.def === nationOf(g).id)));
  if (!cands.length) { world.fair = F ? { ...F, at:-1, next:yearT + DAY_LEN } : null; return; }
  const prev = F && villageById(F.at), g = prev ? cands.sort((a, b) => Math.hypot(a.fx - prev.fx, a.fy - prev.fy) - Math.hypot(b.fx - prev.fx, b.fy - prev.fy))[Math.floor(Math.random() * Math.min(3, cands.length))] : cands[Math.floor(Math.random() * cands.length)];
  const P = g.plaza, cx = (P.x0 + P.x1) / 2 * T + 2, cy = (P.y0 + P.y1) / 2 * T + 3, stalls = [];
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + .3; stalls.push([Math.round(cx + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 11), k]); }
  world.fair = { at:g.id, since:yearT, until:yearT + DAY_LEN * 1.5, next:yearT + DAY_LEN * 2.5, x:cx, y:cy, stalls, name:F && F.name || `la Feria de ${['las Maravillas', 'los Caminos', 'las Estrellas', 'los Mil Colores', 'la Alegría'][Math.floor(Math.random() * 5)]}` };
  notify(`Llega ${world.fair.name} a ${g.name}: puestos, malabaristas y música en la plaza`, { x:cx, y:cy }); snd('horn', cx, cy, .5);
}
const fairAt = g => world.fair && world.fair.at === g.id && yearT < world.fair.until ? world.fair : null;
// Ocio (desde la lista de ocio): ir a la feria
function fairLeisure(v, g, J){ if (fairAt(g)) J.push(['feria', 8]); }
function fairTarget(v, g){ const F = fairAt(g); if (!F) return null; const s = F.stalls[Math.floor(Math.random() * F.stalls.length)]; return { k:'feria', x:s[0] + (Math.random() - .5) * 8, y:s[1] + 5 + Math.random() * 3 }; }
function fairArrive(v, g, t){
  v.actT = 6 + Math.random() * 4; v.dir = Math.random() < .5 ? -1 : 1; v.onDone = () => {
    v.fun = yearT; const ec = ecOf(g);
    if (ec && (v.money || 0) >= 2) { v.money -= 2; ec.treas += 1; g.trades = (g.trades || 0) + .2; } // compra algo: el pueblo hace caja
    if (Math.random() < .3) floats.push({ x:v.x, y:v.y - 12, txt:['¡Qué bonito!', '¡Me lo llevo!', '♪', '¡Bravo!'][Math.floor(Math.random() * 4)], col:'#f8d8a0', life:0 });
  };
  return true;
}
// (desde socialMood)
function fairMood(v, g, add){ if (fairAt(g)) add(5, `hay feria en ${g.name}`); }
// ---- Dibujo: puestos y malabarista; castillos ----
function drawFairs(now){
  const F = world.fair; if (!F || yearT > F.until || !villageById(F.at)) return;
  const [vx0, vy0, vx1, vy1] = visibleRect(); if (F.x < vx0 - 60 || F.x > vx1 + 60 || F.y < vy0 - 60 || F.y > vy1 + 60) return;
  const C = [['#c83a2a', '#f4f0e8'], ['#3a6ab8', '#f4f0e8'], ['#e8b030', '#c83a2a'], ['#5aa84a', '#f4f0e8'], ['#9a50b8', '#f8d850']];
  for (const [x, y, k] of F.stalls) { // puesto: toldo a rayas, mostrador con mercancía
    if (artAt('fair:puesto', x, y + 1, k % 2 === 1)) continue; // (el dibujo del atlas, si está)
    const [c1, c2] = C[k % C.length];
    vctx.fillStyle = 'rgba(0,0,0,.25)'; vctx.fillRect(x - 5, y + 1, 11, 1);
    vctx.fillStyle = '#6e4626'; vctx.fillRect(x - 5, y - 7, 1, 8); vctx.fillRect(x + 5, y - 7, 1, 8);
    vctx.fillStyle = '#9a6a3e'; vctx.fillRect(x - 5, y - 2, 11, 3); vctx.fillStyle = ['#f0d060', '#e87050', '#80c060'][k % 3]; vctx.fillRect(x - 3, y - 3, 2, 1); vctx.fillRect(x + 1, y - 3, 2, 1);
    for (let i = 0; i < 13; i++) { vctx.fillStyle = Math.floor(i / 2) % 2 ? c2 : c1; vctx.fillRect(x - 6 + i, y - 10, 1, 3); }
    vctx.fillStyle = c1; for (let i = 0; i < 13; i += 2) vctx.fillRect(x - 6 + i, y - 7, 1, 1); // flecos
  }
  // Malabarista en el centro: tres bolas por el aire
  const ts = now / 1000, jx = Math.round(F.x), jy = Math.round(F.y);
  vctx.fillStyle = '#c83a2a'; vctx.fillRect(jx - 1, jy - 5, 3, 4); vctx.fillStyle = '#e8c8a0'; vctx.fillRect(jx, jy - 7, 1, 2); vctx.fillStyle = '#3a6ab8'; vctx.fillRect(jx - 1, jy - 1, 1, 2); vctx.fillRect(jx + 1, jy - 1, 1, 2);
  vctx.fillStyle = '#f8d850'; vctx.fillRect(jx, jy - 9, 1, 1); // gorro
  for (let k = 0; k < 3; k++) { const a = ts * 5 + k * 2.09, bx = jx + Math.cos(a) * 3, by = jy - 9 - Math.abs(Math.sin(a)) * 6; vctx.fillStyle = ['#f0d060', '#e87050', '#70b0f0'][k]; vctx.fillRect(Math.round(bx), Math.round(by), 1, 1); }
  if (Math.random() < .03) floats.push({ x:F.x + (Math.random() - .5) * 30, y:F.y - 14, txt:['♪', '♫', '♪♫'][Math.floor(Math.random() * 3)], col:'#f8e0a0', life:0 });
}
function drawCastles(now){
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const g of villages) {
    if (!g.castle || !popOf(g) || g.hall == null || !world.objs[g.hall]) continue;
    const [x0, y0, x1, y1] = bldBox(g.hall); if (x1 < vx0 - 20 || x0 > vx1 + 20 || y1 < vy0 - 30 || y0 > vy1 + 30) continue;
    const col = villageColor(nationOf(g)), h = Math.round((y1 - y0) * .85), w = 11;
    for (const tx of [x0 - w + 1, x1 - 1]) { // torres de sillares con almenas, saeteras y estandarte
      const top = y1 - h;
      vctx.fillStyle = 'rgba(0,0,0,.28)'; vctx.fillRect(tx - 1, y1, w + 2, 2);
      vctx.fillStyle = '#22201e'; vctx.fillRect(tx - 1, top - 1, w + 2, h + 1); // contorno
      vctx.fillStyle = '#8e8a82'; vctx.fillRect(tx, top, w, h);
      for (let yy = top + 2; yy < y1; yy += 3) { vctx.fillStyle = '#76726a'; vctx.fillRect(tx, yy, w, 1); for (let xx = tx + ((yy / 3) % 2 ? 1 : 3); xx < tx + w; xx += 4) vctx.fillRect(xx, yy - 2, 1, 2); } // sillares
      vctx.fillStyle = '#aaa69e'; vctx.fillRect(tx, top, 2, h); vctx.fillStyle = '#64605a'; vctx.fillRect(tx + w - 2, top, 2, h); // luz y sombra
      vctx.fillStyle = '#22201e'; vctx.fillRect(tx - 2, top - 3, w + 4, 3); vctx.fillStyle = '#9a968e'; vctx.fillRect(tx - 1, top - 3, w + 2, 2); // remate más ancho
      for (let k = 0; k < w + 2; k += 3) { vctx.fillStyle = '#22201e'; vctx.fillRect(tx - 1 + k, top - 6, 3, 3); vctx.fillStyle = '#9a968e'; vctx.fillRect(tx + k, top - 5, 2, 2); } // almenas
      vctx.fillStyle = '#22201e'; vctx.fillRect(tx + (w >> 1) - 1, top + 5, 2, 4); vctx.fillRect(tx + (w >> 1) - 1, top + 14, 2, 4); // saeteras
      vctx.fillStyle = '#4a3018'; vctx.fillRect(tx + (w >> 1), top - 16, 1, 10);
      const wave = Math.round(Math.sin(now / 250 + tx) * .7); vctx.fillStyle = '#22201e'; vctx.fillRect(tx + (w >> 1) + 1, top - 16 + wave, 7, 5);
      vctx.fillStyle = `rgb(${col.join(',')})`; vctx.fillRect(tx + (w >> 1) + 1, top - 15 + wave, 6, 3);
    }
  }
}
