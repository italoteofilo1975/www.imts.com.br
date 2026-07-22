import type { Metadata } from "next";
import { Michroma, Open_Sans } from "next/font/google";
import "./globals.css";
import SiteExperience from "./SiteExperience";
import ConsentManager from "./ConsentManager";

const michroma = Michroma({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const openSans = Open_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IMTS | Ecossistema de Tecnologias e Inovação",
  description: "Conectamos pessoas, tecnologia, método e capital para transformar ideias em soluções reais, escaláveis e sustentáveis.",
  other: { "codex-preview": "development" },
  icons: { icon: "/imts-symbol-blue.webp", shortcut: "/imts-symbol-blue.webp" },
  metadataBase: new URL("https://www.imts.com.br"),
  alternates: { canonical: "/" },
  openGraph: { title: "IMTS | Ecossistema de Tecnologias e Inovação", description: "Clareza para decidir. Método para executar. Tecnologia para avançar.", type: "website", locale: "pt_BR", url:"https://www.imts.com.br" },
  twitter:{card:"summary_large_image",title:"IMTS | Ecossistema de Tecnologias e Inovação",description:"Clareza para decidir. Método para executar. Tecnologia para avançar."},
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${michroma.variable} ${openSans.variable}`}><SiteExperience/><ConsentManager/>{children}</body></html>;
}
