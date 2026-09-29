# D015 · Producto · Suscripción placeholder activada por Edge Function; RLS bloquea escritura del cliente · Pendiente

**Decisión:** el checkout muestra el precio y activa por $0 mediante una Edge Function. RLS
impide que el cliente escriba `subscriptions`. El acceso al contenido depende de la
suscripción activa.
**Por qué:** cuando llegue la pasarela real solo cambia cómo se activa la suscripción, no las
reglas de acceso.
