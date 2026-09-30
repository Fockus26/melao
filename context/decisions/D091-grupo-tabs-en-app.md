# D091 · Arquitectura · `/app` usa el grupo `(tabs)` para las pestañas con AppShell; la Lección queda fuera, a pantalla completa · Implementado

**Decisión:** `app/app/(tabs)/layout.tsx` (AppShell) envuelve Inicio, Curso, Practicar, Pasos, Perfil y Progreso; las pantallas a pantalla completa (`app/app/lessons/[id]`) viven en `app/app/` fuera del grupo, sin navegación. Extiende D072 (carpeta real `app/app/`): la URL no cambia.
**Por qué:** la Lección no lleva barra ni lateral (handoff: FullscreenShell) y un layout de Next no se puede "saltar" desde una ruta hija; el grupo es la forma de tener dos shells bajo la misma carpeta sin tocar URLs.
**Alternativa descartada:** condicionar el AppShell por ruta en el layout (`usePathname`): mete lógica de cliente en la shell y renderiza la navegación un instante antes de ocultarla.
