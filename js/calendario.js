// Forja de Mundos · Calendario: los días de la semana en cada lengua y el calendario laboral de cada pueblo
// ================= Calendario =================
// · Cada lengua pone nombre a sus siete días con sus propios sonidos (y una misma terminación, como «-es» en lunes,
//   martes...); se muestran con el nuestro entre paréntesis. Las lenguas hijas heredan los de su madre, algo cambiados
// · Ficha del pueblo, pestaña «Calendario»: el año entero (16 días) por semanas, con los días laborables, los libres y
//   los festivos (Año Nuevo, la fiesta de su dios y los que declaran por lo que les pasa: victorias, paces, independencia)
const DAYS_ES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const YEAR_DAYS = () => Math.round(SEASON_LEN * 4 / DAY_LEN);
function weekNames(id){
  const L = langList()[id ?? LANG_COMMON]; if (!L || !L.phon) return DAYS_ES.map(capFirst);
  if (L.days && L.days.length === 7) return L.days;
  const r = mulberry32(langSeed() * 613 + (id ?? 0) * 4099 + 17), P = L.phon, mom = L.parent != null ? langList()[L.parent] : null;
  let out;
  if (mom && mom.phon) { // la hija: los de la madre con algún sonido cambiado
    out = weekNames(mom.id).map(w => { let x = w.toLowerCase(); if (r() < .6) { const k = Math.floor(r() * x.length), c = x[k]; x = x.slice(0, k) + ('aeiou'.includes(c) ? P.vow[Math.floor(r() * P.vow.length)] : P.cons[Math.floor(r() * P.cons.length)]) + x.slice(k + 1); } return readable(x) ? capFirst(x) : w; });
  } else {
    let suf = ''; for (let k = 0; k < 10 && (!suf || suf.length > 3); k++) suf = langWord(P, 1, r);
    out = []; const used = new Set();
    for (let d = 0; d < 7; d++) { let w = ''; for (let k = 0; k < 30 && (!w || used.has(w) || !readable(w)); k++) w = langWord(P, 1 + (r() < .45 ? 1 : 0), r).replace(/[aeiou]$/, '') + suf; if (!readable(w)) w = DAYS_ES[d]; used.add(w); out.push(capFirst(w)); }
  }
  return L.days = out;
}
const weekdayIdx = dn => ((dn ?? dayNum()) % WEEK + WEEK) % WEEK;
const dayLabel = (lang, dn) => { const k = weekdayIdx(dn); return `${weekNames(lang)[k]} (${DAYS_ES[k]})`; };
// Festivos de un pueblo: los fijos y los que han declarado
function fiestasOf(g){
  const f = [{ name:'Año Nuevo', doy:0, day:-1, fixed:true }];
  if (g && g.faith && g.faith.god) f.push({ name:`Fiesta de ${g.faith.god}`, doy:Math.min(YEAR_DAYS() - 1, 6), day:-1, fixed:true });
  for (const x of (g && g.fiestas) || []) if (!f.some(y => y.doy === x.doy)) f.push(x);
  return f;
}
function calendarTab(g){
  const lang = g.lang ?? LANG_COMMON, names = weekNames(lang), today = dayNum(), doy = dayOfYear(), first = today - doy, nd = YEAR_DAYS(), rest = restDaysOf(g), fest = fiestasOf(g);
  const off = weekdayIdx(first), cells = [];
  for (let k = 0; k < off; k++) cells.push('<i class="cal-e"></i>');
  for (let d = 0; d < nd; d++) {
    const dn = first + d, wd = weekdayIdx(dn), f = fest.find(x => x.doy === d), free = rest && wd >= WEEK - rest, si = Math.floor(d / (SEASON_LEN / DAY_LEN)) % 4;
    const cls = f ? 'fest' : free ? 'libre' : 'lab', tip = `${names[wd]} (${DAYS_ES[wd]}), día ${d + 1} · ${f ? `festivo: ${f.name}` : free ? 'día libre' : 'laborable'}`;
    cells.push(`<i class="cal-d ${cls}${d === doy ? ' hoy' : d < doy ? ' pas' : ''}" title="${esc(tip)}" style="--sc:${SEASONS[si].dot}"><b>${d + 1}</b>${f ? '<s>★</s>' : ''}</i>`);
  }
  const tf = fest.find(x => x.doy === doy), twd = weekdayIdx(today), todayKind = tf ? `<b class="cal-fest">¡fiesta! «${esc(tf.name)}»</b>` : rest && twd >= WEEK - rest ? '<b>día libre</b>' : '<b>se trabaja</b>';
  return `<h4>Hoy</h4><div class="cal-today"><span class="cal-wd">${esc(names[twd])}</span> <span class="muted">(${DAYS_ES[twd]})</span>, día ${doy + 1} del año ${seasonInfo().year} · ${todayKind}</div>
    <div class="muted" style="font-size:12px;margin-top:2px">Los días, en ${esc(langName(lang))}</div>
    <h4>Año ${seasonInfo().year}</h4>
    <div class="cal"><div class="cal-h">${names.map((n, k) => `<span title="${DAYS_ES[k]}">${esc(n)}<em>${DAYS_ES[k].slice(0, 3)}</em></span>`).join('')}</div><div class="cal-g">${cells.join('')}</div></div>
    <div class="cal-leg"><span><i class="lab"></i>laborable</span><span><i class="libre"></i>día libre</span><span><i class="fest"></i>festivo</span><span><i class="hoy"></i>hoy</span>
      ${SEASONS.map(s => `<span><i style="background:${s.dot}"></i>${s.n.toLowerCase()}</span>`).join('')}</div>
    <h4>Jornada</h4><div class="sec">
      <div class="kv"><span>Días libres</span><b>${rest ? `${rest} por semana (${names.slice(WEEK - rest).map(esc).join(' y ')})` : '<span style="color:#f08a7a">ninguno: trabajan todos los días</span>'}${g.restBonus ? ` <span class="muted">(+${g.restBonus} por las protestas)</span>` : ''}</b></div>
      <div class="kv"><span>Horario</span><b>${shiftTxt(g)}</b></div></div>
    <h4>Festivos</h4><div class="cal-fl">${fest.slice().sort((a, b) => a.doy - b.doy).map(x => `<div><b>Día ${x.doy + 1}</b> <span class="muted">· ${esc(names[weekdayIdx(first + x.doy)])} (${DAYS_ES[weekdayIdx(first + x.doy)]})</span><br>${esc(x.name)}${x.fixed ? '' : x.day >= first + x.doy ? ' <span class="muted">(desde el año que viene)</span>' : ''}</div>`).join('')}</div>`;
}
