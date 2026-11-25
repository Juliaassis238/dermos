export type Patient = {
  id: string;
  full_name: string;
  preferred_name?: string | null;
  birth_date?: string | null;
  cpf_last4?: string | null;
  phone?: string | null;
  email?: string | null;
  fototipo?: string | null;
  allergies?: string | null;
  current_medications?: string | null;
  active?: boolean;
  initials: string;
  detail: string;
  tone: string;
};

export const emptyPatient: Patient = {
  id: "",
  full_name: "Nenhum paciente selecionado",
  initials: "MG",
  detail: "Cadastre um paciente para começar",
  tone: "#ae604d",
};

export function patientView(patient: any): Patient {
  const fullName = String(patient?.full_name ?? "").trim() || "Paciente";
  const birthDate = patient?.birth_date ? new Date(patient.birth_date) : null;
  const age = birthDate && !Number.isNaN(birthDate.getTime())
    ? `${new Date().getFullYear() - birthDate.getFullYear()} anos`
    : "Sem idade";

  return {
    ...patient,
    id: String(patient?.id ?? ""),
    full_name: fullName,
    initials: fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase(),
    detail: `${age} · ${patient?.fototipo || "Sem fototipo"}`,
    tone: "#ae604d",
  };
}
