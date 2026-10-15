import { useEffect, useState, useCallback } from "react";
import { Users, Ban, CheckCircle2, Trash2 } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };
const sel = { width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 };
const btn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const ROTULO = { admin_master: "Administrador", proprietario: "Lojista", gerente: "Gerente", vendedor: "Vendedor" };

async function chamar(acao, corpo = {}) {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", { body: { acao, ...corpo } });
  if (error) {
    let texto = error.message;
    try { const j = await error.context.json(); if (j?.error) texto = j.error; } catch { /* mantém a mensagem padrão */ }
    return { erro: texto };
  }
  return { data };
}

const FORM_VAZIO = { nome: "", email: "", senha: "", papel: "vendedor", organizacao_id: "", nome_loja: "" };

export default function AdminUsuarios() {
  const { perfil, sessao } = useAuth();
  const souAdmin = perfil?.papel === "admin_master";
  const [lista, setLista] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, erro } = await chamar("listar");
    if (erro) setMsg({ tipo: "erro", texto: erro });
    else { setLista(data.usuarios ?? []); setOrgs(data.organizacoes ?? []); }
  }, []);

  useEffect(() => { if (perfil) carregar(); }, [perfil, carregar]);

  if (!["admin_master", "proprietario"].includes(perfil?.papel)) {
    return (
      <PageTransition>
        <div className="page-bg">
          <Header subtitle="Usuários" />
          <div className="container" style={{ paddingTop: 8 }}>
            <BackLink />
            <p style={{ color: "var(--text-dim)", marginTop: 22 }}>Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const papeis = souAdmin ? ["admin_master", "proprietario", "gerente", "vendedor"] : ["gerente", "vendedor"];

  const criar = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSalvando(true);
    const { erro } = await chamar("criar", form);
    setSalvando(false);
    if (erro) { setMsg({ tipo: "erro", texto: erro }); return; }
    setMsg({ tipo: "ok", texto: "Usuário criado. Envie a senha temporária por um canal seguro." });
    setForm(FORM_VAZIO);
    carregar();
  };

  const executar = async (acao, id) => {
    if (acao === "excluir" && !window.confirm("Excluir este usuário? A ação não pode ser desfeita.")) return;
    setMsg(null);
    const { erro } = await chamar(acao, { id });
    if (erro) setMsg({ tipo: "erro", texto: erro }); else carregar();
  };

  const mudarPapel = async (id, papel) => {
    setMsg(null);
    const { erro } = await chamar("atualizar", { id, papel });
    if (erro) setMsg({ tipo: "erro", texto: erro }); else carregar();
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Gestão de usuários" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={22} /> Usuários
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 18px" }}>
            {souAdmin ? "Você pode criar, alterar, suspender e excluir qualquer usuário." : "Você pode criar e gerenciar gerentes e vendedores da sua loja."}
          </p>

          <form onSubmit={criar} style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Novo usuário</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
              <Field label="Nome" val={form.nome} set={(v) => setForm({ ...form, nome: v })} hint="Nome completo" />
              <Field label="E-mail" val={form.email} set={(v) => setForm({ ...form, email: v })} hint="usuario@loja.com.br" />
              <Field label="Senha temporária" val={form.senha} set={(v) => setForm({ ...form, senha: v })} hint="Mínimo 8 caracteres" />
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Papel</label>
                <select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })} style={sel}>
                  {papeis.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
                </select>
              </div>
              {souAdmin && form.papel === "proprietario" && (
                <Field label="Nome da loja (nova)" val={form.nome_loja} set={(v) => setForm({ ...form, nome_loja: v })} hint="Ex: Auto Center Silva" />
              )}
              {souAdmin && !["admin_master", "proprietario"].includes(form.papel) && (
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>Loja</label>
                  <select value={form.organizacao_id} onChange={(e) => setForm({ ...form, organizacao_id: e.target.value })} style={sel}>
                    <option value="">Selecione…</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
            <PrimaryButton type="submit" disabled={salvando} style={{ width: "100%" }}>
              {salvando ? "Criando…" : "Criar usuário"}
            </PrimaryButton>
          </form>

          {msg && (
            <div role="status" style={{ marginTop: 14, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>
              {msg.texto}
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {lista.map((u) => (
              <div key={u.id} style={{ ...card, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>
                    {u.nome || "Sem nome"}{!u.ativo && <span style={{ fontSize: 11, color: "var(--text-mute)" }}> · suspenso</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{u.email ?? "—"} · {u.organizacoes?.nome ?? "Sem loja"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={u.papel} onChange={(e) => mudarPapel(u.id, e.target.value)} style={{ ...sel, width: "auto", padding: "7px 10px", fontSize: 12 }}
                    disabled={u.id === sessao?.user?.id}>
                    {papeis.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
                  </select>
                  {u.id !== sessao?.user?.id && (
                    <>
                      {u.ativo
                        ? <button style={btn} onClick={() => executar("suspender", u.id)}><Ban size={13} /> Suspender</button>
                        : <button style={btn} onClick={() => executar("reativar", u.id)}><CheckCircle2 size={13} /> Reativar</button>}
                      <button style={btn} onClick={() => executar("excluir", u.id)}><Trash2 size={13} /> Excluir</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
