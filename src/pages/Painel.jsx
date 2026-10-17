// sem-rascunho: painel somente de consulta, sem formulário
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { formatarBRL } from "../lib/moeda";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 16 };
const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

function Kpi({ rotulo, valor }) {
  return (
    <div style={card}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>{rotulo}</p>
      <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{valor}</p>
    </div>
  );
}

export default function Painel() {
  const [veiculos, setVeiculos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    Promise.all([
      supabase.from("veiculos").select("status, preco_compra, preco_venda_pretendido"),
      supabase.from("v_vendas_resultado").select("valor_venda, resultado_final, investimento_total"),
    ]).then(([v, s]) => {
      if (v.error || s.error) setErro((v.error || s.error).message);
      setVeiculos(v.data ?? []);
      setVendas(s.data ?? []);
    });
  }, []);

  const emEstoque = veiculos.filter((v) => v.status !== "vendido");
  const porStatus = Object.keys(ROTULO).map((s) => ({ s, n: veiculos.filter((v) => v.status === s).length }));
  const capitalEstoque = emEstoque.reduce((s, v) => s + Number(v.preco_compra ?? 0), 0);
  const potencialEstoque = emEstoque.reduce((s, v) => s + Number(v.preco_venda_pretendido ?? 0), 0);
  const faturamento = vendas.reduce((s, v) => s + Number(v.valor_venda ?? 0), 0);
  const resultado = vendas.reduce((s, v) => s + Number(v.resultado_final ?? 0), 0);
  const investido = vendas.reduce((s, v) => s + Number(v.investimento_total ?? 0), 0);

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Painel" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 14px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <LayoutDashboard size={22} /> Painel
          </h1>
          {erro && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Não foi possível carregar: {erro}</p>}

          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Estoque</p>
          <div className="grid-4" style={{ marginBottom: 18 }}>
            <Kpi rotulo="Veículos cadastrados" valor={veiculos.length} />
            <Kpi rotulo="Em estoque" valor={emEstoque.length} />
            <Kpi rotulo="Capital investido (compra)" valor={formatarBRL(capitalEstoque)} />
            <Kpi rotulo="Potencial de venda" valor={formatarBRL(potencialEstoque)} />
          </div>
          <div className="grid-4" style={{ marginBottom: 18 }}>
            {porStatus.map(({ s, n }) => <Kpi key={s} rotulo={ROTULO[s]} valor={n} />)}
          </div>

          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Vendas</p>
          <div className="grid-4">
            <Kpi rotulo="Vendas realizadas" valor={vendas.length} />
            <Kpi rotulo="Faturamento" valor={formatarBRL(faturamento)} />
            <Kpi rotulo="Investimento vendido" valor={formatarBRL(investido)} />
            <Kpi rotulo="Resultado final" valor={formatarBRL(resultado)} />
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
            Capital e potencial consideram o preço de compra e o valor de venda pretendido dos veículos ainda em estoque.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
