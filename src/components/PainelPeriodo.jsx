import { useMemo } from "react";
import * as XLSX from "xlsx";

export const PERIODOS = [[30, "30 dias"], [60, "60 dias"], [90, "90 dias"], [180, "180 dias"], [360, "360 dias (ano)"]];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function inicioPeriodo(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dias);
  return d;
}

// Entradas usam a data de aquisicao (fallback: cadastro); saidas usam a data da venda
export function giroPorMes(veiculos, vendas, dias) {
  const inicio = inicioPeriodo(dias);
  const hoje = new Date();
  const meses = [];
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (cur <= hoje) {
    meses.push({
      chave: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      rotulo: `${MESES[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
      entradas: 0,
      saidas: 0,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  const mapa = Object.fromEntries(meses.map((m) => [m.chave, m]));
  veiculos.forEach((v) => {
    const dt = String(v.data_aquisicao || v.criado_em || "").slice(0, 10);
    if (mapa[dt.slice(0, 7)] && new Date(`${dt}T00:00:00`) >= inicio) mapa[dt.slice(0, 7)].entradas += 1;
  });
  vendas.forEach((s) => {
    const ch = String(s.data_venda || "").slice(0, 7);
    if (mapa[ch] && new Date(s.data_venda) >= inicio) mapa[ch].saidas += 1;
  });
  return meses;
}

export function exportarExcel(veiculos, vendas, metricas, dias) {
  const ini = inicioPeriodo(dias);
  const vendasLinhas = vendas
    .filter((s) => new Date(s.data_venda) >= ini)
    .map((s) => ({
      Modelo: s.modelo ?? "",
      Placa: s.placa ?? "",
      "Data da venda": String(s.data_venda || "").slice(0, 10),
      "Valor de venda": Number(s.valor_venda || 0),
      Despesas: Number(s.despesas_venda || 0),
      Descontos: Number(s.descontos || 0),
      "Investimento total": Number(s.investimento_total || 0),
      "Juros total": Number(s.juros_total || 0),
      "Resultado final": Number(s.resultado_final || 0),
    }));
  const estoqueLinhas = veiculos
    .filter((v) => v.status !== "vendido")
    .map((v) => {
      const m = metricas[v.id] || {};
      return {
        Modelo: v.modelo ?? "",
        Placa: v.placa ?? "",
        Status: v.status ?? "",
        "Data de aquisição": String(v.data_aquisicao || "").slice(0, 10),
        "Dias em estoque": m.dias_em_estoque ?? "",
        "Preço de compra": Number(v.preco_compra || 0),
        "Preço pretendido": Number(v.preco_venda_pretendido || 0),
        "Juros diário acumulado": Number(m.juros_diario_acumulado || 0),
      };
    });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendasLinhas.length ? vendasLinhas : [{ Aviso: "Sem vendas no período" }]), "Vendas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(estoqueLinhas.length ? estoqueLinhas : [{ Aviso: "Sem veículos em estoque" }]), "Estoque");
  XLSX.writeFile(wb, `calcula-car_${dias}dias.xlsx`);
}

const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const botaoPeriodo = (ativo) => ({
  padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: "1px solid var(--border)",
  background: ativo ? "var(--accent)" : "var(--surface)",
  color: ativo ? "#fff" : "var(--text-dim)",
});

export default function PainelPeriodo({ periodo, setPeriodo, veiculos, vendas, metricas }) {
  const meses = useMemo(() => giroPorMes(veiculos, vendas, periodo), [veiculos, vendas, periodo]);
  const mapaMetricas = useMemo(() => Object.fromEntries((metricas || []).map((m) => [m.veiculo_id, m])), [metricas]);
  const totEnt = meses.reduce((s, m) => s + m.entradas, 0);
  const totSai = meses.reduce((s, m) => s + m.saidas, 0);
  return (
    <section style={cartao}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PERIODOS.map(([dias, rotulo]) => (
            <button key={dias} type="button" onClick={() => setPeriodo(dias)} style={botaoPeriodo(periodo === dias)}>
              {rotulo}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => exportarExcel(veiculos, vendas, mapaMetricas, periodo)}
          style={{ padding: "9px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Exportar Excel (vendas e estoque)
        </button>
      </div>
      <h3 style={{ margin: "16px 0 6px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Giro mensal (últimos {periodo} dias)</h3>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>
        Entradas pela data de aquisição e saídas pela data da venda. Total no período: {totEnt} entradas e {totSai} saídas.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "8px 6px" }}>Mês</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Entradas</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Saídas (vendas)</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 6px", color: "var(--text)" }}>{m.rotulo}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{m.entradas}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "#059669" }}>{m.saidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
