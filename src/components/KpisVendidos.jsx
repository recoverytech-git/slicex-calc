import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { inicioPeriodo } from "./PainelPeriodo";

// Mesmas regras da pagina Vendidos: quantidade de vendas, faturamento (valor vendido) e resultado final (gestao)
const GESTAO = ["admin_master", "proprietario", "gerente"];
const FILTROS = [[30, "30D"], [60, "60D"], [90, "90D"], [180, "180D"], [360, "360D (ANO)"]];
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const kpi = { background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "14px 16px" };

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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${gestao ? 3 : 2}, minmax(0, 1fr))`, gap: 12 }}>
        <div style={kpi}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Veículos vendidos</p>
          <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{linhas.length}</p>
        </div>
        <div style={kpi}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Faturamento</p>
          <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{BRL(faturamento)}</p>
        </div>
        {gestao && (
          <div style={kpi}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Resultado final total</p>
            <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: resultado < 0 ? "#b91c1c" : "#059669" }}>{BRL(resultado)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
