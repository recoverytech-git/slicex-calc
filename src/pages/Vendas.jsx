import ResumoVendas from "../components/ResumoVendas";
// sem-rascunho: página somente de consulta, sem formulário
import { useEffect, useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import { BUCKET_FOTOS } from "../lib/fotos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { formatarBRL } from "../lib/moeda";
import { useAuth } from "../lib/auth";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 16 };
const dataBR = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const pct = (r, base) => (base > 0 ? `${((r / base) * 100).toFixed(2)}%` : "—");

export default function Vendas() {
  const { perfil } = useAuth();
  const gestao = perfil?.papel !== "vendedor";
  const admin = perfil?.papel === "admin_master";
  const [linhas, setLinhas] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.from("v_vendas_resultado").select("*").order("data_venda", { ascending: false })
      .then(({ data, error }) => (error ? setErro(error.message) : setLinhas(data ?? [])));
  }, []);

  const faturamento = linhas.reduce((s, l) => s + Number(l.valor_venda ?? 0), 0);
  const resultado = linhas.reduce((s, l) => s + Number(l.resultado_final ?? 0), 0);


  const excluirDefinitivo = async (l) => {
    const ok = window.confirm(`Excluir definitivamente ${l.modelo}${l.placa ? ` (${l.placa})` : ""}, sua venda e todos os dados ligados a ele? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    // 1) fotos: removidas pela API de armazenamento (o banco nao pode apagar arquivos)
    const { data: fotos, error: erroFotos } = await supabase.from("veiculo_fotos").select("caminho_storage").eq("veiculo_id", l.veiculo_id);
    if (erroFotos) { setErro(erroFotos.message); return; }
    const caminhos = (fotos ?? []).map((f) => f.caminho_storage).filter(Boolean);
    if (caminhos.length) {
      const { error: erroArquivos } = await supabase.storage.from(BUCKET_FOTOS).remove(caminhos);
      if (erroArquivos) { setErro(`Não foi possível remover as fotos: ${erroArquivos.message}`); return; }
    }
    // 2) registros: veiculo, venda, custos, financiamento, parcelas, historico e demais ligados (cascata)
    const { error } = await supabase.rpc("excluir_veiculo_definitivo", { p_veiculo: l.veiculo_id });
    if (error) { setErro(error.message); return; }
    setLinhas((prev) => prev.filter((x) => x.veiculo_id !== l.veiculo_id));
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Veículos vendidos" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 14px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <BadgeDollarSign size={22} /> Veículos vendidos
          </h1>
          <ResumoVendas />

          <div className="grid-3" style={{ marginBottom: 14 }}>
            <div style={card}><p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Veículos vendidos</p><p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{linhas.length}</p></div>
            <div style={card}><p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Faturamento</p><p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{formatarBRL(faturamento)}</p></div>
            {gestao && <div style={card}><p style={{ margin: 0, fontSize: 12, color: "var(--text-mute)" }}>Resultado final total</p><p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{formatarBRL(resultado)}</p></div>}
          </div>

          {erro && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Não foi possível carregar: {erro}</p>}
          {!erro && linhas.length === 0 && <p style={{ color: "var(--text-mute)", fontSize: 13 }}>Nenhuma venda registrada ainda.</p>}

          {linhas.length > 0 && (
            <div style={{ ...card, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)", color: "var(--text-dim)", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px" }}>Veículo</th>
                    <th style={{ padding: "10px 12px" }}>Data</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Venda</th>
                    {gestao && <th style={{ padding: "10px 12px", textAlign: "right" }}>Investimento</th>}
                    {gestao && <th style={{ padding: "10px 12px", textAlign: "right" }}>Resultado final</th>}
                    {gestao && <th style={{ padding: "10px 12px", textAlign: "right" }}>%</th>}
                    {admin && <th style={{ padding: "10px 12px", textAlign: "right" }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.venda_id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--text)" }}>{l.modelo}{gestao && l.placa ? ` · ${l.placa}` : ""}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-dim)" }}>{dataBR(l.data_venda)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)" }}>{formatarBRL(l.valor_venda)}</td>
                      {gestao && <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-dim)" }}>{formatarBRL(l.investimento_total)}</td>}
                      {gestao && <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)", fontWeight: 700 }}>{formatarBRL(l.resultado_final)}</td>}
                      {gestao && <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-dim)" }}>{pct(l.resultado_final, l.investimento_total)}</td>}
                      {admin && <td style={{ padding: "10px 12px", textAlign: "right" }}><button onClick={() => excluirDefinitivo(l)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Excluir definitivamente</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
