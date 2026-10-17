import { useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import Modal from "./Modal";
import UploadFotos from "./UploadFotos";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: "16px 18px", marginTop: 14 };
const PAPEIS_CADASTRO = ["admin_master", "proprietario", "gerente", "vendedor"];

export default function SalvarNoEstoque({ dados, onConcluido }) {
  const { sessao, supabaseConfigurado, perfil } = useAuth();
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [veiculoId, setVeiculoId] = useState(null);

  if (!supabaseConfigurado || !sessao) return null;
  if (!PAPEIS_CADASTRO.includes(perfil?.papel)) return null;

  // Monta o pacote enviado ao banco (uma única chamada, atômica)
  const montarPacote = () => {
    const f = dados.financiamento;
    return {
      p_dados: {
        modelo: dados.modelo?.trim(), placa: dados.placa, renavam: dados.renavam, chassi: dados.chassi,
        ano_fabricacao: dados.anoFab || null, ano_modelo: dados.anoMod || null, cor: dados.cor,
        quilometragem: dados.km || null, combustivel: dados.combustivel, cambio: dados.cambio,
        preco_compra: dados.compra, valor_fipe: dados.fipe, preco_venda_pretendido: dados.valorVenda,
        tipo_aquisicao: dados.tipoCapital === "Financiamento" ? "financiamento" : "capital_proprio",
      },
      p_custos: (dados.custos ?? []).map((c) => ({ descricao: c.descricao, valor: c.valor })),
      p_financiamento: f ? {
        valor_financiado: f.pv, taxa: f.taxa, prazo: f.n,
        sistema: f.sistema === "SAC" ? "sac" : "price",
        valor_parcela: f.rows[0]?.parcela ?? null, total_juros: f.totalJuros,
        dados_calculo: { total_pago: f.totalPago },
      } : null,
      p_parcelas: f ? f.rows.map((r) => ({ mes: r.mes, parcela: r.parcela, amortizacao: r.amortizacao, juros: r.juros, saldo: r.saldo })) : [],
      p_checklist: dados.checklist ?? null,
    };
  };

  const salvar = async () => {
    setEstado(null);
    if (!dados.modelo?.trim()) { setEstado({ tipo: "erro", texto: "Informe o modelo do veículo antes de salvar." }); return; }
    setSalvando(true);
    const { data: id, error } = await supabase.rpc("cadastrar_veiculo", montarPacote());
    setSalvando(false);
    if (error) { setEstado({ tipo: "erro", texto: error.message }); return; }
    setVeiculoId(id);
  };

  const concluir = () => {
    setVeiculoId(null);
    setEstado(null);
    onConcluido?.();
  };

  return (
    <div style={card}>
      <PrimaryButton onClick={salvar} disabled={salvando}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
        <Save size={16} /> {salvando ? "Salvando…" : "Salvar no estoque"}
      </PrimaryButton>
      {estado && (
        <div role="status" style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600,
          background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>
          {estado.texto}
        </div>
      )}
      <Modal open={Boolean(veiculoId)} onClose={concluir} title="Veículo salvo"
        footer={<PrimaryButton onClick={concluir} style={{ width: "100%" }}>Concluir e limpar formulário</PrimaryButton>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "var(--text)" }}>
            <CheckCircle2 size={22} /> <span>Veículo salvo no estoque com sucesso.</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>
            Você pode adicionar as fotos agora, ou depois no detalhe do veículo.
          </p>
          {veiculoId && <UploadFotos veiculoId={veiculoId} />}
        </div>
      </Modal>
    </div>
  );
}
