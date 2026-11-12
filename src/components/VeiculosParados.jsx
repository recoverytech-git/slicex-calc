import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FAIXAS_PARADOS } from "../lib/calculos";

const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const titulo = { margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "var(--text)" };
const texto = { margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)" };
const cabec = { padding: "8px 6px", textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--border)", fontSize: 12, whiteSpace: "nowrap" };
const td = { padding: "9px 6px", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13, whiteSpace: "nowrap" };
const COR = { 30: "#b45309", 60: "#c2410c", 90: "#b91c1c", 180: "#991b1b", 360: "#450a0a" };
const CRITICO = 180;
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Data AAAA-MM-DD -> DD/MM/AAAA
const dataBR = (s) => {
  const [a, m, d] = String(s || "").slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
};

export default function VeiculosParados({ veiculos, metricas }) {
  const [faixa, setFaixa] = useState(30);
  const mapa = useMemo(() => Object.fromEntries((metricas || []).map((m) => [m.veiculo_id, m])), [metricas]);
  const lista = useMemo(
    () => veiculos
      .filter((v) => v.status !== "vendido")
      .map((v) => ({
        ...v,
        dias: Number(mapa[v.id]?.dias_em_estoque ?? 0),
        juros: Number(mapa[v.id]?.juros_diario_acumulado ?? 0),
      }))
      .filter((v) => v.dias >= faixa)
      .sort((a, b) => b.dias - a.dias),
    [veiculos, mapa, faixa]
  );
  return (
    <section style={cartao}>
      <h3 style={titulo}>Veículos parados em estoque</h3>
      <p style={texto}>Veículos em estoque com tempo parado a partir da faixa selecionada. Ordenados do mais antigo para o mais recente. Em vermelho, os veículos parados há {CRITICO} dias ou mais.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {FAIXAS_PARADOS.map((dias) => (
          <button key={dias} type="button" onClick={() => setFaixa(dias)}
            style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${faixa === dias ? COR[dias] : "var(--border)"}`,
              background: faixa === dias ? COR[dias] : "var(--surface)", color: faixa === dias ? "#fff" : "var(--text-dim)" }}>
            {dias}+ dias
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p style={texto}>Nenhum veículo parado a partir de {faixa} dias.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={cabec}>Data de aquisição</th><th style={cabec}>Modelo</th><th style={cabec}>Placa</th>
                <th style={cabec}>Ano</th><th style={cabec}>Ano modelo</th>
                <th style={{ ...cabec, textAlign: "right" }}>Dias parados</th>
                <th style={{ ...cabec, textAlign: "right" }}>Juros acumulado</th>
                <th style={cabec}></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const critico = v.dias >= CRITICO;
                const fundo = critico ? "rgba(185,28,28,0.07)" : "transparent";
                return (
                  <tr key={v.id} style={{ background: fundo }}>
                    <td style={td}>{dataBR(v.data_aquisicao)}</td>
                    <td style={{ ...td, color: critico ? "#991b1b" : td.color, fontWeight: critico ? 700 : 400 }}>{v.modelo || "—"}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{v.placa || "—"}</td>
                    <td style={td}>{v.ano_fabricacao ?? "—"}</td>
                    <td style={td}>{v.ano_modelo ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: critico ? "#991b1b" : COR[faixa] }}>{v.dias}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: critico ? "#991b1b" : "#b45309" }}>{BRL(v.juros)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link to={`/estoque/${v.id}`} style={{ display: "inline-block", padding: "5px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--accent)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        Ver detalhe
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
