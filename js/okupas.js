// Forja de Mundos · Contratos de alquiler y okupas
// ================= Contratos y okupas =================
// · Quien alquila una casa firma un contrato: unos días con el alquiler fijo (con la ley de contratos protegidos, el
//   doble). Al acabar se renueva al precio de ahora, y si ya no puede pagarlo, se va
// · Los contratos no siempre se cumplen: hay caseros que echan al inquilino antes de tiempo (con tribunal, a juicio)
// · Okupas: la gente sin casa se mete en casas vacías (en venta o de caseros que no las alquilan). Lo que pase depende
//   del gobierno: con la ley de protección se quedan; con la de desalojo, o en los regímenes duros, mandan a los
//   soldados a echarlos; en el resto lo decide un juez
Object.assign(LAW_TXT, { contratos_alquiler:'contratos de alquiler protegidos', proteger_okupas:'protección de los okupas', desalojo_okupas:'desalojo de okupas' });
Object.assign(LAW_DESC, { contratos_alquiler:'los contratos duran el doble y el casero que los rompe acaba ante el juez', proteger_okupas:'nadie echa a quien vive en una casa vacía: los dueños se quejan',
  desalojo_okupas:'las casas ocupadas se desalojan enseguida con soldados' });
Object.assign(LAW_LEAN, { contratos_alquiler:-.35, proteger_okupas:-.65, desalojo_okupas:.55 });
LAW_CLASH.push(['proteger_okupas', 'desalojo_okupas'], ['contratos_alquiler', 'mercado_vivienda']);
REGIME_LAWS.fascismo.push('desalojo_okupas'); REGIME_LAWS.oligarquia.push('desalojo_okupas'); REGIME_LAWS.dictadura.push('desalojo_okupas');
Object.assign(CRIME_TXT, { contrato:'romper un contrato de alquiler' }); Object.assign(SENTENCE, { contrato:.3 });
const ctDays = g => hasLaw(g, 'contratos_alquiler') ? 8 : 4;
const ctOf = (g, h, v) => { const d = deedOf(g, h); return d && d.ct ? d.ct.find(c => c.p === pidOf(v)) : null; };
const okPolicy = g => hasLaw(g, 'proteger_okupas') ? 'proteger' : hasLaw(g, 'desalojo_okupas') || tyranny(g) || ['oligarquia', 'monarquia'].includes(regimeOf(g)) ? 'desalojo' : 'juicio';
function okupaTick(g, dt, people){
  if (!housingOn(g)) return;
  if ((g.okT = (g.okT ?? Math.random() * 20) - dt) > 0) return; g.okT = 20;
  const D = deedsOf(g), hs = housesOf(g), byPid = peopleByPid(g), at = { x:g.fx * T, y:g.fy * T };
  // Contratos: uno por inquilino (no los okupas ni la familia del dueño)
  for (const h of hs) {
    const d = D[h]; if (!d) continue;
    const o = d.o > 0 ? byPid.get(d.o) : null;
    if (!o) { delete d.ct; continue; }
    const ten = residentsOf(h).filter(u => adultV(u) && !familyOf(u, o) && u.okupa !== h);
    d.ct = (d.ct || []).filter(c => ten.some(u => pidOf(u) === c.p));
    for (const u of ten) if (!d.ct.some(c => c.p === pidOf(u))) d.ct.push({ p:pidOf(u), r:rentOf(g, h), until:yearT + DAY_LEN * ctDays(g) });
  }
  // Okupas que ya no viven allí
  for (const u of people) if (u.okupa != null && u.home !== u.okupa) u.okupa = null;
  for (const h of hs) { const d = D[h]; if (d && d.okupa && !residentsOf(h).some(u => u.okupa === h)) delete d.okupa; }
  okupaMoveIn(g, people, hs, D, byPid, at);
  okupaEvict(g, people, hs, D, at);
  // Una vez al día: contratos que acaban y caseros que no cumplen
  const day = Math.floor(yearT / DAY_LEN); if (g.ctDay === day) return; g.ctDay = day;
  let gone = 0;
  for (const h of hs) {
    const d = D[h]; if (!d || !d.ct || !d.ct.length) continue;
    const o = byPid.get(d.o); if (!o) continue;
    for (const c of d.ct.slice()) {
      const u = byPid.get(c.p); if (!u) continue;
      if (c.until <= yearT) { // se acaba: se renueva al precio de ahora, si puede
        const nr = rentOf(g, h);
        if (nr > c.r * 1.25 && (u.money || 0) < nr * 2) { u.home = null; u.evictT = yearT; d.ct = d.ct.filter(x => x !== c); gone++; }
        else { c.r = nr; c.until = yearT + DAY_LEN * ctDays(g); }
        continue;
      }
      if (Math.random() < (hasLaw(g, 'mercado_vivienda') ? .05 : .025) * (hasLaw(g, 'contratos_alquiler') ? .35 : 1)) { // el casero no cumple
        u.home = null; u.evictT = yearT; d.ct = d.ct.filter(x => x !== c); u.ideo = clamp((u.ideo || 0) - .05, -1, 1);
        const court = hasCourt(g) && Math.random() < (hasLaw(g, 'contratos_alquiler') ? .9 : .5) && openTrial(g, o, 'contrato', hasLaw(g, 'contratos_alquiler') ? .95 : .75);
        notify(`${o.name} echa a ${u.name} de su casa en ${g.name} antes de que acabe el contrato${court ? `: ${u.name} lo lleva a juicio` : ''}`, at);
      }
    }
  }
  if (gone) notify(`En ${g.name} ${gone} inquilino${gone > 1 ? 's' : ''} se queda${gone > 1 ? 'n' : ''} en la calle: al acabar el contrato, el alquiler ha subido demasiado`, at);
}
// La gente sin casa se mete en casas vacías
function okupaMoveIn(g, people, hs, D, byPid, at){
  const homeless = people.filter(u => adultV(u) && !u.away && !u.boat && !u.slave && !inCamp(u) && (u.home == null || !hs.includes(u.home)) && !(u.task && BUSY_POL.includes(u.task.k)));
  if (!homeless.length || Math.random() > .5) return;
  const empty = hs.filter(h => { const d = D[h]; if (!d || d.okupa || residentsOf(h).length) return false; if (d.o === FOR_SALE) return true; const o = d.o > 0 && byPid.get(d.o); return !!(o && o.home !== h); });
  if (!empty.length) return;
  const h = empty[Math.floor(Math.random() * empty.length)], go = homeless.slice(0, Math.min(houseRoom(h), 1 + Math.floor(Math.random() * 3)));
  for (const u of go) { u.home = h; u.okupa = h; floats.push({ x:u.x, y:u.y - 12, txt:'okupa', col:'#e0c080', life:0 }); }
  D[h].okupa = { t:yearT };
  const o = D[h].o > 0 && byPid.get(D[h].o), pol = okPolicy(g);
  notify(`${go.length === 1 ? go[0].name : `${go[0].name} y ${go.length - 1} más`} ocupa${go.length > 1 ? 'n' : ''} una casa vacía ${o ? `de ${o.name} ` : 'en venta '}en ${g.name}${pol === 'proteger' ? ': la ley los protege' : pol === 'desalojo' ? ': el gobierno ya habla de desalojarlos' : ''}`, { x:(h % W) * T, y:((h / W) | 0) * T });
}
// El desalojo: según el gobierno, nunca, por orden del juez, o enseguida; lo hacen los soldados
function okupaEvict(g, people, hs, D, at){
  const pol = okPolicy(g);
  for (const h of hs) {
    const d = D[h]; if (!d || !d.okupa) continue;
    const K = d.okupa, hx = (h % W) * T + 2, hy = ((h / W) | 0) * T + 5;
    if (pol === 'proteger') { if (!K.said) { K.said = true; const o = d.o > 0 && peopleByPid(g).get(d.o); if (o) o.ideo = clamp((o.ideo || 0) + .1, -1, 1); } continue; }
    if (K.force) { // los soldados ya van de camino
      const sold = K.force.map(p => people.find(u => pidOf(u) === p)).filter(u => u && u.task && u.task.k === 'guardia');
      if (sold.some(u => Math.hypot(u.x - hx, u.y - hy) < 10) || yearT - K.forceT > DAY_LEN * .3 || !sold.length) {
        const ok = residentsOf(h).filter(u => u.okupa === h);
        for (const u of ok) { u.home = null; u.okupa = null; u.evictT = yearT; u.ideo = clamp((u.ideo || 0) - .1, -1, 1); }
        for (const u of sold) { u.task = null; u.actT = 0; }
        const fight = sold.length && ok.length >= 2 && Math.random() < .35;
        if (fight) { for (const u of ok) u.hp = Math.max(.2, (u.hp ?? 1) - .25); g.anger = Math.min(100, (g.anger || 0) + 5); }
        g.anger = Math.min(100, (g.anger || 0) + 1.5); delete d.okupa;
        notify(sold.length ? `Los soldados desalojan a ${ok.length} okupa${ok.length > 1 ? 's' : ''} en ${g.name}${fight ? ': se resisten y hay heridos' : ''}` : `En ${g.name} el dueño echa por su cuenta a los okupas de su casa`, { x:hx, y:hy });
      }
      continue;
    }
    if (pol === 'juicio') {
      if (K.judged) { if (yearT - K.judged > DAY_LEN * 3) K.judged = null; continue; }
      if (yearT - K.t < DAY_LEN * .8) continue;
      if (Math.random() < .55) { K.order = true; notify(`Un juez de ${g.name} ordena desalojar una casa ocupada`, { x:hx, y:hy }); }
      else { K.judged = yearT; notify(`Un juez de ${g.name} deja quedarse a los okupas de una casa vacía, de momento`, { x:hx, y:hy }); continue; }
    } else if (yearT - K.t < DAY_LEN * .25) continue;
    const sold = people.filter(u => u.weapon && adultV(u) && !u.away && !u.boat && !u.sleep && u.okupa == null && !(u.task && (BUSY_POL.includes(u.task.k) || u.task.k === 'guardia'))).sort((a, b) => Math.hypot(a.x - hx, a.y - hy) - Math.hypot(b.x - hx, b.y - hy)).slice(0, 3);
    sold.forEach((u, k) => { releaseTask(u); if (u.actT > 0) { u.actT = 0; u.onDone = null; } u.task = { k:'guardia', x:hx + (k - 1) * 4, y:hy + 3, until:yearT + DAY_LEN * .35 }; u.lastD = Infinity; });
    K.force = sold.map(pidOf); K.forceT = yearT;
    if (sold.length) notify(`${sold.length} soldado${sold.length > 1 ? 's van' : ' va'} a desalojar a los okupas de una casa en ${g.name}`, { x:hx, y:hy });
  }
}
// Ficha: cómo vive cada uno, con su contrato
{ const base = homeTxt; homeTxt = function(v, g){
  const s = base(v, g);
  if (v.home != null && v.okupa === v.home) return 'de okupa en una casa vacía';
  const c = g && housingOn(g) && v.home != null ? ctOf(g, v.home, v) : null;
  return c ? `${s} · contrato hasta el día ${Math.floor(c.until / DAY_LEN) + 1}` : s;
}; }
function houseExtraKv(g, h, kv){
  const d = g && housingOn(g) && deedOf(g, h); if (!d) return '';
  let s = '';
  if (d.okupa) s += kv('Okupada', d.okupa.force ? 'los soldados vienen a desalojarla' : d.okupa.order ? 'hay orden de desalojo' : `desde el día ${Math.floor(d.okupa.t / DAY_LEN) + 1}`);
  if (d.ct && d.ct.length) s += kv('Contratos', d.ct.map(c => `${c.r}/día hasta el día ${Math.floor(c.until / DAY_LEN) + 1}`).join(' · '));
  return s;
}
