// World Sim · Árbol de la ciencia: qué ha descubierto cada nación, qué le falta y cuánto saber acumula
// ================= Árbol de la ciencia =================
// · Los descubrimientos dejan de ir en fila: cada uno pide antes otros (la vacuna, la medicina; el vapor, la metalurgia
//   y el reloj…). La nación investiga el más barato de los que ya puede (sciGoal)
// · Cada nación elige qué investigar según lo que vive (sciWant); el jugador puede elegirlo pulsando en el árbol
// · Ventana «Ciencia» (botón de arriba o desde la ficha del pueblo): el árbol de la nación elegida (descubierto,
//   investigando, disponible, bloqueado), su ritmo de investigación, los saberes de cada uno de sus pueblos
//   (pozos, barcas, escritura…) y la comparación con las demás naciones
const SCI_REQ = { medicina:[], agronomia:[], registro_civil:['agronomia'], metalurgia:[], astronomia:[], empedrado:['metalurgia'], economia:['registro_civil'],
  aeronautica:['astronomia'], reloj:['metalurgia', 'astronomia'], polvora:['metalurgia'], vacunas:['medicina'], vapor:['metalurgia', 'reloj'], ferrocarril:['vapor', 'empedrado'], dirigible:['vapor', 'aeronautica'] };
const SCI_ICON = { medicina:'⚕️', agronomia:'🌾', registro_civil:'🪪', metalurgia:'⚒️', astronomia:'🔭', empedrado:'🛣️', economia:'💰', aeronautica:'🎈', reloj:'🕰️', polvora:'💥', vacunas:'💉', vapor:'🏭', ferrocarril:'🚂', dirigible:'🛩️' };
for (const d of DISCOVERIES) d.req ||= (SCI_REQ[d.k] || []).filter(k => DISCOVERIES.some(x => x.k === k));
const sciReady = (g, d) => d.req.every(k => knowsSci(g, k));
// Qué conviene investigar según lo que vive la nación (y un poco de gusto propio): en guerra, pólvora y metal; con hambre,
// el campo; con puerto, mirar las estrellas; con epidemias, la medicina… Si el jugador ha elegido uno, ese
function sciWant(n, d){
  const towns = liveTowns().filter(o => nationOf(o) === n), pop = towns.reduce((a, o) => a + popOf(o), 0), food = towns.reduce((a, o) => a + (o.food || 0), 0);
  const war = [...rels.values()].some(r => r.war && (r.war.att === n.id || r.war.def === n.id)), sick = villagers.some(u => !u.dead && u.sick && towns.some(o => o.id === u.vid));
  let w = 1 + (hashStr(n.name + d.k) % 100) / 100; // el gusto de cada nación
  if (war && ['polvora', 'metalurgia', 'aeronautica', 'dirigible'].includes(d.k)) w *= 3;
  if (food < pop * 1.5 && ['agronomia', 'empedrado'].includes(d.k)) w *= 3;
  if (towns.some(o => o.port) && ['astronomia', 'vapor'].includes(d.k)) w *= 2;
  if (sick && ['medicina', 'vacunas'].includes(d.k)) w *= 3;
  if (towns.some(o => o.coin) && ['economia', 'registro_civil'].includes(d.k)) w *= 1.6;
  if (towns.some(o => hasMine(o)) && ['metalurgia', 'vapor', 'ferrocarril'].includes(d.k)) w *= 1.6;
  return w / d.cost;
}
function sciGoal(g){
  const n = nationOf(g), S = sciOf(g), ok = d => d && !S[d.k] && sciReady(g, d);
  const pick = n.sciPick && DISCOVERIES.find(x => x.k === n.sciPick); if (ok(pick)) return pick; n.sciPick = null;
  let d = n.sciGoal && DISCOVERIES.find(x => x.k === n.sciGoal);
  if (!ok(d)) { d = DISCOVERIES.filter(ok).sort((a, b) => sciWant(n, b) - sciWant(n, a))[0] || null; n.sciGoal = d ? d.k : null; }
  return d;
}
// Los descubrimientos se contagian menos al comerciar (antes acababan todas las naciones con lo mismo)
spreadScience = function(a, b){
  for (const [x, y] of [[a, b], [b, a]]) {
    const miss = DISCOVERIES.filter(d => knowsSci(x, d.k) && !knowsSci(y, d.k) && sciReady(y, d)); if (!miss.length || Math.random() > .04) continue;
    const d = miss[0]; sciOf(y)[d.k] = Math.floor(yearT / DAY_LEN) + 1; if (nationOf(y).sciGoal === d.k) nationOf(y).sciGoal = null;
    notify(`Los de ${nationOf(y).name} aprenden ${d.txt} de ${nationOf(x).name}`, { x:y.fx * T, y:y.fy * T });
  }
};
// Investigar: como antes, pero hacia el objetivo del árbol; y se apunta cuánto se ha investigado en total (para el ritmo)
research = function(g, pts){
  const n = nationOf(g), S = sciOf(g); n.research = (n.research || 0) + pts; n.sciTotal = (n.sciTotal || 0) + pts;
  const day = Math.floor(yearT / DAY_LEN), H = n.sciHist ||= []; if (!H.length || H[H.length - 1][0] !== day) { H.push([day, n.sciTotal]); if (H.length > 8) H.shift(); }
  const next = sciGoal(g); if (!next || n.research < next.cost) return;
  n.research -= next.cost; S[next.k] = day + 1; n.sciGoal = null; if (n.sciPick === next.k) n.sciPick = null;
  const first = !(world.sciFirst ||= {})[next.k]; if (first) world.sciFirst[next.k] = n.id;
  notify(`${first ? '¡Por primera vez en el mundo! ' : ''}Los sabios de ${n.name} descubren ${next.txt}: ${next.eff}`, { x:n.fx * T, y:n.fy * T });
  sendNews(n, `los sabios de ${n.name} han descubierto ${next.txt}`);
  if (first) { const sage = villagers.filter(u => !u.dead && u.vid === n.id && ageOf(u) >= ADULT_H).sort((a, b) => (b.oficio === 'sabio') - (a.oficio === 'sabio') || (b.edu || 0) - (a.edu || 0))[0]; if (sage) addHero(n, sage, `fue de los primeros del mundo en descubrir ${next.txt}`); }
  { const el = $('sciTree'); if (el && !el.hidden) renderSciTree(); }
};
const sciRate = n => { const H = n.sciHist || []; if (H.length < 2) return 0; const [d0, t0] = H[0], [d1, t1] = H[H.length - 1]; return d1 > d0 ? (t1 - t0) / (d1 - d0) : 0; };
// En la ficha del pueblo: lo de antes, con el objetivo del árbol y un botón para abrirlo
scienceCard = function(g){
  const S = sciOf(g), n = nationOf(g), got = DISCOVERIES.filter(d => S[d.k]), next = sciGoal(g);
  if (!got.length && !hasInst(g, 'universidad')) return `<h4>Ciencia</h4><div class="muted">Sin universidad todavía</div><button class="sci-open" data-scitree="${n.id}">🔬 Ver el árbol de la ciencia</button>`;
  return `<h4>Ciencia</h4>${next && hasInst(g, 'universidad') ? `<div class="needs"><span>Investigando ${esc(next.txt)}</span>${bar((n.research || 0) / next.cost, '#8ab4d8', 150)}<span>${Math.round((n.research || 0) / next.cost * 100)} %</span></div>` : ''}
    <div class="muted">${got.length} de ${DISCOVERIES.length} descubrimientos</div><button class="sci-open" data-scitree="${n.id}">🔬 Ver el árbol de la ciencia</button>`;
};

// ---- Los saberes de cada pueblo (lo que aprenden por su cuenta, sin universidad) ----
const SABERES = [['pozo', '💧', 'Pozos'], ['molino', '🌾', 'Molinos'], ['antorchas', '🔥', 'Antorchas'], ['bomberos', '🪣', 'Apagar fuegos'], ['puente', '🌉', 'Puentes'],
  ['barca', '⛵', 'Barcas y muelle'], ['montar', '🐎', 'Montar y carros'], ['acequias', '🚿', 'Acequias'], ['cantera', '🪨', 'Canteras'], ['mineria', '⛏️', 'Minería'],
  ['escritura', '✍️', 'Escritura'], ['papel', '📜', 'Papel y mapas'], ['manga', '🎐', 'Manga de viento'], ['globo', '🎈', 'Globos'], ['pirotecnia', '🎆', 'Pirotecnia']];

// ---- Ventana ----
const sciUI = { nat:null };
const sciNations = () => liveTowns().filter(o => nationOf(o) === o).sort((a, b) => DISCOVERIES.filter(d => knowsSci(b, d.k)).length - DISCOVERIES.filter(d => knowsSci(a, d.k)).length || popOf(b) - popOf(a));
const sciName = n => esc(n.name || 'Nación sin nombre');
const sciFlag = g => g.flagUrl ? `<img class="sci-fl" src="${g.flagUrl}" alt="">` : `<span class="sci-fl" style="background:rgb(${villageColor(g).join(',')})"></span>`;
function sciDepth(d, memo = {}){ if (memo[d.k] != null) return memo[d.k]; return memo[d.k] = d.req.length ? 1 + Math.max(...d.req.map(k => sciDepth(DISCOVERIES.find(x => x.k === k), memo))) : 0; }
function sciPanel(){
  let el = $('sciTree'); if (el) return el;
  el = document.createElement('div'); el.id = 'sciTree'; el.className = 'book sci'; el.hidden = true;
  el.innerHTML = `<div class="bk-page"><div class="bk-h"><div><h2>🔬 Ciencia y saberes</h2><span class="bk-count">Qué ha descubierto cada nación y qué le queda</span></div>
    <select class="sci-nat" aria-label="Nación"></select><button class="x" aria-label="Cerrar">×</button></div><div class="sci-body"></div></div>`;
  document.querySelector('.stage').appendChild(el);
  el.addEventListener('click', e => {
    if (e.target.closest('.x') || e.target === el) { el.hidden = true; return; }
    const r = e.target.closest('[data-scinat]'); if (r) { sciUI.nat = +r.dataset.scinat; renderSciTree(); el.querySelector('.sci-body').scrollTo({ top:0, behavior:'smooth' }); return; }
    const pk = e.target.closest('.sci-node.open, .sci-node.now'); if (pk) { const n = villageById(sciUI.nat); if (n) { n.sciPick = pk.dataset.k; n.sciGoal = null; renderSciTree(); } return; }
    const g = e.target.closest('[data-scigo]'); if (g) { const o = villageById(+g.dataset.scigo); if (o) { el.hidden = true; centerOn(o.fx * T, o.fy * T, Math.max(zoom, 3)); } }
  });
  el.querySelector('.sci-nat').onchange = e => { sciUI.nat = +e.target.value; renderSciTree(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) el.hidden = true; });
  window.addEventListener('resize', () => { if (!el.hidden) sciLines(); });
  return el;
}
function openSciTree(natId){ const el = sciPanel(); if (natId != null) sciUI.nat = natId; el.hidden = false; renderSciTree(); }
function renderSciTree(){
  const el = sciPanel(), nats = sciNations(); if (!nats.length) { el.querySelector('.sci-body').innerHTML = '<p class="muted">No queda ninguna nación.</p>'; return; }
  let n = nats.find(o => o.id === sciUI.nat); if (!n) { const f = follow && villageById(follow.vid); n = (f && nationOf(f)) || nats[0]; sciUI.nat = n.id; }
  const sel = el.querySelector('.sci-nat'); sel.innerHTML = nats.map(o => `<option value="${o.id}"${o === n ? ' selected' : ''}>${sciName(o)}</option>`).join('');
  const S = sciOf(n), got = DISCOVERIES.filter(d => S[d.k]), goal = sciGoal(n), towns = liveTowns().filter(o => nationOf(o) === n);
  const unis = towns.filter(o => hasInst(o, 'universidad')).length, sages = villagers.filter(u => !u.dead && u.oficio === 'sabio' && towns.some(o => o.id === u.vid)).length;
  const firsts = DISCOVERIES.filter(d => world.sciFirst && world.sciFirst[d.k] === n.id).length, rate = sciRate(n);
  const eta = goal && rate > .01 ? Math.max(0, Math.ceil((goal.cost - (n.research || 0)) / rate)) : null;
  // Resumen
  let h = `<section class="sci-sum">${sciFlag(n)}<div class="sci-nm"><b>${sciName(n)}</b><span>${towns.length} ${towns.length === 1 ? 'pueblo' : 'pueblos'} · ${towns.reduce((a, o) => a + popOf(o), 0)} habitantes</span></div>
    <div class="sci-st"><b>${got.length}<small>/${DISCOVERIES.length}</small></b><span>descubrimientos</span></div>
    <div class="sci-st"><b>${Math.round(got.reduce((a, d) => a + d.cost, 0) + (n.research || 0))}</b><span>saber acumulado</span></div>
    <div class="sci-st"><b>${rate ? rate.toFixed(1) : '—'}</b><span>puntos al día</span></div>
    <div class="sci-st"><b>${unis}</b><span>${unis === 1 ? 'universidad' : 'universidades'}</span></div>
    <div class="sci-st"><b>${sages}</b><span>sabios</span></div>
    <div class="sci-st"><b>${firsts}</b><span>primeros del mundo</span></div></section>`;
  h += goal ? `<div class="sci-goal">Investigando <b>${SCI_ICON[goal.k] || '📘'} ${esc(capFirst(goal.txt))}</b><div class="sci-bar"><i style="width:${Math.min(100, (n.research || 0) / goal.cost * 100).toFixed(1)}%"></i></div><span>${Math.round(n.research || 0)} / ${goal.cost}${eta != null ? ` · unos ${eta} ${eta === 1 ? 'día' : 'días'}` : unis ? '' : ' · sin universidad apenas avanzan'}</span></div>`
    : got.length === DISCOVERIES.length ? `<div class="sci-goal done">¡Lo han descubierto todo!</div>` : '';
  // Árbol: por columnas según lo que pide cada uno
  const memo = {}, cols = []; for (const d of DISCOVERIES) (cols[sciDepth(d, memo)] ||= []).push(d);
  h += `<h3 class="sci-h">Árbol de descubrimientos</h3><div class="sci-tree"><svg class="sci-svg"></svg>${cols.map((c, i) => `<div class="sci-col"><em>${['Primeros pasos', 'Segunda ola', 'Tercera ola', 'Era moderna', 'Era industrial', 'Más allá'][i] || 'Nivel ' + (i + 1)}</em>${c.map(d => {
    const has = S[d.k], st = has ? 'got' : d === goal ? 'now' : sciReady(n, d) ? 'open' : 'lock', firstN = world.sciFirst && world.sciFirst[d.k] != null && villageById(world.sciFirst[d.k]);
    const who = sciNations().filter(o => knowsSci(o, d.k)).length;
    return `<div class="sci-node ${st}" data-k="${d.k}" data-req="${d.req.join(',')}"><div class="sci-ic">${SCI_ICON[d.k] || '📘'}</div><div><b>${esc(capFirst(d.txt))}</b><p>${esc(d.eff)}</p>
      <span class="sci-tag">${has ? `✓ día ${has}` : st === 'now' ? `investigando · ${Math.round((n.research || 0) / d.cost * 100)} %${n.sciPick === d.k ? ' · elegido por ti' : ''}` : st === 'open' ? `disponible · ${d.cost} puntos · pulsa para investigarlo` : `necesita ${d.req.filter(k => !S[k]).map(k => esc(DISCOVERIES.find(x => x.k === k).txt)).join(' y ')}`}</span>
      <span class="sci-who">${who ? `${who} ${who === 1 ? 'nación lo sabe' : 'naciones lo saben'}` : 'nadie lo sabe aún'}${firstN ? ` · los primeros: ${sciName(firstN)}` : ''}</span></div></div>`; }).join('')}</div>`).join('')}</div>`;
  // Saberes de los pueblos
  h += `<h3 class="sci-h">Saberes de sus pueblos</h3><div class="sci-tw"><table class="sci-t"><thead><tr><th>Pueblo</th>${SABERES.map(([, ic, t]) => `<th title="${t}">${ic}</th>`).join('')}<th>Total</th></tr></thead><tbody>${towns.sort((a, b) => popOf(b) - popOf(a)).map(o => { const kn = o.know || {}, c = SABERES.filter(([k]) => kn[k]).length;
    return `<tr><td><a data-scigo="${o.id}">${esc(o.name)}</a> <small>${popOf(o)} hab.</small></td>${SABERES.map(([k, , t]) => `<td class="${kn[k] ? 'y' : 'n'}" title="${t}: ${kn[k] ? 'lo saben' : 'aún no'}">${kn[k] ? '●' : '·'}</td>`).join('')}<td><b>${c}</b>/${SABERES.length}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="sci-leg">${SABERES.map(([, ic, t]) => `<span>${ic} ${t}</span>`).join('')}</div>`;
  // Comparación entre naciones
  h += `<h3 class="sci-h">Las naciones, comparadas</h3><div class="sci-rank">${nats.map((o, i) => { const c = DISCOVERIES.filter(d => knowsSci(o, d.k)).length, r = sciRate(o);
    return `<div class="sci-row${o === n ? ' me' : ''}" data-scinat="${o.id}"><span class="sci-pos">${i + 1}</span>${sciFlag(o)}<span class="sci-rn">${sciName(o)}</span>
      <span class="sci-dots">${DISCOVERIES.map(d => `<i class="${knowsSci(o, d.k) ? 'y' : ''}" title="${esc(capFirst(d.txt))}">${knowsSci(o, d.k) ? SCI_ICON[d.k] || '●' : ''}</i>`).join('')}</span>
      <span class="sci-rc"><b>${c}</b>/${DISCOVERIES.length}</span><span class="sci-rr">${r ? r.toFixed(1) + '/día' : '—'}</span></div>`; }).join('')}</div>`;
  const body = el.querySelector('.sci-body'), top = body.scrollTop; body.innerHTML = h; body.scrollTop = top;
  sciLines();
}
// Las flechas del árbol: de cada requisito a lo que abre (verdes si ya se sabe)
function sciLines(){
  const el = $('sciTree'), tree = el && el.querySelector('.sci-tree'); if (!tree) return;
  const svg = tree.querySelector('.sci-svg'), R = tree.getBoundingClientRect(), pos = k => { const b = tree.querySelector(`[data-k="${k}"]`); return b && b.getBoundingClientRect(); };
  svg.setAttribute('width', tree.scrollWidth); svg.setAttribute('height', tree.scrollHeight);
  let out = '';
  for (const node of tree.querySelectorAll('.sci-node')) {
    const to = node.getBoundingClientRect();
    for (const k of node.dataset.req.split(',').filter(Boolean)) {
      const fr = pos(k); if (!fr) continue;
      const x1 = fr.right - R.left + tree.scrollLeft, y1 = fr.top + fr.height / 2 - R.top + tree.scrollTop, x2 = to.left - R.left + tree.scrollLeft, y2 = to.top + to.height / 2 - R.top + tree.scrollTop, mx = (x1 + x2) / 2;
      const ok = tree.querySelector(`[data-k="${k}"]`).classList.contains('got');
      out += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 4},${y2}" class="${ok ? 'ok' : ''}" marker-end="url(#sciArr${ok ? 'Ok' : ''})"/>`;
    }
  }
  svg.innerHTML = `<defs><marker id="sciArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#b8a47c"/></marker><marker id="sciArrOk" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4a8a3a"/></marker></defs>` + out;
}
document.addEventListener('click', e => {
  if (e.target.closest('#sciBtn')) { const el = sciPanel(); if (el.hidden) openSciTree(); else el.hidden = true; return; } // (por delegación: la interfaz rehace la barra de arriba)
  const b = e.target.closest('[data-scitree]'); if (b) openSciTree(+b.dataset.scitree);
});
setInterval(() => { const el = $('sciTree'); if (el && !el.hidden && !el.matches(':hover') && world) renderSciTree(); }, 3000);
