// World Sim · Las eras del mundo
// ================= Eras =================
// El mundo pasa de era cuando alguien descubre por primera vez algo que lo cambia todo: la escritura (la Antigüedad),
// la metalurgia, la pólvora, la máquina de vapor, la electricidad, la aviación, la cohetería e internet. Al empezar una
// era, el juego se para y sale una pantalla con su nombre, quién lo ha logrado, cómo está el mundo y lo más sonado de
// la era anterior. Las eras se guardan en world.eras (una partida antigua empieza con las que ya ha pasado, sin pantallas)
const ERAS = [
  { k:'tribus', ic:'🔥', name:'La Edad de las Tribus', sub:'Unas pocas familias alrededor del fuego. Todo está por hacer.', reached:() => true },
  { k:'escritura', ic:'📜', name:'La Antigüedad', sub:'Nace la escritura: ya se pueden guardar las leyes, los mapas y la memoria de lo que pasa.', reached:() => { const g = villages.find(o => popOf(o) && (o.know || {}).escritura); return g ? nationOf(g) : null; } },
  { k:'metalurgia', ic:'⚒', name:'La Edad del Hierro', sub:'El metal cambia las herramientas, las armas y las minas.' },
  { k:'polvora', ic:'💥', name:'La Edad de la Pólvora', sub:'Los mosquetes y los cañones cambian para siempre la guerra.' },
  { k:'vapor', ic:'🏭', name:'La Revolución Industrial', sub:'Chimeneas, fábricas y obreros: el campo se vacía y las ciudades crecen.' },
  { k:'electricidad', ic:'⚡', name:'La Era Eléctrica', sub:'Las noches se iluminan y las máquinas ya no duermen.' },
  { k:'aviacion', ic:'✈', name:'La Era del Aire', sub:'El cielo deja de ser de los pájaros: el mundo se hace pequeño.' },
  { k:'coheteria', ic:'🚀', name:'La Era Espacial', sub:'La humanidad mira las estrellas y empieza a ir hacia ellas.' },
  { k:'internet', ic:'💻', name:'La Era Digital', sub:'Todo el mundo, conectado: las noticias y las ideas vuelan.' },
];
const eraWho = E => { if (E.reached) return E.reached(); const id = (world.sciFirst || {})[E.k]; return id != null ? villageById(id) || { name:'una nación olvidada' } : null; };
const eraNow = () => { const L = world && world.eras; return L && L.length ? ERAS.find(E => E.k === L[L.length - 1].k) : ERAS[0]; };
// Al empezar (o al cargar una partida sin eras): las que ya se han pasado, sin pantallas
function erasInit(){
  if (world.eras) return;
  world.eras = [];
  for (const E of ERAS) { const who = eraWho(E); if (!who) break; world.eras.push({ k:E.k, d:E.k === 'tribus' ? 1 : Math.floor(yearT / DAY_LEN) + 1, who:who.name || '' }); }
}
let eraT = 0, eraShown = null;
SYSTEMS.push(dt => {
  if (!world || busy || (eraT -= dt) > 0) return; eraT = 4;
  erasInit();
  const have = new Set(world.eras.map(e => e.k)); let last = null;
  for (const E of ERAS) { if (have.has(E.k)) continue; const who = eraWho(E); if (!who) break; const e = { k:E.k, d:Math.floor(yearT / DAY_LEN) + 1, who:who.name || '', nid:who.id }; world.eras.push(e); last = e; notify(`Comienza ${E.name.replace(/^La /, 'la ')}: ${who.name} es la primera en lograrlo`, who.fx != null ? { x:who.fx * T, y:who.fy * T } : { x:0, y:0 }); }
  if (last) eraScreen(last);
});
// Lo más sonado desde la era anterior (de la crónica)
const ERA_BIG = /declara la guerra|firman la paz|golpe de estado|se independiza|conquista|maravilla|funda la colonia|primera potencia|revoluci|nuevo régimen|monopolio|controla ya|Por primera vez en el mundo|calado/;
function eraScreen(e){
  const E = ERAS.find(x => x.k === e.k), idx = world.eras.indexOf(e), prev = world.eras[idx - 1];
  const who = e.nid != null ? villageById(e.nid) : null, nats = villages.filter(o => popOf(o) && nationOf(o) === o);
  const wars = new Set([...rels.values()].filter(r => r.war).map(r => r.war.att + '-' + r.war.def)).size;
  const P = typeof powersData === 'function' ? powersData() : [], top = P[0], mine = typeof playerNat === 'function' && playerNat(), myPos = mine ? P.findIndex(x => x.n === mine) + 1 : 0;
  const since = chronicle.filter(c => prev ? c.d >= prev.d : true).filter(c => ERA_BIG.test(c.text)).slice(-4);
  const yr = Math.floor(yearT / YEAR) + 1, day = Math.floor(yearT / DAY_LEN) + 1;
  let el = $('eraScreen'); if (!el) { el = document.createElement('div'); el.id = 'eraScreen'; el.className = 'era'; document.body.appendChild(el); el.addEventListener('click', ev => { if (ev.target.closest('[data-eraok]')) eraClose(); }); el.addEventListener('keydown', ev => { if (ev.key === 'Escape' || ev.key === 'Enter') eraClose(); }); }
  const flag = n => n && n.flagUrl ? `<img src="${n.flagUrl}" alt="">` : n && n.fx != null ? `<i style="background:rgb(${villageColor(n).join(',')})"></i>` : '';
  el.innerHTML = `<div class="era-card" role="dialog" aria-modal="true" aria-labelledby="eraTitle">
    <div class="era-ic">${E.ic}</div><div class="era-kick">Comienza una nueva era · año ${yr}, día ${day}</div>
    <h2 id="eraTitle">${esc(E.name)}</h2><p class="era-sub">${esc(E.sub)}</p>
    ${who ? `<div class="era-who">${flag(who)}<span><b>${esc(who.name)}</b> ha sido la primera en lograrlo${prev ? ` · la era anterior duró ${Math.max(1, day - prev.d)} días` : ''}</span></div>` : ''}
    <div class="era-stats"><div><b>${villagers.filter(v => !v.dead).length}</b><span>habitantes</span></div><div><b>${nats.length}</b><span>naciones</span></div><div><b>${wars}</b><span>guerras</span></div><div><b>${top ? esc(top.n.name) : '—'}</b><span>primera potencia</span></div>${mine ? `<div class="mine"><b>${myPos ? myPos + '.º' : '—'}</b><span>tu nación</span></div>` : ''}</div>
    ${since.length ? `<h4>Lo más sonado de la era anterior</h4><ul class="era-log">${since.map(c => `<li><span>día ${c.d}</span>${esc(c.text)}</li>`).join('')}</ul>` : ''}
    <div class="era-steps">${ERAS.map(x => `<span class="${world.eras.some(y => y.k === x.k) ? (x.k === e.k ? 'now' : 'done') : ''}" title="${esc(x.name)}">${x.ic}</span>`).join('')}</div>
    <button class="era-ok" data-eraok type="button">Continuar</button></div>`;
  eraShown = { speed:gameSpeed }; if (gameSpeed) setSpeed(0);
  el.hidden = false; requestAnimationFrame(() => el.classList.add('in')); const b = el.querySelector('.era-ok'); if (b) b.focus();
  // Se cierra sola a los 5 segundos (con la cuenta atrás en el botón); pulsar antes la cierra igual
  clearInterval(eraTimer); let left = 5; if (b) b.textContent = `Continuar (${left})`;
  eraTimer = setInterval(() => { if (!eraShown) { clearInterval(eraTimer); return; } if (--left <= 0) { clearInterval(eraTimer); eraClose(); } else if (b) b.textContent = `Continuar (${left})`; }, 1000);
  snd('bell'); // (sin sitio: se oye igual desde cualquier parte)
}
let eraTimer = 0;
function eraClose(){ clearInterval(eraTimer); const el = $('eraScreen'); if (!el) return; el.classList.remove('in'); el.hidden = true; if (eraShown && eraShown.speed) setSpeed(eraShown.speed); eraShown = null; }
