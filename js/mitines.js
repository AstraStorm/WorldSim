// World Sim · Líderes de partido y mítines
// ================= Mítines =================
// · Cada partido tiene su líder: alguien de la nación con sus mismas ideas, ambición y algo de estudios. Si muere o se
//   va, el partido elige otro. Se ve en la ficha del pueblo (pestaña Política) y piensa en voz alta como líder
// · En campaña (el día antes de las elecciones, de día), cada partido da un mitin en un barrio de alguno de sus pueblos:
//   el líder sube a un estrado con la bandera del partido y suelta su programa; van sus votantes (con banderitas de su
//   color) y algunos indecisos. Los suyos se reafirman y a algunos indecisos les convence
const RALLY_LEN = 28;
const deP = p => { const a = artP(p); return a === 'el' ? 'del' : 'de ' + a; }; // «del Partido», «de la Unión»
// El líder de cada partido (se guarda la persona en el partido; si ya no vale, se elige otro)
function partyLeaderOf(n, p){
  if (!p || !n) return null;
  const L = p.lead, ok = L && !L.dead && villageById(L.vid) && nationOf(villageById(L.vid)) === n && ageOf(L) >= ADULT_H;
  if (ok) return L;
  const cands = villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && ageOf(u) < (u.life || 20) * .85 && villageById(u.vid) && nationOf(villageById(u.vid)) === n && !n.parties.some(q => q !== p && q.lead === u));
  if (!cands.length) { p.lead = null; return null; }
  const sc = u => -Math.abs((u.ideo || 0) - p.ideo) * 2 + trait(u, 'ambicion') + (u.edu || 0) * .6 + (trait(u, 'sociable') * .4);
  p.lead = cands.sort((a, b) => sc(b) - sc(a))[0];
  if (L && yearT > DAY_LEN && typeof isPlayerG === 'function' && isPlayerG(n)) notify(`${capFirst(artP(p))} ${p.name} elige nuevo líder: ${p.lead.name}`, { x:p.lead.x, y:p.lead.y }); // (solo en tu nación: si no, demasiados avisos)
  return p.lead;
}
// Un sitio para el mitin: un barrio con nombre del pueblo (o su plaza)
function rallySpot(g){
  const B = typeof barrios !== 'undefined' ? barrios.filter(b => b.g === g.id && ['residencial', 'centro', 'comercio'].includes(b.c)) : [];
  const pick = B.length ? B[Math.floor(Math.random() * B.length)] : null;
  const cx = pick ? Math.round(pick.cx) : g.plaza ? Math.round((g.plaza.x0 + g.plaza.x1) / 2) : g.fx, cy = pick ? Math.round(pick.cy) : g.plaza ? Math.round((g.plaza.y0 + g.plaza.y1) / 2) : g.fy;
  const p = ringFind(cx, cy, 8, (x, y) => tileFree(x, y) && tileFree(x, y + 1) && tileFree(x - 1, y) && tileFree(x + 1, y)); if (!p) return null;
  return { x:p[0], y:p[1], where:pick ? (pick.name === 'Centro' ? `el centro de ${g.name}` : `${pick.name} (${g.name})`) : `la plaza de ${g.name}` };
}
// Lo que grita el líder: su programa
const rallyLine = p => { const l = p.laws && p.laws.length ? p.laws[Math.floor(Math.random() * p.laws.length)] : null; return l ? thPick([`¡Con nosotros, ${LAW_TXT[l] || l}!`, `¡Vamos a traer ${LAW_TXT[l] || l}!`, `¡${capFirst(LAW_TXT[l] || l)}, ya!`]) : thPick([`¡Votad a ${p.name}!`, '¡El futuro es nuestro!']); };
let rallies = [];
function startRally(n, p){
  const L = partyLeaderOf(n, p); if (!L || L.away || L.sleep || (L.task && BUSY_POL.includes(L.task.k))) return false;
  const g = villageById(L.vid), S = g && rallySpot(g); if (!S) return false;
  const until = yearT + RALLY_LEN, sx = S.x * T + 2, sy = S.y * T + 3, idx = n.parties.indexOf(p);
  releaseTask(L); if (L.actT > 0) { L.actT = 0; L.onDone = null; } L.sleep = false;
  L.task = { k:'mitin', x:sx, y:sy, until, party:idx, lead:true }; L.lastD = Infinity;
  // Van los suyos (más los que viven cerca) y algún indeciso
  const near = villagers.filter(u => u !== L && !u.dead && !u.away && !u.boat && !u.sleep && u.vid === g.id && ageOf(u) >= ADULT_H && !(u.task && (BUSY_POL.includes(u.task.k) || ['apagar', 'curarse'].includes(u.task.k))) && u.water > .3 && u.food > .25);
  const fans = near.filter(u => partyOf(u) === p && Math.random() < .8), doubt = near.filter(u => partyOf(u) !== p && Math.abs((u.ideo || 0) - p.ideo) < .5 && Math.random() < .4);
  let crowd = [...fans, ...doubt].slice(0, 16);
  if (crowd.length < 5) crowd = crowd.concat(near.filter(u => !crowd.includes(u)).sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy)).slice(0, 5 - crowd.length)); // (y algún curioso que pasaba por allí)
  if (crowd.length < 2) { L.task = null; return false; } // (nadie a quien hablar: otro rato)
  crowd.forEach((u, k) => { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } const a = Math.PI * (.15 + .7 * (k % 8) / 7), r = 9 + Math.floor(k / 8) * 6;
    u.task = { k:'mitin', x:sx + Math.cos(a) * r * (k % 2 ? 1 : -1) * .9, y:sy + Math.sin(a) * r * .55 + 6, until, party:idx, fx:sx }; u.lastD = Infinity; });
  const R = { n:n.id, p:idx, g:g.id, x:sx, y:sy, until, lead:L, crowd, where:S.where, sayT:0 };
  rallies.push(R); p.rallies = (p.rallies || 0) + 1; p.rallyV = n.voteT;
  if (crowd.length >= 6 || (typeof isPlayerG === 'function' && isPlayerG(g))) notify(`Mitin ${deP(p)} ${p.name} en ${S.where}: ${L.name} habla ante ${crowd.length} personas`, { x:sx, y:sy }); // (los pequeños no salen en las noticias)
  return true;
}
// Mientras dura: el líder suelta su programa, el público responde; al acabar, los suyos se reafirman y algún indeciso cambia
function rallyTick(dt){
  for (const R of rallies) {
    const n = villageById(R.n), p = n && n.parties && n.parties[R.p];
    if (!p || yearT > R.until) { R.done = true; if (p) rallyEnd(R, p); continue; }
    if ((R.sayT -= dt) <= 0 && typeof sayList !== 'undefined' && zoom >= 3 && !R.lead.dead) {
      R.sayT = 3.5 + Math.random() * 2;
      const L = R.lead, here = L.task && L.task.k === 'mitin' && Math.hypot(L.x - R.x, L.y - R.y) < 8;
      if (here) { const now = performance.now(); sayList = sayList.filter(s => s.v !== L); sayList.push({ v:L, txt:rallyLine(p), think:false, t0:now, t1:now + 3200 });
        const fan = R.crowd.filter(u => !u.dead && u.task && u.task.k === 'mitin' && !sayList.some(s => s.v === u)); const u = fan[Math.floor(Math.random() * fan.length)];
        if (u) sayList.push({ v:u, txt:partyOf(u) === p ? thPick(['¡Bravo!', '¡Sí, señor!', `¡${L.name}, ${L.name}!`, '¡Viva!']) : thPick(['Mmm, no está mal...', '¿Y cómo lo vais a pagar?', 'Eso ya lo dijeron otros']), think:false, t0:now + 1200, t1:now + 3800 }); }
    }
  }
  if (rallies.some(R => R.done)) rallies = rallies.filter(R => !R.done);
}
function rallyEnd(R, p){
  let won = 0;
  for (const u of R.crowd) {
    if (u.dead) continue;
    if (partyOf(u) === p) u.ideo = (u.ideo || 0) + (p.ideo - (u.ideo || 0)) * .15;
    else if (Math.random() < .35) { u.ideo = (u.ideo || 0) + (p.ideo - (u.ideo || 0)) * .45; if (partyOf(u) === p) won++; }
    if (u.task && u.task.k === 'mitin') u.task = null;
  }
  if (R.lead.task && R.lead.task.k === 'mitin') R.lead.task = null;
  if (won >= 2) notify(`El mitin ${deP(p)} ${p.name} convence a ${won} indecisos`, { x:R.x, y:R.y });
}
// Campaña: el día antes de votar, de día, cada partido da su mitin (uno a la vez por nación)
let rallyClock = 0;
SYSTEMS.push(dt => {
  rallyTick(dt);
  if ((rallyClock -= dt) > 0 || !villages.length) return; rallyClock = 4;
  if (isNight()) return;
  for (const n of villages) {
    if (nationOf(n) !== n || !popOf(n) || !n.parties || n.parties.length < 2 || !votes(n) || n.election) continue;
    const since = yearT - (n.voteT ?? -1e9); if (since < ELECTION_GAP - DAY_LEN * 1.6 || since > ELECTION_GAP - DAY_LEN * .05) continue; // (la campaña: el último día y medio antes de votar)
    if (rallies.some(R => R.n === n.id)) continue;
    const todo = n.parties.filter(p => p.rallyV !== n.voteT); if (!todo.length || Math.random() > .25) continue;
    startRally(n, todo[Math.floor(Math.random() * todo.length)]);
  }
});
// El estrado con la bandera del partido y las banderitas del público (antes de pintar a la persona)
{ const base = drawPersonExtras; drawPersonExtras = function(v, x, y, s, now){
  if (v.task && v.task.k === 'mitin') {
    const n = villageById(v.vid) && nationOf(villageById(v.vid)), p = n && n.parties && n.parties[v.task.party];
    if (p) {
      if (v.task.lead && Math.hypot(v.x - v.task.x, v.y - v.task.y) < 4) { // estrado de madera y la bandera detrás
        vctx.fillStyle = '#5a3a20'; vctx.fillRect(x - 6, y - 1, 13, 3); vctx.fillStyle = '#8a5a30'; vctx.fillRect(x - 6, y - 2, 13, 1);
        const fx = x + 7, fy = y - 16; vctx.fillStyle = '#4a3020'; vctx.fillRect(fx, fy, 1, 15); vctx.fillStyle = p.col; vctx.fillRect(fx + 1, fy, 7 + Math.round(Math.sin(now / 250)), 5); vctx.fillStyle = 'rgba(255,255,255,.35)'; vctx.fillRect(fx + 1, fy, 7, 1);
      } else if (!v.task.lead && (Math.floor(now / 400) + Math.floor(v.x)) % 4 !== 0) { const bx = x + v.dir * 2, by = y - s.height - 4 - (Math.floor(now / 300 + v.x) % 2); vctx.fillStyle = '#6a4a2a'; vctx.fillRect(bx, by, 1, 5); vctx.fillStyle = p.col; vctx.fillRect(bx + (v.dir > 0 ? 1 : -3), by, 3, 2); }
    }
  }
  return base.apply(this, arguments);
}; }
// Lo que piensa un líder de partido
{ const base = thoughtOf; thoughtOf = function(v){
  if (!v.sleep && Math.random() < .3) { const g = villageById(v.vid), n = g && nationOf(g), p = n && n.parties && n.parties.find(q => q.lead === v); if (p) return { txt:thPick([`¡${p.name} ganará las elecciones!`, 'Tengo que preparar el discurso', `El programa de ${p.name} es lo que este pueblo necesita`, n.ruling != null && n.parties[n.ruling] === p ? 'Gobernar es más difícil de lo que parecía' : '¡Echaremos a los que mandan!']), mood:0, think:true }; }
  return base.apply(this, arguments);
}; }
