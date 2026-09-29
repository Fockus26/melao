# D080 · Producto · La Bienvenida pide el rol siempre, aunque ningún estilo elegido tenga roles · Implementado

**Decisión:** el paso 2 (Líder / Seguidor) se muestra y se exige siempre; `complete_onboarding`
rechaza un rol nulo. Un estilo con `has_roles = false` ignora el rol al armar tarjetas y videos
(D051), así que guardarlo no cambia nada para ese estilo.
**Por qué:** hoy los dos estilos publicados (casino y merengue) tienen roles; el rol es uno para
todos los estilos (D023) y sirve en cuanto el alumno sume uno con roles, sin volver a preguntar.
Un paso que aparece o no según la elección complica el flujo y el "Paso n de 3".
**Alternativa descartada:** saltar el paso 2 si ningún estilo elegido tiene roles (rol null):
obliga a pedirlo más tarde, al sumar un estilo con roles, en otra pantalla.
