# D143 · Audio · `device_key` web = `<salida>:<sistema>`; la salida se pregunta, no se detecta · Implementado

**Decisión:** en web, el paso 1 de Calibrar pregunta con qué escucha el alumno (Audífonos Bluetooth
· Altavoz o audífonos con cable) en vez de mostrar "audífonos detectados". `device_key` =
`bluetooth|speaker` + `:` + sistema del user agent (`android`, `ios`, `windows`, `mac`,
`chromeos`, `linux`, `other`); `device_label` legible ("Audífonos Bluetooth · Android"). Altavoz
→ estado "Sin audífonos" (no hace falta; se puede calibrar igual).
**Por qué:** la web no expone qué salida está activa (`outputLatency` cambia y no identifica el
dispositivo; `enumerateDevices` pide permiso y da etiquetas solo con él). La clave es estable,
sin datos personales, y la sesión sigue usando la más reciente de la plataforma (D124).
**Alternativa descartada:** clave por `outputLatency` + user agent (inestable entre sesiones) o
una sola fila `default` por alumno (no permite la lista por dispositivo del handoff).
