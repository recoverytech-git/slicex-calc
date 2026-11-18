import { useEffect, useMemo, useState } from "react";
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
  if (erro) return <section style={cartao}><p style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</p></section>;
  if (!dados) return null;

  const comRisco = linhas.filter((l) => l.riscos.length > 0);
  const comReducao = linhas.filter((l) => l.reducao);
  return (
    <>
      <section style={cartao}>
        <h3 style={titulo}>Prioridade de venda</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>Ordenado pelo total do carregamento. Juros acumulado é custo real (sai do caixa). Custo CDI é o rendimento que o capital deixou de ter: capital × taxa mensal × dias ÷ 30. Ele não é uma saída de caixa.</p>
        {situacao.ok ? <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>CDI {String(cdi.valor).replace(".", ",")}% a.a. ({(taxaMensal * 100).toFixed(2).replace(".", ",")}% a.m.) · referência {new Date(cdi.referencia + "T00:00:00").toLocaleDateString("pt-BR")} · fonte: Banco Central (SGS 4389)</p> : <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309" }}>{erroCdi ? `Erro ao consultar o CDI: ${erroCdi}` : situacao.aviso}</p>}
        {prioridade.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Nenhum veículo em estoque.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>#</th><th style={th}>Modelo</th><th style={th}>Placa</th><th style={{ ...th, textAlign: "right" }}>Dias</th><th style={{ ...th, textAlign: "right" }}>Capital</th><th style={{ ...th, textAlign: "right" }}>Juros acumulado (caixa)</th><th style={{ ...th, textAlign: "right" }}>Custo CDI (oportunidade)</th><th style={{ ...th, textAlign: "right" }}>Total do carregamento</th><th style={{ ...th, textAlign: "right" }}>Margem</th></tr></thead>
              <tbody>
                {prioridade.map((p, i) => (
                  <tr key={p.id}>
                    <td style={td}>{i + 1}</td><td style={td}>{p.modelo}</td><td style={td}>{p.placa || "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{p.dias}</td>
                    <td style={{ ...td, textAlign: "right" }}>{BRL(p.capital)}</td><td style={{ ...td, textAlign: "right", color: "#b45309" }}>{BRL(p.jurosAcumulado)}</td><td style={{ ...td, textAlign: "right", color: "var(--accent)" }}>{BRL(p.custoOportunidade)}</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{BRL(p.custoCarregamento)}</td>
                    <td style={{ ...td, textAlign: "right", color: p.margem < 0 ? "#b91c1c" : "#059669" }}>{BRL(p.margem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cartao}>
        <h3 style={titulo}>Alertas de risco</h3>
        {comRisco.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Nenhum alerta de risco.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comRisco.map((l) => (
              <div key={l.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{l.modelo} {l.placa ? `· ${l.placa}` : ""}</div>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {l.riscos.map((r, i) => (
                    <li key={i} style={{ color: r.nivel === "alto" ? "#b91c1c" : r.nivel === "medio" ? "#b45309" : "var(--text-dim)" }}>{r.texto}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={cartao}>
        <h3 style={titulo}>Reprecificação e faixa de mercado</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-dim)" }}>Sugestão de redução a partir de 60 dias parado, com piso de 5% de margem sobre o capital. A faixa de mercado usa vendas da mesma família e ano próximo.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Modelo</th><th style={th}>Placa</th><th style={{ ...th, textAlign: "right" }}>Pretendido</th><th style={{ ...th, textAlign: "right" }}>Sugestão</th><th style={{ ...th, textAlign: "right" }}>Faixa de mercado</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td style={td}>{l.modelo}</td><td style={td}>{l.placa || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{BRL(l.pret)}</td>
                  <td style={{ ...td, textAlign: "right", color: l.reducao ? "#b45309" : "var(--text-dim)", fontWeight: l.reducao ? 700 : 400 }}>{l.reducao ? BRL(l.reducao.precoSugerido) : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.faixa.n ? `${BRL(l.faixa.minimo)} a ${BRL(l.faixa.maximo)} (${l.faixa.n} vendas)` : l.faixa.aviso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {comReducao.length === 0 && <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "10px 0 0" }}>Nenhum veículo passou de 60 dias parado.</p>}
        <p style={{ margin: "14px 0 0", fontSize: 13 }}><Link to="/simulador-decisao" style={{ color: "var(--accent)", fontWeight: 700 }}>Abrir simulador: comprar à vista x financiar</Link></p>
      </section>
    </>
  );
}
