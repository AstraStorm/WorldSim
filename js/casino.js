// World Sim · El casino: tragaperras, ruleta, blackjack, bingo y póquer
// ================= Casino =================
// · Con moneda y bastante gente, el pueblo levanta un casino (una institución más: instituciones.js)
// · En su tiempo libre, quien tiene dinero va a jugar: la mayoría apuesta poco y pierde o gana algo, pero hay jugadores
//   empedernidos que se lo juegan todo (y se arruinan persiguiendo lo perdido) y, de vez en cuando, alguien se lleva el
//   bote y se hace rico
// · La banca siempre gana un poco: cada juego tiene su ventaja para la casa. Lo que gana el casino va a su dueño (la
//   persona más rica que lo compra) y una parte al tesoro en impuestos; con economía estatal, todo al tesoro
// · En la ficha del casino se ve cuánto se apuesta, cuánto se paga y cuánto gana la casa en cada juego
// · Ley de prohibición del juego: el casino cierra (las teocracias la llevan siempre)
const GAMES = {
  tragaperras:{ name:'Tragaperras', ic:'🎰', bet:[.04, .12], roll:() => { const r = Math.random(); return r < .003 ? 100 : r < .023 ? 10 : r < .223 ? 2 : 0; } }, // ventaja de la casa ≈ 10 %
  ruleta:{ name:'Ruleta', ic:'🎡', bet:[.08, .25], roll:() => Math.random() < .7 ? (Math.random() < 18 / 37 ? 2 : 0) : (Math.random() < 1 / 37 ? 36 : 0) }, // ≈ 2,7 %
  blackjack:{ name:'Blackjack', ic:'🂡', bet:[.1, .3], roll:() => { const r = Math.random(); return r < .045 ? 2.5 : r < .44 ? 2 : r < .52 ? 1 : 0; } }, // ≈ 1,7 %
  bingo:{ name:'Bingo', ic:'🔢', bet:[.02, .06], roll:() => { const r = Math.random(); return r < .03 ? 22 : r < .15 ? 1.5 : 0; } }, // ≈ 16 %
  poquer:{ name:'Póquer', ic:'♠', bet:[.1, .4], roll:() => Math.random() < .48 ? 1.9 : 0 }, // la casa se queda una comisión: ≈ 9 %
};
INSTS.casino = { key:'casino:casino', field:'casino', wood:14, stone:22, gold:2, flag:[.5, 0], t:16, name:'un casino', why:'abre sus mesas de ruleta, blackjack, póquer y bingo, y sus tragaperras',
  want:g => !!g.coin && popOf(g) >= 22 && !hasLaw(g, 'prohibir_juego') && (g.know || {}).escritura, w:g => popOf(g) >= 40 ? 6 : 4 };
KIND_DIMS.casino = [5, 7]; TASK_KIND.casino = 'casino'; OBJ['casino:casino'] = ['Casino', 'house', 0]; BLD.add('casino'); SPRITE_ALIAS['casino:casino'] = 'tavern:taberna';
Object.assign(LAW_TXT, { prohibir_juego:'prohibición del juego' }); Object.assign(LAW_DESC, { prohibir_juego:'el casino cierra: nadie se arruina jugando, pero el tesoro deja de cobrar' }); Object.assign(LAW_LEAN, { prohibir_juego:.3 });
REGIME_LAWS.teocracia.push('prohibir_juego');
const casinoOpen = g => hasInst(g, 'casino') && !hasLaw(g, 'prohibir_juego');
const casinoDoor = g => { const i = g.casino; return [(i % W) * T + 2, ((i / W) | 0) * T + 6]; };
// ¿Quién va a jugar? Cada persona tiene su carácter: la mayoría juega de vez en cuando; algunos, mucho
const gamblerOf = v => v.gamb ??= Math.random() < .08 ? 2 : Math.random() < .35 ? 1 : 0; // 2: empedernido, 1: de vez en cuando, 0: nunca
function casinoTick(g, dt, people){
  if (!g.casino) return;
  if ((g.casT = (g.casT ?? Math.random() * 15) - dt) > 0) return; g.casT = 15;
  if (!casinoOpen(g)) return;
  const [dx, dy] = casinoDoor(g), at = { x:dx, y:dy }, S = g.casStats ||= {};
  // Los que ya han llegado a la puerta: juegan
  for (const v of people) {
    if (!v.casGo) continue;
    const t = v.task; if (!t || t.k !== 'guardia' || !t.casino) { v.casGo = null; continue; }
    if (Math.hypot(v.x - dx, v.y - dy) > 10 && yearT - v.casGo.t < DAY_LEN * .2) continue;
    playCasino(v, g, S, v.casGo.game, at); v.casGo = null; v.task = null; v.actT = 0;
  }
  // Los que van: en su tiempo libre, con dinero, y más de noche
  const night = isNight(), free = people.filter(v => ageOf(v) >= ADULT_H && !v.away && !v.boat && !v.sleep && !v.slave && !inCamp(v) && !v.casGo && (v.money || 0) >= 3 && gamblerOf(v) > 0
    && (!v.task || ['pasear', 'ocio', 'ir_taberna', 'volver'].includes(v.task.k)));
  const want = Math.min(free.length, Math.round((night ? 3 : 1) + Math.random() * 2));
  for (const v of free.sort(() => Math.random() - .5).slice(0, want)) {
    if (gamblerOf(v) === 1 && Math.random() < .6) continue;
    const keys = Object.keys(GAMES), game = (v.money || 0) > 60 ? (Math.random() < .5 ? 'poquer' : 'blackjack') : keys[Math.floor(Math.random() * keys.length)];
    releaseTask(v); v.task = { k:'guardia', casino:true, x:dx + (Math.random() - .5) * 8, y:dy + 2 + Math.random() * 3, until:yearT + DAY_LEN * .25 }; v.lastD = Infinity;
    v.casGo = { game, t:yearT };
  }
}
function playCasino(v, g, S, game, at){
  const G = GAMES[game], s = S[game] ||= { bets:0, staked:0, paid:0, players:0, jack:0 }, addict = gamblerOf(v) === 2;
  const lost = v.casLost || 0, frac = addict ? Math.min(.9, .25 + Math.random() * .3 + lost / Math.max(20, (v.money || 0) * 3)) : G.bet[0] + Math.random() * (G.bet[1] - G.bet[0]); // el empedernido persigue lo perdido
  const before = v.money || 0, rounds = addict ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2);
  let net = 0, best = 0;
  for (let k = 0; k < rounds && (v.money || 0) >= 1; k++) {
    const bet = Math.max(1, Math.floor((v.money || 0) * frac)), m = G.roll(), win = Math.floor(bet * m);
    v.money -= bet; v.money += win; net += win - bet; best = Math.max(best, m);
    s.bets++; s.staked += bet; s.paid += win;
  }
  s.players++;
  const house = -net; if (house) casinoProfit(g, house);
  v.casLost = Math.max(0, lost - net); v.casNet = (v.casNet || 0) + net;
  floats.push({ x:v.x, y:v.y - 14, txt:net > 0 ? `+${net}` : net < 0 ? `${net}` : '=', col:net > 0 ? '#f0d060' : '#d88a7a', life:0 });
  const avg = wageOf(g, 1) || 5;
  if (net >= avg * 25 || best >= 36) { // el bote
    s.jack++; v.casLost = 0; v.casRich = yearT;
    notify(`¡${v.name} gana ${best >= 100 ? 'el bote de las tragaperras' : best >= 36 ? 'a la ruleta con un pleno' : best >= 22 ? 'el bingo' : `una fortuna al ${G.name.toLowerCase()}`} en el casino de ${g.name}: ${net} ${coinPl(g)}!`, at);
  } else if (before >= avg * 4 && (v.money || 0) < 1) { // lo pierde todo
    v.casRuin = yearT; v.ideo = clamp((v.ideo || 0) - .05, -1, 1);
    notify(`${v.name} lo pierde todo en ${G.name === 'Bingo' ? 'el bingo' : 'la ' + G.name.toLowerCase().replace('la ', '')} del casino de ${g.name}: ${before} ${coinPl(g)}${addict ? '. Ya no puede dejar de jugar' : ''}`, at);
  }
}
// Lo que gana (o pierde) la casa: una parte al tesoro y el resto al dueño, que con el tiempo se hace rico
function casinoProfit(g, amt){
  const ec = ecOf(g); if (!ec) return;
  if (hasLaw(g, 'estatal') || regimeOf(g) === 'socialismo' || regimeOf(g) === 'comunismo') { ec.treas += amt; g.casTreas = (g.casTreas || 0) + amt; return; }
  const own = casinoOwner(g), tax = amt > 0 ? Math.round(amt * (hasLaw(g, 'impuestos_altos') ? .5 : .3)) : 0;
  ec.treas += tax; g.casTreas = (g.casTreas || 0) + tax;
  if (own) { own.money = (own.money || 0) + amt - tax; own.casOwn = (own.casOwn || 0) + amt - tax; } else ec.treas += amt - tax;
}
function casinoOwner(g){
  const byPid = peopleByPid(g);
  let o = g.casOwner != null ? byPid.get(g.casOwner) : null;
  if (!o) { // lo compra quien más dinero tiene
    o = [...byPid.values()].filter(u => ageOf(u) >= ADULT_H && !u.slave).sort((a, b) => (b.money || 0) - (a.money || 0))[0];
    if (o) { g.casOwner = pidOf(o); notify(`${o.name} se queda con el casino de ${g.name}`, { x:o.x, y:o.y }); }
  }
  return o;
}
// Ánimo: a quien le ha tocado, contento; a quien se ha arruinado, hundido
{ const base = socialMood; socialMood = function(v, g, add){
  base(v, g, add);
  if (v.casRuin != null && yearT - v.casRuin < DAY_LEN * 3) add(-12, 'lo ha perdido todo en el casino');
  else if (v.casRich != null && yearT - v.casRich < DAY_LEN * 3) add(10, 'le ha tocado el bote en el casino');
}; }
// La ficha del casino: cuánto se juega en cada mesa
function casinoKv(g, kv){
  const S = g.casStats || {}, own = g.casOwner != null ? peopleByPid(g).get(g.casOwner) : null;
  let h = kv('Estado', casinoOpen(g) ? 'abierto' : 'cerrado por la prohibición del juego');
  h += kv('Dueño', hasLaw(g, 'estatal') || ['socialismo', 'comunismo'].includes(regimeOf(g)) ? 'el estado' : own ? `${esc(own.name)} (lleva ganado ${own.casOwn || 0} ${esc(g.coin)})` : 'nadie aún');
  h += kv('Al tesoro', `${g.casTreas || 0} ${esc(g.coin)}`);
  const rows = Object.entries(GAMES).map(([k, G]) => { const s = S[k] || { bets:0, staked:0, paid:0, players:0, jack:0 }, net = s.staked - s.paid;
    return `<tr><td>${G.ic} ${G.name}</td><td>${s.players}</td><td>${s.staked}</td><td>${s.paid}</td><td style="color:${net >= 0 ? '#8ad07a' : '#e08070'}">${net >= 0 ? '+' : ''}${net}</td><td>${s.jack}</td></tr>`; }).join('');
  const tot = Object.values(S).reduce((a, s) => a + s.staked - s.paid, 0);
  h += `<table class="cas-t"><tr><th>Juego</th><th>Jugadores</th><th>Apostado</th><th>Pagado</th><th>Casa</th><th>Botes</th></tr>${rows}<tr class="tot"><td>Total</td><td></td><td></td><td></td><td>${tot >= 0 ? '+' : ''}${tot}</td><td></td></tr></table>`;
  const ppl = villagers.filter(u => !u.dead && u.vid === g.id && u.casNet);
  const top = ppl.slice().sort((a, b) => b.casNet - a.casNet)[0], bot = ppl.slice().sort((a, b) => a.casNet - b.casNet)[0];
  if (top && top.casNet > 0) h += kv('El que más ha ganado', `${esc(top.name)} (+${top.casNet})`);
  if (bot && bot.casNet < 0) h += kv('El que más ha perdido', `${esc(bot.name)} (${bot.casNet})`);
  return h;
}
