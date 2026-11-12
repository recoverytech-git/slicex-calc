import { useMemo } from "react";
import * as XLSX from "xlsx";
import { resumoAgio, faturamento, contarParados, FAIXAS_PARADOS } from "../lib/calculos";

export const PERIODOS = [[30, "30 dias"], [60, "60 dias"], [90, "90 dias"], [180, "180 dias"], [360, "360 dias (ano)"]];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => (n == null ? "—" : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

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

// Exportacao do estoque: mesma regra dos KPIs (capital = compra + custos + juros diario)
export function linhasEstoque(veiculos, metricas, custos) {
  const custosPorVeiculo = {};
  custos.forEach((c) => { custosPorVeiculo[c.veiculo_id] = (custosPorVeiculo[c.veiculo_id] || 0) + Number(c.valor || 0); });
  return veiculos.filter((v) => v.status !== "vendido").map((v) => {
    const m = metricas[v.id] || {};
    const compra = Number(v.preco_compra || 0);
    const adicionais = custosPorVeiculo[v.id] || 0;
    const jurosDiario = Number(m.juros_diario_acumulado || 0);
    const capital = compra + adicionais + jurosDiario;
    const fipe = Number(v.valor_fipe || 0);
    const pret = Number(v.preco_venda_pretendido || 0);
    return {
      Modelo: v.modelo ?? "", Placa: v.placa ?? "", Status: v.status ?? "",
      "Data de aquisição": String(v.data_aquisicao || "").slice(0, 10),
      "Dias em estoque": Number(m.dias_em_estoque ?? 0),
      "Preço de compra": compra, "Valor FIPE": fipe, "Custos adicionais": adicionais,
      "Juros diário acumulado": jurosDiario, "Capital investido": capital,
      "Preço pretendido": pret,
      "Lucro pela FIPE": fipe - capital, "Lucro pela pretendida": pret - capital,
      "Margem FIPE (%)": fipe > 0 ? Number(((fipe - capital) / fipe * 100).toFixed(2)) : null,
      "Margem pretendida (%)": pret > 0 ? Number(((pret - capital) / pret * 100).toFixed(2)) : null,
    };
  });
}

export function exportarExcel(veiculos, vendas, metricas, custos, dias) {
  const ini = inicioPeriodo(dias);
  const vendasLinhas = vendas
    .filter((s) => new Date(s.data_venda) >= ini)
    .map((s) => ({
      Modelo: s.modelo ?? "", Placa: s.placa ?? "",
      "Data da venda": String(s.data_venda || "").slice(0, 10),
      "Valor de venda": Number(s.valor_venda || 0),
      "Valor pretendido": Number(s.preco_venda_pretendido || 0),
      "Ágio/deságio (R$)": Number(s.valor_venda || 0) - Number(s.preco_venda_pretendido || 0),
      Despesas: Number(s.despesas_venda || 0), Descontos: Number(s.descontos || 0),
      "Investimento total": Number(s.investimento_total || 0),
      "Juros total": Number(s.juros_total || 0),
      "Resultado final": Number(s.resultado_final || 0),
    }));
  const estoque = linhasEstoque(veiculos, metricas, custos);
  const soma = (lista, k) => lista.reduce((a, l) => a + Number(l[k] || 0), 0);
  if (estoque.length) {
    const cap = soma(estoque, "Capital investido");
    const fip = soma(estoque, "Valor FIPE");
    const pre = soma(estoque, "Preço pretendido");
    estoque.push({
      Modelo: "TOTAL", Placa: "", Status: "", "Data de aquisição": "", "Dias em estoque": "",
      "Preço de compra": soma(estoque, "Preço de compra"), "Valor FIPE": fip,
      "Custos adicionais": soma(estoque, "Custos adicionais"), "Juros diário acumulado": soma(estoque, "Juros diário acumulado"),
      "Capital investido": cap, "Preço pretendido": pre,
      "Lucro pela FIPE": fip - cap, "Lucro pela pretendida": pre - cap,
      "Margem FIPE (%)": fip > 0 ? Number(((fip - cap) / fip * 100).toFixed(2)) : null,
      "Margem pretendida (%)": pre > 0 ? Number(((pre - cap) / pre * 100).toFixed(2)) : null,
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendasLinhas.length ? vendasLinhas : [{ Aviso: "Sem vendas no período" }]), "Vendas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(estoque.length ? estoque : [{ Aviso: "Sem veículos em estoque" }]), "Estoque");
  XLSX.writeFile(wb, `calcula-car_${dias}dias.xlsx`);
}

const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const subtitulo = { margin: "18px 0 8px", fontSize: 15, fontWeight: 800, color: "var(--text)" };
const texto = { margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" };
const tabela = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const cabecTd = { padding: "8px 6px", textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--border)" };
const td = { padding: "8px 6px", borderBottom: "1px solid var(--border)", color: "var(--text)" };
const botaoPeriodo = (ativo) => ({
  padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: "1px solid var(--border)", background: ativo ? "var(--accent)" : "var(--surface)", color: ativo ? "#fff" : "var(--text-dim)",
});
const COR_PARADOS = { 30: "#b45309", 60: "#c2410c", 90: "#b91c1c", 180: "#991b1b", 360: "#450a0a" };

export default function PainelPeriodo({ periodo, setPeriodo, veiculos, vendas, metricas, custos }) {
  const meses = useMemo(() => giroPorMes(veiculos, vendas, periodo), [veiculos, vendas, periodo]);
  const mapaMetricas = useMemo(() => Object.fromEntries((metricas || []).map((m) => [m.veiculo_id, m])), [metricas]);
  const totEnt = meses.reduce((s, m) => s + m.entradas, 0);
  const totSai = meses.reduce((s, m) => s + m.saidas, 0);
  const ini = inicioPeriodo(periodo);
  const vendasPeriodo = vendas.filter((s) => new Date(s.data_venda) >= ini);
  const fat = faturamento(vendasPeriodo);
  const agio = resumoAgio(vendasPeriodo);
  const parados = contarParados(metricas || [], FAIXAS_PARADOS);
  return (
    <section style={cartao}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PERIODOS.map(([dias, rotulo]) => (
            <button key={dias} type="button" onClick={() => setPeriodo(dias)} style={botaoPeriodo(periodo === dias)}>{rotulo}</button>
          ))}
        </div>
        <button type="button" onClick={() => exportarExcel(veiculos, vendas, mapaMetricas, custos || [], periodo)}
          style={{ padding: "9px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Exportar Excel (vendas e estoque)
        </button>
      </div>

      <h3 style={subtitulo}>Giro mensal (últimos {periodo} dias)</h3>
      <p style={texto}>Entradas pela data de aquisição e saídas pela data da venda. Total no período: {totEnt} entradas e {totSai} saídas.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={tabela}>
          <thead><tr>
            <th style={cabecTd}>Mês</th><th style={{ ...cabecTd, textAlign: "right" }}>Entradas</th><th style={{ ...cabecTd, textAlign: "right" }}>Saídas (vendas)</th>
          </tr></thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave}>
                <td style={td}>{m.rotulo}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{m.entradas}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#059669" }}>{m.saidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
