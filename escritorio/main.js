// Forja de Mundos · Escritorio: el launcher (comprueba y descarga las actualizaciones) y la ventana del juego
// · El juego vive en la carpeta del usuario (…/AppData/Roaming/Forja de Mundos/juego). La primera vez se copia la
//   versión que trae el ejecutable (juego-base) y, desde entonces, el launcher la pone al día
// · Actualizar: se baja manifest.json de GitHub Pages (versión, novedades y la huella de cada archivo), se compara con
//   el de aquí y se descargan solo los archivos que han cambiado (comprobando su huella); al final se guarda el nuevo
// · Sin conexión se juega con lo que haya
// · El juego se sirve con un protocolo propio (forja://juego/…) para que el lienzo pueda leer el atlas de dibujos
const { app, BrowserWindow, ipcMain, protocol, net, shell } = require('electron');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { pathToFileURL } = require('url');
const REMOTO = 'https://astrastorm.github.io/WorldSim/';
const GAME = () => path.join(app.getPath('userData'), 'juego');
const BASE = () => app.isPackaged ? path.join(process.resourcesPath, 'juego-base') : path.join(__dirname, 'juego-base');
protocol.registerSchemesAsPrivileged([{ scheme:'forja', privileges:{ standard:true, secure:true, supportFetchAPI:true, corsEnabled:true, stream:true } }]);
let launcher = null, game = null;
// ---- Archivos del juego ----
function readManifest(dir){ try { return JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch (e) { return null; } }
const BIN = /\.(png|jpe?g|gif|webp|ico|mp3|ogg|wav|woff2?|ttf)$/i;
function huella(rel, buf){ if (!BIN.test(rel)) buf = Buffer.from(buf.toString('latin1').replace(/\r/g, ''), 'latin1'); return crypto.createHash('sha1').update(buf).digest('hex'); }
function ensureGame(){ // la primera vez (o si la carpeta está rota): la versión que trae el ejecutable
  const here = readManifest(GAME()), base = readManifest(BASE());
  if (!here || !fs.existsSync(path.join(GAME(), 'index.html')) || (base && base.version > here.version)) {
    fs.mkdirSync(GAME(), { recursive:true }); if (fs.existsSync(BASE())) fs.cpSync(BASE(), GAME(), { recursive:true });
  }
  return readManifest(GAME());
}
async function fetchJSON(url){ const r = await net.fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache:'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
async function check(){
  const local = ensureGame();
  try {
    const remote = await fetchJSON(REMOTO + 'manifest.json');
    const changed = Object.entries(remote.archivos || {}).filter(([f, h]) => !local || !local.archivos || local.archivos[f] !== h || !fs.existsSync(path.join(GAME(), f))).map(([f]) => f);
    return { ok:true, local:local && { version:local.version, fecha:local.fecha }, remote:{ version:remote.version, fecha:remote.fecha }, novedades:remote.novedades || [], changed, total:Object.keys(remote.archivos || {}).length };
  } catch (e) {
    return { ok:false, error:String(e.message || e), local:local && { version:local.version, fecha:local.fecha }, novedades:(local && local.novedades) || [], changed:[] };
  }
}
async function update(full, send){
  const remote = await fetchJSON(REMOTO + 'manifest.json'), local = readManifest(GAME()) || { archivos:{} };
  const todo = Object.entries(remote.archivos).filter(([f, h]) => full || local.archivos[f] !== h || !fs.existsSync(path.join(GAME(), f)));
  let done = 0, bytes = 0;
  const tmp = path.join(app.getPath('userData'), 'descarga'); fs.rmSync(tmp, { recursive:true, force:true }); fs.mkdirSync(tmp, { recursive:true });
  const queue = todo.slice(), worker = async () => { // de 4 en 4
    while (queue.length) {
      const [f, h] = queue.shift();
      const r = await net.fetch(REMOTO + f.split('/').map(encodeURIComponent).join('/') + '?v=' + remote.version, { cache:'no-store' });
      if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (huella(f, buf) !== h) throw new Error(`${f}: el archivo descargado no coincide`);
      const out = path.join(tmp, f); fs.mkdirSync(path.dirname(out), { recursive:true }); fs.writeFileSync(out, buf);
      done++; bytes += buf.length; send({ done, total:todo.length, file:f, bytes });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  // Todo bajado y comprobado: se copia encima y se borra lo que ya no está en el juego
  fs.cpSync(tmp, GAME(), { recursive:true, force:true }); fs.rmSync(tmp, { recursive:true, force:true });
  for (const f of Object.keys(local.archivos || {})) if (!(f in remote.archivos)) fs.rmSync(path.join(GAME(), f), { force:true });
  fs.writeFileSync(path.join(GAME(), 'manifest.json'), JSON.stringify(remote, null, 1));
  return { version:remote.version, files:todo.length, bytes };
}
// ---- Ventanas ----
function openLauncher(){
  launcher = new BrowserWindow({ width:1120, height:660, minWidth:900, minHeight:560, frame:false, backgroundColor:'#0d1117', show:false, title:'Forja de Mundos',
    icon:path.join(__dirname, 'launcher', 'icono.png'), webPreferences:{ preload:path.join(__dirname, 'preload.js') } });
  launcher.loadFile(path.join(__dirname, 'launcher', 'index.html'));
  launcher.once('ready-to-show', () => launcher.show());
  launcher.on('closed', () => { launcher = null; if (!game) app.quit(); });
}
function openGame(){
  if (game) { game.focus(); return; }
  game = new BrowserWindow({ width:1440, height:900, backgroundColor:'#11151a', title:'Forja de Mundos', autoHideMenuBar:true, icon:path.join(__dirname, 'launcher', 'icono.png') });
  game.setMenu(null);
  game.loadURL('forja://juego/index.html');
  game.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') { game.setFullScreen(!game.isFullScreen()); e.preventDefault(); } if (i.type === 'keyDown' && i.key === 'F12' && !app.isPackaged) game.webContents.toggleDevTools(); });
  game.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action:'deny' }; });
  game.on('closed', () => { game = null; if (launcher) launcher.show(); else app.quit(); });
  if (launcher) launcher.hide();
}
app.whenReady().then(() => {
  protocol.handle('forja', req => { // forja://juego/ruta → el archivo de la carpeta del juego (sin salirse de ella)
    const u = new URL(req.url), rel = decodeURIComponent(u.pathname).replace(/^\/+/, ''), file = path.normalize(path.join(GAME(), rel));
    if (!file.startsWith(path.normalize(GAME()))) return new Response('no', { status:403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  ipcMain.handle('check', () => check());
  ipcMain.handle('update', (e, full) => update(full, p => e.sender.send('progress', p)).then(r => ({ ok:true, ...r }), err => ({ ok:false, error:String(err.message || err) })));
  ipcMain.handle('play', () => openGame());
  ipcMain.handle('folder', () => shell.openPath(GAME()));
  ipcMain.handle('web', () => shell.openExternal(REMOTO));
  ipcMain.handle('win', (e, a) => { const w = BrowserWindow.fromWebContents(e.sender); if (a === 'min') w.minimize(); else if (a === 'close') w.close(); });
  ipcMain.handle('appVersion', () => app.getVersion());
  openLauncher();
});
app.on('window-all-closed', () => app.quit());
