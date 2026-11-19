import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ClipboardList, FileText, FolderOpen, LayoutDashboard, Menu, MessageSquare, Search, Settings, ShieldCheck, Stethoscope, UserRound, Users, X } from "lucide-react";

type Theme = { id: string; name: string; accent: string; bg: string; panel: string; ink: string; muted: string; font: string };
const themes: Theme[] = [
  { id: "editorial", name: "Editorial", accent: "#ae604d", bg: "#f5f0e8", panel: "#fffaf2", ink: "#2d2925", muted: "#887d73", font: "serif" },
  { id: "botanica", name: "Botânica", accent: "#637962", bg: "#edf0e8", panel: "#f9fbf5", ink: "#263129", muted: "#788279", font: "sans" },
  { id: "melanina", name: "Melanina", accent: "#c68151", bg: "#f1e6dd", panel: "#fff7f0", ink: "#321f1d", muted: "#896d61", font: "serif" },
  { id: "mineral", name: "Mineral", accent: "#5b8b9b", bg: "#edf2f2", panel: "#fbfefe", ink: "#23343a", muted: "#74878d", font: "sans" },
  { id: "noite", name: "Noite", accent: "#c7a76c", bg: "#241b1a", panel: "#302423", ink: "#f5ede4", muted: "#b1a09a", font: "serif" },
];
const patients = [
  { initials: "AS", name: "Ana Souza", age: "29 anos", tag: "Retorno", color: "#bd8d79" },
  { initials: "MC", name: "Marina Costa", age: "42 anos", tag: "Primeira consulta", color: "#8b9f84" },
  { initials: "JP", name: "João Pereira", age: "36 anos", tag: "Acompanhamento", color: "#8c9fad" },
  { initials: "LR", name: "Luiza Ribeiro", age: "24 anos", tag: "Retorno", color: "#b58d98" },
];

export default function Home() {
  const initial = new URLSearchParams(window.location.search).get("theme");
  const [themeId, setThemeId] = useState(themes.some(t => t.id === initial) ? initial! : "editorial");
  const [selected, setSelected] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useMemo(() => themes.find(t => t.id === themeId)!, [themeId]);
  const patient = patients[selected];
  return <main className={`dermos theme-${theme.font}`} style={{ "--accent": theme.accent, "--bg": theme.bg, "--panel": theme.panel, "--ink": theme.ink, "--muted": theme.muted } as React.CSSProperties}>
    <div className="theme-bar"><span>DermOS · direções visuais do prontuário</span><div>{themes.map(t => <button className={t.id === themeId ? "active" : ""} onClick={() => setThemeId(t.id)} key={t.id}>{t.name}</button>)}</div></div>
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar open" : "sidebar"}><div className="brand"><span className="brand-mark">D</span><span><b>DermOS</b><small>gestão & prontuário</small></span><button onClick={() => setMobileOpen(false)} className="close-menu"><X size={17}/></button></div><div className="profile"><div className="avatar">MG</div><div><b>Mariana Gil</b><small>Dermatologista</small></div><ChevronDown size={15}/></div><nav><a className="nav-active"><LayoutDashboard size={17}/>Visão geral</a><a><Users size={17}/>Pacientes <span>248</span></a><a><CalendarDays size={17}/>Agenda</a><a><ClipboardList size={17}/>Protocolos</a><a><FileText size={17}/>Documentos</a></nav><div className="sidebar-bottom"><a><MessageSquare size={17}/>Mensagens <span className="dot"/></a><a><Settings size={17}/>Configurações</a><div className="privacy"><ShieldCheck size={17}/><span>Ambiente privado<br/><small>Último backup hoje, 03:00</small></span></div></div></aside>
      <section className="workspace"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21}/></button><div className="crumb"><span>Visão geral</span><i>/</i><b>Consultório</b></div><div className="top-actions"><button><Search size={17}/></button><button className="bell">●</button><div className="mini-avatar">MG</div></div></header>
        <div className="content"><div className="heading"><div><p className="eyebrow">QUARTA-FEIRA · 19 DE NOVEMBRO, 2026</p><h1>Bom dia, Mariana.</h1><p className="sub">Aqui está o resumo do seu consultório hoje.</p></div><button className="primary"><span>+</span> Novo atendimento</button></div>
        <div className="metrics"><div className="metric"><span>Consultas hoje</span><b>08</b><small className="up">↑ 12% <em>vs. semana passada</em></small></div><div className="metric"><span>Pacientes ativos</span><b>248</b><small>12 novos este mês</small></div><div className="metric"><span>Retornos pendentes</span><b>14</b><small className="attention">Requer atenção</small></div><div className="metric"><span>Próximo horário</span><b>14:30</b><small>Marina Costa · retorno</small></div></div>
        <div className="grid-main"><section className="card schedule"><div className="card-head"><div><p className="eyebrow">AGENDA DE HOJE</p><h2>Próximos atendimentos</h2></div><button className="small-link">Ver agenda <span>→</span></button></div>{[["09:00","Ana Souza","Retorno · melasma","AS"],["10:30","João Pereira","Primeira consulta","JP"],["14:30","Marina Costa","Retorno · queda de cabelo","MC"],["16:00","Luiza Ribeiro","Acompanhamento","LR"]].map((item, i) => <div className={`appointment ${i === 2 ? "current" : ""}`} key={item[0]}><time>{item[0]}</time><div className="line"/><div className="patient-avatar" style={{background: patients[i].color}}>{item[3]}</div><div className="appointment-info"><b>{item[1]}</b><span>{item[2]}</span></div>{i === 2 && <span className="now">próximo</span>}</div>)}</section>
        <section className="card patient-card"><div className="card-head"><div><p className="eyebrow">PACIENTE RECENTE</p><h2>Ficha rápida</h2></div><button className="more">···</button></div><div className="patient-hero"><div className="big-avatar" style={{background: patient.color}}>{patient.initials}</div><div><h3>{patient.name}</h3><p>{patient.age} · CPF ***.***.***-**</p><span>{patient.tag}</span></div></div><div className="patient-fields"><div><small>Última consulta</small><b>12 nov 2026</b></div><div><small>Próximo retorno</small><b>14 dez 2026</b></div><div><small>Condição principal</small><b>Melasma</b></div></div><button className="outline">Abrir prontuário <span>→</span></button></section></div>
        <section className="bottom-grid"><div className="card quick"><div className="card-head"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2>Continuar de onde parou</h2></div></div><div className="quick-list"><button onClick={() => setSelected((selected + 1) % patients.length)}><FolderOpen size={19}/><span><b>Prontuários recentes</b><small>4 pacientes atualizados hoje</small></span><span>→</span></button><button><FileText size={19}/><span><b>Rascunhos de evolução</b><small>2 registros aguardando revisão</small></span><span>→</span></button></div></div><div className="card privacy-card"><ShieldCheck size={21}/><div><p className="eyebrow">SEGURANÇA</p><h3>Seus dados estão protegidos</h3><p>Todos os acessos são registrados e as fotografias ficam em armazenamento privado.</p></div><span className="status">Ativo</span></div></section>
        </div></section>
    </div>
  </main>;
}
