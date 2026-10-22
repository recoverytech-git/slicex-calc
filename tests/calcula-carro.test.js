import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync("public/calculadora-carro.html", "utf-8");

describe("ponte do design do Calcula-Car", () => {
  it("liga os campos das secoes 1 e 2 e recebe o estado sem erros", async () => {
    const erros = [];
    const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
      beforeParse(w) { w.tailwind = { config: {} }; w.parent = w; w.postMessage = () => {}; w.console.error = (...a) => erros.push(a.join(" ")); } });
    const w = dom.window;
    await new Promise((r) => setTimeout(r, 30));
    expect(w.document.querySelector('[data-k="placa"]')).not.toBeNull();
    expect(w.document.querySelector('[data-k="fipeStr"]')).not.toBeNull();
    expect(w.document.querySelector('[data-k="vendaStr"]')).not.toBeNull();
    w.dispatchEvent(new w.MessageEvent("message", { source: w, data: { type: "estado",
      campos: { placa: "ABC1D23", fipeStr: "75000", compraStr: "50000", vendaStr: "70000" },
      analise: { diferencaReais: "R$ 25.000,00", diferencaPct: "33.33%", margemRef: "15%" } } }));
    await new Promise((r) => setTimeout(r, 10));
    expect(w.document.querySelector('[data-k="placa"]').value).toBe("ABC1D23");
    expect(w.document.querySelector('[data-k="fipeStr"]').value).toBe("75000");
    expect(w.document.body.textContent).toContain("R$ 25.000,00");
    expect(erros.filter((e) => /sistema-carro|ponte/.test(e))).toEqual([]);
  });
});
