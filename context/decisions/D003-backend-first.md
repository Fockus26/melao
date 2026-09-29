# D003 · Arquitectura · Backend-first: reglas en Postgres/RLS y Edge Functions; web y nativas son clientes · Pendiente

**Decisión:** reglas en Postgres (RLS, funciones SQL) y Edge Functions (TypeScript). Next.js
es un cliente más. El backend entrega la sesión de práctica ya planificada como línea de
tiempo; el cliente solo reproduce.
**Por qué:** Android (Kotlin) e iOS (Swift) reimplementarán la UI. Si la lógica vive en el
backend, solo se reimplementan UI + reproductor de audio, y las tres plataformas se
comportan igual.
**Alternativa descartada:** lógica en Server Actions / componentes de Next — habría que
reescribirla en Kotlin y en Swift, con divergencias.
