import { useEffect, useState } from "react";
import { ClipboardCheck, Pencil, Save, X } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export const ITENS = [
  ["direcao_eletrica", "Direção hidráulica/elétrica"],
  ["vidros_eletricos", "Vidros elétricos"],
  ["travas_eletricas", "Travas elétricas"],
  ["ar_condicionado", "Ar condicionado"],
  ["rodas_liga_leve", "Rodas de liga leve"],
  ["multimidia", "Multimídia"],
  ["bancos_couro", "Bancos em couro"],
  ["airbag", "Airbag"],
  ["ipva_pago", "IPVA pago"],
  ["licenciamento_em_dia", "Licenciamento em dia"],
  ["multas_verificadas", "Multas verificadas"],
  ["pneus_boas_condicoes", "Pneus em boas condições"],
  ["manual_disponivel", "Manual do proprietário"],
  ["chave_reserva_disponivel", "Chave reserva"],
  ["historico_manutencao_disponivel", "Histórico de manutenção"],
];
export const DOCUMENTACAO = [["conferida", "Conferida"], ["pendente", "Pendente"], ["nao_informado", "Não informado"]];
export const CHECKLIST_INICIAL = Object.fromEntries([
  ...ITENS.map(([k]) => [k, null]), ["documentacao_status", "nao_informado"], ["observacoes", ""],
]);
const rotuloSimNao = (v) => (v === true ? "Sim" : v === false ? "Não" : "Não informado");
const rotuloDoc = (v) => DOCUMENTACAO.find(([k]) => k === v)?.[1] ?? "Não informado";

function Tri({ valor, onChange }) {
  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 14, background: "#eff4ff", border: "1px solid #d3e4fe" }}>
      {[[true, "Sim", "#10b981"], [false, "Não", "#ba1a1a"], [null, "Não informado", null]].map(([v, rotulo, cor]) => {
        const ativo = valor === v;
        return (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            style={{ padding: "6px 12px", borderRadius: 10, border: 0, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s ease",
              background: ativo ? (cor || "#fff") : "transparent",
              color: ativo ? (cor ? "#fff" : "#0b1c30") : "#434655",
              boxShadow: ativo ? (cor ? `0 2px 6px ${cor}55` : "0 1px 3px rgba(11,28,48,.12), inset 0 0 0 1px #c3c6d7") : "none" }}>
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sem `valor` e com `veiculoId`: modo salvo. Abre bloqueado; só libera com o botão Editar
 * (quem tem permissão, `podeEditar`). Com `valor` + `onMudar`: modo controlado (Calcula-Car).
 */
export default function ChecklistVeiculo({ veiculoId, valor, onMudar, podeEditar = false, onSalvo }) {
  const { sessao } = useAuth();
  const [local, setLocal] = useState(CHECKLIST_INICIAL);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const controlado = valor !== undefined;
  const form = controlado ? valor : local;
  const setForm = (novo) => (controlado ? onMudar(novo) : setLocal(novo));
  const bloqueado = !controlado && !editando;

  const carregarSalvo = () => {
    if (!veiculoId || !supabaseConfigurado) return;
    supabase.from("veiculo_checklists").select("*").eq("veiculo_id", veiculoId).maybeSingle()
      .then(({ data }) => setLocal(data ? { ...CHECKLIST_INICIAL, ...data } : CHECKLIST_INICIAL));
  };
  useEffect(() => { if (!controlado) carregarSalvo(); /* eslint-disable-next-line */ }, [veiculoId, controlado]);

  const salvar = async () => {
    setMsg(null);
    setSalvando(true);
    const { error } = await supabase.from("veiculo_checklists").upsert({
      veiculo_id: veiculoId,
      ...Object.fromEntries(ITENS.map(([k]) => [k, local[k]])),
      documentacao_status: local.documentacao_status,
      observacoes: local.observacoes || null,
      atualizado_por: sessao?.user?.id,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "veiculo_id" });
    setSalvando(false);
    if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
    setEditando(false);
    setMsg({ tipo: "ok", texto: "Checklist salvo." });
    onSalvo?.();
  };

  const cancelar = () => { setEditando(false); setMsg(null); carregarSalvo(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!controlado && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardCheck size={15} /> Checklist do veículo
          </p>
          {podeEditar && !editando && (
            <button onClick={() => setEditando(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 12px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>
      )}

      {ITENS.map(([k, rotulo]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--text)" }}>{rotulo}</span>
          {bloqueado
            ? <span style={{ fontSize: 13, fontWeight: 600, color: form[k] === true ? "var(--accent)" : "var(--text-dim)" }}>{rotuloSimNao(form[k])}</span>
            : <Tri valor={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} />}
        </div>
      ))}

      <div>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Documentação</label>
        {bloqueado
          ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{rotuloDoc(form.documentacao_status)}</span>
          : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DOCUMENTACAO.map(([v, rotulo]) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, documentacao_status: v })}
                  style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: "1px solid var(--border-strong)",
                    background: form.documentacao_status === v ? "rgba(68,147,248,0.16)" : "transparent",
                    color: form.documentacao_status === v ? "var(--text)" : "var(--text-mute)" }}>
                  {rotulo}
                </button>
              ))}
            </div>}
      </div>

      <div>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Observações</label>
        {bloqueado
          ? <p style={{ margin: 0, fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>{form.observacoes || "—"}</p>
          : <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3}
              style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />}
      </div>

      {!controlado && editando && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <PrimaryButton onClick={cancelar} style={{ background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <X size={14} /> Cancelar
          </PrimaryButton>
          <PrimaryButton onClick={salvar} disabled={salvando} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Save size={14} /> {salvando ? "Salvando…" : "Salvar checklist"}
          </PrimaryButton>
        </div>
      )}
      {msg && <div role="status" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}
    </div>
  );
}
