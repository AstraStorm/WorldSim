# Forja de Mundos (WorldSim)

Simulador de mundos de pixel art que funciona en el navegador: genera un mapa, crea vida y mira cómo los aldeanos levantan pueblos, inventan religiones, monedas y gobiernos, comercian, se alían y se declaran la guerra.

**Jugar:** https://astrastorm.github.io/WorldSim/

También se puede abrir `index.html` directamente en el navegador (con la carpeta entera); no necesita instalar nada. Funciona en el móvil: se arrastra con un dedo y se hace zoom con dos.

## Qué pasa en el mundo

- Terreno, ríos, estaciones, clima y catástrofes (tornados, terremotos, volcanes, meteoritos…).
- Aldeanos con oficios, dieta, día y noche; construyen casas, caminos, puentes, puertos, molinos, pozos, almacenes y murallas.
- Religiones que nacen de las desgracias, rituales, ofrendas y sacrificios; grandes templos según la fe: catedral (un solo dios), gran panteón (muchos dioses) o zigurat (dioses del cielo, el sol o el fuego).
- Papel y mapas: cada aldea descubre el papel y sus cartógrafos exploran a pie y en barca. En la ficha de la aldea, pestaña Mapa, se ve el mundo tal como lo conocen: nítido lo cercano, torcido o inventado lo lejano. Al comerciar se copian los mapas.
- Banderas propias, territorio, diplomacia, comercio por tierra y mar, guerras, conquistas e independencias.
- Convivencia: cada persona tiene su orientación (heterosexual, homosexual o bisexual) y forma pareja; los hijos nacen de parejas de hombre y mujer, y las del mismo sexo pueden adoptar donde hay matrimonio igualitario. Leyes de derechos humanos o segregación racial, de matrimonio igualitario o persecución, y de libertad de culto o persecución religiosa: cambian el ánimo, los sueldos, quién emigra o es desterrado, las protestas y las relaciones con los vecinos.
- Migrantes con su propia fe: unos la viven en paz y se integran; otros predican, y si llegan a ser mayoría imponen su religión.
- Oficios que se reparten según hace falta (maestro, bombero, curandero, cartógrafo, mercader…); escuelas con la ley de escuelas, donde los niños aprenden y de mayores cobran más.
- Calendario: días libres a la semana según la jornada (y protestas si no los hay) y festivos que recuerdan lo que les pasó (la paz, la independencia, una victoria), con fiesta en la plaza y fuegos artificiales.
- Los fieles de un dios del fuego, de las montañas o del inframundo con un volcán cerca arrojan sus ofrendas al cráter.
- Tratados: pactos de no agresión (romperlos es traición), acuerdos comerciales, libre circulación, tratados de paz y tributos.
- Partidos, elecciones, monarquías, dictaduras, comunismo y fascismo; manifestaciones y golpes de estado.
- Monedas, bancos, inflación, bancarrotas y alianzas con moneda común.
- Enfermedades y epidemias, curanderos, hospitales y cuarentenas; migraciones y refugiados.
- Teatro, coliseo, tabernas, partidos de pelota y Juegos cada dos estaciones entre naciones en paz; tazas de agua en el mercado.
- Torbellinos en el mar que se tragan barcas y flotas.
- Guerra con formaciones, caballería, abanderados, catapultas, flotas y murallas dobles.
- Botones arriba a la derecha: Crónica, Historia (gráficas, línea del tiempo y Juegos), Partidas y Sonido.
- Partidas: cinco ranuras más el guardado automático, y descargar o abrir la partida en un archivo `.forja` (para no perderla o llevarla a otro ordenador).
- Clic en una aldea para ver su ficha; clic en una persona para seguirla.

## Cómo está organizado el código

Sin dependencias ni compilación: cada archivo es un script normal y se cargan en este orden desde `index.html`.

| Archivo | Qué contiene |
|---|---|
| `css/estilo.css` | Todo el aspecto: paneles, fichas, botones y la versión para móvil |
| `js/nucleo.js` | Constantes, sprites de pixel art, ruido y estado global |
| `js/mundo.js` | Generación del mundo y pintado del terreno |
| `js/vista.js` | Cámara, zoom y dibujo de cada fotograma |
| `js/clima.js` | Clima, tornados, huracanes, terremotos y estaciones |
| `js/fauna.js` | Animales |
| `js/desastres.js` | Temperatura, heladas, sequías, incendios, tormentas de arena y meteoritos |
| `js/mapas.js` | Hierba de cerca y mapas de alturas, vientos y temperatura |
| `js/humanos.js` | Aldeanos, pueblos, oficios, edificios, política, economía y guerra |
| `js/partidas.js` | Guardar y cargar: ranuras y archivos `.forja` |
| `js/vida.js` | Enfermedades, migraciones, historia y sonido |
| `js/sociedad.js` | Ocio, Juegos, mar, fichas de pueblo y persona, crónica, leyes y diplomacia |
| `js/impuestos.js` | Impuestos que cada pueblo crea y quita (guerra, deuda, patrimonio, casas, caseros, por cabeza, diezmo) y por qué |
| `js/vivienda.js` | Casas con dueño, compraventa, hipotecas, alquileres, desahucios y la ley de la vivienda |
| `js/cartografia.js` | Papel, expediciones de los cartógrafos y el mapa (impreciso) de cada aldea |
| `js/convivencia.js` | Parejas y orientación, racismo y derechos, homofobia o igualdad |
| `js/credos.js` | Migrantes con otra fe: predicadores, conversiones, persecución o libertad de culto |
| `js/tratados.js` | Pactos, acuerdos comerciales, libre circulación, tratados de paz y tributos |
| `js/trabajo.js` | Reparto de oficios, escuelas, días libres y festivos |
| `js/arte_mapa.js`, `js/arte.js`, `arte/atlas.png` | Arte dibujado (edificios, árboles, rocas, barca, catapulta…) con colores por estación; si un objeto no tiene dibujo, se usa el de siempre |
| `js/vegetacion.js` | Crecimiento y muerte de la vegetación |
| `js/aldeanos.js` | Movimiento y dibujo de los aldeanos |
| `js/interfaz.js` | Herramientas del jugador, entrada, panel, pantalla de carga y oleaje |

Todos comparten el mismo ámbito global, así que el orden importa: lo que un archivo ejecuta al cargarse solo puede usar lo que esté en archivos anteriores (las funciones se pueden llamar desde cualquier sitio una vez cargado todo).

Antes de subir cambios: `python herramientas/version.py` (cambia el número de versión de los enlaces para que el navegador no use archivos viejos).
