# D068 · Layout · Escenario apaisado por media query (landscape y alto ≤ 32rem); lector: solo cambio de paso/estado · Implementado

**Decisión:** variante `stage-landscape` = `(orientation: landscape) and (max-height: 32rem)`
en `app/globals.css`: teléfono apaisado (844 × 390, 667 × 375). Tablet y escritorio siguen
con la columna vertical (máx. 480, centrada). Apaisado: "Ahora · paso · frase" sube a la
cabecera, cuenta + siguiente (340) + controles 56 × 56 en una fila, sin "Después" (el handoff
no lo dibuja) y la pausa sin texto visible (queda para el lector). Lector de pantalla: una
región `polite` con "Ahora: X. Siguiente: Y." al cambiar de paso, o el estado (en pausa,
toca para empezar, terminada); la cuenta es `aria-hidden` y la tira no tiene `aria-live`.
**Por qué:** por ancho, una tablet vertical de 768 caería en el layout apaisado; el alto es lo
que obliga a reordenar. Anunciar tiempos saturaría el lector 3 veces por segundo; el ritmo lo
da la voz del coach.
**Alternativa descartada:** toggle de orientación en la UI (el handoff no lo tiene); anunciar
también el "en el 5" (compite con la voz del coach en el mismo instante).
