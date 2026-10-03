import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";

/**
 * Índice de las muestras de layout (handoff §7 paso 4, D060). Interna como /primitives: sin
 * enlace desde la app y fuera de buscadores. Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */
export const metadata: Metadata = {
  title: "Layouts",
  robots: { index: false, follow: false },
};

const SAMPLES = [
  {
    href: "/layouts/app",
    title: "AppShell",
    text: "Barra inferior de 5 destinos por debajo de 1024 px y lateral de 248 desde 1024, con la columna de 640 u 800.",
  },
  {
    href: "/layouts/fullscreen",
    title: "FullscreenShell",
    text: "Lección a pantalla completa: sin navegación, barra superior con salir y progreso, columna de 640.",
  },
  {
    href: "/layouts/stage",
    title: "FullscreenShell · escenario",
    text: "Sesión de práctica en negro, igual en tema claro y oscuro.",
  },
  {
    href: "/layouts/session",
    title: "Sesión · con sonido",
    text: "El reproductor real con una pista de prueba: suena la campana, la cuenta y los anuncios al ritmo de la rejilla.",
  },
  {
    href: "/layouts/public",
    title: "PublicShell",
    text: "Header de 72 y footer de la landing; variante con el correo de la sesión para Planes y Checkout.",
  },
  {
    href: "/layouts/checkout",
    title: "Checkout · estados",
    text: "Checkout con sesión simulada: activa, 409 por otro plan, error, sin conexión, sesión vencida y plan retirado.",
  },
  {
    href: "/layouts/admin",
    title: "AdminShell",
    text: "Navegación de 232 con etiquetas desde 1280 px y riel de 72 solo con íconos por debajo.",
  },
  {
    href: "/layouts/welcome",
    title: "Bienvenida",
    text: "Los 3 pasos de /welcome (estilos, rol y nivel) en su columna de 560, sin sesión ni base.",
  },
  {
    href: "/layouts/home",
    title: "Inicio · estados",
    text: "Inicio con datos de ejemplo: con repasos, primer día, sin repasos, curso terminado, sin suscripción y estilo sin curso.",
  },
  {
    href: "/layouts/course",
    title: "Curso · estados",
    text: "El camino por unidades con el título-selector de estilo: con repaso, sin repasos, primer día, lección disponible, terminado, sin suscripción y sin curso.",
  },
  {
    href: "/layouts/lesson",
    title: "Lección · etapas",
    text: "Las 6 etapas de /app/lessons/[id] con un backend falso: intro, video, mini práctica y práctica final en el escenario, calificación y resumen; también bloqueada y práctica disponible pronto.",
  },
  {
    href: "/layouts/practice",
    title: "Practicar · configurador",
    text: "El configurador de /app/practice con canciones de prueba y un plan-session falso: lista para empezar, sin suscripción, sin pasos, canción no lista, sin conexión, cargando y sin estilos.",
  },
  {
    href: "/layouts/practice-result",
    title: "Practicar · resultado",
    text: "El resultado de /app/practice/result con un review-steps falso: por calificar con vencidos y opcionales plegados, ninguno vence hoy, ya calificada, error al guardar y título largo.",
  },
  {
    href: "/layouts/progress",
    title: "Progreso · estados",
    text: "Progreso con datos de ejemplo: con datos, primer día, sin repasos en 7 días, sin sesiones, cargando y error de los próximos repasos.",
  },
  {
    href: "/layouts/songs",
    title: "Canciones · estados",
    text: "Practicar · canciones con datos de ejemplo: lista, con filtros, favoritas, sin favoritas, sin resultados, estilo sin canciones, sin estilos, cargando y error.",
  },
  {
    href: "/layouts/steps",
    title: "Pasos · catálogo",
    text: "El catálogo de /app/steps con los pasos del seed: lista por categoría, con filtros, 1 paso, 80 pasos, sin resultados, estilo sin pasos, sin estilos, cargando y error.",
  },
  {
    href: "/layouts/profile",
    title: "Perfil",
    text: "El Perfil de /app/profile sin escribir nada: con y sin suscripción, sin calibrar, 3 estilos (fila con Sheet), nombre y correo largos, correo por confirmar y los avisos del enlace de cambio de correo.",
  },
  {
    href: "/layouts/status",
    title: "Pantallas de estado",
    text: "404 con y sin sesión, error inesperado con y sin código, sin conexión y mantenimiento con y sin hora de vuelta.",
  },
  {
    href: "/layouts/calibration",
    title: "Calibrar audífonos · estados",
    text: "Los 6 estados de /app/profile/calibration: antes de empezar, escucha y toca (con clics reales), resultado, ajuste fino, toques irregulares y sin audífonos; guardar no escribe nada.",
  },
  {
    href: "/layouts/step-detail",
    title: "Paso, detalle",
    text: "El detalle de /app/steps/[slug] sin escribir nada: con historial y relacionados, con video, paso libre, sin historial ni relacionados, sin suscripción, perfil sin rol, error al guardar el estado y nombre largo.",
  },
  {
    href: "/layouts/admin-summary",
    title: "Admin · Resumen",
    text: "El Resumen de /admin sin sesión: con avisos y pendientes (y “Ver n más”), sin avisos, sin contenido, error al leer con Reintentar y cargando.",
  },
  {
    href: "/layouts/admin-steps",
    title: "Admin, pasos",
    text: "La lista + editor de /admin/steps sin escribir nada: lista con filtros, paso completo, paso nuevo, publicar bloqueado por videos, error al guardar, subida en curso y error al cargar.",
  },
] as const;

export default function LayoutsPage() {
  return (
    <main className="mx-auto flex w-full max-w-200 flex-col gap-8 px-5 py-12 md:px-8 lg:px-12">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-text-secondary">Muestra interna</p>
        <h1 className="type-h1">Layouts</h1>
        <p className="type-body text-text-secondary">
          Las cuatro shells de la app con contenido de relleno. Cambia el ancho
          de la ventana para ver cada punto de quiebre.
        </p>
        <ThemeSwitch />
      </header>
      <ul className="flex flex-col gap-4">
        {SAMPLES.map((sample) => (
          <li key={sample.href}>
            <Link
              href={sample.href}
              className="flex flex-col gap-1 rounded-md border border-divider bg-surface p-5 hover:border-border-input"
            >
              <span className="type-h4">{sample.title}</span>
              <span className="type-small text-text-secondary">
                {sample.text}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
