import { COR, cabecalho, cartoes, secao, tabela, rodape, novoDocumento } from "./relatorioPdf";
/**
 * Calcula-Car - lógica de negócio da análise de compra e venda de veículos.
 *
 * Reaproveita a matemática de financiamento já existente em lib/financiamento.js
 * (calcPrice/calcSAC) - este arquivo cobre apenas o que é específico do domínio
 * veicular: diferença FIPE x compra, margem de referência, consolidação de
 * custos e resultado líquido da operação.
 */

export const MARGEM_REFERENCIA_PCT = 15;

/**
 * Diferença entre o valor FIPE e o valor de compra.
 *
 * diferencaPercentual é calculada em relação ao FIPE (o "desconto" obtido
 * na compra). Valores abaixo da margem de referência (15%) disparam um
 * alerta não-bloqueante - o usuário sempre pode prosseguir com a análise.
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
 * valorVenda é o valor considerado para a revenda na simulação - por padrão
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
 * financiamento, o MESMO formato de linhas gerado por calcPrice/calcSAC -
 * apenas o layout das planilhas é específico deste módulo.
 */
export function buildCalculaCarXLSX(XLSX, data) {
  const {
    modelo, placa, fipe, compra, valorVenda,
    diferencaReais, diferencaPercentual, abaixoDaMargem,
    numeroMotor, categoria, potenciaMotor, portas, lugares,
    tipoCapital, financiamento, // { rows, pv, taxa, n, sistema, totalPago, totalJuros } | null
    custos, totalCustosAdicionais, custoFinanceiro,
    custosTotais, investimentoTotal, margemPotencial, resultadoLiquido,
  } = data;

  const fmtN = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const wb = XLSX.utils.book_new();

  const resumo = [
    ["ANÁLISE DE COMPRA E VENDA DE VEÍCULO - CALCULA-CAR"],
    ["Gerado em:", new Date().toLocaleString("pt-BR")],
    [],
    ["DADOS DO VEÍCULO"],
    ["Modelo", modelo || "-"],
    ["Placa", placa || "-"],
    ["Número do motor", numeroMotor || "-"], ["Potência do motor", potenciaMotor || "-"], ["Portas", portas || "-"], ["Lugares", lugares || "-"], ["Categoria / Carroceria", categoria || "-"],
    ["Data de aquisição", data.dataAquisicao || "-"],
    ["Valor FIPE (R$)", fmtN(fipe)],
    ["Valor de compra (R$)", fmtN(compra)],
    [],
    ["ANÁLISE DE MARGEM"],
    ["Diferença (R$)", fmtN(diferencaReais)],
    ["Diferença (%)", diferencaPercentual !== null ? `${diferencaPercentual.toFixed(2)}%` : "-"],
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

  if (financiamento && financeiro) {
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
      ["TOTAL", parseFloat(financiamento.totalPago.toFixed(2)), parseFloat(financiamento.totalJuros.toFixed(2)), parseFloat(financiamento.pv.toFixed(2)), "-"],
    ]);
    wsF["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsF, "Evolução do Financiamento");
  }

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

/**
 * Relatório em PDF da análise Calcula-Car (mesma base visual dos demais relatórios).
 * jsPDF e jspdf-autotable chegam já carregados pelo chamador (code-splitting).
 */
export function buildCalculaCarPDF({ jsPDF, autoTable, data, logo = null, financeiro = true, emitido }) {
  const { numeroMotor, categoria, potenciaMotor, portas, lugares } = data;
  const {
    modelo, placa, fipe, compra, valorVenda,
    diferencaReais, diferencaPercentual, abaixoDaMargem,
    tipoCapital, financiamento,
    custos, totalCustosAdicionais, custoFinanceiro,
    custosTotais, investimentoTotal, margemPotencial, resultadoLiquido,
  } = data;

  const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const doc = novoDocumento(jsPDF, "portrait");
  const cab = () => cabecalho(doc, { titulo: modelo || "Calcula-Car", subtitulo: `Análise de compra e venda veicular${placa ? " · " + placa : ""}`, logo, meta: emitido });
  let y = cab();

  y = cartoes(doc, y, !financeiro ? [
    { rotulo: "Valor FIPE", valor: fmt(fipe), sub: "referência de mercado" },
    { rotulo: "Valor de venda", valor: fmt(valorVenda), sub: "pretendido" },
  ] : [
    { rotulo: "Investimento total", valor: fmt(investimentoTotal), sub: "compra + custos" },
    { rotulo: "Margem potencial", valor: fmt(margemPotencial), sub: "FIPE - compra" },
    { rotulo: "Custos totais", valor: fmt(custosTotais), sub: "adicionais + financeiro", cor: [180, 83, 9] },
    { rotulo: "Resultado líquido", valor: fmt(resultadoLiquido), sub: "estimado", cor: Number(resultadoLiquido) < 0 ? [185, 28, 28] : [5, 150, 105] },
  ]);

  const bloco = (titulo, fn) => {
    if (y > 235) { doc.addPage(); y = cab(); }
    y = secao(doc, y + 2, titulo);
    fn();
  };
  const colRotulo = { 0: { fontStyle: "bold", textColor: COR.cinza }, 2: { fontStyle: "bold", textColor: COR.cinza } };

  bloco("1. Dados do veículo", () => {
    y = tabela(doc, autoTable, { y, head: ["Campo", "Informação", "Campo", "Informação"], colunas: colRotulo, body: [
      ["Modelo", modelo || "-", "Placa", placa || "-"],
      ["Motor", numeroMotor || "-", "Potência", potenciaMotor || "-"],
      ["Portas", portas || "-", "Lugares", lugares || "-"],
      ["Categoria", categoria || "-", "Data de aquisição", data.dataAquisicao || "-"],
      ["Valor FIPE", fmt(fipe), financeiro ? "Valor de compra" : "Valor pretendido", financeiro ? fmt(compra) : fmt(valorVenda)],
    ] });
  });

  if (financeiro) bloco("2. Análise FIPE x compra", () => {
    y = tabela(doc, autoTable, { y, head: ["Indicador", "Valor", "Indicador", "Valor"], colunas: colRotulo, body: [
      ["Diferença (R$)", fmt(diferencaReais), "Diferença (%)", diferencaPercentual !== null ? `${diferencaPercentual.toFixed(2)}%` : "-"],
      ["Margem de referência", `${MARGEM_REFERENCIA_PCT}%`, "Situação", abaixoDaMargem ? "Abaixo da referência" : "Dentro ou acima da referência"],
    ] });
    if (abaixoDaMargem) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...COR.cinza);
      doc.text(`Atenção: margem abaixo da referência de ${MARGEM_REFERENCIA_PCT}%. Isso não impede a análise; indica apenas que a margem da compra é menor que o valor sugerido.`, 12, y, { maxWidth: 186 });
      y += 9;
    }
  });

  if (financeiro) bloco("3. Origem do capital", () => {
    y = tabela(doc, autoTable, { y, head: ["Campo", "Informação"], colunas: { 0: { cellWidth: 75, textColor: COR.cinza }, 1: { fontStyle: "bold" } }, body: [["Capital", tipoCapital]] });
  });

  if (financiamento && financeiro) {
    bloco("Financiamento", () => {
      y = tabela(doc, autoTable, { y, head: ["Campo", "Informação", "Campo", "Informação"], colunas: colRotulo, body: [
        ["Valor financiado", fmt(financiamento.pv), "Taxa mensal", `${financiamento.taxa}%`],
        ["Prazo", `${financiamento.n} meses`, "Sistema", financiamento.sistema],
        ["Total de juros", fmt(financiamento.totalJuros), "Total pago", fmt(financiamento.totalPago)],
      ] });
    });
  }

  if (financeiro) bloco("Custos adicionais", () => {
    y = tabela(doc, autoTable, { y, head: ["Descrição", "Valor"], body: custos.length ? custos.map((c) => [c.descricao || "(sem descrição)", fmt(c.valor || 0)]) : [["Nenhum custo adicional informado", fmt(0)]],
      foot: ["Total", fmt(totalCustosAdicionais)], colunas: { 1: { halign: "right", fontStyle: "bold" } } });
  });

  if (financiamento && financeiro) {
    bloco("Evolução completa do financiamento", () => {
      y = tabela(doc, autoTable, { y, head: ["Mês", "Parcela", "Juros", "Amortização", "Saldo devedor"], fonte: 7,
        body: financiamento.rows.map((r) => [r.mes, fmt(r.parcela), fmt(r.juros), fmt(r.amortizacao), fmt(r.saldo)]),
        foot: ["Total", fmt(financiamento.totalPago), fmt(financiamento.totalJuros), fmt(financiamento.pv), "-"],
        colunas: { 0: { halign: "center" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } } });
    });
  }

  if (financeiro) bloco("Resultado da operação", () => {
    y = tabela(doc, autoTable, { y, head: ["Indicador", "Valor"], colunas: { 0: { cellWidth: 110, fontStyle: "bold", textColor: COR.cinza }, 1: { halign: "right", fontStyle: "bold" } }, body: [
      ["Investimento total", fmt(investimentoTotal)],
      ["Margem potencial (FIPE - compra)", fmt(margemPotencial)],
      ["Custos totais (adicionais + financeiro)", fmt(custosTotais)],
      ["Valor de venda considerado", fmt(valorVenda)],
      ["Resultado líquido estimado", fmt(resultadoLiquido)],
    ] });
  });

  rodape(doc, "Calcula-Car · Simulação estimada, não substitui avaliação profissional");
  return doc;
}
