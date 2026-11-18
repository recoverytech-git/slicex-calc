import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Target, TrendingUp, Car, AlertTriangle, CheckCircle2 } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import DbCabeca from "../components/DbCabeca";
import { DB_CSS } from "../components/dbEstilos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho } from "../lib/rascunho";
import {
  CATEGORIAS_CUSTO, custoFixoMensal, mapaCapital, resumoEstoque, vendasPeriodo, resumoVendas, planoMeta, alertaExcesso,
} from "../lib/custos";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => (n == null || Number.isNaN(n) ? "—" : `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const GESTAO = ["admin_master", "proprietario", "gerente"];
const VAZIO_CUSTO = { descricao: "", categoria: CATEGORIAS_CUSTO[0], valor: "" };
const DIAS_VENDA = [30, 90, 360];
const corLucro = (n) => (Number(n) < 0 ? "#b91c1c" : "#059669");
const dataDias = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

export default function Custos() {
  const { perfil } = useAuth();
  const [custos, setCustos] = useState([]);
  const [meta, setMeta] = useState("");
  const [veiculos, setVeiculos] = useState([]);
  const [custosVeic, setCustosVeic] = useState([]);
  const [fin, setFin] = useState([]);
  const [metricas, setMetricas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [diasVenda, setDiasVenda] = useState(30);
  const [novo, setNovo] = useRascunho("custos.novo", VAZIO_CUSTO);
  const [aviso, setAviso] = useState(null);
  const [erro, setErro] = useState(null);
  const gestao = GESTAO.includes(perfil?.papel);

  const carregar = async () => {
    if (!supabaseConfigurado || !gestao) return;
    const [c, cf, v, vc, f, m, vd] = await Promise.all([
      supabase.from("custos_recorrentes").select("id, descricao, categoria, valor_mensal, ativo").order("criado_em", { ascending: true }),
      supabase.from("custos_config").select("meta_lucro_mensal").maybeSingle(),
      supabase.from("veiculos").select("id, status, modelo, placa, preco_compra, preco_venda_pretendido, valor_fipe"),
      supabase.from("veiculo_custos").select("veiculo_id, valor"),
      supabase.from("veiculo_financiamentos").select("veiculo_id, total_juros"),
      supabase.from("v_estoque_metricas").select("veiculo_id, juros_diario_acumulado"),
      supabase.from("v_vendas_resultado").select("data_venda, modelo, placa, valor_venda, resultado_final, juros_total").gte("data_venda", dataDias(360)).order("data_venda", { ascending: false }),
    ]);
    const falha = [c, cf, v, vc, f, m, vd].find((r) => r.error);
    if (falha) { setErro(falha.error.message); return; }
    setCustos(c.data ?? []);
    setMeta(String(cf.data?.meta_lucro_mensal ?? ""));
    setVeiculos(v.data ?? []);
    setCustosVeic(vc.data ?? []);
    setFin(f.data ?? []);
    setMetricas(m.data ?? []);
    setVendas(vd.data ?? []);
  };
  useEffect(() => { carregar(); }, [gestao]);

  // Valores reais: estoque (igual a tela Estoque), vendas concretizadas e custos cadastrados
  const estoque = useMemo(() => resumoEstoque({ veiculos, custosVeic, fin, metricas }), [veiculos, custosVeic, fin, metricas]);
  const mapa = useMemo(() => mapaCapital({ veiculos, custosVeic, fin, metricas }), [veiculos, custosVeic, fin, metricas]);
  const vendas30 = useMemo(() => resumoVendas(vendasPeriodo(vendas, 30)), [vendas]);
  const vendasSel = useMemo(() => vendasPeriodo(vendas, diasVenda), [vendas, diasVenda]);
  const resumoSel = useMemo(() => resumoVendas(vendasSel), [vendasSel]);
  const fixo = custoFixoMensal(custos);
  const metaNumero = Number(String(meta).replace(",", ".")) || 0;
  const cenario1 = vendas30.res - fixo;
  const cenario2 = cenario1 + estoque.lucroPret;
  const plano = useMemo(() => planoMeta({
    meta: metaNumero, fixo, realizadoMes: vendas30.res,
    veiculos: veiculos.filter((v) => v.status !== "vendido").map((v) => ({ id: v.id, modelo: v.modelo, placa: v.placa, resultado: mapa[v.id]?.resultado ?? 0 })),
  }), [metaNumero, fixo, vendas30.res, veiculos, mapa]);
  // excesso de custos: custos fixos do mes x resultado liquido realizado nos ultimos 30 dias
  const alerta = alertaExcesso({ custoFixoMensal: fixo, resultadoLiquidoMes: vendas30.res });

  const adicionar = async (e) => {
    e.preventDefault();
    setAviso(null);
    const valor = Number(String(novo.valor).replace(",", "."));
    if (novo.descricao.trim().length < 2) return setAviso({ tipo: "erro", texto: "Descreva o custo (ex.: Seguro da frota)." });
    if (!(valor >= 0)) return setAviso({ tipo: "erro", texto: "Informe o valor mensal." });
    const { error } = await supabase.from("custos_recorrentes").insert({ organizacao_id: perfil.organizacao_id, descricao: novo.descricao.trim(), categoria: novo.categoria, valor_mensal: valor });
    if (error) return setAviso({ tipo: "erro", texto: error.message });
    setNovo(VAZIO_CUSTO);
    carregar();
  };
  const alternarAtivo = async (c) => {
    const { error } = await supabase.from("custos_recorrentes").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) return setAviso({ tipo: "erro", texto: error.message });
    carregar();
  };
  const remover = async (c) => {
    if (!window.confirm(`Remover "${c.descricao}"?`)) return;
    const { error } = await supabase.from("custos_recorrentes").delete().eq("id", c.id);
    if (error) return setAviso({ tipo: "erro", texto: error.message });
    carregar();
  };
  const salvarMeta = async () => {
    const { error } = await supabase.from("custos_config").upsert({ organizacao_id: perfil.organizacao_id, meta_lucro_mensal: metaNumero, atualizado_em: new Date().toISOString() }, { onConflict: "organizacao_id" });
    if (error) return setAviso({ tipo: "erro", texto: error.message });
    setAviso({ tipo: "ok", texto: "Meta de lucro salva." });
  };

  if (!gestao) return null;

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{DB_CSS}</style>
        <Header subtitle="Custos do estoque" />
        <main className="db-wrap">
          <BackLink />
          <header className="db-head">
            <div>
              <div className="db-eyebrow">Gestão financeira</div>
              <h1 className="db-title"><Wallet size={24} /> Custos do estoque</h1>
              <p className="db-sub">Todos os valores são reais: vendas concretizadas, veículos do estoque e custos cadastrados.</p>
            </div>
          </header>

          {erro && <section className="db-card"><p className="db-note" style={{ color: "#b91c1c" }}>{erro}</p></section>}
          {aviso && <p className="db-note" style={{ color: aviso.tipo === "ok" ? "#059669" : "#b91c1c", fontWeight: 700 }}>{aviso.texto}</p>}

          <div className="db-kgrid">
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Custos fixos / mês</span><span className="db-kpi-ic"><Wallet size={16} /></span></div><div className="db-kpi-v">{BRL(fixo)}</div><div className="db-kpi-s">{custos.filter((c) => c.ativo !== false).length} custos ativos</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Vendas (30 dias)</span><span className="db-kpi-ic"><Car size={16} /></span></div><div className="db-kpi-v">{vendas30.n}</div><div className="db-kpi-s">veículos vendidos</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Resultado final (30 dias)</span><span className="db-kpi-ic"><TrendingUp size={16} /></span></div><div className="db-kpi-v" style={{ color: corLucro(vendas30.res) }}>{BRL(vendas30.res)}</div><div className="db-kpi-s">soma real das vendas</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Lucro líquido do mês</span><span className="db-kpi-ic"><Target size={16} /></span></div><div className="db-kpi-v" style={{ color: corLucro(cenario1) }}>{BRL(cenario1)}</div><div className="db-kpi-s">resultado final − custos fixos</div></div>
          </div>

          {alerta && (
            <section className="db-card" style={{ borderColor: alerta.nivel === "alto" ? "#fecaca" : "#fde68a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className={`db-pill ${alerta.nivel === "alto" ? "db-pill-verm" : "db-pill-ambar"}`}><AlertTriangle size={13} /> Excesso de custos</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{alerta.texto}</span>
                <span className="db-alerta-linha">Resultado líquido realizado nos últimos 30 dias: <strong>{BRL(vendas30.res)}</strong> · custos fixos: <strong>{BRL(fixo)}</strong>{vendas30.res > 0 ? <> · custos = <strong>{PCT((fixo / vendas30.res) * 100)}</strong> do resultado líquido</> : null}. É a soma do resultado final de cada venda, já descontados despesas, descontos, compra, custos e juros.</span>
              </div>
            </section>
          )}

          <section className="db-card">
            <DbCabeca Icone={Car} titulo="Estoque (valores atuais)" sub="Mesma base da tela Estoque: capital = compra + custos + juros do financiamento + juros acumulado" />
            <div className="db-kgrid-4">
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Total no pátio</span></div><div className="db-kpi-v">{estoque.total}</div><div className="db-kpi-s">unidades não vendidas</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Venda pela FIPE</span></div><div className="db-kpi-v">{BRL(estoque.potFipe)}</div><div className="db-kpi-s">potencial somando os valores FIPE</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Venda acima da FIPE</span></div><div className="db-kpi-v">{BRL(estoque.potPret)}</div><div className="db-kpi-s">potencial somando os valores pretendidos</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Ticket médio FIPE</span></div><div className="db-kpi-v">{BRL(estoque.ticketFipe)}</div><div className="db-kpi-s">faixa {BRL(estoque.minFipe)} – {BRL(estoque.maxFipe)}</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Lucro atual na FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(estoque.lucroFipe) }}>{BRL(estoque.lucroFipe)}</div><div className="db-kpi-s">potencial FIPE − capital investido</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Lucro atual acima da FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(estoque.lucroPret) }}>{BRL(estoque.lucroPret)}</div><div className="db-kpi-s">potencial pretendido − capital investido</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem estimada na FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(estoque.margemFipe) }}>{PCT(estoque.margemFipe)}</div><div className="db-kpi-s">lucro FIPE ÷ potencial FIPE</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem estimada acima da FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(estoque.margemPret) }}>{PCT(estoque.margemPret)}</div><div className="db-kpi-s">lucro pretendido ÷ potencial pretendido</div></div>
            </div>
          </section>

          <section className="db-card">
            <DbCabeca Icone={TrendingUp} titulo="Vendas reais" sub="Cada venda concretizada no período, com o resultado final real" acao={
              <div className="db-chips">{DIAS_VENDA.map((d) => (
                <button key={d} type="button" className={`db-chip ${diasVenda === d ? "on" : ""}`} onClick={() => setDiasVenda(d)}>{d === 360 ? "360 dias" : `${d} dias`}</button>
              ))}</div>} />
            <div className="db-kgrid" style={{ marginBottom: 14 }}>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Veículos vendidos</span></div><div className="db-kpi-v">{resumoSel.n}</div><div className="db-kpi-s">no período</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Faturamento</span></div><div className="db-kpi-v">{BRL(resumoSel.fat)}</div><div className="db-kpi-s">soma dos valores vendidos</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Resultado final</span></div><div className="db-kpi-v" style={{ color: corLucro(resumoSel.res) }}>{BRL(resumoSel.res)}</div><div className="db-kpi-s">após custos de cada venda</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Ticket médio real</span></div><div className="db-kpi-v">{BRL(resumoSel.ticket)}</div><div className="db-kpi-s">faturamento ÷ veículos vendidos</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem real</span></div><div className="db-kpi-v" style={{ color: corLucro(resumoSel.res) }}>{PCT(resumoSel.margem)}</div><div className="db-kpi-s">resultado final ÷ faturamento</div></div>
            </div>
            {vendasSel.length === 0 ? <p className="db-note">Nenhuma venda no período.</p> : (
              <div className="db-tbl-wrap">
                <table className="db-tbl">
                  <thead><tr><th>Data</th><th>Veículo</th><th className="db-r">Venda</th><th className="db-r">Resultado final</th><th className="db-r">%</th></tr></thead>
                  <tbody>
                    {vendasSel.map((v, i) => (
                      <tr key={i}>
                        <td>{String(v.data_venda).slice(0, 10).split("-").reverse().join("/")}</td>
                        <td style={{ fontWeight: 700 }}>{v.modelo}{v.placa ? ` · ${v.placa}` : ""}</td>
                        <td className="db-r">{BRL(v.valor_venda)}</td>
                        <td className="db-r" style={{ fontWeight: 800, color: corLucro(v.resultado_final) }}>{BRL(v.resultado_final)}</td>
                        <td className="db-r"><span className={`db-pill ${Number(v.resultado_final) < 0 ? "db-pill-verm" : "db-pill-verde"}`}>{PCT((Number(v.resultado_final) / Number(v.valor_venda || 1)) * 100)}</span></td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 800 }}>Total do período</td>
                      <td className="db-r" style={{ fontWeight: 800 }}>{BRL(resumoSel.fat)}</td>
                      <td className="db-r" style={{ fontWeight: 800, color: corLucro(resumoSel.res) }}>{BRL(resumoSel.res)}</td>
                      <td className="db-r"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="db-card">
            <DbCabeca Icone={Target} titulo="Meta de lucro líquido" sub="Quanto a loja quer ganhar, líquido, neste mês. O plano usa veículos reais do estoque." />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
              <div style={{ flex: "1 1 240px", maxWidth: 320 }}>
                <label className="db-label">Lucro líquido desejado (R$ / mês)</label>
                <input className="db-input" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ex.: 20000" />
              </div>
              <button type="button" className="db-btn-prim" onClick={salvarMeta}><CheckCircle2 size={16} /> Salvar meta</button>
            </div>

            <div className="db-scen">
              <div className="db-kpi" style={{ borderColor: cenario1 >= metaNumero ? "#a7f3d0" : "#fde68a" }}>
                <div className="db-kpi-l">Cenário 1 · Realizado nos últimos 30 dias</div>
                <div className="db-kpi-v" style={{ color: corLucro(cenario1) }}>{BRL(cenario1)}</div>
                <div className="db-kpi-s">resultado final real − custos fixos</div>
                {cenario1 >= metaNumero
                  ? <span className="db-pill db-pill-verde"><CheckCircle2 size={13} /> Atinge a meta</span>
                  : <span className="db-pill db-pill-ambar"><AlertTriangle size={13} /> Faltam {BRL(metaNumero - cenario1)}</span>}
              </div>
              <div className="db-kpi" style={{ borderColor: cenario2 >= metaNumero ? "#a7f3d0" : "#fde68a" }}>
                <div className="db-kpi-l">Cenário 2 · Vender todo o estoque atual</div>
                <div className="db-kpi-v" style={{ color: corLucro(cenario2) }}>{BRL(cenario2)}</div>
                <div className="db-kpi-s">realizado do mês − custos fixos + resultado real de cada veículo do pátio</div>
                {cenario2 >= metaNumero
                  ? <span className="db-pill db-pill-verde"><CheckCircle2 size={13} /> Atinge a meta</span>
                  : <span className="db-pill db-pill-ambar"><AlertTriangle size={13} /> Faltam {BRL(metaNumero - cenario2)}</span>}
              </div>
              <div className="db-kpi" style={{ borderColor: plano.atingivel ? "#a7f3d0" : "#fecaca" }}>
                <div className="db-kpi-l">Cenário 3 · Plano para atingir a meta</div>
                {plano.atingivel ? (
                  plano.escolhidos.length === 0
                    ? <div className="db-kpi-s" style={{ fontSize: 13, color: "var(--text)" }}>O resultado realizado já atinge a meta. Nenhum veículo é necessário.</div>
                    : <>
                        <div className="db-kpi-v">{plano.escolhidos.length} veículo(s)</div>
                        <div className="db-kpi-s" style={{ fontSize: 13, color: "var(--text)" }}>Vender, nesta ordem:</div>
                        <div className="db-kpi-s">Veja a ordem completa na tabela abaixo.</div>
                      </>
                ) : (
                  <div className="db-kpi-s" style={{ fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>
                    Nem vendendo todo o estoque atual a meta é atingida. Faltam {BRL(plano.falta)}.
                  </div>
                )}
                {plano.atingivel && <span className="db-pill db-pill-verde"><CheckCircle2 size={13} /> Atinge a meta</span>}
              </div>
            </div>
            {plano.atingivel && plano.escolhidos.length > 0 && (
              <div className="db-tbl-wrap" style={{ marginTop: 16 }}>
                <table className="db-tbl">
                  <thead><tr><th>Ordem</th><th>Veículo</th><th className="db-r">Resultado real</th><th className="db-r">Acumulado no mês</th></tr></thead>
                  <tbody>
                    {plano.escolhidos.map((v, i) => (
                      <tr key={v.id}>
                        <td><span className="db-pill db-pill-azul">{i + 1}º</span></td>
                        <td style={{ fontWeight: 700 }}>{v.modelo}{v.placa ? ` · ${v.placa}` : ""}</td>
                        <td className="db-r">{BRL(v.resultado)}</td>
                        <td className="db-r" style={{ fontWeight: 800, color: corLucro(v.acumulado) }}>{BRL(v.acumulado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="db-note" style={{ marginTop: 12 }}>
              Como calculamos (somente valores reais): lucro = resultado final das vendas do mês − custos fixos + resultado real de cada veículo vendido.
              Resultado real de cada veículo = preço pretendido − capital investido (igual à tela Estoque). Custos fixos: {BRL(fixo)} por mês.
            </p>
          </section>

          <section className="db-card">
            <DbCabeca Icone={Wallet} titulo="Custos recorrentes" sub="Seguro, pátio, lavagem e outros custos fixos da operação" />
            <form onSubmit={adicionar} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", alignItems: "end", marginBottom: 16 }}>
              <div><label className="db-label">Descrição</label><input className="db-input" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} placeholder="Ex.: Seguro da frota" /></div>
              <div><label className="db-label">Categoria</label>
                <select className="db-input" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>
                  {CATEGORIAS_CUSTO.map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div><label className="db-label">Valor mensal (R$)</label><input className="db-input" inputMode="decimal" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} placeholder="0,00" /></div>
              <button type="submit" className="db-btn-prim" style={{ justifyContent: "center" }}><Plus size={16} /> Adicionar custo</button>
            </form>
            {custos.length === 0 ? <p className="db-note">Nenhum custo cadastrado.</p> : (
              <div className="db-tbl-wrap">
                <table className="db-tbl">
                  <thead><tr><th>Descrição</th><th>Categoria</th><th className="db-r">Valor / mês</th><th>Ativo</th><th></th></tr></thead>
                  <tbody>
                    {custos.map((c) => (
                      <tr key={c.id} style={{ opacity: c.ativo === false ? 0.5 : 1 }}>
                        <td style={{ fontWeight: 700 }}>{c.descricao}</td>
                        <td><span className="db-pill db-pill-azul">{c.categoria}</span></td>
                        <td className="db-r" style={{ fontWeight: 800 }}>{BRL(c.valor_mensal)}</td>
                        <td><input type="checkbox" checked={c.ativo !== false} onChange={() => alternarAtivo(c)} aria-label="Ativo" /></td>
                        <td className="db-r"><button type="button" className="db-btn-sec" onClick={() => remover(c)} aria-label="Remover" style={{ height: 34, padding: "0 10px" }}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
