// sem-rascunho: pagina publica do visitante; nada e guardado no navegador
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, Car, Store, ChevronLeft, ChevronRight } from "lucide-react";
import { CATALOGO_CSS } from "./catalogo-estilos";
import useLogoPublica from "../lib/logoPublica";

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const VAZIO = { busca: "", loja: "", precoMax: "", anoMin: "", combustivel: "", cambio: "" };

export default function Marketplace() {
  const logo = useLogoPublica();
  const { n } = useParams();
  const navigate = useNavigate();
  const pagina = Math.max(1, parseInt(n, 10) || 1);
  const [f, setF] = useState(VAZIO);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // filtros vao ao servidor: a busca cobre todo o marketplace, nao so a pagina aberta
  useEffect(() => {
    const qs = new URLSearchParams({ pagina: String(pagina) });
    Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
    setCarregando(true);
    setErro(null);
    fetch(`/api/marketplace?${qs.toString()}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error([b.erro, b.detalhe].filter(Boolean).join(" — ") || "Falha ao carregar"); return b; })
      .then((b) => setDados(b))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [pagina, f]);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (pagina > 1) navigate("/marketplace"); };
  const irPagina = (p) => navigate(p <= 1 ? "/marketplace" : `/marketplace/pagina/${p}`);
  const totalPaginas = dados?.paginas ?? 1;
  const temFiltro = Object.values(f).some(Boolean);

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
          <div className="cat-eyebrow">{dados ? `${dados.total} ${dados.total === 1 ? "veículo" : "veículos"} · ${dados.lojas.length} ${dados.lojas.length === 1 ? "loja" : "lojas"}` : "Veículos de várias lojas"}</div>
          <h1 className="cat-h1">Encontre o carro ideal</h1>
          <label className="cat-search">
            <Search size={18} color="#64748b" />
            <input placeholder="Busque por marca, modelo ou cidade" value={f.busca} onChange={set("busca")} aria-label="Buscar veículo" />
          </label>
          <div className="cat-chips" role="group" aria-label="Filtros">
            <select className="cat-sel" value={f.loja} onChange={set("loja")} aria-label="Loja">
              <option value="">Todas as lojas</option>
              {(dados?.lojas ?? []).map((l) => <option key={l.slug} value={l.slug}>{l.nome}</option>)}
            </select>
            <select className="cat-sel" value={f.combustivel} onChange={set("combustivel")} aria-label="Combustível">
              <option value="">Combustível</option>
              {["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido"].map((x) => <option key={x}>{x}</option>)}
            </select>
            <select className="cat-sel" value={f.cambio} onChange={set("cambio")} aria-label="Câmbio">
              <option value="">Câmbio</option>
              <option>Manual</option><option>Automático</option>
            </select>
            <select className="cat-sel" value={f.anoMin} onChange={set("anoMin")} aria-label="Ano mínimo">
              <option value="">Ano a partir de</option>
              {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + 1 - i).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="cat-sel" value={f.precoMax} onChange={set("precoMax")} aria-label="Preço máximo">
              <option value="">Qualquer preço</option>
              {[30000, 50000, 75000, 100000, 150000, 200000].map((p) => <option key={p} value={p}>Até {BRL(p)}</option>)}
            </select>
            {temFiltro && <button type="button" className="cat-sel" onClick={() => { setF(VAZIO); if (pagina > 1) navigate("/marketplace"); }} style={{ color: "#2563eb", borderColor: "#bfdbfe" }}>Limpar</button>}
          </div>
        </section>

        {erro && <div className="cat-err">{erro}</div>}
        {!erro && !dados && <div className="cat-empty">Carregando veículos…</div>}

        {dados && (
          <>
            <p className="cat-count">
              {dados.total === 0
                ? (dados.lojas.length === 0 ? "Nenhuma loja ativou o marketplace ainda." : "Nenhum veículo com esses filtros.")
                : `Mostrando ${(pagina - 1) * dados.porPagina + 1}–${Math.min(pagina * dados.porPagina, dados.total)} de ${dados.total}`}
            </p>
            {dados.total === 0 ? (
              <div className="cat-empty"><Car size={32} style={{ marginBottom: 8 }} /><div>{dados.lojas.length === 0 ? "Volte em breve: as lojas parceiras estão chegando." : "Tente outros filtros."}</div></div>
            ) : (
              <div className="cat-grid" style={{ opacity: carregando ? 0.6 : 1 }}>
                {dados.veiculos.map((v) => (
                  <Link key={v.id} to={`/loja/${v.loja_slug}/veiculo/${v.id}`} className="cat-card">
                    <div className="cat-img">
                      {v.capa ? <img src={v.capa} alt={`${v.marca ?? ""} ${v.modelo}`} loading="lazy" /> : <div className="cat-ph">Sem foto</div>}
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

            {totalPaginas > 1 && (
              <nav aria-label="Paginação" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                <button type="button" className="cat-btn cat-btn-ghost" disabled={pagina <= 1} onClick={() => irPagina(pagina - 1)} style={{ height: 40 }}><ChevronLeft size={16} /> Anterior</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Página {pagina} de {totalPaginas}</span>
                <button type="button" className="cat-btn cat-btn-ghost" disabled={pagina >= totalPaginas} onClick={() => irPagina(pagina + 1)} style={{ height: 40 }}>Próxima <ChevronRight size={16} /></button>
              </nav>
            )}
          </>
        )}
        <p className="cat-foot">Marketplace Calcula.car · veículos das lojas parceiras</p>
      </main>
    </div>
  );
}
