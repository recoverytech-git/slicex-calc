import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import DbCabeca from "./DbCabeca";

// Alerta apenas para a gestao: reservados, ou vendidos sem registro de venda, ha mais de X dias
const GESTAO = ["admin_master", "proprietario", "gerente"];
const DIA_MS = 86400000;

export default function AlertaBaixaPendente() {
  const { perfil } = useAuth();
  const [limite, setLimite] = useState(15);
  const [lista, setLista] = useState([]);
  const gestao = GESTAO.includes(perfil?.papel);

  useEffect(() => {
    if (!gestao || !supabaseConfigurado) return;
    (async () => {
      const { data: vs } = await supabase.from("veiculos").select("id, modelo, placa, status, criado_em").in("status", ["vendido", "reservado"]);
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
      setLista((vs ?? []).map((v) => {
        const desde = ultima[v.id] || v.criado_em;
        const dias = Math.floor((agora - new Date(desde).getTime()) / DIA_MS);
        const motivo = v.status === "vendido" ? "Vendido sem registro de venda" : "Reservado";
        return { ...v, dias, motivo, pendente: v.status === "reservado" || (v.status === "vendido" && !comVenda.has(v.id)) };
      }).filter((v) => v.pendente && v.dias > limite).sort((a, b) => b.dias - a.dias));
    })();
  }, [gestao, limite]);

  if (!gestao) return null;
  return (
    <section className="db-card">
      <DbCabeca Icone={BellRing} titulo="Baixas pendentes" sub={`Reservados, ou vendidos sem registro de venda, há mais de ${limite} dias`}
        acao={<div className="db-chips">{[7, 15, 30].map((x) => (
          <button key={x} type="button" className={`db-chip ${limite === x ? "on" : ""}`} onClick={() => setLimite(x)}>{x}+ dias</button>
        ))}</div>} />
      {lista.length === 0 ? <p className="db-note">Nenhuma baixa pendente.</p> : (
        <div className="db-tbl-wrap">
          <table className="db-tbl">
            <thead><tr><th>Modelo</th><th>Placa</th><th>Situação</th><th className="db-r">Dias</th></tr></thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }}>{v.modelo || "—"}</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{v.placa || "—"}</td>
                  <td><span className="db-pill db-pill-verm">{v.motivo}</span></td>
                  <td className="db-r" style={{ fontWeight: 800 }}>{v.dias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
