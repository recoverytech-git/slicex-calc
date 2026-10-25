// Layout gerado a partir do design (HTML e DESIGN.md) da ficha publica
// sem-rascunho: dados de cliente externo; nada fica guardado no navegador
import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Clock3, ShieldCheck, XCircle, Loader2, X } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { SECOES, FICHA_VAZIA } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos, cpfValido } from "../lib/mascaras";
import { ESTILOS_PREENCHER } from "./preencher-estilos";
import logo from "../assets/logo.png";
import { useMarca } from "../lib/marca";

const OBRIGATORIOS = ["nome", "cpf", "telefone", "cnh", "profissao", "renda", "consulta_scr"];
const CHAVES_ENVIO = SECOES.flatMap((s) => s.campos.map((c) => c[0]));
const PADROES = {"estado_civil": "Casado(a)", "regime": "CLT (Carteira)"};
const BODY_CLASS = "bg-background font-body text-on-surface relative min-h-screen selection:bg-primary-fixed selection:text-on-primary-fixed antialiased flex flex-col overflow-x-hidden";
const CTX = createContext(null);

const dinheiro = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mascData = (d) => (d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`);
const mascCep = (d) => (d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5, 8)}`);
const MASC = { cpf: "cpf", telefone: "tel", ref_pessoal_tel: "tel", ref_emp_tel: "tel", contato_empresa: "telFmt", cep: "cep", nascimento: "data", admissao: "data", renda: "money", renda_adicional: "money", consulta_scr: "bool" };

function faltando(f) {
  return OBRIGATORIOS.filter((k) => {
    const v = f[k];
    if (k === "cpf") return !cpfValido(v || "");
    if (k === "telefone") return soDigitos(v || "").length < 10;
    if (k === "cnh") return v !== true && v !== false;
    if (k === "consulta_scr") return v !== true;
    if (k === "renda") return !(Number(v) > 0);
    return !(typeof v === "string" ? v.trim() : v);
  });
}

function calcularEstabilidade(admissao, hoje) {
  const d = soDigitos(admissao || "");
  if (d.length !== 8) return { pct: 0, texto: "—" };
  const dia = Number(d.slice(0, 2)), mes = Number(d.slice(2, 4)), ano = Number(d.slice(4, 8));
  const inicio = new Date(ano, mes - 1, dia);
  if (Number.isNaN(inicio.getTime()) || inicio.getDate() !== dia || inicio > hoje) return { pct: 0, texto: "Data inválida" };
  const meses = Math.max((hoje.getFullYear() - ano) * 12 + (hoje.getMonth() - (mes - 1)) - (hoje.getDate() < dia ? 1 : 0), 0);
  const anos = meses / 12;
  const pct = anos < 1 ? 25 : anos < 3 ? 50 : anos < 7 ? 75 : 100;
  const inteiros = Math.floor(anos);
  const texto = inteiros >= 1 ? `${inteiros} ${inteiros === 1 ? "ano" : "anos"}` : `${meses} ${meses === 1 ? "mês" : "meses"}`;
  return { pct, texto };
}

function CabecalhoPublico({ nome }) {
  const marca = useMarca();
  const logoSrc = marca?.logo_claro || logo;
  const logoPadrao = logoSrc === logo;
  return (
    <div style={{ background: "var(--bg-header)", padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
      <img src={logoSrc} alt="SliceX.calc" style={{ height: 38, width: "auto", display: "block", filter: logoPadrao ? "invert(1)" : "none" }} />
      <div style={{ borderLeft: "1px solid var(--border-strong)", paddingLeft: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{nome || "Ficha cadastral"}</div>
        <div style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 2 }}>Preenchimento de ficha financeira</div>
      </div>
    </div>
  );
}

function TelaSucesso() {
  const etapas = [
    { t: "1. Ficha Enviada", d: "Dados cadastrados e enviados com sucesso.", s: "feito" },
    { t: "2. Análise da Loja", d: "Sua ficha já está em análise com o nosso time.", s: "atual" },
    { t: "3. Retorno Direto", d: "Em breve retornaremos o contato por WhatsApp.", s: "futuro" },
  ];
  const estilo = { feito: "border-secondary/40 bg-secondary-container/15", atual: "border-primary/40 bg-primary-fixed/30", futuro: "border-outline-variant/40 bg-surface-container-low opacity-70" };
  return (
    <div className="mx-auto mt-10 w-full max-w-md px-4">
      <div className="relative overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[#38bdf8] to-primary" />
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-secondary/20 blur-xl" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container/40 ring-1 ring-secondary/30"><CheckCircle2 size={34} className="text-secondary" /></span>
        </div>
        <h2 className="font-headline text-2xl font-extrabold text-on-surface">Ficha enviada com sucesso!</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-on-surface-variant">A equipe da loja recebeu os seus dados e entrará em contato.<br />Você já pode fechar esta página.</p>
        <div className="my-6 h-px bg-outline-variant/40" />
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Etapas da sua proposta</span>
        <div className="mt-3 grid grid-cols-3 gap-2 text-left">
          {etapas.map((e) => (
            <div key={e.t} className={`rounded-xl border p-2.5 ${estilo[e.s]}`}>
              <div className="flex items-center gap-1.5">
                {e.s === "feito" ? <CheckCircle2 size={12} className="text-secondary" /> : <span className={`h-2 w-2 rounded-full ${e.s === "atual" ? "bg-primary" : "bg-outline"}`} />}
                <span className="font-label text-[10px] font-bold text-on-surface">{e.t}</span>
              </div>
              <p className="mt-1 font-body text-[10px] leading-snug text-on-surface-variant">{e.d}</p>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => window.close()} className="mt-7 inline-flex h-10 items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-5 font-label text-xs font-bold text-on-surface shadow-sm transition hover:bg-surface-container">
          <X size={14} /> Fechar Janela
        </button>
      </div>
    </div>
  );
}

function Slot({ k, id, cls, ph, type }) {
  const { form, setForm, invalidos } = useContext(CTX);
  const tipo = MASC[k] ?? "texto";
  const classe = cls + (invalidos.includes(k) ? " !border-error" : "");
  const v = form[k];
  if (tipo === "bool") return <input id={id} type="checkbox" checked={v === true} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} className={cls} />;
  if (tipo === "money") {
    return <input id={id} inputMode="numeric" placeholder={ph} className={classe} value={dinheiro(v)}
      onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setForm({ ...form, [k]: d ? Number(d) / 100 : 0 }); }} />;
  }
  let valor = v ?? "";
  let set = (t) => setForm({ ...form, [k]: t });
  if (tipo === "cpf") { const d = soDigitos(v || "").slice(0, 11); valor = d ? formatarCPF(d) : ""; set = (t) => setForm({ ...form, [k]: soDigitos(t).slice(0, 11) }); }
  if (tipo === "tel") { const d = soDigitos(v || "").slice(0, 11); valor = d ? formatarTelefone(d) : ""; set = (t) => setForm({ ...form, [k]: soDigitos(t).slice(0, 11) }); }
  if (tipo === "telFmt") { set = (t) => { const d = soDigitos(t).slice(0, 11); setForm({ ...form, [k]: d ? formatarTelefone(d) : "" }); }; }
  if (tipo === "cep") { valor = mascCep(soDigitos(v || "").slice(0, 8)); set = (t) => setForm({ ...form, [k]: soDigitos(t).slice(0, 8) }); }
  if (tipo === "data") { valor = mascData(soDigitos(v || "").slice(0, 8)); set = (t) => setForm({ ...form, [k]: mascData(soDigitos(t).slice(0, 8)) }); }
  return <input id={id} type={type} placeholder={ph} className={classe} value={valor} onChange={(e) => set(e.target.value)} />;
}

function SlotSelect({ k, id, cls, opcoes }) {
  const { form, setForm } = useContext(CTX);
  return (
    <select id={id} className={cls} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
      {opcoes.map((o) => <option key={o.t} value={o.t}>{o.t}</option>)}
    </select>
  );
}

function GrupoCnh() {
  const { form, setForm } = useContext(CTX);
  return (
    <div style={{ display: "flex", flexWrap: "nowrap", width: "100%", gap: 4, padding: 4, borderRadius: 14, background: "#eff4ff", border: "1px solid #d3e4fe" }}>
      {[[true, "Sim", "#10b981"], [false, "Não", "#ba1a1a"]].map(([v, rotulo, cor]) => {
        const ativo = form.cnh === v;
        return (
          <button key={rotulo} type="button" onClick={() => setForm({ ...form, cnh: v })}
            style={{ flex: "1 1 0", whiteSpace: "nowrap", padding: "8px 16px", borderRadius: 10, border: 0, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s ease",
              background: ativo ? cor : "transparent",
              color: ativo ? "#fff" : "#434655",
              boxShadow: ativo ? `0 2px 6px ${cor}55` : "none" }}>
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

function SlotSubmit({ cls, children }) {
  const { enviar, enviando } = useContext(CTX);
  return <button type="button" onClick={enviar} disabled={enviando} className={cls + (enviando ? " opacity-60" : "")}>{children}</button>;
}

export default function PreencherFicha() {
  const { token } = useParams();
  const [estado, setEstado] = useState("carregando"); // carregando | valido | invalido | expirado | preenchido | enviado
  const [form, setForm] = useState({ ...FICHA_VAZIA, ...PADROES });
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [orgNome, setOrgNome] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado) { setEstado("invalido"); return; }
    supabase.rpc("obter_link_ficha", { p_token: token }).then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setEstado("invalido"); return; }
      if (row.status === "preenchido") { setEstado("preenchido"); return; }
      if (new Date(row.expira_em) < new Date()) { setEstado("expirado"); return; }
      setOrgNome(row.org_nome || "");
      setEstado("valido");
    });
  }, [token]);

  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  const hoje = useState(() => new Date())[0];
  const estabilidade = calcularEstabilidade(form.admissao, hoje);
  const invalidos = tentou ? faltando(form) : [];

  const enviar = async () => {
    setMsg(null);
    if (faltando(form).length) {
      setTentou(true);
      setMsg("Preencha os campos obrigatórios destacados para enviar.");
      return;
    }
    setEnviando(true);
    const dados = Object.fromEntries(CHAVES_ENVIO.map((k) => [k, form[k]]));
    const { error } = await supabase.rpc("salvar_ficha_cliente", { p_token: token, p_dados: dados });
    setEnviando(false);
    if (error) { setMsg(error.message); return; }
    setEstado("enviado");
  };

  const ctx = { form, setForm, invalidos, enviar, enviando };

  const telaFinal = (icone, cor, titulo, texto) => (
    <div className="mx-auto my-16 max-w-lg rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ color: cor, background: `${cor}1a` }}>{icone}</div>
      <h2 className="font-headline text-xl font-extrabold text-on-surface">{titulo}</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-on-surface-variant">{texto}</p>
    </div>
  );

  const conteudo =
    estado === "carregando" ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary" /></div>
    : estado === "invalido" ? telaFinal(<XCircle size={30} />, "#ba1a1a", "Link inválido", "Este endereço não existe ou foi copiado de forma incompleta. Peça um novo link ao atendente.")
    : estado === "expirado" ? telaFinal(<Clock3 size={30} />, "#b45309", "Link expirado", "Este link já não está mais disponível. Peça um novo ao atendente.")
    : estado === "preenchido" ? telaFinal(<ShieldCheck size={30} />, "#004ac6", "Ficha já enviada", "Os seus dados já foram recebidos. Obrigado!")
    : estado === "enviado" ? <TelaSucesso />
    : null;

  return (
    <PageTransition>
      <CTX.Provider value={ctx}>
        <div className={"cc-novo " + BODY_CLASS}>
          <style>{ESTILOS_PREENCHER}</style>
          

<div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
<div className="absolute -top-44 left-1/2 -translate-x-1/2 w-[1150px] h-[550px] bg-gradient-to-br from-primary/15 via-[#2563eb]/10 to-[#38bdf8]/10 rounded-full blur-[140px] animate-orb-1"></div>
<div className="absolute top-72 -left-48 w-[680px] h-[580px] bg-gradient-to-tr from-secondary-fixed/35 via-[#38bdf8]/15 to-transparent rounded-full blur-[160px] animate-orb-2"></div>
<div className="absolute top-1/2 -right-48 w-[740px] h-[620px] bg-gradient-to-bl from-primary-fixed/60 via-[#2563eb]/15 to-transparent rounded-full blur-[170px] animate-orb-3"></div>
</div>

<CabecalhoPublico nome={orgNome} />

          {estado === "valido" ? (
            <main className="relative z-10 flex-1 w-full pt-4 pb-12">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
<div className="flex items-center gap-2">
</div>
</div>

<div className="fade-in-stagger delay-100 relative overflow-hidden rounded-3xl bg-surface-container-lowest border border-surface-container p-6 lg:p-7 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 group">
<div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 via-secondary/5 to-transparent pointer-events-none group-hover:opacity-80 transition-opacity"></div>
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">

<div className="space-y-2">
<div className="flex flex-wrap items-center gap-2.5">
<span className="beacon-active inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary-fixed/60 text-primary text-[11px] font-label font-bold uppercase tracking-wider shadow-sm transition-all"><span className="material-symbols-outlined text-[14px]">fact_check</span>Aprovação de crédito.</span>
</div>
<h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-on-surface tracking-tight group-hover:text-primary transition-colors duration-300">
            Ficha Cadastral &amp; Financeira.</h1>
<p className="font-body text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
            Visão consolidada para aprovação simultânea em 14 mesas bancárias. Preenchimento rápido e fácil..
          </p>
</div>

</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">



<section className="fade-in-stagger delay-200 bg-surface-container-lowest rounded-3xl p-6 sm:p-7 border border-surface-container shadow-xl shadow-primary/5 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 space-y-6 h-full flex flex-col">

<div className="flex items-center justify-between pb-4 border-b border-surface-container">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-sm bg-secondary-container/50 text-secondary transition-transform duration-300 hover:scale-110">
<span className="material-symbols-outlined text-[20px]">badge</span>
</div>
<div>
<div className="flex items-center gap-2">
<span className="text-[10px] font-label font-bold text-primary uppercase tracking-wider">Seção 01</span>
<span className="w-1 h-1 rounded-full bg-outline-variant"></span>
<span className="text-[10px] font-label text-secondary font-bold flex items-center gap-0.5">
<span className="material-symbols-outlined text-[12px] animate-pulse">check_circle</span> 100% Preenchido
                </span>
</div>
<h2 className="font-headline font-extrabold text-base sm:text-lg text-on-surface">
                1. Identificação, Civil &amp; Residência.</h2>
</div>
</div>
<span className="hidden sm:inline-flex text-[11px] font-label text-outline font-medium bg-surface-container px-2.5 py-1 rounded-md transition-colors hover:bg-surface-container-high">
            Dados do Proponente
          </span>
</div>
<div className="space-y-4">

<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="nome_completo">
                Nome completo <span className="text-error font-bold">*</span>
</label>
<Slot k="nome" id="nome_completo" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-outline-variant border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="Nome completo do titular" type="text" />
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="nome_mae">
                Nome da mãe <span className="text-error font-bold">*</span>
</label>
<Slot k="mae" id="nome_mae" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-outline-variant border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="Nome da m\u00e3e completo" type="text" />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="cpf">
                  CPF <span className="text-error font-bold">*</span>
</label>
<span className="inline-flex items-center gap-0.5 text-[10px] font-label font-bold text-secondary">
<span className="material-symbols-outlined text-[13px] animate-pulse">verified_user</span> Autenticado Receita
                </span>
</div>
<div className="relative">
<Slot k="cpf" id="cpf" cls="input-animated w-full h-11 px-3.5 pr-10 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-secondary/40 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-semibold shadow-sm" ph="" type="text" />
<span className="material-symbols-outlined text-[17px] text-secondary absolute right-3 top-3">check_circle</span>
</div>
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="rg">
                RG / Órgão Emissor
              </label>
<Slot k="rg" id="rg" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="00.000.000-0 SSP/UF" type="text" />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="data_nasc">
                Nascimento <span className="text-error font-bold">*</span>
</label>
<div className="relative">
<Slot k="nascimento" id="data_nasc" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-mono text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="estado_civil">
                Estado Civil
              </label>
<SlotSelect k="estado_civil" id="estado_civil" cls="input-animated w-full h-11 px-3 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm cursor-pointer" opcoes={[{"v": "casado", "t": "Casado(a)"}, {"v": "solteiro", "t": "Solteiro(a)"}, {"v": "uniao_estavel", "t": "Uni\u00e3o Est\u00e1vel"}, {"v": "divorciado", "t": "Divorciado(a)"}, {"v": "viuvo", "t": "Vi\u00favo(a)"}]} />
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide">
                Possui CNH?
              </label>
<GrupoCnh />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="telefone_whatsapp">
                Telefone / WhatsApp <span className="text-error font-bold">*</span>
</label>
<div className="relative">
<Slot k="telefone" id="telefone_whatsapp" cls="input-animated w-full h-11 pl-3.5 pr-10 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
<span className="material-symbols-outlined text-[18px] text-secondary absolute right-3 top-3">phone_iphone</span>
</div>
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="email">
                E-mail Pessoal / Faturamento
              </label>
<div className="relative">
<Slot k="email" id="email" cls="input-animated w-full h-11 pl-3.5 pr-10 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="email" />
<span className="material-symbols-outlined text-[18px] text-outline absolute right-3 top-3">alternate_email</span>
</div>
</div>
</div>

<div className="pt-2">
<div className="flex items-center gap-2 mb-3.5">
<span className="material-symbols-outlined text-[16px] text-primary">home_pin</span>
<span className="text-xs font-headline font-bold text-on-surface tracking-wide uppercase">Endereço Residencial Completo</span>
<div className="flex-1 h-px bg-surface-container"></div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
<div className="sm:col-span-4 space-y-1.5">
<div className="flex items-center justify-between">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="cep">CEP</label>

</div>
<Slot k="cep" id="cep" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="sm:col-span-6 space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="endereco">Logradouro / Avenida</label>
<Slot k="endereco" id="endereco" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="sm:col-span-2 space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="numero">Nº</label>
<Slot k="numero" id="numero" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mt-3.5">
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="complemento">Complemento</label>
<Slot k="complemento" id="complemento" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="bairro">Bairro</label>
<Slot k="bairro" id="bairro" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="cidade">Cidade / UF</label>
<Slot k="cidade" id="cidade" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="space-y-1.5">
<label className="block whitespace-nowrap font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="tempo_residencia">Tempo Residência</label>
<Slot k="tempo_residencia" id="tempo_residencia" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
</div>
</div>

<div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container mt-2 transition-all duration-200 hover:bg-surface-container-low">
<div className="flex items-center gap-1.5 mb-2.5">
<span className="material-symbols-outlined text-[16px] text-tertiary">group</span>
<span className="text-xs font-label font-bold text-on-surface uppercase tracking-wider">Referência Pessoal (Familiar / Parente)</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<Slot k="ref_pessoal_nome" id="ref_pessoal_nome" cls="input-animated w-full h-10 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:border-primary focus:outline-none shadow-sm font-medium" ph="Nome de parente" type="text" />
<Slot k="ref_pessoal_tel" id="ref_pessoal_tel" cls="input-animated w-full h-10 px-3.5 rounded-xl bg-surface-container-lowest font-mono text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:border-primary focus:outline-none font-medium shadow-sm" ph="Telefone" type="text" />
</div>
</div>
</div>
</section>



<section className="fade-in-stagger delay-300 bg-surface-container-lowest rounded-3xl p-6 sm:p-7 border border-surface-container shadow-xl shadow-primary/5 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 space-y-6 h-full flex flex-col">
<div className="flex items-center justify-between pb-4 border-b border-surface-container">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-secondary-container/50 flex items-center justify-center text-secondary font-bold shadow-sm transition-transform duration-300 hover:scale-110">
<span className="material-symbols-outlined text-[20px]">payments</span>
</div>
<div>
<div className="flex items-center gap-2">
<span className="text-[10px] font-label font-bold text-secondary uppercase tracking-wider">Seção 02</span>
<span className="w-1 h-1 rounded-full bg-outline-variant"></span>
<span className="text-[10px] font-label text-primary font-bold flex items-center gap-0.5">
<span className="material-symbols-outlined text-[12px] animate-pulse">verified</span> Solvência Confirmada
        </span>
</div>
<h2 className="font-headline font-extrabold text-base sm:text-lg text-on-surface">
        2. Dados Financeiros &amp; Profissionais.</h2>
</div>
</div>
<span className="hidden sm:inline-flex text-[11px] font-label text-outline font-medium bg-surface-container px-2.5 py-1 rounded-md transition-colors hover:bg-surface-container-high">
    Análise de Renda
  </span>
</div>
<div className="space-y-4 flex-1 flex flex-col justify-between">

<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

<div className="p-4 rounded-2xl bg-gradient-to-br from-primary-fixed/40 to-surface-container-low border border-primary/20 space-y-2 hover:border-primary/50 transition-all duration-300 hover:shadow-md">
<div className="flex items-center justify-between">
<label className="text-xs font-label font-bold text-primary uppercase tracking-wider" htmlFor="renda_principal">
          Renda Principal <span className="text-error font-bold">*</span>
</label>
<span className="text-[10px] font-label font-bold bg-primary text-on-primary px-1.5 py-0.5 rounded shadow-sm">Comprovada</span>
</div>
<div className="relative flex items-center">
<span className="absolute left-3.5 font-headline font-black text-lg text-primary">R$</span>
<Slot k="renda" id="renda_principal" cls="input-animated w-full h-11 pl-12 pr-3.5 rounded-xl bg-surface-container-lowest font-headline font-extrabold text-xl text-on-surface border border-primary/40 focus:border-primary focus:outline-none font-mono" ph="" type="text" />
</div>
</div>

<div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/50 space-y-2 hover:border-outline-variant transition-all duration-300 hover:shadow-md">
<div className="flex items-center justify-between">
<label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="renda_adicional">
          Renda extra
        </label>
<span className="text-[10px] font-label font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">Opcional</span>
</div>
<div className="relative flex items-center">
<span className="absolute left-3.5 font-headline font-black text-lg text-outline">R$</span>
<Slot k="renda_adicional" id="renda_adicional" cls="input-animated w-full h-11 pl-12 pr-3.5 rounded-xl bg-surface-container-lowest font-headline font-bold text-xl text-on-surface border border-outline-variant/60 focus:border-primary focus:outline-none font-mono" ph="" type="text" />
</div>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
<div className="sm:col-span-8 space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="nome_empresa">
        Empresa Contratante / Empregador <span className="text-error font-bold">*</span>
</label>
<Slot k="empresa" id="nome_empresa" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="sm:col-span-4 space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="regime">
        Regime Contratual
      </label>
<SlotSelect k="regime" id="regime" cls="input-animated w-full h-11 px-3 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm cursor-pointer" opcoes={[{"v": "clt", "t": "CLT (Carteira)"}, {"v": "pj", "t": "PJ / MEI"}, {"v": "servidor", "t": "Servidor P\u00fablico"}, {"v": "autonomo", "t": "Profissional Liberal"}, {"v": "aposentado", "t": "Aposentado / Pens."}]} />
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="profissao">
        Profissão <span className="text-error font-bold">*</span>
</label>
<Slot k="profissao" id="profissao" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="cargo">
        Cargo Atual
      </label>
<Slot k="cargo" id="cargo" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="data_admissao">
        Data Admissão <span className="text-error font-bold">*</span>
</label>
<div className="relative">
<Slot k="admissao" id="data_admissao" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-mono text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
</div>
</div>

<div className="pt-2">
<div className="flex items-center gap-2 mb-3.5">
<span className="material-symbols-outlined text-[16px] text-primary">corporate_fare</span>
<span className="text-xs font-headline font-bold text-on-surface tracking-wide uppercase">Vínculo Corporativo &amp; Referência Comercial</span>
<div className="flex-1 h-px bg-surface-container"></div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
<div className="sm:col-span-6 space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="contato_empresa">
          Telefone Central da Empresa
        </label>
<div className="relative">
<Slot k="contato_empresa" id="contato_empresa" cls="input-animated w-full h-11 pl-3.5 pr-10 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
<span className="material-symbols-outlined text-[18px] text-outline absolute right-3 top-3">call</span>
</div>
</div>
<div className="sm:col-span-6 space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="ref_comercial_nome">
          Referência Comercial — Contato&nbsp;</label>
<Slot k="ref_emp_nome" id="ref_comercial_nome" cls="input-animated w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
<div className="space-y-1.5">
<label className="block font-label text-xs font-semibold text-on-surface uppercase tracking-wide" htmlFor="ref_comercial_telefone">
          Telefone / WhatsApp Comercial
        </label>
<div className="relative">
<Slot k="ref_emp_tel" id="ref_comercial_telefone" cls="input-animated w-full h-11 pl-3.5 pr-10 rounded-xl bg-surface-container-lowest font-mono text-sm text-on-surface border border-outline-variant/60 focus:bg-surface-container-lowest focus:border-primary focus:outline-none font-medium shadow-sm" ph="" type="text" />
<span className="material-symbols-outlined text-[18px] text-secondary absolute right-3 top-3">chat</span>
</div>
</div>
<div className="p-2.5 px-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-center transition-all duration-300 hover:shadow-inner">
<div className="flex items-center justify-between">
<span className="text-[10px] font-label font-bold text-outline uppercase">Estabilidade Profissional</span>
<span className="text-xs font-mono font-bold text-secondary">{estabilidade.texto}</span>
</div>
<div className="flex items-center gap-2 mt-1">
<div className="flex-1 bg-surface-container-highest h-2 rounded-full overflow-hidden">
<div className="bg-secondary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${estabilidade.pct}%` }}></div>
</div>
</div>
<span className="text-[10px] font-label text-on-surface-variant mt-1">Vínculo contínuo sem quebras</span>
</div>
</div>
</div>

<div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container mt-2 flex flex-wrap items-center justify-between gap-2 transition-all hover:bg-surface-container-low">
<label className="flex items-center gap-2.5 text-xs font-label font-medium text-on-surface cursor-pointer select-none">
<Slot k="consulta_scr" id="consulta_scr" cls="w-4 h-4 rounded text-primary focus:ring-primary/30 border-outline-variant cursor-pointer transition-transform active:scale-90" ph="" type="checkbox" />
<span className="">Autorizo consulta bancária simultânea (SCR / Bacen)</span>
</label>
<span className="text-[11px] font-mono text-secondary font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">lock</span>
      Tokenizado SHA-256
    </span>
</div>
</div></section>
</div>



<div className="fade-in-stagger delay-400 rounded-3xl bg-surface-container-lowest border border-surface-container p-6 lg:p-8 shadow-2xl shadow-primary/10 relative overflow-hidden transition-all duration-300 hover:shadow-primary/15">

<div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
<div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
<div className="relative z-10 space-y-6">

<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-xs font-label font-bold">
<span className="relative flex h-2 w-2">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
<span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
</span>
                Esteira de Despacho Multi-Bancos Simultânea
              </span>
</div>
<h3 className="font-headline font-extrabold text-lg sm:text-xl text-on-surface tracking-tight">Conheça algumas das nossas instituições parceiras.</h3>
</div>
<div className="flex items-center gap-3">
</div>
</div>

<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5" id="bank-cards-grid">

<label className="bank-card group relative flex flex-col justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest/50 border-2 border-primary/40 hover:border-primary cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98]">
<div className="flex items-start justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-600 flex items-center justify-center font-black text-xs font-headline group-hover:scale-110 transition-transform duration-200">
                  SAN
                </div>
<div>
<h4 className="font-headline font-bold text-xs sm:text-sm text-on-surface leading-tight group-hover:text-primary transition-colors">Santander Auto</h4>
<span className="text-[10px] font-label text-outline font-medium">Taxa Especial VIP</span>
</div>
</div>
</div>
</label>

<label className="bank-card group relative flex flex-col justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest/50 border-2 border-primary/40 hover:border-primary cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98]">
<div className="flex items-start justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-blue-700/10 text-blue-700 flex items-center justify-center font-black text-xs font-headline group-hover:scale-110 transition-transform duration-200">
                  BV
                </div>
<div>
<h4 className="font-headline font-bold text-xs sm:text-sm text-on-surface leading-tight group-hover:text-primary transition-colors">BV Financeira</h4>
<span className="text-[10px] font-label text-outline font-medium">Líder Usados</span>
</div>
</div>
</div>
</label>

<label className="bank-card group relative flex flex-col justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest/50 border-2 border-primary/40 hover:border-primary cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98]">
<div className="flex items-start justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-orange-600/10 text-orange-600 flex items-center justify-center font-black text-xs font-headline group-hover:scale-110 transition-transform duration-200">
                  ITAU
                </div>
<div>
<h4 className="font-headline font-bold text-xs sm:text-sm text-on-surface leading-tight group-hover:text-primary transition-colors">Itaú Financiamento</h4>
<span className="text-[10px] font-label text-outline font-medium">Agilidade Alta</span>
</div>
</div>
</div>
</label>

<label className="bank-card group relative flex flex-col justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest/50 border-2 border-primary/40 hover:border-primary cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98]">
<div className="flex items-start justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-lg bg-red-700/10 text-red-700 flex items-center justify-center font-black text-xs font-headline group-hover:scale-110 transition-transform duration-200">
                  BRA
                </div>
<div>
<h4 className="font-headline font-bold text-xs sm:text-sm text-on-surface leading-tight group-hover:text-primary transition-colors">Bradesco Financiamentos</h4>
<span className="text-[10px] font-label text-outline font-medium">Convênio Prime</span>
</div>
</div>
</div>
</label>
</div>

<div className="pt-2">
<div className="flex flex-wrap items-center gap-2 text-xs font-label">
<span className="text-[11px] font-bold text-outline uppercase tracking-wider mr-1">+ 10 Mesas Inclusas na Fila:</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Safra Auto</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Banco Pan</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">C6 Bank</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Daycoval</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Omni Fin.</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Porto Seguro</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Banco do Brasil</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Caixa</span>
<span className="bank-chip px-2.5 py-1 rounded-lg font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm bg-surface-container text-on-surface">Creditas</span>
<span className="bank-chip px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm">Digimais</span>
</div>
</div>

<div className="pt-4 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0 transition-transform duration-300 hover:rotate-12">
<span className="material-symbols-outlined text-[22px]">timer</span>
</div>
<div>
<p className="font-headline font-bold text-sm text-on-surface">Tempo de Retorno Estimado: <span className="text-secondary font-mono">60 MINUTOS.</span></p>
</div>
</div>
<div className="flex items-center gap-3 w-full sm:w-auto">
<SlotSubmit cls="shimmer-sweep w-full sm:w-auto inline-flex items-center justify-center gap-3 h-14 px-8 rounded-2xl font-headline text-sm sm:text-base font-extrabold text-on-primary bg-primary hover:bg-primary-container shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/35 active:scale-[0.98] transition-all duration-200 group"><span className="material-symbols-outlined text-[22px] transition-transform duration-200 group-hover:scale-110">send</span><span className="">Enviar Dados !</span></SlotSubmit>
</div>
</div>
</div>
</div>
</div>
</main>
          ) : (
            <main className="relative z-10 flex-1 w-full pt-4 pb-12">{conteudo}</main>
          )}
          



<footer className="fade-in-stagger delay-500 relative z-10 w-full bg-surface-container-lowest border-t border-surface-container mt-auto">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
<div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-surface-container">

<div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-label text-on-surface-variant">
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container hover:border-secondary/40 transition-colors">
<span className="material-symbols-outlined text-secondary text-[16px]">lock</span>
<span className="font-semibold text-on-surface">Criptografia SSL 256-bit Ativa</span>
</div>
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container hover:border-primary/40 transition-colors">
<span className="material-symbols-outlined text-primary text-[16px]">verified</span>
<span className="font-semibold text-on-surface">Conformidade BACEN e Resoluções CMN</span>
</div>
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container hover:border-primary/40 transition-colors">
<span className="material-symbols-outlined text-primary text-[16px]">shield</span>
<span className="font-semibold text-on-surface">Proteção de Dados LGPD</span>
</div>
</div>

<div className="flex items-center gap-4">
<a className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-primary hover:text-on-primary-fixed-variant transition-colors group" href="#">
<span className="material-symbols-outlined text-[16px] group-hover:rotate-12 transition-transform">support_agent</span>
          Mesa de Apoio &amp; Suporte Especializado F&amp;I
        </a>
</div>
</div>
<div className="pt-5 flex flex-col sm:flex-row items-center justify-between text-xs font-label text-outline gap-3">
<p className="">© 2025 Calcula.car Soluções Automotivas Ltda. Todos os direitos reservados. FIPE ® atualizada em tempo real.</p>
<p className="text-[11px] font-mono">Ambiente Homologado para Lojas, Concessionárias e Correspondentes Bancários.</p>
</div>
</div>
</footer>




          {msg && (
            <div role="alert" className="fixed bottom-6 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-error/30 bg-surface-container-lowest p-4 shadow-2xl">
              <span className="material-symbols-outlined text-[24px] text-error">error</span>
              <p className="font-body text-sm font-semibold text-on-surface">{msg}</p>
            </div>
          )}
        </div>
      </CTX.Provider>
    </PageTransition>
  );
}
