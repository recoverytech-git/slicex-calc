// Interesse do cliente num veiculo do catalogo: cria um lead na loja de origem.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(500).json({ erro: 'configuração ausente' });
  const h = { apikey: key, Authorization: `Bearer ${key}` };

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.site) return res.status(200).json({ ok: true }); // campo oculto anti-robô
  const slug = String(b.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  const veiculoId = String(b.veiculoId || '').replace(/[^0-9a-f-]/g, '');
  const nome = String(b.nome || '').trim().slice(0, 80);
  const telefone = String(b.telefone || '').replace(/\D/g, '');
  const mensagem = String(b.mensagem || '').trim().slice(0, 500);
  if (nome.length < 2) return res.status(400).json({ erro: 'Informe seu nome' });
  if (telefone.length < 10 || telefone.length > 11) return res.status(400).json({ erro: 'Informe um telefone com DDD' });

  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?slug=eq.${slug}&ativa=eq.true&select=id`, { headers: h })).json();
  if (!Array.isArray(orgs) || !orgs[0]) return res.status(404).json({ erro: 'Loja não encontrada' });
  const vs = await (await fetch(`${url}/rest/v1/veiculos?id=eq.${veiculoId}&organizacao_id=eq.${orgs[0].id}&publicado_catalogo=eq.true&select=id,modelo,preco_venda_pretendido`, { headers: h })).json();
  if (!Array.isArray(vs) || !vs[0]) return res.status(404).json({ erro: 'Veículo indisponível' });

  const r = await fetch(`${url}/rest/v1/leads`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify([{
      nome, telefone, organizacao_id: orgs[0].id, status: 'completa',
      dados: { origem: 'catalogo', tipo: 'interesse', veiculo_id: vs[0].id, veiculo: vs[0].modelo, preco_pretendido: vs[0].preco_venda_pretendido, mensagem },
    }]),
  });
  if (!r.ok) return res.status(502).json({ erro: 'Não foi possível registrar seu interesse agora' });
  return res.status(200).json({ ok: true });
}
