// Forja de Mundos · Deportes: campo de fútbol, piscina y pista de atletismo; clubes de fútbol con escudo, entrenos y partidos
// ================= Deportes =================
// · Instalaciones (se construyen como ocio, con madera y piedra): campo de fútbol, piscina y pista de atletismo
// · Piscina: quien no sabe nadar aprende, y los nadadores ganan velocidad en el agua
// · Pista de atletismo: los atletas mejoran sus cualidades físicas (más rápidos andando y aguantan mejor el frío y el
//   calor); en ella se celebran los Juegos, que ahora son cada año
// · Fútbol: con campo, el pueblo funda un club con su nombre y su escudo; el equipo son 3 titulares, 1 suplente en el
//   banquillo y 1 entrenador. Entrenan cada dos días y juegan partidos contra los clubes de otras naciones con las que
//   se llevan bien (los visitantes vienen a jugar y vuelven a casa); en el descanso entra el suplente
// · Categorías: infantil, juvenil, absoluta y veteranos, según la edad de cada deportista
const SPORT_NAME = { futbol:'Fútbol', natacion:'Natación', atletismo:'Atletismo' };
const SPORT_DIMS = { futbol:[15, 8], natacion:[13, 6], atletismo:[16, 8] }; // (a la medida de los dibujos del atlas)
const sportsOf = g => ({ futbol:g.pitch || null, natacion:g.pool || null, atletismo:g.track || null });
const sportCat = v => { const a = ageOf(v), L = v.life || 20; return a < ADULT_H ? 'infantil' : a < L * .3 ? 'juvenil' : a > L * .62 ? 'veteranos' : 'absoluta'; };
const SPORT_CATS = ['infantil', 'juvenil', 'absoluta', 'veteranos'];
// Un sitio libre para una instalación (como el de la pista de atletismo)
function sportSite(g, w, h){
  for (let k = 0; k < 700; k++) { // primero cerca; si no cabe, en las afueras (y con sitio por arriba para las gradas)
    const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * (k < 200 ? 18 : k < 450 ? 36 : 55), x0 = Math.round(g.fx + Math.cos(a) * d - w / 2), y0 = Math.round(g.fy + Math.sin(a) * d * .8 - h / 2);
    if (x0 < 2 || y0 < 2 || x0 + w >= W - 2 || y0 + h >= H - 2) continue;
    let ok = !plotIn(x0 - 1, y0 - 1, x0 + w, y0 + h) && !holyNear(x0, y0, x0 + w - 1, y0 + h - 1) && !penOverlap(null, x0, y0, x0 + w - 1, y0 + h - 1) && !volcDanger(x0, y0);
    for (let y = y0 - 3; ok && y < y0 + h; y++) for (let x = x0; ok && x < x0 + w; x++) { const i = y * W + x, o = world.objs[i]; if (WATER[world.biome[i]] || world.biome[i] === B.LAVA || pathMap.has(i) || plazaSet.has(i) || farmMap.has(i) || wallSet.has(i) || bridgeSet.has(i) || underBuilding(g, x, y) || (o && !['tree', 'berry', 'stone'].includes(OBJ[o.key][1]))) ok = false; }
    if (ok) return { x0, y0, w, h };
  }
  return null;
}
const SPORT_COST = { futbol:{ wood:12, stone:0, pop:12 }, natacion:{ wood:8, stone:12, pop:15 }, atletismo:{ wood:4, stone:10, pop:18 } };
// Trabajo: construir la instalación que falte (como ocio, desde chooseJob)
function sportsJobs(v, g, add){
  const pop = popOf(g), S = sportsOf(g), law = hasLaw(g, 'deporte');
  const k = ['futbol', 'natacion', 'atletismo'].find(s => !S[s] && pop >= SPORT_COST[s].pop * (law ? .75 : 1) && g.wood >= SPORT_COST[s].wood + 6 && (g.stone || 0) >= SPORT_COST[s].stone);
  if (!k || busyWith(g, 'instalacion') >= 2 || (g.sportFailT && yearT - g.sportFailT < DAY_LEN)) return;
  add('instalacion', law ? 7 : 3);
}
function sportBuildTarget(v, g){
  const S = sportsOf(g), pop = popOf(g), law = hasLaw(g, 'deporte');
  const k = ['futbol', 'natacion', 'atletismo'].find(s => !S[s] && pop >= SPORT_COST[s].pop * (law ? .75 : 1)); if (!k) return null;
  if (!g.sportPlan || g.sportPlan.k !== k) { g.sportPlan = null; const [w, h] = SPORT_DIMS[k], r = sportSite(g, w, h); if (!r) { g.sportFailT = yearT; return null; } g.sportPlan = { k, ...r }; }
  const P = g.sportPlan; return { k:'instalacion', x:(P.x0 + P.w / 2) * T, y:(P.y0 + P.h) * T + 2 };
}
function sportBuildArrive(v, g, t){
  v.actT = 12; v.onDone = () => {
    const P = g.sportPlan; if (!P) return; const C = SPORT_COST[P.k]; g.sportPlan = null; // (el solar reservado no cuenta como ocupado)
    if (g.wood < C.wood || (g.stone || 0) < C.stone || plotIn(P.x0, P.y0, P.x0 + P.w - 1, P.y0 + P.h - 1)) return;
    g.wood -= C.wood; g.stone -= C.stone; clearSite(g, P.x0, P.y0, P.x0 + P.w - 1, P.y0 + P.h - 1);
    const r = { x0:P.x0, y0:P.y0, w:P.w, h:P.h };
    if (P.k === 'futbol') g.pitch = r; else if (P.k === 'natacion') g.pool = r; else { g.track = r; g.trackMsg = true; }
    composeRegion(P.x0 - 8, P.y0 - 12, P.x0 + P.w + 8, P.y0 + P.h + 12);
    notify(`${g.name} inaugura ${P.k === 'futbol' ? 'un campo de fútbol' : P.k === 'natacion' ? 'una piscina: ahí aprenderán a nadar' : 'una pista de atletismo'}`, { x:(P.x0 + P.w / 2) * T, y:(P.y0 + P.h / 2) * T });
  };
  return true;
}
// Ocio deportivo (desde la lista de ocio de chooseJob): nadar en la piscina, correr en la pista
function sportsLeisure(v, g, J){
  const law = hasLaw(g, 'deporte') ? 1.5 : 1;
  if (g.pool) J.push(['nadar', (v.swims === false ? 5 : 2) * law]);
  if (g.track && !olymp.cur) J.push(['correr', 2 * law]);
}
function sportTarget(v, g, job){
  if (job === 'nadar' && g.pool) { const p = g.pool, a = artRect(p, 'sport:natacion', .14, .68, .5, .78) || { x0:p.x0 + 1.5, x1:p.x0 + p.w - 1.5, y0:p.y0 + 1.5, y1:p.y0 + p.h - 1.5 }; return { k:'nadar', x:(a.x0 + Math.random() * (a.x1 - a.x0)) * T, y:(a.y0 + Math.random() * (a.y1 - a.y0)) * T }; }
  if (job === 'correr' && g.track) { const [x, y] = trackPoint(g.track, Math.random(), Math.floor(Math.random() * 4)); return { k:'correr', x, y }; }
  return null;
}
function sportArrive(v, g, t){
  if (t.k === 'nadar') {
    v.actT = 7 + Math.random() * 4; v.onDone = () => {
      if (v.swims === false) { v.swims = true; floats.push({ x:v.x, y:v.y - 12, txt:'¡ya sabe nadar!', col:'#9cd0f8', life:0 }); if (!g.swimMsg) { g.swimMsg = true; notify(`En ${g.name} la gente aprende a nadar en la piscina`, { x:v.x, y:v.y }); } }
      v.swimFit = Math.min(1, (v.swimFit || 0) + .05); (v.sports ||= {}).natacion = (v.sports.natacion || 0) + 1; v.fun = yearT;
    };
  } else {
    v.actT = 3; v.lap = (v.lap || 0) + 1; v.onDone = () => { // da vueltas a la pista: unas cuantas carreras y descansa
      v.fit = Math.min(1, (v.fit || 0) + .04); (v.sports ||= {}).atletismo = (v.sports.atletismo || 0) + 1; v.fun = yearT;
      if (g.track && v.lap % 4) { const [x, y] = trackPoint(g.track, Math.random(), Math.floor(Math.random() * 4)); v.task = { k:'correr', x, y }; }
    };
  }
  return true;
}
// ---- Clubes de fútbol ----
const CLUB_PRE = ['Atlético', 'Deportivo', 'Unión', 'Sporting', 'Racing', 'Club', 'Real', 'Juventud', 'Estrella', 'Olímpico'];
const CREST_ICONS = { estrella:['..#..', '.###.', '#####', '.#.#.', '#...#'], balon:['.###.', '#.#.#', '##.##', '#.#.#', '.###.'], corona:['#.#.#', '#####', '#####', '.....', '#####'],
  torre:['#.#.#', '#####', '.###.', '.#.#.', '.###.'], ola:['.....', '.#..#', '#.##.', '.....', '#####'], monte:['..#..', '.###.', '.#.#.', '#...#', '#####'], rayo:['...##', '..##.', '.###.', '.##..', '##...'] };
function makeClub(g){
  const n = nationOf(g), pre = regimeOf(n).startsWith('monarqu') ? 'Real' : CLUB_PRE[Math.floor(Math.random() * CLUB_PRE.length)];
  const name = Math.random() < .25 ? `${g.name} F.C.` : `${pre} ${g.name}`, c1 = villageColor(n), hue = Math.random();
  const c2 = Math.random() < .5 ? [244, 240, 232] : [Math.round(127 + 127 * Math.cos(hue * 6.28)), Math.round(127 + 127 * Math.cos(hue * 6.28 + 2.1)), Math.round(127 + 127 * Math.cos(hue * 6.28 + 4.2))];
  const icons = Object.keys(CREST_ICONS);
  g.club = { name, c1, c2, shape:Math.floor(Math.random() * 3), pat:Math.floor(Math.random() * 4), icon:icons[Math.floor(Math.random() * icons.length)], founded:Math.floor(yearT / DAY_LEN) + 1,
    players:[], bench:null, coach:null, w:0, d:0, l:0, gf:0, ga:0, res:[], trainT:DAY_LEN, matchT:DAY_LEN * 2 };
  notify(`Se funda el club de fútbol ${name} en ${g.name}`, { x:g.fx * T, y:g.fy * T });
}
// El escudo, en píxeles (se guarda la imagen para no pintarlo cada vez)
const crestCache = new Map();
function crestCanvas(C){
  const key = `${C.name}|${C.c1}|${C.c2}|${C.shape}|${C.pat}|${C.icon}`; let cv = crestCache.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 16; cv.height = 19; const x = cv.getContext('2d');
  const inside = (px, py) => C.shape === 1 ? Math.hypot(px - 7.5, py - 9) <= 7.6 : C.shape === 2 ? px >= 1 && px <= 14 && py >= 1 && py <= 17 && !((px < 3 || px > 12) && (py < 3)) : py <= 10 ? px >= 1 && px <= 14 && py >= 1 : Math.abs(px - 7.5) <= 6.5 - (py - 10) * .8;
  const col = c => `rgb(${c[0]},${c[1]},${c[2]})`, dark = c => `rgb(${c[0] * .35 | 0},${c[1] * .35 | 0},${c[2] * .35 | 0})`;
  for (let py = 0; py < 19; py++) for (let px = 0; px < 16; px++) {
    if (!inside(px, py)) continue;
    const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
    const second = C.pat === 0 ? px >= 8 : C.pat === 1 ? py >= 7 && py <= 11 : C.pat === 2 ? px + py > 17 : (px >> 1) % 2 === 1;
    x.fillStyle = edge ? '#1a1408' : col(second ? C.c2 : C.c1); x.fillRect(px, py, 1, 1);
  }
  const ic = CREST_ICONS[C.icon] || CREST_ICONS.estrella, light = (C.c1[0] + C.c1[1] + C.c1[2]) > 450 ? dark(C.c1) : '#f8f0d8';
  ic.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === '#') { x.fillStyle = light; x.fillRect(5 + rx, 6 + ry, 1, 1); } }));
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(3, 2, 4, 1);
  crestCache.set(key, cv); return cv;
}
const crestUrl = C => { const cv = crestCanvas(C); return cv._url ||= cv.toDataURL(); };
const byPid = p => p == null ? null : villagers.find(u => !u.dead && u.pid === p) || null;
// Plantilla: 3 titulares, 1 suplente y 1 entrenador (los mejores en forma; el entrenador, alguien con años)
function clubRoster(g, people){
  const C = g.club, ok = u => u && !u.dead && u.vid === g.id && !u.away && u !== g.leader && ageOf(u) >= ADULT_H && ageOf(u) < (u.life || 20) * .55;
  C.players = C.players.filter(p => ok(byPid(p))); if (C.bench != null && !ok(byPid(C.bench))) C.bench = null;
  const coach = byPid(C.coach); if (!coach || coach.vid !== g.id) C.coach = null;
  const used = new Set([...C.players, C.bench, C.coach]), cand = people.filter(u => ok(u) && !used.has(pidOf(u))).sort((a, b) => (b.fit || 0) - (a.fit || 0) || ageOf(a) - ageOf(b));
  while (C.players.length < 3 && cand.length) { const u = cand.shift(); C.players.push(pidOf(u)); (u.sports ||= {}).futbol = u.sports.futbol || 1; }
  if (C.bench == null && cand.length) { const u = cand.shift(); C.bench = pidOf(u); (u.sports ||= {}).futbol = u.sports.futbol || 1; }
  if (C.coach == null) { const u = people.filter(u => ageOf(u) >= (u.life || 20) * .45 && !used.has(pidOf(u)) && u !== g.leader && !u.away).sort((a, b) => (b.edu || 0) - (a.edu || 0))[0]; if (u) C.coach = pidOf(u); }
}
// El césped donde se juega: con el dibujo del estadio, su campo (arriba en el centro); sin él, todo el solar
const artRect = (p, k, fx0, fx1, fy0, fy1) => { const f = ART_MAP[k]; if (!f || !ART.ready) return null; const [, , w, h] = f, left = (p.x0 + p.w / 2) * T - w / 2, top = (p.y0 + p.h) * T - h; return { x0:(left + w * fx0) / T, x1:(left + w * fx1) / T, y0:(top + h * fy0) / T, y1:(top + h * fy1) / T }; };
const pitchRect = p => { const a = artRect(p, 'sport:futbol', .24, .76, .33, .54); return a ? { x0:Math.round(a.x0), x1:Math.round(a.x1), y0:Math.round(a.y0), y1:Math.round(a.y1) } : { x0:p.x0 + 1, y0:p.y0 + 1, x1:p.x0 + p.w - 2, y1:p.y0 + p.h - 2 }; };
const freeFor = u => u && !u.dead && !u.away && !u.boat && !u.sleep && !(u.task && ['asalto', 'jugar', 'atleta', 'detenido', 'votar', 'golpe'].includes(u.task.k));
function coachTo(u, p, until){ releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'espectador', x:(p.x0 + p.w / 2) * T, y:(p.y0 + p.h) * T + 3, until }; }
// Entreno: los cuatro juegan en su campo y el entrenador mira desde la banda
function startTraining(g){
  const C = g.club, ps = [...C.players, C.bench].map(byPid).filter(freeFor); if (ps.length < 3 || ballGames.some(b => b.vid === g.id)) return false;
  const r = pitchRect(g.pitch), until = yearT + 35;
  for (const u of ps) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'jugar', until }; }
  const co = byPid(C.coach); if (freeFor(co)) coachTo(co, g.pitch, until);
  ballGames.push({ vid:g.id, ps, x:(r.x0 + r.x1) / 2 * T + 2, y:(r.y0 + r.y1) / 2 * T + 3, vx:0, vy:0, r, until, goals:[0, 0], train:true });
  return true;
}
// Partido: el equipo visitante viene al campo del local; en el descanso entra el suplente de cada uno
function startMatch(home, away){
  if (!home.club || !away.club || !home.pitch) return false;
  const H0 = home.club, A0 = away.club, hs = H0.players.map(byPid).filter(freeFor), as = A0.players.map(byPid).filter(freeFor);
  if (hs.length < 2 || as.length < 2 || ballGames.some(b => b.vid === home.id)) return false;
  const r = pitchRect(home.pitch), until = yearT + 50, teams = new Map(), cx = (r.x0 + r.x1) / 2 * T, cy = (r.y0 + r.y1) / 2 * T;
  for (const u of as) { u.matchHome = [u.x, u.y]; u.x = cx + 10 + Math.random() * 6; u.y = cy + (Math.random() - .5) * 10; }
  for (const u of [...hs, ...as]) { releaseTask(u); dismount(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'jugar', until }; teams.set(u, as.includes(u) ? 1 : 0); }
  for (const [c, side] of [[H0, -1], [A0, 1]]) { // banquillo y entrenadores, en la banda
    for (const p of [c.bench, c.coach]) { const u = byPid(p); if (!freeFor(u)) continue; if (c === A0) u.matchHome = [u.x, u.y]; releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.x = c === A0 ? cx + side * 14 : u.x; u.y = c === A0 ? (r.y1 + 2) * T : u.y; u.task = { k:'espectador', x:cx + side * (p === c.coach ? 18 : 12), y:(r.y1 + 2) * T + 2, until }; }
  }
  // Público del pueblo local, alrededor del campo
  const off = payTickets(home, villagers.filter(u => !u.dead && u.vid === home.id && freeFor(u) && !teams.has(u) && (!u.task || ['ocio', 'pasear'].includes(u.task.k) || !inShift(home))).slice(0, 12), 'partido', H0);
  for (const u of off) { const a = Math.random() * Math.PI * 2; releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'espectador', x:cx + Math.cos(a) * (home.pitch.w * T / 2 + 6), y:cy + Math.sin(a) * (home.pitch.h * T / 2 + 5), until }; }
  ballGames.push({ vid:home.id, ps:[...hs, ...as], teams, x:cx + 2, y:cy + 3, vx:0, vy:0, r, until, goals:[0, 0], match:{ home:home.id, away:away.id } });
  notify(`¡Partido! ${H0.name} contra ${A0.name}, en el campo de ${home.name}`, { x:cx, y:cy }); snd('horn', cx, cy);
  return true;
}
// Descanso: entra el suplente por el más cansado (desde updateBallGames)
function matchSub(b){
  b.subbed = true;
  for (const [g, side] of [[villageById(b.match.home), 0], [villageById(b.match.away), 1]]) {
    if (!g || !g.club) continue; const sub = byPid(g.club.bench); if (!sub || sub.dead || b.ps.includes(sub)) continue;
    const out = b.ps.filter(u => b.teams.get(u) === side)[0]; if (!out) continue;
    b.ps[b.ps.indexOf(out)] = sub; b.teams.delete(out); b.teams.set(sub, side);
    sub.task = { k:'jugar', until:b.until }; out.task = { k:'espectador', x:sub.x, y:sub.y, until:b.until };
    floats.push({ x:sub.x, y:sub.y - 12, txt:`entra ${sub.name.split(' ')[0]}`, col:'#c8f0a0', life:0 });
  }
}
// Final de entreno o de partido (desde updateBallGames)
function ballGameEnd(b){
  if (b.train) { for (const u of b.ps) if (!u.dead) u.fit = Math.min(1, (u.fit || 0) + .05); return; }
  if (!b.match) return;
  const home = villageById(b.match.home), away = villageById(b.match.away); if (!home || !away || !home.club || !away.club) return;
  const [gh, ga] = b.goals, H0 = home.club, A0 = away.club, day = Math.floor(yearT / DAY_LEN) + 1;
  H0.gf += gh; H0.ga += ga; A0.gf += ga; A0.ga += gh;
  if (gh > ga) { H0.w++; A0.l++; } else if (gh < ga) { A0.w++; H0.l++; } else { H0.d++; A0.d++; }
  const txt = `${H0.name} ${gh} – ${ga} ${A0.name}`;
  for (const c of [H0, A0]) { c.res.push({ txt, d:day }); if (c.res.length > 8) c.res.shift(); }
  for (const c of [H0, A0]) { const team = [...c.players, c.bench, c.coach].map(byPid).filter(u => u && !u.dead), pay = Math.floor((c.cash || 0) * .5 / Math.max(1, team.length)); if (pay > 0) { for (const u of team) u.money = (u.money || 0) + pay; c.cash -= pay * team.length; } } // sueldos del club
  for (const u of villagers) if (u.matchHome && !u.dead) { const [x, y] = u.matchHome; u.matchHome = null; u.x = x; u.y = y; if (u.task && ['jugar', 'espectador'].includes(u.task.k)) u.task = null; }
  const r = relOf(home, away); r.known = true; r.v = Math.min(100, r.v + (gh === ga ? 4 : 2));
  const win = gh > ga ? home : gh < ga ? away : null, lose = win === home ? away : win === away ? home : null;
  if (win) { sportResult(win, 6, `su equipo, el ${win.club.name}, ganó a ${lose.club.name}`); sportResult(lose, -5, `su equipo, el ${lose.club.name}, perdió contra ${win.club.name}`); }
  else for (const g of [home, away]) sportResult(g, 1, `su equipo empató con ${(g === home ? away : home).club.name}`);
  notify(`Final del partido: ${txt}${win ? ` · ¡gana ${win.club.name}!` : ' · empate'}`, { x:b.x, y:b.y }); snd('cheer', b.x, b.y);
  for (const g of [home, away]) (g.log ||= []).push({ d:day, txt:`Fútbol: ${txt}` });
}
// Cada poco, en cada pueblo (desde el ciclo de los pueblos)
function sportsTick(g, dt, people){
  if ((g.sportT = (g.sportT ?? Math.random() * 10) - dt) > 0) return; g.sportT = 10;
  for (const u of people) if (u.matchHome && !ballGames.some(b => b.ps.includes(u))) { [u.x, u.y] = u.matchHome; u.matchHome = null; } // (si se cortó un partido, vuelven a casa)
  ticketPolicyTick(g); // el precio de las entradas
  if (!g.pitch) return;
  if (!g.club) { if (popOf(g) >= 12) makeClub(g); return; }
  clubRoster(g, people); const C = g.club, law = hasLaw(g, 'deporte');
  if ((C.trainT -= 10) <= 0 && !isNight()) { if (startTraining(g)) C.trainT = DAY_LEN * (law ? 1.3 : 2); else C.trainT = 30; }
  if ((C.matchT -= 10) <= 0 && !isNight() && !olymp.cur) {
    C.matchT = 60;
    const rivals = villages.filter(o => o !== g && popOf(o) && o.club && o.pitch && nationOf(o) !== nationOf(g)).filter(o => { const r = rels.get(relKey(g, o)); return r && r.known && !r.war && (r.v > 10 || hasTreaty(r, 'deporte')) && !sanctionedPair(g, o); });
    const o = rivals[Math.floor(Math.random() * rivals.length)];
    if (o && startMatch(g, o)) { C.matchT = DAY_LEN * (2.5 + Math.random() * 2); o.club.matchT = Math.max(o.club.matchT, DAY_LEN * 1.5); }
  }
}
// ---- Entradas: para ver un partido o los Juegos hay que pagar (quien no tiene, se queda fuera) ----
// Con moneda, cada entrada cuesta medio sueldo; sin moneda, se paga en especie (un poco de comida para el pueblo que organiza)
// El precio lo decide el gobierno (o el pueblo, donde se vota): gratis, barato, normal o caro. La ley «entradas gratis» lo deja a cero
const TICKET_LVL = ['gratis', 'baratas', 'normales', 'caras'], TICKET_MULT = [0, .5, 1, 1.8];
const ticketLvl = g => hasLaw(g, 'entradas_gratis') ? 0 : g.ticketLvl ?? 2;
const ticketPrice = (g, big) => g.coin && ticketLvl(g) ? Math.max(1, Math.round(wageOf(g, big ? 6 : 4) * TICKET_MULT[ticketLvl(g)])) : 0;
function payTickets(host, list, what, club){
  const price = ticketPrice(host, what === 'Juegos'), paid = []; let cash = 0, food = 0;
  for (const u of list) {
    if (price) { if ((u.money || 0) < price) continue; u.money -= price; cash += price; }
    else if (!host.coin) food += .3;
    paid.push(u);
  }
  host.tkSeen = (host.tkSeen || 0) + list.length; host.tkOut = (host.tkOut || 0) + list.length - paid.length; // para las quejas
  const ec = ecOf(host);
  if (club) { club.cash = (club.cash || 0) + Math.round(cash * .6); if (ec) ec.treas += cash - Math.round(cash * .6); } else if (ec) ec.treas += cash;
  host.food += food; host.tickets = (host.tickets || 0) + cash;
  if (paid.length && (cash || food >= 1) && Math.random() < .5) notify(`Taquilla ${what === 'Juegos' ? 'de los Juegos' : 'del partido'} en ${host.name}: ${paid.length} entradas${price ? ` a ${price} ${host.coin} (${cash} ${host.coin})` : ', pagadas con comida'}${list.length > paid.length ? `; ${list.length - paid.length} se quedan fuera sin dinero` : ''}`, { x:host.fx * T, y:host.fy * T });
  return paid;
}
// Cada día: la gente se queja si muchos se quedan fuera; el gobierno (o una votación) sube o baja el precio
function ticketPolicyTick(g){
  if (!g.coin || !(g.pitch || g.track) || hasLaw(g, 'entradas_gratis')) return;
  if ((g.tpT = (g.tpT ?? DAY_LEN) - 10) > 0) return; g.tpT = DAY_LEN;
  const at = { x:g.fx * T, y:g.fy * T }, lvl = ticketLvl(g), out = (g.tkOut || 0) / Math.max(1, g.tkSeen || 0), ec = ecOf(g), ideo = govIdeo(g);
  const adults = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H), poor = adults.filter(u => (u.money || 0) < ticketPrice(g) * 3).length / Math.max(1, adults.length);
  const angry = lvl > 0 && (out > .35 || poor > .5); g.tkSeen = g.tkOut = 0;
  if (angry) { g.ticketGrief = yearT + DAY_LEN * 1.5; g.anger = (g.anger || 0) + 2; if (!g.tkMsgT || yearT - g.tkMsgT > DAY_LEN * 3) { g.tkMsgT = yearT; notify(`En ${g.name} se quejan: las entradas para ver deporte están carísimas${out > .35 ? ` (${Math.round(out * 100)} % se quedan fuera)` : ''}`, at); } }
  let to = lvl, why = '';
  if (popularVote(g) && angry && Math.random() < .6) {
    const yes = adults.filter(u => (u.money || 0) < ticketPrice(g) * 4 || (u.ideo || 0) < -.2).length;
    if (yes > adults.length / 2) { to = lvl - 1; why = `votan bajar las entradas (${yes} de ${adults.length} a favor)`; } else why = `votan dejar las entradas como están (solo ${yes} de ${adults.length} quieren bajarlas)`;
  } else if (angry && ((g.anger || 0) > 30 || ideo < -.2) && Math.random() < .5) { to = lvl - 1; why = 'el gobierno baja las entradas para calmar a la gente'; }
  // (subirlas: no justo después de una votación o de las quejas)
  else if (!angry && yearT - (g.tkDecT ?? -1e9) > DAY_LEN * 5 && !(g.ticketGrief > yearT - DAY_LEN * 2) && ec && (ec.treas < 0 || ec.debt > 0 || ideo > .3) && lvl < 3 && Math.random() < .35) { to = lvl + 1; why = ec.treas < 0 || ec.debt > 0 ? 'el gobierno sube las entradas para sanear el tesoro' : 'el gobierno sube las entradas: que pague quien quiera verlo'; }
  else if (!angry && ideo < -.4 && lvl > 1 && Math.random() < .25) { to = lvl - 1; why = 'el gobierno abarata las entradas: el deporte, para todos'; }
  to = clamp(to, 0, 3); if (why && to <= lvl) g.tkDecT = yearT; // lo que se decide por las quejas o en votación se respeta unos días
  if (why) { if (to !== lvl) { g.ticketLvl = to; notify(`En ${g.name} ${why}: ahora son ${TICKET_LVL[to]}${to ? ` (${ticketPrice(g)} ${g.coin})` : ''}`, at); (g.log ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, txt:`Entradas ${TICKET_LVL[to]}: ${why}` }); } else if (popularVote(g)) notify(`En ${g.name} ${why}`, at); }
}
// ---- Ánimo de la nación con los resultados: ganar alegra a todo el país unos días; perder, lo contrario ----
function sportResult(g, delta, why){
  const n = nationOf(g); if (!n) return;
  const cur = n.sportMood && n.sportMood.until > yearT ? n.sportMood.v : 0;
  n.sportMood = { v:clamp(cur + delta, -15, 15), why, until:yearT + DAY_LEN * 1.5 };
  for (const o of villages) if (popOf(o) && nationOf(o) === n) o.anger = Math.max(0, (o.anger || 0) - delta * .5);
}
// (desde socialMood, convivencia.js)
function sportMoodAdd(v, g, add){
  const n = nationOf(g), M = n && n.sportMood; if (M && M.until > yearT && M.v) add(Math.round(M.v), M.why);
  if (g.ticketGrief > yearT && (v.money || 0) < ticketPrice(g) * 4) add(-5, 'no se puede pagar la entrada para ver deporte');
  else if ((g.pitch || g.track) && g.coin && ticketLvl(g) === 0) add(2, 'ver deporte es gratis');
}
// ---- Dibujo: campo, piscina, y marcador con los escudos durante los partidos ----
function drawSports(){
  const [vx0, vy0, vx1, vy1] = visibleRect(), now = performance.now();
  for (const g of villages) {
    const P = g.pitch, Q = g.pool, sprite = (r, k) => { const c = artFrame(k); if (!c) return false; const [, , w, h] = ART_MAP[k]; vctx.drawImage(c, Math.round((r.x0 + r.w / 2) * T - w / 2), (r.y0 + r.h) * T - h); return true; };
    const onS = r => r && !(r.x0 * T > vx1 || (r.x0 + r.w) * T < vx0 || (r.y0 - 4) * T > vy1 || (r.y0 + r.h) * T < vy0);
    if (onS(P) && sprite(P, 'sport:futbol')) { if (g.club && !ballGames.some(b => b.match && b.match.home === g.id)) vctx.drawImage(crestCanvas(g.club), (P.x0 + P.w / 2) * T - 4, (P.y0 + P.h) * T - 15, 8, 9.5); }
    else if (onS(P)) {      const px = P.x0 * T, py = P.y0 * T, pw = P.w * T, ph = P.h * T;
      for (let k = 0; k < P.w; k++) { vctx.fillStyle = k % 2 ? '#4e9a3a' : '#58a842'; vctx.fillRect(px + k * T, py, T, ph); }
      vctx.strokeStyle = 'rgba(255,255,255,.85)'; vctx.lineWidth = .8; vctx.strokeRect(px + 3.5, py + 3.5, pw - 7, ph - 7);
      vctx.beginPath(); vctx.moveTo(px + pw / 2, py + 3.5); vctx.lineTo(px + pw / 2, py + ph - 3.5); vctx.stroke();
      vctx.beginPath(); vctx.arc(px + pw / 2, py + ph / 2, 5, 0, Math.PI * 2); vctx.stroke();
      vctx.strokeRect(px + 3.5, py + ph / 2 - 7, 6, 14); vctx.strokeRect(px + pw - 9.5, py + ph / 2 - 7, 6, 14);
      vctx.fillStyle = '#f4f0e8'; vctx.fillRect(px + 1, py + ph / 2 - 4, 2, 1); vctx.fillRect(px + 1, py + ph / 2 + 4, 2, 1); vctx.fillRect(px + 1, py + ph / 2 - 4, 1, 9); // porterías
      vctx.fillRect(px + pw - 3, py + ph / 2 - 4, 2, 1); vctx.fillRect(px + pw - 3, py + ph / 2 + 4, 2, 1); vctx.fillRect(px + pw - 2, py + ph / 2 - 4, 1, 9);
      if (g.club && !ballGames.some(b => b.match && b.match.home === g.id)) vctx.drawImage(crestCanvas(g.club), px + 1, py - 11, 8, 9.5); // el escudo del club, en una esquina
    }
    if (onS(Q) && sprite(Q, 'sport:natacion')) {}
    else if (onS(Q)) {
      const px = Q.x0 * T, py = Q.y0 * T, pw = Q.w * T, ph = Q.h * T;
      vctx.fillStyle = '#c8c0b0'; vctx.fillRect(px, py, pw, ph); vctx.fillStyle = '#9a9488'; vctx.fillRect(px, py + ph - 1, pw, 1);
      vctx.fillStyle = '#3a8ac8'; vctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
      vctx.fillStyle = '#5aaae0'; for (let k = 0; k < 6; k++) { const sx = px + 4 + ((k * 13 + now / 90) % (pw - 9)), sy = py + 4 + (k * 7 % (ph - 8)); vctx.fillRect(sx, sy, 3, 1); } // brillos
      vctx.fillStyle = 'rgba(240,240,255,.8)'; for (let l = 1; l < 4; l++) vctx.fillRect(px + 3, py + 3 + l * (ph - 6) / 4, pw - 6, .6); // calles
      vctx.fillStyle = '#e8e4dc'; vctx.fillRect(px + pw - 5, py + 1, 1, 4); vctx.fillRect(px + pw - 3, py + 1, 1, 4); vctx.fillRect(px + pw - 5, py + 2, 3, .6); // escalerilla
    }
  }
}
function drawMatchBoards(){
  for (const b of ballGames) {
    if (!b.match) continue; const home = villageById(b.match.home), away = villageById(b.match.away); if (!home || !away || !home.club || !away.club || !home.pitch) continue;
    const P = home.pitch, cx = (P.x0 + P.w / 2) * T, y = P.y0 * T - 12;
    vctx.fillStyle = 'rgba(17,21,26,.85)'; vctx.fillRect(cx - 15, y - 1, 30, 11.5);
    vctx.drawImage(crestCanvas(home.club), cx - 14, y, 8, 9.5); vctx.drawImage(crestCanvas(away.club), cx + 6, y, 8, 9.5);
    vctx.fillStyle = '#f8e070'; vctx.font = 'bold 6px monospace'; vctx.textAlign = 'center'; vctx.fillText(`${b.goals[0]}-${b.goals[1]}`, cx, y + 7); vctx.textAlign = 'start';
  }
}
// ¿Una instalación bajo el cursor? (clic: se abre la pestaña Deportes del pueblo)
function sportAt(sx, sy){
  const wx = (sx - offX) / zoom / T, wy = (sy - offY) / zoom / T;
  for (const g of villages) for (const r of [g.pitch, g.pool, g.track]) if (r && popOf(g) && wx >= r.x0 && wx < r.x0 + r.w && wy >= r.y0 && wy < r.y0 + r.h) return g;
  return null;
}
// Pestaña «Deportes» de la ficha del pueblo
function sportsTab(g){
  const S = sportsOf(g), C = g.club, ps = villagers.filter(u => !u.dead && u.vid === g.id), bar = (f, c) => `<span class="sbar2"><i style="width:${Math.round((f || 0) * 100)}%;background:${c}"></i></span>`;
  const fac = Object.keys(SPORT_NAME).map(k => `<div class="kv"><span>${k === 'futbol' ? '⚽' : k === 'natacion' ? '🏊' : '🏃'} ${k === 'futbol' ? 'Campo de fútbol' : k === 'natacion' ? 'Piscina' : 'Pista de atletismo'}</span><b>${S[k] ? 'construida' : `<span class="muted">falta (${SPORT_COST[k].pop} habitantes, ${SPORT_COST[k].wood} madera${SPORT_COST[k].stone ? `, ${SPORT_COST[k].stone} piedra` : ''})</span>`}</b></div>`).join('');
  let club = '';
  if (C) {
    const row = (p, role) => { const u = byPid(p); return u ? `<div class="kv"><span>${role}</span><b>${esc(u.name)} ${role !== 'Entrenador' ? bar(u.fit, '#58a842') : ''}</b></div>` : ''; };
    club = `<h4>Club de fútbol</h4><div class="club"><img src="${crestUrl(C)}" alt="Escudo"><div><b>${esc(C.name)}</b><div class="muted">fundado el día ${C.founded} · ${C.w} victorias, ${C.d} empates, ${C.l} derrotas · goles ${C.gf}–${C.ga}${g.coin ? ` · caja ${Math.round(C.cash || 0)} ${esc(g.coin)}` : ''}</div></div></div>
      <div class="sec">${C.players.map(p => row(p, 'Titular')).join('')}${row(C.bench, 'Banquillo')}${row(C.coach, 'Entrenador')}</div>
      ${C.res.length ? `<div class="muted" style="font-size:12.5px;margin-top:6px">${C.res.slice().reverse().map(r => `día ${r.d}: ${esc(r.txt)}`).join('<br>')}</div>` : '<div class="muted" style="font-size:12.5px;margin-top:6px">Aún no ha jugado ningún partido</div>'}`;
  } else if (S.futbol) club = '<h4>Club de fútbol</h4><div class="muted">Se fundará cuando haya 12 habitantes</div>';
  const cats = k => { const a = ps.filter(u => u.sports && u.sports[k]); if (!a.length) return '<span class="muted">nadie todavía</span>'; return SPORT_CATS.map(c => { const n = a.filter(u => sportCat(u) === c).length; return n ? `${c} ${n}` : ''; }).filter(Boolean).join(' · '); };
  const swim = ps.filter(u => u.swims !== false).length, fitAvg = ps.length ? ps.reduce((s, u) => s + (u.fit || 0), 0) / ps.length : 0;
  const tk = g.coin ? `<div class="kv"><span>🎟 Entradas</span><b>${TICKET_LVL[ticketLvl(g)]}${ticketLvl(g) ? ` · ${ticketPrice(g)} ${esc(g.coin)} (Juegos ${ticketPrice(g, true)})` : ''}${hasLaw(g, 'entradas_gratis') ? ' <span class="muted">(por ley)</span>' : ''}${g.ticketGrief > yearT ? ' <span style="color:#f08a7a">· la gente se queja</span>' : ''}</b></div><div class="kv"><span>Recaudado</span><b>${Math.round(g.tickets || 0)} ${esc(g.coin)}</b></div>` : '<div class="kv"><span>🎟 Entradas</span><b>sin moneda: se paga con comida</b></div>';
  return `<h4>Instalaciones</h4><div class="sec">${fac}${tk}</div>${club}
    <h4>Deportistas por categoría</h4><div class="sec">${Object.keys(SPORT_NAME).map(k => `<div class="kv"><span>${SPORT_NAME[k]}</span><b>${cats(k)}</b></div>`).join('')}</div>
    <h4>Forma física</h4><div class="sec"><div class="kv"><span>Saben nadar</span><b>${swim} de ${ps.length}</b></div><div class="kv"><span>Forma media</span><b>${bar(fitAvg, '#e9b949')}</b></div></div>
    <p class="muted" style="font-size:12px">La piscina enseña a nadar y da velocidad en el agua; la pista mejora la forma (más rápidos y aguantan mejor el frío y el calor). Los Juegos se celebran cada año en una pista de atletismo.</p>`;
}
