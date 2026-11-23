// Forja de Mundos · Las potencias mundiales: economía, ejército, expansión y ciudadanos
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
