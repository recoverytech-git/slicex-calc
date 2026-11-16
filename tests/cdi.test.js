import { describe, it, expect } from "vitest";
import { taxaMensalDeAnual, situacaoCdi } from "../src/lib/cdi";

describe("CDI como custo de oportunidade", () => {
  it("converte CDI anual para mensal equivalente", () => {
    expect(taxaMensalDeAnual(14.65)).toBeCloseTo(0.01147, 4);
  });
  it("sem valor retorna nulo", () => {
    expect(taxaMensalDeAnual(0)).toBeNull();
    expect(taxaMensalDeAnual(undefined)).toBeNull();
  });
  it("indicador ausente avisa indisponivel", () => {
    expect(situacaoCdi(null).ok).toBe(false);
  });
  it("indicador antigo avisa desatualizado", () => {
    const hoje = new Date(2026, 10, 14);
    const r = situacaoCdi({ valor: 14.65, atualizado_em: new Date(2026, 10, 1) }, hoje);
    expect(r.ok).toBe(false);
    expect(r.aviso).toMatch(/desatualizado/);
  });
  it("indicador recente esta ok", () => {
    const hoje = new Date(2026, 10, 14);
    expect(situacaoCdi({ valor: 14.65, atualizado_em: new Date(2026, 10, 13) }, hoje).ok).toBe(true);
  });
});
