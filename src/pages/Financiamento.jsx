import { ENTRADA, FADE } from "../lib/motion";
import IconeTexto from "../components/IconeTexto";
import { useRascunho } from "../lib/rascunho";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, BarChart3, Grid3x3, Table2, Ruler, TrendingDown, Lightbulb, Coins, TrendingUp, CalendarDays, CreditCard, Check, CheckCircle2, XCircle } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import { parseMoeda } from "../lib/moeda";
import Kpi from "../components/Kpi";
import PrimaryButton from "../components/PrimaryButton";
import SaldoAreaChart from "../components/SaldoAreaChart";
import ComposicaoBarChart from "../components/ComposicaoBarChart";
import { fmt, toF } from "../lib/format";
import { calcPrice, calcSAC, buildXLSX, downloadXLSX, MIME } from "../lib/financiamento";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };

export default function Financiamento() {
  const [valor, setValor] = useRascunho("fin.valor", "150000");
  const [taxa, setTaxa] = useRascunho("fin.taxa", "3.9");
  const [meses, setMeses] = useRascunho("fin.meses", "60");
  const [entrada, setEntrada] = useRascunho("fin.entrada", "0");
  const [sistema, setSistema] = useRascunho("fin.sistema", "Price");
  const [calculado, setCalc] = useRascunho("fin.calculado", false);
  const [tab, setTab] = useState("grafico");
  const [dlState, setDlState] = useState(null);

  const pv = toF(valor) - toF(entrada);
  const taxaNum = toF(taxa);
  const n = parseInt(meses) || 0;
  const entNum = toF(entrada);
  const valid = pv > 0 && taxaNum > 0 && n > 0 && n <= 360;
  const isSAC = sistema === "SAC";

  const reset = useCallback(() => { setCalc(false); setDlState(null); }, []);

  const rows = useMemo(() => {
    if (!calculado || !valid) return [];
    return isSAC ? calcSAC(pv, taxaNum, n) : calcPrice(pv, taxaNum, n);
  }, [calculado, pv, taxaNum, n, sistema]);

  const totalPago = rows.reduce((s, r) => s + r.parcela, 0);
  const totalJuros = rows.reduce((s, r) => s + r.juros, 0);
  const parcela1 = rows[0]?.parcela || 0;
  const parcelaUlt = rows[rows.length - 1]?.parcela || 0;
  const taxaAnual = taxaNum > 0 ? ((Math.pow(1 + taxaNum / 100, 12) - 1) * 100).toFixed(2) : "0";

  const chartData = useMemo(() => {
    if (!rows.length) return [];
    const step = Math.max(1, Math.floor(rows.length / 30));
    return rows.filter((_, i) => i % step === 0 || i === rows.length - 1).map((r) => ({
      mes: r.mes,
      Amortização: parseFloat(r.amortizacao.toFixed(2)),
      Juros: parseFloat(r.juros.toFixed(2)),
      "Saldo devedor": parseFloat(r.saldo.toFixed(2)),
    }));
  }, [rows]);

  const handleXLSX = async () => {
    if (!rows.length) return;
    setDlState("loading");
    try {
      const filename = `financiamento_${sistema.toLowerCase()}_${n}x_${taxaNum}pct.xlsx`;
      const blob = new Blob([buildXLSX(rows, pv, taxaNum, n, entNum, totalPago, totalJuros, sistema)], { type: MIME });
      const result = await downloadXLSX(blob, filename);
      if (result.ok) {
        setDlState({ ok: true });
        setTimeout(() => setDlState(null), 4000);
      } else {
        setDlState(null);
      }
    } catch (e) {
      setDlState({ err: e?.message || "Erro desconhecido" });
    }
  };

  const sysBtn = (s) => ({
    flex: 1, padding: "12px", border: "2px solid", borderRadius: "var(--r-sm)",
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    borderColor: sistema === s ? "var(--border-focus)" : "var(--border-strong)",
    background: sistema === s ? "var(--surface-3)" : "var(--bg-elevated)",
    color: sistema === s ? "var(--text)" : "var(--text-mute)",
  });
  const tabBtn = (id) => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 15px", borderRadius: "var(--r-sm)", border: "1.5px solid", cursor: "pointer", fontSize: 13, fontWeight: 600,
    borderColor: tab === id ? "var(--border-focus)" : "var(--border-strong)",
    background: tab === id ? "var(--surface-3)" : "transparent",
    color: tab === id ? "var(--text)" : "var(--text-mute)",
  });

  const isLoading = dlState === "loading";
  const isSuccess = dlState && dlState.ok;
  const isErr = dlState && dlState.err;

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Price · SAC · Exportação Excel" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {["Price", "SAC"].map((s) => (
              <motion.button key={s} whileTap={{ scale: 0.97 }} onClick={() => { setSistema(s); reset(); }} style={sysBtn(s)}>
                {s === "Price" ? <IconeTexto icon={Ruler}>Sistema Price</IconeTexto> : <IconeTexto icon={TrendingDown}>Sistema SAC</IconeTexto>}
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, opacity: 0.8 }}>
                  {s === "Price" ? "Parcelas fixas" : "Parcelas decrescentes"}
                </div>
              </motion.button>
            ))}
          </div>

          <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text-dim)", borderLeft: "3px solid var(--accent)" }}>
            {isSAC
              ? <IconeTexto icon={Lightbulb}>SAC: amortização constante. A parcela começa maior e cai todo mês, pois os juros diminuem com o saldo devedor. Você paga menos juros no total.</IconeTexto>
              : <IconeTexto icon={Lightbulb}>Price: parcela fixa do início ao fim. Nos primeiros meses você paga mais juros; a amortização cresce com o tempo.</IconeTexto>}
          </div>

          <div style={{ ...card, padding: 22, marginTop: 14, boxShadow: "var(--shadow-md)" }}>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Dados do Financiamento
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 14 }}>
              <MoneyField label="Valor do bem (R$)" valor={parseMoeda(valor)} onChange={(n) => { setValor(String(n)); reset?.(); }} />
              <MoneyField label="Entrada (R$)" valor={parseMoeda(entrada)} onChange={(n) => { setEntrada(String(n)); reset?.(); }} />
              <Field label="Taxa de juros mensal (%)" val={taxa} set={setTaxa} hint="Ex: 3.9" onChange={reset} />
              <Field label="Nº de meses" val={meses} set={setMeses} hint="Ex: 60" onChange={reset} />
            </div>
            {valid && (
              <div style={{ marginTop: 12, padding: "9px 13px", background: "var(--bg-elevated)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text-dim)", display: "flex", gap: 18, flexWrap: "wrap" }}>
                <span><IconeTexto icon={Coins}>Financiado:</IconeTexto> <b style={{ color: "var(--text)" }}>{fmt(pv)}</b></span>
                <span><IconeTexto icon={TrendingUp}>Taxa anual eq.:</IconeTexto> <b style={{ color: "var(--accent-soft)" }}>{taxaAnual}% a.a.</b></span>
              </div>
            )}
            <PrimaryButton
              onClick={() => { if (valid) { setCalc(true); setTab("grafico"); setDlState(null); } }}
              disabled={!valid}
              style={{ marginTop: 16, width: "100%" }}
            >
              {calculado ? <><Check size={15} /> Recalcular ({sistema})</> : <>Calcular – Sistema {sistema}</>}
            </PrimaryButton>
          </div>

          <AnimatePresence>
            {calculado && rows.length > 0 && (
              <motion.div {...FADE} exit={{ opacity: 0 }}>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginTop: 18 }}>
                  {[
                    { label: isSAC ? "1ª Parcela" : "Parcela Mensal", val: parcela1, color: "var(--text)", icon: <CalendarDays size={18} /> },
                    ...(isSAC ? [{ label: "Última Parcela", val: parcelaUlt, color: "var(--accent-soft)", icon: <TrendingDown size={18} /> }] : []),
                    { label: "Total a Pagar", val: totalPago, color: "var(--text)", icon: <CreditCard size={18} /> },
                    { label: "Total de Juros", val: totalJuros, color: "var(--text-dim)", icon: <TrendingUp size={18} /> },
                  ].map((k, i) => (
                    <Kpi key={k.label} label={k.label} value={k.val} format={fmt} color={k.color} icon={k.icon} index={i} />
                  ))}
                </div>

                <div style={{ background: "var(--surface)", borderLeft: `4px solid ${isSAC ? "var(--accent-soft)" : "var(--accent)"}`, borderRadius: "0 var(--r-sm) var(--r-sm) 0", padding: "12px 16px", marginTop: 14, fontSize: 13, lineHeight: 1.7, color: "var(--text-dim)" }}>
                  {isSAC
                    ? <>Financiamento de <b style={{ color: "var(--text)" }}>{n} parcelas decrescentes</b>. 1ª parcela: <b style={{ color: "var(--text)" }}>{fmt(parcela1)}</b> → última: <b style={{ color: "var(--accent-soft)" }}>{fmt(parcelaUlt)}</b>. Total pago: <b style={{ color: "var(--text)" }}>{fmt(totalPago)}</b> sendo <b style={{ color: "var(--text-dim)" }}>{fmt(totalJuros)}</b> de juros.</>
                    : <>Financiamento de <b style={{ color: "var(--text)" }}>{n} parcelas fixas</b> de <b style={{ color: "var(--text)" }}>{fmt(parcela1)}</b>. Total pago: <b style={{ color: "var(--text)" }}>{fmt(totalPago)}</b> sendo <b style={{ color: "var(--text-dim)" }}>{fmt(totalJuros)}</b> de juros ({((totalJuros / pv) * 100).toFixed(1)}% a mais).</>}
                </div>

                <div style={{ ...card, padding: "16px 18px", marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 700 }}><IconeTexto icon={BarChart3}>Exportar tabela completa (.xlsx)</IconeTexto></div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 3 }}>{n} linhas · Resumo + Evolução da Dívida</div>
                    </div>
                    <PrimaryButton onClick={handleXLSX} disabled={isLoading} style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                      <Download size={16} />
                      {isLoading ? "Gerando…" : isSuccess ? "Salvo!" : "Baixar Excel (.xlsx)"}
                    </PrimaryButton>
                  </div>
                  {isSuccess && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                      <IconeTexto icon={CheckCircle2}>Arquivo salvo com sucesso!</IconeTexto> — {rows.length} parcelas exportadas com Resumo e Evolução da Dívida.
                    </div>
                  )}
                  {isErr && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                      <IconeTexto icon={XCircle}>Erro: {dlState.err}</IconeTexto>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                  {[
                    { id: "grafico", label: "Evolução da dívida", Icon: BarChart3 },
                    { id: "composicao", label: "Composição", Icon: Grid3x3 },
                    { id: "tabela", label: "Tabela", Icon: Table2 },
                  ].map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTab(id)} style={tabBtn(id)}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {tab === "grafico" && (
                    <motion.div key="grafico" {...ENTRADA} exit={{ opacity: 0 }} style={{ ...card, padding: "18px 12px 12px", marginTop: 10 }}>
                      <p style={{ margin: "0 0 14px 4px", fontSize: 13, color: "var(--text-dim)", fontWeight: 600 }}>Saldo Devedor ao longo do tempo</p>
                      <SaldoAreaChart data={chartData} />
                    </motion.div>
                  )}
                  {tab === "composicao" && (
                    <motion.div key="composicao" {...ENTRADA} exit={{ opacity: 0 }} style={{ ...card, padding: "18px 12px 12px", marginTop: 10 }}>
                      <p style={{ margin: "0 0 14px 4px", fontSize: 13, color: "var(--text-dim)", fontWeight: 600 }}>
                        Composição {isSAC ? "(amortização constante · juros caem)" : "(amortização cresce · juros caem)"}
                      </p>
                      <ComposicaoBarChart data={chartData} />
                      <p style={{ fontSize: 11, color: "var(--text-mute)", textAlign: "center", marginTop: 6 }}>⬜ Branco = abate do saldo · ◾ Cinza = juros pagos</p>
                    </motion.div>
                  )}
                  {tab === "tabela" && (
                    <motion.div key="tabela" {...ENTRADA} exit={{ opacity: 0 }} style={{ ...card, marginTop: 10, overflow: "hidden" }}>
                      <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead style={{ position: "sticky", top: 0 }}>
                            <tr style={{ background: "var(--bg-elevated)" }}>
                              {["Mês", "Parcela", "Juros", "Amortização", "Saldo"].map((h) => (
                                <th key={h} style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-dim)", fontWeight: 700, fontSize: 12, borderBottom: "1px solid var(--border)" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, idx) => (
                              <tr key={r.mes} style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                                <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--text-mute)", fontWeight: 600 }}>{r.mes}</td>
                                <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--text)" }}>{fmt(r.parcela)}</td>
                                <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--text-dim)" }}>{fmt(r.juros)}</td>
                                <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--accent-soft)" }}>{fmt(r.amortizacao)}</td>
                                <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--text)" }}>{fmt(r.saldo)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: "var(--bg-elevated)" }}>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text-dim)", fontWeight: 800, fontSize: 12 }}>TOTAL</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text)", fontWeight: 800 }}>{fmt(totalPago)}</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text-dim)", fontWeight: 800 }}>{fmt(totalJuros)}</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--accent-soft)", fontWeight: 800 }}>{fmt(pv)}</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text-mute)" }}>—</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 30 }}>
            Simulação baseada no Sistema Price / SAC · Valores estimados · Não inclui IOF, seguros ou taxas administrativas
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
