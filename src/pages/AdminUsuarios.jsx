import { ESTILOS_USUARIOS } from "./admin-usuarios-estilos";
import { useRascunho } from "../lib/rascunho";
import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
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
  const [form, setForm] = useRascunho("usr.form", FORM_VAZIO, { ignorar: ["senha"] });
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
        <div className="cc-novo min-h-screen bg-surface">
          <Header subtitle="Usuários" />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <BackLink />
            <p className="mt-6 text-sm font-label text-on-surface-variant">Você não tem permissão para acessar esta página.</p>
          </main>
        </div>
      </PageTransition>
    );
  }

  const papeis = souAdmin ? ["admin_master", "proprietario", "gerente", "vendedor"] : ["gerente", "vendedor"];
  const ehLojista = form.papel === "proprietario";
  const precisaLoja = souAdmin && !["admin_master", "proprietario"].includes(form.papel);

  const validarCadastro = () => {
    if (form.cpf && !cpfValido(form.cpf)) return "CPF inválido. Confira os dígitos verificadores.";
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
    if (editando.cpf && !cpfValido(editando.cpf)) { setMsg({ tipo: "erro", texto: "CPF inválido. Confira os dígitos verificadores." }); return; }
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
    const { erro } = await rpc("admin_atualizar_usuario", { p_id: u.id, p_nome: null, p_papel: papel, p_cpf: null, p_telefone: null });
    if (erro) setMsg({ tipo: "erro", texto: erro }); else carregar();
  };

  const kpis = {
    total: lista.length,
    ativos: lista.filter((u) => u.ativo).length,
    admins: lista.filter((u) => u.papel === "admin_master").length,
    lojistas: lista.filter((u) => u.papel === "proprietario").length,
    gerentes: lista.filter((u) => u.papel === "gerente").length,
    vendedores: lista.filter((u) => u.papel === "vendedor").length,
  };
  const iniciais = (nome) => (nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const pct = (n) => (kpis.total ? Math.round((n / kpis.total) * 100) : 0);

  const campo = "w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface text-sm font-label placeholder:text-outline/50 shadow-sm focus:outline-none focus:border-primary transition-all";
  const seletor = campo + " appearance-none cursor-pointer";
  const rotulo = "text-xs font-label font-bold text-on-surface";

  return (
    <PageTransition>
      <div className="cc-novo relative min-h-screen overflow-x-clip bg-surface font-body text-on-surface antialiased">
        <style>{ESTILOS_USUARIOS}</style>
        <Header subtitle="Gestão de usuários" />
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          <BackLink />

          <section className="relative z-10 flex flex-col justify-between gap-6 pb-2 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container text-primary shadow-[0_4px_16px_rgba(37,99,235,0.12)] ring-1 ring-primary/10 transition-transform duration-300 hover:scale-105">
                <span className="material-symbols-outlined text-[32px]">group</span>
              </div>
              <div className="flex flex-col">
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface lg:text-4xl">Usuários</h1>
                <p className="mt-1.5 font-label text-sm text-on-surface-variant">
                  {souAdmin ? "Você pode criar, alterar, suspender e excluir qualquer usuário." : "Você pode criar e gerenciar gerentes e vendedores da sua loja."}
                </p>
              </div>
            </div>
          </section>

          <section className="relative z-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {[
              { titulo: "Total de Usuários", valor: kpis.total, sub: `${kpis.ativos} ativos`, icone: "badge", barra: 100 },
              { titulo: "Administradores", valor: kpis.admins, sub: `${pct(kpis.admins)}% do total`, icone: "shield_person", barra: pct(kpis.admins) },
              { titulo: "Lojistas", valor: kpis.lojistas, sub: `${pct(kpis.lojistas)}% do total`, icone: "storefront", barra: pct(kpis.lojistas) },
              { titulo: "Gerentes", valor: kpis.gerentes, sub: `${pct(kpis.gerentes)}% do total`, icone: "manage_accounts", barra: pct(kpis.gerentes) },
              { titulo: "Vendedores", valor: kpis.vendedores, sub: `${pct(kpis.vendedores)}% do total`, icone: "sell", barra: pct(kpis.vendedores) },
            ].map((k) => (
              <div key={k.titulo} className="layer-card-shadow group relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/95 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{k.titulo}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-fixed text-on-secondary-fixed transition-transform duration-200 group-hover:scale-110">
                    <span className="material-symbols-outlined text-[20px]">{k.icone}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{k.valor}</span>
                  <span className="flex items-center gap-0.5 font-label text-xs font-semibold text-secondary">{k.sub}</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${k.barra}%` }} />
                </div>
              </div>
            ))}
          </section>

          <section className="relative z-10">
            <div className="layer-form-shadow relative overflow-hidden rounded-3xl border border-outline-variant/35 bg-surface-container-lowest/95 p-6 backdrop-blur-md sm:p-8 lg:p-10">
              <div className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant/20 pb-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/80 text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">person_add_alt</span>
                  </div>
                  <div>
                    <span className="font-label text-[11px] font-bold uppercase tracking-widest text-primary">Formulário de Cadastro</span>
                    <h2 className="font-headline text-lg font-extrabold tracking-tight text-on-surface">NOVO USUÁRIO</h2>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-secondary/20 bg-secondary-container/20 px-3 py-1 font-label text-xs font-semibold text-secondary sm:self-auto">
                  <span className="material-symbols-outlined text-[16px] text-secondary">bolt</span>
                  <span>Auto-ativação imediata</span>
                </div>
              </div>

              <form onSubmit={criar} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className={rotulo}>Nome</label>
                    <input className={campo} placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={rotulo}>E-mail</label>
                    <input type="email" className={campo} placeholder="usuario@loja.com.br" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={rotulo}>Senha temporária</label>
                    <input type="password" className={campo} placeholder="Mínimo 8 caracteres" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={rotulo}>CPF</label>
                    <input className={campo + " font-mono"} placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatarCPF(e.target.value) })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={rotulo}>Telefone / WhatsApp</label>
                    <input className={campo + " font-mono"} placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={rotulo}>Papel</label>
                    <select className={seletor} value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
                      {["admin_master", "proprietario", "gerente", "vendedor"].map((p) => <option key={p} value={p} disabled={!papeis.includes(p)}>{ROTULO[p]}</option>)}
                    </select>
                  </div>
                  {precisaLoja && (
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Loja</label>
                      <select className={seletor} value={form.organizacao_id} onChange={(e) => setForm({ ...form, organizacao_id: e.target.value })}>
                        <option value="">Selecione…</option>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {ehLojista && souAdmin && !form.organizacao_id && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Nome da loja</label>
                      <input className={campo} placeholder="Ex: Auto Center Silva" value={form.nome_loja} onChange={(e) => setForm({ ...form, nome_loja: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>CNPJ da loja</label>
                      <input className={campo + " font-mono"} placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: formatarCNPJ(e.target.value) })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Telefone comercial</label>
                      <input className={campo + " font-mono"} placeholder="(00) 0000-0000" value={form.telefone_comercial} onChange={(e) => setForm({ ...form, telefone_comercial: formatarTelefone(e.target.value) })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Endereço</label>
                      <input className={campo} placeholder="Rua, número, bairro, cidade/UF" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={salvando}
                  className="w-full rounded-xl bg-primary py-3.5 font-label text-sm font-bold text-on-primary shadow-[0_8px_16px_-4px_rgba(37,99,235,0.35)] transition-all hover:bg-primary-container disabled:opacity-60">
                  {salvando ? "Criando…" : "Criar usuário"}
                </button>
              </form>
            </div>
          </section>

          <section className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-lg font-extrabold tracking-tight text-on-surface">Membros da equipe</h2>
              <span className="font-label text-xs font-semibold text-on-surface-variant">{kpis.total} cadastrados</span>
            </div>
            {lista.map((u) => (
              <article key={u.id} className="usuario-card relative rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/95 p-5 backdrop-blur-sm lg:p-6 layer-card-shadow">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-start gap-4 sm:items-center">
                    <div className="relative flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high font-headline text-base font-bold text-primary shadow-sm ring-1 ring-primary/10">
                        {iniciais(u.nome)}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-surface-container-lowest ${u.ativo ? "bg-secondary" : "bg-outline"}`} title={u.ativo ? "Ativo" : "Suspenso"} />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-headline text-base font-bold text-on-surface">{u.nome || "Sem nome"}</h4>
                        <span className="rounded-md bg-secondary-fixed px-2 py-0.5 font-label text-[10px] font-bold tracking-wider text-on-secondary-fixed">{(ROTULO[u.papel] || u.papel).toUpperCase()}</span>
                        {!u.ativo && <span className="rounded-md bg-error-container px-2 py-0.5 font-label text-[10px] font-bold tracking-wider text-on-error-container">SUSPENSO</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-label text-xs text-on-surface-variant">
                        <span>{u.email ?? "—"}</span>
                        {u.cpf && <><span className="text-outline-variant">•</span><span className="font-mono">CPF {formatarCPF(u.cpf)}</span></>}
                        {u.telefone && <><span className="text-outline-variant">•</span><span className="font-mono">{formatarTelefone(u.telefone)}</span></>}
                        <span className="text-outline-variant">•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          <span className="material-symbols-outlined text-[14px]">storefront</span>
                          {u.organizacao_nome ?? "Sem loja"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select value={u.papel} onChange={(e) => mudarPapel(u, e.target.value)} disabled={u.id === sessao?.user?.id}
                      className="cursor-pointer appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low py-2 pl-3.5 pr-8 font-label text-xs font-bold text-on-surface shadow-sm transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60">
                      {[...new Set([...papeis, u.papel])].map((p) => <option key={p} value={p} disabled={!papeis.includes(p)}>{ROTULO[p]}</option>)}
                    </select>
                    <button onClick={() => abrirEdicao(u)} className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-label text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container">
                      <span className="material-symbols-outlined text-[16px]">edit</span> Editar
                    </button>
                    {u.id !== sessao?.user?.id && (
                      <>
                        {u.ativo
                          ? <button onClick={() => executar("suspender", u.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-label text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container"><span className="material-symbols-outlined text-[16px]">pause_circle</span> Suspender</button>
                          : <button onClick={() => executar("reativar", u.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-label text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container"><span className="material-symbols-outlined text-[16px]">play_circle</span> Reativar</button>}
                        <button onClick={() => executar("excluir", u.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 font-label text-xs font-semibold text-error transition-colors hover:bg-error-container/70">
                          <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>

        {msg && (
          <div role="status" className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl bg-inverse-surface px-4 py-3 font-label text-sm text-inverse-on-surface shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            {msg.texto}
          </div>
        )}

        {editando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant/30 bg-surface-container-lowest/95 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8">
              <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/80 text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-base font-bold text-on-surface">Editar Dados do Usuário</h3>
                    <p className="font-label text-xs text-on-surface-variant">Atualize as credenciais e lojas de acesso</p>
                  </div>
                </div>
                <button type="button" onClick={() => setEditando(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className={rotulo}>Nome</label>
                  <input className={campo} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={rotulo}>CPF</label>
                  <input className={campo + " font-mono"} placeholder="000.000.000-00" value={editando.cpf} onChange={(e) => setEditando({ ...editando, cpf: formatarCPF(e.target.value) })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={rotulo}>Telefone / WhatsApp</label>
                  <input className={campo + " font-mono"} placeholder="(00) 00000-0000" value={editando.telefone} onChange={(e) => setEditando({ ...editando, telefone: formatarTelefone(e.target.value) })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={rotulo}>Papel</label>
                  <select className={seletor} value={editando.papel} disabled={!souAdmin && editando.papel === "proprietario"} onChange={(e) => setEditando({ ...editando, papel: e.target.value })}>
                    {["admin_master", "proprietario", "gerente", "vendedor"].map((p) => <option key={p} value={p} disabled={!papeis.includes(p)}>{ROTULO[p]}</option>)}
                  </select>
                </div>
                {editando.papel === "proprietario" && editando.organizacao_id && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Nome da loja</label>
                      <input className={campo} value={editando.org_nome} onChange={(e) => setEditando({ ...editando, org_nome: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>CNPJ da loja</label>
                      <input className={campo + " font-mono"} placeholder="00.000.000/0000-00" value={editando.org_cnpj} onChange={(e) => setEditando({ ...editando, org_cnpj: formatarCNPJ(e.target.value) })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Telefone comercial</label>
                      <input className={campo + " font-mono"} placeholder="(00) 0000-0000" value={editando.org_telefone} onChange={(e) => setEditando({ ...editando, org_telefone: formatarTelefone(e.target.value) })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={rotulo}>Endereço</label>
                      <input className={campo} value={editando.org_endereco} onChange={(e) => setEditando({ ...editando, org_endereco: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-outline-variant/20 pt-5">
                <button type="button" onClick={() => setEditando(null)} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-5 py-2.5 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container">Cancelar</button>
                <button type="button" onClick={salvarEdicao} className="rounded-xl bg-primary px-5 py-2.5 font-label text-sm font-bold text-on-primary shadow-[0_8px_16px_-4px_rgba(37,99,235,0.35)] transition-all hover:bg-primary-container">Salvar alterações</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
