export function calcularResumo(itens, extras, custos, checklists, vendedor) {
  const patio = itens.filter((v) => v.status !== "vendido");
  const total = patio.length;
  const fipeDe = (v) => Number(v.valor_fipe || 0);
  const pretDe = (v) => Number(v.preco || 0);
  const faixa = (lista) => {
    const ok = lista.filter((x) => x > 0);
    if (!ok.length) return { min: 0, max: 0, ticket: 0 };
    const min = Math.min(...ok);
    const max = Math.max(...ok);
    return { min, max, ticket: (min + max) / 2 };
  };
  const potFipe = patio.reduce((s, v) => s + fipeDe(v), 0);
  const potPret = patio.reduce((s, v) => s + pretDe(v), 0);
  const fF = faixa(patio.map(fipeDe));
  const fP = faixa(patio.map(pretDe));
  const checados = checklists ? patio.filter((v) => checklists.has(v.id)).length : null;
  let lucroFipe = null;
  let lucroPret = null;
  let margemFipe = null;
  let margemPret = null;
  if (!vendedor) {
    const capital = patio.reduce((s, v) => s + Number(extras[v.id]?.preco_compra || 0) + Number(custos[v.id] || 0), 0);
    lucroFipe = potFipe - capital;
    lucroPret = potPret - capital;
    margemFipe = potFipe > 0 ? (lucroFipe / potFipe) * 100 : 0;
    margemPret = potPret > 0 ? (lucroPret / potPret) * 100 : 0;
  }
  return {
    total, potFipe, potPret,
    ticketFipe: fF.ticket, minFipe: fF.min, maxFipe: fF.max,
    ticketPret: fP.ticket, minPret: fP.min, maxPret: fP.max,
    checados, lucroFipe, lucroPret, margemFipe, margemPret,
  };
}

// Agio/deságio de uma venda: valor vendido em relacao ao pretendido
export function agioVenda(valorVenda, pretendido) {
  const v = Number(valorVenda || 0);
  const p = Number(pretendido || 0);
  return { reais: v - p, pct: p > 0 ? ((v - p) / p) * 100 : null };
}

// Resumo do agio do periodo: total, media em reais e media em percentual (por venda)
export function resumoAgio(vendas) {
  const linhas = vendas.map((s) => ({ ...s, ...agioVenda(s.valor_venda, s.preco_venda_pretendido) }));
  const comPct = linhas.filter((l) => l.pct !== null);
  const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return {
    linhas,
    total: linhas.reduce((a, l) => a + l.reais, 0),
    mediaReais: media(linhas.map((l) => l.reais)),
    mediaPct: media(comPct.map((l) => l.pct)),
  };
}

// Faturamento bruto (valor vendido) e liquido (menos despesas e descontos)
export function faturamento(vendas) {
  const bruto = vendas.reduce((a, s) => a + Number(s.valor_venda || 0), 0);
  const deducoes = vendas.reduce((a, s) => a + Number(s.despesas_venda || 0) + Number(s.descontos || 0), 0);
  return { bruto, deducoes, liquido: bruto - deducoes };
}

// Quantos veiculos em estoque estao parados a partir de cada faixa de dias
export const FAIXAS_PARADOS = [30, 60, 90, 180, 360];
export function contarParados(metricas, faixas = FAIXAS_PARADOS) {
  return faixas.map((dias) => ({ dias, quantidade: metricas.filter((m) => Number(m.dias_em_estoque || 0) >= dias).length }));
}
