// Catalogo publico da loja. Nunca devolve custos, juros, margem, FIPE interna nem organizacao_id.
// Placa so sai se a loja marcar "mostrar placa". Fotos: links temporarios gerados no servidor.
const STATUS_VISIVEIS = 'disponivel,reservado,em_preparacao';

export function camposPublicos(v) {
  const base = {
    id: v.id, marca: v.marca, modelo: v.modelo, ano_fabricacao: v.ano_fabricacao, ano_modelo: v.ano_modelo,
    quilometragem: v.quilometragem, combustivel: v.combustivel, cambio: v.cambio, cor: v.cor,
    cidade: v.cidade, uf: v.uf, preco_venda_pretendido: v.preco_venda_pretendido,
    potencia_motor: v.potencia_motor, portas: v.portas, lugares: v.lugares, categoria: v.categoria,
    descricao: v.descricao, status: v.status,
  };
  if (v.mostrar_placa) base.placa = v.placa;
  return base;
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(500).json({ erro: 'configuração ausente' });
  const h = { apikey: key, Authorization: `Bearer ${key}` };

  const slug = String(req.query?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  if (!slug) return res.status(400).json({ erro: 'Loja não informada' });
  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?slug=eq.${slug}&ativa=eq.true&select=id,nome,slug,whatsapp`, { headers: h })).json();
  if (!Array.isArray(orgs) || !orgs[0]) return res.status(404).json({ erro: 'Loja não encontrada' });
  const loja = orgs[0];

  const id = req.query?.id ? String(req.query.id).replace(/[^0-9a-f-]/g, '') : null;
  let q = `${url}/rest/v1/veiculos?organizacao_id=eq.${loja.id}&publicado_catalogo=eq.true&status=in.(${STATUS_VISIVEIS})&select=id,marca,modelo,ano_fabricacao,ano_modelo,quilometragem,combustivel,cambio,cor,cidade,uf,preco_venda_pretendido,potencia_motor,portas,lugares,categoria,descricao,status,placa,mostrar_placa,criado_em&order=criado_em.desc`;
  if (id) q += `&id=eq.${id}`;
  const vs = await (await fetch(q, { headers: h })).json();
  if (!Array.isArray(vs)) return res.status(502).json({ erro: 'falha ao consultar', detalhe: vs?.message || vs?.hint || vs?.code || 'sem detalhe' });
  if (id && !vs[0]) return res.status(404).json({ erro: 'Veículo não encontrado' });

  const ids = vs.map((v) => v.id);
  const fotos = ids.length
    ? await (await fetch(`${url}/rest/v1/veiculo_fotos?veiculo_id=in.(${ids.join(',')})&select=veiculo_id,caminho_storage`, { headers: h })).json()
    : [];
  const porVeiculo = {};
  for (const f of Array.isArray(fotos) ? fotos : []) (porVeiculo[f.veiculo_id] ||= []).push(f.caminho_storage);

  const assinar = async (caminho) => {
    const r = await fetch(`${url}/storage/v1/object/sign/veiculos-fotos/${caminho}`, {
      method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!r.ok) return null;
    const b = await r.json();
    return `${url}/storage/v1${b.signedURL}`;
  };

  const out = [];
  for (const v of vs) {
    const cams = (porVeiculo[v.id] || []).slice(0, id ? 12 : 1);
    const links = (await Promise.all(cams.map(assinar))).filter(Boolean);
    out.push({ ...camposPublicos(v), fotos: links, capa: links[0] || null });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  if (id) return res.status(200).json({ loja: { nome: loja.nome, slug: loja.slug, whatsapp: loja.whatsapp || null }, veiculo: out[0] });
  return res.status(200).json({ loja: { nome: loja.nome, slug: loja.slug, whatsapp: loja.whatsapp || null }, veiculos: out });
}
