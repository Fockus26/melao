# D083 · Datos · Nivel declarado en `profiles.experience_level`; "Ya sé pasos" va a Inicio mientras no haya catálogo · Implementado

**Decisión:** enum `experience_level` (`beginner`, `knows_steps`) en `profiles`, null hasta la
Bienvenida; lo escribe solo `complete_onboarding` (sin permiso de columna para el alumno).
Los dos niveles terminan en `/app`; cuando exista el catálogo, "Ya sé pasos" irá ahí.
**Por qué:** decisión de César para esta tanda; guardar el nivel ya permite usarlo después
(catálogo, recomendaciones) sin volver a preguntar.
**Alternativa descartada:** no guardar el nivel hasta tener catálogo: se perdería la respuesta
de los primeros alumnos.
