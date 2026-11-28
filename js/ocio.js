// World Sim · El ocio de las ciudades: hace falta algo que hacer
// ================= Ocio =================
// · Antes cualquier paseo contaba como «haber tenido tiempo libre», así que nadie se aburría (solo los muy sociables,
//   y casi nunca). Ahora, en una aldea, pasear con los vecinos basta; pero en una ciudad (35 o más, con ayuntamiento) hace falta algo
//   de verdad: la taberna, el teatro (o el cine, con corriente), el coliseo, el casino, el campo de fútbol, la piscina,
//   la pista, una feria, una fiesta, la estación de esquí...
// · Cada sitio da unas plazas de ocio; si hay muchos más adultos que plazas, la gente se aburre: baja el ánimo (más a
//   los sociables), la ciudad atrae menos gente y el pueblo se pone a construir sitios de ocio antes que otras cosas
// · En la ficha del pueblo: cuántas plazas hay para cuántos adultos y cuántos se aburren
const OCIO_PLAZAS = [
  ['taberna', g => hasTavern(g) && !hasLaw(g, 'ley_seca') ? 15 : 0],
  ['teatro', g => hasTheater(g) ? (typeof cineOn === 'function' && cineOn(g) ? 40 : 25) : 0],
  ['coliseo', g => hasColiseum(g) ? 45 : 0],
  ['casino', g => g.casino ? 20 : 0],
  ['deporte', g => (g.pitch ? 20 : 0) + (g.pool ? 15 : 0) + (g.track ? 15 : 0)],
  ['esquí', g => typeof skiPlazas === 'function' ? skiPlazas(g) : 0],
];
const OCIO_BUILD = new Set(['taberna', 'teatro', 'coliseo', 'casino', 'instalacion', 'esqui']);
function ocioOf(g){
  const c = g._ocio; if (c && yearT - c.t < 10 && yearT >= c.t) return c;
  const adults = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H).length;
  let plazas = 0; const de = []; for (const [k, f] of OCIO_PLAZAS) { const n = f(g); if (n > 0) { plazas += n; de.push(k); } }
  if (holidayToday(g)) { plazas += 20; de.push('fiesta'); }
  const O = g._ocio = { t:yearT, adults, plazas, de, ratio:adults ? Math.min(1.5, plazas / Math.max(1, adults * .6)) : 1.5, bored:0 };
  O.bored = villagers.filter(v => !v.dead && v.vid === g.id && ageOf(v) >= ADULT_H && (yearT - (v.fun || v.born || 0)) / DAY_LEN > funDays(v, g)).length; // (los mismos que lo notan en el ánimo)
  return O;
}
const ocioCity = g => !!g && popOf(g) >= 35 && g.hall != null; // (una aldea o una tribu no: con pasear basta)
// Cuántos días aguanta alguien sin distraerse (menos los sociables; menos en las ciudades sin nada que hacer)
const funDays = (v, g) => 3 + (1 - trait(v, 'sociable')) * 3 - (ocioCity(g) && ocioOf(g).ratio < .8 ? 1 : 0);
// Pasear: en una aldea cuenta como distraerse; en una ciudad, solo un poco
function ocioWalk(v, g){ v.funLo = yearT; if (!ocioCity(g) || Math.random() < .15) v.fun = yearT; }
// Ánimo: el aburrimiento (desde moodOf)
function ocioMood(v, g, add){
  if (ageOf(v) < ADULT_H) return;
  if (v.fun && yearT - v.fun < DAY_LEN) { add(6 * (.5 + trait(v, 'sociable')), 'ha tenido tiempo libre'); return; }
  const days = (yearT - (v.fun || v.born || 0)) / DAY_LEN, lim = funDays(v, g);
  if (days <= lim) return;
  const k = Math.min(1.6, (days - lim) / 3 + .5) * (v.funLo && yearT - v.funLo < DAY_LEN ? .6 : 1); // (al menos ha salido a pasear)
  add(-(2 + trait(v, 'sociable') * 5) * k, ocioCity(g) && ocioOf(g).ratio < .8 ? 'se aburre: en su ciudad no hay nada que hacer' : 'se aburre: hace días que no se distrae');
}
// Una ciudad sin ocio construye antes los sitios de ocio (desde chooseJob)
function ocioBoost(v, g, J){
  if (!ocioCity(g)) return; const r = ocioOf(g).ratio; if (r >= .8) return;
  const m = 1 + (.8 - r) * 3; for (const j of J) if (OCIO_BUILD.has(j[0])) j[1] *= m;
}
// Atrae menos gente (migracion.js)
{ const base = migAppeal; migAppeal = function(g){ const a = base.apply(this, arguments); if (!ocioCity(g)) return a; const r = ocioOf(g).ratio; return r < .8 ? Math.max(0, a - (.8 - r) * .3) : a; }; }
// En la ficha
{ const base = colonyCard; colonyCard = function(g){
  const out = base.apply(this, arguments); if (!popOf(g)) return out; const O = ocioOf(g);
  const pct = O.adults ? Math.round(O.bored / O.adults * 100) : 0;
  return out + `<h4>Ocio</h4><div>${O.plazas ? `${O.plazas} plazas (${O.de.join(', ')})` : 'Ningún sitio de ocio'} para ${O.adults} adultos · ${pct} % se aburren${ocioCity(g) && O.ratio < .8 ? ' · <b>falta ocio</b>' : ''}</div>`;
}; }
