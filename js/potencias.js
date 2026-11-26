// World Sim · Las potencias mundiales: economía, ejército, expansión y ciudadanos
// ================= Potencias =================
// Una pestaña más en Historia: cada nación con su puesto en cada categoría y en la clasificación general
// (superpotencia, gran potencia, potencia regional o nación menor). Cuando cambia la primera, sale en las noticias.
function powersData(){
  const out = [];
  for (const n of villages) {
    if (nationOf(n) !== n) continue;
    const mem = villages.filter(o => popOf(o) && nationOf(o) === n); if (!mem.length) continue;
    const ppl = villagers.filter(u => !u.dead && mem.some(o => o.id === u.vid)), pop = ppl.length; if (!pop) continue;
    let routes = 0; for (const r of rels.values()) if (r.route && mem.some(o => o.id === r.route.a || o.id === r.route.b)) routes++;
    const goods = mem.reduce((a, o) => a + o.food + o.wood + (o.stone || 0) + (o.iron || 0) * 3 + (o.gold || 0) * 10, 0);
    const eco = goods / 10 + routes * 25 + mem.filter(o => o.factory).length * 60 + ppl.reduce((a, u) => a + (u.money || 0), 0) / 20;
    const armed = ppl.filter(u => u.weapon).length, mil = armed * (knowsSci(n, 'polvora') ? 1.5 : 1) * 3 + (knowsSci(n, 'dirigible') ? 20 : 0);
    const exp = mem.length * 20 + mem.reduce((a, o) => a + buildingsOf(o).length, 0);
    const happy = ppl.length ? ppl.reduce((a, u) => a + (moodOf(u).score || 50), 0) / ppl.length : 50;
    const cit = pop * (.5 + happy / 100);
    out.push({ n, pop, happy:Math.round(happy), mem:mem.length, armed, routes, eco, mil, exp, cit });
  }
  for (const k of ['eco', 'mil', 'exp', 'cit']) { const max = Math.max(1, ...out.map(e => e[k])); for (const e of out) e[k + 'N'] = e[k] / max; }
  for (const e of out) e.total = (e.ecoN + e.milN + e.expN + e.citN) / 4;
  out.sort((a, b) => b.total - a.total);
  out.forEach((e, i) => { e.tier = i === 0 && (out.length < 2 || e.total > out[1].total * 1.35) ? 'Superpotencia' : e.total > .55 ? 'Gran potencia' : e.total > .3 ? 'Potencia regional' : 'Nación menor'; });
  return out;
}
let powCache = null;
function powersTick(){
  const P = powersData(); powCache = { t:yearT, P }; const top = P[0]; if (!top) return;
  if (world.topPower !== top.n.id && P.length > 1) {
    const had = world.topPower != null; world.topPower = top.n.id;
    if (had) notify(`${top.n.name} se convierte en la primera potencia mundial${top.tier === 'Superpotencia' ? ': ya es una superpotencia' : ''}`, { x:top.n.fx * T, y:top.n.fy * T });
  }
}
function powersHtml(){
  const P = powersData(); if (!P.length) return '<div class="muted" style="padding:10px">Aún no hay naciones.</div>';
  const rank = k => { const s = P.slice().sort((a, b) => b[k] - a[k]); return e => s.indexOf(e) + 1; };
  const R = { eco:rank('eco'), mil:rank('mil'), exp:rank('exp'), cit:rank('cit') }, medal = i => ['🥇', '🥈', '🥉'][i - 1] || `${i}.º`;
  const bar = (f, col) => `<span class="pw-bar"><i style="width:${Math.round(f * 100)}%;background:${col}"></i></span>`;
  const flag = n => n.flagUrl ? `<img src="${n.flagUrl}" alt="">` : `<i class="pw-sq" style="background:rgb(${villageColor(n).join(',')})"></i>`;
  return `<div class="pw"><p class="muted pw-note">Clasificación de las naciones del mundo. Cada categoría se compara con la mejor (100 %).</p>${P.map((e, i) => `
    <div class="pw-row${i === 0 ? ' top' : ''}"><div class="pw-h"><b class="pw-pos">${medal(i + 1)}</b>${flag(e.n)}<b>${esc(e.n.name)}</b><span class="pw-tier t${['Superpotencia', 'Gran potencia', 'Potencia regional', 'Nación menor'].indexOf(e.tier)}">${e.tier}</span><span class="muted">${esc(REGIMES[regimeOf(e.n)] || regimeOf(e.n))}</span></div>
      <div class="pw-g">
        <span>⛁ Economía</span>${bar(e.ecoN, '#e0b850')}<span>${medal(R.eco(e))} · ${e.routes} ruta${e.routes === 1 ? '' : 's'}</span>
        <span>⚔ Ejército</span>${bar(e.milN, '#d86a5a')}<span>${medal(R.mil(e))} · ${e.armed} armados</span>
        <span>⚑ Expansión</span>${bar(e.expN, '#6aa8d8')}<span>${medal(R.exp(e))} · ${e.mem} pueblo${e.mem === 1 ? '' : 's'}</span>
        <span>☺ Ciudadanos</span>${bar(e.citN, '#7ac06a')}<span>${medal(R.cit(e))} · ${e.pop} hab., ánimo ${e.happy}</span>
      </div></div>`).join('')}</div>`;
}
{ const base = renderHistory; renderHistory = function(){
  const el = $('histPanel'); if (el && !el.hidden && histTab === 'potencias') { el.querySelector('.hp-body').innerHTML = powersHtml(); return; }
  return base.apply(this, arguments);
}; }
// ================= Quién va primero en cada mercancía =================
// Otra pestaña en Historia: para cada mercancía (y para la comida, la madera, la piedra, el hierro...) el podio de
// naciones que más tienen y producen. En la ficha del pueblo, la medalla si su nación es la primera del mundo en algo
const RAW_GOODS = { food:{ txt:'comida', col:'#8ac04e' }, wood:{ txt:'madera', col:'#a87448' }, stone:{ txt:'piedra', col:'#a8a49c' }, iron:{ txt:'hierro', col:'#7a8a9a' },
  gold:{ txt:'oro', col:'#f0c840' }, coal:{ txt:'carbón', col:'#3a3a40' }, fuel:{ txt:'combustible', col:'#2a2018' }, chips:{ txt:'chips', col:'#4ac0a0' }, phones:{ txt:'móviles', col:'#6a8ad8' } };
function goodsBoard(){
  const nats = new Map();
  for (const g of villages) {
    if (!popOf(g)) continue; const n = nationOf(g); let e = nats.get(n); if (!e) nats.set(n, e = { n, have:{}, make:{} });
    const G = goodsOf(g), m = makes(g), pop = popOf(g);
    for (const k in GOODS) { e.have[k] = (e.have[k] || 0) + (G[k] || 0); e.make[k] = (e.make[k] || 0) + (m[k] || 0) * pop / 10 * DAY_LEN / 20; }
    for (const k in RAW_GOODS) e.have[k] = (e.have[k] || 0) + (g[k] || 0);
  }
  const out = {}, all = [...nats.values()];
  for (const k of [...Object.keys(GOODS), ...Object.keys(RAW_GOODS)]) {
    const sc = e => (e.make[k] || 0) * 2 + (e.have[k] || 0); // primero quien más produce; a igualdad, quien más tiene
    out[k] = all.filter(e => sc(e) >= 1).sort((a, b) => sc(b) - sc(a)).slice(0, 3);
  }
  return out;
}
let goodsBoardC = null;
const goodsBoardNow = () => (goodsBoardC && yearT - goodsBoardC.t < 20 ? goodsBoardC : (goodsBoardC = { t:yearT, B:goodsBoard() })).B;
// En qué es primera del mundo una nación (para la ficha del pueblo)
const goodsFirst = n => { const B = goodsBoardNow(); return Object.keys(B).filter(k => B[k][0] && B[k][0].n === n && B[k].length > 1); };
function goodsBoardHtml(){
  const B = goodsBoardNow(), medal = i => ['🥇', '🥈', '🥉'][i];
  const flag = n => n.flagUrl ? `<img src="${n.flagUrl}" alt="">` : `<i class="pw-sq" style="background:rgb(${villageColor(n).join(',')})"></i>`;
  const num = x => x >= 100 ? Math.round(x) : String(Math.round(x * 10) / 10).replace('.', ',');
  const row = (k, def) => { const P = B[k]; if (!P.length) return '';
    return `<div class="gb-row"><span class="gb-k"><i style="background:${def.col}"></i>${esc(capFirst(def.txt))}</span><span class="gb-p">${P.map((e, i) => `<span class="gb-n${i ? '' : ' top'}">${medal(i)}${flag(e.n)}<b>${esc(e.n.name)}</b><span class="muted">${e.make[k] ? `${num(e.make[k])}/día · ` : ''}tiene ${Math.round(e.have[k] || 0)}</span></span>`).join('')}</span></div>`; };
  const goods = Object.keys(GOODS).map(k => row(k, GOODS[k])).join(''), raw = Object.keys(RAW_GOODS).map(k => row(k, RAW_GOODS[k])).join('');
  if (!goods && !raw) return '<div class="muted" style="padding:10px">Aún no hay naciones con mercancías.</div>';
  return `<div class="pw"><p class="muted pw-note">Quién va primero en cada mercancía: va delante quien más produce y, a igualdad, quien más tiene guardado.</p>${goods ? `<h4>Mercancías del comercio</h4>${goods}` : ''}${raw ? `<h4>Materias primas</h4>${raw}` : ''}</div>`;
}
{ const base = renderHistory; renderHistory = function(){
  const el = $('histPanel'); if (el && !el.hidden && histTab === 'bienes') { el.querySelector('.hp-body').innerHTML = goodsBoardHtml(); return; }
  return base.apply(this, arguments);
}; }
// En la ficha del pueblo, bajo las mercancías: en qué es primera del mundo su nación
{ const base = goodsCard; goodsCard = function(g){
  const h = base.apply(this, arguments); if (!h) return h;
  const first = goodsFirst(nationOf(g)); if (!first.length) return h;
  return h + `<div class="muted" style="font-size:12px">🥇 ${esc(nationOf(g).name)} es la primera del mundo en ${first.map(k => (GOODS[k] || RAW_GOODS[k]).txt).join(', ').replace(/, ([^,]*)$/, ' y $1')}</div>`;
}; }
// Monopolios: cuando una nación produce más de la mitad de una mercancía del mundo, sale en las noticias (cada medio día se mira)
{ const base = powersTick; powersTick = function(){
  base.apply(this, arguments);
  const B = goodsBoard(), lead = world.goodLead ||= {};
  for (const k of Object.keys(GOODS)) {
    const P = B[k]; if (P.length < 2) continue;
    const tot = P.reduce((a, e) => a + (e.make[k] || 0), 0), top = P[0], share = tot ? (top.make[k] || 0) / tot : 0;
    if (share > .55 && lead[k] !== top.n.id) { const had = lead[k] != null; lead[k] = top.n.id; if (had) { notify(`${top.n.name} controla ya ${Math.round(share * 100)} % de ${({ sal:'la', ceramica:'la', vino:'el', pescado:'el' })[k] || 'las'} ${GOODS[k].txt} del mundo`, { x:top.n.fx * T, y:top.n.fy * T }); break; } }
  }
}; }
