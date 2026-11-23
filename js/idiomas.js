// Forja de Mundos · Idiomas: cada tribu con su lengua, la lengua común, escritura, escuelas y política lingüística
// ================= Idiomas =================
// Cada tribu nace con su propia lengua (con sus sonidos: vocales, consonantes, ritmo y entonación). Los hijos
// aprenden en casa la de sus padres; quien se muda aprende poco a poco la del pueblo. Las naciones que conquistan
// otros pueblos acaban con varias lenguas. Hay una lengua común que entienden todos los que la estudian: solo se
// aprende en la escuela, y para eso hace falta haber descubierto la escritura. Los diplomáticos la hablan.
// Cada nación decide qué se enseña en sus escuelas: solo la lengua oficial (las demás se van perdiendo y pueden
// morir) o todas las de su territorio. Lo uno o lo otro puede causar protestas. Con escritura y escuelas las lenguas
// se modernizan; una lengua que ya nadie habla, muere. Donde hay partidos, todo esto son leyes que proponen y se votan
// («una sola lengua», «todas las lenguas», «reforma de la lengua», «pureza de la lengua»), y no todos están de acuerdo. Las lenguas se guardan en world.langs (van con la partida).
const LANG_COMMON = 0, LANG_ERA = ['', ' medio', ' moderno', ' contemporáneo'];
const langList = () => world.langs ||= [];
const langSeed = () => world.langSeed ??= hashStr(params.seed) % 1000003; // cada mundo, sus lenguas (se guarda con la partida)
// La común también tiene nombre (inventado con sus propios sonidos), y se escribe «el valerino (común)»
function commonAdj(){
  const L = langList()[LANG_COMMON]; if (!L) return 'común';
  if (!L.adj || L.adj === 'común') { const r = mulberry32(langSeed() * 131 + 17); let root = langWord(L.phon, 3, r); if (/[aeiou]$/.test(root)) root = root.slice(0, -1); L.adj = root + ['ino', 'ano', 'és', 'ense'][Math.floor(r() * 4)]; }
  return L.adj;
}
const langName = id => { const L = langList()[id]; return L ? (L.common ? `el ${capFirst(commonAdj())} (común)` : `el ${capFirst(L.adj)}${LANG_ERA[L.era] || ''}`) : 'una lengua perdida'; };
const LANG_CONS = ['k', 't', 'p', 's', 'r', 'l', 'm', 'n', 'g', 'd', 'b', 'z', 'x', 'h', 'v', 'ch', 'sh', 'ts', 'q', 'j', 'f', 'y'];
// Cada lengua es de un tipo, que decide sus consonantes, su ritmo y su entonación (y por eso suenan muy distintas)
const LANG_KINDS = {
  tonal:     { txt:'tonal', cons:['t', 'p', 'k', 'm', 'n', 'l', 'h', 'ng', 's', 'ch'], tone:[.4, .6], syl:[.055, .08], cp:[.4, .6], coda:.35, cf:[2200, 4200] },
  gutural:   { txt:'gutural', cons:['k', 'g', 'kh', 'gh', 'q', 'r', 'x', 'd', 'b', 'h'], tone:[.05, .15], syl:[.08, .12], cp:[.6, .85], coda:.6, cf:[900, 1800], pitch:[.75, .9] },
  sibilante: { txt:'sibilante', cons:['s', 'sh', 'z', 'ts', 'ch', 'f', 'th', 'l', 't', 'n'], tone:[.1, .25], syl:[.06, .09], cp:[.7, .9], coda:.5, cf:[4500, 7000] },
  melodica:  { txt:'melódica', cons:['l', 'm', 'n', 'r', 'v', 'y', 'w', 'b', 'd'], tone:[.2, .35], syl:[.1, .14], cp:[.25, .4], coda:.1, cf:[1800, 3200], pitch:[1, 1.2] },
  cortante:  { txt:'cortante', cons:['t', 'k', 'p', 'tz', 'q', 'x', 'd', 'g'], tone:[.05, .15], syl:[.045, .065], cp:[.8, .95], coda:.7, cf:[2500, 5000] },
  nasal:     { txt:'nasal', cons:['m', 'n', 'ng', 'ny', 'b', 'd', 'g', 'l', 'w'], tone:[.15, .3], syl:[.08, .11], cp:[.4, .6], coda:.8, cf:[1200, 2400], pitch:[.85, 1] },
  suave:     { txt:'suave', cons:['l', 'r', 'v', 'f', 'h', 's', 'm', 'n', 'y', 'th'], tone:[.1, .25], syl:[.08, .11], cp:[.3, .5], coda:.25, cf:[2000, 3500] },
};
function langPhon(r){
  const kinds = Object.keys(LANG_KINDS), kind = kinds[Math.floor(r() * kinds.length)], K = LANG_KINDS[kind], span = ([a, b]) => a + r() * (b - a);
  const vs = ['a', 'e', 'i', 'o', 'u'].sort(() => r() - .5), cs = K.cons.slice().sort(() => r() - .5);
  return { kind, vow:vs.slice(0, 3 + Math.floor(r() * 3)).join(''), cons:cs.slice(0, 5 + Math.floor(r() * 3)), cf:[span(K.cf), span(K.cf), span(K.cf)],
    cp:span(K.cp), syl:span(K.syl), pitch:K.pitch ? span(K.pitch) : .85 + r() * .35, tone:span(K.tone), coda:r() < K.coda };
}
// Una lengua hija: suena parecida a la madre, pero con algunos sonidos cambiados (como el latín y sus hijas)
function langMutate(P, r){
  const Q = JSON.parse(JSON.stringify(P)), K = LANG_KINDS[P.kind] || LANG_KINDS.suave;
  for (let k = 0; k < 2; k++) Q.cons[Math.floor(r() * Q.cons.length)] = K.cons[Math.floor(r() * K.cons.length)];
  if (r() < .6) { const miss = [...'aeiou'].filter(c => !Q.vow.includes(c)); if (miss.length && r() < .5) Q.vow += miss[0]; else if (Q.vow.length > 3) Q.vow = Q.vow.slice(0, -1); }
  Q.syl *= .85 + r() * .3; Q.pitch *= .92 + r() * .16; Q.tone = clamp(Q.tone * (.8 + r() * .5), .03, .65); Q.cp = clamp(Q.cp + (r() - .5) * .2, .2, .95);
  for (const f of ['fem', 'masc', 'place', 'coinEnd']) if (r() < .5) delete Q[f];
  return Q;
}
function langWord(P, n, r){
  let w = ''; for (let k = 0; k < n; k++) { if (k || r() < .8) w += P.cons[Math.floor(r() * P.cons.length)]; w += P.vow[Math.floor(r() * P.vow.length)]; }
  if (P.coda && r() < .5) w += 'nsrl'[Math.floor(r() * 4)];
  return w;
}
function newLang(parent){
  const L = langList(); if (!L[LANG_COMMON]) L[LANG_COMMON] = { id:LANG_COMMON, common:true, adj:'común', era:0, born:yearT, phon:{ vow:'aeio', cons:['k', 't', 's', 'l', 'm', 'n', 'r'], cf:[2600, 4200], cp:.5, syl:.075, pitch:1, tone:.12, coda:false } };
  const id = L.length, r = mulberry32(langSeed() * 977 + id * 7919), mom = parent != null ? L[parent] : null, P = mom ? langMutate(mom.phon, r) : langPhon(r);
  const taken = new Set(L.filter(Boolean).map(x => x.adj));
  let adj = '';
  for (let k = 0; k < 20 && (!adj || taken.has(adj) || !readable(adj)); k++) { let root = langWord(P, 2, r); if (/[aeiou]$/.test(root)) root = root.slice(0, -1); adj = root + ['és', 'ano', 'í', 'ino', 'ego', 'ico', 'ense', 'ú', 'ita', 'ol'][Math.floor(r() * 10)]; }
  L[id] = { id, adj, era:0, born:yearT, phon:P, speakers:0, parent:mom ? mom.id : null, family:mom ? (mom.family ?? mom.id) : id };
  return id;
}
// Nombres de persona hechos con los sonidos de la lengua del pueblo: cada lengua tiene su terminación de mujer y la de
// hombre (así cada pueblo tiene su estilo de nombres)
function personName(g, sex){
  if (!g || !world || !world.langs) return null;
  const L = langList()[villageLang(g)]; if (!L || L.common) return null;
  const P = L.phon, r = Math.random;
  if (!P.fem) { P.fem = P.vow[Math.floor(r() * P.vow.length)]; const m = P.coda ? 'nrsl'[Math.floor(r() * 4)] : P.vow.replace(P.fem, '')[0] || 'o'; P.masc = m === P.fem ? 'n' : m; }
  let w = '';
  for (let k = 0; k < 12 && (!/[aeiou].*[^aeiou]$|[aeiou]{1}[^aeiou]+$/.test(w) || !decent(w + P.fem) || !decent(w + P.masc)); k++) w = langWord(P, r() < .7 ? 2 : 3, r).replace(/[aeiou]+$/, ''); // con alguna vocal dentro (y sin palabrotas)
  if (!/[aeiou]/.test(w)) w = P.cons[0] + P.vow[0] + P.cons[1 % P.cons.length];
  return capFirst(w + (sex === 'm' ? P.fem : P.masc)); // (sex 'm' es mujer, 'h' hombre)
}
// Nombre de pueblo en su lengua, corto y legible: una raíz y la terminación de lugar de esa lengua (todos los pueblos
// de una misma lengua acaban igual, como pasa con los topónimos de verdad)
// Que ningún nombre inventado forme una palabrota (en español o en inglés)
const BAD_NAME = /put[aoe]|mierd|culo|cul[oa]s|co[nñ]o|pene|poll[ao]|caca|ped[oa]s?$|^ped[oa]|teta|nazi|maric|joder|foll|cabr[oó]n|zorr|guarr|pito|chocho|mam[oó]n|polla|fuck|shit|cunt|dick|cock|nigg|negrat|retras|idiot|subnor|anal|sexo|porn|orto|ojete|verga|chingu?|pinche|gilip|capull|hostia/i;
const decent = w => !BAD_NAME.test(w);
const readable = w => decent(w) && w.length >= 4 && w.length <= 11 && !/[^aeiouáéíóú]{3}/.test(w.replace(/sh|ch|ts|tz|kh|gh|th|ng|ny/g, 'x')) && !/(.)/.test(w) && /[aeiou]/.test(w);
function placeName(g){
  const L = langList()[villageLang(g)]; if (!L || L.common) return null;
  const P = L.phon, r = Math.random;
  if (!P.place) { const rp = mulberry32(L.id * 7331 + 11); let s = ''; for (let k = 0; k < 8 && !/^[^aeiou]*[aeiou][^aeiou]*$/.test(s); k++) s = langWord({ ...P, coda:true }, 1, rp); P.place = s.length >= 2 ? s : 'ra'; }
  const taken = new Set(villages.map(o => o.name));
  for (let k = 0; k < 30; k++) {
    let root = langWord(P, r() < .6 ? 1 : 2, r); if (/[aeiou]$/.test(root) && /^[aeiou]/.test(P.place)) root = root.slice(0, -1);
    const n = capFirst(root + P.place);
    if (readable(n.toLowerCase()) && !taken.has(n)) return n;
  }
  return null;
}
// La lengua principal del pueblo (la materna de la mayoría); si es una tribu nueva, la suya propia
function villageLang(g){
  if (g.lang == null || !langList()[g.lang]) { // si su gente ya habla una (pueblo que se separa de otro), esa; si no, una nueva
    const cnt = new Map(); for (const v of villagers) if (!v.dead && v.vid === g.id && v.langs) { const n = nativeOf(v); if (n != null && langList()[n]) cnt.set(n, (cnt.get(n) || 0) + 1); }
    let best = null, bn = 0; for (const [k, c] of cnt) if (c > bn) { bn = c; best = k; }
    g.lang = best ?? newLang();
  }
  return g.lang;
}
// Lo que habla cada persona: {id de lengua: soltura de 0 a 1}. Los niños, la de sus padres (no la común: esa se estudia)
function langsOf(v){
  if (v.langs) return v.langs;
  const L = {};
  for (const p of v.parents || []) if (p && p.langs) for (const [k, f] of Object.entries(p.langs)) if (f >= .5 && +k !== LANG_COMMON) L[k] = 1;
  if (!Object.keys(L).length) { const g = villageById(v.vid); if (g) L[villageLang(g)] = 1; }
  return v.langs = L;
}
const speaks = (v, id) => (langsOf(v)[id] || 0) >= .5;
const nativeOf = v => { const L = langsOf(v); let best = null, bf = 0; for (const [k, f] of Object.entries(L)) if (+k !== LANG_COMMON && f > bf) { bf = f; best = +k; } return best; };
// La lengua en la que se entienden dos personas (la que mejor hablan los dos), o null si no se entienden
function sharedLang(a, b){
  const A = langsOf(a), Bv = langsOf(b); let best = null, bf = 0;
  for (const k in A) { const f = Math.min(A[k], Bv[k] || 0); if (f > bf || (f === bf && +k !== LANG_COMMON)) { bf = f; best = +k; } }
  return bf >= .5 ? best : null;
}
// Lo bien que alguien se hace entender en un pueblo: en su lengua (del todo), en la común si allí la saben, o a gestos
function langUnderstand(v, g){
  if (!g) return 1;
  if (speaks(v, villageLang(g))) return 1;
  if (speaks(v, LANG_COMMON) && (g.commonShare || 0) >= .2) return .85;
  return .3;
}
// Quién va de viaje: los diplomáticos, a poder ser, que se hagan entender; las caravanas, mejor un mercader
const travelerScore = (u, kind, to) => (kind === 'rescate' ? (u.weapon ? 3 : 0) : 0) + (kind === 'espia' ? (u.edu || 0) * 2 + (speaks(u, to ? villageLang(to) : -1) ? 1 : 0) : 0) + (u.oficio === 'mercader' && kind === 'caravana' ? 1 : 0) + (kind === 'diplomatico' && to ? langUnderstand(u, to) * 2 + (speaks(u, LANG_COMMON) ? .5 : 0) : 0);
// Lengua oficial y ley de lenguas de cada nación: «oficial» (en la escuela, solo la oficial) o «todas»
function nationLangLaw(n){
  if (n.offLang == null || !langList()[n.offLang] || langList()[n.offLang].dead) n.offLang = villageLang(n);
  if (hasLaw(n, 'lengua_unica')) return 'oficial'; // donde hay partidos, manda la ley que se haya votado
  if (hasLaw(n, 'plurilinguismo')) return 'todas';
  if (!n.langLaw) n.langLaw = ['monarquia', 'dictadura', 'fascismo', 'tribu'].includes(regimeOf(n)) ? 'oficial' : 'todas';
  return n.langLaw;
}
// Cómo vota cada uno una ley de lenguas: los de lengua minoritaria, por lo que les toca; los demás, por sus ideas (null)
function langVote(u, g, law){
  if (law !== 'lengua_unica' && law !== 'plurilinguismo') return null;
  if (!langMinority(u, g)) return null;
  return law === 'plurilinguismo';
}
// La escritura: se inventa en pueblos con ayuntamiento o se aprende de quien ya la tiene
function learnWriting(g, how){
  const kn = g.know ||= {}; if (kn.escritura) return;
  kn.escritura = true; notify(how || `En ${g.name} inventan la escritura: ya pueden apuntar su lengua y, con escuelas, enseñarla`, { x:g.fx * T, y:g.fy * T });
}
function spreadWriting(a, b){
  if ((a.know || {}).escritura && !(b.know || {}).escritura && Math.random() < .3) learnWriting(b, `Los de ${b.name} aprenden de ${a.name} a escribir`);
  if ((b.know || {}).escritura && !(a.know || {}).escritura && Math.random() < .3) learnWriting(a, `Los de ${a.name} aprenden de ${b.name} a escribir`);
}
// Un encuentro (visita en globo, por ejemplo): se pegan palabras y quizá la escritura
function languageMeet(g, o, people){
  spreadWriting(g, o); const L = villageLang(o);
  for (const u of people || []) { const ls = langsOf(u); if (!speaks(u, L)) ls[L] = Math.min(1, (ls[L] || 0) + .08); }
  if ((people || []).length && people.every(u => langUnderstand(u, o) < .5) && Math.random() < .5) notify(`Los de ${g.name} apenas se entienden con los de ${o.name}: no hablan ${langName(L)} y allí casi nadie sabe ${langName(LANG_COMMON)}`, { x:o.fx * T, y:o.fy * T });
}
// En clase (con escuela y escritura): la lengua común, la oficial de la nación y, si la ley lo permite, la del pueblo.
// Si en la escuela solo se enseña la oficial, los niños que hablan otra en casa la van perdiendo
function schoolLangs(v, g){
  if (!(g.know || {}).escritura) return;
  const n = nationOf(g), law = nationLangLaw(n), ls = langsOf(v), add = (id, d) => { ls[id] = Math.min(1, (ls[id] || 0) + d); };
  add(LANG_COMMON, .1); add(n.offLang, .1);
  if (law === 'todas') add(villageLang(g), .08);
  else for (const k of Object.keys(ls)) if (+k !== LANG_COMMON && +k !== n.offLang && ageOf(v) < ADULT_H) ls[k] = Math.max(.2, ls[k] - .05);
}
// El descontento por la lengua (se suma a las quejas de politicsTick)
function langMinority(u, g){ const n = nationOf(g); nationLangLaw(n); return nativeOf(u) !== n.offLang; }
function languageGrief(g, adults){
  if (!hasSchool(g) || !(g.know || {}).escritura || !adults.length) return 0;
  const n = nationOf(g), law = nationLangLaw(n), mins = adults.filter(u => langMinority(u, g)).length / adults.length;
  const n0 = nationOf(g), right = adults.filter(u => (u.ideo || 0) > .35).length / adults.length, left = adults.filter(u => (u.ideo || 0) < -.35).length / adults.length;
  let extra = 0;
  if (hasLaw(n0, 'reforma_lengua') && right > .4) extra = .06 + right * .12;                // «ya no hablamos como nuestros abuelos»
  if (hasLaw(n0, 'pureza_lengua') && left > .4) extra = .05 + left * .1;                    // «la lengua tiene que poder cambiar»
  const school = law === 'oficial' ? (mins > .15 ? .15 + mins * .8 : 0)                     // su lengua no se enseña en la escuela
    : (mins > .2 && right > .45 ? .12 + right * .2 : 0);                                     // con «todas», los de una sola lengua se quejan
  g.langGrief = school >= extra ? 'escuela' : hasLaw(n0, 'reforma_lengua') ? 'reforma' : 'pureza'; // de qué se quejan sobre todo
  return school + extra;
}
const langProtester = (u, g) => g.langGrief === 'reforma' ? (u.ideo || 0) > .2 : g.langGrief === 'pureza' ? (u.ideo || 0) < -.2 : nationLangLaw(nationOf(g)) === 'oficial' ? langMinority(u, g) : !langMinority(u, g) && (u.ideo || 0) > .2;
function langConcede(g){
  if (g.langGrief === 'reforma' || g.langGrief === 'pureza') { // retiran la ley que molesta
    const n = nationOf(g), l = g.langGrief === 'reforma' ? 'reforma_lengua' : 'pureza_lengua', P = n.parties && n.ruling != null ? n.parties[n.ruling] : null;
    if (P) { P.laws = P.laws.filter(x => x !== l); lawLog(n, `Se deroga la ley de «${LAW_TXT[l]}» tras las protestas`); }
    return l === 'reforma_lengua' ? 'paran la reforma de la lengua' : 'dejan que la lengua vuelva a cambiar';
  }
  const n = nationOf(g), law = nationLangLaw(n), want = law === 'oficial' ? 'plurilinguismo' : 'lengua_unica', drop = want === 'plurilinguismo' ? 'lengua_unica' : 'plurilinguismo';
  const P = n.parties && n.ruling != null ? n.parties[n.ruling] : null;
  if (P) { P.laws = P.laws.filter(l => l !== drop); if (!P.laws.includes(want)) P.laws.push(want); lawLog(n, `${artP(P)[0].toUpperCase() + artP(P).slice(1)} ${P.name} cede ante la calle: ley de «${LAW_TXT[want]}»`); }
  n.langLaw = law === 'oficial' ? 'todas' : 'oficial';
  return law === 'oficial' ? `aceptan enseñar en las escuelas todas las lenguas de ${n.name}, no solo ${langName(n.offLang)}` : `deciden que en las escuelas solo se enseñe ${langName(n.offLang)}`;
}
// ---- Cada pocos segundos ----
let langClock = 0;
function updateLanguages(dt){
  if ((langClock += dt) < 3) return; const el = langClock; langClock = 0;
  if (!world || !villages.length) return;
  const L = langList(), count = new Map();
  for (const g of villages) {
    const people = villagers.filter(v => !v.dead && v.vid === g.id); if (!people.length) continue;
    const kn = g.know ||= {};
    if (kn.papel && !kn.escritura) kn.escritura = true; // partidas de antes: quien ya tenía papel, sabe escribir
    if (!kn.escritura && g.hall != null && people.length >= 8 && Math.random() < el * .004) learnWriting(g);
    villageLang(g);
    // Pueblo recién fundado: su nombre, en su lengua (y se corrige en la crónica si ya había salido con el provisional)
    if (g.freshName) { g.freshName = false; const nn = placeName(g); if (nn) { const old = g.name; g.name = nn; for (const e of chronicle) if (e.text.includes(old)) e.text = e.text.split(old).join(nn); for (const e of g.log || []) e.txt = e.txt.split(old).join(nn); } }
    // La lengua del pueblo es la materna de la mayoría; quien vive allí la va aprendiendo
    const mix = new Map(); let common = 0;
    for (const v of people) {
      if (v.fresh) { v.fresh = false; v.name = personName(g, v.sex) || v.name; }
      const nat = nativeOf(v); if (nat != null) mix.set(nat, (mix.get(nat) || 0) + 1);
      if (speaks(v, LANG_COMMON)) common++;
      const ls = langsOf(v); if ((ls[g.lang] || 0) < 1 && !v.away) ls[g.lang] = Math.min(1, (ls[g.lang] || 0) + .004 * el * (hasLaw(g, 'pureza_lengua') ? .5 : 1));
      for (const [k, f] of Object.entries(ls)) if (f >= .5) count.set(+k, (count.get(+k) || 0) + 1);
    }
    let top = g.lang, tn = 0; for (const [k, c] of mix) if (c > tn) { tn = c; top = k; }
    if (top !== g.lang && tn > people.length * .5) { const old = g.lang; g.lang = top; if (L[old] && L[top]) notify(`En ${g.name} ya se habla más ${langName(top)} que ${langName(old)}`, { x:g.fx * T, y:g.fy * T }); }
    g.langMix = Object.fromEntries(mix); g.commonShare = common / people.length;
    dialectTick(g, people, el); // los dialectos que se separan
    // Las dictaduras imponen su lengua en las escuelas
    const n = nationOf(g);
    if (n === g) { const law = nationLangLaw(n); if (law === 'todas' && ['dictadura', 'fascismo'].includes(regimeOf(n)) && Math.random() < el * .002) { n.langLaw = 'oficial'; notify(`${n.name} impone ${langName(n.offLang)} en todas sus escuelas: las demás lenguas, solo en casa`, { x:n.fx * T, y:n.fy * T }); } }
  }
  // Lenguas que mueren y lenguas que se modernizan (con escritura y escuelas donde se habla)
  for (const lg of L) {
    if (!lg || lg.dead) continue;
    const n = count.get(lg.id) || 0;
    if (n > 0) lg.spoken = true;
    if (!lg.common && lg.spoken && n === 0) { lg.dead = true; lg.deadT = yearT; notify(`Ha muerto ${langName(lg.id)}: ya no queda nadie que lo hable`, null); continue; }
    if (!lg.common && n > 0 && n <= 3 && !lg.fewMsg) { lg.fewMsg = true; notify(`Solo quedan ${n} ${n === 1 ? 'persona que habla' : 'personas que hablan'} ${langName(lg.id)}`, null); }
    if (n > 6) lg.fewMsg = false;
    if (!lg.common && (lg.era || 0) < 3 && yearT - (lg.eraT ?? lg.born) > YEAR * 1.5 && villages.some(g => g.lang === lg.id && (g.know || {}).escritura && hasSchool(g)) && Math.random() < el * .01 * langPace(lg)) {
      const old = langName(lg.id), reform = langPace(lg) > 1; lg.era = (lg.era || 0) + 1; lg.eraT = yearT; const P = lg.phon;
      P.syl *= .92; P.tone *= .85; P.cp = Math.min(.9, P.cp + .05); if (P.vow.length < 5) P.vow += 'aeiou'.split('').find(c => !P.vow.includes(c)) || '';
      notify(`${old[0].toUpperCase() + old.slice(1)} se moderniza${reform ? ' con la reforma de la academia (a los mayores no les hace gracia)' : ' con la escritura'}: ahora se habla ${langName(lg.id)}`, null);
    }
  }
}
// Ritmo al que cambia una lengua según las leyes de las naciones donde se habla (reforma: deprisa; pureza: casi nada)
function langPace(lg){
  const ns = new Set(villages.filter(g => popOf(g) && g.lang === lg.id).map(g => nationOf(g)));
  let k = 1; for (const n of ns) { const ac = hasInst(n, 'academia'); if (hasLaw(n, 'reforma_lengua')) k = Math.max(k, ac ? 3 : 1.5); if (hasLaw(n, 'pureza_lengua')) k = Math.min(k, ac ? .15 : .5); }
  return k;
}
// Tipo y familia de una lengua («lengua gutural, hija del Shukino»)
function langInfo(id){
  const L = langList()[id]; if (!L || L.common) return 'la lengua común, que se aprende en la escuela';
  const K = LANG_KINDS[L.phon.kind], fam = L.family != null && L.family !== L.id ? langList()[L.family] : null, mom = L.parent != null ? langList()[L.parent] : null;
  return `lengua ${K ? K.txt : 'propia'}${mom ? `, hija ${mom.dead ? 'de la ya muerta lengua ' : 'del '}${capFirst(mom.adj)}` : ''}${fam && fam !== mom ? ` (familia del ${capFirst(fam.adj)})` : ''}`;
}
// Dialectos que se separan: si un pueblo habla la lengua de otros pero está lejos o en otra nación (y sin escritura que
// los mantenga unidos), con el tiempo su forma de hablar se aleja hasta ser otra lengua, hija de la primera
function dialectTick(g, people, el){
  const lg = langList()[g.lang]; if (!lg || lg.common) return;
  const kin = villages.filter(o => o !== g && popOf(o) && o.lang === g.lang); if (!kin.length) { g.drift = 0; return; }
  const core = kin.concat([g]).sort((a, b) => popOf(b) - popOf(a))[0]; if (core === g) { g.drift = 0; return; }
  const d = Math.hypot(core.fx - g.fx, core.fy - g.fy), other = nationOf(core) !== nationOf(g), written = (g.know || {}).escritura && (core.know || {}).escritura && !other;
  const rate = (d > 50 ? 1 : d > 25 ? .4 : 0) + (other ? 1 : 0) - (written ? .8 : 0); if (rate <= 0) return;
  g.drift = (g.drift || 0) + el * rate;
  if (g.drift < DAY_LEN * 2.5 || Math.random() > el * .02) return;
  g.drift = 0; const old = g.lang, nid = newLang(old); g.lang = nid;
  for (const v of people) { const ls = langsOf(v); if ((ls[old] || 0) >= .5) { ls[nid] = ls[old]; ls[old] = Math.min(ls[old], .6); } } // aún entienden algo la madre
  notify(`En ${g.name} ya hablan tan distinto que en ${core.name} que su forma de hablar es otra lengua: ${langName(nid)}, hija ${langName(old).replace(/^el /, 'del ')}`, { x:g.fx * T, y:g.fy * T });
}
// Para la ficha del pueblo
function langCard(g){
  if (g.lang == null) return '';
  const n = nationOf(g), law = nationLangLaw(n), mix = Object.entries(g.langMix || {}).sort((a, b) => b[1] - a[1]), tot = mix.reduce((s, [, c]) => s + c, 0) || 1;
  const nLangs = new Set(villages.filter(o => popOf(o) && nationOf(o) === n).map(o => o.lang)).size;
  const info = `<div class="muted" style="font-size:12px">${esc(capFirst(langName(g.lang)))}: ${esc(langInfo(g.lang))}</div>`;
  return `<h4>Idiomas</h4>${info}<div class="needs">${mix.slice(0, 3).map(([k, c]) => `<span>${esc(langName(+k).replace(/^(el|la) /, ''))}</span>${bar(c / tot, '#8ab4d8', 150)}<span>${Math.round(c / tot * 100)} %</span>`).join('')}
    <span>${esc(capFirst(commonAdj()))} (común)</span>${bar(g.commonShare || 0, '#c8b0e0', 150)}<span>${Math.round((g.commonShare || 0) * 100)} %</span></div>
    <p class="muted" style="font-size:12px;margin:4px 0 8px">${(g.know || {}).escritura ? 'Saben escribir' : 'Aún no saben escribir'} · ${n.name}: ${nLangs > 1 ? `${nLangs} lenguas, ` : ''}en la escuela ${law === 'oficial' ? `solo ${esc(langName(n.offLang))}` : 'todas sus lenguas'}${(g.know || {}).escritura ? ` y ${esc(langName(LANG_COMMON))}` : ''}${hasLaw(n, 'reforma_lengua') ? ' · con academia que reforma la lengua' : hasLaw(n, 'pureza_lengua') ? ' · la lengua no se toca (pureza)' : ''}</p>`;
}
