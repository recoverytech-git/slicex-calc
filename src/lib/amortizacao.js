/**
 * Simulador de Amortização Extraordinária.
 *
 * Dado um saldo devedor atual, compara as duas estratégias clássicas de
 * usar um aporte extra para abater o financiamento:
 *
 *   Estratégia 1 — Reduzir Prazo:
 *     mantém o valor da parcela (Price) ou o ritmo de amortização mensal
 *     (SAC) e quita o saldo mais rápido, encurtando o número de meses.
 *
 *   Estratégia 2 — Reduzir Parcela:
 *     mantém o número de meses restante e recalcula uma parcela menor
 *     sobre o novo saldo (após o aporte).
 *
 * Ambas simulações partem do MESMO saldo devedor reduzido (saldo - aporte)
 * e da MESMA taxa mensal, o que garante uma comparação justa.
 */

function simularPagamentoFixo(saldoInicial, taxaMensal, pagamentoFixo) {
  const i = taxaMensal / 100;
  let saldo = saldoInicial;
  const linhas = [];
  let mes = 0;
  const MAX_MESES = 1200; // trava de segurança (100 anos) contra loop infinito

  while (saldo > 0.005 && mes < MAX_MESES) {
    mes += 1;
    const juros = saldo * i;
    let parcela = pagamentoFixo;
    let amort = parcela - juros;

    // Última parcela: ajusta para quitar exatamente o saldo restante
    if (amort >= saldo) {
      amort = saldo;
      parcela = amort + juros;
    }
    saldo = Math.max(0, saldo - amort);
    linhas.push({ mes, parcela, juros, amortizacao: amort, saldo });
  }
  return linhas;
}

function simularAmortFixa(saldoInicial, taxaMensal, amortFixa) {
  const i = taxaMensal / 100;
  let saldo = saldoInicial;
  const linhas = [];
  let mes = 0;
  const MAX_MESES = 1200;

  while (saldo > 0.005 && mes < MAX_MESES) {
    mes += 1;
    const juros = saldo * i;
    const amort = Math.min(amortFixa, saldo);
    const parcela = amort + juros;
    saldo = Math.max(0, saldo - amort);
    linhas.push({ mes, parcela, juros, amortizacao: amort, saldo });
  }
  return linhas;
}

function calcPriceSchedule(pv, taxa, n) {
  const i = taxa / 100;
  const pmt = (pv * i) / (1 - Math.pow(1 + i, -n));
  let saldo = pv;
  return Array.from({ length: n }, (_, k) => {
    const juros = saldo * i, amort = pmt - juros;
    saldo = Math.max(0, saldo - amort);
    return { mes: k + 1, parcela: pmt, juros, amortizacao: amort, saldo };
  });
}

function calcSACSchedule(pv, taxa, n) {
  const i = taxa / 100, amort = pv / n;
  let saldo = pv;
  return Array.from({ length: n }, (_, k) => {
    const juros = saldo * i, parcela = amort + juros;
    saldo = Math.max(0, saldo - amort);
    return { mes: k + 1, parcela, juros, amortizacao: amort, saldo };
  });
}

const soma = (rows, campo) => rows.reduce((s, r) => s + r[campo], 0);

export function calcAmortizacaoExtra({ saldoDevedor, taxaMensal, parcelasRestantes, aporte, sistema }) {
  const isSAC = sistema === "SAC";
  const saldoNovo = saldoDevedor - aporte;

  // ── Cenário base: sem aporte, segue como está ──────────────────────────
  const baseSchedule = isSAC
    ? calcSACSchedule(saldoDevedor, taxaMensal, parcelasRestantes)
    : calcPriceSchedule(saldoDevedor, taxaMensal, parcelasRestantes);
  const parcelaOriginal = baseSchedule[0].parcela;
  const totalJurosBase = soma(baseSchedule, "juros");
  const totalPagoBase = soma(baseSchedule, "parcela");

  // ── Estratégia 1: Reduzir Prazo ─────────────────────────────────────────
  const e1Schedule = isSAC
    ? simularAmortFixa(saldoNovo, taxaMensal, saldoDevedor / parcelasRestantes)
    : simularPagamentoFixo(saldoNovo, taxaMensal, parcelaOriginal);
  const totalJurosE1 = soma(e1Schedule, "juros");
  const totalParcelasE1 = soma(e1Schedule, "parcela");
  const mesesE1 = e1Schedule.length;

  // ── Estratégia 2: Reduzir Parcela ───────────────────────────────────────
  const e2Schedule = isSAC
    ? calcSACSchedule(saldoNovo, taxaMensal, parcelasRestantes)
    : calcPriceSchedule(saldoNovo, taxaMensal, parcelasRestantes);
  const totalJurosE2 = soma(e2Schedule, "juros");
  const totalParcelasE2 = soma(e2Schedule, "parcela");
  const parcelaNovaE2 = e2Schedule[0].parcela;

  return {
    saldoNovo,
    parcelaOriginal,
    totalJurosBase,
    totalPagoBase,

    estrategia1: {
      nome: "Reduzir Prazo",
      schedule: e1Schedule,
      meses: mesesE1,
      mesesEconomizados: parcelasRestantes - mesesE1,
      totalJuros: totalJurosE1,
      totalPago: aporte + totalParcelasE1,
      jurosEconomizados: totalJurosBase - totalJurosE1,
    },

    estrategia2: {
      nome: "Reduzir Parcela",
      schedule: e2Schedule,
      meses: parcelasRestantes,
      parcelaNova: parcelaNovaE2,
      economiaMensal: parcelaOriginal - parcelaNovaE2,
      totalJuros: totalJurosE2,
      totalPago: aporte + totalParcelasE2,
      jurosEconomizados: totalJurosBase - totalJurosE2,
    },

    diferencaEntreEstrategias: totalJurosE2 - totalJurosE1,
  };
}
