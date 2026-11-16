// Ranking de venda: ordena pelo custo de carregamento acumulado (juros + custo de oportunidade do capital)
export function prioridadeVenda(veiculos, { taxaOportunidadeMensal = 0.01 } = {}) {
  return veiculos
    .map((v) => {
      const capital = Number(v.capital) || 0;
      const dias = Number(v.dias) || 0;
      const custoCarregamento = (Number(v.juros_acumulado) || 0) + capital * taxaOportunidadeMensal * (dias / 30);
      return { ...v, custoCarregamento, margem: (Number(v.pret) || 0) - capital };
    })
    .sort((a, b) => b.custoCarregamento - a.custoCarregamento || a.margem - b.margem);
}
