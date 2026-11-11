import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

// Popup de confirmacao da venda; redireciona para o estoque ao final da contagem ou ao clicar
export default function PopupVendaRegistrada({ onIr }) {
  const [segundos, setSegundos] = useState(3);
  useEffect(() => {
    if (segundos <= 0) { onIr(); return undefined; }
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos, onIr]);
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(15,23,42,.35)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: 380, borderRadius: 24, background: "var(--surface)", border: "1px solid var(--border-strong)", padding: 28, textAlign: "center", boxShadow: "0 25px 50px -12px rgba(15,23,42,.25)" }}>
        <div style={{ margin: "0 auto 14px", width: 56, height: 56, borderRadius: 16, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={28} /></div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Venda registrada!</h3>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-dim)" }}>O veículo foi marcado como vendido e sai do estoque ativo.</p>
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-dim)" }}>Redirecionando para o estoque em {segundos}s…</p>
        <button type="button" onClick={onIr} style={{ marginTop: 18, width: "100%", padding: "12px 16px", borderRadius: 12, border: 0, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Ir para o estoque</button>
      </div>
    </div>
  );
}
