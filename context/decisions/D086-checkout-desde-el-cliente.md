# D086 · Pagos · Checkout llama a activate-subscription desde el navegador; la UI solo traduce la respuesta · Implementado

**Decisión:** "Activar plan" invoca `supabase.functions.invoke("activate-subscription", { body:
{ planSlug } })` con la sesión del alumno. La respuesta se traduce a estados con la función pura
`activationOutcome` (`lib/plans/activation.ts`): 200 activa → "Tu plan … está *activo*";
409 `subscription_exists` → otro plan vigente (D049) con salida a Inicio; 401 → Entrar con `next`;
404 `plan_not_found` → Planes; 5xx, cuerpo raro o sin conexión → reintento. La UI no se
adelanta al 409: con otro plan vigente muestra el formulario y decide la función. "Tu plan" en
Planes y el estado activo directo en Checkout leen la suscripción con RLS (`active` y período en
curso, como `has_active_subscription()`). El texto "Te llegó un correo con los detalles" del
tablero se omite: v1 no manda ese correo.
**Por qué:** D003/D015: la regla (precio, período, un solo plan vigente) vive en la Edge Function;
sin Server Action que la duplique. Las nativas llaman igual y reusan la misma tabla de estados.
**Alternativa descartada:** ocultar "Elegir" en el otro plan cuando hay uno vigente: duplica
la regla de D049 en la UI y se rompe cuando llegue el cambio de plan con la pasarela.
