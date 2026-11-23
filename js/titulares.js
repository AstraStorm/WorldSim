// Forja de Mundos · Titulares: lo más importante, en una barra arriba del mapa
// ================= Titulares =================
// · A la izquierda, las guerras en curso con su marcador (días y bajas de cada bando); a la derecha, las últimas
//   noticias importantes (guerras, paces, conquistas, golpes, revoluciones, bancarrotas y rescates, rutas
//   comerciales, Juegos y partidos), que van rotando. Tocar una lleva la cámara allí
const HEADLINE = /guerra|paz|conquist|arrasad|extingu|independiza|golpe|revoluci|régimen|bancarrota|rescate|recortes|reestructura|ruta comercial|Juegos|Final del partido|cisma|guerra civil|epidemia|erupción|tsunami|hiperinflación|se rinde|alianza|Consejo|feria|castillo|famoso|batalla/i;
const NOT_HEADLINE = /ha muerto en la guerra|marchan a atacar|Taquilla|aprenden|caravana/i;
let headlines = [], tickIdx = 0;
{
  const base = notify;
  notify = function(txt, at, ...rest){
    try { if (typeof txt === 'string' && HEADLINE.test(txt) && !NOT_HEADLINE.test(txt) && !(headlines[0] && headlines[0].txt === txt)) { headlines.unshift({ txt, at, d:Math.floor(yearT / DAY_LEN) + 1 }); if (headlines.length > 12) headlines.pop(); tickIdx = 0; renderTicker(); } } catch (err) {}
    return base.call(this, txt, at, ...rest);
  };
}
function renderTicker(){
  const el = document.getElementById('ticker'); if (!el || !world || busy) return;
  const wars = [...rels.values()].filter(r => r.war && villageById(r.war.att) && villageById(r.war.def));
  const wtxt = wars.map(r => { const S = warScore(r); return `<button class="tk-war" data-x="${(S.a.fx + S.d.fx) / 2 * T}" data-y="${(S.a.fy + S.d.fy) / 2 * T}">⚔ ${esc(S.a.name)} – ${esc(S.d.name)} <em>día ${S.days} · ${S.la}-${S.ld}</em></button>`; }).join('');
  const h = headlines[tickIdx % Math.max(1, headlines.length)];
  const html = `${wtxt || '<span class="tk-peace">☮ El mundo está en paz</span>'}<span class="tk-sep"></span>${h ? `<button class="tk-news"${h.at ? ` data-x="${h.at.x}" data-y="${h.at.y}"` : ''}><b>día ${h.d}</b> ${esc(h.txt)}</button>` : '<span class="muted">Sin noticias importantes todavía</span>'}`;
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
}
document.getElementById('ticker').addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { setFollow(null); centerOn(+b.dataset.x, +b.dataset.y, Math.max(zoom, 3)); } });
setInterval(() => { tickIdx++; renderTicker(); }, 6000);
setInterval(renderTicker, 1500);
