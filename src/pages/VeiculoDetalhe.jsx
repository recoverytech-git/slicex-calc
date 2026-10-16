import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import ChecklistVeiculo from "../components/ChecklistVeiculo";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { formatarBRL } from "../lib/moeda";
import { BUCKET_FOTOS } from "../lib/fotos";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 20, marginTop: 14 };
const STATUS = [["em_preparacao", "Em preparação"], ["disponivel", "Disponível"], ["reservado", "Reservado"], ["vendido", "Vendido"], ["retirado", "Retirado"]];
const ROTULO = Object.fromEntries(STATUS);
const titulo = { margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };

function Linha({ label, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-mute)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 600, textAlign: "right" }}>{valor ?? "—"}</span>
    </div>
  );
}

export default function VeiculoDetalhe() {
  const { id } = useParams();
  const { perfil } = useAuth();
  const papel = perfil?.papel;
  const gestao = ["admin_master", "proprietario", "gerente"].includes(papel);
  const podeEditar = ["admin_master", "proprietario"].includes(papel);
  const [veiculo, setVeiculo] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);

  const carregar = async () => {
    const tabela = papel === "vendedor" ? "v_veiculos_vendedor" : "veiculos";
    const { data, error } = await supabase.from(tabela).select("*").eq("id", id).maybeSingle();
    if (error) { setErro(error.message); return; }
    if (!data) { setErro("Veículo não encontrado."); return; }
    setVeiculo(data);

    const { data: fs } = await supabase.from("veiculo_fotos")
      .select("id, caminho_storage, ordem_exibicao").eq("veiculo_id", id).order("ordem_exibicao");
    const comUrl = await Promise.all((fs ?? []).map(async (f) => {
      const { data: s } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(f.caminho_storage, 3600);
      return { ...f, url: s?.signedUrl ?? null };
    }));
    setFotos(comUrl);

    if (gestao) {
      const { data: vs } = await supabase.from("veiculo_vendas")
        .select("id, data_venda, valor_venda, despesas_venda, descontos")
        .eq("veiculo_id", id).order("data_venda", { ascending: false });
      setVendas(vs ?? []);
    }
  };

  useEffect(() => {
    if (supabaseConfigurado && papel) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, papel]);

  const mudarStatus = async (status) => {
    setMsg(null);
    const { error } = await supabase.from("veiculos").update({ status }).eq("id", id);
    if (error) setMsg({ tipo: "erro", texto: `Status não alterado: ${error.message}` });
    else { setMsg({ tipo: "ok", texto: "Status atualizado." }); carregar(); }
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Detalhes do veículo" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          {erro && <p style={{ color: "var(--text-dim)", marginTop: 22 }}>{erro}</p>}
          {!erro && !veiculo && <p style={{ color: "var(--text-mute)", marginTop: 22 }}>Carregando…</p>}

          {veiculo && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 4px", color: "var(--text)" }}>{veiculo.modelo}</h1>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 4px" }}>
                {gestao && veiculo.placa ? `Placa ${veiculo.placa} · ` : ""}{ROTULO[veiculo.status] ?? veiculo.status}
              </p>

              <div style={card}>
                <p style={titulo}>Identificação e características</p>
                {gestao && <Linha label="Placa" valor={veiculo.placa} />}
                {gestao && <Linha label="RENAVAM" valor={veiculo.renavam} />}
                {gestao && <Linha label="Chassi" valor={veiculo.chassi} />}
                <Linha label="Ano de fabricação" valor={veiculo.ano_fabricacao} />
                <Linha label="Ano do modelo" valor={veiculo.ano_modelo} />
                <Linha label="Quilometragem" valor={veiculo.quilometragem != null ? `${Number(veiculo.quilometragem).toLocaleString("pt-BR")} km` : null} />
                {gestao && <Linha label="Cor" valor={veiculo.cor} />}
                {gestao && <Linha label="Combustível" valor={veiculo.combustivel} />}
                {gestao && <Linha label="Câmbio" valor={veiculo.cambio} />}
                <Linha label="Valor de venda pretendido" valor={veiculo.preco_venda_pretendido != null ? formatarBRL(veiculo.preco_venda_pretendido) : null} />
              </div>

              <div style={card}>
                <p style={titulo}>Status</p>
                {podeEditar ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {STATUS.map(([v, rotulo]) => (
                      <button key={v} onClick={() => mudarStatus(v)}
                        style={{ padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: "1px solid var(--border-strong)",
                          background: veiculo.status === v ? "var(--surface-3)" : "transparent",
                          color: veiculo.status === v ? "var(--text)" : "var(--text-mute)" }}>
                        {rotulo}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>{ROTULO[veiculo.status] ?? veiculo.status}</p>
                )}
                {msg && <div role="status" style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}
              </div>

              <div style={card}>
                <p style={titulo}>Fotos</p>
                {fotos.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma foto cadastrada.</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                  {fotos.map((f) => f.url && (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                      <img src={f.url} alt="Foto do veículo" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }} />
                    </a>
                  ))}
                </div>
              </div>

              {podeEditar && (
                <div style={card}>
                  <ChecklistVeiculo veiculoId={veiculo.id} />
                </div>
              )}

              {gestao && (
                <div style={card}>
                  <p style={titulo}>Vendas</p>
                  {vendas.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma venda registrada.</p>}
                  {vendas.map((v) => (
                    <div key={v.id} style={{ borderBottom: "1px solid var(--border)", padding: "10px 0", fontSize: 13 }}>
                      <div style={{ color: "var(--text)", fontWeight: 700 }}>{formatarBRL(v.valor_venda)}</div>
                      <div style={{ color: "var(--text-mute)", fontSize: 12 }}>
                        {new Date(v.data_venda).toLocaleDateString("pt-BR")} · despesas {formatarBRL(v.despesas_venda ?? 0)} · descontos {formatarBRL(v.descontos ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
