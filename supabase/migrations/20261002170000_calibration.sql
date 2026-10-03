-- Calibrar audífonos (07b): guardar la latencia medida, una escritura que cada cliente (web,
-- Android, iOS) llama igual. Aditiva: solo una función.
-- Contrato: docs/spec/api.md § Datos del alumno › Calibrar y docs/spec/motor-de-ritmo.md §6.
-- Decisiones: D003 (la regla vive aquí), D124 (la sesión usa la más reciente de la plataforma),
-- D142 (medición y rango), D143 (`device_key` en web).
--
-- Por qué una función y no un upsert directo: `measured_at` tiene que ser la hora del servidor
-- también al repetir la calibración del mismo dispositivo (la sesión elige la más reciente), y
-- el rango del ajuste (−200…300, el del core `calibration.ts`) es más angosto que el check de
-- la tabla (−200…1000), que se deja como está.
--
-- `security invoker`: el insert y el update pasan por RLS (solo filas propias); la fila es
-- siempre la de `auth.uid()`, también para el admin.

create function public.save_audio_latency(
  p_platform public.client_platform,
  p_device_key text,
  p_device_label text,
  p_offset_ms integer,
  p_sd_ms real default null,
  p_taps smallint default null
)
returns public.audio_latency
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_row public.audio_latency;
begin
  if v_user is null then
    raise exception 'save_audio_latency: sin sesión' using errcode = '42501';
  end if;
  if p_offset_ms is null or p_offset_ms not between -200 and 300 then
    raise exception 'save_audio_latency: offset_ms fuera de −200…300'
      using errcode = '22023';
  end if;

  insert into public.audio_latency
    (user_id, platform, device_key, device_label, offset_ms, sd_ms, taps, measured_at)
  values
    (v_user, p_platform, p_device_key, p_device_label, p_offset_ms, p_sd_ms, p_taps, now())
  on conflict (user_id, platform, device_key) do update
    set device_label = excluded.device_label,
        offset_ms = excluded.offset_ms,
        sd_ms = excluded.sd_ms,
        taps = excluded.taps,
        measured_at = excluded.measured_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.save_audio_latency(
  public.client_platform, text, text, integer, real, smallint
) from public, anon;
grant execute on function public.save_audio_latency(
  public.client_platform, text, text, integer, real, smallint
) to authenticated, service_role;
