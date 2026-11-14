// Regra de juros do financiamento de 1 parcela (unica fonte no front-end).
// Juros do mes (J) cobre 30 dias. Venda antes de 30 dias: J x dias / 30.
// Do dia 31 em diante: cada dia a mais soma J / 30 (o dia 31 ja conta o adicional).
export const DIAS_PERIODO = 30;
const DIA_MS = 86400000;

// Datas AAAA-MM-DD viram data local (evita deslocamento de fuso)
export function dataLocal(d) {
  if (d instanceof Date) return d;
  const s = String(d || "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

const inicioDoDia = (d) => {
  const x = dataLocal(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Dias corridos entre duas datas (sem contar horas)
export function diasEntre(inicio, fim) {
  return Math.max(0, Math.round((inicioDoDia(fim) - inicioDoDia(inicio)) / DIA_MS));
}

// Juros efetivo para N dias usados (J = juros do mes contratado)
export function jurosPorDias(jm, dias) {
  if (dias <= DIAS_PERIODO) return (jm * dias) / DIAS_PERIODO;
  return jm + ((dias - DIAS_PERIODO) * jm) / DIAS_PERIODO;
}

// Calcula a regra completa. Com venda: usa a data da venda. Sem venda: conta ate hoje.
export function regraJuros({ financiamento, aquisicao, venda, hoje = new Date() }) {
  const base = { aplica: false, motivo: "", jm: 0, diario: 0, dias: 0, cobrados: 0, acumulado: 0, total: 0, efetivo: 0, ajuste: 0, venda: !!venda, fimLabel: "" };
  if (!financiamento) {
    return { ...base, motivo: "Não aplicável: aquisição sem financiamento. Os juros diários valem somente para financiamento de 1 parcela." };
  }
  const parcelas = Number(financiamento.quantidade_parcelas || 0);
  const jm = Number(financiamento.total_juros || 0);
  if (parcelas !== 1) {
    return { ...base, jm, total: jm, efetivo: jm, motivo: `Não aplicável: financiamento com ${parcelas} parcelas. A regra vale somente para 1 parcela (30 dias).` };
  }
  const diario = jm / DIAS_PERIODO;
  const motivo = "Aplicável: financiamento de 1 parcela (30 dias). Do dia 31 em diante, cada dia soma o juros do mês ÷ 30.";
  if (venda) {
    const dias = diasEntre(aquisicao, venda);
    const efetivo = jurosPorDias(jm, dias);
    return {
      ...base, aplica: true, motivo, jm, diario, dias,
      cobrados: Math.max(0, dias - DIAS_PERIODO),
      acumulado: efetivo - jm, total: efetivo, efetivo, ajuste: efetivo - jm,
      fimLabel: `até a venda (${dataLocal(venda).toLocaleDateString("pt-BR")})`,
    };
  }
  const dias = diasEntre(aquisicao, hoje);
  const cobrados = Math.max(0, dias - DIAS_PERIODO);
  const acumulado = cobrados * diario;
  return {
    ...base, aplica: true, motivo, jm, diario, dias, cobrados, acumulado,
    total: jm + acumulado, efetivo: jm + acumulado, fimLabel: "até hoje",
  };
}

// Data da venda: nao pode ser futura nem anterior a aquisicao
export function validarDataVenda(dataVenda, aquisicao, hoje = new Date()) {
  if (inicioDoDia(dataVenda) > inicioDoDia(hoje)) return "A data da venda não pode ser futura.";
  if (aquisicao && inicioDoDia(dataVenda) < inicioDoDia(aquisicao)) return "A data da venda não pode ser anterior à data de aquisição.";
  return null;
}
