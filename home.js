/* ============================================================================
   Kakera Vault v5 — Inicio (panel), paleta de comandos y barra de estado
   Se apoya en window.MudaeApp (app.js) y window.MudaeCore (core.js).
   ========================================================================== */
(() => {
'use strict';

const A = window.MudaeApp;
const C = window.MudaeCore;
const D = window.mudaeDesktop || null;
const esc = C.escapeHtml;
const norm = C.norm;
const fmt = C.fmtKakera;
const $ = (s, r = document) => r.querySelector(s);

const EXPORT_CMD = '$mmsaty+ri-c+x+ko';

/* ---------------------------------------------------------------- utilidades */
function compact(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + ' M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' k';
  return fmt(n);
}

function metrics() {
  const st = A.getState();
  const chars = st.chars || [];
  let ka = 0, keys = 0, withKeys = 0, pinned = 0;
  const bySeries = new Map();
  for (const c of chars) {
    const k = Number(c.kakera) || 0;
    ka += k;
    const ky = Number(c.keys) || 0;
    keys += ky;
    if (ky > 0) withKeys++;
    if (c.pinned) pinned++;
    const s = bySeries.get(c.series) || { name: c.series, n: 0, ka: 0 };
    s.n++; s.ka += k;
    bySeries.set(c.series, s);
  }
  const top = chars.slice().sort((a, b) => (Number(b.kakera) || 0) - (Number(a.kakera) || 0)).slice(0, 10);
  const series = [...bySeries.values()].sort((a, b) => b.ka - a.ka);
  return { st, chars, ka, keys, withKeys, pinned, top, series, avg: chars.length ? Math.round(ka / chars.length) : 0 };
}

/* ---------------------------------------------------------------- panel de inicio */
function sparkline(points) {
  if (points.length < 2) return '<p class="muted">Vuelve a importar tu harem en otro momento para ver cómo evoluciona tu Kakera.</p>';
  const W = 360, H = 90, pad = 6;
  const min = Math.min(...points.map(p => p.v)), max = Math.max(...points.map(p => p.v));
  const span = max - min || 1;
  const xy = points.map((p, i) => [pad + (i * (W - pad * 2)) / (points.length - 1), H - pad - ((p.v - min) / span) * (H - pad * 2)]);
  const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${xy[xy.length - 1][0].toFixed(1)} ${H} L${xy[0][0].toFixed(1)} ${H} Z`;
  const last = points[points.length - 1], first = points[0];
  const diff = last.v - first.v;
  return `<svg viewBox="0 0 ${W} ${H}" class="home-spark" role="img" aria-label="Evolución del Kakera">
      <path d="${area}" fill="var(--accent-soft)"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${xy.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="var(--accent)"/>`).join('')}
    </svg>
    <div class="home-spark-foot"><span>${esc(new Date(first.at).toLocaleDateString('es-ES'))}</span>
      <b class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${fmt(Math.abs(diff))} ka</b>
      <span>${esc(new Date(last.at).toLocaleDateString('es-ES'))}</span></div>`;
}

function renderHome() {
  const root = $('#tabHome');
  if (!root) return;
  const m = metrics();

  if (!m.chars.length) {
    root.innerHTML = `<div class="home-wrap"><section class="home-hero">
      <div class="home-hero-text"><h1>Bienvenido a Kakera Vault</h1>
      <p>Organiza tu harem de Mudae, genera los comandos para ordenarlo, comparte tu lista y mira las de tus amigos.</p></div>
      <ol class="home-steps">
        <li><b>1</b><div>En Discord ejecuta este comando; Mudae te responde por mensaje directo.
          <div class="home-code"><code>${esc(EXPORT_CMD)}</code><button class="btn small" id="homeCopyCmd">Copiar</button></div></div></li>
        <li><b>2</b><div>Copia desde el primer encabezado de serie hasta el último personaje.</div></li>
        <li><b>3</b><div>Pulsa <b>Importar harem</b> y pega el texto (o arrastra un <code>.txt</code> a la ventana).</div></li>
      </ol>
      <div class="home-actions"><button class="btn primary" id="homeImport">📥 Importar harem</button>
        <button class="btn" id="homeFriends">👥 Ver la lista de un amigo</button></div>
    </section></div>`;
    $('#homeCopyCmd').onclick = () => A.copyText(EXPORT_CMD);
    $('#homeImport').onclick = () => $('#btnOpenImport').click();
    $('#homeFriends').onclick = () => A.switchTab('friends');
    return;
  }

  const maxSeriesKa = Math.max(1, ...m.series.slice(0, 8).map(s => s.ka));
  const hist = (m.st.importHistory || []).filter(h => Number.isFinite(h.ka)).slice().reverse().map(h => ({ at: h.at, v: h.ka }));
  const when = m.st.importedAt ? new Date(m.st.importedAt).toLocaleString('es-ES') : '—';

  root.innerHTML = `<div class="home-wrap">
    <header class="home-head"><div><h1>Inicio</h1><p class="muted">Última importación: ${esc(when)}</p></div>
      <div class="home-actions">
        <button class="btn primary" id="homeImport">📥 Importar harem</button>
        <button class="btn" id="homeExport">📤 Exportar harem</button>
        <button class="btn" id="homeBackup">🧰 Copias de seguridad</button>
      </div></header>

    <section class="home-kpis">
      ${[['Personajes', fmt(m.chars.length), '👤'], ['Series', fmt(m.series.length), '🗂️'], ['Kakera total', compact(m.ka), '💎'],
          ['Promedio por personaje', fmt(m.avg) + ' ka', '📊'], ['Llaves', fmt(m.keys), '🔑'], ['Con llaves', fmt(m.withKeys), '🗝️']]
        .map(([l, v, i]) => `<div class="home-kpi"><span class="ki">${i}</span><div><b>${esc(v)}</b><small>${esc(l)}</small></div></div>`).join('')}
    </section>

    <div class="home-cols">
      <section class="home-card"><h3>🏆 Top 10 por Kakera</h3>
        <ol class="home-top">${m.top.map((c, i) => `
          <li data-open="${esc(c.id)}" title="Abrir ficha">
            <span class="rank">${i + 1}</span>
            <img src="${esc(A.imgSrc(c))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">
            <div class="who"><b>${esc(c.name)}</b><small>${esc(c.series)}</small></div>
            <span class="ka">💎 ${fmt(c.kakera || 0)}</span></li>`).join('')}</ol></section>

      <div class="home-stack">
        <section class="home-card"><h3>📈 Evolución del Kakera</h3>${sparkline(hist)}</section>
        <section class="home-card"><h3>🗂️ Series con más Kakera</h3>
          <div class="home-bars">${m.series.slice(0, 8).map(s => `
            <div class="bar-row" data-series="${esc(s.name)}" title="Ver en la biblioteca">
              <div class="bar-label"><span>${esc(s.name)}</span><small>${s.n} pj · ${fmt(s.ka)} ka</small></div>
              <div class="bar"><i style="width:${Math.max(3, Math.round((s.ka / maxSeriesKa) * 100))}%"></i></div></div>`).join('')}</div></section>
      </div>
    </div></div>`;

  $('#homeImport').onclick = () => $('#btnOpenImport').click();
  $('#homeExport').onclick = () => $('#btnQuickSm').click();
  $('#homeBackup').onclick = () => $('#btnBackups').click();
  root.onclick = (e) => {
    const li = e.target.closest('[data-open]');
    if (li) return A.openEdit(li.dataset.open);
    const row = e.target.closest('[data-series]');
    if (row) {
      const sel = $('#seriesSelect');
      A.switchTab('lib');
      if (sel) { sel.value = row.dataset.series; sel.dispatchEvent(new Event('change')); }
    }
  };
}

/* ---------------------------------------------------------------- barra de estado */
let appVersion = '';
function renderStatus() {
  const bar = $('#statusbar');
  if (!bar) return;
  const m = metrics();
  const prof = ($('#profileName') || {}).textContent || 'Principal';
  const save = $('#saveStatus');
  const saveTxt = save && !save.hidden ? save.textContent : '';
  const saveCls = save ? (save.className.match(/ok|bad|busy/) || [''])[0] : '';
  bar.innerHTML = `<span class="sb-item" title="Perfil activo">👤 ${esc(prof)}</span>
    <span class="sb-item sb-save ${saveCls}">${esc(saveTxt)}</span>
    <span class="sb-grow"></span>
    <span class="sb-item">${fmt(m.chars.length)} personajes</span>
    <span class="sb-item">${fmt(m.series.length)} series</span>
    <span class="sb-item">💎 ${compact(m.ka)} ka</span>
    <span class="sb-grow"></span>
    <span class="sb-item sb-dim">Ctrl+P · acciones</span>
    <span class="sb-item sb-dim">${appVersion ? 'v' + esc(appVersion) : ''}</span>`;
}

/* ---------------------------------------------------------------- paleta de comandos */
const click = (sel) => () => { const el = $(sel); if (el) el.click(); };
const ACTIONS = [
  { t: 'Ir a Inicio', k: 'panel dashboard', i: '🏠', run: () => A.switchTab('home') },
  { t: 'Ir a Biblioteca', k: 'personajes tarjetas', i: '📚', run: () => A.switchTab('lib') },
  { t: 'Ir a Series', k: 'ordenar series', i: '🗂️', run: () => A.switchTab('series') },
  { t: 'Ir a Amigos', k: 'listas amigos importar', i: '👥', run: () => A.switchTab('friends') },
  { t: 'Importar harem', k: 'pegar mmsaty importar', i: '📥', run: click('#btnOpenImport') },
  { t: 'Exportar harem (comandos $sm)', k: 'sm ordenar exportar comandos', i: '📤', run: click('#btnQuickSm') },
  { t: 'Cambiar de perfil', k: 'perfiles servidor cuenta', i: '👤', run: click('#btnProfile') },
  { t: 'Cuenta de Mudae (iniciar sesión)', k: 'login discord imagenes', i: '🔐', run: click('#btnAccounts') },
  { t: 'Estadísticas', k: 'resumen completitud', i: '📊', run: click('#btnStats') },
  { t: 'Duplicados', k: 'repetidos', i: '👯', run: click('#btnDuplicates') },
  { t: 'Copias de seguridad', k: 'backup', i: '🧰', run: click('#btnBackups') },
  { t: 'Historial de comandos', k: 'history', i: '🕘', run: click('#btnCmdHistory') },
  { t: 'Guardar proyecto (.json)', k: 'exportar proyecto', i: '💾', run: click('#btnProjExport') },
  { t: 'Cargar proyecto (.json)', k: 'importar proyecto', i: '📂', run: click('#btnProjImport') },
  { t: 'Configuración', k: 'ajustes tema apariencia', i: '⚙️', run: click('#btnOpenDrawer') },
  { t: 'Ayuda y atajos', k: 'teclado', i: '⌨️', run: click('#btnHelp') }
];

let palItems = [], palIdx = 0;

function openPalette() {
  const back = $('#palette');
  back.hidden = false;
  const input = $('#palInput');
  input.value = '';
  fillPalette('');
  input.focus();
}
function closePalette() { $('#palette').hidden = true; }

function fillPalette(q) {
  const t = norm(q);
  palItems = ACTIONS.filter(a => !t || norm(a.t + ' ' + a.k).includes(t)).map(a => ({ ...a, kind: 'Acción' }));
  if (t.length >= 2) {
    const chars = A.getChars().filter(c => norm(c.name).includes(t) || norm(c.series).includes(t)).slice(0, 8);
    palItems = palItems.concat(chars.map(c => ({
      t: c.name, sub: c.series + (c.kakera ? ' · ' + fmt(c.kakera) + ' ka' : ''), i: '🧑', kind: 'Personaje', run: () => A.openEdit(c.id)
    })));
  }
  palIdx = 0;
  drawPalette();
}

function drawPalette() {
  const list = $('#palList');
  list.innerHTML = palItems.map((a, i) => `<button class="pal-item${i === palIdx ? ' on' : ''}" data-i="${i}">
    <span class="pi">${a.i}</span><span class="pt"><b>${esc(a.t)}</b>${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</span><span class="pk">${a.kind}</span></button>`).join('')
    || '<p class="muted" style="padding:14px">Sin resultados.</p>';
  const on = list.querySelector('.on');
  if (on) on.scrollIntoView({ block: 'nearest' });
}

function runPalette(i) {
  const a = palItems[i];
  if (!a) return;
  closePalette();
  setTimeout(a.run, 30);
}

function setupPalette() {
  const back = document.createElement('div');
  back.className = 'pal-back';
  back.id = 'palette';
  back.hidden = true;
  back.innerHTML = '<div class="pal" role="dialog" aria-label="Paleta de comandos"><input id="palInput" class="pal-in" placeholder="Escribe una acción o busca un personaje o serie…" autocomplete="off" spellcheck="false"><div class="pal-list" id="palList"></div></div>';
  document.body.append(back);
  back.addEventListener('mousedown', (e) => { if (e.target === back) closePalette(); });
  $('#palList').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) runPalette(Number(b.dataset.i)); });
  $('#palInput').addEventListener('input', (e) => fillPalette(e.target.value));
  $('#palInput').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palItems.length - 1, palIdx + 1); drawPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(0, palIdx - 1); drawPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPalette(palIdx); }
  });
  // En fase de captura para que Esc cierre solo la paleta
  document.addEventListener('keydown', (e) => {
    if (!$('#palette').hidden && e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closePalette(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault(); e.stopPropagation();
      if ($('#palette').hidden) openPalette(); else closePalette();
    }
  }, true);
  const nav = $('#btnPaletteNav');
  if (nav) nav.addEventListener('click', openPalette);
}

/* ---------------------------------------------------------------- arranque */
function refresh() {
  renderStatus();
  if (document.body.dataset.tab === 'home') renderHome();
}

function trackLayout() {
  const top = $('.topbar');
  if (!top) return;
  const set = () => document.documentElement.style.setProperty('--topbar-h', top.offsetHeight + 'px');
  set();
  if (window.ResizeObserver) new ResizeObserver(set).observe(top);
}

(async function boot() {
  trackLayout();
  setupPalette();
  if (D && D.getVersion) { try { appVersion = await D.getVersion(); } catch (e) {} }
  document.addEventListener('mudae:render', refresh);
  document.addEventListener('mudae:tab', (e) => { if (e.detail && e.detail.tab === 'home') renderHome(); });
  // El perfil y el estado de guardado se actualizan fuera de render()
  for (const sel of ['#profileName', '#saveStatus']) {
    const el = $(sel);
    if (el) new MutationObserver(renderStatus).observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
  }
  refresh();
})();

})();
