// World Sim · Uniones de naciones: de alianza a unión política y económica
// ================= Unión =================
// · Una alianza de al menos tres naciones donde se vota, con moneda y bastante tiempo junta, se convierte en una Unión
//   (al.union): mercado único (cada día algo más para cada tesoro, más cuanto más grande es la Unión), libre circulación
//   (sin fronteras para migrar entre miembros) y una sola economía (sus crisis se contagian: economia.js).
// · Criterios: para entrar hay que votar, tener moneda, no deber demasiado y llevarse bien con la mitad de los miembros.
//   Quien deja de ser democracia queda suspendido y, si no vuelve en unos días, expulsado.
// · Salidas: en un miembro con gobierno muy a la derecha y la gente enfadada puede ganar el «sí» a salir en referéndum.
// · Tu nación recibe la invitación (o la propuesta de referéndum de salida) como una carta de crisis.
const unionOf = g => { const al = g && allianceOf(g); return al && al.union ? al : null; };
const sameUnion = (a, b) => { const u = unionOf(a); return !!u && u === unionOf(b) && !unionSusp(u, a) && !unionSusp(u, b); };
const unionSusp = (u, g) => !!(u.union.susp && u.union.susp[nationOf(g).id]);
const UNION_W = ['Unión', 'Comunidad', 'Confederación'];
function unionDebt(n){ const e = n.coin && ecOf(n); return e ? e.debt / Math.max(1, e.P) : 0; }
const unionFit = n => votes(n) && !!n.coin && unionDebt(n) < 150;
function unionForm(al){
  const ms = al.members.map(villageById).filter(Boolean); if (ms.length < 3 || !ms.every(unionFit) || yearT - al.born < DAY_LEN * 5) return;
  const w = UNION_W[al.id % UNION_W.length], core = al.name.replace(/^(La |El )?(Alianza|Liga|Pacto|Tratado|Coalición|Concordia)( de| del)? ?/i, '').trim() || ms[0].name;
  al.union = { d:Math.floor(yearT / DAY_LEN) + 1, name:`${w} de ${core}`, susp:{}, joined:[], left:[] };
  notify(`🌐 ${capFirst(artA(al))} ${al.name} da el gran paso: nace la ${al.union.name}, con mercado único y libre circulación entre ${ms.map(m => m.name).join(', ')}`, { x:ms[0].fx * T, y:ms[0].fy * T });
}
function bloqueTick(al){
  const U = al.union, ms = al.members.map(villageById).filter(Boolean), at = ms[0] ? { x:ms[0].fx * T, y:ms[0].fy * T } : null;
  // Suspensiones y expulsiones
  for (const m of ms) {
    if (!votes(m)) { if (!U.susp[m.id]) { U.susp[m.id] = yearT; notify(`La ${U.name} suspende a ${m.name}: ya no es una democracia`, at); }
      else if (yearT - U.susp[m.id] > DAY_LEN * 3) { delete U.susp[m.id]; leaveAlliance(al, m, `expulsada de la ${U.name} por dejar de ser democracia`); U.left.push(m.name); } }
    else if (U.susp[m.id]) { delete U.susp[m.id]; notify(`${m.name} vuelve a la ${U.name} con plenos derechos`, at); }
  }
  // Mercado único
  const live = ms.filter(m => !U.susp[m.id]), pop = live.reduce((a, m) => a + natPop(m), 0);
  for (const m of live) { const e = m.coin && ecOf(m); if (e) e.treas += Math.min(6, pop / 120) * (e.P || 1); }
  // Adhesiones
  if (Math.random() < .25) for (const n of nationsAlive()) {
    if (allianceOf(n) || !unionFit(n) || natPop(n) < 15) continue;
    const ok = live.filter(m => { const r = rels.get(relKey(n, m)); return r && r.known && !r.war && r.v > 25; }).length; if (ok < Math.ceil(live.length / 2)) continue;
    if (isPlayerG(n)) { if (!(n.unionAsk > yearT)) { n.unionAsk = yearT + DAY_LEN * 6; crisisSoon('union_inv', { aid:al.id }); } continue; }
    al.members.push(n.id); U.joined.push(n.name);
    notify(`${n.name} entra en la ${U.name}: ya son ${al.members.length} naciones`, { x:n.fx * T, y:n.fy * T }); break;
  }
  // Salidas por referéndum
  for (const m of live) {
    if ((m.exitT || 0) > yearT || live.length < 3) continue;
    const angry = natTowns(m).reduce((a, g) => a + (g.anger || 0), 0) / Math.max(1, natTowns(m).length);
    if (govIdeo(m) < .4 || angry < 35 || Math.random() > .08) continue;
    m.exitT = yearT + DAY_LEN * 6;
    if (isPlayerG(m)) { crisisSoon('union_out', { aid:al.id }); continue; }
    const yes = .35 + govIdeo(m) * .2 + angry / 300 + (Math.random() - .5) * .2;
    if (yes > .5) { leaveAlliance(al, m, `gana el «sí» en el referéndum de salida de la ${U.name} con un ${Math.round(yes * 100)} %`); U.left.push(m.name); }
    else notify(`En ${m.name} gana el «no» en el referéndum de salida de la ${U.name} (${Math.round((1 - yes) * 100)} % quiere quedarse)`, { x:m.fx * T, y:m.fy * T });
  }
}
let unionClock = 0;
SYSTEMS.push(dt => { try {
  if (!world || (unionClock -= dt) > 0) return; unionClock = DAY_LEN * .5;
  for (const al of alliances) { if (al.dead) continue; if (!al.union) unionForm(al); else bloqueTick(al); }
} catch (e) { console.error(e); } });
// En la ficha
{ const base = allyCard; allyCard = function(g){ const h = base.apply(this, arguments), u = unionOf(g); if (!u) return h; const U = u.union;
  return h + `<div class="muted">🌐 <b>${esc(U.name)}</b> desde el día ${U.d}: mercado único y libre circulación${unionSusp(u, g) ? ' · <b>suspendida</b> (ya no vota)' : ''}${U.joined.length ? ` · se han unido ${U.joined.map(esc).join(', ')}` : ''}${U.left.length ? ` · se han ido ${U.left.map(esc).join(', ')}` : ''}</div>`; }; }
// ---- Cartas para tu nación ----
Object.assign(CRISES, {
  union_inv:{ ic:'🌐', cd:0, when:() => null,
    title:(n, D) => { const al = alliances.find(a => a.id === D.aid); return al && al.union ? `Invitación a la ${al.union.name}` : 'Invitación'; },
    text:(n, D) => { const al = alliances.find(a => a.id === D.aid); return al ? `La ${al.union.name} (${al.members.map(id => (villageById(id) || {}).name).filter(Boolean).join(', ')}) os invita a entrar: mercado único, libre circulación, moneda común y defensa mutua. A cambio, compartís sus crisis y no podréis dejar de ser una democracia.` : ''; },
    opts:(n, D) => { const al = alliances.find(a => a.id === D.aid);
      return [
        { t:'Entrar', d:'Más comercio y protección; sus crisis también serán las vuestras', ok:() => al && !al.dead ? true : 'ya no existe', fx:() => { al.members.push(n.id); al.union.joined.push(n.name); notify(`${n.name} entra en la ${al.union.name}`, { x:n.fx * T, y:n.fy * T }); cIdeoAnger(1, 4); } },
        { t:'Quedarse fuera', d:'Mantenéis vuestra independencia y vuestra moneda', fx:() => {} },
      ]; } },
  union_out:{ ic:'🗳', cd:0, when:() => null,
    title:(n, D) => { const al = alliances.find(a => a.id === D.aid); return al && al.union ? `¿Salir de la ${al.union.name}?` : 'Referéndum'; },
    text:(n, D) => 'Una parte de tu gente culpa a la Unión de sus problemas y pide un referéndum para salir. Si lo convocas, decidirá la gente; si no, el enfado seguirá ahí.',
    opts:(n, D) => { const al = alliances.find(a => a.id === D.aid);
      return [
        { t:'Convocar el referéndum', d:'Que vote la gente: puede ganar el sí o el no', ok:() => al && !al.dead ? true : 'ya no existe', fx:() => { const angry = cTowns().reduce((a, g) => a + (g.anger || 0), 0) / Math.max(1, cTowns().length), yes = .3 + govIdeo(n) * .2 + angry / 300 + (Math.random() - .5) * .2; if (yes > .5) { leaveAlliance(al, n, `gana el «sí» en el referéndum de salida con un ${Math.round(yes * 100)} %`); al.union.left.push(n.name); } else { notify(`En ${n.name} gana el «no»: se quedan en la ${al.union.name} (${Math.round((1 - yes) * 100)} %)`, { x:n.fx * T, y:n.fy * T }); cAnger(-5); } } },
        { t:'Seguir en la Unión', d:'Sin referéndum: a quienes lo pedían no les gusta nada', fx:() => cIdeoAnger(1, 8) },
      ]; } },
});
