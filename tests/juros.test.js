import { describe, it, expect } from "vitest";
import { regraJuros, jurosPorDias, diasEntre, validarDataVenda } from "../src/lib/juros";

const fin1 = { quantidade_parcelas: 1, total_juros: 3900 };
const aq = "2026-10-09";

describe("dias entre datas", () => {
  it("09/10 ate 09/11 sao 31 dias", () => {
    expect(diasEntre(aq, "2026-11-09")).toBe(31);
  });
  it("sem fuso: data AAAA-MM-DD fica no mesmo dia", () => {
    expect(diasEntre("2026-10-09", "2026-10-09")).toBe(0);
  });
});

describe("venda antes e depois de 30 dias", () => {
  it("dia 1: juros do mes x 1/30", () => {
    expect(jurosPorDias(3900, 1)).toBeCloseTo(130, 2);
  });
  it("dia 30: juros do mes inteiro", () => {
    expect(jurosPorDias(3900, 30)).toBeCloseTo(3900, 2);
  });
  it("dia 31: juros do mes + 1 dia adicional", () => {
    expect(jurosPorDias(3900, 31)).toBeCloseTo(4030, 2);
  });
  it("caso do Polo: 09/10 -> 09/11 gera 1 dia adicional", () => {
    const r = regraJuros({ financiamento: fin1, aquisicao: aq, venda: "2026-11-09" });
    expect(r.dias).toBe(31);
    expect(r.total).toBeCloseTo(4030, 2);
    expect(r.ajuste).toBeCloseTo(130, 2);
  });
  it("venda antecipada: cobra so os dias usados", () => {
    const r = regraJuros({ financiamento: fin1, aquisicao: aq, venda: "2026-10-19" });
    expect(r.dias).toBe(10);
    expect(r.total).toBeCloseTo(1300, 2);
    expect(r.ajuste).toBeCloseTo(-2600, 2);
  });
});

describe("sem venda: conta ate hoje", () => {
  it("14/11 sem baixa: 36 dias, 6 dias de juros adicionais", () => {
    const r = regraJuros({ financiamento: fin1, aquisicao: aq, hoje: new Date(2026, 10, 14) });
    expect(r.dias).toBe(36);
    expect(r.cobrados).toBe(6);
    expect(r.acumulado).toBeCloseTo(780, 2);
    expect(r.total).toBeCloseTo(4680, 2);
  });
});

describe("outros casos", () => {
  it("sem financiamento nao aplica", () => {
    expect(regraJuros({ financiamento: null, aquisicao: aq }).aplica).toBe(false);
  });
  it("mais de 1 parcela nao aplica a regra e mantem o juros contratado", () => {
    const r = regraJuros({ financiamento: { quantidade_parcelas: 12, total_juros: 5000 }, aquisicao: aq, venda: "2026-10-19" });
    expect(r.aplica).toBe(false);
    expect(r.total).toBe(5000);
  });
});

describe("validacao da data da venda", () => {
  const hoje = new Date(2026, 10, 14);
  it("rejeita data futura", () => {
    expect(validarDataVenda(new Date(2026, 10, 20), aq, hoje)).toMatch(/futura/);
  });
  it("rejeita data anterior a aquisicao", () => {
    expect(validarDataVenda(new Date(2026, 9, 1), aq, hoje)).toMatch(/anterior/);
  });
  it("aceita data entre aquisicao e hoje", () => {
    expect(validarDataVenda(new Date(2026, 10, 9), aq, hoje)).toBeNull();
  });
});
