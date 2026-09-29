"use client";

import { ArrowRight, Heart, Pause, Play, Repeat } from "lucide-react";
import { useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { SwitchField } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/*
 * Demostraciones con estado de /primitives. Todo el texto es de ejemplo (placeholder realista,
 * CONTENT_CHECKLIST fila 30): nombres de pasos, planes y avisos no son el catálogo real.
 */

export function LoadingButtonDemo() {
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        loading={saving}
        loadingText="Guardando…"
        onClick={() => setSaving(true)}
      >
        Guardar cambios
      </Button>
      <Button variant="outline" onClick={() => setSaving(false)}>
        Detener la demo
      </Button>
    </div>
  );
}

export function IconButtonDemo() {
  const [playing, setPlaying] = useState(false);
  const [favorite, setFavorite] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton
        aria-label={playing ? "Pausar la canción" : "Reproducir la canción"}
        variant="outline"
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? (
          <Pause strokeWidth={ICON_STROKE} aria-hidden="true" />
        ) : (
          <Play strokeWidth={ICON_STROKE} aria-hidden="true" />
        )}
      </IconButton>
      <IconButton
        aria-label="Marcar Enchufla como favorito"
        aria-pressed={favorite}
        onClick={() => setFavorite((f) => !f)}
      >
        <Heart
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
          className={favorite ? "fill-current" : undefined}
        />
      </IconButton>
      <IconButton aria-label="Repasar Dile que no" iconSize="dense">
        <Repeat strokeWidth={ICON_STROKE} aria-hidden="true" />
      </IconButton>
    </div>
  );
}

export function SelectDemo() {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Estilo</Label>
      <Select defaultValue="casino">
        <SelectTrigger id={id}>
          <SelectValue placeholder="Elige un estilo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="casino">Salsa casino</SelectItem>
          <SelectItem value="merengue">Merengue</SelectItem>
          <SelectItem value="bachata" disabled>
            Bachata (pronto)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function SwitchDemo() {
  return (
    <div className="flex flex-col divide-y divide-divider">
      <SwitchField
        label="Voz del coach"
        description="Anuncia el paso siguiente en los tiempos 5 y 6."
        defaultChecked
      />
      <SwitchField label="Cuenta en voz alta" />
      <SwitchField
        label="Metrónomo"
        description="Disponible cuando la canción tenga su rejilla de tiempos."
        disabled
      />
    </div>
  );
}

const LEVEL_NAMES = ["Muy fácil", "Fácil", "Media", "Difícil", "Muy difícil"];

export function SliderDemo() {
  const id = useId();
  const [value, setValue] = useState([3]);
  const text = (v: number) => `${v} de 5 · ${LEVEL_NAMES[v - 1]}`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <Label id={id}>Dificultad de la combinación</Label>
        <span className="type-small text-text-secondary tabular-nums">
          {text(value[0])}
        </span>
      </div>
      <Slider
        aria-labelledby={id}
        min={1}
        max={5}
        step={1}
        value={value}
        onValueChange={setValue}
        valueText={text}
      />
    </div>
  );
}

const STEPS = [
  "Guapea",
  "Dile que no",
  "Enchufla",
  "Dile que sí",
  "Exhibe",
  "Sombrero",
];

export function ChipsDemo() {
  const [level, setLevel] = useState("basico");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 id="chips-filtro" className="type-h5">
          Filtro por paso (varios)
        </h3>
        <ToggleGroup
          type="multiple"
          aria-labelledby="chips-filtro"
          defaultValue={["Enchufla"]}
        >
          {STEPS.map((step) => (
            <ToggleGroupItem key={step} value={step}>
              {step}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <h3 id="chips-nivel" className="type-h5">
          Nivel (uno)
        </h3>
        <ToggleGroup
          type="single"
          aria-labelledby="chips-nivel"
          value={level}
          // Elección única: no se puede quedar sin valor.
          onValueChange={(v) => v && setLevel(v)}
        >
          <ToggleGroupItem value="basico">Básico</ToggleGroupItem>
          <ToggleGroupItem value="intermedio">Intermedio</ToggleGroupItem>
          <ToggleGroupItem value="avanzado">Avanzado</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="type-h5">Chip suelto</h3>
        <div>
          <Toggle>Solo favoritos</Toggle>
        </div>
      </div>
    </div>
  );
}

export function SegmentedDemo() {
  const [role, setRole] = useState("lider");
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <h3 id="segmentado-rol" className="type-h5">
        Tu rol
      </h3>
      <ToggleGroup
        type="single"
        variant="segment"
        aria-labelledby="segmentado-rol"
        value={role}
        onValueChange={(v) => v && setRole(v)}
      >
        <ToggleGroupItem value="lider">Líder</ToggleGroupItem>
        <ToggleGroupItem value="seguidor">Seguidor</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="video" className="max-w-md">
      <TabsList aria-label="Lección 3">
        <TabsTrigger value="video">Video</TabsTrigger>
        <TabsTrigger value="tiempos">Tiempos</TabsTrigger>
      </TabsList>
      <TabsContent value="video">
        Enchufla desde guapea: el líder marca en el 1 y la vuelta cierra en el
        8.
      </TabsContent>
      <TabsContent value="tiempos">
        1–3 guapea atrás · 5–7 giro a la derecha · 8 cierre.
      </TabsContent>
    </Tabs>
  );
}

export function SheetDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Cambiar de estilo</Button>
      </SheetTrigger>
      <SheetContent title="Elige el estilo">
        <SheetDescription>
          Tu progreso de cada estilo se guarda por separado.
        </SheetDescription>
        <div className="flex flex-col gap-3">
          <SheetClose asChild>
            <Button className="w-full">Salsa casino</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Merengue
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Salir de la práctica</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>¿Salir de la práctica?</AlertDialogTitle>
        <AlertDialogDescription>
          Llevas 3 de 8 combinaciones. Si sales ahora, esta práctica no cuenta
          para tu racha.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir bailando</AlertDialogCancel>
          <AlertDialogAction>Salir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PendingFieldDemo() {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Código de invitación</Label>
      <Input
        id={id}
        defaultValue="SALSA-2026"
        disabled
        aria-describedby={`${id}-msg`}
      />
      <FieldMessage id={`${id}-msg`} tone="pending">
        Comprobando el código…
      </FieldMessage>
    </div>
  );
}

export function LinkButtonDemo() {
  return (
    <Button asChild variant="quiet">
      <a href="#botones">
        Ver planes
        <ArrowRight strokeWidth={ICON_STROKE} aria-hidden="true" />
      </a>
    </Button>
  );
}
