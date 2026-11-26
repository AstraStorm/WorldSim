// World Sim · Agencias espaciales: cada nación con cohetería funda la suya y lleva el programa como una agencia de verdad
// ================= Agencias espaciales =================
// · Al descubrir la cohetería, la nación funda su agencia (nombre y siglas). Hay una sola lanzadera por nación y es de la
//   agencia: aunque esté junto a otra ciudad, la nación sea un imperio con provincias o la lanzadera venga de una ciudad
//   conquistada o de una antigua capital, la usan todas bajo la agencia nacional
// · El programa va por pasos: primero prueban los motores en tierra (encienden y apagan sin despegar), luego un vuelo
//   suborbital (salir de la atmósfera y caer al mar) y luego la primera órbita. Hasta entonces, nada de misiones
// · Cada modelo de cohete nuevo hace un vuelo de prueba sin carga antes de llevar satélites, estaciones o colonos
// · Pestaña «Espacio» en la ficha de cada ciudad de la nación: la agencia, su lanzadera, el programa, los cohetes (intentos y
//   fiabilidad) y el historial de lanzamientos
const AG_KIND = ['Agencia Espacial', 'Instituto Aeroespacial', 'Programa Espacial', 'Centro de Vuelos Espaciales', 'Oficina del Espacio'];
const SPACE_TESTS = ['motores', 'suborbital', 'orbital'];
Object.assign(MISSION_TXT, { motores:'probar los motores en tierra', suborbital:'vuelo suborbital (salir de la atmósfera)', orbital:'dar la primera vuelta en órbita', prueba:'vuelo de prueba sin carga' });
const isSpaceTest = m => SPACE_TESTS.includes(m) || m === 'prueba';
const agencyOf = g => { const n = g && nationOf(g); return n && n.agency || null; };
function agencyName(n){
  const kind = AG_KIND[hashStr(n.name + 'agencia') % AG_KIND.length];
  const abbr = (kind.split(' ').filter(w => !['de', 'del'].includes(w)).map(w => w[0]).join('') + n.name[0]).toUpperCase();
  return { name:`${kind} de ${n.name}`, abbr };
}
// La ciudad de la nación más cercana a la lanzadera (donde «está» la base)
const padTown = n => { if (n.spacePad == null) return null; const x = n.spacePad % W, y = (n.spacePad / W) | 0; return liveTowns().filter(o => nationOf(o) === n).sort((a, b) => Math.hypot(a.fx - x, a.fy - y) - Math.hypot(b.fx - x, b.fy - y))[0] || n; };
function agencyLog(g, R, ok, why){
  const A = g.agency; if (!A) return;
  (A.log ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, k:R.k, m:R.m, ok, why:why || null, n:R.try || 1 }); if (A.log.length > 60) A.log.shift();
}
let agencyT = 0;
SYSTEMS.push(dt => {
  if (!world || (agencyT -= dt) > 0) return; agencyT = 4;
  for (const n of liveTowns()) {
    if (nationOf(n) !== n || !knowsSci(n, 'coheteria')) continue;
    if (!n.agency) {
      const { name, abbr } = agencyName(n); n.agency = { name, abbr, since:Math.floor(yearT / DAY_LEN) + 1, stage:(n.rocketXP || 0) >= 3 ? 3 : 0, log:[] }; // (partidas de antes: si ya volaban, el programa de pruebas está hecho)
      notify(`${n.name} funda la ${name} (${abbr}): se encargará de todo su programa espacial, desde la primera prueba de motores`, { x:n.fx * T, y:n.fy * T });
    }
    // Una sola lanzadera por nación: si la tiene otra de sus ciudades (una antigua capital, una provincia conquistada…), pasa a la agencia
    if (!padOf(n)) {
      const o = liveTowns().find(q => q !== n && nationOf(q) === n && padOf(q)); if (!o) continue;
      n.spacePad = o.spacePad; o.spacePad = null; world.objs[n.spacePad].vid = n.id;
      n.rocketXP = Math.max(n.rocketXP || 0, o.rocketXP || 0);
      for (const f of ['rocketTry']) { const a = n[f] ||= {}; for (const k in o[f] || {}) a[k] = Math.max(a[k] || 0, o[f][k]); }
      for (const f of ['rocketOk', 'rocketWin']) Object.assign(n[f] ||= {}, o[f] || {});
      if (o.agency && (o.agency.stage || 0) > (n.agency.stage || 0)) n.agency.stage = o.agency.stage;
      notify(`La lanzadera de ${o.name} pasa a la ${n.agency.abbr}: desde ahora la usa toda la nación de ${n.name}`, { x:(n.spacePad % W) * T, y:((n.spacePad / W) | 0) * T });
    }
  }
});
// Qué mision toca: las pruebas del programa por orden; luego, con cada modelo nuevo, un vuelo de prueba sin carga
{ const base = rocketMission; rocketMission = function(g, k){
  const A = g.agency; if (A && (A.stage || 0) < 3) return SPACE_TESTS[A.stage || 0];
  if (A && !(g.rocketWin || {})[k]) return 'prueba';
  return base.apply(this, arguments);
}; }
{ const base = rocketSuccess; rocketSuccess = function(R, g){
  base.apply(this, arguments); agencyLog(g, R, true);
  const A = g.agency; if (!A) return; const at = { x:R.x0, y:R.y0 }, mdl = ROCKETS[R.k].n.toLowerCase();
  if (R.m === 'motores' && (A.stage || 0) === 0) { A.stage = 1; notify(`La ${A.abbr} prueba los motores del ${mdl} en tierra: encienden, rugen unos segundos y se apagan sin problemas. Siguiente paso: salir de la atmósfera`, at); }
  else if (R.m === 'suborbital' && A.stage === 1) { A.stage = 2; notify(`¡El ${mdl} de la ${A.abbr} sale de la atmósfera! Vuelo suborbital: sube por encima del cielo y cae al mar. Siguiente paso: la órbita`, at); }
  else if (R.m === 'orbital' && A.stage === 2) { A.stage = 3; notify(`¡La ${A.abbr} pone su primer cohete en órbita! Da la vuelta a la Tierra: ${g.name} ya está lista para misiones de verdad`, at); if (typeof sendNews === 'function') sendNews(g, `la ${A.name} ha puesto su primer cohete en órbita`); }
  if (A.stage >= 3) (g.rocketWin ||= {})[R.k] = true; // (el modelo ya ha volado bien: puede llevar carga)
  if (R.m === 'prueba') notify(`Vuelo de prueba del nuevo ${mdl} de la ${A.abbr}: llega arriba sin carga y sin problemas. Ya puede llevar misiones`, at);
}; }
{ const base = rocketBoom; rocketBoom = function(R, g){ agencyLog(g, R, false, R.alt < 20 ? 'plataforma' : 'vuelo'); return base.apply(this, arguments); }; }
// ---- Pestaña «Espacio» en la ficha ----
const PAD_NAME = ['Sin lanzadera', 'Lanzadera', 'Lanzadera mejorada', 'Puerto espacial'];
function spaceTab(g){
  const n = nationOf(g), A = n.agency;
  if (!A) return `<div class="muted">${esc(n.name)} aún no tiene agencia espacial: hace falta descubrir la cohetería.</div>`;
  const L = A.log || [], ok = L.filter(e => e.ok).length, lv = padOf(n), pt = padTown(n), stage = A.stage || 0;
  let h = `<h4>${esc(A.name)} (${esc(A.abbr)})</h4><div>Fundada el día ${A.since}${n !== g ? ` · ${esc(g.name)} forma parte de ${esc(n.name)}: usa la lanzadera de la agencia nacional` : ''}${lv && pt ? ` · base junto a <button class="lnk" data-vid="${pt.id}">${esc(pt.name)}</button>` : ''}</div>`;
  h += `<div class="tiles">${tile('Lanzamientos', L.length, `${ok} con éxito`)}${tile('Fiabilidad', L.length ? `${Math.round(ok / L.length * 100)} %` : '—', 'de todos')}${tile('Satélites', n.sats || 0, 'en órbita')}${tile('Base', PAD_NAME[lv], '')}</div>`;
  const step = (t, done, cur) => `<span class="${done ? '' : 'off'}" title="${cur ? 'ahora' : ''}">${done ? '✓' : cur ? '▶' : '·'} ${t}</span>`;
  h += `<h4>Programa</h4><div class="chips">${step('Prueba de motores', stage > 0, stage === 0)}${step('Vuelo suborbital', stage > 1, stage === 1)}${step('Primera órbita', stage > 2, stage === 2)}${step('Satélites', (n.sats || 0) > 0, false)}${step('Estación espacial', !!n.station, false)}${step('Hidroponía', !!n.hydro, false)}${step('Defensa planetaria', !!n.shield, false)}${step(`Luna${n.moon ? ` (${n.moon})` : ''}`, !!n.moon, false)}${step(`Marte${n.mars ? ` (${n.mars})` : ''}`, !!n.mars, false)}</div>`;
  const rows = Object.entries(ROCKETS).filter(([k, R]) => R.need.every(s => knowsSci(n, s)) || (n.rocketTry || {})[k]);
  h += `<h4>Cohetes</h4>` + (rows.length ? `<div class="laws">${rows.map(([k, R]) => { const tries = (n.rocketTry || {})[k] || 0, risk = Math.round(rocketRisk(n, k, knowsSci(n, 'combustible_liquido')) * 100);
    return `<div><b>${esc(R.n)}</b><span class="muted">${tries ? `${tries} intento${tries === 1 ? '' : 's'} · ` : 'sin estrenar · '}${(n.rocketOk || {})[k] ? '✓ fiable' : `riesgo de fallo ${risk} %`}${(R.pad || 1) > lv ? ` · necesita ${PAD_NAME[R.pad || 1].toLowerCase()}` : ''}</span></div>`; }).join('')}</div>` : '<div class="muted">Ninguno todavía</div>');
  h += `<h4>Historial</h4>` + (L.length ? `<ul class="log">${L.slice(-15).reverse().map(e => `<li class="${e.ok ? '' : 'war'}"><span class="d">día ${e.d}</span>${e.ok ? '✓' : '💥'} ${esc(ROCKETS[e.k].n)} · ${esc(MISSION_TXT[e.m] || e.m)}${e.n > 1 ? ` (intento ${e.n})` : ''}${e.ok ? '' : e.why === 'plataforma' ? ': explota en la plataforma' : ': explota en vuelo'}</li>`).join('')}</ul>` : '<div class="muted">Aún no han lanzado nada</div>');
  return h;
}
{ const i = CARD_TABS.findIndex(t => t[0] === 'ciencia'); if (!CARD_TABS.some(t => t[0] === 'espacio')) CARD_TABS.splice(i < 0 ? CARD_TABS.length : i + 1, 0, ['espacio', 'Espacio']); }
