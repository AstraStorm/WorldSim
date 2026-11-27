// World Sim · Contaminación y cambio climático
// ================= Clima del planeta =================
// · Emisiones (cada día): fábricas, centrales de carbón encendidas, refinerías, aeródromos y ciudades industriales echan
//   CO₂ al aire (world.co2, empieza en 280 ppm). Las renovables y las leyes (aire limpio, impuesto al carbón, límite de
//   emisiones) lo bajan; los bosques y el mar absorben parte de lo que sobra.
// · Calentamiento (world.warm, en °C): unos 3 °C por cada vez que se dobla el CO₂. Se suma a la temperatura de todo el mapa
//   (tempAt): veranos más duros, menos nieve… Con más calor, más DANAs en la costa (fenomenos.js).
// · Subida del mar (world.seaRise, en cm): cada 10 cm, el mar se come las playas más bajas; lo que haya construido en la
//   orilla se daña.
// · Cumbres del clima: cuando el calentamiento ya se nota, las naciones con electricidad se reúnen y firman (o no) un
//   acuerdo para emitir menos (world.climate). Quien firma y no cumple queda mal con los demás.
// · Ley nueva: «límite de emisiones» (las fábricas contaminan la mitad, pero producen algo menos y cuestan más).
Object.assign(LAW_TXT, { limite_emisiones:'límite de emisiones' });
Object.assign(LAW_DESC, { limite_emisiones:'las fábricas y centrales tienen que contaminar la mitad: filtros caros, algo menos de producción' });
Object.assign(LAW_LEAN, { limite_emisiones:-.4 });
Object.assign(LAW_REQ, { limite_emisiones:g => natAny(g, o => facsOf(o).length > 0 || hasPower(o)) });
Object.assign(LAW_WHY, { limite_emisiones:'ahora que hay fábricas' });
{ const c = typeof LAW_CATS !== 'undefined' && LAW_CATS.find(c => c[0] === 'natura'); if (c) c[3].push('limite_emisiones'); }
CONST_KINDS && CONST_KINDS.add && CONST_KINDS.add('limite_emisiones');

const CO2_0 = 280;
const warmOf = co2 => 3 * Math.log2(Math.max(1, co2) / CO2_0);
// Lo que echa al aire un pueblo en un día
function emitOf(g){
  let e = facsOf(g).length * 1;
  if (hasPower(g) && !g.plantOff && !(hasLaw(g, 'aire_limpio') && renewOf(g).length >= 4)) e += 3;
  if (typeof hasRefinery === 'function' && hasRefinery(g)) e += 2;
  if (typeof hasAirfield === 'function' && hasAirfield(g)) e += 1;
  if (knowsSci(g, 'vapor')) e += popOf(g) / 60;
  if (knowsSci(g, 'combustion')) e += popOf(g) / 80;
  e -= renewOf(g).length * .4;
  if (hasLaw(g, 'limite_emisiones')) e *= .5;
  if (hasLaw(g, 'impuesto_carbon')) e *= .85;
  return Math.max(0, e);
}
// Cuánto bosque queda (se cuenta de vez en cuando: recorrer el mapa cuesta)
function forestShare(){
  const C = world.climCache ||= {}; if (C.t != null && yearT - C.t < DAY_LEN * 2 && yearT >= C.t) return C.f;
  let n = 0, land = 0; for (let i = 0; i < N; i += 7) { if (WATER[world.biome[i]]) continue; land++; const o = world.objs[i]; if (o && OBJ[o.key] && OBJ[o.key][1] === 'tree') n++; }
  C.t = yearT; C.f = land ? n / land : .2; return C.f;
}
function climateDay(){
  const W0 = world; W0.co2 ??= CO2_0; W0.seaRise ??= 0; W0.warm ??= 0;
  let E = 0; const byN = new Map();
  for (const g of liveTowns()) { const e = emitOf(g); E += e; const n = nationOf(g); byN.set(n, (byN.get(n) || 0) + e); }
  for (const [n, e] of byN) { n.emit = Math.round(e * 10) / 10; n.emitTot = (n.emitTot || 0) + e; }
  const sink = (W0.co2 - CO2_0) * .015 * (.5 + forestShare() * 2.5); // (sin emitir más, el exceso se va absorbiendo en unos 60 días)
  W0.co2 = Math.max(CO2_0, W0.co2 + E * .1 - sink); W0.emitDay = Math.round(E);
  const was = W0.warm; W0.warm = warmOf(W0.co2);
  (W0.co2Hist ||= []).push(Math.round(W0.co2)); if (W0.co2Hist.length > 60) W0.co2Hist.shift();
  // El mar sube con el calor (y sigue subiendo aunque se pare, porque el hielo tarda en reaccionar)
  if (W0.warm > .3) { const before = Math.floor(W0.seaRise / 10); W0.seaRise += W0.warm * .9; if (Math.floor(W0.seaRise / 10) > before) seaStep(); }
  // Avisos por umbrales
  for (const [t, txt] of [[.5, 'Los científicos avisan: el planeta se ha calentado medio grado desde antes de las fábricas'], [1, '🌡 El mundo ya está 1 °C más caliente: veranos más duros y más tormentas'], [1.5, '🌡 +1,5 °C: los glaciares retroceden y las olas de calor matan en las ciudades'], [2, '🔥 +2 °C: el clima se descontrola; sequías, inundaciones y el mar avanza'], [3, '🔥 +3 °C: el planeta vive una emergencia climática']])
    if (was < t && W0.warm >= t) { notify(txt, null); if (typeof crisisSoon === 'function') crisisSoon('clima'); }
  // Más DANAs con más calor
  if (W0.warm > .8 && typeof startDana === 'function' && Math.random() < Math.min(.5, (W0.warm - .6) * .25)) { const g = coastalTown(); if (g) startDana(g); }
  climateDeal();
}
// El mar se come una franja de playa baja (las casillas más bajas junto al mar)
function seaStep(){
  const cand = [];
  for (let i = W; i < N - W; i++) {
    if (world.biome[i] !== B.SAND || world.lake[i] || world.river[i]) continue;
    if (!(WATER[world.biome[i - 1]] || WATER[world.biome[i + 1]] || WATER[world.biome[i - W]] || WATER[world.biome[i + W]])) continue;
    cand.push(i);
  }
  cand.sort((a, b) => world.e[a] - world.e[b]);
  const take = cand.slice(0, Math.max(10, Math.round(cand.length * .04))); if (!take.length) return;
  let x0 = W, y0 = H, x1 = -1, y1 = -1, hit = 0; const towns = new Set();
  for (const i of take) {
    const o = world.objs[i];
    if (o && isBuilding(o)) { if (damageBuilding(i, .35)) hit++; if (o.vid) towns.add(o.vid); continue; } // lo construido aguanta, pero se daña
    world.e[i] = world.sea - .002; world.biome[i] = classify(i); if (WATER[world.biome[i]]) world.objs[i] = null;
    const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (x1 >= 0) { paintRegion(x0 - 2, y0 - 2, x1 + 2, y1 + 2); composeRegion(x0 - 7, y0 - 11, x1 + 7, y1 + 12); statsSoon(true); }
  const names = [...towns].map(id => villageById(id)).filter(Boolean).map(g => g.name);
  notify(`🌊 El mar ha subido ${Math.round(world.seaRise)} cm: se traga ${take.length - hit} casillas de playa${names.length ? ` y daña edificios de ${names.slice(0, 4).join(', ')}` : ''}`, x1 >= 0 ? { x:x0 * T, y:y0 * T } : null);
}
// ---- Cumbres del clima ----
function climateDeal(){
  const C = world.climate ||= { deals:[], next:0 };
  if (world.warm < .6 || yearT < C.next) return;
  const ns = nationsAlive().filter(n => knowsSci(n, 'electricidad')); if (ns.length < 3) return;
  C.next = yearT + DAY_LEN * 8;
  const host = ns.slice().sort((a, b) => natPop(b) - natPop(a))[0], cut = world.warm > 1.5 ? .5 : .3;
  const yes = [], no = [];
  for (const n of ns) {
    if (typeof isPlayerG === 'function' && isPlayerG(n)) continue; // tu nación decide en su propia carta (crisis.js)
    const lean = govIdeo(n), oil = typeof wellsOfNation === 'function' ? wellsOfNation(n).length : 0, renew = knowsSci(n, 'renovables');
    const p = .5 - lean * .4 + (renew ? .2 : 0) - Math.min(.3, oil * .08) + (world.warm - 1) * .2;
    (Math.random() < p ? yes : no).push(n);
  }
  const deal = { d:Math.floor(yearT / DAY_LEN) + 1, host:host.name, cut, members:yes.map(n => n.id), base:{}, out:no.map(n => n.id) };
  for (const n of yes) { deal.base[n.id] = n.emit || 0; aiClimateLaws(n); }
  C.deals.push(deal); if (C.deals.length > 6) C.deals.shift();
  notify(`🌍 Cumbre del clima en ${host.name}: ${yes.length ? `${yes.map(n => n.name).join(', ')} firman reducir sus emisiones un ${Math.round(cut * 100)} %` : 'nadie se compromete a nada'}${no.length ? `; ${no.map(n => n.name).join(', ')} no firma${no.length > 1 ? 'n' : ''}` : ''}`, { x:host.fx * T, y:host.fy * T });
  if (typeof crisisSoon === 'function') crisisSoon('cumbre', deal);
}
function aiClimateLaws(n){
  if (n.ruling == null || !n.parties || !n.parties[n.ruling]) return; const P = n.parties[n.ruling];
  for (const l of ['limite_emisiones', 'aire_limpio']) if (LAW_REQ[l] && LAW_REQ[l](n) && !P.laws.includes(l)) { P.laws.push(l); break; }
}
// Cumplimiento: cada pocos días se mira si los firmantes han bajado
function climateCheck(){
  const C = world.climate; if (!C || !C.deals.length) return; const D = C.deals[C.deals.length - 1];
  if (D.checked || Math.floor(yearT / DAY_LEN) + 1 - D.d < 5) return; D.checked = true;
  const bad = D.members.map(id => villageById(id)).filter(n => n && popOf(n) && (n.emit || 0) > (D.base[n.id] || 0) * (1 - D.cut * .5) + .5);
  for (const n of bad) for (const o of nationsAlive()) if (o !== n && D.members.includes(o.id)) { const r = rels.get(relKey(n, o)); if (r) r.v = Math.max(-100, r.v - 8); }
  if (bad.length) notify(`🌍 ${bad.map(n => n.name).join(', ')} no cumple${bad.length > 1 ? 'n' : ''} lo que firmó en la cumbre del clima: los demás firmantes se lo echan en cara`, null);
}
// La temperatura de todo el mapa sube con el calentamiento
{ const base = tempAt; tempAt = function(i){ return base.apply(this, arguments) + (world && world.warm ? world.warm : 0); }; }

let climaClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (climaClock -= dt) > 0) return; climaClock = DAY_LEN;
  climateDay(); climateCheck();
} catch (e) { console.error(e); } });

// ---- Fichas ----
function climateLine(){
  if (!world.co2 || world.co2 < CO2_0 + 2) return '';
  const w = world.warm || 0, col = w > 2 ? '#e8583a' : w > 1 ? '#e8a838' : '#c8b890';
  return `<div class="wv-line"><b style="color:${col}">🌡 ${w >= 0 ? '+' : ''}${w.toFixed(2).replace('.', ',')} °C</b> <span class="muted">· CO₂ ${Math.round(world.co2)} ppm${world.seaRise >= 1 ? ` · el mar ha subido ${Math.round(world.seaRise)} cm` : ''}${world.emitDay ? ` · se emiten ${world.emitDay} t al día` : ''}</span></div>`;
}
{ const base = renderWorldView; renderWorldView = function(){ base.apply(this, arguments); const box = document.getElementById('worldView'); if (!box || !world || busy) return; const h = climateLine(); if (h && !box.querySelector('.clim-l')) box.insertAdjacentHTML('beforeend', h.replace('class="wv-line"', 'class="wv-line clim-l"')); }; }
function climateCard(n){
  if (!world.co2 || world.co2 < CO2_0 + 2) return '';
  const all = nationsAlive().reduce((a, o) => a + (o.emit || 0), 0), share = all ? (n.emit || 0) / all : 0, D = world.climate && world.climate.deals[world.climate.deals.length - 1];
  return `<h4>Clima</h4><div class="dp-k"><span>Planeta</span><b>${(world.warm || 0) >= 0 ? '+' : ''}${(world.warm || 0).toFixed(2).replace('.', ',')} °C · CO₂ ${Math.round(world.co2)} ppm</b><span>Emisiones de ${esc(n.name)}</span><b>${(n.emit || 0).toFixed(1).replace('.', ',')} al día (${Math.round(share * 100)} % del mundo)</b>${D ? `<span>Última cumbre</span><b>${esc(D.host)}, día ${D.d}: ${D.members.includes(n.id) ? 'firmó' : 'no firmó'}</b>` : ''}</div>`;
}
{ const base = councilCard; councilCard = function(g){ return base.apply(this, arguments) + (nationOf(g) === g ? climateCard(g) : ''); }; }
{ const base = govSummary; govSummary = function(n){ const h = base.apply(this, arguments); return h.replace('<h4>Ciencia</h4>', climateCard(n) + '<h4>Ciencia</h4>'); }; }
