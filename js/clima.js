// World Sim · Clima, tornados y huracanes, placas tectónicas, terremotos y estaciones
// ================= Clima: vientos, nubes, lluvia, nieve, tormentas y rayos =================
// El viento combina una corriente general que gira despacio con borrascas (giran en sentido antihorario,
// atraen las nubes y traen lluvia y tormentas) y anticiclones (giran en sentido horario y disuelven las nubes)
let clouds = [], bolts = [], flash = 0, systems = [], windAng = 0, snowSet = new Set(), snowA = null, floodSet = new Set(), floodA = null;
let groundClear = []; // casillas que se acaban de secar o deshelar: hay que borrar sus píxeles una vez
const isFlooded = i => floodA && floodA[i] > .6;
const LIFT = 46; // las nubes flotan LIFT px por encima de su sombra
const CLOUD_PAL = {
  normal:{ h:'#ffffff', l:'#f1f4f8', g:'#dde3ea', d:'#c3ccd6' },
  rain:  { h:'#dfe4ea', l:'#c7ced8', g:'#aeb7c3', d:'#949eac' },
  storm: { h:'#9aa1ab', l:'#7f8691', g:'#666d78', d:'#4d535d' },
};
function cloudSprites(type, w, h){
  // Margen alrededor para que ninguna mancha se salga del lienzo (si no, la nube queda cortada en recto)
  const mx = Math.ceil(w * .15) + 2, my = Math.ceil(h * .3) + 2;
  const g = grid(Math.ceil(w) + 2 * mx, Math.ceil(h) + 2 * my), rnd = Math.random, blobs = [], n = 3 + Math.floor(w / 14);
  for (let k = 0; k < n; k++) blobs.push({ x:mx + w * (.15 + .7 * k / (n - 1)) + (rnd() - .5) * 4, y:my + h * .62 + (rnd() - .5) * 2, rx:w * (.14 + rnd() * .1), ry:h * (.32 + rnd() * .12) });
  for (let k = 0; k < n - 1; k++) blobs.push({ x:mx + w * (.25 + .5 * rnd()), y:my + h * .42, rx:w * (.12 + rnd() * .1), ry:h * (.3 + rnd() * .15) });
  paintBlobs(g, blobs, rnd);
  const P = CLOUD_PAL[type], body = document.createElement('canvas'), shadow = document.createElement('canvas');
  body.width = shadow.width = g.w; body.height = shadow.height = g.h;
  // Se pinta de golpe con los píxeles (antes, un fillRect por píxel: miles por nube)
  const bx = body.getContext('2d'), sx = shadow.getContext('2d'), bi = bx.createImageData(g.w, g.h), si = sx.createImageData(g.w, g.h), B0 = bi.data, S0 = si.data;
  const rgb = {}; for (const k in P) { const n = parseInt(P[k].slice(1), 16); rgb[k] = [n >> 16, (n >> 8) & 255, n & 255]; }
  let x0 = g.w, x1 = 0, y1 = 0; // contorno real de la nube, para que la lluvia no caiga fuera de ella
  for (let k = 0; k < g.a.length; k++) {
    const ch = g.a[k]; if (ch === '.') continue;
    const x = k % g.w, y = (k / g.w) | 0, c = rgb[ch], o = k * 4;
    B0[o] = c[0]; B0[o + 1] = c[1]; B0[o + 2] = c[2]; B0[o + 3] = 255; S0[o + 3] = 255;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  bx.putImageData(bi, 0, 0); sx.putImageData(si, 0, 0);
  return { body, shadow, x0, x1, y1 };
}
function makeSystem(){
  return { x:Math.random() * PW, y:Math.random() * PH, cyc:Math.random() < .5, r:Math.max(PW, PH) * (.12 + Math.random() * .12),
    s:10 + Math.random() * 10, vx:(Math.random() - .5) * 4, vy:(Math.random() - .5) * 4, age:0, life:70 + Math.random() * 90 };
}
const sysStrength = s => clamp(Math.min(s.age / 10, (s.life - s.age) / 10), 0, 1); // nacen y se apagan poco a poco
function windAt(x, y){
  let vx = Math.cos(windAng) * 5, vy = Math.sin(windAng) * 3.5;
  for (const s of systems) {
    const dx = x - s.x, dy = y - s.y, d2 = dx * dx + dy * dy, R2 = s.r * s.r;
    if (d2 > R2 * 6) continue;
    const d = Math.sqrt(d2) || 1, f = s.s * sysStrength(s) * Math.exp(-d2 / R2) * Math.min(1, d / (s.r * .25));
    const rot = s.cyc ? 1 : -1, inw = s.cyc ? -.35 : .35; // giro + hacia dentro (borrasca) o hacia fuera (anticiclón)
    vx += f * (rot * dy / d + inw * dx / d);
    vy += f * (-rot * dx / d + inw * dy / d);
  }
  // Los huracanes son borrascas muy intensas: arrastran las nubes en espiral hacia su ojo
  for (const s of storms) {
    if (s.type !== 'huracan') continue;
    const dx = x - s.x, dy = y - s.y, d2 = dx * dx + dy * dy, R2 = s.r * s.r * 2.2;
    if (d2 > R2 * 4) continue;
    const d = Math.sqrt(d2) || 1, f = 26 * stormPower(s) * Math.exp(-d2 / R2) * Math.min(1, d / (s.r * .2));
    vx += f * (dy / d - .3 * dx / d); vy += f * (-dx / d - .3 * dy / d);
  }
  return [vx, vy];
}
function pressureAt(x, y){
  let p = 0;
  for (const s of systems) { const dx = x - s.x, dy = y - s.y; p += (s.cyc ? -1 : 1) * sysStrength(s) * Math.exp(-(dx * dx + dy * dy) / (s.r * s.r)); }
  return p;
}
// ---- Nubes con su propia agua (ciclo del agua) ----
// Cada nube lleva una cantidad de agua q. La recoge al pasar sobre agua o suelo húmedo, más con calor
// (evaporación). Al subir el aire (ladera de una montaña a barlovento, borrasca) se enfría y se satura antes:
// llueve y pierde agua. Bajo un anticiclón o sobre un desierto caluroso el aire baja, se seca y la nube se
// deshace. Con mucha agua, calor y aire inestable crece hasta tormenta. Su tamaño y color dependen del agua
const cloudW = q => 85 + Math.min(1.4, q) * 230; // (más grandes: antes se veían pequeñas)
function evapAt(x, y){
  const i = clamp(Math.floor(y / T), 0, H - 1) * W + clamp(Math.floor(x / T), 0, W - 1), b = world.biome[i];
  let m = WATER[b] ? (b <= B.SHALLOW ? 1 : .8) : (soil ? soil[soilCell(i)] * .7 : .3) + (floodA ? floodA[i] * .5 : 0);
  if (b === B.DESERT || b === B.SAND) m *= .3;
  if (WATER[b] && world.ice && world.ice[i] > .5) m *= .15; // el agua helada apenas se evapora
  return m * clamp((tempAt(i) + 5) / 28, 0, 1.3);
}
// Ascenso del aire: la nube va cuesta arriba a favor del viento (0 = llano, 1 = ladera muy empinada)
function liftAt(x, y, wx, wy){
  const i = clamp(Math.floor(y / T), 0, H - 1) * W + clamp(Math.floor(x / T), 0, W - 1);
  const j = clamp(Math.floor((y - wy * 3) / T), 0, H - 1) * W + clamp(Math.floor((x - wx * 3) / T), 0, W - 1);
  return clamp((Math.max(world.e[i], world.sea) - Math.max(world.e[j], world.sea)) * 25, 0, 1);
}
let respriteLeft = 2;
function resprite(c){
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2, w = cloudW(c.q) * (c.type === 'storm' ? 1.25 : 1), sp = cloudSprites(c.type, w, w * c.hr);
  Object.assign(c, { x:cx - sp.body.width / 2, y:cy - sp.body.height / 2, w:sp.body.width, h:sp.body.height, x0:sp.x0, x1:sp.x1, y1:sp.y1, body:sp.body, shadow:sp.shadow, sw:w });
}
function makeCloud(x, y, q){
  if (x == null) {
    if (Math.random() < .3) { // entra por un borde desde el que el viento sopla hacia dentro del mapa
      for (let k = 0; k < 12; k++) {
        const side = Math.floor(Math.random() * 4);
        x = side === 0 ? 0 : side === 1 ? PW : Math.random() * PW; y = side === 2 ? 0 : side === 3 ? PH : Math.random() * PH;
        const [wx, wy] = windAt(x, y), nx = side === 0 ? 1 : side === 1 ? -1 : 0, ny = side === 2 ? 1 : side === 3 ? -1 : 0;
        if (wx * nx + wy * ny > 0) break;
      }
    } else { // nace donde se evapora mucha agua, donde el aire sube por una montaña o en una borrasca
      let best = -1e9;
      for (let k = 0; k < 24; k++) {
        const px = Math.random() * PW, py = Math.random() * PH, [wx, wy] = windAt(px, py);
        const sc = evapAt(px, py) + liftAt(px, py, wx, wy) * 1.5 - pressureAt(px, py) * .8 + Math.random() * .3;
        if (sc > best) { best = sc; x = px; y = py; }
      }
    }
  }
  const c = { x, y, w:0, h:0, q:q ?? .12 + Math.random() * .2, hr:.36 + Math.random() * .16, type:'normal', typeT:0,
    speed:.8 + Math.random() * .5, bolt:1 + Math.random() * 5, alpha:0, dying:false, snow:false, rainOn:false, precip:0 };
  resprite(c);
  return c;
}
// Las nubes iniciales necesitan la temperatura y la humedad del suelo, que se calculan con el clima
function initClimateLite(){ if (!world.baseT || world.baseT.length !== N) initClimate(); }
function initWeather(){
  clouds = []; bolts = []; flash = 0; snowSet = new Set(); snowDirty = new Set(); snowA = new Float32Array(N); wetT = new Float32Array(N).fill(-1e9); windAng = Math.random() * Math.PI * 2;
  floodSet = new Set(); floodA = new Float32Array(N); storms = []; debris = []; scars = [];
  systems = [];
  for (let k = Math.max(2, Math.round(N / 30000)); k > 0; k--) { const s = makeSystem(); s.age = 10 + Math.random() * s.life * .5; systems.push(s); }
  initClimateLite();
  for (let k = Math.round(N / 7000); k > 0; k--) { const c = makeCloud(Math.random() * PW, Math.random() * PH, Math.random() * .9); c.alpha = 1; clouds.push(c); }
}
function strike(c){
  strikeAt(c.x + c.x0 + (c.x1 - c.x0) * (.2 + Math.random() * .6), c.y + c.h * (.4 + Math.random() * .4), c.y - LIFT + c.y1 - 2);
}
function strikeAt(gx, gy, top){
  const pts = [[gx + (Math.random() - .5) * 6, top]];
  for (let s = 1; s <= 7; s++) pts.push([gx + (s < 7 ? (Math.random() - .5) * 8 : 0), top + (gy - top) * s / 7]);
  bolts.push({ pts, life:0, born:performance.now() }); snd('thunder', gx, gy);
  if (Math.random() < .3) nearDisaster('rayo', gx, gy, 14);
  const sx = offX + gx * zoom, sy = offY + gy * zoom;
  // Solo algunos rayos iluminan el cielo (uno de cada cuatro, más o menos)
  if (!reduceMotion && Math.random() < .25 && sx > -60 && sy > -60 && sx < cw + 60 && sy < ch + 60) flash = .1 + Math.random() * .06;
  // Un rayo puede quemar el árbol en el que cae
  const tx = Math.floor(gx / T), ty = Math.floor(gy / T);
  if (tx >= 0 && ty >= 0 && tx < W && ty < H) {
    const i = ty * W + tx;
    if (world.objs[i] && OBJ[world.objs[i].key][1] === 'tree' && Math.random() < .5) { fallObj(i, true); world.objs[i] = null; composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); buildRareList(); }
    addEffect(gx, gy, 'poof');
    // A veces prende fuego (más si cae en un árbol o en hierba seca en verano)
    ignite(i, .45 * Math.min(2, disasterF()), true);
  }
}
// Cuánto cae en una casilla bajo la nube: máximo en el centro, nada fuera del óvalo, con el borde irregular
function footprint(c, tx, ty, gx0, gx1, gy0, gy1){
  const cx = (gx0 + gx1) / 2, cy = (gy0 + gy1) / 2, rx = (gx1 - gx0) / 2 + .5, ry = (gy1 - gy0) / 2 + .5;
  const d = Math.hypot((tx - cx) / rx, (ty - cy) / ry) + (h2(tx, ty, 44) - .5) * .35;
  return clamp((1 - d) * 2, 0, 1);
}
function updateWeather(dt){
  if (!params.weather) return;
  respriteLeft = 2; // (regenerar nubes cuesta: como mucho dos por paso; las demás, en el siguiente)
  windAng += dt * .015;
  for (let k = 0; k < systems.length; k++) {
    const s = systems[k];
    s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.age > s.life) systems[k] = makeSystem();
  }
  for (let k = 0; k < clouds.length; k++) {
    const c = clouds[k], cx = c.x + (c.x0 + c.x1) / 2, cy = c.y + c.h / 2, [wx, wy] = windAt(cx, cy);
    c.x += wx * c.speed * dt; c.y += wy * c.speed * dt;
    // Al salir del mapa o al quedarse sin agua la nube se desvanece y nace otra donde haya humedad
    if (cx < -60 || cy < -60 || cx > PW + 60 || cy > PH + 60) c.dying = true;
    c.alpha = clamp(c.alpha + (c.dying ? -dt * .35 : dt * .3), 0, 1);
    if (c.dying && c.alpha <= 0) { clouds[k] = makeCloud(); continue; }
    if (!c.dying) {
      const ci = clamp(Math.floor(cy / T), 0, H - 1) * W + clamp(Math.floor(cx / T), 0, W - 1);
      const evap = evapAt(cx, cy), lift = liftAt(cx, cy, wx, wy), p = pressureAt(cx, cy), t = tempAt(ci);
      c.q += dt * .014 * evap;                                             // recoge el agua que se evapora debajo
      if (p > .3) c.q -= dt * .03 * (p - .3);                              // anticiclón: el aire baja y la seca
      if (!WATER[world.biome[ci]] && t > 24 && evap < .3) c.q -= dt * .008; // desierto caluroso
      // Se satura antes si el aire sube (montaña, borrasca): entonces llueve y va perdiendo agua
      const sat = .55 - lift * .3 - Math.max(0, -p) * .15;
      c.rainOn = c.q > sat + (c.rainOn ? -.08 : .04);
      if (c.rainOn) c.q -= dt * (.008 + lift * .02 + (c.type === 'storm' ? .012 : 0)) * c.precip;
      c.q = clamp(c.q, 0, 1.6);
      // Su aspecto sigue a su agua: blanca, gris de lluvia o tormenta (con calor y aire inestable)
      const want = c.rainOn && c.q > .95 && t > 16 && (p < 0 || lift > .3) ? 'storm' : c.rainOn || c.q > .6 ? 'rain' : 'normal';
      if (want !== c.type) { if ((c.typeT += dt) > 3) { c.type = want; c.typeT = 0; resprite(c); } }
      else { c.typeT = 0; if (Math.abs(cloudW(c.q) * (c.type === 'storm' ? 1.25 : 1) - c.sw) / c.sw > .35 && respriteLeft-- > 0) resprite(c); } // (regenerar la nube cuesta: solo si cambia mucho)
      if (c.q < .06 && !c.rainOn) c.dying = true;
    }
    c.precip += ((c.rainOn && c.type !== 'normal' ? 1 : 0) - c.precip) * Math.min(1, dt * .5);
    // Nieve o lluvia según la temperatura que haga bajo la nube
    const ti = clamp(Math.floor(cy / T), 0, H - 1) * W + clamp(Math.floor(cx / T), 0, W - 1);
    c.snow = c.type !== 'normal' && tempAt(ti) < 1; // nieva si bajo la nube hace frío; si no, llueve
    if (c.snow && c.alpha > .5 && c.precip > .3) {
      // Rastro de nieve en el suelo bajo la nube
      const gx0 = Math.floor((c.x + c.x0 + 4) / T), gx1 = Math.floor((c.x + c.x1 - 4) / T);
      const gy0 = Math.floor((c.y + c.h * .35) / T), gy1 = Math.floor((c.y + c.y1) / T);
      for (let ty = Math.max(0, gy0); ty <= Math.min(H - 1, gy1); ty++) for (let tx = Math.max(0, gx0); tx <= Math.min(W - 1, gx1); tx++) {
        const i = ty * W + tx;
        if (WATER[world.biome[i]] || world.biome[i] === B.LAVA) continue;
        const fall = footprint(c, tx, ty, gx0, gx1, gy0, gy1); if (fall <= 0) continue;
        wetT[i] = simT;
        if (tempAt(i) < 0) { setSnow(i, Math.min(1, snowA[i] + dt * .4 * fall * c.precip)); snowSet.add(i); } // con más calor no cuaja
      }
    } else if (c.type !== 'normal' && c.alpha > .5 && c.precip > .3) {
      // La lluvia encharca el terreno bajo (cerca del nivel del mar); con tormenta, más deprisa
      const { e, sea } = world, lowSpan = (1 - sea) * .12;
      const gx0 = Math.floor((c.x + c.x0 + 4) / T), gx1 = Math.floor((c.x + c.x1 - 4) / T);
      const gy0 = Math.floor((c.y + c.h * .35) / T), gy1 = Math.floor((c.y + c.y1) / T);
      for (let ty = Math.max(0, gy0); ty <= Math.min(H - 1, gy1); ty++) for (let tx = Math.max(0, gx0); tx <= Math.min(W - 1, gx1); tx++) {
        const i = ty * W + tx;
        if (WATER[world.biome[i]] || world.biome[i] === B.LAVA) continue;
        const fall = footprint(c, tx, ty, gx0, gx1, gy0, gy1); if (fall <= 0) continue;
        wetT[i] = simT; // está lloviendo aquí ahora mismo (apaga incendios)
        if (soilRain) soilRain[soilCell(i)] += dt * fall * c.precip * .0013; // y empapa el suelo
        const low = 1 - clamp((e[i] - sea) / lowSpan, 0, 1);
        if (low <= 0) continue;
        floodA[i] = Math.min(1, floodA[i] + dt * .07 * low * fall * c.precip * (c.type === 'storm' ? 1.7 : 1)); floodSet.add(i);
      }
    }
    if (c.type === 'storm' && c.alpha > .6 && c.precip > .5 && (c.bolt -= dt) <= 0) { c.bolt = 2 + Math.random() * 6; strike(c); }
  }
  // La nieve se derrite poco a poco (algo más de un minuto)
  // El deshielo depende de la temperatura de cada casilla: se hace en updateClimate
  // La tierra absorbe el agua de las inundaciones (un par de minutos)
  // Los charcos se filtran en el suelo y se evaporan: con calor y sequía, mucho más deprisa; con frío, apenas
  for (const i of floodSet) {
    floodA[i] -= dt * (.003 + Math.max(0, tempAt(i)) * .0011 + droughtAt(i) * .012);
    if (floodA[i] <= 0) { floodA[i] = 0; floodSet.delete(i); groundClear.push(i); }
  }
  flash = Math.max(0, flash - dt * 2.5);
}
function drawWeather(t){
  if (!params.weather) return;
  const [x0, y0, x1, y1] = visibleRect(), ts = t / 1000;
  const fade = zoom > 6 ? .45 : zoom > 3 ? .7 : 1; // de cerca las nubes se vuelven más transparentes para ver debajo
  for (const c of clouds) if (c.x + c.w > x0 && c.x < x1 && c.y + c.h > y0 && c.y < y1) {
    vctx.globalAlpha = .18 * c.alpha; vctx.drawImage(c.shadow, Math.round(c.x), Math.round(c.y));
  }
  if (!reduceMotion) for (const c of clouds) {
    if (c.type === 'normal' || c.alpha < .3 || c.precip < .05 || c.x + c.x1 < x0 || c.x + c.x0 > x1) continue;
    // La lluvia cae solo bajo el cuerpo de la nube, desde su borde inferior hasta su sombra
    const cw0 = c.x1 - c.x0, left = c.x + c.x0 + cw0 * .12, width = cw0 * .76;
    const top = c.y - LIFT + c.y1 - 2, span = LIFT + c.h * .6 - c.y1 + 2;
    // De lejos las gotas miden menos de un píxel de pantalla: se pintan menos (se nota igual que llueve)
    const n = Math.round(width * c.h / (c.type === 'storm' ? 14 : 24) * c.precip * Math.min(1, .25 + zoom * .5));
    vctx.globalAlpha = c.alpha;
    if (c.snow) {
      vctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let d = 0; d < n * .8; d++) {
        const ph = (ts * (.25 + h2(d, 3, 31) * .2) + h2(d, 7, 32)) % 1;
        vctx.fillRect(Math.round(left + h2(d, 1, 33) * width + Math.sin(ts * 2 + d) * 2), Math.round(top + ph * span), 1, 1);
      }
    } else {
      vctx.fillStyle = c.type === 'storm' ? 'rgba(170,190,220,.6)' : 'rgba(190,210,235,.55)';
      for (let d = 0; d < n; d++) {
        const ph = (ts * (1.4 + h2(d, 3, 31)) + h2(d, 7, 32)) % 1;
        vctx.fillRect(Math.round(left + h2(d, 1, 33) * width - ph * 3), Math.round(top + ph * span), 1, 3);
      }
    }
  }
  for (const c of clouds) if (c.x + c.w > x0 && c.x < x1 && c.y - LIFT + c.h > y0 && c.y - LIFT < y1) {
    vctx.globalAlpha = params.cloudOp / 100 * fade * c.alpha; vctx.drawImage(c.body, Math.round(c.x), Math.round(c.y - LIFT));
  }
  vctx.globalAlpha = 1;
  drawStorms(t);
  drawDebris();
  // Los rayos se apagan en tiempo real (aunque el juego esté en pausa o sin la capa del clima: antes se quedaban pintados)
  const nowB = performance.now(); if (bolts.length) bolts = bolts.filter(b => nowB - (b.born ?? nowB) < 350);
  for (const b of bolts) {
    const a = 1 - (nowB - (b.born ?? nowB)) / 350;
    vctx.beginPath(); b.pts.forEach(([x, y], k) => k ? vctx.lineTo(x, y) : vctx.moveTo(x, y));
    vctx.strokeStyle = `rgba(180,200,255,${a * .4})`; vctx.lineWidth = 3; vctx.stroke();
    vctx.strokeStyle = `rgba(255,250,210,${a})`; vctx.lineWidth = 1.2; vctx.stroke();
  }
}
// Borrascas (B) y anticiclones (A) como en el mapa del tiempo: zona afectada sombreada, isobaras,
// flechas que giran en el sentido de su viento y la letra en el centro
function drawPressure(t){
  if (!params.weather || !params.pressure) return;
  const near = zoom > 3 ? .55 : 1; // de cerca, más discreto para no tapar el mundo
  for (const s of systems) {
    const k = sysStrength(s) * near; if (k < .05) continue;
    const sx = offX + s.x * zoom, sy = offY + s.y * zoom, R = s.r * zoom;
    if (sx < -R * 1.8 || sy < -R * 1.8 || sx > cw + R * 1.8 || sy > ch + R * 1.8) continue;
    const col = s.cyc ? '235,92,80' : '80,150,240';
    // Zona afectada
    const g = vctx.createRadialGradient(sx, sy, 0, sx, sy, R * 1.6);
    g.addColorStop(0, `rgba(${col},${.26 * k})`); g.addColorStop(.6, `rgba(${col},${.11 * k})`); g.addColorStop(1, `rgba(${col},0)`);
    vctx.fillStyle = g; vctx.beginPath(); vctx.arc(sx, sy, R * 1.6, 0, Math.PI * 2); vctx.fill();
    // Isobaras: anillos algo irregulares, más juntos en las borrascas
    vctx.strokeStyle = `rgba(255,255,255,${.7 * k})`; vctx.lineWidth = 1.6;
    const rings = s.cyc ? [.35, .65, .95, 1.3] : [.5, .95, 1.4];
    for (const f of rings) {
      vctx.beginPath();
      for (let a = 0; a <= 48; a++) {
        const ang = a / 48 * Math.PI * 2, wob = 1 + Math.sin(ang * 3 + s.x * .01 + f * 4) * .06;
        const x = sx + Math.cos(ang) * R * f * wob, y = sy + Math.sin(ang) * R * f * wob * .85;
        a ? vctx.lineTo(x, y) : vctx.moveTo(x, y);
      }
      vctx.stroke();
    }
    // Flechas que circulan por la isobara central
    const dir = s.cyc ? -1 : 1, rr = R * (s.cyc ? .65 : .95);
    vctx.fillStyle = `rgba(${col},${.95 * k})`;
    for (let n = 0; n < 6; n++) {
      const ang = n / 6 * Math.PI * 2 + dir * t / 2500, x = sx + Math.cos(ang) * rr, y = sy + Math.sin(ang) * rr * .85;
      const tx = -Math.sin(ang) * dir, ty = Math.cos(ang) * dir * .85, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const L = Math.max(9, Math.min(16, R * .09));
      vctx.strokeStyle = 'rgba(17,21,26,.7)'; vctx.lineWidth = 1.5;
      vctx.beginPath();
      vctx.moveTo(x + ux * L, y + uy * L);
      vctx.lineTo(x - ux * L * .6 - uy * L * .6, y - uy * L * .6 + ux * L * .6);
      vctx.lineTo(x - ux * L * .6 + uy * L * .6, y - uy * L * .6 - ux * L * .6);
      vctx.closePath(); vctx.stroke(); vctx.fill();
    }
    // Letra central grande
    const fs = Math.round(clamp(R * .35, 22, 54));
    vctx.globalAlpha = Math.min(1, k * 1.2);
    vctx.fillStyle = 'rgba(17,21,26,.8)'; vctx.beginPath(); vctx.arc(sx, sy, fs * .72, 0, Math.PI * 2); vctx.fill();
    vctx.strokeStyle = `rgb(${col})`; vctx.lineWidth = 2; vctx.stroke();
    vctx.font = `600 ${fs}px "Pixelify Sans", monospace`; vctx.textAlign = 'center'; vctx.textBaseline = 'middle';
    vctx.fillStyle = `rgb(${col})`; vctx.fillText(s.cyc ? 'B' : 'A', sx, sy + fs * .06);
    vctx.font = `600 11px "Nunito Sans", sans-serif`; vctx.fillStyle = 'rgba(255,255,255,.9)';
    vctx.fillText(s.cyc ? 'Borrasca' : 'Anticiclón', sx, sy + fs * .72 + 11);
    vctx.globalAlpha = 1;
  }
}
// ================= Fenómenos extremos: tornados, trombas marinas y huracanes =================
// Nacen solos (tornado o tromba bajo una nube de tormenta; huracán en una borrasca fuerte sobre el mar)
// o los desata el jugador desde el menú. Los tornados arrancan árboles y arrastran aldeanos;
// los huracanes inundan la costa, tumban árboles y lanzan rayos. Sobre tierra el huracán se debilita.
let storms = [], rareDirty = false, rareT = 0;
const surfaceWater = (x, y) => !!WATER[world.biome[clamp(Math.floor(y / T), 0, H - 1) * W + clamp(Math.floor(x / T), 0, W - 1)]];
const stormPower = s => clamp(Math.min(s.age / 3, (s.life - s.age) / 4), 0, 1);
function hurricaneSprite(R){
  const S = Math.ceil(R) * 2 + 2, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), D = img.data, cx = S / 2;
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const dx = px - cx, dy = py - cx, r = Math.hypot(dx, dy) / R; if (r > 1) continue;
    const arm = Math.sin(Math.atan2(dy, dx) * 3 - Math.log(r + .02) * 5); // tres brazos en espiral
    let a = (arm * .5 + .5) * (1 - r) * 1.6 + (1 - r) * .5;
    if (r < .09) a = 0; else if (r < .15) a *= .3 + (r - .09) / .06; // el ojo, despejado
    a = clamp(a + (h2(px, py, 50) - .5) * .25, 0, 1);
    if (a < .2) continue;
    const lv = a > .75 ? 246 : a > .5 ? 216 : 184, o = (py * S + px) * 4;
    D[o] = lv; D[o + 1] = lv + 3; D[o + 2] = Math.min(255, lv + 8); D[o + 3] = Math.min(255, a * 300);
  }
  x.putImageData(img, 0, 0);
  return c;
}
function addStorm(type, x, y, natural){
  if (storms.length >= 12) return null;
  // Tamaño de tornados y trombas: muchos pequeños (cuerda) y pocos enormes (cuña). Escala EF de 0 a 5
  const size = .6 + Math.pow(Math.random(), 1.7) * 1.6;
  const s = { type, x, y, vx:0, vy:0, age:0, seed:Math.random() * 100, size, ef:Math.round((size - .6) / 1.6 * 5),
    life:type === 'huracan' ? 70 + Math.random() * 40 : 12 + size * 8 + Math.random() * 10 };
  if (type === 'huracan') {
    // Tamaño muy variable: pequeños y compactos o enormes que cubren media región (pocos)
    s.r = Math.max(50, Math.min(PW, PH) * (.06 + Math.pow(Math.random(), 1.6) * .24)); s.spr = hurricaneSprite(s.r);
    s.shd = document.createElement('canvas'); s.shd.width = s.shd.height = s.spr.width;
    const sx = s.shd.getContext('2d'); sx.drawImage(s.spr, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, s.shd.width, s.shd.height);
  }
  storms.push(s);
  if (natural && (type === 'huracan' || performance.now() - lastNotice > 15000)) {
    lastNotice = performance.now();
    notify(type === 'huracan' ? 'Se ha formado un huracán' : type === 'tornado' ? `Ha aparecido un tornado EF${s.ef}` : 'Ha aparecido una tromba marina', s);
  }
  return s;
}
function uproot(i, tx, ty, burnt){
  if (isBuilding(world.objs[i])) { damageBuilding(i, .35 + Math.random() * .3); return; }
  if (world.objs[i] && world.objs[i].key === 'fire:camp') { const g = villageById(world.objs[i].vid); if (g) g.fireOut = true; return; }
  if (!fallObj(i, burnt)) addEffect(tx * T + 2, ty * T + 3, 'poof'); // los árboles caen; lo demás se deshace
  world.objs[i] = null;
  composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); rareDirty = true;
}
let debris = [], scars = [];
function tornadoEffects(s, dt){
  const p = stormPower(s), tx = Math.floor(s.x / T), ty = Math.floor(s.y / T), R = Math.ceil(s.size * 1.2);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dy * dy > R * R + 1) continue;
    const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x;
    if (world.objs[i] && Math.random() < dt * 1.6 * s.size * p) uproot(i, x, y);
  }
  // Arrastra en espiral a los aldeanos que pilla cerca (más lejos y más fuerte cuanto mayor es)
  const reach = 10 + s.size * 10;
  for (const v of villagers) {
    const ddx = v.x - s.x, ddy = v.y - s.y, d = Math.hypot(ddx, ddy) || 1;
    if (d > reach) continue;
    const f = (1 - d / reach) * 35 * s.size * p * dt, nx = v.x + (ddx / d * .6 - ddy / d) * f, ny = v.y + (ddy / d * .6 + ddx / d) * f;
    if (walkable(nx, ny)) { v.x = nx; v.y = ny; }
    v.path = null;
  }
  // El núcleo arrasa el terreno: arranca todo, escarba un poco y deja tierra removida que tarda en reverdecer
  const C = Math.max(1, Math.round(s.size * .8)), { e, sea, scour, scourT } = world;
  let dirty = false;
  if (p > .4) for (let dy = -C; dy <= C; dy++) for (let dx = -C; dx <= C; dx++) {
    if (dx * dx + dy * dy > C * C) continue;
    const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x, b = world.biome[i];
    if (WATER[b] || b === B.LAVA || b === B.SNOW) continue;
    if (world.objs[i]) uproot(i, x, y);
    scourT.set(i, 70 + Math.random() * 60);
    if (!scour[i]) { scour[i] = 1; e[i] = Math.max(sea + .002, e[i] - .004 * s.size); world.biome[i] = classify(i); dirty = true; }
  }
  if (dirty) paintRegion(tx - C - 2, ty - C - 2, tx + C + 2, ty + C + 2);
  // Rastro de destrucción en el suelo
  if (!s.scar) { s.scar = { pts:[[s.x, s.y]], w:2 + s.size * 4, age:0 }; scars.push(s.scar); }
  const last = s.scar.pts[s.scar.pts.length - 1];
  if (Math.hypot(s.x - last[0], s.y - last[1]) > 3) s.scar.pts.push([s.x, s.y]);
}
function spawnDebris(s, dt){
  const water = s.type === 'tromba', n = dt * 30 * s.size * stormPower(s);
  for (let k = 0; k < n || Math.random() < n - k; k++) {
    if (debris.length > 600) break;
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3 * s.size, sp = 12 + Math.random() * 18 * s.size;
    debris.push({ x:s.x + Math.cos(a) * r, y:s.y + Math.sin(a) * r * .4, z:Math.random() * 4,
      vx:-Math.sin(a) * sp + s.vx, vy:Math.cos(a) * sp * .4 + s.vy, vz:15 + Math.random() * 35 * s.size, life:0,
      col:water ? '235,246,255' : Math.random() < .3 ? '70,110,50' : Math.random() < .5 ? '128,100,66' : '92,74,52', big:!water && Math.random() < .15 });
  }
}
function updateDebris(dt){
  for (const d of debris) { d.life += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.vz -= 55 * dt; }
  if (debris.length) debris = debris.filter(d => d.z > 0 && d.life < 3);
  for (const s of scars) s.age += dt;
  if (scars.length) scars = scars.filter(s => s.age < 60);
}
function drawScars(){
  for (const s of scars) {
    if (s.pts.length < 2) continue;
    vctx.fillStyle = `rgba(92,70,44,${s.age < 40 ? .3 : .3 * (1 - (s.age - 40) / 20)})`;
    const w = Math.max(1, Math.round(s.w));
    for (let k = 1; k < s.pts.length; k++) pxLine(s.pts[k - 1][0], s.pts[k - 1][1], s.pts[k][0], s.pts[k][1], w);
  }
}
function drawDebris(){
  for (const d of debris) {
    vctx.fillStyle = `rgba(${d.col},${Math.min(1, 3 - d.life)})`;
    vctx.fillRect(Math.round(d.x), Math.round(d.y - d.z), d.big ? 2 : 1, d.big ? 2 : 1);
  }
}
function hurricaneEffects(s, dt){
  const p = stormPower(s), { e, sea } = world, lowSpan = (1 - sea) * .15;
  for (let k = 0; k < 30; k++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * s.r * .9;
    const tx = Math.floor((s.x + Math.cos(a) * r) / T), ty = Math.floor((s.y + Math.sin(a) * r * .85) / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
    const i = ty * W + tx, b = world.biome[i];
    if (WATER[b] || b === B.LAVA) continue;
    const low = 1 - clamp((e[i] - sea) / lowSpan, 0, 1);
    if (low > 0) { floodA[i] = Math.min(1, floodA[i] + dt * 8 * low * p); floodSet.add(i); }
    if (world.objs[i] && OBJ[world.objs[i].key][1] === 'tree' && Math.random() < dt * 1.5 * p) uproot(i, tx, ty);
  }
  if (Math.random() < dt * .8 * p) {
    const a = Math.random() * Math.PI * 2, r = s.r * (.3 + Math.random() * .5);
    const gx = s.x + Math.cos(a) * r, gy = s.y + Math.sin(a) * r * .85;
    strikeAt(gx, gy, gy - LIFT - 8);
  }
}
function updateStorms(dt){
  if (!params.weather) return;
  for (const c of clouds) {
    if (c.type !== 'storm' || c.alpha < .8 || c.precip < .5 || Math.random() > dt * .006 * seasonVal('tornado') * disasterF()) continue;
    const gx = c.x + (c.x0 + c.x1) / 2, gy = c.y + c.h * .6;
    if (gx > 0 && gy > 0 && gx < PW && gy < PH) addStorm(surfaceWater(gx, gy) ? 'tromba' : 'tornado', gx, gy, true);
  }
  if (!storms.some(s => s.type === 'huracan')) for (const s of systems) {
    if (s.cyc && sysStrength(s) > .8 && surfaceWater(s.x, s.y) && Math.random() < dt * .003 * seasonVal('hurricane') * disasterF()) { addStorm('huracan', s.x, s.y, true); break; }
  }
  for (const s of storms) {
    s.age += dt;
    const [wx, wy] = windAt(s.x, s.y), water = surfaceWater(s.x, s.y);
    if (s.type === 'huracan') {
      s.vx += (wx * 1.3 - s.vx) * dt * .5; s.vy += (wy * 1.3 - s.vy) * dt * .5;
      if (!water) s.age += dt * 1.5;
      hurricaneEffects(s, dt);
    } else {
      s.vx += (wx * 1.6 + (Math.random() - .5) * 60 - s.vx) * dt; s.vy += (wy * 1.6 + (Math.random() - .5) * 60 - s.vy) * dt;
      if (s.type === 'tornado' && water) s.type = 'tromba'; else if (s.type === 'tromba' && !water) s.type = 'tornado';
      if (s.type === 'tornado') tornadoEffects(s, dt);
      spawnDebris(s, dt);
    }
    s.x = clamp(s.x + s.vx * dt, 0, PW - 1); s.y = clamp(s.y + s.vy * dt, 0, PH - 1);
  }
  if (storms.length) storms = storms.filter(s => s.age < s.life);
  updateDebris(dt);
  // La tierra arrasada vuelve a cubrirse de vegetación con el tiempo
  for (const [i, left] of world.scourT) {
    if (left - dt > 0) { world.scourT.set(i, left - dt); continue; }
    world.scourT.delete(i); world.scour[i] = 0; world.biome[i] = classify(i);
    const x = i % W, y = (i / W) | 0; paintRegion(x - 1, y - 1, x + 1, y + 1);
  }
  rareT += dt;
  if (rareDirty && rareT > 1) { buildRareList(); rareDirty = false; rareT = 0; }
}
function drawStorms(t){
  if (!params.weather) return;
  const ts = t / 1000;
  for (const s of storms) {
    const p = stormPower(s);
    if (s.type === 'huracan') {
      const rot = -ts * .35, half = s.spr.width / 2;
      vctx.save(); vctx.translate(Math.round(s.x), Math.round(s.y)); vctx.rotate(rot);
      vctx.globalAlpha = .22 * p; vctx.drawImage(s.shd, -half, -half); vctx.restore();
      vctx.fillStyle = 'rgba(180,200,230,.5)';
      if (!reduceMotion) for (let d = 0; d < 180; d++) {
        const a = h2(d, 1, 51) * Math.PI * 2 + rot, r = (.15 + .8 * Math.sqrt(h2(d, 2, 52))) * s.r, ph = (ts * 1.6 + h2(d, 3, 53)) % 1;
        vctx.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r - LIFT * (1 - ph)), 1, 3);
      }
      vctx.save(); vctx.translate(Math.round(s.x), Math.round(s.y - LIFT)); vctx.rotate(rot);
      vctx.globalAlpha = clamp(params.cloudOp / 100 + .1, 0, 1) * p; vctx.drawImage(s.spr, -half, -half); vctx.restore();
      vctx.globalAlpha = 1;
    } else {
      // Embudo: los pequeños son una cuerda fina, los grandes una cuña ancha; se cimbrea y al morir se adelgaza.
      // Bandas claras y oscuras que giran, nube madre arriba y remolino de polvo (o espuma) en la base
      const water = s.type === 'tromba', sz = s.size, Hh = 44 + sz * 26, x0 = s.x, y0 = s.y;
      const dying = s.age > s.life - 4, wTop = (10 + sz * 12) * (dying ? .45 + .55 * p : 1), wBot = 1 + sz * 1.6;
      vctx.fillStyle = `rgba(0,0,0,${.22 * p})`; vctx.beginPath(); vctx.ellipse(x0, y0 + 1, 6 + sz * 6, 2 + sz * 2, 0, 0, Math.PI * 2); vctx.fill();
      const steps = Math.round(Hh / 3);
      for (let k = 0; k <= steps; k++) {
        const f = k / steps, y = y0 - f * Hh, w = wBot + (wTop - wBot) * Math.pow(f, sz > 1.4 ? 1.1 : 2.2);
        const x = x0 + Math.sin(ts * 2 + f * 3 + s.seed) * f * (3 + sz * 3) + (dying ? Math.sin(f * 5 + ts * 2) * 6 * (1 - p) : 0);
        const c = water ? [218 - f * 45, 230 - f * 45, 240 - f * 40] : [150 - f * 62, 144 - f * 62, 136 - f * 60];
        vctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(.6 + .3 * (1 - f)) * p})`;
        vctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.max(1, Math.round(w)), 3);
        const ph = ts * (8 + 4 / sz) + k * .7;
        vctx.fillStyle = `rgba(255,255,255,${.3 * p})`; vctx.fillRect(Math.round(x + Math.sin(ph) * w / 2), Math.round(y), 1, 3);
        vctx.fillStyle = `rgba(30,30,36,${.3 * p})`; vctx.fillRect(Math.round(x + Math.sin(ph + 2.4) * w / 2), Math.round(y), 1, 3);
      }
      const cx = x0 + Math.sin(ts * 2 + 3 + s.seed) * (3 + sz * 3);
      vctx.fillStyle = `rgba(70,76,86,${.8 * p})`; vctx.beginPath(); vctx.ellipse(cx, y0 - Hh, wTop * 1.4, 5 + sz * 3, 0, 0, Math.PI * 2); vctx.fill();
      vctx.fillStyle = `rgba(96,102,112,${.6 * p})`; vctx.beginPath(); vctx.ellipse(cx - wTop * .3, y0 - Hh - 3, wTop * .9, 4 + sz * 2, 0, 0, Math.PI * 2); vctx.fill();
      const nb = Math.round(18 + sz * 22);
      for (let j = 0; j < nb; j++) {
        const a = ts * (6 + j % 3) + j * 2.4, r = 3 + (j % 5) * (1.5 + sz), h = (ts * 14 + j * 7) % (8 + sz * 6);
        vctx.fillStyle = water ? `rgba(240,248,255,${.75 * p})` : j % 4 === 0 ? `rgba(70,110,50,${.85 * p})` : `rgba(${120 + j % 3 * 15},${96 + j % 3 * 10},64,${.7 * p})`;
        const sq = j % 6 === 0 ? 2 : 1;
        vctx.fillRect(Math.round(x0 + Math.cos(a) * r), Math.round(y0 - h * .5 + Math.sin(a) * r * .35), sq, sq);
      }
    }
  }
}
// ================= Placas tectónicas y terremotos =================
const plateCv = document.createElement('canvas');
function buildPlateCanvas(){
  plateCv.width = W; plateCv.height = H;
  const x = plateCv.getContext('2d'), img = x.createImageData(W, H), D = img.data;
  const hsl = h => { const f = n => { const k = (n + h / 30) % 12; return .55 - .45 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0) * 255, f(8) * 255, f(4) * 255]; };
  const cols = world.plates.map(p => hsl(p.hue)), BC = [null, [235,70,60], [70,150,240], [240,200,60]];
  for (let i = 0; i < N; i++) {
    const o = i * 4, b = world.pb[i], c = b ? BC[b] : cols[world.plate[i]];
    D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = b ? 235 : 46;
  }
  x.putImageData(img, 0, 0);
}
function drawPlates(){
  if (!params.plates || !world.plates) return;
  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(plateCv, 0, 0, W * T, H * T);
}
// Etiqueta con la magnitud sobre el epicentro mientras dura el temblor
function drawQuakeLabels(){
  vctx.font = '600 14px "Pixelify Sans", monospace'; vctx.textAlign = 'center'; vctx.textBaseline = 'middle';
  for (const q of quakes) {
    const sx = offX + q.x * zoom, sy = offY + q.y * zoom - 22, a = Math.min(1, (3 - q.age) * 1.5);
    if (sx < -60 || sy < -30 || sx > cw + 60 || sy > ch + 30) continue;
    const txt = `M ${q.M.toFixed(1).replace('.', ',')}`, w = vctx.measureText(txt).width + 14;
    vctx.globalAlpha = a;
    vctx.fillStyle = 'rgba(17,21,26,.85)'; vctx.fillRect(sx - w / 2, sy - 10, w, 20);
    vctx.strokeStyle = '#e8743a'; vctx.lineWidth = 1.5; vctx.strokeRect(sx - w / 2, sy - 10, w, 20);
    vctx.fillStyle = '#ffb07a'; vctx.fillText(txt, sx, sy + 1);
  }
  vctx.globalAlpha = 1;
}
function drawPlateArrows(){
  if (!params.plates || !world.plates) return;
  vctx.lineWidth = 3; vctx.lineCap = 'round';
  for (const P of world.plates) {
    const sx = offX + (P.cx * T) * zoom, sy = offY + (P.cy * T) * zoom;
    if (sx < -40 || sy < -40 || sx > cw + 40 || sy > ch + 40) continue;
    const l = Math.hypot(P.vx, P.vy) || 1, ux = P.vx / l, uy = P.vy / l, L = 14 + l * 14;
    vctx.strokeStyle = 'rgba(17,21,26,.85)'; vctx.lineWidth = 5;
    vctx.beginPath(); vctx.moveTo(sx - ux * L, sy - uy * L); vctx.lineTo(sx + ux * L, sy + uy * L); vctx.stroke();
    vctx.strokeStyle = '#fff'; vctx.lineWidth = 2.5;
    vctx.beginPath(); vctx.moveTo(sx - ux * L, sy - uy * L); vctx.lineTo(sx + ux * L, sy + uy * L);
    vctx.lineTo(sx + ux * L - ux * 7 - uy * 5, sy + uy * L - uy * 7 + ux * 5);
    vctx.moveTo(sx + ux * L, sy + uy * L); vctx.lineTo(sx + ux * L - ux * 7 + uy * 5, sy + uy * L - uy * 7 - ux * 5);
    vctx.stroke();
  }
  vctx.lineCap = 'butt';
}
let quakes = [], cracks = [], tsunamis = [], dust = [], shake = 0;
const CRACK_LIFE = 4 * 60; // 4 estaciones = 1 año
function startQuake(x, y, M){
  const r = 30 + (M - 4) * 32;
  quakes.push({ x, y, M, r, age:0, water:surfaceWater(x, y) }); snd('rumble', x, y, M - 4);
  shake = Math.max(shake, (M - 3.5) * 2.4);
  notify(`Terremoto de magnitud ${M.toFixed(1).replace('.', ',')}`, { x, y });
  // Grietas que se abren desde el epicentro y se ramifican; se borran con el tiempo
  const crack = (sx, sy, a, len, w, delay) => {
    let px = sx, py = sy;
    const pts = [[px, py]];
    for (let d = 0; d < len; d += 3) {
      a += (Math.random() - .5) * .7; px += Math.cos(a) * 3; py += Math.sin(a) * 3; pts.push([px, py]);
      if (len > 12 && Math.random() < .12) crack(px, py, a + (Math.random() < .5 ? -1 : 1) * (.6 + Math.random() * .6), len * .4, w * .6, delay + d / 120);
    }
    cracks.push({ pts, born:yearT + delay, w }); // la edad se mide en tiempo del mundo (años)
  };
  const firstCrack = cracks.length;
  for (let n = 2 + Math.floor(Math.random() * 3); n > 0; n--) crack(x, y, Math.random() * Math.PI * 2, r * (.35 + Math.random() * .4), 1 + (M - 4) * .5, 0);
  // Lo que queda encima de una grieta se cae; y si una grieta une tierra con agua, el agua entra por ella
  // y se forma un río nuevo (en sismos de magnitud 6 o más)
  let newRiver = false, bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  for (let c = firstCrack; c < cracks.length; c++) {
    const tiles = [];
    for (const [px, py] of cracks[c].pts) {
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      const i = ty * W + tx;
      if (tiles[tiles.length - 1] !== i) tiles.push(i);
      if (world.objs[i]) uproot(i, tx, ty);
    }
    if (M < 6) continue;
    const wet = i => WATER[world.biome[i]];
    for (let k = 1; k < tiles.length; k++) {
      if (wet(tiles[k]) === wet(tiles[k - 1])) continue;
      // tramo de tierra junto al agua: de la orilla hacia dentro
      const dir = wet(tiles[k]) ? -1 : 1, start = wet(tiles[k]) ? k - 1 : k;
      const len = Math.round(6 + Math.random() * 10);
      for (let s = 0, kk = start; s < len && kk >= 0 && kk < tiles.length; s++, kk += dir) {
        const i = tiles[kk]; if (wet(i) || world.biome[i] === B.LAVA) break;
        const toward = tiles[kk - dir] ?? i; // la casilla siguiente hacia el agua
        const fx = clamp((toward % W) - (i % W), -1, 1), fy = clamp(((toward / W) | 0) - ((i / W) | 0), -1, 1);
        world.river[i] = 1; world.flow[i] = (fx + 1) * 3 + (fy + 1); world.slope[i] = 60;
        world.biome[i] = classify(i); newRiver = true;
        const tx = i % W, ty = (i / W) | 0;
        bx0 = Math.min(bx0, tx); by0 = Math.min(by0, ty); bx1 = Math.max(bx1, tx); by1 = Math.max(by1, ty);
      }
      break;
    }
  }
  if (newRiver) { paintRegion(bx0 - 2, by0 - 2, bx1 + 2, by1 + 2); composeRegion(bx0 - 7, by0 - 11, bx1 + 7, by1 + 12); statsSoon(true); }
  // Polvo que se levanta del suelo y piedras que saltan
  // En tierra se levanta polvo; bajo el agua, burbujas
  for (let k = 0; k < M * 14; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * .8, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * .8;
    dust.push({ x:px, y:py, r:1 + Math.random() * 2, life:-d / 90, max:1.5 + Math.random() * 1.5, water:surfaceWater(px, py) });
  }
  for (let k = 0; k < M * 10 && debris.length < 600; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * r * .5;
    if (surfaceWater(x + Math.cos(a) * d, y + Math.sin(a) * d * .8)) continue; // las piedras solo saltan en tierra
    debris.push({ x:x + Math.cos(a) * d, y:y + Math.sin(a) * d * .8, z:0, vx:(Math.random() - .5) * 20, vy:(Math.random() - .5) * 10,
      vz:15 + Math.random() * 25 * (M - 3) / 3, life:0, col:Math.random() < .5 ? '120,112,104' : '96,78,58', big:Math.random() < .3 });
  }
  // Daños: caen árboles, se desprenden rocas en las laderas, los aldeanos pierden el equilibrio
  const { biome, objs } = world;
  for (let k = 0; k < M * M * 5; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
    const tx = Math.floor((x + Math.cos(a) * d) / T), ty = Math.floor((y + Math.sin(a) * d) / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
    const i = ty * W + tx, f = 1 - d / r;
    if (objs[i] && OBJ[objs[i].key][1] === 'tree' && Math.random() < .45 * f * (M - 3.5) / 4) uproot(i, tx, ty);
    else if (!objs[i] && (biome[i] === B.HILLS || biome[i] === B.ROCK) && Math.random() < .05 * f) {
      if (placeObject(i, 'rock:stone', Math.random)) { addEffect(tx * T + 2, ty * T + 3, 'poof'); composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); }
    }
  }
  for (const v of villagers) if (Math.hypot(v.x - x, v.y - y) < r) { v.path = null; v.wait = .8 + Math.random(); }
  // Un terremoto fuerte en el mar o junto a la costa provoca un tsunami
  // Un sismo de magnitud 5,5 o más con epicentro en el mar o cerca de la costa provoca un tsunami
  if (M >= 5.5) {
    let sea = surfaceWater(x, y);
    for (let k = 0; k < 12 && !sea; k++) sea = surfaceWater(x + Math.cos(k) * r * .4, y + Math.sin(k) * r * .4);
    if (sea) {
      const ts = makeTsunami(x, y, M);
      if (ts) { tsunamis.push(ts); notify(`Terremoto de magnitud ${M.toFixed(1).replace('.', ',')}: ¡alerta de tsunami en la costa!`, { x, y }); }
    }
  }
}
const recede = new Map(); // casillas de mar retiradas por un tsunami → cuánto se ve el fondo (0..1)
function nearLand(tx, ty, R){
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = tx + dx, y = ty + dy;
    if (x >= 0 && y >= 0 && x < W && y < H && !WATER[world.biome[y * W + x]]) return true;
  }
  return false;
}
// Tsunami en el tramo de costa más cercano al epicentro, con su cronología:
//   0 … espera   unos segundos sin que pase nada
//   0–4 s        el mar se retira poco a poco y deja el fondo al aire
//   4–7 s        aparece la ola mar adentro y avanza hacia la costa
//   7–12 s       rompe y entra tierra adentro de forma progresiva, de 3 a 11 casillas (más en llano, menos en cuesta)
// Después el agua se va absorbiendo como cualquier inundación
const nb4 = i => { const x = i % W, out = []; if (x > 0) out.push(i - 1); if (x < W - 1) out.push(i + 1); if (i >= W) out.push(i - W); if (i < N - W) out.push(i + W); return out; };
function makeTsunami(x, y, M){
  const { biome, e, sea, cdist } = world, R = 80 + (M - 5.5) * 120;
  const tx0 = clamp(Math.floor((x - R) / T), 0, W - 1), tx1 = clamp(Math.floor((x + R) / T), 0, W - 1);
  const ty0 = clamp(Math.floor((y - R) / T), 0, H - 1), ty1 = clamp(Math.floor((y + R) / T), 0, H - 1);
  const all = [], dist = (i, px, py) => Math.hypot((i % W) * T + 2 - px, ((i / W) | 0) * T + 2 - py);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const i = ty * W + tx;
    if (WATER[biome[i]] || biome[i] === B.LAVA || dist(i, x, y) > R) continue;
    if (nb4(i).some(n => biome[n] <= B.SHALLOW)) all.push(i);
  }
  if (!all.length) return null;
  // Solo el tramo de costa más cercano al epicentro (más largo cuanto más fuerte es el sismo)
  const c0 = all.reduce((a, b) => dist(b, x, y) < dist(a, x, y) ? b : a), cx0 = (c0 % W) * T + 2, cy0 = ((c0 / W) | 0) * T + 2;
  const seg = 28 + (M - 5.5) * 26, coast = all.filter(i => dist(i, cx0, cy0) <= seg);
  const near = i => dist(i, cx0, cy0) - seg + R; // para limitar la ola a esa zona
  // Distancia a la costa afectada, por el agua (hasta 10 casillas mar adentro)
  const wdist = new Map(), q = [];
  for (const i of coast) for (const n of nb4(i)) if (biome[n] <= B.SHALLOW && !wdist.has(n)) { wdist.set(n, 0); q.push(n); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], d = wdist.get(i); if (d >= 10) continue;
    for (const n of nb4(i)) if (biome[n] <= B.SHALLOW && !wdist.has(n) && near(n) < R + 8) { wdist.set(n, d + 1); q.push(n); }
  }
  // Hasta dónde entra en tierra: solo costa baja y cercana al mar; subir cuesta mucho
  const E = clamp((M - 5) * 6 + 4, 6, 22), land = [], cost = new Map(), lq = [];
  for (const i of coast) { cost.set(i, 0); lq.push(i); }
  for (let h = 0; h < lq.length; h++) {
    const i = lq[h], c = cost.get(i); land.push([i, c]);
    for (const n of nb4(i)) {
      if (cost.has(n) || WATER[biome[n]] || biome[n] === B.LAVA) continue;
      const lh = (e[n] - sea) / (1 - sea);
      if (lh > .35) continue; // la ola no sube a tierras altas
      const nc = c + 1 + Math.max(0, e[n] - e[i]) / (1 - sea) * 22 + lh * 3; // en llano avanza casi una casilla por punto de fuerza
      if (nc <= E) { cost.set(n, nc); lq.push(n); }
    }
  }
  land.sort((a, b) => a[1] - b[1]);
  return { x, y, M, t:0, delay:2.5 + Math.random() * 2, wdist, land, li:0, E, maxD:10 };
}
function updateTsunamis(dt){
  if (!floodA || floodA.length !== N) floodA = new Float32Array(N); // (sin el tiempo activado aún no existía)
  const { objs } = world;
  for (const s of tsunamis) {
    s.t += dt;
    const tt = s.t - s.delay;
    if (tt < 0) continue;
    if (tt < 7) {
      // Retirada del mar: se extiende hacia fuera; cuando llega la ola, el fondo se vuelve a cubrir
      const reach = tt < 4 ? 1 + tt * .6 : 3.4, front = tt < 4 ? Infinity : s.maxD * (1 - (tt - 4) / 3);
      for (const [i, d] of s.wdist) if (d <= 2 && d < reach && d < front) recede.set(i, 1);
    } else {
      const lim = Math.min(1, (tt - 7) / 5) * s.E;
      while (s.li < s.land.length && s.land[s.li][1] <= lim) {
        const [i, c] = s.land[s.li++], tx = i % W, ty = (i / W) | 0, f = 1 - c / s.E;
        floodA[i] = Math.max(floodA[i], .7 + .3 * f); floodSet.add(i);
        // Arrastra casi todo lo que pilla (árboles, rocas, arbustos) y ahoga a los animales
        if (objs[i] && Math.random() < .55 + .4 * f) uproot(i, tx, ty);
        for (const a of animals) if (!a.dead && Math.floor(a.x / T) === tx && Math.floor(a.y / T) === ty && Math.random() < .5 + .5 * f) killAnimal(a, 'tsunami');
        // La primera franja de costa se la come el mar (queda sumergida o como arena)
        if (c < 2.5 && f > .6 && Math.random() < .55) { world.e[i] -= (world.e[i] - world.sea) * (Math.random() < .4 ? 1.15 : .7); (s.eroded ||= []).push(i); }
        if (Math.random() < .55) dust.push({ x:tx * T + Math.random() * T, y:ty * T + Math.random() * T, r:1, life:0, max:.8 + Math.random(), water:true });
        if (f > .5 && Math.random() < .25) debris.push({ x:tx * T + 2, y:ty * T + 2, z:1, vx:(Math.random() - .5) * 30, vy:(Math.random() - .5) * 20, vz:20 + Math.random() * 30, life:0, big:Math.random() < .3, col:Math.random() < .5 ? '96,78,60' : '210,230,245' });
        for (const v of villagers) if (Math.abs(v.x - tx * T) < 6 && Math.abs(v.y - ty * T) < 6) { v.path = null; v.wait = 1; }
      }
    }
  }
  // Al acabar, la costa erosionada se reclasifica y se repinta de una vez
  for (const s of tsunamis) if (s.t - s.delay >= 12 && s.eroded && s.eroded.length) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (const i of s.eroded) {
      world.biome[i] = classify(i); if (WATER[world.biome[i]]) objs[i] = null;
      const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    paintRegion(x0 - 2, y0 - 2, x1 + 2, y1 + 2); composeRegion(x0 - 7, y0 - 11, x1 + 7, y1 + 12); statsSoon(true);
    s.eroded = null;
  }
  if (tsunamis.length) tsunamis = tsunamis.filter(s => s.t - s.delay < 12);
}
// La ola: cresta blanca, cuerpo azul oscuro y espuma detrás, avanzando casilla a casilla hacia la costa
function drawTsunamis(){
  for (const s of tsunamis) {
    const tt = s.t - s.delay;
    if (tt < 3.5 || tt > 7.6) continue;
    const front = tt < 4 ? s.maxD : Math.max(0, s.maxD * (1 - (tt - 4) / 3));
    const a = Math.min(1, (tt - 3.5) * 2) * (tt > 7 ? Math.max(0, 1 - (tt - 7) / .6) : 1);
    for (const [i, d] of s.wdist) {
      const dd = d - front; if (dd < -.5 || dd > 2.5) continue;
      const tx = i % W, ty = (i / W) | 0;
      for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
        const hx = tx * T + px, hy = ty * T + py, hv = h2(hx, hy, 73);
        if (dd < .5) { if (hv < .85) { vctx.fillStyle = `rgba(244,250,255,${a})`; vctx.fillRect(hx, hy, 1, 1); } }
        else if (dd < 1.5) { vctx.fillStyle = hv < .3 ? `rgba(220,240,252,${a * .8})` : `rgba(36,96,168,${a * .6})`; vctx.fillRect(hx, hy, 1, 1); }
        else if (hv < .25) { vctx.fillStyle = `rgba(220,240,252,${a * .5})`; vctx.fillRect(hx, hy, 1, 1); }
      }
    }
  }
}
function updateQuakes(dt){
  if (world.pbList && world.pbList.length && Math.random() < dt * .007 * disasterF()) {
    const i = world.pbList[Math.floor(Math.random() * world.pbList.length)];
    startQuake((i % W) * T + 2, ((i / W) | 0) * T + 2, 4 + Math.pow(Math.random(), 2) * 4 + (world.pb[i] === 1 ? .4 : 0));
  }
  for (const q of quakes) q.age += dt;
  if (quakes.length) quakes = quakes.filter(q => q.age < 3);
  // Las grietas duran unos dos años del mundo: la tierra y la vegetación las van cerrando poco a poco
  if (cracks.length) cracks = cracks.filter(c => yearT - c.born < CRACK_LIFE);
  for (const p of dust) { p.life += dt; if (p.life > 0) { p.r += dt * 4; p.y -= dt * 3; p.x += dt * 2; } }
  if (dust.length) dust = dust.filter(p => p.life < p.max);
  shake = Math.max(0, shake - dt * 3);
  updateTsunamis(dt);
  // El fondo descubierto se vuelve a cubrir en cuanto pasa la ola
  for (const [i, v] of recede) {
    const nv = v - dt * 1.1;
    if (nv > 0) { recede.set(i, nv); continue; }
    recede.delete(i);
    if (waveImg) { const tx = i % W, ty = (i / W) | 0; for (let py = ty * T; py < ty * T + T; py++) for (let px = tx * T; px < tx * T + T; px++) waveImg.data[(py * PW + px) * 4 + 3] = 0; }
  }
}
// Dibujo en píxeles (sin trazos vectoriales) para que encaje con el pixel art del mundo
function pxLine(x0, y0, x1, y1, w){
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = (w - 1) >> 1;
  let err = dx + dy;
  for (;;) {
    vctx.fillRect(x0 - o, y0 - o, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pxRing(cx, cy, rx, ry, w){
  const n = Math.max(16, Math.round(Math.PI * 2 * Math.max(rx, ry)));
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; vctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), w, w); }
}
// Grietas: se dibujan en el suelo, por debajo de árboles y aldeanos. Se abren poco a poco; en tierra,
// fondo oscuro y borde levantado; con los años se estrechan y la hierba las cubre. Bajo el agua, sumergidas
function drawCracks(){
  for (const c of cracks) {
    const age = yearT - c.born;
    if (age < 0) continue;
    // Se va cerrando desde el principio: muy marcada los primeros segundos y cada vez más tenue
    const heal = age < 8 ? 0 : Math.sqrt((age - 8) / (CRACK_LIFE - 8)), a = 1 - heal;
    const n = Math.max(2, Math.round(c.pts.length * Math.min(1, age / .7))), w = Math.max(1, Math.round(c.w * (.4 + .6 * a)));
    for (let k = 1; k < n; k++) {
      const [x0, y0] = c.pts[k - 1], [x1, y1] = c.pts[k];
      const mb = world.biome[clamp(Math.floor((y0 + y1) / 2 / T), 0, H - 1) * W + clamp(Math.floor((x0 + x1) / 2 / T), 0, W - 1)];
      if (mb === B.RIVER || mb === B.LAKE) continue; // donde el agua ha entrado, manda el río
      if (WATER[mb]) {
        vctx.fillStyle = `rgba(12,34,72,${.4 * a})`; pxLine(x0, y0, x1, y1, w);
      } else {
        if (heal < .5) { vctx.fillStyle = `rgba(158,128,96,${(1 - heal * 2) * .55})`; pxLine(x0 + 1, y0 + 1, x1 + 1, y1 + 1, w); }
        vctx.fillStyle = `rgba(${28 + heal * 50 | 0},${18 + heal * 80 | 0},${12 + heal * 30 | 0},${.95 * a + .05})`;
        pxLine(x0, y0, x1, y1, w);
      }
    }
  }
}
function drawQuakes(t){
  for (const p of dust) {
    if (p.life < 0) continue;
    const a = (1 - p.life / p.max) * .5, s = Math.round(p.r);
    if (p.water) { // burbujas que suben a la superficie
      vctx.fillStyle = `rgba(200,232,252,${a * 1.4})`;
      vctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); vctx.fillRect(Math.round(p.x + s), Math.round(p.y - 1), 1, 1);
      continue;
    }
    vctx.fillStyle = `rgba(150,124,92,${a})`;
    vctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 3), s, Math.max(1, s * 2 / 3 | 0));
  }
  for (const q of quakes) {
    // Ondas sísmicas: anillo de 2 px oscuro con un borde claro de 1 px
    for (let k = 0; k < 3; k++) {
      const rr = (q.age * 90 + k * 34) % (q.r * 1.4), a = (1 - rr / (q.r * 1.4)) * (1 - q.age / 3);
      if (rr < 2) continue;
      // En el mar las ondas se ven como ondulaciones del agua
      vctx.fillStyle = q.water ? `rgba(10,40,90,${a * .5})` : `rgba(90,58,30,${a * .6})`; pxRing(q.x, q.y, rr, rr * .7, 2);
      vctx.fillStyle = q.water ? `rgba(200,235,255,${a * .8})` : `rgba(240,190,120,${a * .85})`; pxRing(q.x, q.y - 1, rr + 1, (rr + 1) * .7, 1);
    }
    // Epicentro: cruz de píxeles que parpadea
    const pa = (1 - q.age / 3) * (.6 + .4 * Math.sin(q.age * 14)), x = Math.round(q.x), y = Math.round(q.y);
    vctx.fillStyle = q.water ? `rgba(40,110,190,${pa})` : `rgba(255,110,60,${pa})`; vctx.fillRect(x - 1, y - 2, 3, 5); vctx.fillRect(x - 2, y - 1, 5, 3);
    vctx.fillStyle = q.water ? `rgba(220,245,255,${pa})` : `rgba(255,220,150,${pa})`; vctx.fillRect(x, y, 1, 1);
  }
  drawTsunamis();
}

// ================= Estaciones del año =================
// Cada estación dura un minuto (30 días de 2 s) y cambia el tiempo: más lluvia en primavera y otoño,
// tormentas y huracanes al final del verano y en otoño, nieve y ventiscas en invierno
const SEASON_LEN = 4 * 180; // 4 días de 3 minutos: un año de 16 días (la edad de la gente, los animales y los árboles va aparte, en YEAR)
// Día y noche: un día dura 3 minutos (a velocidad normal), aparte del ritmo de las estaciones; de noche
// oscurece y la gente se va a dormir
const DAY_LEN = 180;
const dayT = () => (yearT % DAY_LEN) / DAY_LEN;
const isNight = () => { const d = dayT(); return d > .52 && d < .97; };
// Jornada laboral (fracción del día): corta, normal o larga según la ley; antes y después, tiempo libre
const shiftOf = g => hasLaw(g, 'jornada_corta') ? [.12, .36] : hasLaw(g, 'jornada_larga') ? [.02, .5] : [.06, .44];
const inShift = g => { if (typeof isFreeDay === 'function' && isFreeDay(g)) return false; const d = dayT(), [a, b] = shiftOf(g); return d >= a && d <= b; }; // (los días libres y los festivos, nada)
const shiftTxt = g => hasLaw(g, 'jornada_corta') ? 'jornada corta: de media mañana a media tarde' : hasLaw(g, 'jornada_larga') ? 'jornada larga: de sol a sol' : 'jornada normal: de la mañana a la tarde';
const darkness = () => { const d = dayT(); return d < .04 ? .22 * (1 - d / .04) : d < .42 ? 0 : d < .54 ? .48 * (d - .42) / .12 : d < .96 ? .48 : .48 - .26 * (d - .96) / .04; };
const dayPart = () => { const d = dayT(); return d < .06 ? 'amanecer' : d < .25 ? 'mañana' : d < .42 ? 'tarde' : d < .54 ? 'atardecer' : 'noche'; };
const SEASONS = [
  { n:'Primavera', dot:'#8fd16a', temp:1,   rain:.42, storm:.1,  tornado:1.6, hurricane:.2, snowT:.05, melt:1.6, tint:[150,220,110,.04] },
  { n:'Verano',    dot:'#f2c94c', temp:10,  rain:.14, storm:.2,  tornado:1.2, hurricane:1.4, snowT:.03, melt:3,   tint:[255,205,90,.07] },
  { n:'Otoño',     dot:'#e07b39', temp:0,   rain:.42, storm:.16, tornado:.6, hurricane:1.3, snowT:.2,  melt:1,   tint:[214,120,40,.11] },
  { n:'Invierno',  dot:'#cfe3f7', temp:-8,  rain:.4,  storm:.08, tornado:.1, hurricane:0,   snowT:.6,  melt:.25, tint:[205,222,255,.15] },
];
let yearT = 0;
function seasonInfo(){
  const st = yearT / SEASON_LEN, i = Math.floor(st) % 4, f = st - Math.floor(st);
  return { i, f, s:SEASONS[i], next:SEASONS[(i + 1) % 4], day:Math.floor(yearT / DAY_LEN) + 1, year:Math.floor(st / 4) + 1 };
}
// Valor de la estación actual, mezclándose con la siguiente en los últimos días
function seasonVal(key){
  const { s, next, f } = seasonInfo(), b = f > .85 ? (f - .85) / .15 : 0;
  return s[key] * (1 - b) + next[key] * b;
}
function drawSeasonTint(){
  const { s, next, f } = seasonInfo(), b = f > .85 ? (f - .85) / .15 : 0;
  const c = s.tint.map((v, k) => v * (1 - b) + next.tint[k] * b);
  vctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3]})`;
  vctx.fillRect(0, 0, PW, PH);
}
function updateSeasonHud(){
  const { s, day, year, f } = seasonInfo(), wd = weekdayIdx(day - 1), txt = `${s.n} · ${weekNames(LANG_COMMON)[wd].toLowerCase() === DAYS_ES[wd] ? DAYS_ES[wd] : `${weekNames(LANG_COMMON)[wd]} (${DAYS_ES[wd]})`}, día ${day} · ${dayPart()} · año ${year}`; // el día de la semana, en la lengua común (calendario.js)
  if ($('seasonTxt').textContent !== txt) { $('seasonTxt').textContent = txt; $('seasonDot').style.background = s.dot; }
  $('seasonBar').style.width = (f * 100).toFixed(1) + '%';
  const g = `${globalT >= 0 ? '+' : '−'}${Math.abs(globalT).toFixed(1).replace('.', ',')} °C · ${globalTarget > globalT + .2 ? 'subiendo' : globalTarget < globalT - .2 ? 'bajando' : 'estable'}`;
  if ($('globalOut').textContent !== g) $('globalOut').textContent = g;
}
