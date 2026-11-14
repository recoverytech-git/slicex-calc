import { inicioPeriodo } from "./PainelPeriodo";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };

// Juros em aberto (estoque, ate hoje) separado do juros ja realizado nas vendas do periodo
export default function JurosResumo({ jurosEst, vendas, periodo }) {
  const ini = inicioPeriodo(periodo);
  const realizado = (vendas || []).filter((s) => new Date(s.data_venda) >= ini)
    .reduce((a, s) => a + Number(s.juros_total || 0), 0);
  const aberto = (jurosEst || []).reduce((a, m) => a + Number(m.juros_diario_acumulado || 0), 0);
  return (
    <section style={cartao}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Juros de financiamento</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Em aberto no estoque (dias após o 30º, até hoje)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#b45309" }}>{BRL(aberto)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Realizado nas vendas do período (ajustado pela data da venda)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{BRL(realizado)}</div>
        </div>
      </div>
    </section>
  );
}
