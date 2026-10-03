"use client";

import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import {
  type AdminUser,
  APP_ROLE_LABELS,
  danceRoleLabel,
  shortDate,
  USER_PERIOD_PREFIX,
  USER_STATE_PILLS,
} from "@/lib/admin/users";
import { cn } from "@/lib/utils";

// Copy provisional (CONTENT_CHECKLIST fila 85).
const COPY = {
  caption: (page: string) => `Usuarios. ${page}. Solo lectura.`,
  name: "Nombre",
  email: "Correo",
  danceRole: "Rol de baile",
  plan: "Plan",
  state: "Estado",
  period: "Renueva o vence",
  createdAt: "Alta",
  noName: "Sin nombre",
  noRole: "Sin elegir",
  noPlan: "—",
  noPlanSr: "Sin plan",
  noPeriod: "—",
  noPeriodSr: "Sin fecha",
} as const;

// Columnas que se ocultan por ancho para que la tabla nunca empuje la página a lo ancho
// (D156): < md solo Nombre (con el correo debajo) y Estado; md suma Rol y Plan; lg, Correo
// propio y Renueva o vence; xl, Alta. Desde lg el ancho es fijo y el correo se corta con
// elipsis (completo en `title`).
const COL = {
  email: "hidden lg:table-cell",
  role: "hidden md:table-cell lg:w-28",
  plan: "hidden md:table-cell lg:w-32",
  state: "lg:w-36",
  period: "hidden lg:table-cell lg:w-44",
  createdAt: "hidden xl:table-cell xl:w-32",
} as const;

/**
 * Tabla de usuarios (handoff §3 Admin · Usuarios): `<table>` real con `<caption>` para lectores
 * de pantalla y cabeceras con `scope`; el nombre es la cabecera de cada fila. Solo lectura.
 */
export function UsersTable({
  users,
  caption,
}: {
  users: readonly AdminUser[];
  /** "Página 2 de 3": va en el `<caption>`. */
  caption: string;
}) {
  return (
    <table className="w-full border-collapse text-left lg:table-fixed">
      <caption className="sr-only">{COPY.caption(caption)}</caption>
      <thead>
        <tr className="border-b border-divider">
          <Th>{COPY.name}</Th>
          <Th className={COL.email}>{COPY.email}</Th>
          <Th className={COL.role}>{COPY.danceRole}</Th>
          <Th className={COL.plan}>{COPY.plan}</Th>
          <Th className={COL.state}>{COPY.state}</Th>
          <Th className={COL.period}>{COPY.period}</Th>
          <Th className={COL.createdAt}>{COPY.createdAt}</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </tbody>
    </table>
  );
}

function Th({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-2 py-3 align-bottom md:px-3 type-h5 text-text-secondary first:pl-0 last:pr-0",
        className,
      )}
    >
      {children}
    </th>
  );
}

const cell = "px-2 py-3 align-middle md:px-3 type-small first:pl-0 last:pr-0";

function UserRow({ user }: { user: AdminUser }) {
  const pill = USER_STATE_PILLS[user.state];
  const appRole = APP_ROLE_LABELS[user.appRole];
  const role = danceRoleLabel(user.danceRole);
  return (
    <tr className="border-b border-divider">
      <th scope="row" className={cn(cell, "font-normal")}>
        <span className="flex min-h-8 flex-col justify-center gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "type-body font-semibold break-words max-md:wrap-anywhere",
                !user.name && "font-normal text-text-secondary",
              )}
            >
              {user.name ?? COPY.noName}
            </span>
            {appRole ? <Badge>{appRole}</Badge> : null}
          </span>
          {/* Sin columna de correo (< lg), va debajo del nombre. */}
          <span className="text-text-secondary wrap-anywhere lg:hidden">
            {user.email}
          </span>
        </span>
      </th>
      <td className={cn(cell, COL.email)}>
        <span title={user.email} className="block truncate">
          {user.email}
        </span>
      </td>
      <td className={cn(cell, COL.role, !role && "text-text-secondary")}>
        {role ?? COPY.noRole}
      </td>
      <td className={cn(cell, COL.plan)}>
        {user.planName ?? <Missing visible={COPY.noPlan} sr={COPY.noPlanSr} />}
      </td>
      <td className={cn(cell, COL.state)}>
        {/* A 320 la pill puede partirse en dos líneas: la tabla no empuja la página. */}
        <Badge
          variant={pill.variant}
          className="max-md:h-auto max-md:min-h-6 max-md:whitespace-normal"
        >
          {pill.label}
        </Badge>
      </td>
      <td className={cn(cell, COL.period, "tabular-nums")}>
        {user.state !== "none" && user.currentPeriodEnd ? (
          <>
            <span className="text-text-secondary">
              {USER_PERIOD_PREFIX[user.state]}
            </span>{" "}
            <UserDate iso={user.currentPeriodEnd} />
          </>
        ) : (
          <Missing visible={COPY.noPeriod} sr={COPY.noPeriodSr} />
        )}
      </td>
      <td className={cn(cell, COL.createdAt, "tabular-nums")}>
        <UserDate iso={user.createdAt} />
      </td>
    </tr>
  );
}

/** Raya visible y texto para lectores de pantalla: una celda nunca queda muda. */
function Missing({ visible, sr }: { visible: string; sr: string }) {
  return (
    <>
      <span aria-hidden="true" className="text-text-secondary">
        {visible}
      </span>
      <span className="sr-only">{sr}</span>
    </>
  );
}

const noop = () => () => {};

/**
 * Fecha corta ("30 oct 2026") en la zona del dispositivo. Como LocalDate de Perfil: el servidor
 * y la hidratación la escriben en UTC y después React la cambia a la local.
 */
function UserDate({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noop,
    () => shortDate(iso),
    () => shortDate(iso, "UTC"),
  );
  return <time dateTime={iso}>{text}</time>;
}
