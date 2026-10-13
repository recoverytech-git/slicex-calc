/**
 * Formatação e parsing monetário — fonte única de verdade para todo o sistema.
 *
 * Regra: a MÁSCARA é apenas apresentação. Cálculos usam sempre o número
 * (parseMoeda), nunca a string formatada.
 */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 10000000 -> "R$ 10.000.000,00" */
export const formatarBRL = (v) => BRL.format(Number.isFinite(v) ? v : 0);

/** 10000000 -> "10.000.000,00" (sem símbolo, para campos de entrada) */
export const formatarNumeroBR = (v) => NUM.format(Number.isFinite(v) ? v : 0);

/**
 * Converte texto digitado/colado em número.
 * Aceita: "1.500,50" (BR), "1500.50" (internacional), "1500" e "R$ 1.500,50".
 * Retorna NaN apenas se não houver nenhum dígito.
 *
 * Heurística segura: se houver vírgula, ela é o decimal (BR) e os pontos
 * são milhar. Se não houver vírgula, o último ponto é decimal somente se
 * tiver 1 ou 2 casas depois; caso contrário é separador de milhar.
 */
export function parseMoeda(texto) {
  if (typeof texto === "number") return texto;
  let s = String(texto ?? "").replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return NaN;
  const negativo = s.trim().startsWith("-");
  s = s.replace(/-/g, "");

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const partes = s.split(".");
    if (partes.length > 1) {
      const ultima = partes[partes.length - 1];
      s = ultima.length <= 2 ? s : s.replace(/\./g, "");
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (negativo ? -n : n) : NaN;
}

/**
 * Máscara de digitação estilo caixa eletrônico: os dígitos entram pela
 * direita. Trabalha em centavos inteiros para não haver erro de ponto flutuante.
 */
export function mascararDigitacao(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "");
  const centavos = digitos === "" ? 0 : Math.min(parseInt(digitos, 10), 999999999999);
  return { centavos, valor: centavos / 100, exibicao: formatarNumeroBR(centavos / 100) };
}
