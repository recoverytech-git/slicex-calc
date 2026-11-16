// Ranking de venda com os componentes do custo separados:
// - jurosAcumulado: juros do financiamento depois do 30o dia (custo real, sai do caixa)
// - custoOportunidade: capital x taxa mensal do CDI x dias / 30 (rendimento que o capital deixou de ter)
// - custoCarregamento: soma dos dois, usada para ordenar
export function prioridadeVenda(veiculos, { taxaOportunidadeMensal = 0.01 } = {}) {
  return veiculos
    .map((v) => {
      const capital = Number(v.capital) || 0;
      const dias = Number(v.dias) || 0;
      const jurosAcumulado = Number(v.juros_acumulado) || 0;
      const custoOportunidade = capital * taxaOportunidadeMensal * (dias / 30);
      return {
        ...v,
        jurosAcumulado,
        custoOportunidade,
        custoCarregamento: jurosAcumulado + custoOportunidade,
        margem: (Number(v.pret) || 0) - capital,
      };
    })
    .sort((a, b) => b.custoCarregamento - a.custoCarregamento || a.margem - b.margem);
}
