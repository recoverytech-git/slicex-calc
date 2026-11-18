import { describe, it, expect } from "vitest";
import { filtrarCatalogo, opcoesFiltro } from "../src/lib/catalogo";
import { camposPublicos } from "../api/catalogo.mjs";

const lista = [
  { id: "1", modelo: "GOL MPI 1.0", ano_modelo: 2023, preco_venda_pretendido: 55900, combustivel: "Flex", cambio: "Manual", cor: "Prata", cidade: "Goiânia" },
  { id: "2", modelo: "COROLLA XEi", ano_modelo: 2022, preco_venda_pretendido: 120000, combustivel: "Flex", cambio: "Automático", cor: "Preto", cidade: "Anápolis" },
];

describe("filtros do catalogo", () => {
  it("busca por modelo, cor ou cidade", () => {
    expect(filtrarCatalogo(lista, { busca: "corolla" }).map((v) => v.id)).toEqual(["2"]);
    expect(filtrarCatalogo(lista, { busca: "goiânia" }).map((v) => v.id)).toEqual(["1"]);
  });
  it("busca pela marca e pela loja (marketplace)", () => {
    const m = [{ id: "a", marca: "Volkswagen", modelo: "GOL", loja_nome: "Auto Silva" }, { id: "b", marca: "Toyota", modelo: "COROLLA", loja_nome: "Centro Motors" }];
    expect(filtrarCatalogo(m, { busca: "toyota" }).map((v) => v.id)).toEqual(["b"]);
    expect(filtrarCatalogo(m, { busca: "silva" }).map((v) => v.id)).toEqual(["a"]);
  });
  it("faixa de preco e ano", () => {
    expect(filtrarCatalogo(lista, { precoMax: 60000 }).map((v) => v.id)).toEqual(["1"]);
    expect(filtrarCatalogo(lista, { anoMin: 2023 }).map((v) => v.id)).toEqual(["1"]);
  });
  it("cambio e combustivel", () => {
    expect(filtrarCatalogo(lista, { cambio: "Automático" }).map((v) => v.id)).toEqual(["2"]);
    expect(filtrarCatalogo(lista, { combustivel: "Flex" }).length).toBe(2);
  });
  it("opcoes vem da lista liberada", () => {
    const o = opcoesFiltro(lista);
    expect(o.anos).toEqual([2023, 2022]);
    expect(o.cambios).toEqual(["Automático", "Manual"]);
  });
});

describe("privacidade do catalogo publico", () => {
  const completo = { id: "1", modelo: "GOL", placa: "ABC1D23", mostrar_placa: false, custos: 500, juros_total: 3900, preco_compra: 40000, organizacao_id: "x", valor_fipe: 52000, preco_venda_pretendido: 55900 };
  it("nunca expoe custos, juros, compra, FIPE, organizacao ou placa", () => {
    const p = camposPublicos(completo);
    for (const proibido of ["custos", "juros_total", "preco_compra", "valor_fipe", "organizacao_id", "placa", "mostrar_placa"]) {
      expect(p).not.toHaveProperty(proibido);
    }
    expect(p.preco_venda_pretendido).toBe(55900);
  });
  it("placa so aparece quando a loja libera", () => {
    expect(camposPublicos({ ...completo, mostrar_placa: true }).placa).toBe("ABC1D23");
  });
});

describe("informacao adicional", () => {
  it("so aparece quando a loja ativa", () => {
    const base = { id: "1", modelo: "GOL", info_adicional: "Único dono, revisões em dia", mostrar_info_adicional: false };
    expect(camposPublicos(base)).not.toHaveProperty("info_adicional");
    expect(camposPublicos({ ...base, mostrar_info_adicional: true }).info_adicional).toBe("Único dono, revisões em dia");
  });
});
