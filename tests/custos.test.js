import { describe, it, expect } from "vitest";
import { custoFixoMensal, mapaCapital, resumoEstoque, vendasPeriodo, resumoVendas, planoMeta, alertaExcesso } from "../src/lib/custos";

describe("custos recorrentes", () => {
  it("soma somente os custos ativos", () => {
    expect(custoFixoMensal([{ valor_mensal: 300 }, { valor_mensal: 150, ativo: false }, { valor_mensal: 50, ativo: true }])).toBe(350);
  });
});

describe("capital e estoque (igual a tela Estoque)", () => {
  const veiculos = [
    { id: "a", status: "disponivel", preco_compra: 40000, preco_venda_pretendido: 50000, valor_fipe: 48000 },
    { id: "b", status: "disponivel", preco_compra: 30000, preco_venda_pretendido: 36000, valor_fipe: 35000 },
    { id: "c", status: "vendido", preco_compra: 1, preco_venda_pretendido: 1, valor_fipe: 1 },
  ];
  const custosVeic = [{ veiculo_id: "a", valor: 1000 }];
  const fin = [{ veiculo_id: "b", total_juros: 2000 }];
  const metricas = [{ veiculo_id: "a", juros_diario_acumulado: 500 }];
  it("capital = compra + custos + juros do financiamento + juros acumulado", () => {
    const m = mapaCapital({ veiculos, custosVeic, fin, metricas });
    expect(m.a.capital).toBe(41500);
    expect(m.b.capital).toBe(32000);
  });
  it("indicadores do estoque excluem vendidos", () => {
    const r = resumoEstoque({ veiculos, custosVeic, fin, metricas });
    expect(r.total).toBe(2);
    expect(r.capital).toBe(73500);
    expect(r.potPret).toBe(86000);
    expect(r.lucroPret).toBe(12500);
    expect(r.lucroFipe).toBe(83000 - 73500);
  });
});

describe("vendas reais", () => {
  const vendas = [
    { data_venda: "2026-11-08", valor_venda: 65000, resultado_final: 8235.74 },
    { data_venda: "2026-08-24", valor_venda: 67000, resultado_final: 5679.48 },
  ];
  it("filtra pelo periodo e soma valores reais", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const recentes = vendasPeriodo(vendas.map((v) => ({ ...v, data_venda: hoje })), 30);
    expect(recentes.length).toBe(2);
    const r = resumoVendas(recentes);
    expect(r.fat).toBe(132000);
    expect(r.res).toBeCloseTo(13915.22, 2);
  });
});

describe("plano da meta com veiculos reais", () => {
  const estoque = [
    { id: "x", modelo: "A", resultado: 5000 },
    { id: "y", modelo: "B", resultado: 2000 },
    { id: "z", modelo: "C", resultado: -1000 },
  ];
  it("escolhe os maiores resultados reais ate atingir a meta", () => {
    const p = planoMeta({ meta: 3000, fixo: 1000, realizadoMes: 0, veiculos: estoque });
    expect(p.atingivel).toBe(true);
    expect(p.escolhidos.map((v) => v.id)).toEqual(["x"]);
    expect(p.lucroComEstoque).toBe(4000);
  });
  it("sem veiculos suficientes, informa o que falta", () => {
    const p = planoMeta({ meta: 100000, fixo: 1000, realizadoMes: 0, veiculos: estoque });
    expect(p.atingivel).toBe(false);
    expect(p.totalEstoque).toBe(7000);
    expect(p.falta).toBe(100000 - (7000 - 1000));
  });
  it("realizado no mes ja cobre a meta: nenhum veiculo necessario", () => {
    const p = planoMeta({ meta: 1000, fixo: 500, realizadoMes: 5000, veiculos: estoque });
    expect(p.atingivel).toBe(true);
    expect(p.escolhidos).toEqual([]);
  });
});

describe("alerta de excesso de custos", () => {
  it("sem excesso nao alerta", () => {
    expect(alertaExcesso({ custoFixoMensal: 1000, resultadoLiquidoMes: 10000 })).toBeNull();
  });
  it("acima de 25% alerta em nivel medio, acima de 50% em alto", () => {
    expect(alertaExcesso({ custoFixoMensal: 3000, resultadoLiquidoMes: 10000 }).nivel).toBe("medio");
    expect(alertaExcesso({ custoFixoMensal: 6000, resultadoLiquidoMes: 10000 }).nivel).toBe("alto");
  });
});
