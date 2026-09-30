# D093 · Producto · "Lo que más te cuesta" = última calificación 1–2 u olvidos, ordenado por calificación, olvidos y dificultad FSRS · Implementado

**Decisión:** `public.hardest_steps(style, limit = 3)` toma las tarjetas del rol del alumno (o `leader` si el estilo no tiene roles) cuya última calificación fue 1–2 (Muy difícil, Difícil) o con `lapses > 0`, y las ordena por última calificación ascendente, `lapses` descendente, dificultad FSRS de la tarjeta descendente y la calificación más reciente primero. Sin ninguna, la lista queda vacía (Inicio explica cuándo aparece).
**Por qué:** lo que el alumno siente como "me cuesta" es su última calificación; los olvidos (`lapses`) capturan lo que se le cae aunque la última vez le haya ido bien. Ordenar por `stability` (lo que decía api.md) mezcla pasos recién aprendidos, que tienen estabilidad baja sin costar.
**Alternativa descartada:** `srs_cards` por `stability` ascendente: marca como difícil todo paso nuevo.
