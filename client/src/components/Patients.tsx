import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import { MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { emptyPatient, patientView, type Patient } from "@/lib/patients";
import "./Patients.css";

type PatientForm = {
  full_name: string;
  preferred_name: string;
  birth_date: string;
  cpf_last4: string;
  phone: string;
  email: string;
  fototipo: string;
  allergies: string;
  current_medications: string;
};

const emptyForm: PatientForm = {
  full_name: "",
  preferred_name: "",
  birth_date: "",
  cpf_last4: "",
  phone: "",
  email: "",
  fototipo: "",
  allergies: "",
  current_medications: "",
};

type PatientsProps = {
  go: (view: "dashboard" | "patients" | "record" | "photos" | "lesions" | "prescription" | "exams" | "agenda" | "messages" | "finance") => void;
  setPatient: (patient: Patient) => void;
  sessionEmail: string | null;
  sessionRole: string | null;
  testPatients: Patient[];
  setTestPatients: Dispatch<SetStateAction<Patient[]>>;
  selectedPatientId: string;
  onCountChange: () => void;
};

function directoryPatient(row: {
  id: string;
  full_name: string;
  preferred_name: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
}) {
  const fullName = String(row.full_name ?? "").trim() || "Paciente";
  return {
    id: String(row.id),
    full_name: fullName,
    preferred_name: row.preferred_name,
    phone: row.phone,
    email: row.email,
    active: row.active,
    initials: fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    detail: "",
    tone: "#ae604d",
  } satisfies Patient;
}

export function Patients({
  go,
  setPatient,
  sessionEmail,
  sessionRole,
  testPatients,
  setTestPatients,
  selectedPatientId,
  onCountChange,
}: PatientsProps) {
  const isTestMode = sessionEmail === "modo-teste";
  const isReception = sessionRole === "reception";
  const [databasePatients, setDatabasePatients] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const items = isTestMode ? testPatients : databasePatients;

  async function loadPatients() {
    if (isTestMode) return;

    if (isReception) {
      const { data, error } = await supabase
        .from("patient_directory")
        .select("id,full_name,preferred_name,phone,email,active,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        setMessage(`Não foi possível carregar os pacientes: ${error.message}`);
        return;
      }

      setDatabasePatients((data ?? []).map((row) => directoryPatient(row)));
      setMessage("");
      return;
    }

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setMessage(`Não foi possível carregar os pacientes: ${error.message}`);
      return;
    }

    setDatabasePatients((data ?? []).map(patientView));
    setMessage("");
  }

  useEffect(() => {
    if (isTestMode) {
      setDatabasePatients([]);
      setMessage("");
      return;
    }
    void loadPatients();
  }, [sessionEmail, sessionRole]);

  const visible = items.filter((patient) => {
    const search = query.toLowerCase().trim();
    const values = isReception
      ? [patient.full_name, patient.preferred_name, patient.phone, patient.email]
      : [patient.full_name, patient.phone, patient.email, patient.cpf_last4];
    return !search || values.some((value) => value?.toLowerCase().includes(search));
  });

  function newPatient() {
    setEditing(null);
    setForm(emptyForm);
    setMessage("");
    setOpen(true);
  }

  function editPatient(patient: Patient) {
    setEditing(patient);
    setForm(isReception ? {
      ...emptyForm,
      full_name: patient.full_name,
      preferred_name: patient.preferred_name ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
    } : {
      full_name: patient.full_name,
      preferred_name: patient.preferred_name ?? "",
      birth_date: patient.birth_date ?? "",
      cpf_last4: patient.cpf_last4 ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      fototipo: patient.fototipo ?? "",
      allergies: patient.allergies ?? "",
      current_medications: patient.current_medications ?? "",
    });
    setMessage("");
    setOpen(true);
  }

  function normalizedForm() {
    return {
      full_name: form.full_name.trim(),
      preferred_name: form.preferred_name.trim() || null,
      birth_date: form.birth_date || null,
      cpf_last4: form.cpf_last4.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      fototipo: form.fototipo.trim() || null,
      allergies: form.allergies.trim() || null,
      current_medications: form.current_medications.trim() || null,
    };
  }

  function normalizedDirectoryForm() {
    return {
      full_name: form.full_name.trim(),
      preferred_name: form.preferred_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    };
  }

  async function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.full_name.trim()) {
      setMessage("Informe o nome completo do paciente.");
      return;
    }

    setSaving(true);
    try {
      if (isReception) {
        const values = normalizedDirectoryForm();

        if (isTestMode) {
          const savedPatient = directoryPatient({
            ...values,
            id: editing?.id ?? `test-${crypto.randomUUID()}`,
            active: true,
          });
          setTestPatients((current) => editing
            ? current.map((patient) => patient.id === editing.id ? savedPatient : patient)
            : [savedPatient, ...current]);
          setOpen(false);
          return;
        }

        if (editing) {
          const { error } = await supabase.rpc("update_reception_patient", {
            p_patient_id: editing.id,
            p_full_name: values.full_name,
            p_preferred_name: values.preferred_name,
            p_phone: values.phone,
            p_email: values.email,
          });
          if (error) {
            setMessage(`Não foi possível salvar o paciente: ${error.message}`);
            return;
          }
          const savedPatient = directoryPatient({ ...values, id: editing.id, active: true });
          setDatabasePatients((current) => current.map((patient) => patient.id === savedPatient.id ? savedPatient : patient));
        } else {
          const { data, error } = await supabase.rpc("create_reception_patient", {
            p_full_name: values.full_name,
            p_preferred_name: values.preferred_name,
            p_phone: values.phone,
            p_email: values.email,
          });
          if (error) {
            setMessage(`Não foi possível salvar o paciente: ${error.message}`);
            return;
          }
          const savedPatient = directoryPatient({ ...values, id: String(data), active: true });
          setDatabasePatients((current) => [savedPatient, ...current]);
          onCountChange();
        }
        setOpen(false);
        return;
      }

      const values = normalizedForm();

      if (isTestMode) {
        const savedPatient = patientView({
          ...values,
          id: editing?.id ?? `test-${crypto.randomUUID()}`,
          active: true,
        });
        const nextPatients = editing
          ? testPatients.map((patient) => patient.id === editing.id ? savedPatient : patient)
          : [savedPatient, ...testPatients];
        setTestPatients(nextPatients);
        setPatient(savedPatient);
        setOpen(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setMessage("Sua sessão expirou. Entre novamente para salvar o paciente.");
        return;
      }

      const result = editing
        ? await supabase
          .from("patients")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", editing.id)
          .select("*")
          .single()
        : await supabase
          .from("patients")
          .insert({ ...values, created_by: authData.user.id })
          .select("*")
          .single();

      if (result.error) {
        setMessage(`Não foi possível salvar o paciente: ${result.error.message}`);
        return;
      }

      const savedPatient = patientView(result.data);
      setDatabasePatients((current) => editing
        ? current.map((patient) => patient.id === savedPatient.id ? savedPatient : patient)
        : [savedPatient, ...current]);
      setPatient(savedPatient);
      setOpen(false);
      if (!editing) onCountChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocorreu um erro ao salvar o paciente.");
    } finally {
      setSaving(false);
    }
  }

  async function removePatient() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteMessage("");

    try {
      if (isTestMode) {
        setTestPatients((current) => current.filter((patient) => patient.id !== deleteTarget.id));
      } else if (isReception) {
        const { error } = await supabase.rpc("archive_reception_patient", {
          p_patient_id: deleteTarget.id,
        });
        if (error) {
          setDeleteMessage(`Não foi possível arquivar o paciente: ${error.message}`);
          return;
        }
        setDatabasePatients((current) => current.filter((patient) => patient.id !== deleteTarget.id));
        onCountChange();
      } else {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          setDeleteMessage("Sua sessão expirou. Entre novamente para excluir o paciente da lista.");
          return;
        }

        // Inactive patients leave the active roster while their clinical history remains intact.
        const { data, error } = await supabase
          .from("patients")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("id", deleteTarget.id)
          .eq("active", true)
          .select("id")
          .single();

        if (error) {
          setDeleteMessage(`Não foi possível excluir o paciente da lista: ${error.message}`);
          return;
        }
        if (!data) {
          setDeleteMessage("Este paciente já não está na lista ativa. Atualize a página e tente novamente.");
          return;
        }

        setDatabasePatients((current) => current.filter((patient) => patient.id !== deleteTarget.id));
        onCountChange();
      }

      if (!isReception && selectedPatientId === deleteTarget.id) setPatient(emptyPatient);
      if (editing?.id === deleteTarget.id) {
        setOpen(false);
        setEditing(null);
      }
      setMessage(isTestMode
        ? "Paciente removido da sessão de teste."
        : isReception
          ? "Paciente arquivado; o prontuário vinculado foi preservado."
          : "Paciente excluído da lista ativa; o prontuário vinculado foi preservado.");
      setDeleteTarget(null);
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : "Ocorreu um erro ao excluir o paciente.");
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">{isTestMode ? "MODO DE TESTE · LOCAL" : isReception ? "BASE DERMOS · CADASTRO" : "BASE DERMOS · CADASTRO PRIVADO"}</p>
        <h1>Pacientes</h1>
        <p>{isTestMode
          ? "Cadastros temporários ficam somente nesta sessão e não são enviados ao banco."
          : isReception
            ? "Gerencie os dados de contato e a situação cadastral dos pacientes."
            : "Cadastre, pesquise, edite e abra fichas persistidas no Supabase."}</p>
      </div>
      <button className="primary" type="button" onClick={newPatient}><Plus size={16}/> Novo paciente</button>
    </div>

    {message && <p role="status" className="form-message">{message}</p>}

    <div className="search-row">
      <div className="search-box"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isReception ? "Buscar por nome, telefone ou e-mail" : "Buscar por nome, CPF ou telefone"}/></div>
      <span className="form-message">{visible.length} paciente{visible.length === 1 ? "" : "s"}</span>
    </div>

    <div className={`card patient-table${isReception ? " patient-table--reception" : ""}`}>
      <div className="table-head">{isReception
        ? <><span>Paciente</span><span>Contato</span><span>Status</span><span/></>
        : <><span>Paciente</span><span>Contato</span><span>Fototipo</span><span>Status</span><span/></>}</div>
      {visible.map((patient) => <div className="table-row" key={patient.id}>
        {isReception
          ? <div className="table-patient patient-static">
              <i style={{ background: patient.tone }}>{patient.initials}</i>
              <b>{patient.full_name}{patient.preferred_name && <small>Prefere: {patient.preferred_name}</small>}</b>
            </div>
          : <button className="table-patient" type="button" onClick={() => { setPatient(patient); go("record"); }}>
              <i style={{ background: patient.tone }}>{patient.initials}</i>
              <b>{patient.full_name}<small>{patient.detail}</small></b>
            </button>}
        {isReception
          ? <span className="patient-contact"><span>{patient.phone || "Sem telefone"}</span><span>{patient.email || "Sem e-mail"}</span></span>
          : <span>{patient.phone || patient.email || "Sem contato"}</span>}
        {!isReception && <span>{patient.fototipo || "—"}</span>}
        <span><em className="status-pill">Ativo</em></span>
        <div className="patient-table-actions">
          <button className="icon-button" type="button" aria-label={`Editar cadastro de ${patient.full_name}`} title="Editar paciente" onClick={() => editPatient(patient)}><MoreHorizontal size={17}/></button>
          <button className="icon-button patient-delete-icon" type="button" aria-label={`${isReception ? "Arquivar" : "Excluir"} ${patient.full_name}`} title={isReception ? "Arquivar paciente" : "Excluir paciente"} onClick={() => { setDeleteTarget(patient); setDeleteMessage(""); }}><Trash2 size={16}/></button>
        </div>
      </div>)}
      {!visible.length && <div className="empty-dashboard"><p className="eyebrow">BASE VAZIA</p><h2>Nenhum paciente encontrado.</h2><p>Cadastre a primeira pessoa ou altere a busca.</p></div>}
    </div>

    {open && <div className="modal-backdrop">
      <form className="modal-card" onSubmit={savePatient}>
        <button type="button" className="modal-close" aria-label="Fechar cadastro" onClick={() => setOpen(false)}><X size={17}/></button>
        <p className="eyebrow">{editing ? "EDITAR CADASTRO" : "NOVO CADASTRO"}</p>
        <h2>{editing ? "Atualizar paciente" : "Adicionar paciente"}</h2>
        <div className="form-grid">
          <label>Nome completo<input required maxLength={160} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })}/></label>
          <label>Nome preferido<input maxLength={120} value={form.preferred_name} onChange={(event) => setForm({ ...form, preferred_name: event.target.value })}/></label>
          {!isReception && <>
            <label>Data de nascimento<input type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })}/></label>
            <label>CPF (últimos 4 dígitos)<input inputMode="numeric" maxLength={4} value={form.cpf_last4} onChange={(event) => setForm({ ...form, cpf_last4: event.target.value.replace(/\D/g, "") })}/></label>
          </>}
          <label>Telefone<input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label>
          <label>E-mail<input type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label>
          {!isReception && <>
            <label>Fototipo<input maxLength={80} value={form.fototipo} onChange={(event) => setForm({ ...form, fototipo: event.target.value })}/></label>
            <label>Alergias<input maxLength={1000} value={form.allergies} onChange={(event) => setForm({ ...form, allergies: event.target.value })}/></label>
            <label className="wide">Medicações em uso<textarea maxLength={2000} value={form.current_medications} onChange={(event) => setForm({ ...form, current_medications: event.target.value })}/></label>
          </>}
        </div>
        {message && <p role="alert" className="form-message">{message}</p>}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="primary" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar paciente"}</button>
        </div>
      </form>
    </div>}

    {deleteTarget && <div className="modal-backdrop patient-delete-backdrop">
      <section className="modal-card patient-delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="patient-delete-title" aria-describedby="patient-delete-description">
        <button type="button" className="modal-close" aria-label="Cancelar exclusão" onClick={() => setDeleteTarget(null)} disabled={deleting}><X size={17}/></button>
        <p className="eyebrow">{isReception ? "CONFIRMAR ARQUIVAMENTO" : "CONFIRMAR EXCLUSÃO"}</p>
        <h2 id="patient-delete-title">{isReception ? "Arquivar" : "Excluir"} {deleteTarget.full_name}?</h2>
        <p id="patient-delete-description">{isTestMode
          ? "O cadastro será removido desta sessão de teste. Nenhum dado será enviado ao Supabase."
          : isReception
            ? "O paciente sairá da lista ativa. O prontuário e o histórico clínico serão preservados."
            : "O paciente sairá da lista ativa. O prontuário, as consultas e os arquivos vinculados serão preservados."}</p>
        {deleteMessage && <p role="alert" className="form-message">{deleteMessage}</p>}
        <div className="patient-delete-actions">
          <button type="button" className="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</button>
          <button type="button" className="primary patient-delete-confirm-button" onClick={() => void removePatient()} disabled={deleting}>{deleting ? "Arquivando..." : isReception ? "Confirmar arquivamento" : "Confirmar exclusão"}</button>
        </div>
      </section>
    </div>}
  </>;
}
