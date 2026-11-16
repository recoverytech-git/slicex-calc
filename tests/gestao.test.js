import { describe, it, expect } from "vitest";
import { familiaModelo, motorModelo, comparaveis, faixaSugerida } from "../src/lib/precificacao";
import { riscosVeiculo } from "../src/lib/riscos";
import { prioridadeVenda } from "../src/lib/prioridade";
import { sugerirReducao, curvaPreco } from "../src/lib/reprecificacao";
import { compararAVistaFinanciado } from "../src/lib/decisao";

const vendas = [
  { modelo: "GOL MPI 1.0", ano_modelo: 2022, valor_venda: 40000, preco_venda_pretendido: 42000 },
  { modelo: "GOL MPI 1.0", ano_modelo: 2022, valor_venda: 41000, preco_venda_pretendido: 42000 },
  { modelo: "GOL MPI 1.0", ano_modelo: 2023, valor_venda: 43000, preco_venda_pretendido: 44000 },
  { modelo: "GOL 1.6 POWER", ano_modelo: 2009, valor_venda: 20000, preco_venda_pretendido: 22000 },
  { modelo: "COROLLA XEi", ano_modelo: 2022, valor_venda: 120000, preco_venda_pretendido: 118000 },
];

describe("precificacao por modelo", () => {
  it("familia ignora acentos e pega a primeira palavra", () => {
    expect(familiaModelo("Gol MPI 1.0")).toBe("GOL");
    expect(familiaModelo("Corolla XEi")).toBe("COROLLA");
  });
  it("motor e lido do nome", () => {
    expect(motorModelo("GOL MPI 1.0")).toBe("1.0");
    expect(motorModelo("GOL 1.6 POWER")).toBe("1.6");
  });
  it("usa o mesmo motor quando ha 3 ou mais comparaveis", () => {
    const alvo = { modelo: "GOL MPI 1.0", ano_modelo: 2022, preco_venda_pretendido: 50000 };
    const r = comparaveis(alvo, vendas);
    expect(r.lista.length).toBe(3);
    expect(r.lista.every((v) => motorModelo(v.modelo) === "1.0")).toBe(true);
  });
  it("gol 1.6 de 2009 nao entra na faixa do gol 1.0 de 2022", () => {
    const alvo = { modelo: "GOL MPI 1.0", ano_modelo: 2022, preco_venda_pretendido: 50000 };
    expect(comparaveis(alvo, vendas).lista.some((v) => v.ano_modelo === 2009)).toBe(false);
  });
  it("faixa aplica a razao media ao pretendido do veiculo", () => {
    const alvo = { modelo: "GOL MPI 1.0", ano_modelo: 2022, preco_venda_pretendido: 50000 };
    const f = faixaSugerida(alvo, vendas);
    expect(f.n).toBe(3);
    expect(f.esperado).toBeCloseTo(50000 * ((40000 / 42000 + 41000 / 42000 + 43000 / 44000) / 3), 2);
  });
  it("sem comparaveis informa o aviso", () => {
    expect(faixaSugerida({ modelo: "XYZ", ano_modelo: 2020, preco_venda_pretendido: 1 }, vendas).n).toBe(0);
  });
});

describe("riscos por veiculo", () => {
  const hoje = new Date(2026, 10, 14);
  it("margem negativa e alerta alto", () => {
    const r = riscosVeiculo({ preco_venda_pretendido: 100, capital: 120, juros_acumulado: 0, fipe_atualizada_em: hoje, hoje });
    expect(r.some((x) => x.tipo === "margem_negativa" && x.nivel === "alto")).toBe(true);
  });
  it("juros acima de 5% do preco alerta", () => {
    const r = riscosVeiculo({ preco_venda_pretendido: 100000, capital: 50000, juros_acumulado: 6000, fipe_atualizada_em: hoje, hoje });
    expect(r.some((x) => x.tipo === "juros_alto")).toBe(true);
  });
  it("FIPE com mais de 30 dias alerta", () => {
    const antiga = new Date(2026, 9, 1);
    const r = riscosVeiculo({ preco_venda_pretendido: 100000, capital: 50000, juros_acumulado: 0, fipe_atualizada_em: antiga, hoje });
    expect(r.some((x) => x.tipo === "fipe_antiga")).toBe(true);
  });
  it("veiculo saudavel nao gera alertas", () => {
    expect(riscosVeiculo({ preco_venda_pretendido: 100000, capital: 50000, juros_acumulado: 100, fipe_atualizada_em: hoje, hoje })).toEqual([]);
  });
});

describe("prioridade de venda", () => {
  it("ordena pelo custo de carregamento acumulado", () => {
    const r = prioridadeVenda([
      { id: "a", capital: 100000, dias: 10, juros_acumulado: 0, pret: 120000 },
      { id: "b", capital: 100000, dias: 90, juros_acumulado: 3000, pret: 115000 },
    ]);
    expect(r[0].id).toBe("b");
  });
});

describe("reprecificacao", () => {
  it("nao sugere reducao antes de 60 dias", () => {
    expect(sugerirReducao({ dias: 45, capital: 100000, preco: 120000 })).toBeNull();
  });
  it("sugere reducao a partir de 60 dias, sem ir abaixo da margem minima", () => {
    const s = sugerirReducao({ dias: 61, capital: 100000, preco: 120000 });
    expect(s.precoSugerido).toBeCloseTo(120000 * 0.97, 2);
    const limite = sugerirReducao({ dias: 400, capital: 100000, preco: 106000 });
    expect(limite.precoSugerido).toBeCloseTo(105000, 2);
  });
  it("curva de preco fica em ordem cronologica", () => {
    const c = curvaPreco([
      { valor_novo: "120000", alterado_em: "2026-10-05" },
      { valor_novo: "130000", alterado_em: "2026-09-01" },
    ]);
    expect(c.map((x) => x.valor)).toEqual([130000, 120000]);
  });
});

describe("simulador a vista x financiado", () => {
  it("1 parcela: juros = saldo x taxa, como no Calcula-Car", () => {
    const r = compararAVistaFinanciado({ compra: 100000, custos: 2000, pretendido: 120000, entrada: 0, taxaMensal: 3.9, prazo: 1 });
    expect(r.financiado.juros).toBeCloseTo(3900, 2);
    expect(r.avista.lucro).toBeCloseTo(18000, 2);
    expect(r.financiado.lucro).toBeCloseTo(14100, 2);
  });
  it("entrada reduz o juros", () => {
    const sem = compararAVistaFinanciado({ compra: 100000, pretendido: 120000, taxaMensal: 3.9, prazo: 1 });
    const com = compararAVistaFinanciado({ compra: 100000, pretendido: 120000, entrada: 50000, taxaMensal: 3.9, prazo: 1 });
    expect(com.financiado.juros).toBeLessThan(sem.financiado.juros);
  });
  it("a vista ganha quando o juros supera a diferenca do preco", () => {
    const r = compararAVistaFinanciado({ compra: 100000, pretendido: 101000, taxaMensal: 3.9, prazo: 1 });
    expect(r.melhor).toBe("avista");
  });
});
