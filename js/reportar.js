// World Sim · Reportar un fallo
// ================= Reportar =================
// Se carga el primero para apuntar todos los errores desde el principio (los de la consola y los que no se capturan).
// El botón «Reportar» abre una nota («¿qué ha pasado?») y descarga dos archivos: la partida tal cual está ahora
// (.forja) y un informe .html con la nota, una foto de la pantalla, los errores y el estado del juego.
const REP_LOG = [];
(() => {
  const push = (kind, args) => { try { REP_LOG.push({ t:new Date().toISOString().slice(11, 19), kind, txt:[...args].map(a => a instanceof Error ? `${a.message}\n${a.stack || ''}` : typeof a === 'object' ? (() => { try { return JSON.stringify(a).slice(0, 400); } catch (e) { return String(a); } })() : String(a)).join(' ').slice(0, 2000) }); if (REP_LOG.length > 200) REP_LOG.shift(); } catch (e) {} };
  for (const k of ['error', 'warn']) { const base = console[k].bind(console); console[k] = (...a) => { push(k, a); base(...a); }; }
  addEventListener('error', e => push('error', [e.error || `${e.message} (${e.filename}:${e.lineno})`]));
  addEventListener('unhandledrejection', e => push('error', ['Promesa rechazada:', e.reason]));
})();
function repState(){
  const L = [];
  try {
    const live = villages.filter(g => popOf(g)), n = typeof playerNat === 'function' && playerNat();
    L.push(`Día ${Math.floor(yearT / DAY_LEN) + 1} · velocidad x${gameSpeed} · zoom ${zoom.toFixed(2)} · semilla ${params.seed}`);
    L.push(`${villagers.filter(v => !v.dead).length} habitantes · ${live.length} pueblos · ${nationsAlive().length} naciones · ${alliances.filter(a => !a.dead).length} alianzas`);
    if (n) L.push(`Modo nación: ${n.name} (${natPop(n)} hab.)`);
    if (world.warm) L.push(`Clima: +${world.warm.toFixed(2)} °C · CO2 ${Math.round(world.co2)} · mar +${Math.round(world.seaRise || 0)} cm`);
    const ver = document.querySelector('script[src*="?v="]'); if (ver) L.push(`Versión: ${ver.src.split('?v=')[1]}`);
    L.push(navigator.userAgent);
  } catch (e) { L.push('(no se pudo leer el estado: ' + e.message + ')'); }
  return L;
}
function repOpen(){
  let el = $('repBox');
  if (!el) {
    el = document.createElement('div'); el.id = 'repBox'; el.className = 'rep-box';
    el.innerHTML = `<div class="rep-h"><b>🐞 Reportar un fallo</b><button class="x" data-rep="x" aria-label="Cerrar">×</button></div>
      <textarea id="repNote" rows="4" placeholder="¿Qué ha pasado? ¿Qué esperabas que pasara? (dónde, qué pueblo, qué estabas haciendo)"></textarea>
      <div class="rep-f"><span class="muted" id="repInfo"></span><button class="gold" data-rep="go">Descargar informe</button></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('[data-rep]'); if (!b) return; if (b.dataset.rep === 'x') el.hidden = true; else repMake(); });
  }
  const errs = REP_LOG.filter(r => r.kind === 'error').length; $('repInfo').textContent = errs ? `${errs} error${errs > 1 ? 'es' : ''} apuntado${errs > 1 ? 's' : ''}` : 'Sin errores apuntados';
  el.hidden = false; $('repNote').focus();
}
async function repMake(){
  const note = $('repNote').value.trim(), day = world ? Math.floor(yearT / DAY_LEN) + 1 : 0;
  let shot = '';
  try { shot = view.toDataURL('image/jpeg', .8); } catch (e) { shot = ''; }
  const html = `<!doctype html><meta charset="utf-8"><title>Informe World Sim · día ${day}</title>
<style>body{font:14px system-ui,sans-serif;max-width:1000px;margin:20px auto;padding:0 16px;background:#16181c;color:#e8e2d4}h1{font-size:20px}pre{white-space:pre-wrap;background:#0e1013;padding:10px;border-radius:8px;font-size:12px}img{max-width:100%;border-radius:8px}.e{color:#f08a7a}.w{color:#e8c870}</style>
<h1>Informe World Sim · día ${day} · ${new Date().toLocaleString('es-ES')}</h1>
<h2>Nota</h2><pre>${esc(note || '(sin nota)')}</pre>
<h2>Estado</h2><pre>${esc(repState().join('\n'))}</pre>
${shot ? `<h2>Pantalla</h2><img src="${shot}" alt="captura">` : ''}
<h2>Errores y avisos (${REP_LOG.length})</h2><pre>${REP_LOG.map(r => `<span class="${r.kind === 'error' ? 'e' : 'w'}">[${r.t}] ${esc(r.txt)}</span>`).join('\n') || 'ninguno'}</pre>
<h2>Últimas noticias</h2><pre>${esc((typeof chronicle !== 'undefined' ? chronicle.slice(-30) : []).map(c => `día ${c.d} · ${c.text}`).join('\n'))}</pre>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type:'text/html' })); a.download = `informe-worldsim-dia${day}.html`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  try { if (world && !busy) await downloadSave(); } catch (e) { console.error(e); }
  $('repBox').hidden = true; $('repNote').value = '';
  sysToast('Informe descargado: pásame el .html y la partida .forja');
}
addEventListener('DOMContentLoaded', () => { const b = document.getElementById('repBtn'); if (b) b.addEventListener('click', repOpen); });
