import { useCampoMoeda } from "../lib/moeda";

/**
 * Campo monetário padrão do sistema (R$). Digitação com milhar automático:
 * 65000 -> 65.000; centavos com vírgula. `onChange(numero)` devolve sempre o número.
 */
export default function MoneyField({ label, valor, onChange, hint = "0,00", style }) {
  const [texto, onTexto] = useCampoMoeda(valor, onChange);
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
          onChange={onTexto}
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
