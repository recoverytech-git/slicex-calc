// sem-rascunho: página de configuração, sem formulário de texto
import { useEffect, useState } from "react";
import { Settings, Upload, Trash2, Loader2, PanelLeft, PanelTop, Globe, Star, Image as ImageIcon } from "lucide-react";
import AtualizarCdi from "../components/AtualizarCdi";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import DbCabeca from "../components/DbCabeca";
import { DB_CSS } from "../components/dbEstilos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { atualizarMarca } from "../lib/marca";
import logoPadrao from "../assets/logo.png";

const CFG_CSS = `
.cfg-grid{display:grid;gap:16px;width:100%;grid-template-columns:1fr}
@media (min-width:760px){.cfg-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cfg-lift{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.cfg-lift:hover{transform:translateY(-2px);box-shadow:0 1px 3px rgba(15,23,42,.04),0 18px 32px -12px rgba(15,23,42,.14)}
.cfg-acoes{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.cfg-status{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700}
.cfg-preview{height:150px;border-radius:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e2e8f0;margin:16px 0;position:relative}
.cfg-preview img{max-width:70%;max-height:70%;object-fit:contain;transition:transform .3s cubic-bezier(.16,1,.3,1)}
.cfg-preview:hover img{transform:scale(1.04)}
.cfg-vazio{font-size:12px;color:#94a3b8;font-weight:600}
.cfg-tag{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;white-space:nowrap}
.cfg-danger:hover{color:#b91c1c;border-color:#fecaca;background:#fef2f2}
.cfg-titulo-grupo{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:15px;font-weight:800;color:var(--text);margin:26px 0 10px;letter-spacing:.01em;text-transform:uppercase}
@keyframes cfgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cfg-enter{animation:cfgIn .5s cubic-bezier(.16,1,.3,1) both}
`;

const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_BYTES = 2 * 1024 * 1024;

const GRUPOS = [
  { titulo: "Menu lateral (sidebar)", onde: "Menu à esquerda, em todas as telas do sistema.", icone: PanelLeft,
    slots: [{ chave: "logo_sidebar", titulo: "Logomarca da sidebar", dica: "Logo clara ou branca, fundo transparente (o menu é escuro).", fundo: "#0E1A2E" }] },
  { titulo: "Cabeçalho interno", onde: "Topo das páginas depois do login.", icone: PanelTop,
    slots: [{ chave: "logo_claro", titulo: "Logomarca do cabeçalho", dica: "Logo escura ou colorida, fundo transparente.", fundo: "#FFFFFF" }] },
  { titulo: "Landing page", onde: "Página inicial pública, antes do login.", icone: Globe,
    slots: [{ chave: "logo_landing_claro", titulo: "Logomarca da landing", dica: "Logo escura ou colorida, fundo transparente.", fundo: "#FFFFFF" }] },
  { titulo: "Favicon", onde: "Ícone da aba do navegador.", icone: Star,
    slots: [{ chave: "favicon", titulo: "Favicon", dica: "PNG quadrado, 64 × 64 px ou maior.", fundo: "#141414" }] },
];

export default function Configuracoes() {
  const { perfil, sessao } = useAuth();
  const [valores, setValores] = useState({});
  const [enviando, setEnviando] = useState(null);
  const [msg, setMsg] = useState(null);

  const carregar = () => {
    if (!supabaseConfigurado) return;
    supabase.from("configuracoes").select("chave, valor").then(({ data }) =>
      setValores(Object.fromEntries((data ?? []).map((r) => [r.chave, r.valor]))));
  };
  useEffect(() => { carregar(); }, []);

  if (perfil && perfil.papel !== "admin_master") {
    return (
      <PageTransition>
        <div className="page-bg"><Header subtitle="Configurações" /><main className="db-wrap"><BackLink />
          <p className="db-note" style={{ marginTop: 22 }}>Somente o administrador acessa as configurações.</p>
        </main></div>
      </PageTransition>
    );
  }

  const salvarValor = async (chave, valor) => {
    const { error } = await supabase.from("configuracoes").upsert(
      { chave, valor, atualizado_em: new Date().toISOString(), atualizado_por: sessao?.user?.id },
      { onConflict: "chave" });
    if (error) throw error;
    // Confirma no banco que o valor ficou gravado (não aceita falha silenciosa)
    const { data } = await supabase.from("configuracoes").select("valor").eq("chave", chave).maybeSingle();
    if (valor && data?.valor !== valor) {
      throw new Error("A imagem foi enviada, mas não ficou gravada. Verifique se a conta é de administrador.");
    }
    atualizarMarca(chave, valor);
    setValores((v) => ({ ...v, [chave]: valor }));
  };

  const enviar = async (chave, file) => {
    setMsg(null);
    if (!TIPOS.includes(file.type)) { setMsg({ tipo: "erro", texto: "Formato não aceito. Use PNG, JPG, WebP, SVG ou ICO." }); return; }
    if (file.size > MAX_BYTES) { setMsg({ tipo: "erro", texto: "Arquivo acima de 2 MB." }); return; }
    setEnviando(chave);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const caminho = `${chave}-${Date.now()}.${ext}`;
      const { error: eUp } = await supabase.storage.from("marca").upload(caminho, file, { contentType: file.type, upsert: false });
      if (eUp) throw eUp;
      const { data: pub } = supabase.storage.from("marca").getPublicUrl(caminho);
      await salvarValor(chave, pub.publicUrl);
      setMsg({ tipo: "ok", texto: "Imagem salva. A troca já vale para todos os usuários." });
      carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: `Não foi possível salvar: ${e.message}` });
    } finally {
      setEnviando(null);
    }
  };

  const remover = async (chave) => {
    if (!window.confirm("Remover esta imagem e voltar a usar a padrão?")) return;
    try {
      await salvarValor(chave, null);
      setMsg({ tipo: "ok", texto: "Imagem removida." });
      carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  };

  const cartaoLogo = (s, grupo) => {
    const atual = valores[s.chave] || (s.chave.startsWith("favicon") ? null : logoPadrao);
    const ocupado = enviando === s.chave;
    const Icone = grupo.icone;
    return (
      <section key={s.chave} className="db-card cfg-lift cfg-enter">
        <DbCabeca Icone={Icone} titulo={s.titulo} sub={s.dica} acao={<span className="cfg-tag">{grupo.titulo}</span>} />
        <div className="cfg-preview" style={{ background: s.fundo }}>
          {atual
            ? <img src={atual} alt={s.titulo} />
            : <span className="cfg-vazio"><ImageIcon size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Sem imagem própria (usa a padrão)</span>}
        </div>
        <div className="cfg-acoes">
          <input id={`up-${s.chave}`} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" style={{ display: "none" }}
            disabled={ocupado} onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(s.chave, f); e.target.value = ""; }} />
          <label htmlFor={`up-${s.chave}`} className="db-btn-prim" style={{ cursor: ocupado ? "wait" : "pointer", opacity: ocupado ? 0.7 : 1 }}>
            {ocupado ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} {ocupado ? "Enviando…" : "Trocar imagem"}
          </label>
          {valores[s.chave] && (
            <button type="button" className="db-btn-sec cfg-danger" onClick={() => remover(s.chave)} disabled={ocupado}>
              <Trash2 size={15} /> Remover
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{DB_CSS + CFG_CSS}</style>
        <Header subtitle="Configurações" />
        <main className="db-wrap">
          <BackLink />
          <header className="db-head">
            <div>
              <div className="db-eyebrow">Sistema</div>
              <h1 className="db-title"><Settings size={24} /> Configurações</h1>
              <p className="db-sub">Cada lugar da plataforma tem uma logomarca. Use o campo do lugar que você quer trocar.</p>
            </div>
          </header>

          {msg && (
            <div role="status" className="db-card" style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: msg.tipo === "ok" ? "#059669" : "#b91c1c" }}>{msg.texto}</div>
          )}

          <AtualizarCdi />

          <div className="cfg-titulo-grupo">Logomarcas da plataforma</div>
          <p className="db-note" style={{ margin: "-4px 0 12px" }}>Cada cartão mostra onde a imagem aparece. Troque a imagem do lugar que você quer.</p>
          <div style={{ display: "grid", gap: 16, width: "100%", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
            {GRUPOS.flatMap((g) => g.slots.map((s) => cartaoLogo(s, g)))}
          </div>

        </main>
      </div>
    </PageTransition>
  );
}
