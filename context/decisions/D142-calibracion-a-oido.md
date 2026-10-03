# D142 · Audio · Calibrar: 12 clics a 100 BPM, 4 de práctica, desvío > 40 ms repite, ajuste −200…+300 · Implementado

**Decisión:** la calibración web sigue el handoff (12 clics, 4 de práctica, 8 medidos, irregular
con desvío > 40 ms) en vez de la spec anterior (≥ 16 toques, ~60 ms). Cada toque se compara con
**su** clic (por orden), no con el más cercano. Promedio redondeado a ms, desvío muestral. El
ajuste fino va de −200 a +300 ms: la intersección del handoff (−300…+300) y del check de la tabla
(−200…1000); un promedio fuera de ese rango se trata como medición fallida. Reglas en el core
compartido (`calibration.ts`) con vector, y el rango repetido en `save_audio_latency()`.
**Por qué:** con Bluetooth (~340 ms) la latencia pasa de medio tiempo a 100 BPM y el clic "más
cercano" sería el siguiente; 20 s de prueba bastan con 8 toques parejos. Una latencia negativa de
más de 200 ms no es física, y más de 300 ms casi siempre es un clic perdido al empezar.
**Alternativa descartada:** migración que amplíe el check a −300…1000 para respetar el slider
del handoff (los valores bajo −200 no tienen sentido físico).
