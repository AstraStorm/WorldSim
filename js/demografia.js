// World Sim · Demografía: la transición demográfica, el envejecimiento y el éxodo rural
// ================= Demografía =================
// · Natalidad (fertMul, desde los nacimientos de sociedad.js): con estudios, ciudad, industria, luz y anticonceptivos
//   cada pareja tiene menos hijos; la ley de natalidad y la vivienda barata la suben. Nunca baja de un 40 %.
// · Esperanza de vida: la medicina, las vacunas, el hospital y la sanidad pública alargan la vida de quien vive allí
//   (v.lifeLv: cada mejora se aplica una sola vez a cada persona). Más mayores = más pensiones que pagar.
// · Éxodo rural: con la industria, los jóvenes de las aldeas pequeñas se van a la gran ciudad de su nación si allí hay
//   sitio y trabajo. Las aldeas se vacían poco a poco (como pasó de verdad) y las ciudades crecen.
// · Ficha (pestaña Gente → Población): pirámide de edades, hijos por mujer, nacimientos, esperanza de vida, mayores
//   y dependencia. En el modo nación, un resumen en el panel.
// · Nombres: si algún pueblo se queda sin nombre (salía «undefined» en la lista de naciones), se le pone uno.
(() => {
  const add = (after, d) => { if (DISCOVERIES.some(x => x.k === d.k)) return; const i = DISCOVERIES.findIndex(x => x.k === after); DISCOVERIES.splice(i < 0 ? DISCOVERIES.length : i + 1, 0, { ...d, req:d.req.filter(k => DISCOVERIES.some(x => x.k === k)) }); if (typeof SCI_REQ === 'object') SCI_REQ[d.k] = d.req; };
  add('vacunas', { k:'anticonceptivos', txt:'los anticonceptivos', cost:110, eff:'las familias deciden cuántos hijos tener: menos nacimientos, más mujeres estudian y trabajan', req:['medicina', 'vacunas'] });
})();
Object.assign(LAW_TXT, { planificacion:'planificación familiar', hijo_unico:'política del hijo único' });
Object.assign(LAW_DESC, { planificacion:'anticonceptivos gratis y educación sexual: menos embarazos no buscados, las mujeres estudian más',
  hijo_unico:'cada pareja solo puede tener un hijo: la población deja de crecer… y envejece deprisa' });
Object.assign(LAW_LEAN, { planificacion:-.35, hijo_unico:.3 });
Object.assign(LAW_REQ, { planificacion:g => knowsSci(g, 'anticonceptivos'), hijo_unico:g => natAny(g, o => popOf(o) >= 80) });
Object.assign(LAW_WHY, { planificacion:'ahora que hay anticonceptivos', hijo_unico:'con tanta gente' });
LAW_CLASH.push(['natalidad', 'hijo_unico'], ['natalidad', 'planificacion']);
if (typeof REGIME_LAWS === 'object' && REGIME_LAWS.comunismo) REGIME_LAWS.comunismo.push('hijo_unico');
{ const c = typeof LAW_CATS !== 'undefined' && LAW_CATS.find(c => c[0] === 'salud'); if (c) c[3].push('planificacion', 'hijo_unico'); }

// ---- Natalidad ----
const FERT_MIN = .4;
function fertMul(g){
  const c = g._fm; if (c && yearT - c.t < 10 && yearT >= c.t) return c.v;
  const ps = villagers.filter(v => !v.dead && v.vid === g.id), women = ps.filter(v => v.sex === 'm' && ageOf(v) >= ADULT_H);
  const edu = women.length ? women.reduce((a, v) => a + (v.edu || 0), 0) / women.length : 0, pop = ps.length;
  let f = 1 - edu * .35;                                                       // las que estudian tienen menos hijos y más tarde
  if (pop >= 60) f *= pop >= 150 ? .8 : .9;                                    // en la ciudad un hijo cuesta más (y ayuda menos en el campo)
  if (knowsSci(g, 'vapor')) f *= .9;
  if (knowsSci(g, 'electricidad')) f *= .92;
  if (knowsSci(g, 'anticonceptivos')) f *= .82;
  if (hasLaw(g, 'planificacion')) f *= .85;
  if (hasLaw(g, 'pensiones')) f *= .93;                                        // ya no hacen falta hijos para la vejez
  if (hasLaw(g, 'vivienda_publica')) f *= 1.1;
  if (hasLaw(g, 'hijo_unico')) f *= .5;
  if (['tribu'].includes(regimeOf(g))) f = Math.max(f, .95);
  const v = clamp(f, FERT_MIN, 1.2); g._fm = { t:yearT, v }; return v;
}
// Hijo único: una madre que ya tiene uno vivo no tiene más (se marca en su lastBirth, que es lo que mira sociedad.js)
const oneChildBlock = (g, people) => { if (!hasLaw(g, 'hijo_unico')) return; for (const v of people) if (v.sex === 'm' && (v.kids || []).some(k => !k.dead)) v.lastBirth = yearT; };

// ---- Esperanza de vida ----
const LIFE_STEPS = [[g => knowsSci(g, 'medicina'), .08], [g => knowsSci(g, 'vacunas'), .08], [g => hasHosp(g), .06], [g => hasLaw(g, 'sanidad'), .06], [g => knowsSci(g, 'electricidad'), .04]];
function lifeTick(g, people){
  const got = LIFE_STEPS.filter(([f]) => f(g)).length; if (!got) return;
  for (const v of people) { const lv = v.lifeLv || 0; if (lv >= got) continue; v.life = (v.life || 18) * (1 + LIFE_STEPS.slice(lv, got).reduce((a, s) => a + s[1], 0)); v.lifeLv = got; }
}
const lifeExp = people => { const L = people.filter(v => v.life); return L.length ? L.reduce((a, v) => a + v.life, 0) / L.length : 0; };

// ---- Registro: nacimientos y emigración (para la ficha) ----
const demoDay = () => Math.floor(yearT / DAY_LEN) + 1;
function demoCount(g, people){
  const D = g.demo ||= { births:[], outR:0, inR:0 };
  for (const v of people) if (!v.bcount) { v.bcount = 1; if (ageOf(v) < .3 && v.parents) D.births.push(demoDay()); }
  const d0 = demoDay() - 8; while (D.births.length && D.births[0] < d0) D.births.shift();
}

// ---- Éxodo rural ----
function bigCityOf(n){
  return natTowns(n).filter(o => popOf(o) >= 50 && (knowsSci(o, 'vapor') || facsOf(o).length || (o.comps || []).length)).sort((a, b) => popOf(b) - popOf(a))[0] || null;
}
function ruralExodus(g, people){
  const pop = people.length; if (pop < 5 || pop >= 30) return;
  const n = nationOf(g), city = bigCityOf(n); if (!city || city === g || !knowsSci(city, 'vapor')) return;
  if (Math.hypot(city.fx - g.fx, city.fy - g.fy) > 140) return;
  const room = houseCap(city) + 4 - popOf(city); if (room < 2) return;
  if ((g.exodusT || 0) > yearT) return; g.exodusT = yearT + DAY_LEN * (.8 + Math.random() * .8);
  // Se van los jóvenes (con su pareja si la tienen), nunca el jefe; siempre quedan al menos cuatro
  const young = people.filter(v => v !== g.leader && !v.away && !v.boat && ageOf(v) >= ADULT_H && ageOf(v) < ADULT_H + 4 && !(v.task && ['asalto', 'viaje', 'golpe', 'detenido'].includes(v.task.k)));
  const v = young[Math.floor(Math.random() * young.length)]; if (!v) return;
  const goers = [v]; const p = partnerOf(v); if (p && p.vid === g.id && !p.away && young.includes(p)) goers.push(p);
  if (pop - goers.length < 4) return;
  for (const u of goers) { u.exodus = true; exile(u, g, city); }
  const D = g.demo ||= { births:[], outR:0, inR:0 }; D.outR += goers.length; (city.demo ||= { births:[], outR:0, inR:0 }).inR += goers.length;
  const k = n.exodusN = (n.exodusN || 0) + goers.length;
  if (!n.exodusMsg || k >= n.exodusMsg * 3) { n.exodusMsg = Math.max(1, k); notify(`Éxodo rural en ${n.name}: ${goers.map(u => u.name).join(' y ')} ${goers.length > 1 ? 'dejan' : 'deja'} ${g.name} para buscar trabajo en ${city.name} (ya se han ido ${k} jóvenes del campo a la ciudad)`, { x:g.fx * T, y:g.fy * T }); }
}

let demoClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (demoClock -= dt) > 0) return; demoClock = 5;
  for (const g of villages) if (!g.name || g.name === 'undefined') g.name = (typeof placeName === 'function' && placeName(g)) || villageName();
  const byV = new Map(); for (const v of villagers) if (!v.dead) { let L = byV.get(v.vid); if (!L) byV.set(v.vid, L = []); L.push(v); }
  for (const g of villages) {
    const people = byV.get(g.id); if (!people || !people.length) continue;
    lifeTick(g, people); demoCount(g, people); oneChildBlock(g, people); ruralExodus(g, people);
  }
} catch (e) { console.error(e); } });

// ---- Ficha: pestaña Gente → Población ----
function demoStats(people){
  const ads = people.filter(v => ageOf(v) >= ADULT_H), old = people.filter(v => ageOf(v) > (v.life || 20) * .72), kids = people.filter(v => ageOf(v) < ADULT_H);
  const work = ads.length - old.length, moms = people.filter(v => v.sex === 'm' && ageOf(v) > 10);
  const tfr = moms.length ? moms.reduce((a, v) => a + (v.kids || []).length, 0) / moms.length : null;
  return { kids:kids.length, old:old.length, work, dep:work > 0 ? (kids.length + old.length) / work : 0, tfr, life:lifeExp(people), mean:people.length ? people.reduce((a, v) => a + ageOf(v), 0) / people.length : 0 };
}
function pyramid(people, w = 260){
  const B = 2, bins = 12, men = Array(bins).fill(0), wom = Array(bins).fill(0);
  for (const v of people) { const k = Math.min(bins - 1, Math.floor(ageOf(v) / B)); (v.sex === 'm' ? wom : men)[k]++; }
  const mx = Math.max(1, ...men, ...wom), half = Math.floor((w - 50) / 2);
  const row = k => `<div class="dp-r"><span class="dp-m"><i style="width:${Math.round(men[k] / mx * half)}px"></i></span><span class="dp-a">${k === bins - 1 ? `${k * B}+` : `${k * B}-${k * B + B - 1}`}</span><span class="dp-f"><i style="width:${Math.round(wom[k] / mx * half)}px"></i></span></div>`;
  return `<div class="dp" style="width:${w}px"><div class="dp-h"><span>hombres</span><span>años</span><span>mujeres</span></div>${Array.from({ length:bins }, (_, k) => row(bins - 1 - k)).join('')}</div>`;
}
function demoCard(g, people){
  if (!people.length) return '';
  const s = demoStats(people), D = g.demo || { births:[], outR:0, inR:0 }, f = fertMul(g);
  const fTxt = f >= .95 ? 'alta' : f >= .75 ? 'media' : f >= .55 ? 'baja' : 'muy baja';
  return `<h4>Población</h4>${pyramid(people)}
    <div class="dp-k"><span>Hijos por mujer</span><b>${s.tfr == null ? '—' : s.tfr.toFixed(1).replace('.', ',')}</b><span>Natalidad</span><b>${fTxt}</b>
      <span>Nacimientos (8 días)</span><b>${D.births.length}</b><span>Esperanza de vida</span><b>${Math.round(s.life)} años</b>
      <span>Edad media</span><b>${Math.round(s.mean)} años</b><span>Mayores</span><b>${s.old} (${Math.round(s.old / people.length * 100)} %)</b>
      <span>Dependencia</span><b title="niños y mayores por cada adulto en edad de trabajar">${s.dep.toFixed(2).replace('.', ',')}</b>${D.outR || D.inR ? `<span>Éxodo rural</span><b>${D.outR ? `se han ido ${D.outR}` : ''}${D.outR && D.inR ? ' · ' : ''}${D.inR ? `han llegado ${D.inR}` : ''}</b>` : ''}</div>
    ${s.dep > 1.1 ? '<div class="muted">Muchos niños y mayores para los que trabajan: las pensiones y la escuela pesan en el tesoro.</div>' : ''}`;
}
function natDemo(n){
  const people = villagers.filter(v => !v.dead && nationOf(villageById(v.vid) || {}) === n); if (!people.length) return '';
  const s = demoStats(people), ts = natTowns(n), f = ts.length ? ts.reduce((a, g) => a + fertMul(g) * popOf(g), 0) / Math.max(1, ts.reduce((a, g) => a + popOf(g), 0)) : 1;
  return `<h4>Población</h4><div class="gv-row demo-row">${pyramid(people, 220)}<div class="dp-k"><span>Hijos por mujer</span><b>${s.tfr == null ? '—' : s.tfr.toFixed(1).replace('.', ',')}</b><span>Natalidad</span><b>${Math.round(f * 100)} %</b><span>Esperanza de vida</span><b>${Math.round(s.life)} años</b><span>Mayores</span><b>${Math.round(s.old / people.length * 100)} %</b><span>Éxodo rural</span><b>${n.exodusN || 0}</b></div></div>`;
}
{ const base = govSummary; govSummary = function(n){ const h = base.apply(this, arguments); return h.replace('<h4>Ciencia</h4>', natDemo(n) + '<h4>Ciencia</h4>'); }; }
