# D075 · Producto · Contraseña: mínimo 8, una letra y un dígito (ASCII), impuesta por Supabase y reflejada en la UI · Pendiente

**Decisión:** la regla es "al menos 8 caracteres, una letra y un número", como
`minimum_password_length = 8` + `password_requirements = "letters_digits"` de Supabase
(`supabase/config.toml` ya la tiene para local). La UI la muestra en vivo en registro y
restablecer (`lib/auth/validation.ts`) y deshabilita el CTA hasta cumplirla; la letra y el dígito
son ASCII, igual que Supabase (una "ñ" sola no cuenta). Si Supabase rechaza igual (p. ej.
contraseña filtrada, si se activa esa protección), se muestra "contraseña débil".
**Por qué:** el valor por defecto de Supabase (6, sin requisitos) es flojo para una suscripción
de pago, y "letters_digits" es lo más estricto que no obliga a mayúsculas ni símbolos.
**Pendiente:** César la aplica en Supabase › Authentication › Providers › Email (el proyecto
real no se tocó).
