// Atualiza o CDI (SGS 4389 - CDI anualizada base 252) no banco. Chamada pelo cron da Vercel.
// Variaveis de ambiente (somente no painel da Vercel): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.
export default async function handler(req, res) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.authorization !== `Bearer ${segredo}`) {
    return res.status(401).json({ ok: false, erro: 'não autorizado' });
  }
  try {
    const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json', {
      headers: { accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`Banco Central respondeu ${r.status}`);
    const [ult] = await r.json();
    const valor = Number(String(ult.valor).replace(',', '.'));
    if (!(valor > 0 && valor < 100)) throw new Error('valor do CDI fora da faixa esperada');
    const [dia, mes, ano] = String(ult.data).split('/');
    const referencia = `${ano}-${mes}-${dia}`;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const up = await fetch(`${url}/rest/v1/indicadores_mercado?on_conflict=chave`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([{
        chave: 'cdi_anual', valor, referencia,
        fonte: 'Banco Central do Brasil - SGS 4389 (CDI anualizada base 252)',
        atualizado_em: new Date().toISOString(),
      }]),
    });
    if (!up.ok) throw new Error(`banco de dados respondeu ${up.status}`);
    return res.status(200).json({ ok: true, valor, referencia });
  } catch (e) {
    return res.status(502).json({ ok: false, erro: e.message });
  }
}
