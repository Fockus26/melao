import { Check, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialogDemo,
  ChipsDemo,
  IconButtonDemo,
  LinkButtonDemo,
  LoadingButtonDemo,
  PendingFieldDemo,
  RevealDemo,
  SegmentedDemo,
  SelectDemo,
  SheetDemo,
  SliderDemo,
  SwitchDemo,
  TabsDemo,
} from "./demos";

/**
 * Muestra de primitivos (handoff §7 paso 2): cada uno con sus variantes y estados, en claro y
 * oscuro. Interna como /tokens: sin enlace desde la app y fuera de buscadores.
 * Copy de ejemplo: placeholder realista (CONTENT_CHECKLIST fila 30).
 */
export const metadata: Metadata = {
  title: "Primitivos",
  robots: { index: false, follow: false },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-6 border-t border-divider pt-8"
    >
      <h2 id={`${id}-titulo`} className="type-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Demo({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="type-overline text-text-secondary">{title}</h3>
      {children}
    </div>
  );
}

function Buttons() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Demo title="Variantes · md (48)">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Empezar la práctica</Button>
          <Button variant="outline">Ver la lección</Button>
          <Button variant="quiet">Ahora no</Button>
          <Button variant="danger">Cancelar suscripción</Button>
        </div>
      </Demo>
      <Demo title="Tamaño lg (56) · ancho completo en móvil">
        <Button size="lg" className="w-full sm:w-auto">
          Empieza gratis
        </Button>
      </Demo>
      <Demo title="Deshabilitado con la razón en texto">
        <div className="flex flex-col items-start gap-2">
          <Button disabled aria-describedby="razon-publicar">
            Publicar lección
          </Button>
          <p id="razon-publicar" className="type-small text-text-secondary">
            Falta el video del rol seguidor.
          </p>
        </div>
      </Demo>
      <Demo title="Cargando (ancho fijo, aria-busy)">
        <LoadingButtonDemo />
      </Demo>
      <Demo title="Como enlace (a)">
        <LinkButtonDemo />
      </Demo>
      <Demo title="IconButton (48, pill, aria-label obligatorio)">
        <IconButtonDemo />
      </Demo>
    </div>
  );
}

function Fields() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="campo-nombre">Nombre</Label>
        <Input
          id="campo-nombre"
          placeholder="Cómo te llamamos"
          autoComplete="given-name"
          aria-describedby="campo-nombre-ayuda"
        />
        <FieldMessage id="campo-nombre-ayuda">
          Lo usa el coach para saludarte.
        </FieldMessage>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="campo-correo">Correo</Label>
        <Input
          id="campo-correo"
          type="email"
          defaultValue="ana@correo"
          aria-invalid="true"
          aria-describedby="campo-correo-error"
        />
        <FieldMessage id="campo-correo-error" tone="error">
          Escribe un correo completo, como ana@correo.com.
        </FieldMessage>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="campo-usuario">Usuario</Label>
        <Input
          id="campo-usuario"
          defaultValue="ana.baila"
          data-status="success"
          aria-describedby="campo-usuario-ok"
        />
        <FieldMessage id="campo-usuario-ok" tone="success">
          Disponible.
        </FieldMessage>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="campo-plan">Plan</Label>
        <Input id="campo-plan" defaultValue="Básico" disabled />
      </div>
      <PendingFieldDemo />
      <SelectDemo />
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="campo-nota">Nota para tu práctica</Label>
        <Textarea
          id="campo-nota"
          placeholder="Por ejemplo: cuidar la salida del Dile que no en el 1."
        />
      </div>
    </div>
  );
}

function Badges() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Borrador</Badge>
      <Badge variant="ok">
        <CircleCheck strokeWidth={ICON_STROKE} aria-hidden="true" />
        Publicada
      </Badge>
      <Badge variant="warning">Sin licencia</Badge>
      <Badge variant="error">Pago rechazado</Badge>
    </div>
  );
}

function Banners() {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <Alert variant="info">
        <AlertContent>
          <AlertDescription>
            Practica con audífonos: el coach se oye mejor sobre la canción.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Alert variant="success">
        <AlertContent>
          <AlertTitle>Práctica guardada</AlertTitle>
          <AlertDescription>
            Repasas Enchufla de nuevo en 3 días.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Alert variant="warning">
        <AlertContent>
          <AlertDescription>
            Tu pantalla puede apagarse durante la práctica: este navegador no
            permite mantenerla encendida.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Alert variant="error">
        <AlertContent>
          <AlertTitle>No se pudo cargar la canción</AlertTitle>
          <AlertDescription>
            Revisa tu conexión e inténtalo de nuevo.
          </AlertDescription>
        </AlertContent>
        <AlertAction>
          <Button variant="outline">Reintentar</Button>
        </AlertAction>
      </Alert>
    </div>
  );
}

function Cards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Básico</CardTitle>
          <CardDescription>
            Curso por rol, coach por voz y repaso de tus pasos.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline">Elegir Básico</Button>
        </CardFooter>
      </Card>
      <Card selected>
        <CardHeader>
          <p className="flex items-center gap-2 type-small font-semibold text-gold-700">
            <Check
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="size-4.5"
            />
            Tu plan
          </p>
          <CardTitle>Consultoría</CardTitle>
          <CardDescription>
            Todo lo del Básico y correcciones de tus videos. US$40 al mes.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card size="compact">
        <CardContent className="flex items-center justify-between gap-3">
          <span className="type-body">Lección 3 · Enchufla</span>
          <Badge>Actual</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function Skeletons() {
  return (
    <div aria-busy="true" className="flex max-w-md flex-col gap-3">
      <span className="sr-only">Cargando la lección…</span>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-12 w-40 rounded-md" />
    </div>
  );
}

export default function PrimitivosPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-12 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-4">
        <p className="type-eyebrow text-gold-700">Referencia interna</p>
        <h1 className="type-display">Primitivos de Melao</h1>
        <p className="type-body max-w-prose text-text-secondary">
          Componentes de shadcn/ui ajustados al handoff, con los tokens del
          tema. Los textos son de ejemplo.
        </p>
        <ThemeSwitch />
      </header>

      <Section id="botones" title="Button e IconButton">
        <Buttons />
      </Section>

      <Section id="campos" title="Input, Textarea, Label y Select">
        <Fields />
      </Section>

      <Section id="switch" title="Switch">
        <div className="max-w-md">
          <SwitchDemo />
        </div>
      </Section>

      <Section id="slider" title="Slider">
        <div className="max-w-md">
          <SliderDemo />
        </div>
      </Section>

      <Section id="chips" title="Chips (Toggle y ToggleGroup)">
        <ChipsDemo />
      </Section>

      <Section id="segmentado" title="SegmentedControl y Tabs">
        <div className="grid gap-8 md:grid-cols-2">
          <SegmentedDemo />
          <Demo title="Tabs">
            <TabsDemo />
          </Demo>
        </div>
      </Section>

      <Section id="pills" title="Pill (Badge)">
        <Badges />
      </Section>

      <Section id="banners" title="Banner (Alert)">
        <Banners />
        <Demo title="Mensajes que entran y salen (altura animada)">
          <RevealDemo />
        </Demo>
      </Section>

      <Section id="cards" title="Card">
        <Cards />
      </Section>

      <Section id="skeleton" title="Skeleton">
        <Skeletons />
      </Section>

      <Section id="sheet" title="Sheet y diálogo de confirmación">
        <div className="flex flex-wrap gap-3">
          <SheetDemo />
          <AlertDialogDemo />
        </div>
      </Section>
    </main>
  );
}
