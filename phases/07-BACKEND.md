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

1. Modelo de datos y conexión
2. Auth: registro y login
3. Auth: sesión, protección de rutas, cierre
4. Auth: recuperación de contraseña
5. {{Dominio del proyecto: productos, pedidos, reservas…}}
6. Pagos: checkout
7. Pagos: webhooks y confirmación
8. Formularios de contacto / envío de correo

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
