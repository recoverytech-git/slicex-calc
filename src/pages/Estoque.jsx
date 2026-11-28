import { calcularResumo } from "../lib/calculos";
// sem-rascunho: lista e resumo ficam no documento do design (iframe); os dados vem do banco pelo sistema
import { useCallback, useEffect, useRef, useState } from "react";
import { FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Sino from "../components/Sino";
import { listarVeiculos } from "../lib/estoque";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { BUCKET_FOTOS } from "../lib/fotos";
import { buildEstoquePDF, linhaRelatorio } from "../lib/estoqueRelatorio";
import { carregarLogo, podeFinanceiro, emitidoPor } from "../lib/relatorioPdf";
import logoPadrao from "../assets/logo.png";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";

const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

/** Regras do painel de estoque, com duas bases de venda (pela FIPE e pelo valor pretendido):
 * - Potencial FIPE = soma dos valores FIPE dos veiculos do patio
 * - Potencial acima da FIPE = soma dos valores pretendidos dos veiculos do patio
 * - Capital investido = compra + custos adicionais
 * - Lucro atual = potencial da base - capital investido
 * - Margem estimada = lucro atual / potencial da base, em %
 * - Ticket medio = (menor valor + maior valor) / 2, na mesma base */

export default function Estoque() {
  const { perfil } = useAuth();
  const vendedor = perfil?.papel === "vendedor";
  const navigate = useNavigate();
  const marca = useMarca();
  const frame = useRef(null);
  const brutos = useRef([]);
  const [itens, setItens] = useState([]);
  const [stats, setStats] = useState(null);
  const [slot, setSlot] = useState(null);
  const itensRef = useRef(itens);
  const relatorioRef = useRef({});
  const [exportacao, setExportacao] = useState(null);
  itensRef.current = itens;
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const papelRef = useRef(perfil?.papel ?? null);
  papelRef.current = perfil?.papel ?? null;
  const marcaRef = useRef(marca);
  marcaRef.current = marca;

  const enviarMarca = useCallback(() => {
    const m = marcaRef.current;
    frame.current?.contentWindow?.postMessage({ type: "marca", logoClaro: m.logo_claro || m.logo_landing_claro || null }, window.location.origin);
  }, []);

  const enviarDados = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "dados", papel: papelRef.current, itens: itensRef.current, stats: statsRef.current }, window.location.origin);
  }, []);

  useEffect(() => {
    if (perfil === undefined || !supabaseConfigurado) return undefined;
    let vivo = true;
    (async () => {
      const { data } = await listarVeiculos({ status: null, vendedor });
      if (!vivo) return;
      const lista = data ?? [];
      brutos.current = lista;
      const ids = lista.map((v) => v.id);

      // Fotos de capa (link temporario)
      const capas = {};
      if (ids.length) {
        const { data: fotos } = await supabase.from("veiculo_fotos")
          .select("veiculo_id, caminho_storage, ordem_exibicao").in("veiculo_id", ids).order("ordem_exibicao");
        const primeira = {};
        for (const f of fotos ?? []) if (!primeira[f.veiculo_id]) primeira[f.veiculo_id] = f.caminho_storage;
        const caminhos = Object.values(primeira);
        if (caminhos.length) {
          const { data: assinadas } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(caminhos, 3600);
          const porCaminho = Object.fromEntries((assinadas ?? []).map((s) => [s.path, s.signedUrl]));
          for (const [vid, cam] of Object.entries(primeira)) capas[vid] = porCaminho[cam] ?? null;
        }
      }

      // Dados financeiros e tecnicos (fora do perfil vendedor)
      const extras = {};
      const custos = {};
      const custosAd = {};
      const finMap = {};
      const metricas = {};
      let checklists = null;
      if (!vendedor && ids.length) {
        const { data: ex } = await supabase.from("veiculos").select("id, preco_compra, combustivel, cambio, cor").in("id", ids);
        for (const r of ex ?? []) extras[r.id] = r;
        const { data: cs } = await supabase.from("veiculo_custos").select("veiculo_id, valor").in("veiculo_id", ids);
        for (const c of cs ?? []) { custos[c.veiculo_id] = (custos[c.veiculo_id] || 0) + Number(c.valor || 0); custosAd[c.veiculo_id] = (custosAd[c.veiculo_id] || 0) + Number(c.valor || 0); }
        const { data: fi } = await supabase.from("veiculo_financiamentos").select("veiculo_id, total_juros").in("veiculo_id", ids);
        for (const f of fi ?? []) { custos[f.veiculo_id] = (custos[f.veiculo_id] || 0) + Number(f.total_juros || 0); finMap[f.veiculo_id] = (finMap[f.veiculo_id] || 0) + Number(f.total_juros || 0); }
        const { data: mt } = await supabase.from("v_estoque_metricas").select("veiculo_id, dias_em_estoque, juros_diario_acumulado").in("veiculo_id", ids);
        for (const m of mt ?? []) { metricas[m.veiculo_id] = m; custos[m.veiculo_id] = (custos[m.veiculo_id] || 0) + Number(m.juros_diario_acumulado || 0); }
      }
      if (ids.length) {
        const { data: ck, error: eck } = await supabase.from("veiculo_checklists").select("veiculo_id").in("veiculo_id", ids);
        if (!eck) checklists = new Set((ck ?? []).map((r) => r.veiculo_id));
      }
      if (!vivo) return;

      const mapeados = lista.map((v) => ({
        id: v.id,
        modelo: v.modelo,
        placa: v.placa,
        marca: v.marca,
        ano_modelo: v.ano_modelo,
        quilometragem: v.quilometragem,
        status: v.status,
        preco: v.preco_venda_pretendido ?? null,
        combustivel: extras[v.id]?.combustivel ?? v.combustivel ?? null,
        cambio: extras[v.id]?.cambio ?? v.cambio ?? null,
        capa: capas[v.id] ?? null,
        dias_em_estoque: metricas[v.id]?.dias_em_estoque ?? null,
        juros_diario: Number(metricas[v.id]?.juros_diario_acumulado ?? 0),
      }));
      setItens(mapeados);
      relatorioRef.current = { custosAd, finMap, metricas, extras };
      setStats(calcularResumo(lista.map((v) => ({ ...v, preco: v.preco_venda_pretendido ?? 0 })), extras, custos, checklists, vendedor));
    })();
    return () => { vivo = false; };
  }, [perfil, vendedor]);

  useEffect(() => { enviarDados(); }, [itens, stats, perfil, enviarDados]);
  useEffect(() => { enviarMarca(); }, [marca, enviarMarca]);

  useEffect(() => {
    const ouvir = async (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === "pronto") { enviarMarca(); enviarDados(); }
      if (d.type === "bell-rect") setSlot(d.rect);
      if (d.type === "abrir") navigate(`/estoque/${d.id}`);
      if (d.type === "novo") navigate("/calcula-car-novo");
      if (d.type === "exportar-pdf") {
        // Abre o popup para escolher os status que entram no relatório
        // Pop-up sempre com o estoque completo; a seleção da tela é uma opção explícita
        const ids = d.ids || [];
        if (!brutos.current.length) return;
        const todos = brutos.current;
        const presentes = Object.keys(ROTULO).filter((st) => todos.some((v) => v.status === st));
        setExportacao({ base: todos, idsTela: ids, usarTela: false, escolhidos: presentes });;
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [navigate, enviarMarca, enviarDados]);

  const emitirRelatorio = async () => {
    if (!exportacao) return;
    const ativa = exportacao.usarTela && exportacao.idsTela.length ? exportacao.base.filter((v) => exportacao.idsTela.includes(v.id)) : exportacao.base;
    const lista = ativa.filter((v) => exportacao.escolhidos.includes(v.status));
    setExportacao(null);
    if (!lista.length) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const logo = await carregarLogo(marcaRef.current?.logo_claro || logoPadrao);
    const presentes = Object.keys(ROTULO).filter((st) => ativa.some((v) => v.status === st));
    const todos = exportacao.escolhidos.length === presentes.length;
    buildEstoquePDF({ jsPDF, autoTable, itens: lista.map((v) => linhaRelatorio(v, relatorioRef.current)), rotulos: ROTULO, logo, financeiro: podeFinanceiro(perfil?.papel), emitido: emitidoPor(perfil) })
      .save(todos ? "estoque-todos.pdf" : "estoque-selecionados.pdf");
  };

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header subtitle="Estoque de veículos" />
        {exportacao && (() => {
          const ativa = exportacao.usarTela && exportacao.idsTela.length ? exportacao.base.filter((v) => exportacao.idsTela.includes(v.id)) : exportacao.base;
          const presentes = Object.keys(ROTULO).filter((st) => ativa.some((v) => v.status === st));
          const alternar = (st) => setExportacao((p) => ({ ...p, escolhidos: p.escolhidos.includes(st) ? p.escolhidos.filter((x) => x !== st) : [...p.escolhidos, st] }));
          const alternarTela = (on) => setExportacao((p) => {
            const nova = on && p.idsTela.length ? p.base.filter((v) => p.idsTela.includes(v.id)) : p.base;
            return { ...p, usarTela: on, escolhidos: Object.keys(ROTULO).filter((st) => nova.some((v) => v.status === st)) };
          });
          const total = ativa.filter((v) => exportacao.escolhidos.includes(v.status)).length;
          return (
            <div role="dialog" aria-label="Emitir relatório de estoque" onClick={(e) => { if (e.target === e.currentTarget) setExportacao(null); }}
              style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(15,23,42,.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: 22, width: "100%", maxWidth: 420, boxShadow: "0 30px 60px -20px rgba(15,23,42,.4)", border: "1px solid rgba(226,232,240,.8)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #dbeafe" }}><FileDown size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 16 }}>Emitir relatório de estoque</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Cada status sai em uma seção separada</div>
                  </div>
                </div>
                {exportacao.idsTela.length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={exportacao.usarTela} onChange={(e) => alternarTela(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                    Usar apenas os {exportacao.idsTela.length} veículos selecionados na tela
                  </label>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {presentes.map((st) => {
                    const qtd = ativa.filter((v) => v.status === st).length;
                    const marcado = exportacao.escolhidos.includes(st);
                    return (
                      <label key={st} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderRadius: 12, border: `1px solid ${marcado ? "#bfdbfe" : "#e2e8f0"}`, background: marcado ? "#eff6ff" : "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input type="checkbox" checked={marcado} onChange={() => alternar(st)} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                          {ROTULO[st]}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{qtd}</span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                  <button type="button" onClick={() => setExportacao(null)} style={{ height: 42, padding: "0 16px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
                  <button type="button" disabled={!total} onClick={() => emitirRelatorio()} style={{ height: 42, padding: "0 18px", borderRadius: 12, border: "none", background: total ? "#2563eb" : "#94a3b8", color: "#fff", fontWeight: 700, cursor: total ? "pointer" : "not-allowed", boxShadow: "0 8px 16px -4px rgba(37,99,235,.35)" }}>Emitir PDF ({total})</button>
                </div>
              </div>
            </div>
          );
        })()}

        <iframe
          ref={frame}
          src="/calculadora-estoque.html"
          title="Estoque de veículos"
          onLoad={() => { enviarMarca(); enviarDados(); }}
          style={{ display: "block", width: "100%", flex: 1, minHeight: 0, border: 0 }}
        />
      </div>
    </PageTransition>
  );
}
