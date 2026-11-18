import MoneyField from "./MoneyField";

/** Valor em centavos (mantido por compatibilidade) com a mesma máscara de milhar do MoneyField. */
export default function CurrencyField({ label, cents, setCents }) {
  return <MoneyField label={label} valor={(cents || 0) / 100} onChange={(n) => setCents(Math.round(n * 100))} />;
}
