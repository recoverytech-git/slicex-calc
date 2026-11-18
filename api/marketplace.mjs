// Marketplace geral: veiculos de todas as lojas que ativaram a opcao (opt-in).
// Mesma regra de privacidade do catalogo: somente campos liberados; fotos com link temporario.
import { camposPublicos } from './catalogo.mjs';

const STATUS_VISIVEIS = 'disponivel,reservado,em_preparacao';
const LIMITE = 300;

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(500).json({ erro: 'configuração ausente' });
  const h = { apikey: key, Authorization: `Bearer ${key}` };

  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?marketplace_ativo=eq.true&ativa=eq.true&select=id,nome,slug`, { headers: h })).json();
  if (!Array.isArray(orgs)) return res.status(502).json({ erro: 'falha ao consultar', detalhe: orgs?.message || 'sem detalhe' });
  if (!orgs.length) return res.status(200).json({ lojas: [], veiculos: [] });

  const porOrg = Object.fromEntries(orgs.map((o) => [o.id, o]));
  const ids = orgs.map((o) => o.id).join(',');
  const vs = await (await fetch(`${url}/rest/v1/veiculos?organizacao_id=in.(${ids})&publicado_catalogo=eq.true&status=in.(${STATUS_VISIVEIS})&select=id,organizacao_id,marca,modelo,ano_fabricacao,ano_modelo,quilometragem,combustivel,cambio,cor,cidade,uf,preco_venda_pretendido,potencia_motor,portas,lugares,categoria,descricao,status,placa,mostrar_placa,criado_em&order=criado_em.desc&limit=${LIMITE}`, { headers: h })).json();
  if (!Array.isArray(vs)) return res.status(502).json({ erro: 'falha ao consultar', detalhe: vs?.message || 'sem detalhe' });

  const capas = vs.length
    ? await (await fetch(`${url}/rest/v1/veiculo_fotos?veiculo_id=in.(${vs.map((v) => v.id).join(',')})&select=veiculo_id,caminho_storage`, { headers: h })).json()
    : [];
  const primeira = {};
  for (const f of Array.isArray(capas) ? capas : []) if (!primeira[f.veiculo_id]) primeira[f.veiculo_id] = f.caminho_storage;

  const assinar = async (caminho) => {
    if (!caminho) return null;
    const r = await fetch(`${url}/storage/v1/object/sign/veiculos-fotos/${caminho}`, {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!r.ok) return null;
    const b = await r.json();
    return `${url}/storage/v1${b.signedURL}`;
  };

  const out = [];
  for (const v of vs) {
    const loja = porOrg[v.organizacao_id];
    const capa = await assinar(primeira[v.id]);
    out.push({ ...camposPublicos(v), capa, fotos: capa ? [capa] : [], loja_nome: loja?.nome, loja_slug: loja?.slug });
  }
  const lojas = orgs.map((o) => ({ nome: o.nome, slug: o.slug }));
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  return res.status(200).json({ lojas, veiculos: out });
}
