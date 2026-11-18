// sem-rascunho: pagina publica do visitante; nada e guardado no navegador
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Car, Store } from "lucide-react";
import { filtrarCatalogo, opcoesFiltro } from "../lib/catalogo";
import { CATALOGO_CSS } from "./catalogo-estilos";
import logo from "../assets/logo.png";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const VAZIO = { busca: "", loja: "", precoMax: "", anoMin: "", combustivel: "", cambio: "" };

export default function Marketplace() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [f, setF] = useState(VAZIO);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    fetch("/api/marketplace")
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error([b.erro, b.detalhe].filter(Boolean).join(" — ") || "Falha ao carregar"); return b; })
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, []);

  const opc = useMemo(() => (dados ? opcoesFiltro(dados.veiculos) : { combustiveis: [], cambios: [], anos: [] }), [dados]);
  const lista = useMemo(() => {
    if (!dados) return [];
    const base = f.loja ? dados.veiculos.filter((v) => v.loja_slug === f.loja) : dados.veiculos;
    return filtrarCatalogo(base, f);
  }, [dados, f]);

  return (
    <div className="cat">
      <style>{CATALOGO_CSS}</style>
      <header className="cat-top">
        <div className="cat-top-in">
          <img src={logo} alt="Calcula.car" className="cat-logo" />
          <span className="cat-loja">Marketplace de veículos</span>
        </div>
      </header>

      <main className="cat-wrap">
        <section className="cat-hero">
          <div className="cat-eyebrow">{dados ? `${dados.lojas.length} ${dados.lojas.length === 1 ? "loja" : "lojas"} · ${dados.veiculos.length} veículos` : "Veículos de várias lojas"}</div>
          <h1 className="cat-h1">Encontre o carro ideal</h1>
          <label className="cat-search">
            <Search size={18} color="#64748b" />
            <input placeholder="Busque por marca, modelo ou cidade" value={f.busca} onChange={set("busca")} aria-label="Buscar veículo" />
          </label>
          {dados && (
            <div className="cat-chips" role="group" aria-label="Filtros">
              <select className="cat-sel" value={f.loja} onChange={set("loja")} aria-label="Loja">
                <option value="">Todas as lojas</option>
                {dados.lojas.map((l) => <option key={l.slug} value={l.slug}>{l.nome}</option>)}
              </select>
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
              {(f.busca || f.loja || f.combustivel || f.cambio || f.anoMin || f.precoMax) && (
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
                  <Link key={v.id} to={`/loja/${v.loja_slug}/veiculo/${v.id}`} className="cat-card">
                    <div className="cat-img">
                      {v.capa ? <img src={v.capa} alt={v.modelo} loading="lazy" /> : <div className="cat-ph">Sem foto</div>}
                      <span className="cat-badge">{v.status === "reservado" ? "Reservado" : "Disponível"}</span>
                    </div>
                    <div className="cat-body">
                      <h2 className="cat-name">{v.marca ? `${v.marca} ` : ""}{v.modelo}</h2>
                      <div className="cat-meta">
                        <span className="cat-tag">{v.ano_fabricacao}/{v.ano_modelo}</span>
                        {v.quilometragem != null && <span className="cat-tag">{Number(v.quilometragem).toLocaleString("pt-BR")} km</span>}
                        {v.combustivel && <span className="cat-tag">{v.combustivel}</span>}
                        {v.cambio && <span className="cat-tag">{v.cambio}</span>}
                      </div>
                      <div className="cat-price">{BRL(v.preco_venda_pretendido)}</div>
                      <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Store size={13} /> {v.loja_nome}{v.cidade ? ` · ${v.cidade}${v.uf ? `/${v.uf}` : ""}` : ""}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
        <p className="cat-foot">Marketplace Calcula.car · veículos das lojas parceiras</p>
      </main>
    </div>
  );
}
