import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "../lib/supabase";

const CAMPOS = { status: "Status", preco_venda_pretendido: "Preço pretendido", preco_compra: "Preço de compra" };
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatar = (campo, valor) => (valor == null || valor === "" ? "—" : ["preco_venda_pretendido", "preco_compra"].includes(campo) ? BRL(valor) : valor);
const cartao = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", padding: 20, marginBottom: 18 };
const cabec = { padding: "8px 6px", textAlign: "left", color: "var(--text-dim)", borderBottom: "1px solid var(--border)", fontSize: 12, whiteSpace: "nowrap" };
const td = { padding: "8px 6px", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13, whiteSpace: "nowrap" };

export default function HistoricoVeiculos() {
  const [linhas, setLinhas] = useState([]);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    (async () => {
      const { data, error } = await supabase.from("veiculo_historico")
        .select("id, veiculo_id, campo, valor_anterior, valor_novo, alterado_por, alterado_em")
        .order("alterado_em", { ascending: false }).limit(200);
      if (error) { setErro(error.message); return; }
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.veiculo_id))];
      const uids = [...new Set(rows.map((r) => r.alterado_por).filter(Boolean))];
      const [vs, ps] = await Promise.all([
        ids.length ? supabase.from("veiculos").select("id, modelo, placa").in("id", ids) : { data: [] },
        uids.length ? supabase.from("perfis").select("id, nome").in("id", uids) : { data: [] },
      ]);
      const mv = Object.fromEntries((vs.data ?? []).map((v) => [v.id, v]));
      const mp = Object.fromEntries((ps.data ?? []).map((p) => [p.id, p]));
      setLinhas(rows.map((r) => ({ ...r, veiculo: mv[r.veiculo_id], autor: mp[r.alterado_por]?.nome ?? "—" })));
    })();
  }, []);
  return (
    <section style={cartao}>
      <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Histórico de alterações de veículos</h2>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)" }}>Mudanças de status, preço pretendido e preço de compra, com data e responsável. Últimas 200.</p>
      {erro && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</p>}
      {!erro && linhas.length === 0 && <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Nenhuma alteração registrada.</p>}
      {linhas.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={cabec}>Data e hora</th><th style={cabec}>Veículo</th><th style={cabec}>Campo</th>
              <th style={cabec}>De</th><th style={cabec}>Para</th><th style={cabec}>Responsável</th>
            </tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td style={td}>{new Date(l.alterado_em).toLocaleString("pt-BR")}</td>
                  <td style={td}>{l.veiculo ? `${l.veiculo.modelo} · ${l.veiculo.placa ?? "—"}` : "—"}</td>
                  <td style={td}>{CAMPOS[l.campo] ?? l.campo}</td>
                  <td style={td}>{formatar(l.campo, l.valor_anterior)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{formatar(l.campo, l.valor_novo)}</td>
                  <td style={td}>{l.autor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
