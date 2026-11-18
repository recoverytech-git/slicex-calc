// Identidade publica da plataforma: logo e favicon enviados nas configuracoes (sem dados sensiveis).
export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(500).json({});
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const linhas = await (await fetch(`${url}/rest/v1/configuracoes?chave=in.(logo_claro,favicon)&select=chave,valor`, { headers: h })).json();
  const mapa = Object.fromEntries((Array.isArray(linhas) ? linhas : []).map((r) => [r.chave, r.valor]));
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).json({ logo_claro: mapa.logo_claro || null, favicon: mapa.favicon || null });
}
