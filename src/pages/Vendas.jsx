// sem-rascunho: página somente de consulta, sem formulário
import { useEffect, useState } from "react";
import { BadgeDollarSign, Car, Coins, TrendingUp, Trash2, ListChecks } from "lucide-react";
import ResumoVendas from "../components/ResumoVendas";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import DbCabeca from "../components/DbCabeca";
import { DB_CSS } from "../components/dbEstilos";
import { BUCKET_FOTOS } from "../lib/fotos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { formatarBRL } from "../lib/moeda";
import { useAuth } from "../lib/auth";

const VD_CSS = `
.vd-lift{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.vd-lift:hover{transform:translateY(-2px);box-shadow:0 1px 3px rgba(15,23,42,.04),0 18px 32px -12px rgba(15,23,42,.14)}
.vd-row{transition:background .2s}
.vd-row td{transition:background .2s}
.vd-row:hover td{background:#f8fafc}
.vd-enter{animation:vdIn .5s cubic-bezier(.16,1,.3,1) both}
@keyframes vdIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.vd-del{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
.vd-del:hover{background:#fee2e2;box-shadow:0 6px 14px -6px rgba(185,28,28,.35)}
.vd-tabela table{min-width:760px}
.vd-cell-veic{font-weight:700;color:var(--text)}
.vd-data{color:var(--text-mute);font-variant-numeric:tabular-nums}
@media (max-width:639px){.vd-hide-sm{display:none}.vd-tabela table{min-width:0}}
`;

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

  const indicador = (rot, valor, Icone, cor, sub) => (
    <div className="db-kpi vd-lift">
      <div className="db-kpi-top"><span className="db-kpi-l">{rot}</span><span className="db-kpi-ic"><Icone size={16} /></span></div>
      <div className="db-kpi-v" style={cor ? { color: cor } : undefined}>{valor}</div>
      {sub && <div className="db-kpi-s">{sub}</div>}
    </div>
  );

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{DB_CSS + VD_CSS}</style>
        <Header subtitle="Veículos vendidos" />
        <main className="db-wrap">
          <BackLink />
          <header className="db-head">
            <div>
              <div className="db-eyebrow">Vendas concretizadas</div>
              <h1 className="db-title"><BadgeDollarSign size={24} /> Veículos vendidos</h1>
              <p className="db-sub">Faturamento, ágio e resultado final de cada venda.</p>
            </div>
          </header>

          <div className="db-kgrid">
            {indicador("Veículos vendidos", linhas.length, Car, null, "total registrado")}
            {indicador("Faturamento", formatarBRL(faturamento), Coins, null, "soma dos valores vendidos")}
            {gestao && indicador("Resultado final total", formatarBRL(resultado), TrendingUp, resultado < 0 ? "#b91c1c" : "#059669", "após custos de cada venda")}
          </div>

          <ResumoVendas />

          {erro && <section className="db-card"><p className="db-note" style={{ color: "#b91c1c", fontWeight: 700 }}>Não foi possível carregar: {erro}</p></section>}
          {!erro && linhas.length === 0 && <section className="db-card"><p className="db-empty">Nenhuma venda registrada ainda.</p></section>}

          {linhas.length > 0 && (
            <section className="db-card">
              <DbCabeca Icone={ListChecks} titulo="Vendas registradas" sub={`${linhas.length} venda(s), da mais recente para a mais antiga`} />
              <div className="vd-tabela db-tbl-wrap">
                <table className="db-tbl">
                  <thead><tr>
                    <th>Veículo</th>
                    <th>Data</th>
                    <th className="db-r">Venda</th>
                    {gestao && <th className="db-r vd-hide-sm">Investimento</th>}
                    {gestao && <th className="db-r">Resultado final</th>}
                    {gestao && <th className="db-r">%</th>}
                    {admin && <th className="db-r">Ações</th>}
                  </tr></thead>
                  <tbody>
                    {linhas.map((l, i) => {
                      const positivo = Number(l.resultado_final) >= 0;
                      return (
                        <tr key={l.venda_id} className="vd-row vd-enter" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                          <td className="vd-cell-veic">{l.modelo}{gestao && l.placa ? ` · ${l.placa}` : ""}</td>
                          <td className="vd-data">{dataBR(l.data_venda)}</td>
                          <td className="db-r">{formatarBRL(l.valor_venda)}</td>
                          {gestao && <td className="db-r vd-hide-sm" style={{ color: "var(--text-mute)" }}>{formatarBRL(l.investimento_total)}</td>}
                          {gestao && <td className="db-r" style={{ fontWeight: 800, color: positivo ? "#059669" : "#b91c1c" }}>{formatarBRL(l.resultado_final)}</td>}
                          {gestao && <td className="db-r"><span className={`db-pill ${positivo ? "db-pill-verde" : "db-pill-verm"}`}>{pct(l.resultado_final, l.investimento_total)}</span></td>}
                          {admin && <td className="db-r"><button type="button" className="vd-del" onClick={() => excluirDefinitivo(l)}><Trash2 size={13} /> Excluir definitivamente</button></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
