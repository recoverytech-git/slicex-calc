export const fmt = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtN = (v) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtK = (v) =>
  Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;

export const fmtPct = (v, decimals = 2) =>
  `${v.toFixed(decimals)}%`;

export const toF = (s) => parseFloat(String(s).replace(",", ".")) || 0;
