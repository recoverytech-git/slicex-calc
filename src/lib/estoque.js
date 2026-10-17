import { supabase, supabaseConfigurado } from "./supabase";

/**
 * Repositório de veículos. Vendedor lê a view com campos básicos;
 * os demais perfis leem a tabela (o RLS decide o que cada um vê).
 * Sem Supabase configurado, nada é gravado e a função devolve erro claro.
 */
const SEM_BANCO = { error: { message: "Banco de dados não configurado. Nada foi salvo." } };
const COLUNAS_GESTAO = "id, modelo, placa, renavam, chassi, ano_fabricacao, ano_modelo, cor, quilometragem, status, preco_venda_pretendido, criado_em";
const COLUNAS_VENDEDOR = "id, modelo, ano_modelo, quilometragem, status, preco_venda_pretendido";

export const normalizar = (s) => String(s ?? "").replace(/[\s.-]/g, "").toUpperCase();

export async function listarVeiculos({ status = null, vendedor = false } = {}) {
  if (!supabaseConfigurado) return { data: [], ...SEM_BANCO };
  const tabela = vendedor ? "v_veiculos_vendedor" : "veiculos";
  let q = supabase.from(tabela).select(vendedor ? COLUNAS_VENDEDOR : COLUNAS_GESTAO);
  q = vendedor ? q.order("modelo") : q.order("criado_em", { ascending: false });
  if (status) q = q.eq("status", status);
  return q;
}

export async function buscarDuplicado({ placa, renavam, chassi }) {
  if (!supabaseConfigurado) return { data: null, ...SEM_BANCO };
  const filtros = [];
  if (placa) filtros.push(`placa.eq.${normalizar(placa)}`);
  if (renavam) filtros.push(`renavam.eq.${normalizar(renavam)}`);
  if (chassi) filtros.push(`chassi.eq.${normalizar(chassi)}`);
  if (!filtros.length) return { data: null };
  return supabase.from("veiculos").select("id, marca, modelo, placa").or(filtros.join(",")).limit(1).maybeSingle();
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

/** Exclui o veículo e suas fotos. As fotos do Storage são removidas antes, pelo cliente. */
export async function excluirVeiculo(id) {
  if (!supabaseConfigurado) return SEM_BANCO;
  const { data: fotos } = await supabase.from("veiculo_fotos").select("caminho_storage").eq("veiculo_id", id);
  const caminhos = (fotos ?? []).map((f) => f.caminho_storage);
  if (caminhos.length) {
    const { error: erroStorage } = await supabase.storage.from("veiculos-fotos").remove(caminhos);
    if (erroStorage) return { error: erroStorage };
  }
  return supabase.rpc("excluir_veiculo", { p_veiculo: id });
}

