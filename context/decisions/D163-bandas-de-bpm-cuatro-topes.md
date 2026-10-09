# D163 · Datos · Bandas de BPM: hasta 4 topes ascendentes en 40–300; el nivel 5 queda abierto · Implementado

**Decisión:** `check` `dance_styles_bpm_bands_valid` sobre `dance_styles.difficulty_bpm_bands`
(`private.bpm_bands_valid`): null o de 0 a 4 topes enteros en 40–300, estrictamente ascendentes.
El panel escribe 4 topes (niveles 1–4) o ninguno (null); el nivel 5 es "más de" el último tope,
como ya lo calcula `private.song_difficulty`. `admin_save_style` lo valida antes con `ME003`.
**Por qué:** `song_difficulty` y el seed (D137) ya modelan 4 topes → 5 niveles; pedir 5 valores
dejaría un tope sin uso. Aceptar menos de 4 en la base no rompe nada (los tests y datos viejos los
usan) y el panel nunca los escribe.
**Alternativa descartada:** 5 topes con el último como techo (`least(5, …)` ya lo absorbe, pero un
BPM por encima del techo quedaría en nivel 5 igual: el quinto tope no significaría nada).
