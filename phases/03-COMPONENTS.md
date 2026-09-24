# Fase 03 — Componentes

## Objetivo

Los primitivos de `components/ui/` que todo lo demás va a usar.

## Alcance

- Traer de la librería elegida (`PROJECT_CONTEXT.md`) lo que aplique y estilizarlo con los
  tokens del proyecto.
- Implementar los componentes propios del handoff que no tengan equivalente.
- **Todos los estados** de cada uno: reposo, hover, foco, activo, deshabilitado, cargando,
  error.
- Variantes y tamaños.
- Comportamiento responsive de cada componente.
- Documentar cada uno en `COMPONENTS_INVENTORY.md`.

## Entradas

`design/HANDOFF.md` §2 · fases 01-02 cerradas

## Unidades de trabajo

Agrupa por familia, una rama por grupo. No hagas doce componentes en un commit.

1. Botones y enlaces
2. Formularios (input, textarea, select, checkbox, radio, switch, label, mensaje de error)
3. Contenedores (card, panel, separador)
4. Overlays (dialog, sheet, popover, tooltip, dropdown)
5. Navegación (navbar, menú mobile, tabs, breadcrumb, paginación)
6. Retroalimentación (badge, alert, toast, skeleton, spinner, estado vacío)
7. Los específicos del proyecto

## Criterio de cierre

- [ ] Todo componente del handoff implementado, con todos sus estados.
- [ ] Cero valores mágicos: `grep -rnE '\[[0-9]+px\]|\[#[0-9a-fA-F]{3,8}\]' components/` limpio.
- [ ] Foco visible y con contraste ≥3:1 en todos.
- [ ] Los widgets compuestos siguen el patrón de WAI-ARIA Authoring Practices.
- [ ] Existe una página de referencia con todos los componentes y sus estados.
- [ ] `COMPONENTS_INVENTORY.md` completo.
- [ ] Puerta `a11y` en verde.

## Regla

**Antes de crear un componente nuevo, revisa el inventario.** Dos componentes que hacen lo
mismo con nombres distintos es la deuda más cara de un sistema de diseño: se descubre tarde
y arreglarla toca todas las páginas.
