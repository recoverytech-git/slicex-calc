import { Coins, Clock } from "lucide-react";
import { inicioPeriodo } from "./PainelPeriodo";
import DbCabeca from "./DbCabeca";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Juros em aberto (estoque, ate hoje) separado do juros ja realizado nas vendas do periodo
export default function JurosResumo({ jurosEst, vendas, periodo }) {
  const ini = inicioPeriodo(periodo);
  const realizado = (vendas || []).filter((s) => new Date(s.data_venda) >= ini)
    .reduce((a, s) => a + Number(s.juros_total || 0), 0);
  const aberto = (jurosEst || []).reduce((a, m) => a + Number(m.juros_diario_acumulado || 0), 0);
  return (
    <section className="db-card">
      <DbCabeca Icone={Coins} titulo="Juros de financiamento" sub="Juros após o 30º dia, separado do juros já realizado" />
      <div className="db-grid-2">
        <div className="db-kpi">
          <div className="db-kpi-top"><span className="db-kpi-l">Em aberto no estoque</span><span className="db-kpi-ic"><Clock size={16} /></span></div>
          <div className="db-kpi-v" style={{ color: "#b45309" }}>{BRL(aberto)}</div>
          <div className="db-kpi-s">dias após o 30º, até hoje</div>
        </div>
        <div className="db-kpi">
          <div className="db-kpi-top"><span className="db-kpi-l">Realizado nas vendas</span><span className="db-kpi-ic"><Coins size={16} /></span></div>
          <div className="db-kpi-v">{BRL(realizado)}</div>
          <div className="db-kpi-s">período selecionado, pela data da venda</div>
        </div>
      </div>
    </section>
  );
}
