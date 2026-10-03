import Link from "next/link";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  type AdminSummary,
  itemHref,
  SUMMARY_VISIBLE_ITEMS,
  type SummaryCounts,
  type SummaryItem,
  type SummaryState,
  type SummaryStyle,
} from "@/lib/admin/summary";
import { summaryCopy as COPY } from "./copy";
import { SummaryRetry } from "./summary-retry";

/**
 * Cuerpo del Resumen del admin (handoff §3 Admin › Resumen): 4 contadores (2 col, 4 desde
 * 1280) y Avisos y Pendientes (1 col, 2 desde 1280). Todo llega resuelto de
 * `admin_summary()` (D154–D155); los pasos enlazan a su editor y lo demás va sin enlace hasta
 * que tenga pantalla (ola B). El encabezado lo pone la página.
 */
export function SummaryView({ state }: { state: SummaryState }) {
  if (state.status === "error") {
    return (
      <Alert variant="error">
        <AlertContent>
          <AlertTitle>{COPY.error}</AlertTitle>
          <AlertDescription>{COPY.errorText}</AlertDescription>
        </AlertContent>
        <AlertAction>
          <SummaryRetry />
        </AlertAction>
      </Alert>
    );
  }
  const { summary } = state;
  const styleNames = new Map(summary.styles.map((s) => [s.slug, s.name]));
  return (
    <div className="flex flex-col gap-8">
      <SummaryStats summary={summary} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SummaryList
          id="resumen-avisos"
          kind="warnings"
          title={COPY.warnings}
          text={COPY.warningsText}
          empty={COPY.warningsEmpty}
          items={summary.warnings}
          styleNames={styleNames}
        />
        <SummaryList
          id="resumen-pendientes"
          kind="pending"
          title={COPY.pending}
          text={COPY.pendingText}
          empty={COPY.pendingEmpty}
          items={summary.pending}
          styleNames={styleNames}
        />
      </div>
    </div>
  );
}

type CountKey = "steps" | "songs" | "lessons";

const pick = (counts: SummaryCounts, key: CountKey) =>
  key === "steps"
    ? { published: counts.stepsPublished, total: counts.stepsTotal }
    : key === "songs"
      ? { published: counts.songsPublished, total: counts.songsTotal }
      : { published: counts.lessonsPublished, total: counts.lessonsTotal };

function SummaryStats({ summary }: { summary: AdminSummary }) {
  const { totals, styles } = summary;
  return (
    <section aria-labelledby="resumen-contadores" className="flex flex-col">
      <h2 id="resumen-contadores" className="sr-only">
        {COPY.statsHeading}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CountStat title={COPY.steps} countKey="steps" summary={summary} />
        <CountStat title={COPY.songs} countKey="songs" summary={summary} />
        <CountStat
          title={COPY.lessons}
          countKey="lessons"
          summary={summary}
          note={COPY.lessonsNote}
        />
        <li className="flex">
          <Card className="flex-1 gap-2">
            <h3 className="type-small font-semibold text-text-secondary">
              {COPY.students}
            </h3>
            <p className="type-numeric-lg">{totals.students}</p>
            <p className="type-small text-text-secondary">
              {COPY.studentsActive(totals.studentsActive)}
            </p>
          </Card>
        </li>
      </ul>
      {styles.length === 0 ? (
        <p className="mt-4 type-small text-text-secondary">{COPY.noStyles}</p>
      ) : null}
    </section>
  );
}

function CountStat({
  title,
  countKey,
  summary,
  note,
}: {
  title: string;
  countKey: CountKey;
  summary: AdminSummary;
  note?: string;
}) {
  const total = pick(summary.totals, countKey);
  return (
    <li className="flex">
      <Card className="flex-1 gap-2">
        <h3 className="type-small font-semibold text-text-secondary">
          {title}
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="type-numeric-lg">{total.published}</span>
          <span className="type-small text-text-secondary tabular-nums">
            {COPY.of(total.total)}
          </span>
        </p>
        {note ? (
          <p className="type-caption text-text-secondary">{note}</p>
        ) : null}
        {summary.styles.length > 0 ? (
          <ul className="flex flex-col gap-1 border-t border-divider pt-3">
            {summary.styles.map((style) => (
              <StyleCount key={style.id} style={style} countKey={countKey} />
            ))}
          </ul>
        ) : null}
      </Card>
    </li>
  );
}

function StyleCount({
  style,
  countKey,
}: {
  style: SummaryStyle;
  countKey: CountKey;
}) {
  const { published, total } = pick(style, countKey);
  return (
    <li className="flex items-baseline justify-between gap-3 type-small">
      <span className="min-w-0 break-words">
        {style.name}
        {style.published ? null : (
          <span className="text-text-secondary"> · {COPY.styleDraft}</span>
        )}
      </span>
      <span className="shrink-0 tabular-nums text-text-secondary">
        {COPY.styleCount(published, total)}
      </span>
    </li>
  );
}

function SummaryList({
  id,
  kind,
  title,
  text,
  empty,
  items,
  styleNames,
}: {
  id: string;
  kind: "warnings" | "pending";
  title: string;
  text: string;
  empty: string;
  items: readonly SummaryItem[];
  styleNames: ReadonlyMap<string, string>;
}) {
  const visible = items.slice(0, SUMMARY_VISIBLE_ITEMS);
  const rest = items.slice(SUMMARY_VISIBLE_ITEMS);
  return (
    <section aria-labelledby={id}>
      <Card className="gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={id} className="type-h4">
            {title}
          </h2>
          <Badge
            variant={
              kind === "warnings" && items.length > 0 ? "warning" : "neutral"
            }
          >
            {COPY.count(items.length, kind)}
          </Badge>
        </div>
        <p className="type-small text-text-secondary">{text}</p>
        {items.length === 0 ? (
          <p className="type-body">{empty}</p>
        ) : (
          <>
            <ItemRows items={visible} styleNames={styleNames} />
            {rest.length > 0 ? (
              <details className="group">
                <summary className="inline-flex min-h-12 cursor-pointer items-center type-small font-semibold text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text group-open:mb-1">
                  {COPY.more(rest.length)}
                </summary>
                <ItemRows items={rest} styleNames={styleNames} />
              </details>
            ) : null}
          </>
        )}
      </Card>
    </section>
  );
}

function ItemRows({
  items,
  styleNames,
}: {
  items: readonly SummaryItem[];
  styleNames: ReadonlyMap<string, string>;
}) {
  return (
    <ul className="flex flex-col border-t border-divider">
      {items.map((item) => (
        <ItemRow
          key={`${item.kind}:${item.id}`}
          item={item}
          styleNames={styleNames}
        />
      ))}
    </ul>
  );
}

function ItemRow({
  item,
  styleNames,
}: {
  item: SummaryItem;
  styleNames: ReadonlyMap<string, string>;
}) {
  const href = itemHref(item);
  const style = item.style
    ? (styleNames.get(item.style) ?? item.style)
    : COPY.noStyle;
  const reasons =
    item.reasons.length > 0
      ? item.reasons.map((r) => COPY.reason(r, item.expiresOn)).join(" · ")
      : COPY.readyToPublish;
  return (
    <li className="flex flex-col border-b border-divider py-2">
      {href ? (
        <Link
          href={href}
          className="inline-flex min-h-12 items-center self-start type-body font-semibold break-words underline decoration-gold-500 underline-offset-4 hover:decoration-text"
        >
          {item.name}
        </Link>
      ) : (
        <span className="type-body font-semibold break-words">{item.name}</span>
      )}
      <p className="type-small text-text-secondary">
        {COPY.kind[item.kind]}
        {item.kind === "style" ? null : ` · ${style}`} · {reasons}
      </p>
    </li>
  );
}
