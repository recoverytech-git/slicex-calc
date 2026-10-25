// sem-rascunho: dados de cliente externo; nada fica guardado no navegador
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ArrowLeft, ArrowRight, Send, Loader2, Clock3, ShieldCheck, XCircle, Calendar, Lock, Check } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { SECOES, FICHA_VAZIA } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos, cpfValido } from "../lib/mascaras";
import { ESTILOS_PREENCHER } from "./preencher-estilos";
import logo from "../assets/logo.png";

// Mesmos blocos e obrigatorios de antes: bloco 1 (pessoal, com CNH) e bloco 2 (renda e ocupacao)
const ETAPAS = [
  { titulo: "Identificação, Civil & Residência", eyebrow: "Seção 1 · Dados pessoais", campos: SECOES[0].campos, obrigatorios: ["nome", "cpf", "telefone", "cnh"] },
  { titulo: "Dados Financeiros & Profissionais", eyebrow: "Seção 2 · Renda e ocupação", campos: SECOES[1].campos, obrigatorios: ["profissao", "renda"] },
];
const CHAVES_ENVIO = ETAPAS.flatMap((e) => e.campos.map(([k]) => k));
const ESTADOS_CIVIS = ["SOLTEIRO", "CASADO", "DIVORCIADO", "VIÚVO", "UNIÃO ESTÁVEL"];
const EXEMPLOS = {
  nome: "Nome completo do titular", mae: "Nome materno completo", rg: "00.000.000-0", cpf: "000.000.000-00",
  telefone: "(11) 98765-4321", email: "cliente@email.com", cep: "00000-000", endereco: "Rua, Avenida, Alameda...",
  numero: "123", complemento: "Apto, Bloco...", bairro: "Nome do bairro", cidade: "São Paulo", uf: "SP",
  tempo_residencia: "ex: 3 anos e 6 meses", ref_pessoal_nome: "Nome de um parente ou amigo", ref_pessoal_tel: "(11) 90000-0000",
  empresa: "Razão social da empresa", profissao: "ex: Analista de sistemas", cargo: "ex: Gerente comercial",
  contato_empresa: "(11) 3000-0000", ref_emp_nome: "Nome do contato comercial", ref_emp_tel: "(11) 3000-0000",
};

const campoCls = "w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-outline-variant border border-outline-variant/60 focus:border-primary focus:outline-none font-medium shadow-sm transition-all duration-200";
const rotuloCls = "block font-label text-xs font-bold text-on-surface-variant mb-1.5";
const dinheiro = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mascData = (d) => (d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`);
const mascCep = (d) => (d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5, 8)}`);

function Pilula({ ativo, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 h-11 rounded-xl font-label text-xs font-bold transition-all duration-200 active:scale-95 ${ativo ? "bg-primary text-on-primary shadow-sm shadow-primary/20 hover:shadow-md hover:bg-primary-container" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
      {children}
    </button>
  );
}

function Campo({ def, obrigatorio, form, setForm }) {
  const [chave, rotulo, tipo] = def;
  const id = `campo-${chave}`;
  const rotuloFinal = `${rotulo}${obrigatorio ? " *" : ""}`;
  const set = (v) => setForm({ ...form, [chave]: tipo === "cpf" || tipo === "tel" ? soDigitos(v) : v });

  if (tipo === "money") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotuloFinal}</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-label text-xs font-bold text-on-surface-variant">R$</span>
          <input id={id} inputMode="numeric" placeholder="0,00" className={campoCls + " pl-12 pr-3.5 font-headline font-bold tabular-nums"} value={dinheiro(form[chave])}
            onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setForm({ ...form, [chave]: d ? Number(d) / 100 : 0 }); }} />
        </div>
      </div>
    );
  }
  if (tipo === "bool") {
    return (
      <div className="flex flex-col md:col-span-2">
        <span className={rotuloCls}>{rotuloFinal}</span>
        <div className="flex gap-2 max-w-xs">
          {[[true, "Sim"], [false, "Não"]].map(([v, t]) => (
            <Pilula key={t} ativo={form[chave] === v} onClick={() => setForm({ ...form, [chave]: v })}>
              {form[chave] === v && <Check size={13} className="mr-1 inline" />}{t}
            </Pilula>
          ))}
        </div>
      </div>
    );
  }
  if (chave === "estado_civil") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotuloFinal}</label>
        <select id={id} className={campoCls + " appearance-none cursor-pointer"} value={form[chave] ?? ""} onChange={(e) => set(e.target.value)}>
          <option value="">Selecione</option>
          {ESTADOS_CIVIS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    );
  }
  if (chave === "nascimento" || chave === "admissao") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotuloFinal}</label>
        <div className="relative">
          <input id={id} inputMode="numeric" placeholder="dd / mm / aaaa" className={campoCls + " pr-11 font-mono"} value={mascData(soDigitos(form[chave]).slice(0, 8))}
            onChange={(e) => set(mascData(soDigitos(e.target.value).slice(0, 8)))} />
          <Calendar size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="date" aria-label={`Selecionar ${rotulo}`} className="absolute inset-y-0 right-0 w-11 cursor-pointer opacity-0"
            onChange={(e) => { if (e.target.value) { const [a, m, d] = e.target.value.split("-"); setForm({ ...form, [chave]: `${d}${m}${a}` }); } }} />
        </div>
      </div>
    );
  }
  if (tipo === "cpf" || tipo === "tel" || chave === "cep") {
    const digitos = soDigitos(form[chave] || "").slice(0, tipo === "cep" || chave === "cep" ? 8 : 11);
    const valor = tipo === "cpf" ? formatarCPF(digitos) : tipo === "tel" ? formatarTelefone(digitos) : mascCep(digitos);
    const invalido = tipo === "cpf" && digitos.length === 11 && !cpfValido(digitos);
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotuloFinal}</label>
        <input id={id} inputMode="numeric" placeholder={EXEMPLOS[chave] ?? ""} className={campoCls + " font-mono " + (invalido ? "!border-error" : "")} value={valor}
          onChange={(e) => setForm({ ...form, [chave]: soDigitos(e.target.value).slice(0, chave === "cep" ? 8 : 11) })} />
        {invalido && <p className="mt-1 font-body text-xs font-semibold text-error">CPF inválido</p>}
      </div>
    );
  }
  if (chave === "uf") {
    return (
      <div className="flex flex-col">
        <label htmlFor={id} className={rotuloCls}>{rotuloFinal}</label>
        <input id={id} placeholder={EXEMPLOS.uf} className={campoCls + " uppercase"} value={form[chave] ?? ""} onChange={(e) => set(e.target.value.toUpperCase().slice(0, 2))} />
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className={rotuloCls}>{rotuloFinal}</label>
      <input id={id} placeholder={EXEMPLOS[chave] ?? ""} className={campoCls} value={form[chave] ?? ""} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

export default function PreencherFicha() {
  const { token } = useParams();
  const [estado, setEstado] = useState("carregando"); // carregando | valido | invalido | expirado | preenchido | enviado
  const [orgNome, setOrgNome] = useState("");
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState({ ...FICHA_VAZIA });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) { setEstado("invalido"); return; }
    supabase.rpc("obter_link_ficha", { p_token: token }).then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { setEstado("invalido"); return; }
      if (row.status === "preenchido") { setEstado("preenchido"); return; }
      if (new Date(row.expira_em) < new Date()) { setEstado("expirado"); return; }
      setOrgNome(row.org_nome);
      setEstado("valido");
    });
  }, [token]);

  const faltando = (lista) => lista.filter((k) => {
    const v = form[k];
    if (k === "cpf") return !cpfValido(v || "");
    if (k === "telefone") return soDigitos(v || "").length < 10;
    if (k === "cnh") return v !== true && v !== false;
    if (k === "renda") return !(Number(v) > 0);
    return !(typeof v === "string" ? v.trim() : v);
  });

  const avancar = () => {
    const pendentes = faltando(ETAPAS[etapa].obrigatorios);
    if (pendentes.length) { setErro("Preencha os campos obrigatórios destacados para continuar."); return; }
    setErro(null);
    setEtapa((e) => e + 1);
  };

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    const dados = Object.fromEntries(CHAVES_ENVIO.map((k) => [k, form[k]]));
    const { error } = await supabase.rpc("salvar_ficha_cliente", { p_token: token, p_dados: dados });
    setEnviando(false);
    if (error) { setErro(error.message); return; }
    setEstado("enviado");
  };

  const etapaAtual = ETAPAS[etapa];
  const ultima = etapa === ETAPAS.length - 1;
  const obrigatoriosTotal = ETAPAS.flatMap((e) => e.obrigatorios).length;
  const obrigatoriosOk = obrigatoriosTotal - faltando(ETAPAS.flatMap((e) => e.obrigatorios)).length;
  const pct = Math.round((obrigatoriosOk / obrigatoriosTotal) * 100);

  const telaFinal = (icone, cor, titulo, texto) => (
    <div className="layer-card-shadow mx-auto max-w-lg rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ color: cor, background: `${cor}1a` }}>{icone}</div>
      <h2 className="font-headline text-xl font-extrabold text-on-surface">{titulo}</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-on-surface-variant">{texto}</p>
    </div>
  );

  return (
    <PageTransition>
      <div className="cc-novo relative min-h-screen overflow-x-clip bg-surface font-body text-on-surface antialiased">
        <style>{ESTILOS_PREENCHER}</style>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-orb-1 absolute -top-32 left-1/4 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="animate-orb-2 absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-secondary-container/25 blur-[110px]" />
        </div>

        <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface-container-lowest/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-4">
              <img src={logo} alt="SliceX.calc" className="h-7 w-auto" />
              {orgNome && <span className="border-l border-outline-variant/60 pl-4 font-label text-xs font-semibold text-on-surface-variant">{orgNome}</span>}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/30 px-3 py-1 font-label text-[11px] font-bold text-on-secondary-container">
              <Lock size={12} /> Ambiente seguro
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          {estado === "carregando" && <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-3xl bg-surface-container" />}
          {estado === "invalido" && telaFinal(<XCircle size={30} />, "#ba1a1a", "Link inválido", "Este endereço não existe ou foi copiado de forma incompleta. Peça um novo link ao atendente.")}
          {estado === "expirado" && telaFinal(<Clock3 size={30} />, "#b45309", "Link expirado", "Este link já não está mais disponível. Peça um novo ao atendente.")}
          {estado === "preenchido" && telaFinal(<ShieldCheck size={30} />, "#004ac6", "Ficha já enviada", "Os seus dados já foram recebidos. Obrigado!")}
          {estado === "enviado" && telaFinal(<CheckCircle2 size={30} />, "#006c49", "Ficha enviada com sucesso", "A equipe da loja recebeu os seus dados e entrará em contato. Você já pode fechar esta página.")}

          {estado === "valido" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="space-y-6 lg:col-span-2">
                <div>
                  <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Ficha cadastral</span>
                  <h1 className="mt-1 font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">Ficha Cadastral &amp; Financeira.</h1>
                  <p className="mt-2 font-body text-sm text-on-surface-variant">Preencha no seu ritmo, de qualquer lugar. Leva poucos minutos e seus dados ficam protegidos.</p>
                </div>

                <div className="layer-card-shadow rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-5 sm:p-7">
                  <div className="mb-6 flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-5">
                    <div>
                      <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{etapaAtual.eyebrow}</span>
                      <h2 className="mt-1 font-headline text-lg font-extrabold text-on-surface">{etapa + 1}. {etapaAtual.titulo}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-fixed px-3 py-1 font-label text-[11px] font-bold text-on-primary-fixed-variant">Etapa {etapa + 1} de {ETAPAS.length}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                    {etapaAtual.campos.map((c) => (
                      <Campo key={c[0]} def={c} obrigatorio={etapaAtual.obrigatorios.includes(c[0])} form={form} setForm={setForm} />
                    ))}
                  </div>
                  <p className="mt-5 font-body text-[11px] text-on-surface-variant">* campos obrigatórios</p>

                  {erro && <p role="alert" className="mt-4 rounded-xl border border-error bg-error-container/40 px-4 py-3 font-body text-sm font-semibold text-on-error-container">{erro}</p>}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 pt-5">
                    <button type="button" onClick={() => { setErro(null); setEtapa((e) => Math.max(0, e - 1)); }} disabled={etapa === 0}
                      className="inline-flex h-12 items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-5 font-label text-xs font-bold text-on-surface shadow-sm transition-all hover:bg-surface-container active:scale-95 disabled:opacity-40">
                      <ArrowLeft size={15} /> Voltar
                    </button>
                    {!ultima ? (
                      <button type="button" onClick={avancar}
                        className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/25 transition-all hover:bg-primary-container active:scale-95">
                        Continuar <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button type="button" onClick={enviar} disabled={enviando}
                        className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/25 transition-all hover:bg-primary-container active:scale-95 disabled:opacity-60">
                        {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {enviando ? "Enviando…" : "Enviar Dados !"}
                      </button>
                    )}
                  </div>
                </div>

                <p className="px-1 font-body text-[11px] leading-relaxed text-on-surface-variant">
                  As informações são usadas somente para analisar o financiamento do veículo.
                </p>
              </section>

              <aside className="space-y-6">
                <div className="layer-card-shadow rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-5 sm:p-6">
                  <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Progresso</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-headline text-3xl font-extrabold text-on-surface">{pct}%</span>
                    <span className="font-label text-xs font-semibold text-on-surface-variant">dos campos obrigatórios</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-low">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <ol className="mt-5 space-y-3">
                    {ETAPAS.map((e, i) => (
                      <li key={e.titulo} className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-label text-xs font-bold ${i < etapa ? "bg-secondary text-on-secondary" : i === etapa ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                          {i < etapa ? <Check size={14} /> : i + 1}
                        </span>
                        <span className={`font-body text-sm ${i === etapa ? "font-bold text-on-surface" : "font-medium text-on-surface-variant"}`}>{e.titulo}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-2xl border border-secondary/25 bg-secondary-container/15 p-5">
                  <p className="font-label text-xs font-bold text-on-secondary-container">Seus dados estão protegidos</p>
                  <p className="mt-1 font-body text-xs leading-relaxed text-on-surface-variant">Esta ficha só pode ser enviada uma vez. Após o envio, a equipe da loja recebe as informações.</p>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
