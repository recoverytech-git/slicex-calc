import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Save, Check, Image as ImageIcon, FileDown } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import PrimaryButton from "../components/PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho, limparRascunho } from "../lib/rascunho";
import { SECOES, FICHA_VAZIA, gerarPdf, gerarPngBlob, nomeArquivo, baixar } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos, cpfValido } from "../lib/mascaras";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginTop: 14 };
const titulo = { margin: "0 0 14px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const EDITAM = ["admin_master", "proprietario", "gerente"];

export default function Ficha() {
  const { id } = useParams();
  const { perfil, sessao } = useAuth();
  const papel = perfil?.papel;
  const [form, setForm] = useRascunho("ficha.form", FICHA_VAZIA);
  const [lead, setLead] = useState(null);
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const somenteLeitura = Boolean(id) && !EDITAM.includes(papel);

  useEffect(() => {
    if (!id || !supabaseConfigurado) return;
    supabase.from("leads").select("*").eq("id", id).maybeSingle().then(({ data, error }) => {
      if (error || !data) { setMsg({ tipo: "erro", texto: error?.message || "Ficha não encontrada." }); return; }
      setLead(data);
      setForm({ ...FICHA_VAZIA, ...(data.dados ?? {}) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const registro = () => ({ nome: form.nome, cpf: soDigitos(form.cpf), telefone: soDigitos(form.telefone), dados: form });

  const salvar = async () => {
    setMsg(null);
    if (!form.nome?.trim()) { setMsg({ tipo: "erro", texto: "Informe o nome completo." }); return; }
    if (form.cpf && !cpfValido(form.cpf)) { setMsg({ tipo: "erro", texto: "CPF inválido. Confira os dígitos verificadores." }); return; }
    const dados = { nome: form.nome.trim(), cpf: soDigitos(form.cpf) || null, telefone: soDigitos(form.telefone) || null, dados: form };
    setSalvando(true);
    if (lead) {
      const { error } = await supabase.from("leads").update({ ...dados, atualizado_em: new Date().toISOString(), atualizado_por: sessao?.user?.id }).eq("id", lead.id);
      setSalvando(false);
      if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
      setMsg({ tipo: "ok", texto: "Ficha atualizada." });
    } else {
      const { error } = await supabase.from("leads").insert({ ...dados, organizacao_id: perfil?.organizacao_id ?? null, criado_por: sessao?.user?.id });
      setSalvando(false);
      if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
      setForm(FICHA_VAZIA);
      limparRascunho(["ficha.form"]);
      setMsg({ tipo: "ok", texto: "Ficha salva em Leads." });
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

  const opcao = (ativo) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${ativo ? "var(--accent)" : "var(--border-strong)"}`,
    background: ativo ? "rgba(68,147,248,0.14)" : "transparent", color: ativo ? "var(--text)" : "var(--text-dim)",
  });

  const campo = ([chave, rotulo, tipo]) => {
    if (tipo === "money") return <MoneyField key={chave} label={rotulo} valor={Number(form[chave] || 0)} onChange={(n) => setForm({ ...form, [chave]: n })} />;
    if (tipo === "bool") return (
      <div key={chave}>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>{rotulo}</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[[true, "Sim"], [false, "Não"]].map(([v, t]) => (
            <button key={t} type="button" onClick={() => setForm({ ...form, [chave]: v })} style={opcao(form[chave] === v)}>
              {form[chave] === v && <Check size={14} />} {t}
            </button>
          ))}
        </div>
      </div>
    );
    const valor = tipo === "cpf" ? formatarCPF(form[chave]) : tipo === "tel" ? formatarTelefone(form[chave]) : (form[chave] ?? "");
    const set = (v) => setForm({ ...form, [chave]: tipo === "cpf" || tipo === "tel" ? soDigitos(v) : v });
    return <Field key={chave} label={rotulo} val={valor} set={set} />;
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Ficha bancária" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={22} /> {id ? (lead?.nome || "Ficha financeira") : "Ficha bancária"}
          </h1>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-dim)" }}>
            {somenteLeitura ? "Visualização da ficha. Você não pode editar esta ficha." : "Preencha os dados do cliente. Ao salvar, a ficha aparece em Leads."}
          </p>
          {msg && <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}

          <div style={{ pointerEvents: somenteLeitura ? "none" : "auto", opacity: somenteLeitura ? 0.85 : 1 }}>
            {SECOES.map((s) => (
              <div key={s.titulo} style={card}>
                <p style={titulo}>{s.titulo}</p>
                <div className="grid-3">{s.campos.map(campo)}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={exportarPdf} style={opcao(false)}><FileDown size={15} /> Exportar PDF</button>
            <button onClick={exportarPng} style={opcao(false)}><ImageIcon size={15} /> Exportar PNG</button>
            {!somenteLeitura && (
              <PrimaryButton onClick={salvar} disabled={salvando} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Save size={15} /> {salvando ? "Salvando…" : lead ? "Salvar alterações" : "Salvar ficha"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
