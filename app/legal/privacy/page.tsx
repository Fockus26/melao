import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { LegalDocument, LegalSection } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos guarda Melao, para qué los usa, con qué proveedores los comparte y cómo puedes consultarlos o eliminarlos.",
  alternates: { canonical: "/legal/privacy" },
};

// Texto provisional, no revisado por un abogado; datos de la empresa entre corchetes
// (CONTENT_CHECKLIST fila 52).
export default function PrivacyPage() {
  return (
    <PublicShell>
      <LegalDocument
        title="Política de privacidad"
        updated={{ iso: "2026-09-29", label: "29 de septiembre de 2026" }}
        related={{
          href: "/legal/terms",
          label: "los términos y condiciones",
        }}
      >
        <p className="type-body text-text">
          En Melao guardamos solo los datos que necesitamos para que aprendas y
          practiques. Esta política explica cuáles son, para qué los usamos, con
          quién los compartimos y qué puedes hacer con ellos.
        </p>

        <LegalSection id="responsable" title="1. Responsable de tus datos">
          <p>
            El responsable del tratamiento es [RAZÓN SOCIAL], con domicilio en
            [DOMICILIO], [PAÍS]. Para cualquier asunto de privacidad, escríbenos
            a [CORREO DE CONTACTO].
          </p>
        </LegalSection>

        <LegalSection id="datos" title="2. Qué datos guardamos">
          <ul>
            <li>
              <strong className="font-semibold">Datos de la cuenta:</strong> tu
              correo y tu nombre. Si entras con contraseña, se guarda cifrada y
              nadie en Melao puede leerla. Si entras con Google, recibimos tu
              nombre y tu correo de esa cuenta.
            </li>
            <li>
              <strong className="font-semibold">Progreso de práctica:</strong>{" "}
              las lecciones que viste, las prácticas que completaste, los pasos
              que marcaste como aprendidos y el calendario de repaso que se
              calcula a partir de ellos.
            </li>
            <li>
              <strong className="font-semibold">Preferencias:</strong> los
              estilos que te interesan, tu nivel, tu rol de baile y ajustes de
              la aplicación como el tema claro u oscuro.
            </li>
            <li>
              <strong className="font-semibold">Suscripción:</strong> el plan
              que tienes y su estado. Cuando haya cobros, los datos de pago los
              maneja el proveedor de pagos; nosotros no guardamos tu tarjeta.
            </li>
            <li>
              <strong className="font-semibold">Datos técnicos:</strong>{" "}
              registros de acceso (fecha, dirección IP y tipo de navegador) que
              los proveedores de infraestructura generan para mantener el
              servicio seguro y funcionando.
            </li>
          </ul>
          <p>
            No te pedimos datos sensibles, no usamos la cámara ni el micrófono y
            no vendemos tus datos.
          </p>
        </LegalSection>

        <LegalSection id="finalidad" title="3. Para qué los usamos">
          <ul>
            <li>Crear tu cuenta y permitirte entrar.</li>
            <li>Guardar tu progreso y proponerte qué repasar cada día.</li>
            <li>Gestionar tu suscripción.</li>
            <li>
              Enviarte correos necesarios del servicio: confirmar tu cuenta,
              restablecer la contraseña y avisos importantes sobre tu
              suscripción o estos documentos.
            </li>
            <li>
              Detectar fallas y abusos, y mejorar la aplicación con información
              agregada que no te identifica.
            </li>
          </ul>
          <p>
            Tratamos tus datos porque son necesarios para darte el servicio que
            contrataste, para cumplir obligaciones legales y, en el caso de la
            seguridad y la mejora del servicio, por nuestro interés legítimo en
            que Melao funcione bien.
          </p>
        </LegalSection>

        <LegalSection id="proveedores" title="4. Con quién los compartimos">
          <p>
            Solo con proveedores que nos ayudan a operar Melao y que tratan los
            datos por encargo nuestro:
          </p>
          <ul>
            <li>
              <strong className="font-semibold">Supabase:</strong> base de
              datos, inicio de sesión y almacenamiento de archivos.
            </li>
            <li>
              <strong className="font-semibold">Vercel:</strong> alojamiento de
              la aplicación web.
            </li>
            <li>
              <strong className="font-semibold">Google:</strong> solo si eliges
              entrar con tu cuenta de Google.
            </li>
            <li>
              <strong className="font-semibold">Proveedor de pagos:</strong>{" "}
              cuando se active el cobro de la suscripción.
            </li>
          </ul>
          <p>
            También podemos entregar datos cuando una autoridad competente lo
            exija conforme a la ley.
          </p>
        </LegalSection>

        <LegalSection
          id="transferencias"
          title="5. Transferencias internacionales"
        >
          <p>
            Algunos de estos proveedores guardan los datos en servidores fuera
            de tu país, por ejemplo en Estados Unidos. En esos casos exigimos
            que apliquen medidas de protección equivalentes a las de esta
            política.
          </p>
        </LegalSection>

        <LegalSection id="conservacion" title="6. Cuánto tiempo los guardamos">
          <p>
            Guardamos tus datos mientras tengas una cuenta. Si la eliminas,
            borramos tu cuenta, tu progreso y tus preferencias en un plazo de 30
            días, salvo los datos que la ley nos obligue a conservar (por
            ejemplo, registros de facturación), que se guardan solo por el
            tiempo que esa ley exija.
          </p>
        </LegalSection>

        <LegalSection id="derechos" title="7. Tus derechos">
          <p>Puedes pedirnos en cualquier momento:</p>
          <ul>
            <li>Acceder a los datos que tenemos sobre ti.</li>
            <li>Corregir los que estén mal o incompletos.</li>
            <li>Eliminar tu cuenta y tus datos.</li>
            <li>Recibir una copia de tus datos en un formato de uso común.</li>
            <li>Oponerte a un tratamiento o pedir que lo limitemos.</li>
          </ul>
          <p>
            Escríbenos a [CORREO DE CONTACTO] desde el correo de tu cuenta y te
            responderemos en un plazo máximo de 30 días. Si no quedas conforme,
            puedes acudir a la autoridad de protección de datos de tu país.
          </p>
        </LegalSection>

        <LegalSection
          id="almacenamiento-local"
          title="8. Cookies y almacenamiento local"
        >
          <p>
            Usamos solo cookies y almacenamiento del navegador necesarios para
            que la aplicación funcione: mantener tu sesión abierta y recordar el
            tema que elegiste. No usamos cookies de publicidad ni de seguimiento
            de terceros.
          </p>
        </LegalSection>

        <LegalSection id="seguridad" title="9. Seguridad">
          <p>
            Las conexiones con Melao van cifradas y el acceso a los datos está
            restringido para que cada persona vea solo lo suyo. Ningún sistema
            es infalible: si detectamos un incidente que afecte tus datos, te lo
            diremos y tomaremos medidas para contenerlo.
          </p>
        </LegalSection>

        <LegalSection id="menores" title="10. Menores de edad">
          <p>
            Melao no está dirigido a menores de 16 años. Si sabemos que una
            cuenta pertenece a alguien menor de esa edad sin autorización de su
            madre, padre o tutor, la eliminaremos.
          </p>
        </LegalSection>

        <LegalSection id="cambios" title="11. Cambios a esta política">
          <p>
            Si cambiamos esta política de forma importante, te avisaremos por
            correo o dentro de la aplicación antes de que el cambio entre en
            vigor. La fecha de arriba indica la última actualización.
          </p>
        </LegalSection>
      </LegalDocument>
    </PublicShell>
  );
}
