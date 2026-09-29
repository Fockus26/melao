# D075 · Producto · Contraseña: mínimo 8, minúscula, mayúscula, dígito y símbolo, impuesta por Supabase y reflejada en la UI · Implementado

**Decisión:** la regla es "al menos 8 caracteres, una minúscula, una mayúscula, un número y un
símbolo", como `minimum_password_length = 8` + `password_requirements =
"lower_upper_letters_digits_symbols"` de Supabase (proyecto real y `supabase/config.toml`). La UI
la muestra en vivo en registro y restablecer (`lib/auth/validation.ts`) y deshabilita el CTA
hasta cumplirla. Letras y dígitos son ASCII y los símbolos son los de Supabase
(`` !@#$%^&*()_+-=[]{};'\:"|<>?,./`~ ``), igual que el servidor: una "ñ" o un "¡" solos no
cuentan. Si Supabase rechaza igual (p. ej. contraseña filtrada, si se activa esa protección),
se muestra "contraseña débil".
**Por qué:** César configuró el proyecto real con la opción más estricta (2026-09-29); la UI
debe pedir exactamente lo mismo para que nadie descubra los requisitos a base de rechazos.
**Antes:** "letters_digits" (una letra y un dígito), propuesta de W8; reemplazada por esta.
