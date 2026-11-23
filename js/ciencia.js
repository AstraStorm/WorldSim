// Forja de Mundos · Universidad y ciencia: sabios que investigan y descubrimientos que cambian el juego
// ================= Ciencia =================
// · Con escuela y escritura se levanta la universidad; allí los sabios (y los que estudiaron) investigan
// · Lo que se descubre es de toda la nación, en este orden: medicina, rotación de cultivos, metalurgia, astronomía,
//   ciencia económica, aeronáutica, pólvora y vacunas. Cada uno tiene su efecto (ver DISCOVERIES)
// · Los descubrimientos se contagian al comerciar con quien ya los tiene, y los espías los pueden robar
// · La crónica avisa cuando una nación es la primera del mundo en descubrir algo
const DISCOVERIES = [
  { k:'medicina',    txt:'la medicina',              cost:25, eff:'los enfermos se curan antes' },
  { k:'agronomia',   txt:'la rotación de cultivos',  cost:30, eff:'el campo da más comida' },
  { k:'metalurgia',  txt:'la metalurgia',            cost:40, eff:'las minas sacan la mitad más de mineral' },
  { k:'astronomia',  txt:'la astronomía',            cost:45, eff:'sus cartógrafos se orientan mucho mejor' },
  { k:'economia',    txt:'la ciencia económica',     cost:55, eff:'la inflación sube menos' },
  { k:'aeronautica', txt:'la aeronáutica',           cost:60, eff:'sus globos van más rápido y aguantan más flechas' },
  { k:'polvora',     txt:'la pólvora',               cost:75, eff:'sus soldados hacen mucho más daño' },
  { k:'vacunas',     txt:'las vacunas',              cost:90, eff:'las epidemias apenas les afectan' },
];
const sciOf = g => (nationOf(g).sci ||= {});
const knowsSci = (g, k) => !!(g && sciOf(g)[k]);
function research(g, pts){
  const n = nationOf(g), S = sciOf(g); n.research = (n.research || 0) + pts;
  const next = DISCOVERIES.find(d => !S[d.k]); if (!next || n.research < next.cost) return;
  n.research -= next.cost; S[next.k] = Math.floor(yearT / DAY_LEN) + 1;
  const first = !(world.sciFirst ||= {})[next.k]; if (first) world.sciFirst[next.k] = n.id;
  notify(`${first ? '¡Por primera vez en el mundo! ' : ''}Los sabios de ${n.name} descubren ${next.txt}: ${next.eff}`, { x:n.fx * T, y:n.fy * T });
  sendNews(n, `los sabios de ${n.name} han descubierto ${next.txt}`);
  if (first) { const sage = villagers.filter(u => !u.dead && u.vid === n.id && ageOf(u) >= ADULT_H).sort((a, b) => (b.oficio === 'sabio') - (a.oficio === 'sabio') || (b.edu || 0) - (a.edu || 0))[0]; if (sage) addHero(n, sage, `fue de los primeros del mundo en descubrir ${next.txt}`); }
}
// Al tratar con otros (comercio, visitas) a veces se aprende uno de sus descubrimientos
function spreadScience(a, b){
  for (const [x, y] of [[a, b], [b, a]]) {
    const miss = DISCOVERIES.filter(d => knowsSci(x, d.k) && !knowsSci(y, d.k)); if (!miss.length || Math.random() > .12) continue;
    const d = miss[0]; sciOf(y)[d.k] = Math.floor(yearT / DAY_LEN) + 1;
    notify(`Los de ${nationOf(y).name} aprenden ${d.txt} de ${nationOf(x).name}`, { x:y.fx * T, y:y.fy * T });
  }
}
// Trabajos: investigar en la universidad (los sabios, sobre todo)
function scienceJobs(v, g, add){ if (hasInst(g, 'universidad') && ageOf(v) >= ADULT_H) add('investigar', busyWith(g, 'investigar') < 3 ? (v.oficio === 'sabio' ? 8 : (v.edu || 0) > .3 ? 2 : .5) : 0); }
function scienceTarget(v, g, job){ const sb = hasInst(g, 'universidad') && standBy(g.university); return sb ? { k:job, x:sb[0] + (Math.random() - .5) * 8, y:sb[1] } : null; }
function scienceArrive(v, g, t){
  v.actT = 10; v.dir = Math.random() < .5 ? -1 : 1;
  v.onDone = () => { research(g, 1 + (v.edu || 0) * 2 + (v.oficio === 'sabio' ? 1 : 0)); if (Math.random() < .3) floats.push({ x:v.x, y:v.y - 12, txt:['¡Eureka!', 'hipótesis…', 'experimento', 'tesis'][Math.floor(Math.random() * 4)], col:'#c8e0f0', life:0 }); };
  return true;
}
// Los efectos que no dependen de otro sistema (los demás se miran con knowsSci donde toca)
function scienceTick(g, dt, people){
  if ((g.sciT = (g.sciT || 0) - dt) > 0) return; g.sciT = 5; const el = 5;
  const med = knowsSci(g, 'vacunas') ? .1 : knowsSci(g, 'medicina') ? .04 : 0;
  if (med) for (const u of people) if (u.sick && Math.random() < med * el) { u.sick = null; u.hp = Math.min(1, (u.hp ?? 1) + .3); }
  if (knowsSci(g, 'agronomia')) g.food += people.length * .015 * el;
  if (knowsSci(g, 'astronomia')) g.cartoSkill = Math.max(g.cartoSkill || 0, 6);
}
function scienceCard(g){
  const S = sciOf(g), n = nationOf(g), got = DISCOVERIES.filter(d => S[d.k]), next = DISCOVERIES.find(d => !S[d.k]);
  if (!got.length && !hasInst(g, 'universidad')) return '';
  return `<h4>Ciencia</h4>${next && hasInst(g, 'universidad') ? `<div class="needs"><span>Investigando ${esc(next.txt)}</span>${bar((n.research || 0) / next.cost, '#8ab4d8', 150)}<span>${Math.round((n.research || 0) / next.cost * 100)} %</span></div>` : ''}
    ${got.length ? `<div>${got.map(d => `<b>${esc(capFirst(d.txt))}</b> <span class="muted">· ${esc(d.eff)}${world.sciFirst && world.sciFirst[d.k] === n.id ? ' · ¡los primeros del mundo!' : ''}</span>`).join('<br>')}</div>` : '<div class="muted">Aún no han descubierto nada</div>'}`;
}
