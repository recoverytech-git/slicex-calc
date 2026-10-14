import { describe, it, expect } from "vitest";
import { validarArquivo, nomeSeguro, MAX_BYTES } from "../src/lib/fotos.js";

describe("fotos: validação", () => {
  it("aceita JPG, PNG e WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(validarArquivo({ type, size: 1000 })).toBeNull();
  });
  it("recusa outros formatos", () => expect(validarArquivo({ type: "application/pdf", size: 10 })).toMatch(/Formato/));
  it("recusa arquivo acima de 8 MB", () => expect(validarArquivo({ type: "image/jpeg", size: MAX_BYTES + 1 })).toMatch(/8 MB/));
  it("nome seguro remove acento e espaço", () => expect(nomeSeguro("Foto frente ção.jpg")).toBe("Foto_frente_cao.jpg"));
});
