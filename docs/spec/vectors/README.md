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

## Previstos (fase 07a)

- `ritmo-*` — interpolación de la rejilla, frases disponibles, intro corta, tempo que acelera.
- `timeline-*` — anuncio en el 5, silencio del 5–6, paso repetido sin anuncio, merengue 1–8.
- `combinaciones-*` — encadenamiento de posiciones, relleno con base, objetivos, semilla.
- `srs-*` — mapeo 1–4 → FSRS, "me lo sé", vencimientos.
