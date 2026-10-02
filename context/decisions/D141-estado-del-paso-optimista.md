# D141 · UI · "Tu estado" del paso: chips optimistas contra `review-steps`, ocupados hasta la respuesta · Implementado

**Decisión:** los 3 chips de "Tu estado" (no lo sé · aprendiendo · me lo sé; `aria-pressed`,
círculo de StepStatus, texto y ✓ en el marcado) llaman a `review-steps` `{ context: "catalog",
status: [{ stepId, status }] }` sin `role` (la función usa el del perfil). Al tocar, el nuevo
estado se ve en el acto y los chips quedan `aria-disabled` (no `disabled`: el foco no se pierde)
hasta la respuesta; si falla, vuelve al último confirmado y avisa (sin conexión / error;
`no_active_subscription` → "Activa tu plan"; `role_required` → "Elige tu rol" → Perfil; 401 →
Entrar). Al guardar, el próximo repaso sale de `cards[].dueAt` y la página se vuelve a leer
(`router.refresh()`) para el historial. Sin suscripción (`has_active_subscription()`), los chips
se ven deshabilitados con el aviso y el enlace a `/plans` (D036). Reductor puro en
`lib/steps/detail.ts` (`statusReducer`), probado sin React.
**Por qué:** cambiar el estado reprograma la tarjeta: dos toques seguidos en vuelo (p. ej. "me lo
sé" y "no lo sé") podrían llegar en desorden; bloquear hasta la respuesta es más simple que la
cola del favorito (D129) y la espera es corta.
**Alternativa descartada:** cola por paso como el favorito (gana el último; más estado para una
acción poco frecuente); esperar la respuesta sin optimismo (se siente lento).
