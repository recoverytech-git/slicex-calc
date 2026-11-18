import { useState } from "react";
import { supabase, supabaseConfigurado } from "../lib/supabase";

// Botao do administrador master: forca a atualizacao do CDI agora, sem terminal
export default function AtualizarCdi() {
  const [estado, setEstado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const atualizar = async () => {
    if (!supabaseConfigurado) return;
    setCarregando(true);
    setEstado(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const r = await fetch("/api/atualizar-cdi", { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => ({}));
      setEstado(body.ok
        ? { tipo: "ok", texto: `CDI atualizado: ${String(body.valor).replace(".", ",")}% a.a. (referência ${body.referencia.split("-").reverse().join("/")}).` }
        : { tipo: "erro", texto: `Não atualizou (${r.status}): ${body.erro || "erro desconhecido"}` });
    } catch (e) {
      setEstado({ tipo: "erro", texto: `Falha de conexão: ${e.message}` });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <section style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid rgba(226,232,240,.8)", boxShadow: "0 1px 3px rgba(15,23,42,.03), 0 10px 25px -5px rgba(15,23,42,.04)", padding: 20, marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>CDI (taxa de oportunidade)</h2>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)" }}>A atualização é automática em dias úteis. Use o botão para atualizar agora e ver o resultado.</p>
      <button type="button" onClick={atualizar} disabled={carregando}
        style={{ padding: "9px 16px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: carregando ? 0.6 : 1 }}>
        {carregando ? "Atualizando..." : "Atualizar CDI agora"}
      </button>
      {estado && <p style={{ margin: "12px 0 0", fontSize: 13, color: estado.tipo === "ok" ? "#059669" : "#b91c1c" }}>{estado.texto}</p>}
    </section>
  );
}
