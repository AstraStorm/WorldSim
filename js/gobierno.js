// World Sim · Modos de juego: modo dios o gobernar tu propia nación
// ================= Menú y modo nación =================
// Al abrir el juego sale un menú: «Modo dios» (mirar el mundo y jugar con él, como siempre) o «Gobierna una nación».
// En el modo nación eliges en el mapa dónde fundar tu tribu (con su nombre) y desde el botón «Gobierno» decides lo que
// decide un gobierno: las leyes, los impuestos, en qué se trabaja más, qué obras se encargan, qué se investiga, la
// guerra y la paz, los diplomáticos, los regalos y los embargos. La gente sigue viviendo a su aire: si lo que haces
// no le gusta, se enfada, protesta, vota en contra o da un golpe. Sin victoria ni derrota: si tu nación cae, puedes
// seguir mirando o fundar otra. world.player = { vid, nid, t0, name, embargo:[ids], peaceT:{}, giftT:{}, dipT:{} }
const playerOn = () => !!(world && world.player);
const playerNat = () => {
  const P = world && world.player; if (!P) return null; const n = villageById(P.nid); if (n && popOf(n) && nationOf(n) === n) return n;
  // Si la capital cambia (o deja de serlo), la nación sigue siendo la del pueblo del jugador, mientras no la haya conquistado otro
  const g = villageById(P.vid), m = g && popOf(g) && nationOf(g); if (!m || !(m === g || m.pOwn || g.pOwn && m.id === P.nid)) return null;
  if (m.id !== P.nid) { m.pLaws ||= [...lawsOf(m)]; m.pIdeo ??= 0; m.pOwn = true; P.nid = m.id; } return m;
};
const isPlayerG = g => { if (!g || !world || !world.player) return false; const n = playerNat(); return !!n && nationOf(g) === n; };
const playerTowns = () => { const n = playerNat(); return n ? villages.filter(o => popOf(o) && nationOf(o) === n) : []; };
const embargoed = (a, b) => { const P = world && world.player; if (!P || !P.embargo || !P.embargo.length) return false; const n = playerNat(); if (!n) return false; const na = nationOf(a), nb = nationOf(b); return (na === n && P.embargo.includes(nb.id)) || (nb === n && P.embargo.includes(na.id)); };
// ---- Prioridades de trabajo (desde chooseJob) ----
const FOCUS = {
  normal:{ ic:'⚖', txt:'Equilibrado', jobs:[] },
  comida:{ ic:'🌾', txt:'Comida', jobs:['sembrar', 'arar', 'cosechar', 'campo', 'pescar', 'barca', 'cazar', 'bayas', 'bayal', 'conservar', 'capturar', 'cercar'] },
  madera:{ ic:'🪵', txt:'Madera', jobs:['talar', 'plantar', 'arboleda'] },
  piedra:{ ic:'🪨', txt:'Piedra y minas', jobs:['picar', 'cantear', 'cantera', 'minar', 'extraer', 'mina'] },
  obras:{ ic:'🏗', txt:'Obras', jobs:['construir', 'ampliar', 'pozo', 'almacen', 'puente', 'mercado', 'molino', 'herreria', 'escuela', 'hospital', 'teatro', 'taberna', 'muelle', 'empedrar', 'granero', 'ahumadero', 'lenera', 'universidad', 'tribunal', 'carcel', 'imprenta', 'banco', 'lonja', 'ayuntamiento', 'reparar'] },
  defensa:{ ic:'🛡', txt:'Defensa', jobs:['muralla', 'torre', 'arma', 'equipar', 'cuartel', 'instruir', 'asedio', 'guardia'] },
  fe:{ ic:'✨', txt:'Fe', jobs:['orar', 'templo', 'altar', 'ofrenda', 'catedral', 'monumento', 'ritual'] },
  saber:{ ic:'📚', txt:'Saber', jobs:['escuela', 'enseñar', 'investigar', 'universidad', 'imprenta', 'clase'] },
};
const BASIC_WORKS = ['granero', 'ahumadero', 'lenera', 'postas'];
const FOCUS_SET = Object.fromEntries(Object.entries(FOCUS).map(([k, F]) => [k, new Set(F.jobs)]));
const focusMul = (g, k) => g.pFocus && g.pFocus !== 'normal' ? (FOCUS_SET[g.pFocus].has(k) ? 2.6 : .8) : 1;
// ---- Obras encargadas: si el jugador encarga algo, el pueblo se pone a ello (y a por el material que falte) ----
{ const base = institutionJobs; institutionJobs = function(v, g, add){
  base.apply(this, arguments);
  const k = g.pOrder; if (!k || !INSTS[k]) return;
  if (hasInst(g, k)) { g.pOrder = null; return; }
  const I = INSTS[k]; if (instAfford(g, I)) add(k, !busyWith(g, k) ? 30 : 0); else for (const [f] of instMissing(g, I)) for (const j of MAT_JOBS[f]) add(j, 9);
}; }
{ const base = institutionArrive; institutionArrive = function(v, g, t){ const r = base.apply(this, arguments); if (g.pOrder === t.k && hasInst(g, t.k)) g.pOrder = null; return r; }; }
// ---- Leyes del jugador ----
const LAW_OPP = [['jornada_corta', 'jornada_larga'], ['impuestos_altos', 'impuestos_bajos'], ['derecho_huelga', 'prohibir_huelgas'], ['lengua_unica', 'plurilinguismo'], ['reforma_lengua', 'pureza_lengua'],
  ['fronteras_abiertas', 'fronteras_cerradas'], ['libertad_religiosa', 'persecucion_religiosa'], ['fe', 'laicidad'], ['proteger_okupas', 'desalojo_okupas'], ['deportaciones', 'regularizacion'], ['paz', 'expansion'], ['segregacion', 'derechos_humanos']];
const lawOpp = l => { for (const [a, b] of LAW_OPP) { if (a === l) return b; if (b === l) return a; } return null; };
const P_LAWS_MAX = 12;
// Quién apoya una ley: lo que le toca (lawNeed) y si va con sus ideas
function lawSupport(g, l){
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && isPlayerG(villageById(u.vid))); if (!ads.length) return .5;
  const S = ads.length > 80 ? ads.filter((u, i) => i % Math.ceil(ads.length / 80) === 0) : ads, lean = LAW_LEAN[l] || 0;
  let yes = 0; for (const u of S) { const s = (typeof lawNeed === 'function' ? lawNeed(u, villageById(u.vid) || g, l) : 0) * .7 + (lean ? .22 - Math.abs((u.ideo || 0) - lean) * .55 : .02 + (Math.random() - .5) * .3); if (s > 0) yes++; /* (sin ideas ni nada que ganar, a medias) */ }
  return yes / S.length;
}
let lawSupC = new Map();
const lawSup = (g, l) => { const c = lawSupC.get(l); if (c && yearT - c.t < 15 && yearT >= c.t) return c.v; const v = lawSupport(g, l); lawSupC.set(l, { t:yearT, v }); return v; };
function setPlayerLaw(l, on, how = 'por decisión del gobierno', angerK = 1){
  const n = playerNat(); if (!n) return; const L = n.pLaws ||= [];
  if (on === L.includes(l)) return;
  const sup = lawSup(n, l), at = { x:n.fx * T, y:n.fy * T };
  if (on) { const o = lawOpp(l); if (o && L.includes(o)) L.splice(L.indexOf(o), 1); L.push(l); } else L.splice(L.indexOf(l), 1);
  n.pIdeo = L.length ? clamp(L.reduce((a, k) => a + (LAW_LEAN[k] || 0), 0) / Math.max(2, L.length) * 1.4, -1, 1) : 0;
  lawSupC.clear();
  const pct = Math.round((on ? sup : 1 - sup) * 100), txt = `En ${n.name} ${on ? 'se aprueba' : 'se deroga'} la ley de «${LAW_TXT[l] || l}» ${how} (la apoya${on ? '' : 'ba'} el ${Math.round(sup * 100)} % de la gente)`;
  lawLog(n, txt); notify(txt, at);
  // Lo que la mayoría no quiere, enfada; lo que pide, calma
  for (const g of playerTowns()) {
    if (pct < 35) { g.anger = Math.min(100, (g.anger || 0) + (35 - pct) * .6 * angerK); if ((g.anger || 0) > 20 && angerK >= 1) g.grief = 'imposicion'; }
    else if (pct > 60) g.anger = Math.max(0, (g.anger || 0) - 6);
  }
}
if (typeof SLOGANS !== 'undefined') { SLOGANS.imposicion = ['¡Esa ley no la queremos!', '¡Que nos pregunten!', '¡Gobierno, escucha!']; SLOGANS.guerra_impuesta = ['¡No a la guerra!', '¡Paz ya!', '¡Ni un soldado más!']; SLOGANS['engaño'] = ['¡Nos mienten!', '¡Queremos la verdad!', '¡Fuera mentirosos!']; }
if (typeof GRIEF_TXT !== 'undefined') { GRIEF_TXT.imposicion = 'las leyes que les impone el gobierno'; GRIEF_TXT.guerra_impuesta = 'una guerra que nadie quería'; }
if (typeof REASON_TXT !== 'undefined') REASON_TXT.gobierno = 'la decisión de su gobierno';
// ---- Impuestos del jugador ----
function setPlayerTax(k, on){
  const n = playerNat(); if (!n) return;
  for (const g of playerTowns().filter(o => o.coin)) { if (on) addTax(g, k, 'por decisión del gobierno'); else dropTax(g, k, 'por decisión del gobierno'); }
}
// ---- Guerra, paz y diplomacia ----
function playerWar(def){
  const att = playerNat(); if (!att || !def) return;
  const D = nationOf(def), r = relOf(att, D); if (r.war || !warReachC(r, att, D)) return;
  const friends = r.v > 10;
  r.war = { att:att.id, def:D.id, reason:'gobierno', start:yearT, raidT:yearT - 40, dead:0 }; breakTreaties(att, D, r); mutualDefense(att, D); warCamp(att, D, r);
  att.danger = D.danger = 120;
  const sol = g0 => villagers.filter(v => !v.dead && v.vid === g0.id && v.weapon).length;
  notify(`¡${att.name} declara la guerra a ${D.name} por decisión de su gobierno! ${att.name} tiene ${sol(att)} soldados y ${popOf(att)} habitantes; ${D.name}, ${sol(D)} soldados y ${popOf(D)} habitantes`, { x:D.fx * T, y:D.fy * T });
  sendNews(att, `${att.name} ha declarado la guerra a ${D.name}`);
  callAllies(att, D);
  if (friends) for (const g of playerTowns()) { g.anger = Math.min(100, (g.anger || 0) + 20); g.grief = 'guerra_impuesta'; }
}
function playerPeace(o){
  const n = playerNat(), P = world.player; if (!n) return;
  const D = nationOf(o), r = warRel(n, D); if (!r || !r.war) return;
  if ((P.peaceT ||= {})[D.id] > yearT) return;
  const days = (yearT - r.war.start) / DAY_LEN, armed = g0 => villagers.filter(v => !v.dead && v.weapon && nationOf(villageById(v.vid) || {}) === g0).length;
  const mine = armed(n), theirs = armed(D), chance = clamp(.12 + days * .07 + (mine > theirs * 1.3 ? .25 : mine < theirs * .7 ? -.1 : .05) + (r.war.dead || 0) * .01, .05, .9);
  if (Math.random() < chance) { const A = villageById(r.war.att), B2 = villageById(r.war.def); makePeace(A || n, B2 || D, r, `a propuesta de ${n.name}`); }
  else { P.peaceT[D.id] = yearT + DAY_LEN * .5; notify(`${D.name} rechaza la paz que le propone ${n.name}: aún cree que puede ganar`, { x:D.fx * T, y:D.fy * T }); }
}
function playerDiplomat(o){ const n = playerNat(), P = world.player; if (!n || ((P.dipT ||= {})[o.id] > yearT)) return; P.dipT[o.id] = yearT + DAY_LEN * .5; sendTraveler('diplomatico', n, nationOf(o)); notify(`${n.name} manda un diplomático a ${nationOf(o).name}`, { x:n.fx * T, y:n.fy * T }); }
const GIFT_FOOD = 25;
function playerGift(o){
  const n = playerNat(), P = world.player; if (!n || n.food < GIFT_FOOD + popOf(n) || ((P.giftT ||= {})[o.id] > yearT)) return;
  const D = nationOf(o), r = relOf(n, D); n.food -= GIFT_FOOD; D.food += GIFT_FOOD; r.v = clamp(r.v + 12, -100, 100); P.giftT[o.id] = yearT + DAY_LEN * .5;
  notify(`${n.name} regala ${GIFT_FOOD} de comida a ${D.name}: la relación mejora`, { x:D.fx * T, y:D.fy * T });
}
function playerEmbargo(o, on){
  const n = playerNat(), P = world.player; if (!n) return; const D = nationOf(o), E = P.embargo ||= [];
  if (on && !E.includes(D.id)) { E.push(D.id); relOf(n, D).v = clamp(relOf(n, D).v - 15, -100, 100); notify(`${n.name} corta el comercio con ${D.name}: ni caravanas ni barcos`, { x:D.fx * T, y:D.fy * T }); }
  else if (!on && E.includes(D.id)) { E.splice(E.indexOf(D.id), 1); notify(`${n.name} levanta el embargo a ${D.name}`, { x:D.fx * T, y:D.fy * T }); }
}
// ---- Fundar la tribu ----
let founding = null; // { name }
function foundOk(tx, ty){
  if (tx < 4 || ty < 4 || tx >= W - 4 || ty >= H - 4) return 'fuera del mapa';
  const i = ty * W + tx; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA) return 'ahí hay agua';
  if (!tileFree(tx, ty)) return 'ahí no se puede construir';
  if (villages.some(g => popOf(g) && Math.hypot(g.fx - tx, g.fy - ty) < 30)) return 'demasiado cerca de otro pueblo';
  if (typeof volcDanger === 'function' && volcDanger(tx, ty, 6)) return 'al pie de un volcán';
  if (!siteRoom(tx, ty)) return 'no hay sitio para un pueblo (muy cerca de otro o sin tierra firme alrededor)';
  return null;
}
// Lo mismo que mira makeVillage: un sitio cerca con tierra seca alrededor y espacio para crecer (se recuerda por casilla)
const siteRoomC = new Map();
function siteRoom(tx, ty){
  const key = ty * W + tx, c = siteRoomC.get(key); if (c && yearT - c.t < 5 && yearT >= c.t) return c.ok;
  const dry = (x, y) => { for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) { const xx = x + a, yy = y + b; if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false; const j = yy * W + xx; if (WATER[world.biome[j]] || world.biome[j] === B.LAVA) return false; } return true; };
  let fi = -1;
  for (let r = 0; r <= 12 && fi < 0; r++) for (let dy = -r; dy <= r && fi < 0; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (!tileFree(x, y) || farmMap.has(y * W + x) || !dry(x, y)) continue; fi = y * W + x; break; }
  const ok = fi >= 0 && townSpace(fi % W, (fi / W) | 0);
  if (siteRoomC.size > 400) siteRoomC.clear(); siteRoomC.set(key, { t:yearT, ok }); return ok;
}
// Consejos sobre el sitio (no impiden fundar)
function foundHint(tx, ty){ const i = ty * W + tx, t = tempAt(i), h = []; if (!freshNear(i, 6)) h.push('lejos del agua dulce'); if (t < 0) h.push('mucho frío'); else if (t > 30) h.push('mucho calor'); return h.length ? h.join(' y ') : 'buen sitio'; }
function foundTribe(tx, ty, name){
  const g = makeVillage(tx, ty); if (!g) return null;
  if (name) { g.name = name.slice(0, 22); g.freshName = false; }
  const r = Math.random;
  for (let n = 0, tries = 0; n < 12 && tries < 500; tries++) {
    const x = g.fx + Math.floor(r() * 9) - 4, y = g.fy + Math.floor(r() * 9) - 4; if (!tileFree(x, y)) continue;
    const v = makeVillager(x, y, r, n < 8 ? 3 + r() * 6 : r() * 2, n < 8 ? (n % 2 ? 'm' : 'h') : undefined); v.vid = g.id; villagers.push(v); n++;
  }
  g.pOwn = true; const n = nationOf(g);
  world.player = { vid:g.id, nid:n.id, t0:yearT, name:g.name, embargo:[], peaceT:{}, giftT:{}, dipT:{} };
  n.pLaws = []; n.pIdeo = 0;
  updateVillagePanel(); centerOn(g.fx * T, g.fy * T, 5);
  notify(`Nace ${g.name}, tu tribu: doce personas y todo por hacer. Desde «Gobierno» decides cómo crece`, { x:g.fx * T, y:g.fy * T });
  govSync(); govOpen('resumen');
  return g;
}
function foundStart(mode){
  if (!world || busy) { setTimeout(() => foundStart(mode), 300); return; }
  founding = { name:'', mode:mode || 'tribu' }; params.tool = 'move'; const col = founding.mode === 'colonia';
  let el = $('foundBar'); if (!el) { el = document.createElement('div'); el.id = 'foundBar'; el.className = 'foundbar'; $('pcard').parentElement.appendChild(el);
    el.addEventListener('click', e => { if (e.target.closest('[data-fcancel]')) { const m = founding && founding.mode; foundEnd(); if (m === 'colonia') govOpen('trabajo'); else menuOpen(); } });
    el.addEventListener('input', e => { if (e.target.id === 'foundName') founding.name = e.target.value; }); }
  el.innerHTML = `<div class="fb-ic">👑</div><div class="fb-t"><b>${col ? 'Elige dónde fundar la colonia' : 'Elige dónde fundar tu tribu'}</b><span>${col ? 'Seis colonos saldrán de tu capital con provisiones. Tiene que ser un sitio al que podáis llegar (por tierra, o por mar si tenéis muelle).' : 'Pulsa en tierra firme, mejor cerca de agua dulce y de bosque. Puedes moverte por el mapa antes de elegir.'}</span></div>
    <label class="fb-name"><span>Nombre</span><input id="foundName" maxlength="22" placeholder="(lo eligen ellos)" autocomplete="off" spellcheck="false"></label><button data-fcancel type="button">${col ? 'Cancelar' : 'Volver al menú'}</button><div class="fb-why" id="foundWhy" aria-live="polite"></div>`;
  el.hidden = false; zoom = Math.max(1.2, Math.min(zoom, 2));
}
function foundEnd(){ founding = null; const el = $('foundBar'); if (el) el.hidden = true; }
// Clic en el mapa mientras se elige sitio (antes que el resto de clics del mapa)
{ let down = null;
  $('view').addEventListener('pointerdown', e => { if (founding) down = { x:e.clientX, y:e.clientY }; }, true);
  $('view').addEventListener('click', e => {
    if (!founding) return; e.stopImmediatePropagation(); e.preventDefault();
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // (era arrastrar el mapa)
    const rc = $('view').getBoundingClientRect(), wx = (e.clientX - rc.left - offX) / zoom, wy = (e.clientY - rc.top - offY) / zoom, tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const why = foundOk(tx, ty) || (founding.mode === 'colonia' ? colonyReach(tx, ty) : null); if (why) { const w = $('foundWhy'); if (w) { w.textContent = `Ahí no: ${why}`; w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); } return; }
    const name = founding.name.trim(), m = founding.mode; foundEnd(); if (m === 'colonia') sendColonists(tx, ty, name); else foundTribe(tx, ty, name);
  }, true);
}
// El círculo donde caería la tribu
{ const base = drawWarIcons; drawWarIcons = function(){
  const r = base.apply(this, arguments);
  if (founding && mouse) {
    const tx = Math.floor((mouse.x - offX) / zoom / T), ty = Math.floor((mouse.y - offY) / zoom / T), why = foundOk(tx, ty), sx = offX + (tx * T + 2) * zoom, sy = offY + (ty * T + 2) * zoom, now = performance.now();
    vctx.strokeStyle = why ? 'rgba(232,90,70,.9)' : `rgba(240,208,112,${.7 + .3 * Math.sin(now / 200)})`; vctx.lineWidth = 2;
    vctx.beginPath(); vctx.arc(sx, sy, 12 * Math.max(1, zoom / 2), 0, Math.PI * 2); vctx.stroke();
    vctx.setLineDash([4, 6]); vctx.beginPath(); vctx.arc(sx, sy, 30 * T * zoom, 0, Math.PI * 2); vctx.stroke(); vctx.setLineDash([]); // (a esta distancia no puede haber otro pueblo)
    vctx.font = '600 12px system-ui, sans-serif'; vctx.textAlign = 'center'; vctx.fillStyle = why ? '#ffb0a0' : '#f8e0a0'; vctx.strokeStyle = 'rgba(10,10,14,.85)'; vctx.lineWidth = 3;
    const t = why ? `✕ ${why}` : `${founding.mode === 'colonia' ? '🏕 Colonia aquí' : '👑 Fundar aquí'} · ${foundHint(tx, ty)}`; vctx.strokeText(t, sx, sy - 18 * Math.max(1, zoom / 2)); vctx.fillText(t, sx, sy - 18 * Math.max(1, zoom / 2)); vctx.textAlign = 'start';
  }
  return r;
}; }
// ---- Colonizar: seis colonos salen de la capital hacia el sitio elegido y fundan allí una provincia ----
const COL_FOOD = 30, COL_WOOD = 15;
function colonyCan(n){
  const adults = villagers.filter(u => !u.dead && !u.away && u.vid === n.id && ageOf(u) >= ADULT_H).length;
  if (travelers.some(t => t.kind === 'colonos' && t.from === n.id)) return 'ya hay colonos de camino';
  if (typeof colonies === 'function' && colonies(n).length >= 4) return 'ya tenéis 4 colonias';
  if (adults < 16) return `hacen falta 16 adultos en ${n.name} (hay ${adults})`;
  if (n.food < COL_FOOD + popOf(n)) return `hace falta comida de sobra (${COL_FOOD} para el viaje)`;
  if (n.wood < COL_WOOD) return `hacen falta ${COL_WOOD} de madera`;
  return null;
}
function colonyReach(tx, ty){
  const n = playerNat(); if (!n) return 'no hay nación';
  if (Math.hypot(tx - n.fx, ty - n.fy) > 220) return 'demasiado lejos';
  if (n.port) return null; // (con muelle, si no hay camino por tierra van en barca)
  try { if (landRoute(n.fx * T + 2, n.fy * T + 9, tx * T + 2, ty * T + 3)) return null; } catch (e) {}
  return 'no hay camino por tierra y no tenéis muelle';
}
function sendColonists(tx, ty, name){
  const n = playerNat(); if (!n || colonyCan(n)) return;
  const goers = villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === n.id && ageOf(u) >= ADULT_H && u !== n.leader && !locked(u) && !(u.task && BUSY_POL.includes(u.task.k))).sort(() => Math.random() - .5).slice(0, 6);
  if (goers.length < 4) { notify(`En ${n.name} no hay bastante gente libre para ir de colonos`, { x:n.fx * T, y:n.fy * T }); return; }
  n.food -= COL_FOOD; n.wood -= COL_WOOD;
  for (const u of goers) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } dismount(u); u.sleep = false; u.task = { k:'viaje' }; u.away = true; }
  const hx = n.fx * T + 2, hy = n.fy * T + 9;
  travelers.push({ kind:'colonos', v:goers[0], crew:goers, from:n.id, to:n.id, x:hx, y:hy, tx:tx * T + 2, ty:ty * T + 3, path:[], sea:false, phase:'ida', dir:1, site:[tx, ty], hx, hy, cname:name || null });
  notify(`De ${n.name} salen ${goers.length} colonos con provisiones${name ? ` a fundar ${name}` : ' a fundar una colonia'}`, { x:n.fx * T, y:n.fy * T });
}
{ const base = foundColony; foundColony = function(t, n){
  // Al llegar, el sitio puede no valer (inundado por la lluvia, alguien ha construido...): buscan otro cerca o esperan un rato
  const [sx, sy] = t.site; siteRoomC.delete(sy * W + sx);
  if (!siteRoom(sx, sy)) {
    let alt = null; for (let r = 3; r <= 30 && !alt; r += 3) for (let k = 0; k < 24 && !alt; k++) { const a = k / 24 * Math.PI * 2, x = Math.round(sx + Math.cos(a) * r), y = Math.round(sy + Math.sin(a) * r); if (x > 4 && y > 4 && x < W - 4 && y < H - 4 && !foundOk(x, y)) alt = [x, y]; }
    if (alt) t.site = alt;
    else if ((t.waitT ??= yearT) > yearT - DAY_LEN * .5) return 'espera';
  }
  const before = villages.length; const r = base.apply(this, arguments);
  const c = villages.length > before ? villages[villages.length - 1] : null;
  if (c && t.cname) { c.name = t.cname.slice(0, 22); c.freshName = false; }
  return r;
}; }
// ---- Régimen: el jugador elige el tipo de gobierno ----
const REG_DESC = { tribu:'Un consejo de jefes y ancianos: sin partidos ni elecciones.', monarquia:'Manda un rey o una reina y la corona pasa a sus hijos. No se vota.', monarquia_parlamentaria:'Hay rey, pero gobierna el parlamento que vota la gente.',
  republica:'La gente vota a sus gobernantes cada poco, entre dos o más partidos.', democracia:'Muchos partidos, parlamento y gobiernos de coalición.', partitocracia:'Se vota, pero los partidos lo controlan todo.',
  oligarquia:'Gobiernan los más ricos: les gustan los impuestos bajos y el comercio.', tecnocracia:'Gobiernan los expertos: escuelas, hospitales y obras.', teocracia:'Gobiernan los sacerdotes en nombre de los dioses.',
  dictadura:'Manda un militar con mano dura: ejército y orden.', socialismo:'Una república que reparte la riqueza y pone la economía en manos del estado.', comunismo:'Partido único: todo es del estado.',
  fascismo:'Partido único, la nación por encima de todo y mano de hierro.', anarquia:'Nadie manda: todo se decide en asambleas.' };
const REG_ORDER = ['tribu', 'monarquia', 'republica', 'oligarquia', 'teocracia', 'dictadura', 'anarquia', 'monarquia_parlamentaria', 'democracia', 'partitocracia', 'tecnocracia', 'socialismo', 'comunismo', 'fascismo'];
function regNeed(n, reg){
  const pop = playerTowns().reduce((a, g) => a + popOf(g), 0), letters = playerTowns().some(g => (g.know || {}).escritura);
  if (reg === 'tribu') return null;
  if (reg === 'anarquia') return pop >= 15 ? null : 'hacen falta 15 habitantes';
  if (pop < 25) return 'hacen falta 25 habitantes';
  if (reg === 'teocracia' && !n.faith) return 'hace falta una religión';
  if (['monarquia', 'republica', 'oligarquia', 'teocracia', 'dictadura'].includes(reg)) return null;
  if (!letters) return 'hace falta la escritura';
  return pop >= 40 ? null : 'hacen falta 40 habitantes';
}
// Cuánta gente lo apoyaría: los que piensan parecido (los regímenes con votaciones gustan a casi todos los de centro)
function regSupport(reg){
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && isPlayerG(villageById(u.vid))); if (!ads.length) return .5;
  const free = ['republica', 'democracia', 'monarquia_parlamentaria', 'partitocracia'].includes(reg), I = REGIME_IDEO[reg] ?? 0;
  return ads.filter(u => free ? Math.abs(u.ideo || 0) < .75 : reg === 'tribu' ? true : Math.abs((u.ideo || 0) - I) < .45).length / ads.length;
}
function setPlayerRegime(reg, how = 'por decisión del gobierno', angerK = 1, force = false){
  const n = playerNat(), P = world.player; if (!n || regimeOf(n) === reg || regNeed(n, reg) || (!force && (P.regT || -1e9) > yearT)) return;
  const sup = regSupport(reg);
  setRegime(n, reg, n.leader && !n.leader.dead ? n.leader : null); P.regT = yearT + DAY_LEN * 3;
  const txt = `${n.name} cambia de régimen ${how}: ahora es ${REGIME_A[reg]} (lo apoya el ${Math.round(sup * 100)} % de la gente)`; notify(txt, { x:n.fx * T, y:n.fy * T }); lawLog(n, txt);
  for (const g of playerTowns()) { g.anger = Math.min(100, (g.anger || 0) + (1 - sup) * 45 * angerK); if (sup < .4 && angerK >= 1) g.grief = 'imposicion'; }
}
function govRegime(n){
  const cur = regimeOf(n), P = world.player, cd = (P.regT || -1e9) > yearT;
  return `<div class="gv-head">${flagOf(n)}<div><h3>${esc(REGIMES[cur] || cur)}</h3><span class="muted">${esc(REG_DESC[cur] || '')}</span></div></div>
    <p class="muted gv-note">Elige cómo se gobierna ${esc(n.name)}. Las leyes las sigues poniendo tú, pero el régimen cambia si hay partidos y elecciones, cómo se reparte el dinero y cómo reacciona la gente. Cambiar a algo que pocos apoyan enfada mucho${cd ? '. Acabáis de cambiar: hay que esperar unos días' : ''}.</p>
    ${typeof cortesBar === 'function' ? cortesBar(n) : ''}<div class="gv-regs">${REG_ORDER.filter(r => REGIMES[r]).map(r => { const need = regNeed(n, r), s = regSupport(r), on = r === cur;
      return `<div class="gv-reg${on ? ' on' : ''}${need ? ' off' : ''}"><b>${esc(REGIMES[r])}</b><span class="muted">${esc(REG_DESC[r] || '')}</span>
        <div class="gv-sup"><span class="gv-meter sm"><i style="width:${Math.round(s * 100)}%;background:${s > .55 ? '#7ab04a' : s > .35 ? '#d8b848' : '#d8583a'}"></i></span><span>lo apoyaría el ${pctTxt(s)}</span></div>
        ${on ? '<span class="gv-cur">★ ahora</span>' : need ? `<span class="gv-miss">${esc(need)}</span>` : `<div class="gv-acts"><button class="gv-btn gold" data-greg="${r}" ${cd ? 'disabled' : ''}>Cambiar</button><button class="gv-btn" data-gref="regimen" data-key="${r}" ${P.ref || (P.refT || -1e9) > yearT ? 'disabled' : ''}>🗳 Referéndum</button></div>`}</div>`; }).join('')}</div>`;
}
// ---- El menú de inicio ----
let menuFresh = true; // (al abrir el juego, el mundo recién creado sirve; luego, cada opción crea uno nuevo)
function menuOpen(){
  let el = $('gameMenu');
  if (!el) {
    el = document.createElement('div'); el.id = 'gameMenu'; el.className = 'gmenu'; document.body.appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      const m = b.dataset.mode;
      if (m === 'seguir') { menuClose(); return; }
      if (m === 'cargar') { menuClose(); $('saveBtn').click(); return; }
      const fresh = menuFresh && !playerOn(); menuClose(); menuFresh = false;
      if (m === 'dios') { if (!fresh) regenerate(true); return; }
      if (m === 'nacion') { if (!fresh) { regenerate(true).then(() => foundStart()); } else foundStart(); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && !menuFresh) menuClose(); });
  }
  const inGame = !menuFresh;
  el.innerHTML = `<div class="gm-card" role="dialog" aria-modal="true" aria-labelledby="gmTitle">
    <div class="gm-logo"><span class="gm-globe">🌍</span><div><h1 id="gmTitle">World Sim</h1><p>Simulador de civilizaciones</p></div></div>
    <div class="gm-modes">
      <button class="gm-mode" data-mode="dios" type="button"><span class="gm-ic">✨</span><b>Modo dios</b><span>Mira cómo nace y crece un mundo, y juega con él: crea vida, desata catástrofes y susurra ideas a la gente.</span><em>${inGame ? 'Mundo nuevo' : 'Empezar'}</em></button>
      <button class="gm-mode gold" data-mode="nacion" type="button"><span class="gm-ic">👑</span><b>Gobierna una nación</b><span>Funda tu tribu donde quieras y gobiérnala: leyes, impuestos, obras, ciencia, guerra y paz. Tu gente vive a su aire… y puede ponerse en tu contra.</span><em>${inGame ? 'Mundo nuevo' : 'Empezar'}</em></button>
    </div>
    <div class="gm-foot">${inGame ? '<button data-mode="seguir" type="button">Seguir jugando</button>' : ''}<button data-mode="cargar" type="button">📂 Cargar partida</button></div></div>`;
  el.hidden = false; const f = el.querySelector('.gm-mode'); if (f) f.focus();
}
function menuClose(){ const el = $('gameMenu'); if (el) el.hidden = true; }
// ---- El panel de gobierno ----
let govTab = 'resumen', govT = 0, govArm = null;
function govSync(){ const b = $('govBtn'); if (b) b.hidden = !playerOn(); if (!playerOn()) { const p = $('govPanel'); if (p) p.hidden = true; } }
function govOpen(tab){ if (tab) govTab = tab; const el = $('govPanel'); if (!el) return; el.hidden = false; govRender(true); }
const flagOf = n => n.flagUrl ? `<img class="gv-fl" src="${n.flagUrl}" alt="">` : `<i class="gv-fl" style="background:rgb(${villageColor(n).join(',')})"></i>`;
const pctTxt = x => `${Math.round(x * 100)} %`;
function govRender(force){
  const el = $('govPanel'); if (!el || el.hidden) return;
  const n = playerNat(), body = el.querySelector('.hp-body');
  let h;
  if (!n) h = `<div class="gv-fallen"><div class="gv-big">🏚</div><h3>Tu nación ha caído</h3><p class="muted">Ya no queda nadie de ${esc(world.player ? world.player.name : 'tu tribu')} gobernando. Puedes seguir mirando el mundo o fundar una tribu nueva.</p>
    <div class="gv-row"><button class="gv-btn gold" data-gact="refundar">👑 Fundar otra tribu</button><button class="gv-btn" data-gact="dios">✨ Seguir en modo dios</button></div></div>`;
  else h = ({ resumen:govSummary, regimen:govRegime, leyes:govLaws, economia:govEconomy, trabajo:govWork, diplomacia:govDiplo })[govTab](n);
  const tabs = [['resumen', '🏛 Resumen'], ['regimen', '👑 Régimen'], ['leyes', '📜 Leyes'], ['economia', '💰 Economía'], ['trabajo', '🏗 Trabajo y obras'], ['diplomacia', '🤝 Diplomacia']];
  const html = `${n ? `<div class="cl-f gv-tabs">${tabs.map(([k, t]) => `<button data-gtab="${k}" class="${govTab === k ? 'on' : ''}">${t}</button>`).join('')}</div>` : ''}<div class="gv">${h}</div>`;
  if (govDragging) return; // (mientras se arrastra una ley, no se repinta: si no, se pierde lo que se lleva)
  if (!force && (el.matches(':hover') && performance.now() - (el._t || 0) < 1200)) return;
  if (body._html !== html) { const top = body.scrollTop; body.innerHTML = html; body._html = html; body.scrollTop = top; el._t = performance.now(); }
}
// Cómo está la gente (la aprobación es su ánimo medio) y qué les preocupa
function govMood(n){
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && nationOf(villageById(u.vid) || {}) === n);
  const S = ads.length > 120 ? ads.filter((u, i) => i % Math.ceil(ads.length / 120) === 0) : ads, bad = new Map(), good = new Map(); let sum = 0;
  for (const u of S) { const m = moodOf(u); sum += m.score; for (const b of m.bad) bad.set(b, (bad.get(b) || 0) + 1); for (const b of m.good) good.set(b, (good.get(b) || 0) + 1); }
  const top = M => [...M.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => [t, c / Math.max(1, S.length)]);
  return { n:ads.length, app:S.length ? sum / S.length / 100 : .5, bad:top(bad), good:top(good) };
}
function govSummary(n){
  const T0 = playerTowns(), M = govMood(n), pop = T0.reduce((a, g) => a + popOf(g), 0), col = moodCol(M.app * 100);
  const sum = f => T0.reduce((a, g) => a + (g[f] || 0), 0), ec = n.coin && typeof ecOf === 'function' ? ecOf(n) : null;
  const wars = [...rels.values()].filter(r => r.war && (r.war.att === n.id || r.war.def === n.id)).map(r => villageById(r.war.att === n.id ? r.war.def : r.war.att)).filter(Boolean);
  const alerts = [];
  for (const g of T0) { if ((g.anger || 0) > 35) alerts.push(`😠 En ${esc(g.name)} la gente está muy enfadada${g.grief && GRIEF_TXT[g.grief] ? ` por ${esc(GRIEF_TXT[g.grief])}` : ''}`); if (g.protestT && yearT - g.protestT < DAY_LEN * .5) alerts.push(`✊ Protestas en ${esc(g.name)}`); if (g.food < popOf(g) * .6) alerts.push(`🍞 En ${esc(g.name)} queda poca comida`); }
  for (const w of wars) alerts.push(`⚔ En guerra con ${esc(nationOf(w).name)}`);
  const goal = typeof sciGoal === 'function' ? sciGoal(n) : null;
  return `<div class="gv-head">${flagOf(n)}<div><h3>${esc(n.name)}</h3><span class="muted">${esc(REGIMES[regimeOf(n)] || regimeOf(n))} · fundada el día ${Math.floor((world.player.t0 || 0) / DAY_LEN) + 1} · ${T0.length} pueblo${T0.length > 1 ? 's' : ''} · ${pop} habitantes</span></div></div>
    <div class="gv-app"><span>Aprobación</span><span class="gv-meter"><i style="width:${Math.round(M.app * 100)}%;background:${col}"></i></span><b style="color:${col}">${Math.round(M.app * 100)} %</b></div>
    <div class="gv-tiles">${[['🍞', 'Comida', sum('food')], ['🪵', 'Madera', sum('wood')], ['🪨', 'Piedra', sum('stone')], ['⛏', 'Hierro', sum('iron')], ['🪙', 'Oro', sum('gold')], ec ? ['💰', 'Tesoro', ec.treas] : ['🔬', 'Ciencia', n.sciTotal || 0]].map(([i, t, v]) => `<div><span>${i} ${t}</span><b>${Math.round(v)}</b></div>`).join('')}</div>
    ${alerts.length ? `<div class="gv-alerts">${alerts.slice(0, 6).map(a => `<div>${a}</div>`).join('')}</div>` : '<div class="gv-ok">Todo tranquilo por ahora.</div>'}
    <div class="gv-2"><div><h4>Lo que más les preocupa</h4>${M.bad.length ? M.bad.map(([t, f]) => `<div class="gv-why bad"><span>${esc(t)}</span><b>${pctTxt(f)}</b></div>`).join('') : '<div class="muted">Nada en especial</div>'}</div>
      <div><h4>Lo que les gusta</h4>${M.good.length ? M.good.map(([t, f]) => `<div class="gv-why good"><span>${esc(t)}</span><b>${pctTxt(f)}</b></div>`).join('') : '<div class="muted">Poca cosa</div>'}</div></div>
    ${typeof hemicycle === 'function' && seatsOf(n) ? `<h4>Parlamento</h4>${hemicycle(n, 360)}` : ''}${typeof pollChart === 'function' && pollChart(n, 360) ? `<h4>Encuestas</h4>${pollChart(n, 360)}` : ''}
    <h4>Ciencia</h4><div class="gv-row">${goal ? `<span>Investigando <b>${esc(capFirst(goal.txt))}</b> · ${Math.round(Math.min(1, (n.research || 0) / goal.cost) * 100)} %</span>` : `<span class="muted">${hasInst(n, 'universidad') ? 'Nada que investigar ahora' : 'Sin universidad apenas se investiga: lo que sepan lo aprenden de otros'}</span>`}<button class="gv-btn" data-gact="ciencia">🔬 Elegir qué investigar</button></div>
    <p class="muted gv-note">Tu gente vive a su aire: tú marcas el rumbo. Si la aprobación cae mucho, habrá protestas e incluso golpes de estado.</p>`;
}
// Las leyes, por bloques (como los ministerios): cada bloque se abre y se cierra, y arriba, las que están en vigor.
// Se puede arrastrar una ley a «En vigor» para aprobarla (o llevarla a las Cortes) y sacarla de ahí para quitarla
const LAW_CATS = [
  ['economia', '💰', 'Economía e impuestos', ['aranceles', 'estatal', 'comercio', 'impuestos_altos', 'impuestos_bajos', 'impuesto_ricos', 'renta_basica', 'loteria', 'prohibir_juego', 'puerto_franco', 'patentes', 'impuesto_carbon', 'impuesto_combustible']],
  ['trabajo', '🔨', 'Trabajo e industria', ['derecho_huelga', 'prohibir_huelgas', 'jornada_corta', 'jornada_larga', 'salario_minimo', 'pensiones', 'mas_festivos', 'trabajos_forzados', 'esclavitud', 'abolicion', 'fomento_industria', 'carbon_estrategico', 'libre_industria', 'nacionalizar_industria', 'nacionalizar_petroleo', 'red_publica']],
  ['vivienda', '🏠', 'Vivienda y ciudad', ['vivienda_publica', 'mercado_vivienda', 'tope_alquiler', 'contratos_alquiler', 'proteger_okupas', 'desalojo_okupas', 'edificacion_altura', 'obras']],
  ['social', '🤝', 'Derechos y sociedad', ['derechos_humanos', 'segregacion', 'matrimonio_igualitario', 'persecucion', 'libertad_prensa', 'censura', 'natalidad', 'proteccion_infancia', 'reparto', 'deporte', 'entradas_gratis']],
  ['salud', '🏥', 'Salud y educación', ['sanidad', 'educacion', 'escolarizacion', 'vacunacion', 'cuarentena', 'ley_seca']],
  ['exterior', '🌍', 'Exterior y fronteras', ['paz', 'expansion', 'fronteras_abiertas', 'fronteras_cerradas', 'control_fronteras', 'deportaciones', 'regularizacion', 'autonomia', 'desarme', 'disuasion']],
  ['seguridad', '🛡', 'Seguridad y ejército', ['fortificacion', 'ejercito', 'servicio_militar', 'orden', 'toque_queda', 'campos_internamiento', 'antiterrorista']],
  ['fe', '✨', 'Religión y lengua', ['fe', 'laicidad', 'libertad_religiosa', 'persecucion_religiosa', 'lengua_unica', 'plurilinguismo', 'reforma_lengua', 'pureza_lengua']],
  ['natura', '🌱', 'Naturaleza y tecnología', ['bosques', 'animales', 'proteccion_aguas', 'aire_limpio', 'neutralidad_red', 'censura_internet', 'proteccion_datos', 'agencia_espacial', 'espacio_privado']],
];
const lawCatOf = l => (LAW_CATS.find(c => c[3].includes(l)) || ['otras'])[0];
const govOpenCats = new Set();
let govDragging = false;
function govLaws(n){
  const L = n.pLaws ||= [], all = Object.keys(LAW_TXT).filter(l => typeof lawAwake !== 'function' || lawAwake(n, l));
  const supCol = s => s > .55 ? '#7ab04a' : s > .35 ? '#d8b848' : '#d8583a';
  const row = l => { const on = L.includes(l), s = lawSup(n, l), lean = LAW_LEAN[l] || 0, opp = lawOpp(l);
    return `<div class="gv-law${on ? ' on' : ''}" draggable="${on ? 'false' : 'true'}" data-dlaw="${l}"><div class="gv-lt"><b>${on ? '✓ ' : ''}${esc(capFirst(LAW_TXT[l] || l))}</b><span class="gv-lean ${lean < -.15 ? 'l' : lean > .15 ? 'r' : 'c'}">${lean < -.15 ? 'izquierda' : lean > .15 ? 'derecha' : 'de centro'}</span>${opp && L.includes(opp) && !on ? `<span class="muted">· quitaría «${esc(LAW_TXT[opp] || opp)}»</span>` : ''}${typeof LAW_DESC !== 'undefined' && LAW_DESC[l] ? `<span class="gv-desc">${esc(capFirst(LAW_DESC[l]))}</span>` : ''}</div>
      <div class="gv-sup"><span class="gv-meter sm"><i style="width:${Math.round(s * 100)}%;background:${supCol(s)}"></i></span><span>la apoya el ${pctTxt(s)}</span></div>
      <div class="gv-acts gv-la">${!on && L.length >= P_LAWS_MAX ? '<span class="gv-miss">ya tienes demasiadas leyes</span>' : typeof lawActions === 'function' ? lawActions(n, l, !on) : `<button class="gv-btn" data-glaw="${l}" data-on="${on ? 0 : 1}">${on ? 'Derogar' : 'Aprobar'}</button>`}</div></div>`; };
  const act = all.filter(l => L.includes(l)), cats = [...LAW_CATS, ['otras', '📁', 'Otras', all.filter(l => lawCatOf(l) === 'otras')]];
  const chips = act.map(l => { const lean = LAW_LEAN[l] || 0; return `<span class="gv-chip" draggable="true" data-dout="${l}" title="${esc(LAW_DESC && LAW_DESC[l] || '')} · Arrástrala fuera para quitarla"><i class="${lean < -.15 ? 'l' : lean > .15 ? 'r' : 'c'}"></i>${esc(capFirst(LAW_TXT[l] || l))}<button data-gquit="${l}" aria-label="Quitar ${esc(LAW_TXT[l] || l)}" title="Quitar">×</button></span>`; }).join('');
  const blocks = cats.map(([k, ic, name, laws]) => { const mine = laws.filter(l => all.includes(l)); if (!mine.length) return '';
    const on = mine.filter(l => L.includes(l)), sorted = [...on, ...mine.filter(l => !L.includes(l)).sort((a, b) => lawSup(n, b) - lawSup(n, a))];
    return `<details class="gv-blk" data-cat="${k}"${govOpenCats.has(k) ? ' open' : ''}><summary><span class="gv-bic">${ic}</span><b>${name}</b><span class="muted">${on.length ? `${on.length} en vigor · ` : ''}${mine.length - on.length} por aprobar</span></summary><div class="gv-blist">${sorted.map(row).join('')}</div></details>`; }).join('');
  return `<p class="muted gv-note">Tú decides las leyes de ${esc(n.name)} (como mucho ${P_LAWS_MAX}). Abre un bloque y arrastra una ley a «En vigor» para aprobarla${hasCortes(n) ? ' (irá a las Cortes)' : ''}; para quitarla, sácala de ahí o pulsa ×. Aprobar lo que la mayoría rechaza enfada a la gente.</p>
    ${typeof cortesBar === 'function' ? cortesBar(n) : ''}
    <div class="gv-vigor" data-drop="on"><div class="gv-vh"><b>En vigor</b><span class="muted">${act.length}/${P_LAWS_MAX}</span></div><div class="gv-chips">${chips || '<span class="muted">Ninguna todavía: arrastra aquí una ley</span>'}</div></div>
    <div class="gv-blks">${blocks}</div>`;
}
// Aprobar o quitar (por decreto o, si hay parlamento, en las Cortes)
function govLawDo(l, on){
  const n = playerNat(); if (!n) return; const L = n.pLaws ||= [];
  if (on === L.includes(l)) return; if (on && L.length >= P_LAWS_MAX) { sysToast(`Ya tienes ${P_LAWS_MAX} leyes: quita alguna antes`); return; }
  if (typeof hasCortes === 'function' && hasCortes(n)) { if (world.player.bill) { sysToast('Ya se debate otra ley en las Cortes'); return; } startBill(l, on); }
  else setPlayerLaw(l, on);
  govRender(true);
}
function govEconomy(n){
  const T0 = playerTowns(), coin = T0.filter(g => g.coin), ec = n.coin && typeof ecOf === 'function' ? ecOf(n) : null;
  let h = `<h4>Mercancías</h4>${typeof goodsUseHtml === 'function' ? goodsUseHtml(n) || '<div class="muted">Aún no producen nada que vender.</div>' : ''}`;
  if (!coin.length) return h + `<h4>Impuestos</h4><div class="muted">Aún no tenéis moneda: con ella llegarán el tesoro, los sueldos y los impuestos.</div>`;
  const has = k => coin.some(g => hasTax(g, k)), ideoAvg = (() => { const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && isPlayerG(villageById(u.vid))); return ads.length ? ads.reduce((a, u) => a + (u.ideo || 0), 0) / ads.length : 0; })();
  h += ec ? `<div class="gv-tiles">${[['💰', 'Tesoro', ec.treas], ['🏦', 'Deuda', ec.debt || 0], ['📈', 'Precio', ec.P || 1]].map(([i, t, v]) => `<div><span>${i} ${t}</span><b>${Math.round(v * (t === 'Precio' ? 10 : 1)) / (t === 'Precio' ? 10 : 1)}</b></div>`).join('')}</div>` : '';
  h += `<h4>Impuestos</h4><p class="muted gv-note">Hay siempre uno sobre lo que tiene cada uno (según el régimen y las leyes de impuestos altos o bajos). Los de guerra y deuda se ponen solos mientras duran. Los demás, los decides tú.</p>`;
  h += Object.entries(TAXES).filter(([k]) => !['guerra', 'deuda'].includes(k)).map(([k, d]) => { const on = has(k), like = 1 - Math.min(1, Math.abs(d.lean - ideoAvg));
    return `<div class="gv-law${on ? ' on' : ''}"><div class="gv-lt"><b>${esc(d.name)}</b><span class="muted">${esc(d.what)}</span></div><div class="gv-sup"><span class="gv-meter sm"><i style="width:${Math.round(like * 100)}%;background:${like > .6 ? '#7ab04a' : like > .4 ? '#d8b848' : '#d8583a'}"></i></span><span>${like > .6 ? 'lo aceptan' : like > .4 ? 'a regañadientes' : 'no lo quieren'}</span></div>
      <button class="gv-btn${on ? '' : ' gold'}" data-gtax="${k}" data-on="${on ? 0 : 1}">${on ? 'Quitar' : 'Crear'}</button></div>`; }).join('');
  h += govBudgetHtml(n);
  return h;
}
// ---- Presupuestos: el jugador reparte el gasto y los publica (en las Cortes si hay parlamento; si no, por decreto) ----
const BUD_LEAN = { admin:.15, obras:-.15, sanidad:-.55, educacion:-.4, ejercito:.6, reparto:-.8, templos:.5, corona:.75 };
const budDraft = n => (n.pBudDraft ||= Object.fromEntries(Object.keys(BUDGET_TXT).map(k => [k, Math.round(((n.pBudget || {}).shares || {})[k] != null ? n.pBudget.shares[k] * 100 : ({ admin:40, obras:25, sanidad:10, educacion:10, ejercito:10, reparto:5, templos:0, corona:0 })[k])])));
const budIdeo = D => { const t = Object.values(D).reduce((a, x) => a + x, 0) || 1; return Object.entries(D).reduce((a, [k, x]) => a + (BUD_LEAN[k] || 0) * x / t, 0) * 1.6; };
function budgetVote(n, D){
  const S = typeof seatsOf === 'function' ? seatsOf(n) : null; if (!S) return null;
  const bi = budIdeo(D), tot = S.reduce((a, b) => a + b, 0); let yes = 0; const vote = n.parties.map((p, k) => Math.abs(p.ideo - bi) < .55 || ((world.player.pacts || {})[k] && world.player.pacts[k].bill === 'presupuestos'));
  vote.forEach((v, k) => { if (v) yes += S[k]; }); return { yes, tot, ok:yes * 2 > tot };
}
function publishBudget(){
  const n = playerNat(); if (!n) return; const D = budDraft(n), t = Object.values(D).reduce((a, x) => a + x, 0); if (t <= 0) return;
  const shares = Object.fromEntries(Object.entries(D).map(([k, x]) => [k, x / t])), day = Math.floor(yearT / DAY_LEN) + 1, at = { x:n.fx * T, y:n.fy * T };
  const v = budgetVote(n, D), list = Object.entries(D).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, x]) => `${BUDGET_TXT[k].toLowerCase()} ${Math.round(x / t * 100)} %`).join(', ');
  if (v && !v.ok) { notify(`Las Cortes de ${n.name} tumban los presupuestos del gobierno (${v.yes} a favor de ${v.tot}): siguen los de antes`, at); world.player.budFail = day; return; }
  n.pBudget = { shares, d:day, how:v ? 'votados' : 'decreto', yes:v ? v.yes : null, tot:v ? v.tot : null };
  for (const g of playerTowns()) if (g.budget) { g.budget.shares = { ...shares }; g.budget.how = v ? 'votados' : 'decreto'; g.budget.d = day; g.budget.voteD = day - 1; g.noBudgetDays = 0; }
  // A la gente le gusta más o menos según sus ideas
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && isPlayerG(villageById(u.vid))), bi = budIdeo(D), like = ads.length ? ads.filter(u => Math.abs((u.ideo || 0) - bi) < .5).length / ads.length : .5;
  for (const g of playerTowns()) g.anger = clamp((g.anger || 0) + (like < .35 ? 10 : like > .6 ? -6 : 0), 0, 100);
  const txt = `${n.name} ${v ? `aprueba en las Cortes (${v.yes} de ${v.tot} escaños)` : 'aprueba por decreto'} sus presupuestos: sobre todo ${list}`; notify(txt, at); lawLog(n, txt);
}
function govBudgetHtml(n){
  if (!budgetOn(n)) return `<h4>Presupuestos</h4><div class="muted">Con moneda y un tesoro, aquí repartirás en qué se gasta el dinero público.</div>`;
  const D = budDraft(n), t = Object.values(D).reduce((a, x) => a + x, 0) || 1, P = n.pBudget, v = budgetVote(n, D), bi = budIdeo(D), b = n.budget || {};
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && isPlayerG(villageById(u.vid))), like = ads.length ? ads.filter(u => Math.abs((u.ideo || 0) - bi) < .5).length / ads.length : .5;
  return `<h4>Presupuestos</h4><p class="muted gv-note">Reparte el gasto público y publícalo${v ? ': irá a votación en las Cortes' : ' (por decreto)'}. Ahora: ${P ? `los tuyos, del día ${P.d}${P.how === 'votados' ? ` (votados ${P.yes}/${P.tot})` : ' (decreto)'}` : `${b.how === 'prorrogados' ? 'prorrogados' : b.how === 'sin' ? 'sin presupuestos' : 'los que salen de tus leyes'}`}.</p>
    <div class="gv-bud">${Object.keys(BUDGET_TXT).map(k => `<label class="gv-bk"><span>${esc(BUDGET_TXT[k])}</span><input type="range" min="0" max="100" step="5" value="${D[k] || 0}" data-gbud="${k}" aria-label="${esc(BUDGET_TXT[k])}"><b>${Math.round((D[k] || 0) / t * 100)} %</b></label>`).join('')}</div>
    <div class="gv-row gv-budf"><span>Es un presupuesto ${bi < -.25 ? 'de izquierdas' : bi > .25 ? 'de derechas' : 'de centro'} · le gusta al <b style="color:${like > .55 ? '#a8d890' : like > .35 ? '#e8d080' : '#f0a890'}">${pctTxt(like)}</b> de la gente${v ? ` · en las Cortes saldría <b class="${v.ok ? 'gv-okk' : 'gv-miss'}">${v.yes}/${v.tot}</b>` : ''}</span>
      <button class="gv-btn gold" data-gact="presupuestos">📢 Publicar presupuestos</button></div>`;
}
// En tu nación, el reparto que has publicado
{ const base = budgetShares; budgetShares = function(g){ const n = nationOf(g); if (typeof isPlayerG === 'function' && isPlayerG(g) && n.pBudget) return { ...n.pBudget.shares }; return base.apply(this, arguments); }; }
function govWork(n){
  const T0 = playerTowns(), cur = T0[0] && T0[0].pFocus || 'normal', sel = T0.find(g => g.id === govWork.vid) || n;
  let h = `<h4>En qué se trabaja más</h4><p class="muted gv-note">La gente sigue eligiendo sus tareas, pero hará mucho más de lo que marques (en todos tus pueblos).</p>
    <div class="gv-focus">${Object.entries(FOCUS).map(([k, F]) => `<button data-gfocus="${k}" class="${cur === k ? 'on' : ''}" aria-pressed="${cur === k}"><span>${F.ic}</span>${F.txt}</button>`).join('')}</div>`;
  const cc = colonyCan(n), cols = typeof colonies === 'function' ? colonies(n) : [];
  h += `<h4>Colonizar</h4><div class="gv-law"><div class="gv-lt"><b>Fundar una colonia</b><span class="muted">Seis colonos salen de ${esc(n.name)} con ${COL_FOOD} de comida y ${COL_WOOD} de madera y fundan una provincia donde elijas.${cols.length ? ` Colonias: ${cols.map(c => esc(c.name)).join(', ')}.` : ''}</span></div>
    <div class="gv-sup">${cc ? `<span class="gv-miss">${esc(cc)}</span>` : '<span class="gv-okk">podéis</span>'}</div><button class="gv-btn gold" data-gact="colonia" ${cc ? 'disabled' : ''}>🏕 Elegir sitio</button></div>`;
  const rows = Object.entries(INSTS).filter(([k, I]) => !hasInst(sel, k) && k !== 'consejo' && (I.want(sel) || (BASIC_WORKS.includes(k) && popOf(sel) >= 8))); // (solo lo que ya tiene sentido allí)
  h += `<h4>Encargar obras</h4>${T0.length > 1 ? `<select class="wh-sel gv-town" aria-label="Pueblo">${T0.map(g => `<option value="${g.id}"${g === sel ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>` : ''}
    <p class="muted gv-note">Lo encargado pasa delante de todo: si falta material, la gente sale a por él.</p>`;
  h += rows.map(([k, I]) => { const miss = instMissing(sel, I), ord = sel.pOrder === k, want = I.want(sel);
    return `<div class="gv-law${ord ? ' on' : ''}"><div class="gv-lt"><b>${esc(capFirst(I.name))}</b><span class="muted">${esc(I.why)}${want ? '' : ' · ellos aún no lo pedirían'}</span></div>
      <div class="gv-sup"><span>${['wood', 'stone', 'iron', 'gold'].filter(f => I[f]).map(f => `${{ wood:'🪵', stone:'🪨', iron:'⛏', gold:'🪙' }[f]} ${I[f]}`).join(' ')}</span>${miss.length ? `<span class="gv-miss">falta ${miss.map(m => `${Math.ceil(m[2])} de ${m[1]}`).join(', ')}</span>` : '<span class="gv-okk">hay material</span>'}</div>
      <button class="gv-btn${ord ? '' : ' gold'}" data-gorder="${k}" data-vid="${sel.id}">${ord ? 'Cancelar' : 'Encargar'}</button></div>`; }).join('') || '<div class="muted">Ahora mismo no hay nada que encargar aquí: con más gente, escritura o moneda irán saliendo más obras.</div>';
  return h;
}
function govDiplo(n){
  const P = world.player, mine = playerTowns(), others = villages.filter(o => popOf(o) && nationOf(o) === o && o !== n && mine.some(g => relOf(g, o).known || villages.some(x => nationOf(x) === o && relOf(g, x).known)));
  if (!others.length) return `<div class="muted gv-note">Aún no conocéis a ninguna otra nación. Se conocen al encontrarse los viajeros, o con mapas de cartógrafos que lleguen lejos.</div>`;
  return `<p class="muted gv-note">Las naciones que conocéis. Para declarar la guerra hace falta poder llegar hasta ellas (por tierra, o por mar con muelle y ruta en el mapa).</p>` + others.sort((a, b) => relOf(n, a).v - relOf(n, b).v).map(o => {
    const r = relOf(n, o), wr = warRel(n, o), war = wr && wr.war, reach = warReachC(r, n, o), emb = (P.embargo || []).includes(o.id), v = Math.round(r.v);
    const armed = g0 => villagers.filter(u => !u.dead && u.weapon && nationOf(villageById(u.vid) || {}) === g0).length;
    const arm = govArm === `w${o.id}`, cdP = (P.peaceT || {})[o.id] > yearT, cdD = (P.dipT || {})[o.id] > yearT, cdG = (P.giftT || {})[o.id] > yearT;
    return `<div class="gv-nat${war ? ' war' : ''}"><div class="gv-nh">${flagOf(o)}<div><b>${esc(o.name)}</b><span class="muted">${esc(REGIMES[regimeOf(o)] || regimeOf(o))} · ${villages.filter(x => popOf(x) && nationOf(x) === o).reduce((a, x) => a + popOf(x), 0)} hab. · ${armed(o)} armados (tú, ${armed(n)})</span></div>
      <span class="gv-rel ${war ? 'war' : v > 20 ? 'good' : v < -20 ? 'bad' : ''}">${war ? '⚔ en guerra' : esc(relWord(r))}</span></div>
      <div class="gv-relbar"><i style="left:${(v + 100) / 2}%"></i></div>
      <div class="gv-acts">${war ? `<button class="gv-btn gold" data-gdip="paz" data-id="${o.id}" ${cdP ? 'disabled title="Acaban de rechazarla"' : ''}>🕊 Proponer la paz</button>`
        : `<button class="gv-btn danger${arm ? ' armed' : ''}" data-gdip="guerra" data-id="${o.id}" ${reach ? '' : 'disabled title="No podéis llegar hasta allí"'}>${arm ? '⚔ ¿Seguro? Pulsa otra vez' : '⚔ Declarar la guerra'}</button>`}
        <button class="gv-btn" data-gdip="diplo" data-id="${o.id}" ${cdD || war ? 'disabled' : ''}>🎩 Diplomático</button>
        <button class="gv-btn" data-gdip="regalo" data-id="${o.id}" ${cdG || n.food < GIFT_FOOD + popOf(n) ? `disabled title="${cdG ? 'Ya le habéis regalado hace poco' : 'No os sobra comida'}"` : ''}>🎁 Regalo (${GIFT_FOOD} 🍞)</button>
        <button class="gv-btn${emb ? ' on' : ''}" data-gdip="embargo" data-id="${o.id}">${emb ? '✓ Embargo (quitar)' : '🚫 Embargo'}</button></div></div>`;
  }).join('');
}
// Clics del panel
function govClick(e){
  if (e.target.closest('.x')) { $('govPanel').hidden = true; return; }
  const t = e.target.closest('[data-gtab]'); if (t) { govTab = t.dataset.gtab; govArm = null; govRender(true); return; }
  const a = e.target.closest('[data-gact]'); if (a) { const k = a.dataset.gact;
    if (k === 'ciencia') { const n = playerNat(); if (n) openSciTree(n.id); }
    if (k === 'refundar') { $('govPanel').hidden = true; foundStart(); }
    if (k === 'dios') { world.player = null; govSync(); }
    if (k === 'colonia') { $('govPanel').hidden = true; foundStart('colonia'); }
    if (k === 'presupuestos') { publishBudget(); govRender(true); }
    return; }
  const rg = e.target.closest('[data-greg]'); if (rg) { setPlayerRegime(rg.dataset.greg); govRender(true); return; }
  const cb = e.target.closest('[data-gbill]'); if (cb) { startBill(cb.dataset.gbill, cb.dataset.on === '1'); world.player.neg = null; govRender(true); return; }
  const cn = e.target.closest('[data-gneg]'); if (cn) { world.player.neg = world.player.neg === cn.dataset.gneg ? null : cn.dataset.gneg; govRender(true); return; }
  const cp = e.target.closest('[data-gpact]'); if (cp) { makePact(+cp.dataset.gpact, cp.dataset.law, cp.dataset.on === '1'); govRender(true); return; }
  const cr = e.target.closest('[data-gref]'); if (cr) { startReferendum(cr.dataset.gref, cr.dataset.key, cr.dataset.on !== '0'); govRender(true); return; }
  const q = e.target.closest('[data-gquit]'); if (q) { govLawDo(q.dataset.gquit, false); return; }
  const l = e.target.closest('[data-glaw]'); if (l) { setPlayerLaw(l.dataset.glaw, l.dataset.on === '1'); govRender(true); return; }
  const x = e.target.closest('[data-gtax]'); if (x) { setPlayerTax(x.dataset.gtax, x.dataset.on === '1'); govRender(true); return; }
  const f = e.target.closest('[data-gfocus]'); if (f) { for (const g of playerTowns()) g.pFocus = f.dataset.gfocus === 'normal' ? null : f.dataset.gfocus; const F = FOCUS[f.dataset.gfocus]; const n = playerNat(); if (n) notify(`${n.name} pone a su gente a trabajar sobre todo en: ${F.txt.toLowerCase()}`, { x:n.fx * T, y:n.fy * T }); govRender(true); return; }
  const o = e.target.closest('[data-gorder]'); if (o) { const g = villageById(+o.dataset.vid), k = o.dataset.gorder; if (g && isPlayerG(g)) { g.pOrder = g.pOrder === k ? null : k; if (g.pOrder) notify(`El gobierno encarga ${INSTS[k].name} en ${g.name}`, { x:g.fx * T, y:g.fy * T }); } govRender(true); return; }
  const d = e.target.closest('[data-gdip]'); if (d && !d.disabled) { const k = d.dataset.gdip, tg = villageById(+d.dataset.id); if (!tg) return;
    if (k === 'guerra') { if (govArm === `w${tg.id}`) { govArm = null; playerWar(tg); } else { govArm = `w${tg.id}`; setTimeout(() => { if (govArm === `w${tg.id}`) { govArm = null; govRender(true); } }, 4000); } }
    else if (k === 'paz') playerPeace(tg); else if (k === 'diplo') playerDiplomat(tg); else if (k === 'regalo') playerGift(tg); else if (k === 'embargo') playerEmbargo(tg, !(world.player.embargo || []).includes(tg.id));
    govRender(true); }
}
// Montaje: el panel (como el de Historia), el botón de arriba y el menú al empezar
{
  const p = document.createElement('div'); p.className = 'chron gvp'; p.id = 'govPanel'; p.hidden = true;
  p.innerHTML = `<div class="ch-h"><b>👑 Gobierno</b><button class="x" aria-label="Cerrar gobierno">×</button></div><div class="hp-body"></div>`;
  $('histPanel').parentElement.appendChild(p); p.addEventListener('click', govClick);
  p.addEventListener('change', e => { const s = e.target.closest('.gv-town'); if (s) { govWork.vid = +s.value; govRender(true); } });
  // Deslizadores de los presupuestos: se guardan en el borrador y no se repinta mientras se arrastran
  p.addEventListener('pointerdown', e => { if (e.target.closest('[data-gbud]')) govDragging = true; });
  addEventListener('pointerup', () => { if (govDragging && !document.querySelector('.gvp .dragging')) { govDragging = false; govRender(true); } });
  p.addEventListener('input', e => { const r = e.target.closest('[data-gbud]'); if (!r) return; const n = playerNat(); if (!n) return; budDraft(n)[r.dataset.gbud] = +r.value;
    const D = budDraft(n), t = Object.values(D).reduce((a, x) => a + x, 0) || 1; for (const q of p.querySelectorAll('[data-gbud]')) q.nextElementSibling.textContent = Math.round((D[q.dataset.gbud] || 0) / t * 100) + ' %'; });
  p.addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('gv-blk')) { if (d.open) govOpenCats.add(d.dataset.cat); else govOpenCats.delete(d.dataset.cat); } }, true);
  p.addEventListener('dragstart', e => { const r = e.target.closest('[data-dlaw], [data-dout]'); if (!r) return; govDragging = true; const law = r.dataset.dlaw || r.dataset.dout, out = !!r.dataset.dout;
    e.dataTransfer.setData('text/plain', (out ? 'out:' : 'in:') + law); e.dataTransfer.effectAllowed = 'move'; r.classList.add('dragging'); p.classList.add(out ? 'drag-out' : 'drag-in'); });
  p.addEventListener('dragend', e => { govDragging = false; p.classList.remove('drag-in', 'drag-out'); for (const x of p.querySelectorAll('.dragging, .over')) x.classList.remove('dragging', 'over'); });
  p.addEventListener('dragover', e => { const z = e.target.closest('.gv-vigor'); if (p.classList.contains('drag-in') ? z : !z) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (z) z.classList.add('over'); } });
  p.addEventListener('dragleave', e => { const z = e.target.closest('.gv-vigor'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
  p.addEventListener('drop', e => { const d = e.dataTransfer.getData('text/plain'); if (!d) return; e.preventDefault(); const [k, law] = d.split(':'), z = e.target.closest('.gv-vigor');
    govDragging = false; if (k === 'in' && z) govLawDo(law, true); else if (k === 'out' && !z) govLawDo(law, false); });
  document.addEventListener('click', e => { if (e.target.closest('#govBtn')) { const el = $('govPanel'); if (el.hidden) govOpen(); else el.hidden = true; } if (e.target.closest('#menuBtn')) menuOpen(); });
  SYSTEMS.push(dt => { if ((govT -= dt) > 0) return; govT = 1; govSync(); try { govRender(); } catch (err) { console.error(err); } });
  // Al cargar una partida o crear un mundo nuevo, el botón aparece o desaparece según el modo
  setInterval(() => { try { govSync(); } catch (e) {} }, 1500);
  menuOpen();
}
// ---- Menús que se arrastran: el de Gobierno, «Ideas en marcha» y el de susurrar se mueven cogiéndolos por el título;
//      se recuerda dónde los dejó cada jugador (doble clic en el título: vuelve a su sitio) ----
function makeDraggable(el, handleSel, key){
  const stage = () => el.offsetParent || el.parentElement;
  const place = (x, y) => { if (getComputedStyle(el).position !== 'absolute') el.style.position = 'absolute'; const P = stage().getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    x = clamp(x, 0, Math.max(0, P.width - Math.min(w, 120))); y = clamp(y, 0, Math.max(0, P.height - 40));
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none'; el.style.margin = '0'; el.dataset.moved = '1'; };
  try { const s = JSON.parse(localStorage.getItem('ws-drag-' + key) || 'null'); if (s) requestAnimationFrame(() => place(s.x, s.y)); } catch (e) {}
  let d = null;
  el.addEventListener('pointerdown', e => {
    const h = e.target.closest(handleSel); if (!h || !el.contains(h) || e.target.closest('button, select, input, a') || e.button !== 0) return;
    const now = performance.now(); if (now - (el._tap || 0) < 350) { el._tap = 0; reset(); return; } el._tap = now; // (doble pulsación en el título: a su sitio)
    const r = el.getBoundingClientRect(), P = stage().getBoundingClientRect();
    d = { dx:e.clientX - r.left, dy:e.clientY - r.top, P }; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); e.preventDefault();
  });
  el.addEventListener('pointermove', e => { if (d) place(e.clientX - d.P.left - d.dx, e.clientY - d.P.top - d.dy); });
  const end = () => { if (!d) return; d = null; el.classList.remove('dragging'); try { localStorage.setItem('ws-drag-' + key, JSON.stringify({ x:parseFloat(el.style.left) || 0, y:parseFloat(el.style.top) || 0 })); } catch (e) {} };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  function reset(){ for (const k of ['left', 'top', 'right', 'bottom', 'transform', 'margin', 'position']) el.style[k] = ''; delete el.dataset.moved; try { localStorage.removeItem('ws-drag-' + key); } catch (err) {} }
}
makeDraggable($('govPanel'), '.ch-h', 'gob');
// «Ideas en marcha» y el panel de susurrar se crean más tarde: se les engancha cuando aparecen
{ const hook = () => { const t = $('ideaTrack'); if (t && !t.dataset.drag) { t.dataset.drag = '1'; makeDraggable(t, '.it-h', 'ideas'); }
    const w = $('whisper'), c = w && w.querySelector('.wh'); if (c && !c.dataset.drag) { c.dataset.drag = '1'; makeDraggable(c, '.wh-h', 'susurro'); } };
  new MutationObserver(hook).observe(document.body, { childList:true, subtree:true }); }
