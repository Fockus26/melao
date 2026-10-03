# D154 · Técnica · El Resumen del admin es una sola función `admin_summary()` que devuelve jsonb con códigos, sin textos · Implementado

**Decisión:** `public.admin_summary()` (`security invoker`, `42501` si no es admin) devuelve
`{ styles, totals, warnings, pending }`: contadores por estilo y sin repetir, y avisos y
pendientes como `{ kind, id, name, style (slug), reasons[], expires_on }`. Los motivos son
códigos (`missing_video`, `license_expired`, …); el texto lo pone cada cliente. Las listas
llegan completas y ordenadas (tipo, estilo, nombre; lecciones en el orden del curso); la web
muestra 8 y "Ver n más" (`<details>`). Solo los pasos enlazan (`/admin/steps?style=&step=`);
canciones, estilos y lecciones, sin enlace hasta que tengan pantalla.
**Por qué:** D003 (contadores y avisos en Postgres) y una lectura para web, Android e iOS; los
códigos dejan traducir y cambiar el copy sin migración. El catálogo del admin es chico (decenas
de filas): no hace falta paginar.
**Alternativa descartada:** varias funciones o lecturas directas por bloque (más viajes y la
regla de "video completo" repetida en cada cliente); devolver filas con textos ya armados.
