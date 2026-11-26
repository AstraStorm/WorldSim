// World Sim · Videojuegos y apps de redes sociales
// ================= Digital =================
// · Videojuegos (con los ordenadores y corriente): en cada nación nacen estudios (con nombre en su lengua y alguien que
//   los funda) que sacan juegos cada pocos días: de guerra sobre una guerra de verdad, de deportes con los Juegos, de
//   estrategia, simulación, aventura, plataformas... Venden en casa y en las naciones con ordenadores con las que se
//   llevan bien; dejan dinero y fama. Los jóvenes juegan en su tiempo libre (una consolita en la mano) y hablan de ellos.
//   Cada año, el «Juego del año»
// · Apps de redes sociales (con internet y móviles): cada nación puede lanzar la suya y compiten por los usuarios de todo
//   el mundo (la de casa tira más; con censura o en una dictadura solo se permite la nacional). La que gana se lleva
//   usuarios, dinero y fama para quien la fundó; si una app extranjera domina en un país, allí corren más bulos
const STUDIO_END = ['Soft', 'Games', 'Studio', 'Interactive', 'Bits', 'Play'];
const APP_ES = ['Pío', 'Chispa', 'Muro', 'Ola', 'Plaza', 'Corrillo', 'Faro', 'Eco', 'Charla', 'Vecinos'];
const GAME_GENRES = {
  guerra:[(p, n) => `La guerra de ${p}`, p => `${p}: Asalto final`, (p, n) => `Comandos de ${n.name}`],
  deportes:[(p, n) => `Fútbol ${n.name} ${Math.floor(yearT / (SEASON_LEN * 4)) + 1}`, p => `Carrera en ${p}`, () => 'Los Juegos: el videojuego oficial'],
  estrategia:[(p, n) => `Imperio de ${n.name}`, () => 'Civilizaciones', () => 'Reyes y coronas', () => 'El Consejo de las Naciones'],
  'simulación':[() => `Simulador de ${['granjero', 'alcalde', 'cartógrafo', 'tren', 'pastor', 'albañil'][Math.floor(Math.random() * 6)]}`, () => 'Mi pueblo', () => 'Granja feliz'],
  aventura:[p => `La leyenda de ${p}`, () => 'El mapa perdido', p => `Más allá de ${p}`],
  plataformas:[(p, n, h) => `Súper ${h}`, (p, n, h) => `Las aventuras de ${h}`, (p, n, h) => `${h} salta`],
  puzle:[() => 'Bloques', p => `Gemas de ${p}`, () => 'Tres en raya total'],
};
const brandWord = (n, ends) => { const L = langList()[villageLang(n)], P = L && L.phon; let w = P ? langWord(P, 2, Math.random) : 'nova'; w = capFirst(w.replace(/[aeiou]$/, '')); return ends ? w + ends[Math.floor(Math.random() * ends.length)] : w; };
const gamesOn = n => knowsSci(n, 'ordenadores') && natTowns(n).some(townPower);
const appsOn = n => knowsSci(n, 'internet') && knowsSci(n, 'moviles') && natTowns(n).some(g => typeof netOn === 'function' && netOn(g));
const worldGames = () => (world.games ||= []), worldApps = () => (world.apps ||= []);
if (typeof STAR_TXT !== 'undefined') { STAR_TXT.tech = ['fundador de una app', 'fundadora de una app']; STAR_TXT.juegos = ['creador de videojuegos', 'creadora de videojuegos']; }
const natAdults = n => villagers.filter(u => !u.dead && !u.away && ageOf(u) >= ADULT_H && nationOf(villageById(u.vid) || {}) === n && !locked(u));
// ---- Estudios y juegos ----
function gameTick(n, day){
  const S = n.studios ||= [];
  if (S.length < 2 && Math.random() < (S.length ? .12 : .35)) {
    const f = natAdults(n).filter(u => !u.star).sort((a, b) => ((b.edu || 0) + trait(b, 'ambicion')) - ((a.edu || 0) + trait(a, 'ambicion')))[0];
    if (f) { const st = { name:brandWord(n, STUDIO_END), by:f.name, founder:f, since:day + 1, games:0, sales:0 }; S.push(st); makeStar(f, 'juegos', st.name);
      notify(`🎮 En ${n.name} nace el estudio de videojuegos ${st.name}, fundado por ${f.name}`, { x:n.fx * T, y:n.fy * T }); }
  }
  for (const st of S) {
    if (day - (st.lastD ?? -99) < 2 + Math.floor(Math.random() * 3) || Math.random() < .4) continue;
    st.lastD = day;
    const war = [...rels.values()].find(r => r.war && (r.war.att === n.id || r.war.def === n.id)), hero = villagers.find(u => !u.dead && u.hero && nationOf(villageById(u.vid) || {}) === n);
    const genre = war && Math.random() < .4 ? 'guerra' : olymp.cur && Math.random() < .5 ? 'deportes' : Object.keys(GAME_GENRES)[Math.floor(Math.random() * 7)];
    const towns = natTowns(n), place = war ? (villageById(war.att === n.id ? war.def : war.att) || n).name : towns[Math.floor(Math.random() * towns.length)].name, hn = hero ? hero.name.split(' ')[0] : brandWord(n);
    const T0 = GAME_GENRES[genre], title = T0[Math.floor(Math.random() * T0.length)](place, n, hn);
    const q = clamp(.2 + Math.random() * .5 + ((st.founder && st.founder.edu) || 0) * .2 + Math.min(.15, st.games * .02), .05, 1);
    const G0 = { t:title, g:genre, studio:st.name, nat:n.id, natName:n.name, d:day + 1, y:Math.floor(yearT / (SEASON_LEN * 4)) + 1, q, sales:0, exp:[] };
    st.games++; worldGames().push(G0); if (worldGames().length > 40) worldGames().shift();
    notify(`🎮 ${st.name} (${n.name}) lanza «${title}», un juego de ${genre}`, { x:n.fx * T, y:n.fy * T });
  }
  // Ventas de los juegos recientes (en casa y en las naciones amigas con ordenadores) y quién juega
  const young = villagers.filter(u => !u.dead && nationOf(villageById(u.vid) || {}) === n && townPower(villageById(u.vid)) && ageOf(u) < (u.life || 20) * .4);
  const mine = worldGames().filter(G0 => G0.nat === n.id && day + 1 - G0.d <= 4);
  for (const G0 of mine) {
    let s = young.length * .3 * (.4 + G0.q);
    for (const o of villages) { if (nationOf(o) !== o || o === n || !popOf(o) || !gamesOn(o)) continue; const r = relOf(n, o); if (r.war || r.v < 0) continue; if (G0.q > .5 || Math.random() < .3) { s += natTowns(o).reduce((a, g) => a + popOf(g), 0) * .08 * G0.q; if (!G0.exp.includes(o.name)) G0.exp.push(o.name); } }
    s = Math.round(s); G0.sales += s; const st = S.find(x => x.name === G0.studio); if (st) { st.sales += s; if (st.founder && st.founder.star) st.founder.star.fame += s / 80; }
    if (n.coin && typeof ecOf === 'function') ecOf(n).treas += s * (ecOf(n).P || 1) * .03;
  }
  const pool = worldGames().filter(G0 => (G0.nat === n.id || G0.exp.includes(n.name)) && day + 1 - G0.d <= 8);
  for (const u of young) if (pool.length && Math.random() < .5) { u.gamer = pool.slice().sort((a, b) => b.q - a.q + (Math.random() - .5) * .4)[0].t; u.gameT = yearT; }
}
// ---- Apps de redes sociales ----
function appTick(n, day){
  const A = worldApps();
  if (!A.some(a => a.nat === n.id) && Math.random() < .25) {
    const f = natAdults(n).filter(u => !u.star || u.star.k === 'redes').sort((a, b) => ((b.edu || 0) + trait(b, 'ambicion') + trait(b, 'sociable') * .5) - ((a.edu || 0) + trait(a, 'ambicion') + trait(a, 'sociable') * .5))[0];
    if (f) { const name = Math.random() < .5 ? APP_ES[Math.floor(Math.random() * APP_ES.length)] + (A.some(a => a.name.startsWith(APP_ES[0])) ? 'Pro' : '') : brandWord(n, ['gram', 'ly', 'er', 'ia', 'app', '']);
      const app = { name:A.some(a => a.name === name) ? name + ' ' + n.name : name, nat:n.id, natName:n.name, by:f.name, founder:f, d:day + 1, q:clamp(.3 + Math.random() * .5 + (f.edu || 0) * .2, .1, 1), users:{}, total:0 };
      A.push(app); makeStar(f, 'tech', `«${app.name}»`);
      notify(`📲 ${f.name} lanza en ${n.name} la app «${app.name}»: una red social para compartir fotos y opiniones`, { x:n.fx * T, y:n.fy * T }); }
  }
}
// Cada día: los usuarios de cada nación con redes se reparten entre las apps
function appUsers(){
  const A = worldApps(); if (!A.length) return;
  for (const a of A) { a.users = {}; a.total = 0; }
  for (const n of villages) {
    if (nationOf(n) !== n || !popOf(n) || !appsOn(n)) continue;
    const users = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H * .6 && nationOf(villageById(u.vid) || {}) === n && netOn(villageById(u.vid))).length; if (!users) continue;
    const closed = (typeof pressFree === 'function' && !pressFree(n)), opts = A.filter(a => !closed || a.nat === n.id); if (!opts.length) continue;
    if (closed && A.some(a => a.nat !== n.id) && !n.appBan) { n.appBan = true; notify(`📵 ${n.name} prohíbe las apps extranjeras: solo se puede usar la nacional`, { x:n.fx * T, y:n.fy * T }); }
    if (!closed) n.appBan = false;
    const w = opts.map(a => (a.nat === n.id ? 2 : 1) * a.q * (1 + Math.log10(1 + (a.prev || 0)))), tw = w.reduce((x, y) => x + y, 0);
    opts.forEach((a, i) => { const c = Math.round(users * w[i] / tw); a.users[n.id] = c; a.total += c; });
    const top = opts[w.indexOf(Math.max(...w))]; n.topApp = top.name; n.appForeign = top.nat !== n.id;
  }
  const all = A.reduce((x, a) => x + a.total, 0);
  for (const a of A) {
    a.prev = a.total; const own = villageById(a.nat);
    if (own && own.coin && typeof ecOf === 'function') ecOf(own).treas += a.total * (ecOf(own).P || 1) * .02;
    if (a.founder && !a.founder.dead && a.founder.star) { a.founder.star.fame += Math.log10(1 + a.total); a.founder.money = (a.founder.money || 0) + Math.round(a.total / 10); }
    if (all > 40 && a.total / all > .6 && !a.mono) { a.mono = true; notify(`📲 «${a.name}», la app de ${a.natName}, ya la usa ${Math.round(a.total / all * 100)} % de la gente conectada del mundo`, own ? { x:own.fx * T, y:own.fy * T } : { x:0, y:0 }); }
  }
}
// Con la app de otro país dominando, corren más bulos (la otra nación no los controla)
let digClock = 0;
SYSTEMS.push(dt => {
  if ((digClock -= dt) > 0 || !villages.length) return; digClock = 7;
  const day = Math.floor(yearT / DAY_LEN);
  for (const n of villages) {
    if (nationOf(n) !== n || !popOf(n) || n.digDay === day) continue; n.digDay = day;
    if (gamesOn(n)) gameTick(n, day);
    if (appsOn(n)) { appTick(n, day); if (n.appForeign && typeof buloTick === 'function' && Math.random() < .3) buloTick(n, natTowns(n).filter(netOn)); }
  }
  if (world.appDay !== day) { world.appDay = day; appUsers(); gameAwards(); }
});
// Juego del año
function gameAwards(){
  const Y = Math.floor(yearT / (SEASON_LEN * 4)) + 1; if ((world.gameAwardY ?? Y) === Y) { world.gameAwardY = Y; return; }
  const prev = world.gameAwardY; world.gameAwardY = Y;
  const pool = worldGames().filter(G0 => G0.y === prev); if (!pool.length) return;
  const best = pool.slice().sort((a, b) => (b.q * 2 + b.sales / 300) - (a.q * 2 + a.sales / 300))[0];
  (world.gameAwards ||= []).push({ y:prev, t:best.t, studio:best.studio, nat:best.natName });
  const n = villageById(best.nat); notify(`🏆 Juego del año ${prev}: «${best.t}», de ${best.studio} (${best.natName}), con ${best.sales} copias vendidas`, n ? { x:n.fx * T, y:n.fy * T } : { x:0, y:0 });
}
// ---- Ánimo, pensamientos y la consolita ----
{ const base = socialMood; socialMood = function(v, g, add){
  base(v, g, add); if (v.gamer && yearT - (v.gameT || -1e9) < DAY_LEN * 2) add(3, 'juega a videojuegos');
}; }
if (typeof TH_MOOD !== 'undefined') TH_MOOD.unshift([/^juega a videojuegos$/, (m, v) => [`¡Me he pasado el nivel 3 de «${v.gamer}»!`, 'Cinco minutos más y lo dejo', `¿Echamos una partida a «${v.gamer}»?`]]);
{ const base = thoughtOf; thoughtOf = function(v){
  const g = villageById(v.vid), n = g && nationOf(g);
  if (n && n.topApp && !v.sleep && Math.random() < .05 && ageOf(v) >= ADULT_H * .6 && netOn(g)) return { txt:thPick([`Lo he subido a «${n.topApp}»`, `¿Me sigues en «${n.topApp}»?`, `En «${n.topApp}» dicen que...`]), mood:0, think:false };
  return base.apply(this, arguments);
}; }
{ const base = drawPersonExtras; drawPersonExtras = function(v, x, y, s, now){
  if (zoom >= 3 && v.gamer && yearT - (v.gameT || -1e9) < DAY_LEN && v.task && ['ocio', 'pasear'].includes(v.task.k === 'trabajando' ? v.task.job : v.task.k) && ((v.uid || 0) + Math.floor(now / 5000)) % 2 === 0) {
    const px = x + v.dir * 2 - 1, py = y - Math.round(s.height * .4); vctx.fillStyle = '#3a3a48'; vctx.fillRect(px, py, 4, 2); vctx.fillStyle = (Math.floor(now / 200) % 3) ? '#7af07a' : '#f0e070'; vctx.fillRect(px + 1, py, 2, 1);
  }
  return base.apply(this, arguments);
}; }
// ---- En la ficha y en Historia > Espectáculos ----
{ const base = mediaCard; mediaCard = function(g){
  const h = base.apply(this, arguments), n = nationOf(g), S = n.studios || [], apps = worldApps().filter(a => a.nat === n.id);
  if (!S.length && !apps.length && !n.topApp) return h;
  return h + `<h4>Videojuegos y apps</h4><div class="md-list">${S.map(st => `<div class="md-o"><span class="md-logo" style="background:#5a4a8a">🎮</span><div><b>${esc(st.name)}</b><span class="muted">estudio fundado por ${esc(st.by)} · ${st.games} juego${st.games === 1 ? '' : 's'} · ${st.sales} copias</span></div></div>`).join('')}${apps.map(a => `<div class="md-o"><span class="md-logo" style="background:#2a7ac8">📲</span><div><b>«${esc(a.name)}»</b><span class="muted">de ${esc(a.by)} · ${a.total} usuarios en el mundo</span></div></div>`).join('')}${n.topApp ? `<div class="muted" style="font-size:12px">La app que más se usa aquí: «${esc(n.topApp)}»${n.appForeign ? ' (extranjera)' : ''}${n.appBan ? ' · las extranjeras están prohibidas' : ''}</div>` : ''}</div>`;
}; }
{ const base = showsHtml; showsHtml = function(){
  const h = base.apply(this, arguments), G0 = worldGames().slice(-6).reverse(), A = worldApps().slice().sort((a, b) => b.total - a.total).slice(0, 6), all = Math.max(1, worldApps().reduce((x, a) => x + a.total, 0)), GA = (world.gameAwards || []).slice(-3).reverse();
  if (!G0.length && !A.length) return h;
  const extra = `${A.length ? `<h4>📲 Apps de redes sociales</h4>${A.map(a => `<div class="gb-row"><span class="gb-k">«${esc(a.name)}»</span><span class="gb-p"><span>${esc(a.natName)} · ${a.total} usuarios (${Math.round(a.total / all * 100)} %)</span><span class="pw-bar"><i style="width:${Math.round(a.total / all * 100)}%;background:#4a9ae0"></i></span></span></div>`).join('')}` : ''}
    ${GA.length ? `<h4>🏆 Juego del año</h4>${GA.map(a => `<div class="gb-row"><span class="gb-k">Año ${a.y}</span><span class="gb-p"><span><b>«${esc(a.t)}»</b>, de ${esc(a.studio)} (${esc(a.nat)})</span></span></div>`).join('')}` : ''}
    ${G0.length ? `<h4>🎮 Últimos videojuegos</h4>${G0.map(x => `<div class="gb-row"><span class="gb-k">${esc(x.natName)}</span><span class="gb-p"><span><b>«${esc(x.t)}»</b> · ${esc(x.g)} · ${esc(x.studio)} · ${x.sales} copias</span></span></div>`).join('')}` : ''}`;
  return h.startsWith('<div class="pw">') ? h.replace(/<\/div>$/, extra + '</div>') : `<div class="pw">${extra}</div>`;
}; }
