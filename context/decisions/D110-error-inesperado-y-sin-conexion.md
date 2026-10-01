# D110 · Componentes · Error inesperado (500) con código `digest`; sin conexión como variante cuando `navigator.onLine` es false · Implementado

**Decisión:** `app/error.tsx` muestra el 500 con "Reintentar" (`retry()` de Next 16.3, que vuelve a pedir y pintar
el segmento) e "Ir al inicio" (`/`), y el `error.digest` como "Código" si existe (sin él se ocultan la fila y la
mención al código). Si el navegador está sin red (`navigator.onLine === false`, en vivo con `online`/`offline`)
muestra la variante sin conexión del mismo componente, solo con "Reintentar". `app/global-error.tsx` repite el
contenido con su propio `<html>`, `globals.css`, fuentes y script de tema. El título del documento lo pone
`ErrorScreen` con `<title>` de React (los límites de error no exportan `metadata`).
**Por qué:** una navegación que falla por red cae en el límite de error; mostrar "sin conexión" da la causa real.
`digest` es el identificador que Next expone sin filtrar el mensaje del servidor.
**Pendiente:** una página sin conexión real (service worker que sirva una copia cuando no hay red al abrir la
app) queda fuera: hoy, sin red al cargar, el navegador muestra su propia página. Al volver la red la pantalla
pasa al 500 con "Reintentar"; no reintenta sola.
**Medido:** con la red cortada, un enlace interno no llega a este límite: Next 16 recarga la página entera cuando
falla la petición RSC y el navegador pinta su propia página sin conexión. La variante cubre los errores que
ocurren estando sin red (p. ej. una lectura que falla durante el render) y el cambio en vivo; la cobertura de
"abrir sin red" llega con el service worker pendiente.
