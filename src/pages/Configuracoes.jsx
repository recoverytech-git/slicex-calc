// sem-rascunho: página de configuração, sem formulário de texto
import { useEffect, useState } from "react";
import { Settings, Upload, Trash2, Loader2 } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { limparCacheMarca } from "../lib/marca";
import logoPadrao from "../assets/logo.png";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 18 };
const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_BYTES = 2 * 1024 * 1024;
const SLOTS = [
  { chave: "logo_sidebar", titulo: "Logomarca da sidebar", dica: "Aparece no menu lateral, sobre fundo preto. PNG com fundo transparente, cerca de 40 px de altura." },
  { chave: "logo_header", titulo: "Logomarca do cabeçalho", dica: "Aparece no topo de todas as páginas." },
  { chave: "logo_claro", titulo: "Logomarca para modo claro", dica: "Usada no cabeçalho quando o tema claro estiver ativo. Logo escura ou colorida, com fundo transparente." },
  { chave: "favicon", titulo: "Favicon", dica: "Ícone da aba do navegador. PNG quadrado, 64 × 64 px ou maior." },
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
      const { error: eCfg } = await supabase.from("configuracoes").upsert({ chave, 
        valor: pub.publicUrl, atualizado_em: new Date().toISOString(), atualizado_por: sessao?.user?.id,
      }, { onConflict: "chave" });
      if (eCfg) throw eCfg;
      limparCacheMarca();
      setMsg({ tipo: "ok", texto: "Marca atualizada. A alteração já vale para todos os usuários." });
      carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: `Não foi possível salvar: ${e.message}` });
    } finally {
      setEnviando(null);
    }
  };

  const remover = async (chave) => {
    if (!window.confirm("Remover esta imagem e voltar a usar a padrão?")) return;
    const { error } = await supabase.from("configuracoes").upsert({ chave,  valor: null, atualizado_em: new Date().toISOString(), atualizado_por: sessao?.user?.id }, { onConflict: "chave" });
    if (error) { setMsg({ tipo: "erro", texto: error.message }); return; }
    limparCacheMarca();
    setMsg({ tipo: "ok", texto: "Imagem removida." });
    carregar();
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
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>Troque a marca da plataforma. Cada lugar tem o seu próprio arquivo.</p>

          {msg && <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {SLOTS.map((s) => {
              const atual = valores[s.chave] || (s.chave === "favicon" ? null : logoPadrao);
              const ocupado = enviando === s.chave;
              return (
                <div key={s.chave} style={card}>
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.titulo}</p>
                  <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-mute)" }}>{s.dica}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ width: 160, height: 90, borderRadius: "var(--r-md)", background: s.chave === "logo_claro" ? "#FFFFFF" : "#000", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {atual ? <img src={atual} alt="" style={{ maxWidth: "80%", maxHeight: "70%", objectFit: "contain" }} />
                             : <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Sem imagem</span>}
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
