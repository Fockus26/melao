/**
 * PRNG con semilla del core: **mulberry32** sobre enteros de 32 bits sin signo.
 *
 * Es parte del contrato multiplataforma (`docs/spec/combinaciones.md` § Aleatoriedad): la
 * misma semilla da la misma secuencia en TS, Kotlin o Swift. Nada del core usa `Math.random`.
 *
 * Paso (todo módulo 2^32; `imul` = producto de 32 bits que conserva los 32 bits bajos):
 *   a = a + 0x6D2B79F5
 *   t = imul(a ^ (a >>> 15), a | 1)
 *   t = t ^ (t + imul(t ^ (t >>> 7), t | 61))
 *   salida = (t ^ (t >>> 14)) / 2^32          → número en [0, 1)
 */
export type Random = () => number;

/** Reduce cualquier entero (también el `bigint` de `practice_sessions.seed`) a uint32. */
export function seedToUint32(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new RangeError("La semilla debe ser finita");
  }
  // Módulo 2^32 exacto (negativos incluidos): `>>> 0` falla con enteros > 2^53.
  return Number(BigInt.asUintN(32, BigInt(Math.trunc(seed))));
}

/** Generador mulberry32: cada llamada devuelve el siguiente número en [0, 1). */
export function mulberry32(seed: number): Random {
  let a = seedToUint32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
