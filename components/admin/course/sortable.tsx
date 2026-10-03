"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type ScreenReaderInstructions,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Lista ordenable por arrastre del Constructor del camino (handoff §3 Admin, D172), sobre
 * `@dnd-kit`: con puntero (arrastrar el asa) y con teclado (en el asa, Espacio o Enter levanta,
 * flechas mueven, Espacio suelta, Escape cancela), con anuncios en español para lectores de
 * pantalla. Durante el arrastre la fila va elevada (sombra `drag`, −10 px, −0.6°) y donde caerá
 * queda un hueco discontinuo gold-600. Con `prefers-reduced-motion` no hay transiciones.
 *
 * API:
 * - `SortableList`: `items`, `getId`, `getName` (para los anuncios), `onMove(id, posición
 *   1-based)`, `renderItem(item, handle)` y `label` (nombre de la lista).
 * - `DragHandle`: el asa de 40 (botón con nombre "Mover {nombre}"); recibe el `handle` que
 *   le pasa `renderItem`.
 * - `useReducedMotion()`.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia?.(REDUCED);
  mq?.addEventListener("change", onChange);
  return () => mq?.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia?.(REDUCED).matches === true,
    () => false,
  );
}

/** Duración del token `motion.duration-move` (CSS `--duration-move`), en ms. */
function moveDurationMs(): number {
  if (typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--duration-move")
    .trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return raw.endsWith("ms") ? n : n * 1000;
}

export type DragHandleBinding = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  /** Nombre accesible del asa ("Mover {nombre}"). */
  label: string;
  /** La copia elevada que sigue al puntero (sin asa activa ni contenido anidado). */
  overlay: boolean;
};

// Copy provisional (CONTENT_CHECKLIST fila 90).
const DND_COPY = {
  move: (name: string) => `Mover ${name}`,
  instructions:
    "Para mover, pulsa Espacio o Enter en el asa, usa las flechas arriba y abajo, y pulsa Espacio para soltar o Escape para cancelar.",
  start: (name: string, pos: number, total: number) =>
    `Levantaste ${name}, en la posición ${pos} de ${total}.`,
  over: (name: string, pos: number, total: number) =>
    `${name} pasa a la posición ${pos} de ${total}.`,
  end: (name: string, pos: number, total: number) =>
    `Soltaste ${name} en la posición ${pos} de ${total}.`,
  cancel: (name: string) => `Cancelado: ${name} vuelve a su lugar.`,
};

export function SortableList<T>({
  items,
  getId,
  getName,
  onMove,
  renderItem,
  label,
  disabled = false,
}: {
  items: readonly T[];
  getId: (item: T) => string;
  getName: (item: T) => string;
  onMove: (id: string, position: number) => void;
  renderItem: (item: T, handle: DragHandleBinding) => ReactNode;
  label: string;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    // 4 px antes de arrastrar: un clic en el asa no mueve nada.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = items.map(getId);
  const total = ids.length;
  const nameOf = (id: string | number) => {
    const item = items.find((i) => getId(i) === String(id));
    return item ? getName(item) : "";
  };
  const posOf = (id: string | number | undefined) =>
    id === undefined ? 0 : ids.indexOf(String(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      DND_COPY.start(nameOf(active.id), posOf(active.id), total),
    onDragOver: ({ active, over }) =>
      over
        ? DND_COPY.over(nameOf(active.id), posOf(over.id), total)
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? DND_COPY.end(nameOf(active.id), posOf(over.id), total)
        : DND_COPY.cancel(nameOf(active.id)),
    onDragCancel: ({ active }) => DND_COPY.cancel(nameOf(active.id)),
  };
  const instructions: ScreenReaderInstructions = {
    draggable: DND_COPY.instructions,
  };

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onMove(String(active.id), posOf(over.id));
  }

  const active = activeId
    ? items.find((i) => getId(i) === activeId)
    : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements,
        screenReaderInstructions: instructions,
      }}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <ul aria-label={label} className="flex flex-col">
          {items.map((item) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              name={getName(item)}
              reduced={reduced}
            >
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={reduced ? null : undefined}>
        {active ? (
          // Fila elevada del handoff: sombra `drag`, 10 px arriba y −0.6° (valor del handoff §3).
          <div
            inert
            className="-translate-y-2.5 -rotate-[0.6deg] rounded-sm border border-divider bg-bg shadow-drag"
          >
            {renderItem(active, {
              attributes: {} as DraggableAttributes,
              listeners: undefined,
              setActivatorNodeRef: () => {},
              label: DND_COPY.move(getName(active)),
              overlay: true,
            })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableRow({
  id,
  name,
  reduced,
  children,
}: {
  id: string;
  name: string;
  reduced: boolean;
  children: (handle: DragHandleBinding) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    transition: reduced
      ? null
      : { duration: moveDurationMs(), easing: "var(--ease-standard)" },
  });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: reduced ? undefined : transition,
      }}
      className={cn(
        "relative",
        // Hueco donde caerá: borde discontinuo gold-600; el contenido queda invisible.
        isDragging &&
          "rounded-sm outline-2 outline-gold-600 outline-dashed -outline-offset-2 *:invisible",
      )}
    >
      {children({
        attributes,
        listeners,
        setActivatorNodeRef,
        label: DND_COPY.move(name),
        overlay: false,
      })}
    </li>
  );
}

/** Asa de arrastre de 40 × 48: botón enfocable con el nombre "Mover {nombre}". */
export function DragHandle({
  handle,
  disabled = false,
}: {
  handle: DragHandleBinding;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      ref={handle.setActivatorNodeRef}
      {...handle.attributes}
      {...handle.listeners}
      aria-label={handle.label}
      disabled={disabled}
      className={cn(
        "inline-flex h-12 w-10 shrink-0 touch-none items-center justify-center rounded-sm text-text-secondary",
        "transition-colors duration-hover ease-standard motion-reduce:transition-none",
        "hover:bg-hover hover:text-text disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent",
        disabled ? "" : "cursor-grab active:cursor-grabbing",
      )}
    >
      <GripVertical
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className="size-4.5"
      />
    </button>
  );
}
