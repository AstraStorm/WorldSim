// World Sim · Comida que se estropea, conservas, leña para el invierno y más árboles
// ================= Estaciones =================
// · La comida se estropea: más deprisa con calor, casi nada con frío. El granero la guarda mejor; en el ahumadero se
//   hacen conservas (ahumadas con leña o en salazón con sal) que no se estropean y se sacan cuando falta comida
// · Leña: cuando hace frío las casas y la hoguera queman madera. Sin leña no calientan (y el frío mata); la leñera la
//   guarda seca y se gasta menos. En otoño y en invierno se tala más y en los pueblos fríos se planta más
// · Árboles: se planta mucho más (sobre todo donde se ha talado) y los bosques se extienden algo más deprisa
INSTS.granero = { key:'granary:granero', field:'granary', wood:12, stone:6, t:12, name:'un granero', why:'la comida se estropeará mucho menos',
  want:g => popOf(g) >= 10 && [...farmMap.values()].some(f => f.vid === g.id), w:g => 4 };
INSTS.ahumadero = { key:'smoke:ahumadero', field:'smokehouse', wood:8, stone:4, t:10, name:'un ahumadero', why:'harán conservas que aguantan todo el invierno',
  want:g => popOf(g) >= 10 && g.food > popOf(g) * 3, w:g => 3 };
INSTS.lenera = { key:'woodshed:lenera', field:'woodshed', wood:8, stone:2, t:8, name:'una leñera', why:'la leña se guardará seca y durará más',
  want:g => popOf(g) >= 8 && (g.coldSeen ?? -1e9) > yearT - YEAR, w:g => 4 };
const villageTemp = g => tempAt(g.fy * W + g.fx);
function seasonsTick(g, dt, people){
  if ((g.seasT = (g.seasT || 0) - dt) > 0) return; g.seasT = 5; const el = 5, at = { x:g.fx * T, y:g.fy * T }, pop = people.length; if (!pop) return;
  const t = villageTemp(g);
  // La comida se estropea (con calor, más)
  const rate = (t > 22 ? .0035 : t > 12 ? .0018 : t > 2 ? .0008 : .0002) * (hasInst(g, 'granero') ? .4 : 1);
  const lost = g.food * rate * el; g.food -= lost; g.meat = Math.min(g.meat || 0, g.food);
  g.spoiled = (g.spoiled || 0) + lost;
  if (g.spoiled > pop * 3 && yearT - (g.spoilMsg ?? -1e9) > DAY_LEN * 2) { g.spoilMsg = yearT; notify(`En ${g.name} se ha podrido ${Math.round(g.spoiled)} de comida${t > 22 ? ' con el calor' : ''}${hasInst(g, 'granero') ? '' : ': les haría falta un granero'}`, at); g.spoiled = 0; }
  // Conservas: si falta comida, se sacan
  if ((g.preserved || 0) > 0 && g.food < pop * 1.5) { const n = Math.min(g.preserved, pop * 2); g.preserved -= n; g.food += n; }
  // Leña: cuando hace frío, casas y hoguera la gastan
  if (t < 10) {
    g.coldSeen = yearT;
    const need = (housesOf(g).length + 1) * (10 - t) / 10 * .012 * el * (hasInst(g, 'lenera') ? .7 : 1);
    if (g.wood >= need) { g.wood -= need; if (g.noFirewood) { g.noFirewood = false; notify(`En ${g.name} vuelven a tener leña: las casas calientan otra vez`, at); } }
    else if (!g.noFirewood) { g.noFirewood = true; g.wood = 0; notify(`¡En ${g.name} se han quedado sin leña en pleno frío! Las casas ya no calientan`, at); }
  } else if (g.noFirewood) g.noFirewood = false;
}
// Trabajos: hacer conservas en el ahumadero; leña y árboles según la estación
function seasonJobs(v, g, add){
  const pop = popOf(g), cold = (g.coldSeen ?? -1e9) > yearT - YEAR, si = seasonInfo().i; // 0 primavera, 1 verano, 2 otoño, 3 invierno
  if (hasInst(g, 'ahumadero') && g.food > pop * 2.5 && (g.wood >= 2 || (goodsOf(g).sal || 0) >= 2)) add('conservar', busyWith(g, 'conservar') < 2 ? 3 : 0);
  if (cold && (si >= 2 || g.noFirewood) && g.wood < 25 + housesOf(g).length * 3) add('talar', g.noFirewood ? 10 : 4); // leña para el invierno
  if ((g.treesNear ?? 99) < 30) add('plantar', busyWith(g, 'plantar') < 3 ? (g.treesNear ?? 99) < 18 ? 5 : 3 : 0);   // plantar más
}
function seasonTarget(v, g, job){ const sb = hasInst(g, 'ahumadero') && standBy(g.smokehouse); return sb ? { k:job, x:sb[0], y:sb[1] } : null; }
function seasonArrive(v, g, t){
  v.actT = 6; v.onDone = () => {
    const n = Math.min(10, g.food - popOf(g) * 2); if (n <= 0) return; const G = goodsOf(g), salt = (G.sal || 0) >= 2;
    if (salt) G.sal -= 2; else if (g.wood >= 2) g.wood -= 2; else return;
    g.food -= n; g.preserved = (g.preserved || 0) + n * .9;
    floats.push({ x:v.x, y:v.y - 12, txt:salt ? `+${Math.round(n * .9)} salazón` : `+${Math.round(n * .9)} ahumado`, col:'#d8a070', life:0 });
    if (!g.preserveMsg) { g.preserveMsg = true; notify(`En ${g.name} empiezan a hacer conservas (${salt ? 'en salazón' : 'ahumadas'}): ya no se les pudrirá toda la comida`, { x:v.x, y:v.y }); }
  };
  return true;
}
function seasonsCard(g){
  const t = Math.round(villageTemp(g));
  return `<h4>Clima y comida</h4><div class="muted" style="font-size:12px;margin:4px 0">${t}°C en el pueblo · la comida se estropea ${t > 22 ? 'deprisa' : t > 12 ? 'algo' : 'poco'}${hasInst(g, 'granero') ? ' (con granero, mucho menos)' : ''}${g.preserved ? ` · conservas: ${Math.round(g.preserved)}` : ''}${t < 10 ? ` · queman leña para calentarse${g.noFirewood ? ' · <b style="color:#e8a838">¡sin leña!</b>' : ''}` : ''}</div>`;
}
