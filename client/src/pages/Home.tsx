import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowLeft, CalendarDays, Camera, Check, ChevronDown, ClipboardList, CreditCard, FileImage, FileText, FolderOpen, KeyRound, LayoutDashboard, Lock, LogIn, Mail, Menu, MessageCircle, MoreHorizontal, Pill, Plus, Search, Settings, ShieldCheck, Sparkles, Stethoscope, UserRound, UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Patients } from "@/components/Patients";
import { emptyPatient, patientView, type Patient } from "@/lib/patients";
import { canAccessView, isAppRole, type AppRole } from "@/lib/access";

type View = "dashboard" | "patients" | "record" | "photos" | "lesions" | "prescription" | "exams" | "agenda" | "messages" | "finance";
const nav = [
  ["dashboard", "Visão geral", LayoutDashboard], ["patients", "Pacientes", Users], ["agenda", "Agenda", CalendarDays], ["record", "Prontuário", ClipboardList], ["photos", "Fotos clínicas", Camera], ["lesions", "Mapa de lesões", Activity], ["prescription", "Prescrições", Pill], ["exams", "Exames e anexos", FileImage],
] as const;
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const brandLogo = `${import.meta.env.BASE_URL}mariana-gil-logo.webp`;

function Top({ title, onMenu }: { title: string; onMenu: () => void }) { return <header className="topbar"><button className="mobile-menu" onClick={onMenu}><Menu size={20}/></button><div className="breadcrumb"><span>DermOS</span><i>/</i><b>{title}</b></div><div className="top-actions"><button><Search size={17}/></button><span className="mini-avatar">MG</span></div></header>; }
function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) { return <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button className="text-action">{action} <span>→</span></button>}</div>; }

export default function Home() {
  const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
  const validViews: View[] = ["dashboard", "patients", "record", "photos", "lesions", "prescription", "exams", "agenda", "messages", "finance"];
  const [view, setView] = useState<View>(requestedView && validViews.includes(requestedView) ? requestedView : "dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [patient, setPatient] = useState<Patient>(emptyPatient);
  const [testPatients, setTestPatients] = useState<Patient[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [patientCountRefresh, setPatientCountRefresh] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<AppRole | "test" | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    let requestNumber = 0;

    const syncSession = async (session: any) => {
      const request = ++requestNumber;
      const localTest = sessionStorage.getItem("dermos_test_mode") === "1";
      if (localTest) {
        setSessionActive(true);
        setSessionEmail("modo-teste");
        setSessionRole("test");
        setAccessMessage("");
        return;
      }
      if (!session) {
        setSessionActive(false);
        setSessionEmail(null);
        setSessionRole(null);
        return;
      }

      setSessionActive(false);
      setSessionEmail(null);
      setSessionRole(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("role,active")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!mounted || request !== requestNumber) return;

      if (sessionStorage.getItem("dermos_test_mode") === "1") {
        setSessionActive(true);
        setSessionEmail("modo-teste");
        setSessionRole("test");
        setAccessMessage("");
        return;
      }

      if (error || !data?.active || !isAppRole(data.role)) {
        setAccessMessage(error
          ? "Não foi possível validar as permissões da conta. Tente novamente."
          : "Esta conta ainda não recebeu um perfil ativo no DermOS. Solicite a liberação à responsável.");
        setSessionActive(false);
        setSessionEmail(null);
        setSessionRole(null);
        window.setTimeout(() => { void supabase.auth.signOut(); }, 0);
        return;
      }

      setSessionEmail(session.user.email ?? null);
      setSessionRole(data.role);
      setSessionActive(true);
      setAccessMessage("");
    };

    void supabase.auth.getSession().then(({ data }) => { void syncSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        window.setTimeout(() => { void syncSession(session); }, 0);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionActive) {
      setPatientCount(0);
      return;
    }
    if (sessionRole === "test") {
      setPatientCount(testPatients.length);
      return;
    }
    let current = true;
    const query = sessionRole === "reception"
      ? supabase.from("patient_directory").select("id", { count: "exact", head: true }).eq("active", true)
      : supabase.from("patients").select("id", { count: "exact", head: true }).eq("active", true);
    void query.then(({ count, error }) => {
      if (current && !error) setPatientCount(count ?? 0);
    });
    return () => { current = false; };
  }, [sessionActive, sessionRole, testPatients.length, patientCountRefresh]);

  const go = (next: View) => {
    if (!canAccessView(sessionRole, next)) {
      setView("dashboard");
      return;
    }
    setView(next);
    setSideOpen(false);
  };

  useEffect(() => {
    setPatient(emptyPatient);
    setView("dashboard");
    if (sessionRole !== "test") setTestPatients([]);
  }, [sessionEmail, sessionRole]);

  const enterTestMode = async () => {
    sessionStorage.setItem("dermos_test_mode", "1");
    setPatient(emptyPatient);
    setView("dashboard");
    setSessionEmail("modo-teste");
    setSessionRole("test");
    setSessionActive(true);
    return null;
  };

  if (!sessionActive) {
    return <main className="dermos-pro access-page"><AccessScreen onOpen={() => setAuthOpen(true)} onTest={enterTestMode} accessMessage={accessMessage}/>{authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}</main>;
  }

  const roleForAccess = sessionRole === "test" ? "test" : sessionRole;
  const activeView = canAccessView(roleForAccess, view) ? view : "dashboard";
  const titles: Record<View, string> = { dashboard: "Visão geral", patients: "Pacientes", record: "Prontuário", photos: "Fotos clínicas", lesions: "Mapa de lesões", prescription: "Prescrições", exams: "Exames e anexos", agenda: "Agenda", messages: "Mensagens", finance: "Financeiro" };
  const visibleNav = nav.filter(([id]) => canAccessView(roleForAccess, id as View));
  const isTestMode = sessionRole === "test";
  const isReception = sessionRole === "reception";

  return <main className="dermos-pro">
    <div className="product-bar"><span><span className="product-dot"/> DERMOS <i>prontuário dermatológico</i></span><div className="demo-switch"><span>{sessionEmail}</span><span className="safe-chip"><ShieldCheck size={13}/> {isTestMode ? "Modo de teste" : "Ambiente protegido"}</span><button className="auth-link" onClick={() => { sessionStorage.removeItem("dermos_test_mode"); setTestPatients([]); setPatientCount(0); setAccessMessage(""); void supabase.auth.signOut(); }}>Sair</button></div></div>
    <div className="app-shell">
      <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
        <div className="brand"><img className="official-logo" src={brandLogo} alt="Mariana Gil"/><div><b>DermOS</b><small>gestão & prontuário</small></div><button className="close-menu" onClick={() => setSideOpen(false)}><X size={17}/></button></div>
        <div className="doctor-profile"><div className="doctor-avatar">{isReception ? "AD" : "MG"}</div><div><b>{isReception ? "Equipe administrativa" : "Mariana Gil"}</b><small>{isReception ? "Secretaria · acesso administrativo" : "Dermatologista · ambiente clínico"}</small></div><ChevronDown size={15}/></div>
        <nav>{visibleNav.map(([id, label, Icon]) => <button key={id} className={activeView === id || (id === "record" && ["photos", "lesions", "prescription", "exams"].includes(activeView)) ? "active" : ""} onClick={() => go(id as View)}><Icon size={17}/>{label}{id === "patients" && <span>{patientCount}</span>}</button>)}</nav>
        <div className="side-footer">
          {canAccessView(roleForAccess, "messages") && <button className={activeView === "messages" ? "active" : ""} onClick={() => go("messages")}><MessageCircle size={17}/>Mensagens <i/></button>}
          {canAccessView(roleForAccess, "finance") && <button className={activeView === "finance" ? "active" : ""} onClick={() => go("finance")}><CreditCard size={17}/>Financeiro</button>}
          <button><Settings size={17}/>Configurações</button>
          <div className="security-note"><ShieldCheck size={17}/><span><b>{isReception ? "Prontuário bloqueado" : "Área clínica"}</b><small>{isReception ? "Acesso administrativo sem dados clínicos" : "Dados conforme seu perfil ativo"}</small></span></div>
        </div>
      </aside>
      <section className="workspace">
        <Top title={titles[activeView]} onMenu={() => setSideOpen(true)}/>
        <div className="main-content">
          {activeView === "dashboard" && <Dashboard go={go} sessionEmail={sessionEmail} sessionRole={sessionRole} testPatients={testPatients}/>}
          {activeView === "patients" && <Patients go={go} setPatient={setPatient} sessionEmail={sessionEmail} sessionRole={sessionRole} testPatients={testPatients} setTestPatients={setTestPatients} selectedPatientId={patient.id} onCountChange={() => setPatientCountRefresh((version) => version + 1)}/>}
          {activeView === "record" && <Record patient={patient} go={go} isTestMode={isTestMode}/>}
          {activeView === "photos" && <Photos patient={patient} go={go} isTestMode={isTestMode}/>}
          {activeView === "lesions" && <Lesions patient={patient} go={go} isTestMode={isTestMode}/>}
          {activeView === "prescription" && <Prescription patient={patient} go={go} isTestMode={isTestMode}/>}
          {activeView === "exams" && <Exams patient={patient} go={go} isTestMode={isTestMode}/>}
          {activeView === "agenda" && <Agenda isTestMode={isTestMode} sessionRole={sessionRole}/>}
          {activeView === "messages" && <Messages/>}
          {activeView === "finance" && <Finance/>}
        </div>
      </section>
    </div>
    {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
  </main>;
}

function AccessScreen({ onOpen, onTest, accessMessage }: { onOpen:()=>void; onTest:()=>Promise<string|null>; accessMessage:string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function test() {
    setBusy(true);
    const message = await onTest();
    if (message) setError(message);
    setBusy(false);
  }
  return <section className="access-shell">
    <div className="access-brand"><img className="official-logo access-logo" src={brandLogo} alt="Mariana Gil"/><span>DermOS <small>prontuário dermatológico</small></span></div>
    <div className="access-copy"><p className="eyebrow">CIÊNCIA · ESCUTA · CUIDADO INDIVIDUALIZADO</p><h1>Um lugar seguro para cuidar de cada história.</h1><p>O DermOS organiza prontuários, imagens, prescrições e rotinas do consultório em uma experiência clínica clara, reservada e feita para dermatologia.</p><button className="primary" onClick={onOpen}><LogIn size={16}/> Entrar no ambiente clínico</button><button className="test-access" onClick={test} disabled={busy}>{busy ? "Abrindo modo de teste..." : "Entrar sem senha · modo de teste"}</button>{(accessMessage || error) && <small role="alert" className="form-message">{accessMessage || error}</small>}<small><ShieldCheck size={14}/> O modo de teste é temporário e deve ser removido antes do uso clínico.</small></div>
    <div className="access-note"><span>01</span><b>Privacidade desde o primeiro acesso</b><p>O ambiente clínico começa vazio. O acesso sem senha é apenas para testes e não deve ser usado com dados reais.</p></div>
  </section>;
}

function Dashboard({ go, sessionEmail, sessionRole, testPatients }: { go: (v: View) => void; sessionEmail: string | null; sessionRole: AppRole | "test" | null; testPatients: Patient[] }) {
  const [stats, setStats] = useState({ patients: 0, today: 0, next: "—" });

  useEffect(() => {
    if (sessionRole === "test") {
      setStats({ patients: testPatients.length, today: 0, next: "—" });
      return;
    }
    let current = true;
    void (async () => {
      const reception = sessionRole === "reception";
      const patientQuery = reception
        ? supabase.from("patient_directory").select("id", { count: "exact", head: true }).eq("active", true)
        : supabase.from("patients").select("id", { count: "exact", head: true }).eq("active", true);
      const appointmentsTable = reception ? "appointment_schedule" : "appointments";
      const [patientsResult, todayResult, nextResult] = await Promise.all([
        patientQuery,
        supabase.from(appointmentsTable).select("id", { count: "exact", head: true })
          .gte("starts_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .lt("starts_at", new Date(Date.now() + 86400000).toISOString()),
        supabase.from(appointmentsTable).select("starts_at").in("status", ["scheduled", "confirmed", "waiting"])
          .gte("starts_at", new Date().toISOString()).order("starts_at").limit(1),
      ]);
      if (current) {
        setStats({
          patients: patientsResult.count ?? 0,
          today: todayResult.count ?? 0,
          next: nextResult.data?.[0]?.starts_at ? formatDate(nextResult.data[0].starts_at) : "—",
        });
      }
    })();
    return () => { current = false; };
  }, [sessionRole, sessionEmail, testPatients.length]);

  const reception = sessionRole === "reception";
  return <>
    <div className="welcome"><div><p className="eyebrow">{reception ? "ÁREA ADMINISTRATIVA · DERMOS" : "AMBIENTE CLÍNICO · DERMOS"}</p><h1>{reception ? "Rotina do consultório, em um só lugar." : "Seu consultório, com tempo para ouvir."}</h1><p>Dados atualizados conforme seu perfil e permissões.</p></div><button className="primary" onClick={() => go("patients")}><Plus size={16}/> Cadastrar paciente</button></div>
    <div className="stats"><div><span>Consultas hoje</span><b>{stats.today}</b><small>Agendamentos para hoje</small></div><div><span>Pacientes ativos</span><b>{stats.patients}</b><small>{sessionRole === "test" ? "Somente nesta sessão de teste" : "Cadastros ativos"}</small></div><div><span>Próximo horário</span><b>{stats.next}</b><small>Agenda do consultório</small></div><div><span>{reception ? "Prontuário" : "Área clínica"}</span><b>{reception ? "Restrito" : "Ativa"}</b><small>{reception ? "Sem acesso a dados clínicos" : "Acesso conforme seu papel"}</small></div></div>
    <div className="empty-dashboard card"><div className="empty-mark"><Stethoscope size={25}/></div><p className="eyebrow">{reception ? "GESTÃO ADMINISTRATIVA" : "NÚCLEO CLÍNICO"}</p><h2>{reception ? "Agenda e contatos sem abrir prontuários." : "O DermOS começa pelos dados do consultório."}</h2><p>{reception ? "Consulte contatos e organize os horários. Evoluções, informações médicas e arquivos clínicos permanecem bloqueados neste perfil." : "Cadastre uma pessoa para abrir sua ficha, registrar evoluções em ordem cronológica e vincular retornos à agenda."}</p><button className="outline" onClick={() => go(reception ? "agenda" : "patients")}>{reception ? "Abrir agenda" : "Abrir pacientes"} <span>→</span></button></div>
  </>;
}

function Messages() { const [recipient,setRecipient]=useState(""); const [body,setBody]=useState(""); const [sent,setSent]=useState<string[]>([]); function submit(e:FormEvent){e.preventDefault();if(!recipient.trim()||!body.trim())return;setSent([`Mensagem preparada para ${recipient.trim()}`,...sent]);setRecipient("");setBody("");} return <><div className="page-heading"><div><p className="eyebrow">COMUNICAÇÃO · CONSULTÓRIO</p><h1>Mensagens</h1><p>Organize os próximos contatos com pacientes e equipe sem misturar conversas pessoais.</p></div><button className="primary" onClick={()=>document.getElementById("message-recipient")?.focus()}><Plus size={16}/> Nova mensagem</button></div><div className="module-grid"><section className="card module-empty"><div className="empty-mark"><MessageCircle size={24}/></div><p className="eyebrow">CAIXA DE ENTRADA</p><h2>Nenhuma conversa registrada.</h2><p>Quando a comunicação for integrada, as conversas autorizadas aparecerão aqui. Por enquanto, você pode preparar uma mensagem para testar o fluxo.</p></section><form className="card clinical-form" onSubmit={submit}><p className="eyebrow">NOVA MENSAGEM</p><h2>Preparar contato</h2><label>Paciente ou equipe<input id="message-recipient" required value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Digite um nome ou telefone"/></label><label>Mensagem<textarea required value={body} onChange={e=>setBody(e.target.value)} placeholder="Escreva o conteúdo da mensagem"/></label><div className="modal-actions"><button className="primary"><MessageCircle size={15}/> Preparar mensagem</button></div>{sent.map((item,i)=><p className="form-message" key={`${item}-${i}`}>{item}. A integração de envio ainda precisa ser conectada.</p>)}</form></div></> }

function Finance() { const [description,setDescription]=useState(""); const [amount,setAmount]=useState(""); const [records,setRecords]=useState<{description:string;amount:string}[]>([]); function submit(e:FormEvent){e.preventDefault();if(!description.trim()||!amount.trim())return;setRecords([{description:description.trim(),amount},...records]);setDescription("");setAmount("");} const total=records.reduce((sum,item)=>sum+Number(item.amount.replace(",",".")),0); return <><div className="page-heading"><div><p className="eyebrow">GESTÃO · CONSULTÓRIO</p><h1>Financeiro</h1><p>Registre procedimentos, pacotes e recebimentos em uma área separada do prontuário clínico.</p></div><button className="primary" onClick={()=>document.getElementById("finance-description")?.focus()}><Plus size={16}/> Novo lançamento</button></div><div className="stats"><div><span>Receita registrada</span><b>R$ {total.toFixed(2).replace(".",",")}</b><small>Somente nesta sessão de teste</small></div><div><span>Lançamentos</span><b>{records.length}</b><small>Sem dados demonstrativos</small></div><div><span>Pacotes ativos</span><b>0</b><small>Cadastre depois</small></div><div><span>Conciliação</span><b>—</b><small>Integração não configurada</small></div></div><div className="module-grid"><form className="card clinical-form" onSubmit={submit}><p className="eyebrow">NOVO LANÇAMENTO</p><h2>Adicionar movimentação</h2><label>Descrição<input id="finance-description" required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: Consulta dermatológica"/></label><label>Valor<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></label><div className="modal-actions"><button className="primary"><CreditCard size={15}/> Registrar</button></div></form><section className="card module-empty"><div className="empty-mark"><CreditCard size={24}/></div><p className="eyebrow">MOVIMENTAÇÕES</p><h2>{records.length ? "Lançamentos desta sessão" : "Nenhum lançamento registrado."}</h2>{records.length ? records.map((item,i)=><div className="finance-row" key={`${item.description}-${i}`}><span>{item.description}</span><b>R$ {item.amount}</b></div>) : <p>Use o formulário para testar a área. Antes do uso real, conectaremos as movimentações ao paciente, à agenda e ao meio de pagamento.</p>}</section></div></> }

function AuthDialog({ onClose }: { onClose:()=>void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    sessionStorage.removeItem("dermos_test_mode");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    onClose();
  }

  return <div className="modal-backdrop"><form className="modal-card auth-card" onSubmit={submit}>
    <button type="button" className="modal-close" onClick={onClose}><X size={17}/></button>
    <div className="auth-mark"><KeyRound size={20}/></div>
    <p className="eyebrow">DERMOS · ACESSO PRIVADO</p>
    <h2>Entrar no DermOS</h2>
    <p className="modal-sub">O acesso é liberado pela responsável da clínica. Não crie uma conta sem convite.</p>
    <label><Mail size={14}/> E-mail<input type="email" required value={email} onChange={event => setEmail(event.target.value)}/></label>
    <label><Lock size={14}/> Senha<input type="password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)}/></label>
    {message && <p role="alert" className="form-message">{message}</p>}
    <button className="primary auth-submit" disabled={loading}><LogIn size={15}/> {loading ? "Validando..." : "Entrar"}</button>
    <p className="form-message">O cadastro público está desativado. Contas sem perfil ativo não recebem acesso aos dados do sistema.</p>
  </form></div>;
}
function ModuleShell({ patient, go, eyebrow, title, description, children, isTestMode = false }: { patient:Patient; go:(v:View)=>void; eyebrow:string; title:string; description:string; children:React.ReactNode; isTestMode?:boolean }) { return <><button className="back" onClick={()=>go("patients")}><ArrowLeft size={15}/> Voltar para pacientes</button><div className="page-heading"><div><p className="eyebrow">{eyebrow}{patient.id?` · ${patient.full_name.toUpperCase()}`:""}</p><h1>{title}</h1><p>{description}</p></div></div>{isTestMode?<div className="card empty-dashboard"><p className="eyebrow">MODO DE TESTE · SEM DADOS CLÍNICOS</p><h2>Prontuários e arquivos não são acessados nesta sessão.</h2><p>O modo de teste permite experimentar o cadastro e a exclusão de pacientes. Para abrir módulos clínicos, entre com uma conta autorizada.</p><button className="outline" onClick={()=>go("patients")}>Voltar para pacientes</button></div>:patient.id?children:<div className="card empty-dashboard"><p className="eyebrow">PACIENTE NECESSÁRIO</p><h2>Selecione um paciente para continuar.</h2><button className="outline" onClick={()=>go("patients")}>Abrir pacientes</button></div>}</> }
function Record({ patient, go, isTestMode }: { patient:Patient; go:(v:View)=>void; isTestMode:boolean }) { const [form,setForm]=useState({chief_complaint:"",history:"",physical_exam:"",assessment:"",plan:"",fototipo:patient.fototipo||"",topography:"",lesion_description:""}); const [items,setItems]=useState<any[]>([]); const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false); const load=async()=>{if(isTestMode||!patient.id||patient.id.startsWith("test-"))return;const {data,error}=await supabase.from("encounters").select("*").eq("patient_id",patient.id).order("created_at",{ascending:false}).limit(100);if(error)setMessage(error.message);else setItems(data||[])};useEffect(()=>{load();setForm(f=>({...f,fototipo:patient.fototipo||""}))},[patient.id,isTestMode]);async function save(e:FormEvent){e.preventDefault();setSaving(true);if(isTestMode||patient.id.startsWith("test-")){setMessage("Evolução criada apenas na sessão de teste.");setSaving(false);return}const {data:u}=await supabase.auth.getUser();const {error}=await supabase.from("encounters").insert({patient_id:patient.id,professional_id:u.user?.id,...form,status:"signed",signed_at:new Date().toISOString()});setMessage(error?.message||"Evolução salva com segurança no prontuário.");if(!error){setForm({...form,chief_complaint:"",history:"",physical_exam:"",assessment:"",plan:"",topography:"",lesion_description:""});load()}setSaving(false)}return <ModuleShell patient={patient} go={go} isTestMode={isTestMode} eyebrow="PRONTUÁRIO · NOVA EVOLUÇÃO" title="Anamnese e evolução clínica" description="Cada salvamento cria uma consulta nova; o histórico anterior nunca é sobrescrito."><div className="card patient-summary"><b>{patient.full_name}</b><span>{patient.phone||"Sem telefone"} · {patient.email||"Sem e-mail"}</span><small>Alergias: {patient.allergies||"não informadas"} · Medicações: {patient.current_medications||"não informadas"}</small></div><form className="card clinical-form" onSubmit={save}><div className="record-tabs"><button type="button" className="selected">Nova evolução</button><button type="button" onClick={()=>go("photos")}>Fotos e evolução</button><button type="button" onClick={()=>go("lesions")}>Mapa de lesões</button><button type="button" onClick={()=>go("prescription")}>Prescrição</button><button type="button" onClick={()=>go("exams")}>Exames</button></div><div className="form-grid"><label>Queixa principal<textarea required value={form.chief_complaint} onChange={e=>setForm({...form,chief_complaint:e.target.value})}/></label><label>História da doença<textarea value={form.history} onChange={e=>setForm({...form,history:e.target.value})}/></label><label>Exame físico<textarea value={form.physical_exam} onChange={e=>setForm({...form,physical_exam:e.target.value})}/></label><label>Impressão diagnóstica<textarea value={form.assessment} onChange={e=>setForm({...form,assessment:e.target.value})}/></label><label>Fototipo e topografia<input value={form.fototipo} onChange={e=>setForm({...form,fototipo:e.target.value})}/></label><label>Descrição de lesões<input value={form.lesion_description} onChange={e=>setForm({...form,lesion_description:e.target.value})}/></label><label className="wide">Plano e orientações<textarea required value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}/></label></div>{message&&<p className="form-message">{message}</p>}<button className="primary" disabled={saving}>{saving?"Salvando...":"Salvar evolução"}</button></form><section className="card timeline"><SectionTitle eyebrow="HISTÓRICO PERSISTIDO" title={`${items.length} evolução${items.length===1?"":"ões"}`}/>{items.map(x=><article className="timeline-item" key={x.id}><time>{formatDate(x.created_at)}</time><div><b>{x.chief_complaint}</b><p>{x.assessment||"Sem impressão diagnóstica."}</p><small>Plano: {x.plan}</small></div><em>{x.status}</em></article>)}{!items.length&&<p className="empty-copy">Nenhuma evolução registrada para esta pessoa.</p>}</section></ModuleShell>; }
const MAX_CLINICAL_FILE_BYTES = 20 * 1024 * 1024;
const clinicalMimeByExtension: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf",
};

function validateClinicalFile(file: File, kind: "clinical_photo" | "exam"): string | null {
  if (file.size > MAX_CLINICAL_FILE_BYTES) return "O arquivo excede o limite de 20 MiB.";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const inferredMime = clinicalMimeByExtension[extension];
  const allowed = kind === "exam"
    ? ["image/jpeg", "image/png", "application/pdf"]
    : ["image/jpeg", "image/png"];
  if (!inferredMime || !allowed.includes(inferredMime) || (file.type && file.type !== inferredMime)) {
    return kind === "exam"
      ? "Formato não permitido. Use PDF, JPG ou PNG."
      : "Formato não permitido. Use JPG ou PNG.";
  }
  return null;
}

function FileUpload({ patient, kind, label, onUploaded }: { patient:Patient; kind:"clinical_photo"|"exam"; label:string; onUploaded?:()=>void }) {
  const [message,setMessage]=useState("");
  const [uploading,setUploading]=useState(false);
  async function upload(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];
    if(!file||!patient.id)return;
    if(patient.id.startsWith("test-")) { setMessage(`${file.name} não foi enviado: arquivos clínicos exigem uma sessão autorizada.`); e.target.value=""; return; }
    const validation=validateClinicalFile(file,kind);
    if(validation) { setMessage(validation); e.target.value=""; return; }
    setUploading(true);
    try {
      const {data:u,error:userError}=await supabase.auth.getUser();
      if(userError||!u.user) { setMessage("Sua sessão expirou. Entre novamente para enviar o arquivo."); return; }
      const extension=file.name.split(".").pop()?.toLowerCase() ?? "";
      const path=`${u.user.id}/${patient.id}/${crypto.randomUUID()}.${extension}`;
      const mimeType=file.type||clinicalMimeByExtension[extension];
      const {error:uploadError}=await supabase.storage.from("clinical-files").upload(path,file,{contentType:mimeType,upsert:false});
      if(uploadError) { setMessage(uploadError.message); return; }
      const {error}=await supabase.from("attachments").insert({patient_id:patient.id,uploaded_by:u.user.id,kind,storage_path:path,display_name:`${label} — ${file.name}`,mime_type:mimeType,size_bytes:file.size});
      if(error) { setMessage(`O arquivo foi enviado ao armazenamento privado, mas o registro falhou: ${error.message}. Procure a responsável para conferir o arquivo.`); return; }
      setMessage(`${file.name} armazenado de forma privada.`);
      onUploaded?.();
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
      e.target.value="";
    }
  }
  const accept=kind==="exam"?".pdf,.jpg,.jpeg,.png":".jpg,.jpeg,.png";
  return <label className="upload-control"><input type="file" accept={accept} onChange={upload}/><FolderOpen size={22}/><b>{uploading?"Enviando...":label}</b><small>Arquivo privado no Supabase · até 20 MiB</small>{message&&<em>{message}</em>}</label>;
}
function Photos({ patient, go, isTestMode }: { patient:Patient; go:(v:View)=>void; isTestMode:boolean }) { const [items,setItems]=useState<any[]>([]); const [region,setRegion]=useState(""); const [group,setGroup]=useState("face"); const [label,setLabel]=useState<"before"|"after">("before"); const [message,setMessage]=useState(""); const [uploading,setUploading]=useState(false); async function load(){if(isTestMode||!patient.id||patient.id.startsWith("test-")){setItems([]);return}const {data}=await supabase.from("attachments").select("id,display_name,storage_path,captured_at,body_region,comparison_group").eq("patient_id",patient.id).eq("kind","clinical_photo").order("created_at",{ascending:false}).limit(100);if(!data)return;const withUrls=await Promise.all(data.map(async x=>{const {data:url}=await supabase.storage.from("clinical-files").createSignedUrl(x.storage_path,3600);return {...x,url:url?.signedUrl};}));setItems(withUrls);}useEffect(()=>{load()},[patient.id,isTestMode]);async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file||!patient.id)return;if(isTestMode||patient.id.startsWith("test-")){setMessage(`${file.name} não foi enviado: arquivos clínicos exigem uma sessão autorizada.`);e.target.value="";return}const validation=validateClinicalFile(file,"clinical_photo");if(validation){setMessage(validation);e.target.value="";return}setUploading(true);const {data:u}=await supabase.auth.getUser();const path=`${u.user?.id}/${patient.id}/${crypto.randomUUID()}-${file.name}`;const {error:up}=await supabase.storage.from("clinical-files").upload(path,file,{contentType:file.type,upsert:false});if(up){setMessage(up.message);setUploading(false);return}const {error}=await supabase.from("attachments").insert({patient_id:patient.id,uploaded_by:u.user?.id,kind:"clinical_photo",storage_path:path,display_name:`${label} — ${file.name}`,mime_type:file.type,size_bytes:file.size,body_region:region,comparison_group:group,captured_at:new Date().toISOString()});setMessage(error?.message||"Foto adicionada à galeria privada.");setUploading(false);if(!error)load();}
const groups=Array.from(new Set(items.map(x=>x.comparison_group||x.body_region||"sem grupo")));return <ModuleShell patient={patient} go={go} eyebrow="FOTOS CLÍNICAS" title="Evolução fotográfica" description="Faça upload de imagens privadas e compare automaticamente a evolução por região e consulta."><div className="card photo-upload-panel"><div className="form-grid"><label>Região corporal<input required placeholder="Ex.: face completa" value={region} onChange={e=>setRegion(e.target.value)}/></label><label>Grupo de comparação<input value={group} onChange={e=>setGroup(e.target.value)} placeholder="Ex.: face"/></label><label>Momento da imagem<select value={label} onChange={e=>setLabel(e.target.value as any)}><option value="before">Antes</option><option value="after">Atual</option></select></label><label className="upload-inline"><input type="file" accept=".jpg,.jpeg,.png" onChange={upload}/><Camera size={16}/> {uploading?"Enviando...":"Selecionar foto clínica"}</label></div>{message&&<p className="form-message">{message}</p>}<small>O momento selecionado é salvo junto à foto para formar a comparação. Grupo atual: <b>{group}</b> · {label==="before"?"antes":"atual"}</small></div>{groups.length?groups.map(g=>{const pair=items.filter(x=>(x.comparison_group||x.body_region||"sem grupo")===g);return <section className="card comparison" key={g}><div className="compare-header"><div><p className="eyebrow">COMPARAÇÃO AUTOMÁTICA</p><h2>{g}</h2></div><span>{pair.length} imagem{pair.length===1?"":"ns"}</span></div><div className="photo-pair auto-pair">{["before","after"].map(kind=>{const image=pair.find(x=>x.display_name.toLowerCase().includes(kind) || (kind==="before" && !pair.some(y=>y.display_name.toLowerCase().includes("before"))));return <div className="comparison-slot" key={kind}>{image?.url?<img src={image.url} alt={`${g} ${kind}`} />:<div className="comparison-empty"><Camera size={20}/><b>{kind==="before"?"Antes":"Atual"}</b><span>Adicione uma foto marcada como {kind==="before"?"antes":"atual"}.</span></div>}<small>{kind==="before"?"Antes":"Atual"}</small></div>})}</div></section>}) : <div className="card empty-dashboard"><p className="eyebrow">GALERIA VAZIA</p><h2>Adicione a primeira foto clínica.</h2><p>Use a região e o grupo para que o DermOS organize os pares automaticamente.</p></div>}</ModuleShell> }

function Lesions({ patient, go, isTestMode }: { patient:Patient; go:(v:View)=>void; isTestMode:boolean }) { const [form,setForm]=useState({code:"",body_region:"",topography:"",morphology:"",size_mm:"",notes:""});const [message,setMessage]=useState("");async function save(e:FormEvent){e.preventDefault();if(isTestMode||patient.id.startsWith("test-")){setMessage("O mapa de lesões não grava no Supabase no modo de teste.");return}const {data:u}=await supabase.auth.getUser();const {error}=await supabase.from("lesions").insert({patient_id:patient.id,created_by:u.user?.id,...form,size_mm:form.size_mm?Number(form.size_mm):null});setMessage(error?.message||"Lesão registrada no mapa corporal.");}return <ModuleShell patient={patient} go={go} isTestMode={isTestMode} eyebrow="MAPA CORPORAL" title="Lesões e acompanhamento" description="Cataloge topografia, morfologia e evolução para cada lesão."><form className="card clinical-form" onSubmit={save}><div className="form-grid"><label>Código<input required placeholder="L-001" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>Região corporal<input required placeholder="Face · malar direita" value={form.body_region} onChange={e=>setForm({...form,body_region:e.target.value})}/></label><label>Topografia<input value={form.topography} onChange={e=>setForm({...form,topography:e.target.value})}/></label><label>Morfologia<input value={form.morphology} onChange={e=>setForm({...form,morphology:e.target.value})}/></label><label>Tamanho em milímetros<input type="number" step="0.1" value={form.size_mm} onChange={e=>setForm({...form,size_mm:e.target.value})}/></label><label className="wide">Observações<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>{message&&<p className="form-message">{message}</p>}<button className="primary"><Plus size={15}/> Salvar lesão</button></form></ModuleShell> }

function Prescription({ patient, go, isTestMode }: { patient:Patient; go:(v:View)=>void; isTestMode:boolean }) { const [form,setForm]=useState({medication:"",concentration:"",pharmaceutical_form:"",dosage:"",duration:"",instructions:""});const [message,setMessage]=useState("");async function save(e:FormEvent){e.preventDefault();if(isTestMode||patient.id.startsWith("test-")){setMessage("A prescrição não foi enviada: este paciente está apenas no modo de teste.");return}const {data:u}=await supabase.auth.getUser();const {data:p,error}=await supabase.from("prescriptions").insert({patient_id:patient.id,professional_id:u.user?.id,status:"signed",prescription_type:"simple"}).select("id").single();if(error||!p){setMessage(error?.message||"Não foi possível salvar.");return}const {error:item}=await supabase.from("prescription_items").insert({prescription_id:p.id,...form});setMessage(item?.message||"Prescrição salva. Use Imprimir para gerar o PDF pelo navegador.");}return <ModuleShell patient={patient} go={go} isTestMode={isTestMode} eyebrow="PRESCRIÇÃO DIGITAL" title="Nova prescrição" description="Salve a prescrição no prontuário e gere o PDF para assinatura e entrega."><form className="card clinical-form print-area" onSubmit={save}><div className="form-grid"><label>Medicamento<input required value={form.medication} onChange={e=>setForm({...form,medication:e.target.value})}/></label><label>Concentração<input value={form.concentration} onChange={e=>setForm({...form,concentration:e.target.value})}/></label><label>Forma farmacêutica<input value={form.pharmaceutical_form} onChange={e=>setForm({...form,pharmaceutical_form:e.target.value})}/></label><label>Posologia<input required value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})}/></label><label>Duração<input value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></label><label className="wide">Instruções<textarea value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/></label></div>{message&&<p className="form-message">{message}</p>}<div className="modal-actions"><button className="outline" type="button" onClick={()=>window.print()}>Imprimir / gerar PDF</button><button className="primary">Salvar prescrição</button></div></form></ModuleShell> }

function Exams({ patient, go, isTestMode }: { patient:Patient; go:(v:View)=>void; isTestMode:boolean }) {
  const [items,setItems]=useState<any[]>([]);
  const [message,setMessage]=useState("");
  async function load() {
    if(isTestMode||!patient.id||patient.id.startsWith("test-")) { setItems([]); return; }
    const {data,error}=await supabase.from("attachments").select("id,display_name,storage_path,created_at,size_bytes,mime_type").eq("patient_id",patient.id).eq("kind","exam").order("created_at",{ascending:false}).limit(100);
    if(error) { setMessage(error.message); return; }
    const withUrls=await Promise.all((data??[]).map(async item=>{
      const {data:signed,error:signedError}=await supabase.storage.from("clinical-files").createSignedUrl(item.storage_path,3600);
      return {...item,signedUrl:signed?.signedUrl,linkError:signedError?.message};
    }));
    setItems(withUrls);
  }
  useEffect(()=>{void load();},[patient.id,isTestMode]);
  return <ModuleShell patient={patient} go={go} isTestMode={isTestMode} eyebrow="EXAMES E DOCUMENTOS" title="Exames e laudos" description="Armazene documentos e imagens de exames em um bucket privado do Supabase.">
    <div className="card upload-grid"><FileUpload patient={patient} kind="exam" label="Anexar laudo ou exame" onUploaded={()=>void load()}/><div className="comparison-empty"><FileText size={24}/><b>Documentos clínicos privados</b><span>PDF, JPG e PNG; limite de 20 MiB por arquivo.</span></div></div>
    {message&&<p role="alert" className="form-message">{message}</p>}
    <section className="card appointment-list"><SectionTitle eyebrow="ARQUIVOS DO PACIENTE" title={`${items.length} arquivo${items.length===1?"":"s"}`}/>{items.map(item=><div className="day-row" key={item.id}><time>{formatDate(item.created_at)}</time><div><b>{item.display_name}</b><small>{item.mime_type} · {item.size_bytes?`${(item.size_bytes/1024/1024).toFixed(1)} MiB`:"tamanho não informado"}</small></div>{item.signedUrl?<a className="outline" href={item.signedUrl} target="_blank" rel="noreferrer">Abrir arquivo</a>:<span className="form-message">{item.linkError||"Link temporário indisponível"}</span>}</div>)}{!items.length&&<div className="empty-agenda"><FileText size={24}/><b>Nenhum exame anexado.</b><span>Os arquivos enviados aparecerão aqui para perfis clínicos autorizados.</span></div>}</section>
  </ModuleShell>;
}
function Agenda({ isTestMode, sessionRole }: { isTestMode: boolean; sessionRole: AppRole | "test" | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ patient_id: "", starts_at: "", appointment_type: "Consulta", status: "scheduled", notes: "" });
  const [message, setMessage] = useState("");
  const reception = sessionRole === "reception";

  const load = async () => {
    const appointmentQuery = reception
      ? supabase.from("appointment_schedule").select("id,patient_id,patient_name,starts_at,appointment_type,status").order("starts_at", { ascending: true }).limit(200)
      : supabase.from("appointments").select("id,patient_id,starts_at,appointment_type,status,notes,patients(full_name)").order("starts_at", { ascending: true }).limit(200);
    const patientQuery = reception
      ? supabase.from("patient_directory").select("id,full_name,preferred_name,phone,email,active,created_at").eq("active", true).order("full_name").limit(500)
      : supabase.from("patients").select("*").eq("active", true).order("full_name").limit(500);
    const [appointmentsResult, patientsResult] = await Promise.all([appointmentQuery, patientQuery]);
    if (appointmentsResult.error) setMessage(appointmentsResult.error.message);
    else setItems(appointmentsResult.data ?? []);
    if (patientsResult.error) setMessage(patientsResult.error.message);
    else setPatients((patientsResult.data ?? []).map(patientView));
  };

  useEffect(() => {
    if (!isTestMode && sessionRole && sessionRole !== "test") void load();
    else { setItems([]); setPatients([]); }
  }, [isTestMode, sessionRole]);

  if (isTestMode) return <div className="card empty-dashboard"><p className="eyebrow">MODO DE TESTE</p><h2>Agenda clínica indisponível nesta sessão.</h2><p>Nenhum agendamento será lido ou gravado no Supabase enquanto você estiver no modo de teste.</p></div>;

  function reset() {
    setEditing(null);
    setForm({ patient_id: patients[0]?.id || "", starts_at: "", appointment_type: "Consulta", status: "scheduled", notes: "" });
  }

  function edit(item: any) {
    setEditing(item);
    setForm({
      patient_id: item.patient_id,
      starts_at: item.starts_at.slice(0, 16),
      appointment_type: item.appointment_type,
      status: item.status,
      notes: reception ? "" : item.notes || "",
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.patient_id) {
      setMessage("Selecione um paciente para vincular o agendamento.");
      return;
    }
    const startsAt = new Date(form.starts_at).toISOString();
    let error: { message: string } | null = null;
    if (reception) {
      const result = editing
        ? await supabase.rpc("update_reception_appointment", {
          p_appointment_id: editing.id,
          p_patient_id: form.patient_id,
          p_starts_at: startsAt,
          p_appointment_type: form.appointment_type,
          p_status: form.status,
        })
        : await supabase.rpc("create_reception_appointment", {
          p_patient_id: form.patient_id,
          p_starts_at: startsAt,
          p_appointment_type: form.appointment_type,
          p_status: form.status,
        });
      error = result.error;
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const payload = { ...form, starts_at: startsAt, created_by: userData.user?.id };
      const result = editing
        ? await supabase.from("appointments").update(payload).eq("id", editing.id)
        : await supabase.from("appointments").insert(payload);
      error = result.error;
    }
    setMessage(error?.message || (editing ? "Agendamento atualizado." : "Agendamento salvo."));
    if (!error) {
      reset();
      await load();
    }
  }

  async function cancel(item: any) {
    if (reception) {
      const { error } = await supabase.rpc("update_reception_appointment", {
        p_appointment_id: item.id,
        p_patient_id: item.patient_id,
        p_starts_at: item.starts_at,
        p_appointment_type: item.appointment_type,
        p_status: "cancelled",
      });
      setMessage(error?.message || "Agendamento cancelado.");
      if (!error) await load();
      return;
    }
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", item.id);
    setMessage(error?.message || "Agendamento cancelado.");
    if (!error) await load();
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">AGENDA · DERMOS</p><h1>{reception ? "Agenda administrativa" : "Agenda do consultório"}</h1><p>{reception ? "Organize horários e contatos; observações clínicas não são exibidas neste perfil." : "Crie, edite, cancele e vincule consultas a pacientes."}</p></div><button className="outline" onClick={reset}><Plus size={15}/> Novo agendamento</button></div>
    <form className="card clinical-form" onSubmit={save}><div className="form-grid">
      <label>Paciente<select required value={form.patient_id} onChange={event => setForm({ ...form, patient_id: event.target.value })}><option value="">Selecione um paciente</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select></label>
      <label>Data e horário<input required type="datetime-local" value={form.starts_at} onChange={event => setForm({ ...form, starts_at: event.target.value })}/></label>
      <label>Tipo de atendimento{reception
        ? <select value={form.appointment_type} onChange={event => setForm({ ...form, appointment_type: event.target.value })}><option>Consulta</option><option>Retorno</option><option>Procedimento</option><option>Atendimento</option></select>
        : <input value={form.appointment_type} onChange={event => setForm({ ...form, appointment_type: event.target.value })}/>}</label>
      <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="waiting">Aguardando</option><option value="completed">Concluído</option><option value="no_show">Não compareceu</option><option value="cancelled">Cancelado</option></select></label>
      {!reception && <label className="wide">Observações clínicas<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></label>}
    </div>{message && <p className="form-message">{message}</p>}<div className="modal-actions"><button className="primary">{editing ? "Salvar alterações" : "Salvar agendamento"}</button>{editing && <button type="button" className="outline" onClick={reset}>Cancelar edição</button>}</div></form>
    <div className="card appointment-list"><SectionTitle eyebrow="REGISTROS SALVOS" title={`${items.length} agendamento${items.length === 1 ? "" : "s"}`}/>{items.map(item => <div className="day-row" key={item.id}><time>{formatDate(item.starts_at)}</time><div><b>{item.patient_name || item.patients?.full_name || "Paciente"}</b><small>{item.appointment_type}{reception ? "" : ` · ${item.notes || "Sem observações"}`}</small></div><em>{item.status}</em><button className="outline" onClick={() => edit(item)}>Editar</button>{item.status !== "cancelled" && <button className="text-action" onClick={() => void cancel(item)}>Cancelar</button>}</div>)}{!items.length && <div className="empty-agenda"><CalendarDays size={24}/><b>Sua agenda começa aqui.</b><span>Nenhum agendamento salvo.</span></div>}</div>
  </>;
}
