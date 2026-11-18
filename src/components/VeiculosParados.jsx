import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Hourglass } from "lucide-react";
import { FAIXAS_PARADOS } from "../lib/calculos";
import DbCabeca from "./DbCabeca";

const CRITICO = 180;
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (s) => {
  const [a, m, d] = String(s || "").slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
};

export default function VeiculosParados({ veiculos, metricas }) {
  const [faixa, setFaixa] = useState(30);
  const mapa = useMemo(() => Object.fromEntries((metricas || []).map((m) => [m.veiculo_id, m])), [metricas]);
  const lista = useMemo(() => veiculos
    .filter((v) => v.status !== "vendido")
    .map((v) => ({ ...v, dias: Number(mapa[v.id]?.dias_em_estoque ?? 0), juros: Number(mapa[v.id]?.juros_diario_acumulado ?? 0) }))
    .filter((v) => v.dias >= faixa)
    .sort((a, b) => b.dias - a.dias), [veiculos, mapa, faixa]);

  return (
    <section className="db-card">
      <DbCabeca Icone={Hourglass} titulo="Veículos parados em estoque" sub={`Ordenados do mais antigo. Em vermelho, ${CRITICO} dias ou mais.`} />
      <div className="db-chips" style={{ marginBottom: 14 }}>
        {FAIXAS_PARADOS.map((d) => (
          <button key={d} type="button" className={`db-chip ${faixa === d ? "on" : ""}`} onClick={() => setFaixa(d)}>{d}+ dias</button>
        ))}
      </div>
      {lista.length === 0 ? <p className="db-note">Nenhum veículo parado a partir de {faixa} dias.</p> : (
        <div className="db-tbl-wrap">
          <table className="db-tbl">
            <thead><tr>
              <th>Aquisição</th><th>Modelo</th><th>Placa</th><th>Ano</th><th className="db-r">Dias</th><th className="db-r">Juros acum.</th><th></th>
            </tr></thead>
            <tbody>
              {lista.map((v) => {
                const critico = v.dias >= CRITICO;
                return (
                  <tr key={v.id}>
                    <td>{dataBR(v.data_aquisicao)}</td>
                    <td style={{ fontWeight: 700 }}>{v.modelo || "—"}</td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{v.placa || "—"}</td>
                    <td>{v.ano_fabricacao ?? "—"}/{v.ano_modelo ?? "—"}</td>
                    <td className="db-r"><span className={`db-pill ${critico ? "db-pill-verm" : "db-pill-ambar"}`}>{v.dias} dias</span></td>
                    <td className="db-r" style={{ color: critico ? "#b91c1c" : "#b45309", fontWeight: 700 }}>{BRL(v.juros)}</td>
                    <td className="db-r"><Link to={`/estoque/${v.id}`} className="db-chip" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Abrir</Link></td>
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
