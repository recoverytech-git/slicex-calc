/**
 * Calcula-Car — lógica de negócio da análise de compra e venda de veículos.
 *
 * Reaproveita a matemática de financiamento já existente em lib/financiamento.js
 * (calcPrice/calcSAC) — este arquivo cobre apenas o que é específico do domínio
 * veicular: diferença FIPE x compra, margem de referência, consolidação de
 * custos e resultado líquido da operação.
 */

export const MARGEM_REFERENCIA_PCT = 15;

/**
 * Diferença entre o valor FIPE e o valor de compra.
 *
 * diferencaPercentual é calculada em relação ao FIPE (o "desconto" obtido
 * na compra). Valores abaixo da margem de referência (15%) disparam um
 * alerta não-bloqueante — o usuário sempre pode prosseguir com a análise.
 */
export function calcDiferenca(fipe, compra) {
  const diferencaReais = fipe - compra;
  const diferencaPercentual = fipe !== 0 ? (diferencaReais / fipe) * 100 : null;
  const abaixoDaMargem = diferencaPercentual !== null && diferencaPercentual < MARGEM_REFERENCIA_PCT;
  return { diferencaReais, diferencaPercentual, abaixoDaMargem };
}

/**
 * Consolida custos adicionais, custo financeiro, investimento total e
 * resultado líquido estimado da operação.
 *
 * valorVenda é o valor considerado para a revenda na simulação — por padrão
 * o próprio valor FIPE, mas o usuário pode ajustar (ex: para simular um
 * cenário de venda mais conservador ou mais otimista).
 */
export function calcResultado({ fipe, compra, custos, custoFinanceiro, valorVenda }) {
  const totalCustosAdicionais = custos.reduce((s, c) => s + (c.valor || 0), 0);
  const custosTotais = totalCustosAdicionais + custoFinanceiro;
  const investimentoTotal = compra + totalCustosAdicionais + custoFinanceiro;
  const margemPotencial = fipe - compra;
  const resultadoLiquido = valorVenda - investimentoTotal;

  return {
    totalCustosAdicionais,
    custosTotais,
    investimentoTotal,
    margemPotencial,
    resultadoLiquido,
  };
}

/**
 * Monta o workbook de exportação da análise. Reaproveita a MESMA função de
 * download (downloadXLSX, em lib/financiamento.js) e, quando há
 * financiamento, o MESMO formato de linhas gerado por calcPrice/calcSAC —
 * apenas o layout das planilhas é específico deste módulo.
 */
export function buildCalculaCarXLSX(XLSX, data) {
  const {
    modelo, placa, fipe, compra, valorVenda,
    diferencaReais, diferencaPercentual, abaixoDaMargem,
    tipoCapital, financiamento, // { rows, pv, taxa, n, sistema, totalPago, totalJuros } | null
    custos, totalCustosAdicionais, custoFinanceiro,
    custosTotais, investimentoTotal, margemPotencial, resultadoLiquido,
  } = data;

  const fmtN = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const wb = XLSX.utils.book_new();

  const resumo = [
    ["ANÁLISE DE COMPRA E VENDA DE VEÍCULO — CALCULA-CAR"],
    ["Gerado em:", new Date().toLocaleString("pt-BR")],
    [],
    ["DADOS DO VEÍCULO"],
    ["Modelo", modelo || "—"],
    ["Placa", placa || "—"],
    ["Valor FIPE (R$)", fmtN(fipe)],
    ["Valor de compra (R$)", fmtN(compra)],
    [],
    ["ANÁLISE DE MARGEM"],
    ["Diferença (R$)", fmtN(diferencaReais)],
    ["Diferença (%)", diferencaPercentual !== null ? `${diferencaPercentual.toFixed(2)}%` : "—"],
    ["Margem de referência", `${abaixoDaMargem ? "Abaixo" : "Dentro/acima"} da margem de referência de 15%`],
    [],
    ["ORIGEM DO CAPITAL"],
    ["Tipo", tipoCapital],
    ...(financiamento
      ? [
          ["Valor financiado (R$)", fmtN(financiamento.pv)],
          ["Taxa de juros mensal", `${financiamento.taxa}%`],
          ["Prazo (meses)", financiamento.n],
          ["Sistema de amortização", financiamento.sistema],
          ["Total de juros (R$)", fmtN(financiamento.totalJuros)],
          ["Total pago (R$)", fmtN(financiamento.totalPago)],
        ]
      : []),
    [],
    ["CUSTOS"],
    ["Total de custos adicionais (R$)", fmtN(totalCustosAdicionais)],
    ["Custo financeiro (R$)", fmtN(custoFinanceiro)],
    ["Custos totais (R$)", fmtN(custosTotais)],
    [],
    ["RESULTADO FINANCEIRO"],
    ["Investimento total (R$)", fmtN(investimentoTotal)],
    ["Margem potencial (R$)", fmtN(margemPotencial)],
    ["Valor de venda considerado (R$)", fmtN(valorVenda)],
    ["Resultado líquido estimado (R$)", fmtN(resultadoLiquido)],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumo);
  wsR["!cols"] = [{ wch: 34 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsR, "Resumo da Operação");

  const custosSheet = [
    ["Descrição", "Valor (R$)"],
    ...(custos.length ? custos.map((c) => [c.descricao || "(sem descrição)", parseFloat((c.valor || 0).toFixed(2))]) : [["Nenhum custo adicional informado", 0]]),
    [],
    ["TOTAL", parseFloat(totalCustosAdicionais.toFixed(2))],
  ];
  const wsC = XLSX.utils.aoa_to_sheet(custosSheet);
  wsC["!cols"] = [{ wch: 34 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsC, "Custos Adicionais");

  if (financiamento) {
    const wsF = XLSX.utils.aoa_to_sheet([
      ["Mês", "Parcela (R$)", "Juros (R$)", "Amortização (R$)", "Saldo Devedor (R$)"],
      ...financiamento.rows.map((r) => [
        r.mes,
        parseFloat(r.parcela.toFixed(2)),
        parseFloat(r.juros.toFixed(2)),
        parseFloat(r.amortizacao.toFixed(2)),
        parseFloat(r.saldo.toFixed(2)),
      ]),
      [],
      ["TOTAL", parseFloat(financiamento.totalPago.toFixed(2)), parseFloat(financiamento.totalJuros.toFixed(2)), parseFloat(financiamento.pv.toFixed(2)), "—"],
    ]);
    wsF["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsF, "Evolução do Financiamento");
  }

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

/**
 * Monta o relatório em PDF da análise. jsPDF e jspdf-autotable são
 * carregados dinamicamente apenas na página do Calcula-Car (import()
 * dentro do handler), então nenhuma outra rota paga o custo dessa
 * dependência — mesmo princípio de code-splitting já usado no App.jsx.
 *
 * Identidade visual em texto (não raster) por robustez: evita qualquer
 * dependência de carregamento assíncrono de imagem dentro do PDF.
 */
export function buildCalculaCarPDF({ jsPDF, autoTable, data }) {
  const {
    modelo, placa, fipe, compra, valorVenda,
    diferencaReais, diferencaPercentual, abaixoDaMargem,
    tipoCapital, financiamento,
    custos, totalCustosAdicionais, custoFinanceiro,
    custosTotais, investimentoTotal, margemPotencial, resultadoLiquido,
  } = data;

  const fmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PAGE_W = 210;

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, PAGE_W, 26, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 26, PAGE_W, 0.6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SliceX.calc  ·  Calcula-Car", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Análise de Compra e Venda Veicular · Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 20);

  let y = 34;
  const sectionTitle = (text) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(text, 14, y);
    doc.setDrawColor(210, 210, 210);
    doc.line(14, y + 2, PAGE_W - 14, y + 2);
    y += 8;
  };

  sectionTitle("1. Dados do Veículo");
  autoTable(doc, {
    startY: y, theme: "plain", margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ["Modelo", modelo || "—", "Placa", placa || "—"],
      ["Valor FIPE", fmt(fipe), "Valor de compra", fmt(compra)],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [90, 90, 90] }, 2: { fontStyle: "bold", textColor: [90, 90, 90] } },
  });
  y = doc.lastAutoTable.finalY + 8;

  sectionTitle("2. Análise FIPE x Compra");
  autoTable(doc, {
    startY: y, theme: "plain", margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ["Diferença (R$)", fmt(diferencaReais), "Diferença (%)", diferencaPercentual !== null ? `${diferencaPercentual.toFixed(2)}%` : "—"],
      ["Margem de referência", "15%", "Situação", abaixoDaMargem ? "Abaixo da margem de referência" : "Dentro/acima da margem de referência"],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [90, 90, 90] }, 2: { fontStyle: "bold", textColor: [90, 90, 90] } },
  });
  y = doc.lastAutoTable.finalY + 4;
  if (abaixoDaMargem) {
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y, PAGE_W - 28, 9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text("Atenção: este veículo está abaixo da margem de referência de 15%. Isso não impede a análise —", 17, y + 4);
    doc.text("apenas indica que a margem obtida na compra é menor que o valor de referência sugerido.", 17, y + 7.5);
    y += 13;
  } else {
    y += 4;
  }

  sectionTitle("3. Origem do Capital");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.text(`Capital: ${tipoCapital}`, 14, y);
  y += 8;

  if (financiamento) {
    sectionTitle("Financiamento");
    autoTable(doc, {
      startY: y, theme: "plain", margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 1.5 },
      body: [
        ["Valor financiado", fmt(financiamento.pv), "Taxa mensal", `${financiamento.taxa}%`],
        ["Prazo", `${financiamento.n} meses`, "Sistema", financiamento.sistema],
        ["Total de juros", fmt(financiamento.totalJuros), "Total pago", fmt(financiamento.totalPago)],
      ],
      columnStyles: { 0: { fontStyle: "bold", textColor: [90, 90, 90] }, 2: { fontStyle: "bold", textColor: [90, 90, 90] } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  sectionTitle("Custos Adicionais");
  autoTable(doc, {
    startY: y, margin: { left: 14, right: 14 }, styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 20, 20], textColor: 255, fontStyle: "bold" },
    head: [["Descrição", "Valor"]],
    body: custos.length ? custos.map((c) => [c.descricao || "(sem descrição)", fmt(c.valor || 0)]) : [["Nenhum custo adicional informado", fmt(0)]],
    foot: [["TOTAL", fmt(totalCustosAdicionais)]],
    footStyles: { fillColor: [235, 235, 235], textColor: [20, 20, 20], fontStyle: "bold" },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (financiamento) {
    if (y > 250) { doc.addPage(); y = 16; }
    sectionTitle("Evolução Completa do Financiamento");
    autoTable(doc, {
      startY: y, margin: { left: 14, right: 14 }, styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [20, 20, 20], textColor: 255, fontStyle: "bold", halign: "right" },
      head: [["Mês", "Parcela", "Juros", "Amortização", "Saldo Devedor"]],
      body: financiamento.rows.map((r) => [r.mes, fmt(r.parcela), fmt(r.juros), fmt(r.amortizacao), fmt(r.saldo)]),
      foot: [["TOTAL", fmt(financiamento.totalPago), fmt(financiamento.totalJuros), fmt(financiamento.pv), "—"]],
      footStyles: { fillColor: [20, 20, 20], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "center" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (y > 240) { doc.addPage(); y = 16; }
  sectionTitle("Resultado da Operação");
  autoTable(doc, {
    startY: y, theme: "plain", margin: { left: 14, right: 14 },
    styles: { fontSize: 10, cellPadding: 2 },
    body: [
      ["Investimento total", fmt(investimentoTotal)],
      ["Margem potencial (FIPE - Compra)", fmt(margemPotencial)],
      ["Custos totais (adicionais + financeiro)", fmt(custosTotais)],
      ["Valor de venda considerado", fmt(valorVenda)],
      ["Resultado líquido estimado", fmt(resultadoLiquido)],
    ],
    columnStyles: { 0: { fontStyle: "bold", textColor: [90, 90, 90] }, 1: { halign: "right", fontStyle: "bold" } },
    didParseCell: (d) => {
      if (d.row.index === 4) { d.cell.styles.fontSize = 12; d.cell.styles.textColor = [0, 0, 0]; }
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 288, PAGE_W - 14, 288);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Calcula-Car · Simulação estimada, não substitui avaliação profissional · Página ${p}/${pageCount}`, 14, 292);
  }

  return doc;
}
