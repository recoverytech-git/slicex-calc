// sem-rascunho: formulario e resultados ficam no documento do design (iframe); o calculo usa calcPercentual
import { useCallback, useEffect, useRef, useState } from "react";
import PageTransition from "../components/PageTransition";
import Sino from "../components/Sino";
import { useMarca } from "../lib/marca";

export default function Percentual() {
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
      <div style={{ position: "relative", height: "100vh" }}>
        <iframe
          ref={frame}
          src="/calculadora-percentual.html"
          title="Calculadora de Diferença Percentual"
          onLoad={enviarMarca}
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
