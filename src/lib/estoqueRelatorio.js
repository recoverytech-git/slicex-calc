import { COR, brl, numero, cabecalho, cartoes, secao, tabela, rodape, novoDocumento } from "./relatorioPdf";

/** Junta os dados do veículo com compra, custos, juros do financiamento, juros acumulado e dias (mesma regra da tela Estoque). */
export function linhaRelatorio(v, ctx = {}) {
  const compra = Number(ctx.extras?.[v.id]?.preco_compra ?? v.preco_compra ?? 0);
  const custos = Number(ctx.custosAd?.[v.id] || 0);
  const fin = Number(ctx.finMap?.[v.id] || 0);
  const jd = Number(ctx.metricas?.[v.id]?.juros_diario_acumulado || 0);
  const capital = compra + custos + fin + jd;
  const fipe = Number(v.valor_fipe || 0);
  const pret = Number(v.preco_venda_pretendido || 0);
  return {
    marca: v.marca || "", modelo: v.modelo, placa: v.placa, ano: v.ano_modelo, km: v.quilometragem, status: v.status,
    dias: ctx.metricas?.[v.id]?.dias_em_estoque ?? null,
    compra, custos, fin, jd, capital, fipe, pret, margem: pret - capital,
  };
}

/**
 * Relatório do estoque. Cada status vira uma seção própria, em ordem fixa, com contagem e total.
 * `financeiro` = false (vendedor) omite compra, custos, juros, C.E.T e margem.
 */
export function buildEstoquePDF({ jsPDF, autoTable, itens, rotulos, logo, financeiro = true, emitido }) {
  const doc = novoDocumento(jsPDF, "landscape");
  const titulo = "Relatório de estoque";
  const subtitulo = `${itens.length} veículo(s) · valores em reais`;
  const soma = (lista, k) => lista.reduce((s, x) => s + Number(x[k] || 0), 0);
  const novaPagina = () => { doc.addPage(); return cabecalho(doc, { titulo, subtitulo, logo, meta: emitido }); };

  let y = cabecalho(doc, { titulo, subtitulo, logo, meta: emitido });
  y = financeiro
    ? cartoes(doc, y, [
        { rotulo: "Veículos", valor: numero(itens.length), sub: "unidades listadas" },
        { rotulo: "C.E.T atual", valor: brl(soma(itens, "capital")), sub: "compra + custos + juros" },
        { rotulo: "Potencial FIPE", valor: brl(soma(itens, "fipe")), sub: "soma dos valores FIPE" },
        { rotulo: "Potencial pretendido", valor: brl(soma(itens, "pret")), sub: "soma dos valores pretendidos" },
        { rotulo: "Juros em aberto", valor: brl(soma(itens, "jd")), sub: "juros acumulado após o 30º dia", cor: [180, 83, 9] },
        { rotulo: "Margem projetada", valor: brl(soma(itens, "margem")), sub: "pretendido − C.E.T atual", cor: soma(itens, "margem") < 0 ? [185, 28, 28] : [5, 150, 105] },
      ])
    : cartoes(doc, y, [
        { rotulo: "Veículos", valor: numero(itens.length), sub: "unidades listadas" },
        { rotulo: "Potencial FIPE", valor: brl(soma(itens, "fipe")), sub: "soma dos valores FIPE" },
        { rotulo: "Potencial pretendido", valor: brl(soma(itens, "pret")), sub: "soma dos valores pretendidos" },
      ]);

  // Uma seção por status, na ordem do sistema
  const grupos = Object.keys(rotulos).map((st) => [st, itens.filter((v) => v.status === st)]).filter(([, l]) => l.length);
  grupos.forEach(([st, lista]) => {
    if (y > 150) y = novaPagina();
    y = secao(doc, y + 2, `${rotulos[st]} · ${lista.length} veículo(s)`);
    if (financeiro) {
      const r = { halign: "right" };
      y = tabela(doc, autoTable, {
        y,
        head: ["Veículo", "Placa", "Ano", "KM", "Dias", "Compra", "Custos", "Juros fin.", "Juros acum.", "C.E.T atual", "FIPE", "Pretendido", "Margem"],
        body: lista.map((v) => [`${v.marca ? v.marca + " " : ""}${v.modelo}`, v.placa || "—", v.ano ?? "—", numero(v.km), v.dias ?? "—",
          brl(v.compra), brl(v.custos), brl(v.fin), brl(v.jd), brl(v.capital), brl(v.fipe), brl(v.pret), brl(v.margem)]),
        foot: ["Total", "", "", "", "", brl(soma(lista, "compra")), brl(soma(lista, "custos")), brl(soma(lista, "fin")), brl(soma(lista, "jd")), brl(soma(lista, "capital")), brl(soma(lista, "fipe")), brl(soma(lista, "pret")), brl(soma(lista, "margem"))],
        fonte: 7,
        colunas: { 0: { cellWidth: 36 }, 1: { cellWidth: 16 }, 2: { cellWidth: 12, halign: "center" }, 3: { cellWidth: 15, ...r }, 4: { cellWidth: 11, halign: "center" },
          5: { cellWidth: 21, ...r }, 6: { cellWidth: 19, ...r }, 7: { cellWidth: 19, ...r }, 8: { cellWidth: 19, ...r }, 9: { cellWidth: 21, ...r }, 10: { cellWidth: 21, ...r }, 11: { cellWidth: 21, ...r }, 12: { cellWidth: 21, ...r } },
      });
    } else {
      const r = { halign: "right" };
      y = tabela(doc, autoTable, {
        y,
        head: ["Veículo", "Placa", "Ano", "KM", "Dias", "FIPE", "Pretendido"],
        body: lista.map((v) => [`${v.marca ? v.marca + " " : ""}${v.modelo}`, v.placa || "—", v.ano ?? "—", numero(v.km), v.dias ?? "—", brl(v.fipe), brl(v.pret)]),
        foot: ["Total", "", "", "", "", brl(soma(lista, "fipe")), brl(soma(lista, "pret"))],
        fonte: 8,
        colunas: { 0: { cellWidth: 80 }, 1: { cellWidth: 28 }, 2: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 26, ...r }, 4: { cellWidth: 18, halign: "center" }, 5: { cellWidth: 40, ...r }, 6: { cellWidth: 40, ...r } },
      });
    }
  });
  rodape(doc, "Calcula.car · Relatório de estoque · uso interno");
  return doc;
}
