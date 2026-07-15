/**
 * Calcula as relações percentuais entre dois valores A e B.
 *
 * - variacaoAB: variação percentual ao ir de A para B (assimétrica, com sinal)
 * - variacaoBA: variação percentual ao ir de B para A (assimétrica, com sinal)
 * - diferencaSimetrica: diferença percentual simétrica, útil quando não há
 *   uma ordem natural "antes/depois" entre os valores (usa a média como base)
 * - diferencaAbsoluta: |A - B|
 */
export function calcPercentual(a, b) {
  const diferencaAbsoluta = Math.abs(a - b);
  const media = (a + b) / 2;

  const variacaoAB = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : null;
  const variacaoBA = b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null;
  const diferencaSimetrica = media !== 0 ? (diferencaAbsoluta / Math.abs(media)) * 100 : null;

  return { diferencaAbsoluta, variacaoAB, variacaoBA, diferencaSimetrica };
}
