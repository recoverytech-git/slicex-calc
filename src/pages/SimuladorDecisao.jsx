import { useMemo } from "react";
import { Calculator, Car, Target, Banknote, Percent, CalendarDays, Landmark, Scale, FileDown } from "lucide-react";
import { gerarPdfSimulacao } from "../lib/simuladorPdf";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import { useRascunho } from "../lib/rascunho";
import { simularDecisao } from "../lib/decisao";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (n) => (n == null ? "—" : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

const CSS = `
.sd-wrap{max-width:1440px;margin:0 auto;padding:24px 16px 48px;display:flex;flex-direction:column;gap:20px}
@media (min-width:640px){.sd-wrap{padding:24px 24px 48px}}
@media (min-width:1024px){.sd-wrap{padding:24px 32px 48px}}
.sd-card{background:var(--surface);border:1px solid rgba(226,232,240,.8);border-radius:20px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);padding:22px}
.sd-eyebrow{font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.sd-title{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:26px;font-weight:800;letter-spacing:-.02em;color:var(--text);margin:4px 0 4px}
.sd-sub{font-size:13px;color:var(--text-dim);margin:0}
.sd-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.sd-icon{width:40px;height:40px;min-width:40px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;border:1px solid #dbeafe}
.sd-h2{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:16px;font-weight:800;color:var(--text);margin:0}
.sd-hsub{font-size:12px;color:var(--text-dim);margin:2px 0 0}
.sd-row{display:grid;gap:14px;grid-template-columns:1fr}
@media (min-width:640px){.sd-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1024px){.sd-row{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (min-width:1280px){.sd-row.sd-row-5{grid-template-columns:repeat(5,minmax(0,1fr))}}
.sd-row+.sd-row{margin-top:16px}
.sd-label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;white-space:nowrap}
.sd-input{width:100%;height:44px;padding:0 14px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-size:14px;color:#0f172a;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
.sd-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.sd-input::placeholder{color:#94a3b8}
.sd-results{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:1024px){.sd-results{grid-template-columns:repeat(2,minmax(0,1fr))}}
.sd-tile{border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;background:#f8fafc}
.sd-tile-l{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
.sd-tile-v{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:20px;font-weight:800;color:#0f172a;margin-top:4px;font-variant-numeric:tabular-nums}
.sd-line{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #eef2f7;font-size:13px}
.sd-line span:first-child{color:#64748b}
.sd-line strong{font-variant-numeric:tabular-nums;color:#0f172a}
.sd-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em}
.sd-badge-ok{background:#ecfdf5;color:#059669;border:1px solid #a7f3d0}
.sd-badge-warn{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
.sd-best{box-shadow:0 0 0 2px #10b981,0 10px 25px -5px rgba(16,185,129,.2)}
.sd-btn-pdf{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:12px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 16px -4px rgba(37,99,235,.35)}
.sd-btn-pdf:disabled{opacity:.5;cursor:not-allowed}
.sd-empty{text-align:center;color:#64748b;font-size:14px;padding:28px 12px}
`;

function Campo({ rotulo, value, onChange, inputMode = "decimal", placeholder }) {
  return (
    <div>
      <label className="sd-label">{rotulo}</label>
      <input className="sd-input" inputMode={inputMode} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function Seletor({ rotulo, value, onChange, opcoes }) {
  return (
    <div>
      <label className="sd-label">{rotulo}</label>
      <select className="sd-input" value={value} onChange={onChange} style={{ cursor: "pointer" }}>
        {opcoes.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

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
  const gerarPdf = () => gerarPdfSimulacao({
    entradas: [
      ["Valor FIPE", BRL(num("fipe"))],
      ["Valor de compra", BRL(num("compra"))],
      ["Valor pretendido", BRL(num("pretendido"))],
      ["Custos adicionais", BRL(num("custos"))],
      ["Tipo de capital", v.tipoCapital],
      ...(v.tipoCapital === "Financiamento" ? [
        ["Valor financiado", BRL(num("valorFinanciado"))],
        ["Entrada", BRL(num("entrada"))],
        ["Taxa mensal", PCT(num("taxa"))],
        ["Parcelas", `${num("meses")}x (${v.sistema})`],
      ] : []),
    ],
    r, BRL, PCT,
  });
  const financiando = v.tipoCapital === "Financiamento";

  const bloco = (titulo, Icone, b, valorVenda) => {
    const margemAv = valorVenda > 0 ? (b.avista.resultadoLiquido / valorVenda) * 100 : null;
    const margemFin = valorVenda > 0 ? (b.comFin.resultadoLiquido / valorVenda) * 100 : null;
    const melhorAv = b.melhor === "avista";
    return (
      <section className={`sd-card ${r.financiado && melhorAv ? "sd-best" : ""}`}>
        <div className="sd-head">
          <div className="sd-icon"><Icone size={18} /></div>
          <div>
            <h2 className="sd-h2">{titulo}</h2>
            <p className="sd-hsub">Valor de venda considerado: {BRL(valorVenda)}</p>
          </div>
        </div>

        <div className="sd-results" style={{ gridTemplateColumns: "1fr", marginBottom: 14 }}>
          <div className="sd-tile">
            <div className="sd-tile-l">À vista · resultado líquido</div>
            <div className="sd-tile-v" style={{ color: b.avista.resultadoLiquido < 0 ? "#b91c1c" : "#059669" }}>{BRL(b.avista.resultadoLiquido)}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Margem {PCT(margemAv)}</div>
          </div>
          {r.financiado && (
            <div className="sd-tile">
              <div className="sd-tile-l">Financiado · resultado líquido</div>
              <div className="sd-tile-v" style={{ color: b.comFin.resultadoLiquido < 0 ? "#b91c1c" : "#059669" }}>{BRL(b.comFin.resultadoLiquido)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Margem {PCT(margemFin)}</div>
            </div>
          )}
        </div>

        <div className="sd-line"><span>Investimento à vista</span><strong>{BRL(b.avista.investimentoTotal)}</strong></div>
        {r.financiado && <>
          <div className="sd-line"><span>Juros do financiamento ({r.financiado.sistema}, {r.financiado.n}x)</span><strong style={{ color: "#b45309" }}>{BRL(b.comFin.custosTotais - b.avista.totalCustosAdicionais)}</strong></div>
          <div className="sd-line"><span>Investimento financiado</span><strong>{BRL(b.comFin.investimentoTotal)}</strong></div>
        </>}

        <div style={{ marginTop: 14 }}>
          {r.financiado ? (
            <span className={`sd-badge ${b.diferenca >= 0 ? "sd-badge-ok" : "sd-badge-warn"}`}>
              <Scale size={13} /> Melhor: {melhorAv ? "à vista" : "financiado"} · diferença {BRL(Math.abs(b.diferenca))}
            </span>
          ) : (
            <span className="sd-badge sd-badge-ok"><Banknote size={13} /> Compra à vista</span>
          )}
        </div>
      </section>
    );
  };

  return (
    <PageTransition>
      <div className="page-bg min-h-screen">
        <style>{CSS}</style>
        <Header subtitle="Simulador: comprar à vista x financiar" />
        <main className="sd-wrap">
          <BackLink />

          <header>
            <div className="sd-eyebrow">Análise de decisão</div>
            <h1 className="sd-title">Simulador de decisão</h1>
            <p className="sd-sub">Mesma lógica do Calcula-Car. Nada é salvo no estoque.</p>
          </header>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="sd-btn-pdf" disabled={!temValores} onClick={() => gerarPdf()}>
              <FileDown size={16} /> Gerar PDF para o cliente
            </button>
          </div>

          <section className="sd-card">
            <div className="sd-head">
              <div className="sd-icon"><Calculator size={18} /></div>
              <div>
                <h2 className="sd-h2">Dados da operação</h2>
                <p className="sd-hsub">Informe os valores do veículo e o tipo de capital</p>
              </div>
            </div>
            <div className="sd-row sd-row-5">
              <Campo rotulo="Valor FIPE (R$)" value={v.fipe} onChange={set("fipe")} />
              <Campo rotulo="Valor de compra (R$)" value={v.compra} onChange={set("compra")} />
              <Campo rotulo="Valor pretendido (R$)" value={v.pretendido} onChange={set("pretendido")} />
              <Campo rotulo="Custos adicionais (R$)" value={v.custos} onChange={set("custos")} />
              <Seletor rotulo="Tipo de capital" value={v.tipoCapital} onChange={set("tipoCapital")} opcoes={["Próprio", "Financiamento"]} />
            </div>

            {financiando && (
              <>
                <div className="sd-head" style={{ margin: "22px 0 16px" }}>
                  <div className="sd-icon"><Landmark size={18} /></div>
                  <div>
                    <h2 className="sd-h2">Financiamento</h2>
                    <p className="sd-hsub">Valor financiado menos a entrada, com juros pela tabela escolhida</p>
                  </div>
                </div>
                <div className="sd-row sd-row-5">
                  <Campo rotulo="Valor financiado (R$)" value={v.valorFinanciado} onChange={set("valorFinanciado")} />
                  <Campo rotulo="Entrada (R$)" value={v.entrada} onChange={set("entrada")} />
                  <Campo rotulo="Taxa mensal (%)" value={v.taxa} onChange={set("taxa")} />
                  <Campo rotulo="Parcelas (meses)" value={v.meses} onChange={set("meses")} inputMode="numeric" />
                  <Seletor rotulo="Sistema" value={v.sistema} onChange={set("sistema")} opcoes={["Price", "SAC"]} />
                </div>
              </>
            )}
          </section>

          {temValores ? (
            <div className="sd-results">
              {bloco("Venda pela FIPE", Car, r.pelaFipe, num("fipe"))}
              {bloco("Venda pelo valor pretendido", Target, r.pelaPretendido, num("pretendido"))}
            </div>
          ) : (
            <section className="sd-card"><p className="sd-empty">Informe o valor de compra e a FIPE ou o valor pretendido para ver a simulação.</p></section>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
