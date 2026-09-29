import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage, {
  metadata as privacyMetadata,
} from "@/app/legal/privacy/page";
import TermsPage, { metadata as termsMetadata } from "@/app/legal/terms/page";

const PAGES = [
  {
    name: "Términos",
    Page: TermsPage,
    metadata: termsMetadata,
    self: "/legal/terms",
    other: "/legal/privacy",
  },
  {
    name: "Privacidad",
    Page: PrivacyPage,
    metadata: privacyMetadata,
    self: "/legal/privacy",
    other: "/legal/terms",
  },
];

/** Texto visible, sin etiquetas ni atributos (los `href` no cuentan como datos inventados). */
const visibleText = (html: string) => html.replace(/<[^>]+>/g, " ");

describe.each(PAGES)("$name", ({ Page, metadata, self, other }) => {
  const html = renderToStaticMarkup(createElement(Page));

  test("un solo h1 y secciones h2 etiquetadas por su título", () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    const sections =
      html.match(/<section\b[^>]*aria-labelledby="([^"]+)"/g) ?? [];
    expect(sections.length).toBeGreaterThanOrEqual(8);
    expect(html.match(/<h2\b/g)).toHaveLength(sections.length);
    expect(html).not.toMatch(/<h[3-6]\b/);
  });

  test("avisa que el texto es provisional", () => {
    expect(html).toContain('role="status"');
    expect(visibleText(html)).toContain("aún no es el documento legal vigente");
  });

  test("fecha de actualización con <time> legible por máquina", () => {
    expect(html).toMatch(/<time dateTime="\d{4}-\d{2}-\d{2}"/i);
  });

  test("sin datos de la empresa inventados: solo placeholders", () => {
    const text = visibleText(html);
    expect(text).toContain("[RAZÓN SOCIAL]");
    expect(text).toContain("[CORREO DE CONTACTO]");
    expect(text).toContain("[PAÍS]");
    expect(text).not.toMatch(/\S+@\S+\.\S+/);
  });

  test("enlaza al otro documento y tiene metadata propia", () => {
    expect(html).toContain(`href="${other}"`);
    expect(typeof metadata.title).toBe("string");
    expect(metadata.description?.length).toBeGreaterThan(50);
    expect(metadata.alternates?.canonical).toBe(self);
  });
});
