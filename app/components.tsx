import Link from "next/link";

export function Header({dark=true}:{dark?:boolean}){
  return <header className={`site-header ${dark?"on-dark":"on-light"}`}>
    <Link href="/" className="site-brand"><img src={dark?"/imts-horizontal-white.png":"/imts-horizontal-blue.png"} alt="IMTS"/></Link>
    <nav aria-label="Navegação principal"><Link href="/ecossistema">Ecossistema</Link><Link href="/solucoes">Soluções</Link><Link href="/explorar">Explorar</Link><Link href="/segmentos">Segmentos</Link><Link href="/ive">Método IVE</Link><Link href="/insights">Insights</Link></nav>
    <Link className="header-cta" href="/conectar">Conectar <span>↗</span></Link>
  </header>
}

export function Footer(){return <footer className="global-footer">
  <div className="footer-brand"><img src="/imts-horizontal-white.png" alt="IMTS"/><p>Clareza para decidir.<br/>Método para executar.<br/>Tecnologia para avançar.</p></div>
  <div className="footer-links"><div><b>Descobrir</b><Link href="/ecossistema">Ecossistema</Link><Link href="/solucoes">Soluções</Link><Link href="/segmentos">Segmentos</Link><Link href="/ive">Funil IVE</Link><Link href="/impacto">Impacto</Link><Link href="/insights">Insights</Link></div><div><b>Participar</b><Link href="/partnerships">Partnerships</Link><Link href="/talentos">Talentos</Link><Link href="/capital">Capital</Link><Link href="/conectar">Conectar</Link><Link href="/portal">Portal IMTS</Link></div><div><b>Confiança</b><Link href="/governanca">Governança</Link><Link href="/governanca#privacidade">Privacidade</Link><Link href="/governanca#integridade">Integridade</Link><Link href="/governanca#acessibilidade">Acessibilidade</Link><Link href="/integracoes">Prontidão técnica</Link></div></div>
  <div className="footer-bottom"><span>Ecossistema IMTS · Brasil · 2026</span><span>Sonhar · Conectar · Realizar · Compartilhar</span></div>
  </footer>}

export function PageHero({kicker,title,lead,accent}:{kicker:string,title:string,lead:string,accent?:string}){return <section className="page-hero"><Header/><div className="page-hero-grid"/><div className="page-hero-mark"><img src="/imts-symbol-white.png" alt=""/></div><div className="page-hero-content"><p className="eyebrow light"><span/>{kicker}</p><h1>{title}<em>{accent}</em></h1><p>{lead}</p></div></section>}

export function SectionTitle({kicker,title,lead,light=false}:{kicker:string,title:string,lead?:string,light?:boolean}){return <div className={`block-title ${light?"light":""}`}><p className={`eyebrow ${light?"light":""}`}><span/>{kicker}</p><h2>{title}</h2>{lead&&<p className="block-lead">{lead}</p>}</div>}

export function Breadcrumb({current}:{current:string}){return <div className="breadcrumb"><Link href="/">Início</Link><span>→</span><b>{current}</b></div>}
