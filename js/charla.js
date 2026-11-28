// World Sim · De qué se habla: lo que acaba de pasar cerca
// ================= Charla del momento =================
// · Antes los bocadillos salían de su cuerpo, su ánimo, su tarea y poco más: con un meteorito recién caído al lado
//   podían decir «qué buena está el agua». Ahora cada aviso importante deja un «momento» en su zona durante un rato
//   (un meteorito, un volcán, un terremoto, un incendio, una guerra, una boda, unos Juegos...) y la gente de alrededor
//   habla de eso; los vecinos le contestan a juego. Si es algo grave, nadie suelta frases alegres mientras dure
// · Sin posición en el aviso, el momento se sitúa en el pueblo que se nombra; los del mundo entero (el clima) valen
//   para todos. No se guarda en la partida: es lo que se comenta estos días
// [expresión, clave, radio en casillas (Infinity: todo el mundo), duración en días, grave, ánimo, frases, respuestas]
const MOMENTS = [
  [/Ha caído .*meteorito|meteorito .*cae|cae un meteorito/i, 'meteorito', 90, 1.5, true, -1,
    ['¡¿Has visto eso?! ¡Ha caído del cielo!', '¡Una piedra de fuego!', 'Es el fin del mundo...', '¿Estarán enfadados los dioses?', 'Todavía me tiemblan las piernas', 'Ha dejado un agujero enorme'],
    ['¡Casi nos da!', 'Yo lo vi caer, ¡qué miedo!', 'No vuelvo a mirar al cielo igual', '¿Y si cae otro?']],
  [/Se acerca .*meteorito/i, 'cometa', 140, .6, true, -1,
    ['¿Ves esa luz en el cielo?', 'Dicen que viene una piedra del cielo', 'Esa estrella se mueve...'],
    ['Me da mala espina', 'Ojalá caiga lejos', 'Será un presagio']],
  [/nubes ardientes|lahar|río de barro/i, 'arrasa', 70, 2, true, -1,
    ['¡Lo ha arrasado todo!', 'Bajó por la ladera como un río de fuego', 'No queda nada de las casas de abajo', 'Pobre gente...'],
    ['Hemos tenido suerte de vivir aquí arriba', 'No me lo quito de la cabeza', 'Hay que ayudarles']],
  [/entra en erupción|supererupción/i, 'erupcion', 70, 1.5, true, -1,
    ['¡La montaña escupe fuego!', 'Cae ceniza por todas partes', 'Hay que irse de aquí', 'El cielo se ha puesto negro', 'Mira cómo baja la lava'],
    ['¡Coge lo que puedas y vámonos!', 'Que no llegue la lava al pueblo...', 'Ya lo decía mi abuela']],
  [/se despierta: tiembla la tierra/i, 'volcanDespierta', 60, 1, true, -1,
    ['La montaña ruge...', '¿Has notado el temblor de esta noche?', 'El agua del pozo huele a huevo podrido', 'Sale humo del volcán'],
    ['Mala señal', 'A ver si se calma', '¿Nos vamos o esperamos?']],
  [/ceniza (del volcán|tóxica)/i, 'ceniza', 50, 1, true, -1,
    ['*cof cof* No se puede respirar', 'Se nos ha echado a perder la cosecha', 'Todo está cubierto de ceniza', 'El tejado no aguanta tanto peso'],
    ['Tápate la boca con un trapo', 'Ya ves, todo gris', 'Esto tardará en limpiarse']],
  [/invierno volcánico|año sin verano/i, 'inviernoVolc', Infinity, 6, false, -1,
    ['¡Qué frío para ser verano!', 'Este año no madura nada', 'El sol ya no calienta como antes'],
    ['Dicen que es por el volcán', 'Habrá que guardar comida']],
  [/Terremoto/, 'terremoto', 55, 1, true, -1,
    ['¡Ha temblado todo!', 'Creí que se hundía la casa', 'Se me ha caído la vajilla entera', 'Mira qué grieta en el suelo'],
    ['¡Yo me caí de la cama!', 'Que no vuelva a temblar...', 'Hay que revisar las paredes']],
  [/tsunami|ola gigante/i, 'tsunami', 70, 1.5, true, -1,
    ['¡El mar se ha llevado el puerto!', 'Primero se retiró el agua y luego...', 'Nunca había visto una ola así'],
    ['Menos mal que corrimos al monte', 'El mar da miedo', 'Pobres pescadores']],
  [/huracán/i, 'huracan', 60, 1, true, -1,
    ['¡Qué viento!', 'Se ha llevado medio tejado', 'Nunca había visto llover así'],
    ['¡Agárrate a algo!', 'Esto no para', 'Mañana a reparar']],
  [/tornado|tromba/i, 'tornado', 35, 1, true, -1,
    ['¡Un tornado! ¿Lo has visto?', 'Levantó una vaca por los aires', 'Se ha llevado el tejado de los vecinos'],
    ['¡Qué miedo!', 'Yo me escondí en el sótano', 'Ojalá no vuelva']],
  [/incendio|fuego (del|en el) bosque|arde/i, 'incendio', 30, .8, true, -1,
    ['¡Fuego en el bosque!', 'Huele a humo por todas partes', '¡Traed agua!', 'Se está quemando todo'],
    ['¡Rápido, los cubos!', 'Que no llegue a las casas...', 'Mira qué humareda']],
  [/DANA|inundaci|desborda|riada/i, 'inundacion', 40, 1.5, true, -1,
    ['¡El río se ha desbordado!', 'Tengo la casa llena de agua', 'Lo hemos perdido todo con el agua', 'No para de llover'],
    ['Hay que achicar', 'Ayúdame a subir las cosas', 'Qué desgracia']],
  [/sequía/i, 'sequia', 40, 3, false, -1,
    ['No llueve nunca', 'El campo se seca', 'El pozo está casi vacío'],
    ['A ver si llueve pronto', 'Habrá que racionar el agua']],
  [/tormenta de arena/i, 'arena', 40, .8, true, -1,
    ['¡No veo nada con tanta arena!', 'Tengo arena hasta en los dientes'],
    ['Cierra bien la puerta', 'Ya pasará']],
  [/epidemia|peste|fiebre negra|contagi/i, 'epidemia', 40, 3, true, -1,
    ['Dicen que hay fiebre en el pueblo', 'No te acerques mucho, por si acaso', 'Ya han caído varios vecinos', 'Lávate bien las manos'],
    ['Qué miedo da esto', 'Ojalá el curandero sepa qué hacer', 'Mejor nos quedamos en casa']],
  [/declara la guerra/i, 'guerra', 120, 2, true, -1,
    ['¡Guerra! ¿Pero por qué?', 'Mis hijos tendrán que ir a luchar', 'Nada bueno sale de una guerra', 'Hay que prepararse'],
    ['Esto no acabará bien', 'Que se peleen ellos', '¡Les daremos una lección!']],
  [/firman la paz/i, 'paz', 120, 1.5, false, 1,
    ['¡Por fin la paz!', 'Se acabó la guerra', 'Ya era hora de hacer las paces'],
    ['¡A celebrarlo!', 'Que dure mucho', 'Por los que no volvieron...']],
  [/Golpe de estado|Revolución|golpe en/i, 'golpe', 80, 2, true, -1,
    ['¿Quién manda ahora?', 'Han tomado el palacio', 'Mejor no salir a la calle hoy', 'Esto va a cambiar mucho'],
    ['Calla, que te pueden oír', 'A ver qué pasa ahora', 'Ya era hora']],
  [/bandidos|salteadores|asaltan en el camino|banda/i, 'bandidos', 45, 2, false, -1,
    ['Dicen que hay bandidos en el bosque', 'No vayas solo por el camino', 'Le han robado a un vecino'],
    ['Que alguien haga algo', 'Yo ya no salgo de noche', 'Hay que mandar una patrulla']],
  [/[Pp]iratas/, 'piratas', 60, 2, false, -1,
    ['Hay piratas en la costa', 'Esos piratas no nos dejan pescar'],
    ['Que vengan, si se atreven', 'Mejor no salir al mar']],
  [/Boda en|se casan/i, 'boda', 30, .8, false, 1,
    ['¡Qué boda más bonita!', '¡Vivan los novios!', 'Qué banquete nos han dado'],
    ['¡A bailar!', 'Ya les tocaba', 'Que sean muy felices']],
  [/Empiezan los Juegos|todo el mundo ve los Juegos|oro para/i, 'juegos', Infinity, 1.5, false, 1,
    ['¿Has visto los Juegos?', '¡Vamos, que ganamos!', 'Qué carrera más emocionante'],
    ['¡Yo apuesto por los nuestros!', 'El año que viene, más', '¡Qué nivel!']],
  [/Se inaugura el ferrocarril|estrena|inaugura/i, 'inaugura', 40, 1, false, 1,
    ['¿Has visto lo nuevo que han hecho?', '¡Qué cosas se inventan!', 'Habrá que ir a verlo'],
    ['¡Es una maravilla!', 'Los tiempos cambian', 'A ver para qué sirve']],
  [/Fiebre del oro|encontrado oro/i, 'oro', 80, 2, false, 1,
    ['¡Dicen que hay oro!', 'Me voy a buscar oro', 'Nos haremos ricos'],
    ['¡Espérame, que voy!', 'Eso es para cuatro listos', 'Ojalá']],
  [/pasa hambre|hambruna/i, 'hambre', 40, 1.5, true, -1,
    ['No queda nada en la despensa', 'Los niños lloran de hambre', 'Ojalá llegue ayuda'],
    ['Comparto lo poco que tengo', 'Aguanta un poco más', 'Esto no puede seguir así']],
];
const MOMENT_K = Object.fromEntries(MOMENTS.map(m => [m[1], m]));
let moments = [], momentsW = null;
function momentFrom(text, target){
  if (!world || typeof yearT === 'undefined') return;
  if (momentsW !== world) { momentsW = world; moments = []; }
  const M = MOMENTS.find(m => m[0].test(text)); if (!M) return;
  let x = target && target.x, y = target && target.y;
  if (target && target.fx != null && x == null) { x = target.fx * T; y = target.fy * T; }
  if (x == null) { const g = (typeof villages !== 'undefined' ? villages : []).find(o => o.name && text.includes(o.name)); if (g) { x = g.fx * T; y = g.fy * T; } }
  if (x == null && M[2] !== Infinity) return;
  moments = moments.filter(m => m.until > yearT && !(m.k === M[1] && x != null && Math.hypot(m.x - x, m.y - y) < 20 * T)); // (el mismo suceso en el mismo sitio: se renueva)
  moments.push({ k:M[1], x, y, R:M[2] === Infinity ? Infinity : M[2] * T, until:yearT + M[3] * DAY_LEN, t0:yearT });
  if (moments.length > 40) moments.shift();
}
// El momento que le toca a alguien: el más reciente de los que le pillan cerca (los graves, antes)
function momentFor(v){
  if (momentsW !== world) { momentsW = world; moments = []; } // (otra partida: lo de la anterior, fuera)
  let best = null;
  for (const m of moments) {
    if (m.until <= yearT) continue; if (m.R !== Infinity && Math.hypot(v.x - m.x, v.y - m.y) > m.R) continue;
    const M = MOMENT_K[m.k], sc = (M[4] ? 2 : 1) + m.t0 / 1e6; if (!best || sc > best.sc) best = { m, M, sc };
  }
  return best;
}
{ const base = notify; notify = function(text, target){ try { momentFrom(String(text), target); } catch (e) { console.error(e); } return base.apply(this, arguments); }; }
{ const base = thoughtOf; thoughtOf = function(v){
  if (v.sleep) return base.apply(this, arguments);
  const b = momentFor(v); if (!b || (ageOf(v) < ADULT_H && !b.M[4])) return base.apply(this, arguments); // (los niños, a lo suyo... salvo lo gordo)
  const M = b.M, fresh = 1 - (yearT - b.m.t0) / Math.max(1, b.m.until - b.m.t0); // (recién pasado, se habla más de ello)
  const say = () => ({ txt:genderize(thPick(M[6]), v), mood:M[5], think:Math.random() < .2, ev:M[1] });
  if (Math.random() < (M[4] ? .55 + .4 * fresh : .3 + .3 * fresh)) return say();
  const th = base.apply(this, arguments);
  if (M[4] && th && th.mood > 0) return say(); // con algo grave al lado, nada de «qué bien hemos comido»
  return th;
}; }
{ const base = replyOf; replyOf = function(u, v, th){
  const M = th && th.ev && MOMENT_K[th.ev];
  if (M && Math.random() < .85) { const gv = villageById(v.vid), lang = gv && typeof villageLang === 'function' ? villageLang(gv) : null;
    if (!(lang != null && typeof speaks === 'function' && !speaks(u, lang) && !speaks(u, LANG_COMMON))) return genderize(thPick(M[7]), u); }
  return base.apply(this, arguments);
}; }
