// World Sim · Lo que piensan y dicen los aldeanos
// ================= Pensamientos =================
// De cerca (zoom ≥ 3) a algunos aldeanos les sale un bocadillo con lo que piensan o dicen: lo que les pide el cuerpo
// (sed, hambre, frío), lo que les preocupa o les alegra (lo mismo que mueve su ánimo), lo que están haciendo, la guerra,
// las leyes nuevas, el tiempo, su pareja... Si tienen a alguien al lado, ese le contesta (si no habla su lengua, no le
// entiende). Al aldeano que sigue la cámara le sale más a menudo. Los bocadillos de nube son pensamientos; los de pico, lo que dicen
const SAY_MS = 4200;
let sayList = [], sayNext = 0;
const sayCd = new WeakMap(); // (con performance.now: no se guarda en la partida)
const thPick = a => a[Math.floor(Math.random() * a.length)];
const isFem = v => v.sex === 'm'; // (sexW: 'm' es mujer)
// Lo que mueve su ánimo (moodOf), dicho por ellos mismos
const TH_MOOD = [
  [/^tiene hambre$/, () => ['¡Qué hambre tengo!', 'Me comería un buey entero', 'Me rugen las tripas...']],
  [/^tiene algo de hambre$/, () => ['Picaría algo...', '¿Qué habrá hoy de comer?']],
  [/^tiene sed$/, () => ['¡Qué sed!', 'Necesito agua ya', 'Daría lo que fuera por un trago']],
  [/^tiene algo de sed$/, () => ['Me tomaría un vaso de agua']],
  [/^come bien$/, () => ['Aquí se come de maravilla', 'Qué bien hemos comido hoy']],
  [/^bebe bien$/, () => ['El agua de aquí está buenísima']],
  [/^está herid[oa]$/, () => ['Ay, cómo me duele la herida', 'Aún me duele todo...']],
  [/^está de luto por (.+)$/, (m) => [`Te echo de menos, ${m[1]}...`, `No dejo de pensar en ${m[1]}`]],
  [/^le preocupa(n?) (.+)$/, (m) => [`Me preocupa${m[1]} ${m[2]}`, `¿Nadie va a hacer nada con ${m[2]}?`]],
  [/^le gusta el gobierno$/, () => ['Este gobierno lo hace bien', 'Al fin un gobierno decente']],
  [/^no le gusta el gobierno$/, () => ['Este gobierno es un desastre', '¡Fuera el gobierno!', 'En las próximas, les echamos']],
  [/^teme la ira de (.+)$/, (m) => [`Temo la ira de ${m[1]}...`, `Perdónanos, ${m[1]}`]],
  [/^su fe le da paz$/, (m, v, g) => [g && g.faith ? `${g.faith.god} nos protege` : 'Mi fe me da paz']],
  [/^tiene ahorros$/, () => ['Tengo unos ahorrillos guardados', 'Algo tengo ahorrado']],
  [/^anda sin dinero$/, () => ['No me queda ni una moneda', 'Estoy sin blanca...']],
  [/^gana un buen sueldo$/, () => ['Con lo que gano vivo bien', 'Este mes me sobra dinero']],
  [/^el sueldo le da para vivir$/, () => ['Voy tirando con mi sueldo']],
  [/^su sueldo no le llega$/, () => ['No llego a fin de mes...', 'Con este sueldo no se puede vivir']],
  [/^su pueblo está en guerra$/, () => ['Odio esta guerra', 'Ojalá acabe pronto la guerra']],
  [/^no tiene casa$/, () => ['No tengo dónde dormir...', 'Ojalá tuviera una casa']],
  [/^tiene casa$/, () => ['Qué gusto tener casa propia']],
  [/^está detenid[oa]$/, () => ['¡Soy inocente!', '¿Cuándo saldré de aquí?']],
  [/^trabaja demasiadas horas$/, () => ['Trabajo demasiadas horas...', 'Estoy agotad@']],
  [/^tiene una jornada corta$/, () => ['Con la jornada corta me da tiempo a todo']],
  [/^ha tenido tiempo libre$/, () => ['Qué bien me lo pasé el otro día']],
  [/^se aburre/, () => ['Me aburro muchísimo', 'Aquí nunca pasa nada']],
  [/^pasa frío$/, () => ['Brrr, qué frío', 'Se me congelan los dedos']],
  [/^pasa calor$/, () => ['Uf, qué calor hace', 'Me estoy asando']],
  [/^está enferm[oa]$/, () => ['*cof* No me encuentro bien', 'Creo que me he puesto enferm@']],
  [/^tiene un hospital cerca$/, () => ['Menos mal que hay hospital']],
  [/^es de otra fe/, () => ['Aquí casi nadie comparte mi fe', 'Me miran raro por mi fe']],
  [/^el alquiler se le come el sueldo$/, () => ['El alquiler se me come el sueldo', 'Otra subida del alquiler...']],
  [/^lo ha perdido todo en el casino$/, () => ['Lo he perdido todo en el casino...', 'Nunca debí apostar']],
  [/^algunos le rechazan$/, () => ['Algunos no me quieren aquí', '¿Por qué me miran así?']],
  [/^hay feria en (.+)$/, (m) => [`¡Hay feria en ${m[1]}!`, '¿Vamos a la feria?']],
  [/^es de la clase alta/, () => ['Qué bien se vive aquí arriba', 'Para algo un@ es de buena familia']],
  [/^es de los /, () => ['Nos tratan como a basura', 'Algún día nos tocará a nosotros']],
  [/^vive en un país muy desigual$/, () => ['Unos tanto y otros tan poco', 'Los ricos, cada vez más ricos']],
  [/^no se puede pagar la entrada/, () => ['No me llega para la entrada del partido']],
  [/^le falta sal$/, () => ['La comida sin sal no sabe a nada', '¿Nadie vende sal por aquí?']],
  [/^le faltan telas$/, () => ['Llevo la ropa hecha jirones', 'Necesito tela para coser']],
  [/^le falta cerámica$/, () => ['No nos quedan ni cuencos', 'Hay que traer vasijas de fuera']],
  [/^bebe buen vino$/, () => ['¡Qué buen vino!', '¡Salud!']],
  [/^come con especias$/, () => ['Qué bien sabe todo con especias']],
  [/^luce joyas$/, () => ['¿Has visto mi collar nuevo?', 'Estas joyas valen una fortuna']],
  [/^tiene (\d+) hij/, (m) => [+m[1] > 1 ? 'Mis hijos crecen tan rápido' : 'Mi crío crece tan rápido', +m[1] > 2 ? '¡Qué familia más grande tengo!' : 'Lo que más quiero, mi familia']],
];
// Lo que no está en la lista: se pasa a primera persona si empieza de una forma conocida (si no, mejor no decir nada)
const TH_FIRST = [[/^no tiene /, 'No tengo '], [/^tiene /, 'Tengo '], [/^está /, 'Estoy '], [/^no le /, 'No me '], [/^le /, 'Me '], [/^sus /, 'Mis '], [/^su /, 'Mi '],
  [/^anda /, 'Ando '], [/^gana /, 'Gano '], [/^pasa /, 'Paso '], [/^se /, 'Me '], [/^vive /, 'Vivo '], [/^paga /, 'Pago '], [/^no puede /, 'No puedo '], [/^puede /, 'Puedo '], [/^echa de menos /, 'Echo de menos '], [/^quiere /, 'Quiero ']];
const genderize = (s, v) => s.replace(/@/g, isFem(v) ? 'a' : 'o');
function moodLine(why, v, g){
  for (const [re, f] of TH_MOOD) { const m = why.match(re); if (m) return thPick(f(m, v, g)); }
  for (const [re, to] of TH_FIRST) if (re.test(why)) { const s = why.replace(re, to).replace(/\bsus\b/g, 'mis').replace(/\bsu\b/g, 'mi').replace(/\ble\b/g, 'me'); return s[0].toUpperCase() + s.slice(1); }
  return null;
}
// Lo que dicen haciendo cada cosa (la tarea o el oficio)
const TH_JOB = {
  talar:['¡Árbol va!', 'Buena madera, esta'], picar:['Piedra y más piedra', 'Qué dura está esta roca'], cantear:['Piedra y más piedra'], pescar:['A ver si pican...', 'Hoy cae uno gordo'], barca:['A ver si pican...', '¡Qué bien se está en el agua!'],
  cazar:['Shhh, que se escapa', 'Hoy cenamos carne'], sembrar:['Que llueva, que llueva', 'Esta cosecha será buena'], arar:['¡Venga, buey, venga!'], cosechar:['¡Buena cosecha!', 'Esto da para todo el invierno'],
  construir:['Esto va a quedar precioso', 'Un ladrillo más...'], ampliar:['Otra habitación más'], bayas:['Mmm, qué moradas están'], beber:['¡Por fin, agua!'], comer:['¡Qué rico!', 'Ñam, ñam'], dormir:['Qué sueño...', 'Mañana más'],
  ocio:['¿Qué tal la familia?', '¿Te has enterado de lo último?', 'Qué buen día hace'], golpe:['¡El poder es nuestro!'], reprimir:['Órdenes son órdenes'], detenido:['¡Soy inocente!', '¿Cuándo saldré de aquí?'],
  guardia:['Por aquí no pasa nadie', 'Todo tranquilo'], 'enseñar':['Atentos a la pizarra'], clase:['Qué aburrido...', '¡Me lo sé, me lo sé!'], jugar:['¡Pásala!', '¡Gooool!'], atleta:['¡Esta vez gano yo!'],
  espectador:['¡Vamos, vamos!', '¡Corre!'], fiesta:['¡Qué fiestón!', '¡Esta noche no se duerme!'], entierro:['Descanse en paz'], boda:['¡Vivan los novios!'], apagar:['¡Agua, rápido!', '¡Que se quema todo!'],
  curar:['Tranquil@, te pondrás bien'], curarse:['Ya me encuentro mejor'], comerciar:['¡Barato, barato!'], vender:['¡Barato, barato!', '¡Género fresco!'], ir_taberna:['¡Otra ronda!', '¡Salud!'],
  refugio:['Vaya chaparrón'], extraer:['¡Aquí hay algo que brilla!'], minar:['¡Aquí hay algo que brilla!'], tejer:['Punto y punto...'], investigar:['¡Eureka! ...o casi'], muralla:['Con esto no entra nadie'],
  torre:['Desde aquí se verá todo'], puente:['¡Ya casi llegamos a la otra orilla!'], pozo:['Ojalá haya agua aquí abajo'], molino:['Este molino nos hará ricos'], esquilar:['Quieta, ovejita'], plantar:['Crece, arbolito'],
  ver_teatro:['¡Bravo!'], ver_coliseo:['¡Vamos!'], nadar:['¡El agua está buenísima!'], correr:['Un poco más...'], explorar:['¿Qué habrá más allá?'], volver:['A casa, por fin'], monumento:['Va a quedar igualito'],
};
// Lo que se le pasa por la cabeza a cualquiera, según cómo es y lo que pasa a su alrededor
function contextLines(v, g, add){
  const n = g && nationOf(g), age = ageOf(v);
  if (age < ADULT_H) { add(3, thPick(['¡Quiero jugar!', '¿Por qué el cielo es azul?', '¡Pilla pilla!', 'De mayor quiero ser como mi madre', '¿Ya hemos llegado?']), 0); return; }
  if (g && g.leader === v) add(2, thPick(['Gobernar no es nada fácil', `Por el bien de ${g.name}`, 'Todos me piden algo...']), 0);
  const partner = (v.partners || []).slice(-1)[0];
  if (partner && !partner.dead) add(1.5, thPick([`Pienso en ${partner.name}`, `Esta noche le cocino algo a ${partner.name}`]), 1);
  if (trait(v, 'ambicion') > .75) add(1.2, thPick(['Algún día seré ric@', 'Tengo un plan para hacerme de oro']), 0);
  if (trait(v, 'sociable') > .75) add(1, thPick(['¡Hola, vecin@!', '¿Quedamos esta tarde?']), 0);
  if (trait(v, 'fan') > .75 && typeof sportCare === 'function' && sportCare(v, g) > .35) add(1.2, thPick(['¡Ojalá ganemos los Juegos!', '¿Quién ganará la carrera?']), 0);
  if (v.oficio === 'cartógrafo') add(1.5, '¡Cuánto mapa queda por dibujar!', 0);
  if (v.oficio === 'sabio') add(1, '¿Y si la Tierra fuera redonda?', 0);
  if (v.oficio === 'mercader') add(1, '¿A cuánto estará la sal en el pueblo de al lado?', 0);
  if (v.oficio === 'curandero') add(1, 'Esta hierba cura de todo', 0);
  const i = Math.floor(v.y / T) * W + Math.floor(v.x / T);
  if (i >= 0 && i < N && raining(i)) add(2, thPick(['Vaya chaparrón', 'Otra vez lloviendo...', 'Me estoy calando']), -1);
  if (isNight() && !v.sleep) add(.8, thPick(['Qué tarde es ya', 'Mira cuántas estrellas']), 0);
  if (seasonInfo().i === 3) add(.6, 'Qué invierno más largo', -1);
  if (seasonInfo().i === 0) add(.6, '¡Ya huele a primavera!', 1);
  if (!n) return;
  // La guerra: contra quién
  for (const r of rels.values()) {
    if (!r.war || (r.war.att !== n.id && r.war.def !== n.id)) continue;
    const foe = villageById(r.war.att === n.id ? r.war.def : r.war.att); if (!foe) continue;
    add(2, thPick([`Malditos los de ${foe.name}`, `¿Y si vienen los de ${foe.name}?`, 'Esta guerra nos va a arruinar']), -1); break;
  }
  // Las leyes nuevas de su nación (lo último que se ha aprobado o quitado)
  const L = (n.lawHist || []).slice(-1)[0];
  if (L && Math.floor(yearT / DAY_LEN) + 1 - L.d <= 2) {
    const m = L.txt.match(/«([^»]+)»/), p = partyOf(v), mine = p && n.ruling != null && n.parties && n.parties[n.ruling] === p;
    if (m) add(2.2, /deroga|quita|rechaza/.test(L.txt) ? `¿Has visto? Lo de «${m[1]}» no sale` : mine ? `¡Por fin, la ley de «${m[1]}»!` : `¿«${m[1]}»? Menuda tontería`, mine ? 1 : -1);
  }
}
// Elige lo que piensa o dice ahora. Devuelve { txt, mood } (mood: -1 malo, 0 neutro, 1 bueno) o null
function thoughtOf(v){
  if (v.sleep) return { txt:'Zzz...', mood:0, think:true };
  const g = villageById(v.vid), C = [], add = (w, txt, mood, think) => { if (txt) C.push([w, genderize(txt, v), mood, think]); };
  // Lo que le pide el cuerpo y lo que le preocupa o le alegra, con más peso lo más fuerte
  const md = moodOf(v);
  md.bad.forEach((why, k) => add(4 - k, moodLine(why, v, g), -1, true));
  md.good.forEach((why, k) => add(2.2 - k * .5, moodLine(why, v, g), 1, true));
  // Lo que está haciendo
  const tk = v.task, job = tk && (tk.k === 'trabajando' ? tk.job : tk.k);
  if (tk && tk.k === 'asalto') add(5, thPick([`¡Por ${g ? nationOf(g).name : 'los míos'}!`, 'Ojalá vuelva a casa...', 'Que no me toque a mí', '¡A por ellos!']), 0);
  else if (job === 'protesta' || (tk && tk.k === 'protesta')) add(5, g && GRIEF_TXT[g.grief] ? `¡Basta ya de ${GRIEF_TXT[g.grief]}!` : '¡Así no se puede seguir!', -1);
  else if (job === 'votar') { const p = partyOf(v); add(4, p ? `Mi voto, para ${p.name}` : 'A ver a quién voto...', 0); }
  else if ((job === 'orar' || job === 'ritual') && g && g.faith) add(4, thPick([`Oh, ${g.faith.god}...`, `${g.faith.god}, escúchanos`]), 0);
  else if (TH_JOB[job]) add(2.5, thPick(TH_JOB[job]), 0);
  contextLines(v, g, add);
  if (!C.length) return null;
  let s = C.reduce((a, c) => a + c[0], 0) * Math.random();
  for (const c of C) if ((s -= c[0]) <= 0) return { txt:c[1], mood:c[2], think:c[3] };
  const c = C[C.length - 1]; return { txt:c[1], mood:c[2], think:c[3] };
}
// La respuesta de quien está al lado
function replyOf(u, v, th){
  const gv = villageById(v.vid), lang = gv && typeof villageLang === 'function' ? villageLang(gv) : null;
  if (lang != null && typeof speaks === 'function' && !speaks(u, lang) && !speaks(u, LANG_COMMON)) return thPick(['¿Qué? No te entiendo', '¿Cómo dices?', 'Perdona, no hablo tu lengua']);
  const pal = isFem(v) ? 'mujer' : 'hombre';
  if (th.mood < 0) return thPick(['Ya ves...', 'Y que lo digas', `Ánimo, ${pal}`, 'A mí me pasa igual', 'Esto tiene que cambiar']);
  if (th.mood > 0) return thPick(['¡Me alegro!', 'Qué suerte tienes', '¡Así me gusta!', '¡Ojalá yo!']);
  return thPick(['Ajá', 'Ya, ya', '¿Ah, sí?', 'Mmm...', '¡Ja, ja!', 'Pues sí']);
}
const sayVisible = v => !v.dead && !v.away && v.appear >= .25 && !(v.sleep && v.home != null) && !v.boat && !v.inPlane;
function spawnThought(now, vis){
  const busy = new Set(sayList.map(s => s.v));
  const free = vis.filter(v => !busy.has(v) && !(sayCd.get(v) > now) && !sayList.some(s => Math.hypot(s.v.x - v.x, s.v.y - v.y) * zoom < 60));
  if (!free.length) return;
  const v = follow && free.includes(follow) && Math.random() < .5 ? follow : free[Math.floor(Math.random() * free.length)];
  sayCd.set(v, now + (v === follow ? 5000 : 12000 + Math.random() * 12000));
  const th = thoughtOf(v); if (!th) return;
  const think = th.think && Math.random() < .6;
  sayList.push({ v, txt:th.txt, think, t0:now, t1:now + SAY_MS }); v.lastSay = th.txt;
  // Si lo dice en voz alta y hay alguien al lado despierto, le contesta
  if (!think) {
    const u = vis.find(u => u !== v && !busy.has(u) && !u.sleep && Math.hypot(u.x - v.x, u.y - v.y) < 4 * T && !(u.task && u.task.k === 'asalto' && enemyOf(u, v)));
    if (u && Math.random() < .7) { sayCd.set(u, now + 9000); sayList.push({ v:u, txt:replyOf(u, v, th), think:false, t0:now + 1300, t1:now + 1300 + SAY_MS * .8 }); }
  }
}
function wrapLines(txt, maxW){
  const words = txt.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (line && vctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
// Se pinta en la pantalla (no en el mundo): el texto se lee igual a cualquier zoom
function drawThoughts(){
  if (zoom < 3 || !villagers.length || busy) { if (sayList.length) sayList = []; return; }
  const now = performance.now();
  sayList = sayList.filter(s => now < s.t1 && sayVisible(s.v));
  const on = v => { const sx = offX + v.x * zoom, sy = offY + v.y * zoom; return sx > 30 && sx < cw - 30 && sy > 150 && sy < ch - 10; }; // (arriba están la barra y los titulares)
  if (now > sayNext) {
    sayNext = now + 450 + Math.random() * 600;
    if (sayList.length < (zoom >= 6 ? 4 : 6)) { const vis = villagers.filter(v => sayVisible(v) && on(v)); if (vis.length) spawnThought(now, vis); }
  }
  if (!sayList.length) return;
  vctx.font = '600 11px system-ui, sans-serif'; vctx.textAlign = 'center'; vctx.textBaseline = 'alphabetic';
  for (const s of sayList) {
    if (now < s.t0) continue;
    const v = s.v, a = Math.min(1, (now - s.t0) / 150, (s.t1 - now) / 400); if (a <= 0) continue;
    const lift = v.mount ? 6 : 0, sx = Math.round(offX + v.x * zoom), sy = Math.round(offY + (v.y - 10 - lift) * zoom) - 8;
    const lines = wrapLines(s.txt, 150), w = Math.max(...lines.map(l => vctx.measureText(l).width)) + 12, h = lines.length * 13 + 7;
    const bx = Math.round(clamp(sx - w / 2, 4, cw - w - 4)), by = sy - h - (s.think ? 9 : 6); // (en el borde de la pantalla, el bocadillo se mete dentro)
    vctx.globalAlpha = a;
    vctx.fillStyle = s.think ? '#eef2f8' : '#fbf7ec'; vctx.strokeStyle = 'rgba(30,26,22,.85)'; vctx.lineWidth = 1.2;
    vctx.beginPath(); vctx.roundRect(bx + .5, by + .5, w, h, s.think ? 8 : 4); vctx.fill(); vctx.stroke();
    if (s.think) { // pensamiento: burbujitas hasta la cabeza
      for (const [dx, dy, r] of [[-2, 4, 2.6], [-4, 9, 1.6]]) { vctx.beginPath(); vctx.arc(sx + dx, by + h + dy, r, 0, Math.PI * 2); vctx.fill(); vctx.stroke(); }
    } else { // lo dice: el pico del bocadillo
      vctx.beginPath(); vctx.moveTo(sx - 4, by + h); vctx.lineTo(sx, by + h + 6); vctx.lineTo(sx + 4, by + h); vctx.fill();
      vctx.beginPath(); vctx.moveTo(sx - 4, by + h + .5); vctx.lineTo(sx, by + h + 6.5); vctx.lineTo(sx + 4, by + h + .5); vctx.stroke();
      vctx.fillRect(sx - 3, by + h - 1, 7, 2);
    }
    vctx.fillStyle = '#2a2420';
    lines.forEach((l, k) => vctx.fillText(l, bx + w / 2 + .5, by + 14 + k * 13));
  }
  vctx.globalAlpha = 1; vctx.textAlign = 'start';
}
{ const base = drawWarIcons; drawWarIcons = function(){ const r = base.apply(this, arguments); try { drawThoughts(); } catch (e) { console.error(e); } return r; }; }
