// World Sim · Encuestas de intención de voto
// ================= Encuestas =================
// · Donde se vota, cada medio día se hace una encuesta: se pregunta a una muestra de la gente a quién votaría hoy (con
//   la misma cuenta que las elecciones: ideas, cómo le va y lo que promete cada partido, más algo de margen de error)
//   y cuánto aprueba al gobierno. Se guardan por nombre de partido (aunque nazcan o se fusionen partidos)
// · En la ficha del pueblo (Política) y en tu panel de gobierno, la gráfica de la intención de voto con sus días
// · Sale en las noticias la última encuesta antes de votar (y en tu nación, cada día)
function pollNow(n){
  const ps = n.parties, ads = villagers.filter(u => !u.dead && ageOf(u) >= ADULT_H && nationOf(villageById(u.vid) || {}) === n);
  const S = ads.length > 90 ? ads.filter((u, i) => i % Math.ceil(ads.length / 90) === 0) : ads; if (!S.length) return null;
  const votes = ps.map(() => 0); let app = 0;
  for (const u of S) {
    const ug = villageById(u.vid), ms = moodOf(u).score, swing = ms < 35 ? .3 : ms < 45 ? .12 : ms > 70 ? -.1 : 0; app += ms;
    let best = 0, bd = Infinity;
    ps.forEach((p, k) => { let d = Math.abs((u.ideo || 0) - p.ideo) + Math.random() * .3 - (k === n.ruling ? .05 : 0) + (k === n.ruling ? swing : 0);
      if (ug && typeof lawNeed === 'function') for (const l of p.laws || []) { const nd = lawNeed(u, ug, l); if (nd) d -= clamp(nd, -1, 1) * .12; } if (d < bd) { bd = d; best = k; } });
    votes[best]++;
  }
  const by = {}; ps.forEach((p, k) => { by[p.name] = Math.round(votes[k] / S.length * 100); });
  return { d:Math.floor(yearT / DAY_LEN) + 1, t:yearT, by, app:Math.round(app / S.length), n:S.length };
}
let pollClock = 0;
SYSTEMS.push(dt => {
  if ((pollClock -= dt) > 0 || !villages.length) return; pollClock = DAY_LEN / 2;
  for (const n of villages) {
    if (nationOf(n) !== n || !popOf(n) || !n.parties || n.parties.length < 2 || !votes(n) || n.election) continue;
    const P = pollNow(n); if (!P) continue;
    (n.polls ||= []).push(P); if (n.polls.length > 30) n.polls.shift();
    const txt = Object.entries(P.by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v} %`).join(' · ');
    const left = (n.voteT ?? -1e9) + ELECTION_GAP - yearT, mine = typeof isPlayerG === 'function' && isPlayerG(n);
    if (left > 0 && left < DAY_LEN * .6) notify(`📊 Última encuesta antes de votar en ${n.name}: ${txt}`, { x:n.fx * T, y:n.fy * T });
    else if (mine) notify(`📊 Encuesta en ${n.name}: ${txt} · aprobación del gobierno ${P.app} %`, { x:n.fx * T, y:n.fy * T });
  }
});
// La gráfica (SVG): una línea por partido de los que siguen existiendo, con la última cifra al final
function pollChart(n, w = 300){
  const L = (n.polls || []).slice(-20); if (L.length < 2 || !n.parties) return '';
  const h = Math.round(w * .42), pad = 22, max = Math.max(30, ...L.flatMap(p => Object.values(p.by))) + 5;
  const X = i => 4 + i * (w - pad - 8) / (L.length - 1), Y = v => h - 14 - v / max * (h - 22);
  const lines = n.parties.map(p => { const pts = L.map((q, i) => q.by[p.name] != null ? [X(i), Y(q.by[p.name])] : null).filter(Boolean); if (pts.length < 2) return '';
    const last = L[L.length - 1].by[p.name]; return `<polyline points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${p.col}" stroke-width="2" stroke-linejoin="round"/>${last != null ? `<text x="${(w - pad + 2).toFixed(0)}" y="${(Y(last) + 3).toFixed(1)}" class="pc-v" fill="${p.col}">${last}</text>` : ''}`; }).join('');
  const grid = [10, 20, 30, 40, 50].filter(v => v < max).map(v => `<line x1="4" x2="${w - pad}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(255,255,255,.07)"/>`).join('');
  const last = L[L.length - 1];
  return `<div class="pollc"><svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Encuestas de intención de voto">${grid}${lines}<text x="4" y="${h - 2}" class="pc-d">día ${L[0].d}</text><text x="${w - pad}" y="${h - 2}" class="pc-d" text-anchor="end">día ${last.d}</text></svg>
    <div class="pollc-i"><span>Intención de voto (muestra de ${last.n} personas)</span><span>Aprobación del gobierno: <b style="color:${moodCol(last.app)}">${last.app} %</b></span></div></div>`;
}
