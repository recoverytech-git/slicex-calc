import { URL_PUBLICA } from "../lib/urls";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Save, Check, Image as ImageIcon, FileDown, Link2, Copy, Share2, ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho, limparRascunho } from "../lib/rascunho";
import { SECOES, FICHA_VAZIA, gerarPdf, gerarPngBlob, nomeArquivo, baixar } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos, cpfValido } from "../lib/mascaras";
import { ESTILOS_FICHA } from "./ficha-estilos";

const EDITAM = ["admin_master", "proprietario", "gerente"];
const DEF = Object.fromEntries(SECOES.flatMap((s) => s.campos.map((c) => [c[0], c])));
const ETAPAS = [
  { n: 1, titulo: "Identificação & Dados Pessoais", campos: ["nome", "mae", "rg", "cpf", "nascimento", "telefone", "estado_civil", "email", "cep", "endereco", ["numero", "complemento"], "bairro", "cidade", "uf", "tempo_residencia", "ref_pessoal_nome", "ref_pessoal_tel", "cnh"] },
  { n: 2, titulo: "Perfil Ocupacional & Renda", campos: ["empresa", "admissao", "profissao", "regime", "cargo", "renda", "renda_adicional", "contato_empresa", "ref_emp_nome", "ref_emp_tel"] },
  { n: 3, titulo: "Garantia & Veículo", campos: ["placa", "renavam", "modelo", "ano_modelo", "cor", "valor_veiculo", "valor_entrada", "valor_financiar"] },
];
const TODAS = ETAPAS.flatMap((e) => e.campos.flat());
const EXEMPLOS = {
  nome: "ex: Roberto Carlos da Silva", mae: "Nome materno completo", rg: "00.000.000-0", cpf: "000.000.000-00",
  telefone: "(11) 98765-4321", email: "cliente@email.com", cep: "00000-000", endereco: "Rua, Avenida, Alameda...",
  numero: "123", complemento: "Apto, Bloco...", bairro: "Nome do bairro", cidade: "São Paulo", uf: "SP",
  tempo_residencia: "ex: 3 anos e 6 meses", ref_pessoal_nome: "Nome de um parente ou amigo", ref_pessoal_tel: "(11) 90000-0000",
  empresa: "Razão social da empresa", profissao: "ex: Analista de sistemas", cargo: "ex: Gerente comercial",
  contato_empresa: "(11) 3000-0000", ref_emp_nome: "Nome do contato comercial", ref_emp_tel: "(11) 3000-0000",
  placa: "ABC1D23", renavam: "00000000000", modelo: "ex: Toyota Corolla XEi", ano_modelo: "ex: 2023", cor: "ex: Prata",
};
const ESTADOS_CIVIS = ["SOLTEIRO", "CASADO", "DIVORCIADO", "VIÚVO", "UNIÃO ESTÁVEL"];

const campoCls = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600";
const moedaCls = campoCls + " pl-10 font-semibold tabular-nums";
const rotuloCls = "mb-1.5 block text-xs font-semibold text-slate-600";
const botaoAcao = "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

const dinheiro = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mascData = (d) => (d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`);
const mascCep = (d) => (d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5, 8)}`);

function Campo({ chave, form, setForm }) {
  const [, rotulo, tipo] = DEF[chave];
  const id = `campo-${chave}`;
  const exemplo = EXEMPLOS[chave] ?? "";
  const set = (v) => setForm({ ...form, [chave]: v });

  if (tipo === "money") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-semibold text-slate-500">R$</span>
          <input id={id} inputMode="numeric" placeholder="0,00" className={moedaCls} value={dinheiro(form[chave])}
            onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setForm({ ...form, [chave]: d ? Number(d) / 100 : 0 }); }} />
        </div>
      </div>
    );
  }
  if (chave === "estado_civil") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
        <select id={id} className={campoCls} value={form[chave] ?? ""} onChange={(e) => set(e.target.value)}>
          <option value="">Selecione</option>
          {ESTADOS_CIVIS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    );
  }
  if (chave === "nascimento" || chave === "admissao") {
    const valor = mascData(soDigitos(form[chave]).slice(0, 8));
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
        <div className="relative">
          <input id={id} inputMode="numeric" placeholder="dd / mm / aaaa" className={campoCls + " pr-11 font-mono"} value={valor}
            onChange={(e) => set(mascData(soDigitos(e.target.value).slice(0, 8)))} />
          <Calendar size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="date" aria-label={`Selecionar ${rotulo}`} className="absolute inset-y-0 right-0 w-11 cursor-pointer opacity-0"
            onChange={(e) => { if (e.target.value) { const [a, m, d] = e.target.value.split("-"); set(`${d}${m}${a}`); } }} />
        </div>
      </div>
    );
  }
  if (tipo === "cpf" || tipo === "tel" || chave === "cep") {
    const digitos = tipo === "cpf" ? soDigitos(form[chave]).slice(0, 11) : tipo === "tel" ? soDigitos(form[chave]).slice(0, 11) : soDigitos(form[chave]).slice(0, 8);
    const valor = tipo === "cpf" ? formatarCPF(digitos) : tipo === "tel" ? formatarTelefone(digitos) : mascCep(digitos);
    const invalido = tipo === "cpf" && digitos.length === 11 && !cpfValido(digitos);
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
        <input id={id} inputMode="numeric" placeholder={exemplo} className={campoCls + " font-mono " + (invalido ? "border-red-400 focus:border-red-500" : "")} value={valor}
          onChange={(e) => set(soDigitos(e.target.value).slice(0, tipo === "cpf" || tipo === "tel" ? 11 : 8))} />
        {invalido && <p className="mt-1 text-xs font-semibold text-red-600">CPF inválido</p>}
      </div>
    );
  }
  if (chave === "uf") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
        <input id={id} placeholder={exemplo} className={campoCls + " uppercase"} value={form[chave] ?? ""} onChange={(e) => set(e.target.value.toUpperCase().slice(0, 2))} />
      </div>
    );
  }
  if (chave === "placa") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
        <input id={id} placeholder={exemplo} className={campoCls + " uppercase font-mono"} value={form[chave] ?? ""} onChange={(e) => set(e.target.value.toUpperCase())} />
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className={rotuloCls}>{rotulo}</label>
      <input id={id} placeholder={exemplo} className={campoCls} value={form[chave] ?? ""} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

export default function Ficha() {
  const { id } = useParams();
  const { perfil, sessao } = useAuth();
  const papel = perfil?.papel;
  const [form, setForm] = useRascunho("ficha.form", FICHA_VAZIA);
  const [lead, setLead] = useState(null);
  const [msg, setMsg] = useState(null);
  const [popup, setPopup] = useState(null);
  const [contador, setContador] = useState(3);
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);
  const navigate = useNavigate();
  const somenteLeitura = Boolean(id) && !EDITAM.includes(papel);

  useEffect(() => {
    if (!popup) return undefined;
    setContador(3);
    const t = setInterval(() => setContador((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [popup]);

  useEffect(() => {
    if (popup && contador <= 0) navigate("/leads");
  }, [popup, contador, navigate]);

  useEffect(() => {
    if (!id || !supabaseConfigurado) return;
    supabase.from("leads").select("*").eq("id", id).maybeSingle().then(({ data, error }) => {
      if (error || !data) { setMsg({ tipo: "erro", texto: error?.message || "Ficha não encontrada." }); return; }
      setLead(data);
      setForm({ ...FICHA_VAZIA, ...(data.dados ?? {}) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const preenchidos = TODAS.filter((k) => { const v = form[k]; return v !== undefined && v !== null && v !== "" && v !== 0; }).length;
  const pct = Math.round((preenchidos / TODAS.length) * 100);

  const gerarLink = async () => {
    setMsg(null);
    const { data, error } = await supabase.rpc("gerar_link_ficha", { p_dias: 7 });
    if (error) { setMsg({ tipo: "erro", texto: `Link não gerado: ${error.message}` }); return; }
    setLinkGerado(`${URL_PUBLICA}/preencher/${data}`);
  };

  const registro = () => ({ nome: form.nome, cpf: soDigitos(form.cpf), telefone: soDigitos(form.telefone), dados: form });

  const salvar = async () => {
    setMsg(null);
    if (!form.nome?.trim()) { setMsg({ tipo: "erro", texto: "Informe o nome completo." }); return; }
    if (form.cpf && !cpfValido(form.cpf)) { setMsg({ tipo: "erro", texto: "CPF inválido. Confira os dígitos verificadores." }); return; }
    const dados = { nome: form.nome.trim(), cpf: soDigitos(form.cpf) || null, telefone: soDigitos(form.telefone) || null, dados: form };
    const resumo = { nome: form.nome.trim(), cpf: formatarCPF(soDigitos(form.cpf)) };
    setSalvando(true);
    if (lead) {
      const { error } = await supabase.from("leads").update({ ...dados, status: "completa", atualizado_em: new Date().toISOString(), atualizado_por: sessao?.user?.id }).eq("id", lead.id);
      setSalvando(false);
      if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
      limparRascunho(["ficha.form"]);
      setPopup(resumo);
    } else {
      const { error } = await supabase.from("leads").insert({ ...dados, status: "completa", organizacao_id: perfil?.organizacao_id ?? null, criado_por: sessao?.user?.id });
      setSalvando(false);
      if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
      setForm(FICHA_VAZIA);
      limparRascunho(["ficha.form"]);
      setPopup(resumo);
    }
  };

  const exportarPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    gerarPdf([registro()], jsPDF, autoTable).save(nomeArquivo(registro(), "pdf"));
  };

  const exportarPng = async () => {
    const blob = await gerarPngBlob(registro());
    baixar(URL.createObjectURL(blob), nomeArquivo(registro(), "png"));
  };

  const renderEtapa = (e) => (
    <div key={e.n} className="block">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-xl sm:p-7">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-700">{e.n}. {e.titulo}</h2>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          {e.campos.map((c) => Array.isArray(c)
            ? <div key={c.join("-")} className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-1"><Campo chave={c[0]} form={form} setForm={setForm} /><Campo chave={c[1]} form={form} setForm={setForm} /></div>
            : c === "cnh"
              ? (
                <div key="cnh" className="flex flex-col md:col-span-2 lg:col-span-3">
                  <span className={rotuloCls}>{DEF.cnh[1]}</span>
                  <div className="flex w-fit gap-2">
                    {[[true, "Sim"], [false, "Não"]].map(([v, t]) => (
                      <button key={t} type="button" onClick={() => setForm({ ...form, cnh: v })}
                        className={`rounded-lg px-6 py-1.5 text-xs font-bold transition-all duration-200 ${form.cnh === v ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )
              : <Campo key={c} chave={c} form={form} setForm={setForm} />)}
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {e.n > 1
            ? <button type="button" onClick={() => setEtapa(e.n - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"><ChevronLeft size={14} /> Voltar para Etapa {e.n - 1}</button>
            : <span />}
          {e.n < 3
            ? <button type="button" onClick={() => setEtapa(e.n + 1)} className="btn-sweep inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 hover:-translate-y-0.5">Avançar para {e.n === 1 ? "Perfil Ocupacional" : "Veículo & Financiamento"} <ChevronRight size={14} /></button>
            : <span />}
        </div>
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="cc-novo relative min-h-screen overflow-x-clip bg-slate-50 font-sans text-slate-800 antialiased">
        <style>{ESTILOS_FICHA}</style>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="orb-1 absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-blue-300/35 blur-[90px]" />
          <div className="orb-2 absolute top-[38%] -right-20 h-[640px] w-[640px] rounded-full bg-cyan-200/30 blur-[95px]" />
          <div className="orb-3 absolute bottom-16 -left-24 h-[540px] w-[540px] rounded-full bg-blue-400/20 blur-[85px]" />
        </div>
        <Header subtitle="Ficha bancária" />
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <BackLink />

          <div>
            <h1 className="flex items-center gap-3 font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              <FileText size={22} className="text-blue-600" /> {id ? (lead?.nome || "Ficha financeira") : "Ficha bancária"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {somenteLeitura ? "Visualização da ficha. Você não pode editar esta ficha." : "Preencha os dados do cliente. Ao salvar, a ficha aparece em Leads."}
            </p>
          </div>

          <section className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:gap-3">
                {ETAPAS.map((e) => (
                  <button key={e.n} type="button" onClick={() => setEtapa(e.n)}
                    className={`step-btn flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all duration-200 ${etapa === e.n ? "step-active border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${etapa === e.n ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{e.n}</span>
                    <span className="text-xs font-bold text-slate-800">Etapa {e.n}<span className="block text-[11px] font-medium text-slate-500">{e.titulo}</span></span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 rounded-full bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
                <span className="status-radar relative flex h-2.5 w-2.5"><span className="dot-pulsing absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
                <span className="text-xs font-semibold text-slate-700">Preenchido</span>
                <span className="font-mono text-xs font-bold text-blue-700">{pct}%</span>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </section>

          {linkGerado && (
            <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Link2 size={16} className="text-blue-600" /> Link para o cliente</h3>
              <p className="text-xs text-slate-500">O cliente preenche os dados pessoais e financeiros de qualquer lugar. O link vale por 7 dias e é usado uma vez.</p>
              <div className="flex flex-wrap gap-2">
                <input readOnly value={linkGerado} onFocus={(e) => e.target.select()} className={campoCls + " min-w-[240px] flex-1 font-mono text-xs"} />
                <button type="button" onClick={() => navigator.clipboard?.writeText(linkGerado)} className={botaoAcao}><Copy size={14} className="text-blue-600" /> Copiar</button>
                <button type="button" onClick={() => navigator.share?.({ title: "Ficha financeira", url: linkGerado })} className={botaoAcao}><Share2 size={14} className="text-blue-600" /> Compartilhar</button>
              </div>
            </section>
          )}

          <div className={somenteLeitura ? "pointer-events-none opacity-85" : ""}>
            {ETAPAS.filter((e) => e.n === etapa).map(renderEtapa)}
          </div>

          <section className="sticky bottom-4 z-30 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-floating-dock ring-1 ring-slate-200/80 backdrop-blur-xl sm:p-5 lg:flex-row" data-purpose="floating-dock">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportarPdf} className={botaoAcao}><FileDown size={15} className="text-red-500" /> Exportar PDF</button>
              <button type="button" onClick={exportarPng} className={botaoAcao}><ImageIcon size={15} className="text-blue-600" /> Exportar PNG</button>
              {!id && <button type="button" onClick={gerarLink} className={botaoAcao}><Link2 size={15} className="text-blue-600" /> Gerar Link Cliente</button>}
            </div>
            {!somenteLeitura && (
              <button type="button" onClick={salvar} disabled={salvando}
                className="btn-sweep inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 hover:shadow-btn-hover hover:-translate-y-0.5 disabled:opacity-60">
                <Save size={15} /> {salvando ? "Salvando…" : lead ? "Salvar alterações" : "Salvar e Enviar para Mesa de Crédito"}
              </button>
            )}
          </section>
        </main>

        {msg && (
          <div role="status" className={`fixed bottom-28 right-6 z-[60] max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${msg.tipo === "erro" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
            {msg.texto}
          </div>
        )}

        {popup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] sm:p-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><Check size={26} strokeWidth={2.5} /></div>
              <h3 className="mt-4 text-xl font-extrabold text-slate-900">Ficha salva!</h3>
              <p className="mt-1.5 text-sm text-slate-500">A ficha foi salva com sucesso.<br />Você será redirecionado para Leads.</p>
              <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">CPF</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{popup.cpf || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Proponente</span>
                  <span className="truncate text-sm font-bold text-slate-900">{popup.nome}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ENVIADO A MESA DE CRÉDITO.</span>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Loader2 size={13} className="animate-spin" /> Redirecionando em {Math.max(contador, 0)} segundos...
              </div>
              <button type="button" onClick={() => navigate("/leads")} className="btn-sweep mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700">
                Ir para Leads <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
