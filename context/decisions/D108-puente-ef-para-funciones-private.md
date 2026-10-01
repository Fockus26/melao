# D108 · Datos · Funciones de private que llama una Edge Function: puente public.ef_* solo para service_role · Implementado

**Decisión:** `private.password_recently_used(p_user, p_candidate)` hace el trabajo (`security definer`, `search_path = ''`, solo `service_role`) y la Edge Function la llama por `public.ef_password_recently_used`, un puente de una línea con los mismos permisos. Devuelve solo un booleano.
**Por qué:** PostgREST (supabase-js `rpc`) solo expone `public`; exponer `private` en la API abriría también las funciones de apoyo de RLS. El prefijo `ef_` y el permiso solo para `service_role` siguen D050.
**Alternativa descartada:** agregar `private` a los esquemas expuestos (amplía la superficie); poner la lógica directamente en `public` (el pedido la quería en `private`, junto a su tabla).
