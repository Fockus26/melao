import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import {
  LEGAL_INLINE_LINK,
  LegalDocument,
  LegalSection,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de uso de Melao: la cuenta, la suscripción mensual, el contenido del curso y la práctica segura en casa.",
  alternates: { canonical: "/legal/terms" },
};

// Texto provisional, no revisado por un abogado (CONTENT_CHECKLIST fila 51). Los datos de la
// empresa van entre corchetes hasta que César los defina (fila 52).
export default function TermsPage() {
  return (
    <PublicShell>
      <LegalDocument
        title="Términos y condiciones"
        updated={{ iso: "2026-09-29", label: "29 de septiembre de 2026" }}
        related={{
          href: "/legal/privacy",
          label: "la política de privacidad",
        }}
      >
        <p className="type-body text-text">
          Estos términos regulan el uso de Melao, la aplicación para aprender
          salsa casino y merengue en casa con un curso en video, un coach por
          voz y repaso espaciado. Al crear una cuenta o usar la aplicación
          aceptas estas condiciones. Si no estás de acuerdo con ellas, no uses
          Melao.
        </p>

        <LegalSection id="quienes-somos" title="1. Quiénes somos">
          <p>
            Melao es un servicio de [RAZÓN SOCIAL], con domicilio en
            [DOMICILIO], [PAÍS] (en adelante, «Melao», «nosotros»). Puedes
            escribirnos a [CORREO DE CONTACTO] para cualquier consulta sobre
            estos términos.
          </p>
        </LegalSection>

        <LegalSection id="servicio" title="2. El servicio">
          <p>
            Melao ofrece lecciones en video organizadas por estilo y por rol,
            prácticas guiadas por un coach que cuenta los tiempos al ritmo de la
            canción y un sistema de repaso que te propone qué practicar cada
            día. El contenido y las funciones pueden cambiar con el tiempo:
            agregamos pasos, canciones y estilos, y a veces retiramos o
            reemplazamos material.
          </p>
          <p>
            Melao es una herramienta de aprendizaje. No sustituye una clase
            presencial ni garantiza un nivel determinado de baile.
          </p>
        </LegalSection>

        <LegalSection id="cuenta" title="3. Tu cuenta">
          <ul>
            <li>
              Necesitas una cuenta para usar Melao. Puedes crearla con tu correo
              y una contraseña o con tu cuenta de Google.
            </li>
            <li>
              Debes tener al menos 16 años, o la edad mínima que exija la ley de
              tu país para aceptar este tipo de contratos.
            </li>
            <li>
              La información que nos das debe ser verdadera y estar al día.
            </li>
            <li>
              Eres responsable de mantener tu contraseña en secreto y de lo que
              ocurra con tu cuenta. Si crees que alguien entró sin permiso,
              cámbiala y escríbenos.
            </li>
            <li>La cuenta es personal: no la compartas ni la vendas.</li>
          </ul>
        </LegalSection>

        <LegalSection id="suscripcion" title="4. Suscripción y pagos">
          <p>
            El acceso completo a Melao requiere una suscripción mensual. Los
            planes, lo que incluye cada uno y sus precios se muestran en dólares
            estadounidenses (USD) antes de que confirmes la compra.
          </p>
          <ul>
            <li>
              La suscripción se renueva automáticamente cada mes, en la misma
              fecha, hasta que la canceles.
            </li>
            <li>
              El cobro lo procesa un proveedor de pagos externo. Melao no guarda
              los datos completos de tu tarjeta.
            </li>
            <li>
              Si cambiamos el precio de tu plan, te avisaremos con al menos 30
              días de anticipación. El nuevo precio se aplica desde la siguiente
              renovación y puedes cancelar antes si no estás de acuerdo.
            </li>
            <li>
              Los impuestos que correspondan según tu país pueden sumarse al
              precio publicado.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="cancelacion" title="5. Cancelación y reembolsos">
          <p>
            Puedes cancelar la suscripción en cualquier momento desde tu cuenta.
            La cancelación evita la siguiente renovación: conservas el acceso
            hasta el final del período que ya pagaste. No hacemos reembolsos de
            períodos parciales, salvo cuando la ley de tu país lo exija.
          </p>
          <p>
            Tu progreso de práctica se conserva si vuelves a suscribirte, salvo
            que elimines tu cuenta.
          </p>
        </LegalSection>

        <LegalSection id="uso-aceptable" title="6. Uso aceptable">
          <p>Al usar Melao te comprometes a no:</p>
          <ul>
            <li>
              Descargar, grabar, copiar o redistribuir los videos, los audios
              del coach o las canciones.
            </li>
            <li>
              Compartir tu acceso con otras personas o revender el contenido.
            </li>
            <li>
              Intentar acceder a partes del servicio o a datos de otras personas
              sin autorización, ni interferir con su funcionamiento.
            </li>
            <li>
              Usar el servicio con fines ilegales o para enviar contenido
              ofensivo, en los canales donde puedas escribir o subir material.
            </li>
          </ul>
        </LegalSection>

        <LegalSection
          id="contenido"
          title="7. Contenido y propiedad intelectual"
        >
          <p>
            Los videos, textos, audios del coach, combinaciones, la marca Melao
            y el diseño de la aplicación pertenecen a [RAZÓN SOCIAL] o a sus
            licenciantes. Las canciones se usan con licencia y solo pueden
            reproducirse dentro de la aplicación.
          </p>
          <p>
            Tu suscripción te da un permiso personal, limitado, no exclusivo e
            intransferible para ver y usar ese contenido mientras esté activa.
            No te transfiere ningún derecho de propiedad.
          </p>
          <p>
            Si en el futuro nos envías videos para recibir correcciones, sigues
            siendo el dueño de ellos. Nos autorizas a usarlos solo para darte
            ese servicio, y no los publicaremos sin tu permiso.
          </p>
        </LegalSection>

        <LegalSection id="salud" title="8. Salud y práctica segura">
          <p>
            Bailar es una actividad física. Practica en un espacio despejado,
            con calzado adecuado y a tu propio ritmo. Si tienes una lesión o una
            condición de salud, consulta a un profesional antes de empezar. Deja
            de practicar si sientes dolor o mareo.
          </p>
          <p>
            Eres responsable de las condiciones del lugar donde practicas y, si
            practicas en pareja, de acordar con tu pareja cómo hacerlo con
            cuidado.
          </p>
        </LegalSection>

        <LegalSection
          id="disponibilidad"
          title="9. Disponibilidad del servicio"
        >
          <p>
            Trabajamos para que Melao esté disponible siempre, pero puede haber
            interrupciones por mantenimiento, fallas técnicas o causas fuera de
            nuestro control. Cuando un corte planificado afecte tu práctica, lo
            avisaremos con anticipación siempre que sea posible.
          </p>
        </LegalSection>

        <LegalSection
          id="responsabilidad"
          title="10. Limitación de responsabilidad"
        >
          <p>
            En la medida en que la ley lo permita, Melao se ofrece «tal cual».
            No respondemos por daños indirectos ni por lesiones derivadas de la
            práctica, y nuestra responsabilidad total frente a ti se limita al
            importe que pagaste por la suscripción en los tres meses anteriores
            al hecho que la origina. Nada de esto limita los derechos que te da
            la ley de protección al consumidor de tu país.
          </p>
        </LegalSection>

        <LegalSection
          id="terminacion"
          title="11. Suspensión y cierre de la cuenta"
        >
          <p>
            Puedes eliminar tu cuenta cuando quieras. Podemos suspender o cerrar
            una cuenta que incumpla estos términos, avisándote el motivo salvo
            que la ley o la seguridad del servicio lo impidan. Qué pasa con tus
            datos al cerrar la cuenta se explica en la{" "}
            <Link href="/legal/privacy" className={LEGAL_INLINE_LINK}>
              política de privacidad
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection id="cambios" title="12. Cambios a estos términos">
          <p>
            Podemos actualizar estos términos. Si el cambio es importante, te lo
            diremos por correo o dentro de la aplicación antes de que entre en
            vigor. Si sigues usando Melao después de esa fecha, se entiende que
            aceptas la nueva versión.
          </p>
        </LegalSection>

        <LegalSection id="ley-aplicable" title="13. Ley aplicable">
          <p>
            Estos términos se rigen por las leyes de [PAÍS]. Cualquier
            controversia se someterá a los tribunales competentes de [PAÍS], sin
            perjuicio de los derechos que la ley de tu país de residencia te
            reconozca como consumidor.
          </p>
        </LegalSection>

        <LegalSection id="contacto" title="14. Contacto">
          <p>
            Para dudas sobre estos términos, escríbenos a [CORREO DE CONTACTO].
          </p>
        </LegalSection>
      </LegalDocument>
    </PublicShell>
  );
}
