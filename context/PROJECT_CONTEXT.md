# Project Context — Melao

> Generado por `project-kickoff` (2026-09-24) a partir de la entrevista inicial. Es el primer
> archivo que lee cualquier agente que entre al proyecto. Lo que no existe todavía dice
> `PENDIENTE` y tiene su fila en `CONTENT_CHECKLIST.md`.

## Resumen

Melao es una app *mobile-first* de suscripción para aprender y practicar bailes latinos,
empezando por salsa casino y merengue. Enseña con un camino de lecciones en video por rol,
entrena con un coach por voz sincronizado con el ritmo real de cada canción y decide qué
repasar con repetición espaciada (FSRS) según cómo el alumno califica cada paso del 1 al 4.

## Tipo de proyecto

App web (dashboard/app) *mobile-first*. Hoy: Next.js. Después: Android nativo (Kotlin) y
luego iOS nativo (Swift), que reimplementan la misma UI y funcionalidad sobre el mismo
backend (D003, D005). El contrato multiplataforma vive en `docs/spec/`.

## Negocio

- **Qué hace:** curso por lecciones (estilo Duolingo) + práctica libre con canciones y
  combinaciones + repaso espaciado (estilo Anki). Plan superior con consultoría personalizada.
- **Qué debe lograr:** que el alumno practique con regularidad y pague la mensualidad.
- **Acción principal:** completar una práctica con el coach (lección o práctica libre).
- **Modelo:** suscripción mensual. Básico ~$20 USD/mes (**PENDIENTE confirmar**), Consultoría
  (**PENDIENTE precio**). Sin pasarela en la v1: el pago es un placeholder que activa por $0.
- **Profesor y admin:** César (único). El rol `teacher` existe en el modelo para el futuro.

## Público objetivo

Alumnos de salsa y merengue (principiantes e intermedios) que toman clases y necesitan
practicar solos en casa: repasar los pasos que les cuestan, bailar combinaciones sobre
canciones reales y escuchar un "cantante" de rueda que les dice qué paso viene.

## Tono de marca

Elegante, sereno, cálido, preciso.

**No debe parecer:** una app genérica de fitness; un cartel folclórico recargado (kitsch);
un juego infantil con mascota.

## Idioma y mercado

- Idioma: español (neutro latinoamericano). Un solo idioma en la v1; textos en
  `messages/es.json`.
- País / locale: Latinoamérica, `es-419` (**PENDIENTE** si hay un país principal).
- Moneda y formato: USD, `$20` / mes.

## Referencias

- Duolingo — por el camino de lecciones numeradas con desbloqueo progresivo.
- Anki — por la repetición espaciada con 4 botones de calificación (FSRS).
- Coach de rueda de casino — por el cantante que anuncia la figura antes del "1".

## Restricciones de marca

- **Logo:** C1 · Modulada (D026): baldosa negra con la M, sin dorado en la marca; SVG y variantes por exportar del lienzo (`design/HANDOFF.md` §5).
- **Colores:** blanco domina, dorado acento, negro acompañante (ver `COLORS.md`).
- **Tipografía:** ninguna obligatoria (ver `TYPOGRAPHY.md`).
- **Otras:** la pantalla de práctica siempre en modo escenario (negro), legible a 2 m.

## Stack técnico

- Framework: Next.js 16 (App Router) + React 19 + React Compiler
- Lenguaje: TypeScript estricto
- Componentes: **shadcn/ui** (Radix) — razón: diseño propio y específico; el código es del repo
- Estilos: **Tailwind CSS v4** — uno solo
- Linter / formato: Biome
- Gestor de paquetes: **bun**
- Documentación: **Context7** antes de usar la API de cualquier librería
- Base de datos: Supabase Postgres (RLS en toda tabla) · migraciones con Supabase CLI ·
  proyecto `melao` (ref `myombgpqvzoaweudfvdv`, us-east-2), creado el 2026-09-26
- Autenticación: Supabase Auth — email + contraseña y Google (Apple se suma antes de iOS)
- Lógica de dominio: Edge Functions de Supabase (TypeScript); core puro en
  `supabase/functions/_shared/core/`
- Almacenamiento: Supabase Storage privado con URLs firmadas (videos, canciones, voz)
- Pagos: N/A en v1 (placeholder). Futuro: web con pasarela; Android/iOS con la facturación
  de cada tienda (riesgo en `plans/pendientes.md`)
- Correo: correo de Supabase Auth; remitente propio **PENDIENTE**
- Audio: Web Audio API (programador con *lookahead*), Wake Lock
- Despliegue: Vercel (web) + Supabase Cloud
- Dominio: **PENDIENTE**

## Alcance de páginas

Detalle y secciones en `PAGE_INVENTORY.md` y `docs/spec/pantallas.md`.

| Página | Ruta | Prioridad |
|---|---|---|
| Landing | `/` | media |
| Planes / Checkout placeholder | `/planes` · `/checkout` | alta |
| Auth | `/entrar` · `/registro` · `/recuperar` · `/restablecer` | alta |
| Onboarding | `/bienvenida` | alta |
| Inicio · Curso · Lección | `/app` · `/app/curso` · `/app/curso/leccion/[id]` | alta |
| Práctica (configurador, canciones, sesión, resultado) | `/app/practicar/…` | alta |
| Pasos · Progreso · Perfil | `/app/pasos` · `/app/progreso` · `/app/perfil` | alta |
| Admin | `/admin/…` | alta |
| Consultoría (v2) | `/app/consultoria/…` · `/admin/consultoria` | v2 |

## Funcionalidad más allá de lo estático

- [x] Autenticación de usuarios
- [x] Persistencia de datos de usuario (progreso, repaso, favoritos)
- [x] Pagos — solo placeholder en v1
- [ ] Carrito / checkout de productos
- [x] Dashboard (app + panel admin)
- [x] Formularios con envío real (admin, perfil)
- [x] CMS propio (panel admin: pasos, canciones, cursos)
- [x] Buscador (canciones, pasos)
- [ ] Multi-idioma (catálogo listo, un solo idioma)

## Track de fases

**Producto (01–09)** — hay auth, datos por usuario, suscripción y panel admin. Orden adaptado
(D001): **07a Fundación** en paralelo mientras se diseña; **07b Integración** tras la 06.

## Modo de trabajo

- Dark mode: **sí, completo desde la v1** (D007).
- Git: modo `pr`, sin rama madre — ver `GIT_STATE.md`.

## Particularidades

- **Backend-first (D003):** ninguna regla de negocio vive solo en Next.js (ni en Server
  Actions ni en componentes). Todo lo que Android/iOS también necesitan va a Postgres
  (RLS, funciones SQL) o a Edge Functions.
- **Contrato multiplataforma:** todo cambio de comportamiento actualiza `docs/spec/`
  en el mismo PR.
- **Licencias musicales:** solo audio con permiso de uso documentado en la canción.
- **Estilos extensibles:** un estilo nuevo (salsa venezolana, lineal On1/On2, bachata…) es
  configuración + contenido, nunca código nuevo de motor.
- **Next 16 cambia APIs:** leer `node_modules/next/dist/docs/` antes de escribir código.
