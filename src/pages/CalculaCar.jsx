import { ENTRADA, FADE } from "../lib/motion";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRascunho, limparRascunho } from "../lib/rascunho";
import { ClipboardCheck, Car, TrendingUp, Wallet, Landmark, Plus, Trash2, Pencil, PieChart, Download, FileText, BarChart3, Grid3x3, Table2, AlertTriangle, CheckCircle2, Coins, Target, Briefcase, TrendingDown, Ruler, CalendarDays, CreditCard } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import { parseMoeda } from "../lib/moeda";
import CurrencyField from "../components/CurrencyField";
import Modal from "../components/Modal";
import Kpi from "../components/Kpi";
import PrimaryButton from "../components/PrimaryButton";
import SaldoAreaChart from "../components/SaldoAreaChart";
import ComposicaoBarChart from "../components/ComposicaoBarChart";
import { fmt, toF } from "../lib/format";
import { calcPrice, calcSAC, downloadXLSX, MIME } from "../lib/financiamento";
import { calcDiferenca, calcResultado, buildCalculaCarXLSX, buildCalculaCarPDF, MARGEM_REFERENCIA_PCT } from "../lib/calculaCar";
import SalvarNoEstoque from "../components/SalvarNoEstoque";
import ChecklistVeiculo, { CHECKLIST_INICIAL } from "../components/ChecklistVeiculo";
import { buscarDuplicado } from "../lib/estoque";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };

function SectionTitle({ icon: Icon, n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color="var(--text)" />
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
        {n}. {children}
      </p>
    </div>
  );
}

export default function CalculaCar() {
  // Bloco 1 — veículo
  const [modelo, setModelo] = useRascunho("cc.modelo", "");
  const [placa, setPlaca] = useRascunho("cc.placa", "");
  const [fipeStr, setFipeStr] = useRascunho("cc.fipeStr", "");
  const [compraStr, setCompraStr] = useRascunho("cc.compraStr", "");
  const [renavam, setRenavam] = useRascunho("cc.renavam", "");
  const [chassi, setChassi] = useRascunho("cc.chassi", "");
  const [anoFab, setAnoFab] = useRascunho("cc.anoFab", "");
  const [anoMod, setAnoMod] = useRascunho("cc.anoMod", "");
  const [cor, setCor] = useRascunho("cc.cor", "");
  const [km, setKm] = useRascunho("cc.km", "");
  const [combustivel, setCombustivel] = useRascunho("cc.combustivel", "");
  const [cambio, setCambio] = useRascunho("cc.cambio", "");

  // Bloco 3 — capital
  const [tipoCapital, setTipoCapital] = useRascunho("cc.tipoCapital", "Próprio");

  // Bloco 4 — financiamento (reaproveita exatamente os campos/lógica da calculadora existente)
  const [valorBemStr, setValorBemStr] = useRascunho("cc.valorBemStr", "");
  const [entradaStr, setEntradaStr] = useRascunho("cc.entradaStr", "");
  const [taxaStr, setTaxaStr] = useRascunho("cc.taxaStr", "");
  const [mesesStr, setMesesStr] = useRascunho("cc.mesesStr", "");
  const [sistema, setSistema] = useRascunho("cc.sistema", "Price");
  const [tab, setTab] = useState("grafico");

  // Bloco 5 — custos adicionais
  const [custos, setCustos] = useRascunho("cc.custos", []);
  const [marca, setMarca] = useRascunho("cc.marca", "");
  const [dataAquisicao, setDataAquisicao] = useRascunho("cc.dataAquisicao", "");
  const [numeroMotor, setNumeroMotor] = useRascunho("cc.numeroMotor", "");
  const [categoria, setCategoria] = useRascunho("cc.categoria", "");
  const [potenciaMotor, setPotenciaMotor] = useRascunho("cc.potenciaMotor", "");
  const [portas, setPortas] = useRascunho("cc.portas", "");
  const [lugares, setLugares] = useRascunho("cc.lugares", "");
  const [vendaStr, setVendaStr] = useRascunho("cc.vendaStr", "");
  const [avisoPlaca, setAvisoPlaca] = useState(null);
  async function verificarPlaca(valor) {
    const p = String(valor || "").trim();
    if (!p) { setAvisoPlaca(null); return; }
    const { data } = await buscarDuplicado({ placa: p });
    setAvisoPlaca(data && data.id ? `Já existe um veículo com esta placa${data.modelo ? ` (${data.modelo})` : ""}.` : null);
  }
  const [checklist, setChecklist] = useRascunho("cc.checklist", CHECKLIST_INICIAL);
  const resetarCalcula = () => {
    limparRascunho(["cc.modelo","cc.placa","cc.fipeStr","cc.compraStr","cc.renavam","cc.chassi","cc.anoFab","cc.anoMod",
      "cc.cor","cc.km","cc.combustivel","cc.cambio","cc.tipoCapital","cc.valorBemStr","cc.entradaStr","cc.taxaStr",
      "cc.mesesStr","cc.sistema","cc.custos","cc.checklist","cc.marca","cc.dataAquisicao","cc.numeroMotor","cc.categoria","cc.vendaStr","cc.potenciaMotor","cc.portas","cc.lugares"]);
    setModelo(""); setPlaca(""); setFipeStr("75000"); setCompraStr("50000"); setRenavam(""); setChassi("");
    setAnoFab(""); setAnoMod(""); setCor(""); setKm(""); setCombustivel(""); setCambio("");
    setTipoCapital("Próprio"); setValorBemStr("50000"); setEntradaStr("0"); setTaxaStr("3.9"); setMesesStr("48");
    setSistema("Price"); setCustos([]); setChecklist(CHECKLIST_INICIAL); setMarca(""); setDataAquisicao("");
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftDesc, setDraftDesc] = useState("");
  const [draftCents, setDraftCents] = useState(0);

  // Bloco 7 — exportação
  const [dlState, setDlState] = useState(null); // null | "xlsx" | "pdf" | { ok, tipo } | { err }

  const fipe = toF(fipeStr);
  const compra = toF(compraStr);
  const veiculoValido = fipe > 0 && compra > 0;

  const diferenca = useMemo(() => (veiculoValido ? calcDiferenca(fipe, compra) : null), [veiculoValido, fipe, compra]);

  // Financiamento — usa a MESMA lógica (calcPrice/calcSAC) da calculadora existente
  const pv = toF(valorBemStr) - toF(entradaStr);
  const taxaNum = toF(taxaStr);
  const n = parseInt(mesesStr) || 0;
  const financiamentoValido = tipoCapital === "Financiamento" && pv > 0 && taxaNum > 0 && n > 0 && n <= 360;

  const finRows = useMemo(() => {
    if (!financiamentoValido) return [];
    return sistema === "SAC" ? calcSAC(pv, taxaNum, n) : calcPrice(pv, taxaNum, n);
  }, [financiamentoValido, pv, taxaNum, n, sistema]);

  const finTotalPago = finRows.reduce((s, r) => s + r.parcela, 0);
  const finTotalJuros = finRows.reduce((s, r) => s + r.juros, 0);

  const financiamento = financiamentoValido && finRows.length
    ? { rows: finRows, pv, taxa: taxaNum, n, sistema, totalPago: finTotalPago, totalJuros: finTotalJuros }
    : null;

  const custoFinanceiro = financiamento ? financiamento.totalJuros : 0;
  const totalCustosAdicionais = custos.reduce((s, c) => s + c.valor, 0);
  const valorVenda = fipe; // venda pela FIPE
  const valorVendaPretendida = toF(vendaStr); // venda pelo valor pretendido

  const resultado = useMemo(() => {
    if (!veiculoValido) return null;
    return calcResultado({ fipe, compra, custos, custoFinanceiro, valorVenda });
  }, [veiculoValido, fipe, compra, custos, custoFinanceiro, valorVenda]);

  const resultadoPretendido = useMemo(() => {
    if (!veiculoValido || !(valorVendaPretendida > 0)) return null;
    return calcResultado({ fipe, compra, custos, custoFinanceiro, valorVenda: valorVendaPretendida });
  }, [veiculoValido, fipe, compra, custos, custoFinanceiro, valorVendaPretendida]);
  const margemPretendidaPct = resultadoPretendido && valorVendaPretendida > 0 ? (resultadoPretendido.resultadoLiquido / valorVendaPretendida) * 100 : null;
  const margemFinalPct = resultado && fipe > 0 ? (resultado.resultadoLiquido / fipe) * 100 : null;

  const chartData = useMemo(() => {
    if (!finRows.length) return [];
    const step = Math.max(1, Math.floor(finRows.length / 30));
    return finRows.filter((_, i) => i % step === 0 || i === finRows.length - 1).map((r) => ({
      mes: r.mes,
      Amortização: parseFloat(r.amortizacao.toFixed(2)),
      Juros: parseFloat(r.juros.toFixed(2)),
      "Saldo devedor": parseFloat(r.saldo.toFixed(2)),
    }));
  }, [finRows]);

  const openModal = () => { setEditingId(null); setDraftDesc(""); setDraftCents(0); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const startEdit = (item) => { setEditingId(item.id); setDraftDesc(item.descricao); setDraftCents(Math.round(item.valor * 100)); };
  const addOrUpdateCusto = () => {
    const valor = draftCents / 100;
    if (!draftDesc.trim() || valor <= 0) return;
    if (editingId) {
      setCustos((c) => c.map((x) => (x.id === editingId ? { ...x, descricao: draftDesc.trim(), valor } : x)));
    } else {
      setCustos((c) => [...c, { id: Date.now(), descricao: draftDesc.trim(), valor }]);
    }
    setEditingId(null); setDraftDesc(""); setDraftCents(0);
  };
  const removeCusto = (id) => setCustos((c) => c.filter((x) => x.id !== id));

  const exportData = resultado ? {
    modelo, placa, fipe, compra, valorVenda, numeroMotor, categoria, potenciaMotor, portas, lugares, dataAquisicao: dataAquisicao ? new Date(dataAquisicao + "T12:00:00").toLocaleDateString("pt-BR") : "",
    ...diferenca,
    tipoCapital: tipoCapital === "Financiamento" ? "Financiamento" : "Capital Próprio",
    financiamento,
    custos, totalCustosAdicionais, custoFinanceiro,
    ...resultado,
  } : null;

  const handleExcel = async () => {
    if (!exportData) return;
    setDlState("xlsx");
    try {
      const XLSX = await import("xlsx");
      const bytes = buildCalculaCarXLSX(XLSX, exportData);
      const blob = new Blob([bytes], { type: MIME });
      const result = await downloadXLSX(blob, `calcula-car_${(modelo || "veiculo").toLowerCase().replace(/\s+/g, "-")}.xlsx`);
      setDlState(result.ok ? { ok: true, tipo: "xlsx" } : null);
      if (result.ok) setTimeout(() => setDlState(null), 4000);
    } catch (e) {
      setDlState({ err: e?.message || "Erro ao gerar Excel" });
    }
  };

  const handlePDF = async () => {
    if (!exportData) return;
    setDlState("pdf");
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = buildCalculaCarPDF({ jsPDF, autoTable, data: exportData });
      doc.save(`calcula-car_${(modelo || "veiculo").toLowerCase().replace(/\s+/g, "-")}.pdf`);
      setDlState({ ok: true, tipo: "pdf" });
      setTimeout(() => setDlState(null), 4000);
    } catch (e) {
      setDlState({ err: e?.message || "Erro ao gerar PDF" });
    }
  };

  const sysBtn = (s) => ({
    flex: 1, padding: "12px", border: "2px solid", borderRadius: "var(--r-sm)",
    cursor: "pointer", fontWeight: 700, fontSize: 14,
    borderColor: sistema === s ? "var(--border-focus)" : "var(--border-strong)",
    background: sistema === s ? "var(--surface-3)" : "var(--bg-elevated)",
    color: sistema === s ? "var(--text)" : "var(--text-mute)",
  });
  const capBtn = (t) => ({
    flex: 1, padding: "16px", border: "2px solid", borderRadius: "var(--r-md)",
    cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
    borderColor: tipoCapital === t ? "var(--border-focus)" : "var(--border-strong)",
    background: tipoCapital === t ? "var(--surface-3)" : "var(--bg-elevated)",
  });
  const tabBtn = (id) => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 15px", borderRadius: "var(--r-sm)", border: "1.5px solid", cursor: "pointer", fontSize: 13, fontWeight: 600,
    borderColor: tab === id ? "var(--border-focus)" : "var(--border-strong)",
    background: tab === id ? "var(--surface-3)" : "transparent",
    color: tab === id ? "var(--text)" : "var(--text-mute)",
  });

  const isLoading = dlState === "xlsx" || dlState === "pdf";
  const isSuccess = dlState && dlState.ok;
  const isErr = dlState && dlState.err;

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Análise de Compra e Venda Veicular" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />

          <div style={{ marginTop: 22, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
              <Car size={22} /> Calcula-Car
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
              Informe os dados do veículo e descubra quanto realmente sobra para você no final da operação.
            </p>
          </div>

          {/* 1. Dados do Veículo */}
          <div style={{ ...card, padding: 22, marginTop: 16, boxShadow: "var(--shadow-md)" }}>
            <SectionTitle icon={Car} n={1}>Dados do Veículo</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Data de aquisição *</label>
                <input type="date" value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 }} />
              </div>
              <Field label="Placa do veículo" val={placa} set={setPlaca} hint="Ex: ABC1D23" aviso={avisoPlaca} onBlurExtra={verificarPlaca} />
              <Field label="Chassi" val={chassi} set={setChassi} hint="17 caracteres" />
              <Field label="RENAVAM" val={renavam} set={setRenavam} hint="Ex: 00123456789" />
              <Field label="Marca" val={marca} set={setMarca} hint="Ex: Volkswagen" />
              <Field label="Modelo do veículo" val={modelo} set={setModelo} hint="Ex: Toyota Corolla XEi 2.0" />
              <Field label="Ano de fabricação" val={anoFab} set={setAnoFab} hint="Ex: 2020" />
              <Field label="Ano do modelo" val={anoMod} set={setAnoMod} hint="Ex: 2021" />
              <Field label="Cor" val={cor} set={setCor} hint="Ex: Prata" />
              <Field label="Quilometragem (km)" val={km} set={setKm} hint="Ex: 45000" />
              <Field label="Combustível" val={combustivel} set={setCombustivel} hint="Ex: Flex" />
              <Field label="Câmbio" val={cambio} set={setCambio} hint="Ex: Automático" />
              <Field label="Número do motor" val={numeroMotor} set={setNumeroMotor} hint="Ex: CHT1A2B3C" />
              <Field label="Categoria / Carroceria" val={categoria} set={setCategoria} hint="Ex: Hatch, Sedan, SUV" />
              <Field label="Potência do motor" val={potenciaMotor} set={setPotenciaMotor} hint="Ex: 1.0, 1.6, 1.8" />
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Portas</label>
                <select value={portas} onChange={(e) => setPortas(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
                  <option value="">Selecione</option>
                  <option value="2">2 portas</option>
                  <option value="4">4 portas</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Lugares</label>
                <select value={lugares} onChange={(e) => setLugares(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
                  <option value="">Selecione</option>
                  <option value="5">5 lugares</option>
                  <option value="7">7 ou mais lugares</option>
                </select>
              </div>
              <MoneyField label="Valor FIPE (R$) *" valor={parseMoeda(fipeStr)} onChange={(n) => { setFipeStr(String(n)); reset?.(); }} />
              <MoneyField label="Valor de compra (R$)" valor={parseMoeda(compraStr)} onChange={(n) => { setCompraStr(String(n)); reset?.(); }} />
              <MoneyField label="Valor de venda pretendido (R$) *" valor={parseMoeda(vendaStr)} onChange={(n) => { setVendaStr(String(n)); reset?.(); }} />
            </div>
          </div>

          {/* 2. Análise FIPE x Compra */}
          <AnimatePresence>
            {veiculoValido && diferenca && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: 22, marginTop: 14 }}>
                <SectionTitle icon={TrendingUp} n={2}>Análise FIPE x Compra</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                  <Kpi label="Diferença em reais" value={diferenca.diferencaReais} format={fmt} color="var(--text)" icon={<Coins size={18} />} index={0} />
                  <Kpi
                    label="Diferença percentual"
                    value={diferenca.diferencaPercentual ?? 0}
                    format={(v) => (diferenca.diferencaPercentual === null ? "—" : `${v.toFixed(2)}%`)}
                    color="var(--accent-soft)" icon={<BarChart3 size={18} />} index={1}
                  />
                  <Kpi label="Margem de referência" value={MARGEM_REFERENCIA_PCT} format={(v) => `${v}%`} color="var(--text-dim)" icon={<Target size={18} />} index={2} />
                </div>

                <div style={{
                  marginTop: 14, padding: "12px 16px", borderRadius: "var(--r-sm)", fontSize: 13, lineHeight: 1.7,
                  background: "var(--bg-elevated)",
                  borderLeft: `4px solid ${diferenca.abaixoDaMargem ? "var(--text-dim)" : "var(--accent)"}`,
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  {diferenca.abaixoDaMargem
                    ? <AlertTriangle size={16} color="var(--text-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
                    : <CheckCircle2 size={16} color="var(--text)" style={{ flexShrink: 0, marginTop: 2 }} />}
                  <span style={{ color: "var(--text-dim)" }}>
                    {diferenca.abaixoDaMargem
                      ? <>Este veículo está <b style={{ color: "var(--text)" }}>abaixo da margem de referência de {MARGEM_REFERENCIA_PCT}%</b>. Isso não impede a análise — apenas indica que a margem obtida é menor que a referência sugerida. Pode haver justificativas (baixa km, veículo raro, oportunidade pontual).</>
                      : <>Este veículo está <b style={{ color: "var(--text)" }}>dentro ou acima da margem de referência de {MARGEM_REFERENCIA_PCT}%</b>.</>}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Origem do Capital */}
          <AnimatePresence>
            {veiculoValido && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: 22, marginTop: 14 }}>
                <SectionTitle icon={Wallet} n={3}>Origem do Capital</SectionTitle>
                <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-mute)" }}>Selecione a origem do capital para a compra do veículo</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => setTipoCapital("Próprio")} style={capBtn("Próprio")}>
                    <Wallet size={20} color={tipoCapital === "Próprio" ? "var(--text)" : "var(--text-mute)"} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: tipoCapital === "Próprio" ? "var(--text)" : "var(--text-dim)" }}>Capital Próprio</div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>Compra realizada com recursos próprios</div>
                    </div>
                  </button>
                  <button onClick={() => setTipoCapital("Financiamento")} style={capBtn("Financiamento")}>
                    <Landmark size={20} color={tipoCapital === "Financiamento" ? "var(--text)" : "var(--text-mute)"} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: tipoCapital === "Financiamento" ? "var(--text)" : "var(--text-dim)" }}>Financiamento</div>
                      <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>Compra realizada com financiamento</div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Financiamento — SOMENTE quando "Financiamento" está selecionado */}
          <AnimatePresence>
            {veiculoValido && tipoCapital === "Financiamento" && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: 22, marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                  <SectionTitle icon={Landmark} n={4}>Financiamento</SectionTitle>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-mute)", background: "var(--surface-2)", padding: "4px 9px", borderRadius: 999, border: "1px solid var(--border)" }}>
                    Calculadora integrada · Price e SAC
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {["Price", "SAC"].map((s) => (
                    <button key={s} onClick={() => setSistema(s)} style={sysBtn(s)}>
                      {s === "Price" ? "Sistema Price" : "Sistema SAC"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
                  <MoneyField label="Valor financiado (R$)" valor={parseMoeda(valorBemStr)} onChange={(n) => { setValorBemStr(String(n)); reset?.(); }} />
                  <MoneyField label="Entrada (R$)" valor={parseMoeda(entradaStr)} onChange={(n) => { setEntradaStr(String(n)); reset?.(); }} />
                  <Field label="Taxa de juros mensal (%)" val={taxaStr} set={setTaxaStr} hint="Ex: 3.9" />
                  <Field label="Prazo (meses)" val={mesesStr} set={setMesesStr} hint="Ex: 48" />
                </div>

                {financiamento && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 16 }}>
                      <Kpi label="Parcela" value={finRows[0]?.parcela || 0} format={fmt} icon={<CalendarDays size={18} />} index={0} />
                      <Kpi label="Total de juros" value={finTotalJuros} format={fmt} color="var(--text-dim)" icon={<TrendingUp size={18} />} index={1} />
                      <Kpi label="Total pago" value={finTotalPago} format={fmt} icon={<CreditCard size={18} />} index={2} />
                      <Kpi label="Total financiado" value={pv} format={fmt} color="var(--accent-soft)" icon={<Landmark size={18} />} index={3} />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                      {[
                        { id: "grafico", label: "Evolução", Icon: BarChart3 },
                        { id: "composicao", label: "Composição", Icon: Grid3x3 },
                        { id: "tabela", label: "Tabela completa", Icon: Table2 },
                      ].map(({ id, label, Icon }) => (
                        <button key={id} onClick={() => setTab(id)} style={tabBtn(id)}><Icon size={14} /> {label}</button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {tab === "grafico" && (
                        <motion.div key="g" {...FADE} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>
                          <SaldoAreaChart data={chartData} />
                        </motion.div>
                      )}
                      {tab === "composicao" && (
                        <motion.div key="c" {...FADE} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>
                          <ComposicaoBarChart data={chartData} />
                        </motion.div>
                      )}
                      {tab === "tabela" && (
                        <motion.div key="t" {...FADE} exit={{ opacity: 0 }} style={{ marginTop: 12, overflow: "hidden", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                          <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead style={{ position: "sticky", top: 0 }}>
                                <tr style={{ background: "var(--bg-elevated)" }}>
                                  {["Mês", "Parcela", "Juros", "Amortização", "Saldo"].map((h) => (
                                    <th key={h} style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-dim)", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {finRows.map((r, i) => (
                                  <tr key={r.mes} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                                    <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text-mute)" }}>{r.mes}</td>
                                    <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text)" }}>{fmt(r.parcela)}</td>
                                    <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text-dim)" }}>{fmt(r.juros)}</td>
                                    <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--accent-soft)" }}>{fmt(r.amortizacao)}</td>
                                    <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--text)" }}>{fmt(r.saldo)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Custos Adicionais — sempre disponível, independente do capital */}
          <AnimatePresence>
            {veiculoValido && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: 22, marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <SectionTitle icon={Plus} n={5}>Custos Adicionais</SectionTitle>
                  {custos.length > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{fmt(totalCustosAdicionais)}</span>}
                </div>

                <PrimaryButton onClick={openModal} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
                  <Plus size={16} /> Adicionar custo
                </PrimaryButton>

                {custos.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-mute)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Custos adicionados</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {custos.map((c) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 4px", fontSize: 13 }}>
                          <span style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8 }}>
                            <CheckCircle2 size={14} color="var(--accent-soft)" /> {c.descricao}
                          </span>
                          <span style={{ color: "var(--text)", fontWeight: 700 }}>{fmt(c.valor)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 12, color: "var(--text-mute)", fontWeight: 700, textTransform: "uppercase" }}>Total dos custos</span>
                      <span style={{ fontSize: 15, color: "var(--text)", fontWeight: 800 }}>{fmt(totalCustosAdicionais)}</span>
                    </div>
                  </div>
                )}

                <Modal
                  open={modalOpen}
                  onClose={closeModal}
                  title="Adicionar novo custo"
                  footer={
                    <PrimaryButton onClick={closeModal} style={{ width: "100%" }}>Concluir</PrimaryButton>
                  }
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <Field label="Descrição do custo" val={draftDesc} set={setDraftDesc} hint="Ex.: Pneus, Revisão, Documentação…" />
                    <CurrencyField label="Valor" cents={draftCents} setCents={setDraftCents} />
                    <PrimaryButton onClick={addOrUpdateCusto} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
                      <Plus size={16} /> {editingId ? "Salvar alteração" : "Adicionar"}
                    </PrimaryButton>
                  </div>

                  {custos.length > 0 && (
                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                      {custos.map((c) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--r-sm)", fontSize: 13 }}>
                          <span style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <CheckCircle2 size={14} color="var(--accent-soft)" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.descricao}</span>
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <span style={{ color: "var(--text)", fontWeight: 700 }}>{fmt(c.valor)}</span>
                            <button onClick={() => startEdit(c)} aria-label="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", display: "flex" }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => removeCusto(c.id)} aria-label="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", display: "flex" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Modal>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 6. Resultado da Operação */}
          <AnimatePresence>
            {resultado && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: 22, marginTop: 14, borderColor: "var(--border-focus)", boxShadow: "var(--shadow-glow)" }}>
                <SectionTitle icon={PieChart} n={6}>Resultado da Operação</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                  <Kpi label="Investimento total" value={resultado.investimentoTotal} format={fmt} icon={<Briefcase size={18} />} index={0} />
                  <Kpi label="Margem potencial" value={resultado.margemPotencial} format={fmt} color="var(--accent-soft)" icon={<Target size={18} />} index={1} />
                  <Kpi label="Custos totais" value={resultado.custosTotais} format={fmt} color="var(--text-dim)" icon={<TrendingDown size={18} />} index={2} />
                  <Kpi label="Resultado líquido" value={resultado.resultadoLiquido} format={fmt} color="var(--text)" icon={<CheckCircle2 size={18} />} index={3} />
                  <Kpi label="Margem final" value={margemFinalPct ?? 0} format={(v) => `${v.toFixed(2)}%`} color="var(--accent-soft)" icon={<Ruler size={18} />} index={4} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Comparação das duas formas de venda</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                    <Kpi label="Venda pela FIPE: resultado líquido" value={resultado.resultadoLiquido} format={fmt} icon={<Coins size={18} />} index={0} />
                    <Kpi label="Venda pela FIPE: margem" value={margemFinalPct ?? 0} format={(v) => `${v.toFixed(2)}%`} color="var(--accent-soft)" icon={<Ruler size={18} />} index={1} />
                    <Kpi label="Venda pretendida: resultado líquido" value={resultadoPretendido ? resultadoPretendido.resultadoLiquido : 0} format={fmt} icon={<Coins size={18} />} index={2} />
                    <Kpi label="Venda pretendida: margem" value={margemPretendidaPct ?? 0} format={(v) => `${v.toFixed(2)}%`} color="var(--accent-soft)" icon={<Ruler size={18} />} index={3} />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 12, marginBottom: 0 }}>
                  Venda pela FIPE usa o valor FIPE ({fmt(valorVenda)}). Venda pretendida usa o valor informado ({fmt(valorVendaPretendida)}).
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 7. Checklist do veículo */}
          <AnimatePresence>
            {veiculoValido && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: 22, marginTop: 14 }}>
                <SectionTitle icon={ClipboardCheck} n={7}>Checklist do veículo</SectionTitle>
                <ChecklistVeiculo valor={checklist} onMudar={setChecklist} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 7. Exportação */}
          <AnimatePresence>
            {resultado && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}
                style={{ ...card, padding: "16px 18px", marginTop: 14 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <PrimaryButton onClick={handleExcel} disabled={isLoading} style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Download size={16} />
                    {dlState === "xlsx" ? "Gerando…" : dlState?.tipo === "xlsx" && isSuccess ? "Salvo!" : "Exportar Excel"}
                  </PrimaryButton>
                  <PrimaryButton onClick={handlePDF} disabled={isLoading} style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <FileText size={16} />
                    {dlState === "pdf" ? "Gerando…" : dlState?.tipo === "pdf" && isSuccess ? "Baixado!" : "Exportar PDF"}
                  </PrimaryButton>
                </div>
                {isErr && (
                  <div style={{ marginTop: 10, padding: "9px 13px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", color: "var(--text)", border: "1px solid var(--border-strong)" }}>
                    Erro: {dlState.err}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <SalvarNoEstoque dados={{ modelo, placa, renavam, chassi, anoFab, anoMod, cor, km, combustivel, cambio, fipe, compra, valorVenda: valorVendaPretendida, numeroMotor, categoria, potenciaMotor, portas, lugares, tipoCapital, custos, financiamento, checklist, marca, dataAquisicao }} onConcluido={resetarCalcula} />
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 30 }}>
            Simulação estimada · Margem de 15% é uma referência, não uma regra obrigatória · Não substitui avaliação profissional
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
