import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import ChecklistVeiculo from "../components/ChecklistVeiculo";
import VendaVeiculo from "../components/VendaVeiculo";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import PrimaryButton from "../components/PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { formatarBRL } from "../lib/moeda";
import { BUCKET_FOTOS } from "../lib/fotos";
import { normalizar } from "../lib/estoque";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 20, marginTop: 14 };
const STATUS = [["em_preparacao", "Em preparação"], ["disponivel", "Disponível"], ["reservado", "Reservado"], ["vendido", "Vendido"], ["retirado", "Retirado"]];
const ROTULO = Object.fromEntries(STATUS);
const titulo = { margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const TIPO = { capital_proprio: "Capital próprio", financiamento: "Financiamento" };

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
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});

  const carregar = async () => {
    const tabela = papel === "vendedor" ? "v_veiculos_vendedor" : "veiculos";
    const { data, error } = await supabase.from(tabela).select("*").eq("id", id).maybeSingle();
    if (error) { setErro(error.message); return; }
    if (!data) { setErro("Veículo não encontrado."); return; }
    setVeiculo(data);
    const { data: fs } = await supabase.from("veiculo_fotos").select("id, caminho_storage, ordem_exibicao").eq("veiculo_id", id).order("ordem_exibicao");
    setFotos(await Promise.all((fs ?? []).map(async (f) => {
      const { data: s } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(f.caminho_storage, 3600);
      return { ...f, url: s?.signedUrl ?? null };
    })));
    if (gestao) {
      const { data: vs } = await supabase.from("veiculo_vendas")
        .select("id, data_venda, valor_venda, despesas_venda, descontos").eq("veiculo_id", id).order("data_venda", { ascending: false });
      setVendas(vs ?? []);
    }
  };

  useEffect(() => {
    if (supabaseConfigurado && papel) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, papel]);

  const abrirEdicao = () => {
    setForm({
      modelo: veiculo.modelo ?? "", placa: veiculo.placa ?? "", renavam: veiculo.renavam ?? "", chassi: veiculo.chassi ?? "",
      ano_fabricacao: veiculo.ano_fabricacao ?? "", ano_modelo: veiculo.ano_modelo ?? "", cor: veiculo.cor ?? "",
      quilometragem: veiculo.quilometragem ?? "", combustivel: veiculo.combustivel ?? "", cambio: veiculo.cambio ?? "",
      preco_compra: Number(veiculo.preco_compra ?? 0), valor_fipe: Number(veiculo.valor_fipe ?? 0),
      preco_venda_pretendido: Number(veiculo.preco_venda_pretendido ?? 0),
    });
    setEditando(true);
  };

  const salvarEdicao = async () => {
    setMsg(null);
    if (!form.modelo?.trim()) { setMsg({ tipo: "erro", texto: "O modelo é obrigatório." }); return; }
    const payload = {
      modelo: form.modelo.trim(),
      placa: form.placa ? normalizar(form.placa) : null,
      renavam: form.renavam ? normalizar(form.renavam) : null,
      chassi: form.chassi ? normalizar(form.chassi) : null,
      ano_fabricacao: form.ano_fabricacao ? parseInt(form.ano_fabricacao, 10) : null,
      ano_modelo: form.ano_modelo ? parseInt(form.ano_modelo, 10) : null,
      cor: form.cor || null,
      quilometragem: form.quilometragem ? parseInt(form.quilometragem, 10) : null,
      combustivel: form.combustivel || null,
      cambio: form.cambio || null,
      preco_compra: form.preco_compra || null,
      valor_fipe: form.valor_fipe || null,
      preco_venda_pretendido: form.preco_venda_pretendido || null,
    };
    const { error } = await supabase.from("veiculos").update(payload).eq("id", id);
    if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
    setEditando(false);
    setMsg({ tipo: "ok", texto: "Dados atualizados." });
    carregar();
  };

  const mudarStatus = async (status) => {
    setMsg(null);
    const { error } = await supabase.from("veiculos").update({ status }).eq("id", id);
    if (error) setMsg({ tipo: "erro", texto: `Status não alterado: ${error.message}` });
    else { setMsg({ tipo: "ok", texto: "Status atualizado." }); carregar(); }
  };

  // Análise FIPE x Compra (colunas já existentes em veiculos)
  const diferenca = veiculo?.valor_fipe && veiculo?.preco_compra ? Number(veiculo.valor_fipe) - Number(veiculo.preco_compra) : null;
  const diferencaPct = diferenca != null ? (diferenca / Number(veiculo.valor_fipe)) * 100 : null;
  // Resultado realizado parcial: venda menos despesas, descontos e compra.
  // Ainda não inclui custos adicionais nem juros, que dependem das tabelas pendentes de mapeamento.
  const vendaAtual = vendas[0];
  const realizadoParcial = vendaAtual && veiculo?.preco_compra != null
    ? Number(vendaAtual.valor_venda) - Number(vendaAtual.despesas_venda ?? 0) - Number(vendaAtual.descontos ?? 0) - Number(veiculo.preco_compra)
    : null;

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
              {msg && <div role="status" style={{ ...card, marginTop: 12, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{msg.texto}</div>}

              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ ...titulo, margin: 0 }}>Identificação e características</p>
                  {podeEditar && !editando && <button onClick={abrirEdicao} style={{ background: "none", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 12px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Editar dados</button>}
                </div>

                {editando ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                      <Field label="Modelo" val={form.modelo} set={(v) => setForm({ ...form, modelo: v })} />
                      <Field label="Placa" val={form.placa} set={(v) => setForm({ ...form, placa: v })} />
                      <Field label="RENAVAM" val={form.renavam} set={(v) => setForm({ ...form, renavam: v })} />
                      <Field label="Chassi" val={form.chassi} set={(v) => setForm({ ...form, chassi: v })} />
                      <Field label="Ano de fabricação" val={form.ano_fabricacao} set={(v) => setForm({ ...form, ano_fabricacao: v })} />
                      <Field label="Ano do modelo" val={form.ano_modelo} set={(v) => setForm({ ...form, ano_modelo: v })} />
                      <Field label="Cor" val={form.cor} set={(v) => setForm({ ...form, cor: v })} />
                      <Field label="Quilometragem (km)" val={form.quilometragem} set={(v) => setForm({ ...form, quilometragem: v })} />
                      <Field label="Combustível" val={form.combustivel} set={(v) => setForm({ ...form, combustivel: v })} />
                      <Field label="Câmbio" val={form.cambio} set={(v) => setForm({ ...form, cambio: v })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                      <MoneyField label="Valor de compra" valor={form.preco_compra} onChange={(n) => setForm({ ...form, preco_compra: n })} />
                      <MoneyField label="Valor FIPE" valor={form.valor_fipe} onChange={(n) => setForm({ ...form, valor_fipe: n })} />
                      <MoneyField label="Valor de venda pretendido" valor={form.preco_venda_pretendido} onChange={(n) => setForm({ ...form, preco_venda_pretendido: n })} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <PrimaryButton onClick={() => setEditando(false)} style={{ flex: 1, background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border-strong)" }}>Cancelar</PrimaryButton>
                      <PrimaryButton onClick={salvarEdicao} style={{ flex: 1 }}>Salvar alterações</PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {gestao && !editando && (
                <div style={card}>
                  <p style={titulo}>Análise FIPE x Compra e origem do capital</p>
                  <Linha label="Valor FIPE" valor={veiculo.valor_fipe != null ? formatarBRL(veiculo.valor_fipe) : null} />
                  <Linha label="Valor de compra" valor={veiculo.preco_compra != null ? formatarBRL(veiculo.preco_compra) : null} />
                  <Linha label="Diferença em reais" valor={diferenca != null ? formatarBRL(diferenca) : null} />
                  <Linha label="Diferença percentual" valor={diferencaPct != null ? `${diferencaPct.toFixed(2)}%` : null} />
                  <Linha label="Origem do capital" valor={TIPO[veiculo.tipo_aquisicao] ?? null} />
                </div>
              )}

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

              {podeEditar && veiculo.status !== "vendido" && (
                <div style={card}>
                  <VendaVeiculo veiculoId={veiculo.id} />
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
                  {realizadoParcial != null && (
                    <div style={{ marginTop: 12 }}>
                      <Linha label="Resultado realizado (parcial)" valor={formatarBRL(realizadoParcial)} />
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-mute)" }}>
                        Venda menos despesas, descontos e valor de compra. Custos adicionais e financiamento serão somados após o mapeamento das tabelas.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
