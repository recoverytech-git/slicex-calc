import "./calcula-car-novo.css";
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

export default function CalculaCarNovo() {
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
      <div className="cc-novo min-h-screen bg-slate-50 text-slate-800">
        <Header subtitle="Análise de Compra e Venda Veicular" />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
          <BackLink />

          <div className="flex items-start gap-4 pt-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 shadow-sm">
              <Car size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Calcula-Car</h1>
              <p className="mt-0.5 text-sm sm:text-base text-slate-500">
                Informe os dados do veículo e descubra quanto realmente sobra para você no final da operação.
              </p>
            </div>
          </div>

          {/* 1. Dados do veículo */}
          <CnCard>
            <CnTitle icon={Car} n={1}>Dados do veículo</CnTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Data de aquisição *</label>
                <input type="date" className={inputCls} value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} />
              </div>
              <CnField label="Placa do veículo" val={placa} set={setPlaca} hint="Ex: ABC1D23" aviso={avisoPlaca} onBlurExtra={verificarPlaca} />
              <CnField label="Chassi" val={chassi} set={setChassi} hint="17 caracteres" />
              <CnField label="RENAVAM" val={renavam} set={setRenavam} hint="Ex: 00123456789" />
              <CnField label="Marca" val={marca} set={setMarca} hint="Ex: Volkswagen" />
              <CnField label="Modelo do veículo" val={modelo} set={setModelo} hint="Ex: Toyota Corolla XEi 2.0" />
              <CnField label="Ano de fabricação" val={anoFab} set={setAnoFab} hint="Ex: 2020" />
              <CnField label="Ano do modelo" val={anoMod} set={setAnoMod} hint="Ex: 2021" />
              <CnField label="Cor" val={cor} set={setCor} hint="Ex: Prata" />
              <CnField label="Quilometragem (km)" val={km} set={setKm} hint="Ex: 45000" />
              <CnField label="Combustível" val={combustivel} set={setCombustivel} hint="Ex: Flex" />
              <CnField label="Câmbio" val={cambio} set={setCambio} hint="Ex: Automático" />
              <CnField label="Número do motor" val={numeroMotor} set={setNumeroMotor} hint="Ex: CHT1A2B3C" />
              <CnField label="Categoria / Carroceria" val={categoria} set={setCategoria} hint="Ex: Hatch, Sedan, SUV" />
              <CnField label="Potência do motor" val={potenciaMotor} set={setPotenciaMotor} hint="Ex: 1.0, 1.6, 1.8" />
              <div>
                <label className={labelCls}>Portas</label>
                <select className={inputCls} value={portas} onChange={(e) => setPortas(e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="2">2 portas</option>
                  <option value="4">4 portas</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Lugares</label>
                <select className={inputCls} value={lugares} onChange={(e) => setLugares(e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="5">5 lugares</option>
                  <option value="7">7 ou mais lugares</option>
                </select>
              </div>
              <CnMoney label="Valor FIPE (R$) *" valor={parseMoeda(fipeStr)} onChange={(n) => { setFipeStr(String(n)); reset?.(); }} />
              <CnMoney label="Valor de compra (R$)" valor={parseMoeda(compraStr)} onChange={(n) => { setCompraStr(String(n)); reset?.(); }} />
              <CnMoney label="Valor de venda pretendido (R$) *" valor={parseMoeda(vendaStr)} onChange={(n) => { setVendaStr(String(n)); reset?.(); }} />
            </div>
          </CnCard>

          {/* 2. Análise FIPE x Compra */}
          <AnimatePresence>
            {veiculoValido && diferenca && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard>
                  <CnTitle icon={TrendingUp} n={2}>Análise FIPE x Compra</CnTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <CnMetric label="Diferença em reais" value={fmt(diferenca.diferencaReais)} icon={Coins} />
                    <CnMetric label="Diferença percentual" value={diferenca.diferencaPercentual === null ? "—" : `${diferenca.diferencaPercentual.toFixed(2)}%`} icon={BarChart3} accent />
                    <CnMetric label="Margem de referência" value={`${MARGEM_REFERENCIA_PCT}%`} icon={Target} />
                  </div>
                  <div className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${diferenca.abaixoDaMargem ? "border-slate-200 bg-slate-50 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
                    {diferenca.abaixoDaMargem ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                    <span>
                      {diferenca.abaixoDaMargem
                        ? <>Este veículo está <b>abaixo da margem de referência de {MARGEM_REFERENCIA_PCT}%</b>. Isso não impede a análise — apenas indica que a margem obtida é menor que a referência.</>
                        : <>Este veículo está <b>dentro ou acima da margem de referência de {MARGEM_REFERENCIA_PCT}%</b>.</>}
                    </span>
                  </div>
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Origem do capital */}
          <AnimatePresence>
            {veiculoValido && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard>
                  <CnTitle icon={Wallet} n={3}>Origem do capital</CnTitle>
                  <p className="-mt-2 mb-4 text-xs text-slate-500">Selecione a origem do capital para a compra do veículo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button type="button" onClick={() => setTipoCapital("Próprio")}
                      className={`group flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${tipoCapital === "Próprio" ? "border-brand-600 bg-brand-50/60 shadow-sm ring-2 ring-brand-500/20" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tipoCapital === "Próprio" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}><Wallet size={20} /></span>
                      <span>
                        <span className={`block text-sm font-bold ${tipoCapital === "Próprio" ? "text-brand-900" : "text-slate-700"}`}>Capital próprio</span>
                        <span className="block text-xs text-slate-500">Compra realizada com recursos próprios</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => setTipoCapital("Financiamento")}
                      className={`group flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${tipoCapital === "Financiamento" ? "border-brand-600 bg-brand-50/60 shadow-sm ring-2 ring-brand-500/20" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tipoCapital === "Financiamento" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}><Landmark size={20} /></span>
                      <span>
                        <span className={`block text-sm font-bold ${tipoCapital === "Financiamento" ? "text-brand-900" : "text-slate-700"}`}>Financiamento</span>
                        <span className="block text-xs text-slate-500">Compra realizada com financiamento</span>
                      </span>
                    </button>
                  </div>
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Financiamento */}
          <AnimatePresence>
            {veiculoValido && tipoCapital === "Financiamento" && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <CnTitle icon={Landmark} n={4}>Financiamento</CnTitle>
                    <span className="-mt-4 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200">Calculadora integrada · Price e SAC</span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100/90 p-1">
                    {["Price", "SAC"].map((s) => (
                      <button key={s} type="button" onClick={() => setSistema(s)}
                        className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${sistema === s ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                        {s === "Price" ? "Sistema Price" : "Sistema SAC"}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CnMoney label="Valor financiado (R$)" valor={parseMoeda(valorBemStr)} onChange={(n) => { setValorBemStr(String(n)); reset?.(); }} />
                    <CnMoney label="Entrada (R$)" valor={parseMoeda(entradaStr)} onChange={(n) => { setEntradaStr(String(n)); reset?.(); }} />
                    <CnField label="Taxa de juros mensal (%)" val={taxaStr} set={setTaxaStr} hint="Ex: 3.9" />
                    <CnField label="Prazo (meses)" val={mesesStr} set={setMesesStr} hint="Ex: 48" />
                  </div>

                  {financiamento && (
                    <>
                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <CnMini label="Parcela" value={fmt(finRows[0]?.parcela || 0)} />
                        <CnMini label="Total de juros" value={fmt(finTotalJuros)} />
                        <CnMini label="Total pago" value={fmt(finTotalPago)} />
                        <CnMini label="Total financiado" value={fmt(pv)} />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {[
                          { id: "grafico", label: "Evolução", Icon: BarChart3 },
                          { id: "composicao", label: "Composição", Icon: Grid3x3 },
                          { id: "tabela", label: "Tabela completa", Icon: Table2 },
                        ].map(({ id, label, Icon }) => (
                          <button key={id} type="button" onClick={() => setTab(id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${tab === id ? "bg-brand-600 text-white shadow-md shadow-brand-500/25" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
                            <Icon size={14} /> {label}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        {tab === "grafico" && (
                          <motion.div key="g" {...FADE} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <SaldoAreaChart data={chartData} />
                          </motion.div>
                        )}
                        {tab === "composicao" && (
                          <motion.div key="c" {...FADE} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <ComposicaoBarChart data={chartData} />
                          </motion.div>
                        )}
                        {tab === "tabela" && (
                          <motion.div key="t" {...FADE} exit={{ opacity: 0 }} className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                            <div className="max-h-80 overflow-auto">
                              <table className="w-full border-collapse text-xs">
                                <thead className="sticky top-0 bg-slate-50">
                                  <tr>
                                    {["Mês", "Parcela", "Juros", "Amortização", "Saldo"].map((h) => (
                                      <th key={h} className="border-b border-slate-200 px-3 py-2 text-right font-bold text-slate-600">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {finRows.map((r, i) => (
                                    <tr key={r.mes} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                                      <td className="px-3 py-1.5 text-right text-slate-500">{r.mes}</td>
                                      <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{fmt(r.parcela)}</td>
                                      <td className="px-3 py-1.5 text-right text-slate-600">{fmt(r.juros)}</td>
                                      <td className="px-3 py-1.5 text-right text-brand-700">{fmt(r.amortizacao)}</td>
                                      <td className="px-3 py-1.5 text-right text-slate-800">{fmt(r.saldo)}</td>
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
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Custos adicionais */}
          <AnimatePresence>
            {veiculoValido && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <CnTitle icon={Plus} n={5}>Custos adicionais</CnTitle>
                    {custos.length > 0 && <span className="-mt-4 text-sm font-extrabold text-slate-900">{fmt(totalCustosAdicionais)}</span>}
                  </div>

                  <PrimaryButton onClick={openModal} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
                    <Plus size={16} /> Adicionar custo
                  </PrimaryButton>

                  {custos.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Custos adicionados</p>
                      <div className="flex flex-col gap-2">
                        {custos.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm shadow-sm transition hover:bg-slate-50">
                            <span className="flex items-center gap-2.5 font-semibold text-slate-700"><CheckCircle2 size={14} className="text-emerald-500" /> {c.descricao}</span>
                            <span className="font-bold text-slate-900">{fmt(c.valor)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total dos custos</span>
                        <span className="text-base font-extrabold text-slate-900">{fmt(totalCustosAdicionais)}</span>
                      </div>
                    </div>
                  )}

                  <Modal
                    open={modalOpen}
                    onClose={closeModal}
                    title="Adicionar novo custo"
                    footer={<PrimaryButton onClick={closeModal} style={{ width: "100%" }}>Concluir</PrimaryButton>}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <CnField label="Descrição do custo" val={draftDesc} set={setDraftDesc} hint="Ex.: Pneus, Revisão, Documentação…" />
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
                              <button onClick={() => startEdit(c)} aria-label="Editar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", display: "flex" }}><Pencil size={14} /></button>
                              <button onClick={() => removeCusto(c.id)} aria-label="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", display: "flex" }}><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Modal>
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 6. Resultado da operação */}
          <AnimatePresence>
            {resultado && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard className="border-2 !border-brand-300/80 bg-gradient-to-b from-blue-50/50 via-white to-white shadow-glow-md">
                  <CnTitle icon={PieChart} n={6}>Resultado da operação</CnTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <CnMini label="Investimento total" value={fmt(resultado.investimentoTotal)} />
                    <CnMini label="Margem potencial" value={fmt(resultado.margemPotencial)} />
                    <CnMini label="Custos totais" value={fmt(resultado.custosTotais)} />
                    <CnMini label="Resultado líquido" value={fmt(resultado.resultadoLiquido)} />
                    <CnMini label="Margem final" value={`${(margemFinalPct ?? 0).toFixed(2)}%`} />
                  </div>
                  <div className="mt-5 rounded-xl border border-slate-200 bg-white/90 p-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Comparação das duas formas de venda</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <CnMini label="Venda pela FIPE: resultado líquido" value={fmt(resultado.resultadoLiquido)} />
                      <CnMini label="Venda pela FIPE: margem" value={`${(margemFinalPct ?? 0).toFixed(2)}%`} />
                      <CnMini label="Venda pretendida: resultado líquido" value={fmt(resultadoPretendido ? resultadoPretendido.resultadoLiquido : 0)} />
                      <CnMini label="Venda pretendida: margem" value={`${(margemPretendidaPct ?? 0).toFixed(2)}%`} />
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[11px] text-slate-400">
                    Venda pela FIPE usa o valor FIPE ({fmt(valorVenda)}). Venda pretendida usa o valor informado ({fmt(valorVendaPretendida)}).
                  </p>
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 7. Checklist */}
          <AnimatePresence>
            {veiculoValido && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard>
                  <CnTitle icon={ClipboardCheck} n={7}>Checklist do veículo</CnTitle>
                  <ChecklistVeiculo valor={checklist} onMudar={setChecklist} />
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exportação */}
          <AnimatePresence>
            {resultado && (
              <motion.div {...ENTRADA} exit={{ opacity: 0 }}>
                <CnCard className="!p-4">
                  <div className="flex flex-wrap gap-3">
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
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Erro: {dlState.err}</div>
                  )}
                </CnCard>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <SalvarNoEstoque dados={{ modelo, placa, renavam, chassi, anoFab, anoMod, cor, km, combustivel, cambio, fipe, compra, valorVenda: valorVendaPretendida, numeroMotor, categoria, potenciaMotor, portas, lugares, tipoCapital, custos, financiamento, checklist, marca, dataAquisicao }} onConcluido={resetarCalcula} />
          </div>

          <p className="pt-2 text-center text-[11px] text-slate-400">
            Simulação estimada · Margem de 15% é uma referência, não uma regra obrigatória · Não substitui avaliação profissional
          </p>
        </main>
      </div>
    </PageTransition>
  );
}

const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";
const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-600/15";

function CnCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-layered transition-shadow duration-300 hover:shadow-layered-hover ${className}`}>
      {children}
    </div>
  );
}

function CnTitle({ icon: Icon, n, children }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 border-b border-slate-100 pb-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm"><Icon size={16} /></span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{n}. {children}</h2>
    </div>
  );
}

function CnMetric({ label, value, icon: Icon, accent }) {
  return (
    <div className={`group rounded-xl border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${accent ? "border-blue-200/70 bg-blue-50/60" : "border-slate-100 bg-slate-50/70"}`}>
      <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-brand-100 text-brand-600" : "bg-slate-200/80 text-slate-700"}`}><Icon size={16} /></div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className={`mt-1 text-xl font-extrabold tracking-tight tabular-nums ${accent ? "text-brand-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function CnMini({ label, value }) {
  return (
    <div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-[11px] font-semibold text-brand-700">{label}</span>
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-brand-600 sm:text-base">{value}</p>
    </div>
  );
}

function CnField({ label, val, set, hint, aviso, onBlurExtra, upper }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls + (upper ? " uppercase" : "")}
        placeholder={hint}
        value={val ?? ""}
        onChange={(e) => set(e.target.value)}
        onBlur={(e) => onBlurExtra && onBlurExtra(e.target.value)}
      />
      {aviso && <p className="mt-1.5 text-xs font-semibold text-red-600">{aviso}</p>}
    </div>
  );
}

function CnMoney({ label, valor, onChange }) {
  const texto = valor ? Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-semibold text-slate-400">R$</span>
        <input
          className={inputCls + " pl-10 font-semibold tabular-nums"}
          inputMode="numeric"
          placeholder="0,00"
          value={texto}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "");
            onChange(digitos ? Number(digitos) / 100 : 0);
          }}
        />
      </div>
    </div>
  );
}
