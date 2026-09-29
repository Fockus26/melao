# D024 · Colores · Contraste sin excepciones: text-muted #686868, gold-700 #80621C (gold-800 = alias), success #1C7644 · Aprobado (handoff)

**Decisión:** text-muted #6B6B6B → #686868, gold-700 #8A6A1F → #80621C (gold-800 queda como alias
del mismo valor) y success #1E7A46 → #1C7644. Con esto todo token de texto pasa 4.5:1 en bg,
surface, sunken, gold-tint y hover. El tema oscuro no cambia.
**Por qué:** los valores anteriores fallaban sobre gold-tint o sunken (4.21–4.46) y obligaban a
recordar reglas de uso. Actualiza D002 en lo que toca a gold-700/800.
**Estado (detalle):** Aprobado en el handoff — se implementa en la fase 01
