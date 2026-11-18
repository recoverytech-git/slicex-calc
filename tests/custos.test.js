import { describe, it, expect } from "vitest";
import { custoFixoMensal, analisarMeta, alertaExcesso } from "../src/lib/custos";

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
