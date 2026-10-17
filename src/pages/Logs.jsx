import { useEffect, useState } from "react";
import { ScrollText, ChevronDown, RefreshCw, Search } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho } from "../lib/rascunho";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" };
const PAGINA = 50;
const TABELAS = ["veiculos", "veiculo_custos", "veiculo_dados_financeiros", "veiculo_financiamentos", "veiculo_financiamento_parcelas", "veiculo_fotos", "veiculo_checklists", "veiculo_vendas", "organizacoes", "perfis", "configuracoes"];
const ROTULO_OP = { INSERT: "Criou", UPDATE: "Alterou", DELETE: "Excluiu" };
const COR_OP = { INSERT: "#4493F8", UPDATE: "#9198A1", DELETE: "#ffffff" };
const IGNORAR = ["id", "criado_em", "atualizado_em", "criado_por", "atualizado_por", "enviado_por", "registrado_por"];

const fmt = (v) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** O que mudou: para UPDATE, só os campos alterados; para INSERT/DELETE, os campos preenchidos. */
function mudancas(l) {
  if (l.operacao === "UPDATE") {
    return Object.keys(l.depois ?? {})
      .filter((k) => !IGNORAR.includes(k) && JSON.stringify(l.antes?.[k]) !== JSON.stringify(l.depois?.[k]))
      .map((k) => ({ campo: k, de: l.antes?.[k], para: l.depois?.[k] }));
  }
  const base = l.operacao === "INSERT" ? l.depois : l.antes;
  return Object.keys(base ?? {}).filter((k) => !IGNORAR.includes(k) && base[k] != null)
    .map((k) => ({ campo: k, de: l.operacao === "DELETE" ? base[k] : null, para: l.operacao === "INSERT" ? base[k] : null }));
}

export default function Logs() {
  const { perfil } = useAuth();
  const [filtros, setFiltros] = useRascunho("logs.filtros", { usuario: "", tabela: "", operacao: "", inicio: "", fim: "" });
  const [linhas, setLinhas] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState(null);
  const [aberto, setAberto] = useState(null);

  const consultar = async (p = 0) => {
    if (!supabaseConfigurado) return;
    setCarregando(true);
    setErro(null);
    let q = supabase.from("logs_sistema").select("*").order("criado_em", { ascending: false })
      .range(p * PAGINA, p * PAGINA + PAGINA - 1);
    if (filtros.usuario?.trim()) q = q.ilike("usuario_nome", `%${filtros.usuario.trim()}%`);
    if (filtros.tabela) q = q.eq("tabela", filtros.tabela);
    if (filtros.operacao) q = q.eq("operacao", filtros.operacao);
    if (filtros.inicio) q = q.gte("criado_em", new Date(`${filtros.inicio}T00:00:00`).toISOString());
    if (filtros.fim) q = q.lte("criado_em", new Date(`${filtros.fim}T23:59:59`).toISOString());
    const { data, error } = await q;
    setCarregando(false);
    if (error) { setErro(error.message); return; }
    setLinhas(p === 0 ? (data ?? []) : [...linhas, ...(data ?? [])]);
    setTemMais((data ?? []).length === PAGINA);
    setPagina(p);
  };

  useEffect(() => {
    if (perfil?.papel === "admin_master") consultar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.papel]);

  if (perfil && perfil.papel !== "admin_master") {
    return (
      <PageTransition>
        <div className="page-bg"><Header subtitle="Logs" /><div className="container" style={{ paddingTop: 8 }}>
          <BackLink /><p style={{ color: "var(--text-dim)", marginTop: 22 }}>Somente o administrador acessa os logs.</p>
        </div></div>
      </PageTransition>
    );
  }

  const selectStyle = { width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Logs de auditoria" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <ScrollText size={22} /> Logs
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>Tudo o que foi criado, alterado ou excluído na plataforma, por quem e quando.</p>

          <div style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
            <Field label="Usuário" val={filtros.usuario} set={(v) => setFiltros({ ...filtros, usuario: v })} hint="Nome" />
            <div>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Tabela</label>
              <select value={filtros.tabela} onChange={(e) => setFiltros({ ...filtros, tabela: e.target.value })} style={selectStyle}>
                <option value="">Todas</option>
                {TABELAS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Ação</label>
              <select value={filtros.operacao} onChange={(e) => setFiltros({ ...filtros, operacao: e.target.value })} style={selectStyle}>
                <option value="">Todas</option>
                <option value="INSERT">Criou</option>
                <option value="UPDATE">Alterou</option>
                <option value="DELETE">Excluiu</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>De</label>
              <input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} style={selectStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Até</label>
              <input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} style={selectStyle} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <PrimaryButton onClick={() => consultar(0)} disabled={carregando} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Search size={15} /> {carregando ? "Consultando…" : "Consultar"}
            </PrimaryButton>
          </div>
          {erro && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Não foi possível carregar: {erro}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {linhas.map((l) => {
              const aberta = aberto === l.id;
              const itens = mudancas(l);
              return (
                <div key={l.id} style={{ ...card, padding: "12px 14px" }}>
                  <button onClick={() => setAberto(aberta ? null : l.id)} style={{ width: "100%", background: "none", border: "none", padding: 0, color: "var(--text)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: `1px solid ${COR_OP[l.operacao]}`, color: COR_OP[l.operacao], fontWeight: 700 }}>{ROTULO_OP[l.operacao]}</span>
                    <span style={{ flex: 1, minWidth: 160, fontSize: 13, fontWeight: 600 }}>{l.usuario_nome || "Sistema"} <span style={{ color: "var(--text-mute)", fontWeight: 400 }}>· {l.papel || "—"}</span></span>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{l.tabela}</span>
                    <span style={{ fontSize: 12, color: "var(--text-mute)" }}>{new Date(l.criado_em).toLocaleString("pt-BR")}</span>
                    <ChevronDown size={16} style={{ transform: aberta ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
                  </button>
                  {aberta && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-mute)" }}>Registro {l.registro_id || "—"}</p>
                      {itens.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Nenhum campo relevante alterado.</p>}
                      {itens.map((it) => (
                        <div key={it.campo} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, fontSize: 12, padding: "4px 0" }}>
                          <span style={{ color: "var(--text-dim)" }}>{it.campo}</span>
                          <span style={{ color: "var(--text)", wordBreak: "break-word" }}>
                            {l.operacao === "UPDATE" ? <>{fmt(it.de)} <span style={{ color: "var(--accent)" }}>→</span> {fmt(it.para)}</> : fmt(it.para ?? it.de)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!carregando && linhas.length === 0 && !erro && <p style={{ color: "var(--text-mute)", fontSize: 13, marginTop: 14 }}>Nenhum registro com esses filtros.</p>}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
            {temMais && <PrimaryButton onClick={() => consultar(pagina + 1)} disabled={carregando} style={{ display: "flex", alignItems: "center", gap: 8 }}><RefreshCw size={14} /> {carregando ? "Carregando…" : "Carregar mais"}</PrimaryButton>}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
