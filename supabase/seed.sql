-- Datos de ejemplo (seed) — TODO ES PLACEHOLDER (CONTENT_CHECKLIST filas 32–34).
--
-- Qué siembra: los dos estilos (salsa casino y merengue) con sus posiciones, un catálogo de
-- pasos por estilo que pasa `validateCatalog` (combinaciones.md § Validación), canciones de
-- prueba SIN audio ni licencia (no se publican, D009) y un curso por estilo (2 unidades × 3
-- lecciones). Nada de usuarios, suscripciones ni datos de alumno; los `plans` los siembra la
-- migración de usuarios. Contrato: docs/spec/api.md § Datos de ejemplo. Decisiones D053–D055.
--
-- Nombres, dificultades, frases, posiciones, canciones y orden del curso son una propuesta
-- para que César la corrija (en el panel admin o editando este archivo).
--
-- Cómo se aplica:
-- * Local: `supabase db reset` (config.toml › [db.seed] apunta aquí).
-- * Proyecto real: correr este archivo entero (psql o el editor SQL). Es idempotente: UUID
--   fijos + `on conflict (clave) do nothing`; una segunda corrida no cambia nada ni pisa lo que se
--   haya editado después. Si ya existe un estilo con el mismo `slug` y otro id, la
--   transacción falla entera y no escribe nada (no mezcla catálogos).
-- * Tests: tests/unit/db-seed.test.ts (PGlite, migraciones + seed dos veces).
--
-- Los estilos se insertan con `start_position_id` antes que sus posiciones: la FK a
-- `positions (style_id, id)` es diferida y se comprueba en el `commit`.

begin;

-- ── Estilos (= supabase/functions/_shared/core/style.ts, motor-de-ritmo §1) ─────────────

insert into public.dance_styles (
  id, slug, name, beats_per_phrase, spoken_beats, call_beat, call_span_beats,
  lead_in_phrases, has_roles, start_position_id, published, sort_order
) values
  ('a0000000-0000-4000-8000-000000000001', 'salsa-casino', 'Salsa casino', 8,
   '{1,2,3,5,6,7}', 5, 2, 1, true, 'a1000000-0000-4000-8000-000000000001', true, 1),
  ('a0000000-0000-4000-8000-000000000002', 'merengue', 'Merengue', 8,
   '{1,2,3,4,5,6,7,8}', 5, 2, 1, true, 'a2000000-0000-4000-8000-000000000001', true, 2)
on conflict (id) do nothing;

-- ── Bandas de dificultad por BPM (D137) — PROPUESTA para César (CONTENT_CHECKLIST fila 77)
-- Tope de BPM de cada nivel, ascendente (`private.song_difficulty`): nivel n = primer tope con
-- BPM ≤ tope; por encima del último, nivel 5. Salsa casino se baila de ~150 a ~220 BPM (timba
-- rápida arriba); merengue de ~110 a ~170. Se ponen solo si el estilo no tiene bandas (null o
-- vacías): nunca pisan las que César haya editado, y una segunda corrida no cambia nada.

update public.dance_styles d
set difficulty_bpm_bands = v.bands::smallint[]
from (values
  ('a0000000-0000-4000-8000-000000000001', '{170,185,200,215}'), -- salsa casino
  ('a0000000-0000-4000-8000-000000000002', '{125,140,155,170}')  -- merengue
) as v (id, bands)
where d.id = v.id::uuid
  and coalesce(cardinality(d.difficulty_bpm_bands), 0) = 0;

-- ── Posiciones (D053)────────────────────────────────────────────────────────────────
-- Salsa: guapea (inicial, abierta frente a frente con una o dos manos), cerrada y abierta
-- (separados tras el abanico). Merengue: cerrada (inicial) y abierta.

insert into public.positions (id, style_id, slug, name) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'guapea', 'Guapea'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'cerrada', 'Cerrada'),
  ('a1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'abierta', 'Abierta'),
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'cerrada', 'Cerrada'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'abierta', 'Abierta')
on conflict (id) do nothing;

-- ── Pasos ────────────────────────────────────────────────────────────────────────────
-- Las posiciones van por slug y se resuelven dentro del estilo. Pasos base (relleno del
-- generador, `isBaseStep`): categoría `base` con la misma posición de entrada y salida.

insert into public.steps (
  id, style_id, slug, name, description, beat_notes, category, difficulty,
  start_position_id, end_position_id, phrases, can_start, can_end, repeatable,
  variation_of, published, sort_order
)
select v.id::uuid, v.style_id::uuid, v.slug, v.name, v.description, v.beat_notes::jsonb,
  v.category::public.step_category, v.difficulty, ps.id, pe.id, v.phrases, v.can_start,
  v.can_end, v.repeatable, v.variation_of::uuid, true, v.sort_order
from (values
  -- Salsa casino
  ('b1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'guapea', 'Guapea',
   'Paso base en posición abierta: los dos marcan atrás y adelante frente a frente.',
   '[{"beat":1,"note":"Atrás con el pie izquierdo"},{"beat":5,"note":"Adelante, de vuelta al centro"}]',
   'base', 1, 'guapea', 'guapea', 1, true, true, true, null, 1),
  ('b1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'basico-cerrada', 'Básico en cerrada',
   'Paso base en posición cerrada, sin soltar el abrazo.',
   '[{"beat":1,"note":"Adelante"},{"beat":5,"note":"Atrás"}]',
   'base', 1, 'cerrada', 'cerrada', 1, false, true, true, null, 2),
  ('b1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'dile-que-si', 'Dile que sí',
   'Desde la guapea, el líder recoge a la pareja y la lleva a posición cerrada.',
   '[{"beat":1,"note":"Prepara con la mano izquierda"},{"beat":5,"note":"Cierra el abrazo"}]',
   'entrada', 1, 'guapea', 'cerrada', 1, true, true, false, null, 3),
  ('b1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'dile-que-no', 'Dile que no',
   'Desde cerrada, el líder abre a la pareja a su derecha y quedan en guapea.',
   '[{"beat":1,"note":"Atrás, marca la salida"},{"beat":5,"note":"La pareja cruza por delante"}]',
   'salida', 1, 'cerrada', 'guapea', 1, false, true, false, null, 4),
  ('b1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'vuelta-derecha', 'Vuelta a la derecha',
   'Vuelta de la pareja hacia su derecha desde la guapea.',
   '[{"beat":1,"note":"Prepara"},{"beat":5,"note":"Gira la pareja"}]',
   'vuelta', 1, 'guapea', 'guapea', 1, true, true, false, null, 5),
  ('b1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'vuelta-izquierda', 'Vuelta a la izquierda',
   'Vuelta de la pareja hacia su izquierda desde la guapea.',
   '[{"beat":1,"note":"Prepara al otro lado"},{"beat":5,"note":"Gira la pareja"}]',
   'vuelta', 2, 'guapea', 'guapea', 1, false, true, false, null, 6),
  ('b1000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'enchufla', 'Enchufla',
   'Desde cerrada, los dos cambian de lugar con una vuelta de la pareja y quedan en guapea.',
   '[{"beat":1,"note":"Rompe atrás"},{"beat":5,"note":"Cambio de lugar"}]',
   'salida', 2, 'cerrada', 'guapea', 1, false, true, false, null, 7),
  ('b1000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'enchufla-doble', 'Enchufla doble',
   'La enchufla con una segunda vuelta de la pareja antes de quedar en guapea.',
   '[{"beat":1,"note":"Primera enchufla"},{"beat":5,"note":"Segunda vuelta"}]',
   'variacion', 3, 'cerrada', 'guapea', 2, false, true, false, 'b1000000-0000-4000-8000-000000000007', 8),
  ('b1000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'exhibela', 'Exhíbela',
   'El líder muestra a la pareja pasándola de un lado a otro, sin salir de la guapea.',
   '[{"beat":1,"note":"Lleva a la pareja a tu lado"},{"beat":5,"note":"Devuélvela al frente"}]',
   'figura', 2, 'guapea', 'guapea', 2, false, true, false, null, 9),
  ('b1000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'dame', 'Dame',
   'Desde cerrada, el líder gira a la pareja y la recibe de nuevo en el abrazo.',
   '[{"beat":1,"note":"Suelta y marca"},{"beat":5,"note":"Recibe a la pareja"}]',
   'figura', 2, 'cerrada', 'cerrada', 1, false, true, true, null, 10),
  ('b1000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'el-uno', 'El uno',
   'Figura corta en cerrada con un giro del líder.',
   '[{"beat":1,"note":"Marca con la mano"},{"beat":5,"note":"Gira el líder"}]',
   'figura', 2, 'cerrada', 'cerrada', 1, false, true, false, null, 11),
  ('b1000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'vacilala', 'Vacílala',
   'Desde cerrada, el líder hace girar a la pareja a su alrededor y la recoge.',
   '[{"beat":1,"note":"Abre el abrazo"},{"beat":5,"note":"Vuelta de la pareja"}]',
   'figura', 2, 'cerrada', 'cerrada', 2, false, true, false, null, 12),
  ('b1000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'sombrero', 'Sombrero',
   'Los brazos pasan por encima de la cabeza del líder, como un sombrero.',
   '[{"beat":1,"note":"Toma las dos manos"},{"beat":5,"note":"Brazos sobre la cabeza"}]',
   'figura', 3, 'cerrada', 'cerrada', 2, false, true, false, null, 13),
  ('b1000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'setenta', 'Setenta',
   'Figura larga de manos cruzadas que termina en guapea.',
   '[{"beat":1,"note":"Cruza las manos"},{"beat":5,"note":"Vuelta del líder por debajo"}]',
   'figura', 3, 'cerrada', 'guapea', 3, false, true, false, null, 14),
  ('b1000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'kentucky', 'Kentucky',
   'Figura de dos manos en cerrada con vueltas encadenadas.',
   '[{"beat":1,"note":"Toma las dos manos"},{"beat":5,"note":"Encadena las vueltas"}]',
   'figura', 4, 'cerrada', 'cerrada', 2, false, true, false, null, 15),
  ('b1000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001', 'prima', 'Prima',
   'Figura en cerrada con un pase por detrás del líder.',
   '[{"beat":1,"note":"Prepara"},{"beat":5,"note":"Pase por detrás"}]',
   'figura', 3, 'cerrada', 'cerrada', 2, false, true, false, null, 16),
  ('b1000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'montana', 'Montaña',
   'Figura de brazos altos en cerrada, con subida y bajada de manos.',
   '[{"beat":1,"note":"Sube los brazos"},{"beat":5,"note":"Baja en el abrazo"}]',
   'figura', 3, 'cerrada', 'cerrada', 2, false, true, false, null, 17),
  ('b1000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000001', 'abanico', 'Abanico',
   'Desde cerrada, el líder abre a la pareja hacia un lado y quedan separados.',
   '[{"beat":1,"note":"Marca atrás"},{"beat":5,"note":"Abre a la pareja"}]',
   'figura', 2, 'cerrada', 'abierta', 1, false, false, false, null, 18),
  ('b1000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', 'paseala', 'Paséala',
   'En abierta, el líder pasea a la pareja a su alrededor.',
   '[{"beat":1,"note":"Camina con la pareja"},{"beat":5,"note":"Sigue el paseo"}]',
   'figura', 2, 'abierta', 'abierta', 1, false, false, false, null, 19),
  ('b1000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'cierre-al-centro', 'Cierre al centro',
   'Desde abierta, los dos vuelven al centro y cierran el abrazo.',
   '[{"beat":1,"note":"Acércate"},{"beat":5,"note":"Cierra el abrazo"}]',
   'entrada', 1, 'abierta', 'cerrada', 1, false, true, false, null, 20),
  -- Merengue
  ('b2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'basico', 'Básico',
   'Marcha en el sitio en posición cerrada, un paso por tiempo.',
   '[{"beat":1,"note":"Izquierdo"},{"beat":2,"note":"Derecho"}]',
   'base', 1, 'cerrada', 'cerrada', 1, true, true, true, null, 1),
  ('b2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'basico-lateral', 'Básico lateral',
   'El básico desplazándose de lado, sin soltar el abrazo.',
   '[{"beat":1,"note":"Abre de lado"},{"beat":2,"note":"Junta"}]',
   'variacion', 1, 'cerrada', 'cerrada', 1, true, true, true, 'b2000000-0000-4000-8000-000000000001', 2),
  ('b2000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'basico-abierta', 'Básico en abierta',
   'La marcha del básico tomados de las manos, frente a frente.',
   '[{"beat":1,"note":"Izquierdo"},{"beat":2,"note":"Derecho"}]',
   'base', 1, 'abierta', 'abierta', 1, false, true, true, null, 3),
  ('b2000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'apertura', 'Apertura',
   'Desde cerrada, los dos se separan a posición abierta sin soltar las manos.',
   '[{"beat":1,"note":"Suelta el abrazo"},{"beat":5,"note":"Abre las manos"}]',
   'salida', 1, 'cerrada', 'abierta', 1, true, true, false, null, 4),
  ('b2000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'cierre', 'Cierre',
   'Desde abierta, los dos vuelven al abrazo.',
   '[{"beat":1,"note":"Acércate"},{"beat":5,"note":"Cierra el abrazo"}]',
   'entrada', 1, 'abierta', 'cerrada', 1, false, true, false, null, 5),
  ('b2000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'vuelta-dama', 'Vuelta de la dama',
   'En abierta, la pareja gira bajo el brazo del líder.',
   '[{"beat":1,"note":"Sube la mano"},{"beat":5,"note":"Termina la vuelta"}]',
   'vuelta', 1, 'abierta', 'abierta', 1, false, true, false, null, 6),
  ('b2000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'vuelta-caballero', 'Vuelta del caballero',
   'En abierta, el líder gira bajo su propio brazo.',
   '[{"beat":1,"note":"Sube la mano"},{"beat":5,"note":"Gira el líder"}]',
   'vuelta', 2, 'abierta', 'abierta', 1, false, true, false, null, 7),
  ('b2000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 'vuelta-cerrada', 'Vuelta en cerrada',
   'Los dos giran juntos en el sitio sin soltar el abrazo.',
   '[{"beat":1,"note":"Empieza a girar"},{"beat":5,"note":"Completa la vuelta"}]',
   'vuelta', 2, 'cerrada', 'cerrada', 1, false, true, false, null, 8),
  ('b2000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002', 'paseo', 'Paseo',
   'En cerrada, la pareja avanza por la pista marcando el básico.',
   '[{"beat":1,"note":"Avanza"},{"beat":5,"note":"Sigue avanzando"}]',
   'figura', 2, 'cerrada', 'cerrada', 2, false, true, false, null, 9),
  ('b2000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', 'manos-cruzadas', 'Manos cruzadas',
   'En abierta, con las manos cruzadas, la pareja gira y deshace el cruce.',
   '[{"beat":1,"note":"Cruza las manos"},{"beat":5,"note":"Deshaz el cruce"}]',
   'figura', 3, 'abierta', 'abierta', 2, false, true, false, null, 10),
  ('b2000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', 'candado', 'Candado',
   'Desde abierta, el brazo de la pareja queda a su espalda y los dos terminan en cerrada.',
   '[{"beat":1,"note":"Lleva el brazo a la espalda"},{"beat":5,"note":"Cierra el abrazo"}]',
   'figura', 3, 'abierta', 'cerrada', 2, false, true, false, null, 11)
) as v (id, style_id, slug, name, description, beat_notes, category, difficulty,
        start_slug, end_slug, phrases, can_start, can_end, repeatable, variation_of, sort_order)
join public.positions ps on ps.style_id = v.style_id::uuid and ps.slug = v.start_slug
join public.positions pe on pe.style_id = v.style_id::uuid and pe.slug = v.end_slug
order by v.variation_of nulls first
on conflict (id) do nothing;

-- Prerrequisitos (por slug, dentro del estilo).
insert into public.step_prerequisites (step_id, requires_step_id)
select s.id, r.id
from (values
  ('a0000000-0000-4000-8000-000000000001', 'setenta', 'enchufla'),
  ('a0000000-0000-4000-8000-000000000001', 'enchufla-doble', 'enchufla'),
  ('a0000000-0000-4000-8000-000000000001', 'kentucky', 'sombrero'),
  ('a0000000-0000-4000-8000-000000000001', 'paseala', 'abanico'),
  ('a0000000-0000-4000-8000-000000000002', 'vuelta-caballero', 'vuelta-dama'),
  ('a0000000-0000-4000-8000-000000000002', 'candado', 'manos-cruzadas')
) as v (style_id, slug, requires_slug)
join public.steps s on s.style_id = v.style_id::uuid and s.slug = v.slug
join public.steps r on r.style_id = v.style_id::uuid and r.slug = v.requires_slug
on conflict (step_id, requires_step_id) do nothing;

-- ── Canciones de prueba (D054) ───────────────────────────────────────────────────────
-- Sin audio, sin licencia y sin publicar (D009): títulos y artista son claramente de
-- prueba, no de canciones reales. Rejilla por anclas (D010, motor-de-ritmo §2): beat 0 = el
-- primer "1"; `bpm` es el promedio informativo; `dance_end_ms` ≤ `duration_ms`.

insert into public.songs (
  id, title, artist, audio_path, duration_ms, bpm, beat_grid, dance_end_ms, published
) values
  ('c0000000-0000-4000-8000-000000000001', 'Pista de prueba 1 · casino lento', 'Melao (placeholder)', null,
   210000, 160.0, '[{"beat":0,"tMs":1500},{"beat":512,"tMs":193500}]', 195000, false),
  ('c0000000-0000-4000-8000-000000000002', 'Pista de prueba 2 · casino medio', 'Melao (placeholder)', null,
   200000, 180.0, '[{"beat":0,"tMs":2000},{"beat":540,"tMs":182000}]', 185000, false),
  ('c0000000-0000-4000-8000-000000000003', 'Pista de prueba 3 · casino rápido', 'Melao (placeholder)', null,
   195000, 200.0, '[{"beat":0,"tMs":1200},{"beat":600,"tMs":181200}]', 182000, false),
  ('c0000000-0000-4000-8000-000000000004', 'Pista de prueba 4 · merengue medio', 'Melao (placeholder)', null,
   175000, 120.0, '[{"beat":0,"tMs":1000},{"beat":320,"tMs":161000}]', 162000, false),
  -- Tres anclas: el tempo se acelera un poco en la segunda mitad (400 → 398 ms por beat).
  ('c0000000-0000-4000-8000-000000000005', 'Pista de prueba 5 · merengue rápido', 'Melao (placeholder)', null,
   170000, 150.4, '[{"beat":0,"tMs":800},{"beat":200,"tMs":80800},{"beat":400,"tMs":160400}]', 161000, false)
on conflict (id) do nothing;

insert into public.song_styles (song_id, style_id) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002')
on conflict (song_id, style_id) do nothing;

-- ── Cursos: uno por estilo, 2 unidades × 3 lecciones (producto.md §2) ────────────────

insert into public.courses (id, style_id, title, description, published) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Salsa casino desde cero',
   'De la guapea a tus primeras figuras en rueda de a dos, frase a frase.', true),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Merengue desde cero',
   'Del básico a las vueltas y figuras de manos, frase a frase.', true)
on conflict (id) do nothing;

insert into public.course_units (id, course_id, position, title) values
  ('d1000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 1, 'Fundamentos'),
  ('d1000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 2, 'Primeras figuras'),
  ('d1000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000002', 1, 'Fundamentos'),
  ('d1000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000002', 2, 'Vueltas y figuras')
on conflict (id) do nothing;

insert into public.lessons (
  id, unit_id, position, title, intro, practice_song_id, practice_phrases, final_song_id
) values
  -- Salsa · Fundamentos
  ('d2000000-0000-4000-8000-000000000111', 'd1000000-0000-4000-8000-000000000011', 1, 'La guapea',
   'El paso con el que empieza todo: atrás y adelante, frente a frente.',
   'c0000000-0000-4000-8000-000000000001', 4, 'c0000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000112', 'd1000000-0000-4000-8000-000000000011', 2, 'Entrar y salir de cerrada',
   'Del abrazo a la guapea y de vuelta: Dile que sí y Dile que no.',
   'c0000000-0000-4000-8000-000000000001', 4, 'c0000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000113', 'd1000000-0000-4000-8000-000000000011', 3, 'Primeras vueltas',
   'La vuelta a la derecha y la enchufla, el cambio de lugar.',
   'c0000000-0000-4000-8000-000000000001', 4, 'c0000000-0000-4000-8000-000000000002'),
  -- Salsa · Primeras figuras
  ('d2000000-0000-4000-8000-000000000121', 'd1000000-0000-4000-8000-000000000012', 1, 'Exhíbela y Dame',
   'Dos figuras cortas para lucir a la pareja.',
   'c0000000-0000-4000-8000-000000000002', 6, 'c0000000-0000-4000-8000-000000000002'),
  ('d2000000-0000-4000-8000-000000000122', 'd1000000-0000-4000-8000-000000000012', 2, 'Vacílala y Sombrero',
   'Vueltas alrededor del líder y brazos sobre la cabeza.',
   'c0000000-0000-4000-8000-000000000002', 6, 'c0000000-0000-4000-8000-000000000002'),
  ('d2000000-0000-4000-8000-000000000123', 'd1000000-0000-4000-8000-000000000012', 3, 'El setenta',
   'Tu primera figura larga: tres frases de manos cruzadas.',
   'c0000000-0000-4000-8000-000000000002', 6, 'c0000000-0000-4000-8000-000000000003'),
  -- Merengue · Fundamentos
  ('d2000000-0000-4000-8000-000000000211', 'd1000000-0000-4000-8000-000000000021', 1, 'El básico',
   'La marcha del merengue, en el sitio y de lado.',
   'c0000000-0000-4000-8000-000000000004', 4, 'c0000000-0000-4000-8000-000000000004'),
  ('d2000000-0000-4000-8000-000000000212', 'd1000000-0000-4000-8000-000000000021', 2, 'Abrir y cerrar',
   'Salir del abrazo a posición abierta y volver a él.',
   'c0000000-0000-4000-8000-000000000004', 4, 'c0000000-0000-4000-8000-000000000004'),
  ('d2000000-0000-4000-8000-000000000213', 'd1000000-0000-4000-8000-000000000021', 3, 'Vuelta de la dama',
   'La primera vuelta bajo el brazo, desde abierta.',
   'c0000000-0000-4000-8000-000000000004', 4, 'c0000000-0000-4000-8000-000000000004'),
  -- Merengue · Vueltas y figuras
  ('d2000000-0000-4000-8000-000000000221', 'd1000000-0000-4000-8000-000000000022', 1, 'Más vueltas',
   'La vuelta del caballero y la vuelta en cerrada.',
   'c0000000-0000-4000-8000-000000000004', 6, 'c0000000-0000-4000-8000-000000000005'),
  ('d2000000-0000-4000-8000-000000000222', 'd1000000-0000-4000-8000-000000000022', 2, 'El paseo',
   'Avanzar por la pista sin soltar el abrazo.',
   'c0000000-0000-4000-8000-000000000005', 6, 'c0000000-0000-4000-8000-000000000005'),
  ('d2000000-0000-4000-8000-000000000223', 'd1000000-0000-4000-8000-000000000022', 3, 'Manos cruzadas y candado',
   'Dos figuras de manos que terminan de vuelta en el abrazo.',
   'c0000000-0000-4000-8000-000000000005', 6, 'c0000000-0000-4000-8000-000000000005')
on conflict (id) do nothing;

-- Pasos de cada lección, en orden (por slug, dentro del estilo del curso).
insert into public.lesson_steps (lesson_id, step_id, position)
select v.lesson_id::uuid, s.id, v.position
from (values
  ('d2000000-0000-4000-8000-000000000111', 'a0000000-0000-4000-8000-000000000001', 'guapea', 1),
  ('d2000000-0000-4000-8000-000000000112', 'a0000000-0000-4000-8000-000000000001', 'dile-que-si', 1),
  ('d2000000-0000-4000-8000-000000000112', 'a0000000-0000-4000-8000-000000000001', 'basico-cerrada', 2),
  ('d2000000-0000-4000-8000-000000000112', 'a0000000-0000-4000-8000-000000000001', 'dile-que-no', 3),
  ('d2000000-0000-4000-8000-000000000113', 'a0000000-0000-4000-8000-000000000001', 'vuelta-derecha', 1),
  ('d2000000-0000-4000-8000-000000000113', 'a0000000-0000-4000-8000-000000000001', 'enchufla', 2),
  ('d2000000-0000-4000-8000-000000000121', 'a0000000-0000-4000-8000-000000000001', 'exhibela', 1),
  ('d2000000-0000-4000-8000-000000000121', 'a0000000-0000-4000-8000-000000000001', 'dame', 2),
  ('d2000000-0000-4000-8000-000000000122', 'a0000000-0000-4000-8000-000000000001', 'vacilala', 1),
  ('d2000000-0000-4000-8000-000000000122', 'a0000000-0000-4000-8000-000000000001', 'sombrero', 2),
  ('d2000000-0000-4000-8000-000000000123', 'a0000000-0000-4000-8000-000000000001', 'setenta', 1),
  ('d2000000-0000-4000-8000-000000000211', 'a0000000-0000-4000-8000-000000000002', 'basico', 1),
  ('d2000000-0000-4000-8000-000000000211', 'a0000000-0000-4000-8000-000000000002', 'basico-lateral', 2),
  ('d2000000-0000-4000-8000-000000000212', 'a0000000-0000-4000-8000-000000000002', 'apertura', 1),
  ('d2000000-0000-4000-8000-000000000212', 'a0000000-0000-4000-8000-000000000002', 'basico-abierta', 2),
  ('d2000000-0000-4000-8000-000000000212', 'a0000000-0000-4000-8000-000000000002', 'cierre', 3),
  ('d2000000-0000-4000-8000-000000000213', 'a0000000-0000-4000-8000-000000000002', 'vuelta-dama', 1),
  ('d2000000-0000-4000-8000-000000000221', 'a0000000-0000-4000-8000-000000000002', 'vuelta-caballero', 1),
  ('d2000000-0000-4000-8000-000000000221', 'a0000000-0000-4000-8000-000000000002', 'vuelta-cerrada', 2),
  ('d2000000-0000-4000-8000-000000000222', 'a0000000-0000-4000-8000-000000000002', 'paseo', 1),
  ('d2000000-0000-4000-8000-000000000223', 'a0000000-0000-4000-8000-000000000002', 'manos-cruzadas', 1),
  ('d2000000-0000-4000-8000-000000000223', 'a0000000-0000-4000-8000-000000000002', 'candado', 2)
) as v (lesson_id, style_id, slug, position)
join public.steps s on s.style_id = v.style_id::uuid and s.slug = v.slug
on conflict (lesson_id, step_id) do nothing;

commit;
