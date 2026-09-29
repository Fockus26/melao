# D065 · Producto · plan-session: pasos permitidos, targets (lección o vencidos, tope N) y pesos por la tarjeta del rol · Pendiente

**Decisión:** práctica libre = pasos en `known` (y `learning` salvo `includeLearning: false`)
con los filtros `minDifficulty`/`maxDifficulty`/`favoritesOnly`; ninguno → 409 `no_steps`;
targets = los vencidos del más atrasado al menos, como mucho `N`. Lección = sus pasos, los de
las lecciones anteriores del curso y los `known`; targets = los de la lección en orden.
Siempre con los base del estilo como relleno. Pesos: vencido, dificultad FSRS (si ya tuvo un
repaso), favorito y popularidad; la tarjeta es la del rol del perfil (estilo sin roles:
`leader`; perfil sin rol: la más urgente y la más difícil).
**Por qué:** combinaciones.md fija "targets = lección o vencidos" y pantallas.md la práctica
con "incluir aprendiendo" y el estado "sin pasos conocidos". El tope `N` acota el costo del
generador (cada target recalcula tablas) y más de `N` no caben. Sin los pasos de lecciones
anteriores, el seed no tiene plan que coloque la enchufla (sale de cerrada: hace falta el
Dile que sí de la lección 2).
**Alternativa descartada:** incluir "no lo sé" en la práctica libre (planes con pasos que el
alumno no ha visto); o usar solo los pasos de la lección (targets imposibles en `unplaced`).
