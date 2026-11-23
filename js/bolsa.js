// Forja de Mundos · Bolsa: un mercado de acciones común a todas las naciones, inversores que van al banco,
// subidas y bajadas por lo que pasa en cada nación, denuncias y sanciones
// ================= Bolsa =================
// Hay una sola bolsa para todo el mundo, con una acción por nación. Cada día su precio sube o baja según cómo le va
// a esa nación (crece, comercia, hace maravillas… o sufre guerras, bancarrotas, disturbios, escándalos). Los precios
// van en comidas, así valen para todas las monedas. Quien tiene ahorros y banco en su pueblo va a invertir; vende si
// gana bastante, si entra en pánico o si necesita el dinero. Si una nación hunde las acciones de otra (atacándola o
// vendiendo en masa), la perjudicada la denuncia y le pone sanciones: no comercian y sus acciones caen.
let market = null;
const newMarket = () => ({ wid:world.mkId, day:-1, stocks:{}, sanctions:[], index:[100] });
function marketOf(){ world.mkId ||= Math.random(); if (!market || market.wid !== world.mkId) market = newMarket(); return market; } // mundo nuevo, bolsa nueva
const nationsLive = () => [...new Set(villages.filter(o => popOf(o)).map(nationOf))];
const stockOf = n => marketOf().stocks[n.id];
const sanctionsOn = () => marketOf().sanctions.filter(s => s.until > yearT);
const sanctionedPair = (a, b) => { const x = nationOf(a).id, y = nationOf(b).id; return x !== y && sanctionsOn().some(s => (s.from === x && s.to === y) || (s.from === y && s.to === x)); };
const pct = x => `${x >= 0 ? '+' : ''}${Math.round(x * 100)} %`;
// Cómo le va a una nación ahora mismo (se compara con el día anterior)
function nationSnap(n){
  const ms = villages.filter(o => popOf(o) && nationOf(o) === n), ecs = ms.filter(o => o.coin).map(ecOf);
  return { pop:ms.reduce((a, o) => a + popOf(o), 0), trades:ms.reduce((a, o) => a + (o.trades || 0), 0), riots:ms.reduce((a, o) => a + (o.riots || 0), 0),
    scandals:ms.reduce((a, o) => a + (o.scandals || 0), 0), wonder:n.wonder != null && !!world.objs[n.wonder], regime:regimeOf(n), ms, ecs };
}
// Una vez al día: se mueven los precios, se avisa de los desplomes y llegan las denuncias
function marketTick(){
  const M = marketOf(), day = Math.floor(yearT / DAY_LEN); if (M.day === day) return; M.day = day;
  const ns = nationsLive(); if (!ns.length) return;
  for (const n of ns) {
    const s = M.stocks[n.id] ||= { name:n.name, price:10, hist:[10], causes:[], flow:0, flowBy:{} };
    const now = nationSnap(n), prev = s.prev; s.name = n.name;
    const causes = [], add = (d, txt, by) => { if (Math.abs(d) > .004) causes.push({ d, txt, by }); };
    if (prev) {
      const gp = (now.pop - prev.pop) / Math.max(10, prev.pop); add(clamp(gp * .4, -.08, .08), gp >= 0 ? 'crece su población' : 'pierde población');
      add(Math.min(.04, Math.max(0, now.trades - prev.trades) * .002), 'comercia');
      if (now.wonder && !prev.wonder) add(.12, 'construye una maravilla');
      if (now.riots > prev.riots) add(-.05 * Math.min(3, now.riots - prev.riots), 'disturbios');
      if (now.scandals > prev.scandals) add(-.08, 'escándalo de corrupción');
      if (now.regime !== prev.regime) add(-.06, `cambio de régimen (${REGIMES[now.regime] || now.regime})`);
    }
    for (const r of rels.values()) if (r.war) { // guerras: quien es atacado cae más, y se apunta quién tuvo la culpa
      const att = villageById(r.war.att), def = villageById(r.war.def); if (!att || !def) continue;
      if (nationOf(def) === n && nationOf(att) !== n) add(-.06, `le ataca ${nationOf(att).name}`, nationOf(att).id);
      else if (nationOf(att) === n) add(-.02, 'está en guerra');
    }
    const infl = Math.max(0, ...now.ecs.map(e => e.infl || 0)); if (infl > .08) add(-infl * .6, 'inflación');
    if (now.ecs.some(e => e.bankruptT != null && yearT - e.bankruptT < DAY_LEN)) add(-.25, 'bancarrota');
    const prot = now.ms.filter(o => o.protest).length; if (prot) add(-.02 * prot, 'manifestaciones');
    if (now.ms.some(o => o.threat && yearT < o.threat.until)) add(-.05, 'ciudad amenazada por su líder');
    for (const sc of sanctionsOn()) if (sc.to === n.id) add(-.03, `sanciones de ${(villageById(sc.from) || {}).name || 'otra nación'}`, sc.from);
    if (!causes.some(c => c.d < 0) && prev && now.pop >= prev.pop) add(.01, 'estabilidad');
    // Lo que compran o venden los inversores también mueve el precio; y siempre hay algo de azar y de vuelta a lo normal
    const cap = Math.max(50, s.price * 40); if (Math.abs(s.flow) > 1) add(clamp(s.flow / cap, -.08, .08), s.flow > 0 ? 'la compran los inversores' : 'los inversores venden');
    let d = causes.reduce((a, c) => a + c.d, 0) + (Math.random() - .5) * .04 - Math.log(s.price / 10) * .04; // con el tiempo, vuelve hacia lo normal
    d = clamp(d, -.35, .2); s.price = Math.max(.5, s.price * (1 + d)); s.last = d;
    s.hist.push(s.price); if (s.hist.length > 30) s.hist.shift();
    s.causes = causes.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3);
    const at = { x:n.fx * T, y:n.fy * T };
    if (d <= -.15) notify(`Bolsa: las acciones de ${n.name} se desploman un ${Math.round(-d * 100)} %${s.causes[0] && s.causes[0].d < 0 ? ` (${s.causes[0].txt})` : ''}`, at);
    else if (d >= .15) notify(`Bolsa: las acciones de ${n.name} suben un ${Math.round(d * 100)} %${s.causes[0] && s.causes[0].d > 0 ? ` (${s.causes[0].txt})` : ''}`, at);
    // Denuncia: una caída fuerte por culpa de otra nación (la ataca o sus inversores venden en masa)
    if (d <= -.08) {
      const spec = Object.entries(s.flowBy).filter(([id, f]) => +id !== n.id && f < -Math.max(20, s.price * 8)).sort((a, b) => a[1] - b[1])[0];
      const culprit = s.causes.find(c => c.by != null && c.by !== n.id && c.d < 0), by = culprit ? culprit.by : spec ? +spec[0] : null;
      if (by != null && !sanctionsOn().some(x => x.from === n.id && x.to === by)) denounce(n, villageById(by), culprit ? culprit.txt : 'especular contra sus acciones');
    }
    s.prev = { pop:now.pop, trades:now.trades, riots:now.riots, scandals:now.scandals, wonder:now.wonder, regime:now.regime };
    s.flow = 0; s.flowBy = {};
  }
  const live = ns.map(n => M.stocks[n.id]).filter(Boolean);
  M.index.push(Math.round(live.reduce((a, s) => a + s.price / 10, 0) / live.length * 100)); if (M.index.length > 30) M.index.shift();
  M.sanctions = M.sanctions.filter(s => s.until > yearT);
}
// La nación perjudicada denuncia a la culpable y le pone sanciones (4 días: sin comercio, peores relaciones, sus acciones caen)
function denounce(n, culprit, why){
  if (!culprit) return; const c = nationOf(culprit); if (c === n) return;
  marketOf().sanctions.push({ from:n.id, to:c.id, until:yearT + DAY_LEN * 4, why, d:Math.floor(yearT / DAY_LEN) + 1 });
  const r = relOf(n, c); r.known = true; r.v = Math.max(-100, r.v - 25); r.reason ||= 'recursos';
  const txt = `${n.name} denuncia a ${c.name} por hundir sus acciones (${why}) y le impone sanciones: se corta el comercio entre ellas`;
  notify(txt, { x:n.fx * T, y:n.fy * T }); lawLog(n, txt);
}
// En el banco: vende lo que conviene vender y, si le sobra dinero, compra
function tradeStocks(v, g){
  const M = marketOf(), P = priceOf(g), me = nationOf(g), hold = v.stocks ||= {}; let msg = null;
  for (const [id, h] of Object.entries(hold)) {
    const s = M.stocks[id]; if (!s) { delete hold[id]; continue; }
    const gain = s.price / h.cost - 1;
    if ((gain > .2 && Math.random() < .6) || gain < -.25 || (v.money || 0) < 2 * P) {
      const n = Math.round(h.q * s.price * P); v.money = (v.money || 0) + n; s.flow -= h.q * s.price; s.flowBy[me.id] = (s.flowBy[me.id] || 0) - h.q * s.price;
      delete hold[id]; msg = [`vende ${s.name} (${pct(gain)})`, gain >= 0 ? '#a8e070' : '#f08a7a'];
      if (gain < -.25 && Math.random() < .3) notify(`${v.name} vende en pánico sus acciones de ${s.name}: pierde un ${Math.round(-gain * 100)} %`, { x:v.x, y:v.y });
    }
  }
  if ((v.money || 0) >= 8 * P) {
    const banned = new Set(sanctionsOn().filter(x => x.from === me.id || x.to === me.id).map(x => x.from === me.id ? x.to : x.from));
    const opts = Object.entries(M.stocks).filter(([id]) => !banned.has(+id) && nationsLive().some(n => n.id === +id));
    if (opts.length) {
      const sc = ([id, s]) => { const h = s.hist, m = h.length > 3 ? h[h.length - 1] / h[h.length - 4] - 1 : 0; return m * 3 + (+id === me.id ? .15 : 0) + Math.random() * .2; };
      const [id, s] = opts.sort((a, b) => sc(b) - sc(a))[0], spend = Math.floor((v.money || 0) * .4), q = spend / P / s.price;
      v.money -= spend; const h = hold[id] ||= { q:0, cost:s.price }; h.cost = (h.cost * h.q + s.price * q) / (h.q + q); h.q += q;
      s.flow += q * s.price; s.flowBy[me.id] = (s.flowBy[me.id] || 0) + q * s.price;
      msg = [`compra ${s.name}`, '#f0d060']; g.investors = (g.investors || 0) + 1;
    }
  }
  if (msg) { floats.push({ x:v.x, y:v.y - 12, txt:msg[0], col:msg[1], life:0 }); snd('coin', v.x, v.y); }
}
// ¿Le apetece ir al banco? (tiene ahorros o acciones que vigilar)
const wantsBolsa = (v, g) => g.coin && hasBank(g) && ageOf(v) >= ADULT_H && ((v.money || 0) >= 8 * priceOf(g) || Object.keys(v.stocks || {}).length) && yearT - (v.bolsaT ?? -1e9) > DAY_LEN * .5;
// Valor de lo que tiene en bolsa, en su moneda, y cuánto gana o pierde
function portfolio(v, g){
  const M = marketOf(), P = g && g.coin ? priceOf(g) : 1; let val = 0, cost = 0; const names = [];
  for (const [id, h] of Object.entries(v.stocks || {})) { const s = M.stocks[id]; if (!s) continue; val += h.q * s.price * P; cost += h.q * h.cost * P; names.push(s.name); }
  return { val:Math.round(val), gain:cost ? val / cost - 1 : 0, names };
}
function stockLine(v, g){
  const p = portfolio(v, g); if (!p.names.length) return '';
  return `<div class="kv"><span>En bolsa</span><b>${p.val} ${g && g.coin ? coinPl(g) : ''} en acciones de ${p.names.map(esc).join(', ')} <span style="color:${p.gain >= 0 ? '#a8e070' : '#f08a7a'}">(${pct(p.gain)})</span></b></div>`;
}
function stockMood(v, g, add){ const p = portfolio(v, g); if (!p.names.length) return; if (p.gain > .2) add(5, 'le va bien en bolsa'); else if (p.gain < -.25) add(-8, 'ha perdido dinero en bolsa'); }
// Panel de economía: la bolsa mundial
function marketCard(g){
  const M = marketOf(), ns = nationsLive().map(n => [n, M.stocks[n.id]]).filter(([, s]) => s); if (!ns.length) return '';
  const h = M.index, mx = Math.max(...h), mn = Math.min(...h), line = h.map((x, k) => `${(k / Math.max(1, h.length - 1) * 160).toFixed(1)},${(28 - (x - mn) / Math.max(1e-6, mx - mn) * 25).toFixed(1)}`).join(' ');
  const mine = villagers.filter(u => !u.dead && u.vid === g.id && Object.keys(u.stocks || {}).length), val = mine.reduce((a, u) => a + portfolio(u, g).val, 0);
  const P = g.coin ? priceOf(g) : 1, me = nationOf(g);
  return `<h4>Bolsa mundial</h4><div class="muted">Índice: ${h[h.length - 1]} puntos · la comparten todas las naciones; cada acción vale lo que le va bien o mal a la suya</div>
    <svg class="spark" viewBox="0 0 160 30" preserveAspectRatio="none"><polyline fill="none" stroke="#7ab0d8" stroke-width="1.2" vector-effect="non-scaling-stroke" points="${line}"/></svg>
    <div class="sec">${ns.sort((a, b) => b[1].price - a[1].price).map(([n, s]) => `<div class="kv"><span>${n === me ? '<b>' : ''}${esc(n.name)}${n === me ? '</b>' : ''}</span><b>${(s.price * P).toFixed(s.price * P < 10 ? 1 : 0)} ${g.coin ? coinPl(g) : 'comidas'} <span style="color:${(s.last || 0) >= 0 ? '#a8e070' : '#f08a7a'}">${pct(s.last || 0)}</span>${s.causes.length ? `<br><span class="muted">${s.causes.map(c => `${c.txt} (${pct(c.d)})`).join(' · ')}</span>` : ''}</b></div>`).join('')}</div>
    ${sanctionsOn().length ? `<div class="sec">${sanctionsOn().map(x => `<div class="alert">${esc((villageById(x.from) || {}).name || '?')} sanciona a ${esc((villageById(x.to) || {}).name || '?')} desde el día ${x.d}: ${esc(x.why)}</div>`).join('')}</div>` : ''}
    <div class="kv"><span>Inversores de ${esc(g.name)}</span><b>${hasBank(g) ? `${mine.length} · ${val} ${g.coin ? coinPl(g) : ''} en acciones` : 'sin banco no se puede invertir'}</b></div>`;
}
