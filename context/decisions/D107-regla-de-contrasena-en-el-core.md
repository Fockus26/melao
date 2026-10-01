# D107 · Auth · La regla de contraseña (D075) también vive en _shared/core/password.ts, con vectores; la UI la refleja igual · Implementado

**Decisión:** `supabase/functions/_shared/core/password.ts` tiene la regla D075 pura (`failedPasswordRules`, `isValidPassword`) y `change-password` la aplica antes de mirar el historial (422 `weak_password`). `docs/spec/vectors/password-reglas.json` la fija; el mismo test comprueba que `lib/auth/validation.ts` (UI) da exactamente lo mismo.
**Por qué:** la función no debe gastar un `crypt` ni llamar a Auth con una contraseña que Auth rechazará, y las nativas necesitan la regla en vectores. `lib/auth/validation.ts` era de otra unidad en esta tanda (P1): en vez de editarlo, el test garantiza que no se separen.
**Alternativa descartada:** que `lib/auth/validation.ts` importe del core ya en este PR (choque con P1; queda como seguimiento: reexportar `PASSWORD_*` desde el core).
