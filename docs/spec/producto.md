# Producto — módulos y reglas

## Glosario

| Término | Significado |
|---|---|
| Estilo | Un baile con su propia cuenta y catálogo: salsa casino, merengue (v1); salsa venezolana, lineal On1/On2, bachata, timba (después) |
| Tiempo | Un beat de la canción |
| Frase | 8 tiempos. Unidad mínima de duración de un paso |
| Cuenta hablada | Los tiempos que el coach dice en voz alta. Salsa: 1 2 3 · 5 6 7 · (4 y 8 en silencio). Merengue: 1–8 |
| Paso / figura | Movimiento con nombre (p. ej. "Enchufla"), de duración entera en frases |
| Posición | Cómo queda la pareja al empezar o terminar un paso (p. ej. abierta, cerrada). La define el admin por estilo |
| Rol | Líder o seguidor. El alumno elige uno por estilo |
| Paso libre | Paso sin pareja; un solo video, sin rol |
| Coach | La voz que cuenta los tiempos y anuncia el paso siguiente |
| Sesión | Una práctica sobre una canción: plan de pasos + línea de tiempo |
| Tarjeta | Estado de repaso espaciado de un paso para un alumno y un rol |

## Módulos

### 1. Cuenta y suscripción
- Registro e inicio de sesión: email + contraseña, y Google. (Apple se suma antes de iOS.)
- Onboarding: estilo(s) → rol por estilo → nivel ("desde cero" o "ya sé pasos", que lleva al
  catálogo para marcarlos).
- Planes: **Básico** (~$20 USD/mes, PENDIENTE) y **Consultoría** (PENDIENTE). Sin pasarela
  en la v1: el checkout muestra el precio y activa la suscripción por $0 en el servidor.
- Sin suscripción activa, el contenido (videos, canciones, práctica) no es accesible.
  ¿Prueba gratis o primera lección gratis? PENDIENTE.

### 2. Curso (camino tipo Duolingo)
- Un curso por estilo, dividido en unidades; cada unidad tiene lecciones numeradas.
- Desbloqueo lineal: una lección se abre al completar la anterior.
- **Lección:** intro → por cada paso nuevo: video del rol elegido + mini práctica (pocas
  frases con una canción) → práctica final con todos los pasos de la lección (y, si caben,
  los que el alumno ya sabe) → calificación 1–4 de cada paso → resumen.
- Al completar una lección, sus pasos entran al repaso espaciado.
- Un nodo "Repaso" aparece en el camino cuando hay pasos vencidos.

### 3. Práctica libre
- **Canción:** una concreta · preset de dificultad (lista filtrada, o aleatoria dentro) ·
  aleatoria entre todas · populares · favoritas.
- **Pasos:** filtrar por dificultad · aleatorio · favoritos · populares · según el repaso
  (prioriza vencidos y los que más cuestan) · incluir o no los que están en "aprendiendo".
- Antes de empezar se muestra cuántas frases (figuras de 8 tiempos) caben en la canción.
- Sesión: el coach cuenta y anuncia; la pantalla muestra el paso actual, el siguiente, la
  fila de tiempos y la lista de próximos pasos.
- Al terminar: calificación 1–4 de cada paso distinto que apareció (los no vencidos se
  pueden saltar).

### 4. Catálogo de pasos
- Todos los pasos del estilo, por categoría: base, vuelta, entrada, salida, figura,
  variación, paso libre.
- Estado por paso: **no lo sé** · **aprendiendo** · **me lo sé**. Favorito.
- Detalle: video del rol, descripción por tiempos, posición de entrada y salida, duración,
  variaciones, prerequisitos, historial de calificaciones, próximo repaso.

### 5. Progreso
- Pasos que más cuestan (menor estabilidad FSRS / más "muy difícil").
- Repasos de los próximos 7 días. Lecciones completadas. Sesiones recientes.

### 6. Perfil
- Cuenta · rol por estilo · coach (volumen de voz, cuenta hablada sí/no, calibración de
  latencia) · tema (sistema/claro/oscuro) · suscripción · cerrar sesión.

### 7. Panel admin (solo `admin`)
- Estilos: cuenta hablada, anticipación del anuncio, bandas de BPM por dificultad,
  posiciones, posición inicial.
- Pasos: datos, posiciones, videos por rol (o único), clip de voz, variaciones, prerequisitos.
- Canciones: subida, licencia (fuente, notas, documento, vencimiento), **analizador de
  ritmo** (BPM detectado, marcar el "1", anclas, inicio y fin de baile, previsualizar con la
  cuenta), publicar.
- Cursos: unidades, lecciones, pasos por lección, canciones de mini práctica y final, orden.
- Usuarios: lista y suscripciones (solo lectura).

### 8. Consultoría (v2)
- Plan superior. Chat con el profesor, subida de videos de avance, nota y correcciones con
  marca de tiempo sobre el video.

## Reglas de negocio transversales

- **Popularidad:** sesiones de los últimos 30 días (canciones) y apariciones en sesiones
  (pasos).
- **Dificultad de canción:** por bandas de BPM del estilo (umbrales PENDIENTE, editables);
  el admin puede sobrescribirla por canción.
- **Licencias:** una canción sin fuente y permiso registrados no se puede publicar.
- **Estilos:** un estilo nuevo es configuración + contenido, nunca código nuevo de motor.
- **Roles:** `student` y `admin` en la v1; `teacher` reservado.
