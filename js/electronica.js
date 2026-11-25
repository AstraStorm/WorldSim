// World Sim · Electrónica y comunicaciones: chips, ordenadores, móviles, antenas e internet
// ================= Electrónica =================
// · Ciencia: «la electrónica» (electricidad + plástico) → «las telecomunicaciones» (antenas y parabólicas) y «los chips» →
//   «los ordenadores» → «los teléfonos móviles» e «internet» (ordenadores + telecomunicaciones)
// · Con corriente, un pueblo con telecomunicaciones levanta antenas de telefonía (cada una da cobertura a 18 casillas) y una
//   antena parabólica (la que lo une con el resto del mundo): la «conectividad» es cuánta gente tiene cobertura
// · Con chips y plástico, en los pueblos con corriente se fabrican chips; con ordenadores, ordenadores; con móviles, cada
//   nación saca de vez en cuando un modelo de teléfono con nombre inventado en su lengua y sus características, que mejoran
//   con su ciencia. Los venden a los pueblos de otras naciones que no los fabrican (dinero para el tesoro)
// · Internet: se investiga un 20 % más y la gente está más contenta... mientras haya conexión: sin luz o sin cobertura
//   (dependencia), enfado. Menú «Móviles»: todos los modelos del mundo, dibujados, con sus datos
// · Leyes: «neutralidad de la red», «censura en internet», «protección de datos». Tratados: «itinerancia» (roaming) y
//   «acuerdo tecnológico» (comparten chips y conocimientos)
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i + 1, 0, { ...d, req:d.req.filter(k => DISCOVERIES.some(x => x.k === k)) }); if (typeof SCI_REQ === 'object') SCI_REQ[d.k] = d.req; };
  add('renovables', { k:'electronica', txt:'la electrónica', cost:150, eff:'válvulas y circuitos: el camino a las telecomunicaciones y los chips', req:['electricidad', 'plastico'] });
  add('electronica', { k:'telecomunicaciones', txt:'las telecomunicaciones', cost:140, eff:'antenas de telefonía y parabólicas: cobertura en la ciudad', req:['electronica'] });
  add('telecomunicaciones', { k:'chips', txt:'los chips', cost:170, eff:'circuitos diminutos: se fabrican chips en los pueblos con corriente', req:['electronica'] });
  add('chips', { k:'ordenadores', txt:'los ordenadores', cost:180, eff:'máquinas de calcular: más ciencia y oficinas', req:['chips'] });
  add('ordenadores', { k:'moviles', txt:'los teléfonos móviles', cost:170, eff:'cada nación diseña sus móviles y los vende por el mundo', req:['ordenadores', 'telecomunicaciones'] });
  add('moviles', { k:'internet', txt:'internet', cost:190, eff:'todo el mundo conectado: más ciencia y más contento... mientras haya conexión', req:['ordenadores', 'telecomunicaciones'] });
})();
BLD.add('tele'); BUILD_DIMS.tele = [1, 4];
OBJ['tele:antena'] = ['Antena de telefonía', 'house', 0]; OBJ['tele:parabolica'] = ['Antena parabólica', 'house', 0];
Object.assign(BLD_DESC, { tele:'Telecomunicaciones: la antena da cobertura a los móviles de alrededor; la parabólica une la ciudad con el resto del mundo' });
Object.assign(BLD_TYPE, { tele:'Comunicaciones' });
const teleOf = g => (g.tele ||= []).filter(t => world.objs[t.i]);
const TELE_R = 26; // (las antenas, en las afueras, cubren desde allí todo su lado del pueblo)
// Conectividad: fracción de casas con cobertura (y con parabólica para internet)
function connOf(g){
  const T0 = teleOf(g).filter(t => t.k === 'antena'); if (!T0.length) return 0;
  const hs = housesOf(g); if (!hs.length) return 0; const on = typeof powered === 'function' ? powered(g).on : true; if (!on) return 0;
  return hs.filter(h => T0.some(t => Math.hypot(t.i % W - h % W, ((t.i / W) | 0) - ((h / W) | 0)) <= TELE_R)).length / hs.length;
}
const hasDish = g => teleOf(g).some(t => t.k === 'parabolica');
let teleT = 0;
SYSTEMS.push(dt => {
  if (!world || (teleT -= dt) > 0) return; teleT = 4;
  for (const g of liveTowns()) {
    const n = nationOf(g), on = typeof powered === 'function' && powered(g).on, at = { x:g.fx * T, y:g.fy * T };
    // Antenas: hasta cubrir todas las casas (y una parabólica)
    if (knowsSci(g, 'telecomunicaciones') && on && (g.iron || 0) >= 3 && g.stone >= 4 && (g.teleT || 0) < yearT - 10) {
      g.teleT = yearT; const need = !hasDish(g) ? 'parabolica' : connOf(g) < .95 ? 'antena' : null;
      if (need) {
        const ants = teleOf(g).filter(t => t.k === 'antena'), uncovered = housesOf(g).filter(h => !ants.some(t => Math.hypot(t.i % W - h % W, ((t.i / W) | 0) - ((h / W) | 0)) <= TELE_R));
        // en las afueras, del lado de las casas sin cobertura (nunca en mitad del pueblo)
        const tgt = need === 'antena' && uncovered.length ? uncovered[Math.floor(Math.random() * uncovered.length)] : null, reach = housesOf(g).reduce((m, h) => Math.max(m, Math.hypot(h % W - g.fx, ((h / W) | 0) - g.fy)), 0);
        const ang = tgt != null ? Math.atan2(((tgt / W) | 0) - g.fy, tgt % W - g.fx) : Math.random() * Math.PI * 2, rr = Math.max(6, reach * (tgt != null ? .8 : 1) + 3);
        const p = ringFind(Math.round(g.fx + Math.cos(ang) * rr), Math.round(g.fy + Math.sin(ang) * rr), 8, (x, y) => tileFree(x, y) && !pathMap.has(y * W + x) && !plazaSet.has(y * W + x) && !wallSet.has(y * W + x) && (typeof clearOfBuildings !== 'function' || clearOfBuildings(x, y, 2)) && !plotIn(x, y, x, y));
        if (p) { const i = p[1] * W + p[0]; farmMap.delete(i); world.objs[i] = { key:`tele:${need}`, v:0, ox:0, oy:0, vid:g.id }; g.tele.push({ i, k:need }); g.iron -= 3; g.stone -= 4; composeRegion(p[0] - 4, p[1] - 8, p[0] + 4, p[1] + 2); addEffect(p[0] * T + 2, p[1] * T + 3, 'poof');
          if (!g.teleMsg) { g.teleMsg = true; notify(`${g.name} levanta su primera ${need === 'parabolica' ? 'antena parabólica' : 'antena de telefonía'}: la ciudad empieza a estar conectada`, { x:p[0] * T, y:p[1] * T }); } }
      }
    }
    // Fábrica de chips y ordenadores (en el pueblo, con corriente)
    if (on && knowsSci(g, 'chips') && (g.plastic || 0) >= .5 && (g.iron || 0) >= 1) { g.plastic -= .5; g.iron -= .3; g.chips = (g.chips || 0) + 2; if (!g.chipMsg) { g.chipMsg = true; notify(`En ${g.name} fabrican sus primeros chips`, at); } }
    if (on && knowsSci(g, 'ordenadores') && (g.chips || 0) >= 2) { g.chips -= 2; g.computers = (g.computers || 0) + 1; }
    if (on && knowsSci(g, 'moviles') && (g.chips || 0) >= 1 && (g.computers || 0) >= 3 && (g.plastic || 0) >= .3) { g.chips -= 1; g.plastic -= .3; g.phones = (g.phones || 0) + 2; }
    // Un modelo de móvil nuevo (por nación, cada pocos días)
    if (n === g && knowsSci(g, 'moviles') && (g.phones || 0) > 0 && (!n.phoneT || yearT - n.phoneT > DAY_LEN * 3)) { n.phoneT = yearT; newPhone(n); }
    // Vender móviles a otras naciones (que no los fabrican)
    if ((g.phones || 0) >= 4 && g.coin) for (const o of liveTowns()) { if (o === g || nationOf(o) === n || knowsSci(o, 'moviles') || !o.coin || atWar(o, g)) continue; if (Math.random() < .2) { g.phones -= 2; o.phonesIn = (o.phonesIn || 0) + 2; const eg = ecOf(g), eo = ecOf(o); if (eg && eo) { eo.treas -= 4; eg.treas += 4; } break; } }
    // Internet: más ciencia y más contentos... con conexión (si no, enfado: ya dependen de ella)
    if (knowsSci(g, 'internet')) { const c = connOf(g) * (hasDish(g) ? 1 : .5); if (c > .5) g.anger = Math.max(0, (g.anger || 0) - .2 * c); else if (g.wasOnline) { g.anger = (g.anger || 0) + .6; if (!(g.offMsg > yearT - DAY_LEN)) { g.offMsg = yearT; notify(`${g.name} se queda sin conexión: la gente, que ya no sabe vivir sin internet, se enfada`, at); } } if (c > .5) g.wasOnline = true; }
  }
});
{ const base = research; research = function(g, pts){ const c = knowsSci(g, 'internet') ? connOf(g) * (hasDish(g) ? 1 : .5) : 0; return base.call(this, g, pts * (1 + .2 * c) * ((g.computers || 0) > 10 ? 1.1 : 1)); }; }
// ---- Los móviles: nombre inventado en la lengua de la nación y características según su ciencia ----
function newPhone(n){
  const L = langList()[villageLang(n)], P = L && L.phon, r = Math.random;
  let brand = n.phoneBrand; if (!brand) { let w = P ? langWord(P, 2, r) : 'nova'; w = w.replace(/[aeiou]$/, '') + ['ix', 'on', 'a', 'o', 'ia', 'us'][Math.floor(r() * 6)]; brand = n.phoneBrand = capFirst(w); }
  const sci = DISCOVERIES.filter(d => knowsSci(n, d.k)).length, gen = (n.phoneGen = (n.phoneGen || 0) + 1), age = Math.floor(yearT / DAY_LEN) + 1;
  const model = { brand, name:`${brand} ${['', 'S', 'X', 'Pro', 'Max', 'Neo', 'Ultra'][gen % 7]} ${gen + Math.floor(r() * 3)}`.replace(/\s+/g, ' '), nat:n.id, natName:n.name, day:age,
    // poco a poco: los primeros, de pantalla pequeña, con unos KB de memoria y sin cámara; cada modelo, algo mejor
    screen:+Math.min(7.2, 1.4 + gen * .28 + r() * .2).toFixed(1), memKB:Math.round(16 * 2 ** Math.min(26, gen - 1 + Math.floor(r() * 1.4))), bat:Math.round(gen < 4 ? 60 + r() * 40 : 8 + gen * 1.5 + r() * 6), cam:gen < 3 ? 0 : +Math.min(200, .3 * 1.7 ** (gen - 3) * (1 + r() * .3)).toFixed(gen < 7 ? 1 : 0), price:Math.round(60 + gen * 25 + r() * 40),
    col:villageColor(n), seed:Math.floor(r() * 1e6) };
  (world.phones ||= []).push(model); if (world.phones.length > 60) world.phones.shift();
  notify(`${n.name} presenta el móvil ${model.name}: pantalla de ${model.screen}", ${fmtMem(model)}, ${model.cam ? `cámara de ${model.cam} Mpx` : 'sin cámara'} y ${model.bat} h de batería`, { x:n.fx * T, y:n.fy * T });
}
// La memoria, en KB, MB o GB (los guardados antes la tenían en GB)
function fmtMem(m){ const kb = m.memKB ?? (m.mem || 0) * 1048576; return kb >= 1048576 ? `${+(kb / 1048576).toFixed(kb < 1048576 * 10 ? 1 : 0)} GB` : kb >= 1024 ? `${+(kb / 1024).toFixed(kb < 10240 ? 1 : 0)} MB` : `${kb} KB`;
}
function phoneImg(m){
  const c = document.createElement('canvas'); c.width = 60; c.height = 104; const x = c.getContext('2d'), [r, g, b] = m.col, rr = (X, Y, w, h, rad, f) => { x.fillStyle = f; x.beginPath(); x.roundRect(X, Y, w, h, rad); x.fill(); };
  rr(4, 2, 52, 100, 9, '#1c1c22'); rr(6, 4, 48, 96, 8, `rgb(${r},${g},${b})`); rr(8, 10, 44, 82, 4, '#0e1420');
  const gr = x.createLinearGradient(8, 10, 52, 92); gr.addColorStop(0, `rgba(${r},${g},${b},.6)`); gr.addColorStop(1, 'rgba(20,40,80,.9)'); rr(9, 11, 42, 80, 3, gr);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.fillText(String(Math.floor(m.day % 24)).padStart(2, '0') + ':' + String(m.seed % 60).padStart(2, '0'), 30, 30);
  for (let k = 0; k < 8; k++) { x.fillStyle = `hsla(${(m.seed + k * 47) % 360},60%,60%,.9)`; x.fillRect(13 + (k % 4) * 9, 44 + Math.floor(k / 4) * 11, 7, 7); } // iconos
  x.fillStyle = '#05070a'; x.beginPath(); x.arc(30, 7, 1.5, 0, Math.PI * 2); x.fill(); // cámara delantera
  return c.toDataURL();
}
// Menú «Móviles» (en la barra de arriba)
(() => {
  const bar = document.getElementById('saveBtn'); if (!bar) return;
  const btn = document.createElement('button'); btn.id = 'phoneBtn'; btn.dataset.ic = '📱'; btn.title = 'Los móviles que ha sacado cada nación'; btn.textContent = 'Móviles'; bar.before(btn);
  const panel = document.createElement('div'); panel.className = 'chron'; panel.id = 'phonePanel'; panel.hidden = true; document.getElementById('savePanel').after(panel);
  const render = () => { const L = (world && world.phones || []).slice().reverse();
    panel.innerHTML = `<div class="ch-h"><b>Móviles del mundo</b><button class="x" aria-label="Cerrar">×</button></div><div class="hp-body">${L.length ? `<div class="phones">${L.map(m => `<div class="phone"><img src="${phoneImg(m)}" alt=""><div><b>${esc(m.name)}</b><span class="muted">${esc(m.natName)} · día ${m.day}</span><span>Pantalla ${m.screen}" · ${fmtMem(m)}</span><span>${m.cam ? `Cámara ${m.cam} Mpx` : 'Sin cámara'} · ${m.bat} h de batería</span><span>${m.price} monedas</span></div></div>`).join('')}</div>` : '<p class="muted">Todavía nadie ha inventado el teléfono móvil.</p>'}</div>`; };
  btn.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) { for (const id of ['chron', 'histPanel', 'sndPanel', 'savePanel']) { const e = document.getElementById(id); if (e) e.hidden = true; } render(); } };
  panel.addEventListener('click', e => { if (e.target.closest('.x')) panel.hidden = true; });
})();
// ---- Leyes y tratados ----
Object.assign(LAW_TXT, { neutralidad_red:'neutralidad de la red', censura_internet:'censura en internet', proteccion_datos:'protección de datos' });
Object.assign(LAW_DESC, { neutralidad_red:'todo lo que circula por la red vale lo mismo: la gente, más contenta', censura_internet:'el gobierno vigila y corta lo que no le gusta: menos protestas, más enfado callado', proteccion_datos:'nadie puede vender lo que sabe de ti: confianza, pero los móviles se venden algo menos' });
Object.assign(LAW_LEAN, { neutralidad_red:-.4, censura_internet:.75, proteccion_datos:-.3 });
LAW_CLASH.push(['neutralidad_red', 'censura_internet']);
Object.assign(LAW_REQ, { neutralidad_red:g => knowsSci(g, 'internet'), censura_internet:g => knowsSci(g, 'internet'), proteccion_datos:g => knowsSci(g, 'moviles') });
Object.assign(LAW_WHY, { neutralidad_red:'ahora que hay internet', censura_internet:'ahora que hay internet', proteccion_datos:'ahora que hay móviles' });
REGIME_LAWS.dictadura && REGIME_LAWS.dictadura.push('censura_internet');
{ const base = lawsTick; lawsTick = function(g, dt, people){ const due = (g.lawsT ?? 0) - dt <= 0; base.apply(this, arguments); if (!due) return; if (hasLaw(g, 'neutralidad_red')) g.anger = Math.max(0, (g.anger || 0) - .1); if (hasLaw(g, 'censura_internet')) g.anger = Math.max(0, (g.anger || 0) - .2); }; }
Object.assign(TREATY, { roaming:{ n:'acuerdo de itinerancia', days:[6, 10], icon:'📶' }, tecnologia:{ n:'acuerdo tecnológico', days:[6, 10], icon:'💾' } });
{ const base = treatyTick; treatyTick = function(a, b, r){
  base.apply(this, arguments); if (!r.known || r.war) return;
  if (hasTreaty(r, 'roaming')) r.v = Math.min(100, r.v + .1);
  if (hasTreaty(r, 'tecnologia')) { r.v = Math.min(100, r.v + .1); for (const [s, c] of [[a, b], [b, a]]) if ((s.chips || 0) > 4 && (c.chips || 0) < 2) { s.chips -= 1; c.chips = (c.chips || 0) + 1; } }
  if (Math.random() > .5) return;
  if (!hasTreaty(r, 'roaming') && r.v > 25 && hasDish(a) && hasDish(b) && Math.random() < .04) signTreaty(a, b, r, 'roaming');
  else if (!hasTreaty(r, 'tecnologia') && r.v > 35 && knowsSci(a, 'chips') && knowsSci(b, 'electronica') && Math.random() < .03) signTreaty(a, b, r, 'tecnologia');
}; }
