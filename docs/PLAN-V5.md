# Plan v5 — Kakera Vault (solo PC)

## Hecho
- App de escritorio con nombre e icono propios; sin capa móvil ni PWA.
- Copia automática en disco, ventana con estado persistente, diálogos nativos.
- Pestaña **Amigos**: exportar/importar listas (`.kvault.json` / `.html`) y vista de solo lectura.
- **Perfiles** para varias colecciones (servidores/cuentas).
- Cuenta de Mudae (sesión guardada, lectura de galerías sin proxy CORS).
- Ficha de personaje simplificada; «Exportar harem».

## Pendiente / ideas
- Subida de imágenes (Imgur): se retiró por no estar probada; replantear (p. ej. subida anónima o otro servicio).
- Mover la colección de IndexedDB a archivo propio; dividir `app.js` en módulos; limpiar CSS heredado.
- Iconos propios (Kakera, etc.).
- Sincronización en línea / notificaciones de temporizadores.
