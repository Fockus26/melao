# D079 · Marca · Logo C1 tomado del tablero *Marca* del canvas; favicon = versión reforzada en app/icon.svg · Implementado

**Decisión:** la marca de `components/layout/logo.tsx` es la geometría exacta del C1 · Modulada
del tablero *Marca* del canvas de diseño (viewBox 48, baldosa radio 11, astas `M14 35V13M34 35V13`
de 5, diagonales `M15 13.5l9 15 9-15` de 2,6). Colores por token: baldosa `text`, M `bg` (en
oscuro se invierte, sin dorado, como el tablero). El favicon es la versión reforzada para 16 px
(radio 10, astas 7, diagonales 5,5) en `app/icon.svg`, con los colores fijos del tablero
(#111111 / #FFFFFF); reemplaza el `app/favicon.ico` por defecto de Next. El wordmark sigue como
texto en Fraunces 500 (D061).
**Por qué:** el SVG ya estaba en el canvas; exportarlo a mano no agrega nada para la web.
**Pendiente (no web):** íconos de app PNG (iOS 1024, Android adaptativo) y la imagen Open Graph
(handoff §5): se generan cuando lleguen Android/iOS o el SEO de la landing.
