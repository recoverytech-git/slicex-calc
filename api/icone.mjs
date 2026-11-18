// Icones do app instalado (tela inicial do celular): sempre o icone oficial do Calcula.car.
// O favicon enviado nas configuracoes vale somente para a aba do navegador.
export default async function handler(req, res) {
  const tamanho = String(req.query?.t || '192').replace(/\D/g, '') || '192';
  const destino = tamanho === '180' ? '/icons/apple-touch-icon.png' : `/icons/icon-${tamanho}.png`;
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.redirect(302, destino);
}
