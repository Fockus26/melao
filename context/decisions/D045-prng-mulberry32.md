# D045 · Arquitectura · PRNG del core: mulberry32 sobre uint32, algoritmo exacto en combinaciones.md · Implementado

**Decisión:** `core/random.ts`, semilla reducida a uint32 (módulo 2^32, negativos incluidos);
un número por paso del plan. El algoritmo exacto y valores de referencia están en
`combinaciones.md` § Aleatoriedad y `vectors/combinaciones-prng.json`.
**Por qué:** 4 líneas de aritmética de 32 bits que Kotlin (`Int`, `ushr`) y Swift (`UInt32`,
`&*`) reproducen exacto; calidad sobrada para sortear pasos; sin dependencias.
**Alternativa descartada:** xoshiro128** / PCG (más estado y más código para nada que se
note aquí) y `Math.random` (no reproducible).
**Estado (detalle):** Implementado (07a)
