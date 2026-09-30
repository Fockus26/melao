-- `onboarded_at` sale del permiso de columna de profiles: lo escribe solo
-- public.complete_onboarding (security definer, 20260929200000_onboarding.sql). Antes un alumno
-- podía marcarse la Bienvenida como hecha con un UPDATE directo sin elegir estilos ni nivel.
-- Aditiva: el grant de 20260926200000 fue por columna, así que basta revocar esa columna; el
-- resto (display_name, dance_role, theme, coach_voice_volume, coach_spoken_count,
-- default_style_id) sigue editable por el dueño (RLS) y por un admin.
-- Contrato: docs/spec/api.md § Usuarios y suscripción.

revoke update (onboarded_at) on public.profiles from authenticated;
