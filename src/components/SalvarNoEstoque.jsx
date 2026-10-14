import { useState } from "react";
import { Save } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import { useAuth } from "../lib/auth";
import { buscarDuplicado, salvarVeiculo } from "../lib/estoque";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: "16px 18px", marginTop: 14 };

export default function SalvarNoEstoque({ dados }) {
  const { sessao, supabaseConfigurado } = useAuth();
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  if (!supabaseConfigurado || !sessao) return null;

  const salvar = async () => {
    setEstado(null);
    if (!dados.modelo?.trim()) {
      setEstado({ tipo: "erro", texto: "Informe o modelo do veículo antes de salvar." });
      return;
    }
    setSalvando(true);
    try {
      const dup = await buscarDuplicado({ placa: dados.placa, renavam: dados.renavam, chassi: dados.chassi });
      if (dup.error) {
        setEstado({ tipo: "erro", texto: `Não foi possível verificar duplicidade: ${dup.error.message}` });
        return;
      }
      if (dup.data) {
        setEstado({ tipo: "erro", texto: `Já existe no estoque: ${dup.data.modelo}${dup.data.placa ? ` (placa ${dup.data.placa})` : ""}.` });
        return;
      }
      const { error } = await salvarVeiculo({
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
        observacoes: dados.observacoes || null,
      });
      setEstado(error
        ? { tipo: "erro", texto: `Não foi salvo: ${error.message}` }
        : { tipo: "ok", texto: "Veículo salvo no estoque." });
    } finally {
      setSalvando(false);
    }
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
    </div>
  );
}
