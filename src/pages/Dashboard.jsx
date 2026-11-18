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

const CSS = `
.db-wrap{max-width:1440px;margin:0 auto;padding:24px 16px 56px;display:flex;flex-direction:column;gap:22px}
@media (min-width:640px){.db-wrap{padding:24px 24px 56px}}
@media (min-width:1024px){.db-wrap{padding:28px 32px 56px}}
.db-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:14px}
.db-eyebrow{font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.db-title{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:clamp(22px,4vw,28px);font-weight:800;letter-spacing:-.02em;color:var(--text);margin:4px 0 2px;display:flex;align-items:center;gap:10px}
.db-sub{font-size:13px;color:var(--text-dim);margin:0}
.db-btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:12px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 8px 16px -4px rgba(37,99,235,.35);transition:background .2s,transform .15s;white-space:nowrap}
.db-btn:hover{background:#1d4ed8;transform:translateY(-1px)}
.db-card{background:var(--surface);border:1px solid rgba(226,232,240,.8);border-radius:20px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);padding:20px;min-width:0}
.db-sec{display:flex;align-items:center;gap:10px;margin:6px 0 -6px}
.db-sec-ic{width:36px;height:36px;border-radius:12px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.db-sec-t{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:15px;font-weight:800;color:var(--text);letter-spacing:.01em;text-transform:uppercase}
.db-kgrid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
@media (min-width:1024px){.db-kgrid{grid-template-columns:repeat(5,minmax(0,1fr))}}
.db-kpi{background:var(--surface);border:1px solid rgba(226,232,240,.8);border-radius:18px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);padding:16px;min-width:0;display:flex;flex-direction:column;gap:10px}
.db-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.db-kpi-l{font-family:Inter,system-ui,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;line-height:1.3}
.db-kpi-v{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:clamp(15px,1.7vw,22px);font-weight:800;color:var(--text);letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15}
.db-hbars{display:flex;flex-direction:column;gap:8px}
.db-hrow{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(92px,auto);gap:10px;align-items:center}
.db-hlbl{font-size:12px;font-weight:700;color:var(--text-dim);text-transform:capitalize}
.db-htrack{height:12px;border-radius:999px;background:#eef2ff;overflow:hidden}
.db-hfill{height:100%;border-radius:999px;background:linear-gradient(90deg,#2563eb,#60a5fa);transition:width .6s cubic-bezier(.16,1,.3,1)}
.db-hval{font-size:12px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}
@media (max-width:639px){.db-hrow{grid-template-columns:40px minmax(0,1fr)}.db-hval{grid-column:2;text-align:left}}
.db-kpi-ic{width:34px;height:34px;min-width:34px;border-radius:11px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center}
.db-kpi-s{font-size:11.5px;color:var(--text-mute)}
.db-charts{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:1024px){.db-charts{grid-template-columns:repeat(2,minmax(0,1fr))}}
.db-bars{display:flex;align-items:flex-end;gap:clamp(3px,1.2vw,10px);height:180px;padding-top:22px}
.db-bar{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px;position:relative}
.db-bar-v{font-size:10px;font-weight:700;color:var(--text-dim);white-space:nowrap;font-variant-numeric:tabular-nums}
.db-bar-fill{width:100%;max-width:44px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#2563eb,rgba(37,99,235,.28));box-shadow:0 8px 18px rgba(37,99,235,.22);transition:height .6s cubic-bezier(.16,1,.3,1)}
.db-bar-l{font-size:10px;color:var(--text-mute);text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:clip;max-width:100%}
.db-status{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.db-stat{border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#f8fafc;min-width:0}
.db-stat-v{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:20px;font-weight:800;color:var(--text)}
.db-stat-l{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;overflow-wrap:anywhere}
.db-note{font-size:11.5px;color:var(--text-mute);margin:0}
@media (max-width:639px){
  .db-status{grid-template-columns:repeat(2,minmax(0,1fr))}
  .db-btn{height:40px;padding:0 14px}
}
`;

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
