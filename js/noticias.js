// Forja de Mundos · Noticias que viajan: mensajeros entre naciones y batidas para buscar animales
// ================= Noticias =================
// · Las noticias importantes (una guerra, una paz, un cambio de régimen, un descubrimiento) no llegan solas: la nación
//   manda mensajeros (a caballo si tiene casa de postas) a las naciones que conoce, y allí se enteran al llegar
// · Hay oficio de mensajero: son los que salen con las cartas (si no hay, va cualquiera)
// ================= Batidas =================
// · Un pueblo con cercado al que le falta una clase de animal que le iría bien (caballos para montar, ovejas para la
//   lana, vacas, cerdos, gallinas) manda una batida de dos o tres a buscarla lejos; vuelven con los animales detrás
INSTS.postas = { key:'post:postas', field:'postHouse', wood:10, stone:6, t:10, name:'una casa de postas', why:'sus mensajeros irán a caballo y llegarán antes',
  want:g => nationOf(g) === g && (g.know || {}).escritura && popOf(g) >= 14, w:g => 2.5 };
function sendNews(n, text){
  if (!n || !popOf(n)) return; n = nationOf(n);
  for (const o of nationsAlive()) {
    if (o === n) continue; const r = rels.get(relKey(n, o)); if (!r || !r.known || r.war) continue;
    if (travelers.filter(t => t.kind === 'mensajero' && t.from === n.id).length >= 4) break;
    const n0 = travelers.length; sendTraveler('mensajero', n, o); if (travelers.length === n0) continue;
    const t = travelers[travelers.length - 1]; t.news = text; t.fast = hasInst(n, 'postas');
  }
}
// Al llegar el mensajero (desde updateTravelers)
function newsArrive(t, from, to){
  if (!to || !t.news) return;
  if (!to.newsMsgT || yearT - to.newsMsgT > 15) { to.newsMsgT = yearT; notify(`Llega a ${to.name} un mensajero de ${from.name}: ${t.news}`, { x:to.fx * T, y:to.fy * T }); }
  (to.news ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, from:from.name, txt:t.news }); if (to.news.length > 8) to.news.shift();
}
// ---- Batidas ----
const WANT_ANIMALS = { caballo:g => (g.know || {}).montar !== false, oveja:g => true, vaca:g => true, cerdo:g => true, pollo:g => true };
function huntTick(g, dt, people, adults){
  if ((g.huntT = (g.huntT ?? DAY_LEN * .5) - dt) > 0) return; g.huntT = DAY_LEN * (.8 + Math.random() * .6);
  if (!pensOf(g).length || adults.length < 6 || travelers.some(t => t.kind === 'batida' && t.from === g.id)) return;
  const have = new Set(penAnimals(g).map(a => a.sp)), want = Object.keys(WANT_ANIMALS).filter(sp => !have.has(sp) && WANT_ANIMALS[sp](g));
  if (!want.length || penAnimals(g).length >= pensOf(g).length * PEN_CAP - 2) return;
  let best = null, bd = 90 * T; for (const a of animals) if (!a.dead && !a.dom && want.includes(a.sp)) { const d = Math.hypot(a.x - g.fx * T, a.y - g.fy * T); if (d < bd && d > 20 * T) { bd = d; best = a; } }
  if (!best) return;
  const hunters = adults.filter(u => !u.away && !u.boat && u !== g.leader && !(u.task && BUSY_POL.includes(u.task.k))).sort((a, b) => (b.oficio === 'pastor' || b.oficio === 'cazador') - (a.oficio === 'pastor' || a.oficio === 'cazador')).slice(0, 3);
  if (hunters.length < 2) return;
  for (const u of hunters) { releaseTask(u); dismount(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'viaje' }; u.away = true; }
  const hx = g.fx * T + 2, hy = g.fy * T + 8;
  travelers.push({ kind:'batida', v:hunters[0], crew:hunters, from:g.id, to:g.id, x:hunters[0].x, y:hunters[0].y, tx:best.x, ty:best.y, hx, hy, sea:false, phase:'ida', dir:1, prey:best.sp, animals:[] });
  notify(`De ${g.name} sale una batida de ${hunters.length} a buscar ${best.sp === 'pollo' ? 'gallinas' : best.sp === 'caballo' ? 'caballos' : best.sp + 's'} lejos de casa`, { x:hx, y:hy });
}
// Al llegar: atrapan hasta tres animales de esa clase que estén por allí y se los llevan
function huntArrive(t, g){
  const near = animals.filter(a => !a.dead && !a.dom && a.sp === t.prey && Math.hypot(a.x - t.x, a.y - t.y) < 40).slice(0, 3);
  for (const a of near) { a.dom = g.id; a.domSince = yearT; a.lead = null; if (herdLeader.get(a.herd) === a) herdLeader.delete(a.herd); a.herd = 0; t.animals.push(a); }
  if (!near.length) notify(`La batida de ${g.name} no encuentra los animales que buscaba y vuelve con las manos vacías`, { x:t.x, y:t.y });
}
// De vuelta en casa: los animales, al cercado
function huntHome(t, g){
  for (const a of t.animals || []) if (!a.dead) { a.penK = emptiestPen(g); const pp = pensOf(g)[a.penK]; if (pp) { a.x = (pp.x0 + 2) * T; a.y = (pp.y0 + 2) * T; } }
  if ((t.animals || []).length) notify(`La batida de ${g.name} vuelve con ${t.animals.length} ${t.prey === 'pollo' ? 'gallinas' : t.prey === 'caballo' ? 'caballos' : t.prey + 's'} para el cercado`, { x:t.x, y:t.y });
}
