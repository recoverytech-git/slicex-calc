// Simulador: comprar a vista x financiar (mesma regra do Calcula-Car: 1 parcela = juros do mes; mais parcelas = Price)
export function compararAVistaFinanciado({ compra, custos = 0, pretendido, entrada = 0, taxaMensal = 0, prazo = 1 }) {
  const c = Number(compra) || 0;
  const k = Number(custos) || 0;
  const p = Number(pretendido) || 0;
  const e = Math.min(Number(entrada) || 0, c);
  const pv = Math.max(c - e, 0);
  const i = (Number(taxaMensal) || 0) / 100;
  const n = Math.max(1, Math.floor(Number(prazo) || 1));
  let juros;
  if (n === 1) juros = pv * i;
  else {
    const pmt = i === 0 ? pv / n : (pv * i) / (1 - Math.pow(1 + i, -n));
    juros = pmt * n - pv;
  }
  const avista = { custoTotal: c + k, caixaInicial: c + k, lucro: p - (c + k), juros: 0 };
  const financiado = { custoTotal: c + k + juros, caixaInicial: e + k, lucro: p - (c + k + juros), juros };
  return {
    avista,
    financiado,
    melhor: avista.lucro >= financiado.lucro ? "avista" : "financiado",
    diferencaLucro: avista.lucro - financiado.lucro,
  };
}
