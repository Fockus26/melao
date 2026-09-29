# D088 · SEO · Se indexan solo las páginas públicas; metadata raíz con template «%s · Melao» · Implementado

**Decisión:** `lib/seo/site.ts` concentra el origen (`NEXT_PUBLIC_SITE_URL` o
`https://melao-two.vercel.app`), las rutas indexadas y las bloqueadas. `sitemap.xml`: `/`,
`/plans`, `/login`, `/register`, `/legal/terms`, `/legal/privacy`. `robots.txt` bloquea `/app`
(como `/app$` + `/app/`, para no bloquear `/apple-icon.png`), `/admin`, `/auth`, `/welcome`,
`/checkout`, `/spike` y las páginas de muestra (`/indicators`, `/layouts`, `/primitives`,
`/stage`, `/tokens`), que además llevan `noindex`. Layout raíz: `metadataBase`, título
`{ default: "Melao", template: "%s · Melao" }` (cada página pone solo su título), Open Graph
`website` / `es_419`, tarjeta grande de X, `applicationName`, `appleWebApp.title` y
`viewport.themeColor` #FFFFFF / #0E0E0E por `prefers-color-scheme`. Manifest: "Melao", abre en
`/app`, `standalone`, fondo #111111, `theme_color` claro. La portada lleva `canonical: "/"`.
**Por qué:** lo que exige sesión no tiene nada que mostrar a un buscador; el template evita
repetir la marca a mano en cada título.
**Alternativa descartada:** canonical en el layout raíz (lo heredarían todas las páginas
apuntando a `/`); `theme-color` según el tema elegido en la app (exigiría actualizar la meta por
script; el del sistema basta mientras el selector de tema sea raro de usar).
