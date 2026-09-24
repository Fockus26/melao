# Fase 06 — Estados

## Objetivo

Lo que pasa cuando las cosas no salen como en el mockup. Es la fase que más se salta y la que
más se nota que falta.

## Alcance

- **Vacío:** lista sin resultados, búsqueda sin coincidencias, carrito vacío, sin datos aún.
  Cada uno con su explicación y su acción de salida.
- **Carga:** skeletons por sección (no un spinner global), con `loading.tsx` de Next.
- **Error:** `error.tsx`, `not-found.tsx`, fallo de red, fallo de envío de formulario.
- **Formularios:** validación en vivo, error por campo, error general, envío en curso, éxito.
- **Offline**, si aplica.
- Anuncio de cambios de estado a lectores de pantalla (`aria-live`, `role="alert"`).

## Entradas

`design/HANDOFF.md` §7 (estados diseñados) · fases 01-05 cerradas

## Criterio de cierre

- [ ] Toda lista tiene estado vacío diseñado, no una pantalla en blanco.
- [ ] Toda carga tiene skeleton o indicador; nada salta de vacío a lleno.
- [ ] Todo error dice **qué pasó y qué hacer**, no un código.
- [ ] Los cambios de estado se anuncian de forma no visual.
- [ ] 404 y 500 usan el diseño del sitio, no la página por defecto del framework.
- [ ] Puerta `a11y` en verde.

## Nota

Si el handoff no diseñó estos estados, no los inventes en silencio: son decisiones visuales.
Presenta 3 opciones para el patrón general (por ejemplo, cómo se ve un estado vacío en todo el
sitio) y aplícalo consistentemente una vez elegido.
