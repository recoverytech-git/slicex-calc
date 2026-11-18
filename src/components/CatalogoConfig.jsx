import { useEffect, useState } from "react";
import { Link as LinkIcon, Copy, Store } from "lucide-react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

// Controle do catalogo publico: quais veiculos aparecem e se a placa e exibida
export default function CatalogoConfig() {
  const { perfil } = useAuth();
  const [loja, setLoja] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [aviso, setAviso] = useState(null);
  const gestao = ["admin_master", "proprietario", "gerente"].includes(perfil?.papel);

  useEffect(() => {
    if (!supabaseConfigurado || !gestao) return;
    supabase.from("organizacoes").select("nome, slug").eq("id", perfil?.organizacao_id).maybeSingle()
      .then(({ data }) => setLoja(data ?? null));
    supabase.from("veiculos").select("id, modelo, placa, status, publicado_catalogo, mostrar_placa, preco_venda_pretendido, cidade, uf")
      .neq("status", "vendido").order("criado_em", { ascending: false })
      .then(({ data }) => setVeiculos(data ?? []));
  }, [gestao, perfil?.organizacao_id]);

  if (!gestao) return null;

  const atualizar = async (id, campos) => {
    setAviso(null);
    const { error } = await supabase.from("veiculos").update(campos).eq("id", id);
    if (error) { setAviso(error.message); return; }
    setVeiculos((prev) => prev.map((v) => (v.id === id ? { ...v, ...campos } : v)));
  };

  const link = loja?.slug ? `${window.location.origin}/loja/${loja.slug}` : null;
  const publicados = veiculos.filter((v) => v.publicado_catalogo).length;

  return (
    <section style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid rgba(226,232,240,.8)", boxShadow: "0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04)", padding: 20, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #dbeafe" }}><Store size={18} /></span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Catálogo público da loja</h2>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-dim)" }}>Somente os veículos marcados aparecem no catálogo. Custos, juros e margem nunca são exibidos.</p>

      {link && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14, padding: "10px 12px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <LinkIcon size={14} color="#64748b" />
          <code style={{ fontSize: 12, color: "#0f172a", overflowWrap: "anywhere", flex: 1, minWidth: 0 }}>{link}</code>
          <button type="button" onClick={() => navigator.clipboard?.writeText(link)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Copy size={13} /> Copiar</button>
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>Abrir</a>
        </div>
      )}

      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>{publicados} de {veiculos.length} veículos publicados.</p>
      {aviso && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b91c1c" }}>{aviso}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {veiculos.map((v) => (
          <div key={v.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{v.modelo}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{v.status} · {Number(v.preco_venda_pretendido || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input defaultValue={v.cidade || ""} placeholder="Cidade" onBlur={(e) => e.target.value !== (v.cidade || "") && atualizar(v.id, { cidade: e.target.value || null })} style={{ height: 34, width: 140, padding: "0 10px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 12 }} aria-label="Cidade" />
              <input defaultValue={v.uf || ""} placeholder="UF" maxLength={2} onBlur={(e) => e.target.value.toUpperCase() !== (v.uf || "") && atualizar(v.id, { uf: e.target.value.toUpperCase() || null })} style={{ height: 34, width: 56, padding: "0 10px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 12, textTransform: "uppercase" }} aria-label="UF" />
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={!!v.publicado_catalogo} onChange={(e) => atualizar(v.id, { publicado_catalogo: e.target.checked })} /> Publicar
              </label>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: v.publicado_catalogo ? 1 : 0.5 }}>
                <input type="checkbox" checked={!!v.mostrar_placa} disabled={!v.publicado_catalogo} onChange={(e) => atualizar(v.id, { mostrar_placa: e.target.checked })} /> Mostrar placa
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
