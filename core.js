/* ============================================================================
   Núcleo puro del Gestor de Colección Mudae (v4)
   ----------------------------------------------------------------------------
   Utilidades SIN dependencias del DOM ni del estado de la aplicación:
     · formato genérico (fechas, números, escape, colores),
     · normalización de texto y nombres,
     · parser robusto de las exportaciones de Mudae ($mmsaty+z+ri-c+x+ko),
     · constructores de comandos ($sm y $divorce).

   Se carga como script clásico ANTES de app.js (nada de módulos ES, para que
   siga funcionando también desde file://). Expone todo en window.MudaeCore.
   ========================================================================== */
(() => {
'use strict';

/* ---------- formato y utilidades genéricas ---------- */
const debounce = (fn, ms) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtKakera = (n) => (n === null || n === undefined || !Number.isFinite(Number(n))) ? '0' : Number(n).toLocaleString('es-ES');
const dateStamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hexToRgba(hex, alpha = 0.22) {
  const m = String(hex || '').replace('#', '');
  if (m.length !== 6) return `rgba(139,92,246,${alpha})`;
  const r = parseInt(m.slice(0, 2), 16) || 0;
  const g = parseInt(m.slice(2, 4), 16) || 0;
  const b = parseInt(m.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function adjustHexBg(hex, delta) {
  const m = String(hex || '').replace('#', '');
  if (m.length !== 6) return '#161920';
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const r = clamp((parseInt(m.slice(0, 2), 16) || 0) + delta);
  const g = clamp((parseInt(m.slice(2, 4), 16) || 0) + delta);
  const b = clamp((parseInt(m.slice(4, 6), 16) || 0) + delta);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------- lógica pura y parser robusto ---------- */
function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

// Emojis de llave de Mudae: :key:, :bronzekey:, :silverkey:, :goldkey:,
// :chaoskey:, :soulkey:, sus formatos custom <:bronzekey:123> y el emoji 🔑.
const KEY_TOKEN_SRC = '(?:<a?:(?:key|bronzekey|silverkey|goldkey|chaoskey|soulkey):\\d+>|:(?:key|bronzekey|silverkey|goldkey|chaoskey|soulkey):|🔑|🗝️)';

function keyTokenRe(flags = 'gi') {
  return new RegExp(KEY_TOKEN_SRC, flags);
}

// Devuelve la cantidad de llaves y el texto sin tokens ni contadores de llaves.
// Formatos: "🔑 (3)", ":bronzekey:  (1)", ":silverkey: (2) :bronzekey: (1)",
// "<:goldkey:123> (4)" o tokens sueltos sin contador (cada uno vale 1).
function extractKeyInfo(text) {
  let out = String(text || '');
  let keys = 0;
  const add = n => { keys += Math.max(0, Number(String(n).replace(/[^\d]/g, '')) || 0); };

  out = out.replace(new RegExp('(' + KEY_TOKEN_SRC + ')\\s*\\(\\s*([\\d.,]+)\\s*\\)', 'gi'), (_, _token, count) => {
    add(count);
    return ' ';
  });
  out = out.replace(new RegExp('(' + KEY_TOKEN_SRC + ')\\s*([\\d.,]+)\\b', 'gi'), (_, _token, count) => {
    add(count);
    return ' ';
  });
  out = out.replace(keyTokenRe('gi'), () => {
    keys += 1;
    return ' ';
  });

  return { keys, text: out };
}

function cleanCharName(raw) {
  return String(raw || '')
    .replace(/🚫/g, '')
    .replace(/^[-•·*\s]*#[\d.,]+\s*(?:-\s*)?/, '')
    .replace(/\s*(?:💞|💕|❤️|♥️)?\s*=>\s*.*$/, '')
    .replace(keyTokenRe('gi'), '')
    .replace(/^[·•|\-\s]+|[·•|\-\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanNoteText(raw) {
  return String(raw || '')
    .replace(keyTokenRe('gi'), ' ')
    .replace(/^[·•|\s]+|[·•|\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTag(raw) {
  return String(raw || '')
    .replace(/[,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

function parseTags(raw) {
  const out = [];
  const seen = new Set();
  for (const part of String(raw || '').split(/[,;]+/)) {
    const t = cleanTag(part);
    const k = norm(t);
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.slice(0, 12);
}

function makeId(series, name) { return norm(series) + '::' + norm(cleanCharName(name)); }

function normalizeImageUrl(url) {
  const m = String(url).match(/^https?:\/\/(?:www\.)?imgur\.com\/([A-Za-z0-9]+\.(?:gif|png|jpe?g|webp))(\?.*)?$/i);
  return m ? 'https://i.imgur.com/' + m[1] : String(url);
}

function extractMudaeId(urlOrText) {
  const m = String(urlOrText || '').match(/(?:\/uploads\/|\/character\/)(\d+)(?:\/|$)/i);
  return m ? m[1] : null;
}

function parseExport(text) {
  const rawLines = String(text).replace(/\r\n?/g, '\n').split('\n');
  // Unir líneas partidas cuando el nombre está arriba y "=> usuario ... https://..." abajo
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i].trim();
    if (!cur) continue;
    const next = (rawLines[i + 1] || '').trim();
    if (
      !/https?:\/\/\S+$/i.test(cur) &&
      !/^(.+?)\s+-\s+(\d+)\s*\/\s*(\d+)\s*$/.test(cur) &&
      /^(?:💞|💕|❤️|♥️)?\s*=>/.test(next) &&
      /https?:\/\/\S+$/i.test(next)
    ) {
      lines.push(cur + ' ' + next);
      i++;
    } else {
      lines.push(cur);
    }
  }

  const chars = [];
  const series = [];
  const skipped = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const head = !/https?:\/\/\S+$/i.test(line) && line.match(/^(.+?)\s+-\s+(\d+)\s*\/\s*(\d+)\s*$/);
    if (head) {
      current = {
        name: head[1].trim(),
        owned: Number(head[2]),
        total: Number(head[3]),
        count: 0,
      };
      series.push(current);
      continue;
    }

    // El enlace de la imagen puede venir entre < > (p. ej. «- <https://mudae.net/…png>»)
    const urlMatch = line.match(/^(.*?)\s+-\s+<?(https?:\/\/[^\s<>]+)>?\s*$/i);
    if (urlMatch) {
      let left = urlMatch[1].trim();
      // Ranking de claim (#N, flag «r» de Mudae) y personaje desactivado (🚫)
      const rankM = left.replace(/🚫/g, '').match(/^[-•·*\s]*#([\d.,]+)/);
      const rank = rankM ? (Number(rankM[1].replace(/\D/g, '')) || null) : null;
      const disabled = /🚫/.test(left);
      const right = urlMatch[2].trim();

      // Quitar guion o ranking inicial ("- #3.434Marvelous Sunday" o "#123 - Nombre")
      left = left.replace(/^[-•·*\s]*#[\d.,]+\s*(?:-\s*)?/, '').trim();

      // Quitar formato Markdown de Discord (**negrita**, __subrayado__) que rompe el reconocimiento
      left = left.replace(/\*\*|__/g, '').trim();

      // Extraer Kakera ANTES de limpiar casados (el "=> ..." borraba todo lo que iba después).
      let kakera = null;
      const NUM = '(\\d[\\d.,]*)';
      const KA_UNIT = '(?:ka\\b|kakera\\b|<a?:\\w*kakera\\w*:\\d+>|:\\w*kakera\\w*:)';
      const kaAfter = [...left.matchAll(new RegExp(NUM + '\\s*' + KA_UNIT, 'gi'))];
      const kaBefore = [...left.matchAll(new RegExp('<a?:\\w*kakera\\w*:\\d+>\\s*' + NUM, 'gi'))];
      const kaMatch = kaAfter.length ? kaAfter[kaAfter.length - 1]
        : (kaBefore.length ? kaBefore[kaBefore.length - 1] : null);
      if (kaMatch) {
        const digits = kaMatch[1].replace(/\D/g, '');
        if (digits) kakera = Number(digits);
        left = (left.slice(0, kaMatch.index) + ' ' + left.slice(kaMatch.index + kaMatch[0].length)).trim();
      }

      // Esferas ("1.200 sp", flag «z» de Mudae). Es un campo opcional: solo aparece si se pidió.
      let spheres = null;
      const spAll = [...left.matchAll(/(\d[\d.,]*)\s*sp\b/gi)];
      if (spAll.length) {
        const sm = spAll[spAll.length - 1];
        const sd = sm[1].replace(/\D/g, '');
        if (sd) spheres = Number(sd);
        left = (left.slice(0, sm.index) + ' ' + left.slice(sm.index + sm[0].length)).trim();
        // Algunas salidas añaden los beneficios tras las esferas ("… sp - 10 - url"): no forman parte del nombre
        const perkM = left.match(/\s+-\s+([A-Za-z0-9%+]{1,12})$/);
        if (perkM) left = left.slice(0, perkM.index).trim();
      }

      // Formato "NOMBRE   => dueño | nota · ($wa) · (llaves) (#HEX)"
      let forcedNote = null;
      const arrow = left.match(/^(.*?)\s*(?:💞|💕|❤️|♥️)?\s*=>\s*\S*\s*(.*)$/);
      if (arrow) {
        const tail = arrow[2].replace(/^[^|·]*/, '');
        const pm = tail.match(/^\|\s*([\s\S]*?)\s*·\s*\(\s*\$[^)]*\)([\s\S]*)$/);
        if (pm) {
          forcedNote = pm[1];
          left = (arrow[1] + ' ' + pm[2]).trim();
        } else {
          left = (arrow[1] + ' ' + tail).trim();
        }
      }

      // Extraer Color HEX (#HEX)
      let embedColor = '';
      const colMatch = left.match(/\(\s*(#[0-9a-f]{6})\s*\)/i);
      if (colMatch) {
        embedColor = colMatch[1].toUpperCase();
        left = left.replace(colMatch[0], '').trim();
      }

      // Extraer Llaves (bronce, plata, oro, caos, alma, etc.)
      const keyInfo = extractKeyInfo(left);
      let keys = keyInfo.keys;
      left = keyInfo.text.trim();

      left = left.replace(/\(\s*\$[^)]*\)/g, '').trim();
      left = left.replace(/(?:\s*[·•|]\s*)+$/g, '').trim();

      // Separar nombre y nota con "|"
      let name = left;
      let note = '';
      const barIdx = left.indexOf('|');
      if (barIdx >= 0) {
        name = left.slice(0, barIdx);
        note = left.slice(barIdx + 1);
      } else {
        const dotIdx = left.indexOf('·');
        if (dotIdx > 0 && !left.includes('=>')) {
          name = left.slice(0, dotIdx);
          note = left.slice(dotIdx + 1);
        }
      }

      name = cleanCharName(name);
      if (forcedNote !== null) note = forcedNote;
      note = cleanNoteText(note);
      if (!Number.isFinite(kakera)) kakera = null;

      if (name) {
        const seriesName = current ? current.name : 'Sin serie';
        if (current) current.count++;
        const imgUrl = normalizeImageUrl(right);
        const mudaeId = extractMudaeId(imgUrl);
        chars.push({
          id: makeId(seriesName, name),
          name,
          note,
          origNote: note,
          kakera,
          keys,
          embedColor,
          origColor: embedColor,
          pinned: false,
          series: seriesName,
          image: imgUrl,
          seriesTotal: current ? current.total : null,
          mudaeId,
          rank,
          disabled,
          spheres,
        });
        continue;
      }
    }

    skipped.push({ line: i + 1, text: line.slice(0, 160) });
  }

  return { chars, series, skipped };
}

function buildSmBlocks(names, limit = 1800) {
  const blocks = [];
  let cur = [];
  let anchor = null;

  const flush = () => {
    if (!cur.length) return;
    const body = cur.join(' $ ');
    blocks.push(anchor ? '$smpos ' + anchor + ' $ ' + body : '$sm ' + body);
    anchor = cur[cur.length - 1];
    cur = [];
  };

  for (const raw of names) {
    const name = cleanCharName(raw);
    if (!name) continue;
    const prefix = anchor ? '$smpos ' + anchor + ' $ ' : '$sm ';
    const joined = cur.concat(name).join(' $ ');
    if (cur.length && prefix.length + joined.length > limit) flush();
    cur.push(name);
  }
  flush();
  return blocks;
}

// Comando de divorcio: $divorce nombre1 $ nombre2 $ ...
// Se divide en bloques para no superar el límite de caracteres de Discord.
function buildDivorceBlocks(names, limit = 1800) {
  const blocks = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    blocks.push('$divorce ' + cur.join(' $ '));
    cur = [];
  };
  for (const raw of names) {
    const name = cleanCharName(raw);
    if (!name) continue;
    const joined = cur.concat(name).join(' $ ');
    if (cur.length && ('$divorce ' + joined).length > limit) flush();
    cur.push(name);
  }
  flush();
  return blocks;
}

// Comando de Discord que exporta el harem: series, ruletas, llaves, ranking de claim,
// color, desactivados, Kakera, dueño y esferas (z+).
const EXPORT_COMMAND = '$mmsaty+z+ri-c+x+ko';
function exportCommand() { return EXPORT_COMMAND; }

/* ---------- API pública del núcleo ---------- */
window.MudaeCore = {
  debounce, fmtKakera, dateStamp, escapeHtml, hexToRgba, adjustHexBg,
  norm, keyTokenRe, extractKeyInfo, cleanCharName, cleanNoteText, cleanTag,
  parseTags, makeId, normalizeImageUrl, extractMudaeId, parseExport,
  buildSmBlocks, buildDivorceBlocks, exportCommand
};

})();
