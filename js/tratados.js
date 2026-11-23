// Forja de Mundos · Acuerdos y tratados entre pueblos
// ================= Tratados =================
// Además de aliarse o pelear, los pueblos firman acuerdos con fecha de caducidad:
//  · pacto de no agresión: no se declaran la guerra mientras dure (romperlo es una traición que todos recuerdan)
//  · acuerdo comercial: el doble de caravanas, y se copian los mapas
//  · libre circulación: la gente puede mudarse de uno a otro sin trabas
//  · tratado de paz: al acabar una guerra, una tregua firmada; si un bando ha perdido mucho, paga un tributo
const TREATY = {
  noagresion:{ n:'pacto de no agresión', days:[4, 7], icon:'🕊' },
  comercio:{ n:'acuerdo comercial', days:[4, 8], icon:'⚖' },
  circulacion:{ n:'libre circulación', days:[5, 9], icon:'⇄' },
  paz:{ n:'tratado de paz', days:[4, 6], icon:'📜' },
  tributo:{ n:'tributo', days:[3, 5], icon:'⛁' },
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
  for (const t of ts) if (t.k === 'noagresion' || t.k === 'circulacion') r.v = Math.min(100, r.v + .15); else if (t.k === 'comercio') r.v = Math.min(100, r.v + .25); else if (t.k === 'tributo') r.v = Math.max(-100, r.v - .15);
  // El tributo: cada poco, comida del que perdió al que ganó
  const tr = ts.find(t => t.k === 'tributo');
  if (tr) { const p = villageById(tr.payer), q = villageById(tr.to); if (p && q && p.food > 4) { const n = Math.min(4, p.food * .1); p.food -= n; q.food += n; } }
  // Acuerdos que caducan: si se llevan bien, se renuevan
  for (const t of (r.treaties || [])) if (t.until <= yearT && !t.over) { t.over = true; if (t.k !== 'tributo' && t.k !== 'paz' && r.v > 15 && Math.random() < .6) signTreaty(a, b, r, t.k); }
  if (r.treaties && r.treaties.length > 8) r.treaties = r.treaties.filter(t => t.until > yearT);
  if (Math.random() > .25) return; // no se firma algo cada vez que se miran
  if (!hasTreaty(r, 'noagresion') && r.v > -45 && r.v < 70 && !(allianceOf(a) && allianceOf(a) === allianceOf(b)) && Math.random() < .06) signTreaty(a, b, r, 'noagresion');
  else if (!hasTreaty(r, 'comercio') && r.v > 15 && (a.market != null || b.market != null || (a.port && b.port)) && Math.random() < .08) { signTreaty(a, b, r, 'comercio'); if (typeof shareCharts === 'function') shareCharts(a, b); }
  else if (!hasTreaty(r, 'circulacion') && r.v > 35 && !hasLaw(a, 'fronteras_cerradas') && !hasLaw(b, 'fronteras_cerradas') && Math.random() < .04) signTreaty(a, b, r, 'circulacion');
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
