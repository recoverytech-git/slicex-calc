import { useState, useCallback, useEffect } from "react";
import { validarDataVenda } from "../lib/juros";
import { useNavigate } from "react-router-dom";
import PopupVendaRegistrada from "./PopupVendaRegistrada";
import { BadgeDollarSign } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import MoneyField from "./MoneyField";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const hoje = () => new Date().toISOString().slice(0, 10);

export default function VendaVeiculo({ veiculoId, onSucesso }) {
  const { sessao } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hoje());
  const [valor, setValor] = useState(0);
  const [despesas, setDespesas] = useState(0);
  const [descontos, setDescontos] = useState(0);
  const [obs, setObs] = useState("");
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [popup, setPopup] = useState(false);
  const [aquisicao, setAquisicao] = useState(null);
  useEffect(() => {
    supabase.from("veiculos").select("data_aquisicao, criado_em").eq("id", veiculoId).maybeSingle()
      .then(({ data: v }) => setAquisicao(v?.data_aquisicao || (v?.criado_em ? String(v.criado_em).slice(0, 10) : null)));
  }, [veiculoId]);
  const navigate = useNavigate();
  const irEstoque = useCallback(() => navigate("/estoque"), [navigate]);

  const marcarVendido = async () => {
    const { error } = await supabase.from("veiculos").update({ status: "vendido" }).eq("id", veiculoId);
    return error;
  };

  const registrar = async () => {
    setMsg(null);
    if (!(valor > 0)) { setMsg({ tipo: "erro", texto: "Informe o valor efetivo da venda." }); return; }
    if (!data) { setMsg({ tipo: "erro", texto: "Informe a data da venda." }); return; }
    const erroData = validarDataVenda(new Date(`${data}T12:00:00`), aquisicao);
    if (erroData) { setMsg({ tipo: "erro", texto: erroData }); return; }
    setSalvando(true);
    const { data: existente, error: erroBusca } = await supabase.from("veiculo_vendas").select("id").eq("veiculo_id", veiculoId).maybeSingle();
    if (erroBusca) { setSalvando(false); setMsg({ tipo: "erro", texto: `Não foi possível verificar a venda: ${erroBusca.message}` }); return; }
    if (existente) {
      await marcarVendido();
      setSalvando(false);
      setAberto(false);
      setMsg({ tipo: "ok", texto: "Este veículo já tem uma venda registrada. A lista foi atualizada." });
      onSucesso?.();
      return;
    }
    const { error } = await supabase.from("veiculo_vendas").insert({
      veiculo_id: veiculoId,
      data_venda: new Date(`${data}T12:00:00`).toISOString(),
      valor_venda: valor,
      despesas_venda: despesas,
      descontos,
      observacoes: obs || null,
      registrado_por: sessao?.user?.id,
    });
    if (error) {
      setSalvando(false);
      if (error.code === "23505") {
        setAberto(false);
        setMsg({ tipo: "ok", texto: "Este veículo já tem uma venda registrada. A lista foi atualizada." });
        setPopup(true);
        onSucesso?.();
        return;
      }
      setMsg({ tipo: "erro", texto: `Venda não registrada: ${error.message}` });
      return;
    }
    const erroStatus = await marcarVendido();
    setSalvando(false);
    setAberto(false);
    if (erroStatus) {
      setMsg({ tipo: "erro", texto: `Venda registrada, mas o status do veículo não foi atualizado: ${erroStatus.message}` });
    } else {
      setMsg({ tipo: "ok", texto: "Venda registrada. O veículo foi marcado como vendido." });
    }
    setPopup(true);
    onSucesso?.();
  };

  if (!aberto) {
    return (
      <div style={{ marginTop: 18 }}>
        {popup && <PopupVendaRegistrada onIr={irEstoque} />}
        <PrimaryButton onClick={() => setAberto(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
          <BadgeDollarSign size={15} /> Registrar venda
        </PrimaryButton>
        {msg && <div role="status" style={{ marginTop: 10, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Registro de venda</p>
      <div>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Data da venda</label>
        <input type="date" value={data} min={aquisicao || undefined} max={hoje()} onChange={(e) => setData(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14 }} />
      </div>
      <MoneyField label="Valor efetivo da venda" valor={valor} onChange={setValor} />
      <MoneyField label="Despesas da venda" valor={despesas} onChange={setDespesas} />
      <MoneyField label="Descontos concedidos" valor={descontos} onChange={setDescontos} />
      <div>
        <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Observações</label>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
          style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "10px 12px", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <PrimaryButton onClick={() => setAberto(false)} style={{ flex: 1, background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border-strong)" }}>Cancelar</PrimaryButton>
        <PrimaryButton onClick={registrar} disabled={salvando} style={{ flex: 1 }}>{salvando ? "Registrando…" : "Confirmar venda"}</PrimaryButton>
      </div>
      {msg && <div role="status" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}
    </div>
  );
}
