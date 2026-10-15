import { useEffect, useState } from "react";
import { Users, UserPlus, Ban, CheckCircle2, Trash2 } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 18 };
const PAPEL = { admin_master: "Administrador", proprietario: "Lojista", gerente: "Gerente", vendedor: "Vendedor" };
const selectStyle = { width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 };
const botao = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" };

export default function Usuarios() {
  const { perfil, sessao } = useAuth();
  const souAdmin = perfil?.papel === "admin_master";
  const papeis = souAdmin ? ["proprietario", "gerente", "vendedor"] : ["gerente", "vendedor"];
  const [lista, setLista] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({ email: "", nome: "", papel: "vendedor", organizacao_id: "", nome_loja: "" });
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from("v_usuarios").select("*").order("nome");
    setLista(data ?? []);
    if (souAdmin) {
      const { data: o } = await supabase.from("organizacoes").select("id, nome").order("nome");
      setOrgs(o ?? []);
    }
  };
  useEffect(() => { carregar(); }, [souAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const chamar = async (corpo, sucesso) => {
    setEnviando(true);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke("gerenciar-usuarios", { body: corpo });
    setEnviando(false);
    const erro = data?.error || error?.message;
    if (erro) { setMsg({ tipo: "erro", texto: erro }); return; }
    setMsg({ tipo: "ok", texto: sucesso });
    carregar();
  };

  const criar = (e) => {
    e.preventDefault();
    chamar({ acao: "criar", ...form, organizacao_id: form.organizacao_id || null },
      `Convite enviado para ${form.email}.`);
  };

  const podeAgir = (u) => u.id !== sessao?.user?.id && (souAdmin || ["gerente", "vendedor"].includes(u.papel));

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Administração de usuários" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={22} /> Usuários
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 18px", lineHeight: 1.6 }}>
            {souAdmin
              ? "Crie lojistas, gerentes e vendedores. Lojistas são criados com uma loja própria."
              : "Crie e gerencie gerentes e vendedores da sua loja."}
          </p>

          <div style={{ ...card, marginBottom: 14 }}>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <UserPlus size={15} /> Novo usuário
            </p>
            <form onSubmit={criar} style={{ display: "grid", gap: 12 }}>
              <Field label="E-mail" val={form.email} set={(v) => setForm({ ...form, email: v })} hint="pessoa@loja.com.br" />
              <Field label="Nome" val={form.nome} set={(v) => setForm({ ...form, nome: v })} hint="Nome completo" />
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Perfil</label>
                <select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })} style={selectStyle}>
                  {papeis.map((p) => <option key={p} value={p}>{PAPEL[p]}</option>)}
                </select>
              </div>
              {souAdmin && form.papel === "proprietario" && (
                <Field label="Nome da loja" val={form.nome_loja} set={(v) => setForm({ ...form, nome_loja: v })} hint="Ex: Auto Center Sul" />
              )}
              {souAdmin && form.papel !== "proprietario" && (
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Loja</label>
                  <select value={form.organizacao_id} onChange={(e) => setForm({ ...form, organizacao_id: e.target.value })} style={selectStyle}>
                    <option value="">Selecione a loja</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
              )}
              <PrimaryButton type="submit" disabled={enviando || !form.email || !form.nome} style={{ width: "100%" }}>
                {enviando ? "Enviando…" : "Enviar convite"}
              </PrimaryButton>
            </form>
            {msg && (
              <div role="status" style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>
                {msg.texto}
              </div>
            )}
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {lista.length === 0 && <p style={{ padding: 18, margin: 0, fontSize: 13, color: "var(--text-mute)" }}>Nenhum usuário encontrado.</p>}
            {lista.map((u, i) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 18px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{u.nome || u.email}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 3 }}>
                    {u.email} · {PAPEL[u.papel] ?? u.papel} · {u.loja ?? "—"} · {u.ativo ? "Ativo" : "Suspenso"}
                  </div>
                </div>
                {podeAgir(u) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {u.ativo ? (
                      <button style={botao} disabled={enviando} onClick={() => chamar({ acao: "suspender", user_id: u.id }, "Usuário suspenso.")}>
                        <Ban size={13} /> Suspender
                      </button>
                    ) : (
                      <button style={botao} disabled={enviando} onClick={() => chamar({ acao: "reativar", user_id: u.id }, "Usuário reativado.")}>
                        <CheckCircle2 size={13} /> Reativar
                      </button>
                    )}
                    <button style={botao} disabled={enviando} onClick={() => {
                      if (window.confirm(`Excluir o acesso de ${u.email}?`)) chamar({ acao: "excluir", user_id: u.id }, "Acesso removido.");
                    }}>
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
