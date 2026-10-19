import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FADE } from "../lib/motion";
import { useRascunho } from "../lib/rascunho";
import { ArrowLeft, TrendingDown, TrendingUp, Lightbulb, BarChart3, PieChart, Table2, Download, FileText, Printer, RotateCcw, Wallet, LineChart, Landmark, CalendarDays, Percent, ShieldCheck, Headset, Coins, BadgeCheck } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import WhatsAppIcon from "../components/WhatsAppIcon";
import { GraficoLinhas, GraficoBarras } from "../components/GraficoFinanciamento";
import { parseMoeda } from "../lib/moeda";
import { fmt, toF } from "../lib/format";
import { calcPrice, calcSAC, buildXLSX, downloadXLSX, MIME } from "../lib/financiamento";
import { SUPORTE_WHATSAPP } from "../lib/contato";

const COR = { price: "#2563eb", sac: "#10b981", amort: "#2563eb", juros: "#94a3b8" };
const ENTRADAS_PCT = [10, 20, 30, 50];
const PRAZOS = [24, 36, 48, 60];

const CSS = `
.fi-grid{display:grid;grid-template-columns:1fr;gap:18px;align-items:stretch}
@media (min-width:1024px){.fi-grid{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}}
.fi-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.fi-resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.fi-chip{padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border:1px solid}
.fi-tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:999px}
.fi-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s ease}
.fi-tab:hover{transform:translateY(-1px)}
.fi-sel{display:flex;flex-direction:column;align-items:stretch;gap:10px}
.fi-pct{flex:1;padding:7px 0;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
.fi-pct:hover{border-color:var(--accent);color:var(--text)}
.fi-table-wrap{max-height:440px;overflow:auto;border-radius:var(--r-sm);border:1px solid var(--border)}
.fi-table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}
.fi-table th{position:sticky;top:0;background:var(--surface);text-align:right;padding:9px 10px;color:var(--text-mute);font-weight:700;border-bottom:1px solid var(--border);z-index:1}
.fi-table td{padding:7px 10px;text-align:right;color:var(--text-dim);border-bottom:1px solid var(--border)}
.fi-table th:first-child,.fi-table td:first-child{text-align:left}
.fi-table tr:hover td{background:var(--surface-3)}
@media (prefers-reduced-motion: reduce){.fi-tab{transition:none}}
`;

function baixarArquivo(url, nome) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Financiamento() {
  const [valor, setValor] = useRascunho("fin.valor", "150000");
  const [taxa, setTaxa] = useRascunho("fin.taxa", "3.9");
  const [meses, setMeses] = useRascunho("fin.meses", "60");
  const [entrada, setEntrada] = useRascunho("fin.entrada", "0");
  const [sistema, setSistema] = useRascunho("fin.sistema", "Price");
  const [aba, setAba] = useRascunho("fin.aba", "evolucao");
  const [versao, setVersao] = useState(0);
  const [exp, setExp] = useState(null);

  const valorNum = toF(valor);
  const entNum = toF(entrada);
  const pv = valorNum - entNum;
  const taxaNum = toF(taxa);
  const n = parseInt(meses) || 0;
  const valid = pv > 0 && taxaNum > 0 && n > 0 && n <= 360;
  const isSAC = sistema === "SAC";

  // Mesma matemática de sempre: calcPrice e calcSAC, sem alteração.
  const rowsPrice = useMemo(() => (valid ? calcPrice(pv, taxaNum, n) : []), [valid, pv, taxaNum, n]);
  const rowsSAC = useMemo(() => (valid ? calcSAC(pv, taxaNum, n) : []), [valid, pv, taxaNum, n]);
  const rows = isSAC ? rowsSAC : rowsPrice;

  const soma = (rs, k) => rs.reduce((s, r) => s + r[k], 0);
  const totalPago = soma(rows, "parcela");
  const totalJuros = soma(rows, "juros");
  const jurosPrice = soma(rowsPrice, "juros");
  const jurosSAC = soma(rowsSAC, "juros");
  const parcela1 = rows[0]?.parcela || 0;
  const parcelaUlt = rows[rows.length - 1]?.parcela || 0;
  const taxaAnual = taxaNum > 0 ? (Math.pow(1 + taxaNum / 100, 12) - 1) * 100 : 0;
  const pctEntrada = valorNum > 0 ? (entNum / valorNum) * 100 : 0;
  const idx36 = Math.min(35, Math.max(0, n - 1));
  const saldo36Price = rowsPrice[idx36]?.saldo || 0;
  const saldo36SAC = rowsSAC[idx36]?.saldo || 0;

  const nomeBase = `financiamento_${sistema.toLowerCase()}_${n}x`;

  const alterarSistema = (s) => { setSistema(s); setExp(null); };
  const usarEntrada = (p) => setEntrada(String(Math.round((valorNum * p) / 100)));
  const recalcular = () => { setVersao((v) => v + 1); setAba("evolucao"); setExp(null); };

  const exportarExcel = async () => {
    if (!rows.length) return;
    setExp("loading");
    try {
      const blob = new Blob([buildXLSX(rows, pv, taxaNum, n, entNum, totalPago, totalJuros, sistema)], { type: MIME });
      const r = await downloadXLSX(blob, `${nomeBase}.xlsx`);
      setExp(r.ok ? { ok: "Planilha salva." } : null);
    } catch (e) {
      setExp({ err: e?.message || "Erro desconhecido" });
    }
  };

  const exportarCSV = () => {
    if (!rows.length) return;
    const cab = ["Mês", "Parcela (R$)", "Juros (R$)", "Amortização (R$)", "Saldo devedor (R$)"];
    const num = (v) => v.toFixed(2).replace(".", ",");
    const corpo = rows.map((r) => [r.mes, num(r.parcela), num(r.juros), num(r.amortizacao), num(r.saldo)].join(";"));
    const csv = "\uFEFF" + [cab.join(";"), ...corpo].join("\r\n");
    baixarArquivo(URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), `${nomeBase}.csv`);
  };

  const exportarPDF = async () => {
    if (!rows.length) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Simulação de financiamento – Sistema ${sistema}`, 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Valor financiado: ${fmt(pv)} · Taxa: ${taxaNum}% a.m. (${taxaAnual.toFixed(2)}% a.a.) · Prazo: ${n} meses`, 14, 23);
    doc.text(`Total pago: ${fmt(totalPago)} · Total de juros: ${fmt(totalJuros)}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [["Mês", "Parcela", "Juros", "Amortização", "Saldo devedor"]],
      body: rows.map((r) => [r.mes, fmt(r.parcela), fmt(r.juros), fmt(r.amortizacao), fmt(r.saldo)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`${nomeBase}.pdf`);
  };

  const tagModo = isSAC
    ? { texto: "Modo SAC · Amortização constante", fundo: "rgba(16,185,129,0.14)", cor: "#059669" }
    : { texto: "Modo Price · Parcelas fixas", fundo: "rgba(37,99,235,0.14)", cor: "var(--accent)" };

  const abas = [
    { id: "evolucao", label: "Evolução financeira", Icon: LineChart },
    { id: "juros", label: "Juros x Capital", Icon: PieChart },
    { id: "custo", label: "Custo detalhado", Icon: Table2 },
  ];

  const card = { background: "var(--surface)", borderRadius: "var(--r-xl, 20px)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 22 };
  const rotulo = { fontSize: 11, color: "var(--text-mute)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" };
  const valorGrande = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" };

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{CSS}</style>
        <Header subtitle="Simulador Avançado de Financiamento · Price & SAC" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 14, marginTop: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>Simulador Avançado de Financiamento</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-mute)" }}>Tabela Price &amp; SAC • Amortizações calculadas com precisão bancária BACEN.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ ...card, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--shadow-sm)" }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}><BadgeCheck size={17} /></span>
                <span><span style={{ display: "block", ...rotulo, fontSize: 10 }}>Normativa Bacen</span><span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Resolução 4.881 BACEN</span></span>
              </div>
            </div>
          </div>

          <div style={{ ...card, marginTop: 18, padding: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6, padding: 5, borderRadius: 14, background: "var(--surface-3)", flex: "1 1 360px", maxWidth: 520 }} role="tablist">
              {[
                { id: "Price", titulo: "Sistema Price", sub: "Parcelas fixas", Icon: Wallet, tag: "PARCELAS FIXAS" },
                { id: "SAC", titulo: "Sistema SAC", sub: "Parcelas decrescentes", Icon: TrendingDown, tag: "+ AMORTIZAÇÃO" },
              ].map((s) => {
                const ativo = sistema === s.id;
                return (
                  <button key={s.id} role="tab" aria-selected={ativo} onClick={() => alterarSistema(s.id)}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, transition: "all .25s ease",
                      background: ativo ? "var(--accent)" : "transparent", color: ativo ? "#ffffff" : "var(--text-mute)", boxShadow: ativo ? "0 8px 18px -6px rgba(37,99,235,0.45)" : "none" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><s.Icon size={17} />{s.titulo}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", opacity: ativo ? 0.9 : 0.7 }}>{s.tag}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 12, background: "var(--surface-3)", fontSize: 12, color: "var(--text-mute)" }}>
              <span>Modo atual:</span>
              <span className="fi-tag" style={{ background: tagModo.fundo, color: tagModo.cor }}>{tagModo.texto}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 16, background: "var(--surface-3)", border: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--accent)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Lightbulb size={17} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{isSAC ? "Sistema SAC: parcelas decrescentes mês a mês" : "Sistema Price: parcela fixa do início ao fim"}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)" }}>
                {isSAC
                  ? "A devolução do valor financiado é idêntica em todas as parcelas, e os juros caem com o saldo devedor. A parcela começa maior e diminui com o tempo."
                  : "Nas parcelas iniciais você quita majoritariamente a fração de juros contratada; a amortização real do saldo financiado acelera a cada mês até a quitação final."}
              </p>
            </div>
          </div>

          <div className="fi-grid" style={{ marginTop: 18 }}>
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                <span style={rotulo}>Dados da operação / financiamento</span>
                <button onClick={() => { setValor("150000"); setTaxa("3.9"); setMeses("60"); setEntrada("0"); setAba("evolucao"); setExp(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                  <RotateCcw size={13} /> Restaurar
                </button>
              </div>

              <MoneyField label="Valor do bem / veículo (R$)" valor={parseMoeda(valor)} onChange={(v) => setValor(String(v))} />

              <div>
                <MoneyField label="Valor de entrada (R$)" valor={parseMoeda(entrada)} onChange={(v) => setEntrada(String(v))} />
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {ENTRADAS_PCT.map((p) => <button key={p} className="fi-pct" onClick={() => usarEntrada(p)}>{p}%</button>)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 6 }}>{pctEntrada.toFixed(1)}% do valor do bem</div>
              </div>

              <Field label="Taxa de juros mensal (%)" val={taxa} set={setTaxa} hint="Ex: 3.9" />

              <div>
                <Field label="Prazo da amortização (meses)" val={meses} set={setMeses} hint="Até 360 meses" />
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {PRAZOS.map((p) => (
                    <button key={p} className="fi-pct" onClick={() => setMeses(String(p))}
                      style={{ borderColor: String(n) === String(p) ? "var(--accent)" : undefined, color: String(n) === String(p) ? "var(--text)" : undefined }}>{p}x</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ color: "var(--text-dim)" }}>Valor efetivo financiado</span>
                <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{valid ? fmt(pv) : "—"}</b>
              </div>

              <button onClick={recalcular} disabled={!valid}
                style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "none", cursor: valid ? "pointer" : "not-allowed", opacity: valid ? 1 : 0.5, background: "var(--accent)", color: "#ffffff", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 10px 22px -6px rgba(37,99,235,0.45)", transition: "transform .2s ease" }}>
                <Landmark size={18} /> Recalcular simulação ({sistema})
              </button>
              {!valid && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Informe valor, entrada menor que o bem, taxa acima de zero e prazo de 1 a 360 meses.</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <div className="fi-kpis">
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={rotulo}>{isSAC ? "1ª parcela" : "Parcela mensal"}</span><CalendarDays size={18} color="var(--accent)" /></div>
                  <div style={{ ...valorGrande, marginTop: 10, color: "var(--accent)" }}>{fmt(parcela1)}</div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-mute)" }}>{isSAC ? `Última: ${fmt(parcelaUlt)}` : `${n} parcelas fixas`}</div>
                </div>
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={rotulo}>Total acumulado</span><Coins size={18} color="#10b981" /></div>
                  <div style={{ ...valorGrande, marginTop: 10 }}>{fmt(totalPago)}</div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-mute)" }}>Custo total da operação</div>
                </div>
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={rotulo}>Custo de juros</span><Percent size={18} color="#ef4444" /></div>
                  <div style={{ ...valorGrande, marginTop: 10 }}>{fmt(totalJuros)}</div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-mute)" }}>{taxaAnual.toFixed(2)}% a.a. equivalente</div>
                </div>
              </div>

              <div style={{ ...card, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "var(--text)" }}><Lightbulb size={16} color="var(--accent)" /> Informação ({sistema})</span>
                  <span className="fi-tag" style={{ background: "rgba(16,185,129,0.14)", color: "#059669" }}><BadgeCheck size={12} /> Simulação oficial BACEN</span>
                </div>
                <div style={{ display: "grid", gap: 10, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
                  <div>Valor financiado: <b style={{ color: "var(--text)" }}>{fmt(pv)}</b> em <b style={{ color: "var(--text)" }}>{n} meses</b> a <b style={{ color: "var(--text)" }}>{taxaNum}% a.m.</b></div>
                  <div>{isSAC ? "No SAC, a amortização é igual todo mês; por isso a parcela começa maior e diminui." : "No Price, a parcela é igual todo mês; por isso os juros pesam mais no início."}</div>
                  <div>Economia de juros do SAC em relação ao Price: <b style={{ color: "#059669" }}>{fmt(Math.max(0, jurosPrice - jurosSAC))}</b></div>
                </div>
              </div>
            </div>
          </div>

          {valid && rows.length > 0 && (
            <motion.div key={`${versao}-${sistema}`} {...FADE} style={{ ...card, marginTop: 18 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 4, padding: 5, borderRadius: 12, background: "var(--surface-3)", flexWrap: "wrap" }}>
                  {abas.map(({ id, label, Icon }) => {
                    const ativo = aba === id;
                    return (
                      <button key={id} className="fi-tab" onClick={() => setAba(id)}
                        style={{ background: ativo ? "var(--surface)" : "transparent", color: ativo ? "var(--accent)" : "var(--text-mute)", boxShadow: ativo ? "var(--shadow-sm)" : "none" }}>
                        <Icon size={15} /> {label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="fi-tab" onClick={exportarCSV} style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)" }}><FileText size={14} /> CSV</button>
                  <button className="fi-tab" onClick={exportarPDF} style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)" }}><Printer size={14} /> PDF</button>
                  <button className="fi-tab" onClick={exportarExcel} disabled={exp === "loading"} style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)" }}><Download size={14} /> {exp === "loading" ? "Gerando…" : "Excel"}</button>
                </div>
              </div>

              {exp && exp.err && <div role="alert" style={{ marginBottom: 12, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Erro: {exp.err}</div>}
              {exp && exp.ok && <div role="status" style={{ marginBottom: 12, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{exp.ok}</div>}

              {aba === "evolucao" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>Projeção comparativa do saldo devedor</div>
                      <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Passe o mouse no gráfico para ver o saldo de cada mês, no Price e no SAC.</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--text-dim)" }}>
                      <span><span style={{ display: "inline-block", width: 14, height: 3, borderRadius: 2, background: COR.price, verticalAlign: "middle", marginRight: 6 }} />Price</span>
                      <span><span style={{ display: "inline-block", width: 14, height: 3, borderRadius: 2, background: COR.sac, verticalAlign: "middle", marginRight: 6 }} />SAC</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "var(--surface-3)" }}>
                    <GraficoLinhas n={n} series={[
                      { nome: "Price", cor: COR.price, valores: rowsPrice.map((r) => r.saldo) },
                      { nome: "SAC", cor: COR.sac, valores: rowsSAC.map((r) => r.saldo) },
                    ]} />
                  </div>
                  <div className="fi-resumo" style={{ marginTop: 14 }}>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={rotulo}>Saldo em {idx36 + 1}x (SAC)</div>
                      <div style={{ fontWeight: 800, color: COR.sac, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(saldo36SAC)}</div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={rotulo}>Saldo em {idx36 + 1}x (Price)</div>
                      <div style={{ fontWeight: 800, color: COR.price, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(saldo36Price)}</div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={rotulo}>Diferença de capital</div>
                      <div style={{ fontWeight: 800, color: "var(--text)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(saldo36SAC - saldo36Price)}</div>
                    </div>
                  </div>
                </div>
              )}

              {aba === "juros" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>Composição de cada parcela — sistema {sistema}</div>
                      <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Amortização do capital (azul) e juros (cinza). Passe o mouse para ver cada mês.</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--text-dim)" }}>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COR.amort, verticalAlign: "middle", marginRight: 6 }} />Amortização</span>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COR.juros, verticalAlign: "middle", marginRight: 6 }} />Juros</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "var(--surface-3)" }}>
                    <GraficoBarras amortizacao={rows.map((r) => r.amortizacao)} juros={rows.map((r) => r.juros)} cores={{ amort: COR.amort, juros: COR.juros }} />
                  </div>
                  <div className="fi-resumo" style={{ marginTop: 14 }}>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}><div style={rotulo}>Capital amortizado</div><div style={{ fontWeight: 800, marginTop: 4, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmt(pv)}</div></div>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}><div style={rotulo}>Total de juros</div><div style={{ fontWeight: 800, marginTop: 4, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalJuros)}</div></div>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}><div style={rotulo}>Juros sobre o capital</div><div style={{ fontWeight: 800, marginTop: 4, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{pv > 0 ? ((totalJuros / pv) * 100).toFixed(1) : "0,0"}%</div></div>
                  </div>
                </div>
              )}

              {aba === "custo" && (
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>Custo detalhado — todas as {n} parcelas</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 10 }}>Sistema {sistema}. Role a tabela para ver todos os meses.</div>
                  <div className="fi-table-wrap">
                    <table className="fi-table">
                      <thead>
                        <tr><th>Mês</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th></tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.mes}>
                            <td>{r.mes}</td>
                            <td>{fmt(r.parcela)}</td>
                            <td>{fmt(r.juros)}</td>
                            <td>{fmt(r.amortizacao)}</td>
                            <td>{fmt(r.saldo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)", textAlign: "right" }}>
                    Total pago: <b style={{ color: "var(--text)" }}>{fmt(totalPago)}</b> · Juros: <b style={{ color: "var(--text)" }}>{fmt(totalJuros)}</b>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div style={{ ...card, marginTop: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Resumo da operação contratada</div>
                <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Parâmetros financeiros consolidados em conformidade com as diretrizes do BACEN.</div>
              </div>
              <span className="fi-tag" style={{ background: "rgba(16,185,129,0.14)", color: "#059669" }}><BadgeCheck size={12} /> Condições vigentes homologadas</span>
            </div>
            <div className="fi-resumo" style={{ marginTop: 16 }}>
              {[
                { t: "Valor do bem", v: fmt(valorNum), s: "Base FIPE / venda" },
                { t: "Entrada", v: fmt(entNum), s: `${pctEntrada.toFixed(1)}% do bem` },
                { t: "Prazo de amortização", v: `${n} meses`, s: `${(n / 12).toFixed(1)} anos` },
                { t: "Taxa de juros", v: `${taxaNum.toFixed(2)}% a.m.`, s: `${taxaAnual.toFixed(2)}% a.a.` },
                { t: isSAC ? "1ª parcela (SAC)" : "Parcela (Price)", v: fmt(parcela1), s: isSAC ? "Decrescente" : "Fixa" },
                { t: "Total / juros totais", v: fmt(totalPago), s: `Juros: ${fmt(totalJuros)}` },
              ].map((x) => (
                <div key={x.t} style={{ padding: 14, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={rotulo}>{x.t}</div>
                  <div style={{ fontWeight: 800, color: "var(--text)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{x.v}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{x.s}</div>
                </div>
              ))}
            </div>
          </div>

          <footer style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, fontSize: 12, color: "var(--text-mute)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={16} color="#059669" /> Criptografia SSL 256-bit ponta a ponta • Ambiente corporativo homologado</div>
            <div>© {new Date().getFullYear()} Calcula.car Soluções Automotivas. Todos os direitos reservados.</div>
            <a href={SUPORTE_WHATSAPP} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
              <Headset size={16} /> Suporte Especializado <WhatsAppIcon size={15} />
            </a>
          </footer>
        </div>
      </div>
    </PageTransition>
  );
}
