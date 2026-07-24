import { motion } from "framer-motion";
import { Landmark, Percent, Scissors, Car } from "lucide-react";
import Header from "../components/Header";
import ModuleCard from "../components/ModuleCard";
import PageTransition from "../components/PageTransition";

const MODULES = [
  {
    to: "/financiamento",
    icon: Landmark,
    title: "Financiamento",
    description: "Simule parcelas pelo Sistema Price ou SAC, veja a evolução da dívida e exporte para Excel.",
    tag: "Price · SAC",
  },
  {
    to: "/percentual",
    icon: Percent,
    title: "Diferença Percentual",
    description: "Compare dois valores e descubra a variação percentual entre eles, em qualquer direção.",
    tag: "Comparação",
  },
  {
    to: "/amortizacao",
    icon: Scissors,
    title: "Amortização Extra",
    description: "Fez um aporte no financiamento? Descubra se compensa mais reduzir prazo ou reduzir parcela.",
    tag: "Simulador",
  },
  {
    to: "/calcula-car",
    icon: Car,
    title: "Calcula-Car",
    description: "Analise a compra e venda de um veículo: FIPE, financiamento, custos e o resultado líquido da operação.",
    tag: "Compra & Venda",
  },
];

export default function Home() {
  return (
    <PageTransition>
      <div className="page-bg">
        <Header />
        <div className="container" style={{ paddingTop: 48 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 36 }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: "var(--text)" }}>
              Suas calculadoras financeiras
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-dim)", margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
              Escolha uma ferramenta abaixo para começar. Todos os cálculos rodam localmente, sem enviar seus dados a nenhum servidor.
            </p>
          </motion.div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {MODULES.map((m, i) => (
              <ModuleCard key={m.to} {...m} index={i} />
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 48 }}>
            SliceX.calc · Ferramentas de simulação financeira · Valores estimados, não substituem aconselhamento financeiro profissional
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
