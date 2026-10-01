/**
 * Textos de las pantallas de estado (diseño aprobado, lienzo "diseno-estados"). PROVISIONALES:
 * 404, error inesperado y sin conexión (CONTENT_CHECKLIST fila 61); mantenimiento (fila 62,
 * sin "¿Algo urgente? Escríbenos": no hay correo de contacto real todavía).
 */
export const statusCopy = {
  homeLabel: "Melao, ir al inicio",
  goHome: "Ir al inicio",
  retry: "Reintentar",

  notFound: {
    pageTitle: "Página no encontrada",
    eyebrow: "Error 404",
    title: "Este paso no está en la coreografía",
    text: "La página que buscas no existe o cambió de lugar. Volvamos a la pista.",
    myCourse: "Ver mi curso",
    signIn: "Entrar",
  },

  error: {
    pageTitle: "Algo salió mal",
    eyebrow: "Error 500",
    title: "Algo se nos desacompasó",
    text: "Tuvimos un problema de nuestro lado. Inténtalo de nuevo en un momento; si sigue pasando, escríbenos con este código.",
    // Sin código (error de cliente sin `digest`) la frase no menciona el código.
    textNoCode:
      "Tuvimos un problema de nuestro lado. Inténtalo de nuevo en un momento.",
    code: "Código",
  },

  offline: {
    pageTitle: "Sin conexión",
    title: "Sin conexión",
    text: "No llegamos a internet. Revisa tu wifi o tus datos y vuelve a intentarlo.",
    note: "Si estabas en una práctica, al volver la conexión retomas desde la lección.",
  },

  maintenance: {
    pageTitle: "En mantenimiento",
    eyebrow: "Un momento…",
    title: "Estamos afinando la pista",
    text: "Melao está en mantenimiento. Tu progreso y tus repasos quedan guardados tal como los dejaste.",
    backAt: "Volvemos aproximadamente",
  },
} as const;
