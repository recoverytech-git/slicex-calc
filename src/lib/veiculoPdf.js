import { COR, brl, cabecalho, cartoes, secao, tabela, rodape, novoDocumento } from "./relatorioPdf";

/** PDF completo do veículo (mesma base visual dos demais relatórios). Cálculos iguais aos da tela. */
export function gerarPdfVeiculo({ veiculo: v, financiamento: f, custos = [], vendas = [], checklist, fotos = [], jsPDF, autoTable, ITENS, DOCUMENTACAO, logo = null }) {
  const doc = novoDocumento(jsPDF, "portrait");
  const data = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");
  const sim = (x) => (x === true ? "Sim" : x === false ? "Não" : "Não informado");
  const pct = (r) => (r == null || !investimento ? "—" : `${((r / investimento) * 100).toFixed(2)}%`);

  const compra = Number(v.preco_compra ?? 0);
  const totalCustos = custos.reduce((s, c) => s + Number(c.valor ?? 0), 0);
  const juros = f ? Number(f.total_juros ?? 0) : 0;
  const investimento = compra + totalCustos + juros;
  const venda = vendas[0];
  const parcial = v.preco_venda_pretendido != null ? Number(v.preco_venda_pretendido) - investimento : null;
  const final = venda ? Number(venda.valor_venda) - Number(venda.despesas_venda ?? 0) - Number(venda.descontos ?? 0) - investimento : null;

  const cab = () => cabecalho(doc, {
    titulo: v.modelo || "Veículo",
    subtitulo: `Ficha do veículo · ${v.marca ? v.marca + " · " : ""}${v.placa || "sem placa"}`,
    logo,
  });
  let y = cab();

  const indicadores = [
    { rotulo: "Investimento total", valor: brl(investimento), sub: "compra + custos + juros" },
    { rotulo: "Resultado parcial", valor: `${brl(parcial)}`, sub: `${pct(parcial)} sobre o investimento`, cor: parcial != null && parcial < 0 ? [185, 28, 28] : [5, 150, 105] },
    { rotulo: "Juros do financiamento", valor: brl(juros), sub: f ? "total do contrato" : "sem financiamento", cor: [180, 83, 9] },
    venda
      ? { rotulo: "Resultado final", valor: brl(final), sub: `${pct(final)} · venda registrada`, cor: final < 0 ? [185, 28, 28] : [5, 150, 105] }
      : { rotulo: "Valor pretendido", valor: brl(v.preco_venda_pretendido), sub: "venda ainda não registrada" },
  ];
  y = cartoes(doc, y, indicadores);

  const bloco = (titulo, linhas) => {
    if (y > 250) { doc.addPage(); y = cab(); }
    y = secao(doc, y + 2, titulo);
    y = tabela(doc, autoTable, { y, head: ["Campo", "Informação"], body: linhas, colunas: { 0: { cellWidth: 75, textColor: COR.cinza }, 1: { fontStyle: "bold" } } });
  };

  bloco("1. Identificação e características", [
    ["Modelo", v.modelo || "—"], ["Marca", v.marca || "—"], ["Placa", v.placa || "—"], ["RENAVAM", v.renavam || "—"],
    ["Chassi", v.chassi || "—"], ["Data de aquisição", data(v.data_aquisicao)], ["Ano de fabricação", v.ano_fabricacao ?? "—"],
    ["Ano do modelo", v.ano_modelo ?? "—"], ["Quilometragem", v.quilometragem != null ? `${Number(v.quilometragem).toLocaleString("pt-BR")} km` : "—"],
    ["Nº do motor", v.numero_motor || "—"], ["Potência do motor", v.potencia_motor || "—"], ["Portas", v.portas ?? "—"],
    ["Lugares", v.lugares ?? "—"], ["Categoria / carroceria", v.categoria || "—"], ["Cor", v.cor || "—"],
    ["Valor de venda pretendido", brl(v.preco_venda_pretendido)],
  ]);

  bloco("2. Análise FIPE x compra", [
    ["Valor FIPE", brl(v.valor_fipe)], ["Valor de compra", brl(v.preco_compra)],
    ["Diferença em reais", v.valor_fipe && v.preco_compra ? brl(Number(v.valor_fipe) - compra) : "—"],
    ["Diferença percentual", v.valor_fipe && v.preco_compra ? `${(((Number(v.valor_fipe) - compra) / Number(v.valor_fipe)) * 100).toFixed(2)}%` : "—"],
  ]);

  bloco("3. Origem do capital", [
    ["Origem do capital", v.tipo_aquisicao === "financiamento" ? "Financiamento" : v.tipo_aquisicao === "capital_proprio" ? "Capital próprio" : "—"],
    ...(f ? [
      ["Modo de financiamento", String(f.sistema_amortizacao || "").toLowerCase() === "sac" ? "SAC" : "Price"],
      ["Valor financiado", brl(f.valor_financiado)],
      ["Taxa de juros", `${f.taxa_juros_percentual}% ${f.periodicidade_taxa ?? "mensal"}`],
      ["Prazo", `${f.quantidade_parcelas} parcelas`],
      ["Valor da parcela", brl(f.valor_parcela)],
      ["Total de juros", brl(f.total_juros)],
    ] : []),
  ]);

  bloco("4. Custos adicionais", [
    ...(custos.length ? custos.map((c) => [c.descricao, brl(c.valor)]) : [["Nenhum custo adicional", brl(0)]]),
    ["Total de custos adicionais", brl(totalCustos)],
  ]);

  bloco("5. Resultado da operação", [
    ["Investimento total", brl(investimento)],
    ["Resultado parcial (venda pretendida)", `${brl(parcial)} · ${pct(parcial)}`],
    ...(venda ? [
      ["Valor de venda", brl(venda.valor_venda)],
      ["Despesas e descontos", brl(Number(venda.despesas_venda ?? 0) + Number(venda.descontos ?? 0))],
      ["Resultado final do veículo", `${brl(final)} · ${pct(final)}`],
    ] : []),
  ]);

  bloco("6. Checklist do veículo", checklist
    ? [...ITENS.map(([k, rotulo]) => [rotulo, sim(checklist[k])]),
       ["Documentação", (DOCUMENTACAO.find(([k]) => k === checklist.documentacao_status) || [, "Não informado"])[1]],
       ["Observações", checklist.observacoes || "—"]]
    : [["Checklist", "Não preenchido"]]);

  if (fotos.length) {
    if (y > 240) { doc.addPage(); y = cab(); }
    y = secao(doc, y + 2, "7. Fotos");
    fotos.forEach((src, i) => {
      if (i % 2 === 0 && y + 66 > 275) { doc.addPage(); y = cab(); }
      const x = 12 + (i % 2) * 99;
      const fmt = (src.match(/data:image\/(\w+)/) || [])[1];
      try { doc.addImage(src, fmt === "png" ? "PNG" : "JPEG", x, y, 93, 66); } catch { /* formato não suportado */ }
      if (i % 2 === 1 || i === fotos.length - 1) y += 70;
    });
  }

  rodape(doc, "Calcula.car · Ficha do veículo · uso interno");
  return doc;
}
