// Forja de Mundos · Tipos de moneda: conchas, sal, cobre, plata, oro y billetes; con nombre en la lengua del pueblo
// ================= Monedas =================
// · Cada pueblo hace su dinero con lo que tiene a mano: conchas en la costa, barras de sal en tierras secas y, si no,
//   monedas de cobre. Con herrería y hierro funden plata; con oro de sobra acuñan oro; con papel, banco e imprenta
//   imprimen billetes. Cuando pueden, cambian a uno mejor (se avisa)
// · El tipo pesa en la inflación: el oro y la plata aguantan el valor; las conchas y la sal algo menos; los billetes
//   se imprimen fácil y los precios se disparan antes
// · El nombre de la moneda sale de la lengua del pueblo (como las personas y los pueblos)
const COIN_TYPES = {
  conchas: { txt:'conchas', long:'conchas de mar', infl:1.15, rank:0 },
  sal:     { txt:'sal', long:'barras de sal', infl:1.1, rank:0 },
  cobre:   { txt:'cobre', long:'monedas de cobre', infl:1, rank:1 },
  plata:   { txt:'plata', long:'monedas de plata', infl:.8, rank:2 },
  oro:     { txt:'oro', long:'monedas de oro', infl:.6, rank:3 },
  billetes:{ txt:'billetes', long:'billetes de papel', infl:1.5, rank:4 },
};
const coinType = g => COIN_TYPES[g.coinType] ? g.coinType : 'cobre';
const coinInfl = g => COIN_TYPES[coinType(g)].infl * (knowsSci(g, 'economia') ? .85 : 1); // ciencia económica (ciencia.js)
const coinTypeTxt = g => COIN_TYPES[coinType(g)].long;
// Con qué empiezan: lo que hay a su alrededor
function firstCoinType(g){
  let sea = 0, dry = 0;
  for (let k = 0; k < 60; k++) { const x = clamp(g.fx + Math.round((Math.random() - .5) * 30), 0, W - 1), y = clamp(g.fy + Math.round((Math.random() - .5) * 30), 0, H - 1), b = world.biome[y * W + x]; if (WATER[b] && !FRESH(b)) sea++; if (b === B.DESERT || b === B.DRY || b === B.SAND) dry++; }
  if ((g.gold || 0) >= 8 && hasForge(g)) return 'oro';
  if (hasForge(g) && (g.iron || 0) >= 6) return 'cobre';
  return sea > 8 ? 'conchas' : dry > 15 ? 'sal' : 'cobre';
}
// El nombre, en su lengua: una raíz corta y la terminación de dinero de esa lengua
function coinNameFor(g){
  const taken = new Set(villages.map(o => o.coin).filter(Boolean));
  const L = typeof villageLang === 'function' && world.langs ? langList()[villageLang(g)] : null;
  if (L && !L.common) {
    const P = L.phon, r = Math.random;
    if (!P.coinEnd) { const rp = mulberry32(L.id * 977 + 5); P.coinEnd = ['l', 'r', 'n', 's', 'x', 'k'][Math.floor(rp() * 6)]; }
    for (let k = 0; k < 30; k++) { const n = (langWord(P, r() < .6 ? 1 : 2, r).replace(/[^aeiou]+$/, '') + P.coinEnd).toLowerCase(); if (readable(n) && !taken.has(n)) return n; }
  }
  return coinName();
}
// Un pueblo estrena moneda (la primera vez, o al cambiar la que tenía): nombre y tipo
function newCoin(g){ g.coin = coinNameFor(g); g.coinType = firstCoinType(g); return g.coin; }
// Mejoras con el tiempo: plata con la herrería, oro con oro, billetes con papel, banco e imprenta
function coinTick(g){
  if (!g.coin) return; // (se llama desde econTick, cada 20 s)
  const t = coinType(g), at = { x:g.fx * T, y:g.fy * T }; let nt = null;
  if (hasPaper(g) && hasBank(g) && typeof hasPress === 'function' && hasPress(g) && t !== 'billetes' && Math.random() < .15) nt = 'billetes';
  else if (t !== 'billetes' && COIN_TYPES[t].rank < 3 && (g.gold || 0) >= 8 && hasForge(g)) nt = 'oro';
  else if (COIN_TYPES[t].rank < 2 && hasForge(g) && (g.iron || 0) >= 10) nt = 'plata';
  else if (COIN_TYPES[t].rank < 1 && (hasForge(g) || (g.iron || 0) >= 4)) nt = 'cobre';
  if (!nt || nt === t) return;
  const al = allianceOf(g), same = al && al.coin === g.coin ? villages.filter(o => o.coin === g.coin) : [g];
  for (const o of same) o.coinType = nt;
  if (nt === 'oro') g.gold -= 3; else if (nt === 'plata') g.iron -= 3;
  notify(nt === 'billetes' ? `En ${g.name} empiezan a imprimir billetes de ${g.coin}: más cómodos, pero cuidado con la inflación` : `En ${g.name} ya pagan con ${COIN_TYPES[nt].long}: el ${g.coin} vale más y aguanta mejor los precios`, at);
}
