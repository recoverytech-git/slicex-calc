import { describe, it, expect } from "vitest";
import { calcPrice, calcSAC } from "../src/lib/financiamento.js";
import { calcPercentual } from "../src/lib/percentual.js";
import { calcDiferenca, calcResultado, MARGEM_REFERENCIA_PCT } from "../src/lib/calculaCar.js";
import { calcAmortizacaoExtra } from "../src/lib/amortizacao.js";

const soma = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
const r2 = (v) => Math.round(v * 100) / 100;

describe("Price (valores de referencia do Banco Central / telas de referencia)", () => {
  const rows = calcPrice(50000, 1.2, 48);
  it("parcela fixa de R$ 1.376,38", () => expect(r2(rows[0].parcela)).toBe(1376.38));
  it("juros totais de R$ 16.066,12", () => expect(r2(soma(rows, "juros"))).toBe(16066.12));
  it("saldo final zerado", () => expect(rows.at(-1).saldo).toBeCloseTo(0, 6));
  it("tem exatamente 48 parcelas", () => expect(rows).toHaveLength(48));
  it("amortizacao acumulada igual ao principal", () => expect(r2(soma(rows, "amortizacao"))).toBe(50000));
});

describe("SAC", () => {
  const rows = calcSAC(50000, 1.2, 48);
  it("1a parcela de R$ 1.641,67", () => expect(r2(rows[0].parcela)).toBe(1641.67));
  it("ultima parcela de R$ 1.054,17", () => expect(r2(rows[47].parcela)).toBe(1054.17));
  it("juros totais de R$ 14.700,00", () => expect(r2(soma(rows, "juros"))).toBe(14700));
  it("amortizacao constante", () => expect(r2(rows[0].amortizacao)).toBe(r2(rows[47].amortizacao)));
});

describe("Diferenca percentual", () => {
  it("100 -> 120 = +20%", () => expect(r2(calcPercentual(100, 120).variacaoAB)).toBe(20));
  it("divisao por zero retorna null, nao NaN", () => expect(calcPercentual(0, 50).variacaoAB).toBeNull());
});

describe("Calcula-Car", () => {
  it("FIPE 75.000 x compra 50.000 = R$ 25.000 e 33,33%", () => {
    const d = calcDiferenca(75000, 50000);
    expect(d.diferencaReais).toBe(25000);
    expect(r2(d.diferencaPercentual)).toBe(33.33);
    expect(d.abaixoDaMargem).toBe(false);
  });
  it("margem abaixo de 15% apenas sinaliza, nao bloqueia", () => {
    const d = calcDiferenca(75000, 68000);
    expect(d.abaixoDaMargem).toBe(true);
    expect(MARGEM_REFERENCIA_PCT).toBe(15);
  });
  it("capital proprio: investimento = compra + custos", () => {
    const custos = [{ valor: 2500 }, { valor: 850 }, { valor: 1200 }, { valor: 400 }];
    const r = calcResultado({ fipe: 75000, compra: 50000, custos, custoFinanceiro: 0, valorVenda: 75000 });
    expect(r.investimentoTotal).toBe(54950);
    expect(r.resultadoLiquido).toBe(20050);
  });
  it("financiamento: resultado liquido integra os juros reais do Price", () => {
    const juros = r2(soma(calcPrice(50000, 1.2, 48), "juros"));
    const custos = [{ valor: 4950 }];
    const r = calcResultado({ fipe: 75000, compra: 50000, custos, custoFinanceiro: juros, valorVenda: 75000 });
    expect(r2(r.investimentoTotal)).toBe(71016.12);
    expect(r2(r.resultadoLiquido)).toBe(3983.88);
  });
});

describe("Amortizacao extra", () => {
  it("aporte reduz o prazo no Price e gera economia de juros", () => {
    const r = calcAmortizacaoExtra({ saldoDevedor: 120000, taxaMensal: 1.2, parcelasRestantes: 48, aporte: 10000, sistema: "Price" });
    expect(r.estrategia1.meses).toBeLessThan(48);
    expect(r.estrategia2.meses).toBe(48);
    expect(r.estrategia2.parcelaNova).toBeLessThan(r.parcelaOriginal);
    expect(r.estrategia1.jurosEconomizados).toBeGreaterThan(0);
  });
});
