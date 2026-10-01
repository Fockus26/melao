# D102 · Auth · Aviso de recuperar contraseña neutro: "Revisa tu correo" en tono informativo, sin afirmar el envío · Implementado

**Decisión:** tras pedir el enlace, el aviso es el mismo exista o no la cuenta, con título
"Revisa tu correo" y texto "Si {correo} tiene una cuenta en Melao, te llegará un enlace…;
revisa también spam. Ábrelo en este mismo navegador: vence en una hora." El `Alert` pasa de
`success` a `info`.
**Por qué:** César mantiene el aviso neutro (no revelar qué correos tienen cuenta, enumeración
de cuentas, OWASP) pero lo quiere más claro. "Te enviamos un enlace" con el check verde de
éxito afirmaba un envío que con un correo inexistente no ocurre.
**Alternativa descartada:** decir "no hay cuenta con ese correo": revela cuentas registradas.
Mantener `success`: el ícono y el color de éxito siguen afirmando que se envió.
