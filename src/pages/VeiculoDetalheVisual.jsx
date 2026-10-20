// sem-rascunho: a tela e o design do HTML (iframe); dados e acoes passam pelo sistema
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
const MAX_FOTOS = 15;
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

/** Converte "R$ 1.234,56", "1234.56" ou "1234" em numero. Vazio vira null. */
function numero(v) {
  if (v == null) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const s = String(v).replace(/R\$/g, "").replace(/\s/g, "").trim();
  if (s === "") return null;
  const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}
function texto(v) {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
}

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
  const { perfil, sessao } = useAuth();
  const papel = perfil?.papel;
  const gestao = papel !== "vendedor";
  const frame = useRef(null);
  const cache = useRef(null);
  const [erro, setErro] = useState(null);
  const uid = sessao?.user?.id;

  const enviar = useCallback(() => {
    if (!cache.current) return;
    frame.current?.contentWindow?.postMessage({ type: "dados", ...cache.current, gestao, itensChecklist: ITENS_CK, docLabels: DOC_LABELS }, window.location.origin);
  }, [gestao]);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado || !perfil) return;
    const tabela = papel === "vendedor" ? "v_veiculos_vendedor" : "veiculos";
    const [vRes, fRes, cRes, finRes, vdRes, ckRes] = await Promise.all([
      supabase.from(tabela).select("*").eq("id", id).maybeSingle(),
      supabase.from("veiculo_fotos").select("id, caminho_storage, ordem_exibicao").eq("veiculo_id", id).order("ordem_exibicao"),
      gestao ? supabase.from("veiculo_custos").select("id, descricao, valor").eq("veiculo_id", id).order("criado_em") : Promise.resolve({ data: [] }),
      gestao ? supabase.from("veiculo_financiamentos").select("*").eq("veiculo_id", id).maybeSingle() : Promise.resolve({ data: null }),
      gestao ? supabase.from("veiculo_vendas").select("id, data_venda, valor_venda, despesas_venda, descontos").eq("veiculo_id", id).order("data_venda", { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from("veiculo_checklists").select("*").eq("veiculo_id", id).maybeSingle(),
    ]);
    const veiculo = vRes.data;
    if (vRes.error || !veiculo) {
      const msg = vRes.error?.message || "Veículo não encontrado.";
      setErro(msg);
      cache.current = { erro: msg };
      enviar();
      return;
    }
    const lista = fRes.data ?? [];
    let urls = {};
    if (lista.length) {
      const { data: assinadas } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(lista.map((f) => f.caminho_storage), 3600);
      urls = Object.fromEntries((assinadas ?? []).map((s) => [s.path, s.signedUrl]));
    }
    cache.current = {
      veiculo,
      fotos: lista.map((f) => ({ id: f.id, caminho: f.caminho_storage, url: urls[f.caminho_storage] ?? null })),
      custos: cRes.data ?? [],
      financiamento: finRes.data ?? null,
      vendas: vdRes.data ?? [],
      checklist: ckRes.data ?? null,
      erro: null,
    };
    setErro(null);
    enviar();
  }, [id, papel, gestao, perfil, enviar]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const ouvir = async (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === "pronto") { enviar(); return; }
      if (d.type !== "acao") return;
      const x = d.dados || {};
      try {
        switch (d.acao) {
          case "voltar":
            navigate("/estoque");
            break;
          case "completo":
            navigate(`/estoque/${id}/completo`);
            break;
          case "excluir": {
            if (!window.confirm("Excluir este veículo definitivamente? Esta ação não pode ser desfeita.")) return;
            const { error } = await excluirVeiculo(id);
            if (error) { alert(`Não foi possível excluir: ${error.message}`); return; }
            navigate("/estoque");
            break;
          }
          case "pdf": {
            const c = cache.current;
            if (!c?.veiculo) return;
            const [{ default: jsPDF }, { default: autoTable }, { data: ck }] = await Promise.all([
              import("jspdf"), import("jspdf-autotable"),
              supabase.from("veiculo_checklists").select("*").eq("veiculo_id", id).maybeSingle(),
            ]);
            const imgs = (await Promise.all(c.fotos.filter((f) => f.url).map((f) => urlParaDataUrl(f.url)))).filter(Boolean);
            const doc = gerarPdfVeiculo({ veiculo: c.veiculo, financiamento: c.financiamento, custos: c.custos, vendas: c.vendas, checklist: ck, fotos: imgs, jsPDF, autoTable, ITENS, DOCUMENTACAO });
            doc.save(`veiculo-${(c.veiculo.modelo || "veiculo").toLowerCase().replace(/\s+/g, "-")}.pdf`);
            break;
          }
          case "salvar-dados": {
            const payload = {
              data_aquisicao: texto(x.data_aquisicao), placa: texto(x.placa)?.toUpperCase() ?? null,
              renavam: texto(x.renavam), chassi: texto(x.chassi), marca: texto(x.marca), modelo: texto(x.modelo),
              ano_fabricacao: numero(x.ano_fabricacao), ano_modelo: numero(x.ano_modelo), cor: texto(x.cor),
              quilometragem: numero(x.quilometragem), combustivel: texto(x.combustivel), cambio: texto(x.cambio),
              preco_compra: numero(x.preco_compra), valor_fipe: numero(x.valor_fipe),
              preco_venda_pretendido: numero(x.preco_venda_pretendido),
            };
            if (!payload.modelo) { alert("Informe o modelo do veículo."); return; }
            const { error } = await supabase.from("veiculos").update(payload).eq("id", id);
            if (error) { alert(`Não foi salvo: ${error.message}`); return; }
            await carregar();
            break;
          }
          case "add-custo": {
            const descricao = texto(x.descricao);
            const valor = numero(x.valor);
            if (!descricao || valor == null) { alert("Informe descrição e valor do custo."); return; }
            const { error } = await supabase.from("veiculo_custos").insert({ veiculo_id: id, descricao, valor, criado_por: uid });
            if (error) { alert(error.message); return; }
            await carregar();
            break;
          }
          case "del-custo": {
            const { error } = await supabase.from("veiculo_custos").delete().eq("id", x.id);
            if (error) { alert(error.message); return; }
            await carregar();
            break;
          }
          case "salvar-checklist": {
            const existe = cache.current?.checklist;
            const payload = { ...x, veiculo_id: id, atualizado_por: uid };
            const res = existe
              ? await supabase.from("veiculo_checklists").update(payload).eq("veiculo_id", id)
              : await supabase.from("veiculo_checklists").insert(payload);
            if (res.error) { alert(res.error.message); return; }
            await carregar();
            break;
          }
          case "upload-fotos": {
            const arquivos = x.arquivos || [];
            const atuais = cache.current?.fotos?.length || 0;
            if (atuais + arquivos.length > MAX_FOTOS) { alert(`Limite de ${MAX_FOTOS} fotos por veículo.`); return; }
            for (const f of arquivos) {
              if (!TIPOS_FOTO.includes(f.type)) { alert("Use fotos JPG, PNG ou WebP."); return; }
              if (f.size > MAX_BYTES) { alert("Foto acima de 8 MB."); return; }
            }
            for (let i = 0; i < arquivos.length; i++) {
              const f = arquivos[i];
              const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
              const caminho = `${id}/${Date.now()}-${i}.${ext}`;
              const { error: eu } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, f, { contentType: f.type, upsert: false });
              if (eu) { alert(eu.message); return; }
              const { error: ei } = await supabase.from("veiculo_fotos").insert({ veiculo_id: id, caminho_storage: caminho, ordem_exibicao: atuais + i + 1, criado_por: uid });
              if (ei) { alert(ei.message); return; }
            }
            await carregar();
            break;
          }
          case "del-foto": {
            await supabase.storage.from(BUCKET_FOTOS).remove([x.caminho]);
            const { error } = await supabase.from("veiculo_fotos").delete().eq("id", x.id);
            if (error) { alert(error.message); return; }
            await carregar();
            break;
          }
          case "registrar-venda": {
            const valor = numero(x.valor_venda);
            if (valor == null || valor <= 0) { alert("Informe o valor de venda."); return; }
            const { error: ev } = await supabase.from("veiculo_vendas").insert({
              veiculo_id: id, data_venda: texto(x.data_venda) || new Date().toISOString().slice(0, 10),
              valor_venda: valor, despesas_venda: numero(x.despesas_venda) || 0, descontos: numero(x.descontos) || 0, criado_por: uid,
            });
            if (ev) { alert(ev.message); return; }
            const { error: es } = await supabase.from("veiculos").update({ status: "vendido" }).eq("id", id);
            if (es) { alert(es.message); return; }
            await carregar();
            break;
          }
          default:
            break;
        }
      } catch (err) {
        alert(`Não foi possível concluir: ${err?.message || err}`);
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [id, navigate, enviar, carregar, uid]);

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
