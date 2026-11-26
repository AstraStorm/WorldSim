// World Sim · Clases sociales: cada país tiene las suyas según su régimen y su época
// ================= Clases sociales =================
// · Una monarquía tiene nobleza, clero, burguesía y campesinado; una teocracia, clero, fieles y apóstatas; un estado
//   comunista, la nomenklatura del partido y los trabajadores; una democracia industrial, burguesía, clase media y
//   proletariado… y donde hay esclavitud, esclavos
// · Cada persona cae en una según su dinero, su oficio, su fe, si manda o si lleva armas. Se ve en su ficha y, en la del
//   pueblo, la pirámide con cuántos hay de cada una y lo desigual que es el reparto del dinero
// · Cuanto más desigual, más descontento entre los de abajo
const CLASS_COL = { alta:'#e0b850', media:'#7ab0d8', baja:'#a8a090', paria:'#d07060', esclavo:'#8a6a6a' };
// Clases de cada régimen, de arriba abajo: [clave, nombre, nivel]
function classSet(g){
  const r = regimeOf(g), ind = typeof industrial === 'function' && industrial(g), coin = !!g.coin;
  const S = { tribu:[['jefes', 'Jefes y ancianos', 'alta'], ['guerreros', 'Guerreros', 'media'], ['pueblo', 'Gente de la tribu', 'baja']],
    monarquia:[['nobleza', 'Nobleza', 'alta'], ['clero', 'Clero', 'alta'], ...(coin ? [['burguesia', 'Burguesía', 'media']] : []), ['campesinado', 'Campesinado', 'baja']],
    teocracia:[['clero', 'Clero', 'alta'], ['fieles', 'Fieles', 'media'], ['pobres', 'Pobres de solemnidad', 'baja'], ['apostatas', 'Apóstatas e infieles', 'paria']],
    oligarquia:[['oligarcas', 'Oligarcas', 'alta'], ['clientes', 'Clientes de los oligarcas', 'media'], ['pobres', 'Los pobres', 'baja']],
    comunismo:[['nomenklatura', 'Nomenklatura del partido', 'alta'], ['trabajadores', 'Trabajadores', 'media'], ['disidentes', 'Disidentes', 'paria']],
    socialismo:[['cuadros', 'Cuadros del partido', 'alta'], ['trabajadores', 'Trabajadores', 'media']],
    fascismo:[['elite', 'Élite del régimen', 'alta'], ['militares', 'Militares', 'media'], ['pueblo', 'Pueblo', 'baja'], ['parias', 'Parias perseguidos', 'paria']],
    dictadura:[['elite', 'Camarilla del dictador', 'alta'], ['militares', 'Militares', 'media'], ['pueblo', 'Pueblo', 'baja']],
    tecnocracia:[['expertos', 'Expertos y sabios', 'alta'], ['tecnicos', 'Técnicos', 'media'], ['obreros', 'Obreros', 'baja']],
    anarquia:[['comuna', 'Comuneros', 'media']] };
  let set = S[r];
  if (!set) set = ind ? [['burguesia', 'Burguesía', 'alta'], ['media', 'Clase media', 'media'], ['proletariado', 'Proletariado', 'baja'], ['pobres', 'Pobres', 'baja']]
    : r === 'monarquia_parlamentaria' ? [['nobleza', 'Nobleza', 'alta'], ['alta', 'Clase alta', 'alta'], ['media', 'Clase media', 'media'], ['trabajadora', 'Clase trabajadora', 'baja']]
    : coin ? [['alta', 'Clase alta', 'alta'], ['media', 'Clase media', 'media'], ['trabajadora', 'Clase trabajadora', 'baja'], ['pobres', 'Pobres', 'baja']]
    : [['notables', 'Notables', 'alta'], ['vecinos', 'Vecinos', 'media']];
  if (typeof slaving === 'function' && slaving(g)) set = [...set, ['esclavos', 'Esclavos', 'esclavo']];
  return set;
}
// La clase de una persona (se recalcula a cada rato para todo el pueblo, por percentil de dinero)
function classOf(v, g){
  if (!g) return null;
  const C = classesOf(g); return C.map.get(v) || null;
}
const classCache = new WeakMap();
function classesOf(g){
  let C = classCache.get(g); if (C && performance.now() - C.t < 4000) return C;
  const set = classSet(g), map = new Map(), n = nationOf(g), ppl = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H);
  const has = k => set.find(c => c[0] === k), by = k => has(k) || set[set.length - 1];
  const rich = ppl.slice().sort((a, b) => (b.money || 0) - (a.money || 0)), rank = new Map(rich.map((u, i) => [u, i / Math.max(1, rich.length - 1)]));
  const gi = typeof govIdeo === 'function' ? govIdeo(g) : 0;
  for (const u of ppl) {
    const p = rank.get(u), top = u === g.leader || u === n.leader || (g.leader && familyOf(u, g.leader)), noCoin = !g.coin;
    let c;
    if (u.slave) c = has('esclavos');
    else if (has('apostatas') && typeof otherFaith === 'function' && otherFaith(u, g)) c = has('apostatas');
    else if (has('parias') && ((typeof persecutesFaith === 'function' && persecutesFaith(g) && otherFaith(u, g)) || Math.abs((u.ideo || 0) - gi) > 1.1)) c = has('parias');
    else if (has('disidentes') && Math.abs((u.ideo || 0) - gi) > 1) c = has('disidentes');
    else if (top) c = set[0];
    else if (has('clero') && (u.oficio === 'sabio' || u.priest) && p < .7) c = has('clero');
    else if (has('militares') && u.weapon && p > .1) c = has('militares');
    else if (has('guerreros') && u.weapon) c = has('guerreros');
    else if (has('expertos') && u.oficio === 'sabio') c = has('expertos');
    else if (has('nomenklatura') || has('cuadros')) c = p < .08 ? set[0] : by('trabajadores');
    else if (noCoin) c = p < .12 ? set[0] : set.filter(x => x[2] !== 'paria' && x[2] !== 'esclavo').slice(-1)[0];
    else { // por dinero: los de arriba, los del medio y los de abajo (los pobres de verdad, si no tienen casa ni dinero)
      const lv = set.filter(x => x[2] !== 'paria' && x[2] !== 'esclavo' && !['clero', 'militares', 'guerreros'].includes(x[0]));
      const poor = lv.find(x => x[0] === 'pobres'), byLv = l => lv.filter(x => x[2] === l);
      if (poor && (u.money || 0) < 2 && u.home == null) c = poor;
      else if (p < .1) c = byLv('alta')[0] || lv[0];
      else if (p < .45) c = byLv('media')[0] || lv[Math.min(1, lv.length - 1)];
      else c = byLv('baja').find(x => x[0] !== 'pobres') || lv[lv.length - 1];
    }
    map.set(u, c || set[set.length - 1]);
  }
  // Desigualdad (índice de Gini del dinero, de 0 a 1)
  const ms = ppl.map(u => Math.max(0, u.money || 0)).sort((a, b) => a - b), tot = ms.reduce((a, b) => a + b, 0);
  let gini = 0; if (tot > 0 && ms.length > 1) { let cum = 0; for (let i = 0; i < ms.length; i++) cum += (i + 1) * ms[i]; gini = (2 * cum) / (ms.length * tot) - (ms.length + 1) / ms.length; }
  C = { t:performance.now(), set, map, gini:clamp(gini, 0, 1) }; classCache.set(g, C); return C;
}
// Ánimo: los de abajo, en un país muy desigual, se quejan; los de arriba viven bien
{ const base = socialMood; socialMood = function(v, g, add){
  base(v, g, add); if (!g || ageOf(v) < ADULT_H) return;
  const c = classOf(v, g); if (!c) return; const gini = classesOf(g).gini;
  if (c[2] === 'alta') add(4, 'es de la clase alta (' + c[1].toLowerCase() + ')');
  else if (c[2] === 'paria') add(-10, 'es de los ' + c[1].toLowerCase());
  else if (c[2] === 'baja' && gini > .5) add(-5, 'vive en un país muy desigual');
}; }
function classKv(v, g){
  const c = classOf(v, g); if (!c) return '';
  return `<div class="kv"><span>Clase</span><b><i class="cls-dot" style="background:${CLASS_COL[c[2]]}"></i>${esc(c[1])}</b></div>`;
}
// La pirámide social en la ficha del pueblo
function classCard(g){
  const C = classesOf(g), cnt = new Map(); for (const c of C.map.values()) cnt.set(c[0], (cnt.get(c[0]) || 0) + 1);
  const tot = C.map.size || 1, rows = C.set.filter(c => cnt.get(c[0]));
  if (!rows.length) return '';
  const word = C.gini > .6 ? 'muy desigual' : C.gini > .45 ? 'desigual' : C.gini > .3 ? 'algo desigual' : 'bastante igualitario';
  return `<h4>Clases sociales</h4><div class="cls-pyr">${rows.map(c => { const n = cnt.get(c[0]), f = n / tot; return `<div class="cls-row"><span>${esc(c[1])}</span><span class="cls-bar"><i style="width:${Math.max(3, Math.round(f * 100))}%;background:${CLASS_COL[c[2]]}"></i></span><b>${n}</b></div>`; }).join('')}</div>
    <div class="muted" style="font-size:12px;margin-top:4px">Reparto del dinero: ${word} (desigualdad ${Math.round(C.gini * 100)} de 100)</div>`;
}
