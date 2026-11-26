// World Sim · Susurrar ideas
// ================= Susurros =================
// En la ficha de un aldeano, «Susurrar una idea»: le metes en la cabeza una idea (odio a un vecino, paz, comercio,
// que el gobierno engaña o lo hace bien, repartir la riqueza, más orden, fe, una ley...). Se la cuenta a quien tiene
// cerca y, si le convence (según cómo es cada uno y cómo le va), esa persona también la cree y la sigue contando; con
// las caravanas y los vecinos salta a otros pueblos. Cuando la cree 3 de cada 10 adultos de un pueblo, la idea «cala»
// y pasa algo de verdad: sube la tensión (y puede haber guerra), se firma la paz, salen caravanas, hay protestas, un
// ritual o un partido mete la ley en su programa. Las ideas se olvidan con los días si nadie las sigue contando.
// Los que la creen llevan una lucecita de su color encima, lo dicen en sus bocadillos, y en «Ideas en marcha» se ve
// cuánto se ha extendido cada una.
const IDEA_CALA = .3, IDEA_LIFE = DAY_LEN * 2.5, IDEA_MAX = 6;
const IDEAS = {
  guerra:{ ic:'⚔', col:'#e0604a', name:'Odio al vecino', tgt:'pueblo', say:(t) => `Los de ${t} nos roban`, alt:(t) => [`Hay que darles una lección a los de ${t}`, `No me fío de los de ${t}`],
    eff:'Empeora la relación con ese pueblo. Si cala, la tensión se dispara y puede acabar en guerra' },
  paz:{ ic:'🕊', col:'#8ad0f0', name:'Paz', tgt:'pueblo', say:(t) => `Hay que hacer las paces con ${t}`, alt:(t) => [`Los de ${t} no son tan malos`, 'Ya basta de peleas'],
    eff:'Mejora la relación. Si cala y están en guerra, el pueblo pide la paz y se firma' },
  comercio:{ ic:'⚖', col:'#e8c050', name:'Negocio', tgt:'pueblo', say:(t) => `Con ${t} haríamos buenos negocios`, alt:(t) => [`Dicen que en ${t} pagan bien`, '¡Hay que comerciar más!'],
    eff:'Mejora la relación y, si cala, salen caravanas hacia allí' },
  revuelta:{ ic:'✊', col:'#d8483a', name:'Desconfianza', say:() => 'El gobierno nos engaña', alt:() => ['¿Y si nos están mintiendo?', 'Los de arriba solo miran por ellos'],
    eff:'Se alejan del gobierno al votar. Si cala, salen a protestar a la plaza' },
  apoyo:{ ic:'👑', col:'#7ab04a', name:'Confianza', say:() => 'El gobierno lo está haciendo bien', alt:() => ['Vamos por buen camino', 'Hay que apoyar a los que mandan'],
    eff:'Se acercan al gobierno. Si cala, se calman las protestas y el enfado' },
  reparto:{ ic:'🤝', col:'#e07080', name:'Repartir', say:() => 'Hay que repartir mejor la riqueza', alt:() => ['Unos tanto y otros tan poco...', 'Que paguen más los ricos'],
    eff:'Quien la cree se va hacia la izquierda y vota en consecuencia' },
  orden:{ ic:'🛡', col:'#6a8ad8', name:'Orden', say:() => 'Menos impuestos y más orden', alt:() => ['Aquí falta mano dura', 'Que cada uno se gane lo suyo'],
    eff:'Quien la cree se va hacia la derecha y vota en consecuencia' },
  fe:{ ic:'✨', col:'#f0d070', name:'Fe', say:(t, g) => g && g.faith ? `${g.faith.god} nos está mirando` : 'Los dioses nos miran', alt:(t, g) => ['Hay que rezar más', g && g.faith ? `Ofrezcamos algo a ${g.faith.god}` : 'Algo ahí arriba nos protege'],
    eff:'Más devoción. Si cala, el pueblo celebra un ritual' },
  ley:{ ic:'📜', col:'#c8a0e0', name:'Una ley', tgt:'ley', say:(t) => `Necesitamos la ley de «${t}»`, alt:(t) => [`¿Por qué no aprueban lo de «${t}»?`, `Yo votaré a quien traiga «${t}»`],
    eff:'La votarán. Si cala, un partido la mete en su programa y quien gobierna puede aprobarla' },
};
const ideasOf = () => (world.ideas ||= []);
const ideaById = id => ideasOf().find(I => I.id === id);
const ideaTgtName = I => I.law ? (LAW_TXT[I.law] || I.law) : I.tgt != null ? (villageById(I.tgt) || {}).name || '?' : '';
const ideaSay = (I, v, alt) => { const D = IDEAS[I.k], g = villageById(v ? v.vid : I.vid), t = ideaTgtName(I); return alt ? thPick(D.alt(t, g)) : D.say(t, g); };
const quoted = t => t.includes('«') ? `“${t}”` : `«${t}»`; // (la de la ley ya lleva comillas dentro)
const believes = (v, I) => !!(v.idea && v.idea.id === I.id && !v.dead);
// Lo que le convence a cada uno (0-1): según cómo le va, cómo piensa y cómo es
function ideaRec(u, g, k, I){
  if (!g || ageOf(u) < ADULT_H) return 0;
  const mood = moodOf(u).score / 100, gap = Math.abs((u.ideo || 0) - govIdeo(g)), amb = trait(u, 'ambicion');
  const poor = (u.money || 0) < (g.moneyMed ?? 0) * .6, rich = (u.money || 0) > (g.moneyMed ?? 0) * 2.5;
  let r = .3;
  switch (k) {
    case 'guerra': r = .2 + (1 - mood) * .5 + amb * .25 + (atWarG(g) ? .1 : 0); break;
    case 'paz': r = .3 + (atWarG(g) ? .35 : 0) + (u.mourn && yearT - u.mourn.t < DAY_LEN * 3 ? .2 : 0) + mood * .1; break;
    case 'comercio': r = .3 + amb * .3 + (u.oficio === 'mercader' ? .3 : 0) + (g.coin ? .1 : 0); break;
    case 'revuelta': r = .05 + (1 - mood) * .7 + gap * .35; break;
    case 'apoyo': r = .05 + mood * .65 + (gap < .3 ? .25 : 0); break;
    case 'reparto': r = .2 + (poor ? .35 : 0) - (rich ? .3 : 0) - (u.ideo || 0) * .25; break;
    case 'orden': r = .2 + (rich ? .3 : 0) - (poor ? .15 : 0) + (u.ideo || 0) * .25; break;
    case 'fe': r = .08 + pietyOf(u) * .8; break;
    case 'ley': r = .3 + (I && I.law && typeof lawNeed === 'function' ? clamp(lawNeed(u, g, I.law), -1, 1) * .4 : 0); break;
  }
  return clamp(r, .03, .95);
}
const recWord = r => r > .65 ? 'mucho' : r > .45 ? 'bastante' : r > .25 ? 'poco' : 'nada';
// Al creerla, cambia ya algo en su cabeza
function ideaTouch(u, I){
  const g = villageById(u.vid); if (!g) return;
  if (I.k === 'reparto') u.ideo = clamp((u.ideo || 0) - .18, -1, 1);
  else if (I.k === 'orden') u.ideo = clamp((u.ideo || 0) + .18, -1, 1);
  else if (I.k === 'revuelta') { const gi = govIdeo(g); u.ideo = clamp((u.ideo || 0) + ((u.ideo || 0) >= gi ? .12 : -.12), -1, 1); }
  else if (I.k === 'apoyo') u.ideo = (u.ideo || 0) + (govIdeo(g) - (u.ideo || 0)) * .25;
  else if (I.k === 'fe') u.piety = clamp(pietyOf(u) + .15, 0, 1);
}
function adopt(u, I, s){ u.idea = { id:I.id, s, t:yearT }; I.ever = (I.ever || 0) + 1; ideaTouch(u, I); }
// ---- Susurrar ----
function whisper(v, k, tgt, law){
  const g = villageById(v.vid); if (!g) return null;
  const I = { id:(world.ideaSeq = (world.ideaSeq || 0) + 1), k, tgt:tgt ?? null, law:law || null, vid:g.id, who:v.name, t0:yearT, hit:{}, st:'va', best:0, bestVid:g.id };
  ideasOf().push(I); adopt(v, I, 1); v.ideaSeed = true; I.n = 1; I.towns = 1;
  const D = IDEAS[k], txt = ideaSay(I, v);
  whisperFx.push({ v, t0:performance.now(), col:D.col });
  if (typeof sayList !== 'undefined') { sayList = sayList.filter(s => s.v !== v); sayList.push({ v, txt:`💭 ${txt}`, think:true, t0:performance.now() + 900, t1:performance.now() + 900 + SAY_MS }); v.lastSay = txt; }
  snd('chime', v.x, v.y);
  return I;
}
// ---- El boca a boca (cada segundo) ----
let ideaT = 0;
function ideasTick(dt){
  const L = ideasOf(); if (!L.length) return;
  if ((ideaT -= dt) > 0) return; const step = 1 - ideaT; ideaT = 1;
  const live = new Set(L.filter(I => I.st !== 'fin').map(I => I.id)), byVid = new Map(), bel = [];
  for (const u of villagers) {
    if (u.dead) continue;
    if (u.idea) { if (!live.has(u.idea.id) || yearT - u.idea.t > IDEA_LIFE * (u.ideaSeed ? 1.6 : 1) || yearT < u.idea.t) { u.idea = null; u.ideaSeed = false; } else bel.push(u); }
    if (ageOf(u) >= ADULT_H) { let a = byVid.get(u.vid); if (!a) byVid.set(u.vid, a = []); a.push(u); }
  }
  // Cada creyente, de vez en cuando, se lo cuenta a alguien
  for (const b of bel) {
    if (b.away || b.sleep || b.boat || (b.task && b.task.k === 'detenido')) continue;
    if (Math.random() > step * .05 * (.5 + trait(b, 'sociable')) * (typeof netBoost === 'function' ? netBoost(b) : 1)) continue; // (con redes sociales, mucho más: redes.js)
    const I = ideaById(b.idea.id); if (!I) continue;
    let pool = byVid.get(b.vid) || [];
    const netPick = typeof netPool === 'function' ? netPool(b, byVid) : null; // (por las redes, a cualquier pueblo conectado del mundo)
    if (netPick) pool = netPick;
    else if (Math.random() < .15) { // a otro pueblo: con quien comercian o un vecino cercano
      const g = villageById(b.vid), near = g && villages.filter(o => o !== g && popOf(o) && (Math.hypot(o.fx - g.fx, o.fy - g.fy) < 60 || yearT - (relOf(g, o).tradeT ?? -1e9) < DAY_LEN));
      if (near && near.length) pool = byVid.get(near[Math.floor(Math.random() * near.length)].id) || pool;
    }
    const near = pool.filter(u => u !== b && !u.away && !u.dead && !believes(u, I) && Math.hypot(u.x - b.x, u.y - b.y) < 14 * T);
    const u = near.length && Math.random() < .7 ? near[Math.floor(Math.random() * near.length)] : pool[Math.floor(Math.random() * pool.length)];
    if (!u || u === b || u.away || believes(u, I)) continue;
    const rec = ideaRec(u, villageById(u.vid), I.k, I) * b.idea.s * (u.idea ? .5 : 1), ok = Math.random() < rec * .9;
    if (ok) adopt(u, I, b.idea.s * .92); // (de boca en boca pierde fuerza)
    ideaChat(b, u, I, ok);
  }
  // ¿Ha calado en algún pueblo?
  for (const I of L) {
    if (I.st === 'fin') continue;
    let n = 0, best = 0, bestVid = I.vid;
    const cnt = new Map(); for (const u of bel) if (u.idea.id === I.id) { n++; cnt.set(u.vid, (cnt.get(u.vid) || 0) + 1); }
    for (const [vid, c] of cnt) { const ad = (byVid.get(vid) || []).length || 1, sh = c / ad; if (sh > best) { best = sh; bestVid = vid; } if (sh >= IDEA_CALA && c >= 3 && !I.hit[vid]) { I.hit[vid] = yearT; ideaLands(I, villageById(vid), sh); } }
    I.n = n; I.best = best; I.bestVid = bestVid; I.towns = cnt.size; I.peak = Math.max(I.peak || 0, n);
    if (!n) { I.st = 'fin'; I.endT = yearT; } else if (Object.keys(I.hit).length) I.st = 'cala';
  }
  // Las olvidadas, fuera de la lista al cabo de un día
  world.ideas = L.filter(I => I.st !== 'fin' || yearT - I.endT < DAY_LEN);
  // Lo que se dice en la calle sobre otros pueblos se va olvidando
  for (const g of villages) if (g.ideaRel) for (const id in g.ideaRel) { g.ideaRel[id] *= Math.pow(.997, step); if (Math.abs(g.ideaRel[id]) < .05) delete g.ideaRel[id]; }
}
SYSTEMS.push(dt => ideasTick(dt));
// La charla, en bocadillos (si se ve de cerca)
function ideaChat(b, u, I, ok){
  if (typeof sayList === 'undefined' || zoom < 3 || busy || sayList.length > 9) return;
  const on = v => { const sx = offX + v.x * zoom, sy = offY + v.y * zoom; return sx > 30 && sx < cw - 30 && sy > 150 && sy < ch - 10; };
  if (!on(b) || !on(u) || sayList.some(s => s.v === b || s.v === u)) return;
  const now = performance.now(), txt = ideaSay(I, b, Math.random() < .4);
  sayList.push({ v:b, txt, think:false, t0:now, t1:now + SAY_MS, idea:I.k });
  sayList.push({ v:u, txt:ok ? thPick(['¡Tienes razón!', '¡Eso digo yo!', 'Pues ahora que lo dices...', '¡Es verdad!']) : thPick(['Bah, tonterías', 'No sé yo...', 'Eso no es así', 'Déjame en paz']), think:false, t0:now + 1300, t1:now + 1300 + SAY_MS * .8 });
}
// ---- Cuando cala en un pueblo ----
const GRIEF_ENGANO = 'engaño';
if (typeof GRIEF_TXT !== 'undefined') GRIEF_TXT[GRIEF_ENGANO] = 'que el gobierno les engaña';
function ideaLands(I, g, share){
  if (!g) return;
  const at = { x:g.fx * T, y:g.fy * T }, pct = Math.round(share * 100), quote = quoted(ideaSay(I)), tv = I.tgt != null ? villageById(I.tgt) : null;
  const head = `En ${g.name} ha calado ${I.bulo ? 'el bulo' : 'la idea'} de que ${quote.replace(/^([«“])(.)/, (m, q, c) => q + c.toLowerCase())} (la cree el ${pct} % de los adultos)`;
  const adults = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H);
  let what = '';
  switch (I.k) {
    case 'guerra': case 'paz': case 'comercio': {
      if (!tv || !popOf(tv) || tv === g || sameNation(g, tv)) { what = ''; break; }
      const r = relOf(g, tv), wr = warRel(g, tv);
      (g.ideaRel ||= {});
      if (I.k === 'guerra') { g.ideaRel[tv.id] = (g.ideaRel[tv.id] || 0) - 3; r.v = clamp(r.v - 30, -100, 100); r.reason = 'habladurias'; what = `: la relación con ${tv.name} se hunde${r.v < -45 ? ' y ya se habla de guerra' : ''}`; }
      else if (I.k === 'paz') {
        g.ideaRel[tv.id] = (g.ideaRel[tv.id] || 0) + 3;
        if (wr && wr.war && !wr.war.civil) { const A = villageById(wr.war.att), D = villageById(wr.war.def); if (A && D) { makePeace(A, D, wr, `porque en ${g.name} todo el mundo pide la paz`); what = ''; } }
        else { r.v = clamp(r.v + 30, -100, 100); what = `: mejora mucho la relación con ${tv.name}`; }
      } else { g.ideaRel[tv.id] = (g.ideaRel[tv.id] || 0) + 1.5; r.v = clamp(r.v + 18, -100, 100); r.known = true; r.tradeT = -1e9; what = `: quieren comerciar con ${tv.name} y preparan caravanas`; }
      break;
    }
    case 'revuelta': g.anger = Math.max(g.anger || 0, 45); g.grief = GRIEF_ENGANO; startProtest(g, adults); what = ': salen a protestar a la plaza'; break;
    case 'apoyo': g.anger = (g.anger || 0) * .3; what = ': se calman los ánimos con el gobierno'; break;
    case 'reparto': what = ': votarán más a la izquierda'; break;
    case 'orden': what = ': votarán más a la derecha'; break;
    case 'fe': if (g.faith) { startRitual(g, 'porque se ha corrido la voz de que los dioses les miran'); what = ''; } else what = ': buscan a quién rezar'; break;
    case 'ley': what = ideaLaw(I, g, share, adults); break;
  }
  notify(head + what, at);
}
// La ley: el partido que más se parece a los que la creen la mete en su programa; si es el que gobierna (o la cree la mitad), se aprueba
function ideaLaw(I, g, share, adults){
  const n = nationOf(g), law = I.law; if (!law || !n.parties || !n.parties.length) return ': pero allí no hay partidos que la puedan llevar';
  if (typeof REGIME_LAWS !== 'undefined' && REGIME_LAWS[n.regime]) return `: pero en ${regimeName(g).toLowerCase()} las leyes no se votan`;
  if (lawsOf(g).includes(law)) return ': y ya la tienen';
  const bel = adults.filter(u => believes(u, I)), ideo = bel.reduce((a, u) => a + (u.ideo || 0), 0) / Math.max(1, bel.length);
  const P = n.parties.slice().sort((a, b) => Math.abs(a.ideo - ideo) - Math.abs(b.ideo - ideo))[0], ruling = n.ruling != null ? n.parties[n.ruling] : null;
  if (!P.laws.includes(law)) { P.laws.push(law); if (P.laws.length > 6) P.laws.splice(0, 1); }
  if (ruling && (ruling === P || share >= .5) && !ruling.laws.includes(law)) { ruling.laws.push(law); if (ruling.laws.length > 6) ruling.laws.splice(0, 1); }
  if (ruling && ruling.laws.includes(law)) { const txt = `En ${n.name} se aprueba la ley de «${LAW_TXT[law] || law}» por la presión de la calle`; lawLog(n, txt); return `: ${artP(ruling)} ${ruling.name} cede y la aprueba`; }
  return `: ${artP(P)} ${P.name} la mete en su programa`;
}
// En las votaciones, quien cree en la ley la quiere más
{ const base = lawNeed; lawNeed = function(u, g, law){ const r = base.apply(this, arguments); if (u.idea) { const I = ideaById(u.idea.id); if (I && I.k === 'ley' && I.law === law) return r + 1; } return r; }; }
// Lo que se dice en la calle de otro pueblo (desde las relaciones de diploTick)
const ideaPull = (a, b) => ((a.ideaRel || {})[b.id] || 0) + ((b.ideaRel || {})[a.id] || 0);
// Lo dice en sus bocadillos
{ const base = thoughtOf; thoughtOf = function(v){
  if (v.idea && !v.sleep && Math.random() < .5) { const I = ideaById(v.idea.id); if (I && I.st !== 'fin') return { txt:ideaSay(I, v, Math.random() < .4), mood:0, think:Math.random() < .5 }; }
  return base.apply(this, arguments);
}; }
// ---- Dibujo: la lucecita de los que la creen y el destello al susurrar ----
let whisperFx = [];
{ const base = drawThoughts; drawThoughts = function(){
  const now = performance.now();
  if (zoom >= 2 && ideasOf().length && !busy) {
    const [vx0, vy0, vx1, vy1] = visibleRect();
    for (const v of villagers) {
      if (!v.idea || v.dead || v.away || v.boat || (v.sleep && v.home != null) || v.x < vx0 || v.x > vx1 || v.y < vy0 || v.y > vy1) continue;
      const I = ideaById(v.idea.id); if (!I) continue;
      const D = IDEAS[I.k], sx = offX + v.x * zoom, sy = offY + (v.y - 11 - (v.mount ? 6 : 0)) * zoom - 2 - Math.sin(now / 300 + v.x) * 1.5, r = Math.max(2.2, zoom * .55);
      vctx.globalAlpha = .35; vctx.fillStyle = D.col; vctx.beginPath(); vctx.arc(sx, sy, r * 2, 0, Math.PI * 2); vctx.fill();
      vctx.globalAlpha = 1; vctx.beginPath(); vctx.arc(sx, sy, r, 0, Math.PI * 2); vctx.fill(); vctx.strokeStyle = 'rgba(255,255,255,.85)'; vctx.lineWidth = 1; vctx.stroke();
      if (v.ideaSeed) { vctx.strokeStyle = 'rgba(255,230,140,.9)'; vctx.beginPath(); vctx.arc(sx, sy, r + 2.5, 0, Math.PI * 2); vctx.stroke(); } // quien la oyó primero
    }
  }
  // El susurro: una espiral de chispas que baja hasta su cabeza y un anillo
  whisperFx = whisperFx.filter(f => now - f.t0 < 1600 && !f.v.dead);
  for (const f of whisperFx) {
    const k = (now - f.t0) / 1600, hx = offX + f.v.x * zoom, hy = offY + (f.v.y - 10) * zoom;
    for (let p = 0; p < 10; p++) {
      const q = clamp(k * 1.6 - p * .06, 0, 1); if (q <= 0 || q >= 1) continue;
      const a = p * .63 + q * 6, rad = (1 - q) * 40, x = hx + Math.cos(a) * rad, y = hy - (1 - q) * 90 + Math.sin(a) * rad * .4;
      vctx.globalAlpha = 1 - q * .5; vctx.fillStyle = p % 2 ? '#fff4c0' : f.col; vctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    if (k > .55) { const q = (k - .55) / .45; vctx.globalAlpha = 1 - q; vctx.strokeStyle = f.col; vctx.lineWidth = 2; vctx.beginPath(); vctx.arc(hx, hy + 4, 6 + q * 26, 0, Math.PI * 2); vctx.stroke(); }
  }
  vctx.globalAlpha = 1;
  return base.apply(this, arguments);
}; }
// ---- Interfaz: el panel para susurrar ----
let whisperV = null, whisperSel = null;
const whisperTargets = g => villages.filter(o => o !== g && popOf(o) && !sameNation(o, g) && relOf(g, o).known).sort((a, b) => relOf(g, a).v - relOf(g, b).v);
const whisperLaws = g => Object.keys(LAW_TXT).filter(l => (typeof lawAwake !== 'function' || lawAwake(g, l)) && !lawsOf(g).includes(l));
function whisperOpen(v){
  if (!v || v.dead) return; whisperV = v; whisperSel = null;
  let el = $('whisper'); if (!el) { el = document.createElement('div'); el.id = 'whisper'; el.className = 'wh-wrap'; $('pcard').parentElement.appendChild(el); el.addEventListener('click', whisperClick); el.addEventListener('change', whisperChange); el.addEventListener('keydown', e => { if (e.key === 'Escape') whisperClose(); if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('wh-card')) { e.preventDefault(); e.target.click(); } }); }
  el.hidden = false; whisperRender(); const f = el.querySelector('.wh-card'); if (f) f.focus();
}
function whisperClose(){ const el = $('whisper'); if (el) el.hidden = true; whisperV = null; }
function whisperDefault(k, g, v){
  const T0 = whisperTargets(g);
  if (k === 'guerra') return T0[0] ? T0[0].id : null;
  if (k === 'paz') { const w = T0.find(o => { const r = warRel(g, o); return r && r.war; }); return (w || T0[0] || {}).id ?? null; }
  if (k === 'comercio') { const c = T0.slice().reverse().find(o => !relOf(g, o).route) || T0[T0.length - 1]; return c ? c.id : null; }
  if (k === 'ley') { const L = whisperLaws(g); return L.sort((a, b) => lawNeed(v, g, b) - lawNeed(v, g, a))[0] || null; }
  return null;
}
function whisperRender(){
  const el = $('whisper'), v = whisperV; if (!el || !v) return;
  const g = villageById(v.vid); if (!g) { whisperClose(); return; }
  const mood = moodOf(v), adults = villagers.filter(u => !u.dead && u.vid === g.id && ageOf(u) >= ADULT_H), cur = v.idea && ideaById(v.idea.id);
  const sel = whisperSel || {}, active = ideasOf().filter(I => I.st !== 'fin' && !I.bulo).length; // (los bulos de las redes no cuentan)
  const cards = Object.entries(IDEAS).map(([k, D]) => {
    let tgt = sel.k === k ? sel.tgt : undefined; if (tgt === undefined) tgt = whisperDefault(k, g, v);
    const opts = D.tgt === 'pueblo' ? whisperTargets(g) : D.tgt === 'ley' ? whisperLaws(g) : null;
    const off = opts && !opts.length;
    const I = { k, tgt:D.tgt === 'pueblo' ? tgt : null, law:D.tgt === 'ley' ? tgt : null, vid:g.id };
    const me = ideaRec(v, g, k, I), town = adults.length ? adults.reduce((a, u) => a + ideaRec(u, g, k, I), 0) / adults.length : 0;
    const t = D.tgt ? (D.tgt === 'ley' ? LAW_TXT[tgt] || '…' : (villageById(tgt) || {}).name || '…') : '';
    const pick = opts && !off ? `<select class="wh-sel" data-k="${k}" aria-label="${D.tgt === 'ley' ? 'Qué ley' : 'Qué pueblo'}">${D.tgt === 'ley' ? opts.map(l => `<option value="${l}"${l === tgt ? ' selected' : ''}>${esc(LAW_TXT[l] || l)}</option>`).join('') : opts.map(o => { const r = relOf(g, o), wr = warRel(g, o); return `<option value="${o.id}"${o.id === tgt ? ' selected' : ''}>${esc(o.name)}${nationOf(o) !== o ? ` (${esc(nationOf(o).name)})` : ''} · ${wr && wr.war ? 'en guerra' : relWord(r)}</option>`; }).join('')}</select>` : '';
    return `<div class="wh-card${sel.k === k ? ' on' : ''}${off ? ' off' : ''}" data-k="${k}" role="button" tabindex="${off ? -1 : 0}" aria-pressed="${sel.k === k}" style="--c:${D.col}">
      <div class="wh-top"><span class="wh-ic">${D.ic}</span><b>${D.name}</b></div>
      <div class="wh-say">${esc(quoted(off ? D.say('…', g) : D.say(t, g)))}</div>${pick}
      <div class="wh-eff">${off ? (D.tgt === 'ley' ? 'No hay leyes nuevas que pedir aquí' : 'Aún no conocen a ningún pueblo de fuera') : D.eff}</div>
      <div class="wh-rec"><span>A ${sexW(v, 'él', 'ella')} le convence <b>${recWord(me)}</b></span><span class="wh-m"><i style="width:${Math.round(me * 100)}%"></i></span>
        <span>En ${esc(g.name)}, receptivos</span><span class="wh-m town"><i style="width:${Math.round(town * 100)}%"></i></span></div></div>`;
  }).join('');
  const D = sel.k && IDEAS[sel.k], prevTxt = D ? D.say(D.tgt === 'ley' ? LAW_TXT[sel.tgt] || '…' : D.tgt ? (villageById(sel.tgt) || {}).name || '…' : '', g) : '';
  const html = `<div class="wh-back" data-wclose></div><div class="wh" role="dialog" aria-modal="true" aria-label="Susurrar una idea a ${esc(v.name)}">
    <div class="wh-h"><img class="pp" src="${portraitUrl(v, 4)}" alt=""><div><div class="wh-kick">💭 Susurrar una idea</div><h3>${esc(v.name)}</h3><div class="muted">${esc(g.name)} · ${mood.word.toLowerCase()} · ${esc(ageOf(v) < ADULT_H ? 'pequeñ' + sexW(v, 'o', 'a') : oficioTxt(v) || 'sin oficio')}</div></div><button class="x" data-wclose aria-label="Cerrar">×</button></div>
    <p class="wh-intro">Le metes una idea en la cabeza. Se la contará a quien tenga cerca y, si les convence, la irán contando. Cuando la crea <b>3 de cada 10</b> adultos de un pueblo, la idea <b>cala</b> y pasa algo de verdad.</p>
    <div class="wh-now">${cur ? `<span class="wh-chip" style="--c:${IDEAS[cur.k].col}">${IDEAS[cur.k].ic} Ya cree que ${esc(quoted(ideaSay(cur, v)))}</span> <span class="muted">(si le susurras otra, la cambia)</span>` : mood.bad.length ? `<span class="muted">Ahora mismo le preocupa:</span> ${esc(mood.bad.slice(0, 2).join(' · '))}` : `<span class="muted">Ahora mismo está ${mood.word.toLowerCase()}.</span>`}</div>
    <div class="wh-grid">${cards}</div>
    <div class="wh-foot"><div class="wh-prev">${D ? `<span class="wh-bub">${esc(quoted(prevTxt))}</span>` : '<span class="muted">Elige una idea</span>'}</div>
      <button class="wh-go" data-wgo ${!D || active >= IDEA_MAX ? 'disabled' : ''}>${active >= IDEA_MAX ? `Ya hay ${IDEA_MAX} ideas en marcha` : '💭 Susurrar'}</button></div></div>`;
  if (el._html !== html) { const sc = el.querySelector('.wh'), top = sc ? sc.scrollTop : 0, foc = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null; el.innerHTML = html; el._html = html; const s2 = el.querySelector('.wh'); if (s2) s2.scrollTop = top; if (foc) { const f = el.querySelector(`.wh-card[data-k="${foc}"]`); if (f) f.focus(); } }
}
function whisperClick(e){
  if (e.target.closest('[data-wclose]')) { whisperClose(); return; }
  if (e.target.closest('select')) return;
  const c = e.target.closest('.wh-card');
  if (c && !c.classList.contains('off')) { const k = c.dataset.k; whisperSel = { k, tgt:whisperSel && whisperSel.k === k ? whisperSel.tgt : whisperDefault(k, villageById(whisperV.vid), whisperV) }; whisperRender(); return; }
  if (e.target.closest('[data-wgo]') && whisperSel && whisperV) {
    const D = IDEAS[whisperSel.k], v = whisperV, t = whisperSel.tgt;
    if (D.tgt && t == null) return;
    whisper(v, whisperSel.k, D.tgt === 'pueblo' ? +t : null, D.tgt === 'ley' ? t : null);
    whisperClose(); ideaTrackOpen = true; ideaTrackRender(true);
  }
}
function whisperChange(e){
  const s = e.target.closest('.wh-sel'); if (!s) return;
  const k = s.dataset.k, D = IDEAS[k]; whisperSel = { k, tgt:D.tgt === 'pueblo' ? +s.value : s.value }; whisperRender();
}
// ---- En la ficha del aldeano: el botón y la idea que cree ----
function ideaCardHtml(v){
  const I = v.idea && ideaById(v.idea.id), D = I && IDEAS[I.k];
  return `<div class="wh-pc">${I ? `<span class="wh-chip" style="--c:${D.col}" title="${v.ideaSeed ? 'Se la susurraste tú' : 'Se la contó alguien'}">${D.ic} Cree que ${esc(quoted(ideaSay(I, v)))}</span>` : ''}${v.born !== undefined && !v.dead ? `<button class="wh-btn" data-whisper type="button">💭 Susurrar una idea</button>` : ''}</div>`;
}
$('pcard').addEventListener('click', e => { if (e.target.closest('[data-whisper]') && follow) whisperOpen(follow); });
// ---- Ideas en marcha: el seguimiento ----
let ideaTrackOpen = true, ideaTrackT = 0;
function ideaTrackRender(force){
  let el = $('ideaTrack');
  const L = ideasOf();
  if (!L.length) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'ideaTrack'; el.className = 'itrack'; $('pcard').parentElement.appendChild(el); el.addEventListener('click', ideaTrackClick); }
  el.hidden = false;
  const rows = L.slice().reverse().map(I => {
    const D = IDEAS[I.k], g = villageById(I.bestVid ?? I.vid), pct = Math.round((I.best || 0) * 100), fill = clamp((I.best || 0) / IDEA_CALA, 0, 1);
    const hits = Object.keys(I.hit).map(id => (villageById(+id) || {}).name).filter(Boolean);
    const st = I.st === 'fin' ? `<span class="it-st fin">Se ha olvidado${I.peak ? ` (llegó a ${I.peak})` : ''}</span>` : hits.length ? `<span class="it-st ok">¡Ha calado en ${esc(hits.slice(0, 3).join(', '))}${hits.length > 3 ? '…' : ''}!</span>` : `<span class="it-st">Se extiende</span>`;
    return `<div class="it-row${I.st === 'fin' ? ' fin' : ''}" style="--c:${D.col}"><span class="it-ic">${D.ic}</span><div class="it-b"><b>${esc(quoted(ideaSay(I)))}</b>
      <span class="muted">${I.bulo ? `📱 bulo viral de las redes (empezó con ${esc(I.who)})` : `se la susurraste a ${esc(I.who)}`} · ${esc((villageById(I.vid) || {}).name || '')}</span>
      ${I.st === 'fin' ? '' : `<span class="it-bar" title="${pct} % en ${esc(g ? g.name : '')}: cala al ${Math.round(IDEA_CALA * 100)} %"><i style="width:${Math.round(fill * 100)}%"></i></span>
      <span class="it-n">${I.n || 0} la creen${I.towns > 1 ? ` en ${I.towns} pueblos` : ''} · ${pct} % en ${esc(g ? g.name : '?')}</span>`}${st}</div>
      <div class="it-act">${I.st === 'fin' ? '' : `<button data-ifollow="${I.id}" title="Ver a alguien que la cree" aria-label="Ver a alguien que la cree">👁</button>`}<button data-idrop="${I.id}" title="${I.st === 'fin' ? 'Quitar de la lista' : 'Que la olviden'}" aria-label="Quitar">×</button></div></div>`;
  }).join('');
  const html = `<div class="it-h"><b>💭 Ideas en marcha</b><span class="muted">${L.filter(I => I.st !== 'fin' && !I.bulo).length}/${IDEA_MAX}</span><button class="it-min" data-itog aria-expanded="${ideaTrackOpen}" title="${ideaTrackOpen ? 'Plegar' : 'Desplegar'}">${ideaTrackOpen ? '–' : '+'}</button></div>${ideaTrackOpen ? `<div class="it-list">${rows}</div>` : ''}`;
  if (force || el._html !== html) { el.innerHTML = html; el._html = html; }
}
function ideaTrackClick(e){
  if (e.target.closest('[data-itog]')) { ideaTrackOpen = !ideaTrackOpen; ideaTrackRender(true); return; }
  const f = e.target.closest('[data-ifollow]'); if (f) { const id = +f.dataset.ifollow, bs = villagers.filter(u => !u.dead && !u.away && u.idea && u.idea.id === id); const u = bs.find(x => x.ideaSeed) || bs[Math.floor(Math.random() * bs.length)]; if (u) { setFollow(u); if (zoom < 4) zoom = 4; } return; }
  const d = e.target.closest('[data-idrop]'); if (d) { const id = +d.dataset.idrop; for (const u of villagers) if (u.idea && u.idea.id === id) { u.idea = null; u.ideaSeed = false; } world.ideas = ideasOf().filter(I => I.id !== id); ideaTrackRender(true); }
}
SYSTEMS.push(dt => { if ((ideaTrackT -= dt) > 0) return; ideaTrackT = .5; try { ideaTrackRender(); } catch (e) { console.error(e); } if (whisperV && whisperV.dead) whisperClose(); });
