import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

// Alerta apenas para a gestao: veiculos reservados, ou vendidos sem registro de venda, ha mais de X dias
const GESTAO = ["admin_master", "proprietario", "gerente"];
const DIA_MS = 86400000;
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const td = { padding: "8px 6px", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13, whiteSpace: "nowrap" };

export default function AlertaBaixaPendente() {
  const { perfil } = useAuth();
  const [limite, setLimite] = useState(15);
  const [lista, setLista] = useState([]);
  const gestao = GESTAO.includes(perfil?.papel);

  useEffect(() => {
    if (!gestao || !supabaseConfigurado) return;
    (async () => {
      const { data: vs } = await supabase.from("veiculos")
        .select("id, modelo, placa, status, criado_em").in("status", ["vendido", "reservado"]);
      const ids = (vs ?? []).map((v) => v.id);
      if (!ids.length) { setLista([]); return; }
      const [{ data: hist }, { data: vendas }] = await Promise.all([
        supabase.from("veiculo_historico").select("veiculo_id, alterado_em").eq("campo", "status").in("veiculo_id", ids).order("alterado_em", { ascending: false }),
        supabase.from("veiculo_vendas").select("veiculo_id").in("veiculo_id", ids),
      ]);
      const ultima = {};
      for (const h of hist ?? []) if (!ultima[h.veiculo_id]) ultima[h.veiculo_id] = h.alterado_em;
      const comVenda = new Set((vendas ?? []).map((v) => v.veiculo_id));
      const agora = Date.now();
      setLista((vs ?? [])
        .map((v) => {
          const desde = ultima[v.id] || v.criado_em;
          const dias = Math.floor((agora - new Date(desde).getTime()) / DIA_MS);
          const motivo = v.status === "vendido" ? "Vendido sem registro de venda" : "Reservado";
          return { ...v, dias, motivo, pendente: v.status === "reservado" || (v.status === "vendido" && !comVenda.has(v.id)) };
        })
        .filter((v) => v.pendente && v.dias > limite)
        .sort((a, b) => b.dias - a.dias));
    })();
  }, [gestao, limite]);

  if (!gestao) return null;
  return (
    <section style={cartao}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Baixas pendentes</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 15, 30].map((x) => (
            <button key={x} type="button" onClick={() => setLimite(x)}
              style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid var(--border)",
                background: limite === x ? "var(--accent)" : "var(--surface)", color: limite === x ? "#fff" : "var(--text-dim)" }}>
              mais de {x} dias
            </button>
          ))}
        </div>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>Veículos reservados, ou vendidos sem registro de venda, há mais de {limite} dias.</p>
      {lista.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>Nenhuma baixa pendente.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...td, color: "var(--text-dim)", fontSize: 12 }}>Modelo</th>
              <th style={{ ...td, color: "var(--text-dim)", fontSize: 12 }}>Placa</th>
              <th style={{ ...td, color: "var(--text-dim)", fontSize: 12 }}>Situação</th>
              <th style={{ ...td, color: "var(--text-dim)", fontSize: 12, textAlign: "right" }}>Dias</th>
            </tr></thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id}>
                  <td style={td}>{v.modelo || "—"}</td>
                  <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{v.placa || "—"}</td>
                  <td style={{ ...td, color: "#b91c1c", fontWeight: 700 }}>{v.motivo}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{v.dias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
