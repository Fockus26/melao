# vectors/

Casos de prueba en JSON que **todas** las implementaciones deben pasar: el core en TypeScript
(`bun test`) hoy, y Kotlin/Swift si alguna vez reimplementan algo localmente (p. ej. el
reproductor o un modo sin conexión).

## Formato

Un archivo por caso: `<tema>-<nombre>.json`.

```json
{
  "descripcion": "Salsa, rejilla constante de 180 BPM, intro de 2 s, un paso repetido",
  "entrada": { },
  "salida": { }
}
```

Las operaciones con estado (FSRS) usan el formato **secuencia**: `entrada.pasos` es la lista
de operaciones en orden sobre una misma tarjeta y `salida.resultados` trae un resultado por
paso.

Los números reales (tiempos de la rejilla, `stability`, `difficulty`, salidas del PRNG) se
comparan con **6 decimales**; lo demás, exacto. Los JSON van con fin de línea LF
(`.gitattributes`), igual en Windows, macOS y Linux.

## Existentes (fase 07a)

| Prefijo | Qué fija | Test (TS) |
|---|---|---|
| `ritmo-*` | rejilla (interpolación, extrapolación, tempo que acelera), frases disponibles, intro corta | `tests/unit/core-ritmo-vectors.test.ts` |
| `timeline-*` | anuncio en el 5, paso repetido sin anuncio, paso de dos frases, merengue 1–8, redondeo | `tests/unit/core-ritmo-vectors.test.ts` |
| `combinaciones-*` | encadenamiento de posiciones, relleno con base, pesos, objetivos, semillas, catálogo | `tests/unit/core-combinaciones-vectors.test.ts` |
| `combinaciones-prng` | mulberry32: primeros números por semilla (la semilla se reduce a uint32) | `tests/unit/core-combinaciones-vectors.test.ts` |
| `password-*` | regla de contraseña D075: qué reglas falla cada caso (solo letras ASCII cuentan) | `tests/unit/ef-change-password.test.ts` (core y UI) |
| `srs-*` | mapeo 1–4 → FSRS, "me lo sé", aprendiendo, lapso, repaso tardío, vencimientos | `tests/unit/core-srs-vectors.test.ts` |

Contratos: `motor-de-ritmo.md`, `combinaciones.md` y `srs.md` en `docs/spec/`.
