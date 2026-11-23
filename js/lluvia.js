// Forja de Mundos · La lluvia: la gente busca dónde resguardarse (y quien sigue fuera, se tapa)
// ================= Lluvia =================
// · Cuando llueve (o nieva) donde está alguien que va a elegir qué hacer, lo normal es que se resguarde: en su casa, si
//   no en la taberna, el ayuntamiento, el mercado, el almacén o el templo, y si no hay nada cerca, bajo un árbol. Se queda
//   un rato y vuelve a mirar: si sigue lloviendo, sigue a cubierto. Uno de cada cuatro sigue a lo suyo
// · Paraguas: donde llueve a menudo, alguien cose paraguas con tela (y teje antes, si no hay) y los reparte; quien tiene
//   paraguas no se resguarda: sigue trabajando bajo la lluvia, con su paraguas del color de su pueblo
// · Quien anda bajo la lluvia sin paraguas se tapa con una hoja grande
const rainOn = v => raining(clamp(Math.floor(v.y / T), 0, H - 1) * W + clamp(Math.floor(v.x / T), 0, W - 1));
// (desde chooseJob) ¿se resguarda?
const wantsShelter = (v, g) => { if (!rainOn(v)) return false; g.rainSeenT = yearT; return !v.umbrella && Math.random() < .75; };
function shelterTarget(v, g){
  const cands = [];
  if (v.home != null && world.objs[v.home]) cands.push(v.home);
  for (const b of [g.tavern, g.hall, g.market, g.temple, ...(g.stores || [])]) if (b != null && world.objs[b]) cands.push(b);
  let best = null, bd = 60 * T;
  for (const i of cands) { const d = Math.hypot((i % W) * T - v.x, ((i / W) | 0) * T - v.y); if (d < bd) { bd = d; best = i; } }
  if (best == null) best = objNear(g, 14, o => OBJ[o.key][1] === 'tree' && o.st !== 'b', v);
  const sb = best != null && standBy(best); if (!sb) return null;
  return { k:'refugio', x:sb[0] + (Math.random() - .5) * 4, y:sb[1] };
}
// Trabajos: coser paraguas (con tela) donde ha llovido hace poco y falta gente por tenerlo
function umbrellaJobs(v, g, add){
  if (yearT - (g.rainSeenT ?? -1e9) > DAY_LEN * 2) return;
  const lack = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H && !u.umbrella).length; if (lack < 2) return;
  if ((g.cloth || 0) >= 1) add('paraguas', busyWith(g, 'paraguas') < 2 ? 3 : 0);
  else add('tejer', busyWith(g, 'tejer') < 2 ? 2.5 : 0);
}
function umbrellaTarget(v, g){ const [x, y] = fireSpot(v, g); return { k:'paraguas', x:x + (Math.random() - .5) * 8, y }; }
function umbrellaArrive(v, g, t){
  v.actT = 5; v.onDone = () => {
    if ((g.cloth || 0) < 1) return; g.cloth -= 1;
    const to = [v, ...villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H && u !== v)].filter(u => !u.umbrella).slice(0, 2); // cada tela da para dos
    for (const u of to) u.umbrella = true;
    floats.push({ x:v.x, y:v.y - 12, txt:`+${to.length} paraguas`, col:'#e8b0a8', life:0 });
    if (!g.umbrellaMsg) { g.umbrellaMsg = true; notify(`En ${g.name} cosen los primeros paraguas con tela: ya no tienen que parar cuando llueve`, { x:v.x, y:v.y }); }
  };
  return true;
}
function shelterArrive(v, g, t){ v.actT = 5 + Math.random() * 4; v.dir = Math.random() < .5 ? -1 : 1; v.onDone = null; return true; }
// Al dibujar: la hoja (o el paraguas) de quien anda bajo la lluvia
function drawRainCover(v, x, top){
  if (!rainOn(v) || (v.task && (v.task.k === 'refugio' || v.task.job === 'refugio'))) return;
  if (v.umbrella) { // paraguas de tela, del color de su pueblo
    const g = villageById(v.vid), [r, gg, b] = g ? villageColor(g) : [184, 72, 58];
    vctx.fillStyle = `rgb(${r},${gg},${b})`; vctx.fillRect(x - 4, top - 4, 9, 1); vctx.fillRect(x - 3, top - 5, 7, 1); vctx.fillRect(x - 1, top - 6, 3, 1);
    vctx.fillStyle = 'rgba(0,0,0,.35)'; vctx.fillRect(x - 4, top - 3, 9, 1);
    vctx.fillStyle = '#4a3020'; vctx.fillRect(x, top - 3, 1, 4); return; // el mango
  }
  vctx.fillStyle = '#4a8a3a'; vctx.fillRect(x - 3, top - 3, 7, 1); vctx.fillRect(x - 2, top - 4, 5, 1);
  vctx.fillStyle = '#2e5a26'; vctx.fillRect(x, top - 2, 1, 2); // la hoja y su tallo
}
