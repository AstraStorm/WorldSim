// Forja de Mundos · El libro de historia: la crónica del mundo escrita por capítulos
// ================= Libro de historia =================
// · Se escribe solo: cada noticia importante (guerras, política, diplomacia, economía, religión, catástrofes, grandes
//   inventos) queda apuntada con su día y su año; se guarda con la partida
// · Cada año es un capítulo con su título según lo que más pasó («La Era de las Guerras», «La Revolución Industrial»…)
// · Se puede ordenar (lo más antiguo o lo más reciente primero), filtrar por tipo y por nación, buscar, y exportar en
//   texto o como página para guardar
const BOOK_ICON = { war:'⚔', pol:'⚖', eco:'⛁', dip:'🕊', rel:'✦', dis:'🌋', death:'✝', ind:'⚙', cul:'♫', misc:'•' };
const BOOK_KIND = { war:'Guerras', pol:'Política', dip:'Diplomacia', eco:'Economía', ind:'Inventos', cul:'Cultura y deporte', rel:'Religión', dis:'Catástrofes', death:'Muertes ilustres' };
const IND_RE = /descubren|era industrial|ferrocarril|fábrica|carreteras de piedra|torre del reloj|dirigible/i, CUL_RE = /Juegos|partido|club|feria|estatua|famoso|leyenda|boda|teatro|escribe/i;
let bookUI = { sort:'asc', kinds:new Set(Object.keys(BOOK_KIND)), nat:'', q:'' };
{
  const base = notify;
  notify = function(txt, at, ...rest){
    try {
      if (typeof txt === 'string' && world) {
        let k = kindOf(txt); if (IND_RE.test(txt)) k = 'ind'; else if (CUL_RE.test(txt) && k === 'misc') k = 'cul';
        const big = TOAST_BIG.test(txt) || HEADLINE.test(txt);
        if ((k !== 'misc' && k !== 'death') || big || (k === 'death' && /héroe|rey|reina|emperador|emperatriz|líder|presidente/i.test(txt))) {
          const B = (world.book ||= []), last = B[B.length - 1];
          if (!last || last.t !== txt) { B.push({ d:Math.floor(yearT / DAY_LEN) + 1, y:seasonInfo().year, t:txt, k, big }); if (B.length > 3000) B.splice(0, B.length - 3000); }
        }
      }
    } catch (err) {}
    return base.call(this, txt, at, ...rest);
  };
}
const ERA_NAMES = { war:'La Era de las Guerras', pol:'Los Años de las Revueltas', dip:'La Edad de los Pactos', eco:'Tiempos de Mercaderes', ind:'La Revolución Industrial', cul:'La Edad de Oro de las Artes', rel:'La Era de la Fe', dis:'Los Años de las Catástrofes', death:'Los Años del Luto', misc:'Tiempos Tranquilos' };
function bookChapters(){
  const B = world.book || [], years = new Map();
  for (const e of B) { if (!years.has(e.y)) years.set(e.y, []); years.get(e.y).push(e); }
  const used = {}, out = [];
  for (const [y, es] of [...years].sort((a, b) => a[0] - b[0])) {
    const cnt = {}; for (const e of es) cnt[e.k] = (cnt[e.k] || 0) + (e.big ? 3 : 1);
    let top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (es.some(e => e.k === 'ind' && /descubren la máquina de vapor|era industrial/.test(e.t))) top = ['ind', 99];
    const k = top ? top[0] : 'misc', n = used[k] = (used[k] || 0) + 1;
    let title = y === 1 && !out.length ? 'El Amanecer del Mundo' : ERA_NAMES[k] || ERA_NAMES.misc;
    if (n > 1 && title !== 'El Amanecer del Mundo') title += ' ' + (['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] || n);
    out.push({ y, title, es, wars:es.filter(e => /declara la guerra/.test(e.t)).length, peace:es.filter(e => /paz/i.test(e.t) && e.k === 'dip').length });
  }
  return out;
}
const bookNations = () => [...new Set(villages.filter(g => popOf(g) || g.gone).map(g => g.name))].sort();
function bookFilter(e){
  if (!bookUI.kinds.has(e.k === 'misc' ? 'pol' : e.k)) return false;
  if (bookUI.nat && !e.t.includes(bookUI.nat)) return false;
  if (bookUI.q && !e.t.toLowerCase().includes(bookUI.q.toLowerCase())) return false;
  return true;
}
function renderBook(){
  const el = document.getElementById('book'); if (!el || el.hidden) return;
  if (!world.bookSeeded) { // (partidas de antes: lo que ya cuenta la crónica entra al principio del libro)
    world.bookSeeded = true; const B = world.book || [], have = new Set(B.map(e => e.t));
    const old = chronicle.filter(c => !have.has(c.text)).map(c => { let k = c.kind || 'misc'; if (IND_RE.test(c.text)) k = 'ind'; else if (CUL_RE.test(c.text) && k === 'misc') k = 'cul'; return { d:c.d, y:Math.floor((c.d - 1) * DAY_LEN / YEAR) + 1, t:c.text, k, big:TOAST_BIG.test(c.text) }; });
    world.book = [...old, ...B].sort((a, b) => a.d - b.d);
  }
  const ch = bookChapters(), asc = bookUI.sort === 'asc', list = asc ? ch : ch.slice().reverse();
  const nats = bookNations(), total = (world.book || []).length;
  const body = list.map(c => {
    const es = c.es.filter(bookFilter); if (!es.length) return '';
    const items = (asc ? es : es.slice().reverse()).map(e => `<li class="bk-${e.k}${e.big ? ' big' : ''}"><span class="bk-d">día ${e.d}</span><span class="bk-i">${BOOK_ICON[e.k] || '•'}</span><span class="bk-t">${esc(e.t)}</span></li>`).join('');
    return `<section class="bk-ch"><h3><em>Capítulo ${c.y}</em>${esc(c.title)}</h3><p class="bk-sum">Año ${c.y} · ${c.es.length} sucesos${c.wars ? ` · ${c.wars} guerra${c.wars > 1 ? 's' : ''} declarada${c.wars > 1 ? 's' : ''}` : ''}${c.peace ? ` · ${c.peace} paz${c.peace > 1 ? 'es' : ''}` : ''}</p><ul>${items}</ul></section>`;
  }).join('') || '<p class="bk-empty">Aún no hay nada escrito con estos filtros.</p>';
  el.querySelector('.bk-body').innerHTML = body;
  el.querySelector('.bk-count').textContent = `${total} sucesos en ${ch.length} capítulo${ch.length === 1 ? '' : 's'}`;
  const sel = el.querySelector('.bk-nat'); const opts = `<option value="">Todas las naciones</option>${nats.map(n => `<option${n === bookUI.nat ? ' selected' : ''}>${esc(n)}</option>`).join('')}`; if (sel._o !== opts) { sel._o = opts; sel.innerHTML = opts; }
  for (const b of el.querySelectorAll('[data-bk]')) b.classList.toggle('on', bookUI.kinds.has(b.dataset.bk));
  el.querySelector('.bk-sort').value = bookUI.sort;
}
function bookPanel(){
  let el = document.getElementById('book'); if (el) return el;
  el = document.createElement('div'); el.id = 'book'; el.className = 'book'; el.hidden = true;
  el.innerHTML = `<div class="bk-page"><div class="bk-h"><div><h2>Libro de Historia del Mundo</h2><span class="bk-count"></span></div><button class="x" aria-label="Cerrar el libro">×</button></div>
    <div class="bk-tools"><select class="bk-sort" aria-label="Orden"><option value="asc">Lo más antiguo primero</option><option value="desc">Lo más reciente primero</option></select>
      <select class="bk-nat" aria-label="Nación"></select><input class="bk-q" type="search" placeholder="Buscar…" aria-label="Buscar en el libro">
      <button class="bk-exp" data-exp="txt">Exportar .txt</button><button class="bk-exp" data-exp="html">Exportar página</button></div>
    <div class="bk-kinds">${Object.entries(BOOK_KIND).map(([k, t]) => `<button data-bk="${k}">${BOOK_ICON[k]} ${t}</button>`).join('')}</div>
    <div class="bk-body"></div></div>`;
  document.querySelector('.stage').appendChild(el);
  el.addEventListener('click', e => {
    if (e.target.closest('.x') || e.target === el) { el.hidden = true; return; }
    const k = e.target.closest('[data-bk]'); if (k) { const v = k.dataset.bk; if (bookUI.kinds.has(v)) bookUI.kinds.delete(v); else bookUI.kinds.add(v); renderBook(); return; }
    const x = e.target.closest('[data-exp]'); if (x) exportBook(x.dataset.exp);
  });
  el.querySelector('.bk-sort').onchange = e => { bookUI.sort = e.target.value; renderBook(); };
  el.querySelector('.bk-nat').onchange = e => { bookUI.nat = e.target.value; renderBook(); };
  el.querySelector('.bk-q').oninput = e => { bookUI.q = e.target.value; renderBook(); };
  return el;
}
function exportBook(kind){
  const ch = bookChapters(), name = `Libro de Historia del Mundo (semilla ${params.seed})`;
  let out, type, ext;
  if (kind === 'txt') {
    out = `${name}\n${'='.repeat(name.length)}\n\n` + ch.map(c => `CAPÍTULO ${c.y}: ${c.title.toUpperCase()}\n${c.es.filter(bookFilter).map(e => `  Día ${e.d}. ${e.t}`).join('\n')}\n`).join('\n');
    type = 'text/plain'; ext = 'txt';
  } else {
    out = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(name)}</title><style>body{background:#e8dcc0;color:#3a2a18;font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.55}h1{text-align:center;font-size:30px}h2{border-bottom:2px solid #8a6a3a;padding-bottom:4px;margin-top:36px}h2 small{display:block;font-size:13px;color:#8a6a3a;letter-spacing:.1em;text-transform:uppercase}li{margin:4px 0}b{color:#8a3a2a}</style></head><body><h1>${esc(name)}</h1>`
      + ch.map(c => `<h2><small>Capítulo ${c.y}</small>${esc(c.title)}</h2><ul>${c.es.filter(bookFilter).map(e => `<li><b>Día ${e.d}.</b> ${esc(e.t)}</li>`).join('')}</ul>`).join('') + '</body></html>';
    type = 'text/html'; ext = 'html';
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type })); a.download = `historia-del-mundo.${ext}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
document.getElementById('bookBtn').onclick = () => { const el = bookPanel(); el.hidden = !el.hidden; if (!el.hidden) renderBook(); };
setInterval(() => { const el = document.getElementById('book'); if (el && !el.hidden && !el.matches(':hover')) renderBook(); }, 3000);
