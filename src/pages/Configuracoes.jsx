// sem-rascunho: página de configuração, sem formulário de texto
import { useEffect, useState } from "react";
import { Settings, Upload, Trash2, Loader2 } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { atualizarMarca } from "../lib/marca";
import logoPadrao from "../assets/logo.png";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 18 };
const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_BYTES = 2 * 1024 * 1024;

const GRUPOS = [
  {
    titulo: "Menu lateral (sidebar)",
    onde: "Menu à esquerda, em todas as telas do sistema.",
    slots: [
      { chave: "logo_sidebar", titulo: "Logomarca da sidebar", dica: "Logo clara ou branca, fundo transparente (o menu é escuro).", fundo: "#0E1A2E" },
    ],
  },
  {
    titulo: "Cabeçalho interno",
    onde: "Topo das páginas depois do login.",
    slots: [
      { chave: "logo_claro", titulo: "Logomarca do cabeçalho", dica: "Logo escura ou colorida, fundo transparente.", fundo: "#FFFFFF" },
    ],
  },
  {
    titulo: "Landing page",
    onde: "Página inicial pública, antes do login.",
    slots: [
      { chave: "logo_landing_claro", titulo: "Logomarca da landing", dica: "Logo escura ou colorida, fundo transparente.", fundo: "#FFFFFF" },
    ],
  },
  {
    titulo: "Favicon",
    onde: "Ícone da aba do navegador.",
    slots: [
      { chave: "favicon", titulo: "Favicon", dica: "PNG quadrado, 64 × 64 px ou maior.", fundo: "#141414" },
    ],
  },
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
        <div className="page-bg"><Header subtitle="Configurações" /><div className="container" style={{ paddingTop: 8 }}>
          <BackLink /><p style={{ color: "var(--text-dim)", marginTop: 22 }}>Somente o administrador acessa as configurações.</p>
        </div></div>
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

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Configurações" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <Settings size={22} /> Configurações
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>
            Cada lugar da plataforma tem uma logomarca para o modo escuro e outra para o modo claro. Use o campo do lugar e do modo que você quer trocar.
          </p>

          {msg && <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}

          {GRUPOS.map((g) => (
            <div key={g.titulo} style={{ marginBottom: 22 }}>
              <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{g.titulo}</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-mute)" }}>{g.onde}</p>
              <div className="grid-2">
                {g.slots.map((s) => {
                  const atual = valores[s.chave] || (s.chave.startsWith("favicon") ? null : logoPadrao);
                  const ocupado = enviando === s.chave;
                  return (
                    <div key={s.chave} style={card}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{s.titulo}</p>
                        {s.modo && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--border-strong)", color: "var(--text-dim)" }}>{s.modo}</span>}
                      </div>
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-mute)" }}>{s.dica}</p>
                      <div style={{ width: "100%", height: 96, borderRadius: "var(--r-md)", background: s.fundo, border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 12 }}>
                        {atual ? <img src={atual} alt="" style={{ maxWidth: "70%", maxHeight: "70%", objectFit: "contain" }} />
                               : <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Sem imagem própria (usa a padrão)</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input id={`up-${s.chave}`} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" style={{ display: "none" }}
                          disabled={ocupado} onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(s.chave, f); e.target.value = ""; }} />
                        <label htmlFor={`up-${s.chave}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--r-sm)", background: "var(--accent)", color: "var(--accent-ink)", fontSize: 13, fontWeight: 700, cursor: ocupado ? "wait" : "pointer", opacity: ocupado ? 0.7 : 1 }}>
                          {ocupado ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} {ocupado ? "Enviando…" : "Trocar imagem"}
                        </label>
                        {valores[s.chave] && (
                          <button onClick={() => remover(s.chave)} disabled={ocupado} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--r-sm)", background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            <Trash2 size={15} /> Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
