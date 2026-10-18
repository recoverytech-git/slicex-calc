/** PDF completo do veículo: identificação, análise, origem, custos, resultados, checklist e fotos. */
const brl = (v) => (v == null || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const data = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const sim = (v) => (v === true ? "Sim" : v === false ? "Não" : "Não informado");

export function gerarPdfVeiculo({ veiculo: v, financiamento: f, custos = [], vendas = [], checklist, fotos = [], jsPDF, autoTable, ITENS, DOCUMENTACAO }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14;
  let y = 34;

  // Cálculos iguais aos da tela
  const compra = Number(v.preco_compra ?? 0);
  const totalCustos = custos.reduce((s, c) => s + Number(c.valor ?? 0), 0);
  const juros = f ? Number(f.total_juros ?? 0) : 0;
  const investimento = compra + totalCustos + juros;
  const venda = vendas[0];
  const parcial = v.preco_venda_pretendido != null ? Number(v.preco_venda_pretendido) - investimento : null;
  const final = venda ? Number(venda.valor_venda) - Number(venda.despesas_venda ?? 0) - Number(venda.descontos ?? 0) - investimento : null;
  const pct = (r) => (r == null || !investimento ? "—" : `${((r / investimento) * 100).toFixed(2)}%`);

  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${v.modelo || "Veículo"}`, M, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`SliceX.calc · Ficha do veículo · Gerado em ${new Date().toLocaleString("pt-BR")}`, M, 20);

  const titulo = (t) => {
    if (y > 262) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(68, 147, 248);
    doc.text(t, M, y);
    y += 2;
  };
  const tabela = (linhas) => {
    autoTable(doc, {
      startY: y, margin: { left: M, right: M }, theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.6 },
      body: linhas,
      columnStyles: { 0: { textColor: [90, 90, 90], cellWidth: 70 }, 1: { fontStyle: "bold" } },
    });
    y = doc.lastAutoTable.finalY + 7;
  };

  titulo("1. Identificação e características");
  tabela([
    ["Modelo", v.modelo || "—"], ["Marca", v.marca || "—"], ["Placa", v.placa || "—"], ["RENAVAM", v.renavam || "—"],
    ["Chassi", v.chassi || "—"], ["Data de aquisição", data(v.data_aquisicao)], ["Ano de fabricação", v.ano_fabricacao ?? "—"],
    ["Ano do modelo", v.ano_modelo ?? "—"], ["Quilometragem", v.quilometragem != null ? `${Number(v.quilometragem).toLocaleString("pt-BR")} km` : "—"],
    ["Cor", v.cor || "—"], ["Combustível", v.combustivel || "—"], ["Câmbio", v.cambio || "—"],
    ["Valor de venda pretendido", brl(v.preco_venda_pretendido)],
  ]);

  titulo("2. Análise FIPE x Compra");
  tabela([
    ["Valor FIPE", brl(v.valor_fipe)], ["Valor de compra", brl(v.preco_compra)],
    ["Diferença em reais", v.valor_fipe && v.preco_compra ? brl(Number(v.valor_fipe) - compra) : "—"],
    ["Diferença percentual", v.valor_fipe && v.preco_compra ? `${(((Number(v.valor_fipe) - compra) / Number(v.valor_fipe)) * 100).toFixed(2)}%` : "—"],
  ]);

  titulo("3. Origem do capital");
  tabela([
    ["Origem do capital", v.tipo_aquisicao === "financiamento" ? "Financiamento" : v.tipo_aquisicao === "capital_proprio" ? "Capital próprio" : "—"],
    ...(f ? [
      ["Modo de financiamento", String(f.sistema_amortizacao || "").toLowerCase() === "sac" ? "SAC" : "PRICE"],
      ["Valor financiado", brl(f.valor_financiado)],
      ["Taxa de juros", `${f.taxa_juros_percentual}% ${f.periodicidade_taxa ?? "mensal"}`],
      ["Prazo", `${f.quantidade_parcelas} parcelas`],
      ["Valor da parcela", brl(f.valor_parcela)],
      ["Total de juros", brl(f.total_juros)],
    ] : []),
  ]);

  titulo("4. Custos adicionais");
  tabela([
    ...(custos.length ? custos.map((c) => [c.descricao, brl(c.valor)]) : [["Nenhum custo adicional", brl(0)]]),
    ["Total de custos adicionais", brl(totalCustos)],
  ]);

  titulo("5. Resultado da operação");
  tabela([
    ["Investimento total", brl(investimento)],
    ["Resultado parcial (venda pretendida)", `${brl(parcial)} · ${pct(parcial)}`],
  ]);

  if (venda) {
    titulo("6. Resultado final");
    tabela([
      ["Valor de venda", brl(venda.valor_venda)],
      ["Despesas e descontos", brl(Number(venda.despesas_venda ?? 0) + Number(venda.descontos ?? 0))],
      ["Resultado final do veículo", `${brl(final)} · ${pct(final)}`],
    ]);
  }

  titulo("7. Checklist do veículo");
  const linhasCk = checklist
    ? [...ITENS.map(([k, rotulo]) => [rotulo, sim(checklist[k])]),
       ["Documentação", (DOCUMENTACAO.find(([k]) => k === checklist.documentacao_status) || [, "Não informado"])[1]],
       ["Observações", checklist.observacoes || "—"]]
    : [["Checklist", "Não preenchido"]];
  tabela(linhasCk);

  if (fotos.length) {
    titulo("8. Fotos");
    fotos.forEach((src, i) => {
      if (i % 2 === 0) {
        if (y + 66 > 280) { doc.addPage(); y = 16; }
      }
      const x = M + (i % 2) * 92;
      const fmt = (src.match(/data:image\/(\w+)/) || [])[1];
      try {
        doc.addImage(src, fmt === "png" ? "PNG" : "JPEG", x, y, 85, 64);
      } catch { /* formato não suportado: pula a foto */ }
      if (i % 2 === 1 || i === fotos.length - 1) y += 70;
    });
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`SliceX.calc · Página ${p}/${paginas}`, M, 292);
  }
  return doc;
}
