// Sprintz als Desktop-Programm: lädt die Web-App lokal und ergänzt Videoverarbeitung mit FFmpeg.
const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu, net } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto'), { spawn, execFile } = require('child_process'), { pathToFileURL } = require('url');
const unpack = p => p.replace('app.asar', 'app.asar.unpacked');
const FFMPEG = unpack(require('ffmpeg-static'));
const REPO = 'lassedietrich/sprintz';
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 900, minHeight: 640, title: 'Sprintz', backgroundColor: '#EEF4F7', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
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
  permissions(); createWindow(); cleanup(); setTimeout(checkUpdate, 4000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
