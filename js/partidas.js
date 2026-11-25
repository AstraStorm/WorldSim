// World Sim · Guardar y cargar: ranuras, archivos .forja
// ================= Guardar y cargar la partida (en el navegador, con IndexedDB) =================
const SAVE_VARS = ['yearT', 'climT', 'vidSeq', 'nameIdx', 'uidSeq', 'herdSeq', 'aid', 'animals', 'fishes', 'villages', 'villagers', 'rels', 'travelers', 'alliances', 'farmMap', 'pathMap', 'bridgeSet', 'bridges', 'plazaSet', 'holySet',
  'wallSet', 'gateSet', 'wallStone', 'gateOwner', 'wear', 'wornSet', 'desireSet', 'fires', 'burnt', 'chronicle', 'sieges', 'usedFlags', 'snowSet', 'snowA', 'floodSet', 'floodA', 'iceSet', 'drySet', 'snowDepth', 'soil', 'soilNorm', 'soilRain', 'drought', 'wetT', 'worldHist', 'olymp', 'epidemics', 'market'];
let idbP = null; // una sola conexión abierta (antes se abría una por consulta)
function idb(){ return idbP ||= new Promise((ok, ko) => { const r = indexedDB.open('forja-de-mundos', 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => { r.result.onclose = () => { idbP = null; }; ok(r.result); }; r.onerror = () => { idbP = null; ko(r.error); }; }); }
async function idbDo(mode, fn){ const db = await idb(); return new Promise((ok, ko) => { const tx = db.transaction('saves', mode), st = tx.objectStore('saves'), req = fn(st); tx.oncomplete = () => ok(req && req.result); tx.onerror = () => ko(tx.error); }); }
// Resumen que se ve en la lista de ranuras
const snapMeta = () => { const live = villages.filter(g => popOf(g)); return { day:Math.floor(yearT / DAY_LEN) + 1, year:seasonInfo().year, season:seasonInfo().s.n, pop:villagers.filter(v => !v.dead).length, towns:live.length, top:live.slice().sort((a, b) => popOf(b) - popOf(a)).slice(0, 3).map(g => g.name), seed:params.seed }; };
// Guarda en una ranura la partida y, aparte, su ficha (nombre, resumen y miniatura): así la lista se abre sin leer partidas enteras
// 'auto' va rotando entre tres guardados automáticos (se pisa el más antiguo)
async function saveGame(slot = 'partida', quiet, name){
  if (slot === 'auto') slot = await oldestAuto();
  const btn = $('saveBtn'); if (btn) btn.classList.add('saving');
  if (!quiet) await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); // que se vea que está guardando antes del parón
  const t0 = performance.now(), snap = takeSnap(); if (!snap) { if (btn) btn.classList.remove('saving'); return false; }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (err) {} // que el navegador no la borre al hacer limpieza
  try {
    const old = await getMeta(slot), meta = { ...snap.data.meta, when:snap.data.when, name:(name || (old && old.name) || defaultSaveName()).slice(0, 48), thumb:saveThumb(), auto:AUTO_SLOTS.includes(slot) };
    await idbDo('readwrite', st => { st.put(snap.data, slot); return st.put(meta, metaKey(slot)); });
    lastSaveAt = Date.now(); if (!meta.auto) lastSlot = slot;
    if (!quiet) sysToast(`Partida guardada: «${meta.name}» (${((performance.now() - t0) / 1000).toFixed(1).replace('.', ',')} s)`);
    return true;
  }
  catch (err) { sysToast('No se ha podido guardar la partida (' + (err && err.name === 'QuotaExceededError' ? 'no queda espacio: borra alguna partida o descárgala a un archivo' : (err && err.name || 'error')) + ')'); return false; }
  finally { snap.restore(); if (btn) btn.classList.remove('saving'); if (!$('savePanel').hidden) renderSlots(); }
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
  if (!snap) { sysToast('No hay ninguna partida guardada'); return; }
  await applySnap(snap); if (!AUTO_SLOTS.includes(slot)) lastSlot = slot;
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
  groundSig = ''; stones = []; arrows = []; slashes = []; cannonballs = []; ashClouds = []; fireworks = []; fwQueue = []; fwFlash = []; moneyFlows = []; chips = []; floats = []; smoke = []; ubCache = null; burntDirty = true; zoneCv = null; zoneT = 0; setFollow(null); cardVid = 0;
  spriteSeason = prevSeason = seasonInfo().i; repaintAll(); waveImg = null; buildWaves(); buildZones(); renderStats();
  lastSaveAt = Date.now(); lastSlot = null;
  sysToast(`Partida cargada: día ${Math.floor(yearT / DAY_LEN) + 1}`);
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
// Descarga la partida actual (o la de una ranura) en un archivo .forja comprimido
async function downloadSave(slot){
  let data, restore = () => {};
  if (slot) { data = await idbDo('readonly', st => st.get(slot)); if (!data) return; const m = await getMeta(slot); if (m) data.meta = { ...data.meta, name:m.name }; }
  else { const snap = takeSnap(); if (!snap) return; data = snap.data; restore = snap.restore; }
  let txt; try { txt = JSON.stringify(graphEncode(data)); } finally { restore(); }
  let blob = new Blob([txt], { type:'application/json' });
  if (typeof CompressionStream === 'function') blob = await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  const m = data.meta || {}, a = document.createElement('a'), base = m.name || `${(m.top || [])[0] || params.seed || 'mundo'}-dia${m.day}`;
  a.href = URL.createObjectURL(blob); a.download = `${base.replace(/[^\wÀ-ÿ-]+/g, '_').replace(/_+/g, '_')}.forja`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  sysToast(`Partida descargada (${(blob.size / 1048576).toFixed(1).replace('.', ',')} MB)`);
}
async function openSaveFile(file){
  try {
    const head = new Uint8Array(await file.slice(0, 2).arrayBuffer()), gz = head[0] === 0x1f && head[1] === 0x8b;
    const txt = gz ? await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await file.text();
    const pk = JSON.parse(txt); if (!pk.forja) throw new Error('formato');
    await applySnap(graphDecode(pk)); $('savePanel').hidden = true;
  } catch (err) { sysToast('Ese archivo no es una partida de World Sim (o está dañado)'); }
}
// ---- La lista de partidas ----
// Partidas con nombre (tantas como se quiera) y tres guardados automáticos que se turnan; las ranuras de antes (s1…s5,
// 'auto', 'partida') siguen ahí: la primera vez se les saca la ficha leyendo la partida entera
const AUTO_SLOTS = ['auto', 'auto2', 'auto3'];
let lastSlot = null, lastSaveAt = Date.now(), renamingSlot = null, renderSeq = 0;
const metaKey = k => 'meta:' + k;
const legacyName = k => k.startsWith('auto') ? 'Guardado automático' : k === 'partida' ? 'Partida anterior' : /^s\d$/.test(k) ? 'Ranura ' + k.slice(1) : 'Partida';
const defaultSaveName = () => { const live = villages.filter(g => popOf(g)).sort((a, b) => popOf(b) - popOf(a)); return `${live[0] ? live[0].name : 'Mundo ' + params.seed} · día ${Math.floor(yearT / DAY_LEN) + 1}`; };
async function getMeta(k){ try { return await idbDo('readonly', st => st.get(metaKey(k))); } catch (err) { return null; } }
async function oldestAuto(){ let best = AUTO_SLOTS[0], bw = Infinity; for (const k of AUTO_SLOTS) { const m = await getMeta(k), w = m ? m.when : -1; if (w < bw) { bw = w; best = k; } } return best; }
// Miniatura: lo que se ve ahora en pantalla, recortado a 16:9
function saveThumb(){
  try { const v = $('view'), c = document.createElement('canvas'); c.width = 192; c.height = 108; const x = c.getContext('2d'), s = Math.max(c.width / v.width, c.height / v.height), sw = c.width / s, sh = c.height / s;
    x.drawImage(v, (v.width - sw) / 2, (v.height - sh) / 2, sw, sh, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .7); } catch (err) { return null; }
}
async function listSaves(){
  let keys = []; try { keys = await idbDo('readonly', st => st.getAllKeys()); } catch (err) { return []; }
  const out = [];
  for (const k of keys.filter(k => typeof k === 'string' && !k.startsWith('meta:'))) {
    let m = await getMeta(k);
    if (!m) { try { const sn = await idbDo('readonly', st => st.get(k)); if (sn) { m = { ...(sn.meta || {}), when:sn.when, name:legacyName(k), auto:AUTO_SLOTS.includes(k) }; await idbDo('readwrite', st => st.put(m, metaKey(k))); } } catch (err) {} }
    if (m) out.push({ k, m });
  }
  return out.sort((a, b) => b.m.when - a.m.when);
}
const agoTxt = t => { const d = (Date.now() - t) / 60000; return d < 1 ? 'hace un momento' : d < 60 ? `hace ${Math.round(d)} min` : d < 1440 ? `hace ${Math.round(d / 60)} h` : d < 2880 ? 'ayer' : new Date(t).toLocaleDateString(); };
async function renderSlots(){
  const el = $('slotList'); if (!el) return; const my = ++renderSeq; // (si se piden dos repasos seguidos, solo pinta el último)
  const all = await listSaves(), mine = all.filter(s0 => !s0.m.auto), autos = all.filter(s0 => s0.m.auto);
  const card = ({ k, m }) => {
    const info = `Día ${m.day}${m.season ? ` · ${m.season}, año ${m.year}` : ''} · ${m.pop} hab. · ${m.towns} pueblo${m.towns === 1 ? '' : 's'}`;
    const name = renamingSlot === k ? `<input class="sv-rename" data-rn="${k}" maxlength="48" value="${esc(m.name || '')}" aria-label="Nuevo nombre">` : `<b title="${esc(m.name || '')}">${esc(m.name || legacyName(k))}</b>`;
    return `<div class="sv-card${k === lastSlot ? ' cur' : ''}">${m.thumb ? `<img src="${m.thumb}" alt="">` : '<span class="sv-noimg"></span>'}
      <div class="sv-txt">${name}<span class="meta">${info}</span><span class="meta">${m.top && m.top.length ? esc(m.top.join(', ')) + ' · ' : ''}${agoTxt(m.when)}</span></div>
      <div class="sv-act"><button class="pri" data-ld="${k}">Cargar</button>${m.auto ? '' : `<button data-sv="${k}" title="Guardar la partida actual encima de esta">Guardar encima</button><button data-rn0="${k}">Renombrar</button>`}<button data-dl="${k}" title="Descargar en un archivo .forja">Descargar</button>${m.auto ? '' : `<button data-del="${k}" class="del">Borrar</button>`}</div></div>`; };
  let usage = '';
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); usage = `Ocupan ${Math.round((e.usage || 0) / 1048576)} MB de los ${(Math.round((e.quota || 0) / 1073741824 * 10) / 10).toString().replace('.', ',')} GB que deja el navegador. `; } } catch (err) {}
  if (my !== renderSeq) return;
  el.innerHTML = `<div class="sv-new"><input id="svName" maxlength="48" value="${esc(defaultSaveName())}" aria-label="Nombre de la partida nueva"><button class="pri" id="svNew">Guardar partida</button></div>
    <p class="muted sv-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> guarda al momento${lastSlot ? ' encima de la partida que tienes abierta' : ' como partida nueva'}.</p>
    <h4 class="sv-h">Tus partidas</h4>${mine.length ? mine.map(card).join('') : '<p class="muted sv-empty">Aún no has guardado ninguna.</p>'}
    ${autos.length ? `<h4 class="sv-h">Guardados automáticos <span class="muted">(uno por día de juego; se guardan los tres últimos)</span></h4>${autos.map(card).join('')}` : ''}
    <p class="muted sv-note">${usage}Se guardan en este navegador: para no perder una o llevarla a otro ordenador, descárgala en un archivo <b>.forja</b>. Para abrir uno, arrástralo a la ventana.</p>`;
  const rn = el.querySelector('.sv-rename'); if (rn) { rn.focus(); rn.select(); }
}
async function renameSave(k, name){
  renamingSlot = null; const m = await getMeta(k); name = (name || '').trim();
  if (m && name) { m.name = name.slice(0, 48); await idbDo('readwrite', st => st.put(m, metaKey(k))); }
  renderSlots();
}
// Guardado rápido (Ctrl+S): encima de la partida abierta o, si no hay, como una nueva
function quickSave(){ if (busy || !world) return; saveGame(lastSlot || 'p' + Date.now(), false); }
