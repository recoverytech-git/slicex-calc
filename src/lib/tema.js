import { useEffect, useState } from "react";

/** Tema claro/escuro. Escuro é o padrão; a escolha do usuário fica salva no navegador. */
const CHAVE = "slicex-tema";
let tema = "dark";
try { tema = localStorage.getItem(CHAVE) === "light" ? "light" : "dark"; } catch { /* sem armazenamento */ }
const ouvintes = new Set();

function aplicar(t) {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
}

export function iniciarTema() { aplicar(tema); }

export function definirTema(t) {
  tema = t === "light" ? "light" : "dark";
  try { localStorage.setItem(CHAVE, tema); } catch { /* sem armazenamento */ }
  aplicar(tema);
  ouvintes.forEach((f) => f(tema));
}

export function useTema() {
  const [atual, setAtual] = useState(tema);
  useEffect(() => {
    const f = (v) => setAtual(v);
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  }, []);
  return [atual, definirTema];
}
