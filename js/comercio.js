// World Sim · Mercancías y rutas comerciales: qué produce cada pueblo, qué vale, aranceles, contrabando y embargos
// ================= Comercio =================
// · Cada pueblo produce mercancías según dónde vive (sal en la costa o el desierto, especias y vino donde hace calor,
//   pieles en el frío y los bosques, pescado salado si tiene muelle, cerámica junto a los ríos, telas, armas con
//   herrería, joyas con oro y gemas) y consume un poco de todo. Lo que escasea sube de precio
// · Las caravanas (y las barcas de comercio) cargan la mercancía que más gana yendo de un pueblo al otro; se ve la
//   carga de su color sobre el carro o la barca. Al llegar se vende: el pueblo que la manda gana dinero (o comida); y a la
//   vuelta traen lo que allí sobra y en casa se paga mejor (eso lo cobra el otro pueblo)
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
// Cada persona gasta de cada cosa (lo básico más que los lujos): quien la produce apenas guarda un poco más de lo que
// gasta, así que lo que sobra se vende fuera y lo que se vende fuera se nota; el almacén crece con el pueblo
const DEMAND = { sal:.12, especias:.06, telas:.1, pieles:.06, vino:.07, ceramica:.08, pescado:.12, armas:.04, joyas:.025 };
const goodsCap = g => 30 + popOf(g) * .8;
function goodsTick(g){
  const G = goodsOf(g), m = makes(g), pop = popOf(g), cap = goodsCap(g);
  for (const k in GOODS) { G[k] = clamp((G[k] || 0) + (m[k] || 0) * pop / 10 - pop * DEMAND[k], 0, cap); }
  goodsUse(g);
}
// ================= Para qué sirve cada mercancía =================
// · Pieles y telas: con frío se cosen abrigos para quien no tiene (los soldados, los niños y los mayores primero)
// · Sal y pescado salado: la comida se estropea mucho menos (estaciones.js)
// · Sal, telas y cerámica son lo básico: si faltan (y saben que existen), la gente se queja; vino, especias y joyas alegran
// · Armas: en guerra se reparten a quien no tiene; joyas: los diplomáticos las llevan de regalo y caen mucho mejor
// · Si a un pueblo le falta algo básico que un vecino tiene de sobra y no comercian, la tensión sube (guerras por la sal)
const BASIC_GOODS = ['sal', 'telas', 'ceramica'], LUXURY_GOODS = ['vino', 'especias', 'joyas'];
const goodAmt = (g, k) => goodsOf(g)[k] || 0;
const goodOk = (g, k) => goodAmt(g, k) >= Math.max(2, popOf(g) * .08);
const saltOk = g => goodOk(g, 'sal') || goodOk(g, 'pescado');
let goodsKnownC = null; // qué mercancías produce alguien en el mundo (se mira cada 30 s)
const goodsKnown = () => { if (!goodsKnownC || yearT - goodsKnownC.t > 30 || yearT < goodsKnownC.t) { const S = new Set(); for (const o of villages) if (popOf(o)) { const m = makes(o); for (const k in m) if (m[k] > 0) S.add(k); } goodsKnownC = { t:yearT, S }; } return goodsKnownC.S; };
const atWarG = g => { const n = nationOf(g); for (const r of rels.values()) if (r.war && (r.war.att === n.id || r.war.def === n.id || r.war.att === g.id || r.war.def === g.id)) return true; return false; };
function goodsUse(g){
  const G = goodsOf(g), pop = popOf(g); if (!pop) return;
  const K = goodsKnown(), at = { x:g.fx * T, y:g.fy * T };
  g.lacks = pop >= 25 ? BASIC_GOODS.filter(k => K.has(k) && !goodOk(g, k)) : [];
  g.enjoys = LUXURY_GOODS.filter(k => goodOk(g, k));
  const people = villagers.filter(u => !u.dead && !u.away && u.vid === g.id);
  // Abrigos: con frío, de pieles (2) o de telas (3)
  const cold = seasonInfo().i === 3 || villageTemp(g) < 8;
  if (cold) {
    const need = people.filter(u => !u.coat && ((u.chill || 0) > .02 || u.weapon || ageOf(u) < 6)).sort((a, b) => coatNeed(b) - coatNeed(a));
    let n = 0, used = null;
    for (const u of need) { if (n >= 3) break; const k = G.pieles >= 2 ? 'pieles' : G.telas >= 3 ? 'telas' : null; if (!k) break; G[k] -= k === 'pieles' ? 2 : 3; u.coat = true; n++; used = k; g.coatsSewn = (g.coatsSewn || 0) + 1; }
    if (n && !nationOf(g).coatMsg) { nationOf(g).coatMsg = true; notify(`En ${g.name} empiezan a coser abrigos de ${used === 'pieles' ? 'piel' : 'tela'}: ya no pasarán tanto frío`, at); } // (un aviso por nación; el resto, en la ficha)
  }
  // Armas: en guerra, a los adultos que no tienen (2 de mercancía por arma)
  if ((G.armas || 0) >= 2 && atWarG(g)) {
    const raw = people.filter(u => !u.weapon && ageOf(u) >= ADULT_H && ageOf(u) < (u.life || 20) * .7 && u !== g.leader && !locked(u)).slice(0, Math.min(4, Math.floor(G.armas / 2)));
    for (const u of raw) { u.weapon = hasForge(g) && Math.random() < .4 ? 'espada' : 'lanza'; G.armas -= 2; }
    if (raw.length) { g.armsGiven = (g.armsGiven || 0) + raw.length; if (yearT - (g.armsMsgT ?? -1e9) > DAY_LEN * 2) { g.armsMsgT = yearT; notify(`En ${g.name} reparten ${raw.length} arma${raw.length > 1 ? 's' : ''} de su almacén para la guerra`, at); } }
  }
}
// Las joyas de regalo: el diplomático lleva unas cuantas y la otra nación lo recibe mucho mejor (desde la llegada del diplomático)
function giveJewels(from, to){ const G = goodsOf(from); if ((G.joyas || 0) < 4) return false; G.joyas -= 4; goodsOf(to).joyas = (goodsOf(to).joyas || 0) + 4; floats.push({ x:to.fx * T, y:to.fy * T - 14, txt:'💎 joyas de regalo', col:'#f0d040', life:0 }); return true; }
// ¿Le falta a x algo básico que y tiene de sobra (y no comercian)? Devuelve la mercancía
function goodWant(x, y, r){
  if (yearT - (r.tradeT ?? -1e9) < DAY_LEN * 2 || !popOf(x) || !popOf(y)) return null;
  for (const k of x.lacks || []) if (goodAmt(y, k) >= goodsCap(y) * .5) return k;
  return null;
}
// El ánimo: lo que falta y lo que alegra
{ const base = socialMood; socialMood = function(v, g, add){
  base(v, g, add); if (!g || ageOf(v) < ADULT_H) return;
  for (const k of g.lacks || []) add(-4, `le falta${k === 'telas' ? 'n' : ''} ${GOODS[k].txt}`);
  const L = g.enjoys || [];
  if (L.includes('vino')) add(4, 'bebe buen vino');
  if (L.includes('especias')) add(3, 'come con especias');
  if (L.includes('joyas') && trait(v, 'ambicion') > .5) add(3, 'luce joyas');
}; }
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
  return `<h4>Mercancías</h4><div class="needs">${ks.slice(0, 9).map(k => `<span><i style="display:inline-block;width:8px;height:8px;background:${GOODS[k].col};margin-right:4px"></i>${esc(capFirst(GOODS[k].txt))}</span>${bar((G[k] || 0) / goodsCap(g), GOODS[k].col, 120)}<span>${Math.floor(G[k] || 0)} · vale ${String(Math.round(goodPrice(g, k) * 10) / 10).replace('.', ',')}${m[k] ? ' · produce' : ''}</span>`).join('')}</div>
    ${goodsUseHtml(g)}<div class="muted" style="font-size:12px">${hasLaw(g, 'aranceles') ? 'Cobra aranceles a las mercancías de fuera · ' : ''}${g.tradeWealth ? `ha ganado ${Math.round(g.tradeWealth)} con el comercio` : ''}</div>`;
}
// En la ficha: para qué le está sirviendo lo que tiene y qué le falta
function goodsUseHtml(g){
  const L = [], list = a => a.map(k => GOODS[k].txt).join(', ').replace(/, ([^,]*)$/, ' y $1');
  if ((g.lacks || []).length) L.push(`<span style="color:#e08a6a">Le falta ${list(g.lacks)}: la gente se queja</span>`);
  if (saltOk(g)) L.push('Con sal, la comida se estropea menos');
  if (g.coatsSewn) L.push(`${g.coatsSewn} abrigo${g.coatsSewn > 1 ? 's' : ''} cosido${g.coatsSewn > 1 ? 's' : ''} con pieles y telas`);
  if (g.armsGiven) L.push(`${g.armsGiven} arma${g.armsGiven > 1 ? 's' : ''} repartida${g.armsGiven > 1 ? 's' : ''} para la guerra`);
  if ((g.enjoys || []).length) L.push(`Disfrutan de ${list(g.enjoys)}`);
  return L.length ? `<div style="font-size:12px;margin:4px 0;display:flex;flex-direction:column;gap:2px">${L.map(x => `<span>· ${x}</span>`).join('')}</div>` : '';
}
