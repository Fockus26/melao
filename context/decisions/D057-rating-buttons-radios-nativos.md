# D057 · Componentes · RatingButtons con radios nativos en fieldset/legend (sin role="radiogroup" explícito) y check en el seleccionado · Implementado

**Decisión:** cada opción es un `<input type="radio">` nativo (visualmente oculto) dentro de su
`<label>`, todas con el mismo `name` por paso, en un `<fieldset>` cuyo `<legend>` es el nombre
del paso. No se pone `role="radiogroup"` a mano: el grupo de radios nativo ya expone la
elección única, "1 de 4", flechas y Espacio. El seleccionado se invierte (bg primary, texto
on-primary) **y** muestra un check de 16 px arriba a la derecha, como el conmutador de tema.
**Por qué:** menos ARIA a mano = menos que mantener y el mismo comportamiento en Android/iOS
(que tienen su grupo de radios). Biome (`useSemanticElements`) rechaza el rol sobre fieldset.
El check evita que el estado dependa solo del color. Verificado: axe 0 en claro y oscuro,
Tab entra al grupo una vez y las flechas cambian la calificación.
**Alternativa descartada:** `role="radiogroup"` + `role="radio"`/`aria-checked` con roving
tabindex sobre botones (más código y teclado reimplementado); `role="radiogroup"` sobre el
fieldset (redundante; lo marca el lint).
