// sem-rascunho: dados de cliente externo; nada fica guardado no navegador
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ArrowLeft, ArrowRight, Send, Loader2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import PageTransition from "../components/PageTransition";
import PrimaryButton from "../components/PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { SECOES, FICHA_VAZIA } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos, cpfValido } from "../lib/mascaras";
import { ENTRADA } from "../lib/motion";
import logo from "../assets/logo.png";

// Bloco 1 (dados pessoais, com CNH) e bloco 2 (financeiro e ocupacional).
const ETAPAS = [
  { titulo: "Seus dados pessoais", campos: SECOES[0].campos, obrigatorios: ["nome", "cpf", "telefone", "cnh"] },
  { titulo: "Sua renda e ocupação", campos: SECOES[1].campos, obrigatorios: ["profissao", "renda"] },
];
const CHAVES_ENVIO = ETAPAS.flatMap((e) => e.campos.map(([k]) => k));

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 24 };

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
    if (pendentes.length) {
      setErro("Preencha os campos obrigatórios destacados para continuar.");
      return;
    }
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

  const opcao = (ativo) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 18px", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${ativo ? "var(--accent)" : "var(--border-strong)"}`,
    background: ativo ? "rgba(68,147,248,0.14)" : "transparent", color: ativo ? "var(--text)" : "var(--text-dim)",
  });

  const campo = ([chave, rotulo, tipo]) => {
    const obrigatorio = ETAPAS[etapa].obrigatorios.includes(chave);
    const rotuloFinal = `${rotulo}${obrigatorio ? " *" : ""}`;
    if (tipo === "money") return (
      <MoneyField key={chave} label={rotuloFinal} valor={Number(form[chave] || 0)} onChange={(n) => setForm({ ...form, [chave]: n })} />
    );
    if (tipo === "bool") return (
      <div key={chave}>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>{rotuloFinal}</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[[true, "Sim"], [false, "Não"]].map(([v, t]) => (
            <button key={t} type="button" onClick={() => setForm({ ...form, [chave]: v })} style={opcao(form[chave] === v)}>
              {form[chave] === v && <CheckCircle2 size={15} />} {t}
            </button>
          ))}
        </div>
      </div>
    );
    const valor = tipo === "cpf" ? formatarCPF(form[chave]) : tipo === "tel" ? formatarTelefone(form[chave]) : (form[chave] ?? "");
    const set = (v) => setForm({ ...form, [chave]: tipo === "cpf" || tipo === "tel" ? soDigitos(v) : v });
    return <Field key={chave} label={rotuloFinal} val={valor} set={set} />;
  };

  const etapaAtual = ETAPAS[etapa];
  const ultima = etapa === ETAPAS.length - 1;

  const telaFinal = (icone, titulo, texto, cor) => (
    <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
      <div style={{ color: cor, display: "flex", justifyContent: "center", marginBottom: 14 }}>{icone}</div>
      <p style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{titulo}</p>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-dim)", lineHeight: 1.5 }}>{texto}</p>
    </div>
  );

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", background: "var(--bg-top)", padding: "24px 16px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <img src={logo} alt="SliceX.calc" style={{ height: 28, width: "auto" }} />
            {orgNome && <span style={{ fontSize: 13, color: "var(--text-dim)", borderLeft: "1px solid var(--border-strong)", paddingLeft: 14 }}>{orgNome}</span>}
          </div>

          {estado === "carregando" && <div className="skeleton" style={{ height: 220 }} />}
          {estado === "invalido" && telaFinal(<XCircle size={44} />, "Link inválido", "Este endereço não existe ou foi copiado de forma incompleta. Peça um novo link ao atendente.", "#ef4444")}
          {estado === "expirado" && telaFinal(<Clock3 size={44} />, "Link expirado", "Este link já não está mais disponível. Peça um novo ao atendente.", "#f59e0b")}
          {estado === "preenchido" && telaFinal(<ShieldCheck size={44} />, "Ficha já enviada", "Os seus dados já foram recebidos. Obrigado!", "#4493F8")}
          {estado === "enviado" && telaFinal(<CheckCircle2 size={44} />, "Ficha enviada com sucesso", "A equipe da loja recebeu os seus dados e entrará em contato. Você já pode fechar esta página.", "#22c55e")}

          {estado === "valido" && (
            <div {...ENTRADA}>
              <div style={{ marginBottom: 18 }}>
                <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Ficha financeira</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
                  Preencha no seu ritmo, de qualquer lugar. Leva poucos minutos e seus dados ficam protegidos.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {ETAPAS.map((e, i) => (
                  <div key={e.titulo} style={{ flex: 1 }}>
                    <div style={{ height: 6, borderRadius: 999, background: i <= etapa ? "#4493F8" : "var(--surface-3)", transition: "background .3s ease" }} />
                    <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: i === etapa ? 700 : 500, color: i === etapa ? "var(--text)" : "var(--text-mute)" }}>
                      {i + 1}. {e.titulo}
                    </p>
                  </div>
                ))}
              </div>

              <div style={card}>
                <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase" }}>{etapaAtual.titulo}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  {etapaAtual.campos.map(campo)}
                </div>
                <p style={{ margin: "14px 0 0", fontSize: 11, color: "var(--text-mute)" }}>* campos obrigatórios</p>

                {erro && <p role="alert" style={{ margin: "16px 0 0", padding: "10px 14px", borderRadius: "var(--r-sm)", border: "1px solid #ef4444", color: "var(--text)", fontSize: 13 }}>{erro}</p>}

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => { setErro(null); setEtapa((e) => Math.max(0, e - 1)); }} disabled={etapa === 0}
                    style={{ ...opcao(false), opacity: etapa === 0 ? 0.4 : 1 }}>
                    <ArrowLeft size={15} /> Voltar
                  </button>
                  {!ultima ? (
                    <PrimaryButton onClick={avancar} style={{ display: "flex", alignItems: "center", gap: 8 }}>Continuar <ArrowRight size={15} /></PrimaryButton>
                  ) : (
                    <PrimaryButton onClick={enviar} disabled={enviando} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {enviando ? <Loader2 size={15} className="spin" /> : <Send size={15} />} {enviando ? "Enviando…" : "Enviar ficha"}
                    </PrimaryButton>
                  )}
                </div>
              </div>

              <p style={{ margin: "14px 4px 0", fontSize: 11, color: "var(--text-mute)", lineHeight: 1.5 }}>
                As informações são usadas somente para analisar o financiamento do veículo.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
