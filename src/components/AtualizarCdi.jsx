import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import DbCabeca from "./DbCabeca";

// Botao do administrador master: forca a atualizacao do CDI agora, sem terminal
export default function AtualizarCdi() {
  const [estado, setEstado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const atualizar = async () => {
    if (!supabaseConfigurado) return;
    setCarregando(true);
    setEstado(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const r = await fetch("/api/atualizar-cdi", { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => ({}));
      setEstado(body.ok
        ? { tipo: "ok", texto: `CDI atualizado: ${String(body.valor).replace(".", ",")}% a.a. (referência ${body.referencia.split("-").reverse().join("/")}).` }
        : { tipo: "erro", texto: `Não atualizou (${r.status}): ${body.erro || "erro desconhecido"}` });
    } catch (e) {
      setEstado({ tipo: "erro", texto: `Falha de conexão: ${e.message}` });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <section className="db-card cfg-lift">
      <DbCabeca Icone={RefreshCw} titulo="CDI (taxa de oportunidade)" sub="Atualização automática em dias úteis. Use o botão para atualizar agora e ver o resultado." />
      <div className="cfg-acoes">
        <button type="button" className="db-btn-prim" onClick={atualizar} disabled={carregando}>
          {carregando ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />} {carregando ? "Atualizando…" : "Atualizar CDI agora"}
        </button>
        {estado && (
          <span className="cfg-status" style={{ color: estado.tipo === "ok" ? "#059669" : "#b91c1c" }}>
            {estado.tipo === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {estado.texto}
          </span>
        )}
      </div>
    </section>
  );
}
