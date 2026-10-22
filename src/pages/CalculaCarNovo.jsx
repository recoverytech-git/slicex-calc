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
      <div className="cc-novo relative min-h-screen overflow-x-clip bg-slate-50 font-sans text-slate-800 antialiased">
        

<div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
<div className="glow-orb-1 absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-blue-300/35"></div>
<div className="glow-orb-2 absolute top-[38%] -right-20 h-[640px] w-[640px] rounded-full bg-cyan-200/30"></div>
<div className="glow-orb-3 absolute bottom-16 -left-24 h-[540px] w-[540px] rounded-full bg-blue-400/20"></div>
</div>

<div aria-hidden="true" className="fixed inset-0 bg-grid-pattern opacity-60 pointer-events-none -z-10"></div>

        <Header subtitle="Análise de Compra e Venda Veicular" />
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">

<section className="space-y-4" data-purpose="page-header">

<BackLink />

<div className="flex items-start gap-4 pt-1">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 shadow-sm shadow-brand-500/10">
<svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.1 2 11.4V16c0 .6.4 1 1 1h2" />
<circle cx="7" cy="17" r="2" />
<path d="M9 17h6" />
<circle cx="17" cy="17" r="2" />
</svg>
</div>
<div>
<h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Calcula-Car</h1>
<p className="text-sm sm:text-base text-slate-500 mt-0.5">Informe os dados do veículo e descubra quanto realmente sobra para você no final da operação.</p>
</div>
</div>
</section>


<section className="depth-card rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-layered hover:shadow-layered-hover hover:border-slate-300" data-purpose="vehicle-information">

<div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-6">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<rect height="14" rx="2" width="20" x="2" y="3" />
<line x1="8" x2="16" y1="21" y2="21" />
<line x1="12" x2="12" y1="17" y2="21" />
</svg>
</span>
<h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">1. DADOS DO VEÍCULO</h2>
</div>

<form className="space-y-4">

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de aquisição *</label>
<div className="relative">
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" type="date" value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} />
<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
</div>
</div>
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Placa do veículo</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 uppercase focus:outline-none" placeholder="Ex: ABC1D23" type="text" value={placa} onChange={(e) => setPlaca(e.target.value)} onBlur={(e) => verificarPlaca(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Chassi</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 uppercase focus:outline-none" placeholder="17 caracteres" type="text" value={chassi} onChange={(e) => setChassi(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">RENAVAM</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: 00123456789" type="text" value={renavam} onChange={(e) => setRenavam(e.target.value)} />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Marca</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: Volkswagen" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Modelo do veículo</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: Toyota Corolla XEi 2.0" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Ano de fabricação</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: 2020" type="text" value={anoFab} onChange={(e) => setAnoFab(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Ano do modelo</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: 2021" type="text" value={anoMod} onChange={(e) => setAnoMod(e.target.value)} />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: Prata" type="text" value={cor} onChange={(e) => setCor(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Quilometragem (km)</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 tabular-numbers focus:outline-none" placeholder="Ex: 45000" type="text" value={km} onChange={(e) => setKm(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Combustível</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: Flex" type="text" value={combustivel} onChange={(e) => setCombustivel(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Câmbio</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: Automático" type="text" value={cambio} onChange={(e) => setCambio(e.target.value)} />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Número do motor</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: CHT1A2B3C" type="text" value={numeroMotor} onChange={(e) => setNumeroMotor(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria / Carroceria</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: Hatch, Sedan, SUV" type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Potência do motor</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Ex: 1.0, 1.6, 1.8" type="text" value={potenciaMotor} onChange={(e) => setPotenciaMotor(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Portas</label>
<select className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none" value={portas} onChange={(e) => setPortas(e.target.value)}><option value="">Selecione</option><option value="2">2 Portas</option><option value="4">4 Portas</option></select>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Lugares</label>
<select className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none" value={lugares} onChange={(e) => setLugares(e.target.value)}><option value="">Selecione</option><option value="5">5 Lugares</option><option value="7">7 Lugares</option></select>
</div>
<CnMoney label="Valor FIPE (R$) *" valor={parseMoeda(fipeStr)} onChange={(n) => setFipeStr(String(n))} />
<CnMoney label="Valor de compra (R$) *" valor={parseMoeda(compraStr)} onChange={(n) => setCompraStr(String(n))} />
<CnMoney label="Valor de venda pretendido (R$) *" valor={parseMoeda(vendaStr)} onChange={(n) => setVendaStr(String(n))} />
</div>
</form>
</section>

{veiculoValido && diferenca && (<section className="depth-card rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-layered hover:shadow-layered-hover hover:border-slate-300 space-y-4" data-purpose="fipe-comparison-analysis">

<div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
</svg>
</span>
<h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">2. ANÁLISE FIPE X COMPRA</h2>
</div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

<div className="group rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-center transition-all duration-300 hover:bg-slate-50 hover:shadow-sm hover:-translate-y-0.5">
<div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100/70 text-brand-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<rect height="12" rx="2" width="20" x="2" y="6" />
<circle cx="12" cy="12" r="2" />
<path d="M6 12h.01M18 12h.01" />
</svg>
</div>
<span className="text-xs font-medium text-slate-500">Diferença em reais</span>
<p className="mt-1 text-xl font-bold tracking-tight text-slate-900 tabular-numbers">{fmt(diferenca.diferencaReais)}</p>
</div>

<div className="group rounded-xl border border-blue-200/70 bg-gradient-to-b from-blue-50/70 to-blue-50/30 p-4 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-300 hover:-translate-y-0.5">
<div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<line x1="18" x2="18" y1="20" y2="10" />
<line x1="12" x2="12" y1="20" y2="4" />
<line x1="6" x2="6" y1="20" y2="14" />
</svg>
</div>
<span className="text-xs font-medium text-slate-500">Diferença percentual</span>
<p className="mt-1 text-xl font-extrabold tracking-tight text-brand-600 tabular-numbers">{diferenca.diferencaPercentual === null ? "—" : `${diferenca.diferencaPercentual.toFixed(2)}%`}</p>
</div>

<div className="group rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-center transition-all duration-300 hover:bg-slate-50 hover:shadow-sm hover:-translate-y-0.5">
<div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/80 text-slate-700 shadow-sm transition-transform duration-300 group-hover:scale-110">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<circle cx="12" cy="12" r="10" />
<circle cx="12" cy="12" r="6" />
<circle cx="12" cy="12" r="2" />
</svg>
</div>
<span className="text-xs font-medium text-slate-500">Margem de referência</span>
<p className="mt-1 text-xl font-bold tracking-tight text-slate-800 tabular-numbers">{MARGEM_REFERENCIA_PCT}%</p>
</div>
</div>

<div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm shadow-sm ${diferenca.abaixoDaMargem ? "border-slate-200 bg-slate-50 text-slate-700" : "border-emerald-200/90 bg-emerald-50/80 text-emerald-900"}`}>
<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
<polyline points="20 6 9 17 4 12" />
</svg>
</div>
<p className="font-medium">{diferenca.abaixoDaMargem ? <>Este veículo está <span className="font-bold">abaixo da margem de referência de {MARGEM_REFERENCIA_PCT}%</span>. Isso não impede a análise.</> : <>Este veículo está <span className="font-bold">dentro ou acima da margem de referência de {MARGEM_REFERENCIA_PCT}%</span>.</>}</p>
</div>
</section>)}
{veiculoValido && (<section className="depth-card rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-layered hover:shadow-layered-hover hover:border-slate-300 space-y-4" data-purpose="capital-source-selector">

<div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<rect height="16" rx="2" width="20" x="2" y="4" />
<path d="M7 15h0M2 9.5h20" />
</svg>
</span>
<div>
<h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">3. ORIGEM DO CAPITAL</h2>
<p className="text-xs text-slate-500">Selecione a origem do capital para a compra do veículo</p>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

<button type="button" onClick={() => setTipoCapital("Próprio")} className={tipoCapital === "Próprio" ? "group relative flex items-center gap-4 rounded-xl border-2 border-brand-600 bg-gradient-to-br from-brand-50/60 to-blue-50/30 p-4 text-left shadow-sm shadow-brand-500/10 ring-2 ring-brand-500/20 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none" : "group relative flex items-center gap-4 rounded-xl border border-slate-200/90 p-4 text-left transition-all duration-300 hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-sm hover:-translate-y-0.5 focus:outline-none"}><div className={tipoCapital === "Próprio" ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 shadow-sm"}><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
<path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
<path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
</svg></div><div className="flex-1"><div className="flex items-center justify-between"><h3 className={`text-sm font-bold ${tipoCapital === "Próprio" ? "text-brand-900" : "text-slate-700"}`}>Capital Próprio</h3>{tipoCapital === "Próprio" && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm shadow-brand-600/40"><svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
<polyline points="20 6 9 17 4 12" />
</svg></span>}</div><p className={`text-xs font-medium ${tipoCapital === "Próprio" ? "text-brand-700" : "text-slate-500"}`}>Compra realizada com recursos próprios</p></div></button>

<button type="button" onClick={() => setTipoCapital("Financiamento")} className={tipoCapital === "Financiamento" ? "group relative flex items-center gap-4 rounded-xl border-2 border-brand-600 bg-gradient-to-br from-brand-50/60 to-blue-50/30 p-4 text-left shadow-sm shadow-brand-500/10 ring-2 ring-brand-500/20 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none" : "group relative flex items-center gap-4 rounded-xl border border-slate-200/90 p-4 text-left transition-all duration-300 hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-sm hover:-translate-y-0.5 focus:outline-none"}><div className={tipoCapital === "Financiamento" ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 shadow-sm"}><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<line x1="3" x2="21" y1="21" y2="21" />
<line x1="3" x2="21" y1="10" y2="10" />
<polyline points="5 6 12 3 19 6" />
<line x1="4" x2="4" y1="10" y2="21" />
<line x1="20" x2="20" y1="10" y2="21" />
<line x1="8" x2="8" y1="14" y2="17" />
<line x1="12" x2="12" y1="14" y2="17" />
<line x1="16" x2="16" y1="14" y2="17" />
</svg></div><div className="flex-1"><div className="flex items-center justify-between"><h3 className={`text-sm font-bold ${tipoCapital === "Financiamento" ? "text-brand-900" : "text-slate-700"}`}>Financiamento</h3>{tipoCapital === "Financiamento" && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm shadow-brand-600/40"><svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
<polyline points="20 6 9 17 4 12" />
</svg></span>}</div><p className={`text-xs font-medium ${tipoCapital === "Financiamento" ? "text-brand-700" : "text-slate-500"}`}>Compra realizada com financiamento</p></div></button>
</div>
</section>)}
{veiculoValido && tipoCapital === "Financiamento" && (<section className="depth-card rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-layered hover:shadow-layered-hover hover:border-slate-300 space-y-6" data-purpose="financing-details-and-chart">

<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
<div className="flex items-center gap-2.5">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<rect height="14" rx="2" ry="2" width="20" x="2" y="7" />
<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
</svg>
</span>
<h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">4. FINANCIAMENTO</h2>
</div>
<span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-slate-600 ring-1 ring-inset ring-slate-200 shadow-sm">
          CALCULADORA INTEGRADA • PRICE E SAC
        </span>
</div>

<div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100/90 p-1 text-center font-medium shadow-inner">{["Price", "SAC"].map((s) => (<button key={s} type="button" onClick={() => setSistema(s)} className={`rounded-lg py-2 text-xs transition-all duration-200 ${sistema === s ? "bg-white font-bold text-brand-700 shadow-sm" : "font-semibold text-slate-600 hover:text-slate-900"}`}>{s === "Price" ? "Sistema Price" : "Sistema SAC"}</button>))}</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<CnMoney label="Valor financiado (R$)" valor={parseMoeda(valorBemStr)} onChange={(n) => setValorBemStr(String(n))} />
<CnMoney label="Entrada (R$)" valor={parseMoeda(entradaStr)} onChange={(n) => setEntradaStr(String(n))} />
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Taxa de juros mensal (%)</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-bold text-slate-800 tabular-numbers focus:outline-none" type="text" value={taxaStr} onChange={(e) => setTaxaStr(e.target.value)} />
</div>
<div>
<label className="block text-xs font-semibold text-slate-600 mb-1.5">Prazo (meses)</label>
<input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-bold text-slate-800 tabular-numbers focus:outline-none" type="text" value={mesesStr} onChange={(e) => setMesesStr(e.target.value)} />
</div>
</div>

<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
<div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<rect height="18" rx="2" width="18" x="3" y="4" />
<line x1="16" x2="16" y1="2" y2="6" />
<line x1="8" x2="8" y1="2" y2="6" />
<line x1="3" x2="21" y1="10" y2="10" />
</svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Parcela</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(finRows[0]?.parcela || 0)}</p>
</div>

<div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
<polyline points="17 6 23 6 23 12" />
</svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Total de juros</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(finTotalJuros)}</p>
</div>

<div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<rect height="16" rx="2" width="22" x="1" y="4" />
<line x1="1" x2="23" y1="10" y2="10" />
</svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Total pago</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(finTotalPago)}</p>
</div>

<div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l10 5H2l10-5z" />
</svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Total financiado</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(pv)}</p>
</div></div>

<div className="pt-2 border-t border-slate-100 space-y-3">
<div className="flex flex-wrap items-center justify-between gap-2">
<div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs shadow-inner">{[{ id: "grafico", label: "Evolução", Icon: BarChart3 }, { id: "composicao", label: "Composição", Icon: Grid3x3 }, { id: "tabela", label: "Tabela completa", Icon: Table2 }].map(({ id, label, Icon }) => (<button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${tab === id ? "bg-white font-bold text-brand-700 shadow-sm" : "font-medium text-slate-600 hover:text-slate-900"}`}><Icon size={14} />{label}</button>))}</div>
<span className="text-[11px] font-medium text-slate-400">Curva de amortização do saldo</span>
</div>

{tab === "grafico" && <CnAreaChart rows={finRows} />}{tab === "composicao" && <CnBars rows={finRows} />}{tab === "tabela" && <CnTable rows={finRows} />}
</div>
</section>)}
{veiculoValido && (<section className="depth-card rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-layered hover:shadow-layered-hover hover:border-slate-300 space-y-4" data-purpose="additional-costs-calculator">

<div className="flex items-center justify-between border-b border-slate-100 pb-4">
<div className="flex items-center gap-2.5">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<line x1="12" x2="12" y1="5" y2="19" />
<line x1="5" x2="19" y1="12" y2="12" />
</svg>
</span>
<h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">5. CUSTOS ADICIONAIS</h2>
</div>
{custos.length > 0 && <span className="text-sm font-extrabold text-slate-900 tabular-numbers">{fmt(totalCustosAdicionais)}</span>}
</div>

<div>
<button onClick={openModal} className="shimmer-btn flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-brand-500/25 transition duration-200 hover:bg-brand-700" type="button">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<line x1="12" x2="12" y1="5" y2="19" />
<line x1="5" x2="19" y1="12" y2="12" />
</svg>
          Adicionar custo
        </button>
</div>

{custos.length > 0 && (
<div className="pt-2">
<span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">CUSTOS ADICIONADOS</span>
<div className="flex flex-col gap-2">{custos.map((c) => (
<div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs shadow-sm transition hover:bg-slate-50 sm:text-sm">
<span className="flex items-center gap-2.5 font-semibold text-slate-700"><CheckCircle2 size={14} className="text-emerald-500" /> {c.descricao}</span>
<span className="flex items-center gap-3"><span className="font-bold text-slate-900">{fmt(c.valor)}</span><button type="button" onClick={() => startEdit(c)} aria-label="Editar" className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button><button type="button" onClick={() => removeCusto(c.id)} aria-label="Excluir" className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button></span>
</div>))}</div>
<div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs sm:text-sm"><span className="font-extrabold uppercase text-slate-900">TOTAL DOS CUSTOS</span><span className="text-base font-extrabold text-slate-900 tabular-numbers">{fmt(totalCustosAdicionais)}</span></div>
</div>)}
<Modal open={modalOpen} onClose={closeModal} title="Adicionar novo custo" footer={<PrimaryButton onClick={closeModal} style={{ width: "100%" }}>Concluir</PrimaryButton>}>
<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
<CnField label="Descrição do custo" val={draftDesc} set={setDraftDesc} hint="Ex.: Pneus, Revisão, Documentação…" />
<CnMoney label="Valor" valor={draftCents / 100} onChange={(n) => setDraftCents(Math.round(n * 100))} />
<PrimaryButton onClick={addOrUpdateCusto} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}><Plus size={16} /> {editingId ? "Salvar alteração" : "Adicionar"}</PrimaryButton>
</div>
</Modal>
</section>)}
{resultado && (<section className="depth-card rounded-2xl border-2 border-brand-300/80 bg-gradient-to-b from-blue-50/50 via-white to-white p-6 shadow-glow-md hover:shadow-glow-lg space-y-6" data-purpose="final-deal-outcome-summary">

<div className="flex items-center gap-2.5 border-b border-brand-100/90 pb-4">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md shadow-brand-600/30">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
<circle cx="12" cy="12" r="10" />
<polyline points="12 6 12 12 16 14" />
</svg>
</span>
<h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">6. RESULTADO DA OPERAÇÃO</h2>
</div>

<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
<div className="group rounded-xl border border-brand-200/90 bg-white/80 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-400 hover:-translate-y-1">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm transition-transform duration-200 group-hover:scale-110">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l10 5H2l10-5z" /></svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Investimento total</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(resultado.investimentoTotal)}</p>
</div>

<div className="group rounded-xl border border-brand-200/90 bg-white/80 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-400 hover:-translate-y-1">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm transition-transform duration-200 group-hover:scale-110">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Margem potencial</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(resultado.margemPotencial)}</p>
</div>

<div className="group rounded-xl border border-brand-200/90 bg-white/80 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-400 hover:-translate-y-1">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm transition-transform duration-200 group-hover:scale-110">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Custos totais</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(resultado.custosTotais)}</p>
</div>

<div className="group rounded-xl border border-brand-200/90 bg-white/80 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-400 hover:-translate-y-1">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm transition-transform duration-200 group-hover:scale-110">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Resultado líquido</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{fmt(resultado.resultadoLiquido)}</p>
</div>

<div className="group col-span-2 sm:col-span-1 rounded-xl border border-brand-200/90 bg-white/80 p-3.5 text-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-400 hover:-translate-y-1">
<div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 shadow-sm transition-transform duration-200 group-hover:scale-110">
<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
</div>
<span className="text-[11px] font-semibold text-brand-700">Margem final</span>
<p className="mt-0.5 text-sm sm:text-base font-extrabold text-brand-600 tabular-numbers">{`${(margemFinalPct ?? 0).toFixed(2)}%`}</p>
</div></div>

<div className="rounded-xl border border-slate-200/90 bg-white/90 p-4 space-y-3 shadow-sm backdrop-blur-sm"><div className="flex items-center justify-between">
<span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
  COMPARAÇÃO DAS DUAS FORMAS DE VENDA
</span>
<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 rounded-md px-2 py-0.5 shadow-inner">Cenários de Saída</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
<div className="rounded-xl border border-blue-100/90 bg-gradient-to-b from-blue-50/50 to-blue-50/20 p-3 text-center transition-all duration-200 hover:bg-blue-50/70 hover:shadow-sm hover:-translate-y-0.5">
<div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-brand-600">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
</div>
<span className="text-[10px] text-brand-700 font-semibold">Venda FIPE LIQUIDO</span>
<p className="text-sm font-extrabold text-brand-600 tabular-numbers">{fmt(resultado.resultadoLiquido)}</p>
</div>

<div className="rounded-xl border border-blue-100/90 bg-gradient-to-b from-blue-50/50 to-blue-50/20 p-3 text-center transition-all duration-200 hover:bg-blue-50/70 hover:shadow-sm hover:-translate-y-0.5">
<div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-brand-600">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
</div>
<span className="text-[10px] text-brand-700 font-semibold">Venda pela FIPE: margem</span>
<p className="text-sm font-extrabold text-brand-600 tabular-numbers">{`${(margemFinalPct ?? 0).toFixed(2)}%`}</p>
</div>

<div className="rounded-xl border border-blue-100/90 bg-gradient-to-b from-blue-50/50 to-blue-50/20 p-3 text-center transition-all duration-200 hover:bg-blue-50/70 hover:shadow-sm hover:-translate-y-0.5">
<div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-brand-600">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
</div>
<span className="text-[10px] text-brand-700 font-semibold">Venda PRETENDIDA LIQUIDO</span>
<p className="text-sm font-extrabold text-brand-600 tabular-numbers">{fmt(resultadoPretendido ? resultadoPretendido.resultadoLiquido : 0)}</p>
</div>

<div className="rounded-xl border border-blue-100/90 bg-gradient-to-b from-blue-50/50 to-blue-50/20 p-3 text-center transition-all duration-200 hover:bg-blue-50/70 hover:shadow-sm hover:-translate-y-0.5">
<div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-brand-600">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
</div>
<span className="text-[10px] text-brand-700 font-semibold">Venda pretendida: margem</span>
<p className="text-sm font-extrabold text-brand-600 tabular-numbers">{`${(margemPretendidaPct ?? 0).toFixed(2)}%`}</p>
</div></div>
<p className="text-[11px] text-slate-400 text-center pt-1 font-medium">
  Venda pela FIPE usa o valor FIPE ({fmt(valorVenda)}). Venda pretendida usa o valor informado ({fmt(valorVendaPretendida)}).
</p></div>
</section>)}
{veiculoValido && (<section className="depth-card rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm p-6 shadow-layered hover:shadow-layered-hover hover:border-slate-300 space-y-6" data-purpose="vehicle-inspection-checklist">
<div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 shadow-sm">
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
<polyline points="14 2 14 8 20 8" />
<line x1="16" x2="8" y1="13" y2="13" />
<line x1="16" x2="8" y1="17" y2="17" />
<polyline points="10 9 9 9 8 9" />
</svg>
</span>
<h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">7. CHECKLIST DO VEÍCULO</h2>
</div>
<ChecklistVeiculo valor={checklist} onMudar={setChecklist} />
</section>)}
{resultado && (
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
<PrimaryButton onClick={handleExcel} disabled={isLoading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
<polyline points="7 10 12 15 17 10" />
<line x1="12" x2="12" y1="15" y2="3" />
</svg>
{dlState === "xlsx" ? "Gerando…" : dlState?.tipo === "xlsx" && isSuccess ? "Salvo!" : "Exportar Excel"}
</PrimaryButton>
<PrimaryButton onClick={handlePDF} disabled={isLoading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
<polyline points="14 2 14 8 20 8" />
<line x1="12" x2="12" y1="18" y2="12" />
<line x1="9" x2="15" y1="15" y2="15" />
</svg>
{dlState === "pdf" ? "Gerando…" : dlState?.tipo === "pdf" && isSuccess ? "Baixado!" : "Exportar PDF"}
</PrimaryButton>
{isErr && <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Erro: {dlState.err}</div>}
</div>)}
<div className="pt-2"><SalvarNoEstoque dados={{ modelo, placa, renavam, chassi, anoFab, anoMod, cor, km, combustivel, cambio, fipe, compra, valorVenda: valorVendaPretendida, numeroMotor, categoria, potenciaMotor, portas, lugares, tipoCapital, custos, financiamento, checklist, marca, dataAquisicao }} onConcluido={resetarCalcula} /></div>
<p className="pt-2 text-center text-xs text-slate-400">Simulação estimada · Margem de 15% é uma referência, não uma regra obrigatória · Não substitui avaliação profissional</p>

<footer className="border-t border-slate-200/80 pt-8 pb-12 mt-12 space-y-6" data-purpose="institutional-footer">

<div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
<div className="flex items-center gap-1.5 transition-colors hover:text-slate-600">
<svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect height="11" rx="2" ry="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
<span className="">Criptografia SSL 256-bit</span>
</div>
<span className="text-slate-300">•</span>
<div className="flex items-center gap-1.5 transition-colors hover:text-slate-600">
<svg className="h-4 w-4 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
<span className="">Ambiente Seguro</span>
</div>
<span className="text-slate-300">•</span>
<div className="flex items-center gap-1.5 transition-colors hover:text-slate-600">
<svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
<span className="">Conformidade LGPD &amp; BACEN</span>
</div>
</div>

<div className="text-center">
<p className="text-xs text-slate-400">
          © 2025 Calcula.car Tecnologia Automotiva S.A. Todos os direitos reservados.
        </p>
</div>
</footer>

        </main>
      </div>
    </PageTransition>
  );
}

const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";
const inputCls = "tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none";

function CnField({ label, val, set, hint }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} placeholder={hint} value={val ?? ""} onChange={(e) => set(e.target.value)} />
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
        <input className="tactile-input w-full rounded-xl border-slate-200 bg-slate-50/60 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-800 tabular-numbers focus:outline-none"
          inputMode="numeric" placeholder="0,00" value={texto}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "");
            onChange(digitos ? Number(digitos) / 100 : 0);
          }} />
      </div>
    </div>
  );
}

function CnAreaChart({ rows }) {
  if (!rows || !rows.length) return null;
  const max = Math.max(...rows.map((r) => r.saldo), 1);
  const x0 = 60, x1 = 670, yTop = 15, yBot = 145;
  const px = (i) => (rows.length === 1 ? x0 : x0 + (i * (x1 - x0)) / (rows.length - 1));
  const py = (v) => yBot - (v / max) * (yBot - yTop);
  const pts = rows.map((r, i) => [px(i), py(r.saldo)]);
  const linha = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${linha} L${x1},${yBot} L${x0},${yBot} Z`;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => ({ y: py(max * f), v: max * f }));
  const rotulo = (v) => (v >= 1000 ? `R$${Math.round(v / 1000)}k` : `R$${Math.round(v)}`);
  return (
    <div className="relative w-full rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-50/20 p-4 shadow-inner">
      <div className="h-44 w-full">
        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 160">
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={50} x2={680} y1={t.y} y2={t.y} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
              <text x={10} y={t.y + 3} fill="#64748b" fontFamily="monospace" fontSize={11} fontWeight={600}>{rotulo(t.v)}</text>
            </g>
          ))}
          <path d={area} fill="url(#chartGradient)" />
          <path d={linha} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 0 || i === pts.length - 1 ? 5 : 3} fill="#2563eb" stroke="#ffffff" strokeWidth={2.5} />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-between px-12 font-mono text-xs font-bold text-slate-500">
        <span>1</span>
        <span>{rows.length}</span>
      </div>
    </div>
  );
}

function CnBars({ rows }) {
  if (!rows || !rows.length) return null;
  const max = Math.max(...rows.map((r) => r.parcela), 1);
  const n = rows.length;
  const largura = Math.max(4, Math.min(28, 600 / n - 4));
  return (
    <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-50/20 p-4 shadow-inner">
      <svg className="h-44 w-full" preserveAspectRatio="none" viewBox="0 0 700 160">
        {rows.map((r, i) => {
          const x = 50 + (i * 620) / n;
          const hA = (r.amortizacao / max) * 140;
          const hJ = (r.juros / max) * 140;
          return (
            <g key={r.mes}>
              <rect x={x} y={145 - hA} width={largura} height={hA} rx={2} fill="#2563eb" />
              <rect x={x} y={145 - hA - hJ} width={largura} height={hJ} rx={2} fill="#94a3b8" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Amortização</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Juros</span>
      </div>
    </div>
  );
}

function CnTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
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
            {rows.map((r, i) => (
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
    </div>
  );
}
