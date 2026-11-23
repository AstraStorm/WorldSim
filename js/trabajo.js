// Forja de Mundos · Oficios, escuelas, días libres y festivos
// ================= Trabajo y calendario =================
// · Los oficios se reparten de nuevo poco a poco: cuando aparece uno nuevo (cartógrafo, curandero, bombero, maestro…)
//   alguien se pasa a él, sin esperar a que crezca una generación
// · Con la ley de escuelas: escuela, maestros y niños que van a clase; de mayores ganan más y eligen oficios de saber
// · Días libres a la semana (según la jornada) y festivos que recuerdan lo que les pasó; si no descansan, se quejan
const WEEK = 7;
const dayNum = () => Math.floor(yearT / DAY_LEN);
const dayOfYear = () => Math.floor((yearT % (SEASON_LEN * 4)) / DAY_LEN); // 0..15
const hasSchool = g => g && g.school != null && !!world.objs[g.school];
const restDaysOf = g => clamp((hasLaw(g, 'jornada_corta') ? 2 : hasLaw(g, 'jornada_larga') ? 0 : 1) + (g.restBonus || 0), 0, 3);
const isRestDay = g => { const n = restDaysOf(g); return n > 0 && dayNum() % WEEK >= WEEK - n; };
const holidayToday = g => fiestasOf(g).find(f => f.doy === dayOfYear() && dayNum() > f.day); // (no el mismo día en que pasó)
const isFreeDay = g => isRestDay(g) || !!holidayToday(g);
// Un festivo para recordar algo que ha pasado (como mucho, seis)
function addFiesta(g, name){
  if (!g || !popOf(g)) return; g.fiestas ||= [];
  if (g.fiestas.some(f => f.name === name) || g.fiestas.length >= 6) return;
  const doy = dayOfYear(); if (fiestasOf(g).some(f => f.doy === doy)) return; // (calendario.js)
  g.fiestas.push({ name, doy, day:dayNum() });
  const txt = `En ${g.name} declaran festivo cada día ${doy + 1} del año: «${name}»`; notify(txt, { x:g.fx * T, y:g.fy * T }); (g.log ||= []).push({ d:dayNum() + 1, txt });
}
// Oficios: cuáles puede tener cada pueblo y reparto poco a poco
function oficioOk(g, o){
  return !((o === 'cartógrafo' && !hasPaper(g)) || (o === 'sabio' && !hasInst(g, 'universidad')) || (o === 'mensajero' && !(g.know || {}).escritura) || (o === 'soldado' && !hasBarracks(g)) || (o === 'ingeniero' && !hasBarracks(g) && !hasForge(g)) || (o === 'mercader' && g.market == null)
    || (o === 'bombero' && !(g.know || {}).bomberos) || (o === 'maestro' && !hasSchool(g)) || (o === 'curandero' && !hasHosp(g) && popOf(g) < 15));
}
// Falta de maestros, médicos (curanderos) o bomberos: si hay para qué y son pocos, la gente se queja
function staffGrief(g, adults, people){
  const cnt = o => adults.filter(v => v.oficio === o).length, out = {};
  if (hasSchool(g)) { const kids = people.filter(v => ageOf(v) < ADULT_H).length, t = cnt('maestro'), per = kids / Math.max(.5, t); if (kids >= 4 && per > 8) out.profesores = Math.min(.6, .12 + per * .015); }
  const sick = people.filter(v => v.sick).length, c = cnt('curandero'); if (sick >= 2 && sick > c * 3) out.medicos = Math.min(.7, .15 + (sick - c * 3) * .06);
  if (fireNear(g) != null) g.fireSeenT = yearT;
  if ((g.know || {}).bomberos && yearT - (g.fireSeenT ?? -1e9) < DAY_LEN * 2) { const b = cnt('bombero'); if (b < Math.max(1, Math.floor(adults.length / 15))) out.bomberos = b ? .2 : .4; }
  return out;
}
// Ceder a la protesta: dos más con ese oficio (los que más estudiaron), y durante un tiempo no se les cambia
function staffConcede(g, grief){
  const o = { profesores:'maestro', medicos:'curandero', bomberos:'bombero' }[grief]; if (!o) return null;
  const who = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H && v !== g.leader && !v.away && !['soldado', 'maestro', 'curandero', 'bombero'].includes(v.oficio)).sort((a, b) => (b.edu || 0) - (a.edu || 0)).slice(0, 2);
  for (const v of who) v.oficio = o;
  (g.staffKeep ||= {})[o] = yearT + DAY_LEN * 6;
  return who.length ? `${who.length === 1 ? 'ponen a una persona más' : 'ponen a dos personas más'} de ${o === 'maestro' ? 'maestro' : o === 'curandero' ? 'médico' : 'bombero'}` : null;
}
function workTick(g, dt, people){
  if ((g.workT = (g.workT || 0) - dt) > 0) return;
  g.workT = DAY_LEN / 3;
  const adults = people.filter(v => ageOf(v) >= ADULT_H && v.oficio && v !== g.leader && !v.away), n = adults.length; if (n < 5) return;
  const cnt = o => adults.filter(v => v.oficio === o).length, ok = Object.keys(OFICIO_MIX).filter(o => oficioOk(g, o));
  let need = null, nd = .9, over = null, ov = .9;
  for (const o of ok) { const d = OFICIO_MIX[o] * n - cnt(o); if (d > nd) { nd = d; need = o; } }
  const missing = ['maestro', 'bombero', 'curandero', 'cartógrafo', 'mercader'].find(o => ok.includes(o) && cnt(o) === 0); if (missing) need = missing; // uno al menos, si hay para qué
  for (const o of new Set(adults.map(v => v.oficio))) { const d = cnt(o) - (ok.includes(o) ? OFICIO_MIX[o] * n : 0); if (d > ov) { ov = d; over = o; } }
  if (need && (!over || over === need)) { const common = [...new Set(adults.map(v => v.oficio))].filter(o => o !== need && o !== 'soldado').sort((a, b) => cnt(b) - cnt(a))[0]; if (common && cnt(common) >= 2) over = common; } // el que más abunda cede a alguien
  if (!need || !over || need === over || ((g.staffKeep || {})[over] || 0) > yearT) return; // los que se prometieron tras una protesta, se quedan
  const cands = adults.filter(v => v.oficio === over && !(v.task && ['asalto', 'guardia'].includes(v.task.k)));
  const who = cands.sort((a, b) => ((['cartógrafo', 'maestro', 'curandero', 'ingeniero', 'sabio'].includes(need) ? (b.edu || 0) - (a.edu || 0) : 0)))[0]; if (!who) return; // los que fueron a la escuela, a los oficios de saber
  const first = cnt(need) === 0; who.oficio = need;
  if (first && !(g.newJobs ||= {})[need]) { g.newJobs[need] = true; notify(`En ${g.name}, ${who.name} deja de ser ${ofW(over, who)} y se hace ${ofW(need, who)}: es ${who.sex === 'm' ? 'la primera' : 'el primero'} del pueblo`, { x:who.x, y:who.y }); }
}
// ---- Escuela ----
function schoolSpot(g){ // delante de la puerta, donde se pueda estar
  const sb = standBy(g.school); if (!sb) return null;
  for (let k = 0; k < 8; k++) { const x = sb[0] + (Math.random() - .5) * 14, y = sb[1] + 2 + Math.random() * 6; if (walkable(x, y)) return [x, y]; }
  return sb;
}
function kidTask(v, g){ // los niños, en día de clase, a la escuela
  if (!hasSchool(g) || ageOf(v) < .8 || isNight() || isFreeDay(g) || !inShift(g) || Math.random() > .7) return null;
  const p = schoolSpot(g); return p ? { k:'clase', x:p[0], y:p[1] } : null;
}
// ---- Festivos: celebración en la plaza y fuegos al caer la tarde ----
function holidayTick(g, dt, people){
  const f = holidayToday(g); if (!f) return;
  if (g.fiestaMsg !== dayNum()) { g.fiestaMsg = dayNum(); const at = { x:g.fx * T, y:g.fy * T }; notify(`Hoy es fiesta en ${g.name}: «${f.name}»`, at); snd('cheer', at.x, at.y); }
  if (dayT() > .4 && dayT() < .6 && Math.random() < dt * .6) { // fuegos artificiales
    const x = g.fx * T + (Math.random() - .5) * 60, y = g.fy * T - 30 - Math.random() * 30, col = ['#f0d060', '#f08a7a', '#9cd0f8', '#c8f0a0', '#f0a0e0'][Math.floor(Math.random() * 5)];
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; chips.push({ x, y, vx:Math.cos(a) * 22, vy:Math.sin(a) * 22 - 4, life:0, max:.9, col }); }
  }
}
