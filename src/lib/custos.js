// Custos recorrentes do estoque, meta de lucro e indicadores.
// Todos os valores sao reais: capital e resultado de cada veiculo (igual a tela Estoque) e resultado final das vendas.
export const CATEGORIAS_CUSTO = ['Seguro', 'Pátio', 'Lavagem', 'Aluguel', 'Documentação', 'Outro'];

export function custoFixoMensal(custos) {
  return (custos || []).filter((c) => c.ativo !== false).reduce((s, c) => s + Number(c.valor_mensal || 0), 0);
}

// Capital e resultado de cada veiculo: capital = compra + custos adicionais + juros do financiamento + juros acumulado
export function mapaCapital({ veiculos = [], custosVeic = [], fin = [], metricas = [] }) {
  const cv = {}; custosVeic.forEach((c) => { cv[c.veiculo_id] = (cv[c.veiculo_id] || 0) + Number(c.valor || 0); });
  const ft = {}; fin.forEach((f) => { ft[f.veiculo_id] = (ft[f.veiculo_id] || 0) + Number(f.total_juros || 0); });
  const jd = {}; metricas.forEach((m) => { jd[m.veiculo_id] = Number(m.juros_diario_acumulado || 0); });
  const out = {};
  for (const v of veiculos) {
    const capital = Number(v.preco_compra || 0) + (cv[v.id] || 0) + (ft[v.id] || 0) + (jd[v.id] || 0);
    const pret = Number(v.preco_venda_pretendido || 0);
    out[v.id] = { capital, pret, fipe: Number(v.valor_fipe || 0), resultado: pret - capital };
  }
  return out;
}

// Mesmos indicadores da tela Estoque (calcularResumo com capital completo)
export function resumoEstoque(args) {
  const mapa = mapaCapital(args);
  const patio = (args.veiculos || []).filter((v) => v.status !== 'vendido').map((v) => mapa[v.id]);
  const fipes = patio.map((x) => x.fipe).filter((x) => x > 0);
  const potFipe = patio.reduce((s, x) => s + x.fipe, 0);
  const potPret = patio.reduce((s, x) => s + x.pret, 0);
  const capital = patio.reduce((s, x) => s + x.capital, 0);
  const lucroFipe = potFipe - capital;
  const lucroPret = potPret - capital;
  const minFipe = fipes.length ? Math.min(...fipes) : 0;
  const maxFipe = fipes.length ? Math.max(...fipes) : 0;
  return {
    total: patio.length, capital, potFipe, potPret, lucroFipe, lucroPret,
    margemFipe: potFipe > 0 ? (lucroFipe / potFipe) * 100 : null,
    margemPret: potPret > 0 ? (lucroPret / potPret) * 100 : null,
    ticketFipe: (minFipe + maxFipe) / 2, minFipe, maxFipe,
  };
}

// Vendas concretizadas no periodo (datas em AAAA-MM-DD)
export function vendasPeriodo(vendas = [], dias) {
  const desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
  return vendas.filter((v) => String(v.data_venda || '').slice(0, 10) >= desde);
}

export function resumoVendas(lista = []) {
  const fat = lista.reduce((s, v) => s + Number(v.valor_venda || 0), 0);
  const res = lista.reduce((s, v) => s + Number(v.resultado_final || 0), 0);
  const n = lista.length;
  return { n, fat, res, ticket: n ? fat / n : 0, margem: fat > 0 ? (res / fat) * 100 : 0 };
}

// Plano da meta com veiculos reais: escolhe do maior resultado real para o menor, ate atingir a meta.
// lucro = resultado realizado no mes - custos fixos + resultado dos veiculos vendidos
export function planoMeta({ meta = 0, fixo = 0, realizadoMes = 0, veiculos = [] }) {
  const alvo = Number(meta) || 0;
  const base = (Number(realizadoMes) || 0) - (Number(fixo) || 0);
  const ordenados = veiculos.filter((v) => v.resultado > 0).sort((a, b) => b.resultado - a.resultado);
  const totalEstoque = ordenados.reduce((s, v) => s + v.resultado, 0);
  if (base >= alvo) return { atingivel: true, base, alvo, escolhidos: [], totalEstoque, lucroComEstoque: base, falta: 0 };
  let acumulado = base;
  const escolhidos = [];
  for (const v of ordenados) {
    acumulado += v.resultado;
    escolhidos.push({ ...v, acumulado });
    if (acumulado >= alvo) return { atingivel: true, base, alvo, escolhidos, totalEstoque, lucroComEstoque: acumulado, falta: 0 };
  }
  return { atingivel: false, base, alvo, escolhidos: [], totalEstoque, lucroComEstoque: base + totalEstoque, falta: alvo - (base + totalEstoque) };
}

// Alerta quando os custos fixos passam de uma fracao do resultado bruto real do mes
export function alertaExcesso({ custoFixoMensal = 0, margemBrutaMes = 0, limite = 0.25 }) {
  const custo = Number(custoFixoMensal) || 0;
  if (!(custo > 0)) return null;
  if (!(margemBrutaMes > 0)) return { nivel: 'alto', texto: 'Há custos fixos e nenhum resultado realizado nos últimos 30 dias' };
  const pct = custo / margemBrutaMes;
  if (pct <= limite) return null;
  return { nivel: pct > 0.5 ? 'alto' : 'medio', pct, texto: `Os custos fixos consomem ${Math.round(pct * 100)}% do resultado bruto realizado no mês` };
}
