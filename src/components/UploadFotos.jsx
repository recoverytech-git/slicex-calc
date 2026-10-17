import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import PrimaryButton from "./PrimaryButton";
import { enviarFotos, MAX_FOTOS, validarArquivo } from "../lib/fotos";
import { useAuth } from "../lib/auth";

/** Envia fotos de um veículo. `jaExistentes` = fotos que o veículo já tem. */
export default function UploadFotos({ veiculoId, jaExistentes = 0, onEnviado }) {
  const { sessao, perfil } = useAuth();
  const ref = useRef(null);
  const [arquivos, setArquivos] = useState([]);
  const [enviadas, setEnviadas] = useState(jaExistentes ?? totalAtual);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const total = jaExistentes + enviadas;

  const escolher = (e) => {
    setMsg(null);
    const lista = Array.from(e.target.files || []);
    if (total + lista.length > MAX_FOTOS) {
      setMsg({ tipo: "erro", texto: `Limite de ${MAX_FOTOS} fotos por veículo.` });
      setArquivos([]);
      return;
    }
    const erro = lista.map(validarArquivo).find(Boolean);
    if (erro) { setMsg({ tipo: "erro", texto: erro }); setArquivos([]); return; }
    setArquivos(lista);
  };

  const enviar = async () => {
    setEnviando(true);
    setMsg(null);
    const { error, enviados } = await enviarFotos({
      organizacaoId: perfil?.organizacao_id,
      veiculoId,
      userId: sessao?.user?.id,
      arquivos,
      jaEnviadas: total,
    });
    setEnviando(false);
    setEnviadas((n) => n + (enviados?.length ?? 0));
    if (error) { setMsg({ tipo: "erro", texto: `Algumas fotos não foram enviadas: ${error.message}` }); onEnviado?.(); return; }
    setMsg({ tipo: "ok", texto: `${arquivos.length} foto(s) enviada(s).` });
    setArquivos([]);
    onEnviado?.();
    if (ref.current) ref.current.value = "";
    onEnviado?.();
  };

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={escolher} style={{ display: "none" }} id={`fotos-${veiculoId}`} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label htmlFor={`fotos-${veiculoId}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Camera size={16} /> Escolher fotos
        </label>
        <span style={{ fontSize: 12, color: "var(--text-mute)" }}>
          {arquivos.length ? `${arquivos.length} selecionada(s)` : `${total} de ${MAX_FOTOS} foto(s)`}
        </span>
        {arquivos.length > 0 && (
          <PrimaryButton onClick={enviar} disabled={enviando} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={16} /> {enviando ? "Enviando…" : "Enviar fotos"}
          </PrimaryButton>
        )}
      </div>
      {msg && <div role="status" style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}
    </div>
  );
}
