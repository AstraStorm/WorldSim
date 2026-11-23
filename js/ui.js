// Forja de Mundos · Interfaz: pestañas del panel y de la barra de abajo, y el resumen del mundo
// ================= Interfaz =================
// · El panel de la derecha va por pestañas: Mundo (resumen de naciones, guerras, lenguas y monedas, y la lista de
//   aldeas), Herramientas (pincel de dios y cámara), Ajustes (generar el mundo, capas y clima) y Datos (rarezas,
//   fauna, recursos y biomas). Se recuerda la última pestaña
// · La barra de abajo, también: Crear vida o Desatar, una sola fila cada una
// La información de la casilla va dentro del bloque de arriba a la izquierda: siempre debajo de la fecha y la velocidad
document.querySelector('.topleft').appendChild(document.getElementById('hud'));
function setPanelTab(k){
  for (const b of document.querySelectorAll('.ptabs button')) b.classList.toggle('on', b.dataset.pt === k);
  for (const el of document.querySelectorAll('.panel > [data-pt]')) el.classList.toggle('pt-off', el.dataset.pt !== k);
  try { localStorage.setItem('forja-ptab', k); } catch (err) {}
  if (k === 'mundo') renderWorldView();
}
document.querySelector('.ptabs').addEventListener('click', e => { const b = e.target.closest('[data-pt]'); if (b) setPanelTab(b.dataset.pt); });
setPanelTab((() => { try { return localStorage.getItem('forja-ptab') || 'mundo'; } catch (err) { return 'mundo'; } })());
document.querySelector('.sp-tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-sp]'); if (!b) return;
  for (const x of document.querySelectorAll('.sp-tabs button')) x.classList.toggle('on', x === b);
  for (const r of document.querySelectorAll('.sp-row')) r.hidden = r.dataset.sp !== b.dataset.sp;
});
// Resumen del mundo: cifras, naciones (con su bandera, régimen, lengua y moneda), guerras, Consejo y peligros
function renderWorldView(){
  const box = document.getElementById('worldView'); if (!box || box.classList.contains('pt-off') || !world || busy) return;
  const live = villages.filter(g => popOf(g)), ns = nationsAlive().sort((a, b) => natPop(b) - natPop(a));
  const langs = langList().filter(L => L && !L.dead && !L.common), coins = new Set(live.map(g => g.coin).filter(Boolean));
  const wars = [...rels.values()].filter(r => r.war).map(r => [villageById(r.war.att), villageById(r.war.def)]).filter(([a, b]) => a && b);
  const C = typeof council === 'function' ? council() : null, si = seasonInfo();
  box.innerHTML = `<h2>El mundo · ${esc(si.s.n)}, año ${si.year}</h2>
    <div class="wv-stats"><div><b>${villagers.filter(v => !v.dead).length}</b><span>habitantes</span></div><div><b>${ns.length}</b><span>naciones</span></div><div><b>${live.length}</b><span>aldeas</span></div>
      <div><b>${langs.length}</b><span>lenguas</span></div><div><b>${coins.size}</b><span>monedas</span></div><div><b>${wars.length}</b><span>guerras</span></div></div>
    <div class="wv-list">${ns.map(n => { const prov = live.filter(g => g !== n && nationOf(g) === n).length, atWar = wars.some(([a, b]) => a === n || b === n);
      return `<button class="wv-nat" data-vid="${n.id}">${n.flagUrl ? `<img src="${n.flagUrl}" alt="">` : `<i style="width:22px;height:15px;flex:none;border:1px solid rgba(0,0,0,.4);background:rgb(${villageColor(n).join(',')})"></i>`}<span><span class="nm">${n.empire ? '👑 ' + esc(n.empire.name) : esc(n.name)}</span>${atWar ? ' <span class="wv-war">⚔</span>' : ''}<span class="rg">${esc(regimeName(n))}${prov ? ` · ${prov} ${prov === 1 ? 'provincia' : 'provincias'}` : ''}${n.lang != null ? ` · ${esc(capFirst(langName(n.lang).replace(/^el /, '')))}` : ''}${n.coin ? ` · ${esc(n.coin)}` : ''}</span></span><span class="pp">${natPop(n)} hab.</span></button>`; }).join('')}</div>
    ${wars.length ? `<div class="wv-line"><b class="wv-war">En guerra:</b> ${wars.map(([a, b]) => `${esc(a.name)} contra ${esc(b.name)}`).join(' · ')}</div>` : '<div class="wv-line muted">El mundo está en paz</div>'}
    ${C ? `<div class="wv-line"><b>${esc(COUNCIL_NAME)}</b> <span class="muted">· sede en ${esc((villageById(C.seat) || {}).name || '?')} · ${C.members.length} miembros${Object.values(C.sanctions).some(s => s.until > yearT) ? ` · sancionados: ${Object.entries(C.sanctions).filter(([, s]) => s.until > yearT).map(([id]) => esc((villageById(+id) || {}).name || '?')).join(', ')}` : ''}</span></div>` : ''}
    ${(world.pirates || []).length || (world.bandits || []).length ? `<div class="wv-line muted">${(world.pirates || []).length ? `☠ ${world.pirates.length} ${world.pirates.length === 1 ? 'barco pirata' : 'barcos piratas'}` : ''}${(world.pirates || []).length && (world.bandits || []).length ? ' · ' : ''}${(world.bandits || []).length ? `🗡 ${world.bandits.length} ${world.bandits.length === 1 ? 'banda' : 'bandas'} de salteadores` : ''}</span></div>` : ''}
    <div class="wv-line muted">Toca una nación para ver su ficha.</div>`;
}
const natPop = n => villages.filter(g => popOf(g) && nationOf(g) === n).reduce((a, g) => a + popOf(g), 0);
document.getElementById('worldView').addEventListener('click', e => { const b = e.target.closest('[data-vid]'); if (b) { openVillage(+b.dataset.vid); const g = villageById(+b.dataset.vid); if (g) centerOn(g.fx * T, g.fy * T, Math.max(zoom, 3)); } });
setInterval(renderWorldView, 2000);
