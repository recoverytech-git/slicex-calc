// Custos recorrentes do estoque e meta de lucro liquido.
// Modelo: o custo fixo mensal e rateado pelos veiculos vendidos nos ultimos 30 dias.
export const CATEGORIAS_CUSTO = ['Seguro', 'Pátio', 'Lavagem', 'Aluguel', 'Documentação', 'Outro'];

export function custoFixoMensal(custos) {
  return (custos || []).filter((c) => c.ativo !== false).reduce((s, c) => s + Number(c.valor_mensal || 0), 0);
}

// Quanto a operacao precisa de margem bruta por mes para cobrir os custos e atingir a meta
export function analisarMeta({ custoFixoMensal = 0, vendas30 = 0, margemMedia = 0, precoMedio = 0, meta = 0 }) {
  const custo = Number(custoFixoMensal) || 0;
  const vendas = Math.max(0, Math.floor(Number(vendas30) || 0));
  const mm = Number(margemMedia) || 0;
  const alvo = Number(meta) || 0;
  const necessario = custo + alvo;
  const margemBrutaMes = vendas * mm;
  const lucroLiquidoMes = margemBrutaMes - custo;
  const custoPorVeiculo = vendas > 0 ? custo / vendas : null;
  if (!(mm > 0)) return { status: 'sem_dados', necessario, lucroLiquidoMes, custoPorVeiculo };
  const veiculosNecessarios = Math.ceil(necessario / mm);
  if (margemBrutaMes >= necessario) {
    return { status: 'ok', necessario, margemBrutaMes, excedente: margemBrutaMes - necessario, lucroLiquidoMes, custoPorVeiculo, veiculosNecessarios, faltamVeiculos: 0, acrescimoPorVeiculo: 0, acrescimoPrecoPct: 0 };
  }
  const faltaTotal = necessario - margemBrutaMes;
  const acrescimoPorVeiculo = vendas > 0 ? faltaTotal / vendas : null;
  const preco = Number(precoMedio) || 0;
  return {
    status: 'abaixo', necessario, margemBrutaMes, faltaTotal, lucroLiquidoMes, custoPorVeiculo,
    veiculosNecessarios, faltamVeiculos: Math.max(0, veiculosNecessarios - vendas),
    acrescimoPorVeiculo, acrescimoPrecoPct: preco > 0 && acrescimoPorVeiculo != null ? acrescimoPorVeiculo / preco : null,
  };
}

// Alerta quando os custos fixos passam de uma fracao da margem bruta do mes
export function alertaExcesso({ custoFixoMensal = 0, margemBrutaMes = 0, limite = 0.25 }) {
  const custo = Number(custoFixoMensal) || 0;
  if (!(custo > 0)) return null;
  if (!(margemBrutaMes > 0)) return { nivel: 'alto', texto: 'Há custos fixos e nenhuma margem realizada nos últimos 30 dias' };
  const pct = custo / margemBrutaMes;
  if (pct <= limite) return null;
  return { nivel: pct > 0.5 ? 'alto' : 'medio', pct, texto: `Os custos fixos consomem ${Math.round(pct * 100)}% da margem bruta do mês` };
}

// Base do estoque (igual a tela Estoque): capital = compra + custos adicionais.
// Os juros (financiamento e acumulado) sao custos financeiros separados, deduzidos nos cenarios de meta.
export function resumoEstoque({ veiculos = [], custosVeic = [], fin = [], metricas = [] }) {
  const cv = {}; custosVeic.forEach((c) => { cv[c.veiculo_id] = (cv[c.veiculo_id] || 0) + Number(c.valor || 0); });
  const ft = {}; fin.forEach((f) => { ft[f.veiculo_id] = (ft[f.veiculo_id] || 0) + Number(f.total_juros || 0); });
  const jd = {}; metricas.forEach((m) => { jd[m.veiculo_id] = Number(m.juros_diario_acumulado || 0); });
  const patio = veiculos.filter((v) => v.status !== "vendido");
  const capital = patio.reduce((s, v) => s + Number(v.preco_compra || 0) + (cv[v.id] || 0), 0);
  const jurosEstoque = patio.reduce((s, v) => s + (ft[v.id] || 0) + (jd[v.id] || 0), 0);
  const fipes = patio.map((v) => Number(v.valor_fipe || 0)).filter((x) => x > 0);
  const potFipe = patio.reduce((s, v) => s + Number(v.valor_fipe || 0), 0);
  const potPret = patio.reduce((s, v) => s + Number(v.preco_venda_pretendido || 0), 0);
  const n = patio.length;
  const lucroFipe = potFipe - capital;
  const lucroPret = potPret - capital;
  const minFipe = fipes.length ? Math.min(...fipes) : 0;
  const maxFipe = fipes.length ? Math.max(...fipes) : 0;
  return {
    total: n, capital, potFipe, potPret, lucroFipe, lucroPret, jurosEstoque,
    margemFipe: potFipe > 0 ? (lucroFipe / potFipe) * 100 : null,
    margemPret: potPret > 0 ? (lucroPret / potPret) * 100 : null,
    margemMedia: n ? lucroPret / n : 0,
    jurosPorCarro: n ? jurosEstoque / n : 0,
    precoMedio: n ? potPret / n : 0,
    ticketFipe: (minFipe + maxFipe) / 2, minFipe, maxFipe,
  };
}

// Tres cenarios da meta de lucro liquido
export function cenariosMeta({ meta = 0, custoFixoMensal = 0, margemMedia = 0, jurosPorCarro = 0, precoMedio = 0, vendas30 = 0, mediaMensal90 = 0 }) {
  const liq = (Number(margemMedia) || 0) - (Number(jurosPorCarro) || 0);
  const custo = Number(custoFixoMensal) || 0;
  const alvo = Number(meta) || 0;
  const pm = Number(precoMedio) || 0;
  const lucro = (n) => n * liq - custo;
  const cenario = (rotulo, n) => {
    const l = lucro(n);
    return { rotulo, carros: n, lucro: l, atinge: l >= alvo, faltam: Math.max(0, alvo - l) };
  };
  const a = cenario("Ritmo dos últimos 30 dias", Number(vendas30) || 0);
  const nb = Number(mediaMensal90) || 0;
  const b = cenario("Ritmo médio dos últimos 90 dias", nb);
  let c;
  if (liq <= 0) c = { rotulo: "Para atingir a meta", impossivel: true };
  else {
    const necessario = Math.max(1, Math.ceil((alvo + custo) / liq));
    c = { ...cenario("Para atingir a meta", necessario), necessario };
  }
  const falta = alvo - lucro(nb);
  const aumentoPorCarro = nb > 0 && falta > 0 ? falta / nb : 0;
  return { a, b, c, liqPorCarro: liq, aumentoPorCarro, aumentoPct: pm > 0 ? aumentoPorCarro / pm : null };
}

// Vendas reais no periodo
export function resumoReal(vendas = []) {
  const fat = vendas.reduce((s, v) => s + Number(v.valor_venda || 0), 0);
  const res = vendas.reduce((s, v) => s + Number(v.resultado_final || 0), 0);
  const n = vendas.length;
  return { n, fat, res, ticket: n ? fat / n : 0, margem: fat > 0 ? (res / fat) * 100 : 0 };
}

// Margem real por carro: vendas reais, antes dos juros.
// resultado_final ja desconta os juros; por isso somamos de volta o juros_total de cada venda.
export function margemReal(vendas = []) {
  const n = vendas.length;
  if (!n) return { n: 0, margem: null, juros: null };
  const margem = vendas.reduce((s, v) => s + Number(v.resultado_final || 0) + Number(v.juros_total || 0), 0) / n;
  const juros = vendas.reduce((s, v) => s + Number(v.juros_total || 0), 0) / n;
  return { n, margem, juros };
}

