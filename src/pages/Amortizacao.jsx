import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, TrendingDown, Trophy } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import AnimatedNumber from "../components/AnimatedNumber";
import { fmt, toF } from "../lib/format";
import { calcAmortizacaoExtra } from "../lib/amortizacao";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };

function StrategyCard({ icon: Icon, title, subtitle, rows, winner, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      style={{
        ...card,
        padding: 20,
        position: "relative",
        borderColor: winner ? "var(--border-focus)" : "var(--border)",
        boxShadow: winner ? "var(--shadow-glow)" : "var(--shadow-sm)",
      }}
    >
      {winner && (
        <div
          style={{
            position: "absolute", top: -11, right: 16,
            background: "var(--accent)", color: "var(--accent-ink)",
            fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase",
            padding: "4px 10px", borderRadius: 999,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <Trophy size={11} /> Economiza mais juros
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} color="var(--text)" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(([label, value, emphasis]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "var(--text-dim)" }}>{label}</span>
            <span style={{ fontWeight: emphasis ? 800 : 600, color: emphasis ? "var(--text)" : "var(--text-dim)", fontSize: emphasis ? 16 : 13 }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function Amortizacao() {
  const [saldo, setSaldo] = useState("120000");
  const [taxa, setTaxa] = useState("1.2");
  const [parcelas, setParcelas] = useState("48");
  const [aporte, setAporte] = useState("10000");
  const [sistema, setSistema] = useState("Price");
  const [calculado, setCalc] = useState(false);

  const saldoNum = toF(saldo);
  const taxaNum = toF(taxa);
  const parcelasNum = parseInt(parcelas) || 0;
  const aporteNum = toF(aporte);
  const isSAC = sistema === "SAC";

  const valid =
    saldoNum > 0 && taxaNum > 0 && parcelasNum > 0 && parcelasNum <= 360 &&
    aporteNum > 0 && aporteNum < saldoNum;

  const reset = useCallback(() => setCalc(false), []);

  const result = useMemo(() => {
    if (!calculado || !valid) return null;
    return calcAmortizacaoExtra({
      saldoDevedor: saldoNum,
      taxaMensal: taxaNum,
      parcelasRestantes: parcelasNum,
      aporte: aporteNum,
      sistema,
    });
  }, [calculado, valid, saldoNum, taxaNum, parcelasNum, aporteNum, sistema]);

  const sysBtn = (s) => ({
    flex: 1, padding: "12px", border: "2px solid", borderRadius: "var(--r-sm)",
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    borderColor: sistema === s ? "var(--border-focus)" : "var(--border-strong)",
    background: sistema === s ? "var(--surface-3)" : "var(--bg-elevated)",
    color: sistema === s ? "var(--text)" : "var(--text-mute)",
  });

  const e1WinsInteresse = result && result.estrategia1.totalJuros <= result.estrategia2.totalJuros;

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Simulador de amortização extraordinária" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />

          <div style={{ marginTop: 22, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "var(--text)" }}>Amortização Extra</h1>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
              Informe os dados do seu financiamento atual e o valor do aporte extra. Comparamos <b>reduzir o prazo</b> contra <b>reduzir a parcela</b>.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {["Price", "SAC"].map((s) => (
              <motion.button key={s} whileTap={{ scale: 0.97 }} onClick={() => { setSistema(s); reset(); }} style={sysBtn(s)}>
                {s === "Price" ? "📏 Sistema Price" : "📉 Sistema SAC"}
              </motion.button>
            ))}
          </div>

          <div style={{ ...card, padding: 22, marginTop: 14, boxShadow: "var(--shadow-md)" }}>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Dados Atuais do Financiamento
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 14 }}>
              <Field label="Saldo devedor atual (R$)" val={saldo} set={setSaldo} hint="Ex: 120000" onChange={reset} />
              <Field label="Taxa de juros mensal (%)" val={taxa} set={setTaxa} hint="Ex: 1.2" onChange={reset} />
              <Field label="Parcelas restantes" val={parcelas} set={setParcelas} hint="Ex: 48" onChange={reset} />
              <Field label="Valor do aporte extra (R$)" val={aporte} set={setAporte} hint="Ex: 10000" onChange={reset} />
            </div>

            {aporteNum >= saldoNum && aporteNum > 0 && (
              <div style={{ marginTop: 12, padding: "9px 13px", background: "var(--bg-elevated)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text-dim)" }}>
                ⚠️ O aporte deve ser menor que o saldo devedor — se for igual ou maior, o financiamento é quitado por completo.
              </div>
            )}

            <PrimaryButton onClick={() => valid && setCalc(true)} disabled={!valid} style={{ marginTop: 16, width: "100%" }}>
              {calculado ? "✓ Recalcular" : "Comparar Estratégias"}
            </PrimaryButton>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 22 }}>
                  <StrategyCard
                    icon={Clock}
                    title="Reduzir Prazo"
                    subtitle="Mantém a parcela, quita mais rápido"
                    winner={e1WinsInteresse}
                    index={0}
                    rows={[
                      ["Novo prazo", `${result.estrategia1.meses} meses`, false],
                      ["Meses economizados", `${result.estrategia1.mesesEconomizados} meses`, true],
                      ["Total de juros", fmt(result.estrategia1.totalJuros), false],
                      ["Juros economizados", fmt(result.estrategia1.jurosEconomizados), true],
                    ]}
                  />
                  <StrategyCard
                    icon={TrendingDown}
                    title="Reduzir Parcela"
                    subtitle="Mantém o prazo, parcela menor"
                    winner={!e1WinsInteresse}
                    index={1}
                    rows={[
                      ["Nova parcela", fmt(result.estrategia2.parcelaNova), false],
                      ["Economia mensal", fmt(result.estrategia2.economiaMensal), true],
                      ["Total de juros", fmt(result.estrategia2.totalJuros), false],
                      ["Juros economizados", fmt(result.estrategia2.jurosEconomizados), true],
                    ]}
                  />
                </div>

                <div style={{ background: "var(--surface)", borderLeft: "4px solid var(--accent)", borderRadius: "0 var(--r-sm) var(--r-sm) 0", padding: "14px 16px", marginTop: 16, fontSize: 13, lineHeight: 1.8, color: "var(--text-dim)" }}>
                  Com um aporte de <b style={{ color: "var(--text)" }}>{fmt(aporteNum)}</b>, reduzir o <b style={{ color: "var(--text)" }}>prazo</b> economiza{" "}
                  <b style={{ color: "var(--text)" }}>
                    <AnimatedNumber value={Math.abs(result.diferencaEntreEstrategias)} format={fmt} />
                  </b>{" "}
                  a mais em juros do que reduzir a parcela — mas reduzir a <b style={{ color: "var(--text)" }}>parcela</b> alivia seu orçamento mensal em{" "}
                  <b style={{ color: "var(--text)" }}>{fmt(result.estrategia2.economiaMensal)}</b> desde já. A melhor escolha depende do seu momento: priorize prazo se busca pagar menos juros no total, ou parcela se precisa de fôlego no caixa hoje.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 30 }}>
            Simulação estimada a partir do saldo devedor informado · Não considera eventuais taxas de amortização extraordinária cobradas pela instituição financeira
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
