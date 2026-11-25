// World Sim · El libro de historia: la crónica del mundo escrita por capítulos
// ================= Libro de historia =================
// · Se escribe solo: cada noticia importante (guerras, política, diplomacia, economía, religión, catástrofes, grandes
//   inventos) queda apuntada con su día, su año y el sitio donde pasó; se guarda con la partida
// · Cada suceso tiene su importancia (★★★ lo que cambia el mundo, ★★ lo notable, ★ lo menor): por defecto el libro
//   enseña lo importante, y lo menor queda plegado al final de cada capítulo
// · Cada año es un capítulo con su título según lo que más pasó («La Era de las Guerras», «La Revolución Industrial»…),
//   un resumen, sus cifras y una línea del tiempo; los nombres de los pueblos salen con el color de su nación
// · Portada con las naciones que viven y las que cayeron, índice de capítulos, y un clic en un suceso lleva la cámara
//   al sitio donde pasó
// · Se puede ordenar, filtrar por tipo, por nación y por importancia, buscar, y exportar en texto o como página
const BOOK_ICON = { war:'⚔', pol:'⚖', eco:'⛁', dip:'🕊', rel:'✦', dis:'🌋', death:'✝', ind:'⚙', cul:'♫', misc:'•' };
const BOOK_KIND = { war:'Guerras', pol:'Política', dip:'Diplomacia', eco:'Economía', ind:'Inventos e industria', cul:'Cultura y deporte', rel:'Religión', dis:'Catástrofes', death:'Muertes ilustres' };
const IND_RE = /descubren|era industrial|ferrocarril|fábrica|extractora|carreteras de piedra|torre del reloj|dirigible|moderniz/i, CUL_RE = /Juegos|partido|club|feria|estatua|famoso|leyenda|boda|teatro|escribe/i;
// Importancia: 3 = cambia el mundo, 2 = notable, 1 = menor
const BOOK_S3 = /declara la guerra|firman? la paz|conquist|revoluci|golpe de estado|se proclama|independiza|se extingue|extinguid|desaparece|descubren|era industrial|cae el castillo|termina su (castillo|torre|empalizada|palacio)|maravilla|nacionaliza|terremoto|erupci|tsunami|meteor|peste|epidemia|guerra civil|imperio|Juegos Olímpicos|inaugura el ferrocarril|funda la nación|nueva nación|muere (el|la) (rey|reina|emperador|emperatriz|líder|presidenta?)|héroe/i;
const BOOK_S2 = /elecciones|tratado|alianza|huelga|levantan (una|un|el|la)|moderniz|universidad|parlamento|banco|moneda|ruta comercial|rechazan el ataque|batalla|asedio|catapulta|piratas|hambre|sequía|incendio|inundación|exilio|nuevas leyes|dimite|ciudad nueva|funda|desbloquea|castillo|despide|consejo de las naciones|embajada|sanciones/i;
const BOOK_S1 = /ha muerto en la guerra|el objetivo de|creen que la guerra|abandonan a .* y se convierten|se queda con|crea el impuesto/i;
const bookStars = e => e.s ??= BOOK_S1.test(e.t) && !/héroe|rey|reina|líder/i.test(e.t) ? 1 : BOOK_S3.test(e.t) ? 3 : BOOK_S2.test(e.t) || e.big ? 2 : 1;
const SEASON_N = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
const bookYearOf = d => Math.floor((d - 1) * DAY_LEN / (SEASON_LEN * 4)) + 1, bookSeasonOf = d => Math.floor((d - 1) * DAY_LEN / SEASON_LEN) % 4; // (como el calendario)
let bookUI = { sort:'asc', kinds:new Set(Object.keys(BOOK_KIND)), nat:'', q:'', min:2, open:new Set() };
{
  const base = notify;
  notify = function(txt, at, ...rest){
    try {
      if (typeof txt === 'string' && world) {
        let k = kindOf(txt); if (IND_RE.test(txt)) k = 'ind'; else if (CUL_RE.test(txt) && k === 'misc') k = 'cul';
        const big = TOAST_BIG.test(txt) || HEADLINE.test(txt), s3 = BOOK_S3.test(txt);
        if ((k !== 'misc' && k !== 'death') || big || s3 || (k === 'death' && /héroe|rey|reina|emperador|emperatriz|líder|presidente/i.test(txt))) {
          const B = (world.book ||= []), last = B[B.length - 1];
          if (!last || last.t !== txt) {
            const e = { d:Math.floor(yearT / DAY_LEN) + 1, y:seasonInfo().year, se:seasonInfo().i, t:txt, k, big };
            if (at && isFinite(at.x) && isFinite(at.y)) { e.x = Math.round(at.x); e.y2 = Math.round(at.y); }
            bookStars(e); B.push(e); if (B.length > 4000) B.splice(0, B.length - 4000);
          }
        }
      }
    } catch (err) {}
    return base.call(this, txt, at, ...rest);
  };
}
const ERA_NAMES = { war:'La Era de las Guerras', pol:'Los Años de las Revueltas', dip:'La Edad de los Pactos', eco:'Tiempos de Mercaderes', ind:'La Revolución Industrial', cul:'La Edad de Oro de las Artes', rel:'La Era de la Fe', dis:'Los Años de las Catástrofes', death:'Los Años del Luto', misc:'Tiempos Tranquilos' };
const ROMAN = n => { let s = '', v = n; for (const [a, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (v >= a) { s += r; v -= a; } return s; };
function bookChapters(){
  const B = world.book || [], years = new Map();
  for (const e of B) { if (!years.has(e.y)) years.set(e.y, []); years.get(e.y).push(e); }
  const used = {}, out = [];
  for (const [y, es] of [...years].sort((a, b) => a[0] - b[0])) {
    const cnt = {}; for (const e of es) cnt[e.k] = (cnt[e.k] || 0) + bookStars(e) ** 2;
    let top = Object.entries(cnt).filter(([k]) => k !== 'misc').sort((a, b) => b[1] - a[1])[0]; if (es.some(e => e.k === 'ind' && /descubren la máquina de vapor|era industrial/.test(e.t))) top = ['ind', 99];
    const k = top ? top[0] : 'misc', n = used[k] = (used[k] || 0) + 1;
    let title = y === 1 && !out.length ? 'El Amanecer del Mundo' : ERA_NAMES[k] || ERA_NAMES.misc;
    if (n > 1 && title !== 'El Amanecer del Mundo') title += ' ' + ROMAN(n);
    out.push({ y, title, k, es, wars:es.filter(e => /declara la guerra/.test(e.t)).length, peace:es.filter(e => /paz/i.test(e.t) && e.k === 'dip').length,
      inv:es.filter(e => /descubren/.test(e.t)).length, dead:es.filter(e => e.k === 'death').length, dis:es.filter(e => e.k === 'dis').length });
  }
  return out;
}
const bookNations = () => [...new Set(villages.filter(g => popOf(g) || g.gone).map(g => g.name))].sort();
function bookFilter(e, ignoreMin){
  if (!bookUI.kinds.has(e.k === 'misc' ? 'pol' : e.k)) return false;
  if (!ignoreMin && bookStars(e) < bookUI.min) return false;
  if (bookUI.nat && !e.t.includes(bookUI.nat)) return false;
  if (bookUI.q && !e.t.toLowerCase().includes(bookUI.q.toLowerCase())) return false;
  return true;
}
// Los nombres de los pueblos, con el color de su nación (oscurecido para que se lea sobre el pergamino)
let bookNameRe = null, bookNameKey = '';
function bookNames(html){
  const gs = villages.filter(g => g.name), key = gs.length + ':' + gs.map(g => g.id).join(',');
  if (key !== bookNameKey) { bookNameKey = key; const names = [...new Set(gs.map(g => esc(g.name)))].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); bookNameRe = names.length ? new RegExp(`(?<![\\wÀ-ÿ])(${names.join('|')})(?![\\wÀ-ÿ])`, 'g') : null; }
  if (!bookNameRe) return html;
  return html.replace(bookNameRe, n => { const g = villages.find(v => esc(v.name) === n), c = g ? villageColor(nationOf(g) || g) : [90, 60, 30]; return `<b class="bk-n" style="color:rgb(${c.map(v => Math.round(v * .62)).join(',')})">${n}</b>`; });
}
const bookWhen = e => `día ${e.d}${e.se != null ? ` · ${SEASON_N[e.se]}` : ''}`;
const bookStarsTxt = e => '★'.repeat(bookStars(e));
function bookItem(e, cls){
  const go = e.x != null ? ` data-go="${e.x},${e.y2}" title="Ir al sitio en el mapa"` : '';
  return `<li class="bk-${e.k} s${bookStars(e)}${cls ? ' ' + cls : ''}"${go}><span class="bk-ic">${BOOK_ICON[e.k] || '•'}</span><span class="bk-tx">${bookNames(esc(e.t))}</span><span class="bk-wh">${bookWhen(e)}${go ? ' <i>↗</i>' : ''}</span></li>`;
}
// Resumen del capítulo: lo más gordo del año, en una frase
function bookIntro(c){
  const seen = new Set(), heads = new Set(), key = [];
  for (const e of c.es.filter(e => bookStars(e) === 3).sort((a, b) => (b.big ? 1 : 0) - (a.big ? 1 : 0))) {
    const t = e.t.replace(/[¡!]/g, '').replace(/\s*\(.*?\)/g, '').replace(/[:;].*$/, '').trim(), head = t.split(' ').slice(0, 3).join(' ');
    if (seen.has(e.k) && key.length >= 2 || heads.has(head)) continue; seen.add(e.k); heads.add(head); key.push(t.replace(/\.$/, '')); if (key.length >= 3) break;
  }
  if (!key.length) return 'Un año sin grandes sobresaltos: la vida siguió su curso en los pueblos del mundo.';
  return key.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('. ') + '.';
}
function bookLine(c){ // línea del tiempo del año: cada suceso importante, un punto de su color
  const es = c.es.filter(e => bookStars(e) >= 2), n = es.length; if (n < 2) return '';
  return `<div class="bk-line">${SEASON_N.map(s => `<span>${s}</span>`).join('')}${es.map((e, k) => { const p = e.se != null ? (e.se + (k + .5) / n) / 4 * 100 : (k + .5) / n * 100; return `<i class="bk-${e.k} s${bookStars(e)}" style="left:${Math.min(98.5, p).toFixed(1)}%" title="${esc(e.t)}"></i>`; }).join('')}</div>`;
}
function bookCover(ch){
  const alive = villages.filter(g => popOf(g) && nationOf(g) === g), fallen = villages.filter(g => g.gone && !popOf(g)).slice(-12);
  const flag = g => g.flagUrl ? `<img src="${g.flagUrl}" alt="">` : `<span class="bk-fl" style="background:rgb(${villageColor(g).join(',')})"></span>`;
  const B = world.book || [], wars = B.filter(e => /declara la guerra/.test(e.t)).length, inv = B.filter(e => /descubren/.test(e.t)).length;
  return `<section class="bk-cover"><div class="bk-orn">❦</div><h1>Crónica del Mundo</h1><p class="bk-sub">${ch.length} años de historia · ${B.length} sucesos · ${wars} guerras · ${inv} descubrimientos</p>
    <div class="bk-nats"><div><h4>Naciones</h4>${alive.map(g => `<span>${flag(g)}${esc(g.name)} <em>${regimeName(g)} · ${villages.filter(o => popOf(o) && nationOf(o) === g).reduce((a, o) => a + popOf(o), 0)} hab.</em></span>`).join('') || '<span>—</span>'}</div>
    ${fallen.length ? `<div><h4>Caídas en el olvido</h4>${fallen.map(g => `<span class="gone">✝ ${esc(g.name)}</span>`).join('')}</div>` : ''}</div></section>`;
}
let bookSig = '';
function renderBook(force){
  const el = document.getElementById('book'); if (!el || el.hidden) return;
  if (!world.bookSeeded) { // (partidas de antes: lo que ya cuenta la crónica entra al principio del libro)
    world.bookSeeded = true; const B = world.book || [], have = new Set(B.map(e => e.t));
    const old = chronicle.filter(c => !have.has(c.text)).map(c => { let k = c.kind || 'misc'; if (IND_RE.test(c.text)) k = 'ind'; else if (CUL_RE.test(c.text) && k === 'misc') k = 'cul'; return { d:c.d, y:bookYearOf(c.d), se:bookSeasonOf(c.d), t:c.text, k, big:TOAST_BIG.test(c.text) }; });
    world.book = [...old, ...B].sort((a, b) => a.d - b.d);
  }
  if (!world.bookStarFix) { world.bookStarFix = true; for (const e of world.book || []) delete e.s; } // (se recalcula con las reglas nuevas)
  if (!world.bookYearFix) { world.bookYearFix = true; for (const e of world.book || []) if (e.se == null) { e.y = bookYearOf(e.d); e.se = bookSeasonOf(e.d); } } // (partidas de antes: el año bien contado)
  const total = (world.book || []).length, sig = [total, bookUI.sort, [...bookUI.kinds].join(), bookUI.nat, bookUI.q, bookUI.min].join('|');
  if (!force && sig === bookSig) return; bookSig = sig;
  const ch = bookChapters(), asc = bookUI.sort === 'asc', list = asc ? ch : ch.slice().reverse();
  const body = list.map(c => {
    const all = c.es.filter(e => bookFilter(e, true)), es = all.filter(e => bookStars(e) >= bookUI.min), minor = all.filter(e => bookStars(e) < bookUI.min);
    if (!all.length) return '';
    const ord = a => asc ? a : a.slice().reverse(), key = ord(es.filter(e => bookStars(e) === 3)), rest = ord(es.filter(e => bookStars(e) < 3));
    const stats = [c.wars && `⚔ ${c.wars} guerra${c.wars > 1 ? 's' : ''}`, c.peace && `🕊 ${c.peace} paz${c.peace > 1 ? 'es' : ''}`, c.inv && `⚙ ${c.inv} invento${c.inv > 1 ? 's' : ''}`, c.dis && `🌋 ${c.dis} catástrofe${c.dis > 1 ? 's' : ''}`, c.dead && `✝ ${c.dead}`].filter(Boolean);
    const intro = bookNames(esc(bookIntro(c))), open = bookUI.open.has(c.y);
    return `<section class="bk-ch bk-k-${c.k}" id="bkc-${c.y}"><header><em>Capítulo ${ROMAN(c.y)} · año ${c.y}</em><h3>${esc(c.title)}</h3>${stats.length ? `<div class="bk-stats">${stats.map(s => `<span>${s}</span>`).join('')}<span>${c.es.length} sucesos</span></div>` : ''}</header>
      ${bookLine(c)}<p class="bk-intro"><span class="bk-drop">${intro.replace(/<[^>]+>/g, '').charAt(0)}</span>${intro.replace(/^(<[^>]+>)?(.)/, '$1')}</p>
      ${key.length ? `<ol class="bk-key">${key.map(e => bookItem(e)).join('')}</ol>` : ''}${rest.length ? `<ul class="bk-rest">${rest.map(e => bookItem(e)).join('')}</ul>` : ''}
      ${minor.length ? `<details data-y="${c.y}"${open ? ' open' : ''}><summary>y además, ${minor.length} suceso${minor.length > 1 ? 's' : ''} menor${minor.length > 1 ? 'es' : ''}</summary><ul class="bk-rest small">${ord(minor).map(e => bookItem(e)).join('')}</ul></details>` : ''}</section>`;
  }).join('');
  const scroll = el.querySelector('.bk-body').scrollTop;
  el.querySelector('.bk-body').innerHTML = (asc ? bookCover(ch) : '') + (body || '<p class="bk-empty">Aún no hay nada escrito con estos filtros.</p>') + (asc ? '' : bookCover(ch));
  el.querySelector('.bk-body').scrollTop = scroll;
  el.querySelector('.bk-toc').innerHTML = `<h4>Índice</h4>${ch.map(c => `<a data-ch="${c.y}" class="bk-k-${c.k}"><b>${ROMAN(c.y)}</b> ${esc(c.title)}<em>${c.es.filter(e => bookStars(e) >= 2).length}</em></a>`).join('')}`;
  el.querySelector('.bk-count').textContent = `${total} sucesos en ${ch.length} capítulo${ch.length === 1 ? '' : 's'}`;
  const sel = el.querySelector('.bk-nat'); const opts = `<option value="">Todas las naciones</option>${bookNations().map(n => `<option${n === bookUI.nat ? ' selected' : ''}>${esc(n)}</option>`).join('')}`; if (sel._o !== opts) { sel._o = opts; sel.innerHTML = opts; }
  for (const b of el.querySelectorAll('[data-bk]')) b.classList.toggle('on', bookUI.kinds.has(b.dataset.bk));
  for (const b of el.querySelectorAll('[data-min]')) b.classList.toggle('on', +b.dataset.min === bookUI.min);
  el.querySelector('.bk-sort').value = bookUI.sort;
}
function bookPanel(){
  let el = document.getElementById('book'); if (el) return el;
  el = document.createElement('div'); el.id = 'book'; el.className = 'book'; el.hidden = true;
  el.innerHTML = `<div class="bk-page"><div class="bk-h"><div><h2>Libro de Historia del Mundo</h2><span class="bk-count"></span></div><button class="x" aria-label="Cerrar el libro">×</button></div>
    <div class="bk-tools"><span class="bk-imp">${[[3, '★★★ Lo esencial'], [2, '★★ Lo importante'], [1, '★ Todo']].map(([n, t]) => `<button data-min="${n}">${t}</button>`).join('')}</span>
      <select class="bk-sort" aria-label="Orden"><option value="asc">Lo más antiguo primero</option><option value="desc">Lo más reciente primero</option></select>
      <select class="bk-nat" aria-label="Nación"></select><input class="bk-q" type="search" placeholder="Buscar…" aria-label="Buscar en el libro">
      <button class="bk-exp" data-exp="txt">Exportar .txt</button><button class="bk-exp" data-exp="html">Exportar página</button></div>
    <div class="bk-kinds">${Object.entries(BOOK_KIND).map(([k, t]) => `<button data-bk="${k}">${BOOK_ICON[k]} ${t}</button>`).join('')}</div>
    <div class="bk-main"><nav class="bk-toc"></nav><div class="bk-body"></div></div></div>`;
  document.querySelector('.stage').appendChild(el);
  el.addEventListener('click', e => {
    if (e.target.closest('.x') || e.target === el) { el.hidden = true; return; }
    const k = e.target.closest('[data-bk]'); if (k) { const v = k.dataset.bk; if (bookUI.kinds.has(v)) bookUI.kinds.delete(v); else bookUI.kinds.add(v); renderBook(); return; }
    const m = e.target.closest('[data-min]'); if (m) { bookUI.min = +m.dataset.min; renderBook(); return; }
    const c = e.target.closest('[data-ch]'); if (c) { const s = el.querySelector('#bkc-' + c.dataset.ch); if (s) s.scrollIntoView({ behavior:'smooth', block:'start' }); return; }
    const g = e.target.closest('[data-go]'); if (g) { const [x, y] = g.dataset.go.split(',').map(Number); el.hidden = true; centerOn(x, y, Math.max(zoom, 4)); return; } // al sitio donde pasó
    const x = e.target.closest('[data-exp]'); if (x) exportBook(x.dataset.exp);
  });
  el.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.y) { if (d.open) bookUI.open.add(+d.dataset.y); else bookUI.open.delete(+d.dataset.y); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) el.hidden = true; });
  el.querySelector('.bk-sort').onchange = e => { bookUI.sort = e.target.value; renderBook(); };
  el.querySelector('.bk-nat').onchange = e => { bookUI.nat = e.target.value; renderBook(); };
  el.querySelector('.bk-q').oninput = e => { bookUI.q = e.target.value; renderBook(); };
  return el;
}
function exportBook(kind){
  const ch = bookChapters(), name = `Libro de Historia del Mundo (semilla ${params.seed})`;
  let out, type, ext;
  if (kind === 'txt') {
    out = `${name}\n${'='.repeat(name.length)}\n\n` + ch.map(c => `CAPÍTULO ${ROMAN(c.y)}: ${c.title.toUpperCase()}\n${bookIntro(c)}\n\n${c.es.filter(e => bookFilter(e)).map(e => `  ${bookStarsTxt(e).padEnd(3)} Día ${e.d}. ${e.t}`).join('\n')}\n`).join('\n');
    type = 'text/plain'; ext = 'txt';
  } else {
    out = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(name)}</title><style>body{background:#e8dcc0;color:#3a2a18;font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.55}h1{text-align:center;font-size:30px}h2{border-bottom:2px solid #8a6a3a;margin-top:36px}h2 small{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a6a3a}p.i{font-style:italic}li{margin:4px 0}li.s3{font-weight:bold}li.s1{color:#7a6a4a;font-size:14px}</style></head><body><h1>${esc(name)}</h1>`
      + ch.map(c => `<h2><small>Capítulo ${ROMAN(c.y)} · año ${c.y}</small>${esc(c.title)}</h2><p class="i">${esc(bookIntro(c))}</p><ul>${c.es.filter(e => bookFilter(e)).map(e => `<li class="s${bookStars(e)}"><b>Día ${e.d}.</b> ${esc(e.t)}</li>`).join('')}</ul>`).join('') + '</body></html>';
    type = 'text/html'; ext = 'html';
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type })); a.download = `historia-del-mundo.${ext}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
document.getElementById('bookBtn').onclick = () => { const el = bookPanel(); el.hidden = !el.hidden; if (!el.hidden) renderBook(true); };
setInterval(() => { const el = document.getElementById('book'); if (el && !el.hidden && !el.matches(':hover')) renderBook(); }, 3000);
