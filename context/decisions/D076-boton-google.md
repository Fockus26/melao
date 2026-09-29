# D076 · Diseño · Botón "Continuar con Google" con la G oficial a cuatro colores y separador "o con tu correo" · Implementado

**Decisión:** Google es un Button outline lg a ancho completo con la "G" oficial en SVG
(`components/auth/google-mark.tsx`) y el texto "Continuar con Google", arriba del formulario en
Entrar y en Registro, seguido del separador "o con tu correo" (líneas `divider` decorativas).
Los cuatro colores de la G son un asset de marca, no tokens: no se reutilizan en ningún otro lado.
**Por qué:** el handoff pide "outline lg con G" y las directrices de marca de Google piden su
logo oficial sin recolorear en los botones de acceso.
**Alternativa descartada:** una "G" tipográfica o monocroma en `text`: más coherente con la
paleta, pero incumple las directrices de Google.
