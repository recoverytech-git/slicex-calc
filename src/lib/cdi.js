// CDI como custo de oportunidade do capital parado.
// A taxa vem do banco (indicadores_mercado, atualizada pelo Banco Central). Nunca usa valor fixo inventado.
export const DIAS_OBSOLETO = 3;

// CDI anual (% a.a., base 252) -> taxa mensal equivalente (fracao)
export function taxaMensalDeAnual(aa) {
  const n = Number(aa);
  if (!(n > 0)) return null;
  return Math.pow(1 + n / 100, 1 / 12) - 1;
}

// Situacao do indicador para exibir ao usuario
export function situacaoCdi(indicador, hoje = new Date()) {
  if (!indicador || !(indicador.valor > 0)) return { ok: false, aviso: "CDI indisponível: atualização automática ainda não rodou." };
  const dias = Math.floor((hoje - new Date(indicador.atualizado_em)) / 86400000);
  if (dias > DIAS_OBSOLETO) return { ok: false, aviso: `CDI desatualizado (última atualização há ${dias} dias).` };
  return { ok: true, aviso: null };
}
