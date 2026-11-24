// World Sim · Guardar y cargar: ranuras, archivos .forja
// ================= Guardar y cargar la partida (en el navegador, con IndexedDB) =================
const SAVE_VARS = ['yearT', 'climT', 'vidSeq', 'nameIdx', 'uidSeq', 'herdSeq', 'aid', 'animals', 'fishes', 'villages', 'villagers', 'rels', 'travelers', 'alliances', 'farmMap', 'pathMap', 'bridgeSet', 'bridges', 'plazaSet', 'holySet',
  'wallSet', 'gateSet', 'wallStone', 'gateOwner', 'wear', 'wornSet', 'desireSet', 'fires', 'burnt', 'chronicle', 'sieges', 'usedFlags', 'snowSet', 'snowA', 'floodSet', 'floodA', 'iceSet', 'drySet', 'snowDepth', 'soil', 'soilNorm', 'soilRain', 'drought', 'wetT', 'worldHist', 'olymp', 'epidemics', 'market'];
function idb(){ return new Promise((ok, ko) => { const r = indexedDB.open('forja-de-mundos', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
async function idbDo(mode, fn){ const db = await idb(); return new Promise((ok, ko) => { const tx = db.transaction('saves', mode), st = tx.objectStore('saves'), req = fn(st); tx.oncomplete = () => ok(req && req.result); tx.onerror = () => ko(tx.error); }); }
// Resumen que se ve en la lista de ranuras
const snapMeta = () => { const live = villages.filter(g => popOf(g)); return { day:Math.floor(yearT / DAY_LEN) + 1, year:seasonInfo().year, season:seasonInfo().s.n, pop:villagers.filter(v => !v.dead).length, towns:live.length, top:live.slice().sort((a, b) => popOf(b) - popOf(a)).slice(0, 3).map(g => g.name), seed:params.seed }; };
async function saveGame(slot = 'partida', quiet){
  const snap = takeSnap(); if (!snap) return false;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (err) {} // que el navegador no la borre al hacer limpieza
  try { await idbDo('readwrite', st => st.put(snap.data, slot)); if (!quiet) notify(slot === 'auto' ? 'Partida guardada automáticamente' : `Partida guardada (${slotName(slot)})`); return true; }
  catch (err) { notify('No se ha podido guardar la partida (' + (err && err.name || 'error') + ')'); return false; }
  finally { snap.restore(); if (!$('savePanel').hidden) renderSlots(); }
}
// Instantánea de toda la partida; las funciones pendientes se quitan un momento (restore las devuelve)
function takeSnap(){
  if (busy || !world) return null;
  const snap = { v:1, when:Date.now(), meta:snapMeta(), params:{ ...params }, world:{ ...world }, vars:{} };
  const getters = { yearT:() => yearT, climT:() => climT, vidSeq:() => vidSeq, nameIdx:() => nameIdx, uidSeq:() => uidSeq, herdSeq:() => herdSeq, aid:() => aid, animals:() => animals, fishes:() => fishes, villages:() => villages, villagers:() => villagers, rels:() => rels, travelers:() => travelers, alliances:() => alliances,
    farmMap:() => farmMap, pathMap:() => pathMap, bridgeSet:() => bridgeSet, bridges:() => bridges, plazaSet:() => plazaSet, holySet:() => holySet, wallSet:() => wallSet, gateSet:() => gateSet, wallStone:() => wallStone, gateOwner:() => gateOwner, wear:() => wear, wornSet:() => wornSet, desireSet:() => desireSet,
    fires:() => fires, burnt:() => burnt, chronicle:() => chronicle, sieges:() => sieges, usedFlags:() => usedFlags, snowSet:() => snowSet, snowA:() => snowA, floodSet:() => floodSet, floodA:() => floodA, iceSet:() => iceSet, drySet:() => drySet, snowDepth:() => snowDepth, soil:() => soil, soilNorm:() => soilNorm,
    soilRain:() => soilRain, drought:() => drought, wetT:() => wetT, worldHist:() => worldHist, olymp:() => olymp, epidemics:() => epidemics, market:() => market };
  for (const k of SAVE_VARS) snap.vars[k] = getters[k]();
  // Lo que no se puede guardar (funciones pendientes) se quita un momento y se devuelve después
  const seen = new Set(), stack = [...villagers, ...villages.map(g => g.leader).filter(Boolean)]; // los vivos y su familia (también los muertos a los que apuntan)
  while (stack.length) { const v = stack.pop(); if (!v || seen.has(v)) continue; seen.add(v); for (const u of [...(v.parents || []), ...(v.kids || []), ...(v.partners || [])]) stack.push(u); }
  const pend = [...seen].filter(v => typeof v.onDone === 'function').map(v => [v, v.onDone]); for (const [v] of pend) v.onDone = null;
  return { data:snap, restore:() => { for (const [v, f] of pend) v.onDone = f; } };
}
async function loadGame(slot = 'partida'){
  let snap; try { snap = await idbDo('readonly', st => st.get(slot)); } catch (err) { snap = null; }
  if (!snap) { notify('No hay ninguna partida guardada'); return; }
  await applySnap(snap);
}
async function applySnap(snap){
  Object.assign(params, snap.params); await regenerate(true, true); // el mismo mundo de base, con su tamaño
  world = snap.world; const V = snap.vars;
  yearT = V.yearT; climT = V.climT; vidSeq = V.vidSeq; nameIdx = V.nameIdx; uidSeq = V.uidSeq || 0; herdSeq = V.herdSeq || 0; aid = V.aid || 0;
  animals = V.animals; fishes = V.fishes; villages = V.villages; villagers = V.villagers; rels = V.rels; travelers = V.travelers; alliances = V.alliances || [];
  farmMap = V.farmMap; pathMap = V.pathMap; bridgeSet = V.bridgeSet; bridges = V.bridges; plazaSet = V.plazaSet; holySet = V.holySet; wallSet = V.wallSet; gateSet = V.gateSet; wallStone = V.wallStone || new Set(); gateOwner = V.gateOwner || new Map();
  wear = V.wear; wornSet = V.wornSet; desireSet = V.desireSet; fires = V.fires; burnt = V.burnt; chronicle = V.chronicle || []; sieges = V.sieges || []; usedFlags = V.usedFlags;
  snowSet = V.snowSet; snowA = V.snowA; floodSet = V.floodSet; floodA = V.floodA; iceSet = V.iceSet; drySet = V.drySet; snowDepth = V.snowDepth; soil = V.soil; soilNorm = V.soilNorm; soilRain = V.soilRain; drought = V.drought; wetT = V.wetT;
  worldHist = V.worldHist || { t:[], n:{} }; olymp = V.olymp || { next:yearT + SEASON_LEN * 2, cur:null, past:[] }; epidemics = V.epidemics || []; market = V.market || null; // la bolsa (si no la había, se crea sola)
  for (const v of villagers) { if (v.task && v.task.k === 'trabajando') { v.task = null; v.actT = 0; } } // lo que estaban haciendo se retoma de cero
  groundSig = ''; stones = []; arrows = []; moneyFlows = []; chips = []; floats = []; smoke = []; ubCache = null; burntDirty = true; zoneCv = null; zoneT = 0; setFollow(null); cardVid = 0;
  spriteSeason = prevSeason = seasonInfo().i; repaintAll(); waveImg = null; buildWaves(); buildZones(); renderStats();
  notify(`Partida cargada: día ${Math.floor(yearT / DAY_LEN) + 1}`);
}
let autoSaveT = 0;
const TYPED = { Float32Array, Float64Array, Int32Array, Uint32Array, Int16Array, Uint16Array, Int8Array, Uint8Array, Uint8ClampedArray };
const b64 = u8 => { let s0 = ''; for (let i = 0; i < u8.length; i += 0x8000) s0 += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s0); };
const unb64 = str => { const s0 = atob(str), u8 = new Uint8Array(s0.length); for (let i = 0; i < s0.length; i++) u8[i] = s0.charCodeAt(i); return u8; };
// Cada objeto se guarda una vez y los demás lo señalan por su número (los padres, hijos y parejas se cruzan)
function graphEncode(root){
  const ids = new Map(), list = [];
  const ref = x => { if (x === null || typeof x !== 'object') return enc0(x); let id = ids.get(x); if (id == null) { id = list.length; ids.set(x, id); list.push(x); } return { $r:id }; };
  const enc0 = x => x === undefined ? { $u:1 } : typeof x === 'number' && !isFinite(x) ? { $n:String(x) } : typeof x === 'function' ? null : x;
  const rootRef = ref(root), out = [];
  for (let k = 0; k < list.length; k++) {
    const o = list[k];
    if (Array.isArray(o)) out.push({ A:o.map(ref) });
    else if (o instanceof Map) out.push({ M:[...o].map(([a, b]) => [ref(a), ref(b)]) });
    else if (o instanceof Set) out.push({ S:[...o].map(ref) });
    else if (ArrayBuffer.isView(o)) out.push({ T:o.constructor.name, d:b64(new Uint8Array(o.buffer, o.byteOffset, o.byteLength)) });
    else if (o instanceof Date) out.push({ D:o.getTime() });
    else { const e = {}; for (const key of Object.keys(o)) { const val = o[key]; if (typeof val !== 'function') e[key] = ref(val); } out.push({ O:e }); }
  }
  return { forja:1, root:rootRef, objs:out };
}
function graphDecode(pk){
  const objs = pk.objs.map(e => e.A ? [] : e.M ? new Map() : e.S ? new Set() : e.T ? new TYPED[e.T](unb64(e.d).buffer) : e.D != null ? new Date(e.D) : {});
  const dec = x => x === null || typeof x !== 'object' ? x : x.$r != null ? objs[x.$r] : x.$u ? undefined : x.$n != null ? Number(x.$n) : x;
  pk.objs.forEach((e, k) => { const o = objs[k];
    if (e.A) for (const x of e.A) o.push(dec(x)); else if (e.M) for (const [a, b] of e.M) o.set(dec(a), dec(b)); else if (e.S) for (const x of e.S) o.add(dec(x)); else if (e.O) for (const key in e.O) o[key] = dec(e.O[key]); });
  return dec(pk.root);
}
async function downloadSave(){
  const snap = takeSnap(); if (!snap) return;
  let txt; try { txt = JSON.stringify(graphEncode(snap.data)); } finally { snap.restore(); }
  let blob = new Blob([txt], { type:'application/json' });
  if (typeof CompressionStream === 'function') blob = await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  const m = snap.data.meta, a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `forja-${(m.top[0] || params.seed || 'mundo').replace(/[^\wÀ-ÿ-]+/g, '_')}-dia${m.day}.forja`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  notify(`Partida descargada (${(blob.size / 1048576).toFixed(1)} MB)`);
}
async function openSaveFile(file){
  try {
    const head = new Uint8Array(await file.slice(0, 2).arrayBuffer()), gz = head[0] === 0x1f && head[1] === 0x8b;
    const txt = gz ? await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await file.text();
    const pk = JSON.parse(txt); if (!pk.forja) throw new Error('formato');
    await applySnap(graphDecode(pk)); $('savePanel').hidden = true;
  } catch (err) { notify('Ese archivo no es una partida de World Sim (o está dañado)'); }
}
// Ranuras: la automática y cinco a mano
const SLOTS = ['auto', 's1', 's2', 's3', 's4', 's5'];
const slotName = k => k === 'auto' ? 'Automática' : k === 'partida' ? 'Partida anterior' : 'Ranura ' + k.slice(1);
async function renderSlots(){
  const el = $('slotList'); if (!el) return;
  let keys = []; try { keys = await idbDo('readonly', st => st.getAllKeys()); } catch (err) {}
  const list = SLOTS.concat(keys.includes('partida') ? ['partida'] : []), metas = {};
  for (const k of list) if (keys.includes(k)) { try { const sn = await idbDo('readonly', st => st.get(k)); metas[k] = sn && { when:sn.when, m:sn.meta }; } catch (err) {} }
  const ago = t => { const d = (Date.now() - t) / 60000; return d < 1 ? 'hace un momento' : d < 60 ? `hace ${Math.round(d)} min` : d < 1440 ? `hace ${Math.round(d / 60)} h` : new Date(t).toLocaleDateString(); };
  el.innerHTML = list.map(k => { const s0 = metas[k];
    const meta = s0 ? (s0.m ? `Día ${s0.m.day} · ${s0.m.pop} habitantes · ${s0.m.towns} pueblos${s0.m.top.length ? ' · ' + esc(s0.m.top.join(', ')) : ''} · ${ago(s0.when)}` : `Guardada ${ago(s0.when)}`) : 'Vacía';
    return `<div class="slot"><b>${slotName(k)}</b><span class="meta">${meta}</span><span class="act">${k === 'auto' || k === 'partida' ? '' : `<button data-sv="${k}">Guardar aquí</button>`}<button class="pri" data-ld="${k}"${s0 ? '' : ' disabled'}>Cargar</button>${s0 && k !== 'auto' ? `<button data-del="${k}" title="Borrar esta ranura">Borrar</button>` : ''}</span></div>`; }).join('');
}
