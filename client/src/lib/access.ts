export type AppRole = "owner" | "doctor" | "assistant" | "reception" | "finance";
export type AppView =
  | "dashboard"
  | "patients"
  | "record"
  | "photos"
  | "lesions"
  | "prescription"
  | "exams"
  | "agenda"
  | "messages"
  | "finance";

export const clinicalViews: readonly AppView[] = [
  "record",
  "photos",
  "lesions",
  "prescription",
  "exams",
];

const receptionViews: readonly AppView[] = [
  "dashboard",
  "patients",
  "agenda",
  "messages",
  "finance",
];

export function isAppRole(value: unknown): value is AppRole {
  return value === "owner"
    || value === "doctor"
    || value === "assistant"
    || value === "reception"
    || value === "finance";
}

export function canAccessView(role: AppRole | "test" | null, view: AppView): boolean {
  if (role === "test") return true;
  if (role === "owner" || role === "doctor" || role === "assistant") return true;
  if (role === "reception") return receptionViews.includes(view);
  if (role === "finance") return ["dashboard", "patients", "agenda", "messages", "finance"].includes(view);
  return false;
}
