# D060 · Layout · Shells listas para montarse + muestras en `/layouts/*` con la ruta activa por prop; sin grupos de rutas reales todavía · Implementado

**Decisión:** las shells (`AppShell`, `FullscreenShell`, `PublicShell`, `AdminShell`) están en
`components/layout/` y toman la ruta activa de `usePathname()`, salvo que reciban
`currentPath`. Las muestras en `/layouts/*` (noindex, como `/primitivos`) la pasan por prop
desde `?activo=`. No se crean `app/(app)/`, `app/(public)/` ni `app/admin/` hasta que llegue
la primera pantalla de cada grupo.
**Por qué:** un grupo de rutas sin páginas solo da layouts huérfanos y 404; cada pantalla de
07b monta su shell en el `layout.tsx` de su grupo en una línea. El estado activo se calcula
con `lib/navigation.ts` (prefijo más largo por segmentos), puro y probado.
**Alternativa descartada:** crear ya los grupos con páginas vacías: obliga a decidir auth y
redirecciones (sin sesión → `/entrar`) antes de tener las pantallas.
