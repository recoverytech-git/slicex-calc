// Mapa do site para o Google: paginas do marketplace e de cada veiculo publicado nas lojas que aceitaram.
export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const origem = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  if (!url || !key) return res.status(500).send('configuração ausente');
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?marketplace_ativo=eq.true&ativa=eq.true&select=id,slug`, { headers: h })).json();
  const lojas = Array.isArray(orgs) ? orgs : [];
  const porOrg = Object.fromEntries(lojas.map((o) => [o.id, o.slug]));
  const vs = lojas.length ? await (await fetch(`${url}/rest/v1/veiculos?organizacao_id=in.(${lojas.map((o) => o.id).join(',')})&publicado_catalogo=eq.true&status=in.(disponivel,reservado,em_preparacao)&select=id,organizacao_id,criado_em&limit=5000`, { headers: h })).json() : [];
  const lista = Array.isArray(vs) ? vs : [];
  const paginas = Math.max(1, Math.ceil(lista.length / 30));
  const urls = [`${origem}/marketplace`];
  for (let p = 2; p <= paginas; p++) urls.push(`${origem}/marketplace/pagina/${p}`);
  for (const v of lista) urls.push(`${origem}/loja/${porOrg[v.organizacao_id]}/veiculo/${v.id}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
