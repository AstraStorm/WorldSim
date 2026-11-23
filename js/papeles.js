// Forja de Mundos · Papeles: DNI, pasaportes y permisos; centros de deportación, campos y esclavitud
// ================= Papeles =================
// · Con el registro civil (un descubrimiento) y un ayuntamiento, cada nación hace el DNI a su gente y el pasaporte a
//   quien lo pide (cuesta unas monedas). Se ven en la ficha de cada persona
// · Con la ley de «papeles en regla», quien llega de otro país necesita pasaporte y un permiso de residencia: se lo dan
//   según cómo se lleven los dos países (con libre circulación, siempre). Quien no lo consigue se queda sin papeles
// · Deportación: los sin papeles van a un centro de internamiento a las afueras y, al cabo de un rato, de vuelta a su
//   país. Con la regularización, en cambio, reciben sus papeles
// · Trabajos forzados: los presos cumplen en un campo de trabajo picando piedra para el estado
// · Campos de internamiento: los regímenes más duros encierran allí a opositores y perseguidos; el resto del mundo los
//   condena y, cuando cae la ley, se liberan
// · Esclavitud: los prisioneros de guerra y los sin papeles pueden acabar esclavizados: trabajan sin sueldo y con
//   grilletes, huyen cuando pueden y, si son muchos, se rebelan. Las naciones con derechos humanos lo condenan
(() => { if (DISCOVERIES.some(x => x.k === 'registro_civil')) return; const i = DISCOVERIES.findIndex(x => x.k === 'agronomia'); DISCOVERIES.splice(i + 1, 0, { k:'registro_civil', txt:'el registro civil', cost:35, eff:'cada persona tiene su DNI y quien quiera viajar, su pasaporte' }); })();
Object.assign(LAW_TXT, { control_fronteras:'papeles en regla', deportaciones:'deportación de los sin papeles', regularizacion:'regularización de los sin papeles', trabajos_forzados:'trabajos forzados',
  campos_internamiento:'campos de internamiento', esclavitud:'esclavitud', abolicion:'abolición de la esclavitud' });
Object.assign(LAW_DESC, { control_fronteras:'quien llega de fuera necesita pasaporte y un permiso de residencia; quien no lo consigue se queda sin papeles',
  deportaciones:'los sin papeles van a un centro de internamiento y luego los devuelven a su país', regularizacion:'los sin papeles reciben permiso de residencia',
  trabajos_forzados:'los presos cumplen en un campo de trabajo picando piedra para el estado', campos_internamiento:'opositores y perseguidos acaban encerrados en un campo: el mundo lo condena',
  esclavitud:'los prisioneros de guerra y los sin papeles pueden ser esclavizados: trabajan sin sueldo', abolicion:'nadie puede ser esclavo: quien huye de la esclavitud encuentra refugio aquí' });
Object.assign(LAW_LEAN, { control_fronteras:.45, deportaciones:.65, regularizacion:-.5, trabajos_forzados:.7, campos_internamiento:.9, esclavitud:.9, abolicion:-.4 });
LAW_CLASH.push(['deportaciones', 'regularizacion'], ['esclavitud', 'abolicion'], ['esclavitud', 'derechos_humanos'], ['campos_internamiento', 'derechos_humanos'], ['trabajos_forzados', 'derechos_humanos'], ['control_fronteras', 'fronteras_abiertas']);
REGIME_LAWS.fascismo.push('control_fronteras', 'deportaciones', 'trabajos_forzados', 'campos_internamiento'); REGIME_LAWS.dictadura.push('control_fronteras', 'trabajos_forzados'); REGIME_LAWS.comunismo.push('trabajos_forzados'); REGIME_LAWS.oligarquia.push('control_fronteras');
const docsOn = g => !!(g && knowsSci(g, 'registro_civil') && ((g.hall != null && world.objs[g.hall]) || (nationOf(g).hall != null && world.objs[nationOf(g).hall])));
const slaving = g => hasLaw(g, 'esclavitud') && !hasLaw(g, 'abolicion') && !nationOf(g).abolished;
const inCamp = v => !!(v.camp && v.camp.until > yearT);
const DNI_L = 'TRWAGMYFPDXBNJZSQVHLCKE';
function newDni(n){ const k = 10000000 + Math.floor(Math.random() * 89999999); return { n:`${k}-${DNI_L[k % 23]}`, nat:n.id }; }
// Quien llega de fuera: lo apunta la llegada (credos.js) y lo mira el pueblo que lo recibe
{ const base = welcomeMigrant; welcomeMigrant = function(v, from, to){ if (from) v.arrived = from.id; return base.apply(this, arguments); }; }
function arrivalCheck(v, g, n, docs){
  const from = villageById(v.arrived); v.arrived = null;
  if (!from || v.slave || nationOf(from) === n) return;
  if (!docs || !hasLaw(g, 'control_fronteras')) { v.permit = { t:yearT, nat:n.id }; return; }
  const r = rels.get(relKey(g, from)) || rels.get(relKey(n, nationOf(from))), free = r && hasTreaty(r, 'circulacion');
  if (free || (v.pass != null && Math.random() < clamp(.55 + ((r && r.v) || 0) / 100, .1, .95))) { v.permit = { t:yearT, nat:n.id }; return; }
  v.irreg = { vid:g.id, from:from.id, t:yearT }; v.permit = null;
  (g.irrNew ||= []).push(v.pass != null ? 'perm' : 'pass');
}
// ---- Cada 20 s en cada pueblo ----
function papersTick(g, dt, people){
  if ((g.papT = (g.papT ?? Math.random() * 20) - dt) > 0) return; g.papT = 20;
  const n = nationOf(g), at = { x:g.fx * T, y:g.fy * T }, docs = docsOn(g);
  for (const v of people) if (v.arrived != null) arrivalCheck(v, g, n, docs);
  if (g.irrNew && g.irrNew.length) {
    const k = g.irrNew.length, np = g.irrNew.filter(x => x === 'pass').length; g.irrNew = null;
    notify(`${k} persona${k > 1 ? 's llegan' : ' llega'} a ${g.name} sin papeles: ${np === k ? 'no tienen pasaporte' : np ? 'unos sin pasaporte y otros sin permiso de residencia' : 'no les dan el permiso de residencia'}`, at);
  }
  if (docs) {
    if (!n.dniMsg) { n.dniMsg = true; notify(`${n.name} abre el registro civil: cada habitante tendrá su DNI y quien quiera viajar, su pasaporte`, at); }
    let k = 0; const ec = ecOf(g);
    for (const v of people) {
      if (k >= 6) break;
      if (v.irreg || v.slave) continue;
      if (!v.dni || (v.dni.nat !== n.id && (!v.permit || yearT - v.permit.t > DAY_LEN * 4))) { v.dni = newDni(n); if (v.pass != null) v.pass = n.id; k++; } // los de fuera, al cabo de un tiempo con permiso, se nacionalizan
      else if (v.pass == null && ageOf(v) >= ADULT_H && Math.random() < .12) { v.pass = n.id; k++; if (ec && (v.money || 0) >= 2) { v.money -= 2; ec.treas += 2; } }
    }
  }
  irregTick(g, people, n, at);
  campsTick(g, people, n, at);
  slaveTick(g, people, n, at);
  if (yearT - (world.powT ?? -1e9) > DAY_LEN / 2) { world.powT = yearT; powersTick(); } // ¿quién es la primera potencia? (potencias.js)
}
// ---- Los sin papeles ----
function irregTick(g, people, n, at){
  const irr = people.filter(v => v.irreg);
  if (!irr.length) return;
  if (!docsOn(g) || !hasLaw(g, 'control_fronteras') || hasLaw(g, 'regularizacion')) {
    for (const v of irr) { v.irreg = null; v.permit = { t:yearT, nat:n.id }; if (v.camp && v.camp.k === 'deport') freeFromCamp(v); }
    if (hasLaw(g, 'regularizacion')) notify(`${g.name} regulariza a ${irr.length} persona${irr.length > 1 ? 's' : ''} sin papeles: ya tienen permiso de residencia`, at);
    return;
  }
  if (slaving(g) && Math.random() < .25) { const v = irr.find(u => !inCamp(u) && !u.away && ageOf(u) >= ADULT_H); if (v) { enslave(v, g, 'por no tener papeles'); return; } }
  if (!hasLaw(g, 'deportaciones') || !campOf(g, 'deport')) return;
  const go = irr.filter(u => !inCamp(u) && !u.away && !u.boat).slice(0, 3);
  for (const v of go) intern(v, g, 'deport', DAY_LEN * .5);
  if (go.length) notify(`La policía de ${g.name} detiene a ${go.length} persona${go.length > 1 ? 's' : ''} sin papeles y la${go.length > 1 ? 's' : ''} lleva al centro de internamiento`, at);
}
// ---- Campos: centro de internamiento de migrantes, campo de trabajo y campo de internamiento ----
const CAMP = { deport:{ name:'un centro de internamiento de migrantes', w:7, h:4, why:'los sin papeles esperarán allí a que los devuelvan a su país' },
  trabajo:{ name:'un campo de trabajos forzados', w:8, h:5, why:'los presos picarán piedra para el estado' },
  intern:{ name:'un campo de internamiento', w:8, h:5, why:'allí encierran a opositores y perseguidos' } };
const campOn = (g, k) => k === 'deport' ? hasLaw(g, 'deportaciones') && hasLaw(g, 'control_fronteras') && docsOn(g) : k === 'trabajo' ? hasLaw(g, 'trabajos_forzados') && hasCourt(g) : hasLaw(g, 'campos_internamiento');
const campOf = (g, k) => (g.camps && g.camps[k]) || null;
const campPeople = (g, k) => villagers.filter(u => !u.dead && inCamp(u) && u.camp.vid === g.id && u.camp.k === k);
function buildCamp(g, k, at){
  const C = CAMP[k]; if ((g.wood || 0) < 12 || (g.campFail && yearT - g.campFail < DAY_LEN)) return null;
  const p = campSite(g, (x, y) => {
    const x0 = x - (C.w >> 1), y0 = y - (C.h >> 1), x1 = x0 + C.w - 1, y1 = y0 + C.h - 1;
    if (!clearable(x0, y0, x1, y1) || plotIn(x0 - 1, y0 - 1, x1 + 1, y1 + 1) || volcDanger(x, y, 2)) return false;
    for (let yy = y0 - 1; yy <= y1 + 7; yy++) for (let xx = x0 - 2; xx <= x1 + 2; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false; const i = yy * W + xx, o = world.objs[i]; if (o && !['tree', 'berry'].includes(OBJ[o.key][1])) return false; }
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const i = yy * W + xx; if (farmMap.has(i) || pathMap.has(i) || wallSet.has(i) || isRoad(i)) return false; }
    return true;
  });
  if (!p) { g.campFail = yearT; return null; }
  const x0 = p[0] - (C.w >> 1), y0 = p[1] - (C.h >> 1);
  clearSite(g, x0, y0, x0 + C.w - 1, y0 + C.h - 1); g.wood -= 12;
  const c = (g.camps ||= {})[k] = { x0, y0, w:C.w, h:C.h, t:yearT };
  addEffect(p[0] * T + 2, p[1] * T + 3, 'poof');
  notify(`${g.name} levanta ${C.name} a las afueras: ${C.why}`, at);
  return c;
}
// Solar para un campo: el más cercano a las afueras (entre 10 y 36 casillas del centro) donde quepa
function campSite(g, test){
  for (let r = 10; r <= 36; r += 2) for (let k = 0; k < 8 * r; k += 2) {
    const side = Math.floor(k / (2 * r)), s2 = k % (2 * r) - r, x = g.fx + [s2, r, -s2, -r][side], y = g.fy + [-r, s2, r, -s2][side];
    if (x > 2 && y > 2 && x < W - 3 && y < H - 9 && test(x, y)) return [x, y];
  }
  return null;
}
function campSlot(C, k){ const cols = C.w - 2, rows = C.h - 2; return [(C.x0 + 1 + (k % cols)) * T + 2 + (Math.random() - .5) * 2, (C.y0 + 2 + Math.floor(k / cols) % rows) * T + 1]; }
function intern(v, g, k, dur){
  const C = campOf(g, k); if (!C) return;
  releaseTask(v); dismount(v); if (v.actT > 0) { v.actT = 0; v.onDone = null; } v.sleep = false;
  const [x, y] = campSlot(C, campPeople(g, k).length);
  v.camp = { k, vid:g.id, until:yearT + dur, x, y };
  v.task = { k:'detenido', x, y, until:v.camp.until }; v.lastD = Infinity;
}
function freeFromCamp(v){ v.camp = null; if (v.task && v.task.k === 'detenido' && !v.jail) { v.task = null; v.actT = 0; v.onDone = null; } }
// Los presos, con trabajos forzados, cumplen en el campo de trabajo (justicia.js los pone delante de jailSpot)
{ const base = jailSpot; jailSpot = function(g){ const C = hasLaw(g, 'trabajos_forzados') && campOf(g, 'trabajo'); return C ? (C.y0 - 1) * W + C.x0 + (C.w >> 1) : base(g); }; }
function campsTick(g, people, n, at){
  for (const k of Object.keys(CAMP)) {
    const C = campOf(g, k), on = campOn(g, k);
    if (on && !C) { if (k !== 'deport' || people.some(v => v.irreg)) { const c = buildCamp(g, k, at); if (c && k === 'trabajo') for (const u of prisonersOf(g)) { const pol = u.jail.pol; jail(u, g, (u.jail.until - yearT) / DAY_LEN, u.jail.why); u.jail.pol = pol; } } continue; }
    if (!C) continue;
    if (!on) { // la ley ya no está: se libera a todos y, al cabo de un tiempo, se desmantela
      const inside = campPeople(g, k);
      if (inside.length) { for (const u of inside) freeFromCamp(u); notify(k === 'intern' ? `Se abren las puertas del campo de internamiento de ${g.name}: ${inside.length} persona${inside.length > 1 ? 's' : ''} recuperan la libertad` : `${g.name} cierra ${CAMP[k].name} y deja salir a los que había dentro`, at); }
      C.off ??= yearT; if (yearT - C.off > DAY_LEN * 3) { delete g.camps[k]; notify(`En ${g.name} desmantelan ${CAMP[k].name}`, at); }
      continue;
    }
    C.off = null;
  }
  // Los que ya han cumplido su tiempo en el campo; los que alguien ha sacado, vuelven a su sitio
  const deported = new Map();
  for (const v of people) {
    if (!v.camp) continue;
    const C = campOf(g, v.camp.k); if (!C || v.camp.vid !== g.id) { freeFromCamp(v); continue; }
    if (v.camp.until > yearT) { if (!(v.task && v.task.k === 'detenido')) { releaseTask(v); v.task = { k:'detenido', x:v.camp.x, y:v.camp.y, until:v.camp.until }; v.lastD = Infinity; } continue; }
    if (v.camp.k === 'deport') {
      const home = v.irreg && villageById(v.irreg.from), r = home && rels.get(relKey(g, home));
      freeFromCamp(v);
      if (home && popOf(home) && home !== g && !(r && r.war)) { v.irreg = null; exile(v, g, home); deported.set(home.name, (deported.get(home.name) || 0) + 1); }
    } else if (v.camp.k === 'intern' && campOn(g, 'intern')) intern(v, g, 'intern', DAY_LEN * 2);
    else freeFromCamp(v);
  }
  for (const [name, k] of deported) notify(`${g.name} deporta a ${k} persona${k > 1 ? 's' : ''} sin papeles de vuelta a ${name}`, at);
  // Campo de trabajo: los presos pican piedra para el estado
  const tc = campOf(g, 'trabajo');
  if (tc && hasLaw(g, 'trabajos_forzados')) {
    const pr = prisonersOf(g); if (pr.length) { g.stone = (g.stone || 0) + pr.length * .6; g.anger = Math.min(100, (g.anger || 0) + .1); const u = pr[Math.floor(Math.random() * pr.length)]; floats.push({ x:u.x, y:u.y - 12, txt:'⛏', col:'#c8c0b0', life:0 }); }
  }
  // Campo de internamiento: opositores y perseguidos
  if (campOf(g, 'intern') && campOn(g, 'intern')) {
    const gi = govIdeo(g), inside = campPeople(g, 'intern').length;
    const who = people.filter(u => !inCamp(u) && !u.away && !u.boat && !u.slave && u !== g.leader && u !== n.leader && ageOf(u) >= ADULT_H && (Math.abs((u.ideo || 0) - gi) > 1 || (persecutesFaith(g) && otherFaith(u, g)) || (u.jail && u.jail.pol)));
    const go = who.slice(0, Math.min(2, 14 - inside));
    for (const u of go) { if (u.jail) u.jail = null; intern(u, g, 'intern', DAY_LEN * 2); }
    if (go.length) { g.anger = Math.min(100, (g.anger || 0) + go.length); if (yearT - (g.internMsgT ?? -1e9) > DAY_LEN) { g.internMsgT = yearT; notify(`En ${g.name} se llevan a ${go.length === 1 ? go[0].name : go.length + ' personas'} al campo de internamiento por ${go.some(u => otherFaith(u, g)) ? 'su fe' : 'sus ideas'}`, at); } }
    if (inside + go.length) condemn(g, n, 'intern', `Las naciones que defienden los derechos humanos condenan los campos de internamiento de ${n.name}`);
  }
}
// El resto del mundo condena (una vez al día como mucho): peores relaciones con quien defiende los derechos humanos
function condemn(g, n, k, txt){
  const key = 'cond_' + k; if (yearT - (n[key] ?? -1e9) < DAY_LEN) return; n[key] = yearT;
  const judges = villages.filter(o => popOf(o) && nationOf(o) === o && o !== n && (hasLaw(o, 'derechos_humanos') || hasLaw(o, 'abolicion') || ['democracia', 'monarquia_parlamentaria'].includes(regimeOf(o))));
  if (!judges.length) return;
  for (const o of judges) { const r = relOf(n, o); r.v = Math.max(-100, (r.v || 0) - 4); }
  notify(`${txt} (${judges.map(o => o.name).slice(0, 3).join(', ')}${judges.length > 3 ? '…' : ''})`, { x:g.fx * T, y:g.fy * T });
}
// ---- Esclavitud ----
function enslave(v, g, why){
  releaseTask(v); dismount(v); v.irreg = null; v.permit = null; v.slave = { vid:g.id, t:yearT };
  floats.push({ x:v.x, y:v.y - 12, txt:'⛓', col:'#a0a0a8', life:0 });
  notify(`${v.name} es ${sexW(v, 'esclavizado', 'esclavizada')} en ${g.name} ${why}`, { x:v.x, y:v.y });
}
function takeCaptives(win, lose){
  const caps = villagers.filter(u => !u.dead && !u.away && !u.boat && u.vid === lose.id && u !== lose.leader && ageOf(u) >= ADULT_H && !u.slave).sort(() => Math.random() - .5).slice(0, 3);
  if (!caps.length) return;
  for (const u of caps) { u.slave = { vid:win.id, t:yearT }; u.irreg = null; exile(u, lose, win); }
  notify(`${win.name} se lleva a ${caps.length} prisioneros de guerra de ${lose.name} como esclavos`, { x:win.fx * T, y:win.fy * T });
}
{ const base = makePeace; makePeace = function(a, b, r){
  let cap = null;
  try { if (r && r.war && !r.war.civil) { const S = warScore(r); if (S.a && S.d && S.la !== S.ld) { const win = S.la < S.ld ? S.a : S.d; if (slaving(win)) cap = [win, win === S.a ? S.d : S.a]; } } } catch (err) {}
  const out = base.apply(this, arguments); if (cap && popOf(cap[1])) takeCaptives(cap[0], cap[1]); return out;
}; }
function slaveTick(g, people, n, at){
  const sl = people.filter(v => v.slave);
  for (const v of sl) v.slave.vid = g.id;
  if (!sl.length) return;
  if (!slaving(g)) { // abolición: libres
    for (const v of sl) { v.slave = null; v.freed = true; v.permit = { t:yearT, nat:n.id }; }
    notify(`¡En ${g.name} se abole la esclavitud! ${sl.length} persona${sl.length > 1 ? 's recuperan' : ' recupera'} la libertad`, at); return;
  }
  const ec = ecOf(g); for (const v of sl) if ((v.money || 0) > 0) { if (ec) ec.treas += v.money; v.money = 0; } // trabajan sin sueldo: lo que ganan se lo queda el estado
  condemn(g, n, 'slave', `El mundo condena la esclavitud en ${n.name}`);
  // Rebelión: si son muchos y el pueblo está revuelto
  if (sl.length >= 5 && Math.random() < .04 + (g.anger || 0) / 2000) {
    n.abolished = true; for (const v of sl) { v.slave = null; v.freed = true; v.ideo = clamp((v.ideo || 0) - .3, -1, 1); floats.push({ x:v.x, y:v.y - 12, txt:'¡libres!', col:'#f0e0a0', life:0 }); }
    g.anger = Math.min(100, (g.anger || 0) + 12);
    notify(`¡Rebelión de los esclavos en ${g.name}! Rompen sus cadenas y ${n.name} tiene que abolir la esclavitud para siempre`, at); return;
  }
  // Huida: hacia un país donde la esclavitud está prohibida
  if (Math.random() < .06) {
    const v = sl.find(u => !u.away && !u.boat), dest = v && villages.filter(o => popOf(o) && o !== g && nationOf(o) !== n && !slaving(o) && !(rels.get(relKey(g, o)) || {}).war && !hasLaw(o, 'fronteras_cerradas'))
      .sort((a, b) => (hasLaw(b, 'abolicion') - hasLaw(a, 'abolicion')) || (Math.hypot(a.fx - g.fx, a.fy - g.fy) - Math.hypot(b.fx - g.fx, b.fy - g.fy)))[0];
    if (dest) { v.slave = null; v.freed = true; exile(v, g, dest); notify(`${v.name} escapa de la esclavitud en ${g.name} y huye a ${dest.name}`, at); }
  }
}
// ---- Ánimo y ficha ----
{ const base = socialMood; socialMood = function(v, g, add){
  base(v, g, add); if (!g) return;
  if (v.slave) add(-35, 'es ' + sexW(v, 'esclavo', 'esclava'));
  else if (inCamp(v)) add(-30, v.camp.k === 'deport' ? 'espera a que lo deporten' : 'está encerrado en un campo');
  else if (v.irreg) add(-8, 'no tiene papeles');
  else if (v.freed) add(6, 'ha recuperado la libertad');
}; }
function papersKv(v, g){
  const kv = b => `<div class="kv"><span>Papeles</span><b>${b}</b></div>`;
  if (v.slave) { const o = villageById(v.slave.vid); return kv(`<span style="color:#e08070">${sexW(v, 'esclavo', 'esclava')}${o ? ' en ' + esc(o.name) : ''}</span>`); }
  const bits = [];
  if (v.dni) { const o = villageById(v.dni.nat); bits.push(`DNI ${v.dni.n}${o ? ' (' + esc(o.name) + ')' : ''}`); }
  if (v.pass != null) bits.push('pasaporte');
  if (v.irreg) bits.push('<span style="color:#e0a060">sin papeles</span>'); else if (v.permit && v.dni && v.dni.nat !== v.permit.nat) bits.push('permiso de residencia');
  if (inCamp(v)) bits.push(`<span style="color:#e08070">${v.camp.k === 'deport' ? 'en el centro de internamiento' : v.camp.k === 'intern' ? 'en un campo de internamiento' : 'en el campo de trabajo'}</span>`);
  return bits.length ? kv(bits.join(' · ')) : g && knowsSci(g, 'registro_civil') ? kv('aún sin DNI') : '';
}
// Grilletes de los esclavos y de los encerrados (desde drawVillagers)
{ const base = drawPersonExtras; drawPersonExtras = function(v, x, y, s, now){
  base(v, x, y, s, now);
  if (v.slave || inCamp(v) || (v.jail && v.jail.until > yearT)) { vctx.fillStyle = '#3a3a40'; vctx.fillRect(x - 2, y, 5, 1); vctx.fillStyle = '#9a9aa0'; vctx.fillRect(x - 2, y, 1, 1); vctx.fillRect(x + 2, y, 1, 1); }
}; }
// ---- Dibujo de los campos: cerca con alambre, barracones, torre de vigilancia y, en el de trabajo, la cantera ----
function drawPrisonCamps(now){
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const g of villages) {
    if (!g.camps) continue; const n = nationOf(g);
    for (const [k, C] of Object.entries(g.camps)) {
      const px = C.x0 * T, py = C.y0 * T, w = C.w * T, h = C.h * T;
      if (px > vx1 + 10 || py > vy1 + 10 || px + w < vx0 - 10 || py + h < vy0 - 20) continue;
      vctx.fillStyle = k === 'trabajo' ? 'rgba(130,118,100,.75)' : 'rgba(118,104,82,.7)'; vctx.fillRect(px, py, w, h); // tierra pisada
      if (k === 'trabajo') { // la cantera: bloques y un montón de piedra
        vctx.fillStyle = '#22201e'; vctx.fillRect(px + w - 13, py + h - 9, 10, 6); vctx.fillStyle = '#9a968e'; vctx.fillRect(px + w - 12, py + h - 8, 8, 4); vctx.fillStyle = '#c8c4b8'; vctx.fillRect(px + w - 12, py + h - 8, 3, 1); vctx.fillRect(px + w - 8, py + h - 7, 2, 1);
        vctx.fillStyle = '#7a766e'; for (let j = 0; j < 4; j++) vctx.fillRect(px + 4 + j * 4, py + h - 5, 3, 2);
      }
      const nb = k === 'deport' ? 1 : 2; // barracones de madera oscura
      for (let j = 0; j < nb; j++) {
        const bx = px + 3 + j * 17, by = py + 7;
        vctx.fillStyle = '#22201e'; vctx.fillRect(bx - 1, by - 7, 15, 8); vctx.fillStyle = k === 'deport' ? '#8a8e94' : '#6a5440'; vctx.fillRect(bx, by - 4, 13, 4);
        vctx.fillStyle = k === 'deport' ? '#5a6068' : '#4a3a2c'; vctx.fillRect(bx, by - 6, 13, 2); vctx.fillStyle = '#2a2420'; vctx.fillRect(bx + 6, by - 3, 2, 3);
        vctx.fillStyle = '#d8c070'; if (isNight()) { vctx.fillRect(bx + 2, by - 3, 1, 1); vctx.fillRect(bx + 10, by - 3, 1, 1); }
      }
      // torre de vigilancia en una esquina
      const tx = px + w - 3, ty = py + 2;
      vctx.fillStyle = '#4a3a28'; vctx.fillRect(tx - 3, ty - 9, 1, 10); vctx.fillRect(tx + 1, ty - 9, 1, 10);
      vctx.fillStyle = '#22201e'; vctx.fillRect(tx - 4, ty - 12, 7, 4); vctx.fillStyle = '#7a5a38'; vctx.fillRect(tx - 3, ty - 11, 5, 2);
      vctx.fillStyle = '#3a3028'; vctx.fillRect(tx - 4, ty - 14, 7, 2);
      if (isNight()) { const a = now / 900 + C.x0; vctx.fillStyle = 'rgba(255,240,180,.12)'; vctx.beginPath(); vctx.moveTo(tx, ty - 10); vctx.lineTo(tx + Math.cos(a) * 26 - 5, ty - 10 + 22); vctx.lineTo(tx + Math.cos(a) * 26 + 5, ty - 10 + 22); vctx.fill(); } // el foco
      if (n.flag) drawFlag(n.flag, tx, ty - 20, 6, 4, 1, now); else { vctx.fillStyle = `rgb(${villageColor(n).join(',')})`; vctx.fillRect(tx, ty - 20, 6, 4); }
      vctx.fillStyle = '#4a3a28'; vctx.fillRect(tx - 1, ty - 20, 1, 6);
      // cerca: postes y alambre (con espino), con la puerta abajo en medio
      const gate0 = px + (w >> 1) - 3, gate1 = gate0 + 6;
      vctx.fillStyle = '#9a9aa2';
      vctx.fillRect(px, py, w, 1); vctx.fillRect(px, py + 2, w, 1); vctx.fillRect(px, py, 1, h); vctx.fillRect(px + w - 1, py, 1, h);
      vctx.fillRect(px, py + h - 1, gate0 - px, 1); vctx.fillRect(gate1, py + h - 1, px + w - gate1, 1); vctx.fillRect(px, py + h - 3, gate0 - px, 1); vctx.fillRect(gate1, py + h - 3, px + w - gate1, 1);
      vctx.fillStyle = '#4a3a28';
      for (let x = px; x <= px + w - 1; x += 4) { vctx.fillRect(x, py - 2, 1, 5); if (x < gate0 || x > gate1) vctx.fillRect(x, py + h - 4, 1, 5); }
      for (let y = py; y <= py + h; y += 4) { vctx.fillRect(px, y - 2, 1, 4); vctx.fillRect(px + w - 1, y - 2, 1, 4); }
      vctx.fillStyle = '#5a4a38'; vctx.fillRect(gate0, py + h - 5, 1, 6); vctx.fillRect(gate1, py + h - 5, 1, 6); vctx.fillRect(gate0, py + h - 6, 7, 1); // la puerta
    }
  }
}
