# D159 · Técnica · Lista de canciones del admin: `admin_songs()` con "preparada", estado de licencia y dificultad calculados en Postgres · Implementado

**Decisión:** una función `security invoker` devuelve todas las canciones con `ready` (audio +
duración + ≥ 2 anclas + fin de baile: lo que necesita practicarla), `license_status`
(`expired` · `expiring` = vence en ≤ 30 días, como el Resumen · `ok`), `lesson_count` (práctica o
final) y la dificultad: `auto_difficulty` por las bandas del **primer estilo** (orden del estilo)
y `difficulty` = override o automática. Búsqueda y filtros en el cliente (decenas de canciones).
**Por qué:** "preparada", "vence pronto" y la dificultad son reglas; en el cliente se repetirían
en cada plataforma.
**Alternativa descartada:** dificultad automática por cada estilo de la canción: más columnas para
un caso raro (canción en dos estilos con bandas distintas); el override cubre la excepción.
