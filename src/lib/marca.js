import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "./supabase";

/** Marca da plataforma (logos e favicon), lida da tabela configuracoes. Cache por sessão. */
let cache = null;
let pendente = null;

export function carregarMarca() {
  if (cache) return Promise.resolve(cache);
  if (!supabaseConfigurado) return Promise.resolve({});
  if (!pendente) {
    pendente = supabase.from("configuracoes").select("chave, valor").then(({ data }) => {
      cache = Object.fromEntries((data ?? []).map((r) => [r.chave, r.valor]));
      pendente = null;
      return cache;
    });
  }
  return pendente;
}

export function limparCacheMarca() {
  cache = null;
  pendente = null;
}

export function useMarca() {
  const [marca, setMarca] = useState(cache ?? {});
  useEffect(() => {
    let vivo = true;
    carregarMarca().then((m) => { if (vivo) setMarca(m); });
    return () => { vivo = false; };
  }, []);
  return marca;
}
