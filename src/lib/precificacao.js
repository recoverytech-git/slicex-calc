// Preco sugerido por modelo: compara vendas da mesma familia (GOL, COROLLA...) com ano de modelo ate 2 anos de diferenca.
// Se houver pelo menos 3 vendas do mesmo motor (1.0, 1.6...), usa so essas, para nao misturar geracoes diferentes.
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const familiaModelo = (m) => (semAcento(m).trim().split(/\s+/)[0] || "").toUpperCase();
export const motorModelo = (m) => {
  const r = String(m || "").match(/\b\d\.\d\b/);
  return r ? r[0] : null;
};

export function comparaveis(alvo, vendas) {
  const fam = familiaModelo(alvo.modelo);
  const ano = Number(alvo.ano_modelo);
  const base = vendas.filter((v) =>
    familiaModelo(v.modelo) === fam &&
    Number(v.ano_modelo) > 0 && Math.abs(Number(v.ano_modelo) - ano) <= 2 &&
    Number(v.preco_venda_pretendido) > 0 && Number(v.valor_venda) > 0
  );
  const motor = motorModelo(alvo.modelo);
  const mesmoMotor = motor ? base.filter((v) => motorModelo(v.modelo) === motor) : [];
  if (mesmoMotor.length >= 3) return { lista: mesmoMotor, metodo: `mesma familia, motor ${motor} e ano de modelo +/- 2` };
  return { lista: base, metodo: "mesma familia e ano de modelo +/- 2" };
}

// Faixa de venda: razao entre valor vendido e pretendido das comparaveis, aplicada ao pretendido do veiculo
export function faixaSugerida(alvo, vendas) {
  const { lista, metodo } = comparaveis(alvo, vendas);
  if (!lista.length) return { n: 0, metodo, aviso: "Sem vendas comparaveis" };
  const r = lista.map((v) => Number(v.valor_venda) / Number(v.preco_venda_pretendido));
  const media = r.reduce((a, b) => a + b, 0) / r.length;
  const min = Math.min(...r);
  const max = Math.max(...r);
  const p = Number(alvo.preco_venda_pretendido) || 0;
  return {
    n: lista.length, metodo,
    media, minimo: p * min, maximo: p * max, esperado: p * media,
    aviso: lista.length < 3 ? "Poucas vendas comparaveis: use com cautela" : null,
  };
}
