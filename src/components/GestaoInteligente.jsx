import { useEffect, useMemo, useState } from "react";
import { Target, BellRing, Percent } from "lucide-react";
import DbCabeca from "./DbCabeca";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { prioridadeVenda } from "../lib/prioridade";
import { riscosVeiculo } from "../lib/riscos";
import { sugerirReducao } from "../lib/reprecificacao";
import { faixaSugerida } from "../lib/precificacao";
import { taxaMensalDeAnual, situacaoCdi } from "../lib/cdi";

// Painel de gestao: prioridade de venda, alertas de risco e reprecificacao com faixa de mercado por modelo
const GESTAO = ["admin_master", "proprietario", "gerente"];
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cartao = { background: "var(--surface)", borderRadius: 20, border: "1px solid rgba(226,232,240,.8)", boxShadow: "0 1px 3px rgba(15,23,42,.03), 0 10px 25px -5px rgba(15,23,42,.04)", padding: 20, marginBottom: 18 };
const titulo = { margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--text)" };
const td = { padding: "8px 6px", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13, whiteSpace: "nowrap" };
const th = { ...td, color: "var(--text-dim)", fontSize: 12, borderBottom: "1px solid var(--border)" };

export default function GestaoInteligente() {
  const { perfil } = useAuth();
  const gestao = GESTAO.includes(perfil?.papel);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [cdi, setCdi] = useState(null);
  const [erroCdi, setErroCdi] = useState(null);

  useEffect(() => {
    if (!gestao || !supabaseConfigurado) return;
    supabase.from("indicadores_mercado").select("valor, referencia, atualizado_em, fonte").eq("chave", "cdi_anual").maybeSingle()
      .then(({ data, error }) => { setCdi(data ?? null); setErroCdi(error ? error.message : null); });
    (async () => {
      const [v, m, c, f, h, vd] = await Promise.all([
        supabase.from("veiculos").select("id, modelo, placa, status, ano_modelo, potencia_motor, preco_compra, preco_venda_pretendido, valor_fipe_atualizado_em"),
        supabase.from("v_estoque_metricas").select("veiculo_id, dias_em_estoque, juros_diario_acumulado"),
        supabase.from("veiculo_custos").select("veiculo_id, valor"),
        supabase.from("veiculo_financiamentos").select("veiculo_id, total_juros"),
        supabase.from("veiculo_historico").select("veiculo_id, valor_novo, alterado_em").eq("campo", "preco_venda_pretendido"),
        supabase.from("v_vendas_resultado").select("veiculo_id, modelo, valor_venda, preco_venda_pretendido"),
      ]);
      const falha = [v, m, c, f, h, vd].find((r) => r.error);
      if (falha) { setErro(falha.error.message); return; }
      setDados({ veiculos: v.data ?? [], metricas: m.data ?? [], custos: c.data ?? [], fin: f.data ?? [], hist: h.data ?? [], vendas: vd.data ?? [] });
    })();
  }, [gestao]);

  const linhas = useMemo(() => {
    if (!dados) return [];
    const mm = Object.fromEntries(dados.metricas.map((x) => [x.veiculo_id, x]));
    const cu = {};
    dados.custos.forEach((x) => { cu[x.veiculo_id] = (cu[x.veiculo_id] || 0) + Number(x.valor || 0); });
    const fi = Object.fromEntries(dados.fin.map((x) => [x.veiculo_id, Number(x.total_juros || 0)]));
    const anoPorId = Object.fromEntries(dados.veiculos.map((x) => [x.id, x.ano_modelo]));
    const potPorId = Object.fromEntries(dados.veiculos.map((x) => [x.id, x.potencia_motor]));
    const vendasComAno = dados.vendas.map((x) => ({ ...x, ano_modelo: anoPorId[x.veiculo_id], potencia_motor: potPorId[x.veiculo_id] }));
    return dados.veiculos.filter((v) => v.status !== "vendido").map((v) => {
      const m = mm[v.id] || {};
      const jd = Number(m.juros_diario_acumulado || 0);
      const capital = Number(v.preco_compra || 0) + (cu[v.id] || 0) + (fi[v.id] || 0) + jd;
      const pret = Number(v.preco_venda_pretendido || 0);
      const dias = Number(m.dias_em_estoque || 0);
      return {
        id: v.id, modelo: v.modelo, placa: v.placa, ano_modelo: v.ano_modelo,
        pret, capital, dias, jurosAcum: jd, margem: pret - capital,
        reducao: sugerirReducao({ dias, capital, preco: pret }),
        faixa: faixaSugerida({ modelo: v.modelo, ano_modelo: v.ano_modelo, potencia_motor: v.potencia_motor, preco_venda_pretendido: pret }, vendasComAno),
        riscos: riscosVeiculo({ preco_venda_pretendido: pret, capital, juros_acumulado: jd, fipe_atualizada_em: v.valor_fipe_atualizado_em }),
      };
    });
  }, [dados]);

  const situacao = situacaoCdi(cdi);
  const taxaMensal = situacao.ok ? taxaMensalDeAnual(cdi.valor) : 0;
  const prioridade = useMemo(() => prioridadeVenda(linhas.map((l) => ({
    id: l.id, modelo: l.modelo, placa: l.placa, dias: l.dias, capital: l.capital, juros_acumulado: l.jurosAcum, pret: l.pret,
  })), { taxaOportunidadeMensal: taxaMensal || 0 }).slice(0, 8), [linhas, taxaMensal]);

  if (!gestao) return null;
  if (erro) return <section className="db-card"><p className="db-note" style={{ color: "#b91c1c" }}>{erro}</p></section>;
  if (!dados) return null;

  const comRisco = linhas.filter((l) => l.riscos.length > 0);
  const comReducao = linhas.filter((l) => l.reducao);
  const nivel = { alto: "db-pill-verm", medio: "db-pill-ambar", baixo: "db-pill-azul" };
  return (
    <>
      <section className="db-card">
        <DbCabeca Icone={Target} titulo="Prioridade de venda" sub={situacao.ok
          ? `Custo CDI ${String(cdi.valor).replace(".", ",")}% a.a. (${(taxaMensal * 100).toFixed(2).replace(".", ",")}% a.m.) · ${new Date(cdi.referencia + "T00:00:00").toLocaleDateString("pt-BR")} · Banco Central`
          : situacao.aviso} />
        {prioridade.length === 0 ? <p className="db-note">Nenhum veículo em estoque.</p> : (
          <div className="db-tbl-wrap">
            <table className="db-tbl">
              <thead><tr><th>#</th><th>Modelo</th><th>Placa</th><th className="db-r">Dias</th><th className="db-r">Capital</th><th className="db-r">Juros (caixa)</th><th className="db-r">Custo CDI</th><th className="db-r">Total</th><th className="db-r">Margem</th></tr></thead>
              <tbody>
                {prioridade.map((p, i) => (
                  <tr key={p.id}>
                    <td><span className="db-pill db-pill-azul">{i + 1}</span></td>
                    <td style={{ fontWeight: 700 }}>{p.modelo}</td>
                    <td style={{ fontFamily: "ui-monospace, monospace" }}>{p.placa || "—"}</td>
                    <td className="db-r">{p.dias}</td>
                    <td className="db-r">{BRL(p.capital)}</td>
                    <td className="db-r" style={{ color: "#b45309" }}>{BRL(p.jurosAcumulado)}</td>
                    <td className="db-r" style={{ color: "#2563eb" }}>{BRL(p.custoOportunidade)}</td>
                    <td className="db-r" style={{ fontWeight: 800 }}>{BRL(p.custoCarregamento)}</td>
                    <td className="db-r"><span className={`db-pill ${p.margem < 0 ? "db-pill-verm" : "db-pill-verde"}`}>{BRL(p.margem)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="db-card">
        <DbCabeca Icone={BellRing} titulo="Alertas de risco" sub="Margem, juros acumulado e data da FIPE de cada veículo" />
        {comRisco.length === 0 ? <p className="db-note">Nenhum alerta de risco.</p> : (
          <div className="db-grid-2">
            {comRisco.map((l) => (
              <div key={l.id} className="db-kpi" style={{ gap: 8 }}>
                <div style={{ fontWeight: 800, color: "var(--text)" }}>{l.modelo} {l.placa ? `· ${l.placa}` : ""}</div>
                {l.riscos.map((r, i) => (
                  <span key={i} className={`db-pill ${nivel[r.nivel] || "db-pill-azul"}`} style={{ alignSelf: "flex-start" }}>{r.texto}</span>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="db-card">
        <DbCabeca Icone={Percent} titulo="Reprecificação e faixa de mercado" sub="Sugestão a partir de 60 dias parado, com piso de 5% de margem sobre o capital" />
        <div className="db-tbl-wrap">
          <table className="db-tbl">
            <thead><tr><th>Modelo</th><th>Placa</th><th className="db-r">Pretendido</th><th className="db-r">Sugestão</th><th>Faixa de mercado</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700 }}>{l.modelo}</td>
                  <td style={{ fontFamily: "ui-monospace, monospace" }}>{l.placa || "—"}</td>
                  <td className="db-r">{BRL(l.pret)}</td>
                  <td className="db-r">{l.reducao ? <span className="db-pill db-pill-ambar">{BRL(l.reducao.precoSugerido)}</span> : <span style={{ color: "#94a3b8" }}>—</span>}</td>
                  <td>{l.faixa.n ? `${BRL(l.faixa.minimo)} a ${BRL(l.faixa.maximo)} · ${l.faixa.n} vendas` : <span style={{ color: "#94a3b8" }}>{l.faixa.aviso}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {comReducao.length === 0 && <p className="db-note" style={{ marginTop: 10 }}>Nenhum veículo passou de 60 dias parado.</p>}
        <p style={{ margin: "14px 0 0", fontSize: 13 }}><Link to="/simulador-decisao" style={{ color: "#2563eb", fontWeight: 700 }}>Abrir simulador: comprar à vista x financiar</Link></p>
      </section>
    </>
  );
}
