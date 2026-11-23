// Forja de Mundos · La guerra, más larga, más táctica y más visible
// ================= Guerra =================
// · Al declarar la guerra, el atacante monta un campamento entre los dos pueblos (tiendas, hoguera y su bandera):
//   desde ahí salen los ataques, que antes se reúnen allí y marchan juntos con su abanderado delante
// · Bajas de cada bando, días de guerra y quién va ganando, en el mapa (sobre la línea del frente) y arriba
// · Las guerras duran más: se acaba cuando han muerto muchos para el tamaño de los dos pueblos, o tras varios días si
//   nadie gana; las treguas y los tratados de paz, también más largos
const warCap = (a, b) => Math.max(14, Math.round((popOf(a) + popOf(b)) * .15));
// Campamento del atacante: a un tercio del camino, en tierra libre
function warCamp(att, def, r){
  const dd = Math.hypot(def.fx - att.fx, def.fy - att.fy) || 1, k = Math.min(dd * .45, 40);
  const p = ringFind(Math.round(att.fx + (def.fx - att.fx) / dd * k), Math.round(att.fy + (def.fy - att.fy) / dd * k), 8, (x, y) => tileFree(x, y) && !WATER[world.biome[y * W + x]] && !volcDanger(x, y));
  if (p) r.war.camp = { x:p[0], y:p[1], nat:nationOf(att).id };
}
// Una baja: se apunta al bando que la sufre (desde la pelea y los bombardeos)
function warLoss(r, loser){ if (!r || !r.war || !loser) return; if (nationOf(loser).id === r.war.att || loser.id === r.war.att) r.war.lossA = (r.war.lossA || 0) + 1; else r.war.lossD = (r.war.lossD || 0) + 1; }
// Quién va ganando (texto corto)
function warScore(r){
  const a = villageById(r.war.att), d = villageById(r.war.def), la = r.war.lossA || 0, ld = r.war.lossD || 0, days = Math.floor((yearT - r.war.start) / DAY_LEN) + 1;
  const lead = la === ld ? 'igualados' : la < ld ? `gana ${a.name}` : `gana ${d.name}`;
  return { a, d, la, ld, days, lead };
}
// Dibujo: el campamento (tiendas, hoguera, bandera) y el marcador sobre la línea del frente
function drawWarCamps(now){
  const [vx0, vy0, vx1, vy1] = visibleRect(), tent = artFrame('camp:tienda');
  for (const r of rels.values()) {
    if (!r.war) continue; const S = warScore(r); if (!S.a || !S.d) continue;
    const c = r.war.camp;
    if (c) {
      const cx = c.x * T + 2, cy = c.y * T + 3;
      if (!(cx < vx0 - 40 || cx > vx1 + 40 || cy < vy0 - 40 || cy > vy1 + 40)) {
        const n = villageById(c.nat) || S.a, col = villageColor(n);
        for (const [dx, dy] of [[-9, -3], [8, -4], [0, 4]]) { if (tent) vctx.drawImage(tent, cx + dx - (tent.width >> 1), cy + dy - tent.height); else { vctx.fillStyle = `rgb(${col.join(',')})`; vctx.beginPath(); vctx.moveTo(cx + dx - 5, cy + dy); vctx.lineTo(cx + dx, cy + dy - 7); vctx.lineTo(cx + dx + 5, cy + dy); vctx.fill(); } }
        const fl = .6 + .4 * Math.sin(now / 90); vctx.fillStyle = `rgba(255,150,40,${fl})`; vctx.fillRect(cx - 1, cy - 2, 3, 2); vctx.fillStyle = '#ffe080'; vctx.fillRect(cx, cy - 3, 1, 1); // hoguera
        vctx.fillStyle = '#4a3018'; vctx.fillRect(cx + 14, cy - 18, 1, 18); // mástil con la bandera
        if (n.flag) drawFlag(n.flag, cx + 15, cy - 18, 8, 5, 1, now); else { vctx.fillStyle = `rgb(${col.join(',')})`; vctx.fillRect(cx + 15, cy - 18, 7, 5); }
      }
    }
    if (zoom > 4) continue;
    const mx = (S.a.fx + S.d.fx) / 2 * T, my = (S.a.fy + S.d.fy) / 2 * T - 14 / zoom * 2;
    if (mx < vx0 - 60 || mx > vx1 + 60 || my < vy0 - 30 || my > vy1 + 30) continue;
    const k = 1 / zoom * 2, w = 64 * k, h = 11 * k;
    vctx.fillStyle = 'rgba(20,10,10,.82)'; vctx.fillRect(mx - w / 2, my - h, w, h);
    vctx.font = `bold ${7 * k}px monospace`; vctx.textAlign = 'center';
    vctx.fillStyle = '#f4d0c0'; vctx.fillText(`día ${S.days} · bajas ${S.la}-${S.ld}`, mx, my - 3 * k); vctx.textAlign = 'start';
  }
}
// ---- Guerra civil: el país se parte en dos bandos ----
// Con mucho enfado y la gente dividida (muchos muy de izquierdas y muchos muy de derechas), o bajo una dictadura
// odiada, los descontentos se alzan en armas: se hacen fuertes en un pueblo propio cerca de la capital y luchan contra
// el gobierno con las mismas reglas que cualquier guerra. Si ganan, cae el gobierno y mandan ellos; si pierden,
// vuelven a ser parte del país
function civilWarTick(g, people, dt){
  if (nationOf(g) !== g || (g.civT = (g.civT ?? DAY_LEN) - dt) > 0) return; g.civT = DAY_LEN / 2;
  const adults = people.filter(u => ageOf(u) >= ADULT_H && !u.away); if (adults.length < 20) return;
  if ([...rels.values()].some(r => r.war && r.war.civil && (r.war.att === g.id || r.war.def === g.id))) return;
  const L = adults.filter(u => (u.ideo || 0) < -.3).length / adults.length, R = adults.filter(u => (u.ideo || 0) > .3).length / adults.length;
  const tyr = ['dictadura', 'fascismo', 'comunismo', 'oligarquia'].includes(regimeOf(g)), anger = g.anger || 0;
  const split = L > .3 && R > .3, ripe = (split && anger > 65) || (tyr && anger > 78);
  if (!ripe || Math.random() > .12) return;
  // Los rebeldes: los del lado contrario al gobierno (o los más enfadados, bajo una dictadura)
  const gi = govIdeo(g), side = gi >= 0 ? -1 : 1, rebels = adults.filter(u => u !== g.leader && ((u.ideo || 0) * side > .15 || (tyr && moodOf(u).score < 40))).slice(0, Math.floor(adults.length * .45));
  if (rebels.length < 8) return;
  for (let k = 0; k < 80; k++) {
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 18, x = Math.round(g.fx + Math.cos(a) * d), y = Math.round(g.fy + Math.sin(a) * d * .8);
    if (x < 8 || y < 8 || x >= W - 8 || y >= H - 8 || !tileFree(x, y) || !freshNear(y * W + x, 10)) continue;
    const ng = makeVillage(x, y); if (!ng) continue;
    for (const u of rebels) { releaseTask(u); u.vid = ng.id; u.home = null; if (!u.weapon && Math.random() < .5) u.weapon = 'lanza'; }
    ng.nation = ng.id; becomeIndependent(ng); ng.food = Math.min(g.food * .35, 40); g.food -= ng.food; ng.wood = 15; ng.rebelOf = g.id; ng.rebelSide = side;
    ng.leader = rebels.slice().sort((a, b) => (b.edu || 0) - (a.edu || 0))[0];
    const r = relOf(g, ng); r.known = true; r.v = -90; r.reason = 'guerra civil';
    r.war = { att:ng.id, def:g.id, reason:'guerra civil', start:yearT, raidT:yearT - 60, dead:0, civil:true }; warCamp(ng, g, r);
    notify(`¡Guerra civil en ${g.name}! ${rebels.length} rebeldes ${side < 0 ? 'de izquierdas' : 'de derechas'}${tyr ? ' contra la dictadura' : ''} se alzan en armas y se hacen fuertes en ${ng.name}`, { x:x * T, y:y * T });
    if (typeof buildZones === 'function') buildZones();
    return;
  }
}
// Al firmar la paz de una guerra civil (desde makePeace): el que ha perdido menos gente gana
function civilEnd(a, b, r){
  const reb = villageById(r.war.att), gov = villageById(r.war.def); if (!reb || !gov) return;
  const rebelsWin = (r.war.lossD || 0) > (r.war.lossA || 0) * 1.2;
  reb.nation = gov.id; reb.rebelOf = null; // vuelven a ser un solo país
  if (rebelsWin) {
    const reg = reb.rebelSide < 0 ? (Math.random() < .5 ? 'socialismo' : 'republica') : (Math.random() < .5 ? 'dictadura' : 'republica');
    setRegime(gov, reg, null); if (reb.leader && !reb.leader.dead) { reb.leader.vid = gov.id; gov.leader = reb.leader; }
    gov.anger = 20; notify(`¡Los rebeldes ganan la guerra civil! Cae el gobierno de ${gov.name}: ahora es ${REGIME_A[reg] || reg}${gov.leader ? ` y manda ${gov.leader.name}` : ''}`, { x:gov.fx * T, y:gov.fy * T });
  } else { gov.anger = Math.max(0, (gov.anger || 0) - 25); notify(`El gobierno de ${gov.name} gana la guerra civil: los rebeldes de ${reb.name} se rinden y vuelven a ser parte del país`, { x:reb.fx * T, y:reb.fy * T }); }
  if (typeof buildZones === 'function') buildZones();
}
