// Foto estavel do veiculo (usada na previa de links e no Google): redireciona para um link temporario fresco.
export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const id = String(req.query?.id || '').replace(/[^0-9a-f-]/g, '');
  if (!url || !key || !id) return res.status(404).send('não encontrada');
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const vs = await (await fetch(`${url}/rest/v1/veiculos?id=eq.${id}&publicado_catalogo=eq.true&select=id`, { headers: h })).json();
  if (!Array.isArray(vs) || !vs[0]) return res.status(404).send('não encontrada');
  const fotos = await (await fetch(`${url}/rest/v1/veiculo_fotos?veiculo_id=eq.${id}&select=caminho_storage&limit=1`, { headers: h })).json();
  const caminho = Array.isArray(fotos) && fotos[0]?.caminho_storage;
  if (!caminho) return res.status(404).send('sem foto');
  const s = await fetch(`${url}/storage/v1/object/sign/veiculos-fotos/${caminho}`, {
    method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!s.ok) return res.status(502).send('falha');
  const b = await s.json();
  res.setHeader('Cache-Control', 'public, max-age=600');
  return res.redirect(302, `${url}/storage/v1${b.signedURL}`);
}
