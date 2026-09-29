# D082 · Producto · La Bienvenida lista solo los estilos publicados; sin "Próximamente" en v1 · Implementado

**Decisión:** el paso 1 muestra los `dance_styles` publicados, por `sort_order` y nombre, sin
contar lecciones. Los borradores no aparecen (la RLS se los oculta al alumno); la card
deshabilitada con candado ("Próximamente") existe en el componente y se ve en la muestra
`/layouts/welcome`, pero la pantalla real no la usa todavía.
**Por qué:** hoy no hay Bachata en la base y mostrar un borrador exigiría exponer estilos sin
publicar a los alumnos (una función o un campo nuevo). "Cero contenido inventado".
**Alternativa descartada:** un campo `coming_soon` en `dance_styles` o una función que liste
borradores: se agrega cuando César quiera anunciar un estilo. El conteo "40 lecciones" del
tablero queda fuera hasta que haya un conteo de lecciones por estilo legible por el alumno.
