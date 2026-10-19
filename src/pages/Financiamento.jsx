// sem-rascunho: os campos da calculadora iniciam sempre zerados e os resultados só aparecem após o cálculo
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FADE } from "../lib/motion";
import { ArrowLeft, Lightbulb, RotateCcw, Calculator, CalendarDays, Coins, Percent, LineChart, PieChart, Table2, Download, Printer, ShieldCheck, Headset, BadgeCheck, TrendingUp, TrendingDown, Gauge, Landmark, Wallet, PiggyBank, Shield, Activity, RefreshCw, Car, SlidersHorizontal, ArrowLeftRight, FileSpreadsheet, Landmark as Banco } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import WhatsAppIcon from "../components/WhatsAppIcon";
import MoneyField from "../components/MoneyField";
import { GraficoLinhas } from "../components/GraficoFinanciamento";
import { parseMoeda } from "../lib/moeda";
import { fmt, toF } from "../lib/format";
import { calcPrice, calcSAC, buildXLSX, downloadXLSX, MIME } from "../lib/financiamento";
import { SUPORTE_WHATSAPP } from "../lib/contato";

const AZUL = "#2563eb";
const VERMELHO = "#ef4444";
const VERDE = "#10b981";
const ENTRADAS = [10, 20, 30, 50];
const PRAZOS = [24, 36, 48, 60];

const INFO_PRICE = [
  { Icone: CalendarDays, titulo: "Parcelas Fixas (PMT)", texto: "Valor idêntico do início ao fim do financiamento, garantindo planejamento orçamentário sem surpresas." },
  { Icone: TrendingUp, titulo: "Amortização Crescente", texto: "Inicialmente a parcela é composta majoritariamente por juros, acelerando a quitação do capital nas parcelas finais." },
  { Icone: BadgeCheck, titulo: "Menor Parcela Inicial", texto: "Primeira prestação significativamente mais acessível que no SAC, facilitando a aprovação de crédito e margem de renda." },
  { Icone: Activity, titulo: "Fluxo de Caixa Estável", texto: "Parcelamento linear ideal para gestão corporativa e fluxo pessoal com previsibilidade total de desembolso mensal." },
  { Icone: RefreshCw, titulo: "Amortização com Redução de Prazo", texto: "Aportes extraordinários eliminam as parcelas do fim do contrato com desconto integral dos juros futuros." },
  { Icone: ShieldCheck, titulo: "Homologação F&I", texto: "Padrão de cálculo amplamente utilizado e aceito pelas principais instituições bancárias e financeiras automotivas." },
];

const INFO_SAC = [
  { Icone: TrendingDown, titulo: "Parcelas Decrescentes", texto: "Redução progressiva mês a mês. 1ª parcela de maior valor, aliviando o fluxo financeiro futuro." },
  { Icone: Gauge, titulo: "Amortização Constante", texto: "Cota de amortização idêntica em todas as parcelas, abatendo o saldo devedor com máxima velocidade." },
  { Icone: Banco, titulo: "Juros Decrescentes", texto: "Juros calculados mês a mês sobre o saldo restante reduzido, garantindo menor montante final de juros." },
  { Icone: PiggyBank, titulo: "Menor Custo Efetivo", texto: "Custo financeiro total acumulado inferior ao Sistema Price ao longo de todo o contrato." },
  { Icone: Wallet, titulo: "Aportes & Amortização Extra", texto: "Abate direto no capital devedor com redução imediata do prazo ou das parcelas seguintes." },
  { Icone: Shield, titulo: "Previsibilidade BACEN", texto: "Operação estruturada estritamente de acordo com as diretrizes do Banco Central e segurança contratual." },
];

const CSS = `
.fi-main{display:grid;grid-template-columns:1fr;gap:18px;align-items:start}
@media (min-width:1024px){.fi-main{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}}
.fi-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.fi-info{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.fi-resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.fi-comp{display:grid;grid-template-columns:1fr;gap:12px}
@media (min-width:768px){.fi-comp{grid-template-columns:1fr 1fr}}
.fi-tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:999px;white-space:nowrap}
.fi-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .25s cubic-bezier(0.16,1,0.3,1)}
.fi-tab:hover{transform:translateY(-1px)}
.fi-btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s ease}
.fi-btn-sec:hover{transform:translateY(-1px);border-color:var(--accent)}
.fi-btn-sec:disabled{opacity:.6;cursor:wait}
.fi-entrada,.fi-prazo{flex:1;padding:7px 0;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s ease}
.fi-entrada:hover,.fi-prazo:hover{border-color:var(--accent);color:var(--text);transform:translateY(-1px)}
.fi-info-card{padding:16px;border-radius:14px;background:var(--bg-elevated);border:1px solid var(--border);transition:transform .25s cubic-bezier(0.16,1,0.3,1),box-shadow .25s ease}
.fi-info-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.fi-kpi{transition:transform .25s cubic-bezier(0.16,1,0.3,1)}
.fi-kpi:hover{transform:translateY(-3px)}
.fi-table-wrap{max-height:460px;overflow:auto;border-radius:12px;border:1px solid var(--border)}
.fi-table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.fi-table th{position:sticky;top:0;background:var(--surface);text-align:right;padding:10px 12px;color:var(--text-mute);font-weight:700;border-bottom:1px solid var(--border);z-index:1;font-size:12px}
.fi-table td{padding:8px 12px;text-align:right;color:var(--text-dim);border-bottom:1px solid var(--border)}
.fi-table th:first-child,.fi-table td:first-child{text-align:left}
.fi-table tr:hover td{background:var(--surface-3)}
.fi-table tr.fi-primeira td{background:var(--surface-3);color:var(--text);font-weight:700}
@media (prefers-reduced-motion: reduce){.fi-tab,.fi-kpi,.fi-info-card,.fi-btn-sec{transition:none}.fi-tab:hover,.fi-kpi:hover,.fi-info-card:hover{transform:none}}
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

/** Rosca Capital x Juros (proporção do total pago). */
function Rosca({ principalPct, total }) {
  const r = 70, c = 2 * Math.PI * r;
  const dash = (principalPct / 100) * c;
  return (
    <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto" }}>
      <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Proporção entre capital e juros">
        <circle cx="100" cy="100" r={r} fill="none" stroke={VERMELHO} strokeWidth="26" />
        <circle cx="100" cy="100" r={r} fill="none" stroke={AZUL} strokeWidth="26"
          strokeDasharray={`${dash} ${c}`} transform="rotate(-90 100 100)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-mute)" }}>Total financiamento</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: VERMELHO, marginTop: 2 }}>{(100 - principalPct).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function Financiamento() {
  const [sistema, setSistema] = useState("Price");
  const [valor, setValor] = useState("0");
  const [entrada, setEntrada] = useState("0");
  const [taxa, setTaxa] = useState("0");
  const [meses, setMeses] = useState("0");
  const [resultado, setResultado] = useState(null); // parâmetros da última simulação calculada
  const [aba, setAba] = useState("grafico");
  const [aviso, setAviso] = useState(null);
  const [exp, setExp] = useState(null);

  const valorNum = toF(valor);
  const entNum = toF(entrada);
  const taxaNum = toF(taxa);
  const n = parseInt(meses) || 0;
  const pvAtual = valorNum - entNum;
  const validoAtual = pvAtual > 0 && taxaNum > 0 && n > 0 && n <= 360;
  const pctEntrada = valorNum > 0 ? (entNum / valorNum) * 100 : 0;

  // Mesma matemática do sistema: calcPrice e calcSAC, sem alteração.
  const rowsPrice = useMemo(() => (resultado ? calcPrice(resultado.pv, resultado.taxa, resultado.n) : []), [resultado]);
  const rowsSAC = useMemo(() => (resultado ? calcSAC(resultado.pv, resultado.taxa, resultado.n) : []), [resultado]);

  const isSAC = sistema === "SAC";
  const rows = isSAC ? rowsSAC : rowsPrice;
  const mostrar = Boolean(resultado) && rows.length > 0;
  const pv = resultado ? resultado.pv : 0;
  const nS = resultado ? resultado.n : 0;
  const taxaS = resultado ? resultado.taxa : 0;

  const soma = (rs, k) => rs.reduce((s, r) => s + r[k], 0);
  const totalPago = mostrar ? soma(rows, "parcela") : 0;
  const totalJuros = mostrar ? soma(rows, "juros") : 0;
  const jurosPrice = soma(rowsPrice, "juros");
  const jurosSAC = soma(rowsSAC, "juros");
  const parcela1 = rows[0]?.parcela ?? 0;
  const parcelaUlt = rows[rows.length - 1]?.parcela ?? 0;
  const taxaAnual = resultado ? (Math.pow(1 + taxaS / 100, 12) - 1) * 100 : 0;
  const custoSobreCapital = pv > 0 ? (totalJuros / pv) * 100 : 0;
  const principalPct = totalPago > 0 ? (pv / totalPago) * 100 : 0;
  const idx36 = Math.min(35, Math.max(0, nS - 1));
  const saldo36Price = rowsPrice[idx36]?.saldo ?? 0;
  const saldo36SAC = rowsSAC[idx36]?.saldo ?? 0;
  const economiaSAC = Math.max(0, jurosPrice - jurosSAC);
  const difSaldoPct = saldo36Price > 0 ? ((saldo36SAC - saldo36Price) / saldo36Price) * 100 : 0;

  const nomeBase = `financiamento_${sistema.toLowerCase()}_${nS}x`;

  const limpar = () => { setResultado(null); setAviso(null); setExp(null); };

  const calcular = () => {
    if (!validoAtual) {
      setResultado(null);
      setAviso("Informe valor do bem maior que a entrada, taxa acima de zero e prazo de 1 a 360 meses.");
      return;
    }
    setAviso(null);
    setExp(null);
    setAba("grafico");
    setResultado({ pv: pvAtual, taxa: taxaNum, n });
  };

  const restaurar = () => {
    setValor("0");
    setEntrada("0");
    setTaxa("0");
    setMeses("0");
    setSistema("Price");
    setAba("grafico");
    limpar();
  };

  const usarEntrada = (p) => { setEntrada(String(Math.round((valorNum * p) / 100))); limpar(); };
  const usarPrazo = (p) => { setMeses(String(p)); limpar(); };

  const exportarExcel = async () => {
    if (!mostrar) return;
    setExp("loading");
    try {
      const blob = new Blob([buildXLSX(rows, pv, taxaS, nS, entNum, totalPago, totalJuros, sistema)], { type: MIME });
      const r = await downloadXLSX(blob, `${nomeBase}.xlsx`);
      setExp(r.ok ? { ok: "Planilha salva." } : null);
    } catch (e) {
      setExp({ err: e?.message || "Erro desconhecido" });
    }
  };

  const exportarCSV = () => {
    if (!mostrar) return;
    const cab = ["Mês", "Parcela (R$)", "Juros (R$)", "Amortização (R$)", "Saldo devedor (R$)"];
    const num = (v) => v.toFixed(2).replace(".", ",");
    const corpo = rows.map((r) => [r.mes, num(r.parcela), num(r.juros), num(r.amortizacao), num(r.saldo)].join(";"));
    const csv = "\uFEFF" + [cab.join(";"), ...corpo].join("\r\n");
    baixarArquivo(URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), `${nomeBase}.csv`);
  };

  const exportarPDF = async () => {
    if (!mostrar) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Simulação de financiamento – Sistema ${sistema}`, 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Valor financiado: ${fmt(pv)} · Taxa: ${taxaS}% a.m. (${taxaAnual.toFixed(2)}% a.a.) · Prazo: ${nS} meses`, 14, 23);
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

  const info = isSAC ? INFO_SAC : INFO_PRICE;
  const corModo = isSAC ? VERDE : AZUL;
  const tagModo = isSAC
    ? { texto: "SAC · Amortização constante", fundo: "rgba(16,185,129,0.14)", cor: "#059669" }
    : { texto: "Price · Parcelas fixas", fundo: "rgba(37,99,235,0.14)", cor: "var(--accent)" };

  const card = { background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 22 };
  const rotulo = { fontSize: 11, color: "var(--text-mute)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" };
  const numero = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" };
  const campo = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface-3)", color: "var(--text)", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", outline: "none" };

  const abas = [
    { id: "grafico", label: "Evolução da Dívida", Icone: LineChart },
    { id: "composicao", label: "Juros x Capital", Icone: PieChart },
    { id: "tabela", label: "Custo Detalhado", Icone: Table2 },
  ];

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{CSS}</style>
        <Header subtitle="Simulador Avançado de Financiamento · Price & SAC" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />

          <div style={{ marginTop: 16 }}>
            <h1 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>Simulador Avançado de Financiamento</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-mute)" }}>Tabela Price &amp; SAC • Amortizações calculadas com precisão bancária BACEN.</p>
          </div>

          <div style={{ ...card, marginTop: 16, padding: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div role="tablist" style={{ display: "flex", gap: 6, padding: 5, borderRadius: 14, background: "var(--surface-3)", flex: "1 1 360px", maxWidth: 560 }}>
              {[
                { id: "Price", titulo: "Sistema Price", sub: "Parcelas fixas", Icone: Wallet, tag: "Price" },
                { id: "SAC", titulo: "Sistema SAC", sub: "Parcelas decrescentes", Icone: TrendingDown, tag: "+ Amortização" },
              ].map((s) => {
                const ativo = sistema === s.id;
                return (
                  <button key={s.id} role="tab" aria-selected={ativo} onClick={() => { setSistema(s.id); setAba("grafico"); }}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, transition: "all .25s cubic-bezier(0.16,1,0.3,1)",
                      background: ativo ? "var(--accent)" : "transparent", color: ativo ? "#ffffff" : "var(--text-mute)", boxShadow: ativo ? "0 8px 18px -6px rgba(37,99,235,0.45)" : "none" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><s.Icone size={17} />{s.titulo}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, opacity: ativo ? 0.9 : 0.75 }}>{s.sub}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "var(--surface-3)", fontSize: 12, color: "var(--text-mute)" }}>
              <SlidersHorizontal size={16} color="var(--accent)" />
              <span>Modo atual:</span>
              <span className="fi-tag" style={{ background: tagModo.fundo, color: tagModo.cor }}>{tagModo.texto}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 16, background: "var(--surface-3)", border: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: corModo, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Lightbulb size={17} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{isSAC ? "Sistema SAC: parcelas decrescentes mês a mês" : "Sistema Price: parcela fixa do início ao fim"}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)" }}>
                {isSAC
                  ? "A devolução do valor financiado é idêntica em todas as parcelas, e os juros caem com o saldo devedor. A parcela começa maior e diminui com o tempo."
                  : "Nas parcelas iniciais você quita majoritariamente a fração de juros contratada; a amortização real do saldo financiado acelera a cada mês até a quitação final."}
              </p>
            </div>
          </div>

          <div className="fi-main" style={{ marginTop: 18 }}>
            {/* COLUNA ESQUERDA: formulário */}
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}><Car size={16} /></span>
                  <span style={rotulo}>Dados da operação / financiamento</span>
                </span>
                <button onClick={restaurar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                  <RotateCcw size={13} /> Restaurar
                </button>
              </div>

              <div>
                <MoneyField label="Valor do bem / veículo (R$)" valor={parseMoeda(valor)} onChange={(v) => { setValor(String(v)); limpar(); }} />
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4, textAlign: "right" }}>FIPE / Tabela de venda</div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Valor de entrada</span>
                  <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{pctEntrada.toFixed(1)}% do valor</span>
                </div>
                <MoneyField label="Entrada (R$)" valor={parseMoeda(entrada)} onChange={(v) => { setEntrada(String(v)); limpar(); }} />
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {ENTRADAS.map((p) => <button key={p} className="fi-entrada" onClick={() => usarEntrada(p)}>{p}%</button>)}
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label htmlFor="fi-taxa" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Taxa de juros mensal</label>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(37,99,235,0.12)", color: "var(--accent)" }}>~{taxaNum > 0 ? ((Math.pow(1 + taxaNum / 100, 12) - 1) * 100).toFixed(2) : "0.00"}% a.a.</span>
                </div>
                <div style={{ position: "relative" }}>
                  <input id="fi-taxa" type="number" inputMode="decimal" min="0.01" max="25" step="0.01" value={taxa}
                    onChange={(e) => { setTaxa(e.target.value); limpar(); }} style={campo} />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-mute)", fontWeight: 600, pointerEvents: "none" }}>% a.m.</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label htmlFor="fi-prazo" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Prazo da amortização</label>
                  <span style={{ fontSize: 11, color: "var(--text-mute)" }}>Carência zero (início em 30d)</span>
                </div>
                <div style={{ position: "relative" }}>
                  <input id="fi-prazo" type="number" inputMode="numeric" min="1" max="360" value={meses}
                    onChange={(e) => { setMeses(e.target.value); limpar(); }} style={campo} />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-mute)", fontWeight: 600, pointerEvents: "none" }}>meses</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {PRAZOS.map((p) => (
                    <button key={p} className="fi-prazo" onClick={() => usarPrazo(p)}
                      style={{ borderColor: resultado && resultado.n === p ? "var(--accent)" : undefined, color: resultado && resultado.n === p ? "var(--text)" : undefined }}>{p}x</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)" }}>Valor efetivo financiado:</span>
                  <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{pvAtual > 0 ? fmt(pvAtual) : "R$ 0,00"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12 }}>
                  <span style={{ color: "var(--text-mute)" }}>IOF &amp; tarifas bancárias:</span>
                  <span style={{ color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: "#10b981" }} />Integradas no saldo</span>
                </div>
              </div>

              <button onClick={calcular}
                style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "none", cursor: "pointer", background: "var(--accent)", color: "#ffffff", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 10px 22px -6px rgba(37,99,235,0.45)", transition: "transform .2s ease" }}>
                <Calculator size={18} /> {resultado ? "Recalcular Simulação (Price / SAC)" : "Calcular Simulação (Price / SAC)"}
              </button>
              {aviso && <div role="alert" style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, padding: "10px 12px", borderRadius: 10, border: "1px solid #ef4444" }}>{aviso}</div>}
            </div>

            {/* COLUNA DIREITA: resultados e informação */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              {mostrar && (
                <motion.div key={`kpi-${sistema}-${nS}-${pv}-${taxaS}`} {...FADE} className="fi-kpis">
                  <div className="fi-kpi" style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={rotulo}>Parcela mensal</span>
                      <CalendarDays size={18} color="var(--accent)" />
                    </div>
                    <div style={{ ...numero, marginTop: 12, color: "var(--accent)" }}>{fmt(parcela1)}</div>
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-mute)" }}>
                      <span>{isSAC ? `1ª parcela (decresce até ${fmt(parcelaUlt)})` : `${nS} parcelas fixas`}</span>
                      <span className="fi-tag" style={{ background: "rgba(37,99,235,0.12)", color: "var(--accent)" }}>{isSAC ? "Decrescente" : "Fixa"}</span>
                    </div>
                  </div>
                  <div className="fi-kpi" style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={rotulo}>Total acumulado</span>
                      <Coins size={18} color={VERDE} />
                    </div>
                    <div style={{ ...numero, marginTop: 12 }}>{fmt(totalPago)}</div>
                    <div style={{ marginTop: 12 }}><span className="fi-tag" style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}>Custo total</span></div>
                  </div>
                  <div className="fi-kpi" style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={rotulo}>Custo de juros</span>
                      <Percent size={18} color={VERMELHO} />
                    </div>
                    <div style={{ ...numero, marginTop: 12 }}>{fmt(totalJuros)}</div>
                    <div style={{ marginTop: 12 }}><span className="fi-tag" style={{ background: "rgba(239,68,68,0.12)", color: VERMELHO }}>{custoSobreCapital.toFixed(1)}% s/ financ.</span></div>
                  </div>
                </motion.div>
              )}

              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800, color: "var(--text)", fontSize: 13, letterSpacing: ".04em", textTransform: "uppercase" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", color: corModo }}>{isSAC ? <TrendingDown size={16} /> : <Wallet size={16} />}</span>
                    Informação (Sistema {sistema})
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: corModo }} />
                  </span>
                  <span className="fi-tag" style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}><BadgeCheck size={12} /> Simulação oficial BACEN</span>
                </div>
                <div className="fi-info">
                  {info.map(({ Icone, titulo, texto }) => (
                    <div key={titulo} className="fi-info-card">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Icone size={17} color={corModo} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: corModo }}>{titulo}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "var(--text-dim)" }}>{texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {mostrar && (
            <motion.div key={`res-${sistema}-${nS}-${pv}-${taxaS}`} {...FADE} style={{ ...card, marginTop: 18 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 4, padding: 5, borderRadius: 12, background: "var(--surface-3)", flexWrap: "wrap" }}>
                  {abas.map(({ id, label, Icone }) => {
                    const ativo = aba === id;
                    return (
                      <button key={id} className="fi-tab" onClick={() => setAba(id)}
                        style={{ background: ativo ? "var(--surface)" : "transparent", color: ativo ? "var(--accent)" : "var(--text-mute)", boxShadow: ativo ? "var(--shadow-sm)" : "none" }}>
                        <Icone size={15} /> {label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="fi-btn-sec" onClick={exportarCSV}><FileSpreadsheet size={14} /> CSV</button>
                  <button className="fi-btn-sec" onClick={exportarPDF}><Printer size={14} /> PDF</button>
                  <button className="fi-btn-sec" onClick={exportarExcel} disabled={exp === "loading"}><Download size={14} /> {exp === "loading" ? "Gerando…" : "Excel"}</button>
                </div>
              </div>
              {exp && exp.err && <div role="alert" style={{ marginBottom: 12, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Erro: {exp.err}</div>}
              {exp && exp.ok && <div role="status" style={{ marginBottom: 12, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{exp.ok}</div>}

              {aba === "grafico" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16 }}>Projeção Comparativa do Saldo Devedor</span>
                        <span className="fi-tag" style={{ background: "rgba(16,185,129,0.14)", color: "#059669" }}>Economia SAC: ~{fmt(economiaSAC)}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-mute)" }}>Compare visualmente a velocidade de amortização do capital entre Price e SAC ao longo dos {nS} meses. Passe o mouse para ver cada mês.</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 600, color: "var(--text-dim)" }}>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: VERDE, marginRight: 6 }} />SAC (linear rápido)</span>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: AZUL, marginRight: 6 }} />Price (curva suave)</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, padding: 10, borderRadius: 14, background: "var(--surface-3)" }}>
                    <GraficoLinhas n={nS} series={[
                      { nome: "SAC", cor: VERDE, valores: rowsSAC.map((r) => r.saldo) },
                      { nome: "Price", cor: AZUL, valores: rowsPrice.map((r) => r.saldo) },
                    ]} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <span className="fi-tag" style={{ background: "var(--bg-elevated)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>Quitação mês {nS}: {fmt(rows[rows.length - 1]?.saldo ?? 0)}</span>
                  </div>
                  <div className="fi-resumo" style={{ marginTop: 14 }}>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={rotulo}>Saldo em {idx36 + 1}x (SAC)</div>
                      <div style={{ fontWeight: 800, color: VERDE, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(saldo36SAC)}</div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={rotulo}>Saldo em {idx36 + 1}x (Price)</div>
                      <div style={{ fontWeight: 800, color: AZUL, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(saldo36Price)}</div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={rotulo}>Diferença de capital</span>
                        <span className="fi-tag" style={{ background: "rgba(16,185,129,0.14)", color: "#059669" }}>SAC {difSaldoPct.toFixed(0)}%</span>
                      </div>
                      <div style={{ fontWeight: 800, color: "var(--text)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(saldo36SAC - saldo36Price)}</div>
                    </div>
                  </div>
                </div>
              )}

              {aba === "composicao" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16 }}>Composição Efetiva: Capital Financiado vs. Custo de Juros</span>
                        <span className="fi-tag" style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}>Análise CET &amp; Spread</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-mute)" }}>Entenda exatamente para onde vai cada real desembolsado nas parcelas ao longo do financiamento.</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 600, color: "var(--text-dim)" }}>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: AZUL, marginRight: 6 }} />Principal: {principalPct.toFixed(1)}%</span>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: VERMELHO, marginRight: 6 }} />Juros: {(100 - principalPct).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 18, padding: 18, borderRadius: 16, background: "var(--surface-3)", display: "grid", gap: 18 }}>
                    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0,1fr)", alignItems: "center" }}>
                      <Rosca principalPct={principalPct} total={totalPago} />
                      <div className="fi-comp">
                        <div style={{ padding: 16, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "var(--text)", fontSize: 13 }}><Car size={16} color={AZUL} /> Capital principal</span>
                            <span className="fi-tag" style={{ background: "rgba(37,99,235,0.12)", color: AZUL }}>{principalPct.toFixed(1)}% da soma</span>
                          </div>
                          <div style={{ ...numero, fontSize: 20, marginTop: 10 }}>{fmt(pv)} <span style={{ fontSize: 13, color: "var(--text-mute)", fontWeight: 600 }}>({principalPct.toFixed(1)}%)</span></div>
                          <p style={{ margin: "6px 0 10px", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>Valor líquido efetivamente contratado para aquisição do bem.</p>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-mute)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                            <span>{isSAC ? "Cota fixa p/ amortizar:" : "Parcela fixa:"}</span>
                            <b style={{ color: "var(--text)" }}>{fmt(isSAC ? pv / nS : parcela1)}{isSAC ? "/mês" : ""}</b>
                          </div>
                        </div>
                        <div style={{ padding: 16, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "var(--text)", fontSize: 13 }}><Percent size={16} color={VERMELHO} /> Custo total de juros</span>
                            <span className="fi-tag" style={{ background: "rgba(239,68,68,0.12)", color: VERMELHO }}>{(100 - principalPct).toFixed(1)}% da soma</span>
                          </div>
                          <div style={{ ...numero, fontSize: 20, marginTop: 10, color: VERMELHO }}>{fmt(totalJuros)} <span style={{ fontSize: 13, color: "var(--text-mute)", fontWeight: 600 }}>({(100 - principalPct).toFixed(1)}%)</span></div>
                          <p style={{ margin: "6px 0 10px", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>Custo do dinheiro no tempo, spread bancário e IOF integrado.</p>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-mute)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                            <span>Multiplicador de custo:</span>
                            <b style={{ color: VERMELHO }}>+{custoSobreCapital.toFixed(1)}% s/ capital</b>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-mute)", marginBottom: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--text-dim)" }}><SlidersHorizontal size={14} /> Proporção visual contratada</span>
                        <span>100% = {fmt(totalPago)}</span>
                      </div>
                      <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "var(--surface)" }}>
                        <div style={{ width: `${principalPct}%`, background: AZUL }} title={`Capital principal: ${principalPct.toFixed(1)}%`} />
                        <div style={{ width: `${100 - principalPct}%`, background: VERMELHO }} title={`Juros totais: ${(100 - principalPct).toFixed(1)}%`} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
                        <span>Principal ({fmt(pv)})</span>
                        <span>Juros BACEN ({fmt(totalJuros)})</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, padding: "16px 18px", borderRadius: 16, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: VERDE, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Lightbulb size={17} /></span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>Estratégia de Inteligência Financeira: Amortização Antecipada</div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)" }}>
                        {isSAC
                          ? "No Sistema SAC, qualquer aporte extraordinário abate diretamente o saldo principal, cancelando os juros compostos calculados para os meses remanescentes e reduzindo proporcionalmente o valor das parcelas futuras."
                          : "No Sistema Price, um aporte extraordinário reduz o saldo devedor e elimina as parcelas finais do contrato, com desconto integral dos juros futuros."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {aba === "tabela" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16 }}>Demonstrativo Mensal da Amortização Contratada</span>
                        <span className="fi-tag" style={{ background: isSAC ? "rgba(16,185,129,0.14)" : "rgba(37,99,235,0.14)", color: isSAC ? "#059669" : "var(--accent)" }}>{isSAC ? "SAC • Amortização constante" : "Price • Parcelas fixas"}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-mute)" }}>Detalhamento exato mês a mês da composição entre amortização do principal, juros incorridos e saldo restante.</p>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)", padding: "6px 12px", borderRadius: 10, background: "var(--surface-3)" }}><ArrowLeftRight size={14} /> Role para inspecionar até {nS}x</span>
                  </div>

                  <div className="fi-table-wrap" style={{ marginTop: 14 }}>
                    <table className="fi-table">
                      <thead>
                        <tr>
                          <th>Nº mês</th>
                          <th>Parcela (PMT)</th>
                          <th>Amortização</th>
                          <th>Juros BACEN</th>
                          <th>Saldo devedor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const m = r.mes;
                          const tag = m === 1 ? "Início"
                            : m === nS ? "Quitação"
                            : m % 12 === 0 ? `Ano ${m / 12}`
                            : m === Math.round(nS / 2) ? "50%" : null;
                          return (
                            <tr key={m} className={m === 1 ? "fi-primeira" : undefined}>
                              <td>{m}º</td>
                              <td>
                                {fmt(r.parcela)}
                                {tag && <span className="fi-tag" style={{ marginLeft: 8, background: "var(--surface-3)", color: "var(--accent)", padding: "2px 7px", fontSize: 9 }}>{tag}</span>}
                              </td>
                              <td>{fmt(r.amortizacao)}</td>
                              <td style={{ color: VERMELHO }}>{fmt(r.juros)}</td>
                              <td>{fmt(r.saldo)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ShieldCheck size={14} color="#059669" /> Exibindo amortização completa ({nS} meses) • {isSAC ? `Cota fixa de ${fmt(pv / nS)}/mês` : `Parcela fixa de ${fmt(parcela1)}/mês`}</span>
                    <span>{nS} parcelas registradas</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {mostrar && (
            <section style={{ ...card, marginTop: 18 }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: "var(--text)" }}>Resumo da Operação Contratada</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Parâmetros financeiros consolidados em conformidade com as diretrizes do BACEN.</div>
                </div>
                <span className="fi-tag" style={{ background: "rgba(16,185,129,0.14)", color: "#059669" }}><BadgeCheck size={12} /> Condições vigentes homologadas</span>
              </div>
              <div className="fi-resumo" style={{ marginTop: 16 }}>
                {[
                  { Icone: Car, t: "Valor do bem", v: fmt(pv + entNum), s: "Base FIPE / venda" },
                  { Icone: Coins, t: "Entrada / líquido", v: fmt(entNum), s: `${fmt(pv)} líq.` },
                  { Icone: CalendarDays, t: "Prazo amortização", v: `${nS} meses`, s: `${(nS / 12).toFixed(1)} anos de amortização` },
                  { Icone: Percent, t: "Taxa de juros", v: `${taxaS.toFixed(2)}% a.m.`, s: `~${taxaAnual.toFixed(2)}% a.a.` },
                  { Icone: Wallet, t: "1ª parcela / regime", v: fmt(parcela1), s: isSAC ? "Decrescente (SAC)" : "Fixa (Price)" },
                  { Icone: TrendingUp, t: "Total / juros totais", v: fmt(totalPago), s: `Juros: ${fmt(totalJuros)}` },
                ].map(({ Icone, t, v, s }) => (
                  <div key={t} style={{ padding: 14, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Icone size={16} color="var(--accent)" />
                      <span style={rotulo}>{t}</span>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{s}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, fontSize: 12, color: "var(--text-mute)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <ShieldCheck size={16} color="#059669" /> Criptografia SSL 256-bit ponta a ponta • Ambiente corporativo homologado
            </div>
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
