"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Aviso de cambios sin guardar del patrón lista + editor (handoff §3 Admin).
 *
 * API:
 * - `<LeaveGuardProvider copy?>` envuelve la pantalla. El editor declara `setDirty(true)` mientras
 *   tenga cambios sin guardar.
 * - `<GuardedLink>` (mismas props que `next/link`): con cambios sin guardar no navega y abre el
 *   AlertDialog "Seguir editando" (seguro, con el foco) / "Salir sin guardar".
 * - `useLeaveGuard().navigate(href)` hace lo mismo desde un botón.
 * - Cerrar o recargar la pestaña con cambios: el aviso nativo del navegador (`beforeunload`).
 */

// Copy provisional (CONTENT_CHECKLIST fila 82).
const DEFAULT_COPY = {
  title: "¿Salir sin guardar?",
  description: "Tienes cambios sin guardar. Si sales, se pierden.",
  stay: "Seguir editando",
  leave: "Salir sin guardar",
};

type LeaveGuard = {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  navigate: (href: string) => void;
};

const LeaveGuardContext = createContext<LeaveGuard>({
  dirty: false,
  setDirty: () => {},
  navigate: () => {},
});

export const useLeaveGuard = () => useContext(LeaveGuardContext);

export function LeaveGuardProvider({
  children,
  copy = DEFAULT_COPY,
}: {
  children: ReactNode;
  copy?: typeof DEFAULT_COPY;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const navigate = useCallback(
    (href: string) => {
      if (dirty) setPending(href);
      else router.push(href);
    },
    [dirty, router],
  );

  const value = useMemo(
    () => ({ dirty, setDirty, navigate }),
    [dirty, navigate],
  );

  return (
    <LeaveGuardContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.stay}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const href = pending;
                setDirty(false);
                setPending(null);
                if (href) router.push(href);
              }}
            >
              {copy.leave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LeaveGuardContext.Provider>
  );
}

/** `next/link` que, con cambios sin guardar, pregunta antes de navegar. */
export function GuardedLink({
  onClick,
  href,
  ...props
}: ComponentProps<typeof Link> & { href: string }) {
  const guard = useLeaveGuard();
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !guard.dirty) return;
        // Abrir en otra pestaña no pierde nada: se deja pasar.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        guard.navigate(href);
      }}
      {...props}
    />
  );
}
