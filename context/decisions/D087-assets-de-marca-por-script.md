# D087 · SEO · Open Graph, apple-icon, íconos PWA y favicon.ico como PNG generados por script (node + Playwright) · Implementado

**Decisión:** `scripts/brand-assets.ts` (`bun run brand:assets`, corre con node, D071) renderiza con
Chromium el tablero *Marca · Open Graph e íconos* y escribe `app/opengraph-image.png` y
`app/twitter-image.png` (1200 × 630, mismo arte, con sus `.alt.txt`), `app/apple-icon.png` (180,
cuadrado lleno), `public/icons/icon-192.png` e `icon-512.png` (baldosa radio 11, esquinas
transparentes), `icon-maskable-512.png` (fondo lleno #111111, M dentro del círculo del 80 %) y
`app/favicon.ico` (PNG 16/32/48 de la M reforzada de `app/icon.svg`, escrito a mano). Los PNG se
commitean. El arte vive en `scripts/lib/brand-art.ts` (geometría de la M de D079, colores de
`design/tokens.json`; único literal: el separador «·» #4A4A4A del tablero, sin token) y los tests
comprueban tamaños, capas del ICO y que la geometría coincida con `logo.tsx` e `icon.svg`.
**Por qué:** la imagen lleva Fraunces variable con tamaño óptico e itálica; Chromium la dibuja
igual que la web y el tablero. El script falla si una fuente no carga (necesita red: Google Fonts).
Si cambia el copy de la imagen (fila 49), se regenera.
**Alternativa descartada:** `opengraph-image.tsx` con `ImageResponse` (Satori): exige empaquetar
los TTF estáticos y no reproduce el eje `opsz` ni el mismo trazado de la tipografía variable.
