'use strict';

/* ============================================================================
   Kakera Vault v5 — proceso principal de Electron
   ----------------------------------------------------------------------------
   · Ventana propia (recuerda tamaño y posición).
   · Biblioteca: IndexedDB interna + copia .json automática en
     Documentos/Kakera Vault (la activa v5.js en el primer arranque).
   · Datos extra de v5 (wishlist, intercambio, amigos): kv-extra.json
     en la carpeta de datos de la app.
   ========================================================================== */

const { app, BrowserWindow, shell, ipcMain, dialog, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_TITLE = 'Kakera Vault';

/* ---------- Modo portable ----------
   La versión portable (electron-builder) expone la carpeta del .exe en
   PORTABLE_EXECUTABLE_DIR. Todos los datos (colección, sesión de Mudae,
   perfiles, copias) viven en «Kakera Vault Datos» junto al .exe: si lo copias
   a otro PC o a un USB, tus datos van con él. Si esa carpeta no es escribible,
   se usa la carpeta de datos normal de Windows. */
const PORTABLE_DIR = process.env.PORTABLE_EXECUTABLE_DIR || '';
let IS_PORTABLE = false;
let DATA_ROOT = '';

(function setupDataRoot() {
  const legacy = app.getPath('userData');
  if (PORTABLE_DIR && app.isPackaged) {
    try {
      const root = path.join(PORTABLE_DIR, 'Kakera Vault Datos');
      const appData = path.join(root, 'app');
      const firstRun = !fs.existsSync(appData);
      fs.mkdirSync(path.join(root, 'copias'), { recursive: true });
      fs.accessSync(root, fs.constants.W_OK);
      // Primera vez: se traen los datos que ya existían en la carpeta normal de Windows
      if (firstRun && fs.existsSync(legacy)) {
        const skip = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Crashpad', 'lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']);
        try { fs.cpSync(legacy, appData, { recursive: true, filter: (src) => !skip.has(path.basename(src)) }); } catch (e) { /* se empieza de cero */ }
      }
      fs.mkdirSync(appData, { recursive: true });
      app.setPath('userData', appData);
      app.setPath('sessionData', appData);
      DATA_ROOT = root;
      IS_PORTABLE = true;
    } catch (e) { IS_PORTABLE = false; }
  }
  if (!IS_PORTABLE) DATA_ROOT = legacy;
})();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;
  const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
  const extraFile = () => path.join(app.getPath('userData'), 'kv-extra.json');
  const docsDir = () => (IS_PORTABLE ? path.join(DATA_ROOT, 'copias') : path.join(app.getPath('documents'), 'Kakera Vault'));

  function loadWindowState() {
    try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch (e) { return {}; }
  }
  function saveWindowState() {
    if (!win || win.isDestroyed()) return;
    try {
      const b = win.getNormalBounds();
      fs.writeFileSync(stateFile(), JSON.stringify({ ...b, max: win.isMaximized() }));
    } catch (e) {}
  }

  function createWindow() {
    const st = loadWindowState();
    win = new BrowserWindow({
      width: st.width || 1360,
      height: st.height || 900,
      x: Number.isFinite(st.x) ? st.x : undefined,
      y: Number.isFinite(st.y) ? st.y : undefined,
      minWidth: 960,
      minHeight: 620,
      backgroundColor: '#0f1115',
      title: APP_TITLE,
      icon: path.join(__dirname, 'icons', 'icon-512.png'),
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        spellcheck: false
      }
    });

    win.setMenu(Menu.buildFromTemplate([
      { label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir' }] },
      { label: 'Ver', submenu: [
        { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { role: 'resetZoom', label: 'Tamaño normal' },
        { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' },
        { type: 'separator' }, { role: 'reload', label: 'Recargar' }, { role: 'toggleDevTools', label: 'Herramientas de desarrollo' }
      ] }
    ]));
    if (st.max) win.maximize();
    win.once('ready-to-show', () => win.show());
    win.loadFile('index.html');
    win.on('close', saveWindowState);

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (url.startsWith('file://')) return;
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    });

    win.on('closed', () => { win = null; });
  }

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  /* ---------- Red: sesión de Mudae sin proxy CORS ----------
     La sesión de mudae.net (iniciada en la ventana de login) queda guardada en
     la sesión por defecto de la app. Para las peticiones que hace la propia app
     hacia mudae.net se adjuntan esas cookies y se permite la lectura (CORS),
     de modo que ya no hace falta ningún proxy y se ven las imágenes que exigen
     cuenta. Solo afecta a mudae.net y solo a la ventana principal. */
  const MUDAE_URLS = ['https://mudae.net/*', 'https://*.mudae.net/*'];

  function setupNetwork() {
    const ses = session.defaultSession;
    const fromMain = (d) => win && !win.isDestroyed() && d.webContentsId === win.webContents.id;

    ses.webRequest.onBeforeSendHeaders({ urls: MUDAE_URLS }, async (d, cb) => {
      const headers = d.requestHeaders;
      try {
        if (fromMain(d)) {
          const cookies = await ses.cookies.get({ url: d.url });
          if (cookies.length) headers['Cookie'] = cookies.map(c => c.name + '=' + c.value).join('; ');
        }
      } catch (e) { /* sin cookies: petición anónima */ }
      cb({ requestHeaders: headers });
    });

    ses.webRequest.onHeadersReceived({ urls: MUDAE_URLS }, (d, cb) => {
      const headers = d.responseHeaders || {};
      if (fromMain(d)) {
        for (const k of Object.keys(headers)) if (k.toLowerCase() === 'access-control-allow-origin') delete headers[k];
        headers['Access-Control-Allow-Origin'] = ['*'];
      }
      cb({ responseHeaders: headers });
    });
  }

  app.whenReady().then(() => {
    setupNetwork();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  /* ---------- IPC ---------- */
  const fail = (e) => ({ ok: false, error: String((e && e.message) || e) });

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:paths', () => ({
    userData: app.getPath('userData'),
    root: DATA_ROOT,
    portable: IS_PORTABLE,
    docs: docsDir(),
    defaultBackup: path.join(docsDir(), 'coleccion-kakera-vault.json')
  }));

  ipcMain.handle('dialog:choose-data-file', async (_e, defaultName) => {
    const res = await dialog.showSaveDialog(win, {
      title: 'Elegir archivo de copia de seguridad',
      defaultPath: defaultName || 'coleccion-kakera-vault.json',
      filters: [{ name: 'Datos JSON', extensions: ['json'] }]
    });
    return res.canceled ? null : res.filePath;
  });

  // Guardar un archivo pidiendo la ruta (perfil compartido, .html, .txt…)
  ipcMain.handle('dialog:save-as', async (_e, opts) => {
    try {
      const o = opts || {};
      const res = await dialog.showSaveDialog(win, {
        title: o.title || 'Guardar archivo',
        defaultPath: o.defaultName || 'archivo.txt',
        filters: o.filters || [{ name: 'Todos', extensions: ['*'] }]
      });
      if (res.canceled || !res.filePath) return { ok: false, canceled: true };
      await fs.promises.writeFile(res.filePath, String(o.text || ''), 'utf8');
      return { ok: true, path: res.filePath };
    } catch (e) { return fail(e); }
  });

  // Abrir uno o varios archivos de texto
  ipcMain.handle('dialog:open-files', async (_e, opts) => {
    try {
      const o = opts || {};
      const res = await dialog.showOpenDialog(win, {
        title: o.title || 'Abrir archivo',
        properties: ['openFile', ...(o.multi ? ['multiSelections'] : [])],
        filters: o.filters || [{ name: 'Todos', extensions: ['*'] }]
      });
      if (res.canceled) return { ok: false, canceled: true };
      const files = [];
      for (const p of res.filePaths) {
        files.push({ path: p, name: path.basename(p), text: await fs.promises.readFile(p, 'utf8') });
      }
      return { ok: true, files };
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('file:write', async (_e, filePath, text) => {
    try {
      if (!filePath) return { ok: false, error: 'sin ruta' };
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      const tmp = filePath + '.tmp'; // escritura atómica
      await fs.promises.writeFile(tmp, text, 'utf8');
      await fs.promises.rename(tmp, filePath);
      return { ok: true };
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('file:read', async (_e, filePath) => {
    try { return { ok: true, text: await fs.promises.readFile(filePath, 'utf8') }; }
    catch (e) { return fail(e); }
  });

  // Copia diaria rotativa (una por día y perfil, se conservan las 7 últimas)
  ipcMain.handle('backup:daily', async (_e, prefix, text) => {
    try {
      const pre = String(prefix || 'coleccion').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'coleccion';
      const dir = path.join(docsDir(), 'diarias');
      await fs.promises.mkdir(dir, { recursive: true });
      const day = new Date().toISOString().slice(0, 10);
      const file = path.join(dir, pre + '-' + day + '.json');
      if (fs.existsSync(file)) return { ok: true, created: false };
      await fs.promises.writeFile(file + '.tmp', String(text), 'utf8');
      await fs.promises.rename(file + '.tmp', file);
      const re = new RegExp('^' + pre + '-[0-9]{4}-[0-9]{2}-[0-9]{2}[.]json$');
      const mine = (await fs.promises.readdir(dir)).filter(n => re.test(n)).sort().reverse();
      for (const old of mine.slice(7)) await fs.promises.rm(path.join(dir, old), { force: true });
      return { ok: true, created: true, path: file };
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('file:open-folder', async (_e, dir) => {
    try { const r = await shell.openPath(String(dir || DATA_ROOT)); return { ok: !r, error: r }; }
    catch (e) { return fail(e); }
  });

  ipcMain.handle('file:reveal', async (_e, filePath) => {
    try { if (filePath) shell.showItemInFolder(filePath); return { ok: true }; }
    catch (e) { return { ok: false }; }
  });

  /* ---------- Cuenta de Mudae ---------- */
  function openLoginWindow(url, partition, onUrl) {
    return new Promise((resolve) => {
      const w = new BrowserWindow({
        parent: win || undefined, width: 560, height: 780, title: 'Iniciar sesión',
        autoHideMenuBar: true, backgroundColor: '#ffffff', show: false,
        webPreferences: { partition, contextIsolation: true, nodeIntegration: false, sandbox: true }
      });
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); if (!w.isDestroyed()) w.close(); } };
      w.removeMenu();
      // Los pop-ups (p. ej. OAuth de Discord) se cargan en la misma ventana
      w.webContents.setWindowOpenHandler(({ url: u }) => { if (/^https:/i.test(u)) w.loadURL(u); return { action: 'deny' }; });
      if (onUrl) {
        const check = (_e, u) => { const r = onUrl(u); if (r) finish(r); };
        w.webContents.on('will-redirect', check);
        w.webContents.on('will-navigate', check);
      }
      w.on('closed', () => finish({ ok: false, closed: true }));
      // Las redirecciones de login abortan la carga inicial (ERR_ABORTED = -3): es normal.
      // Solo se avisa de fallos reales y la ventana se queda abierta para que el usuario lo vea.
      w.webContents.on('did-fail-load', (_e, code, desc, failedUrl, isMain) => {
        if (!isMain || code === -3) return;
        const html = '<body style="font:15px system-ui;padding:24px"><h3>No se pudo cargar la página</h3><p>' +
          String(desc).replace(/[<>&]/g, '') + '</p><p>Comprueba tu conexión y cierra esta ventana para reintentar.</p></body>';
        w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      });
      w.once('ready-to-show', () => w.show());
      w.loadURL(url).catch(() => { /* gestionado en did-fail-load */ });
    });
  }

  ipcMain.handle('mudae:login', async () => {
    await openLoginWindow('https://mudae.net/login', undefined);
    return mudaeStatus();
  });

  async function mudaeStatus() {
    try {
      const ses = session.defaultSession;
      const cookies = await ses.cookies.get({ domain: 'mudae.net' });
      let loggedIn = false;
      if (cookies.length) {
        // Con sesión, /login ya no muestra el formulario («Log in with Discord»)
        const r = await ses.fetch('https://mudae.net/login', { credentials: 'include' });
        const html = await r.text();
        loggedIn = r.ok && !/log in with discord|type=["']password["']/i.test(html);
      }
      return { ok: true, cookies: cookies.length, loggedIn };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  ipcMain.handle('mudae:status', mudaeStatus);

  ipcMain.handle('mudae:logout', async () => {
    try {
      const ses = session.defaultSession;
      await ses.clearStorageData({ origin: 'https://mudae.net' });
      for (const c of await ses.cookies.get({ domain: 'mudae.net' })) {
        await ses.cookies.remove('https://mudae.net' + (c.path || '/'), c.name);
      }
      return { ok: true };
    } catch (e) { return fail(e); }
  });

  /* ---------- Perfiles (un archivo JSON por perfil en la carpeta de datos) ---------- */
  const profilesDir = () => path.join(app.getPath('userData'), 'profiles');
  const profileFile = (id) => {
    if (!/^[a-z0-9-]{1,40}$/.test(String(id))) throw new Error('id de perfil no válido');
    return path.join(profilesDir(), id + '.json');
  };
  ipcMain.handle('profile:read', async (_e, id) => {
    try { return { ok: true, text: await fs.promises.readFile(profileFile(id), 'utf8') }; }
    catch (e) { return { ok: false, error: String((e && e.code) || e) }; }
  });
  ipcMain.handle('profile:write', async (_e, id, text) => {
    try {
      await fs.promises.mkdir(profilesDir(), { recursive: true });
      const f = profileFile(id);
      await fs.promises.writeFile(f + '.tmp', String(text), 'utf8');
      await fs.promises.rename(f + '.tmp', f);
      return { ok: true };
    } catch (e) { return fail(e); }
  });
  ipcMain.handle('profile:delete', async (_e, id) => {
    try { await fs.promises.rm(profileFile(id), { force: true }); return { ok: true }; }
    catch (e) { return fail(e); }
  });

  ipcMain.handle('store:read', async () => {
    try { return { ok: true, text: await fs.promises.readFile(extraFile(), 'utf8') }; }
    catch (e) { return { ok: false, error: String((e && e.code) || e) }; }
  });
  ipcMain.handle('store:write', async (_e, text) => {
    try {
      const tmp = extraFile() + '.tmp';
      await fs.promises.writeFile(tmp, String(text), 'utf8');
      await fs.promises.rename(tmp, extraFile());
      return { ok: true };
    } catch (e) { return fail(e); }
  });
}
