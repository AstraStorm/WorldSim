// World Sim · Enfermedades, migraciones e historia
// ================= Enfermedades y epidemias =================
let epidemics = [];
const DIS_A = ['Fiebre', 'Peste', 'Tos', 'Viruela', 'Gripe', 'Mal'], DIS_B = ['roja', 'negra', 'del pantano', 'de los ríos', 'gris', 'de invierno', 'amarilla', 'de los puertos'];
function newDisease(){ return { name:`${DIS_A[Math.floor(Math.random() * DIS_A.length)]} ${DIS_B[Math.floor(Math.random() * DIS_B.length)]}`, sev:.6 + Math.random() * .9, spread:.6 + Math.random() * .8 }; }
function infect(v, dz, g){
  if (v.dead || v.sick || (v.immune || []).includes(dz.name)) return false;
  v.sick = { name:dz.name, sev:dz.sev, spread:dz.spread, t:0, dur:35 + Math.random() * 50 };
  if (g) { const ep = epidemics.find(e => e.name === dz.name && e.vid === g.id && !e.over); if (ep) ep.cases++; else { epidemics.push({ name:dz.name, vid:g.id, cases:1, deaths:0, start:yearT, over:false }); notify(`¡Brota la ${dz.name.toLowerCase()} en ${g.name}!`, { x:v.x, y:v.y }); misfortune(g, 'enfermedad'); } }
  return true;
}
// Cada segundo: contagios, curas y muertes (llamado desde la actualización de los pueblos)
function diseaseTick(g, dt, people){
  const pop = people.length; if (!pop) return;
  const crowd = pop / Math.max(4, houseCap(g) + 4), hungry = g.food < pop * .5, winter = seasonInfo().i === 3, war = [...rels.values()].some(r => r.war && (r.war.def === g.id || r.war.att === g.id));
  const quarantine = hasLaw(g, 'cuarentena'), hosp = hasHosp(g), sanidad = hasLaw(g, 'sanidad');
  // Brote nuevo: más fácil con la gente hacinada, con hambre, en invierno o en guerra
  if (pop >= 8 && !people.some(u => u.sick) && Math.random() < dt * 1.5e-4 * (crowd > 1 ? 2 : 1) * (hungry ? 2 : 1) * (winter ? 1.6 : 1) * (war ? 1.8 : 1) * (sanidad ? .5 : 1) * (hasLaw(g, 'vacunacion') ? .3 : 1)) infect(people[Math.floor(Math.random() * pop)], newDisease(), g);
  for (const v of people) {
    const s = v.sick; if (!s) continue;
    s.t += dt;
    for (const u of people) if (u !== v && !u.sick && (Math.hypot(u.x - v.x, u.y - v.y) < 18 || (u.home != null && u.home === v.home)) && Math.random() < dt * (u.home != null && u.home === v.home ? .035 : .022) * s.spread * (quarantine ? .35 : 1) * (hasLaw(g, 'vacunacion') ? .4 : 1) * (crowd > 1 ? 1.5 : 1)) infect(u, s, g); // de cerca, o en la misma casa
    v.hp = (v.hp ?? 1) - dt * .006 * s.sev * (ageOf(v) < ADULT_H || ageOf(v) > v.life * .75 ? 1.6 : 1) * (hosp ? .4 : 1) * (sanidad ? .6 : 1) * (v.cared > yearT ? .3 : 1);
    if (v.hp <= 0) { const ep = epidemics.find(e => e.name === s.name && e.vid === g.id && !e.over); if (ep) ep.deaths++; releaseTask(v); killVillager(v, 'enfermedad'); continue; }
    if (s.t > s.dur) { (v.immune ||= []).push(s.name); v.sick = null; floats.push({ x:v.x, y:v.y - 12, txt:'curado', col:'#a8e0a8', life:0 }); }
  }
  for (const ep of epidemics) if (!ep.over && ep.vid === g.id && !people.some(u => u.sick && u.sick.name === ep.name)) { ep.over = true; notify(`Se acaba la ${ep.name.toLowerCase()} en ${g.name}: ${ep.cases} enfermos, ${ep.deaths} muertos`, { x:g.fx * T, y:g.fy * T }); }
}
// ================= Migraciones =================
function migrationTick(g, people){
  const pop = people.length; if (pop < 3) return; // (también las aldeas pequeñas pueden irse)
  const cap = houseCap(g) + 4, hungry = g.food < pop * .3, crowded = pop > cap + 3, angry = (g.anger || 0) > 60, war = [...rels.values()].some(r => r.war && r.war.def === g.id && r.war.dead > 3), sick = people.filter(u => u.sick).length > pop * .3;
  const why = hungry ? 'el hambre' : war ? 'la guerra' : sick ? 'la epidemia' : crowded ? 'la falta de casas' : angry ? 'el gobierno' : null;
  if (!why || Math.random() > .35) return;
  let best = null, bs = 0;
  for (const o of villages) {
    const r = rels.get(relKey(g, o)), free = hasTreaty(r, 'circulacion');
    if (o === g || !popOf(o) || (hasLaw(o, 'fronteras_cerradas') && !free)) continue;
    if (r && r.war) continue;
    const op = popOf(o), room = houseCap(o) + 4 - op, d = Math.hypot(o.fx - g.fx, o.fy - g.fy);
    if (room < 2 || o.food < op * .8 || d > 140) continue;
    const sc = room + (o.food / op) * 2 + (hasLaw(o, 'fronteras_abiertas') ? 4 : 0) + (sameNation(o, g) ? 3 : 0) + (free ? 5 : 0) + ((r && r.v) || 0) / 20 - d / 30;
    if (sc > bs) { bs = sc; best = o; }
  }
  if (!best) return;
  const n = Math.min(Math.max(2, Math.floor(pop * .15)), 6, houseCap(best) + 4 - popOf(best));
  const goers = people.filter(u => u !== g.leader && !u.away && !u.boat && !(u.task && ['asalto', 'viaje', 'golpe'].includes(u.task.k))).slice(0, n);
  if (goers.length < 2) return;
  for (const v of goers) { releaseTask(v); dismount(v); v.task = { k:'viaje' }; v.away = true; travelers.push({ kind:'emigrante', v, from:g.id, to:best.id, x:v.x, y:v.y, tx:best.fx * T + 2 + (Math.random() - .5) * 20, ty:best.fy * T + 10, hx:v.x, hy:v.y, sea:false, phase:'ida', dir:1 }); }
  notify(`Huyendo ${why.startsWith('el ') ? 'del ' + why.slice(3) : 'de ' + why}, ${goers.length} personas de ${g.name} emigran a ${best.name}`, { x:g.fx * T, y:g.fy * T });
}
// ---- Ayuda alimentaria: un pueblo con hambre recibe comida de los de su nación o de un pueblo amigo que le sobre ----
// (sin ella, una mala cosecha o la ceniza de un volcán acababan con aldeas enteras mientras al lado sobraba comida)
let aidT = 0;
addEventListener('DOMContentLoaded', () => SYSTEMS.push(dt => { // (este archivo se carga antes que la lista de sistemas)
  if (!world || (aidT -= dt) > 0) return; aidT = 15;
  for (const g of liveTowns()) {
    const pop = popOf(g); if (pop < 3 || g.food >= pop * 1.2 || (g.aidT || 0) > yearT) continue;
    let best = null, bs = -1e9;
    for (const o of liveTowns()) {
      if (o === g) continue; const r = rels.get(relKey(g, o)), same = sameNation(o, g); if (!same && (!r || !r.known || r.war || r.v < 25)) continue;
      const op = popOf(o), spare = o.food - (op * 5 + 20), d = Math.hypot(o.fx - g.fx, o.fy - g.fy); if (spare < 10 || d > 160) continue;
      const sc = spare / 10 + (same ? 8 : 0) + ((r && r.v) || 0) / 15 - d / 25; if (sc > bs) { bs = sc; best = o; }
    }
    if (!best) continue;
    const n = Math.round(Math.min((best.food - (popOf(best) * 5 + 20)) * .35, pop * 3)); if (n < 5) continue;
    best.food -= n; g.food += n; g.aidT = yearT + DAY_LEN * .5; const r = relOf(g, best); r.v = clamp(r.v + 3, -100, 100);
    floats.push({ x:g.fx * T, y:g.fy * T - 14, txt:`+${n} de comida de ${best.name}`, col:'#c8e0a0', life:0 });
    const k = g.id + '>' + best.id; if (!(world.aidMsg ||= {})[k]) { world.aidMsg[k] = true; notify(`${best.name} envía ${n} de comida a ${g.name}, que pasa hambre`, { x:g.fx * T, y:g.fy * T }); }
  }
}));
// ================= Historia y estadísticas =================
let worldHist = { t:[], n:{} }, histT = 0;
function recordHistory(){
  worldHist.t.push(Math.floor(yearT / DAY_LEN * 10) / 10);
  const seen = new Set();
  for (const g of villages) {
    if (!popOf(g)) continue; const n = nationOf(g); if (seen.has(n.id)) continue; seen.add(n.id);
    const mem = villages.filter(o => popOf(o) && nationOf(o) === n), ppl = villagers.filter(u => !u.dead && mem.some(o => o.id === u.vid));
    const [r, g2, b] = villageColor(n), e = worldHist.n[n.id] ||= { name:n.name, col:`rgb(${r},${g2},${b})`, pop:[], army:[], wealth:[], from:worldHist.t.length - 1 };
    e.name = n.name; e.col = `rgb(${r},${g2},${b})`;
    while (e.pop.length < worldHist.t.length - 1 - e.from) { e.pop.push(null); e.army.push(null); e.wealth.push(null); }
    e.pop.push(ppl.length); e.army.push(ppl.filter(u => u.weapon).length); e.wealth.push(Math.round(mem.reduce((a, o) => a + o.food + o.wood + o.stone + (o.iron || 0) * 3 + (o.gold || 0) * 10, 0)));
  }
  if (worldHist.t.length > 400) { worldHist.t.shift(); for (const e of Object.values(worldHist.n)) { if (e.from > 0) e.from--; else { e.pop.shift(); e.army.shift(); e.wealth.shift(); } } }
}
let histTab = 'pop';
function renderHistory(){
  const el = $('histPanel'); if (el.hidden) return;
  const body = el.querySelector('.hp-body');
  if (histTab === 'tl') {
    const ev = chronicle.filter(c => TOAST_BIG.test(c.text) || /Juegos|epidemia|Brota|emigran|independiza|extinguido|dinastía|imperio/.test(c.text)).slice(-80).reverse();
    body.innerHTML = `<ul class="cl-list">${ev.map(c => `<li class="${c.kind}"><span class="d">día ${c.d}</span><span class="txt">${esc(c.text)}</span></li>`).join('') || '<li class="empty">Aún no ha pasado nada importante</li>'}</ul>`; return;
  }
  if (histTab === 'juegos') {
    const past = (olymp.past || []).slice().reverse();
    body.innerHTML = past.length ? past.map(o => `<div class="olym"><b>Juegos de ${esc(o.host)}</b> <span class="muted">(día ${o.d})</span><br>${o.events.map(e => `${esc(e.name)}: 🥇 ${esc(e.podium[0] || '—')} · 🥈 ${esc(e.podium[1] || '—')} · 🥉 ${esc(e.podium[2] || '—')}`).join('<br>')}<br><span class="muted">Medallero: ${Object.entries(o.medals).sort((a, b) => b[1] - a[1]).map(([n, m]) => `${esc(n)} ${m}`).join(' · ')}</span></div>`).join('') : '<div class="muted" style="padding:10px">Aún no se han celebrado Juegos. Se celebran cada dos estaciones si hay al menos dos naciones en paz.</div>';
    return;
  }
  const key = histTab, series = Object.values(worldHist.n).filter(e => e[key].some(x => x)), n = worldHist.t.length;
  if (n < 2 || !series.length) { body.innerHTML = '<div class="muted" style="padding:10px">Aún no hay datos: se apuntan cada medio día de juego.</div>'; return; }
  const mx = Math.max(1, ...series.flatMap(e => e[key].filter(x => x != null)));
  const line = e => e[key].map((y, k) => y == null ? null : `${((e.from + k) / (n - 1) * 400).toFixed(1)},${(150 - y / mx * 140).toFixed(1)}`).filter(Boolean).join(' ');
  body.innerHTML = `<svg viewBox="0 0 400 160" class="hchart"><line x1="0" y1="150" x2="400" y2="150" stroke="#2c3640"/>${series.map(e => `<polyline fill="none" stroke="${e.col}" stroke-width="2" vector-effect="non-scaling-stroke" points="${line(e)}"/>`).join('')}</svg>
    <div class="hleg">${series.map(e => `<span><i style="background:${e.col}"></i>${esc(e.name)} <b>${e[key][e[key].length - 1] ?? '†'}</b></span>`).join('')}</div><div class="muted" style="font-size:11px">Máximo: ${mx} · desde el día ${worldHist.t[0]} hasta el ${worldHist.t[n - 1]}</div>`;
}
