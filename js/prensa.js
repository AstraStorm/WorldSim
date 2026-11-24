// World Sim · Prensa: periódicos, titulares, influencia en el voto, escándalos y censura
// ================= Prensa =================
// · Con escritura y papel, y gente suficiente, nacen los periódicos (uno; dos o tres en pueblos grandes). Cada uno es
//   afín a un partido (o a unas ideas) y lo dirige alguien del pueblo
// · Cada día sacan un titular de lo que ha pasado, contado a su manera: el afín al gobierno quita importancia a lo
//   malo y presume de lo bueno; el de la oposición, al revés
// · Quien sabe leer lee el que más se parece a sus ideas (y a veces otro), y poco a poco le acerca a ellas: así pesa en
//   las elecciones. Con prensa libre de oposición se destapan antes los escándalos
// · Con censura o en una dictadura solo queda el periódico oficial: cierran los demás y su director va a juicio
const PAPER_NAMES = { izq:['La Voz del Pueblo', 'La Antorcha', 'El Progreso', 'La Aurora', 'El Obrero'], centro:['El Diario', 'El Correo', 'La Gaceta', 'El Pregonero', 'El Faro'], der:['El Orden', 'La Tradición', 'El Heraldo', 'La Patria', 'El Baluarte'] };
const papersOf = g => (g.papers ||= []);
const pressFree = g => !hasLaw(g, 'censura') && !tyranny(g);
const sideOf = ideo => ideo < -.3 ? 'izq' : ideo > .3 ? 'der' : 'centro';
const literate = u => (u.edu || 0) > .1 || ((u.id || 0) % 3 !== 0); // los que fueron a la escuela, y dos de cada tres de los demás
// Lo que se destapan antes los escándalos (se usa en presupuestos.js)
const pressFactor = g => 1 + .6 * papersOf(g).filter(p => !p.official && Math.abs(p.ideo - govIdeo(g)) > .4).length;
function foundPaper(g, adults, official){
  const n = nationOf(g), ps = papersOf(g), party = !official && n.parties ? n.parties.find(q => !ps.some(p => p.party === q.name)) : null;
  const ideo = official ? govIdeo(g) : party ? party.ideo : (Math.random() - .5) * 1.4;
  const names = PAPER_NAMES[sideOf(ideo)], base = names[Math.floor(Math.random() * names.length)];
  const name = official ? `Boletín Oficial de ${n.name}` : ps.some(p => p.name.startsWith(base)) ? `${base} de ${g.name}` : base;
  const editor = adults.filter(u => !u.jail && !u.away).sort((a, b) => ((b.edu || 0) - Math.abs((b.ideo || 0) - ideo) * .3) - ((a.edu || 0) - Math.abs((a.ideo || 0) - ideo) * .3))[0];
  const p = { name, ideo, party:party ? party.name : null, official:!!official, editor, since:yearT, heads:[], readers:0 };
  ps.push(p);
  notify(official ? `En ${g.name} el gobierno saca su periódico: «${name}»` : `En ${g.name} sale el primer número de «${name}»${party ? `, afín a ${artP(party)} ${party.name}` : ''}${editor ? `, dirigido por ${editor.name}` : ''}`, { x:g.fx * T, y:g.fy * T });
}
// El titular del día, contado según de qué lado está el periódico
const BAD = /escándalo|derrumb|fracasa|muere|muertos|rechaz|huelga|manifestación|epidemia|hambre|sequía|incendio|bancarrota|derrot|saque|deroga|amenaza|lincha|condenad|cierran/i;
const GOOD = /aprueba|abren|construyen|termina|consiguen|paz|victoria|gana|descubren|aprenden|inventan|festivo|absuelt|nace|cosen|levantan/i;
function headline(p, g, txt){
  const pro = p.official || Math.abs(p.ideo - govIdeo(g)) < .4, t = txt.replace(new RegExp(`^(En|en) ${g.name}[,:]? `), '').replace(/^¡|!$/g, '');
  const short = t.length > 90 ? t.slice(0, 88).replace(/\s\S*$/, '') + '…' : t, cap = capFirst(short);
  if (BAD.test(t)) return pro ? `Sin importancia: ${short}` : `¡${cap}!`;
  if (GOOD.test(t)) return pro ? `¡Gran logro! ${cap}` : `Propaganda: ${short}`;
  return cap;
}
function pressTick(g, dt, people, adults){
  const ps = papersOf(g), at = { x:g.fx * T, y:g.fy * T };
  if ((g.pressT = (g.pressT || 0) - dt) > 0) return;
  g.pressT = 5; const el = 5;
  // Censura: cierran los que no son del gobierno; su director, a juicio
  if (!pressFree(g)) {
    for (const p of ps.filter(p => !p.official)) {
      notify(`En ${g.name} el gobierno cierra «${p.name}»${p.editor && !p.editor.dead ? `; su director, ${p.editor.name}, irá a juicio` : ''}`, at);
      if (p.editor && !p.editor.dead) openTrial(g, p.editor, 'prensa', .9);
    }
    g.papers = ps.filter(p => p.official);
    if (!g.papers.length && hasPress(g) && adults.length >= 10) foundPaper(g, adults, true);
  } else if (ps.some(p => p.official)) { // vuelve la libertad: el oficial deja de serlo
    for (const p of ps) if (p.official) { p.official = false; p.name = p.name.replace('Boletín Oficial', 'Diario'); }
    notify(`En ${g.name} vuelve la libertad de prensa`, at);
  }
  // Nacen periódicos
  const want = adults.length >= 30 ? 3 : adults.length >= 18 ? 2 : 1;
  if (pressFree(g) && hasPress(g) && adults.length >= 10 && g.papers.length < want && Math.random() < el * .02) foundPaper(g, adults, false);
  for (const p of g.papers) if (!p.editor || p.editor.dead || p.editor.vid !== g.id || p.editor.jail) { const nu = adults.filter(u => !u.jail && !u.away).sort((a, b) => Math.abs((a.ideo || 0) - p.ideo) - Math.abs((b.ideo || 0) - p.ideo))[0]; p.editor = nu || null; }
  // Cada día: titular nuevo y lectores (que se acercan poco a poco a las ideas de lo que leen)
  const day = Math.floor(yearT / DAY_LEN);
  if (!g.papers.length || g.pressDay === day) return;
  g.pressDay = day;
  const news = (g.log || []).filter(e => e.d >= day && !/periódico|«.*»/.test(e.txt)).slice(-6);
  for (const p of g.papers) {
    const e = news.length ? news[Math.floor(Math.random() * news.length)] : null;
    if (e) { p.heads.push({ d:day + 1, txt:headline(p, g, e.txt) }); if (p.heads.length > 5) p.heads.shift(); }
    if (e && (!p.lastMsg || day - p.lastMsg >= 3) && Math.random() < .5) { p.lastMsg = day; notify(`${p.name}: «${p.heads[p.heads.length - 1].txt}»`, at); }
    p.readers = 0;
  }
  for (const u of adults) {
    if (!literate(u) || u.jail) continue;
    const p = Math.random() < .75 ? g.papers.slice().sort((a, b) => Math.abs(a.ideo - (u.ideo || 0)) - Math.abs(b.ideo - (u.ideo || 0)))[0] : g.papers[Math.floor(Math.random() * g.papers.length)];
    p.readers++; u.ideo = clamp((u.ideo || 0) + (p.ideo - (u.ideo || 0)) * (p.official ? .05 : .03), -1, 1);
  }
  if (g.papers.some(p => p.official)) g.anger = Math.max(0, (g.anger || 0) - 1); // la propaganda calma (algo)
}
function pressCard(g){
  const ps = papersOf(g);
  if (!ps.length) return hasPaper(g) ? `<h4>Prensa</h4><div class="muted">Aún no hay periódicos${!hasPress(g) ? ' (falta la imprenta)' : pressFree(g) ? '' : ' (hay censura)'}</div>` : '';
  const lean = p => p.official ? 'oficial' : p.party ? `afín a ${esc(p.party)}` : { izq:'de izquierdas', centro:'de centro', der:'de derechas' }[sideOf(p.ideo)];
  return `<h4>Prensa</h4>${pressFree(g) ? '' : '<div class="alert">Censura: solo se publica el periódico del gobierno</div>'}
    ${ps.map(p => `<div style="margin:4px 0"><b>${esc(p.name)}</b> <span class="muted">· ${lean(p)} · ${p.readers} lectores${p.editor ? ` · dirige ${esc(p.editor.name)}` : ''}</span>${p.heads.length ? `<div class="muted" style="font-size:12px">${p.heads.slice(-2).reverse().map(h => `día ${h.d}: «${esc(h.txt)}»`).join('<br>')}</div>` : ''}</div>`).join('')}`;
}
