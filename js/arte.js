// World Sim · Arte dibujado a mano (atlas): sustituye los sprites que tienen dibujo nuevo
// ================= Arte =================
// El atlas (arte/atlas.png) y su mapa (js/arte_mapa.js) salen de las hojas de sprites. Si un objeto tiene dibujo
// aquí, se usa; si no (o mientras carga), el juego dibuja el suyo de siempre.
// Los árboles cambian con la estación: en otoño se tiñen de naranja, rojo u oro; en primavera algunos florecen en
// rosa; en invierno los de hoja caduca se quedan desnudos y los de hoja perenne se cubren de nieve.
const ART = { img:null, ready:false, cache:new Map() };
(() => {
  if (typeof ART_MAP === 'undefined') return;
  const im = new Image();
  im.onload = () => { ART.img = im; ART.ready = true; ART.cache.clear(); if (typeof world !== 'undefined' && world && typeof composeRegion === 'function') composeRegion(0, 0, W - 1, H - 1); };
  im.src = 'arte/atlas.png?v=202611240141';
})();
const ART_DECID = new Set(['oak:forest', 'birch:birch', 'willow:swamp', 'willow:moss', 'acacia:dry', 'acacia:sunset', 'oak:cherry', 'pine:autumn']);
const ART_EVER = new Set(['pine:pine', 'pine:snow', 'pine:blue', 'ancient:elder', 'ancient:mangrove', 'ancient:life', 'ancient:baobab']);
function artPiece(k){
  const m = ART_MAP[k]; if (!m || !ART.ready) return null;
  const c = document.createElement('canvas'); c.width = m[2]; c.height = m[3];
  c.getContext('2d').drawImage(ART.img, m[0], m[1], m[2], m[3], 0, 0, m[2], m[3]); c.ax = m[4];
  return c;
}
// Hojas: verdes (más verde que rojo y que azul)
const isLeaf = (r, g, b) => g > b + 22 && g >= r - 14 && !(r > g + 10); // verdes y verde amarillento (acacias), no troncos ni tierra
const ART_AUTUMN = [[[120, 46, 20], [184, 74, 28], [226, 120, 40], [246, 168, 70]], [[110, 24, 22], [168, 40, 32], [208, 70, 44], [236, 120, 80]], [[128, 84, 20], [196, 140, 30], [232, 188, 60], [248, 222, 120]]];
function seasonal(c, key, season, variant){
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), p = d.data, w = c.width;
  const pal = ART_AUTUMN[variant % 3], blossom = variant % 3 === 0; // en primavera, uno de cada tres florece
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 100) continue;
    const r = p[i], g = p[i + 1], b = p[i + 2];
    if (season === 3) { // nieve sobre lo que mira al cielo
      const k = i / 4, above = k - w; if (k >= w && p[above * 4 + 3] < 100 && (isLeaf(r, g, b) || ART_EVER.has(key))) { p[i] = 236; p[i + 1] = 242; p[i + 2] = 248; }
      continue;
    }
    if (!isLeaf(r, g, b)) continue;
    const L = (r * .3 + g * .59 + b * .11) / 255;
    if (season === 2) { const q = pal[Math.min(3, Math.floor(L * 4.2))]; p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2]; }
    else if (season === 0) {
      const k = i / 4, px = k % w, py = (k / w) | 0;
      // Flores en ramilletes irregulares (manchas de 2×2 al azar, más en lo que da la luz), nunca en el borde de la copa
      const edge = px === 0 || py === 0 || px === w - 1 || p[i + 3 - 4] < 100 || p[i + 3 + 4] < 100 || p[i + 3 - w * 4] < 100 || p[i + 3 + w * 4] < 100;
      if (blossom && !edge && h2(px >> 1, py >> 1, 41 + variant) < .26 + L * .2 && h2(px, py, 77 + variant) < .8) { const pink = L > .5 ? [248, 206, 224] : L > .3 ? [236, 168, 198] : [212, 128, 168]; p[i] = pink[0]; p[i + 1] = pink[1]; p[i + 2] = pink[2]; }
      else { p[i] = Math.min(255, r + 14); p[i + 1] = Math.min(255, g + 18); p[i + 2] = Math.min(255, b + 4); } // verde tierno
    }
  }
  x.putImageData(d, 0, 0); return c;
}
function artSprite(o){
  if (!ART.ready || o.st === 'b') return null; // (los retoños, como siempre)
  if (o.st === 'm' && !ART_MAP[o.key + ':bare']) return null; // (un árbol muerto sin dibujo desnudo: el de siempre)
  const key = ART_MAP[o.key] ? o.key : (SPRITE_ALIAS[o.key] || o.key); if (!ART_MAP[key]) return null; // sin dibujo propio todavía: el del edificio más parecido
  const season = typeof treeSeason === 'function' ? treeSeason(o) : 1, tree = ART_DECID.has(key) || ART_EVER.has(key);
  let k2 = key, mode = 1;
  if (tree) {
    if (o.st === 'm' || (season === 3 && ART_DECID.has(key) && ART_MAP[key + ':bare'])) { k2 = key + ':bare'; mode = 1; } // muerto, o en invierno
    else if (ART_EVER.has(key)) mode = season === 3 ? 3 : 1; // los de hoja perenne: solo la nieve
    else if (key !== 'oak:cherry' && key !== 'pine:autumn' || season === 3) mode = season; // el cerezo y el alerce ya tienen su color
  }
  const sz = ([.82, 1, 1.18][o.sz ?? 1] ?? 1) * (o.st === 'j' ? .65 : o.st === 'v' ? 1.08 : 1), variant = (o.v || 0) % 6, ck = `${k2}|${mode}|${tree ? variant % 3 : 0}|${sz}`;
  let c = ART.cache.get(ck); if (c) return c;
  c = artPiece(k2); if (!c) return null;
  if (tree && mode !== 1 && k2 === key) c = seasonal(c, key, mode, variant);
  if (sz !== 1) { const s2 = document.createElement('canvas'); s2.width = Math.max(1, Math.round(c.width * sz)); s2.height = Math.max(1, Math.round(c.height * sz)); const x2 = s2.getContext('2d'); x2.imageSmoothingEnabled = false; x2.drawImage(c, 0, 0, s2.width, s2.height); s2.ax = Math.round(c.ax * sz); c = s2; }
  ART.cache.set(ck, c); return c;
}
// Un fotograma suelto (barca, catapulta, tienda…), ya recortado
const artFrame = k => { if (!ART.ready || !ART_MAP[k]) return null; let c = ART.cache.get('f|' + k); if (!c) { c = artPiece(k); ART.cache.set('f|' + k, c); } return c; };
// Texturas que se repiten (campos, murallas, puentes), alineadas con el mapa para que encajen casilla con casilla
const artPatterns = new Map();
function artPattern(k){
  if (!ART.ready || !ART_MAP[k]) return null;
  let p = artPatterns.get(k); if (p) return p;
  const c = artPiece(k); p = c.getContext('2d').createPattern(c, 'repeat'); p.w = c.width; p.h = c.height; artPatterns.set(k, p); return p;
}
// Rellena un rectángulo con la textura; ox/oy: dónde empieza la textura (si no, alineada con el mapa)
function artFill(ctx, k, x, y, w, h, ox = 0, oy = 0){
  const p = artPattern(k); if (!p) return false;
  p.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy])); ctx.fillStyle = p; ctx.fillRect(x, y, w, h); return true;
}
const FIELD_TEX = { arada:'tex:arada', sembrado:'tex:sembrado', muerta:'tex:muerta' };
const CROP_TEX = { trigo:'tex:trigo', maiz:'tex:maiz', mijo:'tex:mijo', calabaza:'tex:huerta', col:'tex:huerta' };
const fieldTex = f => f.st === 'madura' ? CROP_TEX[f.crop || 'trigo'] || 'tex:trigo' : f.st === 'creciendo' ? (f.g > .55 ? CROP_TEX[f.crop || 'trigo'] || 'tex:trigo' : 'tex:brotes') : FIELD_TEX[f.st];
// Valla dibujada alrededor de un rectángulo (cercado, cementerio); gate: hueco abajo para la entrada (en píxeles desde la izquierda)
function fence(x, y, w, h, gate){
  if (!artPattern('tex:valla_h') || !artPattern('tex:valla_v')) return false;
  artFill(vctx, 'tex:valla_h', x, y - 3, w, 5, 0, y - 3);                                          // fondo
  artFill(vctx, 'tex:valla_v', x - 1, y - 1, 3, h, x - 1, 0); artFill(vctx, 'tex:valla_v', x + w - 2, y - 1, 3, h, x + w - 2, 0); // lados
  if (gate == null) artFill(vctx, 'tex:valla_h', x, y + h - 4, w, 5, 0, y + h - 4);                // frente
  else { artFill(vctx, 'tex:valla_h', x, y + h - 4, gate - 1, 5, 0, y + h - 4); artFill(vctx, 'tex:valla_h', x + gate + T + 1, y + h - 4, w - gate - T - 1, 5, 0, y + h - 4); }
  return true;
}
// Aspas de los molinos: al final de todo, para que nada (ni la gente que pasa por detrás) las tape
let millSails = [];
function drawMillSails(){
  for (const [asp, hx, hy, a] of millSails) { vctx.save(); vctx.translate(hx + .5, hy + .5); vctx.rotate(a); vctx.drawImage(asp, -asp.width / 2, -asp.height / 2); vctx.restore(); vctx.fillStyle = '#2a1a10'; vctx.fillRect(hx, hy, 1, 1); }
  millSails.length = 0;
}
// Llamas animadas sobre los edificios que en el dibujo tenían fuego (altar, zigurat, herrería)
function drawArtFlames(t){
  if (!ART.ready) return;
  const [x0, y0, x1, y1] = visibleRect();
  for (const g of villages) for (const i of [g.altar, g.forge, g.cathedral]) {
    if (i == null) continue; const o = world.objs[i]; if (!o || !ART_MAP[o.key] || !ART_MAP[o.key][5] || o.burnt) continue;
    const m = ART_MAP[o.key], fl = m[5], left = (i % W) * T + 2 + (o.ox || 0) - m[4], top = ((i / W) | 0) * T + 3 + (o.oy || 0) - m[3] + 1;
    if (left > x1 || left + m[2] < x0 || top > y1 || top + m[3] < y0) continue;
    const fx = left + fl[0], fy = top + fl[1], fw = fl[2], fh = fl[3], forge = o.key.startsWith('forge');
    if (forge) { // la boca del horno, que brilla y parpadea
      for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < fw; xx++) { const f = Math.sin(t / 90 + xx * 1.7 + yy * 2.3 + i) * .5 + .5; vctx.fillStyle = f > .66 ? '#ffd860' : f > .3 ? '#ff8a2a' : '#c8401a'; vctx.fillRect(fx + xx, fy + yy, 1, 1); }
      continue;
    }
    for (let xx = 0; xx < fw; xx++) { // llama: columnas que suben y bajan
      const hcol = Math.max(1, Math.round(fh * (.45 + .55 * (1 - Math.abs(xx - fw / 2) / (fw / 2 + .5))) * (.7 + .3 * Math.sin(t / 110 + xx * 1.9 + i))));
      for (let yy = 0; yy < hcol; yy++) { vctx.fillStyle = yy < hcol * .35 ? '#ffe680' : yy < hcol * .75 ? '#ff9a30' : '#e0501a'; vctx.fillRect(fx + xx, fy + fh - 1 - yy, 1, 1); }
    }
  }
}
