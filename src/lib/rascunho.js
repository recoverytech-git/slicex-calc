import { useEffect, useState } from "react";

/**
 * Estado que sobrevive à navegação entre páginas (sessionStorage).
 * Use em TODO formulário. Campos em `ignorar` (ex.: senha) nunca são guardados.
 */
export function useRascunho(chave, inicial, { ignorar = [] } = {}) {
  const [valor, setValor] = useState(() => {
    try {
      const r = sessionStorage.getItem(chave);
      if (r === null) return inicial;
      const lido = JSON.parse(r);
      return lido && typeof lido === "object" && !Array.isArray(lido) ? { ...inicial, ...lido } : lido;
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try {
      let copia = valor;
      if (valor && typeof valor === "object" && !Array.isArray(valor) && ignorar.length) {
        copia = { ...valor };
        ignorar.forEach((k) => delete copia[k]);
      }
      sessionStorage.setItem(chave, JSON.stringify(copia));
    } catch { /* armazenamento indisponível */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, valor]);
  return [valor, setValor];
}

export function limparRascunho(chaves) {
  try { chaves.forEach((c) => sessionStorage.removeItem(c)); } catch { /* ignore */ }
}
