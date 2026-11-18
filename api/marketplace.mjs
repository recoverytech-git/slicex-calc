// Marketplace geral: veiculos de lojas que ativaram a opcao (opt-in), com filtros no servidor e paginas de 30.
import { camposPublicos, indicadoresPublicos } from './catalogo.mjs';

const STATUS = 'disponivel,reservado,em_preparacao';
export const POR_PAGINA = 30;
const CAMPOS = 'id,organizacao_id,valor_fipe,marca,modelo,ano_fabricacao,ano_modelo,quilometragem,combustivel,cambio,cor,cidade,uf,preco_venda_pretendido,potencia_motor,portas,lugares,categoria,descricao,status,placa,mostrar_placa,criado_em';

// Remove caracteres que podem quebrar a consulta (virgula, parenteses, aspas, asterisco)
export function limparBusca(t) {
  return String(t || '').replace(/[^\p{L}\p{N} .-]/gu, '').trim().slice(0, 60);
}

export async function buscarMarketplace({ url, key, pagina = 1, filtros = {} }) {
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const lojasTodas = await (await fetch(`${url}/rest/v1/organizacoes?marketplace_ativo=eq.true&ativa=eq.true&select=nome,slug`, { headers: h })).json();
  const lojas = Array.isArray(lojasTodas) ? lojasTodas : [];

  let oq = 'marketplace_ativo=eq.true&ativa=eq.true&select=id,nome,slug';
  if (filtros.loja) oq += `&slug=eq.${filtros.loja.replace(/[^a-z0-9-]/g, '')}`;
  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?${oq}`, { headers: h })).json();
  if (!Array.isArray(orgs)) throw new Error(orgs?.message || 'falha ao consultar as lojas');
  if (!orgs.length) return { lojas, veiculos: [], total: 0, pagina: 1, porPagina: POR_PAGINA, paginas: 1 };

  const porOrg = Object.fromEntries(orgs.map((o) => [o.id, o]));
  const idsFiltro = Array.isArray(filtros.ids) ? filtros.ids.filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 50) : null;
  let q = `${url}/rest/v1/veiculos?organizacao_id=in.(${orgs.map((o) => o.id).join(',')})&publicado_catalogo=eq.true&status=in.(${STATUS})&select=${CAMPOS}&order=criado_em.desc&limit=${idsFiltro ? 50 : POR_PAGINA}&offset=${idsFiltro ? 0 : (pagina - 1) * POR_PAGINA}`;
  if (idsFiltro) q += `&id=in.(${idsFiltro.join(',')})`;
  if (Number(filtros.precoMax) > 0) q += `&preco_venda_pretendido=lte.${Number(filtros.precoMax)}`;
  if (Number(filtros.anoMin) > 0) q += `&ano_modelo=gte.${Number(filtros.anoMin)}`;
  if (filtros.combustivel) q += `&combustivel=eq.${encodeURIComponent(filtros.combustivel)}`;
  if (filtros.cambio) q += `&cambio=eq.${encodeURIComponent(filtros.cambio)}`;
  const t = limparBusca(filtros.busca);
  if (t) q += `&or=${encodeURIComponent(`(marca.ilike.*${t}*,modelo.ilike.*${t}*,cidade.ilike.*${t}*)`)}`;

  const r = await fetch(q, { headers: { ...h, Prefer: 'count=exact' } });
  const vs = await r.json();
  if (!Array.isArray(vs)) throw new Error(vs?.message || 'falha ao consultar os veículos');
  const cr = r.headers.get('content-range') || '';
  const total = Number((cr.split('/')[1]) || 0);

  const ids = vs.map((v) => v.id);
  const capas = ids.length
    ? await (await fetch(`${url}/rest/v1/veiculo_fotos?veiculo_id=in.(${ids.join(',')})&select=veiculo_id,caminho_storage`, { headers: h })).json()
    : [];
  const primeira = {};
  for (const f of Array.isArray(capas) ? capas : []) if (!primeira[f.veiculo_id]) primeira[f.veiculo_id] = f.caminho_storage;

  const assinar = async (caminho) => {
    if (!caminho) return null;
    const s = await fetch(`${url}/storage/v1/object/sign/veiculos-fotos/${caminho}`, {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!s.ok) return null;
    const b = await s.json();
    return `${url}/storage/v1${b.signedURL}`;
  };

  const out = [];
  for (const v of vs) {
    const loja = porOrg[v.organizacao_id];
    const capa = await assinar(primeira[v.id]);
    out.push({ ...camposPublicos(v), ...indicadoresPublicos(v), capa, fotos: capa ? [capa] : [], loja_nome: loja?.nome, loja_slug: loja?.slug });
  }
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  return { lojas, veiculos: out, total, pagina, porPagina: POR_PAGINA, paginas };
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(500).json({ erro: 'configuração ausente' });
  const q = req.query || {};
  const pagina = Math.max(1, Math.min(10000, parseInt(q.pagina, 10) || 1));
  const filtros = { busca: q.busca, loja: q.loja, precoMax: q.precoMax, anoMin: q.anoMin, combustivel: q.combustivel, cambio: q.cambio, ids: q.ids ? String(q.ids).split(',').map((x) => x.trim()).slice(0, 50) : null };
  const temFiltro = Object.values(filtros).some(Boolean);
  try {
    const dados = await buscarMarketplace({ url, key, pagina, filtros });
    res.setHeader('Cache-Control', temFiltro ? 'public, s-maxage=60' : 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(dados);
  } catch (e) {
    return res.status(502).json({ erro: 'falha ao consultar', detalhe: e.message });
  }
}
