# D136 · Colores · El tema se guarda en `profiles.theme` y en el navegador; al cargar la app con sesión, manda el perfil · Implementado

**Decisión:** elegir tema en Perfil lo aplica al instante (`lib/theme.ts`, localStorage) y lo
guarda en `profiles.theme`. La shell de las pestañas (`app/app/(tabs)/layout.tsx`, ThemeSync) lee
el del perfil y, si difiere del navegador, aplica el del perfil. Si guardar falla, vuelve al
anterior en los dos lados.
**Por qué:** el perfil es lo que comparten web, Android e iOS: elegir "Oscuro" en el teléfono
debe valer al abrir la web. El primer pintado sigue siendo el del navegador (script de `<head>`,
sin flash), así que solo cambia de golpe cuando se eligió otro en otro lado.
**Alternativa descartada:** que mande el navegador (el perfil quedaría como dato muerto entre
plataformas); leer el perfil antes de pintar (exige sesión en el script de `<head>` y atrasa el
primer pintado de todas las páginas).
