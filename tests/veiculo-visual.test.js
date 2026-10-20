import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync("public/calculadora-veiculo.html", "utf-8");

describe("pagina visual de detalhes do veiculo", () => {
  it("preenche com dados reais sem erro", async () => {
    const errors = [];
    const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
      beforeParse(w) { w.tailwind = { config: {} }; w.parent = w; w.postMessage = () => {}; w.console.error = (...a) => errors.push(a.join(" ")); } });
    const w = dom.window;
    w.dispatchEvent(new w.MessageEvent("message", { source: w, data: {
      type: "dados", gestao: true,
      veiculo: { modelo: "GOL MPI 1.0", placa: "SEB3I04", marca: "VOLKSVAGEM", ano_fabricacao: 2022, ano_modelo: 2023,
        quilometragem: 88000, cor: "CINZA", combustivel: "FLEX", cambio: "MANUAL", status: "disponivel",
        preco_compra: 46700, valor_fipe: 54401, preco_venda_pretendido: 54401, renavam: "1", chassi: "X" },
      fotos: [], custos: [{ descricao: "Pneus", valor: 2500 }], financiamento: null, vendas: [],
      checklist: { ipva_pago: true }, itensChecklist: [["ipva_pago", "IPVA pago"]], docLabels: {} } }));
    await new Promise(r => setTimeout(r, 50));
    expect(errors).toEqual([]);
    expect(w.document.querySelector("h1").textContent).toBe("GOL MPI 1.0");
    expect(w.document.body.textContent).toContain("Pneus");
    expect(w.document.body.textContent.replace(/\u00a0/g, " ")).toContain("R$ 2.500,00");
  });
});
