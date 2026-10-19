import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { AuthProvider } from "../src/lib/auth";
import Landing from "../src/pages/Landing";
import Login from "../src/pages/Login";

describe("paginas publicas renderizam", () => {
  it("landing monta sem erro", () => {
    const html = renderToString(h(MemoryRouter, null, h(Landing)));
    expect(html).toContain("Saiba quanto");
  });
  it("login monta sem erro", () => {
    const html = renderToString(h(MemoryRouter, null, h(AuthProvider, null, h(Login))));
    expect(html).toContain("Entrar");
  });
});
