// World Sim · Medios y espectáculos: radio, televisión, cine y famosos
// ================= Medios =================
// · Radio (con la electricidad y corriente en algún pueblo) y televisión (con las telecomunicaciones y antenas): cada
//   nación tiene sus emisoras y canales, como los periódicos (prensa.js): uno público y, con libertad de prensa, otros
//   afines a los partidos. Llegan también a quien no sabe leer y pesan más: cada día acercan a su audiencia a sus ideas
//   y dan las noticias a su manera. Con censura o en una dictadura, solo queda el oficial
// · En campaña, debate electoral por la radio o la tele entre los líderes de los dos grandes partidos: quien lo gana
//   arrastra algo de voto. Los Juegos se ven en directo por la tele
// · Cine: el teatro de un pueblo con corriente se vuelve cine. Cada pocos días la nación estrena una película sobre algo
//   que ha pasado de verdad (una guerra, una catástrofe, una colonia...), con director y actores del pueblo; hace
//   taquilla en casa y en las naciones amigas. Cada año, los premios Estrella de Oro a la mejor película e intérprete
// · Famosos: presentadores, locutores y actores ganan fama con su público; llevan un brillo encima, la gente les pide
//   autógrafos, la prensa saca sus escándalos y alguno acaba liderando un partido
// · Por la noche, en los pueblos con tele, las ventanas parpadean en azul; los cines tienen su letrero y las capitales
//   con radio, su antena con la luz roja
const RADIO_NAMES = { izq:['Radio Popular', 'Onda Obrera', 'Radio Libertad', 'La Voz Libre'], centro:['Radio {N}', 'Cadena Central', 'Onda {P}', 'Radio Mediodía'], der:['Cadena del Orden', 'Radio Tradición', 'Onda Patria', 'Radio Imperio'] };
const TV_NAMES = { izq:['Canal Popular', 'Tele Pueblo', 'La Pantalla Roja'], centro:['Antena {N}', 'Canal Estrella', 'Cuatro Vientos', 'Tele{P}'], der:['Canal Patria', 'Televisión del Orden', 'Canal Plus {N}'] };
const MEDIA_COLS = ['#e0604a', '#4a8ad8', '#e8b848', '#7ab04a', '#c84a90', '#30a8a8', '#8a5ac8', '#e07a30'];
const mediaOf = n => (n.media ||= { radio:[], tv:[] });
const natTowns = n => villages.filter(o => popOf(o) && nationOf(o) === n);
const townPower = g => typeof plantOn === 'function' && (plantOn(g) || (typeof importsPower === 'function' && importsPower(g)));
const radioOn = n => knowsSci(n, 'electricidad') && natTowns(n).some(townPower);
const tvOn = n => knowsSci(n, 'telecomunicaciones') && natTowns(n).some(g => townPower(g) && typeof teleOf === 'function' && teleOf(g).length);
const cineOn = g => !!g && hasTheater(g) && knowsSci(nationOf(g), 'electricidad') && townPower(g);
const tvTown = g => tvOn(nationOf(g)) && townPower(g) && typeof teleOf === 'function' && teleOf(g).length > 0;
const mediaDay = () => Math.floor(yearT / DAY_LEN);
// ---- Famosos ----
function makeStar(u, k, what){ if (!u) return; const s = u.star; u.star = { k, what, fame:(s ? s.fame : 0) + 1, since:s ? s.since : yearT }; }
const STAR_TXT = { radio:['locutor', 'locutora'], tv:['presentador', 'presentadora'], cine:['actor', 'actriz'], dir:['director de cine', 'directora de cine'] };
const starJob = u => { const t = STAR_TXT[u.star.k] || STAR_TXT.cine; return t[u.sex === 'm' ? 1 : 0]; };
const pickHost = (n, ideo) => villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && ageOf(u) < (u.life || 20) * .75 && !locked(u) && nationOf(villageById(u.vid) || {}) === n && !(u.star && u.star.k !== 'cine'))
  .sort((a, b) => (trait(b, 'sociable') + (b.edu || 0) * .5 - Math.abs((b.ideo || 0) - ideo) * .6) - (trait(a, 'sociable') + (a.edu || 0) * .5 - Math.abs((a.ideo || 0) - ideo) * .6))[0] || null;
// ---- Emisoras y canales ----
function mediaName(kind, side, n, used){
  const towns = natTowns(n), P = towns[Math.floor(Math.random() * towns.length)] || n, pool = (kind === 'radio' ? RADIO_NAMES : TV_NAMES)[side].map(x => x.replace('{N}', n.name).replace('{P}', P.name)).filter(x => !used.has(x));
  return pool[Math.floor(Math.random() * pool.length)] || `${kind === 'radio' ? 'Radio' : 'Canal'} ${n.name} ${used.size + 1}`;
}
const alP = p => artP(p) === 'el' ? 'al' : 'a ' + artP(p); // «afín al Partido», «afín a la Unión»
function openOutlet(n, kind, official, pub){
  const M = mediaOf(n), L = M[kind], used = new Set([...M.radio, ...M.tv].map(o => o.name));
  const party = !official && n.parties ? n.parties.find(q => !L.some(o => o.party === q.name)) : null;
  const ideo = official ? govIdeo(n) : party ? party.ideo : (Math.random() - .5) * .8;
  const name = official ? (kind === 'radio' ? `Radio Nacional de ${n.name}` : `Televisión de ${n.name}`) : mediaName(kind, sideOf(ideo), n, used);
  const host = pickHost(n, ideo), col = MEDIA_COLS.find(c => ![...M.radio, ...M.tv].some(o => o.col === c)) || '#888';
  const o = { kind, name, ideo, party:party ? party.name : null, official:!!official && !pub, public:!!pub, host, col, since:yearT, heads:[], aud:0 };
  L.push(o); if (host) makeStar(host, kind, name);
  notify(`${kind === 'radio' ? '📻' : '📺'} En ${n.name} empieza a emitir «${name}»${party ? `, afín ${alP(party)} ${party.name}` : pub ? ', la pública' : official ? ', la del gobierno' : ''}${host ? (kind === 'radio' ? `, con ${host.name} al micrófono` : `, presentada por ${host.name}`) : ''}`, { x:n.fx * T, y:n.fy * T });
  return o;
}
function outletsTick(n, kind, on, free){
  const M = mediaOf(n), L = M[kind];
  if (!on) return;
  if (!free) { const shut = L.filter(o => !o.official); if (shut.length) { M[kind] = L.filter(o => o.official); notify(`En ${n.name} el gobierno cierra ${shut.map(o => `«${o.name}»`).join(' y ')}: solo queda la ${kind === 'radio' ? 'radio' : 'tele'} oficial`, { x:n.fx * T, y:n.fy * T }); } }
  else for (const o of L) if (o.official) { o.official = false; o.public = true; }
  const want = free ? Math.min(3, 1 + (n.parties ? n.parties.length : 0)) : 1;
  if (!M[kind].length) openOutlet(n, kind, true, free); // (la primera, la pública: del gobierno si no hay libertad de prensa)
  else if (M[kind].length < want && Math.random() < .35) openOutlet(n, kind, false);
  for (const o of M[kind]) { if (o.official || o.public) o.ideo = o.official ? govIdeo(n) : o.ideo * .9; if (!o.host || o.host.dead || nationOf(villageById(o.host.vid) || {}) !== n) { o.host = pickHost(n, o.ideo); if (o.host) makeStar(o.host, kind, o.name); } }
}
// Cada día: noticias, audiencia (que se acerca a sus ideas) y fama de los presentadores
function audienceTick(n, day){
  const M = mediaOf(n), all = [...M.radio, ...M.tv]; if (!all.length) return;
  const towns = natTowns(n), news = towns.flatMap(g => (g.log || []).filter(e => e.d >= day && !/periódico|«.*»/.test(e.txt)).map(e => [g, e])).slice(-8);
  for (const o of all) {
    o.aud = 0; const pick = news.length ? news[Math.floor(Math.random() * news.length)] : null;
    if (pick && typeof headline === 'function') { o.heads.push({ d:day + 1, txt:headline(o, pick[0], pick[1].txt) }); if (o.heads.length > 3) o.heads.shift(); }
  }
  for (const g of towns) {
    const hasR = M.radio.length && townPower(g), hasT = M.tv.length && tvTown(g); if (!hasR && !hasT) continue;
    for (const u of villagers) {
      if (u.dead || u.vid !== g.id || ageOf(u) < ADULT_H || u.jail) continue;
      const L = hasT && (Math.random() < .7 || !hasR) ? M.tv : M.radio;
      const o = Math.random() < .7 ? L.slice().sort((a, b) => Math.abs(a.ideo - (u.ideo || 0)) - Math.abs(b.ideo - (u.ideo || 0)))[0] : L[Math.floor(Math.random() * L.length)];
      o.aud++; u.ideo = clamp((u.ideo || 0) + (o.ideo - (u.ideo || 0)) * (o.official ? .05 : o.kind === 'tv' ? .045 : .035), -1, 1); u.mediaT = yearT; u.mediaK = o.kind;
    }
  }
  for (const o of all) if (o.host && o.host.star) o.host.star.fame += Math.min(2, o.aud / 30);
  // Alguna noticia sale en las de todo el mundo (en tu nación, más a menudo)
  const o = all[Math.floor(Math.random() * all.length)], h = o && o.heads[o.heads.length - 1];
  if (h && h.d === day + 1 && Math.random() < ((typeof isPlayerG === 'function' && isPlayerG(n)) ? .5 : .08)) notify(`${o.kind === 'radio' ? '📻' : '📺'} ${o.name}: «${h.txt}»`, { x:n.fx * T, y:n.fy * T });
}
// Debate electoral (en campaña, por la tele si hay; si no, por la radio)
function debateTick(n){
  if (!votes(n) || !n.parties || n.parties.length < 2 || n.debateV === n.voteT || n.election) return;
  const since = yearT - (n.voteT ?? -1e9); if (since < ELECTION_GAP - DAY_LEN * 1.4 || since > ELECTION_GAP - DAY_LEN * .2) return;
  const M = mediaOf(n), o = M.tv[0] || M.radio[0]; if (!o) return;
  const order = n.parties.map((q, k) => k).sort((a, b) => ((n.voteRes || [])[b] || 0) - ((n.voteRes || [])[a] || 0)), A = n.parties[order[0]], B2 = n.parties[order[1]];
  const la = typeof partyLeaderOf === 'function' ? partyLeaderOf(n, A) : null, lb = typeof partyLeaderOf === 'function' ? partyLeaderOf(n, B2) : null; if (!la || !lb) return;
  n.debateV = n.voteT;
  const sc = u => trait(u, 'sociable') + (u.edu || 0) * .5 + (u.star ? Math.min(1, u.star.fame / 10) : 0) + Math.random() * .6, wa = sc(la) >= sc(lb), W0 = wa ? A : B2, Wl = wa ? la : lb, Ll = wa ? lb : la;
  for (const u of villagers) if (!u.dead && ageOf(u) >= ADULT_H && nationOf(villageById(u.vid) || {}) === n && Math.abs((u.ideo || 0) - W0.ideo) < .6) u.ideo = (u.ideo || 0) + (W0.ideo - (u.ideo || 0)) * .06;
  makeStar(Wl, 'tv', `el debate de «${o.name}»`); Wl.star.fame += 2;
  notify(`${o.kind === 'tv' ? '📺' : '📻'} Debate electoral en «${o.name}»: ${la.name} (${A.name}) contra ${lb.name} (${B2.name}). Según las encuestas lo gana ${Wl.name}; ${Ll.name} no estuvo fino`, { x:n.fx * T, y:n.fy * T });
}
// ---- Cine ----
const FILM_GENRES = {
  'épica':[p => `La batalla de ${p}`, p => `Sangre en ${p}`, p => `Los héroes de ${p}`, p => `${p}: la guerra`],
  drama:[p => `Lágrimas en ${p}`, p => `El invierno de ${p}`, () => 'Lo que el río se llevó', p => `Adiós a ${p}`],
  aventura:[p => `Más allá de ${p}`, () => 'Los colonos', () => 'El mapa perdido', p => `Rumbo a ${p}`],
  romance:[p => `Amor en ${p}`, () => 'Dos corazones', p => `Bajo las estrellas de ${p}`],
  comedia:[p => `¡Vaya lío en ${p}!`, p => `Mi suegra es de ${p}`, () => 'El alcalde despistado', p => `Locos por ${p}`],
  propaganda:[p => `Gloria a ${p}`, () => 'El gran líder', p => `El triunfo de ${p}`],
};
const genreOf = txt => /guerra|batalla|ataca|conquist|saque|asalto/i.test(txt) ? 'épica' : /murió|muere|epidemia|hambre|sequía|terremoto|erupción|inundaci/i.test(txt) ? 'drama' : /colonia|expedici|descubren|funda/i.test(txt) ? 'aventura' : /boda|pareja|amor/i.test(txt) ? 'romance' : 'comedia';
const worldFilms = () => (world.films ||= []);
function shootFilm(n, day){
  const towns = natTowns(n), cines = towns.filter(cineOn); if (!cines.length) return;
  const recent = chronicle.filter(c => c.d >= day - 3 && towns.some(g => c.text.includes(g.name))).slice(-12), ev = recent.length ? recent[Math.floor(Math.random() * recent.length)] : null;
  let genre = ev ? genreOf(ev.text) : 'comedia'; if (tyranny(n) && Math.random() < .45) genre = 'propaganda';
  const names = villages.filter(o => popOf(o) || o.name).map(o => o.name), place = (ev && (towns.map(g => g.name).find(nm => ev.text.includes(nm)) || names.find(nm => ev.text.includes(nm)))) || (genre === 'propaganda' ? n.name : towns[Math.floor(Math.random() * towns.length)].name);
  const T0 = FILM_GENRES[genre], title = T0[Math.floor(Math.random() * T0.length)](place);
  const crew = villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && towns.some(g => g.id === u.vid) && !locked(u));
  const dir = crew.slice().sort((a, b) => ((b.edu || 0) + trait(b, 'ambicion') * .4 + Math.random() * .3) - ((a.edu || 0) + trait(a, 'ambicion') * .4 + Math.random() * .3))[0];
  const cast = crew.filter(u => u !== dir).sort((a, b) => (trait(b, 'sociable') + (b.star && b.star.k === 'cine' ? .5 : 0) + Math.random() * .4) - (trait(a, 'sociable') + (a.star && a.star.k === 'cine' ? .5 : 0) + Math.random() * .4)).slice(0, 2);
  if (!dir || !cast.length) return;
  const q = clamp(.15 + Math.random() * .55 + (dir.edu || 0) * .25 + (genre === 'propaganda' ? -.15 : 0), .05, 1);
  const F = { t:title, g:genre, by:dir.name, stars:cast.map(u => u.name), refs:cast, dir, nat:n.id, natName:n.name, d:day + 1, y:Math.floor(yearT / (SEASON_LEN * 4)) + 1, q, box:0, exp:[], about:ev ? ev.text.slice(0, 90) : '' };
  makeStar(dir, 'dir', `«${title}»`); for (const u of cast) makeStar(u, 'cine', `«${title}»`);
  (n.films ||= []).push(F); if (n.films.length > 10) n.films.shift();
  worldFilms().push(F); if (worldFilms().length > 40) worldFilms().shift();
  notify(`🎬 Estreno en ${n.name}: «${title}» (${genre}), de ${dir.name}, con ${cast.map(u => u.name).join(' y ')}${ev && genre !== 'comedia' && genre !== 'propaganda' ? ', basada en hechos reales' : ''}`, { x:cines[0].fx * T, y:cines[0].fy * T });
}
// Taquilla: los tres primeros días, en casa y en las naciones amigas con cine
function boxTick(n, day){
  for (const F of (n.films || [])) {
    if (day + 1 - F.d > 3) continue;
    const home = natTowns(n).filter(cineOn).reduce((a, g) => a + popOf(g), 0) * .25 * (.4 + F.q);
    let abroad = 0;
    for (const o of villages) { if (nationOf(o) !== o || o === n || !popOf(o)) continue; const r = relOf(n, o); if (!r.known || r.war || r.v < 10 || !natTowns(o).some(cineOn)) continue; if (F.q > .55 || Math.random() < .3) { abroad += natTowns(o).filter(cineOn).reduce((a, g) => a + popOf(g), 0) * .15 * F.q; if (!F.exp.includes(o.name)) F.exp.push(o.name); } }
    const tk = Math.round(home + abroad); F.box += tk;
    if (n.coin && typeof ecOf === 'function') ecOf(n).treas += tk * (ecOf(n).P || 1) * .05;
    for (const u of F.refs || []) if (!u.dead && u.star) u.star.fame += tk / 60;
  }
}
// Premios Estrella de Oro (una vez al año, para las películas de ese año)
function awardsTick(){
  const Y = Math.floor(yearT / (SEASON_LEN * 4)) + 1; if ((world.awardY ?? Y) === Y) { world.awardY = Y; return; }
  const prev = world.awardY; world.awardY = Y;
  const pool = worldFilms().filter(F => F.y === prev); if (!pool.length) return;
  const best = pool.slice().sort((a, b) => (b.q * 2 + b.box / 400 + Math.random() * .2) - (a.q * 2 + a.box / 400 + Math.random() * .2))[0];
  const actor = (best.refs || []).find(u => !u.dead) || null;
  (world.awards ||= []).push({ y:prev, film:best.t, nat:best.natName, by:best.by, actor:actor ? actor.name : null });
  if (actor && actor.star) actor.star.fame += 5; if (best.dir && best.dir.star) best.dir.star.fame += 4;
  const n = villageById(best.nat);
  notify(`🏆 Premios Estrella de Oro del año ${prev}: mejor película, «${best.t}» (${best.natName}), de ${best.by}${actor ? `; mejor intérprete, ${actor.name}` : ''}. ${pool.length > 1 ? `Competían ${pool.length} películas` : ''}`, n ? { x:n.fx * T, y:n.fy * T } : { x:0, y:0 });
}
// ---- Lo que les pasa a los famosos ----
const SCANDALS = ['perdiendo una fortuna en el casino', 'con una aventura secreta', 'borracho en la taberna', 'sin pagar sus impuestos', 'insultando a un camarero'];
function starsTick(){
  for (const u of villagers) {
    if (u.dead || !u.star) continue; const S = u.star; S.fame = Math.max(0, S.fame * .985); // (la fama se va apagando si no se alimenta)
    if (S.fame > 6 && Math.random() < .025) { S.fame *= .6; const g = villageById(u.vid); notify(`📰 Escándalo: pillan a ${u.name}, ${starJob(u)} de ${S.what}, ${SCANDALS[Math.floor(Math.random() * SCANDALS.length)]}`, { x:u.x, y:u.y }); if (g) g.log && g.log.push({ d:mediaDay(), txt:`Escándalo de ${u.name}` }); }
    const g = villageById(u.vid), n = g && nationOf(g);
    if (S.fame > 9 && n && votes(n) && n.parties && !n.parties.some(p => p.lead === u) && Math.random() < .02) {
      const p = n.parties.slice().sort((a, b) => Math.abs(a.ideo - (u.ideo || 0)) - Math.abs(b.ideo - (u.ideo || 0)))[0]; p.lead = u;
      notify(`${u.name}, ${starJob(u)} famos${u.sex === 'm' ? 'a' : 'o'} de ${S.what}, se mete en política: ahora lidera ${artP(p)} ${p.name}`, { x:u.x, y:u.y });
    }
  }
}
// ---- Cada día, por nación ----
let medClock = 0;
SYSTEMS.push(dt => {
  if ((medClock -= dt) > 0 || !villages.length || !world) return; medClock = 6;
  const day = mediaDay();
  for (const n of villages) {
    if (nationOf(n) !== n || !popOf(n)) continue;
    if (n.medDay === day) { debateTick(n); continue; }
    n.medDay = day; const free = typeof pressFree === 'function' ? pressFree(n) : true;
    outletsTick(n, 'radio', radioOn(n), free); outletsTick(n, 'tv', tvOn(n), free);
    audienceTick(n, day); debateTick(n);
    if (natTowns(n).some(cineOn) && day - (n.filmD ?? -99) >= 2 + Math.floor(Math.random() * 3)) { n.filmD = day; shootFilm(n, day); }
    boxTick(n, day);
    // Los Juegos, en directo
    if (olymp.cur && M_gamesKey() && n.gamesTV !== M_gamesKey() && tvOn(n)) { n.gamesTV = M_gamesKey(); for (const u of villagers) if (!u.dead && nationOf(villageById(u.vid) || {}) === n && ageOf(u) >= ADULT_H) u.fun = yearT; notify(`📺 En ${n.name} todo el mundo ve los Juegos de ${olymp.cur.hostName} en directo por la tele`, { x:n.fx * T, y:n.fy * T }); }
  }
  if (world.starDay !== day) { world.starDay = day; starsTick(); awardsTick(); }
});
const M_gamesKey = () => olymp.cur ? `${olymp.past.length}:${olymp.cur.host}` : null; // (unos Juegos: cuántos ha habido antes y quién los organiza)
// ---- Ánimo y pensamientos ----
{ const base = socialMood; socialMood = function(v, g, add){
  base(v, g, add); if (!v.mediaT || yearT - v.mediaT > DAY_LEN * 1.5 || ageOf(v) < ADULT_H) return;
  add(3, v.mediaK === 'tv' ? 've la tele' : 'escucha la radio');
}; }
if (typeof TH_MOOD !== 'undefined') TH_MOOD.unshift(
  [/^ve la tele$/, () => ['¿Viste anoche la tele?', 'Esta noche echan algo bueno', 'En el telediario dijeron que...']],
  [/^escucha la radio$/, () => ['En la radio dijeron que...', '¿Has oído la radio esta mañana?']]);
{ const base = thoughtOf; thoughtOf = function(v){
  const g = villageById(v.vid), n = g && nationOf(g);
  if (v.star && v.star.fame > 2 && !v.sleep && Math.random() < .3) return { txt:thPick(['¿Me habrán reconocido?', `Mañana tengo rodaje`, 'Qué cansado es ser famos@', `¿Has visto ${v.star.what}?`]).replace('@', v.sex === 'm' ? 'a' : 'o'), mood:0, think:Math.random() < .5 };
  if (v.task && (v.task.k === 'ver_teatro' || v.task.job === 'ver_teatro') && cineOn(g)) { const F = (n.films || []).slice(-1)[0]; if (F) return { txt:thPick([`¡Qué peliculón, «${F.t}»!`, `${F.stars[0]} está genial en «${F.t}»`, '¡Palomitas!']), mood:1, think:false }; }
  if (n && Math.random() < .06) { const F = worldFilms().filter(x => x.exp.includes(n.name) || x.nat === n.id).slice(-1)[0]; if (F) return { txt:thPick([`¿Has visto «${F.t}»?`, `Dicen que «${F.t}» es buenísima`]), mood:0, think:false }; }
  return base.apply(this, arguments);
}; }
// Los fans: al ver pasar a alguien famoso, le piden un autógrafo (de cerca)
let fanClock = 0;
SYSTEMS.push(dt => {
  if ((fanClock -= dt) > 0 || zoom < 3 || typeof sayList === 'undefined' || busy) return; fanClock = 2;
  const now = performance.now(), on = v => { const sx = offX + v.x * zoom, sy = offY + v.y * zoom; return sx > 30 && sx < cw - 30 && sy > 150 && sy < ch - 10; };
  for (const s of villagers) {
    if (s.dead || !s.star || s.star.fame < 3 || s.away || s.sleep || !on(s) || sayList.some(x => x.v === s)) continue;
    const fan = villagers.find(u => u !== s && !u.dead && !u.away && !u.sleep && !u.star && Math.hypot(u.x - s.x, u.y - s.y) < 5 * T && !sayList.some(x => x.v === u));
    if (!fan || Math.random() > .35) continue;
    sayList.push({ v:fan, txt:thPick([`¡Es ${s.name}! ¡Un autógrafo!`, `¡${s.name}! ¡Soy tu fan!`, `¿Tú no eres ${s.name}, el de ${s.star.what}?`]), think:false, t0:now, t1:now + 3200 });
    sayList.push({ v:s, txt:thPick(['¡Claro que sí!', 'Gracias, gracias', 'Ahora no, que tengo prisa']), think:false, t0:now + 1300, t1:now + 4200 });
    break;
  }
});
// ---- Dibujo: brillo de los famosos, letrero del cine, antena de radio y la tele por la noche ----
{ const base = drawPersonExtras; drawPersonExtras = function(v, x, y, s, now){
  if (v.star && v.star.fame >= 3 && zoom >= 2.5) { const k = (Math.floor(now / 220) + (v.uid || 0)) % 6, sy = y - s.height - 3; vctx.fillStyle = k < 3 ? '#ffd8f0' : '#fff2a0'; vctx.fillRect(x - 3 + k, sy - (k % 2), 1, 1); vctx.fillRect(x + 3 - k, sy - 1 + (k % 2), 1, 1); }
  return base.apply(this, arguments);
}; }
{ const base = drawInstFlags; drawInstFlags = function(t){
  const r = base.apply(this, arguments);
  const [vx0, vy0, vx1, vy1] = visibleRect(), now = performance.now(), night = typeof darkness === 'function' ? darkness() : 0;
  for (const g of villages) {
    if (!popOf(g) || g.fx * T < vx0 - 80 || g.fx * T > vx1 + 80 || g.fy * T < vy0 - 80 || g.fy * T > vy1 + 80) continue;
    // El cine: letrero con bombillas encima del teatro
    if (cineOn(g)) { const i = g.theater, x = (i % W) * T + 2, y = ((i / W) | 0) * T - 30; vctx.fillStyle = '#2a1a10'; vctx.fillRect(x - 10, y, 21, 7); vctx.fillStyle = '#c82a2a'; vctx.fillRect(x - 9, y + 1, 19, 5);
      vctx.fillStyle = '#fff2c0'; vctx.font = 'bold 4.5px sans-serif'; vctx.textAlign = 'center'; vctx.fillText('CINE', x + .5, y + 5.2); vctx.textAlign = 'start';
      for (let k = 0; k < 6; k++) { vctx.fillStyle = (Math.floor(now / 250) + k) % 2 ? '#ffe070' : '#8a6a30'; vctx.fillRect(x - 10 + k * 4, y - 1, 1, 1); } }
    // La antena de radio de la capital (con su luz roja)
    const n = nationOf(g); if (n === g && g.hall != null && n.media && n.media.radio.length) { const x = (g.hall % W) * T + 16, y = ((g.hall / W) | 0) * T + 2;
      vctx.strokeStyle = '#7a7a82'; vctx.lineWidth = .7; vctx.beginPath(); vctx.moveTo(x - 3, y); vctx.lineTo(x, y - 30); vctx.lineTo(x + 3, y); for (let k = 1; k < 5; k++) { const yy = y - k * 6; vctx.moveTo(x - 3 + k * .6, yy); vctx.lineTo(x + 3 - k * .6, yy); } vctx.stroke();
      if (Math.floor(now / 700) % 2) { vctx.fillStyle = '#ff3030'; vctx.fillRect(x - .5, y - 31.5, 1.5, 1.5); if (night > .2) { vctx.fillStyle = 'rgba(255,60,60,.3)'; vctx.fillRect(x - 2, y - 33, 4, 4); } } }
  }
  return r;
}; }
{ const base = drawNightLife; drawNightLife = function(now){
  base.apply(this, arguments);
  const k = typeof darkness === 'function' ? darkness() : 0; if (k < .25 || zoom < 1.5) return;
  const [vx0, vy0, vx1, vy1] = visibleRect();
  for (const g of villages) {
    if (!popOf(g) || !tvTown(g) || g.fx * T < vx0 - 120 || g.fx * T > vx1 + 120 || g.fy * T < vy0 - 120 || g.fy * T > vy1 + 120) continue;
    for (const h of g.houses) { const x = (h % W) * T, y = ((h / W) | 0) * T; if (x < vx0 || x > vx1 || y < vy0 || y > vy1 || (h * 7 + Math.floor(now / 2600)) % 3 === 0) continue;
      const f = .35 + .35 * Math.abs(Math.sin(now / 140 + h)); vctx.fillStyle = `rgba(120,170,255,${f * k})`; vctx.fillRect(x + 1, y - 5, 2, 2); }
  }
}; }
// ---- En la ficha del pueblo (con la prensa) y en Historia ----
function mediaCard(g){
  const n = nationOf(g), M = n.media, outs = M ? [...M.radio, ...M.tv] : [], films = (n.films || []).slice(-4).reverse();
  const famous = villagers.filter(u => !u.dead && u.star && u.star.fame >= 2 && nationOf(villageById(u.vid) || {}) === n).sort((a, b) => b.star.fame - a.star.fame).slice(0, 5);
  if (!outs.length && !films.length && !famous.length) return '';
  let h = '';
  if (outs.length) h += `<h4>Radio y televisión</h4><div class="md-list">${outs.map(o => `<div class="md-o"><span class="md-logo" style="background:${o.col}">${o.kind === 'radio' ? '📻' : '📺'}</span><div><b>${esc(o.name)}</b><span class="muted">${o.official ? 'del gobierno' : o.public ? 'pública' : o.party ? `afín a «${esc(o.party)}»` : sideOf(o.ideo)} · ${o.aud} ${o.kind === 'radio' ? 'oyentes' : 'espectadores'}${o.host ? ` · ${esc(o.host.name)} al ${o.kind === 'radio' ? 'micrófono' : 'frente'}` : ''}</span>${o.heads.length ? `<span class="md-h">«${esc(o.heads[o.heads.length - 1].txt)}»</span>` : ''}</div></div>`).join('')}</div>`;
  if (films.length) h += `<h4>Cartelera</h4><div class="md-list">${films.map(F => `<div class="md-f"><span class="md-gen">${esc(F.g)}</span><div><b>«${esc(F.t)}»</b><span class="muted">de ${esc(F.by)}, con ${esc(F.stars.join(' y '))} · día ${F.d} · ${F.box} entradas${F.exp.length ? ` · se ve en ${esc(F.exp.slice(0, 3).join(', '))}` : ''}</span></div></div>`).join('')}</div>`;
  if (famous.length) h += `<h4>Famosos</h4><div class="md-stars">${famous.map(u => `<button class="lnk" data-pid="${refOf(u)}">✨ ${esc(u.name)} <span class="muted">(${starJob(u)})</span></button>`).join('')}</div>`;
  return h;
}
{ const base = pressCard; pressCard = function(g){ return base.apply(this, arguments) + mediaCard(g); }; }
function showsHtml(){
  const F = worldFilms().slice(-10).reverse(), A = (world.awards || []).slice(-6).reverse();
  const stars = villagers.filter(u => !u.dead && u.star && u.star.fame >= 2).sort((a, b) => b.star.fame - a.star.fame).slice(0, 10);
  const nats = villages.filter(n => nationOf(n) === n && popOf(n) && n.media && (n.media.radio.length || n.media.tv.length));
  if (!F.length && !stars.length && !nats.length) return '<div class="muted" style="padding:10px">Aún no hay radio, televisión ni cine en el mundo: llegan con la electricidad y las telecomunicaciones.</div>';
  return `<div class="pw">${A.length ? `<h4>🏆 Premios Estrella de Oro</h4>${A.map(a => `<div class="gb-row"><span class="gb-k">Año ${a.y}</span><span class="gb-p"><span><b>«${esc(a.film)}»</b> (${esc(a.nat)}), de ${esc(a.by)}${a.actor ? ` · intérprete: ${esc(a.actor)}` : ''}</span></span></div>`).join('')}` : ''}
    ${F.length ? `<h4>🎬 Últimos estrenos</h4>${F.map(f => `<div class="gb-row"><span class="gb-k">${esc(f.natName)}</span><span class="gb-p"><span><b>«${esc(f.t)}»</b> · ${esc(f.g)} · de ${esc(f.by)} · ${f.box} entradas</span>${f.about ? `<span class="muted">Basada en: ${esc(f.about)}</span>` : ''}</span></div>`).join('')}` : ''}
    ${stars.length ? `<h4>✨ Los más famosos</h4>${stars.map((u, i) => `<div class="gb-row"><span class="gb-k">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.º'} ${esc(u.name)}</span><span class="gb-p"><span>${starJob(u)} de ${esc(u.star.what)} · ${esc((nationOf(villageById(u.vid) || {}) || {}).name || '')}</span></span></div>`).join('')}` : ''}
    ${nats.length ? `<h4>📺 Radio y televisión</h4>${nats.map(n => `<div class="gb-row"><span class="gb-k">${esc(n.name)}</span><span class="gb-p"><span>${[...n.media.radio, ...n.media.tv].map(o => `${o.kind === 'radio' ? '📻' : '📺'} ${esc(o.name)} (${o.aud})`).join(' · ')}</span></span></div>`).join('')}` : ''}</div>`;
}
{ const base = renderHistory; renderHistory = function(){
  const el = $('histPanel'); if (el && !el.hidden && histTab === 'espect') { el.querySelector('.hp-body').innerHTML = showsHtml(); return; }
  return base.apply(this, arguments);
}; }
