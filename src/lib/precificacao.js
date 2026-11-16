// Preco sugerido por modelo: compara vendas da mesma familia (GOL, COROLLA...) com ano de modelo ate 2 anos de diferenca.
// Motor: usa o campo "Potencia do motor" do cadastro; se vazio, tenta ler o numero do nome do modelo.
// Se houver pelo menos 3 vendas do mesmo motor, usa so essas, para nao misturar geracoes diferentes.
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const familiaModelo = (m) => (semAcento(m).trim().split(/\s+/)[0] || "").toUpperCase();

// Normaliza qualquer grafia (1.0, 1,6, 1.6 16V, 2.0 TSI) para "1.0", "1.6", "2.0"
export function motorNormalizado(x) {
  const r = String(x || "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!r) return null;
  const n = parseFloat(r[0]);
  return n > 0 && n < 10 ? n.toFixed(1) : null;
}

// Motor lido do nome do modelo (reserva)
export const motorModelo = (m) => motorNormalizado(m);

// Motor do veiculo: campo de potencia primeiro; nome do modelo somente como reserva
export function motorDe(v) {
  return motorNormalizado(v.potencia_motor) || motorNormalizado(v.modelo);
}

export function comparaveis(alvo, vendas) {
  const fam = familiaModelo(alvo.modelo);
  const ano = Number(alvo.ano_modelo);
  const base = vendas.filter((v) =>
    familiaModelo(v.modelo) === fam &&
    Number(v.ano_modelo) > 0 && Math.abs(Number(v.ano_modelo) - ano) <= 2 &&
    Number(v.preco_venda_pretendido) > 0 && Number(v.valor_venda) > 0
  );
  const motor = motorDe(alvo);
  const mesmoMotor = motor ? base.filter((v) => motorDe(v) === motor) : [];
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
