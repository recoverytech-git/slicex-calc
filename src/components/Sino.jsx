import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const VINTE_QUATRO_HORAS = 24 * 60 * 60 * 1000;
// Nao lida sempre aparece; lida aparece por 24 horas apos a leitura
const visivel = (n) => !n.lida || (n.lida_em && Date.now() - new Date(n.lida_em).getTime() < VINTE_QUATRO_HORAS);

export default function Sino() {
  const { sessao } = useAuth();
  const navigate = useNavigate();
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(false);

  const carregar = async () => {
    if (!supabaseConfigurado || !sessao) return;
    const { data } = await supabase.from("notificacoes")
      .select("id, titulo, mensagem, link_ref, lida, lida_em, criado_em")
      .order("criado_em", { ascending: false }).limit(50);
    setItens(data ?? []);
  };

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao]);

  if (!sessao) return null;

  const visiveis = itens.filter(visivel);
  const naoLidas = visiveis.filter((i) => !i.lida).length;

  const marcar = async (ids) => {
    if (!ids.length) return;
    const { error } = await supabase.from("notificacoes").update({ lida: true }).in("id", ids);
    if (!error) {
      const agora = new Date().toISOString();
      setItens((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, lida: true, lida_em: agora } : i)));
    }
  };

  const abrir = async (n) => {
    if (!n.lida) await marcar([n.id]);
    setAberto(false);
    // notificacoes de ficha preenchida levam para a lista de leads
    if (/ficha/i.test(n.titulo)) navigate("/leads");
    else if (n.link_ref) navigate(`/leads/${n.link_ref}`);
  };

  const marcarUma = (n, e) => {
    e.stopPropagation();
    marcar([n.id]);
  };

  return (
    <div style={{ position: "relative", marginLeft: "auto" }}>
      <button type="button" onClick={() => setAberto((v) => !v)}
        aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ""}`}
        style={{ position: "relative", width: 36, height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <Bell size={16} />
        {naoLidas > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 999, background: "#4493F8", color: "#ffffff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div role="menu" style={{ position: "absolute", right: 0, top: 44, width: 340, maxHeight: 400, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-lg)", zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Notificações {naoLidas > 0 && <span style={{ color: "#4493F8" }}>· {naoLidas} nova{naoLidas > 1 ? "s" : ""}</span>}
            </span>
            {naoLidas > 0 && (
              <button type="button" onClick={() => marcar(visiveis.filter((i) => !i.lida).map((i) => i.id))}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <CheckCheck size={14} /> Marcar todas
              </button>
            )}
          </div>
          {visiveis.length === 0 && <p style={{ margin: 0, padding: 16, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma notificação.</p>}
          {visiveis.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px 10px 14px", borderBottom: "1px solid var(--border)", background: n.lida ? "transparent" : "rgba(68,147,248,0.08)" }}>
              <button type="button" onClick={() => abrir(n)}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--text)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: n.lida ? 500 : 700 }}>
                  {!n.lida && <span style={{ width: 7, height: 7, borderRadius: 999, background: "#4493F8", flexShrink: 0 }} aria-hidden="true" />}
                  {n.titulo}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{n.mensagem}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>{new Date(n.criado_em).toLocaleString("pt-BR")}</span>
              </button>
              {n.lida ? (
                <span title="Lida" aria-label="Lida" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", background: "#ecfdf5" }}>
                  <Check size={14} />
                </span>
              ) : (
                <button type="button" onClick={(e) => marcarUma(n, e)} title="Marcar como lida" aria-label="Marcar como lida"
                  style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 999, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
