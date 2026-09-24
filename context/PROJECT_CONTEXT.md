# Project Context — {{NOMBRE_DEL_PROYECTO}}

> Generado por la skill `project-kickoff` a partir de la entrevista inicial. Es el primer
> archivo que lee cualquier agente que entre al proyecto.
>
> **Ningún `{{placeholder}}` puede sobrevivir aquí.** Si un dato no existe todavía, escribe
> `PENDIENTE` explícito y agrega la fila a `CONTENT_CHECKLIST.md`.

## Resumen

{{QUÉ ES ESTO Y QUÉ PROBLEMA RESUELVE — 2 líneas}}

## Tipo de proyecto

{{landing page | e-commerce | sitio corporativo | dashboard/app | blog | portafolio}}

## Negocio

- **Qué hace:** {{...}}
- **Qué debe lograr el sitio:** {{vender | agendar | generar leads | informar | dar soporte}}
- **Acción principal:** {{la única cosa que si el visitante no hace, el sitio falló}}

## Público objetivo

{{QUIÉN ENTRA Y QUÉ VIENE BUSCANDO}}

## Tono de marca

{{3-4 adjetivos}}

**No debe parecer:** {{2-3 cosas a evitar — guía tanto como lo anterior}}

## Idioma y mercado

- Idioma(s): {{ej. español}}
- País / locale: {{ej. Venezuela · es-VE}}
- Moneda y formato: {{ej. USD, punto decimal}}

## Referencias visuales

- {{URL o marca}} — por {{qué exactamente: la tipografía, el ritmo vertical, la densidad}}
- {{URL o marca}} — por {{...}}

## Restricciones de marca

- **Logo:** {{disponible en <ruta> | en desarrollo | no hay}}
- **Colores obligatorios:** {{hex exactos | ninguno}}
- **Tipografía obligatoria:** {{nombre exacto | ninguna}}
- **Otras:** {{...}}

## Stack técnico

- Framework: {{Next.js (App Router)}}
- Lenguaje: {{TypeScript}}
- Componentes: {{shadcn/ui | Hero UI | MUI}} — razón: {{por qué esta}}
- Estilos: {{Tailwind CSS | sx/styled de MUI}} — uno solo, nunca los dos
- Gestor de paquetes: **bun**
- Documentación: **Context7** antes de usar la API de cualquier librería
- Base de datos / ORM: {{... | N/A}}
- Autenticación: {{... | N/A}}
- Pagos: {{... | N/A}}
- Correo: {{... | N/A}}
- Despliegue: {{Vercel | VPS | hosting del cliente}}
- Dominio: {{... | pendiente}}

## Alcance de páginas

| Página | Ruta | Prioridad v1 |
|---|---|---|
| {{Home}} | `/` | {{alta}} |

## Funcionalidad más allá de lo estático

- [ ] Autenticación de usuarios
- [ ] Persistencia de datos de usuario
- [ ] Pagos
- [ ] Carrito / checkout
- [ ] Dashboard
- [ ] Formularios con envío real
- [ ] CMS / blog
- [ ] Buscador
- [ ] Multi-idioma

## Track de fases

**{{Landing | Sitio | Producto}}** — Razón: {{por qué este y no otro}}

## Modo de trabajo

- Dark mode: {{sí | no | opcional}}
- Rama madre: {{sí, `<nombre>` | no, las unidades salen de main}} — ver `GIT_STATE.md`

## Particularidades

- {{ej. "el cliente ya tiene una app con la que hay que convivir visualmente"}}
- {{ej. "los precios vienen de una API externa, nunca hardcodeados"}}
