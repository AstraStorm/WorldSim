// World Sim · Crecimiento y muerte de la vegetación
// ================= Vida de la vegetación =================
// Cada árbol se revisa cada ~10 s: cambia de fase (brote → joven → adulto → viejo → muerto → desaparece)
// y, si es adulto, esparce semillas alrededor (muchas en primavera, pocas en verano y otoño, ninguna en invierno).
// Las semillas solo prosperan donde la tierra es fértil y hay hueco; en campo abierto hace falta más espacio
let lifeCursor = 0;
// Cada estación su cultivo: trigo en primavera, maíz en verano, calabazas en otoño y coles en invierno (las coles aguantan la helada)
const CROPS = { trigo:{ n:'trigo', grow:[1.1, 1, .4, .1], y:5, mill:true, ripe:['#e8c450', '#c89a30'], leaf:['#8ac04e', '#5e8a34'], frost:-2 },
  maiz:{ n:'maíz', grow:[.7, 1.4, .5, 0], y:6, mill:true, ripe:['#f0d040', '#4e8a34'], leaf:['#6ab04a', '#3e7a2a'], frost:-1 },
  calabaza:{ n:'calabazas', grow:[.5, .9, 1.3, .2], y:7, ripe:['#e8842a', '#4e8a34'], leaf:['#6aa04a', '#3e7a2a'], frost:-2 },
  col:{ n:'coles', grow:[.8, .5, 1, .9], y:4, ripe:['#c8e0a0', '#7ab05a'], leaf:['#9ac87a', '#5e9a4a'], frost:-9 },
  mijo:{ n:'mijo', grow:[.7, .9, .6, .1], y:4, mill:true, ripe:['#d8b878', '#a88a4a'], leaf:['#a8b860', '#7a8a3a'], frost:-2, dry:true } };
const SEASON_CROP = ['trigo', 'maiz', 'calabaza', 'col'];
const FERTILE = { [B.TUNDRA]:.08, [B.FOREST]:.9, [B.SWAMP]:.7, [B.GRASS]:.45, [B.HILLS]:.5, [B.PLAINS]:.15, [B.DRY]:.25, [B.DESERT]:.15,
  [B.SAND]:.2, [B.SNOW]:.25, [B.ASH]:.3, [B.DIRT]:.5, [B.ROCK]:.05 };
const OPEN_LAND = new Set([B.GRASS, B.PLAINS, B.DRY, B.DESERT, B.SAND, B.TUNDRA]);
const SEED_SEASON = [2.5, 1, .3, 0];
function updateLife(dt){
  const objs = world.objs, seedF = SEED_SEASON[seasonInfo().i];
  for (let c = Math.ceil(N * dt / 10); c > 0; c--) {
    const i = lifeCursor; lifeCursor = (lifeCursor + 1) % N;
    const o = objs[i]; if (!o || !o.life) continue;
    let st = treeStage(o);
    const tx = i % W, ty = (i / W) | 0, C = treeClima(o);
    // Adaptación al clima: los árboles del mapa inicial ya están adaptados a su zona
    if (o.ad === undefined && C && world.baseT) o.ad = clamp((world.baseT[i] - C[0]) * .8 + (Math.random() - .5) * 4, -20, 20);
    // Frío o calor fuera de lo que aguanta: se debilita y, si dura, se seca en pie (selección natural)
    let mismatch = 0;
    if (C && o.ad !== undefined && st !== 'm') {
      const t = tempAt(i), cold = C[1] + o.ad, hot = C[2] + o.ad;
      mismatch = t < cold ? cold - t : t > hot ? t - hot : 0;
      o.cs = mismatch ? (o.cs || 0) + mismatch / 25 : (o.cs || 0) * .6;
      if (o.cs > 1) { o.life = (yearT - o.born) / TREE_YEAR; st = 'm'; }
    }
    if (st === null) { fallObj(i); objs[i] = null; composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); rareDirty = true; continue; }
    // Selección natural: al pasar de brote a joven y de joven a adulto no todos sobreviven.
    // Influyen su vigor, lo fértil que es el suelo, la sombra de los árboles grandes de alrededor y el invierno
    if (st !== o.st && (st === 'j' || st === 'a')) {
      let shade = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = tx + dx, y = ty + dy; if ((!dx && !dy) || x < 0 || y < 0 || x >= W || y >= H) continue;
        const n = objs[y * W + x]; if (n && (n.st === 'a' || n.st === 'v')) shade++;
      }
      const fert = FERTILE[world.biome[i]] ?? .3;
      const survive = clamp(.25 + .65 * o.vig + .25 * fert - .12 * shade - (seasonInfo().i === 3 ? .1 : 0) - mismatch * .04, .05, .97);
      if (Math.random() > survive) {
        if (st === 'j') { objs[i] = null; composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); continue; } // el brote se seca
        o.life = (yearT - o.born) / TREE_YEAR; st = 'm';                                                // el joven muere en pie
      }
    }
    if (st !== o.st) { o.st = st; composeRegion(tx - 7, ty - 11, tx + 7, ty + 12); if (OBJ[o.key][2] >= 2) rareDirty = true; }
    // Reproducción: los adultos con más vigor dejan más semillas, y los hijos heredan su vigor con una pequeña mutación
    if ((st === 'a' || st === 'v') && seedF > 0 && Math.random() < .09 * seedF * (.4 + 1.2 * o.vig)) {
      const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 4, nx = Math.round(tx + Math.cos(a) * d), ny = Math.round(ty + Math.sin(a) * d);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx, b = world.biome[j];
      if (objs[j] || Math.random() > (FERTILE[b] || 0) || (OPEN_LAND.has(b) && !isFree(j, 4.5)) || (villages.length && builtNear(nx, ny))) continue;
      const table = treeTable(j), key = table.includes(o.key) && Math.random() < .85 ? o.key : fromTable(table, rollTier(Math.random, false));
      const vig = clamp(o.vig + (Math.random() - .5) * .16, .05, 1);
      if (key && placeObject(j, key, Math.random, yearT, vig)) {
        // La semilla hereda la adaptación al clima de su padre (si es de su misma especie) con una pequeña mutación
        if (key.split(':')[0] === o.key.split(':')[0] && o.ad !== undefined) objs[j].ad = clamp(o.ad + (Math.random() + Math.random() - 1) * 3, -24, 24);
        composeRegion(nx - 6, ny - 9, nx + 6, ny + 10);
      }
    }
  }
}
let lastT = 0, gameSpeed = 1;
const SYSTEMS = [dt => { updateBallGames(dt); olympicsTick(dt); }, dt => updateSieges(dt), dt => updateVillagers(dt), dt => updateAnimals(dt), dt => updateFires(dt), dt => updateClimate(dt), dt => updateLife(dt), (dt, t) => updateVolcanoes(dt, t),
  dt => updateWeather(dt), dt => { updateStorms(dt); updateWhirls(dt); }, dt => updateSandstorms(dt), dt => updateMeteors(dt), dt => updateBalloons(dt), dt => updateLanguages(dt), dt => clearWallsOverPens(dt), dt => updateCouncil(dt), dt => updatePirates(dt), dt => updateBandits(dt), dt => updateQuakes(dt), (dt, t) => updateWaves(t)];
let simLag = 0; // pasos que no cupieron en el último fotograma
const WAVES_SYS = SYSTEMS[SYSTEMS.length - 1];
// Sistemas lentos y suaves (clima, tiempo, idiomas, consejo, islas...): a velocidad x2-x5 se calculan una sola vez por
// fotograma con todo el tiempo junto, en vez de repetirlos en cada paso (dan lo mismo y cuestan mucho menos)
const SLOW_RE = /updateClimate|updateWeather|updateLanguages|clearWallsOverPens|updateCouncil|tidyStatues|islandTick|stateVisitTick|conquestTick/, slowSys = new WeakMap();
const isSlowSys = f => { let v = slowSys.get(f); if (v === undefined) { v = SLOW_RE.test(f.toString()) && !/updateVillagers|updateAnimals/.test(f.toString()); slowSys.set(f, v); } return v; }; // el oleaje es solo dibujo: una vez por fotograma aunque el juego vaya rápido (otros módulos añaden sistemas detrás)
function loop(t){
  const dt = Math.min(.1, (t - (lastT || t)) / 1000); lastT = t;
  if (loadingShown) drawGlobe(t);
  if (!busy) {
    // A 2×, 3× o 4× la simulación da varios pasos por fotograma (el oleaje, que es solo dibujo, uno);
    // cada sistema por separado: si uno falla en un fotograma, el resto sigue y el juego no se congela
    const simT0 = performance.now();
    for (let k = 0; k < gameSpeed; k++) {
      if (k && performance.now() - simT0 > 30) { simLag = gameSpeed - k; break; } // no da para tanto: el resto, otro fotograma (más lento, pero sin tirones)
      yearT += dt;
      for (let n = 0; n < SYSTEMS.length; n++) { const S = SYSTEMS[n]; if (k && (S === WAVES_SYS || isSlowSys(S))) continue; if (!k && isSlowSys(S)) { try { S(dt * gameSpeed, t); } catch (err) { console.error(err); } continue; } try { SYSTEMS[n](dt, t); } catch (err) { console.error(err); } }
    }
    updateSeasonHud();
    // Al cambiar de estación los árboles cambian desde varios centros repartidos por el mapa hacia fuera
    // (como manchas que crecen), en unos 3 días; se repintan solo los trozos del mapa que acaban de cambiar
    const si = seasonInfo().i;
    if (si !== spriteSeason) { prevSeason = spriteSeason; spriteSeason = si; seasonChangeT = yearT; planSeasonChange(); }
    if (seasonEvents.length) {
      const now = yearT - seasonChangeT;
      for (let n = 0; n < 10 && seasonEvents.length && seasonEvents[seasonEvents.length - 1][0] <= now; n++) {
        const [, c] = seasonEvents.pop(), cx = (c % SC_W) * 12, cy = Math.floor(c / SC_W) * 12;
        composeRegion(cx, cy, Math.min(W - 1, cx + 11), Math.min(H - 1, cy + 11));
      }
    }
  }
  updateEffects(dt);
  try { sndTick(dt); } catch (err) { console.error(err); }
  const popTxt = `${villagers.length} ${villagers.length === 1 ? 'habitante' : 'habitantes'}`;
  if ($('pop').textContent !== popTxt) $('pop').textContent = popTxt;
  if (follow && cw) {
    // La cámara persigue suavemente al aldeano fijado
    const k = Math.min(1, dt * 6);
    offX += (cw / 2 - follow.x * zoom - offX) * k;
    offY += (ch / 2 - (follow.y - 5) * zoom - offY) * k;
    updateFollowTag();
  }
  draw(t);
  requestAnimationFrame(loop);
}
