// Paginas do marketplace e de cada veiculo com HTML pronto (titulo, descricao, dados estruturados e conteudo).
// O app React continua funcionando por cima; quem le o HTML (Google, WhatsApp, redes) ve o conteudo completo.
import { buscarMarketplace, POR_PAGINA } from './marketplace.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BRL = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const LD = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

export function montarHtml(template, { titulo, descricao, canonical, imagem, ld, corpo, indexar = true }) {
  let h = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(titulo)}</title>`);
  h = h.replace(/<meta name="description"[^>]*>\s*/, '');
  const meta = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta name="description" content="${esc(descricao)}" />`,
    indexar ? '' : '<meta name="robots" content="noindex" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descricao)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:site_name" content="Calcula.car" />`,
    imagem ? `<meta property="og:image" content="${esc(imagem)}" />` : '',
    `<meta name="twitter:card" content="${imagem ? 'summary_large_image' : 'summary'}" />`,
    ld ? `<script type="application/ld+json">${LD(ld)}</script>` : '',
  ].filter(Boolean).join('\n    ');
  h = h.replace('</head>', () => `    ${meta}\n  </head>`);
  h = h.replace('<div id="root"></div>', () => `<div id="root">${corpo}</div>`);
  return h;
}

const ESTILO = 'max-width:1100px;margin:0 auto;padding:24px 16px;font-family:Inter,system-ui,sans-serif;color:#0f172a';

function paginacao(atual, total) {
  if (total <= 1) return '';
  const link = (n) => (n === 1 ? '/marketplace' : `/marketplace/pagina/${n}`);
  const anterior = atual > 1 ? `<a href="${link(atual - 1)}">Página anterior</a>` : '';
  const proxima = atual < total ? `<a href="${link(atual + 1)}">Próxima página</a>` : '';
  return `<nav>${anterior} ${proxima}</nav>`;
}

async function paginaMarketplace({ url, key, origem, pagina, template }) {
  const dados = await buscarMarketplace({ url, key, pagina, filtros: {} });
  const itens = dados.veiculos.map((v) => {
    const nome = `${v.marca ? v.marca + ' ' : ''}${v.modelo} ${v.ano_fabricacao ?? ''}/${v.ano_modelo ?? ''}`.trim();
    return { nome, url: `${origem}/loja/${v.loja_slug}/veiculo/${v.id}`, preco: v.preco_venda_pretendido, loja: v.loja_nome, cidade: v.cidade, uf: v.uf, id: v.id };
  });
  const titulo = pagina > 1 ? `Marketplace de veículos — página ${pagina} | Calcula.car` : 'Marketplace de veículos usados | Calcula.car';
  const descricao = `Encontre ${dados.total} veículos de ${dados.lojas.length} lojas parceiras. Busque por marca, modelo e faixa de preço.`;
  const corpo = `<main style="${ESTILO}"><h1>Marketplace de veículos</h1><p>${dados.total} veículos de ${dados.lojas.length} lojas parceiras.</p>
    <ul>${itens.map((i) => `<li><a href="/loja/${esc(i.url.split('/loja/')[1].split('/veiculo/')[0])}/veiculo/${esc(i.id)}">${esc(i.nome)}</a> — ${esc(BRL(i.preco))} · ${esc(i.loja)}${i.cidade ? ' · ' + esc(i.cidade) + (i.uf ? '/' + esc(i.uf) : '') : ''}</li>`).join('')}</ul>
    ${paginacao(pagina, dados.paginas)}</main>`;
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Marketplace de veículos', numberOfItems: dados.total,
    itemListElement: itens.map((i, n) => ({ '@type': 'ListItem', position: (pagina - 1) * POR_PAGINA + n + 1, url: i.url, name: i.nome })) };
  return montarHtml(template, { titulo, descricao, canonical: `${origem}/marketplace${pagina > 1 ? '/pagina/' + pagina : ''}`, ld, corpo });
}

async function paginaVeiculo({ url, key, origem, slug, id, template }) {
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const idLimpo = String(id).replace(/[^0-9a-f-]/g, '');
  const orgs = await (await fetch(`${url}/rest/v1/organizacoes?slug=eq.${String(slug).replace(/[^a-z0-9-]/g, '')}&ativa=eq.true&select=id,nome,slug,whatsapp`, { headers: h })).json();
  if (!Array.isArray(orgs) || !orgs[0]) return null;
  const loja = orgs[0];
  const vs = await (await fetch(`${url}/rest/v1/veiculos?id=eq.${idLimpo}&organizacao_id=eq.${loja.id}&publicado_catalogo=eq.true&status=in.(disponivel,reservado,em_preparacao)&select=id,marca,modelo,ano_fabricacao,ano_modelo,quilometragem,combustivel,cambio,cor,cidade,uf,preco_venda_pretendido,potencia_motor,portas,lugares,categoria,descricao,status`, { headers: h })).json();
  if (!Array.isArray(vs) || !vs[0]) return null;
  const v = vs[0];
  const nome = `${v.marca ? v.marca + ' ' : ''}${v.modelo}`.trim();
  const ano = `${v.ano_fabricacao ?? ''}/${v.ano_modelo ?? ''}`;
  const local = v.cidade ? ` em ${v.cidade}${v.uf ? '/' + v.uf : ''}` : '';
  const titulo = `${nome} ${ano} — ${BRL(v.preco_venda_pretendido)} | ${loja.nome} | Calcula.car`;
  const descricao = `${nome} ${ano}, ${v.quilometragem != null ? Number(v.quilometragem).toLocaleString('pt-BR') + ' km, ' : ''}${v.combustivel ?? ''}${v.cambio ? ', ' + v.cambio : ''}, por ${BRL(v.preco_venda_pretendido)}. Anunciado por ${loja.nome}${local}.`;
  const canonical = `${origem}/loja/${loja.slug}/veiculo/${v.id}`;
  const ld = { '@context': 'https://schema.org', '@type': 'Car', name: nome, brand: { '@type': 'Brand', name: v.marca || nome.split(' ')[0] },
    model: v.modelo, vehicleModelDate: String(v.ano_modelo ?? ''), productionDate: String(v.ano_fabricacao ?? ''),
    ...(v.quilometragem != null ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: Number(v.quilometragem), unitCode: 'KMT' } } : {}),
    ...(v.combustivel ? { fuelType: v.combustivel } : {}), ...(v.cambio ? { vehicleTransmission: v.cambio } : {}), ...(v.cor ? { color: v.cor } : {}),
    offers: { '@type': 'Offer', price: Number(v.preco_venda_pretendido || 0), priceCurrency: 'BRL', availability: v.status === 'reservado' ? 'https://schema.org/ReservedStock' : 'https://schema.org/InStock',
      seller: { '@type': 'AutoDealer', name: loja.nome, url: `${origem}/loja/${loja.slug}` } } };
  const specs = [['Ano', ano], ['Quilometragem', v.quilometragem != null ? Number(v.quilometragem).toLocaleString('pt-BR') + ' km' : null], ['Combustível', v.combustivel], ['Câmbio', v.cambio], ['Cor', v.cor], ['Motor', v.potencia_motor]]
    .filter(([, val]) => val).map(([k, val]) => `<li><strong>${esc(k)}:</strong> ${esc(val)}</li>`).join('');
  const corpo = `<main style="${ESTILO}"><h1>${esc(nome)} ${esc(ano)}</h1><p><strong>${esc(BRL(v.preco_venda_pretendido))}</strong> · ${esc(loja.nome)}${esc(local)}</p>
    <ul>${specs}</ul>${v.descricao ? `<p>${esc(v.descricao)}</p>` : ''}
    <p><a href="/loja/${esc(loja.slug)}">Ver todos os veículos de ${esc(loja.nome)}</a> · <a href="/marketplace">Marketplace</a></p></main>`;
  return montarHtml(template, { titulo, descricao, canonical, imagem: `${origem}/foto/${v.id}`, ld, corpo });
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origem = `https://${host}`;
  if (!url || !key) return res.status(500).send('configuração ausente');
  const caminho = String(req.query?.p || '/marketplace');
  try {
    const template = await (await fetch(`${origem}/index.html`)).text();
    let html = null;
    let status = 200;
    const m = caminho.match(/^\/marketplace(?:\/pagina\/(\d{1,4}))?\/?$/);
    const v = caminho.match(/^\/loja\/([a-z0-9-]+)\/veiculo\/([0-9a-f-]{36})\/?$/);
    if (m) html = await paginaMarketplace({ url, key, origem, template, pagina: Math.max(1, parseInt(m[1] || '1', 10)) });
    else if (v) { html = await paginaVeiculo({ url, key, origem, template, slug: v[1], id: v[2] }); if (!html) { status = 404; html = montarHtml(template, { titulo: 'Veículo não encontrado | Calcula.car', descricao: 'Este veículo não está mais disponível.', canonical: `${origem}/marketplace`, indexar: false, corpo: '<main style="' + ESTILO + '"><h1>Veículo não encontrado</h1><p><a href="/marketplace">Ver veículos disponíveis</a></p></main>' }); } }
    else { status = 404; html = montarHtml(template, { titulo: 'Página não encontrada | Calcula.car', descricao: 'Página não encontrada.', canonical: origem, indexar: false, corpo: '' }); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(status).send(html);
  } catch (e) {
    return res.status(502).send('falha ao montar a página');
  }
}
