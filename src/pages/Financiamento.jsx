// sem-rascunho: formulario e resultados ficam no documento do design (iframe); o calculo usa calcPrice e calcSAC
import { useCallback, useEffect, useRef, useState } from "react";
import PageTransition from "../components/PageTransition";
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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Simulação de financiamento – Sistema ${sistemaNome}`, 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Valor financiado: ${fmt(pv)} · Taxa: ${d.taxa}% a.m. (${taxaAnual.toFixed(2)}% a.a.) · Prazo: ${d.meses} meses`, 14, 23);
    doc.text(`Total pago: ${fmt(totalPago)} · Total de juros: ${fmt(totalJuros)}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [["Mês", "Parcela", "Juros", "Amortização", "Saldo devedor"]],
      body: rows.map((r) => [r.mes, fmt(r.parcela), fmt(r.juros), fmt(r.amortizacao), fmt(r.saldo)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
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
      <div style={{ position: "relative", height: "100vh" }}>
        <iframe
          ref={frame}
          src="/calculadora-financiamento.html"
          title="Simulador Avançado de Financiamento"
          onLoad={enviarMarca}
          style={{ display: "block", width: "100%", height: "100%", border: 0 }}
        />
        {slot && (
          <div style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.w, height: slot.h, zIndex: 20 }}>
            <Sino />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
