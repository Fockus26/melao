/** Primer valor de un parámetro de `searchParams` (`?a=1&a=2` llega como arreglo). */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
