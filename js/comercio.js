// Forja de Mundos · Mercancías y rutas comerciales: qué produce cada pueblo, qué vale, aranceles, contrabando y embargos
// ================= Comercio =================
// · Cada pueblo produce mercancías según dónde vive (sal en la costa o el desierto, especias y vino donde hace calor,
//   pieles en el frío y los bosques, pescado salado si tiene muelle, cerámica junto a los ríos, telas, armas con
//   herrería, joyas con oro y gemas) y consume un poco de todo. Lo que escasea sube de precio
// · Las caravanas (y las barcas de comercio) cargan la mercancía que más gana yendo de un pueblo al otro; se ve la
//   carga de su color sobre el carro o la barca. Al llegar se vende: el pueblo que la manda gana dinero (o comida)
// · Aranceles (ley): la nación que los tiene cobra una parte al entrar; entonces algunos prefieren el contrabando, que
//   si lo pillan pierde la carga. El Consejo de las Naciones puede embargar a un sancionado
const GOODS = {
  sal:       { txt:'sal', col:'#f2f0ea', base:4 },
  especias:  { txt:'especias', col:'#d8702a', base:9 },
  telas:     { txt:'telas', col:'#c8a0e0', base:6 },
  pieles:    { txt:'pieles', col:'#8a5a30', base:5 },
  vino:      { txt:'vino', col:'#8a1a3a', base:7 },
  ceramica:  { txt:'cerámica', col:'#c8683a', base:5 },
  pescado:   { txt:'pescado salado', col:'#9ac8e0', base:4 },
  armas:     { txt:'armas', col:'#a8b0b8', base:12 },
  joyas:     { txt:'joyas', col:'#f0d040', base:16 },
};
// Lo que hay alrededor del pueblo (se mira una vez)
function envOf(g){
  if (g.env) return g.env; let sea = 0, dry = 0, fresh = 0, cold = 0, warm = 0, forest = 0, n = 0;
  for (let k = 0; k < 80; k++) { const x = clamp(g.fx + Math.round((Math.random() - .5) * 34), 0, W - 1), y = clamp(g.fy + Math.round((Math.random() - .5) * 34), 0, H - 1), i = y * W + x, b = world.biome[i]; n++;
    if (WATER[b] && !FRESH(b)) sea++; if (FRESH(b)) fresh++; if (b === B.DESERT || b === B.DRY || b === B.SAND) dry++; if (b === B.FOREST) forest++; const t = world.baseT ? world.baseT[i] : 15; if (t < 6) cold++; if (t > 20) warm++; }
  return g.env = { sea:sea / n, dry:dry / n, fresh:fresh / n, cold:cold / n, warm:warm / n, forest:forest / n };
}
// Cuánto produce de cada cosa (por cada 10 habitantes, cada 20 s)
function makes(g){
  const e = envOf(g), farms = [...farmMap.values()].filter(f => f.vid === g.id).length;
  return { sal:e.sea > .15 || e.dry > .2 ? 2 : 0, especias:e.warm > .4 ? 1.4 : 0, telas:(g.cloth || 0) > 2 || woolOf(g) ? 1.5 : .3, pieles:(g.hides || 0) > 0 || e.cold > .3 || e.forest > .3 ? 1 : 0,
    vino:e.warm > .25 && farms >= 8 ? 1.2 : 0, ceramica:e.fresh > .04 ? 1.2 : 0, pescado:g.port ? 2 : 0, armas:hasForge(g) ? 1 : 0, joyas:(g.gold || 0) + (g.gems || 0) > 4 ? .6 : 0 };
}
const goodsOf = g => (g.goods ||= {});
const goodPrice = (g, k) => { const s = goodsOf(g)[k] || 0, pop = Math.max(1, popOf(g)); return GOODS[k].base * clamp((pop * .6 + 4) / (s + 3), .3, 4); };
// Producción y consumo (desde econTick, o cada 20 s en los pueblos sin moneda)
function goodsTick(g){
  const G = goodsOf(g), m = makes(g), pop = popOf(g);
  for (const k in GOODS) { G[k] = clamp((G[k] || 0) + (m[k] || 0) * pop / 10 - pop * .03, 0, 80); }
}
// Al salir la caravana: carga lo que más gana
function loadCargo(t, from, to){
  const G = goodsOf(from); let best = null, gain = 1.2;
  for (const k in GOODS) { if ((G[k] || 0) < 5) continue; const ratio = goodPrice(to, k) / goodPrice(from, k); if (ratio > gain) { gain = ratio; best = k; } }
  if (!best) return;
  const n = Math.min(Math.floor(G[best]), hasLonja(from) || hasLonja(to) ? 20 : 12); G[best] -= n; t.cargo = { k:best, n, ratio:gain };
  if (hasLaw(to, 'aranceles') && nationOf(to) !== nationOf(from) && Math.random() < .35) t.smuggle = true; // contrabando
}
// Al llegar: se vende (aranceles y contrabando) y lo cobra el pueblo que la manda
function sellCargo(t, from, to){
  const c = t.cargo; if (!c) return '';
  t.cargo = null; const at = { x:to.fx * T, y:to.fy * T };
  if (t.smuggle && hasCourt(to) && Math.random() < .3) { goodsOf(to)[c.k] = (goodsOf(to)[c.k] || 0) + c.n; notify(`En ${to.name} pillan a contrabandistas de ${from.name}: les quitan ${c.n} de ${GOODS[c.k].txt}`, at); return ' (contrabando confiscado)'; }
  goodsOf(to)[c.k] = (goodsOf(to)[c.k] || 0) + c.n;
  const value = c.n * goodPrice(to, c.k), tariff = !t.smuggle && hasLaw(to, 'aranceles') && nationOf(to) !== nationOf(from) ? .25 : 0;
  if (tariff && to.coin) ecOf(to).treas += value * tariff * ecOf(to).P * .1;
  const net = value * (1 - tariff);
  if (from.coin) ecOf(from).treas += net * ecOf(from).P * .1; else from.food += net * .3;
  from.tradeWealth = (from.tradeWealth || 0) + net;
  return ` · lleva ${c.n} de ${GOODS[c.k].txt}${c.ratio > 2 ? `, que allí se paga a ${String(Math.round(c.ratio * 10) / 10).replace('.', ',')} veces su precio` : ''}${tariff ? ' (paga aranceles)' : t.smuggle ? ' (de contrabando)' : ''}`;
}
function goodsCard(g){
  const G = goodsOf(g), m = makes(g), ks = Object.keys(GOODS).filter(k => (G[k] || 0) >= 1 || m[k]);
  if (!ks.length) return '';
  return `<h4>Mercancías</h4><div class="needs">${ks.slice(0, 9).map(k => `<span><i style="display:inline-block;width:8px;height:8px;background:${GOODS[k].col};margin-right:4px"></i>${esc(capFirst(GOODS[k].txt))}</span>${bar((G[k] || 0) / 80, GOODS[k].col, 120)}<span>${Math.floor(G[k] || 0)} · vale ${String(Math.round(goodPrice(g, k) * 10) / 10).replace('.', ',')}${m[k] ? ' · produce' : ''}</span>`).join('')}</div>
    <div class="muted" style="font-size:12px">${hasLaw(g, 'aranceles') ? 'Cobra aranceles a las mercancías de fuera · ' : ''}${g.tradeWealth ? `ha ganado ${Math.round(g.tradeWealth)} con el comercio` : ''}</div>`;
}
