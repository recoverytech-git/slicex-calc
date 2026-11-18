// Icones do PWA: usa o favicon enviado nas configuracoes; sem ele, usa o logotipo claro; sem nenhum, o icone padrao.
export default async function handler(req, res) {
  const tamanho = String(req.query?.t || '192').replace(/\D/g, '') || '192';
  const padrao = tamanho === '180' ? '/icons/apple-touch-icon.png' : `/icons/icon-${tamanho}.png`;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.redirect(302, padrao);
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const linhas = await (await fetch(`${url}/rest/v1/configuracoes?chave=in.(favicon,logo_claro)&select=chave,valor`, { headers: h })).json();
  const mapa = Object.fromEntries((Array.isArray(linhas) ? linhas : []).map((r) => [r.chave, r.valor]));
  const origem = mapa.favicon || mapa.logo_claro;
  if (!origem || !/^https?:\/\//.test(origem)) return res.redirect(302, padrao);
  const img = await fetch(origem);
  if (!img.ok) return res.redirect(302, padrao);
  res.setHeader('Content-Type', img.headers.get('content-type') || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(Buffer.from(await img.arrayBuffer()));
}
