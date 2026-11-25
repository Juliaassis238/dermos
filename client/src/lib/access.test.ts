import { describe, expect, it } from "vitest";
import { canAccessView } from "./access";

describe("canAccessView", () => {
  it("permite à secretária as telas administrativas", () => {
    for (const view of ["dashboard", "patients", "agenda", "messages", "finance"] as const) {
      expect(canAccessView("reception", view)).toBe(true);
    }
  });

  it("nega à secretária todos os módulos de prontuário", () => {
    for (const view of ["record", "photos", "lesions", "prescription", "exams"] as const) {
      expect(canAccessView("reception", view)).toBe(false);
    }
  });

  it("nega acesso se o papel não estiver carregado ou for desconhecido", () => {
    expect(canAccessView(null, "dashboard")).toBe(false);
    expect(canAccessView(null, "record")).toBe(false);
  });

  it("mantém o acesso clínico somente para papéis clínicos autorizados", () => {
    expect(canAccessView("owner", "record")).toBe(true);
    expect(canAccessView("doctor", "photos")).toBe(true);
    expect(canAccessView("assistant", "exams")).toBe(true);
    expect(canAccessView("finance", "record")).toBe(false);
  });
});
