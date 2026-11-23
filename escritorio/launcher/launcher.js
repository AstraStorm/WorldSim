// Forja de Mundos · Launcher: comprueba si hay una versión nueva en la nube, la descarga y abre el juego
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const verTxt = v => v ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)} ${v.slice(8, 10)}:${v.slice(10, 12)}` : '—';
let info = null, busy = false;
function setProg(label, num = '', frac = null){ $('pLabel').textContent = label; $('pNum').textContent = num; const bar = $('pFill').parentNode; bar.classList.toggle('busy', frac === 'busy'); $('pFill').style.width = frac === null || frac === 'busy' ? (frac === null ? '100%' : '') : Math.round(frac * 100) + '%'; }
function renderNews(list, fresh){
  const items = (list || []).map((n, i) => `<li class="${i < fresh ? 'new' : ''}"><span class="d">${esc(n.fecha)}${i < fresh ? ' · NUEVO' : ''}</span>${esc(n.texto)}</li>`);
  $('news').innerHTML = items.slice(0, 5).join('') || '<li class="muted">Sin novedades.</li>';
  $('newsAll').innerHTML = items.join('') || '<li class="muted">Sin novedades.</li>';
}
async function check(){
  if (busy) return; busy = true; $('play').disabled = true; $('play').classList.remove('upd'); setProg('Buscando actualizaciones…', '', 'busy'); $('state').textContent = 'Comprobando…';
  info = await window.forja.check(); busy = false;
  $('vLocal').textContent = info.local ? verTxt(info.local.version) : 'no instalada';
  if (!info.ok) {
    $('vRemote').textContent = 'sin conexión'; $('state').innerHTML = '<span class="bad">No se pudo comprobar</span>';
    renderNews(info.novedades, 0); setProg('Sin conexión: se jugará con la versión instalada', '', 0); $('play').textContent = 'Jugar'; $('play').disabled = !info.local; return;
  }
  $('vRemote').textContent = verTxt(info.remote.version);
  renderNews(info.novedades, info.changed.length ? 1 : 0); // la primera, la que se va a bajar
  if (info.changed.length) { $('state').innerHTML = `<span style="color:var(--accent)">Actualización disponible</span>`; setProg(`Hay una actualización: ${info.changed.length} archivo${info.changed.length > 1 ? 's' : ''} nuevo${info.changed.length > 1 ? 's' : ''}`, '', 0); $('play').textContent = 'Actualizar'; $('play').classList.add('upd'); }
  else { $('state').innerHTML = '<span class="ok">Al día</span>'; setProg('El juego está al día', '', null); $('play').textContent = 'Jugar'; }
  $('play').disabled = false;
}
async function update(full){
  if (busy) return; busy = true; $('play').disabled = true; setProg(full ? 'Descargando el juego completo…' : 'Descargando la actualización…', '', 0); $('state').textContent = 'Actualizando…';
  const r = await window.forja.update(full); busy = false;
  if (!r.ok) { $('state').innerHTML = '<span class="bad">Error al actualizar</span>'; setProg('No se pudo actualizar: ' + r.error, '', 0); $('play').disabled = false; $('play').textContent = 'Reintentar'; return; }
  setProg(`Actualizado a la versión del ${verTxt(r.version)} (${r.files} archivos, ${(r.bytes / 1048576).toFixed(1)} MB)`, '', null);
  await check();
}
window.forja.onProgress(p => setProg(`Descargando ${p.file}`, `${p.done}/${p.total} · ${(p.bytes / 1048576).toFixed(1)} MB`, p.done / p.total));
$('play').onclick = () => { if (busy) return; if ($('play').textContent !== 'Jugar') update(false); else { setProg('Abriendo el juego…', '', null); window.forja.play(); } };
for (const b of document.querySelectorAll('[data-w]')) b.onclick = () => window.forja.win(b.dataset.w);
for (const b of document.querySelectorAll('[data-v]')) b.onclick = () => { for (const q of document.querySelectorAll('[data-v]')) q.classList.toggle('on', q === b); for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== 'v-' + b.dataset.v; };
$('bCheck').onclick = () => check(); $('bRepair').onclick = () => update(true); $('bFolder').onclick = () => window.forja.folder(); $('bWeb').onclick = () => window.forja.web();
window.forja.appVersion().then(v => { $('appv').textContent = `Launcher ${v} · el juego se actualiza desde astrastorm.github.io/WorldSim`; });
check();
