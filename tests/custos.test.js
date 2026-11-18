import { describe, it, expect } from "vitest";
import { custoFixoMensal, analisarMeta, alertaExcesso, resumoEstoque, resumoReal } from "../src/lib/custos";

describe("custos recorrentes", () => {
  it("soma somente os custos ativos", () => {
    expect(custoFixoMensal([{ valor_mensal: 300 }, { valor_mensal: 150, ativo: false }, { valor_mensal: 50, ativo: true }])).toBe(350);
  });
});

describe("analise da meta de lucro", () => {
  it("dentro do esperado quando a margem cobre custos e meta", () => {
    const r = analisarMeta({ custoFixoMensal: 1000, vendas30: 10, margemMedia: 1500, meta: 4000 });
    expect(r.status).toBe("ok");
    expect(r.lucroLiquidoMes).toBe(14000);
    expect(r.excedente).toBe(15000 - 5000);
  });
  it("dentro do esperado quando a margem cobre custos e meta, com excedente", () => {
    const r = analisarMeta({ custoFixoMensal: 2000, vendas30: 4, margemMedia: 1500, precoMedio: 50000, meta: 3000 });
    expect(r.status).toBe("ok");
    expect(r.necessario).toBe(5000);
    expect(r.margemBrutaMes).toBe(6000);
    expect(r.excedente).toBe(1000);
  });
  it("calcula acrescimo de margem por carro quando a margem nao cobre", () => {
    const r = analisarMeta({ custoFixoMensal: 2000, vendas30: 2, margemMedia: 1000, precoMedio: 50000, meta: 4000 });
    expect(r.status).toBe("abaixo");
    expect(r.necessario).toBe(6000);
    expect(r.faltaTotal).toBe(4000);
    expect(r.acrescimoPorVeiculo).toBe(2000);
    expect(r.acrescimoPrecoPct).toBeCloseTo(0.04, 4);
    expect(r.veiculosNecessarios).toBe(6);
    expect(r.faltamVeiculos).toBe(4);
  });
  it("sem dados de margem nao calcula", () => {
    expect(analisarMeta({ custoFixoMensal: 100, vendas30: 0, margemMedia: 0, meta: 0 }).status).toBe("sem_dados");
  });
});

describe("alerta de excesso de custos", () => {
  it("sem excesso nao alerta", () => {
    expect(alertaExcesso({ custoFixoMensal: 1000, margemBrutaMes: 10000 })).toBeNull();
  });
  it("acima de 25% alerta em nivel medio, acima de 50% em alto", () => {
    expect(alertaExcesso({ custoFixoMensal: 3000, margemBrutaMes: 10000 }).nivel).toBe("medio");
    expect(alertaExcesso({ custoFixoMensal: 6000, margemBrutaMes: 10000 }).nivel).toBe("alto");
  });
  it("custo sem margem alerta", () => {
    expect(alertaExcesso({ custoFixoMensal: 500, margemBrutaMes: 0 }).nivel).toBe("alto");
  });
});

describe("base unica do estoque (indicadores = meta)", () => {
  const veiculos = [
    { id: "a", status: "disponivel", preco_compra: 40000, preco_venda_pretendido: 50000, valor_fipe: 48000 },
    { id: "b", status: "disponivel", preco_compra: 30000, preco_venda_pretendido: 36000, valor_fipe: 35000 },
    { id: "c", status: "vendido", preco_compra: 1, preco_venda_pretendido: 1, valor_fipe: 1 },
  ];
  const custosVeic = [{ veiculo_id: "a", valor: 1000 }];
  const fin = [{ veiculo_id: "b", total_juros: 2000 }];
  const metricas = [{ veiculo_id: "a", juros_diario_acumulado: 500 }];
  const r = resumoEstoque({ veiculos, custosVeic, fin, metricas });
  it("capital inclui compra, custos, juros do financiamento e juros acumulado; vendidos ficam de fora", () => {
    expect(r.total).toBe(2);
    expect(r.capital).toBe(40000 + 1000 + 500 + 30000 + 2000);
  });
  it("margem media do indicador e a mesma usada na meta (pretendido - capital, por veiculo)", () => {
    const margemIndividual = (50000 - 41500 + 36000 - 32000) / 2;
    expect(r.margemMedia).toBeCloseTo(margemIndividual, 6);
    expect(r.margemMedia).toBeCloseTo(r.lucroPret / r.total, 6);
  });
  it("realizado soma faturamento e resultado do periodo", () => {
    const x = resumoReal([{ valor_venda: 100, resultado_final: 30 }, { valor_venda: 300, resultado_final: 70 }]);
    expect(x.fat).toBe(400); expect(x.res).toBe(100); expect(x.margem).toBeCloseTo(25, 6); expect(x.ticket).toBe(200);
  });
});
