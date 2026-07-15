import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import Kpi from "../components/Kpi";
import PrimaryButton from "../components/PrimaryButton";
import AnimatedNumber from "../components/AnimatedNumber";
import { toF, fmtPct } from "../lib/format";
import { calcPercentual } from "../lib/percentual";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };

export default function Percentual() {
  const [a, setA] = useState("100");
  const [b, setB] = useState("120");
  const [calculado, setCalc] = useState(false);

  const valA = toF(a);
  const valB = toF(b);
  const valid = a.trim() !== "" && b.trim() !== "" && !isNaN(valA) && !isNaN(valB);

  const result = useMemo(() => {
    if (!calculado || !valid) return null;
    return calcPercentual(valA, valB);
  }, [calculado, valid, valA, valB]);

  const reset = () => setCalc(false);

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Comparação entre dois valores" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />

          <div style={{ marginTop: 22, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "var(--text)" }}>Diferença Percentual</h1>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
              Compare dois valores (A e B) e veja a variação percentual entre eles, em qualquer direção.
            </p>
          </div>

          <div style={{ ...card, padding: 22, marginTop: 16, boxShadow: "var(--shadow-md)" }}>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Valores
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
              <Field label="Valor A" val={a} set={setA} hint="Ex: 100" onChange={reset} />
              <div style={{ paddingBottom: 12, color: "var(--text-faint)" }}>
                <ArrowLeftRight size={18} />
              </div>
              <Field label="Valor B" val={b} set={setB} hint="Ex: 120" onChange={reset} />
            </div>

            <PrimaryButton onClick={() => valid && setCalc(true)} disabled={!valid} style={{ marginTop: 18, width: "100%" }}>
              {calculado ? "✓ Recalcular" : "Calcular Diferença"}
            </PrimaryButton>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginTop: 18 }}>
                  <Kpi
                    label={`Variação de A → B`}
                    value={result.variacaoAB ?? 0}
                    format={(v) => (result.variacaoAB === null ? "—" : `${v >= 0 ? "+" : ""}${fmtPct(v)}`)}
                    color={result.variacaoAB >= 0 ? "var(--text)" : "var(--accent-soft)"}
                    icon={<ArrowRight size={18} style={{ display: "inline" }} />}
                    index={0}
                  />
                  <Kpi
                    label={`Variação de B → A`}
                    value={result.variacaoBA ?? 0}
                    format={(v) => (result.variacaoBA === null ? "—" : `${v >= 0 ? "+" : ""}${fmtPct(v)}`)}
                    color={result.variacaoBA >= 0 ? "var(--text)" : "var(--accent-soft)"}
                    icon={<ArrowRight size={18} style={{ display: "inline", transform: "rotate(180deg)" }} />}
                    index={1}
                  />
                  <Kpi
                    label="Diferença Simétrica"
                    value={result.diferencaSimetrica ?? 0}
                    format={(v) => (result.diferencaSimetrica === null ? "—" : fmtPct(v))}
                    color="var(--text-dim)"
                    icon="⚖️"
                    index={2}
                  />
                  <Kpi
                    label="Diferença Absoluta"
                    value={result.diferencaAbsoluta}
                    format={(v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    color="var(--text-dim)"
                    icon="Δ"
                    index={3}
                  />
                </div>

                <div style={{ background: "var(--surface)", borderLeft: "4px solid var(--accent)", borderRadius: "0 var(--r-sm) var(--r-sm) 0", padding: "14px 16px", marginTop: 14, fontSize: 13, lineHeight: 1.8, color: "var(--text-dim)" }}>
                  {result.variacaoAB !== null ? (
                    <>
                      Saindo de <b style={{ color: "var(--text)" }}>{valA.toLocaleString("pt-BR")}</b> para{" "}
                      <b style={{ color: "var(--text)" }}>{valB.toLocaleString("pt-BR")}</b>, o valor{" "}
                      {result.variacaoAB >= 0 ? "aumentou" : "diminuiu"}{" "}
                      <b style={{ color: "var(--text)" }}>
                        <AnimatedNumber value={Math.abs(result.variacaoAB)} format={(v) => fmtPct(v)} />
                      </b>
                      .
                    </>
                  ) : (
                    "Não é possível calcular a variação percentual a partir de A quando A é zero."
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 30 }}>
            Diferença simétrica usa a média dos dois valores como base — útil quando não há uma ordem natural entre A e B.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
