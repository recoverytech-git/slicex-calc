// sem-rascunho: formulario e resultados ficam no documento do design (iframe); o calculo usa calcAmortizacaoExtra
import { useCallback, useEffect, useRef, useState } from "react";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import Sino from "../components/Sino";
import { useMarca } from "../lib/marca";

export default function Amortizacao() {
  const frame = useRef(null);
  const marca = useMarca();
  const marcaRef = useRef(marca);
  marcaRef.current = marca;
  const [slot, setSlot] = useState(null);

  const enviarMarca = useCallback(() => {
    const m = marcaRef.current;
    frame.current?.contentWindow?.postMessage({
      type: "marca",
      logoClaro: m.logo_claro || m.logo_landing_claro || null,
    }, window.location.origin);
  }, []);

  useEffect(() => {
    const ouvir = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === "bell-rect") setSlot(d.rect);
      if (d.type === "pronto") enviarMarca();
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, [enviarMarca]);

  useEffect(() => { enviarMarca(); }, [marca, enviarMarca]);

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header subtitle="Simulador de Amortização Extraordinária" />
        <BackLink />
        <iframe
          ref={frame}
          src="/calculadora-amortizacao.html"
          title="Simulador de Amortização Extraordinária"
          onLoad={enviarMarca}
          style={{ display: "block", width: "100%", flex: 1, minHeight: 0, border: 0 }}
        />
      </div>
    </PageTransition>
  );
}
