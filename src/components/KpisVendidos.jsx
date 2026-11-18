import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { inicioPeriodo } from "./PainelPeriodo";

// Mesmas regras da pagina Vendidos: quantidade de vendas, faturamento (valor vendido) e resultado final (gestao)
const GESTAO = ["admin_master", "proprietario", "gerente"];
const FILTROS = [[30, "30D"], [60, "60D"], [90, "90D"], [180, "180D"], [360, "360D (ANO)"]];
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cartao = { background: "var(--surface)", borderRadius: 20, border: "1px solid rgba(226,232,240,.8)", boxShadow: "0 1px 3px rgba(15,23,42,.03), 0 10px 25px -5px rgba(15,23,42,.04)", padding: 20, marginBottom: 18 };
const kpi = { background: "var(--surface-2)", borderRadius: 16, padding: "14px 16px", minWidth: 0, overflowWrap: "anywhere" };

export default function KpisVendidos() {
  const { perfil } = useAuth();
  const gestao = GESTAO.includes(perfil?.papel);
  const [dias, setDias] = useState(30);
  const [vendas, setVendas] = useState([]);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("v_vendas_resultado").select("data_venda, valor_venda, resultado_final")
      .then(({ data }) => setVendas(data ?? []));
  }, []);
  const linhas = useMemo(() => {
    const ini = inicioPeriodo(dias);
    return vendas.filter((s) => new Date(s.data_venda) >= ini);
  }, [vendas, dias]);
  const faturamento = linhas.reduce((a, s) => a + Number(s.valor_venda ?? 0), 0);
  const resultado = linhas.reduce((a, s) => a + Number(s.resultado_final ?? 0), 0);
  return (
    <section style={cartao}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Veículos vendidos</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FILTROS.map(([d, rotulo]) => (
            <button key={d} type="button" onClick={() => setDias(d)}
              style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid var(--border)",
                background: dias === d ? "var(--accent)" : "var(--surface)", color: dias === d ? "#fff" : "var(--text-dim)" }}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: 12 }}>
        <div style={kpi}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-mute)" }}>Veículos vendidos</p>
          <p style={{ margin: "6px 0 0", fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 800, color: "var(--text)" }}>{linhas.length}</p>
        </div>
        <div style={kpi}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-mute)" }}>Faturamento</p>
          <p style={{ margin: "6px 0 0", fontSize: "clamp(16px, 4.2vw, 20px)", fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{BRL(faturamento)}</p>
        </div>
        {gestao && (
          <div style={kpi}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-mute)" }}>Resultado final total</p>
            <p style={{ margin: "6px 0 0", fontSize: "clamp(16px, 4.2vw, 20px)", fontWeight: 800, color: resultado < 0 ? "#b91c1c" : "#059669", fontVariantNumeric: "tabular-nums" }}>{BRL(resultado)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
