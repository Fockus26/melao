# D039 · Producto · Frases disponibles N = frases completas menos las que se comió la entrada; el plan empieza en startPhrase = k · Implementado

**Decisión:** el plan empieza en `startPhrase = k`, el menor entero `≥ 0` con
`t(beatsPerPhrase · (k − leadInPhrases)) ≥ 0`, y cubre `N = max(0, M − k)` frases, donde `M`
son las frases completas desde el beat 0 con `t(B·(p+1)) ≤ danceEndMs`. Ese `N` es el que
recibe el generador de combinaciones y el "caben N figuras" de la UI
(`phraseWindow` en `_shared/core/phrases.ts`; `docs/spec/motor-de-ritmo.md` §3).
**Por qué:** la spec definía `N` desde el beat 0 y a la vez decía que el plan cubre `N` frases;
con intro corta la frase 0 es entrada, así que las dos cosas no podían ser ciertas a la vez.
Contar solo las frases donde se baila una figura es lo que el alumno ve. La fórmula general
coincide con la de la spec para `leadInPhrases = 1` y, con 2+ frases de entrada, desplaza solo
lo necesario en vez de las `leadInPhrases` enteras.
**Alternativa descartada:** `N` desde el beat 0 y que quien arma la sesión reste (cada
plataforma podía restar distinto); desplazar siempre `leadInPhrases` frases (pierde frases
bailables cuando parte de la entrada sí cabe en la intro).
