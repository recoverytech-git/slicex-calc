import { useEffect, useState } from "react";

/**
 * Estado que sobrevive à navegação entre páginas (sessionStorage).
 * Evita perder o formulário ao abrir outra página e voltar.
 */
export function useRascunho(chave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const r = sessionStorage.getItem(chave);
      return r === null ? inicial : JSON.parse(r);
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(chave, JSON.stringify(valor)); } catch { /* armazenamento indisponível */ }
  }, [chave, valor]);
  return [valor, setValor];
}

export function limparRascunho(chaves) {
  try { chaves.forEach((c) => sessionStorage.removeItem(c)); } catch { /* ignore */ }
}
