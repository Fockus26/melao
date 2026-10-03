# D153 · Técnica · Guardar un paso con `admin_save_step` (datos + prerequisitos en una transacción); archivos y publicar, al momento · Implementado

**Decisión:** el botón Guardar llama a `admin_save_step(p_step_id, p_style_id, p_step,
p_prerequisites)` (`security invoker`, RLS del admin): crea o edita el paso y reemplaza sus
prerequisitos todo o nada. Publicar/despublicar es un update de `steps.published` aparte, solo con
el formulario guardado. Videos y clip de voz se escriben al subirlos (el paso tiene que existir:
un paso nuevo se guarda antes de subir). Lista con `admin_steps(style)` y filtros en el cliente.
**Por qué:** insert/update + diff de prerequisitos desde el cliente dejaría pasos a medio guardar
si falla la red entre llamadas, y Android/iOS repetirían la secuencia.
**Alternativa descartada:** guardar todo (datos, publicar y archivos) con un solo botón: los
archivos no se pueden "deshacer" al descartar y publicar exige los videos ya subidos.
