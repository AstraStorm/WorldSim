// World Sim · La aviación: aeródromo y planeadores (no sustituyen a los dirigibles: conviven)
// ================= Aviación =================
// · Nuevo descubrimiento: «la aviación» (combustión + aeronáutica)
// · Un pueblo de 30 o más lo levanta a las afueras: pista, torre, hangar y manga de viento (hierro, madera, piedra y
//   combustible). Tiene uno o dos planeadores (dos si pasa de 70 habitantes)
// · Vuelos: de reconocimiento (cartografía mucho más deprisa que los globos), de correo a un pueblo amigo (mejor relación)
//   y, en guerra, a bombardear (bombas que caen sobre los edificios del enemigo). Los arqueros y mosqueteros les disparan
// · Despegue: carrera por la pista, sube (más grande y con la sombra alejándose) y vuelve a aterrizar. Hélice girando
(() => { if (DISCOVERIES.some(d => d.k === 'aviacion')) return; const i = DISCOVERIES.findIndex(d => d.k === 'combustion');
  DISCOVERIES.splice(i + 1, 0, { k:'aviacion', txt:'la aviación', cost:140, eff:'aeródromos y planeadores: reconocimiento, correo y, en guerra, bombardeos', req:['combustion', 'aeronautica'].filter(k => DISCOVERIES.some(d => d.k === k)) });
  if (typeof SCI_REQ === 'object') SCI_REQ.aviacion = ['combustion', 'aeronautica']; })();
BLD.add('air'); BUILD_DIMS.air = [6, 12]; KIND_DIMS.aerodromo = [6, 12];
OBJ['air:aerodromo'] = ['Aeródromo', 'house', 0];
Object.assign(BLD_DESC, { air:'Aeródromo: pista, torre de control y hangar; de aquí despegan los planeadores' });
Object.assign(BLD_TYPE, { air:'Transporte' });
let planes = [];
const hasAirfield = g => g.airfield != null && world.objs[g.airfield] && world.objs[g.airfield].key === 'air:aerodromo';
const stripOf = g => { const x = (g.airfield % W) * T + 2, y = ((g.airfield / W) | 0) * T + 3; return { x0:x - 18, x1:x + 18, y:y - 22 }; }; // la pista, de lado a lado del aeródromo
let airT = 0;
SYSTEMS.push(dt => {
  if (!world || (airT -= dt) > 0) return; airT = 3;
  for (const g of liveTowns()) {
    if (!knowsSci(g, 'aviacion')) continue;
    if (!hasAirfield(g)) {
      if (popOf(g) < 30 || (g.iron || 0) < 10 || g.wood < 30 || g.stone < 20 || (g.airFail || -1e9) > yearT - DAY_LEN / 3) continue;
      const s = typeof plantSite === 'function' ? farSite(g, 6, 12) : null; if (!s) { g.airFail = yearT; continue; }
      if (clearable(s[0] - 6, s[1] - 12, s[0] + 6, s[1] + 1)) clearSite(g, s[0] - 6, s[1] - 12, s[0] + 6, s[1] + 1);
      if (!tileFree(s[0], s[1]) || buildingClash(s[0], s[1], 'aerodromo')) { g.airFail = yearT; continue; }
      const i = s[1] * W + s[0]; for (let yy = s[1] - 12; yy <= s[1]; yy++) for (let xx = s[0] - 6; xx <= s[0] + 6; xx++) farmMap.delete(yy * W + xx);
      world.objs[i] = { key:'air:aerodromo', v:0, ox:0, oy:0, vid:g.id }; g.airfield = i; g.iron -= 10; g.wood -= 30; g.stone -= 20;
      composeRegion(s[0] - 10, s[1] - 16, s[0] + 10, s[1] + 4); addEffect(s[0] * T + 2, s[1] * T + 3, 'poof'); connect(g, s[0], s[1]);
      notify(`${g.name} inaugura su aeródromo: pista, torre y hangar para sus planeadores`, { x:s[0] * T, y:s[1] * T }); continue;
    }
    // Un vuelo (si hay planeador libre, combustible y buen tiempo)
    const mine = planes.filter(p => p.g === g.id); if (mine.length >= (popOf(g) > 70 ? 2 : 1) || isNight() || (g.planeT || 0) > yearT || ((g.fuel || 0) < 1 && (g.coal || 0) < 2)) continue;
    const m = planeMission(g); if (!m) continue;
    if ((g.fuel || 0) >= 1) g.fuel -= 1; else g.coal -= 2; g.planeT = yearT + 25;
    const st = stripOf(g); planes.push({ g:g.id, m, x:st.x0, y:st.y, alt:0, phase:'pista', t:0, ang:0, hp:1, bombs:m.kind === 'bombardeo' ? 4 : 0 });
    if (!g.planeMsg) { g.planeMsg = true; notify(`¡Despega el primer planeador de ${g.name}!`, { x:st.x0, y:st.y }); }
  }
});
// Un sitio lejos de la ciudad (como la central): reutiliza la búsqueda de la electricidad con otra medida
function farSite(g, hw, hh){
  const towns = liveTowns().filter(q => q !== g), cx = Math.round(g.fx), cy = Math.round(g.fy);
  for (let r = 16; r <= 120; r += 5) for (let k = 0; k < 40; k++) {
    const a2 = k / 40 * Math.PI * 2, x = Math.round(cx + Math.cos(a2) * r), y = Math.round(cy + Math.sin(a2) * r * .85);
    if (x < hw + 4 || y < hh + 4 || x >= W - hw - 4 || y >= H - 4 || towns.some(o => nationOf(o) !== nationOf(g) && Math.hypot(o.fx - x, o.fy - y) < 25)) continue;
    if (!clearable(x - hw, y - hh, x + hw, y + 1) || pathIn(x - hw, y - hh, x + hw, y) || plazaIn(x - hw, y - hh, x + hw, y) || penOverlap(null, x - hw, y - hh, x + hw, y + 1) || buildingClash(x, y, 'aerodromo')) continue;
    return [x, y];
  }
  return null;
}
function planeMission(g){
  const foes = liveTowns().filter(o => o !== g && atWar(g, o) && Math.hypot(o.fx - g.fx, o.fy - g.fy) < 300);
  if (foes.length) { const o = foes[Math.floor(Math.random() * foes.length)]; return { kind:'bombardeo', to:o.id, tx:o.fx * T, ty:o.fy * T }; }
  if (hasPaper(g) && Math.random() < .5) { const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160; return { kind:'reconocimiento', tx:clamp(g.fx + Math.cos(a) * d, 5, W - 5) * T, ty:clamp(g.fy + Math.sin(a) * d, 5, H - 5) * T }; }
  const fr = liveTowns().filter(o => o !== g && (rels.get(relKey(g, o)) || {}).known && !atWar(g, o)); if (!fr.length) return null;
  const o = fr[Math.floor(Math.random() * fr.length)]; return { kind:'correo', to:o.id, tx:o.fx * T, ty:o.fy * T };
}
SYSTEMS.push(dt => {
  if (!planes.length) return;
  for (const p of planes) {
    const g = villageById(p.g); if (!g || !popOf(g) || !hasAirfield(g)) { p.done = true; continue; }
    const st = stripOf(g); p.t += dt;
    if (p.phase === 'pista') { p.x += dt * (10 + p.t * 18); p.ang = 0; if (p.x > st.x0 + 22) p.phase = 'sube'; continue; } // carrera de despegue
    if (p.phase === 'sube' || p.phase === 'ida' || p.phase === 'vuelta') {
      if (p.phase === 'sube') { p.alt = Math.min(30, p.alt + dt * 12); if (p.alt >= 30) p.phase = 'ida'; }
      const [tx, ty] = p.phase === 'vuelta' ? [st.x0 - 30, st.y] : [p.m.tx, p.m.ty], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp = 46 * dt;
      p.ang = Math.atan2(dy, dx);
      if (d > sp) { p.x += dx / d * sp; p.y += dy / d * sp; }
      else if (p.phase === 'vuelta') p.phase = 'aterriza';
      else if (p.phase === 'ida') planeArrive(p, g);
      if (p.m.kind === 'reconocimiento' && Math.random() < dt * 2 && chartMark(chartOf(g), p.x, p.y, 4, Math.min(250, cartoConf(g) + 40))) g.chartVer++;
      if (p.m.kind === 'bombardeo' && p.phase === 'ida' && p.bombs > 0 && d < 60 && Math.random() < dt * 2.5) dropBomb(p, g);
      planeShot(p, g, dt);
      continue;
    }
    if (p.phase === 'aterriza') { p.alt = Math.max(0, p.alt - dt * 14); p.ang = 0; p.x += dt * Math.max(8, 40 - (30 - p.alt) * 1.2); p.y += (st.y - p.y) * Math.min(1, dt * 2); if (p.alt <= 0 && p.x > st.x0 + 28) p.done = true; }
  }
  planes = planes.filter(p => !p.done);
});
function planeArrive(p, g){
  const o = villageById(p.m.to);
  if (p.m.kind === 'correo' && o) { const r = relOf(g, o); r.v = clamp(r.v + 3, -100, 100); if (!g.mailMsg) { g.mailMsg = true; notify(`El planeador de ${g.name} lleva el correo a ${o.name}: las cartas llegan en un momento`, { x:p.x, y:p.y }); } }
  if (p.m.kind === 'reconocimiento' && !g.reconMsg) { g.reconMsg = true; notify(`El planeador de ${g.name} cartografía desde el aire tierras lejanas`, { x:p.x, y:p.y }); }
  p.phase = 'vuelta';
}
// Bombas del planeador: caen donde está y dañan los edificios de alrededor
function dropBomb(p, g){
  p.bombs--; const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  addEffect(p.x, p.y, 'poof'); if (typeof snd === 'function') snd('boom', p.x, p.y, .3);
  const o = villageById(p.m.to); if (!o) return;
  for (const b of buildingsOf(o)) if (world.objs[b] && Math.hypot(b % W - tx, ((b / W) | 0) - ty) < 6) damageBuilding(b, .35);
  for (const v of villagers) if (!v.dead && v.vid === o.id && Math.hypot(v.x - p.x, v.y - p.y) < 14 && Math.random() < .3) killVillager(v, 'guerra');
  if (!p.bombMsg) { p.bombMsg = true; notify(`¡El planeador de ${g.name} bombardea ${o.name}!`, { x:p.x, y:p.y }); }
}
// Los del suelo le disparan (arcos, ballestas, mosquetes)
function planeShot(p, g, dt){
  if (p.alt < 10 || !(p.m.kind === 'bombardeo')) return;
  for (const v of villagers) { if (v.dead || !v.weapon || !isRanged(v.weapon) || !enemyOfVil(v, g) || Math.hypot(v.x - p.x, v.y - p.y) > 40) continue; if (Math.random() < dt * (isGun(v.weapon) ? .35 : .12)) { p.hp -= isGun(v.weapon) ? .25 : .12; if (p.hp <= 0) { p.done = true; addEffect(p.x, p.y, 'poof'); notify(`¡Derriban el planeador de ${g.name}!`, { x:p.x, y:p.y }); return; } } }
}
const enemyOfVil = (v, g) => { const o = villageById(v.vid); return o && o !== g && atWar(o, g); };
// ---- Dibujo ----
const PLANE_DIR = a => { const k = (Math.round(a / (Math.PI / 4)) + 8) % 8; return ['e', 'se', 's', 'so', 'o', 'n', 'n', 'n'][k]; };
function drawPlanes(now){
  const [x0, y0, x1, y1] = visibleRect();
  for (const p of planes) {
    if (p.x < x0 - 30 || p.x > x1 + 30 || p.y < y0 - 60 || p.y > y1 + 30) continue;
    const k = PLANE_DIR(p.ang), s = artFrame(`plane:${k}`); if (!s) continue;
    const sc = .75 + p.alt / 30 * .4, w = s.width * sc, h = s.height * sc, x = p.x, y = p.y - p.alt;
    vctx.fillStyle = `rgba(0,0,0,${.28 - p.alt / 200})`; vctx.beginPath(); vctx.ellipse(p.x + p.alt * .25, p.y + 2, w * .4, 2, 0, 0, Math.PI * 2); vctx.fill(); // la sombra en el suelo
    vctx.drawImage(s, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    // la hélice: un disco que gira delante del morro
    const nose = k === 'e' ? [w / 2, -h / 2] : k === 'o' ? [-w / 2, -h / 2] : k === 's' ? [0, -h * .45] : k === 'se' ? [w * .35, -h * .3] : k === 'so' ? [-w * .35, -h * .3] : null;
    if (nose) { const ph = Math.floor(now / 40) % 3, px = Math.round(x + nose[0]), py = Math.round(y + nose[1]); vctx.fillStyle = 'rgba(70,50,30,.55)'; if (k === 'e' || k === 'o') vctx.fillRect(px, py - 3 + ph, 1, 3); else vctx.fillRect(px - 3 + ph, py, 3, 1); vctx.fillStyle = 'rgba(230,220,200,.35)'; vctx.fillRect(px - 2, py - 2, 4, 4); }
    if (p.hp < .6) chips.push({ x, y:y - h / 2, vx:(Math.random() - .5) * 4, vy:-3, life:0, max:1, col:'rgba(60,60,60,.6)' }); // tocado: echa humo
  }
}
{ const base = drawInstFlags; drawInstFlags = function(t){ base.apply(this, arguments); drawPlanes(performance.now()); }; }
