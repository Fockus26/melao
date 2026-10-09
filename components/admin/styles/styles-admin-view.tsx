"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EditorEmpty } from "@/components/admin/list-editor/editor-card";
import {
  GuardedLink,
  LeaveGuardProvider,
  useLeaveGuard,
} from "@/components/admin/list-editor/leave-guard";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  ADMIN_STYLES_PATH,
  type AdminStyleFull,
  adminStylesSearch,
  nextStyleSortOrder,
  type StyleIssue,
  type StyleStep,
} from "@/lib/admin/styles";
import {
  type AdminStylesPort,
  supabaseAdminStyles,
} from "@/lib/admin/styles-port";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StyleEditor, type StyleEditorProps } from "./style-editor";

// Copy provisional (CONTENT_CHECKLIST fila 88).
const COPY = {
  overline: "Contenido",
  title: "Estilos",
  newStyle: "Nuevo estilo",
  styleLegend: "Estilo",
  unpublishedStyle: "(sin publicar)",
  noStyleTitle: "Aún no hay estilos",
  noStyleText: "Crea el primero con «Nuevo estilo».",
  notFoundTitle: "No encontramos ese estilo",
  notFoundText:
    "Puede que se haya borrado o cambiado de slug. Elige otro arriba.",
  errorTitle: "No pudimos cargar los estilos",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
  removedTitle: "Estilo borrado",
  removedText: "Elige otro estilo arriba o crea uno nuevo.",
} as const;

export type StylesAdminViewProps = {
  styles: readonly AdminStyleFull[];
  /** El estilo abierto; `null` con `isNew` o si no existe. */
  current: AdminStyleFull | null;
  isNew: boolean;
  /** Se pidió un slug que no existe. */
  notFound?: boolean;
  steps: readonly StyleStep[];
  issues: readonly StyleIssue[];
  loadError?: boolean;
  /** Ruta de los enlaces (la muestra usa la suya) y parámetros que conserva (`?state=`). */
  basePath?: string;
  extraParams?: Record<string, string>;
  /** Puerto de escrituras; sin él, el real con el cliente del navegador. */
  port?: AdminStylesPort;
  /** Muestras: sin red, guardar no navega (no hay servidor que relea). */
  variant?: "live" | "sample";
  initialEditorStatus?: StyleEditorProps["initialStatus"];
};

/**
 * Admin · Estilos (`/admin/styles`): segmentado de estilos y, debajo, el estilo abierto en una
 * columna de 880 con cards por tema (handoff §3 Admin). Contrato con el Resumen:
 * `?style=<slug>` abre ese estilo; `?style=new`, uno nuevo.
 */
export function StylesAdminView(props: StylesAdminViewProps) {
  return (
    <LeaveGuardProvider>
      <StylesAdminScreen {...props} />
    </LeaveGuardProvider>
  );
}

function StylesAdminScreen({
  styles,
  current,
  isNew,
  notFound = false,
  steps,
  issues,
  loadError = false,
  basePath = ADMIN_STYLES_PATH,
  extraParams = {},
  port: portProp,
  variant = "live",
  initialEditorStatus,
}: StylesAdminViewProps) {
  const router = useRouter();
  const guard = useLeaveGuard();
  const [removed, setRemoved] = useState<string | null>(null);
  // Estilo creado en esta visita (la muestra no relee): sigue abierto con su editor.
  const [created, setCreated] = useState(false);

  const port = useMemo(
    () => portProp ?? supabaseAdminStyles(createClient()),
    [portProp],
  );
  const href = (slug: string | null) =>
    `${basePath}${adminStylesSearch(slug, extraParams)}`;

  const header = (
    <AdminPageHeader
      overline={COPY.overline}
      title={COPY.title}
      actions={
        loadError || (isNew && !created) ? null : (
          <Button asChild>
            <GuardedLink href={href("new")}>
              <Plus aria-hidden="true" strokeWidth={ICON_STROKE} />
              {COPY.newStyle}
            </GuardedLink>
          </Button>
        )
      }
    />
  );

  const visibleStyles = styles.filter((s) => s.id !== removed);
  const styleNav =
    visibleStyles.length > 0 ? (
      <nav aria-label={COPY.styleLegend}>
        <ul className="flex w-full max-w-xl flex-wrap rounded-pill border border-border-input p-1">
          {visibleStyles.map((s) => {
            const active = !isNew && s.id === current?.id && !removed;
            return (
              <li key={s.id} className="flex flex-1">
                <GuardedLink
                  href={href(s.slug)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-pill px-4 text-center type-small",
                    "transition-colors duration-state ease-standard motion-reduce:transition-none",
                    "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
                    active
                      ? "bg-primary font-semibold text-on-primary"
                      : "font-medium text-text hover:bg-hover",
                  )}
                >
                  {s.name}
                  {s.published ? null : (
                    <span className="type-caption">
                      {COPY.unpublishedStyle}
                    </span>
                  )}
                </GuardedLink>
              </li>
            );
          })}
        </ul>
      </nav>
    ) : null;

  let body: React.ReactNode;
  if (loadError) {
    body = (
      <Alert variant="error">
        <AlertContent>
          <AlertTitle>{COPY.errorTitle}</AlertTitle>
          <AlertDescription>{COPY.errorText}</AlertDescription>
        </AlertContent>
        <AlertAction>
          <Button variant="outline" onClick={() => router.refresh()}>
            {COPY.retry}
          </Button>
        </AlertAction>
      </Alert>
    );
  } else if (removed) {
    body = <EditorEmpty title={COPY.removedTitle} text={COPY.removedText} />;
  } else if (!isNew && !current) {
    body = notFound ? (
      <EditorEmpty title={COPY.notFoundTitle} text={COPY.notFoundText} />
    ) : (
      <EditorEmpty title={COPY.noStyleTitle} text={COPY.noStyleText} />
    );
  } else {
    body = (
      <StyleEditor
        key={current?.id ?? "new"}
        style={isNew ? null : current}
        styles={styles}
        steps={isNew ? [] : steps}
        issues={isNew ? [] : issues}
        newSortOrder={nextStyleSortOrder(styles)}
        port={port}
        initialStatus={initialEditorStatus}
        onSaved={(saved, wasCreated) => {
          guard.setDirty(false);
          if (wasCreated) setCreated(true);
          if (variant === "live") {
            // Estilo nuevo o slug cambiado: la URL sigue al estilo y el servidor relee.
            router.replace(href(saved.slug), { scroll: false });
            router.refresh();
          } else {
            window.history.replaceState(null, "", href(saved.slug));
          }
        }}
        onChanged={() => {
          if (variant === "live") router.refresh();
        }}
        onRemoved={(id) => {
          setRemoved(id);
          guard.setDirty(false);
          if (variant === "live") {
            router.replace(href(null));
            router.refresh();
          } else window.history.replaceState(null, "", href(null));
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}
      {styleNav}
      <div className="flex w-full max-w-220 flex-col">{body}</div>
    </div>
  );
}
