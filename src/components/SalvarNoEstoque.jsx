import { useState } from "react";
import { Save } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import UploadFotos from "./UploadFotos";
import ChecklistVeiculo from "./ChecklistVeiculo";
import Modal from "./Modal";
import { useAuth } from "../lib/auth";
import { buscarDuplicado, salvarVeiculo } from "../lib/estoque";
import { supabase } from "../lib/supabase";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: "16px 18px", marginTop: 14 };
const LOTE = 300;

/**
 * Salva o veículo e, em seguida, seus custos e financiamento (com parcelas).
 * Ao concluir, mostra o popup de sucesso e chama onSucesso para limpar o formulário.
 */
export default function SalvarNoEstoque({ dados, onSucesso }) {
  const { sessao, supabaseConfigurado, perfil } = useAuth();
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [veiculoId, setVeiculoId] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  if (!supabaseConfigurado || !sessao) return null;
  if (!["proprietario", "admin_master"].includes(perfil?.papel)) {
    return (
      <div style={card}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>Somente o lojista pode cadastrar veículos no estoque.</p>
      </div>
    );
  }

  const salvarFilhos = async (veiculo) => {
    const userId = sessao.user.id;
    const custos = (dados.custos ?? []).map((c) => ({ veiculo_id: veiculo.id, descricao: c.descricao, valor: c.valor, criado_por: userId }));
    if (custos.length) {
      const { error } = await supabase.from("veiculo_custos").insert(custos);
      if (error) throw new Error(`os custos não foram gravados (${error.message})`);
    }
    const fin = dados.financiamento;
    if (dados.tipoCapital === "Financiamento" && fin) {
      const { data: f, error } = await supabase.from("veiculo_financiamentos").insert({
        veiculo_id: veiculo.id,
        valor_financiado: fin.pv,
        taxa_juros_percentual: fin.taxa,
        periodicidade_taxa: "mensal",
        quantidade_parcelas: fin.n,
        sistema_amortizacao: fin.sistema,
        valor_parcela: fin.rows[0]?.parcela ?? null,
        total_juros: fin.totalJuros,
        dados_calculo: { total_pago: fin.totalPago },
        criado_por: userId,
      }).select("id").single();
      if (error) throw new Error(`o financiamento não foi gravado (${error.message})`);
      const parcelas = fin.rows.map((r) => ({
        financiamento_id: f.id, parcela_numero: r.mes, valor_parcela: r.parcela,
        amortizacao: r.amortizacao, juros: r.juros, saldo_devedor: r.saldo,
      }));
      for (let i = 0; i < parcelas.length; i += LOTE) {
        const { error: erroParcela } = await supabase.from("veiculo_financiamento_parcelas").insert(parcelas.slice(i, i + LOTE));
        if (erroParcela) throw new Error(`as parcelas não foram gravadas (${erroParcela.message})`);
      }
    }
  };

  const salvar = async () => {
    setEstado(null);
    if (!dados.modelo?.trim()) {
      setEstado({ tipo: "erro", texto: "Informe o modelo do veículo antes de salvar." });
      return;
    }
    setSalvando(true);
    try {
      const dup = await buscarDuplicado({ placa: dados.placa, renavam: dados.renavam, chassi: dados.chassi });
      if (dup.error) { setEstado({ tipo: "erro", texto: `Não foi possível verificar duplicidade: ${dup.error.message}` }); return; }
      if (dup.data) {
        setEstado({ tipo: "erro", texto: `Já existe no estoque: ${dup.data.modelo}${dup.data.placa ? ` (placa ${dup.data.placa})` : ""}.` });
        return;
      }
      const { data: criado, error } = await salvarVeiculo({
        modelo: dados.modelo.trim(),
        placa: dados.placa || null,
        renavam: dados.renavam || null,
        chassi: dados.chassi || null,
        preco_compra: dados.compra,
        valor_fipe: dados.fipe,
        preco_venda_pretendido: dados.valorVenda,
        tipo_aquisicao: dados.tipoCapital === "Financiamento" ? "financiamento" : "capital_proprio",
        status: "em_preparacao",
        ano_fabricacao: dados.anoFab ? parseInt(dados.anoFab, 10) : null,
        ano_modelo: dados.anoMod ? parseInt(dados.anoMod, 10) : null,
        cor: dados.cor || null,
        quilometragem: dados.km ? parseInt(dados.km, 10) : null,
        combustivel: dados.combustivel || null,
        cambio: dados.cambio || null,
      });
      if (error) { setEstado({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
      setVeiculoId(criado.id);
      try {
        await salvarFilhos(criado);
      } catch (e) {
        setEstado({ tipo: "erro", texto: `O veículo foi salvo, mas ${e.message}. Ajuste no detalhe do veículo.` });
        return;
      }
      setSucesso(true);
    } finally {
      setSalvando(false);
    }
  };

  const concluir = () => {
    setSucesso(false);
    setVeiculoId(null);
    setEstado(null);
    onSucesso?.();
  };

  return (
    <div style={card}>
      {!veiculoId && (
        <PrimaryButton onClick={salvar} disabled={salvando}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
          <Save size={16} /> {salvando ? "Salvando…" : "Salvar no estoque"}
        </PrimaryButton>
      )}
      {estado && (
        <div role="status" style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600,
          background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>
          {estado.texto}
        </div>
      )}
      {veiculoId && <UploadFotos veiculoId={veiculoId} />}
      {veiculoId && <ChecklistVeiculo veiculoId={veiculoId} />}

      <Modal open={sucesso} onClose={concluir} title="Veículo salvo"
        footer={<PrimaryButton onClick={concluir} style={{ width: "100%" }}>Cadastrar outro veículo</PrimaryButton>}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>
          O veículo <b style={{ color: "var(--text)" }}>{dados.modelo}</b> foi salvo no estoque, com os custos
          {dados.tipoCapital === "Financiamento" ? " e o financiamento" : ""}. O formulário foi limpo para o próximo cadastro.
        </p>
      </Modal>
    </div>
  );
}
