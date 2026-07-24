import Link from "next/link";

const circles = [
  ["01", "Identidade", "Propósito e cultura"],
  ["02", "Estratégias", "Direção e legado"],
  ["03", "Inteligência", "Dados e cenários"],
  ["04", "Relações", "Conexões e rede"],
  ["05", "Negócios", "Mercado e vendas"],
  ["06", "Integração", "PMO corporativo"],
  ["07", "Governança", "Conformidade e ética"],
  ["08", "Gestão", "Rotina e suporte"],
  ["09", "Operação", "Entrega e excelência"],
];

const capabilities = [
  ["IA", "Inteligência Artificial e Automação"],
  ["DA", "Governança de Dados e Inteligência Analítica"],
  ["CY", "Segurança Digital e Confiança Cibernética"],
  ["CX", "Comunicações Omnichannel e Experiência Digital"],
  ["IoT", "Cidades Inteligentes e Monitoramento Territorial"],
  ["CL", "Infraestrutura Digital e Computação em Nuvem"],
  ["RO", "Robótica Aplicada e Aprendizado Tecnológico"],
];

const stages = ["Origem", "Ideação", "Validação", "Prototipação", "Produtização", "Operação", "Escala"];

export default function Home() {
  return (
    <main id="conteudo">
      <header className="nav-shell" aria-label="Navegação principal">
        <a href="#inicio" className="brand" aria-label="IMTS, início">
          <img src="/imts-horizontal-white.png" alt="IMTS" />
        </a>
        <nav>
          <a href="/ecossistema">Ecossistema</a>
          <Link href="/solucoes">Soluções</Link>
          <a href="/direcao">Direção</a>
          <a href="/impacto">Impacto</a>
          <a href="/ive">Método IVE</a>
          <a href="/iara">IARA</a>
        </nav>
        <a className="nav-cta" href="/conectar">Conectar <span>↗</span></a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-symbol" aria-hidden="true">
          <img src="/imts-symbol-white.png" alt="" />
        </div>
        <div className="hero-content">
          <p className="eyebrow light"><span /> Ecossistema de tecnologias e inovação</p>
          <h1>O futuro não é<br />previsto.<br /><em>É construído.</em></h1>
          <p className="hero-copy">Conectamos pessoas, tecnologia, método e capital para transformar ideias em soluções reais, escaláveis e sustentáveis.</p>
          <div className="hero-actions">
            <a className="button primary" href="/ecossistema">Conheça o ecossistema <span>↗</span></a>
            <Link className="text-link" href="/solucoes">Explore nossas capacidades <span>↗</span></Link>
          </div>
        </div>
        <div className="hero-foot">
          <span>Sonhar</span><i /> <span>Conectar</span><i /> <span>Realizar</span><i /> <span>Compartilhar</span>
        </div>
      </section>

      <section className="statement section" id="essencia">
        <div className="section-index">01 <span>/ 05</span></div>
        <div className="statement-main">
          <p className="eyebrow"><span /> Nossa essência</p>
          <h2>Transformar a vida das pessoas por meio do <strong>empreendedorismo, tecnologias e inovação.</strong></h2>
        </div>
        <div className="statement-note">
          <p>Geramos impacto positivo e sustentável, apoiando empresas e projetos a alcançar seus máximos potenciais.</p>
          <a href="/ecossistema">Como fazemos <span>→</span></a>
        </div>
      </section>

      <section className="ecosystem section dark" id="ecossistema">
        <div className="section-index inverse">02 <span>/ 05</span></div>
        <div className="section-heading inverse">
          <p className="eyebrow light"><span /> Um sistema vivo</p>
          <h2>Nove círculos.<br />Uma direção.</h2>
          <p>A estratégia se conecta à execução por uma arquitetura de responsabilidades, inteligência e integração.</p>
        </div>
        <div className="circle-grid">
          {circles.map(([n, title, text]) => (
            <Link className="circle-card" href={`/ecossistema#circulo-${n}`} key={title}>
              <span>{n}</span><div><h3>{title}</h3><p>{text}</p></div><b>↗</b>
            </Link>
          ))}
        </div>
        <div className="transversal">
          <p>Estruturas transversais</p>
          <div><span>Núcleo de Dados e Automação</span><span>Malha de Circulação Interna</span><span>Fábrica de Método</span></div>
        </div>
      </section>

      <section className="capabilities section" id="capacidades">
        <div className="section-index">03 <span>/ 05</span></div>
        <div className="section-heading">
          <p className="eyebrow"><span /> Capacidades conectadas</p>
          <h2>Tecnologia como meio.<br /><strong>Transformação como resultado.</strong></h2>
        </div>
        <div className="capability-list">
          {capabilities.map(([tag, title], i) => (
            <Link href={`/solucoes#${tag.toLowerCase()}`} key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span><b>{tag}</b><h3>{title}</h3><i>↗</i>
            </Link>
          ))}
        </div>
      </section>

      <section className="ive section">
        <div className="ive-copy">
          <p className="eyebrow light"><span /> Método em movimento</p>
          <h2>Da origem<br />à escala.</h2>
          <p>O Funil IVE conduz cada iniciativa por sete estágios, conectando ideação, validação e escala com decisões claras.</p>
        </div>
        <div className="ive-flow">
          {stages.map((stage, i) => (
            <div className="ive-stage" key={stage}>
              <span>{i === 0 ? "D0" : `0${i}`}</span><strong>{stage}</strong>{i < stages.length - 1 && <i>→</i>}
            </div>
          ))}
          <div className="capital"><span>◆</span><div><small>Ponto de decisão</small><strong>Bifurcação de Capital</strong></div></div>
        </div>
      </section>

      <section className="markets section">
        <div className="markets-copy">
          <p className="eyebrow"><span /> Atuação integrada</p>
          <h2>Do desafio público à oportunidade privada.</h2>
          <p>Uma plataforma multiempresa, multicélula e multissetorial, preparada para compor soluções em diferentes contextos.</p>
        </div>
        <div className="market-panels">
          <article><small>Segmentos</small><h3>B2G</h3><p>Corporativo e SMB</p><span>Governo e instituições públicas</span></article>
          <article><small>Segmentos</small><h3>B2B</h3><p>Corporativo e SMB</p><span>Empresas e alianças estratégicas</span></article>
          <article><small>Segmentos</small><h3>B2C</h3><p>Digital e Associativo</p><span>Pessoas, comunidades e redes</span></article>
        </div>
      </section>

      <section className="impact section dark" id="impacto">
        <div className="section-index inverse">04 <span>/ 05</span></div>
        <div className="impact-number"><span>17</span><p>Objetivos de Desenvolvimento Sustentável</p></div>
        <div className="impact-copy">
          <p className="eyebrow light"><span /> Impacto e legado</p>
          <h2>Crescer importa.<br /><em>O que o crescimento transforma importa mais.</em></h2>
          <p>Até 2030, o desafio assumido é contribuir com todos os 17 ODS, conectando inovação, prosperidade e responsabilidade.</p>
          <Link className="text-link" href="/impacto">Conheça a matriz de impacto e legado <span>↗</span></Link>
        </div>
      </section>

      <section className="content-section">
        <div className="pillar-grid legacy-light">
          <article><h3>Alvos estratégicos</h3><p>Horizontes, resultados e medidas que conectam propósito à execução.</p><Link href="/direcao">Aprofundar direção →</Link></article>
          <article><h3>Gente e cultura</h3><p>Valores em comportamento, liderança, aprendizagem e evolução por mérito.</p><Link href="/talentos">Conhecer a jornada →</Link></article>
          <article><h3>Impacto e legado</h3><p>Compromissos ligados a indicadores, evidências e capacidades duradouras.</p><Link href="/impacto">Explorar a matriz →</Link></article>
          <article><h3>IARA</h3><p>A inteligência da IMTS para compreender, conectar e colocar possibilidades em movimento.</p><Link href="/iara">Conhecer a IARA →</Link></article>
        </div>
      </section>

      <section className="closing section" id="conectar">
        <div className="section-index">05 <span>/ 05</span></div>
        <div className="closing-symbol"><img src="/imts-symbol-blue.webp" alt="" /></div>
        <p className="eyebrow"><span /> A próxima transformação começa aqui</p>
        <h2>Sonhe grande.<br /><strong>Construa com método.</strong></h2>
        <p>Ideias relevantes precisam de um ecossistema capaz de conectá-las à execução.</p>
        <a className="button primary" href="/conectar">Escolha sua porta de entrada <span>↗</span></a>
      </section>

      <footer className="legacy-footer">
        <img src="/imts-horizontal-white.png" alt="IMTS" />
        <p>Clareza para decidir. Método para executar.<br />Tecnologia para avançar.</p>
        <div><span>Ecossistema IMTS</span><span>Brasil · 2026</span></div>
      </footer>
    </main>
  );
}
