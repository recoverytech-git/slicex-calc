// Alertas de risco por veiculo
export function riscosVeiculo({ preco_venda_pretendido, capital, juros_acumulado, fipe_atualizada_em, hoje = new Date(), limiteJuros = 0.05, diasFipe = 30 }) {
  const out = [];
  const pret = Number(preco_venda_pretendido) || 0;
  const cap = Number(capital) || 0;
  const jur = Number(juros_acumulado) || 0;
  if (pret > 0 && pret - cap < 0) {
    out.push({ nivel: "alto", tipo: "margem_negativa", texto: `Margem prevista negativa (${(pret - cap).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})` });
  }
  if (pret > 0 && jur / pret > limiteJuros) {
    out.push({ nivel: "medio", tipo: "juros_alto", texto: `Juros acumulado acima de ${Math.round(limiteJuros * 100)}% do preço pretendido` });
  }
  if (!fipe_atualizada_em) {
    out.push({ nivel: "baixo", tipo: "fipe_sem_data", texto: "FIPE sem data de atualização" });
  } else {
    const dias = Math.floor((hoje - new Date(fipe_atualizada_em)) / 86400000);
    if (dias > diasFipe) out.push({ nivel: "baixo", tipo: "fipe_antiga", texto: `FIPE desatualizada há ${dias} dias` });
  }
  return out;
}
