# Decisiones — Producto

## D009 — Catálogo propio de canciones con permiso de uso; streaming fuera de la v1
**Decisión:** las canciones se suben al catálogo con fuente y permiso documentados. La fuente
de audio queda detrás de una interfaz para sumar streaming si algún día es viable.
**Por qué:** una app paga no puede usar grabaciones comerciales sin licenciar grabación y
composición. Spotify: la cuota ampliada solo se da a empresas con ≥ 250 k usuarios activos
al mes (desde mayo de 2025), su política prohíbe superponer su audio con otro (la voz del
coach) y no da BPM ni análisis a apps nuevas (desde el 27-11-2024). YouTube: anuncios, video
visible obligatorio, sin audio suelto.
**Alternativa descartada:** archivos del propio usuario (a César no le convence: propenso a
errores y sin catálogo compartido para populares/presets).
**Estado:** Pendiente

## D010 — Rejilla de beats por anclas; el "1" lo marca el admin
**Decisión:** BPM y fase detectados automáticamente en el navegador (librería MIT, candidata
`web-audio-beat-detector`); el admin marca el primer "1" y añade anclas si la canción
acelera. La rejilla guarda anclas `{beat, tMs}` interpoladas linealmente.
**Por qué:** ningún detector sabe cuál beat es el "1" de la cuenta de baile; las
grabaciones en vivo cambian de tempo y un BPM único descuadra la cuenta.
**Alternativa descartada:** Essentia.js — licencia AGPL, incompatible con una app cerrada.
**Estado:** Pendiente

## D011 — El coach anuncia el paso en el 5 de la última frase
**Decisión:** el nombre del paso siguiente suena en el tiempo 5 de la última frase del paso
en curso, ocupa el 5–6 y la cuenta sigue en el 7. Si el siguiente paso es el mismo, no se
anuncia. La anticipación y los tiempos hablados son configuración del estilo. Una frase de
cuenta de entrada antes del primer paso.
**Por qué:** especificación de César ("en el tiempo 5 se dirá el siguiente paso").
**Estado:** Pendiente

## D012 — Pasos con posición de entrada y de salida; combinaciones sobre un grafo
**Decisión:** cada paso declara su posición de entrada y de salida. El generador hace un
recorrido aleatorio con semilla: B puede seguir a A solo si la salida de A es la entrada de B.
**Por qué:** "tener en cuenta qué pasos constituyen el baile (base, vueltas, entradas y
salidas)": así toda combinación es bailable. La semilla permite probarlo con vectores.
**Estado:** Pendiente

## D013 — FSRS en el backend; calificación 1–4 = Again/Hard/Good/Easy
**Decisión:** repetición espaciada con FSRS (`ts-fsrs`), una tarjeta por (usuario, paso,
rol), calculada en una Edge Function.
**Por qué:** es el algoritmo actual de Anki y sus 4 botones coinciden con la escala de César
(muy difícil, difícil, bien, fácil). En el backend, Kotlin y Swift no lo reimplementan.
**Alternativa descartada:** SM-2 (el Anki clásico): peor predicción, mismo costo.
**Estado:** Pendiente

## D014 — Voz del coach con clips pregrabados programados con Web Audio
**Decisión:** números y nombres de pasos como clips de audio, programados en el reloj de
audio a la marca de tiempo exacta. Sin síntesis de voz en vivo.
**Por qué:** la síntesis del navegador tiene latencia variable, voces distintas por
dispositivo y no es fiable dentro de un WebView de Android; a 200 BPM un tiempo dura 300 ms.
**Estado:** Pendiente (voz: grabada por César o TTS, en `CONTENT_CHECKLIST`)

## D015 — Suscripción placeholder activada en el servidor
**Decisión:** el checkout muestra el precio y activa por $0 mediante una Edge Function. RLS
impide que el cliente escriba `subscriptions`. El acceso al contenido depende de la
suscripción activa.
**Por qué:** cuando llegue la pasarela real solo cambia cómo se activa la suscripción, no las
reglas de acceso.
**Estado:** Pendiente

## D016 — Video según el rol; pasos libres con un solo video
**Decisión:** el alumno elige su rol por estilo (líder o seguidor) y ve el video de ese rol.
Los pasos libres (sin pareja) tienen un único video.
**Por qué:** indicación de César.
**Estado:** Pendiente

## D017 — Roles del sistema: alumno y admin (César es profesor y admin)
**Decisión:** `app_role` = `student | teacher | admin`. En la v1 solo se usan `student` y
`admin`; `teacher` queda reservado.
**Por qué:** César graba las clases y atiende la consultoría; el enum deja la puerta abierta
a más profesores sin migración.
**Estado:** Pendiente

## D019 — Alcance: v1 = curso + práctica libre + admin; v2 = consultoría
**Decisión:** la v1 incluye auth, suscripción placeholder, curso, práctica libre, catálogo,
progreso, perfil y panel admin. La consultoría (chat, videos del alumno, corrección) se diseña
ya y se construye después.
**Por qué:** la consultoría es lo más pesado (tiempo real, subida y almacenamiento de videos de
alumnos) y no bloquea el valor principal.
**Estado:** Pendiente

## D022 — Estilos de baile como configuración
**Decisión:** un estilo define su patrón de cuenta (tiempos por frase y cuáles se dicen), la
anticipación del anuncio, las bandas de BPM por dificultad y si tiene roles. Agregar salsa
venezolana, lineal (On1/On2), bachata o timba es configuración + contenido.
**Por qué:** César anticipó que se agregarán estilos; el motor no debe cambiar por eso.
**Estado:** Pendiente

## D023 — Un rol de baile por alumno
**Decisión:** el alumno elige líder o seguidor una vez y aplica a todos los estilos; además
elige el estilo con el que abre la app. Reemplaza "rol por estilo". En cada paso puede ver el
video del otro rol con el selector.
**Por qué:** indicación de César (2026-09-25): quien lidera en salsa lidera también en merengue.
**Estado:** Pendiente
