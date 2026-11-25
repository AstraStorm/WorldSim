// World Sim · Documentos dibujados: el DNI de cada país y el pasaporte común, en la ficha de cada persona
// ================= Documentos =================
// · El DNI cambia con el país: sus colores, su bandera y una de tres maquetas (franja arriba, banda lateral o con sello
//   de agua), siempre con la foto, el nombre, el número, el sexo, el día en que nació y la firma
// · El pasaporte es igual en todo el mundo (un acuerdo entre naciones): tapa granate con el globo dorado; solo cambia el
//   nombre del país que lo expide. Abierto, la página de datos con la foto
// · Si alguien cambia de país, su DNI viejo sigue siendo el del país que se lo hizo (hasta que le den otro)
const docCache = new Map();
const rgbOf = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const mixC = (c, d, k) => c.map((x, i) => Math.round(x * (1 - k) + d[i] * k));
function docCanvas(w, h){ const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2); x.imageSmoothingEnabled = false; return [c, x]; } // (a doble resolución: la letra pequeña se lee)
function docText(x, t, px, py, size, col, bold, max){ x.font = `${bold ? 'bold ' : ''}${size}px "Trebuchet MS", sans-serif`; x.fillStyle = col; x.textBaseline = 'top'; let s = String(t); if (max) while (s.length > 1 && x.measureText(s).width > max) s = s.slice(0, -1); x.fillText(s, px, py); }
function docPhoto(x, v, px, py, w, h, bg){
  x.fillStyle = bg; x.fillRect(px, py, w, h);
  try { const s = personSprite(v, 0, false), k = Math.min((w - 2) / s.width, (h - 2) / s.height); const dw = Math.floor(s.width * k), dh = Math.floor(s.height * k); x.drawImage(s, px + Math.floor((w - dw) / 2), py + h - dh, dw, dh); } catch (e) {}
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.strokeRect(px + .5, py + .5, w - 1, h - 1);
}
function docFlag(x, n, px, py, w, h){ const f = n && n.flag; if (!f) return; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { x.fillStyle = flagColor(f, (i + .5) / w, (j + .5) / h); x.fillRect(px + i, py + j, 1, 1); } x.strokeStyle = 'rgba(0,0,0,.4)'; x.strokeRect(px + .5, py + .5, w - 1, h - 1); }
function docSign(x, v, px, py, col){ // la firma: un garabato que sale de su nombre (siempre la misma para cada persona)
  let h = 0; for (const ch of v.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  x.strokeStyle = col; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py + 4);
  for (let k = 1; k <= 9; k++) { h = (h * 1103515245 + 12345) >>> 0; x.lineTo(px + k * 4, py + 1 + (h % 7)); }
  x.stroke();
}
const bornDay = v => Math.max(1, Math.floor((v.born || 0) / DAY_LEN) + 1);
function dniCard(v){
  const n = villageById(v.dni.nat) || nationOf(villageById(v.vid)); if (!n) return '';
  const key = `dni|${v.dni.n}|${n.id}|${n.name}|${v.name}|${stageOf(v)}|${n.flag ? 1 : 0}`; if (docCache.has(key)) return docCache.get(key);
  const W0 = 150, H0 = 94, [c, x] = docCanvas(W0, H0), col = villageColor(n), light = mixC(col, [255, 255, 255], .8), dark = mixC(col, [0, 0, 0], .45), lay = n.id % 3;
  x.fillStyle = rgbOf(light); x.fillRect(0, 0, W0, H0);
  x.strokeStyle = 'rgba(0,0,0,.08)'; for (let k = -H0; k < W0; k += 5) { x.beginPath(); x.moveTo(k, H0); x.lineTo(k + H0 * .6, 0); x.stroke(); } // tramado de seguridad
  const fields = (px, py, w) => {
    docText(x, 'NOMBRE', px, py, 6, rgbOf(dark), true); docText(x, v.name.toUpperCase(), px, py + 7, 9, '#1a1410', true, w);
    docText(x, 'SEXO', px, py + 19, 6, rgbOf(dark), true); docText(x, v.sex === 'm' ? 'M' : 'H', px, py + 26, 8, '#1a1410');
    docText(x, 'NACIÓ', px + 26, py + 19, 6, rgbOf(dark), true); docText(x, `día ${bornDay(v)}`, px + 26, py + 26, 8, '#1a1410');
    docText(x, 'Nº', px, py + 38, 6, rgbOf(dark), true); docText(x, v.dni.n, px + 12, py + 37, 8, '#1a1410', true);
    docSign(x, v, px, py + 50, '#22305a');
  };
  if (lay === 0) { // franja de color arriba, foto a la izquierda
    x.fillStyle = rgbOf(col); x.fillRect(0, 0, W0, 16); docFlag(x, n, W0 - 24, 3, 18, 11);
    docText(x, 'DOCUMENTO DE IDENTIDAD', 5, 2, 7, '#fff', true); docText(x, n.name.toUpperCase(), 5, 9, 6, 'rgba(255,255,255,.85)', true, 110);
    docPhoto(x, v, 6, 22, 36, 46, rgbOf(mixC(col, [255, 255, 255], .55))); fields(48, 21, 96);
  } else if (lay === 1) { // banda lateral con la bandera, foto a la derecha
    x.fillStyle = rgbOf(col); x.fillRect(0, 0, 14, H0); docFlag(x, n, 2, 4, 10, 16);
    x.save(); x.translate(10, H0 - 6); x.rotate(-Math.PI / 2); docText(x, n.name.toUpperCase(), 0, -8, 7, '#fff', true, 64); x.restore();
    docText(x, 'IDENTIDAD', 20, 4, 8, rgbOf(dark), true); docPhoto(x, v, W0 - 42, 8, 36, 46, rgbOf(mixC(col, [255, 255, 255], .5))); fields(20, 16, W0 - 66);
  } else { // con sello de agua y franja abajo
    x.fillStyle = rgbOf(mixC(col, [255, 255, 255], .55)); x.beginPath(); x.arc(W0 - 30, 40, 24, 0, Math.PI * 2); x.fill();
    x.strokeStyle = rgbOf(col); x.lineWidth = 2; x.beginPath(); x.arc(W0 - 30, 40, 18, 0, Math.PI * 2); x.stroke(); x.lineWidth = 1; docFlag(x, n, W0 - 39, 34, 18, 12);
    docPhoto(x, v, 6, 6, 34, 44, '#e8e4dc'); fields(46, 4, 66);
    x.fillStyle = rgbOf(dark); x.fillRect(0, H0 - 14, W0, 14); docText(x, `${n.name.toUpperCase()} · IDENTIDAD`, 6, H0 - 11, 7, '#fff', true, W0 - 12);
  }
  // zona de lectura (líneas de caracteres)
  if (lay !== 2) { docText(x, `ID<${v.dni.n.replace('-', '<')}<<<<${n.name.slice(0, 3).toUpperCase()}`, 6, H0 - 10, 6, 'rgba(0,0,0,.55)', false, W0 - 12); }
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.strokeRect(.5, .5, W0 - 1, H0 - 1);
  const html = `<img class="doc-card" src="${c.toDataURL()}" alt="DNI de ${esc(v.name)}" title="DNI de ${esc(n.name)}">`;
  if (docCache.size > 300) docCache.delete(docCache.keys().next().value); docCache.set(key, html); return html;
}
// El pasaporte: el mismo modelo en todos los países (solo cambia quién lo expide)
function passportCard(v){
  const n = villageById(v.pass) || (v.dni && villageById(v.dni.nat)) || nationOf(villageById(v.vid)); if (!n) return '';
  const key = `pas|${n.id}|${n.name}|${v.name}|${stageOf(v)}|${v.dni ? v.dni.n : ''}`; if (docCache.has(key)) return docCache.get(key);
  const W0 = 172, H0 = 94, [c, x] = docCanvas(W0, H0), wine = '#6a1c26', gold = '#d8b45a';
  // tapa
  x.fillStyle = wine; x.fillRect(0, 0, 66, H0); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(62, 0, 4, H0);
  docText(x, 'PASAPORTE', 7, 8, 9, gold, true);
  x.strokeStyle = gold; x.lineWidth = 1; x.beginPath(); x.arc(33, 46, 13, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(33, 46, 6, 13, 0, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(20, 46); x.lineTo(46, 46); x.moveTo(22, 39); x.lineTo(44, 39); x.moveTo(22, 53); x.lineTo(44, 53); x.stroke();
  docText(x, n.name.toUpperCase(), 7, 68, 7, gold, true, 54); docText(x, 'PASSPORT', 7, 80, 6, 'rgba(216,180,90,.7)', true);
  // página de datos
  x.fillStyle = '#efe9dc'; x.fillRect(68, 0, W0 - 68, H0); x.strokeStyle = 'rgba(106,28,38,.15)';
  for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(W0 - 20, 20, 8 + k * 6, 0, Math.PI * 2); x.stroke(); }
  docPhoto(x, v, 72, 6, 30, 38, '#dcd6c8');
  docText(x, 'APELLIDOS Y NOMBRE', 106, 5, 5, wine, true); docText(x, v.name.toUpperCase(), 106, 11, 8, '#1a1410', true, W0 - 110);
  docText(x, 'NACIONALIDAD', 106, 22, 5, wine, true); docText(x, n.name, 106, 28, 7, '#1a1410', false, W0 - 110);
  docText(x, 'NACIMIENTO', 106, 37, 5, wine, true); docText(x, `día ${bornDay(v)}`, 106, 43, 7, '#1a1410');
  docSign(x, v, 74, 50, '#22305a');
  docText(x, `P<${n.name.slice(0, 3).toUpperCase()}<${v.name.toUpperCase().replace(/\s+/g, '<')}<<<<<<<<`, 72, H0 - 19, 6, 'rgba(0,0,0,.6)', false, W0 - 76);
  docText(x, `${(v.dni ? v.dni.n : '00000000-X').replace('-', '')}<${bornDay(v)}<<<<<<<<<<<`, 72, H0 - 11, 6, 'rgba(0,0,0,.6)', false, W0 - 76);
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.strokeRect(.5, .5, W0 - 1, H0 - 1);
  const html = `<img class="doc-card" src="${c.toDataURL()}" alt="Pasaporte de ${esc(v.name)}" title="Pasaporte (modelo común a todos los países)">`;
  docCache.set(key, html); return html;
}
// En la ficha: los documentos que tiene, dibujados
function docCards(v){ if (v.slave) return ''; const out = []; if (v.dni) out.push(dniCard(v)); if (v.pass != null) out.push(passportCard(v)); return out.length ? `<div class="doc-cards">${out.join('')}</div>` : ''; }
