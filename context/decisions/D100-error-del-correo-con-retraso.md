# D100 · Auth · El error de formato del correo aparece tras 600 ms sin teclear, al salir o al enviar; se quita al instante · Implementado

**Decisión:** en Entrar, Registro y Recuperar, el error "le falta la @ o el dominio" espera a una
pausa de 600 ms sin cambios, al blur o al envío; una vez visible sigue mientras el valor siga mal
y se quita en cuanto el valor es válido o se vacía (la próxima vez vuelve a esperar). "Escribe
tu correo" solo al enviar. Regla pura en `lib/auth/deferred-error.ts`, hook `useDeferredError`.
**Por qué:** César (2026-09-30): no marcar error mientras recién empieza a escribir. Poner con
retraso y quitar al instante es el patrón de validación en línea menos ruidoso (el error no
parpadea al teclear y el alivio es inmediato). 600 ms ≈ una pausa natural entre palabras.
**Alternativa descartada:** validar solo al blur (como estaba en Registro): en móvil el blur
llega tarde (al tocar "Crear cuenta", que además está deshabilitado) y la persona no se entera.
