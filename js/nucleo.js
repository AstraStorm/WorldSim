// World Sim · Constantes, sprites de pixel art, ruido y estado global
// ================= Constantes =================
const T = 5; // píxeles por casilla (más píxeles por casilla: el mundo se ve más grande y detallado)
let W, H, N, PW, PH;
const SIZES = { s:[160,100,'Pequeño'], m:[240,150,'Mediano'], l:[320,200,'Grande'], xl:[420,262,'Enorme'], xxl:[560,350,'Gigante'], col:[720,450,'Colosal'], tit:[900,562,'Titánico'], cont:[1080,675,'Continental'], plan:[1280,800,'Planetario'] };
const TYPES = {
  archi: { n:'Archipiélago', water:72, freq:7 },
  islas: { n:'Islas',        water:64, freq:5.5 },
  cont:  { n:'Continentes',  water:48, freq:3.6 },
  pangea:{ n:'Pangea',       water:38, freq:3 },
  salv:  { n:'Salvaje',      water:28, freq:4.5 },
};
const B = { DEEP:0, SEA:1, SHALLOW:2, SAND:3, DRY:4, GRASS:5, FOREST:6, SWAMP:7, HILLS:8, ROCK:9, SNOW:10, LAKE:11, RIVER:12, DESERT:13, PLAINS:14, LAVA:15, BASALT:16, ASH:17, DIRT:18, TUNDRA:19 };
// Las cumbres (bioma nieve) se pintan como roca de alta montaña: la nieve que las cubre es una capa aparte
// que cuaja con el frío y se derrite con el calor
const SNOW_GROUND = [150,146,140];
const groundColor = b => b === B.SNOW ? SNOW_GROUND : BIOMES[b].c;
const TURQ_C = [96,186,208], SHALLOW_C = [78,152,206], DEEP_C = [22,48,106], FOAM_C = [204,230,243], LAKE_C = [66,134,196], RIVER_C = [76,146,210];
const BIOMES = [
  { n:'Océano profundo', c:DEEP_C },
  { n:'Mar',             c:[42,92,160] },
  { n:'Aguas bajas',     c:SHALLOW_C },
  { n:'Arena',           c:[221,198,128] },
  { n:'Sabana',          c:[178,168,84] },
  { n:'Pradera',         c:[100,164,64] },
  { n:'Bosque',          c:[62,124,48] },
  { n:'Pantano',         c:[80,106,66] },
  { n:'Colinas',         c:[116,134,74] },
  { n:'Montaña',         c:[128,118,110] },
  { n:'Nieve',           c:[234,240,246] },
  { n:'Lago',            c:LAKE_C },
  { n:'Río',             c:RIVER_C },
  { n:'Desierto',        c:[230,196,116] },
  { n:'Llanura',         c:[140,178,76] },
  { n:'Lava',            c:[236,100,30] },
  { n:'Roca volcánica',  c:[74,64,64] },
  { n:'Ceniza',          c:[104,96,88] },
  { n:'Tierra arrasada', c:[132,106,74] },
  { n:'Tundra',          c:[140,152,124] },
];
const WATER = new Uint8Array(20); WATER[0] = WATER[1] = WATER[2] = WATER[11] = WATER[12] = 1;
const TIERS = [
  { n:'Común',      c:'#c9c4b8' },
  { n:'Poco común', c:'#5fd36a' },
  { n:'Raro',       c:'#4aa3ff' },
  { n:'Épico',      c:'#b86bff' },
  { n:'Legendario', c:'#ffb12e' },
];

// ================= Sprites (pixel art original, 1 carácter = 1 píxel) =================
// Los árboles, arbustos y rocas se generan por código: manchas sombreadas con luz desde arriba a la izquierda,
// contorno oscuro y 4 variantes por tipo. Solo el cristal está dibujado a mano.
// Casas y hoguera de las aldeas (dibujadas a mano, con su contorno)
const HUT_ROWS = ['........OO........','......OOrrOO......','....OOrrRrrrOO....','..OOrrrrrrRrrrOO..','OOrrRrrrrrrrrRrrOO','OrrrrrrRrrrrrrrrrO','OOOOOOOOOOOOOOOOOO','.OwwWwwwwwwWwwwwO.','.OwwWOOwwOOOOwwwO.','.OwwWOgOwOddOWwwO.','.OwwWOOOwOddOWwwO.','.OwwWwwwwOddOWwwO.','.OOOOOOOOOOOOOOOO.'];
const WELL_ROWS = ['..OOOOO..','.OrrrrrO.','OrRrrrRrO','.OOOOOOO.','..O.W.O..','..O.k.O..','.OOOOOOO.','OsbbbbbsO','OSsSsSsSO','.OOOOOOO.'];
const MILL_ROWS = ['.....OOO.....','....OrrrO....','...OrRrRrO...','..OrrrrrrrO..','.OrRrrrrrRrO.','OOOOOOOOOOOOO','.OwwwwwwwwwO.','.OwWwwwwwWwO.','.OwwwOOOwwwO.','.OwwwObOwwwO.','.OwwwOOOwwwO.','.OwWwwwwwWwO.','OwwwwwwwwwwwO','OwwwwOOOwwwwO','OwWwwOdOwwWwO','OwwwwOdOwwwwO','OWwwwOdOwwwWO','OOOOOOOOOOOOO'];
// Cantera: un foso escalonado en la roca, con bloques cortados a un lado
const QUARRY_ROWS = ['...O..............................','...wwwwwwww.......................','...w......cOOsssssssOOO...........','...w...OOscsssDDLlLsssssOO........','...w..OsssbSSSSSLSLSSSDsssO.......','...w.OsssSSDddddLlLddDSSsssO......','...wOssDSSddODDDLDLDOddSSDssO.....','...wOssSSddODOeeLlLODOddSSssOO....','...wssDSDdODDeeELELeDDOdDSDssO....','...wssDSDdODDeeELlLeDDOdDSDssO....','...wOssSSddODOeeeeeODOddSSssObbb..','...wOssDSSddODDDDDDDOddSSDssOBBB..','...w.OsssSSDdddddddddDSSsssO......','...w..OsssDSSSSSDSSSSSDsssO.bbbbbb','...w...OOsssssDDDDDsssssOO..BBBBBB','...w......OOOsssssssOOO....bbbbbb.','...w.......................BBBBBB.','..OOO.............................'];
// Ayuntamiento (piedra, tejado azul y bandera) y almacén (granero de madera)
const HALL_ROWS = ['...........OO...........','...........O............','...........O............','...........O............','.......OOOOOOOOOO.......','.....OOrrrrRrrrrrOO.....','...OOrrrRrrrrrrRrrrOO...','.OOrrrrrrrrrrrrrrrrrrOO.','OOOOOOOOOOOOOOOOOOOOOOOO','.OsSsSsSsSsSsSsSsSsSsSO.','.OsOOOsSOOOOOOOOsSOOOsO.','.OsObOsSOddddddOsSObOsO.','.OsOOOsSOddddddOsSOOOsO.','.OsSsSsSOddddddOsSsSsSO.','.OSsSsSsOddddddOSsSsSsO.','OOOOOOOOOOOOOOOOOOOOOOOO','.wwwwwwwwwwwwwwwwwwwwww.'];
const STORE_ROWS = ['....OOOOOOOOOO....','..OOwwwwWwwwwwOO..','OOwwwwwwWwwwwwwwOO','OWWWWWWWWWWWWWWWWO','OOOOOOOOOOOOOOOOOO','.OppppppppppppppO.','.OpPpPpOOOOpPpPpO.','.OpppppOddOpppppO.','.OpPpPpOdxOpPpPpO.','.OpppppOxdOpppppO.','.OpPpPpOddOpPpPpO.','.OOOOOOOOOOOOOOOO.'];
const TOWER_ROWS = ['..OOOOOO..','.OrrrrrrO.','OrRrrrrRrO','OOOOOOOOOO','.OwOwwOwO.','.OwwwwwwO.','OOOOOOOOOO','..OwOOwO..','..OwwwwO..','..OwOOwO..','..OWwwWO..','..OwOOwO..','..OWwwWO..','..OwOOwO..','.OOwwwwOO.','.OwwOOwwO.','OwwwOOwwwO','OOOOOOOOOO'];
// Variedad de casas: cabaña, con chimenea, alargada, de dos plantas y redonda
const HOUSE_DESIGNS = [HUT_ROWS, ['...........OO...','...........OWO..','.....OOOOOOOWO..','....OrrrrrrrOO..','...OrrRrrrrRrrO.','..OrrrrrrrrrrrrO','.OOOOOOOOOOOOOOO','.OwwwwwwwwwwwwO.','.OwOOOwwOOOwwwO.','.OwOgOwwOddOwwO.','.OwOOOwwOddOwwO.','.OWwwwwwOddOwWO.','.OOOOOOOOOOOOOO.'], ['....OOOOOOOOOOOO....','..OOrrrrRrrrrRrrOO..','OOrrrrrrrrrrrrrrrrOO','OOOOOOOOOOOOOOOOOOOO','.OwwWwwwwwwwwwwWwwO.','.OwOOOwwOOOOwwOOOwO.','.OwOgOwwOddOwwOgOwO.','.OwOOOwwOddOwwOOOwO.','.OWwwwwwOddOwwwwwWO.','.OOOOOOOOOOOOOOOOOO.'], ['.....OOOO.....','...OOrrrrOO...','..OrrRrrRrrO..','.OrrrrrrrrrrO.','OOOOOOOOOOOOOO','.OwwwwwwwwwwO.','.OwOOOwwOOOwO.','.OwOgOwwOgOwO.','.OwOOOwwOOOwO.','.OWWWWWWWWWWO.','.OwwwOOOOwwwO.','.OwwwOddOwwwO.','.OwwwOddOwwwO.','.OWwwOddOwwWO.','.OOOOOOOOOOOO.'], ['......OO......','....OOrrOO....','...OrrRrrrO...','..OrrrrrRrrO..','.OrRrrrrrrrrO.','OrrrrrrrrRrrrO','OOOOOOOOOOOOOO','.OwwwOOOOwwwO.','.OwwwOddOwwwO.','.OWwwOddOwwWO.','.OOOOOOOOOOOO.']];
const ROOFS = [null, ['#b8483a', '#8a3028'], ['#5a7a9a', '#3a5a7a'], ['#8a6a4a', '#6a4a2a']]; // paja (la del color de la casa), teja, pizarra, tablas
const ALTAR_ROWS = ['......O......','.....OfO.....','....OfFfO....','.....OFO.....','..OOOOOOOOO..','.OsSsSsSsSsO.','.OSOOOOOOOSO.','..OsSsSsSsO..','..OSsSsSsSO..','.OOOOOOOOOOO.','OpppppppppppO','OOOOOOOOOOOOO'];
// Banco (al doble) y las maravillas de cada régimen (a 1:1, con más detalle)
const WONDER_ROWS = {"republica": [".............OOOO..........", "............OkrrrO.........", "............OkrrrO.........", "............OkOOO..........", "...........OOkOO...........", "........OOOsssssOOO........", "......OOsssssssssssOO......", "...OOOssssssyyyssssssOOO...", ".OOsssssssssyyysssssssssOO.", "OsssssssssssssssssssssssssO", "OsssssssssssssssssssssssssO", "OSSSSSSSSSSSSSSSSSSSSSSSSSO", "OsssssssssssssssssssssssssO", ".OssSwwssSwwssSwwssSwwssSO.", ".OssSwwssSwwssSwwssSwwssSO.", ".OssSwwssSwwssSwwssSwwssSO.", ".OssSwwssSwwdddwwssSwwssSO.", ".OssSwwssSwwdddwwssSwwssSO.", ".OssSwwssSwwdddwwssSwwssSO.", ".OssSwwssSwwdddwwssSwwssSO.", ".OssSwwssSwwdddwwssSwwssSO.", "OsssssssssssssssssssssssssO", "OSSSSSSSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOOOOOOOO."], "monarquia": ["....OOO...................OOO..", "...OkyyO.................OkyyO.", "...OkyyO.......O.........OkyyO.", "...OkOO......OOyOO.......OkOO..", "...OrO......OyOOOyO......OrO...", "..OrrrO.....OyyyyyO.....OrrrO..", "..OrrrO.....OyryryO.....OrrrO..", ".OrrrrrO....OyyyyyO....OrrrrrO.", ".OrrrrrO....OOOrOOO....OrrrrrO.", "OrrrrrrrO..OrrrrRRRO..OrrrrrrrO", ".OssssSO..OrrrrrRRRrO..OssssSO.", ".OssssSO.OrrrrrrRRRrrO.OssssSO.", ".OssssSOOrrrrrrrRRRrrrOOssssSO.", ".OssssSOsrrrrrrrrrrrrrsOssssSO.", ".OswwsSssssssssssssssssSswwsSO.", ".OswwsSssssssssssssssssSswwsSO.", ".OswwsSssssssssssssssssSswwsSO.", ".OssssSsswwssbbbbbsswwsSssssSO.", ".OssssSsswwssbbbbbsswwsSssssSO.", ".OssssSsswwssssssssswwsSssssSO.", ".OswwsSssssssssdsssssssSswwsSO.", ".OswwsSsssssssdddssssssSswwsSO.", ".OswwsSsswwsssdddssswwsSswwsSO.", ".OssssSsswwsssdddssswwsSssssSO.", ".OssssSsswwsssdddssswwsSssssSO.", ".OssssSsssssssdddssssssSssssSO.", ".OssssSsssssssdddssssssSssssSO.", ".OssssSsssssssdddssssssSssssSO.", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOOOOOOOOOOOO."], "dictadura": ["...............OO..", "..............ObbO.", "........OOO...ObbO.", ".......OBBBO..ObbO.", "......OBBBBBOObbO..", ".......ObbbO.ObbO..", ".......ObbBOObbO...", ".......ObbbOObbO...", "......OObbbObbO....", ".....ObbbbBBbbO....", "....OBbbybBBBO.....", "....OBbbybBBBO.....", "....OBbbybBBBO.....", "....OBbbybBBBO.....", "....OBbbybBBBO.....", "....OBbbybBBBO.....", "....OBbbbbbBBO.....", "....ObbbbbbBBO.....", ".....ObbbbbBBO.....", "......ObbOBBO......", "......ObbOBBO......", "......ObbOBBO......", "......ObbOBBO......", "....OOObbOBBOOO....", "...OsrsssssssrSO...", "...OsrsssssssrSO...", "...OsrsyyyyysrSO...", "...OsrsyyyyysrSO...", "...OsrsssssssrSO...", "..OOsssssssssSSOO..", ".OSSSSSSSSSSSSSSSO.", ".OSSSSSSSSSSSSSSSO.", "..OOOOOOOOOOOOOOO.."], "comunismo": ["..........O..........", ".........OyO.........", "........OyyyO........", ".......OyyyyyO.......", "........OyyyO........", "........OyOyO........", ".........OOO.........", "........OrrRO........", "........OrrRO........", "........OrrRO........", "........OyyyO........", "........OrrRO........", "........OrrRO........", "........OrrRO........", ".......OrrrRRO.......", ".......OyyyyyO.......", ".......OrrrRRO.......", ".......OrryRRO.......", ".....O.OryyyRO.O.....", "...OOBOOrrrRROOBOO...", "..ObOBOOrrrRROOBObO..", "..ObBOOrrrrRRROOBbO..", ".ObbBOOrrrrRRROOBbbO.", ".ObbbOOrrrrRRROObbbO.", ".ObbbOOrrrrRRROObbbO.", ".ObbbOOrrrrRRROObbbO.", ".OBOBOOrrrrRRROOBOBO.", ".OBOBOrrrrrRRRROBOBO.", ".OsssssssssssssssSSO.", ".OsssssssssssssssSSO.", ".OrrrrrrrrrrrrrrrrrO.", ".OsssssssssssssssSSO.", ".OsssssssssssssssSSO.", "OSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOO."], "fascismo": ["..............O..............", ".............OyO.............", "........OOOOOOyyOOOOO........", ".......OyyyyyyyyyyyyyO.......", "........OOyyyyyyyyyOO........", ".OOOOOOOOOOOyyyyyOOOOOOOOOOO.", "OgggggggggggggggggggggggggggO", "OgggkgkgkgkgkgkgkgkgkgkgkgggO", "OgggggggggggggggggggggggggggO", "OGGGGGGGGGGGGGGGGGGGGGGGGGGGO", ".OgggggggggggggggggggggggggO.", ".OggGrrgGgggggggggggGgrrGggO.", ".OggGrrgGgggggOgggggGgrrGggO.", ".OggGrrgGggOOO.OOOggGgrrGggO.", ".OggGyrgGggO.....OggGgryGggO.", ".OggGrrgGgO.......OgGgrrGggO.", ".OggGrrgGgO.......OgGgrrGggO.", ".OggGrrgGgO.......OgGgrrGggO.", ".OggGrrgGgO.......OgGgrrGggO.", ".OggGrggGgO.......OgGggrGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgO.......OgGgggGggO.", ".OggGgggGgOOOOOOOOOgGgggGggO.", "OGGGGGGGGGGGGGGGGGGGGGGGGGGGO", "OGGGGGGGGGGGGGGGGGGGGGGGGGGGO", ".OOOOOOOOOOOOOOOOOOOOOOOOOOO."]};
Object.assign(WONDER_ROWS, {"socialismo": ["..............OOOOO..............", ".............OrrkrrO.............", "............OrrrrrrrO............", "...........OrrrrrrrrrO...........", "............OsssssSSO............", "............OsssssSSO............", "............OsyyyyySO............", "............OsysksySO............", "............OsysksySO............", "............OsysssySO............", "............OsyyyyySO............", "............OsssssSSO............", ".OOOOOOOOOOOOsssssSSOOOOOOOOOOOO.", "OsssssssssssssssssSSssssssssssssO", "OSSSSSSSSSSSSsssssSSSSSSSSSSSSSSO", ".OssssrrrsssssssssssssssrrrssSSO.", ".OssssrrrsssssssssssssssrrrssSSO.", ".OsswwryrwwwsssssssswwwsryrwsSSO.", ".OsswwryrwwwsssssssswwwsryrwsSSO.", ".OsswwrrrwwwsssssssswwwsrrrwsSSO.", ".OsswwrrrwwwsssdddsswwwsrrrwsSSO.", ".OssssrrrsssssdddddsssssrrrssSSO.", ".OssssrrrsssssdddddsssssrrrssSSO.", ".OsswwwrswwwssdddddswwwssrwwsSSO.", ".OsswwwsswwwssdddddswwwsswwwsSSO.", ".OsswwwsswwwssdddddswwwsswwwsSSO.", ".OsswwwsswwwssdddddswwwsswwwsSSO.", ".OssssssssssssdddddssssssssssSSO.", ".OssssssssssssdddddssssssssssSSO.", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO."], "teocracia": [".............O.O.O.............", "............OyOyOyO............", ".............OOyOO.............", "............OyyyyyO............", ".............OOyOO.............", "............OyOyOyO............", "............OOOyOOO............", "...........OyyyyYYYO...........", "..........OyyyyyYYYyO..........", ".........OyyyyyyYYYyyO.........", "........OyyyyyyyYYYyyyO........", ".......OyyyyyyyyYYYyyyyO.......", ".......OyyyyyyyyYYYyyyyO.......", ".......OyyyyyyyyyyyyyyyO.......", "......OsssssssssssssssssO......", "......OsswwsrrrrrrrswwssO......", "......OsswwsrryyyrrswwssO......", "......OsswwsrryyyrrswwssO......", "......OsswwsrrrrrrrswwssO......", "....OOOSSSSSSSSSSSSSSSSSOOO....", "...OssssssssssdddssssssssssO...", "...OssSsssSssdddddsSsssSsssO...", "...OssSsssSssdddddsSsssSsssO...", "...OssSsssSssdddddsSsssSsssO...", "...OssSsssSssdddddsSsssSsssO...", ".OOOSSSSSSSSSdddddSSSSSSSSSOOO.", "OsssssssssssssssssssssssssssssO", "OsssssssssssssssssssssssssssssO", "OsssssssssssssssssssssssssssssO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOOOOOOOOOOOO."]});
const FORGE_ROWS = ["..........OO..", "..........OSO.", "...OOOOOOOOSO.", "..OrrrrrrrrOO.", ".OrrRrrrRrrrO.", "OrrrrrrrrrrrrO", "OOOOOOOOOOOOOO", ".OsSsSOOOsSsO.", ".OsSsOffOsSsO.", ".OSsSOffOSsSO.", ".OsSsOkkOsSsO.", ".OOOOOOOOOOOO."];
const HOSP_ROWS = [".......OO.......", "......OrrO......", "....OOOrrOOO....", "..OOssrrrrssOO..", "OOsssssrrsssssOO", "OOOOOOOOOOOOOOOO", ".OwwwwwwwwwwwwO.", ".OwOOwwwwwwOOwO.", ".OwOgOwOOwOgOwO.", ".OwOOwOddOwOOwO.", ".OWWWWOddOWWWWO.", ".OOOOOOOOOOOOOO."];
const BARRACKS_ROWS = ["....OOO..........OOO..", "...OkrrO........OkrrO.", "...OkrrO........OkrrO.", "..OOkrO.OO.OO.OOOkrO..", ".OsskssOssOssOssOksO..", ".OsskssOssOssOssOksO..", ".OssssssssssssssssSSO.", ".OssssssssssssssssSSO.", ".OssskssssddssssksSSO.", ".OsssksssddddsssksSSO.", ".OsssksssddddsssksSSO.", ".OsssssssddddsssssSSO.", ".OsssssssddddsssssSSO.", ".OsssssssddddsssssSSO.", "..OOOOOOOOOOOOOOOOOO.."];
const LONJA_ROWS = ["............OOOOOOOOO.", "...........OkkkkkkkkkO", "...OOOOOOOOOOkOOOOkOO.", ".OOrrrrrrrrrrrrOOOkO..", "OrrrrrrrrrrrrrrrrOkO..", "ORRRRRRRRRRRRRRRROkO..", ".OwwwwwwwwwwwwwWOOkO..", ".OwwwwwwwwwwwwwWOOkO..", ".OwwwwddWddwwwwWOOkO..", ".OwwwwddWddwwwwWOOkO..", ".OwwwwddWddwwwwWOcWOO.", ".OwwwwddWddwwwwWOccccO", ".OwwwwddWddwwwwWOccccO", "..OOOOOOOOOOOOOO.OOOO."];
const THEATER_ROWS = ["........OOOOOOOOOO........", ".......OkRRRRRRRRkO.......", ".......OkRRRRRRRRkO.......", ".......OkrrrrrrrrkO.......", ".OOOOOOOkrrrrrrrrkOOOOOOO.", "OssssssssssssssssssssssssO", "OssssssssssssssssssssssssO", ".OOSSSSSSSSSSSSSSSSSSSSOO.", "..OSSSSSSSSSSSSSSSSSSSSO..", "...OOssssssssssssssssOO...", "....OssssssssssssssssO....", ".OOOOOOSSwwwwwwwwSSOOOOOO.", "OSSSSSSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOOOOOOO."];
// Grandes templos según la fe: catedral (un solo dios), panteón (muchos dioses) y zigurat (dioses del cielo y del fuego)
const SCHOOL_ROWS = ["..........OOOO..........", "..........OssO..........", "..........OyyO..........", "..........OyyO..........", "..........OssO..........", "..........OssO..........", ".........OrrrrO.........", "......OOOrrrrrrOOO......", "....OOrrrrrrrrrrrrOO....", ".OOOrrrrrrrrrrrrrrrrOOO.", "ORRRRRRRRRRRRRRRRRRRRRRO", ".OsssssssbbbbbbssssssSO.", ".OsssssssbbbbbbssssssSO.", ".OsgSggsssssssssgSggsSO.", ".OsgSggsssddddssgSggsSO.", ".OsgSggsssddddssgSggsSO.", ".OsgSggsssddddssgSggsSO.", ".OssssssssddddsssssssSO.", ".OssssssssddddsssssssSO.", ".OssssssssddddsssssssSO.", ".OssssssssddddsssssssSO.", "OOOOOOOOOOOOOOOOOOOOOOOO"];
const HOLY_ROWS = {"catedral": ["....y..................y....", "....O..................O....", "....O..................O....", "...OrO................OrO...", "...OrO................OrO...", "..OrrrO..............OrrrO..", "..OrrrO.....yyyy.....OrrrO..", ".OrrrrrO.....yy.....OrrrrrO.", ".OrrrrrO.....OO.....OrrrrrO.", "OrrrrrrrO...ORRO...OrrrrrrrO", ".OssssSO...ORRRRO...OssssSO.", ".OssssSO..ORRRRRRO..OssssSO.", ".OsgOgSO.ORRRRRRRRO.OsgOgSO.", ".OsgggSSORRRRRRRRRROssgggSO.", ".OsgggRRRRRRRRRRRRRRRRgggSO.", ".OsgggSSssssppppssssssgggSO.", ".OsgggSSsssppppppsssssgggSO.", ".OssssSSsssppyyppssssssssSO.", ".OssssSSsssppyyppssssssssSO.", ".OsgOgSSsssppppppsssssgOgSO.", ".OsgggSSssssppppssssssgggSO.", ".OsgggSSssssssssssssssgggSO.", ".OsgggSSssssssssssssssgggSO.", ".OsgggSSsggssssssggsssgggSO.", ".OssssSSsggssssssggssssssSO.", ".OssssSSsggssddssggssssssSO.", ".OssssSSsggsddddsggssssssSO.", ".OssssSSsggddddddggssssssSO.", ".OssssSSsssddddddssssssssSO.", ".OssssSSsssddddddssssssssSO.", ".OssssSSsssddddddssssssssSO.", ".OssssSSsssddddddssssssssSO.", "OSSSSSSSSSSSSSSSSSSSSSSSSSSO", ".OOOOOOOOOOOOOOOOOOOOOOOOOO."], "panteon": ["..............yy..............", "..............yy..............", "............OOssOO............", "..........OOssssssOO..........", ".......OOOssssssssssOOO.......", ".....OOsssSSSSSSSSSSsssOO.....", "..OOOsssssSSSSSSSSSSsssssOOO..", "OOssssssssssssssssssssssssssOO", "OssssssssssssssssssssssssssssO", "OssssssssssssssssssssssssssssO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", ".OccswwccswwccswwccswwccswwccO", ".OccswwccswwccswwccswwccswwccO", ".OccswwccswwccswwccswwccswwccO", ".OccswwccswwccswwccswwccswwccO", ".OccswwccswwccswwccswwccswwccO", ".OccswwccswwcyyyyccswwccswwccO", ".OccswwccswwcyyyyccswwccswwccO", ".OccswwccswwcyyyyccswwccswwccO", ".OccswwccswwcyyyyccswwccswwccO", ".OccswwccswwcyyyyccswwccswwccO", "OssssssssssssssssssssssssssssO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSSSO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"], "zigurat": ["..............ff..............", ".............fyyf.............", "............OrrrrO............", "............OrddrO............", "............OrddrO............", ".........OOOrrddrrOOO.........", ".........OsssddddsSSO.........", ".........OsssSSSSsSSO.........", ".........OSSSddddSSSO.........", "......OOOssssSSSSssssOOO......", "......OssssssddddssssSSO......", "......OssssssSSSSssssSSO......", "......OssssssddddssssSSO......", "......OSSSSSSSSSSSSSSSSO......", "...OOOsssssssddddsssssssOOO...", "...OsssssssssSSSSsssssssSSO...", "...OsssssssssddddsssssssSSO...", "...OsssssssssSSSSsssssssSSO...", "...OSSSSSSSSSddddSSSSSSSSSO...", "OOOssssssssssSSSSssssssssssOOO", "OssssssssssssddddssssssssssSSO", "OssssssssssssSSSSssssssssssSSO", "OssssssssssssddddssssssssssSSO", "OssssssssssssSSSSssssssssssSSO", "OssssssssssssddddssssssssssSSO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"]};
const TAVERN_ROWS = ["...........cc.......", "...........cc.......", ".....OOOOOOOOOO.....", "....ORRRRRRRRRRO....", "...ORrrrrrrrrrrRO...", "..ORrrrrrrrrrrrrRO..", ".ORRRRRRRRRRRRRRRRO.", "kkkOwWwwWwwwwWwwWwO.", "kssOwWggWwwwwWggWwO.", "ksmOwWggWwddwWggWwO.", "kssOWWWWWWddWWWWWWOb", "...OwWwwWwddwWwwWwOb", "...OOOOOOOOOOOOOOOOO"];
const COLISEUM_ROWS = ["......O..OOOOOOOOOO..O......", ".....OrOOrssrssrssrOOrO.....", "....OOssssssssssssssssOO....", "..OOssssssssssssssssssssOO..", ".OsdssdssdssdssdssdssdssdsO.", ".OsdssdssdssdssdssdssdssdsO.", "OssssssssssssssssssssssssssO", "OSSSSSSSSSSSSSSSSSSSSSSSSSSO", "OssssssssssssssssssssssssssO", "OssdssdssdssdssdssdssdssdssO", "OssdssdssdssdssdssdssdssdssO", ".OssssssssssssssssssssssssO.", ".OSSSSSSSSSSSSSSSSSSSSSSSSO.", "..OOssssssssssssssssssssOO..", "....OOOOOOOOOOOOOOOOOOOO...."];
const BANK_ROWS = [".......OOOO.......", ".....OOyyyyOO.....", "...OOsssssssSOO...", ".OOssssssssssssSOO", "OOOOOOOOOOOOOOOOOO", ".OsSOsSOsSOsSOsSO.", ".OsSOsSOsSOsSOsSO.", ".OsSOsSOddOsSOsSO.", ".OsSOsSOddOsSOsSO.", ".OsSOsSOddOsSOsSO.", "OOOOOOOOOOOOOOOOOO", "OSSSSSSSSSSSSSSSSO"];
const TEMPLE_ROWS = ['.........OO.........','........OyyO........','.........OO.........','......OOOOOOOO......','....OOrrrrrrrrOO....','..OOrrRrrrrrrRrrOO..','OOrrrrrrrrrrrrrrrrOO','OOOOOOOOOOOOOOOOOOOO','.OOOOOOOOOOOOOOOOOO.','.OcOwwOcOddOcOwwOcO.','.OcOwwOcOddOcOwwOcO.','.OcOwwOcOddOcOwwOcO.','.OcOwwOcOddOcOwwOcO.','OOOOOOOOOOOOOOOOOOOO','ssssssssssssssssssss','SSSSSSSSSSSSSSSSSSSS'];
// La estatua de su dios sobre un pedestal
const OBELISK_ROWS = ['.....OOOO.....','....OsssSO....','....OsSssO....','.....OssO.....','...OOsssSOO...','..OssssssSsO..','.OsO.ssssS.OsO','.OsO.sSssS.OsO','.OsO.ssssS.OsO','..O..ssssS..O.','.....sSssS....','.....ssssS....','....OssssSO...','....OssssSSO..','...OsssssSSO..','...OssssssSO..','..OOOOOOOOOOO.','..OpppppppppO.','..OpPpPpPpPpO.','..OpppppppppO.','.OOOOOOOOOOOOO','.OqqqqqqqqqqqO','.OOOOOOOOOOOOO'];
const MARKET_ROWS = ['.OOOOOOOOOOOO......OOOOOOOOOOOO.','OaaAAaaAAaaAAO....ObbBBbbBBbbBBO','OaaAAaaAAaaAAO....ObbBBbbBBbbBBO','OaaAAaaAAaaAAO....ObbBBbbBBbbBBO','.OaOAaOaAOaAO......ObOBbObBObBO.','..O..O..O..O........O..O..O..O..','.O..........O......O..........O.','.O..........O......O..........O.','.O.kkKkgGkk.O......O.ffFfKkff.O.','.OkKkkgGgkKkO......OfFffKkKfFfO.','OOOOOOOOOOOOOO....OOOOOOOOOOOOOO','OwWwwWwwWwwWwO....OwWwwWwwWwwWwO','OwWwwWwwWwwWwO....OwWwwWwwWwwWwO','OOOOOOOOOOOOOO....OOOOOOOOOOOOOO'];
const FIRE_ROWS = ['..OOOOO..','.OsLlLsO.','OsLlLlLsO','.OsssssO.','..OOOOO..'];
const GEM = ['...O...','..OlO.O','.OOlxOl','OlOxxOx','OlxOxlO','OxxOxxO','.OOOOO.'];
const STONE = { O:'#3a3735', s:'#8a847c', l:'#b8b2a8', d:'#69635c' };
const BUSH = { O:'#1f3a19', d:'#2f6224', g:'#4a8a33', l:'#6fae48' };
const PALS = {
  hut:    { O:'#2a1a10', r:'#d8b45a', R:'#a88838', w:'#9a6a3e', W:'#6e4626', d:'#3a2414', g:'#f0d070' },
  piedra: { O:'#22201e', r:'#b8483a', R:'#8a3028', w:'#a8a49c', W:'#7a766e', d:'#4a3020', g:'#f0d070' },
  camp:   { O:'#2a2420', s:'#8a847c', L:'#6a4426', l:'#9a6a3e' },
  cantera: { O:'#2a2420', s:'#c8c4ba', S:'#a8a49a', d:'#8a867e', D:'#6e6a62', e:'#55514a', E:'#3a3632', b:'#e0dcd2', B:'#a8a49a', L:'#7a5230', l:'#a8784a', w:'#6a4426', c:'#c8b890' },
  ayuntamiento: { O:'#22201e', r:'#3a6aa8', R:'#2a4a80', s:'#d0c8b8', S:'#b0a898', b:'#f0d070', d:'#4a3020', f:'#d8403a', w:'#8a8478' },
  almacen: { O:'#2a1a10', w:'#8a5a30', W:'#6a4426', p:'#b8864e', P:'#9a6a3e', d:'#5a3a20', x:'#7a5230' },
  torre: { O:'#2a1a10', r:'#8a3028', R:'#6a2018', w:'#9a6a3e', W:'#7a5230' },
  altar: { O:'#2a2420', s:'#c0b8a8', S:'#948c7c', f:'#f0a030', F:'#fff0a0', p:'#8a8478' },
  templo: { O:'#2a2420', r:'#c8a040', R:'#a07820', c:'#e8e0d0', w:'#3a3028', d:'#5a3a20', s:'#c8c0b0', S:'#a8a090', y:'#f0d060' },
  monumento: { O:'#2a2420', s:'#e0d8c8', S:'#aaa292', p:'#b8b0a0', P:'#8a8478', q:'#9a948a', y:'#f0d060' },
  mercado: { O:'#2a1a10', a:'#d84a3a', A:'#f6ead2', b:'#3a6ab8', B:'#f6ead2', k:'#e8c450', K:'#d87a3a', g:'#6ab04a', G:'#3a7a2a', f:'#c8d8e0', F:'#8aa8b8', w:'#9a6a3e', W:'#7a5030' },
  teatro: { O:'#2a2420', s:'#d8ccb0', S:'#a89c80', r:'#b8303a', R:'#80202a', k:'#5a3a20', w:'#8a6a48' },
  escuela: { O:'#2a2018', s:'#e8dcc0', S:'#b8a888', r:'#b04a30', R:'#7a3020', g:'#8ab8d8', d:'#5a3a20', y:'#f0c848', b:'#3a5a3a' },
  catedral: { O:'#262230', s:'#cfc8bc', S:'#9e978c', r:'#4a5468', R:'#363e50', g:'#4a78c0', p:'#c03848', y:'#f0d060', d:'#4a3020' },
  panteon: { O:'#2a2420', s:'#ece4d4', S:'#bcb4a4', c:'#f4eee2', w:'#4a4038', y:'#e8c050' },
  zigurat: { O:'#2a2018', s:'#d8b080', S:'#b08858', d:'#e8d0a8', f:'#f08030', y:'#f8d050', r:'#9a6a40' },
  taberna: { O:'#2a2018', c:'#5a5048', R:'#7a3420', r:'#a8482a', w:'#e0d0a8', W:'#6a4426', g:'#f0c060', d:'#4a2c18', k:'#3a2a1a', s:'#b08850', m:'#e8e0d0', b:'#8a5a30' },
  coliseo: { O:'#2a2420', s:'#d8c8a8', S:'#a89878', d:'#4a3a2a', r:'#c8302a' },
  cuartel: { O:'#22201e', s:'#a8a090', S:'#7a7468', d:'#4a3020', k:'#2a2420', r:'#c8302a' },
  lonja: { O:'#2a1a10', w:'#9a6a3e', W:'#6e4626', r:'#3a6ab8', R:'#2a4a80', d:'#3a2414', c:'#c8a060', k:'#4a3420' },
  hospital: { O:'#2a2620', s:'#c8d0d8', S:'#98a0a8', w:'#f0ece4', W:'#c8c0b4', r:'#d0383a', g:'#8ab8e0', d:'#6a4a30' },
  herreria: { O:'#22201e', r:'#6a4a3a', R:'#4a3428', s:'#9a948a', S:'#6e6a62', f:'#ff8a2a', k:'#3a3a40' },
  banco: { O:'#22201e', s:'#e0d8c8', S:'#a8a090', y:'#f0c840', d:'#4a3424' },
  republica: { O:'#2a2420', s:'#ece6d6', S:'#bcb4a2', w:'#6a6256', d:'#4a3424', k:'#3a3028', r:'#c8403a', y:'#e8c050' },
  monarquia: { O:'#22201e', s:'#e4d8c0', S:'#b4a68c', w:'#3a4a6a', d:'#5a3a20', k:'#3a3028', r:'#3a5ab0', R:'#2a3e80', y:'#f0c840', b:'#c83a3a' },
  dictadura: { O:'#1e1c1a', b:'#9a7a48', B:'#6a5232', s:'#b8b2a6', S:'#88827a', y:'#e8c050', r:'#b8302a' },
  comunismo: { O:'#221a18', r:'#c8302a', R:'#8a1e1a', y:'#f0c838', b:'#8a7a5a', B:'#5e5240', s:'#c8c0b0', S:'#989080' },
  socialismo: { O:'#22201e', s:'#e8dcc8', S:'#b8a88c', w:'#4a4a5a', d:'#5a3a20', k:'#2a2420', r:'#d0383a', y:'#f0c840' },
  teocracia: { O:'#2a2018', s:'#e8e0cc', S:'#b8ac90', w:'#3a3028', d:'#4a2a18', r:'#8a2a5a', y:'#f0c840', Y:'#c8982a' },
  fascismo: { O:'#1a1a1c', g:'#8a8a86', G:'#5e5e5a', k:'#2a2a2a', r:'#a82a24', y:'#d8b040' },
  pozo:   { O:'#22201e', r:'#8a5a30', R:'#6a4426', W:'#c8b890', k:'#7a5230', s:'#a8a49c', S:'#7a766e', b:'#1a1612' },
  molino: { O:'#2a1a10', r:'#b8483a', R:'#8a3028', w:'#e0d4b8', W:'#b8a888', d:'#4a3020', b:'#3a2a1a' },
  forest: { O:'#183318', d:'#2e5e24', g:'#3f7d2e', l:'#5f9e3e', h:'#8cc455', t:'#6a4426', T:'#4a2e18' },
  pine:   { O:'#0f2518', d:'#1f4a2c', g:'#2d6339', l:'#468049', h:'#6aa060', t:'#5a3a22' },
  snow:   { O:'#16302a', d:'#2a5242', g:'#3a6a52', l:'#e4eef2', h:'#ffffff', t:'#5a3a22' },
  dry:    { O:'#353816', d:'#5e6a24', g:'#7d8c33', l:'#a3ad4c', h:'#c6c86a', t:'#6e4c2a' },
  swamp:  { O:'#172615', d:'#2c4826', g:'#3f6034', l:'#5c8048', h:'#7ea05a', t:'#4a3a25' },
  palm:   { O:'#22401a', d:'#3a6e24', g:'#4f8c2e', l:'#78b544', h:'#9fd060', t:'#a07a44', c:'#4f8c2e' },
  coco:   { O:'#22401a', d:'#3a6e24', g:'#5a9a32', l:'#86c24c', h:'#b0dc6c', t:'#a07a44', c:'#6a3e1a' },
  birch:  { O:'#2a3a14', d:'#5a8a2a', g:'#78a83a', l:'#9cc850', h:'#c4e070', w:'#eeeae0', k:'#2a2a2a' },
  blue:   { O:'#10243a', d:'#24506a', g:'#337088', l:'#5a98aa', h:'#8cc4cc', t:'#5a3a22' },
  sunset: { O:'#3a1a10', d:'#9a3a1a', g:'#cc5a22', l:'#ee8a34', h:'#ffc060', t:'#5a3a22' },
  moss:   { O:'#1a2a10', d:'#3a5a1a', g:'#5a7a20', l:'#8aa830', h:'#b8cc50', t:'#4a3a25' },
  cherry: { O:'#4a1e34', d:'#c0507a', g:'#e07aa0', l:'#f5a8c4', h:'#ffd8e6', t:'#5a3428', T:'#3a2018' },
  autumn: { O:'#3a180c', d:'#a04012', g:'#d0661a', l:'#eb9a2a', h:'#ffd060', t:'#5a3a22' },
  elder:  { O:'#102a12', d:'#24501e', g:'#356f28', l:'#529038', h:'#7cb44c', t:'#5a3a22', T:'#3a2414' },
  frost:  { O:'#1c2e44', d:'#6a90b8', g:'#9cc0e0', l:'#cfe6f8', h:'#ffffff', t:'#4a4a5a', T:'#2a2a38' },
  baobab: { O:'#3a2a14', d:'#6a7a2a', g:'#8a9a34', l:'#b0b850', h:'#d4d470', t:'#8a6a4a', T:'#5a4430' },
  mangrove:{ O:'#0e1e10', d:'#1e3a20', g:'#2e5230', l:'#46704a', h:'#6a9a60', t:'#3a3020', T:'#221c12' },
  life:   { O:'#5a3a08', d:'#c88a18', g:'#e8b02a', l:'#ffd75a', h:'#fff4b0', t:'#7a5a3a', T:'#4a3420' },
  cactus: { O:'#1b3a22', d:'#2c6a3c', g:'#3d8a4c', l:'#5fae5c', h:'#cfe6a8', r:'#5fae5c' },
  bloom:  { O:'#1b3a22', d:'#2c6a3c', g:'#3d8a4c', l:'#5fae5c', h:'#cfe6a8', r:'#ff6aa8' },
  red:    { ...BUSH, r:'#e03c4c' },
  blueb:  { ...BUSH, r:'#6f5ce0' },
  goldb:  { ...BUSH, r:'#ffd23a' },
  moon:   { O:'#102a2e', d:'#1e4a48', g:'#2e6a66', l:'#4a948a', r:'#a6f6ff' },
  stone:  STONE,
  iron:   { ...STONE, x:'#c8723a' },
  gold:   { ...STONE, x:'#f6d04d' },
  amethyst:{ O:'#2a1840', l:'#e6c8ff', x:'#9a5ae0' },
  mana:   { O:'#0c2a3a', l:'#d8fbff', x:'#3ad0e8' },
};
// Cada objeto: nombre, tipo de recurso y rareza (0 común … 4 legendario)
const OBJ = {
  'oak:forest':['Roble','tree',0], 'pine:pine':['Pino','tree',0], 'pine:snow':['Pino nevado','tree',0],
  'acacia:dry':['Acacia','tree',0], 'cactus:cactus':['Cactus','tree',0], 'cactus:bloom':['Cactus en flor','tree',1], 'willow:swamp':['Sauce','tree',0], 'palm:palm':['Palmera','tree',0],
  'birch:birch':['Abedul','tree',1], 'pine:blue':['Abeto azul','tree',1], 'acacia:sunset':['Acacia de fuego','tree',1],
  'willow:moss':['Sauce musgoso','tree',1], 'palm:coco':['Cocotero','tree',1],
  'oak:cherry':['Cerezo en flor','tree',2], 'pine:autumn':['Alerce otoñal','tree',2],
  'ancient:elder':['Árbol ancestral','tree',3], 'ancient:frost':['Árbol de escarcha','tree',3],
  'ancient:baobab':['Baobab milenario','tree',3], 'ancient:mangrove':['Mangle anciano','tree',3],
  'ancient:life':['Árbol de la vida','tree',4],
  'bush:red':['Bayas rojas','berry',0], 'bush:blueb':['Arándanos','berry',1], 'bush:goldb':['Bayas doradas','berry',2], 'bush:moon':['Bayas lunares','berry',3],
  'house:hut':['Cabaña','house',0], 'house:piedra':['Casa de piedra','house',0], 'fire:camp':['Hoguera','fire',0], 'well:pozo':['Pozo','house',0], 'hall:ayuntamiento':['Ayuntamiento','house',0], 'tower:torre':['Torre de vigía','house',0], 'altar:altar':['Altar','house',0], 'temple:templo':['Templo','house',0], 'obelisk:monumento':['Estatua','house',0], 'market:mercado':['Mercado','house',0], 'store:almacen':['Almacén','house',0], 'quarry:cantera':['Cantera','house',0], 'mill:molino':['Molino','house',0], 'bank:banco':['Banco','house',0], 'forge:herreria':['Herrería','house',0], 'hospital:hospital':['Hospital','house',0], 'barracks:cuartel':['Cuartel','house',0], 'theater:teatro':['Teatro','house',0], 'coliseum:coliseo':['Coliseo','house',0], 'tavern:taberna':['Taberna','house',0], 'cathedral:catedral':['Catedral','house',0], 'school:escuela':['Escuela','house',0], 'court:tribunal':['Tribunal','house',0], 'jail:carcel':['Cárcel','house',0], 'press:imprenta':['Imprenta','house',0], 'union:sindicato':['Casa del sindicato','house',0], 'parliament:parlamento':['Parlamento','house',0], 'academy:academia':['Academia de la lengua','house',0], 'university:universidad':['Universidad','house',0], 'council:consejo':['Palacio del Consejo de las Naciones','house',0], 'spy:espias':['Casa discreta','house',0], 'granary:granero':['Granero','house',0], 'smoke:ahumadero':['Ahumadero','house',0], 'woodshed:lenera':['Leñera','house',0], 'post:postas':['Casa de postas','house',0], 'house:mansion':['Mansión','house',0], 'house:chabola':['Chabola','house',0], 'cathedral:panteon':['Gran panteón','house',0], 'cathedral:zigurat':['Zigurat','house',0], 'tradehall:lonja':['Lonja del puerto','house',0], 'wonder:republica':['Foro de la República','house',0], 'wonder:monarquia':['Palacio Real','house',0], 'wonder:dictadura':['Estatua del Líder','house',0], 'wonder:comunismo':['Monumento al Trabajo','house',0], 'wonder:fascismo':['Arco del Triunfo','house',0], 'wonder:socialismo':['Casa del Pueblo','house',0], 'wonder:teocracia':['Gran Templo','house',0], 'wonder:democracia':['Ágora de la Democracia','house',0], 'wonder:partitocracia':['Palacio de los Partidos','house',0], 'wonder:monarquia_parlamentaria':['Palacio de las Cortes','house',0], 'wonder:oligarquia':['Mansión de las Familias','house',0], 'wonder:tecnocracia':['Gran Observatorio','house',0], 'wonder:anarquia':['Círculo de la Asamblea','house',0], 'mine:mina':['Mina','house',0],
  'rock:stone':['Piedra','stone',0], 'big:stone':['Roca','stone',0],
  'ore:iron':['Veta de hierro','mineral',1], 'ore:gold':['Veta de oro','mineral',2],
  'gem:amethyst':['Geoda de amatista','mineral',3], 'gem:mana':['Cristal de maná','mineral',4],
};
const KINDS = { tree:['Árboles','oak:forest'], berry:['Arbustos de bayas','bush:red'], stone:['Piedras y rocas','big:stone'], mineral:['Minerales','ore:iron'] };
// Árbol por bioma y rareza; null = cae a la rareza inferior
const TREES = {
  broad: ['oak:forest','birch:birch','oak:cherry','ancient:elder','ancient:life'],
  conif: ['pine:pine','pine:blue','pine:autumn','ancient:elder','ancient:life'],
  snow:  ['pine:snow','pine:blue','pine:autumn','ancient:frost','ancient:life'],
  dry:   ['acacia:dry','acacia:sunset','oak:cherry','ancient:baobab','ancient:life'],
  swamp: ['willow:swamp','willow:moss','oak:cherry','ancient:mangrove','ancient:life'],
  sand:  ['palm:palm','palm:coco',null,null,null],
  desert:['cactus:cactus','cactus:bloom',null,'ancient:baobab',null],
};
const BUSHES = ['bush:red','bush:blueb','bush:goldb','bush:moon',null];
const ROCKS = ['big:stone','ore:iron','ore:gold','gem:amethyst','gem:mana'];

// ---- Generador de sprites ----
// Letras: O contorno · d sombra · g medio · l luz · h brillo · t/T tronco · s piedra · x mineral · r baya · w/k corteza de abedul · c coco
function grid(w, h){ return { w, h, a:new Array(w * h).fill('.') }; }
// Edificios al doble de resolución pero a píxel fino: Scale2x suaviza las diagonales (tejados, cúpulas), el contorno se queda
// en un píxel y las superficies ganan textura: tejas en los tejados, tablones en la madera y sillares en la piedra
const WOODEN_PAL = new Set(['hut', 'almacen', 'torre', 'mercado']);
function fineBuilding(g0, pal, P){
  const w0 = g0.w, h0 = g0.h, at0 = (x, y) => x < 0 || y < 0 || x >= w0 || y >= h0 ? '.' : g0.a[y * w0 + x];
  const n = grid(w0 * 2, h0 * 2), W2 = n.w, H2 = n.h;
  for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
    const P0 = at0(x, y), A = at0(x, y - 1), Bc = at0(x + 1, y), C = at0(x - 1, y), D = at0(x, y + 1);
    let e0 = P0, e1 = P0, e2 = P0, e3 = P0;
    if (C === A && C !== D && A !== Bc) e0 = A; if (A === Bc && A !== C && Bc !== D) e1 = Bc;
    if (D === C && D !== Bc && C !== A) e2 = C; if (Bc === D && Bc !== A && D !== C) e3 = D;
    const i = y * 2 * W2 + x * 2; n.a[i] = e0; n.a[i + 1] = e1; n.a[i + W2] = e2; n.a[i + W2 + 1] = e3;
  }
  const at = (x, y) => x < 0 || y < 0 || x >= W2 || y >= H2 ? '.' : n.a[y * W2 + x], out = n.a.slice();
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    if (at(x, y) !== 'O') continue;
    const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
    if (nb.includes('.')) continue;                                  // borde exterior: se queda
    const fill = nb.find(c => c !== 'O' && c !== '.'); if (!fill) continue;
    const cx = x >> 1, cy = y >> 1;
    if (at0(cx, cy) === 'O' && [at0(cx - 1, cy), at0(cx + 1, cy), at0(cx, cy - 1), at0(cx, cy + 1)].includes('.')) { out[y * W2 + x] = fill; continue; } // mitad interior del contorno exterior
    const vert = at0(cx - 1, cy) !== 'O' && at0(cx + 1, cy) !== 'O', hor = at0(cx, cy - 1) !== 'O' && at0(cx, cy + 1) !== 'O';
    if ((vert && x % 2) || (hor && y % 2) || (!vert && !hor && x % 2 && y % 2)) out[y * W2 + x] = fill; // líneas interiores de un píxel
  }
  const wood = WOODEN_PAL.has(pal), dark = { r:'R', w:'W', s:'S', g:'G', p:'P' };
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const c = out[y * W2 + x], dk = dark[c]; if (!dk || !P[dk]) continue;
    const up = out[(y - 1) * W2 + x], row = y % 3, band = (y / 3) | 0;
    if (c === 'r') { if (row === 2 && (x + band * 2) % 4 !== 0 && up === 'r') out[y * W2 + x] = dk; }          // hileras de tejas
    else if (wood && c === 'w') { if (row === 2 && (x + band * 5) % 9 !== 0) out[y * W2 + x] = dk; }         // tablones
    else if (row === 2 || (row !== 2 && (x + (band % 2) * 3) % 6 === 0)) { if (up && up !== 'O' && up !== '.') out[y * W2 + x] = dk; } // sillares
  }
  n.a = out; return n;
}
const gset = (g, x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.a[y * g.w + x] = ch; };
const gget = (g, x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h) ? '.' : g.a[y * g.w + x];
const toneOf = lit => lit > .5 ? 'h' : lit > .12 ? 'l' : lit > -.38 ? 'g' : 'd';
// Pinta manchas elípticas; la última que cubre un píxel decide su sombreado, así se ven los bultos de la copa
function paintBlobs(g, blobs, rnd, map){
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    let lit = null;
    for (const b of blobs) {
      const dx = (x + .5 - b.x) / b.rx, dy = (y + .5 - b.y) / b.ry, d2 = dx * dx + dy * dy;
      if (d2 <= 1) lit = -(dx * .62 + dy * .78) * .85 + (1 - d2) * .15;
    }
    // Poco ruido: zonas de luz y sombra limpias
    if (lit !== null) { const t = toneOf(lit + (rnd() - .5) * .14); gset(g, x, y, map ? map[t] : t); }
  }
}
// Recorta al contenido, deja 1 px de margen y añade el contorno
function finish(g, ax){
  let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.a[y * g.w + x] !== '.') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const n = grid(x1 - x0 + 3, y1 - y0 + 3);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) n.a[(y - y0 + 1) * n.w + (x - x0 + 1)] = g.a[y * g.w + x];
  // Sombra de 1 px en la parte inferior de las masas de hojas: da volumen y separa la copa del contorno
  const shadeAt = [];
  for (let y = 1; y < n.h - 1; y++) for (let x = 0; x < n.w; x++) {
    const k = y * n.w + x;
    if ((n.a[k] === 'g' || n.a[k] === 'l') && n.a[k + n.w] === '.' && 'dglh'.includes(n.a[k - n.w])) shadeAt.push(k);
  }
  for (const k of shadeAt) n.a[k] = 'd';
  const edge = [];
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++)
    if (n.a[y * n.w + x] === '.' && [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => gget(n, x + dx, y + dy) !== '.')) edge.push(y * n.w + x);
  for (const k of edge) n.a[k] = 'O';
  return { g:n, ax:Math.round(ax) - x0 + 1 };
}
function roundTree(rnd, r, tw, th, bark){
  const S = Math.ceil(r * 3) + 8, g = grid(S, S + th + 4), cx = S / 2, cy = r * 1.15 + 2;
  const tx0 = Math.round(cx - tw / 2), base = Math.round(cy + r * .95 + th);
  for (let y = Math.round(cy); y <= base; y++) for (let k = 0; k < tw; k++)
    gset(g, tx0 + k, y, bark ? (rnd() < .25 ? 'k' : 'w') : (k === tw - 1 && tw > 1 ? 'T' : 't'));
  if (tw >= 2) { gset(g, tx0 - 1, base, 'T'); gset(g, tx0 + tw, base, 'T'); }
  const blobs = [{ x:cx, y:cy, rx:r, ry:r * .92 },
    { x:cx - r * .55, y:cy + r * .3, rx:r * .6, ry:r * .55 }, { x:cx + r * .55, y:cy + r * .3, rx:r * .6, ry:r * .55 }];
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k - 1) * 1.05 + (rnd() - .5) * .5;
    blobs.push({ x:cx + Math.cos(a) * r * .5, y:cy + Math.sin(a) * r * .5, rx:r * (.48 + rnd() * .12), ry:r * (.45 + rnd() * .12) });
  }
  paintBlobs(g, blobs, rnd);
  return finish(g, tx0 + (tw - 1) / 2);
}
function conifer(rnd, hgt, half, th){
  const S = half * 2 + 5, g = grid(S, hgt + th + 4), cx = Math.floor(S / 2), tier = 4;
  for (let y = 0; y < hgt; y++) {
    const f = (y + 1) / hgt, tp = (y % tier) / (tier - 1), hw = Math.max(0, Math.round(half * f * (.55 + .45 * tp)));
    for (let x = -hw; x <= hw; x++)
      gset(g, cx + x, 1 + y, toneOf(-(x / (hw + 1)) * .8 + (tp < .3 ? .25 : 0) - (tp > .85 ? .45 : 0) - f * .15 + (rnd() - .5) * .3));
  }
  for (let y = 1 + hgt; y < 1 + hgt + th; y++) gset(g, cx, y, 't');
  return finish(g, cx);
}
function acacia(rnd, S = 1){
  const g = grid(Math.ceil(26 * S), Math.ceil(18 * S)), cx = Math.round(13 * S), cy = Math.round(4 * S), base = Math.round(14 * S);
  for (let y = cy + 1; y <= base; y++) { gset(g, cx, y, 't'); if (S > 1.2) gset(g, cx + 1, y, 'T'); }
  gset(g, cx - 1, cy + 2, 't'); gset(g, cx - 2, cy + 1, 't'); gset(g, cx + 1, cy + 3, 't'); gset(g, cx + 2, cy + 2, 't');
  gset(g, cx - 1, base, 'T'); gset(g, cx + 1, base, 'T');
  const w = (7 + rnd() * 1.5) * S, ry = 2.2 * S;
  paintBlobs(g, [{ x:cx + .5, y:cy, rx:w, ry }, { x:cx - w * .45, y:cy - .8 * S, rx:w * .48, ry:ry * .82 }, { x:cx + w * .5, y:cy - .6 * S, rx:w * .5, ry:ry * .82 }], rnd);
  return finish(g, cx);
}
function willow(rnd, S = 1){
  const r = 5 * S, g = grid(Math.ceil(22 * S), Math.ceil(26 * S)), cx = Math.round(11 * S), cy = Math.round(7 * S), base = Math.round(cy + r + 5 * S);
  for (let y = cy; y <= base; y++) { gset(g, cx, y, 't'); gset(g, cx + 1, y, 'T'); }
  paintBlobs(g, [{ x:cx + .5, y:cy, rx:r + .5, ry:r * .85 }, { x:cx - 2.5 * S, y:cy + 1.5 * S, rx:3.2 * S, ry:3 * S }, { x:cx + 3.5 * S, y:cy + 1.5 * S, rx:3.2 * S, ry:3 * S }, { x:cx + .5, y:cy - 2 * S, rx:3.4 * S, ry:2.6 * S }], rnd);
  // Ramas colgantes
  for (let x = Math.round(cx - r); x <= cx + r + 1; x++) {
    if (Math.abs(x - cx - .5) < 1.5 || rnd() > .6) continue;
    let y = g.h - 1; while (y > 0 && !'dglh'.includes(gget(g, x, y))) y--;
    const len = Math.round((2 + Math.floor(rnd() * 4)) * S);
    for (let k = 1; k <= len; k++) gset(g, x, y + k, k % 2 ? 'g' : 'd');
  }
  return finish(g, cx);
}
function palm(rnd){
  const g = grid(24, 24), bx = 12, by = 22, len = 10, lean = (rnd() < .5 ? -1 : 1) * (1.5 + rnd() * 1.5);
  let topX = bx, topY = by;
  for (let i = 0; i < len; i++) { const t = i / len; topX = Math.round(bx + lean * t * t); topY = by - i; gset(g, topX, topY, i % 3 === 0 ? 'T' : 't'); }
  for (const a of [-2.95, -2.35, -1.75, -1.3, -.75, -.2]) {
    const L = 5 + rnd() * 2;
    for (let s = 1; s <= L; s += .5) {
      const x = topX + Math.cos(a) * s, y = topY - 1 + Math.sin(a) * s + s * s * .1;
      gset(g, x, y, s < L * .5 ? 'l' : 'g');
      if (s > 1.5) gset(g, x, y + 1, 'd');
    }
  }
  gset(g, topX, topY, 'c'); gset(g, topX - 1, topY, 'c');
  return finish(g, bx);
}
// Cactus: tronco de 3 columnas con brazos; las 'r' son flores (verdes en el cactus normal)
function cactus(rnd){
  const g = grid(16, 18), cx = 6, h = 7 + Math.floor(rnd() * 4), base = 15, top = base - h;
  for (let y = top; y <= base; y++) { gset(g, cx, y, 'l'); gset(g, cx + 1, y, 'g'); gset(g, cx + 2, y, 'd'); }
  gset(g, cx + 1, top - 1, 'r');
  if (rnd() < .75) { // brazo izquierdo
    const ay = base - Math.floor(h * .45) - Math.floor(rnd() * 2), len = 2 + Math.floor(rnd() * 2);
    gset(g, cx - 1, ay, 'g'); gset(g, cx - 2, ay, 'g');
    for (let y = ay - len; y <= ay; y++) { gset(g, cx - 3, y, 'l'); gset(g, cx - 2, y, 'g'); }
    gset(g, cx - 3, ay - len - 1, 'r');
  }
  if (rnd() < .6) { // brazo derecho
    const ay = base - Math.floor(h * .6) + Math.floor(rnd() * 2), len = 2 + Math.floor(rnd() * 2);
    gset(g, cx + 3, ay, 'g'); gset(g, cx + 4, ay, 'g');
    for (let y = ay - len; y <= ay; y++) { gset(g, cx + 4, y, 'g'); gset(g, cx + 5, y, 'd'); }
    gset(g, cx + 5, ay - len - 1, 'r');
  }
  for (let k = 0; k < 3; k++) gset(g, cx + Math.floor(rnd() * 3), top + 1 + Math.floor(rnd() * (h - 1)), 'h');
  return finish(g, cx + 1);
}
function bush(rnd){
  const g = grid(13, 10);
  paintBlobs(g, [{ x:6.5, y:5.5, rx:3.8, ry:2.9 }, { x:4.5, y:6, rx:2.4, ry:2 }, { x:8.5, y:6, rx:2.4, ry:2 }, { x:6.5, y:4, rx:2.3, ry:1.9 }], rnd, { h:'l', l:'l', g:'g', d:'d' });
  const cells = []; for (let k = 0; k < g.a.length; k++) if (g.a[k] !== '.') cells.push(k);
  for (let n = 0; n < 6 && cells.length; n++) g.a[cells.splice(Math.floor(rnd() * cells.length), 1)[0]] = 'r';
  return finish(g, 6);
}
function rock(rnd, rx, ry, ore){
  const g = grid(14, 11), cx = 7, cy = 6;
  paintBlobs(g, [{ x:cx, y:cy, rx, ry }, { x:cx - rx * .35 + rnd(), y:cy - ry * .35, rx:rx * .6, ry:ry * .6 }], rnd, { h:'l', l:'l', g:'s', d:'d' });
  for (let y = Math.ceil(cy + ry * .55); y < g.h; y++) for (let x = 0; x < g.w; x++) g.a[y * g.w + x] = '.';
  if (ore) {
    const cells = []; for (let k = 0; k < g.a.length; k++) if (g.a[k] === 's' || g.a[k] === 'd') cells.push(k);
    for (let n = 0; n < 5 && cells.length; n++) g.a[cells.splice(Math.floor(rnd() * cells.length), 1)[0]] = 'x';
  }
  return finish(g, cx);
}
function fromRows(rows){ const g = grid(rows[0].length, rows.length); rows.forEach((row, y) => [...row].forEach((ch, x) => g.a[y * g.w + x] = ch)); return { g, ax:rows[0].length >> 1 }; }

// ---- Vegetación según la estación ----
// Primavera: flores claras en las copas · verano: verde normal · otoño: copas naranjas, rojas o amarillas
// que pierden hojas · invierno: árboles de hoja caduca desnudos con algo de nieve y coníferas nevadas
let spriteSeason = 1;
const AUTUMN = [
  { O:'#3a1c0e', d:'#8a3a12', g:'#c4581c', l:'#e8862a', h:'#f6b84a' },
  { O:'#3a140e', d:'#7a2418', g:'#b03a22', l:'#d85a30', h:'#f08a50' },
  { O:'#3a2a0c', d:'#8a6a12', g:'#c49a1c', l:'#e6c43a', h:'#f8e070' },
];
function seasonColor(col, ch, k, v, season, shape, pal){
  if (shape === 'house' || shape === 'fire' || shape === 'well' || shape === 'mill' || shape === 'quarry' || shape === 'hall' || shape === 'store' || shape === 'tower' || shape === 'altar' || shape === 'temple' || shape === 'obelisk' || shape === 'market' || shape === 'bank' || shape === 'wonder' || shape === 'forge' || shape === 'hospital' || shape === 'barracks' || shape === 'tradehall' || shape === 'theater' || shape === 'coliseum' || shape === 'tavern' || shape === 'cathedral' || shape === 'school') return col; // las construcciones no cambian con la estación
  // Los pinos de montaña solo llevan nieve en invierno; el resto del año sus puntas son verdes
  if (pal === 'snow' && season !== 3 && (ch === 'l' || ch === 'h')) return ch === 'l' ? '#4e8460' : '#6c9e76';
  const leafy = ['oak', 'birch', 'willow', 'acacia', 'ancient', 'bush'].includes(shape) && pal !== 'life' && pal !== 'frost';
  const leaf = 'dglhO'.includes(ch), hs = h2(k, v, 61 + season);
  if (season === 0) return leafy && shape !== 'bush' && (ch === 'l' || ch === 'h') && hs < .2 ? '#f7d9e6' : col;
  if (season === 2) {
    if (!leafy || !leaf) return col;
    return AUTUMN[v % 3][ch]; // copa entera, sin huecos
  }
  if (season === 3) {
    if (shape === 'pine') return ch === 'l' || ch === 'h' ? '#eef4f8' : ch === 'g' && hs < .3 ? '#dfe8ee' : col;
    if (shape !== 'bush') { // copa invernal: misma forma, hojas pardas y apagadas con nieve por encima
      if (ch === 'O') return '#2e2218';
      if (ch === 'h' || (ch === 'l' && hs < .45)) return hs < .15 ? '#dfe7ee' : '#f2f6fa';
      return { d:'#5a4838', g:'#76624e', l:'#927c64' }[ch] || col;
    }
    if (ch === 'r') return '#7c7a5c'; // arbustos sin bayas, con las hojas secas y algo de nieve
    if (ch === 'h' && hs < .5) return '#f2f6fa';
    return 'dgl'.includes(ch) ? mixHex(col, '#8a8468', .55) : col;
  }
  return col;
}
const spriteCache = {};
// ---- Fases de la vida de un árbol: b brote · j joven · a adulto · v viejo · m muerto ----
const SAPLINGS = { broad:['.l.','lhl','.g.','.t.'], pine:['.h.','.l.','lgd','.t.'], palm:['l.g','.t.','.t.'], cactus:['.l.','.g.','.g.'] };
function sapling(shape){
  const rows = SAPLINGS[shape === 'pine' || shape === 'palm' || shape === 'cactus' ? shape : 'broad'];
  const g = grid(rows[0].length + 2, rows.length + 2);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { g.a[(y + 1) * g.w + x + 1] = ch; }));
  return finish(g, 2);
}
// Reescala un sprite píxel a píxel (vecino más cercano) y le vuelve a poner el contorno
function rescale(res, s){
  const g = res.g, nw = Math.max(3, Math.round((g.w - 2) * s)), nh = Math.max(3, Math.round((g.h - 2) * s)), n = grid(nw + 2, nh + 2);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const ch = gget(g, 1 + Math.floor(x / s), 1 + Math.floor(y / s));
    n.a[(y + 1) * n.w + x + 1] = ch === 'O' ? '.' : ch;
  }
  return finish(n, 1 + (res.ax - 1) * s);
}
function mixHex(a, b, t){
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], A = p(a), Bc = p(b);
  return '#' + A.map((v, k) => Math.round(v + (Bc[k] - v) * t).toString(16).padStart(2, '0')).join('');
}
function stageColor(col, ch, k, v, form){
  if (form === 'm') { // palmeras y cactus muertos: secos y pardos, con la forma entera
    if ('tTkw'.includes(ch)) return '#6b5a48';
    return { O:'#2e241a', d:'#5e5038', g:'#7a6a4a', l:'#958562', h:'#a8987a', r:'#7a6a4a', c:'#5e5038' }[ch] || col;
  }
  if (form === 'v' && 'dglh'.includes(ch) && col[0] === '#') return mixHex(col, '#7d7a55', .3); // copa vieja, más apagada
  return col;
}
// Árbol sin hojas (invierno o muerto): conserva el tronco y le dibuja un esqueleto de ramas que se bifurcan
// dentro del hueco que ocupaba la copa; en invierno, con nieve encima de las ramas
function bareGrid(res, v, snow, conifer){
  const g = res.g, n = grid(g.w, g.h);
  let top = g.h, cy0 = g.h, cy1 = 0, cxa = g.w, cxb = 0;
  for (let k = 0; k < g.a.length; k++) {
    const ch = g.a[k], x = k % g.w, y = (k / g.w) | 0;
    if ('tTwk'.includes(ch)) { n.a[k] = ch; if (y < top) top = y; }
    else if ('dglh'.includes(ch)) { cy0 = Math.min(cy0, y); cy1 = Math.max(cy1, y); cxa = Math.min(cxa, x); cxb = Math.max(cxb, x); }
  }
  if (cy0 > cy1) return n;
  const rnd = mulberry32(v * 977 + (conifer ? 31 : 13));
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < n.w && y < n.h && (n.a[y * n.w + x] === '.' || ch === 'T')) n.a[y * n.w + x] = ch; };
  const cx = res.ax, startY = Math.min(top, cy1 + 1), reach = (cxb - cxa) / 2;
  if (conifer) {
    // Conífera seca: tronco recto hasta arriba con ramas cortas casi horizontales
    for (let y = startY; y >= cy0; y--) put(cx, y, 'T');
    for (let y = cy0 + 2; y < startY - 1; y += 2) {
      const L = Math.max(1, Math.round((y - cy0) / (startY - cy0) * reach * .9));
      for (let s = 1; s <= L; s++) { put(cx - s, y + (s > L / 2 ? 1 : 0), 'b'); put(cx + s, y + (s > L / 2 ? 1 : 0), 'b'); }
    }
  } else {
    // Ramas en abanico desde el tronco hasta el borde de la copa que tendría con hojas:
    // así la silueta desnuda conserva la forma del árbol. Las ramas maestras son de 2 px
    const line = (x0, y0, x1, y1, ch, w) => {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let s = 0; s <= steps; s++) {
        const x = x0 + (x1 - x0) * s / steps, y = y0 + (y1 - y0) * s / steps;
        put(x, y, ch); if (w > 1) put(x + 1, y, ch);
      }
    };
    const h = Math.max(3, startY - cy0), ty0 = startY - h * .3; // horquilla principal
    line(cx, startY, cx, ty0, 'T', 2);
    // Extremos: en cada sector de ángulo, el punto de la copa más alejado de la horquilla
    const nB = clamp(Math.round(reach / 1.5), 4, 9), best = new Array(nB).fill(null);
    for (let k = 0; k < g.a.length; k++) {
      if (!'dglh'.includes(g.a[k])) continue;
      const x = k % g.w, y = (k / g.w) | 0; if (y > cy0 + (cy1 - cy0) * .8) continue;
      const ang = Math.atan2(y - ty0, x - cx); if (ang > 0.25 || ang < -Math.PI - .25) continue;
      const bin = clamp(Math.floor((ang + Math.PI + .25) / (Math.PI + .5) * nB), 0, nB - 1), d = Math.hypot(x - cx, y - ty0);
      if (!best[bin] || d > best[bin][2]) best[bin] = [x, y, d];
    }
    for (const b of best) {
      if (!b) continue;
      const [ex, ey] = b, mx = cx + (ex - cx) * .45 + (rnd() - .5) * 2, my = ty0 + (ey - ty0) * .45;
      line(cx, ty0, mx, my, 'T', 2);            // rama maestra
      line(mx, my, ex, ey, 'b', 1);             // rama
      const fa = Math.atan2(ey - my, ex - mx) + (rnd() < .5 ? -.7 : .7), fl = 1.5 + rnd() * 2;
      line(ex - (ex - mx) * .3, ey - (ey - my) * .3, ex - (ex - mx) * .3 + Math.cos(fa) * fl, ey - (ey - my) * .3 + Math.sin(fa) * fl, 'b', 1); // ramita
    }
  }
  if (snow) for (let k = n.w; k < n.a.length; k++) {
    if ((n.a[k] === 'b' || n.a[k] === 'T') && n.a[k - n.w] === '.' && h2(k, v, 90) < .55) n.a[k - n.w] = 's';
  }
  // Contorno oscuro alrededor de tronco y ramas, como el resto de sprites
  const edge = [];
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++)
    if (n.a[y * n.w + x] === '.' && [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => gget(n, x + dx, y + dy) !== '.')) edge.push(y * n.w + x);
  for (const k of edge) n.a[k] = 'O';
  return n;
}
const SIZE_SCALE = [.85, 1, 1.15];
const TREE_S = 2.15; // los árboles se generan más grandes: más píxeles, más detalle
const SPRITE_ALIAS = { 'court:tribunal':'bank:banco', 'jail:carcel':'barracks:cuartel', 'press:imprenta':'tavern:taberna', 'union:sindicato':'store:almacen', 'parliament:parlamento':'hall:ayuntamiento', 'academy:academia':'school:escuela', 'wonder:democracia':'wonder:republica', 'wonder:partitocracia':'wonder:republica', 'wonder:monarquia_parlamentaria':'wonder:monarquia', 'wonder:oligarquia':'wonder:monarquia', 'wonder:tecnocracia':'wonder:republica', 'wonder:anarquia':'wonder:socialismo', 'mine:mina':'quarry:cantera', 'university:universidad':'school:escuela', 'council:consejo':'hall:ayuntamiento', 'spy:espias':'tavern:taberna', 'granary:granero':'store:almacen', 'smoke:ahumadero':'forge:herreria', 'woodshed:lenera':'store:almacen', 'post:postas':'tavern:taberna', 'house:mansion':'house:piedra', 'house:chabola':'house:hut' }; // instituciones: dibujo de reserva (si el atlas aún no ha cargado)
function sprite(key, variant = 0, season = spriteSeason, form = 'a', sz = 1, race = ''){
  key = SPRITE_ALIAS[key] || key;
  const ck = key + '#' + variant + '@' + season + form + sz + race;
  if (spriteCache[ck]) return spriteCache[ck];
  const [shape, pal] = key.split(':'), rf = shape === 'house' && ROOFS[Math.floor(variant / 5) % ROOFS.length], P = rf ? { ...PALS[pal], r:rf[0], R:rf[1] } : PALS[pal], rnd = mulberry32(hashStr(key + '#' + variant)); // la forma no cambia con la estación
  let res;
  switch (shape) {
    case 'oak':     res = roundTree(rnd, (4.6 + rnd()) * TREE_S, 3, 4); break;
    case 'birch':   res = roundTree(rnd, (3.8 + rnd() * .6) * TREE_S, 2, 6, true); break;
    case 'ancient': res = roundTree(rnd, (7.6 + rnd() * .8) * 2, 4, 5); break;
    case 'pine':    res = conifer(rnd, Math.round((13 + Math.floor(rnd() * 4)) * TREE_S), Math.round((4 + Math.floor(rnd() * 2)) * TREE_S), 3); break;
    case 'acacia':  res = acacia(rnd, TREE_S); break;
    case 'willow':  res = willow(rnd, TREE_S); break;
    case 'palm':    res = palm(rnd); break;
    case 'bush':    res = bush(rnd); break;
    case 'cactus':  res = cactus(rnd); break;
    case 'house':   res = fromRows(HOUSE_DESIGNS[variant % HOUSE_DESIGNS.length]); break;
    case 'altar':   res = fromRows(ALTAR_ROWS); break;
    case 'temple':  res = fromRows(TEMPLE_ROWS); break;
    case 'obelisk': res = fromRows(OBELISK_ROWS); break;
    case 'market':  res = fromRows(MARKET_ROWS); break;
    case 'fire':    res = fromRows(FIRE_ROWS); break;
    case 'well':    res = fromRows(WELL_ROWS); break;
    case 'hall':    res = fromRows(HALL_ROWS); break;
    case 'tower':   res = fromRows(TOWER_ROWS); break;
    case 'store':   res = fromRows(STORE_ROWS); break;
    case 'quarry':  res = fromRows(QUARRY_ROWS); break;
    case 'mill':    res = fromRows(MILL_ROWS); break;
    case 'bank':    res = fromRows(BANK_ROWS); break;
    case 'forge':   res = fromRows(FORGE_ROWS); break;
    case 'hospital': res = fromRows(HOSP_ROWS); break;
    case 'barracks': res = fromRows(BARRACKS_ROWS); break;
    case 'tradehall': res = fromRows(LONJA_ROWS); break;
    case 'theater': res = fromRows(THEATER_ROWS); break;
    case 'coliseum': res = fromRows(COLISEUM_ROWS); break;
    case 'tavern': res = fromRows(TAVERN_ROWS); break;
    case 'cathedral': res = fromRows(HOLY_ROWS[pal] || HOLY_ROWS.catedral); break;
    case 'school': res = fromRows(SCHOOL_ROWS); break;
    case 'wonder':  res = fromRows(WONDER_ROWS[pal]); break;
    case 'rock':    res = rock(rnd, 2.8, 2.2, false); break;
    case 'big':     res = rock(rnd, 4.2, 3.2, false); break;
    case 'ore':     res = rock(rnd, 4.2, 3.2, true); break;
    default:        res = fromRows(GEM);
  }
  if (shape === 'house' || shape === 'mill' || shape === 'well' || shape === 'hall' || shape === 'store' || shape === 'tower' || shape === 'temple' || shape === 'bank' || shape === 'wonder' || shape === 'forge' || shape === 'hospital' || shape === 'barracks' || shape === 'tradehall' || shape === 'theater' || shape === 'coliseum' || shape === 'tavern' || shape === 'cathedral' || shape === 'school') { // cada píxel, un bloque de 2×2: el dibujo queda igual pero al doble
    res = { g:fineBuilding(res.g, pal, P), ax:res.ax * 2 + 1 };
  }
  if (form === 'b') res = sapling(shape);
  else {
    const s = (form === 'j' ? .62 : form === 'v' ? 1.08 : 1) * SIZE_SCALE[sz];
    if (Math.abs(s - 1) > .01) res = rescale(res, s);
  }
  // Ramas desnudas con contorno: árboles de hoja caduca en invierno (con nieve) y árboles muertos
  const leafyTree = ['oak', 'birch', 'willow', 'acacia', 'ancient'].includes(shape) && pal !== 'life' && pal !== 'frost';
  const bare = form !== 'b' && ((leafyTree && (season === 3 || form === 'm')) || (shape === 'pine' && form === 'm'));
  if (bare) res = { g:bareGrid(res, variant, season === 3, shape === 'pine'), ax:res.ax };
  const BARE = form === 'm' ? { O:'#26201a', T:'#5d544a', b:'#7a6e60', t:'#6b5a48', w:'#9a9488', k:'#3a3a3a', s:'#f2f6fa' }
                            : { O:'#241a12', T:'#4a3626', b:'#6e5440', s:'#f2f6fa' };
  const fallback = { T:P.d || P.O, h:P.l, l:P.g, d:P.O, t:P.d, c:P.g };
  const c = document.createElement('canvas'); c.width = res.g.w; c.height = res.g.h;
  const x = c.getContext('2d');
  res.g.a.forEach((ch, k) => {
    if (ch === '.') return;
    let col;
    if (bare) col = BARE[ch] || P[ch] || fallback[ch];
    else {
      col = seasonColor(P[ch] || fallback[ch] || P.O, ch, k, variant, season, shape, pal);
      // Raza del clima: las del frío tienen las hojas de un verde más oscuro y azulado; las del calor, más
      // claro y oliváceo (como las hojas duras de los árboles de clima seco)
      if (col && race && 'dglh'.includes(ch) && !col.startsWith('#f')) col = mixHex(col, race === 'f' ? '#1e4a5a' : '#b0a440', race === 'f' ? .22 : .2);
      if (col) col = stageColor(col, ch, k, variant, form);
    }
    if (!col) return;
    x.fillStyle = col;
    x.fillRect(k % res.g.w, (k / res.g.w) | 0, 1, 1);
  });
  c.ax = res.ax;
  return spriteCache[ck] = c;
}
function drawIcon(c, key){
  const s = sprite(key), x = c.getContext('2d'), sc = Math.max(1, Math.floor(24 / Math.max(s.width, s.height)));
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, c.width, c.height);
  x.drawImage(s, (c.width - s.width * sc) >> 1, (c.height - s.height * sc) >> 1, s.width * sc, s.height * sc);
}

// ================= Ruido y azar =================
function hashStr(s){ let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function h2(x, y, s){ let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function perlin(rand){
  const p = []; for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const g = (h, dx, dy) => { const q = G[h & 7]; return q[0] * dx + q[1] * dy; };
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1], ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
    const u = fade(xf), v = fade(yf);
    const x1 = g(aa, xf, yf) + (g(ba, xf - 1, yf) - g(aa, xf, yf)) * u;
    const x2 = g(ab, xf, yf - 1) + (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1)) * u;
    return x1 + (x2 - x1) * v;
  };
}
function fbm(n, x, y, oct){ let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); t += a; a *= .5; f *= 2; } return s / t; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const WORDS = ['Ámbar','Brasa','Cumbre','Delta','Estepa','Fiordo','Glaciar','Helecho','Jade','Liquen','Marea','Nácar','Ópalo','Quebrada','Roble','Sauce','Tundra','Valle','Ceniza','Bruma','Coral','Duna','Eco','Fuego','Gema','Hielo','Lava','Musgo','Niebla','Oasis'];
const randomSeed = () => WORDS[Math.floor(Math.random() * WORDS.length)] + '-' + Math.floor(Math.random() * 10000);

// ================= Estado =================
const params = { seed:randomSeed(), size:'xl', type:'cont', water:48, rivers:50, humid:0, dens:100,
  relief:true, objects:true, markers:true, people:true, weather:true, pressure:false, plates:false, thermal:false, heightmap:false, windmap:false, zones:true, cloudOp:80, disasters:50, tool:'move', brush:3 };
let world = null;
