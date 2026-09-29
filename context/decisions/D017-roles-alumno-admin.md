# D017 · Producto · Roles: student y admin en v1 (César = profesor + admin); teacher reservado · Pendiente

**Decisión:** `app_role` = `student | teacher | admin`. En la v1 solo se usan `student` y
`admin`; `teacher` queda reservado.
**Por qué:** César graba las clases y atiende la consultoría; el enum deja la puerta abierta
a más profesores sin migración.
