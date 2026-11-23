// Forja de Mundos · Cámara, zoom y dibujo de cada fotograma
// ================= Vista =================
const stage = document.getElementById('stage'), view = document.getElementById('view');
let vctx = view.getContext('2d'); // se cambia un momento para pintar capas en caché
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let zoom = 1, offX = 0, offY = 0, cw = 0, ch = 0, needFit = true, mouse = null;

// El mapa siempre llena la vista: zoom mínimo "cubrir" y la cámara no puede salirse de los bordes
const minZoom = () => Math.max(cw / PW, ch / PH);
function clampView(){
  zoom = clamp(zoom, minZoom(), 16);
  offX = clamp(offX, cw - PW * zoom, 0);
  offY = clamp(offY, ch - PH * zoom, 0);
}
function fit(){
  zoom = minZoom();
  offX = (cw - PW * zoom) / 2; offY = (ch - PH * zoom) / 2;
}
function zoomAt(sx, sy, nz){
  nz = clamp(nz, minZoom(), 16);
  offX = sx - (sx - offX) * (nz / zoom); offY = sy - (sy - offY) * (nz / zoom);
  zoom = nz;
}
function centerOn(px, py, z){ if (!isFinite(px) || !isFinite(py) || !isFinite(z)) return; zoom = z; offX = cw / 2 - px * zoom; offY = ch / 2 - py * zoom; }

function draw(t){
  if (!world || !cw || busy) return;
  if (needFit) { fit(); needFit = false; }
  clampView();
  const dpr = window.devicePixelRatio || 1;
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  vctx.fillStyle = `rgb(${DEEP_C})`;
  vctx.fillRect(0, 0, view.width, view.height);
  vctx.imageSmoothingEnabled = false;
  // Desplazamiento redondeado a píxel de pantalla: evita que los píxeles tiemblen al mover la cámara
  // Temblor de cámara durante los terremotos
  const jx = shake && !reduceMotion ? (Math.random() - .5) * shake * 2 : 0, jy = shake && !reduceMotion ? (Math.random() - .5) * shake * 2 : 0;
  vctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, Math.round(dpr * (offX + jx)), Math.round(dpr * (offY + jy)));
  // Orden: terreno → agua animada → árboles y rocas → aldeanos
  vctx.drawImage(terrain, 0, 0);
  if (waveImg && !reduceMotion) vctx.drawImage(waveCv, 0, 0);
  drawGlints(t);
  drawWhirls(t);
  drawFish(t);
  drawDrought();
  drawScars();
  drawBurnt();
  drawFires(t, false);
  drawGrass(t);
  drawZones();
  drawPaths();
  drawBridges();
  drawFarms(); drawCemeteries(); drawTracks(); drawAeros();
  drawPens();
  drawWalls();
  drawCracks();
  vctx.drawImage(worldCv, 0, 0);
  drawArtFlames(t);
  drawInstFlags(t); // la bandera en los edificios del gobierno (instituciones.js)
  drawSelBuilding(t); // el edificio elegido, marcado (edificios.js)
  drawCamps(t);
  drawFires(t, true);
  drawVillageFx(t);
  drawSeasonTint();
  drawCorpses(); // antes que los vivos: un animal vivo nunca queda tapado por uno que cae
  drawAnimals(-1);  // se ordenan los animales; se pintan intercalados con los aldeanos, el de más atrás primero
  drawVillagers();
  drawMillSails();
  drawAnimals();
  drawSmoke();
  drawBalloons(t); // por encima de árboles y animales: el globo va por el aire
  drawVapor(Math.min(.1, (t - (drawVapor.last || t)) / 1000)); drawVapor.last = t;
  drawSandstorms(t);
  // Volcanes: resplandor del cráter, humo según lo activos que estén y bombas de lava en erupción
  if (!reduceMotion) for (const vo of world.volcanoes) {
    const h = vo.heat; if (h < .08) continue;
    const erupt = vo.state === 'erupcion';
    if (h > .5) {
      vctx.fillStyle = `rgba(255,120,40,${(h - .5) * .45 * (.8 + .2 * Math.sin(t / 150))})`;
      vctx.beginPath(); vctx.arc(vo.x, vo.y, 4 + h * 5 + (vo.kind === 'caldera' ? vo.r * 1.2 : 0), 0, Math.PI * 2); vctx.fill();
    }
    const n = Math.round(3 + h * 12);
    for (let p = 0; p < n; p++) {
      const tt = (t / 1000 * (.25 + h * .2) + p / n) % 1, sz = 1 + Math.floor(tt * (3 + h * 4));
      const x = Math.round(vo.x + Math.sin(tt * 5 + p) * (2 + h * 3) * tt + tt * 12 - sz / 2), y = Math.round(vo.y - 3 - tt * (20 + h * 40));
      const g = (erupt ? 50 : 80) + tt * 80 | 0;
      vctx.fillStyle = `rgba(${g},${g},${g + 4},${(1 - tt) * (.3 + h * .4)})`;
      vctx.fillRect(x, y, sz, sz);
    }
    for (const b of vo.bombs) {
      const life = 1 - b.life / 1.8;
      vctx.fillStyle = `rgba(255,${180 - b.life * 60 | 0},60,${life})`;
      vctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 2);
      vctx.fillStyle = `rgba(255,120,40,${life * .5})`;
      vctx.fillRect(Math.round(b.x - b.vx * .04), Math.round(b.y - b.vy * .04), 1, 1);
    }
  }
  // Nube de ceniza gris oscura de las erupciones
  for (const p of ash) {
    const a = (1 - p.life / p.max) * .55 * Math.min(1, p.life * 3), s = Math.round(p.r), x = Math.round(p.x), y = Math.round(p.y);
    vctx.fillStyle = `rgba(${p.g},${p.g},${p.g + 3},${a})`;
    vctx.fillRect(x - (s >> 1), y - (s / 3 | 0), s, Math.max(1, s * 2 / 3 | 0));
    vctx.fillRect(x - (s / 3 | 0), y - (s >> 1), Math.max(1, s * 2 / 3 | 0), s);
  }
  drawNight();
  drawEffects();
  drawQuakes(t);
  drawWeather(t);
  drawMeteors(t); // por encima de las nubes: la roca viene del cielo y la zona marcada tiene que verse
  drawPlates();
  drawHeightmap(t);
  drawThermal(t);
  drawWindmap(t);
  drawWarLines(performance.now()); drawVillageNames();
  if (params.objects) {
    // Destellos sobre los objetos épicos y legendarios
    for (const s of world.rare) {
      if (s.tier < 3) continue;
      const cyc = reduceMotion ? 0 : t / 1100 + s.seed, n = Math.floor(cyc), ph = cyc - n;
      if (!reduceMotion && ph > .55) continue;
      const a = reduceMotion ? .8 : Math.sin(ph / .55 * Math.PI);
      const x = Math.round(s.px + (h2(s.i, n, 1) - .5) * s.w * .7), y = Math.round(s.py - s.h * (.35 + h2(s.i, n, 2) * .5));
      vctx.fillStyle = s.tier === 4 ? `rgba(255,244,190,${a})` : `rgba(236,214,255,${a})`;
      vctx.fillRect(x, y, 1, 1);
      if (a > .55) { vctx.fillRect(x - 1, y, 3, 1); vctx.fillRect(x, y - 1, 1, 3); }
    }
  }
  vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (params.objects && params.markers) {
    // Con el mapa alejado solo se señalan épicos y legendarios, para no llenarlo de rombos
    const minTier = zoom < 1.5 ? 4 : zoom < 3 ? 3 : 2;
    for (const s of world.rare) {
      if (s.tier < minTier) continue;
      const sx = offX + s.px * zoom, sy = offY + (s.py - s.h) * zoom - 7;
      if (sx < -10 || sy < -10 || sx > cw + 10 || sy > ch + 10) continue;
      vctx.fillStyle = 'rgba(0,0,0,.7)';
      vctx.beginPath(); vctx.moveTo(sx, sy - 5); vctx.lineTo(sx + 5, sy); vctx.lineTo(sx, sy + 5); vctx.lineTo(sx - 5, sy); vctx.fill();
      vctx.fillStyle = TIERS[s.tier].c;
      vctx.beginPath(); vctx.moveTo(sx, sy - 3.5); vctx.lineTo(sx + 3.5, sy); vctx.lineTo(sx, sy + 3.5); vctx.lineTo(sx - 3.5, sy); vctx.fill();
    }
  }
  // Flecha sobre cada aldeano para encontrarlo a cualquier zoom, del color de su nación (con borde dorado si la cámara lo sigue)
  const natCol = new Map(), colOf = v => { let c = natCol.get(v.vid); if (!c) { const g = villageById(v.vid); c = g ? villageColor(nationOf(g)) : [255, 255, 255]; natCol.set(v.vid, c); } return c; };
  for (const v of villagers) {
    if (v.appear < .25 || (zoom >= 4 && v !== follow)) continue; // de cerca ya se ven sin flecha
    const sx = offX + v.x * zoom, sy = offY + (v.y - 8) * zoom - 4 - (reduceMotion ? 0 : Math.abs(Math.sin(t / 300)) * 3);
    if (sx < -10 || sy < -10 || sx > cw + 10 || sy > ch + 10) continue;
    const c = colOf(v), fol = v === follow;
    vctx.fillStyle = fol ? '#e9b949' : 'rgba(0,0,0,.8)';
    vctx.beginPath(); vctx.moveTo(sx - 6.5, sy - 8.5); vctx.lineTo(sx + 6.5, sy - 8.5); vctx.lineTo(sx, sy + 1.5); vctx.fill();
    vctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    vctx.beginPath(); vctx.moveTo(sx - 4.5, sy - 7); vctx.lineTo(sx + 4.5, sy - 7); vctx.lineTo(sx, sy - 1); vctx.fill();
    vctx.fillStyle = 'rgba(255,255,255,.55)'; vctx.fillRect(sx - 3.5, sy - 7, 7, 1.2); // brillo arriba
  }
  if (mouse && params.tool !== 'move') {
    const r = brushRadius() + .5;
    vctx.strokeStyle = 'rgba(255,255,255,.85)'; vctx.lineWidth = 1.5;
    vctx.beginPath(); vctx.arc(mouse.x, mouse.y, Math.max(3, r * T * zoom), 0, Math.PI * 2); vctx.stroke();
  }
  drawPressure(t);
  drawPlateArrows();
  drawQuakeLabels();
  if (flash > 0) { vctx.fillStyle = `rgba(230,238,255,${flash})`; vctx.fillRect(0, 0, cw, ch); } // relámpago
}
// Ciclo de cada volcán: dormido → activo (humea) → a veces erupción → activo → dormido…
let lastNotice = -1e9, noticeTarget = null, noticeTimer = 0;
const DISASTER_NOTICES = [[/huracán/, 'huracan', 60], [/tornado/, 'tornado', 35], [/tromba/, 'tromba', 30], [/torbellino/, 'remolino', 30], [/tsunami/, 'tsunami', 70], [/Terremoto/, 'terremoto', 55],
  [/erupción/, 'volcan', 70], [/Ha caído .*meteorito/, 'meteorito', 90], [/Se acerca .*meteorito/, 'cometa', 140], [/tormenta de arena/, 'arena', 40],
  [/sequía en una región/, 'seca', 40], [/declarado un incendio/, 'fuegoMonte', 25], [/calentarse/, 'calentamiento', 0], [/enfriarse/, 'enfriamiento', 0]];
let inDisaster = false;
function nearDisaster(cause, px, py, R){
  if (typeof villages === 'undefined' || inDisaster) return;
  inDisaster = true;
  try { for (const g of villages) if (popOf(g) && (!R || px == null || Math.hypot(g.fx - px / T, g.fy - py / T) < R)) misfortune(g, cause); } finally { inDisaster = false; }
}
function notify(text, target){
  if (typeof villages !== 'undefined') for (const g of villages) if (text.includes(g.name)) { (g.log ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, txt:text }); if (g.log.length > 60) g.log.shift(); }
  if (!inDisaster) for (const [re, cause, R] of DISASTER_NOTICES) if (re.test(text)) { setTimeout(() => nearDisaster(cause, target && target.x, target && target.y, R), 1200); break; }
  pushToast(text, target);
}
// ---- Avisos: tarjetas apiladas por tipo, que duran más si son importantes; y la crónica con todo lo que ha pasado ----
const TOAST_KIND = [
  ['war', /guerra|ataca|saque|conquist|Emboscada|rechaz|asalto|marchan a atacar|arrasada/],
  ['pol', /lecciones|golpe|Golpe|evoluci|Manifest|se corona|régimen|teocracia|Socialista|socialismo|imperio|independiza|partidos|se une por las buenas|escinden|dinastía|hereda la corona|soldados? carga|detiene|cede ante/],
  ['eco', /moneda|banco|precios|Bancarrota|nflación|Flujo|presta|mercado|caravana|trueque/],
  ['dip', /firman|alianza|Alianza|Pacto|Liga|Tratado|Coalición|Concordia|abandona|diplomático|ahora son|se han encontrado|se disuelve/],
  ['rel', /dios|diosa|ritual|templo|venerar|sacrific|ofrenda|plaza sagrada|sacerdotes/],
  ['dis', /tormenta|tornado|huracán|terremoto|volcán|meteorito|incendio|fuego|inunda|tsunami|sequía|helada|tromba|torbellino|erupción|derrumbado|derruid/],
  ['death', /muere|Murió|ha muerto|extinguido|ejecutados/]
];
const TOAST_TITLE = { war:'Guerra', pol:'Política', eco:'Economía', dip:'Diplomacia', rel:'Religión', dis:'Catástrofe', death:'Muerte', misc:'Noticia' };
const TOAST_BIG = /declara la guerra|conquista|Triunfa|Golpe de estado|Revolución|extinguido|arrasada|Bancarrota|firman|teocracia|República Socialista|imperio|independiza|entra en la guerra|rechazan el ataque|se corona/;
let chronicle = [], toastSeq = 0, chronUnread = 0, lastToastT = -1e9;
const kindOf = t => (TOAST_KIND.find(([, re]) => re.test(t)) || ['misc'])[0];
function pushToast(text, target){
  const kind = kindOf(text), big = TOAST_BIG.test(text), box = $('toasts');
  if (big) snd(/guerra|Golpe|Revolución|conquista/.test(text) ? 'horn' : 'bell');
  chronicle.push({ d:Math.floor(yearT / DAY_LEN) + 1, text, kind, target }); if (chronicle.length > 150) chronicle.shift();
  if ($('chron') && !$('chron').hidden) renderChronicle();
  if (!box) return;
  const btn = $('chronBtn'); if (btn && $('chron').hidden) { chronUnread++; btn.dataset.n = chronUnread > 99 ? '99+' : chronUnread; }
  // Solo salen arriba los importantes y, de los demás, uno cada pocos segundos (todo queda en la crónica)
  const now = performance.now();
  if (!big && !['war', 'dis', 'pol', 'dip'].includes(kind)) return;
  if (!big) { if (now - lastToastT < 6000) return; lastToastT = now; }
  for (const el of box.children) if (el.dataset.txt === text) { el.remove(); break; } // el mismo aviso repetido: solo una vez
  const el = document.createElement('div'); el.className = `toast ${kind}${big ? ' big' : ''}`; el.dataset.txt = text; el.dataset.id = ++toastSeq;
  el.innerHTML = `<div class="tk"><span class="tt">${TOAST_TITLE[kind]}</span><span class="td">día ${Math.floor(yearT / DAY_LEN) + 1}</span></div><div class="tx"></div>
    <div class="tb">${target ? '<button class="go">Ver</button>' : ''}<button class="cl" aria-label="Cerrar aviso">×</button></div>`;
  el.querySelector('.tx').textContent = text;
  if (target) el.querySelector('.go').onclick = () => { setFollow(null); centerOn(target.x, target.y - 10, Math.max(zoom, 5)); el.remove(); };
  el.querySelector('.cl').onclick = () => el.remove();
  let left = big ? 14000 : 8000, t0 = performance.now(), timer = 0;
  const arm = () => { t0 = performance.now(); timer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, left); };
  el.onmouseenter = () => { clearTimeout(timer); left -= performance.now() - t0; }; el.onmouseleave = () => { left = Math.max(left, 2500); arm(); };
  box.prepend(el); arm();
  // Como mucho 4 a la vez: se van primero los menos importantes y más viejos
  while (box.children.length > 2) { const kids = [...box.children].reverse(), drop = kids.find(k => !k.classList.contains('big')) || kids[0]; drop.remove(); }
}
function renderChronicle(){
  const el = $('chron'), f = el.dataset.f || 'all';
  const list = chronicle.filter(c => f === 'all' || c.kind === f).slice(-80).reverse();
  el.querySelector('.cl-list').innerHTML = list.map((c, k) => `<li class="${c.kind}"><span class="d">día ${c.d}</span><span class="txt">${esc(c.text)}</span>${c.target ? `<button data-ci="${chronicle.indexOf(c)}">Ver</button>` : ''}</li>`).join('') || '<li class="empty">Aún no ha pasado nada</li>';
  for (const b of el.querySelectorAll('.cl-f button')) b.classList.toggle('on', b.dataset.f === f);
}

// ---- Coladas de lava vivas: avanzan casilla a casilla, se paran, se enfrían y quedan como roca volcánica ----
let ash = [];
function flowPath(v){
  const { e } = world, path = [], seen = new Set();
  const a = Math.random() * Math.PI * 2, rr = v.r * v.crater + .8;
  let x = Math.round(v.cx + Math.cos(a) * rr), y = Math.round(v.cy + Math.sin(a) * rr), water = -1;
  const len = Math.round(v.r * (.5 + Math.random() * 1.3)) + 2; // cada colada llega hasta donde le toca
  for (let s = 0; s < len; s++) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) break;
    const j = y * W + x;
    if (WATER[world.biome[j]]) { water = j; break; }
    path.push(j); seen.add(j);
    let bx = -1, by = -1, be = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const n = (y + dy) * W + x + dx; if (seen.has(n)) continue;
      const val = e[n] + Math.random() * .006;
      if (val < be) { be = val; bx = x + dx; by = y + dy; }
    }
    if (bx < 0) break;
    x = bx; y = by;
  }
  return { path, head:0, acc:0, speed:.6 + Math.random() * .7, water };
}
function igniteTile(i, v){
  if (world.biome[i] === B.LAVA) return;
  const x = i % W, y = (i / W) | 0;
  if (world.objs[i]) { if (!fallObj(i, true)) addEffect(x * T + 2, y * T + 3, 'poof'); world.objs[i] = null; buildRareList(); } // la lava quema lo que pilla
  world.lavaT[i] = 1; world.volc[i] = 3; world.vid[i] = v.id;
  world.lavaTiles.set(i, { born:performance.now(), v, cool:30 + Math.random() * 25 });
  world.biome[i] = classify(i);
  paintRegion(x - 1, y - 1, x + 1, y + 1); composeRegion(x - 7, y - 11, x + 7, y + 12);
  // La colada puede prender la hierba y los árboles de los lados
  for (const n of nb4i(i)) if (world.biome[n] !== B.LAVA) ignite(n, .12);
}
function solidify(i){
  world.lavaT[i] = 0; world.volc[i] = 2; world.lavaTiles.delete(i);
  world.biome[i] = classify(i);
  const x = i % W, y = (i / W) | 0;
  paintRegion(x - 1, y - 1, x + 1, y + 1);
  if (waveImg) for (let py = y * T - 2; py < y * T + T + 2; py++) for (let px = x * T - 2; px < x * T + T + 2; px++)
    if (px >= 0 && py >= 0 && px < PW && py < PH) waveImg.data[(py * PW + px) * 4 + 3] = 0;
}
function emitAsh(v, n){
  for (let k = 0; k < n && ash.length < 1500; k++)
    ash.push({ x:v.x + (Math.random() - .5) * 8, y:v.y - 4, vx:(Math.random() - .5) * 16, vy:-(10 + Math.random() * 30),
      r:2 + Math.random() * 3, life:0, max:5 + Math.random() * 6, g:30 + Math.random() * 55 | 0 });
}
function updateVolcanoes(dt, t){
  const now = performance.now();
  for (const v of world.volcanoes) {
    v.t -= dt;
    if (v.t <= 0) {
      if (v.state === 'dormido') { v.state = 'activo'; v.t = 10 + Math.random() * 20; }
      else if (v.state === 'activo') {
        if (Math.random() < .55 * Math.min(1.6, disasterF())) {
          v.state = 'erupcion'; v.t = 8 + Math.random() * 10; snd('boom', v.x, v.y, .8);
          // Cada erupción abre coladas nuevas en direcciones al azar y suelta una gran nube de ceniza
          for (let k = 1 + Math.floor(Math.random() * (v.kind === 'escudo' ? 4 : 3)); k > 0; k--) v.flows.push(flowPath(v));
          emitAsh(v, 80);
          if (t - lastNotice > 15000) { lastNotice = t; notify('Un volcán ha entrado en erupción', v); }
        } else { v.state = 'dormido'; v.t = 25 + Math.random() * 40; }
      } else { v.state = 'activo'; v.t = 10 + Math.random() * 15; }
    }
    const target = v.state === 'erupcion' ? 1 : v.state === 'activo' ? .55 : 0;
    v.heat += (target - v.heat) * Math.min(1, dt * .35);
    if (v.state === 'erupcion') {
      if (Math.random() < dt * 12) v.bombs.push({ x:v.x + (Math.random() - .5) * 3, y:v.y - 2, vx:(Math.random() - .5) * 34, vy:-(28 + Math.random() * 38), life:0 });
      if (Math.random() < dt * 14) emitAsh(v, 1);
    }
    for (const b of v.bombs) { b.life += dt; b.vy += 70 * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
    if (v.bombs.length) v.bombs = v.bombs.filter(b => b.life < 1.8);
    for (const f of v.flows) {
      f.acc += dt * f.speed;
      while (f.acc >= 1 && f.head < f.path.length) { f.acc -= 1; igniteTile(f.path[f.head++], v); }
      if (f.head >= f.path.length && f.water >= 0) { addEffect((f.water % W) * T + 2, ((f.water / W) | 0) * T + 3, 'poof'); f.water = -1; } // vapor al tocar el agua
    }
    if (v.flows.length) v.flows = v.flows.filter(f => f.head < f.path.length);
  }
  // Enfriamiento: unos segundos al rojo vivo y después se va cubriendo de costra hasta solidificarse
  for (const [i, L] of world.lavaTiles) {
    const age = (now - L.born) / 1000, temp = age < 6 ? 1 : 1 - (age - 6) / L.cool;
    if (temp <= 0) solidify(i); else world.lavaT[i] = temp;
  }
  for (const p of ash) { p.life += dt; p.x += (p.vx + 5) * dt; p.y += p.vy * dt; p.vy *= 1 - dt * .45; p.r += dt * 2.4; }
  if (ash.length) ash = ash.filter(p => p.life < p.max);
}
