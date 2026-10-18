import { supabase, supabaseConfigurado } from "./supabase";

export const BUCKET_FOTOS = "veiculos-fotos";
export const MAX_FOTOS = 15;
export const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

/** Retorna a mensagem de erro do arquivo, ou null se for aceito. */
export function validarArquivo(file) {
  if (!TIPOS.includes(file.type)) return "Formato não aceito. Use JPG, PNG ou WebP.";
  if (file.size > MAX_BYTES) return "Foto acima de 8 MB.";
  return null;
}

/** Remove acentos e caracteres problemáticos do nome do arquivo. */
export const nomeSeguro = (n) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

/**
 * Envia fotos para o Storage e registra cada uma em veiculo_fotos.
 * O caminho começa pela organização: a policy do bucket só aceita essa pasta.
 * Se o registro falhar, o arquivo enviado é removido para não sobrar órfão.
 */
export async function enviarFotos({ organizacaoId, veiculoId, userId, arquivos, jaEnviadas = 0 }) {
  if (!supabaseConfigurado) return { error: { message: "Banco não configurado." }, enviados: [] };
  if (!organizacaoId) return { error: { message: "Sua conta não está vinculada a uma organização." }, enviados: [] };
  if (jaEnviadas + arquivos.length > MAX_FOTOS)
    return { error: { message: `Limite de ${MAX_FOTOS} fotos por veículo.` }, enviados: [] };

  const enviados = [];
  for (let i = 0; i < arquivos.length; i++) {
    const file = arquivos[i];
    const erro = validarArquivo(file);
    if (erro) return { error: { message: erro }, enviados };

    const caminho = `${organizacaoId}/${veiculoId}/${Date.now()}-${i}-${nomeSeguro(file.name)}`;
    const up = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, file, { contentType: file.type, upsert: false });
    if (up.error) return { error: up.error, enviados };

    const reg = await supabase.from("veiculo_fotos").insert({
      veiculo_id: veiculoId,
      caminho_storage: caminho,
      ordem_exibicao: jaEnviadas + i,
      enviado_por: userId,
    });
    if (reg.error) {
      await supabase.storage.from(BUCKET_FOTOS).remove([caminho]);
      return { error: reg.error, enviados };
    }
    enviados.push(caminho);
  }
  return { error: null, enviados };
}
