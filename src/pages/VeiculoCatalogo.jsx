// sem-rascunho: pagina publica do visitante; dados pessoais nao ficam guardados no navegador
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Gauge, Fuel, Cog, MapPin, Hash, Users, DoorOpen, Send, CheckCircle2 } from "lucide-react";
import { CATALOGO_CSS } from "./catalogo-estilos";
import useLogoPublica from "../lib/logoPublica";
import { formatarCPF, soDigitos } from "../lib/mascaras";

function IconeWhatsApp({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M19.1 4.9C17.2 3 14.7 2 12 2 6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.1-1.3c1.5.8 3.2 1.3 4.9 1.3 5.5 0 10-4.5 10-10 0-2.7-1-5.2-2.9-7.1zM12 20.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3c-.8-1.3-1.2-2.8-1.2-4.4 0-4.5 3.7-8.2 8.2-8.2 2.2 0 4.2.9 5.8 2.4 1.5 1.5 2.4 3.6 2.4 5.8 0 4.5-3.7 8.2-8.2 8.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.3-.5.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 3.9 3.5 2.3.9 2.3.6 2.7.6.4 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VeiculoCatalogo() {
  const logo = useLogoPublica();
  const { slug, id } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [foto, setFoto] = useState(0);
  const [form, setForm] = useState({ nome: "", telefone: "", cpf: "", mensagem: "", site: "" });
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [msgErro, setMsgErro] = useState(null);
  const [zoom, setZoom] = useState(false);
  const totalFotos = dados?.veiculo?.fotos?.length || 0;
  useEffect(() => {
    if (!zoom) return;
    const tecla = (e) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") setFoto((f) => Math.min(f + 1, totalFotos - 1));
      if (e.key === "ArrowLeft") setFoto((f) => Math.max(f - 1, 0));
    };
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = ""; };
  }, [zoom, totalFotos]);

  useEffect(() => {
    setDados(null); setErro(null); setFoto(0); setOk(false);
    fetch(`/api/catalogo?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.erro || "Veículo não encontrado"); return b; })
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, [slug, id]);

  const waNumero = (dados?.loja?.whatsapp || "").replace(/\D/g, "");
  const waLink = waNumero && dados?.veiculo ? `https://wa.me/${waNumero.length <= 11 ? "55" + waNumero : waNumero}?text=${encodeURIComponent(`Olá! Tenho interesse no ${dados.veiculo.modelo} (${dados.veiculo.ano_fabricacao}/${dados.veiculo.ano_modelo}) anunciado no catálogo.`)}` : null;

  const enviar = async (e) => {
    e.preventDefault();
    setMsgErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/interesse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, veiculoId: id, ...form }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.erro || "Não foi possível enviar");
      setOk(true);
    } catch (err) {
      setMsgErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const v = dados?.veiculo;
  const fotos = v?.fotos || [];
  const itens = v ? [
    ["Ano", `${v.ano_fabricacao}/${v.ano_modelo}`, Gauge],
    ["Quilometragem", v.quilometragem != null ? `${Number(v.quilometragem).toLocaleString("pt-BR")} km` : "—", Gauge],
    ["Combustível", v.combustivel || "—", Fuel],
    ["Câmbio", v.cambio || "—", Cog],
    ["Motor", v.potencia_motor || "—", Cog],
    ["Cor", v.cor || "—", Hash],
    ["Portas", v.portas ?? "—", DoorOpen],
    ["Lugares", v.lugares ?? "—", Users],
  ] : [];

  return (
    <div className="cat">
      <style>{CATALOGO_CSS}</style>
      <header className="cat-top">
        <div className="cat-top-in">
          <Link to={`/loja/${slug}`} className="cat-btn cat-btn-ghost" style={{ height: 40, padding: "0 14px", fontSize: 13 }}>
            <ArrowLeft size={16} /> Voltar ao catálogo
          </Link>
          <img src={logo} alt="Calcula.car" className="cat-logo" />
        </div>
      </header>

      {zoom && fotos[foto] && (
        <div className="cat-lightbox" role="dialog" aria-label="Foto ampliada" onClick={(e) => { if (e.target === e.currentTarget) setZoom(false); }}>
          <button type="button" className="cat-lb-btn cat-lb-x" onClick={() => setZoom(false)} aria-label="Fechar">✕</button>
          {foto > 0 && <button type="button" className="cat-lb-btn cat-lb-prev" onClick={() => setFoto(foto - 1)} aria-label="Foto anterior">‹</button>}
          <img src={fotos[foto]} alt={`${v.modelo} foto ${foto + 1}`} className="cat-lb-img" />
          {foto < fotos.length - 1 && <button type="button" className="cat-lb-btn cat-lb-next" onClick={() => setFoto(foto + 1)} aria-label="Próxima foto">›</button>}
          <span className="cat-lb-count">{foto + 1} / {fotos.length}</span>
        </div>
      )}
      <main className="cat-wrap">
        {erro && <div className="cat-err">{erro}</div>}
        {!erro && !v && <div className="cat-empty">Carregando veículo…</div>}

        {v && (
          <div className="cat-det">
            <div className="cat-left">
            <section className="cat-gal">
              <div className="cat-main" role="button" tabIndex={0} onClick={() => fotos[foto] && setZoom(true)} onKeyDown={(e) => { if (e.key === "Enter" && fotos[foto]) setZoom(true); }} style={{ cursor: fotos[foto] ? "zoom-in" : "default" }} aria-label="Ampliar foto">
                {fotos[foto] ? <img src={fotos[foto]} alt={`${v.modelo} foto ${foto + 1}`} /> : <div className="cat-ph">Sem fotos</div>}
              </div>
              {fotos.length > 1 && (
                <div className="cat-thumbs">
                  {fotos.map((src, i) => (
                    <button key={src} type="button" className={`cat-thumb ${i === foto ? "on" : ""}`} onClick={() => setFoto(i)} aria-label={`Foto ${i + 1}`}>
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </section>
            {v.info_adicional && (
              <section className="cat-gal cat-info-ext">
                <div className="cat-eyebrow">Informações adicionais</div>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-line" }}>{v.info_adicional}</p>
              </section>
            )}
            </div>

            <aside className="cat-info">
              <div>
                <div className="cat-eyebrow">{v.status === "reservado" ? "Reservado" : "Disponível"}</div>
                <h1 className="cat-h2">{v.modelo}</h1>
                {(v.cidade || v.placa) && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {v.cidade && <><MapPin size={14} /> {v.cidade}{v.uf ? ` · ${v.uf}` : ""}</>}
                    {v.placa && <span style={{ marginLeft: 8 }}>Placa {v.placa}</span>}
                  </p>
                )}
              </div>

              <div>
                <div className="cat-eyebrow">Preço</div>
                <div className="cat-bigprice">{BRL(v.preco_venda_pretendido)}</div>
                {v.abaixo_fipe && <span className="cat-fipe" style={{ position: "static", display: "inline-flex", marginTop: 8, width: "fit-content" }}>{Math.abs(v.diferenca_fipe_pct).toLocaleString("pt-BR")}% abaixo da FIPE</span>}
              </div>

              <div className="cat-spec">
                {itens.map(([rot, val]) => (
                  <div key={rot}><b>{rot}</b><span>{String(val)}</span></div>
                ))}
              </div>

              {v.descricao && <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{v.descricao}</p>}

              {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="cat-btn" style={{ background: "#16a34a", boxShadow: "0 8px 16px -4px rgba(22,163,74,.35)", marginBottom: 4 }}><IconeWhatsApp /> Chamar no WhatsApp</a>}
              {ok ? (
                <div className="cat-ok"><CheckCircle2 size={18} style={{ verticalAlign: "-4px", marginRight: 6 }} />Recebemos seu interesse. A loja vai entrar em contato em breve.</div>
              ) : (
                <form className="cat-form" onSubmit={enviar}>
                  <div className="cat-eyebrow">Quero receber retorno da loja</div>
                  <input className="cat-in" placeholder="CPF" inputMode="numeric" required value={formatarCPF(form.cpf)} onChange={(e) => setForm({ ...form, cpf: soDigitos(e.target.value).slice(0, 11) })} aria-label="CPF" />
                  <input className="cat-in" placeholder="Seu nome" required minLength={2} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} aria-label="Nome" />
                  <input className="cat-in" placeholder="Telefone com DDD (WhatsApp)" required inputMode="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} aria-label="Telefone" />
                  <textarea className="cat-in" placeholder="Mensagem (opcional)" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} aria-label="Mensagem" />
                  <input type="text" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, opacity: 0, height: 0 }} />
                  {msgErro && <div className="cat-erro">{msgErro}</div>}
                  <button type="submit" className="cat-btn cat-btn-ghost" disabled={enviando}><Send size={16} /> {enviando ? "Enviando…" : "Enviar meus dados"}</button>
                </form>
              )}
            </aside>
          </div>
        )}
        <p className="cat-foot">Calcula.car · catálogo da loja</p>
      </main>
    </div>
  );
}
