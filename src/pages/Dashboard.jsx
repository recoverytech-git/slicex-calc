// sem-rascunho: painel somente de consulta, sem formulário
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Landmark, Percent, Scissors, Car, Warehouse, ArrowRight, LayoutDashboard } from "lucide-react";
import Header from "../components/Header";
import PageTransition from "../components/PageTransition";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { formatarBRL } from "../lib/moeda";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" };
const GESTAO = ["admin_master", "proprietario", "gerente"];
const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

const ACESSOS = [
  { to: "/financiamento", titulo: "Financiamento", texto: "Price ou SAC, com tabela completa", icon: Landmark },
  { to: "/percentual", titulo: "Diferença %", texto: "Variação entre dois valores", icon: Percent },
  { to: "/amortizacao", titulo: "Amortização extra", texto: "Reduzir o prazo ou a parcela", icon: Scissors },
  { to: "/calcula-car", titulo: "Calcula-Car", texto: "Análise de compra e venda", icon: Car },
  { to: "/estoque", titulo: "Estoque", texto: "Veículos, fotos e checklist", icon: Warehouse },
];

function Kpi({ rotulo, valor, i = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      style={{ ...card, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>{rotulo}</p>
      <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{valor}</p>
    </motion.div>
  );
}

/** Gráfico de barras em CSS, com a altura animada. Sem dependências externas. */
function GraficoBarras({ titulo, dados, formatar = (v) => v }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div style={{ ...card, padding: 18 }}>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{titulo}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 170 }}>
        {dados.map((d, i) => (
          <div key={d.rotulo + i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, color: "var(--text-mute)", whiteSpace: "nowrap" }}>{d.valor ? formatar(d.valor) : ""}</span>
            <motion.div title={`${d.rotulo}: ${formatar(d.valor)}`}
              initial={{ height: 0 }} animate={{ height: `${(d.valor / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", minHeight: d.valor ? 4 : 0, borderRadius: "6px 6px 2px 2px", background: "linear-gradient(180deg, var(--accent), rgba(68,147,248,0.35))", boxShadow: "0 6px 16px rgba(68,147,248,0.25)" }} />
            <span style={{ fontSize: 10, color: "var(--text-mute)" }}>{d.rotulo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { perfil } = useAuth();
  const gestao = GESTAO.includes(perfil?.papel);
  const [veiculos, setVeiculos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado || !gestao) return;
    Promise.all([
      supabase.from("veiculos").select("status, preco_compra, preco_venda_pretendido"),
      supabase.from("v_vendas_resultado").select("data_venda, valor_venda, resultado_final, investimento_total"),
    ]).then(([v, s]) => {
      if (v.error || s.error) setErro((v.error || s.error).message);
      setVeiculos(v.data ?? []);
      setVendas(s.data ?? []);
    });
  }, [gestao]);

  // Últimos 12 meses
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
  const capital = emEstoque.reduce((s, v) => s + Number(v.preco_compra ?? 0), 0);
  const potencial = emEstoque.reduce((s, v) => s + Number(v.preco_venda_pretendido ?? 0), 0);
  const faturamento = vendas.reduce((s, v) => s + Number(v.valor_venda ?? 0), 0);
  const resultado = vendas.reduce((s, v) => s + Number(v.resultado_final ?? 0), 0);
  const investido = vendas.reduce((s, v) => s + Number(v.investimento_total ?? 0), 0);
  const margem = investido > 0 ? (resultado / investido) * 100 : null;

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Dashboard" />
        <div className="container" style={{ paddingTop: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 4px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <LayoutDashboard size={22} /> Dashboard
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>Acesse as ferramentas e acompanhe a operação.</p>

          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Acessos</p>
          <div className="grid-3" style={{ marginBottom: 22 }}>
            {ACESSOS.map(({ to, titulo, texto, icon: Icon }, i) => (
              <motion.div key={to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                <Link to={to} style={{ ...card, padding: 18, display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", height: "100%" }}>
                  <span style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: "rgba(68,147,248,0.12)", border: "1px solid rgba(68,147,248,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color="var(--accent)" />
                  </span>
                  <span>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{titulo}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{texto}</span>
                  </span>
                  <span style={{ marginTop: "auto", fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 6 }}>Abrir <ArrowRight size={13} /></span>
                </Link>
              </motion.div>
            ))}
          </div>

          {gestao && (
            <>
              {erro && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Não foi possível carregar: {erro}</p>}
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Estoque</p>
              <div className="grid-4" style={{ marginBottom: 14 }}>
                <Kpi i={0} rotulo="Veículos cadastrados" valor={veiculos.length} />
                <Kpi i={1} rotulo="Em estoque" valor={emEstoque.length} />
                <Kpi i={2} rotulo="Capital investido (compra)" valor={formatarBRL(capital)} />
                <Kpi i={3} rotulo="Potencial de venda" valor={formatarBRL(potencial)} />
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Vendas</p>
              <div className="grid-4" style={{ marginBottom: 18 }}>
                <Kpi i={0} rotulo="Vendas realizadas" valor={vendas.length} />
                <Kpi i={1} rotulo="Faturamento" valor={formatarBRL(faturamento)} />
                <Kpi i={2} rotulo="Resultado final" valor={formatarBRL(resultado)} />
                <Kpi i={3} rotulo="Margem sobre investido" valor={margem == null ? "—" : `${margem.toFixed(2)}%`} />
              </div>

              <div className="grid-2" style={{ marginBottom: 14 }}>
                <GraficoBarras titulo="Faturamento por mês (12 meses)" dados={fatMes} formatar={(v) => formatarBRL(v)} />
                <GraficoBarras titulo="Resultado final por mês (12 meses)" dados={resMes} formatar={(v) => formatarBRL(v)} />
              </div>
              <GraficoBarras titulo="Veículos por status" dados={statusDados} formatar={(v) => String(v)} />
              <p style={{ margin: "14px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
                Capital e potencial consideram o preço de compra e o valor de venda pretendido dos veículos em estoque.
              </p>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
