import { describe, it, expect } from "vitest";
import { limparBusca } from "../api/marketplace.mjs";
import { montarHtml, esc } from "../api/seo.mjs";

const modelo = '<!doctype html><html><head><title>x</title><meta name="description" content="antiga" /></head><body><div id="root"></div></body></html>';

describe("busca do marketplace", () => {
  it("remove caracteres que quebrariam a consulta", () => {
    expect(limparBusca("gol, (x)*\"y\"")).toBe("gol xy");
    expect(limparBusca("  Volkswagen  ")).toBe("Volkswagen");
  });
  it("aceita acentos e numeros", () => {
    expect(limparBusca("Citroën C3 1.6")).toBe("Citroën C3 1.6");
  });
});

describe("paginas com HTML pronto (SEO)", () => {
  it("escapa caracteres perigosos", () => {
    expect(esc("<script>\"a\" & 'b'</script>")).toBe("&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;");
  });
  it("monta titulo, descricao, canonical e conteudo no root", () => {
    const h = montarHtml(modelo, { titulo: "GOL 2023 | Calcula.car", descricao: "Desc", canonical: "https://x/marketplace", corpo: "<h1>Olá</h1>" });
    expect(h).toContain("<title>GOL 2023 | Calcula.car</title>");
    expect(h).toContain('<link rel="canonical" href="https://x/marketplace" />');
    expect(h).toContain('<meta name="description" content="Desc" />');
    expect(h).toContain('<div id="root"><h1>Olá</h1></div>');
    expect(h).not.toContain('content="antiga"');
  });
  it("dados estruturados nao permitem fechar a tag script", () => {
    const h = montarHtml(modelo, { titulo: "t", descricao: "d", canonical: "c", ld: { name: "</script><b>x" }, corpo: "" });
    const bloco = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    expect(bloco).not.toContain("</script>");
    expect(JSON.parse(bloco).name).toBe("</script><b>x");
  });
  it("paginas sem indexacao recebem noindex", () => {
    expect(montarHtml(modelo, { titulo: "t", descricao: "d", canonical: "c", indexar: false, corpo: "" })).toContain('name="robots" content="noindex"');
  });
});
