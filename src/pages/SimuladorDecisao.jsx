import { useMemo } from "react";
import { useRascunho } from "../lib/rascunho";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import { compararAVistaFinanciado } from "../lib/decisao";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const campo = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14 };
const rotulo = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 };
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20 };

export default function SimuladorDecisao() {
  const [v, setV] = useRascunho("simulador.form", { fipe: "", compra: "", custos: "", pretendido: "", entrada: "", taxa: "3.9", prazo: "1" });
  const num = (k) => Number(String(v[k]).replace(",", ".")) || 0;
  const r = useMemo(() => compararAVistaFinanciado({
    compra: num("compra"), custos: num("custos"), pretendido: num("pretendido"),
    entrada: num("entrada"), taxaMensal: num("taxa"), prazo: num("prazo") || 1,
  }), [v]);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const temValores = num("compra") > 0 && num("pretendido") > 0;

  const linha = (t, val, cor) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-dim)" }}>{t}</span>
      <strong style={{ color: cor || "var(--text)" }}>{val}</strong>
    </div>
  );

  return (
    <PageTransition>
      <div className="page-bg min-h-screen">
        <Header subtitle="Simulador: comprar à vista x financiar" />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <BackLink />
          <h1 style={{ margin: "18px 0 4px", fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Simulador de decisão</h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>Compare o custo total de comprar à vista ou financiado. Não salva nenhum veículo.</p>

          <section style={{ ...cartao, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <div><label style={rotulo}>Preço FIPE (R$)</label><input style={campo} inputMode="decimal" value={v.fipe} onChange={set("fipe")} /></div>
              <div><label style={rotulo}>Preço de compra (R$)</label><input style={campo} inputMode="decimal" value={v.compra} onChange={set("compra")} /></div>
              <div><label style={rotulo}>Custos adicionais (R$)</label><input style={campo} inputMode="decimal" value={v.custos} onChange={set("custos")} /></div>
              <div><label style={rotulo}>Preço pretendido (R$)</label><input style={campo} inputMode="decimal" value={v.pretendido} onChange={set("pretendido")} /></div>
              <div><label style={rotulo}>Entrada (R$, só financiado)</label><input style={campo} inputMode="decimal" value={v.entrada} onChange={set("entrada")} /></div>
              <div><label style={rotulo}>Taxa de juros mensal (%)</label><input style={campo} inputMode="decimal" value={v.taxa} onChange={set("taxa")} /></div>
              <div><label style={rotulo}>Prazo (parcelas)</label><input style={campo} inputMode="numeric" value={v.prazo} onChange={set("prazo")} /></div>
            </div>
          </section>

          {temValores ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              <section style={{ ...cartao, outline: r.melhor === "avista" ? "2px solid #059669" : "none" }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>À vista</h2>
                {linha("Caixa inicial", BRL(r.avista.caixaInicial))}
                {linha("Juros", BRL(r.avista.juros))}
                {linha("Custo total", BRL(r.avista.custoTotal))}
                {linha("Lucro estimado", BRL(r.avista.lucro), r.avista.lucro < 0 ? "#b91c1c" : "#059669")}
              </section>
              <section style={{ ...cartao, outline: r.melhor === "financiado" ? "2px solid #059669" : "none" }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Financiado</h2>
                {linha("Caixa inicial", BRL(r.financiado.caixaInicial))}
                {linha("Juros do financiamento", BRL(r.financiado.juros), "#b45309")}
                {linha("Custo total", BRL(r.financiado.custoTotal))}
                {linha("Lucro estimado", BRL(r.financiado.lucro), r.financiado.lucro < 0 ? "#b91c1c" : "#059669")}
              </section>
              <section style={{ ...cartao, gridColumn: "1 / -1" }}>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>
                  Melhor opção por lucro: <strong>{r.melhor === "avista" ? "à vista" : "financiado"}</strong>.
                  A diferença de lucro entre as duas é de <strong>{BRL(Math.abs(r.diferencaLucro))}</strong>, equivalente ao juros do financiamento.
                </p>
              </section>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Informe o preço de compra e o preço pretendido para ver a comparação.</p>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
