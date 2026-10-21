// sem-rascunho: pagina publica de fotos do veiculo (sem login), valida por 24 horas
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, supabaseConfigurado } from "../lib/supabase";

export default function GaleriaPublica() {
  const { token } = useParams();
  const [dados, setDados] = useState(undefined);
  const [aberta, setAberta] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!supabaseConfigurado) { setDados(null); return; }
      const { data, error } = await supabase.rpc("obter_galeria_veiculo", { p_token: token });
      if (!vivo) return;
      setDados(error ? null : data);
    })();
    return () => { vivo = false; };
  }, [token]);

  useEffect(() => {
    if (aberta === null) return undefined;
    const teclas = (e) => {
      if (e.key === "Escape") setAberta(null);
      if (e.key === "ArrowLeft") setAberta((i) => (i - 1 + dados.urls.length) % dados.urls.length);
      if (e.key === "ArrowRight") setAberta((i) => (i + 1) % dados.urls.length);
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [aberta, dados]);

  if (dados === undefined) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Carregando fotos…</p>;
  if (!dados || !dados.urls?.length) return <p style={{ padding: 24, fontFamily: "system-ui" }}>Este link expirou ou não é válido.</p>;

  const botao = { position: "absolute", width: 44, height: 44, borderRadius: 12, border: 0, background: "#1e2d45", color: "#fff", fontSize: 22, cursor: "pointer" };
  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "#0E1A2E", color: "#fff", padding: "22px 24px" }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{dados.titulo || "Fotos do veículo"}</div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>{dados.detalhes?.numero_motor ? `Motor ${dados.detalhes.numero_motor} · ` : ""}{dados.urls.length} foto(s) · link válido até {new Date(dados.expira_em).toLocaleString("pt-BR")}</div>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, padding: 20, maxWidth: 1280, margin: "0 auto" }}>
        {dados.urls.map((src, i) => (
          <img key={i} src={src} alt={`Foto ${i + 1}`} loading="lazy" onClick={() => setAberta(i)}
            style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 14, cursor: "zoom-in", background: "#e2e8f0" }} />
        ))}
      </div>
      {aberta !== null && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setAberta(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <button onClick={() => setAberta(null)} aria-label="Fechar" style={{ ...botao, top: 16, right: 16 }}>×</button>
          <button onClick={() => setAberta((aberta - 1 + dados.urls.length) % dados.urls.length)} aria-label="Anterior" style={{ ...botao, left: 16, top: "50%" }}>‹</button>
          <img src={dados.urls[aberta]} alt="" style={{ maxWidth: "92vw", maxHeight: "86vh", borderRadius: 12 }} />
          <button onClick={() => setAberta((aberta + 1) % dados.urls.length)} aria-label="Próxima" style={{ ...botao, right: 16, top: "50%" }}>›</button>
          <div style={{ position: "absolute", bottom: 16, color: "#cbd5e1", fontWeight: 600, fontSize: 13 }}>{aberta + 1} de {dados.urls.length}</div>
        </div>
      )}
    </div>
  );
}
