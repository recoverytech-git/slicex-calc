// sem-rascunho: lista e resumo ficam no documento do design (iframe); os dados vem do banco pelo sistema
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import Sino from "../components/Sino";
import { listarVeiculos } from "../lib/estoque";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { BUCKET_FOTOS } from "../lib/fotos";
import { buildEstoquePDF } from "../lib/estoqueRelatorio";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";

const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

/** Resumo calculado com as mesmas regras do painel: pátio = tudo que não está vendido; lucro = venda − compra − custos. */
function calcularResumo(itens, extras, custos, checklists, vendedor) {
  const patio = itens.filter((v) => v.status !== "vendido");
  const total = patio.length;
  const valorTotal = patio.reduce((s, v) => s + Number(v.preco || 0), 0);
  const precos = patio.map((v) => Number(v.preco || 0)).filter((p) => p > 0);
  const ticket = total ? valorTotal / total : 0;
  const min = precos.length ? Math.min(...precos) : 0;
  const max = precos.length ? Math.max(...precos) : 0;
  const checados = checklists ? patio.filter((v) => checklists.has(v.id)).length : null;
  let lucro = null;
  let margem = null;
  if (!vendedor) {
    // Margem = valor total em patio - valor total de compra dos veiculos
    const compraTotal = patio.reduce((s, v) => s + Number(extras[v.id]?.preco_compra || 0), 0);
    lucro = valorTotal - compraTotal;
    margem = valorTotal > 0 ? (lucro / valorTotal) * 100 : 0;
  }
  return { total, valorTotal, ticket, min, max, checados, lucro, margem };
}

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
      let checklists = null;
      if (!vendedor && ids.length) {
        const { data: ex } = await supabase.from("veiculos").select("id, preco_compra, combustivel, cambio, cor").in("id", ids);
        for (const r of ex ?? []) extras[r.id] = r;
        const { data: cs } = await supabase.from("veiculo_custos").select("veiculo_id, valor").in("veiculo_id", ids);
        for (const c of cs ?? []) custos[c.veiculo_id] = (custos[c.veiculo_id] || 0) + Number(c.valor || 0);
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
      }));
      setItens(mapeados);
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
      if (d.type === "novo") navigate("/calcula-car");
      if (d.type === "exportar-pdf") {
        const ids = d.ids || [];
        const filtrados = brutos.current.filter((v) => ids.includes(v.id));
        if (!filtrados.length) return;
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
        buildEstoquePDF({ jsPDF, autoTable, itens: filtrados, rotulos: ROTULO }).save("estoque.pdf");
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [navigate, enviarMarca, enviarDados]);

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header subtitle="Estoque de veículos" />
        <BackLink />
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
