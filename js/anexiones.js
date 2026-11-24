// World Sim · Pueblos que se quedan sin gente: piden la anexión o se van a vivir con otros
// ================= Anexiones =================
// · Un pueblo independiente con muy poca gente (o que la ha perdido casi toda) se reúne en la plaza y vota: pedir que
//   una nación vecina amiga se lo anexione (pasa a ser provincia suya), irse todos a vivir con un pueblo amigo, o seguir
// · Los muy pocos (3 o menos), o los que pasan hambre, se inclinan por irse; los que tienen casas y campos, por la anexión
// · El otro país decide si los acepta: vota (donde se vota) o lo decide quien manda. Pesan las relaciones, hablar la
//   misma lengua, tener la misma fe, y leyes como fronteras cerradas o segregación (que cierran la puerta)
// · Una provincia que se queda casi vacía se muda al pueblo más cercano de su misma nación
function friendsFor(g){
  const out = [];
  for (const o of villages) {
    if (o === g || !popOf(o) || nationOf(o) === nationOf(g) && nationOf(g) !== g) continue;
    const r = rels.get(relKey(nationOf(g), nationOf(o))) || rels.get(relKey(g, o)), d = Math.hypot(o.fx - g.fx, o.fy - g.fy);
    if (!r || !r.known || r.war || r.v < 0 || d > 120) continue;
    out.push({ o, sc:r.v / 20 - d / 30 + (o.lang === g.lang ? 2 : 0) + (o.faith && g.faith && o.faith.god === g.faith.god ? 1.5 : 0) + popOf(o) / 20 });
  }
  return out.sort((a, b) => b.sc - a.sc).map(x => x.o);
}
// ¿Los acepta el otro país?
function hostAccepts(host, g, what){
  const n = nationOf(host), r = rels.get(relKey(n, nationOf(g))) || rels.get(relKey(host, g)), rv = r ? r.v : 0;
  if (hasLaw(n, 'fronteras_cerradas') || (hasLaw(n, 'segregacion') && Math.abs(skinAvg(g) - skinAvg(host)) > 1.5)) return { ok:false, txt:`${n.name} les cierra la puerta` };
  const bonus = (g.lang === host.lang ? .15 : 0) + (g.faith && host.faith && g.faith.god === host.faith.god ? .1 : 0) + rv / 300;
  if (popularVote(n)) {
    const res = plazaVote(n, u => Math.random() < .45 + bonus + (what === 'anexion' ? -(u.ideo || 0) * .05 : 0) ? 'si' : 'no');
    return { ok:res.win === 'si', txt:`en ${n.name} votan ${what === 'anexion' ? 'si se los anexionan' : 'si los acogen'}: ${res.pct('si')} % sí, ${res.pct('no')} % no` };
  }
  const ok = Math.random() < .55 + bonus + (what === 'anexion' && ['monarquia', 'dictadura', 'fascismo'].includes(regimeOf(n)) ? .2 : 0); // a los tiranos les gusta crecer
  return { ok, txt:`${n.leader && !n.leader.dead ? leaderRef(n) : 'el gobierno'} de ${n.name} ${ok ? 'acepta' : 'dice que no'}` };
}
function moveAll(g, to, people){
  for (const v of people) { if (v.away || v.dead) continue; releaseTask(v); dismount(v); if (v.actT > 0) { v.actT = 0; v.onDone = null; } v.task = { k:'viaje' }; v.away = true; travelers.push({ kind:'emigrante', v, from:g.id, to:to.id, x:v.x, y:v.y, tx:to.fx * T + 2 + (Math.random() - .5) * 20, ty:to.fy * T + 10, hx:v.x, hy:v.y, sea:false, phase:'ida', dir:1 }); }
}
function smallTownTick(g, dt, people){
  if ((g.smallT = (g.smallT ?? 20) - dt) > 0) return; g.smallT = 20;
  const pop = people.length, peak = g.peakPop = Math.max(g.peakPop || 0, pop), at = { x:g.fx * T, y:g.fy * T };
  if (!pop || pop > 6 || (peak < 10 && yearT - (g.born || 0) < DAY_LEN * 2)) return; // (un pueblo recién fundado todavía no)
  if (yearT - (g.smallAskT ?? -1e9) < DAY_LEN * 1.5) return; g.smallAskT = yearT;
  // Una provincia casi vacía: a vivir con los suyos
  if (nationOf(g) !== g) {
    const kin = villages.filter(o => o !== g && popOf(o) && nationOf(o) === nationOf(g)).sort((a, b) => Math.hypot(a.fx - g.fx, a.fy - g.fy) - Math.hypot(b.fx - g.fx, b.fy - g.fy))[0];
    if (kin && pop <= 4) { moveAll(g, kin, people); notify(`En ${g.name} quedan tan pocos que se van todos a vivir a ${kin.name}`, at); }
    return;
  }
  if (villages.some(o => o !== g && popOf(o) && o.nation === g.id)) return; // una capital con provincias, no
  const friends = friendsFor(g); if (!friends.length) return;
  const host = friends[0], hungry = g.food < pop, houses = housesOf(g).length;
  // El pueblo vota
  const res = plazaVote(g, u => { const w = { anexion:1 + houses * .15 + (hungry ? 0 : .5), mudarse:1 + (pop <= 3 ? 1.5 : 0) + (hungry ? 1.5 : 0), seguir:.8 + (u === g.leader ? 1 : 0) };
    let k = Math.random() * (w.anexion + w.mudarse + w.seguir); for (const o of ['anexion', 'mudarse', 'seguir']) if ((k -= w[o]) < 0) return o; return 'seguir'; });
  const txt = `En ${g.name}, con solo ${pop} ${pop === 1 ? 'habitante' : 'habitantes'}, votan qué hacer: pedir la anexión a ${nationOf(host).name} ${res.pct('anexion')} %, irse a vivir a ${host.name} ${res.pct('mudarse')} %, seguir solos ${res.pct('seguir')} %`;
  if (res.win === 'seguir') { notify(`${txt}: siguen por su cuenta`, at); return; }
  const what = res.win, acc = hostAccepts(host, g, what);
  if (!acc.ok) { notify(`${txt}. Pero ${acc.txt}: siguen solos`, at); return; }
  if (what === 'anexion') {
    const n = nationOf(host); g.nation = n.id; g.unrest = 0; const r = relOf(n, g); r.v = Math.max(r.v, 40);
    notify(`${txt}. ${capFirst(acc.txt)}: ${g.name} pasa a ser parte de ${n.name}`, at);
  } else { moveAll(g, host, people); notify(`${txt}. ${capFirst(acc.txt)}: se van todos a vivir a ${host.name}`, at); }
}
