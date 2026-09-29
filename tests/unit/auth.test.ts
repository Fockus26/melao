import { describe, expect, test } from "bun:test";
import {
  authErrorCopy,
  CALLBACK_ERRORS,
  callbackErrorReason,
  isCallbackErrorReason,
} from "@/lib/auth/errors";
import {
  callbackUrl,
  DEFAULT_AFTER_AUTH,
  isGuestOnlyPath,
  isProtectedPath,
  safeNext,
  signInPathFor,
} from "@/lib/auth/redirect";
import {
  checkPassword,
  isValidEmail,
  isValidName,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/validation";

describe("safeNext: solo rutas internas (sin open redirect)", () => {
  test("acepta rutas internas con query y hash", () => {
    expect(safeNext("/app")).toBe("/app");
    expect(safeNext("/app/curso?leccion=3#paso-2")).toBe(
      "/app/curso?leccion=3#paso-2",
    );
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/restablecer")).toBe("/restablecer");
  });

  test.each([
    ["vacío", ""],
    ["null", null],
    ["undefined", undefined],
    ["URL absoluta", "https://evil.com/app"],
    ["protocolo relativo", "//evil.com"],
    ["barra invertida", "/\\evil.com"],
    ["barra invertida codificada tal cual", "\\\\evil.com"],
    ["javascript:", "javascript:alert(1)"],
    ["sin barra inicial", "app"],
    ["tabulador dentro", "/\t/evil.com"],
    ["salto de línea", "/app\n"],
    ["bucle a entrar", "/entrar?next=/app"],
    ["bucle a registro", "/registro"],
    ["callback", "/auth/callback?code=x"],
    ["recuperar", "/recuperar"],
    ["muy largo", `/${"a".repeat(600)}`],
  ])("rechaza %s", (_, value) => {
    expect(safeNext(value)).toBe(DEFAULT_AFTER_AUTH);
  });

  test("normaliza segmentos que intentan salir del sitio", () => {
    // Resuelto, "/app/../..//evil.com" es "//evil.com": sería otro origen.
    expect(safeNext("/app/../..//evil.com")).toBe(DEFAULT_AFTER_AUTH);
    expect(safeNext("/app/./curso/../pasos")).toBe("/app/pasos");
    // Codificada no se decodifica: sigue siendo una ruta de este sitio.
    expect(new URL(safeNext("/%2F%2Fevil.com"), "https://melao.app").host).toBe(
      "melao.app",
    );
  });

  test("respeta el fallback", () => {
    expect(safeNext("https://evil.com", "/otra")).toBe("/otra");
  });
});

describe("rutas protegidas y solo para invitados", () => {
  test("protege /app y /admin por segmentos", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/curso/leccion-3")).toBe(true);
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/admin/pasos")).toBe(true);
    expect(isProtectedPath("/applause")).toBe(false);
    expect(isProtectedPath("/administrar")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/entrar")).toBe(false);
  });

  test("entrar y registro son solo para invitados; recuperar no", () => {
    expect(isGuestOnlyPath("/entrar")).toBe(true);
    expect(isGuestOnlyPath("/registro")).toBe(true);
    expect(isGuestOnlyPath("/recuperar")).toBe(false);
    expect(isGuestOnlyPath("/restablecer")).toBe(false);
  });

  test("signInPathFor lleva next salvo al destino por defecto", () => {
    expect(signInPathFor("/app")).toBe("/entrar");
    expect(signInPathFor("/app/curso?x=1")).toBe(
      "/entrar?next=%2Fapp%2Fcurso%3Fx%3D1",
    );
    expect(signInPathFor("//evil.com")).toBe("/entrar");
  });

  test("callbackUrl arma la vuelta con next seguro", () => {
    expect(callbackUrl("https://melao.app")).toBe(
      "https://melao.app/auth/callback",
    );
    expect(callbackUrl("https://melao.app", "/restablecer")).toBe(
      "https://melao.app/auth/callback?next=%2Frestablecer",
    );
    expect(callbackUrl("https://melao.app", "https://evil.com")).toBe(
      "https://melao.app/auth/callback",
    );
  });
});

describe("errores de Supabase en español", () => {
  test("credenciales, correo en uso, débil, límite", () => {
    expect(authErrorCopy({ code: "invalid_credentials" })).toEqual({
      message: expect.stringContaining("no coinciden"),
      field: "password",
    });
    expect(authErrorCopy({ code: "user_already_exists" }).field).toBe("email");
    expect(authErrorCopy({ code: "email_exists" }).message).toContain(
      "Ya hay una cuenta",
    );
    expect(authErrorCopy({ code: "weak_password" }).field).toBe("password");
    expect(
      authErrorCopy({ code: "over_request_rate_limit" }).message,
    ).toContain("demasiados intentos");
    expect(authErrorCopy({ status: 429 }).message).toContain(
      "demasiados intentos",
    );
  });

  test("enlace vencido", () => {
    for (const code of [
      "otp_expired",
      "flow_state_expired",
      "bad_code_verifier",
    ])
      expect(authErrorCopy({ code }).message).toContain("venció");
  });

  test("red caída y desconocidos", () => {
    expect(
      authErrorCopy({ name: "AuthRetryableFetchError" }).message,
    ).toContain("conexión");
    expect(
      authErrorCopy({ code: "algo_nuevo", status: 500 }).message,
    ).toContain("Inténtalo de nuevo");
    expect(authErrorCopy(null).field).toBeNull();
  });

  test("motivos del callback", () => {
    expect(callbackErrorReason("otp_expired")).toBe("enlace-vencido");
    expect(callbackErrorReason("bad_oauth_state")).toBe("google");
    expect(callbackErrorReason("pkce_code_verifier_not_found")).toBe(
      "otro-navegador",
    );
    expect(callbackErrorReason(null)).toBe("acceso");
    expect(isCallbackErrorReason("sin-codigo")).toBe(true);
    expect(isCallbackErrorReason("toString")).toBe(false);
    expect(isCallbackErrorReason("<script>")).toBe(false);
    for (const message of Object.values(CALLBACK_ERRORS))
      expect(message.length).toBeGreaterThan(0);
  });
});

describe("validación de formularios", () => {
  test("requisitos de contraseña", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(checkPassword("").valid).toBe(false);
    expect(checkPassword("abcdefgh").rules.map((r) => r.met)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(checkPassword("salsa2026").valid).toBe(false);
    expect(checkPassword("Salsa2026").valid).toBe(false);
    expect(checkPassword("Salsa2026!").valid).toBe(true);
    expect(checkPassword("Sa1!").valid).toBe(false);
    // Como Supabase: letras ASCII; "Ñ" y "ñ" no cuentan como mayúscula ni minúscula.
    expect(checkPassword("ÑÑññ2026!").valid).toBe(false);
    // Un símbolo fuera del conjunto de Supabase no cuenta.
    expect(checkPassword("Salsa2026¡").valid).toBe(false);
  });

  test("correo y nombre", () => {
    expect(isValidEmail("maria@ejemplo.com")).toBe(true);
    expect(isValidEmail(" maria@ejemplo.com ")).toBe(true);
    expect(isValidEmail("maria@ejemplo")).toBe(false);
    expect(isValidEmail("maria ejemplo.com")).toBe(false);
    expect(isValidName("  ")).toBe(false);
    expect(isValidName("María")).toBe(true);
    expect(isValidName("a".repeat(81))).toBe(false);
  });
});
