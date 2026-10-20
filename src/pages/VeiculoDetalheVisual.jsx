// sem-rascunho: a tela e o design do HTML (iframe); dados vem do banco pelo sistema
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import { ITENS, DOCUMENTACAO } from "../components/ChecklistVeiculo";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { BUCKET_FOTOS } from "../lib/fotos";
import { gerarPdfVeiculo } from "../lib/veiculoPdf";
import { excluirVeiculo } from "../lib/estoque";

const ITENS_CK = ITENS.map(([k, rot]) => [k, rot]);
const DOC_LABELS = Object.fromEntries(DOCUMENTACAO.map(([k, rot]) => [k, rot]));

async function urlParaDataUrl(url) {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
  } catch { return null; }
}

export default function VeiculoDetalheVisual() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const papel = perfil?.papel;
  const gestao = papel !== "vendedor";
  const frame = useRef(null);
  const cache = useRef(null);
  const [erro, setErro] = useState(null);

  const enviar = useCallback(() => {
    if (!cache.current) return;
    frame.current?.contentWindow?.postMessage({ type: "dados", ...cache.current, gestao, itensChecklist: ITENS_CK, docLabels: DOC_LABELS }, window.location.origin);
  }, [gestao]);

  useEffect(() => {
    if (!supabaseConfigurado || !perfil) return undefined;
    let vivo = true;
    (async () => {
      const tabela = papel === "vendedor" ? "v_veiculos_vendedor" : "veiculos";
      // Consultas independentes em paralelo
      const [vRes, fRes, cRes, finRes, vdRes, ckRes] = await Promise.all([
        supabase.from(tabela).select("*").eq("id", id).maybeSingle(),
        supabase.from("veiculo_fotos").select("id, caminho_storage, ordem_exibicao").eq("veiculo_id", id).order("ordem_exibicao"),
        gestao ? supabase.from("veiculo_custos").select("id, descricao, valor").eq("veiculo_id", id).order("criado_em") : Promise.resolve({ data: [] }),
        gestao ? supabase.from("veiculo_financiamentos").select("*").eq("veiculo_id", id).maybeSingle() : Promise.resolve({ data: null }),
        gestao ? supabase.from("veiculo_vendas").select("id, data_venda, valor_venda, despesas_venda, descontos").eq("veiculo_id", id).order("data_venda", { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from("veiculo_checklists").select("*").eq("veiculo_id", id).maybeSingle(),
      ]);
      if (!vivo) return;
      const veiculo = vRes.data;
      if (vRes.error || !veiculo) {
        const msg = vRes.error?.message || "Veículo não encontrado.";
        setErro(msg);
        cache.current = { erro: msg };
        enviar();
        return;
      }
      // Links das fotos em uma unica chamada
      const lista = fRes.data ?? [];
      let urls = {};
      if (lista.length) {
        const { data: assinadas } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(lista.map((f) => f.caminho_storage), 3600);
        urls = Object.fromEntries((assinadas ?? []).map((s) => [s.path, s.signedUrl]));
      }
      const fotos = lista.map((f) => ({ id: f.id, url: urls[f.caminho_storage] ?? null }));
      cache.current = {
        veiculo, fotos,
        custos: cRes.data ?? [],
        financiamento: finRes.data ?? null,
        vendas: vdRes.data ?? [],
        checklist: ckRes.data ?? null,
        erro: null,
      };
      enviar();
    })();
    return () => { vivo = false; };
  }, [id, papel, perfil, gestao, enviar]);

  useEffect(() => {
    const ouvir = async (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === "pronto") enviar();
      if (d.type !== "acao") return;
      if (d.acao === "voltar") navigate("/estoque");
      if (d.acao === "completo") navigate(`/estoque/${id}/completo`);
      if (d.acao === "excluir") {
        if (!window.confirm("Excluir este veículo definitivamente? Esta ação não pode ser desfeita.")) return;
        const { error } = await excluirVeiculo(id);
        if (error) { alert(`Não foi possível excluir: ${error.message}`); return; }
        navigate("/estoque");
      }
      if (d.acao === "pdf" && cache.current?.veiculo) {
        const c = cache.current;
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
        const imgs = (await Promise.all(c.fotos.filter((f) => f.url).map((f) => urlParaDataUrl(f.url)))).filter(Boolean);
        const doc = gerarPdfVeiculo({
          veiculo: c.veiculo, financiamento: c.financiamento, custos: c.custos, vendas: c.vendas,
          checklist: c.checklist, fotos: imgs, jsPDF, autoTable, ITENS, DOCUMENTACAO,
        });
        doc.save(`veiculo-${(c.veiculo.modelo || "veiculo").toLowerCase().replace(/\\s+/g, "-")}.pdf`);
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [id, navigate, enviar]);

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header subtitle="Detalhes do veículo" />
        {erro && <div style={{ padding: 16, fontSize: 13, fontWeight: 600 }}>{erro}</div>}
        <iframe
          ref={frame}
          src="/calculadora-veiculo.html"
          title="Detalhes do veículo"
          onLoad={enviar}
          style={{ display: "block", width: "100%", flex: 1, minHeight: 0, border: 0 }}
        />
      </div>
    </PageTransition>
  );
}
