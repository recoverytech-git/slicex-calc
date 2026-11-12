import { describe, it, expect } from "vitest";
import { calcularResumo, agioVenda, resumoAgio, faturamento, contarParados } from "../src/lib/calculos";

// Tres veiculos que reproduzem os numeros da tela de estoque:
// FIPE 150.556,00; pretendido 154.208,00; capital 127.737,42 (faixa FIPE 30.408,00 a 65.747,00)
const itens = [
  { id: "a", status: "em_preparacao", valor_fipe: 30408, preco: 55900 },
  { id: "b", status: "disponivel", valor_fipe: 65747, preco: 70000 },
  { id: "c", status: "reservado", valor_fipe: 54401, preco: 28308 },
];
const extras = { a: { preco_compra: 50000 }, b: { preco_compra: 60000 }, c: { preco_compra: 17737.42 } };

describe("calcularResumo (estoque)", () => {
  const r = calcularResumo(itens, extras, {}, null, false);
  it("soma potenciais e conta unidades", () => {
    expect(r.total).toBe(3);
    expect(r.potFipe).toBeCloseTo(150556, 2);
    expect(r.potPret).toBeCloseTo(154208, 2);
  });
  it("lucro = potencial - capital (mesmo capital nas duas bases)", () => {
    expect(r.lucroFipe).toBeCloseTo(22818.58, 2);
    expect(r.lucroPret).toBeCloseTo(26470.58, 2);
  });
  it("margens em percentual", () => {
    expect(r.margemFipe).toBeCloseTo(15.16, 2);
    expect(r.margemPret).toBeCloseTo(17.17, 2);
  });
  it("faixa FIPE: ticket = (menor + maior) / 2", () => {
    expect(r.minFipe).toBe(30408);
    expect(r.maxFipe).toBe(65747);
    expect(r.ticketFipe).toBeCloseTo(48077.5, 2);
  });
  it("custos e juros entram no capital", () => {
    const comCusto = calcularResumo(itens, extras, { a: 1000 }, null, false);
    expect(comCusto.lucroFipe).toBeCloseTo(22818.58 - 1000, 2);
  });
  it("vendedor nao ve dados financeiros", () => {
    const v = calcularResumo(itens, extras, {}, null, true);
    expect(v.lucroFipe).toBeNull();
    expect(v.margemPret).toBeNull();
  });
});

describe("agio e desagio", () => {
  it("venda abaixo do pretendido gera deságio", () => {
    const a = agioVenda(52000, 55900);
    expect(a.reais).toBeCloseTo(-3900, 2);
    expect(a.pct).toBeCloseTo(-6.9767, 3);
  });
  it("media por venda", () => {
    const r = resumoAgio([
      { valor_venda: 52000, preco_venda_pretendido: 55900 },
      { valor_venda: 60000, preco_venda_pretendido: 58000 },
    ]);
    expect(r.total).toBeCloseTo(-3900 + 2000, 2);
    expect(r.mediaReais).toBeCloseTo(-950, 2);
    expect(r.mediaPct).toBeCloseTo((-6.9767 + 3.4483) / 2, 3);
  });
});

describe("faturamento bruto e liquido", () => {
  it("desconta despesas e descontos do liquido", () => {
    const f = faturamento([{ valor_venda: 52000, despesas_venda: 300, descontos: 500 }]);
    expect(f.bruto).toBe(52000);
    expect(f.liquido).toBe(51200);
  });
});

describe("veiculos parados por faixa", () => {
  it("conta quantos estao a partir de cada faixa", () => {
    const m = [{ dias_em_estoque: 10 }, { dias_em_estoque: 35 }, { dias_em_estoque: 70 }, { dias_em_estoque: 200 }, { dias_em_estoque: 400 }];
    const r = Object.fromEntries(contarParados(m).map((x) => [x.dias, x.quantidade]));
    expect(r).toEqual({ 30: 4, 60: 3, 90: 2, 180: 2, 360: 1 });
  });
});
