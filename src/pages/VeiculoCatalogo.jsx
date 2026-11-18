// sem-rascunho: pagina publica do visitante; dados pessoais nao ficam guardados no navegador
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Gauge, Fuel, Cog, MapPin, Hash, Users, DoorOpen, Send, CheckCircle2 } from "lucide-react";
import { CATALOGO_CSS } from "./catalogo-estilos";
import logo from "../assets/logo.png";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VeiculoCatalogo() {
  const { slug, id } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [foto, setFoto] = useState(0);
  const [form, setForm] = useState({ nome: "", telefone: "", mensagem: "", site: "" });
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [msgErro, setMsgErro] = useState(null);

  useEffect(() => {
    setDados(null); setErro(null); setFoto(0); setOk(false);
    fetch(`/api/catalogo?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.erro || "Veículo não encontrado"); return b; })
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, [slug, id]);

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

      <main className="cat-wrap">
        {erro && <div className="cat-err">{erro}</div>}
        {!erro && !v && <div className="cat-empty">Carregando veículo…</div>}

        {v && (
          <div className="cat-det">
            <section className="cat-gal">
              <div className="cat-main">
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
              </div>

              <div className="cat-spec">
                {itens.map(([rot, val]) => (
                  <div key={rot}><b>{rot}</b><span>{String(val)}</span></div>
                ))}
              </div>

              {v.descricao && <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{v.descricao}</p>}

              {ok ? (
                <div className="cat-ok"><CheckCircle2 size={18} style={{ verticalAlign: "-4px", marginRight: 6 }} />Recebemos seu interesse. A loja vai entrar em contato em breve.</div>
              ) : (
                <form className="cat-form" onSubmit={enviar}>
                  <div className="cat-eyebrow">Tenho interesse</div>
                  <input className="cat-in" placeholder="Seu nome" required minLength={2} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} aria-label="Nome" />
                  <input className="cat-in" placeholder="Telefone com DDD (WhatsApp)" required inputMode="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} aria-label="Telefone" />
                  <textarea className="cat-in" placeholder="Mensagem (opcional)" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} aria-label="Mensagem" />
                  <input type="text" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, opacity: 0, height: 0 }} />
                  {msgErro && <div className="cat-erro">{msgErro}</div>}
                  <button type="submit" className="cat-btn" disabled={enviando}><Send size={16} /> {enviando ? "Enviando…" : "Enviar interesse"}</button>
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
