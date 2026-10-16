/** Máscaras e validações de documentos e telefone. O banco guarda só os dígitos. */
export const soDigitos = (s) => String(s ?? "").replace(/\D/g, "");

export function formatarCPF(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

export function formatarCNPJ(v) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

/** Celular (11 dígitos, com WhatsApp) ou fixo (10 dígitos). */
export function formatarTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}

export const cpfValido = (v) => soDigitos(v).length === 11;
export const cnpjValido = (v) => soDigitos(v).length === 14;
export const telefoneValido = (v) => [10, 11].includes(soDigitos(v).length);
