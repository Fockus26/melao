# docs/spec — contrato de producto multiplataforma

Melao se construye primero en web (Next.js) y después se reimplementa en Android (Kotlin) e
iOS (Swift) con la misma UI y la misma funcionalidad (D005). Esta carpeta es lo que esas
apps van a leer: **qué hace el producto, no cómo lo hace React**.

| Archivo | Qué define |
|---|---|
| `producto.md` | Módulos, reglas de negocio y glosario |
| `pantallas.md` | Cada pantalla: propósito, bloques en orden, acciones, estados |
| `api.md` | Tablas, reglas de acceso (RLS), Edge Functions y sus payloads |
| `motor-de-ritmo.md` | Rejilla de beats, frases, línea de tiempo del coach, requisitos del reproductor |
| `combinaciones.md` | Generador de combinaciones: entradas, reglas e invariantes |
| `srs.md` | Repetición espaciada (FSRS): tarjetas, calificaciones, vencimientos |
| `vectors/` | Casos de prueba en JSON que las tres plataformas deben pasar |

También forman parte del contrato, fuera de esta carpeta:

- `design/tokens.json` — tokens de diseño (colores, tipo, espaciado…) para CSS, Compose y SwiftUI.
- `design/HANDOFF.md` — el diseño de cada pantalla y componente.
- `messages/es.json` — todos los textos de la UI.

## Reglas

1. **Todo cambio de comportamiento actualiza esta carpeta en el mismo PR.** Si el código y la
   spec no coinciden, es un bug de uno de los dos: se decide cuál y se corrige.
2. **Backend-first (D003):** las reglas viven en el backend. Lo que un cliente reimplementa es
   la UI y el reproductor de audio; todo lo demás es una llamada a la API.
3. **Neutral a la plataforma:** aquí no se habla de componentes React, rutas de Next ni CSS.
   Se habla de pantallas, datos, eventos y tiempos.
4. **Vectores primero:** un comportamiento con números (tiempos, frases, combinaciones,
   vencimientos) lleva su vector en `vectors/`.

Estado: esqueleto del arranque (2026-09-24). `api.md` y `vectors/` se completan en la fase 07a.
