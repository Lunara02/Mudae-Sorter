# 💎 Kakera Vault — v5 (portable)

Aplicación **portable para Windows** para gestionar tu colección (harem) de [Mudae](https://mudae.net): importa, ordena,
edita en lote, genera comandos para Discord, comparte tu lista y mira la de tus amigos.

> **Un solo `.exe`, sin instalar nada.** Todos tus datos se guardan en una carpeta junto al ejecutable, así que puedes
> moverlo a otro PC o a un USB y tu colección va con él. Sin servidor, sin cuentas propias, sin enviar datos a terceros.

## 💼 Cómo funciona la versión portable

- Ejecuta `KakeraVault-Portable-<versión>.exe` desde donde quieras (escritorio, USB…). La primera vez tarda unos segundos en
  descomprimirse; las siguientes abre mucho más rápido.
- Crea una carpeta **`Kakera Vault Datos`** al lado del `.exe` con:
  - `app/` — tu colección, ajustes, perfiles y la sesión de Mudae.
  - `copias/` — copia automática de tu colección en `.json` (una por perfil).
  - `copias/diarias/` — una copia por día y perfil; se conservan las 7 últimas.
- Para **actualizar**, sustituye el `.exe` por el nuevo y deja la carpeta `Kakera Vault Datos` donde está.
- Para **mover la app**, copia el `.exe` y la carpeta `Kakera Vault Datos` juntos.
- Si el `.exe` está en un sitio sin permiso de escritura, usa la carpeta de datos normal de Windows.
- Abrir la carpeta de datos: ☰ Menú → **Carpeta de datos** (o `Ctrl+P`). La barra de estado muestra «💼 Portable».
- Si ya usabas la app en modo desarrollo, la primera vez la versión portable trae esos datos automáticamente.

## ✨ Funciones

- **Inicio**: totales, Top 10 por Kakera, series con más Kakera, evolución del Kakera entre importaciones y guía de primeros pasos.
- **Biblioteca**: búsqueda avanzada (`series:`, `tag:`, `keys:>=3`, `ka:>1000`, `dup`…), filtros guardados, reordenar arrastrando,
  fijar posiciones, edición/exportación en lote (`$note`, `$ec`, `$divorce` con deshacer), duplicados, estadísticas,
  historial de comandos, copias de seguridad, temas y deshacer/rehacer.
- **Series**: ordenar por serie con presets y vista previa.
- **📤 Exportar harem**: comandos para dejar tu harem en Mudae con el orden elegido. Opción **Nitro** para bloques más largos.
- **Ficha de personaje**: imagen, serie, Kakera, llaves, **código de Mudae** (clic para copiar), color de marco `$ec`
  (solo con llaves) y **Mostrar imágenes**.
- **👤 Perfiles**: varias colecciones independientes (otro servidor u otra cuenta de Mudae).
- **👥 Amigos**: exporta tu lista (`.kvault.json` o página `.html`) e importa la de un amigo en una vista de solo lectura.
  Se comparten nombre, serie, Kakera, llaves e imagen; no notas, etiquetas ni colores.
- **🔐 Cuenta de Mudae**: inicia sesión una vez con Discord; la app lee las galerías de imágenes directamente (sin proxy),
  incluidas las que exigen cuenta. La contraseña solo la escribes en la web oficial.
- **Paleta de comandos** `Ctrl+P`, barra lateral, barra de estado, arrastrar y soltar archivos, atajos `Ctrl+1…4`.

## 📥 Importar tu harem desde Discord

1. En Discord ejecuta `$mmsaty+ri-c+x+ko` (Mudae responde por DM).
2. Copia desde el primer encabezado de serie hasta el último personaje (con su enlace).
3. **Importar Harem** → pega, o usa *Pegar del portapapeles* / *Abrir archivo .txt* / arrastra el `.txt`.

Al reimportar se actualizan Kakera, llaves, series e imágenes y se conservan notas, colores, etiquetas y fijados.

## 🛠️ Desarrollo

Requisitos: [Node.js](https://nodejs.org) 18+ y Windows 10/11.

```bash
git clone https://github.com/Lunara02/Mudae-Sorter.git
cd Mudae-Sorter
npm install      # descarga Electron (una sola vez)
npm start        # abre la app (modo desarrollo: datos en %APPDATA%)
npm run dist     # genera el portable en dist/
```

Si `npm install` no descarga el binario de Electron: `node node_modules/electron/install.js`.

| Archivo | Descripción |
|---|---|
| `main.js` | Proceso principal de Electron: ventana, carpeta de datos portable, archivos, perfiles, sesión de Mudae, copias. |
| `preload.js` | Puente seguro `window.mudaeDesktop`. |
| `index.html`, `style.css`, `v5.css` | Interfaz. |
| `core.js` | Parser de la exportación de Mudae y constructores de comandos. |
| `app.js` | Lógica de la biblioteca. |
| `v5.js` | Amigos, perfiles, cuenta de Mudae, copia diaria y extras. |
| `home.js` | Inicio (panel), paleta de comandos y barra de estado. |
| `docs/` | Plan y hoja de ruta. |
