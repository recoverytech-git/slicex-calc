import { useRascunho } from "../lib/rascunho";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, FileDown, ImageOff } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import PrimaryButton from "../components/PrimaryButton";
import { listarVeiculos, normalizar } from "../lib/estoque";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { BUCKET_FOTOS } from "../lib/fotos";
import { formatarBRL } from "../lib/moeda";
import { buildEstoquePDF } from "../lib/estoqueRelatorio";
import { useAuth } from "../lib/auth";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };
const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

export default function Estoque() {
  const { perfil } = useAuth();
  const vendedor = perfil?.papel === "vendedor";
  const [itens, setItens] = useState([]);
  const [capas, setCapas] = useState({});
  const [busca, setBusca] = useRascunho("est.busca", "");
  const [status, setStatus] = useRascunho("est.status", "");
  const [filtros, setFiltros] = useRascunho("est.filtros", { marca: "", anoMin: "", anoMax: "", precoMin: 0, precoMax: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [exportando, setExportando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (perfil === undefined) return;
    let vivo = true;
    setCarregando(true);
    listarVeiculos({ status: status || null, vendedor }).then(async ({ data, error }) => {
      if (!vivo) return;
      setErro(error?.message ?? null);
      setItens(data ?? []);
      setCarregando(false);

      const ids = (data ?? []).map((v) => v.id);
      if (!ids.length) { setCapas({}); return; }
      const { data: fotos } = await supabase.from("veiculo_fotos")
        .select("veiculo_id, caminho_storage, ordem_exibicao").in("veiculo_id", ids).order("ordem_exibicao");
      const primeiraPorVeiculo = {};
      for (const f of fotos ?? []) if (!primeiraPorVeiculo[f.veiculo_id]) primeiraPorVeiculo[f.veiculo_id] = f.caminho_storage;
      const caminhos = Object.values(primeiraPorVeiculo);
      if (!caminhos.length) { if (vivo) setCapas({}); return; }
      const { data: assinadas } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(caminhos, 3600);
      const porCaminho = Object.fromEntries((assinadas ?? []).map((s) => [s.path, s.signedUrl]));
      const out = {};
      for (const [veiculoId, caminho] of Object.entries(primeiraPorVeiculo)) out[veiculoId] = porCaminho[caminho];
      if (vivo) setCapas(out);
    });
    return () => { vivo = false; };
  }, [status, perfil]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcas = [...new Set(itens.map((v) => v.marca).filter(Boolean))].sort();
  const filtrados = useMemo(() => {
    const b = busca.trim();
    const nb = normalizar(b);
    return itens.filter((v) => {
      if (b && !(normalizar(v.placa).includes(nb) || normalizar(v.renavam).includes(nb) ||
        normalizar(v.chassi).includes(nb) || (v.modelo || "").toLowerCase().includes(b.toLowerCase()))) return false;
      if (filtros.marca && v.marca !== filtros.marca) return false;
      if (filtros.anoMin && (v.ano_modelo ?? 0) < Number(filtros.anoMin)) return false;
      if (filtros.anoMax && (v.ano_modelo ?? 9999) > Number(filtros.anoMax)) return false;
      if (filtros.precoMin > 0 && Number(v.preco_venda_pretendido ?? 0) < filtros.precoMin) return false;
      if (filtros.precoMax > 0 && Number(v.preco_venda_pretendido ?? 0) > filtros.precoMax) return false;
      return true;
    });
  }, [itens, busca, filtros]);

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      buildEstoquePDF({ jsPDF, autoTable, itens: filtrados, rotulos: ROTULO }).save("estoque.pdf");
    } finally {
      setExportando(false);
    }
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Estoque de veículos" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, margin: "22px 0 6px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
              <Car size={22} /> Estoque
            </h1>
            <PrimaryButton onClick={exportarPDF} disabled={exportando || filtrados.length === 0} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileDown size={16} /> {exportando ? "Gerando…" : "Exportar PDF"}
            </PrimaryButton>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px" }}>
            {vendedor ? "Busque pelo modelo do veículo." : "Busque por placa, RENAVAM, chassi ou modelo."}
          </p>

          {!supabaseConfigurado && (
            <div style={{ ...card, padding: 16, marginBottom: 14, fontSize: 13, color: "var(--text-dim)" }}>
              O estoque ainda não está conectado ao banco. Nenhum veículo é salvo até a conexão ser configurada.
            </div>
          )}

          <div style={{ ...card, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Marca</label>
                <select value={filtros.marca} onChange={(e) => setFiltros({ ...filtros, marca: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1.5px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "11px 13px", color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
                  <option value="">Todas</option>
                  {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <Field label="Ano a partir de" val={filtros.anoMin} set={(v) => setFiltros({ ...filtros, anoMin: v })} hint="Ex: 2018" />
              <Field label="Ano até" val={filtros.anoMax} set={(v) => setFiltros({ ...filtros, anoMax: v })} hint="Ex: 2024" />
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Preço mínimo (R$)</label>
                <MoneyField valor={filtros.precoMin} onChange={(n) => setFiltros({ ...filtros, precoMin: n })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Preço máximo (R$)</label>
                <MoneyField valor={filtros.precoMax} onChange={(n) => setFiltros({ ...filtros, precoMax: n })} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setFiltros({ marca: "", anoMin: "", anoMax: "", precoMin: 0, precoMax: 0 })} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Limpar filtros</button>
            </div>
            <Field label="Buscar" val={busca} set={setBusca} hint={vendedor ? "Modelo" : "Placa, RENAVAM, chassi ou modelo"} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["", ...Object.keys(ROTULO)].map((s) => (
                <button key={s || "todos"} onClick={() => setStatus(s)}
                  style={{ padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: "1px solid var(--border-strong)",
                    background: status === s ? "var(--surface-3)" : "transparent",
                    color: status === s ? "var(--text)" : "var(--text-mute)" }}>
                  {s ? ROTULO[s] : "Todos"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {carregando && [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 76 }} />)}
            {erro && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Não foi possível carregar: {erro}</p>}
            {!carregando && !erro && filtrados.length === 0 && (
              <p style={{ color: "var(--text-mute)", fontSize: 13 }}>Nenhum veículo encontrado.</p>
            )}
            {filtrados.map((v, i) => (
              <motion.div key={v.id} onClick={() => navigate(`/estoque/${v.id}`)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                style={{ ...card, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                  {capas[v.id] ? (
                    <img src={capas[v.id]} alt="" style={{ width: 84, height: 60, objectFit: "cover", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }} />
                  ) : (
                    <div style={{ width: 84, height: 60, borderRadius: "var(--r-sm)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageOff size={18} color="var(--text-faint)" />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{v.modelo}</div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 3 }}>
                      {!vendedor && (v.placa ? `Placa ${v.placa} · ` : "Sem placa · ")}
                      {v.ano_modelo ?? "—"} · {v.quilometragem != null ? `${Number(v.quilometragem).toLocaleString("pt-BR")} km` : "km não informado"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "var(--text)" }}>{v.preco_venda_pretendido != null ? formatarBRL(v.preco_venda_pretendido) : "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{ROTULO[v.status] ?? v.status}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
