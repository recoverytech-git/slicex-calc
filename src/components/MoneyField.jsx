import { useState, useEffect } from "react";
import { formatarNumeroBR, parseMoeda, mascararDigitacao } from "../lib/moeda";

/**
 * Campo monetário padrão do sistema (R$ 0,00).
 *
 * - `valor` é o NÚMERO usado nos cálculos (ex.: 50000).
 * - `onChange(numero)` devolve sempre o número, nunca a string formatada.
 * - A máscara é só apresentação e preserva o cursor ao final, como em
 *   caixas eletrônicos (digitos entram pela direita).
 *
 * Visual idêntico aos demais campos (Field) do design system.
 */
export default function MoneyField({ label, valor, onChange, hint = "0,00", style }) {
  const [texto, setTexto] = useState(() => formatarNumeroBR(Number.isFinite(valor) ? valor : 0));

  // Sincroniza quando o valor muda por fora (ex.: edição de um custo).
  useEffect(() => {
    const atual = parseMoeda(texto);
    if (!Number.isFinite(valor) || Math.abs((Number.isFinite(atual) ? atual : 0) - valor) > 0.001) {
      setTexto(formatarNumeroBR(Number.isFinite(valor) ? valor : 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const handleChange = (e) => {
    const { valor: numero, exibicao } = mascararDigitacao(e.target.value);
    setTexto(exibicao);
    onChange?.(numero);
  };

  return (
    <div style={style}>
      {label && (
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 600, color: "var(--text-mute)", pointerEvents: "none" }}>
          R$
        </span>
        <input
          inputMode="decimal"
          autoComplete="off"
          aria-label={label}
          placeholder={hint}
          value={texto}
          onChange={handleChange}
          onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.background = "var(--surface-2)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.background = "var(--surface)"; }}
          style={{
            width: "100%", boxSizing: "border-box", background: "var(--surface)",
            border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)",
            padding: "11px 13px 11px 38px", color: "var(--text)", fontSize: 15, fontWeight: 600,
            outline: "none", transition: "border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)",
          }}
        />
      </div>
    </div>
  );
}
