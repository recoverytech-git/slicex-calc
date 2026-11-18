import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Target, TrendingUp, Car, AlertTriangle, CheckCircle2, Percent } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import DbCabeca from "../components/DbCabeca";
import { DB_CSS } from "../components/dbEstilos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { CATEGORIAS_CUSTO, custoFixoMensal, analisarMeta, alertaExcesso, resumoEstoque, resumoReal } from "../lib/custos";
import { useRascunho } from "../lib/rascunho";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => `${(Number(n || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const GESTAO = ["admin_master", "proprietario", "gerente"];
const VAZIO_CUSTO = { descricao: "", categoria: CATEGORIAS_CUSTO[0], valor: "" };

export default function Custos() {
  const { perfil } = useAuth();
  const [custos, setCustos] = useState([]);
  const [meta, setMeta] = useState("");
  const [metaSalva, setMetaSalva] = useState(0);
  const [veiculos, setVeiculos] = useState([]);
  const [custosVeic, setCustosVeic] = useState([]);
  const [fin, setFin] = useState([]);
  const [metricas, setMetricas] = useState([]);
  const [vendas30, setVendas30] = useState(0);
  const [vendasMes, setVendasMes] = useState([]);
  const [novo, setNovo] = useRascunho("custos.novo", VAZIO_CUSTO);
  const [aviso, setAviso] = useState(null);
  const [erro, setErro] = useState(null);
  const gestao = GESTAO.includes(perfil?.papel);

  const carregar = async () => {
    if (!supabaseConfigurado || !gestao) return;
    const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [c, cf, v, vc, f, m, vd] = await Promise.all([
      supabase.from("custos_recorrentes").select("id, descricao, categoria, valor_mensal, ativo").order("criado_em", { ascending: true }),
      supabase.from("custos_config").select("meta_lucro_mensal").maybeSingle(),
      supabase.from("veiculos").select("id, status, modelo, preco_compra, preco_venda_pretendido, valor_fipe"),
      supabase.from("veiculo_custos").select("veiculo_id, valor"),
      supabase.from("veiculo_financiamentos").select("veiculo_id, total_juros"),
      supabase.from("v_estoque_metricas").select("veiculo_id, juros_diario_acumulado"),
      supabase.from("v_vendas_resultado").select("data_venda, valor_venda, resultado_final").gte("data_venda", desde),
    ]);
    const falha = [c, cf, v, vc, f, m, vd].find((r) => r.error);
    if (falha) { setErro(falha.error.message); return; }
    setCustos(c.data ?? []);
    setMetaSalva(Number(cf.data?.meta_lucro_mensal ?? 0));
    setMeta(String(cf.data?.meta_lucro_mensal ?? ""));
    setVeiculos(v.data ?? []);
    setCustosVeic(vc.data ?? []);
    setFin(f.data ?? []);
    setMetricas(m.data ?? []);
    setVendas30((vd.data ?? []).length);
    setVendasMes(vd.data ?? []);
  };
  useEffect(() => { carregar(); }, [gestao]);

  const resumo = useMemo(() => resumoEstoque({ veiculos, custosVeic, fin, metricas }), [veiculos, custosVeic, fin, metricas]);
  const real = useMemo(() => resumoReal(vendasMes), [vendasMes]);
  const pctTxt = (n) => (n == null || Number.isNaN(n) ? "—" : `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
  const corLucro = (n) => (Number(n) < 0 ? "#b91c1c" : "#059669");

  const fixo = custoFixoMensal(custos);
  const margemMedia = resumo.margemMedia;
  const precoMedio = resumo.precoMedio;
  const analise = analisarMeta({ custoFixoMensal: fixo, vendas30, margemMedia, precoMedio, meta: Number(String(meta).replace(",", ".")) || 0 });
  const alerta = alertaExcesso({ custoFixoMensal: fixo, margemBrutaMes: analise.margemBrutaMes ?? 0 });

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
    const valor = Number(String(meta).replace(",", ".")) || 0;
    const { error } = await supabase.from("custos_config").upsert({ organizacao_id: perfil.organizacao_id, meta_lucro_mensal: valor, atualizado_em: new Date().toISOString() }, { onConflict: "organizacao_id" });
    if (error) return setAviso({ tipo: "erro", texto: error.message });
    setMetaSalva(valor);
    setAviso({ tipo: "ok", texto: "Meta de lucro salva." });
  };

  if (!gestao) return null;
  const cor = analise.status === "ok" ? "#059669" : "#b45309";

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
              <p className="db-sub">Cadastre os custos fixos da operação e veja quanto eles reduzem o lucro líquido.</p>
            </div>
          </header>

          <section className="db-card">
            <DbCabeca Icone={Car} titulo="Estoque (valores atuais)" sub="Mesma base da meta de lucro: capital = compra + custos + juros do financiamento + juros acumulado" />
            <div className="db-kgrid">
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Total no pátio</span></div><div className="db-kpi-v">{resumo.total}</div><div className="db-kpi-s">unidades não vendidas</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Venda pela FIPE</span></div><div className="db-kpi-v">{BRL(resumo.potFipe)}</div><div className="db-kpi-s">potencial somando os valores FIPE</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Venda acima da FIPE</span></div><div className="db-kpi-v">{BRL(resumo.potPret)}</div><div className="db-kpi-s">potencial somando os valores pretendidos</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Ticket médio FIPE</span></div><div className="db-kpi-v">{BRL(resumo.ticketFipe)}</div><div className="db-kpi-s">faixa {BRL(resumo.minFipe)} – {BRL(resumo.maxFipe)}</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Lucro atual na FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(resumo.lucroFipe) }}>{BRL(resumo.lucroFipe)}</div><div className="db-kpi-s">potencial FIPE − capital investido</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Lucro atual acima da FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(resumo.lucroPret) }}>{BRL(resumo.lucroPret)}</div><div className="db-kpi-s">potencial pretendido − capital investido</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem estimada na FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(resumo.margemFipe) }}>{pctTxt(resumo.margemFipe)}</div><div className="db-kpi-s">lucro FIPE ÷ potencial FIPE</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem estimada acima da FIPE</span></div><div className="db-kpi-v" style={{ color: corLucro(resumo.margemPret) }}>{pctTxt(resumo.margemPret)}</div><div className="db-kpi-s">lucro pretendido ÷ potencial pretendido</div></div>
            </div>
          </section>
          <section className="db-card">
            <DbCabeca Icone={TrendingUp} titulo="Vendas reais (30 dias)" sub="Valores efetivamente vendidos no período" />
            <div className="db-kgrid">
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Veículos vendidos</span></div><div className="db-kpi-v">{real.n}</div><div className="db-kpi-s">últimos 30 dias</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Faturamento</span></div><div className="db-kpi-v">{BRL(real.fat)}</div><div className="db-kpi-s">soma dos valores vendidos</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Resultado final</span></div><div className="db-kpi-v" style={{ color: corLucro(real.res) }}>{BRL(real.res)}</div><div className="db-kpi-s">após custos de cada venda</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Ticket médio real</span></div><div className="db-kpi-v">{BRL(real.ticket)}</div><div className="db-kpi-s">faturamento ÷ veículos vendidos</div></div>
              <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem real</span></div><div className="db-kpi-v" style={{ color: corLucro(real.res) }}>{pctTxt(real.margem)}</div><div className="db-kpi-s">resultado final ÷ faturamento</div></div>
            </div>
          </section>

          {erro && <section className="db-card"><p className="db-note" style={{ color: "#b91c1c" }}>{erro}</p></section>}
          {aviso && <p className="db-note" style={{ color: aviso.tipo === "ok" ? "#059669" : "#b91c1c", fontWeight: 700 }}>{aviso.texto}</p>}

          <div className="db-kgrid">
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Custos fixos / mês</span><span className="db-kpi-ic"><Wallet size={16} /></span></div><div className="db-kpi-v">{BRL(fixo)}</div><div className="db-kpi-s">{custos.filter((c) => c.ativo !== false).length} custos ativos</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Vendas (30 dias)</span><span className="db-kpi-ic"><Car size={16} /></span></div><div className="db-kpi-v">{vendas30}</div><div className="db-kpi-s">veículos vendidos</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem média / carro</span><span className="db-kpi-ic"><Percent size={16} /></span></div><div className="db-kpi-v">{BRL(margemMedia)}</div><div className="db-kpi-s">estoque atual</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Margem bruta do mês</span><span className="db-kpi-ic"><TrendingUp size={16} /></span></div><div className="db-kpi-v">{BRL(analise.margemBrutaMes ?? 0)}</div><div className="db-kpi-s">vendas × margem média</div></div>
            <div className="db-kpi"><div className="db-kpi-top"><span className="db-kpi-l">Lucro líquido do mês</span><span className="db-kpi-ic"><Target size={16} /></span></div><div className="db-kpi-v" style={{ color: (analise.lucroLiquidoMes ?? 0) < 0 ? "#b91c1c" : "#059669" }}>{BRL(analise.lucroLiquidoMes ?? 0)}</div><div className="db-kpi-s">após custos fixos</div></div>
          </div>

          {alerta && (
            <section className="db-card" style={{ borderColor: alerta.nivel === "alto" ? "#fecaca" : "#fde68a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`db-pill ${alerta.nivel === "alto" ? "db-pill-verm" : "db-pill-ambar"}`}><AlertTriangle size={13} /> Excesso de custos</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{alerta.texto}</span>
              </div>
            </section>
          )}

          <section className="db-card">
            <DbCabeca Icone={Target} titulo="Meta de lucro líquido" sub="Informe quanto a loja quer ganhar, líquido, por mês. O sistema mostra o que falta para atingir." />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
              <div style={{ flex: "1 1 240px", maxWidth: 320 }}>
                <label className="db-label">Lucro líquido desejado (R$ / mês)</label>
                <input className="db-input" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ex.: 20000" />
              </div>
              <button type="button" className="db-btn-prim" onClick={salvarMeta}><CheckCircle2 size={16} /> Salvar meta</button>
            </div>

            {analise.status === "sem_dados" && <p className="db-note">Cadastre veículos no estoque com preço de venda pretendido para calcular a meta.</p>}
            {analise.status === "ok" && (
              <div className="db-grid-2">
                <div className="db-kpi" style={{ borderColor: "#a7f3d0" }}>
                  <span className="db-pill db-pill-verde"><CheckCircle2 size={13} /> Dentro do esperado</span>
                  <div className="db-kpi-v" style={{ color: "#059669" }}>+{BRL(analise.excedente)}</div>
                  <div className="db-kpi-s">acima da meta, neste mês, com o volume atual de vendas</div>
                </div>
                <div className="db-kpi">
                  <div className="db-kpi-l">Para manter a meta você precisa vender</div>
                  <div className="db-kpi-v">{analise.veiculosNecessarios} carros / mês</div>
                  <div className="db-kpi-s">ao ritmo atual são {vendas30}</div>
                </div>
              </div>
            )}
            {analise.status === "abaixo" && (
              <div className="db-grid-2">
                <div className="db-kpi" style={{ borderColor: "#fde68a" }}>
                  <span className="db-pill db-pill-ambar"><AlertTriangle size={13} /> Abaixo da meta</span>
                  <div className="db-kpi-v" style={{ color: cor }}>faltam {BRL(analise.faltaTotal)}</div>
                  <div className="db-kpi-s">de margem no mês para cobrir custos e atingir a meta</div>
                </div>
                <div className="db-kpi">
                  <div className="db-kpi-l">Caminhos para atingir</div>
                  <div className="db-kpi-s" style={{ fontSize: 13, color: "var(--text)" }}>
                    • Vender {analise.faltamVeiculos} carro(s) a mais no mês<br />
                    • Ou ganhar {BRL(analise.acrescimoPorVeiculo)} a mais de margem por carro
                    {analise.acrescimoPrecoPct != null && ` (≈ ${PCT(analise.acrescimoPrecoPct)} do preço médio)`}
                  </div>
                </div>
              </div>
            )}
            {analise.custoPorVeiculo != null && (
              <p className="db-note" style={{ marginTop: 12 }}>Custo fixo por carro vendido: {BRL(analise.custoPorVeiculo)} (custo mensal ÷ vendas dos últimos 30 dias).</p>
            )}
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
