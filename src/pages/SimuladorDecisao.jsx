import { useMemo } from "react";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import { useRascunho } from "../lib/rascunho";
import { simularDecisao } from "../lib/decisao";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => (n == null ? "—" : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const campo = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14 };
const rotulo = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 };
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20 };

export default function SimuladorDecisao() {
  const [v, setV] = useRascunho("simulador.form", { fipe: "", compra: "", pretendido: "", custos: "", tipoCapital: "Próprio", valorFinanciado: "", entrada: "", taxa: "3.9", meses: "48", sistema: "Price" });
  const num = (k) => Number(String(v[k]).replace(",", ".")) || 0;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const r = useMemo(() => simularDecisao({
    fipe: num("fipe"), compra: num("compra"), pretendido: num("pretendido"), custos: num("custos"),
    tipoCapital: v.tipoCapital, valorFinanciado: num("valorFinanciado"), entrada: num("entrada"),
    taxa: num("taxa"), meses: num("meses"), sistema: v.sistema,
  }), [v]);
  const temValores = num("compra") > 0 && (num("fipe") > 0 || num("pretendido") > 0);

  const linha = (t, val, cor) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-dim)" }}>{t}</span>
      <strong style={{ color: cor || "var(--text)" }}>{val}</strong>
    </div>
  );

  const bloco = (titulo, b, valorVenda) => (
    <section style={cartao}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{titulo}</h2>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-dim)" }}>Valor de venda considerado: {BRL(valorVenda)}</p>
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)", margin: "10px 0 2px" }}>À VISTA</div>
      {linha("Investimento total", BRL(b.avista.investimentoTotal))}
      {linha("Resultado líquido", BRL(b.avista.resultadoLiquido), b.avista.resultadoLiquido < 0 ? "#b91c1c" : "#059669")}
      {linha("Margem sobre a venda", PCT(valorVenda > 0 ? (b.avista.resultadoLiquido / valorVenda) * 100 : null))}
      {r.financiado && <>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)", margin: "12px 0 2px" }}>FINANCIADO ({r.financiado.sistema}, {r.financiado.n}x)</div>
        {linha("Juros do financiamento", BRL(b.comFin.custosTotais - b.avista.totalCustosAdicionais), "#b45309")}
        {linha("Investimento total", BRL(b.comFin.investimentoTotal))}
        {linha("Resultado líquido", BRL(b.comFin.resultadoLiquido), b.comFin.resultadoLiquido < 0 ? "#b91c1c" : "#059669")}
        {linha("Margem sobre a venda", PCT(valorVenda > 0 ? (b.comFin.resultadoLiquido / valorVenda) * 100 : null))}
      </>}
      <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text)" }}>
        {r.financiado ? <>Melhor opção: <strong>{b.melhor === "avista" ? "à vista" : "financiado"}</strong>, com diferença de {BRL(Math.abs(b.diferenca))}.</> : "Compra à vista (sem financiamento)."}
      </p>
    </section>
  );

  return (
    <PageTransition>
      <div className="page-bg min-h-screen">
        <Header subtitle="Simulador: comprar à vista x financiar" />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <BackLink />
          <h1 style={{ margin: "18px 0 4px", fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Simulador de decisão</h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>Mesma lógica do Calcula-Car. Não salva nenhum veículo.</p>

          <section style={{ ...cartao, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <div><label style={rotulo}>Valor FIPE (R$)</label><input style={campo} inputMode="decimal" value={v.fipe} onChange={set("fipe")} /></div>
              <div><label style={rotulo}>Valor de compra (R$)</label><input style={campo} inputMode="decimal" value={v.compra} onChange={set("compra")} /></div>
              <div><label style={rotulo}>Valor de venda pretendido (R$)</label><input style={campo} inputMode="decimal" value={v.pretendido} onChange={set("pretendido")} /></div>
              <div><label style={rotulo}>Custos adicionais (R$)</label><input style={campo} inputMode="decimal" value={v.custos} onChange={set("custos")} /></div>
              <div><label style={rotulo}>Tipo de capital</label>
                <select style={campo} value={v.tipoCapital} onChange={set("tipoCapital")}><option>Próprio</option><option>Financiamento</option></select></div>
            </div>
            {v.tipoCapital === "Financiamento" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 14 }}>
                <div><label style={rotulo}>Valor financiado (R$)</label><input style={campo} inputMode="decimal" value={v.valorFinanciado} onChange={set("valorFinanciado")} /></div>
                <div><label style={rotulo}>Entrada (R$)</label><input style={campo} inputMode="decimal" value={v.entrada} onChange={set("entrada")} /></div>
                <div><label style={rotulo}>Taxa mensal (%)</label><input style={campo} inputMode="decimal" value={v.taxa} onChange={set("taxa")} /></div>
                <div><label style={rotulo}>Parcelas (meses)</label><input style={campo} inputMode="numeric" value={v.meses} onChange={set("meses")} /></div>
                <div><label style={rotulo}>Sistema</label>
                  <select style={campo} value={v.sistema} onChange={set("sistema")}><option>Price</option><option>SAC</option></select></div>
              </div>
            )}
          </section>

          {temValores ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {bloco("Venda pela FIPE", r.pelaFipe, num("fipe"))}
              {bloco("Venda pelo valor pretendido", r.pelaPretendido, num("pretendido"))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Informe o valor de compra e a FIPE ou o valor pretendido para ver a simulação.</p>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
