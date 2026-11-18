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
