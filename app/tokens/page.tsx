import type { Metadata } from "next";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  CONTRAST_PAIRS,
  contrastRatio,
  DECORATIVE_ONLY,
  formatRatio,
  measurePair,
  minimumFor,
} from "@/lib/tokens/contrast";
import { isTabular } from "@/lib/tokens/css";
import {
  type ColorScheme,
  colors,
  listGroup,
  motionCss,
  shadowCss,
  tokens,
} from "@/lib/tokens/model";
import { MotionDemo } from "./motion-demo";

/**
 * Referencia de tokens (fase 01): todo sale de `design/tokens.json`, nada escrito a mano.
 * Interna: sin enlace desde la app y fuera de buscadores.
 */
export const metadata: Metadata = {
  title: "Tokens · Melao",
  robots: { index: false, follow: false },
};

const SCHEME_LABEL: Record<ColorScheme, string> = {
  light: "Claro",
  dark: "Oscuro",
  stage: "Escenario",
};

type Measured = ReturnType<typeof measurePair>;

function pairsFor(scheme: ColorScheme, fg: string): Measured[] {
  return CONTRAST_PAIRS.filter((p) => p.scheme === scheme && p.fg === fg).map(
    (p) => measurePair(p),
  );
}

function hexOf(scheme: ColorScheme, name: string): string {
  const token = colors(scheme).find((t) => t.name === name);
  if (!token) throw new Error(`color.${scheme}.${name}`);
  return token.value;
}

// Colores de texto candidatos para rotular los pares de gráfico (3:1 no basta para texto):
// se usa el que más contrasta con la superficie del par.
const LABEL_COLORS: Record<ColorScheme, string[]> = {
  light: ["text", "on-primary"],
  dark: ["text", "on-primary"],
  stage: ["current", "on-button"],
};

function legibleLabel(scheme: ColorScheme, bg: string): string {
  const surface = hexOf(scheme, bg);
  const [best] = LABEL_COLORS[scheme]
    .map((name) => hexOf(scheme, name))
    .sort((a, b) => contrastRatio(b, surface) - contrastRatio(a, surface));
  return best;
}

/**
 * Muestra real del par sobre su superficie, con el ratio escrito. Texto: el rótulo va en el
 * color medido. Gráfico: el color medido es la marca redonda y el rótulo va en color de texto.
 */
function PairChip({ pair }: { pair: Measured }) {
  const fg = hexOf(pair.scheme, pair.fg);
  const label = pair.kind === "text" ? fg : legibleLabel(pair.scheme, pair.bg);
  return (
    <li
      data-contrast-pair
      data-scheme={pair.scheme}
      data-fg={pair.fg}
      data-bg={pair.bg}
      data-kind={pair.kind}
      data-ratio={pair.ratio.toFixed(4)}
      className="type-caption flex items-center gap-2 rounded-sm px-2 py-1"
      style={{ color: label, backgroundColor: hexOf(pair.scheme, pair.bg) }}
    >
      {pair.kind === "text" ? (
        <span className="font-semibold">Aa</span>
      ) : (
        <span
          aria-hidden="true"
          data-graphic-mark
          className="size-3 shrink-0 rounded-pill"
          style={{ backgroundColor: fg }}
        />
      )}
      <span className="tabular-nums">
        {pair.bg} {formatRatio(pair.ratio)}
      </span>
      <span>
        {pair.passes
          ? `AA${pair.kind === "graphic" ? " gráfico" : ""}`
          : `no llega a ${minimumFor(pair.kind)}:1`}
      </span>
    </li>
  );
}

function Section({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-6 border-t border-divider pt-8 ${className}`}
    >
      <h2 id={id} className="type-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ThemeColors() {
  const light = colors("light");
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {light.map(({ name, description }) => (
        <li
          key={name}
          className="flex flex-col gap-3 rounded-md border border-divider bg-surface p-4"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              data-swatch={`--color-${name}`}
              className="size-12 shrink-0 rounded-sm border border-divider"
              style={{ backgroundColor: `var(--color-${name})` }}
            />
            <div className="min-w-0">
              <p className="type-h4 break-words">{name}</p>
              <p className="type-caption break-all text-text-secondary">
                --color-{name}
              </p>
            </div>
          </div>
          <dl className="type-small grid grid-cols-[auto_1fr] gap-x-3 tabular-nums">
            {(["light", "dark"] as const).map((scheme) => (
              <div key={scheme} className="contents">
                <dt className="text-text-secondary">{SCHEME_LABEL[scheme]}</dt>
                <dd className="break-all">{hexOf(scheme, name)}</dd>
              </div>
            ))}
          </dl>
          {description ? (
            <p className="type-small text-text-secondary">{description}</p>
          ) : null}
          {DECORATIVE_ONLY.light.includes(name) ? (
            <p className="type-small text-text-secondary">
              Solo decorativo: nunca texto ni gráfico que informe.
            </p>
          ) : null}
          {(["light", "dark"] as const).map((scheme) => {
            const pairs = pairsFor(scheme, name);
            if (pairs.length === 0) return null;
            return (
              <div key={scheme} className="flex flex-col gap-2">
                <p className="type-overline text-text-secondary">
                  Contraste {SCHEME_LABEL[scheme].toLowerCase()}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {pairs.map((pair) => (
                    <PairChip key={pair.bg} pair={pair} />
                  ))}
                </ul>
              </div>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

function StageColors() {
  return (
    <div className="rounded-md bg-stage-bg p-4 text-stage-current sm:p-6">
      <p className="type-small mb-4 text-stage-secondary">
        Igual en claro y oscuro: el escenario no usa los tokens del tema.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {colors("stage").map(({ name, value, description }) => {
          const pairs = pairsFor("stage", name);
          return (
            <li
              key={name}
              className="flex flex-col gap-3 rounded-md border border-stage-control-border p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  data-swatch={`--color-stage-${name}`}
                  className="size-12 shrink-0 rounded-sm border border-stage-control-border"
                  style={{ backgroundColor: `var(--color-stage-${name})` }}
                />
                <div className="min-w-0">
                  <p className="type-h4 break-words">{name}</p>
                  <p className="type-caption break-all text-stage-secondary">
                    --color-stage-{name} · {value}
                  </p>
                </div>
              </div>
              {description ? (
                <p className="type-small text-stage-secondary">{description}</p>
              ) : null}
              {pairs.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {pairs.map((pair) => (
                    <PairChip key={pair.bg} pair={pair} />
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SAMPLE_TEXT = "Paso básico con vuelta";
const SAMPLE_NUMBERS = "1 2 3 · 128";

function TypeScale() {
  const roles = listGroup(tokens.typography);
  return (
    <ul className="flex flex-col gap-6">
      {roles.map(({ name, value, description }) => {
        const onStage = name.startsWith("stage-");
        const numeric = isTabular(name, value) && name !== "stage-label";
        return (
          <li
            key={name}
            className={`flex flex-col gap-2 overflow-hidden rounded-md p-4 ${
              onStage
                ? "bg-stage-bg text-stage-current"
                : "border border-divider"
            }`}
          >
            <p
              className={`type-caption tabular-nums ${
                onStage ? "text-stage-secondary" : "text-text-secondary"
              }`}
            >
              type-{name} · {value.fontFamily[0]} {value.fontSize}/
              {value.lineHeight} · {value.fontWeight} · {value.letterSpacing}
              {value.textTransform ? " · mayúsculas" : ""}
              {isTabular(name, value) ? " · cifras tabulares" : ""}
            </p>
            <p className={`type-${name} break-words`}>
              {numeric ? SAMPLE_NUMBERS : SAMPLE_TEXT}
            </p>
            {description ? (
              <p
                className={`type-small ${onStage ? "text-stage-secondary" : "text-text-secondary"}`}
              >
                {description}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Spacing() {
  return (
    <ul className="flex flex-col gap-2">
      {listGroup(tokens.spacing).map(({ name, value }) => (
        <li key={name} className="flex items-center gap-4">
          <span className="type-small w-24 shrink-0 tabular-nums">
            spacing-{name} · {value}
          </span>
          <span
            aria-hidden="true"
            className="h-4 max-w-full rounded-sm bg-gold-600"
            style={{ width: `var(--spacing-${name})` }}
          />
        </li>
      ))}
    </ul>
  );
}

function Radii() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {listGroup(tokens.radius).map(({ name, value, description }) => (
        <li key={name} className="flex flex-col gap-2">
          <span
            aria-hidden="true"
            className="h-16 border border-border-input bg-surface-sunken"
            style={{ borderRadius: `var(--radius-${name})` }}
          />
          <p className="type-h5">rounded-{name}</p>
          <p className="type-caption text-text-secondary">
            {value}
            {description ? ` · ${description}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Shadows() {
  return (
    <ul className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      {listGroup(tokens.shadow).map(({ name, value }) => (
        <li
          key={name}
          className="flex flex-col gap-2 rounded-md bg-surface p-4"
          style={{ boxShadow: `var(--shadow-${name})` }}
        >
          <p className="type-h5">shadow-{name}</p>
          <p className="type-caption text-text-secondary">{shadowCss(value)}</p>
        </li>
      ))}
    </ul>
  );
}

function Motion() {
  const motion = listGroup(tokens.motion);
  const durations = motion.filter((t) => t.name.startsWith("duration-"));
  const easings = motion.filter((t) => t.name.startsWith("ease-"));
  return (
    <div className="flex flex-col gap-6">
      <p className="type-small text-text-secondary">
        Con movimiento reducido el punto cambia de lugar sin animarse.
      </p>
      <ul className="flex flex-col gap-4">
        {durations.map(({ name, value }) => (
          <li key={name} className="flex flex-col gap-2">
            <p className="type-small tabular-nums">
              {name} · {motionCss(value)} · ease-standard
            </p>
            <MotionDemo duration={name} easing="ease-standard" label={name} />
          </li>
        ))}
        {easings.map(({ name, value }) => (
          <li key={name} className="flex flex-col gap-2">
            <p className="type-small break-words tabular-nums">
              {name} · {motionCss(value)} · duration-enter
            </p>
            <MotionDemo duration="duration-enter" easing={name} label={name} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZIndex() {
  return (
    <ol className="type-small flex flex-col gap-1 tabular-nums">
      {listGroup(tokens.zIndex).map(({ name, value }) => (
        <li key={name}>
          z-{name} · {value}
        </li>
      ))}
    </ol>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-12 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-4">
        <p className="type-eyebrow text-gold-700">Referencia interna</p>
        <h1 className="type-display">Tokens de Melao</h1>
        <p className="type-body max-w-prose text-text-secondary">
          Generado desde design/tokens.json. Cada muestra de contraste calcula
          el ratio WCAG 2.1 del par que declara el handoff: texto 4.5:1,
          gráficos y bordes 3:1.
        </p>
        <ThemeSwitch />
      </header>

      <Section id="colores" title="Color · tema claro y oscuro">
        <ThemeColors />
      </Section>

      <Section id="escenario" title="Color · escenario">
        <StageColors />
      </Section>

      <Section id="tipografia" title="Tipografía">
        <TypeScale />
      </Section>

      <Section id="espaciado" title="Espaciado">
        <Spacing />
      </Section>

      <Section id="radios" title="Radios">
        <Radii />
      </Section>

      <Section id="sombras" title="Sombras">
        <Shadows />
      </Section>

      <Section id="movimiento" title="Movimiento">
        <Motion />
      </Section>

      <Section id="capas" title="Capas (z-index)">
        <ZIndex />
      </Section>
    </main>
  );
}
