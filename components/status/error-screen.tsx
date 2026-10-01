"use client";

import { RotateCw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Alert, AlertContent } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { SITE_NAME } from "@/lib/seo/site";
import { statusCopy } from "./copy";
import { CountRow } from "./count-row";
import { StatusScreen } from "./status-screen";

/**
 * Error inesperado (500) y sin conexión (D110). Cliente: los usan `app/error.tsx` y
 * `app/global-error.tsx`, que son límites de error de React.
 */

type RetryProps = {
  /** `retry()` del límite de error de Next 16; sin él (muestras), recarga la página. */
  onRetry?: () => void;
};

function reload() {
  window.location.reload();
}

function RetryButton({ onRetry = reload }: RetryProps) {
  return (
    <Button size="lg" onClick={() => onRetry()}>
      <RotateCw aria-hidden="true" strokeWidth={ICON_STROKE} />
      {statusCopy.retry}
    </Button>
  );
}

/** 500: cuenta desacompasada, el `digest` como "Código" (sin él, la fila no aparece). */
export function ServerErrorScreen({
  digest,
  onRetry,
}: RetryProps & { digest?: string }) {
  const copy = statusCopy.error;
  return (
    <StatusScreen
      logoHref="/"
      illustration={<CountRow variant="offbeat" />}
      eyebrow={copy.eyebrow}
      title={copy.title}
      text={digest ? copy.text : copy.textNoCode}
      extra={
        digest ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 type-small text-text-muted">
            {copy.code}
            <code className="rounded-sm bg-surface-sunken px-2 py-1 text-text tabular-nums">
              {digest}
            </code>
          </p>
        ) : null
      }
      actions={
        <>
          <RetryButton onRetry={onRetry} />
          <Button asChild size="lg" variant="outline">
            <Link href="/">{statusCopy.goHome}</Link>
          </Button>
        </>
      }
    />
  );
}

/** Sin conexión: wifi tachado en baldosa sunken, aviso de la práctica y solo "Reintentar". */
export function OfflineScreen({ onRetry }: RetryProps) {
  const copy = statusCopy.offline;
  return (
    <StatusScreen
      logoHref="/"
      illustration={
        <div
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-lg bg-surface-sunken text-text"
        >
          <WifiOff strokeWidth={ICON_STROKE} className="size-7" />
        </div>
      }
      title={copy.title}
      text={copy.text}
      extra={
        <Alert variant="warning" className="mt-6">
          <AlertContent>{copy.note}</AlertContent>
        </Alert>
      }
      actions={<RetryButton onRetry={onRetry} />}
    />
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Elige entre sin conexión y 500 según `navigator.onLine`, en vivo: una navegación que falla
 * por red cae aquí y ve la causa real. En el servidor se asume conexión (no hay `navigator`).
 */
export function ErrorScreen({
  digest,
  onRetry,
  documentTitle = false,
}: RetryProps & {
  digest?: string;
  /** Pone el `<title>` del documento (los límites de error no exportan `metadata`). */
  documentTitle?: boolean;
}) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const title = online
    ? statusCopy.error.pageTitle
    : statusCopy.offline.pageTitle;
  return (
    <>
      {documentTitle ? <title>{`${title} · ${SITE_NAME}`}</title> : null}
      {online ? (
        <ServerErrorScreen digest={digest} onRetry={onRetry} />
      ) : (
        <OfflineScreen onRetry={onRetry} />
      )}
    </>
  );
}
