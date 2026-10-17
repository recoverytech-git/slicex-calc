// Padrão do projeto: qualquer página com formulário guarda o que foi digitado ao navegar.
// Para ser excluída, a página precisa declarar o motivo com o marcador "sem-rascunho:".
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const pastaPaginas = join(process.cwd(), "src/pages");

describe("padrão de formulários nas páginas", () => {
  for (const arquivo of readdirSync(pastaPaginas).filter((f) => f.endsWith(".jsx"))) {
    it(`${arquivo} guarda o rascunho ao navegar`, () => {
      const codigo = readFileSync(join(pastaPaginas, arquivo), "utf8");
      if (!codigo.includes("useState(")) return;
      expect(codigo.includes("useRascunho") || codigo.includes("sem-rascunho:")).toBe(true);
    });
  }
});
