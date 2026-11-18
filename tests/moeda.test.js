import { describe, it, expect } from "vitest";
import { mascararReais, parseMoeda } from "../src/lib/moeda";

describe("mascara de reais na digitacao", () => {
  it("unidade, dezena, centena, milhar, milhão", () => {
    expect(mascararReais("5").exibicao).toBe("5");
    expect(mascararReais("50").exibicao).toBe("50");
    expect(mascararReais("500").exibicao).toBe("500");
    expect(mascararReais("5000").exibicao).toBe("5.000");
    expect(mascararReais("65000").exibicao).toBe("65.000");
    expect(mascararReais("1234567").exibicao).toBe("1.234.567");
  });
  it("centavos com virgula, ate 2 casas", () => {
    expect(mascararReais("65000,5").exibicao).toBe("65.000,5");
    expect(mascararReais("65000,50").exibicao).toBe("65.000,50");
    expect(mascararReais("65000,509").exibicao).toBe("65.000,50");
    expect(mascararReais(",").exibicao).toBe("0,");
  });
  it("remove zeros a esquerda e caracteres invalidos", () => {
    expect(mascararReais("0005").exibicao).toBe("5");
    expect(mascararReais("R$ 1a2b").exibicao).toBe("12");
  });
  it("valor numerico correto para o calculo", () => {
    expect(mascararReais("65.000,50").valor).toBe(65000.5);
    expect(mascararReais("65000").valor).toBe(65000);
    expect(mascararReais("").valor).toBe(0);
  });
  it("parseMoeda le o texto formatado", () => {
    expect(parseMoeda("65.000")).toBe(65000);
    expect(parseMoeda("65.000,50")).toBe(65000.5);
  });
});
