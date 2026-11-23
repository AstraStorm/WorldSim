// Forja de Mundos · Acuerdos y tratados entre pueblos
// ================= Tratados =================
// Además de aliarse o pelear, los pueblos firman acuerdos con fecha de caducidad:
//  · pacto de no agresión: no se declaran la guerra mientras dure (romperlo es una traición que todos recuerdan)
//  · acuerdo comercial: el doble de caravanas, y se copian los mapas
//  · libre circulación: la gente puede mudarse de uno a otro sin trabas
//  · tratado de paz: al acabar una guerra, una tregua firmada; si un bando ha perdido mucho, paga un tributo
//  · cooperación científica: se pasan sus descubrimientos mucho más a menudo
//  · intercambio cultural: estudiantes y artistas van y vienen; la gente está más contenta y se tienen más aprecio
//  · defensa mutua: si alguien ataca a uno, el otro lo condena y le manda comida, madera y voluntarios armados
//  · ayuda contra el hambre: si uno pasa hambre y el otro tiene de sobra, le manda comida
//  · frontera fijada: acaban las disputas por el territorio (no hay guerra por tierras mientras dure)
//  · amistad deportiva: se juegan partidos amistosos de fútbol (deportes.js)
const TREATY = {
  noagresion:{ n:'pacto de no agresión', days:[7, 12], icon:'🕊' },
  comercio:{ n:'acuerdo comercial', days:[4, 8], icon:'⚖' },
  circulacion:{ n:'libre circulación', days:[5, 9], icon:'⇄' },
  paz:{ n:'tratado de paz', days:[8, 12], icon:'📜' },
  tributo:{ n:'tributo', days:[3, 5], icon:'⛁' },
  ciencia:{ n:'acuerdo de cooperación científica', days:[5, 9], icon:'⚗' },
  cultura:{ n:'acuerdo de intercambio cultural', days:[5, 9], icon:'🎭' },
  defensa:{ n:'pacto de defensa mutua', days:[6, 10], icon:'🛡' },
  ayuda:{ n:'acuerdo de ayuda contra el hambre', days:[5, 8], icon:'🌾' },
  fronteras:{ n:'acuerdo de fronteras', days:[8, 12], icon:'⛿' },
  deporte:{ n:'acuerdo de amistad deportiva', days:[6, 10], icon:'⚽' },
};
const treatiesOf = r => (r && r.treaties || []).filter(t => t.until > yearT);
const hasTreaty = (r, k) => treatiesOf(r).some(t => t.k === k);
function signTreaty(a, b, r, k, extra){
  const D = TREATY[k], dur = DAY_LEN * (D.days[0] + Math.random() * (D.days[1] - D.days[0]));
  const old = (r.treaties || []).find(t => t.k === k);
  r.treaties = (r.treaties || []).filter(t => t.until > yearT && t.k !== k);
  const t = { k, since:yearT, until:yearT + dur, a:a.id, b:b.id, ...extra }; r.treaties.push(t);
  const at = { x:(a.fx + b.fx) / 2 * T, y:(a.fy + b.fy) / 2 * T }, days = Math.round(dur / DAY_LEN);
  const txt = k === 'tributo' ? `${villageById(t.payer).name} pagará tributo a ${villageById(t.to).name} durante ${days} días` : `${a.name} y ${b.name} ${old ? 'renuevan' : 'firman'} un ${D.n} (${days} días)`;
  notify(txt, at); for (const g of [a, b]) (g.log ||= []).push({ d:Math.floor(yearT / DAY_LEN) + 1, txt });
  return t;
}
// Cada vez que se revisan las relaciones de dos pueblos (desde diploTick)
function treatyTick(a, b, r){
  if (!r.known || r.war) return;
  const ts = treatiesOf(r);
  for (const t of ts) if (['noagresion', 'circulacion', 'fronteras', 'deporte'].includes(t.k)) r.v = Math.min(100, r.v + .15); else if (t.k === 'cultura') { r.v = Math.min(100, r.v + .3); for (const g of [a, b]) g.anger = Math.max(0, (g.anger || 0) - .2); } else if (t.k === 'ciencia') { r.v = Math.min(100, r.v + .15); if (typeof spreadScience === 'function' && Math.random() < .5) spreadScience(a, b); } else if (t.k === 'defensa') r.v = Math.min(100, r.v + .2); else if (t.k === 'comercio') r.v = Math.min(100, r.v + .25); else if (t.k === 'tributo') r.v = Math.max(-100, r.v - .15);
  // El tributo: cada poco, comida del que perdió al que ganó
  const tr = ts.find(t => t.k === 'tributo');
  if (tr) { const p = villageById(tr.payer), q = villageById(tr.to); if (p && q && p.food > 4) { const n = Math.min(4, p.food * .1); p.food -= n; q.food += n; } }
  // La ayuda contra el hambre: comida del que tiene al que no
  if (ts.some(t => t.k === 'ayuda')) for (const [p, q] of [[a, b], [b, a]]) if (q.food < popOf(q) * 1.5 && p.food > popOf(p) * 4) { const n = Math.min(12, p.food * .1); p.food -= n; q.food += n; if (yearT - (q.aidT ?? -1e9) > DAY_LEN) { q.aidT = yearT; notify(`${p.name} manda comida a ${q.name}, que pasa hambre (acuerdo de ayuda)`, { x:q.fx * T, y:q.fy * T }); } }
  // Acuerdos que caducan: si se llevan bien, se renuevan
  for (const t of (r.treaties || [])) if (t.until <= yearT && !t.over) { t.over = true; if (t.k !== 'tributo' && t.k !== 'paz' && r.v > 15 && Math.random() < .6) signTreaty(a, b, r, t.k); }
  if (r.treaties && r.treaties.length > 8) r.treaties = r.treaties.filter(t => t.until > yearT);
  if (Math.random() > .25) return; // no se firma algo cada vez que se miran
  if (!hasTreaty(r, 'noagresion') && r.v > -45 && r.v < 70 && !(allianceOf(a) && allianceOf(a) === allianceOf(b)) && Math.random() < .06) signTreaty(a, b, r, 'noagresion');
  else if (!hasTreaty(r, 'comercio') && r.v > 15 && (a.market != null || b.market != null || (a.port && b.port)) && Math.random() < .08) { signTreaty(a, b, r, 'comercio'); if (typeof shareCharts === 'function') shareCharts(a, b); }
  else if (!hasTreaty(r, 'circulacion') && r.v > 35 && !hasLaw(a, 'fronteras_cerradas') && !hasLaw(b, 'fronteras_cerradas') && Math.random() < .04) signTreaty(a, b, r, 'circulacion');
  else if (!hasTreaty(r, 'ciencia') && r.v > 30 && (a.know || {}).escritura && (b.know || {}).escritura && Math.random() < .04) signTreaty(a, b, r, 'ciencia');
  else if (!hasTreaty(r, 'cultura') && r.v > 25 && (a.lang !== b.lang || Math.random() < .5) && Math.random() < .04) signTreaty(a, b, r, 'cultura');
  else if (!hasTreaty(r, 'defensa') && r.v > 55 && !(allianceOf(a) && allianceOf(a) === allianceOf(b)) && Math.random() < .03) signTreaty(a, b, r, 'defensa');
  else if (!hasTreaty(r, 'ayuda') && r.v > 20 && Math.random() < .03) signTreaty(a, b, r, 'ayuda');
  else if (!hasTreaty(r, 'fronteras') && r.v > -20 && r.reason === 'territorio' && Math.random() < .05) signTreaty(a, b, r, 'fronteras');
  else if (!hasTreaty(r, 'deporte') && r.v > 10 && typeof sportsOf === 'function' && (sportsOf(a).futbol || sportsOf(b).futbol) && Math.random() < .05) signTreaty(a, b, r, 'deporte');
}
// Defensa mutua: alguien ataca a «def»; quien tenga pacto de defensa con él lo condena y le manda ayuda
function mutualDefense(att, def){
  for (const o of villages) {
    if (o === att || o === def || !popOf(o) || nationOf(o) !== o) continue;
    const r = rels.get(relKey(o, def)); if (!hasTreaty(r, 'defensa')) continue;
    const q = rels.get(relKey(o, att)); if (q) q.v = Math.max(-100, q.v - 30);
    const food = Math.min(20, o.food * .2), wood = Math.min(15, o.wood * .2); o.food -= food; o.wood -= wood; def.food += food; def.wood += wood;
    const vols = villagers.filter(v => !v.dead && v.vid === o.id && v.weapon && !v.away).slice(0, 2);
    for (const v of vols) { releaseTask(v); v.vid = def.id; v.x = def.fx * T + (Math.random() - .5) * 12; v.y = def.fy * T + 6; }
    notify(`${o.name} cumple el pacto de defensa: condena el ataque de ${att.name} y manda a ${def.name} comida, madera${vols.length ? ` y ${vols.length} voluntario${vols.length > 1 ? 's' : ''} armado${vols.length > 1 ? 's' : ''}` : ''}`, { x:def.fx * T, y:def.fy * T });
  }
}
// Al acabar una guerra: tratado de paz y, si un bando ha salido muy mal parado, tributo al otro
function peaceTreaty(a, b, r){
  signTreaty(a, b, r, 'paz');
  const lootA = r.lastWar && r.lastWar.att === a.id ? r.lastWar.loots || 0 : 0, lootB = r.lastWar && r.lastWar.att === b.id ? r.lastWar.loots || 0 : 0;
  const pa = popOf(a), pb = popOf(b), loser = pa < pb * .6 || lootB >= 2 ? a : pb < pa * .6 || lootA >= 2 ? b : null;
  if (loser) signTreaty(a, b, r, 'tributo', { payer:loser.id, to:(loser === a ? b : a).id });
}
// Romper un pacto: los demás lo saben y desconfían del traidor
function breakTreaties(att, def, r){
  const pact = treatiesOf(r).find(t => t.k === 'noagresion' || t.k === 'paz'); if (!pact) return;
  r.treaties = r.treaties.filter(t => t !== pact);
  for (const o of villages) if (o !== att && o !== def && popOf(o)) { const q = rels.get(relKey(o, att)); if (q && q.known) q.v = Math.max(-100, q.v - 15); }
  notify(`¡${att.name} rompe el ${TREATY[pact.k].n} con ${def.name}! Los demás pueblos desconfían de ellos`, { x:def.fx * T, y:def.fy * T });
}
function treatyCard(g){
  const rows = [];
  for (const o of villages) { if (o === g || !popOf(o)) continue; const r = rels.get(relKey(g, o)); for (const t of treatiesOf(r)) {
    const left = Math.max(1, Math.round((t.until - yearT) / DAY_LEN)), txt = t.k === 'tributo' ? (t.payer === g.id ? `pagan tributo a <button class="lnk" data-vid="${o.id}">${esc(o.name)}</button>` : `<button class="lnk" data-vid="${o.id}">${esc(o.name)}</button> les paga tributo`) : `${TREATY[t.k].n} con <button class="lnk" data-vid="${o.id}">${esc(o.name)}</button>`;
    rows.push(`<div class="kv"><span>${TREATY[t.k].icon} ${txt}</span><b>${left} día${left > 1 ? 's' : ''} más</b></div>`); } }
  return `<h4>Tratados</h4>${rows.length ? `<div class="sec">${rows.join('')}</div>` : '<div class="muted">Ningún tratado firmado</div>'}`;
}
