import { useRascunho } from "../lib/rascunho";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Scale, Minus } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import NumeroField from "../components/NumeroField";
import PrimaryButton from "../components/PrimaryButton";
import Kpi from "../components/Kpi";
import { parseMoeda } from "../lib/moeda";
import { calcPercentual } from "../lib/percentual";

export default function Percentual() {
  const [a, setA] = useRascunho("per.a", "100,00");
  const [b, setB] = useRascunho("per.b", "120,00");
  const [calculado, setCalculado] = useRascunho("per.calculado", false);

  const va = parseMoeda(a);
  const vb = parseMoeda(b);
  const valido = Number.isFinite(va) && Number.isFinite(vb);

  const resultado = useMemo(() => {
    if (!calculado || !valido) return null;
    return calcPercentual(va, vb);
  }, [calculado, valido, va, vb]);

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Comparação entre dois valores" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <div style={{ marginTop: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "var(--text)" }}>Diferença Percentual</h1>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>Compare dois valores e veja a variação entre eles, em qualquer direção.</p>
          </div>

          <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 22, marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
              <NumeroField label="Valor A (R$)" valor={a} onChange={(v) => { setA(v); setCalculado(false); }} hint="Ex: 10.000,00" />
              <Scale size={18} color="var(--text-mute)" style={{ marginBottom: 14 }} />
              <NumeroField label="Valor B (R$)" valor={b} onChange={(v) => { setB(v); setCalculado(false); }} hint="Ex: 12.000,00" />
            </div>
            <PrimaryButton onClick={() => valido && setCalculado(true)} disabled={!valido}
              style={{ marginTop: 18, width: "100%" }}>
              Calcular diferença
            </PrimaryButton>
          </div>

          {resultado && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 14 }}>
              <Kpi label="Variação de A para B" value={resultado.variacaoAB ?? 0}
                format={(v) => (resultado.variacaoAB === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`)}
                icon={<ArrowRight size={18} />} index={0} />
              <Kpi label="Variação de B para A" value={resultado.variacaoBA ?? 0}
                format={(v) => (resultado.variacaoBA === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`)}
                icon={<ArrowLeft size={18} />} index={1} />
              <Kpi label="Diferença simétrica" value={resultado.diferencaSimetrica ?? 0}
                format={(v) => (resultado.diferencaSimetrica === null ? "—" : `${v.toFixed(2)}%`)}
                icon={<Scale size={18} />} index={2} />
              <Kpi label="Diferença absoluta" value={resultado.diferencaAbsoluta}
                format={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<Minus size={18} />} index={3} />
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
