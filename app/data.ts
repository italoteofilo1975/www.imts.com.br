export const capabilities = [
  { id:"ia", code:"IA", title:"Inteligência Artificial e Automação", text:"Automação inteligente, agentes e aplicações de IA orientadas a processos, decisões e resultados." },
  { id:"dados", code:"DA", title:"Dados e Inteligência Analítica", text:"Governança, qualidade, integração e análise de dados para transformar informação em capacidade decisória." },
  { id:"seguranca", code:"CY", title:"Segurança Digital e Confiança Cibernética", text:"Proteção, conformidade e continuidade para ambientes, dados, identidades e operações digitais." },
  { id:"experiencia", code:"CX", title:"Omnichannel e Experiência Digital", text:"Jornadas integradas de relacionamento, atendimento e serviços digitais centrados nas pessoas." },
  { id:"cidades", code:"IoT", title:"Cidades Inteligentes e IoT", text:"Monitoramento territorial, sensoriamento e integração operacional para cidades e ambientes conectados." },
  { id:"nuvem", code:"CL", title:"Infraestrutura Digital e Nuvem", text:"Arquiteturas escaláveis, integração, modernização e sustentação de ambientes críticos." },
  { id:"robotica", code:"RO", title:"Robótica e Aprendizado Tecnológico", text:"Robótica aplicada, prototipação e experiências educacionais para desenvolver competências do futuro." },
];

export const circles = [
  ["01","Identidade","Propósito e cultura"],["02","Estratégias","Direção e legado"],["03","Inteligência","Dados e cenários"],
  ["04","Relações","Conexões e rede"],["05","Negócios","Mercado e vendas"],["06","Integração","PMO corporativo"],
  ["07","Governança","Conformidade e ética"],["08","Gestão","Rotina e suporte"],["09","Operação","Entrega e excelência"],
];

export const stages = [
  {n:"D0",name:"Origem",owner:"Identidade + Estratégias",question:"De onde nasce a iniciativa, do mercado ou do propósito?",output:"Tese de origem e impacto"},
  {n:"01",name:"Ideação",owner:"Estratégias",question:"Vale a pena apostar, e qual o impacto?",output:"Tese de valor e desenho inicial"},
  {n:"02",name:"Validação",owner:"Inteligência",question:"O mercado quer?",output:"Hipóteses testadas e evidências"},
  {n:"03",name:"Prototipação",owner:"Inteligência",question:"Funciona tecnicamente?",output:"Prova técnica e aprendizado"},
  {n:"04",name:"Produtização",owner:"Inteligência",question:"Vira produto vendável, com pricing?",output:"Oferta, escopo e preço"},
  {n:"◆",name:"Bifurcação",owner:"Capital Strategy",question:"Produto interno ou venture autônomo?",output:"Decisão humana de capital"},
  {n:"05",name:"Operação",owner:"Operação",question:"Roda com margem e SLA?",output:"Entrega repetível e governada"},
  {n:"06",name:"Escala",owner:"Negócios",question:"Vende dentro e fora do ecossistema?",output:"Crescimento e expansão"},
];

export const partnerships = [
  ["Find partner","Origina demandas e oportunidades para o ecossistema."],
  ["Business partner","Compõe negócios, receita e execução comercial em conjunto."],
  ["Service partner","Entrega capacidade técnica ou serviço complementar."],
  ["Territory partner","Amplia cobertura geográfica, presença e capacidade local."],
  ["Aliado estratégico","Amplia articulação institucional e alcance de mercado."],
];

export const sectors = ["Educação","Saúde","Finanças","Justiça","Segurança","Governo","Cidades","Utilities","Energia","Meio Ambiente","Facilities","Tecnologia"];

export const values = ["Empatia","Coragem","Protagonismo","Proatividade","Gratidão","Felicidade","Excelência regenerativa"];
export const circleRoles = [
  {n:"01",name:"Identidade",purpose:"Guarda propósito, cultura e coerência de marca.",roles:["Guardião de identidade","Curadoria de cultura","Comunicação institucional"],interfaces:"Estratégias · Relações · Governança"},
  {n:"02",name:"Estratégias",purpose:"Traduz propósito em direção, teses e prioridades.",roles:["Direção estratégica","Arquitetura de portfólio","Gestão de legado"],interfaces:"Identidade · Inteligência · Capital"},
  {n:"03",name:"Inteligência",purpose:"Produz evidências, cenários, dados e automação.",roles:["Inteligência de mercado","Dados e IA","Pesquisa e validação"],interfaces:"Estratégias · Negócios · Operação"},
  {n:"04",name:"Relações",purpose:"Cultiva conexões, presença e circulação de valor.",roles:["Relações institucionais","Comunidade e rede","Articulação territorial"],interfaces:"Identidade · Negócios · Partnerships"},
  {n:"05",name:"Negócios",purpose:"Converte capacidades em propostas e relações sustentáveis.",roles:["Desenvolvimento de negócios","Arquitetura de soluções","Gestão de contas"],interfaces:"Relações · Inteligência · Operação"},
  {n:"06",name:"Integração",purpose:"Orquestra dependências, portfólio e execução transversal.",roles:["PMO corporativo","Gestão de portfólio","Integração de círculos"],interfaces:"Todos os círculos"},
  {n:"07",name:"Governança",purpose:"Protege integridade, conformidade, risco e decisão.",roles:["Governança corporativa","Risco e conformidade","Privacidade e segurança"],interfaces:"Estratégias · Gestão · Operação"},
  {n:"08",name:"Gestão",purpose:"Sustenta pessoas, recursos, rotinas e desempenho.",roles:["Gestão de pessoas","Finanças e controladoria","Suporte corporativo"],interfaces:"Governança · Integração · Operação"},
  {n:"09",name:"Operação",purpose:"Entrega com qualidade, margem, SLA e aprendizado.",roles:["Liderança de entrega","Qualidade e serviços","Excelência operacional"],interfaces:"Negócios · Integração · Gestão"},
];
