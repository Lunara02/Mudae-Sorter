# Hoja de ruta — de fácil a difícil

Basada en apps parecidas ([mudae-noter](https://github.com/Arczeus/mudae-noter), [mudae-harem-sorter](https://github.com/klayster13/mudae-harem-sorter),
[mudae-sorter](https://github.com/Wasberth/mudae-sorter), [mudae-ranker](https://github.com/LieutenantCrunch/mudae-ranker)).
Todas son webs de un solo propósito (ordenar/anotar). Ninguna tiene panel, historial, perfiles ni comparación entre usuarios.

## ✅ Hecho
| Nivel | Mejora | Origen |
|---|---|---|
| Fácil | Opción **Nitro**: comandos en bloques de ~3800 caracteres (menos mensajes) | mudae-sorter |
| Fácil | **Barra de estado** (perfil, guardado, totales, versión) | apps de escritorio |
| Fácil | **Paleta de comandos** `Ctrl+P` (acciones + buscar personajes) | VS Code / Discord |
| Fácil | **Barra lateral** con iconos en vez de pestañas superiores | apps de escritorio |
| Medio | **Inicio**: KPIs, top 10, series con más Kakera, onboarding guiado | — |
| Medio | **Historial de Kakera** (se guarda en cada importación) con gráfica | — |
| Medio | Perfiles, Amigos (solo lectura), sesión de Mudae | — |

## 🔜 Pendiente
| Nivel | Mejora | Notas |
|---|---|---|
| Fácil | Iconos propios (Kakera, etc.) | esperando los archivos |
| Fácil | «Añadir solo nuevos» al reimportar | mudae-harem-sorter |
| Medio | Cubos/categorías con total de Kakera por cubo | mudae-sorter |
| Medio | Modo «x vs y» para ordenar por preferencia | mudae-ranker |
| Medio | Ampliar el parser con más datos (rank de claim/like, etc.) | Necesita una muestra real de `$mm` con esas flags; la página de flags de Mudae bloquea la lectura automática |
| Medio | Archivo propio para la colección (en vez de IndexedDB) y dividir `app.js` en módulos | refactor |
| Difícil | Bot de Discord que registre claims, divorcios e intercambios | ver abajo |

## 🤖 Bot de Discord (difícil)
Idea: un bot propio que lea los mensajes de Mudae en un servidor y alimente la app.
- **No usar la cuenta personal** (self-bot): incumple las normas de Discord y puede suspender la cuenta.
- Hay que **crear una aplicación/bot** en el portal de desarrolladores, invitarla al servidor (requiere permisos de administrador o su aprobación)
  y activar el *Message Content Intent*.
- Mudae responde con **embeds de texto** (sin API): habría que interpretar frases como «se casó con…» o «divorció a…» y puede romperse si Mudae cambia el formato.
- Arquitectura sugerida: proceso Node (`discord.js`) que escribe eventos en un JSON local; la app los lee y los muestra en un «Registro de actividad».
- Alternativa más sencilla: importar periódicamente `$mmsaty+ri-c+x+ko` y comparar con la importación anterior (la app ya detecta nuevos/desaparecidos).
