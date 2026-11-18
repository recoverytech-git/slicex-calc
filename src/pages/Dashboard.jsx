import { DB_CSS } from "../components/dbEstilos";
import BotaoInstalar from "../components/BotaoInstalar";
// sem-rascunho: painel somente de consulta, sem formulário
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, LayoutDashboard, Warehouse, Car, Boxes, Coins, Target, BarChart3, Percent, Layers } from "lucide-react";
import GestaoInteligente from "../components/GestaoInteligente";
import KpisVendidos from "../components/KpisVendidos";
import JurosResumo from "../components/JurosResumo";
import AlertaBaixaPendente from "../components/AlertaBaixaPendente";
import VeiculosParados from "../components/VeiculosParados";
import PainelPeriodo, { inicioPeriodo } from "../components/PainelPeriodo";
import Header from "../components/Header";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { formatarBRL } from "../lib/moeda";

const GESTAO = ["admin_master", "proprietario", "gerente"];
const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

const CSS = DB_CSS;

function KpiCard({ rotulo, valor, icone: Icone, sub }) {
  return (
    <div className="db-kpi">
      <div className="db-kpi-top">
        <span className="db-kpi-l">{rotulo}</span>
        <span className="db-kpi-ic"><Icone size={16} /></span>
      </div>
      <div className="db-kpi-v">{valor}</div>
      {sub && <div className="db-kpi-s">{sub}</div>}
    </div>
  );
}

function Secao({ icone: Icone, titulo }) {
  return (
    <div className="db-sec">
      <span className="db-sec-ic"><Icone size={18} /></span>
      <span className="db-sec-t">{titulo}</span>
    </div>
  );
}

function GraficoBarras({ titulo, dados, formatar = (v) => v }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const comValor = dados.filter((d) => d.valor > 0).length;
  return (
    <div className="db-card">
      <p className="db-kpi-l" style={{ margin: "0 0 10px" }}>{titulo}</p>
      {comValor === 0 ? <p className="db-note">Sem movimento no período.</p> : (
        <div className="db-hbars">
          {dados.map((d, i) => (
            <div key={d.rotulo + i} className="db-hrow">
              <span className="db-hlbl">{d.rotulo}</span>
              <div className="db-htrack"><div className="db-hfill" style={{ width: `${(d.valor / max) * 100}%` }} /></div>
              <span className="db-hval">{formatar(d.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { perfil } = useAuth();
  const gestao = GESTAO.includes(perfil?.papel);
  const [veiculos, setVeiculos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [custos, setCustos] = useState([]);
  const [jurosEst, setJurosEst] = useState([]);
  const [finEst, setFinEst] = useState([]);
  const [erro, setErro] = useState(null);
  const [periodo, setPeriodo] = useState(90);

  useEffect(() => {
    if (!supabaseConfigurado || !gestao) return;
    Promise.all([
      supabase.from("veiculos").select("id, status, modelo, placa, preco_compra, valor_fipe, preco_venda_pretendido, data_aquisicao, criado_em, ano_fabricacao, ano_modelo"),
      supabase.from("v_vendas_resultado").select("data_venda, modelo, placa, valor_venda, despesas_venda, descontos, juros_total, investimento_total, resultado_final, preco_venda_pretendido"),
      supabase.from("veiculo_custos").select("veiculo_id, valor"),
      supabase.from("v_estoque_metricas").select("veiculo_id, dias_em_estoque, juros_diario_acumulado"),
      supabase.from("veiculo_financiamentos").select("veiculo_id, total_juros"),
    ]).then(([v, s, c, j, f]) => {
      setFinEst(f.data ?? []);
      setCustos(c.data ?? []);
      setJurosEst(j.data ?? []);
      if (v.error || s.error) setErro((v.error || s.error).message);
      setVeiculos(v.data ?? []);
      setVendas(s.data ?? []);
    });
  }, [gestao]);

  // Ultimos 12 meses
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    return { chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, rotulo: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") };
  });
  const doMes = (chave) => vendas.filter((v) => v.data_venda?.slice(0, 7) === chave);
  const fatMes = meses.map((m) => ({ rotulo: m.rotulo, valor: doMes(m.chave).reduce((s, v) => s + Number(v.valor_venda ?? 0), 0) }));
  const resMes = meses.map((m) => ({ rotulo: m.rotulo, valor: doMes(m.chave).reduce((s, v) => s + Number(v.resultado_final ?? 0), 0) }));
  const statusDados = Object.keys(ROTULO).map((s) => ({ rotulo: ROTULO[s], valor: veiculos.filter((v) => v.status === s).length }));

  const emEstoque = veiculos.filter((v) => v.status !== "vendido");
  const custosPorVeiculo = {};
  custos.forEach((c) => { custosPorVeiculo[c.veiculo_id] = (custosPorVeiculo[c.veiculo_id] || 0) + Number(c.valor ?? 0); });
  finEst.forEach((f) => { custosPorVeiculo[f.veiculo_id] = (custosPorVeiculo[f.veiculo_id] || 0) + Number(f.total_juros ?? 0); });
  jurosEst.forEach((j) => { custosPorVeiculo[j.veiculo_id] = (custosPorVeiculo[j.veiculo_id] || 0) + Number(j.juros_diario_acumulado ?? 0); });
  const totalCustosEstoque = emEstoque.reduce((s, v) => s + (custosPorVeiculo[v.id] || 0), 0);
  // Capital investido = valor de compra + custos adicionais de todo o estoque
  const capital = emEstoque.reduce((s, v) => s + Number(v.preco_compra ?? 0), 0) + totalCustosEstoque;
  const potencial = emEstoque.reduce((s, v) => s + Number(v.preco_venda_pretendido ?? 0), 0);
  // Margem = venda pretendida - compra - custos adicionais, somada para todo o estoque
  const margemValor = emEstoque.reduce((s, v) => s + Number(v.preco_venda_pretendido ?? 0) - Number(v.preco_compra ?? 0) - (custosPorVeiculo[v.id] || 0), 0);

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{CSS}</style>
        <Header subtitle="Dashboard" />
        <main className="db-wrap">
          <header className="db-head">
            <div>
              <div className="db-eyebrow">Visão geral da operação</div>
              <h1 className="db-title"><LayoutDashboard size={24} /> Dashboard</h1>
              <p className="db-sub">Acompanhe a operação e acesse o simulador.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><BotaoInstalar /><Link to="/simulador-decisao" className="db-btn"><Calculator size={16} /> Simulador</Link></div>
          </header>

          <Secao icone={Target} titulo="Vendas" />
          <KpisVendidos />
          <PainelPeriodo periodo={periodo} setPeriodo={setPeriodo} veiculos={veiculos} vendas={vendas} metricas={jurosEst} custos={[...custos, ...finEst.map((f) => ({ veiculo_id: f.veiculo_id, valor: f.total_juros }))]} />
          <JurosResumo jurosEst={jurosEst} vendas={vendas} periodo={periodo} />

          <Secao icone={BarChart3} titulo="Gestão" />
          <GestaoInteligente />
          <VeiculosParados veiculos={veiculos} metricas={jurosEst} />
          <AlertaBaixaPendente />

          {gestao && (
            <>
              {erro && <p className="db-note" style={{ color: "#b91c1c" }}>Não foi possível carregar: {erro}</p>}
              <Secao icone={Warehouse} titulo="Estoque" />
              <div className="db-kgrid">
                <KpiCard rotulo="Veículos cadastrados" valor={veiculos.length} icone={Car} />
                <KpiCard rotulo="Em estoque" valor={emEstoque.length} icone={Boxes} />
                <KpiCard rotulo="Capital investido" valor={formatarBRL(capital)} icone={Coins} sub="compra + custos" />
                <KpiCard rotulo="Potencial de venda" valor={formatarBRL(potencial)} icone={Target} sub="valor pretendido" />
                <KpiCard rotulo="Margem projetada" valor={formatarBRL(margemValor)} icone={Percent} sub="estoque" />
              </div>

              <div className="db-charts">
                <GraficoBarras titulo="Faturamento por mês (12 meses)" dados={fatMes} formatar={(v) => formatarBRL(v)} />
                <GraficoBarras titulo="Resultado final por mês (12 meses)" dados={resMes} formatar={(v) => formatarBRL(v)} />
              </div>

              <div className="db-card">
                <p className="db-kpi-l" style={{ margin: "0 0 12px" }}>Veículos por status</p>
                <div className="db-status">
                  {statusDados.map((s) => (
                    <div key={s.rotulo} className="db-stat">
                      <div className="db-stat-v">{s.valor}</div>
                      <div className="db-stat-l">{s.rotulo}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="db-note"><Layers size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />Capital e potencial consideram o preço de compra e o valor de venda pretendido dos veículos em estoque.</p>
            </>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
