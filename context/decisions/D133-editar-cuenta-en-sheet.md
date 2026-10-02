# D133 · Componentes · Editar nombre y correo en un Sheet desde el lápiz de la cuenta, no en una sub-pantalla · Implementado

**Decisión:** el botón de ícono 48 "Editar nombre y correo" de Perfil abre un Sheet "Nombre y
correo" (el mismo primitivo del selector de estilos) con los dos campos y Guardar. El nombre se
guarda en `profiles.display_name`; si cambió el correo, el Sheet pasa al aviso "Revisa tu correo".
**Por qué:** el handoff no dibuja la edición; el Sheet ya existe, atrapa el foco, cierra con Esc y
devuelve el foco al lápiz, y deja el Perfil detrás (contexto). Una sub-pantalla pedía otra ruta,
su volver y su estado en las tres plataformas para dos campos.
**Alternativa descartada:** sub-pantalla `/app/profile/account` (más espacio para ayudas, pero
otra ruta y otro flujo de navegación); edición en línea en la card (no cabe a 320 px con el lápiz).
