import { useEffect, useState } from "react";
import { ClipboardCheck, Save } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const ITENS = [
  ["ipva_pago", "IPVA pago"],
  ["licenciamento_em_dia", "Licenciamento em dia"],
  ["multas_verificadas", "Multas verificadas"],
  ["pneus_boas_condicoes", "Pneus em boas condições"],
  ["manual_disponivel", "Manual do proprietário"],
  ["chave_reserva_disponivel", "Chave reserva"],
  ["historico_manutencao_disponivel", "Histórico de manutenção"],
];
const DOCUMENTACAO = [["conferida", "Conferida"], ["pendente", "Pendente"], ["nao_informado", "Não informado"]];
export const CHECKLIST_INICIAL = Object.fromEntries([
  ...ITENS.map(([k]) => [k, null]), ["documentacao_status", "nao_informado"], ["observacoes", ""],
]);

function Tri({ valor, onChange }) {
  const opcoes = [[true, "Sim"], [false, "Não"], [null, "Não informado"]];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opcoes.map(([v, rotulo]) => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: "1px solid var(--border-strong)",
            background: valor === v ? "var(--surface-3)" : "transparent",
            color: valor === v ? "var(--text)" : "var(--text-mute)" }}>
          {rotulo}
        </button>
      ))}
    </div>
  );
}

/**
 * Sem `valor`: modo salvo (carrega e grava pelo veiculoId).
 * Com `valor` + `onMudar`: modo controlado (usado no Calcula-Car, antes de salvar).
 */
export default function ChecklistVeiculo({ veiculoId, valor, onMudar }) {
  const { sessao } = useAuth();
  const [local, setLocal] = useState(CHECKLIST_INICIAL);
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const controlado = valor !== undefined;
  const form = controlado ? valor : local;
  const setForm = (novo) => (controlado ? onMudar(novo) : setLocal(novo));

  useEffect(() => {
    if (controlado || !veiculoId || !supabaseConfigurado) return;
    supabase.from("veiculo_checklists").select("*").eq("veiculo_id", veiculoId).maybeSingle()
      .then(({ data }) => { if (data) setLocal({ ...CHECKLIST_INICIAL, ...data }); });
  }, [veiculoId, controlado]);

  const salvar = async () => {
    setMsg(null);
    setSalvando(true);
    const { error } = await supabase.from("veiculo_checklists").upsert({
      veiculo_id: veiculoId,
      ...Object.fromEntries(ITENS.map(([k]) => [k, form[k]])),
      documentacao_status: form.documentacao_status,
      observacoes: form.observacoes || null,
      atualizado_por: sessao?.user?.id,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "veiculo_id" });
    setSalvando(false);
    setMsg(error ? { tipo: "erro", texto: `Não foi salvo: ${error.message}` } : { tipo: "ok", texto: "Checklist salvo." });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!controlado && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardCheck size={15} /> Checklist do veículo
        </p>
      )}
      {ITENS.map(([k, rotulo]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--text)" }}>{rotulo}</span>
          <Tri valor={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} />
        </div>
      ))}
      <div>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Documentação</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DOCUMENTACAO.map(([v, rotulo]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, documentacao_status: v })}
              style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: "1px solid var(--border-strong)",
                background: form.documentacao_status === v ? "var(--surface-3)" : "transparent",
                color: form.documentacao_status === v ? "var(--text)" : "var(--text-mute)" }}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Observações</label>
        <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3}
          style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
      </div>
      {veiculoId && !controlado && (
        <PrimaryButton onClick={salvar} disabled={salvando} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Save size={15} /> {salvando ? "Salvando…" : "Salvar checklist"}
        </PrimaryButton>
      )}
      {msg && <div role="status" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}
    </div>
  );
}
