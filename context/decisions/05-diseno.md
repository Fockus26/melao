# Decisiones — Diseño (handoff de Claude Design)

## D026 — Dirección "Salón editorial · Gala", escenario Compás y logo C1
**Decisión:** variante **A · Gala** de la dirección Salón editorial; la sesión de práctica usa el
layout **Compás** (cuenta en caja fija de 120 px a la izquierda); logo **C1 · Modulada** (baldosa
negra redondeada, astas gruesas y diagonales finas, sin dorado en la marca; versión reforzada para
16 px); planes en la propuesta B.
**Por qué:** elección de César en Claude Design (2026-09-25), rondas 1–4. El lienzo guarda solo el
diseño final: https://claude.ai/artifact/7WuxhQ5GhY3u1p9VgfmjNv
**Alternativa descartada:** variantes B y C de la dirección; logos C2/C3 y los tres bocetos del
arranque.
**Estado:** Aprobado — fuente: `design/HANDOFF.md`

## D027 — El título del curso es el selector de estilo
**Decisión:** en Curso, el título ("Salsa *casino*") es un botón que abre un sheet "Elige tu
estilo". En Practicar, segmentado mientras haya 2 estilos. No se implementa como `<select>`.
**Por qué:** corrección explícita de César ("más elegante"). La alternativa aprobable son pestañas
con indicador deslizante.
**Estado:** Aprobado — se implementa en la fase 05

## D028 — Progreso fuera de la barra inferior
**Decisión:** Progreso no es un destino de la barra (se mantienen 5: Inicio · Curso · Practicar ·
Pasos · Perfil). Se abre desde Inicio ("Ver progreso") y desde Perfil; en la navegación lateral
(≥ 1024 px) es el ítem 6.
**Por qué:** recomendación del handoff (§9.3), aprobada por César el 2026-09-26. Seis destinos en
la barra bajan cada uno a menos de 64 px de ancho a 360 px.
**Estado:** Aprobado — se implementa en la fase 02 (AppShell)
