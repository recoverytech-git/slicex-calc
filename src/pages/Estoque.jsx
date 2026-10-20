// sem-rascunho: lista e filtros ficam no documento do design (iframe); os dados vem do banco pelo sistema
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import Sino from "../components/Sino";
import { listarVeiculos } from "../lib/estoque";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { BUCKET_FOTOS } from "../lib/fotos";
import { buildEstoquePDF } from "../lib/estoqueRelatorio";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";

const ROTULO = { em_preparacao: "Em preparação", disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };

export default function Estoque() {
  const { perfil } = useAuth();
  const vendedor = perfil?.papel === "vendedor";
  const navigate = useNavigate();
  const marca = useMarca();
  const frame = useRef(null);
  const brutos = useRef([]);
  const [itens, setItens] = useState([]);
  const [slot, setSlot] = useState(null);
  const itensRef = useRef(itens);
  itensRef.current = itens;
  const papelRef = useRef(perfil?.papel ?? null);
  papelRef.current = perfil?.papel ?? null;
  const marcaRef = useRef(marca);
  marcaRef.current = marca;

  const enviarMarca = useCallback(() => {
    const m = marcaRef.current;
    frame.current?.contentWindow?.postMessage({ type: "marca", logoClaro: m.logo_claro || m.logo_landing_claro || null }, window.location.origin);
  }, []);

  const enviarDados = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "dados", papel: papelRef.current, itens: itensRef.current }, window.location.origin);
  }, []);

  useEffect(() => {
    if (perfil === undefined || !supabaseConfigurado) return undefined;
    let vivo = true;
    listarVeiculos({ status: null, vendedor }).then(async ({ data }) => {
      if (!vivo) return;
      const lista = data ?? [];
      brutos.current = lista;
      const capas = {};
      const ids = lista.map((v) => v.id);
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
      if (!vivo) return;
      setItens(lista.map((v) => ({
        id: v.id,
        modelo: v.modelo,
        placa: v.placa,
        marca: v.marca,
        ano_modelo: v.ano_modelo,
        quilometragem: v.quilometragem,
        status: v.status,
        preco: v.preco_venda_pretendido ?? null,
        capa: capas[v.id] ?? null,
      })));
    });
    return () => { vivo = false; };
  }, [perfil, vendedor]);

  useEffect(() => { enviarDados(); }, [itens, perfil, enviarDados]);
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
      <div style={{ position: "relative", height: "100vh" }}>
        <iframe
          ref={frame}
          src="/calculadora-estoque.html"
          title="Estoque de veículos"
          onLoad={() => { enviarMarca(); enviarDados(); }}
          style={{ display: "block", width: "100%", height: "100%", border: 0 }}
        />
        {slot && (
          <div style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.w, height: slot.h, zIndex: 20 }}>
            <Sino />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
