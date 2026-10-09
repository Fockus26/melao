# D167 · Técnica · `admin_save_style`: datos y configuración del motor en una transacción, con códigos `ME` · Implementado

**Decisión:** `public.admin_save_style(p_style_id, p_style jsonb, p_start_position jsonb)`
(`security invoker`): crea (sin publicar) o edita nombre, slug, orden, roles, tiempos por frase,
tiempos hablados, anuncio, frases de entrada, bandas y posición inicial. `p_start_position`
crea una posición y la deja inicial en la misma transacción (estilo nuevo); la FK diferida se
comprueba al final de la función. Valida antes de escribir con códigos propios de clase `ME`
(`ME001` tiempos hablados, `ME002` el anuncio no cabe, `ME003` bandas); los `check` de la tabla
siguen siendo la última palabra (`23514`). Bajar los tiempos por frase no toca las notas por
tiempo de los pasos: la pantalla avisa qué pasos quedan con notas fuera de la frase.
**Por qué:** un estilo es configuración (D022) que se guarda todo o nada, como los pasos (D153);
los `check` sin nombre de `dance_styles` no permiten traducir el error al campo. Clase `ME` para
no chocar con los `MS` de pasos ni con los de las otras unidades de la ola.
**Alternativa descartada:** update directo por RLS con el error del `check` (nombres autogenerados,
textos genéricos) o bloquear el cambio de tiempos por frase si hay notas fuera de rango (obliga a
editar paso por paso antes).
