# D070 · Componentes · Motor falso solo para la muestra; estados antes de sonar y confirmación de salida · Implementado

**Decisión:** `lib/stage/fake-source.ts` arma plan + línea de tiempo con el core (salsa,
184 BPM constante, Guapea ×2 con repetición) y avanza con `requestAnimationFrame`: solo
para `/escenario` y tests. Preparando y bloqueado ocupan el lugar de cuenta + siguiente
(spinner 40 + %, botón circular 160) y los controles quedan invisibles con su alto. Terminada:
el botón principal dice "Empezar de nuevo". Abrir la confirmación de salida pausa; "Seguir
bailando" (o Esc) reanuda si sonaba. El diálogo lleva `dark` + `stage-panel` porque su
portal sale del subárbol del escenario.
**Por qué:** el handoff no dibuja los controles en preparando ni el final (el resultado es
otra pantalla); lo conservador es no ofrecer acciones que aún no sirven y no seguir contando
mientras el alumno decide si sale.
**Alternativa descartada:** controles deshabilitados con explicación (más ruido que ayuda);
salir sin pausar.
