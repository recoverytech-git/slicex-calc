/**
 * Input monetário mascarado (R$ 0,00) — preenche da direita para a
 * esquerda, como em apps bancários. Mantém o valor internamente em
 * centavos (inteiro) para evitar erro de ponto flutuante; expõe o
 * valor em reais (número) via onChangeValue.
 *
 * Visual idêntico ao componente Field já existente — apenas a máscara
 * de digitação é diferente.
 */
export default function CurrencyField({ label, cents, setCents }) {
  const display = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    const n = digits === "" ? 0 : parseInt(digits, 10);
    setCents(Math.min(n, 999999999));
  };

  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 600, color: "var(--text-mute)", pointerEvents: "none" }}>
          R$
        </span>
        <input
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          style={{
            width: "100%", boxSizing: "border-box", background: "var(--surface)",
            border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)",
            padding: "11px 13px 11px 38px", color: "var(--text)", fontSize: 15, fontWeight: 600,
            outline: "none", transition: "border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.background = "var(--surface-2)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.background = "var(--surface)"; }}
        />
      </div>
    </div>
  );
}
