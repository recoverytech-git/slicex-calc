import logoPadrao from "../assets/logo.png";
import { novoDocumento, cabecalho, cartoes, secao, tabela, rodape, carregarLogo } from "../lib/relatorioPdf";
// sem-rascunho: formulario e resultados ficam no documento do design (iframe); o calculo usa calcPrice e calcSAC
import { useCallback, useEffect, useRef, useState } from "react";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Sino from "../components/Sino";
import { useMarca } from "../lib/marca";
import { calcPrice, calcSAC, buildXLSX, downloadXLSX, MIME } from "../lib/financiamento";

const soma = (rs, k) => rs.reduce((s, r) => s + r[k], 0);

function baixar(url, nome) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Exportacao pelo sistema principal (CSV, Excel e PDF), usando calcPrice e calcSAC. */
async function exportar(d) {
  const pv = d.valor - d.entrada;
  if (!(pv > 0 && d.taxa > 0 && d.meses > 0 && d.meses <= 360)) return;
  const rowsP = calcPrice(pv, d.taxa, d.meses);
  const rowsS = calcSAC(pv, d.taxa, d.meses);
  const rows = d.sistema === "SAC" ? rowsS : rowsP;
  const totalPago = soma(rows, "parcela");
  const totalJuros = soma(rows, "juros");
  const sistemaNome = d.sistema === "SAC" ? "SAC" : "Price";
  const base = `financiamento_${sistemaNome.toLowerCase()}_${d.meses}x`;
  const taxaAnual = (Math.pow(1 + d.taxa / 100, 12) - 1) * 100;

  if (d.formato === "xlsx") {
    const blob = new Blob([buildXLSX(rows, pv, d.taxa, d.meses, d.entrada, totalPago, totalJuros, sistemaNome)], { type: MIME });
    await downloadXLSX(blob, `${base}.xlsx`);
    return;
  }
  if (d.formato === "csv") {
    const cab = ["Mês", "Parcela (R$)", "Juros (R$)", "Amortização (R$)", "Saldo devedor (R$)"];
    const num = (v) => v.toFixed(2).replace(".", ",");
    const corpo = rows.map((r) => [r.mes, num(r.parcela), num(r.juros), num(r.amortizacao), num(r.saldo)].join(";"));
    const csv = "\uFEFF" + [cab.join(";"), ...corpo].join("\r\n");
    baixar(URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), `${base}.csv`);
    return;
  }
  if (d.formato === "pdf") {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const logo = await carregarLogo(logoPadrao);
    const doc = novoDocumento(jsPDF, "portrait");
    const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const cab = () => cabecalho(doc, { titulo: "Simulação de financiamento", subtitulo: `Sistema ${sistemaNome} · ${d.meses} meses`, logo });
    let y = cab();
    y = cartoes(doc, y, [
      { rotulo: "Valor financiado", valor: fmt(pv), sub: "após a entrada" },
      { rotulo: "Taxa mensal", valor: `${d.taxa}%`, sub: `${taxaAnual.toFixed(2)}% ao ano` },
      { rotulo: "Total pago", valor: fmt(totalPago), sub: `${d.meses} parcelas` },
      { rotulo: "Total de juros", valor: fmt(totalJuros), sub: "custo do financiamento", cor: [180, 83, 9] },
    ]);
    y = secao(doc, y + 2, "Evolução mensal");
    tabela(doc, autoTable, {
      y,
      head: ["Mês", "Parcela", "Juros", "Amortização", "Saldo devedor"],
      body: rows.map((r) => [r.mes, fmt(r.parcela), fmt(r.juros), fmt(r.amortizacao), fmt(r.saldo)]),
      foot: ["Total", fmt(totalPago), fmt(totalJuros), fmt(pv), "—"],
      fonte: 7.5,
      colunas: { 0: { halign: "center" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    rodape(doc, "Calcula.car · Simulação estimada, não constitui oferta de crédito");
    doc.save(`${base}.pdf`);
  }
}

export default function Financiamento() {
  const frame = useRef(null);
  const marca = useMarca();
  const marcaRef = useRef(marca);
  marcaRef.current = marca;
  const [slot, setSlot] = useState(null);

  const enviarMarca = useCallback(() => {
    const m = marcaRef.current;
    frame.current?.contentWindow?.postMessage({
      type: "marca",
      logoEscuro: m.logo_header || m.logo_landing || null,
      logoClaro: m.logo_claro || m.logo_landing_claro || null,
    }, window.location.origin);
  }, []);

  useEffect(() => {
    const ouvir = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === "bell-rect") setSlot(d.rect);
      if (d.type === "exportar") exportar(d).catch(() => alert("Não foi possível gerar o arquivo."));
      if (d.type === "pronto") enviarMarca();
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [enviarMarca]);

  useEffect(() => { enviarMarca(); }, [marca, enviarMarca]);

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header subtitle="Simulador Avançado de Financiamento" />

        <iframe
          ref={frame}
          src="/calculadora-financiamento.html"
          title="Simulador Avançado de Financiamento"
          onLoad={enviarMarca}
          style={{ display: "block", width: "100%", flex: 1, minHeight: 0, border: 0 }}
        />
      </div>
    </PageTransition>
  );
}
