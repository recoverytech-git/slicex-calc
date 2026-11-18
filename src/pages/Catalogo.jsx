// sem-rascunho: pagina publica do visitante; dados pessoais nao ficam guardados no navegador
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Search, Car } from "lucide-react";
import { filtrarCatalogo, opcoesFiltro } from "../lib/catalogo";
import { CATALOGO_CSS } from "./catalogo-estilos";
import logo from "../assets/logo.png";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const VAZIO = { busca: "", precoMax: "", anoMin: "", combustivel: "", cambio: "" };

export default function Catalogo() {
  const { slug } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [f, setF] = useState(VAZIO);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    setDados(null); setErro(null);
    fetch(`/api/catalogo?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error([b.erro, b.detalhe].filter(Boolean).join(" — ") || "Loja não encontrada"); return b; })
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, [slug]);

  const opc = useMemo(() => (dados ? opcoesFiltro(dados.veiculos) : { combustiveis: [], cambios: [], anos: [] }), [dados]);
  const lista = useMemo(() => (dados ? filtrarCatalogo(dados.veiculos, f) : []), [dados, f]);

  return (
    <div className="cat">
      <style>{CATALOGO_CSS}</style>
      <header className="cat-top">
        <div className="cat-top-in">
          <img src={logo} alt="Calcula.car" className="cat-logo" />
          {dados && <span className="cat-loja">{dados.loja.nome}</span>}
        </div>
      </header>

      <main className="cat-wrap">
        <section className="cat-hero">
          <div className="cat-eyebrow">Veículos disponíveis</div>
          <h1 className="cat-h1">Encontre seu próximo carro</h1>
          <label className="cat-search">
            <Search size={18} color="#64748b" />
            <input placeholder="Busque por modelo, cor ou cidade" value={f.busca} onChange={set("busca")} aria-label="Buscar veículo" />
          </label>
          {dados && (
            <div className="cat-chips" role="group" aria-label="Filtros">
              <select className="cat-sel" value={f.combustivel} onChange={set("combustivel")} aria-label="Combustível">
                <option value="">Combustível</option>
                {opc.combustiveis.map((x) => <option key={x}>{x}</option>)}
              </select>
              <select className="cat-sel" value={f.cambio} onChange={set("cambio")} aria-label="Câmbio">
                <option value="">Câmbio</option>
                {opc.cambios.map((x) => <option key={x}>{x}</option>)}
              </select>
              <select className="cat-sel" value={f.anoMin} onChange={set("anoMin")} aria-label="Ano mínimo">
                <option value="">Ano a partir de</option>
                {opc.anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className="cat-sel" value={f.precoMax} onChange={set("precoMax")} aria-label="Preço máximo">
                <option value="">Qualquer preço</option>
                {[50000, 75000, 100000, 150000, 200000].map((p) => <option key={p} value={p}>Até {BRL(p)}</option>)}
              </select>
              {(f.busca || f.combustivel || f.cambio || f.anoMin || f.precoMax) && (
                <button type="button" className="cat-sel" onClick={() => setF(VAZIO)} style={{ color: "#2563eb", borderColor: "#bfdbfe" }}>Limpar</button>
              )}
            </div>
          )}
        </section>

        {erro && <div className="cat-err">{erro}</div>}
        {!erro && !dados && <div className="cat-empty">Carregando veículos…</div>}

        {dados && (
          <>
            <p className="cat-count">{lista.length} {lista.length === 1 ? "veículo" : "veículos"} encontrado{lista.length === 1 ? "" : "s"}</p>
            {lista.length === 0 ? (
              <div className="cat-empty"><Car size={32} style={{ marginBottom: 8 }} /><div>Nenhum veículo com esses filtros.</div></div>
            ) : (
              <div className="cat-grid">
                {lista.map((v) => (
                  <Link key={v.id} to={`/loja/${slug}/veiculo/${v.id}`} className="cat-card">
                    <div className="cat-img">
                      {v.capa ? <img src={v.capa} alt={v.modelo} loading="lazy" /> : <div className="cat-ph">Sem foto</div>}
                      <span className="cat-badge">{v.status === "reservado" ? "Reservado" : "Disponível"}</span>
                    </div>
                    <div className="cat-body">
                      <h2 className="cat-name">{v.modelo}</h2>
                      <div className="cat-meta">
                        <span className="cat-tag">{v.ano_fabricacao}/{v.ano_modelo}</span>
                        {v.quilometragem != null && <span className="cat-tag">{Number(v.quilometragem).toLocaleString("pt-BR")} km</span>}
                        {v.combustivel && <span className="cat-tag">{v.combustivel}</span>}
                        {v.cambio && <span className="cat-tag">{v.cambio}</span>}
                      </div>
                      <div className="cat-price">{BRL(v.preco_venda_pretendido)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
        <p className="cat-foot">Catálogo oficial de {dados ? dados.loja.nome : "a loja"} · Calcula.car</p>
      </main>
    </div>
  );
}
