import { novoDocumento, cabecalho, secao, tabela, rodape, COR } from "./relatorioPdf";

/** PDF da simulação de decisão para entregar ao cliente (mesma base visual dos demais relatórios). */
export async function gerarPdfSimulacao({ entradas, r, BRL, PCT, logo = null }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = novoDocumento(jsPDF, "portrait");
  const valorDe = (rot) => Number(String(entradas.find((e) => e[0] === rot)?.[1] ?? "").replace(/[^\d,-]/g, "").replace(",", ".")) || 0;

  let y = cabecalho(doc, { titulo: "Simulação de decisão", subtitulo: "Comprar à vista x financiar", logo });
  y = secao(doc, y + 2, "Dados da operação");
  y = tabela(doc, autoTable, {
    y, head: ["Item", "Valor"], body: entradas,
    colunas: { 0: { cellWidth: 110, textColor: COR.cinza }, 1: { halign: "right", fontStyle: "bold" } },
  });

  const bloco = (titulo, b, valorVenda) => {
    const mAv = valorVenda > 0 ? (b.avista.resultadoLiquido / valorVenda) * 100 : null;
    const linhas = [
      ["Investimento à vista", BRL(b.avista.investimentoTotal)],
      ["Resultado líquido à vista", BRL(b.avista.resultadoLiquido)],
      ["Margem à vista", PCT(mAv)],
    ];
    if (r.financiado) {
      const mFin = valorVenda > 0 ? (b.comFin.resultadoLiquido / valorVenda) * 100 : null;
      linhas.push(
        ["Juros do financiamento", BRL(b.comFin.custosTotais - b.avista.totalCustosAdicionais)],
        ["Investimento financiado", BRL(b.comFin.investimentoTotal)],
        ["Resultado líquido financiado", BRL(b.comFin.resultadoLiquido)],
        ["Margem financiada", PCT(mFin)],
      );
    }
    let yy = secao(doc, y + 4, `${titulo} · venda de ${BRL(valorVenda)}`);
    yy = tabela(doc, autoTable, { y: yy, head: ["Indicador", "Valor"], body: linhas, colunas: { 1: { halign: "right", fontStyle: "bold" } } });
    const melhor = r.financiado ? (b.melhor === "avista" ? "à vista" : "financiado") : "à vista (sem financiamento)";
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...COR.azul);
    doc.text(`Melhor opção: ${melhor}${r.financiado ? ` · diferença de ${BRL(Math.abs(b.diferenca))}` : ""}`, 12, yy);
    return yy + 6;
  };
  y = bloco("Venda pela FIPE", r.pelaFipe, valorDe("Valor FIPE"));
  bloco("Venda pelo valor pretendido", r.pelaPretendido, valorDe("Valor pretendido"));

  rodape(doc, "Calcula.car · Simulação estimativa, não constitui oferta de crédito");
  doc.save(`simulacao_${new Date().toISOString().slice(0, 10)}.pdf`);
}
