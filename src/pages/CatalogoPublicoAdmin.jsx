// sem-rascunho: configuracao simples de publicacao; os dados ficam no banco, nao no navegador
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import CatalogoConfig from "../components/CatalogoConfig";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const cartao = { background: "var(--surface)", borderRadius: 20, border: "1px solid rgba(226,232,240,.8)", boxShadow: "0 1px 3px rgba(15,23,42,.03), 0 10px 25px -5px rgba(15,23,42,.04)", padding: 20, marginBottom: 18 };

function MarketplaceOptIn() {
  const { perfil } = useAuth();
  const [ativo, setAtivo] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado || !perfil?.organizacao_id) return;
    supabase.from("organizacoes").select("marketplace_ativo").eq("id", perfil.organizacao_id).maybeSingle()
      .then(({ data }) => setAtivo(!!data?.marketplace_ativo));
  }, [perfil?.organizacao_id]);
  const alternar = async (v) => {
    const { error } = await supabase.from("organizacoes").update({ marketplace_ativo: v }).eq("id", perfil.organizacao_id);
    if (error) { setMsg({ tipo: "erro", texto: error.message }); return; }
    setAtivo(v);
    setMsg({ tipo: "ok", texto: v ? "Sua loja aparece no Marketplace. Só os veículos publicados no catálogo são exibidos." : "Sua loja saiu do Marketplace." });
  };
  return (
    <section style={cartao}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Aparecer no Marketplace geral</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-dim)" }}>Opcional. Os veículos da sua loja aparecem junto com os de outras lojas que aceitaram.</p>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <input type="checkbox" checked={ativo} onChange={(e) => alternar(e.target.checked)} /> {ativo ? "Ativo" : "Inativo"}
        </label>
      </div>
      {msg && <p style={{ margin: "10px 0 0", fontSize: 12, color: msg.tipo === "ok" ? "#059669" : "#b91c1c" }}>{msg.texto}</p>}
    </section>
  );
}

function WhatsAppLoja() {
  const { perfil } = useAuth();
  const [numero, setNumero] = useState("");
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado || !perfil?.organizacao_id) return;
    supabase.from("organizacoes").select("whatsapp").eq("id", perfil.organizacao_id).maybeSingle()
      .then(({ data }) => setNumero(data?.whatsapp || ""));
  }, [perfil?.organizacao_id]);
  const salvar = async () => {
    const digitos = numero.replace(/\D/g, "");
    if (digitos && (digitos.length < 10 || digitos.length > 11)) { setMsg({ tipo: "erro", texto: "Informe o WhatsApp com DDD (10 ou 11 números)." }); return; }
    const { error } = await supabase.from("organizacoes").update({ whatsapp: digitos || null }).eq("id", perfil.organizacao_id);
    setMsg(error ? { tipo: "erro", texto: error.message } : { tipo: "ok", texto: "WhatsApp da loja salvo." });
  };
  return (
    <section style={cartao}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: "#ecfdf5", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #a7f3d0" }}><MessageCircle size={18} /></span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>WhatsApp de contato</h2>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)" }}>Número que recebe os contatos do botão "Chamar no WhatsApp" do catálogo.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="(62) 99999-9999" inputMode="tel"
          style={{ height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 14, minWidth: 220, flex: 1 }} />
        <button type="button" onClick={salvar} style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Salvar</button>
      </div>
      {msg && <p style={{ margin: "10px 0 0", fontSize: 12, color: msg.tipo === "ok" ? "#059669" : "#b91c1c" }}>{msg.texto}</p>}
    </section>
  );
}

export default function CatalogoPublicoAdmin() {
  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Catálogo público" />
        <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 16px 56px" }}>
          <BackLink />
          <h1 style={{ margin: "18px 0 4px", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>Catálogo público</h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>Escolha quais veículos aparecem no catálogo da sua loja e configure o contato.</p>
          <MarketplaceOptIn />
          <WhatsAppLoja />
          <CatalogoConfig />
        </main>
      </div>
    </PageTransition>
  );
}
