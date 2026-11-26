// World Sim · Escaños, hemiciclo y mociones de censura
// ================= Parlamento =================
// · Las elecciones son una vez al año (ELECTION_GAP, sociedad.js). Con el resultado se reparten los escaños (ley
//   D'Hondt) en un parlamento que crece con la nación (de 11 a 101 diputados)
// · Entre elecciones, el gobierno solo cae por una moción de censura (o por una guerra civil o un golpe): si la gente
//   está muy descontenta (o tras unas protestas), el mayor partido de la oposición la presenta con su líder de
//   candidato; cada partido vota con todos sus escaños según lo lejos que está del gobierno y el enfado de la calle.
//   Si suma más de la mitad, gobierna el que la presentó
// · En la ficha del pueblo (Política) y en tu panel de gobierno, el hemiciclo: cada punto es un escaño, del color de su
//   partido y de izquierda a derecha; la línea de la mayoría y cuándo son las próximas elecciones
const seatTotal = cap => { const pop = villages.filter(o => popOf(o) && nationOf(o) === cap).reduce((a, o) => a + popOf(o), 0); return clamp(2 * Math.round((10 + pop / 6) / 2) + 1, 11, 101); };
function dhondt(votes, S){
  const seats = votes.map(() => 0);
  for (let k = 0; k < S; k++) { let best = 0, bv = -1; votes.forEach((v, i) => { const q = v / (seats[i] + 1); if (q > bv) { bv = q; best = i; } }); seats[best]++; }
  return seats;
}
// Los escaños de ahora (del último resultado); null si allí no hay parlamento
function seatsOf(cap){
  if (!cap || !cap.parties || cap.parties.length < 2 || !votes(cap) || !cap.voteRes || cap.voteRes.length !== cap.parties.length) return null;
  if (!cap.seats || cap.seats.length !== cap.parties.length || cap.seatsV !== cap.voteRes.join(',')) { cap.seats = dhondt(cap.voteRes, seatTotal(cap)); cap.seatsV = cap.voteRes.join(','); }
  return cap.seats;
}
// Tras cada elección, los escaños nuevos (y, si nadie tiene mayoría, el pacto se hace por escaños)
{ const base = countVotes; countVotes = function(cap){
  const r = base.apply(this, arguments);
  if (!cap.voteRes) return r;
  cap.seats = null; const S = seatsOf(cap); if (!S) return r;
  const tot = S.reduce((a, b) => a + b, 0), w = cap.ruling;
  if (PARLIAMENT.includes(regimeOf(cap)) && w != null && S[w] * 2 <= tot) {
    const ps = cap.parties, partner = ps.map((q, k) => k).filter(k => k !== w && (S[w] + S[k]) * 2 > tot).sort((a, b) => Math.abs(ps[a].ideo - ps[w].ideo) - Math.abs(ps[b].ideo - ps[w].ideo))[0];
    cap.coalition = partner ?? null;
  }
  cap.motionT = yearT; // (recién votado: nada de mociones en un tiempo)
  return r;
}; }
// El líder de la nación cae (juicio, linchamiento...): su partido pone a otro, sin elecciones
function replaceLeader(cap){
  if (!cap || !cap.parties || cap.ruling == null) return;
  const p = cap.parties[cap.ruling], L = typeof partyLeaderOf === 'function' ? partyLeaderOf(cap, p) : null;
  if (L && !L.dead) { cap.leader = L; notify(`${capFirst(artP(p))} ${p.name} pone a ${L.name} al frente de ${cap.name} hasta las próximas elecciones`, { x:cap.fx * T, y:cap.fy * T }); }
}
// Aprobación del gobierno: el ánimo medio (con una muestra) y el enfado de la calle
function govApproval(cap){
  const ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && nationOf(villageById(u.vid) || {}) === cap); if (!ads.length) return .5;
  const S = ads.length > 40 ? ads.filter((u, i) => i % Math.ceil(ads.length / 40) === 0) : ads;
  return S.reduce((a, u) => a + moodOf(u).score, 0) / S.length / 100;
}
// La moción: la presenta el mayor partido de la oposición; votan todos los escaños
function censureMotion(cap, why){
  const S = seatsOf(cap); if (!S || cap.ruling == null || cap.election) return;
  const ps = cap.parties, gov = cap.ruling, coal = cap.coalition, tot = S.reduce((a, b) => a + b, 0), anger = Math.max(0, ...villages.filter(o => popOf(o) && nationOf(o) === cap).map(o => o.anger || 0)) / 100, app = govApproval(cap);
  const opp = ps.map((q, k) => k).filter(k => k !== gov && k !== coal && S[k] > 0).sort((a, b) => S[b] - S[a]); if (!opp.length) return;
  const by = opp[0], P = ps[by], cand = typeof partyLeaderOf === 'function' ? partyLeaderOf(cap, P) : null;
  let yes = 0; const vote = ps.map((q, k) => {
    if (k === by) return true; if (k === gov) return false;
    const far = Math.abs(q.ideo - ps[gov].ideo), near = Math.abs(q.ideo - P.ideo);
    const pYes = k === coal ? (app < .35 ? .45 : .1) : clamp(.15 + far * .5 - near * .4 + (1 - app) * .6 + anger * .4, .02, .95);
    return Math.random() < pYes;
  });
  vote.forEach((v, k) => { if (v) yes += S[k]; });
  cap.motionT = yearT; cap.motionAsk = null;
  const at = { x:cap.fx * T, y:cap.fy * T }, head = `Moción de censura en ${cap.name}${why ? ` ${why}` : ''}: ${artP(P)} ${P.name} la presenta${cand ? ` con ${cand.name} de candidato` : ''}`;
  const rec = { d:Math.floor(yearT / DAY_LEN) + 1, by:P.name, yes, tot, ok:yes * 2 > tot };
  (cap.motions ||= []).push(rec); if (cap.motions.length > 6) cap.motions.shift();
  if (rec.ok) {
    const old = ps[gov]; cap.ruling = by; cap.coalition = null;
    if (S[by] * 2 <= tot) { const sup = ps.map((q, k) => k).filter(k => k !== by && vote[k] && k !== gov).sort((a, b) => S[b] - S[a])[0]; if (sup != null) cap.coalition = sup; }
    if (cand) cap.leader = cand;
    notify(`${head} y sale adelante (${yes} de ${tot} escaños): cae el gobierno ${deP(old)} ${old.name}. Ahora gobierna ${artP(P)} ${P.name}${cap.coalition != null ? ` con el apoyo ${deP(ps[cap.coalition])} ${ps[cap.coalition].name}` : ''}${cand ? `; ${cand.name} pasa a mandar` : ''}`, at);
    lawLog(cap, `Moción de censura: gobierna ${artP(P)} ${P.name}`);
    for (const o of villages) if (popOf(o) && nationOf(o) === cap) o.anger = (o.anger || 0) * .5;
  } else notify(`${head}, pero no sale adelante (${yes} de ${tot} escaños; hacían falta ${Math.floor(tot / 2) + 1})`, at);
}
// Cada rato se mira si alguna oposición se atreve (con mucho descontento, o tras unas protestas)
let motionClock = 0;
SYSTEMS.push(dt => {
  if ((motionClock -= dt) > 0 || !villages.length) return; motionClock = 12;
  for (const cap of villages) {
    if (nationOf(cap) !== cap || !popOf(cap) || cap.election || !seatsOf(cap)) continue;
    if (yearT - (cap.motionT ?? -1e9) < DAY_LEN * 3 || yearT - (cap.voteT ?? -1e9) < DAY_LEN * 2 || (cap.voteT != null && yearT - cap.voteT > ELECTION_GAP - DAY_LEN * 2)) continue; // (ni recién votado ni con las elecciones encima)
    const asked = cap.motionAsk != null && yearT - cap.motionAsk < DAY_LEN;
    if (!asked && (Math.random() > .12 || govApproval(cap) > .42)) continue;
    censureMotion(cap, asked ? 'tras las protestas' : 'por el descontento');
  }
});
// ---- El hemiciclo (SVG) ----
function hemicycle(cap, w = 300){
  const S = seatsOf(cap); if (!S) return '';
  const ps = cap.parties, tot = S.reduce((a, b) => a + b, 0), rows = Math.max(2, Math.round(Math.sqrt(tot / 3.2)));
  const radii = [...Array(rows)].map((_, i) => .42 + .58 * i / (rows - 1)), sumR = radii.reduce((a, b) => a + b, 0);
  const cnt = radii.map(r => Math.max(1, Math.round(tot * r / sumR))); let diff = tot - cnt.reduce((a, b) => a + b, 0); cnt[rows - 1] += diff;
  const pts = []; radii.forEach((r, i) => { const n = cnt[i]; for (let j = 0; j < n; j++) { const a = Math.PI * (n === 1 ? .5 : j / (n - 1)); pts.push({ a, r }); } });
  pts.sort((p, q) => q.a - p.a || q.r - p.r); // de izquierda a derecha
  const order = ps.map((q, k) => k).sort((a, b) => ps[a].ideo - ps[b].ideo), col = []; for (const k of order) for (let s = 0; s < S[k]; s++) col.push(k);
  const h = Math.round(w * .55), cx = w / 2, cy = h - 6, R = w / 2 - 8, dot = Math.max(1.8, Math.min(6, R * .5 / rows * .78));
  const gov = new Set([cap.ruling, cap.coalition].filter(k => k != null));
  const dots = pts.map((p, i) => { const k = col[i]; if (k == null) return ''; const x = cx + Math.cos(p.a) * R * p.r, y = cy - Math.sin(p.a) * R * p.r;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dot.toFixed(1)}" fill="${ps[k].col}"${gov.has(k) ? '' : ' opacity=".8"'}/>`; }).join('');
  const maj = Math.floor(tot / 2) + 1, next = cap.voteT != null ? Math.max(0, Math.ceil((cap.voteT + ELECTION_GAP - yearT) / DAY_LEN)) : null, govSeats = [...gov].reduce((a, k) => a + S[k], 0);
  return `<div class="hemi"><svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Parlamento: ${tot} escaños">${dots}<line x1="${cx}" y1="${cy - R - 2}" x2="${cx}" y2="${cy - R * .36}" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 3"/><text x="${cx}" y="${cy - 2}" text-anchor="middle" class="hemi-n">${tot}</text></svg>
    <div class="hemi-info"><span>Mayoría: <b>${maj}</b> escaños · el gobierno tiene <b style="color:${govSeats >= maj ? '#a8d890' : '#f0a890'}">${govSeats}</b></span>${next != null ? `<span>Próximas elecciones: ${next ? `en ${next} día${next === 1 ? '' : 's'}` : 'ya'}</span>` : ''}</div>
    <div class="hemi-leg">${order.filter(k => S[k] > 0).map(k => `<span${gov.has(k) ? ' class="gov"' : ''}><i style="background:${ps[k].col}"></i>${esc(ps[k].abbr || (typeof siglas === 'function' ? siglas(ps[k].name) : ps[k].name))} <b>${S[k]}</b>${k === cap.ruling ? ' ★' : k === cap.coalition ? ' ☆' : ''}</span>`).join('')}</div>
    ${(cap.motions || []).length ? `<div class="hemi-mot">${cap.motions.slice(-2).reverse().map(m => `<span>Día ${m.d}: moción de censura ${deP({ name:m.by, ...(cap.parties.find(q => q.name === m.by) || {}) })} ${esc(m.by)} · ${m.yes}/${m.tot} · ${m.ok ? '<b class="ok">salió</b>' : '<b>fracasó</b>'}</span>`).join('')}</div>` : ''}</div>`;
}
