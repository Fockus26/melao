# Decisiones — Arquitectura y proceso

## D001 — Fase 07 partida: 07a Fundación en paralelo al diseño, 07b Integración tras la 06
**Decisión:** el esquema, RLS, core de dominio, Edge Functions y el spike de audio (07a)
arrancan mientras César trabaja en Claude Design. La conexión de la UI al backend (07b) va
después de la fase 06.
**Por qué:** la lógica de dominio (ritmo, combinaciones, FSRS) no depende del diseño y es el
mayor riesgo técnico; esperar al handoff para empezarla es tiempo muerto.
**Alternativa descartada:** orden estricto 01→09 del kit.
**Estado:** Pendiente

## D003 — Backend-first: toda regla de negocio vive en Supabase
**Decisión:** reglas en Postgres (RLS, funciones SQL) y Edge Functions (TypeScript). Next.js
es un cliente más. El backend entrega la sesión de práctica ya planificada como línea de
tiempo; el cliente solo reproduce.
**Por qué:** Android (Kotlin) e iOS (Swift) reimplementarán la UI. Si la lógica vive en el
backend, solo se reimplementan UI + reproductor de audio, y las tres plataformas se
comportan igual.
**Alternativa descartada:** lógica en Server Actions / componentes de Next — habría que
reescribirla en Kotlin y en Swift, con divergencias.
**Estado:** Pendiente

## D004 — Supabase + Vercel
**Decisión:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime para la
consultoría) y Vercel para la web.
**Por qué:** cubre auth, datos, videos y chat sin armar infraestructura; tiene SDK oficial para
web, Kotlin y Swift; ambos conectores ya están disponibles en el entorno de César.
**Alternativa descartada:** Firebase (NoSQL complica las consultas de repaso y estadísticas);
Postgres propio + Better Auth (más trabajo antes de la primera clase).
**Estado:** Pendiente

## D005 — Móvil: Kotlin y Swift nativos después; la web es la referencia
**Decisión:** ahora solo web (Next.js). Después Android nativo (Kotlin) y luego iOS (Swift),
reimplementando la misma UI y funcionalidad. Sin Capacitor ni Expo.
**Por qué:** decisión de César. El contrato que lo hace posible: `docs/spec/` (producto,
pantallas, API, motor de ritmo, vectores de prueba), `design/tokens.json` y
`messages/es.json`.
**Alternativa descartada:** Capacitor (empaquetar la web) y Expo universal.
**Estado:** Pendiente

## D006 — shadcn/ui + Tailwind v4
**Decisión:** componentes de shadcn/ui (Radix) copiados al repo; estilos con Tailwind v4.
**Por qué:** diseño propio y específico; accesibilidad de Radix; sin look impuesto.
**Alternativa descartada:** Hero UI (look propio difícil de quitar), MUI (sin Tailwind, look
Material).
**Estado:** Pendiente

## D018 — Tokens en JSON y textos en catálogo, reutilizables por las apps nativas
**Decisión:** tokens en `design/tokens.json` (W3C Design Tokens; Style Dictionary genera el
CSS). Textos de UI en `messages/es.json` (next-intl, un idioma).
**Por qué:** Compose y SwiftUI generan su tema del mismo JSON; los textos pasan a
`strings.xml` / `Localizable` sin reescribirlos.
**Alternativa descartada:** tokens solo en `globals.css` y textos literales en componentes.
**Estado:** Pendiente (verificar Style Dictionary y next-intl con Context7 al implementar)

## D020 — Los archivos de estado de `context/` son locales
**Decisión:** `CURRENT_PHASE`, `CONTENT_CHECKLIST`, inventarios, `PHASE_LOG/` y `plans/`
quedan en `.gitignore` (se sacan del índice sin borrarlos). En git: `PROJECT_CONTEXT`,
`DESIGN_RULES`, `COLORS`, `DESIGN_TOKENS`, `TYPOGRAPHY`, `DECISIONS_INDEX`, `decisions/`.
**Por qué:** convención del kit; en modo `pr` con PRs en paralelo, un tablero versionado
genera conflictos en cada merge.
**Alternativa descartada:** versionar todo `context/`.
**Estado:** Implementado (PR del arranque)
