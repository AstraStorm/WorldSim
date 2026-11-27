// World Sim · Sonido: música, ambiente según lo que se ve y sonidos de cerca (todo sintetizado, sin archivos)
// Tres canales con su volumen (música, ambiente y efectos) que van a un volumen general.
// El ambiente (olas, ríos, viento, lluvia, grillos, pájaros, tormentas, fuego) suena siempre según lo que hay en
// pantalla; lo que hacen los aldeanos (talar, construir, picar, rezar, luchar) solo se oye al acercarse.
const SND = (() => {
  const vol = { gen:.8, mus:.4, amb:.8, sfx:.8 };
  try { Object.assign(vol, JSON.parse(localStorage.getItem('forja-vol') || '{}')); } catch (err) {}
  let on = true; try { on = localStorage.getItem('forja-snd') !== '0'; } catch (err) {}
  return { on, vol, ctx:null, last:{}, loops:{}, choirs:{}, busy:0, scanT:0, scene:null, vt:new WeakMap(), talk:new WeakMap(), song:{ next:0, bar:0 }, ev:{} };
})();
function onScreen(x, y){ const [x0, y0, x1, y1] = visibleRect(); return x >= x0 - 20 && x <= x1 + 20 && y >= y0 - 20 && y <= y1 + 20; }
function saveSndVol(){ try { localStorage.setItem('forja-vol', JSON.stringify(SND.vol)); localStorage.setItem('forja-snd', SND.on ? '1' : '0'); } catch (err) {} }
// Crea el contexto de audio (el navegador solo deja tras un clic), los canales y los ruidos que se reutilizan
function sndInit(){
  if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {}); return SND.ctx; }
  try { SND.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { return null; }
  const c = SND.ctx, comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(c.destination);
  SND.master = c.createGain(); SND.master.connect(comp);
  for (const k of ['mus', 'amb', 'sfx']) { SND[k] = c.createGain(); SND[k].connect(SND.master); }
  // Eco de la música (un retardo con realimentación, suave)
  SND.musIn = c.createGain(); SND.musIn.connect(SND.mus);
  const dl = c.createDelay(2), fb = c.createGain(), lp = c.createBiquadFilter();
  dl.delayTime.value = .46; fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2200;
  SND.musIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(SND.mus);
  // Ruido blanco y ruido marrón (más grave: olas, retumbos) de 4 s, en bucle
  const len = c.sampleRate * 4;
  SND.white = c.createBuffer(1, len, c.sampleRate); SND.brown = c.createBuffer(1, len, c.sampleRate);
  const w = SND.white.getChannelData(0), b = SND.brown.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; last = (last + .02 * w[i]) / 1.02; b[i] = last * 3.5; }
  applySndVol();
  if (c.state === 'suspended') c.resume().catch(() => {});
  return c;
}
function applySndVol(){
  if (!SND.ctx) return;
  const now = SND.ctx.currentTime, v = SND.vol;
  SND.master.gain.setTargetAtTime(SND.on ? v.gen * v.gen : 0, now, .08); // al cuadrado: el oído nota mejor los cambios abajo
  SND.mus.gain.setTargetAtTime(v.mus * v.mus * .9, now, .08);
  SND.amb.gain.setTargetAtTime(v.amb * v.amb, now, .08);
  SND.sfx.gain.setTargetAtTime(v.sfx * v.sfx, now, .08);
}
// Dónde está el oído: el centro de la pantalla. near va de 0 (lejos) a 1 (muy cerca, se oye a la gente)
function ear(){
  const cx = (cw / 2 - offX) / zoom, cy = (ch / 2 - offY) / zoom;
  return { cx, cy, rad:Math.max(30, Math.hypot(cw, ch) / zoom * .55), near:clamp((zoom - 2) / 3, 0, 1) };
}
// Volumen y panorama de un sonido en (x, y): más flojo cuanto más lejos del centro; reach amplía el alcance
function heard(x, y, reach = 1){
  const e = ear(), d = Math.hypot(x - e.cx, y - e.cy), r = e.rad * reach;
  return { g:Math.pow(clamp(1 - d / r, 0, 1), 1.5), pan:clamp((x - e.cx) / (e.rad * .9), -1, 1), d:d / r };
}
// Una salida con volumen y panorama hacia un canal
function sndOut(bus, g, pan = 0){
  const c = SND.ctx, gn = c.createGain(); gn.gain.value = g;
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; gn.connect(p); p.connect(bus); } else gn.connect(bus);
  return gn;
}
// Piezas básicas: un tono con barrido y un golpe de ruido filtrado (de un buffer compartido, a partir de un punto al azar)
function sTone(dst, type, f0, f1, dur, vol, at = 0, atk = .004){
  const c = SND.ctx, t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + atk); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + .05);
  SND.busy++; o.onended = () => SND.busy--;
}
function sNoise(dst, dur, vol, freq, q, type = 'bandpass', at = 0, brown = false, atk = .003){
  const c = SND.ctx, t0 = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = brown ? SND.brown : SND.white; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + atk); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dst); s.start(t0, Math.random() * 3); s.stop(t0 + dur + .05);
  SND.busy++; s.onended = () => SND.busy--;
}
// Sonidos sueltos. Los de la gente solo se oyen de cerca; los grandes (truenos, explosiones) desde lejos.
// Sin posición suenan en el centro (avisos como el cuerno de los Juegos)
const SND_PEOPLE = new Set(['burner', 'build', 'coin', 'cough', 'cheer', 'clash', 'arrow', 'chop', 'hammer', 'pick', 'anvil', 'dig', 'splash', 'drum', 'bowl', 'chime', 'bell']);
const SND_REACH = { thunder:4, boom:6, rumble:5, bell:1.6, cheer:1.3, clash:1.3, horn:3 };
const SND_GAP = { clash:.07, arrow:.08, build:.25, coin:.3, cheer:2, bell:1.5, horn:3, thunder:.8, cough:1.2, boom:.3, rumble:2 };
function snd(kind, x, y, k = 1){
  if (x != null && !(isFinite(x) && isFinite(y))) return; // (sin sitio válido, no suena)
  if (!SND.on || !SND.ctx || SND.ctx.state !== 'running' || SND.busy > 70) return;
  let g = 1, pan = 0, far = 0;
  if (x != null) {
    const h = heard(x, y, SND_REACH[kind] || 1); g = h.g; pan = h.pan; far = h.d;
    if (SND_PEOPLE.has(kind)) g *= ear().near;
    if (g < .02) return;
  }
  const c = SND.ctx, now = c.currentTime;
  if (now - (SND.last[kind] || -9) < (SND_GAP[kind] ?? .04)) return; SND.last[kind] = now;
  const o = sndOut(SND.sfx, g, pan), r = () => Math.random();
  switch (kind) {
    case 'clash': sNoise(o, .09, .3, 3200 + r() * 800, 4); sTone(o, 'triangle', 1900 + r() * 500, 1300, .16, .06); sTone(o, 'sine', 2700 + r() * 400, 2600, .3, .025, .01); break; // espada contra espada
    case 'arrow': sNoise(o, .2, .14, 1800, .8, 'highpass'); sNoise(o, .05, .12, 400, 2, 'bandpass', .18); break;          // silbido y el golpe al clavarse
    case 'horn': sTone(o, 'sawtooth', 196, 196, .5, .06, 0, .08); sTone(o, 'sawtooth', 262, 262, .7, .05, .45, .08); break;
    case 'bell': sTone(o, 'sine', 880, 870, 1.8, .08); sTone(o, 'sine', 1320, 1300, 1.2, .03); sTone(o, 'sine', 2200, 2190, .6, .015); break;
    case 'build': sTone(o, 'square', 220, 180, .06, .04); sTone(o, 'square', 200, 170, .06, .035, .14); sNoise(o, .3, .08, 700, .8, 'lowpass', .05); break;
    case 'coin': sTone(o, 'sine', 1400, 1400, .08, .05); sTone(o, 'sine', 1900, 1900, .12, .05, .07); break;
    case 'cheer': sNoise(o, 1.6, .12, 900, .6, 'bandpass', 0, false, .15); sNoise(o, 1.2, .08, 1800, .8, 'bandpass', .3, false, .1); break;
    case 'cough': sNoise(o, .12, .12, 600, 2); sNoise(o, .1, .08, 500, 2, 'bandpass', .18); break;
    case 'thunder': { // de lejos llega más tarde, más grave y más largo
      const at = far * 1.2, f = 900 - far * 700;
      sNoise(o, .25, .3 * (1 - far * .6), f * 2, .7, 'lowpass', at); sNoise(o, 2.4, .45, f * .3 + 60, .5, 'lowpass', at + .05, true, .08); break; }
    case 'chop': sNoise(o, .07, .35, 420 + r() * 120, 3); sTone(o, 'triangle', 160 + r() * 30, 90, .09, .12); break;           // hacha contra el tronco
    case 'hammer': sTone(o, 'square', 1800 + r() * 300, 1500, .04, .03); sNoise(o, .06, .22, 900 + r() * 300, 2.5); sTone(o, 'triangle', 240, 170, .07, .08); break; // martillo y clavo
    case 'pick': sTone(o, 'triangle', 2600 + r() * 600, 2300, .12, .05); sNoise(o, .08, .25, 2200, 3); sNoise(o, .2, .08, 600, 1, 'lowpass', .03); break; // pico contra la piedra
    case 'anvil': sTone(o, 'sine', 1250, 1240, .9, .07); sTone(o, 'sine', 3100, 3080, .5, .03); sNoise(o, .04, .25, 4000, 1, 'highpass'); break; // yunque
    case 'burner': sNoise(o, .7, .3, 380, .8, 'bandpass', 0, false, .05); sNoise(o, .6, .15, 1600, .7, 'bandpass', .02, false, .05); break; // quemador del globo
    case 'dig': sNoise(o, .25, .14, 500, .7, 'lowpass', 0, true, .05); break;                                                    // azada en la tierra
    case 'splash': sNoise(o, .35, .18, 1200, .6, 'bandpass', 0, false, .01); sTone(o, 'sine', 600, 1400, .08, .03, .05); break;
    case 'drum': sNoise(o, .3, .4 * k, 120, 1, 'lowpass', 0, true); sTone(o, 'sine', 110, 55, .35, .3 * k); break;
    case 'bowl': sTone(o, 'sine', 392, 391, 3.5, .06, 0, .02); sTone(o, 'sine', 1050, 1046, 2.5, .025, 0, .02); break;        // cuenco tibetano
    case 'chime': for (let n = 0; n < 3; n++) sTone(o, 'sine', [1568, 1760, 2093, 2349, 2637][Math.floor(r() * 5)], 0, 1.4, .025, n * (.12 + r() * .2)); break;
    case 'boom': { // explosión: estallido, retumbo largo y temblor grave (k = tamaño)
      sNoise(o, .4, .6 * k + .2, 1400, .6, 'lowpass'); sNoise(o, 3.5 * k + 1, .7, 160, .6, 'lowpass', .02, true, .02); sTone(o, 'sine', 70, 28, 2.5 * k + .6, .5); break; }
    case 'rumble': sNoise(o, 3 + k, .5, 90, .7, 'lowpass', 0, true, .6); sTone(o, 'sine', 45, 35, 3 + k, .25, 0, .5); break;    // terremoto
  }
}
// ---- Bucles de ambiente: ruido filtrado en bucle cuyo volumen sigue lo que hay en pantalla ----
function sLoop(name, brown, type, freq, q, bus){
  if (SND.loops[name]) return SND.loops[name];
  const c = SND.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = brown ? SND.brown : SND.white; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0;
  s.connect(f); f.connect(g); g.connect(bus || SND.amb); s.start(0, Math.random() * 3);
  return SND.loops[name] = { s, f, g, lv:0 };
}
function sLevel(name, v, freq, tc = .5){
  const L = SND.loops[name]; if (!L) return; const now = SND.ctx.currentTime;
  if (Math.abs(v - L.lv) > .002) { L.g.gain.setTargetAtTime(v, now, tc); L.lv = v; }
  if (freq) L.f.frequency.setTargetAtTime(freq, now, tc);
}
// Lo que se ve en pantalla, muestreado en una rejilla (cada cuarto de segundo)
function sndScene(){
  const vr = visibleRect(), e = ear(), nx = 12, ny = 8;
  let sea = 0, fresh = 0, land = 0, rain = 0, snow = 0, temp = 0, high = 0, n = 0;
  for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) {
    const px = vr[0] + (vr[2] - vr[0]) * (gx + .5) / nx, py = vr[1] + (vr[3] - vr[1]) * (gy + .5) / ny;
    const i = clamp(Math.floor(py / T), 0, H - 1) * W + clamp(Math.floor(px / T), 0, W - 1), b = world.biome[i];
    n++;
    if (WATER[b] && !frozen(i) && !dried(i)) { if (FRESH(b)) fresh++; else sea++; } else land++;
    const t = tempAt(i); temp += t;
    if (raining(i)) { if (t < 0) snow++; else rain++; }
    if (b === B.ROCK || b === B.SNOW) high++;
  }
  // Tormentas cerca: la más fuerte de cada tipo
  let tor = 0, hur = 0, sand = 0;
  for (const s of storms) {
    const d = Math.hypot(s.x - e.cx, s.y - e.cy), p = stormPower(s);
    if (s.type === 'huracan') hur = Math.max(hur, p * clamp(1.15 - d / (s.r * 1.2 + e.rad * .4), 0, 1));
    else tor = Math.max(tor, p * Math.pow(clamp(1 - d / (e.rad * 1.3 + 30 * s.size), 0, 1), 1.3) * (.5 + s.size * .35));
  }
  for (const s of sandstorms) sand = Math.max(sand, clamp(1 - Math.hypot(s.x - e.cx, s.y - e.cy) / (s.R * T + e.rad), 0, 1));
  // Fuego y lava cerca
  let fire = 0, fpan = 0, k = 0;
  for (const i of fires.keys()) { if (++k > 600) break; const h = heard((i % W) * T, ((i / W) | 0) * T, 1.2); if (h.g > .02) { fire += h.g; fpan += h.pan * h.g; } }
  let lava = 0;
  for (const v of world.volcanoes) { const h = heard(v.x, v.y, 2.5); lava = Math.max(lava, h.g * (v.state === 'erupcion' ? 1 : v.state === 'activo' ? .25 : 0)); }
  // Gente despierta cerca (murmullo del pueblo)
  let crowd = 0;
  if (e.near > 0) for (const v of villagers) if (!v.dead && !v.away && !v.sleep && Math.abs(v.x - e.cx) < e.rad && Math.abs(v.y - e.cy) < e.rad) crowd += heard(v.x, v.y).g;
  const war = [...rels.values()].some(r => r.war);
  SND.scene = { sea:sea / n, fresh:fresh / n, land:land / n, rain:rain / n, snow:snow / n, temp:temp / n, high:high / n, tor, hur, sand, fire:Math.min(1, fire / 6), fpan:fire ? fpan / fire : 0, lava, crowd, war, near:e.near };
}
// ---- Rezos: cada fe reza a su manera ----
// canto: un solo dios (canto llano) · coro: muchos dioses (coro de voces) · tambor: dioses del sol, el fuego o la guerra
// (tambores y cántico) · mantra: montañas, tierra, inframundo o muertos (om grave y cuenco) · susurro: luna,
// estrellas, mar o lluvia (rezo susurrado y campanillas)
function prayStyle(f){
  if (!f) return null;
  if (/sol|fuego|guerra|trueno|caza/.test(f.dom)) return 'tambor';
  if (/montañas|tierra|inframundo|muertos|desierto/.test(f.dom)) return 'mantra';
  if (/luna|estrellas|mar|lluvia|frío|viento/.test(f.dom) && !f.mono) return 'susurro';
  if (f.mono) return 'canto';
  return 'coro';
}
const VOWELS = { a:[730, 1090], o:[570, 840], u:[300, 870], e:[530, 1840], i:[390, 1990] };
function makeChoir(style){
  const c = SND.ctx, out = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
  out.gain.value = 0; if (pan) { out.connect(pan); pan.connect(SND.sfx); } else out.connect(SND.sfx);
  const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 6; f2.Q.value = 8;
  const mix = c.createGain(); mix.gain.value = 1; f1.connect(mix); f2.connect(mix); mix.connect(out);
  const oscs = [];
  if (style === 'susurro') { const s = c.createBufferSource(); s.buffer = SND.white; s.loop = true; s.connect(f1); s.connect(f2); s.start(); oscs.push(s); f1.Q.value = 3; f2.Q.value = 4; mix.gain.value = 1.6; }
  else {
    const base = { canto:146.8, coro:220, tambor:110, mantra:98 }[style], voices = style === 'coro' ? [0, 4, 7, 12] : style === 'mantra' ? [0, 12] : [0, 12, -12];
    for (const st of voices) {
      const o = c.createOscillator(), vg = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = base * Math.pow(2, st / 12); o.detune.value = (Math.random() - .5) * 14;
      lfo.frequency.value = 4.5 + Math.random(); lg.gain.value = 4; lfo.connect(lg); lg.connect(o.detune); lfo.start(); // vibrato
      vg.gain.value = st < 0 ? .35 : style === 'coro' ? .45 : st ? .3 : .6; o.connect(vg); vg.connect(f1); vg.connect(f2); o.start();
      oscs.push(o, lfo); o.st = st;
    }
  }
  const v = VOWELS[style === 'mantra' ? 'o' : style === 'susurro' ? 'e' : 'a']; f1.frequency.value = v[0]; f2.frequency.value = v[1];
  return SND.choirs[style] = { out, pan, f1, f2, oscs, lv:0, quiet:0, step:0, next:0, deg:0 };
}
function killChoir(style){ const ch = SND.choirs[style]; if (!ch) return; for (const o of ch.oscs) try { o.stop(); } catch (err) {} ch.out.disconnect(); delete SND.choirs[style]; }
// Modo dórico para el canto llano; las demás voces cambian de vocal y de acorde
const DORIAN = [0, 2, 3, 5, 7, 9, 10, 12];
function choirTick(style, ch, now){
  if (now < ch.next) return;
  const c = SND.ctx, t = c.currentTime, set = (o, f) => o.frequency.setTargetAtTime(f, t, style === 'canto' ? .06 : .4);
  const vowel = k => { const v = VOWELS[k]; ch.f1.frequency.setTargetAtTime(v[0], t, .15); ch.f2.frequency.setTargetAtTime(v[1], t, .15); };
  if (style === 'canto') { // una nota cada poco, paso a paso por la escala, volviendo a la tónica
    ch.deg = clamp(ch.deg + (Math.random() < .5 ? -1 : 1) * (Math.random() < .8 ? 1 : 2), 0, 6); if (Math.random() < .15) ch.deg = 0;
    for (const o of ch.oscs) if (o.st != null) set(o, 146.8 * Math.pow(2, (DORIAN[ch.deg] + o.st) / 12));
    vowel('aoeua'[Math.floor(Math.random() * 5)]); ch.next = now + .55 + Math.random() * .7;
  } else if (style === 'coro') { // cambio de acorde lento
    const chords = [[0, 4, 7, 12], [-3, 0, 4, 9], [-7, -3, 0, 5], [-5, -1, 2, 7]], cd = chords[(ch.step = (ch.step + 1) % 4)];
    ch.oscs.filter(o => o.st != null).forEach((o, k) => set(o, 220 * Math.pow(2, cd[k] / 12)));
    vowel(Math.random() < .5 ? 'a' : 'o'); ch.next = now + 2.6 + Math.random();
  } else if (style === 'tambor') { // cántico a golpes, con el tambor marcando el pulso
    ch.step++; const strong = ch.step % 4 === 0;
    ch.out.gain.cancelScheduledValues(t); ch.out.gain.setValueAtTime(ch.lv * .15, t); ch.out.gain.linearRampToValueAtTime(ch.lv * (strong ? 1 : .6), t + .03); ch.out.gain.setTargetAtTime(ch.lv * .15, t + .2, .1);
    if (ch.src) snd('drum', ch.src.x, ch.src.y, strong ? 1 : .55);
    if (strong) vowel(Math.random() < .5 ? 'e' : 'a'); ch.next = now + .42;
  } else if (style === 'mantra') { // om: de la o a la u y vuelta; el cuenco de vez en cuando
    vowel(ch.step++ % 2 ? 'o' : 'u'); if (ch.src && Math.random() < .25) snd('bowl', ch.src.x, ch.src.y); ch.next = now + 3 + Math.random() * 2;
  } else { // susurro y campanillas
    vowel('eiaou'[Math.floor(Math.random() * 5)]); if (ch.src && Math.random() < .3) snd('chime', ch.src.x, ch.src.y); ch.next = now + .35 + Math.random() * .5;
  }
}
// ---- Lo que hacen los aldeanos cerca: cada uno con su ritmo ----
const ACT_SND = {}, ACT_EVERY = { chop:.75, hammer:.45, pick:.6, anvil:.9, dig:1.5, splash:3.5, coin:3, drum:.9 };
for (const k of ['talar']) ACT_SND[k] = 'chop';
for (const k of ['universidad', 'consejo', 'espias', 'mina', 'tribunal', 'carcel', 'imprenta', 'sindicato', 'parlamento', 'academia', 'construir', 'ampliar', 'reparar', 'muralla', 'puente', 'muelle', 'torre', 'templo', 'catedral', 'maravilla', 'monumento', 'santuario', 'altar', 'almacen', 'molino', 'pozo', 'mercado', 'escuela', 'hospital', 'banco', 'lonja', 'cuartel', 'coliseo', 'teatro', 'taberna', 'ayuntamiento', 'cementerio', 'barca', 'carro', 'cercar', 'antorcha']) ACT_SND[k] = 'hammer';
for (const k of ['picar', 'minar', 'cantear', 'extraer']) ACT_SND[k] = 'pick';
for (const k of ['herreria', 'arma']) ACT_SND[k] = 'anvil';
for (const k of ['arar', 'sembrar', 'cosechar', 'plantar', 'arboleda']) ACT_SND[k] = 'dig';
for (const k of ['pescar', 'caña']) ACT_SND[k] = 'splash';
for (const k of ['vender', 'comerciar']) ACT_SND[k] = 'coin';
ACT_SND.sacrificio = 'drum';
const PRAY_TASKS = new Set(['orar', 'ritual', 'ofrenda']);
// ---- Voces: un oscilador con dos filtros de formante (las vocales) y la altura que sube o baja ----
// pitch y vow son listas de [segundo, valor]; trem hace temblar el volumen (balido) y vib la altura
function sVox(dst, at, dur, vol, pitch, vow, o = {}){
  const c = SND.ctx, t0 = c.currentTime + at, osc = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), body = c.createBiquadFilter(), g = c.createGain();
  osc.type = o.type || 'sawtooth'; f1.type = f2.type = 'bandpass'; f1.Q.value = o.q || 5; f2.Q.value = (o.q || 5) * 1.4; body.type = 'lowpass'; body.frequency.value = o.body || 500;
  osc.frequency.setValueAtTime(pitch[0][1], t0); for (const [t, f] of pitch.slice(1)) osc.frequency.linearRampToValueAtTime(f, t0 + t);
  const F = v => typeof v === 'string' ? VOWELS[v] : v, v0 = F(vow[0][1]);
  f1.frequency.setValueAtTime(v0[0], t0); f2.frequency.setValueAtTime(v0[1], t0);
  for (const [t, v] of vow.slice(1)) { const q = F(v); f1.frequency.linearRampToValueAtTime(q[0], t0 + t); f2.frequency.linearRampToValueAtTime(q[1], t0 + t); }
  const atk = o.atk || .015, base = o.trem ? vol * .55 : vol;
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(base, t0 + atk); g.gain.setValueAtTime(base, t0 + Math.max(atk, dur - (o.rel || .05))); g.gain.linearRampToValueAtTime(.0001, t0 + dur);
  const stops = [osc];
  if (o.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.trem; lg.gain.value = vol * .45; l.connect(lg); lg.connect(g.gain); stops.push(l); }
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibF || 5.5; lg.gain.value = o.vib; l.connect(lg); lg.connect(osc.detune); stops.push(l); }
  const bg = c.createGain(); bg.gain.value = o.bodyV ?? .25;
  osc.connect(f1); osc.connect(f2); osc.connect(body); body.connect(bg); f1.connect(g); f2.connect(g); bg.connect(g); g.connect(dst);
  for (const n of stops) { n.start(t0); n.stop(t0 + dur + .05); }
  SND.busy++; osc.onended = () => SND.busy--;
}
// Balbuceo: sílabas con los sonidos de su lengua (P: sus vocales, consonantes, ritmo y entonación); al final
// sube si pregunta y baja si afirma; f0 es su voz
const PHON_DEF = { vow:'aeiou', cf:[2500, 4000], cp:.6, syl:.09, pitch:1, tone:.15, coda:false };
function babble(o, f0, n, kind, P = PHON_DEF){
  const r = Math.random, ask = r() < .3, shout = kind === 'grito', laugh = kind === 'risa';
  let t = 0;
  for (let k = 0; k < n; k++) {
    const last = k === n - 1, dur = laugh ? .1 : shout ? .16 + r() * .12 : P.syl * (.75 + r() * .7);
    const p = f0 * (laugh ? 1.25 - k * .06 : shout ? 1.3 + r() * .2 : P.pitch * (1 + (r() - .5) * 2 * P.tone)) * (last ? (ask ? 1.25 : .85) : 1);
    const vw = laugh ? 'a' : P.vow[Math.floor(r() * P.vow.length)];
    if (laugh) sNoise(o, .04, .05, 1500, 1, 'bandpass', t);                                                       // la jota de «ja»
    else if (r() < P.cp) sNoise(o, .03, shout ? .08 : .045, P.cf[Math.floor(r() * P.cf.length)] * (.9 + r() * .2), 1.5, 'bandpass', t); // consonante
    sVox(o, t + .015, dur, shout ? .14 : .11, [[0, p], [dur, p * (last ? (ask ? 1.15 : .88) : .97 + r() * .08)]], [[0, vw]], { q:6, atk:.012, rel:.03 });
    if (P.coda && !laugh && r() < .3) sVox(o, t + .015 + dur, .05, .05, [[0, p * .9]], [[0, 'u']], { q:3, body:350, bodyV:.8 }); // final nasal (n, m)
    t += dur + .015 + (laugh ? .04 : r() < .2 ? .12 : .02);
  }
}
// Quién habla: de charla, de fiesta, en el mercado o en la taberna hablan a menudo; trabajando, de vez en cuando
const SOCIAL = new Set(['ocio', 'pasear', 'fiesta', 'ir_taberna', 'comerciar', 'vender', 'votar', 'espectador', 'ver_teatro', 'ver_coliseo', 'comer', 'beber', 'clase', 'enseñar', 'curar', 'jugar', 'protesta', 'reprimir', 'mercado']);
function sndVoices(now){
  const e = ear(); if (e.near <= 0 || !gameSpeed) return;
  for (const v of villagers) {
    if (v.dead || v.away || v.sleep || Math.abs(v.x - e.cx) > e.rad || Math.abs(v.y - e.cy) > e.rad) continue;
    const k = v.task && v.task.k, social = !k || SOCIAL.has(k), nx = SND.talk.get(v);
    if (nx == null || now >= nx) SND.talk.set(v, now + (nx == null ? Math.random() * 3 : social ? 3 + Math.random() * 5 : 12 + Math.random() * 16) / Math.min(2, gameSpeed));
    if (nx == null || now < nx || PRAY_TASKS.has(k)) continue; // la primera vez solo se apunta (para que no hablen todos a la vez)
    const h = heard(v.x, v.y); if (h.g * e.near < .05) continue;
    const kid = ageOf(v) < ADULT_H, f0 = (kid ? 290 : v.sex === 'm' ? 200 : 120) * (.9 + ((v.id || 0) % 7) * .03); // cada uno con su voz
    const kind = k === 'protesta' ? 'grito' : (k === 'fiesta' || k === 'ir_taberna' || k === 'ver_teatro') && Math.random() < .35 ? 'risa' : 'charla';
    // En qué lengua: con alguien cerca, la que compartan (la común, si es la única); si no se entienden, cada uno la suya
    let lang = nativeOf(v), mate = null, md = 18;
    for (const u of villagers) if (u !== v && !u.dead && !u.away && !u.sleep) { const d = Math.abs(u.x - v.x) + Math.abs(u.y - v.y); if (d < md) { md = d; mate = u; } }
    if (mate) { const sh = sharedLang(v, mate); if (sh != null) lang = sh; else if (Math.random() < .4) floats.push({ x:v.x, y:v.y - 14, txt:'¿?', col:'#f0e0a0', life:0 }); }
    const L = langList()[lang];
    babble(sndOut(SND.sfx, h.g * e.near * 1.6, h.pan), f0, kind === 'risa' ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 6), kind, L ? L.phon : PHON_DEF);
  }
}
// ---- Animales: cada especie con su voz y su ritmo; los lobos aúllan de noche ----
const ANIM_EVERY = { vaca:22, oveja:16, pollo:7, cerdo:13, caballo:30, perro:16, gato:35, lobo:25, oso:40 };
function animalCall(sp, o, a){
  const r = Math.random, kid = a && (yearT - a.born) / YEAR < .5, up = kid ? 1.6 : 1;
  switch (sp) {
    case 'vaca': { const f = (100 + r() * 25) * up, d = 1 + r() * .6; sVox(o, 0, d, .09, [[0, f * .9], [.25, f * 1.1], [d, f * .8]], [[0, 'u'], [.3, 'o'], [d, 'u']], { atk:.15, rel:.3, vib:8, body:700, bodyV:.6 }); break; } // muuu
    case 'oveja': { const f = (330 + r() * 80) * up, d = .55 + r() * .4; sVox(o, 0, d, .07, [[0, f], [d, f * .92]], [[0, 'e'], [d, 'a']], { trem:16 + r() * 6, atk:.04, rel:.15 }); break; } // beee
    case 'pollo': { // co-co-co; al amanecer, el gallo
      if (dayT() < .06 && r() < .5) { const f = 520; sVox(o, 0, 1.1, .05, [[0, f], [.15, f * 1.5], [.35, f * 1.4], [.6, f * 1.8], [1.1, f * 1.1]], [[0, 'o'], [.3, 'o'], [.6, 'i'], [1.1, 'o']], { atk:.02, vib:12, vibF:7 }); break; }
      for (let k = 2 + Math.floor(r() * 4), t = 0; k > 0; k--, t += .12 + r() * .1) sVox(o, t, .07, .04, [[0, 700 * up], [.07, 560 * up]], [[0, 'o']], { atk:.005, rel:.02 });
      break; }
    case 'cerdo': for (let k = 1 + Math.floor(r() * 3), t = 0; k > 0; k--, t += .22) { sVox(o, t, .16, .07, [[0, 170 * up], [.16, 120 * up]], [[0, 'o'], [.16, 'u']], { trem:45, q:3, atk:.01 }); sNoise(o, .14, .05, 400, 1, 'bandpass', t, true); } break; // oinc
    case 'caballo': { // relincho, o un resoplido
      if (r() < .4) { sNoise(o, .35, .08, 700, .7, 'bandpass', 0, false, .02); break; }
      sVox(o, 0, 1.2, .06, [[0, 700], [.2, 1100], [.6, 900], [1.2, 380]], [[0, 'i'], [.5, 'e'], [1.2, 'a']], { vib:60, vibF:11, atk:.03, rel:.3 }); break; }
    case 'perro': { const f = kid ? 700 : 420 + r() * 120, n = a && (a.state === 'atacando' || a.state === 'huyendo') ? 4 : 1 + Math.floor(r() * 3); // guau
      for (let k = 0, t = 0; k < n; k++, t += .2 + r() * .15) { sVox(o, t, .13, .09, [[0, f], [.05, f * 1.1], [.13, f * .7]], [[0, 'a'], [.13, 'u']], { atk:.005, rel:.04, q:3 }); sNoise(o, .05, .05, 1200, 1, 'bandpass', t); }
      break; }
    case 'gato': { const f = (kid ? 900 : 560) + r() * 80, d = .5 + r() * .3; sVox(o, 0, d, .05, [[0, f], [d * .4, f * 1.35], [d, f * .8]], [[0, 'i'], [d * .45, 'a'], [d, 'u']], { atk:.03, rel:.12, q:7 }); break; } // miau
    case 'lobo': { // de noche aúlla; cazando, gruñe
      if (a && (a.state === 'cazando' || a.state === 'atacando')) { sVox(o, 0, .8, .07, [[0, 110], [.8, 95]], [[0, 'u']], { trem:30, q:2, body:300, bodyV:.8 }); break; }
      const f = 380 + r() * 60, d = 2.2 + r() * 1.2; sVox(o, 0, d, .06, [[0, f], [.6, f * 1.6], [d * .8, f * 1.5], [d, f * 1.1]], [[0, 'u'], [.6, 'o'], [d, 'u']], { type:'triangle', atk:.4, rel:.6, vib:18, vibF:5, bodyV:.6 }); break; }
    case 'oso': sVox(o, 0, 1.1 + r() * .5, .1, [[0, 75], [.4, 90], [1.2, 60]], [[0, 'o'], [1.2, 'u']], { trem:25, q:2, body:250, bodyV:1 }); sNoise(o, 1, .06, 200, .8, 'lowpass', 0, true, .1); break; // gruñido
  }
}
function sndAnimals(now){
  const e = ear(); if (e.near <= 0 || !gameSpeed) return;
  for (const a of animals) {
    if (a.dead || a.rider || Math.abs(a.x - e.cx) > e.rad * 1.5 || Math.abs(a.y - e.cy) > e.rad * 1.5) continue;
    const nx = SND.talk.get(a), every = (ANIM_EVERY[a.sp] || 20) * (a.sp === 'lobo' && isNight() ? .5 : 1) * (a.state === 'huyendo' || a.state === 'atacando' ? .25 : 1);
    if (nx == null || now >= nx) SND.talk.set(a, now + every * (nx == null ? Math.random() * .4 : .6 + Math.random() * .8) / Math.min(2, gameSpeed));
    if (nx == null || now < nx) continue;
    const h = heard(a.x, a.y, a.sp === 'lobo' ? 2.2 : a.sp === 'vaca' || a.sp === 'perro' ? 1.4 : 1), g = h.g * (a.sp === 'lobo' ? Math.max(e.near, .5) : e.near);
    if (g < .04 || now - (SND.last['a:' + a.sp] || -9) < .35) continue; SND.last['a:' + a.sp] = now;
    animalCall(a.sp, sndOut(SND.amb, g * 1.8, h.pan), a);
  }
}
function sndPeople(now){
  const e = ear(), pray = {};
  if (e.near <= 0 || !gameSpeed) return pray;
  for (const v of villagers) {
    if (v.dead || v.away || v.sleep || !v.task || !(v.actT > 0) || Math.abs(v.x - e.cx) > e.rad || Math.abs(v.y - e.cy) > e.rad) continue;
    const k = v.task.k;
    if (PRAY_TASKS.has(k)) {
      const g = villageById(v.vid), st = g && prayStyle(g.faith); if (!st) continue;
      const h = heard(v.x, v.y); if (h.g < .02) continue;
      const p = pray[st] ||= { g:0, pan:0, x:v.x, y:v.y, best:0 };
      p.g += h.g * .45; p.pan += h.pan * h.g; if (h.g > p.best) { p.best = h.g; p.x = v.x; p.y = v.y; }
      continue;
    }
    const s = ACT_SND[k]; if (!s) continue;
    const nx = SND.vt.get(v) || 0; if (now < nx) continue;
    SND.vt.set(v, now + ACT_EVERY[s] * (.8 + Math.random() * .4) / Math.min(2, gameSpeed));
    if (nx) snd(s, v.x, v.y); // el primer golpe espera un poco: así no empiezan todos a la vez
  }
  return pray;
}
// ---- Música generativa: acordes suaves y notas sueltas; de día alegre, de noche en menor y con tambores si hay guerra ----
const MOODS = {
  dia:   { root:261.6, chords:[[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], scale:[0, 2, 4, 7, 9, 12, 14, 16], bar:6.4, notes:3 },
  noche: { root:220,   chords:[[0, 3, 7], [-4, 0, 3], [-9, -5, -2], [-5, -2, 2]], scale:[0, 3, 5, 7, 10, 12, 15], bar:8, notes:1.5 },
  guerra:{ root:146.8, chords:[[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [0, 3, 7]], scale:[0, 3, 5, 7, 8, 12, 15], bar:5.6, notes:2.5, drums:true },
};
function musicTick(now){
  const M = SND.song; if (now < M.next - .3) return;
  const c = SND.ctx, sc = SND.scene, mood = MOODS[sc && sc.war ? 'guerra' : isNight() ? 'noche' : 'dia'];
  const t0 = c.currentTime + Math.max(0, M.next - now), bar = mood.bar, chord = mood.chords[M.bar++ % mood.chords.length];
  M.next = now + Math.max(0, M.next - now) + bar;
  const f = st => mood.root * Math.pow(2, st / 12);
  // Colchón: cada nota del acorde con dos osciladores algo desafinados, entrada y salida lentas
  for (const st of chord) for (const dt of [-6, 6]) {
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f(st - 12); o.detune.value = dt; lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.022, t0 + bar * .35); g.gain.linearRampToValueAtTime(.0001, t0 + bar * 1.15);
    o.connect(lp); lp.connect(g); g.connect(SND.musIn); o.start(t0); o.stop(t0 + bar * 1.2);
  }
  // Notas sueltas, como una pequeña arpa, con eco
  const n = Math.floor(mood.notes + Math.random() * 2);
  for (let k = 0; k < n; k++) {
    const at = t0 + Math.floor(Math.random() * 8) * bar / 8, p = f(mood.scale[Math.floor(Math.random() * mood.scale.length)]), o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = p; o2.type = 'triangle'; o2.frequency.value = p * 2;
    g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(.05, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + 1.8);
    o.connect(g); o2.connect(g); g.connect(SND.musIn); o.start(at); o2.start(at); o.stop(at + 1.9); o2.stop(at + 1.9);
  }
  if (mood.drums) for (let b = 0; b < 4; b++) { // tambor de guerra lejano
    const at = t0 + b * bar / 4, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(90, at); o.frequency.exponentialRampToValueAtTime(40, at + .4);
    g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(b % 2 ? .05 : .09, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + .5);
    o.connect(g); g.connect(SND.mus); o.start(at); o.stop(at + .55);
  }
}
// ---- Cada fotograma ----
function sndTick(dt){
  if (!SND.ctx || SND.ctx.state !== 'running') return;
  const now = SND.ctx.currentTime;
  if (!SND.on || !world || !world.baseT || busy || !cw) { for (const k in SND.loops) sLevel(k, 0); for (const k in SND.choirs) killChoir(k); return; }
  if ((SND.scanT -= dt) <= 0) { SND.scanT = .25; try { sndScene(); } catch (err) { console.error(err); } }
  const s = SND.scene; if (!s) return;
  if (SND.vol.mus > 0) musicTick(now);
  // Bucles: olas (con su vaivén), río, viento, lluvia, tormentas, fuego, lava y murmullo
  for (const [k, br, ty, f, q] of [['olas', 1, 'lowpass', 500, .7], ['rio', 0, 'bandpass', 900, 1.2], ['viento', 1, 'bandpass', 380, .8], ['lluvia', 0, 'highpass', 2500, .5],
    ['tornado', 1, 'lowpass', 260, 1], ['silbido', 0, 'bandpass', 700, 6], ['huracan', 0, 'bandpass', 500, .6], ['fuego', 1, 'lowpass', 300, .8], ['lava', 1, 'lowpass', 120, .8], ['gente', 0, 'bandpass', 520, 1.5]]) sLoop(k, br, ty, f, q, k === 'gente' ? SND.sfx : null);
  const ph = now * Math.PI * 2 / 7, swell = .55 + .45 * Math.sin(ph) * Math.sin(ph * .37 + 1);
  const coast = s.sea > 0 ? clamp(.35 + 4 * s.sea * s.land, 0, 1.2) : 0;
  sLevel('olas', coast * (.25 + .35 * swell) * (.5 + .5 * s.near), 300 + swell * 500 + s.near * 300, .3);
  sLevel('rio', Math.min(1, s.fresh * 5) * .1 * (.4 + .6 * s.near) * (.85 + Math.random() * .3), 800 + Math.random() * 400, .15);
  const wind = .03 + (1 - s.near) * .05 + s.high * .12 + s.snow * .25 + s.sand * .3 + s.hur * .35 + s.tor * .2;
  sLevel('viento', Math.min(.6, wind), 300 + 250 * Math.sin(now * .23) + s.hur * 300, .8);
  sLevel('lluvia', Math.min(.5, (s.rain + s.hur * .6) * (.35 + .4 * s.near)), 1800 + s.near * 1500);
  sLevel('tornado', s.tor * .9, 200 + s.tor * 150); sLevel('silbido', s.tor * .12 * (.6 + .4 * Math.sin(now * 1.7)), 600 + 250 * Math.sin(now * .9));
  sLevel('huracan', s.hur * .45, 400 + 200 * Math.sin(now * .5));
  sLevel('fuego', s.fire * .25); sLevel('lava', s.lava * .5);
  sLevel('gente', Math.min(.04, Math.max(0, s.crowd - 6) * .004) * s.near * (isNight() ? .4 : 1) * (.7 + Math.random() * .6), 450 + Math.random() * 250, .12);
  // Sonidos sueltos del ambiente: grillos y ranas de noche, pájaros y gaviotas de día, chasquidos del fuego
  const ev = SND.ev, rnd = (k, rate) => { ev[k] = (ev[k] || 0) + dt * rate; if (ev[k] < 1) return false; ev[k] = Math.random() * .5; return true; };
  const calm = s.rain < .2 && s.tor < .1 && s.hur < .1, e = ear(), spot = () => [e.cx + (Math.random() - .5) * e.rad * 1.4, e.cy + (Math.random() - .5) * e.rad * 1.4];
  const amb = (kind, k) => { const [x, y] = spot(), o = sndOut(SND.amb, .6 + .4 * s.near, clamp((x - e.cx) / e.rad, -1, 1)); sndAmbient(kind, o, k); };
  if (isNight() && calm && s.temp > 6 && s.land > .25 && rnd('grillo', s.land * 6)) amb('cricket', Math.random());
  if (isNight() && calm && s.temp > 8 && s.fresh > .02 && rnd('rana', Math.min(1, s.fresh * 8) * 1.2)) amb('frog', Math.random());
  if (!isNight() && calm && s.temp > 3 && s.land > .3 && rnd('pajaro', s.land * .5)) amb('bird', Math.random());
  if (!isNight() && calm && s.sea > .15 && s.land > .1 && rnd('gaviota', .08)) amb('gull', 0);
  if (s.fire > .02 && rnd('chasquido', s.fire * 12)) { const o = sndOut(SND.amb, 1, s.fpan); sndAmbient('crackle', o, Math.min(1, s.fire * 2)); }
  // Meteoritos: silbido mientras caen (la explosión la lanza el impacto)
  for (const m of meteors) if (m.t >= 0 && !m.sndW) { m.sndW = true; const h = heard(m.x, m.y, 6); if (h.g > .02) sndAmbient('whistle', sndOut(SND.sfx, h.g, h.pan), Math.max(.4, m.dur - m.t)); }
  // Gente: trabajos con su ritmo y rezos según su fe
  const pray = sndPeople(now);
  sndVoices(now); sndAnimals(now);
  for (const st of ['canto', 'coro', 'tambor', 'mantra', 'susurro']) {
    const p = pray[st], lv = p ? Math.min(.6, p.g) * s.near * (st === 'susurro' ? .5 : st === 'mantra' ? .45 : .22) : 0;
    let ch = SND.choirs[st];
    if (!ch && lv > .01) ch = makeChoir(st);
    if (!ch) continue;
    if (lv > .01) { ch.quiet = 0; ch.src = p; if (ch.pan) ch.pan.pan.setTargetAtTime(clamp(p.pan / Math.max(.01, p.g / .45), -1, 1), SND.ctx.currentTime, .3); }
    else if ((ch.quiet += dt) > 4) { killChoir(st); continue; }
    if (Math.abs(ch.lv - lv) > .003) { ch.lv = lv; if (st !== 'tambor') ch.out.gain.setTargetAtTime(lv, SND.ctx.currentTime, .6); else if (!lv) ch.out.gain.setTargetAtTime(0, SND.ctx.currentTime, .3); }
    if (lv > .01 && gameSpeed) choirTick(st, ch, now);
  }
}
// Un sonido del ambiente ya con su salida (no depende de la distancia a la gente)
function sndAmbient(kind, o, k){
  const r = Math.random;
  if (kind === 'cricket') for (let n = 0; n < 3; n++) sTone(o, 'sine', 4300 + k * 400, 0, .035, .02, n * .06);
  else if (kind === 'frog') for (let n = 0; n < 2; n++) sTone(o, 'square', 170 + k * 50, 130, .1, .02, n * .14);
  else if (kind === 'bird') { let t = 0; const f = 2400 + k * 1600; for (let n = 2 + Math.floor(r() * 4); n > 0; n--) { sTone(o, 'sine', f * (.9 + r() * .3), f * (1.1 + r() * .4), .07 + r() * .06, .018, t); t += .09 + r() * .08; } }
  else if (kind === 'gull') { sTone(o, 'sawtooth', 1300, 900, .35, .01, 0, .05); sTone(o, 'sawtooth', 1250, 850, .3, .008, .4, .05); }
  else if (kind === 'crackle') for (let n = 0; n < 3; n++) sNoise(o, .02, .25 * k, 2500 + r() * 3000, 2, 'bandpass', r() * .3);
  else if (kind === 'whistle') { sTone(o, 'sine', 2200, 260, k, .05, 0, .3); sNoise(o, k, .12, 1500, 1.2, 'bandpass', 0, false, k * .7); }
}
document.addEventListener('visibilitychange', () => { if (!SND.ctx) return; if (document.hidden) SND.ctx.suspend().catch(() => {}); else if (SND.on) SND.ctx.resume().catch(() => {}); });
