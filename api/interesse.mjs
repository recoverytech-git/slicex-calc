// Interesse do cliente num veiculo do catalogo. Cria lead (status 'marketplace') e avisa a loja.
// Protecao: CPF valido obrigatorio; 1 interesse por CPF e veiculo a cada 24h; 5 por CPF a cada 24h.
export function cpfValidoServidor(c) {
  const d = String(c || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base, peso) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += Number(base[i]) * (peso - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
}

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
  const cpf = String(b.cpf || '').replace(/\D/g, '');
  const mensagem = String(b.mensagem || '').trim().slice(0, 500);
  if (nome.length < 2) return res.status(400).json({ erro: 'Informe seu nome' });
  if (telefone.length < 10 || telefone.length > 11) return res.status(400).json({ erro: 'Informe um telefone com DDD' });
  if (!cpfValidoServidor(cpf)) return res.status(400).json({ erro: 'CPF inválido. Confira os números.' });

  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?slug=eq.${slug}&ativa=eq.true&select=id,nome`, { headers: h })).json();
  if (!Array.isArray(orgs) || !orgs[0]) return res.status(404).json({ erro: 'Loja não encontrada' });
  const org = orgs[0];
  const vs = await (await fetch(`${url}/rest/v1/veiculos?id=eq.${veiculoId}&organizacao_id=eq.${org.id}&publicado_catalogo=eq.true&select=id,modelo,preco_venda_pretendido`, { headers: h })).json();
  if (!Array.isArray(vs) || !vs[0]) return res.status(404).json({ erro: 'Veículo indisponível' });
  const veiculo = vs[0];

  // limites por CPF (ultimas 24h)
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const recentes = await (await fetch(`${url}/rest/v1/leads?cpf=eq.${cpf}&origem=eq.catalogo&criado_em=gte.${desde}&select=dados`, { headers: h })).json();
  if (Array.isArray(recentes)) {
    if (recentes.length >= 5) return res.status(429).json({ erro: 'Limite de interesses atingido hoje. Tente novamente amanhã.' });
    if (recentes.some((r) => r.dados?.veiculo_id === veiculo.id)) {
      return res.status(429).json({ erro: 'Você já demonstrou interesse neste veículo hoje. A loja entrará em contato.' });
    }
  }

  const criado = await fetch(`${url}/rest/v1/leads`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify([{
      nome, telefone, cpf, organizacao_id: org.id, status: 'marketplace', origem: 'catalogo',
      dados: { origem: 'catalogo', tipo: 'interesse', veiculo_id: veiculo.id, veiculo: veiculo.modelo, preco_pretendido: veiculo.preco_venda_pretendido, mensagem },
    }]),
  });
  const leads = criado.ok ? await criado.json() : null;
  if (!leads?.[0]) return res.status(502).json({ erro: 'Não foi possível registrar seu interesse agora' });

  // avisa os administradores, proprietarios e gerentes da loja
  const pessoas = await (await fetch(`${url}/rest/v1/perfis?organizacao_id=eq.${org.id}&papel=in.(admin_master,proprietario,gerente)&select=id`, { headers: h })).json();
  if (Array.isArray(pessoas) && pessoas.length) {
    await fetch(`${url}/rest/v1/notificacoes`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(pessoas.map((p) => ({
        usuario_id: p.id,
        titulo: 'Novo interessado no catálogo',
        mensagem: `${nome} (${veiculo.modelo}) quer mais informações. Telefone: ${telefone}`,
        link_ref: leads[0].id,
      }))),
    });
  }
  return res.status(200).json({ ok: true });
}
