// World Sim · Fenómenos del clima: El Niño, La Niña y las DANAs
// ================= Fenómenos =================
// · El Niño y La Niña: cada pocos años el océano se calienta (El Niño) o se enfría (La Niña) durante uno o dos años.
//   El Niño sube algo la temperatura de todo el mundo, empapa la mitad norte y seca la sur; La Niña al revés, enfría y
//   trae más huracanes. Se ve en el panel junto a la temperatura del planeta
// · DANA (gota fría): sobre todo en otoño, cuando el mar sigue caliente, una bolsa de aire frío se queda quieta sobre
//   una costa y descarga lluvias torrenciales durante un buen rato: ramblas y llanos se inundan (y las cosechas se
//   pierden), aunque no estén junto al mar
(() => {
const ENSO_TXT = { nino:'El Niño', nina:'La Niña' };
let ensoYear = -1, danaT = 0, danas = [];
// Cuánta agua recogen las nubes según dónde estén (llamado desde clima.js)
window.ensoRain = y => {
  const e = world && world.enso; if (!e) return 1;
  const k = e.k === 'nino' ? 1 : -1, north = y < PH / 2 ? 1 : -1, f = ensoPower();
  return 1 + .45 * f * k * north;
};
const ensoPower = () => { const e = world.enso; if (!e) return 0; return clamp(Math.min((yearT - e.t0) / 120, (e.until - yearT) / 120), 0, 1); };
function ensoTick(){
  const { year } = seasonInfo(); if (year === ensoYear) return; ensoYear = year;
  const e = world.enso;
  if (e && yearT >= e.until) {
    world.enso = null; world.ensoLast = yearT;
    notify(`Se acaba ${ENSO_TXT[e.k]}: el océano vuelve a la normalidad`, null);
    return;
  }
  if (!e && yearT - (world.ensoLast ?? -1e9) > SEASON_LEN * 4 && Math.random() < .3) {
    const k = Math.random() < .5 ? 'nino' : 'nina';
    world.enso = { k, t0:yearT, until:yearT + SEASON_LEN * 4 * (1 + Math.random()) };
    notify(k === 'nino' ? 'Llega El Niño: el océano se calienta. Más calor en todo el mundo, lluvias en el norte y sequía en el sur'
      : 'Llega La Niña: el océano se enfría. Algo más de frío, sequía en el norte, lluvias en el sur y más huracanes', null);
  }
}
// ---- DANA ----
function coastalTown(){
  const L = liveTowns().filter(g => !g.dead); if (!L.length) return null;
  for (let k = 0; k < 12; k++) {
    const g = L[Math.floor(Math.random() * L.length)];
    for (let j = 0; j < 30; j++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 22, x = Math.round(g.fx + Math.cos(a) * r), y = Math.round(g.fy + Math.sin(a) * r);
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const b = world.biome[y * W + x]; if (b === B.SEA || b === B.SHALLOW || b === B.DEEP) return g; }
  }
  return null;
}
function startDana(g){
  const x = g.fx * T, y = g.fy * T, d = { x, y, r:(16 + Math.random() * 10) * T, age:0, life:45 + Math.random() * 35, gT:0, cT:0, vid:g.id };
  danas.push(d);
  systems.push({ x, y, cyc:true, r:d.r * 2.2, s:16, vx:0, vy:0, age:0, life:d.life, dana:true }); // la borrasca, quieta
  for (let k = 0; k < 6; k++) { const idx = Math.floor(Math.random() * clouds.length); if (idx < clouds.length) clouds[idx] = makeCloud(x + (Math.random() - .5) * d.r, y + (Math.random() - .5) * d.r, 1.4); }
  notify(`Una DANA se queda sobre ${g.name}: lluvias torrenciales e inundaciones`, { x, y });
}
function danaTick(dt){
  const si = seasonInfo().i, risk = [.4, .15, 1, .25][si] * (world.enso && world.enso.k === 'nina' ? 1.3 : 1); // (sobre todo en otoño)
  if ((danaT -= dt) <= 0) { danaT = 20; if (danas.length < 1 && Math.random() < .045 * risk * disasterF()) { const g = coastalTown(); if (g) startDana(g); } }
  if (!danas.length) return;
  const { e, sea } = world;
  for (const d of danas) {
    d.age += dt; const p = clamp(Math.min(d.age / 6, (d.life - d.age) / 8), 0, 1);
    // Las nubes de encima no se van y no se quedan sin agua
    if ((d.cT -= dt) <= 0) { d.cT = 1.5;
      for (const c of clouds) { const cx = c.x + (c.x0 + c.x1) / 2, cy = c.y + c.h / 2, dd = Math.hypot(cx - d.x, cy - d.y); if (dd > d.r * 1.3 || c.dying) continue;
        c.q = Math.max(c.q, 1.2 * p); c.x += (d.x - cx) * .08; c.y += (d.y - cy) * .08; } }
    // El agua: cada medio segundo, en muchas casillas de la zona. Se inunda lo bajo y, con lo que cae, también las ramblas
    if ((d.gT += dt) < .5) continue; const gd = d.gT; d.gT = 0;
    const R = d.r / T, cx = d.x / T, cy = d.y / T;
    for (let k = 0; k < 90; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x;
      if (WATER[world.biome[i]] || world.biome[i] === B.LAVA) continue;
      wetT[i] = simT; if (soilRain) soilRain[soilCell(i)] += gd * p * .004;
      const low = 1 - clamp((e[i] - sea) / ((1 - sea) * .3), 0, 1), river = freshNear(i, 3) ? .6 : 0;
      const f = Math.max(low, river) * p * gd * .5; if (f <= 0) continue;
      floodA[i] = Math.min(1, floodA[i] + f); floodSet.add(i);
    }
  }
  if (danas.some(d => d.age >= d.life)) {
    for (const d of danas) if (d.age >= d.life) { const g = villageById(d.vid); notify(`Termina la DANA${g ? ' en ' + g.name : ''}: toca achicar agua y contar los daños`, { x:d.x, y:d.y }); }
    danas = danas.filter(d => d.age < d.life);
  }
}
window.forceDana = () => { const g = coastalTown(); if (g) startDana(g); return g ? g.name : null; }; // (para probar)
// La Niña: algún huracán más
function ninaHurricanes(dt){
  if (!world.enso || world.enso.k !== 'nina' || seasonInfo().i === 3) return;
  if (Math.random() < dt * .0015 * ensoPower() * disasterF()) {
    for (let k = 0; k < 30; k++) { const i = Math.floor(Math.random() * N); if (world.biome[i] !== B.DEEP) continue; addStorm('huracan', (i % W) * T, ((i / W) | 0) * T, true); break; }
  }
}
SYSTEMS.push(dt => {
  if (!world || !params.weather) return;
  ensoTick();
  const target = world.enso ? (world.enso.k === 'nino' ? .8 : -.6) * ensoPower() : 0;
  ensoDT += (target - ensoDT) * Math.min(1, dt * .05);
  danaTick(dt); ninaHurricanes(dt);
});
// En el panel, junto a la temperatura del planeta
{ const base = updateSeasonHud; updateSeasonHud = function(){ base.apply(this, arguments); const o = $('globalOut'); if (!o || !world || !world.enso) return; const t = ` · ${ENSO_TXT[world.enso.k]}`; if (!o.textContent.endsWith(t)) o.textContent += t; }; }
})();
