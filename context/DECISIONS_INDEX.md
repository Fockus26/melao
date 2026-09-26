# Decisions Index — Melao

> **Se busca, no se lee entero:** `grep -n "palabra" context/DECISIONS_INDEX.md`.
> Cada fila es **una línea ≤ 160 caracteres** que apunta al archivo de `decisions/` donde
> vive el detalle (qué, por qué, alternativas, cómo se verificó).

| ID | Categoría | Resumen | Archivo | Estado |
|---|---|---|---|---|
| D001 | Proceso | Fase 07 partida: 07a fundación en paralelo al diseño, 07b integración tras la 06 | `decisions/03-arquitectura.md` | Pendiente |
| D002 | Colores | Dorado #B8913A solo decorativo en claro; texto gold.700/800, gráficos gold.600 | `decisions/01-colores.md` | Aprobado (handoff) |
| D003 | Arquitectura | Backend-first: reglas en Postgres/RLS y Edge Functions; web y nativas son clientes | `decisions/03-arquitectura.md` | Pendiente |
| D004 | Arquitectura | Supabase (DB, Auth, Storage, Functions, Realtime) + Vercel | `decisions/03-arquitectura.md` | Pendiente |
| D005 | Arquitectura | Móvil: Kotlin y Swift nativos después; docs/spec es el contrato; sin Capacitor/Expo | `decisions/03-arquitectura.md` | Pendiente |
| D006 | Arquitectura | shadcn/ui + Tailwind v4 | `decisions/03-arquitectura.md` | Pendiente |
| D007 | Colores | Dark mode completo desde v1; la práctica siempre en modo escenario | `decisions/01-colores.md` | Aprobado (handoff) |
| D008 | Tipografía | Fraunces en titulares, Geist Sans (cifras tabulares) en UI y cuentas | `decisions/02-tipografia.md` | Aprobado (handoff) |
| D009 | Producto | Catálogo propio con permiso de uso; streaming (Spotify/YouTube) fuera de la v1 | `decisions/04-producto.md` | Pendiente |
| D010 | Producto | Rejilla de beats por anclas; "1" marcado por el admin; BPM con librería MIT, no Essentia | `decisions/04-producto.md` | Pendiente |
| D011 | Producto | El coach anuncia en el 5 de la última frase; no anuncia repeticiones; config por estilo | `decisions/04-producto.md` | Pendiente |
| D012 | Producto | Pasos con posición de entrada/salida; combinaciones = recorrido con semilla sobre el grafo | `decisions/04-producto.md` | Pendiente |
| D013 | Producto | FSRS en el backend; 1–4 = Again/Hard/Good/Easy; tarjeta por usuario+paso+rol | `decisions/04-producto.md` | Pendiente |
| D014 | Producto | Voz del coach con clips pregrabados en el reloj de Web Audio; sin TTS en vivo | `decisions/04-producto.md` | Pendiente |
| D015 | Producto | Suscripción placeholder activada por Edge Function; RLS bloquea escritura del cliente | `decisions/04-producto.md` | Pendiente |
| D016 | Producto | Video según rol elegido; pasos libres con video único | `decisions/04-producto.md` | Pendiente |
| D017 | Producto | Roles: student y admin en v1 (César = profesor + admin); teacher reservado | `decisions/04-producto.md` | Pendiente |
| D018 | Arquitectura | Tokens en design/tokens.json (Style Dictionary) y textos en messages/es.json | `decisions/03-arquitectura.md` | Pendiente |
| D019 | Producto | v1 = curso + práctica + admin; v2 = consultoría (se diseña ya) | `decisions/04-producto.md` | Pendiente |
| D020 | Proceso | CURRENT_PHASE, CONTENT_CHECKLIST, inventarios, PHASE_LOG y plans son locales | `decisions/03-arquitectura.md` | Implementado |
| D021 | Colores | border.input #858585 claro / #6E6E6E oscuro (≥ 3:1 en las 3 superficies) | `decisions/01-colores.md` | Aprobado (handoff) |
| D022 | Producto | Estilos de baile como configuración (cuenta, anticipación, bandas BPM, roles) | `decisions/04-producto.md` | Pendiente |
| D023 | Producto | Un rol de baile por alumno para todos los estilos + estilo por defecto | `decisions/04-producto.md` | Pendiente |
| D024 | Colores | Contraste sin excepciones: text-muted #686868, gold-700 #80621C (gold-800 = alias), success #1C7644 | `decisions/01-colores.md` | Aprobado (handoff) |
| D025 | Proceso | Versión con Changesets; PR de versión lo abre la Action y lo mergea César; pool de worktrees | `decisions/03-arquitectura.md` | Implementado |
| D026 | Diseño | Dirección Salón editorial · Gala; escenario en layout Compás; logo C1 Modulada; planes B | `decisions/05-diseno.md` | Aprobado |
| D027 | Diseño | El título del curso es el selector de estilo (abre sheet); segmentado en Practicar | `decisions/05-diseno.md` | Aprobado |
| D028 | Diseño | Progreso fuera de la barra: se abre desde Inicio y Perfil; ítem 6 del lateral (≥ 1024) | `decisions/05-diseno.md` | Aprobado |
| D029 | Producto | Precios: Básico US$20/mes, Consultoría US$40/mes; límites de Consultoría se definen en v2 | `decisions/04-producto.md` | Aprobado |
| D030 | Audio | Planificador two clocks: lookahead 200 ms, bucle 25 ms, un solo AudioContext; offset de latencia solo a la UI por defecto | `decisions/06-audio.md` | Validado en Android (D032) |
| D031 | Audio | Spike con pista sintética de 4 min (OfflineAudioContext por frases) o archivo local; clips sintéticos | `decisions/06-audio.md` | Implementado (spike) |
| D032 | Audio | Web Audio validado en Android; latencyOffsetMs solo a UI y toques, nunca a los clips (spec §6); iOS pendiente | `decisions/06-audio.md` | Aprobado (Android) · iOS pendiente |
| D033 | Arquitectura | Tokens: generador propio `scripts/tokens.ts` → `app/tokens.css` (@theme de Tailwind v4), no Style Dictionary | `decisions/07-tokens.md` | Implementado |
| D034 | Arquitectura | Tema sin flash: clase `.dark` + script inline en `<head>`, preferencia en localStorage; sin next-themes | `decisions/07-tokens.md` | Implementado |
| D035 | Tipografía | Utilidades `type-<rol>` (rol completo) y `text-<rol>` (solo tamaño); cifras tabulares en numeric-* y stage-* | `decisions/07-tokens.md` | Implementado |

<!-- ID secuencial, nunca se reutiliza; una decisión que cambia se marca "Obsoleta → D0NN"
     y se añade la nueva. Si hay unidades en paralelo, el orquestador reserva un rango de IDs
     por unidad para que no choquen. Próximo ID libre: D036. -->
