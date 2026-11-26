// World Sim · Qué es cada edificio: al hacer clic en uno se ve su ficha (y se marca en el mapa)
// ================= Edificios =================
// · Con la herramienta Mover, un clic sobre un edificio abre su ficha: qué es, de qué pueblo, para qué sirve y lo
//   suyo (quién vive en una casa y de quién es, qué guarda el almacén, cuántos presos hay en la cárcel...)
// · En la ficha del pueblo, la pestaña «Mapa» lista todos sus edificios: tocando uno se va a él
const BLD_DESC = {
  house:'Una vivienda: aquí duermen y se resguardan sus vecinos; da calor en invierno', hall:'El ayuntamiento: desde aquí se gobierna el pueblo',
  store:'Almacén: guarda la comida, la madera y la piedra del pueblo', market:'Mercado: se compra y se vende, y vienen las caravanas',
  mill:'Molino: muele el grano de los campos', tower:'Torre de vigía: avisa de quien se acerca y defiende el pueblo', well:'Pozo: agua para beber sin ir al río',
  temple:'Templo: aquí rezan los fieles y se celebran los ritos', cathedral:'Catedral: el gran templo de la fe del pueblo', altar:'Altar: ofrendas a los dioses',
  obelisk:'Monumento en recuerdo de alguien o de algo que pasó', bank:'Banco: guarda el dinero y presta', wonder:'Maravilla: la obra más grande de la nación',
  forge:'Herrería: hace herramientas y armas de hierro', hospital:'Hospital: aquí se cura a los enfermos y heridos', barracks:'Cuartel: entrena y aloja a los soldados',
  tradehall:'Lonja: el comercio al por mayor con otros pueblos', theater:'Teatro: obras para pasar el rato', coliseum:'Coliseo: juegos y combates para el público',
  tavern:'Taberna: comer, beber y charlar al acabar la jornada', school:'Escuela: los niños aprenden a leer y a contar', mine:'Mina: hierro, oro y piedra de las montañas',
  quarry:'Cantera: de aquí sale la piedra',
};
const BLD_TYPE = { house:'Vivienda', hall:'Gobierno', court:'Justicia', jail:'Justicia', parliament:'Gobierno', council:'Gobierno', temple:'Religión', cathedral:'Religión', altar:'Religión',
  store:'Almacenes', granary:'Almacenes', smoke:'Almacenes', woodshed:'Almacenes', market:'Comercio', tradehall:'Comercio', bank:'Comercio', mill:'Trabajo', forge:'Trabajo', mine:'Trabajo', quarry:'Trabajo',
  well:'Servicios', hospital:'Servicios', school:'Saber', academy:'Saber', university:'Saber', press:'Saber', post:'Servicios', tower:'Defensa', barracks:'Defensa', spy:'Defensa',
  tavern:'Ocio', theater:'Ocio', coliseum:'Ocio', obelisk:'Monumentos', wonder:'Monumentos', union:'Trabajo' };
let selBld = null; // casilla del edificio seleccionado
const bldOwner = i => villages.find(g => popOf(g) && buildingsOf(g).includes(i)) || villageById((world.objs[i] || {}).vid);
const bldBox = i => { const o = world.objs[i], s = objSprite(o), tx = i % W, ty = (i / W) | 0, by = ty * T + 3 + (o.oy || 0), left = tx * T + 2 + (o.ox || 0) - (s.ax || 0); return [left, by - s.height + 1, left + s.width, by]; };
// ¿Qué edificio hay bajo el cursor? (el de más delante, si se tapan)
function buildingAt(sx, sy){
  const wx = (sx - offX) / zoom, wy = (sy - offY) / zoom; let best = null, bb = -1;
  for (const g of villages) for (const i of buildingsOf(g)) {
    const o = world.objs[i]; if (!isBuilding(o)) continue;
    const [x0, y0, x1, y1] = bldBox(i); if (wx >= x0 && wx < x1 && wy >= y0 && wy <= y1 + 1 && y1 > bb) { bb = y1; best = i; }
  }
  return best;
}
function bldDesc(o){
  const p = o.key.split(':')[0], ins = Object.values(INSTS).find(q => q.key === o.key);
  return BLD_DESC[p] || (ins ? `${capFirst(ins.name)}: ${ins.why}` : '');
}
function bldDetails(i, g){
  const o = world.objs[i], p = o.key.split(':')[0], kv = (a, b) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`; let h = '';
  if (p === 'house') {
    const rs = residentsOf(i), d = g && deedOf(g, i), owner = d && d.o > 0 ? peopleByPid(g).get(d.o) : null;
    h += kv('Viven', rs.length ? rs.map(u => esc(u.name)).join(', ') : 'nadie') + kv('Caben', houseRoom(i));
    if (d) h += kv('Dueño', d.o === FOR_SALE ? 'en venta' : d.o === PUBLIC ? 'vivienda pública' : owner ? esc(owner.name) : '—');
    if (g && housingOn(g)) h += kv('Alquiler', `${rentOf(g, i)} ${esc(g.coin)} al día`) + houseExtraKv(g, i, kv); // okupas y contratos (okupas.js)
  }
  if (g && (p === 'store' || p === 'granary')) h += kv('Guarda', `comida ${Math.round(g.food)} · madera ${Math.round(g.wood)} · piedra ${Math.round(g.stone)}`);
  if (g && p === 'jail') h += kv('Presos', prisonersOf(g).length);
  if (g && p === 'casino') h += casinoKv(g, kv); // ganancias por juego (casino.js)
  if (g && p === 'market' && g.coin) h += kv('Moneda', esc(g.coin));
  if (g && (p === 'temple' || p === 'cathedral' || p === 'altar') && g.faith) h += kv('Fe', esc(g.faith.name || g.faith.god));
  if (o.hero) h += kv('En honor de', esc(o.hero));
  if (o.hp != null && o.hp < (o.maxHp || 100)) h += kv('Estado', 'dañado');
  const near = villagers.filter(u => !u.dead && u.task && u.task.k === 'trabajando' && Math.hypot(u.x / T - i % W, u.y / T - ((i / W) | 0)) < 4).length;
  if (near) h += kv('Dentro ahora', `${near} ${near === 1 ? 'persona' : 'personas'}`);
  return h;
}
function renderBldCard(){
  let el = document.getElementById('bcard');
  if (!el) { el = document.createElement('div'); el.id = 'bcard'; el.className = 'bcard'; document.getElementById('vcard').after(el);
    el.addEventListener('click', e => { if (e.target.closest('.x')) { selBld = null; renderBldCard(); return; } const b = e.target.closest('[data-vid]'); if (b) openVillage(+b.dataset.vid); }); }
  const o = selBld != null && world.objs[selBld];
  if (!isBuilding(o)) { selBld = null; el.hidden = true; return; }
  const g = bldOwner(selBld), n = g && nationOf(g), p = o.key.split(':')[0];
  const html = `<div class="bh"><div><span class="btype">${BLD_TYPE[p] || 'Edificio'}</span><h3>${esc(OBJ[o.key][0])}</h3>
    ${g ? `<button class="lnk" data-vid="${g.id}">${n && n.flagUrl ? `<img src="${n.flagUrl}" alt="">` : ''}${esc(g.name)}</button>` : ''}</div><button class="x" aria-label="Cerrar">×</button></div>
    <p>${esc(bldDesc(o))}</p><div class="sec">${bldDetails(selBld, g)}</div>`;
  if (el._html !== html) { el._html = html; el.innerHTML = html; } el.hidden = false;
}
function selectBuilding(i, go){
  selBld = i; renderBldCard();
  if (go && i != null) centerOn((i % W) * T, ((i / W) | 0) * T - 10, Math.max(zoom, 5));
}
// Marco que late alrededor del edificio elegido (desde vista.js, en coordenadas del mundo)
function drawSelBuilding(t){
  if (selBld == null || !isBuilding(world.objs[selBld])) return;
  const [x0, y0, x1, y1] = bldBox(selBld), a = .55 + .35 * Math.sin(t / 220), g = bldOwner(selBld), c = g ? villageColor(nationOf(g)) : [233, 185, 73];
  vctx.strokeStyle = `rgba(${c.join(',')},${a})`; vctx.lineWidth = 1; vctx.strokeRect(x0 - 1.5, y0 - 1.5, x1 - x0 + 3, y1 - y0 + 4);
  vctx.strokeStyle = `rgba(255,255,255,${a * .8})`; vctx.strokeRect(x0 - 2.5, y0 - 2.5, x1 - x0 + 5, y1 - y0 + 6);
}
// Lista de edificios del pueblo, por tipo (pestaña Mapa de la ficha)
function buildingsList(g){
  const groups = new Map();
  for (const i of buildingsOf(g)) { const o = world.objs[i]; if (!isBuilding(o)) continue; const t = BLD_TYPE[o.key.split(':')[0]] || 'Otros'; if (!groups.has(t)) groups.set(t, []); groups.get(t).push(i); }
  if (!groups.size) return '';
  return `<h4>Edificios</h4><div class="blist">${[...groups].map(([t, is]) => {
    const cnt = new Map(); for (const i of is) { const k = OBJ[world.objs[i].key][0]; if (!cnt.has(k)) cnt.set(k, []); cnt.get(k).push(i); }
    return `<div class="bgrp"><span class="muted">${t}</span>${[...cnt].map(([k, l]) => `<button class="chipb" data-bld="${l[0]}"${l.length > 1 ? ` data-blds="${l.join(',')}"` : ''}>${esc(k)}${l.length > 1 ? ` <em>×${l.length}</em>` : ''}</button>`).join('')}</div>`; }).join('')}</div>
    <p class="muted" style="font-size:12px;margin:6px 0 0">Toca uno para ir a él (si hay varios, cada toque va al siguiente). También puedes hacer clic en cualquier edificio del mapa.</p>`;
}
document.getElementById('vcard').addEventListener('click', e => {
  const b = e.target.closest('[data-bld]'); if (!b) return;
  const l = (b.dataset.blds || b.dataset.bld).split(',').map(Number), k = (l.indexOf(selBld) + 1) % l.length;
  selectBuilding(l[k], true);
});
setInterval(() => { if (selBld != null) renderBldCard(); }, 1000);

// ---- Recintos: también se pueden seleccionar (registro, cementerio, puerto de globos, plaza sagrada, arboleda,
// bayal, cercados y el castillo mientras se construye), con su ficha y su marco en el mapa ----
BLD.add('quarry');
let selZone = null; // { vid, k, i? }
const ZONE_INFO = {
  registry:['Servicios', 'Registro civil', 'La oficina del registro: aquí hacen el DNI a cada habitante y el pasaporte a quien quiere viajar'],
  cemetery:['Religión', 'Cementerio', 'Aquí descansan los que murieron en el pueblo, cada uno en su tumba'],
  aero:['Transporte', 'Puerto de globos', 'Desde aquí despegan los globos y dirigibles: a cartografiar, comerciar, visitar o, en guerra, a bombardear'],
  holy:['Religión', 'Plaza sagrada', 'El lugar sagrado del pueblo: aquí rezan, hacen ofrendas y celebran sus ritos'],
  grove:['Trabajo', 'Arboleda', 'Árboles plantados para tener madera sin dejar pelado el bosque'],
  berryPlot:['Trabajo', 'Bayal', 'Matas de bayas plantadas junto al pueblo: comida a mano'],
  pen:['Trabajo', 'Cercado', 'Aquí guardan sus animales'],
  fort:['Defensa', 'Castillo en obras', 'El castillo que están levantando: cuando esté hecho, el pueblo podrá refugiarse dentro'],
};
const zoneRect = z => { if (z.k === 'barrio') return typeof barrioRect === 'function' ? barrioRect(z) : null; const g = villageById(z.vid); if (!g) return null; if (z.k === 'pen') return pensOf(g)[z.n] || null; if (z.k === 'fort') { const f = g.fort; if (!f || f.built) return null; const x = f.i % W, y = (f.i / W) | 0; return { x0:x - 6, y0:y - 9, x1:x + 6, y1:y }; } const q = g[z.k]; return q ? (q.x1 != null ? q : { x0:q.x0, y0:q.y0, x1:q.x0 + q.w - 1, y1:q.y0 + q.h - 1 }) : null; };
function zoneAt(sx, sy){
  const tx = Math.floor((sx - offX) / zoom / T), ty = Math.floor((sy - offY) / zoom / T), inR = r => r && tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
  for (const g of liveTowns()) {
    for (const k of ['registry', 'aero', 'cemetery', 'holy', 'grove', 'berryPlot']) if (inR(zoneRect({ vid:g.id, k }))) return { vid:g.id, k };
    const ps = pensOf(g); for (let n = 0; n < ps.length; n++) if (inR(ps[n])) return { vid:g.id, k:'pen', n };
    if (inR(zoneRect({ vid:g.id, k:'fort' }))) return { vid:g.id, k:'fort' };
  }
  return null;
}
function zoneDetails(z, g){
  const kv = (a, b) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  if (z.k === 'registry') { const ps = villagers.filter(u => !u.dead && u.vid === g.id); return kv('Con DNI', `${ps.filter(u => u.dni).length} de ${ps.length}`) + kv('Con pasaporte', ps.filter(u => u.pass != null).length) + kv('Sin papeles', ps.filter(u => u.irreg).length); }
  if (z.k === 'cemetery') { const gr = [...g.cemetery.graves.values()].sort((a, b) => b.t - a.t); return kv('Tumbas', `${gr.length} de ${g.cemetery.slots.length}`) + (gr.length ? `<h4>Últimos enterrados</h4><ul class="log">${gr.slice(0, 6).map(e => `<li><span class="d">día ${e.d}</span>${esc(e.name)} · ${esc(e.cause)}${e.age != null ? ` · ${e.age} años` : ''}</li>`).join('')}</ul>` : ''); }
  if (z.k === 'aero') { const bs = balloonsOf(g); return kv('Globos', bs.length ? bs.map(b => `${b.cap} plazas (${b.state})`).join(' · ') : 'ninguno todavía') + kv('Manga de viento', hasSock(g) ? 'sí' : 'aún no'); }
  if (z.k === 'holy') return (g.faith ? kv('Fe', esc(g.faith.name)) + kv('Dios', esc(g.faith.god)) : '') + kv('Devoción', Math.round((g.devotion || 0) * 10) / 10) + kv('Ira de los dioses', Math.round((g.wrath || 0) * 10) / 10);
  if (z.k === 'pen') { const a = penAnimals(g).filter(x => (x.penK || 0) === z.n), c = {}; for (const x of a) c[x.sp] = (c[x.sp] || 0) + 1; return kv('Animales', a.length ? Object.entries(c).map(([s, n]) => `${n} ${s}`).join(' · ') : 'vacío'); }
  if (z.k === 'fort') { const f = g.fort; return kv('Tipo', esc((FORTS[f.type] || {}).name || f.type)) + kv('Obra', `${Math.round((f.prog || 0) * 100)} %`); }
  if (z.k === 'grove' || z.k === 'berryPlot') { const q = g[z.k], n = (q.slots || []).filter(i => world.objs[i]).length; return kv('Plantado', `${n} de ${(q.slots || []).length}`); }
  return '';
}
function renderZoneCard(){
  let el = document.getElementById('bcard'); if (!el) { const z = selZone; selZone = null; renderBldCard(); selZone = z; el = document.getElementById('bcard'); }
  if (!el._zoneX) { el._zoneX = true; el.addEventListener('click', e => { if (e.target.closest('.x')) selZone = null; }, true); } // (cerrar también vale para los recintos)
  const g = selZone && villageById(selZone.vid), r = selZone && zoneRect(selZone);
  if (!g || !r) { selZone = null; el.hidden = true; return; }
  const [type, name, desc] = ZONE_INFO[selZone.k], n = nationOf(g);
  el.innerHTML = el._html = `<div class="bh"><div><span class="btype">${type}</span><h3>${name}</h3><button class="lnk" data-vid="${g.id}">${n && n.flagUrl ? `<img src="${n.flagUrl}" alt="">` : ''}${esc(g.name)}</button></div><button class="x" aria-label="Cerrar">×</button></div><p>${desc}</p><div class="sec">${zoneDetails(selZone, g)}</div>`;
  el.hidden = false;
}
function selectZone(z){ selBld = null; selZone = z; renderZoneCard(); }
{ const base = selectBuilding; selectBuilding = function(i, go){ selZone = null; return base.apply(this, arguments); }; }
{ const base = renderBldCard; renderBldCard = function(){ if (selZone && selBld == null) { renderZoneCard(); return; } return base.apply(this, arguments); }; }
{ const base = drawSelBuilding; drawSelBuilding = function(t){
  base.apply(this, arguments); const r = selZone && zoneRect(selZone); if (!r) return;
  const a = .55 + .35 * Math.sin(t / 220), g = villageById(selZone.vid), c = g ? villageColor(nationOf(g)) : [233, 185, 73];
  vctx.strokeStyle = `rgba(${c.join(',')},${a})`; vctx.lineWidth = 1; vctx.strokeRect(r.x0 * T - .5, r.y0 * T - .5, (r.x1 - r.x0 + 1) * T + 1, (r.y1 - r.y0 + 1) * T + 1);
  vctx.strokeStyle = `rgba(255,255,255,${a * .8})`; vctx.strokeRect(r.x0 * T - 1.5, r.y0 * T - 1.5, (r.x1 - r.x0 + 1) * T + 3, (r.y1 - r.y0 + 1) * T + 3);
}; }
