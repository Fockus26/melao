# D035 · Tipografía · Utilidades `type-<rol>` (rol completo) y `text-<rol>` (solo tamaño); cifras tabulares en numeric-* y stage-* · Implementado

**Decisión:** cada rol del JSON genera `--text-<rol>` en `@theme` (Tailwind da `text-<rol>`:
tamaño, interlineado, peso y tracking) y una utilidad `type-<rol>` que además fija la familia
(Fraunces/Geist), las mayúsculas y las cifras tabulares. En componentes se usa `type-<rol>`.
Los roles `numeric-*` y `stage-*` llevan siempre `tabular-nums`. Se vacían los tamaños de
Tailwind (`--text-*: initial`): `text-sm`, `text-lg`… no existen.
**Por qué:** `--text-*` de Tailwind no admite familia, `text-transform` ni
`font-variant-numeric`; con solo `text-h1` cada uso tendría que acordarse de `font-serif` y
`uppercase`, y ahí se cuela Fraunces en un botón o un eyebrow sin mayúsculas. Ninguno de los
pares del handoff falló AA (134 pares medidos), así que no hizo falta ajustar tonos.
**Alternativa descartada:** solo `text-<rol>` + clases sueltas; o solo `type-<rol>` (se pierde
`md:text-h1` para cambiar tamaño por breakpoint).
**Estado (detalle):** Implementado (fase 01)
