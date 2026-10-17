/** Máscaras de exibição. No banco guardamos só dígitos. */
export const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

export function formatarCPF(v) {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatarCNPJ(v) {
  const d = soDigitos(v).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

/** (00) 0000-0000 ou (00) 00000-0000 (WhatsApp) */
export function formatarTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

/** Valida CPF pelos dígitos verificadores. */
export function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base, pesoIni) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (pesoIni - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9, 10) === Number(d[9]) && dv(10, 11) === Number(d[10]);
}

/** Valida CNPJ pelos dígitos verificadores. */
export function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (tam) => {
    const pesos = tam === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let soma = 0;
    for (let i = 0; i < tam; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Telefone com DDD: 10 dígitos (fixo) ou 11 (celular/WhatsApp). */
export function telefoneValido(v) {
  const d = soDigitos(v);
  return (d.length === 10 || d.length === 11) && Number(d[0]) >= 1;
}
