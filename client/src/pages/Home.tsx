import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, Sparkles, Stethoscope, X } from "lucide-react";

type Concept = {
  id: string;
  number: string;
  name: string;
  movement: string;
  palette: string;
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  ink: string;
  surface: string;
  soft: string;
  font: string;
};

const concepts: Concept[] = [
  {
    id: "editorial",
    number: "01",
    name: "Editorial de cuidado",
    movement: "Revista de saúde + intimidade",
    palette: "Marfim · terracota · café",
    image: "/manus-storage/async-images/qfH07dGV8hVZ1CPqlFYBBK/image-1.webp",
    eyebrow: "Dermatologia para cada história",
    title: "Cuidar da pele começa por escutar.",
    body: "Ciência, humanidade e diversidade em uma prática dermatológica individualizada.",
    accent: "#b65d45",
    ink: "#2d2925",
    surface: "#f5f0e8",
    soft: "#e9ddd1",
    font: "editorial",
  },
  {
    id: "botanica",
    number: "02",
    name: "Botânica clínica",
    movement: "Naturalidade com precisão",
    palette: "Areia · sálvia · grafite",
    image: "/manus-storage/async-images/qfH07dGV8hVZ1CPqlFYBBK/image-2.webp",
    eyebrow: "Uma prática que une",
    title: "Conhecimento para acompanhar cada fase.",
    body: "Um cuidado atento aos detalhes, ao tempo e às particularidades de cada pele.",
    accent: "#66725f",
    ink: "#27302b",
    surface: "#f1eee6",
    soft: "#dce2d6",
    font: "botanica",
  },
  {
    id: "melanina",
    number: "03",
    name: "Melanina em foco",
    movement: "Diversidade como eixo",
    palette: "Ébano · âmbar · blush",
    image: "/manus-storage/async-images/qfH07dGV8hVZ1CPqlFYBBK/image-3.webp",
    eyebrow: "Pele negra é conhecimento",
    title: "Uma dermatologia que reconhece as particularidades.",
    body: "Experiência, pesquisa e cuidado para tratar cada pele com atenção ao que a torna única.",
    accent: "#d08a53",
    ink: "#2a1d1b",
    surface: "#f3e8df",
    soft: "#ead0bd",
    font: "melanina",
  },
  {
    id: "mineral",
    number: "04",
    name: "Clareza mineral",
    movement: "Precisão serena",
    palette: "Azul mineral · branco · carvão",
    image: "/manus-storage/async-images/qfH07dGV8hVZ1CPqlFYBBK/image-4.webp",
    eyebrow: "Dermatologia baseada em evidência",
    title: "Um plano de cuidado que faz sentido.",
    body: "Investigação, orientação e acompanhamento para decisões mais claras sobre a sua pele.",
    accent: "#7398a7",
    ink: "#213038",
    surface: "#edf2f1",
    soft: "#dce9eb",
    font: "mineral",
  },
  {
    id: "noite",
    number: "05",
    name: "Noite essencial",
    movement: "Luxo discreto + naturalidade",
    palette: "Vinho · marrom · champagne",
    image: "/manus-storage/async-images/qfH07dGV8hVZ1CPqlFYBBK/image-5.webp",
    eyebrow: "Estética com naturalidade",
    title: "Valorizar sem apagar quem você é.",
    body: "Procedimentos planejados para respeitar anatomia, proporções e diferentes fases da vida.",
    accent: "#b59b6e",
    ink: "#f5ede5",
    surface: "#251c1b",
    soft: "#49302d",
    font: "noite",
  },
];

const areas = [
  ["01", "Dermatologia clínica", "Acne, manchas, melasma, dermatites, psoríase e rosácea."],
  ["02", "Pele negra", "Particularidades da pigmentação, inflamação, cicatrizes e alopecias."],
  ["03", "Cabelos", "Investigação da queda de cabelo e das doenças do couro cabeludo."],
  ["04", "Estética com naturalidade", "Planejamento individualizado, anatomia e resultados coerentes."],
];

export default function Home() {
  const initialConcept = new URLSearchParams(window.location.search).get("concept");
  const [activeId, setActiveId] = useState(concepts.some((concept) => concept.id === initialConcept) ? initialConcept! : "editorial");
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useMemo(() => concepts.find((concept) => concept.id === activeId) ?? concepts[0], [activeId]);

  return (
    <main className={`site-shell theme-${active.font}`} style={{ "--accent": active.accent, "--ink": active.ink, "--surface": active.surface, "--soft": active.soft } as React.CSSProperties}>
      <div className="concept-ribbon">
        <span>Direções visuais · escolha um caminho</span>
        <div className="concept-switcher">
          {concepts.map((concept) => (
            <button key={concept.id} className={concept.id === active.id ? "is-active" : ""} onClick={() => setActiveId(concept.id)} aria-label={`Selecionar conceito ${concept.number}`}>
              <span>{concept.number}</span>{concept.name}
            </button>
          ))}
        </div>
      </div>

      <section className="hero">
        <nav className="nav">
          <a className="wordmark" href="#top" onClick={() => setMenuOpen(false)}><span>Mariana Gil</span><small>Dermatologia</small></a>
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre</a>
            <a href="#areas" onClick={() => setMenuOpen(false)}>Áreas de atuação</a>
            <a href="#conteudo" onClick={() => setMenuOpen(false)}>Conteúdo</a>
            <a href="#contato" onClick={() => setMenuOpen(false)}>Contato</a>
          </div>
          <a className="nav-cta" href="#contato">Agendar consulta <ArrowUpRight size={15} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="kicker"><span className="kicker-line" />{active.eyebrow}</p>
            <h1>{active.title}</h1>
            <p className="hero-body">{active.body}</p>
            <div className="hero-actions"><a className="button-primary" href="#contato">Conheça meu trabalho <ArrowUpRight size={17} /></a><a className="button-quiet" href="#areas">Explorar áreas <ChevronDown size={17} /></a></div>
            <div className="hero-meta"><span>São Paulo · particular</span><span>Presencial e teleconsulta</span></div>
          </div>
          <div className="hero-art"><div className="image-frame"><img src={active.image} alt="Imagem editorial abstrata da direção visual selecionada" /><div className="image-note">{active.number} / 05<br /><span>{active.name}</span></div></div><div className="art-orbit" /></div>
        </div>
      </section>

      <section className="marquee"><span>Ciência</span><i>·</i><span>Humanidade</span><i>·</i><span>Diversidade</span><i>·</i><span>Cuidado individualizado</span></section>

      <section className="intro section" id="sobre"><div className="section-label">01 / Uma prática que une</div><div className="intro-grid"><h2>Escuta antes de indicar. <em>Conhecimento antes de prometer.</em></h2><div><p>Minha trajetória na saúde começou antes da Medicina, na Enfermagem e na Saúde Pública. Hoje, uno a dermatologia clínica aos procedimentos estéticos de forma individualizada.</p><p>Meu objetivo é oferecer uma dermatologia baseada em evidência científica, escuta e cuidado individualizado — para que cada pessoa compreenda sua pele e encontre um tratamento que faça sentido para sua história.</p><a className="text-link" href="#contato">Conheça minha trajetória <ArrowUpRight size={16} /></a></div></div></section>

      <section className="areas section" id="areas"><div className="section-label">02 / Áreas de atuação</div><div className="areas-head"><h2>Dermatologia para diferentes <em>necessidades e fases da vida.</em></h2><p>Da saúde da pele aos cuidados estéticos, cada tratamento começa por uma avaliação individualizada.</p></div><div className="area-list">{areas.map(([number, title, copy]) => <a href="#contato" className="area-row" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p><ArrowUpRight size={21} /></a>)}</div></section>

      <section className="quote-band"><Sparkles size={19} /><p>“Estética não deve apagar características ou transformar rostos, mas acompanhar cada pessoa em suas diferentes fases da vida.”</p><span>— Mariana Gil Furlanetti</span></section>

      <section className="content section" id="conteudo"><div className="section-label">03 / Conteúdo</div><div className="content-head"><h2>Informação para cuidar <em>melhor da sua pele.</em></h2><a className="text-link" href="#contato">Ver todos os conteúdos <ArrowUpRight size={16} /></a></div><div className="content-grid"><article><div className="article-art art-one" /><small>PELE NEGRA · 06 MIN</small><h3>Por que a pele negra precisa de uma dermatologia atenta à pigmentação?</h3></article><article><div className="article-art art-two" /><small>CABELOS · 04 MIN</small><h3>Queda de cabelo: quando investigar e quais perguntas fazer.</h3></article><article><div className="article-art art-three" /><small>ESTÉTICA · 05 MIN</small><h3>Naturalidade também é um resultado planejado.</h3></article></div></section>

      <section className="contact section" id="contato"><div className="contact-card"><div><div className="section-label">04 / Agendamento</div><h2>Vamos cuidar da sua pele?</h2><p>O primeiro passo é uma consulta individualizada para entender sua pele, suas necessidades e seus objetivos.</p></div><div className="contact-actions"><a className="button-primary" href="https://wa.me/5511999999999">Falar pelo WhatsApp <ArrowUpRight size={17} /></a><div className="contact-details"><span>Av. Paulista, 1048 · 18º andar</span><span>Bela Vista · São Paulo, SP</span></div></div></div></section>

      <footer><a className="wordmark" href="#top"><span>Mariana Gil</span><small>Dermatologia</small></a><span>Ciência, escuta e cuidado individualizado.</span><span>© 2026 · São Paulo</span></footer>
    </main>
  );
}
