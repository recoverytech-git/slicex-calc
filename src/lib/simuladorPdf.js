// Relatorio PDF da simulacao de decisao, para entregar ao cliente. Gerado no navegador.
export async function gerarPdfSimulacao({ entradas, r, BRL, PCT }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const linhaTxt = (rot, val, y, cor = [15, 23, 42]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(rot, 14, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...cor);
    doc.text(String(val), W - 14, y, { align: "right" });
  };
  const titulo = (t, y) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text(t, 14, y);
    doc.setDrawColor(219, 234, 254); doc.line(14, y + 2, W - 14, y + 2);
  };

  // cabecalho
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Calcula.car", 14, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Simulação de decisão: comprar à vista x financiar", 14, 22);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, W - 14, 22, { align: "right" });

  let y = 44;
  titulo("Dados da operação", y); y += 8;
  entradas.forEach(([rot, val]) => { linhaTxt(rot, val, y); y += 7; });

  const bloco = (nome, b, valorVenda) => {
    y += 6; titulo(`${nome} (venda de ${BRL(valorVenda)})`, y); y += 8;
    const mAv = valorVenda > 0 ? (b.avista.resultadoLiquido / valorVenda) * 100 : null;
    linhaTxt("À vista: investimento total", BRL(b.avista.investimentoTotal), y); y += 7;
    linhaTxt("À vista: resultado líquido", BRL(b.avista.resultadoLiquido), y, b.avista.resultadoLiquido < 0 ? [185, 28, 28] : [5, 150, 105]); y += 7;
    linhaTxt("À vista: margem", PCT(mAv), y); y += 7;
    if (r.financiado) {
      const mFin = valorVenda > 0 ? (b.comFin.resultadoLiquido / valorVenda) * 100 : null;
      linhaTxt("Financiado: juros do financiamento", BRL(b.comFin.custosTotais - b.avista.totalCustosAdicionais), y, [180, 83, 9]); y += 7;
      linhaTxt("Financiado: investimento total", BRL(b.comFin.investimentoTotal), y); y += 7;
      linhaTxt("Financiado: resultado líquido", BRL(b.comFin.resultadoLiquido), y, b.comFin.resultadoLiquido < 0 ? [185, 28, 28] : [5, 150, 105]); y += 7;
      linhaTxt("Financiado: margem", PCT(mFin), y); y += 7;
    }
    const melhor = r.financiado ? (b.melhor === "avista" ? "à vista" : "financiado") : "à vista (sem financiamento)";
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(37, 99, 235);
    doc.text(`Melhor opção: ${melhor}${r.financiado ? ` (diferença de ${BRL(Math.abs(b.diferenca))})` : ""}`, 14, y + 2);
    y += 8;
  };
  bloco("Venda pela FIPE", r.pelaFipe, Number(entradas.find((e) => e[0] === "Valor FIPE")?.[1]?.replace(/[^\d,-]/g, "").replace(",", ".")) || 0);
  bloco("Venda pelo valor pretendido", r.pelaPretendido, Number(entradas.find((e) => e[0] === "Valor pretendido")?.[1]?.replace(/[^\d,-]/g, "").replace(",", ".")) || 0);

  y = Math.max(y + 10, 260);
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text("Simulação estimativa, com base nos valores informados. Não constitui oferta de crédito.", 14, y);
  doc.text("Valores sujeitos à análise e às condições vigentes no momento da compra.", 14, y + 4);

  doc.save(`simulacao_${new Date().toISOString().slice(0, 10)}.pdf`);
}
