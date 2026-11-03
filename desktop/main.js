// Sprintz als Desktop-Programm: lädt die Web-App lokal und ergänzt Videoverarbeitung mit FFmpeg.
const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu, net } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto'), { spawn, execFile } = require('child_process'), { pathToFileURL } = require('url');
const unpack = p => p.replace('app.asar', 'app.asar.unpacked');
const FFMPEG = unpack(require('ffmpeg-static'));
const REPO = 'lassedietrich/sprintz';
const os = require('os');
let win;

// --- Welche Fassung der Web-App läuft? ---
// stable  = aktueller Stand von GitHub Pages (wird bei jedem Start geholt, offline die zuletzt geholte Fassung)
// test    = Test-Zweig "test" auf GitHub (nur Entwicklermodus)
// local   = Datei ~/Sprintz-Test/index.html, die Claude direkt auf den Rechner schreibt (nur Entwicklermodus)
// bundled = die im Installer enthaltene Fassung
const SET_FILE = () => path.join(app.getPath('userData'), 'einstellungen.json');
let SET = { channel: 'stable', dev: false };
const loadSet = () => { try { SET = Object.assign(SET, JSON.parse(fs.readFileSync(SET_FILE(), 'utf8'))); } catch (e) {} };
const saveSet = () => { try { fs.writeFileSync(SET_FILE(), JSON.stringify(SET, null, 1)); } catch (e) {} };
const webDir = () => { const d = path.join(app.getPath('userData'), 'web'); fs.mkdirSync(d, { recursive: true });
  for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) { const a = path.join(__dirname, 'app', f), b = path.join(d, f); try { if (fs.existsSync(a) && !fs.existsSync(b)) fs.copyFileSync(a, b); } catch (e) {} }
  return d; };
const TEST_DIR = () => path.join(os.homedir(), 'Sprintz-Test');
const BUNDLED = () => path.join(__dirname, 'app', 'index.html');
const validHtml = t => typeof t === 'string' && t.length > 100000 && /<html/i.test(t) && /Sprintz/.test(t);
async function fetchText(url, headers, ms) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms || 8000);
  try { const r = await net.fetch(url, { headers: Object.assign({ 'User-Agent': 'Sprintz-Desktop', 'Cache-Control': 'no-cache' }, headers || {}), signal: ac.signal, cache: 'no-store' }); return r.ok ? await r.text() : null; }
  catch (e) { return null; } finally { clearTimeout(to); }
}
let loaded = { channel: 'bundled', note: '' }, watching = null;
async function resolvePage(ch) {
  if (ch === 'local') {
    const f = path.join(TEST_DIR(), 'index.html');
    if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(webDir(), 'local.html')); return { file: path.join(webDir(), 'local.html'), channel: 'local', note: 'Ordner Sprintz-Test, Stand ' + new Date(fs.statSync(f).mtimeMs).toLocaleString('de-DE') }; }
    fs.mkdirSync(TEST_DIR(), { recursive: true });
    dialog.showMessageBox(win, { type: 'info', message: 'Im Ordner Sprintz-Test liegt noch keine Testversion', detail: TEST_DIR() + '\n\nSobald dort eine index.html liegt, lädt Sprintz sie automatisch. Bis dahin läuft die normale Fassung.' });
    return resolvePage('stable');
  }
  if (ch === 'test') {
    const t = await fetchText(`https://api.github.com/repos/${REPO}/contents/index.html?ref=test&t=${Date.now()}`, { Accept: 'application/vnd.github.raw' }, 15000);
    if (validHtml(t)) { const f = path.join(webDir(), 'test.html'); fs.writeFileSync(f, t); return { file: f, channel: 'test', note: 'GitHub-Zweig test, geladen ' + new Date().toLocaleString('de-DE') }; }
    const old = path.join(webDir(), 'test.html');
    if (fs.existsSync(old)) return { file: old, channel: 'test', note: 'GitHub nicht erreichbar, zuletzt geladene Testversion' };
    dialog.showMessageBox(win, { type: 'warning', message: 'Testversion nicht erreichbar', detail: 'Der Test-Zweig auf GitHub konnte nicht geladen werden. Es läuft die normale Fassung.' });
    return resolvePage('stable');
  }
  if (ch === 'stable') {
    const t = await fetchText(`https://lassedietrich.github.io/sprintz/index.html?t=${Date.now()}`, null, 6000), f = path.join(webDir(), 'stable.html');
    if (validHtml(t)) { fs.writeFileSync(f, t); return { file: f, channel: 'stable', note: '' }; }
    if (fs.existsSync(f)) return { file: f, channel: 'stable', note: '' };
  }
  return { file: BUNDLED(), channel: 'bundled', note: '' };
}
async function loadApp() {
  const ch = SET.dev ? SET.channel : 'stable';
  const r = await resolvePage(ch); loaded = r;
  await win.loadFile(r.file).catch(() => {});
  watchLocal(); menu();
}
// Testordner beobachten: schreibt Claude eine neue index.html hinein, lädt Sprintz sofort neu
function watchLocal() {
  if (watching) { fs.unwatchFile(watching); watching = null; }
  if (!(SET.dev && SET.channel === 'local')) return;
  watching = path.join(TEST_DIR(), 'index.html'); let t = null;
  fs.watchFile(watching, { interval: 1000 }, (cur, prev) => { if (cur.mtimeMs !== prev.mtimeMs && cur.size > 100000) { clearTimeout(t); t = setTimeout(loadApp, 800); } });
}
// Deutliches Schild, solange eine Testversion läuft
function badge() {
  if (!win || (loaded.channel !== 'test' && loaded.channel !== 'local')) return;
  const txt = JSON.stringify('TESTVERSION · ' + loaded.note);
  win.webContents.executeJavaScript(`(()=>{ let b=document.getElementById('dskTestBadge'); if(!b){ b=document.createElement('div'); b.id='dskTestBadge'; document.body.appendChild(b); }
    b.textContent=${txt}; b.title='Umschalten im Menü Entwicklung';
    b.style.cssText='position:fixed;left:50%;top:0;transform:translateX(-50%);z-index:2147483647;background:#E8590C;color:#fff;font:600 11px/1.2 system-ui,sans-serif;padding:4px 12px;border-radius:0 0 8px 8px;pointer-events:none;letter-spacing:.04em;box-shadow:0 2px 6px rgba(0,0,0,.25)'; })()`).catch(() => {});
}
function setChannel(ch) { SET.channel = ch; saveSet(); loadApp(); }
function menu() {
  const isMac = process.platform === 'darwin';
  const view = { label: 'Darstellung', submenu: [
    { label: 'Neu laden', accelerator: 'CmdOrCtrl+R', click: () => loadApp() },
    { type: 'separator' }, { role: 'resetZoom', label: 'Originalgröße' }, { role: 'zoomIn', label: 'Vergrößern' }, { role: 'zoomOut', label: 'Verkleinern' },
    { type: 'separator' }, { role: 'togglefullscreen', label: 'Vollbild' }] };
  const t = [];
  if (isMac) t.push({ role: 'appMenu' });
  else t.push({ label: 'Datei', submenu: [{ role: 'quit', label: 'Beenden' }] });
  t.push({ role: 'editMenu', label: 'Bearbeiten' }, view);
  if (SET.dev) {
    const r = (id, label) => ({ label, type: 'radio', checked: SET.channel === id, click: () => setChannel(id) });
    t.push({ label: 'Entwicklung', submenu: [
      r('stable', 'Normale Fassung (GitHub Pages)'), r('test', 'Testversion: GitHub-Zweig test'), r('local', 'Testversion: Ordner Sprintz-Test'), r('bundled', 'Fassung aus dem Installer'),
      { type: 'separator' },
      { label: 'Ordner Sprintz-Test öffnen', click: () => { fs.mkdirSync(TEST_DIR(), { recursive: true }); shell.openPath(TEST_DIR()); } },
      { label: 'Entwicklerwerkzeuge', accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I', click: () => win && win.webContents.toggleDevTools() },
      { type: 'separator' },
      { label: 'Aktuell: ' + ({ stable: 'normale Fassung', test: 'Testversion GitHub', local: 'Testversion Ordner', bundled: 'Fassung aus dem Installer' }[loaded.channel] || loaded.channel), enabled: false }] });
  }
  t.push({ role: 'windowMenu', label: 'Fenster' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}
ipcMain.handle('set-dev', (e, on) => { if (on && !SET.dev) { SET.dev = true; saveSet(); menu(); } return SET.dev; });
ipcMain.handle('channel', () => ({ channel: loaded.channel, note: loaded.note }));

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 900, minHeight: 640, title: 'Sprintz', backgroundColor: '#EEF4F7', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', badge);
  loadApp();
  // Externe Links im Browser öffnen, PDFs und interne Fenster in der App
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 1100, title: 'Sprintz' } };
  });
}

// Kamera und Mikrofon für das Filmen in der App erlauben, sonst nichts
function permissions() {
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'fullscreen', 'clipboard-sanitized-write'].includes(perm)));
}

// Video untersuchen (mit FFmpeg selbst): Bildrate, Auflösung, Codec, Dauer
ipcMain.handle('probe', async (e, file) => new Promise((resolve) => {
  execFile(FFMPEG, ['-hide_banner', '-i', file], { maxBuffer: 4e6 }, (err, out, errOut) => {
    const t = String(errOut || ''), v = t.match(/Stream #\d+:\d+[^\n]*?: Video: (\w+)[^\n]*?, (\d{2,5})x(\d{2,5})[^\n]*/);
    if (!v) return resolve(null);
    const line = v[0], fps = (line.match(/([\d.]+) fps/) || [])[1], tbr = (line.match(/([\d.]+) tbr/) || [])[1], d = t.match(/Duration: (\d+):(\d+):([\d.]+)/);
    const f = +fps || +tbr || null;
    resolve({ codec: v[1], width: +v[2], height: +v[3], fps: f ? Math.round(f * 1000) / 1000 : null, duration: d ? (+d[1]) * 3600 + (+d[2]) * 60 + (+d[3]) : null });
  });
}));

// Arbeitskopie für bildgenaues Arbeiten: jedes Bild ein Schlüsselbild (sofortige, exakte Sprünge), hohe Qualität, Zeitstempel unverändert
const proxyDir = () => { const d = path.join(app.getPath('userData'), 'arbeitskopien'); fs.mkdirSync(d, { recursive: true }); return d; };
const running = new Map();
ipcMain.handle('proxy', async (e, file) => {
  const st = fs.statSync(file), key = crypto.createHash('sha1').update(file + '|' + st.size + '|' + st.mtimeMs).digest('hex').slice(0, 20);
  const out = path.join(proxyDir(), key + '.mp4');
  if (fs.existsSync(out) && fs.statSync(out).size > 1000) { fs.utimesSync(out, new Date(), new Date()); return { url: pathToFileURL(out).href, cached: true }; }
  if (running.has(out)) return running.get(out);
  const job = new Promise((resolve) => {
    const tmp = out + '.part.mp4', dur = { v: null };
    const args = ['-y', '-hide_banner', '-i', file, '-map', '0:v:0', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-g', '1', '-bf', '0', '-pix_fmt', 'yuv420p',
      '-vf', "scale='min(1920,iw)':-2", '-fps_mode', 'passthrough',
      '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', tmp];
    const p = spawn(FFMPEG, args);
    p.stderr.on('data', d => {
      const s = d.toString(), m = s.match(/Duration: (\d+):(\d+):([\d.]+)/); if (m) dur.v = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
      const t = [...s.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
      if (t && dur.v) { const sec = (+t[1]) * 3600 + (+t[2]) * 60 + (+t[3]); e.sender.send('proxy-progress', { file, p: Math.min(1, sec / dur.v) }); }
    });
    p.on('close', code => { running.delete(out); if (code === 0) { fs.renameSync(tmp, out); resolve({ url: pathToFileURL(out).href }); } else { try { fs.unlinkSync(tmp); } catch (x) {} resolve(null); } });
    p.on('error', () => { running.delete(out); resolve(null); });
  });
  running.set(out, job); return job;
});

// Alte Arbeitskopien aufräumen (älter als 14 Tage oder mehr als 8 GB)
function cleanup() {
  try {
    const d = proxyDir(), files = fs.readdirSync(d).map(f => { const p = path.join(d, f), s = fs.statSync(p); return { p, t: s.mtimeMs, z: s.size }; }).sort((a, b) => b.t - a.t);
    let total = 0; const now = Date.now();
    for (const f of files) { total += f.z; if (now - f.t > 14 * 864e5 || total > 8e9 || f.p.endsWith('.part.mp4')) fs.unlinkSync(f.p); }
  } catch (e) {}
}

// Dateien (PDF, Projektdatei, Video) speichern und öffnen
ipcMain.handle('save-file', async (e, name, data) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('downloads'), name) });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, Buffer.from(data));
  if (/\.pdf$/i.test(r.filePath)) shell.openPath(r.filePath); else shell.showItemInFolder(r.filePath);
  return true;
});
ipcMain.handle('version', () => app.getVersion());
ipcMain.handle('open-external', (e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

// Neue Version? Hinweis mit Link zur Download-Seite
async function checkUpdate() {
  try {
    const r = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'Sprintz-Desktop' } });
    if (!r.ok) return; const j = await r.json(), latest = String(j.tag_name || '').replace(/^v/, '');
    const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return true; if ((x[i] || 0) < (y[i] || 0)) return false; } return false; };
    if (latest && newer(latest, app.getVersion())) {
      const c = await dialog.showMessageBox(win, { type: 'info', buttons: ['Herunterladen', 'Später'], defaultId: 0, message: `Sprintz ${latest} ist verfügbar`, detail: `Du nutzt Version ${app.getVersion()}. Die neue Version kannst du jetzt herunterladen und installieren.` });
      if (c.response === 0) shell.openExternal(j.html_url);
    }
  } catch (e) {}
}

app.whenReady().then(() => {
  loadSet(); permissions(); createWindow(); cleanup(); setTimeout(checkUpdate, 4000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
