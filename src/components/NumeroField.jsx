import { useState, useEffect } from "react";

/** Digita números com milhar (10000 -> 10.000) e decimal com vírgula; completa ,00 ao sair do campo. */
export function formatarDigitacao(texto) {
  const limpo = String(texto ?? "").replace(/[^\d,]/g, "");
  const [inteiro, ...resto] = limpo.split(",");
  const dec = resto.length ? resto.join("").slice(0, 2) : null;
  const intFmt = inteiro.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec !== null ? `${intFmt},${dec}` : intFmt;
}

export function completarDecimais(t) {
  if (!t) return t;
  const [i, d] = t.split(",");
  return `${i},${(d ?? "").padEnd(2, "0")}`;
}

export default function NumeroField({ label, valor, onChange, hint }) {
  const [texto, setTexto] = useState(valor ?? "");
  useEffect(() => { setTexto(valor ?? ""); }, [valor]);
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <input inputMode="decimal" placeholder={hint} value={texto}
        onChange={(e) => { const f = formatarDigitacao(e.target.value); setTexto(f); onChange?.(f); }}
        onBlur={() => { const f = completarDecimais(texto); setTexto(f); onChange?.(f); }}
        style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 15, fontWeight: 600, outline: "none" }} />
    </div>
  );
}
