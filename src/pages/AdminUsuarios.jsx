import { useEffect, useState, useCallback } from "react";
import { Users, Ban, CheckCircle2, Trash2, Pencil } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import Modal from "../components/Modal";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { formatarCPF, formatarCNPJ, formatarTelefone, soDigitos, cpfValido, cnpjValido, telefoneValido } from "../lib/mascaras";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };
const sel = { width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 };
const btn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const ROTULO = { admin_master: "Administrador", proprietario: "Lojista", gerente: "Gerente", vendedor: "Vendedor" };
const FORM_VAZIO = { nome: "", email: "", senha: "", cpf: "", telefone: "", papel: "vendedor", organizacao_id: "", nome_loja: "", cnpj: "", telefone_comercial: "", endereco: "" };

async function rpc(nome, args) {
  const { data, error } = await supabase.rpc(nome, args);
  return error ? { erro: error.message } : { data };
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminUsuarios() {
  const { perfil, sessao } = useAuth();
  const souAdmin = perfil?.papel === "admin_master";
  const [lista, setLista] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    const { data, erro } = await rpc("admin_listar_usuarios");
    if (erro) { setMsg({ tipo: "erro", texto: erro }); return; }
    setLista(data ?? []);
    const { data: os } = await supabase.from("organizacoes").select("id, nome");
    setOrgs(os ?? []);
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
  const ehLojista = form.papel === "proprietario";
  const precisaLoja = souAdmin && !["admin_master", "proprietario"].includes(form.papel);

  const validarCadastro = () => {
    if (form.cpf && !cpfValido(form.cpf)) return "CPF incompleto.";
    if (form.telefone && !telefoneValido(form.telefone)) return "Telefone incompleto.";
    if (ehLojista && souAdmin && !form.organizacao_id) {
      if (!form.nome_loja.trim()) return "Informe o nome da loja.";
      if (form.cnpj && !cnpjValido(form.cnpj)) return "CNPJ incompleto.";
      if (form.telefone_comercial && !telefoneValido(form.telefone_comercial)) return "Telefone comercial incompleto.";
    }
    return null;
  };

  const criar = async (e) => {
    e.preventDefault();
    setMsg(null);
    const invalido = validarCadastro();
    if (invalido) { setMsg({ tipo: "erro", texto: invalido }); return; }
    setSalvando(true);
    const { erro } = await rpc("admin_criar_usuario", {
      p_email: form.email,
      p_senha: form.senha,
      p_nome: form.nome,
      p_papel: form.papel,
      p_cpf: soDigitos(form.cpf) || null,
      p_telefone: soDigitos(form.telefone) || null,
      p_organizacao: form.organizacao_id || null,
      p_nome_loja: form.nome_loja || null,
      p_cnpj: soDigitos(form.cnpj) || null,
      p_telefone_comercial: soDigitos(form.telefone_comercial) || null,
      p_endereco: form.endereco || null,
    });
    setSalvando(false);
    if (erro) { setMsg({ tipo: "erro", texto: erro }); return; }
    setMsg({ tipo: "ok", texto: "Usuário criado. Envie a senha temporária por um canal seguro." });
    setForm(FORM_VAZIO);
    carregar();
  };

  const abrirEdicao = (u) => setEditando({
    id: u.id, nome: u.nome ?? "", cpf: formatarCPF(u.cpf ?? ""), telefone: formatarTelefone(u.telefone ?? ""),
    papel: u.papel, organizacao_id: u.organizacao_id, org_nome: u.organizacao_nome ?? "",
    org_cnpj: formatarCNPJ(u.organizacao_cnpj ?? ""), org_telefone: formatarTelefone(u.organizacao_telefone ?? ""),
    org_endereco: u.organizacao_endereco ?? "",
  });

  const salvarEdicao = async () => {
    setMsg(null);
    if (editando.cpf && !cpfValido(editando.cpf)) { setMsg({ tipo: "erro", texto: "CPF incompleto." }); return; }
    if (editando.telefone && !telefoneValido(editando.telefone)) { setMsg({ tipo: "erro", texto: "Telefone incompleto." }); return; }
    const { erro: erroUsuario } = await rpc("admin_atualizar_usuario", {
      p_id: editando.id, p_nome: editando.nome, p_papel: editando.papel,
      p_cpf: soDigitos(editando.cpf), p_telefone: soDigitos(editando.telefone),
    });
    if (erroUsuario) { setMsg({ tipo: "erro", texto: erroUsuario }); return; }
    if (editando.papel === "proprietario" && editando.organizacao_id) {
      const { erro: erroLoja } = await rpc("admin_atualizar_organizacao", {
        p_org: editando.organizacao_id, p_nome: editando.org_nome,
        p_cnpj: soDigitos(editando.org_cnpj), p_telefone: soDigitos(editando.org_telefone),
        p_endereco: editando.org_endereco,
      });
      if (erroLoja) { setMsg({ tipo: "erro", texto: erroLoja }); return; }
    }
    setEditando(null);
    setMsg({ tipo: "ok", texto: "Dados atualizados." });
    carregar();
  };

  const executar = async (acao, id) => {
    if (acao === "excluir" && !window.confirm("Excluir este usuário? A ação não pode ser desfeita.")) return;
    setMsg(null);
    const { erro } = acao === "excluir"
      ? await rpc("admin_excluir_usuario", { p_id: id })
      : await rpc("admin_definir_suspenso", { p_id: id, p_suspenso: acao === "suspender" });
    if (erro) setMsg({ tipo: "erro", texto: erro }); else carregar();
  };

  const mudarPapel = async (u, papel) => {
    setMsg(null);
    const { erro } = await rpc("admin_atualizar_usuario", { p_id: u.id, p_nome: null, p_papel: papel, p_cpf: "", p_telefone: "" });
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
              <Field label="CPF" val={form.cpf} set={(v) => setForm({ ...form, cpf: formatarCPF(v) })} hint="000.000.000-00" />
              <Field label="Telefone / WhatsApp" val={form.telefone} set={(v) => setForm({ ...form, telefone: formatarTelefone(v) })} hint="(00) 00000-0000" />
              <Campo label="Papel">
                <select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })} style={sel}>
                  {papeis.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
                </select>
              </Campo>
              {precisaLoja && (
                <Campo label="Loja">
                  <select value={form.organizacao_id} onChange={(e) => setForm({ ...form, organizacao_id: e.target.value })} style={sel}>
                    <option value="">Selecione…</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </Campo>
              )}
            </div>

            {ehLojista && souAdmin && !form.organizacao_id && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                <Field label="Nome da loja" val={form.nome_loja} set={(v) => setForm({ ...form, nome_loja: v })} hint="Ex: Auto Center Silva" />
                <Field label="CNPJ da loja" val={form.cnpj} set={(v) => setForm({ ...form, cnpj: formatarCNPJ(v) })} hint="00.000.000/0000-00" />
                <Field label="Telefone comercial" val={form.telefone_comercial} set={(v) => setForm({ ...form, telefone_comercial: formatarTelefone(v) })} hint="(00) 0000-0000" />
                <Field label="Endereço" val={form.endereco} set={(v) => setForm({ ...form, endereco: v })} hint="Rua, número, bairro, cidade/UF" />
              </div>
            )}

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
                  <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                    {u.email ?? "—"}{u.cpf ? ` · CPF ${formatarCPF(u.cpf)}` : ""}{u.telefone ? ` · ${formatarTelefone(u.telefone)}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{u.organizacao_nome ?? "Sem loja"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={u.papel} onChange={(e) => mudarPapel(u, e.target.value)}
                    style={{ ...sel, width: "auto", padding: "7px 10px", fontSize: 12 }} disabled={u.id === sessao?.user?.id}>
                    {papeis.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
                  </select>
                  <button style={btn} onClick={() => abrirEdicao(u)}><Pencil size={13} /> Editar</button>
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

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar usuário"
        footer={<PrimaryButton onClick={salvarEdicao} style={{ width: "100%" }}>Salvar alterações</PrimaryButton>}>
        {editando && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nome" val={editando.nome} set={(v) => setEditando({ ...editando, nome: v })} />
            <Field label="CPF" val={editando.cpf} set={(v) => setEditando({ ...editando, cpf: formatarCPF(v) })} hint="000.000.000-00" />
            <Field label="Telefone / WhatsApp" val={editando.telefone} set={(v) => setEditando({ ...editando, telefone: formatarTelefone(v) })} hint="(00) 00000-0000" />
            <Campo label="Papel">
              <select value={editando.papel} onChange={(e) => setEditando({ ...editando, papel: e.target.value })} style={sel}
                disabled={!souAdmin && editando.papel === "proprietario"}>
                {papeis.map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
              </select>
            </Campo>
            {editando.papel === "proprietario" && editando.organizacao_id && (
              <>
                <Field label="Nome da loja" val={editando.org_nome} set={(v) => setEditando({ ...editando, org_nome: v })} />
                <Field label="CNPJ da loja" val={editando.org_cnpj} set={(v) => setEditando({ ...editando, org_cnpj: formatarCNPJ(v) })} hint="00.000.000/0000-00" />
                <Field label="Telefone comercial" val={editando.org_telefone} set={(v) => setEditando({ ...editando, org_telefone: formatarTelefone(v) })} hint="(00) 0000-0000" />
                <Field label="Endereço" val={editando.org_endereco} set={(v) => setEditando({ ...editando, org_endereco: v })} />
              </>
            )}
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
