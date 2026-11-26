// World Sim · Barrios: cada ciudad, repartida en zonas que se ven en el mapa
// ================= Barrios =================
// · Los edificios de cada ciudad se agrupan por lo que son: el Centro (ayuntamiento, plaza, gobierno, templos, escuela,
//   hospital), los barrios residenciales (casas y bloques de pisos), la zona de comercio y ocio (mercado, taberna, banco,
//   teatro…), el polígono industrial (fábricas, central, refinería, almacenes y talleres), el distrito minero y los campos
// · Cada barrio se pinta con un tono suave y lleva su nombre (en la lengua del pueblo, y se queda para siempre). Pulsando
//   el nombre se abre su ficha: qué edificios tiene y cuánta gente vive allí. En la ficha de la ciudad (pestaña Mapa),
//   la lista de sus barrios
// · Capa «Barrios de las ciudades» en Ajustes → Capas
// · Las casas ya no se levantan dentro del polígono industrial: queda para las fábricas
const BARRIO = {
  centro:{ n:'Centro', col:[236, 192, 84], d:'El corazón de la ciudad: ayuntamiento, plaza, gobierno, templos, escuela y hospital' },
  residencial:{ n:'Barrio residencial', col:[110, 168, 236], d:'Casas y bloques de pisos: aquí vive la gente' },
  comercio:{ n:'Comercio y ocio', col:[232, 110, 170], d:'Mercado, taberna, banco, teatro y demás: donde se compra, se vende y se pasa el rato' },
  industria:{ n:'Polígono industrial', col:[168, 160, 176], d:'Fábricas, central, refinería, almacenes y talleres' },
  minas:{ n:'Distrito minero', col:[184, 128, 74], d:'La mina, la cantera y las fábricas que viven de ellas' },
  campos:{ n:'Campos', col:[120, 196, 92], d:'Huertas, campos de cultivo, cercados y arboledas' },
};
const BARRIO_OF = { hall:'centro', court:'centro', parliament:'centro', academy:'centro', university:'centro', council:'centro', press:'centro', school:'centro', civic:'centro', temple:'centro', cathedral:'centro', altar:'centro', obelisk:'centro', wonder:'centro', hospital:'centro', jail:'centro', union:'centro', spy:'centro', clock:'centro', observatory:'centro', embassy:'centro',
  house:'residencial', okupa:'residencial',
  market:'comercio', tavern:'comercio', bank:'comercio', tradehall:'comercio', casino:'comercio', theater:'comercio', coliseum:'comercio', post:'comercio', sport:'comercio',
  fac:'industria', factory:'industria', power:'industria', oil:'industria', pump:'industria', station:'industria', // (almacenes, molinos y herrerías no hacen barrio: son del que los rodea)
  mine:'minas', quarry:'minas' };
const BARRIO_DIR = ['Norte', 'Este', 'Sur', 'Oeste'];
let barrios = [], barrioT = -1e9, barrioCv = null, barrioLabels = [];
// Calcula los barrios: cada edificio marca su huella (y un poco alrededor) con su tipo; las zonas unidas del mismo tipo
// son un barrio (si son de cierto tamaño)
function computeBarrios(){
  barrios = []; const own = new Int32Array(W * H).fill(-1), kind = new Int8Array(W * H).fill(-1), K = Object.keys(BARRIO), dist = new Uint8Array(W * H).fill(255);
  const q = [];
  const mark = (i, k, gid, d) => { if (i < 0 || i >= W * H || WATER[world.biome[i]]) return; if (dist[i] <= d) return; dist[i] = d; kind[i] = k; own[i] = gid; q.push(i); };
  for (const g of liveTowns()) {
    for (const b of buildingsOf(g)) {
      const o = world.objs[b]; if (!o || !isBuilding(o)) continue; const p = o.key.split(':')[0];
      let c = BARRIO_OF[p]; if (!c) continue;
      if (c === 'industria' && g.mineZone && Math.hypot(b % W - g.mineZone.x, ((b / W) | 0) - g.mineZone.y) < 16) c = 'minas';
      const k = K.indexOf(c), [hw, hh] = BUILD_DIMS[p] || [3, 4], x = b % W, y = (b / W) | 0;
      for (let yy = y - hh; yy <= y + 1; yy++) for (let xx = x - hw; xx <= x + hw; xx++) mark(yy * W + xx, k, g.id, 0);
    }
    { const ki = K.indexOf('industria'), km = K.indexOf('minas'); // (las fábricas, la central, la refinería y la extractora van aparte de los demás edificios)
      for (const [i, z] of [...(g.facs || []).map(f => [f.i, f.zone]), [g.plant], [g.refinery], [g.pump]]) { if (i == null || !world.objs[i]) continue; const [hw, hh] = BUILD_DIMS[world.objs[i].key.split(':')[0]] || [4, 5], x = i % W, y = (i / W) | 0;
        for (let yy = y - hh; yy <= y + 1; yy++) for (let xx = x - hw; xx <= x + hw; xx++) mark(yy * W + xx, z === 'mina' ? km : ki, g.id, 0); } }
    const kc = K.indexOf('campos');
    for (const p of pensOf(g)) for (let yy = p.y0; yy <= p.y1; yy++) for (let xx = p.x0; xx <= p.x1; xx++) mark(yy * W + xx, kc, g.id, 1);
    if (g.plaza) for (let yy = g.plaza.y0; yy <= g.plaza.y1; yy++) for (let xx = g.plaza.x0; xx <= g.plaza.x1; xx++) mark(yy * W + xx, K.indexOf('centro'), g.id, 0);
  }
  for (const f of farmMap.values()) { const g = villageById(f.vid); if (g && popOf(g)) mark(f.i, K.indexOf('campos'), g.id, 1); }
  // Un poco alrededor de cada edificio (calles, patios): así un barrio es una mancha y no edificios sueltos
  for (let h = 0; h < q.length; h++) { const i = q[h], d = dist[i]; if (d >= 3) continue; for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && dist[j] > d + 1 && !WATER[world.biome[j]] && !(kind[j] >= 0 && dist[j] <= 1)) { dist[j] = d + 1; kind[j] = kind[i]; own[j] = own[i]; q.push(j); } }
  // Zonas unidas del mismo tipo y la misma ciudad
  const comps = () => { const seen = new Uint8Array(W * H), out = [];
    for (const s0 of q) { if (seen[s0] || kind[s0] < 0) continue; const k = kind[s0], gid = own[s0], comp = [s0]; seen[s0] = 1;
      for (let h = 0; h < comp.length; h++) { const i = comp[h]; for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && !seen[j] && kind[j] === k && own[j] === gid) { seen[j] = 1; comp.push(j); } }
      out.push({ k, gid, tiles:comp }); }
    return out; };
  // Un solo centro por ciudad (el del ayuntamiento o el más céntrico); los trozos sueltos de centro, comercio o industria
  // (un templo o una taberna entre casas) son del barrio que los rodea; lo diminuto no es barrio
  const kR = K.indexOf('residencial'), cOf = c => { let sx = 0, sy = 0; for (const i of c.tiles) { sx += i % W; sy += (i / W) | 0; } return [sx / c.tiles.length, sy / c.tiles.length]; };
  let C = comps(); const bestCentro = new Map();
  for (const c of C) if (K[c.k] === 'centro') { const g = villageById(c.gid), hall = g.hall != null ? g.hall : Math.round(g.fy) * W + Math.round(g.fx), [cx, cy] = cOf(c), sc = (c.tiles.includes(hall) ? 1e6 : 0) + c.tiles.length - Math.hypot(cx - g.fx, cy - g.fy) * 8; if (!bestCentro.has(c.gid) || sc > bestCentro.get(c.gid).sc) bestCentro.set(c.gid, { c, sc }); }
  for (const c of C) { const n = K[c.k], L = c.tiles.length;
    if ((n === 'centro' && bestCentro.get(c.gid).c !== c) || (n === 'industria' && L < 80) || (n === 'comercio' && L < 45)) for (const i of c.tiles) kind[i] = kR;
    else if ((n === 'minas' && L < 40) || (n === 'campos' && L < 60)) for (const i of c.tiles) kind[i] = -2; }
  C = comps();
  // Viviendas: en un pueblo pequeño, el pueblo entero es «el barrio» (no se marca); de 40 habitantes en adelante, un barrio
  // residencial, y de 80 en adelante, uno por punto cardinal (norte, este, sur, oeste), con todas sus casas aunque estén sueltas
  const parts = [], resid = new Map();
  for (const c of C) { const n = K[c.k];
    if (n !== 'residencial') { if (!(n === 'campos' && c.tiles.length < 60)) parts.push(c); continue; }
    const g = villageById(c.gid), pop = popOf(g); if (pop < 40) continue;
    for (const i of c.tiles) { const a = Math.atan2(((i / W) | 0) - g.fy, i % W - g.fx), sec = pop >= 80 ? ((Math.round(a / (Math.PI / 2)) % 4) + 5) % 4 : 0, key = c.gid + ':' + sec;
      let r = resid.get(key); if (!r) resid.set(key, r = { k:c.k, gid:c.gid, tiles:[] }); r.tiles.push(i); }
  }
  for (const r of resid.values()) if (r.tiles.length >= 40) parts.push(r);
  for (const c of parts) {
    let sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; sx += x; sy += y; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    barrios.push({ g:c.gid, c:K[c.k], tiles:c.tiles, cx:sx / c.tiles.length, cy:sy / c.tiles.length, x0, y0, x1, y1 });
  }
  for (let i = 0; i < W * H; i++) if (kind[i] === -2) kind[i] = -1;
  // Nombres: el centro, «Centro»; los demás, con nombre propio en la lengua del pueblo (se guarda: no cambia nunca)
  const used = new Map();
  for (const B of barrios.sort((a, b) => b.tiles.length - a.tiles.length)) {
    const g = villageById(B.g), N = g.barrioNames ||= {};
    const a = Math.atan2(B.cy - g.fy, B.cx - g.fx), dir = BARRIO_DIR[((Math.round(a / (Math.PI / 2)) % 4) + 5) % 4];
    let key = B.c === 'centro' ? 'centro' : B.c + ':' + dir, n = 1; while (used.has(B.g + '|' + key)) key = B.c + ':' + dir + ':' + (++n); used.set(B.g + '|' + key, 1);
    B.key = key;
    if (!N[key]) {
      const pn = typeof placeName === 'function' ? placeName(g) : null, d = dir.toLowerCase();
      N[key] = B.c === 'centro' ? 'Centro' : B.c === 'residencial' ? (pn ? `Barrio de ${pn}` : `Barrio ${dir}${n > 1 ? ' ' + n : ''}`)
        : B.c === 'comercio' ? (pn ? `Paseo de ${pn}` : `Zona comercial ${d}`) : B.c === 'industria' ? (pn ? `Polígono de ${pn}` : `Polígono ${d}`) : B.c === 'minas' ? (pn ? `Minas de ${pn}` : 'Distrito minero') : `Campos del ${d}`;
    }
    B.name = N[key];
  }
  // La capa del mapa: un píxel por casilla (luego se estira): tono suave dentro y algo más fuerte en el borde
  if (!barrioCv || barrioCv.width !== W || barrioCv.height !== H) { barrioCv = document.createElement('canvas'); barrioCv.width = W; barrioCv.height = H; }
  const x = barrioCv.getContext('2d'), img = x.createImageData(W, H), D = img.data, idx = new Int16Array(W * H).fill(-1);
  barrios.forEach((B, n) => { for (const i of B.tiles) idx[i] = n; });
  barrios.forEach((B, n) => { const [r, g2, b] = BARRIO[B.c].col; for (const i of B.tiles) { const edge = [i - 1, i + 1, i - W, i + W].some(j => idx[j] !== n); D[i * 4] = r; D[i * 4 + 1] = g2; D[i * 4 + 2] = b; D[i * 4 + 3] = B.c === 'campos' ? 0 : edge ? 70 : 24; } });
  x.putImageData(img, 0, 0); barrioT = yearT;
}
const barriosOn = () => params.barrios !== false;
function drawBarrios(){
  if (!barriosOn() || !world || !villages.length) return;
  if (yearT - barrioT > 15 || yearT < barrioT) computeBarrios();
  if (!barrioCv) return; const sm = vctx.imageSmoothingEnabled; vctx.imageSmoothingEnabled = false; vctx.drawImage(barrioCv, 0, 0, W * T, H * T); vctx.imageSmoothingEnabled = sm;
}
// Los nombres, por encima de los edificios (solo de cerca, y no los de los campos salvo muy de cerca)
function drawBarrioNames(){
  barrioLabels = []; if (!barriosOn() || zoom < 1.8) return;
  const [vx0, vy0, vx1, vy1] = visibleRect(), fs = Math.max(4, 11 / zoom);
  vctx.save(); vctx.font = `600 ${fs}px system-ui, sans-serif`; vctx.textAlign = 'center'; vctx.textBaseline = 'middle'; vctx.lineJoin = 'round';
  for (const B of barrios) {
    if (B.c === 'campos' && zoom < 3) continue;
    const x = B.cx * T + 2, y = B.cy * T + 2; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const [r, g, b] = BARRIO[B.c].col, t = B.name.toUpperCase(), w = vctx.measureText(t).width, box = { x0:x - w / 2 - 2, x1:x + w / 2 + 2, y0:y - fs * .7, y1:y + fs * .7 };
    const hit = q => !(box.x1 < q.x0 || box.x0 > q.x1 || box.y1 < q.y0 || box.y0 > q.y1);
    if (barrioLabels.some(hit) || liveTowns().some(o => hit({ x0:o.fx * T - 70, x1:o.fx * T + 74, y0:o.fy * T - 44, y1:o.fy * T - 14 }))) continue; // (ni encima de otro nombre ni del de la ciudad)
    vctx.lineWidth = 3 / zoom; vctx.strokeStyle = 'rgba(10,14,20,.8)'; vctx.strokeText(t, x, y); vctx.fillStyle = `rgb(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)})`; vctx.fillText(t, x, y);
    barrioLabels.push({ B, ...box });
  }
  vctx.restore();
}
{ const base = drawZones; drawZones = function(){ base.apply(this, arguments); drawBarrios(); }; }
{ const base = drawInstFlags; drawInstFlags = function(){ base.apply(this, arguments); drawBarrioNames(); }; }
// ---- Seleccionar un barrio (pulsando su nombre o desde la ficha de la ciudad) ----
ZONE_INFO.barrio = ['Barrio', 'Barrio', ''];
const barrioByKey = (vid, key) => barrios.find(B => B.g === vid && B.key === key);
const barrioRect = z => { const B = barrioByKey(z.vid, z.key); return B ? { x0:B.x0, y0:B.y0, x1:B.x1, y1:B.y1 } : null; }; // (zoneRect, en edificios.js, pregunta aquí)
addEventListener('DOMContentLoaded', () => { const c = document.getElementById('barrios'); if (!c) return; c.checked = barriosOn(); c.addEventListener('change', () => { params.barrios = c.checked; barrioT = -1e9; }); });
{ const base = zoneAt; zoneAt = function(sx, sy){
  if (barriosOn()) { const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom; const L = barrioLabels.find(l => wx >= l.x0 && wx <= l.x1 && wy >= l.y0 && wy <= l.y1); if (L) return { vid:L.B.g, k:'barrio', key:L.B.key }; }
  return base.apply(this, arguments);
}; }
function barrioStats(B){
  const set = new Set(B.tiles), cnt = {}; let homes = 0, people = 0; const g = villageById(B.g);
  for (const b of buildingsOf(g)) { if (!set.has(b)) continue; const o = world.objs[b]; if (!o || !isBuilding(o)) continue; const nm = OBJ[o.key] ? OBJ[o.key][0] : o.key; cnt[nm] = (cnt[nm] || 0) + 1; if (o.key.startsWith('house:')) { homes++; people += villagers.filter(u => !u.dead && u.home === b).length; } }
  return { cnt, homes, people, tiles:B.tiles.length };
}
{ const base = zoneDetails; zoneDetails = function(z, g){
  if (z.k !== 'barrio') return base.apply(this, arguments);
  const B = barrioByKey(z.vid, z.key); if (!B) return ''; const S = barrioStats(B), kv = (a, b) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  return kv('Tipo', BARRIO[B.c].n) + kv('Superficie', `${S.tiles} casillas`) + (S.homes ? kv('Viviendas', `${S.homes} · ${S.people} vecinos`) : '')
    + (Object.keys(S.cnt).length ? `<h4>Edificios</h4><div class="chips">${Object.entries(S.cnt).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<span>${c} × ${esc(n)}</span>`).join('')}</div>` : '');
}; }
{ const base = renderZoneCard; renderZoneCard = function(){
  if (selZone && selZone.k === 'barrio') { const B = barrioByKey(selZone.vid, selZone.key); if (B) ZONE_INFO.barrio = [BARRIO[B.c].n, B.name, BARRIO[B.c].d]; }
  return base.apply(this, arguments);
}; }
// En la ficha de la ciudad (pestaña Mapa): sus barrios
function barriosCard(g){
  if (!barriosOn()) return ''; if (yearT - barrioT > 15) computeBarrios();
  const L = barrios.filter(B => B.g === g.id && B.c !== 'campos').sort((a, b) => Object.keys(BARRIO).indexOf(a.c) - Object.keys(BARRIO).indexOf(b.c) || b.tiles.length - a.tiles.length);
  if (!L.length) return '';
  return `<h4>Barrios</h4><div class="laws">${L.map(B => { const S = barrioStats(B), [r, g2, b] = BARRIO[B.c].col; return `<div style="border-left-color:rgb(${r},${g2},${b})"><b><button class="lnk" data-barrio="${B.g}|${B.key}">${esc(B.name)}</button></b><span class="muted">${[B.name !== BARRIO[B.c].n ? BARRIO[B.c].n : '', S.homes ? `${S.people} vecinos en ${S.homes} casas` : '', `${Object.values(S.cnt).reduce((a, c) => a + c, 0)} edificios`].filter(Boolean).join(' · ')}</span></div>`; }).join('')}</div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-barrio]'); if (!b) return; const [vid, key] = b.dataset.barrio.split('|'); const B = barrioByKey(+vid, key); if (!B) return; selectZone({ vid:+vid, k:'barrio', key }); centerOn(B.cx * T, B.cy * T, Math.max(zoom, 2)); });
// ---- Las casas, fuera del polígono industrial (queda para las fábricas) ----
const RESID_KINDS = new Set(['casa', 'chabola']);
{ const base = buildingClash; buildingClash = function(x, y, kind){
  if (RESID_KINDS.has(kind)) for (const g of villages) { const z = g.indZone; if (z && popOf(g) && (g.facs || []).length && Math.abs(x - z.x) <= 31 && Math.abs(y - z.y) <= 17) return true; }
  return base.apply(this, arguments);
}; }
