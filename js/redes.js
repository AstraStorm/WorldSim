// World Sim · Redes sociales
// ================= Redes =================
// · Con internet y móviles, y cobertura en el pueblo, llegan las redes sociales: la gente mira el móvil en su tiempo
//   libre (una lucecita en la mano), comenta lo que ha visto y las ideas (susurros.js) corren mucho más deprisa, también
//   entre naciones que nunca se han tratado
// · Influencers: gente joven y sociable que gana seguidores cada día; lo que cuentan se contagia todavía más
// · Bulos: de vez en cuando se hace viral uno (que el gobierno engaña, que los vecinos nos roban...). Funcionan como
//   las ideas susurradas: si calan, pasan cosas. Con prensa libre se desmienten antes (pierden fuerza)
// · En Historia > Espectáculos, las tendencias: lo que más se comparte y los influencers con más seguidores
const netC = new Map();
function netOn(g){
  if (!g) return false; const c = netC.get(g.id); if (c && yearT - c.t < 10 && yearT >= c.t) return c.on;
  const n = nationOf(g), on = knowsSci(n, 'internet') && knowsSci(n, 'moviles') && typeof connOf === 'function' && connOf(g) > .4;
  netC.set(g.id, { t:yearT, on }); return on;
}
// Para susurros.js: cuánto más se cuenta una idea y a quién puede llegar (cualquier pueblo con redes)
const netBoost = b => netOn(villageById(b.vid)) ? (b.star && b.star.k === 'redes' ? 3 : 1.8) : 1;
function netPool(b, byVid){
  const g = villageById(b.vid); if (!netOn(g) || Math.random() > .2) return null;
  const nets = villages.filter(o => o !== g && popOf(o) && netOn(o)); if (!nets.length) return null;
  return byVid.get(nets[Math.floor(Math.random() * nets.length)].id) || null;
}
if (typeof STAR_TXT !== 'undefined') STAR_TXT.redes = ['influencer', 'influencer'];
// ---- Influencers y bulos (cada día, por nación) ----
function influencersTick(n, towns){
  const ads = villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && towns.some(g => g.id === u.vid));
  const inf = ads.filter(u => u.star && u.star.k === 'redes');
  for (const u of inf) { u.star.fol = Math.round((u.star.fol || 50) * (1.05 + trait(u, 'sociable') * .15 + Math.random() * .1)); u.star.fame += Math.log10(u.star.fol) / 4; }
  if (inf.length < 2 && Math.random() < .4) {
    const u = ads.filter(x => !x.star && ageOf(x) < (x.life || 20) * .45).sort((a, b) => trait(b, 'sociable') + trait(b, 'ambicion') - trait(a, 'sociable') - trait(a, 'ambicion'))[0];
    if (u) { makeStar(u, 'redes', 'sus vídeos'); u.star.fol = 120 + Math.floor(Math.random() * 400); if (typeof isPlayerG === 'function' && isPlayerG(n)) notify(`📱 ${u.name}, de ${villageById(u.vid).name}, arrasa en las redes con sus vídeos: ya tiene ${u.star.fol} seguidores`, { x:u.x, y:u.y }); }
  }
}
function buloTick(n, towns){
  if (Math.random() > .25 || typeof adopt !== 'function') return;
  if (ideasOf().filter(I => I.bulo && I.st !== 'fin').length >= 4) return;
  const ads = villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && towns.some(g => g.id === u.vid)); if (!ads.length) return;
  const inf = ads.filter(u => u.star && u.star.k === 'redes'), src = inf.length && Math.random() < .5 ? inf[Math.floor(Math.random() * inf.length)] : ads[Math.floor(Math.random() * ads.length)], g = villageById(src.vid);
  const foes = villages.filter(o => o !== g && popOf(o) && !sameNation(o, g) && relOf(g, o).known), r = Math.random();
  const k = foes.length && r < .4 ? 'guerra' : r < .85 ? 'revuelta' : 'fe', tgt = k === 'guerra' ? foes[Math.floor(Math.random() * foes.length)].id : null;
  const s = typeof pressFree === 'function' && pressFree(n) ? .8 : 1; // (con prensa libre, los periódicos lo desmienten: menos fuerza)
  const I = { id:(world.ideaSeq = (world.ideaSeq || 0) + 1), k, tgt, law:null, vid:g.id, who:src.name, t0:yearT, hit:{}, st:'va', best:0, bestVid:g.id, bulo:true, n:1, towns:1 };
  ideasOf().push(I); adopt(src, I, s);
  if ((typeof isPlayerG === 'function' && isPlayerG(n)) || Math.random() < .3) notify(`📱 Se hace viral un bulo en ${n.name}: «${ideaSay(I, src)}»${src.star && src.star.k === 'redes' ? ` (lo ha compartido ${src.name})` : ''}`, { x:g.fx * T, y:g.fy * T });
}
let netClock = 0;
SYSTEMS.push(dt => {
  if ((netClock -= dt) > 0 || !villages.length) return; netClock = 8;
  const day = Math.floor(yearT / DAY_LEN);
  for (const n of villages) {
    if (nationOf(n) !== n || !popOf(n) || n.netDay === day) continue;
    const towns = villages.filter(o => popOf(o) && nationOf(o) === n && netOn(o)); if (!towns.length) continue;
    n.netDay = day;
    if (!n.netMsg) { n.netMsg = true; notify(`📱 En ${n.name} llegan las redes sociales: todo el mundo con el móvil en la mano`, { x:n.fx * T, y:n.fy * T }); }
    influencersTick(n, towns); buloTick(n, towns);
  }
});
// ---- Lo que se ve y se dice ----
const PHONE_JOBS = new Set(['ocio', 'pasear', 'espectador', 'votar', 'ir_taberna']);
{ const base = drawPersonExtras; drawPersonExtras = function(v, x, y, s, now){
  if (zoom >= 3 && v.task && (PHONE_JOBS.has(v.task.k) || PHONE_JOBS.has(v.task.job)) && ageOf(v) >= ADULT_H * .6 && ((v.uid || 0) + Math.floor(now / 4000)) % 3 === 0 && netOn(villageById(v.vid))) {
    const px = x + v.dir * 2, py = y - Math.round(s.height * .45); vctx.fillStyle = '#1a1a20'; vctx.fillRect(px, py, 2, 3); vctx.fillStyle = `rgba(150,210,255,${.7 + .3 * Math.sin(now / 300 + x)})`; vctx.fillRect(px, py, 2, 2);
  }
  return base.apply(this, arguments);
}; }
{ const base = thoughtOf; thoughtOf = function(v){
  const g = villageById(v.vid);
  if (!v.sleep && ageOf(v) >= ADULT_H * .6 && Math.random() < .1 && netOn(g)) {
    const inf = villagers.find(u => !u.dead && u.star && u.star.k === 'redes' && u !== v && nationOf(villageById(u.vid) || {}) === nationOf(g));
    return { txt:thPick(['Lo he visto en las redes', '¡Mi foto tiene 30 me gusta!', 'Se me ha acabado la batería', inf ? `¿Has visto el último vídeo de ${inf.name}?` : 'Esto hay que subirlo', v.star && v.star.k === 'redes' ? `¡Ya tengo ${v.star.fol} seguidores!` : 'Voy a mirar el móvil un momento']), mood:0, think:Math.random() < .4 };
  }
  return base.apply(this, arguments);
}; }
// Tendencias, en Historia > Espectáculos
{ const base = showsHtml; showsHtml = function(){
  const h = base.apply(this, arguments);
  const ideas = ideasOf().filter(I => I.st !== 'fin' && (I.n || 0) >= 3).sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, 5);
  const inf = villagers.filter(u => !u.dead && u.star && u.star.k === 'redes').sort((a, b) => (b.star.fol || 0) - (a.star.fol || 0)).slice(0, 5);
  if (!ideas.length && !inf.length) return h;
  const extra = `${ideas.length ? `<h4>📱 Tendencias</h4>${ideas.map((I, i) => `<div class="gb-row"><span class="gb-k">#${i + 1} ${I.bulo ? 'bulo' : 'idea'}</span><span class="gb-p"><span><b>${esc(quoted(ideaSay(I)))}</b> · ${I.n} lo creen${I.towns > 1 ? ` en ${I.towns} pueblos` : ''}</span></span></div>`).join('')}` : ''}
    ${inf.length ? `<h4>🤳 Influencers</h4>${inf.map(u => `<div class="gb-row"><span class="gb-k">${esc(u.name)}</span><span class="gb-p"><span>${(u.star.fol || 0).toLocaleString('es')} seguidores · ${esc((nationOf(villageById(u.vid) || {}) || {}).name || '')}</span></span></div>`).join('')}` : ''}`;
  return h.startsWith('<div class="pw">') ? h.replace(/<\/div>$/, extra + '</div>') : `<div class="pw">${extra}</div>`;
}; }
