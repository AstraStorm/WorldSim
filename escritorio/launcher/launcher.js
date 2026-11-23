// Forja de Mundos · Launcher: comprueba si hay una versión nueva en la nube, la descarga y abre el juego
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const verTxt = v => v ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)} · ${v.slice(8, 10)}:${v.slice(10, 12)}` : '—';
const fechaTxt = f => { const [y, m, d] = String(f).split('-'); return d ? `${+d} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][+m - 1]} de ${y}` : f; };
const OPT = { full:'oFull', close:'oClose', auto:'oAuto' };
const opt = k => { try { const v = localStorage.getItem('forja.' + k); return v == null ? k === 'auto' : v === '1'; } catch (e) { return k === 'auto'; } };
let info = null, busy = false, firstCheck = true;

// ---- Novedades: icono según de qué va, título corto y el resto ----
const ICONS = [[/casino|ruleta|bingo/i, '🎰'], [/guerra|batalla|ejército|soldad/i, '⚔️'], [/tren|vía|ferrocarril|estaci/i, '🚂'], [/dirigible|globo/i, '🎈'], [/barco|galeón|vapor/i, '⛵'],
  [/meteor|volc|lava|catástrof/i, '☄️'], [/deport|fútbol|olímp|juegos/i, '🏅'], [/ley|gobierno|elecci|régimen|clases/i, '⚖️'], [/dni|pasaporte|papeles|campo/i, '🪪'],
  [/libro|crónica|historia/i, '📜'], [/rendimiento|optimiz|fps/i, '⚡'], [/menú|interfaz|ficha|pestañ/i, '🧭'], [/escritorio|launcher/i, '🖥️'], [/ciudad|metrópoli|provincia/i, '🏙️'], [/okupa|vivienda|alquiler/i, '🏠']];
const iconOf = t => (ICONS.find(([re]) => re.test(t)) || [0, '✨'])[1];
const split = t => { const m = String(t).match(/^([^:;.(]{8,70})[:;.(]\s*(.*)$/); return m ? [m[1].trim(), m[2].trim()] : [t.length > 70 ? t.slice(0, 68) + '…' : t, t.length > 70 ? t : '']; };
function renderNews(list, fresh){
  list = list || [];
  const f = list[0];
  if (f) { const [h, rest] = split(f.texto); $('feature').innerHTML = `<div class="f-img"></div><div class="f-body"><span class="pill${fresh ? ' new' : ''}">${fresh ? 'Nuevo · ' : ''}${esc(fechaTxt(f.fecha))}</span><h3>${iconOf(f.texto)} ${esc(h)}</h3><p>${esc(rest || f.texto)}</p></div>`; }
  else $('feature').innerHTML = '<div class="f-img"></div><div class="f-body"><span class="pill">Sin datos</span><h3>No hay novedades</h3><p>Conéctate a internet para ver las últimas actualizaciones.</p></div>';
  $('minis').innerHTML = list.slice(1, 5).map(n => `<li><span class="ic">${iconOf(n.texto)}</span><span class="t">${esc(split(n.texto)[0])}</span><span class="d">${esc(n.fecha.slice(8, 10) + '/' + n.fecha.slice(5, 7))}</span></li>`).join('');
  $('timeline').innerHTML = list.map((n, i) => `<li class="${i ? '' : 'first'}"><span class="d">${iconOf(n.texto)} ${esc(fechaTxt(n.fecha))}${i === 0 && fresh ? ' · NUEVO' : ''}</span>${esc(n.texto)}</li>`).join('') || '<li>Sin novedades.</li>';
}
// ---- Estado y progreso ----
function setState(txt, kind){ $('state').textContent = txt; $('dot').className = 'dot ' + (kind || ''); }
function setProg(label, num = '', frac = null){
  $('pLabel').textContent = label; $('pNum').textContent = num;
  const bar = $('pbar'); bar.classList.toggle('busy', frac === 'busy'); bar.classList.toggle('done', frac === 'done');
  $('pFill').style.width = frac === 'busy' ? '' : frac === 'done' ? '100%' : frac == null ? '0%' : Math.round(frac * 100) + '%';
}
function setPlay(txt, kind, enabled = true){ $('playTxt').textContent = txt; $('play').classList.toggle('upd', kind === 'upd'); $('play').disabled = !enabled; $('play').dataset.act = kind || 'play'; }
async function check(){
  if (busy) return; busy = true; setPlay('Jugar', 'play', false); setProg('Buscando actualizaciones…', '', 'busy'); setState('Comprobando…', 'busy');
  info = await window.forja.check(); busy = false;
  $('vLocal').textContent = info.local ? verTxt(info.local.version) : 'no instalada';
  if (!info.ok) {
    $('vRemote').textContent = 'sin conexión'; $('vFiles').textContent = '—'; setState('Sin conexión', 'bad');
    renderNews(info.novedades, false); setProg('No se pudo conectar: se jugará con la versión instalada', '', null); setPlay('Jugar', 'play', !!info.local); return;
  }
  $('vRemote').textContent = verTxt(info.remote.version); $('vFiles').textContent = `${info.total} archivos`;
  renderNews(info.novedades, info.changed.length > 0);
  if (info.changed.length) {
    setState('Actualización disponible', 'warn'); setProg(`Hay una actualización: ${info.changed.length} archivo${info.changed.length > 1 ? 's' : ''} por descargar`, '', 0); setPlay('Actualizar', 'upd');
    if (firstCheck && opt('auto')) { firstCheck = false; return update(false); }
  } else { setState('Al día', 'ok'); setProg('El juego está al día. ¡A jugar!', '', 'done'); setPlay('Jugar', 'play'); }
  firstCheck = false;
}
async function update(full){
  if (busy) return; busy = true; setPlay('Actualizando', 'upd', false); setProg(full ? 'Descargando el juego completo…' : 'Descargando la actualización…', '', 0); setState('Actualizando…', 'busy');
  const t0 = performance.now(); window._t0 = t0;
  const r = await window.forja.update(full); busy = false;
  if (!r.ok) { setState('Error al actualizar', 'bad'); setProg('No se pudo actualizar: ' + r.error, '', null); setPlay('Reintentar', 'upd'); return; }
  setProg(`Actualizado: ${r.files} archivo${r.files === 1 ? '' : 's'} (${(r.bytes / 1048576).toFixed(1)} MB)`, '', 'done');
  await check();
}
window.forja.onProgress(p => { const s = (performance.now() - (window._t0 || performance.now())) / 1000, sp = s > .3 ? p.bytes / s / 1048576 : 0; setProg(`Descargando ${p.file}`, `${p.done}/${p.total} · ${(p.bytes / 1048576).toFixed(1)} MB${sp ? ` · ${sp.toFixed(1)} MB/s` : ''}`, p.done / p.total); });
$('play').onclick = () => {
  if (busy) return;
  if ($('play').dataset.act === 'upd') return update(false);
  setProg('Abriendo el juego…', '', 'done'); window.forja.play({ full:opt('full'), close:opt('close') });
};
// ---- Navegación, ajustes y botones ----
function go(v){ for (const q of document.querySelectorAll('[data-v]')) q.classList.toggle('on', q.dataset.v === v); for (const s of document.querySelectorAll('.view')) s.hidden = s.id !== 'v-' + v; }
for (const b of document.querySelectorAll('[data-v]')) b.onclick = () => go(b.dataset.v);
for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => go(b.dataset.go);
for (const b of document.querySelectorAll('[data-w]')) b.onclick = () => window.forja.win(b.dataset.w);
for (const [k, id] of Object.entries(OPT)) { $(id).checked = opt(k); $(id).onchange = () => { try { localStorage.setItem('forja.' + k, $(id).checked ? '1' : '0'); } catch (e) {} }; }
$('bCheck').onclick = $('bCheck2').onclick = () => { go('inicio'); check(); };
$('bRepair').onclick = () => { go('inicio'); update(true); };
$('bFolder').onclick = $('rFolder').onclick = () => window.forja.folder();
$('bWeb').onclick = $('rWeb').onclick = () => window.forja.web();
window.forja.appVersion().then(v => { $('appv').textContent = `Launcher ${v} · El juego se descarga y se actualiza desde astrastorm.github.io/WorldSim`; });
const TIPS = ['Con el pincel de dios puedes levantar montañas, abrir ríos o soltar un meteorito.', 'Haz clic en cualquier edificio para ver qué es y quién vive en él.', 'El Libro de Historia guarda todo lo que pasa en tu mundo, por capítulos.',
  'Pulsa F11 en el juego para ponerlo en pantalla completa.', 'Guarda tu mundo en «Partidas» para seguir otro día.', 'En Historia → Potencias verás quién manda en el mundo.'];
$('tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
// ---- Motas de luz flotando sobre el fondo ----
(() => {
  const c = $('motes'), x = c.getContext('2d'); let P = [];
  const size = () => { c.width = innerWidth; c.height = innerHeight; P = Array.from({ length:40 }, () => ({ x:Math.random() * c.width, y:Math.random() * c.height, r:.6 + Math.random() * 1.6, v:.15 + Math.random() * .35, a:Math.random() * 6 })); };
  size(); addEventListener('resize', size);
  const tick = t => { x.clearRect(0, 0, c.width, c.height); for (const p of P) { p.y -= p.v; p.x += Math.sin(t / 2000 + p.a) * .2; if (p.y < -5) { p.y = c.height + 5; p.x = Math.random() * c.width; } x.fillStyle = `rgba(255,214,130,${.18 + .18 * Math.sin(t / 700 + p.a)})`; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
check();
