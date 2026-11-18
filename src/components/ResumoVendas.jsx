import { useEffect, useMemo, useState } from "react";
import { Coins, Percent, Wallet, Scale } from "lucide-react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { faturamento, resumoAgio } from "../lib/calculos";
import { inicioPeriodo, PERIODOS } from "./PainelPeriodo";
import DbCabeca from "./DbCabeca";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => (n == null ? "—" : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

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

  const tile = (rot, valor, Icone, cor) => (
    <div className="db-kpi vd-lift">
      <div className="db-kpi-top"><span className="db-kpi-l">{rot}</span><span className="db-kpi-ic"><Icone size={16} /></span></div>
      <div className="db-kpi-v" style={{ color: cor }}>{valor}</div>
    </div>
  );

  return (
    <section className="db-card">
      <DbCabeca Icone={Coins} titulo="Faturamento e ágio no período" sub="Valor vendido em relação ao pretendido. Negativo = venda abaixo do pretendido." acao={
        <div className="db-chips">{PERIODOS.map(([dias, rotulo]) => (
          <button key={dias} type="button" className={`db-chip ${periodo === dias ? "on" : ""}`} onClick={() => setPeriodo(dias)}>{rotulo}</button>
        ))}</div>} />
      {erro && <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>{erro}</p>}
      <div className="db-kgrid" style={{ marginBottom: 18 }}>
        {tile("Bruto", BRL(fat.bruto), Coins)}
        {tile("Deduções (despesas e descontos)", BRL(fat.deducoes), Wallet, "#b91c1c")}
        {tile("Líquido", BRL(fat.liquido), Scale, "#059669")}
      </div>

      {agio.linhas.length === 0 ? (
        <p className="db-empty">Nenhuma venda no período.</p>
      ) : (
        <div className="db-tbl-wrap">
          <table className="db-tbl">
            <thead><tr>
              <th>Veículo</th><th className="db-r">Vendido</th><th className="db-r">Pretendido</th><th className="db-r">Ágio / deságio</th><th className="db-r">%</th>
            </tr></thead>
            <tbody>
              {agio.linhas.map((l) => (
                <tr key={l.venda_id} className="vd-row">
                  <td style={{ fontWeight: 700 }}>{l.modelo}{l.placa ? ` · ${l.placa}` : ""}</td>
                  <td className="db-r">{BRL(l.valor_venda)}</td>
                  <td className="db-r">{BRL(l.preco_venda_pretendido)}</td>
                  <td className="db-r" style={{ fontWeight: 800, color: l.reais < 0 ? "#b91c1c" : "#059669" }}>{BRL(l.reais)}</td>
                  <td className="db-r"><span className={`db-pill ${l.reais < 0 ? "db-pill-verm" : "db-pill-verde"}`}>{PCT(l.pct)}</span></td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 800 }}>Média por venda</td><td /><td />
                <td className="db-r" style={{ fontWeight: 800, color: agio.mediaReais < 0 ? "#b91c1c" : "#059669" }}>{BRL(agio.mediaReais)}</td>
                <td className="db-r"><span className={`db-pill ${agio.mediaReais < 0 ? "db-pill-verm" : "db-pill-verde"}`}><Percent size={11} /> {PCT(agio.mediaPct)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
