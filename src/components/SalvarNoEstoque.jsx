import { useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import Modal from "./Modal";
import UploadFotos from "./UploadFotos";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { buscarDuplicado, salvarVeiculo } from "../lib/estoque";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: "16px 18px", marginTop: 14 };

export default function SalvarNoEstoque({ dados, onConcluido }) {
  const { sessao, supabaseConfigurado, perfil } = useAuth();
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [veiculoId, setVeiculoId] = useState(null);

  if (!supabaseConfigurado || !sessao) return null;
  if (!["proprietario", "admin_master"].includes(perfil?.papel)) {
    return (
      <div style={card}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>Somente o lojista pode cadastrar veículos no estoque.</p>
      </div>
    );
  }

  // Grava custos e financiamento ligados ao veículo recém-criado
  const gravarFilhos = async (vid) => {
    const uid = sessao.user.id;
    if (dados.custos?.length) {
      const { error } = await supabase.from("veiculo_custos").insert(
        dados.custos.map((c) => ({ veiculo_id: vid, descricao: c.descricao, valor: c.valor, criado_por: uid })));
      if (error) throw new Error(`custos: ${error.message}`);
    }
    const f = dados.financiamento;
    if (f) {
      const { data: fin, error } = await supabase.from("veiculo_financiamentos").insert({
        veiculo_id: vid,
        valor_financiado: f.pv,
        taxa_juros_percentual: f.taxa,
        periodicidade_taxa: "mensal",
        quantidade_parcelas: f.n,
        sistema_amortizacao: f.sistema === "SAC" ? "sac" : "price",
        valor_parcela: f.rows[0]?.parcela ?? null,
        total_juros: f.totalJuros,
        dados_calculo: { total_pago: f.totalPago },
        criado_por: uid,
      }).select("id").single();
      if (error) throw new Error(`financiamento: ${error.message}`);
      const linhas = f.rows.map((r) => ({
        financiamento_id: fin.id, parcela_numero: r.mes, valor_parcela: r.parcela,
        amortizacao: r.amortizacao, juros: r.juros, saldo_devedor: r.saldo,
      }));
      for (let i = 0; i < linhas.length; i += 500) {
        const { error: ep } = await supabase.from("veiculo_financiamento_parcelas").insert(linhas.slice(i, i + 500));
        if (ep) throw new Error(`parcelas: ${ep.message}`);
      }
    }
  };

  const salvar = async () => {
    setEstado(null);
    if (!dados.modelo?.trim()) { setEstado({ tipo: "erro", texto: "Informe o modelo do veículo antes de salvar." }); return; }
    setSalvando(true);
    try {
      const dup = await buscarDuplicado({ placa: dados.placa, renavam: dados.renavam, chassi: dados.chassi });
      if (dup.error) { setEstado({ tipo: "erro", texto: `Não foi possível verificar duplicidade: ${dup.error.message}` }); return; }
      if (dup.data) { setEstado({ tipo: "erro", texto: `Já existe no estoque: ${dup.data.modelo}${dup.data.placa ? ` (placa ${dup.data.placa})` : ""}.` }); return; }

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

      try {
        await gravarFilhos(criado.id);
      } catch (e) {
        // Desfaz o veículo para não deixar cadastro incompleto
        await supabase.rpc("excluir_veiculo", { p_id: criado.id });
        setEstado({ tipo: "erro", texto: `Não foi salvo (${e.message}). Nada foi gravado.` });
        return;
      }
      setVeiculoId(criado.id);
    } finally {
      setSalvando(false);
    }
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
