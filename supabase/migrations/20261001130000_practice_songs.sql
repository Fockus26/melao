-- Práctica libre (07b): las canciones candidatas de un estilo, con lo que el configurador
-- (`/app/practice`) y la lista de Canciones (`/app/practice/songs`) necesitan para elegir.
-- Aditiva: solo funciones. Contrato: docs/spec/api.md § Datos del alumno › Funciones.
-- Decisiones: D003 (la regla vive aquí, no en el cliente), D009 (visibilidad por licencia),
-- D117 (modos de canción del configurador).
--
-- `security invoker`: RLS decide lo visible (canción publicada con licencia vigente y estilo
-- publicado; un admin ve también las sin publicar, que son las únicas del seed). Los
-- favoritos son siempre los de `auth.uid()`, nunca los de otro alumno (aunque un admin los lea).

-- ── Dificultad de una canción (producto.md, reglas transversales) ───────────
-- La del admin (`difficulty_override`) si la hay; si no, por las bandas de BPM del estilo
-- (`difficulty_bpm_bands`, tope por nivel, ascendente): nivel n = primer tope con BPM ≤ tope;
-- por encima del último tope, el siguiente nivel (máx. 5). Sin bandas o sin BPM: null.

create function private.song_difficulty(
  p_override smallint,
  p_bpm numeric,
  p_bands smallint[]
) returns smallint
language sql immutable
security invoker
set search_path = ''
as $$
  select coalesce(
    p_override,
    case
      when p_bpm is null or p_bands is null or cardinality(p_bands) = 0 then null
      else least(
        5,
        coalesce(
          (select min(b.n) from unnest(p_bands) with ordinality as b (cap, n) where p_bpm <= b.cap),
          cardinality(p_bands) + 1
        )
      )::smallint
    end
  )
$$;

revoke execute on function private.song_difficulty(smallint, numeric, smallint[]) from public;
grant execute on function private.song_difficulty(smallint, numeric, smallint[])
  to authenticated, service_role;

-- ── practice_songs: canciones del estilo para practicar ─────────────────────
-- Una fila por canción visible del estilo, por título. `ready`: tiene rejilla (≥ 2 anclas) y
-- `dance_end_ms`, lo que `plan-session` exige (si no, responde `song_not_ready`).
-- `sessions_30d` y `popularity` (percentil 0–1) salen de `song_popularity()`: sesiones de
-- todos los alumnos en los últimos 30 días, sin datos personales.

create function public.practice_songs(p_style uuid)
returns table (
  song_id uuid,
  title text,
  artist text,
  bpm numeric,
  duration_ms integer,
  dance_end_ms integer,
  beat_grid jsonb,
  difficulty smallint,
  favorite boolean,
  sessions_30d bigint,
  popularity double precision,
  ready boolean
)
language sql stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.title,
    s.artist,
    s.bpm,
    s.duration_ms,
    s.dance_end_ms,
    s.beat_grid,
    private.song_difficulty(s.difficulty_override, s.bpm, ds.difficulty_bpm_bands),
    exists (
      select 1 from public.user_song_favorites f
      where f.user_id = (select auth.uid()) and f.song_id = s.id
    ),
    coalesce(p.sessions_30d, 0),
    coalesce(p.percentile, 0),
    s.beat_grid is not null
      and jsonb_array_length(s.beat_grid) >= 2
      and s.dance_end_ms is not null
  from public.song_styles ss
  join public.songs s on s.id = ss.song_id
  join public.dance_styles ds on ds.id = ss.style_id
  left join public.song_popularity() p on p.song_id = s.id
  where ss.style_id = p_style
  order by s.title, s.id
$$;

revoke execute on function public.practice_songs(uuid) from public, anon;
grant execute on function public.practice_songs(uuid) to authenticated, service_role;
