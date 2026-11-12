import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { faturamento, resumoAgio } from "../lib/calculos";
import { inicioPeriodo, PERIODOS } from "./PainelPeriodo";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => (n == null ? "—" : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const cabec = { padding: "8px 6px", textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--border)", fontSize: 12 };
const td = { padding: "8px 6px", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13 };

export default function ResumoVendas() {
  const [periodo, setPeriodo] = useState(90);
  const [vendas, setVendas] = useState([]);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("v_vendas_resultado")
      .select("venda_id, modelo, placa, data_venda, valor_venda, despesas_venda, descontos, preco_venda_pretendido")
      .then(({ data, error }) => { if (error) setErro(error.message); setVendas(data ?? []); });
  }, []);
  const doPeriodo = useMemo(() => {
    const ini = inicioPeriodo(periodo);
    return vendas.filter((s) => new Date(s.data_venda) >= ini);
  }, [vendas, periodo]);
  const fat = faturamento(doPeriodo);
  const agio = resumoAgio(doPeriodo);
  return (
    <section style={cartao}>
      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Faturamento e ágio no período</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {PERIODOS.map(([dias, rotulo]) => (
          <button key={dias} type="button" onClick={() => setPeriodo(dias)}
            style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid var(--border)",
              background: periodo === dias ? "var(--accent)" : "var(--surface)", color: periodo === dias ? "#fff" : "var(--text-dim)" }}>{rotulo}</button>
        ))}
      </div>
      {erro && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 13, marginBottom: 14 }}>
        <span><span style={{ color: "var(--text-dim)" }}>Bruto: </span><strong style={{ color: "var(--text)" }}>{BRL(fat.bruto)}</strong></span>
        <span><span style={{ color: "var(--text-dim)" }}>Deduções (despesas e descontos): </span><strong style={{ color: "#b91c1c" }}>{BRL(fat.deducoes)}</strong></span>
        <span><span style={{ color: "var(--text-dim)" }}>Líquido: </span><strong style={{ color: "#059669" }}>{BRL(fat.liquido)}</strong></span>
      </div>
      <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Ágio e deságio por venda</h4>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>Valor vendido em relação ao pretendido. Negativo = venda abaixo do pretendido.</p>
      {agio.linhas.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Nenhuma venda no período.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={cabec}>Veículo</th><th style={{ ...cabec, textAlign: "right" }}>Vendido</th><th style={{ ...cabec, textAlign: "right" }}>Pretendido</th>
              <th style={{ ...cabec, textAlign: "right" }}>Ágio/deságio</th><th style={{ ...cabec, textAlign: "right" }}>%</th>
            </tr></thead>
            <tbody>
              {agio.linhas.map((l) => (
                <tr key={l.venda_id}>
                  <td style={td}>{l.modelo} {l.placa ? `· ${l.placa}` : ""}</td>
                  <td style={{ ...td, textAlign: "right" }}>{BRL(l.valor_venda)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{BRL(l.preco_venda_pretendido)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: l.reais < 0 ? "#b91c1c" : "#059669" }}>{BRL(l.reais)}</td>
                  <td style={{ ...td, textAlign: "right", color: l.reais < 0 ? "#b91c1c" : "#059669" }}>{PCT(l.pct)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 800 }}>Média por venda</td><td style={td} /><td style={td} />
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{BRL(agio.mediaReais)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{PCT(agio.mediaPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
