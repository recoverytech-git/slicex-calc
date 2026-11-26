import { COR, brl, numero, pct, cabecalho, cartoes, secao, tabela, rodape, novoDocumento } from "./relatorioPdf";

/** Junta os dados do veículo com custos, juros do financiamento, juros acumulado e dias em estoque (mesma regra da tela Estoque). */
export function linhaRelatorio(v, ctx = {}) {
  const compra = Number(v.preco_compra || 0);
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

/** Relatório PDF do estoque (paisagem), com todas as colunas financeiras. */
export function buildEstoquePDF({ jsPDF, autoTable, itens, rotulos, logo }) {
  const doc = novoDocumento(jsPDF, "landscape");
  const soma = (k) => itens.reduce((s, x) => s + Number(x[k] || 0), 0);
  let y = cabecalho(doc, { titulo: "Relatório de estoque", subtitulo: `${itens.length} veículo(s) · valores em reais`, logo });
  y = cartoes(doc, y, [
    { rotulo: "Veículos", valor: numero(itens.length), sub: "unidades listadas" },
    { rotulo: "Capital investido", valor: brl(soma("capital")), sub: "compra + custos + juros" },
    { rotulo: "Potencial FIPE", valor: brl(soma("fipe")), sub: "soma dos valores FIPE" },
    { rotulo: "Potencial pretendido", valor: brl(soma("pret")), sub: "soma dos valores pretendidos" },
    { rotulo: "Juros em aberto", valor: brl(soma("jd")), sub: "juros acumulado após o 30º dia", cor: [180, 83, 9] },
    { rotulo: "Margem projetada", valor: brl(soma("margem")), sub: "pretendido − capital", cor: soma("margem") < 0 ? [185, 28, 28] : [5, 150, 105] },
  ]);
  y = secao(doc, y + 2, "Veículos em estoque");
  const linhas = itens.map((v) => [
    `${v.marca ? v.marca + " " : ""}${v.modelo}`, v.placa || "—", v.ano ?? "—", numero(v.km), rotulos[v.status] ?? v.status, v.dias ?? "—",
    brl(v.compra), brl(v.custos), brl(v.fin), brl(v.jd), brl(v.capital), brl(v.fipe), brl(v.pret), brl(v.margem),
  ]);
  const total = ["Total", "", "", "", "", "", brl(soma("compra")), brl(soma("custos")), brl(soma("fin")), brl(soma("jd")), brl(soma("capital")), brl(soma("fipe")), brl(soma("pret")), brl(soma("margem"))];
  const num = { halign: "right" };
  tabela(doc, autoTable, {
    y,
    head: ["Veículo", "Placa", "Ano", "KM", "Status", "Dias", "Compra", "Custos", "Juros fin.", "Juros acum.", "Capital", "FIPE", "Pretendido", "Margem"],
    body: linhas, foot: total, fonte: 7,
    colunas: {
      0: { cellWidth: 34 }, 1: { cellWidth: 16 }, 2: { cellWidth: 12, halign: "center" }, 3: { cellWidth: 15, ...num }, 4: { cellWidth: 17 }, 5: { cellWidth: 11, halign: "center" },
      6: { cellWidth: 21, ...num }, 7: { cellWidth: 19, ...num }, 8: { cellWidth: 19, ...num }, 9: { cellWidth: 19, ...num }, 10: { cellWidth: 21, ...num }, 11: { cellWidth: 21, ...num }, 12: { cellWidth: 21, ...num }, 13: { cellWidth: 21, ...num },
    },
  });
  rodape(doc, "Calcula.car · Relatório de estoque · uso interno");
  return doc;
}
