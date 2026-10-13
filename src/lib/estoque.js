import { supabase, supabaseConfigurado } from "./supabase";

/**
 * Repositório de veículos (estoque). Toda persistência passa por aqui.
 * Sem Supabase configurado, nada é gravado: as funções retornam erro claro,
 * em vez de fingir que salvaram (regra: não declarar sucesso sem persistir).
 */

const SEM_BANCO = { error: { message: "Banco de dados não configurado. Nada foi salvo." } };

/** Normaliza placa/RENAVAM/chassi para comparação (sem espaços, maiúsculas). */
export const normalizar = (s) => String(s ?? "").replace(/[\s.-]/g, "").toUpperCase();

export async function listarVeiculos({ busca = "", status = null } = {}) {
  if (!supabaseConfigurado) return { data: [], ...SEM_BANCO };
  let q = supabase.from("veiculos").select("id, modelo, placa, renavam, chassi, ano_fabricacao, ano_modelo, cor, quilometragem, status, preco_venda_pretendido, criado_em").order("criado_em", { ascending: false });
  if (status) q = q.eq("status", status);
  if (busca) {
    const b = normalizar(busca);
    q = q.or(`placa.ilike.%${b}%,renavam.ilike.%${b}%,chassi.ilike.%${b}%,modelo.ilike.%${busca}%`);
  }
  return q;
}

export async function buscarDuplicado({ placa, renavam, chassi }) {
  if (!supabaseConfigurado) return { data: null, ...SEM_BANCO };
  const filtros = [];
  if (placa) filtros.push(`placa.eq.${normalizar(placa)}`);
  if (renavam) filtros.push(`renavam.eq.${normalizar(renavam)}`);
  if (chassi) filtros.push(`chassi.eq.${normalizar(chassi)}`);
  if (!filtros.length) return { data: null };
  return supabase.from("veiculos").select("id, modelo, placa").or(filtros.join(",")).limit(1).maybeSingle();
}

export async function salvarVeiculo(dados) {
  if (!supabaseConfigurado) return SEM_BANCO;
  const linha = {
    ...dados,
    placa: dados.placa ? normalizar(dados.placa) : null,
    renavam: dados.renavam ? normalizar(dados.renavam) : null,
    chassi: dados.chassi ? normalizar(dados.chassi) : null,
  };
  return supabase.from("veiculos").insert(linha).select().single();
}
