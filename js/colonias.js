// World Sim · Colonias, buen gobierno de las provincias y referéndums de independencia
// ================= Colonias =================
// · Las naciones grandes con muelle mandan barcos de colonos a costas lejanas sin pueblos: fundan una colonia que es
//   provincia suya, habla su lengua y lleva su bandera
// · Una colonia bien llevada no tiene por qué irse: si la capital le manda provisiones cuando pasa hambre, si hablan la
//   misma lengua y si hay ley de autonomía, la distancia apenas pesa en su descontento
// · Si aun así el descontento crece y la capital es un país donde se vota, se hace un referéndum en la provincia (en la
//   plaza): si gana el sí se independiza; si gana el no, se queda (y se calma). Donde no se vota, se rebelan
const colonies = n => villages.filter(o => o !== n && popOf(o) && o.colony && o.nation === n.id);
// Cuánto pesa la distancia en el descontento de una provincia (1 = como siempre; menos si está bien llevada)
function colonyCare(g, cap){
  let k = 1;
  if (yearT - (g.suppliedT ?? -1e9) < DAY_LEN * 2) k *= .5;
  if (g.lang != null && g.lang === cap.lang) k *= .8;
  if (hasLaw(cap, 'autonomia')) k *= .5;
  return k;
}
// Busca una costa lejana y libre a la que se pueda llegar por mar desde el muelle
function colonySite(n){
  const L = n.port.launch, lx = L % W, ly = (L / W) | 0;
  for (let k = 0; k < 300; k++) {
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 110, x = Math.round(lx + Math.cos(a) * d), y = Math.round(ly + Math.sin(a) * d);
    if (x < 8 || y < 8 || x >= W - 8 || y >= H - 8 || !tileFree(x, y)) continue;
    const wn = nb4i(y * W + x).find(i => openWater(i)); if (wn == null) continue;
    if (villages.some(o => popOf(o) && Math.hypot(o.fx - x, o.fy - y) < 30) || (typeof siteRoom === 'function' && !siteRoom(x, y))) continue;
    let land = 0; for (let yy = y - 4; yy <= y + 4; yy++) for (let xx = x - 4; xx <= x + 4; xx++) if (!WATER[world.biome[yy * W + xx]]) land++; if (land < 50) continue;
    const route = waterRoute(L, wn); if (!route || route.length < 8 || route.length > 220) continue;
    if (!seaRouteKnown(n, route)) continue; // solo a costas que tienen en el mapa
    return { x, y, route };
  }
  return null;
}
function colonyTick(n, dt, people, adults){
  if (nationOf(n) !== n) return;
  if ((n.colT = (n.colT || 0) - dt) > 0) return; n.colT = 5; const el = 5, at = { x:n.fx * T, y:n.fy * T };
  // Provisiones para las colonias que pasan hambre
  for (const c of colonies(n)) if (c.food < popOf(c) * 1.5 && n.food > popOf(n) * 3 + 20) { n.food -= 20; c.food += 20; c.suppliedT = yearT; if (!c.supMsg || yearT - c.supMsg > DAY_LEN * 2) { c.supMsg = yearT; notify(`Llegan provisiones de ${n.name} a la colonia de ${c.name}`, { x:c.fx * T, y:c.fy * T }); } }
  // Mandar colonos
  if (!n.port || !openWater(n.port.launch) || adults.length < 16 || colonies(n).length >= 3 || travelers.some(t => t.kind === 'colonos' && t.from === n.id) || Math.random() > el * .004) return;
  const s = colonySite(n); if (!s) return;
  const goers = adults.filter(u => !u.away && !u.boat && u !== n.leader && !(u.task && BUSY_POL.includes(u.task.k))).sort(() => Math.random() - .5).slice(0, 6);
  if (goers.length < 4) return;
  for (const u of goers) { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } dismount(u); u.sleep = false; u.task = { k:'viaje' }; u.away = true; }
  const L = n.port.launch, home = [(L % W) * T + 2, ((L / W) | 0) * T + 3], path = s.route.slice(), first = path.shift();
  travelers.push({ kind:'colonos', v:goers[0], crew:goers, from:n.id, to:n.id, x:home[0], y:home[1], tx:first[0], ty:first[1], path, sea:true, phase:'ida', dir:1, site:[s.x, s.y], hx:home[0], hy:home[1], old:s.old || null });
  notify(`De ${n.name} zarpa un barco con ${goers.length} colonos hacia tierras lejanas`, at);
}
// Llegan: fundan la colonia (si no se puede, se instalan donde llegan y siguen siendo de los suyos)
function foundColony(t, n){
  const [x, y] = t.site, crew = t.crew.filter(u => !u.dead), c = n && makeVillage(x, y);
  for (const u of crew) { u.away = false; u.task = null; landAt(u, x * T + 2 + (Math.random() - .5) * 8, y * T + 6 + Math.random() * 4); }
  if (!c) { notify(`Los colonos de ${n ? n.name : '?'} no encuentran dónde asentarse y se quedan por la costa`, { x:x * T, y:y * T }); return; }
  for (const u of crew) { u.vid = c.id; u.home = null; }
  c.nation = n.id; c.colony = { cap:n.id, born:yearT }; c.lang = n.lang; c.food += 30; c.wood += 20; c.faith = n.faith ? { ...n.faith, pantheon:[...(n.faith.pantheon || [])] } : null;
  if (n.know) c.know = { ...c.know, barca:n.know.barca, escritura:n.know.escritura };
  setTimeout(() => addHero(n, t.v, `fundó la colonia de ${c.name}`), 4000);
  setTimeout(() => notify(`${n.name} funda una colonia al otro lado del mar: ${c.name}`, { x:c.fx * T, y:c.fy * T }), 3500); // (cuando ya tiene su nombre)
}
// Antes de independizarse: referéndum donde la capital vota; true si se van
function independenceReferendum(g, cap, why){
  if (!(typeof popularVote === 'function' && popularVote(cap))) return true; // donde no se vota, se rebelan
  const lang = g.lang != null && g.lang !== cap.lang ? .15 : 0, fe = g.faith && cap.faith && g.faith.god !== cap.faith.god ? .15 : 0;
  const res = plazaVote(g, u => Math.random() < .25 + (g.unrest || 0) / 250 + lang + fe ? 'si' : 'no');
  const txt = `Referéndum de independencia en ${g.name}${g.colony ? ' (colonia de ' + cap.name + ')' : ''}: ${res.pct('si')} % sí, ${res.pct('no')} % no`;
  if (res.win === 'si') { notify(`${txt}: gana el sí`, { x:g.fx * T, y:g.fy * T }); return true; }
  g.unrest = 35; notify(`${txt}: gana el no y siguen con ${cap.name}`, { x:g.fx * T, y:g.fy * T }); return false;
}
function colonyCard(g){
  const n = nationOf(g), cs = colonies(n);
  if (g.colony && n !== g) return `<h4>Colonia</h4><div>Colonia de ${esc(n.name)} desde el día ${Math.floor(g.colony.born / DAY_LEN) + 1} · descontento ${Math.round(g.unrest || 0)} %${yearT - (g.suppliedT ?? -1e9) < DAY_LEN * 2 ? ' · recibe provisiones' : ''}${hasLaw(n, 'autonomia') ? ' · con autonomía' : ''}</div>`;
  return cs.length && n === g ? `<h4>Colonias</h4><div>${cs.map(c => `${esc(c.name)} <span class="muted">(${popOf(c)} hab., descontento ${Math.round(c.unrest || 0)} %)</span>`).join(', ')}</div>` : '';
}
