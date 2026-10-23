import { describe, it, expect } from "vitest";
import { calcPrice, calcSAC } from "../src/lib/financiamento";

const casos = [[50000, 3.9, 12], [50000, 3.9, 48], [120000, 1.2, 60]];

describe("tabela Price", () => {
  for (const [pv, taxa, n] of casos) {
    it(`parcela constante, juros sobre saldo e quitacao: ${pv} a ${taxa}% em ${n}x`, () => {
      const r = calcPrice(pv, taxa, n);
      const i = taxa / 100;
      expect(r).toHaveLength(n);
      expect(r[n - 1].saldo).toBeCloseTo(0, 6);
      expect(r.reduce((a, x) => a + x.amortizacao, 0)).toBeCloseTo(pv, 4);
      r.forEach((x, k) => {
        const anterior = k === 0 ? pv : r[k - 1].saldo;
        expect(x.juros).toBeCloseTo(anterior * i, 6);
        expect(x.parcela).toBeCloseTo(r[0].parcela, 6);
      });
    });
  }
});

describe("tabela SAC", () => {
  for (const [pv, taxa, n] of casos) {
    it(`amortizacao fixa, juros sobre saldo e quitacao: ${pv} a ${taxa}% em ${n}x`, () => {
      const r = calcSAC(pv, taxa, n);
      const i = taxa / 100;
      expect(r).toHaveLength(n);
      expect(r[n - 1].saldo).toBeCloseTo(0, 6);
      r.forEach((x, k) => {
        const anterior = k === 0 ? pv : r[k - 1].saldo;
        expect(x.amortizacao).toBeCloseTo(pv / n, 6);
        expect(x.juros).toBeCloseTo(anterior * i, 6);
        expect(x.parcela).toBeCloseTo(x.amortizacao + x.juros, 6);
      });
    });
  }
});
