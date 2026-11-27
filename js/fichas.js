// World Sim · Fichas más ordenadas: secciones plegables y números siempre redondos
// ================= Fichas =================
// · Cada sección de la ficha (lo que va bajo un título) se puede plegar y desplegar pulsando el título. Las cortas salen
//   abiertas; los historiales y las listas largas (leyes de antes, bolsa, tratados, relaciones…) salen plegadas con un
//   resumen de cuántas cosas hay. Lo que abre o cierra el jugador se recuerda por pestaña
// · Ningún número con decimales: «2,049 de madera» → «2 de madera» (los miles con punto se respetan)
const SEC_STATE = new Map(); // pestaña|título → abierta o no
const SEC_FOLD = /historia|historial|bolsa|consejo de las naciones|tratados|relaciones|cambio de moneda|sindicato|instituciones por construir|cementerio|descubierto|se puede investigar|saberes|justicia|espionaje|cultura|arte de la guerra|gente destacada|muertes|mercancías|fiestas|festivos/i;
// Orden de las secciones en cada pestaña: lo de cada día arriba; lo de fuera (bolsa, cambio) y los historiales, abajo
const SEC_ORDER = {
  economia:[/^valor del/, /salarios/, /impuestos/, /presupuestos/, /^clases/, /riqueza/, /vivienda/, /clima/, /mercanc/, /f[aá]brica|industria|obreros/, /^empresas/, /^mina/, /instituciones/, /sindicato/, /rescate|bancarrota|plan/, /cambio de moneda/, /bolsa/],
  politica:[/^parlamento/, /^encuestas/, /partidos/, /^constituci/, /^leyes/, /historia de las leyes/, /^naci[oó]n/, /alianza/, /guerra/, /tratados/, /relaciones/, /justicia/, /prensa/, /radio y televisi/, /cartelera/, /famosos/, /videojuegos/, /consejo/, /espionaje/, /cultura/, /ciencia/, /colonia/, /horario/],
};
// Redondea los números con decimales del texto (no toca lo que va dentro de las etiquetas: estilos, atributos…)
const roundNums = html => html.replace(/>([^<]+)/g, (m, t) => '>' + t.replace(/(\d+)([.,])(\d+)/g, (q, a, sep, b) => sep === '.' && b.length === 3 && !/^0/.test(a) && a.length <= 3 ? q : String(Math.round(parseFloat(a + '.' + b)))));
function foldSections(el, tab){
  const body = el.querySelector('.cbody'); if (!body) return;
  for (const par of new Set([...body.querySelectorAll('h4')].map(h => h.parentElement))) { // (los títulos pueden ir dentro de otro bloque)
    let cur = null;
    for (const k of [...par.children]) {
      if (k.tagName === 'H4') {
        const title = k.textContent.trim(), key = tab + '|' + title.replace(/\d+/g, '#');
        cur = document.createElement('details'); cur.className = 'fold'; cur.dataset.k = key;
        const sm = document.createElement('summary'); sm.innerHTML = k.innerHTML; cur.appendChild(sm); k.replaceWith(cur); continue;
      }
      if (cur) cur.appendChild(k);
    }
  }
  const order = SEC_ORDER[tab]; if (order) { // (se ordenan y quedan todas al mismo nivel, debajo de lo que no tiene título)
    const rank = d => { const t = d.dataset.k.split('|')[1].toLowerCase(), i = order.findIndex(r => r.test(t)); return i < 0 ? order.length : i; };
    const ds = [...body.querySelectorAll('details.fold')].map((d, i) => [d, rank(d), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]);
    for (const [d] of ds) body.appendChild(d);
  }
  for (const d of body.querySelectorAll('details.fold')) {
    const items = d.querySelectorAll('li, .kv, .party, .laws > div, .chips > span, .famrow > *').length, len = d.textContent.length;
    if (items > 4) { const c = document.createElement('span'); c.className = 'cnt'; c.textContent = items; d.firstChild.appendChild(c); }
    const saved = SEC_STATE.get(d.dataset.k);
    d.open = saved != null ? saved : !(SEC_FOLD.test(d.firstChild.textContent) && (len > 260 || items > 4)) && len < 1400;
    d.addEventListener('toggle', () => SEC_STATE.set(d.dataset.k, d.open));
  }
}
{ const base = setCardHTML; setCardHTML = function(el, html, force){
  const prev = el._html; base.call(this, el, roundNums(html), force);
  if (el._html === prev || !el.querySelector('.cbody')) return; // (no ha cambiado nada: se queda como estaba)
  foldSections(el, el.id === 'vcard' ? cardTab : el.id || 'card');
}; }
