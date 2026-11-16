// Historico de preco pretendido e sugestao de reducao para veiculos parados
export function curvaPreco(historico) {
  return [...historico]
    .sort((a, b) => new Date(a.alterado_em) - new Date(b.alterado_em))
    .map((h) => ({ data: h.alterado_em, valor: Number(h.valor_novo) }));
}

// A partir de 60 dias parado: reduz 3% a cada 30 dias adicionais, sem ir abaixo da margem minima sobre o capital
export function sugerirReducao({ dias, capital, preco, margemMinima = 0.05, passoPct = 0.03, diasCarencia = 60 }) {
  if (!(dias > diasCarencia) || !(preco > 0)) return null;
  const degraus = Math.floor((dias - diasCarencia) / 30) + 1;
  const piso = capital * (1 + margemMinima);
  const novo = Math.max(piso, preco * (1 - passoPct * degraus));
  if (novo >= preco) return null;
  const arredondado = Math.round(novo * 100) / 100;
  return { precoAtual: preco, precoSugerido: arredondado, reducao: preco - arredondado, pct: (preco - arredondado) / preco, piso };
}
