# D122 · Audio · La sesión siempre pasa por "Toca para empezar": el AudioContext se crea y se despierta en ese toque · Implementado (web)

**Decisión:** la sesión prepara la pista sin contexto de audio y queda en `blocked` ("Toca para
empezar"). El `AudioContext` (con respaldo `webkitAudioContext`) se crea en ese toque y se le
llama `resume()` sin `await`, dentro del gesto. No se intenta sonar solo aunque el navegador lo
permitiera (activación por el clic de Empezar del configurador).
**Por qué:** iOS/Safari exige crear o despertar el audio dentro de un gesto (camino del spike, aún
sin probar en iPhone, D032); y el alumno necesita un momento para dejar el teléfono y ponerse en
posición. Un único camino es más fácil de probar en todas las plataformas.
**Alternativa descartada:** arrancar sola al cargar si el contexto ya corre (sorprende, y en iOS
falla en silencio).
