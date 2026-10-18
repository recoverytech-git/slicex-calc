import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function Sino() {
  const { sessao } = useAuth();
  const navigate = useNavigate();
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(false);

  const carregar = async () => {
    if (!supabaseConfigurado || !sessao) return;
    const { data } = await supabase.from("notificacoes")
      .select("id, titulo, mensagem, link_ref, lida, criado_em")
      .order("criado_em", { ascending: false }).limit(20);
    setItens(data ?? []);
  };

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao]);

  if (!sessao) return null;

  const naoLidas = itens.filter((i) => !i.lida).length;

  const abrir = async (n) => {
    if (!n.lida) await supabase.from("notificacoes").update({ lida: true }).eq("id", n.id);
    setAberto(false);
    if (n.link_ref) navigate(`/leads/${n.link_ref}`);
    carregar();
  };

  return (
    <div style={{ position: "relative", marginLeft: "auto" }}>
      <button type="button" onClick={() => setAberto((v) => !v)}
        aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ""}`}
        style={{ position: "relative", width: 36, height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <Bell size={16} />
        {naoLidas > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 999, background: "#4493F8", color: "#ffffff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div role="menu" style={{ position: "absolute", right: 0, top: 44, width: 320, maxHeight: 380, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-lg)", zIndex: 50 }}>
          <p style={{ margin: 0, padding: "12px 14px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Notificações</p>
          {itens.length === 0 && <p style={{ margin: 0, padding: 16, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma notificação.</p>}
          {itens.map((n) => (
            <button key={n.id} type="button" onClick={() => abrir(n)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", background: n.lida ? "transparent" : "rgba(68,147,248,0.08)", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: n.lida ? 500 : 700 }}>{n.titulo}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{n.mensagem}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>{new Date(n.criado_em).toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
