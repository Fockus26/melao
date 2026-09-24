# Fase 07 — Backend

## Objetivo

La funcionalidad: autenticación, sesiones, persistencia, formularios reales, pagos.

Ejecuta `backend-build`.

## Alcance

- Modelo de datos y migraciones.
- Autenticación: registro, login, sesión, cierre, recuperación de contraseña.
- Autorización: protección de rutas **en el servidor**.
- Persistencia de datos de usuario.
- Formularios con validación de servidor (esquema zod compartido).
- Pasarela de pago: checkout, webhooks idempotentes con firma verificada.
- Variables de entorno documentadas en `.env.example`.

## Entradas

`context/PROJECT_CONTEXT.md` (servicios externos decididos) · el contrato de UI que espera el
frontend · fases 01-06 cerradas

## Unidades de trabajo

En Melao esta fase se parte en dos (D001). Todo contrato nuevo se documenta en `docs/spec/`
en el mismo PR (D003, D005).

**07a — Fundación (en paralelo al diseño, sin UI):**

1. Spike del motor de audio en Android de gama media + iPhone (ver `plans/pendientes.md`)
2. Proyecto Supabase, esquema y migraciones, RLS de todas las tablas, tipos generados
3. Core de dominio en `supabase/functions/_shared/core/`: rejilla de beats, frases
   disponibles, generador de combinaciones, línea de tiempo del coach, envoltura de FSRS —
   con tests (`bun test`) y vectores en `docs/spec/vectors/`
4. Edge Functions: `plan-session`, `review-steps`, `activate-subscription`
5. Seed con contenido placeholder realista (un estilo, pasos, posiciones, 2 canciones)

**07b — Integración (tras la fase 06):**

6. Auth: registro, login (email + Google), sesión, protección de rutas en el servidor, cierre
7. Auth: recuperación de contraseña
8. Onboarding y preferencias (estilo, rol, tema, coach)
9. Curso: camino, lección, progreso
10. Práctica: configurador, sesión (reproductor web), calificación
11. Catálogo de pasos, favoritos, progreso
12. Suscripción placeholder: planes, checkout, activación, control de acceso
13. Panel admin: estilos, pasos, canciones (analizador de ritmo), cursos, usuarios

**v2 — Consultoría:** hilos y mensajes en tiempo real, subida de videos del alumno,
corrección con marcas de tiempo.

(Pagos reales y webhooks: fuera de la v1 — ver `plans/pendientes.md`.)

## Criterio de cierre

- [ ] Cero secretos en el código; `.env.example` completo y sin valores reales.
- [ ] Validación de servidor en toda entrada.
- [ ] Rutas protegidas en el servidor, no solo escondidas en la UI.
- [ ] El precio se calcula en el servidor; nunca se confía en el monto del cliente.
- [ ] Webhooks con firma verificada e idempotentes.
- [ ] Contrato de UI documentado para el frontend.
- [ ] `functional-qa` lanzado al cerrar cada flujo completo, y sus hallazgos críticos
      resueltos.
- [ ] Acciones manuales de César documentadas con pasos exactos.
