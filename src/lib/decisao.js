// Simulador de decisao: mesma logica do Calcula-Car.
// Financia o "Valor financiado" menos a entrada (calcPrice ou calcSAC), e calcula o resultado
// para a venda pela FIPE e para a venda pelo valor pretendido, a vista e financiado (calcResultado).
import { calcPrice, calcSAC } from "./financiamento";
import { calcResultado } from "./calculaCar";

const num = (x) => Number(x) || 0;

export function simularDecisao({ fipe, compra, pretendido, custos = 0, tipoCapital = "Próprio", valorFinanciado = 0, entrada = 0, taxa = 0, meses = 0, sistema = "Price" }) {
  const F = num(fipe);
  const C = num(compra);
  const P = num(pretendido);
  const listaCustos = [{ valor: num(custos) }];
  const pv = num(valorFinanciado) - num(entrada);
  const n = Math.floor(num(meses));
  const t = num(taxa);
  const financiado = tipoCapital === "Financiamento" && pv > 0 && t > 0 && n > 0 && n <= 360;
  const rows = financiado ? (sistema === "SAC" ? calcSAC(pv, t, n) : calcPrice(pv, t, n)) : [];
  const juros = rows.reduce((s, r) => s + r.juros, 0);
  const totalParcelas = rows.reduce((s, r) => s + r.parcela, 0);
  const cenario = (valorVenda, custoFinanceiro) => calcResultado({ fipe: F, compra: C, custos: listaCustos, custoFinanceiro, valorVenda });
  const bloco = (valorVenda) => {
    const avista = cenario(valorVenda, 0);
    const comFin = cenario(valorVenda, juros);
    return { avista, comFin, melhor: avista.resultadoLiquido >= comFin.resultadoLiquido ? "avista" : "financiado", diferenca: avista.resultadoLiquido - comFin.resultadoLiquido };
  };
  return {
    financiado: financiado ? { pv, taxa: t, n, sistema, juros, totalParcelas } : null,
    pelaFipe: bloco(F),
    pelaPretendido: bloco(P),
  };
}
