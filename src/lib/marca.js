import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "./supabase";

/**
 * Marca da plataforma (logos e favicon), lida da tabela configuracoes.
 * Atualizada ao vivo: quando uma imagem é trocada, todas as telas recebem o novo valor.
 */
let cache = null;
let pendente = null;
const ouvintes = new Set();

function notificar() { ouvintes.forEach((f) => f(cache ?? {})); }

export function carregarMarca(forcar = false) {
  if (cache && !forcar) return Promise.resolve(cache);
  if (!supabaseConfigurado) return Promise.resolve({});
  if (!pendente) {
    pendente = supabase.from("configuracoes").select("chave, valor").then(({ data, error }) => {
      pendente = null;
      if (error) return cache ?? {};
      cache = Object.fromEntries((data ?? []).map((r) => [r.chave, r.valor]));
      notificar();
      return cache;
    });
  }
  return pendente;
}

/** Atualiza um valor já gravado e avisa todas as telas. */
export function atualizarMarca(chave, valor) {
  cache = { ...(cache ?? {}), [chave]: valor };
  notificar();
}

export function useMarca() {
  const [marca, setMarca] = useState(cache ?? {});
  useEffect(() => {
    const f = (v) => setMarca(v);
    ouvintes.add(f);
    carregarMarca().then((m) => setMarca(m));
    return () => ouvintes.delete(f);
  }, []);
  return marca;
}
