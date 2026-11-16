# 💎 Kakera Vault — v5

Aplicación de **escritorio para PC** (Windows) para gestionar tu colección (harem) de
[Mudae](https://mudae.net): importa, ordena, edita en lote, genera comandos para Discord,
**comparte tu lista** y **mira la de tus amigos**. Todo se guarda en tu equipo: sin servidor, sin cuentas propias, sin enviar datos a terceros.

## 🚀 Ejecutarla en local

Requisitos: [Node.js](https://nodejs.org) 18 o superior y Windows 10/11.

```bash
git clone <url-del-repo>
cd <carpeta>
npm install      # descarga Electron (una sola vez)
npm start        # abre la app
```

Si `npm install` no descarga el binario de Electron: `node node_modules/electron/install.js`.

Generar ejecutables (en `dist/`):

```bash
npm run dist            # instalador + portable
npm run dist:portable   # solo portable
```

## ✨ Funciones

- **Biblioteca**: búsqueda avanzada (`series:`, `tag:`, `keys:>=3`, `ka:>1000`, `dup`…), filtros guardados, reordenar arrastrando,
  fijar posiciones, edición/exportación en lote (`$note`, `$ec`, `$divorce` con deshacer), duplicados, estadísticas, historial de comandos,
  copias de seguridad, temas y deshacer/rehacer.
- **Ordenar por serie** con presets y vista previa.
- **Inicio**: panel con totales, Top 10 por Kakera, series con más Kakera y evolución del Kakera entre importaciones; guía de primeros pasos si aún no hay datos.
- **Paleta de comandos** (`Ctrl+P`): acciones rápidas y búsqueda de personajes. Barra lateral con iconos y barra de estado.
- **Opción Nitro** (Configuración → Orden): los comandos se dividen en bloques más largos.
- **📤 Exportar harem**: genera los comandos para dejar tu harem en Mudae con el orden elegido.
- **Ficha de personaje**: imagen, serie, Kakera, llaves, **código de Mudae** (clic para copiar), color de marco `$ec` (solo con llaves) y **Mostrar imágenes**.
- **👤 Perfiles**: varias colecciones independientes (otro servidor u otra cuenta de Mudae). Se cambia desde el botón de perfil de la cabecera;
  cada perfil conserva su colección y su copia automática. Los ajustes visuales se comparten.
- **👥 Amigos**: exporta tu lista (`.kvault.json`, o una página `.html` que se abre en cualquier navegador) e importa la de un amigo
  (botón o arrastrando el archivo) en una vista **de solo lectura** con buscador, filtro por serie y orden. Se comparten nombre, serie,
  Kakera, llaves e imagen; no se comparten notas, etiquetas ni colores.
- **🔐 Cuenta de Mudae** (☰ Menú): inicia sesión una vez con Discord en la ventana de mudae.net. La sesión queda guardada en tu PC y la app
  lee las galerías de imágenes directamente (sin proxy CORS), incluidas las que exigen cuenta. La contraseña solo la escribes en la web oficial.
- **Copia automática** en `Documentos/Kakera Vault/` desde el primer arranque, ventana que recuerda tamaño y posición, diálogos nativos de
  guardar/abrir, arrastrar y soltar archivos, atajos `Ctrl+1/2/3` para las pestañas.

## 📥 Importar tu harem desde Discord

1. En Discord ejecuta `$mmsaty+ri-c+x+ko` (Mudae responde por DM).
2. Copia desde el primer encabezado de serie hasta el último personaje (con su enlace).
3. **Importar Harem** → pega, o usa *Pegar del portapapeles* / *Abrir archivo .txt*.

Al reimportar se actualizan Kakera, llaves, series e imágenes y se conservan notas, colores, etiquetas y fijados.

## 🗂️ Estructura

| Archivo | Descripción |
|---|---|
| `main.js` | Proceso principal de Electron: ventana, archivos, perfiles, sesión de Mudae. |
| `preload.js` | Puente seguro `window.mudaeDesktop`. |
| `index.html`, `style.css`, `v5.css` | Interfaz. |
| `core.js` | Parser de la exportación de Mudae y constructores de comandos. |
| `app.js` | Lógica de la biblioteca. |
| `v5.js` | Amigos, perfiles, cuenta de Mudae y extras de escritorio. |
| `home.js` | Inicio (panel), paleta de comandos y barra de estado. |
| `docs/PLAN-V5.md`, `docs/ROADMAP.md` | Plan, decisiones y hoja de ruta. |

## ℹ️ Notas

- Los datos viven en la carpeta de datos de la app (`%APPDATA%\Kakera Vault`) y en `Documentos\Kakera Vault`.
- Para traer datos de la v4: *Guardar proyecto* en la v4 y *Cargar proyecto* en la v5.
- Los perfiles de amigos no se verifican: son datos que ellos declaran.
