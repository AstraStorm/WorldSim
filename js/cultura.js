// World Sim · Cultura (libros, leyendas y estatuas), pensiones, guerras santas y cismas
// ================= Cultura =================
// · Con escritura, de vez en cuando alguien escribe una obra (poema, cantar, novela, crónica, teatro) sobre algo que
//   les ha pasado, en su lengua; las grandes desgracias se vuelven leyendas
// · A los héroes (quien funda una colonia, quien rescata a un preso, los primeros del mundo en un descubrimiento) se les
//   levanta una estatua junto a la plaza
// · Pensiones (ley, o en el socialismo y el comunismo): los mayores dejan de trabajar y cobran del tesoro (si no llega,
//   deuda o moneda impresa). Sin pensiones, donde hay muchos mayores, la gente lo pide en la calle
// · Religión: con teocracia o fe oficial, la otra fe del vecino enfada mucho más (y las guerras por religión son guerras
//   santas). Una fe extendida por muchos pueblos puede partirse en un cisma: los reformados ya no son de los suyos
const WORK_KIND = ['poema', 'cantar', 'novela', 'crónica', 'obra de teatro'];
function workTitle(g, e){
  const t = e ? e.txt : '', m = s => t.match(s);
  let w;
  if (m(/guerra a ([^!.:]+)/)) w = `la guerra contra ${m(/guerra a ([^!.:]+)/)[1].split(' ')[0]}`;
  else if (/meteorito/.test(t)) w = 'la piedra que cayó del cielo';
  else if (/epidemia|enferm/.test(t)) w = 'los días de la fiebre';
  else if (/independiza|referéndum/.test(t)) w = 'la libertad';
  else if (/volcán|erupción/.test(t)) w = 'la montaña de fuego';
  else if (/terremoto/.test(t)) w = 'el día que tembló la tierra';
  else if (/colonia/.test(t)) w = 'los que cruzaron el mar';
  else if (/globo/.test(t)) w = 'los que volaron';
  else if (/paz/.test(t)) w = 'la paz';
  else if (/espía|comando/.test(t)) w = 'el espía';
  else w = ['el río', 'nuestros abuelos', 'el invierno largo', 'la primera hoguera', g.name][Math.floor(Math.random() * 5)];
  return capFirst(w);
}
// Una estatua junto a la plaza para un héroe (si tienen piedra)
function addHero(g, u, why){
  if (!g || !u || !popOf(g)) return; (g.heroes ||= []).push({ name:u.name, why, d:Math.floor(yearT / DAY_LEN) + 1 });
  if (g.stone < 8 || !g.plaza) return;
  const p = statueSpot(g); // en una esquina de la plaza, separada de las demás y sin pasarse (devocion.js)
  if (!p) return; const i = p[1] * W + p[0];
  world.objs[i] = { key:'obelisk:monumento', v:0, ox:0, oy:0, vid:g.id, hero:u.name }; g.stone -= 8; composeRegion(p[0] - 8, p[1] - 12, p[0] + 8, p[1] + 12);
  notify(`En ${g.name} levantan una estatua a ${u.name}, que ${why}`, { x:p[0] * T, y:p[1] * T });
}
const retired = (v, g) => ageOf(v) > (v.life || 20) * .72 && (hasLaw(g, 'pensiones') || ['socialismo', 'comunismo'].includes(regimeOf(g)));
// Pensiones (desde econTick)
function payPensions(g, people){
  const old = people.filter(u => retired(u, g)).length; if (!old || !g.coin) return;
  const ec = ecOf(g), each = wageOf(g, 2); ec.treas -= old * each;
  for (const u of people) if (retired(u, g)) u.money = (u.money || 0) + each;
}
const pensionGrief = (g, adults) => { if (hasLaw(g, 'pensiones') || ['socialismo', 'comunismo'].includes(regimeOf(g))) return 0; const old = adults.filter(u => ageOf(u) > (u.life || 20) * .72).length, left = adults.filter(u => (u.ideo || 0) < -.2).length / Math.max(1, adults.length); return old >= 3 && left > .35 ? .1 + old * .02 : 0; };
function cultureTick(g, dt, people, adults){
  if (Array.isArray(g.works)) { g.writings = g.works; g.works = 0; } // (partidas de antes: las obras iban en g.works, que es el dinero de obras públicas)
  if ((g.culT = (g.culT || 0) - dt) > 0) return; g.culT = 5; const el = 5, at = { x:g.fx * T, y:g.fy * T };
  // Una obra nueva
  if ((g.know || {}).escritura && adults.length >= 8 && Math.random() < el * .0025) {
    const author = adults.slice().sort((a, b) => (b.edu || 0) - (a.edu || 0))[Math.floor(Math.random() * Math.min(3, adults.length))];
    const e = (g.log || []).slice(-15).reverse().find(x => /guerra|meteorito|epidemia|independiz|volcán|terremoto|colonia|globo|paz|espía|referéndum/.test(x.txt));
    const kind = WORK_KIND[Math.floor(Math.random() * WORK_KIND.length)], title = workTitle(g, e);
    (g.writings ||= []).push({ title, kind, author:author.name, lang:g.lang, d:Math.floor(yearT / DAY_LEN) + 1 }); if (g.writings.length > 12) g.writings.shift();
    notify(`En ${g.name}, ${author.name} escribe «${title}», ${kind === 'obra de teatro' ? 'una' : kind === 'novela' || kind === 'crónica' ? 'una' : 'un'} ${kind}${g.lang != null ? ` en ${langName(g.lang)}` : ''}`, at);
    author.culture = yearT; if (hasTheater(g) && kind === 'obra de teatro') g.anger = Math.max(0, (g.anger || 0) - 5);
  }
  // Leyendas de las grandes desgracias (una por cada clase)
  const L = g.legends ||= [];
  for (const e of (g.log || []).slice(-6)) for (const [re, name] of [[/meteorito/, 'la piedra del cielo'], [/erupción|volcán/, 'la montaña que escupe fuego'], [/tsunami|ola gigante/, 'la gran ola'], [/terremoto/, 'la tierra que tembló'], [/epidemia/, 'la fiebre negra']])
    if (re.test(e.txt) && !L.some(l => l.name === name) && Math.random() < .5) { L.push({ name, d:Math.floor(yearT / DAY_LEN) + 1 }); notify(`En ${g.name} nace la leyenda de ${name}`, at); }
  // Cisma: una fe extendida por varios pueblos se parte
  if (g.faith && nationOf(g) === g && Math.random() < el * .0006) {
    const same = villages.filter(o => o !== g && popOf(o) && o.faith && o.faith.god === g.faith.god);
    if (same.length >= 2 && ((g.wrath || 0) > 2 || (g.devotion || 0) < .5)) {
      const old = g.faith.god, nu = `${old} ${['el Verdadero', 'Reformado', 'del Norte', 'Renacido', 'el Puro'][Math.floor(Math.random() * 5)]}`;
      for (const o of villages) if (popOf(o) && nationOf(o) === g && o.faith && o.faith.god === old) o.faith = { ...o.faith, god:nu, name:`${o.faith.name} reformada` };
      for (const o of same) if (nationOf(o) !== g) { const r = relOf(g, o); r.v = clamp(r.v - 15, -100, 100); }
      notify(`Cisma: en ${g.name} rompen con los demás fieles de ${old} y fundan su propia iglesia, la de ${nu}`, at);
    }
  }
}
function cultureCard(g){
  const W0 = g.writings || [], Lg = g.legends || [], Hs = g.heroes || [];
  if (!W0.length && !Lg.length && !Hs.length) return '';
  return `<h4>Cultura</h4>${W0.length ? `<div>${W0.slice(-4).reverse().map(w => `«${esc(w.title)}» <span class="muted">(${esc(w.kind)} de ${esc(w.author)}, día ${w.d})</span>`).join('<br>')}</div>` : ''}
    ${Lg.length ? `<div class="muted" style="margin-top:4px">Leyendas: ${Lg.map(l => esc(l.name)).join(', ')}</div>` : ''}${Hs.length ? `<div class="muted">Héroes: ${Hs.slice(-4).map(h => `${esc(h.name)} (${esc(h.why)})`).join(', ')}</div>` : ''}`;
}
